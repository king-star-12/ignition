import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, isRateLimitingEnabled, rateLimit } from "@/lib/rate-limit";

export type ApiError = { error: string; detail?: string };

/**
 * Caps how often one visitor can spend sponsor API quota.
 * Returns a 429 response when the caller is over the limit, otherwise null.
 */
export function enforceRateLimit(
  request: Request,
  { limit, windowMs }: { limit: number; windowMs: number },
): NextResponse | null {
  if (!isRateLimitingEnabled()) return null;

  const { key, identified } = clientKey(request);
  // If no proxy header identifies the caller, every visitor would otherwise
  // share one bucket. Loosen the ceiling rather than lock the whole site out
  // because of a missing header.
  const effectiveLimit = identified ? limit : limit * 20;

  const result = rateLimit(key, { limit: effectiveLimit, windowMs });
  if (result.ok) return null;

  return NextResponse.json<ApiError>(
    {
      error: "You have run a lot of validations in a short time.",
      detail: `Try again in about ${result.retryAfterSeconds} seconds.`,
    },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  );
}

export function badRequest(message: string, detail?: string) {
  return NextResponse.json<ApiError>({ error: message, detail }, { status: 400 });
}

export function serverError(message: string, detail?: string) {
  return NextResponse.json<ApiError>({ error: message, detail }, { status: 500 });
}

/** Parse and validate a JSON request body, returning a typed result. */
export async function readBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: badRequest("Request body must be valid JSON.") };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    return { ok: false, response: badRequest("Invalid request body.", detail) };
  }
  return { ok: true, data: parsed.data };
}
