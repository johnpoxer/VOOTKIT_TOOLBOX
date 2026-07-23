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
const ROOT = __dirname;
const VK = require("./data/catalog.js");
const MONEY = Object.assign({}, require("./assets/js/tools-money.js"), require("./assets/js/tools-money2.js"));
const IMAGE = require("./assets/js/tools-image.js");
const PDF = require("./assets/js/tools-pdf.js");
const VIDEO = require("./assets/js/tools-video.js");
const VIDEOFX = require("./assets/js/tools-videofx.js");
/* widget tools: text-in/out interactive tools sharing assets/js/widget.js.
 * We list ids here (their modules export logic, not id lists) so page
 * generation knows which module script to load. */
const WIDGETS = {
  "assets/js/tools-text.js": ["word-counter","case-converter","text-diff","readability","line-tools","lorem-ipsum","markdown-editor"],
  "assets/js/tools-dev.js": ["json-formatter","base64","jwt-decoder","uuid-generator","hash-generator","regex-tester","url-encoder","timestamp-converter"],
  "assets/js/tools-everyday.js": ["unit-converter","age-calculator","countdown","pomodoro","stopwatch","timezone-converter","random-picker"],
  "assets/js/tools-privacy.js": ["password-generator","password-strength","text-encrypt","file-checksum"],
  "assets/js/tools-design.js": ["color-converter","contrast-checker","gradient-generator","palette-generator","shadow-generator"],
  "assets/js/tools-seo.js": ["meta-tag-generator","serp-preview","og-preview","robots-generator","sitemap-generator","schema-generator","keyword-density","slug-generator","utm-builder"],
  "assets/js/tools-data.js": ["csv-viewer","json-csv","csv-to-chart"],
  "assets/js/tools-imaging.js": ["exif-viewer","color-from-image","meme-generator"],
  "assets/js/tools-codes.js": ["qr-generator","qr-scanner","barcode-generator"],
  "assets/js/tools-pdfview.js": ["pdf-to-jpg","pdf-to-text"],
  "assets/js/tools-a11y.js": ["accessible-palette","color-blind-simulator","heading-checker","alt-text-auditor","caption-validator"],
  "assets/js/tools-privacy2.js": ["url-cleaner","metadata-remover","screenshot-redactor"],
  "assets/js/tools-misc.js": ["salary-converter","typing-test","brb-overlay"],
  "assets/js/tools-business.js": ["invoice-generator","quote-generator"],
  "assets/js/tools-pdfedit.js": ["compress-pdf","pdf-redact","compare-pdf"],
  "assets/js/tools-currency.js": ["currency-converter"]
};
function widgetScriptsFor(id) {
  for (const file in WIDGETS) if (WIDGETS[file].indexOf(id) !== -1) return ["assets/js/widget.js", file];
  return null;
}
const CFG = require("./data/site.config.js");
const SITE = CFG.origin;
const SUPPORT = CFG.supportEmail;
const GA4 = CFG.ga4;
const PUB = "ca-pub-5906583727409402";

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const write = (rel, html) => {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html);
};

