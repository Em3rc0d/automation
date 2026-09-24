#!/usr/bin/env python3
"""Materialize Savings Workflow design packages from the machine-readable registry.

This tool creates DESIGN_READY package stubs. It does not create executable business
logic and must not mark a package TESTED/APPROVED_BASELINE.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "workflows" / "SAVINGS-WORKFLOW-REGISTRY.json"
DEFAULT_OUT = ROOT / "workflows" / "savings"


def slug(key: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", key.lower()).strip("-")


def load_registry() -> list[dict]:
    data = json.loads(REGISTRY.read_text(encoding="utf-8"))
    return list(data["entries"])


def yaml_scalar(value: object) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if value is None:
        return "null"
    text = str(value).replace('"', '\"')
    return f'"{text}"'


def render_manifest(item: dict) -> str:
    lines = [
        "schemaVersion: 1",
        f"key: {yaml_scalar(item['key'])}",
        f"version: {yaml_scalar(item['version'])}",
        f"name: {yaml_scalar(item['name'])}",
        f"domain: {yaml_scalar(item['domain'])}",
        f"stage: {yaml_scalar(item['stage'])}",
        f"runtimeProfile: {yaml_scalar(item['runtime_profile'])}",
        f"savingsUnit: {yaml_scalar(item['savings_unit'])}",
        f"manualWorkReduced: {yaml_scalar(item['manual_work_reduced'])}",
        f"executionModel: {yaml_scalar(item['execution_model'])}",
        f"preRevenueMode: {yaml_scalar(item['pre_revenue_mode'])}",
        f"externalCostPolicy: {yaml_scalar(item['external_cost_policy'])}",
        "capabilities:",
    ]
    lines.extend(f"  - {yaml_scalar(x)}" for x in item["capabilities"])
    lines += [
        "implementation:",
        '  status: "NOT_IMPLEMENTED"',
        '  engine: "UNBOUND"',
        "certification:",
        '  tested: false',
        '  approvedBaseline: false',
        "savings:",
        "  baselineRequired: true",
        f"  unit: {yaml_scalar(item['savings_unit'])}",
        "",
    ]
    return "\n".join(lines)


def render_readme(item: dict) -> str:
    return f"""# {item['name']}

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `{item['key']}@{item['version']}`
- Domain: `{item['domain']}`
- Runtime profile: `{item['runtime_profile']}`
- Savings unit: `{item['savings_unit']}`

## Human active work reduced

{item['manual_work_reduced']}.

## Capability composition

{chr(10).join(f"- `{x}`" for x in item['capabilities'])}

## Required work before production

1. Bind provider-neutral connector capabilities.
2. Implement deterministic business logic.
3. Add input/output/config schemas.
4. Add idempotency/retry/timeout/exception policy.
5. Add fixtures and tests.
6. Add execution + savings telemetry.
7. Pass HARDENED and TESTED gates.
8. Promote to APPROVED_BASELINE.
9. Configure tenant connectors, policy and SavingsBaseline.
10. Pass client-specific acceptance.

This package is generated from `workflows/SAVINGS-WORKFLOW-REGISTRY.json`.
"""


def render_config_schema(item: dict) -> str:
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": f"{item['key']} configuration",
        "type": "object",
        "properties": {
            "businessTimezone": {"type": "string", "default": "America/Lima"}
        },
        "additionalProperties": True,
        "description": "DESIGN_READY placeholder. Replace with workflow-specific configuration before HARDENED."
    }
    return json.dumps(schema, indent=2) + "\n"


def materialize(item: dict, out_root: Path, force: bool) -> Path:
    package = out_root / item["domain"] / f"{item['key']}@{item['version']}"
    if package.exists() and not force:
        raise FileExistsError(f"refusing to overwrite existing package: {package}")
    package.mkdir(parents=True, exist_ok=True)
    (package / "manifest.yaml").write_text(render_manifest(item), encoding="utf-8")
    (package / "README.md").write_text(render_readme(item), encoding="utf-8")
    (package / "config.schema.json").write_text(render_config_schema(item), encoding="utf-8")
    (package / "fixtures").mkdir(exist_ok=True)
    (package / "fixtures" / "README.md").write_text(
        "# Fixtures\n\nAdd happy path, malformed input, duplicate, provider failure and permission-expiry fixtures before TESTED.\n",
        encoding="utf-8",
    )
    (package / "evidence").mkdir(exist_ok=True)
    (package / "evidence" / "README.md").write_text(
        "# Evidence\n\nNo test evidence exists at DESIGN_READY stage.\n",
        encoding="utf-8",
    )
    return package


def main() -> int:
    parser = argparse.ArgumentParser()
    scope = parser.add_mutually_exclusive_group(required=True)
    scope.add_argument("--key", help="Materialize one registry key")
    scope.add_argument("--all", action="store_true", help="Materialize every DESIGN_READY registry entry")
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
