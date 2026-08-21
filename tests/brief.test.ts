import { describe, expect, it } from "vitest";
import { buildLaunchBrief } from "@/lib/analysis/brief";
import { demoDomainReport, demoIdeaAnalysis, demoSynthesis, demoEvidenceFor } from "@/lib/demo/fixtures";
import { buildCandidates } from "@/lib/domains/namecom";
import { DEMO_IDEA } from "@/lib/constants";
import type { ValidationRun } from "@/lib/analysis/schemas";

function makeRun(overrides: Partial<ValidationRun> = {}): ValidationRun {
  const analysis = demoIdeaAnalysis(DEMO_IDEA, "validate");
  const evidence = demoEvidenceFor(analysis, ["query one"], "note");
  return {
    mode: "validate",
    analysis,
    evidence,
    synthesis: demoSynthesis(analysis, evidence, "validate"),
    domains: demoDomainReport(buildCandidates(analysis), "note"),
    sources: { llm: "live", research: "live", domains: "live" },
    ...overrides,
  };
}

describe("buildLaunchBrief", () => {
  it("includes the verdict, score and every major section", () => {
    const { markdown } = buildLaunchBrief(makeRun(), "2026-01-01 09:00");
    for (const heading of [
      "## I. The idea",
      "## II. The field",
      "## III. On the ground",
      "## IV. The case",
      "## V. What to build",
      "## VI. The name",
      "## VII. Orders",
      "## VIII. On the record",
      "## Exhibits",
    ]) {
      expect(markdown).toContain(heading);
    }
    expect(markdown).toContain("REFINE");
  });

  it("marks live runs as live", () => {
    const { markdown } = buildLaunchBrief(makeRun(), "2026-01-01 09:00");
    expect(markdown).toContain("Availability checked live via the name.com API");
    expect(markdown).toContain("retrieved live from the web");
    expect(markdown).not.toContain("Sample data notice");
  });

  it("labels sample data instead of passing it off as live", () => {
    const run = makeRun({ sources: { llm: "demo", research: "demo", domains: "demo" } });
    const { markdown } = buildLaunchBrief(run, "2026-01-01 09:00");
    expect(markdown).toContain("Sample data notice");
    expect(markdown).toContain("analysis, web research, domain availability");
  });

  it("numbers exhibits and cites them by number", () => {
    const { markdown } = buildLaunchBrief(makeRun(), "2026-01-01 09:00");
    expect(markdown).toMatch(/\n1\. \[.+\]\(https?:/);
    expect(markdown).toMatch(/_\(ex\. \d/);
  });

  it("marks unsourced claims as inference rather than inventing a citation", () => {
    const run = makeRun();
    const stripped = {
      ...run,
      synthesis: {
        ...run.synthesis,
        competitors: run.synthesis.competitors.map((c) => ({ ...c, sourceUrls: [] })),
      },
    };
    const { markdown } = buildLaunchBrief(stripped, "2026-01-01 09:00");
    expect(markdown).toContain("inference — no exhibit");
  });

  it("is stable for the same input", () => {
    const run = makeRun();
    expect(buildLaunchBrief(run, "t").markdown).toBe(buildLaunchBrief(run, "t").markdown);
  });
});

describe("demo fixtures", () => {
  it("always label themselves as demo data", () => {
    const analysis = demoIdeaAnalysis(DEMO_IDEA, "validate");
    expect(demoEvidenceFor(analysis, [], "note").dataSource).toBe("demo");
    expect(demoDomainReport(buildCandidates(analysis), "note").dataSource).toBe("demo");
  });

  it("give a consistent verdict for the demo idea", () => {
    const analysis = demoIdeaAnalysis(DEMO_IDEA, "validate");
    const evidence = demoEvidenceFor(analysis, [], "note");
    const synthesis = demoSynthesis(analysis, evidence, "validate");
    expect(synthesis.verdict).toBe("REFINE");
    expect(synthesis.viability.overall).toBe(67);
  });

  it("score the adversarial run lower than the validate run", () => {
    const analysis = demoIdeaAnalysis(DEMO_IDEA, "scrutiny");
    const evidence = demoEvidenceFor(analysis, [], "note");
    const kill = demoSynthesis(analysis, evidence, "scrutiny");
    const validate = demoSynthesis(analysis, evidence, "validate");
    expect(kill.viability.overall).toBeLessThan(validate.viability.overall);
    // Locked because DEMO_SCRIPT.md quotes these two numbers.
    expect(kill.viability.overall).toBe(56);
    expect(validate.viability.overall).toBe(67);
  });

  it("structure an arbitrary idea without inventing market facts", () => {
    const analysis = demoIdeaAnalysis("A tool that books padel courts for casual players.", "validate");
    expect(analysis.competitorSearchQueries.length).toBe(2);
    expect(analysis.problem).toMatch(/not been verified/i);
  });
});

describe("demo synthesis provenance", () => {
  it("never attaches live source URLs to fixture findings", () => {
    const analysis = demoIdeaAnalysis(DEMO_IDEA, "validate");
    const demoEvidence = demoEvidenceFor(analysis, [], "note");
    // Same sources, but this time labelled as a real live search.
    const liveEvidence = { ...demoEvidence, dataSource: "live" as const };

    const fromLive = demoSynthesis(analysis, liveEvidence, "validate");
    const citations = [
      ...fromLive.competitors.flatMap((item) => item.sourceUrls),
      ...fromLive.customerPainPoints.flatMap((item) => item.sourceUrls),
      ...fromLive.marketSignals.flatMap((item) => item.sourceUrls),
    ];
    expect(citations).toEqual([]);
    expect(fromLive.evidenceGaps.join(" ")).toMatch(/sample text/i);
  });

  it("still cites sample sources when the evidence is also sample data", () => {
    const analysis = demoIdeaAnalysis(DEMO_IDEA, "validate");
    const evidence = demoEvidenceFor(analysis, [], "note");
    const synthesis = demoSynthesis(analysis, evidence, "validate");
    expect(synthesis.competitors[0].sourceUrls.length).toBeGreaterThan(0);
  });
});
