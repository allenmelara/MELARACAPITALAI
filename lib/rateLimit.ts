// In-memory sliding-window rate limiter. Per-instance only — state is not
// shared across server instances or restarts. Swap for Upstash/Redis before
// running this behind more than one instance.

const hits = new Map<string, number[]>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  const existing = (hits.get(key) ?? []).filter((ts) => ts > windowStart);

  if (existing.length >= limit) {
    hits.set(key, existing);
    return false;
  }

  existing.push(now);
  hits.set(key, existing);
  return true;
}
