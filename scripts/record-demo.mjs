#!/usr/bin/env node
/**
 * Records one real Ignition investigation and freezes it as the demo.
 *
 * The demo button replays this file instead of calling any external API, so a
 * flaky venue network, an exhausted search quota or a rate-limited model can
 * never break a live presentation. Everything in it is genuine output from a
 * real run — it is replayed, not fabricated.
 *
 *   npm run dev          # in one terminal
 *   npm run record-demo  # in another
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.RECORD_BASE_URL ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "src", "lib", "demo", "recorded-run.json");
const ALLOW_FALLBACK = process.argv.includes("--allow-fallback");

const IDEA =
  process.env.RECORD_IDEA ??
  "I want to build an AI meal planner for Indian families that plans a week of home-cooked meals, respects vegetarian and regional preferences, and generates a grocery list.";

async function post(route, body) {
  const response = await fetch(`${BASE}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${route} returned ${response.status}: ${detail.slice(0, 300)}`);
  }
  return response.json();
}

function report(stage, source, extra = "") {
  const mark = source === "live" ? "✓ live" : "· sample";
  console.log(`  ${stage.padEnd(12)} ${mark} ${extra}`);
}

async function main() {
  console.log(`Recording a demo run against ${BASE}\n  "${IDEA.slice(0, 70)}…"\n`);

  const analyzed = await post("/api/analyze", { idea: IDEA, mode: "validate" });
  report("analyze", analyzed.dataSource);

  const researched = await post("/api/research", {
    analysis: analyzed.analysis,
    mode: "validate",
  });
  const evidence = researched.evidence;
  report("research", evidence.dataSource, `${evidence.results.length} sources`);

  const [synthesized, domained] = await Promise.all([
    post("/api/synthesize", {
      analysis: analyzed.analysis,
      evidence,
      mode: "validate",
    }),
    post("/api/domains", { analysis: analyzed.analysis }),
  ]);
  report("synthesize", synthesized.dataSource, synthesized.synthesis.verdict);
  report("domains", domained.domains.dataSource, domained.domains.best?.domain ?? "none available");

  const sources = {
    llm: synthesized.dataSource,
    research: evidence.dataSource,
    domains: domained.domains.dataSource,
  };

  // A recording is only worth freezing if the important parts were real.
  const weak = ["llm", "research"].filter((key) => sources[key] !== "live");
  if (weak.length && !ALLOW_FALLBACK) {
    console.error(
      `\n✗ ${weak.join(" and ")} fell back to sample data. Fix the keys and re-run,` +
        ` or pass --allow-fallback to record anyway.`,
    );
    process.exit(1);
  }

  const run = {
    mode: "validate",
    analysis: analyzed.analysis,
    evidence,
    synthesis: synthesized.synthesis,
    domains: domained.domains,
    sources,
    recordedAt: new Date().toISOString(),
  };

  await writeFile(OUT, `${JSON.stringify(run, null, 2)}\n`, "utf8");
  const kb = Math.round(JSON.stringify(run).length / 1024);
  console.log(`\n✓ Recorded ${evidence.results.length} exhibits · ${synthesized.synthesis.verdict} ${synthesized.synthesis.viability.overall}/100`);
  console.log(`  Written to src/lib/demo/recorded-run.json (${kb} KB)`);
}

main().catch((error) => {
  console.error(`\n✗ ${error.message}`);
  console.error("  Is the dev server running? (npm run dev)");
  process.exit(1);
});
