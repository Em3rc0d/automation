# W3-W11 — Capability Quality Bar

Status: **AUTHORITATIVE ADMISSION POLICY**

The library is optimized for semantic coverage and production quality, not raw JSON count. A provider variant, renamed workflow, client-specific mapping, localization, or cosmetic topology change never creates a new capability.

## Admission score

Every capability is scored from 1–5 in six dimensions:

1. business coverage;
2. cross-client reuse;
3. decision depth;
4. operational resilience;
5. security and observability;
6. testability and evidence.

Admission requires:

- total score **>= 24/30**;
- no dimension below **3/5**;
- a capability that can create a business side effect must score **>= 4/5** in operational resilience and security/observability;
- stable semantic key and version;
- tenant-scoped `passthrough` input contract;
- deterministic idempotency identity;
- zero embedded secrets and zero bound client credentials;
- valid and adversarial runtime probes;
- no dead branches copied from sibling capabilities.

## What counts as a distinct capability

A component counts only when it owns a distinct business responsibility and can be composed independently. Examples: lead identity resolution and lead routing are distinct; Gmail lead capture and Outlook lead capture are not — those are connector adapters for the same capability.

## Runtime evidence

W3-W11 compile into isolated n8n candidates plus two probes per capability:

- valid-path probe;
- adversarial edge-path probe.

All probes execute on the pinned `n8n-base-js-v1 / n8n 2.38.7` factory profile. The assertion node fails the workflow if the semantic decision differs from the catalog contract.

The deterministic generated directory is intentionally ignored by Git. `waves/catalog.py` plus the compiler are source authority; runtime evidence proves the compiler output at the PR SHA.
