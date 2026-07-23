# Vootkit — Redesign Roadmap
_Phased plan to take the toolbox from "works" to "world-class". 2026-07-23._

Guiding constraint: **never break the 129 working tools or the ad-safety model.**
Each phase ships independently and is verified (build + tests + jsdom + contrast).

## Phase 3 — Design system (formalise) ✅ this turn
Document the token system + component contracts in DESIGN_SYSTEM.md so every future
surface reuses one language. Extend tokens where the homepage needs them (elevation on
hover, section rhythm) without changing existing values.

## Phase 9 — Homepage rebuild ✅ this turn (pulled forward — it's the first impression)
- **Fix P0**: correct all links to `/tools/<cat>/<id>/` and `/tools/<cat>/`.
- Premium hero: one-line promise, the search IS the product, live suggestions.
- **Popular tools** strip (curated from the traffic/money tiers) — drives exploration.
- Category grid with real SVG icons + live tool counts.
- **Trust band**: "runs on your device", no upload, no sign-up, no limit — the structural
  differentiator vs Smallpdf/TinyWow.
- Comparison ("why Vootkit") + FAQ + rich footer with deep links (SEO internal linking).
- Site-wide search entry retained; ⌘K / "/".

## Phase 4 — Component library (extract) — next
Promote the homepage's patterns into named, documented, reusable components in CSS +
small JS: `Button`, `Card`, `ToolCard`, `Field`, `Toast`, `Modal`, `Tabs`, `Stat`,
`ResultCard`, `Upload`, `Progress`, `Empty`, `Skeleton`. One stylesheet section per
component; the generator and tool modules consume them.

## Phase 6/7/8 — Pricing → Auth → Dashboard (backend phase)
- **Pricing (static, Stripe-ready)** — build first; no backend. Free / Pro / Business,
  comparison table, FAQ, trust. CTAs point to Stripe Checkout (env-driven price IDs, per
  the existing Stripe memory).
- **Auth** — requires the Supabase project (available). Sign up / in / reset / verify,
  social-ready, session management, RLS. Delivered as its own build with real security review.
- **Dashboard** — recents, saved, favorites, history, recommendations, subscription status,
  settings. Reads from Supabase; personalises discovery.

## Phase 5 — UX flows
No dead ends: every tool page already recommends related + next tools; extend that to the
home (recently used, recommended) once accounts exist. Site-wide command palette.

## Phase 10 — Continuous polish
Mobile bottom nav, global toast/modal/loading/empty/error, performance (self-host fonts,
SRI on CDN libs, CLS fixes, content-visibility), planned-state upgrade, per-tool a11y pass.

---

### Honest sequencing note
Pricing, Auth and Dashboard with **real accounts** need the Supabase backend stood up and
a security review — they are genuine multi-step builds, not a one-turn change. Everything
before them (design system, homepage, component library, static pricing) is backend-free
and ships now. We do those first so the product *looks and feels* world-class immediately,
then add the account layer on a solid base.
