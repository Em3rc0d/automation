#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HARD = ROOT / "quarries/workflow-quarry/30-hardened"
RUNTIME_PROFILE = "n8n-base-js-v1"
N8N_VERSION = "2.38.7"

COMPONENTS = [
    {"key":"EXECUTION_TELEMETRY","family":"platform","endpoint":"/internal/execution-events","required":["tenantId","automationInstanceId","eventType","occurredAt","traceId"]},
    {"key":"ERROR_TO_INCIDENT","family":"platform","endpoint":"/internal/incidents","required":["tenantId","automationInstanceId","traceId","occurredAt"]},
    {"key":"SAVINGS_EVENT_EMIT","family":"platform","endpoint":"/internal/savings-events","required":["tenantId","automationInstanceId","baselineId","eligibleUnits","automatedUnits","minutesPerUnit","hourlyCost","occurredAt","traceId"]},
    {"key":"APPROVAL_REQUEST","family":"platform","endpoint":"/internal/approvals","required":["tenantId","automationInstanceId","approvalType","subjectId","traceId","occurredAt"]},
    {"key":"HUMAN_REVIEW_TASK","family":"platform","endpoint":"/internal/review-tasks","required":["tenantId","automationInstanceId","taskType","subjectId","reason","traceId","occurredAt"]},
    {"key":"LEAD_CAPTURE","family":"revenue","endpoint":"/internal/leads/capture","required":["tenantId","source","occurredAt","traceId"]},
    {"key":"LEAD_NORMALIZE","family":"revenue","endpoint":None,"required":["tenantId","traceId"]},
    {"key":"LEAD_DEDUPE","family":"revenue","endpoint":"/internal/leads/dedupe","required":["tenantId","traceId"]},
    {"key":"CRM_UPSERT_CONTACT","family":"revenue","endpoint":"/internal/crm/contacts/upsert","required":["tenantId","traceId","dedupeKey"]},
    {"key":"LEAD_ACKNOWLEDGE","family":"revenue","endpoint":"/internal/lead-acknowledgements","required":["tenantId","traceId","leadId","channel","recipient","occurredAt"]},
    {"key":"LEAD_FOLLOWUP_WATCHDOG","family":"revenue","endpoint":"/internal/lead-followups","required":["tenantId","traceId","leadId","lastContactAt","dueAfterMinutes","occurredAt"]},
]

VALID = {
    "EXECUTION_TELEMETRY":{"tenantId":"tenant-demo","automationInstanceId":"auto-001","eventType":"completed","occurredAt":"2026-09-11T12:00:00Z","traceId":"trace-valid","metrics":{"eligibleUnits":3,"automatedUnits":3}},
    "ERROR_TO_INCIDENT":{"tenantId":"tenant-demo","automationInstanceId":"auto-001","traceId":"trace-valid","occurredAt":"2026-09-11T12:00:00Z","error":{"code":"HTTP_500","message":"provider failed","retryable":True}},
    "SAVINGS_EVENT_EMIT":{"tenantId":"tenant-demo","automationInstanceId":"auto-001","baselineId":"baseline-v1","eligibleUnits":10,"automatedUnits":8,"minutesPerUnit":7,"hourlyCost":18,"occurredAt":"2026-09-11T12:00:00Z","traceId":"trace-valid","exceptionMinutes":4,"oversightMinutes":2,"variableCost":1.5},
    "APPROVAL_REQUEST":{"tenantId":"tenant-demo","automationInstanceId":"auto-001","approvalType":"send_quote","subjectId":"quote-123","traceId":"trace-valid","occurredAt":"2026-09-11T12:00:00Z","payload":{"amount":1200}},
    "HUMAN_REVIEW_TASK":{"tenantId":"tenant-demo","automationInstanceId":"auto-001","taskType":"lead_exception","subjectId":"lead-123","reason":"ambiguous identity","traceId":"trace-valid","occurredAt":"2026-09-11T12:00:00Z"},
    "LEAD_CAPTURE":{"tenantId":"tenant-demo","source":"web","occurredAt":"2026-09-11T12:00:00Z","traceId":"trace-valid","externalLeadId":"ext-123","name":"Ada Demo","email":"Ada@Example.com","phone":"+51 999 000 111"},
    "LEAD_NORMALIZE":{"tenantId":"tenant-demo","traceId":"trace-valid","name":"  Ada   Demo ","email":" ADA@EXAMPLE.COM ","phone":"+51 999-000-111","source":"WEB"},
    "LEAD_DEDUPE":{"tenantId":"tenant-demo","traceId":"trace-valid","email":"ada@example.com","source":"web"},
    "CRM_UPSERT_CONTACT":{"tenantId":"tenant-demo","traceId":"trace-valid","dedupeKey":"lead-dedupe:tenant-demo:email:ada@example.com","contact":{"name":"Ada Demo","email":"ada@example.com"}},
    "LEAD_ACKNOWLEDGE":{"tenantId":"tenant-demo","traceId":"trace-valid","leadId":"lead-123","channel":"email","recipient":"ada@example.com","occurredAt":"2026-09-11T12:00:00Z","variables":{"firstName":"Ada"}},
    "LEAD_FOLLOWUP_WATCHDOG":{"tenantId":"tenant-demo","traceId":"trace-valid","leadId":"lead-123","lastContactAt":"2026-09-10T12:00:00Z","dueAfterMinutes":60,"occurredAt":"2026-09-11T12:00:00Z"},
}

