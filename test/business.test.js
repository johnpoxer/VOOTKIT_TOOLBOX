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

/* ---------------------------------------------------------------------------
 * DEBT-TO-INCOME
 *
 * A borrower who miscalculates this talks themselves out of an application
 * they would have passed, or walks into one they will fail. Both are worse
 * than most tool bugs, so the arithmetic is pinned here.
 * ------------------------------------------------------------------------- */
{
  /* calc.js FIRST: tools-money.js captures VKCalc.fmt at module load, so
     requiring it alone leaves every money formatter null. */
  require("../assets/js/calc.js");
  const MONEY = require("../assets/js/tools-money.js");
  const dti = MONEY["debt-to-income"];
  ok(dti, "the debt-to-income tool is registered");

  const run = (over) => {
    const v = { cur: "USD" };
    dti.fields.forEach((f) => { if (f.k !== "cur") v[f.k] = f.def; });
    return dti.compute(Object.assign(v, over));
  };
  const pct = (r) => parseFloat(r.headline.value);
  const zero = { housing: 0, auto: 0, student: 0, cards: 0, other: 0 };

  /* The textbook case: $1,500 of debt on $5,000 gross. */
  eq(pct(run(Object.assign({ income: 5000, housing: 1500 }, zero, { housing: 1500 }))), 30,
     "1500 of debt on 5000 income is 30%");

  /* Every debt field must reach the ratio. A field that is collected and then
     silently ignored produces a confidently wrong answer, which is the worst
     kind on a page like this. */
  ["housing", "auto", "student", "cards", "other"].forEach((k) => {
    const r = run(Object.assign({ income: 5000 }, zero, { [k]: 500 }));
    eq(pct(r), 10, "the " + k + " field counts toward the ratio");
  });

  /* Front-end is housing ALONE — the test that catches the two ratios being
     wired to the same sum. */
  const split = run(Object.assign({ income: 5000 }, zero, { housing: 1400, auto: 600 }));
  eq(pct(split), 40, "back-end counts every debt");
  eq(parseFloat(split.stats[0].value), 28, "front-end counts housing only");

  /* Band boundaries, inclusive at the edges. */
  [[1800, /Comfortable/], [2150, /Workable/], [2500, /Tight/], [3000, /Very high/]].forEach(([h, re]) => {
    const r = run(Object.assign({ income: 5000 }, zero, { housing: h }));
    ok(re.test(r.headline.sub), h + "/5000 = " + r.headline.value + " reads as " + re.source);
  });

  /* DIVIDE BY ZERO. Someone lands on the page and types their debts before
     their income; the tool must not print NaN% or Infinity at them. */
  const z = run(Object.assign({ income: 0 }, zero, { housing: 1200 }));
  ok(!/NaN|Infinity/.test(JSON.stringify(z)), "zero income produces no NaN or Infinity anywhere");
  ok(/income/i.test(z.headline.sub), "and asks for the income instead");

  /* "Left after debt" must never go negative — a lender does not hand you a
     negative surplus, and the number would read as a bug. */
  const under = run(Object.assign({ income: 1000 }, zero, { housing: 2000 }));
  ok(!/-/.test(under.stats[2].value), "left-after-debt never renders negative");
  ok(/Over the 36%/.test(under.stats[3].label), "and the headroom stat flips to say by how much");

  /* The note must not present US thresholds as universal — this page is served
     in ten languages. */
  ok(/US|United States/.test(run({}).note), "the note says whose lending guidance the 36/43 marks are");
  ok(/gross/i.test(run({}).note), "and repeats that income means gross");
}
console.log(`business + DTI: ${pass} total assertions passed`);
