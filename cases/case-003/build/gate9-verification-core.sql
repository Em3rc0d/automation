-- CASE-003 Gate 9 portable verification core.
-- Builds on Gate 6 verification_request without changing the trust rule:
-- tax ID identifies a candidate supplier; only a trusted-contact proof or
-- explicit operator approval may bind a WhatsApp/channel identity.

alter table case003.verification_request
  add column if not exists requested_invoice_reference text;

create table if not exists case003.verification_challenge (
  id uuid primary key default gen_random_uuid(),
  verification_request_id uuid not null references case003.verification_request(id) on delete cascade,
  tenant_id uuid not null,
  channel text not null,
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  candidate_vendor_id text not null,
  company_code_scope text,
  method text not null check (method in ('email_code','operator_approval')),
  code_hash text check (code_hash is null or code_hash ~ '^[0-9a-f]{64}$'),
  destination_hash text check (destination_hash is null or destination_hash ~ '^[0-9a-f]{64}$'),
  destination_masked text,
  status text not null check (status in ('pending','verified','denied','expired','cancelled')),
  attempts integer not null default 0 check (attempts>=0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists case003_verification_challenge_pending_request_uq
  on case003.verification_challenge(verification_request_id)
  where status='pending';

create index if not exists case003_verification_challenge_subject_idx
  on case003.verification_challenge(tenant_id,channel,subject_hash,status,created_at desc);

create index if not exists case003_verification_challenge_vendor_idx
  on case003.verification_challenge(tenant_id,candidate_vendor_id,status,created_at desc);

create table if not exists case003.verification_delivery (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references case003.verification_challenge(id) on delete cascade,
  method text not null check (method='email'),
  destination_hash text not null check (destination_hash ~ '^[0-9a-f]{64}$'),
  destination_masked text not null,
  provider text,
  provider_message_id text,
  status text not null check (status in ('pending','sent','failed')),
  error_code text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists case003_verification_delivery_challenge_idx
  on case003.verification_delivery(challenge_id,created_at desc);

create table if not exists case003.verification_event (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  verification_request_id uuid,
  challenge_id uuid,
  channel text,
  subject_hash text,
  event_type text not null,
  actor_ref text,
  trace_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists case003_verification_event_request_idx
  on case003.verification_event(tenant_id,verification_request_id,created_at desc);

create or replace function case003.complete_verification_request(
  p_verification_request_id uuid,
  p_proof_method text,
  p_actor_ref text default null,
  p_trace_id text default null
)
returns jsonb
language plpgsql
security invoker
set search_path=pg_catalog,case003
as $$
declare
  vr case003.verification_request%rowtype;
  user_id uuid;
  membership_id uuid;
  identity_id uuid;
begin
  if p_verification_request_id is null then raise exception 'verification request required'; end if;
  if p_proof_method not in ('email_code','operator_approval') then raise exception 'invalid proof method'; end if;
  if p_actor_ref is not null and length(p_actor_ref)>200 then raise exception 'actor ref too long'; end if;

  select * into vr
  from case003.verification_request
  where id=p_verification_request_id
  for update;

  if vr.id is null then
    return jsonb_build_object('decision','VERIFICATION_NOT_FOUND','safe_to_respond',true);
  end if;

  if vr.status='approved' then
    return jsonb_build_object(
      'decision','VERIFIED',
      'verification_request_id',vr.id,
      'external_user_id',vr.approved_external_user_id,
      'membership_id',vr.approved_membership_id,
      'next_action','retry_invoice_query',
      'safe_to_respond',true,
      'channel_delivery','disabled'
    );
  end if;

  if vr.status<>'pending' or vr.expires_at<=now() then
    if vr.status='pending' and vr.expires_at<=now() then
      update case003.verification_request set status='expired' where id=vr.id;
    end if;
    return jsonb_build_object('decision','VERIFICATION_EXPIRED','safe_to_respond',true);
  end if;

  if vr.candidate_vendor_id is null then
    raise exception 'verification request missing candidate vendor';
  end if;

  select ei.id,ei.user_id into identity_id,user_id
  from case003.external_identity ei
  where ei.tenant_id=vr.tenant_id
    and ei.channel=vr.channel
    and ei.subject_hash=vr.subject_hash
  limit 1;

  if user_id is null then
    user_id:=gen_random_uuid();
    insert into case003.external_user(id,tenant_id,display_label,status)
    values(user_id,vr.tenant_id,'supplier:'||vr.candidate_vendor_id,'active');

    identity_id:=gen_random_uuid();
    insert into case003.external_identity(
      id,tenant_id,user_id,channel,subject_hash,status,verified_at
    ) values(
      identity_id,vr.tenant_id,user_id,vr.channel,vr.subject_hash,'active',now()
    );
  else
    update case003.external_user
      set status='active'
      where id=user_id and tenant_id=vr.tenant_id;

    update case003.external_identity
      set status='active',verified_at=now()
      where id=identity_id;
  end if;

  select em.id into membership_id
  from case003.external_membership em
  where em.tenant_id=vr.tenant_id
    and em.user_id=user_id
    and em.supplier_vendor_id=vr.candidate_vendor_id
    and em.company_code_scope is not distinct from vr.company_code_scope
    and em.status='active'
  order by em.created_at
  limit 1;

  if membership_id is null then
    membership_id:=gen_random_uuid();
    insert into case003.external_membership(
      id,tenant_id,user_id,supplier_vendor_id,company_code_scope,role_code,status
    ) values(
      membership_id,vr.tenant_id,user_id,vr.candidate_vendor_id,
      vr.company_code_scope,'supplier_contact','active'
    );
  end if;

  insert into case003.external_membership_permission(membership_id,permission_code)
  values(membership_id,'invoice.read')
  on conflict do nothing;

  update case003.verification_request
  set status='approved',
      approved_external_user_id=user_id,
      approved_membership_id=membership_id
  where id=vr.id;

  insert into case003.verification_event(
    tenant_id,verification_request_id,channel,subject_hash,event_type,actor_ref,trace_id,detail
  ) values(
    vr.tenant_id,vr.id,vr.channel,vr.subject_hash,'VERIFIED',p_actor_ref,p_trace_id,
    jsonb_build_object('proof_method',p_proof_method,'candidate_vendor_id',vr.candidate_vendor_id)
  );

  return jsonb_build_object(
    'decision','VERIFIED',
    'verification_request_id',vr.id,
    'external_user_id',user_id,
    'membership_id',membership_id,
    'next_action','retry_invoice_query',
    'requested_invoice_reference',vr.requested_invoice_reference,
    'safe_to_respond',true,
    'channel_delivery','disabled'
  );
end;
$$;

create or replace function case003.prepare_email_verification(
  p_verification_request_id uuid,
  p_trace_id text default null
)
returns jsonb
language plpgsql
security invoker
set search_path=pg_catalog,case003,extensions
as $$
declare
  vr case003.verification_request%rowtype;
  trusted_email text;
  masked text;
  normalized_email text;
  live_challenge uuid;
  challenge_id uuid;
  delivery_id uuid;
  code text;
  subject_count integer;
  vendor_count integer;
  challenge_expiry timestamptz;
begin
  if p_verification_request_id is null then raise exception 'verification request required'; end if;

  select * into vr
  from case003.verification_request
  where id=p_verification_request_id
  for update;

  if vr.id is null then
    return jsonb_build_object('decision','VERIFICATION_NOT_FOUND','delivery_required',false);
  end if;

  if vr.status<>'pending' or vr.expires_at<=now() then
    if vr.status='pending' and vr.expires_at<=now() then
      update case003.verification_request set status='expired' where id=vr.id;
    end if;
    return jsonb_build_object('decision','VERIFICATION_EXPIRED','delivery_required',false);
  end if;

  update case003.verification_challenge
    set status='expired'
    where status='pending' and expires_at<=now();

  select vc.id into live_challenge
  from case003.verification_challenge vc
  where vc.verification_request_id=vr.id
    and vc.status='pending'
    and vc.expires_at>now()
  limit 1;

  if live_challenge is not null then
    return jsonb_build_object(
      'decision','VERIFICATION_ALREADY_PENDING',
      'verification_request_id',vr.id,
      'challenge_id',live_challenge,
      'trusted_contact_masked',vr.trusted_contact_masked,
      'delivery_required',false,
      'safe_to_respond',true
    );
  end if;

  select count(*)::int into subject_count
  from case003.verification_challenge vc
  where vc.tenant_id=vr.tenant_id
    and vc.channel=vr.channel
    and vc.subject_hash=vr.subject_hash
    and vc.created_at>=now()-interval '1 hour';

  select count(*)::int into vendor_count
  from case003.verification_challenge vc
  where vc.tenant_id=vr.tenant_id
    and vc.candidate_vendor_id=vr.candidate_vendor_id
    and vc.created_at>=now()-interval '1 day';

  if subject_count>=3 or vendor_count>=10 then
    insert into case003.verification_event(
      tenant_id,verification_request_id,channel,subject_hash,event_type,trace_id,detail
    ) values(
      vr.tenant_id,vr.id,vr.channel,vr.subject_hash,'RATE_LIMITED',p_trace_id,
      jsonb_build_object('subject_hour_count',subject_count,'vendor_day_count',vendor_count)
    );
    return jsonb_build_object(
      'decision','VERIFICATION_RATE_LIMITED',
      'verification_request_id',vr.id,
      'delivery_required',false,
      'safe_to_respond',true
    );
  end if;

  select min(lower(trim(s.trusted_contact_email)))
    into trusted_email
  from case003.supplier s
  join case003.import_snapshot snap on snap.id=s.snapshot_id and snap.status='active'
  where s.tenant_id=vr.tenant_id
    and s.sap_vendor_id=vr.candidate_vendor_id
    and s.tax_id=vr.claimed_tax_id
    and nullif(trim(s.trusted_contact_email),'') is not null
  having count(distinct lower(trim(s.trusted_contact_email)))=1;

  if trusted_email is null then
    return jsonb_build_object(
      'decision','VERIFICATION_CONTACT_UNAVAILABLE',
      'verification_request_id',vr.id,
      'delivery_required',false,
      'safe_to_respond',true
    );
  end if;

  normalized_email:=lower(trim(trusted_email));
  masked:=case003.mask_email(normalized_email);
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
    encode(extensions.digest(normalized_email,'sha256'),'hex'),
    masked,'pending',0,5,challenge_expiry
  );

  insert into case003.verification_delivery(
    challenge_id,method,destination_hash,destination_masked,status
  ) values(
    challenge_id,'email',
    encode(extensions.digest(normalized_email,'sha256'),'hex'),
    masked,'pending'
  )
  returning id into delivery_id;

  update case003.verification_request
    set delivery_status='pending',trusted_contact_masked=masked
    where id=vr.id;

  insert into case003.verification_event(
    tenant_id,verification_request_id,challenge_id,channel,subject_hash,event_type,trace_id,detail
  ) values(
    vr.tenant_id,vr.id,challenge_id,vr.channel,vr.subject_hash,'CHALLENGE_CREATED',p_trace_id,
    jsonb_build_object('method','email_code','expires_at',challenge_expiry)
  );

  -- Internal-only return: caller must strip delivery.email/code before any channel response.
  return jsonb_build_object(
    'decision','VERIFICATION_DELIVERY_REQUIRED',
    'verification_request_id',vr.id,
    'challenge_id',challenge_id,
    'delivery_id',delivery_id,
    'trusted_contact_masked',masked,
    'expires_at',challenge_expiry,
    'delivery_required',true,
    'delivery',jsonb_build_object(
      'method','email',
      'destination_email',normalized_email,
      'verification_code',code
    ),
    'safe_to_respond',true
  );
end;
$$;

create or replace function case003.mark_verification_delivery(
  p_delivery_id uuid,
  p_sent boolean,
  p_provider text default null,
  p_provider_message_id text default null,
  p_error_code text default null,
  p_trace_id text default null
)
returns jsonb
language plpgsql
security invoker
set search_path=pg_catalog,case003
as $$
declare
  vd case003.verification_delivery%rowtype;
  vc case003.verification_challenge%rowtype;
  vr case003.verification_request%rowtype;
begin
  select * into vd from case003.verification_delivery where id=p_delivery_id for update;
  if vd.id is null then return jsonb_build_object('decision','DELIVERY_NOT_FOUND'); end if;

  select * into vc from case003.verification_challenge where id=vd.challenge_id;
  select * into vr from case003.verification_request where id=vc.verification_request_id;

  update case003.verification_delivery
  set status=case when p_sent then 'sent' else 'failed' end,
      provider=p_provider,
      provider_message_id=p_provider_message_id,
      error_code=case when p_sent then null else left(coalesce(p_error_code,'delivery_failed'),120) end,
      sent_at=case when p_sent then now() else null end
  where id=vd.id;

  update case003.verification_request
    set delivery_status=case when p_sent then 'sent' else 'failed' end
    where id=vr.id;

  insert into case003.verification_event(
    tenant_id,verification_request_id,challenge_id,channel,subject_hash,event_type,trace_id,detail
  ) values(
    vr.tenant_id,vr.id,vc.id,vr.channel,vr.subject_hash,
    case when p_sent then 'DELIVERY_SENT' else 'DELIVERY_FAILED' end,p_trace_id,
    jsonb_build_object('provider',p_provider,'provider_message_id',p_provider_message_id,'error_code',p_error_code)
  );

  return jsonb_build_object(
    'decision',case when p_sent then 'VERIFICATION_SENT' else 'VERIFICATION_DELIVERY_FAILED' end,
    'verification_request_id',vr.id,
    'challenge_id',vc.id,
    'trusted_contact_masked',vc.destination_masked,
    'safe_to_respond',true
  );
end;
$$;

create or replace function case003.verify_email_code(
  p_tenant_id uuid,
  p_channel text,
  p_subject_hash text,
  p_code text,
  p_trace_id text default null
)
returns jsonb
language plpgsql
security invoker
set search_path=pg_catalog,case003,extensions
as $$
declare
  normalized_code text;
  vc case003.verification_challenge%rowtype;
  vr case003.verification_request%rowtype;
  result jsonb;
  remaining integer;
begin
  if p_tenant_id is null then raise exception 'tenant required'; end if;
  if p_channel is null or p_channel !~ '^[a-z0-9_.:-]{1,32}$' then raise exception 'invalid channel'; end if;
  if p_subject_hash is null or p_subject_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid subject hash'; end if;

  normalized_code:=upper(regexp_replace(coalesce(p_code,''),'[^0-9A-Fa-f]','','g'));
  if length(normalized_code)<>12 then
    return jsonb_build_object('decision','INVALID_VERIFICATION_CODE','safe_to_respond',true);
  end if;

  select * into vc
  from case003.verification_challenge
  where tenant_id=p_tenant_id
    and channel=p_channel
    and subject_hash=p_subject_hash
    and method='email_code'
    and status='pending'
  order by created_at desc
  limit 1
  for update;

  if vc.id is null then
    return jsonb_build_object('decision','VERIFICATION_NOT_PENDING','safe_to_respond',true);
  end if;

  select * into vr from case003.verification_request where id=vc.verification_request_id for update;

  if vc.expires_at<=now() or vr.expires_at<=now() then
    update case003.verification_challenge set status='expired' where id=vc.id;
    update case003.verification_request set status='expired' where id=vr.id and status='pending';
    insert into case003.verification_event(
      tenant_id,verification_request_id,challenge_id,channel,subject_hash,event_type,trace_id
    ) values(vr.tenant_id,vr.id,vc.id,vr.channel,vr.subject_hash,'EXPIRED',p_trace_id);
    return jsonb_build_object('decision','VERIFICATION_EXPIRED','safe_to_respond',true);
  end if;

  if vc.attempts>=vc.max_attempts then
    update case003.verification_challenge set status='denied' where id=vc.id;
    update case003.verification_request set status='denied' where id=vr.id and status='pending';
    return jsonb_build_object('decision','VERIFICATION_DENIED','safe_to_respond',true);
  end if;

  update case003.verification_challenge
    set attempts=attempts+1
    where id=vc.id
    returning attempts into vc.attempts;

  if encode(extensions.digest(normalized_code,'sha256'),'hex')<>vc.code_hash then
    remaining:=greatest(vc.max_attempts-vc.attempts,0);
    insert into case003.verification_event(
      tenant_id,verification_request_id,challenge_id,channel,subject_hash,event_type,trace_id,detail
    ) values(
      vr.tenant_id,vr.id,vc.id,vr.channel,vr.subject_hash,'CODE_REJECTED',p_trace_id,
      jsonb_build_object('attempts_remaining',remaining)
    );

    if remaining=0 then
      update case003.verification_challenge set status='denied' where id=vc.id;
      update case003.verification_request set status='denied' where id=vr.id and status='pending';
      return jsonb_build_object('decision','VERIFICATION_DENIED','safe_to_respond',true);
    end if;

    return jsonb_build_object(
      'decision','INVALID_VERIFICATION_CODE',
      'attempts_remaining',remaining,
      'safe_to_respond',true
    );
  end if;

  update case003.verification_challenge
    set status='verified',verified_at=now()
    where id=vc.id;

  result:=case003.complete_verification_request(vr.id,'email_code','trusted_contact_email',p_trace_id);
  return result;
end;
$$;

create or replace function case003.operator_approve_verification(
  p_verification_request_id uuid,
  p_operator_ref text,
  p_reason text,
  p_trace_id text default null
)
returns jsonb
language plpgsql
security invoker
set search_path=pg_catalog,case003
as $$
declare
  vr case003.verification_request%rowtype;
  challenge_id uuid;
  result jsonb;
begin
  if p_operator_ref is null or length(trim(p_operator_ref))<1 or length(p_operator_ref)>200 then
    raise exception 'operator ref required';
  end if;
  if p_reason is null or length(trim(p_reason))<3 or length(p_reason)>500 then
    raise exception 'approval reason required';
  end if;

  select * into vr from case003.verification_request where id=p_verification_request_id for update;
  if vr.id is null then return jsonb_build_object('decision','VERIFICATION_NOT_FOUND'); end if;

  challenge_id:=gen_random_uuid();
  insert into case003.verification_challenge(
    id,verification_request_id,tenant_id,channel,subject_hash,candidate_vendor_id,
    company_code_scope,method,status,attempts,max_attempts,expires_at,verified_at
  ) values(
    challenge_id,vr.id,vr.tenant_id,vr.channel,vr.subject_hash,vr.candidate_vendor_id,
    vr.company_code_scope,'operator_approval','verified',0,1,vr.expires_at,now()
  );

  insert into case003.verification_event(
    tenant_id,verification_request_id,challenge_id,channel,subject_hash,event_type,actor_ref,trace_id,detail
  ) values(
    vr.tenant_id,vr.id,challenge_id,vr.channel,vr.subject_hash,'OPERATOR_APPROVED',
    p_operator_ref,p_trace_id,jsonb_build_object('reason',p_reason)
  );

  result:=case003.complete_verification_request(vr.id,'operator_approval',p_operator_ref,p_trace_id);
  return result;
end;
$$;
