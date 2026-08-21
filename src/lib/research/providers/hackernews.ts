import "server-only";
import { hostnameOf } from "@/lib/utils";
import type { ResearchResult } from "@/lib/analysis/schemas";
import { SearchError, type SearchProvider, type SearchQuery } from "./types";

const TIMEOUT_MS = 12_000;

/**
 * Hacker News via Algolia: no key, no quota, no signup. It skews technical, so
 * it is a safety net rather than a replacement — but "Show HN" posts are an
 * unusually honest source of competing products, and Ask HN threads are real
 * customer complaints written by people with no incentive to be polite.
 */
export function createHackerNewsProvider(): SearchProvider {
  return {
    id: "hackernews",
    label: "Hacker News (Algolia)",
    configured: true,
    free: true,

    async search(planned: SearchQuery): Promise<ResearchResult[]> {
      const url = new URL("https://hn.algolia.com/api/v1/search");
      url.searchParams.set("query", planned.query);
      url.searchParams.set("tags", "story");
      url.searchParams.set("hitsPerPage", "12");

      let response: Response;
      try {
        response = await fetch(url, {
          signal: AbortSignal.timeout(TIMEOUT_MS),
          cache: "no-store",
        });
      } catch (error) {
        throw new SearchError("hackernews", `Hacker News search failed: ${error}`);
      }

      if (!response.ok) {
        throw new SearchError("hackernews", `Hacker News returned ${response.status}`);
      }

      const payload = (await response.json()) as {
        hits?: Array<{
          objectID?: string;
          title?: string;
          url?: string | null;
          points?: number;
          num_comments?: number;
          story_text?: string | null;
        }>;
      };

      return (payload.hits ?? []).flatMap((hit) => {
        if (!hit.title || !hit.objectID) return [];
        // Text posts have no external URL — link the discussion instead.
        const url = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
        const engagement = [
          hit.points ? `${hit.points} points` : null,
          hit.num_comments ? `${hit.num_comments} comments` : null,
        ]
          .filter(Boolean)
          .join(", ");

        return [
          {
            title: hit.title.trim(),
            url,
            snippet: (hit.story_text ?? "").replace(/<[^>]*>/g, "").trim().slice(0, 240) ||
              (engagement ? `Hacker News discussion — ${engagement}.` : ""),
            source: hit.url ? hostnameOf(hit.url) : "news.ycombinator.com",
            category: planned.category,
            query: planned.query,
          },
        ];
      });
    },
  };
}
