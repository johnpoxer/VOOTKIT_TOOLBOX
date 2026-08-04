# Tool content queue

One page of state so a writing session can start cold without re-deriving what
is done. Update it at the end of every session.

**The standard:** 275+ unique words (non-boilerplate), a spec table of at least
five real rows read from the tool's source, four tool-specific FAQs answering
actual failure modes, and related links that cross categories where that is more
useful than staying inside one.

**Why the standard is what it is:** on 1 Aug 2026 Search Console showed 10 pages
indexed, 54 "Crawled — currently not indexed", and a median of 95 unique words
per tool page. The thin pages are the reason. `npm test` enforces the shape —
short FAQ answers, stub spec tables and dead related links all fail the build.

---

## Progress

| | Pages | Unique words |
|---|---|---|
| Hand-written | **133** | 269–419 |
| Generic template | ~124 | ~96 |

Pages over 250 unique words: **133 of 260** — 51% of the catalogue.

**Duplicate pairs sitewide: 714 → 377** across five clusters destroyed on
3 Aug (video, health, pdf, business, converters).

**Duplication is the metric that now matters more than length.** See the
measurement below: 714 near-duplicate page pairs across 22 clusters. Batches are
chosen by cluster from here on, not by search demand.

Sitewide median has moved 95 → 141, but read that with care: part of the rise is
real and part is a shifting baseline. "Boilerplate" is defined as vocabulary
appearing on more than 90% of pages, so as more pages diverge, fewer words
qualify and every page scores higher. The count of pages over 250 is the honest
measure; the median flatters.

---

## Done

**Batch 0 — flagship (indexing requested 1 Aug 2026)**
compress-image · resize-image · png-to-jpg · jpg-to-webp · heic-converter ·
merge-pdf · split-pdf · compress-pdf · pdf-to-jpg · compress-video

> `compress-video` was `compress-for-discord` until 3 Aug 2026. It was renamed
> and rewritten as a general compressor: the old slug named one chat app in a
> tool people mostly use to email a clip or clear a forum limit, and it competed
> for the wrong query. **Re-request indexing for the new URL** — the 301 carries
> the old page's signals, but the new URL still has to be discovered. The old
> page directories are deleted by `build.js` (see `RENAMED`), because Netlify
> serves an existing file in preference to a redirect.

**Batch 1 — high-demand converters and PDF operations** *(277–350 words)*
jpg-to-pdf · rotate-pdf · extract-pdf-pages · remove-pdf-password · crop-image ·
convert-image · jpg-to-png · png-to-webp · webp-to-jpg · bulk-resize ·
batch-compress · circle-crop

**Batch 2 — remaining high-demand file tools** *(280–351 words)*
webp-to-png · svg-to-png · pdf-to-text · pdf-to-png · png-to-pdf ·
delete-pdf-pages · reorder-pdf · protect-pdf · text-to-pdf · image-watermark ·
favicon-generator · exif-viewer

**Batch 3 — text and developer tools** *(307–390 words)* — **committed, NOT pushed**
word-counter · json-formatter · password-generator · qr-generator · base64 ·
case-converter · lorem-ipsum · uuid-generator · hash-generator · url-encoder ·
jwt-decoder · regex-tester

*These are widget tools with no declared options array, so every figure was read
out of the implementation: the 200/130 wpm reading and speaking rates, the 6–48
password length, the 1–500 UUID count, the QR sizes 256/512/1024 and error
correction L/M/Q/H, the SHA-256/1/512 set and the deliberate omission of MD5.*

**Batch 6 — images, SEO, accessibility, business** *(317–386 words)*
thumbnail-maker · social-media-image · passport-photo-maker · flip-image ·
rotate-image · meme-generator · meta-tag-generator · serp-preview ·
contrast-checker · readability · profit-margin · stripe-fee-calculator

*passport-photo-maker is scoped honestly: it handles the dimensions and states
that it cannot check head position, background, expression, glasses or shadows —
which is what photos actually get rejected for. contrast-checker notes that
passing a contrast ratio does not cover colour blindness, since luminance and
hue are different problems.*

**Batch 5 — everyday, video and utilities** *(315–402 words)* — **committed, NOT pushed**
unit-converter · age-calculator · bmi-calculator · percentage-calculator ·
discount-calculator · timezone-converter · timestamp-converter · text-diff ·
slug-generator · trim-video · video-to-gif · convert-video

*bmi-calculator is health-adjacent and is written accordingly: it states that
BMI is a population statistic misapplied to individuals, that it misclassifies
muscular and older bodies, that thresholds differ by ancestry, that children
need percentile charts, and it points at waist measurement and a clinician.*

