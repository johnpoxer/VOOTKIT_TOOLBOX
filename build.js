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
      <span id="vk-auth-slot" class="vk-auth-slot"><a class="btn btn-sm hdr-login" href="${up}auth/sign-in/">Login</a></span>
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
        <a href="${up}blog/">Guides</a><a href="${up}blog/">Blog</a><a href="${up}contact.html">Help center</a><a href="${up}contact.html">Contact us</a>
      </div>
      <div class="ftr-col">
        <h4>Company</h4>
        <a href="${up}about.html">About us</a><a href="${up}privacy.html">Privacy policy</a><a href="${up}cookies.html">Cookie policy</a><a href="${up}terms.html">Terms of service</a><a href="${up}disclaimer.html">Disclaimer</a><a href="${up}privacy.html#security">Security</a>
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
  [/delete|remove-pages|remove-bg|remove-background/, 'trash', 4],
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
  "remove-background", "jpg-to-png", "convert-video", "compress-pdf",
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
    choose: ["Check contrast before committing a palette.", "Audit headings and tap targets before publishing a page.", "Validate captions and alt text when media or images carry important meaning."]
  },
  privacy: {
    focus: "Privacy tasks are most useful before a file or link leaves your hands. Strip hidden data, redact visible details and clean tracking parameters before sharing.",
    choose: ["Use metadata and redaction tools before publishing screenshots or documents.", "Use password and passphrase tools for new credentials, not reused ones.", "Use checksum tools to verify a file has not changed."]
  },
  text: {
    focus: "Text utilities help when the problem is structure: word limits, formatting, casing, duplicate lines, markdown previews or comparing two versions.",
    choose: ["Use counters and readability tools before submitting or publishing.", "Use case and line tools for cleanup work that would be slow by hand.", "Use diff and markdown tools when the exact wording matters."]
  },
  design: {
    focus: "Design helpers are for quick visual decisions: color conversion, palette building, gradients and shadows. Each gives a live preview so you can copy CSS with confidence.",
    choose: ["Start with contrast when text legibility matters.", "Convert colors when moving between design tools and CSS.", "Use gradient and shadow generators for repeatable values instead of guessing."]
  },
  developer: {
    focus: "Developer utilities should be fast, predictable and local. Format data, decode tokens, generate IDs or test patterns without pasting sensitive work into a heavy external tool.",
    choose: ["Use formatters before committing structured data.", "Use encoders, hashers and validators for quick checks while debugging.", "Avoid pasting secrets into any web tool unless the page clearly runs locally."]
  },
  everyday: {
    focus: "Everyday tools cover small jobs that interrupt real work: converting units, checking dates, timing sessions, generating QR codes or picking a random option.",
    choose: ["Use converters when you need an answer without opening a full calculator app.", "Use timers and pickers for repeatable daily routines.", "Use QR and barcode tools when you need a shareable code immediately."]
  },
  data: {
    focus: "Data tools are for quick inspection and conversion when opening a spreadsheet app would be slower than the job itself. They are useful for checking exports, spotting obvious issues and turning small tables into charts.",
    choose: ["Use the CSV viewer to sort and filter a file before sharing it.", "Use charting for a fast visual check of two-column data.", "Use JSON to CSV when moving data between developer tools and spreadsheet workflows."]
  },
  health: {
    focus: "Health and fitness calculators turn personal numbers into planning estimates. They are useful for setting targets, but they are not a diagnosis or medical advice.",
    choose: ["Use calorie, macro and hydration tools as starting estimates.", "Use pace and heart-rate tools for training planning.", "Check with a professional for medical conditions, injuries or major diet changes."]
  },
  travel: {
    focus: "Travel planning has many small numbers: fuel, distance, tips, shared costs, mileage and packing. These tools keep those details clear before the trip starts.",
    choose: ["Use fuel and distance tools before setting a budget.", "Use split and tipping tools when costs are shared across people or countries.", "Use packing lists to avoid rebuilding the same checklist every trip."]
  },
  audio: {
    focus: "Audio files need the same practical cleanup as video: trimming, compressing, converting, recording and transcription. The goal is to get a usable file quickly.",
    choose: ["Trim before compressing when the recording has silence or mistakes.", "Choose MP3 for broad sharing and WAV when quality matters more than size.", "Use recorder and speech tools for quick notes, drafts and captions."]
  },
  education: {
    focus: "Study tools work best when they turn messy material into something active: flashcards, quizzes, citations, diagrams, mind maps and study schedules.",
    choose: ["Use flashcards and quizzes for recall practice.", "Use citations and diagrams when preparing assignments.", "Use planners and trackers when the hard part is keeping study time visible."]
  },
  ai: {
    focus: "On-device AI tools are planned for jobs where privacy matters: OCR, background removal and transcription. When a model can run locally, the file stays under your control.",
    choose: ["Use OCR for screenshots, scans and photos with readable text.", "Use background removal when you need a transparent subject image.", "Use transcription when the audio is clear enough for browser-based speech recognition."]
  }
};

/* which script bundle a tool page loads — shared by English + localised pages */
function toolScripts(t) {
  if (VIDEO[t.id]) return ['assets/js/calc.js', 'assets/js/tools-video.js'];
  if (MONEY1[t.id]) return ['assets/js/calc.js', 'assets/js/tools-money.js'];
  if (MONEY2[t.id]) return ['assets/js/calc.js', 'assets/js/tools-money2.js'];
  if (CALC2[t.id]) return ['assets/js/calc.js', 'assets/js/tools-calc2.js'];
  /* pixelworker.js is only needed by the tools that do per-pixel work; loading
     it everywhere would put a worker payload on pages that never use one. */
  if (IMAGE[t.id]) return ['assets/js/filetool.js']
    .concat(PIXEL_TOOLS[t.id] ? ['assets/js/pixelworker.js'] : [])
    .concat(['assets/js/tools-image.js']);
  if (IMAGE2[t.id]) return ['assets/js/filetool.js']
    .concat(PIXEL_TOOLS[t.id] ? ['assets/js/pixelworker.js'] : [])
    .concat(['assets/js/tools-image2.js']);
  if (PDF[t.id]) return ['assets/js/filetool.js', 'assets/js/tools-pdf.js'];
  if (VIDEOFX[t.id]) return ['assets/js/filetool.js', 'assets/js/videoengine.js', 'assets/js/tools-videofx.js'];
  if (LINKTOOLS.indexOf(t.id) !== -1) return ['assets/js/widget.js', 'assets/js/tools-linktools.js'];
  return widgetScriptsFor(t.id) || [];
}

/* locales for which a given tool is fully translated (chrome + name/desc) */
function localesForTool(id) {
  return I18N.LOCALES.filter(function (l) {
    return I18N.chrome[l.code] && I18N.tools[l.code] && I18N.tools[l.code][id];
  });
}
/* LOCALISED PAGES ARE OUT OF THE INDEX UNTIL THEY CARRY REAL CONTENT.
 *
 * AdSense rejected vootkit.com on 8 Aug 2026 for "Low value content". Measured
 * duplicate overlap on the built site, same Jaccard method used to break the
 * English clusters:
 *
 *   English   262 pages   median pair overlap 21.0%   pairs >=90% identical:  0 / 780
 *   Spanish   145 pages   median pair overlap 68.6%   pairs >=90% identical: 59 / 780
 *   German    145 pages   median pair overlap 72.3%   pairs >=90% identical: 59 / 780
 *
 * The English side is genuinely fixed. The localised side never received the
 * deep content — every page is the generic template with a tool name swapped
 * in, which is why merge-pdf, compress-pdf, loan-calculator and resize-image
 * all come out within 40 words of each other in Spanish.
 *
 * That is 1,192 of 1,478 pages: 81% of the site, machine-translated,
 * indexable, and linked from every English page by hreflang. A reviewer opening
 * Vootkit saw roughly four pages of templated filler for every real one.
 *
 * So: noindex,follow on the localised pages, and English pages stop advertising
 * them through hreflang and the language switcher. Nothing is deleted and the
 * URLs still resolve — this is one boolean, and it flips back the day those
 * pages have something of their own to say. */
const LOCALISED_INDEXABLE = false;

/* hreflang alternates for a tool: English + any fully-translated locales */
function altsForTool(t) {
  const base = "/tools/" + t.cat + "/" + t.id + "/";
  const arr = [{ code: "en", href: SITE + base }];
  /* One return point for both hreflang and the language switcher, so the two
     can never disagree about which translations the site is claiming. */
  if (!LOCALISED_INDEXABLE) return arr;
  localesForTool(t.id).forEach((l) => arr.push({ code: l.code, href: SITE + "/" + l.code + base }));
  return arr;
}

function toolCard(t, up) {
  const soon = t.status !== "live";
  const c = CATBY[t.cat] || {};
  const pop = !soon && POPULAR.has(t.id);
  const isNew = !soon && NEW.has(t.id);
  const tags = (pop ? '<span class="pill pill-pop">Popular</span>' : "") + (isNew ? '<span class="pill pill-new">New</span>' : "");
  return `<a class="card tool-card${soon ? " is-soon" : ""}" data-cat="${t.cat}" href="${up}tools/${t.cat}/${t.id}/">
    <span class="tc-top">${toolIconHtml(t)}<span class="tc-tags">${tags}</span></span>
    <h3>${esc(t.name)}${soon ? ' <span class="soon">soon</span>' : ""}</h3>
    <p>${esc(t.desc)}</p>
    <span class="card-foot"><span class="tc-cat">${esc(c.name || t.cat)}</span></span>
  </a>`;
}

function dirCountLabel(n) {
  return `${n} ${n === 1 ? "tool" : "tools"}`;
}

function dirSearchText(t, cat) {
  const aliases = {
    "compress-pdf": "make pdf smaller reduce pdf file size shrink pdf email limit",
    "merge-pdf": "join pdf combine pdf put pdfs together",
    "remove-background": "remove image background cut out background transparent png background remover",
    "jpg-to-png": "jpg into png jpeg to png convert jpg png",
    "png-to-jpg": "png into jpg convert png jpeg",
    "compress-image": "make image smaller reduce photo size image compressor",
    "resize-image": "change image size dimensions scale photo",
    "compress-video": "make video smaller reduce video size shrink video",
    "video-to-gif": "make gif from video convert video gif",
    "json-formatter": "format json pretty print json beautify json validate json",
    "sql-formatter": "format sql pretty sql",
    "word-counter": "count words character counter essay limit",
    "qr-generator": "make qr code create qr",
    "mortgage-calculator": "calculate house loan home loan mortgage payment",
    "loan-calculator": "calculate loan payment personal loan",
    "currency-converter": "exchange rate fx convert money",
    "invoice-generator": "create invoice bill client",
    "password-generator": "make password secure password",
    "password-strength": "check password strength",
    "pdf-to-jpg": "pdf to image convert pdf jpg",
    "jpg-to-pdf": "image to pdf photos to pdf",
    "pdf-to-text": "extract text from pdf copy pdf text",
    "url-cleaner": "remove tracking parameters clean url"
  };
  return esc([t.id, t.name, t.desc, t.kw || "", cat.name || "", aliases[t.id] || ""].join(" "));
}

/* Per-tool closing sentences for the PDF cards.

   The category suffix below gave all 28 PDF tools the same second sentence,
   "Finish in your browser and download the updated PDF." Two problems with
   that: 28 identical trailing sentences is the duplicate-content pattern the
   site was rejected for, and on seven of them it was simply untrue — PDF to
   JPG, PDF to PNG, PDF to WebP, PDF Text Extractor, PDF & Image OCR and
   Compare PDFs do not output a PDF at all, and PDF Form Filler said
   "download" twice in one description.

   Each ending here states what that specific tool actually gives back. */
const PDF_CARD_ENDINGS = {
  "split-pdf": "The pages you pick come out as their own file.",
  "rotate-pdf": "The new orientation is saved into the file, not just the view.",
  "delete-pdf-pages": "The pages that remain keep their original quality.",
  "reorder-pdf": "The order you drag them into is written into the file.",
  "pdf-to-jpg": "You get one JPG per page, ready to save.",
  "pdf-to-text": "Copy it straight out or save it as a text file.",
  "pdf-page-numbers": "Choose the corner, the starting number and the style.",
  "pdf-watermark": "Set the wording, the angle and how faint it sits.",
  "protect-pdf": "The password is applied to the file itself.",
  "pdf-redact": "Mark what should not be shared and save a flattened copy.",
  "compare-pdf": "Differences between the two versions are highlighted for you.",
  "text-to-pdf": "Set the page size and margins before you save.",
  "markdown-to-pdf": "Headings, lists and code blocks keep their formatting.",
  "crop-pdf": "Set the margin once and it applies to every page.",
  "duplicate-pdf-pages": "Useful for booklets, tickets and print runs.",
  "png-to-pdf": "Transparent areas are flattened onto a white page.",
  "webp-to-pdf": "Each image becomes its own page, in the order you add them.",
  "pdf-to-png": "You get one lossless PNG per page.",
  "pdf-to-webp": "Smaller files than PNG at the same visible quality.",
  "pdf-creator": "Handy as a template or a printable blank.",
  "extract-pdf-pages": "Every page you pick is saved on its own.",
  "pdf-repair": "Worth trying before you give up on a file that will not open.",
  "scan-to-pdf": "Shoot the pages one by one and save them as one document.",
  "pdf-signature": "Place it where you want it and save the signed copy.",
  "pdf-form-filler": "Typed values are saved into the form fields themselves.",
  "html-to-pdf": "Inline styles are applied as they would appear on screen.",
  "excel-to-pdf": "Each sheet flows onto its own set of pages.",
  "pdf-ocr": "Reads scans and photos and hands back selectable text."
};

function dirDirectoryDesc(t) {
  const base = String(t.desc || "").replace(/\s+/g, " ").trim();
  const clean = base.replace(/[.!?]+$/, "");
  /* A per-tool ending always wins over the shared category sentence. */
  const own = PDF_CARD_ENDINGS[t.id];
  if (own) return clean ? `${clean}. ${own}` : own;
  const suffix = {
    pdf: "Finish in your browser and download the updated PDF.",
    images: "Preview the change and download the finished image.",
    video: "Process the clip and export the new video.",
    finance: "Enter your numbers to get a clear result.",
    insurance: "Estimate your needs before you compare options.",
    realestate: "Run the property numbers before you commit.",
    tax: "Calculate pay, tax or cost from simple inputs.",
    business: "Create a clean business result you can use right away.",
    seo: "Generate, preview or audit the item in seconds.",
    accessibility: "Check the page or asset against practical accessibility rules.",
    privacy: "Clean private data before you share the file or link.",
    text: "Paste text, process it instantly and copy the result.",
    design: "Tune the visual value and copy the CSS or result.",
    developer: "Format, validate or generate developer data quickly.",
    everyday: "Run the everyday calculation or conversion instantly.",
    data: "Open, convert or chart data without a spreadsheet app.",
    health: "Enter your body or activity details for a quick estimate.",
    travel: "Plan costs, dates or travel details with simple inputs.",
    audio: "Convert, trim or capture audio and save the result.",
    education: "Build a study resource you can keep using.",
    ai: "Use an on-device AI helper for media or text."
  }[t.cat] || "Use the tool in your browser and get a clean result.";
  if (!clean) return suffix;
  if (clean.length > 76) return base;
  return `${clean}. ${suffix}`;
}

function dirToolDisplay(t) {
  const map = {
    "word-to-pdf": { name: "Word to PDF", desc: "Convert DOCX files into clean PDF documents in your browser.", glyph: "W", kind: "doc", hue: 216 },
    "merge-pdf": { name: "Merge PDF", desc: "Combine several PDF files into one document in the order you choose.", glyph: "PDF", kind: "pdf", hue: 350 },
    "compress-image": { name: "Image Compressor", desc: "Reduce JPG, PNG or WebP file size while keeping quality balanced.", kind: "image", hue: 145 },
    "trim-video": { name: "Video Trimmer", desc: "Cut, trim and export video clips directly in your browser.", kind: "play", hue: 316 },
    "remove-background": { name: "Background Remover", desc: "Remove an image background and export a clean cutout.", kind: "checker", hue: 260 },
    "jpg-to-png": { name: "JPG to PNG", desc: "Convert JPG or JPEG images into PNG files for cleaner exports.", kind: "image-doc", hue: 42 },
    "convert-video": { name: "Video Converter", desc: "Convert videos to MP4, AVI, MOV and other useful formats.", kind: "sync", hue: 216 },
    "compress-pdf": { name: "Compress PDF", desc: "Shrink a PDF for email, upload limits or faster sharing.", glyph: "PDF", kind: "download", hue: 350 },
    "jpg-to-pdf": { name: "Image to PDF", desc: "Turn JPG or PNG images into a single downloadable PDF.", kind: "image-doc", hue: 42 },
    "crop-image": { name: "Crop Image", desc: "Crop photos to an exact size, ratio or clean visual frame.", kind: "crop", hue: 204 },
    "remove-pdf-password": { name: "PDF Unlock", desc: "Unlock a permitted PDF by removing password restrictions.", kind: "lock", hue: 145 },
    "audio-converter": { name: "Audio Converter", desc: "Convert audio files between MP3, WAV, AAC and more.", kind: "speaker", hue: 216 }
  };
  const fallback = toolIcon(t) || {};
  return map[t.id] || {
    name: t.name,
    desc: dirDirectoryDesc(t),
    kind: "tool",
    hue: fallback.hue || 250,
    path: GLYPH[fallback.g] || GLYPH.page
  };
}

function dirLogoIcon(t) { return toolIconHtml(t); }

function categoryTile(c, count, active, cats) {
  const slug = c.slug || "all";
  const groupCats = cats || (slug === "all" ? "" : slug);
  return `<a class="dir-cat-link${active ? " is-active" : ""}" href="${slug === "all" ? "../tools/" : `../tools/?cat=${esc(slug)}`}" data-dir-cat="${esc(slug)}" data-dir-cats="${esc(groupCats)}">
    <span class="dir-cat-ic">${icon(c.icon || "file")}</span>
    <span>${esc(c.name)}</span>
    <b>${count}</b>
  </a>`;
}

function directoryToolCard(t, up, idx) {
  const c = CATBY[t.cat] || {};
  const d = dirToolDisplay(t);
  const soon = t.status !== "live";
  const pop = !soon && POPULAR.has(t.id);
  const isNew = !soon && NEW.has(t.id);
  const popRank = pop ? Array.from(POPULAR).indexOf(t.id) : 9999;
  const dirRank = DIR_FEATURED_ORDER.indexOf(t.id);
  const catOrder = VK.CATEGORIES.findIndex((cat) => cat.slug === t.cat);
  const badges = (pop ? '<span class="pill pill-pop">Popular</span>' : "")
    + (isNew ? '<span class="pill pill-new">New</span>' : "")
    + (soon ? '<span class="pill pill-soon">Soon</span>' : "");
  return `<a class="dir-card tool-card${soon ? " is-soon" : ""}${pop ? " is-popular" : ""}${isNew ? " is-new" : ""}"
    data-tool-card data-id="${esc(t.id)}" data-cat="${esc(t.cat)}" data-status="${esc(t.status)}"
    data-name="${esc(d.name)}" data-rank="${idx}" data-catorder="${catOrder > -1 ? catOrder : 999}" data-dirrank="${dirRank > -1 ? dirRank : 9999}" data-poprank="${popRank}" data-popular="${pop ? "1" : "0"}" data-new="${isNew ? "1" : "0"}"
    data-search="${dirSearchText(t, c)}" href="${up}tools/${t.cat}/${t.id}/">
    <span class="dir-card-icon">${dirLogoIcon(t)}</span>
    <span class="dir-card-copy">
      <span class="dir-card-head"><h3>${esc(d.name)}${soon ? ' <span class="soon">soon</span>' : ""}</h3>${badges ? `<span class="tc-tags">${badges}</span>` : ""}</span>
      <p>${esc(d.desc)}</p>
      <span class="dir-card-meta"><span>${esc(c.name || t.cat)}</span>${t.processing === "network" ? "<span>Network-backed</span>" : "<span>Browser-first</span>"}</span>
    </span>
    <span class="dir-card-arrow" aria-hidden="true">${icon("arrow-right")}</span>
  </a>`;
}

function directoryFeatureCard(t, up) {
  const c = CATBY[t.cat] || {};
  return `<a class="dir-feature-card" href="${up}tools/${t.cat}/${t.id}/">${toolIconHtml(t)}<span><strong>${esc(t.name)}</strong><small>${esc(t.desc)}</small><b>Open →</b></span></a>`;
}

function directoryPopularRow(t, up) {
  return `<a class="dir-pop-row" href="${up}tools/${t.cat}/${t.id}/">${toolIconHtml(t)}<span><strong>${esc(t.name)}</strong><small>${esc(t.desc)}</small></span>${t.processing === "local" ? '<em>Private</em>' : ''}<b aria-hidden="true">›</b></a>`;
}

function dirHeroVisual() {
  const picks = ["trim-video", "compress-image", "word-to-pdf", "jpg-to-png"]
    .map((id) => VK.find(id)).filter(Boolean);
  return `<aside class="dir-hero-card" aria-label="Vootkit toolkit preview">
    <div class="dir-hero-copy">
      <h2>Everything you need<br>in one toolkit</h2>
      <p>Powerful, fast and easy-to-use tools for creators, students and professionals.</p>
    </div>
    <div class="dir-toolbox" aria-hidden="true">
      <span class="dir-toolbox-lid"></span>
      <span class="dir-toolbox-body"></span>
      ${picks.map((t, i) => `<span class="dir-float dir-float-${i + 1}">${dirLogoIcon(t)}</span>`).join("")}
      <span class="dir-type-tile">T</span>
    </div>
  </aside>`;
}

