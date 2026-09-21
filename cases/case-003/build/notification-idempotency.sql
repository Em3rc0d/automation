-- CASE-003 G2.1 notification idempotency ledger.
-- Additive only: no existing CASE-002/n8n state is touched.
create extension if not exists pgcrypto;

create table if not exists case003.notification_delivery (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  invoice_id uuid not null references case003.invoice(id),
  rule_code text not null,
  canonical_due_date date,
  snapshot_id uuid not null references case003.import_snapshot(id),
  idempotency_key text not null,
  status text not null check (status in ('reserved','sent','failed','cancelled')),
  channel text,
  provider_message_id text,
  reserved_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error_code text,
  unique(idempotency_key)
);
create index if not exists case003_notification_invoice_idx
  on case003.notification_delivery(tenant_id,invoice_id,status);

drop function if exists case003.reserve_due_notification(uuid,uuid,text,date,uuid);
create function case003.reserve_due_notification(
  p_tenant_id uuid,p_invoice_id uuid,p_rule_code text,p_canonical_due_date date,p_snapshot_id uuid
) returns table(notification_id uuid,out_idempotency_key text,reserved boolean)
language plpgsql security invoker
set search_path = pg_catalog, case003, extensions
as $
declare v_key text; v_id uuid;
begin
 v_key:=encode(digest(p_tenant_id::text||'|'||p_invoice_id::text||'|'||p_rule_code||'|'||coalesce(p_canonical_due_date::text,'')||'|'||p_snapshot_id::text,'sha256'),'hex');
 insert into case003.notification_delivery(tenant_id,invoice_id,rule_code,canonical_due_date,snapshot_id,idempotency_key,status)
 values(p_tenant_id,p_invoice_id,p_rule_code,p_canonical_due_date,p_snapshot_id,v_key,'reserved')
 on conflict on constraint notification_delivery_idempotency_key_key do nothing returning id into v_id;
 if v_id is not null then return query select v_id,v_key,true;
 else return query select n.id,n.idempotency_key,false from case003.notification_delivery n where n.idempotency_key=v_key;
 end if;
end $$;