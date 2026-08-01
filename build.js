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
const PUB = "ca-pub-5906583727409402";
/* Cache-bust key derived from the CONTENT of the CSS/JS assets, so it only
 * changes when those files actually change — a rebuild with no asset changes
 * produces byte-identical pages (no more 600-file git churn every build). */
const V = "?v=" + (function () {
  const crypto = require("crypto");
  const h = crypto.createHash("sha1");
  const css = ["tokens", "base", "pages", "skin"].map((n) => "assets/css/" + n + ".css");
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
<meta property="og:url" content="${o.url}">${o.image ? `\n<meta property="og:image" content="${o.image}">` : ""}
<meta name="twitter:card" content="${o.image ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${esc(o.ogTitle || o.title)}">
<meta name="twitter:description" content="${esc(o.desc)}">${o.image ? `\n<meta name="twitter:image" content="${o.image}">` : ""}
<script type="application/ld+json">${JSON.stringify(o.ld)}</script>
<link rel="icon" href="${up}favicon.ico" sizes="any">
<link rel="icon" href="${up}assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${up}apple-touch-icon.png">
<link rel="manifest" href="${up}site.webmanifest">
<link rel="stylesheet" href="${up}assets/css/app.css${V}">
${o.ads ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUB}" crossorigin="anonymous"></script>` : "<!-- no ads inside an active tool workspace -->"}
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

function foot(depth, extraScripts) {
  const up = "../".repeat(depth) || "./";
  const cats = VK.CATEGORIES.slice(0, 8)
    .map((c) => `<a href="${up}tools/${c.slug}/">${esc(c.name)}</a>`).join("");
  return `</main>
<footer class="ftr">
  <div class="wrap">
    <div class="ftr-grid">
      <div><h4>Categories</h4>${cats}</div>
      <div><h4>Vootkit</h4><a href="${up}tools/">All tools</a><a href="${up}pricing.html">Pricing</a><a href="${up}about.html">About</a><a href="${up}privacy.html">Privacy</a><a href="${up}terms.html">Terms</a><a href="${up}contact.html">Contact &amp; support</a></div>
      <div><h4>How it works</h4><p style="font-size:var(--t-sm);color:var(--ink-soft)">Most tools run entirely in your browser, so your files aren't uploaded and there's no queue. The free plan includes 5 tool runs a day.</p></div>
    </div>
    <p style="margin-top:var(--s-6);font-size:var(--t-sm)">&copy; <span id="yr"></span> Vootkit — every digital task, done in your browser.</p>
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
<script src="${up}assets/js/ui.js${V}" defer></script>
<script src="${up}assets/js/recent.js${V}" defer></script>
<script src="${up}assets/js/supabase-config.js${V}" defer></script>
<script src="${up}assets/js/errors.js${V}" defer></script>
<script src="${up}assets/js/convert.js${V}" defer></script>
<script src="${up}assets/js/auth.js${V}" defer></script>
<script src="${up}assets/js/usage.js${V}" defer></script>
${(extraScripts||[]).map(function(x){return '<script src="'+up+x+V+'" defer></script>';}).join("\n")}
</body>
</html>
`;
}

const badge = (t) => t.processing === "network"
  ? '<span class="badge badge-net">uses an API</span>'
  : '<span class="badge badge-local">runs on your device</span>';

/* category lookup + icon set (mirrors assets/js/home.js so cards render at build time) */
const CATBY = {};
VK.CATEGORIES.forEach((c) => { CATBY[c.slug] = c; });
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
  "compress-for-discord", "video-to-gif", "mortgage-calculator", "loan-calculator",
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
/* hreflang alternates for a tool: English + any fully-translated locales */
function altsForTool(t) {
  const base = "/tools/" + t.cat + "/" + t.id + "/";
  const arr = [{ code: "en", href: SITE + base }];
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
    <span class="tc-top"><span class="ic">${icon(c.icon)}</span><span class="tc-tags">${tags}</span></span>
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
    title: `All ${VK.TOOLS.length} Tools — Vootkit`,
    ogTitle: "All Vootkit tools",
    desc: `Browse all ${VK.TOOLS.length} Vootkit tools across ${VK.CATEGORIES.length} categories. Most run entirely in your browser — no upload, no sign-up, 5 free uses a day.` }) +
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
    title: `${c.name} Tools — ${list.length} Free Online Tools | Vootkit`,
    ogTitle: `${c.name} tools`,
    desc: c.blurb.slice(0, 155) }) +
