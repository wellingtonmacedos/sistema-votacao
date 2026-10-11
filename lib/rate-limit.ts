interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number | null;
}

export function rateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, retryAfter: null };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  store.set(key, entry);
  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - entry.count,
    retryAfter: null,
  };
}

export function resetRateLimit(key: string): void {
  store.delete(key);
}

export function buildRateLimitKey(identifier: string, ip?: string): string {
  return `${identifier}:${ip || "unknown"}`;
}
