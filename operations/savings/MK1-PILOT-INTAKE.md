# MK1 Pilot Intake Pack

Status: **READY / ZERO-SECRET / INITIAL STATE BLOCKED**

This pack is the handoff from commercial discovery into technical delivery.

Generate it from the existing pilot preflight specification:

```bash
python tools/savings/pilot_intake.py \
  --spec operations/savings/examples/pilot-preflight.example.json
```

Output:

```text
.local/pilot/<tenant>/
├── INTAKE-MANIFEST.json
├── README.md
├── mk1-pilot-evidence.json
├── role-model.json
├── tenant-isolation.json
├── deployment-decision.json
├── CLIENT-ACCEPTANCE.md
├── baselines/
│   └── <WORKFLOW>.json
└── connectors/
    └── <WORKFLOW>.json
```

The generated workspace is intentionally unusable as certification evidence on day one:
- funding is `UNFUNDED`;
- all real-pilot gates are false;
- baselines are `DRAFT`;
- connector credential refs/scopes are empty;
- acceptance is DRAFT;
- no secrets are generated or stored.

Its purpose is to remove implementation ambiguity when the first real client arrives. From that point onward, the work is evidence collection rather than inventing new infrastructure.
