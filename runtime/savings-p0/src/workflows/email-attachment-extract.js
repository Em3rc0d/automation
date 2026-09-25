import { PermanentError } from "../errors.js";

function safeFilename(name) {
  return String(name ?? "attachment")
    .replace(/[\\/]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "attachment";
}

export function eligibleAttachments(email, { allowedMimeTypes = [], maxBytes = 10_000_000 } = {}) {
  if (!email?.id) throw new PermanentError("email.id is required", { code: "EMAIL_ATTACHMENT_INVALID_EMAIL" });
  const attachments = Array.isArray(email.attachments) ? email.attachments : [];
  return attachments.map((attachment, index) => {
    const size = Number(attachment.sizeBytes ?? 0);
    const mimeAllowed = allowedMimeTypes.length === 0 || allowedMimeTypes.includes(attachment.mimeType);
    const sizeAllowed = Number.isFinite(size) && size >= 0 && size <= maxBytes;
    return {
      attachment,
      index,
      eligible: Boolean(attachment.id) && mimeAllowed && sizeAllowed,
      reason: !attachment.id ? "missing_id" : !mimeAllowed ? "mime_not_allowed" : !sizeAllowed ? "size_exceeded" : "eligible",
    };
  });
}

export async function extractEmailAttachments({
  runtime,
  storageAdapter,
  tenantId,
  automationInstanceId,
  email,
  config = {},
}) {
  if (!storageAdapter?.put) throw new TypeError("storageAdapter.put is required");
  const evaluated = eligibleAttachments(email, config);
  const executions = [];

  for (const item of evaluated) {
    if (!item.eligible) continue;
    const attachment = item.attachment;
    const safeName = safeFilename(attachment.name);
    const path = `${config.prefix ?? "email-attachments"}/${email.id}/${attachment.id}-${safeName}`;

    const result = await runtime.execute({
      tenantId,
      automationInstanceId,
      workflowKey: "EMAIL_ATTACHMENT_EXTRACT_AUTOMATION",
      idempotencyKey: `email-attachment:${email.id}:${attachment.id}`,
      input: { email, attachment, path },
      handler: async (ctx, input) => {
        const sideEffectKey = `${ctx.tenantId}:email-attachment:${input.email.id}:${input.attachment.id}`;
        const stored = await storageAdapter.put({
          tenantId: ctx.tenantId,
          path: input.path,
          content: input.attachment.content ?? null,
          metadata: {
            emailId: input.email.id,
            attachmentId: input.attachment.id,
            filename: input.attachment.name ?? null,
            mimeType: input.attachment.mimeType ?? null,
            sizeBytes: Number(input.attachment.sizeBytes ?? 0),
          },
          idempotencyKey: sideEffectKey,
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
            entityType: "attachment",
            entityId: `${input.email.id}:${input.attachment.id}`,
            source: { system: input.email.sourceSystem ?? "email", externalId: input.attachment.id },
            status: "extracted_stored",
            occurredAt: ctx.now.toISOString(),
            updatedAt: ctx.now.toISOString(),
            summary: { emailId: input.email.id, filename: input.attachment.name, path: input.path },
            attributes: { mimeType: input.attachment.mimeType, sizeBytes: Number(input.attachment.sizeBytes ?? 0) },
            requiresAttention: false,
          },
          output: { path: input.path },
        };
      },
    });
    executions.push({ attachmentId: attachment.id, path, ...result });
  }

  return {
    scannedAttachments: evaluated.length,
    eligible: evaluated.filter((item)=>item.eligible).length,
    skipped: evaluated.filter((item)=>!item.eligible).map((item)=>({ attachmentId: item.attachment?.id ?? null, reason: item.reason })),
    executions,
  };
}
