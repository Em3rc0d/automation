import { PermanentError } from "../errors.js";

const MINUTE_MS = 60_000;

function parseIso(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new PermanentError(`${name} is required`, { code: "APPOINTMENT_REMINDER_INVALID_DATE" });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new PermanentError(`${name} is invalid`, { code: "APPOINTMENT_REMINDER_INVALID_DATE" });
  }
  return date;
}

export function minutesUntil({ startsAt, asOf }) {
  return Math.round((parseIso(startsAt, "startsAt") - parseIso(asOf, "asOf")) / MINUTE_MS);
}

export function isAppointmentActive(event) {
  return !["cancelled", "canceled", "completed", "no_show", "noshow"].includes(
    String(event.status ?? "scheduled").toLowerCase(),
  );
}

export function evaluateAppointmentReminder(event, { asOf, reminderOffsetsMinutes, scanWindowMinutes }) {
  if (!event?.id) {
    throw new PermanentError("event.id is required", { code: "APPOINTMENT_REMINDER_INVALID_EVENT" });
  }
  if (!event?.startsAt) {
    throw new PermanentError("event.startsAt is required", { code: "APPOINTMENT_REMINDER_INVALID_EVENT" });
  }
  if (!isAppointmentActive(event)) {
    return { eligible: false, reason: "appointment_closed", stageMinutes: null, minutesToStart: null };
  }

  const minutesToStart = minutesUntil({ startsAt: event.startsAt, asOf });
  if (minutesToStart < 0) {
    return { eligible: false, reason: "appointment_started", stageMinutes: null, minutesToStart };
  }

  const sorted = [...reminderOffsetsMinutes].sort((a, b) => b - a);
  const stageMinutes = sorted.find((offset) =>
    minutesToStart <= offset && minutesToStart >= offset - scanWindowMinutes
  );

  return stageMinutes === undefined
    ? { eligible: false, reason: "outside_reminder_window", stageMinutes: null, minutesToStart }
    : { eligible: true, reason: "reminder_window_match", stageMinutes, minutesToStart };
}

export function buildAppointmentReminderHandler({ messageAdapter, config }) {
  if (!messageAdapter?.send) throw new TypeError("messageAdapter.send is required");
  const missingContactExceptionMinutes = Number(config.missingContactExceptionMinutes ?? 2);

  return async (ctx, input) => {
    const { event, attendee, stageMinutes, asOf } = input;
    const attendeeId = attendee?.id ?? attendee?.contact?.address ?? "unknown";

    if (!attendee?.contact?.address) {
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
          entityType: "appointment",
          entityId: `${event.id}:${attendeeId}:reminder:${stageMinutes}`,
          source: { system: event.sourceSystem ?? "calendar", externalId: event.externalId ?? event.id },
          status: "reminder_missing_contact",
          occurredAt: ctx.now.toISOString(),
          updatedAt: ctx.now.toISOString(),
          summary: {
            appointmentId: event.id,
            title: event.title,
            startsAt: event.startsAt,
            attendeeName: attendee?.name,
            stageMinutes,
          },
          attributes: { reason: "missing_contact", asOf },
          requiresAttention: true,
        },
        output: { reason: "missing_contact" },
      };
    }

    const sideEffectKey =
      `${ctx.tenantId}:appointment-reminder:${event.id}:${attendeeId}:stage:${stageMinutes}`;
    const sent = await messageAdapter.send({
      tenantId: ctx.tenantId,
      to: attendee.contact.address,
      channel: attendee.contact.channel ?? config.defaultChannel ?? "email",
      templateKey: config.templateKey ?? "appointment-reminder-v1",
      variables: {
        appointmentId: event.id,
        title: event.title,
        startsAt: event.startsAt,
        attendeeName: attendee.name,
        stageMinutes,
        location: event.location ?? null,
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
        entityType: "appointment",
        entityId: `${event.id}:${attendeeId}:reminder:${stageMinutes}`,
        source: { system: event.sourceSystem ?? "calendar", externalId: event.externalId ?? event.id },
        status: "reminder_sent",
        occurredAt: ctx.now.toISOString(),
        updatedAt: ctx.now.toISOString(),
        summary: {
          appointmentId: event.id,
          title: event.title,
          startsAt: event.startsAt,
          attendeeName: attendee.name,
          stageMinutes,
        },
        attributes: {
          providerMessageId: sent.providerMessageId,
          channel: sent.channel,
          asOf,
        },
        requiresAttention: false,
      },
      output: { providerMessageId: sent.providerMessageId, sideEffectKey },
    };
  };
}

export async function runAppointmentReminderBatch({
  runtime,
  calendarAdapter,
  messageAdapter,
  tenantId,
  automationInstanceId,
  asOf,
  config = {},
}) {
  const reminderOffsetsMinutes = config.reminderOffsetsMinutes ?? [1440, 120];
  const scanWindowMinutes = Number(config.scanWindowMinutes ?? 30);
  if (!Array.isArray(reminderOffsetsMinutes) || reminderOffsetsMinutes.length === 0) {
    throw new TypeError("reminderOffsetsMinutes must be a non-empty array");
  }
  if (!Number.isFinite(scanWindowMinutes) || scanWindowMinutes <= 0) {
    throw new TypeError("scanWindowMinutes must be > 0");
  }

  const maxOffset = Math.max(...reminderOffsetsMinutes);
  const from = parseIso(asOf, "asOf");
  const to = new Date(from.getTime() + (maxOffset + scanWindowMinutes) * MINUTE_MS);
  const events = await calendarAdapter.listUpcoming({
    tenantId,
    from: from.toISOString(),
    to: to.toISOString(),
  });
  const handler = buildAppointmentReminderHandler({ messageAdapter, config });
  const executions = [];
  let eligible = 0;

  for (const event of events) {
    const decision = evaluateAppointmentReminder(event, {
      asOf,
      reminderOffsetsMinutes,
      scanWindowMinutes,
    });
    if (!decision.eligible) continue;

    const attendees = Array.isArray(event.attendees) ? event.attendees : [];
    for (const attendee of attendees) {
      eligible += 1;
      const attendeeId = attendee?.id ?? attendee?.contact?.address ?? "unknown";
      const result = await runtime.execute({
        tenantId,
        automationInstanceId,
        workflowKey: "APPOINTMENT_REMINDER_AUTOMATION",
        idempotencyKey:
          `appointment-reminder:${event.id}:${attendeeId}:stage:${decision.stageMinutes}`,
        input: {
          event,
          attendee,
          stageMinutes: decision.stageMinutes,
          asOf,
        },
        handler,
      });
      executions.push({
        appointmentId: event.id,
        attendeeId,
        stageMinutes: decision.stageMinutes,
        ...result,
      });
    }
  }

  return { scannedEvents: events.length, eligible, executions };
}
