# Roles and Permission Boundaries

Status: **MK0 AUTHORITY**
Updated: 2026-09-11

MK1 deliberately keeps the role model small.

## Roles

### PLATFORM_OPERATOR
Internal role for the two service operators.

Can:
- create/manage tenants and memberships;
- register/promote approved automation templates;
- install/configure/pause automation instances;
- configure connector metadata and start reconnect flows;
- inspect technical runs/incidents;
- create/update Savings baselines with audit trail;
- resolve incidents and perform controlled retries;
- view customer-confidential data only when required to operate/support the automation.

Cannot:
- read plaintext secrets through normal UI/API;
- bypass audit logging;
- impersonate a client silently;
- change customer-visible historical savings without creating a new baseline/version.

### CLIENT_ADMIN
Tenant-level business owner/contact.

Can:
- view tenant processes/data, automation health and savings;
- approve/reject `ApprovalRequest` items allowed by policy;
- manage client users for that tenant when enabled;
- request connector reconnect/disconnect;
- view methodology/assumptions behind Savings Engine;
- export permitted tenant data.

Cannot:
- see other tenants;
- edit workflow JSON/runtime internals;
- access provider credentials;
- alter technical incident details not intended for customer display;
- promote templates or change platform-wide configuration.

### CLIENT_VIEWER
Read-only tenant user.

Can view allowed processes, metrics, savings and customer-safe health/status. Cannot approve side effects, manage users/connectors or mutate automation configuration.

### SYSTEM
Non-human actor for runtime events, scheduled jobs and connector/webhook ingestion. Every mutation is tenant-bound and auditable.

## Authorization invariant

```text
authenticated identity
+ server-verified tenant membership
+ role/action policy
+ resource tenant ownership
= authorized operation
```

A client-supplied `tenantId` is only a selector, never authorization.

## RLS expectation

Customer-accessible tables use `tenant_id` and RLS. Service/operator paths that can bypass ordinary RLS are server-only, narrowly scoped and audited. Supabase service-role credentials never reach the browser.

## High-impact actions

Actions such as payment/financial writes, destructive deletes, access revocation, legally meaningful document actions or broad outbound communications require an explicit policy. The default is human approval when consequences are difficult to reverse.
