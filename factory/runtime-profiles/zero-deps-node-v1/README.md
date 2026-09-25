# Runtime Profile — zero-deps-node-v1

Status: **FACTORY CERTIFICATION CANDIDATE**

This profile exists to certify the code-first shared runtime used by W-SAVINGS-P0 without requiring n8n, Docker services, paid hosting or provider credentials.

## Pinned runtime

- engine: Node.js
- version: **20.19.5**
- module system: ESM
- runtime package: `runtime/savings-p0/`
- runtime dependencies: **none**
- dev dependencies: **none**
- network required by reference tests/demos: **no**
- paid infrastructure required by certification: **no**

## Certified-intent boundary

The candidate profile covers only repository-controlled JavaScript/ESM code that fits the static/runtime policy enforced by `validate_profile.py`.

Allowed Node built-ins in `runtime/savings-p0/src/`:
- `node:crypto`

Explicitly forbidden in source under this profile:
- direct HTTP/HTTPS/network sockets;
- `fetch()`;
- child processes;
- environment-variable reads;
- hidden package dependencies;
- provider SDKs;
- live credentials;
- browser automation;
- external binaries.

Provider access in production must remain behind separately reviewed adapters. The P0 in-memory adapters are reference/test implementations, not live provider bindings.

## Same-SHA certification gate

A profile may become FACTORY-CERTIFIED only when the exact SHA passes:

1. repository/K0 invariants;
2. existing n8n F1 factory gate;
3. static profile validation;
4. W-SAVINGS-P0 structural validation;
5. Savings registry/package validation;
6. all zero-dependency Node tests;
7. all 12 deterministic demos;
8. profile smoke/import probe;
9. tracked-secret guard;
10. evidence artifact upload.

The certificate is created only after a successful **push-event** Baseline Factory Validation run on the exact evidence SHA.

## Important scope

Runtime-profile certification proves the execution substrate and packaging boundary. It does not automatically promote any Savings Workflow to TESTED or APPROVED_BASELINE.
