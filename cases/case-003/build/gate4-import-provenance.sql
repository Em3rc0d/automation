-- CASE-003 Gate 4: provenance and atomic publication for real SAP report snapshots.
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
  imported_at timestamptz not null default now(),
  unique(snapshot_id,dataset_kind),
  unique(tenant_id,dataset_kind,sha256)
);

create table if not exists case003.import_issue (
  id uuid primary key,
  tenant_id uuid not null,
  snapshot_id uuid not null references case003.import_snapshot(id) on delete cascade,
  code text not null check (code in ('SCIV_NO_FI','SCIV_FI_UNMATCHED','AMOUNT_MISMATCH','SOURCE_ROW_REJECTED')),
  severity text not null check (severity in ('warning','error')),
  source_kind text not null check (source_kind in ('QQVA','SCIV','FBL1N')),
  source_key text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists case003_import_issue_snapshot_code_idx
  on case003.import_issue(snapshot_id,code);

create or replace function case003.publish_snapshot(p_snapshot_id uuid)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, case003
as $$
declare
  v_tenant uuid;
  v_dataset text;
  v_status text;
  v_file_count integer;
  v_error_count integer;
  v_supplier_count integer;
  v_invoice_count integer;
  v_financial_count integer;
begin
  select tenant_id,dataset_type,status
    into v_tenant,v_dataset,v_status
  from case003.import_snapshot
  where id=p_snapshot_id
  for update;

  if not found then raise exception 'snapshot not found'; end if;
  if v_status <> 'candidate' then
    raise exception 'snapshot must be candidate, got %',v_status;
  end if;

  select count(*) into v_file_count
  from case003.import_file
  where snapshot_id=p_snapshot_id;
  if v_file_count <> 3 then
    raise exception 'snapshot requires exactly 3 source files, got %',v_file_count;
  end if;

  if exists (
    select 1
    from (values ('QQVA'),('SCIV'),('FBL1N')) req(dataset_kind)
    where not exists (
      select 1 from case003.import_file f
      where f.snapshot_id=p_snapshot_id and f.dataset_kind=req.dataset_kind
    )
  ) then
    raise exception 'snapshot missing required dataset kind';
  end if;

  select count(*) into v_error_count
  from case003.import_issue
  where snapshot_id=p_snapshot_id and severity='error';
  if v_error_count <> 0 then
    raise exception 'snapshot has % blocking import errors',v_error_count;
  end if;

  select count(*) into v_supplier_count from case003.supplier where snapshot_id=p_snapshot_id;
  select count(*) into v_invoice_count from case003.invoice where snapshot_id=p_snapshot_id;
  select count(*) into v_financial_count from case003.financial_item where snapshot_id=p_snapshot_id;
  if v_supplier_count=0 or v_invoice_count=0 or v_financial_count=0 then
    raise exception 'snapshot canonical data incomplete suppliers=% invoices=% financial_items=%',
      v_supplier_count,v_invoice_count,v_financial_count;
  end if;

  update case003.import_snapshot
    set status='superseded'
  where tenant_id=v_tenant
    and dataset_type=v_dataset
    and status='active'
    and id<>p_snapshot_id;

  update case003.import_snapshot
    set status='active', published_at=now()
  where id=p_snapshot_id;
end;
$$;
