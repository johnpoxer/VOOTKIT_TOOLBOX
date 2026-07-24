/* tools-money2.js — Wave 1b money tools.
 * Insurance ($31.40 CPC), tax/payroll, freelance/business, and the remaining
 * finance + real-estate calculators. Same declarative shape as tools-money.js.
 *
 * Honesty rules applied throughout:
 *  - insurance/tax outputs are ESTIMATES and say so; no tool implies advice
 *  - tax uses user-supplied rates rather than pretending to know any
 *    jurisdiction's brackets, which change yearly and vary by region
 */
(function (root) {
  'use strict';
  var F = root.VKCalc ? root.VKCalc.fmt : null;

  var CUR = { k: 'cur', label: 'Currency', type: 'select', def: 'USD',
    options: [{ v: 'USD', label: 'USD $' }, { v: 'EUR', label: 'EUR €' }, { v: 'GBP', label: 'GBP £' },
              { v: 'CAD', label: 'CAD $' }, { v: 'AUD', label: 'AUD $' }, { v: 'INR', label: 'INR ₹' }] };

  var T = {

    /* ================= INSURANCE ($31.40 CPC) ================= */

    'life-insurance-needs': {
      fields: [
        { k: 'income', label: 'Your income (a year)', def: 65000, min: 0, step: 1000 },
        { k: 'years', label: 'Years of income to replace', def: 10, min: 1, max: 40, step: 1 },
        { k: 'debts', label: 'Debts to clear', def: 240000, min: 0, step: 5000, hint: 'Mortgage, loans, cards' },
        { k: 'final', label: 'Funeral & final costs', def: 12000, min: 0, step: 1000 },
        { k: 'education', label: 'Education fund', def: 40000, min: 0, step: 5000 },
        { k: 'savings', label: 'Existing savings & cover', def: 30000, min: 0, step: 5000 },
        CUR
      ],
      compute: function (v) {
        var need = v.income * v.years + v.debts + v.final + v.education;
        var gap = Math.max(0, need - v.savings);
        return {
          headline: { label: 'Cover you may need', value: F.money(gap, v.cur),
            sub: 'after subtracting ' + F.money(v.savings, v.cur) + ' you already have' },
          stats: [
            { label: 'Income replacement', value: F.money(v.income * v.years, v.cur) },
            { label: 'Debts', value: F.money(v.debts, v.cur) },
            { label: 'Education + final costs', value: F.money(v.education + v.final, v.cur) },
            { label: 'Total need', value: F.money(need, v.cur) }
          ],
          note: 'A widely used rule-of-thumb method (income replacement plus debts, minus assets). It is an estimate to take into a conversation — not a recommendation, and not insurance advice.'
        };
      }
    },

    'auto-insurance-estimator': {
      fields: [
        { k: 'assets', label: 'Assets you could lose in a claim', def: 120000, min: 0, step: 5000, hint: 'Savings, property equity' },
        { k: 'income', label: 'Income (a year)', def: 65000, min: 0, step: 1000 },
        { k: 'premium', label: 'Current premium (a year)', def: 1400, min: 0, step: 50 },
        { k: 'deductible', label: 'Current deductible / excess', def: 500, min: 0, step: 100 },
        CUR
      ],
      compute: function (v) {
        // Common guidance: liability limits should at least cover net worth + a few years of income
        var suggested = v.assets + v.income * 2;
        var band = suggested <= 100000 ? '100/300' : suggested <= 300000 ? '300/500' : suggested <= 500000 ? '500/500 + umbrella' : '500/500 + umbrella policy';
        return {
          headline: { label: 'Liability cover to aim for', value: F.money(suggested, v.cur),
            sub: 'roughly a “' + band + '” style limit' },
          stats: [
            { label: 'Assets at risk', value: F.money(v.assets, v.cur) },
            { label: 'Income considered', value: F.money(v.income * 2, v.cur) },
            { label: 'Current premium', value: F.money(v.premium, v.cur) },
            { label: 'Current excess', value: F.money(v.deductible, v.cur) }
          ],
          note: 'Liability limits exist to protect what you own. This estimates a sensible floor — actual limits, naming conventions and legal minimums vary by country and state. Not insurance advice.'
        };
      }
    },

    'deductible-calculator': {
      fields: [
        { k: 'lowExcess', label: 'Lower excess amount', def: 250, min: 0, step: 50 },
        { k: 'lowPrem', label: 'Premium with lower excess (a year)', def: 1600, min: 0, step: 25 },
        { k: 'highExcess', label: 'Higher excess amount', def: 1000, min: 0, step: 50 },
        { k: 'highPrem', label: 'Premium with higher excess (a year)', def: 1240, min: 0, step: 25 },
        CUR
      ],
      compute: function (v) {
        var saving = v.lowPrem - v.highPrem;
        var extraRisk = v.highExcess - v.lowExcess;
        var years = saving > 0 ? extraRisk / saving : Infinity;
        return {
          headline: {
            label: saving > 0 ? 'Worth it if you claim less than every' : 'The higher excess saves nothing',
            value: saving > 0 ? F.months(years * 12) : '—',
            sub: saving > 0 ? 'Saving ' + F.money(saving, v.cur) + ' a year, risking ' + F.money(extraRisk, v.cur) + ' more per claim' : 'Check the premiums you entered'
          },
          stats: [
            { label: 'Yearly saving', value: F.money(saving, v.cur) },
            { label: 'Extra you pay per claim', value: F.money(extraRisk, v.cur) },
            { label: 'Break-even claims', value: saving > 0 ? (extraRisk / saving).toFixed(1) + ' years/claim' : '—' },
            { label: 'Saving over 5 years', value: F.money(saving * 5, v.cur) }
          ],
          note: 'Take the higher excess only if you could comfortably pay it tomorrow. The saving is real but small; the excess arrives all at once.'
        };
      }
    },

    'income-protection': {
      fields: [
        { k: 'takehome', label: 'Monthly take-home pay', def: 3400, min: 0, step: 100 },
        { k: 'essentials', label: 'Essential monthly outgoings', def: 2400, min: 0, step: 100, hint: 'Housing, food, utilities, debt' },
        { k: 'sickpay', label: 'Employer sick pay (months)', def: 3, min: 0, max: 24, step: 1 },
        { k: 'savings', label: 'Emergency savings', def: 6000, min: 0, step: 500 },
        CUR
      ],
      compute: function (v) {
        var monthsCovered = v.sickpay + (v.essentials > 0 ? v.savings / v.essentials : 0);
        var benefit = Math.min(v.takehome, v.essentials);
        return {
          headline: { label: 'Monthly benefit to target', value: F.money(benefit, v.cur),
            sub: 'covers your essential outgoings' },
          stats: [
            { label: 'You could last', value: F.months(monthsCovered) },
            { label: 'Employer sick pay', value: v.sickpay + ' months' },
            { label: 'Savings runway', value: F.months(v.essentials > 0 ? v.savings / v.essentials : 0) },
            { label: 'Shortfall vs pay', value: F.money(Math.max(0, v.takehome - benefit), v.cur) }
          ],
          note: 'The deferral period on a policy should roughly match how long you could self-fund — that is where the cost/benefit usually lands. Estimate only, not insurance advice.'
        };
      }
    },

    /* ================= TAX / PAYROLL / HR ================= */

    'paycheck-calculator': {
      fields: [
        { k: 'gross', label: 'Gross salary (a year)', def: 60000, min: 0, step: 1000 },
        { k: 'taxRate', label: 'Effective tax rate (%)', def: 22, min: 0, max: 70, step: 0.5, hint: 'Your overall rate, not your top bracket' },
        { k: 'social', label: 'Social security / NI (%)', def: 7.65, min: 0, max: 40, step: 0.01 },
        { k: 'pension', label: 'Pension contribution (%)', def: 5, min: 0, max: 60, step: 0.5 },
        { k: 'other', label: 'Other monthly deductions', def: 0, min: 0, step: 25 },
        { k: 'periods', label: 'Pay periods a year', type: 'select', def: 12,
          options: [{ v: 12, label: 'Monthly (12)' }, { v: 26, label: 'Fortnightly (26)' }, { v: 52, label: 'Weekly (52)' }, { v: 24, label: 'Semi-monthly (24)' }] },
        CUR
      ],
      compute: function (v) {
        var pension = v.gross * v.pension / 100;
        var taxable = Math.max(0, v.gross - pension);
        var tax = taxable * v.taxRate / 100;
        var soc = v.gross * v.social / 100;
        var otherYear = v.other * 12;
        var net = v.gross - pension - tax - soc - otherYear;
        return {
          headline: { label: 'Take-home per pay period', value: F.money2(net / v.periods, v.cur),
            sub: F.money(net, v.cur) + ' a year' },
          stats: [
            { label: 'Income tax', value: F.money(tax, v.cur) },
            { label: 'Social security', value: F.money(soc, v.cur) },
            { label: 'Pension', value: F.money(pension, v.cur) },
            { label: 'Effective take-home', value: v.gross ? (net / v.gross * 100).toFixed(1) + '%' : '—' }
          ],
          note: 'Uses the rates <em>you</em> supply rather than guessing a country’s brackets — those change every year and differ by region. Check a recent payslip for your real effective rate.'
        };
      }
    },

    'income-tax-estimator': {
      fields: [
        { k: 'income', label: 'Taxable income', def: 60000, min: 0, step: 1000 },
        { k: 'allowance', label: 'Tax-free allowance', def: 14600, min: 0, step: 500 },
        { k: 'r1', label: 'Band 1 rate (%)', def: 12, min: 0, max: 100, step: 0.5 },
        { k: 'b1', label: 'Band 1 ends at', def: 48475, min: 0, step: 1000 },
        { k: 'r2', label: 'Band 2 rate (%)', def: 22, min: 0, max: 100, step: 0.5 },
        { k: 'b2', label: 'Band 2 ends at', def: 103350, min: 0, step: 1000 },
        { k: 'r3', label: 'Band 3 rate (%)', def: 32, min: 0, max: 100, step: 0.5 },
        { k: 'paid', label: 'Tax already paid', def: 9000, min: 0, step: 500 },
        CUR
      ],
      compute: function (v) {
        var taxable = Math.max(0, v.income - v.allowance);
        var t1 = Math.min(taxable, Math.max(0, v.b1 - v.allowance));
        var t2 = Math.min(Math.max(0, taxable - t1), Math.max(0, v.b2 - v.b1));
        var t3 = Math.max(0, taxable - t1 - t2);
        var tax = t1 * v.r1 / 100 + t2 * v.r2 / 100 + t3 * v.r3 / 100;
        var diff = v.paid - tax;
        return {
          headline: {
            label: diff >= 0 ? 'Estimated refund' : 'Estimated amount owed',
            value: F.money(Math.abs(diff), v.cur),
            sub: 'Total tax ' + F.money(tax, v.cur) + ' on ' + F.money(taxable, v.cur) + ' taxable'
          },
          stats: [
            { label: 'Band 1', value: F.money(t1 * v.r1 / 100, v.cur) },
            { label: 'Band 2', value: F.money(t2 * v.r2 / 100, v.cur) },
            { label: 'Band 3', value: F.money(t3 * v.r3 / 100, v.cur) },
            { label: 'Effective rate', value: v.income ? (tax / v.income * 100).toFixed(1) + '%' : '—' }
          ],
          note: 'A progressive-band estimate using the rates you enter — defaults are illustrative only. Real returns involve credits, deductions and local rules. Not tax advice.'
        };
      }
    },

    'self-employment-tax': {
      fields: [
        { k: 'revenue', label: 'Revenue', def: 80000, min: 0, step: 1000 },
        { k: 'expenses', label: 'Allowable expenses', def: 15000, min: 0, step: 500 },
        { k: 'seRate', label: 'Self-employment tax (%)', def: 15.3, min: 0, max: 60, step: 0.01 },
        { k: 'incomeRate', label: 'Income tax rate (%)', def: 22, min: 0, max: 70, step: 0.5 },
        { k: 'deductible', label: 'Half of SE tax deductible?', type: 'select', def: 1,
          options: [{ v: 1, label: 'Yes' }, { v: 0, label: 'No' }] },
        CUR
      ],
      compute: function (v) {
        var profit = Math.max(0, v.revenue - v.expenses);
        var seBase = profit * 0.9235;                 // standard SE adjustment
        var seTax = seBase * v.seRate / 100;
        var taxableIncome = Math.max(0, profit - (v.deductible ? seTax / 2 : 0));
        var incomeTax = taxableIncome * v.incomeRate / 100;
        var total = seTax + incomeTax;
        return {
          headline: { label: 'Set aside for tax', value: F.money(total, v.cur),
            sub: profit ? (total / profit * 100).toFixed(1) + '% of your profit' : '' },
          stats: [
            { label: 'Profit', value: F.money(profit, v.cur) },
            { label: 'Self-employment tax', value: F.money(seTax, v.cur) },
            { label: 'Income tax', value: F.money(incomeTax, v.cur) },
            { label: 'Keep after tax', value: F.money(profit - total, v.cur) }
          ],
          note: 'Move this share into a separate account as you invoice — the single most common freelance mistake is spending gross. Estimate only; not tax advice.'
        };
      }
    },

    'overtime-calculator': {
      fields: [
        { k: 'rate', label: 'Base hourly rate', def: 22, min: 0, step: 0.5 },
        { k: 'normal', label: 'Normal hours', def: 40, min: 0, max: 168, step: 1 },
        { k: 'otHours', label: 'Overtime hours', def: 8, min: 0, max: 168, step: 0.5 },
        { k: 'mult', label: 'Overtime multiplier', type: 'select', def: 1.5,
          options: [{ v: 1.5, label: '1.5× (time and a half)' }, { v: 2, label: '2× (double time)' }, { v: 1.25, label: '1.25×' }, { v: 1, label: '1× (flat)' }] },
        { k: 'weeks', label: 'Weeks', def: 1, min: 1, max: 52, step: 1 },
        CUR
      ],
      compute: function (v) {
        var base = v.rate * v.normal, ot = v.rate * v.mult * v.otHours;
        var week = base + ot;
        return {
          headline: { label: 'Total pay', value: F.money2(week * v.weeks, v.cur),
            sub: v.weeks > 1 ? F.money2(week, v.cur) + ' a week' : '' },
          stats: [
            { label: 'Base pay', value: F.money2(base * v.weeks, v.cur) },
            { label: 'Overtime pay', value: F.money2(ot * v.weeks, v.cur) },
            { label: 'Overtime rate', value: F.money2(v.rate * v.mult, v.cur) + '/hr' },
            { label: 'Total hours', value: (v.normal + v.otHours) * v.weeks }
          ],
          note: 'Overtime rules and eligibility vary by country, contract and role — this calculates the arithmetic, not your legal entitlement.'
        };
      }
    },

    'pto-accrual': {
      fields: [
        { k: 'entitlement', label: 'Yearly entitlement (days)', def: 25, min: 0, max: 365, step: 0.5 },
        { k: 'worked', label: 'Months worked so far', def: 7, min: 0, max: 12, step: 0.5 },
        { k: 'taken', label: 'Days already taken', def: 8, min: 0, step: 0.5 },
        { k: 'carried', label: 'Days carried over', def: 0, min: 0, step: 0.5 }
      ],
      compute: function (v) {
        var accrued = v.entitlement * (v.worked / 12) + v.carried;
        var left = accrued - v.taken;
        return {
          headline: { label: 'Days available now', value: (Math.round(left * 10) / 10) + ' days',
            sub: (Math.round(accrued * 10) / 10) + ' accrued, ' + v.taken + ' taken' },
          stats: [
            { label: 'Accrued to date', value: (Math.round(accrued * 10) / 10) + ' days' },
            { label: 'Remaining for the year', value: (Math.round((v.entitlement + v.carried - v.taken) * 10) / 10) + ' days' },
            { label: 'Accrual per month', value: (Math.round(v.entitlement / 12 * 100) / 100) + ' days' },
            { label: 'Status', value: left < 0 ? 'Over-taken' : 'In credit' }
          ],
          note: left < 0 ? 'You have taken more than you have accrued so far — normal in many schemes, but worth checking your policy.' : 'Straight-line accrual. Some employers accrue annually up front instead.'
        };
      }
    },

    'employee-cost': {
      fields: [
        { k: 'salary', label: 'Gross salary', def: 60000, min: 0, step: 1000 },
        { k: 'employerTax', label: 'Employer taxes (%)', def: 12, min: 0, max: 60, step: 0.1 },
        { k: 'pension', label: 'Employer pension (%)', def: 5, min: 0, max: 40, step: 0.5 },
        { k: 'benefits', label: 'Benefits (a year)', def: 3000, min: 0, step: 250, hint: 'Health, insurance, perks' },
        { k: 'equipment', label: 'Equipment & software', def: 2500, min: 0, step: 250 },
        { k: 'overhead', label: 'Overhead (a year)', def: 6000, min: 0, step: 500, hint: 'Desk, admin, training' },
        CUR
      ],
      compute: function (v) {
        var tax = v.salary * v.employerTax / 100;
        var pen = v.salary * v.pension / 100;
        var total = v.salary + tax + pen + v.benefits + v.equipment + v.overhead;
        return {
          headline: { label: 'True yearly cost', value: F.money(total, v.cur),
            sub: v.salary ? (total / v.salary).toFixed(2) + '× the salary' : '' },
          stats: [
            { label: 'On top of salary', value: F.money(total - v.salary, v.cur) },
            { label: 'Employer taxes', value: F.money(tax, v.cur) },
            { label: 'Monthly cost', value: F.money(total / 12, v.cur) },
            { label: 'Cost per working day', value: F.money(total / 220, v.cur) }
          ],
          note: 'Useful for pricing work and deciding contractor vs employee. Burden multipliers of 1.25–1.4× are common.'
        };
      }
    },

    /* ================= FREELANCE / BUSINESS ================= */

    'hourly-rate': {
      fields: [
        { k: 'target', label: 'Income you want (a year)', def: 70000, min: 0, step: 1000 },
        { k: 'costs', label: 'Business costs (a year)', def: 8000, min: 0, step: 500 },
        { k: 'taxRate', label: 'Tax set-aside (%)', def: 28, min: 0, max: 70, step: 1 },
        { k: 'weeks', label: 'Working weeks a year', def: 46, min: 1, max: 52, step: 1, hint: 'Deduct holiday and sick leave' },
        { k: 'hours', label: 'Billable hours a week', def: 25, min: 1, max: 80, step: 1, hint: 'Rarely more than 60% of your week' },
        CUR
      ],
      compute: function (v) {
        var gross = (v.target / (1 - v.taxRate / 100)) + v.costs;
        var billable = v.weeks * v.hours;
        var rate = billable ? gross / billable : 0;
        return {
          headline: { label: 'Charge at least', value: F.money2(rate, v.cur) + '/hr',
            sub: F.money(rate * 8, v.cur) + ' a day' },
          stats: [
            { label: 'Revenue needed', value: F.money(gross, v.cur) },
            { label: 'Billable hours', value: billable },
            { label: 'Tax set-aside', value: F.money(gross * v.taxRate / 100, v.cur) },
            { label: 'Weekly revenue target', value: F.money(gross / v.weeks, v.cur) }
          ],
          note: 'Most freelancers under-price by billing as though every hour is billable. Admin, sales and downtime are real — 25 billable hours in a 40-hour week is typical.'
        };
      }
    },

    'profit-margin': {
      fields: [
        { k: 'cost', label: 'Cost', def: 40, min: 0, step: 1 },
        { k: 'price', label: 'Selling price', def: 100, min: 0, step: 1 },
        { k: 'units', label: 'Units', def: 100, min: 0, step: 1 },
        CUR
      ],
      compute: function (v) {
        var profit = v.price - v.cost;
        var margin = v.price ? profit / v.price : 0;
        var markup = v.cost ? profit / v.cost : 0;
        return {
          headline: { label: 'Gross margin', value: (margin * 100).toFixed(1) + '%',
            sub: F.money2(profit, v.cur) + ' profit per unit' },
          stats: [
            { label: 'Markup', value: (markup * 100).toFixed(1) + '%' },
            { label: 'Total profit', value: F.money(profit * v.units, v.cur) },
            { label: 'Total revenue', value: F.money(v.price * v.units, v.cur) },
            { label: 'Total cost', value: F.money(v.cost * v.units, v.cur) }
          ],
          note: 'Margin and markup are not the same number — a 50% markup is only a 33% margin. Quote margin to investors, markup to suppliers.'
        };
      }
    },

    'break-even': {
      fields: [
        { k: 'fixed', label: 'Fixed costs (a month)', def: 4000, min: 0, step: 100 },
        { k: 'price', label: 'Price per unit', def: 49, min: 0, step: 1 },
        { k: 'varCost', label: 'Variable cost per unit', def: 18, min: 0, step: 1 },
        CUR
      ],
      compute: function (v) {
        var contribution = v.price - v.varCost;
        var units = contribution > 0 ? Math.ceil(v.fixed / contribution) : Infinity;
        return {
          headline: {
            label: contribution > 0 ? 'Break-even volume' : 'You lose money on every unit',
            value: contribution > 0 ? units.toLocaleString() + ' units/mo' : '—',
            sub: contribution > 0 ? F.money(units * v.price, v.cur) + ' of revenue a month' : 'Variable cost exceeds the price'
          },
          stats: [
            { label: 'Contribution per unit', value: F.money2(contribution, v.cur) },
            { label: 'Contribution margin', value: v.price ? (contribution / v.price * 100).toFixed(1) + '%' : '—' },
            { label: 'Units per working day', value: isFinite(units) ? Math.ceil(units / 22) : '—' },
            { label: 'Fixed costs a year', value: F.money(v.fixed * 12, v.cur) }
          ],
          note: contribution > 0 ? 'Everything above break-even is profit at the contribution margin.' : 'Raise the price or cut the unit cost — volume cannot fix a negative contribution.'
        };
      }
    },

    'late-fee': {
      fields: [
        { k: 'amount', label: 'Invoice amount', def: 2500, min: 0, step: 50 },
        { k: 'days', label: 'Days overdue', def: 45, min: 0, step: 1 },
        { k: 'rate', label: 'Interest rate (% a year)', def: 8, min: 0, max: 100, step: 0.5 },
        { k: 'flat', label: 'Fixed late fee', def: 40, min: 0, step: 5 },
        CUR
      ],
      compute: function (v) {
        var interest = v.amount * (v.rate / 100) * (v.days / 365);
        var total = v.amount + interest + v.flat;
        return {
          headline: { label: 'Total now due', value: F.money2(total, v.cur),
            sub: F.money2(interest + v.flat, v.cur) + ' in charges' },
          stats: [
            { label: 'Interest accrued', value: F.money2(interest, v.cur) },
            { label: 'Fixed fee', value: F.money2(v.flat, v.cur) },
            { label: 'Daily interest', value: F.money2(v.amount * (v.rate / 100) / 365, v.cur) },
            { label: 'Days overdue', value: v.days }
          ],
          note: 'Simple interest, pro-rated daily. What you may legally charge — and any statutory rate or fixed compensation — depends on your jurisdiction and your contract.'
        };
      }
    },

    'vat-gst': {
      fields: [
        { k: 'amount', label: 'Amount', def: 100, min: 0, step: 1 },
        { k: 'rate', label: 'Tax rate (%)', def: 20, min: 0, max: 100, step: 0.5 },
        { k: 'mode', label: 'The amount above is', type: 'select', def: 'net',
          options: [{ v: 'net', label: 'Before tax (add tax)' }, { v: 'gross', label: 'Including tax (remove tax)' }] },
        CUR
      ],
      compute: function (v) {
        var net, tax, gross;
        if (v.mode === 'gross') { gross = v.amount; net = gross / (1 + v.rate / 100); tax = gross - net; }
        else { net = v.amount; tax = net * v.rate / 100; gross = net + tax; }
        return {
          headline: { label: v.mode === 'gross' ? 'Amount before tax' : 'Total including tax',
            value: F.money2(v.mode === 'gross' ? net : gross, v.cur),
            sub: F.money2(tax, v.cur) + ' tax at ' + v.rate + '%' },
          stats: [
            { label: 'Net', value: F.money2(net, v.cur) },
            { label: 'Tax', value: F.money2(tax, v.cur) },
            { label: 'Gross', value: F.money2(gross, v.cur) },
            { label: 'Rate', value: v.rate + '%' }
          ]
        };
      }
    },

    /* ================= REMAINING FINANCE ================= */

    'compound-interest': {
      fields: [
        { k: 'start', label: 'Starting amount', def: 5000, min: 0, step: 100 },
        { k: 'monthly', label: 'Added each month', def: 300, min: 0, step: 25 },
        { k: 'rate', label: 'Return (% a year)', def: 7, min: -50, max: 100, step: 0.1 },
        { k: 'years', label: 'Years', def: 20, min: 1, max: 70, step: 1 },
        CUR
      ],
      compute: function (v, M) {
        var r = v.rate / 100 / 12, n = v.years * 12;
        var fv = M.futureValue(v.start, v.monthly, r, n);
        var contributed = v.start + v.monthly * n;
        var rows = [];
        for (var y = 1; y <= v.years; y++) {
          var val = M.futureValue(v.start, v.monthly, r, y * 12);
          rows.push(['Year ' + y, F.money(v.start + v.monthly * y * 12, v.cur), F.money(val, v.cur), F.money(val - (v.start + v.monthly * y * 12), v.cur)]);
        }
        return {
          headline: { label: 'Value after ' + v.years + ' years', value: F.money(fv, v.cur),
            sub: F.money(fv - contributed, v.cur) + ' of it is growth' },
          stats: [
            { label: 'You put in', value: F.money(contributed, v.cur) },
            { label: 'Growth', value: F.money(fv - contributed, v.cur) },
            { label: 'Growth multiple', value: contributed ? (fv / contributed).toFixed(2) + '×' : '—' },
            { label: 'Final monthly interest', value: F.money2(fv * r, v.cur) }
          ],
          note: 'Assumes a steady return and monthly compounding. Real markets are lumpy — this shows the shape of compounding, not a prediction.',
          table: { summary: 'Year-by-year', head: ['Year', 'Contributed', 'Value', 'Growth'], rows: rows }
        };
      }
    },

    'savings-goal': {
      fields: [
        { k: 'goal', label: 'Target amount', def: 25000, min: 0, step: 500 },
        { k: 'have', label: 'Saved so far', def: 4000, min: 0, step: 500 },
        { k: 'years', label: 'Years to get there', def: 4, min: 0.5, max: 50, step: 0.5 },
        { k: 'rate', label: 'Interest (% a year)', def: 4, min: 0, max: 30, step: 0.1 },
        CUR
      ],
      compute: function (v) {
        var r = v.rate / 100 / 12, n = Math.round(v.years * 12);
        var futureOfExisting = v.have * Math.pow(1 + r, n);
        var need = Math.max(0, v.goal - futureOfExisting);
        var monthly = r === 0 ? need / n : need * r / (Math.pow(1 + r, n) - 1);
        return {
          headline: { label: 'Save each month', value: F.money2(monthly, v.cur),
            sub: 'to reach ' + F.money(v.goal, v.cur) + ' in ' + v.years + ' years' },
          stats: [
            { label: 'Your savings will grow to', value: F.money(futureOfExisting, v.cur) },
            { label: 'Still needed', value: F.money(need, v.cur) },
            { label: 'Total you’ll add', value: F.money(monthly * n, v.cur) },
            { label: 'Interest earned', value: F.money(v.goal - v.have - monthly * n, v.cur) }
          ]
        };
      }
    },

    'retirement-calculator': {
      fields: [
        { k: 'age', label: 'Current age', def: 35, min: 16, max: 90, step: 1 },
        { k: 'retire', label: 'Retirement age', def: 67, min: 40, max: 95, step: 1 },
        { k: 'pot', label: 'Saved so far', def: 45000, min: 0, step: 1000 },
        { k: 'monthly', label: 'Contributed each month', def: 500, min: 0, step: 50, hint: 'Include employer contributions' },
        { k: 'rate', label: 'Return (% a year)', def: 6, min: -20, max: 30, step: 0.1 },
        { k: 'draw', label: 'Withdrawal rate (%)', def: 4, min: 1, max: 15, step: 0.1, hint: 'The classic rule of thumb is 4%' },
        CUR
      ],
      compute: function (v, M) {
        var years = Math.max(0, v.retire - v.age);
        var r = v.rate / 100 / 12, n = years * 12;
        var fv = M.futureValue(v.pot, v.monthly, r, n);
        var income = fv * v.draw / 100;
        return {
          headline: { label: 'Projected pot at ' + v.retire, value: F.money(fv, v.cur),
            sub: 'about ' + F.money(income / 12, v.cur) + ' a month at a ' + v.draw + '% withdrawal rate' },
          stats: [
            { label: 'Years to save', value: years },
            { label: 'You’ll contribute', value: F.money(v.monthly * n, v.cur) },
            { label: 'Growth', value: F.money(fv - v.pot - v.monthly * n, v.cur) },
            { label: 'Yearly income', value: F.money(income, v.cur) }
          ],
          note: 'Before inflation — in today’s money the figure buys less. A projection, not a promise; markets and rules change.'
        };
      }
    },

    'crypto-profit': {
      fields: [
        { k: 'invested', label: 'Total invested', def: 5000, min: 0, step: 100 },
        { k: 'units', label: 'Units held', def: 0.12, min: 0, step: 0.0001 },
        { k: 'price', label: 'Current price per unit', def: 62000, min: 0, step: 100 },
        { k: 'fees', label: 'Fees paid', def: 60, min: 0, step: 5 },
        CUR
      ],
      compute: function (v) {
        var value = v.units * v.price;
        var profit = value - v.invested - v.fees;
        var avg = v.units ? v.invested / v.units : 0;
        return {
          headline: { label: profit >= 0 ? 'Unrealised profit' : 'Unrealised loss',
            value: F.money(Math.abs(profit), v.cur),
            sub: v.invested ? (profit / v.invested * 100).toFixed(1) + '% on what you put in' : '' },
          stats: [
            { label: 'Position value', value: F.money(value, v.cur) },
            { label: 'Average entry', value: F.money2(avg, v.cur) },
            { label: 'Break-even price', value: F.money2(v.units ? (v.invested + v.fees) / v.units : 0, v.cur) },
            { label: 'Fees', value: F.money2(v.fees, v.cur) }
          ],
          note: 'Unrealised until you sell, and before any tax. Crypto is volatile — this is arithmetic on numbers you supplied, not investment advice.'
        };
      }
    },

    'percentage-calculator': {
      fields: [
        { k: 'a', label: 'Value A', def: 25, step: 0.01 },
        { k: 'b', label: 'Value B', def: 200, step: 0.01 },
        { k: 'mode', label: 'Calculate', type: 'select', def: 'of',
          options: [{ v: 'of', label: 'A% of B' }, { v: 'is', label: 'A is what % of B' }, { v: 'change', label: '% change from A to B' }] }
      ],
      compute: function (v) {
        var out, label, sub;
        if (v.mode === 'of') { out = v.a / 100 * v.b; label = v.a + '% of ' + v.b; sub = ''; }
        else if (v.mode === 'is') { out = v.b ? v.a / v.b * 100 : 0; label = v.a + ' as a % of ' + v.b; sub = ''; out = out.toFixed(2) + '%'; }
        else { out = v.a ? (v.b - v.a) / Math.abs(v.a) * 100 : 0; label = 'Change from ' + v.a + ' to ' + v.b; sub = (v.b >= v.a ? 'an increase' : 'a decrease'); out = out.toFixed(2) + '%'; }
        return {
          headline: { label: label, value: typeof out === 'number' ? (Math.round(out * 100) / 100).toLocaleString() : out, sub: sub },
          stats: [
            { label: 'Difference', value: (Math.round((v.b - v.a) * 100) / 100).toLocaleString() },
            { label: 'Sum', value: (Math.round((v.a + v.b) * 100) / 100).toLocaleString() },
            { label: 'Ratio', value: v.b ? (v.a / v.b).toFixed(3) : '—' }
          ]
        };
      }
    },

    'tip-split': {
      fields: [
        { k: 'bill', label: 'Bill amount', def: 84.50, min: 0, step: 0.5 },
        { k: 'tip', label: 'Tip (%)', def: 18, min: 0, max: 100, step: 1 },
        { k: 'people', label: 'Split between', def: 4, min: 1, max: 60, step: 1 },
        { k: 'round', label: 'Round up per person?', type: 'select', def: 0,
          options: [{ v: 0, label: 'No' }, { v: 1, label: 'Yes' }] },
        CUR
      ],
      compute: function (v) {
        var tip = v.bill * v.tip / 100, total = v.bill + tip;
        var each = total / v.people;
        if (v.round) each = Math.ceil(each);
        return {
          headline: { label: 'Each person pays', value: F.money2(each, v.cur),
            sub: 'Total ' + F.money2(v.round ? each * v.people : total, v.cur) },
          stats: [
            { label: 'Tip', value: F.money2(tip, v.cur) },
            { label: 'Bill + tip', value: F.money2(total, v.cur) },
            { label: 'People', value: v.people },
            { label: 'Tip per person', value: F.money2(tip / v.people, v.cur) }
          ]
        };
      }
    },

    /* ================= REMAINING REAL ESTATE ================= */

    'cash-on-cash': {
      fields: [
        { k: 'price', label: 'Purchase price', def: 300000, min: 0, step: 5000 },
        { k: 'down', label: 'Cash deposit', def: 60000, min: 0, step: 5000 },
        { k: 'closing', label: 'Closing costs paid in cash', def: 9000, min: 0, step: 500 },
        { k: 'rehab', label: 'Renovation paid in cash', def: 5000, min: 0, step: 500 },
        { k: 'rent', label: 'Monthly rent', def: 2200, min: 0, step: 50 },
        { k: 'expenses', label: 'Monthly operating expenses', def: 600, min: 0, step: 25 },
        { k: 'rate', label: 'Mortgage rate (%)', def: 6.5, min: 0, max: 30, step: 0.01 },
        { k: 'years', label: 'Mortgage term (years)', def: 30, min: 1, max: 40, step: 1 },
        CUR
      ],
      compute: function (v, M) {
        var loan = Math.max(0, v.price - v.down);
        var pay = M.payment(loan, v.rate / 100 / 12, v.years * 12);
        var cashFlow = v.rent - v.expenses - pay;
        var cashIn = v.down + v.closing + v.rehab;
        var coc = cashIn ? (cashFlow * 12) / cashIn : 0;
        return {
          headline: { label: 'Cash-on-cash return', value: (coc * 100).toFixed(2) + '%',
            sub: F.money2(cashFlow, v.cur) + ' cash flow a month' },
          stats: [
            { label: 'Total cash in', value: F.money(cashIn, v.cur) },
            { label: 'Mortgage payment', value: F.money2(pay, v.cur) },
            { label: 'Yearly cash flow', value: F.money(cashFlow * 12, v.cur) },
            { label: 'Break-even rent', value: F.money2(v.expenses + pay, v.cur) }
          ],
          note: cashFlow < 0 ? 'This property is cash-flow negative — you would fund the shortfall each month and rely on appreciation.' : 'Cash-on-cash measures return on the money you actually put in, unlike cap rate which ignores financing.'
        };
      }
    },

    'closing-costs': {
      fields: [
        { k: 'price', label: 'Purchase price', def: 350000, min: 0, step: 1000 },
        { k: 'transferPct', label: 'Transfer / stamp duty (%)', def: 1.5, min: 0, max: 20, step: 0.1 },
        { k: 'lenderPct', label: 'Lender fees (%)', def: 0.75, min: 0, max: 10, step: 0.05 },
        { k: 'legal', label: 'Legal / conveyancing', def: 1800, min: 0, step: 100 },
        { k: 'survey', label: 'Survey & inspection', def: 700, min: 0, step: 50 },
        { k: 'other', label: 'Other fees', def: 600, min: 0, step: 50 },
        CUR
      ],
      compute: function (v) {
        var transfer = v.price * v.transferPct / 100;
        var lender = v.price * v.lenderPct / 100;
        var total = transfer + lender + v.legal + v.survey + v.other;
        return {
          headline: { label: 'Closing costs', value: F.money(total, v.cur),
            sub: v.price ? (total / v.price * 100).toFixed(2) + '% of the purchase price' : '' },
          stats: [
            { label: 'Transfer / stamp duty', value: F.money(transfer, v.cur) },
            { label: 'Lender fees', value: F.money(lender, v.cur) },
            { label: 'Legal + survey', value: F.money(v.legal + v.survey, v.cur) },
            { label: 'Cash needed with 20% deposit', value: F.money(total + v.price * 0.2, v.cur) }
          ],
          note: 'Rates vary enormously by country and even by state or region — set the percentages to match yours. Budget for these on top of the deposit.'
        };
      }
    },

    'rental-yield': {
      fields: [
        { k: 'price', label: 'Property value', def: 300000, min: 1, step: 1000 },
        { k: 'rent', label: 'Monthly rent', def: 2200, min: 0, step: 50 },
        { k: 'costs', label: 'Yearly costs', def: 6500, min: 0, step: 250, hint: 'Management, maintenance, insurance' },
        { k: 'vacancy', label: 'Vacancy (%)', def: 5, min: 0, max: 100, step: 0.5 },
        CUR
      ],
      compute: function (v) {
        var gross = v.rent * 12;
        var effective = gross * (1 - v.vacancy / 100);
        var net = effective - v.costs;
        return {
          headline: { label: 'Net yield', value: (net / v.price * 100).toFixed(2) + '%',
            sub: 'Gross yield ' + (gross / v.price * 100).toFixed(2) + '%' },
          stats: [
            { label: 'Gross rent', value: F.money(gross, v.cur) },
            { label: 'After vacancy', value: F.money(effective, v.cur) },
            { label: 'Net income', value: F.money(net, v.cur) },
            { label: 'Monthly net', value: F.money2(net / 12, v.cur) }
          ],
          note: 'Yield ignores mortgage costs. Compare it against what the same money would earn elsewhere before deciding.'
        };
      }
    },

    'mortgage-payoff': {
      fields: [
        { k: 'balance', label: 'Balance remaining', def: 240000, min: 0, step: 1000 },
        { k: 'rate', label: 'Interest rate (%)', def: 6.5, min: 0, max: 30, step: 0.01 },
        { k: 'years', label: 'Years remaining', def: 25, min: 1, max: 40, step: 1 },
        { k: 'extra', label: 'Extra payment a month', def: 200, min: 0, step: 25 },
        CUR
      ],
      compute: function (v, M) {
        var r = v.rate / 100 / 12, n = v.years * 12;
        var basePay = M.payment(v.balance, r, n);
        var baseInterest = M.amortise(v.balance, r, n).totalInterest;
        var newN = M.payoffPeriods(v.balance, r, basePay + v.extra);
        var newInterest = 0, bal = v.balance;
        for (var i = 0; i < newN && bal > 0; i++) { var int = bal * r; newInterest += int; bal = bal + int - (basePay + v.extra); }
        return {
          headline: { label: 'You’d finish', value: F.months(n - newN) + ' early',
            sub: 'paying ' + F.money2(basePay + v.extra, v.cur) + ' instead of ' + F.money2(basePay, v.cur) },
          stats: [
            { label: 'Interest saved', value: F.money(Math.max(0, baseInterest - newInterest), v.cur) },
            { label: 'New payoff time', value: F.months(newN) },
            { label: 'Original payoff', value: F.months(n) },
            { label: 'Extra paid in total', value: F.money(v.extra * newN, v.cur) }
          ],
          note: 'Check whether your lender allows overpayments without penalty, and whether they shorten the term or reduce the payment — you want the former.'
        };
      }
    },

    /* ================= E-COMMERCE & SELLER (high CPC) ================= */

    'amazon-fba-calculator': {
      fields: [
        { k: 'price', label: 'Selling price', def: 29.99, min: 0, step: 0.5 },
        { k: 'cost', label: 'Product cost (per unit)', def: 6, min: 0, step: 0.5, hint: 'What you pay your supplier' },
        { k: 'referral', label: 'Amazon referral fee %', def: 15, min: 0, max: 45, step: 1, type: 'number', hint: 'Usually 8–15% by category' },
        { k: 'fba', label: 'FBA fulfilment fee', def: 5.5, min: 0, step: 0.1, hint: 'From Amazon’s fee schedule' },
        { k: 'ship', label: 'Shipping to Amazon (per unit)', def: 1, min: 0, step: 0.1 },
        { k: 'other', label: 'Other costs (PPC, prep)', def: 0, min: 0, step: 0.5 },
        CUR
      ],
      compute: function (v) {
        var referralFee = v.price * v.referral / 100;
        var invest = v.cost + v.ship + v.other;
        var fees = referralFee + v.fba;
        var profit = v.price - fees - invest;
        var margin = v.price > 0 ? profit / v.price * 100 : 0;
        var roi = invest > 0 ? profit / invest * 100 : 0;
        return {
          headline: { label: 'Net profit per unit', value: F.money2(profit, v.cur), sub: margin.toFixed(1) + '% margin · ' + roi.toFixed(0) + '% ROI' },
          stats: [
            { label: 'Referral fee', value: F.money2(referralFee, v.cur) },
            { label: 'FBA + fees', value: F.money2(fees, v.cur) },
            { label: 'Your cost / unit', value: F.money2(invest, v.cur) },
            { label: 'Margin', value: margin.toFixed(1) + '%' }
          ],
          note: profit < 0 ? 'This product loses money at these numbers — raise the price or cut costs.' : 'ROI is profit ÷ your cost per unit; many sellers target 100%+. Amazon’s fee schedule changes — confirm current fees for your category.'
        };
      }
    },

    'etsy-fee-calculator': {
      fields: [
        { k: 'price', label: 'Item price', def: 25, min: 0, step: 0.5 },
        { k: 'ship', label: 'Shipping you charge', def: 5, min: 0, step: 0.5 },
        { k: 'cost', label: 'Your cost to make it', def: 6, min: 0, step: 0.5 },
        { k: 'txn', label: 'Transaction fee %', def: 6.5, min: 0, step: 0.1, type: 'number', hint: 'Etsy standard is 6.5%' },
        { k: 'procPct', label: 'Payment processing %', def: 3, min: 0, step: 0.1, type: 'number' },
        { k: 'procFix', label: 'Payment fixed fee', def: 0.25, min: 0, step: 0.05 },
        CUR
      ],
      compute: function (v) {
        var revenue = v.price + v.ship;
        var listing = 0.20;
        var transaction = revenue * v.txn / 100;
        var payment = revenue * v.procPct / 100 + v.procFix;
        var fees = listing + transaction + payment;
        var payout = revenue - fees;
        var profit = payout - v.cost;
        var effPct = revenue > 0 ? fees / revenue * 100 : 0;
        return {
          headline: { label: 'Your payout after fees', value: F.money2(payout, v.cur), sub: profit >= 0 ? F.money2(profit, v.cur) + ' profit after costs' : F.money2(-profit, v.cur) + ' loss after costs' },
          stats: [
            { label: 'Total Etsy fees', value: F.money2(fees, v.cur) },
            { label: 'Transaction fee', value: F.money2(transaction, v.cur) },
            { label: 'Payment fee', value: F.money2(payment, v.cur) },
            { label: 'Effective fee', value: effPct.toFixed(1) + '%' }
          ],
          note: 'Includes the $0.20 listing fee, transaction fee and payment processing. Etsy also charges offsite-ads fees on some sales — not included here.'
        };
      }
    },

    'stripe-fee-calculator': {
      fields: [
        { k: 'amount', label: 'Amount', def: 100, min: 0, step: 1 },
        { k: 'pct', label: 'Fee %', def: 2.9, min: 0, step: 0.1, type: 'number', hint: 'Stripe US card: 2.9%' },
        { k: 'fixed', label: 'Fixed fee', def: 0.30, min: 0, step: 0.05 },
        { k: 'mode', label: 'Calculate', type: 'select', def: 'net', options: [{ v: 'net', label: 'Fee & net I receive' }, { v: 'gross', label: 'What to charge to receive this' }] },
        CUR
      ],
      compute: function (v) {
        if (v.mode === 'gross') {
          var charge = v.pct < 100 ? (v.amount + v.fixed) / (1 - v.pct / 100) : v.amount;
          var fee = charge - v.amount;
          return {
            headline: { label: 'Charge this to receive ' + F.money2(v.amount, v.cur), value: F.money2(charge, v.cur), sub: F.money2(fee, v.cur) + ' fee' },
            stats: [{ label: 'You receive', value: F.money2(v.amount, v.cur) }, { label: 'Fee', value: F.money2(fee, v.cur) }, { label: 'Effective', value: (charge > 0 ? fee / charge * 100 : 0).toFixed(2) + '%' }],
            note: 'To net a specific amount you must gross-up the charge — the fee applies to the higher total.'
          };
        }
        var feeN = v.amount * v.pct / 100 + v.fixed;
        var net = v.amount - feeN;
        return {
          headline: { label: 'You receive', value: F.money2(net, v.cur), sub: F.money2(feeN, v.cur) + ' fee on ' + F.money2(v.amount, v.cur) },
          stats: [{ label: 'Fee', value: F.money2(feeN, v.cur) }, { label: 'Effective', value: (v.amount > 0 ? feeN / v.amount * 100 : 0).toFixed(2) + '%' }, { label: 'Charged', value: F.money2(v.amount, v.cur) }],
          note: 'Default is Stripe’s standard US card rate (2.9% + $0.30). International cards and currency conversion differ.'
        };
      }
    },

    'paypal-fee-calculator': {
      fields: [
        { k: 'amount', label: 'Amount', def: 100, min: 0, step: 1 },
        { k: 'pct', label: 'Fee %', def: 2.99, min: 0, step: 0.1, type: 'number', hint: 'PayPal US goods & services: 2.99%' },
        { k: 'fixed', label: 'Fixed fee', def: 0.49, min: 0, step: 0.05 },
        { k: 'mode', label: 'Calculate', type: 'select', def: 'net', options: [{ v: 'net', label: 'Fee & net I receive' }, { v: 'gross', label: 'What to charge to receive this' }] },
        CUR
      ],
      compute: function (v) {
        if (v.mode === 'gross') {
          var charge = v.pct < 100 ? (v.amount + v.fixed) / (1 - v.pct / 100) : v.amount;
          var fee = charge - v.amount;
          return {
            headline: { label: 'Charge this to receive ' + F.money2(v.amount, v.cur), value: F.money2(charge, v.cur), sub: F.money2(fee, v.cur) + ' fee' },
            stats: [{ label: 'You receive', value: F.money2(v.amount, v.cur) }, { label: 'Fee', value: F.money2(fee, v.cur) }, { label: 'Effective', value: (charge > 0 ? fee / charge * 100 : 0).toFixed(2) + '%' }],
            note: 'Grossed up so you receive the exact amount after PayPal’s fee.'
          };
        }
        var feeN = v.amount * v.pct / 100 + v.fixed;
        var net = v.amount - feeN;
        return {
          headline: { label: 'You receive', value: F.money2(net, v.cur), sub: F.money2(feeN, v.cur) + ' fee on ' + F.money2(v.amount, v.cur) },
          stats: [{ label: 'Fee', value: F.money2(feeN, v.cur) }, { label: 'Effective', value: (v.amount > 0 ? feeN / v.amount * 100 : 0).toFixed(2) + '%' }, { label: 'Charged', value: F.money2(v.amount, v.cur) }],
          note: 'Default is PayPal’s US goods & services rate. Micropayment, international and currency-conversion rates differ.'
        };
      }
    },

    'roas-calculator': {
      fields: [
        { k: 'revenue', label: 'Revenue from ads', def: 5000, min: 0, step: 100 },
        { k: 'spend', label: 'Ad spend', def: 1250, min: 0, step: 50 },
        { k: 'margin', label: 'Profit margin %', def: 40, min: 0, max: 100, step: 1, type: 'number', hint: 'Gross margin on what you sell' },
        CUR
      ],
      compute: function (v) {
        var roas = v.spend > 0 ? v.revenue / v.spend : 0;
        var roi = v.spend > 0 ? (v.revenue - v.spend) / v.spend * 100 : 0;
        var beRoas = v.margin > 0 ? 100 / v.margin : 0;
        var profit = v.revenue * v.margin / 100 - v.spend;
        return {
          headline: { label: 'ROAS', value: roas.toFixed(2) + '×', sub: 'break-even at ' + beRoas.toFixed(2) + '× for a ' + v.margin + '% margin' },
          stats: [
            { label: 'Profit / loss', value: F.money2(profit, v.cur) },
            { label: 'ROI', value: roi.toFixed(0) + '%' },
            { label: 'Revenue per $1', value: F.money2(roas, v.cur) },
            { label: 'Break-even ROAS', value: beRoas.toFixed(2) + '×' }
          ],
          note: profit < 0 ? 'You’re below break-even ROAS — the ads cost more than the margin they bring in.' : 'ROAS is revenue ÷ ad spend. Break-even ROAS is 1 ÷ margin — below it, ads lose money even when ROAS looks positive.'
        };
      }
    },

    'cac-ltv-calculator': {
      fields: [
        { k: 'spend', label: 'Marketing & sales spend', def: 10000, min: 0, step: 500 },
        { k: 'customers', label: 'New customers acquired', def: 200, min: 1, step: 1 },
        { k: 'aov', label: 'Average order value', def: 60, min: 0, step: 5 },
        { k: 'freq', label: 'Purchases per year', def: 4, min: 0, step: 1 },
        { k: 'years', label: 'Customer lifespan (years)', def: 3, min: 0, step: 0.5 },
        { k: 'margin', label: 'Gross margin %', def: 50, min: 0, max: 100, step: 1, type: 'number' },
        CUR
      ],
      compute: function (v) {
        var cac = v.customers > 0 ? v.spend / v.customers : 0;
        var ltv = v.aov * v.freq * v.years * (v.margin / 100);
        var ratio = cac > 0 ? ltv / cac : 0;
        var annualValue = v.aov * v.freq * (v.margin / 100);
        var payback = annualValue > 0 ? cac / (annualValue / 12) : 0;
        return {
          headline: { label: 'LTV : CAC', value: ratio.toFixed(1) + ' : 1', sub: F.money2(ltv, v.cur) + ' LTV vs ' + F.money2(cac, v.cur) + ' CAC' },
          stats: [
            { label: 'CAC', value: F.money2(cac, v.cur) },
            { label: 'LTV', value: F.money2(ltv, v.cur) },
            { label: 'Payback', value: payback > 0 ? payback.toFixed(1) + ' months' : '—' },
            { label: 'Health', value: ratio >= 3 ? 'Healthy' : ratio >= 1 ? 'Thin' : 'Unprofitable' }
          ],
          note: 'A common benchmark is LTV:CAC of about 3:1. Below 1:1 you lose money on each customer; very high can mean you’re under-investing in growth.'
        };
      }
    },

    'discount-calculator': {
      fields: [
        { k: 'price', label: 'Original price', def: 80, min: 0, step: 1 },
        { k: 'disc', label: 'Discount %', def: 25, min: 0, max: 100, step: 1, type: 'number' },
        { k: 'coupon', label: 'Extra coupon % (optional)', def: 0, min: 0, max: 100, step: 1, type: 'number' },
        { k: 'tax', label: 'Sales tax % (optional)', def: 0, min: 0, step: 0.1, type: 'number' },
        CUR
      ],
      compute: function (v) {
        var afterDisc = v.price * (1 - v.disc / 100);
        var afterCoupon = afterDisc * (1 - v.coupon / 100);
        var withTax = afterCoupon * (1 + v.tax / 100);
        var saved = v.price - afterCoupon;
        var totalOff = v.price > 0 ? saved / v.price * 100 : 0;
        return {
          headline: { label: 'Final price', value: F.money2(withTax, v.cur), sub: 'you save ' + F.money2(saved, v.cur) + ' (' + totalOff.toFixed(0) + '% off)' },
          stats: [
            { label: 'Before tax', value: F.money2(afterCoupon, v.cur) },
            { label: 'You save', value: F.money2(saved, v.cur) },
            { label: 'Total off', value: totalOff.toFixed(1) + '%' },
            { label: 'Tax added', value: F.money2(withTax - afterCoupon, v.cur) }
          ],
          note: v.coupon > 0 ? 'Stacked discounts multiply, they don’t add — 25% then 10% off is 32.5% off, not 35%.' : ''
        };
      }
    }
  };

  root.VKMoneyTools2 = T;
  if (typeof module === 'object' && module.exports) module.exports = T;

  function boot() {
    var host = document.getElementById('workspace');
    if (!host || !root.VKCalc) return;
    if (host.querySelector('.calc-form')) return;      // already mounted by wave 1
    var spec = T[host.getAttribute('data-tool')];
    if (spec) root.VKCalc.mount(host, spec);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
