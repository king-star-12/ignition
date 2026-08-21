"use client";

import { useCallback, useRef, useState } from "react";
import recordedRun from "@/lib/demo/recorded-run.json";
import { ValidationRunSchema } from "@/lib/analysis/schemas";
import type {
  DataSource,
  DomainReport,
  ResearchEvidence,
  StartupIdeaAnalysis,
  ValidationMode,
  ValidationRun,
  ViabilityAnalysis,
} from "@/lib/analysis/schemas";

export type StageId = "understand" | "research" | "analyze" | "domains";
export type StageState = "pending" | "active" | "done";

export const STAGES: Array<{ id: StageId; label: string; detail: string }> = [
  { id: "understand", label: "Reading the brief", detail: "Structuring the problem and drafting the search plan" },
  { id: "research", label: "Gathering exhibits", detail: "Six concurrent searches across the live web" },
  { id: "analyze", label: "Weighing the evidence", detail: "Competitors, customer pain, opportunity, verdict" },
  { id: "domains", label: "Clearing the name", detail: "Live availability via name.com" },
];

export type RunState = {
  phase: "idle" | "running" | "done" | "error";
  mode: ValidationMode;
  idea: string;
  stages: Record<StageId, StageState>;
  analysis: StartupIdeaAnalysis | null;
  evidence: ResearchEvidence | null;
  synthesis: ViabilityAnalysis | null;
  domains: DomainReport | null;
  sources: { llm: DataSource; research: DataSource; domains: DataSource };
  notes: string[];
  error: string | null;
  /** Id of the saved report, once it has been persisted. */
  shareId: string | null;
  /** Set when the run on screen is the recorded demo being replayed. */
  recordedAt: string | null;
  /** Whether the save has been attempted yet, so the UI can stop waiting. */
  saveAttempted: boolean;
};

const INITIAL_STAGES: Record<StageId, StageState> = {
  understand: "pending",
  research: "pending",
  analyze: "pending",
  domains: "pending",
};

const INITIAL: RunState = {
  phase: "idle",
  mode: "validate",
  idea: "",
  stages: INITIAL_STAGES,
  analysis: null,
  evidence: null,
  synthesis: null,
  domains: null,
  sources: { llm: "live", research: "live", domains: "live" },
  notes: [],
  error: null,
  shareId: null,
  recordedAt: null,
  saveAttempted: false,
};

async function postJson<T>(url: string, body: unknown, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; detail?: string }
      | null;
    const message = payload?.error ?? `Request to ${url} failed (${response.status}).`;
    throw new Error(payload?.detail ? `${message} ${payload.detail}` : message);
  }
  return (await response.json()) as T;
}

/** Keeps every pipeline stage on screen long enough to read, even in demo mode. */
function withMinDuration<T>(promise: Promise<T>, ms = 700): Promise<T> {
  return Promise.all([promise, new Promise((resolve) => setTimeout(resolve, ms))]).then(
    ([value]) => value,
  );
}

/** Persists the finished run so it survives a refresh and can be shared. */
async function persistRun(run: ValidationRun): Promise<string | null> {
  try {
    const response = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(run),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { id?: string };
    return payload.id ?? null;
  } catch {
    // Saving is a convenience — never let it break a completed run.
    return null;
  }
}

/**
 * Pacing for the recorded demo. These mirror how long a real run actually
 * takes, so the replay reads identically on stage — you keep the narration
 * over the pipeline, you just cannot lose the network.
 */
