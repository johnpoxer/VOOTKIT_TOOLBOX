/* tools-text.js — text & writing tools. Pure string work, on-device.
 * The logic functions (countText, toCase, slugify, flesch, diffLines,
 * keywordDensity, lorem) are exported and unit-tested in test/text.test.js. */
(function (root) {
  'use strict';

  /* ---------------- pure logic ---------------- */

  function countText(s) {
    s = String(s || '');
    var words = (s.match(/\S+/g) || []).length;
    var chars = s.length;
    var charsNoSpace = (s.match(/\S/g) || []).length;
    var sentences = (s.match(/[.!?]+(\s|$)/g) || []).length || (s.trim() ? 1 : 0);
    var paragraphs = (s.split(/\n\s*\n/).filter(function (p) { return p.trim(); })).length;
    var lines = s === '' ? 0 : s.split(/\n/).length;
    var readingMin = words / 200;         // ~200 wpm
    var speakingMin = words / 130;        // ~130 wpm
    return { words: words, chars: chars, charsNoSpace: charsNoSpace, sentences: sentences,
      paragraphs: paragraphs, lines: lines, readingMin: readingMin, speakingMin: speakingMin };
  }

  function toCase(s, mode) {
    s = String(s || '');
    switch (mode) {
      case 'upper': return s.toUpperCase();
      case 'lower': return s.toLowerCase();
      case 'title': return s.replace(/\w\S*/g, function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); });
      case 'sentence': return s.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, function (c) { return c.toUpperCase(); });
      case 'camel': {
        var p = s.toLowerCase().match(/[a-z0-9]+/g) || [];
        return p.map(function (w, i) { return i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1); }).join('');
      }
      case 'kebab': return (s.toLowerCase().match(/[a-z0-9]+/g) || []).join('-');
      case 'snake': return (s.toLowerCase().match(/[a-z0-9]+/g) || []).join('_');
      default: return s;
    }
  }

  function slugify(s) {
    return String(s || '')
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')   // strip accents
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/[\s-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /* Flesch Reading Ease + Flesch–Kincaid grade. */
  function syllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!word) return 0;
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
    var m = word.match(/[aeiouy]{1,2}/g);
    return m ? m.length : 1;
  }
  function flesch(s) {
    var words = (String(s || '').match(/\S+/g) || []);
    var sentences = (String(s).match(/[.!?]+(\s|$)/g) || []).length || (words.length ? 1 : 0);
    var syl = words.reduce(function (a, w) { return a + syllables(w); }, 0);
    if (!words.length || !sentences) return { ease: 0, grade: 0, words: 0, sentences: 0, syllables: 0 };
    var wps = words.length / sentences, spw = syl / words.length;
    var ease = 206.835 - 1.015 * wps - 84.6 * spw;
    var grade = 0.39 * wps + 11.8 * spw - 15.59;
    return { ease: Math.round(ease * 10) / 10, grade: Math.round(grade * 10) / 10,
      words: words.length, sentences: sentences, syllables: syl };
  }
  function easeLabel(e) {
    if (e >= 90) return 'Very easy (5th grade)';
    if (e >= 70) return 'Easy (6–7th grade)';
    if (e >= 60) return 'Plain English (8–9th grade)';
    if (e >= 50) return 'Fairly hard (10–12th grade)';
    if (e >= 30) return 'Difficult (college)';
    return 'Very difficult (graduate)';
  }

  /* line-based diff (LCS) → array of {t:' '|'-'|'+', line} */
  function diffLines(a, b) {
    var A = String(a || '').split('\n'), B = String(b || '').split('\n');
    var n = A.length, m = B.length;
    var dp = [];
    for (var i = 0; i <= n; i++) { dp[i] = []; for (var j = 0; j <= m; j++) dp[i][j] = 0; }
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--)
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    var out = []; i = 0; j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) { out.push({ t: ' ', line: A[i] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: '-', line: A[i] }); i++; }
      else { out.push({ t: '+', line: B[j] }); j++; }
    }
    while (i < n) { out.push({ t: '-', line: A[i++] }); }
    while (j < m) { out.push({ t: '+', line: B[j++] }); }
    return out;
  }

  function keywordDensity(s, n) {
    var words = (String(s || '').toLowerCase().match(/[a-z0-9']+/g) || []);
    var total = words.length, freq = {};
    words.forEach(function (w) { freq[w] = (freq[w] || 0) + 1; });
    var arr = Object.keys(freq).map(function (w) {
      return { word: w, count: freq[w], pct: total ? (freq[w] / total * 100) : 0 };
    }).sort(function (a, b) { return b.count - a.count || a.word.localeCompare(b.word); });
    return { total: total, unique: arr.length, top: arr.slice(0, n || 20) };
  }

  var LOREM = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor ' +
    'incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ' +
    'ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate ' +
    'velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt ' +
    'culpa qui officia deserunt mollit anim id est laborum').split(' ');
  function lorem(count, unit) {
    function sentence() {
      var len = 8 + Math.floor(Math.random() * 12), w = [];
      for (var i = 0; i < len; i++) w.push(LOREM[Math.floor(Math.random() * LOREM.length)]);
      var t = w.join(' '); return t.charAt(0).toUpperCase() + t.slice(1) + '.';
    }
    function para() { var n = 3 + Math.floor(Math.random() * 4), s = []; for (var i = 0; i < n; i++) s.push(sentence()); return s.join(' '); }
    if (unit === 'words') {
      var out = []; for (var i = 0; i < count; i++) out.push(LOREM[i % LOREM.length]);
      var t = out.join(' '); return t.charAt(0).toUpperCase() + t.slice(1) + '.';
    }
    if (unit === 'sentences') { var ss = []; for (var k = 0; k < count; k++) ss.push(sentence()); return ss.join(' '); }
    var ps = []; for (var p = 0; p < count; p++) ps.push(para()); return ps.join('\n\n');
  }

  /* ---------------- UI builders ---------------- */

  function stat(W, label, value) {
    return W.el('div', { class: 'calc-stat' }, [W.el('span', { text: label }), W.el('b', { text: String(value) })]);
  }
  function bigInput(W, ph) { return W.el('textarea', { class: 'field wtext', rows: '10', placeholder: ph || 'Type or paste text…', spellcheck: 'false' }); }

  var T = {

    'word-counter': function (host, W) {
      var ta = bigInput(W, 'Type or paste your text…');
      var stats = W.el('div', { class: 'calc-stats' });
      function upd() {
        var c = countText(ta.value);
        stats.innerHTML = '';
        [['Words', c.words], ['Characters', c.chars], ['Characters (no spaces)', c.charsNoSpace],
         ['Sentences', c.sentences], ['Paragraphs', c.paragraphs], ['Lines', c.lines],
         ['Reading time', (c.readingMin < 1 ? '<1' : Math.round(c.readingMin)) + ' min'],
         ['Speaking time', (c.speakingMin < 1 ? '<1' : Math.round(c.speakingMin)) + ' min']
        ].forEach(function (p) { stats.appendChild(stat(W, p[0], p[1])); });
      }
      ta.addEventListener('input', upd);
      host.appendChild(ta); host.appendChild(stats); upd();
    },

    'case-converter': function (host, W) {
      var ta = bigInput(W);
      var out = W.el('textarea', { class: 'field wtext', rows: '6', readonly: 'readonly', 'aria-label': 'Converted text' });
      var modes = [['UPPER', 'upper'], ['lower', 'lower'], ['Title Case', 'title'], ['Sentence case', 'sentence'], ['camelCase', 'camel'], ['kebab-case', 'kebab'], ['snake_case', 'snake']];
      var row = W.el('div', { class: 'wbtns' });
      modes.forEach(function (m) {
        row.appendChild(W.el('button', { class: 'btn', type: 'button', text: m[0],
          onClick: function () { out.value = toCase(ta.value, m[1]); } }));
      });
      var copy = W.copyBtn('Copy result', function () { return out.value; });
      host.appendChild(ta); host.appendChild(row); host.appendChild(out); host.appendChild(W.el('div', { class: 'wbtns' }, [copy]));
    },

    'text-diff': function (host, W) {
      var a = bigInput(W, 'Original text…'), b = bigInput(W, 'Changed text…');
      var grid = W.el('div', { class: 'wgrid2' }, [wrap(W, 'Original', a), wrap(W, 'Changed', b)]);
      var res = W.el('div', { class: 'wdiff', 'aria-live': 'polite' });
      function upd() {
        var d = diffLines(a.value, b.value), add = 0, del = 0;
        res.innerHTML = '';
        d.forEach(function (r) {
          if (r.t === '+') add++; if (r.t === '-') del++;
          res.appendChild(W.el('div', { class: 'wdl wdl-' + (r.t === '+' ? 'add' : r.t === '-' ? 'del' : 'same'),
            text: (r.t === ' ' ? '  ' : r.t + ' ') + r.line }));
        });
        head.textContent = add + ' added · ' + del + ' removed';
      }
      var head = W.el('p', { class: 'note' });
      [a, b].forEach(function (x) { x.addEventListener('input', W.debounce(upd, 150)); });
      host.appendChild(grid); host.appendChild(head); host.appendChild(res); upd();
    },

    'readability': function (host, W) {
      var ta = bigInput(W, 'Paste a paragraph or article…');
      var stats = W.el('div', { class: 'calc-stats' });
      var badge = W.el('p', { class: 'note' });
      function upd() {
        var f = flesch(ta.value);
        badge.textContent = ta.value.trim() ? easeLabel(f.ease) : '';
        stats.innerHTML = '';
        [['Reading ease', f.ease], ['Grade level', f.grade], ['Words', f.words], ['Sentences', f.sentences], ['Syllables', f.syllables]]
          .forEach(function (p) { stats.appendChild(stat(W, p[0], p[1])); });
      }
      ta.addEventListener('input', W.debounce(upd, 150));
      host.appendChild(ta); host.appendChild(badge); host.appendChild(stats); upd();
    },

    'line-tools': function (host, W) {
      var ta = bigInput(W, 'One item per line…');
      var out = W.el('textarea', { class: 'field wtext', rows: '8', readonly: 'readonly', 'aria-label': 'Result' });
      function lines() { return ta.value.split('\n'); }
      function set(arr) { out.value = arr.join('\n'); }
      var ops = [
        ['Sort A→Z', function () { set(lines().slice().sort(function (a, b) { return a.localeCompare(b); })); }],
        ['Sort Z→A', function () { set(lines().slice().sort(function (a, b) { return b.localeCompare(a); })); }],
        ['Reverse', function () { set(lines().slice().reverse()); }],
        ['Remove duplicates', function () { var seen = {}; set(lines().filter(function (l) { return seen[l] ? false : (seen[l] = 1); })); }],
        ['Remove blank lines', function () { set(lines().filter(function (l) { return l.trim(); })); }],
        ['Trim spaces', function () { set(lines().map(function (l) { return l.trim(); })); }],
        ['Shuffle', function () { var a = lines().slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } set(a); }],
        ['Number lines', function () { set(lines().map(function (l, i) { return (i + 1) + '. ' + l; })); }]
      ];
      var row = W.el('div', { class: 'wbtns' });
      ops.forEach(function (o) { row.appendChild(W.el('button', { class: 'btn', type: 'button', text: o[0], onClick: o[1] })); });
      host.appendChild(ta); host.appendChild(row); host.appendChild(out);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.copyBtn('Copy result', function () { return out.value; })]));
    },

    'lorem-ipsum': function (host, W) {
      var n = W.el('input', { class: 'field', type: 'number', value: '3', min: '1', max: '100', 'aria-label': 'How many' });
      var unit = W.el('select', { class: 'field', 'aria-label': 'Unit' });
      [['paragraphs', 'Paragraphs'], ['sentences', 'Sentences'], ['words', 'Words']].forEach(function (u) { unit.appendChild(W.el('option', { value: u[0], text: u[1] })); });
      var out = W.el('textarea', { class: 'field wtext', rows: '10', readonly: 'readonly', 'aria-label': 'Generated text' });
      function gen() { out.value = lorem(Math.max(1, Math.min(100, +n.value || 1)), unit.value); }
      var go = W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Generate', onClick: gen });
      var controls = W.el('div', { class: 'wbtns' }, [n, unit, go, W.copyBtn('Copy', function () { return out.value; })]);
      host.appendChild(controls); host.appendChild(out); gen();
    },

    'markdown-editor': function (host, W) {
      var ta = W.el('textarea', { class: 'field wtext', rows: '14', placeholder: '# Hello\n\nType **Markdown** here…', spellcheck: 'false' });
      var prev = W.el('div', { class: 'wmd prose', 'aria-live': 'polite' });
      function render() { prev.innerHTML = mdToHtml(ta.value, W); }
      ta.addEventListener('input', W.debounce(render, 80));
      ta.value = '# Live preview\n\nType **Markdown** on the left. Supports headings, **bold**, *italic*, `code`, [links](https://vootkit.com), lists and > quotes.';
      host.appendChild(W.el('div', { class: 'wgrid2' }, [wrap(W, 'Markdown', ta), wrap(W, 'Preview', prev)]));
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.copyBtn('Copy HTML', function () { return prev.innerHTML; })]));
      render();
    }
  };

  function wrap(W, label, node) {
    return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: label }), node]);
  }

  /* minimal, safe Markdown → HTML (escapes first, then applies inline/block rules) */
  function mdToHtml(src, W) {
    var esc = W.escapeHtml(src || '');
    var lines = esc.split('\n'), out = [], i = 0;
    function inline(t) {
      return t
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener nofollow">$1</a>');
    }
    while (i < lines.length) {
      var l = lines[i];
      var h = l.match(/^(#{1,6})\s+(.*)$/);
      if (h) { out.push('<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>'); i++; continue; }
      if (/^\s*>/.test(l)) { var q = []; while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(inline(lines[i].replace(/^\s*>\s?/, ''))); i++; } out.push('<blockquote>' + q.join('<br>') + '</blockquote>'); continue; }
      if (/^\s*[-*+]\s+/.test(l)) { var items = []; while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) { items.push('<li>' + inline(lines[i].replace(/^\s*[-*+]\s+/, '')) + '</li>'); i++; } out.push('<ul>' + items.join('') + '</ul>'); continue; }
      if (/^\s*\d+\.\s+/.test(l)) { var oi = []; while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { oi.push('<li>' + inline(lines[i].replace(/^\s*\d+\.\s+/, '')) + '</li>'); i++; } out.push('<ol>' + oi.join('') + '</ol>'); continue; }
      if (l.trim() === '') { i++; continue; }
      var para = [];
      while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6}\s|\s*>|\s*[-*+]\s|\s*\d+\.\s)/.test(lines[i])) { para.push(inline(lines[i])); i++; }
      out.push('<p>' + para.join('<br>') + '</p>');
    }
    return out.join('\n');
  }

  root.VKText = { countText: countText, toCase: toCase, slugify: slugify, flesch: flesch,
    easeLabel: easeLabel, diffLines: diffLines, keywordDensity: keywordDensity, lorem: lorem, mdToHtml: function (s) { return mdToHtml(s, { escapeHtml: escapeHtmlLocal }); } };
  function escapeHtmlLocal(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  if (typeof module === 'object' && module.exports) module.exports = root.VKText;

  if (typeof root.VKW !== 'undefined') { Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); } }
})(typeof window !== 'undefined' ? window : globalThis);
