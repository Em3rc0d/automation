-- CASE-003 Gate 3: durable reservation in the n8n execution path.
-- Runtime-independent core can be called directly from PostgreSQL; the public
-- wrapper is for Supabase/PostgREST and reuses the Gate-2 integration token.
create or replace function case003.reserve_due_candidates(
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
security invoker
set search_path = pg_catalog, case003
as $$
begin
  if p_days_ahead < 0 or p_days_ahead > 30 then
    raise exception 'p_days_ahead must be between 0 and 30';
  end if;
  if p_rule_code is null or p_rule_code !~ '^[a-z0-9_.:-]{1,64}$' then
    raise exception 'invalid p_rule_code';
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
    v.published_at,
    r.notification_id,
    r.out_idempotency_key as idempotency_key,
    r.reserved
  from case003.invoice_projection v
  cross join lateral case003.reserve_due_notification(
    v.tenant_id,
    v.invoice_id,
    p_rule_code,
    v.canonical_due_date,
    v.snapshot_id
  ) r
  where v.canonical_due_date between current_date and current_date + p_days_ahead
    and v.payment_status_evidence <> 'SETTLEMENT_EVIDENCE'
  order by v.canonical_due_date, v.invoice_id;
end;
$$;

revoke all on function case003.reserve_due_candidates(integer,text)
  from public, anon, authenticated;

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
