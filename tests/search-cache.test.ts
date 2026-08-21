import { beforeEach, describe, expect, it } from "vitest";
import { cacheKey, readCache, resetSearchCache, writeCache } from "@/lib/research/cache";
import { buildProviderChain } from "@/lib/research/engine";
import type { ResearchResult } from "@/lib/analysis/schemas";

const RESULTS: ResearchResult[] = [
  {
    title: "Mealime",
    url: "https://mealime.com/",
    snippet: "",
    source: "mealime.com",
    category: "competitors",
    query: "meal planning apps",
  },
];

describe("search cache", () => {
  beforeEach(() => resetSearchCache());

  it("normalises whitespace and case into the same key", () => {
    expect(cacheKey("serpapi", "  Meal   Planning Apps ")).toBe(
      cacheKey("serpapi", "meal planning apps"),
    );
  });

  it("keys providers separately", () => {
    expect(cacheKey("serpapi", "x")).not.toBe(cacheKey("brave", "x"));
  });

  it("returns a stored result within the TTL", async () => {
    await writeCache("serpapi", "meal planning apps", RESULTS, 1_000);
    const hit = await readCache("serpapi", "meal planning apps", 60_000, 2_000);
    expect(hit).toHaveLength(1);
    expect(hit?.[0].url).toBe("https://mealime.com/");
  });

  it("misses once the entry is older than the TTL", async () => {
    await writeCache("serpapi", "stale query", RESULTS, 0);
    expect(await readCache("serpapi", "stale query", 1_000, 5_000)).toBeNull();
  });

  it("never caches an empty result set", async () => {
    await writeCache("serpapi", "nothing found", [], 1_000);
    expect(await readCache("serpapi", "nothing found", 60_000, 1_500)).toBeNull();
  });

  it("does not serve one provider's cache to another", async () => {
    await writeCache("serpapi", "shared query", RESULTS, 1_000);
    expect(await readCache("brave", "shared query", 60_000, 1_500)).toBeNull();
  });
});

describe("provider chain", () => {
  it("always has a keyless floor even with no keys configured", () => {
    const chain = buildProviderChain();
    expect(chain.length).toBeGreaterThan(0);
    expect(chain.some((provider) => provider.free)).toBe(true);
  });

  it("only includes providers that are actually configured", () => {
    expect(buildProviderChain().every((provider) => provider.configured)).toBe(true);
  });
});