function dirTrustStrip() {
  const items = [
    ["coins", "100% Free", ""],
    ["laptop", "Browser Based", ""],
    ["grid", "250+ Tools", ""],
    ["shield", "Secure", ""]
  ];
  return `<div class="dir-trust" aria-label="Vootkit benefits">${items.map((it) => `<div class="dir-trust-item">
    <span>${icon(it[0])}</span><strong>${esc(it[1])}</strong>${it[2] ? `<small>${esc(it[2])}</small>` : ""}
  </div>`).join("")}</div>`;
}

function dirLowerContent() {
  return `<section class="dir-guide" aria-labelledby="tools-guide-title">
    <div>
      <p class="eyebrow">Tool discovery</p>
      <h2 id="tools-guide-title">Find the right tool without digging through menus.</h2>
      <p>Search by the job you want done, filter by category, then open the matching tool directly. The directory is generated from the same catalog that builds the tool pages, so new tools and category counts update here automatically.</p>
    </div>
    <div class="dir-guide-grid">
      <article><h3>Search by intent</h3><p>Queries like "make pdf smaller", "join pdf" and "format json" map to the right tools even when the words do not match the title exactly.</p></article>
      <article><h3>Browse by category</h3><p>Use the sidebar on desktop or swipeable category chips on mobile to move through PDF, images, video, finance, developer and more.</p></article>
      <article><h3>Know what is ready</h3><p>Live tools open as normal. Planned tools are marked as coming soon instead of being presented as finished features.</p></article>
    </div>
  </section>
  <section class="dir-faq faq" aria-labelledby="tools-faq-title">
    <h2 id="tools-faq-title" class="h-sm">All Tools questions</h2>
    <details><summary>Are all Vootkit tools free?</summary><p>Vootkit has a free plan for everyday use. The directory avoids claiming unlimited free use because limits and Pro features belong to the product rules in the repository.</p></details>
    <details><summary>Do my files upload to Vootkit?</summary><p>Most file tools process in your browser on your device. Any network-backed tool is labelled on its own page so you know what changes before you use it.</p></details>
    <details><summary>Why are some cards marked soon?</summary><p>Those tools exist in the product catalog but are not yet live. They are visible for discovery and roadmap context, but not described as usable.</p></details>
  </section>`;
}

/* ---------- /tools/ ---------- */
function legacyAllToolsPage() {
  const url = SITE + "/tools/";
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Vootkit", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "All tools", item: url }
    ]},
    { "@context": "https://schema.org", "@type": "CollectionPage", name: "All Vootkit tools", url,
      description: "Every Vootkit tool, grouped by category.",
      mainEntity: { "@type": "ItemList", numberOfItems: VK.TOOLS.length,
        itemListElement: VK.TOOLS.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, url: `${SITE}/tools/${t.cat}/${t.id}/` })) } }
  ];
  const groups = VK.CATEGORIES.map((c) => {
    const list = VK.byCategory(c.slug);
    if (!list.length) return "";
    return `<section class="cat-block">
      <div class="cat-head">
        <h2><a href="../tools/${c.slug}/">${esc(c.name)}</a></h2>
        <span class="res-cat">${list.length} tools</span>
      </div>
      <div class="grid">${list.map((t) => toolCard(t, "../")).join("")}</div>
    </section>`;
  }).join("");

  return head({ depth: 1, url, ads: true, ld,
    /* A LIVE COUNT IN A <title> IS A BUG, not a feature.
     *
     * GA4 groups by page title, and this one changed every time a tool was
     * added — the same page appears in the reports as "All 133 Tools",
     * "All 149 Tools", "All 222 Tools", "All 257 Tools" and "All 261 Tools",
     * five rows for one URL, none of which can be summed or trended. Search
     * Console has the same problem, and Google is more likely to rewrite a
     * title it sees churning.
     *
     * Rounded DOWN to the nearest fifty: keeps the number that helps
     * click-through, loses the churn, and stays honest — "250+" is never a
     * claim to more tools than exist. */
    title: `All ${floorTo(VK.counts.live, TOOL_ROUND_TO)}+ Free Online Tools — Vootkit`,
    ogTitle: "All Vootkit tools",
    desc: `Browse all ${VK.TOOLS.length} Vootkit tools across ${VK.CATEGORIES.length} categories. Most run entirely in your browser — no upload, no watermark, 5 free uses a day.` }) +
`<div class="wrap section">
  <nav class="crumb" aria-label="Breadcrumb"><a href="../">Vootkit</a> <span aria-hidden="true">›</span> <span aria-current="page">All tools</span></nav>
  <h1 class="page-h1">All tools</h1>
  <p class="page-lede">${VK.counts.live} live now, ${VK.TOOLS.length} planned across ${VK.CATEGORIES.length} categories. Most run entirely on your device.</p>
  <div class="searchbox local-search">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>
    <input id="filter" type="search" class="field" placeholder="Filter tools…" aria-label="Filter tools" autocomplete="off">
  </div>
  <p class="note" id="filtercount" role="status" aria-live="polite"></p>
  <div id="alltools">${groups}</div>
</div>
<script>
(function(){
  var f=document.getElementById('filter'),wrapEl=document.getElementById('alltools'),cnt=document.getElementById('filtercount');
  if(!f)return;
  function norm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\\s+/g,' ').trim();}
  var t;
  f.addEventListener('input',function(){clearTimeout(t);t=setTimeout(function(){
    var q=norm(f.value),terms=q?q.split(' '):[],shown=0;
    wrapEl.querySelectorAll('.tool-card').forEach(function(c){
      var hay=norm(c.textContent);
      var ok=terms.every(function(x){return hay.indexOf(x)>-1;});
      c.hidden=!ok; if(ok)shown++;
    });
    wrapEl.querySelectorAll('.cat-block').forEach(function(b){
      b.hidden=!b.querySelector('.tool-card:not([hidden])');
    });
    cnt.textContent=q?(shown?shown+(shown===1?' tool':' tools')+' match':'No tools match “'+f.value+'”'):'';
  },90);});
})();
</script>` + foot(1);
}

function allToolsPage() {
  const url = SITE + "/tools/";
  const allTools = VK.TOOLS.slice();
  const liveCount = VK.counts.live;
  const cats = VK.CATEGORIES.map((c) => {
    const count = VK.byCategory(c.slug).length;
    return Object.assign({}, c, { count });
  }).filter((c) => c.count);
  const groupCount = (group) => group.slug === "all"
    ? allTools.length
    : allTools.filter((t) => group.cats.indexOf(t.cat) > -1).length;
  const groups = DIR_GROUPS.map((group) => Object.assign({}, group, { count: groupCount(group) }))
    .filter((group) => group.slug === "all" || group.count);
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Tools", item: url }
    ]},
    { "@context": "https://schema.org", "@type": "CollectionPage", name: "All Vootkit tools", url,
      description: "Every Vootkit tool, searchable by task and category.",
      mainEntity: { "@type": "ItemList", numberOfItems: allTools.length,
        itemListElement: allTools.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, url: `${SITE}/tools/${t.cat}/${t.id}/` })) } }
  ];
  const sidebar = groups.map((group) => categoryTile(group, group.count, group.slug === "all", group.cats.join(","))).join("");
  const chips = groups.map((group) => `<a class="chip${group.slug === "all" ? " is-active" : ""}" href="${group.slug === "all" ? "../tools/" : `../tools/?cat=${esc(group.slug)}`}" data-dir-cat="${esc(group.slug)}" data-dir-cats="${esc(group.cats.join(","))}">${esc(group.name)} <span>${group.count}</span></a>`).join("");
  const cards = allTools.map((t, i) => directoryToolCard(t, "../", i)).join("");
  const recommended = ["compress-pdf", "resize-image", "invoice-generator"].map((id) => VK.find(id)).filter(Boolean);
  const popularRows = ["compress-pdf", "pdf-to-text", "compress-video", "loan-calculator", "qr-generator"].map((id) => VK.find(id)).filter(Boolean);
  const categoryBrowse = cats.map((c) => {
    const hue = ({ pdf:4, images:205, video:268, finance:40, insurance:145, realestate:222,
      tax:278, business:214, seo:24, accessibility:12, privacy:148, text:282,
      design:326, developer:145, everyday:38, data:198, health:350, travel:194,
      audio:286, education:264, ai:228 })[c.slug] || 214;
    return `<a href="../tools/${esc(c.slug)}/" aria-label="Open ${esc(c.name)} tools"><span style="--cat-icon-bg:${hueFill(hue)};--cat-icon-h:${hue}">${icon(c.icon)}</span><strong>${esc(c.name)}</strong><small>${c.count} tools</small><b>›</b></a>`;
  }).join("");
  const planned = allTools.length - liveCount;

  return head({ depth: 1, url, ads: true, ld, active: "tools", bodyClass: "tools-page",
    title: `All ${floorTo(VK.counts.live, TOOL_ROUND_TO)}+ Free Online Tools - Vootkit`,
    ogTitle: "All Vootkit tools",
    desc: `Browse ${allTools.length} Vootkit tools across ${VK.CATEGORIES.length} categories. Search by task, filter by category and launch the right online tool in seconds.` }) +
`<div class="tools-dir" data-tools-dir data-total="${allTools.length}" data-live="${liveCount}">
  <section class="dir-hero wrap section">
    <div class="dir-hero-main">
      <nav class="crumb" aria-label="Breadcrumb"><a href="../">Home</a> <span aria-hidden="true">&gt;</span> <span aria-current="page">Tools</span></nav>
      <h1 class="page-h1">Find the right tool, fast.</h1>
      <p class="page-lede">Search ${floorTo(VK.counts.live, TOOL_ROUND_TO)}+ tools by name—or describe what you need.</p>
      <p class="dir-live-note">${liveCount} live tools now${planned ? `, with ${planned} planned tools marked clearly as coming soon` : ""}.</p>
    </div>
    ${dirHeroVisual()}
  </section>

  <section class="dir-search-section wrap" aria-label="Search all tools">
    <form class="dir-search" role="search" data-dir-search autocomplete="off">
      <label class="sr-only" for="tools-search">Search tools</label>
      ${icon("search")}
      <input id="tools-search" type="search" placeholder="Search tools - e.g. Word to PDF, Image Compressor..." aria-controls="tools-results tools-suggestions" aria-autocomplete="list" autocomplete="off" data-dir-q>
      <button class="btn btn-primary" type="submit">Search</button>
      <div class="dir-suggestions" id="tools-suggestions" role="listbox" aria-label="Tool suggestions" data-dir-suggestions hidden></div>
    </form>
    ${dirTrustStrip()}
  </section>

  <section class="dir-ref-sections wrap">
    <div class="dir-ref-head"><h2>Recommended for you</h2><a href="#all-directory-tools">See all</a></div>
    <div class="dir-feature-grid">${recommended.map((t) => directoryFeatureCard(t, "../")).join("")}</div>
    <div class="dir-ref-head"><h2>Browse categories</h2></div>
    <div class="dir-browse-grid">${categoryBrowse}</div>
    <div class="dir-ref-head"><h2>Popular right now</h2><a href="#all-directory-tools">See all</a></div>
    <div class="dir-pop-list">${popularRows.map((t) => directoryPopularRow(t, "../")).join("")}</div>
    <form class="dir-describe" action="../tools/" method="get"><div><h2>Can’t find it? Describe your task</h2><p>Tell us what you want to do, and we’ll suggest the best tools.</p></div><input name="q" aria-label="Describe your task" placeholder="e.g. merge PDFs, convert JPG to PNG, create invoice"><button class="btn btn-primary" type="submit">Find tools</button></form>
  </section>

  <section class="dir-content wrap" id="all-directory-tools">
    <div class="dir-mobile-cats" aria-label="Categories">${chips}</div>
    <aside class="dir-side" aria-label="Tool categories">
      <h2>Categories</h2>
      <nav class="dir-cat-list">${sidebar}</nav>
      <div class="dir-side-promo">
        <span>${icon("sparkles")}</span>
        <strong>Build repeat workflows</strong>
        <p>Chain PDF, image and video tools when one step is not enough.</p>
        <a class="btn btn-sm" href="../workflows/">Explore Workflow</a>
      </div>
    </aside>

    <div class="dir-results" id="tools-results">
      <div class="dir-toolbar">
        <p data-dir-count role="status" aria-live="polite">Showing all ${allTools.length} tools</p>
        <div class="dir-tools">
          <label for="tools-sort">Sort by</label>
          <select id="tools-sort" data-dir-sort>
            <option value="category">Category</option>
            <option value="popular">Most popular</option>
            <option value="az">A-Z</option>
            <option value="new">Newest</option>
          </select>
          <div class="dir-view" aria-label="View mode">
            <button type="button" class="is-active" data-dir-view="boxes" aria-label="Boxes view">${icon("grid")}<span>Boxes</span></button>
            <button type="button" data-dir-view="grid" aria-label="Grid view">${icon("list")}<span>Grid</span></button>
          </div>
        </div>
      </div>
      <div class="dir-grid" data-dir-grid>${cards}</div>
      <div class="dir-empty" data-dir-empty hidden>
        <h2>No tools found</h2>
        <p>Try a broader search, remove a category filter, or browse all tools.</p>
        <button class="btn btn-primary" type="button" data-dir-clear>Reset filters</button>
      </div>
    </div>
  </section>
  <div class="wrap">${dirLowerContent()}</div>
</div>` + foot(1, ["assets/js/tools-directory.js"], { workspaceScripts: false });
}

function categoryDepthSection(c, list) {
  const depth = CATEGORY_DEPTH[c.slug] || {
    focus: `${c.name} tools help with focused browser tasks where a full app would slow you down.`,
    choose: ["Start with the tool that matches the file or number you already have.", "Check the tool page for local or network-backed processing before you begin.", "Use related tools when the task needs more than one step."]
  };
  const live = list.filter((t) => t.status === "live");
  const examples = (live.length ? live : list).slice(0, 6);
  const exampleCards = examples.map((t) => `<article>
    <span class="cat-depth-icon">${toolIconHtml(t)}</span>
    <h3>${esc(t.name)}</h3>
    <p>${esc(t.desc)}</p>
  </article>`).join("");
  const question = c.slug === "ai" ? `Are ${esc(c.name)} tools available now?` : `Are ${esc(c.name)} tools private?`;
  const answer = c.slug === "ai"
    ? "Some AI tools are planned while the browser models are tested for quality and performance. Planned tools are marked clearly, and live tools open normally."
    : "Most Vootkit tools run in your browser, and each individual page says when a tool needs a network request. Files handled locally never leave your device.";

  return `<section class="cat-depth section" aria-labelledby="cat-depth-title">
    <div class="cat-depth-head">
      <span class="eyebrow">Category guide</span>
      <h2 id="cat-depth-title">How to use ${esc(c.name)} tools well</h2>
      <p>${esc(depth.focus)}</p>
    </div>
    <div class="cat-depth-grid">${exampleCards}</div>
    <div class="cat-depth-advice">
      <div>
        <h2>Choosing the right tool</h2>
        <ul>${depth.choose.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
      </div>
      <div class="cat-depth-note">
        <h2>Before you start</h2>
        <p>Open the tool page, read the short limits section, then run a small file or simple example first. That keeps the job predictable and makes the final download easier to trust.</p>
      </div>
    </div>
    <section class="cat-depth-faq faq" aria-labelledby="cat-faq-title">
      <h2 id="cat-faq-title">Common ${esc(c.name)} questions</h2>
      <details><summary>${question}</summary><p>${answer}</p></details>
      <details><summary>Do I need to install anything?</summary><p>No. Vootkit tools are built for modern browsers, so you can open the page, complete the task and download the result without installing desktop software.</p></details>
      <details><summary>Why do some tools say coming soon?</summary><p>Vootkit keeps planned tools visible for roadmap context, but they are not presented as finished features. Live tools have working pages and are included in the sitemap.</p></details>
    </section>
  </section>`;
}

/* ---------- /tools/<category>/ ---------- */
function categoryPage(c) {
  const list = VK.byCategory(c.slug);
  const url = `${SITE}/tools/${c.slug}/`;
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Vootkit", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Tools", item: SITE + "/tools/" },
      { "@type": "ListItem", position: 3, name: c.name, item: url }
    ]},
    { "@context": "https://schema.org", "@type": "CollectionPage", name: `${c.name} tools`, url, description: c.blurb,
      mainEntity: { "@type": "ItemList", numberOfItems: list.length,
        itemListElement: list.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, url: `${SITE}/tools/${c.slug}/${t.id}/` })) } }
  ];
  const others = VK.CATEGORIES.filter((x) => x.slug !== c.slug)
    .map((x) => `<a class="chip" href="../${x.slug}/">${esc(x.name)}</a>`).join("");

  return head({ depth: 2, url, ads: true, ld,
    /* Same fragmentation, plus a second problem this one had on its own: a
       small exact count ADVERTISES SCARCITY. "AI Tools — 3 Free Online Tools"
       tells the searcher there is almost nothing here before they click. */
    title: `${c.name} Tools — Free & Online | Vootkit`,
    ogTitle: `${c.name} tools`,
    desc: c.blurb.slice(0, 155) }) +
`<div class="wrap section">
  <nav class="crumb" aria-label="Breadcrumb"><a href="../../">Vootkit</a> <span aria-hidden="true">›</span> <a href="../">Tools</a> <span aria-hidden="true">›</span> <span aria-current="page">${esc(c.name)}</span></nav>
  <h1 class="page-h1">${esc(c.name)} tools</h1>
  <p class="page-lede">${esc(c.blurb)}</p>
  <p class="res-cat" style="margin-bottom:var(--s-5)">${list.length} tools · no watermark · 5 free a day</p>
  <div class="grid">${list.map((t) => toolCard(t, "../../")).join("")}</div>
  ${categoryDepthSection(c, list)}

  <section class="section">
    <h2 class="h-sm">Other categories</h2>
    <div class="chips">${others}</div>
  </section>
</div>` + foot(2);
}

/* ---------- /tools/<category>/<tool>/ — the 9 required blocks ---------- */
function toolRuntimeSpec(t) {
  return VIDEOFX[t.id] || IMAGE[t.id] || IMAGE2[t.id] || PDF[t.id] ||
    MONEY[t.id] || CALC2[t.id] || VIDEO[t.id] || null;
}

function toolArchetype(t) {
  if (VIDEOFX[t.id] || IMAGE[t.id] || IMAGE2[t.id] || PDF[t.id]) return "file";
  if (MONEY[t.id] || CALC2[t.id] || VIDEO[t.id]) return "calculator";
  if (LINKTOOLS.indexOf(t.id) !== -1) return "network";
  if (widgetScriptsFor(t.id)) {
    if (t.cat === "developer" || t.cat === "data" || t.cat === "seo") return "developer";
    if (t.cat === "text") return "text";
    if (/generator|maker|creator|builder|invoice|quote|receipt|proposal|contract|resume|card/i.test(t.id + " " + t.name)) return "generator";
    return "widget";
  }
  return "tool";
}

function toolShellTitle(t) {
  const n = String(t.name || "").trim();
  if (!n) return "Vootkit Tool";
  if (/\b(?:converter|calculator|generator|compressor|editor|maker|builder|viewer|counter|tester|validator|checker|scanner|recorder|trimmer|formatter|encoder|decoder|solver|estimator|tracker|auditor|creator)\b/i.test(n)) return n;
  if (/^(?:compress|merge|split|rotate|delete|reorder|protect|unlock|crop|resize|trim|mute|extract|remove|compare|redact|format|convert|scan|sign|watermark)\b/i.test(n)) return n;
  if (/\bto\b/i.test(n) && /pdf|image|video|audio|convert|doc|word|excel|jpg|jpeg|png|webp|csv|json/i.test(t.id + " " + n + " " + t.cat)) return `${n} Converter`;
  return n;
}

function toolStepSet(t, archetype) {
  if (archetype === "file") return [
    { icon: "upload", label: "Upload", desc: "Add your file from your device." },
    { icon: "sliders", label: "Choose options", desc: "Pick the output settings you need." },
    { icon: "zap", label: "Process", desc: "Run the tool in your browser." },
    { icon: "download", label: "Download", desc: "Save the finished result." }
  ];
  if (archetype === "calculator") return [
    { icon: "calculator", label: "Enter details", desc: "Add the numbers for your scenario." },
    { icon: "zap", label: "Calculate", desc: "Vootkit updates the result instantly." },
    { icon: "table", label: "Review", desc: "Check totals, notes and breakdowns." },
    { icon: "share", label: "Use result", desc: "Copy the answer into your workflow." }
  ];
  if (archetype === "developer" || archetype === "text") return [
    { icon: archetype === "developer" ? "code" : "type", label: "Paste input", desc: "Add the text, code or data." },
    { icon: "sliders", label: "Adjust", desc: "Choose formatting or generation options." },
    { icon: "zap", label: "Run", desc: "Process everything in the browser." },
    { icon: "check", label: "Copy", desc: "Copy or download the clean result." }
  ];
  if (archetype === "network") return [
    { icon: "link", label: "Enter details", desc: "Paste the link or lookup value." },
    { icon: "globe", label: "Fetch", desc: "Use the required online service." },
    { icon: "check", label: "Review", desc: "Check the generated result." },
    { icon: "share", label: "Use", desc: "Copy it where you need it." }
  ];
  return [
    { icon: "sparkles", label: "Choose tool", desc: "Open the Vootkit workspace." },
    { icon: "sliders", label: "Add input", desc: "Provide the content or settings." },
    { icon: "zap", label: "Process", desc: "Let the browser do the work." },
    { icon: "check", label: "Finish", desc: "Copy, download or continue." }
  ];
}

