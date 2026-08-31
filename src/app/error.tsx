"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand";

/**
 * Route-level boundary. A rendering bug in any one section degrades to this
 * instead of blanking the page mid-demo.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ignition] render error", error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-24 text-center">
      <Logo />
      <AlertTriangle className="mt-10 size-7 text-clay" />
      <h1 className="lp-display mt-5 text-[26px] text-forest">Something broke on this page</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
        The validation itself may have completed — this is a display fault. Try again, and if it
        persists, start a fresh run.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-[11px] text-ink-subtle">ref {error.digest}</p>
      ) : null}
      <div className="mt-7 flex gap-2">
        <Button onClick={reset}>
          <RotateCcw className="size-4" />
          Try again
        </Button>
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-xl border border-line-strong bg-paper-raised px-4 text-sm font-medium text-ink transition-colors hover:border-forest/35 hover:bg-emerald-soft"
        >
          Start a new idea
        </Link>
      </div>
    </main>
  );
}
