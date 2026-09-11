#!/usr/bin/env python3
from __future__ import annotations
import json, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
HARD=ROOT/'quarries/workflow-quarry/30-hardened'
EXPECTED={
'OMNICHANNEL_DOCUMENT_INTAKE','MEDIA_FETCH_GUARD','DOCUMENT_PROVENANCE_STORE','DOCUMENT_CLASSIFY_CONFIDENCE',
'DOCUMENT_EXTRACT_SMART','FINANCIAL_DOCUMENT_VALIDATE','DOCUMENT_DEDUPE_COMPOSITE','ACCOUNTING_DOCUMENT_NORMALIZE',
'REVIEW_EXCEPTION_ORCHESTRATOR','ACCOUNTING_EXPORT_DISPATCH','INTAKE_ACKNOWLEDGE'}
REQUIRED={'workflow.json','manifest.yaml','config.schema.json','README.md'}
ALLOWED_NODE_TYPES={'n8n-nodes-base.executeWorkflowTrigger','n8n-nodes-base.code','n8n-nodes-base.httpRequest'}
SECRET_PATTERNS=[
 re.compile(r'sk-[A-Za-z0-9]{20,}'),re.compile(r'AIza[0-9A-Za-z_-]{20,}'),
 re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
 re.compile(r'Bearer\s+[A-Za-z0-9._~-]{24,}')]

errors=[]; found={}; ids={}
for wf in HARD.rglob('workflow.json'):
    try: data=json.loads(wf.read_text(encoding='utf-8'))
    except Exception as e: errors.append(f'{wf}: invalid JSON: {e}'); continue
    key=data.get('meta',{}).get('candidateKey')
    if key not in EXPECTED: continue
    pkg=wf.parent; found[key]=pkg
    missing=REQUIRED-{p.name for p in pkg.iterdir() if p.is_file()}
    if missing: errors.append(f'{key}: missing package files {sorted(missing)}')
    if not (pkg/'fixtures').is_dir() or len(list((pkg/'fixtures').glob('*.json')))<7: errors.append(f'{key}: expected >=7 fixtures')
    if not (pkg/'evidence/TEST-PLAN.md').is_file(): errors.append(f'{key}: missing TEST-PLAN')
    if data.get('meta',{}).get('stage')!='HARDENED': errors.append(f'{key}: stage must be HARDENED')
    if data.get('meta',{}).get('wave')!='W2': errors.append(f'{key}: wave marker must be W2')
    wid=data.get('id');
    if not isinstance(wid,str) or not wid: errors.append(f'{key}: stable workflow id missing')
    elif wid in ids: errors.append(f'{key}: duplicate workflow id with {ids[wid]}: {wid}')
    else: ids[wid]=key
    nodes=data.get('nodes',[]); types={n.get('type') for n in nodes}
    unsupported=types-ALLOWED_NODE_TYPES
    if unsupported: errors.append(f'{key}: unsupported base-profile node types {sorted(unsupported)}')
    if any(n.get('credentials') for n in nodes): errors.append(f'{key}: bound n8n credential reference present')
    code='\n'.join(str(n.get('parameters',{}).get('jsCode','')) for n in nodes if n.get('type')=='n8n-nodes-base.code')
    # W2 is intentionally dense: every component must contain meaningful policy/decision logic,
    # not a pass-through micro-workflow produced to inflate the library count.
    if len(code)<1800: errors.append(f'{key}: business-logic density too low ({len(code)} chars)')
    for token in ('tenantId','idempotency','INVALID_INPUT'):
        if token not in code: errors.append(f'{key}: required guard/identity token absent: {token}')
    if key in {'DOCUMENT_CLASSIFY_CONFIDENCE','DOCUMENT_EXTRACT_SMART','FINANCIAL_DOCUMENT_VALIDATE','DOCUMENT_DEDUPE_COMPOSITE','REVIEW_EXCEPTION_ORCHESTRATOR'}:
        decision_tokens=('decision','review','confidence','findings','duplicate','valid')
        if sum(t in code for t in decision_tokens)<2: errors.append(f'{key}: insufficient domain-decision semantics')
    for p in pkg.rglob('*'):
        if not p.is_file(): continue
        txt=p.read_text(encoding='utf-8',errors='ignore')
        for rx in SECRET_PATTERNS:
            if rx.search(txt): errors.append(f'{key}: secret-like pattern in {p.relative_to(pkg)}')
    try: schema=json.loads((pkg/'config.schema.json').read_text())
    except Exception as e: errors.append(f'{key}: invalid config schema JSON: {e}'); schema={}
    if schema.get('additionalProperties') is not False: errors.append(f'{key}: config schema must fail closed on unknown properties')

missing=EXPECTED-set(found)
extra=set(found)-EXPECTED
if missing: errors.append('missing W2 candidates: '+', '.join(sorted(missing)))
if extra: errors.append('unexpected W2 candidates: '+', '.join(sorted(extra)))
if len(found)!=11: errors.append(f'W2 count must be 11, got {len(found)}')

if errors:
    print('W2 CANDIDATE VALIDATION: FAIL')
    for e in errors: print(' -',e)
    raise SystemExit(1)
print('W2 CANDIDATE VALIDATION: PASS')
print('Sophisticated HARDENED candidates checked: 11')
print('Stable IDs, package completeness, base runtime profile, zero bound credentials and minimum decision-density: PASS')
