Warning: truncated output (original token count: 79416)
Total output lines: 4799

#!/usr/bin/env node
"use strict";
/* Vootkit static generator.
 * IA:  /tools/                      all tools
 *      /tools/<category>/           category hub
 *      /tools/<category>/<tool>/    tool page (9 required blocks)
 * Also emits sitemap.xml, robots.txt and _redirects (301s from the old
 * /t/<id>.html and /c/<slug>.html URLs so nothing indexed is orphaned).
 * Idempotent. Run: npm run build */

const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
const ROOT = __dirname;
/* Retired unfinished surface. Builds may run in a persistent checkout, so
 * remove the old generated directory before emitting the current catalogue. */
fs.rmSync(path.join(ROOT, "tools", "ai"), { recursive: true, force: true });
const VK = require("./data/catalog.js");
const STATS = require("./data/stats.js");
const TOOLCONTENT = require("./data/tool-content.js");
const TOOLFACTS = require("./data/tool-facts.js");
const MONEY1 = require("./assets/js/tools-money.js");
const MONEY2 = require("./assets/js/tools-money2.js");
const MONEY = Object.assign({}, MONEY1, MONEY2);
const CALC2 = require("./assets/js/tools-calc2.js");
/* Tools whose process() calls VKPixels. Kept as an explicit list so a page
   cannot silently ship without the worker its tool depends on — the test suite
   checks this against the source. */
const PIXEL_TOOLS = { "image-sharpen": 1, "grayscale-image": 1 };
const IMAGE = require("./assets/js/tools-image.js");
const IMAGE2 = require("./assets/js/tools-image2.js");
const PDF = require("./assets/js/tools-pdf.js");
const VIDEO = require("./assets/js/tools-video.js");
const VIDEOFX = require("./assets/js/tools-videofx.js");
/* widget tools: text-in/out interactive tools sharing assets/js/widget.js.
 * We list ids here (their modules export logic, not id lists) so page
 * generation knows which module script to load. */
const WIDGETS = {
  "assets/js/tools-text.js": ["word-counter","case-converter","text-diff","readability","line-tools","lorem-ipsum","markdown-editor"],
  "assets/js/tools-dev.js": ["json-formatter","base64","jwt-decoder","uuid-generator","hash-generator","regex-tester","url-encoder","timestamp-converter"],
  "assets/js/tools-dev2.js": ["xml-formatter","html-formatter","css-formatter","sql-formatter","cron-generator"],
  "assets/js/tools-sec.js": ["passphrase-generator","totp-generator","random-number-generator","credit-card-validator","iban-validator"],
  "assets/js/tools-pdfmake.js": ["text-to-pdf","markdown-to-pdf","pdf-creator"],
  "assets/js/tools-pdftools.js": ["scan-to-pdf","pdf-signature","pdf-form-filler"],
  "assets/js/tools-pdfconv.js": ["html-to-pdf","word-to-pdf","excel-to-pdf","pdf-ocr","image-to-text"],
  "assets/js/tools-everyday.js": ["unit-converter","age-calculator","countdown","pomodoro","stopwatch","timezone-converter","random-picker"],
  "assets/js/tools-privacy.js": ["password-generator","password-strength","text-encrypt","file-checksum"],
  "assets/js/tools-design.js": ["color-converter","contrast-checker","gradient-generator","palette-generator","shadow-generator"],
  "assets/js/tools-seo.js": ["meta-tag-generator","serp-preview","og-preview","robots-generator","sitemap-generator","schema-generator","keyword-density","slug-generator","utm-builder"],
  "assets/js/tools-data.js": ["csv-viewer","json-csv","csv-to-chart"],
  "assets/js/tools-imaging.js": ["exif-viewer","color-from-image","meme-generator"],
  "assets/js/tools-codes.js": ["qr-generator","qr-scanner","barcode-generator"],
  "assets/js/tools-pdfview.js": ["pdf-to-jpg","pdf-to-text","pdf-to-png","pdf-to-webp"],
  "assets/js/tools-a11y.js": ["accessible-palette","color-blind-simulator","heading-checker","alt-text-auditor","caption-validator"],
  "assets/js/tools-privacy2.js": ["url-cleaner","metadata-remover","screenshot-redactor"],
  "assets/js/tools-misc.js": ["salary-converter","typing-test","brb-overlay"],
  "assets/js/tools-business.js": ["invoice-generator","quote-generator","receipt-generator"],
  "assets/js/tools-docs.js": ["proposal-generator","contract-generator","resume-builder","swot-generator","landing-page-generator"],
  "assets/js/tools-business2.js": ["business-name-generator","inventory-tracker","business-card-maker","qr-business-card","packing-list"],
  "assets/js/tools-audio.js": ["audio-converter","audio-compressor","audio-trimmer","voice-recorder","text-to-speech","speech-to-text"],
  "assets/js/tools-stream.js": ["giveaway-picker","starting-soon-screen","stream-overlay-creator","stream-alert-creator","stream-schedule-planner","chat-overlay-tool"],
  "assets/js/tools-mathdate.js": ["math-solver","equation-solver","date-calculator","time-calculator"],
  "assets/js/tools-edu.js": ["flashcard-maker","vocabulary-builder","citation-generator","mind-map-generator","diagram-maker","learning-tracker","quiz-maker","study-planner"],
  "assets/js/tools-pdfedit.js": ["pdf-redact","compare-pdf"],
  "assets/js/tools-currency.js": ["currency-converter"]
};
function widgetScriptsFor(id) {
  for (const file in WIDGETS) if (WIDGETS[file].indexOf(id) !== -1) return ["assets/js/widget.js", file];
  return null;
}
const LINKTOOLS = ["url-shortener"];   // server-backed tools (Supabase + Netlify functions)
const I18N = require("./data/i18n.js");
const CFG = require("./data/site.config.js");
const SITE = CFG.origin;
const SUPPORT = CFG.supportEmail;
const GA4 = CFG.ga4;
/* Social preview. Every scraper (WhatsApp, Slack, Discord, X, Facebook)
   requires an ABSOLUTE url — a relative path silently yields no card, which
   is indistinguishable from having no tag at all. Measured before this: 0 of
   283 tool pages had an og:image, so every link anyone shared rendered as
   bare text on a product people recommend to each other by link. */
const OG_DEFAULT = SITE + "/assets/og-default.png";
const ADS = CFG.ads || { enabled: false, client: "", slots: {} };
const CONSENT = CFG.consent || { enabled: true };
const PUB = ADS.client || "ca-pub-5906583727409402";
const AUDIENCE = STATS.audience || {};
const USER_DISPLAY = (AUDIENCE.users && AUDIENCE.users.display) || "1M+";
const COUNTRY_DISPLAY = (AUDIENCE.countries && AUDIENCE.countries.display) || "120+";
const TASKS_DISPLAY = (AUDIENCE.tasksCompleted && AUDIENCE.tasksCompleted.display) || "10M+";
const TOOL_ROUND_TO = (STATS.tools && STATS.tools.roundTo) || 50;

/* One AdSense display unit.
 *
 * Returns EMPTY STRING unless ads are enabled AND that slot has a real id in
 * site.config.js. That is the important part: the site previously shipped the
 * AdSense loader with no <ins> elements behind it, which earns exactly nothing,
 * and the fix must not swing to the opposite failure of emitting <ins> tags with
 * placeholder slot ids — those either serve nothing or trip policy.
 *
 * The wrapper reserves height. An ad that pops in and shoves the article down
 * is a Cumulative Layout Shift hit, and CLS is a ranking signal, so an
 * unreserved ad unit costs organic traffic to buy ad impressions — the wrong
 * trade for a site whose whole strategy is search. */
/* Consent Mode v2 defaults, INLINED and placed ABOVE the ad and GA4 tags.
 *
 * This ordering is the whole mechanism. Consent defaults must be in the
 * dataLayer before gtag('config') and before the ad loader, so the signals ride
 * the very first hit. Shipping consent.js as a deferred <script> alongside the
 * others would set the defaults after the first pageview had already been sent
 * unconsented — compliant-looking and useless.
 *
 * It is inlined rather than linked for the same reason: an external file is a
 * network round trip during which the ad and analytics tags would race it. The
 * file is small and cached as source-of-truth for the tests; this emits it. */
function consentHead() {
  if (CONSENT.enabled === false) return "<!-- consent handled by the ad network's own CMP -->";
  let src = fs.readFileSync(path.join(ROOT, "assets/js/consent.js"), "utf8");
  /* Strip comments before inlining. The source file is heavily commented on
     purpose — the ordering rules in it are the kind of thing that gets broken by
     someone tidying up later — but shipping ~4 KB of prose into the <head> of
     1,478 pages is 6 MB of render-blocking explanation nobody reads. The file
     stays the documentation; this ships the behaviour.
     Conservative on purpose: block comments and whole-line // only. consent.js
     contains no string literal holding a comment marker (checked), and a
     general-purpose minifier is not worth the dependency for one file. */
  src = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return `<script>${src}\nwindow.VKConsent&&window.VKConsent.setDefaults();</script>`;
}

/* The network's loader, for the <head>. Exactly one network's tags ever ship:
   running two at once leaves unfilled slots and is against Ezoic's own setup
   guide, which tells you to remove other networks' code first. */
/* Ezoic's header scripts. Ordering is theirs, not mine, and both details are
   load-bearing: the two consent scripts must load BEFORE the header script, and
   data-cfasync="false" must sit IN FRONT OF src — it stops Cloudflare reordering
   them, and this site is behind Cloudflare. */
function ezoicHeader() {
  return `<script data-cfasync="false" src="https://cmp.gatekeeperconsent.com/min.js"></script>
<script data-cfasync="false" src="https://the.gatekeeperconsent.com/cmp.min.js"></script>
<script async src="//www.ezojs.com/ezoic/sa.min.js"></script>
<script>window.ezstandalone = window.ezstandalone || {}; ezstandalone.cmd = ezstandalone.cmd || [];</script>`;
}

function adLoader() {
  if (!ADS.enabled) return "<!-- ads disabled -->";
  const net = ADS.network || "adsense";
  if (net === "adsense") {
    /* Inert placeholder: ads.js turns this into a real script only after it has
       confirmed that the signed-in account is not paid. This prevents Auto Ads
       as well as manual units from loading for Creator Pro. */
    const g = `<script type="application/vk-ad" data-vk-ad-src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUB}"></script>`;
    /* Verification mode: Ezoic's header scripts present so their dashboard can
       detect the site, while AdSense keeps serving. Deliberately does NOT emit
       showAds placements — Ezoic is not approved yet, so those would render
       empty boxes. See the note on ezoicVerify in site.config.js. */
    return ADS.ezoicVerify ? ezoicHeader() + "\n" + g : g;
  }
  if (net === "ezoic") return ezoicHeader();
  return "<!-- no ad network configured -->";
}

