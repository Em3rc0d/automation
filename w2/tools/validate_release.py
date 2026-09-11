#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
EXPECTED={
'OMNICHANNEL_DOCUMENT_INTAKE','MEDIA_FETCH_GUARD','DOCUMENT_PROVENANCE_STORE','DOCUMENT_CLASSIFY_CONFIDENCE',
'DOCUMENT_EXTRACT_SMART','FINANCIAL_DOCUMENT_VALIDATE','DOCUMENT_DEDUPE_COMPOSITE','ACCOUNTING_DOCUMENT_NORMALIZE',
'REVIEW_EXCEPTION_ORCHESTRATOR','ACCOUNTING_EXPORT_DISPATCH','INTAKE_ACKNOWLEDGE'}
ROOTS={
'HARDENED':ROOT/'quarries/workflow-quarry/30-hardened',
'TESTED':ROOT/'quarries/workflow-quarry/40-tested',
'APPROVED':ROOT/'quarries/workflow-quarry/50-approved-baseline',
'LIBRARY':ROOT/'workflows/n8n'}

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def collect(root):
    out={}
    for wf in root.rglob('workflow.json'):
        try:d=json.loads(wf.read_text())
        except Exception:continue
        key=d.get('meta',{}).get('candidateKey')
        if key in EXPECTED and d.get('meta',{}).get('wave')=='W2':out[key]=wf.parent
    return out

errors=[]; maps={name:collect(root) for name,root in ROOTS.items()}
for name,m in maps.items():
    missing=EXPECTED-set(m)
    if missing:errors.append(f'{name}: missing {sorted(missing)}')
    if len(m)!=11:errors.append(f'{name}: expected 11 W2 packages, got {len(m)}')
for key in sorted(EXPECTED):
    if any(key not in maps[n] for n in ROOTS):continue
    hashes={n:sha(maps[n][key]/'workflow.json') for n in ROOTS}
    if len(set(hashes.values()))!=1:errors.append(f'{key}: workflow bytes differ across stages {hashes}')
    for stage in ('TESTED','APPROVED','LIBRARY'):
        report=maps[stage][key]/'evidence/TEST-REPORT.md'
        if not report.is_file() or 'VERDICT: PASS' not in report.read_text():errors.append(f'{key}: {stage} lacks PASS TEST-REPORT')
    for stage in ('APPROVED','LIBRARY'):
        prom=maps[stage][key]/'PROMOTION.md'
        if not prom.is_file() or 'Source package was preserved' not in prom.read_text():errors.append(f'{key}: {stage} lacks non-destructive promotion evidence')
    # No approved/library package may acquire a bound credential after promotion.
    for stage in ('APPROVED','LIBRARY'):
        data=json.loads((maps[stage][key]/'workflow.json').read_text())
        if any(n.get('credentials') for n in data.get('nodes',[])):errors.append(f'{key}: {stage} has bound credential')

if errors:
    print('W2 RELEASE VALIDATION: FAIL')
    for e in errors:print(' -',e)
    raise SystemExit(1)
print('W2 RELEASE VALIDATION: PASS')
print('HARDENED=11 TESTED=11 APPROVED_BASELINE=11 workflows/n8n=11')
print('Byte-identical workflow payloads, PASS evidence, non-destructive promotion and zero bound credentials: PASS')
