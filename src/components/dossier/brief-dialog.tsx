"use client";

import { useEffect, useState } from "react";
import { Copy, Download, FileText, Loader2, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LaunchPlan, ValidationRun } from "@/lib/analysis/schemas";

export function BriefDialog({ run }: { run: ValidationRun }) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<LaunchPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const generate = async () => {
    setOpen(true);
    if (plan || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(run),
      });
      if (!response.ok) throw new Error("The launch brief could not be generated.");
      const payload = (await response.json()) as { plan: LaunchPlan };
      setPlan(payload.plan);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!plan) return;
    const blob = new Blob([plan.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "launchpilot-brief.md";
    link.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    if (!plan) return;
    await navigator.clipboard.writeText(plan.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <Button size="lg" onClick={generate}>
        <FileText className="size-4" />
        Generate Launch Brief
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-forest-deep/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Launch brief"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line-strong bg-paper-raised shadow-[0_40px_90px_-40px_rgba(6,35,26,0.7)]">
            <div className="lp-no-print flex items-center justify-between border-b border-line bg-paper-sunken px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <FileText className="size-4 text-gold-deep" />
                <span className="lp-display text-[15px] text-forest">Launch brief</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={copy} disabled={!plan}>
                  <Copy className="size-3.5" />
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => window.print()} disabled={!plan}>
                  <Printer className="size-3.5" />
                  Print
                </Button>
                <Button size="sm" variant="secondary" onClick={download} disabled={!plan}>
                  <Download className="size-3.5" />
                  .md
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)} aria-label="Close">
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            <div className="lp-scrollbar flex-1 overflow-y-auto px-6 py-5">
              {loading ? (
                <div className="flex items-center gap-2.5 py-12 text-sm text-ink-muted">
                  <Loader2 className="size-4 animate-spin" />
                  Assembling the brief…
                </div>
              ) : error ? (
                <p className="py-12 text-center text-sm text-clay">{error}</p>
              ) : plan ? (
                <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-ink">
                  {plan.markdown}
                </pre>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
