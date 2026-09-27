create or replace view public.case001_product_snapshot_latest
with (security_invoker = true) as
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
