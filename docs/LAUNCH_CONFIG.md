# Vootkit — Launch Configuration
_The real production wiring. Single source of truth: `data/site.config.js`._

## Identity
| | |
|---|---|
| Company | Vootkit |
| Canonical domain | https://www.vootkit.com (apex 301s to www via `netlify.toml`) |
| Support email | vootkit1@gmail.com |
| Admin email | poxer7128@gmail.com |
| Netlify site | vootkit.netlify.app · ID `e074cf0a-9974-4e84-ae5a-c8ca57b0a093` |
| GA4 | `G-KLEWTJ8WG2` — wired site-wide in `build.js` head() + `index.html` |

## Core product rules (reflected in copy + pricing)
- Downloaders / tools are **free forever**.
- **No login required** to use anything.
- **No download limits.**
Paid plans only add: no ads, faster/higher-res processing, premium tools, cloud
history, priority support (Teams adds shared workspace, higher limits, API).

## Stripe
Products (from you) → **Checkout needs a recurring _price_ per product**:

| Plan | Product ID | Price env var (set in Netlify) | Amount |
|---|---|---|---|
| Creator Pro Monthly | `prod_UhxCv4HRKfegkM` | `VK_PRICE_CREATOR_PRO_MONTHLY` | $12/mo |
| Creator Pro Annual | `prod_UhxF5IXhe6653t` | `VK_PRICE_CREATOR_PRO_ANNUAL` | $120/yr |
| Creator Teams Monthly | `prod_UhxuUASj85k4eY` | `VK_PRICE_CREATOR_TEAMS_MONTHLY` | $25/mo |
| Creator Teams Annual | `prod_UhxnBrCi8RUYEa` | `VK_PRICE_CREATOR_TEAMS_ANNUAL` | $250/yr |

**To make checkout live:**
1. In Stripe, add one recurring **Price** to each product above; copy each `price_…` id.
2. In Netlify → Site settings → Environment variables, set:
   `STRIPE_SECRET_KEY`, the four `VK_PRICE_*` vars, and `VK_ORIGIN=https://www.vootkit.com`.
3. Add `stripe` to the function's deps (Netlify installs from `netlify/functions/package.json` or root). The function is `netlify/functions/create-checkout.js`.
Until then the pricing page works and the Upgrade button shows a friendly "not
configured yet" toast — the free tools are unaffected.

## Supabase (auth — Phase 6/8, not yet built)
| | |
|---|---|
| Project ref | `qfqdmzwmjxdiqzeybaoo` |
| URL | https://qfqdmzwmjxdiqzeybaoo.supabase.co |
| Region | West EU (Ireland) `eu-west-1` |

Scaffolded in `assets/js/supabase-config.js`. **Still needed to build auth:** the
project **anon (publishable) key** — set it as `VK_SUPABASE_ANON` and inject into
`window.VK_SUPABASE.anonKey` at deploy. Then: sign up / in / reset / verify,
RLS-protected `profiles` + `favorites` + `history` tables, and the dashboard.

## Growth / content (strategy — captured, not yet built)
- Primary growth: **SEO**.
- Launch blog: **50 articles**, then **5/day**.
- **20 languages** (i18n) — needs a locale layer on `build.js` (per-locale pages +
  `hreflang`). Large content+infra effort; own phase.
- Social posting: X (auto OAuth), Pinterest (auto OAuth), Instagram (manual),
  Facebook (manual), Reddit (approval queue). Needs a small posting service +
  OAuth apps; own phase.

## Status
Product build ~96–98%. Done this pass: GA4, canonical www, support email, security
headers, `netlify.toml`, Stripe-ready pricing page + checkout function, Supabase
scaffold. Remaining to 100%: the three secrets above (Stripe price IDs + keys,
Supabase anon key), then auth/dashboard, i18n, blog, social — each its own phase.
