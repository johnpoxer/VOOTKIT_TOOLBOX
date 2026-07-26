/* tools-business.js — invoice & quote generators. Pure, on-device.
 * Builds a clean printable document (Print → Save as PDF) or downloadable HTML.
 * computeTotals is exported + unit-tested. */
(function (root) {
  'use strict';

  function computeTotals(items, taxRate, discount) {
    var subtotal = (items || []).reduce(function (s, it) { return s + (+it.qty || 0) * (+it.price || 0); }, 0);
    discount = +discount || 0;
    var afterDiscount = Math.max(0, subtotal - discount);
    var tax = afterDiscount * (+taxRate || 0) / 100;
    return { subtotal: subtotal, discount: discount, tax: tax, total: afterDiscount + tax };
  }
  function money(n, cur) { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur || 'USD' }).format(n); } catch (e) { return '$' + (+n).toFixed(2); } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function fld(W, l, n) { return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: l }), n]); }
  function inp(W, ph, v) { var e = W.el('input', { class: 'field', type: 'text', placeholder: ph || '', 'aria-label': ph || 'field' }); if (v) e.value = v; return e; }

  function docHtml(kind, data) {
    var t = computeTotals(data.items, data.tax, data.discount);
    var label = kind === 'quote' ? 'QUOTE' : kind === 'receipt' ? 'RECEIPT' : 'INVOICE';
    var paidBadge = kind === 'receipt' ? '<span style="display:inline-block;margin-left:12px;padding:3px 10px;border:2px solid #16a34a;color:#16a34a;border-radius:6px;font-size:13px;font-weight:700;letter-spacing:.08em;vertical-align:middle">PAID</span>' : '';
    var rows = data.items.map(function (it) {
      return '<tr><td>' + esc(it.desc) + '</td><td class="r">' + esc(it.qty) + '</td><td class="r">' + money(+it.price || 0, data.cur) + '</td><td class="r">' + money((+it.qty || 0) * (+it.price || 0), data.cur) + '</td></tr>';
    }).join('');
    return '<!doctype html><html><head><meta charset="utf-8"><title>' + label + ' ' + esc(data.number) + '</title><style>' +
      'body{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#111;max-width:800px;margin:24px auto;padding:0 24px}' +
      '.top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}' +
      'h1{font-size:34px;margin:0;letter-spacing:.06em;color:#2563eb}.muted{color:#666;font-size:13px}' +
      '.box{font-size:14px;line-height:1.5}table{width:100%;border-collapse:collapse;margin:24px 0}' +
      'th,td{padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:14px}th{color:#666;font-weight:600;font-size:12px;text-transform:uppercase}' +
      '.r{text-align:right}tfoot td{border:0;padding:4px 8px}tfoot .tot{font-weight:700;font-size:16px;border-top:2px solid #111}' +
      '.notes{margin-top:28px;font-size:13px;color:#444;white-space:pre-wrap}@media print{body{margin:0}}' +
      '</style></head><body><div class="top"><div><h1>' + label + paidBadge + '</h1><div class="muted">#' + esc(data.number) + ' · ' + esc(data.date) + '</div></div>' +
      '<div class="box"><strong>' + esc(data.fromName) + '</strong><br>' + esc(data.fromInfo).replace(/\n/g, '<br>') + '</div></div>' +
      '<div style="display:flex;gap:48px;margin-bottom:12px"><div class="box"><div class="muted">' + (kind === 'quote' ? 'Prepared for' : kind === 'receipt' ? 'Received from' : 'Bill to') + '</div><strong>' + esc(data.toName) + '</strong><br>' + esc(data.toInfo).replace(/\n/g, '<br>') + '</div></div>' +
      '<table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Amount</th></tr></thead><tbody>' + rows + '</tbody>' +
      '<tfoot><tr><td colspan="3" class="r">Subtotal</td><td class="r">' + money(t.subtotal, data.cur) + '</td></tr>' +
      (t.discount ? '<tr><td colspan="3" class="r">Discount</td><td class="r">-' + money(t.discount, data.cur) + '</td></tr>' : '') +
      '<tr><td colspan="3" class="r">Tax (' + (+data.tax || 0) + '%)</td><td class="r">' + money(t.tax, data.cur) + '</td></tr>' +
      '<tr><td colspan="3" class="r tot">Total</td><td class="r tot">' + money(t.total, data.cur) + '</td></tr></tfoot></table>' +
      (data.notes ? '<div class="notes"><strong>Notes</strong>\n' + esc(data.notes) + '</div>' : '') +
      '</body></html>';
  }

  function build(kind) {
    return function (host, W) {
      var fromName = inp(W, 'Your business', 'Acme Studio'), fromInfo = W.el('textarea', { class: 'field wtext', rows: '2', placeholder: 'Address, email, tax ID' });
      var toName = inp(W, 'Client name', 'Client Co.'), toInfo = W.el('textarea', { class: 'field wtext', rows: '2', placeholder: 'Client address / email' });
      var number = inp(W, 'Number', kind === 'quote' ? 'Q-1001' : 'INV-1001'), date = W.el('input', { class: 'field', type: 'date' }); date.value = new Date().toISOString().slice(0, 10);
      var cur = W.el('select', { class: 'field' }); ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'NGN'].forEach(function (c) { cur.appendChild(W.el('option', { value: c, text: c })); });
      var tax = W.el('input', { class: 'field', type: 'number', value: '0', min: '0', step: 'any', 'aria-label': 'Tax %' });
      var discount = W.el('input', { class: 'field', type: 'number', value: '0', min: '0', step: 'any', 'aria-label': 'Discount' });
      var notes = W.el('textarea', { class: 'field wtext', rows: '2', placeholder: 'Payment terms, thank-you note…' });
      var itemsWrap = W.el('div', { class: 'witems' });
      var preview = W.el('iframe', { class: 'wdocframe', title: 'Document preview' });

      function itemRow(desc, qty, price) {
        var d = W.el('input', { class: 'field', type: 'text', placeholder: 'Description', value: desc || '', 'aria-label': 'Item description' });
        var q = W.el('input', { class: 'field', type: 'number', value: qty || '1', min: '0', step: 'any', 'aria-label': 'Quantity' });
        var p = W.el('input', { class: 'field', type: 'number', value: price || '0', min: '0', step: 'any', 'aria-label': 'Price' });
        var del = W.el('button', { class: 'btn', type: 'button', text: '✕', 'aria-label': 'Remove item', onClick: function () { row.remove(); render(); } });
        var row = W.el('div', { class: 'witem' }, [d, q, p, del]);
        [d, q, p].forEach(function (x) { x.addEventListener('input', render); });
        return row;
      }
      function gather() {
        var items = [].slice.call(itemsWrap.querySelectorAll('.witem')).map(function (r) { var i = r.querySelectorAll('input'); return { desc: i[0].value, qty: i[1].value, price: i[2].value }; });
        return { fromName: fromName.value, fromInfo: fromInfo.value, toName: toName.value, toInfo: toInfo.value, number: number.value, date: date.value, cur: cur.value, tax: tax.value, discount: discount.value, notes: notes.value, items: items };
      }
      function render() { preview.srcdoc = docHtml(kind, gather()); }

      [fromName, fromInfo, toName, toInfo, number, date, cur, tax, discount, notes].forEach(function (x) { x.addEventListener('input', render); cur.addEventListener('change', render); });
      itemsWrap.appendChild(itemRow('Design work', '10', '80'));
      itemsWrap.appendChild(itemRow('Consulting', '4', '120'));

      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'From (you)', fromName), fld(W, 'To (client)', toName)]));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Your details', fromInfo), fld(W, 'Client details', toInfo)]));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Number', number), fld(W, 'Date', date), fld(W, 'Currency', cur), fld(W, kind === 'quote' ? 'Tax %' : 'Tax %', tax), fld(W, 'Discount', discount)]));
      host.appendChild(W.el('p', { class: 'wlab', text: 'Line items' }));
      host.appendChild(itemsWrap);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn', type: 'button', text: '+ Add item', onClick: function () { itemsWrap.appendChild(itemRow('', '1', '0')); render(); } })]));
      host.appendChild(fld(W, 'Notes', notes));
      host.appendChild(W.el('p', { class: 'wlab', text: 'Preview' })); host.appendChild(preview);
      host.appendChild(W.el('div', { class: 'wbtns' }, [
        W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Print / Save as PDF', onClick: function () { var w = window.open('', '_blank'); if (w) { w.document.write(docHtml(kind, gather())); w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 300); } } }),
        W.el('button', { class: 'btn', type: 'button', text: 'Download HTML', onClick: function () { W.download(docHtml(kind, gather()), kind + '-' + number.value + '.html', 'text/html'); } })
      ]));
      host.appendChild(W.el('p', { class: 'note', text: 'Built entirely in your browser — no data leaves your device. “Print / Save as PDF” opens a clean printable version; choose “Save as PDF” in the print dialog.' }));
      render();
    };
  }

  var T = { 'invoice-generator': build('invoice'), 'quote-generator': build('quote'), 'receipt-generator': build('receipt') };

  root.VKBusiness = { computeTotals: computeTotals };
  if (typeof module === 'object' && module.exports) module.exports = root.VKBusiness;
  if (typeof root.VKW !== 'undefined') { Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); } }
})(typeof window !== 'undefined' ? window : globalThis);
