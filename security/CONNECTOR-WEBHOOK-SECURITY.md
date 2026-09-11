# Connector and Webhook Security Baseline

Status: **MK0 AUTHORITY**
Updated: 2026-09-11

## Connector rules

Every adapter documents auth mode, scopes, external identifiers, refresh/revocation behavior, rate limits, retry classes, PII categories, healthcheck and sandbox/mock plan.

OAuth follows RFC 9700 / BCP 240: https://www.rfc-editor.org/info/rfc9700/

Minimum controls:
- Authorization Code + PKCE when supported;
- exact registered redirect URIs;
- least privilege;
- per-tenant credential isolation;
- refresh-token rotation when available;
- tokens never logged;
- reconnect does not silently add scopes;
- expired/revoked credentials surface as connector state;
- privileged credential lifecycle produces `AuditEvent`.

## Inbound webhook contract

Before business side effects:
1. HTTPS only in production.
2. Identify provider/tenant without trusting arbitrary payload tenant IDs.
3. Verify provider signature/shared-secret mechanism.
4. Enforce timestamp/replay window where supported.
5. Persist provider event/message ID.
6. Derive deterministic idempotency key.
7. Validate content type, size and schema.
8. Reject unexpected methods/fields when strict schemas exist.
9. Acknowledge quickly; queue slow work when necessary.
10. Never execute URLs, commands or templates received from untrusted payloads.

Standard Webhooks is a useful reference for signatures/replay/SSRF concerns: https://www.standardwebhooks.com/

## Outbound side effects

- use provider idempotency keys where available;
- otherwise persist our own side-effect ledger before/around send;
- classify errors as retryable/non-retryable;
- exponential backoff + bounded attempts;
- no duplicate message/payment/document creation after retries;
- destructive/high-impact actions require explicit policy and usually approval;
- redact customer-safe incident messages from technical details.

## SSRF / URL safety

HTTP-capable workflows must not accept arbitrary private-network destinations from customer/user input. Apply allowlists or URL validation where a connector is meant to call known providers, block link-local/metadata/private-network destinations when externally controlled, and never forward platform credentials to user-selected hosts.

## File/media intake

- enforce MIME/size limits;
- validate extension and content independently;
- malware scanning hook for files retained or redistributed;
- immutable source hash for document provenance;
- OCR/LLM output is untrusted data and schema-validated;
- archive only under tenant-scoped storage paths.
