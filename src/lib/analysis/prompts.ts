import type {
  ResearchCategory,
  ResearchEvidence,
  ResearchResult,
  StartupIdeaAnalysis,
  ValidationMode,
} from "./schemas";

export const ANALYST_SYSTEM_PROMPT = `You are a startup research analyst.
Separate hypotheses from verified evidence. Never present an unverified claim as fact.
You do not have market data of your own — anything you have not been given as evidence is a hypothesis.
Never invent statistics, funding numbers, user counts, revenue figures, or dates.`;

const CROSS_EXAMINATION = `
You are cross-examining this idea.
Test it the way a careful investor would before writing a cheque: entrenched incumbents,
market saturation, weak differentiation, distribution problems, thin margins, and
unhappy-customer patterns that reveal a hard problem rather than an easy one.
Be rigorous, not cynical — every challenge must be supported by the evidence supplied.
The purpose is to find what breaks before it costs the founder a year, so if the idea
holds up under questioning, say so plainly.`;

export function systemPromptFor(mode: ValidationMode): string {
  return mode === "scrutiny" ? `${ANALYST_SYSTEM_PROMPT}\n${CROSS_EXAMINATION}` : ANALYST_SYSTEM_PROMPT;
}

/* ------------------------------------------------------------------ */
/* Stage 1 — understand the idea, write search queries                 */
/* ------------------------------------------------------------------ */

export const IDEA_SHAPE_HINT = `{
  "idea": "one clean sentence restating the idea",
  "problem": "the underlying problem, one or two sentences",
  "targetCustomer": "who specifically has this problem",
  "proposedSolution": "what the product actually does",
  "category": "short market category, e.g. Consumer Health / FoodTech",
  "keywords": ["4-8 short search keywords"],
  "nameSuggestions": ["4-6 short brandable product names, lowercase, no spaces, no TLD"],
  "competitorSearchQueries": ["exactly 2 web search queries that surface real competing products"],
  "marketSearchQueries": ["exactly 2 web search queries that surface market size, trends or industry reports"],
  "customerPainSearchQueries": ["exactly 2 web search queries that surface real user complaints, e.g. reddit threads or reviews"],
  "initialHypotheses": ["3-5 assumptions that MUST be verified against evidence, each phrased as an unproven claim"]
}`;

export function ideaPrompt(idea: string, mode: ValidationMode): string {
  const stance =
    mode === "scrutiny"
      ? `Bias the search queries toward evidence that could disprove the idea: complaints, failures, saturation, "why X shut down", negative reviews, "alternatives to".`
      : `Bias the search queries toward finding what actually exists today: real products, real discussions, real market reports.`;

  return `A founder submitted this startup idea:

"""
${idea}
"""

Structure the idea and write the web searches that would let a skeptical analyst verify it.
${stance}

Rules:
- Do NOT state any market fact, statistic or competitor claim in this step. You have no evidence yet.
- Search queries must be plain web-search strings a person would actually type. No boolean operators, no quotes.
- Every item in initialHypotheses must be something the research step could confirm or refute.`;
}

/* ------------------------------------------------------------------ */
/* Stage 2 — synthesis over real evidence                              */
/* ------------------------------------------------------------------ */

export const SYNTHESIS_SHAPE_HINT = `{
  "executiveSummary": "3-4 sentences a founder could read in 15 seconds",
  "problem": { "statement": "string", "evidence": ["short evidence statements drawn from the sources"] },
  "competitors": [
    { "name": "string", "description": "string", "strengths": ["..."], "weaknesses": ["..."],
      "pricingNote": "pricing only if a source mentions it, otherwise empty string",
      "sourceUrls": ["urls from the evidence list that support this"] }
  ],
  "marketSignals": [
    { "signal": "string", "interpretation": "string", "confidence": "verified" | "inferred", "sourceUrls": ["..."] }
  ],
  "customerPainPoints": [
    { "pain": "string", "quote": "a short paraphrase of what users actually said, or empty string",
      "whyItMatters": "string", "sourceUrls": ["..."] }
  ],
  "opportunities": ["what the market appears to be missing, 3-5 items"],
  "differentiation": ["3-5 concrete wedges this product could own"],
  "mvpFeatures": [ { "feature": "string", "why": "string" } ],
  "monetizationIdeas": [ { "model": "string", "detail": "string", "suggestedPrice": "string" } ],
  "goToMarket": ["3-5 concrete first channels"],
  "risks": [ { "risk": "string", "severity": "high" | "medium" | "low", "mitigation": "string" } ],
  "evidenceGaps": ["what you could NOT verify from the supplied sources"],
  "viability": { "demand": 0-100, "competition": 0-100, "differentiation": 0-100, "monetization": 0-100, "execution": 0-100, "overall": 0-100 },
  "verdict": "BUILD" | "REFINE" | "SHELVE",
  "verdictReason": "one or two sentences"
}`;