/* ---------- shared chrome ---------- */
function head(o) {
  // depth = how many ../ to reach site root
  const up = "../".repeat(o.depth) || "./";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="google-adsense-account" content="${PUB}">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#fbfcfe" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b1220" media="(prefers-color-scheme: dark)">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}">
<link rel="canonical" href="${o.url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Vootkit">
<meta property="og:title" content="${esc(o.ogTitle || o.title)}">
<meta property="og:description" content="${esc(o.desc)}">
<meta property="og:url" content="${o.url}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(o.ogTitle || o.title)}">
<meta name="twitter:description" content="${esc(o.desc)}">
<script type="application/ld+json">${JSON.stringify(o.ld)}</script>
<link rel="icon" href="${up}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@700;800&display=swap">
<link rel="stylesheet" href="${up}assets/css/tokens.css">
<link rel="stylesheet" href="${up}assets/css/base.css">
<link rel="stylesheet" href="${up}assets/css/pages.css">
${o.ads ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUB}" crossorigin="anonymous"></script>` : "<!-- no ads inside an active tool workspace -->"}
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA4}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4}');</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="hdr">
  <div class="wrap hdr-in">
    <a class="brand" href="${up}" aria-label="Vootkit home">
      <svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="17.5" fill="none" stroke="var(--accent)" stroke-opacity=".45" stroke-width="1.3" stroke-dasharray="17 7"/><path d="M12.5 14.5 21.5 30 31.5 13.5" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="33.5" cy="10.5" r="2.7" fill="#06b6d4"/></svg>
      vootkit
    </a>
    <nav class="nav" id="nav" aria-label="Main">
      <a href="${up}tools/">All tools</a>
      <a href="${up}tools/pdf/">PDF</a>
      <a href="${up}tools/images/">Images</a>
      <a href="${up}tools/video/">Video</a>
      <a href="${up}tools/finance/">Finance</a>
    </nav>
    <div class="hdr-act">
      <a class="icon-btn" href="${up}tools/" aria-label="Search tools">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>
      </a>
      <button class="icon-btn" id="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav">
        <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
      <button class="icon-btn" id="theme" type="button" aria-label="Switch theme">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/></svg>
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
      <div><h4>Vootkit</h4><a href="${up}tools/">All tools</a><a href="${up}pricing.html">Pricing</a><a href="${up}privacy.html">Privacy</a><a href="${up}terms.html">Terms</a><a href="mailto:${SUPPORT}">Contact</a></div>
      <div><h4>How it works</h4><p style="font-size:var(--t-sm);color:var(--ink-soft)">Most tools run entirely in your browser. Your files aren't uploaded, so there's no queue and no daily limit.</p></div>
    </div>
    <p style="margin-top:var(--s-6);font-size:var(--t-sm)">&copy; <span id="yr"></span> Vootkit — every digital task, done in your browser.</p>
  </div>
