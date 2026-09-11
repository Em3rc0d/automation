#!/usr/bin/env python3
"""Bulk index n8n workflow corpora without deleting or approving anything.

The indexer is intentionally conservative. It produces metadata and risk flags,
not production approval. External raw JSON stays in the local corpus/cache unless
its redistribution/provenance gate is separately satisfied.

It records two identities:
- sha256: exact file identity;
- semantic_fingerprint: normalized identity with volatile n8n export metadata
  removed, used to detect duplicate/near-identical workflows across corpora.

Usage:
  python index_workflow_corpus.py \
    --source-dir .external-cache/some-corpus \
    --source-id some-corpus \
    --source-url https://github.com/owner/repo \
    --source-commit <sha> \
    --license-status UNKNOWN \
    --output-dir mined/some-corpus
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Iterable

EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
URL_RE = re.compile(r"https?://[^\s\"'<>]+", re.I)
GOOGLE_SHEET_RE = re.compile(r"docs\.google\.com/spreadsheets/d/([A-Za-z0-9_-]{20,})")
SECRET_KEY_RE = re.compile(
    r"(?i)(api[_-]?key|secret|token|password|authorization|bearer|client[_-]?secret)"
)

TRIGGER_HINTS = (
    "trigger",
    "webhook",
    "schedule",
    "cron",
    "formtrigger",
    "chatTrigger",
)

SIDE_EFFECT_HINTS = (
    "gmail",
    "slack",
    "microsoftOutlook",
    "hubspot",
    "pipedrive",
    "quickbooks",
    "jira",
    "notion",
    "googleSheets",
    "googleCalendar",
    "stripe",
    "airtable",
    "facebookLeadAds",
    "twilio",
    "sendgrid",
)

DOMAIN_KEYWORDS = {
    "LEAD": ("lead", "prospect", "pipedrive", "hubspot", "facebooklead"),
    "QUOTE": ("quote", "quotation", "proposal"),
    "INVOICE": ("invoice", "billing", "quickbooks"),
    "PAYMENT": ("payment", "stripe", "collection", "overdue"),
    "EMAIL": ("email", "gmail", "outlook", "imap", "mail"),
    "APPOINTMENT": ("appointment", "calendar", "booking", "acuity", "calendly"),
    "SUPPORT": ("support", "ticket", "jira", "freshdesk", "zendesk"),
    "REPORTING": ("report", "kpi", "analytics", "dashboard", "summary"),
    "ONBOARDING": ("onboarding", "welcome", "new client", "new customer"),
    "DOCUMENT": ("document", "ocr", "pdf", "extract", "receipt"),
    "RETENTION": ("review", "nps", "survey", "reactivation", "abandoned"),
}

CURRENT_P0 = {"LEAD", "INVOICE", "PAYMENT", "EMAIL", "APPOINTMENT", "SUPPORT"}
CURRENT_P1 = {"QUOTE", "REPORTING", "ONBOARDING", "DOCUMENT", "RETENTION"}

# Fields that commonly change between n8n exports without changing business logic.
# We remove these only for duplicate discovery, never from the original file/evidence.
VOLATILE_KEYS = {
    "id",
    "instanceId",
    "versionId",
    "webhookId",
    "position",
    "credentials",
    "pinData",
    "cachedResultUrl",
    "cachedResultName",
    "createdAt",
    "updatedAt",
}
TOP_LEVEL_VOLATILE_KEYS = {
    "id",
    "meta",
    "versionId",
    "pinData",
    "active",
    "tags",
}


@dataclass
class Candidate:
    source_id: str
    source_url: str
    source_commit: str | None
    source_license_status: str
    relative_path: str
    sha256: str
    parse_status: str
    semantic_fingerprint: str | None = None
    workflow_name: str | None = None
    workflow_id: str | None = None
    active: bool | None = None
    node_count: int = 0
    node_types: list[str] = field(default_factory=list)
    trigger_types: list[str] = field(default_factory=list)
    credential_types: list[str] = field(default_factory=list)
    community_node_types: list[str] = field(default_factory=list)
    domains: list[str] = field(default_factory=list)
    priority: str = "P2"
    ai_present: bool = False
    http_present: bool = False
    side_effect_node_types: list[str] = field(default_factory=list)
    findings: list[str] = field(default_factory=list)
    hardcoded_urls: list[str] = field(default_factory=list)
    hardcoded_emails: list[str] = field(default_factory=list)
    google_sheet_ids: list[str] = field(default_factory=list)
    placeholders: list[str] = field(default_factory=list)
    initial_stage: str = "DISCOVERED"
    deleted: bool = False


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def walk_values(value: Any) -> Iterable[Any]:
    if isinstance(value, dict):
        for k, v in value.items():
            yield k
            yield from walk_values(v)
    elif isinstance(value, list):
        for item in value:
            yield from walk_values(item)
    else:
        yield value


def canonicalize_for_fingerprint(value: Any, *, top_level: bool = False) -> Any:
    """Return a deterministic copy stripped of common export-only metadata.

    This is a duplicate-discovery heuristic, not a proof of semantic equivalence.
    The original file SHA/path/source are always retained independently.
    """
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for key in sorted(value.keys()):
            if top_level and key in TOP_LEVEL_VOLATILE_KEYS:
                continue
            if key in VOLATILE_KEYS:
                continue
            out[key] = canonicalize_for_fingerprint(value[key], top_level=False)
        return out
    if isinstance(value, list):
        return [canonicalize_for_fingerprint(item, top_level=False) for item in value]
    return value


def semantic_fingerprint(data: dict[str, Any]) -> str:
    canonical = canonicalize_for_fingerprint(data, top_level=True)
    encoded = json.dumps(
        canonical,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def detect_domains(path: str, data: dict[str, Any]) -> list[str]:
    haystack = " ".join(
        [
            path,
            str(data.get("name", "")),
            " ".join(str(n.get("name", "")) for n in data.get("nodes", []) if isinstance(n, dict)),
            " ".join(str(n.get("type", "")) for n in data.get("nodes", []) if isinstance(n, dict)),
        ]
    ).lower()
    domains = []
    for domain, keywords in DOMAIN_KEYWORDS.items():
        if any(k.lower() in haystack for k in keywords):
            domains.append(domain)
    return sorted(domains)


def priority_for(domains: list[str]) -> str:
    if any(d in CURRENT_P0 for d in domains):
        return "P0"
    if any(d in CURRENT_P1 for d in domains):
        return "P1"
    return "P2"


def inspect_workflow(path: Path, root: Path, args: argparse.Namespace) -> Candidate:
    rel = path.relative_to(root).as_posix()
    digest = sha256_file(path)
    candidate = Candidate(
        source_id=args.source_id,
        source_url=args.source_url,
        source_commit=args.source_commit,
        source_license_status=args.license_status,
        relative_path=rel,
        sha256=digest,
        parse_status="unknown",
    )

    try:
        raw_text = path.read_text(encoding="utf-8")
        data = json.loads(raw_text)
    except Exception as exc:  # preserve malformed candidates too
        candidate.parse_status = "invalid_json"
        candidate.findings.append(f"parse_error:{type(exc).__name__}")
        return candidate

    if not isinstance(data, dict) or not isinstance(data.get("nodes"), list):
        candidate.parse_status = "not_n8n_workflow_shape"
        return candidate

    candidate.parse_status = "parsed"
    candidate.semantic_fingerprint = semantic_fingerprint(data)
    candidate.workflow_name = str(data.get("name")) if data.get("name") is not None else None
    candidate.workflow_id = str(data.get("id")) if data.get("id") is not None else None
    candidate.active = data.get("active") if isinstance(data.get("active"), bool) else None

    nodes = [n for n in data.get("nodes", []) if isinstance(n, dict)]
    candidate.node_count = len(nodes)
    node_types = sorted({str(n.get("type")) for n in nodes if n.get("type")})
    candidate.node_types = node_types

    candidate.trigger_types = sorted(
        {
            t
            for t in node_types
            if any(h.lower() in t.lower() for h in TRIGGER_HINTS)
        }
    )

    credentials = set()
    explicit_credential_refs = False
    for node in nodes:
        creds = node.get("credentials")
        if isinstance(creds, dict):
            credentials.update(str(k) for k in creds.keys())
            if creds:
                explicit_credential_refs = True
    candidate.credential_types = sorted(credentials)
    if explicit_credential_refs:
        candidate.findings.append("export_contains_credential_references")

    candidate.community_node_types = sorted(
        {
            t
            for t in node_types
            if not (
                t.startswith("n8n-nodes-base.")
                or t.startswith("@n8n/n8n-nodes-langchain.")
            )
        }
    )
    if candidate.community_node_types:
        candidate.findings.append("community_or_noncore_nodes_present")

    candidate.ai_present = any(
        token in t.lower()
        for t in node_types
        for token in ("openai", "langchain", "agent", "llm", "anthropic", "gemini")
    )
    candidate.http_present = any("httprequest" in t.lower() for t in node_types)

    side_effects = set()
    for node in nodes:
        t = str(node.get("type", ""))
        if any(h.lower() in t.lower() for h in SIDE_EFFECT_HINTS):
            side_effects.add(t)
        if "httprequest" in t.lower():
            params = node.get("parameters", {})
            if isinstance(params, dict):
                method = str(params.get("method", "GET")).upper()
                if method not in {"GET", "HEAD", "OPTIONS"}:
                    side_effects.add(t)
    candidate.side_effect_node_types = sorted(side_effects)

    serialized = json.dumps(data, ensure_ascii=False)
    lowered = serialized.lower()

    if '"allowunauthorizedcerts": true' in lowered:
        candidate.findings.append("tls_verification_can_be_disabled")
    if "sendandwait" in lowered or "approval" in lowered:
        candidate.findings.append("human_approval_pattern_present")
    if "wait" in " ".join(node_types).lower():
        candidate.findings.append("wait_or_delayed_followup_pattern_present")
    if "errortrigger" in " ".join(node_types).lower():
        candidate.findings.append("error_trigger_present")
    if "workflowstaticdata" in lowered:
        candidate.findings.append("workflow_static_data_used")
    if "processrecord" in lowered or "executionevent" in lowered:
        candidate.findings.append("platform_contract_terms_present")

    urls = sorted(set(URL_RE.findall(serialized)))
    candidate.hardcoded_urls = urls[:30]
    if urls:
        candidate.findings.append("hardcoded_urls_present")

    emails = sorted(set(EMAIL_RE.findall(serialized)))
    candidate.hardcoded_emails = emails[:30]
    if emails:
        candidate.findings.append("email_literals_present")

    sheet_ids = sorted(set(GOOGLE_SHEET_RE.findall(serialized)))
    candidate.google_sheet_ids = sheet_ids[:20]
    if sheet_ids:
        candidate.findings.append("google_sheet_ids_present")

    placeholder_tokens = []
    for token in ("YOUR_", "[UPDATE ME]", "example.com", "<name>", "<company>", "PLACEHOLDER"):
        if token.lower() in lowered:
            placeholder_tokens.append(token)
    candidate.placeholders = placeholder_tokens
    if placeholder_tokens:
        candidate.findings.append("placeholders_present")

    # Heuristic only: flag suspicious secret-key names combined with scalar-looking values.
    for node in nodes:
        params = node.get("parameters")
        if not isinstance(params, dict):
            continue
        for key, value in params.items():
            if SECRET_KEY_RE.search(str(key)) and isinstance(value, str) and len(value) >= 12:
                # n8n expressions/placeholders are not treated as literal secrets.
                if not value.startswith("={{") and "YOUR_" not in value and "UPDATE" not in value.upper():
                    candidate.findings.append("possible_literal_secret_in_parameters")
                    break

    candidate.domains = detect_domains(rel, data)
    candidate.priority = priority_for(candidate.domains)
    return candidate


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", required=True)
    parser.add_argument("--source-id", required=True)
    parser.add_argument("--source-url", required=True)
    parser.add_argument("--source-commit")
    parser.add_argument("--license-status", default="UNKNOWN")
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    root = Path(args.source_dir).resolve()
    out = Path(args.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)

    paths = sorted(p for p in root.rglob("*.json") if p.is_file())
    candidates = [inspect_workflow(p, root, args) for p in paths]

    jsonl_path = out / "candidates.jsonl"
    with jsonl_path.open("w", encoding="utf-8") as f:
        for candidate in candidates:
            f.write(json.dumps(asdict(candidate), ensure_ascii=False, sort_keys=True) + "\n")

    parsed = [c for c in candidates if c.parse_status == "parsed"]
    priority_counts = Counter(c.priority for c in parsed)
    domain_counts = Counter(d for c in parsed for d in c.domains)
    node_counts = Counter(t for c in parsed for t in c.node_types)
    finding_counts = Counter(x for c in parsed for x in c.findings)

    fingerprint_groups: dict[str, list[Candidate]] = defaultdict(list)
    for candidate in parsed:
        if candidate.semantic_fingerprint:
            fingerprint_groups[candidate.semantic_fingerprint].append(candidate)
    duplicate_groups = {
        fp: group for fp, group in fingerprint_groups.items() if len(group) > 1
    }

    duplicate_report = [
        {
            "semantic_fingerprint": fp,
            "count": len(group),
            "paths": [c.relative_path for c in group],
            "exact_sha256s": sorted({c.sha256 for c in group}),
        }
        for fp, group in sorted(
            duplicate_groups.items(), key=lambda item: (-len(item[1]), item[0])
        )
    ]
    (out / "duplicate-groups.json").write_text(
        json.dumps(duplicate_report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    summary = {
        "source": {
            "id": args.source_id,
            "url": args.source_url,
            "commit": args.source_commit,
            "license_status": args.license_status,
        },
        "counts": {
            "json_files_seen": len(paths),
            "parsed_n8n_workflows": len(parsed),
            "invalid_or_other_json": len(candidates) - len(parsed),
            "semantic_fingerprints": len(fingerprint_groups),
            "duplicate_semantic_groups": len(duplicate_groups),
            "duplicate_files_in_groups": sum(len(g) for g in duplicate_groups.values()),
            "deleted": 0,
            "priority": dict(sorted(priority_counts.items())),
        },
        "top_domains": domain_counts.most_common(30),
        "top_node_types": node_counts.most_common(50),
        "top_findings": finding_counts.most_common(30),
        "policy": {
            "approval_performed": False,
            "failed_candidates_deleted": False,
            "duplicate_sources_deleted": False,
            "raw_external_code_copied_to_public_repo": False,
            "semantic_fingerprint_is_heuristic": True,
        },
    }
    (out / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
