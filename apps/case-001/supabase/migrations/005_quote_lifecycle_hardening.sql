alter table public.case001_quotes
  drop constraint if exists case001_quotes_status_check;

alter table public.case001_quotes
  add constraint case001_quotes_status_check
  check (status in ('draft','awaiting_approval','approval_rejected','sent','revised','accepted','rejected','expired'));

alter table public.case001_quote_lines
  add column if not exists source_type text not null default 'SAP_SNAPSHOT';

alter table public.case001_quotes
  add column if not exists follow_up_count integer not null default 0,
  add column if not exists last_follow_up_at timestamptz,
  add column if not exists follow_up_template_required_at timestamptz;

create index if not exists case001_messages_customer_time_idx
  on public.case001_messages (tenant_id, phone, direction, occurred_at desc);
