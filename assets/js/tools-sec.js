/* tools-sec.js — security & validation tools. All on-device.
 * Pure logic exported on root.VKSec for unit tests; widgets register into VKW.
 * TOTP uses the browser's Web Crypto (HMAC-SHA1). No libraries, no network. */
(function (root) {
  'use strict';

  /* ---------- pure logic ---------- */

  var WORDS = ('able acid aged also area army away baby back ball band bank base bath bear beat been beer bell belt best bird blue boat body bone book boot born boss both bowl bulk burn bush busy calm came camp card care cart case cash cell chat chip city clay club coal coat code coin cold cook cool cope core corn cost crew crop dark data date dawn days dead deal dear debt deep desk dial diet dirt dish dock does done door dose down draw drop drug drum dual duck dust duty each earn ease east easy edge else even ever face fact fade fair fall farm fast fate fear feed feel feet fell felt file fill film find fine fire firm fish five flag flat flow foam fold folk food foot ford form fort four free frog fuel full fund gain game gate gave gear gift girl give glad goal goat gold golf gone good gray grew grid grip grow gulf hair half hall hand hang hard harm hawk head heat held hero hide high hill hint hold hole holy home hope horn host hour huge hunt idea inch iron item jade jazz join jump jury just keen keep kept kick kind king knee knew knot know lace lack lake lamp land lane last late lawn lazy lead leaf lean leap left lend lens less life lift like limb lime line link lion list live load loan lock loft logo lone long look loop lord lose loss lost loud love luck lump lung made mail main make many mark mash mask mass mast math meal mean meat meet melt menu mere mesh mild mile milk mind mine mint miss mist mode mood moon more most moth move much mule name navy near neat neck need nest news next nice node none noon norm nose note noun oath obey odds okay once only onto open oval oven over pace pack page paid pain pair pale palm park part past path peak pear peer pick pile pine pink pipe plan play plot plug plus poem poet pole poll pond pool poor port post pour pull pump pure push quiz race rack rage raid rail rain rank rare rate read real rely rent rest rice rich ride ring riot rise risk road roar rock role roll roof room root rope rose ruby rule rush rust safe said sail salt same sand save says scan seal seat seed seek seem seen self sell send sent ship shoe shop shot show shut sick side sign silk sing sink site size skin slip slot slow snap snow soap sofa soft soil sold sole solo some song sort soul soup sour spin spot star stay stem step stir stop such suit sung sure surf swap swim tail take tale talk tall tank tape task team tear tech tell tend tent term test text than that them then they thin this tide tidy tile time tiny told toll tone took tool torn tour town trap tray tree trim trip true tube tune turn twin type unit vary vast very vibe view vine visa void vote wage wait wake walk wall want ward warm warn wash wave wear week well went were west what when whom wide wife wild will wind wine wing wire wise wish with wolf wood wool word wore work worn yard yarn yeah year your zero zone zoom').split(' ');

  function randInt(max) {
    if (root.crypto && crypto.getRandomValues) { var u = new Uint32Array(1); crypto.getRandomValues(u); return u[0] % max; }
    return Math.floor(Math.random() * max);
  }
  function passphrase(count, sep, capitalize, addNumber) {
    count = Math.max(2, Math.min(12, count || 4));
    var out = [];
    for (var i = 0; i < count; i++) {
      var w = WORDS[randInt(WORDS.length)];
      if (capitalize) w = w.charAt(0).toUpperCase() + w.slice(1);
      out.push(w);
    }
    var s = out.join(sep == null ? '-' : sep);
    if (addNumber) s += (sep == null ? '-' : sep) + (randInt(90) + 10);
    return s;
  }
  function randomInt(min, max) {
    min = Math.ceil(min); max = Math.floor(max);
    var range = max - min + 1;
    if (range <= 0) return min;
    return min + randInt(range);
  }

  // Luhn check-digit validation + brand.
  function luhn(num) {
    var s = String(num).replace(/\D/g, '');
    if (s.length < 12) return false;
    var sum = 0, alt = false;
    for (var i = s.length - 1; i >= 0; i--) { var d = +s[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } sum += d; alt = !alt; }
    return sum % 10 === 0;
  }
  function cardBrand(num) {
    var s = String(num).replace(/\D/g, '');
    if (/^4/.test(s)) return 'Visa';
    if (/^(5[1-5]|2[2-7])/.test(s)) return 'Mastercard';
    if (/^3[47]/.test(s)) return 'American Express';
    if (/^(6011|65|64[4-9])/.test(s)) return 'Discover';
    if (/^3(0[0-5]|[68])/.test(s)) return 'Diners Club';
    if (/^35/.test(s)) return 'JCB';
    return 'Unknown';
  }

  // IBAN mod-97 validation.
  function ibanValid(iban) {
    var s = String(iban).replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(s) || s.length < 15 || s.length > 34) return false;
    var re = s.slice(4) + s.slice(0, 4);
    var expanded = re.replace(/[A-Z]/g, function (c) { return (c.charCodeAt(0) - 55).toString(); });
    var rem = 0;
    for (var i = 0; i < expanded.length; i += 7) { rem = parseInt(String(rem) + expanded.substr(i, 7), 10) % 97; }
    return rem === 1;
  }

  function base32ToBytes(b32) {
    var alph = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    b32 = String(b32).toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
    var bits = '', bytes = [];
    for (var i = 0; i < b32.length; i++) { var idx = alph.indexOf(b32[i]); if (idx < 0) continue; bits += ('00000' + idx.toString(2)).slice(-5); }
    for (var j = 0; j + 8 <= bits.length; j += 8) bytes.push(parseInt(bits.substr(j, 8), 2));
    return new Uint8Array(bytes);
  }
  async function totp(secretB32, opts) {
    opts = opts || {};
    var step = opts.step || 30, digits = opts.digits || 6;
    var t = Math.floor((opts.now || Date.now()) / 1000);
    var counter = Math.floor(t / step);
    var buf = new ArrayBuffer(8), view = new DataView(buf);
    view.setUint32(0, Math.floor(counter / 0x100000000));
    view.setUint32(4, counter >>> 0);
    var key = base32ToBytes(secretB32);
    var ck = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    var sig = new Uint8Array(await crypto.subtle.sign('HMAC', ck, buf));
    var off = sig[sig.length - 1] & 0x0f;
    var bin = ((sig[off] & 0x7f) << 24) | ((sig[off + 1] & 0xff) << 16) | ((sig[off + 2] & 0xff) << 8) | (sig[off + 3] & 0xff);
    var code = (bin % Math.pow(10, digits)).toString();
    while (code.length < digits) code = '0' + code;
    return code;
  }

  /* ---------- UI helpers ---------- */
  function roBox(W, rows, label) { return W.el('textarea', { class: 'field wtext', rows: String(rows || 4), readonly: 'readonly', 'aria-label': label || 'Output', spellcheck: 'false' }); }
  function stat(W, l, v) { return W.el('div', { class: 'calc-stat' }, [W.el('span', { text: l }), W.el('b', { text: String(v) })]); }
  function numIn(W, label, val, min, max) { return W.el('input', { class: 'field', type: 'number', value: String(val), min: String(min), max: String(max), 'aria-label': label }); }

  var T = {

    'passphrase-generator': function (host, W) {
      var count = numIn(W, 'Words', 4, 2, 12);
      var sep = W.el('select', { class: 'field', 'aria-label': 'Separator' }, [
        W.el('option', { value: '-', text: 'hyphen -' }), W.el('option', { value: '.', text: 'dot .' }),
        W.el('option', { value: '_', text: 'underscore _' }), W.el('option', { value: ' ', text: 'space' })
      ]);
      var cap = W.el('input', { type: 'checkbox', checked: 'checked', 'aria-label': 'Capitalise' });
      var num = W.el('input', { type: 'checkbox', checked: 'checked', 'aria-label': 'Add a number' });
      var out = roBox(W, 2, 'Passphrase');
      function gen() { out.value = passphrase(+count.value, sep.value, cap.checked, num.checked); }
      host.appendChild(W.el('div', { class: 'wbtns' }, [
        W.el('label', { class: 'winline' }, [W.el('span', { class: 'wlab', text: 'Words' }), count]),
        W.el('label', { class: 'winline' }, [W.el('span', { class: 'wlab', text: 'Separator' }), sep]),
        W.el('label', { class: 'winline' }, [cap, W.el('span', { text: ' Capitalise' })]),
        W.el('label', { class: 'winline' }, [num, W.el('span', { text: ' Add number' })])
      ]));
      host.appendChild(W.el('div', { class: 'wbtns' }, [
        W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Generate', onClick: gen }),
        W.copyBtn('Copy', function () { return out.value; })
      ]));
      host.appendChild(out);
      host.appendChild(W.el('p', { class: 'note', text: 'Word-based passphrases are easy to remember and hard to crack. Generated with the browser’s cryptographic RNG — nothing leaves your device.' }));
      gen();
    },

    'totp-generator': function (host, W) {
      var secret = W.el('input', { class: 'field wmono', type: 'text', placeholder: 'Base32 secret (e.g. JBSWY3DPEHPK3PXP)', 'aria-label': 'TOTP secret' });
      var codeEl = W.el('b', { class: 'wmono', text: '––––––', style: 'font-size:1.6rem;letter-spacing:.15em' });
      var meta = W.el('div', { class: 'calc-stats' });
      var err = W.el('p', { class: 'note err', hidden: 'hidden', role: 'alert' });
      async function tick() {
        var s = secret.value.trim();
        if (!s) { codeEl.textContent = '––––––'; meta.innerHTML = ''; err.hidden = true; return; }
        try {
          var code = await totp(s, {});
          codeEl.textContent = code.slice(0, 3) + ' ' + code.slice(3);
          var left = 30 - (Math.floor(Date.now() / 1000) % 30);
          meta.innerHTML = ''; meta.appendChild(stat(W, 'Refreshes in', left + 's'));
          err.hidden = true;
        } catch (e) { codeEl.textContent = '––––––'; err.hidden = false; err.textContent = 'That secret isn’t valid Base32.'; }
      }
      secret.addEventListener('input', tick);
      var iv = setInterval(tick, 1000); window.addEventListener('pagehide', function () { clearInterval(iv); });
      host.appendChild(W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: 'Secret key (Base32)' }), secret]));
      host.appendChild(err);
      host.appendChild(W.el('div', { class: 'calc-headline' }, [W.el('span', { class: 'ch-label', text: 'Current code' }), codeEl]));
      host.appendChild(meta);
      host.appendChild(W.el('p', { class: 'note', text: 'Standard 6-digit TOTP (RFC 6238, 30-second window) — the same codes an authenticator app shows. Computed locally; your secret never leaves the browser. For convenience only; keep 2FA in a real authenticator app.' }));
      tick();
    },

    'random-number-generator': function (host, W) {
      var min = numIn(W, 'Minimum', 1, -1e9, 1e9), max = numIn(W, 'Maximum', 100, -1e9, 1e9), count = numIn(W, 'How many', 1, 1, 1000);
      var uniq = W.el('input', { type: 'checkbox', 'aria-label': 'Unique only' });
      var out = roBox(W, 4, 'Random numbers');
      function gen() {
        var lo = +min.value, hi = +max.value, n = Math.max(1, Math.min(1000, +count.value | 0));
        if (hi < lo) { var t = lo; lo = hi; hi = t; }
        var res = [];
        if (uniq.checked) {
          var pool = hi - lo + 1; n = Math.min(n, pool);
          var seen = {};
          while (res.length < n) { var r = randomInt(lo, hi); if (!seen[r]) { seen[r] = 1; res.push(r); } }
        } else { for (var i = 0; i < n; i++) res.push(randomInt(lo, hi)); }
        out.value = res.join(n > 20 ? ', ' : '\n');
      }
      host.appendChild(W.el('div', { class: 'wbtns' }, [
        W.el('label', { class: 'winline' }, [W.el('span', { class: 'wlab', text: 'Min' }), min]),
        W.el('label', { class: 'winline' }, [W.el('span', { class: 'wlab', text: 'Max' }), max]),
        W.el('label', { class: 'winline' }, [W.el('span', { class: 'wlab', text: 'Count' }), count]),
        W.el('label', { class: 'winline' }, [uniq, W.el('span', { text: ' Unique' })])
      ]));
      host.appendChild(W.el('div', { class: 'wbtns' }, [
        W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Generate', onClick: gen }),
        W.copyBtn('Copy', function () { return out.value; })
      ]));
      host.appendChild(out);
      host.appendChild(W.el('p', { class: 'note', text: 'Uses the browser’s cryptographic random source. Great for draws, sampling and test data.' }));
      gen();
    },

    'credit-card-validator': function (host, W) {
      var inp = W.el('input', { class: 'field wmono', type: 'text', placeholder: '4111 1111 1111 1111', 'aria-label': 'Card number' });
      var meta = W.el('div', { class: 'calc-stats' });
      function run() {
        meta.innerHTML = '';
        var s = inp.value.replace(/\D/g, '');
        if (!s) return;
        meta.appendChild(stat(W, 'Valid (Luhn)', luhn(s) ? '✓ Yes' : '✗ No'));
        meta.appendChild(stat(W, 'Brand', cardBrand(s)));
        meta.appendChild(stat(W, 'Digits', s.length));
      }
      inp.addEventListener('input', W.debounce(run, 120));
      host.appendChild(W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: 'Card number' }), inp]));
      host.appendChild(meta);
      host.appendChild(W.el('p', { class: 'note', text: 'Checks the Luhn check digit and detects the card brand from its prefix. This only validates the format — it does not check whether a card is real or active. Nothing is stored or sent.' }));
    },

    'iban-validator': function (host, W) {
      var inp = W.el('input', { class: 'field wmono', type: 'text', placeholder: 'GB82 WEST 1234 5698 7654 32', 'aria-label': 'IBAN' });
      var meta = W.el('div', { class: 'calc-stats' });
      function run() {
        meta.innerHTML = '';
        var s = inp.value.replace(/\s/g, '').toUpperCase();
        if (!s) return;
        meta.appendChild(stat(W, 'Valid (mod-97)', ibanValid(s) ? '✓ Yes' : '✗ No'));
        meta.appendChild(stat(W, 'Country', s.slice(0, 2)));
        meta.appendChild(stat(W, 'Length', s.length));
      }
      inp.addEventListener('input', W.debounce(run, 120));
      host.appendChild(W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: 'IBAN' }), inp]));
      host.appendChild(meta);
      host.appendChild(W.el('p', { class: 'note', text: 'Validates the IBAN structure and mod-97 check digits. It does not confirm the account exists. Nothing is stored or sent.' }));
    }

  };

  root.VKSec = { passphrase: passphrase, randomInt: randomInt, luhn: luhn, cardBrand: cardBrand, ibanValid: ibanValid, totp: totp, base32ToBytes: base32ToBytes };
  if (typeof module === 'object' && module.exports) module.exports = root.VKSec;

  if (typeof root.VKW !== 'undefined') {
    Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); }
  }
})(typeof window !== 'undefined' ? window : globalThis);
