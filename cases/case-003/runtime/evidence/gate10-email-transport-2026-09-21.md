# CASE-003 Gate 10 email transport evidence — 2026-09-21

## Scope

This checkpoint records the first real Gate-10 transport attempt after a dedicated n8n SMTP credential was created.

No OTP, SMTP secret, full supplier contact, or full test destination is stored in this evidence.

## Live n8n inventory

The Railway n8n runtime now has:

```text
workflows   = 16
credentials = 6
```

The sixth credential is a dedicated n8n credential:

```text
type = smtp
name = CASE003 SMTP OTP
```

Credential secret values were not read or logged.

The additional workflow is an isolated, inactive Gate-10 SMTP test harness. After the transport attempt, the persisted test workflow was explicitly scrubbed back to inert placeholder values.

## Controlled delivery attempt

Gate 10 successfully reached challenge preparation for the controlled test destination:

```text
verification request        created
requested invoice context   preserved
challenge                   created
delivery row                created
SMTP credential binding     resolved
raw OTP persisted           no
SAP trusted contact edited  no
```

The email send itself did not complete. The pending test challenge/request were cancelled/failed and the test override was deactivated. No successful `DELIVERY_SENT` state was recorded.

## Root-cause isolation — Railway SMTP egress

A credential-free network probe was executed from the same Railway service. It did not authenticate or send mail.

Observed:

```text
smtp.gmail.com       465  IPv4  ETIMEDOUT
smtp.gmail.com       587  IPv4  ETIMEDOUT
smtp.gmail.com       465  IPv6  ENETUNREACH
smtp.gmail.com       587  IPv6  ENETUNREACH
smtp.sendgrid.net   2525  IPv4  ETIMEDOUT
smtp-relay.brevo.com 2525 IPv4  ETIMEDOUT
```

This isolates the current failure to outbound SMTP connectivity from the Railway runtime rather than to the CASE-003 challenge core or the configured SMTP credential.

The successful probe deployment was:

```text
2e6e2966-8797-45f7-94fa-7d23eff03c25
```

## Privacy cleanup

After the failed attempts:

```text
test verification request   cancelled
test challenge              cancelled
test delivery               failed
test override               inactive
one-shot SMTP test flag     false
one-shot network probe flag false
persisted test workflow     scrubbed
runtime test destination    cleared
runtime test request ID     cleared
```

The scrub deployment created a post-cleanup n8n backup and preserved 16 workflows / 6 credentials.

## Certification status

```text
real WhatsApp verification-init     PASS
durable VERIFICATION_REQUIRED       PASS
challenge creation                  PASS
invoice resume context              PASS
dedicated SMTP credential           PASS
SMTP credential binding             PASS
Railway SMTP egress                 BLOCKED
real email delivery                 NOT CERTIFIED
code receipt                        PENDING
WhatsApp code verification          PENDING
real identity/membership creation   PENDING
post-auth invoice FOUND             PENDING
```

Gate 10 remains not certified on this Railway runtime.

## Next valid paths

To preserve SMTP, move only the mail-delivery worker to a runtime that permits outbound SMTP while leaving Supabase, Kapso and the main n8n orchestration on Railway.

To keep all execution on Railway, use an HTTPS mail API instead of SMTP. That is an architecture choice and must not be silently substituted for the selected SMTP transport.
