import "server-only";
import { env, hasNamecomCredentials, isGlobalDemoMode } from "@/lib/env";
import type {
  DomainCandidate,
  DomainReport,
  StartupIdeaAnalysis,
} from "@/lib/analysis/schemas";
import { demoDomainReport } from "@/lib/demo/fixtures";

const NAMECOM_TIMEOUT_MS = 15_000;
const MAX_CANDIDATES = 10;
const MAX_BASE_LENGTH = 22;
const TLD_PREFERENCE = [".com", ".ai", ".app", ".io", ".co"];

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
}

/**
 * Keywords arrive as phrases ("indian meal planner"). Collapsing the whole
 * phrase produces unusable domains, so fall back to the leading word.
 */
function brandable(value: string, maxLength: number): string {
  const full = slug(value);
  if (full.length <= maxLength) return full;
  return slug(value.trim().split(/\s+/)[0]).slice(0, maxLength);
}

/**
 * Builds 5-10 candidates from the model's brand suggestions plus keyword
 * compounds. Deterministic, so a rehearsal and the live demo agree.
 */
export function buildCandidates(analysis: StartupIdeaAnalysis): Array<{
  domain: string;
  reason: string;
}> {
  const names = analysis.nameSuggestions.map(slug).filter((name) => name.length >= 3);
  const keywords = analysis.keywords.map(slug).filter((word) => word.length >= 3);

  const candidates: Array<{ domain: string; reason: string }> = [];
  const seen = new Set<string>();

  const push = (base: string, tld: string, reason: string) => {
    const domain = `${base}${tld}`;
    if (base.length < 3 || base.length > MAX_BASE_LENGTH) return;
    if (seen.has(domain) || candidates.length >= MAX_CANDIDATES) return;
    seen.add(domain);
    candidates.push({ domain, reason });
  };

  names.slice(0, 4).forEach((name, index) => {
    push(name, index % 2 === 0 ? ".com" : ".ai", "Brandable name generated from your idea");
    push(name, index % 2 === 0 ? ".ai" : ".app", "Same brand on a startup-friendly TLD");
  });

  const rawKeywords = analysis.keywords.filter((word) => word.trim().length >= 3);
  if (rawKeywords.length >= 2) {
    const pair = `${brandable(rawKeywords[0], 8)}${brandable(rawKeywords[1], 8)}`;
    push(pair, ".com", "Keyword pair from your category");
  }
  if (names.length || keywords.length) {
    push(`get${names[0] ?? keywords[0]}`, ".com", "Prefix variant, usually easier to get");
  }
  if (rawKeywords.length >= 1) {
    push(`${brandable(rawKeywords[0], 12)}ai`, ".com", "Keyword + AI, common for this category");
  }

  return candidates.slice(0, MAX_CANDIDATES);
}

type NamecomAvailabilityResult = {
  domainName?: string;
  purchasable?: boolean;
  purchasePrice?: number;
  premium?: boolean;
};

async function checkAvailability(
  domains: string[],
): Promise<Map<string, NamecomAvailabilityResult>> {
  const auth = Buffer.from(`${env.namecomUsername}:${env.namecomApiKey}`).toString("base64");

  const response = await fetch(`${env.namecomBaseUrl}/v4/domains:checkAvailability`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ domainNames: domains }),
    signal: AbortSignal.timeout(NAMECOM_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(`name.com returned ${response.status}: ${detail}`);
  }

  const payload = (await response.json()) as { results?: NamecomAvailabilityResult[] };
  const map = new Map<string, NamecomAvailabilityResult>();
  for (const result of payload.results ?? []) {
    if (result.domainName) map.set(result.domainName.toLowerCase(), result);
  }
  return map;
}

export function pickBest(candidates: DomainCandidate[]): DomainCandidate | null {
  const available = candidates.filter((candidate) => candidate.available === true);
  if (available.length === 0) return null;

  return [...available].sort((a, b) => {
    const tldRank = (domain: string) => {
      const index = TLD_PREFERENCE.findIndex((tld) => domain.endsWith(tld));
      return index === -1 ? TLD_PREFERENCE.length : index;
    };
    const byTld = tldRank(a.domain) - tldRank(b.domain);
    if (byTld !== 0) return byTld;
    const byPremium = Number(a.premium) - Number(b.premium);
    if (byPremium !== 0) return byPremium;
    return a.domain.length - b.domain.length;
  })[0];
}

/**
 * One cheap round trip to confirm credentials work, for use before a demo.
 * Availability checks are free on name.com, so this costs nothing.
 */
export async function probeNamecom(): Promise<
  { ok: true; checked: string; available: boolean | null } | { ok: false; error: string }
> {
  if (!hasNamecomCredentials()) {
    return { ok: false, error: "NAMECOM_API_KEY and NAMECOM_USERNAME are not both set" };
  }
  try {
    const results = await checkAvailability(["launchpilot-probe-check.com"]);
    const entry = results.get("launchpilot-probe-check.com");
    return {
      ok: true,
      checked: "launchpilot-probe-check.com",
      available: entry?.purchasable ?? null,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown error" };
  }
}

export async function findDomains(analysis: StartupIdeaAnalysis): Promise<DomainReport> {
  const candidates = buildCandidates(analysis);

  if (isGlobalDemoMode()) {
    return demoDomainReport(candidates, "DEMO_MODE is on.");
  }
  if (!hasNamecomCredentials()) {
    return demoDomainReport(
      candidates,
      "name.com credentials are not set — availability below is sample data, not a live check.",
    );
  }

  try {
    const availability = await checkAvailability(candidates.map((entry) => entry.domain));
    const checked: DomainCandidate[] = candidates.map((entry) => {
      const result = availability.get(entry.domain.toLowerCase());
      return {
        domain: entry.domain,
        available: result?.purchasable ?? null,
        price: typeof result?.purchasePrice === "number" ? result.purchasePrice : null,
        currency: "USD",
        reason: entry.reason,
        premium: Boolean(result?.premium),
      };
    });

    return {
      candidates: checked,
      best: pickBest(checked),
      dataSource: "live",
      notes: [],
    };
  } catch (error) {
    console.error("[name.com] availability check failed", error);
    return demoDomainReport(
      candidates,
      "The live name.com check failed — availability below is sample data, not a live check.",
    );
  }
}
