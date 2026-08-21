import type {
  DomainCandidate,
  DomainReport,
  ResearchCategory,
  ResearchEvidence,
  ResearchResult,
  StartupIdeaAnalysis,
  ValidationMode,
  ViabilityAnalysis,
} from "@/lib/analysis/schemas";
import { reconcile } from "@/lib/analysis/scoring";

/**
 * Deterministic fixtures used when DEMO_MODE=true or a sponsor key is missing.
 * Everything produced here is labelled as sample data in the UI. It must never
 * be presented as live research, and it must never contain invented statistics.
 */

export { DEMO_IDEA } from "@/lib/constants";

const SAMPLE_NOTE =
  "Sample evidence shown because LaunchPilot is running without live search. The link is real; the summary is illustrative.";

function isMealPlannerIdea(idea: string): boolean {
  const text = idea.toLowerCase();
  return text.includes("meal") && (text.includes("plan") || text.includes("recipe"));
}

/* ------------------------------------------------------------------ */
/* Stage 1 fixture                                                     */
/* ------------------------------------------------------------------ */

export function demoIdeaAnalysis(idea: string, mode: ValidationMode): StartupIdeaAnalysis {
  if (isMealPlannerIdea(idea)) {
    return {
      idea: "An AI meal planner that builds weekly Indian home-cooked menus and the matching grocery list.",
      problem:
        "Deciding what to cook every day is a recurring household decision cost, and generic meal-planning apps do not model Indian regional cuisine, vegetarian constraints or Indian grocery staples.",
      targetCustomer:
        "Working parents in Indian households (in India and the diaspora) who cook at home most days.",
      proposedSolution:
        "An assistant that learns family preferences and dietary rules, plans a week of meals, and produces a consolidated grocery list.",
      category: "Consumer FoodTech / Meal Planning",
      keywords: [
        "indian meal planner",
        "weekly meal plan",
        "vegetarian meal planning",
        "grocery list app",
        "family recipes",
      ],
      nameSuggestions: ["mealmitra", "thalitime", "rasoiplan", "dabbaai", "ghar"],
      competitorSearchQueries: [
        "best meal planning apps for indian families",
        "indian vegetarian weekly meal planner app",
      ],
      marketSearchQueries: [
        "meal planning app market trends",
        "online grocery india consumer behaviour report",
      ],
      customerPainSearchQueries:
        mode === "scrutiny"
          ? [
              "reddit meal planning app complaints stopped using",
              "meal planner app negative reviews repetitive recipes",
            ]
          : [
              "reddit what to cook every day indian family",
              "meal planning apps not working for indian food",
            ],
      initialHypotheses: [
        "Indian households experience meal decision fatigue often enough to pay for a solution.",
        "Existing meal planners handle Indian regional cuisine poorly.",
        "Users will accept AI-generated menus if the recipes match family taste.",
        "A grocery list is the feature that creates weekly retention.",
      ],
    };
  }

  // Generic structuring for any other idea. Honest and clearly thin.
  const trimmed = idea.trim().replace(/\s+/g, " ");
  const words = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));
  const keywords = Array.from(new Set(words)).slice(0, 5);
  const topic = keywords.slice(0, 2).join(" ") || "this product";

  return {
    idea: trimmed.slice(0, 300),
    problem: `The founder believes there is an unmet need around ${topic}. This has not been verified.`,
    targetCustomer: "Not yet specified — demo mode cannot infer this reliably.",
    proposedSolution: trimmed.slice(0, 300),
    category: keywords[0] ? `${keywords[0]} tools` : "Uncategorised",
    keywords: keywords.length ? keywords : ["startup"],
    nameSuggestions: buildGenericNames(keywords),
    competitorSearchQueries: [`best ${topic} tools`, `${topic} alternatives`],
    marketSearchQueries: [`${topic} market size`, `${topic} industry trends`],
    customerPainSearchQueries: [`reddit problems with ${topic}`, `${topic} complaints reviews`],
    initialHypotheses: [
      `Customers actively look for a solution to ${topic}.`,
      "Existing tools leave a gap worth building into.",
      "Customers would pay for this rather than tolerate the status quo.",
    ],
  };
}

