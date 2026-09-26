# MK1 — One Client Fully Operable

## Objective

Prove the complete value loop with one real **paid or explicitly funded** pilot, without building a generic automation SaaS or carrying unnecessary fixed infrastructure before revenue.

## Economic activation gate

Before a paying/funded pilot:
- production fixed-cost target is approximately S/0;
- demos run locally or against mocks/fixtures;
- no dedicated runtime/server/database per tenant;
- do not activate paid persistent infrastructure merely to be ready.

After payment/funding:
- activate only the minimum shared production runtime required by the selected Savings Workflows;
- meter provider/AI/OCR costs and prefer client-owned provider accounts where practical.

See ADR-0007.

## User outcome

A pilot client can log in and:
- see two real automations;
- see the business records they process;
- see recent activity;
- see incidents/attention items at a safe abstraction level;
- see auditable hours/value estimated by Savings Engine.

Operators can:
- create/manage the tenant;
- connect at least one real provider;
- install/configure two automation instances;
- monitor runs;
- inspect technical incidents;
- pause/resume;
- reconnect a broken connector;
- repair without editing production data manually.

## Build slices

### Slice 1 — Auth + tenancy
- Supabase Auth
- tenant/membership model
- RLS
- operator access path
- isolation tests

### Slice 2 — Savings Workflow catalog + instances
- SavingsWorkflowDefinition registry
- workflow/template version
- PluginInstallation / tenant config
- connector requirements
- runtime profile
- SavingsBaseline binding
- active/paused/degraded state

### Slice 3 — Connector v1
Default: Google OAuth because it enables Gmail/Drive patterns.

Must support:
- begin auth
- callback/state validation
- encrypted token reference
- healthcheck
- reconnect
- disconnect

### Slice 4 — Execution telemetry
- ExecutionRun
- ExecutionEvent
- idempotency
- trace ID
- completed/failed
- Incident creation

### Slice 5 — Process data
- ProcessRecord ingestion
- query by tenant/entityType
- client-visible table/list
- source reference
- attention state

### Slice 6 — Operator Console
Minimum screens:
- overview
- tenants
- tenant detail
- automation instances
- runs
- incidents
- connectors
- savings

### Slice 7 — Client Portal
Minimum:
- summary
- processes/data
- savings
- attention/pending

### Slice 8 — Savings Engine
- baseline creation
- confidence
- savings events
- monthly aggregation
- methodology transparency

### Slice 9 — First two real Savings Workflows
Select from `workflows/SAVINGS-WORKFLOW-REGISTRY.json` only after a real pilot exposes measurable repetitive work.

Strong low-infrastructure candidates include:
1. `LEAD_INTAKE_AUTOMATION` / `LEAD_FOLLOWUP_AUTOMATION`;
2. `PAYMENT_REMINDER_AUTOMATION`;
3. `APPOINTMENT_REMINDER_AUTOMATION`;
4. `EMAIL_CLASSIFY_ROUTE_AUTOMATION`;
5. `DOCUMENT_ARCHIVE_AUTOMATION`.

Choice must follow the paying pilot's actual baseline. Both workflows must use common capabilities/contracts and remain runtime-portable.

### Slice 10 — hardening
- security checklist
- backup + restore test
- rollback
- E2E tests
- production logs redacted
- incident drill

## Definition of Done

```text
[ ] 1 production-like pilot tenant exists
[ ] at least 2 client users can authenticate OR agreed MK1 reduced role model works
[ ] 2 automation instances are active
[ ] 1 real OAuth connector works end-to-end
[ ] connector health/reconnect works
[ ] every run creates auditable telemetry
[ ] duplicate callback/event cannot duplicate state/side effect
[ ] failures create incidents
[ ] client can see ProcessRecord data
[ ] client can see Savings Engine results and methodology
[ ] operator can inspect and repair incidents
[ ] RLS isolation tests pass
[ ] logs contain no secrets
[ ] backup restore was actually tested
[ ] deployment/rollback procedure is documented
[ ] no MK1 non-goal was smuggled into scope
```

## Success metrics for pilot

Product:
- automation success rate;
- incidents requiring manual operator intervention;
- mean time to detect;
- mean time to recover;
- connector health.

Business:
- automated units;
- exception rate;
- net minutes released;
- client-confirmed baseline confidence;
- willingness to continue monthly support.

Engineering:
- time to configure second client instance;
- percentage of workflow logic reusable without fork;
- number of customer-specific code paths.

## Stop rule

When DoD passes, MK1 is closed.

Do not delay release because we want WhatsApp, prettier analytics, billing, more connectors or a visual builder.


## Pre-pilot operations hardening

Before a real pilot exists, two additional operational paths are now rehearsed locally:

- installation bundle backup/restore with per-file SHA-256 verification;
- fail-safe incident creation followed by repaired replay with no duplicate side effect.

Evidence/tooling:
- `tools/savings/backup_bundle.py`;
- `operations/savings/runtime/incident_drill.mjs`;
- `mk1/ops-hardening/README.md`.

These reduce technical uncertainty but do **not** replace the production control-plane backup test or a live-provider incident drill required for MK1 closure.


## Reduced surface option

ADR-0009 permits a first paying/funded pilot to use local operator tooling plus an evidence-backed static client report when the client explicitly agrees that login/self-service is not required.

This is an economic sequencing decision, not a permanent product downgrade. Hosted Auth/RLS/Client Portal becomes mandatory when the contract, concurrency, compliance needs or recurring revenue justify it.


## Real-pilot evidence gate

The final MK1 transition is now machine-gated:

```bash
python tools/savings/mk1_gate.py check \
  --spec .local/pilot/<tenant>/mk1-pilot-evidence.json
```

A complete pilot may be sealed only after external evidence exists:

```bash
python tools/savings/mk1_gate.py seal \
  --spec .local/pilot/<tenant>/mk1-pilot-evidence.json \
  --out .local/pilot/<tenant>/MK1-PILOT-SEAL.json
```

This gate is deliberately fail-closed. Repository code cannot manufacture client consent, funding, provider ownership, OAuth scope evidence, a client-measured baseline or live production acceptance.
