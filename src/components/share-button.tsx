"use client";

import { useState } from "react";
import { Check, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareButton({
  shareId,
  saveAttempted = false,
}: {
  shareId: string | null;
  saveAttempted?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (!shareId) {
    // Saving is best-effort. If it failed there is nothing to share, and
    // spinning forever would suggest the whole run is still in progress.
    return saveAttempted ? (
      <span className="lp-margin-note text-ink-subtle" title="The report could not be saved">
        Not saved
      </span>
    ) : (
      <Button size="sm" variant="secondary" disabled>
        <Loader2 className="size-3.5 animate-spin" />
        Saving
      </Button>
    );
  }

  const copy = async () => {
    const url = `${window.location.origin}/r/${shareId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link:", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <Button size="sm" variant="secondary" onClick={copy}>
      {copied ? <Check className="size-3.5 text-emerald-brand" /> : <Link2 className="size-3.5" />}
      {copied ? "Link copied" : "Share report"}
    </Button>
  );
}