**Batch 4 — finance and calculators** *(363–413 words)* — **committed, NOT pushed**
loan-calculator · mortgage-calculator · compound-interest · currency-converter ·
budget-calculator · paycheck-calculator · credit-card-payoff · savings-goal ·
investment-calculator · auto-loan-calculator · refinance-calculator ·
home-affordability

*YMYL. These explain a calculation and never recommend a course of action.
Thresholds are labelled as lenders' tolerances or common conventions rather than
as what the reader should do, and anything a user might act on is framed as an
estimate. The 36% debt-to-income default is described as a lender's comfort
limit, not a target. paycheck-calculator states plainly that it does not know
any country's tax rules and applies the rate you supply. Keep this framing on
every finance page added later.*

---

## THE REAL PROBLEM IS DUPLICATION, NOT LENGTH — measured 3 Aug 2026

This queue was built around "thin pages". That framing was incomplete and the
measurement is worse than it looked.

Comparing every thin page against every other, on body text with head/script
stripped:

| | |
|---|---|
| Near-duplicate pairs (>=90% word overlap) | **714** |
| Clusters | **22** |
| Thin pages inside a cluster | **170 of 178** |

Some pages were **100% identical** to a sibling apart from the title. That is
not thin content, it is DUPLICATE content — a separate and more serious AdSense
flag, and the obvious reason Google crawls these and declines to index them.

**Consequence for how batches are chosen.** Writing twelve scattered pages
barely helps: a cluster of seven with one page rewritten still contains fifteen
duplicate pairs. **Take whole clusters.** A complete seven-page cluster removes
21 pairs; half of one removes almost nothing.

### Batch 7 — two complete clusters (3 Aug 2026)

| Cluster | Before | After |
|---|---|---|
| video (7) | 99% avg overlap | **44.5%** |
| health (7) | 99% avg overlap | **43.9%** |
| formatters (4) — untouched control | 96.5% | 96.5% |

video: mute-video · extract-audio · frame-grabber · loop-video · resize-video ·
adjust-volume · vertical-reframe

*Differentiated on real mechanism read from videoengine.js, not on adjectives:
mute and loop are stream copies (`-c copy`) and finish in seconds losing
nothing; adjust-volume copies the video and re-encodes only audio; resize and
reframe re-encode; frame-grabber uses no ffmpeg at all. Those differences are
what make the pages genuinely unlike each other.*

health: bmr-calculator · macro-calculator · body-fat-calculator ·
ideal-weight-calculator · water-intake-calculator · pace-calculator ·
heart-rate-calculator

*YMYL, written to the bmi-calculator standard. Every page names its actual
formula — Mifflin-St Jeor, US Navy circumference, Devine/Robinson/Miller,
Karvonen — and states what that formula cannot see. 220-age is labelled as
+/-10-12 bpm. ideal-weight shows three formulas precisely so their disagreement
is visible. These compute; they never advise.*

### Batch 8 — the PDF cluster, complete (3 Aug 2026)

| | Before | After |
|---|---|---|
| pdf (18 pages) | 97% avg overlap, 153 pairs | **41.0% avg, 0 pairs** |

pdf-page-numbers · pdf-watermark · pdf-redact · compare-pdf · crop-pdf ·
duplicate-pdf-pages · pdf-creator · pdf-repair · markdown-to-pdf · html-to-pdf ·
word-to-pdf · excel-to-pdf · webp-to-pdf · pdf-to-webp · pdf-ocr · scan-to-pdf ·
pdf-signature · pdf-form-filler

*Two findings came out of reading the source that the pages now state plainly,
because both would otherwise mislead someone:*

*• **pdf-redact rasterises the page before drawing the boxes**, so the text is
genuinely destroyed rather than covered — the failure mode that has embarrassed
courts and government departments. But it **exports a PNG per page, not a PDF**,
which is a real limitation the page leads with rather than buries.*

*• **pdf-signature is a visual signature, not a cryptographic one.** The page
says so, says it may or may not be binding depending on jurisdiction, and points
at certificate-based services for anything that matters.*

*Elsewhere the differentiator is capability boundaries read from source: word-to-pdf
uses mammoth and converts structure not layout; excel-to-pdf uses SheetJS and
drops charts; html-to-pdf fetches nothing over the network; pdf-ocr runs
Tesseract locally in six languages at 2x render scale.*

### Batch 9 — the business cluster, complete (3 Aug 2026)

| | Before | After |
|---|---|---|
| business (12 pages) | 97% avg, 100% max | **35.7% avg, 0 pairs** |
| invoice / quote / receipt | **100% identical** | 48.3% max |

