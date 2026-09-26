#!/usr/bin/env python3
"""Render the MK1 rehearsal JSON projections as dependency-free local HTML.

This is a demo/presentation surface only. It does not provide authentication,
RLS, a production control plane or client acceptance.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import shutil
import sys
from pathlib import Path


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def esc(value: object) -> str:
    return html.escape("" if value is None else str(value), quote=True)


def page(title: str, subtitle: str, body: str) -> str:
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title>
<style>
:root {{ font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }}
body {{ margin: 0; background: #f6f7f8; color: #171717; }}
main {{ max-width: 1120px; margin: 0 auto; padding: 32px 20px 64px; }}
header {{ margin-bottom: 24px; }}
h1 {{ margin: 0 0 6px; font-size: 28px; }}
.subtitle {{ color: #5c5c5c; }}
.notice {{ padding: 12px 14px; border: 1px solid #d9d9d9; background: #fff; border-radius: 10px; margin: 18px 0; }}
.grid {{ display: grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap: 12px; margin: 18px 0 26px; }}
.card {{ background: #fff; border: 1px solid #e2e2e2; border-radius: 12px; padding: 16px; }}
.k {{ color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }}
.v {{ font-size: 24px; font-weight: 700; margin-top: 6px; }}
table {{ width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e2e2e2; }}
th, td {{ text-align: left; padding: 11px 12px; border-bottom: 1px solid #ececec; vertical-align: top; }}
th {{ font-size: 12px; text-transform: uppercase; color: #666; }}
ul {{ margin: 6px 0 0 18px; padding: 0; }}
a {{ color: inherit; }}
footer {{ margin-top: 28px; color: #666; font-size: 12px; }}
</style>
</head>
<body><main>
<header><h1>{esc(title)}</h1><div class="subtitle">{esc(subtitle)}</div></header>
{body}
<footer>MK1 rehearsal surface · productionClaim=false · generated locally with no external assets.</footer>
</main></body></html>
"""


def render_client(view: dict) -> str:
    if view.get("productionClaim") is not False:
        raise ValueError("client rehearsal view must explicitly have productionClaim=false")
    summary = view.get("summary") or {}
    cards = [
        ("Automatizaciones", summary.get("automationCount", 0)),
        ("Unidades automatizadas", summary.get("automatedUnits", 0)),
        ("Horas liberadas", f"{float(summary.get('hoursReleased') or 0):.2f}"),
        ("Valor de capacidad", f"{summary.get('currency', 'PEN')} {float(summary.get('estimatedCapacityValue') or 0):.2f}"),
        ("Pendientes", summary.get("attentionItems", 0)),
    ]
    card_html = "".join(
        f'<div class="card"><div class="k">{esc(k)}</div><div class="v">{esc(v)}</div></div>'
        for k, v in cards
    )
    rows = []
    for item in view.get("workflows", []):
        attention = item.get("attentionItems") or []
        attention_html = "—" if not attention else "<ul>" + "".join(
            f"<li>{esc(x.get('entityType'))}: {esc(x.get('status'))}</li>" for x in attention
        ) + "</ul>"
        rows.append(
            "<tr>"
            f"<td><strong>{esc(item.get('workflowKey'))}</strong></td>"
            f"<td>{esc(item.get('automatedUnits', 0))}</td>"
            f"<td>{float(item.get('hoursReleased') or 0):.2f}</td>"
            f"<td>{esc(item.get('currency', 'PEN'))} {float(item.get('estimatedCapacityValue') or 0):.2f}</td>"
            f"<td>{attention_html}</td>"
            "</tr>"
        )
    body = (
        f'<div class="notice">{esc(view.get("methodologyNotice", ""))}</div>'
        f'<div class="grid">{card_html}</div>'
        "<table><thead><tr>"
        "<th>Workflow</th><th>Unidades</th><th>Horas</th><th>Valor</th><th>Atención</th>"
        "</tr></thead><tbody>"
        + "".join(rows)
        + "</tbody></table>"
    )
    return page("Client Portal · Rehearsal", "Vista local de valor operativo; no es evidencia de producción.", body)


def render_operator(view: dict) -> str:
    if view.get("productionClaim") is not False:
        raise ValueError("operator rehearsal view must explicitly have productionClaim=false")
    rows = []
    for item in view.get("workflows", []):
        blockers = item.get("clientConfiguredBlockers") or []
        blockers_html = "—" if not blockers else "<ul>" + "".join(
            f"<li>{esc(x)}</li>" for x in blockers
        ) + "</ul>"
        rows.append(
            "<tr>"
            f"<td><strong>{esc(item.get('workflowKey'))}</strong><br><small>{esc(item.get('installationId'))}</small></td>"
            f"<td>{esc(item.get('runtimeProfile'))}</td>"
            f"<td>{esc(item.get('runs', 0))}</td>"
            f"<td>{esc(item.get('processRecords', 0))}</td>"
            f"<td>{esc(item.get('savingsEvents', 0))}</td>"
            f"<td>{esc(item.get('incidents', 0))}</td>"
            f"<td>{blockers_html}</td>"
            "</tr>"
        )
    notice = (
        "Paid infrastructure required: "
        + ("yes" if view.get("paidInfrastructureRequired") else "no")
        + ". This surface is a rehearsal projection, not the production Operator Console."
    )
    body = (
        f'<div class="notice">{esc(notice)}</div>'
        "<table><thead><tr>"
        "<th>Workflow / installation</th><th>Runtime</th><th>Runs</th><th>Process records</th>"
        "<th>Savings events</th><th>Incidents</th><th>CLIENT_CONFIGURED blockers</th>"
        "</tr></thead><tbody>"
        + "".join(rows)
        + "</tbody></table>"
    )
    return page("Operator Console · Rehearsal", "Salud y blockers operativos de la simulación local.", body)


