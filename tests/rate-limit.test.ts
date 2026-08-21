import { beforeEach, describe, expect, it } from "vitest";
import {
  clientKey,
  isRateLimitingEnabled,
  rateLimit,
  resetRateLimits,
} from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 3; i += 1) {
      expect(rateLimit("a", { limit: 3, windowMs: 1000 }, 0).ok).toBe(true);
    }
  });

  it("blocks the request after the limit", () => {
    for (let i = 0; i < 3; i += 1) rateLimit("a", { limit: 3, windowMs: 1000 }, 0);
    const blocked = rateLimit("a", { limit: 3, windowMs: 1000 }, 0);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("lets the window slide", () => {
    for (let i = 0; i < 3; i += 1) rateLimit("a", { limit: 3, windowMs: 1000 }, 0);
    expect(rateLimit("a", { limit: 3, windowMs: 1000 }, 1001).ok).toBe(true);
  });

  it("keeps buckets separate per key", () => {
    for (let i = 0; i < 3; i += 1) rateLimit("a", { limit: 3, windowMs: 1000 }, 0);
    expect(rateLimit("b", { limit: 3, windowMs: 1000 }, 0).ok).toBe(true);
  });

  it("reports remaining budget", () => {
    expect(rateLimit("a", { limit: 3, windowMs: 1000 }, 0).remaining).toBe(2);
  });
});

describe("clientKey", () => {
  it("uses the first address in x-forwarded-for", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.7, 70.41.3.18" },
    });
    expect(clientKey(request)).toEqual({ key: "203.0.113.7", identified: true });
  });

  it("falls back to x-real-ip", () => {
    const request = new Request("https://example.com", {
      headers: { "x-real-ip": "198.51.100.4" },
    });
    expect(clientKey(request)).toEqual({ key: "198.51.100.4", identified: true });
  });

  it("reports the caller as unidentified when no proxy header is present", () => {
    expect(clientKey(new Request("https://example.com"))).toEqual({
      key: "unidentified",
      identified: false,
    });
  });

  it("ignores an empty x-forwarded-for", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "  " },
    });
    expect(clientKey(request).identified).toBe(false);
  });
});

describe("isRateLimitingEnabled", () => {
  it("stays off outside production, so local rehearsals are never blocked", () => {
    expect(process.env.NODE_ENV).not.toBe("production");
    expect(isRateLimitingEnabled()).toBe(false);
  });
});
