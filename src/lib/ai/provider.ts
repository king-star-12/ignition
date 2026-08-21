import "server-only";
import { env, hasLlmCredentials } from "@/lib/env";
import { createGroqProvider } from "./groq";
import { createOpenRouterProvider } from "./openrouter";
import { LlmError, type LlmProvider } from "./types";

export { LlmError };
export type { LlmProvider };

/**
 * Selects the provider named by AI_PROVIDER, falling back to whichever
 * provider actually has credentials. Throws if neither does.
 */
export function getLlmProvider(): LlmProvider {
  const preferred = env.aiProvider;
  const order = preferred === "openrouter" ? ["openrouter", "groq"] : ["groq", "openrouter"];

  let firstError: LlmError | null = null;
  for (const id of order) {
    try {
      return id === "groq" ? createGroqProvider() : createOpenRouterProvider();
    } catch (error) {
      if (error instanceof LlmError && !firstError) firstError = error;
    }
  }

  throw firstError ??
    new LlmError(
      "missing_credentials",
      preferred,
      "No LLM credentials configured. Set GROQ_API_KEY or OPENROUTER_API_KEY.",
    );
}

export function describeLlm(): { provider: string; model: string; configured: boolean } {
  if (!hasLlmCredentials()) {
    return { provider: env.aiProvider, model: "unavailable", configured: false };
  }
  const provider = getLlmProvider();
  return { provider: provider.id, model: provider.model, configured: true };
}
