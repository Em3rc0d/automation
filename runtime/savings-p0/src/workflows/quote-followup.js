import { PermanentError } from "../errors.js";

const DAY_MS = 86_400_000;

function parseIso(value, name) {
  const date = new Date(value);
  if (typeof value !== "string" || Number.isNaN(date.getTime())) {
    throw new PermanentError(`${name} is invalid`, { code: "QUOTE_FOLLOWUP_INVALID_DATE" });
  }
  return date;
}

function completedStagesFor(quote) {
  return Array.isArray(quote?.followup?.completedStages) ? quote.followup.completedStages : [];
}

function normalizeStage(stage, index) {
  const delayDays = Number(stage?.delayDays);
  if (!Number.isFinite(delayDays) || delayDays < 0) {
    throw new PermanentError(`quote stage ${index} has invalid delayDays`, { code: "QUOTE_FOLLOWUP_INVALID_CONFIG" });
  }
  return {
    key: String(stage.key ?? `d${delayDays}`),
    delayDays,
    templateKey: String(stage.templateKey ?? "quote-followup-v1"),
  };
}

export function evaluateQuoteFollowup(quote, { asOf, stages, minSpacingHours = 12 }) {
  if (!quote?.id) throw new PermanentError("quote.id is required", { code: "QUOTE_FOLLOWUP_INVALID_QUOTE" });
  if (["accepted", "rejected", "expired", "cancelled", "closed"].includes(String(quote.status ?? "pending").toLowerCase())) {
    return { eligible: false, reason: "quote_closed", stage: null };
  }

  const anchorAt = quote.deliveredAt ?? quote.sentAt ?? quote.createdAt;
  if (!anchorAt) throw new PermanentError("quote requires deliveredAt, sentAt or createdAt", { code: "QUOTE_FOLLOWUP_INVALID_QUOTE" });
  const now = parseIso(asOf, "asOf");
  const anchor = parseIso(anchorAt, "quoteAnchorAt");
  const elapsedDays = (now - anchor) / DAY_MS;

  if (quote.followup?.lastFollowupAt) {
    const hoursSinceLast = (now - parseIso(quote.followup.lastFollowupAt, "lastFollowupAt")) / 3_600_000;
    if (hoursSinceLast < Number(minSpacingHours)) {
      return { eligible: false, reason: "minimum_spacing", stage: null, hoursSinceLast };
    }
  }

  const completed = new Set(completedStagesFor(quote));
  const normalized = stages.map(normalizeStage).sort((a,b)=>a.delayDays-b.delayDays);
  const stage = normalized.find((candidate) => !completed.has(candidate.key) && elapsedDays >= candidate.delayDays);
  return stage
    ? { eligible: true, reason: "stage_due", stage, elapsedDays }
    : { eligible: false, reason: "no_stage_due", stage: null, elapsedDays };
}

export async function runQuoteFollowupBatch({
  runtime,
  quoteSource,
  messageAdapter,
  tenantId,
  automationInstanceId,
  asOf,
  config = {},
}) {
  const stages = config.stages ?? [
    { key: "d2", delayDays: 2, templateKey: "quote-followup-2d-v1" },
    { key: "d5", delayDays: 5, templateKey: "quote-followup-5d-v1" },
  ];
  const minSpacingHours = Number(config.minSpacingHours ?? 12);
  if (!Array.isArray(stages) || stages.length === 0) throw new TypeError("stages must be non-empty");
  const stageKeys = stages.map((stage, i)=>normalizeStage(stage,i).key);
  if (new Set(stageKeys).size !== stageKeys.length) throw new TypeError("stage keys must be unique");

  const quotes = await quoteSource.list({ tenantId });
  const executions = [];
  let eligible = 0;

  for (const quote of quotes) {
    const decision = evaluateQuoteFollowup(quote, { asOf, stages, minSpacingHours });
    if (!decision.eligible) continue;
    eligible += 1;

    const result = await runtime.execute({
      tenantId,
      automationInstanceId,
      workflowKey: "QUOTE_FOLLOWUP_AUTOMATION",
      idempotencyKey: `quote-followup:${quote.id}:stage:${decision.stage.key}`,
      input: { quote, stage: decision.stage, asOf },
      handler: async (ctx, input) => {
        if (!input.quote.contact?.address) {
          return {
            status: "attention_required",
            metrics: {
              eligibleUnits: 1,
              automatedUnits: 0,
              exceptionMinutes: Number(config.missingContactExceptionMinutes ?? 3),
              oversightMinutes: 0,
              variableCost: 0,
            },
            processRecord: {
              entityType: "quote",
              entityId: `${input.quote.id}:followup:${input.stage.key}`,
              source: { system: input.quote.sourceSystem ?? "table", externalId: input.quote.externalId ?? input.quote.id },
              status: "followup_missing_contact",
              occurredAt: ctx.now.toISOString(),
              updatedAt: ctx.now.toISOString(),
              summary: { quoteNumber: input.quote.quoteNumber, customerName: input.quote.customerName, stage: input.stage.key },
              attributes: { reason: "missing_contact" },
              requiresAttention: true,
            },
          };
        }

        const sideEffectKey = `${ctx.tenantId}:quote-followup:${input.quote.id}:stage:${input.stage.key}`;
        const sent = await messageAdapter.send({
          tenantId: ctx.tenantId,
          to: input.quote.contact.address,
          channel: input.quote.contact.channel ?? config.defaultChannel ?? "email",
          templateKey: input.stage.templateKey,
          variables: {
            quoteId: input.quote.id,
            quoteNumber: input.quote.quoteNumber,
            customerName: input.quote.customerName,
            amount: input.quote.amount ?? null,
            currency: input.quote.currency ?? null,
            stage: input.stage.key,
          },
          idempotencyKey: sideEffectKey,
        });

        const completedStages = Array.from(new Set([...completedStagesFor(input.quote), input.stage.key]));
        await quoteSource.upsert({
          tenantId: ctx.tenantId,
          key: input.quote.id,
          row: {
            ...input.quote,
            followup: {
              ...(input.quote.followup ?? {}),
              completedStages,
              lastFollowupAt: input.asOf,
              lastFollowupStage: input.stage.key,
            },
          },
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
            entityType: "quote",
            entityId: `${input.quote.id}:followup:${input.stage.key}`,
            source: { system: input.quote.sourceSystem ?? "table", externalId: input.quote.externalId ?? input.quote.id },
            status: "followup_sent",
            occurredAt: ctx.now.toISOString(),
            updatedAt: ctx.now.toISOString(),
            summary: { quoteNumber: input.quote.quoteNumber, customerName: input.quote.customerName, stage: input.stage.key },
            attributes: { providerMessageId: sent.providerMessageId },
            monetaryValue: Number(input.quote.amount ?? 0),
            currency: input.quote.currency ?? "PEN",
            requiresAttention: false,
          },
          output: { providerMessageId: sent.providerMessageId, stage: input.stage.key },
        };
      },
    });
    executions.push({ quoteId: quote.id, stage: decision.stage.key, ...result });
  }

  return { scannedQuotes: quotes.length, eligible, executions };
}
