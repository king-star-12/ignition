import { z } from "zod";

/** Where a piece of data actually came from. Surfaced in the UI, never faked. */
export const DataSourceSchema = z.enum(["live", "demo"]);
export type DataSource = z.infer<typeof DataSourceSchema>;

export const ValidationModeSchema = z.enum(["validate", "scrutiny"]);
export type ValidationMode = z.infer<typeof ValidationModeSchema>;

export const ResearchCategorySchema = z.enum([
  "competitors",
  "market",
  "customer_pain",
]);
export type ResearchCategory = z.infer<typeof ResearchCategorySchema>;

const nonEmpty = z.string().trim().min(1);
const score = z.coerce.number().min(0).max(100).catch(50);
/**
 * Models occasionally return a "list of strings" as a list of arrays or of
 * little objects. The content is usually fine — only the shape is wrong — so
 * flatten it rather than failing the whole analysis over presentation.
 */
function flattenToText(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flattenToText);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    // Prefer a field that reads like the sentence the model meant to write.
    for (const key of ["text", "detail", "description", "item", "channel", "step", "name"]) {
      if (typeof record[key] === "string") return [record[key] as string];
    }
    const first = Object.values(record).find((entry) => typeof entry === "string");
    return typeof first === "string" ? [first] : [];
  }
  return [];
}

const stringList = z
  .preprocess(
    (value) => (Array.isArray(value) ? flattenToText(value) : value),
    z.array(nonEmpty),
  )
  .default([]);

/* ------------------------------------------------------------------ */
/* Stage 1 — structured understanding of the raw idea                  */
/* ------------------------------------------------------------------ */

export const StartupIdeaAnalysisSchema = z.object({
  idea: nonEmpty,
  problem: nonEmpty,
  targetCustomer: nonEmpty,
  proposedSolution: nonEmpty,
  category: nonEmpty,
  keywords: stringList,
  nameSuggestions: stringList,
  competitorSearchQueries: stringList,
  marketSearchQueries: stringList,
  customerPainSearchQueries: stringList,
  initialHypotheses: stringList,
});
export type StartupIdeaAnalysis = z.infer<typeof StartupIdeaAnalysisSchema>;

/* ------------------------------------------------------------------ */
/* Stage 2 — normalized live web research                              */
/* ------------------------------------------------------------------ */

export const ResearchResultSchema = z.object({
  title: nonEmpty,
  url: z.string().url(),
  snippet: z.string().default(""),
  source: nonEmpty,
  category: ResearchCategorySchema,
  query: z.string().default(""),
});
export type ResearchResult = z.infer<typeof ResearchResultSchema>;

export const ResearchEvidenceSchema = z.object({
  results: z.array(ResearchResultSchema),
  queriesRun: stringList,
  totalFound: z.number(),
  deduplicated: z.number(),
  dataSource: DataSourceSchema,
  notes: stringList,
});
export type ResearchEvidence = z.infer<typeof ResearchEvidenceSchema>;

/* ------------------------------------------------------------------ */
/* Stage 3 — synthesis                                                 */
/* ------------------------------------------------------------------ */

export const CompetitorSchema = z.object({
  name: nonEmpty,
  description: z.string().default(""),
  strengths: stringList,
  weaknesses: stringList,
  pricingNote: z.string().default(""),
  sourceUrls: z.array(z.string()).default([]),
});
export type Competitor = z.infer<typeof CompetitorSchema>;

export const MarketSignalSchema = z.object({
  signal: nonEmpty,
  interpretation: z.string().default(""),
  confidence: z.enum(["verified", "inferred"]).catch("inferred"),
  sourceUrls: z.array(z.string()).default([]),
});
export type MarketSignal = z.infer<typeof MarketSignalSchema>;

export const CustomerPainPointSchema = z.object({
  pain: nonEmpty,
  quote: z.string().default(""),
  whyItMatters: z.string().default(""),
  sourceUrls: z.array(z.string()).default([]),
});
export type CustomerPainPoint = z.infer<typeof CustomerPainPointSchema>;

