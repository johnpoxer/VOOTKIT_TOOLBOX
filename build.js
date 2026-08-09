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
const TOOLCONTENT = require("./data/tool-content.js");
const TOOLFACTS = require("./data/tool-facts.js");
const MONEY = Object.assign({}, require("./assets/js/tools-money.js"), require("./assets/js/tools-money2.js"));
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
  "assets/js/tools-pdfedit.js": ["compress-pdf","pdf-redact","compare-pdf"],
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
    const g = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUB}" crossorigin="anonymous"></script>`;
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
  const css = ["tokens", "base", "pages", "newsletter", "skin"].map((n) => "assets/css/" + n + ".css");
  let js = [];
  try { js = fs.readdirSync(path.join(ROOT, "assets/js")).filter((f) => f.endsWith(".js")).sort().map((f) => "assets/js/" + f); } catch (e) {}
  css.concat(js).forEach((rel) => { try { h.update(fs.readFileSync(path.join(ROOT, rel))); } catch (e) {} });
  return h.digest("hex").slice(0, 10);
})();

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

function head(o) {
  // depth = how many ../ to reach site root
  const up = "../".repeat(o.depth) || "./";
  const lang = o.lang || "en";
  return `<!doctype html>
<html lang="${lang}"${o.dir === "rtl" ? ' dir="rtl"' : ""}>
<head>
<meta charset="utf-8">
<meta name="google-adsense-account" content="${PUB}">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#fbfcfe" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b1220" media="(prefers-color-scheme: dark)">
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
<script type="application/ld+json">${JSON.stringify(o.ld)}</script>
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
<body${o.cat ? ` data-cat="${o.cat}"` : ""}>
<a class="skip" href="#main">Skip to content</a>
<header class="hdr">
  <div class="wrap hdr-in">
    <a class="brand" href="${up}" aria-label="Vootkit home">
      <svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="17.5" fill="none" stroke="var(--accent)" stroke-opacity=".45" stroke-width="1.3" stroke-dasharray="17 7"/><path d="M12.5 14.5 21.5 30 31.5 13.5" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="33.5" cy="10.5" r="2.7" fill="#06b6d4"/></svg>
      vootkit
    </a>
    <nav class="nav" id="nav" aria-label="Main">
      <a href="${up}tools/">Tools</a>
      <a href="${up}pricing.html">Pricing</a>
      <a href="${up}#features">Features</a>
      <a href="${up}blog/">Blog</a>
      <a href="${up}about.html">About</a>
      <a href="${up}contact.html">Contact</a>
    </nav>
    <div class="hdr-act">
      <a class="icon-btn" href="${up}tools/" aria-label="Search tools">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>
      </a>
      ${langSwitcher(o.alts, lang)}
      <button class="icon-btn" id="theme" type="button" aria-label="Switch theme">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/></svg>
      </button>
      <a class="hdr-cta" href="${up}pricing.html">Get Pro</a>
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
  const cat = (slug, label) => `<a href="${up}tools/${slug}/">${esc(label)}</a>`;
  return `
      <div class="ftr-col">
        <h4>Tools</h4>
        ${cat("pdf", "PDF")}${cat("images", "Images")}${cat("video", "Video")}${cat("audio", "Audio")}${cat("text", "Text")}${cat("finance", "Finance")}
      </div>
      <div class="ftr-col">
        <h4>More tools</h4>
        ${cat("seo", "SEO")}${cat("developer", "Developer")}${cat("design", "Design")}${cat("privacy", "Privacy")}${cat("data", "Data")}<a href="${up}tools/">All ${VK.CATEGORIES.length} categories</a>
      </div>
      <div class="ftr-col">
        <h4>Vootkit</h4>
        <a href="${up}tools/">All tools</a><a href="${up}pricing.html">Pricing</a><a href="${up}about.html">About</a><a href="${up}blog/">Blog</a><a href="${up}contact.html">Contact &amp; support</a>
      </div>
      <div class="ftr-col">
        <h4>Legal</h4>
        <a href="${up}privacy.html">Privacy policy</a><a href="${up}cookies.html">Cookie policy</a><a href="${up}terms.html">Terms</a><a href="${up}disclaimer.html">Disclaimer</a>
      </div>`;
}

/* The brand block that fills the slot the reference design gives to App Store
   badges. Vootkit has no apps, and a badge for a store listing that does not
   exist is not a design decision, it is a lie in the footer of every page. So
   the space says the truest thing the site has to say instead. */
function footBrand() {
  return `
      <div class="ftr-brand">
        <span class="ftr-mark">
          <svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="17.5" fill="none" stroke="currentColor" stroke-opacity=".45" stroke-width="1.3" stroke-dasharray="17 7"/><path d="M12.5 14.5 21.5 30 31.5 13.5" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="33.5" cy="10.5" r="2.7" fill="#22d3ee"/></svg>
          vootkit
        </span>
        <p>${floorTo(VK.counts.live, 50)}+ free tools for PDF, images, video, finance and more.</p>
        <p class="ftr-trust">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4.5 6.2v5.4c0 4.6 3.2 8.9 7.5 10.2 4.3-1.3 7.5-5.6 7.5-10.2V6.2z"/><path d="m9 12 2.2 2.2L15.4 10"/></svg>
          Most tools run on your device. Your files are never uploaded.
        </p>
      </div>`;
}

function foot(depth, extraScripts, opts) {
  const up = "../".repeat(depth) || "./";
  const o = opts || {};
  return `</main>
<footer class="ftr">
  <div class="wrap">
    <div class="ftr-top">
      <div class="ftr-cols">${footCols(up)}
      </div>${footBrand()}
    </div>
    ${o.noNewsletter ? "" : '<div class="ftr-nl" data-newsletter="footer"></div>'}
    <div class="ftr-bar">
      ${socialRow()}
      <p class="ftr-copy">&copy; <span id="yr"></span> Vootkit — every digital task, done in your browser.</p>
    </div>
  </div>
</footer>
<script src="${up}data/site.config.js${V}"></script>
<script src="${up}data/catalog.js${V}"></script>
<script>
document.getElementById('yr').textContent=new Date().getFullYear();
(function(){var b=document.getElementById('burger'),n=document.getElementById('nav');
b.addEventListener('click',function(){var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o?'true':'false');b.setAttribute('aria-label',o?'Close menu':'Open menu');});
var t=document.getElementById('theme'),s=null;try{s=localStorage.getItem('vk-theme');}catch(e){}
if(s)document.documentElement.setAttribute('data-theme',s);
t.addEventListener('click',function(){var c=document.documentElement.getAttribute('data-theme'),x=c==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',x);try{localStorage.setItem('vk-theme',x);}catch(e){}});})();
</script>
<script src="${up}assets/js/track.js${V}" defer></script>
<script src="${up}assets/js/consent-ui.js${V}" defer></script>
<script src="${up}assets/js/ads.js${V}" defer></script>
<script src="${up}assets/js/ui.js${V}" defer></script>
<script src="${up}assets/js/recent.js${V}" defer></script>
<script src="${up}assets/js/supabase-config.js${V}" defer></script>
<script src="${up}assets/js/errors.js${V}" defer></script>
<script src="${up}assets/js/convert.js${V}" defer></script>
<script src="${up}assets/js/newsletter.js${V}" defer></script>
<script src="${up}assets/js/auth.js${V}" defer></script>
<script src="${up}assets/js/usage.js${V}" defer></script>
<script src="${up}assets/js/deliver.js${V}" defer></script>
<script src="${up}assets/js/gate.js${V}" defer></script>
${(extraScripts||[]).map(function(x){return '<script src="'+up+x+V+'" defer></script>';}).join("\n")}
</body>
</html>
`;
}

/* Round down to a stable bucket, so a title only changes when the site has
   genuinely crossed a milestone rather than every time a tool ships. */
const floorTo = (n, step) => Math.max(step, Math.floor(n / step) * step);

const badge = (t) => t.processing === "network"
  ? '<span class="badge badge-net">uses an API</span>'
  : '<span class="badge badge-local">runs on your device</span>';

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
  [/speech|transcribe|voice|tts/,        'mic',      340],
  [/ocr|image-to-text|scan/,             'search',   216],
  [/qr/,                                 'qr',       268],
  [/barcode/,                            'barcode',  268],
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
  [/loan|mortgage|interest|salary|invoice|budget|savings|retire|crypto|profit|margin|cac|fba|currency|money|price|cost|tip|hourly|rate|dti|debt/, 'money', 152],
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
  for (const [re, g, hue] of ICON_RULES) if (re.test(hay)) return { g, hue };
  return null;
}

function toolIconHtml(t) {
  const m = toolIcon(t);
  const cat = CATBY[t.cat] || {};
  if (!m) return `<span class="ic">${icon(cat.icon)}</span>`;   // audited against below
  return `<span class="ic ic-tool" style="--ic-h:${m.hue}">` +
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPH[m.g]}</svg></span>`;
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
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    type: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    palette: '<circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><path d="M12 22a3 3 0 0 0 3-3 2 2 0 0 0-2-2h-1.5a1.5 1.5 0 0 1 0-3H14a5 5 0 1 0-5-5"/>',
    code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 4v16"/>',
    sparkles: '<path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3z"/><path d="M18 15l.9 2.3L21 18l-2.1.7L18 21l-.9-2.3L15 18l2.1-.7z"/>',
    heart: '<path d="M12 20s-6.5-4.3-9-8.3A4.7 4.7 0 0 1 12 6a4.7 4.7 0 0 1 9 5.7c-2.5 4-9 8.3-9 8.3z"/>',
    plane: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',
    book: '<path d="M12 6c-2-1.2-5-1.2-7 0v12c2-1.2 5-1.2 7 0 2-1.2 5-1.2 7 0V6c-2-1.2-5-1.2-7 0z"/><path d="M12 6v12"/>'
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

/* which script bundle a tool page loads — shared by English + localised pages */
function toolScripts(t) {
  if (VIDEO[t.id]) return ['assets/js/calc.js', 'assets/js/tools-video.js'];
  if (MONEY[t.id]) return ['assets/js/calc.js', 'assets/js/tools-money.js', 'assets/js/tools-money2.js'];
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
  if (LINKTOOLS.indexOf(t.id) !== -1) return ['assets/js/tools-linktools.js'];
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
    <span class="card-foot"><span class="tc-cat">${esc(c.name || t.cat)}</span>${badge(t)}</span>
  </a>`;
}

/* ---------- /tools/ ---------- */
function allToolsPage() {
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
    title: `All ${floorTo(VK.TOOLS.length, 50)}+ Free Online Tools — Vootkit`,
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

  <section class="section">
    <h2 class="h-sm">Other categories</h2>
    <div class="chips">${others}</div>
  </section>
</div>` + foot(2);
}

/* ---------- /tools/<category>/<tool>/ — the 9 required blocks ---------- */
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
  const facts = deep ? null : TOOLFACTS.factsFor(
    VIDEOFX[t.id] || IMAGE[t.id] || IMAGE2[t.id] || PDF[t.id] || MONEY[t.id] || null);

  const faqs = (deep ? deep.faqs : []).concat([
    { q: `Is ${t.name} free?`, a: `Yes. The Vootkit free plan includes 5 tool runs a day, with no account and no watermark. Upgrade to Vootkit Pro for unlimited daily use, faster processing and premium tools.` },
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

  const hasCalc = !!MONEY[t.id] || !!VIDEO[t.id];
  const hasFile = !!IMAGE[t.id];
  const hasPdf = !!PDF[t.id];
  const hasVideo = !!VIDEO[t.id];
  const hasVideoFx = !!VIDEOFX[t.id];
  const hasLink = LINKTOOLS.indexOf(t.id) !== -1;
  const widgetScripts = widgetScriptsFor(t.id);
  const workspace = live
    ? `<div class="ws" id="workspace" data-tool="${t.id}">
         <noscript><p class="note">This tool needs JavaScript — it runs the calculation in your browser rather than on a server.</p></noscript>
       </div>`
    : `<div class="ws ws-soon">
         <strong>Not built yet</strong>
         <p class="note">${esc(t.name)} is on the roadmap. The page below explains what it will do — we publish the tool before we promote it.</p>
         <a class="btn" href="../">Browse ${esc(c.name)} tools that work today</a>
       </div>`;

  let pageHead = head({ depth: 3, url, ads: true, ld, cat: t.cat, lang: "en", alts: altsForTool(t),
    title: toolTitle(t.name, c.name),
    ogTitle: t.name,
    desc: `${t.desc} ${local ? "Runs in your browser" : "No install needed"}, no watermark, 5 free uses a day.` });
  // under-construction ("soon") tools are thin — keep them out of the index (AdSense quality)
  if (!live) pageHead = pageHead.replace("</head>", '<meta name="robots" content="noindex,follow">\n</head>');
  return pageHead +
`<div class="wrap section tool-page">
  <nav class="crumb" aria-label="Breadcrumb"><a href="../../../">Vootkit</a> <span aria-hidden="true">›</span> <a href="../../">Tools</a> <span aria-hidden="true">›</span> <a href="../">${esc(c.name)}</a> <span aria-hidden="true">›</span> <span aria-current="page">${esc(t.name)}</span></nav>

  <!-- 1. workspace -->
  <header class="tool-head">
    <h1 class="page-h1">${esc(t.name)}</h1>
    <p class="page-lede">${esc(t.desc)}</p>
    <div class="trust">${badge(t)}<span class="badge">no watermark</span><span class="badge">5 free a day</span></div>
  </header>
  ${workspace}

  <!-- 2-4. explanation, benefits, how it works -->
  ${deep ? `<section class="prose">
    <p class="tool-intro">${esc(deep.intro)}</p>

    <h2>What ${esc(t.name)} does</h2>
    ${deep.what.map((p) => `<p>${p}</p>`).join("\n    ")}

    <h2>${esc(deep.specs.caption)}</h2>
    <div class="table-wrap"><table class="spec-table">
      <tbody>
      ${deep.specs.rows.map((r) => `<tr><th scope="row">${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join("\n      ")}
      </tbody>
    </table></div>

    <h2>How to use it</h2>
    <ol>
      ${deep.steps.map((s) => `<li>${s}</li>`).join("\n      ")}
    </ol>

    <h2>Worth knowing</h2>
    <p>${esc(deep.tip)}</p>
  </section>` : `<section class="prose">
    <h2>What ${esc(t.name)} does</h2>
    <p>${esc(t.desc)} It's one of ${VK.TOOLS.length} tools in the Vootkit ecosystem, built to do a single job properly — open it, get your result, move on.</p>
${facts ? `
    <h2>Settings and limits</h2>
    <div class="table-wrap"><table class="spec-table"><tbody>
      ${facts.rows.map((r) => `<tr><th scope="row">${esc(r.label)}</th><td>${esc(r.value)}</td></tr>`).join("\n      ")}
    </tbody></table></div>
` : ""}
    <h2>Why use this one</h2>
    <ul>
      <li><strong>${local ? "Nothing is uploaded." : "Ready straight away."}</strong> ${local ? "Your file is processed on your own device, so it never travels to a server." : "Open the page and start — there is nothing to install and nothing to configure."}</li>
      <li><strong>5 free uses a day.</strong> The free plan includes 5 tool runs a day — <a href="../../../pricing.html">upgrade to Pro</a> for unlimited daily use.</li>
      <li><strong>No watermark.</strong> What you get out is what you made.</li>
      <li><strong>Works on mobile.</strong> Same tool, thumb-friendly.</li>
    </ul>

    <h2>How it works</h2>
    <ol>
      <li>Open ${esc(t.name)} — nothing to install.</li>
      <li>${local ? "Add your file or input. It stays on your device." : "Enter what you want to look up."}</li>
      <li>Adjust the options to suit the result you need.</li>
      <li>Download or copy your result.</li>
    </ol>

    <h2>Example</h2>
    <p>${esc(exampleFor(t, c))}</p>
  </section>`}

  <!-- in-content ad: below the article body, far from the tool controls -->
  ${adUnit("inContent")}

  <!-- 5. FAQ -->
  <section class="prose faq">
    <h2>Questions</h2>
    ${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("\n    ")}
  </section>

  <!-- footer ad: end of the reading flow, before the onward links -->
  ${adUnit("footer")}

  <!-- 6. related tools — never a dead end -->
  ${related.length ? `<section class="section">
    <h2 class="h-sm">Next in ${esc(c.name)}</h2>
    <div class="grid">${related.map((r) => toolCard(r, "../../../")).join("")}</div>
  </section>` : ""}

  <!-- 7. recently viewed -->
  <section class="section" id="recent-wrap" hidden>
    <h2 class="h-sm">Recently viewed</h2>
    <div class="chips" id="recent"></div>
  </section>

  <!-- 8. trust -->
  <section class="trust-note">
    <p class="note">${hasVideoFx
      ? "Your video is processed entirely in your browser — it's never uploaded. The video engine (ffmpeg) downloads once from a CDN the first time you run a tool, then works from cache. Large files are memory-bound, so keep clips reasonable."
      : local
      ? "This tool processes everything locally in your browser. You can disconnect from the internet after the page loads and it will still work."
      : "This tool calls an external service to fetch live data. It does not require an account and does not track you."}</p>
  </section>
</div>` + foot(3, toolScripts(t));
}

/* ---------- localised tool page (one per translated locale) ---------- */
function fillStr(s, m) { return String(s == null ? "" : s).replace(/\{(\w+)\}/g, function (_, k) { return m[k] != null ? m[k] : ""; }); }
function badgeI18n(t, C) {
  return t.processing === "network"
    ? `<span class="badge badge-net">${esc(C.badge_net)}</span>`
    : `<span class="badge badge-local">${esc(C.badge_local)}</span>`;
}
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
        return `<a class="card tool-card" data-cat="${r.cat}" href="../${r.id}/"><span class="tc-top">${toolIconHtml(r)}</span><h3>${esc(rt.name)}</h3><p>${esc(rt.desc)}</p><span class="card-foot"><span class="tc-cat">${esc(rc.name || r.cat)}</span>${badgeI18n(r, C)}</span></a>`;
      }).join("")}</div></section>`
    : "";
  return pageHead +
`<div class="wrap section tool-page">
  <nav class="crumb" aria-label="Breadcrumb"><a href="${up}">Vootkit</a> <span aria-hidden="true">›</span> <a href="${up}tools/">${esc(C.crumb_tools)}</a> <span aria-hidden="true">›</span> <a href="${up}tools/${t.cat}/">${esc(c.name)}</a> <span aria-hidden="true">›</span> <span aria-current="page">${esc(name)}</span></nav>
  <header class="tool-head">
    <h1 class="page-h1">${esc(name)}</h1>
    <p class="page-lede">${esc(desc)}</p>
    <div class="trust">${badgeI18n(t, C)}<span class="badge">${esc(C.badge_nowatermark)}</span><span class="badge">${esc(C.badge_free)}</span></div>
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
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")); } catch (e) { return []; }
  const posts = files.map((f) => {
    const { data, body } = parseFrontmatter(fs.readFileSync(path.join(dir, f), "utf8"));
    const slug = (data.slug || f.replace(/\.md$/, "")).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    const plain = body.replace(/[#>*_`~\-\[\]()!]/g, " ").split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)[0] || "";
    return {
      slug, title: data.title || slug, date: data.date || "",
      description: data.description || plain.slice(0, 160),
      thumbnail: data.thumbnail || "", author: data.author || "The Vootkit team",
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
  const cards = posts.map((p) => `<a class="card blog-card" href="${p.slug}/">
      ${p.thumbnail ? `<img class="blog-card-img" src="${esc(p.thumbnail)}" alt="${esc(p.title)}" loading="lazy">` : ""}
      <div class="blog-card-b">
        <span class="tc-cat">${esc(fmtDate(p.date) || "Blog")}</span>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.description)}</p>
      </div>
    </a>`).join("\n");
  return hd + `<div class="wrap section">
  <header class="sec-head" style="margin-top:var(--s-4)"><span class="eyebrow">Blog</span><h1 class="page-h1">The Vootkit blog</h1><p class="page-lede">Guides, tips and product updates for getting the most out of your browser-based toolkit.</p></header>
  ${hasPosts
    ? `<div class="blog-grid">${cards}</div>`
    : `<div class="cta-band" style="padding:var(--s-6);border:1px solid var(--line);border-radius:var(--r-lg);text-align:center"><h2 style="margin:0 0 var(--s-2)">New guides are coming</h2><p class="page-lede" style="margin:0 auto var(--s-4)">The best way to learn Vootkit is to use it.</p><a class="btn btn-primary" href="../tools/">Explore the tools</a></div>`}
</div>` + foot(1);
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

  <section class="prose"><h2>Badges</h2></section>
  <div class="wbtns" style="margin-bottom:var(--s-6)">
    <span class="badge badge-local">runs on your device</span>
    <span class="badge badge-net">uses an API</span>
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
function authShell(kind, title, desc, inner) {
  const url = `${SITE}/auth/${kind}/`;
  const ld = { "@context": "https://schema.org", "@type": "WebPage", name: title, url };
  return head({ depth: 2, url, ads: false, ld, title: `${title} — Vootkit`, desc })
    .replace("</head>", '<meta name="robots" content="noindex">\n</head>') +
`<div class="wrap auth-wrap">
  <div class="auth-card" data-auth="${kind === "sign-in" ? "signin" : kind === "sign-up" ? "signup" : kind === "reset" ? "reset" : kind === "update-password" ? "update" : "callback"}">
    <a class="auth-brand" href="../../" aria-label="Vootkit home"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="17.5" fill="none" stroke="var(--accent)" stroke-opacity=".45" stroke-width="1.3" stroke-dasharray="17 7"/><path d="M12.5 14.5 21.5 30 31.5 13.5" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg> vootkit</a>
    ${inner}
    <p class="auth-msg note" role="status" hidden></p>
  </div>
  <p class="auth-foot note">The tools are free and need no account. Sign in only to sync favorites and history. <a href="../../pricing.html">See plans</a></p>
</div>` + foot(2, ["assets/js/authforms.js"]);
}
const OAUTH = `<div class="auth-oauth">
    <button class="btn btn-block" type="button" data-oauth="google"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h6c-.3 1.4-1 2.6-2.3 3.4v2.8h3.6c2.1-1.9 3.3-4.8 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.6-1 7.4-2.8l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H1.9v2.9C3.7 20.5 7.5 23 12 23z"/><path fill="#FBBC05" d="M5.7 13.9c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V6.8H1.9C1.1 8.3.7 10.1.7 11.8s.4 3.5 1.2 5z"/><path fill="#EA4335" d="M12 4.7c1.6 0 3.1.6 4.2 1.7l3.1-3.1C17.6 1.5 15 .5 12 .5 7.5.5 3.7 3 1.9 6.8l3.8 2.9C6.6 6.7 9.1 4.7 12 4.7z"/></svg> Continue with Google</button>
  </div>
  <div class="auth-or"><span>or</span></div>`;

function pageSignIn() {
  return authShell("sign-in", "Sign in", "Sign in to your Vootkit account to sync favorites and history.", `
    <h1>Welcome back</h1>
    ${OAUTH}
    <form novalidate>
      <label class="wfield"><span class="wlab">Email</span><input class="field" id="email" type="email" autocomplete="email" required></label>
      <label class="wfield"><span class="wlab">Password</span><input class="field" id="password" type="password" autocomplete="current-password" required></label>
      <div class="auth-row"><a href="../reset/">Forgot password?</a></div>
      <button class="btn btn-primary btn-block" type="submit">Sign in</button>
    </form>
    <p class="auth-alt">New to Vootkit? <a href="../sign-up/">Create an account</a></p>`);
}
function pageSignUp() {
  return authShell("sign-up", "Create account", "Create a free Vootkit account to sync favorites and history across devices.", `
    <h1>Create your account</h1>
    ${OAUTH}
    <form novalidate>
      <label class="wfield"><span class="wlab">Name</span><input class="field" id="name" type="text" autocomplete="name"></label>
      <label class="wfield"><span class="wlab">Email</span><input class="field" id="email" type="email" autocomplete="email" required></label>
      <label class="wfield"><span class="wlab">Password</span><input class="field" id="password" type="password" autocomplete="new-password" required></label>
      <button class="btn btn-primary btn-block" type="submit">Create account</button>
    </form>
    <p class="auth-alt">Already have an account? <a href="../sign-in/">Sign in</a></p>`);
}
function pageReset() {
  return authShell("reset", "Reset password", "Reset your Vootkit account password.", `
    <h1>Reset your password</h1>
    <p class="note">Enter your email and we'll send a reset link.</p>
    <form novalidate>
      <label class="wfield"><span class="wlab">Email</span><input class="field" id="email" type="email" autocomplete="email" required></label>
      <button class="btn btn-primary btn-block" type="submit">Send reset link</button>
    </form>
    <p class="auth-alt"><a href="../sign-in/">Back to sign in</a></p>`);
}
function pageUpdatePassword() {
  return authShell("update-password", "Set new password", "Set a new password for your Vootkit account.", `
    <h1>Set a new password</h1>
    <form novalidate>
      <label class="wfield"><span class="wlab">New password</span><input class="field" id="password" type="password" autocomplete="new-password" required></label>
      <button class="btn btn-primary btn-block" type="submit">Save new password</button>
    </form>`);
}
function pageCallback() {
  return authShell("callback", "Signing you in", "Completing sign-in.", `
    <h1>Signing you in…</h1>
    <p class="note">One moment while we confirm your account.</p>
    <div class="vk-skeleton" style="height:48px;margin-top:var(--s-4)"></div>`);
}

/* ---------- account / dashboard ---------- */
function accountPage() {
  const url = `${SITE}/account/`;
  const ld = { "@context": "https://schema.org", "@type": "WebPage", name: "Your account", url };
  return head({ depth: 1, url, ads: false, ld, title: "Your account — Vootkit", desc: "Your Vootkit account — favorites, history, subscription and settings." })
    .replace("</head>", '<meta name="robots" content="noindex">\n</head>') +
`<div class="wrap section">
  <div id="account" class="acct">
    <div class="vk-skeleton" style="height:80px;max-width:420px"></div>
  </div>
</div>` + foot(1, ["assets/js/account.js"]);
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
function proIllustration() {
  /* Inline SVG rather than an image: it scales, it themes with the site, and
     it costs no extra request on the page people land on to spend money. */
  const card = (x, y, label, delay) =>
    `<g class="pro-card" style="--d:${delay}s">
       <path d="M${x} ${y} l58 -33 58 33 -58 33Z" fill="var(--surface)" stroke="var(--line)"/>
       <path d="M${x} ${y} l58 33 0 13 -58 -33Z" fill="var(--surface-2,#eef2f7)" stroke="var(--line)"/>
       <path d="M${x + 116} ${y} l-58 33 0 13 58 -33Z" fill="var(--surface-2,#e4e9f0)" stroke="var(--line)"/>
       <text x="${x + 58}" y="${y + 2}" text-anchor="middle" class="pro-card-t">${esc(label)}</text>
     </g>`;
  return `<svg class="pro-art" viewBox="0 0 460 380" role="img" aria-label="Vootkit tools stacked as an isometric diagram">
    <defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="var(--brand)" stop-opacity=".14"/>
      <stop offset="1" stop-color="var(--brand)" stop-opacity="0"/>
    </linearGradient></defs>
    <ellipse cx="230" cy="250" rx="215" ry="120" fill="url(#pg)"/>
    ${card(60, 300, "Merge PDFs", 0)}
    ${card(150, 250, "Compress Image", .08)}
    ${card(60, 200, "Convert Video", .16)}
    ${card(150, 150, "JSON Formatter", .24)}
    ${card(60, 100, "Loan Calculator", .32)}
    <g class="pro-phone">
      <rect x="330" y="120" width="92" height="176" rx="14" fill="var(--surface)" stroke="var(--line)" stroke-width="2"/>
      <rect x="340" y="136" width="72" height="9" rx="4.5" fill="var(--line)"/>
      <rect x="340" y="154" width="52" height="9" rx="4.5" fill="var(--line)"/>
      <rect x="340" y="176" width="72" height="30" rx="6" fill="var(--surface-2,#eef2f7)" stroke="var(--line)"/>
      <rect x="340" y="214" width="72" height="30" rx="6" fill="var(--surface-2,#eef2f7)" stroke="var(--line)"/>
      <rect x="340" y="256" width="46" height="12" rx="6" fill="var(--brand)"/>
    </g>
  </svg>`;
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
      <p class="pro-lede">Every one of the ${floorTo(VK.counts.live, 50)}+ tools, without the daily cap and without ads.
      The same browser-based processing, running as fast as your machine will go.</p>
      <a class="btn btn-primary pro-cta" href="#plans" data-vk-track="upgrade_click">Upgrade to Vootkit Pro</a>
      <p class="pro-note">Cancel any time. The free plan keeps working either way.</p>
    </div>
    <div class="pro-hero-art">${proIllustration()}</div>
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
    { "@context": "https://schema.org", "@type": "WebPage", name: "Pricing", url, description: "Vootkit pricing — start free with 5 tool runs a day and unlimited core tools. Upgrade to Pro for unlimited usage, faster processing and premium tools." },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Vootkit", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Pricing", item: url }
    ]}
  ];
  const feat = (on, txt) => `<li class="${on ? "yes" : "no"}"><svg viewBox="0 0 24 24" aria-hidden="true">${on ? '<path d="M20 6 9 17l-5-5"/>' : '<path d="M6 6l12 12M18 6 6 18"/>'}</svg>${txt}</li>`;
  const yn = (v) => v === true ? '<span class="cmp-yes" aria-label="Included">✓</span>' : v === false ? '<span class="cmp-no" aria-label="Not included">—</span>' : v;
  return head({ depth: 0, url, ads: true, ld, title: "Pricing — Vootkit", ogTitle: "Vootkit Pricing", desc: "Start free with 5 tool runs a day and unlimited core tools. Upgrade to Creator Pro or Teams for unlimited usage, faster processing, premium tools and priority support." }) +
proHero() +
`<div class="wrap section" id="plans">
  <header class="sec-head" style="margin-top:var(--s-4)">
    <span class="eyebrow">Pricing</span>
    <!-- h2, not h1: the Pro hero above now carries the page's only h1. Two of
         them costs the outline for a screen reader and muddles which heading
         Google treats as the page subject. -->
    <h2 class="page-h1">Simple pricing that scales with you.</h2>
    <p class="page-lede">Start free — 5 tool runs a day, with core tools and downloaders always unlimited. Upgrade when you want unlimited usage, faster processing and premium tools.</p>
  </header>

  <div class="bill-toggle" role="group" aria-label="Billing period">
    <button class="bt-opt is-on" type="button" data-bill="month" aria-pressed="true">Monthly</button>
    <button class="bt-opt" type="button" data-bill="year" aria-pressed="false">Annual <span class="bt-save">2 months free</span></button>
  </div>

  <div class="plans">
    <div class="plan">
      <h2>Free</h2>
      <p class="plan-price"><span class="plan-amt">$0</span><span class="plan-per">forever</span></p>
      <p class="plan-tag">Everything most people need.</p>
      <a class="btn btn-block" href="tools/">Start using tools</a>
      <ul class="plan-feats">
        ${feat(true, "Access to all " + VK.counts.live + " tools")}
        ${feat(true, "5 tool runs per day")}
        ${feat(true, "Core tools &amp; downloaders unlimited")}
        ${feat(true, "No login required")}
        ${feat(true, "No watermarks")}
        ${feat(false, "Faster, premium processing")}
      </ul>
    </div>

    <div class="plan plan--featured">
      <span class="plan-flag">Most popular</span>
      <h2>Creator Pro</h2>
      <p class="plan-price"><span class="plan-amt" data-price="pro">$${P.creator_pro_monthly.amount}</span><span class="plan-per" data-per="pro">/month</span></p>
      <p class="plan-tag">For creators who live in these tools.</p>
      <button class="btn btn-primary btn-block" type="button" data-plan="creator_pro" data-plan-month="creator_pro_monthly" data-plan-year="creator_pro_annual">Upgrade to Pro</button>
      <ul class="plan-feats">
        ${feat(true, "Unlimited tool runs — no daily cap")}
        ${feat(true, "Faster, higher-res processing")}
        ${feat(true, "Premium &amp; early-access tools")}
        ${feat(true, "Larger file-size limits")}
        ${feat(true, "Cloud history across devices")}
        ${feat(true, "Priority support")}
      </ul>
    </div>

    <div class="plan">
      <h2>Creator Teams</h2>
      <p class="plan-price"><span class="plan-amt" data-price="teams">$${P.creator_teams_monthly.amount}</span><span class="plan-per" data-per="teams">/month</span></p>
      <p class="plan-tag">For studios and teams.</p>
      <button class="btn btn-block" type="button" data-plan="creator_teams" data-plan-month="creator_teams_monthly" data-plan-year="creator_teams_annual">Start a team</button>
      <ul class="plan-feats">
        ${feat(true, "Everything in Pro")}
        ${feat(true, "Shared team workspace")}
        ${feat(true, "Highest processing limits")}
        ${feat(true, "More cloud storage")}
        ${feat(true, "Centralised billing")}
        ${feat(true, "API access (coming)")}
      </ul>
    </div>
  </div>

  <div class="upgrade-note" style="text-align:center;margin-top:var(--s-5);padding:var(--s-4);background:var(--accent-weak);border:1px solid var(--accent-border);border-radius:var(--r-md);max-width:640px;margin-inline:auto">
    <p style="margin:0;color:var(--ink)"><strong>Reached today's free limit?</strong> Upgrade to Vootkit Pro for unlimited access and faster processing — cancel anytime.</p>
  </div>

  <p class="note" style="text-align:center;margin-top:var(--s-5)">Prices in USD. Cancel anytime. Core tools and downloaders never require a subscription.</p>

  <section style="margin-top:var(--s-8)">
    <div class="sec-head"><h2>Compare plans</h2></div>
    <div class="cmp-wrap">
      <table class="cmp-table">
        <thead><tr><th scope="col" style="text-align:left">Feature</th><th scope="col">Free</th><th scope="col" class="cmp-hi">Creator Pro</th><th scope="col">Creator Teams</th></tr></thead>
        <tbody>
          <tr><th scope="row">Access to all ${VK.counts.live} tools</th><td>${yn(true)}</td><td class="cmp-hi">${yn(true)}</td><td>${yn(true)}</td></tr>
          <tr><th scope="row">Daily tool runs</th><td>5 / day</td><td class="cmp-hi">Unlimited</td><td>Unlimited</td></tr>
          <tr><th scope="row">Core tools &amp; downloaders</th><td>Unlimited</td><td class="cmp-hi">Unlimited</td><td>Unlimited</td></tr>
          <tr><th scope="row">Login required</th><td>No</td><td class="cmp-hi">Optional</td><td>Yes</td></tr>
          <tr><th scope="row">Processing speed</th><td>Standard</td><td class="cmp-hi">Faster</td><td>Fastest</td></tr>
          <tr><th scope="row">File-size limits</th><td>Standard</td><td class="cmp-hi">Larger</td><td>Highest</td></tr>
          <tr><th scope="row">Premium &amp; early-access tools</th><td>${yn(false)}</td><td class="cmp-hi">${yn(true)}</td><td>${yn(true)}</td></tr>
          <tr><th scope="row">Cloud history across devices</th><td>${yn(false)}</td><td class="cmp-hi">${yn(true)}</td><td>${yn(true)}</td></tr>
          <tr><th scope="row">Shared team workspace</th><td>${yn(false)}</td><td class="cmp-hi">${yn(false)}</td><td>${yn(true)}</td></tr>
          <tr><th scope="row">Centralised billing</th><td>${yn(false)}</td><td class="cmp-hi">${yn(false)}</td><td>${yn(true)}</td></tr>
          <tr><th scope="row">Support</th><td>Standard</td><td class="cmp-hi">Priority</td><td>Priority + onboarding</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="prose faq" style="margin-top:var(--s-8)">
    <h2>Questions</h2>
    <details><summary>Is Vootkit free to use?</summary><p>Yes. The free plan gives you 5 tool runs a day across all ${VK.counts.live} tools, and core tools and downloaders stay unlimited. You only need Pro if you want unlimited daily usage, faster processing and premium tools.</p></details>
    <details><summary>What counts toward the 5 free runs a day?</summary><p>Heavier processing tasks — like converting or compressing a file. Simple browser-based tools and downloaders don't count and stay unlimited. When you reach the daily limit, you'll see a friendly prompt to upgrade; it resets the next day.</p></details>
    <details><summary>Do I need an account to use Vootkit?</summary><p>No. You can use the free tier without signing up. An account only exists to sync your history and manage a subscription if you choose to upgrade.</p></details>
    <details><summary>What do I get with Pro?</summary><p>Unlimited daily usage, faster and higher-resolution processing, premium and early-access tools, larger file-size limits, cloud history across your devices, and priority support.</p></details>
    <details><summary>Can I cancel?</summary><p>Anytime, from your account. You keep Pro until the end of the period you've paid for, then drop back to the (still fully usable) free tier.</p></details>
    <details><summary>How do you handle payment?</summary><p>Payments are processed by Stripe. We never see or store your card details.</p></details>
  </section>
</div>` + foot(0, ["assets/js/pricing.js"]);
}

const LAST_UPDATED = "22 July 2026";

write("pricing.html", pricingPage());
write("auth/sign-in/index.html", pageSignIn());
write("auth/sign-up/index.html", pageSignUp());
write("auth/reset/index.html", pageReset());
write("auth/update-password/index.html", pageUpdatePassword());
write("auth/callback/index.html", pageCallback());
write("account/index.html", accountPage());
write("privacy.html", legalPage({
  file: "privacy.html", title: "Privacy Policy", updated: LAST_UPDATED,
  desc: "How Vootkit handles your data. Most tools process files entirely in your browser and never upload them.",
  body: `
    <h2>The short version</h2>
    <p><strong>Most Vootkit tools never send your files anywhere.</strong> They run inside your browser using your own device's processing power. When a tool is local, your file is not uploaded, not stored, and not seen by us — there is nothing for us to keep or delete.</p>
    <p>Tools that <em>do</em> need the internet are labelled <span class="badge badge-net">uses an API</span> on their page and in search results. We do not hide this.</p>

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

write("about.html", infoPage({
  slug: "about.html", title: "About", eyebrow: "About",   // infoPage appends " — Vootkit"
  h1: "One home for every digital task.",
  desc: "Vootkit is a growing ecosystem of fast, private, browser-based tools — PDF, image, video, finance, developer and more. No installs, no accounts required.",
  lede: `Vootkit puts <strong>${VK.counts.live} tools</strong> in one place, most of them running entirely in your browser so your files never leave your device.`,
  body: `
  <section class="prose">
    <h2>Why Vootkit exists</h2>
    <p>The web is full of single-purpose tool sites — one for merging PDFs, another for resizing an image, a third for a quick calculation — each buried in ads and pop-ups. Vootkit brings them together into one clean, fast ecosystem you can trust, with a consistent experience across every tool.</p>

    <h2>What we believe</h2>
    <ul>
      <li><strong>Privacy by default.</strong> Most tools process your files locally in the browser. If a tool needs the internet, we label it <span class="badge badge-net">uses an API</span> — we never hide it.</li>
      <li><strong>Fast and frictionless.</strong> No installs, and no account required to use the tools. Open a tool and go.</li>
      <li><strong>A generous free core.</strong> The essential tools stay free, and downloaders are always unlimited. Pro simply adds convenience for people who live in these tools.</li>
      <li><strong>Built to grow.</strong> New tools ship constantly, each with its own identity inside the Vootkit ecosystem.</li>
    </ul>

    <h2>The ecosystem today</h2>
    <p>Vootkit spans ${VK.CATEGORIES.length} categories — from PDF and image editing to video, finance, real estate, developer utilities and everyday helpers. Explore them all on the <a href="tools/">Tools</a> page, or see what Pro adds on <a href="pricing.html">Pricing</a>.</p>
  </section>
  <div class="cta-band" style="margin-top:var(--s-7);padding:var(--s-6);border:1px solid var(--line);border-radius:var(--r-lg);text-align:center">
    <h2 style="margin:0 0 var(--s-2)">Find the tool you need</h2>
    <p class="page-lede" style="margin:0 auto var(--s-4)">Every digital task, done in your browser.</p>
    <a class="btn btn-primary" href="tools/">Browse all tools</a>
  </div>`
}));

write("contact.html", infoPage({
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
}));

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
  lede: "One click, no account needed. This takes a second.",
  body: `
  <p data-unsubscribe class="nl-status" role="status" aria-live="polite">Working\u2026</p>
  <p class="note" style="margin-top:var(--s-4)">If this page does not confirm within a few seconds, the link may have been
  broken by your email client. Reply to any email from us and we will remove you by hand.</p>
  <div class="cta-band" style="margin-top:var(--s-6);padding:var(--s-6);border:1px solid var(--line);border-radius:var(--r-lg);text-align:center">
    <h2 style="margin:0 0 var(--s-2)">The tools stay free either way</h2>
    <p class="page-lede" style="margin:0 auto var(--s-4)">No account, no email address, no limits on the ones that run in your browser.</p>
    <a class="btn btn-primary" href="../tools/">Browse all tools</a>
  </div>`
}));

const POSTS = loadPosts();
POSTS.forEach((p) => write(`blog/${p.slug}/index.html`, blogPostPage(p)));
write("blog/index.html", blogIndexPage(POSTS));
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
const enUrls = ["/", "/tools/", "/pricing.html", "/about.html", "/contact.html", "/privacy.html", "/terms.html", "/cookies.html", "/disclaimer.html"]
  .concat(POSTS.length ? ["/blog/"] : [])                       // only list blog when it has posts
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
fs.writeFileSync(path.join(ROOT, "assets", "css", "app.css"), cssBundle);
console.log(`app.css: ${CSS_PARTS.length} files -> ${(cssBundle.length / 1024).toFixed(1)} KB`);

fs.writeFileSync(path.join(ROOT, "_headers"), hlines.join("\n") + "\n");
console.log(`_headers: ${fxIds.length} isolated tool paths`);
