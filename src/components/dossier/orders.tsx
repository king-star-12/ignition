import { ArrowUpRight } from "lucide-react";
import { Register, RegisterRow } from "./parts";
import type { ActionPlan } from "@/lib/analysis/actions";

/**
 * The 7-day plan, issued as orders. Each row carries its own day in the
 * margin, so the week reads as a schedule rather than a checklist widget.
 */
export function Orders({ plan }: { plan: ActionPlan }) {
  return (
    <div>
      <p className="lp-display mb-6 max-w-2xl text-balance text-[21px] leading-snug text-forest">
        {plan.headline}
      </p>

      <Register>
        {plan.items.map((item) => (
          <RegisterRow key={item.title} index={item.window.toUpperCase()}>
            <h3 className="lp-display text-[17px] leading-snug text-forest">{item.title}</h3>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink-muted">
              {item.detail}
            </p>
            {item.reference ? (
              <a
                href={item.reference.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 inline-flex items-center gap-1 font-mono text-[11px] text-gold-deep underline decoration-gold/40 underline-offset-2 hover:decoration-gold"
              >
                {item.reference.label}
                <ArrowUpRight className="size-3" />
              </a>
            ) : null}
          </RegisterRow>
        ))}
      </Register>
    </div>
  );
}
