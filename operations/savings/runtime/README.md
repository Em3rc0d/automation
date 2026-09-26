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


## Two execution modes

### Local simulation

`run_bundle.mjs` uses in-memory adapters and always emits `productionEvidence=false`.

### Verified live connectors

`verify_connectors.mjs` checks the real provider without executing the business side effect. After the bundle reaches `CLIENT_CONFIGURED`, `run_live.mjs` can execute the approved workflow against verified provider adapters.

Live execution uses:
- `FileIdempotencyStore` for cross-process duplicate protection;
- `FileAuditControlPlane` for append-only local operational evidence;
- the same approved `zero-deps-node-v1` business workflow code;
- provider adapters outside the certified core runtime boundary.

No live command auto-promotes a tenant to `CLIENT_ACCEPTED`.


## Local scheduling and event ingress

Scheduled installations can use generated local cron wrappers from `tools/savings/deploy_local.py`. The wrapper calls `run_live.mjs` and relies on the same persistent idempotency/audit state.

Event-driven installations can use `run_event_spool.mjs` as a filesystem ingress:

```text
inbox/*.json
→ run_live.mjs
→ processed/ OR failed/
→ evidence/*.result.json
```

This is intentionally not a public webhook server. It is a cheap operator/client-owned bridge suitable for pilots where another local/system process can write normalized events. A public HTTP ingress should be added only when a paid pilot requires it and must follow the repository webhook security contract.
