# W2+ — Baseline Quality Bar

Status: AUTHORITATIVE FOR W2 AND LATER WAVES

## Principle

The production library is not a workflow-count project.

**Thousands of mined artifacts are raw evidence. The approved library must remain compact, sophisticated, composable and commercially useful.**

A provider clone, cosmetic variant, single-node wrapper, renamed template or narrowly hardcoded customer flow does not count as a new baseline capability.

## Admission score

Every new baseline candidate is scored from 0–5 in six dimensions:

1. **Business coverage** — solves a meaningful recurring business capability rather than a trivial step.
2. **Cross-client reuse** — portable across tenants/verticals through configuration and adapters.
3. **Decision depth** — meaningful validation, branching, policy, confidence, reconciliation or exception logic.
4. **Operational resilience** — deterministic identity/idempotency, bounded retries, visible permanent failures and safe re-entry.
5. **Security/observability** — tenant explicit, no embedded secrets, PII-aware errors/logging, telemetry/audit hooks.
6. **Testability/evidence** — deterministic fixtures, adversarial paths and reproducible runtime/domain evidence.

### Admission rule

```text
minimum total: 24 / 30
minimum per dimension: 3 / 5
security/observability: must be >= 4 for side-effecting components
operational resilience: must be >= 4 for side-effecting components
```

A high total score cannot compensate for a dangerous low score in a mandatory dimension.

## Anti-inflation rules

The following MUST NOT inflate baseline count:

- the same capability for Gmail vs Outlook;
- the same capability for HubSpot vs Pipedrive;
- the same capability for WhatsApp Cloud vs Twilio;
- language/localization variants;
- customer-specific field mappings;
- cosmetic prompt changes;
- thresholds that belong in configuration;
- duplicate mined templates with equivalent semantics;
- simple sequences that can be expressed as composition of existing baselines.

Those belong in **provider adapters, configuration, policy packs, mappings, templates or composition recipes**.

## When a new baseline IS justified

A distinct baseline is justified when evidence shows a materially different semantic contract, failure model or business decision boundary. Examples:

- deterministic document extraction vs probabilistic extraction with field-confidence;
- exact dedupe vs fuzzy/probabilistic entity resolution;
- a passive notification vs an approval requiring human decision and expiry/escalation;
- inventory reservation vs simple inventory read;
- payment reconciliation vs payment notification.

## Sophistication evidence

A component promoted beyond HARDENED must prove applicable cases for:

- happy path;
- missing/invalid tenant-bound input;
- deterministic replay/idempotency;
- malformed timestamps/amounts/identities;
- policy branch or exception branch;
- transient dependency failure;
- permanent dependency failure;
- missing configuration;
- no embedded secrets/credential bindings;
- PII-safe error behavior;
- domain-specific invariant(s);
- non-destructive promotion with source evidence preserved.

## Coverage target

There is deliberately **no target such as “100 workflows.”**

The target is sufficient reusable coverage that a common SME automation can be assembled primarily from approved capabilities + adapters + configuration, while uncommon/vertical-specific behavior can extend the library without polluting its common core.

A smaller library with broad composability and strong contracts is preferred to a large catalog of shallow templates.

## Relationship to mining

Mining remains unlimited and continuous:

```text
8k+ / 20k+ / future corpus
        ↓
semantic clustering + provenance
        ↓
best patterns / edge cases / tests
        ↓
synthesis
        ↓
quality-bar admission
        ↓
HARDENED → TESTED → APPROVED_BASELINE
```

Artifacts that do not pass are preserved in the quarry/no-pass evidence. They are never erased merely to improve approval statistics.
