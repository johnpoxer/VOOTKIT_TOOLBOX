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
