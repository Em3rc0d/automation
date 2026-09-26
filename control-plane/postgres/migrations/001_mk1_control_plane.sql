-- MK1 shared-table control plane with tenant isolation.
-- Target: PostgreSQL 15+/Supabase.
-- This migration intentionally stores credential REFERENCES only; provider secrets stay outside DB.
-- Browser-facing role: authenticated. Privileged operator paths use service_role/trusted backend.

begin;

create extension if not exists pgcrypto;

create table if not exists public.tenant (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_membership (
  tenant_id uuid not null references public.tenant(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('client_admin','client_member')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create or replace function public.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.tenant_membership tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
  );
$$;

revoke all on function public.is_tenant_member(uuid) from public;
grant execute on function public.is_tenant_member(uuid) to authenticated;

create table if not exists public.savings_workflow_installation (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete cascade,
  workflow_key text not null,
  workflow_version text not null,
  status text not null check (status in ('DRAFT','CLIENT_CONFIGURED','CLIENT_ACCEPTED','PAUSED')),
  runtime_profile text not null,
  config jsonb not null default '{}'::jsonb,
  installed_at timestamptz not null default now(),
  activated_at timestamptz,
  paused_at timestamptz,
  unique (id, tenant_id),
  unique (tenant_id, workflow_key, workflow_version)
);

create table if not exists public.connector_binding (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete cascade,
  installation_id uuid not null,
  capability text not null,
  provider text,
  credential_ref text,
  status text not null default 'unbound' check (status in ('unbound','bound','verified','degraded')),
  scopes text[] not null default '{}',
  settings jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  unique (id, tenant_id),
  unique (tenant_id, installation_id, capability),
  foreign key (installation_id, tenant_id)
    references public.savings_workflow_installation(id, tenant_id)
    on delete cascade,
  check (credential_ref is null or credential_ref like 'credref:%')
);

create table if not exists public.automation_instance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete cascade,
  installation_id uuid not null,
  runtime_engine text not null,
  runtime_ref text,
  status text not null check (status in ('configured','active','paused','error')),
  created_at timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (installation_id, tenant_id)
    references public.savings_workflow_installation(id, tenant_id)
    on delete cascade
);

create table if not exists public.savings_baseline (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete cascade,
  installation_id uuid not null,
  version integer not null check (version > 0),
  status text not null check (status in ('DRAFT','AGREED','SUPERSEDED')),
  unit text not null,
  manual_minutes_per_unit numeric(12,4),
  baseline_sample_size integer,
  baseline_method text check (baseline_method in ('time_study','system_data','client_declared','mixed')),
  loaded_hourly_cost numeric(14,4),
  currency char(3) not null default 'PEN',
  confidence text check (confidence in ('low','medium','high')),
  assumptions jsonb not null default '[]'::jsonb,
  valid_from timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, tenant_id),
  unique (tenant_id, installation_id, version),
  foreign key (installation_id, tenant_id)
    references public.savings_workflow_installation(id, tenant_id)
    on delete cascade
);

create table if not exists public.execution_run (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete cascade,
  installation_id uuid not null,
  automation_instance_id uuid,
  trace_id text not null,
  engine text not null,
  engine_execution_id text,
  status text not null check (status in ('running','succeeded','failed','cancelled')),
  started_at timestamptz not null,
  finished_at timestamptz,
  unique (id, tenant_id),
  unique (tenant_id, trace_id),
  foreign key (installation_id, tenant_id)
    references public.savings_workflow_installation(id, tenant_id)
    on delete cascade,
  foreign key (automation_instance_id, tenant_id)
    references public.automation_instance(id, tenant_id)
);

create table if not exists public.execution_event (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete cascade,
  execution_run_id uuid not null,
  event_type text not null,
  occurred_at timestamptz not null,
  trace_id text,
  payload jsonb not null default '{}'::jsonb,
  foreign key (execution_run_id, tenant_id)
    references public.execution_run(id, tenant_id)
    on delete cascade
);

create table if not exists public.process_record (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete cascade,
  installation_id uuid not null,
  execution_run_id uuid,
  entity_type text not null,
  entity_id text not null,
  status text not null,
  occurred_at timestamptz not null,
  updated_at timestamptz not null,
  summary jsonb not null default '{}'::jsonb,
  attributes jsonb not null default '{}'::jsonb,
  monetary_value numeric(16,4),
  currency char(3),
  requires_attention boolean not null default false,
  unique (id, tenant_id),
  unique (tenant_id, installation_id, entity_type, entity_id),
  foreign key (installation_id, tenant_id)
    references public.savings_workflow_installation(id, tenant_id)
    on delete cascade,
  foreign key (execution_run_id, tenant_id)
    references public.execution_run(id, tenant_id)
);

create table if not exists public.incident (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete cascade,
  installation_id uuid not null,
  execution_run_id uuid,
  severity text not null check (severity in ('info','warning','error','critical')),
  code text not null,
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  customer_safe_message text not null,
  technical_details_ref text,
  opened_at timestamptz not null,
  resolved_at timestamptz,
  foreign key (installation_id, tenant_id)
    references public.savings_workflow_installation(id, tenant_id)
    on delete cascade,
  foreign key (execution_run_id, tenant_id)
    references public.execution_run(id, tenant_id)
);

create table if not exists public.approval_request (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete cascade,
  installation_id uuid not null,
  process_record_id uuid,
  status text not null check (status in ('pending','approved','rejected','expired')),
  requested_at timestamptz not null,
  decided_at timestamptz,
  decision_actor text,
  reason text,
  foreign key (installation_id, tenant_id)
    references public.savings_workflow_installation(id, tenant_id)
    on delete cascade,
  foreign key (process_record_id, tenant_id)
    references public.process_record(id, tenant_id)
);

