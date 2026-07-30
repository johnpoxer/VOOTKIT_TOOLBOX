# Vootkit Master Operating Plan — Execution Edition

**Scope:** Parts 1–6 and 8 of the Global Domination Master Plan. The AI layer (Part 7, AI assistant, AI agents) is deliberately excluded at your request.

**What this document is.** The master plan is the strategy. This is the execution layer: the same goals sequenced against what the codebase can actually support today, with the parts that would cost more than they return marked as such. Where I disagree with the plan, I say so and give the reason.

**Grounding.** Everything below is checked against the Phase 0 audit (`VOOTKIT_TECHNICAL_AUDIT.md`): 257 tool pages, 1,478 generated pages across 11 locales, static HTML + `build.js`, Supabase for auth/usage/short links, Netlify Functions for Stripe.

---

## 0. The one thing missing from the plan

The plan's Phase 0 lists four weaknesses: conversion, SEO foundation, retention, content machine. All four are real. But it omits the one the audit proved:

**There is no way to know when a tool breaks.**

Two tools were broken in production. Nothing reported it. They were found because a user said so, and the first two attempts to fix them shipped without catching that one was still broken on mobile. That is not a tooling gap — it is a structural blind spot, and it sits underneath every other item in this plan.

Consider what the flywheel actually does if it stays unfixed:

```
SEO brings 10,000 visitors/month
        ↓
5% land on a tool that is silently broken
        ↓
500 people/month form the impression "Vootkit doesn't work"
        ↓
no signal reaches you
        ↓
you invest further in content to bring more people to it
```

Every part of this plan multiplies traffic into the product. Multiplying traffic into an unmonitored product multiplies the damage from any single failure. The plan's own stated principle — *"Never scale broken foundations"* — leads directly here, but the roadmap doesn't include it.

**This is Phase 1, Task 0. Nothing else in this document should start before it.** It is roughly a day of work: the `error_logs` table the protocol already specifies, plus a `catch` in each of the three mount engines (`VKW`, `VKFile`, `VKCalc`) — three call sites, not 257.

---

## 1. Three items in the plan I recommend against

I'd rather flag these now than have you spend months on them.

### 1.1 Flat URLs — do not do this

The plan specifies:

> Prefer `vootkit.com/pdf-compressor` — Avoid `vootkit.com/tools/pdf/compressor/index.html`

The current structure is `/tools/pdf/text-to-pdf/` — already clean, already trailing-slash directories, no `.html`. The plan's "avoid" example isn't what the site does.

Migrating to flat URLs means 1,478 pages × 11 locales of redirects, canonical rewrites, sitemap regeneration, and a re-indexing period during which rankings are volatile. Google has stated repeatedly that URL depth is not a ranking factor; the SEO gain here is approximately zero.

**High risk, no measurable reward. Skip it.** Spend the same effort on internal linking (§3.2), which is a real ranking factor and which the site is currently weak at.

### 1.2 Programmatic SEO at the stated scale — cap it hard

The plan multiplies file types × actions × users × platforms. That combinatorial space is roughly 10 × 8 × 8 × 8 = **5,120 pages per category**. Across 20 categories it is six figures.

Google's helpful-content system specifically targets scaled content with low per-page differentiation. The plan says the pages must be "intelligent" but doesn't define the gate. Without one, this is the single fastest way to get the whole domain demoted — including the 257 tool pages that currently rank fine.

**Recommendation:** hard cap at **150 use-case pages total**, each requiring a genuinely distinct reason to exist — a different file-size limit, a different platform constraint, a different regulatory requirement. `compress-pdf-for-government-upload` passes (real, specific size limits). `compress-pdf-for-students` does not (identical to the generic page with a different noun). Build 20, wait 90 days, measure, then decide whether to continue.

### 1.3 The content volume target — not achievable solo

The plan targets 30+ articles, 10+ tutorials, 10+ news pieces and 1 research report monthly. At professional quality that is a 3–5 person editorial team. Attempted solo, the realistic outcome is thin content at volume, which lands in the same penalty bucket as §1.2.

**Recommendation:** 4 deep articles/month that fully own their query beats 30 shallow ones. The newsroom (daily/weekly news cadence) is the most staff-hungry item in the entire plan and the least defensible — news has no compounding SEO value and decays in days. **Cut the newsroom until there is a dedicated writer.**

---

## 2. What the plan gets right, and what already exists

Worth being clear that a lot of the foundation is already built:

| Plan item | Status in the codebase |
|---|---|
| Account system | Built — Supabase auth, `auth.js`, `account/` |
| Usage limits / free tier | Built — `usage.js`, 5 runs/day |
| Payments | Built — Stripe via Netlify Functions |
| Blog + CMS foundation | Built — `blog/`, `admin-console/`, `content/` |
| Multi-language | Built — 11 locales, 1,192 localised pages |
| Schema markup | Built — Breadcrumb, SoftwareApplication, FAQ on every tool page |
| Canonicals | Built — present and correct on all 257 tool pages |
| Sitemap | Built — 1,479 URLs |
| Category hubs | Built — `/tools/<category>/` |
| Related tools / no dead ends | Built — every tool page has a "Next in…" block |

The strategic diagnosis in the plan is sound. The gap is not architecture — it's that **retention and measurement are missing**, while acquisition machinery is largely present.

