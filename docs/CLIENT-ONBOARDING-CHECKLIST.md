# Client Automation Onboarding Checklist

Status: **DELIVERY AUTHORITY**
Updated: 2026-09-11

## Commercial/process

- [ ] signed scope / approved proposal;
- [ ] business owner and operational contact identified;
- [ ] AS-IS/TO-BE process accepted;
- [ ] acceptance criteria accepted;
- [ ] Savings baseline evidence/assumptions agreed;
- [ ] support/escalation channel agreed;
- [ ] explicit non-goals recorded.

## Tenant/access

- [ ] tenant created;
- [ ] client admin invited;
- [ ] roles/memberships verified;
- [ ] cross-tenant isolation smoke test passes;
- [ ] operator access justified/audited.

## Connectors

For each provider:
- [ ] account owner identified;
- [ ] auth method/scopes documented;
- [ ] production vs test account confirmed;
- [ ] connector healthcheck passes;
- [ ] webhook/signature configured when needed;
- [ ] rate limits/costs documented;
- [ ] disconnect/revoke path known;
- [ ] provider external IDs persisted where required.

## Automation instance

- [ ] approved template/version selected or exception documented;
- [ ] tenant configuration validates against schema;
- [ ] no secret/client identifiers embedded in workflow JSON;
- [ ] idempotency key strategy confirmed;
- [ ] retries/timeouts/DLQ confirmed;
- [ ] human approval policy confirmed;
- [ ] ProcessRecord mapping confirmed;
- [ ] BusinessAction side effects enumerated;
- [ ] SavingsEvent mapping confirmed where defensible.

## Acceptance

- [ ] happy-path fixture;
- [ ] malformed/invalid input;
- [ ] duplicate event/input;
- [ ] expired credential;
- [ ] provider 4xx;
- [ ] provider 5xx/timeout;
- [ ] retry does not duplicate side effect;
- [ ] manual review/approval branch;
- [ ] customer-visible output reviewed;
- [ ] incident creation/recovery path;
- [ ] audit trail present.

## Go-live

- [ ] backup/restore posture known;
- [ ] monitoring/alert ownership assigned;
- [ ] production credentials active;
- [ ] staging/test data removed or separated;
- [ ] rollback/pause procedure tested;
- [ ] client knows what the portal metrics mean;
- [ ] first production run supervised;
- [ ] post-launch review date scheduled.
