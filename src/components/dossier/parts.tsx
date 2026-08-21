import * as React from "react";
import { cn } from "@/lib/utils";

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

/**
 * A ruled section heading, set like a chapter mark in a printed report
 * rather than a card header.
 */
export function chapterId(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function Chapter({
  number,
  title,
  note,
  action,
  className,
  children,
}: {
  number: number;
  title: string;
  note?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={chapterId(title)} className={cn("lp-rise scroll-mt-20", className)}>
      <div className="flex items-baseline gap-3">
        <span className="lp-display shrink-0 text-[12px] tracking-[0.22em] text-gold-deep">
          {ROMAN[number] ?? number}
        </span>
        <h2 className="lp-eyebrow shrink-0 text-forest">{title}</h2>
        <span aria-hidden className="h-px flex-1 bg-line" />
        {action}
      </div>
      {note ? <p className="mt-3 max-w-2xl text-sm text-ink-muted">{note}</p> : null}
      <div className="mt-7">{children}</div>
    </section>
  );
}

/** A left-margin annotation — the marked-up-document device. */
export function MarginNote({ children }: { children: React.ReactNode }) {
  return <span className="lp-margin-note">{children}</span>;
}

/**
 * One row of a ruled register. The number lives in the margin, the content
 * runs full width, and hairlines do the work that borders would.
 */
export function RegisterRow({
  index,
  label,
  children,
  className,
}: {
  index?: string;
  label?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-5 py-5 sm:gap-7", className)}>
      <div className="w-16 shrink-0 pt-0.5 sm:w-24">
        {index ? (
          <div className="font-mono text-[11px] tabular-nums text-gold-deep">{index}</div>
        ) : null}
        {label ? <div className="mt-1">{label}</div> : null}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Register({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("lp-register border-y border-line-strong", className)}
      {...props}
    />
  );
}

/** Body copy set in columns — the clearest signal that this is a document. */
export function ColumnSet({
  children,
  dropCap = false,
  className,
}: {
  children: React.ReactNode;
  dropCap?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "lp-columns text-[15px] leading-[1.72] text-ink",
        dropCap && "lp-dropcap",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Statement({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5 py-4 sm:grid-cols-[9rem_1fr] sm:gap-7">
      <dt className="lp-eyebrow pt-0.5 text-ink-subtle">{term}</dt>
      <dd className="text-[15px] leading-relaxed text-ink">{children}</dd>
    </div>
  );
}
