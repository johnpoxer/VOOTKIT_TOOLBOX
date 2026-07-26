/* tools-mathdate.js — date, time, math and equation tools. All on-device.
 * The math solver is a real recursive-descent parser (no eval). evalExpr and
 * solveQuad are pure and unit-tested in Node. */
(function (root) {
  'use strict';

  /* ---------- pure: safe expression evaluator ---------- */
  function tokenize(s) {
    var toks = [], i = 0, n = s.length;
    while (i < n) {
      var c = s[i];
      if (c === ' ' || c === '\t') { i++; continue; }
      if (c >= '0' && c <= '9' || c === '.') { var num = ''; while (i < n && (s[i] >= '0' && s[i] <= '9' || s[i] === '.')) num += s[i++]; toks.push({ t: 'num', v: parseFloat(num) }); continue; }
      if ('+-*/^%()'.indexOf(c) >= 0) { toks.push({ t: 'op', v: c }); i++; continue; }
      throw new Error('Unexpected character “' + c + '”.');
    }
    return toks;
  }
  function evalExpr(str) {
    if (!String(str).trim()) return null;
    var toks = tokenize(str), pos = 0;
    function peek() { return toks[pos]; }
    function next() { return toks[pos++]; }
    function expr() { var x = term(); while (peek() && (peek().v === '+' || peek().v === '-')) { var op = next().v; var y = term(); x = op === '+' ? x + y : x - y; } return x; }
    function term() { var x = power(); while (peek() && (peek().v === '*' || peek().v === '/' || peek().v === '%')) { var op = next().v; var y = power(); x = op === '*' ? x * y : op === '/' ? x / y : x % y; } return x; }
    function power() { var x = unary(); if (peek() && peek().v === '^') { next(); var y = power(); x = Math.pow(x, y); } return x; }
    function unary() { if (peek() && (peek().v === '-' || peek().v === '+')) { var op = next().v; var x = unary(); return op === '-' ? -x : x; } return primary(); }
    function primary() { var t = next(); if (!t) throw new Error('Unexpected end of expression.'); if (t.t === 'num') return t.v; if (t.v === '(') { var x = expr(); var cl = next(); if (!cl || cl.v !== ')') throw new Error('Missing closing bracket.'); return x; } throw new Error('Unexpected “' + t.v + '”.'); }
    var r = expr();
    if (pos < toks.length) throw new Error('Unexpected “' + peek().v + '”.');
    return r;
  }

  /* ---------- pure: quadratic / linear solver ---------- */
  function solveQuad(a, b, c) {
    if (a === 0) {
      if (b === 0) return { type: c === 0 ? 'infinite' : 'none' };
      return { type: 'linear', roots: [-c / b] };
    }
    var disc = b * b - 4 * a * c;
    if (disc > 0) { var s = Math.sqrt(disc); return { type: 'two', disc: disc, roots: [(-b + s) / (2 * a), (-b - s) / (2 * a)] }; }
    if (disc === 0) return { type: 'one', disc: 0, roots: [-b / (2 * a)] };
    return { type: 'complex', disc: disc, re: -b / (2 * a), im: Math.sqrt(-disc) / (2 * a) };
  }

  function fld(W, l, n) { return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: l }), n]); }
  function stat(W, l, v) { return W.el('div', { class: 'calc-stat' }, [W.el('span', { text: l }), W.el('b', { text: String(v) })]); }
  function num(x) { return (Math.round(x * 1e6) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 6 }); }

  var T = {

    'math-solver': function (host, W) {
      var inpEl = W.el('input', { class: 'field wmono', type: 'text', placeholder: 'e.g. (12 + 5) * 3 ^ 2 / 4', 'aria-label': 'Expression' }); inpEl.value = '(12 + 5) * 3 ^ 2 / 4';
      var res = W.el('div', { class: 'calc-headline' }, [W.el('span', { class: 'ch-label', text: 'Result' }), W.el('b', { text: '—', style: 'font-size:1.6rem' })]);
      var err = W.el('p', { class: 'note err', hidden: 'hidden', role: 'alert' });
      function run() { try { var r = evalExpr(inpEl.value); res.querySelector('b').textContent = r == null ? '—' : num(r); err.hidden = true; } catch (e) { err.hidden = false; err.textContent = e.message; } }
      inpEl.addEventListener('input', W.debounce(run, 120));
      host.appendChild(fld(W, 'Expression', inpEl)); host.appendChild(err); host.appendChild(res);
      host.appendChild(W.el('p', { class: 'note', text: 'Supports + − × ÷, powers (^), remainder (%), brackets and decimals. Evaluated by a parser in your browser — not eval — so it is safe and offline.' }));
      run();
    },

    'equation-solver': function (host, W) {
      var a = W.el('input', { class: 'field', type: 'number', value: '1', step: 'any', 'aria-label': 'a' });
      var b = W.el('input', { class: 'field', type: 'number', value: '-3', step: 'any', 'aria-label': 'b' });
      var c = W.el('input', { class: 'field', type: 'number', value: '2', step: 'any', 'aria-label': 'c' });
      var out = W.el('div', { class: 'calc-stats' });
      function run() {
        var r = solveQuad(+a.value || 0, +b.value || 0, +c.value || 0);
        out.innerHTML = '';
        if (r.type === 'infinite') out.appendChild(stat(W, 'Solutions', 'Every number (0 = 0)'));
        else if (r.type === 'none') out.appendChild(stat(W, 'Solutions', 'No solution'));
        else if (r.type === 'linear') out.appendChild(stat(W, 'x', num(r.roots[0])));
        else if (r.type === 'one') { out.appendChild(stat(W, 'x (double root)', num(r.roots[0]))); out.appendChild(stat(W, 'Discriminant', '0')); }
        else if (r.type === 'two') { out.appendChild(stat(W, 'x₁', num(r.roots[0]))); out.appendChild(stat(W, 'x₂', num(r.roots[1]))); out.appendChild(stat(W, 'Discriminant', num(r.disc))); }
        else { out.appendChild(stat(W, 'x₁', num(r.re) + ' + ' + num(r.im) + 'i')); out.appendChild(stat(W, 'x₂', num(r.re) + ' − ' + num(r.im) + 'i')); out.appendChild(stat(W, 'Discriminant', num(r.disc))); }
      }
      [a, b, c].forEach(function (x) { x.addEventListener('input', run); });
      host.appendChild(W.el('p', { class: 'wlab', text: 'Solve a·x² + b·x + c = 0 (set a = 0 for a linear equation)' }));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'a', a), fld(W, 'b', b), fld(W, 'c', c)]));
      host.appendChild(out);
      host.appendChild(W.el('p', { class: 'note', text: 'Solves linear and quadratic equations, including complex roots. Uses the quadratic formula locally.' }));
      run();
    },

    'date-calculator': function (host, W) {
      // difference
      var d1 = W.el('input', { class: 'field', type: 'date', 'aria-label': 'From date' });
      var d2 = W.el('input', { class: 'field', type: 'date', 'aria-label': 'To date' });
      var today = new Date(); d1.value = today.toISOString().slice(0, 10);
      var later = new Date(today.getTime() + 30 * 86400000); d2.value = later.toISOString().slice(0, 10);
      var diffOut = W.el('div', { class: 'calc-stats' });
      function diff() {
        diffOut.innerHTML = '';
        var a = new Date(d1.value), b = new Date(d2.value);
        if (isNaN(a) || isNaN(b)) return;
        var days = Math.round((b - a) / 86400000);
        var months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
        diffOut.appendChild(stat(W, 'Days', days.toLocaleString()));
        diffOut.appendChild(stat(W, 'Weeks', (Math.round(days / 7 * 10) / 10)));
        diffOut.appendChild(stat(W, 'Months (approx)', months));
        diffOut.appendChild(stat(W, 'Years (approx)', (Math.round(days / 365.25 * 10) / 10)));
      }
      // add / subtract
      var base = W.el('input', { class: 'field', type: 'date', 'aria-label': 'Start date' }); base.value = today.toISOString().slice(0, 10);
      var amt = W.el('input', { class: 'field', type: 'number', value: '30', 'aria-label': 'Amount' });
      var unit = W.el('select', { class: 'field', 'aria-label': 'Unit' }, [['d', 'days'], ['w', 'weeks'], ['m', 'months'], ['y', 'years']].map(function (o) { return W.el('option', { value: o[0], text: o[1] }); }));
      var dir = W.el('select', { class: 'field', 'aria-label': 'Direction' }, [['1', 'after (+)'], ['-1', 'before (−)']].map(function (o) { return W.el('option', { value: o[0], text: o[1] }); }));
      var addOut = W.el('div', { class: 'calc-headline' }, [W.el('span', { class: 'ch-label', text: 'Result date' }), W.el('b', { text: '—' })]);
      function addSub() {
        var dt = new Date(base.value); if (isNaN(dt)) return;
        var k = (+amt.value || 0) * (+dir.value);
        if (unit.value === 'd') dt.setDate(dt.getDate() + k);
        else if (unit.value === 'w') dt.setDate(dt.getDate() + k * 7);
        else if (unit.value === 'm') dt.setMonth(dt.getMonth() + k);
        else dt.setFullYear(dt.getFullYear() + k);
        addOut.querySelector('b').textContent = dt.toDateString();
      }
      [d1, d2].forEach(function (x) { x.addEventListener('input', diff); });
      [base, amt, unit, dir].forEach(function (x) { x.addEventListener('input', addSub); });
      host.appendChild(W.el('p', { class: 'wlab', text: 'Days between two dates' }));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'From', d1), fld(W, 'To', d2)]));
      host.appendChild(diffOut);
      host.appendChild(W.el('p', { class: 'wlab', text: 'Add or subtract from a date' }));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Start', base), fld(W, 'Amount', amt), fld(W, 'Unit', unit), fld(W, 'Direction', dir)]));
      host.appendChild(addOut);
      host.appendChild(W.el('p', { class: 'note', text: 'Month and year differences use calendar months; day counts are exact.' }));
      diff(); addSub();
    },

    'time-calculator': function (host, W) {
      function trio(labelH) { return { h: W.el('input', { class: 'field', type: 'number', value: '0', min: '0', 'aria-label': labelH + ' hours' }), m: W.el('input', { class: 'field', type: 'number', value: '0', min: '0', 'aria-label': labelH + ' minutes' }), s: W.el('input', { class: 'field', type: 'number', value: '0', min: '0', 'aria-label': labelH + ' seconds' }) }; }
      var A = trio('A'), B = trio('B'); A.h.value = '2'; A.m.value = '30'; B.h.value = '1'; B.m.value = '45';
      var op = W.el('select', { class: 'field', 'aria-label': 'Operation' }, [['+', 'add (+)'], ['-', 'subtract (−)']].map(function (o) { return W.el('option', { value: o[0], text: o[1] }); }));
      var out = W.el('div', { class: 'calc-headline' }, [W.el('span', { class: 'ch-label', text: 'Result' }), W.el('b', { text: '—', style: 'font-size:1.5rem' })]);
      var extra = W.el('div', { class: 'calc-stats' });
      function secs(t) { return (+t.h.value || 0) * 3600 + (+t.m.value || 0) * 60 + (+t.s.value || 0); }
      function fmt(tot) { var sign = tot < 0 ? '−' : ''; tot = Math.abs(tot); var h = (tot / 3600) | 0, m = ((tot % 3600) / 60) | 0, s = tot % 60; return sign + h + ':' + ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2); }
      function run() {
        var tot = op.value === '+' ? secs(A) + secs(B) : secs(A) - secs(B);
        out.querySelector('b').textContent = fmt(tot);
        extra.innerHTML = '';
        extra.appendChild(stat(W, 'Total minutes', num(tot / 60)));
        extra.appendChild(stat(W, 'Total seconds', tot));
        extra.appendChild(stat(W, 'Decimal hours', num(tot / 3600)));
      }
      [A.h, A.m, A.s, B.h, B.m, B.s, op].forEach(function (x) { x.addEventListener('input', run); });
      host.appendChild(W.el('p', { class: 'wlab', text: 'Duration A (h : m : s)' }));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Hours', A.h), fld(W, 'Minutes', A.m), fld(W, 'Seconds', A.s)]));
      host.appendChild(fld(W, 'Operation', op));
      host.appendChild(W.el('p', { class: 'wlab', text: 'Duration B (h : m : s)' }));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Hours', B.h), fld(W, 'Minutes', B.m), fld(W, 'Seconds', B.s)]));
      host.appendChild(out); host.appendChild(extra);
      host.appendChild(W.el('p', { class: 'note', text: 'Add or subtract two durations and see the total in minutes, seconds and decimal hours.' }));
      run();
    }

  };

  root.VKMathDate = { evalExpr: evalExpr, solveQuad: solveQuad };
  if (typeof module === 'object' && module.exports) module.exports = root.VKMathDate;
  if (typeof root.VKW !== 'undefined') {
    Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); }
  }
})(typeof window !== 'undefined' ? window : globalThis);
