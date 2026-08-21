import { describe, expect, it } from "vitest";
import { selectSourcesForModel } from "@/lib/analysis/prompts";
import type { ResearchCategory, ResearchEvidence, ResearchResult } from "@/lib/analysis/schemas";

function source(
  url: string,
  category: ResearchCategory,
  title = url,
): ResearchResult {
  return { title, url, snippet: "", source: new URL(url).hostname, category, query: "q" };
}

function evidence(results: ResearchResult[]): ResearchEvidence {
  return {
    results,
    queriesRun: [],
    totalFound: results.length,
    deduplicated: 0,
    dataSource: "live",
    notes: [],
  };
}

describe("selectSourcesForModel", () => {
  it("keeps forum threads out of the competitor slots when products exist", () => {
    const selected = selectSourcesForModel(
      evidence([
        source("https://www.reddit.com/r/a/1", "competitors"),
        source("https://www.facebook.com/groups/2", "competitors"),
        source("https://amiyaa.com/", "competitors"),
        source("https://mealime.com/", "competitors"),
        source("https://nutriscan.app/", "competitors"),
        source("https://platejoy.com/", "competitors"),
        source("https://eatthismuch.com/", "competitors"),
      ]),
    );
    const hosts = selected.map((entry) => new URL(entry.url).hostname);
    expect(hosts).not.toContain("www.reddit.com");
    expect(hosts).not.toContain("www.facebook.com");
    expect(hosts).toContain("mealime.com");
  });

  it("falls back to discussion sources when no product pages were found", () => {
    const selected = selectSourcesForModel(
      evidence([
        source("https://www.reddit.com/r/a/1", "competitors"),
        source("https://www.reddit.com/r/a/2", "competitors"),
      ]),
    );
    expect(selected.length).toBe(2);
  });

  it("does not let one product occupy several competitor slots", () => {
    const selected = selectSourcesForModel(
      evidence([
        source("https://amiyaa.com/", "competitors"),
        source("https://amiyaa.com/pricing", "competitors"),
        source("https://amiyaa.com/about", "competitors"),
        source("https://mealime.com/", "competitors"),
      ]),
    );
    const amiyaaCount = selected.filter((entry) =>
      entry.url.includes("amiyaa.com"),
    ).length;
    expect(amiyaaCount).toBeLessThan(3);
    expect(selected.some((entry) => entry.url.includes("mealime"))).toBe(true);
  });

  it("respects the per-category budget", () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      source(`https://site${index}.com/`, "market"),
    );
    expect(selectSourcesForModel(evidence(many))).toHaveLength(3);
  });

  it("preserves retrieval order so citation numbering matches the dashboard", () => {
    const results = [
      source("https://a.com/", "competitors"),
      source("https://b.com/", "market"),
      source("https://c.com/", "customer_pain"),
    ];
    expect(selectSourcesForModel(evidence(results)).map((entry) => entry.url)).toEqual(
      results.map((entry) => entry.url),
    );
  });

  it("returns nothing when there was no evidence", () => {
    expect(selectSourcesForModel(evidence([]))).toEqual([]);
  });
});
