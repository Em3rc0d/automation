# Secrets and credentials

## Principle

The repository contains credential **contracts**, never credential **values**.

## Stable n8n credential names

CASE-003 currently relies on stable metadata names/types such as:

```text
Kapso Webhook HMAC            crypto
KAPSO API                     HTTP Header Auth
CASE003 Supabase RPC Token    HTTP Header Auth
CASE003 SMTP OTP              SMTP        # only where SMTP transport is used
```

A greenfield environment may have different generated credential IDs. Renderers/verifiers must bind by an explicitly resolved ID and expected name/type; never hardcode an ID copied from another instance.

## N8N_ENCRYPTION_KEY

This key is part of the data backup.

If you restore the n8n database without the matching encryption key, stored credentials can become unusable.

Rules:

- generate once per environment;
- keep outside Git;
- keep in two controlled recovery locations;
- do not rotate casually;
- include key-availability in every disaster-recovery drill;
- never print it in support logs.

## Secret locations by platform

### Railway

Use Railway service variables/secrets. Do not write secrets into the Dockerfile.

### VPS/VM Docker

Use a root/operator-controlled `.env` with mode 600, or a secret manager that injects environment variables. The sample `.env.example` contains names only.

### Bare metal

Use a root-only `EnvironmentFile` or dedicated secret manager. Avoid command-line arguments because they may be visible in process listings/history.

## Credential export

Avoid decrypted credential exports as a normal backup mechanism.

Primary recovery is:

```text
n8n DB backup
+ same N8N_ENCRYPTION_KEY
+ filesystem/binary-data backup if applicable
```

If a decrypted export is ever required for migration, treat it as a high-sensitivity temporary artifact: encrypted at rest, access logged, deleted after verification, never committed.

## Test destinations and OTPs

- full test email: transient only;
- test destination persisted in CASE-003: SHA-256 + masked form only;
- raw OTP: transient delivery payload only;
- raw OTP in DB: prohibited;
- raw OTP in n8n execution history: disable saving for one-shot delivery proof;
- raw OTP in logs/evidence: prohibited.

## Rotation

When rotating a provider/API secret:

1. create the new provider secret;
2. update the n8n credential;
3. run a non-destructive connectivity test;
4. switch production traffic;
5. verify;
6. revoke old secret;
7. record rotation date/owner, never the value.

For `N8N_ENCRYPTION_KEY`, use n8n's supported rotation procedure rather than replacing the environment value directly.
