-- CASE-003 Gate 10 controlled test-email override.
-- Production trusted-contact lookup/rate limits/challenge generation stay in Gate 9.
-- The override only substitutes the delivery destination for a short-lived test scope.
-- Full test email is never persisted: only SHA-256 + masked destination are stored.

create table if not exists case003.test_delivery_override_scope (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  channel text not null check (channel ~ '^[a-z0-9_.:-]{1,32}$'),
  candidate_vendor_id text not null,
  destination_hash text not null check (destination_hash ~ '^[0-9a-f]{64}$'),
  destination_masked text not null,
  active boolean not null default true,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists test_delivery_override_scope_lookup_idx
  on case003.test_delivery_override_scope(tenant_id,channel,candidate_vendor_id,active,expires_at);

create or replace function case003.prepare_email_verification_test_override(
  p_verification_request_id uuid,
  p_override_email text,
  p_trace_id text default null
)
returns jsonb
language plpgsql
security invoker
set search_path=pg_catalog,case003,extensions
as $function$
declare
  vr case003.verification_request%rowtype;
  ov case003.test_delivery_override_scope%rowtype;
  normalized_email text;
  prep jsonb;
  challenge_id uuid;
  delivery_id uuid;
  verification_code text;
begin
  if p_verification_request_id is null then raise exception 'verification request required'; end if;

  normalized_email:=lower(trim(coalesce(p_override_email,'')));
  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception 'invalid override email';
  end if;

  select * into vr
  from case003.verification_request
  where id=p_verification_request_id
  for update;

  if vr.id is null then
    return jsonb_build_object('decision','VERIFICATION_NOT_FOUND','delivery_required',false);
  end if;

  select * into ov
  from case003.test_delivery_override_scope
  where tenant_id=vr.tenant_id
    and channel=vr.channel
    and candidate_vendor_id=vr.candidate_vendor_id
    and active=true
    and expires_at>now()
  order by created_at desc
  limit 1
  for update;

  if ov.id is null
     or encode(extensions.digest(normalized_email,'sha256'),'hex')<>ov.destination_hash then
    raise exception 'test override not authorized' using errcode='28000';
  end if;

  -- Reuse the production Gate-9 function so request expiry, rate limits,
  -- trusted-contact presence, challenge TTL and code hashing stay identical.
  prep:=case003.prepare_email_verification(vr.id,p_trace_id);

  if prep->>'decision'<>'VERIFICATION_DELIVERY_REQUIRED' then
    return prep;
  end if;

  challenge_id:=(prep->>'challenge_id')::uuid;
  delivery_id:=(prep->>'delivery_id')::uuid;
  verification_code:=prep#>>'{delivery,verification_code}';

  update case003.verification_challenge
  set destination_hash=ov.destination_hash,
      destination_masked=ov.destination_masked
  where id=challenge_id;

  update case003.verification_delivery
  set destination_hash=ov.destination_hash,
      destination_masked=ov.destination_masked
  where id=delivery_id;

  update case003.verification_request
  set trusted_contact_masked=ov.destination_masked
  where id=vr.id;

  insert into case003.verification_event(
    tenant_id,verification_request_id,challenge_id,channel,subject_hash,event_type,actor_ref,trace_id,detail
  ) values(
    vr.tenant_id,vr.id,challenge_id,vr.channel,vr.subject_hash,
    'TEST_DESTINATION_OVERRIDDEN','gate10_test_override',p_trace_id,
    jsonb_build_object(
      'destination_masked',ov.destination_masked,
      'scope_id',ov.id,
      'scope_expires_at',ov.expires_at
    )
  );

  return jsonb_build_object(
    'decision','VERIFICATION_DELIVERY_REQUIRED',
    'verification_request_id',vr.id,
    'challenge_id',challenge_id,
    'delivery_id',delivery_id,
    'trusted_contact_masked',ov.destination_masked,
    'expires_at',prep->'expires_at',
    'delivery_required',true,
    'delivery',jsonb_build_object(
      'method','email',
      'destination_email',normalized_email,
      'verification_code',verification_code
    ),
    'test_override',true,
    'safe_to_respond',true
  );
end;
$function$;

create or replace function public.case003_prepare_email_verification_test_override_json(
  p_verification_request_id uuid,
  p_override_email text,
  p_trace_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,case003,extensions
as $function$
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

  return case003.prepare_email_verification_test_override(
    p_verification_request_id,p_override_email,p_trace_id
  );
end;
$function$;

revoke all on function public.case003_prepare_email_verification_test_override_json(uuid,text,text)
  from public,authenticated;
grant execute on function public.case003_prepare_email_verification_test_override_json(uuid,text,text)
  to anon,service_role;
