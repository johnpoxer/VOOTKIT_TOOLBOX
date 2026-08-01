# Vootkit — Indexing Audit and Recovery Plan

Measured 1 August 2026 against the live site and the real Search Console property.
Every number below was read from the tooling, not estimated.

---

## The one-paragraph answer

The sitemap was never submitted, which capped Google at 75 known pages. That is now
fixed and Google has discovered all 1,484. **But the sitemap was not the binding
constraint.** Of the 75 pages Google had already crawled, it indexed 10 and marked 54
"Crawled — currently not indexed". The reason is measurable: a Vootkit tool page has a
median of **95 words that do not appear on the other 260 tool pages**. Google crawled
the template, decided it was the same page 261 times, and stopped. Fixing sitemaps,
robots and schema will not change that. Only content differentiation will.

---

## Baseline (1 Aug 2026)

| Metric | Value |
|---|---|
| Clicks from Google, 3 months | **2** |
| Impressions, 3 months | 3,290 |
| Average CTR | 0.1% |
| Average position | **84.8** |
| Pages indexed | **10** |
| Pages not indexed | 65 |
| Sitemaps submitted (before) | **0** |
| Core Web Vitals | *No data — insufficient traffic for CrUX* |

Not-indexed breakdown:

| Reason | Pages | Verdict |
|---|---|---|
| Crawled — currently not indexed | **54** | **The real problem.** Thin/duplicate template. |
| Alternative page with proper canonical | 4 | Working as intended |
| Not found (404) | 3 | Old URLs, harmless |
| Page with redirect | 3 | The 97 legacy 301s doing their job |
| Excluded by 'noindex' | 1 | Intentional — under-construction tools |

---

## 1. Search Console setup

**Verdict: correct. No changes needed.**

- Property is `sc-domain:vootkit.com` — a **domain property**, which already covers
  `www`/non-`www` and `http`/`https`. Adding a URL-prefix property would give you a
  second set of numbers for the same site and nothing else.
- Verification is live (the property serves data).
- Sitemap: **was zero**. Submitted 1 Aug, status **Success**, 1,484 discovered.
  It briefly showed "Couldn't fetch" — that is the normal state for a few minutes
  after submission, not an error.

**Do not** create a URL-prefix property. **Do not** re-verify. This section was fine.

---

## 2. Sitemap architecture — implemented

`sitemap.xml` is now a **sitemap index**:

```
sitemap.xml                 (index)
├── sitemap-core.xml          6 urls   home, /tools/, pricing, about, contact, privacy, terms
├── sitemap-tools.xml       279 urls   category hubs + every live tool
└── sitemap-blog.xml          7 urls   blog index + posts
```

**Why an index, honestly:** it does **not** improve indexing. The 50,000-URL limit is
nowhere near. What it buys is *diagnosis* — Search Console reports indexed counts per
child sitemap, so "are tool pages getting indexed, or only the blog?" becomes a number
instead of a guess. At 10/292 indexed, that question is the whole game.

**Per-language sitemaps are deliberately NOT included.** The 1,192 localised pages stay
live, self-canonicalising, with full hreflang — they are simply not in the sitemap.
A sitemap is a request for crawl attention; spending it on nine near-duplicate
translations of a page that does not yet rank in English competes with the pages that
could. Revisit when English tool pages hold real positions.

Also added: `<lastmod>` on every entry, which Google uses to prioritise recrawls.

**Nothing to re-submit.** The index kept the `sitemap.xml` filename, so the submission
already on file resolves to it.

---

## 3. robots.txt

**Verdict: correct. Do not change it.**

```
User-agent: *
Allow: /
Sitemap: https://www.vootkit.com/sitemap.xml
```

Nothing is disallowed, Googlebot has full access, the sitemap is declared. Robots.txt
is not, and never was, the problem. Adding crawl-delay or per-bot rules here would only
create risk.

---

## 4. Technical SEO — what is already right

This is the unusual part of this audit: **the technical layer is in good shape.**
Measured on a live tool page:

| Check | Status |
|---|---|
| Canonical tag | Self-referencing, absolute, correct host |
| hreflang | 10 alternates + `x-default`, reciprocal |
| Open Graph | title, description, type, site_name present |
| Schema | `SoftwareApplication`, `FAQPage` (4 Q&A), `BreadcrumbList`, `Organization`, `Offer` |
| H1 | Exactly one, matches the tool |
| Trailing-slash redirect | Works (301) |
| Uppercase path redirect | Works (301) |
| Legacy URLs | 97 × 301 in `_redirects` |
| Internal linking depth | Every tool is **2 clicks** from home (`/tools/` links all 261) |
| TTFB | 339ms average across 40 sampled pages |
| Core Web Vitals | No CrUX data — too little traffic to measure |

**Do not spend time on Core Web Vitals.** There is no field data because there are no
users. Optimising it now is optimising a number nobody is reading.

### The two genuine technical defects

