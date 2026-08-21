import { NextResponse } from "next/server";
import { describeLlm } from "@/lib/ai/provider";
import {
  env,
  hasLlmCredentials,
  hasNamecomCredentials,
  hasSerpapiCredentials,
  isGlobalDemoMode,
} from "@/lib/env";
import { fetchSerpapiQuota } from "@/lib/research/quota";
import { probeNamecom } from "@/lib/domains/namecom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Configuration probe for the UI banner and for pre-demo checks.
 * Reports whether keys exist — never their values.
 *
 *   /api/health                 what is configured
 *   /api/health?probe=llm       plus one tiny live model call
 *   /api/health?probe=serpapi   plus remaining search quota
 *   /api/health?probe=namecom   plus one free availability check
 *   /api/health?probe=all       all three
 */
export async function GET(request: Request) {
  const llm = describeLlm();
  const probe = new URL(request.url).searchParams.get("probe") ?? "";
  const wants = (name: string) => probe === "all" || probe === name;

  const status: Record<string, unknown> = {
    demoMode: isGlobalDemoMode(),
    llm: {
      configured: llm.configured,
      provider: llm.provider,
      model: llm.model,
      preferred: env.aiProvider,
    },
    serpapi: { configured: hasSerpapiCredentials() },
    namecom: { configured: hasNamecomCredentials() },
  };

  if (wants("serpapi") && hasSerpapiCredentials()) {
    status.serpapiQuota = await fetchSerpapiQuota();
  }

  if (wants("namecom")) {
    status.namecomProbe = await probeNamecom();
  }

  if (wants("llm") && hasLlmCredentials() && !isGlobalDemoMode()) {
    try {
      const { getLlmProvider } = await import("@/lib/ai/provider");
      const text = await getLlmProvider().generateText({
        system: "You are a health check. Reply with exactly one word.",
        prompt: "Reply with the word: ok",
        maxTokens: 400,
        reasoningEffort: "low",
        timeoutMs: 20_000,
      });
      status.probe = { ok: true, reply: text.slice(0, 40) };
    } catch (error) {
      status.probe = {
        ok: false,
        error: error instanceof Error ? error.message : "unknown",
      };
    }
  }

  return NextResponse.json(status);
}
