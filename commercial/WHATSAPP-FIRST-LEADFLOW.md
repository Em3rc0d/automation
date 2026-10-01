# WhatsApp-first LeadFlow — Commercial Delivery Layer

Status: **P0 COMMERCIAL HYPOTHESIS / PILOT-BOUND**
Updated: 2026-10-01

## Customer promise

> Convert the business WhatsApp into an organized sales process: every relevant inquiry is registered, assigned and followed up instead of depending on memory and copy/paste.

This is deliberately outcome language. The customer is not buying n8n, an agent, a webhook or an architecture diagram.

## Ideal initial fit

Discovery should confirm most of the following:

- WhatsApp is a material inbound channel;
- inquiries are manually copied into Sheets/CRM/notes;
- a person manually assigns or remembers follow-up;
- leads are sometimes forgotten or have unknown status;
- there is a clear process owner;
- monthly volume is enough to measure;
- the business can define what `new`, `contacted`, `quoted`, `won`, `lost` or equivalent means.

## Minimum pilot outcome

```text
WhatsApp inquiry
→ identify/normalize lead
→ dedupe
→ register in agreed system of record
→ assign owner
→ immediate acknowledgement when allowed
→ schedule next action
→ reminder/follow-up
→ result/status
→ measurable ProcessRecord
```

Do not add a CRM, chatbot, mobile app or broad AI agent unless the client process proves it is necessary.

## What the client receives

1. **Live configured process**
   - working against the client's channel and agreed system of record.

2. **Operational surface**
   - initially this may be Sheets/CRM + reduced Client Portal/report.
   - the surface must expose leads, status, owner, pending action and exceptions.

3. **Human-control rules**
   - what runs automatically;
   - what requires review;
   - what is never automated.

4. **One-page operating guide**
   - what the team does;
   - how to mark outcomes;
   - what happens on failure;
   - how support/escalation works.

5. **Ownership/offboarding map**
   - which accounts/data belong to the client;
   - which runtime is operated by EM3RC0D;
   - how export/disable/offboarding works.

6. **Pilot evidence**
   - baseline;
   - processed units;
   - response/follow-up measures where defensible;
   - exceptions/incidents;
   - hours released estimate with confidence;
   - acceptance receipt.

## What the client does not receive as the product

- raw workflow JSON as the primary deliverable;
- repository access by default;
- architecture diagrams as a substitute for a working outcome;
- infrastructure administration burden;
- AI autonomy they did not approve.

Technical artifacts may be part of an enterprise handoff contract, but that is a separate delivery model.

## Example — workshop

### AS-IS

```text
customer writes on WhatsApp
→ employee reads message
→ maybe copies data to Sheet
→ prepares quote
→ manually remembers follow-up
→ status becomes unclear
```

### TO-BE

```text
WhatsApp inquiry
→ lead registered
→ vehicle/service data normalized
→ owner assigned
→ acknowledgement
→ quote task
→ timed follow-up
→ WON / LOST / HUMAN_REQUIRED
```

The operator sees pending work; the business owner sees process results. Neither needs to understand the runtime architecture.

## Monthly managed-service boundary

Recurring support can cover:
- runtime operation;
- webhook health;
- connector/token health;
- failed-run review;
- retry/reconciliation;
- small configuration adjustments;
- incident handling;
- periodic process/savings report.

Recurring pricing is therefore payment for operating a live business process, not rent on a static workflow file.

## Success criteria for first evidence clients

The first client is not evidence of repeatability.

Target sequence:

```text
Client 1 → learn + prove live channel
Client 2 → standardize installation
Client 3 → demonstrate repeatable delivery
```

Only then should the WhatsApp-first offer be promoted beyond pilot-bound status.
