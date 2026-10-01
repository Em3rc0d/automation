# ADR-0010 — WhatsApp-first commercial entrypoint

Status: **ACCEPTED AS MK1 COMMERCIAL/DESIGN DIRECTION**
Date: 2026-10-01

## Context

The platform already models messaging as a provider-neutral capability and lists Meta WhatsApp Cloud API as a target adapter. What was missing was an explicit commercial and deployment decision for the first customer-facing offer.

For the initial PyME motion, WhatsApp is treated as a high-priority customer ingress channel because many target businesses already conduct lead intake, quoting, appointment coordination and follow-up there.

This is a **commercial hypothesis to validate through paid pilots**, not a claim that every PyME or every workflow should use WhatsApp.

## Decision

For the first commercial LeadFlow motion:

1. **WhatsApp-first, not WhatsApp-only.**
   - WhatsApp is the preferred first ingress when discovery confirms it is a material channel.
   - Email, forms, Meta leads and other channels remain valid adapters.

2. **Meta WhatsApp Cloud API is the default first-party provider target.**
   - Third-party providers may be supported later when discovery or existing client infrastructure justifies them.
   - Provider specifics remain behind the platform connector contract.

3. **The customer buys an operating process, not an automation artifact.**
   - We do not deliver a workflow JSON, architecture diagram or repository as the product.
   - We configure, operate, observe and repair the automation.
   - The client sees operational data, pending work, exceptions, results and measurable process evidence.

4. **Production ingress is shared and multi-tenant by default.**
   - A public HTTPS webhook endpoint receives provider events.
   - Tenant/provider identity is resolved before domain execution.
   - No dedicated always-on server per client by default.
   - Persistent production runtime is provisioned only when a paid pilot justifies it.

5. **Client-owned provider identity where practical.**
   - WABA, phone number, business account and downstream systems should remain client-owned.
   - The platform stores only scoped credential references/secrets required to operate the process.

6. **Deterministic workflow + human authority before autonomous AI.**
   - AI may classify/extract free-form messages where useful.
   - Low confidence or unsupported intent routes to human review.
   - High-impact actions never become autonomous merely because the channel is conversational.

7. **Provider rules and costs are external dependencies.**
   - Message/template eligibility, permissions, pricing, rate limits and provider policies are verified at pilot activation time.
   - Variable provider costs are client-owned where practical or explicitly metered/separated.

## Architectural consequence

```text
Customer
  ↓
WhatsApp
  ↓
Meta WhatsApp Cloud API
  ↓ HTTPS webhook
Shared ingress
  ↓
verify / normalize / dedupe
  ↓
tenant + ConnectorAccount resolution
  ↓
AutomationInstance
  ↓
Savings Workflow
  ↓
CRM / Sheets / Calendar / operator
  ↓
outbound messaging
  ↓
ProcessRecord + ExecutionEvent + Incident + SavingsEvent
```

## Economic consequence

Before paid pilot:

```text
fixtures + mocks + provider test assets
→ no persistent production runtime
```

After funded activation:

```text
minimum shared public ingress/runtime
→ tenant-scoped provider binding
→ live healthcheck
→ controlled live execution
→ client acceptance
```

This preserves ADR-0007: WhatsApp does not justify speculative infrastructure before revenue; it does justify the minimum shared runtime once a paid workload requires a public webhook.

## Not decided by this ADR

- hosting vendor;
- queue vendor;
- final WhatsApp pricing pass-through model;
- whether Embedded Signup is needed for the first client;
- whether a third-party BSP/provider should be supported;
- customer-facing portal scope beyond the existing MK1 reduced surface;
- autonomous chatbot product.

Those remain evidence-driven decisions.

## Evidence boundary

Meta's official WhatsApp Business Platform materials document Cloud API as the official API, programmatic send/receive, WABA webhook subscriptions and the need for a publicly reachable HTTPS webhook endpoint.

Provider behavior is external and changeable; implementation must verify current Meta documentation during activation rather than hard-code historical assumptions.