const STOPWORDS = new Set([
  "want",
  "build",
  "that",
  "with",
  "this",
  "make",
  "your",
  "from",
  "into",
  "them",
  "they",
  "have",
  "will",
  "would",
  "startup",
  "idea",
  "people",
  "using",
]);

function buildGenericNames(keywords: string[]): string[] {
  const base = keywords[0]?.replace(/[^a-z0-9]/g, "") ?? "launch";
  const second = keywords[1]?.replace(/[^a-z0-9]/g, "") ?? "hq";
  return [base, `${base}${second}`, `get${base}`, `${base}ly`, `${base}hq`];
}

/* ------------------------------------------------------------------ */
/* Stage 2 fixture                                                     */
/* ------------------------------------------------------------------ */

const MEAL_PLANNER_SOURCES: Array<Omit<ResearchResult, "query">> = [
  {
    title: "Eat This Much — automatic meal planner",
    url: "https://www.eatthismuch.com/",
    snippet:
      "An established automatic meal planner that generates plans from calorie and macro targets. Western-recipe first.",
    source: "eatthismuch.com",
    category: "competitors",
  },
  {
    title: "Mealime — meal plans and grocery lists",
    url: "https://www.mealime.com/",
    snippet:
      "Popular meal-planning app built around quick weeknight recipes and an auto-generated grocery list.",
    source: "mealime.com",
    category: "competitors",
  },
  {
    title: "PlateJoy — personalised meal planning service",
    url: "https://www.platejoy.com/",
    snippet:
      "Subscription meal planning with dietary personalisation, positioned as a paid health product.",
    source: "platejoy.com",
    category: "competitors",
  },
  {
    title: "Samsung Food (formerly Whisk) — recipe saving and meal planning",
    url: "https://samsungfood.com/",
    snippet:
      "Recipe aggregation plus meal planning and shopping lists, backed by a large consumer brand.",
    source: "samsungfood.com",
    category: "competitors",
  },
  {
    title: "r/IndianFood — home cooking discussions",
    url: "https://www.reddit.com/r/IndianFood/",
    snippet:
      "Active community where home cooks discuss weekly cooking routines, regional dishes and ingredient substitutions.",
    source: "reddit.com",
    category: "customer_pain",
  },
  {
    title: "r/MealPrepSunday — planning and burnout threads",
    url: "https://www.reddit.com/r/MealPrepSunday/",
    snippet:
      "Recurring threads about plan fatigue, repetitive menus and abandoning meal-prep routines after a few weeks.",
    source: "reddit.com",
    category: "customer_pain",
  },
  {
    title: "r/india — everyday cooking and grocery threads",
    url: "https://www.reddit.com/r/india/search/?q=meal%20planning",
    snippet:
      "Discussions about daily cooking load in Indian households and coordination with domestic help.",
    source: "reddit.com",
    category: "customer_pain",
  },
  {
    title: "Product Hunt — meal planning launches",
    url: "https://www.producthunt.com/search?q=meal%20planner",
    snippet:
      "A steady stream of new meal-planning launches, indicating low barriers to entry and crowded positioning.",
    source: "producthunt.com",
    category: "market",
  },
  {
    title: "Google News — online grocery India",
    url: "https://news.google.com/search?q=online%20grocery%20india",
    snippet:
      "Ongoing coverage of quick-commerce grocery growth in India, relevant to grocery-list monetisation.",
    source: "news.google.com",
    category: "market",
  },
  {
    title: "G2 — meal planning software category",
    url: "https://www.g2.com/search?query=meal%20planning",
    snippet:
      "Review platform listing meal-planning products, useful for reading recurring complaints in reviews.",
    source: "g2.com",
    category: "market",
  },
];

