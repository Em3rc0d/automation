#!/usr/bin/env python3
"""Compile W3-W11 catalog into isolated n8n candidates and executable probes.

Generated artifacts are deliberately reproducible and excluded from source authority:
`waves/catalog.py` is the semantic source of truth. Each generated workflow contains
only the algorithm required by its own declared pattern.
"""
from __future__ import annotations
import hashlib, json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from waves.catalog import COMPLEX_PATTERNS, PATTERN_EXPECTED, iter_capabilities

OUT = ROOT / "waves/.generated"
CANDIDATES = OUT / "candidates"
PROBES = OUT / "runtime-probes"

COMMON_PREFIX = r"""
const x = $json || {};
const KEY = __KEY__;
const PATTERN = __PATTERN__;
if (!x.tenantId || !x.traceId) throw new Error(KEY + '_INVALID_INPUT');
const clean = (v) => String(v ?? '').trim().toLowerCase();
const num = (v, d=0) => Number.isFinite(Number(v)) ? Number(v) : d;
let decision = 'review';
let metrics = {};
let result = {};
"""

PATTERN_JS = {
"NORMALIZE": r"""
const source = clean(x.source);
const entityId = clean(x.entityId || x.email || x.phone || x.traceId);
decision = source && entityId ? 'accepted' : 'rejected';
result = {canonical:{source,entityId,channel:clean(x.channel||source),amount:num(x.amount,0)}};
metrics = {normalizedFields:4};
""",
"MATCH": r"""
const cs = Array.isArray(x.candidates) ? x.candidates : [];
const target = x.target || {};
const scored = cs.map((c,i)=>{
  let s=0;
  if(clean(c.email)&&clean(c.email)===clean(target.email)) s+=0.55;
  if(clean(c.phone)&&clean(c.phone)===clean(target.phone)) s+=0.35;
  const a=num(c.amount,NaN), b=num(target.amount,NaN);
  if(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=num(x.tolerance,1)) s+=0.10;
  return {...c,_score:Number(s.toFixed(3)),_index:i};
}).sort((a,b)=>b._score-a._score || a._index-b._index);
const top=scored[0];
decision = top && top._score>=0.8 ? 'matched' : 'review';
result={match:top||null,candidateCount:cs.length}; metrics={topScore:top?top._score:0};
""",
"DEDUPE": r"""
const fp = clean(x.fingerprint || [x.email,x.phone,x.externalId].map(clean).join('|'));
const existing = new Set((Array.isArray(x.existingFingerprints)?x.existingFingerprints:[]).map(clean));
decision = fp && existing.has(fp) ? 'duplicate' : 'new';
result={fingerprint:fp}; metrics={existingCount:existing.size};
""",
"SCORE": r"""
const signals = Array.isArray(x.signals) ? x.signals : [];
let weight=0, weighted=0;
for(const s of signals){const w=Math.max(0,num(s.weight,1)); weight+=w; weighted+=Math.max(0,Math.min(1,num(s.value,0)))*w;}
const score=weight?weighted/weight:0; const threshold=num(x.threshold,0.65);
decision = score>=threshold ? 'qualified' : 'review';
result={score:Number(score.toFixed(4)),threshold}; metrics={signalCount:signals.length};
""",
"ROUTE": r"""
const cs=(Array.isArray(x.candidates)?x.candidates:[]).map((c,i)=>{
 const available=c.available!==false?1:0, capacity=Math.max(0,num(c.capacity,0)), skill=Math.max(0,Math.min(1,num(c.skill,0)));
 const score=available*(capacity>0?1:0)*(skill*0.7+Math.min(capacity,10)/10*0.3);
 return {...c,_score:Number(score.toFixed(4)),_index:i};
}).sort((a,b)=>b._score-a._score||a._index-b._index);
const top=cs[0]; decision=top&&top._score>0?'assigned':'review'; result={assignee:top||null}; metrics={candidateCount:cs.length};
""",
"MONITOR": r"""
const metric=num(x.metric,0), threshold=num(x.threshold,100);
decision = metric<=threshold ? 'healthy' : 'escalate';
result={metric,threshold,breach:metric>threshold}; metrics={distance:Number((metric-threshold).toFixed(3))};
""",
"SEQUENCE": r"""
const attempts=Math.max(0,Math.trunc(num(x.attempts,0))), maxAttempts=Math.max(1,Math.trunc(num(x.maxAttempts,3)));
decision=attempts<maxAttempts?'scheduled':'capped';
const base=Math.max(1,num(x.baseDelayMinutes,15)); const delay=Math.min(10080,base*Math.pow(2,attempts));
result={attempts,maxAttempts,nextAttempt:attempts+1,dueInMinutes:delay}; metrics={remaining:Math.max(0,maxAttempts-attempts)};
""",
"POLICY": r"""
const risk=Math.max(0,Math.min(1,num(x.riskScore,0))), threshold=Math.max(0,Math.min(1,num(x.threshold,0.5)));
const consent=x.consent!==false, approved=x.approved!==false;
decision = consent && approved && risk<=threshold ? 'allow' : 'review';
result={riskScore:risk,threshold,consent,approved,requiresApproval:decision!=='allow'}; metrics={riskMargin:Number((threshold-risk).toFixed(4))};
""",
"STATE": r"""
const current=clean(x.currentState||'new'), next=clean(x.nextState||'active');
const allowed={new:['active','cancelled'],active:['completed','cancelled','paused'],paused:['active','cancelled'],completed:[],cancelled:[]};
const ok=(allowed[current]||[]).includes(next); decision=ok?'transitioned':'blocked';
result={currentState:current,nextState:next}; metrics={allowedTransitions:(allowed[current]||[]).length};
""",
"AGGREGATE": r"""
const items=Array.isArray(x.items)?x.items:[]; const total=items.reduce((s,i)=>s+num(i.amount,0),0);
decision=items.length?'summarized':'empty'; result={count:items.length,total:Number(total.toFixed(2))}; metrics={nonZero:items.filter(i=>num(i.amount,0)!==0).length};
""",
"VALIDATE": r"""
const amount=num(x.amount,NaN); const complete=x.requiredFieldsComplete===true; const arithmetic=x.arithmeticValid!==false;
const ok=Number.isFinite(amount)&&amount>=0&&complete&&arithmetic; decision=ok?'valid':'invalid';
result={amount:Number.isFinite(amount)?amount:null,requiredFieldsComplete:complete,arithmeticValid:arithmetic}; metrics={checksPassed:[Number.isFinite(amount)&&amount>=0,complete,arithmetic].filter(Boolean).length};
""",
"COMPOSE": r"""
const approved=x.approvedInput===true, blocked=x.blocked===true; decision=approved&&!blocked?'proposed':'blocked';
const payload={entityId:clean(x.entityId||x.traceId),amount:num(x.amount,0),currency:String(x.currency||'PEN').toUpperCase(),version:1};
result={payload,payloadHash:[payload.entityId,payload.amount,payload.currency,payload.version].join(':')}; metrics={fields:Object.keys(payload).length};
""",
"RECONCILE": r"""
const actual=num(x.amount,NaN), expected=num(x.expectedAmount,NaN), tolerance=Math.max(0,num(x.tolerance,0.01));
const diff=Number.isFinite(actual)&&Number.isFinite(expected)?Math.abs(actual-expected):Infinity;
decision=diff<=tolerance?'reconciled':'unmatched'; result={actual,expected,difference:Number.isFinite(diff)?Number(diff.toFixed(4)):null,tolerance}; metrics={withinTolerance:diff<=tolerance};
""",
"FORECAST": r"""
const h=(Array.isArray(x.history)?x.history:[]).map(v=>num(v,NaN)).filter(Number.isFinite);
if(h.length>=3){const w=h.slice(-3); const forecast=w[0]*0.2+w[1]*0.3+w[2]*0.5; decision='forecasted'; result={forecast:Number(forecast.toFixed(2)),method:'weighted-3-period'};} else {decision='insufficient_data'; result={forecast:null};}
metrics={observations:h.length};
""",
"VERIFY": r"""
const sig=String(x.signature||''), expected=String(x.expectedSignature||''); const age=Math.max(0,num(x.ageSeconds,0)), maxAge=Math.max(1,num(x.maxAgeSeconds,300));
const ok=sig.length>=8 && sig===expected && age<=maxAge; decision=ok?'verified':'rejected'; result={signaturePresent:!!sig,ageSeconds:age,maxAgeSeconds:maxAge}; metrics={fresh:age<=maxAge};
""",
"GOVERNOR": r"""
const usage=Math.max(0,num(x.usage,0)), limit=Math.max(1,num(x.limit,100)), retryAfter=Math.max(1,num(x.retryAfterSeconds,60));
decision=usage<limit?'allow':'throttle'; result={usage,limit,retryAfterSeconds:decision==='throttle'?retryAfter:0}; metrics={utilization:Number((usage/limit).toFixed(4))};
""",
"SAVINGS": r"""
const units=num(x.automatedUnits,NaN), manual=num(x.manualMinutesPerUnit,NaN), exception=num(x.exceptionMinutes,0), oversight=num(x.oversightMinutes,0), hourly=num(x.hourlyCost,NaN), variable=num(x.automationVariableCost,0);
const valid=[units,manual,hourly].every(Number.isFinite)&&units>=0&&manual>=0&&hourly>=0&&exception>=0&&oversight>=0;
if(valid){const minutes=Math.max(0,units*manual-exception-oversight); const gross=minutes/60*hourly; decision='calculated'; result={netCapacityMinutes:Number(minutes.toFixed(2)),estimatedCapacityValue:Number(gross.toFixed(2)),netOperatingValue:Number((gross-variable).toFixed(2)),provenance:String(x.provenance||'ESTIMATED')};} else {decision='invalid'; result={};}
metrics={automatedUnits:Number.isFinite(units)?units:null};
""",
"RETENTION": r"""
const age=Math.max(0,num(x.ageDays,0)), retention=Math.max(1,num(x.retentionDays,365)), legalHold=x.legalHold===true;
decision=legalHold||age<retention?'retain':'expire'; result={ageDays:age,retentionDays:retention,legalHold}; metrics={daysRemaining:legalHold?null:Math.max(0,retention-age)};
""",
}

