import { PermanentError } from "../errors.js";

const DAY_MS = 86_400_000;

function parseDateOnly(value, name) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new PermanentError(`${name} must use YYYY-MM-DD`, { code: "PAYMENT_REMINDER_INVALID_DATE" });
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new PermanentError(`${name} is invalid`, { code: "PAYMENT_REMINDER_INVALID_DATE" });
  }
  return date;
}

export function dueOffsetDays({ dueDate, asOfDate }) {
  return Math.round((parseDateOnly(asOfDate, "asOfDate") - parseDateOnly(dueDate, "dueDate")) / DAY_MS);
}

export function isInvoiceOpen(invoice) {
  return !["paid", "cancelled", "void"].includes(String(invoice.status ?? "").toLowerCase());
}

export function evaluatePaymentReminder(invoice, { asOfDate, reminderOffsetsDays }) {
  if (!invoice?.id) throw new PermanentError("invoice.id is required", { code: "PAYMENT_REMINDER_INVALID_INVOICE" });
  if (!invoice?.dueDate) throw new PermanentError("invoice.dueDate is required", { code: "PAYMENT_REMINDER_INVALID_INVOICE" });
  if (!isInvoiceOpen(invoice)) return { eligible: false, reason: "invoice_closed", offsetDays: null };
  const offsetDays = dueOffsetDays({ dueDate: invoice.dueDate, asOfDate });
  const eligible = reminderOffsetsDays.includes(offsetDays);
  return { eligible, reason: eligible ? "offset_match" : "offset_not_configured", offsetDays };
}

export function buildPaymentReminderHandler({ messageAdapter, config }) {
  if (!messageAdapter?.send) throw new TypeError("messageAdapter.send is required");
  const missingContactExceptionMinutes = Number(config.missingContactExceptionMinutes ?? 2);

  return async (ctx, input) => {
    const { invoice, asOfDate, offsetDays } = input;
    if (!invoice.contact?.address) {
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
          entityType: "invoice",
          entityId: invoice.id,
          source: { system: invoice.sourceSystem ?? "table", externalId: invoice.externalId ?? invoice.id },
          status: "missing_contact",
          occurredAt: ctx.now.toISOString(),
          updatedAt: ctx.now.toISOString(),
          summary: { invoiceNumber: invoice.invoiceNumber, customerName: invoice.customerName, dueDate: invoice.dueDate, offsetDays },
          attributes: { reason: "missing_contact", asOfDate },
          monetaryValue: Number(invoice.amount ?? 0),
          currency: invoice.currency ?? "PEN",
          requiresAttention: true,
        },
        output: { reason: "missing_contact" },
      };
    }

    const sideEffectKey = `${ctx.tenantId}:payment-reminder:${invoice.id}:offset:${offsetDays}`;
    const sent = await messageAdapter.send({
      tenantId: ctx.tenantId,
      to: invoice.contact.address,
      channel: invoice.contact.channel ?? config.defaultChannel ?? "email",
      templateKey: config.templateKey ?? "payment-reminder-v1",
      variables: {
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        amount: invoice.amount,
        currency: invoice.currency ?? "PEN",
        dueDate: invoice.dueDate,
        offsetDays,
      },
      idempotencyKey: sideEffectKey,
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
        entityType: "invoice",
        entityId: invoice.id,
        source: { system: invoice.sourceSystem ?? "table", externalId: invoice.externalId ?? invoice.id },
        status: "reminder_sent",
        occurredAt: ctx.now.toISOString(),
        updatedAt: ctx.now.toISOString(),
        summary: { invoiceNumber: invoice.invoiceNumber, customerName: invoice.customerName, dueDate: invoice.dueDate, offsetDays },
        attributes: { providerMessageId: sent.providerMessageId, channel: sent.channel, asOfDate },
        monetaryValue: Number(invoice.amount ?? 0),
        currency: invoice.currency ?? "PEN",
        requiresAttention: false,
      },
      output: { providerMessageId: sent.providerMessageId, sideEffectKey },
    };
  };
}

export async function runPaymentReminderBatch({
  runtime,
  invoiceSource,
  messageAdapter,
  tenantId,
  automationInstanceId,
  asOfDate,
  config = {},
}) {
  const reminderOffsetsDays = config.reminderOffsetsDays ?? [-3, 0, 7, 15];
  const invoices = await invoiceSource.list({ tenantId });
  const handler = buildPaymentReminderHandler({ messageAdapter, config });
  const executions = [];
  let eligible = 0;

  for (const invoice of invoices) {
    const decision = evaluatePaymentReminder(invoice, { asOfDate, reminderOffsetsDays });
    if (!decision.eligible) continue;
    eligible += 1;
    const result = await runtime.execute({
      tenantId,
      automationInstanceId,
      workflowKey: "PAYMENT_REMINDER_AUTOMATION",
      idempotencyKey: `payment-reminder:${invoice.id}:offset:${decision.offsetDays}`,
      input: { invoice, asOfDate, offsetDays: decision.offsetDays },
      handler,
    });
    executions.push({ invoiceId: invoice.id, offsetDays: decision.offsetDays, ...result });
  }

  return { scanned: invoices.length, eligible, executions };
}
