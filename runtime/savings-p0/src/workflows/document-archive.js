import { PermanentError } from "../errors.js";

function safeSegment(value, fallback = "unknown") {
  const result = String(value ?? fallback)
    .trim()
    .replace(/[\\/]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return result || fallback;
}

function archiveDate(document, now) {
  const candidate = document.documentDate ?? document.receivedAt ?? now.toISOString();
  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) {
    throw new PermanentError("document date is invalid", { code: "DOCUMENT_ARCHIVE_INVALID_DATE" });
  }
  return date;
}

export function buildArchivePath(document, { prefix = "archive" } = {}, now = new Date()) {
  if (!document?.id) throw new PermanentError("document.id is required", { code: "DOCUMENT_ARCHIVE_INVALID_DOCUMENT" });
  const date = archiveDate(document, now);
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const type = safeSegment(document.documentType, "document");
  const name = safeSegment(document.targetName ?? document.name ?? document.id, document.id);
  return `${prefix}/${yyyy}/${mm}/${type}/${name}`;
}

export async function archiveDocument({
  runtime,
  storageAdapter,
  tenantId,
  automationInstanceId,
  document,
  config = {},
}) {
  if (!storageAdapter?.put) throw new TypeError("storageAdapter.put is required");

  return runtime.execute({
    tenantId,
    automationInstanceId,
    workflowKey: "DOCUMENT_ARCHIVE_AUTOMATION",
    idempotencyKey: `document-archive:${document.id}`,
    input: { document },
    handler: async (ctx, { document: doc }) => {
      const path = buildArchivePath(doc, config, ctx.now);
      const stored = await storageAdapter.put({
        tenantId: ctx.tenantId,
        path,
        content: doc.content ?? null,
        metadata: {
          documentId: doc.id,
          originalName: doc.name ?? null,
          documentType: doc.documentType ?? null,
          sourceSystem: doc.sourceSystem ?? null,
        },
        idempotencyKey: `${ctx.tenantId}:document-archive:${doc.id}`,
      });

      return {
        status: "completed",
        metrics: {
          eligibleUnits: 1,
          automatedUnits: 1,
          exceptionMinutes: 0,
          oversightMinutes: 0,
          variableCost: Number(stored.variableCostPen ?? 0),
        },
        processRecord: {
          entityType: "document",
          entityId: doc.id,
          source: { system: doc.sourceSystem ?? "document", externalId: doc.externalId ?? doc.id },
          status: "archived",
          occurredAt: ctx.now.toISOString(),
          updatedAt: ctx.now.toISOString(),
          summary: { originalName: doc.name, path, documentType: doc.documentType },
          attributes: { mimeType: doc.mimeType ?? null },
          requiresAttention: false,
        },
        output: { path },
      };
    },
  });
}
