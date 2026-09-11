# Savings Engine v1

The Savings Engine is a model of evidence, not a marketing counter.

## Principle

Never infer “cash savings” from execution count alone.

We separate:

1. **time/capacity released**;
2. **estimated capacity value**;
3. **direct costs avoided** when independently provable;
4. **revenue uplift** when separately attributable;
5. **automation variable cost**;
6. **service fee**.

## Baseline required before claiming savings

Example:

```text
Process: Register and classify lead
Method: time_study
Sample: 20 operations
Median manual time: 6.8 min/unit
Loaded labor cost: S/ 21.50/h
Historical errors: not measured
Confidence: HIGH
Validated: 2026-09-04
```

## Confidence

| Level | Rule |
|---|---|
| HIGH | observed time study / strong system data with adequate sample |
| MEDIUM | operational data + client validation |
| LOW | discovery estimate/client declaration |

The portal always displays confidence and assumptions.

## Core variables

```text
A = automated units
M = historical manual minutes per unit
E = human exception-resolution minutes
O = human oversight minutes
H = loaded hourly labor cost
V = real variable automation cost
F = monthly service fee when applicable
```

## Formulas

```text
gross_minutes_saved = A × M
```

```text
net_minutes_released = max(0, A × M - E - O)
```

```text
hours_released = net_minutes_released / 60
```

```text
estimated_capacity_value = hours_released × H
```

```text
net_operating_value = estimated_capacity_value - V
```

If including service fee:

```text
monthly_net_value = estimated_capacity_value - V - F
```

A simple ROI expression can be shown only when denominator semantics are explicit:

```text
ROI = (estimated_capacity_value - total_monthly_cost) / total_monthly_cost
```

## Language rules

Use:
- `Horas liberadas`
- `Valor estimado de capacidad`
- `Costo variable de automatización`
- `Valor operativo neto estimado`

Do not automatically call capacity value `cash savings`.

If an employee saves 10 hours but remains employed, cash payroll may not have decreased. The automation created capacity.

## Revenue uplift is separate

Example:

```text
Operational value: S/ 1,220
Attributed additional revenue: S/ 3,800
Attribution confidence: LOW
```

Do not collapse these into “we made you S/ 5,020”.

## Data model

```sql
create table savings_baselines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  automation_instance_id uuid not null references automation_instances(id),
  currency text not null default 'PEN',
  manual_minutes_per_unit numeric(12,4) not null check (manual_minutes_per_unit >= 0),
  loaded_hourly_cost numeric(12,2) not null check (loaded_hourly_cost >= 0),
  baseline_sample_size integer check (baseline_sample_size >= 0),
  baseline_method text not null check (
    baseline_method in ('time_study','system_data','client_declared','mixed')
  ),
  confidence text not null check (confidence in ('low','medium','high')),
  valid_from date not null,
  valid_to date,
  reviewed_at timestamptz,
  reviewed_by uuid,
  assumptions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table savings_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  automation_instance_id uuid not null references automation_instances(id),
  execution_run_id uuid references execution_runs(id),
  occurred_at timestamptz not null,
  eligible_units integer not null default 0,
  automated_units integer not null default 0,
  exception_minutes numeric(12,2) not null default 0,
  oversight_minutes numeric(12,2) not null default 0,
  variable_cost numeric(12,4) not null default 0,
  created_at timestamptz not null default now()
);
```

## Historical integrity

Baselines are versioned by validity range.

```text
Baseline v1  2026-09-01 → 2026-11-30
Baseline v2  2026-12-01 → ...
```

Never rewrite past savings silently when the baseline changes.

## Client Portal transparency

Each metric must link to methodology:

```text
Hours released             38.4 h
Estimated capacity value   S/ 825.60
Automation variable cost   S/ 91.40
Net operating value        S/ 734.20

Manual baseline            6.8 min/lead
Automated leads            358
Human oversight            51 min
Exceptions                 32 min
Hourly cost                S/ 21.50
Confidence                 HIGH
Last review                2026-09-04
```

## Discovery checklist for baseline

- What task is being replaced or reduced?
- Who performs it?
- How many units per week/month?
- Median time per unit?
- What exceptions exist?
- How often does manual correction occur?
- What loaded hourly cost will both parties accept?
- Is the figure observed, system-derived or declared?
- How many observations?
- What changes would invalidate the baseline?

Savings are not enabled for an automation until these assumptions are stored and acknowledged.