COMMON_JS = r"""
const input = $input.first().json;
const missing = REQUIRED.filter(k => input[k] === undefined || input[k] === null || input[k] === '');
if (missing.length) throw new Error(`${KEY}_INVALID_INPUT missing=${missing.join(',')}`);
const text = v => v === undefined || v === null ? null : String(v).trim();
const num = (v,d=0) => Number.isFinite(Number(v)) ? Number(v) : d;
const parseTime = (v,name='occurredAt') => { const d=new Date(v); if(Number.isNaN(d.getTime())) throw new Error(`${KEY}_INVALID_TIMESTAMP field=${name}`); return d.toISOString(); };
let out={schemaVersion:'1.0',tenantId:text(input.tenantId),traceId:text(input.traceId),metadata:(input.metadata&&typeof input.metadata==='object')?input.metadata:{}};
if(KEY==='EXECUTION_TELEMETRY'){
 out={...out,automationInstanceId:text(input.automationInstanceId),eventType:text(input.eventType),occurredAt:parseTime(input.occurredAt),runId:text(input.runId),status:text(input.status),metrics:{eligibleUnits:num(input.metrics?.eligibleUnits),automatedUnits:num(input.metrics?.automatedUnits),exceptionMinutes:num(input.metrics?.exceptionMinutes),oversightMinutes:num(input.metrics?.oversightMinutes),variableCost:num(input.metrics?.variableCost)}};
 out.idempotencyKey=text(input.idempotencyKey)||`${out.tenantId}:${out.automationInstanceId}:${out.traceId}:${out.eventType}`;
}else if(KEY==='ERROR_TO_INCIDENT'){
 const redact=v=>{if(v===undefined||v===null)return null;let s=String(v).slice(0,4000);s=s.replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi,'Bearer [REDACTED]');s=s.replace(/(api[_-]?key|token|password|secret)\s*[:=]\s*[^\s,;]+/gi,'$1=[REDACTED]');return s;};
 out={...out,automationInstanceId:text(input.automationInstanceId),occurredAt:parseTime(input.occurredAt),severity:text(input.severity)||'error',status:'open',source:redact(input.source||input.nodeName||input.error?.source||'unknown'),nodeName:redact(input.nodeName),error:{code:redact(input.error?.code||input.code||'AUTOMATION_FAILURE'),message:redact(input.error?.message||input.message||'Automation failed'),retryable:Boolean(input.error?.retryable??input.retryable??false),category:redact(input.error?.category||input.category||'runtime')}};
 out.idempotencyKey=text(input.idempotencyKey)||`incident:${out.tenantId}:${out.automationInstanceId}:${out.traceId}:${out.error.code}:${out.source}`;
}else if(KEY==='SAVINGS_EVENT_EMIT'){
 const automated=Math.max(0,num(input.automatedUnits)),eligible=Math.max(0,num(input.eligibleUnits)),exception=Math.max(0,num(input.exceptionMinutes)),oversight=Math.max(0,num(input.oversightMinutes));
 const grossMinutes=Math.max(0,automated*Math.max(0,num(input.minutesPerUnit))-exception-oversight), grossCost=Number(((grossMinutes/60)*Math.max(0,num(input.hourlyCost))).toFixed(4)), variableCost=Math.max(0,num(input.variableCost));
 out={...out,automationInstanceId:text(input.automationInstanceId),baselineId:text(input.baselineId),occurredAt:parseTime(input.occurredAt),eligibleUnits:eligible,automatedUnits:automated,grossMinutesSaved:Number(grossMinutes.toFixed(4)),grossCostSaved:grossCost,variableCost:Number(variableCost.toFixed(4)),netEstimatedBenefit:Number((grossCost-variableCost).toFixed(4)),provenance:text(input.provenance)||'ESTIMATED'};
 out.idempotencyKey=text(input.idempotencyKey)||`savings:${out.tenantId}:${out.automationInstanceId}:${out.traceId}:${out.baselineId}`;
}else if(KEY==='APPROVAL_REQUEST'){
 out={...out,automationInstanceId:text(input.automationInstanceId),approvalType:text(input.approvalType),subjectId:text(input.subjectId),occurredAt:parseTime(input.occurredAt),status:'pending',expiresAt:input.expiresAt?parseTime(input.expiresAt,'expiresAt'):null,payload:(input.payload&&typeof input.payload==='object')?input.payload:{}};
 out.idempotencyKey=text(input.idempotencyKey)||`approval:${out.tenantId}:${out.automationInstanceId}:${out.approvalType}:${out.subjectId}:${out.traceId}`;
}else if(KEY==='HUMAN_REVIEW_TASK'){
 out={...out,automationInstanceId:text(input.automationInstanceId),taskType:text(input.taskType),subjectId:text(input.subjectId),reason:text(input.reason),occurredAt:parseTime(input.occurredAt),status:'open',priority:text(input.priority)||'normal',context:(input.context&&typeof input.context==='object')?input.context:{}};
 out.idempotencyKey=text(input.idempotencyKey)||`review:${out.tenantId}:${out.automationInstanceId}:${out.taskType}:${out.subjectId}:${out.traceId}`;
}else if(KEY==='LEAD_CAPTURE'){
 if(!input.email&&!input.phone&&!input.externalLeadId) throw new Error(`${KEY}_INVALID_INPUT identity=email|phone|externalLeadId required`);
 out={...out,source:text(input.source)?.toLowerCase(),occurredAt:parseTime(input.occurredAt),externalLeadId:text(input.externalLeadId),name:text(input.name),email:text(input.email)?.toLowerCase(),phone:text(input.phone),message:text(input.message)};
 out.idempotencyKey=text(input.idempotencyKey)||`lead-capture:${out.tenantId}:${out.source}:${out.externalLeadId||out.email||out.phone}:${out.traceId}`;
}else if(KEY==='LEAD_NORMALIZE'){
 if(!input.email&&!input.phone&&!input.externalLeadId) throw new Error(`${KEY}_INVALID_INPUT identity=email|phone|externalLeadId required`);
 out={...out,externalLeadId:text(input.externalLeadId),name:text(input.name)?.replace(/\s+/g,' '),email:text(input.email)?.toLowerCase(),phone:text(input.phone)?.replace(/[^\d+]/g,''),source:text(input.source)?.toLowerCase()||null,message:text(input.message)};
 out.normalizationKey=`lead-normalize:${out.tenantId}:${out.externalLeadId||out.email||out.phone}:${out.traceId}`;
}else if(KEY==='LEAD_DEDUPE'){
 const email=text(input.email)?.toLowerCase(),phone=text(input.phone)?.replace(/[^\d+]/g,''),ext=text(input.externalLeadId),identity=ext?`external:${ext}`:email?`email:${email}`:phone?`phone:${phone}`:null;
 if(!identity) throw new Error(`${KEY}_INVALID_INPUT identity=email|phone|externalLeadId required`);
 out={...out,identity,source:text(input.source)||null,dedupeKey:`lead-dedupe:${out.tenantId}:${identity}`}; out.idempotencyKey=text(input.idempotencyKey)||out.dedupeKey;
}else if(KEY==='CRM_UPSERT_CONTACT'){
 const contact=(input.contact&&typeof input.contact==='object')?input.contact:{name:input.name,email:input.email,phone:input.phone}; if(!contact.email&&!contact.phone&&!contact.name) throw new Error(`${KEY}_INVALID_INPUT contact fields required`);
 out={...out,dedupeKey:text(input.dedupeKey),contact,source:text(input.source)||null}; out.idempotencyKey=text(input.idempotencyKey)||`crm-upsert:${out.tenantId}:${out.dedupeKey}`;
}else if(KEY==='LEAD_ACKNOWLEDGE'){
 out={...out,leadId:text(input.leadId),channel:text(input.channel)?.toLowerCase(),recipient:text(input.recipient),occurredAt:parseTime(input.occurredAt),templateKey:text(input.templateKey)||'lead-received-v1',variables:(input.variables&&typeof input.variables==='object')?input.variables:{}};
 out.idempotencyKey=text(input.idempotencyKey)||`lead-ack:${out.tenantId}:${out.leadId}:${out.channel}:${out.traceId}`;
}else if(KEY==='LEAD_FOLLOWUP_WATCHDOG'){
 const now=parseTime(input.occurredAt),last=parseTime(input.lastContactAt,'lastContactAt'),dueAfter=Math.max(1,num(input.dueAfterMinutes,1440)),dueAt=new Date(new Date(last).getTime()+dueAfter*60000).toISOString();
 out={...out,leadId:text(input.leadId),occurredAt:now,lastContactAt:last,dueAfterMinutes:dueAfter,dueAt,overdue:new Date(now).getTime()>=new Date(dueAt).getTime(),status:text(input.status)||'open',ownerId:text(input.ownerId)};
 out.idempotencyKey=text(input.idempotencyKey)||`lead-followup:${out.tenantId}:${out.leadId}:${out.dueAt}`;
}
return [{json:out}];
"""

