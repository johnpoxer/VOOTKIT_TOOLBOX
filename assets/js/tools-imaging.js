/* tools-imaging.js — image inspection & creation tools (widget + canvas).
 * exif-viewer parses JPEG EXIF from the raw bytes; color-from-image quantises
 * the pixels; meme-generator draws text on a canvas. All on-device.
 * quantizeColors is exported + unit-tested. */
(function (root) {
  'use strict';

  /* ---------- EXIF (JPEG APP1 / TIFF) ---------- */
  var EXIF_TAGS = { 0x010F: 'Make', 0x0110: 'Model', 0x0112: 'Orientation', 0x011A: 'XResolution', 0x0132: 'DateTime', 0x8827: 'ISO', 0x829A: 'ExposureTime', 0x829D: 'FNumber', 0x920A: 'FocalLength', 0x9003: 'DateTimeOriginal', 0xA002: 'PixelXDimension', 0xA003: 'PixelYDimension', 0x0131: 'Software', 0x013B: 'Artist' };
  var TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
  function parseExif(buffer) {
    var dv = new DataView(buffer);
    if (dv.byteLength < 4 || dv.getUint16(0) !== 0xFFD8) return { error: 'Not a JPEG (EXIF lives in JPEG/TIFF). PNG and WebP don’t carry EXIF.' };
    var offset = 2, marker = 0;
    while (offset + 4 <= dv.byteLength) {
      marker = dv.getUint16(offset);
      if (marker === 0xFFE1) break;                       // APP1 (EXIF)
      if (marker === 0xFFDA || marker === 0xFFD9) { marker = 0; break; }  // SOS / EOI: image data begins, no EXIF
      if ((marker & 0xFF00) !== 0xFF00) return { tags: {}, note: 'No EXIF block found.' };
      offset += 2 + dv.getUint16(offset + 2);             // skip this segment
    }
    if (marker !== 0xFFE1 || offset + 10 > dv.byteLength) return { tags: {}, note: 'This JPEG has no EXIF metadata (often stripped by social apps).' };
    var app1 = offset + 4;
    if (dv.getUint32(app1) !== 0x45786966) return { tags: {}, note: 'No EXIF header.' };  // 'Exif'
    var tiff = app1 + 6;
    var little = dv.getUint16(tiff) === 0x4949;
    function u16(o) { return dv.getUint16(o, little); }
    function u32(o) { return dv.getUint32(o, little); }
    var ifd0 = tiff + u32(tiff + 4);
    var tags = {};
    function readIFD(dirStart) {
      var n = u16(dirStart);
      for (var i = 0; i < n; i++) {
        var e = dirStart + 2 + i * 12;
        var tag = u16(e), type = u16(e + 2), count = u32(e + 4);
        var size = (TYPE_SIZE[type] || 1) * count;
        var valOff = size > 4 ? tiff + u32(e + 8) : e + 8;
        var name = EXIF_TAGS[tag];
        if (tag === 0x8769) { readIFD(tiff + u32(e + 8)); continue; }  // ExifIFD pointer
        if (!name) continue;
        var v;
        if (type === 2) { v = ''; for (var j = 0; j < count - 1; j++) { var ch = dv.getUint8(valOff + j); if (ch) v += String.fromCharCode(ch); } v = v.trim(); }
        else if (type === 3) v = u16(valOff);
        else if (type === 4) v = u32(valOff);
        else if (type === 5) { var num = u32(valOff), den = u32(valOff + 4); v = den ? (num / den) : num; }
        else continue;
        tags[name] = v;
      }
    }
    try { readIFD(ifd0); } catch (e) { return { tags: tags, note: 'EXIF partly readable.' }; }
    return { tags: tags };
  }
  function humanExif(tags) {
    var out = [];
    var map = [['Make', 'Camera make'], ['Model', 'Camera model'], ['Software', 'Software'], ['DateTimeOriginal', 'Taken'], ['DateTime', 'Modified'], ['Artist', 'Artist']];
    map.forEach(function (m) { if (tags[m[0]] != null && tags[m[0]] !== '') out.push([m[1], tags[m[0]]]); });
    if (tags.FNumber) out.push(['Aperture', 'f/' + (Math.round(tags.FNumber * 10) / 10)]);
    if (tags.ExposureTime) out.push(['Shutter', tags.ExposureTime >= 1 ? tags.ExposureTime + 's' : '1/' + Math.round(1 / tags.ExposureTime) + 's']);
    if (tags.ISO) out.push(['ISO', tags.ISO]);
    if (tags.FocalLength) out.push(['Focal length', Math.round(tags.FocalLength) + 'mm']);
    if (tags.Orientation) out.push(['Orientation', tags.Orientation]);
    return out;
  }

  /* ---------- colour quantisation ---------- */
  function quantizeColors(pixels, k) {
    // pixels: Uint8ClampedArray RGBA; bucket by 4-bit-per-channel, return top k
    var buckets = {}, step = 16;
    for (var i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 128) continue; // skip transparent
      var r = Math.round(pixels[i] / step) * step, g = Math.round(pixels[i + 1] / step) * step, b = Math.round(pixels[i + 2] / step) * step;
      var key = r + ',' + g + ',' + b;
      if (!buckets[key]) buckets[key] = { r: 0, g: 0, b: 0, n: 0 };
      var bk = buckets[key]; bk.r += pixels[i]; bk.g += pixels[i + 1]; bk.b += pixels[i + 2]; bk.n++;
    }
    var arr = Object.keys(buckets).map(function (key) { var bk = buckets[key]; return { r: Math.round(bk.r / bk.n), g: Math.round(bk.g / bk.n), b: Math.round(bk.b / bk.n), n: bk.n }; });
    arr.sort(function (a, b) { return b.n - a.n; });
    return arr.slice(0, k || 6);
  }
  function toHex(r, g, b) { return '#' + [r, g, b].map(function (v) { return (v + 0x100).toString(16).slice(1); }).join(''); }

  /* ---------- shared file input ---------- */
  function fileRow(W, accept, onFile) {
    var input = W.el('input', { type: 'file', class: 'field', accept: accept || 'image/*', 'aria-label': 'Choose an image' });
    input.addEventListener('change', function () { if (input.files[0]) onFile(input.files[0]); });
    return input;
  }
  function loadImage(file) { return new Promise(function (res, rej) { var u = URL.createObjectURL(file); var im = new Image(); im.onload = function () { res({ img: im, url: u }); }; im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('Could not open that image.')); }; im.src = u; }); }
  function stat(W, l, v) { return W.el('div', { class: 'calc-stat' }, [W.el('span', { text: l }), W.el('b', { text: String(v) })]); }

  var T = {

    'exif-viewer': function (host, W) {
      var out = W.el('div', { class: 'calc-stats' });
      var note = W.el('p', { class: 'note' });
      var input = fileRow(W, 'image/jpeg,.jpg,.jpeg', async function (f) {
        out.innerHTML = ''; note.textContent = 'Reading ' + f.name + '…';
        var buf = await f.arrayBuffer();
        var res = parseExif(buf);
        if (res.error) { note.className = 'note err'; note.textContent = res.error; return; }
        note.className = 'note';
        // always show intrinsic dimensions via decode
        try { var im = await loadImage(f); out.appendChild(stat(W, 'Dimensions', im.img.naturalWidth + ' × ' + im.img.naturalHeight)); URL.revokeObjectURL(im.url); } catch (e) {}
        out.appendChild(stat(W, 'File size', Math.round(f.size / 1024).toLocaleString() + ' KB'));
        var rows = humanExif(res.tags);
        rows.forEach(function (r) { out.appendChild(stat(W, r[0], r[1])); });
        note.textContent = rows.length ? 'Read locally — nothing uploaded.' : (res.note || 'No camera EXIF found in this JPEG.');
      });
      host.appendChild(input); host.appendChild(note); host.appendChild(out);
      host.appendChild(W.el('p', { class: 'note', text: 'EXIF can include camera, timestamp and sometimes GPS. Parsed on your device. Tip: strip EXIF before sharing photos publicly.' }));
    },

    'color-from-image': function (host, W) {
      var preview = W.el('img', { class: 'ft-preview', alt: 'Uploaded image', hidden: 'hidden' });
      var palette = W.el('div', { class: 'wpalette' });
      var input = fileRow(W, 'image/*', async function (f) {
        var L = await loadImage(f); preview.src = L.url; preview.hidden = false;
        var scale = Math.min(1, 200 / Math.max(L.img.naturalWidth, L.img.naturalHeight));
        var w = Math.max(1, Math.round(L.img.naturalWidth * scale)), h = Math.max(1, Math.round(L.img.naturalHeight * scale));
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(L.img, 0, 0, w, h);
        var data = c.getContext('2d').getImageData(0, 0, w, h).data;
        var cols = quantizeColors(data, 8);
        palette.innerHTML = '';
        cols.forEach(function (col) { var hex = toHex(col.r, col.g, col.b); palette.appendChild(W.el('button', { class: 'wpal', type: 'button', title: 'Copy ' + hex, style: 'background:' + hex, onClick: function () { W.copy(hex, this); } }, [W.el('span', { text: hex })])); });
      });
      host.appendChild(input); host.appendChild(preview); host.appendChild(palette);
      host.appendChild(W.el('p', { class: 'note', text: 'Extracts the dominant colours as a palette — click a swatch to copy its hex. Runs on your device.' }));
    },

    'meme-generator': function (host, W) {
      var top = W.el('input', { class: 'field', type: 'text', placeholder: 'TOP TEXT', 'aria-label': 'Top text' });
      var bottom = W.el('input', { class: 'field', type: 'text', placeholder: 'BOTTOM TEXT', 'aria-label': 'Bottom text' });
      var canvas = W.el('canvas', { class: 'wmeme' });
      var img = null;
      function draw() {
        if (!img) return;
        var maxW = 700, scale = Math.min(1, maxW / img.naturalWidth);
        canvas.width = img.naturalWidth * scale; canvas.height = img.naturalHeight * scale;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        var fs = Math.round(canvas.width / 10);
        ctx.font = '900 ' + fs + 'px Impact, "Arial Black", sans-serif';
        ctx.textAlign = 'center'; ctx.lineWidth = Math.max(2, fs / 12); ctx.strokeStyle = '#000'; ctx.fillStyle = '#fff';
        function line(t, y) { t = (t || '').toUpperCase(); if (!t) return; ctx.strokeText(t, canvas.width / 2, y); ctx.fillText(t, canvas.width / 2, y); }
        line(top.value, fs + 6); line(bottom.value, canvas.height - fs / 2);
      }
      var input = fileRow(W, 'image/*', async function (f) { var L = await loadImage(f); img = L.img; draw(); });
      [top, bottom].forEach(function (x) { x.addEventListener('input', draw); });
      host.appendChild(input);
      host.appendChild(W.el('div', { class: 'wgrid2' }, [W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: 'Top text' }), top]), W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: 'Bottom text' }), bottom])]));
      host.appendChild(canvas);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Download PNG', onClick: function () { if (!img) return; canvas.toBlob(function (b) { W.download(b, 'meme.png'); }, 'image/png'); } })]));
      host.appendChild(W.el('p', { class: 'note', text: 'Classic Impact caption style. Your image never leaves your device.' }));
    }
  };

  root.VKImaging = { parseExif: parseExif, humanExif: humanExif, quantizeColors: quantizeColors, toHex: toHex };
  if (typeof module === 'object' && module.exports) module.exports = root.VKImaging;
  if (typeof root.VKW !== 'undefined') { Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); } }
})(typeof window !== 'undefined' ? window : globalThis);
