"use client";

import { Check, Loader2 } from "lucide-react";
import { STAGES, type RunState, type StageId } from "@/components/use-run";
import { Seal } from "@/components/brand";
import { cn } from "@/lib/utils";

const NUMERALS: Record<StageId, string> = {
  understand: "I",
  research: "II",
  analyze: "III",
  domains: "IV",
};

export function Pipeline({ state }: { state: RunState }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-16">
      <div className="flex flex-col items-center text-center">
        <Seal className="size-10" />
        <p className="lp-eyebrow mt-5 text-gold-deep">
          {state.mode === "scrutiny" ? "Cross-examining the idea" : "Opening the file"}
        </p>
        <p className="lp-display mt-4 max-w-lg text-balance text-[21px] leading-snug text-forest">
          {state.idea}
        </p>
      </div>

      <ol className="mt-12 border-y border-line-strong">
        {STAGES.map((stage) => {
          const status = state.stages[stage.id];
          return (
            <li
              key={stage.id}
              className={cn(
                "flex gap-5 border-t border-line py-5 transition-opacity duration-300 first:border-t-0 sm:gap-7",
                status === "pending" && "opacity-40",
              )}
            >
              <div className="w-16 shrink-0 pt-0.5 sm:w-24">
                <div className="flex items-center gap-2">
                  <span className="lp-display text-[13px] tracking-[0.18em] text-gold-deep">
                    {NUMERALS[stage.id]}
                  </span>
                  {status === "done" ? (
                    <Check className="size-3.5 text-emerald-brand" />
                  ) : status === "active" ? (
                    <Loader2 className="size-3.5 animate-spin text-gold-deep" />
                  ) : null}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={cn(
                      "lp-display text-[17px] leading-snug",
                      status === "pending" ? "text-ink-subtle" : "text-forest",
                    )}
                  >
                    {stage.label}
                  </span>
                  <StageMeta state={state} stageId={stage.id} />
                </div>
                <p className="mt-1 text-[13px] text-ink-muted">{stage.detail}</p>

                {stage.id === "research" && status !== "pending" && state.analysis ? (
                  <ul className="mt-3 space-y-1">
                    {[
                      ...state.analysis.competitorSearchQueries,
                      ...state.analysis.marketSearchQueries,
                      ...state.analysis.customerPainSearchQueries,
                    ]
                      .slice(0, 6)
                      .map((query) => (
                        <li
                          key={query}
                          className="truncate font-mono text-[11px] text-ink-subtle"
                        >
                          → {query}
                        </li>
                      ))}
                  </ul>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {state.analysis ? (
        <dl className="lp-rise mt-8 divide-y divide-line border-b border-line">
          <Row label="Problem" value={state.analysis.problem} />
          <Row label="Customer" value={state.analysis.targetCustomer} />
          <Row label="Category" value={state.analysis.category} />
        </dl>
      ) : null}

      {state.stages.understand === "active" ? (
        <div className="mt-8 space-y-2.5">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="lp-sweep relative h-2.5 overflow-hidden bg-paper-sunken"
              style={{ width: `${100 - index * 14}%` }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StageMeta({ state, stageId }: { state: RunState; stageId: StageId }) {
  if (stageId === "research" && state.evidence) {
    return (
      <span className="lp-margin-note shrink-0 text-emerald-brand">
        {state.evidence.results.length} exhibits
      </span>
    );
  }
  if (stageId === "domains" && state.domains) {
    const available = state.domains.candidates.filter((entry) => entry.available).length;
    return (
      <span className="lp-margin-note shrink-0 text-emerald-brand">{available} available</span>
    );
  }
  if (stageId === "analyze" && state.synthesis) {
    return (
      <span className="lp-margin-note shrink-0 text-emerald-brand">
        {state.synthesis.viability.overall} / 100
      </span>
    );
  }
  return null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3.5 sm:grid-cols-[7rem_1fr] sm:gap-6">
      <dt className="lp-eyebrow pt-0.5 text-ink-subtle">{label}</dt>
      <dd className="text-[14px] leading-relaxed text-ink">{value}</dd>
    </div>
  );
}