function toolHeroBadges(t, local, archetype) {
  const labels = ["100% Free", "No watermark"];
  if (archetype === "file") labels.splice(1, 0, local ? "Browser-based" : "Online lookup");
  else labels.splice(1, 0, "Runs instantly");
  return labels.map((x) => `<span class="badge">${esc(x)}</span>`).join("");
}

function toolOutputLabel(t, archetype) {
  const id = t.id, name = t.name;
  if (/\bto-pdf\b|to pdf/i.test(id + " " + name)) return "PDF document";
  if (/pdf-to-(?:jpg|png|webp)|image-to-text|ocr/i.test(id)) return "Image or text export";
  if (/(?:jpg|jpeg|png|webp|heic|image|photo|favicon|thumbnail|collage)/i.test(id + " " + t.cat)) return "Image file";
  if (/video|gif|clip|frame/i.test(id + " " + t.cat)) return "Video or media file";
  if (/audio|voice|speech/i.test(id + " " + t.cat)) return "Audio or transcript";
  if (archetype === "calculator") return "Calculated result";
  if (archetype === "developer") return "Formatted output";
  if (archetype === "text") return "Clean text";
  return "Tool result";
}

function toolOptionRows(t, facts, local, archetype) {
  const rows = [];
  if (facts && facts.rows && facts.rows.length) {
    facts.rows.slice(0, 4).forEach((r) => rows.push([r.label, r.value]));
  }
  if (!rows.length) {
    rows.push(["Output", toolOutputLabel(t, archetype)]);
    rows.push(["Processing", local ? "On your device" : "Online service"]);
    rows.push(["Install", "No app install needed"]);
    rows.push(["Plan", "Free core access"]);
  }
  return `<dl class="tool-option-list">${rows.map((r) => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join("")}</dl>`;
}

function toolMiniCard(t, up) {
  const c = CATBY[t.cat] || {};
  return `<a class="tool-mini-card" data-cat="${esc(t.cat)}" href="${up}tools/${t.cat}/${t.id}/">
    ${toolIconHtml(t)}
    <span class="tool-mini-copy"><strong>${esc(t.name)}</strong><small>${esc(dirDirectoryDesc(t))}</small></span>
    <span class="tool-mini-arrow" aria-hidden="true">${icon("arrow-right")}</span>
    <span class="sr-only">${esc(c.name || t.cat)}</span>
  </a>`;
}

function toolRelatedStrip(t, c, related) {
  if (!related.length) return "";
  return `<section class="tool-related-section" aria-labelledby="related-title">
    <div class="tool-section-head">
      <h2 id="related-title">Explore more ${esc(c.name)} tools</h2>
      <a href="../">View all ${esc(c.name)} tools ${icon("arrow-right")}</a>
    </div>
    <div class="tool-mini-row">${related.map((r) => toolMiniCard(r, "../../../")).join("")}</div>
  </section>`;
}

function toolHowToCards(t, steps) {
  return `<section class="tool-how-section" aria-labelledby="tool-how-title">
    <h2 id="tool-how-title">How to use ${esc(toolShellTitle(t))}</h2>
    <div class="tool-how-grid">${steps.map((s, i) => `<article>
      <span class="tool-how-icon">${icon(s.icon)}</span>
      <strong>${esc(s.label)}</strong>
      <p>${esc(s.desc)}</p>
      <em>${String(i + 1).padStart(2, "0")}</em>
    </article>`).join("")}</div>
  </section>`;
}

function toolPremiumCard(spec, archetype) {
  const benefits = [
    "Unlimited daily tool runs",
    "An ad-free workspace",
    "Build and save reusable workflows",
    "Secure billing management"
  ];
  return `<section class="tool-side-card tool-upgrade-card">
    <span class="tool-side-icon">${icon("crown")}</span>
    <h2>Upgrade for more power</h2>
    <p>Unlock unlimited daily runs, an ad-free workspace and saved workflows.</p>
    <ul>${benefits.map((b) => `<li>${icon("check")}<span>${esc(b)}</span></li>`).join("")}</ul>
    <a class="btn btn-primary" href="../../../pricing.html">Creator Pro - $8 / month</a>
  </section>`;
}

function toolStatsCard() {
  const tools = `${floorTo(VK.counts.live, TOOL_ROUND_TO)}+`;
  const stats = [
    ["users", USER_DISPLAY, "Users"],
    ["grid", tools, "Tools"],
    ["zap", TASKS_DISPLAY, "Tasks"],
    ["globe", COUNTRY_DISPLAY, "Countries"]
  ];
  return `<section class="tool-side-card tool-stat-card" aria-label="Vootkit platform statistics">
    ${stats.map((s) => `<div><span>${icon(s[0])}</span><strong>${esc(s[1])}</strong><small>${esc(s[2])}</small></div>`).join("")}
  </section>`;
}

function toolSidebar(t, c, related, local, spec, archetype) {
  return `<aside class="tool-sidebar">
    ${toolPremiumCard(spec, archetype)}
    ${toolStatsCard()}
    ${related.length ? `<section class="tool-side-card">
      <div class="tool-side-head"><h2>Popular ${esc(c.name)} tools</h2><a href="../">View all ${icon("arrow-right")}</a></div>
      <div class="tool-side-list">${related.slice(0, 5).map((r) => toolMiniCard(r, "../../../")).join("")}</div>
    </section>` : ""}
    <section class="tool-side-card tool-safe-card">
      <span class="tool-side-icon">${icon("shield")}</span>
      <h2>Your files are safe with us</h2>
      <p>${local
        ? "Most of the work happens inside your browser on your own device. Vootkit does not add an upload step to this tool."
        : "This tool uses an online service for the lookup it performs. We label network-backed tools clearly before you use them."}</p>
      <a href="../../../privacy.html">Learn about privacy ${icon("arrow-right")}</a>
    </section>
  </aside>`;
}

function toolWorkspaceShell(t, c, live, local, facts, archetype, steps) {
  if (!live) return `<section class="tool-workbench tool-workbench-soon">
    <div class="ws ws-soon">
      <strong>Not built yet</strong>
      <p class="note">${esc(t.name)} is on the roadmap. The page below explains what it will do, and finished ${esc(c.name)} tools are available today.</p>
      <a class="btn" href="../">Browse ${esc(c.name)} tools</a>
    </div>
  </section>`;
  return `<section class="tool-workbench" aria-label="${esc(t.name)} workspace">
    <ol class="tool-stepper" aria-label="Tool steps">${steps.slice(0, 3).map((s, i) => `<li${i === 0 ? ' aria-current="step"' : ""}>
      <span>${i + 1}</span><strong>${esc(s.label)}</strong><small>${esc(s.desc)}</small>
    </li>`).join("")}</ol>
    <div class="tool-workgrid">
      <div class="tool-input-pane">
        <div class="ws" id="workspace" data-tool="${esc(t.id)}" data-tool-name="${esc(t.name)}" data-tool-cat="${esc(c.name)}" data-tool-archetype="${esc(archetype)}">
          <noscript><p class="note">This tool needs JavaScript because the work happens in your browser.</p></noscript>
        </div>
      </div>
      <aside class="tool-options-pane">
        <div class="tool-options-title">${icon("sliders")}<h2>${archetype === "calculator" ? "Calculation details" : "Tool options"}</h2></div>
        ${toolOptionRows(t, facts, local, archetype)}
      </aside>
    </div>
    <div class="tool-trust-strip">
      <div>${icon("shield")}<span><strong>Private by design</strong><small>${local ? "Processed on your device where possible." : "Network use is clearly labelled."}</small></span></div>
      <div>${icon("laptop")}<span><strong>Works on any device</strong><small>Desktop, tablet and mobile browsers.</small></span></div>
      <div>${icon("download")}<span><strong>No installation</strong><small>Open the page and start working.</small></span></div>
      <div>${icon("star")}<span><strong>Always free core</strong><small>Use the free plan for everyday tasks.</small></span></div>
    </div>
  </section>`;
}

function toolSafetyNote(t) {
  const notes = {
    finance: "This result is an educational estimate, not financial advice. Rates, fees, taxes and product terms vary, so compare it with the lender, provider or official documents before making a decision.",
    realestate: "Property results are planning estimates, not a valuation or lending offer. Verify local taxes, fees, rates and legal requirements with the relevant professionals.",
    tax: "This is a planning estimate, not tax or payroll advice. Rules, thresholds, deductions and employment terms vary by location and can change; verify the result with the correct authority or accountant.",
    insurance: "This result is a planning estimate, not an insurance quote or recommendation. Actual cover, exclusions, premiums and claims depend on the policy and insurer.",
    health: "This result is a general planning estimate, not a diagnosis or medical advice. Speak with a qualified professional before making significant health, diet or training changes."
  };
  const copy = notes[t.cat];
  return copy ? `<aside class="tool-safety-note" aria-label="Important information">${icon("shield")}<p><strong>Important:</strong> ${esc(copy)}</p></aside>` : "";
}

function toolPage(t) {
  const c = VK.category(t.cat);
  const url = `${SITE}/tools/${t.cat}/${t.id}/`;
  const live = t.status === "live";
  const local = t.processing !== "network";
  /* Related tools: a deep entry names its own, which lets the links cross
     categories where that is genuinely more useful (PDF compressor -> image
     compressor). Unknown or dead ids are dropped rather than rendered. */
  const deepRelated = (TOOLCONTENT[t.id] && TOOLCONTENT[t.id].related || [])
    .map((id) => VK.TOOLS.find((x) => x.id === id && x.status === "live"))
    .filter(Boolean);
  const related = deepRelated.length
    ? deepRelated.slice(0, 6)
    : VK.byCategory(t.cat).filter((x) => x.id !== t.id).slice(0, 6);

  /* Deep, tool-specific copy if we have written it. See data/tool-content.js
     for why this exists — in short, the generic template below produced 261
     pages with a median of 95 words that differed from each other, and Google
     declined to index them. */
  const deep = TOOLCONTENT[t.id] || null;

  /* Second tier: no hand-written copy, but the tool declares its own settings,
     so a real spec table can be derived from the live module at build time.
     Accurate by construction and it cannot drift — change a tool's options and
     its page updates on the next build. Tools that declare nothing readable get
     neither, and keep the generic template rather than a padded one. */
  const spec = toolRuntimeSpec(t);
  const facts = deep ? null : TOOLFACTS.factsFor(spec);
  const archetype = toolArchetype(t);
  const steps = toolStepSet(t, archetype);
  const shellTitle = toolShellTitle(t);

  const faqs = (deep ? deep.faqs : []).concat([
    { q: `Is ${t.name} free?`, a: `Yes. The Vootkit free plan includes 5 tool runs a day. Upgrade to Vootkit Pro for unlimited daily use, an ad-free workspace and saved workflows.` },
    { q: "Are my files uploaded?", a: local
        ? `No. ${t.name} runs entirely in your browser — your file is processed on your own device and never sent to a server. There is nothing for us to store or delete.`
        : `${t.name} needs the internet to work, so it calls an external service to fetch data. It does not require an account and does not track you.` },
    { q: "Do I need to install anything?", a: `No. ${t.name} works in any modern browser on desktop, tablet or phone. Open the page and start.` },
    { q: "How often can I use it? Is there a daily limit?", a: "On the free plan you get 5 tool runs a day. When you reach the limit you'll see a prompt to upgrade, and it resets the next day. Vootkit Pro removes the cap entirely for unlimited daily use." }
  ]);
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Vootkit", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Tools", item: SITE + "/tools/" },
      { "@type": "ListItem", position: 3, name: c.name, item: `${SITE}/tools/${t.cat}/` },
      { "@type": "ListItem", position: 4, name: t.name, item: url }
    ]},
    { "@context": "https://schema.org", "@type": "SoftwareApplication", name: t.name,
      applicationCategory: "UtilitiesApplication", operatingSystem: "Any (web browser)",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: t.desc, url, publisher: { "@type": "Organization", name: "Vootkit", url: SITE + "/" } },
    { "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }
  ];

  const hasVideoFx = !!VIDEOFX[t.id];
  const workspace = toolWorkspaceShell(t, c, live, local, facts, archetype, steps);
  const side = toolSidebar(t, c, related, local, spec, archetype);
  const relatedShell = toolRelatedStrip(t, c, related);
  const howShell = toolHowToCards(t, steps);

  let pageHead = head({ depth: 3, url, ads: true, ld, cat: t.cat, lang: "en", alts: altsForTool(t), bodyClass: "tool-detail-page",
    title: toolTitle(t.name, c.name),
    ogTitle: shellTitle,
    desc: `${t.desc} ${local ? "Runs in your browser" : "No install needed"}, no watermark, 5 free uses a day.` });
  // under-construction ("soon") tools are thin — keep them out of the index (AdSense quality)
  if (!live) pageHead = pageHead.replace("</head>", '<meta name="robots" content="noindex,follow">\n</head>');
  return pageHead +
`<div class="wrap section tool-page">
  <nav class="crumb" aria-label="Breadcrumb"><a href="../../../">Vootkit</a> <span aria-hidden="true">&rsaquo;</span> <a href="../../">Tools</a> <span aria-hidden="true">&rsaquo;</span> <a href="../">${esc(c.name)}</a> <span aria-hidden="true">&rsaquo;</span> <span aria-current="page">${esc(t.name)}</span></nav>

  <div class="tool-shell-layout">
    <main class="tool-main-column">
      <header class="tool-hero tool-head">
        <a class="tool-back" href="../" aria-label="Back to ${esc(c.name)} tools">${icon("arrow-left")}</a>
        <div class="tool-hero-icon">${toolIconHtml(t)}</div>
        <div class="tool-hero-copy">
          <div class="tool-hero-kicker"><span>${esc(c.name)} tool</span><span>${esc(toolOutputLabel(t, archetype))}</span></div>
          <h1 class="page-h1">${esc(shellTitle)}</h1>
          <p class="page-lede">${esc(t.desc)}</p>
          <div class="trust">${toolHeroBadges(t, local, archetype)}</div>
        </div>
        <a class="tool-help" href="#tool-faq" aria-label="Help with ${esc(t.name)}">?</a>
      </header>

      <!-- 1. workspace -->
      ${workspace}
      ${howShell}
      ${toolSafetyNote(t)}
      <section class="tool-privacy-card" aria-labelledby="tool-privacy-title">
        <span class="tool-privacy-icon">${icon("shield")}</span>
        <div><h2 id="tool-privacy-title">${local ? "Your files stay private" : "Clear about network access"}</h2>
        <p>${local ? "Your work is processed locally in your browser where possible and is never added to a Vootkit upload library." : "This tool needs an internet connection for its live lookup. Network use is clearly labelled before you begin."}</p>
        <a href="../../../privacy.html">Learn more about privacy ${icon("arrow-right")}</a></div>
      </section>
      ${relatedShell}

      <div class="tool-reading-flow">
        ${deep ? `<section class="prose">
          <p class="tool-intro">${esc(deep.intro)}</p>

          <h2>What ${esc(t.name)} does</h2>
          ${deep.what.map((p) => `<p>${p}</p>`).join("\n          ")}

          <h2>${esc(deep.specs.caption)}</h2>
          <div class="table-wrap"><table class="spec-table">
            <tbody>
            ${deep.specs.rows.map((r) => `<tr><th scope="row">${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join("\n            ")}
            </tbody>
          </table></div>

          <h2>Detailed steps</h2>
          <ol>
            ${deep.steps.map((s) => `<li>${s}</li>`).join("\n            ")}
          </ol>

          <h2>Worth knowing</h2>
          <p>${esc(deep.tip)}</p>
        </section>` : `<section class="prose">
          <h2>What ${esc(t.name)} does</h2>
          <p>${esc(t.desc)} It's one of ${VK.TOOLS.length} tools in the Vootkit ecosystem, built to do a single job properly: open it, get your result, move on.</p>
      ${facts ? `
          <h2>Settings and limits</h2>
          <div class="table-wrap"><table class="spec-table"><tbody>
            ${facts.rows.map((r) => `<tr><th scope="row">${esc(r.label)}</th><td>${esc(r.value)}</td></tr>`).join("\n            ")}
          </tbody></table></div>
      ` : ""}
          <h2>Why use this one</h2>
          <ul>
            <li><strong>${local ? "Nothing is uploaded." : "Ready straight away."}</strong> ${local ? "Your file is processed on your own device, so it never travels to a server." : "Open the page and start. There is nothing to install and nothing to configure."}</li>
            <li><strong>Free core access.</strong> Use Vootkit for everyday tasks and <a href="../../../pricing.html">upgrade to Pro</a> when you need higher limits.</li>
            <li><strong>No watermark.</strong> What you get out is what you made.</li>
            <li><strong>Works on mobile.</strong> Same tool, thumb-friendly.</li>
          </ul>

          <h2>Example</h2>
          <p>${esc(exampleFor(t, c))}</p>
        </section>`}

        <!-- in-content ad: below the article body, far from the tool controls -->
        ${adUnit("inContent")}

        <!-- 5. FAQ -->
        <section class="prose faq" id="tool-faq">
          <h2>Frequently Asked Questions</h2>
          ${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("\n          ")}
        </section>

        <!-- footer ad: end of the reading flow, before the onward links -->
        ${adUnit("footer")}

        <section class="section" id="recent-wrap" hidden>
          <h2 class="h-sm">Recently viewed</h2>
          <div class="chips" id="recent"></div>
        </section>

        <!-- 8. trust -->
        <section class="trust-note">
          <p class="note">${hasVideoFx
            ? "Your video is processed entirely in your browser. The video engine downloads once from a CDN the first time you run a tool, then works from cache. Large files are memory-bound, so keep clips reasonable."
            : local
            ? "This tool processes everything locally in your browser. You can disconnect from the internet after the page loads and it will still work."
            : "This tool calls an external service to fetch live data. It does not require an account and does not track you."}</p>
        </section>
      </div>
    </main>

    ${side}
  </div>
</div>` + foot(3, toolScripts(t));
}

/* ---------- localised tool page (one per translated locale) ---------- */
function fillStr(s, m) { return String(s == null ? "" : s).replace(/\{(\w+)\}/g, function (_, k) { return m[k] != null ? m[k] : ""; }); }
function localizedToolPage(t, c, loc) {
  const code = loc.code, C = I18N.chrome[code], TT = I18N.tools[code][t.id];
  const local = t.processing !== "network";
  const name = TT.name, desc = TT.desc;
  const M = { name: name, cat: c.name, count: VK.TOOLS.length };
  const base = "/tools/" + t.cat + "/" + t.id + "/";
  const url = SITE + "/" + code + base;
  const up = "../../../../";
  const related = VK.byCategory(t.cat).filter((x) => x.id !== t.id && x.status === "live" && I18N.tools[code] && I18N.tools[code][x.id]).slice(0, 6);
  const faqs = [
    { q: fillStr(C.faq1_q, M), a: fillStr(C.faq1_a, M) },
    { q: fillStr(C.faq2_q, M), a: fillStr(local ? C.faq2_a_local : C.faq2_a_net, M) },
    { q: fillStr(C.faq3_q, M), a: fillStr(C.faq3_a, M) },
    { q: fillStr(C.faq4_q, M), a: fillStr(C.faq4_a, M) }
  ];
  const title = name + " — " + fillStr(C.title_suffix, M);
  const metaDesc = fillStr(C.meta_desc, { desc: desc, mode: local ? C.mode_local : C.mode_net });
  const ld = [
    { "@context": "https://schema.org", "@type": "SoftwareApplication", name: name, applicationCategory: "UtilitiesApplication", operatingSystem: "Any (web browser)", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, description: desc, url, inLanguage: code },
    { "@context": "https://schema.org", "@type": "FAQPage", inLanguage: code, mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }
  ];
  let pageHead = head({ depth: 4, url, ads: true, ld, cat: t.cat, lang: code, dir: loc.dir, alts: altsForTool(t), title: title, ogTitle: name, desc: metaDesc });
  /* follow, not nofollow: the page should still pass a visitor and any crawl
     equity through to the English original rather than being a dead end. */
  if (!LOCALISED_INDEXABLE) pageHead = pageHead.replace("</head>", '<meta name="robots" content="noindex,follow">\n</head>');
  const relHtml = related.length
    ? `<section class="section"><h2 class="h-sm">${esc(fillStr(C.sec_next, M))}</h2><div class="grid">${related.map((r) => {
        const rc = CATBY[r.cat] || {}, rt = I18N.tools[code][r.id];
        return `<a class="card tool-card" data-cat="${r.cat}" href="../${r.id}/"><span class="tc-top">${toolIconHtml(r)}</span><h3>${esc(rt.name)}</h3><p>${esc(rt.desc)}</p><span class="card-foot"><span class="tc-cat">${esc(rc.name || r.cat)}</span></span></a>`;
      }).join("")}</div></section>`
    : "";
  return pageHead +
`<div class="wrap section tool-page">
  <nav class="crumb" aria-label="Breadcrumb"><a href="${up}">Vootkit</a> <span aria-hidden="true">›</span> <a href="${up}tools/">${esc(C.crumb_tools)}</a> <span aria-hidden="true">›</span> <a href="${up}tools/${t.cat}/">${esc(c.name)}</a> <span aria-hidden="true">›</span> <span aria-current="page">${esc(name)}</span></nav>
  <header class="tool-head">
    <h1 class="page-h1">${esc(name)}</h1>
    <p class="page-lede">${esc(desc)}</p>
    <div class="trust"><span class="badge">${esc(C.badge_nowatermark)}</span><span class="badge">${esc(C.badge_free)}</span></div>
  </header>
  <div class="ws" id="workspace" data-tool="${t.id}"></div>
  <section class="prose">
    <h2>${esc(fillStr(C.sec_what, M))}</h2>
    <p>${esc(fillStr(C.what_body, { desc: desc, count: VK.TOOLS.length }))}</p>
    <h2>${esc(fillStr(C.sec_why, M))}</h2>
    <ul>
      <li><strong>${esc(local ? C.why_local_b : C.why_net_b)}</strong> ${esc(local ? C.why_local_d : C.why_net_d)}</li>
      <li><strong>${esc(C.why_free_b)}</strong> ${esc(C.why_free_d)} <a href="${up}pricing.html">Pro</a></li>
      <li><strong>${esc(C.why_watermark_b)}</strong> ${esc(C.why_watermark_d)}</li>
      <li><strong>${esc(C.why_mobile_b)}</strong> ${esc(C.why_mobile_d)}</li>
    </ul>
    <h2>${esc(fillStr(C.sec_how, M))}</h2>
    <ol>
      <li>${esc(fillStr(C.how1, M))}</li>
      <li>${esc(local ? C.how2_local : C.how2_net)}</li>
      <li>${esc(C.how3)}</li>
      <li>${esc(C.how4)}</li>
    </ol>
  </section>
  <section class="prose faq">
    <h2>${esc(fillStr(C.sec_faq, M))}</h2>
    ${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("\n    ")}
  </section>
  ${relHtml}
  <section class="trust-note"><p class="note">${esc(local ? C.trust_local : C.trust_net)}</p></section>
</div>` + foot(4, toolScripts(t));
}

function exampleFor(t, c) {
  const byCat = {
    pdf: "Combining three scanned receipts into one PDF before emailing them to your accountant.",
    images: "Shrinking a 6 MB phone photo to under 500 KB so it uploads quickly to a listing.",
    video: "Cutting a 40-second highlight out of a long recording and getting it under Discord's 10 MB limit.",
    finance: "Comparing two loan offers to see which actually costs less over the full term.",
    insurance: "Sanity-checking how much cover you need before speaking to a broker.",
    realestate: "Working out whether renting or buying leaves you better off over five years.",
    tax: "Estimating your take-home pay after a raise, before you commit to anything.",
    business: "Producing a clean invoice for a client in under a minute.",
    seo: "Checking how a page title will truncate in Google before you publish it.",
    accessibility: "Confirming your brand blue passes contrast on white before it ships.",
    privacy: "Stripping location data out of a photo before posting it publicly.",
    text: "Checking an essay is under the word limit before submitting.",
    design: "Grabbing the exact hex codes from a screenshot for a brand palette.",
    developer: "Pretty-printing a messy API response so you can actually read it.",
    everyday: "Converting a recipe from cups to grams while cooking.",
    data: "Opening a CSV export and sorting it without launching a spreadsheet app.",
    ai: "Pulling the text out of a photographed page so you can search it."
  };
  return byCat[t.cat] || `Using ${t.name} to finish a task in a few seconds.`;
}

/* ---------- legal pages (required for AdSense + trust) ---------- */
function legalPage(o) {
  const url = SITE + "/" + o.file;
  const ld = { "@context": "https://schema.org", "@type": "WebPage", name: o.title, url, description: o.desc };
  return head({ depth: 0, url, ads: true, ld, title: `${o.title} — Vootkit`, desc: o.desc }) +
`<div class="wrap section tool-page">
  <nav class="crumb" aria-label="Breadcrumb"><a href="./">Vootkit</a> <span aria-hidden="true">›</span> <span aria-current="page">${esc(o.title)}</span></nav>
  <h1 class="page-h1">${esc(o.title)}</h1>
  <p class="page-lede">Last updated ${o.updated}.</p>
  <section class="prose">${o.body}</section>
</div>` + foot(0);
}

/* ---------- info pages (About, Contact, Blog) ---------- */
function infoPage(o) {
  const depth = o.depth || 0;
  const up = "../".repeat(depth) || "./";
  const url = SITE + "/" + o.slug;
  const ld = { "@context": "https://schema.org", "@type": "WebPage", name: o.title, url, description: o.desc };
  let pageHead = head({ depth, url, ads: true, ld, title: `${o.title} — Vootkit`, ogTitle: o.title, desc: o.desc });
  if (o.noindex) pageHead = pageHead.replace("</head>", '<meta name="robots" content="noindex,follow">\n</head>');
  return pageHead +
`<div class="wrap section">
  <header class="sec-head" style="margin-top:var(--s-4)">
    <span class="eyebrow">${esc(o.eyebrow || o.title)}</span>
    <h1 class="page-h1">${esc(o.h1)}</h1>
    ${o.lede ? `<p class="page-lede">${o.lede}</p>` : ""}
  </header>
  ${o.body}
</div>` + foot(depth, o.scripts, { noNewsletter: !!o.noNewsletter });
}

/* ---------- blog (Decap CMS writes markdown → content/blog/*.md) ---------- */
function parseFrontmatter(raw) {
  const m = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/.exec(raw);
  if (!m) return { data: {}, body: raw };
  const data = {};
  m[1].split(/\r?\n/).forEach((line) => {
    const mm = /^([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(line);
    if (!mm) return;
    let v = mm[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    data[mm[1]] = v;
  });
  return { data, body: m[2] };
}
function loadPosts() {
  const dir = path.join(ROOT, "content", "blog");
  let files = [];
  /* Not every .md in here is a post. A README or a notes file dropped beside
     the content would otherwise be published, indexed and put in the sitemap —
     which is exactly what happened the first time one was added. Anything
     starting with an underscore, and README itself, is treated as workspace. */
  try {
    files = fs.readdirSync(dir).filter((f) =>
      f.endsWith(".md") && f.charAt(0) !== "_" && !/^readme\.md$/i.test(f));
  } catch (e) { return []; }
  const posts = files.map((f) => {
    const { data, body } = parseFrontmatter(fs.readFileSync(path.join(dir, f), "utf8"));
    const slug = (data.slug || f.replace(/\.md$/, "")).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    const plain = body.replace(/[#>*_`~\-\[\]()!]/g, " ").split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)[0] || "";
    return {
      slug, title: data.title || slug, date: data.date || "",
      description: data.description || plain.slice(0, 160),
      thumbnail: data.thumbnail || "", author: data.author || "The Vootkit team",
      /* Reading time from the ACTUAL body, at 220wpm. Not decoration: it is
         the one number on a card that tells somebody whether they have time
         for this now, and a made-up one is worse than none. */
      words: body.split(/\s+/).filter(Boolean).length,
      draft: String(data.draft) === "true", html: marked.parse(body)
    };
  }).filter((p) => !p.draft && p.slug);
  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return posts;
}
function fmtDate(d, long) {
  if (!d) return "";
  const dt = new Date(d); if (isNaN(dt)) return String(d);
  return dt.toLocaleDateString("en-US", long ? { year: "numeric", month: "long", day: "numeric" } : { year: "numeric", month: "short", day: "numeric" });
}
function blogPostPage(post) {
  const url = `${SITE}/blog/${post.slug}/`;
  const img = post.thumbnail ? (post.thumbnail.startsWith("http") ? post.thumbnail : SITE + post.thumbnail) : "";
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Vootkit", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: SITE + "/blog/" },
      { "@type": "ListItem", position: 3, name: post.title, item: url }
    ]},
    { "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.description,
      datePublished: post.date, dateModified: post.date, image: img || undefined,
      author: { "@type": "Organization", name: post.author },
      publisher: { "@type": "Organization", name: "Vootkit", url: SITE + "/" },
      mainEntityOfPage: url, url }
  ];
  return head({ depth: 2, url, ads: true, ld, title: `${post.title} — Vootkit Blog`, ogTitle: post.title, desc: post.description, image: img || undefined }) +
