# Connector Contract v1

Status: **MK0 AUTHORITY**
Updated: 2026-09-11

Business capabilities depend on provider-neutral connector capabilities, not n8n node names.

## Conceptual interface

```ts
interface ConnectorAdapter {
  provider: string
  capabilities(): ConnectorCapability[]
  beginConnect(ctx): Promise<ConnectRedirect | ConnectInstructions>
  completeConnect(ctx, callback): Promise<ConnectorAccount>
  healthCheck(account): Promise<ConnectorHealth>
  disconnect(account): Promise<void>
}
```

Action-specific adapters expose operations such as:

```text
messaging.receive
messaging.send
messaging.media.download
email.receive
email.send
email.draft
crm.contact.search
crm.contact.upsert
crm.opportunity.create
calendar.availability.read
calendar.event.create
storage.file.put
storage.file.get
accounting.document.create
accounting.expense.create
accounting.payment.list
commerce.order.read
inventory.stock.read
inventory.stock.update
support.ticket.create
support.ticket.update
```

## Required request context

Every connector operation receives server-derived:
- `tenantId`;
- `connectorAccountId`;
- `automationInstanceId`/`executionRunId` when applicable;
- `traceId`;
- idempotency key for side effects;
- timeout/cancellation budget.

## Error model

Adapters normalize provider failures into:

```text
AUTH_EXPIRED
AUTH_REVOKED
PERMISSION_DENIED
RATE_LIMITED
TEMPORARY_PROVIDER_FAILURE
INVALID_REQUEST
NOT_FOUND
CONFLICT
DUPLICATE
UNSUPPORTED
UNKNOWN_PROVIDER_FAILURE
```

Each error class declares retryable/non-retryable behavior and whether connector health changes.

## Side-effect receipt

Successful external writes return provider evidence sufficient to dedupe/reconcile:

```ts
{
  providerObjectId?: string,
  providerEventId?: string,
  providerRequestId?: string,
  status: string,
  occurredAt: string
}
```

## Anti-corruption rule

Provider payloads are normalized before entering domain contracts. `ProcessRecord` and `BusinessAction` must not become copies of HubSpot, Gmail, WhatsApp, QuickBooks, Shopify, etc.

## Runtime independence

An adapter may initially be implemented as an n8n subworkflow/node sequence. The contract belongs to our platform so the same capability can later move to a worker/SDK/API implementation without changing the customer automation semantics.
