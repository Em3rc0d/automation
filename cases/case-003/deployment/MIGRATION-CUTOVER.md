# Migration and cutover between hosts

Use this when moving n8n from Railway to a VPS/VM, VPS to Railway, or one Linux host to another.

## What must remain stable

```text
CASE-003 business database identity
N8N_ENCRYPTION_KEY
workflow definitions
credential semantics
provider/channel binding
public webhook contract
timezone
pinned n8n version during the move
```

Change one axis at a time. Do not combine a host migration, n8n major upgrade, database backend migration and provider change in one cutover.

## Recommended sequence

### 1. Prepare destination

Bring up destination n8n without provider traffic.

### 2. Freeze source mutations

Choose a maintenance window. Disable or drain workflows that can change state.

### 3. Final source backup

Capture:

- n8n internal DB;
- n8n filesystem/binary data;
- exact encryption key availability;
- CASE-003 DB backup/reference;
- source commit and image tag.

### 4. Restore destination

Restore state and start on the **same n8n version** first.

### 5. Compare

At minimum compare:

```text
workflow count/names/active flags
credential count/names/types
owner/project visibility
provider webhook definitions
CASE-003 DB connectivity
```

Do not compare/log credential payloads.

### 6. Test destination with provider disconnected

Run non-destructive HTTP/database tests.

### 7. Cut DNS/provider webhook

Update only the public route/provider callback.

### 8. Real low-risk proof

Send one controlled message and verify durable provider message ID + CASE-003 decision.

### 9. Keep source recoverable

Do not destroy the source immediately. Keep it isolated/read-only until the rollback window closes.

## SQLite to PostgreSQL n8n migration

Treat this as a separate migration project. Do not assume copying `database.sqlite` into a PostgreSQL deployment migrates n8n state.

Preferred order:

```text
host move on same state backend
-> prove
-> later migrate n8n internal DB backend
-> prove again
```

If using n8n CLI export/import for workflows/credentials, review the pinned-version CLI behavior and encryption implications before executing. Decrypted credential exports are high-sensitivity artifacts.

## Webhook cutover risk

Provider retries can cause the same message to reach source and destination during overlap. CASE-003 replay protection mitigates duplicate business processing only when both runtimes use the same authoritative CASE-003 DB/provider binding.

Avoid active-active cutover with independent business databases.
