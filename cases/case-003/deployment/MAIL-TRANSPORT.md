# Mail transport

Gate 10 is intentionally a transport adapter. The verification core does not depend on SMTP, Gmail or a specific vendor.

## Contract

```text
PostgreSQL
  creates challenge
  stores only code hash
       |
       v
n8n/mail worker
  receives raw code transiently
  sends email
       |
       v
mark_verification_delivery
```

## SMTP profile

Use n8n `Send Email` with a dedicated SMTP credential.

Required proof before enabling:

1. network connectivity to the SMTP endpoint;
2. TLS mode/port compatibility;
3. credential test;
4. send to controlled mailbox;
5. `verification_delivery.status = sent`;
6. provider/message identifier when available.

### Railway

SMTP is **not usable in the observed current runtime**. Real probes timed out on Gmail 465/587 and alternate provider port 2525. Do not spend time changing the App Password until network reachability changes.

### VPS/VM

Probe first without credentials. If reachable, SMTP can remain the Gate-10 transport.

## HTTPS mail API profile

Use when the platform permits HTTPS but blocks SMTP.

The architecture becomes:

```text
n8n
-> HTTPS provider API
-> mail provider
```

Requirements remain unchanged:

- no raw OTP in logs;
- no raw OTP in persistent execution data;
- mark delivery success/failure in PostgreSQL;
- keep provider API key in n8n credential/secret store;
- use a verified sender/domain as required by provider;
- preserve destination masking/hash behavior.

Switching from SMTP to HTTPS is an explicit adapter decision. It does not require changing Gate-9 identity logic.

## External SMTP worker profile

If SMTP is mandatory but the n8n host blocks SMTP:

```text
Railway n8n
  -> authenticated HTTPS handoff
external mail worker
  -> SMTP
mail provider
```

The handoff must be:

- authenticated;
- replay-safe;
- short-lived;
- destination/code not logged;
- restricted to Gate-10 delivery;
- able to return a provider delivery ID/status.

The worker must never become the authority for OTP validity; PostgreSQL remains authoritative.

## Fail closed

If delivery cannot be proven, mark delivery failed and cancel/expire the challenge. Never tell WhatsApp that a code was sent unless the durable delivery state says it was sent.
