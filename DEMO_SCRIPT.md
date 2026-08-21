# LaunchPilot — 2-minute demo script

## Before you start

- [ ] `npm run dev`, browser at http://localhost:3000, **full screen**, zoom 100%
- [ ] Run it once as a rehearsal so Next.js has compiled every route — this also warms the
      history list, which makes the landing page look lived-in
- [ ] Groq's free tier allows 8,000 tokens per minute. Back-to-back runs inside one minute
      can trip it; the app degrades honestly rather than failing, but leave ~30s between
      rehearsal and the real thing
- [ ] Rehearse with the recorded demo — it costs no quota and cannot fail
- [ ] Only if you plan to run something live on stage: check quota with
      `curl "localhost:3000/api/health?probe=all"` and read `runsLeft` (each live run costs six
      searches)
- [ ] Check the badge row at the bottom of the landing page — it tells you and the judges
      exactly which integrations are live
- [ ] If venue wifi is unreliable: set `DEMO_MODE=true` and restart. The UI is identical and
      the run is deterministic. Say "I'm running in demo mode" — the app labels it anyway.

**Just press "Run the recorded demo."** It replays a real investigation captured on
20 August 2026 — 21 exhibits, REFINE 53/100 — and makes no network request at all. If the wifi
dies mid-pitch, the demo does not care.

Use the text box and **Validate My Idea** only if a judge asks you to run something live.

Why this idea: it produces real competitors, genuine complaint threads, an obvious cuisine
gap, an available `.com`, and a REFINE verdict — which is far more convincing than a product
that tells every founder to build.

---

## 0:00 – 0:15 · The problem

> "Most founders don't know whether their idea is worth building. They ask friends, get
> encouragement, and spend six months finding out the hard way."

If the room reacts to the look, say it in one line — then move on:

> "It's laid out as a case file rather than a dashboard, because that's what it actually is:
> evidence in, a verdict out."

Click **Run the recorded demo**.

> "So: an AI meal planner for Indian families. Let's find out."

---

## 0:15 – 0:35 · The pipeline (talk over it)

Four stages light up in order. Narrate while they run:

> "First the model structures the idea and writes its own research plan — it isn't allowed
> to state any market facts yet, it has no evidence."

The six search queries it wrote appear under **Searching the live web**. Point at them.

> "Those queries go to SerpApi. Six live searches, in parallel — competitors, market
> signals, and customer complaints."

The stage reports **Found 10 sources**.

> "Then the model analyses only what came back. And it checks domains at the same time."

---

## 0:35 – 0:55 · The evidence

The dashboard lands on the verdict. Scroll to **II · Exhibits**.

> "Every card is a real source. Filter by competitor, market, or customer pain."

Click **Customer pain**. Open one card.

> "This is the finding that matters: the complaint isn't 'there's no meal planner', it's
> that people abandon them after a month because menus get repetitive. That reframes the
> whole product — retention is the hard problem, not acquisition."

Scroll to **III · The field**.

> "Four real competitors, each with the source it came from. The model isn't allowed to
> name a competitor that didn't appear in the research — and any citation it invents gets
> stripped server-side before it reaches this page."

---

## 0:55 – 1:10 · Domains (sponsor moment)

Scroll to **VII · The name**.

> "The model proposed brand names; every candidate is checked against the **name.com API**."

Point at the highlighted best domain — **mealmitra.com, AVAILABLE, $16.99**.

> "That availability and that price come from name.com, live. This isn't a decoration — it's
> the step between 'good idea' and 'I can start today'."

---

## 1:10 – 1:30 · The score

Scroll back to the top of the file.

> "67 out of 100. REFINE."

Point at the five scores, then the line underneath them.

> "Demand 78 — the pain is real. Competition 52 — the category is crowded. Differentiation
> 71 — the cuisine gap is genuinely open. The overall score is computed from those weights
> server-side, so the headline can never contradict the bars. And the verdict follows the
> number, not the model's mood."

> "And this is the part I'd pay for: it tells you what would change its mind. Eighteen points
> from BUILD, no single score can close that alone, and the most room is in competition. It
> also tells you how fragile the verdict is — demand would have to fall twenty-six points
> before it flips."

Then, in **IX · On the record**:

