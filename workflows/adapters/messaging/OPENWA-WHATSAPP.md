# OpenWA WhatsApp Adapter

Artifact class: **ADAPTER**  
Status: **SECONDARY PILOT TARGET / DESIGNED-MINED**  
Provider/runtime: **@open-wa/wa-automate**

## Purpose

Provide a self-hosted WhatsApp adapter option for installations where rapid setup and local control are more important than using the direct Meta Cloud API.

Target capabilities:

- `messaging.receive`
- `messaging.send`
- `messaging.thread.read`
- `messaging.media.download`

This is an adapter boundary. CASE-002 business contracts must not know whether the active provider is Kapso, OpenWA or a later Meta adapter.

## Runtime choice

For the current pilot program, pin **OpenWA v4.76.0** when OpenWA is selected. Current OpenWA documentation marks v5 as alpha and recommends the mature v4 line for production systems unless explicitly validating v5.

Provider references used during design:

- https://openwa.dev/docs/guides/messages/
- https://openwa.dev/docs/guides/media/
- https://docs.openwa.dev/docs/get-started/quick-run
- https://docs.openwa.dev/docs/reference/api/Client/classes/Client
- https://docs.openwa.dev/docs/reference/api/model/config/interfaces/Webhook

## Operational boundary

OpenWA automates a WhatsApp Web session rather than using the direct Cloud API. Therefore the adapter has additional runtime responsibilities:

- browser/session lifecycle;
- QR/link-code authentication lifecycle;
- session persistence;
- reconnect/recovery;
- host account reachability;
- browser/runtime resource monitoring;
- provider/session drift detection.

These are adapter concerns and must not leak into `ServiceRequest`, `Evidence` or appointment semantics.

## Inbound message mapping

The mature message object exposes fields such as:

```text
id
from
to
chatId
body
type
timestamp / t
fromMe
isMedia
caption
senderId / author
```

The adapter MUST normalize these into the same canonical messaging envelope used by Kapso.

Minimum mapping:

```text
provider              = openwa
providerMessageId     = message.id
threadId              = message.chatId || message.from
senderId              = message.senderId || message.author || message.from
direction             = message.fromMe ? outbound : inbound
messageType           = message.type
text                   = message.body || message.caption
occurredAt             = timestamp
idempotencyKey         = openwa:<sessionId>:<message.id>
```

Do not process outbound/self messages as inbound customer requests.

## Webhook authentication

OpenWA supports registering webhooks with request configuration. The pilot adapter must add an operator-managed shared authentication header to webhook deliveries and validate it at ingress. The Easy API itself must also be protected by an API key.

No API key, session data or webhook secret belongs in repository workflow JSON.

## Media

Media messages are identified through message fields such as `isMedia` / `isMMS` and message type. Raw bytes must be obtained using the OpenWA media/decryption surface and passed directly to evidence storage without serializing the binary into execution logs.

The normalized Evidence contract remains identical to the Kapso path.

## Send path

OpenWA exposes message operations such as `sendText`, `sendImage` and `sendFile`. Outbound calls must preserve returned message IDs and use the repository's side-effect/idempotency policy.

## Healthcheck

A productive connector healthcheck must cover:

- Easy API process reachable;
- API-key authentication succeeds;
- WhatsApp session is authenticated/ready;
- send/receive test succeeds;
- reconnect/session restore succeeds;
- media decrypt succeeds;
- webhook delivery succeeds;
- duplicate inbound event is harmless.

## Risk note

OpenWA has a larger operational surface than Kapso because the installation owns the WhatsApp Web/browser session. For CASE-002 the implementation order is therefore:

```text
Kapso first
-> prove provider-neutral contracts
-> OpenWA adapter second
-> compare setup/reliability/operational cost
```

OpenWA remains a valid adapter target; it is not treated as an `APPROVED_BASELINE` until its own runtime evidence passes the adapter test matrix.