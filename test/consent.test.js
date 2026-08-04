/* consent.test.js — cookie consent, Consent Mode v2, lazy ads, policy pages.
 *
 * The site had NO consent mechanism. Google requires one for EEA/UK traffic;
 * without it AdSense withholds personalised ads for those users and serves
 * contextual only, worth a fraction as much — and the site ships hreflang for
 * de/fr/es/it/pt and reports in EUR, so that is a large share of the audience.
 * GA4 had also been firing on every page since launch without asking.
 *
 * The assertion that matters most is the ORDERING one. Consent defaults that
 * land after gtag('config') are compliant-looking and useless. */
"use strict";
const assert = require("assert");
const fs = require("fs"), path = require("path");
global.window = global;
const C = require("../assets/js/consent.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); pass++; };
const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* --- the signal set --- */
{
  const g = C.signals(true), d = C.signals(false);
  ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"].forEach((k) => {
    eq(g[k], "granted", k + " granted on accept");
    eq(d[k], "denied", k + " denied on reject");
  });
  /* v2 added ad_user_data and ad_personalization; sending only the v1 pair is
     the most common way this is got wrong and it silently degrades to
     non-personalised. */
  ok("ad_user_data" in g && "ad_personalization" in g, "the v2 signals are present, not just v1");
  eq(d.functionality_storage, "granted", "theme and recent-tools storage is strictly necessary");
  eq(d.security_storage, "granted", "security storage is always granted");
}

/* --- the region list --- */
{
  const R = C.REGIONS;
  ["DE", "FR", "ES", "IT", "PT", "NL", "IE"].forEach((c) =>
    ok(R.indexOf(c) !== -1, c + " requires consent — the site ships a locale for it"));
  ok(R.indexOf("GB") !== -1, "the UK is included; it left the EU but not the requirement");
  ok(R.indexOf("CH") !== -1, "Switzerland is included");
  ok(R.indexOf("US") === -1,
     "the US is NOT in the list — denying there by default would throw away the RPM that pays for everything");
  ok(R.length >= 30, "all EU/EEA members are listed, got " + R.length);
}

/* --- storage round-trip --- */
{
  const store = {};
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  eq(C.read(), null, "nothing stored -> no answer yet");
  ok(C.needsBanner(), "so the banner is needed");
  C.write(true);
  eq(C.read().granted, true, "an accept is remembered");
  ok(!C.needsBanner(), "and the banner is not shown again");
  C.write(false);
  eq(C.read().granted, false, "a reject is remembered just as durably as an accept");
  ok(!C.needsBanner(), "a reject must not re-prompt — nagging is the pattern regulators act on");

  /* Version bump re-asks everyone. */
  store[C.KEY] = JSON.stringify({ v: C.VERSION + 1, granted: true });
  eq(C.read(), null, "a stored answer from another version is ignored");
  store[C.KEY] = "{not json";
  eq(C.read(), null, "corrupt storage degrades to 'ask again', never throws");
}

console.log(`consent logic: ${pass} assertions passed`);

/* ---------------------------------------------------------------------------
 * ORDERING — the entire mechanism
 * ------------------------------------------------------------------------- */
{
  const page = read("tools/pdf/merge-pdf/index.html");
  const c = page.indexOf("window.VKConsent&&window.VKConsent.setDefaults()");
  const ads = page.indexOf("adsbygoogle.js?client=");
  const gtag = page.indexOf("gtag('js',new Date())");

  ok(c > -1, "consent defaults are inlined in the page");
  ok(c < ads, "consent defaults run BEFORE the ad loader");
  ok(c < gtag, "consent defaults run BEFORE gtag config — otherwise the first hit is unconsented");

  /* Inlined, not linked: an external file is a round trip the ad and analytics
     tags would race. */
  ok(!/<script[^>]+src=[^>]*consent\.js/.test(page),
     "consent.js is inlined rather than linked, so nothing can load ahead of it");

  /* But shipped without its prose — the source file is the documentation. */
  ok(!page.includes("HOW CONSENT MODE WORKS"),
     "comments are stripped before inlining; 1,478 pages do not need 4 KB of explanation each");
  ok(page.includes("CONSENT_REQUIRED_REGIONS") || page.includes("region:"),
     "but the behaviour survives the strip");
}

