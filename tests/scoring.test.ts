import { describe, expect, it } from "vitest";
import { computeOverall, reconcile, verdictFor } from "@/lib/analysis/scoring";
import type { ViabilityAnalysis } from "@/lib/analysis/schemas";

const BASE: ViabilityAnalysis = {
  executiveSummary: "Summary.",
  problem: { statement: "Problem.", evidence: [] },
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
  viability: {
    demand: 80,
    competition: 50,
    differentiation: 70,
    monetization: 60,
    execution: 60,
    overall: 99,
  },
  verdict: "BUILD",
  verdictReason: "Because.",
};

describe("scoring", () => {
  it("weights the five dimensions", () => {
    expect(computeOverall(BASE.viability)).toBe(66);
  });

  it("maps scores to verdicts at the documented thresholds", () => {
    expect(verdictFor(70)).toBe("BUILD");
    expect(verdictFor(69)).toBe("REFINE");
    expect(verdictFor(45)).toBe("REFINE");
    expect(verdictFor(44)).toBe("SHELVE");
  });

  it("overrides an overall score the model inflated", () => {
    expect(reconcile(BASE).viability.overall).toBe(66);
  });

  it("overrides a verdict that contradicts the sub-scores", () => {
    expect(reconcile(BASE).verdict).toBe("REFINE");
  });

  it("clamps out-of-range sub-scores", () => {
    const reconciled = reconcile({
      ...BASE,
      viability: { ...BASE.viability, demand: 900, execution: -20 },
    });
    expect(reconciled.viability.demand).toBe(100);
    expect(reconciled.viability.execution).toBe(0);
  });
});
