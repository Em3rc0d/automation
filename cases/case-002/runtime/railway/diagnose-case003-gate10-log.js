#!/usr/bin/env node
'use strict';
const fs=require('fs');
const file=process.argv[2];
let s='';
try{s=fs.readFileSync(file,'utf8');}catch(e){console.log('[case003-gate10-diag] category=LOG_UNAVAILABLE');process.exit(0);}
const rules=[
  ['SMTP_APP_PASSWORD',/534[- ]5\.7\.9|application-specific password|app password/i],
  ['SMTP_AUTH',/EAUTH|535[- ]|invalid login|username and password not accepted|authentication unsuccessful/i],
  ['SMTP_CONNECTION_TIMEOUT',/ETIMEDOUT|connection timeout|greeting never received|socket timeout/i],
  ['SMTP_CONNECTION_REFUSED',/ECONNREFUSED|connection refused/i],
  ['SMTP_DNS',/ENOTFOUND|EAI_AGAIN|getaddrinfo/i],
  ['SMTP_TLS',/certificate|self[- ]signed|TLS|SSL routines|wrong version number/i],
  ['SMTP_ENVELOPE',/EENVELOPE|recipient.*rejected|sender.*rejected|550[- ]|553[- ]/i],
  ['SMTP_CREDENTIAL_BINDING',/credentials?.*(not found|missing)|no credentials/i],
  ['SMTP_NODE_CONFIG',/EmailSend|Send Verification Email|NodeOperationError/i]
];
const hit=rules.find(([,re])=>re.test(s));
console.log('[case003-gate10-diag] category='+(hit?hit[0]:'UNKNOWN'));
