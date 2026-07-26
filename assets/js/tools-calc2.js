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
    },

    /* ---------- BMR / TDEE / daily calories ---------- */
    'bmr-calculator': {
      fields: [
        { k: 'unit', label: 'Units', type: 'select', def: 'metric',
          options: [{ v: 'metric', label: 'Metric (kg, cm)' }, { v: 'imperial', label: 'Imperial (lb, in)' }] },
        { k: 'sex', label: 'Sex', type: 'select', def: 'male',
          options: [{ v: 'male', label: 'Male' }, { v: 'female', label: 'Female' }] },
        { k: 'age', label: 'Age', def: 30, min: 10, max: 100, step: 1 },
        { k: 'weight', label: 'Weight (kg or lb)', def: 75, min: 1, step: 0.1 },
        { k: 'height', label: 'Height (cm or in)', def: 178, min: 1, step: 0.1 },
        { k: 'activity', label: 'Activity level', type: 'select', def: '1.55',
          options: [
            { v: '1.2', label: 'Sedentary (little exercise)' },
            { v: '1.375', label: 'Light (1–3 days/week)' },
            { v: '1.55', label: 'Moderate (3–5 days/week)' },
            { v: '1.725', label: 'Active (6–7 days/week)' },
            { v: '1.9', label: 'Very active (physical job)' }
          ] }
      ],
      compute: function (v) {
        var kg = v.unit === 'imperial' ? v.weight * 0.453592 : v.weight;
        var cm = v.unit === 'imperial' ? v.height * 2.54 : v.height;
        var s = v.sex === 'female' ? -161 : 5;
        var bmr = 10 * kg + 6.25 * cm - 5 * v.age + s;
        var af = parseFloat(v.activity);
        var tdee = bmr * af;
        var r0 = function (x) { return Math.round(x).toLocaleString(); };
        return {
          headline: { label: 'Maintenance calories', value: r0(tdee) + ' kcal/day',
            sub: 'Basal rate ' + r0(bmr) + ' kcal × ' + af + ' activity' },
          stats: [
            { label: 'BMR (at rest)', value: r0(bmr) + ' kcal' },
            { label: 'Mild loss (−0.25 kg/wk)', value: r0(tdee - 250) + ' kcal' },
            { label: 'Loss (−0.5 kg/wk)', value: r0(tdee - 500) + ' kcal' },
            { label: 'Gain (+0.5 kg/wk)', value: r0(tdee + 500) + ' kcal' }
          ],
          note: 'Uses the Mifflin-St Jeor equation. Estimates only — actual needs vary with body composition, genetics and NEAT.'
        };
      }
    },

    /* ---------- macros ---------- */
    'macro-calculator': {
      fields: [
        { k: 'calories', label: 'Daily calories', def: 2200, min: 800, max: 6000, step: 10 },
        { k: 'split', label: 'Diet split', type: 'select', def: 'balanced',
          options: [
            { v: 'balanced', label: 'Balanced (50C / 25P / 25F)' },
            { v: 'highprotein', label: 'High protein (40C / 40P / 20F)' },
            { v: 'lowcarb', label: 'Low carb (25C / 40P / 35F)' },
            { v: 'keto', label: 'Keto (5C / 30P / 65F)' }
          ] }
      ],
      compute: function (v) {
        var splits = { balanced: [50, 25, 25], highprotein: [40, 40, 20], lowcarb: [25, 40, 35], keto: [5, 30, 65] };
        var s = splits[v.split] || splits.balanced;
        var carbG = v.calories * s[0] / 100 / 4;
        var protG = v.calories * s[1] / 100 / 4;
        var fatG = v.calories * s[2] / 100 / 9;
        var r0 = function (x) { return Math.round(x); };
        return {
          headline: { label: 'Daily target', value: v.calories.toLocaleString() + ' kcal',
            sub: s[0] + '% carbs · ' + s[1] + '% protein · ' + s[2] + '% fat' },
          stats: [
            { label: 'Protein', value: r0(protG) + ' g' },
            { label: 'Carbs', value: r0(carbG) + ' g' },
            { label: 'Fat', value: r0(fatG) + ' g' },
            { label: 'Per meal (×3)', value: r0(protG / 3) + 'P / ' + r0(carbG / 3) + 'C / ' + r0(fatG / 3) + 'F' }
          ],
          note: 'Protein and carbs are 4 kcal/g, fat is 9 kcal/g. A starting point — adjust to your goals and how you feel.'
        };
      }
    },

    /* ---------- body fat (US Navy) ---------- */
    'body-fat-calculator': {
      fields: [
        { k: 'sex', label: 'Sex', type: 'select', def: 'male',
          options: [{ v: 'male', label: 'Male' }, { v: 'female', label: 'Female' }] },
        { k: 'height', label: 'Height (cm)', def: 178, min: 1, step: 0.1 },
        { k: 'neck', label: 'Neck (cm)', def: 38, min: 1, step: 0.1 },
        { k: 'waist', label: 'Waist (cm)', def: 85, min: 1, step: 0.1 },
        { k: 'hip', label: 'Hip (cm) — female only', def: 95, min: 0, step: 0.1, hint: 'Ignored for male' }
      ],
      compute: function (v) {
        var bf;
        if (v.sex === 'female') {
          bf = 495 / (1.29579 - 0.35004 * Math.log10(v.waist + v.hip - v.neck) + 0.22100 * Math.log10(v.height)) - 450;
        } else {
          bf = 495 / (1.0324 - 0.19077 * Math.log10(v.waist - v.neck) + 0.15456 * Math.log10(v.height)) - 450;
        }
        var cat;
        if (v.sex === 'female') cat = bf < 14 ? 'Essential' : bf < 21 ? 'Athletic' : bf < 25 ? 'Fitness' : bf < 32 ? 'Average' : 'High';
        else cat = bf < 6 ? 'Essential' : bf < 14 ? 'Athletic' : bf < 18 ? 'Fitness' : bf < 25 ? 'Average' : 'High';
        return {
          headline: { label: 'Body fat', value: isFinite(bf) && bf > 0 ? bf.toFixed(1) + '%' : '—', sub: isFinite(bf) && bf > 0 ? cat : 'Check your measurements' },
          stats: [
            { label: 'Category', value: isFinite(bf) && bf > 0 ? cat : '—' },
            { label: 'Method', value: 'US Navy (circumference)' }
          ],
          note: 'The US Navy tape method estimates body fat from body circumferences. Skinfold or DEXA scans are more precise. Measure snugly, not tight.'
        };
      }
    },

    /* ---------- ideal weight ---------- */
    'ideal-weight-calculator': {
      fields: [
        { k: 'unit', label: 'Height units', type: 'select', def: 'metric',
          options: [{ v: 'metric', label: 'Centimetres' }, { v: 'imperial', label: 'Inches' }] },
        { k: 'sex', label: 'Sex', type: 'select', def: 'male',
          options: [{ v: 'male', label: 'Male' }, { v: 'female', label: 'Female' }] },
        { k: 'height', label: 'Height (cm or in)', def: 178, min: 1, step: 0.1 }
      ],
      compute: function (v) {
        var inches = v.unit === 'imperial' ? v.height : v.height / 2.54;
        var over = Math.max(0, inches - 60);
        var male = v.sex !== 'female';
        var devine = (male ? 50 : 45.5) + 2.3 * over;
        var robinson = (male ? 52 : 49) + (male ? 1.9 : 1.7) * over;
        var miller = (male ? 56.2 : 53.1) + (male ? 1.41 : 1.36) * over;
        var m = v.unit === 'imperial' ? inches * 0.0254 : v.height / 100;
        var kgToLb = function (k) { return (k / 0.453592).toFixed(0); };
        return {
          headline: { label: 'Ideal weight (Devine)', value: devine.toFixed(1) + ' kg',
            sub: kgToLb(devine) + ' lb' },
          stats: [
            { label: 'Robinson', value: robinson.toFixed(1) + ' kg (' + kgToLb(robinson) + ' lb)' },
            { label: 'Miller', value: miller.toFixed(1) + ' kg (' + kgToLb(miller) + ' lb)' },
            { label: 'Healthy BMI range', value: (18.5 * m * m).toFixed(0) + '–' + (24.9 * m * m).toFixed(0) + ' kg' }
          ],
          note: 'These formulas are rough guides based on height and sex only. A healthy weight is a range, not a single number.'
        };
      }
    },

    /* ---------- water intake ---------- */
    'water-intake-calculator': {
      fields: [
        { k: 'unit', label: 'Weight units', type: 'select', def: 'metric',
          options: [{ v: 'metric', label: 'Kilograms' }, { v: 'imperial', label: 'Pounds' }] },
        { k: 'weight', label: 'Weight (kg or lb)', def: 75, min: 1, step: 0.1 },
        { k: 'exercise', label: 'Exercise (minutes/day)', def: 30, min: 0, max: 600, step: 5 },
        { k: 'climate', label: 'Climate', type: 'select', def: 'temperate',
          options: [{ v: 'temperate', label: 'Temperate' }, { v: 'hot', label: 'Hot / humid' }] }
      ],
      compute: function (v) {
        var kg = v.unit === 'imperial' ? v.weight * 0.453592 : v.weight;
        var ml = 35 * kg + (v.exercise / 30) * 350 + (v.climate === 'hot' ? 500 : 0);
        var liters = ml / 1000;
        return {
          headline: { label: 'Daily water', value: liters.toFixed(1) + ' L',
            sub: Math.round(ml).toLocaleString() + ' ml · about ' + Math.round(ml / 250) + ' glasses' },
          stats: [
            { label: 'Base (35 ml/kg)', value: Math.round(35 * kg) + ' ml' },
            { label: 'Exercise add', value: '+' + Math.round((v.exercise / 30) * 350) + ' ml' },
            { label: 'Climate add', value: '+' + (v.climate === 'hot' ? 500 : 0) + ' ml' },
            { label: 'Glasses (250 ml)', value: Math.round(ml / 250) }
          ],
          note: 'A general hydration guideline. Food, coffee and tea also count toward fluid intake. Drink to thirst and check with a clinician for medical conditions.'
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
