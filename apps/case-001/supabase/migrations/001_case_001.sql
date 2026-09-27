create extension if not exists pgcrypto;

create table if not exists public.case001_customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  whatsapp_phone text not null,
  name text,
  company_name text,
  customer_type text check (customer_type in ('B2B','B2C')),
  preferred_currency text check (preferred_currency in ('PEN','USD')),
  usual_discount_pct numeric(8,4),
  payment_terms_days integer,
  credit_enabled boolean not null default false,
  credit_limit numeric(16,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, whatsapp_phone)
);

create table if not exists public.case001_sap_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  source_file_name text not null,
  source_observed_at timestamptz,
  imported_at timestamptz not null default now()
);

create table if not exists public.case001_product_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  snapshot_id uuid not null references public.case001_sap_snapshots(id) on delete cascade,
  sku text not null,
  description text not null,
  stock numeric(16,4) not null check (stock >= 0),
  unit_of_measure text not null default 'UND',
  base_price numeric(16,4),
  cost numeric(16,4),
  currency text check (currency in ('PEN','USD')),
  imported_at timestamptz not null,
  unique (snapshot_id, sku)
);

create index if not exists case001_product_snapshots_lookup_idx
  on public.case001_product_snapshots (tenant_id, sku, imported_at desc);

create or replace view public.case001_product_snapshot_latest as
select distinct on (tenant_id, sku)
  tenant_id,
  snapshot_id,
  sku,
  description,
  stock,
  unit_of_measure,
  base_price,
  cost,
  currency,
  imported_at
from public.case001_product_snapshots
order by tenant_id, sku, imported_at desc;

create table if not exists public.case001_quotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  customer_phone text not null,
  parent_quote_id uuid references public.case001_quotes(id),
  version integer not null default 1,
  status text not null check (status in ('draft','awaiting_approval','sent','revised','accepted','rejected','expired')),
  currency text not null check (currency in ('PEN','USD')),
  fx_rate numeric(16,6),
  fx_source text,
  fx_observed_at timestamptz,
  subtotal numeric(16,2) not null,
  tax_total numeric(16,2) not null,
  total numeric(16,2) not null,
  discount_pct numeric(8,4) not null default 0,
  requires_approval boolean not null default false,
  exception_codes text[] not null default '{}',
  source_intent jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz
);

create index if not exists case001_quotes_customer_idx
  on public.case001_quotes (tenant_id, customer_phone, created_at desc);

create table if not exists public.case001_quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.case001_quotes(id) on delete cascade,
  snapshot_id uuid not null references public.case001_sap_snapshots(id),
  sku text not null,
  description text not null,
  quantity numeric(16,4) not null check (quantity > 0),
  list_unit_price numeric(16,4) not null,
  quoted_unit_price numeric(16,4) not null,
  discount_pct numeric(8,4) not null default 0
);

create table if not exists public.case001_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  provider_message_id text not null,
  phone text not null,
  direction text not null check (direction in ('inbound','outbound')),
  body text not null,
  quote_id uuid references public.case001_quotes(id),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, provider_message_id)
);

create table if not exists public.case001_approval_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  quote_id uuid not null references public.case001_quotes(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  reasons text[] not null default '{}',
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text,
  decision_reason text
);

alter table public.case001_customers enable row level security;
alter table public.case001_sap_snapshots enable row level security;
alter table public.case001_product_snapshots enable row level security;
alter table public.case001_quotes enable row level security;
alter table public.case001_quote_lines enable row level security;
alter table public.case001_messages enable row level security;
alter table public.case001_approval_requests enable row level security;

-- Pilot posture: browser clients have no direct table policies. The server-side service role
-- owns access until Supabase Auth membership/RLS policies are bound to the real tenant.
comment on schema public is 'CASE-001 uses server-side service role only until real pilot tenancy is bound.';
