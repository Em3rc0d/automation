#!/usr/bin/env python3
from __future__ import annotations
import json, os, re, shutil, subprocess, sys, urllib.request
from dataclasses import dataclass
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
COMPOSE=ROOT/"factory/runtime/compose.yml"
HARD=ROOT/"quarries/workflow-quarry/30-hardened"
TESTED=ROOT/"quarries/workflow-quarry/40-tested"
APPROVED=ROOT/"quarries/workflow-quarry/50-approved-baseline"
LIB=ROOT/"workflows/n8n"
GEN=ROOT/"w1/.generated-tests"
N8N_VERSION="2.38.7"
EXPECTED_KEYS={
"EXECUTION_TELEMETRY","ERROR_TO_INCIDENT","SAVINGS_EVENT_EMIT","APPROVAL_REQUEST","HUMAN_REVIEW_TASK",
"LEAD_CAPTURE","LEAD_NORMALIZE","LEAD_DEDUPE","CRM_UPSERT_CONTACT","LEAD_ACKNOWLEDGE","LEAD_FOLLOWUP_WATCHDOG"
}
FACTORY_TOKEN="factory-test-token"
MOCK="http://127.0.0.1:18080"

@dataclass
class Result:
    key:str
    family:str
    package:Path
    side_effect:bool
    tests:list[tuple[str,str,str]]

def run(cmd, check=True, env=None):
    p=subprocess.run(cmd,cwd=ROOT,text=True,capture_output=True,env=env)
    out=(p.stdout or "")+(p.stderr or "")
    if check and p.returncode!=0:
        print(out)
        raise RuntimeError(f"command failed rc={p.returncode}: {' '.join(map(str,cmd))}")
    return p.returncode,out

def compose(*args,check=True,env=None):
    e=os.environ.copy(); e.setdefault("N8N_VERSION",N8N_VERSION)
    if env: e.update(env)
    return run(["docker","compose","-f",str(COMPOSE),*args],check=check,env=e)

def packages():
    out=[]
    for wf in sorted(HARD.rglob("workflow.json")):
        data=json.loads(wf.read_text())
        key=data.get("meta",{}).get("candidateKey")
        if key in EXPECTED_KEYS:
            out.append((key,wf.parent.parent.name,wf.parent,data))
    keys={x[0] for x in out}
    if keys!=EXPECTED_KEYS:
        raise RuntimeError(f"W1 package set mismatch missing={sorted(EXPECTED_KEYS-keys)} extra={sorted(keys-EXPECTED_KEYS)}")
    return out

def side_effect(data):
    return any(n.get("type")=="n8n-nodes-base.httpRequest" for n in data.get("nodes",[]))

def wrapper(key,target_id,fixture,suffix):
    wid=("w1test"+re.sub(r"[^A-Za-z0-9]","",key.title())+suffix.title())[:120]
    code="return [{ json: "+json.dumps(fixture,separators=(",",":"))+" }];"
    return wid,{"id":wid,"name":f"W1 TEST {key} {suffix}","nodes":[
      {"parameters":{},"id":wid+"Trigger","name":"Manual Trigger","type":"n8n-nodes-base.manualTrigger","typeVersion":1,"position":[220,300]},
      {"parameters":{"jsCode":code},"id":wid+"Fixture","name":"Load Fixture","type":"n8n-nodes-base.code","typeVersion":2,"position":[460,300]},
      {"parameters":{"mode":"each","workflowId":{"__rl":True,"value":target_id,"mode":"id"},"options":{"waitForSubWorkflow":True}},"id":wid+"Execute","name":"Execute Candidate","type":"n8n-nodes-base.executeWorkflow","typeVersion":1.1,"position":[700,300]}],
      "connections":{"Manual Trigger":{"main":[[{"node":"Load Fixture","type":"main","index":0}]]},"Load Fixture":{"main":[[{"node":"Execute Candidate","type":"main","index":0}]]}},"settings":{"executionOrder":"v1"},"pinData":{},"tags":[]}

def mock_post(path,payload=None):
    data=None if payload is None else json.dumps(payload).encode()
    req=urllib.request.Request(MOCK+path,data=data,method="POST"); req.add_header("Content-Type","application/json")
    with urllib.request.urlopen(req,timeout=10) as r: return r.read().decode()

def mock_delete(path):
    req=urllib.request.Request(MOCK+path,method="DELETE")
    with urllib.request.urlopen(req,timeout=10) as r: return r.read().decode()

def mock_json(path):
    with urllib.request.urlopen(MOCK+path,timeout=10) as r: return json.loads(r.read().decode())

def reset_mock():
    try: mock_delete("/__admin/requests")
    except Exception: mock_post("/__admin/requests/reset",{})
    try: mock_post("/__admin/scenarios/reset",{})
    except Exception: pass

def request_count(trace):
    data=mock_json("/__admin/requests"); c=0
    for item in data.get("requests",[]):
        req=item.get("request",item)
        if trace in req.get("body",""): c+=1
    return c