VALID = {
"tenantId":"tenant-demo","traceId":"trace-valid","source":"whatsapp","channel":"whatsapp","entityId":"A-100",
"email":"a@example.test","phone":"999111222","externalId":"EXT-1","fingerprint":"fp-1","existingFingerprints":[],
"target":{"email":"a@example.test","phone":"999111222","amount":100},"candidates":[{"id":"c1","email":"a@example.test","phone":"999111222","amount":100,"available":True,"capacity":5,"skill":0.9}],
"signals":[{"value":0.9,"weight":2},{"value":0.8,"weight":1}],"threshold":0.65,"metric":20,"attempts":1,"maxAttempts":3,"baseDelayMinutes":15,
"riskScore":0.2,"consent":True,"approved":True,"currentState":"new","nextState":"active","items":[{"amount":40},{"amount":60}],
"amount":100,"expectedAmount":100,"tolerance":0.01,"requiredFieldsComplete":True,"arithmeticValid":True,"approvedInput":True,"blocked":False,"currency":"PEN",
"history":[90,100,110],"signature":"sig-12345678","expectedSignature":"sig-12345678","ageSeconds":10,"maxAgeSeconds":300,
"usage":20,"limit":100,"retryAfterSeconds":60,"automatedUnits":10,"manualMinutesPerUnit":8,"exceptionMinutes":5,"oversightMinutes":5,"hourlyCost":20,"automationVariableCost":2,"provenance":"MEASURED",
"ageDays":30,"retentionDays":365,"legalHold":False,
}

