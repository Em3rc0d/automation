import { runPaymentReminderBatch } from "../../../runtime/savings-p0/src/workflows/payment-reminder.js";
import { ingestLead } from "../../../runtime/savings-p0/src/workflows/lead-intake.js";
import { runLeadFollowupBatch } from "../../../runtime/savings-p0/src/workflows/lead-followup.js";
import { runUnansweredMessageWatchdog } from "../../../runtime/savings-p0/src/workflows/unanswered-message-watchdog.js";
import { runAppointmentReminderBatch } from "../../../runtime/savings-p0/src/workflows/appointment-reminder.js";
import { runQuoteFollowupBatch } from "../../../runtime/savings-p0/src/workflows/quote-followup.js";
import { classifyAndRouteEmail } from "../../../runtime/savings-p0/src/workflows/email-classify-route.js";
import { extractEmailAttachments } from "../../../runtime/savings-p0/src/workflows/email-attachment-extract.js";
import { archiveDocument } from "../../../runtime/savings-p0/src/workflows/document-archive.js";
import { runLowStockAlert } from "../../../runtime/savings-p0/src/workflows/low-stock-alert.js";
import { intakeSupportRequest } from "../../../runtime/savings-p0/src/workflows/support-intake.js";
import { runRenewalReminderBatch } from "../../../runtime/savings-p0/src/workflows/renewal-reminder.js";

export const SUPPORTED_WORKFLOWS = [
  "PAYMENT_REMINDER_AUTOMATION",
  "LEAD_INTAKE_AUTOMATION",
  "LEAD_FOLLOWUP_AUTOMATION",
  "UNANSWERED_MESSAGE_WATCHDOG_AUTOMATION",
  "APPOINTMENT_REMINDER_AUTOMATION",
  "QUOTE_FOLLOWUP_AUTOMATION",
  "EMAIL_CLASSIFY_ROUTE_AUTOMATION",
  "EMAIL_ATTACHMENT_EXTRACT_AUTOMATION",
  "DOCUMENT_ARCHIVE_AUTOMATION",
  "LOW_STOCK_ALERT_AUTOMATION",
  "SUPPORT_INTAKE_AUTOMATION",
  "RENEWAL_REMINDER_AUTOMATION",
];

function need(adapters, role) {
  const value = adapters?.[role];
  if (!value) throw new Error(`workflow adapter missing: ${role}`);
  return value;
}

function needEvent(event, field) {
  const value = event?.[field];
  if (!value) throw new Error(`workflow event missing: ${field}`);
  return value;
}

export async function dispatchApprovedWorkflow({
  workflowKey,
  runtime,
  tenantId,
  automationInstanceId,
  config = {},
  adapters = {},
  event = {},
  asOf,
}) {
  if (!SUPPORTED_WORKFLOWS.includes(workflowKey)) throw new Error(`unsupported workflow: ${workflowKey}`);
  const iso = asOf ?? new Date().toISOString();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : iso.slice(0, 10);
  const common = { runtime, tenantId, automationInstanceId, config };

  switch (workflowKey) {
    case "PAYMENT_REMINDER_AUTOMATION":
      return runPaymentReminderBatch({
        ...common,
        invoiceSource: need(adapters, "invoiceSource"),
        messageAdapter: need(adapters, "messageAdapter"),
        asOfDate: dateOnly,
      });
    case "LEAD_INTAKE_AUTOMATION":
      return ingestLead({
        runtime,
        leadSource: need(adapters, "leadSource"),
        tenantId,
        automationInstanceId,
        inbound: needEvent(event, "inbound"),
      });
    case "LEAD_FOLLOWUP_AUTOMATION":
      return runLeadFollowupBatch({
        ...common,
        leadSource: need(adapters, "leadSource"),
        messageAdapter: need(adapters, "messageAdapter"),
        asOf: iso,
      });
    case "UNANSWERED_MESSAGE_WATCHDOG_AUTOMATION":
      return runUnansweredMessageWatchdog({
        ...common,
        threadSource: need(adapters, "threadSource"),
        messageAdapter: need(adapters, "messageAdapter"),
        asOf: iso,
      });
    case "APPOINTMENT_REMINDER_AUTOMATION":
      return runAppointmentReminderBatch({
        ...common,
        calendarAdapter: need(adapters, "calendarAdapter"),
        messageAdapter: need(adapters, "messageAdapter"),
        asOf: iso,
      });
    case "QUOTE_FOLLOWUP_AUTOMATION":
      return runQuoteFollowupBatch({
        ...common,
        quoteSource: need(adapters, "quoteSource"),
        messageAdapter: need(adapters, "messageAdapter"),
        asOf: iso,
      });
    case "EMAIL_CLASSIFY_ROUTE_AUTOMATION":
      return classifyAndRouteEmail({
        ...common,
        routeStore: need(adapters, "routeStore"),
        email: needEvent(event, "email"),
      });
    case "EMAIL_ATTACHMENT_EXTRACT_AUTOMATION":
      return extractEmailAttachments({
        ...common,
        storageAdapter: need(adapters, "storageAdapter"),
        email: needEvent(event, "email"),
      });
    case "DOCUMENT_ARCHIVE_AUTOMATION":
      return archiveDocument({
        ...common,
        storageAdapter: need(adapters, "storageAdapter"),
        document: needEvent(event, "document"),
      });
    case "LOW_STOCK_ALERT_AUTOMATION":
      return runLowStockAlert({
        ...common,
        inventorySource: need(adapters, "inventorySource"),
        messageAdapter: need(adapters, "messageAdapter"),
      });
    case "SUPPORT_INTAKE_AUTOMATION":
      return intakeSupportRequest({
        runtime,
        ticketStore: need(adapters, "ticketStore"),
        tenantId,
        automationInstanceId,
        request: needEvent(event, "request"),
      });
    case "RENEWAL_REMINDER_AUTOMATION":
      return runRenewalReminderBatch({
        ...common,
        contractSource: need(adapters, "contractSource"),
        messageAdapter: need(adapters, "messageAdapter"),
        asOfDate: dateOnly,
      });
    default:
      throw new Error(`no dispatcher for ${workflowKey}`);
  }
}