def stable_id(key:str)->str:
    p=key.lower().split('_'); return p[0]+''.join(x.title() for x in p[1:])+'V1'

def workflow(c):
    key,endpoint=c['key'],c['endpoint']
    js='const KEY='+json.dumps(key)+';\nconst REQUIRED='+json.dumps(c['required'])+';\n'+COMMON_JS
    nodes=[{"parameters":{},"id":key.lower()+"-trigger","name":"Called by Another Workflow","type":"n8n-nodes-base.executeWorkflowTrigger","typeVersion":1.1,"position":[240,300]},
           {"parameters":{"jsCode":js},"id":key.lower()+"-logic","name":"Validate and Transform","type":"n8n-nodes-base.code","typeVersion":2,"position":[520,300]}]
    con={"Called by Another Workflow":{"main":[[{"node":"Validate and Transform","type":"main","index":0}]]}}
    if endpoint:
        nodes.append({"parameters":{"method":"POST","url":"={{ $env.AUTOMATION_CONTROL_PLANE_URL + '"+endpoint+"' }}","sendHeaders":True,"headerParameters":{"parameters":[{"name":"Idempotency-Key","value":"={{ $json.idempotencyKey }}"},{"name":"X-Automation-Schema-Version","value":"1.0"},{"name":"X-Internal-Token","value":"={{ $env.AUTOMATION_CONTROL_PLANE_TOKEN || '' }}"}]},"sendBody":True,"contentType":"raw","rawContentType":"application/json","body":"={{ JSON.stringify($json) }}","options":{}},"id":key.lower()+"-post","name":"Post to Control Plane","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[800,300],"retryOnFail":True,"maxTries":3,"waitBetweenTries":250})
        con["Validate and Transform"]={"main":[[{"node":"Post to Control Plane","type":"main","index":0}]]}
    return {"id":stable_id(key),"name":f"BASELINE CANDIDATE - {key}@1.0","nodes":nodes,"connections":con,"settings":{"executionOrder":"v1"},"pinData":{},"meta":{"candidateKey":key,"candidateVersion":"1.0.0","stage":"HARDENED","origin":"ORIGINAL_SYNTHESIS"},"tags":[{"name":"baseline-candidate"},{"name":c['family']},{"name":"w1"}]}

def fixtures(c):
    v=dict(VALID[c['key']]); v['traceId']=f"trace-valid-{c['key'].lower()}"; v['metadata']={**v.get('metadata',{}),"testCase":"valid"}
    bad=dict(v); bad.pop('tenantId',None); bad['traceId']=f"trace-invalid-tenant-{c['key'].lower()}"
    dup=dict(v); dup['metadata']={**v.get('metadata',{}),"testCase":"duplicate"}
    transient=dict(v); transient['traceId']=f"trace-transient-{c['key'].lower()}"; transient['metadata']={**v.get('metadata',{}),"testCase":"transient"}
    permanent=dict(v); permanent['traceId']=f"trace-permanent-{c['key'].lower()}"; permanent['metadata']={**v.get('metadata',{}),"testCase":"permanent"}
    badtime=dict(v)
    for k in ('occurredAt','lastContactAt','expiresAt'):
        if k in badtime: badtime[k]='not-a-date'; break
    badtime['traceId']=f"trace-invalid-time-{c['key'].lower()}"
    return {'valid.json':v,'invalid-missing-tenant.json':bad,'duplicate.json':dup,'transient.json':transient,'permanent.json':permanent,'invalid-timestamp.json':badtime}

def manifest(c):
    return f"""key: {c['key']}\nversion: 1.0.0\nfamily: {c['family']}\nstage: HARDENED\norigin: ORIGINAL_SYNTHESIS\nruntime:\n  engine: n8n\n  profile: {RUNTIME_PROFILE}\n  tested_version: \"{N8N_VERSION}\"\npurpose: W1 reusable baseline component for {c['key']}.\nidempotency:\n  strategy: deterministic tenant-scoped key with caller override where applicable\n  enforcement_boundary: control-plane API for side effects or deterministic transform for pure components\nsecurity:\n  embedded_secrets: false\n  client_specific_ids: false\n  tenant_id_required: true\nprovenance:\n  external_code_copied: false\npromotion:\n  next_stage: TESTED\n  requires:\n    - clean import\n    - valid fixture PASS\n    - invalid fixture rejection\n    - replay/idempotency PASS\n    - retry/failure tests when applicable\n    - secret/config scan\n    - TEST-REPORT.md\n"""

def config(c):
    p={} if not c['endpoint'] else {'AUTOMATION_CONTROL_PLANE_URL':{'type':'string','minLength':1},'AUTOMATION_CONTROL_PLANE_TOKEN':{'type':'string','minLength':1}}
    r=[] if not c['endpoint'] else ['AUTOMATION_CONTROL_PLANE_URL']
    return {'$schema':'https://json-schema.org/draft/2020-12/schema','type':'object','properties':p,'required':r,'additionalProperties':True}

def write(c):
    pkg=HARD/c['family']/f"{c['key']}@1.0"; (pkg/'fixtures').mkdir(parents=True,exist_ok=True); (pkg/'evidence').mkdir(exist_ok=True)
    (pkg/'workflow.json').write_text(json.dumps(workflow(c),indent=2)+'\n')
    (pkg/'manifest.yaml').write_text(manifest(c))
    (pkg/'config.schema.json').write_text(json.dumps(config(c),indent=2)+'\n')
    (pkg/'README.md').write_text(f"# {c['key']}@1.0\n\nW1 baseline. Family `{c['family']}`. Runtime `{RUNTIME_PROFILE}` / n8n `{N8N_VERSION}`. Required: {', '.join(c['required'])}. Secrets/client credentials are not embedded.\n")
    (pkg/'evidence/TEST-PLAN.md').write_text(f"# {c['key']}@1.0 — W1 Test Plan\n\nT01 import; T02 valid; T03 missing tenant; T04 replay/idempotency; T05 invalid timestamp when applicable; T06 transient retry; T07 permanent failure; T08 secret/credential scan; T09 runtime token leak scan; T10 missing config for side-effect workflows. Promotion requires exact `VERDICT: PASS`.\n")
    for n,d in fixtures(c).items(): (pkg/'fixtures'/n).write_text(json.dumps(d,indent=2)+'\n')

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--clean-generated',action='store_true'); a=ap.parse_args()
    if a.clean_generated:
        for c in COMPONENTS:
            p=HARD/c['family']/f"{c['key']}@1.0"
            if p.exists(): shutil.rmtree(p)
    for c in COMPONENTS: write(c)
    print(f"W1 PRODUCER: HARDENED={len(COMPONENTS)}")

if __name__=='__main__': main()
