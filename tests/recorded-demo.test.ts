import { describe, expect, it } from "vitest";
import recorded from "@/lib/demo/recorded-run.json";
import { ValidationRunSchema } from "@/lib/analysis/schemas";
import { buildActionPlan } from "@/lib/analysis/actions";
import { buildLaunchBrief } from "@/lib/analysis/brief";

/**
 * The recorded run is what a live audience sees. If it ever stops parsing or
 * loses its citations, the demo breaks — so it is checked like source code.
 */
describe("recorded demo run", () => {
  const parsed = ValidationRunSchema.safeParse(recorded);

  it("matches the run schema", () => {
    if (!parsed.success) {
      throw new Error(
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      );
    }
    expect(parsed.success).toBe(true);
  });

  it("is marked as recorded, so the UI can never present it as happening live", () => {
    expect(recorded.recordedAt).toBeTruthy();
    expect(() => new Date(recorded.recordedAt).toISOString()).not.toThrow();
  });

  it("captured genuinely live research and analysis", () => {
    expect(recorded.sources.research).toBe("live");
    expect(recorded.sources.llm).toBe("live");
  });

  it("carries enough evidence to be worth showing", () => {
    expect(recorded.evidence.results.length).toBeGreaterThanOrEqual(10);
    expect(recorded.synthesis.competitors.length).toBeGreaterThanOrEqual(2);
    expect(recorded.synthesis.mvpFeatures.length).toBeGreaterThanOrEqual(2);
  });

  it("cites nothing that is absent from its own exhibit register", () => {
    const allowed = new Set(recorded.evidence.results.map((result) => result.url));
    const cited = [
      ...recorded.synthesis.competitors.flatMap((item) => item.sourceUrls),
      ...recorded.synthesis.customerPainPoints.flatMap((item) => item.sourceUrls),
      ...recorded.synthesis.marketSignals.flatMap((item) => item.sourceUrls),
    ];
    expect(cited.filter((url) => !allowed.has(url))).toEqual([]);
  });

  it("has a verdict consistent with its own sub-scores", () => {
    const { viability, verdict } = recorded.synthesis;
    const expected =
      viability.overall >= 70 ? "BUILD" : viability.overall >= 45 ? "REFINE" : "SHELVE";
    expect(verdict).toBe(expected);
  });

  it("produces a full week of orders", () => {
    if (!parsed.success) throw new Error("recorded run does not parse");
    expect(buildActionPlan(parsed.data).items.length).toBeGreaterThanOrEqual(5);
  });

  it("produces a complete brief", () => {
    if (!parsed.success) throw new Error("recorded run does not parse");
    const { markdown } = buildLaunchBrief(parsed.data, "recorded");
    expect(markdown).toContain("## VII. Orders");
    expect(markdown).toContain("## Exhibits");
  });
});