`<div class="wrap section">
  <nav class="crumb" aria-label="Breadcrumb"><a href="../../">Vootkit</a> <span aria-hidden="true">›</span> <a href="../">Tools</a> <span aria-hidden="true">›</span> <span aria-current="page">${esc(c.name)}</span></nav>
  <h1 class="page-h1">${esc(c.name)} tools</h1>
  <p class="page-lede">${esc(c.blurb)}</p>
  <p class="res-cat" style="margin-bottom:var(--s-5)">${list.length} tools · no sign-up · 5 free a day</p>
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
  const related = VK.byCategory(t.cat).filter((x) => x.id !== t.id).slice(0, 6);

  const faqs = [
    { q: `Is ${t.name} free?`, a: `Yes. The Vootkit free plan includes 5 tool runs a day, with no account and no watermark. Upgrade to Vootkit Pro for unlimited daily use, faster processing and premium tools.` },
    { q: "Are my files uploaded?", a: local
        ? `No. ${t.name} runs entirely in your browser — your file is processed on your own device and never sent to a server. There is nothing for us to store or delete.`
        : `${t.name} needs the internet to work, so it calls an external service to fetch data. It does not require an account and does not track you.` },
    { q: "Do I need to install anything?", a: `No. ${t.name} works in any modern browser on desktop, tablet or phone. Open the page and start.` },
    { q: "How often can I use it? Is there a daily limit?", a: "On the free plan you get 5 tool runs a day. When you reach the limit you'll see a prompt to upgrade, and it resets the next day. Vootkit Pro removes the cap entirely for unlimited daily use." }
  ];
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
    desc: `${t.desc} ${local ? "Runs in your browser" : "No sign-up"}, no watermark, 5 free uses a day.` });
  // under-construction ("soon") tools are thin — keep them out of the index (AdSense quality)
  if (!live) pageHead = pageHead.replace("</head>", '<meta name="robots" content="noindex,follow">\n</head>');
  return pageHead +
`<div class="wrap section tool-page">
  <nav class="crumb" aria-label="Breadcrumb"><a href="../../../">Vootkit</a> <span aria-hidden="true">›</span> <a href="../../">Tools</a> <span aria-hidden="true">›</span> <a href="../">${esc(c.name)}</a> <span aria-hidden="true">›</span> <span aria-current="page">${esc(t.name)}</span></nav>

  <!-- 1. workspace -->
  <header class="tool-head">
    <h1 class="page-h1">${esc(t.name)}</h1>
    <p class="page-lede">${esc(t.desc)}</p>
    <div class="trust">${badge(t)}<span class="badge">no sign-up</span><span class="badge">no watermark</span><span class="badge">5 free a day</span></div>
  </header>
  ${workspace}

  <!-- 2-4. explanation, benefits, how it works -->
  <section class="prose">
    <h2>What ${esc(t.name)} does</h2>
    <p>${esc(t.desc)} It's one of ${VK.TOOLS.length} tools in the Vootkit ecosystem, built to do a single job properly — open it, get your result, move on.</p>

    <h2>Why use this one</h2>
    <ul>
      <li><strong>${local ? "Nothing is uploaded." : "No account needed."}</strong> ${local ? "Your file is processed on your own device, so it never travels to a server." : "Use it immediately — no sign-up, no email."}</li>
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
  </section>

  <!-- 5. FAQ -->
  <section class="prose faq">
    <h2>Questions</h2>
    ${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("\n    ")}
  </section>

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
  const pageHead = head({ depth: 4, url, ads: true, ld, cat: t.cat, lang: code, dir: loc.dir, alts: altsForTool(t), title: title, ogTitle: name, desc: metaDesc });
  const relHtml = related.length
    ? `<section class="section"><h2 class="h-sm">${esc(fillStr(C.sec_next, M))}</h2><div class="grid">${related.map((r) => {
        const rc = CATBY[r.cat] || {}, rt = I18N.tools[code][r.id];
        return `<a class="card tool-card" data-cat="${r.cat}" href="../${r.id}/"><span class="tc-top"><span class="ic">${icon(rc.icon)}</span></span><h3>${esc(rt.name)}</h3><p>${esc(rt.desc)}</p><span class="card-foot"><span class="tc-cat">${esc(rc.name || r.cat)}</span>${badgeI18n(r, C)}</span></a>`;
      }).join("")}</div></section>`
    : "";
  return pageHead +
