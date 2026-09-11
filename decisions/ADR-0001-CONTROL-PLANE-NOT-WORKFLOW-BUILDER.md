# ADR-0001 — Build a Control Plane, Not a Workflow Builder

Status: Accepted for MK0/MK1
Date: 2026-09-11

## Context

The business sells managed automation outcomes. Customers do not need to design workflows or enter n8n. Operators need to configure, observe and repair automations; customers need visibility into business data and value.

## Decision

Build two surfaces over one control plane:

- Operator Console
- Client Portal

The control plane owns tenants, instances, process data, executions, incidents, approvals, connector references and savings.

The workflow engine remains an internal implementation detail.

## Consequences

Positive:
- smaller MK1;
- engine can change;
- cleaner customer UX;
- consistent telemetry/savings;
- prevents accidental clone of n8n/Zapier.

Negative:
- requires our own normalized contracts and event ingestion;
- some technical details are duplicated at a higher semantic layer.

## Rejected alternatives

### Customer-facing workflow editor
Rejected: huge scope and low immediate commercial value.

### Everything lives in n8n
Rejected: ties business/domain model to engine internals and makes multi-tenant reporting/value measurement fragile.

## Exit strategy

Not applicable; this is a product-boundary decision. It can be revisited only after customers demonstrably demand self-service workflow authoring.
