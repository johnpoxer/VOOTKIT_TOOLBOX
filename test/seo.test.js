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

  /* THIS CONTRACT WAS INVERTED ON 8 AUG 2026, DELIBERATELY.
   *
   * It used to assert that localised pages stayed indexable and kept their
   * hreflang — the sitemap change was only meant to deprioritise them. Then
   * AdSense rejected the site for "Low value content", and measuring the built
   * output showed why: the localised pages are the generic template with a tool
   * name swapped in, at 68-72% median pair overlap within each language against
   * 21% on the English side. 1,192 of 1,478 pages, all indexable, all linked by
   * hreflang from the English originals.
   *
   * Deprioritising was not enough. They are now noindex,follow and the English
   * pages no longer advertise them. See LOCALISED_INDEXABLE in build.js — this
   * whole block flips back with that one boolean, on the day those pages carry
   * content of their own. */
  const sample = path.join(root, "es/tools/developer/json-formatter/index.html");
  if (fs.existsSync(sample)) {
    const html = fs.readFileSync(sample, "utf8");
    ok(/<meta name="robots" content="noindex,follow">/.test(html),
       "localised pages are noindexed while they carry only the generic template");
    ok(/follow/.test(html) && !/nofollow/.test(html),
       "and follow, so they pass a visitor through to the English original rather than dead-ending");
    ok(!/hreflang=/.test(html), "they no longer claim to be alternates of anything");
    ok(/rel="canonical" href="https:\/\/www\.vootkit\.com\/es\//.test(html),
       "they still self-canonicalise — noindex plus a foreign canonical is a contradictory signal");
  }

  /* The English pages must NOT have been caught by the same change. If this
     ever fails, the site has just deindexed itself. */
  const enSample = path.join(root, "tools/developer/json-formatter/index.html");
  if (fs.existsSync(enSample)) {
    const en = fs.readFileSync(enSample, "utf8");
    ok(!/noindex/i.test(en), "English tool pages remain indexable");
    ok(!/hreflang=/.test(en), "and no longer advertise the templated translations");
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
  /* The push USED to be inline here. It moved to assets/js/ads.js so units are
     filled on approach instead of at load — an inline push spends main-thread
     time on an off-screen ad while the visitor waits for the tool. So the
     contract is now the opposite: the markup must NOT self-initialise. */
  ok(!/adsbygoogle \|\| \[\]\)\.push/.test(configured),
     "the unit does not self-initialise — ads.js fills it near the viewport");
  ok(/data-ad-format="auto"/.test(configured), "and it is a responsive unit");

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

