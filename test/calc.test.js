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
const TOOLS = Object.assign({}, require("../assets/js/tools-money.js"), require("../assets/js/tools-money2.js"));
const ids = Object.keys(TOOLS);
eq(ids.length, 40, "40 money tools defined");

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

/* ---- Wave 1b reference values (independently computed) ---- */
const T2 = require("../assets/js/tools-money2.js");

/* VAT: £100 net at 20% → £120 gross, £20 tax */
let r = T2["vat-gst"].compute({ amount: 100, rate: 20, mode: "net", cur: "GBP" }, M);
assert.ok(/120/.test(r.headline.value), "VAT add: 100 +20% = 120, got " + r.headline.value); pass++;
/* Reverse: £120 gross at 20% → £100 net (the classic mistake is 120*0.8=96) */
r = T2["vat-gst"].compute({ amount: 120, rate: 20, mode: "gross", cur: "GBP" }, M);
assert.ok(/100/.test(r.headline.value), "VAT remove: 120 inc 20% = 100 net, got " + r.headline.value); pass++;

/* Margin vs markup: cost 40, price 100 → 60% margin, 150% markup */
r = T2["profit-margin"].compute({ cost: 40, price: 100, units: 1, cur: "USD" }, M);
eq(r.headline.value, "60.0%", "margin 40->100 is 60%");
assert.ok(r.stats[0].value === "150.0%", "markup 40->100 is 150%, got " + r.stats[0].value); pass++;

/* Break-even: 4000 fixed, 49 price, 18 variable → ceil(4000/31)=130 units */
r = T2["break-even"].compute({ fixed: 4000, price: 49, varCost: 18, cur: "USD" }, M);
assert.ok(/130/.test(r.headline.value), "break-even 130 units, got " + r.headline.value); pass++;

/* ---- E-commerce calculators (independently computed) ---- */
/* Stripe net: $100 at 2.9% + $0.30 → fee $3.20, net $96.80 */
r = T2["stripe-fee-calculator"].compute({ amount: 100, pct: 2.9, fixed: 0.30, mode: "net", cur: "USD" }, M);
assert.ok(/96\.80/.test(r.headline.value), "stripe net 96.80, got " + r.headline.value); pass++;
/* Stripe gross-up: to receive $100 → charge (100.30)/(0.971) = $103.30 */
r = T2["stripe-fee-calculator"].compute({ amount: 100, pct: 2.9, fixed: 0.30, mode: "gross", cur: "USD" }, M);
assert.ok(/103\.30/.test(r.headline.value), "stripe gross 103.30, got " + r.headline.value); pass++;
/* Amazon FBA: 29.99 price, 6 cost, 15% referral (4.4985), 5.5 FBA, 1 ship → profit 12.99 */
r = T2["amazon-fba-calculator"].compute({ price: 29.99, cost: 6, referral: 15, fba: 5.5, ship: 1, other: 0, cur: "USD" }, M);
assert.ok(/12\.99/.test(r.headline.value), "fba profit 12.99, got " + r.headline.value); pass++;
/* Etsy: 25 item + 5 ship, 6.5% txn, 3%+0.25 pay, 0.20 listing → payout 26.70 */
r = T2["etsy-fee-calculator"].compute({ price: 25, ship: 5, cost: 6, txn: 6.5, procPct: 3, procFix: 0.25, cur: "USD" }, M);
assert.ok(/26\.70/.test(r.headline.value), "etsy payout 26.70, got " + r.headline.value); pass++;
/* ROAS: 5000 revenue / 1250 spend = 4.00x ; break-even at 40% margin = 2.50x */
r = T2["roas-calculator"].compute({ revenue: 5000, spend: 1250, margin: 40, cur: "USD" }, M);
assert.ok(/4\.00×/.test(r.headline.value), "roas 4.00x, got " + r.headline.value); pass++;
assert.ok(/2\.50×/.test(r.headline.sub), "break-even roas 2.50x, got " + r.headline.sub); pass++;
/* CAC/LTV: spend 10000 / 200 = $50 CAC ; LTV 60*4*3*0.5 = 360 → 7.2:1 */
r = T2["cac-ltv-calculator"].compute({ spend: 10000, customers: 200, aov: 60, freq: 4, years: 3, margin: 50, cur: "USD" }, M);
assert.ok(/7\.2 : 1/.test(r.headline.value), "ltv:cac 7.2:1, got " + r.headline.value); pass++;
/* Discount: 80 at 25% off → 60 final, save 20 (25% off) */
r = T2["discount-calculator"].compute({ price: 80, disc: 25, coupon: 0, tax: 0, cur: "USD" }, M);
assert.ok(/60\.00/.test(r.headline.value), "discount final 60, got " + r.headline.value); pass++;
/* Stacked: 100 at 25% then 10% coupon → 67.50 (32.5% off), NOT 65 */
r = T2["discount-calculator"].compute({ price: 100, disc: 25, coupon: 10, tax: 0, cur: "USD" }, M);
assert.ok(/67\.50/.test(r.headline.value), "stacked discount 67.50, got " + r.headline.value); pass++;

