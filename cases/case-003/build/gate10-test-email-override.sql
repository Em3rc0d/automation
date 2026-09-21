-- CASE-003 Gate 10 controlled test-email override.
-- Full test email is never persisted: only SHA-256 + masked destination are stored.
-- RPC remains protected by the existing CASE-003 integration token.

create table if not exists case003.test_delivery_override (
  verification_request_id uuid primary key references case003.verification_request(id) on delete cascade,
  destination_hash text not null check (destination_hash ~ '^[0-9a-f]{64}$'),
  destination_masked text not null,
  active boolean not null default true,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

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
  ov case003.test_delivery_override%rowtype;
  normalized_email text;
  challenge_id uuid;
  delivery_id uuid;
  code text;
  challenge_expiry timestamptz;
begin
  if p_verification_request_id is null then raise exception 'verification request required'; end if;
  normalized_email:=lower(trim(coalesce(p_override_email,'')));
  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'invalid override email'; end if;

  select * into vr from case003.verification_request where id=p_verification_request_id for update;
  if vr.id is null then return jsonb_build_object('decision','VERIFICATION_NOT_FOUND','delivery_required',false); end if;
  if vr.status<>'pending' or vr.expires_at<=now() then
    if vr.status='pending' and vr.expires_at<=now() then update case003.verification_request set status='expired' where id=vr.id; end if;
    return jsonb_build_object('decision','VERIFICATION_EXPIRED','delivery_required',false);
  end if;

  select * into ov
  from case003.test_delivery_override
  where verification_request_id=vr.id and active=true and expires_at>now()
  for update;

  if ov.verification_request_id is null
     or encode(extensions.digest(normalized_email,'sha256'),'hex')<>ov.destination_hash then
    raise exception 'test override not authorized' using errcode='28000';
  end if;

  update case003.verification_challenge set status='cancelled'
  where verification_request_id=vr.id and status='pending';

  update case003.verification_delivery vd
  set status='failed',error_code='superseded_by_test_override'
  where vd.challenge_id in (
    select id from case003.verification_challenge
    where verification_request_id=vr.id and status='cancelled'
  ) and vd.status='pending';

  code:=upper(substr(encode(extensions.gen_random_bytes(8),'hex'),1,12));
  challenge_expiry:=least(vr.expires_at,now()+interval '10 minutes');
  challenge_id:=gen_random_uuid();

  insert into case003.verification_challenge(
    id,verification_request_id,tenant_id,channel,subject_hash,candidate_vendor_id,
    company_code_scope,method,code_hash,destination_hash,destination_masked,
    status,attempts,max_attempts,expires_at
  ) values(
    challenge_id,vr.id,vr.tenant_id,vr.channel,vr.subject_hash,vr.candidate_vendor_id,
    vr.company_code_scope,'email_code',
    encode(extensions.digest(code,'sha256'),'hex'),
    ov.destination_hash,ov.destination_masked,
    'pending',0,5,challenge_expiry
  );

  insert into case003.verification_delivery(
    challenge_id,method,destination_hash,destination_masked,status
  ) values(challenge_id,'email',ov.destination_hash,ov.destination_masked,'pending')
  returning id into delivery_id;

  update case003.verification_request
  set delivery_status='pending',trusted_contact_masked=ov.destination_masked
  where id=vr.id;

  insert into case003.verification_event(
    tenant_id,verification_request_id,challenge_id,channel,subject_hash,event_type,actor_ref,trace_id,detail
  ) values(
    vr.tenant_id,vr.id,challenge_id,vr.channel,vr.subject_hash,
    'CHALLENGE_CREATED','test_email_override',p_trace_id,
    jsonb_build_object('method','email_code','test_override',true,'expires_at',challenge_expiry)
  );

  return jsonb_build_object(
    'decision','VERIFICATION_DELIVERY_REQUIRED',
    'verification_request_id',vr.id,'challenge_id',challenge_id,'delivery_id',delivery_id,
    'trusted_contact_masked',ov.destination_masked,'expires_at',challenge_expiry,
    'delivery_required',true,
    'delivery',jsonb_build_object('method','email','destination_email',normalized_email,'verification_code',code),
    'test_override',true,'safe_to_respond',true
  );
end;
$function$;

create or replace function public.case003_prepare_email_verification_test_override_json(
  p_verification_request_id uuid,p_override_email text,p_trace_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,case003,extensions
as $function$
declare request_headers jsonb; provided_token text; expected_hash text;
begin
  request_headers:=coalesce(current_setting('request.headers',true),'{}')::jsonb;
  provided_token:=request_headers->>'x-case003-token';
  select secret_sha256 into expected_hash from case003.integration_secret where integration_key='due_candidates_rpc';
  if expected_hash is null or provided_token is null
     or encode(extensions.digest(provided_token,'sha256'),'hex')<>expected_hash then
    raise exception 'unauthorized' using errcode='28000';
  end if;
  return case003.prepare_email_verification_test_override(p_verification_request_id,p_override_email,p_trace_id);
end;
$function$;

revoke all on function public.case003_prepare_email_verification_test_override_json(uuid,text,text)
  from public,authenticated;
grant execute on function public.case003_prepare_email_verification_test_override_json(uuid,text,text)
  to anon,service_role;
