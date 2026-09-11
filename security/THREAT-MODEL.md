# Threat Model and Production Security Baseline

## Assets

- tenant business data;
- OAuth refresh/access tokens;
- API keys;
- n8n encryption key;
- automation configurations;
- customer documents;
- execution payloads/logs;
- approval decisions;
- savings/baseline data;
- operator privileges.

## Primary threats

### Cross-tenant data leakage
Impact: critical.

Controls:
- `tenant_id` on customer-owned rows;
- PostgreSQL RLS;
- automated negative isolation tests;
- no browser `service_role`;
- privileged cross-tenant operations only through audited server endpoints.

### Secret exposure
Impact: critical.

Controls:
- no provider secrets in normal tables;
- store only `secret_reference`;
- encrypted secret store;
- no secrets in workflow JSON exports;
- redact logs;
- rotate/revoke compromised credentials;
- back up n8n encryption key securely.

### OAuth attacks / broken connector lifecycle
Controls:
- server authorization-code flow;
- random one-time `state` bound to user+tenant;
- short expiration;
- minimum scopes;
- offline access only when needed;
- healthchecks;
- explicit reconnect/disconnect flows;
- audit lifecycle events.

### Webhook replay / duplicate side effects
Controls:
- verify provider signature when available;
- timestamp/freshness validation;
- idempotency key;
- unique DB constraint;
- source IDs persisted;
- bounded retries.

### LLM-triggered wrong action
Controls:

```text
model output
→ schema validation
→ business rules
→ authorization policy
→ optional human approval
→ side effect
```

Never let free-form model output directly mutate critical state.

### PII leakage into logs/AI
Controls:
- data minimization;
- purpose-specific fields;
- references to source system instead of copying entire source when possible;
- PII redaction in telemetry;
- retention policy;
- AI receives only required fields;
- customer agreement on subprocessors/data flows.

### Operator compromise
Controls:
- MFA;
- least privilege;
- audit trail;
- no shared credentials;
- restricted n8n admin surface;
- session/security monitoring.

### Automation runaway / cost explosion
Controls:
- per-tenant/provider rate limits;
- execution ceilings;
- AI token/cost metering;
- circuit breaker / pause;
- incident alerts;
- retry budget.

### Data loss
Controls:
- backups;
- **tested restore**, not “backup enabled” only;
- documented RPO/RTO as product matures;
- versioned automation configuration;
- workflow export backup;
- secret recovery procedure.

## Minimum production checklist

```text
[ ] RLS enabled on every customer-exposed table
[ ] automated cross-tenant isolation tests
[ ] service role is server-only
[ ] operator auth/MFA
[ ] OAuth state single-use and expiring
[ ] minimum connector scopes
[ ] encrypted secret storage
[ ] no secrets in Git/workflow exports
[ ] provider webhook verification
[ ] idempotency on every external side effect
[ ] bounded retries
[ ] provider rate limiting
[ ] customer-safe errors separated from technical details
[ ] PII/token log redaction
[ ] audit trail for privileged changes
[ ] audit trail for approvals
[ ] backup configured
[ ] restore test passed
[ ] rollback runbook
[ ] connector reconnect runbook
[ ] incident runbook
[ ] dependency/license audit
[ ] staging/prod separation
[ ] real production data not used as dev fixtures
[ ] retention/export/delete strategy per tenant
```

## n8n-specific controls

- Pin image version/digest; no production `latest`.
- Restrict editor access to operators.
- Public exposure only for required webhooks.
- Back up `N8N_ENCRYPTION_KEY` securely.
- Separate n8n DB from product source-of-truth semantics.
- Treat Community Edition feature gaps explicitly; do not assume enterprise external-secrets/log-streaming features exist.
- Queue mode/Redis only when volume justifies it.

## Peru legal/data context

Starting legal baseline: Ley N.º 29733 and its current regulatory framework, including D.S. N.º 016-2024-JUS as identified in official sources.

This repository is not legal advice. Before production contracts, obtain Peru-specific professional review covering:
- roles/responsibilities in personal data processing;
- purposes/consent or other applicable grounds;
- subprocessors;
- retention;
- data subject requests;
- cross-border/provider transfers;
- incident handling;
- contract termination/data deletion.

High-sensitivity verticals such as health/financial processes require a stronger gate before sale.
