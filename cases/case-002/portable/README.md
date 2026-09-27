# CASE-002 portable n8n bundle

This directory documents how to reconstruct the currently tested CASE-002 WhatsApp + Gemini Level-2 PoC from repository source on Railway, a VPS, or a local Docker host.

The tested source baseline is:

```text
d1087b8876d09136c1624249a425566041439244
n8n 2.38.7
persistent state: /home/node/.n8n
SQLite: /home/node/.n8n/database.sqlite
```

The canonical n8n JSON files are **not hidden in the live database**. Their repository locations, workflow IDs, roles and bootstrap phase are enumerated in [workflow-index.json](./workflow-index.json). Secrets and decrypted credentials are intentionally excluded.

## What the current composition does

```text
Kapso WhatsApp webhook
        |
        v
KAPSO_MESSAGE_RECEIVE@1.0
  - HMAC validation
  - inbound normalization
  - control-plane handoff / ACK
        |
        v
Gemini semantic interpreter
  - understands customer language
  - no side-effect authority
        |
        v
Deterministic CASE-002 policy/state
  - owns conversation state
  - owns scheduling decisions
  - owns confirmation boundaries
  - produces deterministic fallback + protected facts
        |
        v
Gemini response renderer
  - wording only
  - warm, feminine, natural tone
        |
        v
Deterministic render validator
  - rejects changed/omitted protected facts
  - rejects invented dates/times/plates/prices
  - restores/validates WhatsApp recipient
  - falls back to deterministic text when needed
        |
        v
KAPSO_MESSAGE_SEND@1.0
  - provider send
  - requires providerMessageId
  - no blind retry on ambiguous send
```

Gemini never owns booking authority, availability, mechanical diagnosis, safe-to-drive conclusions, credentials, or provider side effects.

## Files that reconstruct the runtime

The same runtime image is used on Railway and can be used anywhere Docker runs:

```text
cases/case-002/runtime/railway/Dockerfile
cases/case-002/runtime/railway/entrypoint.sh
cases/case-002/runtime/railway/prepare-level2-reply-test.js
cases/case-002/runtime/railway/prepare-level2-appointment-agent.js
cases/case-002/runtime/railway/prepare-level2-gemini-poc.js
cases/case-002/runtime/railway/backup-n8n-state.js
```

The Dockerfile pins n8n to `2.38.7` and bakes the canonical workflow JSON into `/opt/case002`. The persistent n8n state remains outside the image at `/home/node/.n8n`.

## Local or VPS deployment

Copy the environment template:

```bash
cd cases/case-002/portable
cp .env.example .env
```

Set a strong `N8N_ENCRYPTION_KEY`, then start:

```bash
docker compose --env-file .env up -d --build
```

The compose file starts:

```text
n8n           -> CASE-002 runtime image
control-plane -> repository WireMock control-plane stub
```

The control-plane container is **test infrastructure**, not a production implementation.

### First boot

On a new empty n8n volume, keep:

```text
CASE002_IMPORT_WORKFLOWS_ON_STARTUP=true
CASE002_LEVEL2_GEMINI_POC_ON_STARTUP=false
```

The seed phase imports the Receive, Media, Send, acceptance-probe and test control-plane workflows. After the first successful boot, set:

```text
CASE002_IMPORT_WORKFLOWS_ON_STARTUP=false
```

Do not leave seed import enabled permanently because repeated imports can overwrite UI-bound workflow state.

### Credentials

Create these credentials in the target n8n credential store. Do not commit their values:

| Name | n8n type | Purpose |
| --- | --- | --- |
| `KAPSO API` | `httpHeaderAuth` | outbound Kapso API, header `X-API-Key` |
| `CASE002 Gemini API` | `googlePalmApi` | Gemini interpreter + renderer |
| `Kapso Webhook HMAC` | `crypto` | inbound webhook signature |
| `CASE002 Control Plane Internal` | `httpHeaderAuth` | Receive -> control-plane call |

For Gemini, the expected host is:

```text
https://generativelanguage.googleapis.com
```

The repository helper expects the credential name `CASE002 Gemini API`. The send binding helper expects `KAPSO API`.

Bind `Kapso Webhook HMAC` to **Calculate Kapso HMAC** and `CASE002 Control Plane Internal` to **Post Normalized Message** in the Receive workflow before enabling the Gemini one-shot.

### Build the current Gemini composition

After credentials exist and the Receive bindings are present, set:

```text
CASE002_LEVEL2_GEMINI_POC_ON_STARTUP=true
```

Restart/recreate the n8n container once. The entrypoint then, with backup checkpoints between mutations:

```text
bind + publish hardened Kapso send
apply guarded Receive base overlay
import/bind/publish Gemini interpreter
import/bind/publish Gemini response renderer
import/publish conversation agent v2
overlay the active Receive workflow
publish Receive
```

After a successful run, immediately put the flag back to:

```text
CASE002_LEVEL2_GEMINI_POC_ON_STARTUP=false
```

Changing the file is enough; the next restart must see `false`.

For exact historical live parity with the nine-workflow snapshot, also import/publish the legacy `case002Level2AppointmentAgentV1`. It is retained for rollback/reference and is not required by the current Gemini path.

## Railway deployment

Use the repository Dockerfile directly:

```text
cases/case-002/runtime/railway/Dockerfile
```

Mount a persistent volume at:

```text
/home/node/.n8n
```

Set the same environment variables and credentials described above. The current Railway architecture uses an n8n service plus a control-plane service. The Gemini PoC does **not** require an additional AI service.

The runtime bootstrap creates a SQLite/config checkpoint before startup mutations. Repository workflow import is opt-in to protect the persisted n8n state.

## Generic Docker deployment

The same image can run without Compose:

```bash
docker build -f cases/case-002/runtime/railway/Dockerfile -t case002-n8n .
docker run --rm -p 5678:5678 \
  --env-file cases/case-002/portable/.env \
  -v case002_n8n_data:/home/node/.n8n \
  case002-n8n
```

In that mode, `AUTOMATION_CONTROL_PLANE_URL` must point to a reachable control-plane implementation.

## What is portable vs. what is environment-specific

Portable in Git:

- workflow JSON;
- workflow IDs and composition;
- n8n version;
- Docker image recipe;
- overlay/binding helpers;
- contracts and deterministic policy;
- Gemini model name default;
- backup/bootstrap law.

Environment-specific and **not** committed:

- API keys;
- webhook HMAC secret;
- n8n credential IDs;
- public hostname/webhook URL;
- encryption key;
- persistent SQLite state;
- provider-specific message history.

Credential IDs may differ between environments. The runtime helpers bind by credential **name/type**, not by copying live credential IDs.

## Reproduction checks

A reconstructed environment should satisfy all of these before WhatsApp testing:

```text
n8n version = 2.38.7
persistent /home/node/.n8n mounted
Receive published
Send published + KAPSO API bound
Gemini interpreter published + Gemini credential bound
Gemini response renderer published + Gemini credential bound
conversation agent v2 published
Receive overlay reports:
  state-owner=receive
  interpretation-fallback=deterministic
  render-fallback=deterministic
  render-guard=true
  fail-closed-send=true
GET /healthz -> 200
```

Then send `REINICIAR` over the configured WhatsApp sandbox and verify that a provider message ID is returned on outbound send.

## Current limitations

This bundle reproduces the **Level-2 PoC**, not a fully production-certified workshop scheduler. The current calendar authority is still the internal CASE-002 sandbox. Durable concurrent state, race-safe external booking, provider event synchronization, production cancel/reschedule and real calendar authority remain separate production work.
