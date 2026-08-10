/* workflow.js — chain several tools into one run.
 *
 * WHAT THIS IS.
 * The Send-to row in handoff.js hands a file to the NEXT tool, one hop at a
 * time, with a page load between each. This is the same idea taken to its
 * conclusion: build the whole sequence up front, press Run once, and every
 * step executes back to back on this page. Compress, then watermark, then
 * protect — one file in, one file out, no navigation and nothing uploaded.
 *
 * WHY IT IS POSSIBLE HERE AND NOWHERE ELSE.
 * Vootkit's tools are already pure functions of a file. Each one exports a
 * spec with `process(files, options, api)` that returns blobs — filetool.js is
 * only a user interface wrapped around that. So a workflow does not need any
 * new processing code at all: it calls the same process() the tool page calls,
 * with the previous step's output as the next step's input. A site that
 * uploads files could not do this without a server-side job queue.
 *
 * WHAT IT WILL NOT DO, AND WHY THAT IS DELIBERATE.
 * Only tools that expose a process() spec can be steps — the PDF, image and
 * video sets. The widget-shaped tools build their interface and their logic
 * together in one function, so there is nothing to call without also drawing
 * their controls. Rather than half-support them and fail at run time, they are
 * not offered, and the step picker only ever lists what will actually run.
 *
 * FAILURE STOPS THE RUN AND SAYS WHICH STEP.
 * A four-step workflow that dies silently on step three is worse than no
 * workflow. Every step reports its own outcome, a failure halts the chain, and
 * the output of the last step that DID succeed is still offered for download —
 * losing three minutes of work because step four had a bad setting would be
 * unforgivable.
 */
