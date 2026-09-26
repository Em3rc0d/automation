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

import { runPaymentReminderBatch } from "../../../runtime/savings-p0/src/workflows/payment-reminder.js";
import { ingestLead } from "../../../runtime/savings-p0/src/workflows/lead-intake.js";
import { runLeadFollowupBatch } from "../../../runtime/savings-p0/src/workflows/lead-followup.js";
import { runUnansweredMessageWatchdog } from "../../../runtime/savings-p0/src/workflows/unanswered-message-watchdog.js";
import { runAppointmentReminderBatch } from "../../../runtime/savings-p0/src/workflows/appointment-reminder.js";
import { runQuoteFollowupBatch } from "../../../runtime/savings-p0/src/workflows/quote-followup.js";
import { classifyAndRouteEmail } from "../../../runtime/savings-p0/src/workflows/email-classify-route.js";
import { extractEmailAttachments } from "../../../runtime/savings-p0/src/workflows/email-attachment-extract.js";
import { archiveDocument } from "../../../runtime/savings-p0/src/workflows/document-archive.js";
import { runLowStockAlert } from "../../../runtime/savings-p0/src/workflows/low-stock-alert.js";
import { intakeSupportRequest } from "../../../runtime/savings-p0/src/workflows/support-intake.js";
import { runRenewalReminderBatch } from "../../../runtime/savings-p0/src/workflows/renewal-reminder.js";

const SUPPORTED = [
  "PAYMENT_REMINDER_AUTOMATION",
  "LEAD_INTAKE_AUTOMATION",
  "LEAD_FOLLOWUP_AUTOMATION",
  "UNANSWERED_MESSAGE_WATCHDOG_AUTOMATION",
  "APPOINTMENT_REMINDER_AUTOMATION",
  "QUOTE_FOLLOWUP_AUTOMATION",
  "EMAIL_CLASSIFY_ROUTE_AUTOMATION",
  "EMAIL_ATTACHMENT_EXTRACT_AUTOMATION",
  "DOCUMENT_ARCHIVE_AUTOMATION",
  "LOW_STOCK_ALERT_AUTOMATION",
  "SUPPORT_INTAKE_AUTOMATION",
  "RENEWAL_REMINDER_AUTOMATION",
];

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

async function dispatch({ installation, config, fixture, ctx }) {
  const common = {
    runtime: ctx.runtime,
    tenantId: installation.tenantId,
    automationInstanceId: installation.installationId,
    config,
  };

  switch (installation.workflowKey) {
    case "PAYMENT_REMINDER_AUTOMATION":
      return runPaymentReminderBatch({
        ...common,
        invoiceSource: ctx.table,
        messageAdapter: ctx.messageAdapter,
        asOfDate: fixture.asOfDate ?? fixture.asOf,
      });
    case "LEAD_INTAKE_AUTOMATION":
      return ingestLead({
        runtime: ctx.runtime,
        leadSource: ctx.table,
        tenantId: installation.tenantId,
        automationInstanceId: installation.installationId,
        inbound: fixture.inbound,
      });
    case "LEAD_FOLLOWUP_AUTOMATION":
      return runLeadFollowupBatch({
        ...common,
        leadSource: ctx.table,
        messageAdapter: ctx.messageAdapter,
        asOf: fixture.asOf,
      });
    case "UNANSWERED_MESSAGE_WATCHDOG_AUTOMATION":
      return runUnansweredMessageWatchdog({
        ...common,
        threadSource: ctx.table,
        messageAdapter: ctx.messageAdapter,
        asOf: fixture.asOf,
      });
    case "APPOINTMENT_REMINDER_AUTOMATION":
      return runAppointmentReminderBatch({
        ...common,
        calendarAdapter: ctx.calendarAdapter,
        messageAdapter: ctx.messageAdapter,
        asOf: fixture.asOf,
      });
    case "QUOTE_FOLLOWUP_AUTOMATION":
      return runQuoteFollowupBatch({
        ...common,
        quoteSource: ctx.table,
        messageAdapter: ctx.messageAdapter,
        asOf: fixture.asOf,
      });
    case "EMAIL_CLASSIFY_ROUTE_AUTOMATION":
      return classifyAndRouteEmail({
        ...common,
        routeStore: ctx.routeStore,
        email: fixture.email,
      });
    case "EMAIL_ATTACHMENT_EXTRACT_AUTOMATION":
      return extractEmailAttachments({
        ...common,
        storageAdapter: ctx.storageAdapter,
        email: fixture.email,
      });
    case "DOCUMENT_ARCHIVE_AUTOMATION":
      return archiveDocument({
        ...common,
        storageAdapter: ctx.storageAdapter,
        document: fixture.document,
      });
    case "LOW_STOCK_ALERT_AUTOMATION":
      return runLowStockAlert({
        ...common,
        inventorySource: ctx.table,
        messageAdapter: ctx.messageAdapter,
      });
    case "SUPPORT_INTAKE_AUTOMATION":
      return intakeSupportRequest({
        runtime: ctx.runtime,
        ticketStore: ctx.ticketStore,
        tenantId: installation.tenantId,
        automationInstanceId: installation.installationId,
        request: fixture.request,
      });
    case "RENEWAL_REMINDER_AUTOMATION":
      return runRenewalReminderBatch({
        ...common,
        contractSource: ctx.table,
        messageAdapter: ctx.messageAdapter,
        asOfDate: fixture.asOfDate ?? fixture.asOf,
      });
    default:
      throw new Error(`no dispatcher for ${installation.workflowKey}`);
  }
}

export async function runBundle({ bundle, fixturePath }) {
  const bundlePath = resolve(bundle);
  const installation = await readJson(resolve(bundlePath, "installation.json"));
  const config = await readJson(resolve(bundlePath, "config.json"));
  const baseline = await readJson(resolve(bundlePath, "savings-baseline.json"));
  const fixture = await readJson(resolve(fixturePath));
  ensureApprovedInstallation(installation);

  const ctx = makeContext({ installation, fixture });
  const workflowResult = await dispatch({ installation, config, fixture, ctx });
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
