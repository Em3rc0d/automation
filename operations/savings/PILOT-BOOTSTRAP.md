# Zero-cost Pilot Bootstrap

Status: **OPERATOR PREFLIGHT / NO CLIENT ACCEPTANCE CLAIM**

Purpose: turn commercial discovery into a reproducible plan over already approved Savings Workflows **before** spending on hosting or asking for provider credentials.

## Golden path

```text
discovery
→ choose APPROVED_BASELINE workflows
→ enter volume + manual-time assumptions
→ choose candidate providers
→ pilot preflight
→ local installation bundles
→ local fixture evidence
→ real connector binding/verification only when a pilot is funded
```

## Plan

```bash
python tools/savings/pilot_bootstrap.py plan \
  --spec operations/savings/examples/pilot-preflight.example.json
```

The plan reports:
- only workflows already at `APPROVED_BASELINE`;
- provider-neutral connector roles and candidate provider support;
- discovery-level capacity estimate;
- remaining blockers to `CLIENT_CONFIGURED`;
- remaining blockers to `CLIENT_ACCEPTED`;
- zero-paid-infrastructure default.

## Scaffold local bundles

```bash
python tools/savings/pilot_bootstrap.py scaffold \
  --spec operations/savings/examples/pilot-preflight.example.json \
  --out-root .local/installations
```

This calls the existing approved installer for each workflow and pre-fills baseline fields as **DRAFT** only.

It deliberately does **not**:
- bind credentials;
- mark a connector verified;
- mark the SavingsBaseline agreed;
- change installation state;
- execute live side effects;
- record client approval.

## Economics boundary

Discovery estimates use:

```text
monthly_minutes_released =
  monthly_units × (manual_minutes_per_unit - estimated_human_minutes_after)

monthly_hours_released = monthly_minutes_released / 60
capacity_value = monthly_hours_released × loaded_hourly_cost
```

The estimate is a sales/discovery aid, not payroll cash savings and not production SavingsEvent evidence. The client-specific SavingsBaseline remains a separate acceptance artifact.
