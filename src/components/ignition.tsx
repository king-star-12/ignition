"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Landing } from "@/components/landing";
import { Pipeline } from "@/components/pipeline";
import { Results } from "@/components/results";
import { Button } from "@/components/ui/button";
import { useValidationRun } from "@/components/use-run";
import type { AppConfig } from "@/components/config-banner";
import {
  getHistoryServerSnapshot,
  getHistorySnapshot,
  recordRun,
  subscribeHistory,
} from "@/lib/history";
import type { ValidationRun } from "@/lib/analysis/schemas";

export function Ignition({ config }: { config: AppConfig }) {
  const history = useSyncExternalStore(
    subscribeHistory,
    getHistorySnapshot,
    getHistoryServerSnapshot,
  );

  const onComplete = useCallback((run: ValidationRun, shareId: string | null) => {
    recordRun(run, shareId);
  }, []);

  const { state, start, startRecorded, reset, completedRun } = useValidationRun({ onComplete });

  // /?demo=1 plays the recorded investigation on load — a link you can send a
  // judge, and what the demo video is captured from.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current) return;
    if (!new URLSearchParams(window.location.search).has("demo")) return;
    autoStarted.current = true;
    // A beat before starting, so the landing page paints first.
    const timer = setTimeout(() => void startRecorded(), 400);
    return () => clearTimeout(timer);
  }, [startRecorded]);

  if (state.phase === "error") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center px-5 py-24 text-center">
        <AlertTriangle className="size-8 text-clay" />
        <h1 className="lp-display mt-5 text-[21px] text-forest">That run did not finish</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{state.error}</p>
        <Button className="mt-6" variant="secondary" onClick={reset}>
          <RotateCcw className="size-4" />
          Start over
        </Button>
      </div>
    );
  }

  if (completedRun) {
    return (
      <>
        {state.notes.length ? <NoteStrip notes={state.notes} /> : null}
        <Results
          run={completedRun}
          onReset={reset}
          shareId={state.shareId}
          saveAttempted={state.saveAttempted}
        />
      </>
    );
  }

  if (state.phase === "running") {
    return <Pipeline state={state} />;
  }

  return (
    <Landing
      config={config}
      onStart={start}
      onRunDemo={startRecorded}
      history={history}
    />
  );
}

/** Surfaces every fallback that happened during the run, in plain language. */
function NoteStrip({ notes }: { notes: string[] }) {
  const unique = Array.from(new Set(notes));
  return (
    <div className="lp-no-print border-b border-gold-deep/25 bg-gold-soft">
      <div className="mx-auto flex w-full max-w-5xl items-start gap-2.5 px-5 py-2.5">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-gold-deep" />
        <ul className="space-y-0.5 text-xs leading-relaxed text-gold-deep">
          {unique.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
