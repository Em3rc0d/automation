# ADR-0005 — Savings Engine Methodology

Status: **ACCEPTED**
Date: 2026-09-11

## Decision

Savings is an evidence-backed estimate derived from an explicit `SavingsBaseline`, never a marketing counter invented from execution count.

For a process unit:

```text
manual_minutes_saved = automated_units * manual_minutes_per_unit
net_minutes_saved = manual_minutes_saved - exception_minutes - oversight_minutes
capacity_value = max(net_minutes_saved, 0) / 60 * loaded_hourly_cost
net_operational_value = capacity_value - variable_cost
```

## Required semantics

- `capacity_value` means productive capacity released; it is **not automatically cash saved**.
- `cash_saving` may be shown only when a documented cost actually disappeared/was avoided.
- revenue/recovery uplift is tracked separately from labor savings.
- baseline method is one of `time_study`, `system_data`, `client_declared`, or `mixed`.
- confidence is `low`, `medium`, or `high` and visible to the client.
- changes to baseline assumptions create a new version; history is never silently recalculated.
- failed/duplicate/replayed executions do not generate savings twice.
- human review/exception time is subtracted.
- variable provider/API/AI cost is attributable per run where measurable.

## Minimum baseline evidence

A baseline records: process definition, unit definition, sample period/size, manual time, loaded hourly cost or alternate value metric, assumptions, confidence, effective dates and approver.

## Portal wording

Preferred labels are `horas liberadas estimadas`, `valor operativo estimado`, `costos variables`, `beneficio neto estimado` and `confidence`. Avoid unqualified claims such as “dinero ahorrado” unless cash evidence exists.

## Consequence

Every approved automation capability must document what constitutes an eligible unit and how it maps to `SavingsEvent`; capabilities without a defensible value model may report throughput/quality without monetary ROI.
