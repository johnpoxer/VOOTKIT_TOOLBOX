# Vootkit — Enterprise Product Audit
_Founding-team review of the actual VOOTKIT_TOOLBOX build. 2026-07-23._

The brief: audit everything, challenge every decision, prioritise by impact, then
implement. This is grounded in the real codebase — 129 live tools, 17 categories,
a static generator (`build.js`) → 154 pages, deployed via Netlify.

---

## Verdict up front
The **engine room is excellent**; the **shopfront and the account layer are not built yet.**
- World-class: the tool implementations (every "live" tool genuinely works, 0 empty
  workspaces, ~790 test assertions), the honesty model (local vs network badges, no ads
  in workspaces enforced by code), the token system, and the privacy-first architecture.
- Missing / broken: a first-visitor "wow" homepage, working homepage navigation,
  accounts, dashboard, favorites persistence, pricing, and a formal component library.

---

## Strengths (keep and build on)
1. **Design tokens are mature** — one-accent discipline, designed dark mode (not an
   inversion), 8px rhythm, layered elevation, motion curve, reduced-motion, WCAG-checked
   pairs. This is a real design system foundation, not throwaway CSS.
2. **Every live tool works** — the "live = actually works" invariant is enforced; we
   killed 43 ghost tools this session by implementing them for real.
3. **Honesty as product** — `processing: local|network` drives a visible badge; the one
   network tool (currency) says "uses an API". No dark patterns.
4. **Monetisation safety is structural** — `ads:false` on tool pages is enforced by the
   generator and a failing test; cross-origin isolation (for ffmpeg) is scoped to 7 video
   paths only, so AdSense pages are never touched.
5. **SEO scaffolding** — per-tool canonical, OG/Twitter, JSON-LD (SoftwareApplication +
   FAQPage + BreadcrumbList), sitemap, robots, 301s from the old URL scheme.
6. **Testable core** — pure logic extracted and unit-tested across 14 suites.

## Weaknesses (fix)
| # | Issue | Severity |
|---|-------|----------|
| W1 | **Homepage links are broken** — search results point to `tools/<id>.html`, categories to `c/<slug>.html`; real pages are `/tools/<cat>/<id>/`. Discovery 404s. | **P0** |
| W2 | No accounts / auth — no way to save, sync, or personalise. | P1 |
| W3 | No dashboard — favorites/recents/history don't persist beyond one device's localStorage trail. | P1 |
| W4 | No pricing page — the plans exist in strategy but aren't presented; no upgrade path. | P1 |
| W5 | No formal component library — components live implicitly in `base.css`/generator strings; hard to scale to "thousands of tools". | P1 |
| W6 | Homepage is functional but not *premium* — hero, social proof, popular/trending, and category iconography under-leverage the strong tokens. | P1 |
| W7 | No mobile bottom navigation — mobile is responsive but not app-grade. | P2 |
| W8 | No global loading / empty / error component language — each tool improvises. | P2 |
| W9 | Discovery is search-only on the home; no "popular", "trending", "new", or "recently used" surfaces to drive exploration → hurts retention & pages/session. | P1 |
| W10 | 4 tools still planned (3 AI by user decision, 1 needs render). Fine, but the "soon" state could be more useful. | P3 |

## Missing (expected of a premium SaaS)
- Auth (sign up / in / reset / verify / social-ready), profile & settings.
- Dashboard: recent, saved, favorites, history, recommendations, subscription status.
- Pricing: Free / Pro / Business with comparison table, FAQ, Stripe-ready.
- Toast/notification system, modal/dialog primitives, global command palette (⌘K exists
  only on home — should be site-wide).
- Onboarding / first-run guidance.

## UX problems
- Broken home links (W1) is the headline. Beyond that: no cross-tool "next step" nudges
  on the home; category pages are reachable but not surfaced with intent; no breadcrumb on
  the homepage→category flow feedback.
- ⌘K / "/" search is home-only; it should follow the user everywhere.

## UI problems
- Category cards render icons, but popular/trending/most-used are absent, so the grid is
  flat — every category looks equally weighted.
- No consistent "result card", "stat", "toast" primitive names — they're duplicated per
  tool module (`.calc-stat`, `.wdl`, etc.). Works, but not a library.

## Mobile problems
- No bottom nav; header burger only. Tool workspaces are usable but the nav pattern is
  desktop-first. Tap targets meet 44px (token exists) but not audited per-tool.

## Performance
- Good baseline (static HTML, deferred JS, heavy libs lazy-loaded on demand). Opportunities:
  preconnect to the CDN origins used by lazy libs; `content-visibility` on long tool pages;
  self-host fonts to cut a render-blocking third-party CSS request; add width/height on
  images to kill CLS.

## SEO
- Strong per-tool metadata. Gaps: homepage lacks an ItemList/CollectionPage for tools;
  internal linking is thin (home doesn't link deep to popular tools with descriptive
  anchors); no `hreflang` (fine for now, single-locale).

## Accessibility (WCAG 2.2 AA)
- Tokens are contrast-checked; focus-visible ring exists. To verify at scale: keyboard
  path through every new component, `aria-live` on async results (present in engines),
  reduced-motion (present). New homepage must keep AA.

## Security
- Static site; main surface is the lazy-loaded third-party libs (pdf-lib, ffmpeg, pdf.js,
  qrcode, jsQR, JsBarcode, Chart.js) — pin exact versions (done) and consider SRI hashes.
  Auth phase will introduce real security scope (Supabase RLS, session handling).

---

## Priority order (impact × reach ÷ effort)
1. **P0 — Fix homepage IA links** (broken discovery). _Ships with the homepage rebuild._
2. **P1 — Homepage rebuild + design-system formalisation** (first impression, retention,
   the "single design language" backbone). _This turn._
3. **P1 — Component library** extracted from the rebuild, so every future surface reuses it.
4. **P1 — Pricing page** (static, Stripe-ready) — conversion surface, no backend needed.
5. **P1 — Auth + Dashboard** — requires the Supabase backend; own build phase.
6. **P2 — Mobile bottom nav + site-wide ⌘K.**
7. **P2 — Global toast/modal/loading/empty/error primitives.**
8. **P3 — Performance polish (self-host fonts, SRI, CLS), planned-state upgrade.**

See ROADMAP.md for the phased plan.
