#!/usr/bin/env python3
"""Materialize Savings Workflow DESIGN_READY packages from the registry.

This creates design contracts only. It never creates executable workflow logic and
never marks a package TESTED/APPROVED_BASELINE.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "workflows" / "SAVINGS-WORKFLOW-REGISTRY.json"
DEFAULT_OUT = ROOT / "workflows" / "savings"


def load_registry() -> list[dict]:
    return json.loads(REGISTRY.read_text(encoding="utf-8"))["entries"]


def q(value: object) -> str:
    return json.dumps(str(value), ensure_ascii=False)


def render_manifest(x: dict) -> str:
    implementation_status = x.get("implementation_status", "NOT_IMPLEMENTED")
    implementation_engine = x.get("implementation_engine", "UNBOUND")
    implementation_reference = x.get("implementation_reference")
    lines = [
        "schemaVersion: 1",
        "skeletonVersion: 1",
        f"id: {q(x['id'])}",
        f"key: {q(x['key'])}",
        f"version: {q(x['version'])}",
        f"name: {q(x['name'])}",
        f"domain: {q(x['domain'])}",
        f"stage: {q(x['stage'])}",
        f"runtimeProfile: {q(x['runtime_profile'])}",
        f"executionModel: {q(x['execution_model'])}",
        f"preRevenueMode: {q(x['pre_revenue_mode'])}",
        f"externalCostPolicy: {q(x['external_cost_policy'])}",
        f"savingsUnit: {q(x['savings_unit'])}",
        f"manualWorkReduced: {q(x['manual_work_reduced'])}",
        "capabilities:",
        *[f"  - {q(c)}" for c in x["capabilities"]],
        "implementation:",
        f"  status: {q(implementation_status)}",
        f"  engine: {q(implementation_engine)}",
    ]
    if implementation_reference:
        lines.append(f"  reference: {q(implementation_reference)}")
    lines += [
        "  readyForProduction: false",
        "certification:",
        "  tested: false",
        "  approvedBaseline: false",
        "  clientAccepted: false",
        "savings:",
        "  baselineRequired: true",
        f"  unit: {q(x['savings_unit'])}",
        "",
    ]
    return "\n".join(lines)


def render_config(x: dict) -> str:
    props: dict[str, object] = {
        "enabled": {"type": "boolean", "default": True},
        "dryRun": {"type": "boolean", "default": True},
        "businessTimezone": {"type": "string", "default": "America/Lima"},
        "maxRetries": {"type": "integer", "minimum": 0, "maximum": 10, "default": 3},
        "timeoutSeconds": {"type": "integer", "minimum": 1, "maximum": 3600, "default": 60},
    }
    runtime = x["runtime_profile"]
    if runtime == "scheduled":
        props["schedule"] = {"type": "string", "description": "Tenant schedule/cron."}
    if runtime in {"durable", "human_loop"}:
        props["maxWaitHours"] = {"type": "integer", "minimum": 1, "maximum": 720, "default": 72}
    if runtime == "human_loop":
        props["approvalMode"] = {
            "enum": ["REQUIRED_FOR_EXCEPTION", "ALWAYS", "DISABLED_FOR_SAFE_PATH"],
            "default": "REQUIRED_FOR_EXCEPTION",
        }
    if runtime == "heavy":
        props["maxBatchSize"] = {"type": "integer", "minimum": 1, "maximum": 10000, "default": 100}
        props["maxVariableCostPerRun"] = {"type": "number", "minimum": 0}
    return json.dumps({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": f"{x['key']} tenant configuration",
        "description": "DESIGN_READY skeleton; specialize before HARDENED.",
        "type": "object",
        "required": ["enabled", "dryRun", "businessTimezone"],
        "properties": props,
        "additionalProperties": True,
    }, indent=2) + "\n"


def render_input(x: dict) -> str:
    return json.dumps({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": f"{x['key']} input",
        "type": "object",
        "required": ["tenantId", "idempotencyKey", "occurredAt", "payload"],
        "properties": {
            "tenantId": {"type": "string", "minLength": 1},
            "idempotencyKey": {"type": "string", "minLength": 8},
            "occurredAt": {"type": "string", "format": "date-time"},
            "sourceSystem": {"type": ["string", "null"]},
            "sourceId": {"type": ["string", "null"]},
            "payload": {"type": "object", "description": f"Workflow-specific {x['savings_unit']} payload."},
        },
        "additionalProperties": False,
    }, indent=2) + "\n"


def render_output(x: dict) -> str:
    return json.dumps({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": f"{x['key']} output",
        "type": "object",
        "required": ["status", "automatedUnits", "exceptionMinutes", "oversightMinutes"],
        "properties": {
            "status": {"enum": ["completed", "attention_required", "failed", "skipped_duplicate"]},
            "processRecordId": {"type": ["string", "null"]},
            "approvalRequestId": {"type": ["string", "null"]},
            "automatedUnits": {"type": "integer", "minimum": 0},
            "exceptionMinutes": {"type": "number", "minimum": 0},
            "oversightMinutes": {"type": "number", "minimum": 0},
            "variableCost": {"type": "number", "minimum": 0},
            "savingsUnit": {"const": x["savings_unit"]},
            "result": {"type": ["object", "null"]},
        },
        "additionalProperties": False,
    }, indent=2) + "\n"


def render_readme(x: dict) -> str:
    caps = "\n".join(f"- `{c}`" for c in x["capabilities"])
    implementation_status = x.get("implementation_status", "NOT_IMPLEMENTED")
    reference = x.get("implementation_reference")
    reference_section = ""
    if reference:
        reference_section = f"""\n## Reference implementation\n\n- Status: `{implementation_status}`\n- Engine/profile: `{x.get('implementation_engine', 'UNBOUND')}`\n- Runtime code: `{reference}`\n- Reference test: `{x.get('reference_test', '')}`\n- Reference demo: `{x.get('reference_demo', '')}`\n\nThis proves executable reference behavior only; it does not change the canonical `DESIGN_READY` / factory certification state.\n"""
    return f"""# {x['name']}

Status: **DESIGN_READY / {implementation_status} / NOT CERTIFIED**

- Key: `{x['key']}@{x['version']}`
- Domain: `{x['domain']}`
- Runtime: `{x['runtime_profile']}`
- Savings unit: `{x['savings_unit']}`

## Human active work reduced

{x['manual_work_reduced']}.

## Capability composition

{caps}
{reference_section}
## Execution skeleton

```text
trigger → validate → idempotency → capabilities → optional approval/exception → process record → SavingsEvent → telemetry
```

## Before production

- [ ] real baseline measured;
- [ ] source of truth identified;
- [ ] adapters/config bound;
- [ ] schemas specialized;
- [ ] retries/timeouts/idempotency tested;
- [ ] duplicate/provider-error/credential-expiry paths tested;
- [ ] savings counted once per business unit;
- [ ] HARDENED → TESTED → APPROVED_BASELINE;
- [ ] tenant acceptance passed.
"""


