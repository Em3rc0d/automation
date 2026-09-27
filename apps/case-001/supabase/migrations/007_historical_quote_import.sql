alter table public.case001_quote_lines
  alter column snapshot_id drop not null;

alter table public.case001_quotes
  add column if not exists source_kind text not null default 'LIVE',
  add column if not exists external_ref text,
  add column if not exists source_observed_at timestamptz;

alter table public.case001_quotes
  drop constraint if exists case001_quotes_source_kind_check;

alter table public.case001_quotes
  add constraint case001_quotes_source_kind_check
  check (source_kind in ('LIVE','HISTORICAL_IMPORT'));

create unique index if not exists case001_quotes_external_ref_uq
  on public.case001_quotes (tenant_id, source_kind, external_ref)
  where external_ref is not null;
