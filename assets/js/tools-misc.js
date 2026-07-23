/* tools-misc.js — salary-converter, typing-test, brb-overlay. On-device.
 * salaryConvert is pure + unit-tested. */
(function (root) {
  'use strict';

  /* Convert a pay figure across periods. base = { amount, per } where per is
     one of hour/day/week/month/year; hoursPerWeek + weeksPerYear define the year. */
  function salaryConvert(amount, per, hoursPerWeek, weeksPerYear) {
    amount = +amount || 0; hoursPerWeek = +hoursPerWeek || 40; weeksPerYear = +weeksPerYear || 52;
    var hoursPerYear = hoursPerWeek * weeksPerYear;
    var annual;                          // day rate assumes a 5-day week
    switch (per) {
      case 'hour': annual = amount * hoursPerYear; break;
      case 'day': annual = amount * 5 * weeksPerYear; break;
      case 'week': annual = amount * weeksPerYear; break;
      case 'month': annual = amount * 12; break;
      case 'year': default: annual = amount; break;
    }
    return {
      hour: hoursPerYear ? annual / hoursPerYear : 0,
      day: (5 * weeksPerYear) ? annual / (5 * weeksPerYear) : 0,
      week: weeksPerYear ? annual / weeksPerYear : 0,
      month: annual / 12,
      year: annual
    };
  }

  var SAMPLES = [
    'The quick brown fox jumps over the lazy dog while the sun sets slowly behind the quiet hills.',
    'Practice makes progress, not perfection, so keep your hands moving and your eyes on the next word.',
    'A journey of a thousand miles begins with a single step, and every expert was once a beginner.',
    'Good tools get out of your way and let you focus on the work that actually matters to you.'
  ];

  function fld(W, l, n) { return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: l }), n]); }
  function stat(W, l, v) { return W.el('div', { class: 'calc-stat' }, [W.el('span', { text: l }), W.el('b', { text: String(v) })]); }
  function money(n) { return n.toLocaleString(undefined, { maximumFractionDigits: 2 }); }

  var T = {

    'salary-converter': function (host, W) {
      var amount = W.el('input', { class: 'field', type: 'number', value: '30', min: '0', step: 'any', 'aria-label': 'Amount' });
      var per = W.el('select', { class: 'field' }); [['hour', 'per hour'], ['day', 'per day'], ['week', 'per week'], ['month', 'per month'], ['year', 'per year']].forEach(function (o) { per.appendChild(W.el('option', { value: o[0], text: o[1] })); });
      var hpw = W.el('input', { class: 'field', type: 'number', value: '40', min: '1', max: '168', 'aria-label': 'Hours per week' });
      var wpy = W.el('input', { class: 'field', type: 'number', value: '52', min: '1', max: '52', 'aria-label': 'Weeks per year' });
      var out = W.el('div', { class: 'calc-stats' });
      function run() {
        var r = salaryConvert(amount.value, per.value, hpw.value, wpy.value);
        out.innerHTML = '';
        [['Hourly', money(r.hour)], ['Daily', money(r.day)], ['Weekly', money(r.week)], ['Monthly', money(r.month)], ['Annual', money(r.year)]].forEach(function (p) { out.appendChild(stat(W, p[0], p[1])); });
      }
      [amount, per, hpw, wpy].forEach(function (x) { x.addEventListener('input', run); });
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Amount', amount), fld(W, 'Period', per), fld(W, 'Hours / week', hpw), fld(W, 'Weeks / year', wpy)]));
      host.appendChild(out);
      host.appendChild(W.el('p', { class: 'note', text: 'Gross figures only — before tax, pension or benefits. Day rate assumes a 5-day week.' })); run();
    },

    'typing-test': function (host, W) {
      var sample = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
      var target = W.el('p', { class: 'wtype-target' });
      var input = W.el('textarea', { class: 'field wtext', rows: '4', placeholder: 'Start typing here…', spellcheck: 'false', autocomplete: 'off' });
      var stats = W.el('div', { class: 'calc-stats' });
      var start = 0, done = false;
      function paint() {
        var typed = input.value;
        var html = '';
        for (var i = 0; i < sample.length; i++) {
          var cls = i < typed.length ? (typed[i] === sample[i] ? 'ok' : 'bad') : (i === typed.length ? 'cur' : '');
          html += '<span class="' + cls + '">' + (sample[i] === ' ' ? '&nbsp;' : W.escapeHtml(sample[i])) + '</span>';
        }
        target.innerHTML = html;
      }
      function update() {
        if (!start && input.value.length) start = Date.now();
        paint();
        var typed = input.value, elapsed = (Date.now() - start) / 1000;
        var correct = 0; for (var i = 0; i < typed.length; i++) if (typed[i] === sample[i]) correct++;
        var acc = typed.length ? Math.round(correct / typed.length * 100) : 100;
        var words = typed.length / 5, wpm = elapsed > 0 ? Math.round(words / (elapsed / 60)) : 0;
        stats.innerHTML = '';
        [['WPM', start ? wpm : 0], ['Accuracy', acc + '%'], ['Progress', Math.round(typed.length / sample.length * 100) + '%'], ['Time', (start ? elapsed : 0).toFixed(1) + 's']].forEach(function (p) { stats.appendChild(stat(W, p[0], p[1])); });
        if (!done && typed.length >= sample.length) { done = true; input.setAttribute('readonly', 'readonly'); }
      }
      input.addEventListener('input', update);
      function reset() { sample = SAMPLES[Math.floor(Math.random() * SAMPLES.length)]; input.value = ''; input.removeAttribute('readonly'); start = 0; done = false; paint(); update(); input.focus(); }
      host.appendChild(W.el('p', { class: 'wlab', text: 'Type this:' })); host.appendChild(target);
      host.appendChild(input); host.appendChild(stats);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn', type: 'button', text: 'New text', onClick: reset })]));
      paint(); update();
    },

    'brb-overlay': function (host, W) {
      var title = W.el('input', { class: 'field', type: 'text', value: 'BE RIGHT BACK', 'aria-label': 'Main text' });
      var sub = W.el('input', { class: 'field', type: 'text', value: 'Stream resumes shortly', 'aria-label': 'Subtitle' });
      var bg = W.el('input', { type: 'color', class: 'wcolor', value: '#0b1220' });
      var accent = W.el('input', { type: 'color', class: 'wcolor', value: '#2563eb' });
      var preview = W.el('iframe', { class: 'wbrb', title: 'Overlay preview' });
      function makeHtml() {
        return '<!doctype html><html><head><meta charset="utf-8"><style>' +
          'html,body{margin:0;height:100%;font-family:system-ui,Segoe UI,Arial,sans-serif;overflow:hidden}' +
          'body{background:' + bg.value + ';color:#fff;display:grid;place-items:center;text-align:center}' +
          '.wrap{display:flex;flex-direction:column;gap:18px;align-items:center}' +
          '.dot{width:16px;height:16px;border-radius:50%;background:' + accent.value + ';animation:p 1.4s ease-in-out infinite}' +
          'h1{font-size:8vw;margin:0;letter-spacing:.04em}p{font-size:2.4vw;margin:0;opacity:.75}' +
          '@keyframes p{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.3)}}' +
          '</style></head><body><div class="wrap"><div class="dot"></div><h1>' + esc(title.value) + '</h1><p>' + esc(sub.value) + '</p></div></body></html>';
      }
      function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
      function render() { preview.srcdoc = makeHtml(); }
      [title, sub, bg, accent].forEach(function (x) { x.addEventListener('input', render); });
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Main text', title), fld(W, 'Subtitle', sub), fld(W, 'Background', bg), fld(W, 'Accent', accent)]));
      host.appendChild(W.el('p', { class: 'wlab', text: 'Preview' })); host.appendChild(preview);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Download overlay.html', onClick: function () { W.download(makeHtml(), 'brb-overlay.html', 'text/html'); } })]));
      host.appendChild(W.el('p', { class: 'note', text: 'In OBS: add a Browser source → “Local file” → pick this HTML → set it to 1920×1080. Fully on your device.' })); render();
    }
  };

  root.VKMisc = { salaryConvert: salaryConvert };
  if (typeof module === 'object' && module.exports) module.exports = root.VKMisc;
  if (typeof root.VKW !== 'undefined') { Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); } }
})(typeof window !== 'undefined' ? window : globalThis);
