# Runtime Implementations

Runtime vendors are implementation details behind platform/domain contracts.

## Current profiles

### `savings-p0 / zero-deps-node-v1`

Reference-only profile for W-SAVINGS-P0.

- Node.js standard library only;
- no paid infrastructure;
- no npm dependencies;
- local/CI execution;
- in-memory adapters/control plane for deterministic evidence;
- executable references:
  - `PAYMENT_REMINDER_AUTOMATION`;
  - `APPOINTMENT_REMINDER_AUTOMATION`;
  - `LEAD_FOLLOWUP_AUTOMATION`.

This profile is **not yet Baseline Factory certified**. It exists to prove that Savings Workflows can be productized without making n8n or persistent hosting a per-client prerequisite.

See `runtime/savings-p0/RUNTIME-PROFILE.md`.
