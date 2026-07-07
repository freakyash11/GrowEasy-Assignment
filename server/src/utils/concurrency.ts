/**
 * Lightweight concurrency limiter — equivalent to p-limit but CommonJS-safe.
 *
 * @param maxConcurrent - Maximum number of promises running at the same time.
 * @returns A `limit` function that wraps any async task and queues it when
 *          the concurrency cap is reached.
 *
 * @example
 * const limit = createConcurrencyLimiter(3);
 * const results = await Promise.all(tasks.map((t) => limit(() => runTask(t))));
 */
export function createConcurrencyLimiter(maxConcurrent: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    // If at capacity, wait until a slot opens
    if (active >= maxConcurrent) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }

    active++;
    try {
      return await fn();
    } finally {
      active--;
      // Unblock the next queued task, if any
      const next = queue.shift();
      if (next) next();
    }
  };
}

/**
 * Retries an async operation with exponential backoff.
 *
 * @param fn          - The async operation to run.
 * @param maxRetries  - Total additional attempts after the first failure (default: 2).
 * @param baseDelayMs - Delay in ms before the first retry; doubles each time (default: 1000).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(
          `[AI] Batch attempt ${attempt + 1} failed — retrying in ${delay}ms. Error: ${lastError.message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