def render_fixture(x: dict, kind: str) -> str:
    if kind == "happy-path":
        data = {
            "fixture": kind,
            "workflowKey": x["key"],
            "input": {
                "tenantId": "tenant_fixture",
                "idempotencyKey": f"{x['key'].lower()}:fixture:001",
                "occurredAt": "2026-09-24T12:00:00Z",
                "sourceSystem": "fixture",
                "sourceId": "source-001",
                "payload": {"note": f"Replace with realistic {x['savings_unit']} fixture before TESTED."},
            },
            "expected": {"status": "completed", "automatedUnits": 1, "savingsUnit": x["savings_unit"]},
        }
    elif kind == "duplicate":
        data = {
            "fixture": kind,
            "workflowKey": x["key"],
            "instruction": "Send same idempotencyKey twice.",
            "expected": {"firstRun": "completed", "secondRun": "skipped_duplicate", "sideEffectsCreated": 1, "savingsEventsCreated": 1},
        }
    else:
        data = {
            "fixture": kind,
            "workflowKey": x["key"],
            "simulate": {"providerResponse": 503, "transient": True},
            "expected": {"retryPolicyApplied": True, "duplicateSideEffect": False, "incidentCreatedAfterExhaustion": True, "savingsEventOnFailure": False},
        }
    return json.dumps(data, indent=2) + "\n"


def render_test_plan(x: dict) -> str:
    return f"""# Test Plan — {x['name']}

Status: **SKELETON / NO TEST EVIDENCE YET**

Required: happy path; malformed input; duplicate; transient/permanent provider failure;
credential expiry; tenant isolation; retry/timeout; variable cost capture; SavingsEvent
exactly once; exception/oversight minutes; rollback/replay without double counting.

Runtime-specific profile: `{x['runtime_profile']}`. Savings unit: `{x['savings_unit']}`.
"""


