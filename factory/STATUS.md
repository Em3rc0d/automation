# Baseline Factory Status

Updated: 2026-09-11

## Certification state

```text
K0 FOUNDATION                 CERTIFIED / ARCHIVED
F1 FACTORY_OPERATIONAL        IN VALIDATION
W1 BASELINE LIBRARY           IN PROGRESS
P1 PILOT PRODUCT              NOT OPEN
```

## Runtime

- engine: n8n
- pinned version: `2.38.7`
- runtime definition: `factory/runtime/compose.yml`
- mock control plane: WireMock `3.9.1`
- probe: `factory/probes/runtime-probe.json`

## Factory machinery

- quarry stage model: PRESENT
- `no-pass-verified`: PRESENT
- static K0 validator: PRESENT
- static W1 validator: PRESENT
- factory static validator: PRESENT
- non-destructive promotion: PRESENT
- failure preservation: PRESENT
- isolated self-test: PRESENT
- runtime import harness: PRESENT
- runtime execution probe: PRESENT
- factory CI: PENDING FIRST GREEN RUN

## Current rule

No candidate may be promoted to `40-tested` merely because it imports. Individual runtime/business test plans remain mandatory.

No component may enter `workflows/n8n/` without TESTED evidence and explicit promotion.

No source candidate is deleted during failure, supersession or promotion.