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

    /* Social profiles, shown as icons in the footer bar.
     *
     * PASTE THE PROFILE URL FOR EACH ONE YOU ACTUALLY HAVE. Same rule as the
     * ad slots below: an empty string renders NOTHING — no icon, no dead link,
     * no gap. If all three are empty the whole row disappears and the footer
     * closes up around it, so the site never ships an icon that goes nowhere.
     *
     * That matters more than usual right now. A footer icon linking to a
     * profile that 404s is exactly the kind of unfinished edge a reviewer
     * notices, and the AdSense re-review has already been failed once.
     *
     * Full URLs including https://. */
    social: {
      x:         "",   /* e.g. https://x.com/vootkit            */
      facebook:  "",   /* e.g. https://www.facebook.com/vootkit */
      instagram: ""    /* e.g. https://www.instagram.com/vootkit */
    },

    /* Cookie consent + Google Consent Mode v2.
     *
     * Google requires a consent solution for EEA and UK traffic. Without one,
     * AdSense withholds personalised ads for those users and serves contextual
     * only, which is worth a fraction as much. The site ships hreflang for
     * de/fr/es/it/pt and reports in EUR, so that is a large share of the
     * addressable audience, not an edge case.
     *
     * SET THIS TO FALSE if Ezoic or Mediavine goes live — both ship their own
     * certified CMP, and two consent layers on one page is worse for the user
     * and worse legally than either alone. */
    consent: { enabled: true },

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

      /* EZOIC INCUBATOR — VERIFICATION ONLY, NOT SERVING.
       *
       * Ezoic's dashboard will not consider the Incubator application until it
       * detects their header scripts on the site ("Connect Your Site … you must
       * complete this step"). This flag injects THOSE SCRIPTS AND NOTHING ELSE:
       * no showAds placements, no removal of AdSense.
       *
       * Why not just switch network to "ezoic" now: the application is pending,
       * so Ezoic fills nothing. Their setup guide's instruction to remove other
       * networks' code applies once Ezoic is serving — following it today would
       * take AdSense down and leave the site earning zero for however long the
       * review takes. Incubator intake is 20 publishers a month, so that could
       * be a while, and rejection is possible.
       *
       * ON APPROVAL: set network to "ezoic" and this flag becomes irrelevant —
       * that path emits the same header scripts, adds the placements and drops
       * AdSense in one move. Do it only once Ezoic is actually filling.
       *
       * COST: the two consent scripts are deliberately NOT async (their required
       * ordering depends on it), so they are render-blocking. On a site whose
       * whole strategy is search, that is a real Core Web Vitals cost paid for a
       * pending application.
       *
       * CURRENTLY OFF, on purpose. The plumbing is written and tested, but the
       * decision was to wait rather than ship render-blocking third-party
       * scripts for an application that may not land. Flip to true when you
       * want Ezoic's dashboard to detect the site, deploy, then press CHECK
       * CONNECTION at pubdash.ezoic.com/setup. Nothing else needs changing —
       * the placements stay on AdSense until `network` moves. */
      ezoicVerify: false,

      /* AdSense: publisher id + one slot id per placement. */
      client: "ca-pub-5906583727409402",
      slots: {
        inContent: "4617624167",   // "Vootkit In Content" — between the article body and the FAQ
        footer: "8309457166"       // "Vootkit Footer" — after the FAQ, above related tools
      }
    },

    /* Supabase — public project ref + URL are safe; the anon key is set at
       build/deploy time via the VK_SUPABASE_ANON env var, NOT hard-coded. */
    supabase: {
      ref: "qfqdmzwmjxdiqzeybaoo",
      url: "https://qfqdmzwmjxdiqzeybaoo.supabase.co",
      region: "eu-west-1"
    },

    /* Stripe.
     *
     * CHECKOUT IS LIVE AND WORKING. Verified 3 Aug 2026 by POSTing to the
     * function from the live site: all four plans return HTTP 200 with a real
     * Checkout URL.
     *
     * READ THIS BEFORE TRUSTING THE `price` FIELD BELOW. It is EMPTY AND
     * UNUSED. netlify/functions/create-checkout.js reads the price ids from
     * ENVIRONMENT VARIABLES (VK_PRICE_*), which are set in Netlify and are
     * correct. Nothing in the codebase reads plans[].price — checked.
     *
     * It is kept only so the shape matches the Stripe dashboard, and it is
     * labelled because an empty field that looks authoritative is worse than no
     * field: it caused a confident and completely wrong conclusion that nobody
     * could subscribe. If you are checking whether payments work, POST to the
     * function — do not read this file. */
    stripe: {
      plans: {
        creator_pro_monthly: { product: "prod_UhxCv4HRKfegkM", price: "" /* unused — see note above */, amount: 8,  interval: "month", label: "Creator Pro" },
        creator_pro_annual:  { product: "prod_UhxF5IXhe6653t", price: "", amount: 80, interval: "year",  label: "Creator Pro" }
      }
    },

    /* product rules — enforced in copy + logic */
    rules: {
      downloadersFree: true,     // downloaders free forever
      loginRequired: false,      // no login required to use tools
      downloadLimits: false      // no download limits
    },

    /* Free-tier usage limit. Authenticated Stripe checkout and signed webhooks
     * now keep the Supabase plan authoritative, so Creator Pro can be exempted
     * safely. The counter remains client-side because tools run in the browser;
     * it is product-level rate limiting, not DRM. */
    /* THE SIGNUP GATE.
     *
     * Shown at the moment a result is ready, before the file is handed over.
     * It is a conversion device, not a security boundary: every tool that
     * matters runs on-device, so the finished file is already in the browser
     * before the gate can possibly appear. Anyone determined can take it from
     * devtools. Judge this on signup rate, not on how well it holds.
     *
     * enabled:false ships the entire mechanism switched off, which is how it
     * should be flipped: get a clean week of tool_run -> tool_download baseline
     * first, then turn it on and compare. Without the before number, a drop in
     * downloads afterwards is unattributable.
     *
     * exemptTools is the escape hatch for pages you would rather not risk —
     * whichever tools turn out to be the SEO entry points that feed everything
     * else. Tool ids, exactly as in data/catalog.js. */
    gate: {
      enabled: false,
      exemptTools: []
    },

    freeLimit: {
      enabled: true,
      count: 5,            // free RUNS per day (completed runs, not page views)
      hard: true,          // Pro activation is verified by Stripe webhooks
      /* Empty on purpose: the five-run allowance applies consistently across
         categories. Add a category only when there is a deliberate product
         reason for that group to remain unlimited on Free. */
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
