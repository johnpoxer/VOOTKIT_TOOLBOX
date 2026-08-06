/* tools-pdfmake.js — create PDFs from text / Markdown, in the browser.
 * Uses pdf-lib (MIT), lazy-loaded from a CDN only when the tool runs.
 * Layout logic (wrapText, parseMarkdown, script detection) is pure and
 * unit-tested in Node.
 *
 * UNICODE: pdf-lib's 14 standard fonts are WinAnsi-only — they THROW on any
 * character outside Latin-1 (emoji, ₹/₩, Devanagari, CJK, Arabic, Cyrillic…).
 * That made the tool fail hard on perfectly ordinary pasted text. We now detect
 * the script in use and lazy-embed the matching Noto font via fontkit, falling
 * back to the fast standard-font path only when the text really is WinAnsi-safe.
 * Characters no font can carry (colour emoji) are stripped and reported rather
 * than thrown, so a PDF is always produced. */
(function (root) {
  'use strict';

  var PDFLIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
  var FONTKIT_URL = 'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js';

  /* Unicode-capable fonts, chosen by script. Regular + bold where the PDF needs
     headings. All SIL Open Font License, served from the jsDelivr npm mirror.
     Every entry below was verified end-to-end in a real browser: fetched,
     embedded through fontkit with subsetting, drawn and saved. Do not add a
     script here without running that check — see UNSUPPORTED below for why. */
  var FV = '5.3.0';
  var FS = 'https://cdn.jsdelivr.net/npm/@fontsource/';
  var FONTS = {
    latin: {
      label: 'Noto Sans',
      regular: FS + 'noto-sans@' + FV + '/files/noto-sans-latin-400-normal.woff',
      bold: FS + 'noto-sans@' + FV + '/files/noto-sans-latin-700-normal.woff'
    },
    cyrillic: {
      label: 'Noto Sans Cyrillic',
      regular: FS + 'noto-sans@' + FV + '/files/noto-sans-cyrillic-400-normal.woff',
      bold: FS + 'noto-sans@' + FV + '/files/noto-sans-cyrillic-700-normal.woff'
    },
    greek: {
      label: 'Noto Sans Greek',
      regular: FS + 'noto-sans@' + FV + '/files/noto-sans-greek-400-normal.woff',
      bold: FS + 'noto-sans@' + FV + '/files/noto-sans-greek-700-normal.woff'
    },
    arabic: {
      label: 'Noto Sans Arabic',
      regular: FS + 'noto-sans-arabic@' + FV + '/files/noto-sans-arabic-arabic-400-normal.woff',
      bold: FS + 'noto-sans-arabic@' + FV + '/files/noto-sans-arabic-arabic-700-normal.woff'
    },
    hebrew: {
      label: 'Noto Sans Hebrew',
      regular: FS + 'noto-sans-hebrew@' + FV + '/files/noto-sans-hebrew-hebrew-400-normal.woff',
      bold: FS + 'noto-sans-hebrew@' + FV + '/files/noto-sans-hebrew-hebrew-700-normal.woff'
    },
    thai: {
      label: 'Noto Sans Thai',
      regular: FS + 'noto-sans-thai@' + FV + '/files/noto-sans-thai-thai-400-normal.woff',
      bold: FS + 'noto-sans-thai@' + FV + '/files/noto-sans-thai-thai-700-normal.woff'
    },
    sc: {
      label: 'Noto Sans SC',
      regular: FS + 'noto-sans-sc@' + FV + '/files/noto-sans-sc-chinese-simplified-400-normal.woff',
      bold: FS + 'noto-sans-sc@' + FV + '/files/noto-sans-sc-chinese-simplified-700-normal.woff'
    },
    jp: {
      label: 'Noto Sans JP',
      regular: FS + 'noto-sans-jp@' + FV + '/files/noto-sans-jp-japanese-400-normal.woff',
      bold: FS + 'noto-sans-jp@' + FV + '/files/noto-sans-jp-japanese-700-normal.woff'
    },
    kr: {
      label: 'Noto Sans KR',
      regular: FS + 'noto-sans-kr@' + FV + '/files/noto-sans-kr-korean-400-normal.woff',
      bold: FS + 'noto-sans-kr@' + FV + '/files/noto-sans-kr-korean-700-normal.woff'
    }
  };

  /* Scripts we deliberately refuse rather than attempt.
     Devanagari: @pdf-lib/fontkit@1.1.1 throws "regeneratorRuntime is not
     defined" while subsetting Noto Sans Devanagari, and embedding it without
     subsetting locks the renderer hard enough that the tab has to be killed —
     confirmed twice in a live browser. A clear message beats a frozen tab, so
     we stop before that happens. Tracked as a fix-roadmap item. */
  var UNSUPPORTED = {
    devanagari: 'Hindi, Marathi, Nepali and other Devanagari text can’t be embedded in a PDF in the browser yet — the font subsetter locks up on it. Use Markdown to PDF via a desktop tool for now, or send us the text and we’ll prioritise the fix.'
  };

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

  var _fontkit = null;
  function loadFontkit() {
    if (_fontkit) return Promise.resolve(_fontkit);
    if (root.fontkit) { _fontkit = root.fontkit; return Promise.resolve(_fontkit); }
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = FONTKIT_URL; s.async = true;
      s.onload = function () { _fontkit = root.fontkit; _fontkit ? res(_fontkit) : rej(new Error('Font engine failed to load.')); };
      s.onerror = function () { rej(new Error('Could not load the font engine — check your connection.')); };
      document.head.appendChild(s);
    });
  }

  var _fontBytes = {};
  function loadFontBytes(url) {
    if (_fontBytes[url]) return Promise.resolve(_fontBytes[url]);
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('Could not download the font needed for these characters.');
      return r.arrayBuffer();
    }).then(function (buf) { _fontBytes[url] = buf; return buf; });
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

  /* ---------- pure Unicode analysis (unit-tested) ---------- */

  /* WinAnsi (CP1252) is what pdf-lib's 14 standard fonts can encode: ASCII,
     Latin-1 Supplement, plus a handful of typographic characters in 0x80-0x9F.
     Anything else makes StandardFonts throw, which is why this check exists. */
  var WINANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ' +
                      '‘’“”•–—˜™š›œžŸ';

  function isWinAnsiChar(ch) {
    var c = ch.charCodeAt(0);
    if (c === 9 || c === 10 || c === 13) return true;       // tab / newlines
    if (c >= 0x20 && c <= 0x7E) return true;                 // ASCII printable
    if (c >= 0xA0 && c <= 0xFF) return true;                 // Latin-1 Supplement
    return WINANSI_EXTRA.indexOf(ch) !== -1;
  }

  function isWinAnsiSafe(text) {
    var s = String(text == null ? '' : text);
    for (var i = 0; i < s.length; i++) if (!isWinAnsiChar(s[i])) return false;
    return true;
  }

  /* Colour emoji and other pictographs cannot be embedded in a text PDF by any
     of these fonts. We strip them rather than fail, and tell the user. */
  function isPictograph(cp) {
    return (cp >= 0x1F000 && cp <= 0x1FAFF) ||   // emoji blocks
           (cp >= 0x2600 && cp <= 0x27BF) ||      // misc symbols + dingbats
           (cp >= 0x1F1E6 && cp <= 0x1F1FF) ||    // flags
           cp === 0xFE0F || cp === 0xFE0E ||      // variation selectors
           (cp >= 0x2190 && cp <= 0x21FF && false); // arrows are fine — keep them
  }

  /* Remove characters no embeddable text font can render. Returns
     { text, removed } so the UI can report honestly instead of silently lying. */
  function stripUnrenderable(text) {
    var s = String(text == null ? '' : text), out = '', removed = 0;
    for (var i = 0; i < s.length; i++) {
      var cp = s.codePointAt(i);
      var wide = cp > 0xFFFF;
      if (isPictograph(cp)) { removed++; if (wide) i++; continue; }
      out += wide ? s[i] + s[i + 1] : s[i];
      if (wide) i++;
    }
    return { text: out, removed: removed };
  }

  /* Which Noto font does this text need? First non-Latin script wins; that
     covers the overwhelmingly common case of one script plus Latin. */
  function detectScript(text) {
    var s = String(text == null ? '' : text);
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0x0400 && c <= 0x052F) return 'cyrillic';
      if (c >= 0x0370 && c <= 0x03FF) return 'greek';
      if (c >= 0x0590 && c <= 0x05FF) return 'hebrew';
      if (c >= 0x0600 && c <= 0x06FF) return 'arabic';
      if (c >= 0x0900 && c <= 0x097F) return 'devanagari';
      if (c >= 0x0E00 && c <= 0x0E7F) return 'thai';
      if (c >= 0x3040 && c <= 0x30FF) return 'jp';           // kana
      if (c >= 0xAC00 && c <= 0xD7AF) return 'kr';           // hangul
      if (c >= 0x1100 && c <= 0x11FF) return 'kr';           // hangul jamo
      if (c >= 0x4E00 && c <= 0x9FFF) return 'sc';           // han
      if (c >= 0x3400 && c <= 0x4DBF) return 'sc';
    }
    return 'latin';
  }

  /* ---------- font resolution (needs pdf-lib + network) ---------- */

  /* Returns { regular, bold, unicode, label }. Fast path: pure WinAnsi text uses
     the built-in standard fonts (zero download). Otherwise embed Noto via fontkit. */
  async function resolveFonts(PDFLib, pdf, text, opts) {
    if (isWinAnsiSafe(text)) {
      return {
        regular: await pdf.embedFont(PDFLib.StandardFonts[opts.font || 'Helvetica']),
        bold: await pdf.embedFont(PDFLib.StandardFonts[(opts.font === 'TimesRoman' ? 'TimesRomanBold' : opts.font === 'Courier' ? 'CourierBold' : 'HelveticaBold')]),
        unicode: false,
        label: opts.font || 'Helvetica'
      };
    }
    var script = detectScript(text);
    if (UNSUPPORTED[script]) throw new Error(UNSUPPORTED[script]);
    var fk = await loadFontkit();
    pdf.registerFontkit(fk);
    var spec = FONTS[script] || FONTS.latin;
    var pair = await Promise.all([loadFontBytes(spec.regular), loadFontBytes(spec.bold)]);
    return {
      regular: await pdf.embedFont(pair[0], { subset: true }),
      bold: await pdf.embedFont(pair[1], { subset: true }),
      unicode: true,
      label: spec.label
    };
  }

  /* ---------- PDF builders (need pdf-lib) ---------- */

  async function buildTextPdf(PDFLib, text, opts) {
    var clean = stripUnrenderable(text);
    var pdf = await PDFLib.PDFDocument.create();
    var fonts = await resolveFonts(PDFLib, pdf, clean.text, opts);
    var font = fonts.regular;
    var size = opts.size || 11, margin = opts.margin || 56, lh = size * 1.4;
    var dims = PAGE[opts.page || 'a4'];
    var page = pdf.addPage(dims), maxW = dims[0] - margin * 2, y = dims[1] - margin;
    String(clean.text).replace(/\r\n?/g, '\n').split('\n').forEach(function (para) {
      var lines = wrapText(para, maxW, function (s) { return font.widthOfTextAtSize(s, size); });
      lines.forEach(function (ln) {
        if (y < margin) { page = pdf.addPage(dims); y = dims[1] - margin; }
        page.drawText(ln, { x: margin, y: y, size: size, font: font, color: PDFLib.rgb(0.05, 0.07, 0.1) });
        y -= lh;
      });
    });
    var bytes = await pdf.save();
    bytes.vkMeta = { removed: clean.removed, fontLabel: fonts.label, unicode: fonts.unicode };
    return bytes;
  }

  async function buildMarkdownPdf(PDFLib, md, opts) {
    var clean = stripUnrenderable(md);
    var pdf = await PDFLib.PDFDocument.create();
    var fonts = await resolveFonts(PDFLib, pdf, clean.text, { font: 'Helvetica' });
    var reg = fonts.regular, bold = fonts.bold;
    var margin = opts.margin || 56, dims = PAGE[opts.page || 'a4'];
    var page = pdf.addPage(dims), maxW = dims[0] - margin * 2, y = dims[1] - margin;
    var STYLE = { h1: { s: 22, f: bold, gap: 10 }, h2: { s: 17, f: bold, gap: 8 }, h3: { s: 13, f: bold, gap: 6 }, p: { s: 11, f: reg, gap: 4 }, li: { s: 11, f: reg, gap: 3 } };
    function ensure(h) { if (y - h < margin) { page = pdf.addPage(dims); y = dims[1] - margin; } }
    parseMarkdown(clean.text).forEach(function (b) {
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
    var bytes = await pdf.save();
    bytes.vkMeta = { removed: clean.removed, fontLabel: fonts.label, unicode: fonts.unicode };
    return bytes;
  }

  /* ---------- UI ---------- */
  function bigInput(W, ph) { return W.el('textarea', { class: 'field wtext', rows: '12', placeholder: ph || '', spellcheck: 'false' }); }
  function sel(W, label, opts) { return W.el('select', { class: 'field', 'aria-label': label }, opts.map(function (o) { return W.el('option', { value: o[0], text: o[1] }); })); }
  /* Routed through VKDeliver so the gate, the download event and the run log
     live in one place — see the header of assets/js/deliver.js. Falls back to
     the original implementation if that script did not load. */
  function download(blob, name) {
    if (root.VKDeliver && root.VKDeliver.deliver) {
      var ws = document.getElementById('workspace');
      return root.VKDeliver.deliver(blob, name, { toolId: ws && ws.getAttribute('data-tool'), host: ws });
    }
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
          if (!ta.value.trim()) throw new Error('Add some text first — there is nothing to put in the PDF.');
          status.textContent = isWinAnsiSafe(ta.value) ? 'Building PDF…' : 'Embedding a Unicode font for these characters…';
          var bytes = await builder(PDFLib, ta.value, opts);
          download(new Blob([bytes], { type: 'application/pdf' }), filename);
          if (root.VKW && root.VKW.noteSuccess) root.VKW.noteSuccess();  // this module has its own download()
          var meta = bytes.vkMeta || {};
          var msg = 'Done — your PDF has downloaded.';
          if (meta.unicode) msg += ' Embedded ' + meta.fontLabel + ' so your characters render correctly.';
          if (meta.removed) msg += ' ' + meta.removed + ' emoji ' + (meta.removed === 1 ? 'was' : 'were') + ' removed — PDFs can’t embed colour emoji fonts.';
          status.textContent = msg;
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
    var title = stripUnrenderable(opts.title || '').text.slice(0, 80);
    var pdf = await PDFLib.PDFDocument.create();
    var dims = PAGE[opts.page || 'a4'];
    // The title is user input, so it needs the same Unicode path as the text tool.
    var fonts = await resolveFonts(PDFLib, pdf, title, { font: 'Helvetica' });
    var font = fonts.bold;
    var n = Math.max(1, Math.min(200, opts.count || 1));
    for (var i = 0; i < n; i++) {
      var p = pdf.addPage(dims);
      if (i === 0 && title) p.drawText(title, { x: 56, y: dims[1] - 96, size: 24, font: font, color: PDFLib.rgb(0.05, 0.07, 0.1) });
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
          if (root.VKW && root.VKW.noteSuccess) root.VKW.noteSuccess();
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

  root.VKPdfMake = {
    wrapText: wrapText, parseMarkdown: parseMarkdown,
    isWinAnsiSafe: isWinAnsiSafe, detectScript: detectScript, stripUnrenderable: stripUnrenderable
  };
  if (typeof module === 'object' && module.exports) module.exports = root.VKPdfMake;

  if (typeof root.VKW !== 'undefined') {
    Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); }
  }
})(typeof window !== 'undefined' ? window : globalThis);
