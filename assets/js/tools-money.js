/* tools-money.js — Wave 1 money tools (highest CPC categories).
 * Each entry declares fields + compute(); the engine in calc.js does the rest.
 * All maths runs locally — nothing entered here is transmitted or stored. */
(function (root) {
  'use strict';
  var F = root.VKCalc ? root.VKCalc.fmt : null;

  var CUR = { k: 'cur', label: 'Currency', type: 'select', def: 'USD',
    options: [{ v: 'USD', label: 'USD $' }, { v: 'EUR', label: 'EUR €' }, { v: 'GBP', label: 'GBP £' },
              { v: 'CAD', label: 'CAD $' }, { v: 'AUD', label: 'AUD $' }, { v: 'INR', label: 'INR ₹' }] };

  var TOOLS = {

    /* ---------- mortgage ---------- */
    'mortgage-calculator': {
      fields: [
        { k: 'price', label: 'Property price', def: 350000, min: 0, step: 1000 },
        { k: 'down', label: 'Deposit / down payment', def: 70000, min: 0, step: 1000 },
        { k: 'rate', label: 'Interest rate (% a year)', def: 6.5, min: 0, max: 30, step: 0.01 },
        { k: 'years', label: 'Term (years)', def: 30, min: 1, max: 50, step: 1 },
        { k: 'tax', label: 'Property tax (a year)', def: 3500, min: 0, step: 100, hint: 'Set to 0 to exclude' },
        { k: 'ins', label: 'Home insurance (a year)', def: 1200, min: 0, step: 100 },
        CUR
      ],
      compute: function (v, M) {
        var P = Math.max(0, v.price - v.down), r = v.rate / 100 / 12, n = v.years * 12;
        var a = M.amortise(P, r, n);
        var escrow = (v.tax + v.ins) / 12;
        var rows = a.rows.filter(function (x) { return x.n % 12 === 0; })
          .map(function (x) { return ['Year ' + x.n / 12, F.money(x.payment * 12), F.money(x.principal * 12), F.money(x.interest * 12), F.money(x.balance)]; });
        return {
          headline: { label: 'Monthly payment', value: F.money2(a.payment + escrow, v.cur),
            sub: escrow ? F.money2(a.payment, v.cur) + ' loan + ' + F.money2(escrow, v.cur) + ' tax &amp; insurance' : '' },
          stats: [
            { label: 'Loan amount', value: F.money(P, v.cur) },
            { label: 'Total interest', value: F.money(a.totalInterest, v.cur) },
            { label: 'Total of payments', value: F.money(a.totalPaid, v.cur) },
            { label: 'Deposit', value: (v.price ? (v.down / v.price * 100).toFixed(1) : '0') + '%' }
          ],
          note: 'Estimate only — your lender’s figure will include fees and their own rounding. Nothing you type here leaves your device.',
          table: { summary: 'Year-by-year breakdown', head: ['Year', 'Paid', 'Principal', 'Interest', 'Balance'], rows: rows }
        };
      }
    },

    /* ---------- debt-to-income ----------
     * The number a lender computes about you before deciding anything, and one
     * of the few you can work out yourself in advance with no guesswork.
     *
     * TWO RATIOS, NOT ONE. Most calculators report only the back-end figure and
     * leave people surprised when a mortgage application stalls on housing
     * costs alone. Lenders look at both:
     *   front-end — housing only, over gross income
     *   back-end  — every monthly debt payment, over gross income
     * A borrower can pass one and fail the other, so both are shown.
     *
     * GROSS, NOT NET. Underwriters use income before tax. Someone entering
     * take-home pay gets a ratio several points worse than the one their lender
     * will calculate, so the field says so and the note repeats it.
     */
    'debt-to-income': {
      fields: [
        { k: 'income', label: 'Gross monthly income (before tax)', def: 5000, min: 0, step: 100,
          hint: 'Before tax and deductions — this is what lenders use' },
        { k: 'housing', label: 'Rent or mortgage payment', def: 1400, min: 0, step: 50,
          hint: 'Include property tax, insurance and service charges if you pay them' },
        { k: 'auto', label: 'Car or vehicle payments', def: 350, min: 0, step: 25 },
        { k: 'student', label: 'Student loan payments', def: 0, min: 0, step: 25 },
        { k: 'cards', label: 'Credit card minimum payments', def: 120, min: 0, step: 10,
          hint: 'The minimum due, not the full balance' },
        { k: 'other', label: 'Other loan or support payments', def: 0, min: 0, step: 25,
          hint: 'Personal loans, child support, alimony' },
        CUR
      ],
      compute: function (v) {
        var debts = v.housing + v.auto + v.student + v.cards + v.other;
        var income = v.income;
        var back = income > 0 ? debts / income * 100 : 0;
        var front = income > 0 ? v.housing / income * 100 : 0;

        /* Bands are US conventional-lending guidance, and the note says so —
           43% is the general Qualified Mortgage ceiling, 36% the figure most
           conventional underwriters prefer. Presenting them as universal would
           be wrong on a site served in ten languages. */
        var verdict;
        if (income <= 0) verdict = 'Enter your gross monthly income to see the ratio.';
        else if (back <= 36) verdict = 'Comfortable — inside the 36% most conventional lenders prefer.';
        else if (back <= 43) verdict = 'Workable — over 36%, but inside the 43% Qualified Mortgage ceiling.';
        else if (back <= 50) verdict = 'Tight — above 43%, so you would need compensating factors such as savings or a strong credit history.';
        else verdict = 'Very high — above 50% is difficult to borrow against on standard terms.';

        /* The actionable number: what the payments would have to come down to,
           or income go up to, in order to clear the usual threshold. */
        var room = income * 0.36 - debts;

        return {
          headline: {
            label: 'Debt-to-income ratio',
            value: (income > 0 ? back.toFixed(1) : '—') + '%',
            sub: verdict
          },
          stats: [
            { label: 'Housing ratio (front-end)', value: (income > 0 ? front.toFixed(1) : '—') + '%' },
            { label: 'Total monthly debt', value: F.money2(debts, v.cur) },
            { label: 'Left after debt', value: F.money2(Math.max(0, income - debts), v.cur) },
            { label: room >= 0 ? 'Room before 36%' : 'Over the 36% mark by',
              value: F.money2(Math.abs(room), v.cur) }
          ],
          note: 'Lenders use gross income, before tax. Count the minimum due on cards, not the balance. ' +
                'The 36% and 43% marks are US conventional-lending guidance — thresholds differ by country, ' +
                'lender and loan type, and utilities, groceries and insurance are not counted as debt. ' +
                'Nothing you type here leaves your device.'
        };
      }
    },

    /* ---------- generic loan ---------- */
    'loan-calculator': {
      fields: [
        { k: 'amount', label: 'Loan amount', def: 20000, min: 0, step: 500 },
        { k: 'rate', label: 'Interest rate (% a year)', def: 9.9, min: 0, max: 100, step: 0.01 },
        { k: 'years', label: 'Term (years)', def: 5, min: 0.5, max: 40, step: 0.5 },
        { k: 'fee', label: 'Arrangement fee', def: 0, min: 0, step: 50 },
        CUR
      ],
      compute: function (v, M) {
        var P = v.amount + v.fee, r = v.rate / 100 / 12, n = Math.round(v.years * 12);
        var a = M.amortise(P, r, n);
        return {
          headline: { label: 'Monthly payment', value: F.money2(a.payment, v.cur) },
          stats: [
            { label: 'Total interest', value: F.money(a.totalInterest, v.cur) },
            { label: 'Total repaid', value: F.money(a.totalPaid, v.cur) },
            { label: 'Payments', value: n },
            { label: 'Cost of borrowing', value: v.amount ? ((a.totalInterest + v.fee) / v.amount * 100).toFixed(1) + '%' : '—' }
          ],
          note: 'Assumes a fixed rate and equal monthly payments.'
        };
      }
    },

    /* ---------- auto loan ---------- */
    'auto-loan-calculator': {
      fields: [
        { k: 'price', label: 'Vehicle price', def: 32000, min: 0, step: 500 },
        { k: 'down', label: 'Deposit', def: 4000, min: 0, step: 250 },
        { k: 'trade', label: 'Trade-in value', def: 0, min: 0, step: 250 },
        { k: 'rate', label: 'Interest rate (% a year)', def: 7.4, min: 0, max: 40, step: 0.01 },
        { k: 'months', label: 'Term (months)', def: 60, min: 6, max: 120, step: 6 },
        { k: 'salestax', label: 'Sales tax (%)', def: 0, min: 0, max: 30, step: 0.1, hint: 'Set to 0 if not applicable' },
        CUR
      ],
      compute: function (v, M) {
        var taxable = Math.max(0, v.price - v.trade);
        var tax = taxable * v.salestax / 100;
        var P = Math.max(0, v.price + tax - v.down - v.trade);
        var r = v.rate / 100 / 12;
        var a = M.amortise(P, r, v.months);
        return {
          headline: { label: 'Monthly payment', value: F.money2(a.payment, v.cur) },
          stats: [
            { label: 'Amount financed', value: F.money(P, v.cur) },
            { label: 'Total interest', value: F.money(a.totalInterest, v.cur) },
            { label: 'Sales tax', value: F.money(tax, v.cur) },
            { label: 'Total cost', value: F.money(v.down + v.trade + a.totalPaid, v.cur) }
          ],
          note: 'A longer term lowers the monthly payment but increases total interest — compare 48, 60 and 72 months before signing.'
        };
      }
    },

    /* ---------- refinance break-even ---------- */
    'refinance-calculator': {
      fields: [
        { k: 'balance', label: 'Current balance', def: 260000, min: 0, step: 1000 },
        { k: 'oldRate', label: 'Current rate (%)', def: 7.2, min: 0, max: 30, step: 0.01 },
        { k: 'oldYears', label: 'Years left on current loan', def: 26, min: 1, max: 50, step: 1 },
        { k: 'newRate', label: 'New rate (%)', def: 5.9, min: 0, max: 30, step: 0.01 },
        { k: 'newYears', label: 'New term (years)', def: 30, min: 1, max: 50, step: 1 },
        { k: 'costs', label: 'Refinancing costs', def: 4500, min: 0, step: 100 },
        CUR
      ],
      compute: function (v, M) {
        var oldPay = M.payment(v.balance, v.oldRate / 100 / 12, v.oldYears * 12);
        var newPay = M.payment(v.balance + 0, v.newRate / 100 / 12, v.newYears * 12);
        var saving = oldPay - newPay;
        var breakEven = saving > 0 ? v.costs / saving : Infinity;
        var oldTotal = oldPay * v.oldYears * 12;
        var newTotal = newPay * v.newYears * 12 + v.costs;
        return {
          headline: {
            label: saving > 0 ? 'You break even after' : 'No monthly saving',
            value: saving > 0 ? F.months(breakEven) : '—',
            sub: saving > 0 ? 'Saving ' + F.money2(saving, v.cur) + ' a month' : 'The new payment is higher than the current one'
          },
          stats: [
            { label: 'Current payment', value: F.money2(oldPay, v.cur) },
            { label: 'New payment', value: F.money2(newPay, v.cur) },
            { label: 'Lifetime cost now', value: F.money(oldTotal, v.cur) },
            { label: 'Lifetime cost after', value: F.money(newTotal, v.cur) }
          ],
          note: newTotal > oldTotal
            ? 'Careful: the monthly payment falls, but extending the term means you pay <strong>more</strong> overall. Compare lifetime cost, not just the monthly figure.'
            : 'Refinancing looks cheaper both monthly and over the life of the loan — assuming you stay past the break-even point.'
        };
      }
    },

    /* ---------- credit card payoff ---------- */
    'credit-card-payoff': {
      fields: [
        { k: 'balance', label: 'Balance owed', def: 6000, min: 0, step: 100 },
        { k: 'apr', label: 'APR (%)', def: 22.9, min: 0, max: 100, step: 0.1 },
        { k: 'pay', label: 'Monthly payment', def: 250, min: 1, step: 10 },
        { k: 'extra', label: 'Extra per month', def: 50, min: 0, step: 10 },
        CUR
      ],
      compute: function (v, M) {
        var r = v.apr / 100 / 12;
        var base = M.payoffPeriods(v.balance, r, v.pay);
        var boosted = M.payoffPeriods(v.balance, r, v.pay + v.extra);
        function interestFor(pay, n) {
          if (!isFinite(n)) return Infinity;
          var bal = v.balance, tot = 0;
          for (var i = 0; i < n && bal > 0; i++) { var int = bal * r; tot += int; bal = bal + int - pay; }
          return tot;
        }
        var i1 = interestFor(v.pay, base), i2 = interestFor(v.pay + v.extra, boosted);
        return {
          headline: {
            label: 'Debt free in', value: F.months(base),
            sub: isFinite(base) ? 'Paying ' + F.money2(v.pay, v.cur) + ' a month' : 'Your payment doesn’t cover the monthly interest'
          },
          stats: [
            { label: 'Interest you’ll pay', value: isFinite(i1) ? F.money(i1, v.cur) : '—' },
            { label: 'With extra ' + F.money2(v.extra, v.cur), value: F.months(boosted) },
            { label: 'Interest saved', value: (isFinite(i1) && isFinite(i2)) ? F.money(i1 - i2, v.cur) : '—' },
            { label: 'Time saved', value: (isFinite(base) && isFinite(boosted)) ? F.months(base - boosted) : '—' }
          ],
          note: !isFinite(base)
            ? 'At this payment the balance never clears — the interest is larger than what you pay each month. Increase the payment above ' + F.money2(v.balance * r, v.cur) + '.'
            : 'Assumes the rate stays fixed and you add no new spending to the card.'
        };
      }
    },

    /* ---------- rent vs buy ---------- */
    'rent-vs-buy': {
      fields: [
        { k: 'price', label: 'Property price', def: 350000, min: 0, step: 1000 },
        { k: 'down', label: 'Deposit', def: 70000, min: 0, step: 1000 },
        { k: 'rate', label: 'Mortgage rate (%)', def: 6.5, min: 0, max: 30, step: 0.01 },
        { k: 'rent', label: 'Monthly rent', def: 1800, min: 0, step: 50 },
        { k: 'years', label: 'Years you’ll stay', def: 5, min: 1, max: 40, step: 1 },
        { k: 'grow', label: 'Property growth (% a year)', def: 3, min: -10, max: 20, step: 0.1 },
        { k: 'costs', label: 'Owning costs (% of value a year)', def: 1.8, min: 0, max: 10, step: 0.1, hint: 'Tax, insurance, maintenance' },
        CUR
      ],
      compute: function (v, M) {
        var P = Math.max(0, v.price - v.down), r = v.rate / 100 / 12, n = 30 * 12;
        var a = M.amortise(P, r, n);
        var months = v.years * 12;
        var interestPaid = a.rows.slice(0, months).reduce(function (s, x) { return s + x.interest; }, 0);
        var balance = months < a.rows.length ? a.rows[months - 1].balance : 0;
        var owningCosts = v.price * (v.costs / 100) * v.years;
        var futureValue = v.price * Math.pow(1 + v.grow / 100, v.years);
        var sellCosts = futureValue * 0.03;
        var equity = futureValue - balance - sellCosts;
        var buyNetCost = v.down + interestPaid + owningCosts + (a.payment * months - interestPaid) - (equity - v.down) - v.down;
        // simpler: total cash out minus equity gained
        var cashOut = v.down + a.payment * months + owningCosts;
        var buyNet = cashOut - equity;
        var rentTotal = v.rent * months;
        var better = buyNet < rentTotal;
        return {
          headline: {
            label: better ? 'Buying looks better by' : 'Renting looks better by',
            value: F.money(Math.abs(rentTotal - buyNet), v.cur),
            sub: 'over ' + v.years + ' year' + (v.years > 1 ? 's' : '')
          },
          stats: [
            { label: 'Net cost of buying', value: F.money(buyNet, v.cur) },
            { label: 'Total rent paid', value: F.money(rentTotal, v.cur) },
            { label: 'Equity at the end', value: F.money(equity, v.cur) },
            { label: 'Mortgage interest', value: F.money(interestPaid, v.cur) }
          ],
          note: 'Buying costs assume a 30-year mortgage and 3% selling fees. It ignores rent rises and what you might earn investing the deposit instead — treat it as a directional answer, not a forecast.'
        };
      }
    },

    /* ---------- cap rate ---------- */
    'cap-rate': {
      fields: [
        { k: 'value', label: 'Property value', def: 300000, min: 1, step: 1000 },
        { k: 'rent', label: 'Monthly rent', def: 2200, min: 0, step: 50 },
        { k: 'vacancy', label: 'Vacancy (%)', def: 5, min: 0, max: 100, step: 0.5 },
        { k: 'expenses', label: 'Yearly operating expenses', def: 7000, min: 0, step: 250, hint: 'Excluding mortgage payments' },
        CUR
      ],
      compute: function (v) {
        var gross = v.rent * 12;
        var effective = gross * (1 - v.vacancy / 100);
        var noi = effective - v.expenses;
        var cap = noi / v.value;
        return {
          headline: { label: 'Cap rate', value: (cap * 100).toFixed(2) + '%',
            sub: 'Net operating income ' + F.money(noi, v.cur) + ' a year' },
          stats: [
            { label: 'Gross rent', value: F.money(gross, v.cur) },
            { label: 'After vacancy', value: F.money(effective, v.cur) },
            { label: 'Operating expenses', value: F.money(v.expenses, v.cur) },
            { label: 'Gross yield', value: (gross / v.value * 100).toFixed(2) + '%' }
          ],
          note: 'Cap rate deliberately ignores financing so you can compare properties like for like. It is not a return on your cash — use cash-on-cash for that.'
        };
      }
    },

    /* ---------- home affordability ---------- */
    'home-affordability': {
      fields: [
        { k: 'income', label: 'Household income (a year)', def: 90000, min: 0, step: 1000 },
        { k: 'debts', label: 'Other monthly debt payments', def: 400, min: 0, step: 50 },
        { k: 'down', label: 'Deposit available', def: 60000, min: 0, step: 1000 },
        { k: 'rate', label: 'Mortgage rate (%)', def: 6.5, min: 0.01, max: 30, step: 0.01 },
        { k: 'years', label: 'Term (years)', def: 30, min: 5, max: 40, step: 1 },
        { k: 'dti', label: 'Max debt-to-income (%)', def: 36, min: 10, max: 60, step: 1, hint: 'Lenders commonly use 36–43%' },
        CUR
      ],
      compute: function (v, M) {
        var monthlyIncome = v.income / 12;
        var budget = monthlyIncome * (v.dti / 100) - v.debts;
        if (budget <= 0) {
          return { headline: { label: 'Affordable price', value: '—', sub: 'Existing debts already use the whole budget' },
            note: 'Your listed debt payments exceed the debt-to-income allowance, so there is no room for a mortgage payment at these settings.' };
        }
        // reserve ~20% of the housing budget for tax + insurance
        var loanBudget = budget * 0.8;
        var r = v.rate / 100 / 12, n = v.years * 12;
        var maxLoan = r === 0 ? loanBudget * n : loanBudget * (1 - Math.pow(1 + r, -n)) / r;
        var price = maxLoan + v.down;
        return {
          headline: { label: 'You could afford about', value: F.money(price, v.cur),
            sub: 'with a ' + F.money(v.down, v.cur) + ' deposit' },
          stats: [
            { label: 'Max monthly housing', value: F.money2(budget, v.cur) },
            { label: 'Loan you could take', value: F.money(maxLoan, v.cur) },
            { label: 'Est. loan payment', value: F.money2(loanBudget, v.cur) },
            { label: 'Left for tax &amp; insurance', value: F.money2(budget - loanBudget, v.cur) }
          ],
          note: 'A guide, not a mortgage offer. Lenders also weigh credit history, employment and their own stress tests.'
        };
      }
    }
  };

  root.VKMoneyTools = TOOLS;
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
