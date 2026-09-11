#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
EXPECTED={
("platform","EXECUTION_TELEMETRY"),("platform","ERROR_TO_INCIDENT"),("platform","SAVINGS_EVENT_EMIT"),("platform","APPROVAL_REQUEST"),("platform","HUMAN_REVIEW_TASK"),
("revenue","LEAD_CAPTURE"),("revenue","LEAD_NORMALIZE"),("revenue","LEAD_DEDUPE"),("revenue","CRM_UPSERT_CONTACT"),("revenue","LEAD_ACKNOWLEDGE"),("revenue","LEAD_FOLLOWUP_WATCHDOG")
}
ROOTS={
"HARDENED":ROOT/"quarries/workflow-quarry/30-hardened",
"TESTED":ROOT/"quarries/workflow-quarry/40-tested",
"APPROVED":ROOT/"quarries/workflow-quarry/50-approved-baseline",
"LIBRARY":ROOT/"workflows/n8n",
}

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()

def scan(root):
    out={}
    if not root.exists(): return out
    for wf in root.rglob("workflow.json"):
        d=json.loads(wf.read_text()); key=d.get("meta",{}).get("candidateKey")
        if key: out[(wf.parent.parent.name,key)]=wf.parent
    return out

def main():
    errors=[]; maps={name:scan(path) for name,path in ROOTS.items()}
    for stage,m in maps.items():
        keys=set(m); miss=EXPECTED-keys; extra=keys-EXPECTED
        if miss: errors.append(f"{stage} missing {sorted(miss)}")
        if extra: errors.append(f"{stage} unexpected {sorted(extra)}")
    for item in sorted(EXPECTED):
        fam,key=item
        if any(item not in maps[s] for s in maps): continue
        h,t,a,l=(maps[s][item] for s in ("HARDENED","TESTED","APPROVED","LIBRARY"))
        if len({sha(x/"workflow.json") for x in (h,t,a,l)})!=1: errors.append(f"{key} workflow hash drift across lifecycle")
        report=t/"evidence/TEST-REPORT.md"
        if not report.is_file() or "VERDICT: PASS" not in report.read_text(): errors.append(f"{key} missing passing TEST-REPORT")
        for p,label in ((a,"APPROVED"),(l,"LIBRARY")):
            if not (p/"PROMOTION.md").is_file(): errors.append(f"{key} {label} missing PROMOTION.md")
        if any(n.get("credentials") for n in json.loads((l/"workflow.json").read_text()).get("nodes",[])): errors.append(f"{key} library has bound credentials")
    if errors:
        print("W1 RELEASE VALIDATION: FAIL")
        for e in errors: print("-",e)
        return 1
    print("W1 RELEASE VALIDATION: PASS")
    for stage,m in maps.items(): print(f"{stage}={len(m)}")
    print("approved/library workflow hashes match tested/hardened sources")
    return 0

if __name__=="__main__": sys.exit(main())
