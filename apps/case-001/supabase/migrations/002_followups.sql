alter table public.case001_quotes
  add column if not exists follow_up_sent_at timestamptz;

create index if not exists case001_quotes_followup_idx
  on public.case001_quotes (tenant_id, status, sent_at, follow_up_sent_at);
