"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Command = {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
};

/**
 * Keyboard access to the whole file. Hidden until ⌘K, which is the point —
 * on stage you can jump straight to the exhibit a judge just asked about
 * instead of scrolling through the document looking for it.
 */
export function CommandPalette({
  actions = [],
}: {
  actions?: Array<{ id: string; label: string; hint?: string; run: () => void }>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [chapters, setChapters] = useState<Command[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Chapters are read from the rendered document, so the palette never drifts
  // out of sync with what is actually on the page.
  const collectChapters = useCallback((): Command[] => {
    if (typeof document === "undefined") return [];
    return [...document.querySelectorAll<HTMLElement>("section[id]")].flatMap((section) => {
      const heading = section.querySelector("h2")?.textContent?.trim();
      if (!heading) return [];
      return [
        {
          id: `chapter:${section.id}`,
          label: heading,
          hint: "Chapter",
          run: () => {
            section.scrollIntoView({ behavior: "smooth", block: "start" });
            history.replaceState(null, "", `#${section.id}`);
          },
        },
      ];
    });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setChapters(collectChapters());
        setQuery("");
        setActive(0);
        setOpen((previous) => !previous);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collectChapters]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const commands = useMemo(() => [...actions, ...chapters], [actions, chapters]);
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter((command) => command.label.toLowerCase().includes(needle));
  }, [commands, query]);

  if (!open) return null;

  const choose = (command: Command | undefined) => {
    if (!command) return;
    setOpen(false);
    command.run();
  };

  return (
    <div
      className="lp-no-print fixed inset-0 z-[60] flex items-start justify-center bg-forest-deep/25 px-4 pt-[16vh] backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-line-strong bg-paper-raised shadow-[0_30px_80px_-30px_rgba(6,35,26,0.45)]">
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((index) => Math.min(index + 1, matches.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              choose(matches[active]);
            }
          }}
          placeholder="Jump to a chapter, or type an action…"
          aria-label="Search commands"
          className="w-full border-b border-line bg-transparent px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-subtle"
        />

        <ul className="lp-scrollbar max-h-[46vh] overflow-y-auto py-1.5">
          {matches.length === 0 ? (
            <li className="px-4 py-6 text-center text-[13px] text-ink-subtle">Nothing matches.</li>
          ) : (
            matches.map((command, index) => (
              <li key={command.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(command)}
                  className={cn(
                    "flex w-full items-baseline justify-between gap-4 px-4 py-2.5 text-left text-[14px] transition-colors",
                    index === active ? "bg-emerald-soft text-forest" : "text-ink",
                  )}
                >
                  <span className="truncate">{command.label}</span>
                  {command.hint ? (
                    <span className="lp-margin-note shrink-0">{command.hint}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
