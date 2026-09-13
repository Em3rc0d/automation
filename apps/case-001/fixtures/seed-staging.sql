-- Synthetic staging-only seed data for CASE-001.
-- Never use this file for production tenant data.

with snapshot as (
  insert into public.case001_sap_snapshots (tenant_id, source_file_name, source_observed_at)
  values ('case-001-pilot', 'sap-sample.csv', now())
  returning id, imported_at
), products as (
  insert into public.case001_product_snapshots
    (tenant_id, snapshot_id, sku, description, stock, unit_of_measure, base_price, cost, currency, imported_at)
  select 'case-001-pilot', snapshot.id, p.sku, p.description, p.stock, p.uom, p.price, p.cost, p.currency, snapshot.imported_at
  from snapshot
  cross join (values
    ('EPOX-7000-GRIS','Epoxico Industrial 7000 Gris',84::numeric,'GAL',100::numeric,65::numeric,'USD'),
    ('EPOX-7000-AZUL','Epoxico Industrial 7000 Azul',42::numeric,'GAL',105::numeric,68::numeric,'USD'),
    ('PRIMER-100','Primer Industrial 100',120::numeric,'GAL',70::numeric,44::numeric,'USD')
  ) as p(sku, description, stock, uom, price, cost, currency)
  returning snapshot_id, sku
)
insert into public.case001_customers
  (tenant_id, whatsapp_phone, name, company_name, customer_type, preferred_currency, usual_discount_pct, payment_terms_days, credit_enabled, credit_limit)
values
  ('case-001-pilot', '+51999999999', 'Cliente Demo', 'Constructora Demo SAC', 'B2B', 'USD', 8, 30, true, 10000)
on conflict (tenant_id, whatsapp_phone) do update set
  name = excluded.name,
  company_name = excluded.company_name,
  preferred_currency = excluded.preferred_currency,
  usual_discount_pct = excluded.usual_discount_pct,
  payment_terms_days = excluded.payment_terms_days;
