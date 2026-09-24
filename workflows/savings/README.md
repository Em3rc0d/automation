# Savings Workflow Packages

This directory is the materialization target for customer-facing Savings Workflow design packages.

The source of truth for the broad catalog is:

- `../SAVINGS-WORKFLOW-REGISTRY.json`
- `../SAVINGS-WORKFLOW-CATALOG.md`
- `../SAVINGS-WORKFLOW-STANDARD.md`
- `../ACTIVE-WORK-REDUCERS.md`

## Generate one package

```bash
python factory/tools/scaffold_savings_workflows.py \
  --key PAYMENT_REMINDER_AUTOMATION
```

## Generate the complete DESIGN_READY package tree

```bash
python factory/tools/scaffold_savings_workflows.py --all
```

The scaffolder intentionally creates:

```text
<domain>/<KEY>@0.1/
├── manifest.yaml
├── README.md
├── config.schema.json
├── fixtures/README.md
└── evidence/README.md
```

It does **not** create fake executable implementations and does **not** mark anything TESTED or APPROVED_BASELINE.

A package can move beyond DESIGN_READY only through the repository quarry/factory/certification gates.

## Why generated packages are not committed by default

The registry is the canonical design inventory. Materializing hundreds of empty package directories into Git would inflate file count without adding evidence or implementation quality.

Commit a package when it is selected for synthesis and real implementation begins. This preserves the Toolbox North Star: broad composition coverage, selective certification.
