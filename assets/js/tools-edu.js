/* tools-edu.js — education & study tools. All on-device.
 * Flashcards, vocab, quizzes and the learning tracker persist in localStorage
 * on your device. Citation formatting is pure and unit-tested. Diagrams use
 * mermaid (MIT), lazy-loaded from a CDN. Nothing is uploaded. */
(function (root) {
  'use strict';

  /* ---------- pure: citation formatter ---------- */
  function citation(style, type, d) {
    var A = (d.author || '').trim(), T = (d.title || '').trim(), Y = (d.year || '').trim() || 'n.d.';
    var P = (d.publisher || '').trim(), S = (d.site || '').trim(), U = (d.url || '').trim();
    function end(s) { return /[.!?]$/.test(s) ? s : s + '.'; }
    if (style === 'mla') {
      if (type === 'website') return end(A) + ' “' + T + '.” ' + (S ? S + ', ' : '') + Y + (U ? ', ' + U : '') + '.';
      if (type === 'journal') return end(A) + ' “' + T + '.” ' + (S ? S + ', ' : '') + Y + '.';
      return end(A) + ' ' + end(T) + ' ' + (P ? P + ', ' : '') + Y + '.';
    }
    if (style === 'chicago') {
      if (type === 'website') return end(A) + ' “' + T + '.” ' + (S ? S + '. ' : '') + (U ? U + '.' : '');
      if (type === 'journal') return end(A) + ' “' + T + '.” ' + (S ? S + ' ' : '') + '(' + Y + ').';
      return end(A) + ' ' + end(T) + ' ' + (P ? P + ', ' : '') + Y + '.';
    }
    // APA (default)
    if (type === 'website') return end(A) + ' (' + Y + '). ' + end(T) + ' ' + (S ? S + '. ' : '') + U;
    if (type === 'journal') return end(A) + ' (' + Y + '). ' + end(T) + ' ' + (S ? S + '.' : '');
    return end(A) + ' (' + Y + '). ' + end(T) + ' ' + (P ? P + '.' : '');
  }

  var MERMAID_URL = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js';
  function lazyMermaid() {
    if (root.mermaid) return Promise.resolve(root.mermaid);
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = MERMAID_URL; s.async = true;
      s.onload = function () { root.mermaid ? (root.mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' }), res(root.mermaid)) : rej(new Error('Diagram library unavailable.')); };
      s.onerror = function () { rej(new Error('Could not load the diagram library — check your connection.')); };
      document.head.appendChild(s);
    });
  }

  function fld(W, l, n) { return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: l }), n]); }
  function inp(W, ph, v) { var e = W.el('input', { class: 'field', type: 'text', placeholder: ph || '' }); if (v != null) e.value = v; return e; }
  function store(key, def) { try { return JSON.parse(localStorage.getItem(key) || 'null') || def; } catch (e) { return def; } }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  function stat(W, l, v) { return W.el('div', { class: 'calc-stat' }, [W.el('span', { text: l }), W.el('b', { text: String(v) })]); }

  var T = {

    'flashcard-maker': function (host, W) {
      var KEY = 'vk_flashcards_v1', cards = store(KEY, []);
      var front = inp(W, 'Front (question)'), back = inp(W, 'Back (answer)');
      var list = W.el('div', { class: 'wpages' }), study = W.el('div', {});
      function renderList() {
        list.innerHTML = '';
        cards.forEach(function (c, i) { list.appendChild(W.el('div', { class: 'wpage', style: 'padding:8px 12px' }, [W.el('span', { text: c.f + ' → ' + c.b }), W.el('button', { class: 'btn', type: 'button', text: '✕', style: 'margin-left:8px', onClick: function () { cards.splice(i, 1); save(KEY, cards); renderList(); } })])); });
      }
      var idx = 0, flipped = false;
      function renderStudy() {
        study.innerHTML = '';
        if (!cards.length) { study.appendChild(W.el('p', { class: 'note', text: 'Add cards, then study them here.' })); return; }
        idx = idx % cards.length; var c = cards[idx];
        var card = W.el('div', { style: 'border:1px solid var(--border,#d5dae2);border-radius:12px;padding:32px;text-align:center;font-size:1.3rem;cursor:pointer;min-height:80px', onClick: function () { flipped = !flipped; renderStudy(); } }, [W.el('span', { text: flipped ? c.b : c.f })]);
        study.appendChild(card);
        study.appendChild(W.el('div', { class: 'wbtns' }, [
          W.el('button', { class: 'btn', type: 'button', text: '‹ Prev', onClick: function () { idx = (idx - 1 + cards.length) % cards.length; flipped = false; renderStudy(); } }),
          W.el('button', { class: 'btn', type: 'button', text: 'Flip', onClick: function () { flipped = !flipped; renderStudy(); } }),
          W.el('button', { class: 'btn', type: 'button', text: 'Shuffle', onClick: function () { cards.sort(function () { return Math.random() - 0.5; }); idx = 0; flipped = false; save(KEY, cards); renderStudy(); renderList(); } }),
          W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Next ›', onClick: function () { idx = (idx + 1) % cards.length; flipped = false; renderStudy(); } })
        ]));
        study.appendChild(W.el('p', { class: 'note', text: 'Card ' + (idx + 1) + ' of ' + cards.length + ' — click the card to flip.' }));
      }
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Front', front), fld(W, 'Back', back)]));
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Add card', onClick: function () { if (front.value.trim()) { cards.push({ f: front.value.trim(), b: back.value.trim() }); save(KEY, cards); front.value = back.value = ''; renderList(); renderStudy(); front.focus(); } } })]));
      host.appendChild(list);
      host.appendChild(W.el('p', { class: 'wlab', text: 'Study' })); host.appendChild(study);
      host.appendChild(W.el('p', { class: 'note', text: 'Cards are saved in this browser only (localStorage) — nothing is uploaded.' }));
      renderList(); renderStudy();
    },

    'vocabulary-builder': function (host, W) {
      var KEY = 'vk_vocab_v1', words = store(KEY, []);
      var w = inp(W, 'Word'), def = inp(W, 'Definition'), ex = inp(W, 'Example (optional)');
      var list = W.el('div', { class: 'wpages' }), practice = W.el('div', {});
      function renderList() { list.innerHTML = ''; words.forEach(function (o, i) { list.appendChild(W.el('div', { class: 'wpage', style: 'padding:8px 12px' }, [W.el('span', { html: '<strong>' + esc(o.w) + '</strong> — ' + esc(o.d) }), W.el('button', { class: 'btn', type: 'button', text: '✕', style: 'margin-left:8px', onClick: function () { words.splice(i, 1); save(KEY, words); renderList(); } })])); }); }
      var pi = 0, reveal = false;
      function renderPractice() {
        practice.innerHTML = ''; if (!words.length) { practice.appendChild(W.el('p', { class: 'note', text: 'Add words to practise.' })); return; }
        pi = pi % words.length; var o = words[pi];
        practice.appendChild(W.el('div', { style: 'border:1px solid var(--border,#d5dae2);border-radius:12px;padding:24px' }, [
          W.el('div', { style: 'font-size:1.4rem;font-weight:700', text: o.w }),
          W.el('div', { class: 'note', style: reveal ? '' : 'filter:blur(5px)', text: o.d + (o.e ? '  ·  “' + o.e + '”' : '') })
        ]));
        practice.appendChild(W.el('div', { class: 'wbtns' }, [
          W.el('button', { class: 'btn', type: 'button', text: reveal ? 'Hide' : 'Reveal', onClick: function () { reveal = !reveal; renderPractice(); } }),
          W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Next word', onClick: function () { pi = (pi + 1) % words.length; reveal = false; renderPractice(); } })
        ]));
      }
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Word', w), fld(W, 'Definition', def), fld(W, 'Example', ex)]));
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Add word', onClick: function () { if (w.value.trim()) { words.push({ w: w.value.trim(), d: def.value.trim(), e: ex.value.trim() }); save(KEY, words); w.value = def.value = ex.value = ''; renderList(); renderPractice(); w.focus(); } } })]));
      host.appendChild(list);
      host.appendChild(W.el('p', { class: 'wlab', text: 'Practice (definition hidden — reveal to check)' })); host.appendChild(practice);
      host.appendChild(W.el('p', { class: 'note', text: 'Your word list is saved in this browser only.' }));
      renderList(); renderPractice();
    },

    'citation-generator': function (host, W) {
      var style = W.el('select', { class: 'field' }, [['apa', 'APA'], ['mla', 'MLA'], ['chicago', 'Chicago']].map(function (o) { return W.el('option', { value: o[0], text: o[1] }); }));
      var type = W.el('select', { class: 'field' }, [['book', 'Book'], ['website', 'Website'], ['journal', 'Journal / Article']].map(function (o) { return W.el('option', { value: o[0], text: o[1] }); }));
      var f = { author: inp(W, 'Surname, First'), title: inp(W, 'Title'), year: inp(W, 'Year'), publisher: inp(W, 'Publisher'), site: inp(W, 'Site / Journal'), url: inp(W, 'URL') };
      var out = W.el('textarea', { class: 'field wtext', rows: '3', readonly: 'readonly', 'aria-label': 'Citation' });
      function run() { out.value = citation(style.value, type.value, { author: f.author.value, title: f.title.value, year: f.year.value, publisher: f.publisher.value, site: f.site.value, url: f.url.value }); }
      [style, type].concat(Object.keys(f).map(function (k) { return f[k]; })).forEach(function (x) { x.addEventListener('input', run); });
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Style', style), fld(W, 'Type', type)]));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Author', f.author), fld(W, 'Title', f.title), fld(W, 'Year', f.year), fld(W, 'Publisher', f.publisher), fld(W, 'Site / Journal', f.site), fld(W, 'URL', f.url)]));
      host.appendChild(fld(W, 'Citation', out));
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.copyBtn('Copy', function () { return out.value; })]));
      host.appendChild(W.el('p', { class: 'note', text: 'Formats a reference in APA, MLA or Chicago style. Italicise titles by hand where your style requires it. Always double-check against your institution’s guide.' }));
      run();
    },

    'mind-map-generator': function (host, W) {
      var topic = inp(W, 'Central topic', 'My Project');
      var branchesIn = W.el('textarea', { class: 'field wtext', rows: '5', placeholder: 'One branch per line' }); branchesIn.value = 'Research\nDesign\nBuild\nLaunch\nMarketing';
      var acc = W.el('input', { type: 'color', value: '#0d9488', class: 'field' });
      var canvas = W.el('canvas', { width: '1000', height: '700', style: 'width:100%;max-width:560px;border:1px solid var(--border,#d5dae2);border-radius:10px;background:#fff' });
      function draw() {
        var ctx = canvas.getContext('2d'), cx = 500, cy = 350;
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1000, 700);
        var branches = branchesIn.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        branches.forEach(function (b, i) {
          var ang = -Math.PI / 2 + i / branches.length * Math.PI * 2, r = 250;
          var x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
          ctx.strokeStyle = acc.value; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
          var w = ctx.measureText(b).width; ctx.font = '600 22px system-ui,Arial'; w = Math.max(80, ctx.measureText(b).width + 30);
          ctx.fillStyle = '#eef6f5'; roundRect(ctx, x - w / 2, y - 22, w, 44, 12); ctx.fill(); ctx.strokeStyle = acc.value; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = '#0f1720'; ctx.fillText(b, x, y);
        });
        ctx.font = '700 28px system-ui,Arial'; var tw = Math.max(140, ctx.measureText(topic.value).width + 44);
        ctx.fillStyle = acc.value; roundRect(ctx, cx - tw / 2, cy - 30, tw, 60, 16); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillText(topic.value || 'Topic', cx, cy);
      }
      function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
      [topic, branchesIn, acc].forEach(function (x) { x.addEventListener('input', draw); });
      host.appendChild(fld(W, 'Central topic', topic));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Branches (one per line)', branchesIn), fld(W, 'Colour', acc)]));
      host.appendChild(canvas);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Download PNG', onClick: function () { canvas.toBlob(function (b) { if (b) W.download(b, 'mind-map.png'); }, 'image/png'); } })]));
      host.appendChild(W.el('p', { class: 'note', text: 'Draws a radial mind map from your topic and branches. Everything happens in your browser.' }));
      draw();
    },

    'diagram-maker': function (host, W) {
      var ta = W.el('textarea', { class: 'field wtext', rows: '8', spellcheck: 'false' });
      ta.value = 'flowchart TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Do this]\n  B -->|No| D[Do that]\n  C --> E[End]\n  D --> E';
      var box = W.el('div', { style: 'border:1px solid var(--border,#d5dae2);border-radius:10px;padding:16px;background:#fff;overflow:auto;text-align:center' });
      var err = W.el('p', { class: 'note err', hidden: 'hidden', role: 'alert' });
      var lastSvg = '';
      async function run() {
        try {
          var m = await lazyMermaid();
          var r = await m.render('vkdiag' + Date.now(), ta.value);
          box.innerHTML = r.svg; lastSvg = r.svg; err.hidden = true;
        } catch (e) { err.hidden = false; err.textContent = 'Diagram error: ' + (e && e.message ? e.message.split('\n')[0] : 'check your syntax') + '.'; }
      }
      ta.addEventListener('input', W.debounce(run, 400));
      host.appendChild(fld(W, 'Diagram code (Mermaid)', ta)); host.appendChild(err);
      host.appendChild(W.el('div', { class: 'wbtns' }, [
        W.el('button', { class: 'btn', type: 'button', text: 'Render', onClick: run }),
        W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Download SVG', onClick: function () { if (lastSvg) W.download(lastSvg, 'diagram.svg', 'image/svg+xml'); } })
      ]));
      host.appendChild(W.el('p', { class: 'wlab', text: 'Preview' })); host.appendChild(box);
      host.appendChild(W.el('p', { class: 'note', text: 'Uses Mermaid syntax — flowcharts, sequence diagrams, mind maps and more. Try “sequenceDiagram” or “mindmap” on the first line. Rendered in your browser.' }));
      run();
    },

    'learning-tracker': function (host, W) {
      var KEY = 'vk_learning_v1', logs = store(KEY, []);
      var subj = inp(W, 'Subject / topic'), mins = W.el('input', { class: 'field', type: 'number', value: '30', min: '1', 'aria-label': 'Minutes' });
      var list = W.el('div', { class: 'wpages' }), totals = W.el('div', { class: 'calc-stats' });
      function render() {
        list.innerHTML = ''; totals.innerHTML = '';
        var byS = {}, total = 0;
        logs.slice().reverse().forEach(function (l, ri) {
          var i = logs.length - 1 - ri;
          byS[l.s] = (byS[l.s] || 0) + l.m; total += l.m;
          list.appendChild(W.el('div', { class: 'wpage', style: 'padding:8px 12px' }, [W.el('span', { text: l.d + ' · ' + l.s + ' · ' + l.m + ' min' }), W.el('button', { class: 'btn', type: 'button', text: '✕', style: 'margin-left:8px', onClick: function () { logs.splice(i, 1); save(KEY, logs); render(); } })]));
        });
        totals.appendChild(stat(W, 'Total time', (total / 60).toFixed(1) + ' h'));
        totals.appendChild(stat(W, 'Sessions', logs.length));
        Object.keys(byS).slice(0, 4).forEach(function (s) { totals.appendChild(stat(W, s, (byS[s] / 60).toFixed(1) + ' h')); });
      }
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Subject', subj), fld(W, 'Minutes', mins)]));
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Log session', onClick: function () { if (subj.value.trim()) { logs.push({ s: subj.value.trim(), m: +mins.value || 0, d: new Date().toISOString().slice(0, 10) }); save(KEY, logs); subj.value = ''; render(); } } })]));
      host.appendChild(totals); host.appendChild(list);
      host.appendChild(W.el('p', { class: 'note', text: 'Study log saved in this browser only. Log a session after each study block to see your totals build up.' }));
      render();
    },

    'quiz-maker': function (host, W) {
      var KEY = 'vk_quiz_v1', quiz = store(KEY, []);
      var q = inp(W, 'Question'), o1 = inp(W, 'Option A'), o2 = inp(W, 'Option B'), o3 = inp(W, 'Option C'), o4 = inp(W, 'Option D');
      var correct = W.el('select', { class: 'field', 'aria-label': 'Correct answer' }, [['0', 'A'], ['1', 'B'], ['2', 'C'], ['3', 'D']].map(function (o) { return W.el('option', { value: o[0], text: o[1] }); }));
      var list = W.el('div', { class: 'wpages' }), take = W.el('div', {});
      function renderList() { list.innerHTML = ''; quiz.forEach(function (item, i) { list.appendChild(W.el('div', { class: 'wpage', style: 'padding:8px 12px' }, [W.el('span', { text: (i + 1) + '. ' + item.q }), W.el('button', { class: 'btn', type: 'button', text: '✕', style: 'margin-left:8px', onClick: function () { quiz.splice(i, 1); save(KEY, quiz); renderList(); } })])); }); }
      function renderTake() {
        take.innerHTML = ''; if (!quiz.length) { take.appendChild(W.el('p', { class: 'note', text: 'Add questions, then take the quiz here.' })); return; }
        var answers = {};
        quiz.forEach(function (item, i) {
          var block = W.el('div', { style: 'margin:10px 0' }, [W.el('p', { style: 'font-weight:600', text: (i + 1) + '. ' + item.q })]);
          item.o.forEach(function (opt, oi) {
            var id = 'q' + i + 'o' + oi;
            var r = W.el('input', { type: 'radio', name: 'q' + i, id: id, onClick: function () { answers[i] = oi; } });
            block.appendChild(W.el('label', { class: 'winline', for: id, style: 'display:block' }, [r, W.el('span', { text: ' ' + String.fromCharCode(65 + oi) + '. ' + opt })]));
          });
          take.appendChild(block);
        });
        var result = W.el('p', { class: 'note' });
        take.appendChild(W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Check score', onClick: function () { var s = 0; quiz.forEach(function (item, i) { if (answers[i] === item.c) s++; }); result.className = 'note'; result.textContent = 'Score: ' + s + ' / ' + quiz.length; } }));
        take.appendChild(result);
      }
      host.appendChild(fld(W, 'Question', q));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'A', o1), fld(W, 'B', o2), fld(W, 'C', o3), fld(W, 'D', o4), fld(W, 'Correct', correct)]));
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Add question', onClick: function () { if (q.value.trim()) { quiz.push({ q: q.value.trim(), o: [o1.value, o2.value, o3.value, o4.value], c: +correct.value }); save(KEY, quiz); q.value = o1.value = o2.value = o3.value = o4.value = ''; renderList(); renderTake(); q.focus(); } } })]));
      host.appendChild(list);
      host.appendChild(W.el('p', { class: 'wlab', text: 'Take the quiz' })); host.appendChild(take);
      host.appendChild(W.el('p', { class: 'note', text: 'Build your own multiple-choice quiz — questions are saved in this browser. You write the questions and answers; there is no AI.' }));
      renderList(); renderTake();
    },

    'study-planner': function (host, W) {
      var KEY = 'vk_studyplan_v1', plan = store(KEY, []);
      var subj = inp(W, 'Subject'), hours = W.el('input', { class: 'field', type: 'number', value: '3', min: '0', step: '0.5', 'aria-label': 'Target hours per week' });
      var avail = W.el('input', { class: 'field', type: 'number', value: '14', min: '1', 'aria-label': 'Hours available per week' });
      var list = W.el('div', { class: 'wpages' }), out = W.el('div', { class: 'calc-stats' });
      function render() {
        list.innerHTML = ''; out.innerHTML = '';
        var total = plan.reduce(function (s, p) { return s + p.h; }, 0);
        plan.forEach(function (p, i) {
          var share = total ? Math.round(p.h / total * 100) : 0;
          list.appendChild(W.el('div', { class: 'wpage', style: 'padding:8px 12px' }, [W.el('span', { text: p.s + ' — ' + p.h + ' h/wk (' + share + '%)' }), W.el('button', { class: 'btn', type: 'button', text: '✕', style: 'margin-left:8px', onClick: function () { plan.splice(i, 1); save(KEY, plan); render(); } })]));
        });
        out.appendChild(stat(W, 'Planned', total + ' h/wk'));
        out.appendChild(stat(W, 'Available', (+avail.value || 0) + ' h/wk'));
        out.appendChild(stat(W, total > (+avail.value || 0) ? 'Over by' : 'Spare', Math.abs((+avail.value || 0) - total) + ' h'));
        out.appendChild(stat(W, 'Per day', (total / 7).toFixed(1) + ' h'));
      }
      avail.addEventListener('input', render);
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Subject', subj), fld(W, 'Target h/week', hours), fld(W, 'Hours available /week', avail)]));
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Add subject', onClick: function () { if (subj.value.trim()) { plan.push({ s: subj.value.trim(), h: +hours.value || 0 }); save(KEY, plan); subj.value = ''; render(); } } })]));
      host.appendChild(list); host.appendChild(out);
      host.appendChild(W.el('p', { class: 'note', text: 'Balances your subjects against the time you have each week. Saved in this browser only.' }));
      render();
    }

  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  root.VKEdu = { citation: citation };
  if (typeof module === 'object' && module.exports) module.exports = root.VKEdu;
  if (typeof root.VKW !== 'undefined') {
    Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); }
  }
})(typeof window !== 'undefined' ? window : globalThis);
