import { PermanentError } from "../errors.js";

export function evaluateLowStock(item) {
  if (!item?.id) throw new PermanentError("inventory item id is required", { code: "LOW_STOCK_INVALID_ITEM" });
  if (item.active === false) return { eligible: false, reason: "inactive" };
  const onHand = Number(item.onHand);
  const reorderPoint = Number(item.reorderPoint);
  if (!Number.isFinite(onHand) || !Number.isFinite(reorderPoint)) {
    throw new PermanentError("onHand and reorderPoint must be numeric", { code: "LOW_STOCK_INVALID_ITEM" });
  }
  return onHand <= reorderPoint
    ? { eligible: true, reason: "below_threshold", onHand, reorderPoint }
    : { eligible: false, reason: "sufficient_stock", onHand, reorderPoint };
}

export async function runLowStockAlert({
  runtime,
  inventorySource,
  messageAdapter,
  tenantId,
  automationInstanceId,
  config = {},
}) {
  const items = await inventorySource.list({ tenantId });
  const executions = [];
  let eligible = 0;

  for (const item of items) {
    const decision = evaluateLowStock(item);
    if (!decision.eligible) continue;
    eligible += 1;

    const thresholdFingerprint = `${decision.onHand}:${decision.reorderPoint}`;
    const result = await runtime.execute({
      tenantId,
      automationInstanceId,
      workflowKey: "LOW_STOCK_ALERT_AUTOMATION",
      idempotencyKey: `low-stock:${item.id}:${thresholdFingerprint}`,
      input: { item, decision },
      handler: async (ctx, input) => {
        const contact = input.item.alertContact ?? config.alertContact;
        if (!contact?.address) {
          return {
            status: "attention_required",
            metrics: {
              eligibleUnits: 1,
              automatedUnits: 0,
              exceptionMinutes: Number(config.missingContactExceptionMinutes ?? 2),
              oversightMinutes: 0,
              variableCost: 0,
            },
            processRecord: {
              entityType: "inventory_item",
              entityId: input.item.id,
              source: { system: input.item.sourceSystem ?? "inventory", externalId: input.item.externalId ?? input.item.id },
              status: "low_stock_missing_contact",
              occurredAt: ctx.now.toISOString(),
              updatedAt: ctx.now.toISOString(),
              summary: { sku: input.item.sku, onHand: input.decision.onHand, reorderPoint: input.decision.reorderPoint },
              attributes: {},
              requiresAttention: true,
            },
          };
        }

        const sent = await messageAdapter.send({
          tenantId: ctx.tenantId,
          to: contact.address,
          channel: contact.channel ?? config.defaultChannel ?? "email",
          templateKey: config.templateKey ?? "low-stock-alert-v1",
          variables: {
            sku: input.item.sku ?? input.item.id,
            name: input.item.name ?? null,
            onHand: input.decision.onHand,
            reorderPoint: input.decision.reorderPoint,
          },
          idempotencyKey: `${ctx.tenantId}:low-stock:${input.item.id}:${thresholdFingerprint}`,
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
            entityType: "inventory_item",
            entityId: input.item.id,
            source: { system: input.item.sourceSystem ?? "inventory", externalId: input.item.externalId ?? input.item.id },
            status: "low_stock_alerted",
            occurredAt: ctx.now.toISOString(),
            updatedAt: ctx.now.toISOString(),
            summary: { sku: input.item.sku, onHand: input.decision.onHand, reorderPoint: input.decision.reorderPoint },
            attributes: { providerMessageId: sent.providerMessageId },
            requiresAttention: false,
          },
          output: { providerMessageId: sent.providerMessageId },
        };
      },
    });
    executions.push({ itemId: item.id, ...result });
  }

  return { scannedItems: items.length, eligible, executions };
}
