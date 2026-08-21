import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-forest text-paper border border-forest-deep/60 shadow-[0_1px_0_rgba(255,255,255,0.28)_inset,0_10px_24px_-14px_rgba(12,59,42,0.85)] hover:bg-forest-mid",
  gold:
    "lp-seal text-forest-deep border border-gold-deep/45 shadow-[0_1px_0_rgba(255,255,255,0.45)_inset,0_10px_24px_-14px_rgba(126,98,18,0.7)] hover:brightness-[1.06]",
  secondary:
    "bg-paper-raised text-ink border border-line-strong hover:border-forest/35 hover:bg-emerald-soft/60",
  ghost: "text-ink-muted hover:text-forest hover:bg-emerald-soft/70",
  danger:
    "bg-paper-raised text-clay border border-clay/35 hover:bg-clay-soft hover:border-clay/60",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 text-sm rounded-xl gap-2",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        "disabled:opacity-45 disabled:pointer-events-none active:scale-[0.985]",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
