# KAPSO_MEDIA_DOWNLOAD@1.0

Stage: **HARDENED ADAPTER CANDIDATE — NOT APPROVED_BASELINE**

Artifact class: **ADAPTER**

## Purpose

Fetch one inbound WhatsApp media object through Kapso, enforce size/download-host rules, verify SHA-256 and return the binary to the caller for evidence storage.

This package implements `messaging.media.download`. It does not store the file, interpret the image or create an `AutomatedObservation`.

## Required input

```text
tenantId
providerPhoneNumberId
providerMessageId
mediaId
traceId
```

Optional:

```text
expectedMediaType
maxBytes
idempotencyKey
```

## Provider sequence

```text
mediaId
-> GET /meta/whatsapp/v24.0/{mediaId}?phone_number_id=...
-> validate metadata / size / download URL host
-> GET short-lived download_url
-> SHA-256 local hash
-> compare with provider sha256 when present
-> return binary + normalized metadata
```

Kapso currently documents the metadata response with fields including `mime_type`, `sha256`, `file_size`, `download_url` and `download_url_expires_at`.

## Credential binding

Bind an HTTP Header Auth credential with:

```text
X-API-Key: <Kapso project API key>
```

No provider API key is stored in this repository.

Optional test/provider override:

```text
KAPSO_META_API_BASE_URL=https://api.kapso.ai/meta/whatsapp/v24.0
```

## Security controls

- maximum size is checked from provider metadata before downloading bytes;
- production `download_url` must use HTTPS and host `api.kapso.ai`;
- short-lived download URLs are not included in the final output;
- downloaded bytes remain binary and are never copied into JSON/log fields;
- local SHA-256 must match Kapso's SHA-256 when the provider supplies one;
- downstream Evidence creation must use the stable adapter `idempotencyKey`.

## Output

JSON metadata:

```text
schemaVersion
tenantId
provider
providerPhoneNumberId
providerMessageId
mediaId
mimeType
sizeBytes
sha256
traceId
idempotencyKey
```

Binary field:

```text
data
```

The next CASE-002 composition is:

```text
KAPSO_MEDIA_DOWNLOAD
-> storage.file.put
-> storage.file.hash / verify
-> Evidence record
-> optional visual assessment
```

## Deliberate limits

- one media object per invocation;
- no object-store persistence;
- no base64 logging;
- no automatic interpretation;
- no media sent back to the customer;
- host allowlist is strict for the production provider endpoint.

## References

- `workflows/adapters/messaging/KAPSO-WHATSAPP.md`
- `cases/case-002/WHATSAPP-ADAPTER-DECISION.md`
- Kapso media metadata docs: https://docs.kapso.ai/api/meta/whatsapp/media/get-media-url
- Kapso media SDK docs: https://docs.kapso.ai/docs/whatsapp/typescript-sdk/media

## Promotion gate

Remain in `30-hardened` until import, provider/mock retrieval, oversize rejection, host validation, hash match/mismatch, retry behavior and binary/log leakage tests all have recorded evidence.
