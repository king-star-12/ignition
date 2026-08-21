import { describe, expect, it } from "vitest";
import { buildCandidates, pickBest } from "@/lib/domains/namecom";
import type { DomainCandidate, StartupIdeaAnalysis } from "@/lib/analysis/schemas";

const ANALYSIS: StartupIdeaAnalysis = {
  idea: "An AI meal planner for Indian families.",
  problem: "Deciding what to cook.",
  targetCustomer: "Busy parents.",
  proposedSolution: "Weekly plans and a grocery list.",
  category: "Consumer FoodTech",
  keywords: ["indian meal planner", "weekly meal plan", "grocery list app"],
  nameSuggestions: ["mealmitra", "thalitime", "rasoiplan"],
  competitorSearchQueries: [],
  marketSearchQueries: [],
  customerPainSearchQueries: [],
  initialHypotheses: [],
};

const candidate = (domain: string, available: boolean | null): DomainCandidate => ({
  domain,
  available,
  price: available ? 12 : null,
  currency: "USD",
  reason: "",
  premium: false,
});

describe("buildCandidates", () => {
  const candidates = buildCandidates(ANALYSIS);

  it("produces between 5 and 10 candidates", () => {
    expect(candidates.length).toBeGreaterThanOrEqual(5);
    expect(candidates.length).toBeLessThanOrEqual(10);
  });

  it("keeps every candidate short enough to be usable", () => {
    for (const entry of candidates) {
      const base = entry.domain.slice(0, entry.domain.lastIndexOf("."));
      expect(base.length).toBeLessThanOrEqual(22);
    }
  });

  it("never repeats a domain", () => {
    const domains = candidates.map((entry) => entry.domain);
    expect(new Set(domains).size).toBe(domains.length);
  });

  it("uses the model's brand suggestions", () => {
    expect(candidates.some((entry) => entry.domain.startsWith("mealmitra."))).toBe(true);
  });

  it("collapses multi-word keywords instead of concatenating whole phrases", () => {
    expect(candidates.every((entry) => !entry.domain.includes("indianmealplannerweekly"))).toBe(
      true,
    );
  });

  it("is deterministic across runs", () => {
    expect(buildCandidates(ANALYSIS)).toEqual(candidates);
  });

  it("survives an analysis with no names or keywords", () => {
    expect(() =>
      buildCandidates({ ...ANALYSIS, keywords: [], nameSuggestions: [] }),
    ).not.toThrow();
  });
});

describe("pickBest", () => {
  it("prefers .com over other TLDs", () => {
    const best = pickBest([
      candidate("mealmitra.ai", true),
      candidate("mealmitra.com", true),
    ]);
    expect(best?.domain).toBe("mealmitra.com");
  });

  it("skips taken and unknown domains", () => {
    const best = pickBest([
      candidate("taken.com", false),
      candidate("unknown.com", null),
      candidate("free.app", true),
    ]);
    expect(best?.domain).toBe("free.app");
  });

  it("returns null when nothing is available", () => {
    expect(pickBest([candidate("taken.com", false)])).toBeNull();
  });
});
