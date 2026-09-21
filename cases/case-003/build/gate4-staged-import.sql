-- CASE-003 Gate 4: staged ingestion and atomic publication of normalized SAP XLSX data.
-- Uses the same x-case003-token integration secret established in Gate 2.
-- Portable normalization occurs before this adapter; raw XLSX columns never reach n8n.

create table if not exists case003.import_batch (
  id uuid primary key,
  tenant_id uuid not null,
  snapshot_id uuid not null unique references case003.import_snapshot(id) on delete cascade,
  status text not null check (status in ('staging','ready','published','failed')),
  expected_counts jsonb not null,
  started_at timestamptz not null default now(),
  published_at timestamptz,
  constraint case003_import_batch_expected_counts_object check (jsonb_typeof(expected_counts)='object')
);

create table if not exists case003.import_file (
  id uuid primary key,
  tenant_id uuid not null,
  snapshot_id uuid not null references case003.import_snapshot(id) on delete cascade,
  dataset_kind text not null check (dataset_kind in ('QQVA','SCIV','FBL1N')),
  original_filename text not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  source_row_count integer not null check (source_row_count >= 0),
  accepted_row_count integer not null check (accepted_row_count >= 0),
  normalized_row_count integer not null check (normalized_row_count >= 0),
  rejected_row_count integer not null check (rejected_row_count >= 0),
  unique(snapshot_id,dataset_kind)
);

create table if not exists case003.import_issue (
  id uuid primary key,
  tenant_id uuid not null,
  snapshot_id uuid not null references case003.import_snapshot(id) on delete cascade,
  code text not null,
  severity text not null check (severity in ('info','warning','error')),
  source_kind text not null,
  source_key text,
  details jsonb not null default '{}'::jsonb
);

create index if not exists case003_import_file_snapshot_idx
  on case003.import_file(snapshot_id);
create index if not exists case003_import_issue_snapshot_code_idx
  on case003.import_issue(snapshot_id,code);
create index if not exists case003_import_issue_snapshot_severity_idx
  on case003.import_issue(snapshot_id,severity);

create or replace function case003.assert_gate4_staging(p_snapshot_id uuid)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, case003
as $$
begin
  if not exists (
    select 1 from case003.import_snapshot s
    where s.id=p_snapshot_id and s.status='candidate'
  ) then
    raise exception 'snapshot % is not in candidate state', p_snapshot_id;
  end if;
end;
$$;
revoke all on function case003.assert_gate4_staging(uuid) from public, anon, authenticated;

