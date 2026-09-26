import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runLiveBundle } from "../run_live.mjs";

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    text: async () => JSON.stringify(payload),
  };
}

async function configuredPaymentBundle() {
  const root = await mkdtemp(join(tmpdir(), "live-bundle-"));
  const bundle = join(root, "bundle");
  await mkdir(bundle);
  await writeFile(join(bundle, "installation.json"), JSON.stringify({
    schemaVersion: 1,
    installationId: "inst-live",
    tenantId: "tenant-live",
    workflowKey: "PAYMENT_REMINDER_AUTOMATION",
    workflowVersion: "0.1",
    runtimeProfile: "zero-deps-node-v1",
    state: "CLIENT_CONFIGURED"
  }));
  await writeFile(join(bundle, "config.json"), JSON.stringify({
    reminderOffsetsDays: [0],
    defaultChannel: "email",
    templateKey: "payment-reminder-v1"
  }));
  await writeFile(join(bundle, "savings-baseline.json"), JSON.stringify({
    schemaVersion: 1,
    workflowKey: "PAYMENT_REMINDER_AUTOMATION",
    unit: "invoice",
    status: "AGREED",
    manual_minutes_per_unit: 4,
    baseline_sample_size: 30,
    baseline_method: "time_study",
    loaded_hourly_cost: 18,
    currency: "PEN",
    confidence: "medium"
  }));
  await writeFile(join(bundle, "connector-bindings.json"), JSON.stringify({
    schemaVersion: 1,
    secretPolicy: "REFERENCES_ONLY",
    bindings: [
      {
        capability: "records.accounts_receivable.read",
        adapterRole: "invoiceSource",
        provider: "google_sheets",
        credentialRef: "credref:google",
        scopes: ["spreadsheets.readonly"],
        settings: {
          spreadsheetId: "sheet-1",
          range: "Invoices!A:Z",
          idColumn: "id",
          jsonColumns: ["contact"]
        },
        status: "verified",
        verification: {
          checkedAt: "2026-09-25T00:00:00Z",
          evidenceRef: "evidence/connectors.json",
          provider: "google_sheets"
        }
      },
      {
        capability: "messaging.send",
        adapterRole: "messageAdapter",
        provider: "gmail",
        credentialRef: "credref:google",
        scopes: ["gmail.send"],
        settings: {
          templates: {
            "payment-reminder-v1": {
              subject: "Factura {{invoiceNumber}}",
              text: "Hola {{customerName}}"
            }
          }
        },
        status: "verified",
        verification: {
          checkedAt: "2026-09-25T00:00:00Z",
          evidenceRef: "evidence/connectors.json",
          provider: "gmail"
        }
      }
    ]
  }));
  return { root, bundle };
}

test("live runner refuses provider side effects without explicit confirmation", async () => {
  const { bundle } = await configuredPaymentBundle();
  await assert.rejects(
    () => runLiveBundle({ bundle, confirmed: false }),
    /explicit side-effect confirmation/
  );
});

test("live runner uses persistent idempotency across separate invocations", async () => {
  const { root, bundle } = await configuredPaymentBundle();
  const calls = [];
  const fetchFn = async (url, options = {}) => {
    calls.push({ url, method: options.method ?? "GET" });
    if (url.includes("sheets.googleapis.com") && url.includes("/values/")) {
      return response({
        values: [
          ["id", "invoiceNumber", "customerName", "status", "dueDate", "amount", "currency", "contact"],
          ["inv-1", "F001", "Cliente", "open", "2026-09-25", 100, "PEN", JSON.stringify({ channel: "email", address: "billing@example.test" })]
        ]
      });
    }
    if (url.includes("gmail.googleapis.com") && url.includes("/messages?")) return response({});
    if (url.includes("gmail.googleapis.com") && url.endsWith("/messages/send")) return response({ id: "gmail-1" });
    return response({ error: "unexpected" }, 404);
  };
  const common = {
    bundle,
    asOf: "2026-09-25",
    stateDir: join(root, "persistent-state"),
    env: { AUTOMATION_CRED_GOOGLE: JSON.stringify({ accessToken: "token" }) },
    fetchFn,
    confirmed: true,
  };

  const first = await runLiveBundle(common);
  const second = await runLiveBundle(common);

  assert.equal(first.evidence.success, true);
  assert.equal(first.evidence.savings.automatedUnits, 1);
  assert.equal(second.evidence.success, true);
  assert.equal(second.evidence.workflowResult.executions[0].status, "skipped_duplicate");
  assert.equal(second.evidence.savings.automatedUnits, 0);
  assert.equal(calls.filter((call) => call.url.endsWith("/messages/send")).length, 1);
});