create table if not exists public.savings_event (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete cascade,
  installation_id uuid not null,
  execution_run_id uuid,
  baseline_id uuid,
  occurred_at timestamptz not null,
  eligible_units numeric(16,4) not null default 0 check (eligible_units >= 0),
  automated_units numeric(16,4) not null default 0 check (automated_units >= 0),
  exception_minutes numeric(16,4) not null default 0 check (exception_minutes >= 0),
  oversight_minutes numeric(16,4) not null default 0 check (oversight_minutes >= 0),
  variable_cost numeric(16,4) not null default 0 check (variable_cost >= 0),
  currency char(3) not null default 'PEN',
  foreign key (installation_id, tenant_id)
    references public.savings_workflow_installation(id, tenant_id)
    on delete cascade,
  foreign key (execution_run_id, tenant_id)
    references public.execution_run(id, tenant_id),
  foreign key (baseline_id, tenant_id)
    references public.savings_baseline(id, tenant_id)
);

create table if not exists public.audit_event (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenant(id) on delete set null,
  actor_type text not null,
  actor_ref text not null,
  action text not null,
  target_type text not null,
  target_ref text not null,
  occurred_at timestamptz not null default now(),
  trace_id text,
  metadata jsonb not null default '{}'::jsonb
);

-- RLS is mandatory on every tenant-owned relation, including technical relations.
alter table public.tenant enable row level security;
alter table public.tenant_membership enable row level security;
alter table public.savings_workflow_installation enable row level security;
alter table public.connector_binding enable row level security;
alter table public.automation_instance enable row level security;
alter table public.savings_baseline enable row level security;
alter table public.execution_run enable row level security;
alter table public.execution_event enable row level security;
alter table public.process_record enable row level security;
alter table public.incident enable row level security;
alter table public.approval_request enable row level security;
alter table public.savings_event enable row level security;
alter table public.audit_event enable row level security;

-- Tenant membership is the only browser-visible identity bridge.
drop policy if exists tenant_member_select on public.tenant;
create policy tenant_member_select on public.tenant
  for select to authenticated
  using (public.is_tenant_member(id));

drop policy if exists tenant_membership_self_select on public.tenant_membership;
create policy tenant_membership_self_select on public.tenant_membership
  for select to authenticated
  using (user_id = auth.uid() and public.is_tenant_member(tenant_id));

-- Browser/client data is read-only. Mutations flow through trusted backend/operator paths.
drop policy if exists installation_tenant_select on public.savings_workflow_installation;
create policy installation_tenant_select on public.savings_workflow_installation
  for select to authenticated using (public.is_tenant_member(tenant_id));

drop policy if exists baseline_tenant_select on public.savings_baseline;
create policy baseline_tenant_select on public.savings_baseline
  for select to authenticated using (public.is_tenant_member(tenant_id));

drop policy if exists process_record_tenant_select on public.process_record;
create policy process_record_tenant_select on public.process_record
  for select to authenticated using (public.is_tenant_member(tenant_id));

drop policy if exists incident_tenant_select on public.incident;
create policy incident_tenant_select on public.incident
  for select to authenticated using (public.is_tenant_member(tenant_id));

drop policy if exists approval_request_tenant_select on public.approval_request;
create policy approval_request_tenant_select on public.approval_request
  for select to authenticated using (public.is_tenant_member(tenant_id));

drop policy if exists savings_event_tenant_select on public.savings_event;
create policy savings_event_tenant_select on public.savings_event
  for select to authenticated using (public.is_tenant_member(tenant_id));

-- No browser grants for connector_binding, automation_instance, execution_run,
-- execution_event or audit_event: those remain Operator Console/trusted backend data.
revoke all on
  public.tenant,
  public.tenant_membership,
  public.savings_workflow_installation,
  public.connector_binding,
  public.automation_instance,
  public.savings_baseline,
  public.execution_run,
  public.execution_event,
  public.process_record,
  public.incident,
  public.approval_request,
  public.savings_event,
  public.audit_event
from authenticated;
grant select on public.tenant to authenticated;
grant select on public.tenant_membership to authenticated;
grant select on public.savings_workflow_installation to authenticated;
grant select on public.savings_baseline to authenticated;
grant select on public.process_record to authenticated;
grant select on public.incident to authenticated;
grant select on public.approval_request to authenticated;
grant select on public.savings_event to authenticated;

-- Supabase service_role is backend-only and BYPASSRLS in managed deployments.
grant all privileges on
  public.tenant,
  public.tenant_membership,
  public.savings_workflow_installation,
  public.connector_binding,
  public.automation_instance,
  public.savings_baseline,
  public.execution_run,
  public.execution_event,
  public.process_record,
  public.incident,
  public.approval_request,
  public.savings_event,
  public.audit_event
to service_role;

create index if not exists idx_membership_user_tenant on public.tenant_membership(user_id, tenant_id);
create index if not exists idx_installation_tenant_status on public.savings_workflow_installation(tenant_id, status);
create index if not exists idx_process_record_tenant_installation on public.process_record(tenant_id, installation_id, occurred_at desc);
create index if not exists idx_incident_tenant_status on public.incident(tenant_id, status, opened_at desc);
create index if not exists idx_savings_event_tenant_installation on public.savings_event(tenant_id, installation_id, occurred_at desc);
create index if not exists idx_execution_run_tenant_installation on public.execution_run(tenant_id, installation_id, started_at desc);

commit;
