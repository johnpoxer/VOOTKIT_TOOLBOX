/* tools-dev.js — developer tools. All on-device.
 * Pure helpers (formatJson, b64, decodeJwt, uuidV4, slug of timestamp, etc.)
 * exported + unit-tested in test/dev.test.js. Hashing uses the browser's
 * built-in Web Crypto (no library, no network). */
(function (root) {
  'use strict';

  /* ---------- pure logic ---------- */

  function formatJson(text, indent) {
    var obj = JSON.parse(text);                 // throws on invalid → caught by caller
    return JSON.stringify(obj, null, indent == null ? 2 : indent);
  }
  function minifyJson(text) { return JSON.stringify(JSON.parse(text)); }

  function b64encode(s) {
    // UTF-8 safe
    return btoa(unescape(encodeURIComponent(String(s))));
  }
  function b64decode(s) {
    return decodeURIComponent(escape(atob(String(s).replace(/\s+/g, ''))));
  }

  function b64urlToJson(seg) {
    var s = seg.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return JSON.parse(decodeURIComponent(escape(atob(s))));
  }
  function decodeJwt(token) {
    var parts = String(token || '').trim().split('.');
    if (parts.length !== 3) throw new Error('A JWT has three parts separated by dots (header.payload.signature). This doesn’t.');
    var header, payload;
    try { header = b64urlToJson(parts[0]); } catch (e) { throw new Error('The header isn’t valid base64url JSON.'); }
    try { payload = b64urlToJson(parts[1]); } catch (e) { throw new Error('The payload isn’t valid base64url JSON.'); }
    return { header: header, payload: payload, signature: parts[2] };
  }

  function uuidV4() {
    if (root.crypto && crypto.getRandomValues) {
      var b = crypto.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
      var h = []; for (var i = 0; i < 16; i++) h.push((b[i] + 0x100).toString(16).slice(1));
      return h[0] + h[1] + h[2] + h[3] + '-' + h[4] + h[5] + '-' + h[6] + h[7] + '-' + h[8] + h[9] + '-' + h[10] + h[11] + h[12] + h[13] + h[14] + h[15];
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });
  }

  function encodeUrl(s, comp) { return comp ? encodeURIComponent(String(s)) : encodeURI(String(s)); }
  function decodeUrl(s, comp) { return comp ? decodeURIComponent(String(s)) : decodeURI(String(s)); }

  /* timestamp helpers */
  function fromUnix(n) {
    var ms = String(n).length > 10 ? +n : +n * 1000;   // seconds vs millis
    var d = new Date(ms);
    if (isNaN(d.getTime())) throw new Error('That isn’t a valid Unix timestamp.');
    return { iso: d.toISOString(), utc: d.toUTCString(), local: d.toString(), ms: ms };
  }
  function toUnix(dateStr) {
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) throw new Error('Couldn’t read that date. Try 2026-07-23 or 2026-07-23T14:30.');
    return { seconds: Math.floor(d.getTime() / 1000), millis: d.getTime(), iso: d.toISOString() };
  }

  async function hashText(algo, text) {
    var data = new TextEncoder().encode(String(text));
    var buf = await crypto.subtle.digest(algo, data);
    return Array.from(new Uint8Array(buf)).map(function (b) { return (b + 0x100).toString(16).slice(1); }).join('');
  }

  /* ---------- UI ---------- */
  function bigInput(W, ph, rows) { return W.el('textarea', { class: 'field wtext', rows: String(rows || 8), placeholder: ph || '', spellcheck: 'false' }); }
  function roBox(W, rows, label) { return W.el('textarea', { class: 'field wtext', rows: String(rows || 8), readonly: 'readonly', 'aria-label': label || 'Output', spellcheck: 'false' }); }
  function errNote(W) { return W.el('p', { class: 'note err', hidden: 'hidden', role: 'alert' }); }
  function stat(W, l, v) { return W.el('div', { class: 'calc-stat' }, [W.el('span', { text: l }), W.el('b', { text: String(v) })]); }

  var T = {

    'json-formatter': function (host, W) {
      var ta = bigInput(W, '{"paste":"your JSON here"}', 10);
      var out = roBox(W, 10, 'Formatted JSON');
      var err = errNote(W);
      function run(fn) {
        try { out.value = fn(ta.value); err.hidden = true; }
        catch (e) { err.hidden = false; err.textContent = 'Invalid JSON: ' + e.message; }
      }
      var btns = W.el('div', { class: 'wbtns' }, [
        W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Pretty-print', onClick: function () { run(function (t) { return formatJson(t, 2); }); } }),
        W.el('button', { class: 'btn', type: 'button', text: 'Minify', onClick: function () { run(minifyJson); } }),
        W.el('button', { class: 'btn', type: 'button', text: 'Validate', onClick: function () { try { JSON.parse(ta.value); err.hidden = false; err.classList.remove('err'); err.textContent = '✓ Valid JSON'; } catch (e) { err.classList.add('err'); err.hidden = false; err.textContent = 'Invalid: ' + e.message; } } }),
        W.copyBtn('Copy', function () { return out.value; })
      ]);
      host.appendChild(ta); host.appendChild(btns); host.appendChild(err); host.appendChild(out);
    },

    'base64': function (host, W) {
      var ta = bigInput(W, 'Text or Base64…', 6);
      var out = roBox(W, 6, 'Result');
      var err = errNote(W);
      var btns = W.el('div', { class: 'wbtns' }, [
        W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Encode →', onClick: function () { try { out.value = b64encode(ta.value); err.hidden = true; } catch (e) { err.hidden = false; err.textContent = 'Could not encode that.'; } } }),
        W.el('button', { class: 'btn', type: 'button', text: '← Decode', onClick: function () { try { out.value = b64decode(ta.value); err.hidden = true; } catch (e) { err.hidden = false; err.textContent = 'That isn’t valid Base64.'; } } }),
        W.copyBtn('Copy', function () { return out.value; })
      ]);
      host.appendChild(ta); host.appendChild(btns); host.appendChild(err); host.appendChild(out);
    },

    'jwt-decoder': function (host, W) {
      var ta = bigInput(W, 'Paste a JWT (eyJ…)', 5);
      var err = errNote(W);
      var hOut = roBox(W, 6, 'Header'), pOut = roBox(W, 8, 'Payload');
      var meta = W.el('div', { class: 'calc-stats' });
      function run() {
        try {
          var d = decodeJwt(ta.value); err.hidden = true;
          hOut.value = JSON.stringify(d.header, null, 2);
          pOut.value = JSON.stringify(d.payload, null, 2);
          meta.innerHTML = '';
          if (d.payload.exp) { var exp = new Date(d.payload.exp * 1000); meta.appendChild(stat(W, 'Expires', exp.toUTCString())); meta.appendChild(stat(W, 'Status', exp < new Date() ? 'EXPIRED' : 'valid')); }
          if (d.payload.iat) meta.appendChild(stat(W, 'Issued', new Date(d.payload.iat * 1000).toUTCString()));
        } catch (e) { err.hidden = false; err.textContent = e.message; hOut.value = pOut.value = ''; meta.innerHTML = ''; }
      }
      ta.addEventListener('input', W.debounce(run, 120));
      host.appendChild(ta); host.appendChild(err); host.appendChild(meta);
      host.appendChild(W.el('div', { class: 'wgrid2' }, [
        W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: 'Header' }), hOut]),
        W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: 'Payload' }), pOut])
      ]));
      host.appendChild(W.el('p', { class: 'note', text: 'Decoding only — this does not verify the signature (that needs the secret key). Never paste production tokens you don’t control.' }));
    },

    'uuid-generator': function (host, W) {
      var n = W.el('input', { class: 'field', type: 'number', value: '5', min: '1', max: '500', 'aria-label': 'How many' });
      var out = roBox(W, 8, 'UUIDs');
      function gen() { var c = Math.max(1, Math.min(500, +n.value || 1)), a = []; for (var i = 0; i < c; i++) a.push(uuidV4()); out.value = a.join('\n'); }
      host.appendChild(W.el('div', { class: 'wbtns' }, [n, W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Generate', onClick: gen }), W.copyBtn('Copy all', function () { return out.value; })]));
      host.appendChild(out); gen();
    },

    'hash-generator': function (host, W) {
      var ta = bigInput(W, 'Text to hash…', 5);
      var out = W.el('div', { class: 'calc-stats' });
      async function run() {
        out.innerHTML = '';
        if (!ta.value) return;
        var algos = ['SHA-256', 'SHA-1', 'SHA-512'];
        for (var i = 0; i < algos.length; i++) {
          try { var h = await hashText(algos[i], ta.value); var row = stat(W, algos[i], h); row.classList.add('wmono'); out.appendChild(row); } catch (e) {}
        }
      }
      ta.addEventListener('input', W.debounce(run, 150));
      host.appendChild(ta); host.appendChild(out);
      host.appendChild(W.el('p', { class: 'note', text: 'Hashed with the browser’s built-in Web Crypto — nothing is sent anywhere. MD5 is deliberately omitted; it’s broken and unsafe for anything security-related.' }));
    },

    'regex-tester': function (host, W) {
      var pat = W.el('input', { class: 'field wmono', type: 'text', placeholder: 'pattern e.g. \\b\\w+@\\w+', spellcheck: 'false', 'aria-label': 'Pattern' });
      var flags = W.el('input', { class: 'field wmono', type: 'text', value: 'g', maxlength: '6', 'aria-label': 'Flags', style: 'max-width:6rem' });
      var ta = bigInput(W, 'Test string…', 8);
      var out = W.el('div', { class: 'wdiff' });
      var head = W.el('p', { class: 'note' });
      var err = errNote(W);
      function run() {
        var re;
        try { re = new RegExp(pat.value || '(?:)', flags.value.replace(/[^gimsuy]/g, '')); err.hidden = true; }
        catch (e) { err.hidden = false; err.textContent = 'Invalid regex: ' + e.message; return; }
        var text = ta.value, m, count = 0, html = W.escapeHtml(text), matches = [];
        try {
          if (re.global) { while ((m = re.exec(text)) !== null) { count++; matches.push(m[0]); if (m.index === re.lastIndex) re.lastIndex++; if (count > 5000) break; } }
          else { m = re.exec(text); if (m) { count = 1; matches.push(m[0]); } }
        } catch (e) {}
        head.textContent = count + ' match' + (count === 1 ? '' : 'es');
        out.innerHTML = '';
        matches.slice(0, 100).forEach(function (x) { out.appendChild(W.el('div', { class: 'wdl wdl-add wmono', text: x })); });
      }
      [pat, flags, ta].forEach(function (x) { x.addEventListener('input', W.debounce(run, 120)); });
      host.appendChild(W.el('div', { class: 'wbtns' }, [pat, flags]));
      host.appendChild(err); host.appendChild(ta); host.appendChild(head); host.appendChild(out);
    },

    'url-encoder': function (host, W) {
      var ta = bigInput(W, 'URL or text…', 5);
      var out = roBox(W, 5, 'Result');
      var comp = W.el('label', { class: 'wcheck' }, [W.el('input', { type: 'checkbox', checked: 'checked' }), W.el('span', { text: 'Encode each component (safer for query values)' })]);
      var cb = comp.querySelector('input');
      var btns = W.el('div', { class: 'wbtns' }, [
        W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Encode', onClick: function () { out.value = encodeUrl(ta.value, cb.checked); } }),
        W.el('button', { class: 'btn', type: 'button', text: 'Decode', onClick: function () { try { out.value = decodeUrl(ta.value, cb.checked); } catch (e) { out.value = 'Could not decode — check for stray % signs.'; } } }),
        W.copyBtn('Copy', function () { return out.value; })
      ]);
      host.appendChild(ta); host.appendChild(comp); host.appendChild(btns); host.appendChild(out);
    },

    'timestamp-converter': function (host, W) {
      var now = W.el('p', { class: 'note' });
      function tick() { now.textContent = 'Now: ' + Math.floor(Date.now() / 1000) + ' (Unix seconds)'; }
      tick(); var iv = setInterval(tick, 1000); window.addEventListener('pagehide', function () { clearInterval(iv); });
      var uin = W.el('input', { class: 'field wmono', type: 'text', placeholder: '1753280000', 'aria-label': 'Unix timestamp' });
      var uout = W.el('div', { class: 'calc-stats' });
      uin.addEventListener('input', function () {
        uout.innerHTML = ''; if (!uin.value.trim()) return;
        try { var r = fromUnix(uin.value.trim()); [['ISO 8601', r.iso], ['UTC', r.utc], ['Your local time', r.local]].forEach(function (p) { uout.appendChild(stat(W, p[0], p[1])); }); }
        catch (e) { uout.appendChild(W.el('p', { class: 'note err', text: e.message })); }
      });
      var din = W.el('input', { class: 'field wmono', type: 'text', placeholder: '2026-07-23T14:30', 'aria-label': 'Date' });
      var dout = W.el('div', { class: 'calc-stats' });
      din.addEventListener('input', function () {
        dout.innerHTML = ''; if (!din.value.trim()) return;
        try { var r = toUnix(din.value.trim()); [['Unix seconds', r.seconds], ['Milliseconds', r.millis], ['ISO 8601', r.iso]].forEach(function (p) { dout.appendChild(stat(W, p[0], p[1])); }); }
        catch (e) { dout.appendChild(W.el('p', { class: 'note err', text: e.message })); }
      });
      host.appendChild(now);
      host.appendChild(W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: 'Unix → date' }), uin])); host.appendChild(uout);
      host.appendChild(W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: 'Date → Unix' }), din])); host.appendChild(dout);
    }
  };

  root.VKDev = { formatJson: formatJson, minifyJson: minifyJson, b64encode: b64encode, b64decode: b64decode,
    decodeJwt: decodeJwt, uuidV4: uuidV4, encodeUrl: encodeUrl, decodeUrl: decodeUrl, fromUnix: fromUnix, toUnix: toUnix, hashText: hashText };
  if (typeof module === 'object' && module.exports) module.exports = root.VKDev;

  if (typeof root.VKW !== 'undefined') { Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); } }
})(typeof window !== 'undefined' ? window : globalThis);