export const ViabilitySchema = z.object({
  demand: score,
  competition: score,
  differentiation: score,
  monetization: score,
  execution: score,
  overall: score,
});
export type Viability = z.infer<typeof ViabilitySchema>;

export const MvpFeatureSchema = z.object({
  feature: nonEmpty,
  why: z.string().default(""),
});

export const MonetizationIdeaSchema = z.object({
  model: nonEmpty,
  detail: z.string().default(""),
  suggestedPrice: z.string().default(""),
});

export const RiskSchema = z.object({
  risk: nonEmpty,
  severity: z.enum(["high", "medium", "low"]).catch("medium"),
  mitigation: z.string().default(""),
});

export const ViabilityAnalysisSchema = z.object({
  executiveSummary: nonEmpty,
  problem: z.object({
    statement: nonEmpty,
    evidence: stringList,
  }),
  competitors: z.array(CompetitorSchema).default([]),
  marketSignals: z.array(MarketSignalSchema).default([]),
  customerPainPoints: z.array(CustomerPainPointSchema).default([]),
  opportunities: stringList,
  differentiation: stringList,
  mvpFeatures: z.array(MvpFeatureSchema).default([]),
  monetizationIdeas: z.array(MonetizationIdeaSchema).default([]),
  goToMarket: stringList,
  risks: z.array(RiskSchema).default([]),
  evidenceGaps: stringList,
  viability: ViabilitySchema,
  verdict: z.enum(["BUILD", "REFINE", "SHELVE"]).catch("REFINE"),
  verdictReason: nonEmpty,
});
export type ViabilityAnalysis = z.infer<typeof ViabilityAnalysisSchema>;

/* ------------------------------------------------------------------ */
/* Stage 4 — domains                                                   */
/* ------------------------------------------------------------------ */

export const DomainCandidateSchema = z.object({
  domain: nonEmpty,
  available: z.boolean().nullable(),
  price: z.number().nullable(),
  currency: z.string().default("USD"),
  reason: z.string().default(""),
  premium: z.boolean().default(false),
});
export type DomainCandidate = z.infer<typeof DomainCandidateSchema>;

export const DomainReportSchema = z.object({
  candidates: z.array(DomainCandidateSchema),
  best: DomainCandidateSchema.nullable(),
  dataSource: DataSourceSchema,
  notes: stringList,
});
export type DomainReport = z.infer<typeof DomainReportSchema>;

/* ------------------------------------------------------------------ */
/* Full run                                                            */
/* ------------------------------------------------------------------ */

export const LaunchPlanSchema = z.object({
  title: nonEmpty,
  markdown: nonEmpty,
  generatedAt: z.string(),
});
export type LaunchPlan = z.infer<typeof LaunchPlanSchema>;

export type SourceLabels = {
  llm: DataSource;
  research: DataSource;
  domains: DataSource;
};

export type ValidationRun = {
  mode: ValidationMode;
  analysis: StartupIdeaAnalysis;
  evidence: ResearchEvidence;
  synthesis: ViabilityAnalysis;
  domains: DomainReport;
  sources: SourceLabels;
  /**
   * Set only on the recorded demo run. Its presence means this file was
   * produced by a real investigation on that date and is being replayed —
   * not researched again just now.
   */
  recordedAt?: string;
};

/** Full shape of a run, used by the save endpoint and the recorded snapshot. */
export const ValidationRunSchema = z.object({
  mode: ValidationModeSchema,
  analysis: StartupIdeaAnalysisSchema,
  evidence: ResearchEvidenceSchema,
  synthesis: ViabilityAnalysisSchema,
  domains: DomainReportSchema,
  sources: z.object({
    llm: DataSourceSchema,
    research: DataSourceSchema,
    domains: DataSourceSchema,
  }),
  recordedAt: z.string().optional(),
});
