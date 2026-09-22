# Security hardening

Hardening is applied in layers. Do not enable a control that silently breaks an already-certified workflow; stage it and re-run negative/positive tests.

## Host

- keep the Linux host patched;
- SSH keys only where practical;
- restrict SSH source ranges;
- run n8n as a non-root container/user;
- expose only 80/443 publicly;
- keep PostgreSQL and n8n port 5678 private;
- enable automatic security updates according to the operator's change policy;
- use disk encryption where the hosting platform supports it.

## TLS and ingress

- HTTPS is mandatory for production editor/webhooks;
- set the canonical public `WEBHOOK_URL`;
- trust only the required reverse-proxy hop count;
- keep provider webhook authentication enabled even behind TLS;
- never use obscurity of the webhook URL as authentication.

## n8n

- use a pinned supported release;
- preserve `N8N_ENCRYPTION_KEY`;
- enable MFA/2FA for operator accounts where available;
- minimize the number of instance owners/admins;
- run `n8n audit` periodically and after material changes;
- remove unused credentials/workflows after a controlled review;
- disable/uninstall community nodes not explicitly approved;
- keep execution retention finite.

Some n8n hardening settings can prevent Code nodes from reading environment variables. CASE-003 currently uses environment-backed configuration in runtime/rendering paths, so such controls must be tested before enabling rather than toggled blindly.

## Workflow security

- HMAC/signature validation happens before business access;
- provider tenant scope comes from persisted binding, not inbound payload;
- replay protection is durable;
- RUC/tax ID identifies a candidate only;
- invoice data is returned only after verified identity + active membership + permission + ownership;
- neutral denial is used where existence itself is sensitive.

## Database

- CASE-003 app roles/functions get only the privileges they need;
- public RPCs require the dedicated integration token where designed;
- never expose a service-role/secret key to browsers;
- review Supabase Security Advisor before production;
- RLS changes require a dedicated gate and regression suite;
- audit tables/events should be append-oriented and access-restricted.

## Egress

Where the platform supports egress controls, allow only required destinations:

```text
Supabase project/API
Kapso/provider APIs
approved mail API/SMTP endpoint
DNS/NTP/platform infrastructure
```

Do not broadly open a blocked SMTP path merely to make a test pass.

## Logs and evidence

Redact or omit:

```text
authorization headers
cookies/session tokens
API keys
credential data
N8N_ENCRYPTION_KEY
raw OTPs
full supplier contacts
full controlled-test destination
unnecessary SAP personal/business data
```

## Backups

- encrypt backup storage;
- keep at least one off-provider copy;
- restrict restore permissions more tightly than read-only monitoring;
- restore drills must verify credential decryption without exposing credential values.

## Supplier verification

A delivery destination override is permitted only in an explicit controlled test scope. It must not mutate the SAP trusted-contact master value. Expire/deactivate test overrides after the proof.
