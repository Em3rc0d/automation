-- CASE-003 Gate 9 provider verification bridge.
-- Resolves tenant/channel from the persisted Gate-7 connector binding before
-- consuming a verification code. Provider payload tenant IDs are never trusted.

create or replace function case003.verify_provider_email_code(
  p_provider text,
  p_provider_channel_key text,
  p_subject text,
  p_code text,
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

  return case003.verify_email_code(
    resolved_tenant,resolved_channel,subject_hash,p_code,p_trace_id
  );
end;
$$;