def render_index(summary: dict) -> str:
    if summary.get("productionClaim") is not False:
        raise ValueError("summary must explicitly have productionClaim=false")
    body = (
        '<div class="grid">'
        f'<a class="card" href="client-portal.html"><div class="k">Demo</div><div class="v">Client Portal</div></a>'
        f'<a class="card" href="operator-console.html"><div class="k">Demo</div><div class="v">Operator Console</div></a>'
        "</div>"
        '<div class="notice">'
        f"Tenant sintético: {esc(summary.get('tenantId'))}. "
        f"Workflows: {esc(summary.get('workflowCount'))}. "
        "La evidencia sigue siendo LOCAL_SIMULATION; conectores reales y aceptación siguen bloqueados."
        "</div>"
    )
    return page("MK1 Zero-Cost Rehearsal", "Superficies estáticas para demo local, sin servidor ni dependencias.", body)


def render_directory(input_dir: Path, output_dir: Path | None = None) -> dict:
    output_dir = output_dir or input_dir
    source_paths = {
        "clientPortalSource": input_dir / "client-portal.json",
        "operatorConsoleSource": input_dir / "operator-console.json",
        "summarySource": input_dir / "summary.json",
    }
    client = read_json(source_paths["clientPortalSource"])
    operator = read_json(source_paths["operatorConsoleSource"])
    summary = read_json(source_paths["summarySource"])

    if any(doc.get("productionClaim") is not False for doc in [client, operator, summary]):
        raise ValueError("all rehearsal source projections must explicitly have productionClaim=false")

    output_dir.mkdir(parents=True, exist_ok=True)
    source_snapshot_dir = output_dir / "source"
    source_snapshot_dir.mkdir(parents=True, exist_ok=True)
    snapshot_paths = {
        key: source_snapshot_dir / path.name
        for key, path in source_paths.items()
    }
    for key, path in source_paths.items():
        if path.resolve() != snapshot_paths[key].resolve():
            shutil.copyfile(path, snapshot_paths[key])
        else:
            snapshot_paths[key] = path

    targets = {
        "index": output_dir / "index.html",
        "clientPortal": output_dir / "client-portal.html",
        "operatorConsole": output_dir / "operator-console.html",
    }
    targets["index"].write_text(render_index(summary), encoding="utf-8")
    targets["clientPortal"].write_text(render_client(client), encoding="utf-8")
    targets["operatorConsole"].write_text(render_operator(operator), encoding="utf-8")

    manifest = {
        "schemaVersion": 1,
        "evidenceType": "MK1_STATIC_REHEARSAL_SURFACE",
        "productionClaim": False,
        "tenantId": summary.get("tenantId"),
        "workflowCount": summary.get("workflowCount"),
        "sourceFiles": {
            key: {
                "path": path.relative_to(output_dir).as_posix(),
                "sha256": sha256_file(path),
            }
            for key, path in snapshot_paths.items()
        },
        "generatedFiles": {
            key: {
                "path": path.relative_to(output_dir).as_posix(),
                "sha256": sha256_file(path),
            }
            for key, path in targets.items()
        },
    }
    manifest_path = output_dir / "report-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    result = {key: str(path) for key, path in targets.items()}
    result["manifest"] = str(manifest_path)
    return result


def verify_directory(directory: Path) -> dict:
    manifest_path = directory / "report-manifest.json"
    manifest = read_json(manifest_path)
    if manifest.get("productionClaim") is not False:
        raise ValueError("static surface manifest must explicitly have productionClaim=false")

    checked = 0
    for group in ["sourceFiles", "generatedFiles"]:
        entries = manifest.get(group)
        if not isinstance(entries, dict) or not entries:
            raise ValueError(f"manifest missing {group}")
        for name, entry in entries.items():
            raw_path = entry.get("path")
            expected = entry.get("sha256")
            if not isinstance(raw_path, str) or not raw_path:
                raise ValueError(f"manifest path missing: {group}.{name}")
            rel = Path(raw_path)
            if rel.is_absolute() or ".." in rel.parts:
                raise ValueError(f"manifest path unsafe: {group}.{name}")
            path = (directory / rel).resolve()
            try:
                path.relative_to(directory.resolve())
            except ValueError as exc:
                raise ValueError(f"manifest path escapes directory: {group}.{name}") from exc
            if not path.is_file():
                raise ValueError(f"manifest file missing: {group}.{name}")
            actual = sha256_file(path)
            if actual != expected:
                raise ValueError(f"manifest hash mismatch: {group}.{name}")
            checked += 1

    return {
        "valid": True,
        "productionClaim": False,
        "tenantId": manifest.get("tenantId"),
        "workflowCount": manifest.get("workflowCount"),
        "filesChecked": checked,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", type=Path, required=True)
    ap.add_argument("--out", type=Path)
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    try:
        if args.verify:
            result = verify_directory(args.input.resolve())
        else:
            result = render_directory(args.input.resolve(), args.out.resolve() if args.out else None)
    except (ValueError, FileNotFoundError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print("MK1 STATIC REHEARSAL SURFACES: PASS")
        for key, value in result.items():
            print(f"{key}={value}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
