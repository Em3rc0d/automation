#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
HARD=ROOT/'quarries/workflow-quarry/30-hardened'
EXPECTED={
'EXECUTION_TELEMETRY','ERROR_TO_INCIDENT','SAVINGS_EVENT_EMIT','APPROVAL_REQUEST','HUMAN_REVIEW_TASK',
'LEAD_CAPTURE','LEAD_NORMALIZE','LEAD_DEDUPE','CRM_UPSERT_CONTACT','LEAD_ACKNOWLEDGE','LEAD_FOLLOWUP_WATCHDOG'}
seen=set()
for wf in sorted(HARD.rglob('workflow.json')):
    data=json.loads(wf.read_text())
    key=data.get('meta',{}).get('candidateKey')
    if key not in EXPECTED:continue
    triggers=[n for n in data.get('nodes',[]) if n.get('type')=='n8n-nodes-base.executeWorkflowTrigger']
    if len(triggers)!=1:raise SystemExit(f'{key}: expected one Execute Workflow Trigger, got {len(triggers)}')
    triggers[0]['parameters']={'inputSource':'passthrough'}
    triggers[0]['typeVersion']=1.1
    wf.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
    seen.add(key)
if seen!=EXPECTED:raise SystemExit(f'W1 trigger normalization mismatch missing={sorted(EXPECTED-seen)}')
print('W1 EXECUTE-WORKFLOW INPUT CONTRACT: PASS passthrough=11/11')