create or replace function case003.gate4_ingest(
  p_snapshot_id uuid,
  p_kind text,
  p_rows jsonb
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, case003
as $$
declare
  n integer := 0;
begin
  perform case003.assert_gate4_staging(p_snapshot_id);
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;

  if p_kind='supplier' then
    insert into case003.supplier(
      id,tenant_id,snapshot_id,company_code,sap_vendor_id,display_name,tax_id,trusted_contact_email,source_version_raw
    )
    select id,tenant_id,snapshot_id,company_code,sap_vendor_id,display_name,tax_id,trusted_contact_email,source_version_raw
    from jsonb_to_recordset(p_rows) as x(
      id uuid, tenant_id uuid, snapshot_id uuid, company_code text, sap_vendor_id text,
      display_name text, tax_id text, trusted_contact_email text, source_version_raw text
    )
    where snapshot_id=p_snapshot_id
    on conflict (id) do nothing;
    get diagnostics n = row_count;

  elsif p_kind='invoice' then
    insert into case003.invoice(
      id,tenant_id,snapshot_id,supplier_id,company_code,sap_vendor_id,invoice_reference,invoice_unique_id,
      fi_document_number,fiscal_year,document_date,receipt_date,currency,gross_amount,sciv_due_date,
      technical_status_raw,invoice_status_raw,payment_block_raw
    )
    select id,tenant_id,snapshot_id,supplier_id,company_code,sap_vendor_id,invoice_reference,invoice_unique_id,
      fi_document_number,fiscal_year,document_date,receipt_date,currency,gross_amount,sciv_due_date,
      technical_status_raw,invoice_status_raw,payment_block_raw
    from jsonb_to_recordset(p_rows) as x(
      id uuid, tenant_id uuid, snapshot_id uuid, supplier_id uuid, company_code text, sap_vendor_id text,
      invoice_reference text, invoice_unique_id text, fi_document_number text, fiscal_year integer,
      document_date date, receipt_date date, currency text, gross_amount numeric, sciv_due_date date,
      technical_status_raw text, invoice_status_raw text, payment_block_raw text
    )
    where snapshot_id=p_snapshot_id
    on conflict (id) do nothing;
    get diagnostics n = row_count;

  elsif p_kind='financial_item' then
    insert into case003.financial_item(
      id,tenant_id,snapshot_id,company_code,document_number,fiscal_year,document_type_raw,invoice_reference,
      document_date,posting_date,payment_date_raw,net_due_date,document_amount,currency,clearing_date,
      clearing_document_number,payment_method_raw,payment_block_raw
    )
    select id,tenant_id,snapshot_id,company_code,document_number,fiscal_year,document_type_raw,invoice_reference,
      document_date,posting_date,payment_date_raw,net_due_date,document_amount,currency,clearing_date,
      clearing_document_number,payment_method_raw,payment_block_raw
    from jsonb_to_recordset(p_rows) as x(
      id uuid, tenant_id uuid, snapshot_id uuid, company_code text, document_number text, fiscal_year integer,
      document_type_raw text, invoice_reference text, document_date date, posting_date date, payment_date_raw date,
      net_due_date date, document_amount numeric, currency text, clearing_date date,
      clearing_document_number text, payment_method_raw text, payment_block_raw text
    )
    where snapshot_id=p_snapshot_id
    on conflict (id) do nothing;
    get diagnostics n = row_count;

  elsif p_kind='link' then
    insert into case003.invoice_financial_link(invoice_id,financial_item_id,match_type,is_primary,amount_mismatch)
    select invoice_id,financial_item_id,match_type,is_primary,amount_mismatch
    from jsonb_to_recordset(p_rows) as x(
      invoice_id uuid, financial_item_id uuid, match_type text, is_primary boolean, amount_mismatch boolean
    )
    on conflict (invoice_id,financial_item_id) do nothing;
    get diagnostics n = row_count;

  elsif p_kind='issue' then
    insert into case003.import_issue(id,tenant_id,snapshot_id,code,severity,source_kind,source_key,details)
    select id,tenant_id,snapshot_id,code,severity,source_kind,source_key,details
    from jsonb_to_recordset(p_rows) as x(
      id uuid, tenant_id uuid, snapshot_id uuid, code text, severity text, source_kind text, source_key text, details jsonb
    )
    where snapshot_id=p_snapshot_id
    on conflict (id) do nothing;
    get diagnostics n = row_count;

  elsif p_kind='import_file' then
    insert into case003.import_file(
      id,tenant_id,snapshot_id,dataset_kind,original_filename,sha256,source_row_count,accepted_row_count,
      normalized_row_count,rejected_row_count
    )
    select id,tenant_id,snapshot_id,dataset_kind,original_filename,sha256,source_row_count,accepted_row_count,
      normalized_row_count,rejected_row_count
    from jsonb_to_recordset(p_rows) as x(
      id uuid, tenant_id uuid, snapshot_id uuid, dataset_kind text, original_filename text, sha256 text,
      source_row_count integer, accepted_row_count integer, normalized_row_count integer, rejected_row_count integer
    )
    where snapshot_id=p_snapshot_id
    on conflict (id) do nothing;
    get diagnostics n = row_count;
  else
    raise exception 'unsupported Gate-4 kind: %', p_kind;
  end if;
  return n;
end;
$$;
revoke all on function case003.gate4_ingest(uuid,text,jsonb) from public, anon, authenticated;

create or replace function case003.gate4_publish(p_snapshot_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, case003
as $$
declare
  exp jsonb;
  actual jsonb;
  tenant uuid;
  error_count integer;
  bad_links integer;
begin
  perform case003.assert_gate4_staging(p_snapshot_id);

  select b.expected_counts,b.tenant_id into exp,tenant
  from case003.import_batch b where b.snapshot_id=p_snapshot_id for update;
  if exp is null then raise exception 'import batch missing'; end if;

  select jsonb_build_object(
    'supplier',(select count(*) from case003.supplier where snapshot_id=p_snapshot_id),
    'invoice',(select count(*) from case003.invoice where snapshot_id=p_snapshot_id),
    'financial_item',(select count(*) from case003.financial_item where snapshot_id=p_snapshot_id),
    'link',(select count(*) from case003.invoice_financial_link l join case003.invoice i on i.id=l.invoice_id where i.snapshot_id=p_snapshot_id),
    'issue',(select count(*) from case003.import_issue where snapshot_id=p_snapshot_id),
    'import_file',(select count(*) from case003.import_file where snapshot_id=p_snapshot_id)
  ) into actual;

  if actual <> exp then
    raise exception 'Gate-4 count mismatch expected=% actual=%', exp, actual;
  end if;

  select count(*) into error_count from case003.import_issue
  where snapshot_id=p_snapshot_id and severity='error';
  if error_count<>0 then raise exception 'Gate-4 has % error-severity issues',error_count; end if;

  select count(*) into bad_links
  from case003.invoice_financial_link l
  join case003.invoice i on i.id=l.invoice_id
  join case003.financial_item f on f.id=l.financial_item_id
  where i.snapshot_id=p_snapshot_id
    and (f.snapshot_id<>p_snapshot_id or i.tenant_id<>tenant or f.tenant_id<>tenant);
  if bad_links<>0 then raise exception 'Gate-4 has % cross-snapshot/tenant links',bad_links; end if;

  if (select count(*) from case003.import_file where snapshot_id=p_snapshot_id and dataset_kind in ('QQVA','SCIV','FBL1N')) <> 3 then
    raise exception 'Gate-4 source-file manifest incomplete';
  end if;

  update case003.import_snapshot
  set status='superseded'
  where tenant_id=tenant and dataset_type='supplier_ap' and status='active' and id<>p_snapshot_id;

  update case003.import_snapshot
  set status='active', published_at=now()
  where id=p_snapshot_id;

  update case003.import_batch
  set status='published', published_at=now()
  where snapshot_id=p_snapshot_id;

  return jsonb_build_object('snapshot_id',p_snapshot_id,'status','active','counts',actual);
end;
$$;
revoke all on function case003.gate4_publish(uuid) from public, anon, authenticated;

create or replace function public.case003_gate4_begin(
  p_snapshot_id uuid,
  p_tenant_id uuid,
  p_expected_counts jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, case003, extensions
as $$
declare
  request_headers jsonb;
  provided_token text;
  expected_hash text;
begin
  request_headers := coalesce(current_setting('request.headers', true), '{}')::jsonb;
  provided_token := request_headers->>'x-case003-token';
  select secret_sha256 into expected_hash from case003.integration_secret where integration_key='due_candidates_rpc';
  if expected_hash is null or provided_token is null
     or encode(extensions.digest(provided_token,'sha256'),'hex')<>expected_hash then
    raise exception 'unauthorized' using errcode='28000';
  end if;

  if exists(select 1 from case003.import_snapshot where id=p_snapshot_id) then
    raise exception 'snapshot already exists: %',p_snapshot_id;
  end if;

  insert into case003.import_snapshot(id,tenant_id,dataset_type,status,source_generated_at,published_at,created_at)
  values(p_snapshot_id,p_tenant_id,'supplier_ap','candidate',null,null,now());

  insert into case003.import_batch(id,tenant_id,snapshot_id,status,expected_counts)
  values(p_snapshot_id,p_tenant_id,p_snapshot_id,'staging',p_expected_counts);

  return jsonb_build_object('snapshot_id',p_snapshot_id,'status','candidate');
end;
$$;

create or replace function public.case003_gate4_ingest(
  p_snapshot_id uuid,
  p_kind text,
  p_rows jsonb
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, case003, extensions
as $$
declare
  request_headers jsonb;
  provided_token text;
  expected_hash text;
begin
  request_headers := coalesce(current_setting('request.headers', true), '{}')::jsonb;
  provided_token := request_headers->>'x-case003-token';
  select secret_sha256 into expected_hash from case003.integration_secret where integration_key='due_candidates_rpc';
  if expected_hash is null or provided_token is null
     or encode(extensions.digest(provided_token,'sha256'),'hex')<>expected_hash then
    raise exception 'unauthorized' using errcode='28000';
  end if;
  return case003.gate4_ingest(p_snapshot_id,p_kind,p_rows);
end;
$$;

create or replace function public.case003_gate4_publish(p_snapshot_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, case003, extensions
as $$
declare
  request_headers jsonb;
  provided_token text;
  expected_hash text;
begin
  request_headers := coalesce(current_setting('request.headers', true), '{}')::jsonb;
  provided_token := request_headers->>'x-case003-token';
  select secret_sha256 into expected_hash from case003.integration_secret where integration_key='due_candidates_rpc';
  if expected_hash is null or provided_token is null
     or encode(extensions.digest(provided_token,'sha256'),'hex')<>expected_hash then
    raise exception 'unauthorized' using errcode='28000';
  end if;
  return case003.gate4_publish(p_snapshot_id);
end;
$$;

revoke all on function public.case003_gate4_begin(uuid,uuid,jsonb) from public, authenticated;
revoke all on function public.case003_gate4_ingest(uuid,text,jsonb) from public, authenticated;
revoke all on function public.case003_gate4_publish(uuid) from public, authenticated;
grant execute on function public.case003_gate4_begin(uuid,uuid,jsonb) to anon, service_role;
grant execute on function public.case003_gate4_ingest(uuid,text,jsonb) to anon, service_role;
grant execute on function public.case003_gate4_publish(uuid) to anon, service_role;
