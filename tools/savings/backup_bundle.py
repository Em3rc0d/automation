#!/usr/bin/env python3
"""Create, verify and restore secret-free local Savings installation backups.

Scope: installation bundle + local runtime/audit evidence. This is not a
production PostgreSQL/Supabase control-plane backup.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import stat
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

SECRET_PATTERNS = [
    re.compile(rb"sk-[A-Za-z0-9_-]{12,}"),
    re.compile(rb"AKIA[0-9A-Z]{16}"),
    re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(rb'"(?:access_token|refresh_token|client_secret|api_key|password)"\s*:\s*"[^"]+"', re.I),
]
FORBIDDEN_NAMES = {".env", "id_rsa", "id_ed25519"}
FORBIDDEN_SUFFIXES = {".pem", ".key", ".p12", ".pfx"}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def safe_relative(path: str) -> PurePosixPath:
    rel = PurePosixPath(path)
    if rel.is_absolute() or ".." in rel.parts or not rel.parts:
        raise ValueError(f"unsafe archive path: {path}")
    return rel


def scan_secret_material(rel: str, data: bytes) -> None:
    path = PurePosixPath(rel)
    if path.name in FORBIDDEN_NAMES or path.suffix.lower() in FORBIDDEN_SUFFIXES:
        raise ValueError(f"refusing secret-bearing filename: {rel}")
    for pattern in SECRET_PATTERNS:
        if pattern.search(data):
            raise ValueError(f"secret-like material detected in {rel}")


def collect_bundle(bundle: Path) -> tuple[dict, list[tuple[str, bytes, int]]]:
    installation_path = bundle / "installation.json"
    if not installation_path.is_file():
        raise ValueError("bundle missing installation.json")
    installation = read_json(installation_path)
    required = ["installationId", "tenantId", "workflowKey", "workflowVersion"]
    for field in required:
        if not installation.get(field):
            raise ValueError(f"installation.json missing {field}")

    files: list[tuple[str, bytes, int]] = []
    for path in sorted(bundle.rglob("*")):
        if path.is_symlink():
            raise ValueError(f"symlinks are not allowed in backup: {path.relative_to(bundle)}")
        if not path.is_file():
            continue
        rel = path.relative_to(bundle).as_posix()
        safe_relative(rel)
        data = path.read_bytes()
        scan_secret_material(rel, data)
        mode = stat.S_IMODE(path.stat().st_mode)
        files.append((rel, data, mode))
    if not files:
        raise ValueError("bundle has no files")
    return installation, files


def create_backup(bundle: Path, archive: Path, *, created_at: str | None = None) -> dict:
    bundle = bundle.resolve()
    archive = archive.resolve()
    installation, files = collect_bundle(bundle)
    created_at = created_at or now_iso()

    manifest = {
        "schemaVersion": 1,
        "backupType": "SAVINGS_LOCAL_INSTALLATION_BUNDLE",
        "createdAt": created_at,
        "installation": {
            key: installation[key]
            for key in ["installationId", "tenantId", "workflowKey", "workflowVersion"]
        },
        "sourceState": installation.get("state"),
        "secretMaterialIncluded": False,
        "productionControlPlaneBackup": False,
        "files": [
            {
                "path": rel,
                "sha256": sha256_bytes(data),
                "size": len(data),
                "mode": mode,
            }
            for rel, data, mode in files
        ],
        "boundary": (
            "Backs up the local installation bundle/runtime evidence only. "
            "It is not evidence of PostgreSQL/Supabase production backup readiness."
        ),
    }
    manifest_bytes = (json.dumps(manifest, indent=2, ensure_ascii=False, sort_keys=True) + "\n").encode("utf-8")

    archive.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for rel, data, mode in files:
            info = zipfile.ZipInfo(rel, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (mode & 0xFFFF) << 16
            zf.writestr(info, data)
        info = zipfile.ZipInfo("BACKUP-MANIFEST.json", date_time=(1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o600 << 16
        zf.writestr(info, manifest_bytes)

    archive_sha = hashlib.sha256(archive.read_bytes()).hexdigest()
    sidecar = archive.with_suffix(archive.suffix + ".sha256")
    sidecar.write_text(f"{archive_sha}  {archive.name}\n", encoding="utf-8")
    return {
        "archive": str(archive),
        "sha256": archive_sha,
        "sidecar": str(sidecar),
        "fileCount": len(files),
        "installation": manifest["installation"],
        "productionControlPlaneBackup": False,
    }


def verify_backup(archive: Path) -> dict:
    archive = archive.resolve()
    if not archive.is_file():
        raise FileNotFoundError(archive)
    with zipfile.ZipFile(archive, "r") as zf:
        names = zf.namelist()
        if "BACKUP-MANIFEST.json" not in names:
            raise ValueError("backup missing BACKUP-MANIFEST.json")
        if len(names) != len(set(names)):
            raise ValueError("backup contains duplicate archive paths")
        for name in names:
            safe_relative(name)

        manifest = json.loads(zf.read("BACKUP-MANIFEST.json"))
        expected = {item["path"]: item for item in manifest.get("files", [])}
        actual_names = set(names) - {"BACKUP-MANIFEST.json"}
        if actual_names != set(expected):
            raise ValueError("backup file inventory does not match manifest")

        for name, entry in expected.items():
            data = zf.read(name)
            scan_secret_material(name, data)
            digest = sha256_bytes(data)
            if digest != entry.get("sha256"):
                raise ValueError(f"hash mismatch for {name}")
            if len(data) != entry.get("size"):
                raise ValueError(f"size mismatch for {name}")

    return {
        "valid": True,
        "archive": str(archive),
        "sha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
        "fileCount": len(expected),
        "installation": manifest.get("installation"),
        "productionControlPlaneBackup": manifest.get("productionControlPlaneBackup"),
    }


def restore_backup(archive: Path, target: Path) -> dict:
    verification = verify_backup(archive)
    target = target.resolve()
    if target.exists() and any(target.iterdir()):
        raise FileExistsError(f"restore target is not empty: {target}")
    target.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(archive.resolve(), "r") as zf:
        manifest = json.loads(zf.read("BACKUP-MANIFEST.json"))
        entries = {item["path"]: item for item in manifest["files"]}
        for name, entry in entries.items():
            rel = safe_relative(name)
            dest = target.joinpath(*rel.parts)
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(zf.read(name))
            mode = int(entry.get("mode", 0o600))
            dest.chmod(mode)

    # Re-scan the restored tree independently.
    restored_installation, restored_files = collect_bundle(target)
    if len(restored_files) != verification["fileCount"]:
        shutil.rmtree(target)
        raise ValueError("restored file count mismatch")
    return {
        "restored": True,
        "target": str(target),
        "fileCount": len(restored_files),
        "installation": {
            key: restored_installation[key]
            for key in ["installationId", "tenantId", "workflowKey", "workflowVersion"]
        },
        "productionControlPlaneRestore": False,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="command", required=True)

    create = sub.add_parser("create")
    create.add_argument("--bundle", type=Path, required=True)
    create.add_argument("--out", type=Path, required=True)

    verify = sub.add_parser("verify")
    verify.add_argument("--archive", type=Path, required=True)

    restore = sub.add_parser("restore")
    restore.add_argument("--archive", type=Path, required=True)
    restore.add_argument("--target", type=Path, required=True)

    args = ap.parse_args()
    try:
        if args.command == "create":
            result = create_backup(args.bundle, args.out)
        elif args.command == "verify":
            result = verify_backup(args.archive)
        else:
            result = restore_backup(args.archive, args.target)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0
    except (ValueError, FileNotFoundError, FileExistsError, json.JSONDecodeError, zipfile.BadZipFile) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
