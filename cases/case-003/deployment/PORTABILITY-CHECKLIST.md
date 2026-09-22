# Portability checklist

Use this checklist when rebuilding CASE-003 on any new host/provider.

## Host and source

- [ ] Linux/Docker host available.
- [ ] Repository cloned.
- [ ] Exact branch/commit recorded.
- [ ] n8n image pinned; not `latest`.
- [ ] UTC clock/NTP healthy.
- [ ] `America/Lima` configured for application timezone.

## Network

- [ ] DNS configured.
- [ ] HTTPS certificate valid.
- [ ] n8n public URL stable.
- [ ] Webhook URL matches public route.
- [ ] Direct DB ports not public.
- [ ] Outbound HTTPS works.
- [ ] SMTP reachability tested if SMTP is selected.
- [ ] Provider can reach the webhook.

## Persistence

- [ ] n8n internal DB selected.
- [ ] n8n DB is separate from CASE-003 business DB.
- [ ] Filesystem/binary data persistence defined.
- [ ] Backup location is outside the runtime service.
- [ ] Restore procedure tested.

## Secrets

- [ ] `N8N_ENCRYPTION_KEY` restored/generated and escrowed.
- [ ] CASE003 RPC token stored only in secret/credential store.
- [ ] Kapso API credential configured.
- [ ] Kapso HMAC credential configured.
- [ ] Mail credential/API key configured if Gate 10 enabled.
- [ ] No secret exists in Git, screenshots or evidence.
- [ ] Test-only variables removed after test.

## Database

- [ ] CASE-003 schema/migrations applied in manifest order.
- [ ] Active SAP snapshot loaded/certified.
- [ ] Provider/channel binding present.
- [ ] Security advisor reviewed for Supabase.
- [ ] RLS posture explicitly known; no accidental partial hardening.

## n8n

- [ ] Owner/admin created.
- [ ] Credential names/types match contract.
- [ ] Workflows rendered/imported after credentials exist.
- [ ] Import does not mutate unrelated workflows.
- [ ] Active/inactive status matches manifest/gate.
- [ ] `n8n audit` reviewed.

## CASE-003 smoke

- [ ] Invalid/unsigned provider request rejected.
- [ ] Duplicate provider message does not duplicate business action.
- [ ] RUC alone never authenticates.
- [ ] Unknown identity cannot read invoice data.
- [ ] Known verified identity + membership + `invoice.read` can query owned invoice.
- [ ] Cross-supplier/non-owned invoice returns neutral denial.
- [ ] Gate-10 delivery only reports sent after durable provider success.
- [ ] OTP verification creates identity/membership only after valid proof.
- [ ] Original invoice reference resumes after verification.

## Go-live

- [ ] Backup created immediately before cutover.
- [ ] Provider webhook endpoint changed/armed.
- [ ] One real low-risk message observed.
- [ ] Durable DB event matches provider message.
- [ ] No unexpected CASE-002 regression if sharing provider infrastructure.
- [ ] Deployment evidence committed.
- [ ] Rollback trigger/operator identified.

If any unchecked item affects security, persistence, provider ingress or restore, the environment is not production-certified.