def render_baseline(x: dict) -> str:
    return f"""# Savings Baseline — {x['name']}

Primary unit: **{x['savings_unit']}**

Manual work reduced: {x['manual_work_reduced']}.

Collect: `manual_minutes_per_unit`, `baseline_sample_size`, `baseline_method`,
`loaded_hourly_cost_pen`, `confidence`, `valid_from`, assumptions.

Runtime: `automated_units`, `exception_minutes`, `oversight_minutes`, `variable_cost`.

```text
net_minutes_released = max(0, automated_units * manual_minutes_per_unit - exception_minutes - oversight_minutes)
hours_released = net_minutes_released / 60
estimated_capacity_value = hours_released * loaded_hourly_cost
net_operating_value = estimated_capacity_value - variable_cost
```

Do not double-count internal reducer steps.
"""


def render_flow_plan(x: dict) -> str:
    lines = [
        "schemaVersion: 1",
        f"workflowKey: {q(x['key'])}",
        f"runtimeProfile: {q(x['runtime_profile'])}",
        f"implementationStatus: {q(x.get('implementation_status', 'NOT_IMPLEMENTED'))}",
        *([f"referencePath: {q(x['implementation_reference'])}"] if x.get("implementation_reference") else []),
        "steps:",
        '  - id: "validate_input"',
        '    capability: "platform.input.validate"',
        '  - id: "idempotency_guard"',
        '    capability: "platform.idempotency.guard"',
    ]
    for i, capability in enumerate(x["capabilities"], 1):
        lines += [f'  - id: "capability_{i}"', f"    capability: {q(capability)}"]
    if x["runtime_profile"] == "human_loop":
        lines += ['  - id: "approval_boundary"', '    capability: "platform.approval.wait"']
    lines += [
        '  - id: "persist_process_record"',
        '    capability: "platform.process_record.upsert"',
        '  - id: "emit_savings_event"',
        '    capability: "platform.savings.emit"',
        '  - id: "emit_execution_telemetry"',
        '    capability: "platform.telemetry.emit"',
        "failurePath:",
        '  incidentCapability: "ERROR_TO_INCIDENT"',
        '  exceptionQueue: "HUMAN_REVIEW_TASK"',
        "",
    ]
    return "\n".join(lines)


def render_runbook(x: dict) -> str:
    approval = ", approval timeout" if x["runtime_profile"] == "human_loop" else ""
    return f"""# Runbook — {x['name']}

Monitor success/failure, last success, connector health, automated `{x['savings_unit']}`,
exceptions, variable cost and incidents.

Common failures: credential expiry, provider outage, malformed/stale source data, replay,
config mismatch, tenant mismatch, cost spike{approval}.

Operator: inspect tenant/workflow/trace → pause unsafe installation → repair dependency/config
→ replay with original idempotency → verify process and SavingsEvent count → audit impact.

Define rollback and reconciliation before APPROVED_BASELINE.
"""


def materialize(x: dict, out_root: Path, force: bool) -> Path:
    package = out_root / x["domain"] / f"{x['key']}@{x['version']}"
    if package.exists() and not force:
        raise FileExistsError(f"refusing to overwrite existing package: {package}")
    package.mkdir(parents=True, exist_ok=True)

    files = {
        "manifest.yaml": render_manifest(x),
        "README.md": render_readme(x),
        "config.schema.json": render_config(x),
        "contracts/input.schema.json": render_input(x),
        "contracts/output.schema.json": render_output(x),
        "fixtures/happy-path.json": render_fixture(x, "happy-path"),
        "fixtures/duplicate.json": render_fixture(x, "duplicate"),
        "fixtures/provider-error.json": render_fixture(x, "provider-error"),
        "tests/TEST-PLAN.md": render_test_plan(x),
        "savings/BASELINE.md": render_baseline(x),
        "implementation/flow.plan.yaml": render_flow_plan(x),
        "runbook/RUNBOOK.md": render_runbook(x),
    }
    for rel, content in files.items():
        target = package / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    return package


def main() -> int:
    parser = argparse.ArgumentParser()
    scope = parser.add_mutually_exclusive_group(required=True)
    scope.add_argument("--key")
    scope.add_argument("--all", action="store_true")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    items = load_registry()
    selected = items if args.all else [x for x in items if x["key"] == args.key]
    if not selected:
        raise SystemExit(f"unknown Savings Workflow key: {args.key}")

    for item in selected:
        path = materialize(item, args.out, args.force)
        print(path.relative_to(ROOT) if path.is_relative_to(ROOT) else path)

    print(f"materialized={len(selected)} stage=DESIGN_READY production_ready=false")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
