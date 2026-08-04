/* site.config.js — single source of truth for production config.
 * Consumed by build.js (Node) and the browser (window.VK_CONFIG).
 * Secrets are NEVER stored here — only public identifiers. Keys live in
 * Netlify environment variables (see docs/LAUNCH_CONFIG.md). */
(function (root, factory) {
  var cfg = factory();
  if (typeof module === "object" && module.exports) module.exports = cfg;
  else root.VK_CONFIG = cfg;
})(typeof self !== "undefined" ? self : this, function () {
  return {
    company: "Vootkit",
    /* canonical origin — pick ONE host; Netlify 301s the other to it */
    origin: "https://www.vootkit.com",
    supportEmail: "vootkit1@gmail.com",

    /* analytics (public measurement ID — safe to ship) */
    ga4: "G-KLEWTJ8WG2",

    /* AdSense.
     *
     * The script was shipping on every page with ZERO <ins> slots behind it, so
     * unless Auto Ads was toggled on in the dashboard the site earned nothing no
     * matter how much traffic arrived. These are the manual slots.
     *
     * PASTE THE SLOT IDS FROM YOUR ADSENSE DASHBOARD. Ad units are only rendered
     * for slots with an id here — an empty string renders nothing at all, which
     * is deliberate: an <ins> with a fake slot is a policy problem, and a blank
     * reserved box is a worse user experience than no box.
     *
     * AdSense → Ads → By ad unit → Display ads. Create two, name them to match,
     * and copy the data-ad-slot number (not the whole snippet).
     *
     * PLACEMENT IS DELIBERATELY CONSERVATIVE. Both units sit inside the article
     * body, well below the tool itself. Nothing is placed next to the Run or
     * Download buttons: accidental clicks on a file tool are the single fastest
     * route to an invalid-traffic strike, and the revenue from a higher unit is
     * not worth the account. No sticky or anchor units for the same reason. */
    ads: {
      enabled: true,

      /* WHICH NETWORK FILLS THE PLACEMENTS: "adsense" | "ezoic" | "none".
       *
       * The placements themselves are network-agnostic, so moving to a premium
       * network later is this one string plus its credentials — not a template
       * rewrite. That matters because the whole point of the SEO work is to
       * reach a network that pays 8-12x AdSense on identical traffic.
       *
       * WHEN CAN WE ACTUALLY SWITCH? Checked 3 Aug 2026:
       *   Ezoic    250,000 monthly users for NEW publishers (raised 19 Feb 2026;
       *            existing partners grandfathered, we are not one). Below that,
       *            only their Incubator — 20 places a month.
       *   Raptive   25,000 monthly pageviews, but 25k-99k also requires 50% of
       *            traffic from tier-one markets.
       *   Mediavine 50,000 sessions; the "Journey" tier starts at 10,000.
       *
       * At roughly 3,000 monthly visitors today, Mediavine Journey at 10,000 is
       * the nearest reachable tier and Ezoic is the furthest. Do not switch this
       * on approval alone — the network must be live and filling before AdSense
       * comes out, because running both at once is against Ezoic's setup guide
       * and produces empty slots. */
      network: "adsense",

      /* AdSense: publisher id + one slot id per placement. */
      client: "ca-pub-5906583727409402",
      slots: {
        inContent: "",   // between the article body and the FAQ
        footer: ""       // after the FAQ, above related tools
      }
    },

    /* Supabase — public project ref + URL are safe; the anon key is set at
       build/deploy time via the VK_SUPABASE_ANON env var, NOT hard-coded. */
    supabase: {
      ref: "qfqdmzwmjxdiqzeybaoo",
      url: "https://qfqdmzwmjxdiqzeybaoo.supabase.co",
      region: "eu-west-1"
    },

    /* Stripe — product IDs are given; Checkout needs a PRICE id per product
       (price_…). Fill these once created in the Stripe dashboard, or wire the
       Netlify function to read them from env (VK_PRICE_*). Publishable + secret
       keys are env-only. */
    stripe: {
      plans: {
        creator_pro_monthly:   { product: "prod_UhxCv4HRKfegkM", price: "", amount: 8,   interval: "month", label: "Creator Pro" },
        creator_pro_annual:    { product: "prod_UhxF5IXhe6653t", price: "", amount: 80,  interval: "year",  label: "Creator Pro" },
        creator_teams_monthly: { product: "prod_UhxuUASj85k4eY", price: "", amount: 20,  interval: "month", label: "Creator Teams" },
        creator_teams_annual:  { product: "prod_UhxnBrCi8RUYEa", price: "", amount: 200, interval: "year",  label: "Creator Teams" }
      }
    },

    /* product rules — enforced in copy + logic */
    rules: {
      downloadersFree: true,     // downloaders free forever
      loginRequired: false,      // no login required to use tools
      downloadLimits: false      // no download limits
    },

    /* Free-tier usage limit.
     *
     * ON, but as a NUDGE — `hard:false`. Read the next paragraph before changing
     * that, because the two flags are not independent.
     *
     * The original note here said to keep this off entirely until Stripe and
     * Supabase were both live, on the grounds that a hard block traps users with
     * no way to pay. That reasoning is right and still applies: every `price`
     * under stripe.plans below is still an empty string. With `hard:true` the
     * site would refuse to work AND be unable to sell — the worst of both.
     *
     * But `enabled:false` had its own cost: every page advertises "5 FREE A DAY"
     * while nothing counts, so there was no upgrade moment anywhere in the
     * product and no reason a single visitor would ever pay. A nudge resolves
     * both. The tool always runs; after the fifth completed run the result is
     * followed by a priced offer. Nobody is trapped, and the funnel exists.
     *
     * FLIP `hard` TO TRUE ONLY WHEN: the Stripe price ids below are populated,
     * checkout has been completed end-to-end at least once, and Supabase auth is
     * live so a paying user can actually be recognised as Pro.
     *
     * It is a client-side counter — tools run in the browser — so it was never
     * enforcement, only a prompt. Treat it as merchandising, not as DRM. */
    freeLimit: {
      enabled: true,
      count: 5,            // free RUNS per day (completed runs, not page views)
      hard: false,         // true = block; false = nudge but always allow
      /* Empty on purpose. Exempting categories was tempting for the SEO landing
         tools, but with hard:false nothing is ever withheld anywhere, so an
         exemption would only hide the upgrade offer from the visitors most
         likely to have found the product useful. Revisit if hard ever goes true:
         at that point the acquisition categories genuinely should be exempt. */
      exemptCategories: []
    },

    launch: {
      growth: "SEO",
      blogLaunchArticles: 50,
      blogCadencePerDay: 5,
      languages: 20,
      social: { x: "auto-oauth", pinterest: "auto-oauth", instagram: "manual", facebook: "manual", reddit: "approval-queue" }
    }
  };
});
