# Google Workspace Savings Connector Pack

Status: **PRODUCTION CANDIDATE / NOT CLIENT-ACCEPTED**

Purpose: bind the 12 approved zero-cost Savings Workflows to client-owned Google Workspace services without introducing a dedicated n8n/Railway instance per customer.

## Provider roles

- **Google Sheets** — provider-neutral record/table read-write adapter.
- **Gmail** — outbound message adapter and inbound email reader.
- **Google Calendar** — appointment source.
- **Google Drive** — document/attachment storage.

The pack uses Node built-ins and native `fetch`; it adds no npm dependency.

## Credential rule

Bundles store only references:

```text
credref:acme-google
```

At runtime the operator injects the secret outside Git:

```bash
export AUTOMATION_CRED_ACME_GOOGLE='{"clientId":"...","clientSecret":"...","refreshToken":"..."}'
```

An already-issued access token is also accepted for short-lived/manual tests:

```bash
export AUTOMATION_CRED_ACME_GOOGLE='{"accessToken":"..."}'
```

No credential is written into an installation bundle.

## Binding settings

### google_sheets

```json
{
  "spreadsheetId": "...",
  "range": "Invoices!A:Z",
  "idColumn": "id",
  "tenantColumn": null,
  "jsonColumns": ["contact", "followup"]
}
```

### gmail / messaging.send

```json
{
  "userId": "me",
  "from": "billing@example.com",
  "templates": {
    "payment-reminder-v1": {
      "subject": "Recordatorio {{invoiceNumber}}",
      "text": "Hola {{customerName}}, la factura vence {{dueDate}}."
    }
  }
}
```

### google_calendar

```json
{ "calendarId": "primary" }
```

### google_drive

```json
{ "folderId": "..." }
```

## Idempotency

Gmail assigns a deterministic RFC Message-ID derived from the workflow idempotency key and searches Sent Mail before sending. Drive stores an idempotency hash in `appProperties` and searches before upload.

These mechanisms materially reduce duplicate side effects on retry. They do not remove every possible race between concurrent distributed workers; production activation still needs tenant-specific dry-run and concurrency policy.

## Certification boundary

This connector pack is **outside** the already-certified `zero-deps-node-v1` core runtime source boundary. The core stays immutable and provider-neutral.

Before `CLIENT_ACCEPTED`, a tenant must still prove:
- OAuth scopes;
- live connector read/write/send behavior;
- production dry-run;
- client fixture;
- rollback/replay;
- provider quotas and operational limits.

The connector pack being present in Git is not itself a claim that a specific client's Google configuration works.


## Connector verification

`bind` only records a provider binding. It does **not** claim that OAuth/scopes work.

Use:

```bash
node operations/savings/runtime/verify_connectors.mjs --bundle <bundle>
```

The verifier performs a live read-only healthcheck for each provider role and records evidence before setting the binding to `verified`.

Current healthchecks:
- Sheets: spreadsheet metadata;
- Gmail: account profile;
- Calendar: calendar metadata;
- Drive: visible file listing.

A failed healthcheck moves the binding to `degraded`, never to verified.

## Live execution

`operations/savings/runtime/run_live.mjs` binds these adapters to the approved workflow implementations. It requires `CLIENT_CONFIGURED`, evidence-backed connector verification and an explicit `--confirm-live-side-effects YES` flag.

Cross-process idempotency is persisted in local files; connector secrets remain environment-injected.
