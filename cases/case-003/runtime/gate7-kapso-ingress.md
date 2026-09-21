# CASE-003 Gate 7 — signed Kapso provider ingress

Gate 7 moves CASE-003 from a provider-neutral HTTP harness to a Kapso-shaped WhatsApp receive adapter while keeping business semantics provider-neutral and outbound messaging disabled.

## Certified path

```text
Kapso-shaped webhook
  -> raw-body HMAC-SHA256 verification
  -> event/version/idempotency header validation
  -> provider payload normalization
  -> persisted provider/channel -> tenant binding
  -> Gate-6 channel identity + replay protection
  -> Gate-5 membership + invoice.read + ownership
  -> ACTIVE canonical SAP snapshot
  -> safe HTTP acknowledgement
```

The provider payload never supplies an authoritative `tenant_id`. Tenant scope is derived from `case003.channel_connector_binding` using the trusted pair `provider + provider_channel_key`.

## Inbound contract

The Gate-7 Kapso adapter expects:

```text
POST /webhook/case003/adapters/kapso/whatsapp/messages

X-Webhook-Event: whatsapp.message.received
X-Webhook-Payload-Version: v2
X-Idempotency-Key: <provider event id>
X-Webhook-Signature: <HMAC-SHA256 over raw body>
```

The adapter rejects invalid signatures with HTTP 401 before canonical data access.

## Tenant binding

`case003.channel_connector_binding` maps an externally known provider channel to platform tenant scope:

```text
provider=kapso
provider_channel_key=<WhatsApp phone-number id>
  -> tenant_id
  -> channel=whatsapp
```

No provider-controlled tenant value is accepted.

An unknown or inactive binding returns:

```text
CONNECTOR_NOT_BOUND
channel_delivery=disabled
```

## Provider normalization

The n8n adapter extracts only the provider-neutral fields required by the domain path:

```text
provider
providerPhoneNumberId
providerEventId
providerMessageId
senderId
text
invoice_reference
claimed_tax_id
trace_id
messageType
```

The raw provider payload does not enter the canonical invoice model.

## Replay and identity

After connector binding, the adapter delegates to the Gate-6 core. The durable replay key remains:

```text
tenant_id + channel + provider_message_id
```

A known verified channel subject follows the Gate-5 authorization path. An unknown subject returns `AUTH_REQUIRED`; a RUC remains identification only and does not create a verified identity automatically.

## Database artifacts

Portable PostgreSQL core:

- `../build/gate7-provider-ingress-core.sql`
- `case003.channel_connector_binding`
- `case003.process_provider_channel_message(...)`

Supabase/PostgREST adapter:

- `../build/gate7-provider-ingress-rpc.sql`
- `public.case003_provider_channel_message_json(...)`

Combined Supabase convenience migration:

- `../build/gate7-provider-ingress.sql`

Synthetic provider fixture:

- `gate7-synthetic-kapso-fixture.sql`

## n8n artifacts

Supabase template:

- `n8n/case003-kapso-ingress-gate7.template.json`

Direct PostgreSQL template:

- `n8n/case003-kapso-ingress-gate7-postgres.template.json`

Workflow identity:

```text
id   = case003KapsoIngressGate7V1
name = CASE-003 Kapso Ingress Gate 7
path = POST /webhook/case003/adapters/kapso/whatsapp/messages
```

The workflow contains no outbound WhatsApp/Kapso send node.

## Credential boundary

Gate 7 needs two server-side bindings in the Supabase adapter:

```text
Crypto / HMAC credential
  -> Kapso webhook secret

CASE003 Supabase RPC Token
  -> x-case003-token
```

The certified Railway installation reused the already-bound live Kapso HMAC credential from `kapsoMessageReceiveV1` and the existing `case003RpcAuthV1` credential. Neither credential payload was edited.

Portable deployments use:

```text
CASE003_KAPSO_HMAC_CREDENTIAL_ID
CASE003_KAPSO_HMAC_CREDENTIAL_NAME
```

A fresh local-only certification may instead supply `CASE003_KAPSO_WEBHOOK_SECRET` to the HTTP proof client.

## Linux/VPS — Supabase adapter

Apply schemas in order through Gate 7, then configure n8n:

```bash
docker compose stop n8n
docker compose run --rm --entrypoint sh n8n /opt/case003/scripts/configure-gate7.sh
docker compose run --rm --entrypoint sh n8n /opt/case003/scripts/test-gate7-http.sh
docker compose up -d n8n
```

## Linux/VPS — direct PostgreSQL

Use only the Gate-7 core, not the Supabase RPC wrapper:

```bash
docker compose stop n8n
docker compose run --rm --entrypoint sh n8n /opt/case003/scripts/configure-gate7-postgres.sh
docker compose run --rm --entrypoint sh n8n /opt/case003/scripts/test-gate7-http.sh
docker compose up -d n8n
```

The direct workflow calls `case003.process_provider_channel_message(...)` using parameterized PostgreSQL query values and the dedicated `case003PostgresV1` credential.

## Certified decision matrix

The real n8n runtime was exercised with synthetic Kapso-shaped HTTP payloads signed using the existing stored Kapso HMAC credential:

```text
valid signature + bound phone + verified sender + real owned invoice
 -> FOUND

same provider_message_id replay
 -> DUPLICATE

valid signature + bound phone + unknown sender
 -> AUTH_REQUIRED

valid signature + unknown provider phone-number binding
 -> CONNECTOR_NOT_BOUND

invalid signature
 -> HTTP 401 KAPSO_WEBHOOK_REJECTED
```

The workflow was returned to inactive after the proof and the verifier confirmed all existing workflows and credential payload hashes were unchanged.

## Certification boundary

Gate 7 certifies the signed Kapso adapter path inside the real existing n8n runtime, including reuse of the real stored HMAC credential, connector-to-tenant binding, replay protection and downstream authorization.

It does **not** prove that Kapso Cloud itself delivered the certification request, because the proof request was synthetic and generated locally with the valid stored HMAC secret. It also does not certify outbound WhatsApp delivery. A later gate can register or route a dedicated real provider webhook and prove an actual WhatsApp-originated event without changing CASE-002's live receive path.
