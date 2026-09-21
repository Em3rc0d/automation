-- CASE-003 portable smoke fixture. Synthetic only; dates are relative to execution date.
insert into case003.import_snapshot
(id,tenant_id,dataset_type,status,source_generated_at,published_at,created_at)
values
('30000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000000','supplier_ap','active',now(),now(),now())
on conflict (id) do nothing;

insert into case003.supplier
(id,tenant_id,snapshot_id,company_code,sap_vendor_id,display_name,tax_id,trusted_contact_email)
values
('30000000-0000-0000-0000-000000000010','30000000-0000-0000-0000-000000000000','30000000-0000-0000-0000-000000000001','PE10','SYNTH-001','Synthetic Supplier','20000000001','supplier@example.invalid')
on conflict (id) do nothing;

insert into case003.invoice
(id,tenant_id,snapshot_id,supplier_id,company_code,sap_vendor_id,invoice_reference,invoice_unique_id,fi_document_number,fiscal_year,document_date,receipt_date,currency,gross_amount,sciv_due_date)
values
('30000000-0000-0000-0000-000000000100','30000000-0000-0000-0000-000000000000','30000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000010','PE10','SYNTH-001','F001-100',null,'5100000100',extract(year from current_date)::int,current_date-10,current_date-9,'PEN',1000.00,current_date+1),
('30000000-0000-0000-0000-000000000101','30000000-0000-0000-0000-000000000000','30000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000010','PE10','SYNTH-001','F001-101','PRE-FI-101',null,null,current_date-8,current_date-7,'PEN',500.00,current_date+2)
on conflict (id) do nothing;

insert into case003.financial_item
(id,tenant_id,snapshot_id,company_code,document_number,fiscal_year,document_type_raw,invoice_reference,document_date,posting_date,net_due_date,document_amount,currency)
values
('30000000-0000-0000-0000-000000000200','30000000-0000-0000-0000-000000000000','30000000-0000-0000-0000-000000000001','PE10','5100000100',extract(year from current_date)::int,'RN','F001-100',current_date-10,current_date-10,current_date+3,1000.00,'PEN')
on conflict (id) do nothing;

insert into case003.invoice_financial_link(invoice_id,financial_item_id,match_type,is_primary,amount_mismatch)
values('30000000-0000-0000-0000-000000000100','30000000-0000-0000-0000-000000000200','fi_key',true,false)
on conflict do nothing;
