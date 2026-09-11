#!/usr/bin/env python3
from __future__ import annotations
import json, os, re, shutil, subprocess, sys, urllib.request
from dataclasses import dataclass
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
COMPOSE=ROOT/'factory/runtime/compose.yml'
HARD=ROOT/'quarries/workflow-quarry/30-hardened'
TESTED=ROOT/'quarries/workflow-quarry/40-tested'
APPROVED=ROOT/'quarries/workflow-quarry/50-approved-baseline'
LIB=ROOT/'workflows/n8n'
GEN=ROOT/'w2/.generated-tests'
N8N_VERSION='2.38.7'
MOCK='http://127.0.0.1:18080'
FACTORY_TOKEN='factory-test-token'
EXPECTED={
'OMNICHANNEL_DOCUMENT_INTAKE','MEDIA_FETCH_GUARD','DOCUMENT_PROVENANCE_STORE','DOCUMENT_CLASSIFY_CONFIDENCE',
'DOCUMENT_EXTRACT_SMART','FINANCIAL_DOCUMENT_VALIDATE','DOCUMENT_DEDUPE_COMPOSITE','ACCOUNTING_DOCUMENT_NORMALIZE',
'REVIEW_EXCEPTION_ORCHESTRATOR','ACCOUNTING_EXPORT_DISPATCH','INTAKE_ACKNOWLEDGE'}
DOMAIN_EXPECT={
'OMNICHANNEL_DOCUMENT_INTAKE': [('decision','rejected'),('reason','UNSUPPORTED_MIME')],
'MEDIA_FETCH_GUARD': [('fetchAllowed',False),('reason','FILE_TOO_LARGE')],
'DOCUMENT_PROVENANCE_STORE': [('storagePolicy','immutable-original')],
'DOCUMENT_CLASSIFY_CONFIDENCE': [('decision','review'),('reason','AMBIGUOUS_MARGIN')],
'DOCUMENT_EXTRACT_SMART': [('decision','review'),('reason','LOW_FIELD_CONFIDENCE')],
'FINANCIAL_DOCUMENT_VALIDATE': [('valid',False),('reason','ARITHMETIC_MISMATCH')],
'DOCUMENT_DEDUPE_COMPOSITE': [('decision','probable_duplicate')],
'ACCOUNTING_DOCUMENT_NORMALIZE': [('normalizationVersion','accounting-document-v1')],
'REVIEW_EXCEPTION_ORCHESTRATOR': [('requiresReview',True),('reason','ARITHMETIC_MISMATCH'),('priority','high')],
'ACCOUNTING_EXPORT_DISPATCH': [('status','proposed'),('destinationAdapter','google-sheets')],
'INTAKE_ACKNOWLEDGE': [('status','accepted'),('sourceChannel','whatsapp')],
}

@dataclass
class Result:
    key:str; family:str; package:Path; side_effect:bool; tests:list[tuple[str,str,str]]

def run(cmd,check=True,env=None):
    p=subprocess.run(cmd,cwd=ROOT,text=True,capture_output=True,env=env)
    out=(p.stdout or '')+(p.stderr or '')
    if check and p.returncode!=0:
        print(out); raise RuntimeError(f"command failed rc={p.returncode}: {' '.join(map(str,cmd))}")
    return p.returncode,out

def compose(*args,check=True,env=None):
    e=os.environ.copy(); e.setdefault('N8N_VERSION',N8N_VERSION)
    if env:e.update(env)
    return run(['docker','compose','-f',str(COMPOSE),*args],check=check,env=e)

def packages():
    out=[]
    for wf in sorted(HARD.rglob('workflow.json')):
        data=json.loads(wf.read_text())
        key=data.get('meta',{}).get('candidateKey')
        if key in EXPECTED and data.get('meta',{}).get('wave')=='W2': out.append((key,wf.parent.parent.name,wf.parent,data))
    keys={x[0] for x in out}
    if keys!=EXPECTED: raise RuntimeError(f'W2 package mismatch missing={sorted(EXPECTED-keys)} extra={sorted(keys-EXPECTED)}')
    return out

def is_side_effect(data): return any(n.get('type')=='n8n-nodes-base.httpRequest' for n in data.get('nodes',[]))

