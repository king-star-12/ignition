import { describe, expect, it } from "vitest";
import { evidenceCoverage, sensitivity } from "@/lib/analysis/insight";
import { computeOverall } from "@/lib/analysis/scoring";
import type { ResearchEvidence, Viability, ViabilityAnalysis } from "@/lib/analysis/schemas";

function viability(partial: Partial<Viability>): Viability {
  const base: Viability = {
    demand: 60,
    competition: 50,
    differentiation: 55,
    monetization: 50,
    execution: 50,
    overall: 0,
    ...partial,
  };
  return { ...base, overall: computeOverall(base) };
}

describe("sensitivity", () => {
  it("always reports where the upside sits, richest first", () => {
    const result = sensitivity(viability({}));
    expect(result.levers).toHaveLength(5);
    for (let i = 1; i < result.levers.length; i += 1) {
      expect(result.levers[i - 1].headroom).toBeGreaterThanOrEqual(result.levers[i].headroom);
    }
  });

  it("states the gap to the next verdict", () => {
    const current = viability({});
    const result = sensitivity(current);
    expect(result.currentVerdict).toBe("REFINE");
    expect(result.nextVerdict).toBe("BUILD");
    expect(current.overall + result.gap).toBe(70);
  });

  it("marks a lever as flipping only when it genuinely does", () => {
    const current = viability({});
    for (const lever of sensitivity(current).levers) {
      if (lever.flipsAt === null) continue;
      expect(computeOverall({ ...current, [lever.dimension]: lever.flipsAt })).toBeGreaterThanOrEqual(70);
    }
  });

  it("admits when no single dimension can close the gap", () => {
    // 54 overall is too far from 70 for one weighted score to carry alone.
    const result = sensitivity(viability({}));
    expect(result.levers.every((lever) => lever.flipsAt === null)).toBe(true);
  });

  it("finds the single lever when the verdict is within reach", () => {
    const close = viability({ demand: 68, competition: 66, differentiation: 68, monetization: 68, execution: 68 });
    const result = sensitivity(close);
    const flipping = result.levers.filter((lever) => lever.flipsAt !== null);
    expect(flipping.length).toBeGreaterThan(0);
    for (const lever of flipping) {
      expect(computeOverall({ ...close, [lever.dimension]: lever.flipsAt! })).toBeGreaterThanOrEqual(70);
    }
  });

  it("offers no upside once the verdict is already BUILD", () => {
    const result = sensitivity(viability({ demand: 90, competition: 85, differentiation: 85, monetization: 80, execution: 80 }));
    expect(result.currentVerdict).toBe("BUILD");
    expect(result.nextVerdict).toBeNull();
    expect(result.gap).toBe(0);
  });

  it("reports how exposed the current verdict is, exactly", () => {
    const current = viability({});
    const { fragility } = sensitivity(current);
    expect(fragility).not.toBeNull();
    const dropped = computeOverall({
      ...current,
      [fragility!.dimension]: current[fragility!.dimension] - fragility!.points,
    });
    expect(dropped).toBeLessThan(45);
    // And one point less must NOT have demoted it, or it is not the smallest drop.
    const nearly = computeOverall({
      ...current,
      [fragility!.dimension]: current[fragility!.dimension] - (fragility!.points - 1),
    });
    expect(nearly).toBeGreaterThanOrEqual(45);
  });

  it("has no floor to fall through when already at the bottom", () => {
    const result = sensitivity(viability({ demand: 10, competition: 10, differentiation: 10, monetization: 10, execution: 10 }));
    expect(result.currentVerdict).toBe("SHELVE");
    expect(result.fragility).toBeNull();
  });
});

const evidence = (urls: string[]): ResearchEvidence => ({
  results: urls.map((url, index) => ({
    title: `T${index}`,
    url,
    snippet: "",
    source: "example.com",
    category: "competitors" as const,
    query: "q",
  })),
  queriesRun: [],
  totalFound: urls.length,
  deduplicated: 0,
  dataSource: "live",
  notes: [],
});

function synthesis(partial: Partial<ViabilityAnalysis>): ViabilityAnalysis {
  return {
    executiveSummary: "s",
    problem: { statement: "p", evidence: [] },
    competitors: [],
    marketSignals: [],
    customerPainPoints: [],
    opportunities: [],
    differentiation: [],
    mvpFeatures: [],
    monetizationIdeas: [],
    goToMarket: [],
    risks: [],
    evidenceGaps: [],
    viability: viability({}),
    verdict: "REFINE",
    verdictReason: "r",
    ...partial,
  };
}

describe("evidenceCoverage", () => {
  it("counts a claim as covered only when its citation is a real exhibit", () => {
    const coverage = evidenceCoverage(
      synthesis({
        competitors: [
          { name: "A", description: "", strengths: [], weaknesses: [], pricingNote: "", sourceUrls: ["https://a.com/"] },
          { name: "B", description: "", strengths: [], weaknesses: [], pricingNote: "", sourceUrls: ["https://ghost.com/"] },
        ],
      }),
      evidence(["https://a.com/"]),
    );
    expect(coverage.total).toBe(2);
    expect(coverage.cited).toBe(1);
    expect(coverage.percent).toBe(50);
  });

  it("reports how much of the retrieved evidence was actually used", () => {
    const coverage = evidenceCoverage(
      synthesis({
        competitors: [
          { name: "A", description: "", strengths: [], weaknesses: [], pricingNote: "", sourceUrls: ["https://a.com/"] },
        ],
      }),
      evidence(["https://a.com/", "https://b.com/", "https://c.com/"]),
    );
    expect(coverage.exhibitsUsed).toBe(1);
    expect(coverage.exhibitsTotal).toBe(3);
  });

  it("separates verified signals from inferred ones", () => {
    const coverage = evidenceCoverage(
      synthesis({
        marketSignals: [
          { signal: "x", interpretation: "", confidence: "verified", sourceUrls: ["https://a.com/"] },
          { signal: "y", interpretation: "", confidence: "inferred", sourceUrls: [] },
        ],
      }),
      evidence(["https://a.com/"]),
    );
    expect(coverage.verifiedSignals).toBe(1);
    expect(coverage.inferredSignals).toBe(1);
  });

  it("does not divide by zero when there are no factual claims", () => {
    const coverage = evidenceCoverage(synthesis({}), evidence([]));
    expect(coverage.percent).toBe(0);
    expect(coverage.total).toBe(0);
  });
});
