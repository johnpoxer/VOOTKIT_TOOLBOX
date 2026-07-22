# Vootkit — Product Brief (locked)

Founding brief for the rebuild. Everything here is **agreed direction**, not exploration.
Read alongside: `RESEARCH.md` · `DESIGN_RESEARCH.md` · `TOOL_STRATEGY.md` · `VIDEO_CREATOR_TOOLS.md` · `ECOSYSTEM_MAP.md`

---

## Vision

> **"The operating system for everyday digital tasks."**

A universal toolbox where individuals, creators, professionals, businesses and developers solve problems instantly. **200+ carefully selected tools** — every one belonging to a strategic ecosystem, none of them random.

Note on wording: *"operating system"* here means **the place you go to get a task done** — it does **not** revive the old AI/intent-engine identity. AI is one category among seventeen.

**First principle: do not build a tool directory. Build an ecosystem.**
Target feel: App Store discovery + Canva approachability + Notion structure + Google-grade search + Stripe simplicity.

---

## The flywheel

```
High-search tools      →  bring visitors        (PDF, images)
Useful daily tools     →  create habits         (timers, converters, creator tools)
Premium categories     →  create revenue        (finance, insurance, real estate, tax)
New categories         →  create dominance      (privacy, accessibility, AI provenance)
```

Optimise for, in order: **organic acquisition · retention · monetisation · trust · expansion.**

---

## Portfolio strategy (four engines)

| Engine | Categories | Job |
|---|---|---|
| **Traffic** | PDF (compress, convert, merge, split, OCR, security, optimise), Images (compress, resize, convert, background removal, enhance) | Mass SEO acquisition |
| **Money** | Finance (mortgage, loan, investment, compound, retirement) · Insurance (calculators, coverage, comparison) · Real estate (rent-vs-buy, payoff, ROI, yield, closing costs) · Tax (income, payroll, VAT) · Freelance/SMB (invoice, margin, break-even, hourly rate) | Affiliate, premium placement, high-CPC ads |
| **Retention** | Daily utilities (timers, counters, converters, generators, calculators) · Creator (video, streaming, social) | Reasons to return daily |
| **Differentiation** | Privacy (metadata remover, EXIF cleaner, PDF redaction, tracker-URL cleaner) · Accessibility (contrast, alt text, scanner) · AI provenance (metadata checker, AI content verification) | Long-term brand authority |

*(Sizing, CPC evidence and per-tool lists already quantified in `ECOSYSTEM_MAP.md`.)*

---

## Experience

**The feeling to engineer:** *"I came here for one tool, but discovered everything I need."*

**Discovery loops.** The moment of highest intent is right after a tool succeeds:
> compress PDF → done → *next:* PDF converter · OCR scanner · PDF security · translator

**Never allow dead ends.** Every page carries: back, breadcrumbs, related tools, recently viewed, suggested next action.

**Navigation:** global search + top-level categories — Documents · Images · Video · Finance · Business · Creator · Privacy · AI · Utilities.

**Homepage:** universal search (the hero *is* the search), popular tools, categories, trending, personalised recommendations. It should feel alive.

**Tool page — nine required blocks, no empty SEO pages:**
1. Tool workspace 2. Explanation 3. Benefits 4. How it works 5. Examples 6. FAQ 7. Related tools 8. SEO content 9. Trust indicators

---

## Mobile

Must feel like a premium app: mobile-first, **bottom navigation**, touch-friendly controls, fast loads, app-like transitions, personal dashboard.

---

## Retention system

Accounts + dashboard: recent tools · favourites · saved projects · usage history · recommendations.
Personalisation line: *"Tools you may need next."*
*(Recents + favourites already prototyped; account layer reuses existing Supabase/Stripe.)*

---

## SEO architecture

Scalable URL pattern:

```
/tools/<category>/<tool-name>
  /tools/pdf/pdf-compressor
  /tools/finance/mortgage-calculator
  /tools/image/background-remover
```

Every page: unique content · schema · FAQ · internal linking · related tools. Multilingual expansion prepared (English/US first — highest CPC).

**⚠️ Open decision:** the current build uses `/t/<tool>.html` and `/c/<category>.html`. Moving to `/tools/<category>/<tool>` is better long-term IA. If any old URLs are already indexed, this needs 301 redirects — resolve before generating pages.

---

## Monetisation

**Rule one: never interrupt the user.**
- Ads on **category and information pages only** — *never* inside an active tool workflow.
- Premium: no ads, higher limits, advanced features.
- High-value categories: affiliate placements, lead generation, premium calculators.

---

## Performance

Built for millions: fast loading, SEO-optimised, accessible (WCAG 2.2 AA), scalable architecture. Targets: LCP < 2.5s, 44px touch targets.

---

## Required deliverables before further coding

1. Ecosystem architecture ✅ `ECOSYSTEM_MAP.md`
2. Information architecture — *URL scheme decision above*
3. Category hierarchy ✅ 17 categories in `data/catalog.js`
4. User journeys — partially in `PLATFORM_STRATEGY.md`; needs the post-completion loop spec
5. Design system ✅ `tokens.css`
6. Component library ✅ `base.css` (~10 components)
7. SEO strategy ✅ `TOOL_STRATEGY.md` + IA above
8. Monetisation strategy ✅ above + `ECOSYSTEM_MAP.md` §8
9. Mobile strategy — bottom nav still to build
10. Development roadmap ✅ `ECOSYSTEM_MAP.md` §7

---

## Build state at pause (22 Jul 2026)

**Done:** design tokens · base component CSS · catalog (133 tools / 17 categories, tagged local-vs-network and live-vs-planned) · search-first homepage · favicon.
**Verified:** CSS parses clean · 11/11 WCAG AA contrast pairs (light + dark) · 17/17 homepage behaviour + a11y checks.
**Live site untouched** at `deploys/Vootkit-Website-latest` — vootkit.com keeps serving and the AdSense review keeps running.

### Next session — resume here
1. Decide the URL scheme (`/tools/<cat>/<tool>` vs current) — blocks page generation
2. Tools index page + category pages (generated from catalog)
3. Tool page template with all nine required blocks
4. Post-completion "next tool" recommendation loop
5. Mobile bottom navigation
6. Wave 1 money tools (insurance · real estate · finance)

---

## The test for every decision

> *"Does this move Vootkit closer to becoming the world's leading digital tools ecosystem?"*

Build a platform, not a website.