const REPLAY_PACING = {
  understand: 1_100,
  research: 4_200,
  analyse: 3_200,
} as const;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useValidationRun(options: {
  onComplete?: (run: ValidationRun, shareId: string | null) => void;
} = {}) {
  const [state, setState] = useState<RunState>(INITIAL);
  const controller = useRef<AbortController | null>(null);
  const onComplete = useRef(options.onComplete);
  onComplete.current = options.onComplete;

  const reset = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setState(INITIAL);
  }, []);

  const start = useCallback(async (idea: string, mode: ValidationMode) => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;

    setState({
      ...INITIAL,
      phase: "running",
      mode,
      idea,
      stages: { ...INITIAL_STAGES, understand: "active" },
    });

    try {
      const structured = await withMinDuration(
        postJson<{ analysis: StartupIdeaAnalysis; dataSource: DataSource; notes: string[] }>(
          "/api/analyze",
          { idea, mode },
          abort.signal,
        ),
      );
      if (abort.signal.aborted) return;

      setState((previous) => ({
        ...previous,
        analysis: structured.analysis,
        sources: { ...previous.sources, llm: structured.dataSource },
        notes: [...previous.notes, ...structured.notes],
        stages: { ...previous.stages, understand: "done", research: "active" },
      }));

      const research = await withMinDuration(
        postJson<{ evidence: ResearchEvidence }>(
          "/api/research",
          { analysis: structured.analysis, mode },
          abort.signal,
        ),
      );
      if (abort.signal.aborted) return;

      setState((previous) => ({
        ...previous,
        evidence: research.evidence,
        sources: { ...previous.sources, research: research.evidence.dataSource },
        notes: [...previous.notes, ...research.evidence.notes],
        stages: { ...previous.stages, research: "done", analyze: "active", domains: "active" },
      }));

      // Synthesis and domain lookup are independent — run them together.
      const [synthesis, domains] = await Promise.all([
        withMinDuration(
          postJson<{ synthesis: ViabilityAnalysis; dataSource: DataSource; notes: string[] }>(
            "/api/synthesize",
            { analysis: structured.analysis, evidence: research.evidence, mode },
            abort.signal,
          ),
        ),
        withMinDuration(
          postJson<{ domains: DomainReport }>(
            "/api/domains",
            { analysis: structured.analysis },
            abort.signal,
          ),
        ),
      ]);
      if (abort.signal.aborted) return;

      const finished: ValidationRun = {
        mode,
        analysis: structured.analysis,
        evidence: research.evidence,
        synthesis: synthesis.synthesis,
        domains: domains.domains,
        sources: {
          llm: synthesis.dataSource,
          research: research.evidence.dataSource,
          domains: domains.domains.dataSource,
        },
      };

      setState((previous) => ({
        ...previous,
        phase: "done",
        synthesis: synthesis.synthesis,
        domains: domains.domains,
        sources: finished.sources,
        notes: [...previous.notes, ...synthesis.notes, ...domains.domains.notes],
        stages: { understand: "done", research: "done", analyze: "done", domains: "done" },
      }));

      const shareId = await persistRun(finished);
      if (abort.signal.aborted) return;
      setState((previous) => ({ ...previous, shareId, saveAttempted: true }));
      onComplete.current?.(finished, shareId);
    } catch (error) {
      if (abort.signal.aborted || (error instanceof Error && error.name === "AbortError")) return;
      console.error(error);
      setState((previous) => ({
        ...previous,
        phase: "error",
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while validating this idea.",
      }));
    }
  }, []);

  /**
   * Replays the recorded investigation. Makes no external call of any kind, so
   * a dead venue network, an exhausted search quota or a rate-limited model
   * cannot break a live demo.
   */
  const startRecorded = useCallback(async () => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;

    // Statically imported and parsed in memory — no fetch, no chunk load,
    // nothing that a dead network could stall.
    const parsed = ValidationRunSchema.safeParse(recordedRun);
    if (!parsed.success) {
      console.error("[demo] the recorded run failed validation", parsed.error.issues);
      setState((previous) => ({
        ...previous,
        phase: "error",
        error: "The recorded demo is unreadable. Type an idea to run a live validation instead.",
      }));
      return;
    }
    const run = parsed.data as ValidationRun;

    setState({
      ...INITIAL,
      phase: "running",
      mode: run.mode,
      idea: run.analysis.idea,
      stages: { ...INITIAL_STAGES, understand: "active" },
    });

    await pause(REPLAY_PACING.understand);
    if (abort.signal.aborted) return;
    setState((previous) => ({
      ...previous,
      analysis: run.analysis,
      sources: { ...previous.sources, llm: run.sources.llm },
      stages: { ...previous.stages, understand: "done", research: "active" },
    }));

    await pause(REPLAY_PACING.research);
    if (abort.signal.aborted) return;
    setState((previous) => ({
      ...previous,
      evidence: run.evidence,
      sources: { ...previous.sources, research: run.sources.research },
      stages: { ...previous.stages, research: "done", analyze: "active", domains: "active" },
    }));

    await pause(REPLAY_PACING.analyse);
    if (abort.signal.aborted) return;
    setState((previous) => ({
      ...previous,
      phase: "done",
      synthesis: run.synthesis,
      domains: run.domains,
      sources: run.sources,
      recordedAt: run.recordedAt ?? null,
      stages: { understand: "done", research: "done", analyze: "done", domains: "done" },
    }));

    // Saving is best-effort; the demo already has everything it needs on screen.
    const shareId = await persistRun(run);
    if (abort.signal.aborted) return;
    setState((previous) => ({ ...previous, shareId, saveAttempted: true }));
    onComplete.current?.(run, shareId);
  }, []);

  const completedRun: ValidationRun | null =
    state.phase === "done" && state.analysis && state.evidence && state.synthesis && state.domains
      ? {
          mode: state.mode,
          analysis: state.analysis,
          evidence: state.evidence,
          synthesis: state.synthesis,
          domains: state.domains,
          sources: state.sources,
          ...(state.recordedAt ? { recordedAt: state.recordedAt } : {}),
        }
      : null;

  return { state, start, startRecorded, reset, completedRun };
}
