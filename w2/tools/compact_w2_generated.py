#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HARD = ROOT / "quarries/workflow-quarry/30-hardened"
EXPECTED = {
    "OMNICHANNEL_DOCUMENT_INTAKE","MEDIA_FETCH_GUARD","DOCUMENT_PROVENANCE_STORE","DOCUMENT_CLASSIFY_CONFIDENCE",
    "DOCUMENT_EXTRACT_SMART","FINANCIAL_DOCUMENT_VALIDATE","DOCUMENT_DEDUPE_COMPOSITE","ACCOUNTING_DOCUMENT_NORMALIZE",
    "REVIEW_EXCEPTION_ORCHESTRATOR","ACCOUNTING_EXPORT_DISPATCH","INTAKE_ACKNOWLEDGE",
}
FIRST = "OMNICHANNEL_DOCUMENT_INTAKE"
RETURN = "return [{json:out}];"


def isolate(code: str, key: str) -> str:
    first_marker = f"if(KEY==='{FIRST}'){{"
    first_at = code.find(first_marker)
    if first_at < 0:
        raise ValueError("shared W2 branch block not found")
    preamble = code[:first_at].rstrip()

    marker = f"if(KEY==='{key}'){{" if key == FIRST else f"else if(KEY==='{key}'){{"
    at = code.find(marker)
    if at < 0:
        raise ValueError(f"branch marker not found for {key}")
    body_start = at + len(marker)

    next_at = code.find("\nelse if(KEY===", body_start)
    return_at = code.find(RETURN, body_start)
    if return_at < 0:
        raise ValueError(f"return marker not found for {key}")
    end = next_at if next_at >= 0 and next_at < return_at else return_at
    segment = code[body_start:end].rstrip()
    if not segment.endswith("}"):
        raise ValueError(f"branch terminator not found for {key}")
    body = segment[:-1].rstrip()

    isolated = preamble + "\n" + body + "\n" + RETURN + "\n"
    if "else if(KEY===" in isolated:
        raise ValueError(f"foreign branch remains in {key}")
    foreign = sorted(k for k in EXPECTED if k != key and k in isolated)
    if foreign:
        raise ValueError(f"foreign capability names remain in {key}: {foreign}")
    return isolated


def main() -> None:
    seen = set()
    for wf in sorted(HARD.rglob("workflow.json")):
        data = json.loads(wf.read_text(encoding="utf-8"))
        meta = data.get("meta", {})
        key = meta.get("candidateKey")
        if meta.get("wave") != "W2" or key not in EXPECTED:
            continue
        logic_nodes = [n for n in data.get("nodes", []) if n.get("type") == "n8n-nodes-base.code"]
        if len(logic_nodes) != 1:
            raise SystemExit(f"{key}: expected exactly one business-logic Code node, got {len(logic_nodes)}")
        old = logic_nodes[0].get("parameters", {}).get("jsCode", "")
        new = isolate(old, key)
        logic_nodes[0]["parameters"]["jsCode"] = new
        wf.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        seen.add(key)
        print(f"W2 LOGIC ISOLATED: {key} {len(old)} -> {len(new)} chars")
    if seen != EXPECTED:
        raise SystemExit(f"W2 compaction set mismatch missing={sorted(EXPECTED-seen)} extra={sorted(seen-EXPECTED)}")
    print("W2 COMPONENT ISOLATION: PASS 11/11")


if __name__ == "__main__":
    main()
