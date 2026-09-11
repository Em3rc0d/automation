# ADR-0004 — Secrets and OAuth Strategy

Status: **ACCEPTED**
Date: 2026-09-11

## Decision

The control plane stores only connector metadata and opaque `secretReference` values. Secret material must live in a dedicated encrypted secret store or provider-managed credential vault; it must never be persisted in `AutomationInstance.config`, `ProcessRecord`, logs, workflow JSON, fixtures, Git, or customer-visible payloads.

OAuth connectors use Authorization Code flow with PKCE whenever supported. Redirect URIs are exact/pre-registered, refresh tokens are rotated when the provider supports rotation, scopes are least-privilege, state/nonce/PKCE values are transaction-bound, and provider metadata/discovery is preferred over hard-coded endpoints.

## Connector lifecycle

```text
CONNECT
→ authorize
→ persist secretReference
→ healthcheck
→ ACTIVE

ACTIVE
→ refresh/rotate
→ ACTIVE

ACTIVE
→ provider/auth failure
→ DEGRADED/EXPIRED
→ reconnect

DISCONNECT
→ revoke when supported
→ destroy local secret material
→ audit event
```

## Mandatory controls

- tenant-scoped `ConnectorAccount`;
- least-privilege scopes documented per adapter;
- secret values redacted from logs and incidents;
- webhook signing secret separate from API/OAuth credentials;
- reconnect cannot silently broaden scopes;
- privileged secret access is audited;
- expired/revoked credentials become explicit connector state;
- test credentials and production credentials are isolated;
- no client password storage when OAuth/service-account alternatives exist.

## Security authority

OAuth implementation follows RFC 9700 / BCP 240 as the current baseline: https://www.rfc-editor.org/info/rfc9700/

## Consequences

Provider-specific n8n credentials may be used by the runtime, but the platform contract remains provider-neutral and n8n is not the long-term authority for secret ownership. A future runtime migration therefore does not require changing tenant/business contracts.
