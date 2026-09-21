-- CASE-003 Gate 4 Supabase/PostgREST authenticated batch ingest adapter.
-- Prerequisite: gate2-supabase-rpc.sql creates case003.integration_secret and pgcrypto.
-- Register only SHA-256(CASE003_GATE4_IMPORT_TOKEN) under integration_key='gate4_import_rpc'.
create or replace function public.case003_gate4_ingest_batch(
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
  v_tenant uuid;
  v_status text;
  v_count integer := 0;
begin
  request_headers := coalesce(current_setting('request.headers', true), '{}')::jsonb;
  provided_token := request_headers->>'x-case003-import-token';

  select s.secret_sha256 into expected_hash
  from case003.integration_secret s
  where s.integration_key='gate4_import_rpc';

  if expected_hash is null
     or provided_token is null
     or encode(extensions.digest(provided_token,'sha256'),'hex') <> expected_hash then
    raise exception 'unauthorized' using errcode='28000';
  end if;

  if jsonb_typeof(p_rows) <> 'array' then raise exception 'p_rows must be a JSON array'; end if;
  if jsonb_array_length(p_rows) > 250 then raise exception 'batch too large'; end if;

  select tenant_id,status into v_tenant,v_status
  from case003.import_snapshot
  where id=p_snapshot_id;
  if not found then raise exception 'snapshot not found'; end if;
  if v_status <> 'candidate' then raise exception 'snapshot must be candidate'; end if;

  case p_kind
    when 'import_file' then
      if exists (
        select 1 from jsonb_to_recordset(p_rows) as x(
          id uuid,tenant_id uuid,snapshot_id uuid,dataset_kind text,original_filename text,
          sha256 text,source_row_count integer,accepted_row_count integer,
          normalized_row_count integer,rejected_row_count integer
        )
        where x.snapshot_id<>p_snapshot_id or x.tenant_id<>v_tenant
      ) then raise exception 'import_file tenant/snapshot mismatch'; end if;

      insert into case003.import_file(
        id,tenant_id,snapshot_id,dataset_kind,original_filename,sha256,
        source_row_count,accepted_row_count,normalized_row_count,rejected_row_count
      )
      select x.id,x.tenant_id,x.snapshot_id,x.dataset_kind,x.original_filename,x.sha256,
             x.source_row_count,x.accepted_row_count,x.normalized_row_count,x.rejected_row_count
      from jsonb_to_recordset(p_rows) as x(
        id uuid,tenant_id uuid,snapshot_id uuid,dataset_kind text,original_filename text,
        sha256 text,source_row_count integer,accepted_row_count integer,
        normalized_row_count integer,rejected_row_count integer
      )
      on conflict do nothing;
      get diagnostics v_count=row_count;

    when 'supplier' then
      if exists (
        select 1 from jsonb_to_recordset(p_rows) as x(
          id uuid,tenant_id uuid,snapshot_id uuid,company_code text,sap_vendor_id text,
          display_name text,tax_id text,trusted_contact_email text,source_version_raw text
        )
        where x.snapshot_id<>p_snapshot_id or x.tenant_id<>v_tenant
      ) then raise exception 'supplier tenant/snapshot mismatch'; end if;

      insert into case003.supplier(
        id,tenant_id,snapshot_id,company_code,sap_vendor_id,display_name,
        tax_id,trusted_contact_email,source_version_raw
      )
      select x.id,x.tenant_id,x.snapshot_id,x.company_code,x.sap_vendor_id,x.display_name,
             x.tax_id,x.trusted_contact_email,x.source_version_raw
      from jsonb_to_recordset(p_rows) as x(
        id uuid,tenant_id uuid,snapshot_id uuid,company_code text,sap_vendor_id text,
        display_name text,tax_id text,trusted_contact_email text,source_version_raw text
      )
      on conflict do nothing;
      get diagnostics v_count=row_count;

    when 'invoice' then
      if exists (
        select 1 from jsonb_to_recordset(p_rows) as x(
          id uuid,tenant_id uuid,snapshot_id uuid,supplier_id uuid,company_code text,
          sap_vendor_id text,invoice_reference text,invoice_unique_id text,
          fi_document_number text,fiscal_year integer,document_date date,receipt_date date,
          currency text,gross_amount numeric,sciv_due_date date,technical_status_raw text,
          invoice_status_raw text,payment_block_raw text
        )
        where x.snapshot_id<>p_snapshot_id or x.tenant_id<>v_tenant
      ) then raise exception 'invoice tenant/snapshot mismatch'; end if;

      insert into case003.invoice(
        id,tenant_id,snapshot_id,supplier_id,company_code,sap_vendor_id,invoice_reference,
        invoice_unique_id,fi_document_number,fiscal_year,document_date,receipt_date,currency,
        gross_amount,sciv_due_date,technical_status_raw,invoice_status_raw,payment_block_raw
      )
      select x.id,x.tenant_id,x.snapshot_id,x.supplier_id,x.company_code,x.sap_vendor_id,
             x.invoice_reference,x.invoice_unique_id,x.fi_document_number,x.fiscal_year,
             x.document_date,x.receipt_date,x.currency,x.gross_amount,x.sciv_due_date,
             x.technical_status_raw,x.invoice_status_raw,x.payment_block_raw
      from jsonb_to_recordset(p_rows) as x(
        id uuid,tenant_id uuid,snapshot_id uuid,supplier_id uuid,company_code text,
        sap_vendor_id text,invoice_reference text,invoice_unique_id text,
        fi_document_number text,fiscal_year integer,document_date date,receipt_date date,
        currency text,gross_amount numeric,sciv_due_date date,technical_status_raw text,
        invoice_status_raw text,payment_block_raw text
      )
      on conflict do nothing;
      get diagnostics v_count=row_count;

    when 'financial_item' then
      if exists (
        select 1 from jsonb_to_recordset(p_rows) as x(
          id uuid,tenant_id uuid,snapshot_id uuid,company_code text,document_number text,
          fiscal_year integer,document_type_raw text,invoice_reference text,document_date date,
          posting_date date,payment_date_raw date,net_due_date date,document_amount numeric,
          currency text,clearing_date date,clearing_document_number text,payment_method_raw text,
          payment_block_raw text
        )
        where x.snapshot_id<>p_snapshot_id or x.tenant_id<>v_tenant
      ) then raise exception 'financial_item tenant/snapshot mismatch'; end if;

      insert into case003.financial_item(
        id,tenant_id,snapshot_id,company_code,document_number,fiscal_year,document_type_raw,
        invoice_reference,document_date,posting_date,payment_date_raw,net_due_date,
        document_amount,currency,clearing_date,clearing_document_number,payment_method_raw,
        payment_block_raw
      )
      select x.id,x.tenant_id,x.snapshot_id,x.company_code,x.document_number,x.fiscal_year,
             x.document_type_raw,x.invoice_reference,x.document_date,x.posting_date,
             x.payment_date_raw,x.net_due_date,x.document_amount,x.currency,x.clearing_date,
             x.clearing_document_number,x.payment_method_raw,x.payment_block_raw
      from jsonb_to_recordset(p_rows) as x(
        id uuid,tenant_id uuid,snapshot_id uuid,company_code text,document_number text,
        fiscal_year integer,document_type_raw text,invoice_reference text,document_date date,
        posting_date date,payment_date_raw date,net_due_date date,document_amount numeric,
        currency text,clearing_date date,clearing_document_number text,payment_method_raw text,
        payment_block_raw text
      )
      on conflict do nothing;
      get diagnostics v_count=row_count;

    when 'link' then
      insert into case003.invoice_financial_link(
        invoice_id,financial_item_id,match_type,is_primary,amount_mismatch
      )
      select x.invoice_id,x.financial_item_id,x.match_type,x.is_primary,x.amount_mismatch
      from jsonb_to_recordset(p_rows) as x(
        invoice_id uuid,financial_item_id uuid,match_type text,is_primary boolean,amount_mismatch boolean
      )
      join case003.invoice i on i.id=x.invoice_id and i.snapshot_id=p_snapshot_id
      join case003.financial_item f on f.id=x.financial_item_id and f.snapshot_id=p_snapshot_id
      on conflict do nothing;
      get diagnostics v_count=row_count;

    when 'issue' then
      if exists (
        select 1 from jsonb_to_recordset(p_rows) as x(
          id uuid,tenant_id uuid,snapshot_id uuid,code text,severity text,
          source_kind text,source_key text,details jsonb
        )
        where x.snapshot_id<>p_snapshot_id or x.tenant_id<>v_tenant
      ) then raise exception 'issue tenant/snapshot mismatch'; end if;

      insert into case003.import_issue(
        id,tenant_id,snapshot_id,code,severity,source_kind,source_key,details
      )
      select x.id,x.tenant_id,x.snapshot_id,x.code,x.severity,x.source_kind,x.source_key,x.details
      from jsonb_to_recordset(p_rows) as x(
        id uuid,tenant_id uuid,snapshot_id uuid,code text,severity text,
        source_kind text,source_key text,details jsonb
      )
      on conflict do nothing;
      get diagnostics v_count=row_count;

    else
      raise exception 'unsupported p_kind %',p_kind;
  end case;

  return v_count;
end;
$$;

revoke all on function public.case003_gate4_ingest_batch(uuid,text,jsonb) from public;
grant execute on function public.case003_gate4_ingest_batch(uuid,text,jsonb) to anon, service_role;
