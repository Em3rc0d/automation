# ADR-0003 — Shared-table Tenancy with PostgreSQL RLS

Status: Accepted for MK1
Date: 2026-09-11

## Context

We need safe multi-tenancy without multiplying schemas/databases for every small client.

## Decision

Use shared tables with explicit `tenant_id` and PostgreSQL Row Level Security for all customer-visible tenant-owned data.

## Rules

- every tenant-owned row contains `tenant_id`;
- every exposed table has RLS enabled;
- browser clients never receive `service_role`;
- cross-tenant operator actions use trusted backend endpoints;
- privileged actions emit `AuditEvent`;
- CI includes negative cross-tenant tests.

## Rejected alternatives

### Dynamic table/schema per customer
Rejected for MK1: operational complexity, migrations and observability scale poorly for a two-person team.

### Rely only on application filters
Rejected: a missed `WHERE tenant_id = ...` becomes a data-leak incident.

## Future reconsideration

Dedicated DB/schema per tenant may be revisited for contractual, regulatory or scale reasons for specific customers, but is not the default architecture.


## Implementation evidence

The MK1 database contract now has executable evidence under `control-plane/postgres/`.

`.github/workflows/mk1-control-plane-rls.yml` applies the migration to ephemeral PostgreSQL 16 and proves negative cross-tenant access, read-only browser behavior, technical-table separation and composite tenant FK safety.

This is pre-pilot schema/RLS evidence, not a claim that a real Supabase tenant/auth deployment has been accepted.
