#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { createRequire } = require('module');

const requireFromN8n = createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3 = requireFromN8n('sqlite3');

const N8N = '/usr/local/lib/node_modules/n8n/bin/n8n';
const DB = process.env.DB_SQLITE_DATABASE || '/home/node/.n8n/database.sqlite';
const INTERPRETER_SOURCE = '/opt/case002/gemini-interpreter.json';
const RENDERER_SOURCE = '/opt/case002/gemini-response-renderer.json';
const CONVERSATION_SOURCE = '/opt/case002/conversation-agent-v2.json';
const GEMINI_CREDENTIAL_NAME = 'CASE002 Gemini API';
const GEMINI_MODEL = process.env.CASE002_GEMINI_MODEL || 'models/gemini-2.5-flash';
const mode = process.argv[2] || '';

function fail(message) {
  console.error(`[case002-gemini-poc] FAIL ${message}`);
  process.exit(1);
}

function runN8n(args, quiet = false) {
  execFileSync(N8N, args, {
    env: process.env,
    stdio: quiet ? ['ignore', 'ignore', 'pipe'] : 'inherit',
  });
}

function tempFile(name) {
  return path.join(os.tmpdir(), `case002-gemini-${process.pid}-${name}.json`);
}

function readWorkflowFile(file, expectedId) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = Array.isArray(parsed) ? parsed : [parsed];
  const workflow = list.find((item) => item && item.id === expectedId);
  if (!workflow) fail(`workflow ${expectedId} not found in export`);
  return { parsed, list, workflow };
}

function exportWorkflow(id, file) {
  runN8n(['export:workflow', `--id=${id}`, `--output=${file}`]);
  return readWorkflowFile(file, id);
}

function importWorkflow(parsedShape, list, workflow, file) {
  const output = Array.isArray(parsedShape) ? list : workflow;
  fs.writeFileSync(file, JSON.stringify(output), { mode: 0o600 });
  runN8n(['import:workflow', `--input=${file}`]);
}

function queryAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB, sqlite3.OPEN_READONLY, (openError) => {
      if (openError) return reject(openError);
      db.all(sql, params, (error, rows) => {
        db.close();
        if (error) return reject(error);
        resolve(rows || []);
      });
    });
  });
}

