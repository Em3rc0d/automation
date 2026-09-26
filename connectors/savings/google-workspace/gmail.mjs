import { createHash } from "node:crypto";

function base64url(input) {
  return Buffer.from(input).toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64url(value = "") {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64");
}

function getHeader(headers = [], name) {
  return headers.find((h) => String(h.name).toLowerCase() === name.toLowerCase())?.value ?? null;
}

function render(template, variables) {
  return String(template ?? "").replace(/{{\s*([A-Za-z0-9_.-]+)\s*}}/g, (_, key) => {
    const value = String(key).split(".").reduce((acc, part) => acc?.[part], variables);
    return value === undefined || value === null ? "" : String(value);
  });
}

function deterministicMessageId(idempotencyKey) {
  const digest = createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 32);
  return `<${digest}@automation.local>`;
}

function flattenParts(payload, out = []) {
  if (!payload) return out;
  if (payload.filename || payload.body?.data || payload.body?.attachmentId) out.push(payload);
  for (const part of payload.parts ?? []) flattenParts(part, out);
  return out;
}

export class GmailMessageAdapter {
  constructor({ client, userId = "me", from = null, templates = {}, costPerMessagePen = 0 } = {}) {
    if (!client?.request) throw new TypeError("client.request is required");
    this.client = client;
    this.userId = userId;
    this.from = from;
    this.templates = templates;
    this.costPerMessagePen = Number(costPerMessagePen);
  }

  async send({ tenantId, to, channel = "email", templateKey, variables = {}, idempotencyKey }) {
    if (channel !== "email") throw new Error(`Gmail adapter only supports email channel, got ${channel}`);
    for (const [name, value] of Object.entries({ tenantId, to, templateKey, idempotencyKey })) {
      if (typeof value !== "string" || !value.trim()) throw new TypeError(`${name} is required`);
    }

    const messageId = deterministicMessageId(idempotencyKey);
    const search = await this.client.request(
      `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(this.userId)}/messages`,
      { query: { q: `in:sent rfc822msgid:${messageId}`, maxResults: 1 } },
    );
    if (Array.isArray(search?.messages) && search.messages.length) {
      return {
        providerMessageId: search.messages[0].id,
        tenantId,
        to,
        channel,
        templateKey,
        idempotencyKey,
        duplicate: true,
        variableCostPen: 0,
      };
    }

    const template = this.templates[templateKey] ?? {};
    const subject = render(template.subject ?? `Automation: ${templateKey}`, variables);
    const text = render(template.text ?? JSON.stringify(variables), variables);
    const lines = [
      `To: ${to}`,
      ...(this.from ? [`From: ${this.from}`] : []),
      `Subject: ${subject.replace(/[\r\n]+/g, " ")}`,
      `Message-ID: ${messageId}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      text,
    ];
    const sent = await this.client.request(
      `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(this.userId)}/messages/send`,
      { method: "POST", json: { raw: base64url(lines.join("\r\n")) } },
    );
    return {
      providerMessageId: sent.id,
      tenantId,
      to,
      channel,
      templateKey,
      idempotencyKey,
      duplicate: false,
      variableCostPen: this.costPerMessagePen,
    };
  }
}

export class GmailInboundAdapter {
  constructor({ client, userId = "me" } = {}) {
    if (!client?.request) throw new TypeError("client.request is required");
    this.client = client;
    this.userId = userId;
  }

  async getMessage(messageId) {
    const message = await this.client.request(
      `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(this.userId)}/messages/${encodeURIComponent(messageId)}`,
      { query: { format: "full" } },
    );
    const headers = message.payload?.headers ?? [];
    const parts = flattenParts(message.payload);
    const attachments = [];
    let bodyText = "";

    for (const part of parts) {
      if (part.mimeType === "text/plain" && part.body?.data && !bodyText) {
        bodyText = decodeBase64url(part.body.data).toString("utf8");
      }
      if (!part.filename) continue;
      let content = part.body?.data ? decodeBase64url(part.body.data) : null;
      if (!content && part.body?.attachmentId) {
        const payload = await this.client.request(
          `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(this.userId)}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(part.body.attachmentId)}`,
        );
        content = decodeBase64url(payload.data ?? "");
      }
      attachments.push({
        id: part.body?.attachmentId ?? part.partId ?? part.filename,
        name: part.filename,
        mimeType: part.mimeType ?? "application/octet-stream",
        sizeBytes: Number(part.body?.size ?? content?.length ?? 0),
        content: content ? content.toString("base64") : null,
      });
    }

    const internalDate = Number(message.internalDate || 0);
    return {
      id: message.id,
      externalId: message.id,
      threadId: message.threadId,
      sourceSystem: "gmail",
      from: getHeader(headers, "From"),
      to: getHeader(headers, "To"),
      subject: getHeader(headers, "Subject"),
      receivedAt: internalDate ? new Date(internalDate).toISOString() : null,
      bodyText,
      attachments,
    };
  }

  async list({ query = "in:inbox", maxResults = 20 } = {}) {
    const result = await this.client.request(
      `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(this.userId)}/messages`,
      { query: { q: query, maxResults } },
    );
    const messages = [];
    for (const item of result.messages ?? []) messages.push(await this.getMessage(item.id));
    return messages;
  }
}

export { deterministicMessageId };
