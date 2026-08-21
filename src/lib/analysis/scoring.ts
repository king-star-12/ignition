import { clamp } from "@/lib/utils";
import type { ViabilityAnalysis, Viability } from "./schemas";

/**
 * The model supplies the five sub-scores; the overall score and the verdict are
 * computed here so they can never contradict each other on stage.
 */
export const SCORE_WEIGHTS: Record<keyof Omit<Viability, "overall">, number> = {
  demand: 0.3,
  competition: 0.2,
  differentiation: 0.2,
  monetization: 0.15,
  execution: 0.15,
};

export const SCORE_LABELS: Record<keyof Omit<Viability, "overall">, string> = {
  demand: "Demand",
  competition: "Competition",
  differentiation: "Differentiation",
  monetization: "Monetization",
  execution: "Execution",
};

export function computeOverall(viability: Viability): number {
  const total = (Object.keys(SCORE_WEIGHTS) as Array<keyof typeof SCORE_WEIGHTS>).reduce(
    (sum, key) => sum + clamp(viability[key]) * SCORE_WEIGHTS[key],
    0,
  );
  return clamp(total);
}

export function verdictFor(overall: number): ViabilityAnalysis["verdict"] {
  if (overall >= 70) return "BUILD";
  if (overall >= 45) return "REFINE";
  return "SHELVE";
}

/** Force internal consistency between sub-scores, overall and verdict. */
export function reconcile(analysis: ViabilityAnalysis): ViabilityAnalysis {
  const viability: Viability = {
    demand: clamp(analysis.viability.demand),
    competition: clamp(analysis.viability.competition),
    differentiation: clamp(analysis.viability.differentiation),
    monetization: clamp(analysis.viability.monetization),
    execution: clamp(analysis.viability.execution),
    overall: 0,
  };
  viability.overall = computeOverall(viability);

  return {
    ...analysis,
    viability,
    verdict: verdictFor(viability.overall),
  };
}

export function verdictCopy(verdict: ViabilityAnalysis["verdict"]): {
  headline: string;
  tone: "build" | "refine" | "shelve";
} {
  switch (verdict) {
    case "BUILD":
      return { headline: "Build this idea", tone: "build" };
    case "SHELVE":
      return { headline: "Shelve this idea", tone: "shelve" };
    default:
      return { headline: "Refine this idea", tone: "refine" };
  }
}
