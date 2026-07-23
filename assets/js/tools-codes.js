/* tools-codes.js — QR & barcode tools. On-device.
 * These use small, vetted MIT libraries lazy-loaded from a CDN only when the
 * tool runs: qrcode (generate), jsQR (scan/decode), JsBarcode (barcodes).
 * The pure helper ean13CheckDigit is exported + unit-tested. */
(function (root) {
  'use strict';

  var LIB = {
    qrcode: 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
    jsqr: 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
    jsbarcode: 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js'
  };
  var loaded = {};
  function lazy(url, globalName) {
    if (loaded[url]) return Promise.resolve(root[globalName]);
    if (root[globalName]) { loaded[url] = 1; return Promise.resolve(root[globalName]); }
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = url; s.async = true;
      s.onload = function () { loaded[url] = 1; root[globalName] ? res(root[globalName]) : rej(new Error('Library loaded but was not available.')); };
      s.onerror = function () { rej(new Error('Could not load the code library from the CDN — check your connection and try again.')); };
      document.head.appendChild(s);
    });
  }

  /* EAN-13 check digit (pure): sum odd*1 + even*3 over first 12 digits. */
  function ean13CheckDigit(digits12) {
    var d = String(digits12).replace(/\D/g, '').slice(0, 12);
    if (d.length !== 12) return null;
    var sum = 0;
    for (var i = 0; i < 12; i++) sum += (+d[i]) * (i % 2 === 0 ? 1 : 3);
    return (10 - (sum % 10)) % 10;
  }

  function fld(W, label, node, hint) { var k = [W.el('span', { class: 'wlab', text: label }), node]; if (hint) k.push(W.el('small', { class: 'calc-hint', text: hint })); return W.el('label', { class: 'wfield' }, k); }

  var T = {

    'qr-generator': function (host, W) {
      var text = W.el('textarea', { class: 'field wtext', rows: '3', placeholder: 'A URL, text, Wi-Fi, anything…', spellcheck: 'false' });
      text.value = 'https://vootkit.com';
      var size = W.el('select', { class: 'field' }); [['256', 'Small'], ['512', 'Medium'], ['1024', 'Large (print)']].forEach(function (o) { size.appendChild(W.el('option', { value: o[0], text: o[1] })); }); size.value = '512';
      var ecc = W.el('select', { class: 'field' }); [['L', 'L — 7%'], ['M', 'M — 15%'], ['Q', 'Q — 25%'], ['H', 'H — 30% (logos)']].forEach(function (o) { ecc.appendChild(W.el('option', { value: o[0], text: o[1] })); }); ecc.value = 'M';
      var canvas = W.el('canvas', { class: 'wcode' });
      var err = W.el('p', { class: 'note err', hidden: 'hidden', role: 'alert' });
      var busy = false;
      async function gen() {
        if (busy) return; busy = true; err.hidden = true;
        try {
          var QR = await lazy(LIB.qrcode, 'QRCode');
          await new Promise(function (res, rej) { QR.toCanvas(canvas, text.value || ' ', { width: +size.value, errorCorrectionLevel: ecc.value, margin: 2 }, function (e) { e ? rej(e) : res(); }); });
        } catch (e) { err.hidden = false; err.textContent = e.message || 'Could not generate that QR code (text may be too long).'; }
        busy = false;
      }
      [text, size, ecc].forEach(function (x) { x.addEventListener('input', W.debounce(gen, 150)); });
      host.appendChild(fld(W, 'Content', text));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Size', size), fld(W, 'Error correction', ecc, 'Higher = more damage-tolerant')]));
      host.appendChild(err); host.appendChild(canvas);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Download PNG', onClick: function () { canvas.toBlob(function (b) { if (b) W.download(b, 'qr-code.png'); }, 'image/png'); } })]));
      host.appendChild(W.el('p', { class: 'note', text: 'Generated in your browser. No tracking or redirect — the QR encodes exactly what you type, forever (unlike “dynamic” QR services).' }));
      gen();
    },

    'barcode-generator': function (host, W) {
      var value = W.el('input', { class: 'field wmono', type: 'text', value: '012345678905', 'aria-label': 'Barcode value' });
      var fmt = W.el('select', { class: 'field' }); [['CODE128', 'CODE128 (any text)'], ['EAN13', 'EAN-13 (retail, 12–13 digits)'], ['UPC', 'UPC-A (12 digits)'], ['CODE39', 'CODE39']].forEach(function (o) { fmt.appendChild(W.el('option', { value: o[0], text: o[1] })); });
      var svg = W.el('svg', { class: 'wcode' });
      var err = W.el('p', { class: 'note err', hidden: 'hidden', role: 'alert' });
      var hint = W.el('p', { class: 'note' });
      async function gen() {
        err.hidden = true; hint.textContent = '';
        if (fmt.value === 'EAN13') { var cd = ean13CheckDigit(value.value); if (cd != null) hint.textContent = 'EAN-13 check digit for the first 12 digits is ' + cd + '.'; }
        try {
          var JB = await lazy(LIB.jsbarcode, 'JsBarcode');
          JB(svg, value.value, { format: fmt.value, displayValue: true, margin: 10, background: '#ffffff' });
        } catch (e) { err.hidden = false; err.textContent = 'That value isn’t valid for ' + fmt.value + ' — check the length and characters.'; }
      }
      [value, fmt].forEach(function (x) { x.addEventListener('input', W.debounce(gen, 150)); });
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Value', value), fld(W, 'Format', fmt)]));
      host.appendChild(hint); host.appendChild(err); host.appendChild(svg);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Download SVG', onClick: function () { var s = new XMLSerializer().serializeToString(svg); W.download(s, 'barcode.svg', 'image/svg+xml'); } })]));
      gen();
    },

    'qr-scanner': function (host, W) {
      var input = W.el('input', { type: 'file', class: 'field', accept: 'image/*', 'aria-label': 'Choose a QR image' });
      var out = W.el('textarea', { class: 'field wtext', rows: '3', readonly: 'readonly', 'aria-label': 'Decoded text' });
      var err = W.el('p', { class: 'note', hidden: 'hidden' });
      var camBtn = W.el('button', { class: 'btn', type: 'button', text: 'Scan with camera' });
      var video = W.el('video', { class: 'wcode', playsinline: 'true', hidden: 'hidden' });
      var stream = null, scanning = false;
      async function decodeImageData(imgData, w, h) {
        var jsQR = await lazy(LIB.jsqr, 'jsQR');
        var r = jsQR(imgData, w, h);
        return r ? r.data : null;
      }
      input.addEventListener('change', async function () {
        var f = input.files[0]; if (!f) return;
        err.hidden = true; out.value = '';
        var url = URL.createObjectURL(f), im = new Image();
        im.onload = async function () {
          var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
          c.getContext('2d').drawImage(im, 0, 0); URL.revokeObjectURL(url);
          try { var data = c.getContext('2d').getImageData(0, 0, c.width, c.height); var text = await decodeImageData(data.data, c.width, c.height); if (text) { out.value = text; } else { err.hidden = false; err.textContent = 'No QR code found in that image. Try a clearer, tighter crop.'; } }
          catch (e) { err.hidden = false; err.textContent = e.message; }
        };
        im.onerror = function () { err.hidden = false; err.textContent = 'Could not open that image.'; };
        im.src = url;
      });
      camBtn.addEventListener('click', async function () {
        if (scanning) { stop(); return; }
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          video.hidden = false; video.srcObject = stream; await video.play(); scanning = true; camBtn.textContent = 'Stop camera'; loop();
        } catch (e) { err.hidden = false; err.textContent = 'Camera unavailable or permission denied. You can still scan an image file.'; }
      });
      async function loop() {
        if (!scanning) return;
        if (video.videoWidth) {
          var c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight;
          c.getContext('2d').drawImage(video, 0, 0);
          try { var data = c.getContext('2d').getImageData(0, 0, c.width, c.height); var text = await decodeImageData(data.data, c.width, c.height); if (text) { out.value = text; stop(); return; } } catch (e) {}
        }
        setTimeout(loop, 250);
      }
      function stop() { scanning = false; camBtn.textContent = 'Scan with camera'; video.hidden = true; if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; } }
      root.addEventListener('pagehide', stop);
      host.appendChild(fld(W, 'QR image', input));
      host.appendChild(W.el('div', { class: 'wbtns' }, [camBtn]));
      host.appendChild(video); host.appendChild(err);
      host.appendChild(fld(W, 'Decoded content', out));
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.copyBtn('Copy', function () { return out.value; })]));
      host.appendChild(W.el('p', { class: 'note', text: 'Decoded on your device — the image and camera feed never leave your browser. Always check a scanned link before opening it.' }));
    }
  };

  root.VKCodes = { ean13CheckDigit: ean13CheckDigit };
  if (typeof module === 'object' && module.exports) module.exports = root.VKCodes;
  if (typeof root.VKW !== 'undefined') { Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); } }
})(typeof window !== 'undefined' ? window : globalThis);
