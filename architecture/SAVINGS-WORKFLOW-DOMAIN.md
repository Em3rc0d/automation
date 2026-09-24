# Savings Workflow Domain Model

Status: **DESIGN AUTHORITY**  
Updated: 2026-09-24

## Purpose

Separate what the customer buys from how the automation is technically executed.

The customer buys an operational outcome:

> reduce repetitive human active work for a measurable business unit.

The operator manages technical composition, connectors, executions, incidents and runtime.

## Core hierarchy

```text
Tenant / Customer
  |
  +-- PluginInstallation / SavingsWorkflowInstallation
        |
        +-- SavingsWorkflowDefinition
        +-- Configuration
        +-- Connector bindings
        +-- Approval policy
        +-- Runtime profile
        +-- SavingsBaseline
        |
        +-- AutomationInstance 1..N
              |
              +-- ExecutionRun
              +-- ExecutionEvent
              +-- ProcessRecord
              +-- Incident
              +-- ApprovalRequest
              +-- SavingsEvent
```

A single customer-facing workflow may require multiple technical executions. Technical workflow count must not leak into customer pricing/value claims.

## SavingsWorkflowDefinition

Conceptual fields:

```text
id
key
version
name
domain
manual_work_reduced
savings_unit
runtime_profile
capability_keys[]
status
config_schema
created_at
```

Definition state follows:

```text
DESIGN_READY
→ SELECTED_FOR_SYNTHESIS
→ HARDENED
→ TESTED
→ APPROVED_BASELINE
```

## PluginInstallation

Represents:

> Savings Workflow X version Y is installed for tenant Z with these connectors, policy and baseline.

Conceptual fields:

```text
id
tenant_id
savings_workflow_definition_id
status
config
runtime_profile
connector_bindings
approval_policy
installed_at
activated_at
paused_at
```

Do not store provider secrets in `config`; use credential/secret references.

## Relation to AutomationInstance

`AutomationInstance` remains the technical execution binding.

Example:

```text
PluginInstallation:
  Supplier Invoice Status Self-service

AutomationInstances:
  inbound-message-handler
  supplier-verification
  status-query-worker
  outbound-response
```

Customer sees one installed workflow. Operator sees all technical components.

## Operator Console projection

Operator view may expose:
- tenant;
- installed Savings Workflow;
- technical AutomationInstances;
- connector health;
- runtime profile/engine;
- execution runs;
- retries;
- incidents;
- approvals;
- variable provider cost;
- trace IDs;
- version/configuration;
- rollback/replay controls.

## Client Portal projection

Client view should expose:
- workflow name/outcome;
- operational state;
- units processed;
- recent business activity;
- exceptions requiring attention;
- hours released;
- estimated capacity value;
- automation/provider variable cost where contractually relevant;
- net operating value;
- SavingsBaseline method/confidence.

Do not expose n8n node IDs, internal prompts, tokens, stack traces or engine-specific details.

## Savings mapping

One PluginInstallation normally owns one active SavingsBaseline version.

```text
manual_minutes_per_unit
× automated_units
- exception_minutes
- oversight_minutes
= net_minutes_released
```

If several AutomationInstances collaborate on one customer-facing workflow, their events roll up to the same installation/unit without double-counting the manual baseline.

## Economic metadata

Every installation should eventually track:

```text
provider_variable_cost
compute_variable_cost
ai_ocr_variable_cost
support_exception_minutes
recurring_fee
```

This enables operator-side cost-to-serve without confusing it with customer-side Savings Engine value.

## Tenancy

All installation/process/execution/savings rows carry `tenant_id` and remain protected by RLS where customer-visible.

Cross-tenant operator actions use privileged audited server-side paths.

## Runtime rule

Installing a Savings Workflow MUST NOT imply provisioning a dedicated server.

Default:

```text
installation
→ config + connector binding
→ shared runtime execution
```

Dedicated runtime is an explicit exception justified by security, provider constraints, scale or commercial economics.
