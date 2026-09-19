-- CASE-003 G2 canonical model (PostgreSQL/Supabase)
-- Runtime-independent source of truth. n8n orchestrates; it does not own state.
create schema if not exists case003;

create table if not exists case003.import_snapshot (
  id uuid primary key,
  tenant_id uuid not null,
  dataset_type text not null check (dataset_type = 'supplier_ap'),
  status text not null check (status in ('candidate','active','superseded','rejected')),
  source_generated_at timestamptz,
  published_at timestamptz,
  published_by uuid,
  created_at timestamptz not null default now()
);
create unique index if not exists case003_one_active_snapshot
  on case003.import_snapshot(tenant_id,dataset_type) where status='active';

create table if not exists case003.supplier (
  id uuid primary key,
  tenant_id uuid not null,
  snapshot_id uuid not null references case003.import_snapshot(id),
  company_code text not null,
  sap_vendor_id text not null,
  display_name text not null,
  tax_id text,
  trusted_contact_email text,
  source_version_raw text,
  unique(snapshot_id,company_code,sap_vendor_id)
);

create table if not exists case003.invoice (
  id uuid primary key,
  tenant_id uuid not null,
  snapshot_id uuid not null references case003.import_snapshot(id),
  supplier_id uuid not null references case003.supplier(id),
  company_code text not null,
  sap_vendor_id text not null,
  invoice_reference text not null,
  invoice_unique_id text,
  fi_document_number text,
  fiscal_year integer,
  document_date date not null,
  receipt_date date not null,
  currency text not null,
  gross_amount numeric(20,4) not null,
  sciv_due_date date,
  technical_status_raw text,
  invoice_status_raw text,
  payment_block_raw text
);
create unique index if not exists case003_invoice_posted_key
  on case003.invoice(snapshot_id,company_code,fi_document_number,fiscal_year)
  where fi_document_number is not null and fiscal_year is not null;
create unique index if not exists case003_invoice_prefi_key
  on case003.invoice(snapshot_id,company_code,invoice_unique_id)
  where fi_document_number is null and invoice_unique_id is not null;

create table if not exists case003.financial_item (
  id uuid primary key,
  tenant_id uuid not null,
  snapshot_id uuid not null references case003.import_snapshot(id),
  company_code text not null,
  document_number text not null,
  fiscal_year integer not null,
  document_type_raw text not null,
  invoice_reference text,
  document_date date,
  posting_date date not null,
  payment_date_raw date,
  net_due_date date,
  document_amount numeric(20,4) not null,
  currency text not null,
  clearing_date date,
  clearing_document_number text,
  payment_method_raw text,
  payment_block_raw text,
  unique(snapshot_id,company_code,document_number,fiscal_year)
);

create table if not exists case003.invoice_financial_link (
  invoice_id uuid not null references case003.invoice(id),
  financial_item_id uuid not null references case003.financial_item(id),
  match_type text not null check(match_type in ('fi_key','reference_reconciliation')),
  is_primary boolean not null default false,
  amount_mismatch boolean not null default false,
  primary key(invoice_id,financial_item_id,match_type)
);

create or replace view case003.invoice_projection as
select
 i.tenant_id,i.snapshot_id,i.id invoice_id,i.supplier_id,i.invoice_reference,
 i.currency,i.gross_amount,i.sciv_due_date,
 f.net_due_date as fbl1n_net_due_date,
 coalesce(f.net_due_date,i.sciv_due_date) as canonical_due_date,
 case when f.net_due_date is not null then 'FBL1N' when i.sciv_due_date is not null then 'SCIV' else 'NONE' end due_date_source,
 (f.net_due_date is not null and i.sciv_due_date is not null and f.net_due_date<>i.sciv_due_date) due_date_conflict,
 f.payment_date_raw,f.clearing_date,f.clearing_document_number,
 case
   when f.clearing_date is not null or f.clearing_document_number is not null then 'SETTLEMENT_EVIDENCE'
   when f.payment_date_raw is not null then 'PAYMENT_DATE_EVIDENCE'
   else 'UNKNOWN'
 end payment_status_evidence,
 (coalesce(f.net_due_date,i.sciv_due_date) < current_date) as is_overdue,
 (coalesce(f.net_due_date,i.sciv_due_date) - current_date) as days_to_due,
 greatest(current_date-coalesce(f.net_due_date,i.sciv_due_date),0) as overdue_days,
 s.source_generated_at,s.published_at
from case003.invoice i
join case003.import_snapshot s on s.id=i.snapshot_id and s.status='active'
left join case003.invoice_financial_link l on l.invoice_id=i.id and l.is_primary
left join case003.financial_item f on f.id=l.financial_item_id;

create index if not exists case003_invoice_supplier on case003.invoice(tenant_id,supplier_id,snapshot_id);
create index if not exists case003_financial_reference on case003.financial_item(snapshot_id,company_code,invoice_reference);
create index if not exists case003_financial_due on case003.financial_item(snapshot_id,net_due_date);
