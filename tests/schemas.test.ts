import { describe, expect, it } from "vitest";
import {
  ResearchEvidenceSchema,
  StartupIdeaAnalysisSchema,
  ViabilityAnalysisSchema,
} from "@/lib/analysis/schemas";

/**
 * These cover the malformed shapes small models actually produce, so a sloppy
 * response degrades instead of crashing the demo.
 */

const MINIMAL_SYNTHESIS = {
  executiveSummary: "Summary.",
  problem: { statement: "Problem." },
  viability: {
    demand: 70,
    competition: 50,
    differentiation: 60,
    monetization: 55,
    execution: 50,
    overall: 60,
  },
  verdict: "BUILD",
  verdictReason: "Because.",
};

describe("ViabilityAnalysisSchema", () => {
  it("fills omitted array fields with empty arrays", () => {
    const parsed = ViabilityAnalysisSchema.parse(MINIMAL_SYNTHESIS);
    expect(parsed.competitors).toEqual([]);
    expect(parsed.risks).toEqual([]);
    expect(parsed.problem.evidence).toEqual([]);
  });

  it("coerces numeric scores sent as strings", () => {
    const parsed = ViabilityAnalysisSchema.parse({
      ...MINIMAL_SYNTHESIS,
      viability: { ...MINIMAL_SYNTHESIS.viability, demand: "82" },
    });
    expect(parsed.viability.demand).toBe(82);
  });

  it("falls back to a neutral score when a score is nonsense", () => {
    const parsed = ViabilityAnalysisSchema.parse({
      ...MINIMAL_SYNTHESIS,
      viability: { ...MINIMAL_SYNTHESIS.viability, execution: "very high" },
    });
    expect(parsed.viability.execution).toBe(50);
  });

  it("falls back to REFINE for an unknown verdict", () => {
    const parsed = ViabilityAnalysisSchema.parse({
      ...MINIMAL_SYNTHESIS,
      verdict: "MAYBE",
    });
    expect(parsed.verdict).toBe("REFINE");
  });

  it("defaults an unknown risk severity to medium", () => {
    const parsed = ViabilityAnalysisSchema.parse({
      ...MINIMAL_SYNTHESIS,
      risks: [{ risk: "Churn", severity: "catastrophic" }],
    });
    expect(parsed.risks[0].severity).toBe("medium");
  });

  it("rejects a response missing the executive summary", () => {
    const withoutSummary: Record<string, unknown> = { ...MINIMAL_SYNTHESIS };
    delete withoutSummary.executiveSummary;
    expect(ViabilityAnalysisSchema.safeParse(withoutSummary).success).toBe(false);
  });

  it("rejects an empty-string verdict reason", () => {
    const result = ViabilityAnalysisSchema.safeParse({
      ...MINIMAL_SYNTHESIS,
      verdictReason: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a completely wrong payload", () => {
    expect(ViabilityAnalysisSchema.safeParse({ hello: "world" }).success).toBe(false);
    expect(ViabilityAnalysisSchema.safeParse("not an object").success).toBe(false);
  });
});

describe("StartupIdeaAnalysisSchema", () => {
  const base = {
    idea: "An AI meal planner.",
    problem: "Deciding what to cook.",
    targetCustomer: "Busy parents.",
    proposedSolution: "Weekly plans.",
    category: "FoodTech",
  };

  it("defaults every query list when the model omits them", () => {
    const parsed = StartupIdeaAnalysisSchema.parse(base);
    expect(parsed.competitorSearchQueries).toEqual([]);
    expect(parsed.nameSuggestions).toEqual([]);
  });

  it("drops blank entries rather than accepting them", () => {
    const result = StartupIdeaAnalysisSchema.safeParse({
      ...base,
      keywords: ["meal planning", "  "],
    });
    expect(result.success).toBe(false);
  });
});

describe("ResearchEvidenceSchema", () => {
  it("rejects a result with an invalid URL", () => {
    const result = ResearchEvidenceSchema.safeParse({
      results: [
        { title: "T", url: "not-a-url", snippet: "", source: "x", category: "market" },
      ],
      queriesRun: [],
      totalFound: 1,
      deduplicated: 0,
      dataSource: "live",
      notes: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("loose list shapes from real models", () => {
  const base = {
    executiveSummary: "Summary.",
    problem: { statement: "Problem." },
    viability: {
      demand: 70, competition: 50, differentiation: 60,
      monetization: 55, execution: 50, overall: 60,
    },
    verdict: "BUILD",
    verdictReason: "Because.",
  };

  it("flattens a list that came back nested", () => {
    const parsed = ViabilityAnalysisSchema.parse({
      ...base,
      goToMarket: ["Direct sales", ["Conferences", "Trade press"], "Partnerships"],
    });
    expect(parsed.goToMarket).toEqual([
      "Direct sales", "Conferences", "Trade press", "Partnerships",
    ]);
  });

  it("pulls the sentence out of objects the model wrapped", () => {
    const parsed = ViabilityAnalysisSchema.parse({
      ...base,
      goToMarket: [{ channel: "Launch brokers" }, { text: "Industry newsletters" }],
    });
    expect(parsed.goToMarket).toEqual(["Launch brokers", "Industry newsletters"]);
  });

  it("drops entries with nothing usable in them rather than failing", () => {
    const parsed = ViabilityAnalysisSchema.parse({
      ...base,
      opportunities: ["Real one", {}, [], 42],
    });
    expect(parsed.opportunities).toEqual(["Real one"]);
  });

  it("still rejects a list that is not a list at all", () => {
    expect(
      ViabilityAnalysisSchema.safeParse({ ...base, goToMarket: "not a list" }).success,
    ).toBe(false);
  });
});