*Those three were byte-for-byte the same page because the CODE is the same:
`tools-business.js` exposes `build('invoice')`, `build('quote')`,
`build('receipt')` from one function. Generic content over a shared
implementation reproduces the sharing. The pages now differ on what each
document legally IS and when you send it — a quote invites a decision, an
invoice demands money, a receipt proves it moved — which is the real
difference anyway.*

*Shared mechanics stated once, accurately, from `computeTotals()`: discount
comes off the subtotal, then tax applies to the DISCOUNTED figure. Taxing first
overcharges the client and is the commonest error on hand-made invoices.*

*Other figures read from source: business-card-maker renders 1050x600 px, which
is exactly 3.5x2 inches at 300 DPI — the page explains that arithmetic because
designing at screen resolution is why cards come back fuzzy. qr-business-card
embeds a vCard IN the code, so it needs no server and cannot expire.
inventory-tracker uses localStorage, and the page is blunt that clearing browser
data destroys it.*

*contract-generator states plainly that it is a template and not legal advice,
and names what it is unsuitable for.*

### Batch 10 — the unit converters (3 Aug 2026)

| | Before | After |
|---|---|---|
| 7 converters | **100% identical** | **47.3% avg, 0 pairs** |

length · weight · temperature · speed · area · volume · data

*Same cause as invoice/quote/receipt: `converterTool(UNITS, from, to)` in
tools-calc2.js is one factory driving seven unit tables, so the pages inherited
the sharing exactly.*

*Each dimension has its OWN trap, and they are genuinely different, which is what
makes the pages unlike each other:*

*• temperature is the only one with an OFFSET — you cannot convert by
multiplying, and ratios are meaningless outside Kelvin*
*• US and UK gallons differ by 20% (3.785 vs 4.546 L), and every cooking unit
listed is US*
*• area factors are the SQUARE of length factors — ft² is 0.3048², not 0.3048,
the commonest error in flooring and paint estimates*
*• data uses 1024 while drive manufacturers use 1000, which is the entire
"where did my terabyte go" question; plus bits vs bytes at 8:1*
*• length includes the nautical mile at exactly 1852 m, a different unit from
the statute mile*

*Every factor quoted is the exact `f` value from source.*

**Remaining clusters, largest first:** everyday+misc (21), streaming
(13), tax (8), images (8), privacy (8), education (8), travel (7),
developer (7), audio (6), realestate (6), accessibility (5).

## Next up, in order

Ordered by search demand, not by category. Do them in blocks of ~12.

**Batch 7 onwards — stop guessing, use the data.**

179 pages remain, spread across everyday (25), business (23), video (23),
pdf (18) and the rest. The obvious demand ordering is now exhausted; picking the
next twelve from intuition would be worse than picking them from evidence.

Before batch 7, read **Search Console → Performance → Queries**. On 1 Aug it
showed 3,290 impressions against only 2 clicks, and the top queries were things
like *autokredit rechner*, *contador de palabras* and *keyword dichte tool* —
already-existing demand the site was surfacing for and failing to convert.
Whatever that report says once batches 0–6 have been indexed is a better
ordering than any list written in advance.

---

## How to run a session

1. Read the target tools' actual specs out of `assets/js/tools-*.js`. **Never
   write a number you have not read.** Wrong figures in a spec table are worse
   than no table, because those are the rows people quote.
2. Add entries to `data/tool-content.js`.
3. `npm test` — the SEO suite checks length, spec-table size, FAQ substance and
   that every related tool exists and is live.
4. `node build.js`, then re-measure unique words (the script is in the session
   history; it strips boilerplate appearing on >90% of pages).
5. **Commit locally. Do NOT push.** See the deploy policy below.
6. Request indexing only after a deploy actually happens.

---

## Deploy policy — batch the pushes

Netlify build minutes are at 75 and every push triggers a full rebuild of ~1,478
pages. Pushing after each batch spends a build on twelve pages.

**So: commit each batch locally and let them accumulate. Push once, after about
six batches.** One build then covers ~70 rewritten pages instead of six builds
covering twelve each.

Nothing is lost by waiting. The work is committed and safe in git; only the
public site lags. Google cannot see a batch until it is deployed, so there is no
point requesting indexing before the push either — do that after.

Current state: **batches 3–6 pushed together on 2 Aug 2026** — one build covering
48 rewritten pages instead of four builds of twelve. Batches 0–2 were already
live from earlier deploys.

Next accumulation starts from batch 7.

### Submitted 3 Aug 2026 — batches 3–5 (10 URLs, quota exhausted)

