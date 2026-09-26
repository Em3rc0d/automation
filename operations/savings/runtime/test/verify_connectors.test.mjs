import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { verifyBundle } from "../verify_connectors.mjs";

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    text: async () => JSON.stringify(payload),
  };
}

async function paymentBundle() {
  const root = await mkdtemp(join(tmpdir(), "connector-verify-"));
  const bundle = join(root, "bundle");
  await mkdir(bundle);
  await writeFile(join(bundle, "connector-bindings.json"), JSON.stringify({
    schemaVersion: 1,
    secretPolicy: "REFERENCES_ONLY",
    bindings: [
      {
        capability: "records.accounts_receivable.read",
        adapterRole: "invoiceSource",
        provider: "google_sheets",
        credentialRef: "credref:acme-google",
        scopes: ["spreadsheets.readonly"],
        settings: { spreadsheetId: "sheet-1", range: "Invoices!A:Z" },
        status: "bound",
        verification: null
      },
      {
        capability: "messaging.send",
        adapterRole: "messageAdapter",
        provider: "gmail",
        credentialRef: "credref:acme-google",
        scopes: ["gmail.send"],
        settings: {},
        status: "bound",
        verification: null
      }
    ]
  }));
  return { root, bundle };
}

test("live connector verifier promotes bound Google connectors only after healthchecks", async () => {
  const { bundle } = await paymentBundle();
  const urls = [];
  const result = await verifyBundle({
    bundle,
    checkedAt: "2026-09-25T22:00:00Z",
    env: { AUTOMATION_CRED_ACME_GOOGLE: JSON.stringify({ accessToken: "token" }) },
    fetchFn: async (url) => {
      urls.push(url);
      if (url.startsWith("https://sheets.googleapis.com/v4/spreadsheets/sheet-1")) {
        return response({ spreadsheetId: "sheet-1", properties: { title: "Invoices" } });
      }
      if (url.includes("gmail.googleapis.com") && url.endsWith("/profile")) {
        return response({ emailAddress: "billing@example.test", messagesTotal: 1, threadsTotal: 1 });
      }
      return response({ error: "unexpected" }, 404);
    },
  });

  assert.equal(result.allPassed, true);
  assert.equal(result.results.length, 2);
  assert.equal(urls.length, 2);

  const bindings = JSON.parse(await readFile(join(bundle, "connector-bindings.json"), "utf8"));
  assert.ok(bindings.bindings.every((item) => item.status === "verified"));
  assert.ok(bindings.bindings.every((item) => item.verification.evidenceRef === "evidence/connector-verification.json"));

  const evidence = JSON.parse(await readFile(join(bundle, "evidence", "connector-verification.json"), "utf8"));
  assert.equal(evidence.productionDryRun, false);
  assert.equal(evidence.allPassed, true);
});

test("failed healthcheck degrades connector and cannot fabricate verification evidence", async () => {
  const { bundle } = await paymentBundle();
  const result = await verifyBundle({
    bundle,
    checkedAt: "2026-09-25T22:00:00Z",
    env: { AUTOMATION_CRED_ACME_GOOGLE: JSON.stringify({ accessToken: "token" }) },
    fetchFn: async (url) => {
      if (url.includes("sheets.googleapis.com")) return response({ error: "forbidden" }, 403);
      if (url.includes("gmail.googleapis.com")) return response({ emailAddress: "billing@example.test" });
      return response({}, 404);
    },
  });

  assert.equal(result.allPassed, false);
  const bindings = JSON.parse(await readFile(join(bundle, "connector-bindings.json"), "utf8"));
  const sheet = bindings.bindings.find((item) => item.provider === "google_sheets");
  const gmail = bindings.bindings.find((item) => item.provider === "gmail");
  assert.equal(sheet.status, "degraded");
  assert.equal(sheet.verification, null);
  assert.equal(gmail.status, "verified");
  assert.ok(gmail.verification.evidenceRef);
});
