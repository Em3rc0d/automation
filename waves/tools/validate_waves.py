#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
from waves.catalog import PATTERN_EXPECTED, WAVES, iter_capabilities

OUT=ROOT/'waves/.generated'
FORBIDDEN_PROVIDER_CLONE_TOKENS=('GMAIL_','OUTLOOK_','TWILIO_','HUBSPOT_','PIPEDRIVE_')
SECRET_PATTERNS=[re.compile(r'sk-[A-Za-z0-9]{20,}'),re.compile(r'AIza[0-9A-Za-z_-]{20,}'),re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')]


def fail(errors):
    print('WAVES QUALITY GATE: FAIL')
    for e in errors: print('-',e)
    return 1


def main():
    errors=[]; caps=list(iter_capabilities())
    if len(caps)!=99: errors.append(f'expected 99 W3-W11 capabilities, got {len(caps)}')
    for wave in range(3,12):
        declared=WAVES.get(wave,{}).get('capabilities',[])
        if len(declared)!=11: errors.append(f'W{wave} must contain exactly 11 semantic capabilities, got {len(declared)}')
    keys=[c['key'] for c in caps]
    if len(set(keys))!=len(keys): errors.append('duplicate capability key')
    for key in keys:
        if any(t in key for t in FORBIDDEN_PROVIDER_CLONE_TOKENS): errors.append(f'provider clone counted as capability: {key}')

    registry_path=OUT/'registry.json'
    if not registry_path.is_file(): errors.append('missing generated registry; run build_waves.py')
    else:
        reg=json.loads(registry_path.read_text())
        if len(reg)!=99: errors.append(f'registry expected 99, got {len(reg)}')

    seen_semantics=set(); seen_ids=set(); probe_count=0
    for cap in caps:
        pkg=OUT/'candidates'/f"W{cap['wave']}"/cap['family']/f"{cap['key']}@1.0.0"
        wf_path=pkg/'workflow.json'; mf_path=pkg/'manifest.json'
        if not wf_path.is_file() or not mf_path.is_file():
            errors.append(f'missing generated package {cap["key"]}'); continue
        wf=json.loads(wf_path.read_text()); mf=json.loads(mf_path.read_text())
        if wf.get('id') in seen_ids: errors.append(f'duplicate n8n id {wf.get("id")}')
        seen_ids.add(wf.get('id'))
        if wf.get('meta',{}).get('candidateKey')!=cap['key']: errors.append(f'meta key mismatch {cap["key"]}')
        nodes=wf.get('nodes',[])
        if len(nodes)!=2: errors.append(f'{cap["key"]} must contain isolated trigger+engine only')
        if not nodes or nodes[0].get('type')!='n8n-nodes-base.executeWorkflowTrigger': errors.append(f'{cap["key"]} missing child-workflow trigger')
        if nodes and nodes[0].get('parameters',{}).get('inputSource')!='passthrough': errors.append(f'{cap["key"]} inputSource must be passthrough')
        if any(n.get('credentials') for n in nodes): errors.append(f'{cap["key"]} has bound credentials')
        code='\n'.join(n.get('parameters',{}).get('jsCode','') for n in nodes)
        if cap['key'] not in code or cap['pattern'] not in code: errors.append(f'{cap["key"]} engine identity not embedded')
        for rx in SECRET_PATTERNS:
            if rx.search(wf_path.read_text()): errors.append(f'{cap["key"]} secret-like material detected')
        q=mf.get('quality',{}); dims=q.get('dimensions',{}); total=q.get('total',0)
        if total<24: errors.append(f'{cap["key"]} quality {total}/30 below 24')
        if any(v<3 for v in dims.values()): errors.append(f'{cap["key"]} has quality dimension below 3')
        if cap['side_effect'] and (dims.get('operationalResilience',0)<4 or dims.get('securityObservability',0)<4): errors.append(f'{cap["key"]} side-effect resilience/security below 4')
        if mf.get('inputContract')!='passthrough': errors.append(f'{cap["key"]} manifest contract mismatch')
        raw=wf_path.read_bytes(); digest=hashlib.sha256(raw).hexdigest()
        if digest!=mf.get('workflowSha256'): errors.append(f'{cap["key"]} workflow hash mismatch')
        semantic=(cap['family'],cap['key'],cap['pattern'])
        if semantic in seen_semantics: errors.append(f'duplicate semantic boundary {semantic}')
        seen_semantics.add(semantic)
        probes=list((OUT/'runtime-probes'/f"W{cap['wave']}").glob(f"probe*{''.join(p.title() for p in cap['key'].lower().split('_'))}V1*.json"))
        if len(probes)!=2: errors.append(f'{cap["key"]} expected valid+edge probes, got {len(probes)}')
        probe_count+=len(probes)
        if cap['pattern'] not in PATTERN_EXPECTED: errors.append(f'{cap["key"]} unknown expected-decision pattern')

    if probe_count!=198: errors.append(f'expected 198 runtime probes, got {probe_count}')
    if errors: return fail(errors)
    print('WAVES QUALITY GATE: PASS')
    print('W3-W11: 9 waves x 11 semantic capabilities = 99')
    print('Runtime probes: 198 (valid + adversarial edge per capability)')
    print('Quality bar: >=24/30; no dimension <3; side-effect resilience/security >=4')
    print('Provider variants are configuration/adapters, never new capabilities.')
    return 0

if __name__=='__main__': raise SystemExit(main())