/* ---------------------------------------------------------------------------
 * THE AD LAYER IS NETWORK-AGNOSTIC
 *
 * The point of the SEO work is to reach a network paying 8-12x AdSense on the
 * same traffic. Checked 3 Aug 2026, none of them are reachable yet: Ezoic went
 * to 250,000 monthly users for new publishers on 19 Feb 2026, Raptive wants
 * 25,000 pageviews with half from tier-one markets, Mediavine's lowest tier is
 * 10,000 sessions. Vootkit is around 3,000 monthly visitors.
 *
 * So the switch is deliberately a config value rather than a template rewrite,
 * and these assertions keep it that way.
 * ------------------------------------------------------------------------- */
{
  const fs3 = require("fs"), path3 = require("path");
  const src3 = fs3.readFileSync(path3.join(__dirname, "../build.js"), "utf8");
  const cfg3 = require("../data/site.config.js");

  ok("network" in cfg3.ads, "the network is a config value");
  ok(["adsense", "ezoic", "none"].indexOf(cfg3.ads.network) !== -1,
     "and is one of the supported values, got " + cfg3.ads.network);

  /* Lift the helpers and run them against controlled configs. adLoader calls
     ezoicHeader, so that dependency is lifted alongside it — otherwise this
     evaluates a function whose callee is out of scope. */
  function lift(name, ADS) {
    const grab = (fn) => {
      const s = src3.indexOf("function " + fn + "(");
      return s === -1 ? "" : src3.slice(s, src3.indexOf("\n}", s) + 2);
    };
    const body = grab(name);
    const deps = name === "ezoicHeader" ? "" : grab("ezoicHeader") + "\n";
    return new Function("ADS", "PUB", deps + body + "; return " + name + ";")(ADS, ADS.client || "");
  }
  const slots = { inContent: "111", footer: "222" };

  const gLoad = lift("adLoader", { enabled: true, network: "adsense", client: "ca-pub-X", slots });
  ok(/pagead2\.googlesyndication\.com/.test(gLoad()), "adsense loads Google's tag");
  ok(!/ezojs/.test(gLoad()), "and not Ezoic's");

  const eLoad = lift("adLoader", { enabled: true, network: "ezoic", client: "ca-pub-X", slots });
  const e = eLoad();
  ok(/ezojs\.com\/ezoic\/sa\.min\.js/.test(e), "ezoic loads its header script");
  ok(!/pagead2\.googlesyndication/.test(e),
     "and Google's tag is GONE — running both leaves unfilled slots and breaks Ezoic's setup");
  ok(e.indexOf("cmp.gatekeeperconsent.com") < e.indexOf("ezojs.com"),
     "consent scripts load before the header script, as their docs require");
  ok(/data-cfasync="false" src=/.test(e),
     "data-cfasync sits in front of src — this site is behind Cloudflare, so the order is load-bearing");

  const eUnit = lift("adUnit", { enabled: true, network: "ezoic", client: "", slots: {} });
  ok(/ezstandalone\.showAds/.test(eUnit("inContent")),
     "ezoic placements need no slot id — the dashboard sizes each spot");
  ok(/class="ad-slot"/.test(eUnit("inContent")),
     "and reuse the same reserved-height wrapper, so switching network cannot regress CLS");

  const nLoad = lift("adLoader", { enabled: true, network: "none", client: "", slots });
  ok(!/<script/.test(nLoad()), "network 'none' ships no ad script at all");
  eq(lift("adUnit", { enabled: true, network: "none", client: "", slots })("inContent"), "",
     "and no placements");
}

console.log(`seo + network switch: ${pass} total assertions passed`);

/* ---------------------------------------------------------------------------
 * EZOIC VERIFICATION MODE
 *
 * The Incubator application is not considered until Ezoic's dashboard detects
 * their header scripts on the site. But the application is PENDING — Ezoic fills
 * nothing yet — so following their "remove other networks' code" instruction now
 * would take AdSense down and leave the site earning zero for however long a
 * 20-places-a-month review takes, with rejection possible.
 *
 * Hence a verification mode distinct from a serving mode: header scripts present
 * for detection, no Ezoic placements, AdSense untouched.
 * ------------------------------------------------------------------------- */
{
  const fs4 = require("fs"), path4 = require("path");
  const src4 = fs4.readFileSync(path4.join(__dirname, "../build.js"), "utf8");

  function lift4(name, ADS) {
    const start = src4.indexOf("function " + name + "(");
    const body = src4.slice(start, src4.indexOf("\n}", start) + 2);
    const helper = src4.slice(src4.indexOf("function ezoicHeader("),
                              src4.indexOf("\n}", src4.indexOf("function ezoicHeader(")) + 2);
    const pre = name === "ezoicHeader" ? "" : helper + "\n";
    return new Function("ADS", "PUB", pre + body + "; return " + name + ";")(ADS, ADS.client || "");
  }
  const verify = lift4("adLoader", { enabled: true, network: "adsense", ezoicVerify: true, client: "ca-pub-X", slots: {} })();

  ok(/ezojs\.com\/ezoic\/sa\.min\.js/.test(verify), "verification mode ships Ezoic's header script");
  ok(/pagead2\.googlesyndication/.test(verify),
     "AND keeps AdSense serving — Ezoic is not approved, so dropping AdSense would earn nothing");
  ok(verify.indexOf("gatekeeperconsent") < verify.indexOf("ezojs.com"),
     "consent scripts still precede the header script");
  ok(verify.indexOf("ezojs.com") < verify.indexOf("pagead2"),
     "Ezoic's scripts sit as high in the head as possible, per their guidance");

  /* The thing that would break it: emitting placements while unapproved. */
  const vUnit = lift4("adUnit", { enabled: true, network: "adsense", ezoicVerify: true, client: "ca-pub-X", slots: { inContent: "111" } })("inContent");
  ok(!/ezstandalone\.showAds/.test(vUnit),
     "verification mode emits NO Ezoic placements — unapproved slots would render empty");
  ok(/class="adsbygoogle"/.test(vUnit), "placements stay on AdSense until the switch is thrown");

  /* And with the flag off, nothing Ezoic ships at all. */
  const off = lift4("adLoader", { enabled: true, network: "adsense", ezoicVerify: false, client: "ca-pub-X", slots: {} })();
  ok(!/ezojs|gatekeeperconsent/.test(off), "ezoicVerify:false ships no Ezoic scripts");

  /* Full switch still drops AdSense entirely. */
  const full = lift4("adLoader", { enabled: true, network: "ezoic", ezoicVerify: true, client: "ca-pub-X", slots: {} })();
  ok(!/pagead2\.googlesyndication/.test(full),
     "network:'ezoic' drops AdSense — running both once Ezoic serves breaks their setup");
}