function adUnit(slotKey, label) {
  if (!ADS.enabled) return "";
  const net = ADS.network || "adsense";
  let inner = "";

  if (net === "adsense") {
    const slot = (ADS.slots || {})[slotKey];
    if (!slot) return "";
    /* NOT initialised inline. The push() is deferred to assets/js/ads.js, which
       fires it when the unit approaches the viewport.
       Both placements sit below the article body, so on most visits they are
       off-screen at load — and initialising them there would spend main-thread
       time fetching and laying out an ad while the visitor is waiting for a PDF
       or a video encode to start. The tool is what they came for; the ad can
       wait until it is nearly visible. */
    inner =
      `<ins class="adsbygoogle" style="display:block" data-ad-client="${PUB}" data-ad-slot="${slot}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
  } else if (net === "ezoic") {
    /* Ezoic sizes each spot itself, so there is no slot id to configure — the
       same snippet goes at every position and the dashboard decides. Their setup
       guide is explicit that other networks' tags must be removed first, which
       is why `network` is a single choice rather than a list. */
    inner = `<script>ezstandalone.cmd.push(function () { ezstandalone.showAds({}); });</script>`;
  } else {
    return "";
  }

  return `
  <aside class="ad-slot" aria-label="Advertisement">
    <span class="ad-label">Advertisement</span>
    ${inner}
  </aside>`;
}
/* Cache-bust key derived from the CONTENT of the CSS/JS assets, so it only
 * changes when those files actually change — a rebuild with no asset changes
 * produces byte-identical pages (no more 600-file git churn every build). */
const V = "?v=" + (function () {
  const crypto = require("crypto");
  const h = crypto.createHash("sha1");
  const css = ["tokens", "base", "pages", "newsletter", "skin", "home"].map((n) => "assets/css/" + n + ".css");
  const dataAssets = ["data/catalog.js", "data/tool-icons.js", "data/site.config.js", "data/stats.js"];
  let js = [];
  try { js = fs.readdirSync(path.join(ROOT, "assets/js")).filter((f) => f.endsWith(".js")).sort().map((f) => "assets/js/" + f); } catch (e) {}
  css.concat(dataAssets, js).forEach((rel) => { try { h.update(fs.readFileSync(path.join(ROOT, rel))); } catch (e) {} });
  return h.digest("hex").slice(0, 10);
})();

function refreshHomepageAssetVersions() {
  const file = path.join(ROOT, "index.html");
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");
  html = html.replace(/((?:href|src)="(?:assets\/css\/(?:tokens|base|newsletter|skin|home)\.css|data\/(?:catalog|stats|tool-icons)\.js|assets\/js\/(?:home|ui|supabase-config|newsletter|usage|auth)\.js))\?v=[^"]*(")/g, `$1${V}$2`);
  fs.writeFileSync(file, html);
}

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* Tool <title>, longest variant that still fits.
 *
 * The old fixed pattern `Name — Free Online <Category> Tool | Vootkit` ran past
 * 65 characters on 87 pages — worst case 82 ("Amazon FBA Profit Calculator —
 * Free Online Freelance & Business Tool | Vootkit"). Google truncates around
 * 60, so the brand and half the descriptor were being cut off in results, on
 * exactly the pages meant to attract clicks.
 *
 * Degrade in order of what is worth losing: the category qualifier first (the
 * user already searched for the tool), then the descriptor, keeping the tool
 * name and the brand to the end. Pure and unit-tested. */
const TITLE_MAX = 60;
function toolTitle(name, catName, max) {
  const cap = max || TITLE_MAX;
  const n = String(name || "").trim();
  const c = String(catName || "").trim();
  const variants = [
    c ? `${n} — Free Online ${c} Tool | Vootkit` : null,
    `${n} — Free Online Tool | Vootkit`,
    `${n} — Free Tool | Vootkit`,
    `${n} | Vootkit`,
    n
  ].filter(Boolean);
  for (const v of variants) if (v.length <= cap) return v;
  return variants[variants.length - 1];   // a very long tool name still wins over truncation
}
if (typeof module === "object" && module.exports) module.exports.toolTitle = toolTitle;
const write = (rel, html) => {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html);
};

/* ---------- shared chrome ---------- */
function hreflangTags(alts) {
  if (!alts || alts.length < 2) return "";
  const links = alts.map((a) => `<link rel="alternate" hreflang="${a.code}" href="${a.href}">`);
  const en = alts.filter((a) => a.code === "en")[0] || alts[0];
  links.push(`<link rel="alternate" hreflang="x-default" href="${en.href}">`);
  return "\n" + links.join("\n");
}
function langLabel(code) {
  if (code === "en") return "English";
  const l = I18N.LOCALES.filter((x) => x.code === code)[0];
  return l ? l.label : code;
}
function langSwitcher(alts, lang) {
  if (!alts || alts.length < 2) return "";
  const items = alts.map((a) => `<a href="${a.href}"${a.code === lang ? ' aria-current="true"' : ""}>${esc(langLabel(a.code))}</a>`).join("");
  return `<details class="lang-switch"><summary title="Language">🌐 ${esc(langLabel(lang))}</summary><div class="lang-menu">${items}</div></details>`;
}

function brandLogo() {
  return `<svg class="brand-v" viewBox="0 0 44 44" aria-hidden="true">
        <circle class="brand-ring" cx="22" cy="22" r="17.5"/>
        <path class="brand-check" d="M12.5 14.5 21.5 30 31.5 13.5"/>
        <circle class="brand-orb" cx="33.5" cy="10.5" r="2.7"/>
      </svg>`;
}

function head(o) {
  // depth = how many ../ to reach site root
  const up = "../".repeat(o.depth) || "./";
  const lang = o.lang || "en";
  const bodyAttrs = [
    o.bodyClass ? ` class="${esc(o.bodyClass)}"` : "",
    o.cat ? ` data-cat="${o.cat}"` : ""
  ].join("");
  const here = o.url || "";
  const active = o.active
    || (here === SITE + "/" ? "home" : "")
    || (here.indexOf("/tools/") > -1 ? "tools" : "")
    || (here.indexOf("/workflows/") > -1 ? "workflow" : "")
    || (here.indexOf("/templates/") > -1 ? "templates" : "")
    || (here.indexOf("/blog/") > -1 ? "blog" : "")
    || (here.indexOf("/pricing.html") > -1 ? "pricing" : "")
    || (here.indexOf("/about.html") > -1 ? "about" : "");
  const cur = (name) => active === name ? ' aria-current="page"' : "";
  return `<!doctype html>
<html lang="${lang}" data-theme="light"${o.dir === "rtl" ? ' dir="rtl"' : ""}>
<head>
<meta charset="utf-8">
<meta name="google-adsense-account" content="${PUB}">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#fbfcfe">
<meta name="color-scheme" content="light">
<script>document.documentElement.setAttribute('data-theme','light');</script>
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}">
<link rel="canonical" href="${o.url}">${hreflangTags(o.alts)}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Vootkit">
<meta property="og:title" content="${esc(o.ogTitle || o.title)}">
<meta property="og:description" content="${esc(o.desc)}">
<meta property="og:url" content="${o.url}">\n<meta property="og:image" content="${o.image || OG_DEFAULT}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta property="og:image:alt" content="Vootkit — free browser tools that never upload your files">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(o.ogTitle || o.title)}">
<meta name="twitter:description" content="${esc(o.desc)}">\n<meta name="twitter:image" content="${o.image || OG_DEFAULT}">
${o.ld ? `<script type="application/ld+json">${JSON.stringify(o.ld)}</script>` : ""}
<link rel="icon" href="${up}favicon.ico" sizes="any">
<link rel="icon" href="${up}assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${up}apple-touch-icon.png">
<link rel="manifest" href="${up}site.webmanifest">
<link rel="stylesheet" href="${up}assets/css/app.css${V}">
${consentHead()}
${o.ads ? adLoader() : "<!-- no ads inside an active tool workspace -->"}
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA4}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4}');</script>
</head>
<body${bodyAttrs}>
<a class="skip" href="#main">Skip to content</a>
<header class="hdr">
  <div class="wrap hdr-in">
    <a class="brand" href="${up}" aria-label="Vootkit home">
      ${brandLogo()}
      vootkit
    </a>
    <nav class="nav" id="nav" aria-label="Main">
      <a href="${up}"${cur("home")}>Home</a>
      <a href="${up}tools/"${cur("tools")}>Tools</a>
      <a href="${up}workflows/"${cur("workflow")}>Workflow</a>
      <a href="${up}templates/"${cur("templates")}>Templates</a>
      <a href="${up}blog/"${cur("blog")}>Blog</a>
      <a href="${up}pricing.html"${cur("pricing")}>Pricing</a>
      <a href="${up}about.html"${cur("about")}>About</a>
    </nav>
    <div class="hdr-act">
      ${langSwitcher(o.alts, lang)}
      <button class="icon-btn" id="theme" type="button" aria-label="Light mode enabled" hidden>
        <svg viewBox="0 0 24 24"><path d="M21 13.1A8.4 8.4 0 1 1 10.9 3a6.6 6.6 0 0 0 10.1 10.1Z"/></svg>
      </button>
      <button class="icon-btn" type="button" data-open-search aria-label="Search tools">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>
      </button>
      <span id="vk-auth-slot" class="vk-auth-slot" aria-busy="true"><a class="btn btn-sm hdr-login" href="${up}auth/sign-in/">Login</a></span>
      <a class="hdr-cta" href="${up}auth/sign-up/"><span class="cta-full">Get Started Free</span><span class="cta-short">Start Free</span></a>
      <button class="icon-btn" id="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav">
        <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
    </div>
  </div>
</header>
<main id="main" tabindex="-1">`;
}

/* The footer newsletter is the only capture that appears on EVERY page, which
 * makes it the one that matters most: the tool-success slot only fires for
 * people who complete a run, and the blog slot only for people who read. A
 * visitor who lands, browses and leaves has no other point of contact.
 *
 * opts.noNewsletter suppresses it where asking would be absurd — the unsubscribe
 * page above all, where a signup form next to "you have been removed" reads as
 * either a bug or a dark pattern. */
/* ---------- SOCIAL ICONS ----------
 * Line glyphs rather than the usual solid brand marks, so the row sits in the
 * same visual language as the 66 tool icons instead of looking like a strip
 * pasted in from somewhere else.
 *
 * An entry with an empty URL in site.config.js renders NOTHING — and if all of
 * them are empty, socialRow() returns "" and the footer bar closes up around
 * the gap. The site can never ship an icon pointing at a profile that is not
 * there yet. */
const SOCIAL_GLYPH = {
  x:        '<path d="M4.5 4.5 19.5 19.5M19.5 4.5 4.5 19.5"/>',
  facebook: '<path d="M15 3h-2.5A4.5 4.5 0 0 0 8 7.5V10H5.5v3.5H8V21h3.5v-7.5H14L14.7 10H11.5V7.5a1 1 0 0 1 1-1H15z"/>',
  instagram:'<rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1.1"/>'
};
const SOCIAL_LABEL = { x: "X", facebook: "Facebook", instagram: "Instagram" };

function socialRow() {
  const s = CFG.social || {};
  const items = Object.keys(SOCIAL_GLYPH)
    .filter((k) => typeof s[k] === "string" && s[k].trim() !== "")
    .map((k) => `<a href="${esc(s[k].trim())}" class="ftr-soc" rel="me noopener" target="_blank" aria-label="Vootkit on ${SOCIAL_LABEL[k]}">`
      + `<svg viewBox="0 0 24 24" aria-hidden="true">${SOCIAL_GLYPH[k]}</svg></a>`);
  return items.length ? `<div class="ftr-socials">${items.join("")}</div>` : "";
}

/* The footer columns. Kept in one place because foot() and the hand-authored
   homepage have to agree — a link that exists in one footer and not the other
   is the sort of drift nobody notices for months. */
function footCols(up) {
  return `
      <div class="ftr-col">
        <h4>Product</h4>
        <a href="${up}tools/">All tools</a><a href="${up}workflows/">Workflows</a><a href="${up}pricing.html">Pricing</a><a href="${up}blog/">What’s new</a>
      </div>
      <div class="ftr-col">
        <h4>Resources</h4>
        <a href="${up}blog/">Guides</a><a href="${up}blog/">Blog</a><a href="${up}help/">Help center</a><a href="${up}contact.html">Contact us</a>
      </div>
      <div class="ftr-col">
        <h4>Company</h4>
        <a href="${up}about.html">About us</a><a href="${up}privacy.html">Privacy policy</a><a href="${up}cookies.html">Cookie policy</a><a href="${up}terms.html">Terms of service</a><a href="${up}disclaimer.html">Disclaimer</a><a href="${up}security.html">Security</a>
      </div>`;
}

/* The brand block that fills the slot the reference design gives to App Store
   badges. Vootkit has no apps, and a badge for a store listing that does not
   exist is not a design decision, it is a lie in the footer of every page. So
   the space says the truest thing the site has to say instead. */
function footBrand(up) {
  return `
      <div class="ftr-brand">
        <a class="ftr-mark" href="${up}" aria-label="Vootkit home">vootkit</a>
        <p class="ftr-copy">&copy; <span id="yr"></span> Vootkit. All rights reserved.</p>
      </div>`;
}

function foot(depth, extraScripts, opts) {
  const up = "../".repeat(depth) || "./";
  const o = opts || {};
  const convertScript = o.workspaceScripts === false ? "" : `<script src="${up}assets/js/convert.js${V}" defer></script>`;
  const workspaceTailScripts = o.workspaceScripts === false ? "" : `
<script src="${up}assets/js/usage.js${V}" defer></script>
<script src="${up}assets/js/deliver.js${V}" defer></script>
<!-- Tool chaining. tool-flow.js says what each tool accepts, tool-icons.js
     gives the next-step buttons the same per-tool icons as everywhere else,
     and handoff.js parks the finished file on the device between the two
     pages. All three are optional: without them a tool simply downloads. -->
<script src="${up}data/tool-flow.js${V}" defer></script>
<script src="${up}data/tool-icons.js${V}" defer></script>
<script src="${up}assets/js/handoff.js${V}" defer></script>
<script src="${up}assets/js/gate.js${V}" defer></script>`;
  return `</main>
<footer class="ftr">
  <div class="wrap">
    ${o.noNewsletter ? "" : '<div class="ftr-nl" data-newsletter="footer"></div>'}
    <div class="ftr-top">
      <div class="ftr-cols">${footCols(up)}
      </div>
    </div>
    <div class="ftr-bar">
      ${footBrand(up)}
      <span class="ftr-lang" aria-label="Current language: English">English <span aria-hidden="true">⌄</span></span>
    </div>
  </div>
