-- CASE-003 Gate 9 Supabase/PostgREST adapter.
-- Reuses the existing CASE-003 integration secret. All functions are server-to-server.

create or replace function public.case003_prepare_email_verification_json(
  p_verification_request_id uuid,
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

  return case003.prepare_email_verification(p_verification_request_id,p_trace_id);
end;
$$;

revoke all on function public.case003_prepare_email_verification_json(uuid,text)
  from public,authenticated;
grant execute on function public.case003_prepare_email_verification_json(uuid,text)
  to anon,service_role;

create or replace function public.case003_mark_verification_delivery_json(
  p_delivery_id uuid,
  p_sent boolean,
  p_provider text default null,
  p_provider_message_id text default null,
  p_error_code text default null,
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

  return case003.mark_verification_delivery(
    p_delivery_id,p_sent,p_provider,p_provider_message_id,p_error_code,p_trace_id
  );
end;
$$;

revoke all on function public.case003_mark_verification_delivery_json(uuid,boolean,text,text,text,text)
  from public,authenticated;
grant execute on function public.case003_mark_verification_delivery_json(uuid,boolean,text,text,text,text)
  to anon,service_role;

create or replace function public.case003_verify_email_code_json(
  p_tenant_id uuid,
  p_channel text,
  p_subject text,
  p_code text,
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
  subject_hash text;
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

  if p_subject is null or length(p_subject)<1 or length(p_subject)>200 then
    raise exception 'invalid subject';
  end if;

  subject_hash:=encode(extensions.digest(p_subject,'sha256'),'hex');

  return case003.verify_email_code(
    p_tenant_id,p_channel,subject_hash,p_code,p_trace_id
  );
end;
$$;

revoke all on function public.case003_verify_email_code_json(uuid,text,text,text,text)
  from public,authenticated;
grant execute on function public.case003_verify_email_code_json(uuid,text,text,text,text)
  to anon,service_role;

create or replace function public.case003_operator_approve_verification_json(
  p_verification_request_id uuid,
  p_operator_ref text,
  p_reason text,
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

  return case003.operator_approve_verification(
    p_verification_request_id,p_operator_ref,p_reason,p_trace_id
  );
end;
$$;

revoke all on function public.case003_operator_approve_verification_json(uuid,text,text,text)
  from public,authenticated;
grant execute on function public.case003_operator_approve_verification_json(uuid,text,text,text)
  to anon,service_role;
