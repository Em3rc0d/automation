# F1 Runtime Profile Certificate — zero-deps-node-v1

## Decision

**CERTIFIED — F1 RUNTIME PROFILE / zero-deps-node-v1**

Repository: `Em3rc0d/automation`  
Evidence branch: `main`  
Certification date: 2026-09-25

## Evidence identity

- Evidence commit: `8475fcd95817098c59cd1088b543e4881bd3fe38`
- GitHub Actions workflow: `Baseline Factory Validation`
- Exact push-event run: `36087356818`
- Existing factory job: `107922114438` — **SUCCESS**
- zero-deps profile job: `107922514846` — **SUCCESS**
- Profile evidence artifact: `10843959001`
- Profile artifact name: `zero-deps-node-v1-validation-8475fcd95817098c59cd1088b543e4881bd3fe38`
- Profile artifact digest: `sha256:dc88223294c020b87ffe5f35c01f29d576d75fb897ef4521122bba81ed87c64c`
- Full factory artifact: `10844431638`
- Full factory artifact digest: `sha256:203f96e1d7e27e5998aebf629f4286b294709cc974df92f4bd49f5489ec63b9c`

The earlier main run `36086969430` is deliberately **not** accepted as certification evidence: it exposed a shell-pipeline defect that allowed a failing hardening-readiness validator to be masked by `tee`. The gate was changed to fail closed with `set -o pipefail`, the reference-evidence defect was corrected, and this certificate uses only the later clean exact-SHA run above.

## Certified profile

```text
profile                    zero-deps-node-v1
engine                     Node.js
tested Node version        20.19.5
module system              ESM
runtime dependencies       0
dev dependencies           0
network needed for tests   no
paid test infrastructure   no
dedicated tenant runtime   no
reference workflows        12
reference adapters         table / message / calendar / storage
```

## Same-SHA evidence proven

The exact evidence run proved:

1. Existing repository/K0 invariants passed.
2. The historical n8n F1 factory gate still passed on the same SHA.
3. `zero-deps-node-v1` static profile validation passed.
4. Node was pinned to `20.19.5`.
5. Runtime package dependency sets were empty.
6. Source imports remained within relative modules plus the declared `node:crypto` builtin.
7. Direct network/socket/fetch/child-process/environment access remained outside the profile boundary.
8. W-SAVINGS-P0 reported **12/12 REFERENCE_IMPLEMENTED**.
9. Savings registry/package validation passed.
10. Code-first Savings hardening-readiness validation passed.
11. The complete Node suite passed: **44 tests / 44 pass / 0 fail**.
12. All deterministic reference demos passed through `npm run validate`.
13. Runtime import smoke passed for all 12 workflow modules and shared runtime/adapters.
14. No tracked `node_modules` or local secret files were allowed.
15. Evidence artifacts were uploaded for the exact push SHA.

## Security and execution boundary

This certificate covers repository-controlled code under the profile policy. It does not authorize arbitrary Node execution.

Explicitly outside the certified profile unless separately reviewed/certified:

- direct HTTP/HTTPS/socket access from workflow source;
- `fetch()` from profile source;
- child processes;
- direct `process.env` reads;
- undeclared npm packages or provider SDKs;
- live third-party credentials;
- browser automation;
- external binaries;
- GPU workloads;
- arbitrary customer-authored code.

Production provider access must remain behind explicit adapters/connectors and client-specific credential/scope validation.

## What this certificate does NOT mean

This certificate proves the **runtime substrate and code-first package boundary**, not the business production-readiness of every workflow that can run on it.

The 12 W-SAVINGS-P0 workflows are still independently governed through:

```text
DESIGN_READY
→ HARDENED
→ TESTED
→ APPROVED_BASELINE
→ CLIENT_CONFIGURED
→ CLIENT_ACCEPTED
```

At this certificate point:

```text
zero-deps-node-v1 runtime       FACTORY-CERTIFIED
W-SAVINGS-P0 executable refs    12/12
W-SAVINGS-P0 HARDENED           0/12
W-SAVINGS-P0 TESTED             0/12
W-SAVINGS-P0 APPROVED           0/12
```

No workflow is made `APPROVED_BASELINE` merely by this runtime certificate.

## Relationship to original F1

`certification/F1-FACTORY-CERTIFICATE.md` remains immutable historical evidence for the original `n8n-base-js-v1` factory scope.

This certificate extends the factory's certified runtime scope with a second independently validated profile. It does not replace or rewrite the original F1 evidence.

## Invalidation

Re-certification is required after material changes to:

- Node pinned version;
- allowed built-ins or forbidden-capability policy;
- dependency/network boundary;
- runtime kernel semantics;
- idempotency/retry/store contracts;
- code-first Savings package contract;
- profile validation/smoke harness;
- factory promotion semantics.

## Verdict

```text
n8n-base-js-v1      FACTORY-CERTIFIED
zero-deps-node-v1   FACTORY-CERTIFIED
W-SAVINGS-P0        RUNTIME READY FOR HARDENING / NOT YET APPROVED
```

**PASS — `zero-deps-node-v1` is certified as an explicit Baseline Factory runtime profile.**

---

Signed,

**Jett**  
GPT-5.6 Sol  
2026-09-25
