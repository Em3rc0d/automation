-- CASE-003 Gate 6: authenticated provider-neutral channel ingress +
-- identity-verification initiation + replay protection.
-- This gate never treats RUC/tax ID as authentication and never auto-binds
-- an unknown channel subject to a supplier.

create table if not exists case003.channel_message (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  channel text not null,
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  provider_message_id text not null,
  trace_id text,
  command text,
  invoice_reference text,
  claimed_tax_id text,
  decision text not null,
  created_at timestamptz not null default now(),
  unique(tenant_id,channel,provider_message_id)
);

create table if not exists case003.verification_request (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  channel text not null,
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  candidate_supplier_id uuid,
  candidate_vendor_id text,
  company_code_scope text,
  claimed_tax_id text,
  trusted_contact_masked text,
  status text not null check (status in ('pending','approved','denied','expired','cancelled')),
  delivery_status text not null check (delivery_status in ('disabled','pending','sent','failed')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  approved_external_user_id uuid,
  approved_membership_id uuid
);

create index if not exists case003_channel_message_subject_idx
  on case003.channel_message(tenant_id,channel,subject_hash,created_at desc);
create index if not exists case003_verification_request_subject_idx
  on case003.verification_request(tenant_id,channel,subject_hash,status,created_at desc);
create index if not exists case003_verification_request_supplier_idx
  on case003.verification_request(candidate_supplier_id);

create or replace function case003.mask_email(p_email text)
returns text
language plpgsql
immutable
set search_path=pg_catalog
as $$
declare local_part text; domain_part text;
begin
  if p_email is null or position('@' in p_email)=0 then return null; end if;
  local_part:=split_part(p_email,'@',1);
  domain_part:=split_part(p_email,'@',2);
  if length(local_part)=1 then
    return '*'||'@'||domain_part;
  end if;
  return left(local_part,1)||repeat('*',greatest(length(local_part)-2,1))||
         case when length(local_part)>2 then right(local_part,1) else '' end||
         '@'||domain_part;
end;
$$;

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
as $$
declare
  inserted_id uuid;
  verified_user uuid;
  result_row record;
  candidate record;
  candidate_count integer:=0;
  request_id uuid;
  masked text;
begin
  if p_tenant_id is null then raise exception 'tenant required'; end if;
  if p_channel is null or p_channel !~ '^[a-z0-9_.:-]{1,32}$' then raise exception 'invalid channel'; end if;
  if p_subject_hash is null or p_subject_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid subject hash'; end if;
  if p_provider_message_id is null or length(p_provider_message_id)<1 or length(p_provider_message_id)>200 then raise exception 'invalid provider_message_id'; end if;
  if p_text is null or length(p_text)>1000 then raise exception 'invalid text'; end if;
  if p_invoice_reference is not null and length(p_invoice_reference)>120 then raise exception 'invalid invoice reference'; end if;
  if p_claimed_tax_id is not null and p_claimed_tax_id !~ '^[0-9]{8,20}$' then raise exception 'invalid tax id'; end if;

  insert into case003.channel_message(
    tenant_id,channel,subject_hash,provider_message_id,trace_id,command,invoice_reference,claimed_tax_id,decision
  ) values (
    p_tenant_id,p_channel,p_subject_hash,p_provider_message_id,p_trace_id,'supplier_invoice_query',
    p_invoice_reference,p_claimed_tax_id,'PROCESSING'
  )
  on conflict (tenant_id,channel,provider_message_id) do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return jsonb_build_object(
      'trace_id',p_trace_id,
      'decision','DUPLICATE',
      'response_type','duplicate_ignored',
      'safe_to_respond',true,
      'channel_delivery','disabled'
    );
  end if;

  select ei.user_id into verified_user
  from case003.external_identity ei
  join case003.external_user eu on eu.id=ei.user_id and eu.tenant_id=ei.tenant_id
  where ei.tenant_id=p_tenant_id
    and ei.channel=p_channel
    and ei.subject_hash=p_subject_hash
    and ei.status='active'
    and ei.verified_at is not null
    and eu.status='active'
  order by ei.verified_at desc
  limit 1;

  if verified_user is not null and p_invoice_reference is not null then
    select * into result_row
    from case003.resolve_supplier_invoice_query(
      p_tenant_id,p_channel,p_subject_hash,p_invoice_reference,p_trace_id
    )
    limit 1;

    update case003.channel_message set decision=result_row.decision where id=inserted_id;

    if result_row.decision='FOUND' then
      return jsonb_build_object(
        'trace_id',result_row.trace_id,
        'decision','FOUND',
        'response_type','invoice_status',
        'invoice_reference',result_row.invoice_reference,
        'company_code',result_row.company_code,
        'fi_document_number',result_row.fi_document_number,
        'canonical_due_date',result_row.canonical_due_date,
        'due_date_source',result_row.due_date_source,
        'due_date_conflict',result_row.due_date_conflict,
        'payment_status_evidence',result_row.payment_status_evidence,
        'days_to_due',result_row.days_to_due,
        'overdue_days',result_row.overdue_days,
        'published_at',result_row.published_at,
        'snapshot_id',result_row.snapshot_id,
        'safe_to_respond',true,
        'channel_delivery','disabled'
      );
    end if;

    return jsonb_build_object(
      'trace_id',p_trace_id,
      'decision',result_row.decision,
      'response_type',case when result_row.decision='AUTH_REQUIRED' then 'verification_required' else 'neutral_not_found_or_not_authorized' end,
      'safe_to_respond',true,
      'channel_delivery','disabled'
    );
  end if;

  if p_claimed_tax_id is null then
    update case003.channel_message set decision='AUTH_REQUIRED' where id=inserted_id;
    return jsonb_build_object(
      'trace_id',p_trace_id,
      'decision','AUTH_REQUIRED',
      'response_type','verification_required',
      'next_action','provide_tax_id',
      'safe_to_respond',true,
      'channel_delivery','disabled'
    );
  end if;

  select count(*)::int into candidate_count
  from case003.supplier s
  join case003.import_snapshot snap on snap.id=s.snapshot_id
  where s.tenant_id=p_tenant_id
    and snap.status='active'
    and s.tax_id=p_claimed_tax_id;

  if candidate_count<>1 then
    update case003.channel_message set decision='NOT_FOUND_OR_NOT_AUTHORIZED' where id=inserted_id;
    return jsonb_build_object(
      'trace_id',p_trace_id,
      'decision','NOT_FOUND_OR_NOT_AUTHORIZED',
      'response_type','neutral_not_found_or_not_authorized',
      'safe_to_respond',true,
      'channel_delivery','disabled'
    );
  end if;

  select s.id,s.sap_vendor_id,s.company_code,s.trusted_contact_email
  into candidate
  from case003.supplier s
  join case003.import_snapshot snap on snap.id=s.snapshot_id
  where s.tenant_id=p_tenant_id
    and snap.status='active'
    and s.tax_id=p_claimed_tax_id
  limit 1;

  masked:=case003.mask_email(candidate.trusted_contact_email);

  insert into case003.verification_request(
    tenant_id,channel,subject_hash,candidate_supplier_id,candidate_vendor_id,company_code_scope,
    claimed_tax_id,trusted_contact_masked,status,delivery_status,expires_at
  ) values (
    p_tenant_id,p_channel,p_subject_hash,candidate.id,candidate.sap_vendor_id,candidate.company_code,
    p_claimed_tax_id,masked,'pending','disabled',now()+interval '15 minutes'
  ) returning id into request_id;

  update case003.channel_message set decision='VERIFICATION_REQUIRED' where id=inserted_id;

  return jsonb_build_object(
    'trace_id',p_trace_id,
    'decision','VERIFICATION_REQUIRED',
    'response_type','verification_required',
    'verification_request_id',request_id,
    'trusted_contact_masked',masked,
    'next_action','verify_trusted_contact',
    'delivery_status','disabled',
    'safe_to_respond',true,
    'channel_delivery','disabled'
  );
end;
$$;

revoke all on function case003.process_channel_message(uuid,text,text,text,text,text,text,text)
  from public,anon,authenticated;

create or replace function public.case003_channel_message_json(
  p_tenant_id uuid,
  p_channel text,
  p_subject text,
  p_provider_message_id text,
  p_text text,
  p_invoice_reference text default null,
  p_claimed_tax_id text default null,
  p_trace_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,case003,extensions
as $$
declare
  request_headers jsonb;
  provided_token text;
  expected_hash text;
  subject_hash text;
begin
  request_headers:=coalesce(current_setting('request.headers',true),'{}')::jsonb;
  provided_token:=request_headers->>'x-case003-token';

  select secret_sha256 into expected_hash
  from case003.integration_secret
  where integration_key='due_candidates_rpc';

  if expected_hash is null or provided_token is null
     or encode(extensions.digest(provided_token,'sha256'),'hex')<>expected_hash then
    raise exception 'unauthorized' using errcode='28000';
  end if;

  if p_subject is null or length(p_subject)<1 or length(p_subject)>200 then
    raise exception 'invalid subject';
  end if;

  subject_hash:=encode(extensions.digest(p_subject,'sha256'),'hex');

  return case003.process_channel_message(
    p_tenant_id,p_channel,subject_hash,p_provider_message_id,p_text,
    p_invoice_reference,p_claimed_tax_id,p_trace_id
  );
end;
$$;

revoke all on function public.case003_channel_message_json(uuid,text,text,text,text,text,text,text)
  from public,authenticated;
grant execute on function public.case003_channel_message_json(uuid,text,text,text,text,text,text,text)
  to anon,service_role;
