"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Register, RegisterRow } from "./parts";
import type { ResearchCategory, ResearchEvidence } from "@/lib/analysis/schemas";
import { cn } from "@/lib/utils";

const FILTERS: Array<{ id: ResearchCategory | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "competitors", label: "Competitors" },
  { id: "market", label: "Market" },
  { id: "customer_pain", label: "Customer pain" },
];

const CATEGORY_LABEL: Record<ResearchCategory, string> = {
  competitors: "Competitor",
  market: "Market",
  customer_pain: "Pain",
};

/**
 * Evidence as a numbered register of exhibits. The numbering is the point —
 * every citation elsewhere in the document refers back to these.
 */
export function ExhibitRegister({ evidence }: { evidence: ResearchEvidence }) {
  const [filter, setFilter] = useState<ResearchCategory | "all">("all");

  // Number by retrieval order so an exhibit's number never changes when filtered.
  const numbered = evidence.results.map((result, index) => ({
    result,
    number: String(index + 1).padStart(2, "0"),
  }));
  const visible =
    filter === "all"
      ? numbered
      : numbered.filter((entry) => entry.result.category === filter);

  if (evidence.results.length === 0) {
    return (
      <p className="border-y border-line-strong py-8 text-center text-sm text-ink-muted">
        No exhibits were entered for this idea.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2">
        {FILTERS.map((entry) => {
          const count =
            entry.id === "all"
              ? numbered.length
              : numbered.filter((item) => item.result.category === entry.id).length;
          const active = filter === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setFilter(entry.id)}
              className={cn(
                "lp-eyebrow border-b-2 pb-1 transition-colors",
                active
                  ? "border-gold text-forest"
                  : "border-transparent text-ink-subtle hover:text-forest",
              )}
            >
              {entry.label}
              <span className="ml-1.5 font-mono text-[10px] normal-case tracking-normal opacity-60">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Register>
        {visible.map(({ result, number }) => (
          <RegisterRow
            key={result.url}
            index={`EX. ${number}`}
            label={
              <span className="lp-margin-note block leading-relaxed">
                {CATEGORY_LABEL[result.category]}
              </span>
            }
          >
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="lp-display text-[17px] leading-snug text-forest group-hover:underline group-hover:decoration-gold group-hover:underline-offset-4">
                  {result.title}
                </h3>
                <ArrowUpRight className="size-3.5 shrink-0 translate-y-0.5 text-ink-subtle transition-colors group-hover:text-gold-deep" />
              </div>
              <div className="mt-1 font-mono text-[11px] text-ink-subtle">{result.source}</div>
              {result.snippet ? (
                <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-muted">
                  {result.snippet}
                </p>
              ) : null}
            </a>
          </RegisterRow>
        ))}
      </Register>
    </div>
  );
}

/**
 * Citations render as exhibit numbers, so a claim points at a row of the
 * register rather than dumping a URL into the prose.
 */
export function Cites({
  urls,
  evidence,
}: {
  urls: string[];
  evidence: ResearchEvidence;
}) {
  if (urls.length === 0) {
    return <span className="lp-margin-note text-ink-subtle">Inference — no exhibit</span>;
  }

  const index = new Map(evidence.results.map((result, position) => [result.url, position + 1]));

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="lp-margin-note">Exhibits</span>
      {urls.map((url) => {
        const number = index.get(url);
        return (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-gold-deep underline decoration-gold/40 underline-offset-2 hover:decoration-gold"
          >
            {number ? String(number).padStart(2, "0") : "ext"}
          </a>
        );
      })}
    </span>
  );
}
