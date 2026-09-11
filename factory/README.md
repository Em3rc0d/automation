# Baseline Factory

Status: **IMPLEMENTATION / FACTORY-FIRST**

The factory exists to turn mined workflow candidates into reproducible, evidence-backed `APPROVED_BASELINE` packages without deleting failed evidence or mutating the certified K0 archive.

## Factory pipeline

```text
DISCOVERED
-> LICENSE_CHECKED
-> INSPECTED
-> HARDENED
-> RUNTIME_IMPORTABLE
-> TESTED
-> APPROVED_BASELINE
```

Failures at any gate are preserved in `quarries/workflow-quarry/no-pass-verified/` with reason, evidence and re-entry conditions.

## Factory services

- pinned n8n runtime;
- deterministic mock control-plane endpoint;
- static candidate validator;
- runtime import/smoke harness;
- failure recorder;
- promotion tool that copies instead of moving/deleting source evidence;
- CI gates;
- certification ledger.

## Runtime authority

Pinned n8n version: `2.38.7`.

This version was selected from the current stable GitHub release on 2026-09-11. `latest` is forbidden in factory CI.

## Commands

```bash
python tools/validate_repository.py
python tools/validate_w1_candidates.py
python factory/tools/validate_factory.py
bash factory/tools/runtime_smoke.sh
```

Promotion is a separate explicit operation:

```bash
python factory/tools/promote.py \
  --package quarries/workflow-quarry/40-tested/<family>/<KEY>@<VERSION> \
  --family <family> \
  --dry-run
```

Remove `--dry-run` only after the test report is complete and approved.

## Non-deletion invariant

The factory never deletes source candidates. Promotion copies a tested package into the approved quarry and client-facing library. Failed test evidence is preserved. Superseded versions remain traceable.

## Factory exit gate

The factory may be certified `F1 FACTORY_OPERATIONAL` only when CI proves all of the following on the same SHA:

1. K0 repository invariants pass;
2. W1 package static validation passes;
3. factory self-validation passes;
4. pinned n8n runtime starts and reports healthy;
5. a factory runtime probe imports successfully;
6. the runtime probe executes successfully;
7. every current HARDENED candidate imports successfully into the pinned runtime;
8. mock control-plane is reachable from the runtime network;
9. promotion dry-run validates a synthetic TESTED fixture without deleting its source;
10. failure-recording self-test proves evidence is preserved;
11. no external cache or secrets are committed.

`F1` certifies the factory, not individual workflow business correctness.