function genericSources(analysis: StartupIdeaAnalysis): Array<Omit<ResearchResult, "query">> {
  const topic = analysis.keywords[0] ?? analysis.category;
  const encoded = encodeURIComponent(topic);
  const build = (
    title: string,
    url: string,
    source: string,
    category: ResearchCategory,
  ): Omit<ResearchResult, "query"> => ({ title, url, snippet: SAMPLE_NOTE, source, category });

  return [
    build(
      `Product Hunt search: ${topic}`,
      `https://www.producthunt.com/search?q=${encoded}`,
      "producthunt.com",
      "competitors",
    ),
    build(
      `G2 category search: ${topic}`,
      `https://www.g2.com/search?query=${encoded}`,
      "g2.com",
      "competitors",
    ),
    build(
      `Google News: ${topic}`,
      `https://news.google.com/search?q=${encoded}`,
      "news.google.com",
      "market",
    ),
    build(
      `Crunchbase search: ${topic}`,
      `https://www.crunchbase.com/textsearch?q=${encoded}`,
      "crunchbase.com",
      "market",
    ),
    build(
      `Reddit discussions: ${topic}`,
      `https://www.reddit.com/search/?q=${encoded}`,
      "reddit.com",
      "customer_pain",
    ),
    build(
      `Reddit complaints: ${topic}`,
      `https://www.reddit.com/search/?q=${encodeURIComponent(`${topic} problems`)}`,
      "reddit.com",
      "customer_pain",
    ),
  ];
}

export function demoEvidenceFor(
  analysis: StartupIdeaAnalysis,
  queriesRun: string[],
  note: string,
): ResearchEvidence {
  const base = isMealPlannerIdea(analysis.idea)
    ? MEAL_PLANNER_SOURCES
    : genericSources(analysis);

  const results: ResearchResult[] = base.map((source, index) => ({
    ...source,
    query: queriesRun[index % Math.max(queriesRun.length, 1)] ?? "",
  }));

  return {
    results,
    queriesRun,
    totalFound: results.length,
    deduplicated: 0,
    dataSource: "demo",
    notes: [note],
  };
}

/* ------------------------------------------------------------------ */
/* Stage 3 fixture                                                     */
/* ------------------------------------------------------------------ */

