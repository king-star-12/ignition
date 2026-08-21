import { describe, expect, it } from "vitest";
import { buildActionPlan } from "@/lib/analysis/actions";
import { buildCandidates } from "@/lib/domains/namecom";
import { demoDomainReport, demoEvidenceFor, demoIdeaAnalysis, demoSynthesis } from "@/lib/demo/fixtures";
import { DEMO_IDEA } from "@/lib/constants";
import type { ValidationRun, ViabilityAnalysis } from "@/lib/analysis/schemas";

function makeRun(overrides: Partial<ValidationRun> = {}): ValidationRun {
  const analysis = demoIdeaAnalysis(DEMO_IDEA, "validate");
  const evidence = demoEvidenceFor(analysis, ["q"], "note");
  return {
    mode: "validate",
    analysis,
    evidence,
    synthesis: demoSynthesis(analysis, evidence, "validate"),
    domains: demoDomainReport(buildCandidates(analysis), "note"),
    sources: { llm: "demo", research: "demo", domains: "demo" },
    ...overrides,
  };
}

function withVerdict(run: ValidationRun, verdict: ViabilityAnalysis["verdict"]): ValidationRun {
  return { ...run, synthesis: { ...run.synthesis, verdict } };
}

describe("buildActionPlan", () => {
  it("produces a week of steps", () => {
    const plan = buildActionPlan(makeRun());
    expect(plan.items.length).toBeGreaterThanOrEqual(5);
    expect(plan.items.length).toBeLessThanOrEqual(7);
  });

  it("assigns contiguous windows that stay inside seven days", () => {
    const plan = buildActionPlan(makeRun());
    const days = plan.items.flatMap((item) =>
      item.window.replace(/Days? /, "").split("–").map(Number),
    );
    expect(Math.min(...days)).toBe(1);
    expect(Math.max(...days)).toBe(7);
  });

  it("names the actual competitor from this run", () => {
    const run = makeRun();
    const plan = buildActionPlan(run);
    const text = plan.items.map((item) => item.title).join(" ");
    expect(text).toContain(run.synthesis.competitors[0].name);
  });

  it("tells a BUILD verdict to register the recommended domain", () => {
    const run = withVerdict(makeRun(), "BUILD");
    const plan = buildActionPlan(run);
    const secure = plan.items.find((item) => item.kind === "secure");
    expect(secure?.title).toContain(run.domains.best?.domain ?? "");
  });

  it("asks fewer interviews when the verdict is already BUILD", () => {
    const build = buildActionPlan(withVerdict(makeRun(), "BUILD"));
    const refine = buildActionPlan(withVerdict(makeRun(), "REFINE"));
    expect(build.items[0].title).toContain("5");
    expect(refine.items[0].title).toContain("10");
  });

  it("switches to salvage-and-decide steps on a SHELVE verdict", () => {
    const plan = buildActionPlan(withVerdict(makeRun(), "SHELVE"));
    expect(plan.headline).toMatch(/not yet/i);
    expect(plan.items.some((item) => item.kind === "decide")).toBe(true);
    expect(plan.items.some((item) => item.kind === "secure")).toBe(false);
    expect(plan.items.some((item) => item.kind === "build")).toBe(false);
  });

  it("never recommends registering a domain that was taken", () => {
    const run = makeRun();
    const plan = buildActionPlan({
      ...withVerdict(run, "BUILD"),
      domains: { ...run.domains, best: null },
    });
    expect(plan.items.some((item) => item.kind === "secure")).toBe(false);
  });

  it("survives a synthesis with nothing in it", () => {
    const run = makeRun();
    const empty: ViabilityAnalysis = {
      ...run.synthesis,
      competitors: [],
      customerPainPoints: [],
      mvpFeatures: [],
      monetizationIdeas: [],
      evidenceGaps: [],
      differentiation: [],
      opportunities: [],
    };
    const plan = buildActionPlan({
      ...run,
      synthesis: empty,
      evidence: { ...run.evidence, results: [] },
      domains: { ...run.domains, best: null },
    });
    expect(plan.items.length).toBeGreaterThan(0);
    // Fewer surviving steps simply spread wider across the same week.
    expect(plan.items[0].window).toMatch(/^Days? 1/);
  });
});

describe("action plan provenance", () => {
  const base = withVerdict(makeRun(), "BUILD");

  it("tells you to register the domain when the check was live", () => {
    const plan = buildActionPlan({
      ...base,
      sources: { ...base.sources, domains: "live" },
    });
    const secure = plan.items.find((item) => item.kind === "secure");
    expect(secure?.title).toMatch(/^Register /);
  });

  it("never tells you to register a domain checked with sample data", () => {
    const plan = buildActionPlan({
      ...base,
      sources: { ...base.sources, domains: "demo" },
    });
    const secure = plan.items.find((item) => item.kind === "secure");
    expect(secure?.title).not.toMatch(/^Register /);
    expect(secure?.detail).toMatch(/sample availability/i);
  });
});
