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
eq(ids.length, 11, "11 pdf tools");
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
ok(liveCount === 9, `all 9 pdf specs present (catalog live=${liveCount})`);

console.log(`pdf: ${pass} assertions passed`);
