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
        creator_pro_monthly:   { product: "prod_UhxCv4HRKfegkM", price: "", amount: 12,  interval: "month", label: "Creator Pro" },
        creator_pro_annual:    { product: "prod_UhxF5IXhe6653t", price: "", amount: 120, interval: "year",  label: "Creator Pro" },
        creator_teams_monthly: { product: "prod_UhxuUASj85k4eY", price: "", amount: 25,  interval: "month", label: "Creator Teams" },
        creator_teams_annual:  { product: "prod_UhxnBrCi8RUYEa", price: "", amount: 250, interval: "year",  label: "Creator Teams" }
      }
    },

    /* product rules — enforced in copy + logic */
    rules: {
      downloadersFree: true,     // downloaders free forever
      loginRequired: false,      // no login required to use tools
      downloadLimits: false      // no download limits
    },

    /* Free-tier usage limit.
     * IMPORTANT: keep `enabled:false` until BOTH Stripe checkout AND Supabase auth
     * are live — otherwise a hard block traps real users with no way to pay, and it
     * will hurt the SEO growth strategy (bounced first-time visitors). It's also a
     * client-side counter (tools run in-browser), so it's a nudge, not a hard wall.
     * exemptCategories keeps the free-forever downloaders/traffic tools unmetered. */
    freeLimit: {
      enabled: false,
      count: 5,            // free uses per day before the gate
      hard: true,          // true = block; false = nudge but allow continue
      exemptCategories: [] // e.g. ["pdf","images"] to keep acquisition tools free
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
