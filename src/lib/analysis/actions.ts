import type { ValidationRun } from "./schemas";

/**
 * Turns the analysis into the week that follows it.
 *
 * Derived deterministically from the run — every item names a real competitor,
 * a real thread, a real gap or a real domain from this validation, so it can't
 * drift into generic advice and needs no extra model call.
 */

export type ActionKind = "talk" | "test" | "research" | "build" | "secure" | "decide";

export type ActionItem = {
  window: string;
  title: string;
  detail: string;
  kind: ActionKind;
  reference?: { label: string; url: string };
};

export type ActionPlan = {
  headline: string;
  items: ActionItem[];
};

const HEADLINES: Record<ValidationRun["synthesis"]["verdict"], string> = {
  BUILD: "The evidence supports building. This is the week that de-risks it.",
  REFINE: "Don't build yet. This is the week that decides it.",
  SHELVE: "The evidence says not this, not yet. This is the week that confirms it — or finds the idea worth keeping.",
};

export function buildActionPlan(run: ValidationRun): ActionPlan {
  const { analysis, evidence, synthesis, domains, sources } = run;
  const verdict = synthesis.verdict;
  const drafts: Array<Omit<ActionItem, "window">> = [];

  const interviewCount = verdict === "BUILD" ? 5 : 10;
  drafts.push({
    kind: "talk",
    title: `Interview ${interviewCount} people who match your customer`,
    detail: `Find ${analysis.targetCustomer.replace(/\.$/, "")}. Ask what they do today instead — never pitch. You are testing whether the problem is worth paying to remove.`,
  });

  const hypothesis = analysis.initialHypotheses[0];
  if (hypothesis) {
    drafts.push({
      kind: "test",
      title: "Test your riskiest assumption",
      detail: `"${hypothesis.replace(/"/g, "'")}" is still unproven. Design the cheapest test that could disprove it this week.`,
    });
  }

  const competitor = synthesis.competitors[0];
  if (competitor) {
    const weakness = competitor.weaknesses[0];
    drafts.push({
      kind: "research",
      title: `Use ${competitor.name} for a full day`,
      detail: weakness
        ? `Confirm the gap the research points at — "${weakness.replace(/"/g, "'")}". If it turns out to be solved, your differentiation collapses.`
        : `Learn what it already does well, so you stop planning to rebuild it.`,
      reference: competitor.sourceUrls[0]
        ? { label: hostOf(competitor.sourceUrls[0]), url: competitor.sourceUrls[0] }
        : undefined,
    });
  }

  const painSource =
    synthesis.customerPainPoints.find((pain) => pain.sourceUrls.length)?.sourceUrls[0] ??
    evidence.results.find((result) => result.category === "customer_pain")?.url;
  if (painSource) {
    drafts.push({
      kind: "talk",
      title: "Go where the complaints already are",
      detail:
        "Open the source the research surfaced and read what people actually wrote — the thread, the reviews, the replies. Then contact five of them. Their answers are cheaper than a survey and more honest.",
      reference: { label: hostOf(painSource), url: painSource },
    });
  }

  const gap = synthesis.evidenceGaps[0];
  if (gap) {
    drafts.push({
      kind: "research",
      title: "Close the biggest hole in the evidence",
      detail: `${gap.replace(/\.$/, "")}. Until that is answered, the score above is an estimate, not a finding.`,
    });
  }

  if (verdict === "SHELVE") {
    const wedge = synthesis.differentiation[0] ?? synthesis.opportunities[0];
    if (wedge) {
      drafts.push({
        kind: "decide",
        title: "Look for the narrower idea inside this one",
        detail: `The broad version does not survive the evidence, but "${wedge.replace(/"/g, "'")}" might. Re-run that as its own idea before you walk away.`,
      });
    }
    drafts.push({
      kind: "decide",
      title: "Make the call in writing",
      detail:
        "Write one paragraph: shelve, pivot, or continue, and what evidence would change your mind. Date it. Founders who skip this relitigate the same idea for months.",
    });
  } else {
    if (domains.best?.available) {
      // Sample availability must never be handed over as an instruction to buy.
      const checkedLive = sources.domains === "live";
      drafts.push({
        kind: "secure",
        title: checkedLive
          ? `Register ${domains.best.domain}`
          : `Check whether ${domains.best.domain} is really free`,
        detail: checkedLive
          ? domains.best.price !== null
            ? `It was available at $${domains.best.price.toFixed(2)} when this ran. The cheapest irreversible step you can take, and it stops the name disappearing while you deliberate.`
            : "It was available when this ran. The cheapest irreversible step you can take."
          : "LaunchPilot is showing sample availability for this run, so treat the status above as a suggestion, not a fact. Confirm it with a registrar, then buy it — it is the cheapest irreversible step you can take.",
      });
    }

    const feature = synthesis.mvpFeatures[0];
    if (feature) {
      drafts.push({
        kind: "build",
        title: `Build only this: ${feature.feature}`,
        detail: feature.why
          ? `${feature.why} Everything else in the MVP list waits until this one earns its place.`
          : "Everything else in the MVP list waits until this one earns its place.",
      });
    }

    const money = synthesis.monetizationIdeas[0];
    if (money) {
      drafts.push({
        kind: "decide",
        title: "Put a price in front of someone",
        detail: `Take "${money.model}"${money.suggestedPrice ? ` at ${money.suggestedPrice.toLowerCase()}` : ""} to five of the people you interviewed. Watching someone hesitate over a number tells you more than any survey.`,
      });
    }
  }

  return { headline: HEADLINES[verdict], items: assignWindows(drafts.slice(0, 7)) };
}

/** Spreads the surviving items across a working week. */
function assignWindows(drafts: Array<Omit<ActionItem, "window">>): ActionItem[] {
  const total = drafts.length;
  if (total === 0) return [];

  return drafts.map((draft, index) => {
    const start = Math.floor((index * 7) / total) + 1;
    const end = Math.floor(((index + 1) * 7) / total);
    const window = end > start ? `Days ${start}–${end}` : `Day ${start}`;
    return { ...draft, window };
  });
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}
