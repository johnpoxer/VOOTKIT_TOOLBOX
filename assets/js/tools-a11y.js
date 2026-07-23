/* tools-a11y.js — accessibility auditing & simulation tools. On-device.
 * Pure logic (contrastRatio, cvdSimulate, checkHeadings, auditAlt, parseCaptions)
 * exported + unit-tested. HTML auditors parse with DOMParser (no execution). */
(function (root) {
  'use strict';

  /* ---- colour + contrast (self-contained) ---- */
  function hexToRgb(hex) { hex = String(hex).trim().replace(/^#/, ''); if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join(''); if (!/^[0-9a-f]{6}$/i.test(hex)) return null; return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) }; }
  function rgbToHex(r, g, b) { return '#' + [r, g, b].map(function (v) { return (Math.max(0, Math.min(255, Math.round(v))) + 0x100).toString(16).slice(1); }).join(''); }
  function relLum(r, g, b) { var a = [r, g, b].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; }
  function contrastRatio(h1, h2) { var a = hexToRgb(h1), b = hexToRgb(h2); if (!a || !b) return null; var l1 = relLum(a.r, a.g, a.b), l2 = relLum(b.r, b.g, b.b); return Math.round((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) * 100) / 100; }

  /* ---- colour-vision-deficiency simulation matrices (Machado 2009 approx) ---- */
  var CVD = {
    protanopia: [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758],
    deuteranopia: [0.625, 0.375, 0, 0.7, 0.3, 0, 0, 0.3, 0.7],
    tritanopia: [0.95, 0.05, 0, 0, 0.433, 0.567, 0, 0.475, 0.525],
    achromatopsia: [0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114]
  };
  function cvdSimulate(r, g, b, type) {
    var m = CVD[type]; if (!m) return { r: r, g: g, b: b };
    return {
      r: Math.max(0, Math.min(255, Math.round(r * m[0] + g * m[1] + b * m[2]))),
      g: Math.max(0, Math.min(255, Math.round(r * m[3] + g * m[4] + b * m[5]))),
      b: Math.max(0, Math.min(255, Math.round(r * m[6] + g * m[7] + b * m[8])))
    };
  }

  /* ---- HTML heading order ---- */
  function checkHeadings(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var hs = [].slice.call(doc.querySelectorAll('h1,h2,h3,h4,h5,h6'));
    var list = hs.map(function (h) { return { level: +h.tagName[1], text: (h.textContent || '').trim().slice(0, 80) }; });
    var issues = [];
    var h1count = list.filter(function (h) { return h.level === 1; }).length;
    if (h1count === 0) issues.push('No <h1> — every page should have exactly one.');
    if (h1count > 1) issues.push('Multiple <h1> (' + h1count + ') — use one top-level heading.');
    for (var i = 1; i < list.length; i++) { if (list[i].level > list[i - 1].level + 1) issues.push('Skipped level: <h' + list[i - 1].level + '> → <h' + list[i].level + '> ("' + list[i].text + '").'); }
    return { headings: list, issues: issues };
  }

  /* ---- alt-text audit ---- */
  function auditAlt(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var imgs = [].slice.call(doc.querySelectorAll('img'));
    var results = imgs.map(function (im) {
      var src = im.getAttribute('src') || '(no src)';
      var hasAlt = im.hasAttribute('alt');
      var alt = im.getAttribute('alt') || '';
      var status, note;
      if (!hasAlt) { status = 'fail'; note = 'Missing alt attribute'; }
      else if (alt.trim() === '') { status = 'ok'; note = 'Empty alt (decorative — fine if intentional)'; }
      else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(alt) || /^(image|img|photo|picture|dsc_?\d+)/i.test(alt.trim())) { status = 'warn'; note = 'Alt looks like a filename/placeholder'; }
      else if (alt.length > 125) { status = 'warn'; note = 'Alt is long (' + alt.length + ' chars) — aim under ~125'; }
      else { status = 'pass'; note = 'Has descriptive alt'; }
      return { src: src.slice(0, 60), alt: alt.slice(0, 80), status: status, note: note };
    });
    var summary = { total: results.length, fail: results.filter(function (r) { return r.status === 'fail'; }).length, warn: results.filter(function (r) { return r.status === 'warn'; }).length };
    return { results: results, summary: summary };
  }

  /* ---- caption (VTT/SRT) validation ---- */
  function tc(t) { // "00:01:02.500" or "00:01:02,500" -> seconds
    var m = String(t).trim().replace(',', '.').match(/^(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/);
    if (!m) return null;
    return (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) + (m[4] ? +('0.' + m[4]) : 0);
  }
  function parseCaptions(text) {
    var s = String(text || '').replace(/\r/g, '');
    var isVtt = /^WEBVTT/.test(s.trim());
    var blocks = s.split(/\n\s*\n/).map(function (b) { return b.trim(); }).filter(Boolean);
    var cues = [], issues = [];
    blocks.forEach(function (b) {
      if (/^WEBVTT/.test(b)) return;
      var lines = b.split('\n');
      var timingLine = lines.find(function (l) { return /-->/.test(l); });
      if (!timingLine) return;
      var parts = timingLine.split('-->');
      var start = tc(parts[0]), end = tc((parts[1] || '').trim().split(/\s+/)[0]);
      if (start == null || end == null) { issues.push('Bad timestamp: "' + timingLine.trim() + '"'); return; }
      if (end <= start) issues.push('End before/equal start at ' + parts[0].trim());
      cues.push({ start: start, end: end, text: lines.slice(lines.indexOf(timingLine) + 1).join(' ') });
    });
    for (var i = 1; i < cues.length; i++) { if (cues[i].start < cues[i - 1].end - 0.001) issues.push('Overlap: cue ' + (i + 1) + ' starts before cue ' + i + ' ends'); }
    return { format: isVtt ? 'WebVTT' : 'SRT', cues: cues.length, issues: issues, duration: cues.length ? cues[cues.length - 1].end : 0 };
  }

  /* ---- UI ---- */
  function area(W, ph, rows) { return W.el('textarea', { class: 'field wtext wmono', rows: String(rows || 8), placeholder: ph || '', spellcheck: 'false' }); }
  function fld(W, l, n) { return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: l }), n]); }
  function stat(W, l, v) { return W.el('div', { class: 'calc-stat' }, [W.el('span', { text: l }), W.el('b', { text: String(v) })]); }
  function colorInput(W, v) { return W.el('input', { type: 'color', class: 'wcolor', value: v }); }

  var T = {

    'accessible-palette': function (host, W) {
      var bg = colorInput(W, '#ffffff'), bgh = W.el('input', { class: 'field wmono', type: 'text', value: '#ffffff' });
      var base = colorInput(W, '#2563eb'), baseh = W.el('input', { class: 'field wmono', type: 'text', value: '#2563eb' });
      var row = W.el('div', { class: 'wpalette' });
      var note = W.el('p', { class: 'note' });
      function build() {
        var b = hexToRgb(baseh.value), g = hexToRgb(bgh.value); if (!b || !g) return;
        // darken/lighten base until it passes AA (4.5) on the chosen background
        row.innerHTML = '';
        var found = null;
        for (var f = 0; f <= 100; f += 4) {
          [-1, 1].forEach(function (dir) {
            if (found) return;
            var t = f / 100, r = Math.round(b.r + (dir < 0 ? -b.r : (255 - b.r)) * t), gg = Math.round(b.g + (dir < 0 ? -b.g : (255 - b.g)) * t), bb = Math.round(b.b + (dir < 0 ? -b.b : (255 - b.b)) * t);
            var hex = rgbToHex(r, gg, bb);
            if (contrastRatio(hex, bgh.value) >= 4.5 && !found) found = hex;
          });
        }
        var samples = [baseh.value, found].filter(Boolean);
        samples.forEach(function (hex) {
          var cr = contrastRatio(hex, bgh.value);
          var sw = W.el('button', { class: 'wpal', type: 'button', style: 'background:' + bgh.value + ';color:' + hex, title: 'Copy ' + hex, onClick: function () { W.copy(hex, this); } }, [W.el('span', { text: hex + ' · ' + cr + ':1' })]);
          row.appendChild(sw);
        });
        var passes = contrastRatio(baseh.value, bgh.value) >= 4.5;
        note.textContent = passes ? 'Your base colour already passes AA (' + contrastRatio(baseh.value, bgh.value) + ':1) on this background.' : (found ? 'Base fails AA. Nearest accessible shade: ' + found + '.' : 'No accessible shade found on this background — try a different background.');
      }
      bg.addEventListener('input', function () { bgh.value = bg.value; build(); });
      base.addEventListener('input', function () { baseh.value = base.value; build(); });
      [bgh, baseh].forEach(function (x) { x.addEventListener('input', build); });
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Background', W.el('div', { class: 'wbtns' }, [bg, bgh])), fld(W, 'Text / brand colour', W.el('div', { class: 'wbtns' }, [base, baseh]))]));
      host.appendChild(note); host.appendChild(row); build();
    },

    'color-blind-simulator': function (host, W) {
      var type = W.el('select', { class: 'field' }); [['deuteranopia', 'Deuteranopia (red-green, common)'], ['protanopia', 'Protanopia (red-green)'], ['tritanopia', 'Tritanopia (blue-yellow)'], ['achromatopsia', 'Achromatopsia (no colour)']].forEach(function (o) { type.appendChild(W.el('option', { value: o[0], text: o[1] })); });
      var input = W.el('input', { type: 'file', class: 'field', accept: 'image/*', 'aria-label': 'Choose an image' });
      var wrap = W.el('div', { class: 'wgrid2' });
      var origC = document.createElement('canvas'), simC = W.el('canvas', { class: 'wcode' });
      var img = null;
      function render() {
        if (!img) return;
        var scale = Math.min(1, 600 / img.naturalWidth); var w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
        origC.width = w; origC.height = h; origC.getContext('2d').drawImage(img, 0, 0, w, h);
        var data = origC.getContext('2d').getImageData(0, 0, w, h);
        var d = data.data;
        for (var i = 0; i < d.length; i += 4) { var s = cvdSimulate(d[i], d[i + 1], d[i + 2], type.value); d[i] = s.r; d[i + 1] = s.g; d[i + 2] = s.b; }
        simC.width = w; simC.height = h; simC.getContext('2d').putImageData(data, 0, 0);
      }
      input.addEventListener('change', function () { var f = input.files[0]; if (!f) return; var u = URL.createObjectURL(f); var im = new Image(); im.onload = function () { img = im; URL.revokeObjectURL(u); render(); }; im.src = u; });
      type.addEventListener('change', render);
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Image', input), fld(W, 'Simulate', type)]));
      host.appendChild(W.el('p', { class: 'wlab', text: 'Simulated view' })); host.appendChild(simC);
      host.appendChild(W.el('p', { class: 'note', text: 'Approximates how your image looks to someone with the selected colour-vision deficiency. Processed on your device.' }));
    },

    'heading-checker': function (host, W) {
      var ta = area(W, 'Paste your page HTML…', 8);
      ta.value = '<h1>Title</h1>\n<h2>Section</h2>\n<h4>Skipped h3!</h4>';
      var issues = W.el('div', { class: 'wdiff' }); var tree = W.el('div', { class: 'wdiff' });
      function run() {
        var r = checkHeadings(ta.value);
        issues.innerHTML = ''; tree.innerHTML = '';
        r.issues.forEach(function (m) { issues.appendChild(W.el('div', { class: 'wdl wdl-del', text: '⚠ ' + m })); });
        if (!r.issues.length) issues.appendChild(W.el('div', { class: 'wdl wdl-add', text: '✓ Heading order looks good.' }));
        r.headings.forEach(function (h) { tree.appendChild(W.el('div', { class: 'wdl', text: '  '.repeat(h.level - 1) + 'H' + h.level + '  ' + h.text })); });
      }
      ta.addEventListener('input', W.debounce(run, 150));
      host.appendChild(fld(W, 'HTML', ta));
      host.appendChild(W.el('p', { class: 'wlab', text: 'Issues' })); host.appendChild(issues);
      host.appendChild(W.el('p', { class: 'wlab', text: 'Outline' })); host.appendChild(tree); run();
    },

    'alt-text-auditor': function (host, W) {
      var ta = area(W, 'Paste your page HTML…', 8);
      ta.value = '<img src="hero.jpg" alt="Team celebrating a launch">\n<img src="icon.png">\n<img src="p.jpg" alt="DSC_0421.jpg">';
      var out = W.el('div', { class: 'wdiff' }); var sum = W.el('div', { class: 'calc-stats' });
      function run() {
        var r = auditAlt(ta.value);
        sum.innerHTML = ''; [['Images', r.summary.total], ['Missing alt', r.summary.fail], ['Warnings', r.summary.warn]].forEach(function (p) { sum.appendChild(stat(W, p[0], p[1])); });
        out.innerHTML = '';
        r.results.forEach(function (x) { out.appendChild(W.el('div', { class: 'wdl wdl-' + (x.status === 'fail' ? 'del' : x.status === 'warn' ? 'del' : 'add'), text: (x.status === 'fail' ? '✗' : x.status === 'warn' ? '⚠' : '✓') + ' ' + x.src + ' — ' + x.note })); });
        if (!r.results.length) out.appendChild(W.el('div', { class: 'wdl', text: 'No <img> tags found.' }));
      }
      ta.addEventListener('input', W.debounce(run, 150));
      host.appendChild(fld(W, 'HTML', ta)); host.appendChild(sum); host.appendChild(out); run();
    },

    'caption-validator': function (host, W) {
      var ta = area(W, 'Paste .vtt or .srt caption content…', 10);
      ta.value = 'WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nHello and welcome.\n\n00:00:03.500 --> 00:00:06.000\nThis one overlaps.';
      var sum = W.el('div', { class: 'calc-stats' }); var issues = W.el('div', { class: 'wdiff' });
      function run() {
        var r = parseCaptions(ta.value);
        sum.innerHTML = ''; [['Format', r.format], ['Cues', r.cues], ['Duration', Math.round(r.duration) + 's'], ['Issues', r.issues.length]].forEach(function (p) { sum.appendChild(stat(W, p[0], p[1])); });
        issues.innerHTML = '';
        if (!r.issues.length) issues.appendChild(W.el('div', { class: 'wdl wdl-add', text: '✓ No timing problems found.' }));
        else r.issues.forEach(function (m) { issues.appendChild(W.el('div', { class: 'wdl wdl-del', text: '⚠ ' + m })); });
      }
      ta.addEventListener('input', W.debounce(run, 150));
      host.appendChild(fld(W, 'Caption file', ta)); host.appendChild(sum); host.appendChild(issues); run();
    }
  };

  root.VKA11y = { contrastRatio: contrastRatio, cvdSimulate: cvdSimulate, checkHeadings: checkHeadings, auditAlt: auditAlt, parseCaptions: parseCaptions };
  if (typeof module === 'object' && module.exports) module.exports = root.VKA11y;
  if (typeof root.VKW !== 'undefined') { Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); } }
})(typeof window !== 'undefined' ? window : globalThis);
