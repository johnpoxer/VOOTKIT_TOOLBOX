/* tools-pdfconv.js — document converters that need a third-party library,
 * each lazy-loaded from a CDN only when the tool runs. All processing is
 * in-browser: files are read into memory and never uploaded.
 *   OCR      -> Tesseract.js + pdf.js
 *   HTML->PDF-> html2pdf (html2canvas + jsPDF)
 *   Word->PDF-> mammoth (docx->html) + html2pdf
 *   Excel->PDF-> SheetJS (xlsx->html) + html2pdf */
(function (root) {
  'use strict';

  var URLS = {
    html2pdf: 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
    mammoth: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
    xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    tesseract: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js',
    pdfjs: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
    pdfjsWorker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
  };
  function loadScript(url, check) {
    return new Promise(function (res, rej) {
      if (check()) return res();
      var s = document.createElement('script'); s.src = url; s.async = true;
      s.onload = function () { check() ? res() : rej(new Error('A required library loaded but was unavailable.')); };
      s.onerror = function () { rej(new Error('Could not load a required library — check your connection and try again.')); };
      document.head.appendChild(s);
    });
  }
  async function getPdfJs() {
    await loadScript(URLS.pdfjs, function () { return !!root.pdfjsLib; });
    root.pdfjsLib.GlobalWorkerOptions.workerSrc = URLS.pdfjsWorker;
    return root.pdfjsLib;
  }
  async function htmlToPdf(html, opts) {
    await loadScript(URLS.html2pdf, function () { return !!root.html2pdf; });
    var holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-9999px;top:0;width:' + (opts.page === 'letter' ? '816px' : '794px') + ';padding:24px;background:#fff;color:#111;font:14px/1.55 system-ui,Arial,sans-serif';
    holder.innerHTML = '<style>table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:4px 8px;font-size:12px}h1,h2,h3{margin:.4em 0}</style>' + html;
    document.body.appendChild(holder);
    var opt = { margin: 12, filename: opts.filename || 'document.pdf', image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#fff' }, jsPDF: { unit: 'pt', format: opts.page || 'a4', orientation: 'portrait' } };
    try { await root.html2pdf().set(opt).from(holder).save(); }
    finally { holder.remove(); }
  }

  function fld(W, label, node) { return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: label }), node]); }
  function pageSel(W) { return W.el('select', { class: 'field', 'aria-label': 'Page size' }, [W.el('option', { value: 'a4', text: 'A4' }), W.el('option', { value: 'letter', text: 'US Letter' })]); }
  function baseName(n) { return String(n || 'document').replace(/\.[^.]+$/, ''); }

  var T = {

    /* ---------- HTML -> PDF ---------- */
    'html-to-pdf': function (host, W) {
      var ta = W.el('textarea', { class: 'field wtext', rows: '12', spellcheck: 'false', placeholder: '<h1>Title</h1>\n<p>Your HTML here…</p>' });
      ta.value = '<h1>Invoice</h1>\n<p>Paste your HTML and it becomes a PDF.</p>\n<ul>\n  <li>Headings, lists and tables render</li>\n  <li>Inline CSS is supported</li>\n</ul>';
      var ps = pageSel(W), status = W.el('p', { class: 'note' });
      var btn = W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Create PDF', onClick: async function () {
        status.className = 'note'; status.textContent = 'Rendering…'; btn.disabled = true;
        try { await htmlToPdf(ta.value, { page: ps.value, filename: 'page.pdf' }); status.textContent = 'Done — your PDF has downloaded.'; }
        catch (e) { status.className = 'note err'; status.textContent = e.message || 'Could not convert.'; }
        btn.disabled = false;
      } });
      host.appendChild(ta);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('label', { class: 'winline' }, [W.el('span', { class: 'wlab', text: 'Page' }), ps]), btn]));
      host.appendChild(status);
      host.appendChild(W.el('p', { class: 'note', text: 'Renders your HTML (with inline CSS) to a PDF in the browser. Images from other sites may be skipped for security (CORS).' }));
    },

    /* ---------- Word (.docx) -> PDF ---------- */
    'word-to-pdf': function (host, W) {
      var input = W.el('input', { type: 'file', class: 'field', accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'aria-label': 'Choose a Word document' });
      var ps = pageSel(W), status = W.el('p', { class: 'note' });
      var btn = W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Convert to PDF', disabled: 'disabled', onClick: async function () {
        var f = input.files[0]; if (!f) return;
        status.className = 'note'; status.textContent = 'Converting…'; btn.disabled = true;
        try {
          await loadScript(URLS.mammoth, function () { return !!root.mammoth; });
          var result = await root.mammoth.convertToHtml({ arrayBuffer: await f.arrayBuffer() });
          if (!result.value || !result.value.trim()) throw new Error('No readable content found in that document.');
          await htmlToPdf(result.value, { page: ps.value, filename: baseName(f.name) + '.pdf' });
          status.textContent = 'Done — your PDF has downloaded.';
        } catch (e) { status.className = 'note err'; status.textContent = /library/i.test(e.message) ? e.message : 'Could not convert that file. Only modern .docx files are supported (not old .doc).'; }
        btn.disabled = false;
      } });
      input.addEventListener('change', function () { btn.disabled = !input.files[0]; });
      host.appendChild(fld(W, 'Word document (.docx)', input));
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('label', { class: 'winline' }, [W.el('span', { class: 'wlab', text: 'Page' }), ps]), btn]));
      host.appendChild(status);
      host.appendChild(W.el('p', { class: 'note', text: 'Converts .docx text, headings, lists and tables. Complex layouts and some styling may simplify. Runs entirely in your browser.' }));
    },

    /* ---------- Excel (.xlsx/.csv) -> PDF ---------- */
    'excel-to-pdf': function (host, W) {
      var input = W.el('input', { type: 'file', class: 'field', accept: '.xlsx,.xls,.csv', 'aria-label': 'Choose a spreadsheet' });
      var ps = pageSel(W), status = W.el('p', { class: 'note' });
      var btn = W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Convert to PDF', disabled: 'disabled', onClick: async function () {
        var f = input.files[0]; if (!f) return;
        status.className = 'note'; status.textContent = 'Converting…'; btn.disabled = true;
        try {
          await loadScript(URLS.xlsx, function () { return !!root.XLSX; });
          var wb = root.XLSX.read(await f.arrayBuffer(), { type: 'array' });
          var html = wb.SheetNames.map(function (name) {
            return '<h2>' + name + '</h2>' + root.XLSX.utils.sheet_to_html(wb.Sheets[name]);
          }).join('<div style="page-break-after:always"></div>');
          await htmlToPdf(html, { page: ps.value, filename: baseName(f.name) + '.pdf' });
          status.textContent = 'Done — your PDF has downloaded.';
        } catch (e) { status.className = 'note err'; status.textContent = /library/i.test(e.message) ? e.message : 'Could not read that spreadsheet.'; }
        btn.disabled = false;
      } });
      input.addEventListener('change', function () { btn.disabled = !input.files[0]; });
      host.appendChild(fld(W, 'Spreadsheet (.xlsx, .xls, .csv)', input));
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('label', { class: 'winline' }, [W.el('span', { class: 'wlab', text: 'Page' }), ps]), btn]));
      host.appendChild(status);
      host.appendChild(W.el('p', { class: 'note', text: 'Each sheet becomes a table on its own page. Formulas show their last-calculated values. Runs in your browser.' }));
    },

    /* ---------- OCR (image / scanned PDF -> text) ---------- */
    'pdf-ocr': function (host, W) {
      var input = W.el('input', { type: 'file', class: 'field', accept: 'application/pdf,.pdf,image/*', 'aria-label': 'Choose a PDF or image' });
      var lang = W.el('select', { class: 'field', 'aria-label': 'Language' }, [['eng', 'English'], ['spa', 'Spanish'], ['fra', 'French'], ['deu', 'German'], ['ita', 'Italian'], ['por', 'Portuguese']].map(function (o) { return W.el('option', { value: o[0], text: o[1] }); }));
      var status = W.el('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
      var out = W.el('textarea', { class: 'field wtext', rows: '14', readonly: 'readonly', 'aria-label': 'Recognised text', spellcheck: 'false' });
      var btn = W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Extract text', disabled: 'disabled', onClick: async function () {
        var f = input.files[0]; if (!f) return;
        out.value = ''; status.className = 'note'; status.textContent = 'Loading OCR engine…'; btn.disabled = true;
        try {
          await loadScript(URLS.tesseract, function () { return !!root.Tesseract; });
          var canvases = [];
          if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) {
            var lib = await getPdfJs();
            var doc = await lib.getDocument({ data: await f.arrayBuffer() }).promise;
            var n = Math.min(doc.numPages, 20);
            for (var i = 1; i <= n; i++) {
              var page = await doc.getPage(i);
              var vp = page.getViewport({ scale: 2 });
              var cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
              await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
              canvases.push(cv);
            }
          } else {
            var url = URL.createObjectURL(f);
            var img = await new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('Could not read that image.')); }; im.src = url; });
            var c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0);
            URL.revokeObjectURL(url); canvases.push(c);
          }
          var parts = [];
          for (var p = 0; p < canvases.length; p++) {
            status.textContent = 'Reading page ' + (p + 1) + ' / ' + canvases.length + '… (this can take a moment)';
            var r = await root.Tesseract.recognize(canvases[p], lang.value);
            parts.push(canvases.length > 1 ? '--- Page ' + (p + 1) + ' ---\n' + r.data.text.trim() : r.data.text.trim());
          }
          out.value = parts.join('\n\n');
          status.textContent = out.value.length > 10 ? 'Done — recognised text from ' + canvases.length + ' page' + (canvases.length > 1 ? 's' : '') + '.' : 'Very little text found — the image may be low-resolution or blank.';
        } catch (e) { status.className = 'note err'; status.textContent = e.message || 'OCR failed.'; }
        btn.disabled = false;
      } });
      input.addEventListener('change', function () { btn.disabled = !input.files[0]; });
      host.appendChild(fld(W, 'Scanned PDF or image', input));
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('label', { class: 'winline' }, [W.el('span', { class: 'wlab', text: 'Language' }), lang]), btn]));
      host.appendChild(status); host.appendChild(out);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.copyBtn('Copy text', function () { return out.value; }), W.el('button', { class: 'btn', type: 'button', text: 'Download .txt', onClick: function () { W.download(out.value, 'ocr.txt', 'text/plain'); } })]));
      host.appendChild(W.el('p', { class: 'note', text: 'Optical character recognition runs entirely in your browser (Tesseract.js). The first run downloads the language model, so it is slower; scanned PDFs are limited to the first 20 pages.' }));
    },

    /* ---------- image OCR (image -> text) ---------- */
    'image-to-text': function (host, W) {
      var input = W.el('input', { type: 'file', class: 'field', accept: 'image/*', 'aria-label': 'Choose an image' });
      var lang = W.el('select', { class: 'field', 'aria-label': 'Language' }, [['eng', 'English'], ['spa', 'Spanish'], ['fra', 'French'], ['deu', 'German'], ['ita', 'Italian'], ['por', 'Portuguese']].map(function (o) { return W.el('option', { value: o[0], text: o[1] }); }));
      var status = W.el('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
      var out = W.el('textarea', { class: 'field wtext', rows: '12', readonly: 'readonly', 'aria-label': 'Recognised text', spellcheck: 'false' });
      var btn = W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Extract text', disabled: 'disabled', onClick: async function () {
        var f = input.files[0]; if (!f) return;
        out.value = ''; status.className = 'note'; status.textContent = 'Loading OCR engine…'; btn.disabled = true;
        try {
          await loadScript(URLS.tesseract, function () { return !!root.Tesseract; });
          var url = URL.createObjectURL(f);
          var img = await new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('Could not read that image.')); }; im.src = url; });
          var c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0); URL.revokeObjectURL(url);
          status.textContent = 'Reading text… (first run downloads the language model)';
          var r = await root.Tesseract.recognize(c, lang.value);
          out.value = r.data.text.trim();
          status.textContent = out.value.length > 5 ? 'Done.' : 'Very little text found — the image may be low-resolution or blank.';
        } catch (e) { status.className = 'note err'; status.textContent = e.message || 'OCR failed.'; }
        btn.disabled = false;
      } });
      input.addEventListener('change', function () { btn.disabled = !input.files[0]; });
      host.appendChild(fld(W, 'Image', input));
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('label', { class: 'winline' }, [W.el('span', { class: 'wlab', text: 'Language' }), lang]), btn]));
      host.appendChild(status); host.appendChild(out);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.copyBtn('Copy text', function () { return out.value; }), W.el('button', { class: 'btn', type: 'button', text: 'Download .txt', onClick: function () { W.download(out.value, 'text.txt', 'text/plain'); } })]));
      host.appendChild(W.el('p', { class: 'note', text: 'Reads text from a photo or screenshot entirely in your browser (Tesseract.js). Clear, high-contrast images work best.' }));
    }

  };

  root.VKPdfConv = { _has: function () { return Object.keys(T); } };
  if (typeof module === 'object' && module.exports) module.exports = T;

  if (typeof root.VKW !== 'undefined') {
    Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); }
  }
})(typeof window !== 'undefined' ? window : globalThis);
