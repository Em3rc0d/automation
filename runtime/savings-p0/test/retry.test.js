import test from "node:test";
import assert from "node:assert/strict";
import { withRetry } from "../src/retry.js";
import { PermanentError, RetryableError } from "../src/errors.js";

test("withRetry retries retryable failures and stops on success", async () => {
  let attempts = 0;
  const value = await withRetry(async () => {
    attempts += 1;
    if (attempts < 3) throw new RetryableError("temporary");
    return "ok";
  }, { maxAttempts: 3, sleep: async () => {} });
  assert.equal(value, "ok");
  assert.equal(attempts, 3);
});

test("withRetry does not retry permanent errors", async () => {
  let attempts = 0;
  await assert.rejects(() => withRetry(async () => {
    attempts += 1;
    throw new PermanentError("bad input");
  }, { maxAttempts: 5, sleep: async () => {} }));
  assert.equal(attempts, 1);
});
