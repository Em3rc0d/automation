#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HARD = ROOT / "quarries/workflow-quarry/30-hardened"
RUNTIME_PROFILE = "n8n-base-js-v1"
N8N_VERSION = "2.38.7"
WAVE = "W2"

COMPONENTS = [
    {"key":"OMNICHANNEL_DOCUMENT_INTAKE","family":"intake","endpoint":"/internal/document-intake","required":["tenantId","traceId","sourceChannel","sourceMessageId","occurredAt","file"]},
    {"key":"MEDIA_FETCH_GUARD","family":"intake","endpoint":"/internal/media/fetch-requests","required":["tenantId","traceId","sourceChannel","providerRef","mimeType","sizeBytes","occurredAt"]},
    {"key":"DOCUMENT_PROVENANCE_STORE","family":"documents","endpoint":"/internal/documents/provenance","required":["tenantId","traceId","contentHash","sourceChannel","sourceMessageId","occurredAt"]},
    {"key":"DOCUMENT_CLASSIFY_CONFIDENCE","family":"documents","endpoint":"/internal/documents/classifications","required":["tenantId","traceId","candidates","occurredAt"]},
    {"key":"DOCUMENT_EXTRACT_SMART","family":"documents","endpoint":"/internal/documents/extractions","required":["tenantId","traceId","documentId","occurredAt"]},
    {"key":"FINANCIAL_DOCUMENT_VALIDATE","family":"documents","endpoint":None,"required":["tenantId","traceId","document","occurredAt"]},
    {"key":"DOCUMENT_DEDUPE_COMPOSITE","family":"documents","endpoint":"/internal/documents/dedupe","required":["tenantId","traceId","document","occurredAt"]},
    {"key":"ACCOUNTING_DOCUMENT_NORMALIZE","family":"accounting","endpoint":None,"required":["tenantId","traceId","document","occurredAt"]},
    {"key":"REVIEW_EXCEPTION_ORCHESTRATOR","family":"review","endpoint":"/internal/review-decisions","required":["tenantId","traceId","subjectId","occurredAt"]},
    {"key":"ACCOUNTING_EXPORT_DISPATCH","family":"accounting","endpoint":"/internal/accounting/exports","required":["tenantId","traceId","accountingDocument","destinationAdapter","occurredAt"]},
    {"key":"INTAKE_ACKNOWLEDGE","family":"intake","endpoint":"/internal/intake-acknowledgements","required":["tenantId","traceId","sourceChannel","recipientRef","status","occurredAt"]},
]

