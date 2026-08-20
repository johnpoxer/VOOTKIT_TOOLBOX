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

  function fmtNum(n) {
    if (!isFinite(n)) return '—';
    var a = Math.abs(n);
    if (a !== 0 && (a < 1e-4 || a >= 1e12)) return n.toExponential(4);
    return (Math.round(n * 1e6) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 6 });
  }
  function labelFor(units, key) { var l = key; units.forEach(function (u) { if (u.v === key) l = u.label; }); return l; }
  // factor-based converter (base unit factor = f). value * fromF / toF.
  function converterTool(units, defFrom, defTo) {
    var opts = units.map(function (u) { return { v: u.v, label: u.label }; });
    return {
      fields: [
        { k: 'value', label: 'Value', def: 1, step: 'any' },
        { k: 'from', label: 'From', type: 'select', def: defFrom, options: opts },
        { k: 'to', label: 'To', type: 'select', def: defTo, options: opts }
      ],
      compute: function (v) {
        var fF = 1, tF = 1; units.forEach(function (u) { if (u.v === v.from) fF = u.f; if (u.v === v.to) tF = u.f; });
        var out = v.value * fF / tF;
        return {
          headline: { label: 'Result', value: fmtNum(out) + ' ' + labelFor(units, v.to), sub: fmtNum(v.value) + ' ' + labelFor(units, v.from) },
          stats: units.filter(function (u) { return u.v !== v.from; }).slice(0, 5).map(function (u) { return { label: u.label, value: fmtNum(v.value * fF / u.f) }; }),
          note: 'Converted locally with standard factors.'
        };
      }
    };
  }
  var U_LENGTH = [{ v: 'm', label: 'Metres', f: 1 }, { v: 'km', label: 'Kilometres', f: 1000 }, { v: 'cm', label: 'Centimetres', f: 0.01 }, { v: 'mm', label: 'Millimetres', f: 0.001 }, { v: 'mi', label: 'Miles', f: 1609.344 }, { v: 'yd', label: 'Yards', f: 0.9144 }, { v: 'ft', label: 'Feet', f: 0.3048 }, { v: 'in', label: 'Inches', f: 0.0254 }, { v: 'nmi', label: 'Nautical miles', f: 1852 }];
  var U_WEIGHT = [{ v: 'kg', label: 'Kilograms', f: 1 }, { v: 'g', label: 'Grams', f: 0.001 }, { v: 'mg', label: 'Milligrams', f: 1e-6 }, { v: 't', label: 'Tonnes', f: 1000 }, { v: 'lb', label: 'Pounds', f: 0.45359237 }, { v: 'oz', label: 'Ounces', f: 0.0283495231 }, { v: 'st', label: 'Stone', f: 6.35029318 }];
  var U_SPEED = [{ v: 'mps', label: 'm/s', f: 1 }, { v: 'kmh', label: 'km/h', f: 0.2777777778 }, { v: 'mph', label: 'mph', f: 0.44704 }, { v: 'knot', label: 'Knots', f: 0.5144444444 }, { v: 'fps', label: 'ft/s', f: 0.3048 }];
  var U_AREA = [{ v: 'm2', label: 'm²', f: 1 }, { v: 'km2', label: 'km²', f: 1e6 }, { v: 'cm2', label: 'cm²', f: 1e-4 }, { v: 'ha', label: 'Hectares', f: 1e4 }, { v: 'acre', label: 'Acres', f: 4046.8564224 }, { v: 'ft2', label: 'ft²', f: 0.09290304 }, { v: 'yd2', label: 'yd²', f: 0.83612736 }, { v: 'mi2', label: 'mi²', f: 2589988.11 }];
  var U_VOLUME = [{ v: 'l', label: 'Litres', f: 1 }, { v: 'ml', label: 'Millilitres', f: 0.001 }, { v: 'm3', label: 'm³', f: 1000 }, { v: 'galus', label: 'US gallons', f: 3.785411784 }, { v: 'galuk', label: 'UK gallons', f: 4.54609 }, { v: 'qt', label: 'US quarts', f: 0.946352946 }, { v: 'pt', label: 'US pints', f: 0.473176473 }, { v: 'cup', label: 'US cups', f: 0.2365882365 }, { v: 'floz', label: 'US fl oz', f: 0.0295735296 }, { v: 'tbsp', label: 'Tablespoons', f: 0.0147867648 }, { v: 'tsp', label: 'Teaspoons', f: 0.00492892159 }];
  var U_DATA = [{ v: 'b', label: 'Bytes', f: 1 }, { v: 'kb', label: 'Kilobytes', f: 1024 }, { v: 'mb', label: 'Megabytes', f: 1048576 }, { v: 'gb', label: 'Gigabytes', f: 1073741824 }, { v: 'tb', label: 'Terabytes', f: 1099511627776 }, { v: 'bit', label: 'Bits', f: 0.125 }, { v: 'kbit', label: 'Kilobits', f: 128 }, { v: 'mbit', label: 'Megabits', f: 131072 }, { v: 'gbit', label: 'Gigabits', f: 134217728 }];

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
    },

    /* ---------- fuel cost ---------- */
    'fuel-cost-calculator': {
      fields: [
        { k: 'unit', label: 'Units', type: 'select', def: 'metric',
          options: [{ v: 'metric', label: 'Metric (km, L/100km, price/L)' }, { v: 'imperial', label: 'Imperial (miles, MPG, price/gal)' }] },
        { k: 'distance', label: 'Trip distance', def: 300, min: 0, step: 1 },
        { k: 'economy', label: 'Fuel economy (L/100km or MPG)', def: 7, min: 0.1, step: 0.1 },
        { k: 'price', label: 'Fuel price (per L or gallon)', def: 1.6, min: 0, step: 0.01 },
        CUR
      ],
      compute: function (v) {
        var used, cost, unitLabel, perDist;
        if (v.unit === 'imperial') {
          used = v.economy > 0 ? v.distance / v.economy : 0;         // gallons
          cost = used * v.price;
          unitLabel = used.toFixed(1) + ' gal';
          perDist = v.distance ? F.money2(cost / v.distance, v.cur) + ' / mile' : '—';
        } else {
          used = v.distance / 100 * v.economy;                       // litres
          cost = used * v.price;
          unitLabel = used.toFixed(1) + ' L';
          perDist = v.distance ? F.money2(cost / v.distance * 100, v.cur) + ' / 100km' : '—';
        }
        return {
          headline: { label: 'Trip fuel cost', value: F.money2(cost, v.cur), sub: unitLabel + ' used' },
          stats: [
            { label: 'Fuel used', value: unitLabel },
            { label: 'Cost per distance', value: perDist },
            { label: 'Round trip', value: F.money2(cost * 2, v.cur) }
          ],
          note: 'Real consumption varies with speed, load, terrain and traffic. Nothing you enter is stored.'
        };
      }
    },

    /* ---------- fuel economy converter ---------- */
    'fuel-economy-converter': {
      fields: [
        { k: 'value', label: 'Value', def: 30, min: 0.1, step: 0.1 },
        { k: 'from', label: 'From', type: 'select', def: 'mpgus',
          options: [
            { v: 'mpgus', label: 'MPG (US)' }, { v: 'mpguk', label: 'MPG (UK)' },
            { v: 'l100km', label: 'L/100km' }, { v: 'kml', label: 'km/L' }
          ] }
      ],
      compute: function (v) {
        if (!(v.value > 0)) return {
          headline: { label: 'Fuel economy', value: '—', sub: 'Enter a value above zero' },
          stats: [{ label: 'MPG (US)', value: '—' }, { label: 'MPG (UK)', value: '—' }, { label: 'km/L', value: '—' }, { label: 'L/100km', value: '—' }],
          note: 'Fuel economy cannot be converted from zero. Enter the vehicle’s measured consumption or mileage.'
        };
        var l100;
        if (v.from === 'mpgus') l100 = 235.215 / v.value;
        else if (v.from === 'mpguk') l100 = 282.481 / v.value;
        else if (v.from === 'kml') l100 = 100 / v.value;
        else l100 = v.value;
        return {
          headline: { label: 'L/100km', value: isFinite(l100) ? l100.toFixed(2) : '—', sub: 'lower is more efficient' },
          stats: [
            { label: 'MPG (US)', value: (235.215 / l100).toFixed(1) },
            { label: 'MPG (UK)', value: (282.481 / l100).toFixed(1) },
            { label: 'km/L', value: (100 / l100).toFixed(2) },
            { label: 'L/100km', value: l100.toFixed(2) }
          ],
          note: 'US and UK gallons differ (3.785 L vs 4.546 L), so their MPG figures are not the same.'
        };
      }
    },

    /* ---------- trip cost splitter ---------- */
    'trip-cost-splitter': {
      fields: [
        { k: 'total', label: 'Total trip cost', def: 1200, min: 0, step: 10 },
        { k: 'people', label: 'Number of people', def: 4, min: 1, max: 100, step: 1 },
        CUR
      ],
      compute: function (v) {
        var n = Math.max(1, Math.round(v.people));
        var per = v.total / n;
        return {
          headline: { label: 'Each person pays', value: F.money2(per, v.cur), sub: 'Split ' + n + ' ways' },
          stats: [
            { label: 'Total cost', value: F.money2(v.total, v.cur) },
            { label: 'People', value: n },
            { label: 'Per person', value: F.money2(per, v.cur) }
          ],
          note: 'Splits a shared total evenly. For uneven shares, work out each person’s portion separately.'
        };
      }
    },

    /* ---------- tip by country ---------- */
    'tip-by-country': {
      fields: [
        { k: 'bill', label: 'Bill amount', def: 50, min: 0, step: 1 },
        { k: 'country', label: 'Country', type: 'select', def: 'us',
          options: [
            { v: 'us', label: 'United States' }, { v: 'ca', label: 'Canada' }, { v: 'uk', label: 'United Kingdom' },
            { v: 'de', label: 'Germany' }, { v: 'fr', label: 'France' }, { v: 'it', label: 'Italy' },
            { v: 'es', label: 'Spain' }, { v: 'au', label: 'Australia' }, { v: 'jp', label: 'Japan' }, { v: 'ae', label: 'UAE' }
          ] },
        CUR
      ],
      compute: function (v) {
        var T = { us: [18, 'Tipping is expected; 15–20% is standard.'], ca: [15, '15–20% is normal at table service.'],
          uk: [12.5, 'Often a 12.5% service charge is added — check the bill first.'], de: [10, 'Round up or ~10%; say the total you want to pay.'],
          fr: [10, 'Service is included by law; a few euros extra is a kind gesture.'], it: [10, '“Coperto” cover charge is common; small extra tip optional.'],
          es: [7, 'Small tips only; rounding up is normal.'], au: [10, 'Not expected; 10% for great service.'],
          jp: [0, 'No tipping — it can cause confusion or offence.'], ae: [12, '10–15% common; check for a service charge.'] };
        var e = T[v.country] || T.us, pct = e[0];
        var tip = v.bill * pct / 100, total = v.bill + tip;
        return {
          headline: { label: 'Suggested tip', value: F.money2(tip, v.cur), sub: pct + '% · total ' + F.money2(total, v.cur) },
          stats: [
            { label: 'Customary rate', value: pct + '%' },
            { label: 'Tip', value: F.money2(tip, v.cur) },
            { label: 'Total to pay', value: F.money2(total, v.cur) }
          ],
          note: e[1] + ' Customs vary by region and venue — this is a general guide.'
        };
      }
    },

    /* ---------- mileage reimbursement ---------- */
    'mileage-reimbursement': {
      fields: [
        { k: 'distance', label: 'Distance driven', def: 250, min: 0, step: 1 },
        { k: 'rate', label: 'Rate per mile/km', def: 0.67, min: 0, step: 0.01, hint: 'Enter your org’s current rate' },
        CUR
      ],
      compute: function (v) {
        var amount = v.distance * v.rate;
        return {
          headline: { label: 'Reimbursement', value: F.money2(amount, v.cur), sub: v.distance.toLocaleString() + ' × ' + F.money2(v.rate, v.cur) },
          stats: [
            { label: 'Distance', value: v.distance.toLocaleString() },
            { label: 'Rate', value: F.money2(v.rate, v.cur) },
            { label: 'Total claim', value: F.money2(amount, v.cur) }
          ],
          note: 'Reimbursement rates are set by your employer or tax authority and change yearly — enter the current rate that applies to you.'
        };
      }
    },

    /* ---------- payroll ---------- */
    'payroll-calculator': {
      fields: [
        { k: 'gross', label: 'Annual gross salary', def: 60000, min: 0, step: 1000 },
        { k: 'tax', label: 'Income tax (%)', def: 20, min: 0, max: 60, step: 0.5 },
        { k: 'pension', label: 'Pension / retirement (%)', def: 5, min: 0, max: 50, step: 0.5 },
        { k: 'other', label: 'Other deductions (a year)', def: 0, min: 0, step: 100 },
        { k: 'ertax', label: 'Employer tax / NI (%)', def: 8, min: 0, max: 40, step: 0.5 },
        CUR
      ],
      compute: function (v) {
        var tax = v.gross * v.tax / 100, pension = v.gross * v.pension / 100;
        var net = Math.max(0, v.gross - tax - pension - v.other);
        var employerCost = v.gross + v.gross * v.ertax / 100;
        return {
          headline: { label: 'Net pay (a year)', value: F.money(net, v.cur), sub: F.money2(net / 12, v.cur) + ' a month' },
          stats: [
            { label: 'Gross', value: F.money(v.gross, v.cur) },
            { label: 'Income tax', value: F.money(tax, v.cur) },
            { label: 'Pension + other', value: F.money(pension + v.other, v.cur) },
            { label: 'Employer total cost', value: F.money(employerCost, v.cur) }
          ],
          note: 'A simplified estimate — real payroll depends on tax brackets, allowances and local rules. Nothing you enter is stored.'
        };
      }
    },

    /* ---------- stream revenue ---------- */
    'stream-revenue-calculator': {
      fields: [
        { k: 'subs', label: 'Subscribers', def: 100, min: 0, step: 1 },
        { k: 'subnet', label: 'Your $ per sub', def: 2.5, min: 0, step: 0.1, hint: 'Usually ~50% of the sub price' },
        { k: 'bits', label: 'Bits cheered per month', def: 5000, min: 0, step: 100 },
        { k: 'donations', label: 'Donations / tips (a month)', def: 100, min: 0, step: 10 },
        { k: 'ads', label: 'Ad revenue (a month)', def: 50, min: 0, step: 10 },
        CUR
      ],
      compute: function (v) {
        var sub = v.subs * v.subnet, bits = v.bits * 0.01, total = sub + bits + v.donations + v.ads;
        return {
          headline: { label: 'Estimated monthly revenue', value: F.money2(total, v.cur), sub: F.money(total * 12, v.cur) + ' a year' },
          stats: [
            { label: 'Subscriptions', value: F.money2(sub, v.cur) },
            { label: 'Bits', value: F.money2(bits, v.cur) },
            { label: 'Donations', value: F.money2(v.donations, v.cur) },
            { label: 'Ads', value: F.money2(v.ads, v.cur) }
          ],
          note: 'Bits pay about $0.01 each; subscriber payout is usually ~50% of the sub price (higher for larger partners). A rough estimate before platform taxes and fees.'
        };
      }
    },

    /* ---------- OBS settings assistant (rule-based) ---------- */
    'obs-settings-assistant': {
      fields: [
        { k: 'upload', label: 'Upload speed (Mbps)', def: 10, min: 0.5, max: 1000, step: 0.5 },
        { k: 'res', label: 'Resolution', type: 'select', def: '1080', options: [{ v: '1080', label: '1080p' }, { v: '720', label: '720p' }, { v: '480', label: '480p' }] },
        { k: 'fps', label: 'Frame rate', type: 'select', def: '60', options: [{ v: '60', label: '60 fps' }, { v: '30', label: '30 fps' }] },
        { k: 'platform', label: 'Platform', type: 'select', def: 'twitch', options: [{ v: 'twitch', label: 'Twitch' }, { v: 'youtube', label: 'YouTube' }, { v: 'kick', label: 'Kick' }, { v: 'facebook', label: 'Facebook' }] }
      ],
      compute: function (v) {
        var base = { '1080_60': 6000, '1080_30': 4500, '720_60': 4500, '720_30': 3000, '480_60': 2000, '480_30': 1500 };
        var rec = base[v.res + '_' + v.fps] || 4500;
        var caps = { twitch: 8500, youtube: 12000, kick: 8000, facebook: 6000 };
        rec = Math.min(rec, caps[v.platform] || 6000);
        var safe = Math.round(v.upload * 1000 * 0.6);
        var bitrate = Math.max(500, Math.min(rec, safe));
        var warn = safe < rec ? 'Your upload limits you to about ' + bitrate + ' kbps — below the ideal ' + rec + ' for this quality. Consider a lower resolution or 30 fps. ' : '';
        return {
          headline: { label: 'Recommended video bitrate', value: bitrate + ' kbps', sub: v.res + 'p' + v.fps },
          stats: [
            { label: 'Ideal for quality', value: rec + ' kbps' },
            { label: 'Your safe max', value: safe + ' kbps' },
            { label: 'Keyframe interval', value: '2 s' },
            { label: 'Audio bitrate', value: '160 kbps' }
          ],
          note: warn + 'Use hardware encoding (NVENC / AV1) if your GPU supports it, otherwise x264 “veryfast”. ' + (v.platform === 'twitch' ? 'Twitch caps most non-partners around 6000 kbps.' : '')
        };
      }
    },

    /* ---------- unit converters ---------- */
    'length-converter': converterTool(U_LENGTH, 'mi', 'km'),
    'weight-converter': converterTool(U_WEIGHT, 'lb', 'kg'),
    'speed-converter': converterTool(U_SPEED, 'mph', 'kmh'),
    'area-converter': converterTool(U_AREA, 'acre', 'ha'),
    'volume-converter': converterTool(U_VOLUME, 'galus', 'l'),
    'data-converter': converterTool(U_DATA, 'mb', 'gb'),

    'temperature-converter': {
      fields: [
        { k: 'value', label: 'Temperature', def: 100, step: 'any' },
        { k: 'from', label: 'From', type: 'select', def: 'c', options: [{ v: 'c', label: 'Celsius' }, { v: 'f', label: 'Fahrenheit' }, { v: 'k', label: 'Kelvin' }] },
        { k: 'to', label: 'To', type: 'select', def: 'f', options: [{ v: 'c', label: 'Celsius' }, { v: 'f', label: 'Fahrenheit' }, { v: 'k', label: 'Kelvin' }] }
      ],
      compute: function (v) {
        var c = v.from === 'f' ? (v.value - 32) * 5 / 9 : v.from === 'k' ? v.value - 273.15 : v.value;
        function to(u) { return u === 'f' ? c * 9 / 5 + 32 : u === 'k' ? c + 273.15 : c; }
        var sym = { c: '°C', f: '°F', k: 'K' };
        return {
          headline: { label: 'Result', value: fmtNum(to(v.to)) + ' ' + sym[v.to], sub: fmtNum(v.value) + ' ' + sym[v.from] },
          stats: [{ label: 'Celsius', value: fmtNum(c) + ' °C' }, { label: 'Fahrenheit', value: fmtNum(to('f')) + ' °F' }, { label: 'Kelvin', value: fmtNum(to('k')) + ' K' }],
          note: 'Exact conversions. Absolute zero is −273.15 °C.'
        };
      }
    },

    /* ---------- electricity cost ---------- */
    'electricity-cost': {
      fields: [
        { k: 'power', label: 'Power (watts)', def: 100, min: 0, step: 10 },
        { k: 'hours', label: 'Hours used per day', def: 5, min: 0, max: 24, step: 0.5 },
        { k: 'days', label: 'Number of days', def: 30, min: 1, step: 1 },
        { k: 'rate', label: 'Price per kWh', def: 0.15, min: 0, step: 0.01 },
        CUR
      ],
      compute: function (v) {
        var kwh = v.power / 1000 * v.hours * v.days, cost = kwh * v.rate;
        return {
          headline: { label: 'Cost', value: F.money2(cost, v.cur), sub: fmtNum(kwh) + ' kWh over ' + v.days + ' days' },
          stats: [
            { label: 'Energy used', value: fmtNum(kwh) + ' kWh' },
            { label: 'Per day', value: F.money2(cost / v.days, v.cur) },
            { label: 'Per year (same use)', value: F.money2(v.power / 1000 * v.hours * 365 * v.rate, v.cur) }
          ],
          note: 'kWh = watts ÷ 1000 × hours × days. Check your bill for the exact price per kWh.'
        };
      }
    },

    /* ---------- hourly wage ---------- */
    'hourly-wage': {
      fields: [
        { k: 'rate', label: 'Hourly rate', def: 15, min: 0, step: 0.5 },
        { k: 'hours', label: 'Hours per week', def: 40, min: 0, max: 168, step: 1 },
        { k: 'weeks', label: 'Weeks worked per year', def: 52, min: 1, max: 52, step: 1 },
        CUR
      ],
      compute: function (v) {
        var weekly = v.rate * v.hours, annual = weekly * v.weeks;
        return {
          headline: { label: 'Annual pay', value: F.money(annual, v.cur), sub: F.money2(annual / 12, v.cur) + ' a month' },
          stats: [
            { label: 'Hourly', value: F.money2(v.rate, v.cur) },
            { label: 'Daily (÷5)', value: F.money2(weekly / 5, v.cur) },
            { label: 'Weekly', value: F.money2(weekly, v.cur) },
            { label: 'Monthly', value: F.money2(annual / 12, v.cur) }
          ],
          note: 'Gross pay before tax and deductions.'
        };
      }
    },

    /* ---------- running pace ---------- */
    'pace-calculator': {
      fields: [
        { k: 'distance', label: 'Distance', def: 5, min: 0.01, step: 0.1 },
        { k: 'unit', label: 'Unit', type: 'select', def: 'km', options: [{ v: 'km', label: 'Kilometres' }, { v: 'mi', label: 'Miles' }] },
        { k: 'hh', label: 'Hours', def: 0, min: 0, max: 99, step: 1 },
        { k: 'mm', label: 'Minutes', def: 25, min: 0, max: 59, step: 1 },
        { k: 'ss', label: 'Seconds', def: 0, min: 0, max: 59, step: 1 }
      ],
      compute: function (v) {
        var tot = v.hh * 3600 + v.mm * 60 + v.ss;
        if (v.distance <= 0 || tot <= 0) return { headline: { label: 'Pace', value: '—', sub: 'Enter a distance and time' }, stats: [] };
        function duration(s) {
          s = Math.max(0, Math.round(s));
          var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
          return h ? h + ':' + ('0' + m).slice(-2) + ':' + ('0' + sec).slice(-2) : m + ':' + ('0' + sec).slice(-2);
        }
        var pace = tot / v.distance, speed = v.distance / (tot / 3600), u = v.unit;
        var altPace = u === 'km' ? pace * 1.609344 : pace / 1.609344, altU = u === 'km' ? 'mi' : 'km';
        var halfDistance = u === 'km' ? 21.0975 : 13.1094;
        var marathonDistance = u === 'km' ? 42.195 : 26.2188;
        return {
          headline: { label: 'Pace', value: duration(pace) + ' / ' + u, sub: speed.toFixed(2) + ' ' + u + '/h' },
          stats: [
            { label: 'Speed', value: speed.toFixed(2) + ' ' + u + '/h' },
            { label: 'Per ' + altU, value: duration(altPace) + ' / ' + altU },
            { label: '10 ' + u + ' time', value: duration(pace * 10) },
            { label: 'Half marathon', value: duration(pace * halfDistance) },
            { label: 'Marathon', value: duration(pace * marathonDistance) }
          ],
          note: 'Pace = time ÷ distance. Predicted race times assume you hold this pace.'
        };
      }
    },

    /* ---------- heart rate zones ---------- */
    'heart-rate-calculator': {
      fields: [
        { k: 'age', label: 'Age', def: 30, min: 5, max: 120, step: 1 },
        { k: 'resting', label: 'Resting heart rate (bpm)', def: 60, min: 30, max: 120, step: 1 }
      ],
      compute: function (v) {
        var max = 220 - v.age, reserve = max - v.resting;
        if (reserve <= 0) {
          return {
            headline: { label: 'Max heart rate', value: max + ' bpm', sub: 'Resting rate must be below estimated max' },
            stats: [{ label: 'Resting heart rate', value: v.resting + ' bpm' }],
            note: 'The 220 − age estimate is rough. If your resting rate is near or above that estimate, use measured zones from a clinician or coach.'
          };
        }
        function z(lo, hi) { return Math.round(reserve * lo + v.resting) + '–' + Math.round(reserve * hi + v.resting) + ' bpm'; }
        return {
          headline: { label: 'Max heart rate', value: max + ' bpm', sub: 'Estimate: 220 − age' },
          stats: [
            { label: 'Warm-up (50–60%)', value: z(0.5, 0.6) },
            { label: 'Fat burn (60–70%)', value: z(0.6, 0.7) },
            { label: 'Cardio (70–80%)', value: z(0.7, 0.8) },
            { label: 'Peak (80–90%)', value: z(0.8, 0.9) }
          ],
          note: 'Zones use the Karvonen method (heart-rate reserve) with your resting rate. 220 − age is a rough max — a lab test is more accurate. Talk to a doctor before intense training.'
        };
      }
    },

    /* ---------- distance / travel time ---------- */
    'distance-calculator': {
      fields: [
        { k: 'distance', label: 'Distance', def: 100, min: 0, step: 1 },
        { k: 'unit', label: 'Unit', type: 'select', def: 'km', options: [{ v: 'km', label: 'km (speed in km/h)' }, { v: 'mi', label: 'miles (speed in mph)' }] },
        { k: 'speed', label: 'Average speed', def: 60, min: 1, step: 1 }
      ],
      compute: function (v) {
        if (!(v.speed > 0)) return {
          headline: { label: 'Travel time', value: '—', sub: 'Enter an average speed above zero' },
          stats: [{ label: 'Time', value: '—' }, { label: 'With breaks', value: '—' }, { label: 'Distance', value: (Number(v.distance) || 0) + ' ' + v.unit }],
          note: 'A travel time needs a speed above zero. Real journeys also vary with traffic, stops and terrain.'
        };
        var hours = v.distance / v.speed;
        function tripTime(h) {
          var mins = Math.round(Math.max(0, h) * 60);
          return Math.floor(mins / 60) + ' h ' + ('0' + (mins % 60)).slice(-2) + ' min';
        }
        var breaks = Math.max(0, Math.ceil(hours / 2) - 1);
        var withBreaks = hours + breaks * 0.25;
        return {
          headline: { label: 'Travel time', value: tripTime(hours), sub: v.distance + ' ' + v.unit + ' at ' + v.speed + ' ' + (v.unit === 'mi' ? 'mph' : 'km/h') },
          stats: [
            { label: 'Time', value: hours.toFixed(2) + ' hours' },
            { label: 'With a 15-min break every 2 h', value: tripTime(withBreaks) },
            { label: 'Distance', value: v.distance + ' ' + v.unit }
          ],
          note: 'Assumes a constant average speed. Real journeys vary with traffic, stops and terrain.'
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