console.log(`seo + ezoic verification: ${pass} total assertions passed`);

/* ---------------------------------------------------------------------------
 * THE NEWSLETTER IS ACTUALLY ON THE PAGES
 *
 * newsletter.js is well tested in isolation, which proves nothing about whether
 * a slot for it ever reaches the HTML. The whole feature is one deleted line in
 * build.js away from being dead code that passes its own unit tests — and the
 * failure is silent, because a missing form looks exactly like a tidy page.
 *
 * These assertions read the BUILT output, not the template.
 * ------------------------------------------------------------------------- */
{
  const fs3 = require("fs"), path3 = require("path");
  const R = path3.join(__dirname, "..");
  const read = (p) => { try { return fs3.readFileSync(path3.join(R, p), "utf8"); } catch (e) { return ""; } };
  const slots = (html) => (html.match(/data-newsletter="([a-z_]+)"/g) || [])
    .map((s) => s.replace(/.*="|"/g, "")).join(",");

  const tool = read("tools/video/compress-video/index.html");
  /* Build output is gitignored — Netlify regenerates it on deploy. On a clean
     checkout there is nothing to inspect, and failing here would report a
     missing build as a missing feature. Say which it is, out loud, the way the
     jsdom-dependent checks elsewhere in this suite already do. */
  if (!tool) {
    console.log("  (skipped newsletter placement checks — run `node build.js` first)");
  } else {
  eq(slots(tool), "footer", "a tool page carries exactly one slot, in the footer");
  ok(/assets\/js\/newsletter\.js/.test(tool), "and loads the script that fills it");

  /* Script order is a real dependency: convert.js reaches for VKNewsletter at
     the success moment, so newsletter.js must already have defined it. */
  ok(tool.indexOf("convert.js") < tool.indexOf("newsletter.js"),
     "newsletter.js loads after convert.js, which calls into it");

  const blogFiles = (() => {
    try { return fs3.readdirSync(path3.join(R, "blog")).filter((d) => d !== "index.html"); }
    catch (e) { return []; }
  })();
  ok(blogFiles.length > 0, "there are blog posts to check");
  blogFiles.forEach((d) => {
    const html = read("blog/" + d + "/index.html");
    if (!html) return;
    eq(slots(html), "blog",
       "blog post '" + d + "' has ONE slot and it is the in-body one, not the footer");
  });

  /* The unsubscribe page must not ask for the address it is removing. */
  const unsub = read("unsubscribe/index.html");
  ok(unsub.length > 0, "the unsubscribe page is built");
  eq(slots(unsub), "", "the unsubscribe page carries NO signup form");
  ok(/data-unsubscribe/.test(unsub), "it has the element newsletter.js reports into");
  ok(/noindex/.test(unsub), "and is noindex — it is reached from an email, not a search");
  }
}
console.log(`seo + newsletter placement: ${pass} total assertions passed`);