`<div class="wrap section blog-post">
  <nav class="crumb" aria-label="Breadcrumb"><a href="../../">Vootkit</a> <span aria-hidden="true">›</span> <a href="../">Blog</a> <span aria-hidden="true">›</span> <span aria-current="page">${esc(post.title)}</span></nav>
  <article>
    <header class="blog-head">
      <span class="eyebrow">Blog</span>
      <h1 class="page-h1">${esc(post.title)}</h1>
      <p class="blog-meta">${post.date ? esc(fmtDate(post.date, true)) + " · " : ""}${esc(post.author)}</p>
    </header>
    ${img ? `<img class="blog-hero" src="${esc(post.thumbnail)}" alt="${esc(post.title)}" width="1200" height="630" loading="eager">` : ""}
    <div class="prose blog-body">${post.html}</div>
  </article>
  ${adUnit("footer")}
  <div class="cta-band" style="margin-top:var(--s-7);padding:var(--s-6);border:1px solid var(--line);border-radius:var(--r-lg);text-align:center">
    <h2 style="margin:0 0 var(--s-2)">Try it yourself</h2>
    <p class="page-lede" style="margin:0 auto var(--s-4)">Every Vootkit tool runs free in your browser.</p>
    <a class="btn btn-primary" href="../../tools/">Browse all tools</a>
  </div>
  <div data-newsletter="blog"></div>
</div>` + foot(2, null, { noNewsletter: true });
}
function blogIndexPage(posts) {
  const url = SITE + "/blog/";
  const hasPosts = posts.length > 0;
  const ld = { "@context": "https://schema.org", "@type": "Blog", name: "Vootkit Blog", url,
    description: "Guides, tips and product updates for Vootkit's browser-based tools.",
    blogPost: posts.slice(0, 20).map((p) => ({ "@type": "BlogPosting", headline: p.title, url: SITE + "/blog/" + p.slug + "/", datePublished: p.date })) };
  let hd = head({ depth: 1, url, ads: true, ld, title: "Vootkit Blog — Guides, tips & updates", ogTitle: "Vootkit Blog",
    desc: "Practical guides on PDF, image, video and finance tools, plus product updates from Vootkit." });
  if (!hasPosts) hd = hd.replace("</head>", '<meta name="robots" content="noindex,follow">\n</head>');

  const mins = (p) => Math.max(1, Math.round((p.words || 0) / 220));
  const meta = (p) => `<span class="bl-meta">
        <time datetime="${esc(p.date)}">${esc(fmtDate(p.date) || "")}</time>
        <span aria-hidden="true">·</span>
        <span>${mins(p)} min read</span>
      </span>`;

  /* THE LEAD POST GETS THE ROOM IT DESERVES.
   *
   * A uniform grid says every post matters equally, which is never true and
   * costs the newest piece the attention it should get. Every publication
   * worth copying leads with one story at full width and lets the rest sit in
   * a grid beneath — so the page has a shape, and a first-time reader has an
   * obvious place to start rather than twelve equal choices. */
  const lead = hasPosts ? posts[0] : null;
  const rest = hasPosts ? posts.slice(1) : [];

  const leadHtml = lead ? `
    <a class="bl-lead" href="${lead.slug}/">
      ${lead.thumbnail ? `<span class="bl-lead-img"><img src="${esc(lead.thumbnail)}" alt="" width="1200" height="630" loading="eager" decoding="async"></span>` : ""}
      <span class="bl-lead-b">
        <span class="bl-tag">Latest</span>
        <h2>${esc(lead.title)}</h2>
        <p>${esc(lead.description)}</p>
        ${meta(lead)}
        <span class="bl-more">Read it</span>
      </span>
    </a>` : "";

  const cards = rest.map((p) => `<a class="bl-card" href="${p.slug}/">
      ${p.thumbnail ? `<span class="bl-card-img"><img src="${esc(p.thumbnail)}" alt="" width="600" height="315" loading="lazy" decoding="async"></span>` : ""}
      <span class="bl-card-b">
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.description)}</p>
        ${meta(p)}
      </span>
    </a>`).join("\n");

  return hd + `<div class="wrap section">
  <header class="sec-head bl-head">
    <span class="eyebrow">Blog</span>
    <h1 class="page-h1">Guides worth the time they take</h1>
    <p class="page-lede">How to get more out of the tools — what actually shrinks a
    PDF, what a lender does with your debt-to-income ratio, and where the usual
    advice is wrong. Written by the people who build them.</p>
  </header>
  ${hasPosts ? leadHtml : ""}
  ${rest.length ? `<h2 class="bl-more-h">More from the blog</h2><div class="bl-grid">${cards}</div>` : ""}
  ${hasPosts ? "" : `<div class="cta-band" style="padding:var(--s-6);border:1px solid var(--line);border-radius:var(--r-lg);text-align:center"><h2 style="margin:0 0 var(--s-2)">New guides are coming</h2><p class="page-lede" style="margin:0 auto var(--s-4)">The best way to learn Vootkit is to use it.</p><a class="btn btn-primary" href="../tools/">Explore the tools</a></div>`}
  ${hasPosts ? `<div class="bl-nl" data-newsletter="blog_index"></div>` : ""}
</div>` + foot(1);
}

/* ---------- blog editorial rebuild (canonical definitions) ---------- */
const BLOG_AUTHORS = {
  "The Vootkit team": {
    name: "The Vootkit team",
    role: "Product and editorial team",
    bio: "Practical guides from the people building Vootkit's browser-based PDF, image, video and productivity tools.",
    initials: "VK",
    type: "Organization"
  },
  "Mr John Prosper": {
    name: "Mr John Prosper",
    role: "Founder, Vootkit",
    bio: "John writes practical finance, file and productivity guides based on the everyday problems Vootkit tools are built to solve.",
    initials: "JP",
    type: "Person"
  }
};
const BLOG_CATEGORY_INFO = {
  all: { label: "All Posts", title: "All Vootkit guides", intro: "Practical tutorials, tool guides and updates from Vootkit." },
  tutorial: { label: "Tutorials", title: "Vootkit tutorials", intro: "Step-by-step guides for getting clean results from browser tools." },
  guide: { label: "Guides", title: "Vootkit guides", intro: "Deeper practical guides for choosing settings, formats and workflows." },
  news: { label: "News", title: "Vootkit news", intro: "Relevant updates from Vootkit and the productivity-tool ecosystem." },
  tools: { label: "Tools", title: "Tool guides", intro: "How to choose the right Vootkit tool and use it well." },
  productivity: { label: "Productivity", title: "Productivity guides", intro: "Smarter ways to finish file, content and document work faster." },
  business: { label: "Business", title: "Business guides", intro: "Guides for freelancers, small teams and people managing work files." },
  finance: { label: "Finance", title: "Finance guides", intro: "Plain-English finance explainers with calculators and examples." },
  education: { label: "Education", title: "Education guides", intro: "Study, document and learning workflows for students and teachers." },
  travel: { label: "Travel", title: "Travel guides", intro: "Planning, file and trip tools for travel workflows." },
  developer: { label: "Developer", title: "Developer guides", intro: "Browser utilities, web formats and technical workflows." },
  security: { label: "Security", title: "Security guides", intro: "Privacy, safe sharing and file-protection guidance." },
  pdf: { label: "PDF", title: "PDF guides", intro: "Compress, convert, split, merge and clean PDF files without handing them to a server." },
  images: { label: "Images", title: "Image guides", intro: "Resize, compress and convert images while keeping quality under control." },
  video: { label: "Video", title: "Video guides", intro: "Compress, trim and prepare clips for upload, chat and social platforms." },
  updates: { label: "Updates", title: "Vootkit updates", intro: "Product notes and new ways to use the Vootkit toolkit." }
};
const BLOG_CATEGORY_ORDER = ["all", "tutorial", "guide", "news", "tools", "productivity", "finance", "pdf", "images", "video", "security", "business", "developer", "updates", "education", "travel"];

