# 20 — INSPECTED

Candidates here have been reviewed node-by-node and side-effect-by-side-effect.

## Mandatory inspection checklist

- trigger type and schedule/webhook behavior;
- all nodes and community nodes;
- credentials and OAuth/API scopes;
- HTTP Request destinations;
- Code node contents and package usage;
- embedded prompts/model providers;
- hardcoded IDs, URLs, tenant/customer values;
- embedded secrets/tokens/passwords;
- external side effects: send/update/delete/create/pay/publish;
- destructive actions;
- data persistence and storage locations;
- PII/sensitive-data handling;
- error path;
- retry/backoff behavior;
- idempotency/deduplication behavior;
- human-approval requirements;
- observability/logging behavior;
- unsupported/deprecated provider APIs.

## Inspection output

Manifest `inspection` is complete and findings are explicit. Unknowns are findings, not assumptions.

## Exit gate → HARDENED

There is a written hardening plan mapping every relevant finding to either:
- fix;
- config;
- explicit accepted limitation;
- rejection.
