import type { ResearchCategory, ResearchResult } from "@/lib/analysis/schemas";

export type SearchQuery = {
  query: string;
  category: ResearchCategory;
};

export type SearchProviderId = "serpapi" | "brave" | "hackernews";

export interface SearchProvider {
  readonly id: SearchProviderId;
  readonly label: string;
  /** False when the provider needs a key that is not configured. */
  readonly configured: boolean;
  /** True when the provider costs nothing per query. */
  readonly free: boolean;
  search(query: SearchQuery): Promise<ResearchResult[]>;
}

export class SearchError extends Error {
  readonly provider: SearchProviderId;
  readonly exhausted: boolean;

  constructor(provider: SearchProviderId, message: string, exhausted = false) {
    super(message);
    this.name = "SearchError";
    this.provider = provider;
    this.exhausted = exhausted;
  }
}