</footer>
<script src="${up}data/site.config.js"></script>
<script src="${up}data/catalog.js"></script>
<script>
document.getElementById('yr').textContent=new Date().getFullYear();
(function(){var b=document.getElementById('burger'),n=document.getElementById('nav');
b.addEventListener('click',function(){var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o?'true':'false');b.setAttribute('aria-label',o?'Close menu':'Open menu');});
var t=document.getElementById('theme'),s=null;try{s=localStorage.getItem('vk-theme');}catch(e){}
if(s)document.documentElement.setAttribute('data-theme',s);
t.addEventListener('click',function(){var c=document.documentElement.getAttribute('data-theme'),x=c==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',x);try{localStorage.setItem('vk-theme',x);}catch(e){}});})();
</script>
<script src="${up}assets/js/ui.js" defer></script>
<script src="${up}assets/js/recent.js" defer></script>
<script src="${up}assets/js/supabase-config.js" defer></script>
<script src="${up}assets/js/auth.js" defer></script>
${(extraScripts||[]).map(function(x){return '<script src="'+up+x+'" defer></script>';}).join("\n")}
</body>
</html>
`;
}

const badge = (t) => t.processing === "network"
  ? '<span class="badge badge-net">uses an API</span>'
  : '<span class="badge badge-local">runs on your device</span>';

function toolCard(t, up) {
  const soon = t.status !== "live";
  return `<a class="card tool-card${soon ? " is-soon" : ""}" href="${up}tools/${t.cat}/${t.id}/">
    <h3>${esc(t.name)}${soon ? ' <span class="soon">soon</span>' : ""}</h3>
    <p>${esc(t.desc)}</p>
    <span class="card-foot">${badge(t)}</span>
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
    desc: `Browse all ${VK.TOOLS.length} Vootkit tools across ${VK.CATEGORIES.length} categories. Most run entirely in your browser — no upload, no sign-up, no daily limit.` }) +
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
  <p class="res-cat" style="margin-bottom:var(--s-5)">${list.length} tools · no sign-up · no daily limit</p>
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
    { q: `Is ${t.name} free?`, a: `Yes. ${t.name} is free to use on Vootkit, with no account, no watermark and no daily task limit.` },
    { q: "Are my files uploaded?", a: local
        ? `No. ${t.name} runs entirely in your browser — your file is processed on your own device and never sent to a server. There is nothing for us to store or delete.`
        : `${t.name} needs the internet to work, so it calls an external service to fetch data. It does not require an account and does not track you.` },
    { q: "Do I need to install anything?", a: `No. ${t.name} works in any modern browser on desktop, tablet or phone. Open the page and start.` },
    { q: "Is there a limit on how many times I can use it?", a: local
        ? "No. Because the work happens on your device rather than our servers, there is no per-task cost and therefore no daily cap."
        : "There are fair-use limits to keep the service available for everyone, but normal use is unlimited." }
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

  return head({ depth: 3, url, ads: false, ld,   // rule: no ads in an active tool workspace
    title: `${t.name} — Free Online ${c.name} Tool | Vootkit`,
    ogTitle: t.name,
    desc: `${t.desc} Free, ${local ? "runs in your browser" : "no sign-up"}, no watermark, no daily limit.` }) +
`<div class="wrap section tool-page">
  <nav class="crumb" aria-label="Breadcrumb"><a href="../../../">Vootkit</a> <span aria-hidden="true">›</span> <a href="../../">Tools</a> <span aria-hidden="true">›</span> <a href="../">${esc(c.name)}</a> <span aria-hidden="true">›</span> <span aria-current="page">${esc(t.name)}</span></nav>

  <!-- 1. workspace -->
  <header class="tool-head">
    <h1 class="page-h1">${esc(t.name)}</h1>
    <p class="page-lede">${esc(t.desc)}</p>
    <div class="trust">${badge(t)}<span class="badge">no sign-up</span><span class="badge">no watermark</span><span class="badge">no daily limit</span></div>
  </header>
  ${workspace}

  <!-- 2-4. explanation, benefits, how it works -->
  <section class="prose">
    <h2>What ${esc(t.name)} does</h2>
    <p>${esc(t.desc)} It's one of ${VK.TOOLS.length} tools in the Vootkit ecosystem, built to do a single job properly — open it, get your result, move on.</p>

    <h2>Why use this one</h2>
    <ul>
      <li><strong>${local ? "Nothing is uploaded." : "No account needed."}</strong> ${local ? "Your file is processed on your own device, so it never travels to a server." : "Use it immediately — no sign-up, no email."}</li>
      <li><strong>No daily limit.</strong> ${local ? "Your device does the work, so there's no per-task cost to ration." : "Fair-use limits only."}</li>
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
</div>` + foot(3, hasCalc ? (VIDEO[t.id] ? ['assets/js/calc.js','assets/js/tools-video.js'] : ['assets/js/calc.js','assets/js/tools-money.js','assets/js/tools-money2.js'])
    : hasFile ? ['assets/js/filetool.js','assets/js/tools-image.js']
    : hasPdf ? ['assets/js/filetool.js','assets/js/tools-pdf.js']
    : hasVideoFx ? ['assets/js/filetool.js','assets/js/videoengine.js','assets/js/tools-videofx.js']
    : widgetScripts ? widgetScripts : []);
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
    { "@context": "https://schema.org", "@type": "WebPage", name: "Pricing", url, description: "Vootkit pricing — every tool is free, no login, no limits. Upgrade for no ads, cloud history and premium features." },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Vootkit", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Pricing", item: url }
    ]}
  ];
  const feat = (on, txt) => `<li class="${on ? "yes" : "no"}"><svg viewBox="0 0 24 24" aria-hidden="true">${on ? '<path d="M20 6 9 17l-5-5"/>' : '<path d="M6 6l12 12M18 6 6 18"/>'}</svg>${txt}</li>`;
  return head({ depth: 0, url, ads: true, ld, title: "Pricing — Vootkit", ogTitle: "Vootkit Pricing", desc: "Every Vootkit tool is free, with no login and no limits. Upgrade to Creator Pro or Teams for no ads, cloud history, premium tools and priority support." }) +
