-- CASE-003 Gate 5: verified channel identity -> membership -> permission ->
-- resource ownership -> canonical invoice query -> neutral response decision.
-- Channel subjects are stored only as SHA-256 hashes in this gate. The test
-- fixture uses opaque synthetic subjects, never a real phone number or email.

create table if not exists case003.external_user (
  id uuid primary key,
  tenant_id uuid not null,
  display_label text not null,
  status text not null check (status in ('active','disabled')),
  created_at timestamptz not null default now()
);

create table if not exists case003.external_identity (
  id uuid primary key,
  tenant_id uuid not null,
  user_id uuid not null references case003.external_user(id) on delete cascade,
  channel text not null,
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  status text not null check (status in ('active','revoked')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique(tenant_id,channel,subject_hash)
);

create table if not exists case003.external_membership (
  id uuid primary key,
  tenant_id uuid not null,
  user_id uuid not null references case003.external_user(id) on delete cascade,
  supplier_vendor_id text not null,
  company_code_scope text,
  role_code text not null,
  status text not null check (status in ('active','revoked')),
  created_at timestamptz not null default now()
);

create table if not exists case003.external_membership_permission (
  membership_id uuid not null references case003.external_membership(id) on delete cascade,
  permission_code text not null,
  primary key(membership_id,permission_code)
);

create table if not exists case003.supplier_query_audit (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  trace_id text,
  channel text not null,
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  invoice_reference text,
  decision text not null check (decision in (
    'FOUND','AUTH_REQUIRED','NOT_FOUND_OR_NOT_AUTHORIZED','NEEDS_DISAMBIGUATION'
  )),
  decision_reason text not null,
  external_user_id uuid,
  membership_id uuid,
  snapshot_id uuid,
  invoice_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists case003_external_identity_lookup_idx
  on case003.external_identity(tenant_id,channel,subject_hash,status);
create index if not exists case003_external_membership_user_idx
  on case003.external_membership(tenant_id,user_id,status);
create index if not exists case003_supplier_query_audit_trace_idx
  on case003.supplier_query_audit(tenant_id,trace_id,created_at desc);

create or replace function case003.resolve_supplier_invoice_query(
  p_tenant_id uuid,
  p_channel text,
  p_subject_hash text,
  p_invoice_reference text,
  p_trace_id text default null
)
returns table(
  trace_id text,
  decision text,
  invoice_reference text,
  company_code text,
  fi_document_number text,
  canonical_due_date date,
  due_date_source text,
  due_date_conflict boolean,
  payment_status_evidence text,
  days_to_due integer,
  overdue_days integer,
  published_at timestamptz,
  snapshot_id uuid
)
language plpgsql
security invoker
set search_path = pg_catalog, case003
as $$
declare
  v_user_id uuid;
  v_membership_id uuid;
  v_match_count integer := 0;
  v_invoice_id uuid;
  v_company_code text;
  v_fi_document text;
  v_due date;
  v_due_source text;
  v_due_conflict boolean;
  v_payment_evidence text;
  v_days_to_due integer;
  v_overdue_days integer;
  v_published_at timestamptz;
  v_snapshot_id uuid;
begin
  if p_tenant_id is null then raise exception 'tenant required'; end if;
  if p_channel is null or p_channel !~ '^[a-z0-9_.:-]{1,32}$' then raise exception 'invalid channel'; end if;
  if p_subject_hash is null or p_subject_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid subject hash'; end if;
  if p_invoice_reference is null or length(trim(p_invoice_reference)) < 1 or length(p_invoice_reference) > 120 then
    raise exception 'invalid invoice reference';
  end if;
  if p_trace_id is not null and length(p_trace_id) > 120 then raise exception 'trace_id too long'; end if;

  select ei.user_id into v_user_id
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

  if v_user_id is null then
    insert into case003.supplier_query_audit(
      tenant_id,trace_id,channel,subject_hash,invoice_reference,decision,decision_reason
    ) values (
      p_tenant_id,p_trace_id,p_channel,p_subject_hash,p_invoice_reference,
      'AUTH_REQUIRED','identity_missing_or_unverified'
    );

    return query select p_trace_id,'AUTH_REQUIRED'::text,null::text,null::text,null::text,
      null::date,null::text,null::boolean,null::text,null::integer,null::integer,
      null::timestamptz,null::uuid;
    return;
  end if;

  select em.id into v_membership_id
  from case003.external_membership em
  join case003.external_membership_permission ep on ep.membership_id=em.id
  where em.tenant_id=p_tenant_id
    and em.user_id=v_user_id
    and em.status='active'
    and ep.permission_code='invoice.read'
  order by em.created_at,em.id
  limit 1;

  if v_membership_id is null then
    insert into case003.supplier_query_audit(
      tenant_id,trace_id,channel,subject_hash,invoice_reference,decision,decision_reason,external_user_id
    ) values (
      p_tenant_id,p_trace_id,p_channel,p_subject_hash,p_invoice_reference,
      'NOT_FOUND_OR_NOT_AUTHORIZED','membership_or_permission_missing',v_user_id
    );

    return query select p_trace_id,'NOT_FOUND_OR_NOT_AUTHORIZED'::text,null::text,null::text,null::text,
      null::date,null::text,null::boolean,null::text,null::integer,null::integer,
      null::timestamptz,null::uuid;
    return;
  end if;

  select count(*)::int into v_match_count
  from case003.invoice_projection v
  join case003.invoice i on i.id=v.invoice_id
  join case003.external_membership em on em.id=v_membership_id
  where v.tenant_id=p_tenant_id
    and i.snapshot_id=v.snapshot_id
    and i.invoice_reference=p_invoice_reference
    and i.sap_vendor_id=em.supplier_vendor_id
    and (em.company_code_scope is null or i.company_code=em.company_code_scope);

  if v_match_count=0 then
    insert into case003.supplier_query_audit(
      tenant_id,trace_id,channel,subject_hash,invoice_reference,decision,decision_reason,
      external_user_id,membership_id
    ) values (
      p_tenant_id,p_trace_id,p_channel,p_subject_hash,p_invoice_reference,
      'NOT_FOUND_OR_NOT_AUTHORIZED','resource_missing_or_not_owned',v_user_id,v_membership_id
    );

    return query select p_trace_id,'NOT_FOUND_OR_NOT_AUTHORIZED'::text,null::text,null::text,null::text,
      null::date,null::text,null::boolean,null::text,null::integer,null::integer,
      null::timestamptz,null::uuid;
    return;
  elsif v_match_count>1 then
    insert into case003.supplier_query_audit(
      tenant_id,trace_id,channel,subject_hash,invoice_reference,decision,decision_reason,
      external_user_id,membership_id
    ) values (
      p_tenant_id,p_trace_id,p_channel,p_subject_hash,p_invoice_reference,
      'NEEDS_DISAMBIGUATION','multiple_owned_matches',v_user_id,v_membership_id
    );

    return query select p_trace_id,'NEEDS_DISAMBIGUATION'::text,p_invoice_reference,null::text,null::text,
      null::date,null::text,null::boolean,null::text,null::integer,null::integer,
      null::timestamptz,null::uuid;
    return;
  end if;

  select i.id,i.company_code,i.fi_document_number,
         v.canonical_due_date,v.due_date_source,v.due_date_conflict,
         v.payment_status_evidence,v.days_to_due,v.overdue_days,
         v.published_at,v.snapshot_id
  into v_invoice_id,v_company_code,v_fi_document,
       v_due,v_due_source,v_due_conflict,
       v_payment_evidence,v_days_to_due,v_overdue_days,
       v_published_at,v_snapshot_id
  from case003.invoice_projection v
  join case003.invoice i on i.id=v.invoice_id
  join case003.external_membership em on em.id=v_membership_id
  where v.tenant_id=p_tenant_id
    and i.snapshot_id=v.snapshot_id
    and i.invoice_reference=p_invoice_reference
    and i.sap_vendor_id=em.supplier_vendor_id
    and (em.company_code_scope is null or i.company_code=em.company_code_scope)
  limit 1;

  insert into case003.supplier_query_audit(
    tenant_id,trace_id,channel,subject_hash,invoice_reference,decision,decision_reason,
    external_user_id,membership_id,snapshot_id,invoice_id
  ) values (
    p_tenant_id,p_trace_id,p_channel,p_subject_hash,p_invoice_reference,
    'FOUND','owned_resource',v_user_id,v_membership_id,v_snapshot_id,v_invoice_id
  );

  return query select
    p_trace_id,'FOUND'::text,p_invoice_reference,v_company_code,v_fi_document,
    v_due,v_due_source,v_due_conflict,v_payment_evidence,
    v_days_to_due,v_overdue_days,v_published_at,v_snapshot_id;
end;
$$;

revoke all on function case003.resolve_supplier_invoice_query(uuid,text,text,text,text)
  from public, anon, authenticated;

create or replace function public.case003_supplier_invoice_query(
  p_tenant_id uuid,
  p_channel text,
  p_subject text,
  p_invoice_reference text,
  p_trace_id text default null
)
returns table(
  trace_id text,
  decision text,
  invoice_reference text,
  company_code text,
  fi_document_number text,
  canonical_due_date date,
  due_date_source text,
  due_date_conflict boolean,
  payment_status_evidence text,
  days_to_due integer,
  overdue_days integer,
  published_at timestamptz,
  snapshot_id uuid
)
language plpgsql
security definer
set search_path = pg_catalog, public, case003, extensions
as $$
declare
  request_headers jsonb;
  provided_token text;
  expected_hash text;
  subject_hash text;
begin
  request_headers := coalesce(current_setting('request.headers', true), '{}')::jsonb;
  provided_token := request_headers->>'x-case003-token';

  select s.secret_sha256 into expected_hash
  from case003.integration_secret s
  where s.integration_key='due_candidates_rpc';

  if expected_hash is null
     or provided_token is null
     or encode(extensions.digest(provided_token,'sha256'),'hex')<>expected_hash then
    raise exception 'unauthorized' using errcode='28000';
  end if;

  if p_subject is null or length(p_subject)<1 or length(p_subject)>200 then
    raise exception 'invalid subject';
  end if;

  subject_hash := encode(extensions.digest(p_subject,'sha256'),'hex');

  return query
  select * from case003.resolve_supplier_invoice_query(
    p_tenant_id,p_channel,subject_hash,p_invoice_reference,p_trace_id
  );
end;
$$;

revoke all on function public.case003_supplier_invoice_query(uuid,text,text,text,text)
  from public, authenticated;
grant execute on function public.case003_supplier_invoice_query(uuid,text,text,text,text)
  to anon, service_role;
