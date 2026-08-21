import { LaunchPilot } from "@/components/launchpilot";
import type { AppConfig } from "@/components/config-banner";
import { describeLlm } from "@/lib/ai/provider";
import {
  hasNamecomCredentials,
  hasSerpapiCredentials,
  isGlobalDemoMode,
} from "@/lib/env";

export const dynamic = "force-dynamic";

export default function Home() {
  const llm = describeLlm();

  // Only booleans and non-secret identifiers cross to the client.
  const config: AppConfig = {
    demoMode: isGlobalDemoMode(),
    llmConfigured: llm.configured,
    llmProvider: llm.provider,
    llmModel: llm.model,
    serpapiConfigured: hasSerpapiCredentials(),
    namecomConfigured: hasNamecomCredentials(),
  };

  return (
    <main className="flex flex-1 flex-col">
      <LaunchPilot config={config} />
      <footer className="lp-no-print mt-auto border-t border-line px-5 py-6">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 text-[11px] text-ink-subtle">
          <span>LaunchPilot — live web evidence, then a decision.</span>
          <span className="font-mono">SerpApi · name.com · {config.llmProvider}</span>
        </div>
      </footer>
    </main>
  );
}