function blogCategoryDepth(current, posts, allPosts) {
  if (current === "all") return "";
  const info = BLOG_CATEGORY_INFO[current] || BLOG_CATEGORY_INFO.all;
  const related = allPosts.filter((p) => p.categorySlug !== current && (p.tags || []).some((tag) => {
    const n = String(tag).toLowerCase();
    return n === current || n === info.label.toLowerCase();
  })).slice(0, 3);
  const postLinks = posts.slice(0, 4).map((p) => `<li><a href="/blog/${esc(p.slug)}/">${esc(p.title)}</a></li>`).join("");
  const relatedLinks = related.map((p) => `<li><a href="/blog/${esc(p.slug)}/">${esc(p.title)}</a></li>`).join("");
  return `<section class="bl-cat-depth" aria-labelledby="bl-cat-depth-title">
    <div>
      <span class="eyebrow">Reading guide</span>
      <h2 id="bl-cat-depth-title">What this ${esc(info.label)} section covers</h2>
      <p>${esc(info.intro)} This archive is kept focused so readers can move from a broad topic to a specific tool, setting or workflow without landing on a thin tag page.</p>
      <p>Each article is written to answer a practical question: what to use, which setting matters, what the limits are, and how to avoid wasting time or damaging a file.</p>
    </div>
    <div class="bl-cat-depth-links">
      <h3>Start here</h3>
      <ul>${postLinks || '<li><a href="/blog/">Browse all Vootkit guides</a></li>'}</ul>
      ${relatedLinks ? `<h3>Related reading</h3><ul>${relatedLinks}</ul>` : ""}
    </div>
  </section>`;
}
const BLOG_META = {
  "file-upload-size-limits": {
    type: "Guide", category: "Tools", featured: true, featureRank: 1,
    thumbnail: "/assets/blog/file-upload-size-limits.jpg",
    coverAlt: "Printed documents beside a laptop, representing files prepared for upload or sharing.",
    tags: ["Productivity", "PDF", "Video", "Business"],
    relatedTools: ["compress-pdf", "compress-image", "compress-video", "trim-video"],
    relatedWorkflow: "video-compress-export"
  },
  "reduce-pdf-file-size": {
    type: "Tutorial", category: "PDF", featured: true, featureRank: 2,
    coverAlt: "PDF compression settings shown on a clean Vootkit-style workspace.",
    tags: ["Tools", "Security", "Productivity"],
    relatedTools: ["compress-pdf", "delete-pdf-pages", "extract-pdf-pages", "merge-pdf"],
    relatedWorkflow: "pdf-page-cleanup"
  },
  "compress-video-for-discord": {
    type: "Tutorial", category: "Video", featured: true, featureRank: 3,
    coverAlt: "Video editing workspace used to prepare a clip for online sharing.",
    tags: ["Tools", "Productivity"],
    relatedTools: ["compress-video", "trim-video", "video-to-gif", "upload-time"],
    relatedWorkflow: "video-compress-export"
  },
  "compress-images-without-losing-quality": {
    type: "Guide", category: "Images", featured: true, featureRank: 4,
    coverAlt: "Image compression comparison on a laptop workspace.",
    tags: ["Tools", "Developer", "Productivity"],
    relatedTools: ["compress-image", "resize-image", "convert-image", "jpg-to-webp"],
    relatedWorkflow: "website-image-optimizer"
  },
  "which-image-format-should-i-use": {
    type: "Guide", category: "Images",
    coverAlt: "Comparison graphic showing common image formats and when to use them.",
    tags: ["Tools", "Developer"],
    relatedTools: ["convert-image", "jpg-to-webp", "png-to-webp", "svg-to-png"],
    relatedWorkflow: "docs-asset-webp"
  },
  "apr-vs-interest-rate": {
    type: "Guide", category: "Finance",
    coverAlt: "Loan documents and calculator used to compare APR and interest rate.",
    tags: ["Business"],
    relatedTools: ["loan-calculator", "auto-loan-calculator", "mortgage-calculator", "refinance-calculator"]
  },
  "debt-to-income-ratio": {
    type: "Guide", category: "Finance",
    coverAlt: "Finance planning workspace for calculating debt-to-income ratio.",
    tags: ["Business"],
    relatedTools: ["debt-to-income", "mortgage-calculator", "loan-calculator", "budget-calculator"]
  },
  "insurance-deductible-break-even": {
    type: "Guide", category: "Finance",
    coverAlt: "Insurance deductible planning graphic with break-even comparison.",
    tags: ["Business"],
    relatedTools: ["deductible-calculator", "auto-insurance-estimator", "life-insurance-needs", "budget-calculator"]
  },
  "interest-rate-trap-loan-cost": {
    type: "Guide", category: "Finance",
    coverAlt: "Loan cost comparison graphic showing how rates change total repayment.",
    tags: ["Business"],
    relatedTools: ["loan-calculator", "auto-loan-calculator", "mortgage-calculator", "simple-interest"]
  },
  "welcome-to-vootkit": {
    type: "Update", category: "Updates",
    coverAlt: "Vootkit blog launch graphic.",
    tags: ["Tools", "Productivity"],
    relatedTools: ["compress-pdf", "compress-image", "compress-video", "word-counter"],
    relatedWorkflow: "website-image-optimizer"
  }
};
function slugifyText(s) {
  return String(s || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function stripHtml(s) {
  return String(s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
function plainTextFromMarkdown(body) {
  return String(body || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~|:-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function enhanceArticleHtml(html) {
  const seen = {};
  const toc = [];
  const out = String(html || "").replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (m, level, inner) => {
    const text = stripHtml(inner);
    let id = slugifyText(text) || "section";
    seen[id] = (seen[id] || 0) + 1;
    if (seen[id] > 1) id += "-" + seen[id];
    toc.push({ id, level: Number(level), text });
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
  return { html: out, toc };
}
function splitList(v) {
  if (Array.isArray(v)) return v;
  return String(v || "").split(",").map((x) => x.trim()).filter(Boolean);
}
function blogCatSlug(label) {
  const s = slugifyText(label);
  if (s === "image") return "images";
  if (s === "update") return "updates";
  if (s === "pdfs") return "pdf";
  return s || "tools";
}
function parseFrontmatter(raw) {
  const m = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/.exec(raw);
  if (!m) return { data: {}, body: raw };
  const data = {};
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const mm = /^([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(lines[i]);
    if (!mm) continue;
    let v = mm[2].trim();
    const q = v.charAt(0);
    if ((q === '"' || q === "'") && v.slice(-1) !== q) {
      while (i + 1 < lines.length && !/^[A-Za-z0-9_]+\s*:/.test(lines[i + 1])) {
        i++;
        v += " " + lines[i].trim();
        if (v.slice(-1) === q) break;
      }
    }
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    data[mm[1]] = v.startsWith("[") && v.endsWith("]")
      ? v.slice(1, -1).split(",").map((x) => x.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean)
      : v.replace(/\s+/g, " ");
  }
  return { data, body: m[2] };
}
function inferBlogMeta(slug, title) {
  const hay = (slug + " " + title).toLowerCase();
  if (/pdf/.test(hay)) return { type: "Guide", category: "PDF", tags: ["Tools"], relatedTools: ["compress-pdf", "merge-pdf", "split-pdf"] };
  if (/image|jpg|png|webp|photo/.test(hay)) return { type: "Guide", category: "Images", tags: ["Tools"], relatedTools: ["compress-image", "resize-image", "convert-image"] };
  if (/video|discord|clip/.test(hay)) return { type: "Tutorial", category: "Video", tags: ["Tools"], relatedTools: ["compress-video", "trim-video", "convert-video"] };
  if (/loan|rate|debt|deductible|interest|apr|finance/.test(hay)) return { type: "Guide", category: "Finance", tags: ["Business"], relatedTools: ["loan-calculator", "budget-calculator", "debt-to-income"] };
  return { type: "Guide", category: "Tools", tags: ["Productivity"], relatedTools: ["compress-pdf", "compress-image", "word-counter"] };
}
function blogImageVariants(src) {
  if (!src || /^https?:\/\//i.test(src)) return { src, webp: "", avif: "" };
  const clean = String(src).split("?")[0];
  const base = clean.replace(/\.(jpe?g|png|webp)$/i, "");
  const exists = (p) => p && fs.existsSync(path.join(ROOT, p.replace(/^\//, "")));
  const avif = base + ".avif";
  const webp = base + ".webp";
  return { src, avif: exists(avif) ? avif : "", webp: exists(webp) ? webp : "" };
}
function blogPicture(post, cls, loading) {
  const v = blogImageVariants(post.thumbnail || "");
  if (!v.src) return "";
  return `<picture class="${cls}">
    ${v.avif ? `<source srcset="${esc(v.avif)}" type="image/avif">` : ""}
    ${v.webp ? `<source srcset="${esc(v.webp)}" type="image/webp">` : ""}
    <img src="${esc(v.src)}" alt="${esc(post.coverAlt || post.title)}" width="1200" height="675" loading="${loading || "lazy"}" decoding="async">
  </picture>`;
}
function loadPosts() {
  const dir = path.join(ROOT, "content", "blog");
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((f) =>
      f.endsWith(".md") && f.charAt(0) !== "_" && !/^readme\.md$/i.test(f));
  } catch (e) { return []; }
  const posts = files.map((f) => {
    const { data, body } = parseFrontmatter(fs.readFileSync(path.join(dir, f), "utf8"));
    const slug = (data.slug || f.replace(/\.md$/, "")).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    const inferred = inferBlogMeta(slug, data.title || slug);
    const extra = Object.assign({}, inferred, BLOG_META[slug] || {});
    const plain = plainTextFromMarkdown(body);
    const enhanced = enhanceArticleHtml(marked.parse(body));
    const type = data.type || extra.type || "Guide";
    const category = data.category || extra.category || "Tools";
    const tags = Array.from(new Set(splitList(data.tags).concat(extra.tags || []).map((x) => String(x).trim()).filter(Boolean)));
    const filters = Array.from(new Set([type, category].concat(tags).map(blogCatSlug).filter(Boolean)));
    const words = plain.split(/\s+/).filter(Boolean).length;
    return {
      slug, title: data.title || slug, date: data.date || "",
      description: data.description || plain.slice(0, 160),
      thumbnail: extra.thumbnail || data.thumbnail || "",
      author: data.author || "The Vootkit team",
      type, typeSlug: blogCatSlug(type), category, categorySlug: blogCatSlug(category), tags, filters,
      featured: String(data.featured) === "true" || !!extra.featured,
      featureRank: Number(data.featureRank || extra.featureRank || 99),
      coverAlt: data.coverAlt || extra.coverAlt || data.title || slug,
      relatedTools: (extra.relatedTools || []).filter((id) => VK.find(id)),
      relatedWorkflow: extra.relatedWorkflow || "",
      words, minutes: Math.max(1, Math.round(words / 220)),
      bodyText: plain, draft: String(data.draft) === "true",
      html: enhanced.html, toc: enhanced.toc
    };
  }).filter((p) => !p.draft && p.slug);
  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return posts;
}
function blogAuthor(post) {
  return BLOG_AUTHORS[post.author] || { name: post.author || "The Vootkit team", role: "Author", bio: "Practical Vootkit guidance.", initials: "VK", type: "Person" };
}
function blogAuthorMark(author, small) {
  if (author.initials === "VK") {
    return `<span class="bl-author-mark${small ? " is-small" : ""}" aria-hidden="true">${brandLogo()}</span>`;
  }
  return `<span class="bl-author-mark${small ? " is-small" : ""}" aria-hidden="true">${esc(author.initials || "VK")}</span>`;
}
function blogMetaLine(post) {
  const a = blogAuthor(post);
  return `<span class="bl-byline">${blogAuthorMark(a, true)}<span>${esc(a.name)}</span></span>
    ${post.date ? `<span aria-hidden="true">&middot;</span><time datetime="${esc(post.date)}">${esc(fmtDate(post.date))}</time>` : ""}
    <span aria-hidden="true">&middot;</span><span>${post.minutes} min read</span>`;
}
function blogBadge(post, kind) {
  const label = kind === "category" ? post.category : post.type;
  return `<span class="bl-badge">${esc(label)}</span>`;
}
function blogOverlayCard(post, cls, loading) {
  return `<a class="bl-feature-card ${cls}" href="/blog/${esc(post.slug)}/" data-track="blog_feature_click">
    ${blogPicture(post, "bl-feature-media", loading)}
    <span class="bl-feature-shade"></span>
    <span class="bl-feature-body">
      ${cls.indexOf("main") > -1 ? `<span class="bl-featured-pill">Featured</span>` : ""}
      ${blogBadge(post)}
      <strong>${esc(post.title)}</strong>
      ${cls.indexOf("main") > -1 ? `<span class="bl-feature-excerpt">${esc(post.description)}</span>` : ""}
      <span class="bl-feature-meta">${blogMetaLine(post)}</span>
    </span>
  </a>`;
}
function blogArticleCard(post, index) {
  const search = [post.title, post.description, post.category, post.type].concat(post.tags).join(" ");
  return `<article class="bl-card" data-blog-card data-title="${esc(post.title)}" data-date="${esc(post.date || "")}" data-filters="${esc(post.filters.join(" "))}" data-search="${esc(search.toLowerCase())}" data-index="${index}">
    <a href="/blog/${esc(post.slug)}/" class="bl-card-link">
      ${blogPicture(post, "bl-card-img", index < 3 ? "eager" : "lazy")}
      <span class="bl-card-b">
        ${blogBadge(post)}
        <h3>${esc(post.title)}</h3>
        <p>${esc(post.description)}</p>
        <span class="bl-meta">${blogMetaLine(post)}</span>
      </span>
    </a>
  </article>`;
}
function blogSmallPost(post) {
  return `<a class="bl-side-post" href="/blog/${esc(post.slug)}/">
    ${blogPicture(post, "bl-side-thumb", "lazy")}
    <span><strong>${esc(post.title)}</strong>${post.date ? `<time datetime="${esc(post.date)}">${esc(fmtDate(post.date))}</time>` : ""}</span>
  </a>`;
}
function blogCategoryCounts(posts) {
  const counts = { all: posts.length };
  posts.forEach((p) => p.filters.forEach((f) => { counts[f] = (counts[f] || 0) + 1; }));
  return counts;
}
function blogCategoryTabs(posts, current) {
  const counts = blogCategoryCounts(posts);
  return BLOG_CATEGORY_ORDER.filter((slug) => counts[slug]).map((slug) => {
    const info = BLOG_CATEGORY_INFO[slug] || { label: slug };
    const href = slug === "all" ? "/blog/" : `/blog/${slug}/`;
    return `<a class="bl-chip${slug === current ? " is-active" : ""}" href="${href}" data-blog-filter="${slug}">${esc(info.label)} <span>${counts[slug]}</span></a>`;
  }).join("");
}
function relatedBlogPosts(post, all, limit) {
  return all.filter((p) => p.slug !== post.slug).map((p) => {
    const overlap = p.filters.filter((f) => post.filters.indexOf(f) !== -1).length;
    return { post: p, score: overlap * 10 + (p.categorySlug === post.categorySlug ? 8 : 0) + (p.typeSlug === post.typeSlug ? 2 : 0) };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || String(b.post.date).localeCompare(String(a.post.date))).slice(0, limit || 3).map((x) => x.post);
}
function articleTools(post, depth) {
  if (!post.relatedTools || !post.relatedTools.length) return "";
  const up = "../".repeat(depth) || "./";
  const cards = post.relatedTools.map((id) => {
    const t = VK.find(id);
    if (!t) return "";
    return `<a class="bl-tool-card" href="${up}tools/${esc(t.cat)}/${esc(t.id)}/" data-track="article_tool_click">
      ${toolIconHtml(t)}
      <span><strong>${esc(t.name)}</strong><small>${esc(t.desc)}</small></span>
      <b aria-hidden="true">-&gt;</b>
    </a>`;
  }).join("");
  return `<section class="bl-tool-rec" aria-labelledby="tool-rec-title">
    <div><span class="eyebrow">Vootkit tools</span><h2 id="tool-rec-title">Try the tools from this guide</h2></div>
    <div class="bl-tool-grid">${cards}</div>
  </section>`;
}
function workflowCard(post, depth) {
  if (!post.relatedWorkflow) return "";
  const up = "../".repeat(depth) || "./";
  return `<aside class="bl-workflow-rec">
    <span class="eyebrow">Workflow</span>
    <h2>Want to do this automatically?</h2>
    <p>Use a Vootkit workflow to chain compatible tools and keep the work moving without rebuilding the steps every time.</p>
    <a class="btn btn-primary" href="${up}workflows/#wf-market" data-track="article_workflow_click">Explore workflows</a>
  </aside>`;
}
function articleToc(post) {
  if (!post.toc || post.toc.length < 3) return "";
  return `<aside class="bl-toc" aria-label="Table of contents">
    <strong>On this page</strong>
    ${post.toc.slice(0, 10).map((h) => `<a class="lv${h.level}" href="#${esc(h.id)}">${esc(h.text)}</a>`).join("")}
  </aside>`;
}
function blogJsonData(posts) {
  return JSON.stringify(posts.map((p) => ({
    slug: p.slug, title: p.title, date: p.date, filters: p.filters,
    search: [p.title, p.description, p.category, p.type].concat(p.tags).join(" ").toLowerCase()
  }))).replace(/</g, "\\u003c");
}
function blogPostPage(post, allPosts) {
  const url = `${SITE}/blog/${post.slug}/`;
  const img = post.thumbnail ? (post.thumbnail.startsWith("http") ? post.thumbnail : SITE + post.thumbnail) : "";
  const author = blogAuthor(post);
  const related = relatedBlogPosts(post, allPosts || [], 3);
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Vootkit", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: SITE + "/blog/" },
      { "@type": "ListItem", position: 3, name: post.category, item: SITE + "/blog/" + post.categorySlug + "/" },
      { "@type": "ListItem", position: 4, name: post.title, item: url }
    ]},
    { "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.description,
      datePublished: post.date, dateModified: post.date, image: img || undefined,
      author: { "@type": author.type || "Person", name: author.name },
      publisher: { "@type": "Organization", name: "Vootkit", url: SITE + "/" },
      mainEntityOfPage: url, url }
  ];
  return head({ depth: 2, url, ads: true, ld, title: `${post.title} - Vootkit Blog`, ogTitle: post.title, desc: post.description, image: img || undefined }) +
`<div class="wrap section bl-article-page">
  <nav class="crumb" aria-label="Breadcrumb"><a href="../../">Home</a> <span aria-hidden="true">/</span> <a href="../">Blog</a> <span aria-hidden="true">/</span> <a href="../${esc(post.categorySlug)}/">${esc(post.category)}</a> <span aria-hidden="true">/</span> <span aria-current="page">${esc(post.title)}</span></nav>
  <div class="bl-article-layout">
    ${articleToc(post)}
    <article class="bl-article">
      <header class="bl-article-head">
        <span class="bl-badge">${esc(post.type)}</span>
        <h1>${esc(post.title)}</h1>
        <p>${esc(post.description)}</p>
        <div class="bl-article-meta">${blogMetaLine(post)}</div>
      </header>
      ${blogPicture(post, "bl-article-hero", "eager")}
      <div class="prose blog-body">${post.html}</div>
      ${articleTools(post, 2)}
      ${workflowCard(post, 2)}
      ${adUnit("footer")}
      ${related.length ? `<section class="bl-related" aria-labelledby="related-title"><h2 id="related-title">Keep reading</h2><div class="bl-related-grid">${related.map((p, i) => blogArticleCard(p, i)).join("")}</div></section>` : ""}
      <section class="bl-article-newsletter">
        <div><span class="eyebrow">Stay updated</span><h2>Work smarter with Vootkit</h2><p>Get practical guides, new tools and useful workflows in your inbox.</p></div>
        <div data-newsletter="blog" data-nl-compact data-nl-placeholder="Enter your email" data-nl-button="Subscribe"></div>
      </section>
    </article>
    <aside class="bl-author-card">
      ${blogAuthorMark(author)}
      <h2>${esc(author.name)}</h2>
      <p>${esc(author.bio)}</p>
      <div class="bl-share">
        <strong>Share</strong>
        <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title)}" rel="noopener" target="_blank">X</a>
        <a href="https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(post.title)}" rel="noopener" target="_blank">LinkedIn</a>
        <a href="mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(url)}">Email</a>
      </div>
    </aside>
  </div>
</div>` + foot(2, null, { noNewsletter: true });
}
function blogIndexPage(posts, opts) {
  const o = opts || {};
  const allPosts = o.allPosts || posts;
  const current = o.category || "all";
  const info = BLOG_CATEGORY_INFO[current] || BLOG_CATEGORY_INFO.all;
  const url = current === "all" ? SITE + "/blog/" : SITE + "/blog/" + current + "/";
  const depth = current === "all" ? 1 : 2;
  const hasPosts = posts.length > 0;
  const featured = (current === "all" ? allPosts : posts).slice().filter((p) => p.featured).sort((a, b) => a.featureRank - b.featureRank || String(b.date).localeCompare(String(a.date)));
  const heroPosts = (featured.length >= 3 ? featured.slice(0, 3) : posts.slice(0, 3));
  const lead = heroPosts[0] || posts[0] || null;
  const side = heroPosts.slice(1, 3);
  const popular = allPosts.slice().filter((p) => p.featured || p.categorySlug === "pdf" || p.categorySlug === "images").sort((a, b) => a.featureRank - b.featureRank || String(b.date).localeCompare(String(a.date))).slice(0, 5);
  const ld = { "@context": "https://schema.org", "@type": "Blog", name: "Vootkit Blog", url,
    description: "Guides, tips and product updates for Vootkit's browser-based tools.",
    blogPost: posts.slice(0, 20).map((p) => ({ "@type": "BlogPosting", headline: p.title, url: SITE + "/blog/" + p.slug + "/", datePublished: p.date })) };
  let hd = head({ depth, url, ads: true, ld,
    title: current === "all" ? "Vootkit Blog - Guides, tutorials and updates" : `${info.title} - Vootkit Blog`,
    ogTitle: current === "all" ? "Vootkit Blog" : `${info.title} - Vootkit Blog`,
    desc: current === "all" ? "Practical Vootkit guides on PDF, image, video, finance and productivity tools." : info.intro });
  if (!hasPosts) hd = hd.replace("</head>", '<meta name="robots" content="noindex,follow">\n</head>');
  const cards = posts.map((p, i) => blogArticleCard(p, i)).join("\n");
  const empty = `<div class="bl-empty" data-blog-empty hidden><h2>No articles found</h2><p>Try another search or browse the latest Vootkit guides.</p><div><a class="btn" href="/blog/">Browse all posts</a><a class="btn btn-primary" href="/tools/">Explore tools</a></div></div>`;
  return hd + `<div class="bl-page" data-blog-page data-current-filter="${esc(current)}">
  ${current === "all" ? `<section class="wrap bl-hero">
    <div class="bl-hero-copy">
      <span class="eyebrow">Vootkit Blog</span>
      <h1>Insights, tutorials &amp; <br>news for <span class="grad-text">creators.</span></h1>
      <p>Actionable tips, tool guides, practical tutorials and the latest updates to help you work smarter and create more.</p>
      <div class="bl-hero-newsletter" data-newsletter="blog_hero" data-nl-compact data-nl-placeholder="Enter your email" data-nl-button="Subscribe"></div>
      <p class="bl-newsletter-note">Get useful Vootkit guides and product updates in your inbox.</p>
    </div>
    <div class="bl-feature-grid">
      ${lead ? blogOverlayCard(lead, "is-main", "eager") : ""}
      <div class="bl-feature-stack">${side.map((p) => blogOverlayCard(p, "is-small", "eager")).join("")}</div>
    </div>
  </section>` : `<section class="wrap bl-cat-hero">
    <nav class="crumb" aria-label="Breadcrumb"><a href="../">Blog</a> <span aria-hidden="true">/</span> <span aria-current="page">${esc(info.label)}</span></nav>
    <span class="eyebrow">Vootkit Blog</span>
    <h1>${esc(info.title)}</h1>
    <p>${esc(info.intro)}</p>
  </section>`}
  <section class="wrap bl-board">
    <div class="bl-filter-row">
      <div class="bl-tabs" aria-label="Blog categories">${blogCategoryTabs(allPosts, current)}</div>
      <div class="bl-controls">
        <label class="sr-only" for="blog-search">Search articles</label>
        <input class="field bl-search" id="blog-search" type="search" placeholder="Search articles..." data-blog-search>
        <label class="sr-only" for="blog-sort">Sort articles</label>
        <select class="field bl-sort" id="blog-sort" data-blog-sort>
          <option value="latest">Latest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>
    </div>
    <div class="bl-content">
      <div>
        <p class="bl-count" data-blog-count>${posts.length} ${posts.length === 1 ? "article" : "articles"}</p>
        <div class="bl-grid" data-blog-grid>${cards}</div>
        ${blogCategoryDepth(current, posts, allPosts)}
        ${empty}
      </div>
      <aside class="bl-sidebar">
        <section class="bl-side-card">
          <h2>About Vootkit Blog</h2>
          <p>Practical tips, tutorials, tool guides and product updates designed to help creators, students and professionals work smarter.</p>
          <a href="/about.html">Learn more about Vootkit -&gt;</a>
        </section>
        ${popular.length ? `<section class="bl-side-card"><h2>Popular Posts</h2><div class="bl-side-list">${popular.map(blogSmallPost).join("")}</div></section>` : ""}
        <section class="bl-side-card bl-side-newsletter">
          <h2>Get the best content in your inbox</h2>
          <p>Join our newsletter and never miss useful Vootkit guides.</p>
          <div data-newsletter="blog_sidebar" data-nl-compact data-nl-placeholder="Enter your email" data-nl-button="Subscribe"></div>
        </section>
      </aside>
    </div>
  </section>
  <script type="application/json" id="blog-data">${blogJsonData(posts)}</script>
</div>` + foot(depth, ["assets/js/blog.js"], { noNewsletter: true });
}

/* ---------- admin Command Center (owner-only, noindex) ---------- */
function adminConsolePage(posts) {
  const url = SITE + "/admin-console/";
  const ld = { "@context": "https://schema.org", "@type": "WebPage", name: "Vootkit Command Center", url };
  let hd = head({ depth: 1, url, ads: false, ld, title: "Command Center — Vootkit", desc: "Vootkit admin command center." });
  hd = hd.replace("</head>", '<meta name="robots" content="noindex,nofollow">\n</head>');
  const data = JSON.stringify({ tools: VK.counts.live, categories: VK.CATEGORIES.length, blogPosts: posts.length });
  return hd +
`<div class="wrap section"><div id="admin-console" class="admin-console"><div class="vk-skeleton" style="height:120px;max-width:520px"></div></div></div>
<script>window.__VK_ADMIN=${data};</script>
<script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
` + foot(1, ["assets/js/admin-console.js"]);
}

/* ---------- component gallery (internal reference, noindex) ---------- */
function componentsPage() {
  const url = SITE + "/components/";
  const ld = { "@context": "https://schema.org", "@type": "WebPage", name: "Component library", url };
  let html = head({ depth: 1, url, ads: false, ld, title: "Component Library — Vootkit", desc: "Vootkit design-system components and their states." })
    .replace("</head>", '<meta name="robots" content="noindex">\n</head>');
  html += `<div class="wrap section">
  <nav class="crumb" aria-label="Breadcrumb"><a href="../">Vootkit</a> <span aria-hidden="true">›</span> <span aria-current="page">Components</span></nav>
  <h1 class="page-h1">Component library</h1>
  <p class="page-lede">The single design language. Every state, one place. See <code>docs/DESIGN_SYSTEM.md</code>.</p>

  <section class="prose"><h2>Buttons</h2></section>
  <div class="wbtns" style="margin-bottom:var(--s-6)">
    <button class="btn btn-primary" type="button">Primary</button>
    <button class="btn" type="button">Secondary</button>
    <button class="icon-btn" type="button" aria-label="Icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg></button>
  </div>

  <section class="prose"><h2>Fields</h2></section>
  <div class="wgrid2" style="margin-bottom:var(--s-6)">
    <label class="wfield"><span class="wlab">Text field</span><input class="field" type="text" placeholder="Type here"></label>
    <label class="wfield"><span class="wlab">Select</span><select class="field"><option>Option A</option><option>Option B</option></select></label>
  </div>

  <section class="prose"><h2>Stats</h2></section>
  <div class="calc-stats" style="margin-bottom:var(--s-6)">
    <div class="calc-stat"><span>Words</span><b>1,240</b></div>
    <div class="calc-stat"><span>Reading time</span><b>6 min</b></div>
    <div class="calc-stat"><span>Saved</span><b>62%</b></div>
  </div>

  <section class="prose"><h2>Notes</h2></section>
  <div style="display:grid;gap:var(--s-2);margin-bottom:var(--s-6)">
    <p class="note">A neutral note — context or guidance.</p>
    <p class="note err">An error note — something needs fixing.</p>
  </div>

  <section class="prose"><h2>Skeleton &amp; empty state</h2></section>
  <div class="wgrid2" style="margin-bottom:var(--s-6)">
    <div style="display:grid;gap:var(--s-2)"><div class="vk-skeleton" style="height:20px;width:70%"></div><div class="vk-skeleton" style="height:14px"></div><div class="vk-skeleton" style="height:14px;width:85%"></div></div>
    <div class="vk-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg><h3>Nothing here yet</h3><p class="note">Search above to find a tool.</p></div>
  </div>

  <section class="prose"><h2>Upload target</h2></section>
  <div class="vk-upload" style="margin-bottom:var(--s-6)"><strong>Choose a file or drag it here</strong><small class="note">Processed on your device — never uploaded</small></div>

  <section class="prose"><h2>Tabs</h2></section>
  <div data-tabs style="margin-bottom:var(--s-6)">
    <div role="tablist" class="wbtns" aria-label="Example tabs">
      <button class="btn" role="tab" id="t1" aria-controls="p1">Overview</button>
      <button class="btn" role="tab" id="t2" aria-controls="p2">Details</button>
    </div>
    <div role="tabpanel" id="p1" aria-labelledby="t1"><p class="note">Overview panel — arrow keys switch tabs.</p></div>
    <div role="tabpanel" id="p2" aria-labelledby="t2"><p class="note">Details panel.</p></div>
  </div>

  <section class="prose"><h2>Toast, modal &amp; command palette</h2></section>
  <div class="wbtns" style="margin-bottom:var(--s-8)">
    <button class="btn" type="button" onclick="VKUI.toast('Saved to your device',{type:'ok'})">Show toast</button>
    <button class="btn" type="button" onclick="VKUI.modal({title:'Example dialog',content:'<p class=note>Focus-trapped, ESC to close, backdrop click to dismiss.</p>'})">Open modal</button>
    <button class="btn" type="button" onclick="VKUI.openPalette&&VKUI.openPalette()">Open command palette (⌘K)</button>
  </div>
</div>` + foot(1);
  return html;
}

/* ---------- auth pages ---------- */
function authTopAction(kind) {
  if (kind === "sign-up") return '<span>Already have an account?</span> <a href="../sign-in/">Sign In</a>';
  if (kind === "sign-in") return '<span>Don\'t have an account?</span> <a href="../sign-up/">Create Account</a>';
  if (kind === "reset") return '<span>Remembered it?</span> <a href="../sign-in/">Sign In</a>';
  if (kind === "update-password") return '<span>Need a new link?</span> <a href="../reset/">Reset Password</a>';
  return '<a href="../sign-in/">Back to Sign In</a>';
}
function authHead(kind, title, desc, ld) {
  const url = `${SITE}/auth/${kind}/`;
  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="google-adsense-account" content="${PUB}">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#fbfcfe">
<meta name="color-scheme" content="light">
<script>document.documentElement.setAttribute('data-theme','light');</script>
<title>${esc(title)} - Vootkit</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Vootkit">
<meta property="og:title" content="${esc(title)} - Vootkit">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${OG_DEFAULT}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Vootkit - browser tools for files, media and everyday work">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)} - Vootkit">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${OG_DEFAULT}">
<script type="application/ld+json">${JSON.stringify(ld || { "@context": "https://schema.org", "@type": "WebPage", name: title, url })}</script>
<link rel="icon" href="../../favicon.ico" sizes="any">
<link rel="icon" href="../../assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="../../apple-touch-icon.png">
<link rel="manifest" href="../../site.webmanifest">
<link rel="stylesheet" href="../../assets/css/app.css${V}">
${consentHead()}
<!-- no ads on authentication pages -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA4}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4}');</script>
<meta name="robots" content="noindex">
</head>
<body class="auth-page auth-${kind}">
<a class="skip" href="#main">Skip to content</a>
<header class="auth-top">
  <div class="auth-top-in">
    <a class="brand auth-logo" href="../../" aria-label="Vootkit home">${brandLogo()}<span>vootkit</span></a>
    <div class="auth-top-actions">
      <button class="icon-btn auth-theme" id="theme" type="button" aria-label="Light mode enabled" hidden>
        <svg viewBox="0 0 24 24"><path d="M21 13.1A8.4 8.4 0 1 1 10.9 3a6.6 6.6 0 0 0 10.1 10.1Z"/></svg>
      </button>
      <p class="auth-switch">${authTopAction(kind)}</p>
    </div>
  </div>
</header>
<main id="main" class="auth-main" tabindex="-1">`;
}
function authFootLite() {
  return `</main>
<script>
(function(){document.documentElement.setAttribute('data-theme','light');})();
</script>
<script src="../../assets/js/track.js${V}" defer></script>
<script src="../../assets/js/consent-ui.js${V}" defer></script>
<script src="../../assets/js/supabase-config.js${V}" defer></script>
<script src="../../assets/js/auth.js${V}" defer></script>
<script src="../../assets/js/authforms.js${V}" defer></script>
</body>
</html>
`;
}
function authGlyph(g, h) {
  return `<span class="auth-ic" style="--ic-h:${h};--ic-bg:${hueFill(h)}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${GLYPH[g]}</svg></span>`;
}
function authFloat(g, h, text, cls) {
  return `<span class="auth-float ${cls}" style="--ic-h:${h};--ic-bg:${hueFill(h)}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${GLYPH[g]}</svg><b>${esc(text)}</b></span>`;
}
function authAvatarStack() {
  return `<span class="avatar-stack auth-avatar-stack" aria-hidden="true">
    ${["01","02","03","04","05"].map((n) => `<picture class="avatar-stack__item"><source srcset="../../public/images/avatars/avatar-${n}.avif" type="image/avif"><img src="../../public/images/avatars/avatar-${n}.webp" width="40" height="40" alt="" loading="lazy" decoding="async"></picture>`).join("")}
  </span>`;
}
function authBenefit(g, h, title, text) {
  return `<div class="auth-benefit">${authGlyph(g, h)}<div><b>${esc(title)}</b><span>${esc(text)}</span></div></div>`;
}
function authAudience(slug, g, h, title, text) {
  return `<a class="auth-audience-card" href="../../tools/${slug}/">${authGlyph(g, h)}<b>${esc(title)}</b><span>${esc(text)}</span></a>`;
}
function authStory(kind) {
  const badge = kind === "sign-in" ? "Welcome back to Vootkit" : "Join people using Vootkit worldwide";
  return `<section class="auth-story auth-story-main" aria-labelledby="auth-story-title">
    <div class="auth-decor" aria-hidden="true">
      ${authFloat("page", 4, "PDF", "float-pdf")}
      ${authFloat("square", 152, "Data", "float-data")}
      ${authFloat("image", 216, "Image", "float-image")}
      ${authFloat("code", 268, "Code", "float-code")}
      ${authFloat("calc", 32, "Calc", "float-calc")}
    </div>
    <span class="auth-badge">${authGlyph("wand", 284)}<span>${badge}</span></span>
    <h1 id="auth-story-title">Powerful tools.<br>Limitless <span>possibilities.</span></h1>
    <p>Create, convert, calculate, automate and get more done with Vootkit's growing collection of online tools.</p>
    <div class="auth-benefits">
      ${authBenefit("shield", 142, "Free tools", "Start without Premium.")}
      ${authBenefit("lock", 4, "Private", "Most files process on-device.")}
      ${authBenefit("timer", 340, "Fast", "No extra software needed.")}
      ${authBenefit("wallet", 152, "No card", "Start without payment.")}
    </div>
  </section>
  <section class="auth-story auth-story-support" aria-labelledby="auth-audience-title">
    <h2 id="auth-audience-title">Built for everyone</h2>
    <div class="auth-audience-grid">
      ${authAudience("education", "book", 190, "Students", "Study, calculate, convert files and organize work.")}
      ${authAudience("business", "wallet", 216, "Businesses", "Create documents, calculate costs and improve workflows.")}
      ${authAudience("finance", "money", 152, "Finance", "Calculate, compare and make informed financial decisions.")}
      ${authAudience("travel", "plane", 190, "Travel & Tourism", "Plan trips, calculate travel costs and organize itineraries.")}
      ${authAudience("pdf", "page", 4, "PDF & Documents", "Convert, merge, compress and edit documents.")}
      ${authAudience("images", "image", 216, "Images & Media", "Convert, resize, compress and improve media.")}
      ${authAudience("developer", "code", 268, "Developers", "Format, test, encode and work with developer utilities.")}
      ${authAudience("everyday", "timer", 340, "Productivity", "Complete everyday digital tasks faster.")}
    </div>
    <div class="auth-proof">
      <div class="auth-proof-copy">
        <span class="auth-quote" aria-hidden="true">"</span>
        <p>Vootkit gives everyday work a cleaner place to happen, from quick file fixes to repeat workflows.</p>
        <div>${authAvatarStack()}<span>${USER_DISPLAY} users across ${COUNTRY_DISPLAY} countries</span></div>
      </div>
      <div class="auth-proof-card">
        ${authGlyph("shield", 142)}
        <b>Free to start</b>
        <span>Access useful tools in seconds.</span>
      </div>
    </div>
  </section>`;
}
function googleButton(label = "Continue with Google") {
  return `<div class="auth-oauth">
    <button class="auth-google" type="button" data-oauth="google">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h6c-.3 1.4-1 2.6-2.3 3.4v2.8h3.6c2.1-1.9 3.3-4.8 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.6-1 7.4-2.8l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H1.9v2.9C3.7 20.5 7.5 23 12 23z"/><path fill="#FBBC05" d="M5.7 13.9c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V6.8H1.9C1.1 8.3.7 10.1.7 11.8s.4 3.5 1.2 5z"/><path fill="#EA4335" d="M12 4.7c1.6 0 3.1.6 4.2 1.7l3.1-3.1C17.6 1.5 15 .5 12 .5 7.5.5 3.7 3 1.9 6.8l3.8 2.9C6.6 6.7 9.1 4.7 12 4.7z"/></svg>
      <span>${esc(label)}</span>
    </button>
  </div>`;
}
function authDivider(label) {
  return `<div class="auth-or"><span>${esc(label)}</span></div>`;
}
function authInput(id, type, label, placeholder, autocomplete, iconName, required) {
  return `<label class="auth-field" for="${id}"><span>${esc(label)}</span><span class="auth-input">${authGlyph(iconName, 216)}<input id="${id}" type="${type}" placeholder="${esc(placeholder)}" autocomplete="${autocomplete}"${required ? " required" : ""}></span></label>`;
}
function authPassword(id, label, autocomplete) {
  const placeholder = autocomplete === "current-password" ? "Enter your password" : "Create a strong password";
  return `<label class="auth-field" for="${id}"><span>${esc(label)}</span><span class="auth-input auth-password">${authGlyph("lock", 4)}<input id="${id}" type="password" placeholder="${esc(placeholder)}" autocomplete="${autocomplete}" required aria-describedby="password-rules"><button type="button" class="auth-eye" data-toggle-password aria-label="Show password" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button></span></label>`;
}
function passwordRules() {
  return `<ul class="auth-password-rules" id="password-rules">
    <li data-pass-rule="length">${authGlyph("shield", 142)}<span>8+ characters</span></li>
    <li data-pass-rule="number">${authGlyph("shield", 142)}<span>One number</span></li>
    <li data-pass-rule="letter">${authGlyph("shield", 142)}<span>One letter</span></li>
  </ul>`;
}
function authWhy() {
  return `<div class="auth-why" aria-label="Why create a Vootkit account">
    <b>Why sign up?</b>
    <div>
      <span>${authGlyph("shield", 142)}<em>Save preferences</em></span>
      <span>${authGlyph("clock", 340)}<em>Access recent activity</em></span>
      <span>${authGlyph("globe", 190)}<em>Use across devices</em></span>
      <span>${authGlyph("heart", 340)}<em>Free account available</em></span>
    </div>
  </div>`;
}
function authBottomTrust() {
  return `<div class="auth-bottom-trust" aria-label="Vootkit account trust">
    <span>${authGlyph("timer", 340)} Fast account setup</span>
    <span>${authGlyph("shield", 142)} Most file tools run on your device</span>
    <span>${authGlyph("globe", 190)} Works on any device</span>
    <span>${authGlyph("lock", 4)} Your data stays protected</span>
  </div>`;
}
function authPanel(kind, inner) {
  const dataAuth = kind === "sign-in" ? "signin" : kind === "sign-up" ? "signup" : kind === "reset" ? "reset" : kind === "update-password" ? "update" : "callback";
  return `<section class="auth-panel" aria-label="${esc(kind)} form">
    <div class="auth-card" data-auth="${dataAuth}">
      ${inner}
      <p class="auth-msg note" role="status" aria-live="polite" hidden></p>
    </div>
  </section>`;
}
function authShell(kind, title, desc, card) {
  const ld = { "@context": "https://schema.org", "@type": "WebPage", name: title, url: `${SITE}/auth/${kind}/` };
  return authHead(kind, title, desc, ld) +
`<div class="auth-shell">
  ${authStory(kind)}
  ${authPanel(kind, card)}
</div>
${authBottomTrust()}` + authFootLite();
}
function pageSignIn() {
  return authShell("sign-in", "Sign in", "Sign in to your Vootkit account to sync favorites and history.", `
    <header class="auth-card-head"><h1>Welcome back</h1><p>Sign in to your account</p></header>
    ${googleButton()}
    ${authDivider("or sign in with email")}
    <form class="auth-form" novalidate>
      ${authInput("email", "email", "Email Address", "Enter your email address", "email", "mail", true)}
      ${authPassword("password", "Password", "current-password")}
      <div class="auth-row"><label class="auth-remember"><input type="checkbox" id="remember"> <span>Remember me</span></label><a href="../reset/">Forgot password?</a></div>
      <button class="auth-submit" type="submit">Sign In</button>
    </form>
    <p class="auth-alt">Don't have an account? <a href="../sign-up/">Create account</a></p>`);
}
function pageSignUp() {
  return authShell("sign-up", "Create account", "Create a free Vootkit account to sync favorites and history across devices.", `
    <header class="auth-card-head"><h1>Create your<br>free account</h1><p>Start organizing, compressing and sharing in minutes.</p></header>
    ${googleButton("Sign up with Google")}
    ${authDivider("or sign up with email")}
    <form class="auth-form" novalidate>
      ${authInput("name", "text", "Full Name", "Enter your full name", "name", "user", false)}
      ${authInput("email", "email", "Email Address", "Enter your email address", "email", "mail", true)}
      ${authPassword("password", "Password", "new-password")}
      ${passwordRules()}
      <label class="auth-agree"><input type="checkbox" required> <span>I agree to the <a href="../../terms.html">Terms of Service</a> and <a href="../../privacy.html">Privacy Policy</a></span></label>
      <button class="auth-submit" type="submit">Create Account</button>
    </form>
    <div class="auth-success" data-success="verify" hidden>
      ${authGlyph("mail", 268)}
      <h2>Check your email</h2>
      <p>We've sent a verification link to your email address.</p>
      <div class="auth-privacy-note">Your privacy is important.<br><small>We'll never share your email with anyone.</small></div>
      <a class="btn btn-primary" href="../sign-in/">Back to Sign In</a>
    </div>
    <p class="auth-alt">Already have an account? <a href="../sign-in/">Sign in</a></p>
    <div class="auth-free-badge">🎁 <span>5 free tasks every day</span></div>`);
}
function pageReset() {
  return authShell("reset", "Reset password", "Reset your Vootkit account password.", `
    <header class="auth-card-head"><h1>Reset your password</h1><p>Enter your email and we'll send you a password reset link.</p></header>
    <form class="auth-form" novalidate>
      ${authInput("email", "email", "Email Address", "Enter your email address", "email", "mail", true)}
      <button class="auth-submit" type="submit">Send Reset Link</button>
    </form>
    <div class="auth-success" data-success="reset" hidden>
      ${authGlyph("mail", 268)}
      <h2>Email sent!</h2>
      <p>If an account exists for that email, we sent password reset instructions.</p>
      <a class="btn btn-primary" href="../sign-in/">Back to Sign In</a>
    </div>
    <p class="auth-alt"><a href="../sign-in/">Back to Sign In</a></p>`);
}
function pageUpdatePassword() {
  return authShell("update-password", "Set new password", "Set a new password for your Vootkit account.", `
    <header class="auth-card-head"><h1>Set a new password</h1><p>Choose a new password for your Vootkit account.</p></header>
    <form class="auth-form" novalidate>
      ${authPassword("password", "New Password", "new-password")}
      ${passwordRules()}
      <button class="auth-submit" type="submit">Save New Password</button>
    </form>`);
}
function pageCallback() {
  return authShell("callback", "Signing you in", "Completing sign-in.", `
    <header class="auth-card-head"><h1>Signing you in...</h1><p>One moment while we confirm your account.</p></header>
    <div class="auth-loading" aria-hidden="true"><span></span><span></span><span></span></div>
    <p class="auth-alt"><a href="../sign-in/">Back to Sign In</a></p>`);
}

/* ---------- account / dashboard ---------- */
function accountPage(isPreview) {
  const preview = isPreview === true;
  const url = `${SITE}/${preview ? "account-preview" : "account"}/`;
  const ld = { "@context": "https://schema.org", "@type": "WebPage", name: "Your account", url };
  return head({ depth: 1, url, ads: false, ld, bodyClass: "account-ref", title: "Account & Settings — Vootkit", desc: "Manage your Vootkit profile, subscription, privacy preferences, active sessions and account settings." })
    .replace("</head>", '<meta name="robots" content="noindex">\n</head>') +
`<div class="wrap section">
  <div id="account" class="acct"${preview ? ' data-account-preview="true"' : ""}>
    <div class="vk-skeleton" style="height:80px;max-width:420px"></div>
  </div>
</div>
<nav class="acct-bottom-nav" aria-label="Account navigation">
  <a href="../"><span aria-hidden="true">⌂</span><small>Home</small></a>
  <a href="../tools/"><span aria-hidden="true">▦</span><small>Tools</small></a>
  <a href="../workflows/"><span aria-hidden="true">⌘</span><small>Workflows</small></a>
  <a class="is-active" href="./" aria-current="page"><span aria-hidden="true">□</span><small>Account</small></a>
</nav>` + foot(1, ["assets/js/account.js"]);
}

/* ---------- pricing (static, Stripe-ready) ---------- */
/* ---------- Pro hero (pricing page) ----------
 *
 * Built from the design brief. Two things were changed from the mockup, both
 * deliberately:
 *
 * THE FEATURE COPY. The drawing promised workflow automation, chained
 * utilities, saved configurations, local dev tooling, bulk operations, no
 * throttling and end-to-end encryption. Checked against data/catalog.js: none
 * of those exist. This is the page that takes a card payment, so the three
 * columns now describe what Pro genuinely delivers today. The privacy line is
 * the interesting one — "files never leave your device" is a stronger claim
 * than "encrypted", because there is nothing in transit to encrypt.
 *
 * THE PLACEMENT. This is the pricing page rather than the homepage. AdSense
 * rejected the site on 8 Aug and a re-review is days away; a homepage whose
 * only call to action is Upgrade, and which sells "zero ads" as a feature,
 * is the first thing a reviewer would open. On a pricing page an upgrade
 * pitch is exactly what anyone expects to find.
 */
function proIllustration(up) {
  /* A real illustration now, generated to a brief and cropped to its content.
   *
   * WHY THIS REPLACED THE INLINE SVG. The SVG was a stand-in that never worked:
   * it was drawn in var(--surface) over var(--line) — white cards with hairline
   * borders — sitting on a white hero, so even with every token resolving it
   * was very nearly invisible. You cannot build a picture out of the same
   * colour as the thing it sits on.
   *
   * WHY IT IS MASKED RATHER THAN FRAMED. The source has a soft grey vignette
   * background, and the hero has a faint blue wash over white. Dropped in flat,
   * the two greys meet along a visible rectangle. A radial mask fades the outer
   * edge to nothing, so the picture dissolves into the page instead of being
   * pasted onto it — and it keeps working if the hero tint ever changes.
   *
   * 14 KB as WebP, 42 KB as the JPEG fallback, on the page people arrive at to
   * spend money. It is also NOT lazy-loaded: it is above the fold here, and a
   * lazy hero image is a blank space during the first paint that matters most.
   */
  const b = (up || "") + "assets/pro-hero";
  return `<picture class="pro-art">
    <source srcset="${b}.webp" type="image/webp">
    <img src="${b}.jpg" width="1160" height="725" decoding="async"
         alt="Translucent glass panels stacked in a diagonal column beside a phone, lit from below in blue.">
  </picture>`;
}

function proFeature(icon, title, body) {
  return `<div class="pro-feat">
    <span class="pro-ico" aria-hidden="true">${icon}</span>
    <h3>${title}</h3>
    <p>${body}</p>
  </div>`;
}

function proHero() {
  const ICO = {
    infinity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6.5 9a3 3 0 1 0 0 6c2.5 0 3.5-3 5.5-3s3 3 5.5 3a3 3 0 1 0 0-6c-2.5 0-3.5 3-5.5 3S9 9 6.5 9Z"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/><path d="M9 12l2 2 4-4"/></svg>'
  };
  return `<section class="pro-hero">
  <div class="wrap pro-hero-grid">
    <div class="pro-hero-copy">
      <h1>Unlock the full Vootkit toolkit</h1>
      <p class="pro-lede">Every one of the ${floorTo(VK.counts.live, TOOL_ROUND_TO)}+ tools, without the daily cap and without ads.
      The same browser-based processing, running as fast as your machine will go.</p>
      <a class="btn btn-primary pro-cta" href="#plans" data-vk-track="upgrade_click">Upgrade to Vootkit Pro</a>
      <p class="pro-note">Cancel any time. The free plan keeps working either way.</p>
    </div>
    <div class="pro-hero-art">${proIllustration("./")}</div>
  </div>
  <div class="wrap pro-feats">
    ${proFeature(ICO.infinity, "Unlimited daily runs",
      "The free plan includes " + CFG.freeLimit.count + " tool runs a day. Pro removes the cap entirely — no counter, no waiting until tomorrow, across every tool on the site.")}
    ${proFeature(ICO.bolt, "Priority processing",
      "Longer video encodes and larger batches, with the size ceilings raised. Everything still runs on your own machine, so the only limit left is the machine.")}
    ${proFeature(ICO.shield, "Ad-free, and private by design",
      "No ads anywhere in the workspace. Your files are processed in the browser tab and never uploaded — there is nothing on a server to leak, sell or subpoena.")}
  </div>
</section>`;
}

function pricingPage() {
  const url = SITE + "/pricing.html";
  const P = CFG.stripe.plans;
  const ld = [
    { "@context": "https://schema.org", "@type": "WebPage", name: "Pricing", url, description: "Vootkit pricing — start free with 5 tool runs a day. Upgrade to Creator Pro for unlimited usage, an ad-free workspace and saved workflows." },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Vootkit", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Pricing", item: url }
    ]},
    { "@context": "https://schema.org", "@type": "Product", name: "Vootkit", url,
      description: "Browser-based productivity tools with Free and Creator Pro plans.",
      brand: { "@type": "Brand", name: "Vootkit" },
      offers: [
        { "@type": "Offer", name: "Free", price: 0, priceCurrency: "USD", availability: "https://schema.org/InStock", url: SITE + "/auth/sign-up/" },
        { "@type": "Offer", name: "Creator Pro monthly", price: P.creator_pro_monthly.amount, priceCurrency: "USD", availability: "https://schema.org/InStock", url }
      ] }
  ];
  const annualSaving = Math.round((1 - P.creator_pro_annual.amount / (P.creator_pro_monthly.amount * 12)) * 100);
  const feat = (on, txt) => `<li class="${on ? "yes" : "no"}"><svg viewBox="0 0 24 24" aria-hidden="true">${on ? '<path d="M20 6 9 17l-5-5"/>' : '<path d="M6 6l12 12M18 6 6 18"/>'}</svg>${txt}</li>`;
  const yn = (v) => v === true ? '<span class="cmp-yes" aria-label="Included">✓</span>' : v === false ? '<span class="cmp-no" aria-label="Not included">—</span>' : v;
  return head({ depth: 0, url, ads: true, ld, bodyClass: "pricing-ref", title: "Vootkit Pricing: Free & Creator Pro Plans", ogTitle: "Vootkit Pricing — Free and Creator Pro", desc: "Start free with 5 tool runs a day. Upgrade to Creator Pro for unlimited usage, an ad-free workspace and saved workflows." }) +
`<div class="wrap section" id="plans">
  <header class="sec-head" style="margin-top:var(--s-4)">
    <span class="pricing-kicker">Simple, transparent pricing</span>
    <h1 class="page-h1">Choose the plan that<br>fits how you work.</h1>
    <p class="page-lede">Start free, upgrade when you need unlimited access, and manage everything from your account.</p>
  </header>

  <div class="bill-toggle" role="group" aria-label="Billing period">
    <button class="bt-opt is-on" type="button" data-bill="month" aria-pressed="true">Monthly</button>
    <button class="bt-opt" type="button" data-bill="year" aria-pressed="false">Yearly <span class="bt-save">Save ${annualSaving}%</span></button>
  </div>

  <div class="pricing-highlights" aria-label="Benefits included with Vootkit">
    <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg><b>No card for Free</b></span>
    <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.4 7.7 8 8 4.6-.3 8-3 8-8V6z"/></svg><b>Private browser processing</b></span>
    <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12a6 6 0 1 0 2-4.5M6 4v5h5"/></svg><b>Cancel anytime</b></span>
  </div>

  <div class="plans">
    <div class="plan">
      <span class="plan-kicker">Starter</span>
      <h2>Free</h2>
      <p class="plan-price"><span class="plan-amt">$0</span></p>
      <p class="plan-tag">A complete starting point for occasional tasks, quick conversions and everyday calculations.</p>
      <p class="plan-detail">Use Vootkit without entering payment details. You receive five completed tool runs every day, with the same privacy-first browser processing used across the platform.</p>
      <a class="btn btn-block" href="auth/sign-up/">Start free</a>
      <p class="plan-includes">Everything you need to get started:</p>
      <ul class="plan-feats">
        ${feat(true, "5 completed tool runs every day")}
        ${feat(true, "Access to 250+ browser-based tools")}
        ${feat(true, "Private on-device processing for most tools")}
        ${feat(true, "PDF, image, video, finance and developer tools")}
        ${feat(true, "No credit card required")}
      </ul>
    </div>

    <div class="plan plan--featured">
      <span class="plan-flag">Most popular</span>
      <span class="plan-kicker">For individuals</span>
      <h2>Creator Pro</h2>
      <p class="plan-price"><span class="plan-amt" data-price="pro">$${P.creator_pro_monthly.amount}</span><span class="plan-per" data-per="pro">/month</span></p>
      <p class="plan-tag">For creators, students and professionals who rely on Vootkit throughout their workday.</p>
      <p class="plan-detail">Remove the daily counter, keep your workspace distraction-free and build reusable workflows that connect several tools into one repeatable process.</p>
      <button class="btn btn-primary btn-block" type="button" data-plan="creator_pro" data-plan-month="creator_pro_monthly" data-plan-year="creator_pro_annual">Get Pro</button>
      <p class="plan-includes">Everything in Free, plus:</p>
      <ul class="plan-feats">
        ${feat(true, "Unlimited tool runs across the platform")}
        ${feat(true, "Completely ad-free Vootkit workspace")}
        ${feat(true, "Build and save reusable multi-step workflows")}
        ${feat(true, "Private browser processing for most tools")}
        ${feat(true, "Secure Stripe invoices and billing management")}
        ${feat(true, "Cancel anytime and keep Pro through the paid period")}
      </ul>
    </div>
  </div>

  <section class="pricing-compare">
    <div class="sec-head"><h2>Compare the essentials</h2></div>
    <div class="cmp-wrap">
      <table class="cmp-table">
        <thead><tr><th scope="col" style="text-align:left">Feature</th><th scope="col">Free</th><th scope="col" class="cmp-hi">Creator Pro</th></tr></thead>
        <tbody>
          <tr><th scope="row">Daily tool runs</th><td>5 / day</td><td class="cmp-hi">Unlimited</td></tr>
          <tr><th scope="row">Saved workflows</th><td>${yn(false)}</td><td class="cmp-hi">${yn(true)}</td></tr>
          <tr><th scope="row">Workspace ads</th><td>Included</td><td class="cmp-hi">None</td></tr>
          <tr><th scope="row">Browser processing</th><td>${yn(true)}</td><td class="cmp-hi">${yn(true)}</td></tr>
          <tr><th scope="row">Billing management</th><td>${yn(false)}</td><td class="cmp-hi">Stripe portal</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="pricing-privacy"><div class="privacy-shield" aria-hidden="true"><svg viewBox="0 0 96 96"><path d="M48 10 18 22v23c0 20 12 34 30 41 18-7 30-21 30-41V22z"/><rect x="34" y="43" width="28" height="23" rx="5"/><path d="M40 43v-7a8 8 0 0 1 16 0v7"/></svg></div><div><h2>Your files stay yours</h2><p>Most tools process files directly on your device, on every plan.</p><small>Network-backed tools are clearly labelled before you use them.</small></div></section>
  <section class="prose faq pricing-faq" style="margin-top:var(--s-6)">
    <h2>Frequently asked questions</h2>
    <details><summary>Do I need a card for Free?</summary><p>No. Start with the free plan without adding payment details.</p></details>
    <details><summary>What counts as a task?</summary><p>A processing action such as converting, compressing or exporting a file counts as one task.</p></details>
    <details><summary>Are my files uploaded?</summary><p>Most Vootkit tools process files locally on your device. Network-backed tools are clearly labelled.</p></details>
    <details><summary>Can I cancel later?</summary><p>Yes. Open Subscription in your account, choose Manage billing and cancel securely in Stripe. You keep Pro until the end of the paid period.</p></details>
  </section>
  <section class="pricing-cta"><span aria-hidden="true">✦</span><h2>Start free.<br>Upgrade only when you need more.</h2><p>No card required for the Free plan.</p><a class="btn btn-primary" href="tools/">Open Vootkit</a></section>
</div>` + foot(0, ["assets/js/pricing.js"]);
}

function templatesPage() {
  const url = SITE + "/templates/";
  const ids = [
    "invoice-generator", "resume-builder", "proposal-generator",
    "business-card-maker", "swot-generator", "packing-list"
  ];
  const cards = ids.map((id) => VK.find(id)).filter(Boolean).map((t) => {
    const c = VK.category(t.cat) || { name: t.cat };
    return `<a class="card tool-card" data-cat="${t.cat}" href="../tools/${t.cat}/${t.id}/">
      <span class="tc-top">${toolIconHtml(t)}<span class="tc-tags"><span class="pill pill-new">Template</span></span></span>
      <h3>${esc(t.name)}</h3>
      <p>${esc(t.desc)}</p>
      <span class="card-foot"><span class="tc-cat">${esc(c.name)}</span></span>
    </a>`;
  }).join("");
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Vootkit", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Templates", item: url }
    ]},
    { "@context": "https://schema.org", "@type": "CollectionPage", name: "Vootkit templates", url,
      description: "Ready-to-use template tools for invoices, resumes, proposals, business cards, packing lists and planning." }
  ];
  return head({ depth: 1, url, ads: true, ld,
    title: "Templates - Vootkit",
    ogTitle: "Vootkit Templates",
    desc: "Start from practical Vootkit templates for invoices, resumes, proposals, business cards, packing lists and planning." }) +
`<div class="wrap section">
  <nav class="crumb" aria-label="Breadcrumb"><a href="../">Vootkit</a> <span aria-hidden="true">/</span> <span aria-current="page">Templates</span></nav>
  <h1 class="page-h1">Templates</h1>
  <p class="page-lede">Reusable starting points powered by real Vootkit tools. Pick one, fill it in, and download the result in your browser.</p>
  <div class="grid">${cards}</div>
  <section class="cat-depth section" aria-labelledby="templates-guide-title">
    <div class="cat-depth-head">
      <span class="eyebrow">Template guide</span>
      <h2 id="templates-guide-title">Use templates when the structure matters</h2>
      <p>Templates are Vootkit tools with a useful starting structure already in place. They are best for tasks where a blank page slows you down: invoices need line items and totals, resumes need clean sections, proposals need scope and deliverables, and packing lists need categories you can actually check off.</p>
    </div>
    <div class="cat-depth-advice">
      <div>
        <h2>How to choose a template</h2>
        <ul>
          <li>Pick the result you need first: a document, checklist, printable card, business analysis or client-ready file.</li>
          <li>Open the template tool and replace the sample fields with your own details before downloading.</li>
          <li>Use related tools after export when you need another step, such as compressing a PDF or turning an image into a shareable format.</li>
        </ul>
      </div>
      <div class="cat-depth-note">
        <h2>Built from real tools</h2>
        <p>These are not empty showcase cards. Each template links to an actual Vootkit tool page with its own controls, limits, privacy notes and result handling, so the template page stays useful even as the library grows.</p>
      </div>
    </div>
    <section class="cat-depth-faq faq" aria-labelledby="templates-faq-title">
      <h2 id="templates-faq-title">Template questions</h2>
      <details><summary>Are templates different from tools?</summary><p>A template is a tool with a practical starting format. The same browser-based processing rules apply, and each linked page explains what happens to your data.</p></details>
      <details><summary>Can I edit the result?</summary><p>Yes. Template tools are meant to be filled in, adjusted, previewed and downloaded. If the result is a PDF or image, you can continue with related Vootkit tools afterward.</p></details>
      <details><summary>Why are there fewer templates than tools?</summary><p>Only tools that naturally benefit from a reusable starting structure belong here. The full directory stays on the All Tools page, while this page focuses on repeatable document, business and planning formats.</p></details>
    </section>
  </section>
</div>` + foot(1);
}

