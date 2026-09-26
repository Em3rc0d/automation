#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { SavingsRuntime } from "../../../runtime/savings-p0/src/runtime.js";
import { calculateSavings } from "../../../runtime/savings-p0/src/savings.js";
import { createGoogleWorkspaceAdapter } from "../../../connectors/savings/google-workspace/factory.mjs";
import { FileAuditControlPlane, FileIdempotencyStore } from "./file-runtime.mjs";
import { dispatchApprovedWorkflow, SUPPORTED_WORKFLOWS } from "./workflow-dispatch.mjs";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) throw new Error(`missing value for ${arg}`);
      args[arg.slice(2)] = value;
      i += 1;
    }
  }
  return args;
}

function requireConfigured(installation) {
  if (!["CLIENT_CONFIGURED", "CLIENT_ACCEPTED"].includes(installation?.state)) {
    throw new Error("live execution requires installation state CLIENT_CONFIGURED or CLIENT_ACCEPTED");
  }
  if (!SUPPORTED_WORKFLOWS.includes(installation.workflowKey)) {
    throw new Error(`unsupported approved workflow: ${installation.workflowKey}`);
  }
  if (installation.runtimeProfile !== "zero-deps-node-v1") {
    throw new Error(`unsupported runtime profile: ${installation.runtimeProfile}`);
  }
}

function requireVerifiedBindings(doc) {
  for (const binding of doc.bindings ?? []) {
    if (binding.status !== "verified") {
      throw new Error(`connector not verified: ${binding.capability}`);
    }
    if (!binding.verification?.evidenceRef || !binding.verification?.checkedAt) {
      throw new Error(`connector verification evidence missing: ${binding.capability}`);
    }
  }
}

function baselineForEngine(baseline) {
  if (baseline?.status !== "AGREED") throw new Error("live execution requires AGREED SavingsBaseline");
  return {
    manualMinutesPerUnit: baseline.manual_minutes_per_unit,
    loadedHourlyCost: baseline.loaded_hourly_cost,
    currency: baseline.currency ?? "PEN",
    confidence: baseline.confidence,
  };
}

async function loadEvent({ eventPath, sourceId, adapters, workflowKey }) {
  if (eventPath) return readJson(resolve(eventPath));
  if (sourceId && ["EMAIL_CLASSIFY_ROUTE_AUTOMATION", "EMAIL_ATTACHMENT_EXTRACT_AUTOMATION"].includes(workflowKey)) {
    const trigger = adapters.trigger;
    if (!trigger?.getMessage) throw new Error("email source-id requires verified email.inbound trigger adapter");
    return { email: await trigger.getMessage(sourceId) };
  }
  return {};
}

export async function runLiveBundle({
  bundle,
  eventPath = null,
  sourceId = null,
  asOf = new Date().toISOString(),
  stateDir = null,
  evidencePath = null,
  env = process.env,
  fetchFn = globalThis.fetch,
  confirmed = false,
} = {}) {
  if (!confirmed) {
    throw new Error("live provider execution blocked: explicit side-effect confirmation is required");
  }

  const bundlePath = resolve(bundle);
  const installation = await readJson(join(bundlePath, "installation.json"));
  const config = await readJson(join(bundlePath, "config.json"));
  const bindingsDoc = await readJson(join(bundlePath, "connector-bindings.json"));
  const baseline = await readJson(join(bundlePath, "savings-baseline.json"));
  requireConfigured(installation);
  requireVerifiedBindings(bindingsDoc);

  const adapters = {};
  for (const binding of bindingsDoc.bindings ?? []) {
    adapters[binding.adapterRole] = createGoogleWorkspaceAdapter(binding, { env, fetchFn });
  }

  const event = await loadEvent({
    eventPath,
    sourceId,
    adapters,
    workflowKey: installation.workflowKey,
  });

  const runtimeState = resolve(stateDir ?? join(bundlePath, "runtime-state"));
  const controlPlane = new FileAuditControlPlane({ dir: join(runtimeState, "audit") });
  const idempotencyStore = new FileIdempotencyStore({ dir: join(runtimeState, "idempotency") });
  const clockValue = /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? `${asOf}T12:00:00Z` : asOf;
  const clockDate = new Date(clockValue);
  if (Number.isNaN(clockDate.getTime())) throw new Error(`invalid asOf: ${asOf}`);
  const runtime = new SavingsRuntime({
    controlPlane,
    idempotencyStore,
    clock: () => new Date(clockDate),
  });

  const workflowResult = await dispatchApprovedWorkflow({
    workflowKey: installation.workflowKey,
    runtime,
    tenantId: installation.tenantId,
    automationInstanceId: installation.installationId,
    config,
    adapters,
    event,
    asOf,
  });

  const savings = calculateSavings({
    baseline: baselineForEngine(baseline),
    events: controlPlane.savingsEvents,
  });
  const success = controlPlane.incidents.length === 0;
  const evidence = {
    schemaVersion: 1,
    evidenceType: "LIVE_PROVIDER_EXECUTION",
    productionConnectorExecution: true,
    sideEffectsExplicitlyConfirmed: true,
    productionDryRunPassed: false,
    requiresHumanReviewForAcceptance: true,
    executedAt: new Date().toISOString(),
    asOf,
    tenantId: installation.tenantId,
    installationId: installation.installationId,
    workflowKey: installation.workflowKey,
    workflowVersion: installation.workflowVersion,
    runtimeProfile: installation.runtimeProfile,
    connectorVerification: (bindingsDoc.bindings ?? []).map((binding) => ({
      capability: binding.capability,
      provider: binding.provider,
      evidenceRef: binding.verification?.evidenceRef,
      checkedAt: binding.verification?.checkedAt,
    })),
    success,
    workflowResult,
    savings,
    controlPlane: controlPlane.snapshot(),
    runtimeState,
  };

  const output = resolve(evidencePath ?? join(bundlePath, "evidence", "live-execution-last.json"));
  await writeJson(output, evidence);
  return { evidence, evidencePath: output };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.bundle) {
    throw new Error("usage: run_live.mjs --bundle <dir> --confirm-live-side-effects YES [--event event.json | --source-id gmail-id] [--as-of ISO]");
  }
  if (args["confirm-live-side-effects"] !== "YES") {
    throw new Error("refusing live provider side effects; pass --confirm-live-side-effects YES");
  }
  const result = await runLiveBundle({
    bundle: args.bundle,
    eventPath: args.event ?? null,
    sourceId: args["source-id"] ?? null,
    asOf: args["as-of"] ?? new Date().toISOString(),
    stateDir: args["state-dir"] ?? null,
    evidencePath: args.out ?? null,
    confirmed: true,
  });
  console.log(JSON.stringify(result.evidence, null, 2));
  if (!result.evidence.success) process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 2;
  });
}
