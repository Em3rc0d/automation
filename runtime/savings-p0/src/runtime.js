import { randomUUID } from "node:crypto";
import { withRetry } from "./retry.js";

function assertNonEmptyString(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
}

function normalizeMetrics(metrics = {}) {
  const normalized = {
    eligibleUnits: Number(metrics.eligibleUnits ?? 0),
    automatedUnits: Number(metrics.automatedUnits ?? 0),
    exceptionMinutes: Number(metrics.exceptionMinutes ?? 0),
    oversightMinutes: Number(metrics.oversightMinutes ?? 0),
    variableCost: Number(metrics.variableCost ?? 0),
  };
  for (const [key, value] of Object.entries(normalized)) {
    if (!Number.isFinite(value) || value < 0) throw new TypeError(`Invalid metric ${key}`);
  }
  return normalized;
}

function shouldEmitSavings(metrics) {
  return Object.values(metrics).some((value) => value > 0);
}

export class SavingsRuntime {
  constructor({ controlPlane, idempotencyStore, clock = () => new Date(), retryPolicy = {} }) {
    if (!controlPlane) throw new TypeError("controlPlane is required");
    if (!idempotencyStore) throw new TypeError("idempotencyStore is required");
    this.controlPlane = controlPlane;
    this.idempotencyStore = idempotencyStore;
    this.clock = clock;
    this.retryPolicy = { maxAttempts: 3, baseDelayMs: 0, sleep: async () => {}, ...retryPolicy };
  }

  async execute({ tenantId, automationInstanceId, workflowKey, idempotencyKey, input, handler }) {
    for (const [name, value] of Object.entries({ tenantId, automationInstanceId, workflowKey, idempotencyKey })) {
      assertNonEmptyString(value, name);
    }
    if (typeof handler !== "function") throw new TypeError("handler must be a function");

    const storeKey = `${tenantId}:${automationInstanceId}:${idempotencyKey}`;
    const claim = this.idempotencyStore.claim(storeKey);
    if (!claim.claimed) {
      return { status: "skipped_duplicate", duplicate: true, previous: claim.existing?.result ?? null };
    }

    const traceId = randomUUID();
    const startedAt = this.clock().toISOString();
    const run = this.controlPlane.createRun({ tenantId, automationInstanceId, workflowKey, traceId, startedAt });
    this.controlPlane.emitExecutionEvent({
      schemaVersion: 1,
      idempotencyKey: `${idempotencyKey}:started`,
      tenantId,
      automationInstanceId,
      executionRunId: run.id,
      eventType: "execution.started",
      occurredAt: startedAt,
      engine: { name: "worker", executionId: traceId },
      metrics: { eligibleUnits: 0, automatedUnits: 0, exceptionMinutes: 0, oversightMinutes: 0, variableCostPen: 0 },
      traceId,
    });

    try {
      const result = await withRetry(
        ({ attempt, maxAttempts }) => handler({
          tenantId,
          automationInstanceId,
          workflowKey,
          traceId,
          executionRunId: run.id,
          attempt,
          maxAttempts,
          now: this.clock(),
        }, input),
        this.retryPolicy,
      );
      if (!result || typeof result !== "object") throw new TypeError("handler must return an object");
      const metrics = normalizeMetrics(result.metrics);

      let processRecord = null;
      if (result.processRecord) {
        processRecord = this.controlPlane.upsertProcessRecord({
          ...result.processRecord,
          tenantId,
          automationInstanceId,
        });
      }

      const finishedAt = this.clock().toISOString();
      let savingsEvent = null;
      if (shouldEmitSavings(metrics)) {
        savingsEvent = this.controlPlane.emitSavingsEvent({
          tenantId,
          automationInstanceId,
          executionRunId: run.id,
          occurredAt: finishedAt,
          ...metrics,
        });
      }

      this.controlPlane.finishRun(run.id, { status: "succeeded", finishedAt });
      this.controlPlane.emitExecutionEvent({
        schemaVersion: 1,
        idempotencyKey: `${idempotencyKey}:completed`,
        tenantId,
        automationInstanceId,
        executionRunId: run.id,
        eventType: "execution.completed",
        occurredAt: finishedAt,
        engine: { name: "worker", executionId: traceId },
        metrics: { ...metrics, variableCostPen: metrics.variableCost },
        traceId,
      });

      const finalResult = {
        status: result.status ?? "completed",
        duplicate: false,
        runId: run.id,
        traceId,
        metrics,
        processRecord,
        savingsEvent,
        output: result.output ?? null,
      };
      this.idempotencyStore.complete(storeKey, finalResult);
      return finalResult;
    } catch (error) {
      const finishedAt = this.clock().toISOString();
      this.controlPlane.finishRun(run.id, { status: "failed", finishedAt });
      this.controlPlane.emitExecutionEvent({
        schemaVersion: 1,
        idempotencyKey: `${idempotencyKey}:failed`,
        tenantId,
        automationInstanceId,
        executionRunId: run.id,
        eventType: "execution.failed",
        occurredAt: finishedAt,
        engine: { name: "worker", executionId: traceId },
        metrics: { eligibleUnits: 0, automatedUnits: 0, exceptionMinutes: 0, oversightMinutes: 0, variableCostPen: 0 },
        traceId,
      });
      const incident = this.controlPlane.createIncident({
        tenantId,
        automationInstanceId,
        executionRunId: run.id,
        severity: "error",
        code: error?.code ?? "WORKFLOW_EXECUTION_FAILED",
        customerSafeMessage: error?.customerSafeMessage ?? "Automation could not complete the operation.",
        technicalDetailsRef: `trace:${traceId}`,
        traceId,
        openedAt: finishedAt,
      });
      this.idempotencyStore.release(storeKey);
      return {
        status: "failed",
        duplicate: false,
        runId: run.id,
        traceId,
        incident,
        error: { code: error?.code ?? "WORKFLOW_EXECUTION_FAILED", message: error?.message ?? String(error) },
      };
    }
  }
}