const LAST_UPDATED = "22 July 2026";
const TRUST_CONTENT_UPDATED = "2026-08-20";

write("pricing.html", pricingPage());
write("templates/index.html", templatesPage());
write("auth/sign-in/index.html", pageSignIn());
write("auth/sign-up/index.html", pageSignUp());
write("auth/reset/index.html", pageReset());
write("auth/update-password/index.html", pageUpdatePassword());
write("auth/callback/index.html", pageCallback());
write("account/index.html", accountPage(false));
write("account-preview/index.html", accountPage(true));
write("privacy.html", legalPage({
  file: "privacy.html", title: "Privacy Policy", updated: LAST_UPDATED,
  desc: "How Vootkit handles your data. Most tools process files entirely in your browser and never upload them.",
  body: `
    <h2>The short version</h2>
    <p><strong>Most Vootkit tools never send your files anywhere.</strong> They run inside your browser using your own device's processing power. When a tool is local, your file is not uploaded, not stored, and not seen by us — there is nothing for us to keep or delete.</p>
    <p>Two tools genuinely need the internet and cannot work without it: the <strong>Currency Converter</strong>, which fetches live exchange rates, and the <strong>URL Shortener</strong>, which has to register the short link somewhere. Both say so on their own pages. Every other tool works without sending anything to us.</p>

    <h2 id="security">Security and local processing</h2>
    <p>Local file tools process compatible files inside your browser tab, which reduces exposure by avoiding a file upload to Vootkit. Keep your browser and device updated, download results only to a device you trust, and use password protection or encryption when a document contains sensitive information.</p>

    <h2>What we collect</h2>
    <ul>
      <li><strong>Files you process with local tools:</strong> nothing. They never leave your device.</li>
      <li><strong>Data sent by network tools:</strong> only what the tool needs to answer your request (for example, a city name for a weather lookup, or a URL you asked us to fetch). We do not build a profile from it.</li>
      <li><strong>Preferences:</strong> your theme choice, recently used tools and favourites are stored in your browser's local storage. They stay on your device and are never transmitted to us. Clearing your browser data removes them.</li>
      <li><strong>Analytics:</strong> we use privacy-respecting aggregate analytics to understand which tools are used, so we know what to build next. This does not identify you personally.</li>
    </ul>

    <h2>Advertising</h2>
    <p>Vootkit is free and supported by advertising on category and information pages. <strong>We never place ads inside a working tool.</strong> Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this and other websites. You can opt out of personalised advertising through <a href="https://www.google.com/settings/ads" rel="nofollow noopener">Google Ads Settings</a>, or opt out of third-party vendor cookies at <a href="https://www.aboutads.info/choices/" rel="nofollow noopener">aboutads.info</a>.</p>

    <h2>Cookies</h2>
    <p>We use cookies for advertising (as above) and basic analytics. We do not use cookies to track you across unrelated sites for our own purposes.</p>

    <h2>Children</h2>
    <p>Vootkit is not directed at children under 13 and we do not knowingly collect personal information from them.</p>

    <h2>Your rights</h2>
    <p>Because local tools collect nothing, there is usually no personal data of yours for us to export or erase. For anything we do hold, you can contact us to request access or deletion.</p>

    <h2>Changes</h2>
    <p>If this policy changes materially, we will update the date at the top of this page.</p>

    <h2>Contact</h2>
    <p>Questions about privacy: <a href="mailto:vootkit1@gmail.com">vootkit1@gmail.com</a></p>

    <p class="note" style="margin-top:var(--s-6)">This policy describes our actual technical behaviour in plain language. It is not legal advice, and if you operate in a regulated market you should have your own counsel review it.</p>`
}));

