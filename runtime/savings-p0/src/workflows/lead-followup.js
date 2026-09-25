import { PermanentError } from "../errors.js";

const HOUR_MS = 3_600_000;

function parseIso(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new PermanentError(`${name} is required`, { code: "LEAD_FOLLOWUP_INVALID_DATE" });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new PermanentError(`${name} is invalid`, { code: "LEAD_FOLLOWUP_INVALID_DATE" });
  }
  return date;
}

function normalizedStage(stage, index) {
  if (!stage || !Number.isFinite(Number(stage.delayHours)) || Number(stage.delayHours) < 0) {
    throw new PermanentError(`follow-up stage ${index} has invalid delayHours`, {
      code: "LEAD_FOLLOWUP_INVALID_CONFIG",
    });
  }
  return {
    key: String(stage.key ?? `h${Number(stage.delayHours)}`),
    delayHours: Number(stage.delayHours),
    templateKey: String(stage.templateKey ?? "lead-followup-v1"),
  };
}

export function isLeadOpen(lead) {
  if (lead?.doNotContact === true) return false;
  return !["won", "lost", "closed", "converted", "do_not_contact", "unsubscribed"].includes(
    String(lead?.status ?? "open").toLowerCase(),
  );
}

export function evaluateLeadFollowup(lead, { asOf, stages, minSpacingHours = 12 }) {
  if (!lead?.id) {
    throw new PermanentError("lead.id is required", { code: "LEAD_FOLLOWUP_INVALID_LEAD" });
  }
  if (!isLeadOpen(lead)) {
    return { eligible: false, reason: "lead_closed", stage: null };
  }

  const anchorAt = lead.followupAnchorAt ?? lead.lastInboundAt ?? lead.createdAt;
  if (!anchorAt) {
    throw new PermanentError("lead requires followupAnchorAt, lastInboundAt or createdAt", {
      code: "LEAD_FOLLOWUP_INVALID_LEAD",
    });
  }

  const now = parseIso(asOf, "asOf");
  const anchor = parseIso(anchorAt, "followupAnchorAt");
  const elapsedHours = (now - anchor) / HOUR_MS;
  const completedStages = new Set(lead.followup?.completedStages ?? []);

  if (lead.followup?.lastFollowupAt) {
    const last = parseIso(lead.followup.lastFollowupAt, "lastFollowupAt");
    const hoursSinceLast = (now - last) / HOUR_MS;
    if (hoursSinceLast < Number(minSpacingHours)) {
      return { eligible: false, reason: "minimum_spacing", stage: null, hoursSinceLast };
    }
  }

  const normalizedStages = stages
    .map(normalizedStage)
    .sort((a, b) => a.delayHours - b.delayHours);
  const stage = normalizedStages.find(
    (candidate) =>
      !completedStages.has(candidate.key) &&
      elapsedHours >= candidate.delayHours,
  );

  return stage
    ? { eligible: true, reason: "stage_due", stage, elapsedHours }
    : { eligible: false, reason: "no_stage_due", stage: null, elapsedHours };
}

