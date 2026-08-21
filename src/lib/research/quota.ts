import "server-only";
import { env } from "@/lib/env";

/**
 * SerpApi's account endpoint is free and does not consume a search, so it is
 * safe to call before a demo to check there is quota left.
 */

export type SerpapiQuota = {
  plan: string;
  searchesLeft: number;
  searchesPerMonth: number;
  usedThisMonth: number;
  renewsOn: string;
  /** Full runs still possible at six searches each. */
  runsLeft: number;
};

const SEARCHES_PER_RUN = 6;

export async function fetchSerpapiQuota(): Promise<SerpapiQuota | { error: string }> {
  if (!env.serpapiApiKey) return { error: "SERPAPI_API_KEY is not set" };

  try {
    const url = new URL("https://serpapi.com/account.json");
    url.searchParams.set("api_key", env.serpapiApiKey);
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!response.ok) return { error: `SerpApi returned ${response.status}` };

    const payload = (await response.json()) as {
      plan_name?: string;
      total_searches_left?: number;
      searches_per_month?: number;
      this_month_usage?: number;
      plan_renewal_date?: string;
    };

    const searchesLeft = payload.total_searches_left ?? 0;
    return {
      plan: payload.plan_name ?? "unknown",
      searchesLeft,
      searchesPerMonth: payload.searches_per_month ?? 0,
      usedThisMonth: payload.this_month_usage ?? 0,
      renewsOn: payload.plan_renewal_date ?? "unknown",
      runsLeft: Math.floor(searchesLeft / SEARCHES_PER_RUN),
    };
  } catch (error) {
    console.error("[serpapi] quota check failed", error);
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
}
