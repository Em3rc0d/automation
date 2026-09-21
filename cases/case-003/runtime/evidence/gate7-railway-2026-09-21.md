# CASE-003 Gate 7 — signed Kapso ingress evidence

Date: 2026-09-21

Scope: certify the Kapso-shaped inbound adapter inside the existing n8n runtime without changing the active CASE-002 receive workflow or any credential payload. The proof uses synthetic Kapso-shaped HTTP requests signed with the existing stored Kapso HMAC secret. It does not claim that Kapso Cloud originated the test request.

## Database core

Gate 7 added the persisted provider binding:

```text
provider=kapso
provider_channel_key=999000111222333
channel=whatsapp
tenant_id=30000000-0000-0000-0000-000000000000
status=active
```

The provider ingress core resolved that binding before entering Gate 6.

Database proof:

```text
bound provider channel + verified synthetic sender + real invoice
 -> FOUND

same provider_message_id
 -> DUPLICATE

bound provider channel + unknown sender
 -> AUTH_REQUIRED

unbound provider channel
 -> CONNECTOR_NOT_BOUND
```

The positive query reached the real Gate-4 snapshot and invoice `01-FM01-0096939`.

## Additive n8n import

Import deployment:

`d66bcf8b-d44f-4037-b297-71ca1ff9265f`

Terminal status: `SUCCESS`.

Pre-import state:

```text
workflows=13
credentials=5
source kapsoMessageReceiveV1 active=1
target case003KapsoIngressGate7V1 absent
```

Pre-import backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T18-42-53-995Z-pre-case003-gate7-import`

SHA-256:

`4f5ff3a277ef785806dfdd3f231d0a7731ad7a984b497b53b8f04f52f8839744`

Deployment renderer result:

```text
source=kapsoMessageReceiveV1
existing HMAC credential reused
existing case003RpcAuthV1 reused
```

The credential IDs were resolved from persisted n8n bindings; credential payloads were not edited.

Post-import verifier:

```text
workflows=14
credentials=5
target=inactive
sourceUnchanged=true
```

Post-import backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T18-42-59-305Z-post-case003-gate7-import`

SHA-256:

`eb575c5341e1dacd53cc9e37e70a160e188cc149006bbcbe205bf2717e8aa8b5`

Imported workflow:

```text
id   = case003KapsoIngressGate7V1
name = CASE-003 Kapso Ingress Gate 7
path = POST /webhook/case003/adapters/kapso/whatsapp/messages
```

## Signed HTTP proof

Certification deployment:

`25b5000a-3094-44af-af5e-702f9369c1e2`

Terminal status: `SUCCESS`.

Pre-test state:

```text
workflows=14
credentials=5
sourceActive=1
targetInactive=true
```

Pre-test backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T18-44-39-382Z-pre-case003-gate7-http-test`

SHA-256:

`712631992a061303deb23f0c643d40564d2b1730d15dacbdbeb493dc8f47c9e7`

The test temporarily activated only `case003KapsoIngressGate7V1`, launched the real n8n HTTP runtime, generated synthetic Kapso-shaped payloads and computed HMAC-SHA256 with the existing encrypted n8n Crypto credential.

Observed result:

```text
signed valid request       -> FOUND
same provider message      -> DUPLICATE
unknown sender             -> AUTH_REQUIRED
unbound provider channel   -> CONNECTOR_NOT_BOUND
invalid HMAC signature     -> HTTP 401
outbound delivery          -> disabled
```

Railway log assertion:

```text
PASS signed=FOUND replay=DUPLICATE unknown=AUTH_REQUIRED
unbound=CONNECTOR_NOT_BOUND invalidSignature=401 outbound=disabled
```

Post-test state verifier:

```text
workflows=14
credentials=5
targetInactive=true
existingState=unchanged
```

Post-test backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T18-44-58-168Z-post-case003-gate7-http-test`

SHA-256:

`588e6a5d3a29e6e1ce786f14d9d8d3e01871cc7efd633df93f497408612200f7`

Persisted database evidence from the HTTP proof includes:

```text
wamid...1 -> FOUND -> 01-FM01-0096939
wamid...2 -> AUTH_REQUIRED -> 01-FM01-0096939
```

Replay was suppressed by the existing durable Gate-6 message key and therefore did not create a second business record.

## Final clean reset

Both one-shot variables were reset to false:

```text
CASE003_GATE7_IMPORT_ON_STARTUP=false
CASE003_GATE7_HTTP_TEST_ON_STARTUP=false
```

Final clean deployment:

`059810af-94c0-4f7e-a234-449f983b1708`

Terminal status: `SUCCESS`.

Clean startup backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T18-46-16-338Z-startup`

SHA-256:

`10952ed3cc6fa8b2452d381559601c12ac05dfbbd02d54cc48514b1a0083c2c8`

Clean startup state:

```text
workflows=14
credentials=5
users=1
workflow seed import skipped
bootstrap complete
```

No Gate-7 mutation/test block ran during the final startup.

## Security and advisor boundary

The Gate-7 public Supabase wrapper is an intentional server-to-server `SECURITY DEFINER` PostgREST surface and therefore appears in the Supabase advisor. It still requires the independent `x-case003-token` before invoking the private provider-ingress core.

The performance advisor reported no Gate-7 unindexed foreign-key finding.

Existing unrelated advisor findings were not changed.

## Certified boundary

Gate 7 certifies:

```text
Kapso-shaped inbound HTTP request
 -> raw-body HMAC-SHA256
 -> event/version/idempotency validation
 -> provider normalization
 -> persisted provider-channel -> tenant binding
 -> Gate-6 replay + identity
 -> Gate-5 permission + ownership
 -> real canonical SAP invoice
 -> safe acknowledgement
 -> outbound disabled
```

The proof reused the real existing Kapso HMAC credential binding but used locally generated synthetic provider requests. It does not yet prove an event delivered by Kapso Cloud / WhatsApp to the CASE-003 endpoint and does not certify outbound WhatsApp delivery.
