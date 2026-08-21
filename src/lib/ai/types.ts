import type { ZodType } from "zod";

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ReasoningEffort = "low" | "medium" | "high";

export type GenerateTextOptions = {
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  reasoningEffort?: ReasoningEffort;
};

export type GenerateStructuredOptions<T> = {
  system?: string;
  prompt: string;
  schema: ZodType<T>;
  /** Human-readable JSON shape shown to the model. */
  shapeHint: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  reasoningEffort?: ReasoningEffort;
};

export interface LlmProvider {
  readonly id: string;
  readonly model: string;
  generateText(options: GenerateTextOptions): Promise<string>;
  generateStructuredResponse<T>(options: GenerateStructuredOptions<T>): Promise<T>;
}

export type LlmErrorKind =
  | "missing_credentials"
  | "http_error"
  | "timeout"
  | "invalid_json"
  | "schema_mismatch"
  | "truncated"
  | "empty_response";

export class LlmError extends Error {
  readonly kind: LlmErrorKind;
  readonly provider: string;
  readonly detail?: string;

  constructor(kind: LlmErrorKind, provider: string, message: string, detail?: string) {
    super(message);
    this.name = "LlmError";
    this.kind = kind;
    this.provider = provider;
    this.detail = detail;
  }
}
