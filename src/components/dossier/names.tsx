import { Check, HelpCircle, X } from "lucide-react";
import { Seal } from "@/components/brand";
import type { DomainReport } from "@/lib/analysis/schemas";
import { cn } from "@/lib/utils";

export function Names({ report }: { report: DomainReport }) {
  if (report.candidates.length === 0) {
    return (
      <p className="border-y border-line-strong py-8 text-center text-sm text-ink-muted">
        No candidate names could be generated for this idea.
      </p>
    );
  }

  return (
    <div>
      {report.best ? (
        <div className="mb-7 flex flex-wrap items-center gap-5 border-y-2 border-forest py-5">
          <Seal className="size-10" />
          <div className="min-w-0 flex-1">
            <div className="lp-margin-note">Recommended</div>
            <div className="lp-display mt-1 text-[30px] leading-none text-forest">
              {report.best.domain}
            </div>
            <div className="mt-1.5 text-[13px] text-ink-muted">{report.best.reason}</div>
          </div>
          {report.best.price !== null ? (
            <div className="text-right">
              <div className="lp-display text-[24px] leading-none text-gold-deep">
                ${report.best.price.toFixed(2)}
              </div>
              <div className="lp-margin-note mt-1">per year</div>
            </div>
          ) : null}
        </div>
      ) : null}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line-strong text-left">
            <th className="lp-margin-note pb-2 font-normal">Candidate</th>
            <th className="lp-margin-note hidden pb-2 font-normal sm:table-cell">Rationale</th>
            <th className="lp-margin-note pb-2 font-normal">Status</th>
            <th className="lp-margin-note pb-2 text-right font-normal">Price</th>
          </tr>
        </thead>
        <tbody>
          {report.candidates.map((candidate) => (
            <tr
              key={candidate.domain}
              className={cn(
                "border-b border-line",
                candidate.domain === report.best?.domain && "bg-gold-soft/50",
              )}
            >
              <td className="py-3 font-mono text-[13px] text-ink">
                {candidate.domain}
                {candidate.premium ? (
                  <span className="lp-margin-note ml-2 text-gold-deep">premium</span>
                ) : null}
              </td>
              <td className="hidden max-w-[20rem] truncate py-3 pr-4 text-[12px] text-ink-subtle sm:table-cell">
                {candidate.reason}
              </td>
              <td className="py-3">
                <Status available={candidate.available} />
              </td>
              <td className="py-3 text-right font-mono text-[12px] text-ink-muted">
                {candidate.price !== null ? `$${candidate.price.toFixed(2)}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Status({ available }: { available: boolean | null }) {
  if (available === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-subtle">
        <HelpCircle className="size-3.5" /> UNKNOWN
      </span>
    );
  }
  return available ? (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-brand">
      <Check className="size-3.5" /> AVAILABLE
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-subtle">
      <X className="size-3.5" /> TAKEN
    </span>
  );
}
