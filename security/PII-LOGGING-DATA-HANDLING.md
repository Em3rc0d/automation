# PII, Logging and Data Handling Policy

Status: **MK0 AUTHORITY**
Updated: 2026-09-11

## Principle

Collect, persist and expose the minimum data required to execute and explain the automation. Observability must not become a shadow copy of customer data.

## Data classes

- **PUBLIC** — safe product metadata/documentation.
- **INTERNAL** — operational metadata without customer secrets.
- **CUSTOMER_CONFIDENTIAL** — business records, documents, messages, identifiers.
- **SENSITIVE_SECRET** — access/refresh tokens, API keys, passwords, signing secrets, private keys.

`SENSITIVE_SECRET` is never written to application logs, analytics, fixtures, Git, `ProcessRecord` or incident customer messages.

## Logging rules

Log identifiers and state transitions, not full payloads by default:

```text
trace_id
execution_run_id
tenant_id
automation_instance_id
provider
operation
status
latency
retry_count
error_code
```

Payload logging requires an explicit debug purpose, redaction and short retention. Email bodies, WhatsApp contents, invoices, resumes, IDs and attachments are not ordinary log fields.

## Redaction

At minimum redact:
- Authorization/Cookie headers;
- OAuth/API tokens and signing secrets;
- passwords/private keys;
- session tokens;
- payment credentials;
- document images/base64;
- unnecessary personal identifiers.

## AI usage

Before sending customer data to an AI provider:
- the capability documents exactly what fields are required;
- data minimization is applied;
- output is treated as untrusted and schema-validated;
- high-impact decisions require deterministic rules and/or human review;
- provider cost and model/version are recorded when material;
- raw prompts/responses are not automatically retained indefinitely.

## Retention/deletion

Each deployment defines retention per data class. Tenant offboarding must revoke connectors and provide a deterministic path to delete or export tenant records according to contract/legal requirements. Backups follow their own expiry schedule so deletion semantics are documented rather than falsely instantaneous.

## Tenant isolation

Tenant context is server-verified and propagated to database, storage, queue/job and observability operations. Client-supplied `tenant_id` is never authorization by itself. Follow OWASP multi-tenant guidance and test cross-tenant negative cases.
