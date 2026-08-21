import { buildActionPlan } from "./actions";
import type { LaunchPlan, ValidationRun } from "./schemas";
import { SCORE_LABELS } from "./scoring";

/**
 * The brief is assembled deterministically from data the user can already see,
 * so it can never introduce a claim the dashboard did not show. It mirrors the
 * on-screen case file, down to the exhibit numbering.
 */
export function buildLaunchBrief(run: ValidationRun, generatedAt: string): LaunchPlan {
  const { analysis, evidence, synthesis, domains, sources } = run;
  const title = `${analysis.category} — Case File`;

  // Exhibits are numbered once; every citation below refers to these numbers.
  const exhibitNumber = new Map(
    evidence.results.map((result, index) => [result.url, index + 1]),
  );
  const cite = (urls: string[]): string => {
    const numbers = urls
      .map((url) => exhibitNumber.get(url))
      .filter((value): value is number => typeof value === "number");
    if (numbers.length === 0) return " _(inference — no exhibit)_";
    return ` _(ex. ${numbers.join(", ")})_`;
  };

  const lines: string[] = [];
  const push = (...entries: string[]) => lines.push(...entries);

  push(`# Case file — ${analysis.idea}`, "");
  push(
    `**Finding:** ${synthesis.verdict} · **Viability:** ${synthesis.viability.overall}/100 · **Mode:** ${
      run.mode === "scrutiny" ? "Cross-examination" : "Validation"
    }`,
    "",
  );
  push(`_Filed by LaunchPilot on ${generatedAt}._`, "");

  const demoParts = [
    sources.llm === "demo" ? "analysis" : null,
    sources.research === "demo" ? "web research" : null,
    sources.domains === "demo" ? "domain availability" : null,
  ].filter(Boolean);
  if (demoParts.length) {
    push(
      `> **Sample data notice:** the ${demoParts.join(", ")} in this file is sample data, not live results.`,
      "",
    );
  }

  push(synthesis.executiveSummary, "");
  push(`**${synthesis.verdict}** — ${synthesis.verdictReason}`, "");

  push(`| Dimension | Score |`, `| --- | --- |`);
  for (const [key, label] of Object.entries(SCORE_LABELS)) {
    push(`| ${label} | ${synthesis.viability[key as keyof typeof SCORE_LABELS]} |`);
  }
  push(`| **Overall** | **${synthesis.viability.overall}** |`, "");

  push(`## I. The idea`, "");
  push(`- **Problem:** ${analysis.problem}`);
  push(`- **Customer:** ${analysis.targetCustomer}`);
  push(`- **Solution:** ${analysis.proposedSolution}`);
  push(`- **Category:** ${analysis.category}`, "");

  push(`## II. The field`, "");
  if (synthesis.competitors.length === 0) {
    push("No competitor was identified in the evidence.", "");
  } else {
    for (const competitor of synthesis.competitors) {
      push(`### ${competitor.name}${cite(competitor.sourceUrls)}`);
      if (competitor.description) push(competitor.description);
      if (competitor.strengths.length) push(`- Strengths: ${competitor.strengths.join("; ")}`);
      if (competitor.weaknesses.length) push(`- Weaknesses: ${competitor.weaknesses.join("; ")}`);
      if (competitor.pricingNote) push(`- Pricing: ${competitor.pricingNote}`);
      push("");
    }
  }

  push(`## III. On the ground`, "");
  for (const pain of synthesis.customerPainPoints) {
    push(`- **${pain.pain}**${cite(pain.sourceUrls)}`);
    if (pain.quote) push(`  > ${pain.quote}`);
    if (pain.whyItMatters) push(`  ${pain.whyItMatters}`);
  }
  if (synthesis.marketSignals.length) {
    push("", `**Market signals**`, "");
    for (const signal of synthesis.marketSignals) {
      push(`- ${signal.signal} — _${signal.confidence}_${cite(signal.sourceUrls)}`);
      if (signal.interpretation) push(`  ${signal.interpretation}`);
    }
  }
  push("");

  push(`## IV. The case`, "");
  push(`**For**`, "");
  for (const item of [...synthesis.opportunities, ...synthesis.differentiation]) {
    push(`- ${item}`);
  }
  push("", `**Against**`, "");
  for (const risk of synthesis.risks) {
    push(`- **[${risk.severity.toUpperCase()}]** ${risk.risk}${risk.mitigation ? ` — ${risk.mitigation}` : ""}`);
  }
  push("");

  push(`## V. What to build`, "");
  synthesis.mvpFeatures.forEach((feature, index) =>
    push(`${index + 1}. **${feature.feature}**${feature.why ? ` — ${feature.why}` : ""}`),
  );
  if (synthesis.monetizationIdeas.length) {
    push("", `**Business model**`, "");
    synthesis.monetizationIdeas.forEach((idea) =>
      push(
        `- **${idea.model}**${idea.detail ? ` — ${idea.detail}` : ""}${
          idea.suggestedPrice ? ` (${idea.suggestedPrice})` : ""
        }`,
      ),
    );
  }
  if (synthesis.goToMarket.length) {
    push("", `**First channels**`, "");
    synthesis.goToMarket.forEach((item) => push(`- ${item}`));
  }
  push("");

  push(`## VI. The name`, "");
  push(
    sources.domains === "live"
      ? `_Availability checked live via the name.com API._`
      : `_Sample availability — not a live name.com check._`,
    "",
  );
  for (const candidate of domains.candidates) {
    const status =
      candidate.available === null ? "UNKNOWN" : candidate.available ? "AVAILABLE" : "TAKEN";
    const price = candidate.price !== null ? ` — $${candidate.price.toFixed(2)}` : "";
    push(`- \`${candidate.domain}\` — ${status}${price}`);
  }
  if (domains.best) push("", `**Recommended:** \`${domains.best.domain}\``);
  push("");

  const plan = buildActionPlan(run);
  push(`## VII. Orders`, "", plan.headline, "");
  for (const item of plan.items) {
    push(`### ${item.window} — ${item.title}`);
    push(item.detail);
    if (item.reference) push(`- ${item.reference.url}`);
    push("");
  }

  push(`## VIII. On the record`, "");
  if (synthesis.evidenceGaps.length) {
    push(`**Not verified by the evidence**`, "");
    synthesis.evidenceGaps.forEach((gap) => push(`- ${gap}`));
    push("");
  }
  if (analysis.initialHypotheses.length) {
    push(`**Still to test with real people**`, "");
    analysis.initialHypotheses.forEach((item) => push(`- ${item}`));
    push("");
  }

  push(`## Exhibits`, "");
  push(
    sources.research === "live"
      ? `_${evidence.results.length} sources retrieved live from the web._`
      : `_${evidence.results.length} sample sources — not live search results._`,
    "",
  );
  evidence.results.forEach((result, index) =>
    push(`${index + 1}. [${result.title}](${result.url}) — ${result.source}`),
  );
  push("");

  return { title, markdown: lines.join("\n"), generatedAt };
}
