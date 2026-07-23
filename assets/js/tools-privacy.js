/* tools-privacy.js — privacy & security tools, all on-device.
 * Randomness and crypto use the browser's Web Crypto (crypto.getRandomValues,
 * SubtleCrypto) — no library, no network. Pure logic (passwordEntropy,
 * strengthLabel) is unit-tested. */
(function (root) {
  'use strict';

  var SETS = { lower: 'abcdefghijklmnopqrstuvwxyz', upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', digits: '0123456789', symbols: '!@#$%^&*()-_=+[]{};:,.<>?' };

  function randInt(max) { // unbiased in [0,max)
    var arr = new Uint32Array(1), limit = Math.floor(0xFFFFFFFF / max) * max, x;
    do { crypto.getRandomValues(arr); x = arr[0]; } while (x >= limit);
    return x % max;
  }
  function makePassword(len, opts) {
    var pool = '';
    if (opts.lower) pool += SETS.lower;
    if (opts.upper) pool += SETS.upper;
    if (opts.digits) pool += SETS.digits;
    if (opts.symbols) pool += SETS.symbols;
    if (!pool) return '';
    var out = '';
    for (var i = 0; i < len; i++) out += pool[randInt(pool.length)];
    return out;
  }

  /* entropy in bits = length * log2(poolSize) */
  function passwordEntropy(pw) {
    if (!pw) return 0;
    var pool = 0;
    if (/[a-z]/.test(pw)) pool += 26;
    if (/[A-Z]/.test(pw)) pool += 26;
    if (/[0-9]/.test(pw)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(pw)) pool += 32;
    return Math.round(pw.length * Math.log2(pool || 1));
  }
  function strengthLabel(bits) {
    if (bits < 28) return { label: 'Very weak', pct: 15 };
    if (bits < 36) return { label: 'Weak', pct: 33 };
    if (bits < 60) return { label: 'Reasonable', pct: 55 };
    if (bits < 128) return { label: 'Strong', pct: 80 };
    return { label: 'Very strong', pct: 100 };
  }
  function crackTime(bits) {
    // assume 1e10 guesses/sec (offline fast attacker); time = 2^bits / 2 / rate
    var seconds = Math.pow(2, bits) / 2 / 1e10;
    var units = [['years', 31536000], ['days', 86400], ['hours', 3600], ['minutes', 60], ['seconds', 1]];
    if (seconds < 1) return 'instant';
    if (seconds > 3.15e14) return 'centuries';
    for (var i = 0; i < units.length; i++) { if (seconds >= units[i][1]) return Math.round(seconds / units[i][1]).toLocaleString() + ' ' + units[i][0]; }
    return 'instant';
  }

  /* AES-GCM with a PBKDF2-derived key from a passphrase */
  async function deriveKey(pass, salt) {
    var base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  function b64(bytes) { var s = ''; bytes.forEach(function (b) { s += String.fromCharCode(b); }); return btoa(s); }
  function unb64(str) { var bin = atob(str.replace(/\s+/g, '')); var a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  async function encryptText(plain, pass) {
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    var key = await deriveKey(pass, salt);
    var ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(plain)));
    var out = new Uint8Array(salt.length + iv.length + ct.length);
    out.set(salt, 0); out.set(iv, 16); out.set(ct, 28);
    return 'VK1:' + b64(out);
  }
  async function decryptText(blobStr, pass) {
    if (blobStr.indexOf('VK1:') !== 0) throw new Error('This doesn’t look like text encrypted here (missing VK1 header).');
    var all = unb64(blobStr.slice(4));
    var salt = all.slice(0, 16), iv = all.slice(16, 28), ct = all.slice(28);
    var key = await deriveKey(pass, salt);
    try {
      var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct);
      return new TextDecoder().decode(pt);
    } catch (e) { throw new Error('Wrong passphrase, or the text was altered.'); }
  }

  /* ---------- UI ---------- */
  function fld(W, label, node) { return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: label }), node]); }
  function stat(W, l, v) { return W.el('div', { class: 'calc-stat' }, [W.el('span', { text: l }), W.el('b', { text: String(v) })]); }
  function chk(W, label, on) { var l = W.el('label', { class: 'wcheck' }, [W.el('input', { type: 'checkbox' }), W.el('span', { text: label })]); if (on) l.querySelector('input').checked = true; return l; }

  var T = {

    'password-generator': function (host, W) {
      var len = W.el('input', { class: 'field', type: 'range', min: '6', max: '48', value: '18' });
      var lenOut = W.el('output', { class: 'ft-out', text: '18' });
      len.addEventListener('input', function () { lenOut.textContent = len.value; gen(); });
      var boxes = { lower: chk(W, 'a-z', true), upper: chk(W, 'A-Z', true), digits: chk(W, '0-9', true), symbols: chk(W, 'Symbols', true) };
      var out = W.el('input', { class: 'field wmono', type: 'text', readonly: 'readonly', 'aria-label': 'Generated password', style: 'font-size:var(--t-lg)' });
      var meter = W.el('div', { class: 'wmeter' }, [W.el('i')]);
      var note = W.el('p', { class: 'note' });
      function opts() { return { lower: boxes.lower.querySelector('input').checked, upper: boxes.upper.querySelector('input').checked, digits: boxes.digits.querySelector('input').checked, symbols: boxes.symbols.querySelector('input').checked }; }
      function gen() {
        var pw = makePassword(+len.value, opts());
        out.value = pw;
        var bits = passwordEntropy(pw), s = strengthLabel(bits);
        meter.firstChild.style.width = s.pct + '%';
        meter.firstChild.className = 'meter-' + (s.pct < 40 ? 'weak' : s.pct < 80 ? 'ok' : 'strong');
        note.textContent = pw ? s.label + ' · ' + bits + ' bits · offline crack time ≈ ' + crackTime(bits) : 'Pick at least one character set.';
      }
      Object.keys(boxes).forEach(function (k) { boxes[k].addEventListener('change', gen); });
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('span', { class: 'wlab', text: 'Length' }), len, lenOut]));
      host.appendChild(W.el('div', { class: 'wbtns' }, [boxes.lower, boxes.upper, boxes.digits, boxes.symbols]));
      host.appendChild(out); host.appendChild(meter); host.appendChild(note);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Regenerate', onClick: gen }), W.copyBtn('Copy', function () { return out.value; })]));
      gen();
      host.appendChild(W.el('p', { class: 'note', text: 'Generated with the browser’s cryptographic RNG. Nothing is transmitted or stored — reload and it’s gone.' }));
    },

    'password-strength': function (host, W) {
      var inp = W.el('input', { class: 'field wmono', type: 'text', placeholder: 'Type a password to test…', 'aria-label': 'Password', autocomplete: 'off' });
      var meter = W.el('div', { class: 'wmeter' }, [W.el('i')]);
      var stats = W.el('div', { class: 'calc-stats' });
      function upd() {
        var pw = inp.value, bits = passwordEntropy(pw), s = strengthLabel(bits);
        meter.firstChild.style.width = (pw ? s.pct : 0) + '%';
        meter.firstChild.className = 'meter-' + (s.pct < 40 ? 'weak' : s.pct < 80 ? 'ok' : 'strong');
        stats.innerHTML = '';
        if (!pw) return;
        [['Strength', s.label], ['Entropy', bits + ' bits'], ['Length', pw.length], ['Crack time (offline)', crackTime(bits)]].forEach(function (p) { stats.appendChild(stat(W, p[0], p[1])); });
      }
      inp.addEventListener('input', upd);
      host.appendChild(inp); host.appendChild(meter); host.appendChild(stats);
      host.appendChild(W.el('p', { class: 'note', text: 'Checked entirely in your browser — this password is never sent anywhere. Estimate assumes a fast offline attacker (10 billion guesses/sec).' }));
    },

    'text-encrypt': function (host, W) {
      var ta = W.el('textarea', { class: 'field wtext', rows: '6', placeholder: 'Text to encrypt, or VK1:… to decrypt', spellcheck: 'false' });
      var pass = W.el('input', { class: 'field', type: 'password', placeholder: 'Passphrase', 'aria-label': 'Passphrase', autocomplete: 'off' });
      var out = W.el('textarea', { class: 'field wtext wmono', rows: '6', readonly: 'readonly', 'aria-label': 'Result' });
      var err = W.el('p', { class: 'note err', hidden: 'hidden', role: 'alert' });
      async function enc() { err.hidden = true; if (!pass.value) { err.hidden = false; err.textContent = 'Enter a passphrase.'; return; } try { out.value = await encryptText(ta.value, pass.value); } catch (e) { err.hidden = false; err.textContent = 'Could not encrypt.'; } }
      async function dec() { err.hidden = true; try { out.value = await decryptText(ta.value.trim(), pass.value); } catch (e) { err.hidden = false; err.textContent = e.message; } }
      host.appendChild(fld(W, 'Message', ta)); host.appendChild(fld(W, 'Passphrase', pass));
      host.appendChild(W.el('div', { class: 'wbtns' }, [
        W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Encrypt', onClick: enc }),
        W.el('button', { class: 'btn', type: 'button', text: 'Decrypt', onClick: dec }),
        W.copyBtn('Copy', function () { return out.value; })
      ]));
      host.appendChild(err); host.appendChild(out);
      host.appendChild(W.el('p', { class: 'note', text: 'AES-256-GCM with a PBKDF2-derived key (150k iterations), all in your browser. Share the passphrase separately. Lose it and the text is unrecoverable — there is no backdoor.' }));
    },

    'file-checksum': function (host, W) {
      var input = W.el('input', { type: 'file', class: 'field', 'aria-label': 'Choose a file' });
      var out = W.el('div', { class: 'calc-stats' });
      var status = W.el('p', { class: 'note' });
      var compare = W.el('input', { class: 'field wmono', type: 'text', placeholder: 'Paste an expected hash to compare (optional)', 'aria-label': 'Expected hash' });
      input.addEventListener('change', async function () {
        var f = input.files[0]; if (!f) return;
        out.innerHTML = ''; status.textContent = 'Hashing ' + f.name + '…';
        var buf = await f.arrayBuffer();
        var algos = ['SHA-256', 'SHA-1', 'SHA-512'];
        for (var i = 0; i < algos.length; i++) {
          var h = Array.from(new Uint8Array(await crypto.subtle.digest(algos[i], buf))).map(function (b) { return (b + 0x100).toString(16).slice(1); }).join('');
          var row = stat(W, algos[i], h); row.classList.add('wmono'); out.appendChild(row);
          if (algos[i] === 'SHA-256' && compare.value.trim()) { var match = compare.value.trim().toLowerCase() === h; status.textContent = match ? '✓ SHA-256 matches the expected hash' : '✗ SHA-256 does NOT match'; status.className = 'note ' + (match ? '' : 'err'); }
        }
        if (!compare.value.trim()) status.textContent = 'Hashed ' + f.name + ' (' + Math.round(f.size / 1024).toLocaleString() + ' KB) on your device.';
      });
      host.appendChild(fld(W, 'File', input));
      host.appendChild(fld(W, 'Expected hash (optional)', compare));
      host.appendChild(status); host.appendChild(out);
      host.appendChild(W.el('p', { class: 'note', text: 'The file is read locally and hashed with Web Crypto — it is never uploaded. Use this to verify a download matches the checksum a publisher lists.' }));
    }
  };

  root.VKPrivacy = { makePassword: makePassword, passwordEntropy: passwordEntropy, strengthLabel: strengthLabel, crackTime: crackTime, encryptText: encryptText, decryptText: decryptText };
  if (typeof module === 'object' && module.exports) module.exports = root.VKPrivacy;
  if (typeof root.VKW !== 'undefined') { Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); } }
})(typeof window !== 'undefined' ? window : globalThis);
