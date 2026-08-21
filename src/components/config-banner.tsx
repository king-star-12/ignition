import { cn } from "@/lib/utils";

export type AppConfig = {
  demoMode: boolean;
  llmConfigured: boolean;
  llmProvider: string;
  llmModel: string;
  serpapiConfigured: boolean;
  namecomConfigured: boolean;
};

/**
 * Always-visible statement of what is live and what is sample data, set as a
 * colophon rather than a row of pills. The demo depends on judges being able
 * to trust this line.
 */
export function ConfigBanner({ config }: { config: AppConfig }) {
  const integrations = [
    { name: "Analysis", live: config.llmConfigured && !config.demoMode },
    { name: "Search", live: config.serpapiConfigured && !config.demoMode },
    { name: "Names", live: config.namecomConfigured && !config.demoMode },
  ];

  return (
    <div className="flex flex-col items-center gap-2">
      {config.demoMode ? (
        <p className="lp-margin-note text-gold-deep">
          Demo mode — every stage uses deterministic sample data
        </p>
      ) : null}
      <dl className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 border-y border-line px-1 py-2">
        {integrations.map((integration) => (
          <div key={integration.name} className="flex items-baseline gap-2">
            <dt className="lp-margin-note">{integration.name}</dt>
            <dd
              className={cn(
                "flex items-center gap-1.5 text-[12px]",
                integration.live ? "text-emerald-brand" : "text-gold-deep",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  integration.live ? "bg-emerald-brand" : "bg-gold",
                )}
              />
              {integration.live ? "live" : "sample"}
            </dd>
          </div>
        ))}
        {config.llmConfigured && !config.demoMode ? (
          <span className="font-mono text-[11px] text-ink-subtle">{config.llmModel}</span>
        ) : null}
      </dl>
    </div>
  );
}
