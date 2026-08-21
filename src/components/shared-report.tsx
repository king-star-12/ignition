"use client";

import { Results } from "@/components/results";
import type { ValidationRun } from "@/lib/analysis/schemas";

/** Read-only view of a saved run, used by /r/[id]. */
export function SharedReport({ run, filedAt }: { run: ValidationRun; filedAt: string }) {
  return <Results run={run} readOnly filedAt={filedAt} />;
}
