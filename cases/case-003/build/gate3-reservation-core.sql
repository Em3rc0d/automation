-- CASE-003 Gate 3 runtime-independent reservation core.
-- Safe for vanilla PostgreSQL, Supabase PostgreSQL, local Linux and VPS deployments.
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
