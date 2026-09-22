-- CASE-003 Gate 9 real-provider hotfix.
-- Preserve the invoice that triggered verification so a successful trusted-contact
-- proof can resume the exact supplier invoice query instead of forcing the user
-- to re-enter it. This keeps RUC as candidate identification only; it does not
-- weaken the verified-identity boundary.

create or replace function case003.process_channel_message(
  p_tenant_id uuid,
  p_channel text,
  p_subject_hash text,
  p_provider_message_id text,
  p_text text,
  p_invoice_reference text default null,
  p_claimed_tax_id text default null,
  p_trace_id text default null
)
returns jsonb
language plpgsql
security invoker
set search_path=pg_catalog,case003
as $function$
declare
  inserted_id uuid; verified_user uuid; result_row record;
  candidate_vendor text; candidate_supplier uuid; candidate_company text; candidate_email text;
  candidate_vendor_count integer:=0; candidate_email_count integer:=0; request_id uuid; masked text;
begin
  if p_tenant_id is null then raise exception 'tenant required'; end if;
  if p_channel is null or p_channel !~ '^[a-z0-9_.:-]{1,32}$' then raise exception 'invalid channel'; end if;
  if p_subject_hash is null or p_subject_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid subject hash'; end if;
  if p_provider_message_id is null or length(p_provider_message_id)<1 or length(p_provider_message_id)>200 then raise exception 'invalid provider_message_id'; end if;
  if p_text is null or length(p_text)>1000 then raise exception 'invalid text'; end if;
  if p_invoice_reference is not null and length(p_invoice_reference)>120 then raise exception 'invalid invoice reference'; end if;
  if p_claimed_tax_id is not null and p_claimed_tax_id !~ '^[0-9]{8,20}$' then raise exception 'invalid tax id'; end if;

  insert into case003.channel_message(tenant_id,channel,subject_hash,provider_message_id,trace_id,command,invoice_reference,claimed_tax_id,decision)
  values(p_tenant_id,p_channel,p_subject_hash,p_provider_message_id,p_trace_id,'supplier_invoice_query',p_invoice_reference,p_claimed_tax_id,'PROCESSING')
  on conflict (tenant_id,channel,provider_message_id) do nothing returning id into inserted_id;

  if inserted_id is null then
    return jsonb_build_object('trace_id',p_trace_id,'decision','DUPLICATE','response_type','duplicate_ignored','safe_to_respond',true,'channel_delivery','disabled');
  end if;

  select ei.user_id into verified_user
  from case003.external_identity ei
  join case003.external_user eu on eu.id=ei.user_id and eu.tenant_id=ei.tenant_id
  where ei.tenant_id=p_tenant_id and ei.channel=p_channel and ei.subject_hash=p_subject_hash
    and ei.status='active' and ei.verified_at is not null and eu.status='active'
  order by ei.verified_at desc limit 1;

  if verified_user is not null and p_invoice_reference is not null then
    select * into result_row
    from case003.resolve_supplier_invoice_query(p_tenant_id,p_channel,p_subject_hash,p_invoice_reference,p_trace_id)
    limit 1;

    update case003.channel_message set decision=result_row.decision where id=inserted_id;

    if result_row.decision='FOUND' then
      return jsonb_build_object(
        'trace_id',result_row.trace_id,'decision','FOUND','response_type','invoice_status',
        'invoice_reference',result_row.invoice_reference,'company_code',result_row.company_code,
        'fi_document_number',result_row.fi_document_number,'canonical_due_date',result_row.canonical_due_date,
        'due_date_source',result_row.due_date_source,'due_date_conflict',result_row.due_date_conflict,
        'payment_status_evidence',result_row.payment_status_evidence,'days_to_due',result_row.days_to_due,
        'overdue_days',result_row.overdue_days,'published_at',result_row.published_at,'snapshot_id',result_row.snapshot_id,
        'safe_to_respond',true,'channel_delivery','disabled'
      );
    end if;

    return jsonb_build_object(
      'trace_id',p_trace_id,'decision',result_row.decision,
      'response_type',case when result_row.decision='AUTH_REQUIRED' then 'verification_required' else 'neutral_not_found_or_not_authorized' end,
      'safe_to_respond',true,'channel_delivery','disabled'
    );
  end if;

  if p_claimed_tax_id is null then
    update case003.channel_message set decision='AUTH_REQUIRED' where id=inserted_id;
    return jsonb_build_object(
      'trace_id',p_trace_id,'decision','AUTH_REQUIRED','response_type','verification_required',
      'next_action','provide_tax_id','safe_to_respond',true,'channel_delivery','disabled'
    );
  end if;

  select count(distinct s.sap_vendor_id)::int,
         count(distinct nullif(lower(trim(s.trusted_contact_email)),''))::int
    into candidate_vendor_count,candidate_email_count
  from case003.supplier s
  join case003.import_snapshot snap on snap.id=s.snapshot_id
  where s.tenant_id=p_tenant_id and snap.status='active' and s.tax_id=p_claimed_tax_id;

  if candidate_vendor_count<>1 or candidate_email_count<>1 then
    update case003.channel_message set decision='NOT_FOUND_OR_NOT_AUTHORIZED' where id=inserted_id;
    return jsonb_build_object(
      'trace_id',p_trace_id,'decision','NOT_FOUND_OR_NOT_AUTHORIZED',
      'response_type','neutral_not_found_or_not_authorized',
      'safe_to_respond',true,'channel_delivery','disabled'
    );
  end if;

  select min(s.id::text)::uuid,min(s.sap_vendor_id),min(s.trusted_contact_email)
    into candidate_supplier,candidate_vendor,candidate_email
  from case003.supplier s
  join case003.import_snapshot snap on snap.id=s.snapshot_id
  where s.tenant_id=p_tenant_id and snap.status='active' and s.tax_id=p_claimed_tax_id;

  select case when count(distinct s.company_code)=1 then min(s.company_code) else null end
    into candidate_company
  from case003.supplier s
  join case003.import_snapshot snap on snap.id=s.snapshot_id
  where s.tenant_id=p_tenant_id and snap.status='active'
    and s.tax_id=p_claimed_tax_id and s.sap_vendor_id=candidate_vendor;

  masked:=case003.mask_email(candidate_email);

  insert into case003.verification_request(
    tenant_id,channel,subject_hash,candidate_supplier_id,candidate_vendor_id,company_code_scope,
    claimed_tax_id,trusted_contact_masked,status,delivery_status,expires_at,requested_invoice_reference
  ) values(
    p_tenant_id,p_channel,p_subject_hash,candidate_supplier,candidate_vendor,candidate_company,
    p_claimed_tax_id,masked,'pending','disabled',now()+interval '15 minutes',p_invoice_reference
  ) returning id into request_id;

  update case003.channel_message set decision='VERIFICATION_REQUIRED' where id=inserted_id;

  return jsonb_build_object(
    'trace_id',p_trace_id,'decision','VERIFICATION_REQUIRED','response_type','verification_required',
    'verification_request_id',request_id,'trusted_contact_masked',masked,
    'next_action','verify_trusted_contact',
    'requested_invoice_reference',p_invoice_reference,
    'delivery_status','disabled','safe_to_respond',true,'channel_delivery','disabled'
  );
end;
$function$;
