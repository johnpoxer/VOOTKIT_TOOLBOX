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
  const sm = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

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

console.log(`seo + titles: ${pass} total assertions passed`);
