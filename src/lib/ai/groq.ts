import "server-only";
import { env } from "@/lib/env";
import { createOpenAICompatibleProvider } from "./openai-compatible";
import { LlmError, type LlmProvider } from "./types";

export function createGroqProvider(): LlmProvider {
  if (!env.groqApiKey) {
    throw new LlmError("missing_credentials", "groq", "GROQ_API_KEY is not set");
  }
  return createOpenAICompatibleProvider({
    id: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: env.groqApiKey,
    model: env.groqModel,
    supportsJsonMode: true,
    supportsReasoningEffort: true,
  });
}
