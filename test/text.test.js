/* text.test.js — text-tool logic verified against hand-computed values. */
"use strict";
const assert = require("assert");
global.window = global;
const X = require("../assets/js/tools-text.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.strictEqual(a, b, m); pass++; };

/* countText */
let c = X.countText("Hello world. This is a test.");
eq(c.words, 6, "6 words");
eq(c.sentences, 2, "2 sentences");
c = X.countText("");
eq(c.words, 0, "empty -> 0 words");
eq(c.sentences, 0, "empty -> 0 sentences");
c = X.countText("one two three four");
ok(Math.abs(c.readingMin - 4 / 200) < 1e-9, "reading time = words/200");

/* toCase */
eq(X.toCase("hello world", "upper"), "HELLO WORLD", "upper");
eq(X.toCase("HELLO", "lower"), "hello", "lower");
eq(X.toCase("hello world", "title"), "Hello World", "title");
eq(X.toCase("hello world foo", "camel"), "helloWorldFoo", "camel");
eq(X.toCase("Hello World Foo", "kebab"), "hello-world-foo", "kebab");
eq(X.toCase("Hello World", "snake"), "hello_world", "snake");
eq(X.toCase("hello. world. bye.", "sentence"), "Hello. World. Bye.", "sentence case");

/* slugify */
eq(X.slugify("Hello, World! 2026"), "hello-world-2026", "basic slug");
eq(X.slugify("  Trim  --  Me  "), "trim-me", "collapses & trims");
eq(X.slugify("Café Déjà Vu"), "cafe-deja-vu", "strips accents");
eq(X.slugify("!!!"), "", "punctuation only -> empty");

/* flesch: known short sentence */
let f = X.flesch("The cat sat on the mat.");
ok(f.words === 6, "flesch counts words");
ok(f.ease > 80, "simple sentence reads easy, got " + f.ease);
ok(typeof X.easeLabel(95) === "string" && /easy/i.test(X.easeLabel(95)), "ease label");

/* diffLines */
let d = X.diffLines("a\nb\nc", "a\nx\nc");
eq(d.filter(r => r.t === "-").length, 1, "one line removed");
eq(d.filter(r => r.t === "+").length, 1, "one line added");
eq(d.filter(r => r.t === " ").length, 2, "two lines unchanged");
d = X.diffLines("same", "same");
eq(d.length, 1, "identical -> one row");
eq(d[0].t, " ", "identical row unchanged");

/* keywordDensity */
let k = X.keywordDensity("the the the cat", 5);
eq(k.total, 4, "4 tokens");
eq(k.top[0].word, "the", "most frequent is 'the'");
eq(k.top[0].count, 3, "'the' x3");
ok(Math.abs(k.top[0].pct - 75) < 1e-9, "'the' = 75%");

/* lorem */
ok(X.lorem(2, "paragraphs").split(/\n\n/).length === 2, "2 paragraphs");
ok(/\w/.test(X.lorem(5, "words")), "words mode returns text");
ok(X.lorem(1, "paragraphs").length > 20, "paragraph is substantial");

/* markdown → html (safe: escapes, then formats) */
let h = X.mdToHtml("# Title\n\nSome **bold** and `code`.");
ok(/<h1>Title<\/h1>/.test(h), "h1");
ok(/<strong>bold<\/strong>/.test(h), "bold");
ok(/<code>code<\/code>/.test(h), "code");
h = X.mdToHtml("<script>alert(1)</script>");
ok(h.indexOf("<script>") === -1, "escapes raw HTML (no XSS)");

console.log(`text: ${pass} assertions passed`);
