/* tools-pdfmake.js — create PDFs from text / Markdown, in the browser.
 * Uses pdf-lib (MIT), lazy-loaded from a CDN only when the tool runs.
 * Layout logic (wrapText, parseMarkdown) is pure and unit-tested in Node. */
(function (root) {
  'use strict';

  var PDFLIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
  var _pdflib = null;
  function loadPdfLib() {
    if (_pdflib) return Promise.resolve(_pdflib);
    if (root.PDFLib) { _pdflib = root.PDFLib; return Promise.resolve(_pdflib); }
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = PDFLIB_URL; s.async = true;
      s.onload = function () { _pdflib = root.PDFLib; _pdflib ? res(_pdflib) : rej(new Error('PDF engine failed to load.')); };
      s.onerror = function () { rej(new Error('Could not load the PDF engine — check your connection.')); };
      document.head.appendChild(s);
    });
  }

  var PAGE = { a4: [595.28, 841.89], letter: [612, 792] };

  /* ---------- pure layout logic ---------- */

  // Wrap `text` into lines no wider than maxWidth. measure(str) -> width.
  function wrapText(text, maxWidth, measure) {
    var words = String(text).split(/\s+/).filter(Boolean);
    if (!words.length) return [''];
    var lines = [], cur = '';
    words.forEach(function (w) {
      var test = cur ? cur + ' ' + w : w;
      if (cur && measure(test) > maxWidth) { lines.push(cur); cur = w; }
      else cur = test;
      while (measure(cur) > maxWidth && cur.length > 1) {
        var i = cur.length;
        while (i > 1 && measure(cur.slice(0, i)) > maxWidth) i--;
        lines.push(cur.slice(0, i)); cur = cur.slice(i);
      }
    });
    if (cur) lines.push(cur);
    return lines;
  }

  // Parse a small subset of Markdown into typed blocks.
  function parseMarkdown(md) {
    function clean(s) { return s.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1'); }
    var blocks = [];
    String(md).replace(/\r\n?/g, '\n').split('\n').forEach(function (raw) {
      var line = raw.replace(/\s+$/, '');
      var m;
      if (!line.trim()) blocks.push({ type: 'space', text: '' });
      else if ((m = line.match(/^###\s+(.*)/))) blocks.push({ type: 'h3', text: clean(m[1]) });
      else if ((m = line.match(/^##\s+(.*)/))) blocks.push({ type: 'h2', text: clean(m[1]) });
      else if ((m = line.match(/^#\s+(.*)/))) blocks.push({ type: 'h1', text: clean(m[1]) });
      else if ((m = line.match(/^\s*[-*]\s+(.*)/))) blocks.push({ type: 'li', text: clean(m[1]) });
      else if ((m = line.match(/^\s*\d+\.\s+(.*)/))) blocks.push({ type: 'li', text: clean(m[1]) });
      else blocks.push({ type: 'p', text: clean(line) });
    });
    return blocks;
  }

  /* ---------- PDF builders (need pdf-lib) ---------- */

  async function buildTextPdf(PDFLib, text, opts) {
    var pdf = await PDFLib.PDFDocument.create();
    var font = await pdf.embedFont(PDFLib.StandardFonts[opts.font || 'Helvetica']);
    var size = opts.size || 11, margin = opts.margin || 56, lh = size * 1.4;
    var dims = PAGE[opts.page || 'a4'];
    var page = pdf.addPage(dims), maxW = dims[0] - margin * 2, y = dims[1] - margin;
    String(text).replace(/\r\n?/g, '\n').split('\n').forEach(function (para) {
      var lines = wrapText(para, maxW, function (s) { return font.widthOfTextAtSize(s, size); });
      lines.forEach(function (ln) {
        if (y < margin) { page = pdf.addPage(dims); y = dims[1] - margin; }
        page.drawText(ln, { x: margin, y: y, size: size, font: font, color: PDFLib.rgb(0.05, 0.07, 0.1) });
        y -= lh;
      });
    });
    return pdf.save();
  }

  async function buildMarkdownPdf(PDFLib, md, opts) {
    var pdf = await PDFLib.PDFDocument.create();
    var reg = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    var bold = await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
    var margin = opts.margin || 56, dims = PAGE[opts.page || 'a4'];
    var page = pdf.addPage(dims), maxW = dims[0] - margin * 2, y = dims[1] - margin;
    var STYLE = { h1: { s: 22, f: bold, gap: 10 }, h2: { s: 17, f: bold, gap: 8 }, h3: { s: 13, f: bold, gap: 6 }, p: { s: 11, f: reg, gap: 4 }, li: { s: 11, f: reg, gap: 3 } };
    function ensure(h) { if (y - h < margin) { page = pdf.addPage(dims); y = dims[1] - margin; } }
    parseMarkdown(md).forEach(function (b) {
      if (b.type === 'space') { y -= 8; return; }
      var st = STYLE[b.type] || STYLE.p, lh = st.s * 1.35;
      var prefix = b.type === 'li' ? '•  ' : '';
      var indent = b.type === 'li' ? 14 : 0;
      var lines = wrapText(prefix + b.text, maxW - indent, function (s) { return st.f.widthOfTextAtSize(s, st.s); });
      lines.forEach(function (ln, i) {
        ensure(lh);
        page.drawText(ln, { x: margin + indent, y: y, size: st.s, font: st.f, color: PDFLib.rgb(0.05, 0.07, 0.1) });
        y -= lh;
      });
      y -= st.gap;
    });
    return pdf.save();
  }

  /* ---------- UI ---------- */
  function bigInput(W, ph) { return W.el('textarea', { class: 'field wtext', rows: '12', placeholder: ph || '', spellcheck: 'false' }); }
  function sel(W, label, opts) { return W.el('select', { class: 'field', 'aria-label': label }, opts.map(function (o) { return W.el('option', { value: o[0], text: o[1] }); })); }
  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function makeTool(defaultText, builder, filename, extraFontSelect) {
    return function (host, W) {
      var ta = bigInput(W, defaultText); ta.value = defaultText;
      var pageSel = sel(W, 'Page size', [['a4', 'A4'], ['letter', 'US Letter']]);
      var controls = [W.el('label', { class: 'winline' }, [W.el('span', { class: 'wlab', text: 'Page' }), pageSel])];
      var fontSel = null;
      if (extraFontSelect) {
        fontSel = sel(W, 'Font', [['Helvetica', 'Helvetica'], ['TimesRoman', 'Times'], ['Courier', 'Courier']]);
        controls.push(W.el('label', { class: 'winline' }, [W.el('span', { class: 'wlab', text: 'Font' }), fontSel]));
      }
      var status = W.el('p', { class: 'note' });
      var err = W.el('p', { class: 'note err', hidden: 'hidden', role: 'alert' });
      var btn = W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Create PDF', onClick: async function () {
        err.hidden = true; status.textContent = 'Building PDF…'; btn.disabled = true;
        try {
          var PDFLib = await loadPdfLib();
          var opts = { page: pageSel.value, margin: 56 };
          if (fontSel) opts.font = fontSel.value;
          var bytes = await builder(PDFLib, ta.value, opts);
          download(new Blob([bytes], { type: 'application/pdf' }), filename);
          status.textContent = 'Done — your PDF has downloaded.';
        } catch (e) { status.textContent = ''; err.hidden = false; err.textContent = e.message || 'Could not build the PDF.'; }
        btn.disabled = false;
      } });
      host.appendChild(ta);
      host.appendChild(W.el('div', { class: 'wbtns' }, controls));
      host.appendChild(W.el('div', { class: 'wbtns' }, [btn]));
      host.appendChild(status); host.appendChild(err);
      host.appendChild(W.el('p', { class: 'note', text: 'Built entirely in your browser with pdf-lib — your text is never uploaded.' }));
    };
  }

  async function buildBlankPdf(PDFLib, opts) {
    var pdf = await PDFLib.PDFDocument.create();
    var dims = PAGE[opts.page || 'a4'];
    var font = await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
    var n = Math.max(1, Math.min(200, opts.count || 1));
    for (var i = 0; i < n; i++) {
      var p = pdf.addPage(dims);
      if (i === 0 && opts.title) p.drawText(String(opts.title).slice(0, 80), { x: 56, y: dims[1] - 96, size: 24, font: font, color: PDFLib.rgb(0.05, 0.07, 0.1) });
    }
    return pdf.save();
  }

  var T = {
    'text-to-pdf': makeTool('Paste or type your text here.\n\nEach blank line starts a new paragraph. Long lines wrap automatically to the page width.', buildTextPdf, 'document.pdf', true),
    'markdown-to-pdf': makeTool('# Heading\n\nSome **markdown** text with a list:\n\n- First point\n- Second point\n\n## Subheading\n\nAnother paragraph.', buildMarkdownPdf, 'markdown.pdf', false),

    'pdf-creator': function (host, W) {
      var pageSel = sel(W, 'Page size', [['a4', 'A4'], ['letter', 'US Letter']]);
      var count = W.el('input', { class: 'field', type: 'number', value: '1', min: '1', max: '200', 'aria-label': 'Number of pages' });
      var title = W.el('input', { class: 'field', type: 'text', placeholder: 'Optional title on page 1', 'aria-label': 'Title' });
      var status = W.el('p', { class: 'note' });
      var err = W.el('p', { class: 'note err', hidden: 'hidden', role: 'alert' });
      var btn = W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Create PDF', onClick: async function () {
        err.hidden = true; status.textContent = 'Building PDF…'; btn.disabled = true;
        try {
          var PDFLib = await loadPdfLib();
          var bytes = await buildBlankPdf(PDFLib, { page: pageSel.value, count: +count.value, title: title.value.trim() });
          download(new Blob([bytes], { type: 'application/pdf' }), 'blank.pdf');
          status.textContent = 'Done — your PDF has downloaded.';
        } catch (e) { status.textContent = ''; err.hidden = false; err.textContent = e.message || 'Could not build the PDF.'; }
        btn.disabled = false;
      } });
      host.appendChild(W.el('div', { class: 'wbtns' }, [
        W.el('label', { class: 'winline' }, [W.el('span', { class: 'wlab', text: 'Page' }), pageSel]),
        W.el('label', { class: 'winline' }, [W.el('span', { class: 'wlab', text: 'Pages' }), count])
      ]));
      host.appendChild(W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: 'Title (optional)' }), title]));
      host.appendChild(W.el('div', { class: 'wbtns' }, [btn]));
      host.appendChild(status); host.appendChild(err);
      host.appendChild(W.el('p', { class: 'note', text: 'Creates a fresh blank PDF you can print, annotate or fill. Built in your browser — nothing is uploaded.' }));
    }
  };

  root.VKPdfMake = { wrapText: wrapText, parseMarkdown: parseMarkdown };
  if (typeof module === 'object' && module.exports) module.exports = root.VKPdfMake;

  if (typeof root.VKW !== 'undefined') {
    Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); }
  }
})(typeof window !== 'undefined' ? window : globalThis);
