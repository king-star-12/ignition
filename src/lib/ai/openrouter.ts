import "server-only";
import { env } from "@/lib/env";
import { createOpenAICompatibleProvider } from "./openai-compatible";
import { LlmError, type LlmProvider } from "./types";

export function createOpenRouterProvider(): LlmProvider {
  if (!env.openrouterApiKey) {
    throw new LlmError("missing_credentials", "openrouter", "OPENROUTER_API_KEY is not set");
  }
  return createOpenAICompatibleProvider({
    id: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: env.openrouterApiKey,
    model: env.openrouterModel,
    // OpenRouter's free router may land on a model without JSON mode.
    supportsJsonMode: false,
    extraHeaders: {
      "HTTP-Referer": "https://launchpilot.local",
      "X-Title": "LaunchPilot",
    },
  });
}
