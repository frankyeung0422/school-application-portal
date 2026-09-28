export function randomDelay(minMs = 2000, maxMs = 6000): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((r) => setTimeout(r, ms));
}

export async function withTimeout<T>(
  work: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Retry with exponential backoff. `shouldRetry` lets callers skip retrying
 * unrecoverable failures (login walls, captchas).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: {
    attempts?: number;
    baseDelayMs?: number;
    shouldRetry?: (e: unknown) => boolean;
  } = {},
): Promise<T> {
  const attempts = opts.attempts ?? 2;
  const base = opts.baseDelayMs ?? 30000;
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (opts.shouldRetry && !opts.shouldRetry(e)) throw e;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, base * Math.pow(4, i)));
      }
    }
  }
  throw lastError;
}
