# no-pass-verified

Nothing discovered by the quarry is deleted because it fails a gate.

This directory preserves candidates that do not currently qualify for the next stage. A candidate may re-enter the pipeline after the blocking condition is resolved.

## Subfolders

- `license-blocked/` — license missing, incompatible, ambiguous, or redistribution rights unverified.
- `provenance-blocked/` — origin/author/source chain cannot yet be established.
- `security-blocked/` — secrets, unsafe side effects, untrusted community nodes, or other unresolved security concerns.
- `quality-blocked/` — malformed, obsolete, incomplete, brittle, or too environment-specific.
- `knowledge-only/` — valuable source of use cases/specifications/patterns but not verified importable workflow code.
- `test-failed/` — hardening was attempted but acceptance/security/idempotency/error-path tests failed.
- `superseded/` — useful historical candidate replaced by a better baseline. Never delete; keep provenance and replacement pointer.
- `not-current-priority/` — valid candidate but outside current LeadFlow / Quote2Cash / OpsFlow / platform priorities.

## Rule

`FAILED_GATE != DELETED`

Every blocked candidate must keep at minimum:

- source repository / URL;
- original path;
- source commit/tag when available;
- retrieval date;
- SHA-256 or Git blob SHA when available;
- gate reached;
- blocking reasons;
- license/provenance notes;
- capabilities/providers classification;
- remediation/re-entry condition;
- pointer to any local raw copy if redistribution is allowed.

`knowledge-only` is not a trash folder. It is a durable quarry for commercial use cases, acceptance scenarios, architecture patterns and future backlog ideas that are useful even when no executable workflow is present.

A candidate can move from `no-pass-verified/*` back to the earliest valid pipeline stage when evidence changes.
