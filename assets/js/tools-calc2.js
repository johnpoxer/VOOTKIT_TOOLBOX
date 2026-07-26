/* tools-calc2.js — Roadmap wave: additional on-device calculators.
 * Same declarative shape as tools-money.js: each entry has fields + compute();
 * calc.js renders the form, recomputes live and formats output. All maths is
 * local — nothing entered here is transmitted or stored. */
(function (root) {
  'use strict';
  var F = root.VKCalc ? root.VKCalc.fmt : null;

  var CUR = { k: 'cur', label: 'Currency', type: 'select', def: 'USD',
    options: [{ v: 'USD', label: 'USD $' }, { v: 'EUR', label: 'EUR €' }, { v: 'GBP', label: 'GBP £' },
              { v: 'CAD', label: 'CAD $' }, { v: 'AUD', label: 'AUD $' }, { v: 'INR', label: 'INR ₹' }] };

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a || 1; }

  var TOOLS = {

    /* ---------- simple interest ---------- */
    'simple-interest': {
      fields: [
        { k: 'principal', label: 'Principal amount', def: 10000, min: 0, step: 100 },
        { k: 'rate', label: 'Interest rate (% a year)', def: 5, min: 0, max: 100, step: 0.01 },
        { k: 'years', label: 'Time (years)', def: 3, min: 0, max: 100, step: 0.25 },
        CUR
      ],
      compute: function (v) {
        var interest = v.principal * (v.rate / 100) * v.years;
        var total = v.principal + interest;
        return {
          headline: { label: 'Total value', value: F.money2(total, v.cur),
            sub: F.money2(interest, v.cur) + ' interest earned' },
          stats: [
            { label: 'Principal', value: F.money2(v.principal, v.cur) },
            { label: 'Interest', value: F.money2(interest, v.cur) },
            { label: 'Rate', value: v.rate + '% / yr' },
            { label: 'Term', value: v.years + (v.years === 1 ? ' year' : ' years') }
          ],
          note: 'Simple interest = principal × rate × time. For interest that compounds, use the Compound Interest calculator.'
        };
      }
    },

    /* ---------- investment growth ---------- */
    'investment-calculator': {
      fields: [
        { k: 'initial', label: 'Initial investment', def: 5000, min: 0, step: 100 },
        { k: 'monthly', label: 'Monthly contribution', def: 300, min: 0, step: 50 },
        { k: 'rate', label: 'Expected return (% a year)', def: 7, min: 0, max: 100, step: 0.1 },
        { k: 'years', label: 'Years invested', def: 20, min: 1, max: 80, step: 1 },
        CUR
      ],
      compute: function (v, M) {
        var r = v.rate / 100 / 12, n = Math.round(v.years * 12);
        var fv = M.futureValue(v.initial, v.monthly, r, n);
        var contributed = v.initial + v.monthly * n;
        var growth = fv - contributed;
        var rows = [];
        for (var y = 1; y <= v.years; y++) {
          var bal = M.futureValue(v.initial, v.monthly, r, y * 12);
          var put = v.initial + v.monthly * y * 12;
          rows.push(['Year ' + y, F.money(bal, v.cur), F.money(put, v.cur), F.money(bal - put, v.cur)]);
        }
        return {
          headline: { label: 'Future value', value: F.money(fv, v.cur),
            sub: F.money(growth, v.cur) + ' growth on ' + F.money(contributed, v.cur) + ' invested' },
          stats: [
            { label: 'Total contributed', value: F.money(contributed, v.cur) },
            { label: 'Investment growth', value: F.money(growth, v.cur) },
            { label: 'Return', value: contributed ? (growth / contributed * 100).toFixed(0) + '%' : '—' },
            { label: 'Months', value: n }
          ],
          note: 'Assumes contributions at month end and a constant annual return compounded monthly. Real returns vary.',
          table: { summary: 'Year-by-year growth', head: ['Year', 'Balance', 'Invested', 'Growth'], rows: rows }
        };
      }
    },

    /* ---------- 50/30/20 budget ---------- */
    'budget-calculator': {
      fields: [
        { k: 'income', label: 'Monthly take-home pay', def: 3500, min: 0, step: 50 },
        CUR
      ],
      compute: function (v) {
        var needs = v.income * 0.5, wants = v.income * 0.3, save = v.income * 0.2;
        return {
          headline: { label: 'Monthly income', value: F.money2(v.income, v.cur),
            sub: 'Split with the 50 / 30 / 20 rule' },
          stats: [
            { label: 'Needs (50%)', value: F.money2(needs, v.cur) },
            { label: 'Wants (30%)', value: F.money2(wants, v.cur) },
            { label: 'Savings (20%)', value: F.money2(save, v.cur) },
            { label: 'Yearly savings', value: F.money(save * 12, v.cur) }
          ],
          note: 'The 50/30/20 rule: 50% on needs (rent, bills, food), 30% on wants, 20% to savings and debt. A guideline, not a rule.'
        };
      }
    },

    /* ---------- BMI ---------- */
    'bmi-calculator': {
      fields: [
        { k: 'unit', label: 'Units', type: 'select', def: 'metric',
          options: [{ v: 'metric', label: 'Metric (kg, cm)' }, { v: 'imperial', label: 'Imperial (lb, in)' }] },
        { k: 'weight', label: 'Weight (kg or lb)', def: 70, min: 1, step: 0.1, hint: 'kg if metric, lb if imperial' },
        { k: 'height', label: 'Height (cm or in)', def: 175, min: 1, step: 0.1, hint: 'cm if metric, in if imperial' }
      ],
      compute: function (v) {
        var bmi, m;
        if (v.unit === 'imperial') { bmi = 703 * v.weight / (v.height * v.height); m = v.height * 0.0254; }
        else { m = v.height / 100; bmi = v.weight / (m * m); }
        var cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy weight' : bmi < 30 ? 'Overweight' : 'Obese';
        var loKg = 18.5 * m * m, hiKg = 24.9 * m * m;
        var range = v.unit === 'imperial'
          ? (loKg / 0.453592).toFixed(0) + '–' + (hiKg / 0.453592).toFixed(0) + ' lb'
          : loKg.toFixed(0) + '–' + hiKg.toFixed(0) + ' kg';
        return {
          headline: { label: 'Your BMI', value: isFinite(bmi) ? bmi.toFixed(1) : '—', sub: cat },
          stats: [
            { label: 'Category', value: cat },
            { label: 'Healthy range', value: range },
            { label: 'Healthy BMI', value: '18.5 – 24.9' }
          ],
          note: 'BMI is a rough screening measure and does not account for muscle, frame or age. It is not a diagnosis — talk to a clinician about your health.'
        };
      }
    },

    /* ---------- fraction calculator ---------- */
    'fraction-calculator': {
      fields: [
        { k: 'n1', label: 'First numerator', def: 1, step: 1 },
        { k: 'd1', label: 'First denominator', def: 2, step: 1 },
        { k: 'op', label: 'Operation', type: 'select', def: 'add',
          options: [{ v: 'add', label: '+ add' }, { v: 'sub', label: '− subtract' }, { v: 'mul', label: '× multiply' }, { v: 'div', label: '÷ divide' }] },
        { k: 'n2', label: 'Second numerator', def: 1, step: 1 },
        { k: 'd2', label: 'Second denominator', def: 3, step: 1 }
      ],
      compute: function (v) {
        var n1 = Math.round(v.n1), d1 = Math.round(v.d1), n2 = Math.round(v.n2), d2 = Math.round(v.d2);
        if (d1 === 0 || d2 === 0) return { headline: { label: 'Result', value: '—', sub: 'Denominator cannot be zero' }, stats: [] };
        var n, d;
        if (v.op === 'add') { n = n1 * d2 + n2 * d1; d = d1 * d2; }
        else if (v.op === 'sub') { n = n1 * d2 - n2 * d1; d = d1 * d2; }
        else if (v.op === 'mul') { n = n1 * n2; d = d1 * d2; }
        else { n = n1 * d2; d = d1 * n2; }
        if (d === 0) return { headline: { label: 'Result', value: '—', sub: 'Division by zero' }, stats: [] };
        if (d < 0) { n = -n; d = -d; }
        var g = gcd(n, d), sn = n / g, sd = d / g;
        var whole = sd !== 0 ? (sn - (sn % sd)) / sd : 0;
        var rem = sn % sd;
        var mixed = (whole !== 0 && rem !== 0) ? whole + ' ' + Math.abs(rem) + '/' + sd : '';
        return {
          headline: { label: 'Result', value: sd === 1 ? String(sn) : sn + '/' + sd,
            sub: isFinite(sn / sd) ? (sn / sd).toFixed(4).replace(/0+$/, '').replace(/\.$/, '') + ' as a decimal' : '' },
          stats: [
            { label: 'Simplified', value: sd === 1 ? String(sn) : sn + '/' + sd },
            { label: 'Decimal', value: (sn / sd).toFixed(6).replace(/0+$/, '').replace(/\.$/, '') },
            mixed ? { label: 'Mixed number', value: mixed } : { label: 'Unsimplified', value: n + '/' + d }
          ],
          note: 'Fractions are reduced to lowest terms using the greatest common divisor.'
        };
      }
    }

  };

  root.VKCalc2Tools = TOOLS;
  if (typeof module === 'object' && module.exports) module.exports = TOOLS;

  /* auto-mount on a tool page */
  function boot() {
    var host = document.getElementById('workspace');
    if (!host || !root.VKCalc) return;
    var spec = TOOLS[host.getAttribute('data-tool')];
    if (spec) root.VKCalc.mount(host, spec);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
