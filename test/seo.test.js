/* seo.test.js — SEO generators verified for correctness + valid output. */
"use strict";
const assert = require("assert");
global.window = global;
const S = require("../assets/js/tools-seo.js");
const VK = require("../data/catalog.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.strictEqual(a, b, m); pass++; };

/* meta tags */
let mt = S.metaTags({ title: "Hi", description: "Desc", canonical: "https://x.com", image: "https://x.com/o.jpg" });
ok(/<title>Hi<\/title>/.test(mt), "title tag");
ok(/og:title" content="Hi"/.test(mt), "og:title");
ok(/twitter:card" content="summary_large_image"/.test(mt), "large image card when image present");
ok(S.metaTags({ title: "A" }).indexOf("summary_large_image") === -1, "plain summary when no image");
ok(S.metaTags({ title: '<script>' }).indexOf("<script>") === -1, "escapes injected html");

/* robots */
let r = S.robotsTxt({ disallow: ["/admin/", " "], sitemap: "https://x.com/sitemap.xml" });
ok(/User-agent: \*/.test(r), "default user-agent *");
ok(/Disallow: \/admin\//.test(r), "disallow path");
ok(/Sitemap: https:\/\/x.com\/sitemap.xml/.test(r), "sitemap line");
ok(/Disallow: \/admin\//.test(r) && !/Disallow:\s*$/m.test(r.replace(/Disallow: \/admin\//,'')), "no stray empty disallow when a path exists");
ok(/Disallow:\s*$/m.test(S.robotsTxt({})), "empty config -> allow-all (Disallow:)");

/* sitemap */
let sm = S.sitemapXml(["https://x.com/", "https://x.com/a", " "], { changefreq: "weekly" });
ok(/^<\?xml/.test(sm), "xml declaration");
ok((sm.match(/<url>/g) || []).length === 2, "2 urls (blank dropped)");
ok(/<changefreq>weekly<\/changefreq>/.test(sm), "changefreq included");
ok(/<loc>https:\/\/x.com\/<\/loc>/.test(sm), "loc present");

/* schema JSON-LD — must be valid JSON inside the script tag */
let sc = S.schemaJsonLd("FAQPage", { faqs: [{ q: "Q1?", a: "A1" }, { q: "Q2?", a: "A2" }] });
let json = JSON.parse(sc.replace(/^<script[^>]*>\n/, "").replace(/\n<\/script>$/, ""));
eq(json["@type"], "FAQPage", "FAQ type");
eq(json.mainEntity.length, 2, "2 questions");
eq(json.mainEntity[0].acceptedAnswer.text, "A1", "answer text");
let prod = JSON.parse(S.schemaJsonLd("Product", { title: "P", price: "9.99", currency: "USD" }).replace(/^<script[^>]*>\n/, "").replace(/\n<\/script>$/, ""));
eq(prod.offers.price, "9.99", "product price");
let bc = JSON.parse(S.schemaJsonLd("BreadcrumbList", { crumbs: [{ name: "Home", url: "https://x.com" }] }).replace(/^<script[^>]*>\n/, "").replace(/\n<\/script>$/, ""));
eq(bc.itemListElement[0].position, 1, "breadcrumb position 1-based");

/* utm */
eq(S.utmUrl("https://x.com", { source: "nl", medium: "email", campaign: "c" }), "https://x.com?utm_source=nl&utm_medium=email&utm_campaign=c", "utm build");
eq(S.utmUrl("https://x.com?a=1", { source: "nl" }), "https://x.com?a=1&utm_source=nl", "appends with & when query exists");
eq(S.utmUrl("https://x.com", {}), "https://x.com", "no params -> unchanged");
ok(S.utmUrl("https://x.com", { campaign: "a b" }).indexOf("a%20b") !== -1, "encodes spaces");

/* slug + keyword density */
eq(S.slugify("Hello, World! 2026"), "hello-world-2026", "slug");
let kd = S.keywordDensity("the browser browser tools tools tools", 5);
eq(kd.top[0].word, "tools", "most frequent non-stopword");
eq(kd.top[0].count, 3, "tools x3");
ok(!kd.top.some(x => x.word === "the"), "stop-word 'the' excluded");

/* SERP truncation */
ok(S.truncatePx("short", 600) === "short", "short title untouched");
let long = "A very very very very very very very very very very very very long title here that keeps going well past the visible pixel limit Google allows for one line";
ok(S.truncatePx(long, 600).length < long.length && /…$/.test(S.truncatePx(long, 600)), "long title truncated with ellipsis");

/* catalog */
["meta-tag-generator","serp-preview","og-preview","robots-generator","sitemap-generator","schema-generator","keyword-density","slug-generator","utm-builder"]
  .forEach(id => { const t = VK.find(id); ok(t && t.status === "live" && t.cat === "seo", id + " live in seo"); });

console.log(`seo: ${pass} assertions passed`);

/* ---------------------------------------------------------------------------
 * Tool <title> length — 87 pages previously exceeded Google's ~60 char display
 * limit because the pattern was fixed at `Name — Free Online <Category> Tool |
 * Vootkit`. Worst case was 82 chars, so the brand and half the descriptor were
 * truncated in results on pages whose whole job is attracting the click.
 * build.js now degrades: category first, then descriptor, keeping name + brand.
 *
 * Asserted against the GENERATED pages rather than by importing build.js —
 * requiring build.js executes the whole build as a side effect.
 * ------------------------------------------------------------------------- */
{
  const fs2 = require("fs"), path2 = require("path");
  const root2 = path2.join(__dirname, "..");
  const walk2 = (d, acc = []) => {
    for (const e of fs2.readdirSync(d, { withFileTypes: true })) {
      const p = path2.join(d, e.name);
      if (e.isDirectory()) walk2(p, acc);
      else if (e.name === "index.html") acc.push(p);
    }
    return acc;
  };
  const pages2 = walk2(path2.join(root2, "tools"));
  const titles = pages2
    .map(f => {
      const h = fs2.readFileSync(f, "utf8");
      if (!/id=["']workspace["']/.test(h)) return null;      // category hubs excluded
      const m = /<title>([^<]*)<\/title>/.exec(h);
      if (!m) return null;
      /* Measure the DECODED title. "Audio & Voice" is stored as "Audio &amp;
         Voice" — 4 extra characters in the source that the user never sees and
         Google never counts. Measuring raw HTML over-reports length on every
         category containing an ampersand. */
      const decoded = m[1]
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      return { file: path2.relative(root2, f), title: decoded };
    })
    .filter(Boolean);

  ok(titles.length > 200, `found ${titles.length} tool titles to check`);

  const over = titles.filter(t => t.title.length > 60);
  ok(over.length === 0,
     `every tool title fits 60 chars` +
     (over.length ? ` — ${over.length} over, worst: "${over[0].title}" (${over[0].title.length})` : ""));

  ok(titles.every(t => t.title.includes("Vootkit")), "brand survives in every title");
  ok(titles.every(t => !/\|\s*$/.test(t.title)), "no title ends in a dangling separator");
  ok(titles.every(t => t.title.trim().length > 10), "no title collapsed to nothing");

  // the category qualifier should still be kept where it fits
  const withCat = titles.filter(t => /Free Online \w[\w &-]* Tool/.test(t.title));
  ok(withCat.length > 50, `category qualifier retained where it fits (${withCat.length} pages)`);
}


/* ---------------------------------------------------------------------------
 * SITEMAP SCOPE — ENGLISH ONLY
 *
 * Search Console, 1 Aug 2026, with all 1,484 URLs listed: 10 indexed, 54
 * "Crawled — currently not indexed", average position 84.8, two clicks in three
 * months. A sitemap is a request for crawl attention; on a domain with no
 * authority, asking for nine near-duplicate translations of every page before
 * one English page ranks spends that attention on pages that cannot convert it.
 *
 * The localised pages must STAY LIVE with hreflang intact — this is a
 * prioritisation change, not a removal. Both halves are asserted here because
 * getting only half of it right is worse than doing neither.
 * ------------------------------------------------------------------------- */
{
  const fs = require("fs"), path = require("path");
  const root = path.join(__dirname, "..");
  /* sitemap.xml is now an INDEX; the URLs live in the child sitemaps. */
  const idx = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  ok(/<sitemapindex/.test(idx), "sitemap.xml is a sitemap index");
  const children = [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  ok(children.length >= 2, "the index lists child sitemaps, got " + children.length);
  ok(children.every(u => /^https:\/\/www\.vootkit\.com\/sitemap-[a-z]+\.xml$/.test(u)),
     "child sitemap URLs are absolute and correctly named");

  let sm = "";
  children.forEach(u => {
    const f = path.join(root, u.split("/").pop());
    ok(fs.existsSync(f), "child sitemap " + u.split("/").pop() + " exists on disk");
    sm += fs.readFileSync(f, "utf8");
    ok(/<urlset/.test(fs.readFileSync(f, "utf8")), u.split("/").pop() + " is a urlset, not another index");
  });
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

  /* Sections must partition the URLs — no page in two sitemaps, none missing. */
  const toolsSm = fs.readFileSync(path.join(root, "sitemap-tools.xml"), "utf8");
  const toolLocs = [...toolsSm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  ok(toolLocs.every(u => u.includes("/tools/")), "sitemap-tools.xml contains only tool URLs");
  ok(toolLocs.length > 200, "the tool sitemap carries the bulk of the pages, got " + toolLocs.length);

  ok(locs.length > 200, "the sitemap still lists the English pages, got " + locs.length);
  const localised = locs.filter(u => /vootkit\.com\/(ar|de|es|fr|hi|id|it|pt|zh)\//.test(u));
  eq(localised.length, 0, "no localised URL is listed, got " + localised.length);

  ok(/<lastmod>\d{4}-\d\d-\d\d<\/lastmod>/.test(sm), "entries carry a lastmod so Google can prioritise recrawls");
  ok(locs.every(u => u.startsWith("https://www.vootkit.com/")), "every entry is absolute and on the canonical host");
  eq(locs.length, new Set(locs).size, "no duplicate entries");

  /* The pages themselves must still exist and still declare their alternates,
     or this stops being a prioritisation change and becomes a deletion. */
  const sample = path.join(root, "es/tools/developer/json-formatter/index.html");
  if (fs.existsSync(sample)) {
    const html = fs.readFileSync(sample, "utf8");
    ok(/hreflang="es"/.test(html) && /hreflang="en"/.test(html),
       "localised pages keep their hreflang alternates");
    ok(/rel="canonical" href="https:\/\/www\.vootkit\.com\/es\//.test(html),
       "a localised page still self-canonicalises rather than pointing at English");
    ok(!/noindex/i.test(html), "localised pages are not noindexed — they stay indexable, just not prioritised");
  }

  /* robots.txt must keep pointing at the sitemap, and must not have started
     blocking the localised directories. */
  const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
  ok(/Sitemap: https:\/\/www\.vootkit\.com\/sitemap\.xml/.test(robots), "robots.txt still declares the sitemap");
  ok(!/Disallow: \/(ar|de|es|fr|hi|id|it|pt|zh)/.test(robots), "localised paths are not disallowed");
}


/* ---------------------------------------------------------------------------
 * DEEP TOOL CONTENT
 *
 * Measured 1 Aug 2026: 261 tool pages with a median of 95 words that did not
 * appear on the other 260, and 65% vocabulary overlap between two unrelated
 * tools. Google marked 54 crawled pages "currently not indexed". These
 * assertions protect the fix and, more importantly, the ACCURACY of it —
 * a spec table that drifts from the tool it describes is worse than none,
 * because those are the numbers people quote.
 * ------------------------------------------------------------------------- */
{
  const fs = require("fs"), path = require("path");
  const root = path.join(__dirname, "..");
  const TC = require("../data/tool-content.js");
  const CAT = require("../data/catalog.js");

  const ids = Object.keys(TC).filter(k => k !== "LIMITS");
  ok(ids.length >= 10, "at least 10 tools have deep content, got " + ids.length);

  ids.forEach(id => {
    const t = CAT.TOOLS.find(x => x.id === id);
    ok(t, "deep content '" + id + "' matches a real tool");
    ok(t && t.status === "live", id + " is live — never write deep copy for a tool that does not work");

    const d = TC[id];
    ok(d.intro && d.intro.length > 120, id + ": intro is substantial");
    ok(Array.isArray(d.what) && d.what.length >= 1, id + ": has a 'what it does' section");
    ok(d.specs && d.specs.caption && d.specs.rows.length >= 5,
       id + ": spec table has at least 5 rows — this is the section that earns links");
    d.specs.rows.forEach(r => ok(Array.isArray(r) && r.length === 2 && r[0] && r[1],
       id + ": every spec row is a filled [label, value] pair"));
    ok(Array.isArray(d.steps) && d.steps.length >= 3, id + ": has usable steps");
    ok(d.tip && d.tip.length > 80, id + ": has a substantive 'worth knowing' note");
    ok(Array.isArray(d.faqs) && d.faqs.length >= 4, id + ": has at least 4 specific FAQs");
    d.faqs.forEach(f => {
      ok(f.q && f.a, id + ": every FAQ has a question and an answer");
      ok(f.a.length > 80, id + ": FAQ answers are real answers, not one-liners");
    });

    /* Related tools must exist and be live, or the page renders dead links. */
    (d.related || []).forEach(rid => {
      const r = CAT.TOOLS.find(x => x.id === rid);
      ok(r, id + ": related tool '" + rid + "' exists");
      ok(r && r.status === "live", id + ": related tool '" + rid + "' is live");
    });
    ok(!(d.related || []).includes(id), id + ": does not link to itself");

    /* The whole point is differentiation — deep copy must not just restate the
       boilerplate that is already on all 261 pages. */
    const blob = (d.intro + " " + d.what.join(" ") + " " + d.tip).toLowerCase();
    ok(!/5 free (uses|runs) a day/.test(blob), id + ": does not repeat the free-tier boilerplate");
    ok(!/no watermark/.test(blob), id + ": does not repeat the watermark boilerplate");
  });

  /* Uniqueness, measured on the built output — the actual thing Google sees. */
  const glob = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const strip = (f) => {
    let h = fs.readFileSync(f, "utf8");
    h = h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, "");
    const m = h.match(/<main[\s\S]*?<\/main>/i);
    return (m ? m[0] : h).replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ")
      .split(/\s+/).filter(w => w.length > 1);
  };
  const built = [];
  ["images", "pdf", "video", "text"].forEach(cat => {
    glob(path.join(root, "tools", cat)).forEach(slug => {
      const f = path.join(root, "tools", cat, slug, "index.html");
      if (fs.existsSync(f)) built.push({ id: slug, f });
    });
  });

  if (built.length > 50) {
    const freq = new Map();
    built.forEach(b => new Set(strip(b.f)).forEach(w => freq.set(w, (freq.get(w) || 0) + 1)));
    const boiler = new Set([...freq].filter(([, c]) => c > built.length * 0.9).map(([w]) => w));

    ids.forEach(id => {
      const b = built.find(x => x.id === id);
      if (!b) return;
      const unique = strip(b.f).filter(w => !boiler.has(w)).length;
      ok(unique > 200, id + ": has " + unique + " non-boilerplate words (was 95 sitewide; must stay >200)");
    });

    /* Two rewritten tools from different categories must not read alike. */
    const ci = built.find(x => x.id === "compress-image"), mp = built.find(x => x.id === "merge-pdf");
    if (ci && mp) {
      const a = new Set(strip(ci.f)), c = new Set(strip(mp.f));
      const overlap = [...a].filter(w => c.has(w)).length / new Set([...a, ...c]).size;
      ok(overlap < 0.45, "compress-image vs merge-pdf overlap is " +
         Math.round(overlap * 100) + "% (was 65%; must stay under 45%)");
    }
  }
}


/* ---------------------------------------------------------------------------
 * DERIVED SPEC TABLES
 *
 * Tools with hand-written copy get that. Tools that merely declare their own
 * options get a spec table derived from the LIVE MODULE at build time, so the
 * numbers cannot drift from the tool. Tools that declare nothing readable get
 * neither — deliberately. A padded page is the original problem in a new
 * costume, and it is also what earns an AdSense "low value content" flag.
 * ------------------------------------------------------------------------- */
{
  const TF = require("../data/tool-facts.js");

  /* Real specs produce real tables. */
  const imgSpec = require("../assets/js/tools-image.js")["compress-image"];
  const f = TF.factsFor(imgSpec);
  ok(f && f.rows.length >= 3, "a tool with options yields a table");
  ok(f.rows.every(r => r.label && r.value), "every derived row is a filled pair");
  ok(f.rows.some(r => /30.*95/.test(r.value)), "the quality range comes from the source, not a guess");

  /* Nothing readable must yield nothing, not a stub. */
  eq(TF.factsFor(null), null, "no spec, no table");
  eq(TF.factsFor({}), null, "empty spec, no table");
  eq(TF.factsFor({ options: [] }), null, "no options, no table");
  eq(TF.factsFor({ accept: "image/*" }), null, "one row is not a table");
  eq(TF.factsFor({ options: [{ label: "A", def: 1 }, { label: "B", def: 2 }] }), null,
     "two rows is still not a table");

  /* Value formatting. */
  eq(TF.describeOption({ label: "Quality", type: "range", min: 30, max: 95, def: 75, suffix: "%" }).value,
     "30–95%, default 75%", "range renders bounds, suffix and default");
  eq(TF.describeOption({ label: "Format", type: "select", def: "a",
       options: [{ v: "a", label: "PNG" }, { v: "b", label: "JPEG" }] }).value,
     "PNG · JPEG, default PNG",
     "a select renders its labels and resolves the default to a label, not a key");
  eq(TF.describeOption({}), null, "an unlabelled option is skipped");
  eq(TF.describeOption(null), null, "a null option does not throw");

  eq(TF.describeAccept("application/pdf"), "PDF", "known mime becomes a word");
  eq(TF.describeAccept(".svg,image/svg+xml"), "SVG, SVG+XML", "extensions are humanised");
  eq(TF.describeAccept(null), null, "no accept, no row");
  eq(TF.bytesLabel(200 * 1024 * 1024), "200 MB", "byte caps render as MB");
  eq(TF.bytesLabel(0), null, "no cap, no row");

  /* The scraper that was tried and removed must stay removed. */
  ok(!TF.scanSource, "the source scraper is gone, not merely unused");
  const factsSrc = require("fs").readFileSync(
    require("path").join(__dirname, "../data/tool-facts.js"), "utf8");
  ok(/what was tried and rejected/i.test(factsSrc),
     "the rejected approach is documented so it is not re-attempted");

  /* Built output: the tiers must be distinguishable and none may regress. */
  const fs = require("fs"), path = require("path");
  const root = path.join(__dirname, "..");
  const read = (p) => fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
  const handWritten = read(path.join(root, "tools/images/compress-image/index.html"));

  /* Pick a derived-table example DYNAMICALLY. Naming one tool here breaks the
     moment that tool gets hand-written content — which is the whole direction
     of travel, so the test has to follow the queue rather than pin to it. */
  const TC_IDS = new Set(Object.keys(require("../data/tool-content.js")));
  let derived = "";
  for (const cat of ["finance", "tax", "realestate", "images", "pdf", "video"]) {
    const dir = path.join(root, "tools", cat);
    if (!fs.existsSync(dir)) continue;
    for (const slug of fs.readdirSync(dir)) {
      if (TC_IDS.has(slug)) continue;                 // hand-written, not derived
      const html = read(path.join(dir, slug, "index.html"));
      if (/Settings and limits/.test(html)) { derived = html; break; }
    }
    if (derived) break;
  }

  if (handWritten) {
    ok(/spec-table/.test(handWritten), "hand-written pages carry their own table");
    ok(!/Settings and limits/.test(handWritten),
       "hand-written copy is not doubled up with the derived table");
  }
  if (derived) {
    ok(/Settings and limits/.test(derived), "a declaring tool gets a derived table");
    ok(/<td>/.test(derived), "the derived table carries values, not just labels");
    ok(/<th scope="row">/.test(derived), "derived rows are proper row headers for screen readers");
  }
}

console.log(`seo + titles: ${pass} total assertions passed`);

/* ---------------------------------------------------------------------------
 * AD UNITS MUST ACTUALLY EXIST
 *
 * The site shipped the AdSense loader on every page with ZERO <ins> slots
 * behind it. Unless Auto Ads happened to be toggled on in the dashboard, the
 * site earned nothing no matter how much traffic arrived — an entire monetized
 * platform with no ad inventory on it.
 *
 * The fix must not swing to the opposite failure of emitting <ins> tags with
 * placeholder slot ids, which serve nothing and risk a policy strike. So: units
 * render if and only if a real slot id is configured.
 * ------------------------------------------------------------------------- */
{
  const fs2 = require("fs"), path2 = require("path");
  const buildSrc = fs2.readFileSync(path2.join(__dirname, "../build.js"), "utf8");
  const cfg2 = require("../data/site.config.js");

  ok(/function adUnit\(/.test(buildSrc), "there is an ad-unit helper");
  ok(/if \(!ADS\.enabled\) return "";/.test(buildSrc), "it respects the enabled flag");
  ok(/if \(!slot\) return "";/.test(buildSrc),
     "an unconfigured slot renders NOTHING — never a placeholder <ins>");

  ok(cfg2.ads && typeof cfg2.ads.slots === "object", "ad slots are configurable");
  ["inContent", "footer"].forEach((k) =>
    ok(k in cfg2.ads.slots, "slot '" + k + "' is declared so it can be filled in"));

  /* PLACEMENT. Both units belong below the article body. Nothing may sit next
     to the tool's own controls: on a file tool, someone who has just clicked
     Download is primed to click the next control-shaped thing, and accidental
     clicks are the fastest route to an invalid-traffic strike. */
  const toolTpl = buildSrc.slice(buildSrc.indexOf("<!-- 1. workspace -->"),
                                buildSrc.indexOf("<!-- 8. trust -->"));
  const posWorkspace = toolTpl.indexOf("<!-- 1. workspace -->");
  const posFirstAd = toolTpl.indexOf('adUnit("inContent")');
  const posFaq = toolTpl.indexOf("<!-- 5. FAQ -->");
  ok(posFirstAd > posWorkspace, "no ad above the tool");
  ok(posFirstAd < posFaq, "the in-content unit sits between the article body and the FAQ");
  ok(toolTpl.indexOf('adUnit("footer")') > posFaq, "the footer unit sits after the FAQ");

  /* Nothing sticky or anchored — those float over content and over buttons. */
  ok(!/data-ad-format="(anchor|sticky)"/.test(buildSrc), "no anchor or sticky formats");

  /* CLS. An ad that arrives late and shoves the article down is a Core Web
     Vitals hit, and Core Web Vitals is a ranking signal — an unreserved unit
     would cost organic traffic to buy ad impressions. */
  const cssSrc2 = fs2.readFileSync(path2.join(__dirname, "../assets/css/base.css"), "utf8");
  ok(/\.ad-slot\s*\{[^}]*min-height/.test(cssSrc2), "ad slots reserve their height");
  ok(/\.ad-slot \.ad-label/.test(cssSrc2), "ads are labelled as advertisements");
  ok(/@media \(max-width: 640px\)[\s\S]{0,400}\.ad-slot \{[^}]*min-height/.test(cssSrc2),
     "phones get a smaller reservation, so the unit cannot push content off a small screen");

  /* Ads stay off the pages where they are a policy problem. */
  ["auth", "account", "admin"].forEach((seg) => {
    const m = new RegExp('url = "[^"]*' + seg + '[^"]*"[\\s\\S]{0,300}ads: true');
    ok(!m.test(buildSrc), "no ads declared on " + seg + " pages");
  });

  /* END TO END, by running the real helper rather than describing it.
   *
   * adUnit closes over module-level ADS/PUB and build.js runs the whole build on
   * require, so the function is lifted out of the source and evaluated against a
   * controlled config. That still exercises the SHIPPED body — if the emitted
   * markup or the empty-slot guard changes, this fails. */
  const fnSrc = buildSrc.slice(buildSrc.indexOf("function adUnit("),
                               buildSrc.indexOf("\n}", buildSrc.indexOf("function adUnit(")) + 2);
  function adUnitWith(slots, enabled) {
    const ADS = { enabled: enabled !== false, client: "ca-pub-TEST", slots: slots };
    const PUB = ADS.client;
    return new Function("ADS", "PUB", fnSrc + "; return adUnit;")(ADS, PUB);
  }

  const configured = adUnitWith({ inContent: "1234567890" })("inContent");
  ok(/class="adsbygoogle"/.test(configured), "a configured slot emits a real ad unit");
  ok(configured.includes('data-ad-slot="1234567890"'), "carrying the configured slot id");
  ok(configured.includes('data-ad-client="ca-pub-TEST"'), "and the publisher id");
  ok(/adsbygoogle \|\| \[\]\)\.push/.test(configured), "with the push call that activates it");

  eq(adUnitWith({ inContent: "" })("inContent"), "",
     "an empty slot id emits nothing — no placeholder <ins>, no blank reserved box");
  eq(adUnitWith({})("inContent"), "", "a missing slot emits nothing");
  eq(adUnitWith({ inContent: "123" }, false)("inContent"), "",
     "ads disabled emits nothing even with a slot configured");

  /* The shipped config has empty slots, so a build right now must be ad-free.
     This is what stops a half-finished setup shipping broken units. */
  ["inContent", "footer"].forEach((k) => {
    if (!cfg2.ads.slots[k]) {
      eq(adUnitWith(cfg2.ads.slots)(k), "",
         "slot '" + k + "' is unset in site.config.js, so nothing renders for it yet");
    }
  });
}

console.log(`seo + ad inventory: ${pass} total assertions passed`);
