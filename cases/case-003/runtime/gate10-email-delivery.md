# Gate 10 — native n8n email delivery

Gate 10 closes the trusted-contact transport boundary after Gate 9 creates a pending verification request/challenge.

## Goal

Prove this real flow without modifying the SAP snapshot trusted-contact data:

```text
real WhatsApp request
  -> Kapso signed ingress
  -> VERIFICATION_REQUIRED
  -> PostgreSQL challenge
  -> n8n native email transport
  -> controlled test mailbox
  -> code returned through WhatsApp
  -> VERIFIED
  -> external identity + supplier membership + invoice.read
  -> resume requested invoice
```

## Transport choice

Selected transport:

```text
n8n Send Email node
credential type = smtp
node type       = n8n-nodes-base.emailSend
node version    = 2.1
```

This keeps the delivery path native to n8n and avoids introducing a CASE-specific external mail SDK. The verification state machine remains in PostgreSQL.

## Security boundary

The production trusted contact remains sourced from the active SAP snapshot.

For controlled real testing, `../build/gate10-test-email-override.sql` supports a short-lived destination override tied to one `verification_request_id`.

The override table persists only:

- verification request ID,
- SHA-256 of the normalized test destination,
- masked destination,
- active flag,
- expiry.

The full test email is supplied only to the guarded RPC at delivery time and is not stored by the override table. The OTP is generated inside PostgreSQL, only its SHA-256 is persisted in `verification_challenge`, and the raw OTP exists only in the internal delivery payload long enough for the mail node to send it.

## Required n8n credential

Create exactly one dedicated SMTP credential in the existing n8n instance:

```text
credential name = CASE003 SMTP OTP
credential type = smtp
```

Do not reuse the Kapso, Supabase, Gemini, or control-plane credentials. SMTP username/password or app-password values belong only in the n8n encrypted credential store and must never be committed to GitHub or pasted into CASE-003 evidence.

## Delivery workflow contract

The Gate-10 n8n workflow must:

1. accept an internal/manual Gate-10 trigger for the pending verification request;
2. call the guarded `case003_prepare_email_verification_test_override_json` RPC during controlled testing, or `case003_prepare_email_verification_json` in production;
3. keep `delivery.destination_email` and `delivery.verification_code` inside the mail branch only;
4. send the code with the native n8n Gmail/SMTP node;
5. call `case003_mark_verification_delivery_json` with success/failure;
6. never write the raw code to logs, static data, repository files, WhatsApp responses, or audit detail;
7. leave CASE-002 and the existing Gate-9 Kapso webhook unchanged.

## Certification steps

A Gate-10 real proof is complete only when all of the following are observed:

```text
email credential configured
challenge created
verification_delivery.status = sent
DELIVERY_SENT event written
test mailbox receives the email
user sends CODIGO <12-hex> by WhatsApp
Gate-9 webhook returns HTTP 200
verification challenge = verified
verification request = approved
external identity = active + verified_at
supplier membership = active
invoice.read = present
original invoice reference is resumed
owned invoice query returns FOUND
```

Until those conditions pass, Gate 10 remains prepared but not certified.

## Current live status — 2026-09-21

The live n8n instance contains 15 workflows and 5 credentials. Credential metadata inspection found no SMTP credential. Therefore no Gate-10 email transport is currently armed.

The earlier Resend prototype was intentionally removed from the canonical runtime. Gmail OAuth2 is also not required for the selected design. The next runtime mutation is only the addition of the dedicated `CASE003 SMTP OTP` credential and the isolated Gate-10 mail workflow.
