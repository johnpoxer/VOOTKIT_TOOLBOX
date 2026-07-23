"use strict";
const assert = require("assert");
global.window = global;
const B = require("../assets/js/tools-business.js");
const PE = require("../assets/js/tools-pdfedit.js");
const VK = require("../data/catalog.js");
let pass = 0; const ok=(c,m)=>{assert.ok(c,m);pass++;}; const eq=(a,b,m)=>{assert.strictEqual(a,b,m);pass++;};
/* invoice totals: 10*80 + 4*120 = 1280; -80 disc = 1200; +10% tax = 1320 */
let t = B.computeTotals([{qty:10,price:80},{qty:4,price:120}], 10, 80);
eq(t.subtotal, 1280, "subtotal 1280");
eq(t.total, 1320, "total 1320 (after 80 discount + 10% tax)");
t = B.computeTotals([{qty:2,price:50}], 0, 0);
eq(t.total, 100, "no tax/discount -> 100");
t = B.computeTotals([], 20, 0);
eq(t.total, 0, "empty -> 0");
/* diff reused in compare-pdf */
let d = PE.diffLines("a\nb", "a\nc");
eq(d.filter(x=>x.t==='-').length, 1, "one removed line");
eq(d.filter(x=>x.t==='+').length, 1, "one added line");
["invoice-generator","quote-generator","compress-pdf","pdf-redact","compare-pdf"].forEach(id=>{const x=VK.find(id);ok(x&&x.status==="live",id+" live");});
console.log(`business: ${pass} assertions passed`);
