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
- Visitors can run five tools per day without paying.
- **No login is required** until someone upgrades.
- Creator Pro adds unlimited runs, no workspace ads and saved workflows.
- Creator Teams is a waitlist only until shared workspaces are implemented.

## Stripe
Products (from you) → **Checkout needs a recurring _price_ per product**:

| Plan | Product ID | Price env var (set in Netlify) | Amount |
|---|---|---|---|
| Creator Pro Monthly | `prod_UhxCv4HRKfegkM` | `VK_PRICE_CREATOR_PRO_MONTHLY` | $8/mo |
| Creator Pro Annual | `prod_UhxF5IXhe6653t` | `VK_PRICE_CREATOR_PRO_ANNUAL` | $80/yr |

**To make checkout live:**
1. In Stripe, add one recurring **Price** to each Creator Pro product; copy each `price_…` id.
2. In Netlify → Site settings → Environment variables, set:
   `STRIPE_SECRET_KEY`, the two Creator Pro `VK_PRICE_*` vars, `STRIPE_WEBHOOK_SECRET`,
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and
   `VK_ORIGIN=https://www.vootkit.com`.
3. Add `stripe` to the function's deps (Netlify installs from `netlify/functions/package.json` or root). The function is `netlify/functions/create-checkout.js`.
3. Run `supabase/billing-migration.sql` in Supabase.
4. In Stripe Workbench, add the endpoint
   `https://www.vootkit.com/.netlify/functions/stripe-webhook` for
   `checkout.session.completed`, `customer.subscription.updated`, and
   `customer.subscription.deleted`; copy its signing secret to
   `STRIPE_WEBHOOK_SECRET`.

Checkout requires a signed-in Vootkit account. Stripe events—not the browser—
activate or remove Creator Pro. The account page opens Stripe's billing portal.

## Supabase authentication and accounts
| | |
|---|---|
| Project ref | `qfqdmzwmjxdiqzeybaoo` |
| URL | https://qfqdmzwmjxdiqzeybaoo.supabase.co |
| Region | West EU (Ireland) `eu-west-1` |

The browser uses the public anon key in `assets/js/supabase-config.js`. Profiles,
favorites and history are protected by RLS. Paid-plan fields cannot be updated
by browser clients; only the Stripe webhook's service-role request changes them.

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
