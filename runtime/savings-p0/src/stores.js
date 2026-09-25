function sequentialIdFactory(prefix = "id") {
  let n = 0;
  return () => `${prefix}-${String(++n).padStart(4, "0")}`;
}

export class MemoryIdempotencyStore {
  constructor() {
    this.entries = new Map();
  }

  claim(key) {
    const existing = this.entries.get(key);
    if (existing) return { claimed: false, existing };
    const entry = { state: "in_progress", claimedAt: new Date().toISOString() };
    this.entries.set(key, entry);
    return { claimed: true, entry };
  }

  complete(key, result) {
    this.entries.set(key, { state: "completed", result });
  }

  release(key) {
    this.entries.delete(key);
  }

  get(key) {
    return this.entries.get(key);
  }
}

export class MemoryControlPlane {
  constructor({ idFactory = sequentialIdFactory("mem") } = {}) {
    this.idFactory = idFactory;
    this.executionRuns = [];
    this.executionEvents = [];
    this.processRecords = [];
    this.savingsEvents = [];
    this.incidents = [];
  }

  createRun({ tenantId, automationInstanceId, workflowKey, engine = "zero-deps-node-v1", traceId, startedAt }) {
    const run = {
      id: this.idFactory(),
      tenantId,
      automationInstanceId,
      workflowKey,
      engine,
      engineExecutionId: traceId,
      status: "running",
      traceId,
      startedAt,
    };
    this.executionRuns.push(run);
    return run;
  }

  finishRun(runId, { status, finishedAt }) {
    const run = this.executionRuns.find((item) => item.id === runId);
    if (!run) throw new Error(`Unknown run: ${runId}`);
    run.status = status;
    run.finishedAt = finishedAt;
    return run;
  }

  emitExecutionEvent(event) {
    this.executionEvents.push({ id: this.idFactory(), ...event });
  }

  upsertProcessRecord(record) {
    const idx = this.processRecords.findIndex((item) =>
      item.tenantId === record.tenantId &&
      item.automationInstanceId === record.automationInstanceId &&
      item.entityType === record.entityType &&
      item.entityId === record.entityId
    );
    const value = { id: idx >= 0 ? this.processRecords[idx].id : this.idFactory(), ...record };
    if (idx >= 0) this.processRecords[idx] = value;
    else this.processRecords.push(value);
    return value;
  }

  emitSavingsEvent(event) {
    const value = { id: this.idFactory(), ...event };
    this.savingsEvents.push(value);
    return value;
  }

  createIncident(incident) {
    const value = { id: this.idFactory(), status: "open", ...incident };
    this.incidents.push(value);
    return value;
  }

  snapshot() {
    return JSON.parse(JSON.stringify({
      executionRuns: this.executionRuns,
      executionEvents: this.executionEvents,
      processRecords: this.processRecords,
      savingsEvents: this.savingsEvents,
      incidents: this.incidents,
    }));
  }
}

export { sequentialIdFactory };
