\set ON_ERROR_STOP on

-- Fixed identities keep assertions deterministic.
insert into public.tenant(id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Tenant A'),
  ('20000000-0000-0000-0000-000000000002', 'Tenant B');

insert into public.tenant_membership(tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'client_admin'),
  ('20000000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'client_admin');

insert into public.savings_workflow_installation(
  id, tenant_id, workflow_key, workflow_version, status, runtime_profile
) values
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'PAYMENT_REMINDER_AUTOMATION', '0.1', 'CLIENT_CONFIGURED', 'scheduled'),
  ('22000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'APPOINTMENT_REMINDER_AUTOMATION', '0.1', 'CLIENT_CONFIGURED', 'scheduled');

insert into public.savings_baseline(
  id, tenant_id, installation_id, version, status, unit,
  manual_minutes_per_unit, baseline_sample_size, baseline_method,
  loaded_hourly_cost, currency, confidence
) values
  ('11100000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 1, 'AGREED', 'invoice', 4, 20, 'time_study', 18, 'PEN', 'medium'),
  ('22200000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 1, 'AGREED', 'reminder', 2, 20, 'time_study', 18, 'PEN', 'medium');

insert into public.process_record(
  tenant_id, installation_id, entity_type, entity_id, status,
  occurred_at, updated_at, summary, requires_attention
) values
  ('10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'invoice', 'A-INV-1', 'reminder_sent', now(), now(), '{"invoiceNumber":"A-1"}', false),
  ('20000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 'appointment', 'B-APPT-1', 'reminder_sent', now(), now(), '{"title":"B appointment"}', false);

insert into public.incident(
  tenant_id, installation_id, severity, code, customer_safe_message, opened_at
) values
  ('10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'warning', 'CONTACT_MISSING', 'A contact requires attention.', now()),
  ('20000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 'warning', 'CONTACT_MISSING', 'B contact requires attention.', now());

insert into public.savings_event(
  tenant_id, installation_id, baseline_id, occurred_at,
  eligible_units, automated_units, exception_minutes, oversight_minutes, variable_cost
) values
  ('10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '11100000-0000-0000-0000-000000000001', now(), 1, 1, 0, 0, 0.02),
  ('20000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', '22200000-0000-0000-0000-000000000002', now(), 1, 1, 0, 0, 0.01);

-- Verify every declared tenant-bearing table has RLS enabled.
do $$
declare
  missing text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
    into missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname in (
      'tenant','tenant_membership','savings_workflow_installation','connector_binding',
      'automation_instance','savings_baseline','execution_run','execution_event',
      'process_record','incident','approval_request','savings_event','audit_event'
    )
    and not c.relrowsecurity;
  if missing is not null then
    raise exception 'RLS missing on: %', missing;
  end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);

do $$
begin
  if (select count(*) from public.tenant) <> 1 then
    raise exception 'Tenant A user must see exactly one tenant';
  end if;
  if (select count(*) from public.tenant where id = '20000000-0000-0000-0000-000000000002') <> 0 then
    raise exception 'Tenant A user can see Tenant B';
  end if;
  if (select count(*) from public.savings_workflow_installation) <> 1 then
    raise exception 'Tenant A installation isolation failed';
  end if;
  if (select count(*) from public.process_record) <> 1 then
    raise exception 'Tenant A process_record isolation failed';
  end if;
  if (select count(*) from public.savings_event) <> 1 then
    raise exception 'Tenant A savings_event isolation failed';
  end if;
  if (select count(*) from public.incident) <> 1 then
    raise exception 'Tenant A incident isolation failed';
  end if;
end $$;

-- Browser role is read-only; trusted backend owns writes.
do $$
begin
  begin
    insert into public.process_record(
      tenant_id, installation_id, entity_type, entity_id, status, occurred_at, updated_at
    ) values (
      '10000000-0000-0000-0000-000000000001',
      '11000000-0000-0000-0000-000000000001',
      'invoice','SHOULD-FAIL','x',now(),now()
    );
    raise exception 'authenticated insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

-- Technical tables are not browser-readable even for own tenant.
do $$
begin
  begin
    perform count(*) from public.execution_event;
    raise exception 'authenticated execution_event read unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', false);

do $$
begin
  if (select count(*) from public.process_record) <> 1 then
    raise exception 'Tenant B process_record isolation failed';
  end if;
  if (select count(*) from public.process_record where entity_id = 'A-INV-1') <> 0 then
    raise exception 'Tenant B can see Tenant A record';
  end if;
end $$;

reset role;

-- Cross-tenant relational references fail even for privileged writers.
do $$
begin
  begin
    insert into public.connector_binding(
      tenant_id, installation_id, capability, provider, credential_ref, status
    ) values (
      '10000000-0000-0000-0000-000000000001',
      '22000000-0000-0000-0000-000000000002',
      'messaging.send','gmail','credref:test','bound'
    );
    raise exception 'cross-tenant connector reference unexpectedly succeeded';
  exception
    when foreign_key_violation then null;
  end;
end $$;

-- Backend service role can perform operator cross-tenant reads; it is never browser-exposed.
set role service_role;
do $$
begin
  if (select count(*) from public.process_record) <> 2 then
    raise exception 'service_role should see both tenant records';
  end if;
end $$;
reset role;

select 'MK1 CONTROL PLANE RLS: PASS' as result;