def idempotency_headers(trace):
    data=mock_json("/__admin/requests"); vals=[]
    for item in data.get("requests",[]):
        req=item.get("request",item)
        if trace not in req.get("body",""): continue
        raw=req.get("headers",{}).get("Idempotency-Key",[])
        if isinstance(raw,str): vals.append(raw)
        elif raw: vals.append(raw[0])
    return vals

def import_workflow(path:Path):
    rel=path.relative_to(ROOT)
    return compose("run","--rm","--no-deps","-T","n8n","n8n","import:workflow",f"--input=/workspace/{rel}",check=False)

def execute_wrapper(wid,extra_env=None):
    args=["run","--rm","--no-deps","-T"]
    if extra_env:
        for k,v in extra_env.items(): args += ["-e",f"{k}={v}"]
    args += ["n8n","n8n","execute",f"--id={wid}","--rawOutput"]
    return compose(*args,check=False)

def failed(rc,out,marker=None):
    bad=rc!=0 or "Execution was NOT successful" in out or "Error executing workflow" in out or "Problem in node" in out
    if marker: bad=bad or marker in out
    return bad

def secret_scan(pkg):
    pats=[re.compile(r"sk-[A-Za-z0-9]{20,}"),re.compile(r"AIza[0-9A-Za-z_-]{20,}"),re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),re.compile(r"Bearer\s+[A-Za-z0-9._~-]{24,}")]
    for p in pkg.rglob("*"):
        if not p.is_file(): continue
        txt=p.read_text(encoding="utf-8",errors="ignore")
        if FACTORY_TOKEN in txt: return False,f"factory token literal in {p.name}"
        for rx in pats:
            if rx.search(txt): return False,f"secret-like pattern in {p.name}"
    data=json.loads((pkg/"workflow.json").read_text())
    if any(n.get("credentials") for n in data.get("nodes",[])): return False,"bound credential reference"
    return True,"zero embedded secrets/bound credentials"

def write_report(res,evidence_sha,run_id):
    dest=TESTED/res.family/res.package.name
    if dest.exists():
        if json.loads((dest/"workflow.json").read_text())!=json.loads((res.package/"workflow.json").read_text()): raise RuntimeError(f"TESTED destination conflict: {dest}")
    else:
        dest.parent.mkdir(parents=True,exist_ok=True); shutil.copytree(res.package,dest)
    lines=[f"# {res.key}@1.0 — W1 Runtime Test Report","","VERDICT: PASS","",f"- evidence SHA: `{evidence_sha}`",f"- GitHub run: `{run_id}`",f"- n8n: `{N8N_VERSION}`","- execution mode: isolated CLI wrapper → Execute Sub-workflow","- database ownership: n8n server stopped during CLI import/execute","- mock: WireMock 3.9.1",f"- side effect: `{str(res.side_effect).lower()}`","","## Results",""]
    for tid,status,detail in res.tests: lines.append(f"- **{tid}** — {status}: {detail}")
    lines += ["","All applicable gates passed. Source HARDENED package remains preserved.",""]
    (dest/"evidence/TEST-REPORT.md").write_text("\n".join(lines))
    return dest

def promote(tested,family,key):
    approved=APPROVED/family/f"{key}@1.0.0"; library=LIB/family/f"{key}@1.0.0"
    if approved.exists() or library.exists():
        if not (approved.exists() and library.exists()): raise RuntimeError(f"partial existing promotion for {key}")
        src=(tested/"workflow.json").read_bytes()
        if (approved/"workflow.json").read_bytes()!=src or (library/"workflow.json").read_bytes()!=src: raise RuntimeError(f"immutable promotion conflict for {key}")
        return
    rel=tested.relative_to(ROOT)
    rc,out=run([sys.executable,str(ROOT/"factory/tools/promote.py"),"--package",str(rel),"--family",family],check=False)
    if rc!=0 or "PROMOTION: PASS" not in out: raise RuntimeError(f"promotion failed {key}\n{out}")

