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
