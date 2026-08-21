/**
 * LLM responses are text. Pull the first complete JSON object out of one,
 * tolerating markdown fences and short preambles.
 */
export function extractJsonObject(raw: string): unknown {
  const text = raw.trim();
  if (!text) throw new SyntaxError("empty response");

  const withoutFence = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const candidates = [withoutFence, sliceBalanced(withoutFence)];

  let lastError: unknown;
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new SyntaxError("unparseable JSON");
}

/** Scan for the outermost balanced {...}, ignoring braces inside strings. */
function sliceBalanced(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}