**(a) `/index.html` is reachable and returns 200.**
`…/compress-image/` and `…/compress-image/index.html` both serve, un-redirected. The
canonical tag handles it, which is why this shows as "Alternative page with proper
canonical" rather than duplicate content — but it is 261 avoidable duplicate URLs.

*Fix (Netlify `_redirects`, one line):*
```
/*/index.html   /:splat/   301!
```

**(b) Priority: everything else here is cosmetic.** Do not let a technical checklist
distract from section 5.

---

## 5. The actual problem — tool page content

Measured across all 261 tool pages:

| Measure | Value |
|---|---|
| Total words per page | 363–471, **median 513** incl. chrome |
| Words appearing on >90% of pages (boilerplate) | 210 distinct |
| **Non-boilerplate words per page** | min 67, **median 95**, max 165 |
| Vocabulary overlap, image-compressor vs merge-PDF | **65%** |

A 108-word spread across 261 pages is the signature of one template with a variable
slotted in. Two-thirds of every page is identical to every other page. Google crawled
54 of them and declined all 54.

**This is why nothing is indexed.** It is not sitemaps, robots, schema or speed.

### Target

Raise unique content from ~95 to **400+ words per tool page**, and make that content
genuinely tool-specific. Not padding — content that answers what someone searching for
that specific tool actually needs.

### Template that earns an index slot

Current pages already have the right *skeleton* (What it does / Why use this one /
How it works / Example / Questions). The sections are simply too thin and too generic.
Deepen each:

| Section | Now | Target | What makes it unique |
|---|---|---|---|
| H1 + intro | ~25 words | 60–80 | The specific problem, named. "Discord rejects your 94 MB clip" beats "compress video". |
| What it does | ~30 | 80–120 | The actual mechanism. Formats in/out, limits, what it will not do. |
| How it works | ~35 | 100–150 | Real numbered steps with the real option names from the UI. |
| **Numbers table** | absent | 60–100 | **Highest value.** Real limits/settings/thresholds for *this* tool. Cite-able, and the thing that earns links. |
| Questions | 4 generic | 5–6 specific | Mine the actual failure modes. "Why is my file still over the limit?" |
| Related tools | present | keep | Already good — real anchor text, 6 links. |

**Do not do all 261 at once.** See the 30-day plan.

---

## 6. 30-day recovery plan

Realism first: indexing moves in **weeks**, ranking in **months**. Nothing here shows
up tomorrow. The plan is ordered so the *diagnostic* signal arrives early.

### Days 1–2 — done today
- [x] Submit sitemap (was never submitted)
- [x] Split into a sitemap index for per-section visibility
- [x] Drop 1,192 localised URLs from the sitemap
- [x] Add `<lastmod>`
- [ ] Add the `/*/index.html` → `/:splat/` 301

### Days 3–7 — the 10-page probe
Pick your **10 strongest tools** (highest search demand, clearest intent — likely
compress-image, merge-pdf, compress-for-discord, heic-converter, png-to-jpg,
jpg-to-webp, pdf-to-jpg, split-pdf, resize-image, word-counter).

Rewrite those 10 to the deep template above. Then **URL-Inspect → Request Indexing**
on each. Ten is the right number: the daily quota is limited, and more importantly
**this is an experiment**. If deep pages get indexed and the other 251 do not, you have
proven the cause and earned the right to scale the fix.

Do **not** request indexing on all 292. It does not work that way and it wastes the
signal.

### Days 8–14
- Read `sitemap-tools.xml` indexed count in Search Console. This is the measurement.
- If the 10 rewritten pages are indexed → the thesis holds. Continue at ~20 pages/week.
- If they are **not** → stop and investigate Cloudflare bot rules before writing more.
- Publish 1–2 blog posts that link to the rewritten tools with real anchor text.

### Days 15–30
- Rewrite the next 40–60 tool pages, highest-demand first.
- Work the backlink playbook (`docs/BACKLINK_PLAYBOOK.md`). At position 84.8 you need
  authority, and no on-page work substitutes for it.
- Build the file-size-limits reference page from the playbook — it is the strongest
  link magnet available and it is genuinely useful.

**Success at day 30 is not traffic.** It is: indexed count off 10, and the rewritten
pages appearing in the indexed set. Clicks come later.

---

## 7. AdSense readiness

| Requirement | Status |
|---|---|
| Privacy policy | Live, 200 |
| Terms | Live, 200 |
| About | Live, 200 |
| Contact | Live, 200 |
| Navigation | Clear; every tool 2 clicks from home |
| `ads.txt` | Present and correct |
| Original content | Tools are genuinely original software |
| **Thin content** | **The risk.** 261 pages at ~95 unique words |

**Honest read:** the policy pages are all in place, which is what most rejections are
about. The remaining risk is "low value content" — 261 near-identical pages is exactly
the pattern reviewers flag. The section 5 rewrite is the same work that fixes both
indexing and this risk. There is no separate AdSense task.

