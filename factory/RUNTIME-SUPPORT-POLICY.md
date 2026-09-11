# Factory Runtime Support Policy

Status: **F1 AUTHORITY**

The Baseline Factory does not claim universal compatibility with every optional n8n execution mode or community node. F1 certifies one explicit runtime profile and blocks candidates that need untested execution infrastructure.

## Certified base profile — `n8n-base-js-v1`

- n8n: `2.38.7`
- deployment for factory validation: Docker Compose
- official built-in `n8n-nodes-base.*` nodes
- JavaScript Code node execution
- workflow import through the n8n CLI
- workflow execution probe through the n8n CLI
- deterministic mock HTTP services reachable over the factory network
- credentials must remain unbound in repository artifacts

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

The W1 static validator rejects Python Code configuration and undeclared/non-base node packages under this profile.

## Upgrade rule

Changing the n8n pinned version or adding another runtime profile invalidates the relevant F1 runtime evidence and requires re-running the full factory certification gate.
