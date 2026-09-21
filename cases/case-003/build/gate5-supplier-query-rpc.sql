-- CASE-003 Gate 5 Supabase/PostgREST adapter.
-- Prerequisites:
--   gate2-supabase-rpc.sql (integration_secret and pgcrypto convention)
--   gate5-supplier-query-core.sql

create or replace function public.case003_supplier_invoice_query(
  p_tenant_id uuid,
  p_channel text,
  p_subject text,
  p_invoice_reference text,
  p_trace_id text default null
)
returns table(
  trace_id text,
  decision text,
  invoice_reference text,
  company_code text,
  fi_document_number text,
  canonical_due_date date,
  due_date_source text,
  due_date_conflict boolean,
  payment_status_evidence text,
  days_to_due integer,
  overdue_days integer,
  published_at timestamptz,
  snapshot_id uuid
)
language plpgsql
security definer
set search_path = pg_catalog, public, case003, extensions
as $$
declare
  request_headers jsonb;
  provided_token text;
  expected_hash text;
  subject_hash text;
begin
  request_headers := coalesce(current_setting('request.headers', true), '{}')::jsonb;
  provided_token := request_headers->>'x-case003-token';
  select s.secret_sha256 into expected_hash
  from case003.integration_secret s
  where s.integration_key='due_candidates_rpc';
  if expected_hash is null
     or provided_token is null
     or encode(extensions.digest(provided_token,'sha256'),'hex')<>expected_hash then
    raise exception 'unauthorized' using errcode='28000';
  end if;
  if p_subject is null or length(p_subject)<1 or length(p_subject)>200 then
    raise exception 'invalid subject';
  end if;
  subject_hash := encode(extensions.digest(p_subject,'sha256'),'hex');
  return query
  select * from case003.resolve_supplier_invoice_query(
    p_tenant_id,p_channel,subject_hash,p_invoice_reference,p_trace_id
  );
end;
$$;

create or replace function public.case003_supplier_invoice_query_json(
  p_tenant_id uuid,
  p_channel text,
  p_subject text,
  p_invoice_reference text,
  p_trace_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, case003, extensions
as $$
declare
  request_headers jsonb;
  provided_token text;
  expected_hash text;
  subject_hash text;
  result_json jsonb;
begin
  request_headers := coalesce(current_setting('request.headers', true), '{}')::jsonb;
  provided_token := request_headers->>'x-case003-token';
  select s.secret_sha256 into expected_hash
  from case003.integration_secret s
  where s.integration_key='due_candidates_rpc';
  if expected_hash is null
     or provided_token is null
     or encode(extensions.digest(provided_token,'sha256'),'hex')<>expected_hash then
    raise exception 'unauthorized' using errcode='28000';
  end if;
  if p_subject is null or length(p_subject)<1 or length(p_subject)>200 then
    raise exception 'invalid subject';
  end if;
  subject_hash := encode(extensions.digest(p_subject,'sha256'),'hex');
  select to_jsonb(q) into result_json
  from case003.resolve_supplier_invoice_query(
    p_tenant_id,p_channel,subject_hash,p_invoice_reference,p_trace_id
  ) q
  limit 1;
  return result_json;
end;
$$;

revoke all on function public.case003_supplier_invoice_query(uuid,text,text,text,text)
  from public, authenticated;
revoke all on function public.case003_supplier_invoice_query_json(uuid,text,text,text,text)
  from public, authenticated;
grant execute on function public.case003_supplier_invoice_query(uuid,text,text,text,text)
  to anon, service_role;
grant execute on function public.case003_supplier_invoice_query_json(uuid,text,text,text,text)
  to anon, service_role;
