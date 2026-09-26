# MK1 One-command Pilot Launch

Status: **READY / LOCAL / ZERO-PAID-INFRASTRUCTURE**

The repository now has one operator command that composes the approved pilot-preflight, installation-bundle and evidence-intake tooling:

```bash
python tools/savings/launch_pilot.py \
  --spec operations/savings/examples/pilot-preflight.example.json
```

It creates:

```text
.local/installations/<tenant>/
├── <WORKFLOW>@<version>/
└── PILOT-PLAN.json

.local/pilot/<tenant>/
├── mk1-pilot-evidence.json
├── role-model.json
├── tenant-isolation.json
├── deployment-decision.json
├── ops/
├── baselines/
├── connectors/
└── CLIENT-ACCEPTANCE.md
```

The fresh workspace must be **BLOCKED** by the MK1 real-pilot gate.

This command does not:
- provision Railway, n8n, Supabase or Vercel;
- bind a secret;
- call a live provider;
- agree a SavingsBaseline;
- record client approval;
- make a production-readiness claim.

The intended first-client path is now operationally simple:

```text
preflight spec
→ launch_pilot.py
→ bind/verify real connectors
→ agree baseline
→ controlled live executions
→ collect acceptance/ops evidence
→ mk1_evidence_sync.py
→ mk1_gate.py check
→ mk1_gate.py seal
```
