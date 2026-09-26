# ADR-0009 — MK1 zero-cost reduced client/operator surface

Status: **ACCEPTED FOR PRE-PILOT / REAL CLIENT MUST AGREE**

Date: 2026-09-26

## Context

The long-term product includes a hosted Operator Console and Client Portal with authentication, tenancy and row-level security. Building and operating that full surface before a paying/funded pilot conflicts with the repository's economic invariant:

> before revenue, fixed production cost should remain approximately S/0.

The repository already proves approved Savings Workflows, installation bundles, live connector candidates, local scheduling, acceptance evidence, backup/restore, incident rehearsal and static rehearsal projections.

The remaining question is whether MK1 must fund a hosted SaaS surface before the first client has validated the service model.

## Decision

MK1 may use a **reduced surface mode** for the first paying/funded pilot when the client explicitly agrees.

In reduced surface mode:

```text
Operator Console
= local operator tooling + auditable operator report

Client Portal
= evidence-backed static client report delivered through an agreed client-controlled channel
```

The reduced surface is allowed only while all of the following are true:

1. the client explicitly agrees that no hosted portal/login is required for the pilot;
2. the report contains only the tenant's own data;
3. generated report files have a SHA-256 evidence manifest;
4. source projections and rendered files remain reproducibly attributable to the installation;
5. credentials/secrets are never embedded in the report;
6. client acceptance remains a separate hashed-evidence gate;
7. the operator retains technical traces/incidents separately from the client-safe view;
8. the report is delivered through a client-approved access-controlled channel (for example, a client-owned Google Drive folder), not a public URL.

## What this avoids

Before the first paying/funded pilot we do not need to provision merely for presentation:

- Vercel hosting;
- Supabase production project;
- dedicated tenant runtime;
- persistent web application server;
- custom identity stack.

## What it does not waive

This ADR does **not** weaken:

- tenant isolation;
- connector scope verification;
- client data confidentiality;
- SavingsBaseline agreement;
- live execution evidence;
- backup/restore;
- incident response;
- explicit client acceptance.

It also does not certify the future hosted portal. If the pilot requires login/auth/RLS, or if recurring revenue justifies the hosted product, the normal MK1 hosted slices remain required.

## Upgrade trigger

Move from reduced surface mode to the hosted portal when at least one applies:

- a paying client contract requires login/self-service;
- more than one tenant must access the platform concurrently;
- recurring revenue justifies persistent shared hosting;
- operator-mediated reporting becomes an operational bottleneck;
- compliance/security requirements make static handoff insufficient.

## Consequence

The first pilot can validate the core commercial promise cheaply:

```text
real process
→ real connector
→ real automation
→ auditable ProcessRecords / incidents / SavingsEvents
→ evidence-backed client report
→ explicit client acceptance
```

without converting infrastructure spend into a prerequisite for revenue.
