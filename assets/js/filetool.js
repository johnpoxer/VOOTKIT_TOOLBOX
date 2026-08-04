/* filetool.js — shared engine for tools that take files.
 * Handles the parts every file tool gets wrong: obvious drop target with live
 * feedback, a real click/keyboard alternative, type + size + zero-byte
 * validation, corrupted-file errors, progress, cancel, object-URL cleanup.
 *
 * Everything runs on-device. No upload path exists in this file.
 */
(function (root) {
  'use strict';

  var LIMITS = { image: 40 * 1024 * 1024, pdf: 100 * 1024 * 1024, any: 200 * 1024 * 1024 };

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function bytes(b) {
    if (b == null) return '—';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(2) + ' MB';
  }

  /* --- object URL registry so nothing leaks --- */
  function Urls() {
    var list = [];
    return {
      make: function (blob) { var u = URL.createObjectURL(blob); list.push(u); return u; },
      free: function () { list.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} }); list = []; }
    };
  }

  function validate(files, opts) {
    var max = opts.maxBytes || LIMITS.any;
    var accept = opts.accept || '';
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (f.size === 0) return '“' + f.name + '” is empty (0 bytes).';
      if (f.size > max) return '“' + f.name + '” is ' + bytes(f.size) + ' — the limit here is ' + bytes(max) + '. Browsers run out of memory above that.';
      if (accept && accept.indexOf('image/') === 0 && f.type && f.type.indexOf('image/') !== 0)
        return '“' + f.name + '” doesn’t look like an image.';
      if (accept === 'application/pdf' && f.type && f.type !== 'application/pdf')
        return '“' + f.name + '” doesn’t look like a PDF.';
    }
    if (opts.maxFiles && files.length > opts.maxFiles)
      return 'Up to ' + opts.maxFiles + ' files at a time — you chose ' + files.length + '.';
    return null;
  }

  /* Decode an image file.
   *
   * createImageBitmap decodes OFF THE MAIN THREAD and skips the DOM element and
   * object URL entirely, so it is both faster and non-blocking — which matters
   * most on the batch tools, where twenty photos are decoded back to back and
   * every one of them used to stall the tab mid-decode.
   *
   * `imageOrientation: 'from-image'` IS NOT OPTIONAL. An <img> applies the EXIF
   * orientation flag automatically; createImageBitmap does not unless asked,
   * so omitting it would silently start rotating every photo taken on a phone
   * held sideways.
   *
   * The <img> path stays as a fallback: createImageBitmap rejects on SVG in
   * some browsers, which the svg-to-png tool depends on working. Callers only
   * ever use drawImage and naturalWidth/naturalHeight, so the two are
   * interchangeable once those two properties are present. */
  function loadImage(file, urls) {
    if (typeof createImageBitmap === 'function' && typeof Blob === 'function' && file instanceof Blob) {
      return createImageBitmap(file, { imageOrientation: 'from-image' })
        .then(function (bmp) {
          try {
            Object.defineProperty(bmp, 'naturalWidth', { value: bmp.width, configurable: true });
            Object.defineProperty(bmp, 'naturalHeight', { value: bmp.height, configurable: true });
          } catch (e) { /* frozen exotic object — fall through to the element path */ }
          return (bmp.naturalWidth === bmp.width) ? bmp : loadImageElement(file, urls);
        })
        .catch(function () { return loadImageElement(file, urls); });
    }
    return loadImageElement(file, urls);
  }

  function loadImageElement(file, urls) {
    return new Promise(function (res, rej) {
      var img = new Image();
      var u = urls.make(file);
      img.onload = function () { res(img); };
      img.onerror = function () {
        rej(new Error('That image could not be read. It may be corrupted, or a format this browser doesn’t support (HEIC from iPhone often needs converting first).'));
      };
      img.src = u;
    });
  }

  function download(blob, name) {
    var u = URL.createObjectURL(blob);
    var a = el('a', { href: u, download: name });
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 1500);
  }

  /* ---------- mount ---------- */
  function mount(host, spec) {
    if (!host) return;
    host.innerHTML = '';
    host.classList.add('ftool');
    var urls = Urls();
    var files = [];

    var input = el('input', {
      type: 'file', id: 'ft-input', class: 'sr-only',
      accept: spec.accept || '', 'aria-label': spec.dropLabel || 'Choose a file'
    });
    if (spec.multiple) input.multiple = true;

    var drop = el('button', { class: 'drop', type: 'button', 'aria-describedby': 'ft-help' }, [
      el('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6',
        'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
        html: '<path d="M12 16V5m0 0L8 9m4-4 4 4M5 14v5h14v-5"/>' }),
      el('strong', { text: spec.dropLabel || 'Choose a file or drag it here' }),
      el('small', { id: 'ft-help', text: 'Processed on your device — never uploaded' })
    ]);

    var err = el('p', { class: 'note err', hidden: 'hidden', role: 'alert' });
    var status = el('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
    /* Progress readout. A bare bar is not enough on the video tools, where a
       job can run for minutes: without a number people cannot tell a slow
       encode from a hung one, and they close the tab. The bar carries an
       explicit percentage and, once there is enough history to be honest about
       it, a time remaining. */
    var pctText = el('span', { class: 'bar-pct', text: '0%' });
    var etaText = el('span', { class: 'bar-eta' });
    var barLine = el('div', { class: 'bar-line', hidden: 'hidden' }, [pctText, etaText]);
    var bar = el('div', {
      class: 'bar', hidden: 'hidden', role: 'progressbar',
      'aria-valuemin': '0', 'aria-valuemax': '100'
    }, [el('i')]);
    var controls = el('div', { class: 'ft-controls', hidden: 'hidden' });
    var result = el('div', { class: 'ft-result' });

    host.appendChild(input);
    host.appendChild(drop);
    host.appendChild(err);
    host.appendChild(controls);
    host.appendChild(bar);
    host.appendChild(barLine);
    host.appendChild(status);
    host.appendChild(result);

    function fail(msg) { err.textContent = msg; err.hidden = false; status.textContent = ''; }
    function clearErr() { err.hidden = true; }
    /* ETA is computed from elapsed time against progress made, but only once
       the job is far enough in for the estimate not to be nonsense. Early
       readings on a video encode are wildly optimistic — the first frames are
       cheap — and a countdown that jumps from "4s left" to "3m left" is worse
       than no countdown. `progStart` is reset by setProgress(null). */
    var progStart = 0, lastPct = -1;

    function fmtEta(sec) {
      if (!isFinite(sec) || sec < 0) return '';
      if (sec < 60) return Math.max(1, Math.round(sec)) + 's left';
      var m = Math.floor(sec / 60);
      return m + 'm ' + Math.round(sec % 60) + 's left';
    }

    function setProgress(p) {
      if (p == null) {
        bar.hidden = true; barLine.hidden = true;
        progStart = 0; lastPct = -1; etaText.textContent = '';
        return;
      }
      var frac = Math.max(0, Math.min(1, p));
      var pct = Math.round(frac * 100);
      if (!progStart) progStart = Date.now();
      bar.hidden = false; barLine.hidden = false;
      /* Only touch the DOM when the number actually changes: ffmpeg reports
         progress many times a second and this runs alongside the encode. */
      if (pct !== lastPct) {
        lastPct = pct;
        bar.firstChild.style.width = pct + '%';
        bar.setAttribute('aria-valuenow', String(pct));
        pctText.textContent = pct + '%';
      }
      var elapsed = (Date.now() - progStart) / 1000;
      etaText.textContent = (frac > 0.08 && elapsed > 3 && frac < 0.99)
        ? fmtEta(elapsed / frac - elapsed)
        : '';
    }

    /* build the option controls once */
    var optionInputs = {};
    (spec.options || []).forEach(function (o) {
      var id = 'ft-' + o.k;
      var wrap = el('div', { class: 'calc-field' });
      wrap.appendChild(el('label', { for: id, text: o.label }));
      var c;
      if (o.type === 'select') {
        c = el('select', { id: id, class: 'field' });
        o.options.forEach(function (x) { c.appendChild(el('option', { value: String(x.v), text: x.label })); });
        c.value = String(o.def);
      } else if (o.type === 'range') {
        c = el('input', { id: id, type: 'range', min: String(o.min), max: String(o.max), step: String(o.step || 1), value: String(o.def), class: 'range' });
      } else if (o.type === 'text') {
        c = el('input', { id: id, type: 'text', class: 'field', value: String(o.def), autocomplete: 'off' });
        if (o.placeholder) c.setAttribute('placeholder', o.placeholder);
      } else {
        c = el('input', { id: id, type: 'number', class: 'field', value: String(o.def), step: String(o.step || 1) });
        if (o.min != null) c.setAttribute('min', String(o.min));
        if (o.max != null) c.setAttribute('max', String(o.max));
      }
      var live = o.type === 'range' ? el('output', { class: 'ft-out', text: String(o.def) + (o.suffix || '') }) : null;
      if (live) c.addEventListener('input', function () { live.textContent = c.value + (o.suffix || ''); });
      wrap.appendChild(c);
      if (live) wrap.appendChild(live);
      optionInputs[o.k] = c;
      controls.appendChild(wrap);
    });
    var runBtn = el('button', { class: 'btn btn-primary', type: 'button', text: spec.action || 'Process' });
    var resetBtn = el('button', { class: 'btn', type: 'button', text: 'Start over' });
    controls.appendChild(el('div', { class: 'ft-actions' }, [runBtn, resetBtn]));

    function readOptions() {
      var v = {};
      (spec.options || []).forEach(function (o) {
        var raw = optionInputs[o.k].value;
        v[o.k] = o.type === 'select' && isNaN(+raw) ? raw : parseFloat(raw);
        if (o.type === 'select' && isNaN(+raw)) v[o.k] = raw;
      });
      return v;
    }

    function accept(list) {
      var arr = [].slice.call(list);
      var problem = validate(arr, { accept: spec.accept, maxBytes: spec.maxBytes || LIMITS.image, maxFiles: spec.maxFiles });
      if (problem) { fail(problem); return; }
      clearErr();
      files = arr;
      controls.hidden = false;
      status.textContent = arr.length === 1
        ? arr[0].name + ' · ' + bytes(arr[0].size)
        : arr.length + ' files · ' + bytes(arr.reduce(function (s, f) { return s + f.size; }, 0));
      result.innerHTML = '';
      if (spec.autoRun) run();
    }

    async function run() {
      if (!files.length) { fail('Choose a file first.'); return; }
      clearErr();
      runBtn.disabled = true;
      status.textContent = 'Working…';
      setProgress(0.1);
      try {
        var out = await spec.process(files, readOptions(), {
          urls: urls, loadImage: function (f) { return loadImage(f, urls); },
          progress: setProgress, bytes: bytes,
          /* Lets a long-running tool replace the generic "Working…" with what is
             actually happening. The video tools spend most of their time
             downloading a ~32 MB engine, which otherwise looks like a hang. */
          status: function (msg) { if (msg) status.textContent = msg; }
        });
        setProgress(1);
        renderResult(out);
        status.textContent = out.status || 'Done';
        // The moment the user has what they came for — the only point where an
        // account prompt is earned rather than interruptive.
        if (root.VKConvert) root.VKConvert.onToolSuccess(host, host.getAttribute('data-tool'));
      } catch (e) {
        // Report before showing the user anything: this is the only place a file
        // tool's failure is observable, and until now it was observable only to
        // the person it happened to.
        if (root.VKErr) root.VKErr.report(host.getAttribute('data-tool'), e);
        fail(e && e.message ? e.message : 'Something went wrong processing that file.');
      } finally {
        runBtn.disabled = false;
        setTimeout(function () { setProgress(null); }, 400);
      }
    }

    function renderResult(out) {
      result.innerHTML = '';
      if (!out) return;
      if (out.previewUrl) {
        result.appendChild(el('img', { class: 'ft-preview', src: out.previewUrl, alt: out.previewAlt || 'Result preview' }));
      }
      if (out.stats && out.stats.length) {
        result.appendChild(el('div', { class: 'calc-stats', html: out.stats.map(function (s) {
          return '<div class="calc-stat"><span>' + s.label + '</span><b>' + s.value + '</b></div>';
        }).join('') }));
      }
      if (out.downloads && out.downloads.length) {
        var row = el('div', { class: 'ft-actions' });
        out.downloads.forEach(function (dl) {
          row.appendChild(el('button', { class: 'btn btn-primary', type: 'button', text: dl.label,
            onClick: function () {
              download(dl.blob, dl.name);
              /* Distinct from tool_run: a run that produced a file nobody took
                 is a tool that technically worked and delivered nothing. The
                 gap between the two events is the real failure signal.
                 NOTE: dl.name is the USER'S file name — never sent. */
              try {
                if (root.VKTrack) {
                  var id = host.getAttribute('data-tool');
                  var cat = (root.VK && root.VK.find && root.VK.find(id) || {}).cat;
                  root.VKTrack.toolDownload(id, cat);
                }
              } catch (e) {}
            } }));
        });
        result.appendChild(row);
      }
      if (out.note) result.appendChild(el('p', { class: 'note', html: out.note }));
    }

    function reset() {
      urls.free(); files = []; input.value = '';
      controls.hidden = true; result.innerHTML = ''; status.textContent = ''; clearErr(); setProgress(null);
      drop.focus();
    }

    drop.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () { if (input.files.length) accept(input.files); });
    runBtn.addEventListener('click', run);
    resetBtn.addEventListener('click', reset);

    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
    });
    ['dragleave', 'dragend'].forEach(function (ev) {
      drop.addEventListener(ev, function () { drop.classList.remove('is-over'); });
    });
    drop.addEventListener('drop', function (e) {
      e.preventDefault(); drop.classList.remove('is-over');
      if (e.dataTransfer && e.dataTransfer.files.length) accept(e.dataTransfer.files);
    });
    window.addEventListener('pagehide', function () { urls.free(); });
  }

  root.VKFile = { mount: mount, bytes: bytes, LIMITS: LIMITS, validate: validate };
  if (typeof module === 'object' && module.exports) module.exports = root.VKFile;
})(typeof window !== 'undefined' ? window : globalThis);
