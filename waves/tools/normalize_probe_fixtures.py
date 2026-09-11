#!/usr/bin/env python3
"""Apply pattern-specific fixture normalization after generic probe compilation.

The shared fixture intentionally carries cross-pattern fields. Some algorithms use
different units for similarly named fields; this pass makes those units explicit
without contaminating the capability engine with test-only branches.
"""
from __future__ import annotations
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
probe_root=ROOT/'waves/.generated/runtime-probes'
changed=0
for path in sorted(probe_root.rglob('*.json')):
    data=json.loads(path.read_text())
    meta=data.get('meta',{})
    if meta.get('case')!='valid':
        continue
    engine=next((n for n in data.get('nodes',[]) if n.get('name')=='Capability Engine'),None)
    fixture=next((n for n in data.get('nodes',[]) if n.get('name')=='Fixture'),None)
    if not engine or not fixture:
        continue
    code=engine.get('parameters',{}).get('jsCode','')
    if 'const PATTERN = "MONITOR";' not in code:
        continue
    js=fixture.get('parameters',{}).get('jsCode','')
    old='"threshold":0.65'
    if old not in js:
        raise SystemExit(f'MONITOR valid probe missing shared threshold token: {path}')
    fixture['parameters']['jsCode']=js.replace(old,'"threshold":100',1)
    path.write_text(json.dumps(data,indent=2,sort_keys=True)+'\n')
    changed+=1
if changed!=7:
    raise SystemExit(f'expected 7 MONITOR valid probes to normalize, got {changed}')
print(f'WAVES FIXTURE NORMALIZATION: PASS monitor_valid={changed}')