/* Overtime: 22/hr, 40 normal, 8 OT at 1.5x → 880 + 264 = 1144 */
r = T2["overtime-calculator"].compute({ rate: 22, normal: 40, otHours: 8, mult: 1.5, weeks: 1, cur: "USD" }, M);
assert.ok(/1,?144/.test(r.headline.value), "overtime total 1144, got " + r.headline.value); pass++;

/* PTO: 25 days, 6 months worked, 0 taken → 12.5 accrued */
r = T2["pto-accrual"].compute({ entitlement: 25, worked: 6, taken: 0, carried: 0 }, M);
assert.ok(/12\.5/.test(r.headline.value), "PTO 12.5 days, got " + r.headline.value); pass++;

/* Percentage: 25% of 200 = 50 */
r = T2["percentage-calculator"].compute({ a: 25, b: 200, mode: "of" }, M);
eq(r.headline.value, "50", "25% of 200 = 50");
/* % change 50 -> 75 is +50% */
r = T2["percentage-calculator"].compute({ a: 50, b: 75, mode: "change" }, M);
eq(r.headline.value, "50.00%", "change 50->75 is 50%");

/* Tip: 100 bill, 20% tip, 4 people → 30 each */
r = T2["tip-split"].compute({ bill: 100, tip: 20, people: 4, round: 0, cur: "USD" }, M);
assert.ok(/30/.test(r.headline.value), "tip split 30 each, got " + r.headline.value); pass++;

/* Life cover: 50k x 10 + 200k debts + 10k final + 0 edu - 60k assets = 650k */
r = T2["life-insurance-needs"].compute({ income: 50000, years: 10, debts: 200000, final: 10000, education: 0, savings: 60000, cur: "USD" }, M);
assert.ok(/650,?000/.test(r.headline.value), "life cover 650k, got " + r.headline.value); pass++;

/* Deductible trade-off: saves 300/yr, risks 750 more → 2.5 years per claim */
r = T2["deductible-calculator"].compute({ lowExcess: 250, lowPrem: 1500, highExcess: 1000, highPrem: 1200, cur: "USD" }, M);
assert.ok(/2\.5 years/.test(r.stats[2].value), "break-even 2.5 years/claim, got " + r.stats[2].value); pass++;

/* Cap rate: 300k value, 2000/mo, 0% vacancy, 6000 expenses → NOI 18000 → 6.00% */
r = TOOLS["cap-rate"].compute({ value: 300000, rent: 2000, vacancy: 0, expenses: 6000, cur: "USD" }, M);
eq(r.headline.value, "6.00%", "cap rate 6%");

/* Rental yield gross: 300k, 2000/mo → 8.00% gross */
r = T2["rental-yield"].compute({ price: 300000, rent: 2000, costs: 0, vacancy: 0, cur: "USD" }, M);
assert.ok(/8\.00%/.test(r.headline.sub), "gross yield 8%, got " + r.headline.sub); pass++;

/* Late fee: 1000 at 10%/yr for 365 days = 100 interest */
r = T2["late-fee"].compute({ amount: 1000, days: 365, rate: 10, flat: 0, cur: "USD" }, M);
assert.ok(/1,?100/.test(r.headline.value), "late fee total 1100, got " + r.headline.value); pass++;

/* Employee cost: 100k salary, 10% tax, 0 pension/benefits/equip/overhead = 110k, 1.10x */
r = T2["employee-cost"].compute({ salary: 100000, employerTax: 10, pension: 0, benefits: 0, equipment: 0, overhead: 0, cur: "USD" }, M);
assert.ok(/110,?000/.test(r.headline.value), "employee cost 110k, got " + r.headline.value); pass++;
assert.ok(/1\.10/.test(r.headline.sub), "burden 1.10x, got " + r.headline.sub); pass++;

console.log(`calc: ${pass} assertions passed`);
