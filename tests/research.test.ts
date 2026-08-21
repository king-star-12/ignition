import { describe, expect, it } from "vitest";
import { normalizeResults, planQueries } from "@/lib/research/engine";
import type { ResearchResult, StartupIdeaAnalysis } from "@/lib/analysis/schemas";

const ANALYSIS: StartupIdeaAnalysis = {
  idea: "An AI meal planner.",
  problem: "Deciding what to cook.",
  targetCustomer: "Busy parents.",
  proposedSolution: "Weekly plans.",
  category: "FoodTech",
  keywords: ["meal planning"],
  nameSuggestions: [],
  competitorSearchQueries: ["best meal planning apps"],
  marketSearchQueries: [],
  customerPainSearchQueries: ["reddit meal planning complaints", "meal app reviews", "extra"],
  initialHypotheses: [],
};

const result = (overrides: Partial<ResearchResult>): ResearchResult => ({
  title: "Title",
  url: "https://example.com/a",
  snippet: "",
  source: "example.com",
  category: "competitors",
  query: "q",
  ...overrides,
});

describe("planQueries", () => {
  const planned = planQueries(ANALYSIS, "validate");

  it("runs exactly six searches", () => {
    expect(planned).toHaveLength(6);
  });

  it("covers all three categories evenly", () => {
    const counts = planned.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.category] = (acc[entry.category] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ competitors: 2, market: 2, customer_pain: 2 });
  });

  it("backfills categories the model left empty", () => {
    expect(planned.filter((entry) => entry.category === "market").every((entry) => entry.query))
      .toBe(true);
  });

  it("caps an over-eager model at two queries per category", () => {
    const painQueries = planned.filter((entry) => entry.category === "customer_pain");
    expect(painQueries).toHaveLength(2);
    expect(painQueries.map((entry) => entry.query)).not.toContain("extra");
  });

  it("uses disconfirming fallbacks in adversarial mode", () => {
    const adversarial = planQueries(
      { ...ANALYSIS, customerPainSearchQueries: [] },
      "scrutiny",
    );
    const pain = adversarial
      .filter((entry) => entry.category === "customer_pain")
      .map((entry) => entry.query)
      .join(" ");
    expect(pain).toMatch(/complaint|problem/i);
  });
});

describe("normalizeResults", () => {
  it("drops exact duplicate URLs", () => {
    const normalized = normalizeResults([
      result({}),
      result({ title: "Other title" }),
    ]);
    expect(normalized.results).toHaveLength(1);
    expect(normalized.deduplicated).toBe(1);
  });

  it("treats www and trailing slashes as the same URL", () => {
    const normalized = normalizeResults([
      result({ url: "https://example.com/a" }),
      result({ url: "https://www.example.com/a/", title: "Different" }),
    ]);
    expect(normalized.results).toHaveLength(1);
  });

  it("drops near-duplicate titles from different URLs", () => {
    const normalized = normalizeResults([
      result({ url: "https://a.com/1", title: "Best Meal Planners!" }),
      result({ url: "https://b.com/2", title: "best meal planners" }),
    ]);
    expect(normalized.results).toHaveLength(1);
  });

  it("caps how many results a single category can contribute", () => {
    const many = Array.from({ length: 20 }, (_, index) =>
      result({ url: `https://example.com/${index}`, title: `Title ${index}` }),
    );
    const normalized = normalizeResults(many);
    expect(normalized.results.length).toBeLessThanOrEqual(7);
  });

  it("keeps results from different categories", () => {
    const normalized = normalizeResults([
      result({ url: "https://a.com/1", title: "One", category: "competitors" }),
      result({ url: "https://b.com/2", title: "Two", category: "market" }),
      result({ url: "https://c.com/3", title: "Three", category: "customer_pain" }),
    ]);
    expect(normalized.results).toHaveLength(3);
    expect(normalized.deduplicated).toBe(0);
  });

  it("discards malformed URLs", () => {
    const normalized = normalizeResults([result({ url: "not-a-url" })]);
    expect(normalized.results).toHaveLength(0);
  });
});