write("terms.html", legalPage({
  file: "terms.html", title: "Terms of Use", updated: LAST_UPDATED,
  desc: "The terms for using Vootkit's free online tools.",
  body: `
    <h2>Using Vootkit</h2>
    <p>Vootkit provides free browser-based utilities. You may use them for personal and commercial work at no cost. No account is required.</p>

    <h2>Your responsibility for content</h2>
    <p>You are responsible for the files and data you process, and for having the right to process them. Do not use Vootkit to infringe copyright, breach another service's terms, or handle material you are not entitled to.</p>

    <h2>What the tools are and aren't</h2>
    <ul>
      <li><strong>Calculators are estimates.</strong> Finance, tax, insurance and real-estate tools are for general guidance and planning. They are not financial, tax, legal or insurance advice — check anything important with a qualified professional.</li>
      <li><strong>Health tools are estimates.</strong> They are not medical advice or a diagnosis.</li>
      <li><strong>Keep your originals.</strong> Tools transform files on your device; always keep a copy of anything important before converting or compressing it.</li>
    </ul>

    <h2>Availability</h2>
    <p>We aim to keep Vootkit fast and available, but it is provided "as is" without warranty. Browser-based processing depends on your device and browser, and very large files may exceed what a browser can handle — the affected tools say so on their page.</p>

    <h2>Limitation of liability</h2>
    <p>To the extent permitted by law, Vootkit is not liable for loss or damage arising from use of the tools, including loss of data. Because most tools run locally and we never receive your files, we cannot recover them for you.</p>

    <h2>Changes</h2>
    <p>We may update these terms; the date at the top reflects the latest version.</p>

    <h2>Contact</h2>
    <p><a href="mailto:vootkit1@gmail.com">vootkit1@gmail.com</a></p>

    <p class="note" style="margin-top:var(--s-6)">These terms are written in plain language to be genuinely readable. They are not a substitute for legal advice tailored to your business.</p>`
}));

/* Cookie Policy — required by every ad network's reviewer, and the page the
   consent banner links to. Written to describe what the site ACTUALLY sets,
   which is why it names the specific keys: a generic template that lists
   cookies the site does not use is worse than none, because the first thing a
   reviewer does is compare it against the network tab. */
write("cookies.html", legalPage({
  file: "cookies.html", title: "Cookie Policy", updated: LAST_UPDATED,
  desc: "Which cookies and browser storage Vootkit uses, what each one does, and how to refuse them.",
  body: `
    <h2>The short version</h2>
    <p>Vootkit uses a small number of cookies and browser storage entries. <strong>None of them touch your files.</strong> Files you open in a tool are processed on your own device and are never uploaded, so they are never stored in a cookie, never sent to an analytics service and never seen by an advertiser.</p>
    <p>You can refuse analytics and advertising storage from the banner shown on your first visit, and change your mind at any time by clearing this site's data in your browser.</p>

    <h2>Strictly necessary</h2>
    <p>These make the site work and are always on. They store nothing about you as a person.</p>
    <table class="spec-table">
      <tr><th>What</th><th>Why</th></tr>
      <tr><td><code>vk-consent</code></td><td>Remembers your answer to the cookie banner so you are not asked again.</td></tr>
      <tr><td><code>vk-theme</code></td><td>Remembers light or dark mode.</td></tr>
      <tr><td><code>vk-recent</code>, <code>vk-tools</code></td><td>The "recently viewed" list on tool pages. Stays on your device.</td></tr>
      <tr><td><code>vk-uses:&lt;date&gt;</code></td><td>Counts how many tools you have run today, for the free daily allowance.</td></tr>
      <tr><td>Supabase session</td><td>Only if you create an account — keeps you signed in.</td></tr>
    </table>

    <h2>Analytics</h2>
    <p>We use Google Analytics 4 to count visits and see which tools are used. It records the page, your approximate country, your device type and how you arrived. <strong>It never receives your file names, file contents, or anything you type into a tool.</strong></p>
    <p>Analytics storage is refused by default in the EEA and UK until you accept.</p>

    <h2>Advertising</h2>
    <p>Some pages carry ads from Google AdSense, which may set cookies to measure and personalise them. Advertising storage is refused by default in the EEA and UK until you accept; if you refuse, you will still see ads, but they will be contextual rather than personalised.</p>
    <p>Ads are never shown on account or sign-in pages, and never inside a tool while it is working.</p>

    <h2>Refusing or removing them</h2>
    <ul>
      <li>Choose <strong>Reject</strong> on the banner. Analytics and advertising storage stay off.</li>
      <li>Clear this site's data in your browser to reset everything, including your banner choice.</li>
      <li>Browser-level cookie blocking works normally here — the tools do not depend on cookies to function.</li>
    </ul>

    <h2>Changes</h2>
    <p>If we add or remove a cookie, this page changes and the banner asks again.</p>
  `
}));