VALID = {
"OMNICHANNEL_DOCUMENT_INTAKE": {"tenantId":"tenant-demo","traceId":"w2-intake-1","sourceChannel":"whatsapp","sourceMessageId":"wamid.demo.001","occurredAt":"2026-09-11T12:00:00Z","file":{"name":"boleta-001.pdf","mimeType":"application/pdf","sizeBytes":245000,"providerMediaId":"media-001"}},
"MEDIA_FETCH_GUARD": {"tenantId":"tenant-demo","traceId":"w2-media-1","sourceChannel":"whatsapp","providerRef":"media-001","mimeType":"application/pdf","sizeBytes":245000,"occurredAt":"2026-09-11T12:00:00Z"},
"DOCUMENT_PROVENANCE_STORE": {"tenantId":"tenant-demo","traceId":"w2-prov-1","contentHash":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","sourceChannel":"whatsapp","sourceMessageId":"wamid.demo.001","occurredAt":"2026-09-11T12:00:00Z","fileName":"boleta-001.pdf","mimeType":"application/pdf"},
"DOCUMENT_CLASSIFY_CONFIDENCE": {"tenantId":"tenant-demo","traceId":"w2-class-1","occurredAt":"2026-09-11T12:00:00Z","candidates":[{"label":"receipt","confidence":0.93},{"label":"invoice","confidence":0.04},{"label":"other","confidence":0.03}],"thresholds":{"accept":0.85,"review":0.55,"margin":0.20}},
"DOCUMENT_EXTRACT_SMART": {"tenantId":"tenant-demo","traceId":"w2-extract-1","documentId":"doc-001","occurredAt":"2026-09-11T12:00:00Z","deterministic":{"coverage":0.82,"confidence":0.95,"fields":{"issuerTaxId":{"value":"20123456789","confidence":1},"documentNumber":{"value":"B001-123","confidence":1},"total":{"value":118,"confidence":0.99},"currency":{"value":"PEN","confidence":1}}},"ai":{"available":True,"confidence":0.88,"fields":{"issueDate":{"value":"2026-09-10","confidence":0.91},"subtotal":{"value":100,"confidence":0.90},"tax":{"value":18,"confidence":0.90}}},"policy":{"minimumCoverage":0.90,"minimumFieldConfidence":0.80}},
"FINANCIAL_DOCUMENT_VALIDATE": {"tenantId":"tenant-demo","traceId":"w2-valid-1","occurredAt":"2026-09-11T12:00:00Z","document":{"issuerTaxId":"20123456789","documentNumber":"B001-123","issueDate":"2026-09-10","currency":"PEN","subtotal":100,"tax":18,"total":118},"policy":{"amountTolerance":0.05,"allowedCurrencies":["PEN","USD"]}},
"DOCUMENT_DEDUPE_COMPOSITE": {"tenantId":"tenant-demo","traceId":"w2-dedupe-1","occurredAt":"2026-09-11T12:00:00Z","document":{"contentHash":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","issuerTaxId":"20123456789","documentNumber":"B001-123","issueDate":"2026-09-10","currency":"PEN","total":118},"priorMatches":[]},
"ACCOUNTING_DOCUMENT_NORMALIZE": {"tenantId":"tenant-demo","traceId":"w2-accounting-1","occurredAt":"2026-09-11T12:00:00Z","document":{"documentType":"receipt","issuerTaxId":"20123456789","issuerName":"Proveedor Demo SAC","documentNumber":"B001-123","issueDate":"2026-09-10","currency":"PEN","subtotal":100,"tax":18,"total":118,"fieldsProvenance":{"total":"deterministic","issueDate":"ai"}}},
"REVIEW_EXCEPTION_ORCHESTRATOR": {"tenantId":"tenant-demo","traceId":"w2-review-1","subjectId":"doc-001","occurredAt":"2026-09-11T12:00:00Z","classification":{"decision":"accepted","confidence":0.93},"validation":{"valid":True,"findings":[]},"duplicate":{"decision":"new","risk":0.02},"fieldConfidence":{"issuerTaxId":1,"total":0.99,"issueDate":0.91},"policy":{"reviewBelow":0.80,"highPriorityReasons":["ARITHMETIC_MISMATCH","EXACT_DUPLICATE"]}},
"ACCOUNTING_EXPORT_DISPATCH": {"tenantId":"tenant-demo","traceId":"w2-export-1","occurredAt":"2026-09-11T12:00:00Z","destinationAdapter":"google-sheets","accountingDocument":{"accountingDocumentId":"acctdoc-001","documentType":"receipt","issuerTaxId":"20123456789","documentNumber":"B001-123","issueDate":"2026-09-10","currency":"PEN","subtotal":100,"tax":18,"total":118},"mappingVersion":"purchases-v1"},
"INTAKE_ACKNOWLEDGE": {"tenantId":"tenant-demo","traceId":"w2-ack-1","sourceChannel":"whatsapp","recipientRef":"contact-001","status":"accepted","occurredAt":"2026-09-11T12:00:00Z","documentId":"doc-001","templateKey":"document-received-v1"},
}

COMMON_JS = r'''
const input = $input.first().json;
const missing = REQUIRED.filter(k => input[k] === undefined || input[k] === null || input[k] === '');
if (missing.length) throw new Error(`${KEY}_INVALID_INPUT missing=${missing.join(',')}`);
const text=v=>v===undefined||v===null?null:String(v).trim();
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=v=>Math.min(1,Math.max(0,num(v)));
const parseTime=(v,name='occurredAt')=>{const d=new Date(v);if(Number.isNaN(d.getTime()))throw new Error(`${KEY}_INVALID_TIMESTAMP field=${name}`);return d.toISOString();};
const stable=(parts)=>parts.map(x=>text(x)||'').join(':').toLowerCase();
const allowedMime=new Set(['application/pdf','image/jpeg','image/png','image/webp']);
let out={schemaVersion:'1.0',tenantId:text(input.tenantId),traceId:text(input.traceId),occurredAt:parseTime(input.occurredAt)};

if(KEY==='OMNICHANNEL_DOCUMENT_INTAKE'){
 const channels=new Set(['whatsapp','email','web','api']); const ch=text(input.sourceChannel)?.toLowerCase();
 if(!channels.has(ch)) throw new Error(`${KEY}_INVALID_SOURCE channel=${ch}`);
 const f=input.file||{}, mime=text(f.mimeType)?.toLowerCase(), size=num(f.sizeBytes,-1), max=Math.max(1,num(input.policy?.maxSizeBytes,20*1024*1024));
 if(size<0) throw new Error(`${KEY}_INVALID_FILE sizeBytes`);
 const ext=(text(f.name)||'').split('.').pop()?.toLowerCase();
 const extMimeRisk=(ext==='pdf'&&mime!=='application/pdf')||(['jpg','jpeg'].includes(ext)&&mime!=='image/jpeg')||(ext==='png'&&mime!=='image/png');
 const supported=allowedMime.has(mime), oversized=size>max, identity=text(f.providerMediaId)||text(f.sourceUrl)||text(f.objectKey)||text(input.sourceMessageId);
 if(!identity) throw new Error(`${KEY}_INVALID_FILE identity`);
 const reasons=[]; if(!supported)reasons.push('UNSUPPORTED_MIME'); if(oversized)reasons.push('FILE_TOO_LARGE'); if(extMimeRisk)reasons.push('EXTENSION_MIME_MISMATCH');
 const decision=!supported||oversized?'rejected':extMimeRisk?'review':'accepted';
 out={...out,sourceChannel:ch,sourceMessageId:text(input.sourceMessageId),file:{name:text(f.name),mimeType:mime,sizeBytes:size,providerMediaId:text(f.providerMediaId),sourceUrl:text(f.sourceUrl),objectKey:text(f.objectKey)},decision,reasons};
 out.intakeKey=stable(['document-intake',out.tenantId,ch,out.sourceMessageId,identity]); out.idempotencyKey=text(input.idempotencyKey)||out.intakeKey;
}
else if(KEY==='MEDIA_FETCH_GUARD'){
 const mime=text(input.mimeType)?.toLowerCase(), size=num(input.sizeBytes,-1), max=Math.max(1,num(input.policy?.maxSizeBytes,20*1024*1024)); if(size<0)throw new Error(`${KEY}_INVALID_INPUT sizeBytes`);
 const supported=allowedMime.has(mime), oversized=size>max, scheme=text(input.sourceUrl)?.split(':')[0]?.toLowerCase(); const unsafeUrl=scheme&&scheme!=='https';
 const reasons=[]; if(!supported)reasons.push('UNSUPPORTED_MIME'); if(oversized)reasons.push('FILE_TOO_LARGE'); if(unsafeUrl)reasons.push('UNSAFE_URL_SCHEME');
 out={...out,sourceChannel:text(input.sourceChannel)?.toLowerCase(),providerRef:text(input.providerRef),mimeType:mime,sizeBytes:size,fetchAllowed:reasons.length===0,reasons};
 out.fetchKey=stable(['media-fetch',out.tenantId,out.sourceChannel,out.providerRef]); out.idempotencyKey=text(input.idempotencyKey)||out.fetchKey;
}
else if(KEY==='DOCUMENT_PROVENANCE_STORE'){
 const h=text(input.contentHash)?.toLowerCase(); if(!/^sha256:[a-f0-9]{64}$/.test(h||''))throw new Error(`${KEY}_INVALID_HASH`);
 out={...out,contentHash:h,sourceChannel:text(input.sourceChannel)?.toLowerCase(),sourceMessageId:text(input.sourceMessageId),fileName:text(input.fileName),mimeType:text(input.mimeType)?.toLowerCase(),sourceRef:text(input.sourceRef),storagePolicy:'immutable-original'};
 out.provenanceId=stable(['provenance',out.tenantId,h,out.sourceChannel,out.sourceMessageId]); out.idempotencyKey=text(input.idempotencyKey)||out.provenanceId;
}
else if(KEY==='DOCUMENT_CLASSIFY_CONFIDENCE'){
 const taxonomy=new Set(['invoice','receipt','boleta','contract','statement','purchase_order','other']); const arr=Array.isArray(input.candidates)?input.candidates:[]; if(!arr.length)throw new Error(`${KEY}_INVALID_INPUT candidates`);
 const ranked=arr.map(x=>({label:text(x.label)?.toLowerCase(),confidence:clamp(x.confidence)})).sort((a,b)=>b.confidence-a.confidence); const top=ranked[0], second=ranked[1]||{confidence:0};
 const accept=clamp(input.thresholds?.accept??0.85), review=clamp(input.thresholds?.review??0.55), margin=Math.max(0,num(input.thresholds?.margin,0.15)); const delta=top.confidence-second.confidence;
 const known=taxonomy.has(top.label), decision=!known||top.confidence<review?'review':top.confidence>=accept&&delta>=margin?'accepted':'review'; const reasons=[]; if(!known)reasons.push('UNKNOWN_CLASS'); if(top.confidence<accept)reasons.push('LOW_CONFIDENCE'); if(delta<margin)reasons.push('AMBIGUOUS_MARGIN');
 out={...out,label:known?top.label:'other',confidence:top.confidence,runnerUp:ranked[1]||null,margin:Number(delta.toFixed(6)),decision,reasons,candidates:ranked}; out.idempotencyKey=text(input.idempotencyKey)||stable(['classification',out.tenantId,out.traceId]);
}
else if(KEY==='DOCUMENT_EXTRACT_SMART'){
 const det=input.deterministic&&typeof input.deterministic==='object'?input.deterministic:null, ai=input.ai&&typeof input.ai==='object'?input.ai:null; const minCoverage=clamp(input.policy?.minimumCoverage??0.9), minField=clamp(input.policy?.minimumFieldConfidence??0.8);
 const detCoverage=clamp(det?.coverage), detConfidence=clamp(det?.confidence), useAi=!det||detCoverage<minCoverage; const sourceFields=[]; const merged={};
 const add=(fields,source)=>{for(const [k,v] of Object.entries(fields||{})){const c=clamp(v?.confidence??1);const current=merged[k];if(!current||c>current.confidence){merged[k]={value:v?.value??v,confidence:c,provenance:source};}}}; add(det?.fields,'deterministic'); if(useAi&&ai?.available!==false)add(ai?.fields,'ai');
 for(const [k,v] of Object.entries(merged))sourceFields.push({field:k,...v}); const low=sourceFields.filter(x=>x.confidence<minField).map(x=>x.field); const aiUnavailable=useAi&&(!ai||ai.available===false); const decision=aiUnavailable||low.length?'review':'accepted';
 out={...out,documentId:text(input.documentId),strategy:useAi?'deterministic_then_ai':'deterministic_only',deterministicCoverage:detCoverage,deterministicConfidence:detConfidence,fields:merged,fieldEvidence:sourceFields,lowConfidenceFields:low,decision,reasons:[...(aiUnavailable?['AI_FALLBACK_UNAVAILABLE']:[]),...(low.length?['LOW_FIELD_CONFIDENCE']:[])]}; out.idempotencyKey=text(input.idempotencyKey)||stable(['extraction',out.tenantId,out.documentId,out.traceId]);
}
else if(KEY==='FINANCIAL_DOCUMENT_VALIDATE'){
 const d=input.document||{}, findings=[]; const tol=Math.max(0,num(input.policy?.amountTolerance,0.05)); const subtotal=num(d.subtotal,NaN), tax=num(d.tax,NaN), total=num(d.total,NaN); if(!Number.isFinite(total)||total<0)findings.push({code:'INVALID_TOTAL',severity:'error'}); if(Number.isFinite(subtotal)&&Number.isFinite(tax)&&Number.isFinite(total)){const delta=Math.abs((subtotal+tax)-total);if(delta>tol)findings.push({code:'ARITHMETIC_MISMATCH',severity:'error',delta:Number(delta.toFixed(4))});}
 const allowed=input.policy?.allowedCurrencies||['PEN','USD']; const currency=text(d.currency)?.toUpperCase(); if(!allowed.includes(currency))findings.push({code:'UNSUPPORTED_CURRENCY',severity:'error'}); if(!text(d.issuerTaxId))findings.push({code:'MISSING_ISSUER_ID',severity:'error'}); if(!text(d.documentNumber))findings.push({code:'MISSING_DOCUMENT_NUMBER',severity:'error'}); try{parseTime(d.issueDate,'issueDate')}catch(e){findings.push({code:'INVALID_ISSUE_DATE',severity:'error'});}
 out={...out,document:{...d,currency,subtotal:Number.isFinite(subtotal)?subtotal:null,tax:Number.isFinite(tax)?tax:null,total:Number.isFinite(total)?total:null},findings,valid:!findings.some(x=>x.severity==='error'),decision:findings.length?'review':'accepted'}; out.validationKey=stable(['financial-validation',out.tenantId,text(d.issuerTaxId),text(d.documentNumber),currency,total]);
}
else if(KEY==='DOCUMENT_DEDUPE_COMPOSITE'){
 const d=input.document||{}, hash=text(d.contentHash)?.toLowerCase(), issuer=text(d.issuerTaxId), number=text(d.documentNumber), issue=text(d.issueDate), currency=text(d.currency)?.toUpperCase(), total=num(d.total,NaN); const exactKey=hash&&/^sha256:[a-f0-9]{64}$/.test(hash)?stable(['hash',out.tenantId,hash]):null; const businessKey=(issuer&&number)?stable(['business',out.tenantId,issuer,number,currency,Number.isFinite(total)?total:'']):null; const fuzzyKey=(issuer&&issue&&Number.isFinite(total))?stable(['fuzzy',out.tenantId,issuer,issue,currency,total.toFixed(2)]):null;
 const matches=Array.isArray(input.priorMatches)?input.priorMatches:[]; const exact=matches.some(m=>exactKey&&text(m.exactKey)===exactKey); const probable=!exact&&matches.some(m=>(businessKey&&text(m.businessKey)===businessKey)||(fuzzyKey&&text(m.fuzzyKey)===fuzzyKey)); const decision=exact?'exact_duplicate':probable?'probable_duplicate':'new';
 out={...out,exactKey,businessKey,fuzzyKey,decision,risk:exact?1:probable?0.75:0.02,requiresReview:probable}; out.idempotencyKey=text(input.idempotencyKey)||exactKey||businessKey||fuzzyKey||stable(['dedupe',out.tenantId,out.traceId]);
}
else if(KEY==='ACCOUNTING_DOCUMENT_NORMALIZE'){
 const d=input.document||{}, currency=text(d.currency)?.toUpperCase(); const subtotal=num(d.subtotal,NaN),tax=num(d.tax,NaN),total=num(d.total,NaN); if(!text(d.documentNumber)||!text(d.issuerTaxId)||!Number.isFinite(total))throw new Error(`${KEY}_INVALID_DOCUMENT`);
 out={...out,accountingDocumentId:stable(['acctdoc',out.tenantId,text(d.issuerTaxId),text(d.documentNumber),currency,total.toFixed(2)]),documentType:text(d.documentType)?.toLowerCase()||'other',issuer:{taxId:text(d.issuerTaxId),name:text(d.issuerName)},documentNumber:text(d.documentNumber),issueDate:parseTime(d.issueDate,'issueDate').slice(0,10),currency,amounts:{subtotal:Number.isFinite(subtotal)?subtotal:null,tax:Number.isFinite(tax)?tax:null,total},fieldsProvenance:d.fieldsProvenance||{},sourceDocumentId:text(d.documentId),normalizationVersion:'accounting-document-v1'}; out.normalizationKey=out.accountingDocumentId;
}
else if(KEY==='REVIEW_EXCEPTION_ORCHESTRATOR'){
 const reasons=[]; const c=input.classification||{},v=input.validation||{},dup=input.duplicate||{},fc=input.fieldConfidence||{},threshold=clamp(input.policy?.reviewBelow??0.8); if(c.decision==='review'||clamp(c.confidence)<threshold)reasons.push('CLASSIFICATION_REVIEW'); if(v.valid===false)for(const f of (v.findings||[]))reasons.push(text(f.code)||'VALIDATION_FAILURE'); if(['exact_duplicate','probable_duplicate'].includes(dup.decision))reasons.push(dup.decision==='exact_duplicate'?'EXACT_DUPLICATE':'PROBABLE_DUPLICATE'); for(const [k,val] of Object.entries(fc))if(clamp(val)<threshold)reasons.push(`LOW_CONFIDENCE:${k}`); const unique=[...new Set(reasons)]; const high=new Set(input.policy?.highPriorityReasons||[]); const priority=unique.some(r=>high.has(r))?'high':unique.length?'normal':'none';
 out={...out,subjectId:text(input.subjectId),requiresReview:unique.length>0,reasons:unique,priority,status:unique.length?'open':'not_required',context:{classification:c,validation:v,duplicate:dup,fieldConfidence:fc}}; out.reviewKey=stable(['review',out.tenantId,out.subjectId,unique.sort().join('|')||'none']); out.idempotencyKey=text(input.idempotencyKey)||out.reviewKey;
}
else if(KEY==='ACCOUNTING_EXPORT_DISPATCH'){
 const d=input.accountingDocument||{}, adapter=text(input.destinationAdapter)?.toLowerCase(); if(!adapter)throw new Error(`${KEY}_INVALID_ADAPTER`); if(!text(d.accountingDocumentId)||!Number.isFinite(Number(d.total)))throw new Error(`${KEY}_INVALID_DOCUMENT`);
 out={...out,destinationAdapter:adapter,mappingVersion:text(input.mappingVersion)||'default-v1',accountingDocument:d,auditContext:input.auditContext||{},status:'proposed'}; out.exportKey=stable(['accounting-export',out.tenantId,adapter,d.accountingDocumentId,out.mappingVersion]); out.idempotencyKey=text(input.idempotencyKey)||out.exportKey;
}
else if(KEY==='INTAKE_ACKNOWLEDGE'){
 const channel=text(input.sourceChannel)?.toLowerCase(), allowed=new Set(['whatsapp','email','web','api']); if(!allowed.has(channel))throw new Error(`${KEY}_INVALID_CHANNEL`); const status=text(input.status)?.toLowerCase(); if(!['accepted','review','rejected','processed','failed'].includes(status))throw new Error(`${KEY}_INVALID_STATUS`);
 out={...out,sourceChannel:channel,recipientRef:text(input.recipientRef),status,documentId:text(input.documentId),templateKey:text(input.templateKey)||`document-${status}-v1`,variables:input.variables||{}}; out.ackKey=stable(['intake-ack',out.tenantId,channel,out.recipientRef,status,out.documentId||out.traceId]); out.idempotencyKey=text(input.idempotencyKey)||out.ackKey;
}
return [{json:out}];
'''

def stable_id(key:str)->str:
    parts=key.lower().split('_')
    return 'w2'+parts[0].title()+''.join(x.title() for x in parts[1:])+'V1'

def workflow(c):
    key, endpoint = c['key'], c['endpoint']
    js='const KEY='+json.dumps(key)+';\nconst REQUIRED='+json.dumps(c['required'])+';\n'+COMMON_JS
    nodes=[
      {"parameters":{},"id":key.lower()+"-trigger","name":"Called by Another Workflow","type":"n8n-nodes-base.executeWorkflowTrigger","typeVersion":1.1,"position":[220,300]},
      {"parameters":{"jsCode":js},"id":key.lower()+"-logic","name":"Validate and Decide","type":"n8n-nodes-base.code","typeVersion":2,"position":[500,300]},
    ]
    connections={"Called by Another Workflow":{"main":[[{"node":"Validate and Decide","type":"main","index":0}]]}}
    if endpoint:
        nodes.append({"parameters":{"method":"POST","url":"={{ $env.AUTOMATION_CONTROL_PLANE_URL + '"+endpoint+"' }}","sendHeaders":True,"headerParameters":{"parameters":[{"name":"Idempotency-Key","value":"={{ $json.idempotencyKey }}"},{"name":"X-Automation-Schema-Version","value":"1.0"},{"name":"X-Internal-Token","value":"={{ $env.AUTOMATION_CONTROL_PLANE_TOKEN || '' }}"}]},"sendBody":True,"contentType":"raw","rawContentType":"application/json","body":"={{ JSON.stringify($json) }}","options":{}},"id":key.lower()+"-post","name":"Persist Decision","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[800,300],"retryOnFail":True,"maxTries":3,"waitBetweenTries":250})
        connections["Validate and Decide"]={"main":[[{"node":"Persist Decision","type":"main","index":0}]]}
    return {"id":stable_id(key),"name":f"BASELINE CANDIDATE - {key}@1.0","nodes":nodes,"connections":connections,"settings":{"executionOrder":"v1"},"pinData":{},"meta":{"candidateKey":key,"candidateVersion":"1.0.0","stage":"HARDENED","origin":"ORIGINAL_SYNTHESIS","wave":"W2"},"tags":[{"name":"baseline-candidate"},{"name":c['family']},{"name":"w2"}]}

def fixtures(c):
    key=c['key']; valid=json.loads(json.dumps(VALID[key])); valid.setdefault('metadata',{})['testCase']='valid'
    missing=json.loads(json.dumps(valid)); missing.pop('tenantId',None); missing['traceId']=valid['traceId']+'-missing-tenant'
    replay=json.loads(json.dumps(valid)); replay['metadata']['testCase']='replay'
    badtime=json.loads(json.dumps(valid)); badtime['occurredAt']='not-a-timestamp'; badtime['traceId']=valid['traceId']+'-badtime'
    transient=json.loads(json.dumps(valid)); transient['traceId']='w2-transient-'+key.lower(); transient.setdefault('metadata',{})['testCase']='transient'
    permanent=json.loads(json.dumps(valid)); permanent['traceId']='w2-permanent-'+key.lower(); permanent.setdefault('metadata',{})['testCase']='permanent'
    review=json.loads(json.dumps(valid)); review['traceId']='w2-reviewcase-'+key.lower(); review.setdefault('metadata',{})['testCase']='review'
    if key=='OMNICHANNEL_DOCUMENT_INTAKE': review['file']['mimeType']='application/octet-stream'
    elif key=='MEDIA_FETCH_GUARD': review['sizeBytes']=50*1024*1024
    elif key=='DOCUMENT_CLASSIFY_CONFIDENCE': review['candidates']=[{'label':'invoice','confidence':0.61},{'label':'receipt','confidence':0.55}]
    elif key=='DOCUMENT_EXTRACT_SMART': review['deterministic']['coverage']=0.4; review['ai']['confidence']=0.55; review['ai']['fields']['issueDate']['confidence']=0.45
    elif key=='FINANCIAL_DOCUMENT_VALIDATE': review['document']['total']=130
    elif key=='DOCUMENT_DEDUPE_COMPOSITE': review['priorMatches']=[{'businessKey':'business:tenant-demo:20123456789:b001-123:pen:118'}]
    elif key=='REVIEW_EXCEPTION_ORCHESTRATOR': review['validation']={'valid':False,'findings':[{'code':'ARITHMETIC_MISMATCH','severity':'error'}]}
    return {'valid.json':valid,'invalid-missing-tenant.json':missing,'duplicate.json':replay,'invalid-timestamp.json':badtime,'transient.json':transient,'permanent.json':permanent,'review-path.json':review}

def config_schema(c):
    props={"controlPlaneUrl":{"type":"string","description":"Injected as AUTOMATION_CONTROL_PLANE_URL; not stored in workflow JSON"},"maxRetries":{"type":"integer","minimum":1,"maximum":5,"default":3}}
    if c['key'] in {'OMNICHANNEL_DOCUMENT_INTAKE','MEDIA_FETCH_GUARD'}: props['maxSizeBytes']={"type":"integer","minimum":1,"default":20971520}
    if c['key'] in {'DOCUMENT_CLASSIFY_CONFIDENCE','DOCUMENT_EXTRACT_SMART','REVIEW_EXCEPTION_ORCHESTRATOR'}: props['confidencePolicy']={"type":"object"}
    return {"$schema":"https://json-schema.org/draft/2020-12/schema","title":c['key']+" configuration","type":"object","additionalProperties":False,"properties":props}

def manifest(c,wf):
    return f'''id: {c['key'].lower()}-1-0-0\nstage: HARDENED\nwave: W2\nbaselineKey: {c['key']}\nversion: 1.0.0\nfamily: {c['family']}\nengine: n8n\nruntimeProfile: {RUNTIME_PROFILE}\nobservedEngineVersion: {N8N_VERSION}\norigin: ORIGINAL_SYNTHESIS\nworkflowId: {wf['id']}\nsideEffects: {str(bool(c['endpoint'])).lower()}\nendpoint: {c['endpoint'] or 'none'}\ntenancy: explicit-tenantId\nidempotency: deterministic\nretries: bounded-3-for-http\nsecrets: environment-reference-only\nhumanReview: policy-driven-where-applicable\nsourcePreservation: required\n'''

def test_plan(c):
    domain='''- W2-D01: execute `review-path.json`; assert the capability-specific review/reject/exception decision.\n- W2-D02: assert deterministic identity/idempotency key is stable for replay-equivalent input.\n'''
    common='''- W2-T01: import + publish candidate in pinned n8n.\n- W2-T02: valid fixture executes.\n- W2-T03: missing tenant fails closed.\n- W2-T04: replay preserves deterministic key.\n- W2-T05: invalid timestamp fails closed.\n- W2-T06: transient receiver failure retries and succeeds within bound when side-effecting.\n- W2-T07: permanent receiver failure is visible and does not promote silently.\n- W2-T08: zero embedded secrets/credential bindings.\n- W2-T09: factory token/secret-like values absent from captured logs.\n- W2-T10: missing control-plane configuration fails closed when side-effecting.\n'''
    return '# Runtime Test Plan\n\n'+common+domain

def readme(c):
    return f'''# {c['key']}@1.0.0\n\nW2 sophisticated capability candidate. Provider-agnostic and tenant-explicit.\n\nFamily: `{c['family']}`  \nRuntime: `{RUNTIME_PROFILE}` / n8n `{N8N_VERSION}`\n\nThis package is **HARDENED, not approved** until runtime/domain tests pass and evidence is written. External OCR/AI/provider work is represented through platform contracts rather than embedded customer credentials.\n'''

def write_component(c, clean=False):
    pkg=HARD/c['family']/(c['key']+'@1.0.0')
    if clean and pkg.exists(): shutil.rmtree(pkg)
    pkg.mkdir(parents=True,exist_ok=True); (pkg/'fixtures').mkdir(exist_ok=True); (pkg/'evidence').mkdir(exist_ok=True)
    wf=workflow(c)
    (pkg/'workflow.json').write_text(json.dumps(wf,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    (pkg/'manifest.yaml').write_text(manifest(c,wf),encoding='utf-8')
    (pkg/'config.schema.json').write_text(json.dumps(config_schema(c),indent=2)+'\n',encoding='utf-8')
    (pkg/'README.md').write_text(readme(c),encoding='utf-8')
    (pkg/'evidence/TEST-PLAN.md').write_text(test_plan(c),encoding='utf-8')
    for name,data in fixtures(c).items(): (pkg/'fixtures'/name).write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    return pkg

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--clean-generated',action='store_true'); args=ap.parse_args()
    seen=set()
    for c in COMPONENTS:
        if c['key'] in seen: raise SystemExit('duplicate W2 key: '+c['key'])
        seen.add(c['key']); write_component(c,args.clean_generated)
    if len(seen)!=11: raise SystemExit(f'W2 component count mismatch: {len(seen)}')
    print('W2 PRODUCER: HARDENED=11')

if __name__=='__main__': main()
