const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry(fn, {
  maxAttempts = 3,
  baseDelayMs = 25,
  maxDelayMs = 1000,
  sleep = defaultSleep,
  onAttempt = () => {},
} = {}) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new TypeError("maxAttempts must be an integer >= 1");
  }

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      onAttempt({ attempt, maxAttempts });
      return await fn({ attempt, maxAttempts });
    } catch (error) {
      lastError = error;
      const retryable = error?.retryable === true;
      if (!retryable || attempt === maxAttempts) throw error;
      const delayMs = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      await sleep(delayMs);
    }
  }
  throw lastError;
}
