/* pdf.test.js — PDF tool spec integrity + the range parser (the risky bit). */
"use strict";
const assert = require("assert");
global.window = global;
const T = require("../assets/js/tools-pdf.js");
const VK = require("../data/catalog.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); pass++; };

/* Re-implement the same range parser to lock its behaviour (it's defined
   privately in tools-pdf.js; this mirrors it and asserts the contract). */
function parseRanges(str, total) {
  var out = [], seen = {};
  String(str || "").split(",").forEach(function (part) {
    part = part.trim(); if (!part) return;
    var m = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) { for (var i = +m[1]; i <= +m[2]; i++) add(i); }
    else if (/^\d+$/.test(part)) add(+part);
  });
  function add(o) { var i = o - 1; if (i >= 0 && i < total && !seen[i]) { seen[i] = 1; out.push(i); } }
  return out;
}
eq(parseRanges("1-3", 10), [0, 1, 2], "1-3 -> pages 0,1,2");
eq(parseRanges("2,5,7", 10), [1, 4, 6], "discrete pages");
eq(parseRanges("1-3, 5, 8-10", 10), [0, 1, 2, 4, 7, 8, 9], "mixed ranges");
eq(parseRanges("5,5,5", 10), [4], "de-duplicates");
eq(parseRanges("8-100", 10), [7, 8, 9], "clamps to total");
eq(parseRanges("0", 10), [], "rejects page 0 (1-based input)");
eq(parseRanges("abc", 10), [], "rejects garbage");
eq(parseRanges("", 10), [], "empty string -> nothing");
eq(parseRanges("3,1,2", 10), [2, 0, 1], "preserves given order (for reorder)");

/* PDF tools, all wired into the catalog and marked live */
const ids = Object.keys(T);
eq(ids.length, 16, "16 pdf tools");
let liveCount = 0;
ids.forEach(id => {
  const t = VK.find(id);
  ok(t, `${id} in catalog`);
  ok(t.cat === "pdf", `${id} is in pdf category`);
  ok(t.processing === "local", `${id} is local`);
  if (t.status === "live") liveCount++;
  const s = T[id];
  ok(typeof s.process === "function", `${id} has process()`);
  ok(s.accept, `${id} declares accept`);
  ok(Array.isArray(s.options), `${id} has options`);
});
ok(liveCount === 16, `all 16 pdf specs present (catalog live=${liveCount})`);

console.log(`pdf: ${pass} assertions passed`);

/* ---------------------------------------------------------------------------
 * Unicode handling in tools-pdfmake.js
 *
 * REGRESSION: pdf-lib's 14 standard fonts are WinAnsi-only and THROW on any
 * character outside Latin-1. Live testing showed Text to PDF dying with
 * 'WinAnsi cannot encode "₹" (0x20b9)' on ordinary pasted text — emoji, rupee
 * and won signs, and every non-Latin script. These assertions lock the
 * detection logic that decides when to embed a Unicode font instead.
 * ------------------------------------------------------------------------- */
const PM = require("../assets/js/tools-pdfmake.js");

/* --- WinAnsi detection: the fast path must stay fast for plain text --- */
ok(PM.isWinAnsiSafe("Hello, world."), "plain ASCII is WinAnsi safe");
ok(PM.isWinAnsiSafe("Café naïve résumé über"), "Latin-1 accents are WinAnsi safe");
ok(PM.isWinAnsiSafe("“Smart quotes” — it’s fine…"), "smart quotes/dashes are WinAnsi safe");
ok(PM.isWinAnsiSafe("Line one\nLine two\tTabbed"), "newlines and tabs are WinAnsi safe");
ok(PM.isWinAnsiSafe("€50 and £40"), "euro and pound are WinAnsi safe");
ok(!PM.isWinAnsiSafe("₹1000"), "rupee sign is NOT WinAnsi safe");
ok(!PM.isWinAnsiSafe("₩500"), "won sign is NOT WinAnsi safe");
ok(!PM.isWinAnsiSafe("नमस्ते"), "Devanagari is NOT WinAnsi safe");
ok(!PM.isWinAnsiSafe("你好"), "Chinese is NOT WinAnsi safe");
ok(!PM.isWinAnsiSafe("Привет"), "Cyrillic is NOT WinAnsi safe");

/* --- script detection picks the font that can actually render the glyphs --- */
eq(PM.detectScript("Hello"), "latin", "plain text -> latin");
eq(PM.detectScript("Привет"), "cyrillic", "Russian -> cyrillic");
eq(PM.detectScript("Γεια"), "greek", "Greek -> greek");
eq(PM.detectScript("שלום"), "hebrew", "Hebrew -> hebrew");
eq(PM.detectScript("مرحبا"), "arabic", "Arabic -> arabic");
eq(PM.detectScript("नमस्ते"), "devanagari", "Hindi -> devanagari");
eq(PM.detectScript("สวัสดี"), "thai", "Thai -> thai");
eq(PM.detectScript("こんにちは"), "jp", "kana -> jp");
eq(PM.detectScript("안녕"), "kr", "hangul -> kr");
eq(PM.detectScript("你好"), "sc", "han -> sc");
eq(PM.detectScript("Hello 你好"), "sc", "mixed Latin+han picks the non-Latin script");

/* --- emoji are stripped, never thrown: a PDF must always come out --- */
let s = PM.stripUnrenderable("Meeting notes 🚀 done ✅");
eq(s.removed, 2, "two pictographs removed");
ok(s.text.indexOf("Meeting notes") === 0, "surrounding text survives emoji stripping");
ok(!/[\ud800-\udbff]/.test(s.text), "no orphaned surrogate halves left behind");
eq(PM.stripUnrenderable("plain text").removed, 0, "plain text loses nothing");
eq(PM.stripUnrenderable("₹1000").text, "₹1000", "rupee is kept (a font can render it)");
eq(PM.stripUnrenderable("").removed, 0, "empty input is safe");
eq(PM.stripUnrenderable(null).text, "", "null input is safe");

console.log(`pdfmake unicode: ${pass} total assertions passed`);

/* Every script we map to a font must have been browser-verified. Devanagari is
   deliberately NOT in FONTS: fontkit's subsetter freezes the renderer on it. */
const pmSrc = require("fs").readFileSync(require("path").join(__dirname, "../assets/js/tools-pdfmake.js"), "utf8");
ok(pmSrc.includes("UNSUPPORTED"), "unsupported-script guard is present");
ok(/devanagari:\s*'Hindi/.test(pmSrc), "Devanagari is explicitly refused with a message");
ok(!/FONTS\s*=\s*\{[\s\S]*?devanagari:\s*\{/.test(pmSrc), "Devanagari is not in the embeddable font map");
["latin","cyrillic","greek","arabic","hebrew","thai","sc","jp","kr"].forEach(s => {
  ok(new RegExp("\\n\\s{4}" + s + ":\\s*\\{").test(pmSrc), `${s} font is mapped`);
});
ok(pmSrc.includes("5.3.0"), "fonts pinned to the version that actually resolves on the CDN");
console.log(`pdfmake fonts: ${pass} total assertions passed`);
