#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { SavingsRuntime } from "../../../runtime/savings-p0/src/runtime.js";
import {
  MemoryControlPlane,
  MemoryIdempotencyStore,
  sequentialIdFactory,
} from "../../../runtime/savings-p0/src/stores.js";
import { calculateSavings } from "../../../runtime/savings-p0/src/savings.js";
import { MemoryTableAdapter } from "../../../runtime/savings-p0/src/adapters/memory-table.js";
import { MemoryCalendarAdapter } from "../../../runtime/savings-p0/src/adapters/memory-calendar.js";
import { MemoryMessageAdapter } from "../../../runtime/savings-p0/src/adapters/memory-message.js";
import { MemoryStorageAdapter } from "../../../runtime/savings-p0/src/adapters/memory-storage.js";

import { dispatchApprovedWorkflow, SUPPORTED_WORKFLOWS } from "./workflow-dispatch.mjs";

const SUPPORTED = SUPPORTED_WORKFLOWS;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--self-test") out.selfTest = true;
    else if (arg === "--json") out.json = true;
    else if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) throw new Error(`missing value for ${arg}`);
      out[key] = value;
      i += 1;
    }
  }
  return out;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function withTenant(rows, tenantId) {
  return (rows ?? []).map((row) => ({ ...structuredClone(row), tenantId: row.tenantId ?? tenantId }));
}

function fixtureClock(fixture) {
  const value = fixture.clock ?? fixture.asOf ?? fixture.asOfDate ?? "2026-09-25T12:00:00Z";
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) throw new Error(`invalid fixture clock/asOf: ${value}`);
  return () => new Date(date);
}

function baselineForEngine(baseline) {
  if (!baseline || baseline.status !== "AGREED") return null;
  return {
    manualMinutesPerUnit: baseline.manual_minutes_per_unit,
    loadedHourlyCost: baseline.loaded_hourly_cost,
    currency: baseline.currency ?? "PEN",
    confidence: baseline.confidence,
  };
}

function ensureApprovedInstallation(installation) {
  if (!installation?.tenantId) throw new Error("installation.json tenantId is required");
  if (!installation?.installationId) throw new Error("installation.json installationId is required");
  if (!SUPPORTED.includes(installation.workflowKey)) {
    throw new Error(`unsupported approved workflow: ${installation.workflowKey}`);
  }
  if (installation.runtimeProfile !== "zero-deps-node-v1") {
    throw new Error(`unsupported runtimeProfile: ${installation.runtimeProfile}`);
  }
}

function makeContext({ installation, fixture }) {
  const controlPlane = new MemoryControlPlane({ idFactory: sequentialIdFactory("dryrun") });
  const runtime = new SavingsRuntime({
    controlPlane,
    idempotencyStore: new MemoryIdempotencyStore(),
    clock: fixtureClock(fixture),
  });
  const messageAdapter = new MemoryMessageAdapter({
    costPerMessagePen: Number(fixture.simulationCostPerMessagePen ?? 0),
  });
  const storageAdapter = new MemoryStorageAdapter();
  const table = new MemoryTableAdapter(withTenant(fixture.records, installation.tenantId));
  const routeStore = new MemoryTableAdapter(withTenant(fixture.routeRecords, installation.tenantId));
  const ticketStore = new MemoryTableAdapter(withTenant(fixture.ticketRecords, installation.tenantId));
  const calendarAdapter = new MemoryCalendarAdapter(withTenant(fixture.events, installation.tenantId));
  return {
    runtime,
    controlPlane,
    messageAdapter,
    storageAdapter,
    table,
    routeStore,
    ticketStore,
    calendarAdapter,
  };
}

export async function runBundle({ bundle, fixturePath }) {
  const bundlePath = resolve(bundle);
  const installation = await readJson(resolve(bundlePath, "installation.json"));
  const config = await readJson(resolve(bundlePath, "config.json"));
  const baseline = await readJson(resolve(bundlePath, "savings-baseline.json"));
  const fixture = await readJson(resolve(fixturePath));
  ensureApprovedInstallation(installation);

  const ctx = makeContext({ installation, fixture });
  const workflowResult = await dispatchApprovedWorkflow({
    workflowKey: installation.workflowKey,
    runtime: ctx.runtime,
    tenantId: installation.tenantId,
    automationInstanceId: installation.installationId,
    config,
    adapters: {
      invoiceSource: ctx.table,
      leadSource: ctx.table,
      threadSource: ctx.table,
      calendarAdapter: ctx.calendarAdapter,
      quoteSource: ctx.table,
      routeStore: ctx.routeStore,
      storageAdapter: ctx.storageAdapter,
      inventorySource: ctx.table,
      ticketStore: ctx.ticketStore,
      contractSource: ctx.table,
      messageAdapter: ctx.messageAdapter,
    },
    event: {
      inbound: fixture.inbound,
      email: fixture.email,
      document: fixture.document,
      request: fixture.request,
    },
    asOf: fixture.asOf ?? fixture.asOfDate ?? fixture.clock,
  });
  const engineBaseline = baselineForEngine(baseline);
  const savings = engineBaseline
    ? calculateSavings({ baseline: engineBaseline, events: ctx.controlPlane.savingsEvents })
    : null;

  const result = {
    schemaVersion: 1,
    evidenceType: "LOCAL_SIMULATION",
    productionEvidence: false,
    tenantId: installation.tenantId,
    installationId: installation.installationId,
    workflowKey: installation.workflowKey,
    workflowVersion: installation.workflowVersion,
    runtimeProfile: installation.runtimeProfile,
    workflowResult,
    savingsBaselineStatus: baseline.status,
    savings,
    sideEffects: {
      simulatedMessages: ctx.messageAdapter.sent,
      simulatedStorageObjects: await ctx.storageAdapter.list({ tenantId: installation.tenantId }),
      tableRows: await ctx.table.list({ tenantId: installation.tenantId }),
      routeRows: await ctx.routeStore.list({ tenantId: installation.tenantId }),
      ticketRows: await ctx.ticketStore.list({ tenantId: installation.tenantId }),
      calendarEvents: ctx.calendarAdapter.events.filter((e) => e.tenantId === installation.tenantId),
    },
    controlPlane: ctx.controlPlane.snapshot(),
  };
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) {
    if (new Set(SUPPORTED).size !== 12) throw new Error("runner must support exactly 12 W-SAVINGS-P0 workflows");
    console.log(JSON.stringify({ status: "PASS", supported: SUPPORTED }, null, 2));
    return;
  }
  if (!args.bundle || !args.fixture) {
    throw new Error("usage: run_bundle.mjs --bundle <installation-dir> --fixture <fixture.json> [--out result.json]");
  }
  const result = await runBundle({ bundle: args.bundle, fixturePath: args.fixture });
  const rendered = JSON.stringify(result, null, 2) + "\n";
  if (args.out) await writeFile(resolve(args.out), rendered, "utf8");
  process.stdout.write(rendered);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 2;
  });
}

export { SUPPORTED };
