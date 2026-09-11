#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
probe_root=ROOT/'waves/.generated/runtime-probes'
ids=[]
for path in sorted(probe_root.rglob('*.json')):
    data=json.loads(path.read_text())
    ids.append(data['id'])
print(' '.join(ids))