export function demoSynthesis(
  analysis: StartupIdeaAnalysis,
  evidence: ResearchEvidence,
  mode: ValidationMode,
): ViabilityAnalysis {
  // Only ever cite sample evidence. If the research was live but the model
  // failed, these fixture findings must not borrow real URLs — that would
  // present invented competitors as if a real source backed them.
  const citable = evidence.dataSource === "demo" ? evidence.results : [];
  const urls = citable.map((result) => result.url);
  const urlsFor = (category: ResearchCategory) =>
    citable.filter((result) => result.category === category).map((result) => result.url);

  const competitorUrls = urlsFor("competitors");
  const painUrls = urlsFor("customer_pain");
  const marketUrls = urlsFor("market");

  const adversarial = mode === "scrutiny";

  const draft: ViabilityAnalysis = {
    executiveSummary: adversarial
      ? `Sample analysis. The meal-planning category already contains funded, well-distributed products, and the evidence shows repeated user drop-off from planning tools rather than a shortage of them. The credible wedge is cuisine-specific depth, not another general planner.`
      : `Sample analysis. Meal planning is a proven consumer category with several established products, but the evidence does not show one built specifically around Indian regional cooking. The recurring complaint pattern is menu repetition and plan abandonment, which is where a cuisine-aware planner could differentiate.`,
    problem: {
      statement:
        "Households cook most days and pay a daily decision cost, while generic planners assume Western recipes and pantry staples.",
      evidence: [
        "Multiple established meal planners position around calorie targets and quick weeknight recipes rather than regional cuisine.",
        "Community threads repeatedly discuss planning fatigue and repetitive menus.",
      ],
    },
    competitors: [
      {
        name: "Eat This Much",
        description: "Automatic meal planner driven by calorie and macro targets.",
        strengths: ["Fully automated plan generation", "Established brand in the category"],
        weaknesses: ["Western-recipe first", "Nutrition framing rather than family cooking"],
        pricingNote: "",
        sourceUrls: competitorUrls.slice(0, 1),
      },
      {
        name: "Mealime",
        description: "Weeknight recipe planner with an auto-generated grocery list.",
        strengths: ["Strong grocery-list execution", "Large recipe library"],
        weaknesses: ["Limited Indian regional coverage", "Little household personalisation"],
        pricingNote: "",
        sourceUrls: competitorUrls.slice(1, 2),
      },
      {
        name: "PlateJoy",
        description: "Subscription meal planning with dietary personalisation.",
        strengths: ["Proven willingness to pay for personalisation"],
        weaknesses: ["Premium price point", "Health positioning, not everyday family cooking"],
        pricingNote: "Positioned as a paid subscription service.",
        sourceUrls: competitorUrls.slice(2, 3),
      },
      {
        name: "Samsung Food",
        description: "Recipe saving, meal planning and shopping lists from a large consumer brand.",
        strengths: ["Distribution through a major hardware brand", "Free to use"],
        weaknesses: ["Broad and generic", "Not tuned to any one cuisine"],
        pricingNote: "",
        sourceUrls: competitorUrls.slice(3, 4),
      },
    ],
    marketSignals: [
      {
        signal: "New meal-planning products launch continuously.",
        interpretation:
          "Low barrier to entry and crowded positioning — differentiation has to be structural, not cosmetic.",
        confidence: "verified",
        sourceUrls: marketUrls.slice(0, 1),
      },
      {
        signal: "Quick-commerce grocery is an active, well-covered market in India.",
        interpretation:
          "A grocery list is a plausible bridge to a partner or affiliate revenue path.",
        confidence: "inferred",
        sourceUrls: marketUrls.slice(1, 2),
      },
    ],
    customerPainPoints: [
      {
        pain: "Menus become repetitive after a few weeks and users abandon the plan.",
        quote: "Recurring 'I stopped using it after a month' threads in planning communities.",
        whyItMatters: "Retention, not acquisition, is the hard problem in this category.",
        sourceUrls: painUrls.slice(0, 1),
      },
      {
        pain: "Generic planners do not model regional Indian dishes or pantry staples.",
        quote: "Home cooks discuss substituting ingredients that planners assume are unavailable.",
        whyItMatters: "This is the gap a cuisine-specific product can own.",
        sourceUrls: painUrls.slice(1, 2),
      },
      {
        pain: "Planning has to fit around household routines and shared cooking duties.",
        quote: "Threads describe coordinating cooking with family members and domestic help.",
        whyItMatters: "The unit is a household, not an individual dieter.",
        sourceUrls: painUrls.slice(2, 3),
      },
    ],
    opportunities: [
      "No evidence of a planner built around Indian regional cuisine and pantry staples.",
      "Household-level planning instead of single-user calorie planning.",
      "Grocery list as the weekly retention loop rather than a feature afterthought.",
      "Festival, fasting and seasonal menus that generic planners ignore.",
    ],
    differentiation: [
      "Regional cuisine model (not a recipe tag) as the core data asset.",
      "Learns from what the family actually cooked, not what they clicked.",
      "Plans around leftovers and repeat dishes the way households really eat.",
    ],
    mvpFeatures: [
      { feature: "Family profile: diet, region, spice level, dislikes", why: "Personalisation is the whole wedge." },
      { feature: "Weekly plan generation with one-tap swap", why: "Swapping is what stops abandonment." },
      { feature: "Consolidated grocery list by aisle", why: "The recurring reason to come back weekly." },
      { feature: "Learns from cooked / skipped feedback", why: "Fixes menu repetition over time." },
      { feature: "Shareable plan for the household", why: "Cooking duties are shared." },
    ],
    monetizationIdeas: [
      {
        model: "Freemium subscription",
        detail: "Free weekly plan, paid tier for multiple profiles and unlimited swaps.",
        suggestedPrice: "Low monthly price point, validated before launch",
      },
      {
        model: "Grocery partnership",
        detail: "Hand the generated list to a grocery partner for fulfilment.",
        suggestedPrice: "Revenue share",
      },
    ],
    goToMarket: [
      "Cuisine-specific cooking communities rather than general productivity channels.",
      "Short-form video showing a real week of plans, not app screenshots.",
      "Partner with regional recipe creators for the initial recipe base.",
    ],
    risks: [
      {
        risk: "Recipe quality and cultural accuracy are hard to fake with a generic model.",
        severity: "high",
        mitigation: "Curate a regional recipe base before generating anything.",
      },
      {
        risk: "Category retention is historically weak.",
        severity: "high",
        mitigation: "Design the grocery list as the weekly habit, not the plan itself.",
      },
      {
        risk: "Well-funded incumbents can add a cuisine filter.",
        severity: "medium",
        mitigation: "Own household-level modelling, which is harder to bolt on.",
      },
      {
        risk: "Low willingness to pay in the consumer food category.",
        severity: "medium",
        mitigation: "Test pricing before building the paid tier.",
      },
    ],
    evidenceGaps: [
      "No market-size figure was verified — LaunchPilot is showing sample evidence.",
      "No competitor pricing was confirmed from a source.",
      "No direct evidence of willingness to pay in the target segment.",
    ],
    viability: adversarial
      ? { demand: 68, competition: 38, differentiation: 58, monetization: 52, execution: 55, overall: 0 }
      : { demand: 78, competition: 52, differentiation: 71, monetization: 64, execution: 62, overall: 0 },
    verdict: "REFINE",
    verdictReason: adversarial
      ? "Real demand, but a crowded category with weak historical retention. The idea only survives with genuine cuisine depth."
      : "Strong demand signals and a clear cuisine gap, but differentiation has to be structural to beat established planners.",
  };

  if (evidence.dataSource === "live") {
    draft.evidenceGaps.push(
      "This analysis is sample text, so none of it is drawn from the live sources listed above.",
    );
  } else if (urls.length === 0) {
    draft.evidenceGaps.push("No sources were retrieved for this run.");
  }
  return reconcile(draft);
}