def main():
    evidence_sha=os.getenv("GITHUB_SHA","LOCAL"); run_id=os.getenv("GITHUB_RUN_ID","LOCAL")
    GEN.mkdir(parents=True,exist_ok=True)
    compose("down","-v",check=False); compose("up","-d","--wait")
    results=[]; runtime_log=[]
    try:
        # n8n was booted once above to prove the pinned runtime/DB can initialize.
        # Stop the long-running server before any CLI import or execution so SQLite
        # has exactly one owner at a time; this prevents hidden SQLITE_BUSY races.
        compose("stop","n8n")
        for key,family,pkg,data in packages():
            rc,out=import_workflow(pkg/"workflow.json")
            if rc!=0: raise RuntimeError(f"T01 import failed {key}\n{out}")
        wrappers={}
        for key,family,pkg,data in packages():
            for suffix,name in [("valid","valid.json"),("invalidtenant","invalid-missing-tenant.json"),("duplicate","duplicate.json"),("invalidtime","invalid-timestamp.json"),("transient","transient.json"),("permanent","permanent.json")]:
                fixture=json.loads((pkg/"fixtures"/name).read_text()); wid,w=wrapper(key,data["id"],fixture,suffix)
                path=GEN/f"{wid}.json"; path.write_text(json.dumps(w,indent=2)+"\n")
                rc,out=import_workflow(path)
                if rc!=0: raise RuntimeError(f"wrapper import failed {key}/{suffix}\n{out}")
                wrappers[(key,suffix)]=wid
        for key,family,pkg,data in packages():
            se=side_effect(data); tests=[("T01","PASS","candidate and wrappers imported cleanly with exclusive SQLite ownership")]
            reset_mock(); rc,out=execute_wrapper(wrappers[(key,"valid")]); runtime_log.append(out)
            if rc!=0 or failed(rc,out): raise RuntimeError(f"T02 valid execution failed {key}\n{out}")
            tests.append(("T02","PASS","valid fixture executed successfully"))
            rc,bad=execute_wrapper(wrappers[(key,"invalidtenant")]); runtime_log.append(bad)
            if not failed(rc,bad,f"{key}_INVALID_INPUT"): raise RuntimeError(f"T03 missing tenant unexpectedly passed {key}\n{bad}")
            tests.append(("T03","PASS","missing tenant failed closed"))
            reset_mock(); valid=json.loads((pkg/"fixtures/valid.json").read_text()); trace=str(valid.get("traceId",""))
            rc,a=execute_wrapper(wrappers[(key,"valid")]); rc2,b=execute_wrapper(wrappers[(key,"duplicate")]); runtime_log += [a,b]
            if rc!=0 or rc2!=0: raise RuntimeError(f"T04 replay execution failed {key}")
            if se:
                hs=idempotency_headers(trace)
                if len(hs)<2 or len(set(hs))!=1: raise RuntimeError(f"T04 idempotency mismatch {key}: {hs}")
                detail=f"one deterministic Idempotency-Key across {len(hs)} replay requests"
            else:
                m1=re.findall(r"lead-normalize:[^\"\\\s]+",a); m2=re.findall(r"lead-normalize:[^\"\\\s]+",b)
                if not m1 or not m2 or m1[-1]!=m2[-1]: raise RuntimeError(f"T04 deterministic key mismatch {key}")
                detail="pure transform returned same deterministic normalization key"
            tests.append(("T04","PASS",detail))
            rc,tout=execute_wrapper(wrappers[(key,"invalidtime")]); runtime_log.append(tout)
            has_time=any(k in valid for k in ("occurredAt","lastContactAt","expiresAt"))
            if has_time:
                if not failed(rc,tout,f"{key}_INVALID_TIMESTAMP"): raise RuntimeError(f"T05 invalid timestamp unexpectedly passed {key}\n{tout}")
                tests.append(("T05","PASS","invalid timestamp rejected"))
            else: tests.append(("T05","N/A","no required timestamp"))
            if se:
                reset_mock(); rc,tr=execute_wrapper(wrappers[(key,"transient")]); runtime_log.append(tr)
                tt=str(json.loads((pkg/"fixtures/transient.json").read_text()).get("traceId","")); cnt=request_count(tt)
                if rc!=0 or failed(rc,tr) or cnt!=3: raise RuntimeError(f"T06 transient retry failed {key}: rc={rc} count={cnt}\n{tr}")
                tests.append(("T06","PASS","receiver failed twice then succeeded; exactly 3 attempts"))
                reset_mock(); rc,pr=execute_wrapper(wrappers[(key,"permanent")]); runtime_log.append(pr)
                pt=str(json.loads((pkg/"fixtures/permanent.json").read_text()).get("traceId","")); cnt=request_count(pt)
                if not failed(rc,pr) or cnt!=3: raise RuntimeError(f"T07 permanent failure gate failed {key}: rc={rc} count={cnt}\n{pr}")
                tests.append(("T07","PASS","permanent 5xx failed visibly after exactly 3 attempts"))
            else: tests += [("T06","N/A","no receiver side effect"),("T07","N/A","no receiver side effect")]
            ok,detail=secret_scan(pkg)
            if not ok: raise RuntimeError(f"T08 secret scan failed {key}: {detail}")
            tests.append(("T08","PASS",detail))
            if FACTORY_TOKEN in "\n".join(runtime_log): raise RuntimeError(f"T09 factory token leaked for {key}")
            tests.append(("T09","PASS","factory token absent from captured output"))
            if se:
                rc,cfg=execute_wrapper(wrappers[(key,"valid")],{"AUTOMATION_CONTROL_PLANE_URL":""}); runtime_log.append(cfg)
                if not failed(rc,cfg): raise RuntimeError(f"T10 missing config unexpectedly passed {key}")
                tests.append(("T10","PASS","empty control-plane URL failed closed"))
            else: tests.append(("T10","N/A","pure transform"))
            results.append(Result(key,family,pkg,se,tests))
        for res in results:
            tested=write_report(res,evidence_sha,run_id); promote(tested,res.family,res.key)
        print(f"W1 RUNTIME CERTIFICATION: PASS components={len(results)}")
    finally:
        compose("down","-v",check=False)
        if GEN.exists(): shutil.rmtree(GEN)

if __name__=="__main__": main()