> "It measures its own sourcing rather than claiming it. A hundred per cent of factual claims
> carry an exhibit — and note it only drew on nine of twenty-one sources. It tells you that
> about itself."

---

## 1:30 – 1:50 · What you do on Monday

Scroll past **V · The case** and **VI · What to build** to **IX · On the record**.

> "The model has to declare what it *couldn't* verify. It doesn't invent a number to fill a
> slot — which is the failure mode of every 'AI startup generator'."

Then scroll to **VIII · Orders** and slow down. This is the close.

> "And this is the part that makes it a product rather than a report. Seven days of work,
> derived from this run — not generic advice."

Point at three specific rows:

> "Day 3 names the actual competitor it found and the exact weakness to go confirm. Day 4
> links the real thread where these customers are already complaining. Day 6 is the domain,
> because it's the cheapest irreversible step you can take."

---

## 1:50 – 2:00 · Share it, then close

Click **Share report** in the header.

> "That's a permanent link — the whole report, provenance badges included, ready to send to
> a co-founder."

Then click **Generate Launch Brief**.

> "Or take the whole thing as a document."

Final line:

> "LaunchPilot turns one sentence into live market evidence, a defensible decision, a domain
> you can register, and a launch plan. Don't build it until you validate it."

---

## If someone asks a question mid-demo

Press **⌘K**, type the chapter, hit enter. It jumps straight there. Useful when a judge asks
about competitors while you are three screens away.

---

## If a judge asks "what stops this being a toy?"

Three answers, in order of strength:

0. **"What you just watched was real."** The recorded run is a genuine investigation, replayed
   — every exhibit is a real URL that was really retrieved. It is labelled as recorded rather
   than live, because claiming otherwise would be exactly the dishonesty this product exists to
   prevent. Offer to run a live one on the spot.
0. **"It doesn't look like every other AI demo."** Numbered exhibits, an inked verdict stamp,
   and facing case-for / case-against columns. The form follows the logic — this is an
   investigation, not a chat wrapper.
1. **"It can't make things up."** Every citation is checked against the evidence set
   server-side; invented URLs are stripped before they render. The score is computed from
   weights, not written by the model.
2. **"It never lies about where data came from."** Point at the badge row. If a key is
   missing the app says sample data, the fixture analysis renders with no citations at all,
   and the 7-day plan refuses to tell you to buy a domain it didn't really check.
3. **"It survives its own dependencies."** Free-tier token limits, retired model ids and
   failed searches are all handled — the run finishes and tells you what degraded. Search
   falls back SerpApi → Brave → Hacker News, and results cache for a week, so a 250/month
   allowance does not cap how often you can demo it.

---

## If you have 30 extra seconds

Click **New idea**, paste the same idea, and click **Cross-Examine**.

> "Same idea, cross-examined — tested the way an investor would before writing a cheque. It
> searches for what could disprove it and grades strictly. The score drops and the summary
> leads with the incumbents. A validator you can't argue with is just a hype machine."

---

## Sponsor integrations to name out loud

| Integration | Where it shows up | What to say |
| --- | --- | --- |
| **SerpApi** | Stage 2, Market evidence section | "Six concurrent live searches. This is the evidence layer — every claim on the page traces back to one of these URLs." |
| **name.com** | Domain finder section | "Live availability and pricing, batched into one API call. It's a product step, not a checkbox." |
| **Groq / OpenRouter** | Everywhere | "Provider-agnostic behind one interface — Groq for speed, OpenRouter as the fallback. Two LLM calls for the whole pipeline, and the client handles the free tier's token-per-minute ceiling on its own." |

---

## Numbers you'll see

With the demo idea in sample-data mode: **67/100 · REFINE**, 10 sources,
**mealmitra.com AVAILABLE**. Adversarial mode: **56/100 · REFINE**.

With live keys the numbers move — the evidence is real and changes daily. A recent live run
scored **52/100 · REFINE** on 21 sources and named four real competitors, including one
India-specific app. Don't quote a memorised score; read what's on screen. Everything above
still holds.

---

## If something fails on stage

Nothing dead-ends. If a key is missing or an API call fails, that stage falls back to
labelled sample data, an amber banner explains exactly what happened, and the run finishes.
If a judge asks, that banner is the honest answer — and it is a feature worth pointing at.
