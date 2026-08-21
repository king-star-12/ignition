<p align="center">
  <img src="demo/thumbnail/launchpilot-thumbnail-16x9.png" alt="LaunchPilot — don't build it until you validate it" width="820">
</p>

# LaunchPilot

**Don't build it until you validate it.** A [Clustral AI](https://clustralai.com) product.

Give LaunchPilot a startup idea. It researches the live web for competitors and real
customer pain, checks what you could name it, scores the opportunity across five dimensions,
returns a BUILD / REFINE / KILL verdict — and then tells you what to do for the next seven days.

```
User idea → LLM (structure + search plan) → 6 concurrent SerpApi searches
         → LLM (synthesis over evidence) ┐
         → name.com availability check   ┘→ scored dashboard → 7-day plan → launch brief
```

Two LLM calls, six web searches, one batched domain lookup — around ten seconds end to end.
Every factual claim on the dashboard carries the source URL it came from.

**Demo film:** a 3-minute narrated walkthrough is built from this repo — see
[`demo/README.md`](demo/README.md) to rebuild it, or watch the recording linked in the
submission. It is a real screen recording of the app, not a slideshow.

---

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000 and press **Run the recorded demo**.

The app runs with **no API keys at all** — every integration falls back to clearly labelled
sample data. Add keys to `.env.local` to turn each integration live.

---

## Environment variables

| Variable | Purpose |
| --- | --- |
| `AI_PROVIDER` | `groq` (default) or `openrouter`. Falls back to whichever has a key. |
| `GROQ_API_KEY` / `GROQ_MODEL` | Groq credentials. Default model `openai/gpt-oss-120b`. |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | OpenRouter fallback. Default model `openrouter/free`. |
| `SERPAPI_API_KEY` | Live web research. |
| `NAMECOM_API_KEY` / `NAMECOM_USERNAME` | Domain availability. |
| `NAMECOM_BASE_URL` | `https://api.name.com`, or `https://api.dev.name.com` for name.com's test environment. |
| `DEMO_MODE` | `true` pins every stage to deterministic fixtures. |

All keys are read server-side only. Nothing is prefixed `NEXT_PUBLIC_`, and no key or
key-derived value reaches the browser — the client receives booleans only.

Check what is configured without exposing anything:

```bash
curl localhost:3000/api/health
```

Add a probe to check the integrations actually answer:

```bash
curl "localhost:3000/api/health?probe=all"     # one tiny model call + SerpApi quota
```

`?probe=llm` makes one small live model call; `?probe=serpapi` reports remaining search quota;
`?probe=namecom` runs one availability check to confirm the domain credentials work. All three
are free — none of them consumes quota.

**Budget the searches.** Each validation costs six searches, so a 250/month SerpApi free plan
is about **41 live runs a month**. Three things stretch that a long way:

- **Results are cached on disk for seven days.** A repeated idea costs zero searches, so
  rehearsing the same demo is free. A cold run takes ~13s; a warm one is instant.
- **Providers fall back automatically** when the allowance runs out (below).
- **`DEMO_MODE=true` costs nothing at all** — use it for practice runs.

### Search providers

LaunchPilot tries providers in order and switches automatically, saying so in the UI:

| Provider | Free allowance | Notes |
| --- | --- | --- |
| **SerpApi** | 250 searches/month | Best results — real Google. The default and the sponsor integration. |
| **Brave Search** | 2,000 queries/month | Set `BRAVE_API_KEY`. The natural second choice on volume. |
| **Hacker News** (Algolia) | unlimited, no key | Always available. Technical skew, but Show HN posts are an honest source of competing products and Ask HN threads are unusually candid complaints. |

Pin one with `SEARCH_PROVIDER=serpapi|brave|hackernews`. Because Hacker News needs no account,
research never hard-fails — worst case the run continues on the keyless provider and the
evidence header says which one it used.

Deliberately **not** included: DuckDuckGo and Google scraping. Both work today and both break
without warning, and shipping a scraper into something you intend to sell is a liability, not
a feature.

### A note on Groq models and free-tier limits

Groq retires model ids regularly — the `llama-3.x` ids the original spec suggested are
already gone, which is why the default is `openai/gpt-oss-120b`. List what your key can
actually reach before a demo:

```bash
curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY" | jq -r '.data[].id'
```

