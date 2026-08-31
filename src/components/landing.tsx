"use client";

import { useState } from "react";
import { ArrowRight, Play, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Seal } from "@/components/brand";
import { ConfigBanner, type AppConfig } from "@/components/config-banner";
import { HistoryStrip } from "@/components/history-strip";
import { EXAMPLE_IDEAS, RECORDED_ON } from "@/lib/constants";
import type { HistoryEntry } from "@/lib/history";
import type { ValidationMode } from "@/lib/analysis/schemas";

const MIN_LENGTH = 12;

const METHOD = [
  {
    numeral: "I",
    title: "It writes its own brief",
    body: "The model structures your idea and drafts six searches. At this stage it is forbidden from stating a single market fact — it has no evidence yet.",
  },
  {
    numeral: "II",
    title: "It gathers exhibits",
    body: "Six concurrent web searches for competing products, market signals, and the threads where your customers are already complaining.",
  },
  {
    numeral: "III",
    title: "It reaches a finding",
    body: "Every claim cites an exhibit by number, invented citations are stripped server-side, and the score is computed — not written by the model.",
  },
];

export function Landing({
  config,
  onStart,
  onRunDemo,
  history,
}: {
  config: AppConfig;
  onStart: (idea: string, mode: ValidationMode) => void;
  onRunDemo: () => void;
  history: HistoryEntry[];
}) {
  const [idea, setIdea] = useState("");
  const [touched, setTouched] = useState(false);

  const recordedOn = RECORDED_ON;
  const trimmed = idea.trim();
  const tooShort = trimmed.length < MIN_LENGTH;

  const submit = (mode: ValidationMode) => {
    setTouched(true);
    if (tooShort) return;
    onStart(trimmed, mode);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <header className="lp-rise flex items-end justify-between gap-4 border-b-2 border-forest pb-3">
        <div className="flex items-center gap-3">
          <Seal className="size-9" />
          <div>
            <div className="lp-display text-[22px] leading-none text-forest">
              Ignition
            </div>
            <div className="lp-eyebrow mt-1.5 text-ink-subtle">Startup idea investigations</div>
          </div>
        </div>
        <span className="lp-margin-note hidden sm:block">Est. evidence, not opinion</span>
      </header>

      <div className="lp-rise mt-12 text-center" style={{ animationDelay: "60ms" }}>
        <h1 className="lp-display text-balance text-[44px] leading-[1.02] text-forest sm:text-[58px]">
          Don&apos;t build it until you validate it.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-balance text-[15px] leading-relaxed text-ink-muted">
          Describe your idea. Ignition searches the live web for competitors and real customer
          complaints, checks what you could name it, and returns a case file with a verdict — and
          the receipts behind it.
        </p>
      </div>

      <div className="lp-rise mt-10" style={{ animationDelay: "120ms" }}>
        <div className="lp-eyebrow mb-2.5 text-ink-subtle">In the matter of</div>
        <div className="border-y-2 border-forest bg-paper-raised/70">
          <textarea
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            onBlur={() => setTouched(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit("validate");
            }}
            rows={4}
            maxLength={2000}
            placeholder="An AI meal planner for Indian families that plans a week of home-cooked meals…"
            aria-label="Your startup idea"
            className="lp-scrollbar lp-display w-full resize-none bg-transparent px-4 py-4 text-[19px] leading-[1.5] text-forest outline-none placeholder:text-ink-subtle/70"
          />
          <div className="flex flex-col gap-3 border-t border-line px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="lp-margin-note">
              {touched && tooShort
                ? `Add more detail — ${MIN_LENGTH - trimmed.length} more characters`
                : "⌘ + Enter to open the file"}
            </span>
            {/* Reversed on mobile so the primary action sits on top. */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => submit("scrutiny")}
                title="Test the idea the way a careful investor would, before writing a cheque"
              >
                <Scale className="size-4" />
                Cross-Examine
              </Button>
              <Button size="lg" onClick={() => submit("validate")}>
                Validate My Idea
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div
        className="lp-rise mt-5 flex flex-wrap items-center gap-x-4 gap-y-2"
        style={{ animationDelay: "160ms" }}
      >
        <span className="lp-margin-note">Or start from one of these</span>
        {EXAMPLE_IDEAS.map((example) => (
          <button
            key={example.label}
            type="button"
            onClick={() => {
              setIdea(example.idea);
              setTouched(false);
            }}
            className="text-xs text-ink-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-forest hover:decoration-gold"
          >
            {example.label}
          </button>
        ))}
      </div>

      {/* The one guaranteed path: a real investigation, recorded and replayed,
          so a dead network can never take the demo down. */}
      <button
        type="button"
        onClick={onRunDemo}
        className="lp-rise group mt-7 flex w-full items-center gap-4 border-y-2 border-forest bg-paper-raised/60 px-4 py-4 text-left transition-colors hover:bg-emerald-soft/50"
        style={{ animationDelay: "180ms" }}
      >
        <span className="lp-seal grid size-10 shrink-0 place-items-center rounded-full text-forest-deep shadow-[0_1px_0_rgba(255,255,255,0.5)_inset]">
          <Play className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="lp-display block text-[17px] leading-snug text-forest">
            Run the recorded demo
          </span>
          <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-muted">
            A real investigation from {recordedOn} — 21 exhibits, replayed instantly. No network,
            no API keys, nothing to go wrong.
          </span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-gold-deep transition-transform group-hover:translate-x-0.5" />
      </button>

      <HistoryStrip entries={history} onReuse={setIdea} />

      <section className="lp-rise mt-16" style={{ animationDelay: "220ms" }}>
        <div className="flex items-baseline gap-3">
          <h2 className="lp-eyebrow shrink-0 text-forest">Method</h2>
          <span aria-hidden className="h-px flex-1 bg-line-strong" />
        </div>
        <div className="mt-5 grid gap-x-8 gap-y-7 sm:grid-cols-3">
          {METHOD.map((item) => (
            <div key={item.numeral} className="border-t-2 border-forest pt-3.5">
              <span className="lp-display text-[13px] tracking-[0.22em] text-gold-deep">
                {item.numeral}
              </span>
              <h3 className="lp-display mt-1.5 text-[17px] leading-snug text-forest">
                {item.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="lp-rise mt-14 flex justify-center" style={{ animationDelay: "280ms" }}>
        <ConfigBanner config={config} />
      </div>
    </div>
  );
}
