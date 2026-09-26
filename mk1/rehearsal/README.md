# MK1 Zero-Cost Pilot Rehearsal

Status: **REHEARSAL READY / NOT A REAL CLIENT PILOT**

This package proves as much of the MK1 value loop as can be proven **without inventing a customer, credentials, OAuth approval or paid infrastructure**.

## What it exercises

Two approved baselines are installed for one synthetic tenant:

1. `PAYMENT_REMINDER_AUTOMATION`;
2. `APPOINTMENT_REMINDER_AUTOMATION`.

The rehearsal then:

```text
APPROVED_BASELINE
→ installation bundle
→ tenant config
→ agreed fixture baseline
→ local approved-runtime execution
→ ExecutionRun / ExecutionEvent
→ ProcessRecord
→ SavingsEvent
→ Client Portal rehearsal projection
→ Operator Console rehearsal projection
→ CLIENT_CONFIGURED doctor
→ expected BLOCKED result because no real connector is verified
```

That final block is deliberate. A local fixture must never be enough to claim a real connector or client acceptance.

## Run

```bash
python tools/savings/rehearse_pilot.py --json
```

To preserve the generated rehearsal evidence locally:

```bash
python tools/savings/rehearse_pilot.py \
  --out .local/mk1-rehearsal \
  --json
```

Generated files include:

```text
summary.json
client-portal.json
operator-console.json
results/
installations/
```

## What is still real-world gated

This rehearsal **does not** close MK1. A real paying/funded pilot must still provide:

- tenant identity and agreed users/roles;
- at least one real provider account;
- real connector OAuth/scopes + healthcheck evidence;
- client-measured SavingsBaseline;
- controlled live provider execution;
- client fixture acceptance;
- explicit client approval;
- product surfaces/auth/RLS required by the agreed pilot shape;
- backup/restore and incident drill evidence.

The value of this rehearsal is that those are now the remaining external/product gates rather than uncertainty about whether the approved workflows can execute cheaply.
