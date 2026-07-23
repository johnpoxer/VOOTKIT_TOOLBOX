/* tools-everyday.js — everyday utilities. Pure JS + Intl, on-device.
 * Exported logic (convertUnit, ageBetween) is unit-tested. Timers use
 * requestAnimationFrame / setInterval and clean up on pagehide. */
(function (root) {
  'use strict';

  /* ---------- unit conversion ---------- */
  // factor tables express "how many base units in one of this unit"
  var UNITS = {
    Length: { base: 'm', u: { 'mm': 0.001, 'cm': 0.01, 'm': 1, 'km': 1000, 'in': 0.0254, 'ft': 0.3048, 'yd': 0.9144, 'mi': 1609.344, 'nmi': 1852 } },
    Mass: { base: 'kg', u: { 'mg': 1e-6, 'g': 0.001, 'kg': 1, 't': 1000, 'oz': 0.0283495, 'lb': 0.453592, 'st': 6.35029 } },
    Area: { base: 'm²', u: { 'cm²': 0.0001, 'm²': 1, 'ha': 10000, 'km²': 1e6, 'ft²': 0.092903, 'ac': 4046.86 } },
    Volume: { base: 'L', u: { 'mL': 0.001, 'L': 1, 'm³': 1000, 'tsp': 0.00492892, 'tbsp': 0.0147868, 'cup': 0.24, 'pt': 0.473176, 'qt': 0.946353, 'gal': 3.78541 } },
    Speed: { base: 'm/s', u: { 'm/s': 1, 'km/h': 0.277778, 'mph': 0.44704, 'kn': 0.514444, 'ft/s': 0.3048 } },
    Data: { base: 'B', u: { 'B': 1, 'KB': 1024, 'MB': 1048576, 'GB': 1073741824, 'TB': 1.0995e12 } },
    Time: { base: 's', u: { 'ms': 0.001, 's': 1, 'min': 60, 'h': 3600, 'day': 86400, 'week': 604800 } }
  };
  function convertUnit(value, from, to, cat) {
    if (cat === 'Temperature') return convertTemp(value, from, to);
    var t = UNITS[cat]; if (!t || !(from in t.u) || !(to in t.u)) return NaN;
    return value * t.u[from] / t.u[to];
  }
  function convertTemp(v, from, to) {
    var c = from === 'C' ? v : from === 'F' ? (v - 32) * 5 / 9 : v - 273.15;   // to Celsius
    return to === 'C' ? c : to === 'F' ? c * 9 / 5 + 32 : c + 273.15;
  }

  /* ---------- age / date diff ---------- */
  function ageBetween(fromDate, toDate) {
    var a = new Date(fromDate), b = new Date(toDate);
    if (isNaN(a) || isNaN(b)) return null;
    if (b < a) { var t = a; a = b; b = t; }
    var y = b.getFullYear() - a.getFullYear();
    var m = b.getMonth() - a.getMonth();
    var d = b.getDate() - a.getDate();
    if (d < 0) { m--; d += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    var totalDays = Math.floor((b - a) / 86400000);
    return { years: y, months: m, days: d, totalDays: totalDays, totalWeeks: Math.floor(totalDays / 7), totalHours: totalDays * 24 };
  }

  /* ---------- shared UI bits ---------- */
  function fld(W, label, node) { return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: label }), node]); }
  function sel(W, opts, val) { var s = W.el('select', { class: 'field' }); opts.forEach(function (o) { s.appendChild(W.el('option', { value: o, text: o })); }); if (val) s.value = val; return s; }
  function stat(W, l, v) { return W.el('div', { class: 'calc-stat' }, [W.el('span', { text: l }), W.el('b', { text: String(v) })]); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hms(ms) { var s = Math.floor(ms / 1000); return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60); }

  var T = {

    'unit-converter': function (host, W) {
      var cats = Object.keys(UNITS).concat('Temperature');
      var cat = sel(W, cats, 'Length');
      var ulist = function (c) { return c === 'Temperature' ? ['C', 'F', 'K'] : Object.keys(UNITS[c].u); };
      var from = sel(W, ulist('Length')), to = sel(W, ulist('Length'), 'ft');
      var inp = W.el('input', { class: 'field', type: 'number', value: '1', 'aria-label': 'Value' });
      var out = W.el('div', { class: 'calc-headline' });
      function rebuild() {
        var c = cat.value, us = ulist(c);
        [from, to].forEach(function (s) { s.innerHTML = ''; us.forEach(function (u) { s.appendChild(W.el('option', { value: u, text: u })); }); });
        from.value = us[0]; to.value = us[1] || us[0]; calc();
      }
      function calc() {
        var r = convertUnit(parseFloat(inp.value), from.value, to.value, cat.value);
        out.innerHTML = '<span class="calc-label">' + (isFinite(parseFloat(inp.value)) ? inp.value : '?') + ' ' + from.value + ' =</span><strong class="calc-value">' +
          (isFinite(r) ? (Math.round(r * 1e6) / 1e6).toLocaleString() : '—') + ' ' + to.value + '</strong>';
      }
      cat.addEventListener('change', rebuild);
      [from, to, inp].forEach(function (x) { x.addEventListener('input', calc); });
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Category', cat), fld(W, 'Amount', inp)]));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'From', from), fld(W, 'To', to)]));
      host.appendChild(out); rebuild();
    },

    'age-calculator': function (host, W) {
      var a = W.el('input', { class: 'field', type: 'date', 'aria-label': 'From date' });
      var b = W.el('input', { class: 'field', type: 'date', 'aria-label': 'To date' });
      b.value = new Date().toISOString().slice(0, 10);
      var out = W.el('div', { class: 'calc-stats' });
      function calc() {
        out.innerHTML = ''; if (!a.value || !b.value) return;
        var r = ageBetween(a.value, b.value); if (!r) return;
        [['Age / gap', r.years + 'y ' + r.months + 'm ' + r.days + 'd'], ['Total days', r.totalDays.toLocaleString()],
         ['Total weeks', r.totalWeeks.toLocaleString()], ['Total hours', r.totalHours.toLocaleString()]]
          .forEach(function (p) { out.appendChild(stat(W, p[0], p[1])); });
      }
      [a, b].forEach(function (x) { x.addEventListener('input', calc); });
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Birth / start date', a), fld(W, 'End date', b)]));
      host.appendChild(out);
    },

    'countdown': function (host, W) {
      var when = W.el('input', { class: 'field', type: 'datetime-local', 'aria-label': 'Target date and time' });
      var d = new Date(Date.now() + 86400000); when.value = d.toISOString().slice(0, 16);
      var big = W.el('div', { class: 'calc-headline' });
      var iv;
      function tick() {
        var target = new Date(when.value).getTime();
        if (isNaN(target)) { big.innerHTML = '<span class="calc-label">Pick a date</span>'; return; }
        var diff = target - Date.now();
        if (diff <= 0) { big.innerHTML = '<strong class="calc-value">Time’s up 🎉</strong>'; return; }
        var days = Math.floor(diff / 86400000);
        big.innerHTML = '<span class="calc-label">Time remaining</span><strong class="calc-value">' + days + 'd ' + hms(diff % 86400000) + '</strong>';
      }
      when.addEventListener('input', tick);
      iv = setInterval(tick, 1000); tick();
      root.addEventListener('pagehide', function () { clearInterval(iv); });
      host.appendChild(fld(W, 'Count down to', when)); host.appendChild(big);
    },

    'pomodoro': function (host, W) {
      var workM = W.el('input', { class: 'field', type: 'number', value: '25', min: '1', max: '120', 'aria-label': 'Work minutes' });
      var breakM = W.el('input', { class: 'field', type: 'number', value: '5', min: '1', max: '60', 'aria-label': 'Break minutes' });
      var display = W.el('div', { class: 'calc-headline' });
      var mode = 'work', remaining = 25 * 60000, running = false, iv, endAt = 0;
      function paint() { display.innerHTML = '<span class="calc-label">' + (mode === 'work' ? 'Focus' : 'Break') + '</span><strong class="calc-value">' + hms(remaining) + '</strong>'; }
      function chime() { try { var a = new (root.AudioContext || root.webkitAudioContext)(); var o = a.createOscillator(); o.connect(a.destination); o.frequency.value = 660; o.start(); setTimeout(function () { o.stop(); a.close(); }, 400); } catch (e) {} }
      function loop() {
        remaining = Math.max(0, endAt - Date.now()); paint();
        if (remaining <= 0) { chime(); mode = mode === 'work' ? 'break' : 'work'; remaining = (mode === 'work' ? +workM.value : +breakM.value) * 60000; endAt = Date.now() + remaining; }
      }
      function start() { if (running) return; running = true; endAt = Date.now() + remaining; iv = setInterval(loop, 250); }
      function pause() { running = false; clearInterval(iv); }
      function reset() { pause(); mode = 'work'; remaining = (+workM.value || 25) * 60000; paint(); }
      var btns = W.el('div', { class: 'wbtns' }, [
        W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Start', onClick: start }),
        W.el('button', { class: 'btn', type: 'button', text: 'Pause', onClick: pause }),
        W.el('button', { class: 'btn', type: 'button', text: 'Reset', onClick: reset })
      ]);
      root.addEventListener('pagehide', pause);
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Focus (min)', workM), fld(W, 'Break (min)', breakM)]));
      host.appendChild(display); host.appendChild(btns); paint();
    },

    'stopwatch': function (host, W) {
      var display = W.el('div', { class: 'calc-headline' });
      var laps = W.el('div', { class: 'calc-stats' });
      var start = 0, elapsed = 0, running = false, raf, lapN = 0;
      function fmt(ms) { return hms(ms) + '.' + String(Math.floor(ms % 1000 / 10)).padStart(2, '0'); }
      function paint() { display.innerHTML = '<strong class="calc-value" style="font-variant-numeric:tabular-nums">' + fmt(elapsed) + '</strong>'; }
      function loop() { elapsed = Date.now() - start; paint(); if (running) raf = requestAnimationFrame(loop); }
      function go() { if (running) return; running = true; start = Date.now() - elapsed; loop(); }
      function stop() { running = false; cancelAnimationFrame(raf); }
      function reset() { stop(); elapsed = 0; lapN = 0; laps.innerHTML = ''; paint(); }
      function lap() { if (!running && elapsed === 0) return; laps.insertBefore(stat(W, 'Lap ' + (++lapN), fmt(elapsed)), laps.firstChild); }
      root.addEventListener('pagehide', stop);
      host.appendChild(display);
      host.appendChild(W.el('div', { class: 'wbtns' }, [
        W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Start', onClick: go }),
        W.el('button', { class: 'btn', type: 'button', text: 'Stop', onClick: stop }),
        W.el('button', { class: 'btn', type: 'button', text: 'Lap', onClick: lap }),
        W.el('button', { class: 'btn', type: 'button', text: 'Reset', onClick: reset })
      ]));
      host.appendChild(laps); paint();
    },

    'timezone-converter': function (host, W) {
      var zones = ['UTC', 'America/Los_Angeles', 'America/New_York', 'America/Chicago', 'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Africa/Lagos', 'Africa/Johannesburg', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney'];
      var when = W.el('input', { class: 'field', type: 'datetime-local', 'aria-label': 'Time' });
      when.value = new Date().toISOString().slice(0, 16);
      var base = sel(W, zones, 'UTC');
      var out = W.el('div', { class: 'calc-stats' });
      function calc() {
        out.innerHTML = '';
        var d = new Date(when.value); if (isNaN(d)) return;
        zones.forEach(function (z) {
          try {
            var s = new Intl.DateTimeFormat('en-GB', { timeZone: z, dateStyle: 'medium', timeStyle: 'short' }).format(d);
            out.appendChild(stat(W, z.replace(/_/g, ' '), s));
          } catch (e) {}
        });
      }
      [when, base].forEach(function (x) { x.addEventListener('input', calc); });
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Date & time (your local)', when), fld(W, 'Reference zone', base)]));
      host.appendChild(out); calc();
      host.appendChild(W.el('p', { class: 'note', text: 'Times use your device’s clock and the IANA timezone database built into your browser — daylight saving is handled automatically.' }));
    },

    'random-picker': function (host, W) {
      var ta = W.el('textarea', { class: 'field wtext', rows: '8', placeholder: 'One option per line…', spellcheck: 'false' });
      var count = W.el('input', { class: 'field', type: 'number', value: '1', min: '1', 'aria-label': 'How many to pick' });
      var uniqueBox = W.el('label', { class: 'wcheck' }, [W.el('input', { type: 'checkbox', checked: 'checked' }), W.el('span', { text: 'No repeats' })]);
      var out = W.el('div', { class: 'calc-headline' });
      function pick() {
        var items = ta.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
        if (!items.length) { out.innerHTML = '<span class="calc-label">Add some options first</span>'; return; }
        var unique = uniqueBox.querySelector('input').checked;
        var n = Math.max(1, Math.min(+count.value || 1, unique ? items.length : 999));
        var pool = items.slice(), chosen = [];
        for (var i = 0; i < n; i++) { var idx = Math.floor(Math.random() * pool.length); chosen.push(pool[idx]); if (unique) pool.splice(idx, 1); }
        out.innerHTML = '<span class="calc-label">Winner' + (n > 1 ? 's' : '') + '</span><strong class="calc-value">' + W.escapeHtml(chosen.join(', ')) + '</strong>';
      }
      host.appendChild(fld(W, 'Options', ta));
      host.appendChild(W.el('div', { class: 'wbtns' }, [count, uniqueBox, W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Pick', onClick: pick })]));
      host.appendChild(out);
    }
  };

  root.VKEveryday = { convertUnit: convertUnit, convertTemp: convertTemp, ageBetween: ageBetween };
  if (typeof module === 'object' && module.exports) module.exports = root.VKEveryday;
  if (typeof root.VKW !== 'undefined') { Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); } }
})(typeof window !== 'undefined' ? window : globalThis);
