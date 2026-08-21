import type { ViabilityAnalysis } from "@/lib/analysis/schemas";
import { cn } from "@/lib/utils";

/**
 * The argument, set as two facing columns with a rule between them. The
 * product's whole premise is that both sides get stated, so the layout says so.
 */
export function CaseColumns({ synthesis }: { synthesis: ViabilityAnalysis }) {
  const forPoints = [...synthesis.opportunities, ...synthesis.differentiation].slice(0, 7);

  return (
    <div className="grid gap-9 md:grid-cols-2 md:gap-0">
      <div className="md:pr-9">
        <h3 className="lp-display text-[19px] text-emerald-brand">The case for</h3>
        <p className="lp-margin-note mt-1">What the market appears to be missing</p>
        <ArgumentList items={forPoints} tone="for" />
      </div>

      <div className="border-t border-line pt-9 md:border-l md:border-t-0 md:pl-9 md:pt-0">
        <h3 className="lp-display text-[19px] text-clay">The case against</h3>
        <p className="lp-margin-note mt-1">What the evidence warns about</p>
        <ol className="mt-5 space-y-4">
          {synthesis.risks.length === 0 ? (
            <li className="text-sm text-ink-subtle">
              Nothing was identified — treat that as a warning sign, not a clean bill.
            </li>
          ) : (
            synthesis.risks.map((risk, index) => (
              <li key={risk.risk} className="flex gap-3.5">
                <span className="lp-display w-5 shrink-0 pt-0.5 text-[13px] tabular-nums text-clay/60">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] leading-snug text-ink">
                    {risk.risk}
                    <span
                      className={cn(
                        "ml-2 align-middle lp-margin-note",
                        risk.severity === "high"
                          ? "text-clay"
                          : risk.severity === "medium"
                            ? "text-gold-deep"
                            : "text-ink-subtle",
                      )}
                    >
                      {risk.severity}
                    </span>
                  </p>
                  {risk.mitigation ? (
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                      {risk.mitigation}
                    </p>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ol>
      </div>
    </div>
  );
}

function ArgumentList({ items, tone }: { items: string[]; tone: "for" | "against" }) {
  if (items.length === 0) {
    return <p className="mt-5 text-sm text-ink-subtle">Nothing was identified.</p>;
  }
  return (
    <ol className="mt-5 space-y-4">
      {items.map((item, index) => (
        <li key={item} className="flex gap-3.5">
          <span
            className={cn(
              "lp-display w-5 shrink-0 pt-0.5 text-[13px] tabular-nums",
              tone === "for" ? "text-emerald-brand/60" : "text-clay/60",
            )}
          >
            {index + 1}
          </span>
          <p className="text-[14px] leading-relaxed text-ink">{item}</p>
        </li>
      ))}
    </ol>
  );
}
