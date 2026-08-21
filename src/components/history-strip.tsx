"use client";

import Link from "next/link";
import { ArrowUpRight, Crown, Trash2 } from "lucide-react";
import { clearHistory, type HistoryEntry } from "@/lib/history";
import { verdictCopy } from "@/lib/analysis/scoring";
import { cn } from "@/lib/utils";

const TONE_TEXT = {
  build: "text-emerald-brand",
  refine: "text-gold-deep",
  shelve: "text-clay",
} as const;

const TONE_BG = {
  build: "bg-emerald-brand",
  refine: "bg-gold",
  shelve: "bg-clay",
} as const;

/**
 * Ranked local history. Founders arrive with several ideas, and the ranking is
 * what turns single-shot validation into something worth coming back to.
 */
export function HistoryStrip({
  entries,
  onReuse,
}: {
  entries: HistoryEntry[];
  onReuse: (idea: string) => void;
}) {
  if (!entries?.length) return null;

  const ranked = [...entries].sort((a, b) => b.overall - a.overall);

  return (
    <section className="lp-rise mt-16" style={{ animationDelay: "300ms" }}>
      <div className="flex items-baseline gap-3">
        <h2 className="lp-eyebrow shrink-0 text-forest">Your case files</h2>
        <span aria-hidden className="h-px flex-1 bg-line-strong" />
      </div>
      <div className="mb-3 mt-2 flex items-center justify-between gap-3">
        <p className="lp-margin-note">Ranked by score · kept in this browser only</p>
        <button
          type="button"
          onClick={() => clearHistory()}
          className="inline-flex items-center gap-1 text-[11px] text-ink-subtle transition-colors hover:text-clay"
        >
          <Trash2 className="size-3" />
          Clear
        </button>
      </div>

      <ul className="divide-y divide-line border-y border-line-strong">
        {ranked.map((entry, index) => {
          const { tone } = verdictCopy(entry.verdict);
          return (
            <li key={`${entry.idea}-${entry.createdAt}`} className="group flex items-center gap-4 px-4 py-3">
              <span className="relative flex size-9 shrink-0 items-center justify-center">
                <span
                  className={cn("lp-display text-[19px] tabular-nums", TONE_TEXT[tone])}
                >
                  {entry.overall}
                </span>
                {index === 0 && ranked.length > 1 ? (
                  <Crown className="absolute -top-1 -right-1 size-3 text-gold" />
                ) : null}
              </span>

              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onReuse(entry.idea)}
                  className="block max-w-full truncate text-left text-sm text-ink transition-colors hover:text-forest hover:underline hover:decoration-gold hover:underline-offset-4"
                  title="Load this idea"
                >
                  {entry.idea}
                </button>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-subtle">
                  <span className={cn("inline-block size-1.5 rounded-full", TONE_BG[tone])} />
                  <span className={TONE_TEXT[tone]}>{entry.verdict}</span>
                  <span>·</span>
                  <span className="truncate">{entry.category}</span>
                  {entry.mode === "scrutiny" ? (
                    <>
                      <span>·</span>
                      <span className="text-gold-deep">cross-examined</span>
                    </>
                  ) : null}
                </div>
              </div>

              {entry.shareId ? (
                <Link
                  href={`/r/${entry.shareId}`}
                  className="lp-margin-note inline-flex shrink-0 items-center gap-1 text-ink-muted transition-colors hover:text-gold-deep"
                >
                  File
                  <ArrowUpRight className="size-3" />
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
