# Savings Workflow Installation Kit

Status: **OPERATOR TOOLING / ZERO-PAID-INFRA DEFAULT**

This layer bridges:

```text
APPROVED_BASELINE
→ local installation bundle
→ connector references + tenant config + agreed baseline
→ CLIENT_CONFIGURED
→ client fixture / dry-run / approval
→ CLIENT_ACCEPTED
```

It does not provision Railway, n8n, Supabase projects or any dedicated tenant server.

## Operator commands

```bash
python tools/savings/install_approved.py list

python tools/savings/install_approved.py scaffold \
  --workflow PAYMENT_REMINDER_AUTOMATION \
  --tenant acme-demo

python tools/savings/install_approved.py doctor \
  --bundle .local/installations/acme-demo/PAYMENT_REMINDER_AUTOMATION@0.1
```

Bind provider accounts by **credential reference only**:

```bash
python tools/savings/install_approved.py bind \
  --bundle <bundle> \
  --capability records.accounts_receivable.read \
  --provider google_sheets \
  --credential-ref credref:acme-google \
  --scope spreadsheets.readonly \
  --setting spreadsheetId=1AbCdEf... \
  --setting 'range=Invoices!A:Z'
```

Binding a connector now creates state **BOUND**, not VERIFIED. Live verification is a separate evidence gate:

```bash
node operations/savings/runtime/verify_connectors.mjs \
  --bundle <bundle>
```

Only successful provider healthchecks move the bindings to `verified` and write `evidence/connector-verification.json`.

Record the agreed SavingsBaseline and acceptance checks, then use `promote --to CLIENT_CONFIGURED`. `CLIENT_ACCEPTED` requires additional production execution/dry-run, client-fixture and client-approval checks.

## Secret rule

Installation bundles may contain identifiers such as `credref:acme-gmail`; they must never contain access tokens, API keys, passwords or private keys.

Local bundles live under `.local/` by default and are git-ignored.

## Connector requirements

`connector-requirements.json` maps each of the 12 approved baselines to provider-neutral adapter roles. The client chooses the actual provider during configuration.

## Economics

The installer never assumes dedicated infrastructure. Provider costs remain `CLIENT_OWNED_OR_METERED` unless a client contract explicitly changes that policy.


## Local execution before provider spend

After scaffolding a bundle, execute the **same approved workflow code** with a client-like fixture and in-memory adapters:

```bash
node operations/savings/runtime/run_bundle.mjs \
  --bundle .local/installations/acme-demo/PAYMENT_REMINDER_AUTOMATION@0.1 \
  --fixture operations/savings/runtime/examples/payment-reminder.fixture.json \
  --out .local/payment-reminder-dry-run.json
```

The evidence is explicitly `LOCAL_SIMULATION` / `productionEvidence=false`. It is useful for discovery, baseline validation and client-fixture testing, but cannot be used to fake `productionDryRunPassed`.


## Google Workspace production-candidate pack

`connectors/savings/google-workspace/` now provides zero-npm provider adapters for the connector roles required by all 12 approved workflows:

- Sheets → record sources/stores;
- Gmail → outbound email + inbound email;
- Calendar → appointment source;
- Drive → document/attachment storage.

The pack is **not** automatically client-accepted. Bundles contain only `credref:` references and non-secret settings; OAuth material is injected at runtime outside Git. Live scope verification and production dry-run remain mandatory.


## Live provider execution

A `CLIENT_CONFIGURED` installation can execute against verified Google Workspace connectors through:

```bash
node operations/savings/runtime/run_live.mjs \
  --bundle <bundle> \
  --as-of 2026-09-25T12:00:00Z \
  --confirm-live-side-effects YES
```

For event-driven workflows, pass `--event event.json`; Gmail-based email workflows can use `--source-id <gmail-message-id>`.

The live runner uses a file-backed idempotency store and append-only control-plane audit under the local bundle. This keeps retry protection across separate process invocations without adding a database.

The runner writes `LIVE_PROVIDER_EXECUTION` evidence but **does not set `productionDryRunPassed` automatically**. Human review remains required before client acceptance.
