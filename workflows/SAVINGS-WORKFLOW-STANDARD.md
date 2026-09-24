# Savings Workflow Standard

Status: **GOVERNANCE AUTHORITY**  
Updated: 2026-09-24

## Definition

A **Savings Workflow** is a customer-facing installable automation whose primary measurable outcome is the reduction of repetitive human active work.

It is not synonymous with:
- an n8n workflow JSON;
- a connector;
- a capability;
- an AI prompt;
- a cron job;
- an approval primitive.

A Savings Workflow can be implemented by one or more AutomationInstances and can compose many provider-neutral capabilities.

## Economic invariant

Before certified recurring revenue:

> fixed production infrastructure target is approximately S/0.

A production cost may be activated only when funded by an accepted paid pilot/customer or explicitly approved as shared platform investment.

Default rules:
- no dedicated always-on runtime per tenant;
- no database/project/server per tenant by default;
- local containers/mocks/fixtures are preferred for development;
- shared multi-tenant runtime is preferred in production;
- provider consumption is client-owned where practical, otherwise metered and contractually separated;
- expensive AI/OCR/compute has quota/metering;
- a customer must not silently subsidize another customer's unusual consumption;
- a new client should normally require configuration and connector binding, not a new deployment.

## Required workflow metadata

```text
key
version
name
domain
business outcome
manual_work_reduced
savings_unit
baseline method
runtime_profile
capabilities
required connector capabilities
configuration schema
trigger contract
input/output contracts
side effects
approval policy
idempotency strategy
retry/backoff
timeout
exception path
tenant/security assumptions
audit events
execution telemetry
variable-cost meter
test fixtures
rollback notes
provenance/license notes
certification state
```

## Runtime profiles

### function
Short event/request-driven execution. No dedicated tenant server.

### scheduled
Periodic execution in a shared scheduler/runtime.

### durable
Execution that may wait/retry for minutes or days. Waiting must not require a dedicated tenant container.

### human_loop
Durable workflow with an explicit human approval/review step.

### heavy
OCR, large batch or compute-heavy processing. Must be metered and may use an optional heavy-job runtime.

## Product hierarchy

```text
Capability
  ↓
Active Work Reducer
  ↓
SavingsWorkflowDefinition
  ↓
PluginInstallation / SolutionInstallation
  ↓
AutomationInstance(s)
  ↓
ExecutionRun / ProcessRecord
  ↓
SavingsEvent
```

## Savings measurement

Each installed Savings Workflow MUST have one primary business unit, such as:
- lead;
- quote;
- invoice;
- appointment;
- order;
- ticket;
- document;
- query;
- work order.

The baseline must measure the end-to-end manual handling time for that unit. Do not sum overlapping micro-step savings.

Required values:

```text
manual_minutes_per_unit
automated_units
exception_minutes
oversight_minutes
loaded_hourly_cost
variable_cost
confidence
```

## Lifecycle

```text
DESIGN_READY
→ SELECTED_FOR_SYNTHESIS
→ HARDENED
→ TESTED
→ APPROVED_BASELINE
→ CLIENT_CONFIGURED
→ CLIENT_ACCEPTED
```

Definitions:
- **DESIGN_READY**: semantic definition exists; no production claim.
- **HARDENED**: implementation package satisfies contracts/guardrails.
- **TESTED**: test evidence exists in certified runtime.
- **APPROVED_BASELINE**: trusted reusable starting implementation.
- **CLIENT_CONFIGURED**: tenant connectors/config/baseline are bound.
- **CLIENT_ACCEPTED**: client-specific acceptance test passed.

## Ready-to-use meaning

The phrase **ready to use** is reserved for:
- APPROVED_BASELINE at repository level; and
- CLIENT_ACCEPTED for a specific tenant installation.

A DESIGN_READY catalog item must never be marketed as production-ready.

## Client installation gate

Even an APPROVED_BASELINE requires:
- tenant configuration;
- connector credentials/scopes;
- client-specific fixtures;
- agreed SavingsBaseline;
- approval policy;
- provider limits/cost policy;
- production readiness and rollback.

## Cost-to-serve guardrail

For each installation store and review:
- recurring platform allocation;
- provider/API variable cost;
- AI/OCR cost;
- storage/egress where relevant;
- support/exception labor;
- customer recurring fee.

Any workflow that creates a dedicated recurring infrastructure cost must justify it against expected recurring revenue and operational value before production activation.
