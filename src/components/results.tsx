"use client";

import { RotateCcw, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/share-button";
import { CommandPalette } from "@/components/command-palette";
import { BriefDialog } from "@/components/dossier/brief-dialog";
import { Masthead } from "@/components/dossier/masthead";
import { VerdictPlate } from "@/components/dossier/verdict-plate";
import { Chapter, ColumnSet, Register, RegisterRow, Statement } from "@/components/dossier/parts";
import { Cites, ExhibitRegister } from "@/components/dossier/exhibits";
import { CaseColumns } from "@/components/dossier/case-columns";
import { Names } from "@/components/dossier/names";
import { Orders } from "@/components/dossier/orders";
import { buildActionPlan } from "@/lib/analysis/actions";
import { evidenceCoverage } from "@/lib/analysis/insight";
import type { DataSource, ValidationRun } from "@/lib/analysis/schemas";
import { cn } from "@/lib/utils";

export function Results({
  run,
  onReset,
  shareId,
  saveAttempted,
  readOnly = false,
  filedAt,
}: {
  run: ValidationRun;
  onReset?: () => void;
  shareId?: string | null;
  saveAttempted?: boolean;
  readOnly?: boolean;
  filedAt?: string;
}) {
  const { analysis, evidence, synthesis, domains, sources, mode, recordedAt } = run;
  const plan = buildActionPlan(run);
  const coverage = evidenceCoverage(synthesis, evidence);

  const commands = [
    ...(shareId
      ? [
          {
            id: "share",
            label: "Copy the share link",
            hint: "Action",
            run: () => {
              void navigator.clipboard.writeText(`${window.location.origin}/r/${shareId}`);
            },
          },
        ]
      : []),
    { id: "print", label: "Print this file", hint: "Action", run: () => window.print() },
    ...(onReset
      ? [{ id: "reset", label: "Start a new idea", hint: "Action", run: onReset }]
      : []),
  ];
  const recordedOn = recordedAt
    ? new Date(recordedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-5 pb-28">
      <CommandPalette actions={commands} />
      {readOnly ? null : (
        <div className="lp-no-print sticky top-0 z-30 -mx-5 flex flex-wrap items-center justify-end gap-2 bg-paper/90 px-5 py-2.5 backdrop-blur-md">
          {mode === "scrutiny" ? (
            <span className="lp-margin-note mr-auto flex items-center gap-1.5 text-gold-deep">
              <Scale className="size-3" />
              Cross-examined
            </span>
          ) : null}
          <span className="lp-margin-note hidden text-ink-subtle sm:inline" title="Open the command palette">
            ⌘K
          </span>
          <ShareButton shareId={shareId ?? null} saveAttempted={saveAttempted} />
          {onReset ? (
            <Button variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw className="size-3.5" />
              New idea
            </Button>
          ) : null}
        </div>
      )}

      <Masthead
        caseNumber={shareId ?? "draft"}
        dateline={
          recordedOn ??
          filedAt ??
          new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        }
        mode={mode}
        sourceCount={evidence.results.length}
      />

      <VerdictPlate synthesis={synthesis} mode={mode} idea={analysis.idea} />

      {recordedOn ? (
        <p className="mt-8 border-l-2 border-gold bg-gold-soft/50 px-4 py-3 text-[13px] leading-relaxed text-ink">
          <span className="lp-eyebrow mr-2 text-gold-deep">Recorded run</span>
          This file was produced by a real Ignition investigation on {recordedOn} and is being
          replayed — the searches below were genuinely run then, not just now.
        </p>
      ) : null}

      <ProvenanceLine
        sources={sources}
        evidence={evidence.results.length}
        recorded={Boolean(recordedOn)}
      />

      <div className="mt-24 space-y-24">
        <Chapter number={1} title="The idea">
          <dl className="divide-y divide-line border-y border-line-strong">
            <Statement term="Problem">{analysis.problem}</Statement>
            <Statement term="Customer">{analysis.targetCustomer}</Statement>
            <Statement term="Solution">{analysis.proposedSolution}</Statement>
            <Statement term="Category">{analysis.category}</Statement>
          </dl>
        </Chapter>

        <Chapter
          number={2}
          title="Exhibits"
          note={
            sources.research === "live"
              ? `${evidence.results.length} sources retrieved from ${evidence.queriesRun.length} live searches. Every claim below cites one of them by number.`
              : `${evidence.results.length} sample sources. Set a search key for live research.`
          }
        >
          <ExhibitRegister evidence={evidence} />
        </Chapter>

        <Chapter
          number={3}
          title="The field"
          note="Only products that appeared in the exhibits are listed."
        >
          {synthesis.competitors.length === 0 ? (
            <p className="border-y border-line-strong py-8 text-sm text-ink-muted">
              No competitor was identified in the evidence. That is a finding, not a win — verify
              it with a deeper search before assuming the space is empty.
            </p>
          ) : (
            <Register>
              {synthesis.competitors.map((competitor, index) => (
                <RegisterRow
                  key={competitor.name}
                  index={String(index + 1).padStart(2, "0")}
                  label={<Cites urls={competitor.sourceUrls} evidence={evidence} />}
                >
                  <h3 className="lp-display text-[19px] leading-snug text-forest">
                    {competitor.name}
                  </h3>
                  {competitor.description ? (
                    <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-muted">
                      {competitor.description}
                    </p>
                  ) : null}
                  <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                    <Points title="Strengths" items={competitor.strengths} tone="good" />
                    <Points title="Weaknesses" items={competitor.weaknesses} tone="bad" />
                  </div>
                  {competitor.pricingNote ? (
                    <p className="mt-3.5 border-l-2 border-gold/50 pl-3 text-[12px] text-ink-muted">
                      {competitor.pricingNote}
                    </p>
                  ) : null}
                </RegisterRow>
              ))}
            </Register>
          )}
        </Chapter>

        <Chapter
          number={4}
          title="On the ground"
          note="What people said, in the threads and reviews the search surfaced."
        >
          {synthesis.customerPainPoints.length === 0 ? (
            <p className="border-y border-line-strong py-8 text-sm text-ink-muted">
              No customer pain was found in the retrieved sources.
            </p>
          ) : (
            <Register>
              {synthesis.customerPainPoints.map((pain) => (
                <RegisterRow
                  key={pain.pain}
                  label={<Cites urls={pain.sourceUrls} evidence={evidence} />}
                >
                  {pain.quote ? (
                    <blockquote className="lp-display max-w-2xl text-[21px] leading-[1.4] text-forest">
                      &ldquo;{pain.quote}&rdquo;
                    </blockquote>
                  ) : null}
                  <p
                    className={cn(
                      "max-w-2xl text-[14px] leading-relaxed text-ink",
                      pain.quote && "mt-3",
                    )}
                  >
                    {pain.pain}
                  </p>
                  {pain.whyItMatters ? (
                    <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink-muted">
                      {pain.whyItMatters}
                    </p>
                  ) : null}
                </RegisterRow>
              ))}
            </Register>
          )}

          {synthesis.marketSignals.length ? (
            <div className="mt-8">
              <p className="lp-margin-note mb-3">Market signals</p>
              <Register>
                {synthesis.marketSignals.map((signal) => (
                  <RegisterRow
                    key={signal.signal}
                    label={
                      <div className="space-y-1.5">
                        <span
                          className={cn(
                            "lp-margin-note block",
                            signal.confidence === "verified"
                              ? "text-emerald-brand"
                              : "text-ink-subtle",
                          )}
                        >
                          {signal.confidence}
                        </span>
                        <Cites urls={signal.sourceUrls} evidence={evidence} />
                      </div>
                    }
                  >
                    <p className="max-w-2xl text-[14px] leading-relaxed text-ink">
                      {signal.signal}
                    </p>
                    {signal.interpretation ? (
                      <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink-muted">
                        {signal.interpretation}
                      </p>
                    ) : null}
                  </RegisterRow>
                ))}
              </Register>
            </div>
          ) : null}
        </Chapter>

        <Chapter number={5} title="The case">
          <CaseColumns synthesis={synthesis} />
        </Chapter>

        <Chapter
          number={6}
          title="What to build"
          note="The smallest product that tests the wedge, and how it would make money."
        >
          {synthesis.mvpFeatures.length ? (
            <Register>
              {synthesis.mvpFeatures.map((feature, index) => (
                <RegisterRow key={feature.feature} index={String(index + 1).padStart(2, "0")}>
                  <h3 className="lp-display text-[17px] leading-snug text-forest">
                    {feature.feature}
                  </h3>
                  {feature.why ? (
                    <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-muted">
                      {feature.why}
                    </p>
                  ) : null}
                </RegisterRow>
              ))}
            </Register>
          ) : (
            <p className="border-y border-line-strong py-8 text-sm text-ink-muted">
              No MVP scope was produced for this run.
            </p>
          )}

          {synthesis.monetizationIdeas.length ? (
            <div className="mt-8 grid gap-7 sm:grid-cols-2">
              {synthesis.monetizationIdeas.map((idea) => (
                <div key={idea.model} className="border-t-2 border-forest pt-3.5">
                  <h4 className="lp-display text-[17px] text-forest">{idea.model}</h4>
                  {idea.suggestedPrice ? (
                    <p className="lp-margin-note mt-1 text-gold-deep">{idea.suggestedPrice}</p>
                  ) : null}
                  {idea.detail ? (
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{idea.detail}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {synthesis.goToMarket.length ? (
            <div className="mt-8">
              <p className="lp-margin-note mb-3">First channels</p>
              <ColumnSet className="text-[14px]">
                <ul className="space-y-2">
                  {synthesis.goToMarket.map((item) => (
                    <li key={item} className="break-inside-avoid text-ink-muted">
                      — {item}
                    </li>
                  ))}
                </ul>
              </ColumnSet>
            </div>
          ) : null}
        </Chapter>

        <Chapter
          number={7}
          title="The name"
          note="Candidates checked against the name.com API."
        >
          <Names report={domains} />
        </Chapter>

        <Chapter number={8} title="Orders" note="Derived entirely from the exhibits above.">
          <Orders plan={plan} />
        </Chapter>

        <Chapter
          number={9}
          title="On the record"
          note="What this investigation could not establish."
        >
          <Coverage coverage={coverage} />

          <div className="mt-14 grid gap-9 md:grid-cols-2">
            <div>
              <p className="lp-margin-note mb-3">Not verified by the evidence</p>
              <PlainList items={synthesis.evidenceGaps} empty="Nothing was flagged." />
            </div>
            <div>
              <p className="lp-margin-note mb-3">Still to test with real people</p>
              <PlainList items={analysis.initialHypotheses} empty="Nothing was flagged." />
            </div>
          </div>

          <div className="lp-perforated mt-12 flex flex-wrap items-center justify-between gap-5 pt-7">
            <p className="max-w-md text-[13px] leading-relaxed text-ink-muted">
              The full file — verdict, exhibits, argument, orders — as one document you can send
              to a co-founder.
            </p>
            <BriefDialog run={run} />
          </div>
        </Chapter>
      </div>
    </div>
  );
}

/**
 * Measures the product's central claim instead of asserting it: how much of
 * the analysis is actually sourced, and how much of the retrieved evidence
 * earned its place in the findings.
 */
function Coverage({ coverage }: { coverage: ReturnType<typeof evidenceCoverage> }) {
  const items = [
    {
      figure: `${coverage.percent}%`,
      caption:
        coverage.total === 0
          ? "no factual claims were made"
          : `of ${coverage.total} factual claims carry a source`,
    },
    {
      figure: `${coverage.exhibitsUsed}/${coverage.exhibitsTotal}`,
      caption: "exhibits were actually used in the findings",
    },
    {
      figure: `${coverage.verifiedSignals}`,
      caption: `market signals a source states outright, ${coverage.inferredSignals} inferred`,
    },
    {
      figure: `${coverage.gaps}`,
      caption: "things this file admits it could not establish",
    },
  ];

  return (
    <dl className="grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.caption}>
          <dt className="lp-display text-[34px] leading-none text-forest">{item.figure}</dt>
          <dd className="mt-2.5 text-[12px] leading-relaxed text-ink-muted">{item.caption}</dd>
        </div>
      ))}
    </dl>
  );
}

function ProvenanceLine({
  sources,
  evidence,
  recorded = false,
}: {
  sources: ValidationRun["sources"];
  evidence: number;
  recorded?: boolean;
}) {
  // A replay must not claim to be happening now, but it also earned its
  // sources honestly — so it reads "recorded", never "live" and never "sample".
  const qualify = (live: string, sample: string, isLive: boolean) => {
    if (!isLive) return sample;
    return recorded ? `${live} (recorded)` : live;
  };

  const entries: Array<{ label: string; value: string; source: DataSource }> = [
    {
      label: "Research",
      value: qualify(
        `${evidence} live sources`,
        `${evidence} sample sources`,
        sources.research === "live",
      ),
      source: sources.research,
    },
    {
      label: "Analysis",
      value: qualify("language model", "sample text", sources.llm === "live"),
      source: sources.llm,
    },
    {
      label: "Names",
      value: qualify("live name.com check", "sample availability", sources.domains === "live"),
      source: sources.domains,
    },
  ];

  return (
    <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-3 border-y border-line py-3">
      {entries.map((entry) => (
        <div key={entry.label} className="flex items-baseline gap-2">
          <dt className="lp-margin-note">{entry.label}</dt>
          <dd
            className={cn(
              "flex items-center gap-1.5 text-[12px]",
              entry.source === "live" ? "text-emerald-brand" : "text-gold-deep",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                entry.source === "live" ? "bg-emerald-brand" : "bg-gold",
              )}
            />
            {entry.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Points({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "good" | "bad";
}) {
  return (
    <div>
      <p className="lp-margin-note mb-1.5">{title}</p>
      {items.length === 0 ? (
        <p className="text-[13px] text-ink-subtle">Not identified.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-ink-muted">
              <span
                className={cn(
                  "mt-[7px] h-px w-2.5 shrink-0",
                  tone === "good" ? "bg-emerald-brand" : "bg-clay",
                )}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlainList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-[13px] text-ink-subtle">{empty}</p>;
  return (
    <ul className="space-y-2.5 border-t border-line pt-3.5">
      {items.map((item) => (
        <li key={item} className="text-[13px] leading-relaxed text-ink-muted">
          — {item}
        </li>
      ))}
    </ul>
  );
}
