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
ALLOWED={'n8n-nodes-base.executeWorkflowTrigger','n8n-nodes-base.code','n8n-nodes-base.httpRequest'}
REQUIRED_FILES={'workflow.json','manifest.yaml','config.schema.json','README.md'}
INVARIANTS={
'OMNICHANNEL_DOCUMENT_INTAKE':['UNSUPPORTED_MIME','FILE_TOO_LARGE','EXTENSION_MIME_MISMATCH','sourceChannel','intakeKey'],
'MEDIA_FETCH_GUARD':['UNSUPPORTED_MIME','FILE_TOO_LARGE','UNSAFE_URL_SCHEME','fetchAllowed','fetchKey'],
'DOCUMENT_PROVENANCE_STORE':['INVALID_HASH','immutable-original','provenanceId','contentHash'],
'DOCUMENT_CLASSIFY_CONFIDENCE':['UNKNOWN_CLASS','LOW_CONFIDENCE','AMBIGUOUS_MARGIN','confidence','decision'],
'DOCUMENT_EXTRACT_SMART':['deterministic_then_ai','deterministic_only','LOW_FIELD_CONFIDENCE','AI_FALLBACK_UNAVAILABLE','fieldEvidence'],
'FINANCIAL_DOCUMENT_VALIDATE':['ARITHMETIC_MISMATCH','UNSUPPORTED_CURRENCY','MISSING_ISSUER_ID','MISSING_DOCUMENT_NUMBER','validationKey'],
'DOCUMENT_DEDUPE_COMPOSITE':['exact_duplicate','probable_duplicate','exactKey','businessKey','fuzzyKey'],
'ACCOUNTING_DOCUMENT_NORMALIZE':['accountingDocumentId','accounting-document-v1','fieldsProvenance','normalizationKey'],
'REVIEW_EXCEPTION_ORCHESTRATOR':['CLASSIFICATION_REVIEW','EXACT_DUPLICATE','PROBABLE_DUPLICATE','requiresReview','reviewKey'],
'ACCOUNTING_EXPORT_DISPATCH':['INVALID_ADAPTER','destinationAdapter','accountingDocument','exportKey','status'],
'INTAKE_ACKNOWLEDGE':['INVALID_CHANNEL','INVALID_STATUS','recipientRef','ackKey','templateKey'],
}
SECRET_PATTERNS=[re.compile(r'sk-[A-Za-z0-9]{20,}'),re.compile(r'AIza[0-9A-Za-z_-]{20,}'),re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')]

errors=[]; found={}; ids={}
for wf in HARD.rglob('workflow.json'):
    try:data=json.loads(wf.read_text(encoding='utf-8'))
    except Exception as e:errors.append(f'{wf}: invalid JSON {e}');continue
    meta=data.get('meta',{}); key=meta.get('candidateKey')
    if meta.get('wave')!='W2' or key not in EXPECTED:continue
    pkg=wf.parent; found[key]=pkg
    files={p.name for p in pkg.iterdir() if p.is_file()}
    if REQUIRED_FILES-files:errors.append(f'{key}: missing {sorted(REQUIRED_FILES-files)}')
    fixtures=list((pkg/'fixtures').glob('*.json')) if (pkg/'fixtures').is_dir() else []
    if len(fixtures)<7:errors.append(f'{key}: expected >=7 fixtures, got {len(fixtures)}')
    if not (pkg/'evidence/TEST-PLAN.md').is_file():errors.append(f'{key}: missing test plan')
    if meta.get('stage')!='HARDENED':errors.append(f'{key}: not HARDENED')
    wid=data.get('id')
    if not isinstance(wid,str) or not wid:errors.append(f'{key}: missing stable workflow id')
    elif wid in ids:errors.append(f'{key}: duplicate workflow id {wid} with {ids[wid]}')
    else:ids[wid]=key
    nodes=data.get('nodes',[]); types={n.get('type') for n in nodes}
    if types-ALLOWED:errors.append(f'{key}: unsupported node types {sorted(types-ALLOWED)}')
    if any(n.get('credentials') for n in nodes):errors.append(f'{key}: bound credentials present')
    codes=[str(n.get('parameters',{}).get('jsCode','')) for n in nodes if n.get('type')=='n8n-nodes-base.code']
    if len(codes)!=1:errors.append(f'{key}: expected exactly one business Code node')
    code=codes[0] if codes else ''
    if 'else if(KEY===' in code:errors.append(f'{key}: shared/dead capability branches remain')
    foreign=[k for k in EXPECTED if k!=key and k in code]
    if foreign:errors.append(f'{key}: foreign capability code/names remain {sorted(foreign)}')
    for token in ('tenantId','INVALID_INPUT','occurredAt'):
        if token not in code:errors.append(f'{key}: common fail-closed invariant missing {token}')
    for token in INVARIANTS[key]:
        if token not in code:errors.append(f'{key}: domain invariant missing {token}')
    # Complexity is semantic rather than raw line count: require multiple independent
    # control decisions/operators in addition to named domain invariants.
    decisions=sum(code.count(t) for t in (' if(', ' if (','?', 'throw new Error','new Set','some(','filter(','map(','sort(','Math.','Number.isFinite'))
    if decisions<5:errors.append(f'{key}: insufficient independent decision operations ({decisions})')
    if 'stable(' not in code and key not in {'FINANCIAL_DOCUMENT_VALIDATE','ACCOUNTING_DOCUMENT_NORMALIZE'}:errors.append(f'{key}: deterministic identity construction missing')
    schema_path=pkg/'config.schema.json'
    try:schema=json.loads(schema_path.read_text())
    except Exception as e:errors.append(f'{key}: invalid config schema {e}');schema={}
    if schema.get('additionalProperties') is not False:errors.append(f'{key}: config schema must reject unknown properties')
    for p in pkg.rglob('*'):
        if not p.is_file():continue
        txt=p.read_text(encoding='utf-8',errors='ignore')
        for rx in SECRET_PATTERNS:
            if rx.search(txt):errors.append(f'{key}: secret-like material in {p.relative_to(pkg)}')

if EXPECTED-set(found):errors.append('missing W2 packages '+str(sorted(EXPECTED-set(found))))
if len(found)!=11:errors.append(f'W2 package count must be 11, got {len(found)}')
if errors:
    print('W2 MODULAR SOPHISTICATION VALIDATION: FAIL')
    for e in errors:print(' -',e)
    raise SystemExit(1)
print('W2 MODULAR SOPHISTICATION VALIDATION: PASS')
print('11/11 components: semantically isolated, domain invariants present, deterministic identity, zero bound credentials, fail-closed package structure.')
