#!/usr/bin/env python3
"""Create, verify and restore local Savings installation backups without external dependencies."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

FORBIDDEN_NAMES = [
    re.compile(r"(^|/)(?:\.env(?:\..*)?|credentials?[^/]*|secrets?[^/]*)(?:$|/)", re.I),
    re.compile(r"\.(?:pem|key|p12|pfx)$", re.I),
]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def is_forbidden(rel: str) -> bool:
    normalized = rel.replace("\\", "/")
    return any(pattern.search(normalized) for pattern in FORBIDDEN_NAMES)


def collect_files(bundle: Path) -> list[dict]:
    if not bundle.is_dir():
        raise ValueError(f"bundle does not exist: {bundle}")
    entries: list[dict] = []
    for path in sorted(bundle.rglob("*")):
        if path.is_symlink():
            raise ValueError(f"backup refuses symlink: {path.relative_to(bundle)}")
        if not path.is_file():
            continue
        rel = path.relative_to(bundle).as_posix()
        if is_forbidden(rel):
            raise ValueError(f"backup refuses secret-like file path: {rel}")
        entries.append({
            "path": rel,
            "size": path.stat().st_size,
            "sha256": sha256_file(path),
        })
    if not entries:
        raise ValueError("bundle has no files")
    return entries


def identity(bundle: Path) -> dict:
    installation = bundle / "installation.json"
    if not installation.is_file():
        raise ValueError("installation.json missing")
    doc = json.loads(installation.read_text(encoding="utf-8"))
    required = ["tenantId", "installationId", "workflowKey", "workflowVersion"]
    missing = [key for key in required if not doc.get(key)]
    if missing:
        raise ValueError(f"installation identity incomplete: {missing}")
    return {key: doc[key] for key in required}


def create_backup(bundle: Path, archive: Path, created_at: str | None = None) -> dict:
    bundle = bundle.resolve()
    archive = archive.resolve()
    entries = collect_files(bundle)
    manifest = {
        "schemaVersion": 1,
        "createdAt": created_at or now_iso(),
        "bundleName": bundle.name,
        **identity(bundle),
        "entries": entries,
        "secretMaterialIncluded": False,
    }

    archive.parent.mkdir(parents=True, exist_ok=True)
    if archive.exists():
        raise FileExistsError(f"backup already exists: {archive}")

    with tempfile.TemporaryDirectory(prefix="savings-backup-") as tmp:
        staging = Path(tmp)
        manifest_path = staging / "BACKUP-MANIFEST.json"
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        with tarfile.open(archive, "w:gz", format=tarfile.PAX_FORMAT) as tar:
            tar.add(manifest_path, arcname="BACKUP-MANIFEST.json", recursive=False)
            for entry in entries:
                source = bundle / entry["path"]
                tar.add(source, arcname=f"bundle/{entry['path']}", recursive=False)
    os.chmod(archive, 0o600)
    return manifest


def safe_member_path(name: str) -> PurePosixPath:
    path = PurePosixPath(name)
    if path.is_absolute() or ".." in path.parts:
        raise ValueError(f"unsafe archive path: {name}")
    return path


def read_archive_manifest(archive: Path) -> tuple[dict, dict[str, tarfile.TarInfo]]:
    if not archive.is_file():
        raise ValueError(f"backup does not exist: {archive}")
    with tarfile.open(archive, "r:gz") as tar:
        members = {}
        for member in tar.getmembers():
            safe_member_path(member.name)
            if member.issym() or member.islnk():
                raise ValueError(f"backup contains link: {member.name}")
            members[member.name] = member
        info = members.get("BACKUP-MANIFEST.json")
        if not info or not info.isfile():
            raise ValueError("BACKUP-MANIFEST.json missing")
        handle = tar.extractfile(info)
        if handle is None:
            raise ValueError("cannot read BACKUP-MANIFEST.json")
        manifest = json.loads(handle.read().decode("utf-8"))
    return manifest, members


def verify_backup(archive: Path) -> dict:
    manifest, members = read_archive_manifest(archive)
    entries = manifest.get("entries")
    if not isinstance(entries, list) or not entries:
        raise ValueError("backup manifest entries missing")

    checked = 0
    with tarfile.open(archive, "r:gz") as tar:
        for entry in entries:
            rel = entry.get("path")
            if not isinstance(rel, str) or not rel:
                raise ValueError("backup manifest entry path invalid")
            if is_forbidden(rel):
                raise ValueError(f"backup manifest contains forbidden path: {rel}")
            member_name = f"bundle/{rel}"
            info = members.get(member_name)
            if not info or not info.isfile():
                raise ValueError(f"backup member missing: {rel}")
            handle = tar.extractfile(info)
            if handle is None:
                raise ValueError(f"cannot read backup member: {rel}")
            raw = handle.read()
            digest = hashlib.sha256(raw).hexdigest()
            if digest != entry.get("sha256"):
                raise ValueError(f"backup hash mismatch: {rel}")
            if len(raw) != entry.get("size"):
                raise ValueError(f"backup size mismatch: {rel}")
            checked += 1

    return {
        "valid": True,
        "tenantId": manifest.get("tenantId"),
        "installationId": manifest.get("installationId"),
        "workflowKey": manifest.get("workflowKey"),
        "workflowVersion": manifest.get("workflowVersion"),
        "filesChecked": checked,
        "secretMaterialIncluded": manifest.get("secretMaterialIncluded"),
    }


def restore_backup(archive: Path, destination: Path) -> Path:
    verification = verify_backup(archive)
    if verification.get("secretMaterialIncluded") is not False:
        raise ValueError("refusing backup that does not explicitly declare secretMaterialIncluded=false")
    destination = destination.resolve()
    if destination.exists():
        raise FileExistsError(f"restore destination already exists: {destination}")

    manifest, members = read_archive_manifest(archive)
    destination.mkdir(parents=True, mode=0o700)
    try:
        with tarfile.open(archive, "r:gz") as tar:
            for entry in manifest["entries"]:
                rel = PurePosixPath(entry["path"])
                target = destination.joinpath(*rel.parts)
                target.parent.mkdir(parents=True, exist_ok=True)
                info = members[f"bundle/{entry['path']}"]
                handle = tar.extractfile(info)
                if handle is None:
                    raise ValueError(f"cannot extract: {entry['path']}")
                target.write_bytes(handle.read())
                os.chmod(target, 0o600)

        restored_identity = identity(destination)
        for key in ["tenantId", "installationId", "workflowKey", "workflowVersion"]:
            if restored_identity[key] != manifest.get(key):
                raise ValueError(f"restored identity mismatch: {key}")

        restored_entries = {item["path"]: item for item in collect_files(destination)}
        for entry in manifest["entries"]:
            actual = restored_entries.get(entry["path"])
            if not actual or actual["sha256"] != entry["sha256"]:
                raise ValueError(f"restore verification failed: {entry['path']}")
    except Exception:
        shutil.rmtree(destination, ignore_errors=True)
        raise
    return destination


def parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="command", required=True)

    create = sub.add_parser("create")
    create.add_argument("--bundle", type=Path, required=True)
    create.add_argument("--out", type=Path, required=True)
    create.add_argument("--created-at")

    verify = sub.add_parser("verify")
    verify.add_argument("--archive", type=Path, required=True)

    restore = sub.add_parser("restore")
    restore.add_argument("--archive", type=Path, required=True)
    restore.add_argument("--out", type=Path, required=True)

    return ap


def main() -> int:
    args = parser().parse_args()
    try:
        if args.command == "create":
            result = create_backup(args.bundle, args.out, args.created_at)
            print(json.dumps(result, indent=2))
            return 0
        if args.command == "verify":
            result = verify_backup(args.archive)
            print(json.dumps(result, indent=2))
            return 0
        if args.command == "restore":
            result = restore_backup(args.archive, args.out)
            print(result)
            return 0
    except (ValueError, FileExistsError, tarfile.TarError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    return 1


if __name__ == "__main__":
    sys.exit(main())