The free tier allows **8,000 tokens per minute**, and Groq counts your `max_tokens`
reservation against that budget, not just what the model returns. Three things keep the
pipeline inside it:

- the synthesis prompt gets a balanced, host-deduplicated **subset** of the evidence with
  clipped snippets, while the dashboard still shows every source retrieved;
- `reasoning_effort` is set to `low` (the gpt-oss models are reasoners, and reasoning tokens
  are billed against `max_tokens` — a small budget with a big effort returns an empty string);
- a 413 or a token-limit 400 automatically retries once with half the budget, and a 429
  waits out a short window before retrying.

---

## The recorded demo

A live presentation should not depend on venue wifi, a search quota or a rate-limited model.
`src/lib/demo/recorded-run.json` is a **real investigation, captured once and replayed** — the
searches genuinely ran, the model genuinely wrote the analysis, and the file is committed to
the repo. Pressing the demo button makes **no network request of any kind**: the run is
statically imported (≈6 KB gzipped) and parsed in memory.

The replay still walks the four pipeline stages at live pacing, so the narration over
"gathering exhibits" is unchanged — only the risk is gone. It is labelled honestly: a
**Recorded run** banner names the capture date, and provenance reads `21 live sources
(recorded)` — never "live", never "sample".

Re-record whenever you like:

```bash
npm run dev          # in one terminal
npm run record-demo  # in another
```

The script refuses to freeze a run whose research or analysis fell back to sample data, so a
bad capture can never silently become the demo. Pass `--allow-fallback` to override, or
`RECORD_IDEA="…"` to record a different idea. Eight tests treat the recording as source code:
it must parse, keep its verdict consistent with its sub-scores, and cite nothing absent from
its own exhibit register.

## Data provenance

The product's credibility rests on never passing sample data off as live research, so
provenance is tracked per integration and rendered everywhere:

- Every stage returns a `dataSource` of `live` or `demo`.
- The results header shows one badge per integration, and each section repeats it.
- Any fallback that happened mid-run is listed in a banner at the top of the results.
- Fixture findings **never** borrow live source URLs. If the search was live but the model
  failed, the sample analysis renders with no citations and says so.
- The 7-day plan will not tell you to register a domain whose availability was sample data.
- The generated brief carries the same notices.

An integration falls back to labelled sample data when `DEMO_MODE=true`, when its key is
missing, or when the live call fails. A failed call never breaks the run.

A render fault degrades to a themed error boundary with a retry rather than a blank page, and
an expired share link lands on a themed 404 rather than the framework default.

---

## Architecture

```
src/
  app/
    page.tsx                  server component; reads config, renders the client app
    r/[id]/                   shared read-only report
    api/
      analyze/                POST  idea            → StartupIdeaAnalysis
      research/               POST  analysis        → ResearchEvidence   (SerpApi)
      synthesize/             POST  analysis+evidence → ViabilityAnalysis
      domains/                POST  analysis        → DomainReport       (name.com)
      runs/                   POST  full run        → saved report id
      brief/                  POST  full run        → LaunchPlan (markdown)
      health/                 GET   configuration probe
  lib/
    ai/
      provider.ts             picks the provider from AI_PROVIDER
      openai-compatible.ts    one client for Groq and OpenRouter, with budget retries
      json.ts                 pulls JSON out of chatty model replies
    research/
      engine.ts             query planning, provider fallback, dedupe
      cache.ts              7-day disk cache — what makes rehearsals free
      quota.ts              remaining SerpApi allowance
      providers/            serpapi · brave · hackernews (keyless)
    domains/namecom.ts        candidate generation, batched availability check
    analysis/
      schemas.ts              every payload, validated with Zod
      prompts.ts              analyst prompts + evidence selection for the model
      scoring.ts              weighted score + verdict, computed server-side
      pipeline.ts             LLM stages with labelled fallbacks
      actions.ts              the 7-day plan, derived from the run
      insight.ts              verdict sensitivity and evidence coverage
      brief.ts                deterministic markdown assembly
    store.ts                  saved reports (file-backed, memory fallback)
    history.ts                local idea history as an external store
    rate-limit.ts             per-visitor sliding window (production only)
    demo/fixtures.ts          deterministic sample data
  components/                 landing, pipeline, results dashboard
```

### Design decisions worth knowing

**The LLM reasons; it does not supply facts.** The first call only structures the idea and
writes search queries — it is explicitly told it has no evidence yet. The second call may
only make factual claims backed by the retrieved sources, and every citation it returns is
checked against the actual evidence set server-side; invented URLs are stripped.

