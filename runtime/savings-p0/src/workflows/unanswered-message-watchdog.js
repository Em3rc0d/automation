import { PermanentError } from "../errors.js";

const HOUR_MS = 3_600_000;

function parseIso(value, name) {
  const date = new Date(value);
  if (typeof value !== "string" || Number.isNaN(date.getTime())) {
    throw new PermanentError(`${name} is invalid`, { code: "UNANSWERED_WATCHDOG_INVALID_DATE" });
  }
  return date;
}

export function evaluateUnansweredThread(thread, { asOf, slaHours }) {
  if (!thread?.id) throw new PermanentError("thread.id is required", { code: "UNANSWERED_WATCHDOG_INVALID_THREAD" });
  if (["closed", "resolved", "archived"].includes(String(thread.status ?? "open").toLowerCase())) {
    return { eligible: false, reason: "thread_closed", ageHours: null };
  }
  if (!thread.lastInboundAt) return { eligible: false, reason: "no_inbound", ageHours: null };

  const inbound = parseIso(thread.lastInboundAt, "lastInboundAt");
  const outbound = thread.lastOutboundAt ? parseIso(thread.lastOutboundAt, "lastOutboundAt") : null;
  if (outbound && outbound >= inbound) {
    return { eligible: false, reason: "already_answered", ageHours: null };
  }

  const ageHours = (parseIso(asOf, "asOf") - inbound) / HOUR_MS;
  return ageHours >= slaHours
    ? { eligible: true, reason: "sla_breached", ageHours }
    : { eligible: false, reason: "inside_sla", ageHours };
}

export async function runUnansweredMessageWatchdog({
  runtime,
  threadSource,
  messageAdapter,
  tenantId,
  automationInstanceId,
  asOf,
  config = {},
}) {
  const slaHours = Number(config.slaHours ?? 4);
  const missingOwnerExceptionMinutes = Number(config.missingOwnerExceptionMinutes ?? 2);
  if (!Number.isFinite(slaHours) || slaHours <= 0) throw new TypeError("slaHours must be > 0");

  const threads = await threadSource.list({ tenantId });
  const executions = [];
  let eligible = 0;

  for (const thread of threads) {
    const decision = evaluateUnansweredThread(thread, { asOf, slaHours });
    if (!decision.eligible) continue;
    eligible += 1;

    const inboundKey = String(thread.lastInboundAt);
    const result = await runtime.execute({
      tenantId,
      automationInstanceId,
      workflowKey: "UNANSWERED_MESSAGE_WATCHDOG_AUTOMATION",
      idempotencyKey: `unanswered:${thread.id}:${inboundKey}`,
      input: { thread, decision, asOf },
      handler: async (ctx, input) => {
        const ownerContact = input.thread.owner?.contact;
        if (!ownerContact?.address) {
          return {
            status: "attention_required",
            metrics: {
              eligibleUnits: 1,
              automatedUnits: 0,
              exceptionMinutes: missingOwnerExceptionMinutes,
              oversightMinutes: 0,
              variableCost: 0,
            },
            processRecord: {
              entityType: "message_thread",
              entityId: input.thread.id,
              source: { system: input.thread.sourceSystem ?? "inbox", externalId: input.thread.externalId ?? input.thread.id },
              status: "unanswered_missing_owner_contact",
              occurredAt: ctx.now.toISOString(),
              updatedAt: ctx.now.toISOString(),
              summary: { subject: input.thread.subject, ageHours: input.decision.ageHours },
              attributes: { lastInboundAt: input.thread.lastInboundAt, asOf: input.asOf },
              requiresAttention: true,
            },
          };
        }

        const sideEffectKey = `${ctx.tenantId}:unanswered:${input.thread.id}:${inboundKey}`;
        const sent = await messageAdapter.send({
          tenantId: ctx.tenantId,
          to: ownerContact.address,
          channel: ownerContact.channel ?? config.defaultChannel ?? "email",
          templateKey: config.templateKey ?? "unanswered-message-alert-v1",
          variables: {
            threadId: input.thread.id,
            subject: input.thread.subject ?? null,
            ageHours: input.decision.ageHours,
            lastInboundAt: input.thread.lastInboundAt,
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
            variableCost: Number(sent.variableCostPen ?? 0),
          },
          processRecord: {
            entityType: "message_thread",
            entityId: input.thread.id,
            source: { system: input.thread.sourceSystem ?? "inbox", externalId: input.thread.externalId ?? input.thread.id },
            status: "owner_alerted",
            occurredAt: ctx.now.toISOString(),
            updatedAt: ctx.now.toISOString(),
            summary: { subject: input.thread.subject, ageHours: input.decision.ageHours },
            attributes: { providerMessageId: sent.providerMessageId, lastInboundAt: input.thread.lastInboundAt },
            requiresAttention: false,
          },
          output: { providerMessageId: sent.providerMessageId },
        };
      },
    });
    executions.push({ threadId: thread.id, ...result });
  }

  return { scannedThreads: threads.length, eligible, executions };
}
