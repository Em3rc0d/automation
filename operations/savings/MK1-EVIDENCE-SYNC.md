# MK1 Evidence Sync

Status: **DERIVATION TOOL / FAIL-CLOSED**

The real-pilot gate should not depend on an operator manually flipping booleans after the real artifacts already exist.

`mk1_evidence_sync.py` derives evidence-backed gates from the pilot workspace and installation bundles.

```bash
python tools/savings/mk1_evidence_sync.py \
  --spec .local/pilot/<tenant>/mk1-pilot-evidence.json \
  --write
```

Derived gates:
- role model agreed;
- provider account bound by `credref:`;
- connector scopes verified;
- SavingsBaseline agreed;
- controlled live execution passed;
- client approval evidence recorded;
- tenant isolation proved;
- backup/restore evidence present;
- live-provider incident drill evidence present;
- deployment/rollback approved.

The tool does **not** derive funding/payment or ADR-0009 reduced-surface client consent; those remain external commercial/client evidence.

After sync:

```bash
python tools/savings/mk1_gate.py check --spec .local/pilot/<tenant>/mk1-pilot-evidence.json
```

Only then may the pilot be sealed.