def wrapper(key,target_id,fixture,suffix):
    wid=('w2test'+re.sub(r'[^A-Za-z0-9]','',key.title())+suffix.title())[:120]
    code='return [{ json: '+json.dumps(fixture,separators=(',',':'))+' }];'
    return wid,{"id":wid,"name":f"W2 TEST {key} {suffix}","nodes":[
      {"parameters":{},"id":wid+'Trigger',"name":"Manual Trigger","type":"n8n-nodes-base.manualTrigger","typeVersion":1,"position":[220,300]},
      {"parameters":{"jsCode":code},"id":wid+'Fixture',"name":"Load Fixture","type":"n8n-nodes-base.code","typeVersion":2,"position":[460,300]},
      {"parameters":{"mode":"each","workflowId":{"__rl":True,"value":target_id,"mode":"id"},"options":{"waitForSubWorkflow":True}},"id":wid+'Execute',"name":"Execute Candidate","type":"n8n-nodes-base.executeWorkflow","typeVersion":1.1,"position":[700,300]}],
      "connections":{"Manual Trigger":{"main":[[{"node":"Load Fixture","type":"main","index":0}]]},"Load Fixture":{"main":[[{"node":"Execute Candidate","type":"main","index":0}]]}},"settings":{"executionOrder":"v1"},"pinData":{},"tags":[]}

def import_workflow(path:Path):
    rel=path.relative_to(ROOT)
    return compose('run','--rm','--no-deps','-T','n8n','import:workflow',f'--input=/workspace/{rel}',check=False)

def publish_workflow(wid): return compose('run','--rm','--no-deps','-T','n8n','publish:workflow',f'--id={wid}',check=False)

def execute(wid,extra_env=None):
    args=['run','--rm','--no-deps','-T']
    if extra_env:
        for k,v in extra_env.items(): args += ['-e',f'{k}={v}']
    args += ['n8n','execute',f'--id={wid}','--rawOutput']
    return compose(*args,check=False)

def failed(rc,out,marker=None):
    bad=rc!=0 or 'Execution was NOT successful' in out or 'Error executing workflow' in out or 'Problem in node' in out
    return bad or (bool(marker) and marker in out)

def request(method,path,payload=None):
    data=None if payload is None else json.dumps(payload).encode()
    req=urllib.request.Request(MOCK+path,data=data,method=method); req.add_header('Content-Type','application/json')
    with urllib.request.urlopen(req,timeout=10) as r:return r.read().decode()

def reset_mock():
    try: request('DELETE','/__admin/requests')
    except Exception: request('POST','/__admin/requests/reset',{})
    try: request('POST','/__admin/scenarios/reset',{})
    except Exception: pass

def mock_requests(): return json.loads(request('GET','/__admin/requests')).get('requests',[])

def bodies_for(trace):
    out=[]
    for item in mock_requests():
        req=item.get('request',item); body=req.get('body','')
        if trace in body:
            try: out.append(json.loads(body))
            except Exception: pass
    return out

def idempotency_headers(trace):
    vals=[]
    for item in mock_requests():
        req=item.get('request',item)
        if trace not in req.get('body',''):continue
        raw=req.get('headers',{}).get('Idempotency-Key',[])
        if isinstance(raw,str):vals.append(raw)
        elif raw:vals.append(raw[0])
    return vals

def request_count(trace): return len(bodies_for(trace))

def output_identity(text):
    hits=re.findall(r'(?:(?:validationKey|normalizationKey))[^A-Za-z0-9:_-]+([A-Za-z0-9:._-]+)',text)
    return hits[-1] if hits else None

def assert_domain(key,payload_or_text):
    text=json.dumps(payload_or_text,sort_keys=True) if not isinstance(payload_or_text,str) else payload_or_text
    for kind,value in DOMAIN_EXPECT[key]:
        if kind=='reason':
            if str(value) not in text: raise RuntimeError(f'W2-D01 {key}: expected reason {value} not found: {text[:1500]}')
        elif isinstance(value,bool):
            needle=f'"{kind}": {str(value).lower()}'
            compact=f'"{kind}":{str(value).lower()}'
            if needle not in text and compact not in text: raise RuntimeError(f'W2-D01 {key}: expected {kind}={value}')
        else:
            if str(value) not in text: raise RuntimeError(f'W2-D01 {key}: expected {kind}={value} not found')

