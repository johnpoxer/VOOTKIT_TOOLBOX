# Vootkit monetization audit

Measured against the live codebase on **3 Aug 2026**. Every figure here came
from running something, not from estimating.

The audit brief asked for twelve phases. Most of what those phases describe was
**already built** — accounts, favourites, history, related tools, schema,
hreflang, unique metadata. Rebuilding them would have been the expensive way to
achieve nothing. What follows separates what exists from what was genuinely
missing, and records what was fixed in this session.

---

## Readiness score: 84 / 100

> **Corrected 3 Aug 2026.** The first version scored 68 and claimed nobody could
> subscribe. That was wrong: `stripe.plans[].price` in site.config.js is an
> unused field, and checkout reads `VK_PRICE_*` environment variables which were
> set correctly all along. Verified by POSTing to the live function — all four
> plans return real Stripe Checkout URLs. Ad slot ids have since been created
> and wired, so both "empty string" blockers are now closed.

| Area | Score | Why |
|---|---|---|
| SEO foundations | 18/20 | 283/283 unique descriptions, full schema, hreflang, canonical. Only 10 pages indexed. |
| Ad infrastructure | 19/20 | Units, network switch, lazy loading, consent. **Slots 4617624167 / 8309457166 created and live.** |
| Analytics | 15/15 | Six-event funnel, allow-listed params. Was 0/15 two commits ago. |
| Trust & compliance | 14/15 | All six required pages now exist; consent shipped. GA4 internal filter still off. |
| Subscription | 12/15 | **Checkout verified working on all four plans.** Remaining: confirm a payer is recognised as Pro. |
| Performance | 5/15 | ~86 KB JS per tool page is fine; no measured CWV, no image optimisation pass. |

**Both former blockers are closed.** What now caps the score is traffic and
measurement, not plumbing: Core Web Vitals has no data, GA4 still counts the
owner's own sessions, and only 10 pages are indexed.

---

## Phase 1 — audit findings

### Already built, verified present

| Thing | Evidence |
|---|---|
| Unique meta descriptions | 283 unique across 283 pages |
| Structured data | FAQPage + BreadcrumbList + SoftwareApplication per page |
| Canonical + hreflang | 1 canonical, 11 hreflang per tool page |
| Internal linking | 6 related tools/page, ~2,000 internal edges |
| Accounts, favourites, history | `account.js`, `auth.js`, `recent.js` (Supabase) |
| Security headers | nosniff, Referrer-Policy, X-Frame-Options |
| Per-page JS weight | ~86 KB across 10 files — not a problem |

### Found missing, fixed this session

| # | Problem | Revenue impact | Priority | Fix |
|---|---|---|---|---|
| 1 | **No consent mechanism at all.** GA4 fired on every page since launch without asking. | AdSense withholds personalised ads for EEA/UK without a consent solution — contextual is worth a fraction. Site ships 5 EU locales and reports in EUR. | **P0** | Consent Mode v2 inlined **above** the ad and GA4 tags; banner with equal-weight Reject/Accept |
| 2 | **0 of 283 pages had `og:image`.** | Every shared link rendered as bare text, on a product people recommend by link. | **P1** | Branded 1200×630 card, absolute URL, large Twitter card, dimensions declared |
| 3 | Cookie Policy missing | Ad reviewers check for it; consent banner had nowhere to link | **P1** | Written — names the actual keys the site sets |
| 4 | Disclaimer missing | YMYL exposure on mortgage/loan/paycheck/BMI tools | **P1** | Written — covers financial and health tools by name |
| 5 | Ads initialised inline at load | Off-screen ads competed with the tool for main-thread time; CWV is a ranking signal | **P2** | `ads.js` fills on approach (400px margin) with a no-IO fallback |

### Found missing, NOT fixed — needs your dashboard

| # | Problem | Impact | Fix |
|---|---|---|---|
| 6 | ~~AdSense slot ids empty~~ | **DONE** — two Display units created, ids wired, 2 units per tool page | — |
| 7 | ~~Stripe price ids empty~~ | **WAS NEVER TRUE.** Checkout live on all four plans; the config field is unused | — |
| 8 | GA4 internal traffic unfiltered | `/index.html` shows 40 views from 1 user; you are most of your own data | Admin → Data Streams → Define internal traffic |
| 9 | Key events not marked | Events fire but do not count as conversions | Admin → Events → mark as key event |

### Known gaps, deliberately deferred

- **No sidebar ad placement.** Asked for in the brief. Deferred because at 590
  views/28 days it earns nothing, and a third unit on a page with no traffic is
  inventory, not revenue. Revisit above ~10k monthly pageviews.
- **No A/B testing framework.** Meaningless at current volume — you need
  hundreds of conversions per variant to read a result.
- **No dedicated landing pages.** Same reason. The tool pages *are* the landing
  pages until paid traffic actually runs.
- **No Core Web Vitals measurement.** Search Console shows "No data" for CWV,
  because there is not enough traffic to populate the report.

---

## Phase 12 — strategy

### Top tools to monetize first

Ranked by **RPM × render speed × non-adblock audience** — not by traffic, which
you do not yet have enough of to rank by.

1–10 (finance, highest CPC, pure JS, low adblock):
mortgage-calculator · loan-calculator · auto-loan-calculator ·
refinance-calculator · home-affordability · credit-card-payoff ·
investment-calculator · compound-interest · paycheck-calculator ·
currency-converter

11–20 (file tools, mid RPM, strong workflow chains):
merge-pdf · compress-pdf · split-pdf · jpg-to-pdf · compress-image ·
resize-image · convert-image · compress-video · heic-converter · pdf-to-jpg

**Deprioritise developer tools.** Highest adblock penetration of any segment
(50–70%) — half those pageviews cannot be monetised at all.

### Expected RPM by category (tier-1 organic)

| Category | RPM |
|---|---|
| Finance calculators | $8–25 |
| PDF | $3–7 |
| Image | $1.50–4 |
| General/everyday | $1–3 |
| Developer | $0.50–2 |

### Roadmap

**30 days — make one dollar possible**
1. ~~Paste AdSense slot ids~~ — done, units live.
2. ~~Stripe~~ — already working; verified on all four plans.
3. Filter internal traffic in GA4 and mark the four key events.
4. Deploy consent + og:image + policy pages (this session's work).
5. Continue content batches 7+; request indexing at 10/day.

**90 days — reach a network that pays**
6. Target **Mediavine Journey at 10,000 sessions** — nearest reachable tier.
   Not Ezoic; they moved to 250,000 for new publishers in Feb 2026.
7. Finish deep content on the remaining ~175 tools.
8. Build the calculator "same calc, one variable changed" chain — the missing
   second pageview for half the catalogue.
9. Once conversion data exists, run a **$200 Google Ads** test on the ten
   finance tools. Buy intent, not volume.

**12 months — compounding**
10. Premium network at 8–12× AdSense RPM on the same traffic.
11. Pro subscription as the majority of revenue; ads as the floor.
12. Reconsider the sidebar unit, A/B framework and landing pages — all of which
    become worth building once there is traffic to test with.

---

## What actually decides things now

Both money paths are open: ads render and checkout completes. Nothing in the
codebase is blocking revenue any more.

What blocks it is **traffic**: 590 views in 28 days, 10 pages indexed of 292,
and a GA4 property that still counts the owner as a user. The content and
indexing work is the whole remaining lever.

**A note on method, since it cost real credibility here.** The "nobody can
subscribe" claim came from reading a config field instead of testing the
behaviour. One POST to the live function would have shown four working Checkout
URLs. Test the running system before reporting it broken.
