/* tools-design.js — colour & CSS tools (design + accessibility categories).
 * Pure colour maths (hexToRgb, rgbToHsl, hslToRgb, contrastRatio, relLuminance)
 * is exported + unit-tested. On-device, no library. */
(function (root) {
  'use strict';

  /* ---------- colour maths ---------- */
  function hexToRgb(hex) {
    hex = String(hex).trim().replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) { return (Math.max(0, Math.min(255, Math.round(v))) + 0x100).toString(16).slice(1); }).join('');
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }
  function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    function hue(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else { var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; r = hue(p, q, h + 1 / 3); g = hue(p, q, h); b = hue(p, q, h - 1 / 3); }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }
  function relLuminance(r, g, b) {
    var a = [r, g, b].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function contrastRatio(hex1, hex2) {
    var c1 = hexToRgb(hex1), c2 = hexToRgb(hex2);
    if (!c1 || !c2) return null;
    var l1 = relLuminance(c1.r, c1.g, c1.b), l2 = relLuminance(c2.r, c2.g, c2.b);
    var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return Math.round((hi + 0.05) / (lo + 0.05) * 100) / 100;
  }

  /* ---------- UI ---------- */
  function fld(W, label, node) { return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: label }), node]); }
  function stat(W, l, v) { return W.el('div', { class: 'calc-stat' }, [W.el('span', { text: l }), W.el('b', { text: String(v) })]); }
  function colorInput(W, val) { return W.el('input', { type: 'color', class: 'wcolor', value: val || '#2563eb', 'aria-label': 'Colour' }); }

  var T = {

    'color-converter': function (host, W) {
      var picker = colorInput(W, '#2563eb');
      var hex = W.el('input', { class: 'field wmono', type: 'text', value: '#2563eb', 'aria-label': 'Hex' });
      var out = W.el('div', { class: 'calc-stats' });
      var swatch = W.el('div', { class: 'wswatch' });
      function fromHex(h) {
        var rgb = hexToRgb(h); if (!rgb) return;
        var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        swatch.style.background = rgbToHex(rgb.r, rgb.g, rgb.b);
        picker.value = rgbToHex(rgb.r, rgb.g, rgb.b);
        out.innerHTML = '';
        [['HEX', rgbToHex(rgb.r, rgb.g, rgb.b)], ['RGB', 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')'],
         ['HSL', 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%)']].forEach(function (p) { var s = stat(W, p[0], p[1]); s.classList.add('wmono'); out.appendChild(s); });
      }
      picker.addEventListener('input', function () { hex.value = picker.value; fromHex(picker.value); });
      hex.addEventListener('input', function () { fromHex(hex.value); });
      host.appendChild(W.el('div', { class: 'wbtns' }, [picker, hex]));
      host.appendChild(swatch); host.appendChild(out); fromHex('#2563eb');
    },

    'contrast-checker': function (host, W) {
      var fg = colorInput(W, '#111827'), bg = colorInput(W, '#ffffff');
      var fgh = W.el('input', { class: 'field wmono', type: 'text', value: '#111827', 'aria-label': 'Text colour' });
      var bgh = W.el('input', { class: 'field wmono', type: 'text', value: '#ffffff', 'aria-label': 'Background colour' });
      var preview = W.el('div', { class: 'wcontrast' }, [W.el('span', { text: 'Almost before we knew it, we had left the ground.' })]);
      var ratioEl = W.el('div', { class: 'calc-headline' });
      var out = W.el('div', { class: 'calc-stats' });
      function pass(r, need) { return r >= need ? '✓ Pass' : '✗ Fail'; }
      function upd() {
        var r = contrastRatio(fgh.value, bgh.value);
        if (r == null) { ratioEl.innerHTML = '<span class="calc-label">Enter valid hex colours</span>'; return; }
        preview.style.color = fgh.value; preview.style.background = bgh.value;
        ratioEl.innerHTML = '<span class="calc-label">Contrast ratio</span><strong class="calc-value">' + r.toFixed(2) + ':1</strong>';
        out.innerHTML = '';
        [['Normal text (AA ≥ 4.5)', pass(r, 4.5)], ['Normal text (AAA ≥ 7)', pass(r, 7)],
         ['Large text (AA ≥ 3)', pass(r, 3)], ['Large text (AAA ≥ 4.5)', pass(r, 4.5)]].forEach(function (p) { out.appendChild(stat(W, p[0], p[1])); });
      }
      fg.addEventListener('input', function () { fgh.value = fg.value; upd(); });
      bg.addEventListener('input', function () { bgh.value = bg.value; upd(); });
      fgh.addEventListener('input', function () { var c = hexToRgb(fgh.value); if (c) fg.value = rgbToHex(c.r, c.g, c.b); upd(); });
      bgh.addEventListener('input', function () { var c = hexToRgb(bgh.value); if (c) bg.value = rgbToHex(c.r, c.g, c.b); upd(); });
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Text', W.el('div', { class: 'wbtns' }, [fg, fgh])), fld(W, 'Background', W.el('div', { class: 'wbtns' }, [bg, bgh]))]));
      host.appendChild(preview); host.appendChild(ratioEl); host.appendChild(out); upd();
    },

    'gradient-generator': function (host, W) {
      var c1 = colorInput(W, '#2563eb'), c2 = colorInput(W, '#06b6d4');
      var angle = W.el('input', { class: 'field', type: 'range', min: '0', max: '360', value: '135' });
      var type = W.el('select', { class: 'field' }); ['linear', 'radial'].forEach(function (t) { type.appendChild(W.el('option', { value: t, text: t })); });
      var preview = W.el('div', { class: 'wgradient' });
      var css = W.el('textarea', { class: 'field wtext wmono', rows: '2', readonly: 'readonly', 'aria-label': 'CSS' });
      function upd() {
        var g = type.value === 'radial' ? 'radial-gradient(circle, ' + c1.value + ', ' + c2.value + ')' : 'linear-gradient(' + angle.value + 'deg, ' + c1.value + ', ' + c2.value + ')';
        preview.style.background = g; css.value = 'background: ' + g + ';';
      }
      [c1, c2, angle, type].forEach(function (x) { x.addEventListener('input', upd); });
      host.appendChild(W.el('div', { class: 'wbtns' }, [c1, c2, type, W.el('span', { class: 'wlab', text: 'Angle' }), angle]));
      host.appendChild(preview); host.appendChild(css);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.copyBtn('Copy CSS', function () { return css.value; })])); upd();
    },

    'palette-generator': function (host, W) {
      var base = colorInput(W, '#2563eb');
      var scheme = W.el('select', { class: 'field' }); [['analogous', 'Analogous'], ['complementary', 'Complementary'], ['triadic', 'Triadic'], ['shades', 'Shades'], ['tints', 'Tints']].forEach(function (o) { scheme.appendChild(W.el('option', { value: o[0], text: o[1] })); });
      var row = W.el('div', { class: 'wpalette' });
      function build() {
        var rgb = hexToRgb(base.value), hsl = rgbToHsl(rgb.r, rgb.g, rgb.b), cols = [];
        function push(h, s, l) { var c = hslToRgb((h + 360) % 360, Math.max(0, Math.min(100, s)), Math.max(0, Math.min(100, l))); cols.push(rgbToHex(c.r, c.g, c.b)); }
        if (scheme.value === 'analogous') { [-30, -15, 0, 15, 30].forEach(function (d) { push(hsl.h + d, hsl.s, hsl.l); }); }
        else if (scheme.value === 'complementary') { push(hsl.h, hsl.s, hsl.l); push(hsl.h, hsl.s, hsl.l + 15); push(hsl.h + 180, hsl.s, hsl.l); push(hsl.h + 180, hsl.s, hsl.l + 15); push(hsl.h + 180, hsl.s, hsl.l - 15); }
        else if (scheme.value === 'triadic') { [0, 120, 240].forEach(function (d) { push(hsl.h + d, hsl.s, hsl.l); }); push(hsl.h, hsl.s, hsl.l + 15); push(hsl.h + 120, hsl.s, hsl.l - 15); }
        else if (scheme.value === 'shades') { [0, -12, -24, -36, -48].forEach(function (d) { push(hsl.h, hsl.s, hsl.l + d); }); }
        else { [0, 12, 24, 36, 48].forEach(function (d) { push(hsl.h, hsl.s, hsl.l + d); }); }
        row.innerHTML = '';
        cols.forEach(function (hex) {
          var sw = W.el('button', { class: 'wpal', type: 'button', title: 'Copy ' + hex, style: 'background:' + hex, onClick: function () { W.copy(hex, this); } }, [W.el('span', { text: hex })]);
          row.appendChild(sw);
        });
      }
      [base, scheme].forEach(function (x) { x.addEventListener('input', build); });
      host.appendChild(W.el('div', { class: 'wbtns' }, [base, scheme]));
      host.appendChild(row); build();
      host.appendChild(W.el('p', { class: 'note', text: 'Click a swatch to copy its hex.' }));
    },

    'shadow-generator': function (host, W) {
      function rng(min, max, val) { return W.el('input', { class: 'field', type: 'range', min: String(min), max: String(max), value: String(val) }); }
      var x = rng(-40, 40, 0), y = rng(-40, 40, 10), blur = rng(0, 80, 24), spread = rng(-20, 40, -4);
      var col = colorInput(W, '#0b1220'), opacity = rng(0, 100, 18);
      var preview = W.el('div', { class: 'wshadowbox' }, [W.el('div', { class: 'wshadowtarget' })]);
      var css = W.el('textarea', { class: 'field wtext wmono', rows: '2', readonly: 'readonly', 'aria-label': 'CSS' });
      function upd() {
        var rgb = hexToRgb(col.value) || { r: 0, g: 0, b: 0 };
        var shadow = x.value + 'px ' + y.value + 'px ' + blur.value + 'px ' + spread.value + 'px rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (opacity.value / 100).toFixed(2) + ')';
        preview.querySelector('.wshadowtarget').style.boxShadow = shadow;
        css.value = 'box-shadow: ' + shadow + ';';
      }
      [x, y, blur, spread, col, opacity].forEach(function (c) { c.addEventListener('input', upd); });
      function labelled(l, node) { return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: l }), node]); }
      host.appendChild(W.el('div', { class: 'wgrid2' }, [labelled('Offset X', x), labelled('Offset Y', y), labelled('Blur', blur), labelled('Spread', spread), labelled('Colour', col), labelled('Opacity %', opacity)]));
      host.appendChild(preview); host.appendChild(css);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.copyBtn('Copy CSS', function () { return css.value; })])); upd();
    }
  };

  root.VKDesign = { hexToRgb: hexToRgb, rgbToHex: rgbToHex, rgbToHsl: rgbToHsl, hslToRgb: hslToRgb, relLuminance: relLuminance, contrastRatio: contrastRatio };
  if (typeof module === 'object' && module.exports) module.exports = root.VKDesign;
  if (typeof root.VKW !== 'undefined') { Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); } }
})(typeof window !== 'undefined' ? window : globalThis);
