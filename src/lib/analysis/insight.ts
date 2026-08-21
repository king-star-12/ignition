import { computeOverall, SCORE_LABELS, SCORE_WEIGHTS, verdictFor } from "./scoring";
import type { ResearchEvidence, ViabilityAnalysis, Viability } from "./schemas";

type Dimension = keyof typeof SCORE_WEIGHTS;

/* ------------------------------------------------------------------ */
/* Sensitivity — what would actually change the verdict                */
/* ------------------------------------------------------------------ */

export type Lever = {
  dimension: Dimension;
  label: string;
  from: number;
  /** Overall points available if this dimension were taken to 100. */
  headroom: number;
  /** Points on this dimension that would reach the next verdict, if possible alone. */
  flipsAt: number | null;
};

export type Sensitivity = {
  currentVerdict: ViabilityAnalysis["verdict"];
  nextVerdict: ViabilityAnalysis["verdict"] | null;
  /** Overall points still needed to reach nextVerdict. */
  gap: number;
  /** Where the upside actually is, richest first. */
  levers: Lever[];
  /** The smallest single drop that would demote the verdict. */
  fragility: { dimension: Dimension; label: string; points: number } | null;
};

const THRESHOLDS = { build: 70, refine: 45 } as const;
const DIMENSIONS = Object.keys(SCORE_WEIGHTS) as Dimension[];

/** Exact search beats a closed form here — computeOverall rounds. */
function pointsToReach(
  viability: Viability,
  dimension: Dimension,
  target: number,
): number | null {
  for (let points = 1; viability[dimension] + points <= 100; points += 1) {
    const moved = { ...viability, [dimension]: viability[dimension] + points };
    if (computeOverall(moved) >= target) return points;
  }
  return null;
}

function pointsToFallBelow(
  viability: Viability,
  dimension: Dimension,
  floor: number,
): number | null {
  for (let points = 1; viability[dimension] - points >= 0; points += 1) {
    const moved = { ...viability, [dimension]: viability[dimension] - points };
    if (computeOverall(moved) < floor) return points;
  }
  return null;
}

/**
 * The five sub-scores are weighted, so effort does not pay off evenly across
 * them. This says where the upside actually sits, what it would take to reach
 * the next verdict, and how exposed the current one is. All of it is arithmetic
 * on the model's own numbers — no extra call, nothing invented.
 */
export function sensitivity(viability: Viability): Sensitivity {
  const overall = viability.overall;
  const currentVerdict = verdictFor(overall);

  const target =
    overall < THRESHOLDS.refine
      ? THRESHOLDS.refine
      : overall < THRESHOLDS.build
        ? THRESHOLDS.build
        : null;

  const levers: Lever[] = DIMENSIONS.map((dimension) => ({
    dimension,
    label: SCORE_LABELS[dimension],
    from: viability[dimension],
    headroom: Math.round((100 - viability[dimension]) * SCORE_WEIGHTS[dimension]),
    flipsAt:
      target === null
        ? null
        : (() => {
            const points = pointsToReach(viability, dimension, target);
            return points === null ? null : viability[dimension] + points;
          })(),
  })).sort((a, b) => b.headroom - a.headroom || a.dimension.localeCompare(b.dimension));

  const floor =
    overall >= THRESHOLDS.build
      ? THRESHOLDS.build
      : overall >= THRESHOLDS.refine
        ? THRESHOLDS.refine
        : null;

  let fragility: Sensitivity["fragility"] = null;
  if (floor !== null) {
    for (const dimension of DIMENSIONS) {
      const points = pointsToFallBelow(viability, dimension, floor);
      if (points === null) continue;
      if (!fragility || points < fragility.points) {
        fragility = { dimension, label: SCORE_LABELS[dimension], points };
      }
    }
  }

  return {
    currentVerdict,
    nextVerdict: target === null ? null : verdictFor(target),
    gap: target === null ? 0 : target - overall,
    levers,
    fragility,
  };
}

/* ------------------------------------------------------------------ */
/* Evidence coverage — how much of this is actually sourced            */
/* ------------------------------------------------------------------ */

export type Coverage = {
  cited: number;
  total: number;
  percent: number;
  verifiedSignals: number;
  inferredSignals: number;
  gaps: number;
  exhibitsUsed: number;
  exhibitsTotal: number;
};

/**
 * The product's whole claim is that its facts are sourced. This measures that
 * claim instead of asserting it: what share of the factual findings carry a
 * citation, and how much of the retrieved evidence was actually used.
 */
export function evidenceCoverage(
  synthesis: ViabilityAnalysis,
  evidence: ResearchEvidence,
): Coverage {
  const valid = new Set(evidence.results.map((result) => result.url));

  // Recommendations are not factual claims, so they are excluded by design.
  const claims: string[][] = [
    ...synthesis.competitors.map((item) => item.sourceUrls),
    ...synthesis.customerPainPoints.map((item) => item.sourceUrls),
    ...synthesis.marketSignals.map((item) => item.sourceUrls),
  ];

  const used = new Set<string>();
  let cited = 0;
  for (const urls of claims) {
    const real = urls.filter((url) => valid.has(url));
    if (real.length > 0) cited += 1;
    for (const url of real) used.add(url);
  }

  const total = claims.length;
  return {
    cited,
    total,
    percent: total === 0 ? 0 : Math.round((cited / total) * 100),
    verifiedSignals: synthesis.marketSignals.filter((s) => s.confidence === "verified").length,
    inferredSignals: synthesis.marketSignals.filter((s) => s.confidence !== "verified").length,
    gaps: synthesis.evidenceGaps.length,
    exhibitsUsed: used.size,
    exhibitsTotal: evidence.results.length,
  };
}