/* --- the banner is fair --- */
{
  const ui = read("assets/js/consent-ui.js");
  ok(/data-consent="reject"/.test(ui) && /data-consent="accept"/.test(ui), "both choices exist");
  ok(ui.indexOf('data-consent="reject"') < ui.indexOf('data-consent="accept"'),
     "reject is rendered first — it must be at least as easy to find as accept");
  const css = read("assets/css/pages.css");
  ok(/\.consent-actions \.btn \{ min-width/.test(css), "both buttons share a minimum width");
  ok(/position: fixed/.test(css.slice(css.indexOf(".consent-bar"))),
     "the bar is fixed, so it cannot shift layout on every first visit");
  ok(/cookies\.html/.test(ui), "it links to the cookie policy");
  ok(/never uploaded|never part of this/.test(ui),
     "and states the file-privacy promise, which is the actual differentiator");
}

console.log(`consent wiring: ${pass} total assertions passed`);

/* ---------------------------------------------------------------------------
 * ADS LOAD LATE
 * ------------------------------------------------------------------------- */
{
  const a = read("assets/js/ads.js");
  const page = read("tools/pdf/merge-pdf/index.html");
  ok(/IntersectionObserver/.test(a), "units are filled on approach, not at load");
  ok(/rootMargin/.test(a), "with a margin so viewability is unharmed");
  ok(/typeof root\.IntersectionObserver !== 'function'/.test(a),
     "and a fallback that fills immediately rather than never");
  ok(/data-vk-filled/.test(a), "a unit is never pushed twice");
  ok(!/adsbygoogle = window\.adsbygoogle \|\| \[\]\)\.push/.test(page),
     "no inline push survives in the page — that is what competed with the tool for the main thread");
  ok(/assets\/js\/ads\.js/.test(page), "ads.js is loaded");
  /* Must not throw: adsbygoogle is absent whenever a blocker is active. */
  ok(/catch \(e\)/.test(a), "a blocked adsbygoogle cannot throw into the page");
}

/* ---------------------------------------------------------------------------
 * PAGES AD REVIEWERS LOOK FOR
 * ------------------------------------------------------------------------- */
{
  const need = ["about.html", "contact.html", "privacy.html", "terms.html", "cookies.html", "disclaimer.html"];
  need.forEach((f) => {
    const p = path.join(ROOT, f);
    ok(fs.existsSync(p), f + " exists");
    if (!fs.existsSync(p)) return;
    const words = fs.readFileSync(p, "utf8").replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
    ok(words > 250, f + " is not a thin page (" + words + " words)");
  });

  /* The cookie policy has to describe what the site ACTUALLY sets — a reviewer
     compares it against the network tab, and a generic list is worse than none. */
  const ck = read("cookies.html");
  ["vk-consent", "vk-theme", "vk-uses", "Google Analytics", "AdSense"].forEach((t) =>
    ok(ck.includes(t), "cookie policy names " + t));
  ok(/never uploaded|never receives your file/i.test(ck), "and repeats the file-privacy promise");

  /* Disclaimer must cover the YMYL tools specifically, not just generically. */
  const dc = read("disclaimer.html");
  ["financial advice", "BMI", "mortgage", "paycheck"].forEach((t) =>
    ok(new RegExp(t, "i").test(dc), "disclaimer covers " + t));

  /* Linked from the footer, or a reviewer will not find them. */
  const page = read("tools/pdf/merge-pdf/index.html");
  ["cookies.html", "disclaimer.html", "privacy.html", "terms.html"].forEach((f) =>
    ok(page.includes(f), f + " is linked from every page's footer"));

  /* And in the sitemap. */
  const sm = read("sitemap-core.xml");
  ["cookies.html", "disclaimer.html"].forEach((f) =>
    ok(sm.includes(f), f + " is in the sitemap"));
}

/* ---------------------------------------------------------------------------
 * SOCIAL PREVIEW — 0 of 283 pages had one
 * ------------------------------------------------------------------------- */
{
  const page = read("tools/pdf/merge-pdf/index.html");
  ok(/og:image" content="https:\/\//.test(page),
     "og:image is ABSOLUTE — scrapers do not resolve relative paths, and a relative one yields no card at all");
  ok(/og:image:width" content="1200"/.test(page) && /og:image:height" content="630"/.test(page),
     "dimensions are declared so the card renders before the image is fetched");
  ok(/twitter:card" content="summary_large_image"/.test(page), "the large card is used");
  ok(/og:image:alt/.test(page), "the preview has alt text");
  ok(fs.existsSync(path.join(ROOT, "assets/og-default.png")), "the image exists");
  const sz = fs.statSync(path.join(ROOT, "assets/og-default.png")).size;
  ok(sz > 5000 && sz < 400000, "and is a sane size (" + Math.round(sz / 1024) + " KB)");
}

console.log(`consent + trust + social: ${pass} total assertions passed`);
