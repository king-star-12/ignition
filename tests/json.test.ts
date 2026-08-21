import { describe, expect, it } from "vitest";
import { extractJsonObject } from "@/lib/ai/json";

describe("extractJsonObject", () => {
  it("parses a bare JSON object", () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown fences", () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("ignores a chatty preamble", () => {
    expect(extractJsonObject('Sure! Here is the JSON:\n{"verdict":"BUILD"}')).toEqual({
      verdict: "BUILD",
    });
  });

  it("handles nested objects and braces inside strings", () => {
    const raw = 'Result: {"note":"use {curly} braces","nested":{"deep":[1,2]}} — done';
    expect(extractJsonObject(raw)).toEqual({
      note: "use {curly} braces",
      nested: { deep: [1, 2] },
    });
  });

  it("handles escaped quotes inside strings", () => {
    expect(extractJsonObject('{"quote":"they said \\"no\\""}')).toEqual({
      quote: 'they said "no"',
    });
  });

  it("throws on an empty response", () => {
    expect(() => extractJsonObject("   ")).toThrow();
  });

  it("throws on truncated JSON", () => {
    expect(() => extractJsonObject('{"a": 1, "b":')).toThrow();
  });
});
