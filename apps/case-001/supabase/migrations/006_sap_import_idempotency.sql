alter table public.case001_sap_snapshots
  add column if not exists file_sha256 text;

create unique index if not exists case001_sap_snapshots_file_hash_uq
  on public.case001_sap_snapshots (tenant_id, file_sha256)
  where file_sha256 is not null;
