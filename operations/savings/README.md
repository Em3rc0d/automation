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
  --credential-ref credref:acme-sheets \
  --scope spreadsheets.readonly
```

Record the agreed SavingsBaseline and acceptance checks, then use `promote --to CLIENT_CONFIGURED`. `CLIENT_ACCEPTED` requires additional dry-run, client-fixture and client-approval checks.

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
