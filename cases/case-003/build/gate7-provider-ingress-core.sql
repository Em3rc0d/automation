-- CASE-003 Gate 7 portable PostgreSQL core.
-- Prerequisites: Gate-6 channel ingress core.

create table if not exists case003.channel_connector_binding (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  provider text not null check (provider ~ '^[a-z0-9_.:-]{1,32}$'),
  channel text not null check (channel ~ '^[a-z0-9_.:-]{1,32}$'),
  provider_channel_key text not null,
  connector_account_ref text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists case003_channel_connector_binding_active_uq
  on case003.channel_connector_binding(provider,provider_channel_key)
  where status='active';

create index if not exists case003_channel_connector_binding_tenant_idx
  on case003.channel_connector_binding(tenant_id,provider,channel,status);

create or replace function case003.process_provider_channel_message(
  p_provider text,
  p_provider_channel_key text,
  p_subject text,
  p_provider_message_id text,
  p_text text,
  p_invoice_reference text default null,
  p_claimed_tax_id text default null,
  p_trace_id text default null
)
returns jsonb
language plpgsql
security invoker
set search_path=pg_catalog,case003,extensions
as $$
declare
  resolved_tenant uuid;
  resolved_channel text;
  binding_count integer;
  subject_hash text;
begin
  if p_provider is null or p_provider !~ '^[a-z0-9_.:-]{1,32}$' then
    raise exception 'invalid provider';
  end if;
  if p_provider_channel_key is null or length(p_provider_channel_key)<1 or length(p_provider_channel_key)>200 then
    raise exception 'invalid provider channel key';
  end if;
  if p_subject is null or length(p_subject)<1 or length(p_subject)>200 then
    raise exception 'invalid subject';
  end if;

  select count(*)::int,min(b.tenant_id::text)::uuid,min(b.channel)
    into binding_count,resolved_tenant,resolved_channel
  from case003.channel_connector_binding b
  where b.provider=p_provider
    and b.provider_channel_key=p_provider_channel_key
    and b.status='active';

  if binding_count<>1 or resolved_tenant is null then
    return jsonb_build_object(
      'trace_id',p_trace_id,
      'decision','CONNECTOR_NOT_BOUND',
      'response_type','connector_not_bound',
      'safe_to_respond',true,
      'channel_delivery','disabled'
    );
  end if;

  subject_hash:=encode(extensions.digest(p_subject,'sha256'),'hex');

  return case003.process_channel_message(
    resolved_tenant,
    resolved_channel,
    subject_hash,
    p_provider_message_id,
    p_text,
    p_invoice_reference,
    p_claimed_tax_id,
    p_trace_id
  );
end;
$$;
