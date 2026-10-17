#!/usr/bin/env python3
"""Local-only MK1 Operator Console: catalog, tenant installations, validated config.

No production auth, no remote binding, no provider execution, no live secrets.
Requires only Python standard library and existing Savings installer.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
import re
import secrets
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[2]
STATIC = Path(__file__).resolve().parent / "static"
INSTALLER_PATH = ROOT / "tools" / "savings" / "install_approved.py"
spec = importlib.util.spec_from_file_location("savings_installer_for_console", INSTALLER_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError("Existing Savings installer cannot be loaded")
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)

SEED_PATH = Path(__file__).resolve().parent / "catalog_seed.py"
seed_spec = importlib.util.spec_from_file_location("automation_console_catalog_seed", SEED_PATH)
if seed_spec is None or seed_spec.loader is None:
    raise RuntimeError("Automation catalog seeder cannot be loaded")
seed_module = importlib.util.module_from_spec(seed_spec)
seed_spec.loader.exec_module(seed_module)

TENANT_SEED_PATH = Path(__file__).resolve().parent / "tenant_seed.py"
tenant_seed_spec = importlib.util.spec_from_file_location("automation_console_tenant_seed", TENANT_SEED_PATH)
if tenant_seed_spec is None or tenant_seed_spec.loader is None:
    raise RuntimeError("Automation tenant seeder cannot be loaded")
tenant_seed_module = importlib.util.module_from_spec(tenant_seed_spec)
tenant_seed_spec.loader.exec_module(tenant_seed_module)

SIMULATOR_PATH = Path(__file__).resolve().parent / "simulation.py"
simulator_spec = importlib.util.spec_from_file_location("automation_console_simulation", SIMULATOR_PATH)
if simulator_spec is None or simulator_spec.loader is None:
    raise RuntimeError("Automation simulator cannot be loaded")
simulator = importlib.util.module_from_spec(simulator_spec)
simulator_spec.loader.exec_module(simulator)

RESTAURANT_PATH = Path(__file__).resolve().parent / "restaurant_demo.py"
restaurant_spec = importlib.util.spec_from_file_location("automation_restaurant_demo", RESTAURANT_PATH)
if restaurant_spec is None or restaurant_spec.loader is None:
    raise RuntimeError("Demo restaurant engine cannot be loaded")
restaurant_demo = importlib.util.module_from_spec(restaurant_spec)
restaurant_spec.loader.exec_module(restaurant_demo)

TENANT = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?\Z")
WORKFLOW = re.compile(r"[A-Z][A-Z0-9_]{2,99}\Z")
LOCK = threading.RLock()


class ConsoleError(ValueError):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def valid_tenant(raw: object) -> str:
    if not isinstance(raw, str) or not TENANT.fullmatch(raw):
        raise ConsoleError("Tenant inválido: utiliza minúsculas, números y guiones (máximo 48).")
    return raw


def valid_key(raw: object) -> str:
    if not isinstance(raw, str) or not WORKFLOW.fullmatch(raw):
        raise ConsoleError("Clave de automatización inválida.")
    return raw


def digest(value: object) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def validate_schema(value: object, schema: dict, path: str = "config") -> list[str]:
    """Conservative subset for this repository's simple per-tenant config schemas.

    Unsupported validation keywords fail closed. This is not a general JSON Schema engine.
    """
    errors: list[str] = []
    supported = {"$schema", "title", "description", "type", "properties", "required",
                 "additionalProperties", "enum", "default", "items", "minimum", "maximum",
                 "minItems", "maxItems", "uniqueItems", "minLength", "maxLength"}
    unknown = set(schema) - supported
    if unknown:
        return [f"{path}: regla de esquema no soportada: {', '.join(sorted(unknown))}"]
    ty = schema.get("type")
    if isinstance(ty, list):
        if ty == ["object", "null"]:
            if value is None:
                return []
            ty = "object"
        else:
            return [f"{path}: unión de tipos no soportada"]
    if ty == "object":
        if not isinstance(value, dict):
            return [f"{path}: debe ser un objeto"]
        props = schema.get("properties", {})
        if not isinstance(props, dict):
            return [f"{path}: properties inválidas"]
        for key in schema.get("required", []):
            if key not in value or value[key] is None:
                errors.append(f"{path}.{key}: requerido")
        for key, item in value.items():
            if key not in props:
                if schema.get("additionalProperties", True) is False:
                    errors.append(f"{path}.{key}: propiedad desconocida")
                elif props:
                    errors.append(f"{path}.{key}: no se permite editar campos sin esquema")
            else:
                errors.extend(validate_schema(item, props[key], f"{path}.{key}"))
    elif ty == "array":
        if not isinstance(value, list):
            return [f"{path}: debe ser una lista"]
        if len(value) < schema.get("minItems", 0):
            errors.append(f"{path}: requiere más elementos")
        if len(value) > schema.get("maxItems", 10000):
            errors.append(f"{path}: excede el máximo de elementos")
        if schema.get("uniqueItems") and len({json.dumps(v, sort_keys=True) for v in value}) != len(value):
            errors.append(f"{path}: contiene duplicados")
        item_schema = schema.get("items")
        if not isinstance(item_schema, dict):
            errors.append(f"{path}: falta esquema de elementos")
        else:
            for i, item in enumerate(value):
                errors.extend(validate_schema(item, item_schema, f"{path}[{i}]"))
    elif ty == "boolean":
        if not isinstance(value, bool):
            errors.append(f"{path}: debe ser verdadero o falso")
    elif ty == "string":
        if not isinstance(value, str):
            errors.append(f"{path}: debe ser texto")
        else:
            if len(value) < schema.get("minLength", 0):
                errors.append(f"{path}: texto demasiado corto")
            if len(value) > schema.get("maxLength", 100000):
                errors.append(f"{path}: texto demasiado largo")
    elif ty == "integer":
        if type(value) is not int:
            errors.append(f"{path}: debe ser entero")
    elif ty == "number":
        if type(value) not in (int, float) or not -1e308 < value < 1e308:
            errors.append(f"{path}: debe ser número finito")
    elif ty is not None:
        errors.append(f"{path}: tipo no soportado: {ty}")
    elif "enum" not in schema:
        errors.append(f"{path}: falta tipo o enum")
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{path}: valor no permitido")
    if ty in ("integer", "number") and type(value) in (int, float):
        if value < schema.get("minimum", -float("inf")):
            errors.append(f"{path}: menor que mínimo")
        if value > schema.get("maximum", float("inf")):
            errors.append(f"{path}: mayor que máximo")
    return errors


def atomic_json(path: Path, value: dict) -> None:
    """Write config safely without partial JSON on interruption."""
    encoded = (json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n").encode()
    fd, name = tempfile.mkstemp(dir=path.parent, prefix=".config-", suffix=".tmp")
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(encoded)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(name, 0o600)
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


class ConsoleData:
    def __init__(self, store: Path | None = None, catalog_db: Path | None = None,
                 seed_tenant_id: str | None = None):
        self.store = (store or ROOT / ".local" / "installations").resolve()
        self.registry = installer.registry_by_key()
        self.store.mkdir(parents=True, exist_ok=True)
        self.catalog_db = (catalog_db or self.store.parent / "console" / "catalog.sqlite3").resolve()
        # Fail closed on seed failure: do not serve a partial/stale catalog.
        self.seed_summary = seed_module.seed_catalog(installer.REGISTRY, self.catalog_db)
        self.restaurant = restaurant_demo.RestaurantDemo(
            self.catalog_db.parent / "restaurant-demo.sqlite3")
        self.tenant_seed_summary = None
        if seed_tenant_id:
            self.tenant_seed_summary = tenant_seed_module.seed_tenant(
                seed_tenant_id, self.catalog_db, self.store)

    def catalog(self) -> list[dict]:
        # Read the seeded SQLite catalog, not the source JSON directly.
        return seed_module.list_catalog(self.catalog_db)

    def tenants(self) -> list[str]:
        return sorted(p.name for p in self.store.iterdir()
                      if p.is_dir() and not p.is_symlink() and TENANT.fullmatch(p.name))

    def tenant_folder(self, tenant: str) -> Path:
        tenant = valid_tenant(tenant)
        folder = self.store / tenant
        if folder.is_symlink():
            raise ConsoleError("No se admiten directorios de cliente con enlaces simbólicos.")
        return folder

    def bundle(self, tenant: str, key: str, *, must_exist: bool = True) -> Path:
        folder = self.tenant_folder(tenant)
        key = valid_key(key)
        item = self.registry.get(key)
        if item is None or item.get("stage") != "APPROVED_BASELINE":
            raise ConsoleError("Solo se pueden gestionar baselines aprobados.", 404)
        path = folder / f"{key}@{item['version']}"
        if path.is_symlink():
            raise ConsoleError("No se admiten instalaciones con enlaces simbólicos.")
        if must_exist and (not path.is_dir() or not (path / "installation.json").is_file()):
            raise ConsoleError("Instalación no encontrada.", 404)
        return path

    def installations(self, tenant: str | None = None) -> list[dict]:
        result = []
        for client in ([valid_tenant(tenant)] if tenant else self.tenants()):
            folder = self.tenant_folder(client)
            if not folder.is_dir():
                continue
            for item in self.registry.values():
                if item.get("stage") != "APPROVED_BASELINE":
                    continue
                candidate = folder / f"{item['key']}@{item['version']}"
                if not candidate.is_dir() or candidate.is_symlink() or not (candidate / "installation.json").is_file():
                    continue
                try:
                    record = installer.read_json(candidate / "installation.json")
                    if record.get("tenantId") != client or record.get("workflowKey") != item["key"]:
                        continue
                    diagnosis = installer.diagnose(candidate)
                    result.append({
                        "tenantId": client, "key": item["key"], "name": item["name"],
                        "domain": item["domain"], "version": item["version"],
                        "state": record.get("state", "DRAFT"),
                        "runtimeProfile": record.get("runtimeProfile"),
                        "ready": diagnosis["ready"], "blockerCount": len(diagnosis["blockers"])
                    })
                except (ValueError, KeyError, OSError, json.JSONDecodeError):
                    continue
        return sorted(result, key=lambda x: (x["tenantId"], x["name"]))

    def install(self, tenant: str, key: str) -> dict:
        tenant, key = valid_tenant(tenant), valid_key(key)
        if key not in self.registry or self.registry[key]["stage"] != "APPROVED_BASELINE":
            raise ConsoleError("Automatización aún no aprobada para instalar.", 409)
        with LOCK:
            folder = self.bundle(tenant, key, must_exist=False)
            if folder.exists():
                raise ConsoleError("Este cliente ya tiene instalada esta versión.", 409)
            installer.scaffold(key, tenant, self.store)
            return self.detail(tenant, key)

    def detail(self, tenant: str, key: str) -> dict:
        path = self.bundle(tenant, key)
        record = installer.read_json(path / "installation.json")
        if record.get("tenantId") != tenant or record.get("workflowKey") != key:
            raise ConsoleError("Identidad de instalación inconsistente.", 409)
        config = installer.read_json(path / "config.json")
        approved = installer.approved_record(self.registry[key])
        schema = installer.read_json(ROOT / approved["packagePath"] / "config.schema.json")
        diagnostics = installer.diagnose(path)
        connectors = installer.read_json(path / "connector-bindings.json")
        # Never expose credentialRef, verification evidence or arbitrary provider settings.
        capabilities = [
            {"capability": b.get("capability"), "provider": b.get("provider"),
             "status": b.get("status", "unbound")}
            for b in connectors.get("bindings", [])
        ]
        return {
            "tenantId": tenant, "key": key, "name": self.registry[key]["name"],
            "installation": {
                "installationId": record.get("installationId"), "state": record.get("state"),
                "runtimeProfile": record.get("runtimeProfile"),
                "createdAt": record.get("createdAt")
            },
            "schema": schema, "config": config, "configVersion": digest(config),
            "diagnostics": diagnostics, "connectors": capabilities,
            "productionClaim": False,
        }

    def update_config(self, tenant: str, key: str, config: object, expected_version: str) -> dict:
        with LOCK:
            path = self.bundle(tenant, key)
            existing = self.detail(tenant, key)
            if expected_version != existing["configVersion"]:
                raise ConsoleError("La configuración cambió en otra sesión. Recarga antes de guardar.", 409)
            if not isinstance(config, dict):
                raise ConsoleError("La configuración debe ser un objeto.")
            errors = validate_schema(config, existing["schema"])
            errors.extend(installer.assert_safe_tree(config))
            if errors:
                raise ConsoleError("; ".join(errors[:8]))
            atomic_json(path / "config.json", config)
            return self.detail(tenant, key)

    def tenant_plan(self, tenant: str) -> dict:
        return tenant_seed_module.tenant_plan(
            valid_tenant(tenant), self.catalog_db, self.store)

    def simulation_path(self, tenant: str, key: str) -> Path:
        self.bundle(tenant, key)
        return self.catalog_db.parent / "simulations" / valid_tenant(tenant) / (
            valid_key(key) + ".json")

    def last_simulation(self, tenant: str, key: str) -> dict | None:
        path = self.simulation_path(tenant, key)
        if path.is_symlink():
            raise ConsoleError("No se admiten evidencias con enlaces simbólicos.")
        if not path.is_file():
            return None
        data = installer.read_json(path)
        if data.get("tenantId") != tenant or data.get("workflowKey") != key:
            raise ConsoleError("Identidad de evidencia de simulación inválida.", 409)
        return data

    def simulate(self, tenant: str, key: str) -> dict:
        tenant, key = valid_tenant(tenant), valid_key(key)
        path = self.bundle(tenant, key)
        if key not in simulator.FIXTURES:
            raise ConsoleError("La automatización no tiene runtime de simulación aprobado.", 409)
        with LOCK:
            try:
                summary = simulator.simulate(path)
            except (RuntimeError, OSError, json.JSONDecodeError) as exc:
                raise ConsoleError(str(exc)[:240] if isinstance(exc, RuntimeError)
                                   else "No se pudo completar la simulación local.", 409) from exc
            simulator.write_evidence(self.simulation_path(tenant, key), summary)
            return summary

    def simulate_all(self, tenant: str) -> dict:
        tenant = valid_tenant(tenant)
        installed = {x["key"] for x in self.installations(tenant)}
        selected = [x["key"] for x in self.catalog()
                    if x["installable"] and x["key"] in installed]
        preflight = simulator.runtime_preflight()
        if not preflight["available"]:
            return {"tenantId": tenant, "tested": 0, "passed": 0,
                    "failed": 0, "skipped": len(selected),
                    "reason": preflight["code"], "message": preflight["message"],
                    "results": [], "evidenceType": "LOCAL_SIMULATION",
                    "productionEvidence": False}
        results = []
        for key in selected:
            try:
                results.append(self.simulate(tenant, key))
            except ConsoleError as error:
                results.append({"tenantId": tenant, "workflowKey": key,
                                "status": "SIMULATION_ERROR",
                                "reason": str(error)[:240], "productionEvidence": False})
        return {"tenantId": tenant, "tested": len(results),
                "passed": sum(x["status"] == "SIMULATION_PASS" for x in results),
                "failed": sum(x["status"] != "SIMULATION_PASS" for x in results),
                "skipped": 0,
                "firstFailure": next((x.get("reason") for x in results
                                      if x["status"] != "SIMULATION_PASS"), None),
                "results": results, "evidenceType": "LOCAL_SIMULATION",
                "productionEvidence": False}

    def overview(self) -> dict:
        installed = self.installations()
        catalog = self.catalog()
        return {
            "tenants": self.tenants(), "installations": installed,
            "catalogTotal": len(catalog), "approvedTotal": sum(i["installable"] for i in catalog),
            "installedTotal": len(installed), "blockedTotal": sum(not i["ready"] for i in installed),
            "catalogSeed": self.seed_summary,
            "tenantSeed": self.tenant_seed_summary,
            "productionClaim": False
        }

    def portal(self, tenant: str) -> dict:
        return {"tenantId": valid_tenant(tenant), "workflows": self.installations(tenant),
                "productionClaim": False,
                "notice": "Vista local de demostración. Sin autenticación, datos vivos ni certificación de producción."}


def make_handler(data: ConsoleData, token: str):
    class Handler(BaseHTTPRequestHandler):
        server_version = "AutomationConsoleLocal/0.1"

        def log_message(self, fmt, *args):
            # No query params or JSON request bodies written to logs.
            pass

        def headers_base(self):
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Content-Security-Policy",
                             "default-src 'none'; script-src 'self'; style-src 'self'; "
                             "connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'")

        def respond(self, status: int, body: bytes, content_type: str):
            self.send_response(status)
            self.headers_base()
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def json(self, status: int, obj: object):
            self.respond(status, json.dumps(obj, ensure_ascii=False, allow_nan=False).encode("utf-8"),
                         "application/json; charset=utf-8")

        def guard_host(self):
            port = self.server.server_address[1]
            if self.headers.get("Host") not in (f"127.0.0.1:{port}", f"localhost:{port}"):
                raise ConsoleError("Acceso permitido solo desde localhost.", 403)

        def guard_write(self):
            self.guard_host()
            port = self.server.server_address[1]
            if self.headers.get("Origin") not in (f"http://127.0.0.1:{port}", f"http://localhost:{port}"):
                raise ConsoleError("Origen no autorizado.", 403)
            if not secrets.compare_digest(self.headers.get("X-Console-Token", ""), token):
                raise ConsoleError("Token de sesión local inválido.", 403)
            if self.headers.get("Content-Type", "").split(";")[0].strip() != "application/json":
                raise ConsoleError("Se requiere application/json.", 415)

        def input(self):
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError as exc:
                raise ConsoleError("Longitud inválida.") from exc
            if not 0 < length <= 64 * 1024:
                raise ConsoleError("El payload debe ocupar entre 1 y 65536 bytes.", 413)
            try:
                return json.loads(self.rfile.read(length))
            except (ValueError, UnicodeDecodeError) as exc:
                raise ConsoleError("JSON inválido.") from exc

        def safely(self, fn):
            try:
                self.guard_host()
                fn()
            except (ConsoleError, restaurant_demo.DemoError) as exc:
                self.json(exc.status, {"error": str(exc)})
            except (ValueError, KeyError, FileNotFoundError, FileExistsError) as exc:
                self.json(400, {"error": "Configuración o instalación inválida."})

        def do_GET(self):
            def route():
                uri = urlsplit(self.path)
                path, query = uri.path, parse_qs(uri.query)
                if path in ("/", "/operator", "/portal"):
                    return self.respond(200, (STATIC / "index.html").read_bytes(), "text/html; charset=utf-8")
                if path == "/static/app.js":
                    return self.respond(200, (STATIC / "app.js").read_bytes(), "text/javascript; charset=utf-8")
                if path == "/static/restaurant.js":
                    return self.respond(200, (STATIC / "restaurant.js").read_bytes(), "text/javascript; charset=utf-8")
                if path == "/static/styles.css":
                    return self.respond(200, (STATIC / "styles.css").read_bytes(), "text/css; charset=utf-8")
                if path == "/api/runtime-preflight":
                    return self.json(200, simulator.runtime_preflight())
                if path == "/api/demo/state":
                    return self.json(200, data.restaurant.state())
                if path == "/api/bootstrap":
                    return self.json(200, {"token": token, "mode": "LOCAL_DEMO", "productionClaim": False})
                if path == "/api/overview":
                    return self.json(200, data.overview())
                if path == "/api/catalog":
                    return self.json(200, {"entries": data.catalog()})
                if path == "/api/installation":
                    return self.json(200, data.detail(query.get("tenant", [""])[0], query.get("key", [""])[0]))
                if path == "/api/portal":
                    return self.json(200, data.portal(query.get("tenant", [""])[0]))
                if path == "/api/tenant-plan":
                    return self.json(200, data.tenant_plan(query.get("tenant", [""])[0]))
                if path == "/api/simulation":
                    return self.json(200, {"result": data.last_simulation(
                        query.get("tenant", [""])[0], query.get("key", [""])[0])})
                raise ConsoleError("Ruta no encontrada.", 404)
            self.safely(route)

        def do_POST(self):
            def route():
                self.guard_write()
                action = urlsplit(self.path).path
                if action not in ("/api/install", "/api/simulate", "/api/simulate-all",
                                  "/api/demo/orders", "/api/demo/orders/confirm", "/api/demo/tickets",
                                  "/api/demo/reset"):
                    raise ConsoleError("Ruta no encontrada.", 404)
                body = self.input()
                if not isinstance(body, dict):
                    raise ConsoleError("Objeto JSON requerido.")
                if action == "/api/demo/reset":
                    if body.get("confirm") != "RESET_DEMO_ONLY":
                        raise ConsoleError("Se requiere confirmación explícita para reiniciar la demo.")
                    return self.json(200, data.restaurant.reset())
                if action == "/api/demo/orders":
                    return self.json(201, data.restaurant.create_order(
                        body.get("customerAlias"), body.get("sku"), body.get("quantity")))
                if action == "/api/demo/orders/confirm":
                    return self.json(200, data.restaurant.confirm_order(body.get("orderId")))
                if action == "/api/demo/tickets":
                    return self.json(201, data.restaurant.create_ticket(
                        body.get("subject"), body.get("detail"), body.get("orderId")))
                if action == "/api/simulate":
                    return self.json(200, data.simulate(body.get("tenantId"), body.get("workflowKey")))
                if action == "/api/simulate-all":
                    return self.json(200, data.simulate_all(body.get("tenantId")))
                return self.json(201, data.install(body.get("tenantId"), body.get("workflowKey")))
            self.safely(route)

        def do_PUT(self):
            def route():
                self.guard_write()
                if urlsplit(self.path).path != "/api/config":
                    raise ConsoleError("Ruta no encontrada.", 404)
                query = parse_qs(urlsplit(self.path).query)
                body = self.input()
                if not isinstance(body, dict) or set(body) != {"config", "configVersion"}:
                    raise ConsoleError("Se requiere config y configVersion.")
                return self.json(200, data.update_config(
                    query.get("tenant", [""])[0], query.get("key", [""])[0],
                    body["config"], body["configVersion"]))
            self.safely(route)

    return Handler


def create_server(data: ConsoleData | None = None, port: int = 8765) -> ThreadingHTTPServer:
    data = data or ConsoleData()
    return ThreadingHTTPServer(("127.0.0.1", port), make_handler(data, secrets.token_urlsafe(32)))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--installations-root", type=Path, default=ROOT / ".local/installations")
    parser.add_argument("--catalog-db", type=Path, help="SQLite catalog location (default: .local/console/catalog.sqlite3)")
    parser.add_argument("--seed-tenant", default="chifaavperu",
                        help="Seed all 233 references + 12 DRAFT baselines for this local tenant")
    parser.add_argument("--no-tenant-seed", action="store_true",
                        help="Do not seed a client workspace on startup")
    parser.add_argument("--skip-startup-simulations", action="store_true",
                        help="Do not run synthetic local tests at launch")
    args = parser.parse_args()
    data = ConsoleData(args.installations_root, args.catalog_db,
                       None if args.no_tenant_seed else args.seed_tenant)
    print(f"Catalog seed: {data.seed_summary['catalogTotal']} workflows "
          f"({data.seed_summary['approvedTotal']} approved, "
          f"{data.seed_summary['designReadyTotal']} design-ready; "
          f"{data.seed_summary['inserted']} inserted, "
          f"{data.seed_summary['updated']} updated)", flush=True)
    if data.tenant_seed_summary:
        s = data.tenant_seed_summary
        print(f"Tenant {s['tenantId']}: {s['catalogAssigned']} catalog references, "
              f"{s['newDraftBundles']} new DRAFT bundles, "
              f"{s['existingBundlesPreserved']} preserved, "
              f"{s['designOnly']} design-only. No production activation.", flush=True)
    if data.tenant_seed_summary and not args.skip_startup_simulations:
        summary = data.simulate_all(data.tenant_seed_summary["tenantId"])
        data.tenant_seed_summary["simulationSummary"] = {
            "tested": summary["tested"], "passed": summary["passed"],
            "failed": summary["failed"], "skipped": summary.get("skipped", 0),
            "reason": summary.get("reason") or summary.get("firstFailure"),
            "evidenceType": "LOCAL_SIMULATION", "productionEvidence": False,
        }
        print(f"LOCAL_SIMULATION: {summary['passed']}/{summary['tested']} PASS, "
              f"{summary['failed']} failed, {summary.get('skipped', 0)} skipped. "
              f"Reason: {summary.get('reason') or summary.get('firstFailure') or 'none'}. "
              "No real providers.", flush=True)
    server = create_server(data, args.port)
    port = server.server_address[1]
    print(f"Operator Console LOCAL DEMO → http://127.0.0.1:{port}", flush=True)
    print("No autenticación ni ejecución real. No exponer por proxy o internet.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
