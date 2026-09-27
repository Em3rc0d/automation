# Replication checklist

Use this checklist after cloning the repository into a new environment.

- [ ] Build from `cases/case-002/runtime/railway/Dockerfile`.
- [ ] Persist `/home/node/.n8n`.
- [ ] Keep n8n pinned to `2.38.7`.
- [ ] Configure `America/Lima` timezone.
- [ ] First boot with `CASE002_IMPORT_WORKFLOWS_ON_STARTUP=true`.
- [ ] Disable seed import after the first successful import.
- [ ] Create `KAPSO API` (`httpHeaderAuth`, `X-API-Key`).
- [ ] Create `CASE002 Gemini API` (`googlePalmApi`).
- [ ] Create/bind the webhook HMAC credential to **Calculate Kapso HMAC**.
- [ ] Create/bind the internal control-plane credential to **Post Normalized Message**.
- [ ] Verify `AUTOMATION_CONTROL_PLANE_URL` is reachable from n8n.
- [ ] Take a backup checkpoint before composition mutation.
- [ ] Run one startup with `CASE002_LEVEL2_GEMINI_POC_ON_STARTUP=true`.
- [ ] Return `CASE002_LEVEL2_GEMINI_POC_ON_STARTUP=false`.
- [ ] Confirm interpreter, renderer, conversation agent, Receive and Send are published.
- [ ] Confirm Receive overlay guard log passes.
- [ ] Confirm `/healthz` returns 200.
- [ ] Test `REINICIAR` through WhatsApp.
- [ ] Confirm outbound status `accepted_by_provider` and provider message ID.
- [ ] Never copy decrypted credentials or a live `.env` into Git.