</footer>
<script src="${up}data/site.config.js${V}"></script>
<script src="${up}data/catalog.js${V}"></script>
<script>
document.getElementById('yr').textContent=new Date().getFullYear();
(function(){var b=document.getElementById('burger'),n=document.getElementById('nav');
b.addEventListener('click',function(){var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o?'true':'false');b.setAttribute('aria-label',o?'Close menu':'Open menu');});
document.documentElement.setAttribute('data-theme','light');})();
</script>
<script src="${up}assets/js/track.js${V}" defer></script>
<script src="${up}assets/js/consent-ui.js${V}" defer></script>
<script src="${up}assets/js/ads.js${V}" defer></script>
<script src="${up}assets/js/ui.js${V}" defer></script>
<script src="${up}assets/js/recent.js${V}" defer></script>
<script src="${up}assets/js/supabase-config.js${V}" defer></script>
<script src="${up}assets/js/errors.js${V}" defer></script>
${convertScript}
<script src="${up}assets/js/newsletter.js${V}" defer></script>
<script src="${up}assets/js/auth.js${V}" defer></script>
${workspaceTailScripts}
${(extraScripts||[]).map(function(x){return '<script src="'+up+x+V+'" defer></script>';}).join("\n")}
</body>
</html>
`;
}

/* Round down to a stable bucket, so a title only changes when the site has
   genuinely crossed a milestone rather than every time a tool ships. */
const floorTo = (n, step) => Math.max(step, Math.floor(n / step) * step);

/* category lookup + icon set (mirrors assets/js/home.js so cards render at build time) */
const CATBY = {};
VK.CATEGORIES.forEach((c) => { CATBY[c.slug] = c; });

/* ---------- PER-TOOL ICONS ----------
 *
 * THE PROBLEM THIS FIXES. Every card called icon(cat.icon), so all 33 PDF
 * tools rendered the same grey document glyph, all 33 image tools the same
 * picture glyph, and so on. A category page was 33 identical squares with
 * different words under them, which is exactly what makes a large tool site
 * look templated rather than built.
 *
 * THE APPROACH. A vocabulary of line glyphs keyed to the VERB a tool performs
 * — merge, split, compress, rotate, lock, sign — plus a colour tied to that
 * same verb family. Colour by family rather than at random, so tools that do
 * similar things rhyme and tools that do different things contrast. Random
 * per-tool colour produces confetti; this produces a system.
 *
 * Resolution is first-match-wins down an ordered list, so put specific
 * patterns above general ones. Anything unmatched falls back to its category
 * glyph, and iconAudit() below fails the build if that ever happens, because
 * a silent fallback is how the original problem persisted unnoticed.
 */
const GLYPH = {
  merge:    '<path d="M8 4v6a4 4 0 0 0 4 4h6"/><path d="M16 4v6a4 4 0 0 1-4 4H6"/><path d="m17 11 3 3-3 3"/>',
  split:    '<path d="M12 4v6"/><path d="M12 10 7 15v5"/><path d="m12 10 5 5v5"/><circle cx="12" cy="4" r="1.6"/>',
  compress: '<path d="M4 9h6V3"/><path d="M20 15h-6v6"/><path d="m10 9-6-6"/><path d="m14 15 6 6"/>',
  expand:   '<path d="M9 3H3v6"/><path d="M15 21h6v-6"/><path d="m3 3 7 7"/><path d="m21 21-7-7"/>',
  rotate:   '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
  trash:    '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
  reorder:  '<path d="M4 6h10M4 12h16M4 18h7"/><path d="m18 4 3 3-3 3"/>',
  extract:  '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/><path d="M12 11v6"/><path d="m9 14 3 3 3-3"/>',
  lock:     '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  unlock:   '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7-2.6"/>',
  sign:     '<path d="M3 18c4 0 5-12 9-12s3 9 6 9"/><path d="M3 21h18"/>',
  stamp:    '<path d="M6 20h12"/><path d="M9 16V9a3 3 0 1 1 6 0v7"/><rect x="5" y="16" width="14" height="4" rx="1"/>',
  crop:     '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M2 6h14a2 2 0 0 1 2 2v14"/>',
  resize:   '<rect x="3" y="3" width="12" height="12" rx="2"/><path d="M9 21h12V9"/><path d="m13 13 7 7"/>',
  convert:  '<path d="M4 8h13l-3-3"/><path d="M20 16H7l3 3"/>',
  image:    '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.6"/><path d="m4 18 5-5 3.5 3 3-3L20 18"/>',
  video:    '<rect x="2.5" y="5" width="14" height="14" rx="2.5"/><path d="m17 10 5-3v10l-5-3z"/>',
  audio:    '<path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4"/>',
  mic:      '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',
  text:     '<path d="M5 5h14"/><path d="M12 5v14"/><path d="M9 19h6"/>',
  list:     '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.4"/><circle cx="4.5" cy="12" r="1.4"/><circle cx="4.5" cy="18" r="1.4"/>',
  search:   '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  code:     '<path d="m8 7-5 5 5 5"/><path d="m16 7 5 5-5 5"/><path d="m13 4-2 16"/>',
  braces:   '<path d="M8 4c-2 0-3 1-3 3v2c0 2-1 3-2 3 1 0 2 1 2 3v2c0 2 1 3 3 3"/><path d="M16 4c2 0 3 1 3 3v2c0 2 1 3 2 3-1 0-2 1-2 3v2c0 2-1 3-3 3"/>',
  hash:     '<path d="M5 9h14M5 15h14M10 4l-2 16M16 4l-2 16"/>',
  key:      '<circle cx="7.5" cy="12" r="4"/><path d="M11.5 12H21"/><path d="M17 12v4M20 12v3"/>',
  shield:   '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/><path d="m9 12 2 2 4-4"/>',
  eye:      '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  qr:       '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h7"/>',
  barcode:  '<path d="M4 5v14M7 5v14M10.5 5v14M14 5v10M17 5v14M20 5v14"/>',
  calc:     '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
  percent:  '<path d="m5 19 14-14"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>',
  chart:    '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  money:    '<circle cx="12" cy="12" r="8"/><path d="M12 7v10"/><path d="M14.5 9.5A2.5 2.5 0 0 0 12 8.5h-.5a2 2 0 0 0 0 4h1a2 2 0 0 1 0 4H12a2.5 2.5 0 0 1-2.5-1"/>',
  clock:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  timer:    '<circle cx="12" cy="13" r="8"/><path d="M12 9v4"/><path d="M9 2h6"/><path d="m19 6 1.5-1.5"/>',
  dice:     '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.4"/><circle cx="15.5" cy="15.5" r="1.4"/><circle cx="12" cy="12" r="1.4"/>',
  palette:  '<path d="M12 3a9 9 0 1 0 0 18 2 2 0 0 0 1.6-3.2 2 2 0 0 1 1.6-3.2H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3Z"/><circle cx="7.5" cy="10.5" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="16.5" cy="10.5" r="1.2"/>',
  droplet:  '<path d="M12 3s6 6.4 6 10a6 6 0 0 1-12 0c0-3.6 6-10 6-10Z"/>',
  contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" stroke="none"/>',
  ruler:    '<rect x="2" y="8" width="20" height="8" rx="2"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>',
  globe:    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/>',
  link:     '<path d="M10 13a4 4 0 0 0 5.7.3l3-3A4 4 0 0 0 13 4.7l-1.5 1.5"/><path d="M14 11a4 4 0 0 0-5.7-.3l-3 3A4 4 0 0 0 11 19.3L12.5 18"/>',
  mail:     '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  page:     '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/><path d="M10 12h6M10 16h4"/>',
  layers:   '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  wand:     '<path d="m4 20 11-11"/><path d="m14 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z"/><path d="m19 11 .7 1.4 1.3.6-1.3.6-.7 1.4-.7-1.4L17 13l1.3-.6.7-1.4Z"/>',
  heart:    '<path d="M12 20s-7-4.4-7-9.4A4.1 4.1 0 0 1 12 7a4.1 4.1 0 0 1 7 3.6c0 5-7 9.4-7 9.4Z"/>',
  plane:    '<path d="M2 13l20-8-8 20-2.5-8L2 13Z"/>',
  book:     '<path d="M4 4h7a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H4Z"/><path d="M20 4h-3a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H20Z"/>',
  home:     '<path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  contract: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/><path d="M10 13h5"/><path d="m10 17 2-1 2 1"/>',
  user:     '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  chat:     '<path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.4-4.2A8 8 0 1 1 21 12Z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
  car:      '<path d="M5 17h14"/><path d="M4 17v-4l2-5h12l2 5v4"/><circle cx="7.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/>',
  piggy:    '<path d="M4 12a6 6 0 0 1 6-6h3a6 6 0 0 1 6 6v3h-2l-1 3h-3l-.5-2h-3l-.5 2H6l-1-3H4Z"/><circle cx="16" cy="11" r="1"/><path d="M9 6V4"/>',
  umbrella: '<path d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9Z"/><path d="M12 12v6a2.5 2.5 0 0 0 5 0"/>',
  wallet:   '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 9h13a2 2 0 0 1 0 5H3"/><circle cx="17" cy="11.5" r="1.1"/>',
  thermo:   '<path d="M14 14V5a2 2 0 1 0-4 0v9a4 4 0 1 0 4 0Z"/><path d="M12 9v6"/>',
  gauge:    '<path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 15 4-4"/><circle cx="12" cy="17" r="1.4"/>',
  cube:     '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  database: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  scales:   '<path d="M12 4v16M7 20h10"/><path d="M12 7 4 9l3 5 3-5Z"/><path d="m12 7 8 2-3 5-3-5Z"/>',
  scissors: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8 8l12 10M20 6 8 16"/>',
  camera:   '<rect x="3" y="7" width="18" height="13" rx="2.5"/><circle cx="12" cy="13.5" r="3.5"/><path d="M9 7l1.5-3h3L15 7"/>',
  mute:     '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6M21 9l-5 6"/>',
  repeat:   '<path d="M4 9V8a3 3 0 0 1 3-3h10l-3-3"/><path d="M20 15v1a3 3 0 0 1-3 3H7l3 3"/>',
  speaker:  '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 9.5a4 4 0 0 1 0 5M18 7a7.5 7.5 0 0 1 0 10"/>',
  square:   '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 4v16"/>',
  trending: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>'
};

/* Verb -> [glyph, hue]. First match wins, so specific patterns come first.
   Hue is a CSS hue angle; the chip is built from it at low saturation so a
   grid of them reads as a palette rather than a paint chart. */
const ICON_RULES = [
  /* Two more caught by spot-checking the resolver output rather than trusting
     it: time-calculator was landing on 'percent' and json-formatter on
     'convert', both via keyword text rather than anything about the tool. */
  [/time-calculator|duration|hours-minutes/, 'clock', 340],
  [/^json|json-formatter|xml-formatter|yaml/, 'braces', 216],

  /* --- breaking the big collisions -------------------------------------
     Written after dumping the actual per-tool assignments and finding nine
     finance tools on one 'money' glyph, nine everyday converters on one
     'convert' glyph, and five realestate tools on one 'home'. A rule that
     matches nine things is a category icon wearing a disguise. */
  [/mortgage/,                           'home',     250],
  [/auto-loan|car-loan|vehicle-finance/, 'car',      216],
  [/refinance/,                          'repeat',   200],
  [/compound|savings-goal|savings/,      'piggy',    152],
  [/retirement|pension/,                 'umbrella', 190],
  [/overtime|time-and-a-half/,           'timer',    32],
  [/salary-conv|wage-conv/,              'convert',  152],
  [/budget|paycheck|payroll|wage|employee-cost/, 'wallet', 152],
  [/roas|stripe-fee|paypal-fee|etsy-fee|late-fee/, 'percent', 32],
  [/inventory|stock-level/,              'cube',     268],
  [/swot|brainstorm/,                    'layers',   284],
  [/break-even|profit-margin|cap-rate|rental-yield|roi/, 'trending', 152],
  [/rent-vs-buy|affordab/,               'scales',   250],
  [/life-insurance|life-cover/,          'heart',    340],
  [/auto-insurance|car-insurance/,       'car',      216],
  [/deductible|excess/,                  'scales',   32],
  [/income-protection|disability-cover/, 'shield',   152],
  [/insurance|premium|policy/,           'umbrella', 190],

  [/temperature|celsius|fahrenheit/,     'thermo',   340],
  [/speed-conv|pace|velocity/,           'gauge',    190],
  [/volume-conv|area-conv/,              'cube',     190],
  [/data-conv|storage-conv|bytes/,       'database', 216],
  [/weight-conv|mass-conv|ideal-weight/, 'scales',   190],
  [/length-conv|unit-conv|distance/,     'ruler',    190],
  [/timezone/,                           'globe',    190],

  [/trim-video|cut-video|clip/,          'scissors', 340],
  [/frame-grab|screenshot|thumbnail|passport-photo/, 'camera', 216],
  [/mute-video|\bmute\b/,                'mute',     340],
  [/loop-video|\bloop\b/,                'repeat',   340],
  [/volume|loudness/,                    'speaker',  340],
  [/gradient/,                           'square',   284],
  [/blur|sharpen|filter-studio/,         'droplet',  216],

  /* Specific ids first. These were surfaced by iconAudit() refusing to let the
     build produce a silent category fallback. */
  [/rent-vs-buy|home-afford|rental-yield|cash-on-cash|realestate|property|mortgage-afford/, 'home', 250],
  [/quote-gen|proposal-gen|contract-gen|nda|agreement/, 'contract', 32],
  [/resume|cv-|cover-letter/,            'user',     284],
  [/pto|accrual|leave|holiday-entitle/,  'calendar', 340],
  [/name-generator|slogan|brand-name/,   'wand',     284],
  [/invoice|receipt/,                    'page',     145],
  [/quiz|flashcard|study|learning|vocabulary|citation/, 'book', 264],
  [/heart-rate|bmi|bmr|body-fat|ideal-weight|water-intake/, 'heart', 350],
  [/chat|overlay|caption/,               'chat',     340],
  [/merge|combine|join/,                 'merge',    250],
  [/split|extract-pages|extract-pdf/,    'split',    32],
  [/compress|shrink|optimi/,             'compress', 152],
  [/upscale|enlarge/,                    'expand',   152],
  [/rotate|flip/,                        'rotate',   200],
  [/delete|remove-pages/, 'trash', 4],
  [/reorder|organise|organize|sort/,     'reorder',  268],
  [/extract|page-numbers/,               'extract',  32],
  [/unlock|remove-password|decrypt/,     'unlock',   142],
  [/protect|lock|password|encrypt|redact|checksum/, 'lock', 4],
  [/sign|signature/,                     'sign',     284],
  [/watermark|stamp|meme/,               'stamp',    284],
  [/crop|circle-crop|round-corners/,     'crop',     200],
  [/resize|\bscale\b|\brescale\b/,        'resize',   200],
  [/convert|to-pdf|pdf-to|to-jpg|to-png|to-webp|format/, 'convert', 216],
  [/video|gif|trim|mute|loop|frame/,     'video',    340],
  [/audio|mp3|wav|volume/,               'audio',    340],
  [/qr/,                                 'qr',       268],
  [/barcode/,                            'barcode',  268],
  [/ocr|image-to-text|\bscan\b/,         'search',   216],
  [/speech|transcribe|\bvoice\b|\btts\b/, 'mic',    340],
  /* Developer tools split by what they actually do, not by being developer
     tools. Twelve of fifteen used to land on one glyph and one hue, which is
     the same uniform-grid problem this whole system exists to remove. */
  [/validator|validate|checksum-card|iban|credit-card/, 'shield', 142],
  [/jwt|token|hash-gen|hash-generator|bcrypt/, 'key',  4],
  [/uuid|guid|nanoid/,                   'hash',     268],
  [/regex|pattern-test/,                 'search',   32],
  [/base64|url-encode|url-decode|encode|decode|escape/, 'convert', 190],
  [/cron|schedule-expr/,                 'clock',    284],
  [/json|xml|yaml|toml/,                 'braces',   216],
  [/formatter|minif|beautif|prettif|lint/, 'code',   216],
  [/\bcode\b|text-diff|\bdiff\b/,          'code',     216],
  [/colou?r|palette|gradient|shadow/,    'palette',  284],
  [/contrast|a11y|accessib|alt-text|tap-target/, 'contrast', 190],
  [/exif|metadata|viewer|preview|inspect/, 'eye',    190],
  [/chart|graph|visuali/,                'chart',    152],
  [/percent|ratio|discount|vat|tax|gst/, 'percent',  32],
  [/loan|mortgage|interest|salary|budget|savings|retire|crypto|profit|margin|cac|fba|currency|money|price|cost|tip|hourly|\brate\b|dti|debt/, 'money', 152],
  /* Dates and times BEFORE the generic calculator rule — 'date-calculator'
     otherwise resolves on the word 'calculator' before anything notices
     what it calculates. */
  [/timer|pomodoro|stopwatch|countdown/, 'timer',    340],
  [/\bdate\b|\bage\b|calendar|birthday/,  'calendar', 340],
  [/time-calc|\btime\b|clock|timezone/,   'clock',    340],
  [/calculator|solver|equation|fraction|math/, 'calc', 152],
  [/random|picker|shuffle|dice/,         'dice',     268],
  [/unit|convert-unit|measure|length/,   'ruler',    190],
  [/travel|flight|trip|distance/,        'plane',    190],
  [/health|bmi|calorie|water|sleep/,     'heart',    340],
  [/word|character|readability|lorem|case|text|line|typing/, 'text', 216],
  [/link|shorten|utm|redirect|slug/,     'link',     268],
  [/email|mail|subject/,                 'mail',     268],
  [/seo|keyword|serp|meta|sitemap|robots/, 'globe',  190],
  [/image|photo|picture|jpg|png|webp|heic|svg|favicon|collage/, 'image', 216],
  [/pdf|document|doc|page/,              'page',     4],
  [/background|layer|batch|bulk/,        'layers',   250],
  [/ai|generate|enhance|magic/,          'wand',     284],
  [/education|study|quiz|grade|learn/,   'book',     190]
];

function toolIcon(t) {
  const hay = (t.id + ' ' + (t.name || '') + ' ' + (t.kw || '')).toLowerCase();
  const position = VK.TOOLS.findIndex((item) => item.id === t.id && item.cat === t.cat);
  for (const [re, g, hue] of ICON_RULES) if (re.test(hay)) {
    /* Every tool owns a stable colour instead of borrowing its category's
       colour. The golden-angle step distributes neighbouring cards across
       the full wheel, while the action glyph keeps the meaning explicit. */
    return { g, hue: Number(((hue + Math.max(0, position) * 137.508) % 360).toFixed(3)) };
  }
  return null;
}

/* A compact, globally unique signature. The action glyph explains what the
   tool does; this mark makes the complete app icon exclusive to that tool.
   Including the catalogue position guarantees uniqueness even when names
   begin with the same word (PDF to JPG / PDF to PNG / PDF to WebP). */
function toolMark(t) {
  const position = VK.TOOLS.findIndex((item) => item.id === t.id && item.cat === t.cat);
  const lead = String(t.id || "tool").replace(/[^a-z0-9]/g, "").charAt(0).toUpperCase() || "V";
  return lead + Math.max(0, position).toString(36).toUpperCase().padStart(2, "0");
}

/* ---------- THE TILE IS A SOLID COLOUR, NOT A TINT ----------
 *
 * It used to be hsl(H 72% 96%) — a 96%-lightness wash with the glyph stroked
 * in the same hue at 46%. Technically eleven colours; visually a page of pale
 * grey-blue squares, which is exactly the "generic" the reference is not. Every
 * site that does this well fills the tile with the saturated colour and puts a
 * white glyph on top, so the colour is the first thing you see rather than
 * something you notice on inspection.
 *
 * WHITE ON A SOLID FILL IS THE HARD PART, and it is why this is computed in
 * Node rather than written as one hsl() in the stylesheet. Lightness does not
 * mean brightness: hsl(50 68% 46%) is a yellow that white barely shows on,
 * while hsl(250 68% 46%) is a blue where white is emphatic. A single lightness
 * across eleven hues would either wash out the yellows or turn the blues to
 * navy. So each hue gets its own lightness, found by binary search against the
 * real WCAG contrast of white on the result, targeting 4.6:1 — the text bar
 * rather than the 3:1 icon bar, because these carry the tool's identity and
 * should stay crisp on a bad screen in daylight. */
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}
function relLum(rgb) {
  const c = rgb.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const whiteOn = (rgb) => 1.05 / (relLum(rgb) + 0.05);

const FILL_CACHE = {};
function hueFill(h) {
  if (FILL_CACHE[h]) return FILL_CACHE[h];
  let lo = 15, hi = 62, best = 40;          // darker than 15% is mud, lighter than 62% never passes
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (whiteOn(hslToRgb(h, 68, mid)) >= 4.6) { best = mid; lo = mid; } else { hi = mid; }
  }
  const hex = "#" + hslToRgb(h, 68, best).map((v) => v.toString(16).padStart(2, "0")).join("");
  FILL_CACHE[h] = hex;
  return hex;
}

function toolIconHtml(t) {
  const m = toolIcon(t);
  const cat = CATBY[t.cat] || {};
  if (!m) return `<span class="ic">${icon(cat.icon)}</span>`;   // audited against below
  return `<span class="ic ic-tool ic-tool-${esc(t.cat)} ic-glyph-${esc(m.g)}" style="--ic-h:${m.hue};--ic-bg:${hueFill(m.hue)}">` +
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPH[m.g]}</svg>` +
    `<b class="ic-mark" aria-hidden="true">${toolMark(t)}</b></span>`;
}

