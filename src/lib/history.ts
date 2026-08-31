"use client";

import type { ValidationRun } from "@/lib/analysis/schemas";

/**
 * Local history of validated ideas, exposed as an external store so React can
 * subscribe without an effect. Deliberately client-only — no account, nothing
 * leaves the browser beyond the run the server already produced.
 */

const KEY = "ignition.history.v1";
const LIMIT = 12;
const EMPTY: HistoryEntry[] = [];

export type HistoryEntry = {
  shareId: string | null;
  idea: string;
  category: string;
  mode: ValidationRun["mode"];
  verdict: ValidationRun["synthesis"]["verdict"];
  overall: number;
  createdAt: string;
};

let cache: HistoryEntry[] | null = null;
const listeners = new Set<() => void>();

function readStorage(): HistoryEntry[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const entries = parsed.filter(isEntry).slice(0, LIMIT);
    return entries.length ? entries : EMPTY;
  } catch {
    return EMPTY;
  }
}

function isEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.idea === "string" &&
    typeof entry.overall === "number" &&
    typeof entry.verdict === "string" &&
    typeof entry.createdAt === "string"
  );
}

function publish(next: HistoryEntry[]) {
  cache = next;
  for (const listener of listeners) listener();
}

export function subscribeHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Must return a stable reference between calls, so the cache is the snapshot. */
export function getHistorySnapshot(): HistoryEntry[] {
  if (cache === null) cache = readStorage();
  return cache;
}

export function getHistoryServerSnapshot(): HistoryEntry[] {
  return EMPTY;
}

export function recordRun(run: ValidationRun, shareId: string | null): void {
  const entry: HistoryEntry = {
    shareId,
    idea: run.analysis.idea,
    category: run.analysis.category,
    mode: run.mode,
    verdict: run.synthesis.verdict,
    overall: run.synthesis.viability.overall,
    createdAt: new Date().toISOString(),
  };

  // Re-validating the same idea replaces the earlier entry rather than stacking.
  const existing = getHistorySnapshot().filter(
    (item) => item.idea.trim().toLowerCase() !== entry.idea.trim().toLowerCase(),
  );
  const next = [entry, ...existing].slice(0, LIMIT);

  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode or a full quota — history is a convenience, not a requirement.
  }
  publish(next);
}

export function clearHistory(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  publish(EMPTY);
}