export function buildLeadFollowupHandler({ messageAdapter, leadSource, config }) {
  if (!messageAdapter?.send) throw new TypeError("messageAdapter.send is required");
  if (!leadSource?.upsert) throw new TypeError("leadSource.upsert is required");
  const missingContactExceptionMinutes = Number(config.missingContactExceptionMinutes ?? 3);

  return async (ctx, input) => {
    const { lead, stage, asOf } = input;
    if (!lead.contact?.address) {
      return {
        status: "attention_required",
        metrics: {
          eligibleUnits: 1,
          automatedUnits: 0,
          exceptionMinutes: missingContactExceptionMinutes,
          oversightMinutes: 0,
          variableCost: 0,
        },
        processRecord: {
          entityType: "lead",
          entityId: `${lead.id}:followup:${stage.key}`,
          source: { system: lead.sourceSystem ?? "table", externalId: lead.externalId ?? lead.id },
          status: "followup_missing_contact",
          occurredAt: ctx.now.toISOString(),
          updatedAt: ctx.now.toISOString(),
          summary: { leadId: lead.id, leadName: lead.name, stage: stage.key },
          attributes: { reason: "missing_contact", stageDelayHours: stage.delayHours, asOf },
          requiresAttention: true,
        },
        output: { reason: "missing_contact", stage: stage.key },
      };
    }

    const sideEffectKey = `${ctx.tenantId}:lead-followup:${lead.id}:stage:${stage.key}`;
    const sent = await messageAdapter.send({
      tenantId: ctx.tenantId,
      to: lead.contact.address,
      channel: lead.contact.channel ?? config.defaultChannel ?? "email",
      templateKey: stage.templateKey,
      variables: {
        leadId: lead.id,
        leadName: lead.name,
        company: lead.company ?? null,
        ownerName: lead.ownerName ?? null,
        stage: stage.key,
      },
      idempotencyKey: sideEffectKey,
    });

    const completedStages = Array.from(new Set([
      ...(lead.followup?.completedStages ?? []),
      stage.key,
    ]));
    await leadSource.upsert({
      tenantId: ctx.tenantId,
      key: lead.id,
      row: {
        ...lead,
        followup: {
          ...(lead.followup ?? {}),
          completedStages,
          lastFollowupAt: asOf,
          lastFollowupStage: stage.key,
        },
      },
    });

    return {
      status: "completed",
      metrics: {
        eligibleUnits: 1,
        automatedUnits: sent.duplicate ? 0 : 1,
        exceptionMinutes: 0,
        oversightMinutes: 0,
        variableCost: Number(sent.variableCostPen ?? 0),
      },
      processRecord: {
        entityType: "lead",
        entityId: `${lead.id}:followup:${stage.key}`,
        source: { system: lead.sourceSystem ?? "table", externalId: lead.externalId ?? lead.id },
        status: "followup_sent",
        occurredAt: ctx.now.toISOString(),
        updatedAt: ctx.now.toISOString(),
        summary: { leadId: lead.id, leadName: lead.name, stage: stage.key },
        attributes: {
          providerMessageId: sent.providerMessageId,
          channel: sent.channel,
          stageDelayHours: stage.delayHours,
          asOf,
        },
        requiresAttention: false,
      },
      output: {
        providerMessageId: sent.providerMessageId,
        sideEffectKey,
        stage: stage.key,
      },
    };
  };
}

export async function runLeadFollowupBatch({
  runtime,
  leadSource,
  messageAdapter,
  tenantId,
  automationInstanceId,
  asOf,
  config = {},
}) {
  const stages = config.stages ?? [
    { key: "h24", delayHours: 24, templateKey: "lead-followup-24h-v1" },
    { key: "h72", delayHours: 72, templateKey: "lead-followup-72h-v1" },
    { key: "h168", delayHours: 168, templateKey: "lead-followup-7d-v1" },
  ];
  const minSpacingHours = Number(config.minSpacingHours ?? 12);
  const leads = await leadSource.list({ tenantId });
  const handler = buildLeadFollowupHandler({ messageAdapter, leadSource, config });
  const executions = [];
  let eligible = 0;

  for (const lead of leads) {
    const decision = evaluateLeadFollowup(lead, { asOf, stages, minSpacingHours });
    if (!decision.eligible) continue;
    eligible += 1;
    const result = await runtime.execute({
      tenantId,
      automationInstanceId,
      workflowKey: "LEAD_FOLLOWUP_AUTOMATION",
      idempotencyKey: `lead-followup:${lead.id}:stage:${decision.stage.key}`,
      input: { lead, stage: decision.stage, asOf },
      handler,
    });
    executions.push({
      leadId: lead.id,
      stage: decision.stage.key,
      ...result,
    });
  }

  return { scannedLeads: leads.length, eligible, executions };
}
