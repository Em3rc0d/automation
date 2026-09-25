# Factory Runtime Support Policy

Status: **F1 AUTHORITY**

The Baseline Factory does not claim universal compatibility with arbitrary execution modes. The original F1 seal certifies `n8n-base-js-v1`; additional profiles require explicit same-SHA factory evidence and a profile certificate before they become certified scope.

## Certified base profile — `n8n-base-js-v1`

- n8n: `2.38.7`
- deployment for factory validation: Docker Compose
- official built-in `n8n-nodes-base.*` nodes
- JavaScript Code node execution
- workflow import through the n8n CLI
- workflow execution probe through the n8n CLI
- deterministic mock HTTP services reachable over the factory network
- credentials must remain unbound in repository artifacts
- operator-managed runtime configuration may be referenced through `$env` expressions
- `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` is explicit in the certified managed runtime profile

### Managed `$env` boundary

Environment-variable access is enabled because approved baselines must obtain control-plane URLs, internal authentication material and other deployment configuration **without embedding those values in `workflow.json`**.

This permission is valid only under the managed-engine boundary:

1. customers do not receive direct n8n editor access as part of the product;
2. baseline source is controlled and certified by the platform operator;
3. repository gates reject embedded secret-like values and bound credential references;
4. production secrets are injected by deployment/runtime secret management, never committed;
5. logs and evidence must not disclose injected values;
6. a future customer-editable workflow runtime requires a distinct security review/runtime profile rather than inheriting this permission automatically.

Thus `$env` access is a deliberate configuration/secret-reference mechanism, not permission to store secrets in workflows.

## Explicitly outside this F1 profile

The following are **not** implicitly supported merely because n8n can support them in another deployment:

- Python Code execution;
- internal Python task runner;
- external Python task runner;
- arbitrary community nodes;
- browser/GUI automation runtimes;
- external binaries not present in the pinned n8n image;
- provider-specific credentials or live third-party accounts;
- GPU workloads;
- custom Docker images/plugins not declared by a separately certified runtime profile.

A candidate requiring one of these must not pass the base-profile HARDENED gate. It must either:

1. be redesigned to fit `n8n-base-js-v1`; or
2. declare a separately implemented and certified runtime profile.

## Why Python is excluded from F1 base

During F1 runtime evidence, n8n `2.38.7` emitted a non-fatal warning that Python 3 was unavailable for its internal Python task runner and recommended external mode. The factory probe and current HARDENED candidates use JavaScript, so the base profile remained functional. Rather than ignoring this warning, F1 makes the unsupported boundary explicit.

## Candidate requirement

Every HARDENED candidate manifest must include:

```yaml
runtime:
  engine: n8n
  profile: n8n-base-js-v1
  tested_version: "2.38.7"
```

The W1/W2 static validators reject Python Code configuration and undeclared/non-base node packages under this profile.

## Certification candidate — `zero-deps-node-v1`

The repository is currently re-running the full factory gate to add a second explicit runtime profile:

- engine: Node.js
- pinned test version: `20.19.5`
- module system: ESM
- runtime package: `runtime/savings-p0/`
- package dependencies: none
- network required by reference tests/demos: no
- dedicated paid infrastructure required: no
- reference wave: W-SAVINGS-P0 / 12 workflows
- provider bindings: not part of this profile; only provider-neutral local adapters are exercised
- source-network boundary: direct HTTP/HTTPS/socket/fetch/child-process/environment access is forbidden by profile validation

Authority files:

- `factory/runtime-profiles/zero-deps-node-v1/profile.json`
- `factory/runtime-profiles/zero-deps-node-v1/validate_profile.py`
- `factory/runtime-profiles/zero-deps-node-v1/smoke.js`

Until the same exact push SHA passes the expanded `Baseline Factory Validation` and a certificate is committed, this profile remains **CANDIDATE / NOT FACTORY-CERTIFIED**.

## Upgrade rule

Changing the n8n pinned version, changing the managed `$env` boundary, materially changing a certified profile, or adding another runtime profile invalidates the relevant runtime evidence and requires re-running the full factory certification gate on the exact evidence SHA.


## Reference profiles outside certified scope

The repository may contain executable reference profiles under `runtime/`. A reference profile remains outside certified factory scope until its explicit profile gate and certificate close.

Reference evidence must not be relabeled as `TESTED` or `APPROVED_BASELINE` merely because unit/integration tests pass.
