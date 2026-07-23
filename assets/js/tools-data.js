/* tools-data.js — CSV / JSON tools. Pure parsing, on-device.
 * parseCsv / toCsv / jsonToRows are exported + unit-tested. */
(function (root) {
  'use strict';

  /* RFC-4180-ish CSV parser: handles quoted fields, escaped "" quotes,
     commas and newlines inside quotes. Returns array of string[] rows. */
  function parseCsv(text, delim) {
    delim = delim || ',';
    var rows = [], row = [], field = '', i = 0, inQ = false, s = String(text == null ? '' : text);
    // normalise line endings
    s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    while (i < s.length) {
      var c = s[i];
      if (inQ) {
        if (c === '"') { if (s[i + 1] === '"') { field += '"'; i += 2; continue; } inQ = false; i++; continue; }
        field += c; i++; continue;
      }
      if (c === '"') { inQ = true; i++; continue; }
      if (c === delim) { row.push(field); field = ''; i++; continue; }
      if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += c; i++;
    }
    row.push(field); rows.push(row);
    // drop a trailing empty row (file ended with newline)
    if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') rows.pop();
    return rows;
  }

  function needsQuote(v, delim) { return v.indexOf('"') !== -1 || v.indexOf(delim) !== -1 || v.indexOf('\n') !== -1; }
  function toCsv(rows, delim) {
    delim = delim || ',';
    return rows.map(function (r) {
      return r.map(function (v) {
        v = v == null ? '' : String(v);
        return needsQuote(v, delim) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(delim);
    }).join('\n');
  }

  /* JSON array-of-objects -> rows (header + data). */
  function jsonToRows(arr) {
    if (!Array.isArray(arr)) throw new Error('Top level must be a JSON array of objects, e.g. [ {...}, {...} ].');
    var cols = [];
    arr.forEach(function (o) { if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { if (cols.indexOf(k) === -1) cols.push(k); }); });
    var rows = [cols];
    arr.forEach(function (o) { rows.push(cols.map(function (k) { var v = o ? o[k] : ''; return v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); })); });
    return rows;
  }
  /* rows (with header) -> JSON array-of-objects */
  function rowsToJson(rows) {
    if (!rows.length) return [];
    var head = rows[0];
    return rows.slice(1).map(function (r) { var o = {}; head.forEach(function (h, i) { o[h] = r[i] == null ? '' : r[i]; }); return o; });
  }

  /* lazy Chart.js loader for csv-to-chart */
  var CHART_URL = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
  var chartLoaded = false;
  function loadChart() {
    if (chartLoaded && root.Chart) return Promise.resolve(root.Chart);
    if (root.Chart) { chartLoaded = true; return Promise.resolve(root.Chart); }
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = CHART_URL; s.async = true;
      s.onload = function () { chartLoaded = true; root.Chart ? res(root.Chart) : rej(new Error('Chart library failed to load.')); };
      s.onerror = function () { rej(new Error('Could not load the chart library from the CDN.')); };
      document.head.appendChild(s);
    });
  }

  /* ---------- UI ---------- */
  function area(W, ph, rows) { return W.el('textarea', { class: 'field wtext wmono', rows: String(rows || 8), placeholder: ph || '', spellcheck: 'false' }); }
  function fld(W, label, node) { return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: label }), node]); }

  var T = {

    'csv-viewer': function (host, W) {
      var input = W.el('input', { type: 'file', class: 'field', accept: '.csv,.tsv,text/csv', 'aria-label': 'Choose a CSV file' });
      var paste = area(W, '…or paste CSV here', 5);
      var filter = W.el('input', { class: 'field', type: 'search', placeholder: 'Filter rows…', 'aria-label': 'Filter' });
      var wrap = W.el('div', { class: 'wtablewrap' });
      var info = W.el('p', { class: 'note' });
      var rowsData = [], sortCol = -1, sortAsc = true;
      function render() {
        var q = filter.value.toLowerCase();
        if (!rowsData.length) { wrap.innerHTML = ''; info.textContent = ''; return; }
        var head = rowsData[0], body = rowsData.slice(1);
        if (sortCol >= 0) body = body.slice().sort(function (a, b) { var x = a[sortCol] || '', y = b[sortCol] || ''; var nx = parseFloat(x), ny = parseFloat(y); var cmp = (!isNaN(nx) && !isNaN(ny)) ? nx - ny : String(x).localeCompare(String(y)); return sortAsc ? cmp : -cmp; });
        if (q) body = body.filter(function (r) { return r.some(function (c) { return String(c).toLowerCase().indexOf(q) !== -1; }); });
        var html = '<table class="wtable"><thead><tr>' + head.map(function (h, i) { return '<th data-c="' + i + '">' + W.escapeHtml(h) + (sortCol === i ? (sortAsc ? ' ▲' : ' ▼') : '') + '</th>'; }).join('') + '</tr></thead><tbody>' +
          body.slice(0, 1000).map(function (r) { return '<tr>' + head.map(function (h, i) { return '<td>' + W.escapeHtml(r[i] == null ? '' : r[i]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
        wrap.innerHTML = html;
        info.textContent = body.length + ' rows × ' + head.length + ' columns' + (body.length > 1000 ? ' (showing first 1000)' : '');
        wrap.querySelectorAll('th').forEach(function (th) { th.addEventListener('click', function () { var c = +th.getAttribute('data-c'); if (sortCol === c) sortAsc = !sortAsc; else { sortCol = c; sortAsc = true; } render(); }); });
      }
      function load(text) { rowsData = parseCsv(text, text.indexOf('\t') !== -1 && text.indexOf(',') === -1 ? '\t' : ','); sortCol = -1; render(); }
      input.addEventListener('change', function () { var f = input.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { paste.value = ''; load(String(r.result)); }; r.readAsText(f); });
      paste.addEventListener('input', function () { load(paste.value); });
      filter.addEventListener('input', render);
      host.appendChild(fld(W, 'CSV file', input)); host.appendChild(fld(W, 'or paste', paste));
      host.appendChild(filter); host.appendChild(info); host.appendChild(wrap);
      host.appendChild(W.el('p', { class: 'note', text: 'Opened and parsed on your device — the file is never uploaded. Click a column header to sort.' }));
    },

    'json-csv': function (host, W) {
      var input = area(W, 'Paste JSON array or CSV…', 8);
      var out = area(W, 'Result appears here', 8); out.setAttribute('readonly', 'readonly');
      var err = W.el('p', { class: 'note err', hidden: 'hidden', role: 'alert' });
      function toCSV() { err.hidden = true; try { out.value = toCsv(jsonToRows(JSON.parse(input.value))); } catch (e) { err.hidden = false; err.textContent = e.message.indexOf('JSON') !== -1 ? 'That isn’t valid JSON.' : e.message; } }
      function toJSON() { err.hidden = true; try { var rows = parseCsv(input.value); out.value = JSON.stringify(rowsToJson(rows), null, 2); } catch (e) { err.hidden = false; err.textContent = 'Could not parse that CSV.'; } }
      input.value = '[\n  {"name": "Ada", "role": "Engineer"},\n  {"name": "Grace", "role": "Admiral"}\n]';
      host.appendChild(fld(W, 'Input', input));
      host.appendChild(W.el('div', { class: 'wbtns' }, [
        W.el('button', { class: 'btn btn-primary', type: 'button', text: 'JSON → CSV', onClick: toCSV }),
        W.el('button', { class: 'btn', type: 'button', text: 'CSV → JSON', onClick: toJSON }),
        W.copyBtn('Copy', function () { return out.value; })
      ]));
      host.appendChild(err); host.appendChild(fld(W, 'Output', out)); toCSV();
    },

    'csv-to-chart': function (host, W) {
      var input = W.el('input', { type: 'file', class: 'field', accept: '.csv,text/csv', 'aria-label': 'Choose a CSV file' });
      var paste = area(W, 'or paste CSV — first row is the header…', 5);
      paste.value = 'Month,Sales\nJan,120\nFeb,180\nMar,90\nApr,240';
      var labelCol = W.el('select', { class: 'field', 'aria-label': 'Label column' });
      var valueCol = W.el('select', { class: 'field', 'aria-label': 'Value column' });
      var type = W.el('select', { class: 'field' }); [['bar', 'Bar'], ['line', 'Line'], ['pie', 'Pie'], ['doughnut', 'Doughnut']].forEach(function (o) { type.appendChild(W.el('option', { value: o[0], text: o[1] })); });
      var canvas = W.el('canvas', { class: 'wchart' });
      var err = W.el('p', { class: 'note err', hidden: 'hidden', role: 'alert' });
      var rows = [], chart = null;
      var PALETTE = ['#2563eb', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#64748b'];
      function fillCols() {
        var head = rows[0] || [];
        [labelCol, valueCol].forEach(function (s, si) { s.innerHTML = ''; head.forEach(function (h, i) { s.appendChild(W.el('option', { value: String(i), text: h || ('Column ' + (i + 1)) })); }); s.value = String(si === 0 ? 0 : Math.min(1, head.length - 1)); });
      }
      function load(text) { rows = parseCsv(text); fillCols(); draw(); }
      async function draw() {
        err.hidden = true;
        if (rows.length < 2) { err.hidden = false; err.textContent = 'Need a header row plus at least one data row.'; return; }
        var li = +labelCol.value, vi = +valueCol.value;
        var labels = rows.slice(1).map(function (r) { return r[li]; });
        var values = rows.slice(1).map(function (r) { return parseFloat(r[vi]); });
        if (values.some(isNaN)) { err.hidden = false; err.textContent = 'The value column “' + (rows[0][vi] || '') + '” has non-numeric cells.'; return; }
        try {
          var Chart = await loadChart();
          if (chart) chart.destroy();
          var isPie = type.value === 'pie' || type.value === 'doughnut';
          chart = new Chart(canvas, { type: type.value,
            data: { labels: labels, datasets: [{ label: rows[0][vi] || 'Value', data: values, backgroundColor: isPie ? PALETTE : PALETTE[0], borderColor: PALETTE[0], borderWidth: isPie ? 0 : 2, tension: 0.25 }] },
            options: { responsive: true, plugins: { legend: { display: isPie } } } });
        } catch (e) { err.hidden = false; err.textContent = e.message; }
      }
      input.addEventListener('change', function () { var f = input.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { paste.value = String(r.result); load(paste.value); }; r.readAsText(f); });
      paste.addEventListener('input', W.debounce(function () { load(paste.value); }, 200));
      [labelCol, valueCol, type].forEach(function (x) { x.addEventListener('change', draw); });
      host.appendChild(fld(W, 'CSV file', input)); host.appendChild(fld(W, 'or paste', paste));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Labels', labelCol), fld(W, 'Values', valueCol), fld(W, 'Chart type', type)]));
      host.appendChild(err); host.appendChild(canvas);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Download PNG', onClick: function () { canvas.toBlob(function (b) { if (b) W.download(b, 'chart.png'); }, 'image/png'); } })]));
      load(paste.value);
    }
  };

  root.VKData = { parseCsv: parseCsv, toCsv: toCsv, jsonToRows: jsonToRows, rowsToJson: rowsToJson };
  if (typeof module === 'object' && module.exports) module.exports = root.VKData;
  if (typeof root.VKW !== 'undefined') { Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); } }
})(typeof window !== 'undefined' ? window : globalThis);
