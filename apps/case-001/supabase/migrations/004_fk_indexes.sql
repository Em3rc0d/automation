create index if not exists case001_approval_requests_quote_idx
  on public.case001_approval_requests (quote_id);

create index if not exists case001_messages_quote_idx
  on public.case001_messages (quote_id);

create index if not exists case001_quote_lines_quote_idx
  on public.case001_quote_lines (quote_id);

create index if not exists case001_quote_lines_snapshot_idx
  on public.case001_quote_lines (snapshot_id);

create index if not exists case001_quotes_parent_idx
  on public.case001_quotes (parent_quote_id);
