import { createHash } from "node:crypto";

function stableKey(idempotencyKey) {
  return createHash("sha256").update(idempotencyKey).digest("hex");
}

function escapeDriveQuery(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export class GoogleDriveStorageAdapter {
  constructor({ client, folderId = null } = {}) {
    if (!client?.request) throw new TypeError("client.request is required");
    this.client = client;
    this.folderId = folderId;
  }

  async healthCheck() {
    const payload = await this.client.request("https://www.googleapis.com/drive/v3/files", {
      query: { pageSize: 1, fields: "files(id,name)" },
    });
    return {
      provider: "google_drive",
      ok: Array.isArray(payload?.files),
      visibleFiles: payload?.files?.length ?? 0,
      folderId: this.folderId,
    };
  }

  async put({ tenantId, path, content = null, metadata = {}, idempotencyKey }) {
    for (const [name, value] of Object.entries({ tenantId, path, idempotencyKey })) {
      if (typeof value !== "string" || !value.trim()) throw new TypeError(`${name} is required`);
    }
    const key = stableKey(idempotencyKey);
    const q = [
      `appProperties has { key='automationIdempotencyKey' and value='${escapeDriveQuery(key)}' }`,
      "trashed=false",
    ].join(" and ");
    const existing = await this.client.request("https://www.googleapis.com/drive/v3/files", {
      query: { q, fields: "files(id,name,webViewLink)", pageSize: 1 },
    });
    if (existing.files?.length) {
      return {
        providerObjectId: existing.files[0].id,
        tenantId,
        path,
        duplicate: true,
        variableCostPen: 0,
      };
    }

    const name = String(path).split("/").filter(Boolean).at(-1) ?? "document";
    const fileMetadata = {
      name,
      ...(this.folderId ? { parents: [this.folderId] } : {}),
      appProperties: {
        automationIdempotencyKey: key,
        automationPath: path,
        tenantId,
      },
    };
    const boundary = `automation_${key.slice(0, 16)}`;
    const raw = Buffer.isBuffer(content)
      ? content
      : typeof content === "string"
        ? Buffer.from(content, metadata.contentEncoding === "base64" ? "base64" : "utf8")
        : Buffer.from("");
    const mimeType = metadata.mimeType ?? "application/octet-stream";
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(fileMetadata)}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
      raw,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const created = await this.client.request("https://www.googleapis.com/upload/drive/v3/files", {
      method: "POST",
      query: { uploadType: "multipart", fields: "id,name,webViewLink" },
      headers: { "content-type": `multipart/related; boundary=${boundary}` },
      body,
    });
    return {
      providerObjectId: created.id,
      tenantId,
      path,
      duplicate: false,
      variableCostPen: 0,
    };
  }
}