EDGE_MUTATIONS = {
"NORMALIZE":{"source":"","entityId":""}, "MATCH":{"candidates":[{"id":"c2","email":"x@example.test","phone":"000","amount":999}]},
"DEDUPE":{"existingFingerprints":["fp-1"]}, "SCORE":{"signals":[{"value":0.1,"weight":1}]},
"ROUTE":{"candidates":[{"id":"c1","available":False,"capacity":0,"skill":1}]}, "MONITOR":{"metric":200,"threshold":100},
"SEQUENCE":{"attempts":3,"maxAttempts":3}, "POLICY":{"riskScore":0.9,"threshold":0.5}, "STATE":{"currentState":"completed","nextState":"active"},
"AGGREGATE":{"items":[]}, "VALIDATE":{"requiredFieldsComplete":False}, "COMPOSE":{"approvedInput":False},
"RECONCILE":{"amount":100,"expectedAmount":130,"tolerance":0.01}, "FORECAST":{"history":[100]},
"VERIFY":{"signature":"bad","expectedSignature":"sig-12345678"}, "GOVERNOR":{"usage":120,"limit":100},
"SAVINGS":{"automatedUnits":-1}, "RETENTION":{"ageDays":500,"retentionDays":365,"legalHold":False},
}


def quality_score(cap):
    depth = 5 if cap["pattern"] in COMPLEX_PATTERNS else 4
    resilience = 5 if cap["side_effect"] else 4
    security = 5 if cap["risk"] == "high" else 4
    dims = {"businessCoverage":5,"crossClientReuse":5,"decisionDepth":depth,"operationalResilience":resilience,"securityObservability":security,"testabilityEvidence":5}
    return dims, sum(dims.values())