/* Disclaimer — needed regardless of monetisation. The catalogue includes
   mortgage, loan, refinance, paycheck and BMI tools; those are health- and
   money-adjacent calculations that people can act on, and the site must be
   unambiguous that it computes a formula rather than giving advice. */
write("disclaimer.html", legalPage({
  file: "disclaimer.html", title: "Disclaimer", updated: LAST_UPDATED,
  desc: "What Vootkit's tools do and do not do — including the financial and health calculators.",
  body: `
    <h2>General</h2>
    <p>Vootkit's tools are provided for general use. They apply a stated method to the input you give them. We work hard to make them correct and they are covered by an automated test suite, but no tool is a substitute for checking a result that matters.</p>

    <h2>Financial calculators</h2>
    <p>The loan, mortgage, refinance, auto loan, affordability, credit-card, investment, savings, paycheck and currency tools <strong>perform a calculation. They do not give financial advice.</strong> Vootkit is not a lender, broker, tax adviser or financial adviser.</p>
    <ul>
      <li>Results are estimates based only on the figures you enter.</li>
      <li>They exclude fees, insurance, local taxes and lender-specific rules unless you enter those yourself.</li>
      <li>Thresholds such as a 36% debt-to-income ratio are common lender conventions, not targets or recommendations.</li>
      <li>The paycheck tool does not know any country's tax rules — it applies the rate you supply.</li>
      <li>Currency rates are indicative and are not dealing rates.</li>
    </ul>
    <p>Before borrowing, refinancing or investing, speak to a qualified professional who can see your full circumstances.</p>

    <h2>Health calculators</h2>
    <p>The BMI and related tools <strong>are not medical advice and cannot diagnose anything.</strong> BMI in particular is a population statistic that misclassifies muscular and older bodies, uses thresholds that differ by ancestry, and needs percentile charts rather than a single number for children. Talk to a clinician about your own health.</p>

    <h2>File processing</h2>
    <p>Most tools run entirely in your browser. Keep your own copy of anything important before converting, compressing or editing it — a browser tab can be closed, refreshed or run out of memory, and we cannot recover a file we never received.</p>

    <h2>External services</h2>
    <p>A small number of tools call an external service for live data, and those are labelled on the tool itself. We do not control the accuracy or availability of third-party data.</p>

    <h2>Liability</h2>
    <p>Vootkit is provided "as is". To the extent permitted by law, we are not liable for loss arising from the use of a result produced by these tools. Your use is subject to our <a href="terms.html">Terms of Use</a>.</p>
  `
}));

function aboutPage() {
  const url = SITE + "/about.html";
  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "AboutPage", "@id": url + "#page", name: "About Vootkit", url, description: "Learn why Vootkit was created, how its browser-based tools protect privacy and how founder John Prosper is building a simpler digital workspace.", dateModified: TRUST_CONTENT_UPDATED, mainEntity: { "@id": SITE + "/#organization" } },
    { "@type": "Organization", "@id": SITE + "/#organization", name: "Vootkit", url: SITE + "/", logo: SITE + "/assets/favicon.svg", founder: { "@id": SITE + "/founder-story.html#john-prosper" }, description: "Vootkit is a multilingual platform of browser-based tools for PDF files, images, video, finance, business, development and everyday digital tasks." },
    { "@type": "Person", "@id": SITE + "/founder-story.html#john-prosper", name: "John Prosper", jobTitle: "Founder and Full Stack Developer", url: SITE + "/founder-story.html" }
  ] };
  return head({ depth: 0, url, ads: true, ld, bodyClass: "about-ref", title: "About Vootkit: Our Mission, Privacy & Founder", ogTitle: "About Vootkit — Useful technology should feel simple", desc: "Learn why Vootkit was created, how its browser-based tools protect your privacy, and how founder John Prosper is building a simpler digital workspace." }) + `
<div class="about-main">
  <section class="about-hero">
    <div class="about-hero-copy"><h1>Useful technology<br>should feel simple.</h1><p>Vootkit brings everyday digital tools into one fast, private and approachable workspace.</p><a class="btn btn-primary" href="tools/">Explore Vootkit</a></div>
    <img src="assets/images/home/home-community-team.webp" alt="A team using digital tools together" width="900" height="600" fetchpriority="high">
  </section>
  <section class="about-why"><div><h2>Why Vootkit exists</h2><p>People should not need ten websites, five accounts and complicated software to finish a simple task.</p></div><div class="about-results"><span><b>PDF</b><small>Report.pdf<br>1.4 MB</small><i>Converted</i></span><span><b>Image</b><small>Photo.jpg<br>2.6 MB</small><i>Resized</i></span><span><b>Video</b><small>Clip.mp4<br>18.7 MB</small><i>Compressed</i></span><span><b>Calculator</b><small>1,250 × 8.5</small><strong>10,625</strong></span></div></section>
  <section class="about-beliefs"><h2>What we believe</h2><div><article><span>✓</span><h3>Useful before impressive</h3><p>Every feature should solve a real problem.</p></article><article><span>▣</span><h3>Privacy by design</h3><p>Most file tools work directly on your device.</p></article><article><span>✣</span><h3>One connected workspace</h3><p>Tools become more powerful when they work together.</p></article></div></section>
  <section class="about-numbers"><h2>Vootkit by the numbers</h2><div><p><b>${floorTo(VK.counts.live, TOOL_ROUND_TO)}+</b><span>tools</span></p><p><b>${VK.CATEGORIES.length}</b><span>categories</span></p><p><b>Local</b><span>most tools process locally</span></p><p><b>Global</b><span>available worldwide</span></p></div></section>
  <section class="about-founder"><div><h2>Built by John Prosper</h2><p>Vootkit began as a practical toolbox and is growing into a connected platform for everyday digital work.</p><a class="btn" href="founder-story.html">Read the founder story</a></div><img src="public/images/about/john-prosper.webp" alt="John Prosper, founder and full stack developer of Vootkit" width="900" height="1350" loading="lazy"></section>
  <section class="about-files"><h2>How Vootkit handles files</h2><div><article><b>1</b><span>⌁</span><h3>Choose a tool</h3><p>Pick the tool that matches your task.</p></article><i>→</i><article><b>2</b><span>▣</span><h3>Process in your browser</h3><p>Your files stay on your device. We process locally in your browser.</p></article><i>→</i><article><b>3</b><span>⇩</span><h3>Download your result</h3><p>Get your finished file instantly and keep working.</p></article></div><a href="privacy.html">Learn about privacy →</a></section>
  <section class="about-trust" aria-labelledby="about-trust-title"><div><p class="eyebrow">How we work</p><h2 id="about-trust-title">Built, checked and explained for real tasks</h2><p>Vootkit is designed for people who need to finish practical work: preparing a document, improving an image, converting a file, checking a calculation or completing several steps as one workflow. We build each live tool around a defined job and provide instructions that explain what it does.</p></div><div><article><h3>Original product work</h3><p>Vootkit's interfaces, workflows and browser-based tool experiences are built and maintained as part of the platform—not copied from another tools website.</p></article><article><h3>Honest tool status</h3><p>Working tools are presented as live. Planned features are identified instead of being represented as completed products.</p></article><article><h3>Clear limitations</h3><p>Financial and health-related calculators provide estimates, not professional advice. Relevant limitations are explained in our <a href="disclaimer.html">disclaimer</a>.</p></article><article><h3>Accountable support</h3><p>Users can report a problem, question a result or suggest an improvement through our <a href="contact.html">contact and support page</a>.</p></article></div></section>
  <section class="about-transparency"><h2>Privacy and business transparency</h2><p>Most compatible file tools process locally in the browser, although tools that need an external service are identified. Vootkit may be supported by advertising and optional paid plans. Advertising does not determine a tool's calculation or result, and ads are kept visually separate from tool controls and download actions.</p><p>Our <a href="privacy.html">Privacy Policy</a>, <a href="cookies.html">Cookie Policy</a>, <a href="terms.html">Terms of Use</a> and <a href="disclaimer.html">Disclaimer</a> explain how the service operates and what users should expect.</p></section>
  <section class="about-next"><div><h2>The next chapter</h2><p>More useful tools. Better workflows.<br>The same commitment to simplicity.</p></div><a class="btn btn-primary" href="blog/">See what's new</a></section>
</div>` + foot(0);
}
write("about.html", aboutPage());

function founderStoryPage() {
  const url = SITE + "/founder-story.html";
  const image = SITE + "/public/images/about/john-prosper.webp";
  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "ProfilePage", "@id": url + "#page", name: "John Prosper — Founder of Vootkit", url, dateModified: TRUST_CONTENT_UPDATED, mainEntity: { "@id": url + "#john-prosper" } },
    { "@type": "Person", "@id": url + "#john-prosper", name: "John Prosper", image, url, sameAs: ["https://github.com/johnpoxer"], jobTitle: "Founder and Full Stack Developer", worksFor: { "@id": SITE + "/#organization" }, knowsAbout: ["Full-stack web development", "Browser-based tools", "Product development", "Technical SEO", "Web accessibility", "User experience"] },
    { "@type": "Organization", "@id": SITE + "/#organization", name: "Vootkit", url: SITE + "/", founder: { "@id": url + "#john-prosper" } }
  ] };
  return head({ depth: 0, url, ads: true, ld, bodyClass: "founder-story-ref", title: "John Prosper: Founder of Vootkit | Founder Story", ogTitle: "The story behind Vootkit and its founder, John Prosper", desc: "Meet John Prosper, founder and full stack developer of Vootkit, and discover why he built a faster, simpler and more private platform for everyday digital tools.", image }) + `
<article class="founder-story">
  <header class="founder-story-hero">
    <div><a class="founder-back" href="about.html">← About Vootkit</a><p class="eyebrow">Founder story</p><h1>Building useful technology that feels simple.</h1><p class="founder-lede">John Prosper created Vootkit to give people one dependable place to complete everyday digital tasks—without installing complicated software or jumping between disconnected websites.</p></div>
    <img src="public/images/about/john-prosper.webp" alt="John Prosper, founder and full stack developer of Vootkit" width="900" height="1350" fetchpriority="high">
  </header>
  <div class="founder-story-body">
    <div class="founder-byline"><strong>By John Prosper</strong><span>Founder &amp; Full Stack Developer</span><span>Reviewed and updated 20 August 2026</span></div>
    <section><h2>Meet John Prosper</h2><p>John Prosper is the founder and full stack developer behind Vootkit. He has independently taken the platform from an idea to a working multilingual product, handling product planning, frontend architecture, browser-based processing, integrations, performance, accessibility, technical SEO and the user experience.</p><p>His approach is practical: technology should solve a real problem before it tries to impress anyone. That principle shapes how Vootkit tools are designed—clear instructions, fast results and a consistent interface that works across phones and computers.</p></section>
    <section><h2>Why he created Vootkit</h2><p>Simple online tasks often become unnecessarily difficult. A person may need one website to compress a PDF, another to resize an image, another for a calculation and yet another account just to download the result. Some services also upload files when local browser processing would be enough.</p><p>John built Vootkit to make that experience simpler. The platform brings practical tools for PDF files, images, video, finance, business, developers, text and everyday productivity into one connected workspace. Most compatible file tools process directly in the browser, helping users keep control of their files while getting work done quickly.</p></section>
    <aside><strong>The Vootkit principle</strong><p>Useful before impressive. Private by design. One connected workspace.</p></aside>
    <section><h2>Building the platform independently</h2><p>Vootkit is both a product and an ongoing engineering project. Building it requires more than adding calculators and converters. Each tool must be understandable, responsive, accessible, discoverable through search and reliable on the devices people actually use.</p><p>John continues to develop and maintain the platform from concept through deployment. That direct involvement keeps the product close to its original purpose: helping real people finish real digital tasks with less friction.</p></section>
    <section><h2>How the work is reviewed</h2><p>Before a feature is treated as complete, its interface and main user journey are checked across the shared Vootkit experience. Automated checks cover important site behavior, links, workflows and SEO requirements, while visual review focuses on mobile usability, readable content and clear actions.</p><p>Vootkit also distinguishes between a live tool and a planned feature. When a tool has an important limitation—such as an estimated financial result, browser memory limits or the need for an outside data service—the goal is to explain that limitation instead of hiding it.</p></section>
    <section><h2>Where Vootkit is going</h2><p>Vootkit is growing beyond a collection of individual utilities. The long-term direction is a connected digital workspace where tools and workflows cooperate around the result a user wants. Instead of manually finding and running every step, people will be able to move from an intention to a finished outcome through a clearer, more coordinated experience.</p><p>The vision remains grounded in the same promise that started the platform: make useful technology faster, more approachable and respectful of the user.</p></section>
    <section class="founder-facts"><h2>Founder information</h2><dl><div><dt>Name</dt><dd>John Prosper</dd></div><div><dt>Role</dt><dd>Founder and Full Stack Developer</dd></div></dl></section>
    <footer class="founder-story-cta"><div><h2>Explore what John is building</h2><p>Use Vootkit's browser-based tools or learn more about the platform's mission.</p></div><div><a class="btn btn-primary" href="tools/">Explore all tools</a><a class="btn" href="about.html">About Vootkit</a></div></footer>
  </div>
</article>` + foot(0);
}
write("founder-story.html", founderStoryPage());

/* Legacy contact markup kept out of the build; contactPage() below is canonical. */
void infoPage({
  slug: "contact.html", title: "Contact Support", eyebrow: "Contact & Support",
  h1: "Contact support.",
  desc: "Contact the Vootkit support team directly from this page — send us a message about a tool, a bug, billing, a feature idea or a partnership.",
  lede: "Send us a message and we'll get back to you by email. No mail app needed — just fill in the box below.",
  scripts: ["assets/js/contact.js"],
  body: `
  <!-- Decorative, so alt="" and aria-hidden: the heading and lede above
       already say what this page is, and a screen reader announcing a
       description of a stock photograph adds nothing but noise.
       fetchpriority=high because it is the largest element above the fold and
       is what LCP will be measured on. -->
  <img class="contact-hero" src="/assets/blog/contact-support.jpg" alt="" aria-hidden="true"
       width="1200" height="460" fetchpriority="high" decoding="async">
  <div class="contact-layout">
    <div class="contact-card">
      <form id="contact-form" class="contact-form" name="contact" method="POST" action="/contact-success/" data-netlify="true" netlify-honeypot="bot-field">
        <input type="hidden" name="form-name" value="contact">
        <p class="cf-hp" hidden><label>Leave this empty <input name="bot-field"></label></p>
        <div class="cf-row">
          <label class="cf-field"><span class="cf-lab">Your name</span><input class="field" type="text" name="name" required autocomplete="name" placeholder="Jane Doe"></label>
          <label class="cf-field"><span class="cf-lab">Your email</span><input class="field" type="email" name="email" required autocomplete="email" placeholder="you@example.com"></label>
        </div>
        <label class="cf-field"><span class="cf-lab">Topic</span>
          <select class="field" name="topic">
            <option>Support &amp; feedback</option>
            <option>A bug or something broken</option>
            <option>Billing &amp; Pro subscription</option>
            <option>A tool idea / feature request</option>
            <option>Press &amp; partnerships</option>
          </select>
        </label>
        <label class="cf-field"><span class="cf-lab">Message</span><textarea class="field" name="message" rows="6" required placeholder="How can we help?"></textarea></label>
        <div class="cf-actions">
          <button class="btn btn-primary" type="submit" id="cf-submit">Send message</button>
          <span class="cf-status" id="cf-status" role="status" aria-live="polite"></span>
        </div>
      </form>
    </div>
    <aside class="contact-aside">
      <h2>Other ways to reach us</h2>
      <p class="note">Prefer your own email app? Write to us at:</p>
      <p class="contact-email">${SUPPORT}</p>
      <p class="note">We read every message and aim to reply within a couple of business days.</p>
      <div class="prose faq" style="margin-top:var(--s-5)">
        <details><summary>Do I need an account to use the tools?</summary><p>No. Every tool works without signing up. An account only syncs your history and manages a subscription if you upgrade.</p></details>
        <details><summary>Is my file uploaded when I use a tool?</summary><p>For most tools, no — they run entirely in your browser. Tools that need the internet are clearly labelled on their page.</p></details>
      </div>
    </aside>
  </div>`
});

function contactPage() {
  const url = SITE + "/contact.html";
  const desc = "Contact Vootkit support about tools, accounts, billing, bugs, feature requests, workflows, templates, privacy questions and feedback.";
  const ld = [
    { "@context": "https://schema.org", "@type": "ContactPage", name: "Contact Vootkit", url, description: desc },
    { "@context": "https://schema.org", "@type": "Organization", name: "Vootkit", url: SITE + "/", email: SUPPORT }
  ];
  const feature = (ic, title, copy) => `
      <article class="cs-trust-item">
        <span class="cs-ico" aria-hidden="true">${icon(ic)}</span>
        <div><h2>${esc(title)}</h2><p>${esc(copy)}</p></div>
      </article>`;
  const method = (ic, title, copy, meta, attrs, tag) => {
    const open = tag === "button"
      ? `<button class="cs-method" type="button" ${attrs}>`
      : `<a class="cs-method" ${attrs}>`;
    const close = tag === "button" ? "</button>" : "</a>";
    return `${open}
        <span class="cs-method-ic" aria-hidden="true">${icon(ic)}</span>
        <span><strong>${esc(title)}</strong><small>${esc(meta)}</small><em>${esc(copy)}</em></span>
        <i aria-hidden="true">${icon("arrow-right")}</i>
      ${close}`;
  };
  const quick = (ic, title, copy, subject) => `
        <button class="cs-quick-card" type="button" data-contact-subject="${esc(subject)}">
          <span aria-hidden="true">${icon(ic)}</span><strong>${esc(title)}</strong><small>${esc(copy)}</small>
        </button>`;
  const option = (v) => `<option value="${esc(v)}">${esc(v)}</option>`;
  return head({
    depth: 0,
    url,
    ads: true,
    ld,
    active: "about",
    bodyClass: "contact-page",
    title: "Contact Vootkit | Support, Feedback & Help",
    ogTitle: "Contact Vootkit",
    desc
  }) + `
<div class="contact-support-page">
  <section class="cs-hero wrap" aria-labelledby="contact-title">
    <div class="cs-hero-copy">
      <span class="eyebrow">We're here to help</span>
      <h1 id="contact-title">Contact Us / <span>Support</span></h1>
      <p class="cs-hero-lede">Have a question, feedback, or need help with a tool? Our team is here for you. Reach out and we'll get back to you as soon as possible.</p>
    </div>
    <div class="cs-hero-art">
      <picture>
        <source srcset="public/images/contact/contact-support-hero.avif" type="image/avif">
        <img src="public/images/contact/contact-support-hero.webp" width="1400" height="850" alt="Smiling support professional wearing headphones while working on a laptop." fetchpriority="high" decoding="async">
      </picture>
      <div class="cs-photo-wash" aria-hidden="true"></div>
      <div class="cs-chip-stack" aria-hidden="true">
        <span>${icon("message")} Ask</span>
        <span>${icon("book")} Get help</span>
        <span>${icon("sparkles")} Find solutions</span>
        <span>${icon("zap")} Keep creating</span>
      </div>
      <p class="cs-handnote" aria-hidden="true">Better<br>Tools.<br>A Smarter<br>You.</p>
      <p class="cs-photo-tag" aria-hidden="true">Real people.<br>Real support.</p>
    </div>
    <div class="cs-trust-grid" aria-label="Support promises">
      ${feature("zap", "Fast replies", "We review support messages promptly.")}
      ${feature("shield", "Real people", "Friendly support from our team.")}
      ${feature("heart", "We care", "Your success is our mission.")}
      ${feature("globe", "A global community", "Creators from around the world use Vootkit.")}
    </div>
  </section>

  <section class="cs-main wrap" aria-label="Contact support options">
    <aside class="cs-methods" aria-labelledby="contact-methods-title">
      <h2 id="contact-methods-title">Choose a way to reach us</h2>
      ${method("mail", "Email Support", "General inquiries, bugs and feedback.", SUPPORT, `href="mailto:${esc(SUPPORT)}"`, "a")}
      ${method("book", "Help Center", "Browse guides, FAQs and tutorials.", "Vootkit guides", `href="blog/"`, "a")}
      ${method("users", "Community", "Ask a question or share feedback.", "Contact the team", `data-contact-subject="Other"`, "button")}
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
const enUrls = ["/", "/tools/", "/workflows/", "/templates/", "/pricing.html", "/about.html", "/founder-story.html", "/contact.html", "/privacy.html", "/terms.html", "/cookies.html", "/disclaimer.html"]
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
  "ai-bg-remove":"remove-background","ai-ocr":"image-to-text","ai-transcribe":"transcribe-audio","base64":"base64"
};
const OLD_CAT = { "ai-on-device":"ai","utilities":"everyday","time":"everyday","fun":"everyday",
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
    "remove-background", "jpg-to-pdf", "image-to-text",
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
