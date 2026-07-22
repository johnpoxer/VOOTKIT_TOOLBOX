/* calc.test.js — financial maths verified against independently computed values.
 * Run: npm test */
"use strict";
const assert = require("assert");
global.window = global;                 // calc.js targets the browser
require("../assets/js/calc.js");
const M = global.VKCalc.M;

let pass = 0;
const near = (a, b, tol, msg) => {
  assert.ok(Math.abs(a - b) <= tol, `${msg}\n  got ${a}\n  want ~${b} (±${tol})`);
  pass++;
};
const eq = (a, b, msg) => { assert.strictEqual(a, b, msg); pass++; };

/* ---- payment() ----
   Standard annuity formula. Reference: $200,000 at 6% a year over 30 years.
   r = .005, n = 360  →  well-known result $1,199.10 */
near(M.payment(200000, 0.06 / 12, 360), 1199.10, 0.02, "mortgage payment 200k/6%/30y");

/* $10,000 at 5% over 5 years → $188.71 */
near(M.payment(10000, 0.05 / 12, 60), 188.71, 0.02, "loan payment 10k/5%/5y");

/* zero-interest loan is just principal / periods */
near(M.payment(12000, 0, 24), 500, 1e-9, "zero-rate payment");

/* ---- amortise() ---- */
const a = M.amortise(200000, 0.06 / 12, 360);
near(a.payment, 1199.10, 0.02, "amortise payment matches");
eq(a.rows.length, 360, "360 rows for a 30-year loan");
near(a.rows[a.rows.length - 1].balance, 0, 1e-6, "final balance is exactly zero");
/* Total interest on that loan is ≈ $231,676 */
near(a.totalInterest, 231676, 60, "total interest 200k/6%/30y");
near(a.totalPaid, 200000 + a.totalInterest, 0.01, "total paid = principal + interest");

/* first month: interest = balance * rate */
near(a.rows[0].interest, 200000 * 0.06 / 12, 1e-9, "first-month interest");
near(a.rows[0].principal, a.payment - 200000 * 0.06 / 12, 0.02, "first-month principal");

/* every row's principal+interest equals the payment (within rounding) */
let rowOk = true;
a.rows.forEach(r => { if (Math.abs((r.principal + r.interest) - r.payment) > 0.01) rowOk = false; });
assert.ok(rowOk, "each row: principal + interest = payment"); pass++;

/* balance decreases monotonically */
let mono = true;
for (let i = 1; i < a.rows.length; i++) if (a.rows[i].balance > a.rows[i - 1].balance) mono = false;
assert.ok(mono, "balance never increases"); pass++;

/* ---- payoffPeriods() ----
   $5,000 at 18% APR paying $200/mo → 32 months (standard result) */
eq(M.payoffPeriods(5000, 0.18 / 12, 200), 32, "card payoff 5000/18%/200");

/* payment below monthly interest never clears */
eq(M.payoffPeriods(5000, 0.24 / 12, 50), Infinity, "payment under interest → never");

/* zero interest: straight division */
eq(M.payoffPeriods(1000, 0, 100), 10, "zero-rate payoff");

/* ---- futureValue() ----
   $1,000 at 6%/yr monthly for 10y with no contributions → 1000*(1.005^120)=1819.40 */
near(M.futureValue(1000, 0, 0.06 / 12, 120), 1819.40, 0.05, "FV lump sum");
/* $0 start, $100/mo, 6%/yr, 10y → $16,387.93 */
near(M.futureValue(0, 100, 0.06 / 12, 120), 16387.93, 0.05, "FV annuity");
/* zero rate */
near(M.futureValue(500, 50, 0, 12), 500 + 600, 1e-9, "FV zero rate");

/* ---- tool specs sanity ---- */
const TOOLS = require("../assets/js/tools-money.js");
const ids = Object.keys(TOOLS);
eq(ids.length, 8, "8 money tools defined");

const VK = require("../data/catalog.js");
ids.forEach(id => {
  const t = VK.find(id);
  assert.ok(t, `tool ${id} exists in catalog`); pass++;
  const spec = TOOLS[id];
  assert.ok(Array.isArray(spec.fields) && spec.fields.length, `${id} has fields`); pass++;
  // every tool computes without throwing on its own defaults
  const v = {};
  spec.fields.forEach(f => { v[f.k] = f.type === "select" ? f.def : f.def; });
  const out = spec.compute(v, M);
  assert.ok(out && out.headline && out.headline.value, `${id} produces a headline`); pass++;
  assert.ok(!/NaN|undefined|Infinity/.test(String(out.headline.value)), `${id} headline is a real number: ${out.headline.value}`); pass++;
  (out.stats || []).forEach(s => {
    assert.ok(!/NaN|undefined/.test(String(s.value)), `${id} stat "${s.label}" is clean: ${s.value}`); pass++;
  });
});

/* edge cases that must not explode */
const edge = [
  ["mortgage-calculator", { price: 100000, down: 100000, rate: 0, years: 1, tax: 0, ins: 0, cur: "USD" }],
  ["credit-card-payoff", { balance: 1000, apr: 0, pay: 100, extra: 0, cur: "USD" }],
  ["home-affordability", { income: 10000, debts: 5000, down: 0, rate: 6, years: 30, dti: 36, cur: "USD" }],
  ["cap-rate", { value: 1, rent: 0, vacancy: 100, expenses: 0, cur: "USD" }]
];
edge.forEach(([id, v]) => {
  const out = TOOLS[id].compute(v, M);
  assert.ok(out && out.headline, `${id} survives edge case`); pass++;
  assert.ok(!/NaN/.test(JSON.stringify(out)), `${id} edge case produces no NaN`); pass++;
});

console.log(`calc: ${pass} assertions passed`);
