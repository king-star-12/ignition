import "server-only";
import { env } from "@/lib/env";
import { hostnameOf } from "@/lib/utils";
import type { ResearchResult } from "@/lib/analysis/schemas";
import { SearchError, type SearchProvider, type SearchQuery } from "./types";

const TIMEOUT_MS = 15_000;

/**
 * Brave's free tier allows far more monthly queries than SerpApi's, so it is
 * the natural second choice once the sponsor allowance is spent.
 * https://brave.com/search/api/
 */
export function createBraveProvider(): SearchProvider {
  return {
    id: "brave",
    label: "Brave Search",
    configured: Boolean(env.braveApiKey),
    free: false,

    async search(planned: SearchQuery): Promise<ResearchResult[]> {
      const url = new URL("https://api.search.brave.com/res/v1/web/search");
      url.searchParams.set("q", planned.query);
      url.searchParams.set("count", "20");
      url.searchParams.set("country", "us");

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": env.braveApiKey as string,
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new SearchError(
          "brave",
          `Brave returned ${response.status}`,
          response.status === 429 || response.status === 401,
        );
      }

      const payload = (await response.json()) as {
        web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
      };

      return (payload.web?.results ?? []).flatMap((entry) => {
        if (!entry.title || !entry.url) return [];
        return [
          {
            title: stripTags(entry.title),
            url: entry.url,
            snippet: stripTags(entry.description ?? ""),
            source: hostnameOf(entry.url),
            category: planned.category,
            query: planned.query,
          },
        ];
      });
    },
  };
}

/** Brave marks query terms with <strong> inside titles and descriptions. */
function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}
