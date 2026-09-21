-- CASE-003 Gate 2 Supabase RPC adapter.
-- Portable schema: no plaintext secret and no environment-specific hash is stored here.
-- After applying this migration, register SHA-256(CASE003_RPC_TOKEN) in
-- case003.integration_secret with integration_key='due_candidates_rpc'.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists case003.integration_secret (
  integration_key text primary key,
  secret_sha256 text not null check (secret_sha256 ~ '^[0-9a-f]{64}$'),
  rotated_at timestamptz not null default now()
);

revoke all on case003.integration_secret from public, anon, authenticated;

create or replace function public.case003_due_candidates(p_days_ahead integer default 3)
returns table(
  tenant_id uuid,
  snapshot_id uuid,
  invoice_id uuid,
  supplier_id uuid,
  invoice_reference text,
  canonical_due_date date,
  due_date_source text,
  due_date_conflict boolean,
  days_to_due integer,
  overdue_days integer,
  payment_status_evidence text,
  published_at timestamptz
)
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

  select s.secret_sha256
    into expected_hash
  from case003.integration_secret s
  where s.integration_key = 'due_candidates_rpc';

  if expected_hash is null
     or provided_token is null
     or encode(extensions.digest(provided_token, 'sha256'), 'hex') <> expected_hash then
    raise exception 'unauthorized' using errcode = '28000';
  end if;

  if p_days_ahead < 0 or p_days_ahead > 30 then
    raise exception 'p_days_ahead must be between 0 and 30';
  end if;

  return query
  select
    v.tenant_id,
    v.snapshot_id,
    v.invoice_id,
    v.supplier_id,
    v.invoice_reference,
    v.canonical_due_date,
    v.due_date_source,
    v.due_date_conflict,
    v.days_to_due,
    v.overdue_days,
    v.payment_status_evidence,
    v.published_at
  from case003.invoice_projection v
  where v.canonical_due_date between current_date and current_date + p_days_ahead
    and v.payment_status_evidence <> 'SETTLEMENT_EVIDENCE'
  order by v.canonical_due_date, v.invoice_id;
end;
$$;

revoke all on function public.case003_due_candidates(integer) from public;
grant execute on function public.case003_due_candidates(integer) to anon, authenticated, service_role;
