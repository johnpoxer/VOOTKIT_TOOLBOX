/* calc.js — Vootkit calculator engine.
 * Declarative: each tool declares fields + a compute(). The engine renders the
 * form, recomputes live, formats output and handles a11y. All maths is local.
 *
 * Financial functions are the standard closed forms; every one is unit-tested
 * in test/calc.test.js against independently computed values.
 */
(function (root) {
  'use strict';

  /* ---------- money maths ---------- */
  var M = {
    /* Level payment on an amortising loan.
       P principal, r periodic rate (decimal), n periods */
    payment: function (P, r, n) {
      if (!(P > 0) || !(n > 0)) return 0;
      if (r === 0) return P / n;
      return P * r / (1 - Math.pow(1 + r, -n));
    },
    /* Full amortisation schedule + totals */
    amortise: function (P, r, n) {
      var pay = M.payment(P, r, n), bal = P, totalInterest = 0, rows = [];
      for (var i = 1; i <= n; i++) {
        var interest = bal * r;
        var principal = pay - interest;
        if (i === n) { principal = bal; pay = principal + interest; } // clear rounding on final row
        bal = Math.max(0, bal - principal);
        totalInterest += interest;
        rows.push({ n: i, payment: pay, principal: principal, interest: interest, balance: bal });
      }
      return { payment: M.payment(P, r, n), rows: rows, totalInterest: totalInterest, totalPaid: P + totalInterest };
    },
    /* Months to clear a balance paying `pay` per period. Infinity if payment
       never covers the interest. */
    payoffPeriods: function (bal, r, pay) {
      if (!(bal > 0)) return 0;
      if (r === 0) return Math.ceil(bal / pay);
      if (pay <= bal * r) return Infinity;           // interest outruns payment
      return Math.ceil(-Math.log(1 - (bal * r) / pay) / Math.log(1 + r));
    },
    /* Future value with regular contributions at period end */
    futureValue: function (pv, pmt, r, n) {
      if (r === 0) return pv + pmt * n;
      var growth = Math.pow(1 + r, n);
      return pv * growth + pmt * (growth - 1) / r;
    }
  };

  /* ---------- formatting ---------- */
  function money(v, cur) {
    if (!isFinite(v)) return '—';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur || 'USD', maximumFractionDigits: 0 }).format(v);
    } catch (e) { return '$' + Math.round(v).toLocaleString(); }
  }
  function money2(v, cur) {
    if (!isFinite(v)) return '—';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur || 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
    } catch (e) { return '$' + v.toFixed(2); }
  }
  function pct(v) { return (v * 100).toFixed(2).replace(/\.00$/, '') + '%'; }
  function months(m) {
    if (!isFinite(m)) return 'never at this payment';
    var y = Math.floor(m / 12), r = Math.round(m % 12);
    if (y && r) return y + 'y ' + r + 'm';
    if (y) return y + ' year' + (y > 1 ? 's' : '');
    return r + ' month' + (r === 1 ? '' : 's');
  }

  /* ---------- engine ---------- */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  function mount(host, spec) {
    if (!host) return;
    host.innerHTML = '';
    host.classList.add('calc');

    var form = el('form', { class: 'calc-form', novalidate: 'novalidate' });
    var inputs = {};

    spec.fields.forEach(function (f) {
      var id = 'f-' + f.k;
      var wrap = el('div', { class: 'calc-field' + (f.wide ? ' is-wide' : '') });
      wrap.appendChild(el('label', { for: id, text: f.label }));

      var input;
      if (f.type === 'select') {
        input = el('select', { id: id, class: 'field' });
        f.options.forEach(function (o) {
          input.appendChild(el('option', { value: String(o.v), text: o.label }));
        });
      } else {
        input = el('input', {
          id: id, class: 'field', type: 'number', inputmode: 'decimal',
          value: String(f.def), step: String(f.step || 'any')
        });
        if (f.min != null) input.setAttribute('min', String(f.min));
        if (f.max != null) input.setAttribute('max', String(f.max));
      }
      if (f.hint) {
        input.setAttribute('aria-describedby', id + '-h');
        wrap.appendChild(input);
        wrap.appendChild(el('small', { id: id + '-h', class: 'calc-hint', text: f.hint }));
      } else {
        wrap.appendChild(input);
      }
      inputs[f.k] = input;
      form.appendChild(wrap);
    });

    var out = el('div', { class: 'calc-out', role: 'status', 'aria-live': 'polite' });
    var extra = el('div', { class: 'calc-extra' });
    var errBox = el('p', { class: 'note err', hidden: 'hidden' });

    host.appendChild(form);
    host.appendChild(errBox);
    host.appendChild(out);
    host.appendChild(extra);

    function readValues() {
      var v = {};
      spec.fields.forEach(function (f) {
        var raw = inputs[f.k].value;
        v[f.k] = f.type === 'select' ? (isNaN(+raw) ? raw : +raw) : parseFloat(raw);
      });
      return v;
    }

    function run() {
      var v = readValues();
      // validation
      var problem = null;
      spec.fields.forEach(function (f) {
        if (f.type === 'select') return;
        if (!isFinite(v[f.k])) problem = problem || 'Enter a value for ' + f.label.toLowerCase() + '.';
        else if (f.min != null && v[f.k] < f.min) problem = problem || f.label + ' can’t be below ' + f.min + '.';
        else if (f.max != null && v[f.k] > f.max) problem = problem || f.label + ' looks too high.';
      });
      if (problem) {
        errBox.textContent = problem; errBox.hidden = false;
        out.innerHTML = ''; extra.innerHTML = '';
        return;
      }
      errBox.hidden = true;

      var r;
      try { r = spec.compute(v, M); }
      catch (e) {
        // A calculator that silently refuses to compute looks like a broken tool
        // to the user and like nothing at all to us. Report it.
        var G = typeof window !== 'undefined' ? window : globalThis;
        if (G.VKErr) G.VKErr.report(host.getAttribute('data-tool'), e, { type: 'ComputeError' });
        errBox.textContent = 'Could not calculate with those numbers.'; errBox.hidden = false; return;
      }
      if (!r) { out.innerHTML = ''; extra.innerHTML = ''; return; }

      out.innerHTML =
        '<div class="calc-headline"><span class="calc-label">' + r.headline.label + '</span>' +
        '<strong class="calc-value">' + r.headline.value + '</strong>' +
        (r.headline.sub ? '<span class="calc-sub">' + r.headline.sub + '</span>' : '') + '</div>' +
        (r.stats && r.stats.length
          ? '<div class="calc-stats">' + r.stats.map(function (s) {
              return '<div class="calc-stat"><span>' + s.label + '</span><b>' + s.value + '</b></div>';
            }).join('') + '</div>'
          : '');

      extra.innerHTML = r.note ? '<p class="note">' + r.note + '</p>' : '';
      if (r.table) {
        extra.innerHTML += '<details class="calc-table"><summary>' + r.table.summary + '</summary>' +
          '<div class="calc-scroll"><table><thead><tr>' +
          r.table.head.map(function (h) { return '<th scope="col">' + h + '</th>'; }).join('') +
          '</tr></thead><tbody>' +
          r.table.rows.map(function (row) {
            return '<tr>' + row.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table></div></details>';
      }
    }

    form.addEventListener('input', run);
    form.addEventListener('change', run);
    form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
    run();
  }

  root.VKCalc = { mount: mount, M: M, fmt: { money: money, money2: money2, pct: pct, months: months } };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module === 'object' && module.exports) {
  module.exports = (typeof window !== 'undefined' ? window : globalThis).VKCalc;
}
