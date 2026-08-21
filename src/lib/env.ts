import "server-only";

/**
 * Server-only environment access. Never import this from a client component.
 */

function read(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const env = {
  aiProvider: (read("AI_PROVIDER") ?? "groq").toLowerCase(),

  groqApiKey: read("GROQ_API_KEY"),
  groqModel: read("GROQ_MODEL") ?? "openai/gpt-oss-120b",

  openrouterApiKey: read("OPENROUTER_API_KEY"),
  openrouterModel: read("OPENROUTER_MODEL") ?? "openrouter/free",

  serpapiApiKey: read("SERPAPI_API_KEY"),
  braveApiKey: read("BRAVE_API_KEY"),
  /** Force a specific search provider; otherwise the chain decides. */
  searchProvider: read("SEARCH_PROVIDER")?.toLowerCase(),

  namecomApiKey: read("NAMECOM_API_KEY"),
  namecomUsername: read("NAMECOM_USERNAME"),
  namecomBaseUrl: read("NAMECOM_BASE_URL") ?? "https://api.name.com",

  demoMode: (read("DEMO_MODE") ?? "false").toLowerCase() === "true",
} as const;

/** True when the whole app is pinned to deterministic fixtures. */
export function isGlobalDemoMode(): boolean {
  return env.demoMode;
}

export function hasLlmCredentials(): boolean {
  return Boolean(env.groqApiKey || env.openrouterApiKey);
}

export function hasSerpapiCredentials(): boolean {
  return Boolean(env.serpapiApiKey);
}

export function hasNamecomCredentials(): boolean {
  return Boolean(env.namecomApiKey && env.namecomUsername);
}
