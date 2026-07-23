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
  "assets/js/tools-data.js": ["csv-viewer","json-csv"],
  "assets/js/tools-imaging.js": ["exif-viewer","color-from-image","meme-generator"],
  "assets/js/tools-codes.js": ["qr-generator","qr-scanner","barcode-generator"]
};
function widgetScriptsFor(id) {
  for (const file in WIDGETS) if (WIDGETS[file].indexOf(id) !== -1) return ["assets/js/widget.js", file];
  return null;
}
const SITE = "https://vootkit.com";
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
      <div><h4>Vootkit</h4><a href="${up}tools/">All tools</a><a href="${up}privacy.html">Privacy</a><a href="${up}terms.html">Terms</a></div>
      <div><h4>How it works</h4><p style="font-size:var(--t-sm);color:var(--ink-soft)">Most tools run entirely in your browser. Your files aren't uploaded, so there's no queue and no daily limit.</p></div>
    </div>
    <p style="margin-top:var(--s-6);font-size:var(--t-sm)">&copy; <span id="yr"></span> Vootkit — every digital task, done in your browser.</p>
  </div>
</footer>
<script src="${up}data/catalog.js"></script>
<script>
document.getElementById('yr').textContent=new Date().getFullYear();
(function(){var b=document.getElementById('burger'),n=document.getElementById('nav');
b.addEventListener('click',function(){var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o?'true':'false');b.setAttribute('aria-label',o?'Close menu':'Open menu');});
var t=document.getElementById('theme'),s=null;try{s=localStorage.getItem('vk-theme');}catch(e){}
if(s)document.documentElement.setAttribute('data-theme',s);
t.addEventListener('click',function(){var c=document.documentElement.getAttribute('data-theme'),x=c==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',x);try{localStorage.setItem('vk-theme',x);}catch(e){}});})();
</script>
<script src="${up}assets/js/recent.js" defer></script>
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

const LAST_UPDATED = "22 July 2026";

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
write("tools/index.html", allToolsPage()); pages++;
VK.CATEGORIES.forEach((c) => { write(`tools/${c.slug}/index.html`, categoryPage(c)); pages++; });
VK.TOOLS.forEach((t) => { write(`tools/${t.cat}/${t.id}/index.html`, toolPage(t)); pages++; });
console.log(`generated ${pages} pages`);

/* sitemap */
const urls = ["/", "/tools/", "/privacy.html", "/terms.html"]
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
const hlines = ["# Cross-origin isolation for in-browser video processing (scoped — no ad pages).", ""];
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
