import { PermanentError } from "../errors.js";

function cleanText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeEmail(value) {
  const email = cleanText(value).toLowerCase();
  return email || null;
}

function normalizePhone(value) {
  const phone = cleanText(value).replace(/[^+\d]/g, "");
  return phone || null;
}

export function normalizeInboundLead(inbound) {
  if (!inbound?.sourceId) {
    throw new PermanentError("inbound.sourceId is required", { code: "LEAD_INTAKE_INVALID_SOURCE" });
  }
  const name = cleanText(inbound.name);
  const email = normalizeEmail(inbound.email ?? inbound.contact?.email);
  const phone = normalizePhone(inbound.phone ?? inbound.contact?.phone);
  if (!name && !email && !phone) {
    throw new PermanentError("lead requires name, email or phone", {
      code: "LEAD_INTAKE_MISSING_IDENTITY",
      customerSafeMessage: "The inbound lead does not contain enough contact information.",
    });
  }
  return {
    id: `lead:${String(inbound.sourceSystem ?? "source")}:${inbound.sourceId}`,
    sourceSystem: String(inbound.sourceSystem ?? "source"),
    externalId: String(inbound.sourceId),
    name: name || null,
    company: cleanText(inbound.company) || null,
    email,
    phone,
    source: cleanText(inbound.source) || String(inbound.sourceSystem ?? "unknown"),
    status: cleanText(inbound.status) || "new",
    receivedAt: inbound.receivedAt ?? null,
    raw: structuredClone(inbound.raw ?? {}),
  };
}

export async function ingestLead({
  runtime,
  leadSource,
  tenantId,
  automationInstanceId,
  inbound,
}) {
  if (!leadSource?.upsert) throw new TypeError("leadSource.upsert is required");
  const normalized = normalizeInboundLead(inbound);

  return runtime.execute({
    tenantId,
    automationInstanceId,
    workflowKey: "LEAD_INTAKE_AUTOMATION",
    idempotencyKey: `lead-intake:${normalized.sourceSystem}:${normalized.externalId}`,
    input: { normalized },
    handler: async (ctx, { normalized: lead }) => {
      await leadSource.upsert({
        tenantId: ctx.tenantId,
        key: lead.id,
        row: {
          ...lead,
          tenantId: ctx.tenantId,
          createdAt: lead.receivedAt ?? ctx.now.toISOString(),
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
          entityType: "lead",
          entityId: lead.id,
          source: { system: lead.sourceSystem, externalId: lead.externalId },
          status: "registered",
          occurredAt: ctx.now.toISOString(),
          updatedAt: ctx.now.toISOString(),
          summary: { name: lead.name, company: lead.company, source: lead.source },
          attributes: { email: lead.email, phone: lead.phone },
          requiresAttention: false,
        },
        output: { leadId: lead.id },
      };
    },
  });
}
