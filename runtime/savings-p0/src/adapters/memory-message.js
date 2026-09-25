import { PermanentError, RetryableError } from "../errors.js";

export class MemoryMessageAdapter {
  constructor({ costPerMessagePen = 0, transientFailures = {}, permanentFailures = [] } = {}) {
    this.costPerMessagePen = Number(costPerMessagePen);
    this.transientFailures = new Map(Object.entries(transientFailures));
    this.permanentFailures = new Set(permanentFailures);
    this.sent = [];
    this.byIdempotencyKey = new Map();
    this.attempts = new Map();
  }

  async send(message) {
    const { tenantId, to, channel, templateKey, variables = {}, idempotencyKey } = message;
    for (const [name, value] of Object.entries({ tenantId, to, channel, templateKey, idempotencyKey })) {
      if (typeof value !== "string" || value.trim() === "") {
        throw new PermanentError(`${name} is required`, { code: "MESSAGE_INVALID" });
      }
    }
    if (this.byIdempotencyKey.has(idempotencyKey)) {
      return { ...this.byIdempotencyKey.get(idempotencyKey), duplicate: true, variableCostPen: 0 };
    }

    const attempts = (this.attempts.get(idempotencyKey) ?? 0) + 1;
    this.attempts.set(idempotencyKey, attempts);

    if (this.permanentFailures.has(idempotencyKey)) {
      throw new PermanentError("Simulated permanent messaging failure", {
        code: "MESSAGE_PERMISSION_DENIED",
        customerSafeMessage: "The configured messaging channel needs attention.",
      });
    }

    const failuresLeft = Number(this.transientFailures.get(idempotencyKey) ?? 0);
    if (failuresLeft > 0) {
      this.transientFailures.set(idempotencyKey, failuresLeft - 1);
      throw new RetryableError("Simulated transient messaging failure", {
        code: "MESSAGE_PROVIDER_503",
        customerSafeMessage: "The messaging provider is temporarily unavailable.",
      });
    }

    const value = {
      providerMessageId: `memory-message-${this.sent.length + 1}`,
      tenantId,
      to,
      channel,
      templateKey,
      variables,
      idempotencyKey,
      duplicate: false,
      variableCostPen: this.costPerMessagePen,
    };
    this.sent.push(value);
    this.byIdempotencyKey.set(idempotencyKey, value);
    return value;
  }
}