/* A silent fallback is how the original problem survived unnoticed, so the
   build refuses to produce one. Also reports glyph spread per category — a
   category where every tool resolves to the same glyph has not been fixed,
   it has just moved. */
function iconAudit() {
  const live = VK.TOOLS.filter((t) => t.status === "live");
  const miss = live.filter((t) => !toolIcon(t));
  if (miss.length) {
    throw new Error("tools with no icon rule: " + miss.map((t) => t.id).join(", "));
  }
  const bad = [];
  VK.CATEGORIES.forEach((c) => {
    const inCat = live.filter((t) => t.cat === c.slug);
    const distinct = new Set(inCat.map((t) => toolIcon(t).g)).size;
    /* Caught insurance: four tools, all on 'umbrella', invisible to the old
       five-tool floor. A category of any size where every tool shares one
       glyph is exactly the problem this system exists to remove. */
    if (inCat.length >= 3 && distinct === 1) {
      bad.push(`${c.slug} (${inCat.length} tools, all on one glyph)`);
      return;
    }
    if (inCat.length < 5) return;
    /* Roughly one glyph per three tools. The old floor was "at least 3
       glyphs", which passed a 17-tool category sitting on 3 icons — thin
       enough to still read as a template. */
    const need = Math.max(3, Math.ceil(inCat.length / 3));
    if (distinct < need) {
      bad.push(`${c.slug} (${inCat.length} tools, ${distinct} glyphs, needs ${need})`);
    }
  });
  if (bad.length) throw new Error("categories still visually uniform: " + bad.join("; "));
  const all = new Set(live.map((t) => toolIcon(t).g));
  console.log(`tool icons: ${all.size} distinct glyphs across ${live.length} tools`);
}

function icon(name) {
  const p = {
    file: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="1.6"/><path d="m4 18 5-5 4 3 3-3 4 4"/>',
    video: '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="M17 9l4-2v10l-4-2z"/>',
    coins: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.8 1.8 0 0 1 0 3.5h-3a1.8 1.8 0 0 0 0 3.5h4"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.4 7.7 8 8 4.6-.3 8-3 8-8V6z"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    message: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>',
    bug: '<path d="M8 8a4 4 0 0 1 8 0v7a4 4 0 0 1-8 0z"/><path d="M9 4 7 2M15 4l2-2M4 12h4M16 12h4M5 18l3-2M19 18l-3-2"/>',
    tag: '<path d="M20 12 12 20 4 12V4h8z"/><circle cx="8.5" cy="8.5" r="1.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    type: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    palette: '<circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><path d="M12 22a3 3 0 0 0 3-3 2 2 0 0 0-2-2h-1.5a1.5 1.5 0 0 1 0-3H14a5 5 0 1 0-5-5"/>',
    code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4"/>',
    sync: '<path d="M4 8h13l-3-3"/><path d="M20 16H7l3 3"/>',
    audio: '<path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4"/>',
    calculator: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
    dots: '<path d="M6 12h.01M12 12h.01M18 12h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 4v16"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1.2"/><rect x="14" y="4" width="6" height="6" rx="1.2"/><rect x="4" y="14" width="6" height="6" rx="1.2"/><rect x="14" y="14" width="6" height="6" rx="1.2"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    upload: '<path d="M12 16V5"/><path d="m8 9 4-4 4 4"/><path d="M5 15v4h14v-4"/>',
    download: '<path d="M12 5v11"/><path d="m8 12 4 4 4-4"/><path d="M5 19h14"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9z"/>',
    crown: '<path d="M4 8l4 4 4-7 4 7 4-4v11H4z"/><path d="M4 19h16"/>',
    users: '<path d="M16 19a4 4 0 0 0-8 0"/><circle cx="12" cy="9" r="3"/><path d="M20 19a3.4 3.4 0 0 0-3-3.3"/><path d="M4 19a3.4 3.4 0 0 1 3-3.3"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/>',
    sliders: '<path d="M4 7h10"/><path d="M18 7h2"/><circle cx="16" cy="7" r="2"/><path d="M4 17h2"/><path d="M10 17h10"/><circle cx="8" cy="17" r="2"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.6 6.8-4.2"/><path d="m8.6 13.4 6.8 4.2"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 10-13h-7z"/>',
    laptop: '<path d="M5 5h14v10H5z"/><path d="M3 19h18"/>',
    sparkles: '<path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3z"/><path d="M18 15l.9 2.3L21 18l-2.1.7L18 21l-.9-2.3L15 18l2.1-.7z"/>',
    heart: '<path d="M12 20s-6.5-4.3-9-8.3A4.7 4.7 0 0 1 12 6a4.7 4.7 0 0 1 9 5.7c-2.5 4-9 8.3-9 8.3z"/>',
    plane: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',
    book: '<path d="M12 6c-2-1.2-5-1.2-7 0v12c2-1.2 5-1.2 7 0 2-1.2 5-1.2 7 0V6c-2-1.2-5-1.2-7 0z"/><path d="M12 6v12"/>',
    tool: '<path d="M14 6a4 4 0 0 0-5 5L3 17l4 4 6-6a4 4 0 0 0 5-5l-3 3-4-4z"/>',
    workflow: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="6" cy="18" r="2"/><path d="M8 6h3a3 3 0 0 1 3 3v0a3 3 0 0 0 3 3M8 18h3a3 3 0 0 0 3-3v0a3 3 0 0 1 3-3"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
    headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h4v6H6a2 2 0 0 1-2-2zm16 0h-4v6h2a2 2 0 0 0 2-2z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/>',
    folder: '<path d="M3 6h7l2 2h9v11H3z"/>',
    cookie: '<path d="M20 13a8 8 0 1 1-9-9 4 4 0 0 0 4 4 4 4 0 0 0 5 5Z"/><circle cx="8" cy="14" r="1"/><circle cx="11" cy="18" r="1"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    alert: '<path d="M12 3 2.5 20h19z"/><path d="M12 9v5M12 17h.01"/>',
    "arrow-right": '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'
  };
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (p[name] || p.file) + '</svg>';
}
/* curated badge sets — only real, live tool ids */
const POPULAR = new Set([
  "merge-pdf", "compress-pdf", "compress-image", "resize-image", "convert-image",
  "compress-video", "video-to-gif", "mortgage-calculator", "loan-calculator",
  "json-formatter", "word-counter", "qr-generator", "password-generator",
  "unit-converter", "meta-tag-generator", "color-converter"
]);
const NEW = new Set([
  "trim-video", "vertical-reframe", "mute-video", "extract-audio", "frame-grabber",
  "csv-to-chart", "markdown-editor", "schema-generator"
]);

const DIR_FEATURED_ORDER = [
  "word-to-pdf", "merge-pdf", "compress-image", "trim-video",
  "jpg-to-png", "convert-video", "compress-pdf",
  "jpg-to-pdf", "crop-image", "remove-pdf-password", "audio-converter"
];
const DIR_GROUPS = [{ slug: "all", name: "All", icon: "grid", cats: [] }].concat(
  VK.CATEGORIES.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon, cats: [c.slug] }))
);

