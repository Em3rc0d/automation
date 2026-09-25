import { PermanentError } from "../errors.js";

const DAY_MS = 86_400_000;

function parseDateOnly(value, name) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new PermanentError(`${name} must use YYYY-MM-DD`, { code: "RENEWAL_REMINDER_INVALID_DATE" });
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new PermanentError(`${name} is invalid`, { code: "RENEWAL_REMINDER_INVALID_DATE" });
  return date;
}

export function daysUntilRenewal({ renewalDate, asOfDate }) {
  return Math.round((parseDateOnly(renewalDate, "renewalDate") - parseDateOnly(asOfDate, "asOfDate")) / DAY_MS);
}

export function evaluateRenewal(contract, { asOfDate, reminderOffsetsDays }) {
  if (!contract?.id) throw new PermanentError("contract.id is required", { code: "RENEWAL_REMINDER_INVALID_CONTRACT" });
  if (["cancelled", "expired", "terminated", "non_renewing"].includes(String(contract.status ?? "active").toLowerCase())) {
    return { eligible: false, reason: "contract_closed", offsetDays: null };
  }
  if (!contract.renewalDate) throw new PermanentError("contract.renewalDate is required", { code: "RENEWAL_REMINDER_INVALID_CONTRACT" });
  const offsetDays = daysUntilRenewal({ renewalDate: contract.renewalDate, asOfDate });
  return reminderOffsetsDays.includes(offsetDays)
    ? { eligible: true, reason: "offset_match", offsetDays }
    : { eligible: false, reason: "offset_not_configured", offsetDays };
}

export async function runRenewalReminderBatch({
  runtime,
  contractSource,
  messageAdapter,
  tenantId,
  automationInstanceId,
  asOfDate,
  config = {},
}) {
  const reminderOffsetsDays = config.reminderOffsetsDays ?? [30, 7, 0];
  const contracts = await contractSource.list({ tenantId });
  const executions = [];
  let eligible = 0;

  for (const contract of contracts) {
    const decision = evaluateRenewal(contract, { asOfDate, reminderOffsetsDays });
    if (!decision.eligible) continue;
    eligible += 1;

    const result = await runtime.execute({
      tenantId,
      automationInstanceId,
      workflowKey: "RENEWAL_REMINDER_AUTOMATION",
      idempotencyKey: `renewal-reminder:${contract.id}:offset:${decision.offsetDays}`,
      input: { contract, decision, asOfDate },
      handler: async (ctx, input) => {
        const contact = input.contract.contact ?? input.contract.owner?.contact;
        if (!contact?.address) {
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
              entityType: "contract",
              entityId: input.contract.id,
              source: { system: input.contract.sourceSystem ?? "contracts", externalId: input.contract.externalId ?? input.contract.id },
              status: "renewal_missing_contact",
              occurredAt: ctx.now.toISOString(),
              updatedAt: ctx.now.toISOString(),
              summary: { contractNumber: input.contract.contractNumber, renewalDate: input.contract.renewalDate, offsetDays: input.decision.offsetDays },
              attributes: {},
              requiresAttention: true,
            },
          };
        }

        const sent = await messageAdapter.send({
          tenantId: ctx.tenantId,
          to: contact.address,
          channel: contact.channel ?? config.defaultChannel ?? "email",
          templateKey: config.templateKey ?? "renewal-reminder-v1",
          variables: {
            contractId: input.contract.id,
            contractNumber: input.contract.contractNumber ?? null,
            renewalDate: input.contract.renewalDate,
            offsetDays: input.decision.offsetDays,
            customerName: input.contract.customerName ?? null,
          },
          idempotencyKey: `${ctx.tenantId}:renewal-reminder:${input.contract.id}:offset:${input.decision.offsetDays}`,
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
            entityType: "contract",
            entityId: input.contract.id,
            source: { system: input.contract.sourceSystem ?? "contracts", externalId: input.contract.externalId ?? input.contract.id },
            status: "renewal_reminder_sent",
            occurredAt: ctx.now.toISOString(),
            updatedAt: ctx.now.toISOString(),
            summary: { contractNumber: input.contract.contractNumber, renewalDate: input.contract.renewalDate, offsetDays: input.decision.offsetDays },
            attributes: { providerMessageId: sent.providerMessageId },
            requiresAttention: false,
          },
          output: { providerMessageId: sent.providerMessageId },
        };
      },
    });
    executions.push({ contractId: contract.id, offsetDays: decision.offsetDays, ...result });
  }

  return { scannedContracts: contracts.length, eligible, executions };
}