`<div class="wrap section tool-page">
  <nav class="crumb" aria-label="Breadcrumb"><a href="${up}">Vootkit</a> <span aria-hidden="true">›</span> <a href="${up}tools/">${esc(C.crumb_tools)}</a> <span aria-hidden="true">›</span> <a href="${up}tools/${t.cat}/">${esc(c.name)}</a> <span aria-hidden="true">›</span> <span aria-current="page">${esc(name)}</span></nav>
  <header class="tool-head">
    <h1 class="page-h1">${esc(name)}</h1>
    <p class="page-lede">${esc(desc)}</p>
    <div class="trust">${badgeI18n(t, C)}<span class="badge">${esc(C.badge_nosignup)}</span><span class="badge">${esc(C.badge_nowatermark)}</span><span class="badge">${esc(C.badge_free)}</span></div>
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
</div>` + foot(depth, o.scripts);
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
  <div class="cta-band" style="margin-top:var(--s-7);padding:var(--s-6);border:1px solid var(--line);border-radius:var(--r-lg);text-align:center">
    <h2 style="margin:0 0 var(--s-2)">Try it yourself</h2>
    <p class="page-lede" style="margin:0 auto var(--s-4)">Every Vootkit tool runs free in your browser.</p>
    <a class="btn btn-primary" href="../../tools/">Browse all tools</a>
  </div>
</div>` + foot(2);
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
    <span class="badge">no sign-up</span>
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
`<div class="wrap section">
  <header class="sec-head" style="margin-top:var(--s-4)">
    <span class="eyebrow">Pricing</span>
    <h1 class="page-h1">Simple pricing that scales with you.</h1>
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

write("about.html", infoPage({
  slug: "about.html", title: "About Vootkit", eyebrow: "About",
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

const POSTS = loadPosts();
POSTS.forEach((p) => write(`blog/${p.slug}/index.html`, blogPostPage(p)));
write("blog/index.html", blogIndexPage(POSTS));
write("admin-console/index.html", adminConsolePage(POSTS));

/* ---------- run ---------- */
let pages = 2;
write("components/index.html", componentsPage()); pages++;
write("tools/index.html", allToolsPage()); pages++;
VK.CATEGORIES.forEach((c) => { write(`tools/${c.slug}/index.html`, categoryPage(c)); pages++; });
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
const enUrls = ["/", "/tools/", "/pricing.html", "/about.html", "/contact.html", "/privacy.html", "/terms.html"]
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
const lines = ["# 301s from the previous URL scheme — keep indexed pages alive", "",
  "# Directory URLs are canonical: /x/index.html duplicates /x/ on every page.",
  "/*/index.html   /:splat/   301!", ""];
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
const CSS_PARTS = ["tokens.css", "base.css", "pages.css", "skin.css"];
const cssBundle = CSS_PARTS
  .map((f) => `/* ---- ${f} ---- */\n` + fs.readFileSync(path.join(ROOT, "assets", "css", f), "utf8"))
  .join("\n");
fs.writeFileSync(path.join(ROOT, "assets", "css", "app.css"), cssBundle);
console.log(`app.css: ${CSS_PARTS.length} files -> ${(cssBundle.length / 1024).toFixed(1)} KB`);

fs.writeFileSync(path.join(ROOT, "_headers"), hlines.join("\n") + "\n");
console.log(`_headers: ${fxIds.length} isolated tool paths`);
