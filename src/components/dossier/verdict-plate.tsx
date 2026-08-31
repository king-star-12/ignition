"use client";

import { useEffect, useState } from "react";
import { ColumnSet } from "./parts";
import { sensitivity } from "@/lib/analysis/insight";
import { SCORE_LABELS, verdictCopy } from "@/lib/analysis/scoring";
import type { ValidationMode, ViabilityAnalysis } from "@/lib/analysis/schemas";
import { cn } from "@/lib/utils";

const TONE = {
  build: { text: "text-emerald-brand", bar: "bg-emerald-brand" },
  refine: { text: "text-gold-deep", bar: "bg-gold" },
  shelve: { text: "text-clay", bar: "bg-clay" },
} as const;

/**
 * The front page. Scale carries the verdict — one very large figure, a great
 * deal of space around it, and nothing decorative competing for attention.
 */
export function VerdictPlate({
  synthesis,
  mode,
  idea,
}: {
  synthesis: ViabilityAnalysis;
  mode: ValidationMode;
  idea: string;
}) {
  const { headline, tone } = verdictCopy(synthesis.verdict);

  return (
    <div className="pt-14">
      <div className="lp-eyebrow text-ink-subtle">In the matter of</div>
      <p className="lp-display mt-4 max-w-3xl text-balance text-[26px] leading-[1.28] text-forest sm:text-[30px]">
        {idea}
      </p>

      <div className="mt-16 flex flex-col gap-12 sm:flex-row sm:items-start sm:justify-between sm:gap-16">
        <div className="min-w-0 flex-1">
          <div className="lp-eyebrow text-ink-subtle">
            {mode === "scrutiny" ? "Finding, after cross-examination" : "Finding"}
          </div>
          <h1 className="lp-display mt-4 text-balance text-[52px] leading-[0.96] text-forest sm:text-[68px]">
            {headline}
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-ink-muted">
            {synthesis.verdictReason}
          </p>
        </div>

        <Figure score={synthesis.viability.overall} verdict={synthesis.verdict} tone={tone} />
      </div>

      <div className="mt-20">
        <ColumnSet dropCap>
          <p>{synthesis.executiveSummary}</p>
        </ColumnSet>
      </div>

      <ScoreLedger viability={synthesis.viability} tone={tone} />
    </div>
  );
}

/** One number, large and quiet. */
function Figure({
  score,
  verdict,
  tone,
}: {
  score: number;
  verdict: string;
  tone: keyof typeof TONE;
}) {
  const shown = useCountUp(score);

  return (
    <div className="shrink-0 sm:text-right">
      <div className="lp-eyebrow text-ink-subtle">Viability</div>
      <div
        className={cn(
          "lp-display mt-1 text-[104px] leading-[0.82] tabular-nums sm:text-[128px]",
          TONE[tone].text,
        )}
      >
        {shown}
      </div>
      <div className="mt-5 flex items-center gap-3 sm:justify-end">
        <span aria-hidden className={cn("h-px w-9", TONE[tone].bar)} />
        <span className={cn("lp-display text-[17px] tracking-[0.16em]", TONE[tone].text)}>
          {verdict}
        </span>
      </div>
    </div>
  );
}

function useCountUp(value: number) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    if (reduce) {
      frame = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(frame);
    }
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 1000);
      setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return shown;
}

/**
 * The five sub-scores, plus what would actually move them. The sensitivity
 * line is arithmetic on the model's own numbers — it needs no extra call and
 * cannot invent anything.
 */
function ScoreLedger({
  viability,
  tone,
}: {
  viability: ViabilityAnalysis["viability"];
  tone: keyof typeof TONE;
}) {
  const keys = Object.keys(SCORE_LABELS) as Array<keyof typeof SCORE_LABELS>;
  const insight = sensitivity(viability);
  const best = insight.levers[0];
  const flip = insight.levers.find((lever) => lever.flipsAt !== null);

  return (
    <div className="mt-20">
      <dl className="grid grid-cols-2 gap-x-8 gap-y-9 sm:grid-cols-5">
        {keys.map((key, index) => (
          <Measure
            key={key}
            label={SCORE_LABELS[key]}
            value={viability[key]}
            tone={tone}
            delay={300 + index * 90}
          />
        ))}
      </dl>

      <div className="mt-10 space-y-1.5 border-t border-line pt-5 text-[13px] leading-relaxed text-ink-muted">
        {insight.nextVerdict ? (
          <p>
            <span className="text-ink">{insight.gap} points</span> from{" "}
            {insight.nextVerdict}.{" "}
            {flip ? (
              <>
                Taking <span className="text-ink">{flip.label.toLowerCase()}</span> to{" "}
                <span className="text-ink">{flip.flipsAt}</span> would get there on its own.
              </>
            ) : best ? (
              <>
                No single score can close that alone — the most room is in{" "}
                <span className="text-ink">{best.label.toLowerCase()}</span>, worth up to{" "}
                <span className="text-ink">{best.headroom}</span> overall.
              </>
            ) : null}
          </p>
        ) : (
          <p>This is already the strongest verdict Ignition gives.</p>
        )}
        {insight.fragility ? (
          <p>
            It holds unless{" "}
            <span className="text-ink">{insight.fragility.label.toLowerCase()}</span> falls{" "}
            <span className="text-ink">{insight.fragility.points} points</span>.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Measure({
  label,
  value,
  tone,
  delay,
}: {
  label: string;
  value: number;
  tone: keyof typeof TONE;
  delay: number;
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <div>
      <dt className="lp-margin-note">{label}</dt>
      <dd className="lp-display mt-2 text-[30px] leading-none tabular-nums text-forest">
        {value}
      </dd>
      <div className="mt-3 h-px w-full bg-line">
        <div
          className={cn("h-px transition-[width] duration-[900ms] ease-out", TONE[tone].bar)}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
