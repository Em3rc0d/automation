import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  credentialEnvName,
  resolveCredential,
  getGoogleAccessToken,
} from "../credential-resolver.mjs";
import { GoogleSheetsTableAdapter } from "../sheets-table.mjs";
import { GmailMessageAdapter, deterministicMessageId } from "../gmail.mjs";
import { GoogleCalendarAdapter } from "../calendar.mjs";
import { GoogleDriveStorageAdapter } from "../drive-storage.mjs";

class StubClient {
  constructor(handler) {
    this.handler = handler;
    this.calls = [];
  }
  async request(url, options = {}) {
    this.calls.push({ url, options });
    return this.handler(url, options, this.calls.length);
  }
}

test("provider catalog covers every approved connector requirement", async () => {
  const catalog = JSON.parse(await readFile(
    new URL("../provider-catalog.json", import.meta.url), "utf8"
  ));
  const requirements = JSON.parse(await readFile(
    new URL("../../../../operations/savings/connector-requirements.json", import.meta.url), "utf8"
  ));
  const supported = new Set(
    Object.values(catalog.providers).flatMap((provider) => provider.capabilities)
  );
  const required = new Set(
    Object.values(requirements.workflows).flatMap((items) => items.map((item) => item.capability))
  );
  assert.deepEqual([...required].filter((capability) => !supported.has(capability)), []);
});

test("credential resolver keeps secret out of bundle and can refresh OAuth", async () => {
  assert.equal(credentialEnvName("credref:acme-google"), "AUTOMATION_CRED_ACME_GOOGLE");
  const env = {
    AUTOMATION_CRED_ACME_GOOGLE: JSON.stringify({
      clientId: "client",
      clientSecret: "secret",
      refreshToken: "refresh",
    }),
  };
  const credential = resolveCredential("credref:acme-google", env);
  let called = false;
  const token = await getGoogleAccessToken(credential, {
    fetchFn: async (url, options) => {
      called = true;
      assert.equal(url, "https://oauth2.googleapis.com/token");
      assert.equal(options.method, "POST");
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        text: async () => JSON.stringify({ access_token: "token-123" }),
      };
    },
  });
  assert.equal(called, true);
  assert.equal(token, "token-123");
});

test("Google Sheets adapter maps JSON columns and updates an existing row", async () => {
  const values = [
    ["id", "customerName", "contact"],
    ["inv-1", "Cliente", JSON.stringify({ address: "billing@example.test", channel: "email" })],
  ];
  const client = new StubClient(async (_url, options) => {
    if (!options.method || options.method === "GET") return { values };
    assert.equal(options.method, "PUT");
    assert.equal(options.json.values[0][0], "inv-1");
    assert.equal(options.json.values[0][1], "Cliente Actualizado");
    return { updatedRows: 1 };
  });
  const adapter = new GoogleSheetsTableAdapter({
    client,
    spreadsheetId: "sheet-1",
    range: "Invoices!A:Z",
    idColumn: "id",
    jsonColumns: ["contact"],
  });
  const listed = await adapter.list({ tenantId: "tenant-a" });
  assert.equal(listed.length, 1);
  assert.equal(listed[0].tenantId, "tenant-a");
  assert.equal(listed[0].contact.address, "billing@example.test");

  await adapter.upsert({
    tenantId: "tenant-a",
    key: "inv-1",
    row: {
      id: "inv-1",
      customerName: "Cliente Actualizado",
      contact: { address: "billing@example.test", channel: "email" },
    },
  });
  assert.equal(client.calls.at(-1).options.method, "PUT");
});

test("Gmail message adapter uses deterministic Message-ID and checks Sent before send", async () => {
  let searchCount = 0;
  const client = new StubClient(async (url, options) => {
    if (url.includes("/messages") && !url.endsWith("/send")) {
      searchCount += 1;
      return searchCount === 1 ? {} : { messages: [{ id: "gmail-existing" }] };
    }
    if (url.endsWith("/send")) {
      assert.equal(options.method, "POST");
      assert.ok(options.json.raw);
      return { id: "gmail-sent" };
    }
    throw new Error(`unexpected URL ${url}`);
  });
  const adapter = new GmailMessageAdapter({
    client,
    templates: {
      reminder: { subject: "Factura {{invoiceNumber}}", text: "Hola {{customerName}}" },
    },
  });
  const request = {
    tenantId: "tenant-a",
    to: "billing@example.test",
    channel: "email",
    templateKey: "reminder",
    variables: { invoiceNumber: "F001", customerName: "Cliente" },
    idempotencyKey: "tenant-a:invoice:1",
  };
  const first = await adapter.send(request);
  const second = await adapter.send(request);
  assert.equal(first.duplicate, false);
  assert.equal(first.providerMessageId, "gmail-sent");
  assert.equal(second.duplicate, true);
  assert.equal(second.providerMessageId, "gmail-existing");
  assert.match(deterministicMessageId(request.idempotencyKey), /^<[0-9a-f]{32}@automation\.local>$/);
});

test("Google Calendar adapter maps attendees into workflow contact shape", async () => {
  const client = new StubClient(async () => ({
    items: [{
      id: "event-1",
      summary: "Cita",
      status: "confirmed",
      start: { dateTime: "2026-09-26T15:00:00Z" },
      end: { dateTime: "2026-09-26T16:00:00Z" },
      attendees: [{ email: "client@example.test", displayName: "Client", responseStatus: "accepted" }],
    }],
  }));
  const adapter = new GoogleCalendarAdapter({ client, calendarId: "primary" });
  const events = await adapter.listUpcoming({
    tenantId: "tenant-a",
    from: "2026-09-26T00:00:00Z",
    to: "2026-09-27T00:00:00Z",
  });
  assert.equal(events[0].tenantId, "tenant-a");
  assert.equal(events[0].attendees[0].contact.address, "client@example.test");
});

test("Google Drive adapter skips duplicate upload found by idempotency app property", async () => {
  const client = new StubClient(async () => ({
    files: [{ id: "drive-existing", name: "invoice.pdf" }],
  }));
  const adapter = new GoogleDriveStorageAdapter({ client, folderId: "folder-1" });
  const result = await adapter.put({
    tenantId: "tenant-a",
    path: "archive/2026/invoice.pdf",
    content: "hello",
    metadata: { mimeType: "application/pdf" },
    idempotencyKey: "archive:invoice-1",
  });
  assert.equal(result.duplicate, true);
  assert.equal(result.providerObjectId, "drive-existing");
  assert.equal(client.calls.length, 1);
});