async function preflightGeminiCredential(credential) {
  const exported = tempFile('credential');
  try {
    runN8n([
      'export:credentials',
      `--id=${credential.id}`,
      '--decrypted',
      `--output=${exported}`,
    ], true);

    const parsed = JSON.parse(fs.readFileSync(exported, 'utf8'));
    const list = Array.isArray(parsed) ? parsed : [parsed];
    const found = list.find((item) => item && item.id === credential.id);
    const apiKey = String(found?.data?.apiKey || '');
    const host = String(found?.data?.host || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');

    if (!apiKey) fail('Gemini API credential has an empty apiKey');

    const response = await fetch(`${host}/v1beta/models?key=${encodeURIComponent(apiKey)}`, {
      method: 'GET',
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) fail(`Gemini credential preflight returned HTTP ${response.status}`);

    const body = await response.json();
    const names = new Set((body.models || []).map((item) => String(item?.name || '')));
    if (!names.has(GEMINI_MODEL)) {
      fail(`configured Gemini model is unavailable for this key: ${GEMINI_MODEL}`);
    }

    console.log(`[case002-gemini-poc] Gemini auth preflight PASS model=${GEMINI_MODEL}`);
  } finally {
    try { fs.unlinkSync(exported); } catch (_) {}
  }
}

async function bindGemini() {
  const rows = await queryAll(
    'SELECT id, name, type FROM credentials_entity WHERE name = ? AND type = ? ORDER BY id',
    [GEMINI_CREDENTIAL_NAME, 'googlePalmApi'],
  );
  if (rows.length !== 1) {
    fail(`expected exactly one ${GEMINI_CREDENTIAL_NAME} googlePalmApi credential, found ${rows.length}`);
  }

  const credential = rows[0];
  await preflightGeminiCredential(credential);

  const targets = [
    { workflowId: 'case002GeminiInterpreterV1', modelNodeName: 'CASE002 Gemini Chat Model', label: 'interpreter' },
    { workflowId: 'case002GeminiResponseRendererV1', modelNodeName: 'CASE002 Gemini Response Model', label: 'renderer' },
  ];

  for (const target of targets) {
    const exported = tempFile(target.label + '-export');
    const patched = tempFile(target.label + '-patched');

    try {
      const current = exportWorkflow(target.workflowId, exported);
      const modelNode = current.workflow.nodes.find((item) => item.name === target.modelNodeName);
      if (!modelNode) fail(`${target.modelNodeName} node missing`);

      modelNode.parameters = modelNode.parameters || {};
      modelNode.parameters.modelName = GEMINI_MODEL;
      modelNode.credentials = {
        ...(modelNode.credentials || {}),
        googlePalmApi: { id: credential.id, name: credential.name },
      };

      importWorkflow(current.parsed, current.list, current.workflow, patched);

      const verify = exportWorkflow(target.workflowId, exported);
      const verifyNode = verify.workflow.nodes.find((item) => item.name === target.modelNodeName);
      const binding = verifyNode?.credentials?.googlePalmApi;
      if (!binding || binding.id !== credential.id) fail(`Gemini credential binding verification failed for ${target.workflowId}`);
      if (verifyNode?.parameters?.modelName !== GEMINI_MODEL) fail(`Gemini model binding verification failed for ${target.workflowId}`);

      console.log(`[case002-gemini-poc] Gemini binding PASS workflow=${target.workflowId} id=${credential.id} name=${credential.name} model=${GEMINI_MODEL}`);
    } finally {
      for (const file of [exported, patched]) {
        try { fs.unlinkSync(file); } catch (_) {}
      }
    }
  }
}

function buildInputNode() {
  return {
    parameters: {
      jsCode: "const m = $('Normalize Kapso Message').first().json;\nif (!m.providerPhoneNumberId || !m.senderId || !m.providerMessageId) throw new Error('CASE002_CONVERSATION_AGENT_INPUT_MISSING');\nreturn [{ json: {\n  tenantId: String(m.tenantId || 'case002-level2-test'),\n  providerPhoneNumberId: String(m.providerPhoneNumberId),\n  senderId: String(m.senderId),\n  providerMessageId: String(m.providerMessageId),\n  providerEventId: String(m.providerEventId || m.providerMessageId),\n  text: String(m.text || '')\n} }];"
    },
    id: 'case002-conversation-build-input',
    name: 'Build CASE002 Conversation Agent Input',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [2200, 340],
    notes: 'LEVEL-2 GEMINI POC. Maps normalized Kapso input into the provider-neutral CASE-002 conversation envelope.'
  };
}

function loadInlineNodes() {
  const source = JSON.parse(fs.readFileSync(CONVERSATION_SOURCE, 'utf8'));
  const wanted = {
    'Build CASE002 Conversation Context': {
      id: 'case002-conversation-inline-context',
      name: 'CASE002 Conversation Context',
      position: [2460, 340]
    },
    'Run CASE002 Gemini Interpreter': {
      id: 'case002-conversation-inline-gemini',
      name: 'CASE002 Gemini Interpretation',
      position: [2720, 340]
    },
    'Conversation Appointment State': {
      id: 'case002-conversation-inline-policy',
      name: 'CASE002 Conversation Policy State',
      position: [2980, 340]
    },
    'Render CASE002 Conversation Reply': {
      id: 'case002-conversation-inline-render',
      name: 'CASE002 Conversation Language Render',
      position: [3240, 340]
    },
    'Verify CASE002 Rendered Reply': {
      id: 'case002-conversation-inline-render-verify',
      name: 'CASE002 Conversation Language Verify',
      position: [3500, 340]
    },
    'Send Appointment Agent Reply': {
      id: 'case002-conversation-inline-send',
      name: 'CASE002 Conversation Send Reply',
      position: [3760, 340]
    },
    'Verify Appointment Agent Reply': {
      id: 'case002-conversation-inline-verify',
      name: 'CASE002 Conversation Verify Reply',
      position: [4020, 340]
    }
  };

  const cloned = {};
  for (const [sourceName, target] of Object.entries(wanted)) {
    const node = (source.nodes || []).find((item) => item.name === sourceName);
    if (!node) fail(`conversation source node missing: ${sourceName}`);
    cloned[sourceName] = JSON.parse(JSON.stringify(node));
    cloned[sourceName].id = target.id;
    cloned[sourceName].name = target.name;
    cloned[sourceName].position = target.position;
  }

  const contextCode = cloned['Build CASE002 Conversation Context']?.parameters?.jsCode || '';
  const policyCode = cloned['Conversation Appointment State']?.parameters?.jsCode || '';
  const validatorCode = cloned['Verify CASE002 Rendered Reply']?.parameters?.jsCode || '';
  const interpreter = cloned['Run CASE002 Gemini Interpreter'];
  const renderer = cloned['Render CASE002 Conversation Reply'];

  if (!contextCode.includes("$getWorkflowStaticData('global')")) {
    fail('conversation context must read Receive-owned workflow static data');
  }
  if (!policyCode.includes("$getWorkflowStaticData('global')")) {
    fail('conversation policy must own Receive workflow static data');
  }
  if (!validatorCode.includes("$getWorkflowStaticData('global')")) {
    fail('response validator must update Receive-owned conversation history');
  }
  if (interpreter?.parameters?.workflowId?.value !== 'case002GeminiInterpreterV1') {
    fail('conversation source points to unexpected semantic interpreter');
  }
  if (interpreter?.onError !== 'continueRegularOutput') {
    fail('Gemini interpreter must fail open to deterministic fallback');
  }
  if (renderer?.parameters?.workflowId?.value !== 'case002GeminiResponseRendererV1') {
    fail('conversation source points to unexpected response renderer');
  }
  if (renderer?.onError !== 'continueRegularOutput') {
    fail('Gemini response renderer must fail open to deterministic text fallback');
  }

  return cloned;
}

async function overlayReceive() {
  const exported = tempFile('receive-export');
  const patched = tempFile('receive-patched');

  try {
    const current = exportWorkflow('kapsoMessageReceiveV1', exported);
    const workflow = current.workflow;
    const hmac = workflow.nodes.find((item) => item.name === 'Calculate Kapso HMAC');
    const post = workflow.nodes.find((item) => item.name === 'Post Normalized Message');
    const ack = workflow.nodes.find((item) => item.name === 'Acknowledge Kapso Webhook');
    const replyGate = workflow.nodes.find((item) => item.name === 'CASE002 Level2 Reply Gate');

    if (!hmac?.credentials?.crypto) fail('Receive HMAC binding missing');
    if (!post?.credentials?.httpHeaderAuth) fail('Receive control-plane binding missing');
    if (!ack) fail('Acknowledge Kapso Webhook node missing');
    if (!replyGate) fail('Level-2 reply gate missing');

    const inline = loadInlineNodes();
    const removeIds = new Set([
      'case002-appointment-build-input',
      'case002-appointment-execute-agent',
      'case002-appointment-inline-state',
      'case002-appointment-inline-send',
      'case002-appointment-inline-verify',
      'case002-conversation-build-input',
      'case002-conversation-inline-context',
      'case002-conversation-inline-gemini',
      'case002-conversation-inline-policy',
      'case002-conversation-inline-render',
      'case002-conversation-inline-render-verify',
      'case002-conversation-inline-send',
      'case002-conversation-inline-verify'
    ]);

    workflow.nodes = workflow.nodes.filter((item) => !removeIds.has(item.id));
    workflow.nodes.push(
      buildInputNode(),
      inline['Build CASE002 Conversation Context'],
      inline['Run CASE002 Gemini Interpreter'],
      inline['Conversation Appointment State'],
      inline['Render CASE002 Conversation Reply'],
      inline['Verify CASE002 Rendered Reply'],
      inline['Send Appointment Agent Reply'],
      inline['Verify Appointment Agent Reply']
    );

    workflow.connections = workflow.connections || {};
    workflow.connections['Acknowledge Kapso Webhook'] = {
      main: [[{ node: 'Build CASE002 Conversation Agent Input', type: 'main', index: 0 }]]
    };
    workflow.connections['Build CASE002 Conversation Agent Input'] = {
      main: [[{ node: 'CASE002 Conversation Context', type: 'main', index: 0 }]]
    };
    workflow.connections['CASE002 Conversation Context'] = {
      main: [[{ node: 'CASE002 Gemini Interpretation', type: 'main', index: 0 }]]
    };
    workflow.connections['CASE002 Gemini Interpretation'] = {
      main: [[{ node: 'CASE002 Conversation Policy State', type: 'main', index: 0 }]]
    };
    workflow.connections['CASE002 Conversation Policy State'] = {
      main: [[{ node: 'CASE002 Conversation Language Render', type: 'main', index: 0 }]]
    };
    workflow.connections['CASE002 Conversation Language Render'] = {
      main: [[{ node: 'CASE002 Conversation Language Verify', type: 'main', index: 0 }]]
    };
    workflow.connections['CASE002 Conversation Language Verify'] = {
      main: [[{ node: 'CASE002 Conversation Send Reply', type: 'main', index: 0 }]]
    };
    workflow.connections['CASE002 Conversation Send Reply'] = {
      main: [[{ node: 'CASE002 Conversation Verify Reply', type: 'main', index: 0 }]]
    };

    for (const oldName of [
      'Build CASE002 Appointment Agent Input',
      'CASE002 Appointment Conversation State',
      'CASE002 Appointment Send Reply',
      'CASE002 Appointment Verify Reply',
      'Run CASE002 Appointment Agent',
      'CASE002 Conversation Language Render',
      'CASE002 Conversation Language Verify',
      'CASE002 Conversation Send Reply',
      'CASE002 Conversation Verify Reply'
    ]) {
      delete workflow.connections[oldName];
    }

    workflow.connections['Acknowledge Kapso Webhook'] = {
      main: [[{ node: 'Build CASE002 Conversation Agent Input', type: 'main', index: 0 }]]
    };
    workflow.connections['Build CASE002 Conversation Agent Input'] = {
      main: [[{ node: 'CASE002 Conversation Context', type: 'main', index: 0 }]]
    };
    workflow.connections['CASE002 Conversation Context'] = {
      main: [[{ node: 'CASE002 Gemini Interpretation', type: 'main', index: 0 }]]
    };
    workflow.connections['CASE002 Gemini Interpretation'] = {
      main: [[{ node: 'CASE002 Conversation Policy State', type: 'main', index: 0 }]]
    };
    workflow.connections['CASE002 Conversation Policy State'] = {
      main: [[{ node: 'CASE002 Conversation Language Render', type: 'main', index: 0 }]]
    };
    workflow.connections['CASE002 Conversation Language Render'] = {
      main: [[{ node: 'CASE002 Conversation Language Verify', type: 'main', index: 0 }]]
    };
    workflow.connections['CASE002 Conversation Language Verify'] = {
      main: [[{ node: 'CASE002 Conversation Send Reply', type: 'main', index: 0 }]]
    };
    workflow.connections['CASE002 Conversation Send Reply'] = {
      main: [[{ node: 'CASE002 Conversation Verify Reply', type: 'main', index: 0 }]]
    };

    importWorkflow(current.parsed, current.list, workflow, patched);

    const verify = exportWorkflow('kapsoMessageReceiveV1', exported);
    const ids = new Set(verify.workflow.nodes.map((item) => item.id));
    const verifyHmac = verify.workflow.nodes.find((item) => item.name === 'Calculate Kapso HMAC');
    const verifyPost = verify.workflow.nodes.find((item) => item.name === 'Post Normalized Message');
    const contextNode = verify.workflow.nodes.find((item) => item.name === 'CASE002 Conversation Context');
    const interpreterNode = verify.workflow.nodes.find((item) => item.name === 'CASE002 Gemini Interpretation');
    const policyNode = verify.workflow.nodes.find((item) => item.name === 'CASE002 Conversation Policy State');
    const rendererNode = verify.workflow.nodes.find((item) => item.name === 'CASE002 Conversation Language Render');
    const renderVerifyNode = verify.workflow.nodes.find((item) => item.name === 'CASE002 Conversation Language Verify');

    const requiredIds = [
      'case002-conversation-build-input',
      'case002-conversation-inline-context',
      'case002-conversation-inline-gemini',
      'case002-conversation-inline-policy',
      'case002-conversation-inline-render',
      'case002-conversation-inline-render-verify',
      'case002-conversation-inline-send',
      'case002-conversation-inline-verify'
    ];
    if (!requiredIds.every((id) => ids.has(id))) fail('Gemini conversation overlay node verification failed');
    if (!verifyHmac?.credentials?.crypto) fail('Receive HMAC binding lost during Gemini overlay');
    if (!verifyPost?.credentials?.httpHeaderAuth) fail('Receive control-plane binding lost during Gemini overlay');
    if (!(contextNode?.parameters?.jsCode || '').includes("$getWorkflowStaticData('global')")) fail('Receive-owned context state missing');
    if (!(policyNode?.parameters?.jsCode || '').includes("$getWorkflowStaticData('global')")) fail('Receive-owned policy state missing');
    if (!(renderVerifyNode?.parameters?.jsCode || '').includes("$getWorkflowStaticData('global')")) fail('Receive-owned rendered history update missing');
    if (interpreterNode?.parameters?.workflowId?.value !== 'case002GeminiInterpreterV1') fail('Gemini child workflow binding missing');
    if (interpreterNode?.onError !== 'continueRegularOutput') fail('Gemini child must preserve deterministic fallback');
    if (rendererNode?.parameters?.workflowId?.value !== 'case002GeminiResponseRendererV1') fail('Gemini response renderer binding missing');
    if (rendererNode?.onError !== 'continueRegularOutput') fail('Gemini response renderer must preserve deterministic text fallback');

    console.log('[case002-gemini-poc] receive overlay PASS state-owner=receive interpretation-fallback=deterministic render-fallback=deterministic render-guard=true fail-closed-send=true');
  } finally {
    for (const file of [exported, patched]) {
      try { fs.unlinkSync(file); } catch (_) {}
    }
  }
}

(async () => {
  if (mode === 'bind-gemini') return bindGemini();
  if (mode === 'overlay-receive') return overlayReceive();
  fail('usage: prepare-level2-gemini-poc.js <bind-gemini|overlay-receive>');
})().catch((error) => fail(error && error.message ? error.message : String(error)));
