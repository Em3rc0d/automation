#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const N8N = '/usr/local/lib/node_modules/n8n/bin/n8n';
const mode = process.argv[2] || '';

function fail(message) {
  console.error(`[case002-appointment-agent] FAIL ${message}`);
  process.exit(1);
}

function runN8n(args) {
  execFileSync(N8N, args, { env: process.env, stdio: 'inherit' });
}

function tempFile(name) {
  return path.join(os.tmpdir(), `case002-${process.pid}-${name}.json`);
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

function buildInputNode() {
  return {
    parameters: {
      jsCode: "const m = $('Normalize Kapso Message').first().json;\nif (!m.providerPhoneNumberId || !m.senderId || !m.providerMessageId) throw new Error('CASE002_APPOINTMENT_AGENT_INPUT_MISSING');\nreturn [{ json: {\n  tenantId: String(m.tenantId || 'case002-level2-test'),\n  providerPhoneNumberId: String(m.providerPhoneNumberId),\n  senderId: String(m.senderId),\n  providerMessageId: String(m.providerMessageId),\n  providerEventId: String(m.providerEventId || m.providerMessageId),\n  text: String(m.text || '')\n} }];"
    },
    id: 'case002-appointment-build-input',
    name: 'Build CASE002 Appointment Agent Input',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [2200, 340],
    notes: 'LEVEL-2 TEST ONLY. Maps the provider-neutral inbound envelope into the CASE-local appointment agent contract.'
  };
}

function buildExecuteNode() {
  return {
    parameters: {
      source: 'database',
      workflowId: {
        __rl: true,
        value: 'case002Level2AppointmentAgentV1',
        mode: 'id'
      },
      mode: 'once',
      options: {
        waitForSubWorkflow: true
      }
    },
    id: 'case002-appointment-execute-agent',
    name: 'Run CASE002 Appointment Agent',
    type: 'n8n-nodes-base.executeWorkflow',
    typeVersion: 1.3,
    position: [2460, 340],
    notes: 'LEVEL-2 TEST ONLY. Child workflow owns conversational state and routes outbound replies through KAPSO_MESSAGE_SEND@1.0.'
  };
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
    if (!replyGate) fail('Level-2 reply gate missing; appointment overlay expects the hardened text reply harness');

    const ids = ['case002-appointment-build-input', 'case002-appointment-execute-agent'];
    workflow.nodes = workflow.nodes.filter((item) => !ids.includes(item.id));
    workflow.nodes.push(buildInputNode(), buildExecuteNode());

    workflow.connections = workflow.connections || {};
    workflow.connections['Acknowledge Kapso Webhook'] = {
      main: [[{ node: 'Build CASE002 Appointment Agent Input', type: 'main', index: 0 }]]
    };
    workflow.connections['Build CASE002 Appointment Agent Input'] = {
      main: [[{ node: 'Run CASE002 Appointment Agent', type: 'main', index: 0 }]]
    };
    delete workflow.connections['Run CASE002 Appointment Agent'];

    importWorkflow(current.parsed, current.list, workflow, patched);

    const verify = exportWorkflow('kapsoMessageReceiveV1', exported);
    const nodeIds = new Set(verify.workflow.nodes.map((item) => item.id));
    const ackTargets = verify.workflow.connections?.['Acknowledge Kapso Webhook']?.main?.[0] || [];
    const buildTargets = verify.workflow.connections?.['Build CASE002 Appointment Agent Input']?.main?.[0] || [];
    const verifyHmac = verify.workflow.nodes.find((item) => item.name === 'Calculate Kapso HMAC');
    const verifyPost = verify.workflow.nodes.find((item) => item.name === 'Post Normalized Message');

    if (!ids.every((id) => nodeIds.has(id))) fail('appointment overlay node verification failed');
    if (!verifyHmac?.credentials?.crypto) fail('Receive HMAC binding lost during appointment overlay');
    if (!verifyPost?.credentials?.httpHeaderAuth) fail('Receive control-plane binding lost during appointment overlay');
    if (!ackTargets.some((edge) => edge.node === 'Build CASE002 Appointment Agent Input')) fail('ack -> appointment input connection missing');
    if (!buildTargets.some((edge) => edge.node === 'Run CASE002 Appointment Agent')) fail('appointment input -> agent connection missing');

    console.log('[case002-appointment-agent] receive overlay PASS');
  } finally {
    for (const file of [exported, patched]) {
      try { fs.unlinkSync(file); } catch (_) {}
    }
  }
}

(async () => {
  if (mode === 'overlay-receive') return overlayReceive();
  fail('usage: prepare-level2-appointment-agent.js overlay-receive');
})().catch((error) => fail(error && error.message ? error.message : String(error)));