`<div class="wrap section">
  <header class="sec-head" style="margin-top:var(--s-4)">
    <span class="eyebrow">Pricing</span>
    <h1 class="page-h1">The tools are free. Forever.</h1>
    <p class="page-lede">Every downloader and tool works with no login and no limits. Upgrade only if you want the extras — no ads, cloud history and premium processing.</p>
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
        ${feat(true, "All " + VK.counts.live + " tools")}
        ${feat(true, "No login, ever")}
        ${feat(true, "No daily limits")}
        ${feat(true, "No watermarks")}
        ${feat(true, "Runs on your device")}
        ${feat(false, "Ads on content pages")}
      </ul>
    </div>

    <div class="plan plan--featured">
      <span class="plan-flag">Most popular</span>
      <h2>Creator Pro</h2>
      <p class="plan-price"><span class="plan-amt" data-price="pro">$${P.creator_pro_monthly.amount}</span><span class="plan-per" data-per="pro">/month</span></p>
      <p class="plan-tag">For creators who live in these tools.</p>
      <button class="btn btn-primary btn-block" type="button" data-plan="creator_pro" data-plan-month="creator_pro_monthly" data-plan-year="creator_pro_annual">Upgrade to Pro</button>
      <ul class="plan-feats">
        ${feat(true, "Everything in Free")}
        ${feat(true, "No ads, anywhere")}
        ${feat(true, "Faster, higher-res processing")}
        ${feat(true, "Premium & early-access tools")}
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
        ${feat(true, "Higher processing limits")}
        ${feat(true, "API access (coming)")}
        ${feat(true, "Centralised billing")}
        ${feat(true, "Onboarding support")}
      </ul>
    </div>
  </div>

  <p class="note" style="text-align:center;margin-top:var(--s-5)">Prices in USD. Cancel anytime. The core tools never require a subscription.</p>

  <section class="prose faq" style="margin-top:var(--s-8)">
    <h2>Questions</h2>
    <details><summary>Are the tools really free?</summary><p>Yes. Every tool and downloader works free, with no account and no daily limit. Most run entirely in your browser, so there's nothing for us to meter. Paid plans only add conveniences like removing ads and syncing history.</p></details>
    <details><summary>Do I need an account to use Vootkit?</summary><p>No. You can use everything without signing up. An account only exists to sync your history and manage a subscription if you choose to upgrade.</p></details>
    <details><summary>What do I actually get with Pro?</summary><p>No ads across the whole site, faster and higher-resolution processing, premium and early-access tools, cloud history across your devices, and priority support.</p></details>
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

/* ---------- run ---------- */
let pages = 2;
write("components/index.html", componentsPage()); pages++;
write("tools/index.html", allToolsPage()); pages++;
VK.CATEGORIES.forEach((c) => { write(`tools/${c.slug}/index.html`, categoryPage(c)); pages++; });
VK.TOOLS.forEach((t) => { write(`tools/${t.cat}/${t.id}/index.html`, toolPage(t)); pages++; });
console.log(`generated ${pages} pages`);

/* sitemap */
const urls = ["/", "/tools/", "/pricing.html", "/privacy.html", "/terms.html"]
  .concat(VK.CATEGORIES.map((c) => `/tools/${c.slug}/`))
  .concat(VK.TOOLS.map((t) => `/tools/${t.cat}/${t.id}/`));
fs.writeFileSync(path.join(ROOT, "sitemap.xml"),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc><changefreq>${u === "/" ? "weekly" : "monthly"}</changefreq></url>`).join("\n")}
</urlset>
`);
console.log(`sitemap: ${urls.length} urls`);

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

const lines = ["# 301s from the previous URL scheme — keep indexed pages alive", ""];
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
fs.writeFileSync(path.join(ROOT, "_headers"), hlines.join("\n") + "\n");
console.log(`_headers: ${fxIds.length} isolated tool paths`);