def secret_scan(pkg):
    pats=[re.compile(r'sk-[A-Za-z0-9]{20,}'),re.compile(r'AIza[0-9A-Za-z_-]{20,}'),re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),re.compile(r'Bearer\s+[A-Za-z0-9._~-]{24,}')]
    for p in pkg.rglob('*'):
        if not p.is_file():continue
        txt=p.read_text(encoding='utf-8',errors='ignore')
        if FACTORY_TOKEN in txt:return False,f'factory token literal in {p.name}'
        for rx in pats:
            if rx.search(txt):return False,f'secret-like pattern in {p.name}'
    data=json.loads((pkg/'workflow.json').read_text())
    if any(n.get('credentials') for n in data.get('nodes',[])):return False,'bound credential reference'
    return True,'zero embedded secrets/bound credentials'

def write_report(res,sha,run_id):
    dest=TESTED/res.family/res.package.name
    if dest.exists():
        if (dest/'workflow.json').read_bytes()!=(res.package/'workflow.json').read_bytes():raise RuntimeError(f'TESTED conflict {dest}')
    else:
        dest.parent.mkdir(parents=True,exist_ok=True); shutil.copytree(res.package,dest)
    lines=[f'# {res.key}@1.0.0 — W2 Runtime & Domain Test Report','', 'VERDICT: PASS','',f'- evidence SHA: `{sha}`',f'- GitHub run: `{run_id}`',f'- n8n: `{N8N_VERSION}`','- profile: `n8n-base-js-v1`','- DB ownership: exclusive one-shot CLI after server initialization','- publish proof: CLI rc=0 + actual Execute Workflow success','- mock: WireMock 3.9.1','','## Results','']
    for tid,status,detail in res.tests:lines.append(f'- **{tid}** — {status}: {detail}')
    lines += ['','All gates passed before promotion. HARDENED source remains preserved.','']
    (dest/'evidence/TEST-REPORT.md').write_text('\n'.join(lines))
    return dest

def promote(tested,family,key):
    approved=APPROVED/family/f'{key}@1.0.0'; lib=LIB/family/f'{key}@1.0.0'
    if approved.exists() or lib.exists():
        if not (approved.exists() and lib.exists()):raise RuntimeError(f'partial promotion {key}')
        src=(tested/'workflow.json').read_bytes()
        if (approved/'workflow.json').read_bytes()!=src or (lib/'workflow.json').read_bytes()!=src:raise RuntimeError(f'immutable promotion conflict {key}')
        return
    rc,out=run([sys.executable,str(ROOT/'factory/tools/promote.py'),'--package',str(tested.relative_to(ROOT)),'--family',family],check=False)
    if rc!=0 or 'PROMOTION: PASS' not in out:raise RuntimeError(f'promotion failed {key}\n{out}')

