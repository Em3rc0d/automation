# Runtime Implementations

Runtime vendors are implementation details behind platform/domain contracts.

## Current profiles

### `savings-p0 / zero-deps-node-v1`

Factory-certified code-first profile used by W-SAVINGS-P0 references.

- Node.js standard library only;
- no paid infrastructure;
- no npm dependencies;
- local/CI execution;
- in-memory adapters/control plane for deterministic evidence;
- executable references: all 12 W-SAVINGS-P0 workflows across sales, receivables, appointments, inbox, quotes, documents, inventory, support and retention.

This profile is **Baseline Factory certified** under `certification/F1-ZERO-DEPS-NODE-V1-CERTIFICATE.md`. Individual Savings Workflows still require HARDENED → TESTED → APPROVED_BASELINE promotion.

See `runtime/savings-p0/RUNTIME-PROFILE.md`.


P0 adapter surface now includes:
- `MemoryTableAdapter`;
- `MemoryMessageAdapter`;
- `MemoryCalendarAdapter`;
- `MemoryStorageAdapter`.

These are deterministic local/factory reference adapters, not production provider bindings.
