# Savings Baseline — AR Aging Calculation

Primary unit: **invoice**

Manual work reduced: Calculate days outstanding and aging buckets.

Collect: `manual_minutes_per_unit`, `baseline_sample_size`, `baseline_method`, `loaded_hourly_cost_pen`, `confidence`, `valid_from`, assumptions.

Runtime: `automated_units`, `exception_minutes`, `oversight_minutes`, `variable_cost`.

```text
net_minutes_released = max(0, automated_units * manual_minutes_per_unit - exception_minutes - oversight_minutes)
hours_released = net_minutes_released / 60
estimated_capacity_value = hours_released * loaded_hourly_cost
net_operating_value = estimated_capacity_value - variable_cost
```

Do not double-count internal reducer steps.
