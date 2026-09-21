-- CASE-003 Gate 3 Supabase/PostgREST adapter.
-- Prerequisites:
--   notification-idempotency.sql
--   gate2-supabase-rpc.sql (integration_secret + pgcrypto/headers convention)
--   gate3-reservation-core.sql
create or replace function public.case003_reserve_due_candidates(
  p_days_ahead integer default 3,
  p_rule_code text default 'due_3d'
)
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
  published_at timestamptz,
  notification_id uuid,
  idempotency_key text,
  reserved boolean
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

  select s.secret_sha256 into expected_hash
  from case003.integration_secret s
  where s.integration_key = 'due_candidates_rpc';

  if expected_hash is null
     or provided_token is null
     or encode(extensions.digest(provided_token, 'sha256'), 'hex') <> expected_hash then
    raise exception 'unauthorized' using errcode = '28000';
  end if;

  return query
  select * from case003.reserve_due_candidates(p_days_ahead, p_rule_code);
end;
$$;

revoke all on function public.case003_reserve_due_candidates(integer,text) from public;
grant execute on function public.case003_reserve_due_candidates(integer,text)
  to anon, service_role;
