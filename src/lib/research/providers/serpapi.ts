import "server-only";
import { env } from "@/lib/env";
import { hostnameOf } from "@/lib/utils";
import type { ResearchResult } from "@/lib/analysis/schemas";
import { SearchError, type SearchProvider, type SearchQuery } from "./types";

const TIMEOUT_MS = 15_000;
/**
 * One credit is charged per search regardless of `num`. Twelve is the point
 * where more results stop improving the deduplicated set and only cost latency.
 */
const RESULTS_PER_QUERY = 12;

type SerpResponse = {
  organic_results?: Array<{
    title?: string;
    link?: string;
    snippet?: string;
    source?: string;
  }>;
  discussions_and_forums?: Array<{ title?: string; link?: string; snippet?: string }>;
  error?: string;
};

export function createSerpapiProvider(): SearchProvider {
  return {
    id: "serpapi",
    label: "SerpApi (Google)",
    configured: Boolean(env.serpapiApiKey),
    free: false,

    async search(planned: SearchQuery): Promise<ResearchResult[]> {
      const url = new URL("https://serpapi.com/search.json");
      url.searchParams.set("engine", "google");
      url.searchParams.set("q", planned.query);
      url.searchParams.set("num", String(RESULTS_PER_QUERY));
      url.searchParams.set("hl", "en");
      url.searchParams.set("gl", "us");
      url.searchParams.set("api_key", env.serpapiApiKey as string);

      const response = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });

      if (!response.ok) {
        const body = (await response.text().catch(() => "")).slice(0, 200);
        // 401/429 on this API mean the monthly allowance is gone.
        const exhausted =
          response.status === 401 ||
          response.status === 429 ||
          /run out|exceeded|quota/i.test(body);
        throw new SearchError(
          "serpapi",
          `SerpApi returned ${response.status}`,
          exhausted,
        );
      }

      const payload = (await response.json()) as SerpResponse;
      if (payload.error) {
        throw new SearchError(
          "serpapi",
          payload.error,
          /run out|exceeded|quota|plan/i.test(payload.error),
        );
      }

      const entries = [
        ...(payload.organic_results ?? []),
        ...(payload.discussions_and_forums ?? []).map((entry) => ({ ...entry, source: undefined })),
      ];

      return entries.flatMap((entry) => {
        if (!entry.title || !entry.link) return [];
        return [
          {
            title: entry.title.trim(),
            url: entry.link,
            snippet: (entry.snippet ?? "").trim(),
            source: entry.source?.trim() || hostnameOf(entry.link),
            category: planned.category,
            query: planned.query,
          },
        ];
      });
    },
  };
}
