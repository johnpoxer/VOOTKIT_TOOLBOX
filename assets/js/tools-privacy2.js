/* tools-privacy2.js — metadata-remover, url-cleaner, screenshot-redactor.
 * All on-device. cleanUrl is pure + unit-tested; the image tools use canvas
 * (re-encoding strips metadata; redaction is baked into the pixels). */
(function (root) {
  'use strict';

  /* tracking params to strip. Exact names + any starting with these prefixes. */
  var TRACK_EXACT = ['fbclid', 'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid', 'msclkid', 'yclid', 'twclid', 'igshid', 'mc_cid', 'mc_eid', 'vero_id', 'vero_conv', '_hsenc', '_hsmi', 'ref', 'ref_src', 'ref_url', 'spm', 'scm', 'si', 'oly_anon_id', 'oly_enc_id', '_openstat'];
  var TRACK_PREFIX = ['utm_', 'pk_', 'piwik_', 'matomo_', 'hsa_'];
  function isTracker(name) {
    name = name.toLowerCase();
    if (TRACK_EXACT.indexOf(name) !== -1) return true;
    for (var i = 0; i < TRACK_PREFIX.length; i++) if (name.indexOf(TRACK_PREFIX[i]) === 0) return true;
    return false;
  }
  function cleanUrl(input) {
    var raw = String(input || '').trim();
    if (!raw) return { clean: '', removed: [] };
    var u;
    try { u = new URL(raw); } catch (e) {
      // best-effort for bare query strings / no-scheme
      try { u = new URL('http://' + raw); } catch (e2) { return { clean: raw, removed: [], error: 'That doesn’t look like a URL.' }; }
    }
    var removed = [];
    // URLSearchParams keeps order; collect keys first (can't delete while iterating)
    var keys = [];
    u.searchParams.forEach(function (_, k) { keys.push(k); });
    keys.forEach(function (k) { if (isTracker(k)) { removed.push(k); u.searchParams.delete(k); } });
    var out = u.toString();
    // URL adds a trailing '?' only if params remain; strip a dangling '?'
    out = out.replace(/\?$/, '');
    return { clean: out, removed: removed };
  }

  function fld(W, l, n) { return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: l }), n]); }
  function loadImage(file) { return new Promise(function (res, rej) { var u = URL.createObjectURL(file); var im = new Image(); im.onload = function () { res({ img: im, url: u }); }; im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('Could not open that image.')); }; im.src = u; }); }

  var T = {

    'url-cleaner': function (host, W) {
      var input = W.el('textarea', { class: 'field wtext', rows: '3', placeholder: 'Paste a URL with ?utm_… tracking junk', spellcheck: 'false' });
      input.value = 'https://example.com/article?utm_source=news&utm_medium=email&id=42&fbclid=abc123';
      var out = W.el('textarea', { class: 'field wtext wmono', rows: '3', readonly: 'readonly', 'aria-label': 'Cleaned URL' });
      var note = W.el('p', { class: 'note' });
      function run() {
        var r = cleanUrl(input.value);
        out.value = r.clean;
        note.className = 'note' + (r.error ? ' err' : '');
        note.textContent = r.error ? r.error : (r.removed.length ? 'Removed ' + r.removed.length + ' tracking parameter' + (r.removed.length > 1 ? 's' : '') + ': ' + r.removed.join(', ') : 'No tracking parameters found — this URL is already clean.');
      }
      input.addEventListener('input', W.debounce(run, 120));
      host.appendChild(fld(W, 'URL', input));
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.copyBtn('Copy clean URL', function () { return out.value; })]));
      host.appendChild(note); host.appendChild(fld(W, 'Cleaned', out));
      host.appendChild(W.el('p', { class: 'note', text: 'Strips utm_*, fbclid, gclid and other known trackers. Runs in your browser — the URL is never sent anywhere.' })); run();
    },

    'metadata-remover': function (host, W) {
      var preview = W.el('img', { class: 'ft-preview', alt: 'Cleaned image', hidden: 'hidden' });
      var status = W.el('p', { class: 'note' });
      var dl = W.el('div', { class: 'wbtns' });
      var input = W.el('input', { type: 'file', class: 'field', accept: 'image/jpeg,image/png,image/webp', 'aria-label': 'Choose an image' });
      input.addEventListener('change', async function () {
        var f = input.files[0]; if (!f) return;
        dl.innerHTML = ''; status.className = 'note'; status.textContent = 'Removing metadata…';
        try {
          var L = await loadImage(f);
          var c = document.createElement('canvas'); c.width = L.img.naturalWidth; c.height = L.img.naturalHeight;
          c.getContext('2d').drawImage(L.img, 0, 0); URL.revokeObjectURL(L.url);
          var type = /png$/i.test(f.type) ? 'image/png' : /webp$/i.test(f.type) ? 'image/webp' : 'image/jpeg';
          c.toBlob(function (b) {
            preview.src = URL.createObjectURL(b); preview.hidden = false;
            var saved = f.size - b.size;
            status.textContent = 'Done — all EXIF, GPS and camera metadata removed by re-encoding.' + (saved > 0 ? ' (' + Math.round(saved / 1024) + ' KB smaller)' : '');
            dl.appendChild(W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Download clean image', onClick: function () { W.download(b, (f.name.replace(/\.[^.]+$/, '')) + '-clean.' + (type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg')); } }));
          }, type, 0.95);
        } catch (e) { status.className = 'note err'; status.textContent = e.message; }
      });
      host.appendChild(fld(W, 'Image', input)); host.appendChild(status); host.appendChild(preview); host.appendChild(dl);
      host.appendChild(W.el('p', { class: 'note', text: 'Re-drawing the image through a canvas discards EXIF, GPS location and camera info. The pixels are identical; the hidden metadata is gone. All on your device.' }));
    },

    'screenshot-redactor': function (host, W) {
      var canvas = W.el('canvas', { class: 'wredact' });
      var status = W.el('p', { class: 'note', text: 'Load a screenshot, then drag on it to draw black redaction boxes.' });
      var img = null, rects = [], drawing = null, scale = 1;
      function redraw() {
        if (!img) return;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000';
        rects.forEach(function (r) { ctx.fillRect(r.x, r.y, r.w, r.h); });
        if (drawing) ctx.fillRect(drawing.x, drawing.y, drawing.w, drawing.h);
      }
      function pos(e) { var b = canvas.getBoundingClientRect(); var cx = (e.touches ? e.touches[0].clientX : e.clientX) - b.left; var cy = (e.touches ? e.touches[0].clientY : e.clientY) - b.top; return { x: cx * (canvas.width / b.width), y: cy * (canvas.height / b.height) }; }
      function start(e) { if (!img) return; e.preventDefault(); var p = pos(e); drawing = { x: p.x, y: p.y, w: 0, h: 0, _sx: p.x, _sy: p.y }; }
      function move(e) { if (!drawing) return; e.preventDefault(); var p = pos(e); drawing.x = Math.min(p.x, drawing._sx); drawing.y = Math.min(p.y, drawing._sy); drawing.w = Math.abs(p.x - drawing._sx); drawing.h = Math.abs(p.y - drawing._sy); redraw(); }
      function end() { if (!drawing) return; if (drawing.w > 3 && drawing.h > 3) rects.push({ x: drawing.x, y: drawing.y, w: drawing.w, h: drawing.h }); drawing = null; redraw(); }
      canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move); root.addEventListener('mouseup', end);
      canvas.addEventListener('touchstart', start); canvas.addEventListener('touchmove', move); canvas.addEventListener('touchend', end);
      var input = W.el('input', { type: 'file', class: 'field', accept: 'image/*', 'aria-label': 'Choose a screenshot' });
      input.addEventListener('change', async function () { var f = input.files[0]; if (!f) return; var L = await loadImage(f); img = L.img; var maxW = 800; scale = Math.min(1, maxW / img.naturalWidth); canvas.width = img.naturalWidth * scale; canvas.height = img.naturalHeight * scale; rects = []; redraw(); status.textContent = 'Drag to add black boxes over anything private.'; });
      host.appendChild(fld(W, 'Screenshot', input)); host.appendChild(status); host.appendChild(canvas);
      host.appendChild(W.el('div', { class: 'wbtns' }, [
        W.el('button', { class: 'btn', type: 'button', text: 'Undo box', onClick: function () { rects.pop(); redraw(); } }),
        W.el('button', { class: 'btn', type: 'button', text: 'Clear boxes', onClick: function () { rects = []; redraw(); } }),
        W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Download redacted', onClick: function () { if (!img) return; canvas.toBlob(function (b) { W.download(b, 'redacted.png'); }, 'image/png'); } })
      ]));
      host.appendChild(W.el('p', { class: 'note', text: 'The black boxes are permanently baked into the downloaded PNG — unlike a highlighter in some PDF tools, the pixels underneath are gone. All on your device.' }));
    }
  };

  root.VKPrivacy2 = { cleanUrl: cleanUrl, isTracker: isTracker };
  if (typeof module === 'object' && module.exports) module.exports = root.VKPrivacy2;
  if (typeof root.VKW !== 'undefined') { Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); } }
})(typeof window !== 'undefined' ? window : globalThis);
