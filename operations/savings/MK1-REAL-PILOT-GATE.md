# MK1 Real Pilot Evidence Gate

Status: **READY FOR EXTERNAL EVIDENCE / FAIL-CLOSED**

The repository has already reduced the technical unknowns that can be proven without a client. The remaining MK1 gates are intentionally real-world.

This gate turns those requirements into one machine-readable checklist without pretending that repository code can manufacture client consent, OAuth ownership, real process baselines or production evidence.

## Check a pilot

```bash
python tools/savings/mk1_gate.py check \
  --spec operations/savings/examples/mk1-pilot-evidence.blocked.example.json
```

The included example must return **BLOCKED**.

## Seal a complete pilot

Only after all evidence exists:

```bash
python tools/savings/mk1_gate.py seal \
  --spec .local/pilot/<tenant>/mk1-pilot-evidence.json \
  --out .local/pilot/<tenant>/MK1-PILOT-SEAL.json
```

The seal records the SHA-256 of the evidence specification. It refuses to run while any gate is incomplete.

## Required real-world gates

- pilot is PAID or explicitly FUNDED;
- role model agreed;
- provider account bound;
- OAuth/scopes verified;
- client-specific SavingsBaseline agreed;
- controlled live execution passed;
- client acceptance recorded;
- tenant isolation proved;
- backup/restore passed in the chosen production/reduced-surface mode;
- incident drill passed with the live provider path;
- deployment/rollback approved.

At least two APPROVED_BASELINE workflows and their installation bundles are required.

## Reduced surface

When ADR-0009 `REDUCED_STATIC` mode is used, the gate additionally requires:
- explicit client agreement evidence;
- a client-approved access-controlled delivery channel.

Reduced surface removes unnecessary hosted presentation spend; it does not waive tenant isolation, connector verification, live execution, backup/restore, incident response or client acceptance.
