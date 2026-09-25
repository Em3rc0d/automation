import { PermanentError, RetryableError } from "../errors.js";

export class MemoryStorageAdapter {
  constructor({ transientFailures = {}, permanentFailures = [] } = {}) {
    this.transientFailures = new Map(Object.entries(transientFailures));
    this.permanentFailures = new Set(permanentFailures);
    this.objects = new Map();
    this.byIdempotencyKey = new Map();
    this.attempts = new Map();
  }

  async put({ tenantId, path, content = null, metadata = {}, idempotencyKey }) {
    for (const [name, value] of Object.entries({ tenantId, path, idempotencyKey })) {
      if (typeof value !== "string" || value.trim() === "") {
        throw new PermanentError(`${name} is required`, { code: "STORAGE_INVALID" });
      }
    }

    if (this.byIdempotencyKey.has(idempotencyKey)) {
      return { ...this.byIdempotencyKey.get(idempotencyKey), duplicate: true, variableCostPen: 0 };
    }

    const attempts = (this.attempts.get(idempotencyKey) ?? 0) + 1;
    this.attempts.set(idempotencyKey, attempts);

    if (this.permanentFailures.has(idempotencyKey)) {
      throw new PermanentError("Simulated permanent storage failure", {
        code: "STORAGE_PERMISSION_DENIED",
        customerSafeMessage: "The configured storage destination needs attention.",
      });
    }

    const failuresLeft = Number(this.transientFailures.get(idempotencyKey) ?? 0);
    if (failuresLeft > 0) {
      this.transientFailures.set(idempotencyKey, failuresLeft - 1);
      throw new RetryableError("Simulated transient storage failure", {
        code: "STORAGE_PROVIDER_503",
        customerSafeMessage: "The storage provider is temporarily unavailable.",
      });
    }

    const storageKey = `${tenantId}:${path}`;
    const value = {
      tenantId,
      path,
      content,
      metadata: structuredClone(metadata),
      idempotencyKey,
      duplicate: false,
      variableCostPen: 0,
    };
    this.objects.set(storageKey, value);
    this.byIdempotencyKey.set(idempotencyKey, value);
    return structuredClone(value);
  }

  async get({ tenantId, path }) {
    const value = this.objects.get(`${tenantId}:${path}`);
    return value ? structuredClone(value) : null;
  }

  async list({ tenantId, prefix = "" }) {
    return [...this.objects.values()]
      .filter((item) => item.tenantId === tenantId && item.path.startsWith(prefix))
      .map((item) => structuredClone(item));
  }
}