def main():
    sha=os.getenv('GITHUB_SHA','LOCAL'); run_id=os.getenv('GITHUB_RUN_ID','LOCAL'); GEN.mkdir(parents=True,exist_ok=True)
    compose('down','-v',check=False); compose('up','-d','--wait')
    results=[]; captured=[]
    try:
        compose('stop','n8n')
        packs=packages()
        for key,family,pkg,data in packs:
            rc,out=import_workflow(pkg/'workflow.json')
            if rc!=0:raise RuntimeError(f'T01 import failed {key}\n{out}')
            rc,pub=publish_workflow(data['id'])
            if rc!=0:raise RuntimeError(f'T01 publish failed {key}\n{pub}')
        wrappers={}
        fixture_names=[('valid','valid.json'),('invalidtenant','invalid-missing-tenant.json'),('duplicate','duplicate.json'),('invalidtime','invalid-timestamp.json'),('transient','transient.json'),('permanent','permanent.json'),('review','review-path.json')]
        for key,family,pkg,data in packs:
            for suffix,name in fixture_names:
                fixture=json.loads((pkg/'fixtures'/name).read_text()); wid,w=wrapper(key,data['id'],fixture,suffix); p=GEN/f'{wid}.json'; p.write_text(json.dumps(w,indent=2)+'\n')
                rc,out=import_workflow(p)
                if rc!=0:raise RuntimeError(f'wrapper import failed {key}/{suffix}\n{out}')
                wrappers[(key,suffix)]=wid
        for key,family,pkg,data in packs:
            se=is_side_effect(data); tests=[('T01','PASS','candidate imported and published; all test wrappers imported')]
            reset_mock(); rc,out=execute(wrappers[(key,'valid')]); captured.append(out)
            if failed(rc,out):raise RuntimeError(f'T02 valid failed {key}\n{out}')
            tests.append(('T02','PASS','valid fixture executed'))
            rc,bad=execute(wrappers[(key,'invalidtenant')]); captured.append(bad)
            if not failed(rc,bad,f'{key}_INVALID_INPUT'):raise RuntimeError(f'T03 missing tenant passed {key}\n{bad}')
            tests.append(('T03','PASS','missing tenant failed closed'))
            reset_mock(); valid=json.loads((pkg/'fixtures/valid.json').read_text()); trace=str(valid['traceId'])
            rc,a=execute(wrappers[(key,'valid')]); rc2,b=execute(wrappers[(key,'duplicate')]); captured += [a,b]
            if failed(rc,a) or failed(rc2,b):raise RuntimeError(f'T04 replay execution failed {key}')
            if se:
                hs=idempotency_headers(trace)
                if len(hs)<2 or len(set(hs))!=1:raise RuntimeError(f'T04 idempotency mismatch {key}: {hs}')
                detail=f'deterministic Idempotency-Key stable across {len(hs)} replay requests'
            else:
                k1,k2=output_identity(a),output_identity(b)
                if not k1 or k1!=k2:raise RuntimeError(f'T04 pure identity mismatch {key}: {k1} vs {k2}')
                detail='deterministic pure-transform identity stable across replay'
            tests.append(('T04','PASS',detail))
            rc,tout=execute(wrappers[(key,'invalidtime')]); captured.append(tout)
            if not failed(rc,tout,f'{key}_INVALID_TIMESTAMP'):raise RuntimeError(f'T05 invalid timestamp passed {key}\n{tout}')
            tests.append(('T05','PASS','invalid timestamp rejected'))
            if se:
                reset_mock(); rc,tr=execute(wrappers[(key,'transient')]); captured.append(tr); tt=json.loads((pkg/'fixtures/transient.json').read_text())['traceId']; cnt=request_count(tt)
                if failed(rc,tr) or cnt!=3:raise RuntimeError(f'T06 transient failed {key}: rc={rc} count={cnt}\n{tr}')
                tests.append(('T06','PASS','two transient 5xx responses then success; exactly 3 attempts'))
                reset_mock(); rc,pr=execute(wrappers[(key,'permanent')]); captured.append(pr); pt=json.loads((pkg/'fixtures/permanent.json').read_text())['traceId']; cnt=request_count(pt)
                if not failed(rc,pr) or cnt!=3:raise RuntimeError(f'T07 permanent gate failed {key}: rc={rc} count={cnt}\n{pr}')
                tests.append(('T07','PASS','permanent 5xx visible after exactly 3 attempts'))
            else: tests += [('T06','N/A','pure transform'),('T07','N/A','pure transform')]
            ok,detail=secret_scan(pkg)
            if not ok:raise RuntimeError(f'T08 secret scan failed {key}: {detail}')
            tests.append(('T08','PASS',detail))
            if FACTORY_TOKEN in '\n'.join(captured):raise RuntimeError(f'T09 factory token leaked {key}')
            tests.append(('T09','PASS','factory token absent from captured output'))
            if se:
                rc,cfg=execute(wrappers[(key,'valid')],{'AUTOMATION_CONTROL_PLANE_URL':''}); captured.append(cfg)
                if not failed(rc,cfg):raise RuntimeError(f'T10 missing config passed {key}')
                tests.append(('T10','PASS','empty control-plane URL failed closed'))
            else: tests.append(('T10','N/A','pure transform'))
            reset_mock(); review=json.loads((pkg/'fixtures/review-path.json').read_text()); rtrace=review['traceId']; rc,dout=execute(wrappers[(key,'review')]); captured.append(dout)
            if failed(rc,dout):raise RuntimeError(f'W2-D01 review/domain fixture failed execution {key}\n{dout}')
            if se:
                bodies=bodies_for(rtrace)
                if not bodies:raise RuntimeError(f'W2-D01 no persisted domain decision for {key}')
                assert_domain(key,bodies[-1])
            else: assert_domain(key,dout)
            tests.append(('W2-D01','PASS','capability-specific decision/review path asserted'))
            results.append(Result(key,family,pkg,se,tests))
        for res in results:
            tested=write_report(res,sha,run_id); promote(tested,res.family,res.key)
        print(f'W2 RUNTIME CERTIFICATION: PASS components={len(results)}')
    finally:
        compose('down','-v',check=False)
        if GEN.exists():shutil.rmtree(GEN)

if __name__=='__main__':main()
