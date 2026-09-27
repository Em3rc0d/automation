# Productive Cases

Status: **ACTIVE CASE CATALOG**

This directory documents real or near-real client scenarios used to validate whether the Automation toolbox can be assembled into a production-oriented solution without inventing client-specific business logic from scratch.

A case is not a new capability catalog. It is an **assembly proof** over existing capabilities, adapters and tenant/policy configuration.

## Case goals

Each case SHOULD document:

- business actor and operating context;
- concrete problem and desired outcome;
- source systems and systems of record;
- user interaction channel;
- capability blocks reused from `workflows/SMB-CAPABILITY-LIBRARY.md`;
- connector/adapters required from `workflows/CONNECTOR-MATRIX.md`;
- policy/configuration owned by the client installation;
- missing semantic capabilities or adapter gaps discovered by the case;
- data model required for the assembly;
- safety, approval and exception boundaries;
- acceptance criteria for a productive pilot;
- explicit non-goals for the first release.

## Current cases

| ID | Case | Status |
|---|---|---|
| `CASE-001` | WhatsApp quote assistant for an industrial-paint salesperson using SAP exports | Productive pilot design |
| `CASE-002` | Automotive workshop service intake, media evidence, appointment and pre-work-order orchestration | Productive pilot design |

See [`CASE-001-WHATSAPP-QUOTE-ASSISTANT.md`](./CASE-001-WHATSAPP-QUOTE-ASSISTANT.md).

See [`CASE-002-AUTOMOTIVE-WORKSHOP-SERVICE-INTAKE.md`](./CASE-002-AUTOMOTIVE-WORKSHOP-SERVICE-INTAKE.md).

## Invariant

Cases MUST preserve the toolbox model:

```text
Client need
  -> select capability blocks
  -> bind connectors
  -> configure business rules
  -> run acceptance tests
  -> deploy AutomationInstance
```

If a case uncovers a reusable semantic gap, that gap belongs back in the capability library or connector matrix after review. Client-specific values remain configuration whenever possible.
