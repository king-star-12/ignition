import { Seal } from "@/components/brand";
import type { ValidationMode } from "@/lib/analysis/schemas";

/**
 * The document's header plate: title, case number, dateline. Deliberately
 * typographic — this is the first signal that the page is a report, not an app.
 */
export function Masthead({
  caseNumber,
  dateline,
  mode,
  sourceCount,
}: {
  caseNumber: string;
  dateline: string;
  mode: ValidationMode;
  sourceCount: number;
}) {
  return (
    <header className="border-b-2 border-forest pb-3">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Seal className="size-9" />
          <div>
            <div className="lp-display text-[22px] leading-none text-forest">
              Launch<span className="text-gold-deep">Pilot</span>
            </div>
            <div className="lp-eyebrow mt-1.5 text-ink-subtle">
              {mode === "scrutiny" ? "Case file · cross-examined" : "Case file"}
            </div>
          </div>
        </div>

        {/* Compact identity line for narrow screens. */}
        <dl className="flex gap-4 text-right sm:hidden">
          <div>
            <dt className="lp-margin-note">No.</dt>
            <dd className="font-mono text-[11px] text-ink">{caseNumber}</dd>
          </div>
          <div>
            <dt className="lp-margin-note">Ex.</dt>
            <dd className="font-mono text-[11px] text-ink">{sourceCount}</dd>
          </div>
        </dl>

        <dl className="hidden gap-7 text-right sm:flex">
          <div>
            <dt className="lp-margin-note">No.</dt>
            <dd className="font-mono text-[12px] text-ink">{caseNumber}</dd>
          </div>
          <div>
            <dt className="lp-margin-note">Exhibits</dt>
            <dd className="font-mono text-[12px] text-ink">{sourceCount}</dd>
          </div>
          <div>
            <dt className="lp-margin-note">Filed</dt>
            <dd className="font-mono text-[12px] text-ink">{dateline}</dd>
          </div>
        </dl>
      </div>
    </header>
  );
}
