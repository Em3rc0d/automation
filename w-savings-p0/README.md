# W-SAVINGS-P0 — Zero-cost Executable Savings Workflows

Status: **IN PROGRESS**  
Started: 2026-09-24

## Purpose

Convert a small high-value subset of the 233 DESIGN_READY Savings Workflow skeletons into real, locally executable reference implementations **without creating pre-revenue infrastructure spend**.

## Wave target

```text
12 selected workflows
+ 1 shared zero-dependency runtime kit
+ 3 provider-neutral local adapters
+ reproducible local demos
+ execution/process/incident/savings telemetry
```

The first three reference implementations are `PAYMENT_REMINDER_AUTOMATION`, `APPOINTMENT_REMINDER_AUTOMATION` and `LEAD_FOLLOWUP_AUTOMATION`, all on the same shared runtime.

## Economic invariant

- no paid cloud dependency for development or CI;
- no dedicated tenant server;
- no live provider credential required for reference evidence;
- Node standard library only for the P0 runtime;
- provider/API variable cost is represented in metrics even when the local adapter cost is simulated;
- real provider binding waits for a paid/funded pilot.

## Selected workflows

Source: `SELECTED-WORKFLOWS.json`.

1. `PAYMENT_REMINDER_AUTOMATION` — reference implemented.
2. `LEAD_INTAKE_AUTOMATION`
3. `LEAD_FOLLOWUP_AUTOMATION` — reference implemented
4. `UNANSWERED_MESSAGE_WATCHDOG_AUTOMATION`
5. `APPOINTMENT_REMINDER_AUTOMATION` — reference implemented
6. `QUOTE_FOLLOWUP_AUTOMATION`
7. `EMAIL_CLASSIFY_ROUTE_AUTOMATION`
8. `EMAIL_ATTACHMENT_EXTRACT_AUTOMATION`
9. `DOCUMENT_ARCHIVE_AUTOMATION`
10. `LOW_STOCK_ALERT_AUTOMATION`
11. `SUPPORT_INTAKE_AUTOMATION`
12. `RENEWAL_REMINDER_AUTOMATION`

## Shared runtime kit

`runtime/savings-p0/` provides execution wrapper, tenant-scoped idempotency, bounded retry semantics, ProcessRecord, ExecutionRun/Event, Incident, SavingsEvent, savings rollup, table/message/calendar adapters, built-in Node tests and a reproducible Payment Reminder demo.

## Reuse proof

The same `SavingsRuntime`, `MemoryIdempotencyStore`, `MemoryControlPlane`, `MemoryMessageAdapter` and Savings Engine are now reused across three different business families:

```text
accounts receivable  → Payment Reminder
appointments         → Appointment Reminder
sales                → Lead Follow-up
```

Appointment Reminder additionally reuses the calendar adapter. Lead Follow-up additionally reuses the table adapter and persists sequence progress instead of keeping an always-on waiting process.

This is the intended plugin model: new business workflow logic, **not new infrastructure**.

## Payment Reminder reference flow

```text
invoice table
→ scan tenant invoices
→ exclude paid/cancelled
→ calculate due-date offset
→ match configured reminder offsets
→ require contact
→ send via idempotent message adapter
→ ProcessRecord
→ SavingsEvent
→ ExecutionEvent
```

Missing contact becomes attention/exception time rather than a false automated unit. Transient provider errors retry. Permanent failures create incidents. Duplicate scheduler runs do not resend or double-count savings.

## Wave gates

`REFERENCE_IMPLEMENTED` means executable code and CI evidence exist, but it is **not** the canonical repository `TESTED` or `APPROVED_BASELINE` gate.

To close W-SAVINGS-P0:

- [x] select 12 workflows;
- [x] create zero-dependency runtime kit;
- [x] create table/message/calendar local adapters;
- [x] implement Payment Reminder end-to-end;
- [x] implement Appointment Reminder on the same runtime;
- [x] implement Lead Follow-up durable sequence on the same runtime;
- [x] add duplicate/retry/failure/savings tests;
- [x] add local demo with deterministic output;
- [ ] implement remaining 9 selected workflows;
- [ ] certify a non-n8n runtime profile in Baseline Factory;
- [ ] promote selected workflows through HARDENED → TESTED → APPROVED_BASELINE;
- [ ] bind real providers only when a paid/funded pilot requires them.
