import "server-only";
import { extractJsonObject } from "./json";
import {
  LlmError,
  type GenerateStructuredOptions,
  type GenerateTextOptions,
  type LlmProvider,
  type ReasoningEffort,
} from "./types";

type ClientConfig = {
  id: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  extraHeaders?: Record<string, string>;
  supportsJsonMode?: boolean;
  /** Reasoning models (Groq's gpt-oss family) accept a reasoning_effort knob. */
  supportsReasoningEffort?: boolean;
};

const DEFAULT_TIMEOUT_MS = 45_000;
const MIN_COMPLETION_TOKENS = 1_500;
const MAX_RETRY_WAIT_SECONDS = 25;

/**
 * Groq and OpenRouter both speak the OpenAI chat-completions dialect, so one
 * client covers both. Everything here runs server-side only.
 */
export function createOpenAICompatibleProvider(config: ClientConfig): LlmProvider {
  async function chat(
    messages: Array<{ role: string; content: string }>,
    options: {
      temperature?: number;
      maxTokens?: number;
      timeoutMs?: number;
      json?: boolean;
      reasoningEffort?: ReasoningEffort;
    },
    attempt = 0,
  ): Promise<string> {
    const maxTokens = options.maxTokens ?? 4000;
    const body: Record<string, unknown> = {
      model: config.model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: maxTokens,
    };
    if (options.json && config.supportsJsonMode !== false) {
      body.response_format = { type: "json_object" };
    }
    // Reasoning tokens are billed against max_tokens, so keeping the effort low
    // is what stops a demo-length request from being truncated mid-answer.
    if (options.reasoningEffort && config.supportsReasoningEffort) {
      body.reasoning_effort = options.reasoningEffort;
    }

    let response: Response;
    try {
      response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          ...config.extraHeaders,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (name === "TimeoutError" || name === "AbortError") {
        throw new LlmError("timeout", config.id, `${config.id} request timed out`);
      }
      throw new LlmError("http_error", config.id, `${config.id} request failed`, String(error));
    }

    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 400);

      // Free tiers meter prompt + completion together. When the reservation is
      // what blew the budget, ask for less rather than failing the run.
      const overTokenBudget =
        response.status === 413 ||
        (response.status === 400 && /rate_limit|too large/i.test(detail));
      if (overTokenBudget && attempt < 1 && maxTokens > MIN_COMPLETION_TOKENS) {
        const reduced = Math.max(MIN_COMPLETION_TOKENS, Math.floor(maxTokens / 2));
        console.warn(
          `[${config.id}] token budget exceeded, retrying with max_tokens=${reduced}`,
        );
        return chat(messages, { ...options, maxTokens: reduced }, attempt + 1);
      }

      // A short per-minute window is worth waiting out once.
      if (response.status === 429 && attempt < 1) {
        // Groq puts the wait in the body when it omits the header.
        const fromBody = detail.match(/try again in ([\d.]+)s/i);
        const waitSeconds =
          Number(response.headers.get("retry-after") ?? "0") ||
          (fromBody ? Math.ceil(Number(fromBody[1])) + 1 : 0);
        if (waitSeconds > 0 && waitSeconds <= MAX_RETRY_WAIT_SECONDS) {
          await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
          return chat(messages, options, attempt + 1);
        }
      }

      throw new LlmError(
        "http_error",
        config.id,
        `${config.id} returned ${response.status}`,
        detail,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    };
    const choice = payload.choices?.[0];
    const content = choice?.message?.content?.trim();

    if (!content) {
      if (choice?.finish_reason === "length") {
        throw new LlmError(
          "truncated",
          config.id,
          `${config.id} hit the token limit before producing an answer`,
          "Raise maxTokens or lower reasoningEffort for this call.",
        );
      }
      throw new LlmError("empty_response", config.id, `${config.id} returned no content`);
    }
    return content;
  }

  return {
    id: config.id,
    model: config.model,

    async generateText(options: GenerateTextOptions) {
      const messages = [
        ...(options.system ? [{ role: "system", content: options.system }] : []),
        { role: "user", content: options.prompt },
      ];
      return chat(messages, {
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        timeoutMs: options.timeoutMs,
        reasoningEffort: options.reasoningEffort,
      });
    },

    async generateStructuredResponse<T>(options: GenerateStructuredOptions<T>): Promise<T> {
      const system = [
        options.system ?? "",
        "",
        "You must reply with a single valid JSON object and nothing else.",
        "No markdown fences, no commentary, no trailing text.",
        "Match this shape exactly:",
        options.shapeHint,
      ].join("\n");

      let lastError: LlmError | null = null;
      let repairHint = "";

      // One attempt, then one repair attempt that shows the model its own mistake.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        let raw = "";
        try {
          raw = await chat(
            [
              { role: "system", content: system },
              { role: "user", content: options.prompt + repairHint },
            ],
            {
              temperature: options.temperature ?? 0.2,
              maxTokens: options.maxTokens,
              timeoutMs: options.timeoutMs,
              json: true,
              reasoningEffort: options.reasoningEffort,
            },
          );
        } catch (error) {
          lastError = error instanceof LlmError
            ? error
            : new LlmError("http_error", config.id, String(error));
          repairHint = "";
          continue;
        }

        let parsed: unknown;
        try {
          parsed = extractJsonObject(raw);
        } catch {
          lastError = new LlmError(
            "invalid_json",
            config.id,
            `${config.id} did not return parseable JSON`,
            raw.slice(0, 300),
          );
          repairHint = "\n\nYour previous reply was not valid JSON. Reply with the JSON object only.";
          continue;
        }

        const result = options.schema.safeParse(parsed);
        if (result.success) return result.data;

        const issues = result.error.issues
          .slice(0, 6)
          .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
          .join("; ");
        lastError = new LlmError(
          "schema_mismatch",
          config.id,
          `${config.id} response did not match the expected schema`,
          issues,
        );
        repairHint = `\n\nYour previous reply failed validation (${issues}). Fix those fields and return the complete JSON object again.`;
      }

      throw lastError ?? new LlmError("schema_mismatch", config.id, "structured generation failed");
    },
  };
}
