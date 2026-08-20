/* tools-pdf.js — PDF tools. Uses pdf-lib (MIT), lazy-loaded from a CDN only
 * when a PDF tool is actually opened, so it never taxes other pages.
 * All processing is in-browser: PDFs are never uploaded. */
(function (root) {
  'use strict';

  var PDFLIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
  var PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
  var PDFJS_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  var _pdflib = null;
  var _pdfjs = null;
  function loadPdfLib() {
    if (_pdflib) return Promise.resolve(_pdflib);
    if (root.PDFLib) { _pdflib = root.PDFLib; return Promise.resolve(_pdflib); }
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = PDFLIB_URL; s.async = true;
      s.onload = function () { _pdflib = root.PDFLib; _pdflib ? res(_pdflib) : rej(new Error('PDF engine failed to load.')); };
      s.onerror = function () { rej(new Error('Could not load the PDF engine — check your connection and try again.')); };
      document.head.appendChild(s);
    });
  }
  function loadPdfJs() {
    if (_pdfjs) return Promise.resolve(_pdfjs);
    if (root.pdfjsLib) { _pdfjs = root.pdfjsLib; _pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL; return Promise.resolve(_pdfjs); }
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = PDFJS_URL; s.async = true;
      s.onload = function () { _pdfjs = root.pdfjsLib; if (!_pdfjs) return rej(new Error('PDF renderer failed to load.')); _pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL; res(_pdfjs); };
      s.onerror = function () { rej(new Error('Could not load the PDF renderer — check your connection and try again.')); };
      document.head.appendChild(s);
    });
  }

  function baseName(n) { return String(n || 'document').replace(/\.[^.]+$/, ''); }
  function pdfBlob(bytes) { return new Blob([bytes], { type: 'application/pdf' }); }

  async function loadDoc(PDFLib, file) {
    try {
      return await PDFLib.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: false });
    } catch (e) {
      if (/encrypt/i.test(e.message)) throw new Error('“' + file.name + '” is password-protected. Remove the password in your PDF viewer first, then try again.');
      throw new Error('“' + file.name + '” could not be opened — it may be corrupted or not a real PDF.');
    }
  }

  /* parse "1-3, 5, 8-10" into zero-based indices within [0,total) */
  function parseRanges(str, total) {
    var out = [], seen = {};
    String(str || '').split(',').forEach(function (part) {
      part = part.trim(); if (!part) return;
      var m = part.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) { for (var i = +m[1]; i <= +m[2]; i++) add(i); }
      else if (/^\d+$/.test(part)) add(+part);
    });
    function add(oneBased) { var i = oneBased - 1; if (i >= 0 && i < total && !seen[i]) { seen[i] = 1; out.push(i); } }
    return out;
  }

  /* rasterise any browser-decodable image (webp, png, jpg…) to PNG bytes,
     so pdf-lib (which only embeds PNG/JPG) can place it. */
  function imageFileToPngBytes(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? b.arrayBuffer().then(res, rej) : rej(new Error('Could not convert “' + file.name + '”.')); }, 'image/png');
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('“' + file.name + '” could not be read as an image.')); };
      img.src = url;
    });
  }
  var IMG_PAGE = { a4: [595.28, 841.89], letter: [612, 792] };
  async function buildImagePdf(PDFLib, files, o, api) {
    var pdf = await PDFLib.PDFDocument.create();
    for (var i = 0; i < files.length; i++) {
      var img = await pdf.embedPng(await imageFileToPngBytes(files[i]));
      var dims = o.size === 'fit' ? [img.width, img.height] : IMG_PAGE[o.size];
      var page = pdf.addPage(dims);
      var m = o.margin || 0, maxW = page.getWidth() - m * 2, maxH = page.getHeight() - m * 2;
      var scale = o.size === 'fit' ? 1 : Math.min(maxW / img.width, maxH / img.height, 1);
      var w = img.width * scale, h = img.height * scale;
      page.drawImage(img, { x: (page.getWidth() - w) / 2, y: (page.getHeight() - h) / 2, width: w, height: h });
      api.progress((i + 1) / files.length * 0.9);
    }
    return pdf.save();
  }
  var IMG_TO_PDF_OPTS = [
    { k: 'size', label: 'Page size', type: 'select', def: 'fit',
      options: [{ v: 'fit', label: 'Fit to each image' }, { v: 'a4', label: 'A4 portrait' }, { v: 'letter', label: 'US Letter' }] },
    { k: 'margin', label: 'Margin (pt)', def: 0, min: 0, max: 100, step: 5 }
  ];

  var T = {

    'compress-pdf': {
      accept: 'application/pdf,.pdf', action: 'Compress PDF', dropLabel: 'Choose a PDF to compress', maxBytes: 100 * 1024 * 1024,
      options: [
        { k: 'quality', label: 'Compression level', type: 'select', def: '0.7', options: [
          { v: '0.85', label: 'Maximum quality' }, { v: '0.7', label: 'Balanced — recommended' }, { v: '0.5', label: 'Smallest size' }
        ] },
        { k: 'scale', label: 'Page resolution', type: 'select', def: '1', options: [
          { v: '1', label: 'Full size' }, { v: '0.75', label: 'Medium' }, { v: '0.5', label: 'Compact' }
        ] }
      ],
      process: async function (files, o, api) {
        var file = files[0];
        api.status('Loading the PDF engine…');
        var libs = await Promise.all([loadPdfJs(), loadPdfLib()]);
        var pdfjs = libs[0], PDFLib = libs[1];
        var doc;
        try { doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise; }
        catch (e) { throw new Error(/password/i.test(e && e.message) ? 'This PDF is password-protected. Remove its password first.' : 'That PDF could not be opened. It may be damaged or incomplete.'); }
        var out = await PDFLib.PDFDocument.create(), pageCount = doc.numPages;
        for (var i = 1; i <= pageCount; i++) {
          api.status('Compressing page ' + i + ' of ' + pageCount + '…');
          var pg = await doc.getPage(i), vp = pg.getViewport({ scale: (+o.scale || 1) * 1.5 });
          var canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(vp.width)); canvas.height = Math.max(1, Math.round(vp.height));
          await pg.render({ canvasContext: canvas.getContext('2d', { alpha: false }), viewport: vp }).promise;
          var jpg = await new Promise(function (resolve, reject) { canvas.toBlob(function (blob) { blob ? resolve(blob) : reject(new Error('A PDF page could not be compressed.')); }, 'image/jpeg', +o.quality || 0.7); });
          var img = await out.embedJpg(await jpg.arrayBuffer());
          var page = out.addPage([img.width, img.height]); page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
          canvas.width = canvas.height = 1;
          api.progress(i / pageCount * 0.94);
        }
        if (doc.destroy) await doc.destroy();
        api.status('Rebuilding your PDF…');
        var saved = await out.save(), blob = pdfBlob(saved), reduction = Math.round((1 - blob.size / file.size) * 100);
        return {
          stats: [
            { label: 'Original', value: api.bytes(file.size) }, { label: 'Compressed', value: api.bytes(blob.size) },
            { label: 'Pages', value: pageCount }, { label: 'Reduction', value: reduction > 0 ? reduction + '% smaller' : 'Already optimised' }
          ],
          downloads: [{ label: 'Download compressed PDF', blob: blob, name: baseName(file.name) + '-compressed.pdf' }],
          status: 'Your compressed PDF is ready',
          note: reduction > 0 ? 'The new file is ' + reduction + '% smaller. Keep the original if you may need selectable text or maximum print quality.' : 'This PDF was already compact. Try the Smallest size setting if reducing size matters more than quality.'
        };
      }
    },

    'merge-pdf': {
      accept: 'application/pdf,.pdf', multiple: true, maxFiles: 20, action: 'Merge PDFs',
      dropLabel: 'Choose PDFs to merge (in order)', maxBytes: 100 * 1024 * 1024,
      options: [],
      process: async function (files, o, api) {
        if (files.length < 2) throw new Error('Choose at least two PDFs to merge.');
        var PDFLib = await loadPdfLib();
        var out = await PDFLib.PDFDocument.create();
        var pages = 0;
        for (var i = 0; i < files.length; i++) {
          var doc = await loadDoc(PDFLib, files[i]);
          var copied = await out.copyPages(doc, doc.getPageIndices());
          copied.forEach(function (p) { out.addPage(p); pages++; });
          api.progress((i + 1) / files.length * 0.9);
        }
        var bytes = await out.save();
        return {
          stats: [
            { label: 'Files merged', value: files.length },
            { label: 'Total pages', value: pages },
            { label: 'Output size', value: api.bytes(bytes.length) }
          ],
          downloads: [{ label: 'Download merged PDF', blob: pdfBlob(bytes), name: 'merged.pdf' }],
          status: 'Merged ' + files.length + ' PDFs',
          note: 'Files were combined in the order shown in the list. Add them one at a time or several at once, and use the arrows to reorder before merging.'
        };
      }
    },

    'split-pdf': {
      accept: 'application/pdf,.pdf', action: 'Extract pages',
      dropLabel: 'Choose a PDF to split',
      options: [{ k: 'ranges', label: 'Pages to keep', type: 'text', def: '1-3' }],
      process: async function (files, o, api) {
        var PDFLib = await loadPdfLib();
        var doc = await loadDoc(PDFLib, files[0]);
        var total = doc.getPageCount();
        var ranges = String((document.getElementById('ft-ranges') || {}).value || '');
        var idx = parseRanges(ranges, total);
        if (!idx.length) throw new Error('No valid pages in “' + ranges + '”. This PDF has ' + total + ' pages — try something like 1-3 or 2,5,7.');
        var out = await PDFLib.PDFDocument.create();
        var copied = await out.copyPages(doc, idx);
        copied.forEach(function (p) { out.addPage(p); });
        api.progress(0.8);
        var bytes = await out.save();
        return {
          stats: [
            { label: 'Original pages', value: total },
            { label: 'Extracted', value: idx.length },
            { label: 'Output size', value: api.bytes(bytes.length) }
          ],
          downloads: [{ label: 'Download extracted PDF', blob: pdfBlob(bytes), name: baseName(files[0].name) + '-pages.pdf' }],
          status: 'Extracted ' + idx.length + ' pages'
        };
      }
    },

    'rotate-pdf': {
      accept: 'application/pdf,.pdf', action: 'Rotate',
      dropLabel: 'Choose a PDF to rotate',
      options: [
        { k: 'deg', label: 'Rotate by', type: 'select', def: 90,
          options: [{ v: 90, label: '90° clockwise' }, { v: 180, label: '180°' }, { v: 270, label: '270° (90° anti-clockwise)' }] },
        { k: 'which', label: 'Which pages', type: 'text', def: 'all' }
      ],
      process: async function (files, o, api) {
        var PDFLib = await loadPdfLib();
        var doc = await loadDoc(PDFLib, files[0]);
        var total = doc.getPageCount();
        var whichRaw = String((document.getElementById('ft-which') || {}).value || 'all').trim();
        var pages = whichRaw.toLowerCase() === 'all' ? doc.getPageIndices() : parseRanges(whichRaw, total);
        if (!pages.length) throw new Error('No pages matched “' + whichRaw + '”. Use “all” or a range like 1-3.');
        pages.forEach(function (i) {
          var pg = doc.getPage(i);
          pg.setRotation(PDFLib.degrees((pg.getRotation().angle + o.deg) % 360));
        });
        api.progress(0.8);
        var bytes = await doc.save();
        return {
          stats: [{ label: 'Pages rotated', value: pages.length }, { label: 'Rotation', value: o.deg + '°' }, { label: 'Size', value: api.bytes(bytes.length) }],
          downloads: [{ label: 'Download', blob: pdfBlob(bytes), name: baseName(files[0].name) + '-rotated.pdf' }],
          status: 'Rotated'
        };
      }
    },

    'delete-pdf-pages': {
      accept: 'application/pdf,.pdf', action: 'Delete pages',
      dropLabel: 'Choose a PDF',
      options: [{ k: 'del', label: 'Pages to remove', type: 'text', def: '2' }],
      process: async function (files, o, api) {
        var PDFLib = await loadPdfLib();
        var doc = await loadDoc(PDFLib, files[0]);
        var total = doc.getPageCount();
        var raw = String((document.getElementById('ft-del') || {}).value || '');
        var remove = parseRanges(raw, total);
        if (!remove.length) throw new Error('No valid pages in “' + raw + '”. This PDF has ' + total + ' pages.');
        if (remove.length >= total) throw new Error('That would remove every page — keep at least one.');
        var keep = doc.getPageIndices().filter(function (i) { return remove.indexOf(i) === -1; });
        var out = await PDFLib.PDFDocument.create();
        var copied = await out.copyPages(doc, keep);
        copied.forEach(function (p) { out.addPage(p); });
        api.progress(0.8);
        var bytes = await out.save();
        return {
          stats: [{ label: 'Removed', value: remove.length }, { label: 'Remaining', value: keep.length }, { label: 'Size', value: api.bytes(bytes.length) }],
          downloads: [{ label: 'Download', blob: pdfBlob(bytes), name: baseName(files[0].name) + '-edited.pdf' }],
          status: 'Removed ' + remove.length + ' pages'
        };
      }
    },

    'reorder-pdf': {
      accept: 'application/pdf,.pdf', action: 'Reorder',
      dropLabel: 'Choose a PDF',
      options: [{ k: 'order', label: 'New page order', type: 'text', def: '' }],
      process: async function (files, o, api) {
        var PDFLib = await loadPdfLib();
        var doc = await loadDoc(PDFLib, files[0]);
        var total = doc.getPageCount();
        var raw = String((document.getElementById('ft-order') || {}).value || '').trim();
        var order = raw ? parseRanges(raw, total) : doc.getPageIndices().slice().reverse();
        if (!order.length) throw new Error('Enter the new order, e.g. “3,1,2” to move page 3 first. Leave blank to reverse.');
        var out = await PDFLib.PDFDocument.create();
        var copied = await out.copyPages(doc, order);
        copied.forEach(function (p) { out.addPage(p); });
        api.progress(0.8);
        var bytes = await out.save();
        return {
          stats: [{ label: 'Pages', value: order.length }, { label: 'New first page', value: (order[0] + 1) }, { label: 'Size', value: api.bytes(bytes.length) }],
          downloads: [{ label: 'Download', blob: pdfBlob(bytes), name: baseName(files[0].name) + '-reordered.pdf' }],
          status: 'Reordered',
          note: raw ? '' : 'No order given, so the pages were reversed.'
        };
      }
    },

    'jpg-to-pdf': {
      accept: 'image/*', multiple: true, maxFiles: 30, action: 'Build PDF',
      dropLabel: 'Choose images (JPG or PNG)', maxBytes: 40 * 1024 * 1024,
      options: [
        { k: 'size', label: 'Page size', type: 'select', def: 'fit',
          options: [{ v: 'fit', label: 'Fit to each image' }, { v: 'a4', label: 'A4 portrait' }, { v: 'letter', label: 'US Letter' }] },
        { k: 'margin', label: 'Margin (pt)', def: 0, min: 0, max: 100, step: 5 }
      ],
      process: async function (files, o, api) {
        var PDFLib = await loadPdfLib();
        var pdf = await PDFLib.PDFDocument.create();
        var PAGE = { a4: [595.28, 841.89], letter: [612, 792] };
        for (var i = 0; i < files.length; i++) {
          var f = files[i];
          var buf = await f.arrayBuffer();
          var isPng = /png$/i.test(f.type) || /\.png$/i.test(f.name);
          var img;
          try { img = isPng ? await pdf.embedPng(buf) : await pdf.embedJpg(buf); }
          catch (e) { throw new Error('“' + f.name + '” is not a JPG or PNG this tool can embed. Convert it first with the image converter.'); }
          var pageDims = o.size === 'fit' ? [img.width, img.height] : PAGE[o.size];
          var page = pdf.addPage(pageDims);
          var m = o.margin;
          var maxW = page.getWidth() - m * 2, maxH = page.getHeight() - m * 2;
          var scale = o.size === 'fit' ? 1 : Math.min(maxW / img.width, maxH / img.height, 1);
          var w = img.width * scale, h = img.height * scale;
          page.drawImage(img, { x: (page.getWidth() - w) / 2, y: (page.getHeight() - h) / 2, width: w, height: h });
          api.progress((i + 1) / files.length * 0.9);
        }
        var bytes = await pdf.save();
        return {
          stats: [{ label: 'Images', value: files.length }, { label: 'Pages', value: files.length }, { label: 'Size', value: api.bytes(bytes.length) }],
          downloads: [{ label: 'Download PDF', blob: pdfBlob(bytes), name: 'images.pdf' }],
          status: 'Built a ' + files.length + '-page PDF'
        };
      }
    },

    'pdf-page-numbers': {
      accept: 'application/pdf,.pdf', action: 'Add numbers',
      dropLabel: 'Choose a PDF',
      options: [
        { k: 'pos', label: 'Position', type: 'select', def: 'bc',
          options: [{ v: 'bc', label: 'Bottom centre' }, { v: 'br', label: 'Bottom right' }, { v: 'bl', label: 'Bottom left' }, { v: 'tc', label: 'Top centre' }] },
        { k: 'start', label: 'Start at', def: 1, min: 0, step: 1 },
        { k: 'size', label: 'Font size', def: 11, min: 6, max: 40, step: 1 }
      ],
      process: async function (files, o, api) {
        var PDFLib = await loadPdfLib();
        var doc = await loadDoc(PDFLib, files[0]);
        var font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
        var pages = doc.getPages();
        pages.forEach(function (pg, i) {
          var n = String(o.start + i);
          var tw = font.widthOfTextAtSize(n, o.size);
          var W = pg.getWidth(), H = pg.getHeight(), pad = 24;
          var x = o.pos[1] === 'c' ? (W - tw) / 2 : o.pos[1] === 'r' ? W - tw - pad : pad;
          var y = o.pos[0] === 't' ? H - pad - o.size : pad;
          pg.drawText(n, { x: x, y: y, size: o.size, font: font, color: PDFLib.rgb(0.2, 0.2, 0.2) });
        });
        api.progress(0.8);
        var bytes = await doc.save();
        return {
          stats: [{ label: 'Pages numbered', value: pages.length }, { label: 'Starting at', value: o.start }, { label: 'Size', value: api.bytes(bytes.length) }],
          downloads: [{ label: 'Download', blob: pdfBlob(bytes), name: baseName(files[0].name) + '-numbered.pdf' }],
          status: 'Added page numbers'
        };
      }
    },

    'pdf-watermark': {
      accept: 'application/pdf,.pdf', action: 'Add watermark',
      dropLabel: 'Choose a PDF',
      options: [
        { k: 'opacity', label: 'Opacity', type: 'range', min: 5, max: 60, def: 20, suffix: '%' },
        { k: 'size', label: 'Font size', def: 48, min: 12, max: 120, step: 2 }
      ],
      process: async function (files, o, api) {
        var PDFLib = await loadPdfLib();
        var doc = await loadDoc(PDFLib, files[0]);
        var text = String((document.getElementById('ft-wm-text') || {}).value || 'DRAFT');
        var font = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
        doc.getPages().forEach(function (pg) {
          var W = pg.getWidth(), H = pg.getHeight();
          var tw = font.widthOfTextAtSize(text, o.size);
          pg.drawText(text, {
            x: (W - tw) / 2, y: H / 2, size: o.size, font: font,
            color: PDFLib.rgb(0.6, 0.6, 0.6), opacity: o.opacity / 100,
            rotate: PDFLib.degrees(45)
          });
        });
        api.progress(0.8);
        var bytes = await doc.save();
        return {
          stats: [{ label: 'Text', value: text }, { label: 'Pages', value: doc.getPageCount() }, { label: 'Opacity', value: o.opacity + '%' }],
          downloads: [{ label: 'Download', blob: pdfBlob(bytes), name: baseName(files[0].name) + '-watermarked.pdf' }],
          status: 'Watermarked'
        };
      }
    },

    'protect-pdf': {
      accept: 'application/pdf,.pdf', action: 'Protect',
      dropLabel: 'Choose a PDF to password-protect',
      options: [],
      process: async function (files, o, api) {
        var PDFLib = await loadPdfLib();
        var pw = String((document.getElementById('ft-pw') || {}).value || '');
        if (pw.length < 4) throw new Error('Enter a password of at least 4 characters.');
        var doc = await loadDoc(PDFLib, files[0]);
        api.progress(0.6);
        var bytes;
        try {
          bytes = await doc.save({ userPassword: pw, ownerPassword: pw,
            permissions: { printing: 'highResolution' } });
        } catch (e) {
          throw new Error('This build of the PDF engine does not support encryption. Use your operating system’s “export as protected PDF”, or a desktop tool, for password protection.');
        }
        return {
          stats: [{ label: 'Protection', value: 'Password' }, { label: 'Pages', value: doc.getPageCount() }, { label: 'Size', value: api.bytes(bytes.length) }],
          downloads: [{ label: 'Download protected PDF', blob: pdfBlob(bytes), name: baseName(files[0].name) + '-protected.pdf' }],
          status: 'Protected',
          note: 'Keep the password safe — a protected PDF cannot be opened without it, and we don’t store it.'
        };
      }
    },

    'crop-pdf': {
      accept: 'application/pdf,.pdf', action: 'Crop',
      dropLabel: 'Choose a PDF to crop',
      options: [
        { k: 'top', label: 'Trim top (pt)', def: 36, min: 0, max: 400, step: 2 },
        { k: 'bottom', label: 'Trim bottom (pt)', def: 36, min: 0, max: 400, step: 2 },
        { k: 'left', label: 'Trim left (pt)', def: 36, min: 0, max: 400, step: 2 },
        { k: 'right', label: 'Trim right (pt)', def: 36, min: 0, max: 400, step: 2 }
      ],
      process: async function (files, o, api) {
        var PDFLib = await loadPdfLib();
        var doc = await loadDoc(PDFLib, files[0]);
        var pages = doc.getPages();
        pages.forEach(function (pg) {
          var sz = pg.getSize();
          var w = sz.width - o.left - o.right, h = sz.height - o.top - o.bottom;
          if (w > 10 && h > 10) pg.setCropBox(o.left, o.bottom, w, h);
        });
        api.progress(0.8);
        var bytes = await doc.save();
        return {
          stats: [{ label: 'Pages', value: pages.length }, { label: 'Trimmed', value: o.top + '/' + o.right + '/' + o.bottom + '/' + o.left + ' pt' }, { label: 'Size', value: api.bytes(bytes.length) }],
          downloads: [{ label: 'Download cropped PDF', blob: pdfBlob(bytes), name: baseName(files[0].name) + '-cropped.pdf' }],
          status: 'Cropped',
          note: 'Crops the visible area (crop box) by the margins you set — the same on every page.'
        };
      }
    },

    'duplicate-pdf-pages': {
      accept: 'application/pdf,.pdf', action: 'Duplicate pages',
      dropLabel: 'Choose a PDF',
      options: [
        { k: 'which', label: 'Pages to duplicate', type: 'text', def: 'all' },
        { k: 'copies', label: 'Extra copies of each', def: 1, min: 1, max: 20, step: 1 }
      ],
      process: async function (files, o, api) {
        var PDFLib = await loadPdfLib();
        var doc = await loadDoc(PDFLib, files[0]);
        var total = doc.getPageCount();
        var raw = String((document.getElementById('ft-which') || {}).value || 'all').trim();
        var sel = raw.toLowerCase() === 'all' ? doc.getPageIndices() : parseRanges(raw, total);
        if (!sel.length) throw new Error('No pages matched “' + raw + '”. Use “all” or a range like 1-3.');
        var selSet = {}; sel.forEach(function (i) { selSet[i] = 1; });
        var order = [];
        doc.getPageIndices().forEach(function (i) {
          order.push(i);
          if (selSet[i]) for (var c = 0; c < o.copies; c++) order.push(i);
        });
        var out = await PDFLib.PDFDocument.create();
        var copied = await out.copyPages(doc, order);
        copied.forEach(function (p) { out.addPage(p); });
        api.progress(0.8);
        var bytes = await out.save();
        return {
          stats: [{ label: 'Original pages', value: total }, { label: 'New total', value: order.length }, { label: 'Size', value: api.bytes(bytes.length) }],
          downloads: [{ label: 'Download', blob: pdfBlob(bytes), name: baseName(files[0].name) + '-duplicated.pdf' }],
          status: 'Duplicated pages'
        };
      }
    },

    'png-to-pdf': {
      accept: 'image/png,image/*', multiple: true, maxFiles: 30, action: 'Build PDF',
      dropLabel: 'Choose PNG images', maxBytes: 40 * 1024 * 1024,
      options: IMG_TO_PDF_OPTS,
      process: async function (files, o, api) {
        var PDFLib = await loadPdfLib();
        var bytes = await buildImagePdf(PDFLib, files, o, api);
        return {
          stats: [{ label: 'Images', value: files.length }, { label: 'Pages', value: files.length }, { label: 'Size', value: api.bytes(bytes.length) }],
          downloads: [{ label: 'Download PDF', blob: pdfBlob(bytes), name: 'images.pdf' }],
          status: 'Built a ' + files.length + '-page PDF'
        };
      }
    },

    'webp-to-pdf': {
      accept: 'image/webp,image/*', multiple: true, maxFiles: 30, action: 'Build PDF',
      dropLabel: 'Choose WebP images', maxBytes: 40 * 1024 * 1024,
      options: IMG_TO_PDF_OPTS,
      process: async function (files, o, api) {
        var PDFLib = await loadPdfLib();
        var bytes = await buildImagePdf(PDFLib, files, o, api);
        return {
          stats: [{ label: 'Images', value: files.length }, { label: 'Pages', value: files.length }, { label: 'Size', value: api.bytes(bytes.length) }],
          downloads: [{ label: 'Download PDF', blob: pdfBlob(bytes), name: 'images.pdf' }],
          status: 'Built a ' + files.length + '-page PDF'
        };
      }
    },

    'extract-pdf-pages': {
      accept: 'application/pdf,.pdf', action: 'Extract to separate PDFs',
      dropLabel: 'Choose a PDF',
      options: [{ k: 'which', label: 'Pages to extract', type: 'text', def: 'all' }],
      process: async function (files, o, api) {
        var PDFLib = await loadPdfLib();
        var doc = await loadDoc(PDFLib, files[0]);
        var total = doc.getPageCount();
        var raw = String((document.getElementById('ft-which') || {}).value || 'all').trim();
        var sel = raw.toLowerCase() === 'all' ? doc.getPageIndices() : parseRanges(raw, total);
        if (!sel.length) throw new Error('No pages matched “' + raw + '”. Use “all” or a range like 1-3.');
        if (sel.length > 50) throw new Error('That’s ' + sel.length + ' pages — extract up to 50 at once to keep your browser happy.');
        var downloads = [];
        for (var j = 0; j < sel.length; j++) {
          var out = await PDFLib.PDFDocument.create();
          var copied = await out.copyPages(doc, [sel[j]]);
          out.addPage(copied[0]);
          var bytes = await out.save();
          downloads.push({ label: 'Page ' + (sel[j] + 1), blob: pdfBlob(bytes), name: baseName(files[0].name) + '-p' + (sel[j] + 1) + '.pdf' });
          api.progress((j + 1) / sel.length * 0.9);
        }
        return {
          stats: [{ label: 'Original pages', value: total }, { label: 'Extracted files', value: downloads.length }],
          downloads: downloads,
          status: 'Extracted ' + downloads.length + ' single-page PDFs',
          note: 'Each selected page is saved as its own PDF. Click each button to download.'
        };
      }
    },

    'remove-pdf-password': {
      accept: 'application/pdf,.pdf', action: 'Remove restrictions',
      dropLabel: 'Choose a restricted PDF',
      options: [],
      process: async function (files, o, api) {
        var PDFLib = await loadPdfLib();
        var doc;
        try { doc = await PDFLib.PDFDocument.load(await files[0].arrayBuffer(), { ignoreEncryption: true }); }
        catch (e) { throw new Error('This PDF needs its open password to be read. A password that stops the file from opening cannot be removed without it — open it in your PDF viewer with the password first, then re-save.'); }
        api.progress(0.6);
        var bytes = await doc.save();
        return {
          stats: [{ label: 'Pages', value: doc.getPageCount() }, { label: 'Size', value: api.bytes(bytes.length) }],
          downloads: [{ label: 'Download unlocked PDF', blob: pdfBlob(bytes), name: baseName(files[0].name) + '-unlocked.pdf' }],
          status: 'Restrictions removed',
          note: 'Removes owner/permission restrictions (no-print, no-copy) by re-saving. It cannot bypass an open password that blocks the file from opening — that legitimately requires the password.'
        };
      }
    },

    'pdf-repair': {
      accept: 'application/pdf,.pdf', action: 'Repair',
      dropLabel: 'Choose a PDF to repair',
      options: [],
      process: async function (files, o, api) {
        var PDFLib = await loadPdfLib();
        var doc;
        try { doc = await PDFLib.PDFDocument.load(await files[0].arrayBuffer(), { ignoreEncryption: true }); }
        catch (e) { throw new Error('This file is too damaged to rebuild, or it isn’t a PDF.'); }
        api.progress(0.6);
        var bytes = await doc.save();
        return {
          stats: [{ label: 'Pages', value: doc.getPageCount() }, { label: 'Rebuilt size', value: api.bytes(bytes.length) }],
          downloads: [{ label: 'Download repaired PDF', blob: pdfBlob(bytes), name: baseName(files[0].name) + '-repaired.pdf' }],
          status: 'Rebuilt',
          note: 'Re-writes the PDF structure, which fixes many “won’t open” and cross-reference errors. It can’t recover data that is genuinely missing or corrupted.'
        };
      }
    }
  };

  /* text-field injectors the generic engine doesn't provide */
  function injectText(host, id, label, val, opts) {
    var controls = host.querySelector('.ft-controls');
    if (!controls || document.getElementById(id)) return;
    var wrap = document.createElement('div');
    wrap.className = 'calc-field';
    var type = (opts && opts.password) ? 'password' : 'text';
    wrap.innerHTML = '<label for="' + id + '">' + label + '</label>' +
      '<input id="' + id + '" class="field" type="' + type + '" value="' + val + '"' +
      (opts && opts.max ? ' maxlength="' + opts.max + '"' : '') + '>';
    controls.insertBefore(wrap, controls.firstChild);
  }

  root.VKPdfTools = T;
  if (typeof module === 'object' && module.exports) module.exports = T;

  function boot() {
    var host = document.getElementById('workspace');
    if (!host || !root.VKFile) return;
    if (host.querySelector('.ftool .drop') || host.querySelector('.calc-form')) return;
    var id = host.getAttribute('data-tool');
    var spec = T[id];
    if (!spec) return;
    root.VKFile.mount(host, spec);
    if (id === 'pdf-watermark') injectText(host, 'ft-wm-text', 'Watermark text', 'DRAFT', { max: 40 });
    if (id === 'protect-pdf') injectText(host, 'ft-pw', 'Password', '', { password: true, max: 64 });
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
