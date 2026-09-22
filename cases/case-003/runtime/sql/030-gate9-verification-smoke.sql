-- CASE-003 Gate 9 local/VPS verification smoke.
-- Requires runtime/sql/010-synthetic-smoke.sql. No real identifiers or delivery.
-- Proves: challenge -> wrong code rejection -> correct code -> verified identity ->
-- membership + invoice.read -> owned invoice FOUND. Cleans up all synthetic access.

do $$
declare
  v_request_id uuid := '90000000-0000-0000-0000-000000000901';
  v_tenant uuid := '30000000-0000-0000-0000-000000000000';
  v_subject text := 'gate9-local-smoke-subject';
  v_subject_hash text;
  v_supplier_id uuid;
  v_tax_id text;
  v_masked text;
  v_prep jsonb;
  v_code text;
  v_wrong jsonb;
  v_ok jsonb;
  v_user_id uuid;
  v_membership_id uuid;
  v_query record;
begin
  v_subject_hash:=encode(extensions.digest(v_subject,'sha256'),'hex');

  delete from case003.supplier_query_audit where trace_id='gate9-local-found';
  delete from case003.verification_request where id=v_request_id;

  select s.id,s.tax_id,case003.mask_email(s.trusted_contact_email)
    into v_supplier_id,v_tax_id,v_masked
  from case003.supplier s
  join case003.import_snapshot snap on snap.id=s.snapshot_id and snap.status='active'
  where s.tenant_id=v_tenant and s.sap_vendor_id='SYNTH-001'
  limit 1;

  if v_supplier_id is null then raise exception 'Gate9 smoke supplier missing'; end if;

  insert into case003.verification_request(
    id,tenant_id,channel,subject_hash,candidate_supplier_id,candidate_vendor_id,
    company_code_scope,claimed_tax_id,trusted_contact_masked,status,delivery_status,
    expires_at,requested_invoice_reference
  ) values(
    v_request_id,v_tenant,'whatsapp',v_subject_hash,v_supplier_id,'SYNTH-001',
    'PE10',v_tax_id,v_masked,'pending','disabled',now()+interval '15 minutes','F001-100'
  );

  v_prep:=case003.prepare_email_verification(v_request_id,'gate9-local-prepare');
  if v_prep->>'decision'<>'VERIFICATION_DELIVERY_REQUIRED' then
    raise exception 'Gate9 prepare failed: %',v_prep;
  end if;

  v_code:=v_prep#>>'{delivery,verification_code}';
  if v_code is null or length(v_code)<>12 then raise exception 'Gate9 code missing'; end if;

  v_wrong:=case003.verify_email_code(v_tenant,'whatsapp',v_subject_hash,'AAAAAAAAAAAA','gate9-local-wrong');
  if v_wrong->>'decision'<>'INVALID_VERIFICATION_CODE' then
    raise exception 'Gate9 wrong-code invariant failed: %',v_wrong;
  end if;

  v_ok:=case003.verify_email_code(v_tenant,'whatsapp',v_subject_hash,v_code,'gate9-local-correct');
  if v_ok->>'decision'<>'VERIFIED' then raise exception 'Gate9 verification failed: %',v_ok; end if;

  v_user_id:=(v_ok->>'external_user_id')::uuid;
  v_membership_id:=(v_ok->>'membership_id')::uuid;

  select * into v_query
  from case003.resolve_supplier_invoice_query(
    v_tenant,'whatsapp',v_subject_hash,'F001-100','gate9-local-found'
  )
  limit 1;

  if v_query.decision<>'FOUND' or v_query.invoice_reference<>'F001-100' then
    raise exception 'Gate9 post-verification ownership failed';
  end if;

  delete from case003.supplier_query_audit where trace_id='gate9-local-found';
  delete from case003.verification_request where id=v_request_id;
  delete from case003.external_membership where id=v_membership_id;
  delete from case003.external_identity where user_id=v_user_id and subject_hash=v_subject_hash;
  delete from case003.external_user where id=v_user_id;

  raise notice 'PASS Gate9 verification core: wrong code rejected, valid code verified, invoice FOUND';
end;
$$;