/* ------------------------------------------------------------------ */
/* Stage 4 fixture                                                     */
/* ------------------------------------------------------------------ */

/** Stable pseudo-availability so rehearsals and the demo always agree. */
function deterministicAvailability(domain: string): { available: boolean; price: number } {
  let hash = 0;
  for (let i = 0; i < domain.length; i += 1) {
    hash = (hash * 31 + domain.charCodeAt(i)) >>> 0;
  }
  const available = domain.endsWith(".com") ? hash % 3 !== 0 : hash % 4 !== 0;
  const price = Number((9.99 + (hash % 40)).toFixed(2));
  return { available, price };
}

export function demoDomainReport(
  candidates: Array<{ domain: string; reason: string }>,
  note: string,
): DomainReport {
  const checked: DomainCandidate[] = candidates.map((candidate) => {
    const { available, price } = deterministicAvailability(candidate.domain);
    return {
      domain: candidate.domain,
      available,
      price: available ? price : null,
      currency: "USD",
      reason: candidate.reason,
      premium: false,
    };
  });

  const best =
    checked.find((candidate) => candidate.available && candidate.domain.endsWith(".com")) ??
    checked.find((candidate) => candidate.available) ??
    null;

  return { candidates: checked, best, dataSource: "demo", notes: [note] };
}
