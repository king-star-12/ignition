import "server-only";
import { env, hasSerpapiCredentials, isGlobalDemoMode } from "@/lib/env";
import { demoEvidenceFor } from "@/lib/demo/fixtures";
import type {
  ResearchCategory,
  ResearchEvidence,
  ResearchResult,
  StartupIdeaAnalysis,
  ValidationMode,
} from "@/lib/analysis/schemas";
import { readCache, writeCache } from "./cache";
import { createBraveProvider } from "./providers/brave";
import { createHackerNewsProvider } from "./providers/hackernews";
import { createSerpapiProvider } from "./providers/serpapi";
import {
  SearchError,
  type SearchProvider,
  type SearchProviderId,
  type SearchQuery,
} from "./providers/types";

const MAX_PER_CATEGORY = 7;

/* ------------------------------------------------------------------ */
/* Query planning                                                      */
/* ------------------------------------------------------------------ */

/** Two searches per category — six calls total, run concurrently. */
export function planQueries(
  analysis: StartupIdeaAnalysis,
  mode: ValidationMode,
): SearchQuery[] {
  const fallbackTopic = [analysis.category, analysis.targetCustomer].filter(Boolean).join(" ");

  const pick = (list: string[], fallbacks: string[]): string[] => {
    const cleaned = list.map((entry) => entry.trim()).filter(Boolean).slice(0, 2);
    while (cleaned.length < 2 && fallbacks.length) {
      const next = fallbacks.shift();
      if (next && !cleaned.includes(next)) cleaned.push(next);
    }
    return cleaned;
  };

  const competitors = pick(analysis.competitorSearchQueries, [
    `best ${analysis.category} apps`,
    `${fallbackTopic} alternatives`,
  ]);
  const market = pick(analysis.marketSearchQueries, [
    `${analysis.category} market size trends`,
    `${analysis.category} industry report`,
  ]);
  const pain = pick(
    analysis.customerPainSearchQueries,
    mode === "scrutiny"
      ? [
          `reddit problems with ${analysis.category} apps`,
          `${analysis.category} app negative reviews complaints`,
        ]
      : [`reddit ${fallbackTopic} struggles`, `${analysis.category} app complaints`],
  );

  return [
    ...competitors.map((query) => ({ query, category: "competitors" as const })),
    ...market.map((query) => ({ query, category: "market" as const })),
    ...pain.map((query) => ({ query, category: "customer_pain" as const })),
  ];
}

/* ------------------------------------------------------------------ */
/* Provider chain                                                      */
/* ------------------------------------------------------------------ */

/**
 * SerpApi is the primary because live Google results are the product's
 * evidence layer. Brave takes over when the sponsor allowance runs out, and
 * Hacker News is the keyless floor that needs no account at all.
 */
export function buildProviderChain(): SearchProvider[] {
  const all: SearchProvider[] = [
    createSerpapiProvider(),
    createBraveProvider(),
    createHackerNewsProvider(),
  ];
  const available = all.filter((provider) => provider.configured);

  const preferred = env.searchProvider;
  if (!preferred) return available;

  const chosen = available.find((provider) => provider.id === preferred);
  if (!chosen) return available;
  return [chosen, ...available.filter((provider) => provider.id !== preferred)];
}

type RunOutcome = {
  results: ResearchResult[];
  providersUsed: Set<SearchProviderId>;
  cacheHits: number;
  notes: string[];
};

async function runQuery(
  planned: SearchQuery,
  chain: SearchProvider[],
  dead: Set<SearchProviderId>,
  outcome: RunOutcome,
): Promise<ResearchResult[]> {
  for (const provider of chain) {
    if (dead.has(provider.id)) continue;

    const cached = await readCache(provider.id, planned.query);
    if (cached) {
      outcome.cacheHits += 1;
      outcome.providersUsed.add(provider.id);
      // Category is part of the plan, not the cached payload.
      return cached.map((result) => ({ ...result, category: planned.category }));
    }

    try {
      const results = await provider.search(planned);
      if (results.length === 0) continue;
      await writeCache(provider.id, planned.query, results);
      outcome.providersUsed.add(provider.id);
      return results;
    } catch (error) {
      const searchError = error instanceof SearchError ? error : null;
      console.error(`[search:${provider.id}] "${planned.query}" failed`, error);

      if (searchError?.exhausted) {
        // Stop hammering a provider that has nothing left this month.
        dead.add(provider.id);
        outcome.notes.push(
          `${provider.label} is out of quota — falling back to the next search provider.`,
        );
      }
    }
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

/** Drop duplicate URLs and near-duplicate titles, keeping category balance. */
export function normalizeResults(results: ResearchResult[]): {
  results: ResearchResult[];
  totalFound: number;
  deduplicated: number;
} {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const perCategory: Record<ResearchCategory, number> = {
    competitors: 0,
    market: 0,
    customer_pain: 0,
  };
  const kept: ResearchResult[] = [];

  for (const result of results) {
    const urlKey = canonicalUrl(result.url);
    const titleKey = result.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!urlKey || seenUrls.has(urlKey) || seenTitles.has(titleKey)) continue;
    if (perCategory[result.category] >= MAX_PER_CATEGORY) continue;

    seenUrls.add(urlKey);
    seenTitles.add(titleKey);
    perCategory[result.category] += 1;
    kept.push(result);
  }

  return {
    results: kept,
    totalFound: results.length,
    deduplicated: results.length - kept.length,
  };
}

function canonicalUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export async function researchIdea(
  analysis: StartupIdeaAnalysis,
  mode: ValidationMode,
): Promise<ResearchEvidence> {
  const planned = planQueries(analysis, mode);
  const queries = planned.map((entry) => entry.query);

  if (isGlobalDemoMode()) {
    return demoEvidenceFor(analysis, queries, "DEMO_MODE is on.");
  }

  const chain = buildProviderChain();
  if (chain.length === 0) {
    return demoEvidenceFor(
      analysis,
      queries,
      "No search provider is configured — showing labelled sample evidence, not live results.",
    );
  }

  const outcome: RunOutcome = {
    results: [],
    providersUsed: new Set(),
    cacheHits: 0,
    notes: [],
  };
  const dead = new Set<SearchProviderId>();

  const settled = await Promise.all(
    planned.map((entry) => runQuery(entry, chain, dead, outcome)),
  );
  for (const results of settled) outcome.results.push(...results);

  if (outcome.results.length === 0) {
    return demoEvidenceFor(
      analysis,
      queries,
      hasSerpapiCredentials()
        ? "Live web search returned nothing — showing labelled sample evidence instead."
        : "SERPAPI_API_KEY is not set — showing labelled sample evidence, not live search results.",
    );
  }

  const normalized = normalizeResults(outcome.results);
  const notes = [...outcome.notes];

  const usedFallbackOnly =
    !outcome.providersUsed.has("serpapi") && outcome.providersUsed.size > 0;
  if (usedFallbackOnly) {
    const labels = chain
      .filter((provider) => outcome.providersUsed.has(provider.id))
      .map((provider) => provider.label)
      .join(", ");
    notes.push(`Researched with ${labels} rather than SerpApi.`);
  }
  if (outcome.cacheHits > 0) {
    notes.push(
      `${outcome.cacheHits} of ${planned.length} searches were served from cache (results under a week old).`,
    );
  }

  return {
    results: normalized.results,
    queriesRun: queries,
    totalFound: normalized.totalFound,
    deduplicated: normalized.deduplicated,
    dataSource: "live",
    notes,
  };
}
