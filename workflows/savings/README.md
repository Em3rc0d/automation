# Savings Workflow Packages

This directory is the **materialized DESIGN_READY skeleton library** for customer-facing Savings Workflows.

Source authorities:

- `../SAVINGS-WORKFLOW-REGISTRY.json`
- `../SAVINGS-WORKFLOW-CATALOG.md`
- `../SAVINGS-WORKFLOW-STANDARD.md`
- `../ACTIVE-WORK-REDUCERS.md`
- `INDEX.md`

## Current materialization

- **233 workflow skeletons**
- **21 domains**
- **12 package files per workflow**
- all remain **DESIGN_READY**
- **0** workflows are promoted to TESTED/APPROVED merely by being materialized

## Package contract

```text
<domain>/<KEY>@<version>/
├── manifest.yaml
├── README.md
├── config.schema.json
├── contracts/
│   ├── input.schema.json
│   └── output.schema.json
├── fixtures/
│   ├── happy-path.json
│   ├── duplicate.json
│   └── provider-error.json
├── tests/
│   └── TEST-PLAN.md
├── savings/
│   └── BASELINE.md
├── implementation/
│   └── flow.plan.yaml
└── runbook/
    └── RUNBOOK.md
```

## Generate / refresh one package

```bash
python factory/tools/scaffold_savings_workflows.py \
  --key PAYMENT_REMINDER_AUTOMATION \
  --force
```

## Generate / refresh the complete library

```bash
python factory/tools/scaffold_savings_workflows.py --all --force
```

`REFERENCE_IMPLEMENTED` packages are preserved by default even with `--force`. This prevents generic regeneration from destroying specialized contracts/evidence. Overwriting one of those packages requires the explicit dangerous flag `--replace-reference`.

## Why commit the skeletons now?

The product has moved from a small template list to a broad **Savings Workflow design library**. Keeping the skeletons in Git gives each workflow a visible place for:

- contracts;
- tenant configuration;
- realistic fixtures;
- test-plan evolution;
- SavingsBaseline definition;
- implementation planning;
- operational runbook.

This does **not** optimize the project for workflow count. The semantic capability library remains selective and provider-neutral. These folders are solution-level compositions and design contracts.

## Certification boundary

Materialization is not implementation.

```text
DESIGN_READY
→ SELECTED_FOR_SYNTHESIS
→ HARDENED
→ TESTED
→ APPROVED_BASELINE
→ CLIENT_CONFIGURED
→ CLIENT_ACCEPTED
```

No skeleton may be described as production-ready before the corresponding gates and evidence exist.
