/* tools-pdftools.js — interactive PDF tools (scan, sign, fill forms).
 * Uses pdf-lib (MIT), lazy-loaded from a CDN. Everything runs in the browser;
 * camera frames, signatures and form data never leave the device. */
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
  function pdfDownload(bytes, name) {
    var url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  // Any image data-URL -> PNG bytes (normalises jpeg/webp/png for embedding).
  function dataUrlToPngBytes(dataUrl) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        c.toBlob(function (b) { b ? b.arrayBuffer().then(res, rej) : rej(new Error('Could not convert an image.')); }, 'image/png');
      };
      img.onerror = function () { rej(new Error('Could not read an image.')); };
      img.src = dataUrl;
    });
  }
  var PAGE = { a4: [595.28, 841.89], letter: [612, 792] };
  function fld(W, label, node) { return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: label }), node]); }

  var T = {

    /* ---------- scan to PDF (camera or photos) ---------- */
    'scan-to-pdf': function (host, W) {
      var pages = [], stream = null;
      var video = W.el('video', { autoplay: '', playsinline: '', muted: '', style: 'width:100%;max-height:320px;background:#000;border-radius:10px;display:none' });
      var grid = W.el('div', { class: 'wpages' });
      var status = W.el('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
      function refresh() { status.className = 'note'; status.textContent = pages.length ? (pages.length + ' page' + (pages.length > 1 ? 's' : '') + ' ready.') : 'No pages yet — use the camera or add photos.'; }
      function addImage(src) {
        var img = new Image(); img.src = src; img.className = 'wpage-thumb';
        grid.appendChild(W.el('div', { class: 'wpage' }, [img])); pages.push(src); refresh();
      }
      var fileInput = W.el('input', { type: 'file', accept: 'image/*', multiple: 'multiple', class: 'field', 'aria-label': 'Add photos' });
      fileInput.addEventListener('change', function () {
        Array.prototype.forEach.call(fileInput.files, function (f) { var r = new FileReader(); r.onload = function () { addImage(r.result); }; r.readAsDataURL(f); });
        fileInput.value = '';
      });
      var capBtn = W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Capture page', disabled: 'disabled', onClick: function () {
        if (!video.videoWidth) return;
        var c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight;
        c.getContext('2d').drawImage(video, 0, 0); addImage(c.toDataURL('image/jpeg', 0.9));
      } });
      var camBtn = W.el('button', { class: 'btn', type: 'button', text: 'Start camera', onClick: async function () {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { status.className = 'note err'; status.textContent = 'This browser has no camera access — add photos instead.'; return; }
        try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); video.srcObject = stream; video.style.display = 'block'; capBtn.disabled = false; status.textContent = 'Camera on — line up a page and capture.'; }
        catch (e) { status.className = 'note err'; status.textContent = 'Could not open the camera. You can still add photos below.'; }
      } });
      function stopCam() { if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; } }
      window.addEventListener('pagehide', stopCam);
      var buildBtn = W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Build PDF', onClick: async function () {
        if (!pages.length) { status.className = 'note err'; status.textContent = 'Add at least one page first.'; return; }
        status.className = 'note'; status.textContent = 'Building PDF…'; buildBtn.disabled = true;
        try {
          var PDFLib = await loadPdfLib();
          var pdf = await PDFLib.PDFDocument.create();
          for (var i = 0; i < pages.length; i++) {
            var img = await pdf.embedPng(await dataUrlToPngBytes(pages[i]));
            var page = pdf.addPage([img.width, img.height]);
            page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
          }
          pdfDownload(await pdf.save(), 'scan.pdf'); stopCam(); video.style.display = 'none'; capBtn.disabled = true;
          status.textContent = 'Done — your scanned PDF has downloaded.';
        } catch (e) { status.className = 'note err'; status.textContent = e.message || 'Could not build the PDF.'; }
        buildBtn.disabled = false;
      } });
      var clearBtn = W.el('button', { class: 'btn', type: 'button', text: 'Clear', onClick: function () { pages = []; grid.innerHTML = ''; refresh(); } });
      host.appendChild(video);
      host.appendChild(W.el('div', { class: 'wbtns' }, [camBtn, capBtn]));
      host.appendChild(fld(W, 'Or add photos from your device', fileInput));
      host.appendChild(W.el('div', { class: 'wbtns' }, [buildBtn, clearBtn]));
      host.appendChild(status); host.appendChild(grid);
      host.appendChild(W.el('p', { class: 'note', text: 'Great on a phone — snap each page, then build a PDF. Camera frames are processed in the browser and never uploaded.' }));
      refresh();
    },

    /* ---------- signature tool ---------- */
    'pdf-signature': function (host, W) {
      var pdfInput = W.el('input', { type: 'file', class: 'field', accept: 'application/pdf,.pdf', 'aria-label': 'Choose a PDF' });
      var canvas = W.el('canvas', { width: '500', height: '160', style: 'border:1px solid var(--border,#d5dae2);border-radius:10px;background:#fff;touch-action:none;width:100%;max-width:500px;cursor:crosshair' });
      var ctx = canvas.getContext('2d'); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0d1420';
      var drawing = false, hasInk = false;
      function xy(e) { var r = canvas.getBoundingClientRect(); var px = (e.clientX - r.left) * canvas.width / r.width, py = (e.clientY - r.top) * canvas.height / r.height; return { x: px, y: py }; }
      canvas.addEventListener('pointerdown', function (e) { drawing = true; var p = xy(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); canvas.setPointerCapture(e.pointerId); });
      canvas.addEventListener('pointermove', function (e) { if (!drawing) return; var p = xy(e); ctx.lineTo(p.x, p.y); ctx.stroke(); hasInk = true; });
      canvas.addEventListener('pointerup', function () { drawing = false; });
      var pageNum = W.el('input', { class: 'field', type: 'number', value: '1', min: '1', 'aria-label': 'Page number' });
      var posSel = W.el('select', { class: 'field', 'aria-label': 'Position' }, [['br', 'Bottom right'], ['bl', 'Bottom left'], ['bc', 'Bottom centre'], ['tr', 'Top right'], ['tl', 'Top left']].map(function (o) { return W.el('option', { value: o[0], text: o[1] }); }));
      var sizeIn = W.el('input', { class: 'field', type: 'number', value: '160', min: '60', max: '400', 'aria-label': 'Width (pt)' });
      var status = W.el('p', { class: 'note' });
      var clearBtn = W.el('button', { class: 'btn', type: 'button', text: 'Clear signature', onClick: function () { ctx.clearRect(0, 0, canvas.width, canvas.height); hasInk = false; } });
      var signBtn = W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Sign & download', onClick: async function () {
        if (!pdfInput.files[0]) { status.className = 'note err'; status.textContent = 'Choose a PDF first.'; return; }
        if (!hasInk) { status.className = 'note err'; status.textContent = 'Draw your signature in the box first.'; return; }
        status.className = 'note'; status.textContent = 'Signing…'; signBtn.disabled = true;
        try {
          var PDFLib = await loadPdfLib();
          var doc = await PDFLib.PDFDocument.load(await pdfInput.files[0].arrayBuffer(), { ignoreEncryption: true });
          var pngBytes = await new Promise(function (res, rej) { canvas.toBlob(function (b) { b ? b.arrayBuffer().then(res, rej) : rej(new Error('signature error')); }, 'image/png'); });
          var sig = await doc.embedPng(pngBytes);
          var pages = doc.getPages();
          var idx = Math.min(Math.max(1, +pageNum.value | 0), pages.length) - 1;
          var pg = pages[idx], pw = pg.getWidth(), ph = pg.getHeight();
          var sw = Math.min(+sizeIn.value || 160, pw - 20), sh = sw * (canvas.height / canvas.width), m = 30, x, y;
          var pos = posSel.value;
          x = (pos === 'bl' || pos === 'tl') ? m : (pos === 'bc') ? (pw - sw) / 2 : pw - sw - m;
          y = (pos === 'tr' || pos === 'tl') ? ph - sh - m : m;
          pg.drawImage(sig, { x: x, y: y, width: sw, height: sh });
          pdfDownload(await doc.save(), (pdfInput.files[0].name || 'document').replace(/\.[^.]+$/, '') + '-signed.pdf');
          status.textContent = 'Signed page ' + (idx + 1) + ' — your PDF has downloaded.';
        } catch (e) { status.className = 'note err'; status.textContent = e.message || 'Could not sign the PDF.'; }
        signBtn.disabled = false;
      } });
      host.appendChild(fld(W, 'PDF file', pdfInput));
      host.appendChild(W.el('span', { class: 'wlab', text: 'Draw your signature' }));
      host.appendChild(canvas);
      host.appendChild(W.el('div', { class: 'wbtns' }, [
        W.el('label', { class: 'winline' }, [W.el('span', { class: 'wlab', text: 'Page' }), pageNum]),
        W.el('label', { class: 'winline' }, [W.el('span', { class: 'wlab', text: 'Position' }), posSel]),
        W.el('label', { class: 'winline' }, [W.el('span', { class: 'wlab', text: 'Width (pt)' }), sizeIn])
      ]));
      host.appendChild(W.el('div', { class: 'wbtns' }, [signBtn, clearBtn]));
      host.appendChild(status);
      host.appendChild(W.el('p', { class: 'note', text: 'Draw a signature and stamp it onto a page. The signature background is transparent. Everything happens in your browser.' }));
    },

    /* ---------- form filler ---------- */
    'pdf-form-filler': function (host, W) {
      var pdfInput = W.el('input', { type: 'file', class: 'field', accept: 'application/pdf,.pdf', 'aria-label': 'Choose a PDF' });
      var fieldsWrap = W.el('div', {});
      var status = W.el('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
      var flatten = W.el('input', { type: 'checkbox', 'aria-label': 'Flatten' });
      var applied = [];
      var fillBtn = W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Fill & download', disabled: 'disabled', onClick: async function () {
        status.className = 'note'; status.textContent = 'Filling…'; fillBtn.disabled = true;
        try {
          var PDFLib = await loadPdfLib();
          var doc = await PDFLib.PDFDocument.load(await pdfInput.files[0].arrayBuffer(), { ignoreEncryption: true });
          var form = doc.getForm();
          applied.forEach(function (a) { try { a.apply(form); } catch (e) {} });
          if (flatten.checked) { try { form.flatten(); } catch (e) {} }
          pdfDownload(await doc.save(), (pdfInput.files[0].name || 'form').replace(/\.[^.]+$/, '') + '-filled.pdf');
          status.textContent = 'Done — your filled PDF has downloaded.';
        } catch (e) { status.className = 'note err'; status.textContent = e.message || 'Could not fill the form.'; }
        fillBtn.disabled = false;
      } });
      pdfInput.addEventListener('change', async function () {
        if (!pdfInput.files[0]) return;
        fieldsWrap.innerHTML = ''; applied = []; status.className = 'note'; status.textContent = 'Reading form…'; fillBtn.disabled = true;
        try {
          var PDFLib = await loadPdfLib();
          var doc = await PDFLib.PDFDocument.load(await pdfInput.files[0].arrayBuffer(), { ignoreEncryption: true });
          var fields = doc.getForm().getFields();
          if (!fields.length) { status.className = 'note'; status.textContent = 'This PDF has no fillable form fields.'; return; }
          fields.forEach(function (f) {
            var name = f.getName(), type = f.constructor.name;
            if (type === 'PDFTextField') {
              var inp = W.el('input', { class: 'field', type: 'text', value: (f.getText() || ''), 'aria-label': name });
              applied.push({ apply: function (form) { form.getTextField(name).setText(inp.value); } });
              fieldsWrap.appendChild(fld(W, name, inp));
            } else if (type === 'PDFCheckBox') {
              var cb = W.el('input', { type: 'checkbox', 'aria-label': name }); if (f.isChecked()) cb.checked = true;
              applied.push({ apply: function (form) { var x = form.getCheckBox(name); cb.checked ? x.check() : x.uncheck(); } });
              fieldsWrap.appendChild(W.el('label', { class: 'winline' }, [cb, W.el('span', { text: ' ' + name })]));
            } else if (type === 'PDFDropdown' || type === 'PDFRadioGroup' || type === 'PDFOptionList') {
              var opts = []; try { opts = f.getOptions(); } catch (e) {}
              var s = W.el('select', { class: 'field', 'aria-label': name }, [W.el('option', { value: '', text: '— choose —' })].concat(opts.map(function (o) { return W.el('option', { value: o, text: o }); })));
              applied.push({ apply: function (form) { if (!s.value) return; var g = type === 'PDFDropdown' ? form.getDropdown(name) : type === 'PDFOptionList' ? form.getOptionList(name) : form.getRadioGroup(name); g.select(s.value); } });
              fieldsWrap.appendChild(fld(W, name, s));
            }
          });
          status.textContent = fields.length + ' field' + (fields.length > 1 ? 's' : '') + ' found — fill them in and download.';
          fillBtn.disabled = false;
        } catch (e) { status.className = 'note err'; status.textContent = /encrypt|password/i.test(e.message) ? 'This PDF is password-protected — remove the password first.' : 'Could not read that PDF.'; }
      });
      host.appendChild(fld(W, 'PDF form', pdfInput));
      host.appendChild(fieldsWrap);
      host.appendChild(W.el('div', { class: 'wbtns' }, [fillBtn, W.el('label', { class: 'winline' }, [flatten, W.el('span', { text: ' Flatten (make non-editable)' })])]));
      host.appendChild(status);
      host.appendChild(W.el('p', { class: 'note', text: 'Reads AcroForm fields (text, checkbox, dropdown, radio) and fills them in your browser. Fillable PDFs only — scanned forms have no fields.' }));
    }

  };

  root.VKPdfTools2 = { _has: function () { return Object.keys(T); } };
  if (typeof module === 'object' && module.exports) module.exports = T;

  if (typeof root.VKW !== 'undefined') {
    Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); }
  }
})(typeof window !== 'undefined' ? window : globalThis);
