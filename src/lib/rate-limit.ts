import "server-only";

/**
 * Sliding-window limiter that protects the sponsor API keys from a single
 * visitor burning the quota. In-memory by design — one process, no infra.
 * Swap the Map for Redis when this runs on more than one instance.
 */

type Window = { hits: number[] };

const WINDOWS = new Map<string, Window>();
const MAX_KEYS = 5_000;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
  now = Date.now(),
): RateLimitResult {
  // Cheap guard against unbounded growth from spoofed headers.
  if (WINDOWS.size > MAX_KEYS) WINDOWS.clear();

  const window = WINDOWS.get(key) ?? { hits: [] };
  const cutoff = now - windowMs;
  const hits = window.hits.filter((stamp) => stamp > cutoff);

  if (hits.length >= limit) {
    WINDOWS.set(key, { hits });
    const oldest = hits[0];
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  hits.push(now);
  WINDOWS.set(key, { hits });
  return { ok: true, remaining: limit - hits.length, retryAfterSeconds: 0 };
}

/**
 * Limiting exists to stop one visitor on a deployed instance burning the
 * sponsor quota. Local development is single-user by definition, and a limiter
 * that blocks a demo rehearsal is far worse than no limiter at all.
 */
export function isRateLimitingEnabled(): boolean {
  return process.env.NODE_ENV === "production";
}

export type ClientIdentity = {
  key: string;
  /** False when no proxy header identified the caller. */
  identified: boolean;
};

export function clientKey(request: Request): ClientIdentity {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return { key: first, identified: true };
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return { key: realIp, identified: true };
  return { key: "unidentified", identified: false };
}

/** Exposed for tests. */
export function resetRateLimits() {
  WINDOWS.clear();
}
