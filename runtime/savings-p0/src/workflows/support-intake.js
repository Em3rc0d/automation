import { PermanentError } from "../errors.js";

function clean(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function normalizeSupportRequest(request) {
  if (!request?.sourceId) {
    throw new PermanentError("request.sourceId is required", { code: "SUPPORT_INTAKE_INVALID_SOURCE" });
  }
  const subject = clean(request.subject) || "Support request";
  const body = clean(request.body ?? request.message);
  if (!body) {
    throw new PermanentError("support request body is required", { code: "SUPPORT_INTAKE_EMPTY" });
  }

  return {
    id: `ticket:${String(request.sourceSystem ?? "source")}:${request.sourceId}`,
    sourceSystem: String(request.sourceSystem ?? "source"),
    externalId: String(request.sourceId),
    subject,
    body,
    requester: structuredClone(request.requester ?? null),
    channel: clean(request.channel) || "unknown",
    status: "new",
    receivedAt: request.receivedAt ?? null,
  };
}

export async function intakeSupportRequest({
  runtime,
  ticketStore,
  tenantId,
  automationInstanceId,
  request,
}) {
  if (!ticketStore?.upsert) throw new TypeError("ticketStore.upsert is required");
  const ticket = normalizeSupportRequest(request);

  return runtime.execute({
    tenantId,
    automationInstanceId,
    workflowKey: "SUPPORT_INTAKE_AUTOMATION",
    idempotencyKey: `support-intake:${ticket.sourceSystem}:${ticket.externalId}`,
    input: { ticket },
    handler: async (ctx, input) => {
      await ticketStore.upsert({
        tenantId: ctx.tenantId,
        key: input.ticket.id,
        row: {
          ...input.ticket,
          tenantId: ctx.tenantId,
          createdAt: input.ticket.receivedAt ?? ctx.now.toISOString(),
          updatedAt: ctx.now.toISOString(),
        },
      });

      return {
        status: "completed",
        metrics: {
          eligibleUnits: 1,
          automatedUnits: 1,
          exceptionMinutes: 0,
          oversightMinutes: 0,
          variableCost: 0,
        },
        processRecord: {
          entityType: "ticket",
          entityId: input.ticket.id,
          source: { system: input.ticket.sourceSystem, externalId: input.ticket.externalId },
          status: "registered",
          occurredAt: ctx.now.toISOString(),
          updatedAt: ctx.now.toISOString(),
          summary: { subject: input.ticket.subject, channel: input.ticket.channel },
          attributes: { requester: input.ticket.requester },
          requiresAttention: false,
        },
        output: { ticketId: input.ticket.id },
      };
    },
  });
}
