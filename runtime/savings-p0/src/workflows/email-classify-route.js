import { PermanentError } from "../errors.js";

function normalizedText(email) {
  return `${email.subject ?? ""}\n${email.body ?? ""}`.toLowerCase();
}

function emailDomain(address) {
  const value = String(address ?? "").toLowerCase();
  const at = value.lastIndexOf("@");
  return at >= 0 ? value.slice(at + 1) : "";
}

export function classifyEmail(email, { rules = [], defaultQueue = "general" } = {}) {
  if (!email?.id) throw new PermanentError("email.id is required", { code: "EMAIL_CLASSIFY_INVALID_EMAIL" });
  const text = normalizedText(email);
  const fromDomain = emailDomain(email.from?.address ?? email.from);

  for (const rule of rules) {
    const keywords = Array.isArray(rule.keywords) ? rule.keywords.map((x)=>String(x).toLowerCase()) : [];
    const domains = Array.isArray(rule.fromDomains) ? rule.fromDomains.map((x)=>String(x).toLowerCase()) : [];
    const keywordMatch = keywords.length === 0 || keywords.some((keyword)=>text.includes(keyword));
    const domainMatch = domains.length === 0 || domains.includes(fromDomain);
    if (keywordMatch && domainMatch) {
      return {
        category: String(rule.category ?? "general"),
        queue: String(rule.queue ?? defaultQueue),
        ruleKey: String(rule.key ?? rule.category ?? "rule"),
      };
    }
  }

  return { category: "general", queue: defaultQueue, ruleKey: "default" };
}

export async function classifyAndRouteEmail({
  runtime,
  routeStore,
  tenantId,
  automationInstanceId,
  email,
  config = {},
}) {
  if (!routeStore?.upsert) throw new TypeError("routeStore.upsert is required");
  const classification = classifyEmail(email, config);

  return runtime.execute({
    tenantId,
    automationInstanceId,
    workflowKey: "EMAIL_CLASSIFY_ROUTE_AUTOMATION",
    idempotencyKey: `email-classify:${email.id}`,
    input: { email, classification },
    handler: async (ctx, input) => {
      await routeStore.upsert({
        tenantId: ctx.tenantId,
        key: input.email.id,
        row: {
          id: input.email.id,
          tenantId: ctx.tenantId,
          category: input.classification.category,
          queue: input.classification.queue,
          ruleKey: input.classification.ruleKey,
          from: input.email.from ?? null,
          subject: input.email.subject ?? null,
          classifiedAt: ctx.now.toISOString(),
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
          entityType: "email",
          entityId: input.email.id,
          source: { system: input.email.sourceSystem ?? "email", externalId: input.email.externalId ?? input.email.id },
          status: "classified_routed",
          occurredAt: ctx.now.toISOString(),
          updatedAt: ctx.now.toISOString(),
          summary: { subject: input.email.subject, category: input.classification.category, queue: input.classification.queue },
          attributes: { ruleKey: input.classification.ruleKey },
          requiresAttention: false,
        },
        output: input.classification,
      };
    },
  });
}