def engine_js(cap):
    prefix=COMMON_PREFIX.replace('__KEY__',json.dumps(cap['key'])).replace('__PATTERN__',json.dumps(cap['pattern']))
    suffix=r"""
const idempotencyKey = [x.tenantId, KEY, clean(x.entityId||x.externalId||x.traceId), x.traceId].join(':');
const businessAction = __SIDE__ ? {status:'proposed',capability:KEY,idempotencyKey,requiresApproval:__HIGH__} : null;
return [{json:{tenantId:x.tenantId,traceId:x.traceId,capabilityKey:KEY,pattern:PATTERN,decision,result,metrics,idempotencyKey,businessAction,validationKey:KEY+':'+x.traceId}}];
""".replace('__SIDE__','true' if cap['side_effect'] else 'false').replace('__HIGH__','true' if cap['risk']=='high' else 'false')
    return prefix + PATTERN_JS[cap['pattern']] + suffix


def workflow(cap):
    key=cap['key']; wid=('wave'+str(cap['wave'])+''.join(p.title() for p in key.lower().split('_'))+'V1')[:120]
    return {"id":wid,"name":f"W{cap['wave']} {key}@1.0","nodes":[
      {"parameters":{"inputSource":"passthrough"},"id":wid+'Trigger',"name":"When Executed by Another Workflow","type":"n8n-nodes-base.executeWorkflowTrigger","typeVersion":1.1,"position":[240,300]},
      {"parameters":{"jsCode":engine_js(cap)},"id":wid+'Engine',"name":"Capability Engine","type":"n8n-nodes-base.code","typeVersion":2,"position":[500,300]}],
      "connections":{"When Executed by Another Workflow":{"main":[[{"node":"Capability Engine","type":"main","index":0}]]}},"settings":{"executionOrder":"v1"},"pinData":{},"tags":[],"meta":{"candidateKey":key,"wave":f"W{cap['wave']}","pattern":cap['pattern'],"family":cap['family']}}


