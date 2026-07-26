/* tools-dev2.js — more developer tools (formatters + cron). All on-device.
 * Pure logic is exported on root.VKDev2 so it can be unit-tested in Node; the
 * widget builders register into VKW.tools. No libraries, no network. */
(function (root) {
  'use strict';

  /* ---------- pure logic ---------- */

  // Pretty-print well-formed XML/HTML by re-indenting on tag boundaries.
  function formatMarkup(src, tab) {
    tab = tab || '  ';
    var xml = String(src).replace(/\r\n?/g, '\n').replace(/>\s*</g, '>\n<').trim();
    var out = [], depth = 0;
    xml.split('\n').forEach(function (raw) {
      var line = raw.trim();
      if (!line) return;
      var isClose = /^<\//.test(line);
      var isDecl = /^<[!?]/.test(line);
      var isSelf = /\/>\s*$/.test(line);
      var isOpen = /^<[a-zA-Z][^>]*>$/.test(line);
      var inlineClosed = /^<([\w:-]+)(\s[^>]*)?>[\s\S]*<\/\1>\s*$/.test(line);
      if (isClose) depth = Math.max(0, depth - 1);
      out.push(new Array(depth + 1).join(tab) + line);
      if (isOpen && !isSelf && !isDecl && !inlineClosed && !isClose) depth++;
    });
    return out.join('\n');
  }
  function minifyMarkup(src) {
    return String(src).replace(/\r\n?/g, '\n').replace(/>\s+</g, '><').replace(/\n\s*/g, '').trim();
  }

  // CSS beautify / minify.
  function formatCss(src, tab) {
    tab = tab || '  ';
    var css = String(src)
      .replace(/\s*\{\s*/g, ' {\n')
      .replace(/;\s*/g, ';\n')
      .replace(/\s*\}\s*/g, '\n}\n');
    var depth = 0, out = [];
    css.split('\n').forEach(function (raw) {
      var line = raw.trim();
      if (!line) return;
      if (line === '}') { depth = Math.max(0, depth - 1); out.push(new Array(depth + 1).join(tab) + line); return; }
      out.push(new Array(depth + 1).join(tab) + line);
      if (/\{$/.test(line)) depth++;
    });
    return out.join('\n');
  }
  function minifyCss(src) {
    return String(src)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*([{}:;,>])\s*/g, '$1')
      .replace(/;}/g, '}')
      .trim();
  }

  // Basic SQL layout: uppercase keywords, newline before major clauses.
  var SQL_BREAK = ['SELECT', 'FROM', 'WHERE', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'JOIN',
    'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION ALL', 'UNION', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM'];
  var SQL_WORD = ['AND', 'OR', 'AS', 'IN', 'IS', 'NULL', 'NOT', 'LIKE', 'BETWEEN', 'DESC', 'ASC', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];
  function formatSql(src) {
    var s = String(src).replace(/\s+/g, ' ').trim();
    SQL_BREAK.concat(SQL_WORD).forEach(function (k) {
      s = s.replace(new RegExp('\\b' + k.replace(/ /g, '\\s+') + '\\b', 'gi'), k);
    });
    SQL_BREAK.forEach(function (k) {
      s = s.replace(new RegExp('\\s*\\b' + k.replace(/ /g, '\\s+') + '\\b', 'g'), '\n' + k);
    });
    s = s.replace(/\s*\b(AND|OR)\b/g, '\n  $1');
    return s.split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).filter(Boolean).join('\n');
  }

  // Human-readable description of a 5-field cron expression.
  function describeCron(m, h, dom, mon, dow) {
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var parts = [], time;
    if (m === '*' && h === '*') time = 'every minute';
    else if (/^\*\/\d+$/.test(m) && h === '*') time = 'every ' + m.split('/')[1] + ' minutes';
    else if (h === '*' && /^\d+$/.test(m)) time = 'at minute ' + m + ' of every hour';
    else if (/^\d+$/.test(m) && /^\d+$/.test(h)) time = 'at ' + pad(+h) + ':' + pad(+m);
    else time = 'at minute ' + m + ', hour ' + h;
    parts.push(time);
    if (dow !== '*') parts.push(/^\d+$/.test(dow) ? 'on ' + days[(+dow) % 7] : 'on days-of-week ' + dow);
    if (dom !== '*') parts.push(/^\d+$/.test(dom) ? 'on day ' + dom + ' of the month' : 'on day-of-month ' + dom);
    if (mon !== '*') parts.push(/^\d+$/.test(mon) ? 'in ' + months[+mon] : 'in months ' + mon);
    var s = parts.join(', ');
    return s.charAt(0).toUpperCase() + s.slice(1) + '.';
  }

  /* ---------- UI helpers ---------- */
  function bigInput(W, ph, rows) { return W.el('textarea', { class: 'field wtext', rows: String(rows || 10), placeholder: ph || '', spellcheck: 'false' }); }
  function roBox(W, rows, label) { return W.el('textarea', { class: 'field wtext', rows: String(rows || 10), readonly: 'readonly', 'aria-label': label || 'Output', spellcheck: 'false' }); }
  function errNote(W) { return W.el('p', { class: 'note err', hidden: 'hidden', role: 'alert' }); }

  // Generic "beautify / minify" text tool.
  function fmtTool(ph, fmtFn, minFn, minLabel) {
    return function (host, W) {
      var ta = bigInput(W, ph, 10), out = roBox(W, 10, 'Result'), err = errNote(W);
      function run(fn) { try { out.value = fn(ta.value); err.hidden = true; } catch (e) { err.hidden = false; err.textContent = 'Could not process that: ' + e.message; } }
      var btns = [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Format', onClick: function () { run(fmtFn); } })];
      if (minFn) btns.push(W.el('button', { class: 'btn', type: 'button', text: minLabel || 'Minify', onClick: function () { run(minFn); } }));
      btns.push(W.copyBtn('Copy', function () { return out.value; }));
      host.appendChild(ta); host.appendChild(W.el('div', { class: 'wbtns' }, btns)); host.appendChild(err); host.appendChild(out);
    };
  }

  var T = {
    'xml-formatter': fmtTool('<root><item id="1">value</item></root>', function (t) { return formatMarkup(t); }, minifyMarkup),
    'html-formatter': fmtTool('<div><p>Hello</p></div>', function (t) { return formatMarkup(t); }, minifyMarkup),
    'css-formatter': fmtTool('.box{color:red;padding:8px}', formatCss, minifyCss),
    'sql-formatter': fmtTool('select id,name from users where active=1 and age>18 order by name', formatSql, null),

    'cron-generator': function (host, W) {
      var defs = [
        ['min', 'Minute', '*'], ['hr', 'Hour', '*'], ['dom', 'Day of month', '*'], ['mon', 'Month', '*'], ['dow', 'Day of week', '*']
      ];
      var inputs = {};
      var grid = W.el('div', { class: 'wgrid5' });
      defs.forEach(function (d) {
        var inp = W.el('input', { class: 'field wmono', type: 'text', value: d[2], 'aria-label': d[1], style: 'text-align:center' });
        inputs[d[0]] = inp;
        inp.addEventListener('input', update);
        grid.appendChild(W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: d[1] }), inp]));
      });
      var outExpr = W.el('div', { class: 'calc-headline' }, [W.el('span', { class: 'ch-label', text: 'Cron expression' }), W.el('b', { class: 'wmono', text: '* * * * *' })]);
      var outDesc = W.el('p', { class: 'note' });
      function update() {
        var m = inputs.min.value.trim() || '*', h = inputs.hr.value.trim() || '*',
            dom = inputs.dom.value.trim() || '*', mon = inputs.mon.value.trim() || '*', dow = inputs.dow.value.trim() || '*';
        outExpr.querySelector('b').textContent = [m, h, dom, mon, dow].join(' ');
        outDesc.textContent = describeCron(m, h, dom, mon, dow);
      }
      function preset(m, h, dom, mon, dow) { inputs.min.value = m; inputs.hr.value = h; inputs.dom.value = dom; inputs.mon.value = mon; inputs.dow.value = dow; update(); }
      var presets = W.el('div', { class: 'wbtns' }, [
        W.el('button', { class: 'btn', type: 'button', text: 'Every minute', onClick: function () { preset('*', '*', '*', '*', '*'); } }),
        W.el('button', { class: 'btn', type: 'button', text: 'Hourly', onClick: function () { preset('0', '*', '*', '*', '*'); } }),
        W.el('button', { class: 'btn', type: 'button', text: 'Daily 00:00', onClick: function () { preset('0', '0', '*', '*', '*'); } }),
        W.el('button', { class: 'btn', type: 'button', text: 'Weekly (Mon)', onClick: function () { preset('0', '0', '*', '*', '1'); } }),
        W.el('button', { class: 'btn', type: 'button', text: 'Monthly (1st)', onClick: function () { preset('0', '0', '1', '*', '*'); } }),
        W.copyBtn('Copy', function () { return outExpr.querySelector('b').textContent; })
      ]);
      host.appendChild(grid); host.appendChild(presets); host.appendChild(outExpr); host.appendChild(outDesc);
      host.appendChild(W.el('p', { class: 'note', text: 'Order: minute, hour, day-of-month, month, day-of-week. Use * for “any”, */5 for “every 5”, and 0–6 for day-of-week (0 = Sunday).' }));
      update();
    }
  };

  root.VKDev2 = { formatMarkup: formatMarkup, minifyMarkup: minifyMarkup, formatCss: formatCss, minifyCss: minifyCss, formatSql: formatSql, describeCron: describeCron };
  if (typeof module === 'object' && module.exports) module.exports = root.VKDev2;

  if (typeof root.VKW !== 'undefined') {
    Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); }
  }
})(typeof window !== 'undefined' ? window : globalThis);