**The score is computed, not generated.** The model supplies five sub-scores. The overall
score is a weighted sum (`demand 0.30, competition 0.20, differentiation 0.20,
monetization 0.15, execution 0.15`) and the verdict follows fixed thresholds, so the headline
number can never contradict the bars beneath it.

**Evidence selection matters more than evidence volume.** Forum threads are strong evidence
of customer pain and weak evidence of which products exist, so they sink below product pages
in the competitor bucket; and no single host may fill more than two slots, because three
pages about one app should not read as three competitors.

**The 7-day plan is derived, not generated.** It names the actual competitor, thread, gap and
domain from this run, so it cannot drift into generic advice and costs no extra model call.

**Reports persist.** A finished run is saved and gets a shareable `/r/<id>` link. The store is
file-backed with an in-memory fallback, behind one interface — swapping in Postgres or Redis
means replacing `lib/store.ts` and nothing else. On read-only serverless hosts, only the
in-memory path works and links will not survive a cold start.

**It says what would change its mind.** The five sub-scores are weighted, so effort does not
pay off evenly across them. Every file states the gap to the next verdict, where the most
upside actually sits, whether any single score could close the gap alone, and how far one
score would have to fall before the verdict flips. It is arithmetic on the model's own
numbers — no extra call, nothing invented.

**It measures its own sourcing.** Rather than claiming its facts are cited, each file reports
what share of factual claims carry a real exhibit, how many of the retrieved sources were
actually used, how many market signals a source states outright versus inferred, and how many
things it admits it could not establish. The "exhibits used" figure is deliberately
self-critical — drawing on 9 of 21 sources is worth knowing.

**⌘K goes anywhere.** A command palette jumps to any chapter, copies the share link or prints
the file, without touching the mouse. Chapters carry stable anchors (`#exhibits`, `#orders`),
so a shared link can point at one finding.

**The brief is the same document.** The exported markdown mirrors the on-screen file chapter
for chapter, with the same numbered exhibits — a claim cites `(ex. 4, 11)` and the register at
the end resolves the numbers. Unsourced claims are labelled `inference — no exhibit` rather
than given a citation they do not have.

**It prints.** `@page` margins, no orphaned findings (`break-inside: avoid` on sections,
exhibits and quotes), animations disabled, and the verdict stamp forced to ink rather than
dropped by the print driver. Hand a judge a printout and it still reads as a case file.

**It is a document, not a dashboard.** The results page is laid out as a printed case file:
a masthead with a case number, an inked verdict stamp, evidence as a numbered exhibit register,
the argument as facing "case for / case against" columns, and the plan issued as orders. This
is not decoration — the product's logic is judicial (evidence in, verdict out, adversarial mode
optional), so citations can point at *exhibit 04* instead of dumping a URL into the prose, and
the layout itself states that both sides get heard.

**Idea history stays local.** Validated ideas are kept in `localStorage`, ranked by score, and
never uploaded.

**Rate limiting is production-only.** Local development is single-user by definition, and a
limiter that blocks a demo rehearsal is worse than no limiter. In production, callers are
bucketed by `x-forwarded-for`; if no proxy header identifies the caller, the ceiling is
loosened rather than funnelling every visitor into one shared bucket.

---

## Modes

**Validate My Idea** — honest assessment against the evidence.

**Cross-Examine** — the same investigation, conducted the way a careful investor would before
writing a cheque. Search queries bias toward evidence that could disprove the idea, and the
analyst is told to lead with what the evidence fails to support. The orders change too:
instead of "register the domain and build the first feature", the week becomes "look for the
narrower idea inside this one, then make the call in writing".

Verdicts are **BUILD**, **REFINE** and **SHELVE** — three calm imperatives. The product has to
be able to say no, but it does not need to be theatrical about it.

---

## Scripts

```bash
npm run dev        # development server
npm run build      # production build
npm run lint       # eslint
npm run typecheck  # next typegen && tsc --noEmit
npm run test       # vitest
```

110 tests cover the things that break demos: truncated JSON, markdown-fenced replies, chatty
preambles, missing fields, scores as strings, invalid verdicts, citation URLs that were never
in the evidence, fixture data borrowing live URLs, over-long domain candidates, and rate-limit
window arithmetic, cache TTL and key collisions, and provider-chain fallback.
