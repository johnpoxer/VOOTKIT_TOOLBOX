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
| Hand-written | **34** | 269–419 |
| Derived spec table (auto, from source) | ~60 | 102–169 |
| Generic template | ~167 | ~96 |

Pages over 250 unique words: **34 of 261**.

Sitewide median has moved 95 → 141, but read that with care: part of the rise is
real and part is a shifting baseline. "Boilerplate" is defined as vocabulary
appearing on more than 90% of pages, so as more pages diverge, fewer words
qualify and every page scores higher. The count of pages over 250 is the honest
measure; the median flatters.

---

## Done

**Batch 0 — flagship (indexing requested 1 Aug 2026)**
compress-image · resize-image · png-to-jpg · jpg-to-webp · heic-converter ·
merge-pdf · split-pdf · compress-pdf · pdf-to-jpg · compress-for-discord

**Batch 1 — high-demand converters and PDF operations** *(277–350 words)*
jpg-to-pdf · rotate-pdf · extract-pdf-pages · remove-pdf-password · crop-image ·
convert-image · jpg-to-png · png-to-webp · webp-to-jpg · bulk-resize ·
batch-compress · circle-crop

**Batch 2 — remaining high-demand file tools** *(280–351 words)*
webp-to-png · svg-to-png · pdf-to-text · pdf-to-png · png-to-pdf ·
delete-pdf-pages · reorder-pdf · protect-pdf · text-to-pdf · image-watermark ·
favicon-generator · exif-viewer

---

## Next up, in order

Ordered by search demand, not by category. Do them in blocks of ~12.

**Batch 3 — text and developer tools** *(widget tools — options are not
declared in a readable structure, so specs must be gathered by reading the
implementation rather than the options array)*
word-counter · json-formatter · password-generator · qr-generator ·
base64 · case-converter · lorem-ipsum · uuid-generator · hash-generator ·
url-encoder · jwt-decoder · regex-tester

**Batch 4 — finance and calculators** *(these already carry a derived spec table
from their `fields`, so the hand-written layer is adding the reasoning around
the numbers, not the numbers themselves)*
loan-calculator · mortgage-calculator · compound-interest · currency-converter ·
budget-calculator · paycheck-calculator · credit-card-payoff · savings-goal ·
investment-calculator · auto-loan-calculator · refinance-calculator ·
home-affordability

**Batch 5 onwards** — everything else, still demand-ordered. Roughly 145 pages.

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
5. Commit, push, wait for Netlify.
6. Search Console → URL Inspection → Request Indexing, one per page.

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