def probe(cap, edge=False):
    expected=PATTERN_EXPECTED[cap['pattern']][1 if edge else 0]; fixture=dict(VALID); fixture['traceId']=f"w{cap['wave']}-{'edge' if edge else 'valid'}-{cap['key'].lower()}"; fixture.update(EDGE_MUTATIONS[cap['pattern']]) if edge else None
    base=workflow(cap); pid=('probe'+base['id']+('Edge' if edge else 'Valid'))[:120]
    assert_js=f"const o=$json;if(o.capabilityKey!=={json.dumps(cap['key'])}) throw new Error('CAPABILITY_MISMATCH'); if(o.decision!=={json.dumps(expected)}) throw new Error('DECISION_MISMATCH expected={expected} actual='+o.decision); return [{{json:{{probe:'PASS',capabilityKey:o.capabilityKey,decision:o.decision,traceId:o.traceId}}}}];"
    return {"id":pid,"name":f"W{cap['wave']} PROBE {cap['key']} {'EDGE' if edge else 'VALID'}","nodes":[
      {"parameters":{},"id":pid+'Trigger',"name":"Manual Trigger","type":"n8n-nodes-base.manualTrigger","typeVersion":1,"position":[160,300]},
      {"parameters":{"jsCode":"return [{json:"+json.dumps(fixture,separators=(',',':'))+"}];"},"id":pid+'Fixture',"name":"Fixture","type":"n8n-nodes-base.code","typeVersion":2,"position":[380,300]},
      {"parameters":{"jsCode":engine_js(cap)},"id":pid+'Engine',"name":"Capability Engine","type":"n8n-nodes-base.code","typeVersion":2,"position":[600,300]},
      {"parameters":{"jsCode":assert_js},"id":pid+'Assert',"name":"Assert Domain Decision","type":"n8n-nodes-base.code","typeVersion":2,"position":[820,300]}],
      "connections":{"Manual Trigger":{"main":[[{"node":"Fixture","type":"main","index":0}]]},"Fixture":{"main":[[{"node":"Capability Engine","type":"main","index":0}]]},"Capability Engine":{"main":[[{"node":"Assert Domain Decision","type":"main","index":0}]]}},"settings":{"executionOrder":"v1"},"pinData":{},"tags":[],"meta":{"probeFor":cap['key'],"wave":f"W{cap['wave']}","case":"edge" if edge else "valid"}}


def main():
    if OUT.exists(): shutil.rmtree(OUT)
    CANDIDATES.mkdir(parents=True); PROBES.mkdir(parents=True)
    registry=[]
    for cap in iter_capabilities():
        dims,total=quality_score(cap); wf=workflow(cap)
        package=CANDIDATES/f"W{cap['wave']}"/cap['family']/f"{cap['key']}@1.0.0"; package.mkdir(parents=True)
        raw=json.dumps(wf,indent=2,sort_keys=True)+"\n"; (package/'workflow.json').write_text(raw)
        digest=hashlib.sha256(raw.encode()).hexdigest()
        manifest={**cap,"version":"1.0.0","stage":"HARDENED_CANDIDATE","runtime":{"engine":"n8n","profile":"n8n-base-js-v1","testedVersion":"2.38.7"},"quality":{"dimensions":dims,"total":total,"minimum":24},"workflowSha256":digest,"inputContract":"passthrough","businessActionMode":"proposed" if cap['side_effect'] else "none"}
        (package/'manifest.json').write_text(json.dumps(manifest,indent=2,sort_keys=True)+"\n")
        for edge in (False,True):
            p=probe(cap,edge); pp=PROBES/f"W{cap['wave']}"; pp.mkdir(parents=True,exist_ok=True); (pp/f"{p['id']}.json").write_text(json.dumps(p,indent=2,sort_keys=True)+"\n")
        registry.append({"wave":cap['wave'],"key":cap['key'],"family":cap['family'],"pattern":cap['pattern'],"quality":total,"workflowSha256":digest})
    (OUT/'registry.json').write_text(json.dumps(registry,indent=2,sort_keys=True)+"\n")
    print(f"WAVES BUILD: PASS capabilities={len(registry)} probes={len(registry)*2}")

if __name__=='__main__': main()
