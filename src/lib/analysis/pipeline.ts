import "server-only";
import { getLlmProvider, LlmError } from "@/lib/ai/provider";
import { hasLlmCredentials, isGlobalDemoMode } from "@/lib/env";
import { demoIdeaAnalysis, demoSynthesis } from "@/lib/demo/fixtures";
import {
  IDEA_SHAPE_HINT,
  SYNTHESIS_SHAPE_HINT,
  ideaPrompt,
  synthesisPrompt,
  systemPromptFor,
} from "./prompts";
import { reconcile } from "./scoring";
import {
  StartupIdeaAnalysisSchema,
  ViabilityAnalysisSchema,
  type DataSource,
  type ResearchEvidence,
  type StartupIdeaAnalysis,
  type ValidationMode,
  type ViabilityAnalysis,
} from "./schemas";

export type StageResult<T> = {
  data: T;
  dataSource: DataSource;
  notes: string[];
};

function demoReason(): string | null {
  if (isGlobalDemoMode()) return "DEMO_MODE is on.";
  if (!hasLlmCredentials()) {
    return "No LLM key is configured — this is a labelled sample analysis, not model output.";
  }
  return null;
}

export async function analyzeIdea(
  idea: string,
  mode: ValidationMode,
): Promise<StageResult<StartupIdeaAnalysis>> {
  const skip = demoReason();
  if (skip) {
    return { data: demoIdeaAnalysis(idea, mode), dataSource: "demo", notes: [skip] };
  }

  try {
    const provider = getLlmProvider();
    const analysis = await provider.generateStructuredResponse({
      system: systemPromptFor(mode),
      prompt: ideaPrompt(idea, mode),
      schema: StartupIdeaAnalysisSchema,
      shapeHint: IDEA_SHAPE_HINT,
      temperature: 0.4,
      // Reasoning tokens count against this, and free tiers meter
      // prompt + completion together — keep the reservation modest.
      maxTokens: 2000,
      reasoningEffort: "low",
    });
    // Keep the founder's own words as the canonical idea text.
    return { data: { ...analysis, idea: analysis.idea || idea }, dataSource: "live", notes: [] };
  } catch (error) {
    logLlmFailure("analyze", error);
    return {
      data: demoIdeaAnalysis(idea, mode),
      dataSource: "demo",
      notes: [`The language model call failed (${describe(error)}) — showing a labelled sample.`],
    };
  }
}

export async function synthesizeEvidence(
  analysis: StartupIdeaAnalysis,
  evidence: ResearchEvidence,
  mode: ValidationMode,
): Promise<StageResult<ViabilityAnalysis>> {
  const skip = demoReason();
  if (skip) {
    return { data: demoSynthesis(analysis, evidence, mode), dataSource: "demo", notes: [skip] };
  }

  try {
    const provider = getLlmProvider();
    const synthesis = await provider.generateStructuredResponse({
      system: systemPromptFor(mode),
      prompt: synthesisPrompt(analysis, evidence, mode),
      schema: ViabilityAnalysisSchema,
      shapeHint: SYNTHESIS_SHAPE_HINT,
      temperature: 0.3,
      maxTokens: 5000,
      reasoningEffort: "low",
      timeoutMs: 90_000,
    });
    return {
      data: reconcile(pruneUnsourcedUrls(synthesis, evidence)),
      dataSource: "live",
      notes: evidence.dataSource === "demo"
        ? ["Analysed from sample evidence, because live search was unavailable."]
        : [],
    };
  } catch (error) {
    logLlmFailure("synthesize", error);
    return {
      data: demoSynthesis(analysis, evidence, mode),
      dataSource: "demo",
      notes: [`The language model call failed (${describe(error)}) — showing a labelled sample.`],
    };
  }
}

/** Strip any citation the model did not actually receive in the evidence set. */
function pruneUnsourcedUrls(
  synthesis: ViabilityAnalysis,
  evidence: ResearchEvidence,
): ViabilityAnalysis {
  const allowed = new Set(evidence.results.map((result) => result.url));
  const filter = (urls: string[]) => urls.filter((url) => allowed.has(url));

  return {
    ...synthesis,
    competitors: synthesis.competitors.map((item) => ({
      ...item,
      sourceUrls: filter(item.sourceUrls),
    })),
    marketSignals: synthesis.marketSignals.map((item) => ({
      ...item,
      sourceUrls: filter(item.sourceUrls),
      confidence: filter(item.sourceUrls).length ? item.confidence : "inferred",
    })),
    customerPainPoints: synthesis.customerPainPoints.map((item) => ({
      ...item,
      sourceUrls: filter(item.sourceUrls),
    })),
  };
}

function describe(error: unknown): string {
  return error instanceof LlmError ? error.kind : "unknown error";
}

function logLlmFailure(stage: string, error: unknown) {
  if (error instanceof LlmError) {
    console.error(`[llm:${stage}] ${error.provider} ${error.kind}: ${error.message}`, error.detail);
  } else {
    console.error(`[llm:${stage}] unexpected failure`, error);
  }
}
