# ADR-0008 — Savings Workflows as the Customer-facing Installable Unit

Status: Accepted  
Date: 2026-09-24

## Context

The repository already distinguishes capabilities, adapters and configuration. Customers, however, do not buy semantic primitives such as `LEAD_DEDUPE` or `DOCUMENT_CLASSIFY`. They buy the removal of repetitive operational work.

Counting each technical step as a separate product also risks double-counting savings.

## Decision

Introduce **Savings Workflow** as the customer-facing installable unit.

A Savings Workflow:
- represents one coherent repetitive business unit;
- reduces human active work;
- has one primary Savings Engine unit;
- is assembled from existing capabilities/reducers/adapters;
- is installed/configured per tenant;
- may execute through one or more AutomationInstances;
- is measured end-to-end, not by summing overlapping micro-actions.

Examples:
- Payment Reminder;
- Appointment Booking;
- Quote Preparation;
- Supplier Invoice Status Self-service;
- Invoice Intake and Validation;
- Post-class Material Delivery;
- Vehicle Status Self-service.

## Product hierarchy

```text
CAPABILITY
   ↓
ACTIVE WORK REDUCER
   ↓
SAVINGS WORKFLOW
   ↓
PLUGIN / SOLUTION INSTALLATION
   ↓
AUTOMATION INSTANCE(S)
   ↓
EXECUTION / PROCESS / SAVINGS EVENTS
```

## Savings rule

If a quote manually requires:
- reading request;
- looking up product;
- calculating;
- generating document;
- sending;

the baseline is the end-to-end manual minutes **per quote**.

Do not claim each internal reducer as independent savings.

## Catalog vs certification

The Savings Workflow Catalog is intentionally broad and may contain hundreds of DESIGN_READY items.

That does not change the toolbox North Star:
- capability count is not the goal;
- certified implementation remains selective;
- DESIGN_READY does not mean TESTED;
- APPROVED_BASELINE remains the repository-level “ready to use” gate.

## Installation

A tenant installation binds:
- workflow definition/version;
- configuration;
- connector accounts;
- approval policy;
- SavingsBaseline;
- runtime profile;
- provider quotas/cost rules.

## UI projection

Operator Console sees technical composition, health, runs, incidents, connectors and cost.

Client Portal sees:
- workflow outcome;
- units processed;
- exceptions/attention;
- hours released;
- estimated operating value;
- methodology/confidence.

Both views are projections of the same tenant/process/execution/savings records.
