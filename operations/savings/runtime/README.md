# Zero-cost installation runner

Status: **LOCAL SIMULATION / OPERATOR TOOLING**

This runner closes the gap between an `APPROVED_BASELINE` and a client-specific connector rollout without provisioning paid infrastructure.

```text
approved baseline
→ installation bundle
→ client-like fixture
→ same certified workflow code
→ in-memory adapters
→ ProcessRecord / Incident / SavingsEvent
→ dry-run evidence
```

It executes all **12 W-SAVINGS-P0 workflows** against the same `zero-deps-node-v1` workflow implementations. Only adapters are simulated.

## Run

```bash
node operations/savings/runtime/run_bundle.mjs \
  --bundle .local/installations/acme/PAYMENT_REMINDER_AUTOMATION@0.1 \
  --fixture client-fixture.json \
  --out dry-run-result.json
```

The result contains:
- workflow output;
- simulated messages/storage writes;
- ProcessRecords;
- Incidents;
- SavingsEvents;
- economic rollup only when the bundle SavingsBaseline is `AGREED`.

## Important boundary

The result is labeled:

```json
{
  "evidenceType": "LOCAL_SIMULATION",
  "productionEvidence": false
}
```

Therefore this runner **cannot** satisfy `productionDryRunPassed` and cannot, by itself, justify `CLIENT_ACCEPTED`. It is used to test client-like fixtures before spending on or binding real providers.

## Fixture fields

Use only the fields relevant to the workflow:

- record/batch workflows: `records`;
- appointment reminder: `events`;
- lead intake: `inbound`;
- email workflows: `email`;
- document archive: `document`;
- support intake: `request`;
- scheduled date logic: `asOf` or `asOfDate`.

Tenant IDs are injected into simulated records/events when omitted.
