/* tools-pdfview.js — pdf-to-jpg and pdf-to-text, powered by pdf.js.
 * pdf.js (pdfjs-dist, Apache-2.0) is lazy-loaded from a CDN only when one of
 * these tools runs. Everything happens in-browser: the PDF is read into memory,
 * rendered/extracted, and never uploaded. */
(function (root) {
  'use strict';

  var VER = '3.11.174';
  var LIB = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + VER + '/build/pdf.min.js';
  var WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + VER + '/build/pdf.worker.min.js';
  var _lib = null;
  function loadPdfJs() {
    if (_lib) return Promise.resolve(_lib);
    if (root.pdfjsLib) { _lib = root.pdfjsLib; _lib.GlobalWorkerOptions.workerSrc = WORKER; return Promise.resolve(_lib); }
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = LIB; s.async = true;
      s.onload = function () { if (!root.pdfjsLib) return rej(new Error('PDF engine loaded but was unavailable.')); _lib = root.pdfjsLib; _lib.GlobalWorkerOptions.workerSrc = WORKER; res(_lib); };
      s.onerror = function () { rej(new Error('Could not load the PDF engine from the CDN — check your connection.')); };
      document.head.appendChild(s);
    });
  }

  function baseName(n) { return String(n || 'document').replace(/\.[^.]+$/, ''); }
  function fld(W, label, node) { return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: label }), node]); }
  async function getDoc(file) {
    var lib = await loadPdfJs();
    var buf = await file.arrayBuffer();
    return lib.getDocument({ data: buf }).promise;
  }

  /* generic PDF → raster-image tool (jpg / png / webp) */
  function rasterTool(mime, ext, quality) {
    return function (host, W) {
      var scale = W.el('select', { class: 'field' }); [['1.5', 'Standard'], ['2', 'High'], ['3', 'Very high (print)']].forEach(function (o) { scale.appendChild(W.el('option', { value: o[0], text: o[1] })); }); scale.value = '2';
      var input = W.el('input', { type: 'file', class: 'field', accept: 'application/pdf,.pdf', 'aria-label': 'Choose a PDF' });
      var status = W.el('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
      var grid = W.el('div', { class: 'wpages' });
      input.addEventListener('change', async function () {
        var f = input.files[0]; if (!f) return;
        grid.innerHTML = ''; status.className = 'note'; status.textContent = 'Loading PDF…';
        try {
          var doc = await getDoc(f);
          var n = Math.min(doc.numPages, 100);
          status.textContent = 'Rendering ' + n + ' page' + (n > 1 ? 's' : '') + '…';
          for (var i = 1; i <= n; i++) {
            var page = await doc.getPage(i);
            var vp = page.getViewport({ scale: +scale.value });
            var canvas = document.createElement('canvas'); canvas.width = vp.width; canvas.height = vp.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
            (function (idx, cv) {
              var thumb = cv.cloneNode(true); thumb.getContext('2d').drawImage(cv, 0, 0); thumb.className = 'wpage-thumb';
              var cell = W.el('div', { class: 'wpage' }, [thumb, W.el('button', { class: 'btn', type: 'button', text: 'Page ' + idx + ' — ' + ext.toUpperCase(), onClick: function () { cv.toBlob(function (b) { if (b) W.download(b, baseName(f.name) + '-p' + idx + '.' + ext); }, mime, quality); } })]);
              grid.appendChild(cell);
            })(i, canvas);
            status.textContent = 'Rendered ' + i + ' / ' + n;
          }
          status.textContent = 'Done — ' + n + ' page' + (n > 1 ? 's' : '') + (doc.numPages > 100 ? ' (first 100 shown)' : '') + '. Click a page to save it as ' + ext.toUpperCase() + '.';
        } catch (e) { status.className = 'note err'; status.textContent = /encrypt|password/i.test(e.message) ? 'This PDF is password-protected — remove the password first.' : 'Could not read that PDF.'; }
      });
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'PDF file', input), fld(W, 'Quality', scale)]));
      host.appendChild(status); host.appendChild(grid);
      host.appendChild(W.el('p', { class: 'note', text: 'Each page is rendered to an image in your browser — the PDF is never uploaded. Higher quality means larger files.' }));
    };
  }

  var T = {

    'pdf-to-png': rasterTool('image/png', 'png', undefined),
    'pdf-to-webp': rasterTool('image/webp', 'webp', 0.92),

    'pdf-to-jpg': function (host, W) {
      var scale = W.el('select', { class: 'field' }); [['1.5', 'Standard'], ['2', 'High'], ['3', 'Very high (print)']].forEach(function (o) { scale.appendChild(W.el('option', { value: o[0], text: o[1] })); }); scale.value = '2';
      var input = W.el('input', { type: 'file', class: 'field', accept: 'application/pdf,.pdf', 'aria-label': 'Choose a PDF' });
      var status = W.el('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
      var grid = W.el('div', { class: 'wpages' });
      input.addEventListener('change', async function () {
        var f = input.files[0]; if (!f) return;
        grid.innerHTML = ''; status.className = 'note'; status.textContent = 'Loading PDF…';
        try {
          var doc = await getDoc(f);
          var n = Math.min(doc.numPages, 100);
          status.textContent = 'Rendering ' + n + ' page' + (n > 1 ? 's' : '') + '…';
          for (var i = 1; i <= n; i++) {
            var page = await doc.getPage(i);
            var vp = page.getViewport({ scale: +scale.value });
            var canvas = document.createElement('canvas'); canvas.width = vp.width; canvas.height = vp.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
            (function (idx, cv) {
              var thumb = cv.cloneNode(true); thumb.getContext('2d').drawImage(cv, 0, 0); thumb.className = 'wpage-thumb';
              var cell = W.el('div', { class: 'wpage' }, [thumb, W.el('button', { class: 'btn', type: 'button', text: 'Page ' + idx + ' — JPG', onClick: function () { cv.toBlob(function (b) { if (b) W.download(b, baseName(f.name) + '-p' + idx + '.jpg'); }, 'image/jpeg', 0.92); } })]);
              grid.appendChild(cell);
            })(i, canvas);
            status.textContent = 'Rendered ' + i + ' / ' + n;
          }
          status.textContent = 'Done — ' + n + ' page' + (n > 1 ? 's' : '') + (doc.numPages > 100 ? ' (first 100 shown)' : '') + '. Click a page to save it as JPG.';
        } catch (e) { status.className = 'note err'; status.textContent = /encrypt|password/i.test(e.message) ? 'This PDF is password-protected — remove the password first.' : 'Could not read that PDF.'; }
      });
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'PDF file', input), fld(W, 'Quality', scale)]));
      host.appendChild(status); host.appendChild(grid);
      host.appendChild(W.el('p', { class: 'note', text: 'Each page is rendered to an image in your browser — the PDF is never uploaded. Higher quality means larger files.' }));
    },

    'pdf-to-text': function (host, W) {
      var input = W.el('input', { type: 'file', class: 'field', accept: 'application/pdf,.pdf', 'aria-label': 'Choose a PDF' });
      var status = W.el('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
      var out = W.el('textarea', { class: 'field wtext', rows: '14', readonly: 'readonly', 'aria-label': 'Extracted text' });
      input.addEventListener('change', async function () {
        var f = input.files[0]; if (!f) return;
        out.value = ''; status.className = 'note'; status.textContent = 'Loading PDF…';
        try {
          var doc = await getDoc(f);
          var parts = [];
          for (var i = 1; i <= doc.numPages; i++) {
            var page = await doc.getPage(i);
            var tc = await page.getTextContent();
            var pageText = tc.items.map(function (it) { return it.str; }).join(' ').replace(/\s+/g, ' ').trim();
            parts.push('--- Page ' + i + ' ---\n' + pageText);
            status.textContent = 'Extracted ' + i + ' / ' + doc.numPages;
          }
          out.value = parts.join('\n\n');
          var chars = out.value.length;
          status.textContent = chars > 20 ? 'Extracted text from ' + doc.numPages + ' page' + (doc.numPages > 1 ? 's' : '') + '.' : 'Almost no text found — this PDF is likely scanned images. Text extraction needs a real text layer (OCR is a different tool).';
        } catch (e) { status.className = 'note err'; status.textContent = /encrypt|password/i.test(e.message) ? 'This PDF is password-protected — remove the password first.' : 'Could not read that PDF.'; }
      });
      host.appendChild(fld(W, 'PDF file', input)); host.appendChild(status); host.appendChild(out);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.copyBtn('Copy text', function () { return out.value; }), W.el('button', { class: 'btn', type: 'button', text: 'Download .txt', onClick: function () { W.download(out.value, 'extracted.txt', 'text/plain'); } })]));
      host.appendChild(W.el('p', { class: 'note', text: 'Reads the PDF’s text layer in your browser. Works on real (digital) PDFs; scanned/image-only PDFs have no text to extract.' }));
    }
  };

  root.VKPdfView = { _lib: function () { return _lib; } };
  if (typeof module === 'object' && module.exports) module.exports = T;
  if (typeof root.VKW !== 'undefined') { Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); } }
})(typeof window !== 'undefined' ? window : globalThis);
