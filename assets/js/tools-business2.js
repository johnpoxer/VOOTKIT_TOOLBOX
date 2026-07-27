/* tools-business2.js — name generator, inventory tracker, business card maker,
 * vCard QR. All on-device. Inventory persists in localStorage on your device;
 * the QR uses the qrcode library (MIT) lazy-loaded from a CDN. */
(function (root) {
  'use strict';

  var QRCODE_URL = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
  function lazyQr() {
    if (root.QRCode) return Promise.resolve(root.QRCode);
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = QRCODE_URL; s.async = true;
      s.onload = function () { root.QRCode ? res(root.QRCode) : rej(new Error('QR library unavailable.')); };
      s.onerror = function () { rej(new Error('Could not load the QR library — check your connection.')); };
      document.head.appendChild(s);
    });
  }
  function fld(W, l, n) { return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: l }), n]); }
  function inp(W, ph, v) { var e = W.el('input', { class: 'field', type: 'text', placeholder: ph || '', 'aria-label': ph || 'field' }); if (v != null) e.value = v; return e; }
  function money(n) { return (Math.round(n * 100) / 100).toLocaleString(); }
  function store(key, def) { try { return JSON.parse(localStorage.getItem(key) || 'null') || def; } catch (e) { return def; } }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  /* ---------- pure: name generator ---------- */
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  var PRE = ['Go', 'Get', 'Try', 'My', 'The', 'Up', 'Next', 'Neo', 'Prime', 'True', 'Nova', 'Peak'];
  var SUF = ['ly', 'ify', 'hub', 'labs', 'works', 'base', 'kit', 'flow', 'wise', 'spot', 'HQ', 'io', 'yard', 'forge', 'loop', 'core'];
  var TECH = ['Cloud', 'Bay', 'Link', 'Nest', 'Grid', 'Pulse', 'Verse', 'Craft', 'Mint', 'Drift'];
  function generateNames(keyword, n, rnd) {
    rnd = rnd || Math.random;
    var k = String(keyword || '').trim().replace(/\s+/g, ''); if (!k) k = 'brand';
    var K = cap(k), out = {};
    function add(s) { s = s.replace(/\s+/g, ''); if (s && !out[s.toLowerCase()]) out[s.toLowerCase()] = s; }
    [K + 'ly', K + 'ify', 'Go' + K, 'Get' + K, K + 'Hub', K + 'Labs', K + 'Works', 'The' + K, K + 'HQ', K + 'Kit', K + 'Flow', K + 'Base'].forEach(add);
    function ri(a) { return Math.floor(rnd() * a.length); }
    var tries = 0;
    while (Object.keys(out).length < n && tries < 300) {
      tries++;
      var m = Math.floor(rnd() * 4);
      if (m === 0) add(PRE[ri(PRE)] + K);
      else if (m === 1) add(K + SUF[ri(SUF)]);
      else if (m === 2) add(K + TECH[ri(TECH)]);
      else add(PRE[ri(PRE)] + K + SUF[ri(SUF)]);
    }
    return Object.keys(out).map(function (key) { return out[key]; }).slice(0, n);
  }

  var T = {

    'business-name-generator': function (host, W) {
      var kw = inp(W, 'A word about your business', 'coffee');
      var out = W.el('div', { class: 'wpages' });
      function gen() {
        out.innerHTML = '';
        generateNames(kw.value, 18).forEach(function (name) {
          out.appendChild(W.el('div', { class: 'wpage', style: 'padding:10px 12px;font-weight:600' }, [W.el('span', { text: name })]));
        });
      }
      kw.addEventListener('input', W.debounce(gen, 200));
      host.appendChild(fld(W, 'Keyword', kw));
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Shuffle', onClick: gen })]));
      host.appendChild(out);
      host.appendChild(W.el('p', { class: 'note', text: 'Combines your keyword with common startup prefixes, suffixes and tech words. No AI, no tracking — check availability before you commit to a name.' }));
      gen();
    },

    'inventory-tracker': function (host, W) {
      var KEY = 'vk_inventory_v1';
      var items = [];
      try { items = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { items = []; }
      function save() { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {} }
      var tbody = W.el('tbody');
      var totals = W.el('div', { class: 'calc-stats' });
      function render() {
        tbody.innerHTML = '';
        var stock = 0, cost = 0, rev = 0;
        items.forEach(function (it, i) {
          stock += (+it.qty || 0); cost += (+it.qty || 0) * (+it.cost || 0); rev += (+it.qty || 0) * (+it.price || 0);
          var tr = W.el('tr', {}, [
            W.el('td', { text: it.name }),
            W.el('td', { text: String(it.qty), style: 'text-align:right' }),
            W.el('td', { text: money(it.cost), style: 'text-align:right' }),
            W.el('td', { text: money(it.price), style: 'text-align:right' }),
            W.el('td', { text: money((+it.qty || 0) * (+it.price || 0)), style: 'text-align:right' }),
            W.el('td', {}, [W.el('button', { class: 'btn', type: 'button', text: '✕', 'aria-label': 'Remove', onClick: function () { items.splice(i, 1); save(); render(); } })])
          ]);
          tbody.appendChild(tr);
        });
        totals.innerHTML = '';
        [['Items', items.length], ['Units in stock', stock], ['Stock cost', money(cost)], ['Retail value', money(rev)], ['Potential profit', money(rev - cost)]].forEach(function (s) {
          totals.appendChild(W.el('div', { class: 'calc-stat' }, [W.el('span', { text: s[0] }), W.el('b', { text: String(s[1]) })]));
        });
      }
      var nName = inp(W, 'Item name'), nQty = W.el('input', { class: 'field', type: 'number', value: '1', min: '0', 'aria-label': 'Quantity' });
      var nCost = W.el('input', { class: 'field', type: 'number', value: '0', min: '0', step: 'any', 'aria-label': 'Unit cost' });
      var nPrice = W.el('input', { class: 'field', type: 'number', value: '0', min: '0', step: 'any', 'aria-label': 'Sell price' });
      var addBtn = W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Add item', onClick: function () {
        if (!nName.value.trim()) return;
        items.push({ name: nName.value.trim(), qty: +nQty.value || 0, cost: +nCost.value || 0, price: +nPrice.value || 0 });
        nName.value = ''; nQty.value = '1'; nCost.value = '0'; nPrice.value = '0'; save(); render(); nName.focus();
      } });
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Item', nName), fld(W, 'Qty', nQty), fld(W, 'Unit cost', nCost), fld(W, 'Sell price', nPrice)]));
      host.appendChild(W.el('div', { class: 'wbtns' }, [addBtn, W.el('button', { class: 'btn', type: 'button', text: 'Clear all', onClick: function () { if (items.length && confirm('Remove all items?')) { items = []; save(); render(); } } })]));
      var table = W.el('table', { class: 'cmp-table' }, [
        W.el('thead', {}, [W.el('tr', {}, ['Item', 'Qty', 'Cost', 'Price', 'Value', ''].map(function (h) { return W.el('th', { text: h }); }))]),
        tbody
      ]);
      host.appendChild(table); host.appendChild(totals);
      host.appendChild(W.el('p', { class: 'note', text: 'Saved in this browser only (localStorage) — nothing is uploaded. Clearing your browser data will remove it, so export by copying values you need to keep.' }));
      render();
    },

    'business-card-maker': function (host, W) {
      var f = {
        name: inp(W, 'Name', 'Jane Doe'), title: inp(W, 'Title', 'Founder'), company: inp(W, 'Company', 'Acme Studio'),
        phone: inp(W, 'Phone', '+1 555 0100'), email: inp(W, 'Email', 'jane@acme.com'), web: inp(W, 'Website', 'acme.com')
      };
      var color = W.el('input', { type: 'color', value: '#2563eb', class: 'field', 'aria-label': 'Accent colour' });
      var canvas = W.el('canvas', { width: '1050', height: '600', style: 'width:100%;max-width:420px;border:1px solid var(--border,#d5dae2);border-radius:10px' });
      function draw() {
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1050, 600);
        ctx.fillStyle = color.value; ctx.fillRect(0, 0, 26, 600);
        ctx.fillStyle = '#0f1720'; ctx.textBaseline = 'alphabetic';
        ctx.font = '700 62px system-ui,Arial'; ctx.fillText(f.name.value || 'Your Name', 70, 180);
        ctx.fillStyle = '#5b6673'; ctx.font = '400 32px system-ui,Arial'; ctx.fillText(f.title.value || 'Title', 70, 230);
        ctx.fillStyle = color.value; ctx.font = '600 30px system-ui,Arial'; ctx.fillText(f.company.value || 'Company', 70, 285);
        ctx.fillStyle = '#0f1720'; ctx.font = '400 30px system-ui,Arial';
        var lines = [f.phone.value, f.email.value, f.web.value].filter(Boolean);
        lines.forEach(function (t, i) { ctx.fillText(t, 70, 420 + i * 46); });
      }
      Object.keys(f).forEach(function (k) { f[k].addEventListener('input', draw); });
      color.addEventListener('input', draw);
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Name', f.name), fld(W, 'Title', f.title), fld(W, 'Company', f.company), fld(W, 'Accent', color)]));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Phone', f.phone), fld(W, 'Email', f.email), fld(W, 'Website', f.web)]));
      host.appendChild(canvas);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Download PNG', onClick: function () { canvas.toBlob(function (b) { if (b) W.download(b, 'business-card.png'); }, 'image/png'); } })]));
      host.appendChild(W.el('p', { class: 'note', text: 'A standard 3.5×2 in card at 300 DPI, drawn in your browser. Great as a digital card or for print.' }));
      draw();
    },

    'packing-list': function (host, W) {
      var KEY = 'vk_packing_v1';
      var PRESETS = {
        essentials: ['Passport / ID', 'Phone + charger', 'Wallet & cards', 'Keys', 'Medication', 'Toiletries', 'Chargers & cables', 'Headphones'],
        beach: ['Swimwear', 'Sunscreen', 'Sunglasses', 'Sandals', 'Beach towel', 'Hat', 'After-sun'],
        business: ['Suit / formal wear', 'Dress shoes', 'Laptop + charger', 'Notebook & pen', 'Business cards', 'Belt'],
        winter: ['Warm coat', 'Gloves', 'Scarf & hat', 'Thermals', 'Boots', 'Moisturiser', 'Lip balm'],
        hiking: ['Hiking boots', 'Backpack', 'Water bottle', 'Rain jacket', 'First-aid kit', 'Map / GPS', 'Snacks']
      };
      var items = store(KEY, null);
      if (!Array.isArray(items)) items = [];
      var trip = W.el('select', { class: 'field', 'aria-label': 'Trip type' }, [['beach', 'Beach holiday'], ['business', 'Business trip'], ['winter', 'Winter trip'], ['hiking', 'Hiking / outdoors']].map(function (o) { return W.el('option', { value: o[0], text: o[1] }); }));
      var list = W.el('div', {});
      var custom = inp(W, 'Add your own item');
      function render() {
        list.innerHTML = '';
        if (!items || !items.length) { list.appendChild(W.el('p', { class: 'note', text: 'Pick a trip type and generate a list, or add your own items.' })); return; }
        var done = 0;
        items.forEach(function (it, i) {
          if (it.done) done++;
          var cb = W.el('input', { type: 'checkbox', 'aria-label': it.t }); if (it.done) cb.checked = true;
          cb.addEventListener('change', function () { it.done = cb.checked; save(KEY, items); render(); });
          list.appendChild(W.el('div', { class: 'winline', style: 'display:flex;align-items:center;gap:8px;padding:3px 0' + (it.done ? ';opacity:.5;text-decoration:line-through' : '') }, [
            W.el('label', { style: 'flex:1' }, [cb, W.el('span', { text: ' ' + it.t })]),
            W.el('button', { class: 'btn', type: 'button', text: '✕', 'aria-label': 'Remove ' + it.t, onClick: function () { items.splice(i, 1); save(KEY, items); render(); } })
          ]));
        });
        list.appendChild(W.el('p', { class: 'note', text: done + ' of ' + items.length + ' packed.' }));
      }
      function gen() {
        var picked = PRESETS.essentials.concat(PRESETS[trip.value] || []);
        items = picked.map(function (t) { return { t: t, done: false }; });
        save(KEY, items); render();
      }
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('label', { class: 'winline' }, [W.el('span', { class: 'wlab', text: 'Trip' }), trip]), W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Generate list', onClick: gen }), W.el('button', { class: 'btn', type: 'button', text: 'Clear', onClick: function () { items = []; save(KEY, items); render(); } })]));
      host.appendChild(W.el('div', { class: 'wbtns' }, [custom, W.el('button', { class: 'btn', type: 'button', text: 'Add', onClick: function () { if (custom.value.trim()) { items = items || []; items.push({ t: custom.value.trim(), done: false }); custom.value = ''; save(KEY, items); render(); } } })]));
      host.appendChild(list);
      host.appendChild(W.el('p', { class: 'note', text: 'Your list is saved in this browser only. Tick items as you pack; add anything specific to your trip.' }));
      render();
    },

    'qr-business-card': function (host, W) {
      var f = { name: inp(W, 'Full name', 'Jane Doe'), title: inp(W, 'Title', 'Founder'), org: inp(W, 'Company', 'Acme Studio'),
        phone: inp(W, 'Phone', '+15550100'), email: inp(W, 'Email', 'jane@acme.com'), url: inp(W, 'Website', 'https://acme.com') };
      var canvas = W.el('canvas', { class: 'wcode' });
      var err = W.el('p', { class: 'note err', hidden: 'hidden', role: 'alert' });
      function vcard() {
        var n = (f.name.value || '').trim().split(/\s+/);
        return 'BEGIN:VCARD\nVERSION:3.0\nN:' + (n.slice(1).join(' ') || '') + ';' + (n[0] || '') +
          '\nFN:' + f.name.value + '\nORG:' + f.org.value + '\nTITLE:' + f.title.value +
          '\nTEL:' + f.phone.value + '\nEMAIL:' + f.email.value + '\nURL:' + f.url.value + '\nEND:VCARD';
      }
      var busy = false;
      async function gen() {
        if (busy) return; busy = true; err.hidden = true;
        try { var QR = await lazyQr(); await new Promise(function (res, rej) { QR.toCanvas(canvas, vcard(), { width: 512, margin: 2, errorCorrectionLevel: 'M' }, function (e) { e ? rej(e) : res(); }); }); }
        catch (e) { err.hidden = false; err.textContent = e.message || 'Could not generate the QR code.'; }
        busy = false;
      }
      Object.keys(f).forEach(function (k) { f[k].addEventListener('input', W.debounce(gen, 200)); });
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Name', f.name), fld(W, 'Title', f.title), fld(W, 'Company', f.org), fld(W, 'Phone', f.phone), fld(W, 'Email', f.email), fld(W, 'Website', f.url)]));
      host.appendChild(err); host.appendChild(canvas);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Download PNG', onClick: function () { canvas.toBlob(function (b) { if (b) W.download(b, 'contact-qr.png'); }, 'image/png'); } })]));
      host.appendChild(W.el('p', { class: 'note', text: 'Encodes a vCard — scanning it adds your contact details straight to a phone. Generated in your browser.' }));
      gen();
    }

  };

  root.VKBiz2 = { generateNames: generateNames };
  if (typeof module === 'object' && module.exports) module.exports = root.VKBiz2;
  if (typeof root.VKW !== 'undefined') {
    Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); }
  }
})(typeof window !== 'undefined' ? window : globalThis);
