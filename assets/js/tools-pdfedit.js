/* tools-pdfedit.js — compress-pdf, pdf-redact, compare-pdf.
 * Uses pdf.js (render/extract, Apache-2.0) + pdf-lib (rebuild, MIT), both
 * lazy-loaded from CDN only on run. Everything in-browser; no upload.
 * diffLines is exported + unit-tested. */
(function (root) {
  'use strict';

  var PDFJS = '3.11.174', PDFLIB = '1.17.1';
  var _pjs = null, _plib = null;
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = function () { rej(new Error('Could not load a PDF library from the CDN.')); }; document.head.appendChild(s); }); }
  async function pdfjs() {
    if (_pjs) return _pjs;
    if (!root.pdfjsLib) await loadScript('https://cdn.jsdelivr.net/npm/pdfjs-dist@' + PDFJS + '/build/pdf.min.js');
    _pjs = root.pdfjsLib; _pjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + PDFJS + '/build/pdf.worker.min.js';
    return _pjs;
  }
  async function pdflib() { if (_plib) return _plib; if (!root.PDFLib) await loadScript('https://cdn.jsdelivr.net/npm/pdf-lib@' + PDFLIB + '/dist/pdf-lib.min.js'); _plib = root.PDFLib; return _plib; }

  /* line diff (LCS) — shared with text-diff, reimplemented here to stay standalone */
  function diffLines(a, b) {
    var A = String(a || '').split('\n'), B = String(b || '').split('\n'), n = A.length, m = B.length, dp = [];
    for (var i = 0; i <= n; i++) { dp[i] = []; for (var j = 0; j <= m; j++) dp[i][j] = 0; }
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    var out = []; i = 0; j = 0;
    while (i < n && j < m) { if (A[i] === B[j]) { out.push({ t: ' ', line: A[i] }); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: '-', line: A[i] }); i++; } else { out.push({ t: '+', line: B[j] }); j++; } }
    while (i < n) out.push({ t: '-', line: A[i++] });
    while (j < m) out.push({ t: '+', line: B[j++] });
    return out;
  }
  async function extractText(file) {
    var lib = await pdfjs(); var doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    var out = [];
    for (var i = 1; i <= doc.numPages; i++) { var pg = await doc.getPage(i); var tc = await pg.getTextContent(); out.push(tc.items.map(function (t) { return t.str; }).join(' ').replace(/\s+/g, ' ').trim()); }
    return out.join('\n');
  }

  function baseName(n) { return String(n || 'document').replace(/\.[^.]+$/, ''); }
  function fld(W, l, n) { return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: l }), n]); }
  function fileInput(W, cb, accept) { var i = W.el('input', { type: 'file', class: 'field', accept: accept || 'application/pdf,.pdf', 'aria-label': 'Choose a PDF' }); i.addEventListener('change', function () { if (i.files[0]) cb(i.files[0]); }); return i; }

  var T = {

    'compress-pdf': function (host, W) {
      var quality = W.el('select', { class: 'field' }); [['0.5', 'Strong (smallest)'], ['0.7', 'Balanced'], ['0.85', 'Light (best quality)']].forEach(function (o) { quality.appendChild(W.el('option', { value: o[0], text: o[1] })); }); quality.value = '0.7';
      var scale = W.el('select', { class: 'field' }); [['1', '100% size'], ['0.75', '75% size'], ['0.5', '50% size']].forEach(function (o) { scale.appendChild(W.el('option', { value: o[0], text: o[1] })); }); scale.value = '1';
      var status = W.el('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
      var dl = W.el('div', { class: 'wbtns' });
      var file = null;
      var input = fileInput(W, function (f) { file = f; status.className = 'note'; status.textContent = f.name + ' ready — choose settings and Compress.'; });
      async function run() {
        if (!file) { status.className = 'note err'; status.textContent = 'Choose a PDF first.'; return; }
        dl.innerHTML = ''; status.className = 'note'; status.textContent = 'Loading engines…';
        try {
          var lib = await pdfjs(), PDFLib = await pdflib();
          var doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
          var out = await PDFLib.PDFDocument.create();
          var n = doc.numPages;
          for (var i = 1; i <= n; i++) {
            status.textContent = 'Compressing page ' + i + ' / ' + n + '…';
            var pg = await doc.getPage(i); var vp = pg.getViewport({ scale: +scale.value * 1.5 });
            var c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
            await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
            var jpg = await new Promise(function (r) { c.toBlob(function (b) { r(b); }, 'image/jpeg', +quality.value); });
            var img = await out.embedJpg(await jpg.arrayBuffer());
            var page = out.addPage([img.width, img.height]); page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
          }
          var bytes = await out.save();
          var blob = new Blob([bytes], { type: 'application/pdf' });
          var pct = Math.round((1 - blob.size / file.size) * 100);
          status.textContent = 'Done — ' + Math.round(file.size / 1024) + ' KB → ' + Math.round(blob.size / 1024) + ' KB' + (pct > 0 ? ' (' + pct + '% smaller)' : ' (already small)') + '.';
          dl.appendChild(W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Download compressed PDF', onClick: function () { W.download(blob, baseName(file.name) + '-compressed.pdf'); } }));
        } catch (e) { status.className = 'note err'; status.textContent = /encrypt|password/i.test(e.message) ? 'This PDF is password-protected — remove the password first.' : 'Could not process that PDF.'; }
      }
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'PDF file', input), fld(W, 'Quality', quality), fld(W, 'Page scale', scale)]));
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Compress', onClick: run })]));
      host.appendChild(status); host.appendChild(dl);
      host.appendChild(W.el('p', { class: 'note', text: 'Compresses by re-rendering each page as a JPEG image — great for scan-heavy or image-heavy PDFs. Note: this flattens the PDF, so selectable text becomes an image. All on your device.' }));
    },

    'pdf-redact': function (host, W) {
      var canvas = W.el('canvas', { class: 'wredact' });
      var status = W.el('p', { class: 'note', text: 'Load a PDF, pick a page, drag to add black redaction boxes, then export.' });
      var pager = W.el('div', { class: 'wbtns' });
      var doc = null, pageNum = 1, img = new Image(), pageCanvas = document.createElement('canvas'), rects = [], drawing = null;
      var file = null;
      function redraw() {
        var ctx = canvas.getContext('2d'); ctx.drawImage(pageCanvas, 0, 0, canvas.width, canvas.height); ctx.fillStyle = '#000';
        rects.forEach(function (r) { ctx.fillRect(r.x, r.y, r.w, r.h); }); if (drawing) ctx.fillRect(drawing.x, drawing.y, drawing.w, drawing.h);
      }
      async function showPage(num) {
        var lib = await pdfjs(); var pg = await doc.getPage(num); var vp = pg.getViewport({ scale: 1.3 });
        pageCanvas.width = vp.width; pageCanvas.height = vp.height; await pg.render({ canvasContext: pageCanvas.getContext('2d'), viewport: vp }).promise;
        var maxW = 760, sc = Math.min(1, maxW / vp.width); canvas.width = vp.width * sc; canvas.height = vp.height * sc; rects = []; redraw();
        status.textContent = 'Page ' + num + ' of ' + doc.numPages + ' — drag to redact.';
      }
      function pos(e) { var b = canvas.getBoundingClientRect(); var cx = (e.touches ? e.touches[0].clientX : e.clientX) - b.left, cy = (e.touches ? e.touches[0].clientY : e.clientY) - b.top; return { x: cx * (canvas.width / b.width), y: cy * (canvas.height / b.height) }; }
      canvas.addEventListener('mousedown', function (e) { if (!doc) return; var p = pos(e); drawing = { x: p.x, y: p.y, w: 0, h: 0, sx: p.x, sy: p.y }; });
      canvas.addEventListener('mousemove', function (e) { if (!drawing) return; var p = pos(e); drawing.x = Math.min(p.x, drawing.sx); drawing.y = Math.min(p.y, drawing.sy); drawing.w = Math.abs(p.x - drawing.sx); drawing.h = Math.abs(p.y - drawing.sy); redraw(); });
      root.addEventListener('mouseup', function () { if (!drawing) return; if (drawing.w > 3 && drawing.h > 3) rects.push({ x: drawing.x, y: drawing.y, w: drawing.w, h: drawing.h }); drawing = null; redraw(); });
      var input = fileInput(W, async function (f) { file = f; var lib = await pdfjs(); doc = await lib.getDocument({ data: await f.arrayBuffer() }).promise; pageNum = 1; await showPage(1); buildPager(); });
      function buildPager() {
        pager.innerHTML = '';
        pager.appendChild(W.el('button', { class: 'btn', type: 'button', text: '‹ Prev', onClick: function () { if (pageNum > 1) { pageNum--; showPage(pageNum); } } }));
        pager.appendChild(W.el('button', { class: 'btn', type: 'button', text: 'Next ›', onClick: function () { if (pageNum < doc.numPages) { pageNum++; showPage(pageNum); } } }));
        pager.appendChild(W.el('button', { class: 'btn', type: 'button', text: 'Undo', onClick: function () { rects.pop(); redraw(); } }));
        pager.appendChild(W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Export this page as PNG', onClick: function () { canvas.toBlob(function (b) { W.download(b, baseName(file.name) + '-p' + pageNum + '-redacted.png'); }, 'image/png'); } }));
      }
      host.appendChild(fld(W, 'PDF file', input)); host.appendChild(status); host.appendChild(canvas); host.appendChild(pager);
      host.appendChild(W.el('p', { class: 'note', text: 'Redaction boxes are baked into the exported image — the content underneath is gone, not just hidden. Export each redacted page as PNG. All on your device.' }));
    },

    'compare-pdf': function (host, W) {
      var a = null, b = null;
      var ia = fileInput(W, function (f) { a = f; run(); });
      var ib = fileInput(W, function (f) { b = f; run(); });
      var status = W.el('p', { class: 'note' });
      var head = W.el('div', { class: 'calc-stats' });
      var out = W.el('div', { class: 'wdiff' });
      async function run() {
        if (!a || !b) { status.textContent = 'Choose two PDFs to compare.'; return; }
        status.className = 'note'; status.textContent = 'Extracting text from both PDFs…'; out.innerHTML = ''; head.innerHTML = '';
        try {
          var ta = await extractText(a), tb = await extractText(b);
          var d = diffLines(ta, tb), add = 0, del = 0;
          d.forEach(function (r) { if (r.t === '+') add++; if (r.t === '-') del++; });
          head.appendChild(W.el('div', { class: 'calc-stat' }, [W.el('span', { text: 'Added' }), W.el('b', { text: String(add) })]));
          head.appendChild(W.el('div', { class: 'calc-stat' }, [W.el('span', { text: 'Removed' }), W.el('b', { text: String(del) })]));
          head.appendChild(W.el('div', { class: 'calc-stat' }, [W.el('span', { text: 'Identical' }), W.el('b', { text: (add === 0 && del === 0) ? 'yes' : 'no' })]));
          d.forEach(function (r) { if (r.t === ' ') return; out.appendChild(W.el('div', { class: 'wdl wdl-' + (r.t === '+' ? 'add' : 'del'), text: (r.t) + ' ' + r.line })); });
          if (add === 0 && del === 0) out.appendChild(W.el('div', { class: 'wdl wdl-add', text: '✓ The text content of both PDFs is identical.' }));
          status.textContent = 'Compared the text layers of both PDFs.';
        } catch (e) { status.className = 'note err'; status.textContent = 'Could not read one of the PDFs (scanned/image PDFs have no text to compare).'; }
      }
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Original PDF', ia), fld(W, 'Changed PDF', ib)]));
      host.appendChild(status); host.appendChild(head); host.appendChild(out);
      host.appendChild(W.el('p', { class: 'note', text: 'Compares the extracted text of both files, line by line. Works on digital PDFs with a real text layer. All on your device.' }));
    }
  };

  root.VKPdfEdit = { diffLines: diffLines };
  if (typeof module === 'object' && module.exports) module.exports = root.VKPdfEdit;
  if (typeof root.VKW !== 'undefined') { Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); } }
})(typeof window !== 'undefined' ? window : globalThis);
