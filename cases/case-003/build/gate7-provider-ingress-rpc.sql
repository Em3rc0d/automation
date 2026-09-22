-- CASE-003 Gate 7 Supabase/PostgREST adapter.
-- Prerequisites: Gate-2 integration secret + Gate-7 provider ingress core.

create or replace function public.case003_provider_channel_message_json(
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
security definer
set search_path=pg_catalog,public,case003,extensions
as $$
declare
  request_headers jsonb;
  provided_token text;
  expected_hash text;
begin
  request_headers:=coalesce(current_setting('request.headers',true),'{}')::jsonb;
  provided_token:=request_headers->>'x-case003-token';

  select secret_sha256 into expected_hash
  from case003.integration_secret
  where integration_key='due_candidates_rpc';

  if expected_hash is null or provided_token is null
     or encode(extensions.digest(provided_token,'sha256'),'hex')<>expected_hash then
    raise exception 'unauthorized' using errcode='28000';
  end if;

  return case003.process_provider_channel_message(
    p_provider,p_provider_channel_key,p_subject,p_provider_message_id,p_text,
    p_invoice_reference,p_claimed_tax_id,p_trace_id
  );
end;
$$;

revoke all on function public.case003_provider_channel_message_json(text,text,text,text,text,text,text,text)
  from public,authenticated;
grant execute on function public.case003_provider_channel_message_json(text,text,text,text,text,text,text,text)
  to anon,service_role;