/**
 * Free LLM tiers meter prompt + completion together (Groq allows 8k/minute),
 * so the model gets a balanced subset with clipped snippets while the
 * dashboard still shows every source that was retrieved.
 */
const SNIPPET_LIMIT = 180;
const MAX_PER_HOST = 2;

/** Competitors are the scarcest signal, so they get the largest share. */
const QUOTAS: Record<ResearchCategory, number> = {
  competitors: 5,
  market: 3,
  customer_pain: 4,
};

/**
 * Threads and social posts are excellent evidence of customer pain and poor
 * evidence of which products exist, so they sink to the bottom of the
 * competitor bucket rather than crowding real products out of it.
 */
const DISCUSSION_HOSTS = new Set([
  "reddit.com",
  "facebook.com",
  "quora.com",
  "x.com",
  "twitter.com",
  "linkedin.com",
  "youtube.com",
  "medium.com",
]);

export function selectSourcesForModel(
  evidence: ResearchEvidence,
  quotas: Record<ResearchCategory, number> = QUOTAS,
) {
  const byCategory = new Map<ResearchCategory, ResearchResult[]>();
  for (const result of evidence.results) {
    const bucket = byCategory.get(result.category);
    if (bucket) bucket.push(result);
    else byCategory.set(result.category, [result]);
  }

  const selected: ResearchResult[] = [];
  for (const [category, bucket] of byCategory) {
    const ordered =
      category === "competitors"
        ? [
            ...bucket.filter((result) => !DISCUSSION_HOSTS.has(hostOf(result.url))),
            ...bucket.filter((result) => DISCUSSION_HOSTS.has(hostOf(result.url))),
          ]
        : bucket;

    // One source per host first, then allow a second (a product page plus its
    // pricing page is useful) but never a third — three pages about one
    // product should not read as three competitors.
    const seen = new Map<string, number>();
    const primary: ResearchResult[] = [];
    const spare: ResearchResult[] = [];
    for (const result of ordered) {
      const host = hostOf(result.url);
      const count = seen.get(host) ?? 0;
      seen.set(host, count + 1);
      if (count === 0) primary.push(result);
      else if (count < MAX_PER_HOST) spare.push(result);
    }
    selected.push(...[...primary, ...spare].slice(0, quotas[category] ?? 4));
  }

  // Restore retrieval order so citation numbering matches the dashboard.
  const keep = new Set(selected.map((result) => result.url));
  return evidence.results.filter((result) => keep.has(result.url));
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function synthesisPrompt(
  analysis: StartupIdeaAnalysis,
  evidence: ResearchEvidence,
  mode: ValidationMode,
): string {
  const selected = selectSourcesForModel(evidence);
  const sources = selected
    .map(
      (result, index) =>
        `[${index + 1}] (${result.category}) ${result.title}
    source: ${result.source}
    url: ${result.url}
    snippet: ${clip(result.snippet) || "(no snippet)"}`,
    )
    .join("\n");

  const stance =
    mode === "scrutiny"
      ? `Score strictly. Lead with what the evidence fails to support. Only return BUILD if the
idea genuinely holds up under questioning.`
      : `Score honestly. Do not inflate scores to be encouraging.`;

  return `THE IDEA (structured, unverified):
${JSON.stringify(
  {
    idea: analysis.idea,
    problem: analysis.problem,
    targetCustomer: analysis.targetCustomer,
    proposedSolution: analysis.proposedSolution,
    category: analysis.category,
    hypotheses: analysis.initialHypotheses,
  },
  null,
  2,
)}

RESEARCH EVIDENCE (${selected.length} of ${evidence.results.length} retrieved sources, balanced across categories):
${sources || "(no sources were retrieved)"}

TASK
Analyse this idea using ONLY the evidence above for factual claims. ${stance}

HARD RULES
- Every competitor you name must appear in the evidence. Do not add competitors from memory.
- Name EVERY distinct product visible in the competitor evidence, not just the closest one.
  Aim for 3-5 competitors whenever the sources support it. An app store listing, a review
  round-up or a forum recommendation all count as evidence that a product exists.
- Every factual claim must carry at least one sourceUrl copied verbatim from the evidence list above.
- Never invent a statistic, a funding round, a user count, a growth rate or a date.
- If the evidence does not support something, put it in evidenceGaps instead of asserting it.
- confidence = "verified" only when a supplied source states it; otherwise "inferred".
- opportunities, differentiation, mvpFeatures, monetizationIdeas and goToMarket are your
  recommendations, not facts — they need no sources, but must follow from the evidence.
- Scores: demand and competition must reflect the evidence. A crowded market means a LOW
  competition score. An empty evidence set means low confidence, not high scores.
- overall must be consistent with the five sub-scores.
- verdict: BUILD if overall >= 70, REFINE if 45-69, SHELVE if below 45.`;
}

function clip(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= SNIPPET_LIMIT) return trimmed;
  return `${trimmed.slice(0, SNIPPET_LIMIT).trimEnd()}…`;
}