(function (root) {
  'use strict';

  var doc = typeof document !== 'undefined' ? document : null;
  var STORE_KEY = 'vk-workflows';

  /* ---------- pure logic (unit-tested in test/workflow.test.js) ---------- */

  /* The type a file has after N steps.
   *
   * A workflow is only valid if each step accepts what the one before it
   * produced, and that cannot be checked from the tool ids alone: PDF to JPG
   * turns a PDF into an image, so what may follow it is completely different
   * from what may follow Compress PDF. Each spec declares what it emits via
   * `out`; anything that does not say is assumed to hand back the same kind it
   * was given, which is true of every in-place tool. */
  function outputOf(flow, id, current) {
    var f = (flow || {})[id];
    if (!f) return current;
    return f.o || current;
  }

  /* Which tools can legally follow this point in the chain? */
  function stepChoices(D, currentKind, exclude) {
    var flow = (D || {}).flow || {};
    var names = (D || {}).names || {};
    var out = [];
    Object.keys(flow).forEach(function (id) {
      if (!flow[id].w) return;                        // no process() to call
      if (id === exclude) return;
      if (!kindAccepted(flow[id].a, currentKind)) return;
      out.push({ id: id, name: names[id] || id, rank: flow[id].p || 999 });
    });
    out.sort(function (a, b) {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.name.localeCompare(b.name);
    });
    return out;
  }

  /* A coarser match than handoff's accepts(): here we are reasoning about a
     KIND of file rather than a specific one, because the user is designing the
     chain before choosing a file. */
  function kindAccepted(acceptStr, kind) {
    if (!acceptStr || !kind) return false;
    var a = String(acceptStr).toLowerCase();
    if (kind === 'pdf') return a.indexOf('pdf') > -1;
    if (kind === 'image') return a.indexOf('image/') > -1 || a.indexOf('.svg') > -1;
    if (kind === 'video') return a.indexOf('video/') > -1;
    if (kind === 'audio') return a.indexOf('audio/') > -1;
    return false;
  }

  function kindOfFile(name, mime) {
    var m = String(mime || '').toLowerCase();
    var n = String(name || '').toLowerCase();
    if (m.indexOf('image/') === 0) return 'image';
    if (m.indexOf('video/') === 0) return 'video';
    if (m.indexOf('audio/') === 0) return 'audio';
    if (m === 'application/pdf' || /\.pdf$/.test(n)) return 'pdf';
    if (/\.(png|jpe?g|webp|gif|bmp|svg|avif)$/.test(n)) return 'image';
    if (/\.(mp4|webm|mov|mkv|avi)$/.test(n)) return 'video';
    if (/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(n)) return 'audio';
    return '';
  }

  /* Is this saved chain still runnable against this file?
     Saved workflows outlive the catalogue: a tool can be renamed or retired
     between saving and running one. Rather than fail on step three, the whole
     chain is checked before anything starts. */
  function validate(D, steps, startKind) {
    var flow = (D || {}).flow || {};
    if (!steps || !steps.length) return { ok: false, why: 'Add at least one step.' };
    var kind = startKind;
    for (var i = 0; i < steps.length; i++) {
      var id = steps[i];
      if (!flow[id] || !flow[id].w) {
        return { ok: false, why: 'Step ' + (i + 1) + ' is no longer available.', step: i };
      }
      if (!kindAccepted(flow[id].a, kind)) {
        return { ok: false, why: 'Step ' + (i + 1) + ' cannot take what step ' + i + ' produces.', step: i };
      }
      kind = outputOf(flow, id, kind);
    }
    return { ok: true, endKind: kind };
  }

  /* ---------- saved workflows (this device, no account needed) ---------- */

  function load() {
    try { return JSON.parse(root.localStorage.getItem(STORE_KEY) || '[]') || []; }
    catch (e) { return []; }
  }
  function save(list) {
    try { root.localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, 20))); return true; }
    catch (e) { return false; }   // private mode, quota — saving is a nicety
  }

  /* ---------- the engine ---------- */

  function specFor(id) {
    var mods = [root.VKPdfTools, root.VKImageTools, root.VKImageTools2, root.VKVideoFx];
    for (var i = 0; i < mods.length; i++) {
      if (mods[i] && mods[i][id] && typeof mods[i][id].process === 'function') return mods[i][id];
    }
    return null;
  }

  function defaults(spec) {
    var o = {};
    (spec.options || []).forEach(function (opt) { o[opt.k] = opt.def; });
    return o;
  }

  /* Run the chain. `onStep(i, state, detail)` is called as each step starts,
     succeeds or fails, so the caller owns all the presentation. */
  async function run(file, steps, onStep) {
    var current = file;
    var produced = null;
    for (var i = 0; i < steps.length; i++) {
      /* A step is {id, opts} now. Plain ids are still accepted so a saved
         workflow from before settings existed still runs, on defaults. */
      var st = steps[i];
      var id = typeof st === 'string' ? st : st.id;
      var chosen = (typeof st === 'string' ? null : st.opts) || null;
      var spec = specFor(id);
      if (!spec) {
        onStep(i, 'fail', 'That tool is not loaded on this page.');
        return { ok: false, at: i, file: produced };
      }
      onStep(i, 'run', '');
      try {
        var opts = Object.assign(defaults(spec), chosen || {});
        var out = await spec.process([current], opts, {
          urls: { make: function (b) { return URL.createObjectURL(b); }, free: function () {} },
          loadImage: function (f) {
            return new Promise(function (res, rej) {
              var img = new Image();
              img.onload = function () { res(img); };
              img.onerror = rej;
              img.src = URL.createObjectURL(f);
            });
          },
          progress: function (p) { onStep(i, 'progress', p); },
          bytes: function (n) { return (n / 1048576).toFixed(2) + ' MB'; },
          status: function (msg) { onStep(i, 'status', msg); }
        });
        var dl = (out && out.downloads && out.downloads[0]) || null;
        if (!dl || !dl.blob) {
          onStep(i, 'fail', 'That step produced nothing to pass on.');
          return { ok: false, at: i, file: produced };
        }
        produced = { blob: dl.blob, name: dl.name || 'output' };
        current = new File([dl.blob], produced.name, { type: dl.blob.type || '' });
        onStep(i, 'done', out.status || '');
      } catch (e) {
        /* The message is the tool's own — "Choose at least two PDFs to merge"
           is far more useful than "step 2 failed". */
        onStep(i, 'fail', (e && e.message) || 'That step failed.');
        return { ok: false, at: i, file: produced };
      }
    }
    return { ok: true, file: produced };
  }

  /* ---------- the builder ---------- */

  function h(tag, attrs, kids) {
    var n = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return n;
  }

  /* ---------- the canvas editor ----------
   *
   * A node graph, not a list. The list version was legible and it was also
   * wrong for the job: a workflow is a THING WITH A SHAPE, and the shape is
   * what you are reasoning about while you build it — what feeds what, where
   * it changes type, where it will stop. A vertical list of names hides all of
   * that behind reading order.
   *
   * Everything is HTML nodes over one SVG edge layer, inside a single panned
   * and scaled wrapper. No canvas element and no library: the nodes have to be
   * real focusable elements or the whole thing is unusable by keyboard and
   * invisible to a screen reader, which is where most graph editors on the web
   * give up.
   */
  function mount(host) {
    if (!host) return;
    var D = root.VK_FLOW;
    if (!D) { host.textContent = 'Workflows are unavailable right now.'; return; }

    var files = [];
    var steps = [];              // [{id, opts, x, y}]
    var sel = -1;                // selected step index, -1 = none
    var view = { x: 40, y: 40, k: 1 };
    var NODE_W = 168, NODE_H = 84, GAP_X = 210;

    /* --- shell ------------------------------------------------------------ */
    var edges = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    edges.setAttribute('class', 'wfc-edges');
    var pan = h('div', { class: 'wfc-pan' }, [edges]);
    var canvas = h('div', { class: 'wfc-canvas', tabindex: '0', role: 'application',
      'aria-label': 'Workflow canvas. Use the panel on the right to change a step.' }, [pan]);
    var zoom = h('div', { class: 'wfc-zoom' }, [
      h('button', { class: 'icon-btn', type: 'button', text: '−', 'aria-label': 'Zoom out',
        onclick: function () { setZoom(view.k / 1.2); } }),
      h('button', { class: 'icon-btn', type: 'button', text: '+', 'aria-label': 'Zoom in',
        onclick: function () { setZoom(view.k * 1.2); } }),
      h('button', { class: 'icon-btn', type: 'button', text: '□', 'aria-label': 'Fit to view',
        onclick: fit })
    ]);
    var panel = h('aside', { class: 'wfc-panel', 'aria-label': 'Step settings' });
    var stage = h('div', { class: 'wfc' }, [canvas, zoom, panel]);

    var input = h('input', { type: 'file', multiple: 'multiple', class: 'sr-only', id: 'wf-file' });
    var fileBtn = h('button', { class: 'btn', type: 'button', text: 'Choose files',
      onclick: function () { input.click(); } });
    var fileNote = h('span', { class: 'wfc-files', id: 'wf-file-note', text: 'No files yet' });
    var runBtn = h('button', { class: 'btn btn-primary', type: 'button', text: 'Run workflow', disabled: 'disabled' });
    var saveBtn = h('button', { class: 'btn', type: 'button', text: 'Save', disabled: 'disabled' });
    var savedSel = h('select', { class: 'field wfc-load', 'aria-label': 'Load a saved workflow' });
    var bar = h('div', { class: 'wfc-bar' }, [fileBtn, input, fileNote,
      h('span', { class: 'wfc-spacer' }), savedSel, saveBtn, runBtn]);
    var log = h('div', { class: 'wfc-log', 'aria-live': 'polite' });

    /* --- geometry --------------------------------------------------------- */
    function startKind() { return files.length ? kindOfFile(files[0].name, files[0].type) : ''; }
    function layout() {
      steps.forEach(function (st, i) {
        if (st.x == null) { st.x = (i + 1) * GAP_X; st.y = 0; }
      });
    }
    function setZoom(k) {
      view.k = Math.max(0.4, Math.min(1.6, k));
      pan.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.k + ')';
    }
    function fit() {
      var xs = [0].concat(steps.map(function (s2) { return s2.x || 0; })).concat([(steps.length + 1) * GAP_X]);
      var ys = [0].concat(steps.map(function (s2) { return s2.y || 0; }));
      var w = Math.max.apply(null, xs) + NODE_W + 40;
      var hgt = Math.max.apply(null, ys) - Math.min.apply(null, ys) + NODE_H + 40;
      var k = Math.min(canvas.clientWidth / w, canvas.clientHeight / hgt, 1.2);
      view.k = Math.max(0.4, k || 1);
      view.x = 30; view.y = (canvas.clientHeight - hgt * view.k) / 2 - Math.min.apply(null, ys) * view.k;
      setZoom(view.k);
    }

    /* --- drawing ---------------------------------------------------------- */
    function nodeEl(cls, x, y, iconHtml, title, sub, onClick, i) {
      var n = h('div', { class: 'wfc-node ' + cls, style: 'left:' + x + 'px;top:' + y + 'px',
        tabindex: onClick ? '0' : null, role: onClick ? 'button' : null,
        'aria-label': onClick ? title + (sub ? ', ' + sub : '') + '. Open settings.' : title });
      n.appendChild(h('div', { class: 'wfc-ic', html: iconHtml }));
      n.appendChild(h('div', { class: 'wfc-tx' }, [
        h('strong', { text: title }),
        sub ? h('span', { text: sub }) : null
      ]));
      if (onClick) {
        n.addEventListener('click', function (e) { if (!n.dataset.dragged) onClick(e); delete n.dataset.dragged; });
        n.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } });
        makeDraggable(n, i);
      }
      return n;
    }

    function makeDraggable(el2, i) {
      var sx, sy, ox, oy, moving = false;
      el2.addEventListener('pointerdown', function (e) {
        if (e.button) return;
        moving = true; sx = e.clientX; sy = e.clientY; ox = steps[i].x; oy = steps[i].y;
        el2.setPointerCapture(e.pointerId); el2.classList.add('is-drag');
      });
      el2.addEventListener('pointermove', function (e) {
        if (!moving) return;
        var dx = (e.clientX - sx) / view.k, dy = (e.clientY - sy) / view.k;
        if (Math.abs(dx) + Math.abs(dy) > 3) el2.dataset.dragged = '1';
        steps[i].x = ox + dx; steps[i].y = oy + dy;
        el2.style.left = steps[i].x + 'px'; el2.style.top = steps[i].y + 'px';
        drawEdges();
      });
      el2.addEventListener('pointerup', function () { moving = false; el2.classList.remove('is-drag'); });
      el2.addEventListener('pointercancel', function () { moving = false; el2.classList.remove('is-drag'); });
    }

    function toolIcon(id) {
      var I = root.VK_ICONS, e = I && I.icons && I.icons[id];
      if (!e || !I.glyphs[e.g]) return '<span class="ic"></span>';
      return '<span class="ic ic-tool" style="--ic-h:' + e.h + ';--ic-bg:' + e.bg + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I.glyphs[e.g] + '</svg></span>';
    }

    /* A curve, not a straight line: with nodes at different heights a straight
       edge crosses the node boxes, and the eye loses which end is which. */
    function drawEdges() {
      var pts = [{ x: 0, y: 0 }].concat(steps.map(function (s2) { return { x: s2.x, y: s2.y }; }))
        .concat([{ x: (steps.length + 1) * GAP_X, y: 0 }]);
      var d = '';
      for (var i = 0; i < pts.length - 1; i++) {
        var x1 = pts[i].x + NODE_W, y1 = pts[i].y + NODE_H / 2;
        var x2 = pts[i + 1].x, y2 = pts[i + 1].y + NODE_H / 2;
        var mx = (x1 + x2) / 2;
        d += 'M' + x1 + ',' + y1 + ' C' + mx + ',' + y1 + ' ' + mx + ',' + y2 + ' ' + x2 + ',' + y2 + ' ';
      }
      var maxX = (steps.length + 1) * GAP_X + NODE_W + 60;
      var ys = pts.map(function (p) { return p.y; });
      var minY = Math.min.apply(null, ys) - 60, maxY = Math.max.apply(null, ys) + NODE_H + 60;
      edges.setAttribute('viewBox', '0 ' + minY + ' ' + maxX + ' ' + (maxY - minY));
      edges.setAttribute('width', maxX); edges.setAttribute('height', maxY - minY);
      edges.style.top = minY + 'px';
      edges.innerHTML =
        '<defs><marker id="wfa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
        '<path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>' +
        '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#wfa)"/>';
    }

    function summarise(st) {
      var spec = specFor(st.id);
      var o = (spec && spec.options) || [];
      if (!o.length) return '';
      var k = o[0];
      var v = st.opts[k.k];
      return (k.label || k.k) + ': ' + (v == null ? k.def : v) + (k.suffix || '');
    }

    function draw() {
      layout();
      [].slice.call(pan.querySelectorAll('.wfc-node, .wfc-add')).forEach(function (n) { n.remove(); });

      pan.appendChild(nodeEl('is-start', 0, 0,
        '<span class="ic ic-tool" style="--ic-bg:#1d4ed8;--ic-h:220"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V5m0 0L8 9m4-4 4 4M5 14v5h14v-5"/></svg></span>',
        files.length ? (files.length === 1 ? files[0].name : files.length + ' files') : 'Your files',
        files.length ? startKind() : 'nothing chosen yet', null));

      steps.forEach(function (st, i) {
        var nm = (D.names && D.names[st.id]) || st.id;
        var kindHere = startKind();
        for (var j = 0; j < i; j++) kindHere = outputOf(D.flow, steps[j].id, kindHere);
        var bad = files.length && !kindAccepted((D.flow[st.id] || {}).a, kindHere);
        pan.appendChild(nodeEl(
          'is-step' + (bad ? ' is-bad' : '') + (sel === i ? ' is-sel' : ''),
          st.x, st.y, toolIcon(st.id), nm, bad ? 'cannot take this file' : summarise(st),
          function () { sel = i; draw(); }, i));
      });

      var endX = (steps.length + 1) * GAP_X;
      pan.appendChild(nodeEl('is-end', endX, 0,
        '<span class="ic ic-tool" style="--ic-bg:#0f7a4a;--ic-h:150"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>',
        'Finished file', steps.length + ' step' + (steps.length === 1 ? '' : 's'), null));

      var addX = endX - GAP_X + NODE_W + 18;
      var add = h('button', { class: 'wfc-add', type: 'button', text: '+', 'aria-label': 'Add a step',
        style: 'left:' + addX + 'px;top:' + (NODE_H / 2 - 16) + 'px', onclick: openPicker });
      pan.appendChild(add);

      drawEdges();
      drawPanel();
      runBtn.disabled = !(files.length && steps.length);
      saveBtn.disabled = !steps.length;
      runBtn.textContent = files.length > 1 ? 'Run on ' + files.length + ' files' : 'Run workflow';
    }

    /* --- the picker ------------------------------------------------------- */
    function openPicker() {
      var kind = startKind();
      for (var j = 0; j < steps.length; j++) kind = outputOf(D.flow, steps[j].id, kind);
      var choices = stepChoices(D, kind || '', steps.length ? steps[steps.length - 1].id : null);
      panel.innerHTML = '';
      panel.appendChild(h('h3', { class: 'wfc-h', text: 'Add a step' }));
      if (!files.length) {
        panel.appendChild(h('p', { class: 'note', text: 'Choose your files first — which steps are possible depends on what they are.' }));
        return;
      }
      if (!choices.length) {
        panel.appendChild(h('p', { class: 'note', text: 'Nothing further can be done to the file at this point.' }));
        return;
      }
      var listEl = h('div', { class: 'wfc-pick' });
      choices.forEach(function (c) {
        /* The name goes in as a TEXT NODE, not as innerHTML. Tool names come
           from the catalogue rather than a user, but building markup out of
           any name is the habit that eventually ships an injection. */
        var btn = h('button', { class: 'wfc-pickbtn', type: 'button' }, [
          h('span', { class: 'wfc-pickic', html: toolIcon(c.id) }),
          h('span', { class: 'wfc-picktx', text: c.name })
        ]);
        btn.addEventListener('click', function () {
          steps.push({ id: c.id, opts: {}, x: (steps.length + 1) * GAP_X, y: 0 });
          sel = steps.length - 1;
          draw();
        });
        listEl.appendChild(btn);
      });
      panel.appendChild(listEl);
    }

    /* --- the settings panel ----------------------------------------------- */
    function optionField(opt, val, onChange) {
      var id = 'wf-o-' + Math.random().toString(36).slice(2, 8);
      var field;
      if (opt.type === 'select') {
        field = h('select', { class: 'field', id: id });
        (opt.options || []).forEach(function (o) {
          var oe = h('option', { value: String(o.v), text: o.label });
          if (String(o.v) === String(val)) oe.selected = true;
          field.appendChild(oe);
        });
        field.addEventListener('change', function () {
          var match = (opt.options || []).filter(function (o) { return String(o.v) === field.value; })[0];
          onChange(match ? match.v : field.value);
        });
      } else if (opt.type === 'range' || (opt.min != null && opt.max != null)) {
        field = h('input', { type: 'range', id: id, min: String(opt.min != null ? opt.min : 0),
          max: String(opt.max != null ? opt.max : 100), step: String(opt.step || 1), value: String(val) });
        var read = h('span', { class: 'wfc-val', text: String(val) + (opt.suffix || '') });
        field.addEventListener('input', function () {
          read.textContent = field.value + (opt.suffix || '');
          onChange(Number(field.value));
        });
        return h('label', { class: 'wfc-opt', for: id }, [
          h('span', { class: 'wfc-opt-l', text: opt.label || opt.k }), field, read]);
      } else if (opt.type === 'checkbox' || typeof opt.def === 'boolean') {
        field = h('input', { type: 'checkbox', id: id });
        field.checked = !!val;
        field.addEventListener('change', function () { onChange(field.checked); });
      } else {
        field = h('input', { type: 'text', class: 'field', id: id, value: String(val == null ? '' : val) });
        field.addEventListener('input', function () { onChange(field.value); });
      }
      return h('label', { class: 'wfc-opt', for: id }, [
        h('span', { class: 'wfc-opt-l', text: opt.label || opt.k }), field]);
    }

    function move(i, by) {
      var j = i + by;
      if (j < 0 || j >= steps.length) return;
      var tx = steps[i].x, ty = steps[i].y;
      steps[i].x = steps[j].x; steps[i].y = steps[j].y;
      steps[j].x = tx; steps[j].y = ty;
      var t = steps[i]; steps[i] = steps[j]; steps[j] = t;
      sel = j; draw();
    }

    function drawPanel() {
      if (sel < 0 || !steps[sel]) { if (!panel.querySelector('.wfc-pick')) openPicker(); return; }
      var st = steps[sel];
      var spec = specFor(st.id);
      var nm = (D.names && D.names[st.id]) || st.id;
      panel.innerHTML = '';
      panel.appendChild(h('h3', { class: 'wfc-h', text: nm }));
      panel.appendChild(h('div', { class: 'wfc-panacts' }, [
        h('button', { class: 'btn btn-sm', type: 'button', text: 'Move earlier',
          disabled: sel === 0 ? 'disabled' : null, onclick: function () { move(sel, -1); } }),
        h('button', { class: 'btn btn-sm', type: 'button', text: 'Move later',
          disabled: sel === steps.length - 1 ? 'disabled' : null, onclick: function () { move(sel, 1); } }),
        h('button', { class: 'btn btn-sm', type: 'button', text: 'Delete',
          onclick: function () { steps.splice(sel, 1); steps.forEach(function (s2, i2) { s2.x = (i2 + 1) * GAP_X; s2.y = 0; }); sel = -1; draw(); } })
      ]));
      var opts = (spec && spec.options) || [];
      if (!opts.length) {
        panel.appendChild(h('p', { class: 'note', text: 'This step has no settings — it does one thing.' }));
      } else {
        var wrap = h('div', { class: 'wfc-opts' });
        opts.forEach(function (opt) {
          if (st.opts[opt.k] === undefined) st.opts[opt.k] = opt.def;
          wrap.appendChild(optionField(opt, st.opts[opt.k], function (v) { st.opts[opt.k] = v; draw(); }));
        });
        panel.appendChild(wrap);
      }
      panel.appendChild(h('button', { class: 'btn btn-sm', type: 'button', text: 'Add another step', onclick: openPicker }));
    }

    /* --- panning ---------------------------------------------------------- */
    (function () {
      var px, py, ox, oy, panning = false;
      canvas.addEventListener('pointerdown', function (e) {
        if (e.target !== canvas && e.target !== pan && e.target !== edges) return;
        panning = true; px = e.clientX; py = e.clientY; ox = view.x; oy = view.y;
        canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-pan');
      });
      canvas.addEventListener('pointermove', function (e) {
        if (!panning) return;
        view.x = ox + (e.clientX - px); view.y = oy + (e.clientY - py); setZoom(view.k);
      });
      canvas.addEventListener('pointerup', function () { panning = false; canvas.classList.remove('is-pan'); });
      canvas.addEventListener('wheel', function (e) {
        if (!e.ctrlKey && Math.abs(e.deltaY) < 2) return;
        e.preventDefault(); setZoom(view.k * (e.deltaY > 0 ? 0.92 : 1.08));
      }, { passive: false });
    })();

    /* --- files, saving, running ------------------------------------------- */
    input.addEventListener('change', function () {
      if (!input.files || !input.files.length) return;
      var picked = [].slice.call(input.files);
      var kinds = {};
      picked.forEach(function (f) { kinds[kindOfFile(f.name, f.type)] = 1; });
      var ks = Object.keys(kinds).filter(Boolean);
      if (ks.length > 1) {
        fileNote.className = 'wfc-files is-err';
        fileNote.textContent = 'Those are ' + ks.join(' and ') + ' files — a workflow runs one kind at a time.';
        return;
      }
      files = picked;
      fileNote.className = 'wfc-files';
      fileNote.textContent = files.length === 1 ? files[0].name : files.length + ' ' + (ks[0] || '') + ' files';
      draw();
    });

    function refreshSaved() {
      savedSel.innerHTML = '';
      savedSel.appendChild(h('option', { value: '', text: 'Saved workflows…' }));
      load().forEach(function (wf, i) {
        savedSel.appendChild(h('option', { value: String(i), text: wf.name + ' (' + wf.steps.length + ')' }));
      });
    }
    savedSel.addEventListener('change', function () {
      var i = savedSel.value;
      if (i === '') return;
      var wf = load()[+i];
      if (!wf) return;
      steps = wf.steps.map(function (s2, n) {
        return { id: s2.id, opts: Object.assign({}, s2.opts), x: (n + 1) * GAP_X, y: 0 };
      });
      sel = -1; draw(); fit();
    });
    saveBtn.addEventListener('click', function () {
      var name = (root.prompt && root.prompt('Name this workflow', describe(D, steps))) || '';
      name = String(name).trim().slice(0, 60);
      if (!name) return;
      var l = load();
      l.unshift({ name: name, steps: steps.map(function (s2) { return { id: s2.id, opts: s2.opts }; }) });
      if (!save(l)) { log.textContent = 'Could not save — private browsing blocks it. The workflow still runs.'; return; }
      refreshSaved();
    });

    runBtn.addEventListener('click', async function () {
      var v = validate(D, steps.map(function (s2) { return s2.id; }), startKind());
      if (!v.ok) { log.innerHTML = ''; log.appendChild(h('p', { class: 'note err', text: v.why })); return; }
      runBtn.disabled = true; saveBtn.disabled = true;
      log.innerHTML = '';
      var nodes = [].slice.call(pan.querySelectorAll('.wfc-node.is-step'));
      nodes.forEach(function (n) { n.classList.remove('is-run', 'is-done', 'is-fail'); });
      var results = [];

      for (var fi = 0; fi < files.length; fi++) {
        var line = h('p', { class: 'wfc-line', text: files[fi].name + ' — starting' });
        log.appendChild(line);
        /* eslint-disable no-loop-func */
        var res = await run(files[fi], steps, (function (ln) {
          return function (i, state, detail) {
            var n = nodes[i];
            var nm = (D.names && D.names[steps[i].id]) || steps[i].id;
            if (state === 'run') { if (n) { n.classList.remove('is-done', 'is-fail'); n.classList.add('is-run'); } ln.textContent = ln.textContent.split(' — ')[0] + ' — ' + nm; }
            else if (state === 'progress' && typeof detail === 'number' && n) n.style.setProperty('--wfp', Math.round(detail * 100) + '%');
            else if (state === 'status' && detail) ln.textContent = ln.textContent.split(' — ')[0] + ' — ' + nm + ': ' + detail;
            else if (state === 'done' && n) { n.classList.remove('is-run'); n.classList.add('is-done'); }
            else if (state === 'fail' && n) { n.classList.remove('is-run'); n.classList.add('is-fail'); ln.className = 'wfc-line is-err'; ln.textContent = files[0] && ln.textContent.split(' — ')[0] + ' — ' + nm + ': ' + detail; }
          };
        })(line));
        /* eslint-enable no-loop-func */
        if (res.file) {
          results.push(res.file);
          line.textContent = line.textContent.split(' — ')[0] + (res.ok ? ' — done' : ' — stopped at step ' + (res.at + 1) + ', partial result kept');
        }
      }

      runBtn.disabled = false; saveBtn.disabled = false;
      if (!results.length) {
        log.appendChild(h('p', { class: 'note err', text: 'Nothing came out. Your originals are untouched and nothing was uploaded.' }));
        return;
      }
      log.appendChild(h('p', { class: 'note', text: results.length + ' of ' + files.length + ' file(s) came through.' }));
      results.forEach(function (r, i) {
        var b = h('button', { class: 'btn' + (i === 0 ? ' btn-primary' : '') + ' btn-sm', type: 'button', text: 'Download ' + r.name });
        b.addEventListener('click', function () {
          if (root.VKDeliver && root.VKDeliver.deliver) root.VKDeliver.deliver(r.blob, r.name, { toolId: 'workflow', host: log });
          else {
            var u = URL.createObjectURL(r.blob);
            var a = doc.createElement('a'); a.href = u; a.download = r.name; a.click();
            setTimeout(function () { URL.revokeObjectURL(u); }, 1500);
          }
        });
        log.appendChild(b);
      });
    });

    host.appendChild(bar);
    host.appendChild(stage);
    host.appendChild(log);
    refreshSaved();
    setZoom(1);
    draw();
  }

  /* A default name that describes the chain, so a saved workflow is
     recognisable without being named by hand. */
  function describe(D, steps) {
    var names = (D || {}).names || {};
    return steps.map(function (s) { return names[s.id] || s.id; }).join(' \u2192 ');
  }

  root.VKWorkflow = {
    mount: mount,
    describe: describe,
    outputOf: outputOf,
    stepChoices: stepChoices,
    kindAccepted: kindAccepted,
    kindOfFile: kindOfFile,
    validate: validate,
    load: load,
    save: save,
    run: run,
    specFor: specFor,
    defaults: defaults,
    STORE_KEY: STORE_KEY
  };
  if (typeof module === 'object' && module.exports) module.exports = root.VKWorkflow;
})(typeof window !== 'undefined' ? window : globalThis);