json-formatter · base64 · uuid-generator · hash-generator · regex-tester ·
mortgage-calculator · loan-calculator · currency-converter · unit-converter ·
bmi-calculator

**What the inspections showed, which is worth more than the submissions.**
Checked individually: word-counter, password-generator, qr-generator and base64
were already `URL is on Google`. json-formatter, loan-calculator,
uuid-generator, hash-generator, regex-tester and bmi-calculator were all
`URL is unknown to Google` — not merely unindexed, never crawled.

So the split is not random. The established, externally-linked tools are in;
the rest are invisible. That is a discovery problem on top of the thin-content
one, and it is what internal linking and the backlink playbook are for.

**The sitemap is fine — checked, so nobody re-litigates it.** Sitemap index
submitted 1 Aug, **last read 3 Aug** (after the batch 3–6 deploy), status
Success, **292 pages discovered** — exactly the English count. Individual
inspections say "No referring sitemaps detected", but that is per-URL
attribution lag, not a broken sitemap. Google has discovered all 292 and
indexed 10. The gap is an indexing *decision*, not a discovery failure, which
is precisely the thesis this queue is testing.

**Do not guess tool URLs.** `bmi-calculator` was submitted as
`/tools/health/bmi-calculator/` and rejected as a 404 — it lives under
`everyday`. Read the category out of `data/catalog.js` first:
`VK.TOOLS.find(t => t.id === id).cat`.

### The daily quota is about 10 URLs

Hit on 2 Aug 2026 after ten submissions: *"Sorry, we couldn't process this
request because you've exceeded your daily quota. Please try submitting this
again tomorrow."* It resets daily and is per property.

**This is not worth working around.** Manual submission only jumps the crawl
queue; it is not how pages get found. Every page here is already in
`sitemap-tools.xml` with a `lastmod` of the build date, Google reads that
sitemap (confirmed — merge-pdf's Discovery section names it as the source), and
a changed `lastmod` is the signal that a page is worth recrawling.

So: submit what the quota allows, newest batch first, and let the sitemap carry
the rest. Do not delay a batch waiting for quota.

---

## What not to do

- **Do not auto-generate prose.** It was tried; a regex scraper over the widget
  tools produced rows like `Adjustable range | 1-200` with no label, because the
  source knows the bounds but not what the control is for. Filler across 180
  pages is the original problem in a new costume, and it is what earns an
  AdSense "low value content" flag on top of not being indexed. See the note at
  the bottom of `data/tool-facts.js`.
- **Do not request indexing on everything at once.** The quota is limited and
  submitting a page twice does not improve its position in the queue.
- **Do not add languages** until English pages rank. There are already 1,192
  localised pages live and deliberately absent from the sitemap.

---

## The measurement that decides everything

Search Console → Sitemaps → `sitemap-tools.xml` indexed count.

Baseline on 1 Aug 2026: **10 indexed of 292**.

If the rewritten pages get indexed and the untouched ones do not, the thesis
holds and the queue above is the whole plan.

### Cloudflare has been ruled out — checked 2 Aug 2026

The fallback hypothesis was that Cloudflare was blocking Googlebot. It is not.
Checked directly, so nobody needs to look again:

| Check | Result |
|---|---|
| Search Console **Live Test** | "URL is available to Google", "Page can be indexed" |
| HTML Google actually received | The real page — our doctype, title, description, canonical, hreflang. No challenge markers (`cf-browser-verification`, `Just a moment`, `__cf_chl`) |
| Cloudflare AI bot policy → **Search** | "Bots that scan your site to help it appear in search engine results" → **Allow (do not block)** |
| Live `robots.txt` | 68 bytes, byte-identical to the repo — Cloudflare's "Content Signals Policy" is **not** overriding it |
| Security events, last 24h | 5 total. Two Managed-rules blocks (US), three Bot Fight Mode challenges to OVH Canada IPs. **None from Google's ranges** (66.249.x.x, 2001:4860::) |
| Sitemap fetch | Success, 1,484 URLs read |
| Corroboration | 10 pages already indexed; merge-pdf's Discovery section names `sitemap.xml` as its source |

**Bot Fight Mode is ON** and is doing useful work — it challenged real scrapers
on 1 Aug. Cloudflare exempts verified bots and Googlebot is one, and there is no
evidence here of it touching Google. Leave it on.

One honest limit: free-plan security analytics only allows one-day query
windows, so this cannot prove Googlebot was never challenged historically. If
indexing stalls despite good content, Bot Fight Mode is the first thing to
toggle off — but there is no reason to touch it now.

**So the content thesis stands. Keep writing.**