const CATEGORY_DEPTH = {
  pdf: {
    focus: "PDF work is usually private by nature: contracts, invoices, forms, statements, scans and signed documents. The safest flow is to keep the file on the device, make the smallest change needed, then download a clean result.",
    choose: ["Use merge, split, reorder and delete tools when the page structure is the problem.", "Use compress and convert tools when the file has to fit an upload limit or move into another format.", "Use protect, unlock and redact tools when the question is access, sharing or sensitive information."]
  },
  images: {
    focus: "Image tasks normally fail at the edges: files are too large, the format is wrong for a platform, or dimensions do not match where the image will be used. These tools keep that work quick and visual.",
    choose: ["Resize before compression when a photo is much larger than the final display size.", "Convert to WebP or AVIF for web delivery, and keep PNG when transparency matters.", "Use crop and rotate tools before optimizing so you are not polishing pixels you will throw away."]
  },
  video: {
    focus: "Video files get large quickly, so the useful tools are the ones that reduce duration, resolution or bitrate before you upload. Vootkit keeps those operations in the browser where possible.",
    choose: ["Trim first if the clip has dead time at the beginning or end.", "Compress when the destination has a strict size limit like chat, email or a creator platform.", "Use format conversion only when a receiving app refuses the file you already have."]
  },
  finance: {
    focus: "Finance calculators are best used for comparison, not guesswork. Change one number at a time and watch how rate, term, deposit, extra payments and fees move the result.",
    choose: ["Use loan and mortgage calculators before comparing offers so each quote is measured on the same assumptions.", "Use debt and payoff tools to see the cost of waiting.", "Use savings and investment calculators for planning scenarios, not as financial advice."]
  },
  insurance: {
    focus: "Insurance choices are trade-offs between premium, deductible, cover amount and risk. The tools here make those trade-offs visible before you speak to an insurer or broker.",
    choose: ["Estimate the cover gap first, then compare premiums.", "Run deductible scenarios with realistic claim amounts, not best-case assumptions.", "Treat results as planning support and check local policy terms before buying."]
  },
  realestate: {
    focus: "Property decisions mix cash flow, debt, fees, time horizon and risk. These calculators separate those pieces so you can see what is driving the answer.",
    choose: ["Use affordability and closing-cost tools before viewing properties.", "Use rent-vs-buy when time horizon is uncertain.", "Use yield and cap-rate tools when comparing rental or investment properties."]
  },
  tax: {
    focus: "Tax and payroll numbers change by location, employment type and deductions. Vootkit tools help you model the structure clearly, then compare it with your local rules.",
    choose: ["Use salary and hourly converters when comparing offers.", "Use payroll and employee-cost tools when the question is total employer cost.", "Use tax estimators for planning only, then verify with the correct local tax authority or accountant."]
  },
  business: {
    focus: "Small-business work often needs a clean document or a quick pricing answer, not a full accounting system. These tools help freelancers and teams move from estimate to invoice to margin check.",
    choose: ["Use generators for customer-facing documents you want to download or send.", "Use margin, fee and break-even calculators before setting a price.", "Use inventory and business-card tools for quick operating tasks that do not need a separate app."]
  },
  seo: {
    focus: "SEO and marketing tools are about reducing publishing mistakes: bad titles, messy tracking links, invalid schema, blocked pages and snippets that are too long.",
    choose: ["Preview metadata before publishing a page.", "Use schema and robots helpers when you need valid machine-readable output.", "Use UTM and slug tools to keep campaigns and URLs consistent."]
  },
  accessibility: {
    focus: "Accessibility checks catch issues that are easy to miss visually: weak contrast, tiny tap targets, skipped headings, missing captions and unhelpful alt text.",
    choose: ["Check contrast before committing a palette.", "Audit headings and tap targets before publishing a page.", "Validate captions and alt text when media or images carry import…49416 tokens truncated… team", `data-contact-subject="Other"`, "button")}
      ${method("message", "Contact Form", "We'll get back to you soon.", "Fill out the form", `data-contact-focus`, "button")}
    </aside>

    <section class="cs-form-card" id="contact-form-panel" aria-labelledby="contact-form-title">
      <div class="cs-form-head">
        <div>
          <span class="eyebrow">${icon("message")} Send us a message</span>
          <h2 id="contact-form-title">Let's talk!</h2>
          <p>Fill out the form below and we'll get back to you as soon as possible.</p>
        </div>
        <p class="cs-form-note" aria-hidden="true">Your feedback helps us build a better Vootkit.</p>
      </div>
      <p class="cs-regarding" data-contact-regarding hidden></p>
      <form id="contact-form" class="cs-contact-form" name="contact" method="POST" action="/contact-success/" data-netlify="true" netlify-honeypot="bot-field" novalidate>
        <input type="hidden" name="form-name" value="contact">
        <input type="hidden" name="tool" id="cf-tool">
        <p class="cf-hp" hidden><label>Leave this empty <input name="bot-field" autocomplete="off"></label></p>
        <div class="cs-form-grid">
          <div class="cs-field">
            <label for="cf-name">Full Name <span aria-hidden="true">*</span></label>
            <div class="cs-input-wrap">${icon("users")}<input class="field" id="cf-name" type="text" name="name" autocomplete="name" required placeholder="e.g. John Prosper" aria-describedby="cf-name-error"></div>
            <p class="cf-error" id="cf-name-error" data-error-for="name"></p>
          </div>
          <div class="cs-field">
            <label for="cf-email">Email Address <span aria-hidden="true">*</span></label>
            <div class="cs-input-wrap">${icon("mail")}<input class="field" id="cf-email" type="email" name="email" autocomplete="email" inputmode="email" required placeholder="you@example.com" aria-describedby="cf-email-error"></div>
            <p class="cf-error" id="cf-email-error" data-error-for="email"></p>
          </div>
        </div>
        <div class="cs-field">
          <label for="cf-subject">Subject <span aria-hidden="true">*</span></label>
          <div class="cs-input-wrap">${icon("tag")}<select class="field" id="cf-subject" name="subject" required aria-describedby="cf-subject-error">
            <option value="">Select a topic</option>
            ${["General Question","Tool Problem","Account & Billing","Bug Report","Feature Request","Workflow","Templates","Partnership / Business","Privacy / Security","Other"].map(option).join("")}
          </select></div>
          <p class="cf-error" id="cf-subject-error" data-error-for="subject"></p>
        </div>
        <div class="cs-field">
          <div class="cs-label-row"><label for="cf-message">Message <span aria-hidden="true">*</span></label><span id="cf-count">0 / 1000</span></div>
          <div class="cs-input-wrap cs-textarea-wrap">${icon("message")}<textarea class="field" id="cf-message" name="message" rows="7" maxlength="1000" required placeholder="Tell us what's on your mind..." aria-describedby="cf-message-error cf-count"></textarea></div>
          <p class="cf-error" id="cf-message-error" data-error-for="message"></p>
        </div>
        <div class="cs-form-actions">
          <button class="btn btn-primary cs-send" type="submit" id="cf-submit">${icon("plane")} <span>Send Message</span> ${icon("arrow-right")}</button>
          <p class="cf-status" id="cf-status" role="status" aria-live="polite"></p>
        </div>
      </form>
      <div class="cs-success" id="cf-success" hidden role="status" aria-live="polite">
        <span aria-hidden="true">${icon("check")}</span>
        <h2>Message sent!</h2>
        <p>Thanks for contacting Vootkit. We've received your message.</p>
        <div><a class="btn btn-primary" href="./">Back to Vootkit</a><button class="btn" type="button" id="cf-reset">Send another message</button></div>
      </div>
    </section>

    <aside class="cs-side" aria-label="Support information">
      <section class="cs-agent-card">
        <picture>
          <source srcset="public/images/contact/contact-support-agent.avif" type="image/avif">
          <img src="public/images/contact/contact-support-agent.webp" width="800" height="500" alt="Smiling support professional on a phone call while using a laptop." loading="lazy" decoding="async">
        </picture>
        <div class="cs-agent-copy">
          <span class="eyebrow">Need help now?</span>
          <h2>We're here for you!</h2>
          <p>Our support team reviews Vootkit questions and replies by email.</p>
        </div>
        <dl class="cs-support-facts">
          <div><dt>${icon("mail")} Support email</dt><dd><a class="contact-email" href="mailto:${esc(SUPPORT)}">${esc(SUPPORT)}</a></dd></div>
          <div><dt>${icon("clock")} Typical response</dt><dd>We reply by email as soon as we can.</dd></div>
          <div><dt>${icon("globe")} Language</dt><dd>English support.</dd></div>
        </dl>
      </section>
      <section class="cs-quick">
        <div class="cs-side-head"><h2>Quick Links</h2><a href="tools/">View all ${icon("arrow-right")}</a></div>
        <div class="cs-quick-grid">
          ${quick("sliders", "Troubleshooting", "Fix common issues.", "Tool Problem")}
          ${quick("users", "Account & Billing", "Manage account or subscription.", "Account & Billing")}
          ${quick("sparkles", "Feature Requests", "Suggest improvements/new tools.", "Feature Request")}
          ${quick("bug", "Report a Bug", "Help us improve.", "Bug Report")}
        </div>
      </section>
      <section class="cs-help-card">
        <span aria-hidden="true">${icon("heart")}</span>
        <h2>Still need help?</h2>
        <p>Browse practical Vootkit guides, then send us the details if you still need a hand.</p>
        <div><a class="btn btn-sm" href="blog/">Browse guides</a><button class="btn btn-sm btn-primary" type="button" data-contact-focus>Use the form</button></div>
      </section>
    </aside>
  </section>
</div>` + foot(0, ["assets/js/contact.js"]);
}

write("contact.html", contactPage());

/* ---------- /workflows/ ----------
 *
 * THE PAGE IS WRITTEN IN HTML, NOT PAINTED BY JAVASCRIPT.
 *
 * The editor is a Pro feature that mounts client-side, which meant a crawler —
 * and a signed-out visitor with a slow connection — saw one empty <div>. On a
 * site that has already been rejected once for thin content, shipping a route
 * whose entire body is built by a script is the exact mistake again.
 *
 * So everything below is server-rendered: what a workflow is, the real chains
 * with every step linked to its own tool page, how it runs, and what it will
 * not do. The editor mounts into #wf underneath it. Turn JavaScript off and
 * the page still explains itself and still passes traffic to 20-odd tools.
 *
 * The chains come from workflow.js's own TEMPLATES, filtered through the flow
 * map, so the page cannot describe a workflow the product does not offer.
 */
function workflowCopy() {
  const g = global;
  const hadWindow = "window" in g;
  if (!hadWindow) g.window = g;
  let W;
  try { delete require.cache[require.resolve("./assets/js/workflow.js")]; W = require("./assets/js/workflow.js"); }
  catch (e) { throw new Error("workflows page: cannot load workflow.js - " + e.message); }
  if (!hadWindow) delete g.window;

  const FLOW = require("./data/tool-flow.js");
  const live = W.templatesFor(FLOW);
  if (live.length < 5) throw new Error("workflows page: only " + live.length + " runnable templates");
  const assetManifestPath = path.join(ROOT, "public", "images", "workflows", "workflow-template-assets.json");
  const assetManifest = fs.existsSync(assetManifestPath)
    ? JSON.parse(fs.readFileSync(assetManifestPath, "utf8"))
    : [];
  const assetById = new Map(assetManifest.map((a) => [a.templateId, a]));
  const preferred = [
    "website-image-optimizer", "pdf-document-workflow", "invoice-pdf-packet", "video-social-workflow",
    "social-image-pack", "pdf-watermark-delivery", "video-compress-export", "scan-pack-builder",
    "proposal-delivery-pack", "web-thumbnail-set", "study-handout-pack"
  ];
  const byId = new Map(live.map((t) => [t.id, t]));
  const ordered = preferred.map((id) => byId.get(id)).filter(Boolean)
    .concat(live.filter((t) => !preferred.includes(t.id)));
  const allKinds = Array.from(new Set(ordered.map((t) => t.category || t.kind))).filter(Boolean);
  const kindLabel = (x) => ({ pdf: "PDF", image: "Image", video: "Video", audio: "Audio", images: "Image" }[String(x).toLowerCase()] || x);
  const icon = (id) => { const t = VK.find(id); return t ? toolIconHtml(t) : `<span class="ic"></span>`; };
  const toolName = (id) => (VK.find(id) || {}).name || (FLOW.names && FLOW.names[id]) || id;
  const chain = (t) => t.steps.map((id) => toolName(id)).join(" -> ");
  const cardSteps = (t) => t.steps.map((id, i) => `
      <span class="wf-card-node">${icon(id)}<small>${i + 1}</small></span>`).join(`<i class="wf-card-line" aria-hidden="true"></i>`);
  const coverAsset = (t) => {
    const key = t.asset || t.id || "website-image-optimizer";
    return assetById.get(t.id) || assetById.get(key) || {
      templateId: key,
      avifFile: `/public/images/workflows/templates/${key}.avif`,
      webpFile: `/public/images/workflows/templates/${key}.webp`,
      alt: `${t.name} workflow cover.`,
      focalPoint: "50% 50%",
      overlayVariant: "center"
    };
  };
  const imgRel = (file) => esc(String(file || "").replace(/^\/public\//, "../public/"));
  const cover = (t) => {
    const a = coverAsset(t);
    return `
      <picture class="wf-card-photo">
        <source srcset="${imgRel(a.avifFile)}" type="image/avif">
        <img src="${imgRel(a.webpFile)}" alt="${esc(a.alt || "")}" loading="lazy" decoding="async" style="object-position:${esc(a.focalPoint || "50% 50%")}">
      </picture>
      <div class="wf-card-overlay"></div>
      <span class="wf-cover-badge">${t.featured ? "Featured" : esc(kindLabel(t.category || t.kind))}</span>
      <div class="wf-card-flow" aria-hidden="true">${cardSteps(t)}</div>`;
  };
  const templateCards = ordered.map((t) => `
      <article class="wf-market-card wf-cover-${esc((coverAsset(t).overlayVariant || "center").toLowerCase())}" data-wf-market-card data-wf-template-card="${esc(t.id)}" data-category="${esc((t.category || t.kind).toLowerCase())}" data-plan="${esc((t.plan || "Pro").toLowerCase())}" data-featured="${t.featured ? "true" : "false"}" tabindex="0" role="button" aria-label="Open ${esc(t.name)} template preview">
        <div class="wf-market-cover">${cover(t)}</div>
        <div class="wf-market-body">
          <h3>${esc(t.name)}</h3>
          <p>${esc(t.why)}</p>
          <div class="wf-market-meta"><span>${t.steps.length} steps</span><span>${esc(t.input || kindLabel(t.kind))} -> ${esc(t.output || "Output")}</span><b>${esc(t.plan || "Pro")}</b></div>
        </div>
      </article>`).join("");
  const tabNames = ["All", "Featured"].concat(allKinds.map(kindLabel));
  const previewT = ordered[0] || live[0];
  const previewAsset = coverAsset(previewT);
  const inputIcon = `<span class="ic ic-tool" style="--ic-h:214;--ic-bg:#2974d6"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V5m0 0L8 9m4-4 4 4M5 14v5h14v-5"/></svg></span>`;
  const previewNodes = [{ html: inputIcon, name: "Upload Images", summary: "JPG, PNG, WebP" }]
    .concat(previewT.steps.map((id, i) => ({ html: icon(id), name: toolName(id), summary: (previewT.summaries && previewT.summaries[i]) || "Ready" })));
  const previewChain = previewNodes.map((n) => `
      <span class="wf-preview-node">${n.html}<strong>${esc(n.name)}</strong><small>${esc(n.summary)}</small></span>`).join(`<i aria-hidden="true">-></i>`);
  const groups = `
    <section class="wf-marketplace" id="wf-examples" aria-labelledby="wf-market-title">
      <div class="wf-market-shell">
        <div class="wf-market-heading">
          <p class="eyebrow">Templates</p>
          <h1 id="wf-market-title">Workflow Templates</h1>
          <p>Start with a proven workflow and save hours of manual work.</p>
        </div>
        <div class="wf-filterbar" aria-label="Workflow template filters">
          <input type="search" placeholder="Search workflow templates..." data-wf-template-search>
          <select data-wf-template-filter="category" aria-label="All Categories"><option value="all">All Categories</option>${allKinds.map((k) => `<option value="${esc(k.toLowerCase())}">${esc(kindLabel(k))}</option>`).join("")}</select>
          <select aria-label="All Inputs"><option>All Inputs</option><option>PDF</option><option>Images</option><option>Video</option></select>
          <select aria-label="All Outputs"><option>All Outputs</option><option>PDF</option><option>WebP</option><option>GIF</option></select>
          
        </div>
        <div class="wf-market-tabs" role="tablist" aria-label="Template categories">
          ${tabNames.map((x, i) => `<button type="button" class="${i === 0 ? "is-on" : ""}" data-wf-template-tab="${esc(x.toLowerCase())}">${esc(x)}</button>`).join("")}
        </div>
        <div class="wf-market-grid">${templateCards}</div>
      </div>
    </section>

    <section class="wf-template-preview" id="wf-template-preview" aria-labelledby="wf-preview-title">
      <div class="wf-preview-shell" data-wf-preview>
        <button class="wf-preview-close" type="button" data-wf-preview-close aria-label="Close template preview">&times;</button>
        <div class="wf-preview-main">
          <header>
            <h2 id="wf-preview-title">${esc(previewT.name)}</h2><span>${previewT.featured ? "Featured" : esc(previewT.plan || "Free")}</span>
            <p>${esc(previewT.about || previewT.why)}</p>
          </header>
          <div class="wf-preview-meta">
            <span>${previewT.steps.length} Steps</span><span>${esc(previewT.input || "Input files")}</span><span>${esc(previewT.output || "Output files")}</span><span>${esc(previewT.time || "A few minutes")}</span><span>${esc(previewT.privacy || "Browser-based")}</span>
          </div>
          <div class="wf-preview-chain">${previewChain}</div>
          <figure class="wf-before-after">
            <picture><source srcset="${imgRel(previewAsset.avifFile)}" type="image/avif"><img src="${imgRel(previewAsset.webpFile)}" alt="${esc(previewAsset.alt || `${previewT.name} workflow preview image.`)}" loading="lazy" decoding="async" style="object-position:${esc(previewAsset.focalPoint || "50% 50%")}"></picture>
            <figcaption><span>Before</span><span>After</span></figcaption>
          </figure>
        </div>
        <aside class="wf-preview-side">
          <h3>About this template</h3>
          <p>${esc(previewT.about || previewT.why)}</p>
          <h4>Input</h4><p>${esc(previewT.input || "Input files")}</p>
          <h4>Output</h4><p>${esc(previewT.output || "Output files")}</p>
          <h4>What it does</h4>
          <ul>${(previewT.what || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          <div class="wf-preview-actions"><a class="btn" href="#wf-builder" data-wf-template="${esc(previewT.id)}">Preview in Builder</a><a class="btn btn-primary" href="#wf-builder" data-wf-template="${esc(previewT.id)}">Use This Template</a></div>
        </aside>
      </div>
    </section>`;

  /* Mobile-first workflow home. The former marketplace/canvas presentation is
     intentionally not returned: this is the single visible workflow format. */
  const featured = byId.get("social-image-pack") || byId.get("website-image-optimizer") || ordered[0];
  const featuredSteps = featured.steps.map((id, i) => `
    <li>
      <span class="wf-ref-number">${i + 2}</span>${icon(id)}
      <span class="wf-ref-copy"><strong>${esc(toolName(id))}</strong><small>${esc((featured.summaries && featured.summaries[i]) || "Ready with recommended settings")}</small></span>
      <b>Ready</b><button type="button" aria-label="Configure ${esc(toolName(id))}" data-wf-template="${esc(featured.id)}">⌄</button>
    </li>`).join("");
  const popularRows = ordered.slice(0, 4).map((t) => `
    <button class="wf-ref-popular-row" type="button" data-wf-template="${esc(t.id)}">
      <span><strong>${esc(t.name)}</strong><small>${t.steps.length} steps</small></span>
      <span class="wf-ref-mini-chain" aria-hidden="true">${t.steps.slice(0, 5).map((id) => icon(id)).join("<i>→</i>")}</span>
      <em>◷ ${esc(t.time || (10 + t.steps.length * 2) + " min")}<small>saved</small></em><b>›</b>
    </button>`).join("");
  const newGroups = `
    <section class="wf-ref-home wrap" id="wf-examples" aria-labelledby="wf-ref-title">
      <header class="wf-ref-hero">
        <h1 id="wf-ref-title">Turn several tasks into<br><span>one simple flow.</span></h1>
        <p>Connect Vootkit tools, save the workflow and run it again whenever you need.</p>
        <div><a class="btn btn-primary" href="#wf-builder">Create a workflow</a><a class="btn" href="#wf-popular">Browse templates</a></div>
      </header>

      <article class="wf-ref-featured">
        <header><div><h2>${esc(featured.name)}</h2><p>${esc(featured.why)}</p></div><span>● All steps ready</span></header>
        <ol>
          <li><span class="wf-ref-number">1</span>${inputIcon}<span class="wf-ref-copy"><strong>Upload files</strong><small>${esc(featured.input || "From your device")}</small></span><b>Ready</b><button type="button" aria-label="Choose input files" data-wf-template="${esc(featured.id)}">⌄</button></li>
          ${featuredSteps}
          <li><span class="wf-ref-number">${featured.steps.length + 2}</span><span class="ic ic-tool wf-ref-download" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 19h14"/></svg></span><span class="wf-ref-copy"><strong>Download results</strong><small>${esc(featured.output || "Finished files")}</small></span><b>Ready</b><button type="button" aria-label="Configure download" data-wf-template="${esc(featured.id)}">⌄</button></li>
        </ol>
        <footer><span>⬟ Runs privately on your device</span><a class="btn btn-primary" href="#wf-builder" data-wf-template="${esc(featured.id)}">Use workflow</a></footer>
      </article>

      <section class="wf-ref-popular" id="wf-popular" aria-labelledby="wf-popular-title">
        <header><h2 id="wf-popular-title">Popular workflows</h2><a href="#wf-builder">See all</a></header>
        <div>${popularRows}</div>
      </section>

      <section class="wf-ref-how" aria-labelledby="wf-how-title">
        <h2 id="wf-how-title">How it works</h2>
        <ol><li><b>1</b><span><strong>Choose tools</strong><small>Pick the tools you want to use in your workflow.</small></span><i><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg></i></li><li><b>2</b><span><strong>Set each step</strong><small>Configure how each tool should work.</small></span><i><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg></i></li><li><b>3</b><span><strong>Run everything together</strong><small>Run all steps in order with one click.</small></span><i><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg></i></li></ol>
      </section>

      <section class="wf-ref-yours" aria-labelledby="wf-yours-title"><h2 id="wf-yours-title">Your workflows</h2><div><span class="wf-ref-folder"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h7l2 3h9v10H3z"/></svg></span><p><strong>Sign in to save and reuse your workflows</strong></p><a class="btn btn-primary" href="../auth/sign-in/">Sign in</a></div><div><p><strong>Build your first workflow<br>in minutes</strong></p><a class="btn btn-primary" href="#wf-builder">Start building</a></div></section>
    </section>`;

  const FAQ = [
    ["Do my files get uploaded when I run a workflow?", "No. Every workflow-compatible step runs in your browser on your own machine, including the handover between steps."],
    ["How is this different from using the tools one at a time?", "A workflow is one file selection and one run through a reusable chain, instead of opening several pages manually."],
    ["Which tools can be workflow steps?", `${Object.keys(FLOW.flow).filter((id) => FLOW.flow[id].w).length} tools today - the runnable PDF, image, audio and video sets.`]
  ];
  const faqHtml = FAQ.map(([q, a]) => `<details class="wf-faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("");
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  const appLd = { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Vootkit Workflows", applicationCategory: "BusinessApplication", operatingSystem: "Any modern web browser", url: CFG.origin + "/workflows/", description: "Chain Vootkit tools into one browser-based run.", featureList: live.map((t) => t.name), offers: { "@type": "Offer", category: "Subscription" } };

  return { groups: newGroups, faqHtml, count: live.length,
    ld: `<script type="application/ld+json">${JSON.stringify(appLd)}</script>\n` + `<script type="application/ld+json">${JSON.stringify(faqLd)}</script>` };
}

function workflowPage() {
  const C = workflowCopy();
  const F = require("./data/tool-flow.js");
  const workflowIds = Object.keys(F.flow).filter((id) => F.flow[id].w);
  const steppable = workflowIds.length;
  const toolGlyph = (id) => {
    const t = VK.find(id);
    return t ? toolIconHtml(t) : `<span class="ic"></span>`;
  };
  return head({
    title: "Workflow - build reusable tool chains | Vootkit",
    desc: "Build browser-based Vootkit workflows with a tool library, canvas, step inspector and reusable template marketplace.",
    url: CFG.origin + "/workflows/",
    depth: 1,
    active: "workflow",
    bodyClass: "wf-page"
  }) + C.ld + `
  ${C.groups}

  <section class="wrap wf-builder-intro" aria-labelledby="wf-builder-title">
    <div>
      <p class="eyebrow">Workflow Builder</p>
      <h2 id="wf-builder-title">Build and customize your workflow</h2>
      <p>Drag tools onto the canvas, adjust each step, and run a real browser-based chain.</p>
    </div>
  </section>

  <section class="wf-builder-shell" id="wf-builder" aria-label="Workflow builder application">
    <div class="wf-builder-wrap">
      <div id="wf" class="wf-mount"></div>
    </div>
  </section>

  <section class="wrap section prose wf-prose" aria-labelledby="wf-questions">
    <h2 id="wf-questions">How Vootkit Workflow Works</h2>
    <p>A workflow is a reusable path through several compatible Vootkit tools. The builder uses the same processing functions as the individual tool pages, so if a tool cannot be called by the workflow engine yet, it is not offered as a step.</p>
    <p>${steppable} tools can currently be workflow steps. Every chain is checked before it runs, and your files stay in your browser while one step hands its output to the next. That means you can prepare a whole batch without repeatedly downloading a file, opening another page, and choosing the same file again.</p>
    <h2>Workflow-ready tools</h2>
    <p>The current workflow engine focuses on file-processing tools with callable browser engines. These include image tools such as <a href="../tools/images/resize-image/">Image Resizer</a>, <a href="../tools/images/compress-image/">Image Compressor</a>, <a href="../tools/images/convert-image/">Image Converter</a>, <a href="../tools/images/crop-image/">Crop Image</a>, <a href="../tools/images/jpg-to-webp/">JPG to WebP</a> and <a href="../tools/images/png-to-webp/">PNG to WebP</a>. The website image optimizer template uses that exact family of tools so the canvas is not a fake demo: resize, compress and convert all stay editable after the template loads.</p>
    <p>PDF workflows can combine real PDF tools including <a href="../tools/pdf/merge-pdf/">Merge PDFs</a>, <a href="../tools/pdf/compress-pdf/">Compress PDF</a>, <a href="../tools/pdf/split-pdf/">Split PDF</a>, <a href="../tools/pdf/rotate-pdf/">Rotate PDF</a>, <a href="../tools/pdf/pdf-watermark/">PDF Watermark</a>, <a href="../tools/pdf/protect-pdf/">Protect PDF</a>, <a href="../tools/pdf/extract-pdf-pages/">Extract PDF Pages</a>, <a href="../tools/pdf/pdf-page-numbers/">Add Page Numbers</a>, <a href="../tools/pdf/jpg-to-pdf/">Images to PDF</a>, <a href="../tools/pdf/png-to-pdf/">PNG to PDF</a> and <a href="../tools/pdf/webp-to-pdf/">WebP to PDF</a>. If a requested document conversion is not workflow-ready yet, it is kept out of the builder instead of being shown and failing later.</p>
    <p>Video workflows use the same in-browser media engine as the individual pages, with steps such as <a href="../tools/video/trim-video/">Video Trimmer</a>, <a href="../tools/video/compress-video/">Video Compressor</a>, <a href="../tools/video/video-to-gif/">Video to GIF</a>, <a href="../tools/video/resize-video/">Video Resizer</a>, <a href="../tools/video/mute-video/">Mute Video</a>, <a href="../tools/video/extract-audio/">Extract Audio</a>, <a href="../tools/video/convert-video/">Video Converter</a> and <a href="../tools/video/frame-grabber/">Frame Grabber</a>. The first video run may load the video engine, then processing happens locally in the browser.</p>
    <h2>Why templates matter</h2>
    <p>The template marketplace is there for people who know the result they want but do not want to design a chain from zero. A template clones a real definition into the builder, preserves its starting settings, and leaves every node editable. You can open Website Image Optimizer, inspect the resize/compress/convert chain, adjust the compression level, add another image step, remove a step, save the workflow locally, then run it on your own files.</p>
    <p>The preview panel shows what the template is meant to do before you use it: accepted inputs, output format, privacy status and a simple before/after visual. It does not run anything by itself and it does not imply the stock-photo subjects or image sources are Vootkit customers. The photographs are local template artwork, while the workflow itself still depends on the real tool definitions available in the registry.</p>
    <h2>Running safely</h2>
    <p>Before a workflow runs, Vootkit checks the chain from input to output. A PDF step cannot receive an image unless a compatible conversion step appears before it. A video step cannot receive a PDF. If the chain is incompatible, the builder marks the step and, where possible, suggests a real bridge tool. During a run, each node reports its own status. If one step fails, the run stops at that step, keeps the last successful output when possible, and tells you what happened in the tool's own words.</p>
    ${C.faqHtml}
  </section>

  <script>
  var wfTemplateState = { q: '', category: 'all', plan: 'all', tab: 'all' };
  function wfApplyTemplateFilters() {
    document.querySelectorAll('[data-wf-market-card]').forEach(function (card) {
      var text = card.textContent.toLowerCase();
      var cat = card.getAttribute('data-category');
      var plan = card.getAttribute('data-plan');
      var featured = card.getAttribute('data-featured') === 'true';
      var tab = wfTemplateState.tab;
      var ok = true;
      if (wfTemplateState.q && !text.includes(wfTemplateState.q)) ok = false;
      if (wfTemplateState.category !== 'all' && cat !== wfTemplateState.category) ok = false;
      if (wfTemplateState.plan !== 'all' && plan !== wfTemplateState.plan) ok = false;
      if (tab === 'featured' && !featured) ok = false;
      else if (tab !== 'all' && tab !== 'featured' && cat !== tab) ok = false;
      card.hidden = !ok;
    });
  }
  document.addEventListener('click', function (e) {
    var card = e.target.closest && e.target.closest('[data-wf-template-card]');
    if (card) {
      e.preventDefault();
      var preview = document.querySelector('[data-wf-preview]');
      if (preview) preview.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    var close = e.target.closest && e.target.closest('[data-wf-preview-close]');
    if (close) {
      var market = document.getElementById('wf-examples');
      if (market) market.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    var b = e.target.closest && e.target.closest('[data-wf-template]');
    if (b) {
      e.preventDefault();
      var id = b.getAttribute('data-wf-template');
      var tries = 0;
      function load() {
        if (window.VKWorkflow && window.VKWorkflow.useTemplate) {
          window.VKWorkflow.useTemplate(id);
          var mounted = document.getElementById('wf');
          if (mounted) mounted.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        if (++tries < 50) setTimeout(load, 80);
      }
      load();
      var builder = document.getElementById('wf-builder');
      if (builder) builder.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    var tab = e.target.closest && e.target.closest('[data-wf-template-tab]');
    if (tab) {
      e.preventDefault();
      wfTemplateState.tab = tab.getAttribute('data-wf-template-tab');
      document.querySelectorAll('[data-wf-template-tab]').forEach(function (x) { x.classList.toggle('is-on', x === tab); });
      wfApplyTemplateFilters();
    }
  });
  document.addEventListener('input', function (e) {
    if (!e.target.matches('[data-wf-template-search]')) return;
    wfTemplateState.q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('[data-wf-template-search]').forEach(function (x) { if (x !== e.target) x.value = e.target.value; });
    wfApplyTemplateFilters();
  });
  document.addEventListener('change', function (e) {
    if (!e.target.matches('[data-wf-template-filter]')) return;
    var type = e.target.getAttribute('data-wf-template-filter'), val = e.target.value;
    wfTemplateState[type] = val;
    wfApplyTemplateFilters();
  });
  </script>
` + foot(1, [
    "data/tool-flow.js", "assets/js/tools-pdf.js", "assets/js/tools-image.js",
    "assets/js/tools-image2.js", "assets/js/tools-videofx.js",
    "assets/js/videoengine.js", "assets/js/workflow.js", "assets/js/wf-init.js"
  ]);
}

write("workflows/index.html", workflowPage());

write("contact-success/index.html", infoPage({
  depth: 1, slug: "contact-success/", title: "Message sent", eyebrow: "Contact & Support", noindex: true,
  h1: "Thanks — your message is on its way.",
  desc: "Your message to Vootkit support was sent successfully.",
  lede: "We've received your message and will reply by email within a couple of business days.",
  body: `
  <div class="cta-band" style="margin-top:var(--s-6);padding:var(--s-6);border:1px solid var(--line);border-radius:var(--r-lg);text-align:center">
    <h2 style="margin:0 0 var(--s-2)">In the meantime…</h2>
    <p class="page-lede" style="margin:0 auto var(--s-4)">Explore the tools while you wait for our reply.</p>
    <a class="btn btn-primary" href="../tools/">Browse all tools</a>
  </div>`
}));

/* Unsubscribe. Reached only from a link in an email, so it is noindex — and it
 * carries no newsletter form, for the obvious reason. The work happens in
 * newsletter.js against a SECURITY DEFINER function keyed on the token; this
 * page is just the surface that reports the outcome. */
write("unsubscribe/index.html", infoPage({
  depth: 1, slug: "unsubscribe/", title: "Unsubscribe", eyebrow: "Email", noindex: true, noNewsletter: true,
  h1: "Unsubscribing you now\u2026",
  desc: "Remove your email address from the Vootkit mailing list.",
  lede: "One click and this takes a second.",
  body: `
  <p data-unsubscribe class="nl-status" role="status" aria-live="polite">Working\u2026</p>
  <p class="note" style="margin-top:var(--s-4)">If this page does not confirm within a few seconds, the link may have been
  broken by your email client. Reply to any email from us and we will remove you by hand.</p>
  <div class="cta-band" style="margin-top:var(--s-6);padding:var(--s-6);border:1px solid var(--line);border-radius:var(--r-lg);text-align:center">
    <h2 style="margin:0 0 var(--s-2)">The tools stay free either way</h2>
    <p class="page-lede" style="margin:0 auto var(--s-4)">Your email preferences are separate from the tools, and the tools stay available either way.</p>
    <a class="btn btn-primary" href="../tools/">Browse all tools</a>
  </div>`
}));

const POSTS = loadPosts();
const BLOG_USED_CATEGORIES = BLOG_CATEGORY_ORDER.filter((slug) => slug !== "all" && POSTS.some((p) => p.filters.indexOf(slug) !== -1));
POSTS.forEach((p) => write(`blog/${p.slug}/index.html`, blogPostPage(p, POSTS)));
write("blog/index.html", blogIndexPage(POSTS));
BLOG_USED_CATEGORIES.forEach((slug) => write(`blog/${slug}/index.html`, blogIndexPage(POSTS.filter((p) => p.filters.indexOf(slug) !== -1), { category: slug, allPosts: POSTS })));
write("admin-console/index.html", adminConsolePage(POSTS));

/* ---------- run ---------- */
let pages = 2;
write("components/index.html", componentsPage()); pages++;
write("tools/index.html", allToolsPage()); pages++;
VK.CATEGORIES.forEach((c) => { write(`tools/${c.slug}/index.html`, categoryPage(c)); pages++; });
iconAudit();
VK.TOOLS.forEach((t) => { write(`tools/${t.cat}/${t.id}/index.html`, toolPage(t)); pages++; });

/* localised tool pages — only where the tool is fully translated (chrome + name/desc) */
let localizedPages = 0;
I18N.LOCALES.forEach((loc) => {
  if (!I18N.chrome[loc.code] || !I18N.tools[loc.code]) return;
  VK.TOOLS.forEach((t) => {
    if (t.status !== "live" || !I18N.tools[loc.code][t.id]) return;
    write(`${loc.code}/tools/${t.cat}/${t.id}/index.html`, localizedToolPage(t, CATBY[t.cat], loc));
    pages++; localizedPages++;
  });
});
console.log(`generated ${pages} pages (${localizedPages} localised)`);

/* sitemap
 *
 * ENGLISH ONLY, DELIBERATELY.
 *
 * The sitemap used to carry all 1,484 URLs, of which 1,192 were the nine
 * localised copies of each tool. Search Console on 1 Aug 2026, before this
 * changed: 10 pages indexed, 65 not indexed, 54 of those "Crawled — currently
 * not indexed", average position 84.8, two clicks in three months.
 *
 * A sitemap is a request for crawl attention, and on a domain with no authority
 * that attention is scarce. Spending it on nine near-duplicate translations of
 * every page — before a single English page ranks — competes with the pages
 * that actually have a chance, and "crawled, currently not indexed" is exactly
 * the signal that Google has looked at thin pages and declined.
 *
 * The localised pages REMAIN LIVE and keep their hreflang and canonical tags,
 * so Google can still reach and cluster them through the alternates on every
 * English page. This only changes what we actively ask it to prioritise.
 * Revisit once English pages hold real positions. */
const enUrls = ["/", "/tools/", "/workflows/", "/templates/", "/pricing.html", "/about.html", "/founder-story.html", "/contact.html", "/help/", "/legal/", "/privacy.html", "/terms.html", "/cookies.html", "/disclaimer.html", "/security.html"]
  .concat(POSTS.length ? ["/blog/"] : [])                       // only list blog when it has posts
  .concat(BLOG_USED_CATEGORIES.map((slug) => `/blog/${slug}/`))
  .concat(POSTS.map((p) => `/blog/${p.slug}/`))
  .concat(VK.CATEGORIES.map((c) => `/tools/${c.slug}/`))
  .concat(VK.TOOLS.filter((t) => t.status === "live").map((t) => `/tools/${t.cat}/${t.id}/`));  // exclude noindexed under-construction tools

const localisedCount = [].concat.apply([], I18N.LOCALES.map((loc) => (I18N.chrome[loc.code] && I18N.tools[loc.code])
  ? VK.TOOLS.filter((t) => t.status === "live" && I18N.tools[loc.code][t.id])
  : [])).length;

/* lastmod helps Google decide what to recrawl. Build date is honest at this
   granularity — every page is regenerated on every deploy. */
const BUILD_DAY = new Date().toISOString().slice(0, 10);

/* SPLIT INTO A SITEMAP INDEX — for diagnosis, not for ranking.
 *
 * Splitting a sitemap does not make Google index more; the 50,000-URL limit is
 * nowhere near. What it buys is VISIBILITY: Search Console reports indexed
 * counts per child sitemap, so "are the tool pages getting indexed, or only the
 * blog?" becomes a number you can read instead of a guess. With 10 pages
 * indexed out of 292 that question is the whole game. */
const SECTIONS = {
  "sitemap-core.xml": enUrls.filter((u) => !u.startsWith("/tools/") && !u.startsWith("/blog/")),
  "sitemap-tools.xml": enUrls.filter((u) => u.startsWith("/tools/")),
  "sitemap-blog.xml": enUrls.filter((u) => u.startsWith("/blog/"))
};

function urlset(list) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${list.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${BUILD_DAY}</lastmod><changefreq>${u === "/" ? "weekly" : "monthly"}</changefreq></url>`).join("\n")}
</urlset>
`;
}

const written = [];
Object.keys(SECTIONS).forEach((name) => {
  if (!SECTIONS[name].length) return;          // never emit an empty sitemap
  fs.writeFileSync(path.join(ROOT, name), urlset(SECTIONS[name]));
  written.push({ name, n: SECTIONS[name].length });
});

/* The index keeps the filename Google already has on file, so the submission
   made on 1 Aug 2026 continues to resolve. */
fs.writeFileSync(path.join(ROOT, "sitemap.xml"),
`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${written.map((s) => `  <sitemap><loc>${SITE}/${s.name}</loc><lastmod>${BUILD_DAY}</lastmod></sitemap>`).join("\n")}
</sitemapindex>
`);
console.log(`sitemap index: ${written.map((s) => s.name + " (" + s.n + ")").join(", ")}` +
  ` — ${enUrls.length} English urls; ${localisedCount} localised pages live but not listed`);

/* ---------- sitemap-retire.xml — the deindex accelerator ----------
 *
 * WHAT THIS IS FOR, AND WHY IT LOOKS BACKWARDS.
 *
 * The 1,192 localised pages carry <meta robots="noindex">, but that tag does
 * nothing until Googlebot fetches the page again. Those URLs are in no
 * sitemap and nothing links to them any more, so Google has no reason to
 * revisit — a noindex on an unlinked page can sit unread for months, and the
 * AdSense review is judged on what is IN the index, not on what the site now
 * says.
 *
 * So this file lists exactly the pages we want REMOVED. Submitting a sitemap
 * of URLs you want dropped is counter-intuitive and it is the standard way to
 * do it: a sitemap is a request to CRAWL, not a demand to index. Google
 * fetches each one, finds the noindex, and drops it. Weeks instead of months.
 *
 * IT IS DELIBERATELY NOT IN sitemap.xml. The index at sitemap.xml is the
 * site's real map and must keep meaning "these are the pages that matter".
 * This one is submitted by hand in Search Console, used until the indexed
 * count falls, and then removed. It is a tool, not part of the site.
 *
 * THE GUARD IS THE IMPORTANT PART. If a single URL in here did NOT carry
 * noindex, this file would be doing the exact opposite of its job — actively
 * asking Google to index a duplicate page, 1,192 times over, on a site that
 * has already been rejected once for duplication. So every page is read back
 * off disk and checked, and the build FAILS rather than emit a file that
 * would make things worse.
 */
{
  const retire = [];
  const missing = [];
  I18N.LOCALES.forEach((loc) => {
    VK.TOOLS.forEach((t) => {
      const rel = `${loc.code}/tools/${t.cat}/${t.id}/index.html`;
      const abs = path.join(ROOT, rel);
      if (!fs.existsSync(abs)) return;
      const html = fs.readFileSync(abs, "utf8");
      if (!/<meta name="robots" content="noindex/.test(html)) { missing.push(rel); return; }
      retire.push(`/${loc.code}/tools/${t.cat}/${t.id}/`);
    });
  });

  if (missing.length) {
    throw new Error(
      "sitemap-retire: " + missing.length + " localised pages do not carry noindex — "
      + "listing them would ASK Google to index duplicates. First offender: " + missing[0]);
  }

  if (retire.length) {
    fs.writeFileSync(path.join(ROOT, "sitemap-retire.xml"), urlset(retire));
    console.log(`sitemap-retire.xml: ${retire.length} noindexed pages listed for recrawl `
      + `(submit by hand in Search Console, remove once the indexed count falls)`);
  }
}

/* robots */
fs.writeFileSync(path.join(ROOT, "robots.txt"),
`User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);

/* 301s from the old live-site URLs so nothing indexed is orphaned */
const OLD_TO_NEW = {
  "img-resize":"resize-image","img-compress":"compress-image","img-convert":"convert-image",
  "pdf-merge":"merge-pdf","pdf-split":"split-pdf","pdf-rotate":"rotate-pdf","img-to-pdf":"jpg-to-pdf",
  "pdf-to-img":"pdf-to-jpg","pdf-text":"pdf-to-text","video-trim":"trim-video",
  "fin-loan":"loan-calculator","fin-compound":"compound-interest","fin-currency":"currency-converter","fin-tip":"tip-split",
  "sci-units":"unit-converter","util-words":"word-counter","util-case":"case-converter","util-pass":"password-generator",
  "util-qr":"qr-generator","util-json":"json-formatter","qr-scan":"qr-scanner","barcode":"barcode-generator",
  "color-convert":"color-converter","gradient":"gradient-generator","palette":"palette-generator","shadow":"shadow-generator",
  "contrast":"contrast-checker","img-colors":"color-from-image","urlcode":"url-encoder","jwt":"jwt-decoder",
  "uuid":"uuid-generator","hash":"hash-generator","epoch":"timestamp-converter","regex":"regex-tester",
  "lorem":"lorem-ipsum","textdiff":"text-diff","lines":"line-tools","readability":"readability",
  "percent":"percentage-calculator","tax":"vat-gst","salary":"salary-converter","savings-goal":"savings-goal",
  "age":"age-calculator","timer":"pomodoro","tz":"timezone-converter","countdown":"countdown","picker":"random-picker",
  "pw-strength":"password-strength","invoice":"invoice-generator","markdown":"markdown-editor",
  "csv-view":"csv-viewer","csv-chart":"csv-to-chart","json-csv":"json-csv","exif":"exif-viewer",
  "meme":"meme-generator","watermark":"image-watermark","encrypt":"text-encrypt","file-hash":"file-checksum",
  "ai-ocr":"image-to-text","base64":"base64"
};
const OLD_CAT = { "utilities":"everyday","time":"everyday","fun":"everyday",
  "science":"everyday","health":"everyday","weather-and-travel":"everyday","downloads":"privacy","media":"everyday" };

/* Directory URLs are canonical. /x/index.html serves 200 un-redirected, which
   duplicates every one of the 261 tool pages at a second URL. The canonical tag
   already points at the directory form — this stops the duplicate existing at
   all. `301!` forces the rule even though the file is present. */
/* Tools that changed slug after they were already indexed. Keep these forever:
   a 301 is how the old URL's ranking signals reach the new one, and dropping
   the rule later would strand any external link still pointing at the old
   address. The localised rule uses a Netlify path placeholder so one line
   covers all nine language prefixes. */
let staleRemoved = 0;
const RENAMED = [
  // "Compress for Discord" -> "Video Compressor", Aug 2026. The old slug named
  // one chat app in a tool people mostly reach for to email a clip or clear a
  // forum limit, and it competed for the wrong query.
  ["video", "compress-for-discord", "compress-video"]
];
const CATEGORY_MOVES = [
  ["finance", "realestate", "mortgage-calculator"],
  ["finance", "realestate", "refinance-calculator"],
  ["finance", "everyday", "percentage-calculator"],
  ["finance", "everyday", "tip-split"],
  ["finance", "everyday", "discount-calculator"],
  ["everyday", "health", "bmi-calculator"]
];

const lines = ["# 301s from the previous URL scheme — keep indexed pages alive", "",
  "# Removed unfinished AI pages now lead to the working tool directory.",
  "/tools/ai/*   /tools/   301!", "/tools/ai/   /tools/   301!",
  "/:lang/tools/ai/*   /:lang/tools/   301!", "/:lang/tools/ai/   /:lang/tools/   301!", "",
  "# Directory URLs are canonical: /x/index.html duplicates /x/ on every page.",
  "/*/index.html   /:splat/   301!", ""];
RENAMED.forEach(([cat, oldId, newId]) => {
  lines.push(`# renamed tool: ${oldId} -> ${newId}`);
  lines.push(`/tools/${cat}/${oldId}/   /tools/${cat}/${newId}/   301`);
  lines.push(`/:lang/tools/${cat}/${oldId}/   /:lang/tools/${cat}/${newId}/   301`);
  lines.push("");
  /* THE REDIRECT ONLY WORKS IF THE OLD PAGE IS GONE.
     Netlify serves an existing file in preference to a 301 rule, so leaving the
     previously-generated directory in place would keep the old URL alive at 200
     — the redirect would never fire and the two pages would compete as
     duplicates. Build output is committed, so these have to be removed here
     rather than relying on a clean checkout. */
  [`tools/${cat}/${oldId}`].concat(
    I18N.LOCALES.map((loc) => `${loc.code}/tools/${cat}/${oldId}`)
  ).forEach((dir) => {
    const p = path.join(ROOT, dir);
    if (fs.existsSync(p)) { fs.rmSync(p, { recursive: true, force: true }); staleRemoved++; }
  });
});
CATEGORY_MOVES.forEach(([oldCat, newCat, id]) => {
  lines.push(`# corrected category: ${id}`);
  lines.push(`/tools/${oldCat}/${id}/   /tools/${newCat}/${id}/   301`);
  lines.push(`/:lang/tools/${oldCat}/${id}/   /:lang/tools/${newCat}/${id}/   301`);
  lines.push("");
  [`tools/${oldCat}/${id}`].concat(I18N.LOCALES.map((loc) => `${loc.code}/tools/${oldCat}/${id}`)).forEach((dir) => {
    const p = path.join(ROOT, dir);
    if (fs.existsSync(p)) { fs.rmSync(p, { recursive: true, force: true }); staleRemoved++; }
  });
});
if (staleRemoved) console.log(`removed ${staleRemoved} stale directories for renamed tools`);
Object.keys(OLD_TO_NEW).forEach((oldId) => {
  const t = VK.find(OLD_TO_NEW[oldId]);
  if (t) lines.push(`/t/${oldId}.html   /tools/${t.cat}/${t.id}/   301`);
});
VK.CATEGORIES.forEach((c) => lines.push(`/c/${c.slug}.html   /tools/${c.slug}/   301`));
Object.keys(OLD_CAT).forEach((oldSlug) => lines.push(`/c/${oldSlug}.html   /tools/${OLD_CAT[oldSlug]}/   301`));
lines.push("/tools.html   /tools/   301");
lines.push("/t/*   /tools/   301   # any tool page we didn't map individually");
lines.push("/c/*   /tools/   301");
fs.writeFileSync(path.join(ROOT, "_redirects"), lines.join("\n") + "\n");
console.log(`_redirects: ${lines.filter((l) => l.includes("301")).length} rules`);

/* Cross-origin isolation for the video-processing tools ONLY.
 * ffmpeg.wasm wants SharedArrayBuffer, which needs COOP + COEP. We scope these
 * headers to just these tool paths (they carry NO ads) and use COEP:credentialless
 * so Google Fonts and the ffmpeg CDN still load. Ad-bearing pages are untouched,
 * so AdSense is unaffected. */
const fxIds = Object.keys(VIDEOFX);
const hlines = [
  "# Global security headers (safe for ads — no COEP here).", "",
  "/*",
  "  X-Content-Type-Options: nosniff",
  "  Referrer-Policy: strict-origin-when-cross-origin",
  "  X-Frame-Options: SAMEORIGIN",
  /* HTML caching belongs on /* , NOT on /*.html — Netlify matches the REQUEST
     PATH, and every page here is a directory URL (/tools/pdf/compress-pdf/)
     with no ".html" in it. A /*.html rule silently never fires; verified live,
     pages were falling through to Netlify's default max-age=0. */
  "  Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=86400",
  "",
  /* Assets are cache-busted by ?v=<content hash> (see V, near the top), so a
     deploy changes the URL and browsers/CDNs fetch the new file automatically.
     The old header here was `max-age=0, must-revalidate`, added to stop a stale
     cache masking a deploy — but the hash already does that, and the header
     told Cloudflare not to cache CSS/JS at all. Measured result: a 7.05% cache
     hit rate over 7 days, i.e. essentially every visitor re-downloading every
     asset from origin. Immutable is correct for hashed URLs. */
  "# Hashed asset URLs (?v=<hash>) change on every deploy, so these are immutable.",
  "/assets/*",
  "  Cache-Control: public, max-age=31536000, immutable",
  "",
  "# Deploy artefacts that change every build.",
  "/sitemap.xml", "/sitemap-core.xml", "/sitemap-tools.xml", "/sitemap-blog.xml",
  "  Cache-Control: public, max-age=3600",
  "",
  "/ads.txt",
  "  Cache-Control: public, max-age=86400",
  "",
  "# Cross-origin isolation for in-browser video processing (scoped — no ad pages).", ""];
fxIds.forEach((id) => {
  const t = VK.find(id);
  if (!t) return;
  hlines.push(`/tools/${t.cat}/${id}/*`);
  hlines.push("  Cross-Origin-Opener-Policy: same-origin");
  hlines.push("  Cross-Origin-Embedder-Policy: credentialless");
  hlines.push("");
});
/* One stylesheet instead of four.
 * tokens/base/pages/skin were four separate render-blocking requests on every
 * one of 1,478 pages — three extra round trips before the browser can paint,
 * which matters most on the mobile connections a chunk of our traffic uses.
 * Concatenated in the SAME order they were linked, so the cascade is identical. */
const CSS_PARTS = ["tokens.css", "base.css", "pages.css", "newsletter.css", "skin.css"];
const cssBundle = CSS_PARTS
  .map((f) => `/* ---- ${f} ---- */\n` + fs.readFileSync(path.join(ROOT, "assets", "css", f), "utf8"))
  .join("\n");

/* ---------- data/tool-flow.js ----------
 *
 * What every file tool ACCEPTS, taken from the tools themselves rather than
 * inferred. tools-pdf.js and friends already export their specs keyed by tool
 * id, and those specs carry the real `accept` string that filetool.js hands to
 * the file input. Requiring them here means the chaining rules can never
 * disagree with what a tool will actually take — the alternative was a second
 * table of "pdf tools accept PDFs", which is true until the day it is not
 * (jpg-to-pdf accepts images, and lives in the PDF set).
 *
 * Only `accept` and `multiple` travel. The run functions stay in Node.
 */
{
  const flow = {};
  const specModules = ["tools-pdf", "tools-image", "tools-image2", "tools-videofx"];

  /* The widget-shaped tools — compress-pdf, the converters, the audio set —
   * declare their accept inside a mount function rather than on an exportable
   * spec object, so they cannot simply be required. Leaving them out would
   * have quietly dropped the single most useful next step after a PDF tool
   * (Compress PDF) from every chain, so their sources are scanned instead:
   * find the tool-id key, take the first accept string inside its block.
   *
   * A scrape is only safe if it is checked. Every id it produces must exist in
   * the catalogue and every accept must parse as a non-empty list, or the
   * build stops — which is why this is allowed to be a regex at all. */
  const scanModules = ["tools-pdfedit", "tools-pdfconv", "tools-pdftools", "tools-pdfview",
                       "tools-audio", "tools-imaging", "tools-a11y", "tools-codes",
                       "tools-data", "tools-privacy2"];
  /* Some modules put their file input behind one shared helper — tools-pdfedit
   * builds every tool's picker with fileInput(W, cb), and the accept string
   * lives in there rather than beside the tool. That is why Compress PDF, the
   * most useful next step after any PDF tool, was missing from the first pass.
   * If a module declares exactly ONE accept, every tool key in it inherits it;
   * more than one and the module is ambiguous and is left to the scan below. */
  scanModules.forEach((m) => {
    const src = fs.readFileSync(path.join(ROOT, "assets", "js", m + ".js"), "utf8");
    /* `accept: accept || 'application/pdf,.pdf'` is the shape these helpers use,
       so the literal is what matters, not the parameter name in front of it. */
    const accepts = [...src.matchAll(/accept:\s*(?:[a-z]+\s*\|\|\s*)?['"]([^'"]+)['"]/g)].map((x) => x[1]);
    const uniq = [...new Set(accepts)];
    if (uniq.length !== 1) return;
    [...src.matchAll(/['"]([a-z0-9][a-z0-9-]{2,})['"]\s*:\s*function\s*\(\s*host/g)].forEach((k) => {
      const id = k[1];
      if (!VK.find(id) || flow[id]) return;
      flow[id] = { a: uniq[0], m: /multiple:\s*true/.test(src) ? 1 : 0, s: 1 };
    });
  });

  scanModules.forEach((m) => {
    const src = fs.readFileSync(path.join(ROOT, "assets", "js", m + ".js"), "utf8");
    const re = /['"]([a-z0-9][a-z0-9-]{2,})['"]\s*:\s*function[\s\S]{0,2600}?accept:\s*['"]([^'"]+)['"]/g;
    let mm;
    while ((mm = re.exec(src))) {
      const id = mm[1], acc = mm[2];
      if (!VK.find(id)) continue;                 // a key that is not a tool id
      if (flow[id]) continue;                     // a real spec already won
      const multi = /multiple:\s*true/.test(src.slice(mm.index, mm.index + 2600));
      flow[id] = { a: acc, m: multi ? 1 : 0, s: 1 };
    }
  });
  const g = global;
  const hadWindow = "window" in g, hadSelf = "self" in g;
  if (!hadWindow) g.window = g;
  if (!hadSelf) g.self = g;
  specModules.forEach((m) => {
    const p = "./assets/js/" + m + ".js";
    let T;
    try { delete require.cache[require.resolve(p)]; T = require(p); }
    catch (e) { throw new Error("tool-flow: could not load " + p + " — " + e.message); }
    Object.keys(T).forEach((id) => {
      const spec = T[id];
      if (!spec || typeof spec.accept !== "string" || !spec.accept) return;
      /* w:1 means the tool can be a WORKFLOW step — it exposes a process()
         that takes files and returns blobs, so it can be called without
         drawing its interface. The scraped widget tools below never get it:
         their logic and their controls are the same function. */
      flow[id] = { a: spec.accept, m: spec.multiple ? 1 : 0 };
      if (typeof spec.process === "function") flow[id].w = 1;
    });
  });
  if (!hadWindow) delete g.window;
  if (!hadSelf) delete g.self;

  /* A file tool that never made it into the map cannot be chained TO, and that
     is a silent hole rather than a crash — so it is reported at build time. */
  const fileTools = VK.TOOLS.filter((t) => t.status === "live" &&
    (IMAGE[t.id] || IMAGE2[t.id] || PDF[t.id] || VIDEOFX[t.id]));
  const gaps = fileTools.filter((t) => !flow[t.id]).map((t) => t.id);
  if (gaps.length) throw new Error("tool-flow: file tools with no accept spec: " + gaps.join(", "));

  /* WHAT COMES NEXT IS A JUDGEMENT, NOT AN ALPHABET.
   * Sorted by name, the row after Merge PDFs opened with "Add Page Numbers,
   * Compare PDFs, Crop PDF" — every one a real option and not one of them the
   * thing anybody does next. These are the steps that actually follow, in the
   * order they actually follow them. Everything else keeps working; it just
   * sorts after, alphabetically, so the list stays complete without the
   * useful entries being buried under the letter A. */
  const CHAIN_FIRST = [
    "compress-pdf", "merge-pdf", "split-pdf", "protect-pdf", "pdf-to-jpg",
    "pdf-watermark", "extract-pdf-pages", "pdf-ocr", "rotate-pdf",
    "compress-image", "resize-image", "convert-image", "crop-image",
    "jpg-to-pdf", "image-to-text",
    "compress-video", "trim-video", "video-to-gif", "extract-audio",
    "audio-compressor", "audio-converter"
  ];
  /* Tools that change the KIND of file they are given. Everything else hands
     back what it was handed, which is why only the exceptions are listed —
     and why getting this wrong would offer a PDF tool after PDF to JPG. */
  const EMITS = {
    "pdf-to-jpg": "image", "pdf-to-png": "image", "pdf-to-image": "image",
    "jpg-to-pdf": "pdf", "png-to-pdf": "pdf", "webp-to-pdf": "pdf",
    "images-to-pdf": "pdf", "scan-to-pdf": "pdf", "html-to-pdf": "pdf",
    "excel-to-pdf": "pdf", "video-to-gif": "image", "extract-audio": "audio",
    "frame-grabber": "image"
  };
  const names = {};
  Object.keys(flow).forEach((id) => {
    if (EMITS[id]) flow[id].o = EMITS[id];
    const t = VK.find(id);
    if (t) { names[id] = t.name; flow[id].c = t.cat; }
    const r = CHAIN_FIRST.indexOf(id);
    if (r > -1) flow[id].p = r + 1;
  });
  /* A typo here would silently demote a tool it was meant to promote, so the
     build refuses ids that are not tools at all. Naming a REAL tool that
     happens not to be chainable is only a preference that cannot apply — it is
     reported, not fatal, because which tools are chainable changes as the
     scrape above learns new module shapes. */
  const typos = CHAIN_FIRST.filter((id) => !VK.find(id));
  if (typos.length) throw new Error("tool-flow: CHAIN_FIRST has ids that are not tools: " + typos.join(", "));
  const inert = CHAIN_FIRST.filter((id) => !flow[id]);
  if (inert.length) console.log(`tool-flow: CHAIN_FIRST lists ${inert.length} tool(s) nothing can chain into yet — ${inert.join(", ")}`);
  const js = "/* GENERATED by build.js — do not edit. What each file tool accepts,\n"
    + "   read from the tools' own specs. Source of truth: assets/js/tools-*.js */\n"
    + "(function(r){var D={flow:" + JSON.stringify(flow) + ",names:" + JSON.stringify(names) + "};\n"
    + "if(typeof module===\"object\"&&module.exports)module.exports=D;else r.VK_FLOW=D;})"
    + "(typeof self!==\"undefined\"?self:this);\n";
  fs.writeFileSync(path.join(ROOT, "data", "tool-flow.js"), js);
  console.log(`tool-flow.js: ${Object.keys(flow).length} chainable tools -> ${(js.length / 1024).toFixed(1)} KB`);
}

/* ---------- data/tool-icons.js ----------
 *
 * The homepage renders its popular-tools row and its search results in the
 * browser, and both were drawing the CATEGORY glyph — so the one page most
 * people see first was still showing ten identical squares while every built
 * page underneath it had per-tool icons. Fixing it in home.js by hand would
 * have meant a second copy of ICON_RULES and GLYPH living in the browser,
 * free to drift from this one.
 *
 * So the resolver runs HERE, once, over the whole catalogue, and ships its
 * ANSWERS rather than its rules: an id -> {g,h,bg} map plus only the glyphs
 * actually referenced. No regexes in the browser, nothing to keep in step, and
 * if a tool ever loses its icon the build throws before this file is written.
 */
{
  const map = {};
  const used = new Set();
  VK.TOOLS.forEach((t) => {
    const m = toolIcon(t);
    if (!m) return;                    // iconAudit() has already thrown for live tools
    map[t.id] = { g: m.g, h: m.hue, bg: hueFill(m.hue), m: toolMark(t) };
    used.add(m.g);
  });
  const glyphs = {};
  [...used].sort().forEach((g) => { glyphs[g] = GLYPH[g]; });
  const js = "/* GENERATED by build.js — do not edit. Per-tool icon answers for\n"
    + "   the client-rendered parts of the homepage. Source of truth is\n"
    + "   ICON_RULES and GLYPH in build.js. */\n"
    + "(function(r){var D={icons:" + JSON.stringify(map) + ",glyphs:" + JSON.stringify(glyphs) + "};\n"
    + "if(typeof module===\"object\"&&module.exports)module.exports=D;else r.VK_ICONS=D;})"
    + "(typeof self!==\"undefined\"?self:this);\n";
  fs.writeFileSync(path.join(ROOT, "data", "tool-icons.js"), js);
  console.log(`tool-icons.js: ${Object.keys(map).length} tools, ${used.size} glyphs -> ${(js.length / 1024).toFixed(1)} KB`);
}

fs.writeFileSync(path.join(ROOT, "assets", "css", "app.css"), cssBundle);
console.log(`app.css: ${CSS_PARTS.length} files -> ${(cssBundle.length / 1024).toFixed(1)} KB`);
refreshHomepageAssetVersions();

fs.writeFileSync(path.join(ROOT, "_headers"), hlines.join("\n") + "\n");
console.log(`_headers: ${fxIds.length} isolated tool paths`);
