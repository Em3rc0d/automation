# Certified Toolbox North Star

Status: **GOVERNANCE AUTHORITY**
Updated: 2026-09-11

## North Star

> Maintain a sufficiently broad, certified, provider-neutral toolbox so that the majority of reasonable SMB automation requests can be assembled from existing capabilities, adapters, policies and configuration instead of implementing business logic from scratch.

The repository is **not** optimized for workflow count.

A higher number of JSON files is not success. A smaller set of deep, composable, certified capabilities is preferable to a large catalog of provider-specific or cosmetic variants.

## Unit model

Every reusable artifact MUST belong to exactly one class:

1. **CAPABILITY** — stable business semantic boundary, e.g. `LEAD_DEDUPE`, `PAYMENT_RECONCILE`, `SLA_WATCHDOG`.
2. **ADAPTER** — provider implementation of a connector capability, e.g. HubSpot/Pipedrive for `crm.contact.upsert`.
3. **POLICY_CONFIG** — tenant/vertical rule, thresholds, templates, mappings, schedules, consent rules.
4. **VERSION** — improved implementation of an existing semantic capability.
5. **SAVINGS_WORKFLOW** — customer-facing composition that removes a coherent unit of repetitive human work and maps to a SavingsBaseline. It is composed from CAPABILITY/ADAPTER/POLICY_CONFIG artifacts and is not counted as a new capability merely because the customer-facing recipe differs.

Provider, channel, locale or client variants MUST NOT become new CAPABILITY entries when the business semantic boundary is unchanged.

Examples:

- Gmail vs Outlook -> ADAPTER, not two capabilities.
- HubSpot vs Pipedrive -> ADAPTER.
- WhatsApp Cloud vs Twilio -> ADAPTER.
- Peru tax mapping vs another country -> POLICY_CONFIG / regional adapter when appropriate.
- Improved duplicate algorithm -> VERSION of `*_DEDUPE`, not a new capability.

## Capability admission test

A proposed CAPABILITY is admitted only when all are true:

- it introduces a distinct reusable business semantic boundary;
- at least two plausible clients/verticals can reuse it, unless explicitly marked regional/core infrastructure;
- it has a stable provider-neutral input/output contract;
- it cannot be represented more cleanly as configuration, adapter or version of an existing capability;
- it defines idempotency / replay behavior when applicable;
- it defines failure/exception behavior;
- side effects identify approval/safety requirements;
- it can be tested independently;
- it meets the current quality-bar score;
- provenance/mining evidence exists when external patterns informed it.

## Success metrics

The toolbox is measured by these metrics, in priority order:

### 1. Common Process Coverage

Percentage of the canonical SMB process map for which a certified or in-certification provider-neutral capability exists.

`coverage = covered semantic boundaries / required semantic boundaries`

### 2. Assembly Coverage

Percentage of reference SMB solution archetypes that can be built without adding new business-semantic code.

Adapters/configuration are allowed. New capability code means the archetype is not fully covered.

### 3. Certification Ratio

`APPROVED_BASELINE capabilities / capability candidates intended for production`

Discovery/mining candidates do not reduce this ratio until selected for production synthesis.

### 4. Reuse Density

How many distinct solution archetypes use each capability. High-value primitives should compose broadly.

### 5. Provider Independence

Business capabilities should depend on connector contracts rather than vendor-specific nodes whenever practical.

### 6. Operational Depth

Capabilities must carry the expected safety/operations properties: validation, idempotency, retries where applicable, failure path, telemetry, approvals, rollback and evidence.

### 7. Duplicate Semantic Rate

Near-zero duplicate capabilities with the same business meaning. Semantic duplicates are merged/versioned rather than counted.

## Reference assembly gate

A toolbox milestone is not considered broad solely because many capabilities exist. It must demonstrate end-to-end composition across representative SMB archetypes such as:

- lead intake -> qualification -> CRM -> follow-up -> appointment;
- quote -> approval -> delivery -> acceptance -> invoice -> payment -> reconciliation;
- WhatsApp/email document intake -> OCR/extraction -> validation -> review -> accounting export;
- appointment request -> availability -> booking -> reminder -> reschedule/cancel -> post-service;
- support intake -> classify -> prioritize -> route -> SLA -> human-approved response -> close -> survey;
- client won -> contract -> folders/project/tasks -> access -> invoice -> kickoff -> handoff;
- purchase request -> budget/approval -> supplier/PO -> receipt -> three-way match -> AP;
- order -> inventory reservation -> fulfillment -> shipping -> return/refund -> retention;
- employee onboarding -> documents -> access -> tasks -> acknowledgements -> offboarding;
- inbox -> classify -> extract -> task/record -> approval -> archive;
- KPI/event streams -> aggregate -> anomaly/threshold -> executive brief -> action;
- connector/webhook -> verify -> dedupe -> retry/govern -> incident/audit/usage/savings.

## Growth rule after W11

W11 is a milestone, not a catalog ceiling.

Additional waves are justified only by one or more of:

- uncovered common SMB process boundary;
- meaningful cross-client composition gap;
- material operational/safety primitive missing;
- adapter breadth required for real delivery;
- regional/legal integration with authoritative evidence;
- materially stronger version of an existing capability.

There is no target such as `200 workflows` or `300 workflows`.

The catalog may stop at 137 or grow beyond 300. The deciding factor is coverage and reuse, not count.

## Permanent invariant

**MINING NEVER STOPS; CERTIFICATION REMAINS SELECTIVE.**

The quarry may contain thousands of discovered artifacts. The approved toolbox should contain only artifacts we would be willing to assemble into a paying client's automation system.

## Broad solution catalog vs capability count

The repository may maintain hundreds of DESIGN_READY Savings Workflows without violating this North Star. Those entries are solution compositions, not a numeric target for semantic capabilities.

Success remains:
- few deep reusable capabilities;
- many valid compositions;
- selective certification;
- high reuse density;
- measurable customer work reduction.

`SAVINGS-WORKFLOW-CATALOG.md` is therefore allowed to be broad while `APPROVED_BASELINE` remains deliberately selective.
