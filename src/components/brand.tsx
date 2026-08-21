import { cn } from "@/lib/utils";

export function Logo({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Seal />
      <span
        className={cn(
          "lp-display text-[17px] tracking-tight",
          onDark ? "text-paper" : "text-forest",
        )}
      >
        Launch<span className="text-gold-deep">Pilot</span>
      </span>
    </span>
  );
}

/** Gold seal with a pine/compass mark — the recurring brand device. */
export function Seal({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "lp-seal relative grid size-8 shrink-0 place-items-center rounded-full",
        "shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_6px_16px_-8px_rgba(126,98,18,0.8)]",
        className,
      )}
    >
      <span className="absolute inset-[3px] rounded-full border border-forest-deep/25" />
      <svg viewBox="0 0 24 24" className="relative size-4 text-forest-deep" aria-hidden>
        <path
          fill="currentColor"
          d="M12 2.4c2.9 2.4 4.5 5.8 4.5 9.5v3l1.9 1.9v2.3l-3.2-1.1a4.4 4.4 0 0 1-6.4 0L5.6 19.1v-2.3l1.9-1.9v-3c0-3.7 1.6-7.1 4.5-9.5Zm0 5.4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"
        />
      </svg>
    </span>
  );
}