---

## 3. Execution sequence (non-AI)

Ordered by leverage per unit of effort, not by the plan's phase numbering.

### Phase 1 — See what's happening (weeks 1–4)

**1.0 Error telemetry** — §0. Blocks everything.

**1.1 Funnel instrumentation.** You cannot optimise conversion without knowing where the drop is. Instrument four events: `tool_view`, `tool_run_started`, `tool_run_completed`, `tool_run_failed`. This also gives the per-tool health data the protocol's `/admin/tool-health` dashboard needs, and `docs/tool-registry.json` already provides the tool list to join against.

**1.2 Browser smoke tests in CI.** The audit's top High item. 907 assertions cover pure functions; zero cover a tool running. Both production bugs lived in that gap.

**1.3 Fix the 87 over-length titles.** Listed in `docs/tool-registry.json`. Mechanical, affects click-through on every ranking page.

### Phase 2 — Stop the leak (weeks 5–10)

The plan is right that this is the highest-value commercial work. Order matters:

**2.1 Tool-completion capture.** The single highest-intent moment on the site — the user has just received something of value. Add the account prompt to the result screen, non-blocking, with "continue without account" preserved. `filetool.js` `renderResult()` is the one place this needs to go for all file tools.

**2.2 Anonymous usage tracking → prompt after 3 tools.** Straight from the plan, and correct. `usage.js` already tracks per-day counts locally; extend it to a rolling total.

**2.3 Newsletter.** Only after 2.1 and 2.2 are measured. A newsletter with no traffic-to-signup conversion is a list of nobody.

**2.4 Onboarding by segment** (student / creator / developer / business). Cheap, and it makes 2.1 meaningfully better.

### Phase 3 — Give them a reason to come back (months 3–6)

**3.1 Dashboard v1** — history, favourites, saved tools. The plan's version staging is right: do not build projects/storage before history is used.

**3.2 Internal linking engine.** The plan undersells this. It's a genuine ranking factor, it's cheap, and the site already has the data — `data/catalog.js` knows every tool's category and relationships. Generating contextual links from articles to tools and between related tools is a `build.js` change, not a product.

**3.3 Content: 4 deep articles/month**, each tied to a tool cluster (§1.3).

### Phase 4 — Extend reach (months 6–12)

**4.1 Browser extension.** Highest-leverage item in Part 6 by a wide margin. It converts Vootkit from a destination into a default, and the right-click → "send to Vootkit" flow is the plan's best single product idea. Chrome first; Edge is a near-free port; Safari and Firefox later.

**4.2 Workflows v1** — chain 2–3 tools, no builder UI. Prove people want chaining before building a visual editor.

**4.3 Mobile web before mobile apps.** The audit found mobile video processing is marginal — 32 MB of wasm engine plus a phone video against iOS Safari's memory ceiling. Fix the mobile web experience before committing to native apps, and be honest on tool pages about which tools work on a phone. The site currently claims "Works on mobile" on tools where that is not reliably true.

### Phase 5 — Only if Phase 4 works (12+ months)

Marketplace, developer API, enterprise. Each depends on the previous layer having real usage. The marketplace in particular is a two-sided market — it needs creators *and* users, and it fails without both. Do not start it to create demand; start it because demand exists.

---

## 4. Sequencing principle

The plan's flywheel is correct but it is drawn as a circle, which hides that it must be built as a line:

```
measurement → retention → acquisition → ecosystem
```

Acquisition before measurement means spending on traffic you cannot evaluate. Acquisition before retention means paying to fill a leaking bucket — the plan says this well in Part 5 and then sequences SEO first anyway.

**The current numbers make this concrete.** At ~612 visitors/day with near-zero retention, doubling traffic adds ~612 more people who leave. Moving signup conversion from 0.5% to 2% is worth more than tripling traffic, costs a fraction as much, and compounds — every retained user makes the next acquisition dollar go further.

---

## 5. Honest risk register

| Risk | Why it matters here |
|---|---|
| Scaled thin content | §1.2 — can demote the whole domain, including pages that currently rank |
| Solo content targets | §1.3 — quality collapse is the failure mode, not missed deadlines |
| Building before measuring | No baseline means no way to tell whether any of this worked |
| Mobile claims | "Works on mobile" is not true for video tools; overclaiming costs trust with the exact users SEO brings |
| CDN dependency | pdf-lib, ffmpeg, fontkit, fonts all third-party, no SRI, no fallback — a jsDelivr outage takes out PDF, video and OCR simultaneously |
| Marketplace timing | Two-sided market started too early fails visibly and is hard to relaunch |

---

## 6. If you do only three things

1. **Error telemetry.** You are currently flying blind on a product whose entire value proposition is "it works."
2. **Tool-completion capture.** The highest-intent moment you have, currently unused.
3. **Browser extension.** The one item in Part 6 that changes the category Vootkit competes in.

Everything else in this plan is real and worth doing. These three change the trajectory; the rest compounds on top of them.

---

*Companion documents: `VOOTKIT_TECHNICAL_AUDIT.md` (current state, evidence), `VOOTKIT_FIX_ROADMAP.md` (prioritised defect list), `docs/tool-registry.json` (per-tool inventory and scores).*
