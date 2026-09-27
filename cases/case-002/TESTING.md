# CASE-002 — Testing Runbook

Status: **READY FOR MOCK/RUNTIME TESTING**

This runbook separates repository/runtime readiness from live provider validation. Passing mock/runtime tests does not certify a productive workshop installation.

## Test levels

### Level 0 — static readiness

No Docker or external credentials required.

```bash
python cases/case-002/tools/validate_readiness.py
python cases/case-002/tools/run_acceptance.py
```

Expected:

```text
CASE-002 READINESS: PASS
CASE-002 ACCEPTANCE: PASS 5/5
```

This proves:

- contracts and fixtures are parseable and complete;
- the five V1 branches satisfy the frozen acceptance expectations;
- the diagnosis-authority boundary is preserved;
- Kapso receive/media/send HARDENED packages are structurally present;
- adapter workflows contain no bound repository credentials;
- outbound Kapso send has no blind automatic provider retry.

### Level 1 — pinned n8n runtime smoke

Requires Docker + Docker Compose. No live Kapso credentials are needed.

```bash
bash cases/case-002/tools/runtime_smoke.sh
```

The script:

1. reruns Level 0;
2. starts the certified factory stack using n8n `2.38.7`;
3. imports `KAPSO_MESSAGE_RECEIVE@1.0`;
4. imports `KAPSO_MEDIA_DOWNLOAD@1.0`;
5. imports `KAPSO_MESSAGE_SEND@1.0`;
6. imports and executes `case002AcceptanceProbeV1`;
7. tears the isolated runtime down.

Expected terminal line:

```text
CASE-002 RUNTIME SMOKE: PASS
```

This proves runtime importability plus the case-level mocked routing matrix. It does not call Kapso, Google Calendar or a workshop ERP.

### Level 2 — controlled Kapso integration test

Requires a Kapso project/test account with a connected WhatsApp number, a webhook secret, API key and a publicly reachable HTTPS test endpoint.

Do not commit credentials. Bind them through the n8n credential store/operator secret mechanism.

Required checks:

1. **Webhook receive**
   - register `whatsapp.message.received`, payload v2, buffering off;
   - point the webhook to the deployed `KAPSO_MESSAGE_RECEIVE@1.0` webhook URL;
   - send one text from a test customer number;
   - verify HMAC succeeds and the normalized envelope reaches the test control plane;
   - replay the same provider event and verify only one logical downstream event is accepted.

2. **Media receive**
   - send one test image;
   - capture `providerMediaId` from the normalized message;
   - invoke `KAPSO_MEDIA_DOWNLOAD@1.0` through the test orchestration;
   - verify MIME/size metadata and SHA-256;
   - verify binary is handed to Evidence storage and not copied into generic execution telemetry.

3. **Outbound send**
   - create a test `BusinessAction`/idempotency key first;
   - invoke `KAPSO_MESSAGE_SEND@1.0` once;
   - persist the returned provider `wamid`;
   - verify `biz_opaque_callback_data` correlates to the BusinessAction;
   - simulate/observe a provider failure and verify the adapter does not blindly retry an ambiguous send.

Kapso's documented test-webhook endpoint can be used to verify delivery setup before a real customer-message test.

### Level 3 — CASE-002 controlled pilot test

Only after Level 2 passes. Use a non-production workshop/test tenant and run all acceptance scenarios end-to-end:

```text
F01 usable leak photo
F02 unusable leak photo
F03 scheduled maintenance
F04 warranty/comeback
F05 roadside/tow escalation
```

For Level 3, replace mock boundaries incrementally:

```text
Kapso real
+ object storage real/test bucket
+ multimodal provider test configuration
+ calendar test calendar
+ Postgres/control-plane test tenant
+ human-review test queue
```

The first pilot is successful only if provider IDs are persisted, duplicate provider events are harmless, no media bytes leak into generic logs, no AI-generated mechanical diagnosis is stored as technician diagnosis, and every terminal path emits safe telemetry.

## Required secrets/config for live integration

Names are deployment references only; values must remain outside Git:

```text
KAPSO_API_KEY
KAPSO_WEBHOOK_SECRET
KAPSO_META_API_BASE_URL=https://api.kapso.ai/meta/whatsapp/v24.0
AUTOMATION_CONTROL_PLANE_URL
internal control-plane auth credential
```

Calendar/storage/AI credentials are required only when their corresponding Level 3 boundary is switched from mock to real.

## Pass/fail boundary

`READY_FOR_TEST` means:

- static readiness is green;
- deterministic case fixtures are executable;
- pinned n8n runtime can import the required adapters and execute the case probe;
- live-provider steps are documented and require only external account/secret binding rather than repository code changes.

It does **not** mean `APPROVED_BASELINE`, `TESTED` provider evidence, or production deployment approval.
