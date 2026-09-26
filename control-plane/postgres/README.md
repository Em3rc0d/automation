# MK1 PostgreSQL / Supabase Control Plane

Status: **PRE-PILOT DATABASE CONTRACT / NOT PRODUCTION CERTIFIED**

This directory implements the accepted shared-table tenancy decision from
`decisions/ADR-0003-SHARED-TABLE-TENANCY-RLS.md`.

## Migration

`migrations/001_mk1_control_plane.sql` defines the first MK1 control-plane tables:

- tenant + tenant membership;
- Savings Workflow installation;
- connector binding;
- AutomationInstance;
- SavingsBaseline;
- ExecutionRun / ExecutionEvent;
- ProcessRecord;
- Incident;
- ApprovalRequest;
- SavingsEvent;
- AuditEvent.

Every tenant-owned relation has an explicit `tenant_id` and RLS enabled.

## Browser / backend boundary

The `authenticated` role receives read access only to client-relevant tables:

```text
tenant
tenant_membership
savings_workflow_installation
savings_baseline
process_record
incident
approval_request
savings_event
```

Technical/operator tables are intentionally not browser-granted:

```text
connector_binding
automation_instance
execution_run
execution_event
audit_event
```

Writes use trusted backend/operator paths. The browser must never receive `service_role`.

## Cross-tenant relational safety

Composite foreign keys bind child rows to `(id, tenant_id)`, so a privileged writer cannot accidentally attach a Tenant A connector/run/record to a Tenant B installation.

## Local CI evidence

The CI test uses an ephemeral PostgreSQL 16 service. It defines only a tiny `auth.uid()` shim so the same Supabase-oriented policy SQL can run in vanilla PostgreSQL.

Assertions include:
- every required table has RLS enabled;
- Tenant A cannot see Tenant B rows;
- Tenant B cannot see Tenant A rows;
- authenticated browser role cannot mutate customer tables;
- authenticated browser role cannot read technical execution tables;
- cross-tenant foreign-key wiring is rejected;
- backend `service_role` can perform trusted operator reads.

No persistent DB or paid Supabase project is required for this evidence.

## Boundary

Passing this gate proves the **schema/RLS contract in ephemeral PostgreSQL**.

It does not yet prove:
- a live Supabase project;
- auth configuration for a real tenant;
- production backup/RPO/RTO;
- production connection pooling;
- real-user browser/API integration;
- service-role secret management in a deployed backend.

Those remain funded-pilot/product gates.
