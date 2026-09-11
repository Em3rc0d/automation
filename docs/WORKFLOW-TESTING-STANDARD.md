# Workflow Testing Standard

Status: **QUALITY AUTHORITY**
Updated: 2026-09-11

No workflow reaches `APPROVED_BASELINE` because it merely imports or succeeds once.

## Test layers

### 1. Static inspection
- valid n8n/workflow shape;
- no plaintext secrets;
- no client-specific IDs/emails/channels/folders;
- required connectors declared;
- risky community nodes identified;
- all outbound side effects enumerated;
- URLs/providers reviewed;
- config schema exists.

### 2. Contract tests
- valid input accepted;
- malformed/missing input rejected deterministically;
- outputs match documented schema;
- ProcessRecord mapping valid;
- BusinessAction mapping valid;
- ExecutionEvent emitted;
- customer-safe errors differ from technical evidence.

### 3. Idempotency/replay
- duplicate webhook/event does not duplicate business state;
- retry after timeout does not duplicate external side effect;
- provider callback replay handled;
- restored/restarted worker does not repeat completed action;
- same business entity can legitimately update without being incorrectly dropped as duplicate.

### 4. Provider failure matrix
- authentication expired/revoked;
- permission denied;
- rate limited;
- 4xx invalid payload;
- 404/not found;
- provider conflict/duplicate;
- 5xx;
- timeout/network interruption;
- malformed provider response.

Expected retry/non-retry behavior must be asserted.

### 5. Tenant/security
- another tenant cannot read/update the records;
- tenant selector tampering fails;
- secrets absent from logs/errors;
- webhook auth/signature failure rejected;
- untrusted AI/OCR text cannot control privileged routing without validation;
- file size/MIME limits enforced where applicable.

### 6. Human-in-the-loop
- approval required actions cannot execute before approval;
- rejection stops/records action;
- expired approval is safe;
- repeated approval callback is idempotent;
- approver belongs to correct tenant/role.

### 7. Savings
- only eligible successful units count;
- duplicates/retries do not double count;
- exception/oversight minutes subtract correctly;
- variable provider cost attributed when available;
- capability without defensible monetary model reports operational metrics only.

## Evidence package

Every approved package contains:

```text
evidence/
├── TEST-REPORT.md
├── fixtures/
└── optional machine-readable test output
```

`TEST-REPORT.md` records tested workflow hash/version, environment, connector mocks/sandboxes, cases passed/failed, known limitations and reviewer/date.

## Regression rule

Any change affecting nodes, business rules, connector behavior, prompts/models, side effects, auth scopes or config schema requires a new version/re-test appropriate to the risk. Production incidents create a regression test before closure whenever technically reproducible.