One thing to watch: ads on pages with ~95 words of unique content and a tool widget is
a thin-content-with-ads profile. Prioritise the rewrite before scaling ad density.

---

## 8. International SEO

**Implementation is correct.** Verified on a live localised page: self-canonical,
10 reciprocal `hreflang` alternates plus `x-default`, no `noindex`.

**Note:** you listed Japanese — there is **no `/ja/`**. Live languages are English, es,
pt, fr, de, hi, it, zh, ar, id.

**Strategy — hold, do not expand.** 1,192 translated pages against 10 indexed English
pages is the wrong ratio. Machine-translated duplicates of pages that do not rank in
their source language are the highest-risk content on the site. Keep them live and
correctly tagged; re-add to the sitemap language by language once the English version
of those tools ranks. Adding Japanese now would add 145 more pages to a site that
cannot get 292 indexed.

---

## 9. Growth forecast

**These are scenarios, not predictions.** With 2 clicks in 3 months there is no trend
to extrapolate — anyone giving you confident numbers is inventing them. Ranges are wide
on purpose, and every one is conditional on the section 5 rewrite actually happening.

| | 3 months | 6 months | 12 months |
|---|---|---|---|
| **Conservative** — sitemap fixed, content unchanged | 40–80 indexed, <50 clicks/mo | 80–150 indexed, 50–200 clicks/mo | 150–250 indexed, 200–600 clicks/mo |
| **Realistic** — 60+ pages rewritten, 10–20 real links | 100–180 indexed, 100–400 clicks/mo | 250–400 clicks/wk | 1,500–5,000 clicks/mo |
| **Aggressive** — all 261 rewritten, 40+ links, blog cadence | 200+ indexed, 400–900 clicks/mo | 2,000–6,000 clicks/mo | 15,000–40,000 clicks/mo |

The aggressive column requires sustained work for a year and is the least likely.
The conservative column is what happens if only the sitemap gets fixed — note it is
not zero, because indexing alone recovers something.

**Leading indicators, in order.** Watch these rather than traffic:
1. Indexed count moving off 10 (weeks 2–6)
2. Average position moving below ~50 (months 2–4)
3. Impressions growing on non-brand queries (months 3–6)
4. First consistent clicks (months 4–8)

---

## 10. Priority checklist

### Priority 1 — now

| # | Action | Why | Impact | Difficulty |
|---|---|---|---|---|
| 1 | ~~Submit sitemap~~ **done** | Google knew 75 of 1,484 pages | Very high | Trivial |
| 2 | ~~Sitemap index + English only + lastmod~~ **done** | Per-section indexing visibility | Diagnostic | Done |
| 3 | **Rewrite 10 flagship tool pages to 400+ unique words** | 54 pages are "crawled, not indexed" on 95 unique words | **Highest** | High |
| 4 | Request indexing on those 10 only | Tests the thesis before scaling | High | Trivial |
| 5 | Add `/*/index.html` → `/:splat/` 301 | 261 duplicate URLs | Low | Trivial |

### Priority 2 — next week

| # | Action | Why | Impact | Difficulty |
|---|---|---|---|---|
| 6 | Read indexed count per child sitemap | The measurement that decides everything after | Decisive | Trivial |
| 7 | If the 10 fail: check Cloudflare bot rules for Googlebot | Would invalidate the whole thesis | Critical if true | Medium |
| 8 | Build the file-size-limits reference page | Best link magnet you have | High | Medium |
| 9 | AlternativeTo + SaaSHub listings | Position 84.8 = no authority | High | Low |
| 10 | 2 blog posts linking tools with real anchor text | Internal + external signal | Medium | Medium |

### Priority 3 — later

| # | Action | Why | Impact | Difficulty |
|---|---|---|---|---|
| 11 | Rewrite remaining ~250 tool pages, demand-ordered | Scales the proven fix | High, slow | Very high |
| 12 | Roundup outreach | 1-in-20 hit rate, high value when it lands | Medium | Medium |
| 13 | Product Hunt / Show HN | One shot each | Medium | Medium |
| 14 | Re-add languages to sitemap, one at a time | Only after English ranks | Medium | Low |
| 15 | Revisit Core Web Vitals | Meaningless until CrUX has data | Low now | Medium |

### Explicitly NOT worth doing

- Creating a URL-prefix property — the domain property already covers everything
- Editing robots.txt — it is correct
- Adding more schema — you already have more than competitors
- Adding Japanese or any language — wrong direction until English ranks
- Requesting indexing on all 292 URLs — not how the quota or the signal works
- Chasing Core Web Vitals — no field data exists

---

## The uncomfortable summary

Vootkit's technical SEO is better than most sites this size: correct canonicals,
reciprocal hreflang, four schema types, breadcrumbs, fast TTFB, sane internal linking,
97 legacy redirects. That work is done and it is good.

The site does not rank because **261 tool pages say almost the same thing**, and
because a domain with two clicks in three months has no authority. Those are the only
two problems that matter. Everything else on this page is housekeeping.
