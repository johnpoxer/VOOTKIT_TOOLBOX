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

  /* ---------- the graph ----------
   *
   * A workflow is nodes and LINKS the user drew, not an implied sequence. That
   * distinction is the whole difference between a form and an editor: the
   * order comes from what is connected to what, so a node can be dragged
   * anywhere, left unconnected while you think, or given two outputs to send
   * one file down two different paths.
   *
   * Merges are deliberately not a thing. Two PDFs arriving at one node has no
   * meaning for a file pipeline — which one is "the" file? — so a node takes
   * one input and may feed several. Every route from the input to a dead end
   * is a path, and each path runs independently and produces its own file.
   */
  function pathsFrom(nodes, links, startId) {
    var out = [];
    var byFrom = {};
    (links || []).forEach(function (l) { (byFrom[l.from] = byFrom[l.from] || []).push(l.to); });

    function walk(id, acc, seen) {
      var next = byFrom[id] || [];
      var live = next.filter(function (n) { return seen.indexOf(n) === -1; });
      if (!live.length) { if (acc.length) out.push(acc.slice()); return; }
      live.forEach(function (n) {
        var node = nodes.filter(function (x) { return x.uid === n; })[0];
        if (!node) { if (acc.length) out.push(acc.slice()); return; }
        acc.push(node);
        walk(n, acc, seen.concat([n]));
        acc.pop();
      });
    }
    walk(startId, [], [startId]);
    return out;
  }

  /* Would this link create a cycle? A file cannot flow into its own source,
     and without this check the run enumerator would never terminate. */
  function wouldCycle(links, from, to) {
    if (from === to) return true;
    var byFrom = {};
    links.forEach(function (l) { (byFrom[l.from] = byFrom[l.from] || []).push(l.to); });
    var stack = [to], seen = {};
    while (stack.length) {
      var n = stack.pop();
      if (n === from) return true;
      if (seen[n]) continue;
      seen[n] = 1;
      (byFrom[n] || []).forEach(function (x) { stack.push(x); });
    }
    return false;
  }

  /* ---------- templates ----------
   *
   * The empty state of an editor is where most people decide it is not for
   * them. A blank canvas asks you to already know what Vootkit can do; a
   * template shows you, and is editable the moment it lands, so it teaches
   * rather than hides.
   *
   * Each one is a real job somebody actually has, not a demonstration of the
   * feature. Steps are ids only — settings come from each tool's own defaults,
   * so a template cannot drift out of date with the tool it names.
   */
  var TEMPLATES = [
    { id: 'web-images', name: 'Optimise images for a website', kind: 'image',
      why: 'Resize to a sane width, compress, then convert to WebP.',
      steps: ['resize-image', 'compress-image', 'convert-image'] },
    { id: 'doc-pack', name: 'Prepare documents to send', kind: 'pdf',
      why: 'Shrink a scan, stamp it, and lock it before it leaves your hands.',
      steps: ['rotate-pdf', 'pdf-watermark', 'protect-pdf'] },
    { id: 'pdf-extract', name: 'Pull pages out and tidy them', kind: 'pdf',
      why: 'Take the pages you need, drop the rest, number what is left.',
      steps: ['extract-pdf-pages', 'pdf-page-numbers'] },
    { id: 'social-clip', name: 'Cut a clip for social', kind: 'video',
      why: 'Trim it, then make a looping GIF of the good bit.',
      steps: ['trim-video', 'video-to-gif'] },
    { id: 'photo-set', name: 'Clean up a batch of photos', kind: 'image',
      why: 'Crop them all to the same shape, then compress for sharing.',
      steps: ['crop-image', 'compress-image'] }
  ];

  /* A template is only worth showing if every step in it still exists and can
     still run. One retired tool would otherwise produce a template that fails
     the moment it is used. */
  function templatesFor(D, kind) {
    var flow = (D || {}).flow || {};
    return TEMPLATES.filter(function (t) {
      if (kind && t.kind !== kind) return false;
      return t.steps.every(function (id) { return flow[id] && flow[id].w; });
    });
  }

  /* ---------- who may run one ----------
   *
   * Workflows are a Pro feature. Building one is free and always will be —
   * you cannot judge whether a thing is worth paying for from a description of
   * it, and a canvas you may not touch converts nobody. The gate is on RUN,
   * which is the moment the value is obvious and the cost is real.
   *
   * Fails OPEN. If the plan lookup errors, Supabase is down, or auth has not
   * loaded, the run proceeds. Refusing a paying customer because a network
   * call failed is worse than an occasional free run. */
  async function isPro(root2) {
    try {
      var A = (root2 || root).VKAuth;
      if (!A || !A.enabled || !A.getUser) return true;
      var user = await A.getUser();
      if (!user) return false;
      var c = await A.client();
      var r = await c.from('profiles').select('plan').eq('id', user.id).single();
      var plan = r && r.data && r.data.plan;
      return plan === 'creator_pro' || plan === 'creator_teams';
    } catch (e) { return true; }
  }

  /* ---------- what kind of failure was that ----------
   *
   * Retrying is only kind when the thing might work next time. A file the tool
   * cannot read will not become readable on the second attempt, and offering
   * "try again" for it wastes the user's time and teaches them the button is
   * decorative.
   *
   * Classification is on the tool's OWN message, because that is the only
   * signal there is — these run in-process, so there are no status codes. The
   * default is PERMANENT: an unrecognised failure is more likely to be a bad
   * file than a blip, and a wrong "retry" costs more trust than a missing one.
   */
  function classifyError(msg) {
    var m = String(msg || '').toLowerCase();
    if (/network|fetch|load|timeout|timed out|temporarily|try again|aborted/.test(m)) {
      return 'retryable';
    }
    if (/memory|out of memory|allocation/.test(m)) return 'resource';
    return 'permanent';
  }

  /* What to say, and whether to offer the button. Written so the message names
     the step and suggests the next move — "Error 500" tells nobody anything. */
  function failureAdvice(stepName, msg) {
    var kind = classifyError(msg);
    if (kind === 'retryable') {
      return { kind: kind, retry: true,
        text: stepName + ' could not finish — that usually clears on a second attempt.' };
    }
    if (kind === 'resource') {
      return { kind: kind, retry: true,
        text: stepName + ' ran out of memory. Close some tabs, or run fewer files at once, then retry.' };
    }
    return { kind: kind, retry: false,
      text: stepName + ': ' + (msg || 'that step failed.') + ' Retrying will not help — change the setting or the file.' };
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
  async function run(file, steps, onStep, ctl) {
    var current = file;
    var produced = null;
    var c = ctl || {};
    var from = c.from || 0;          // resume point, so a retry does not redo good work
    for (var i = from; i < steps.length; i++) {
      /* A step is {id, opts} now. Plain ids are still accepted so a saved
         workflow from before settings existed still runs, on defaults. */
      var st = steps[i];
      var id = typeof st === 'string' ? st : st.id;
      var chosen = (typeof st === 'string' ? null : st.opts) || null;
      var spec = specFor(id);
      if (!spec) {
        onStep(i, 'fail', 'That tool is not loaded on this page.');
        return { ok: false, at: i, file: produced, error: 'not loaded' };
      }
      /* Checked BETWEEN steps, not inside one. A tool's process() has no way to
         be interrupted mid-encode, so cancellation is honest about its
         granularity: it stops the next step from starting rather than
         pretending to abort the current one. */
      if (c.cancelled) return { ok: false, at: i, file: produced, cancelled: true };
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
        /* The checkpoint. A retry starts from here rather than from the top,
           so a four-minute encode is never repeated because step four had a
           bad setting. */
        c.checkpoint = { file: current, next: i + 1 };
        onStep(i, 'done', out.status || '');
      } catch (e) {
        /* The message is the tool's own — "Choose at least two PDFs to merge"
           is far more useful than "step 2 failed". */
        var msg = (e && e.message) || 'That step failed.';
        onStep(i, 'fail', msg);
        return { ok: false, at: i, file: produced, error: msg };
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
   * A node editor you build by DRAGGING. A palette of tools down the left; drag
   * one onto the canvas and it lands where you dropped it; drag from a node's
   * output dot to another node's input dot to connect them. The order a
   * workflow runs in is the order you drew, not the order you clicked.
   *
   * That is the difference between an editor and a form with extra steps. A
   * form can only express a straight line. Here a node can sit unconnected
   * while you think, be rewired without being deleted, or feed two different
   * paths from one file.
   *
   * Everything is real HTML over one SVG edge layer — no <canvas> element and
   * no library. A canvas-drawn graph cannot be tabbed to, cannot be read by a
   * screen reader and cannot inherit a design token, which is where most web
   * graph editors give up. Every node here is a focusable button, and there is
   * a keyboard route to every action that dragging performs.
   */
  /* The locked state a non-Pro visitor sees INSTEAD of the editor.
   *
   * Workflows are a Pro feature outright, not a free tool with a paid run
   * button. So the editor does not load at all — but the page still has to
   * answer "what am I buying", because a lock with nothing behind it converts
   * nobody and gives a search engine nothing to index either. It shows the
   * real templates, named, with their real steps, and says plainly what it
   * does. That is a description of the product, not a demo of it. */
  function lockedView(host, D) {
    host.innerHTML = '';
    var wrap = h('div', { class: 'wf-locked' });
    wrap.appendChild(h('span', { class: 'wf-lock-tag', text: 'Vootkit Pro' }));
    wrap.appendChild(h('h2', { text: 'Workflows are part of Pro' }));
    wrap.appendChild(h('p', {
      text: 'Chain any of the tools into one run — compress, then stamp, then '
          + 'lock — and put a whole folder through it at once. Every step runs '
          + 'on your device, so nothing is uploaded between them, and a saved '
          + 'workflow comes back with its settings ready for the next batch.'
    }));

    var temps = templatesFor(D);
    if (temps.length) {
      wrap.appendChild(h('h3', { text: 'Workflows people run' }));
      var ul = h('ul', { class: 'wf-lock-list' });
      temps.forEach(function (t) {
        ul.appendChild(h('li', {}, [
          h('strong', { text: t.name }),
          h('span', { text: t.steps.map(function (id) { return (D.names && D.names[id]) || id; }).join('  →  ') })
        ]));
      });
      wrap.appendChild(ul);
    }

    wrap.appendChild(h('a', { class: 'btn btn-primary', href: '../pricing.html', text: 'See Vootkit Pro' }));
    wrap.appendChild(h('p', { class: 'note',
      text: 'Already Pro? Sign in and this page becomes the editor.' }));
    host.appendChild(wrap);
    try { if (root.VKTrack && root.VKTrack.event) root.VKTrack.event('workflow_locked', {}); } catch (e) {}
  }

  function mount(host) {
    if (!host) return;
    var D = root.VK_FLOW;
    if (!D) { host.textContent = 'Workflows are unavailable right now.'; return; }

    /* THE WHOLE FEATURE IS GATED, not just the run. isPro() still fails OPEN,
       so a plan lookup that errors gives the editor rather than the lock —
       showing a paying customer a sales page because a network call hiccupped
       is the one failure this must not have. */
    isPro(root).then(function (allowed) {
      if (!allowed) { lockedView(host, D); return; }
      editor(host, D);
    });
  }

  function editor(host, D) {

    var files = [];
    var nodes = [];            // [{uid, id, opts, x, y}]
    var links = [];            // [{from, to}]  ids are uid | 'in'
    var sel = null;            // selected uid
    var view = { x: 30, y: 30, k: 1 };
    var uidN = 0;
    var past = [], future = [];   // undo/redo stacks

    /* A snapshot is the whole graph, because partial undo of a graph is a
       source of bugs nobody can reason about. The graphs are tiny — a dozen
       nodes of JSON — so copying is cheaper than tracking deltas. */
    function snap() {
      return JSON.stringify({ nodes: nodes, links: links, uidN: uidN });
    }
    function pushHistory() {
      past.push(snap());
      if (past.length > 50) past.shift();
      future.length = 0;          // a new action forks the timeline
    }
    function restore(json) {
      var st = JSON.parse(json);
      nodes = st.nodes; links = st.links; uidN = st.uidN;
      if (sel && !byUid(sel)) sel = null;
      draw();
    }
    function undo() { if (!past.length) return; future.push(snap()); restore(past.pop()); }
    function redo() { if (!future.length) return; past.push(snap()); restore(future.pop()); }
    var NODE_W = 172, NODE_H = 76;

    var IN_X = 20, IN_Y = 120;

    /* --- shell ------------------------------------------------------------ */
    var edges = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    edges.setAttribute('class', 'wfc-edges');
    var pan = h('div', { class: 'wfc-pan' }, [edges]);
    var canvas = h('div', { class: 'wfc-canvas', tabindex: '0', role: 'application',
      'aria-label': 'Workflow canvas. Drag tools from the palette, then drag between the dots to connect them.' }, [pan]);
    var hint = h('p', { class: 'wfc-hint', text: 'Drag a tool from the left onto the canvas' });
    canvas.appendChild(hint);

    var search = h('input', { type: 'search', class: 'field wfc-search', placeholder: 'Search tools', 'aria-label': 'Search tools' });
    var palList = h('div', { class: 'wfc-pal-list' });
    var palette = h('aside', { class: 'wfc-pal', 'aria-label': 'Tool palette' }, [
      h('h3', { class: 'wfc-h', text: 'Tools' }), search, palList
    ]);
    var zoom = h('div', { class: 'wfc-zoom' }, [
      h('button', { class: 'icon-btn', type: 'button', text: '−', 'aria-label': 'Zoom out', onclick: function () { setZoom(view.k / 1.2); } }),
      h('button', { class: 'icon-btn', type: 'button', text: '+', 'aria-label': 'Zoom in', onclick: function () { setZoom(view.k * 1.2); } }),
      h('button', { class: 'icon-btn', type: 'button', text: '□', 'aria-label': 'Fit to view', onclick: fit })
    ]);
    var panel = h('aside', { class: 'wfc-panel', 'aria-label': 'Node settings' });
    var stage = h('div', { class: 'wfc' }, [palette, canvas, zoom, panel]);

    var input = h('input', { type: 'file', multiple: 'multiple', class: 'sr-only', id: 'wf-file' });
    var fileBtn = h('button', { class: 'btn', type: 'button', text: 'Choose files', onclick: function () { input.click(); } });
    var fileNote = h('span', { class: 'wfc-files', id: 'wf-file-note', text: 'No files yet' });
    var runBtn = h('button', { class: 'btn btn-primary', type: 'button', text: 'Run workflow', disabled: 'disabled' });
    var saveBtn = h('button', { class: 'btn', type: 'button', text: 'Save', disabled: 'disabled' });
    var cancelBtn = h('button', { class: 'btn wfc-cancel', type: 'button', text: 'Cancel', hidden: 'hidden' });
    var savedSel = h('select', { class: 'field wfc-load', 'aria-label': 'Load a saved workflow' });
    var bar = h('div', { class: 'wfc-bar' }, [fileBtn, input, fileNote, h('span', { class: 'wfc-spacer' }), savedSel, saveBtn, cancelBtn, runBtn]);
    var log = h('div', { class: 'wfc-log', 'aria-live': 'polite' });

    /* --- helpers ---------------------------------------------------------- */
    function startKind() { return files.length ? kindOfFile(files[0].name, files[0].type) : ''; }
    function byUid(u) { return u === 'in' ? { uid: 'in', x: IN_X, y: IN_Y } : nodes.filter(function (n) { return n.uid === u; })[0]; }
    function parentOf(u) { var l = links.filter(function (x) { return x.to === u; })[0]; return l ? l.from : null; }

    /* The kind of file arriving at a node, by walking back up the links it is
       actually connected by — not by its position in an array. */
    function kindAt(u) {
      var chainUp = [], cur = u, guard = 0;
      while (cur && cur !== 'in' && guard++ < 50) { chainUp.unshift(cur); cur = parentOf(cur); }
      if (cur !== 'in') return '';                       // not wired to the input
      var kind = startKind();
      chainUp.slice(0, -1).forEach(function (id) {
        var n = byUid(id); if (n) kind = outputOf(D.flow, n.id, kind);
      });
      return kind;
    }

    function setZoom(k) {
      view.k = Math.max(0.4, Math.min(1.6, k));
      pan.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.k + ')';
    }
    function fit() {
      if (!nodes.length) { view.x = 30; view.y = 30; setZoom(1); return; }
      var xs = nodes.map(function (n) { return n.x; }).concat([IN_X]);
      var ys = nodes.map(function (n) { return n.y; }).concat([IN_Y]);
      var w = Math.max.apply(null, xs) - Math.min.apply(null, xs) + NODE_W + 60;
      var hh = Math.max.apply(null, ys) - Math.min.apply(null, ys) + NODE_H + 60;
      var k = Math.min((canvas.clientWidth || 600) / w, (canvas.clientHeight || 400) / hh, 1.2);
      view.k = Math.max(0.4, k || 1);
      view.x = 30 - Math.min.apply(null, xs) * view.k;
      view.y = 30 - Math.min.apply(null, ys) * view.k;
      setZoom(view.k);
    }
    function toCanvas(clientX, clientY) {
      var r = canvas.getBoundingClientRect();
      return { x: (clientX - r.left - view.x) / view.k, y: (clientY - r.top - view.y) / view.k };
    }
    function toolIcon(id) {
      var I = root.VK_ICONS, e = I && I.icons && I.icons[id];
      if (!e || !I.glyphs[e.g]) return '<span class="ic"></span>';
      return '<span class="ic ic-tool" style="--ic-h:' + e.h + ';--ic-bg:' + e.bg + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I.glyphs[e.g] + '</svg></span>';
    }
    function summarise(n) {
      var spec = specFor(n.id), o = (spec && spec.options) || [];
      if (!o.length) return '';
      var k = o[0], v = n.opts[k.k];
      return (k.label || k.k) + ': ' + (v == null ? k.def : v) + (k.suffix || '');
    }

    /* --- the palette (drag source) ---------------------------------------- */
    function drawPalette() {
      palList.innerHTML = '';
      var q = (search.value || '').trim().toLowerCase();
      var all = Object.keys(D.flow).filter(function (id) { return D.flow[id].w; });
      var items = all.map(function (id) {
        return { id: id, name: (D.names && D.names[id]) || id, rank: D.flow[id].p || 999 };
      }).filter(function (it) { return !q || it.name.toLowerCase().indexOf(q) > -1; });
      items.sort(function (a, b) { return a.rank - b.rank || a.name.localeCompare(b.name); });
      if (!items.length) { palList.appendChild(h('p', { class: 'note', text: 'Nothing matches.' })); return; }
      items.forEach(function (it) {
        var b = h('button', { class: 'wfc-palitem', type: 'button', draggable: 'true',
          'aria-label': 'Add ' + it.name + ' to the canvas' }, [
          h('span', { class: 'wfc-pickic', html: toolIcon(it.id) }),
          h('span', { class: 'wfc-picktx', text: it.name })
        ]);
        b.addEventListener('dragstart', function (e) {
          e.dataTransfer.setData('text/vk-tool', it.id);
          e.dataTransfer.effectAllowed = 'copy';
          canvas.classList.add('is-target');
        });
        b.addEventListener('dragend', function () { canvas.classList.remove('is-target'); });
        /* Click still works. Dragging is the good way; it must not be the only
           way, or the palette is unusable by keyboard and on some phones. */
        b.addEventListener('click', function () { addNode(it.id, null, null); });
        palList.appendChild(b);
      });
    }
    search.addEventListener('input', drawPalette);

    canvas.addEventListener('dragover', function (e) {
      if (e.dataTransfer && [].indexOf.call(e.dataTransfer.types, 'text/vk-tool') > -1) {
        e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
      }
    });
    canvas.addEventListener('drop', function (e) {
      var id = e.dataTransfer && e.dataTransfer.getData('text/vk-tool');
      if (!id) return;
      e.preventDefault();
      canvas.classList.remove('is-target');
      var p = toCanvas(e.clientX, e.clientY);
      addNode(id, p.x - NODE_W / 2, p.y - NODE_H / 2);
    });

    /* A new node auto-connects to the last thing that has no output, which is
       what you meant nine times out of ten — and is undone by dragging the
       link away, rather than being a rule you cannot escape. */
    function addNode(id, x, y) {
      pushHistory();
      var uid = 'n' + (++uidN);
      var n = { uid: uid, id: id, opts: {}, x: x == null ? 240 + nodes.length * 40 : x, y: y == null ? IN_Y + nodes.length * 20 : y };
      nodes.push(n);
      var taken = {}; links.forEach(function (l) { taken[l.from] = 1; });
      var tail = nodes.slice(0, -1).filter(function (m) { return !taken[m.uid]; }).pop();
      var from = tail ? tail.uid : (links.some(function (l) { return l.from === 'in'; }) ? null : 'in');
      if (from) links.push({ from: from, to: uid });
      sel = uid;
      draw();
    }

    /* --- drawing ---------------------------------------------------------- */
    function portPos(u, side) {
      var n = byUid(u); if (!n) return { x: 0, y: 0 };
      return { x: n.x + (side === 'out' ? NODE_W : 0), y: n.y + NODE_H / 2 };
    }
    function drawEdges(temp) {
      var all = links.map(function (l) { return { a: portPos(l.from, 'out'), b: portPos(l.to, 'in'), l: l }; });
      var parts = all.map(function (e, i) {
        var mx = (e.a.x + e.b.x) / 2;
        return '<path class="wfc-edge" data-i="' + i + '" d="M' + e.a.x + ',' + e.a.y +
          ' C' + mx + ',' + e.a.y + ' ' + mx + ',' + e.b.y + ' ' + e.b.x + ',' + e.b.y +
          '" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#wfa)"/>';
      });
      if (temp) {
        var m2 = (temp.a.x + temp.b.x) / 2;
        parts.push('<path class="wfc-edge is-temp" d="M' + temp.a.x + ',' + temp.a.y +
          ' C' + m2 + ',' + temp.a.y + ' ' + m2 + ',' + temp.b.y + ' ' + temp.b.x + ',' + temp.b.y +
          '" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4"/>');
      }
      var xs = [IN_X + NODE_W].concat(nodes.map(function (n) { return n.x + NODE_W; }));
      var ys = [IN_Y].concat(nodes.map(function (n) { return n.y; }));
      var maxX = Math.max.apply(null, xs) + 120, minY = Math.min.apply(null, ys) - 80, maxY = Math.max.apply(null, ys) + NODE_H + 80;
      edges.setAttribute('viewBox', '0 ' + minY + ' ' + maxX + ' ' + (maxY - minY));
      edges.setAttribute('width', maxX); edges.setAttribute('height', maxY - minY);
      edges.style.top = minY + 'px';
      edges.innerHTML = '<defs><marker id="wfa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
        '<path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>' + parts.join('');
      [].forEach.call(edges.querySelectorAll('.wfc-edge:not(.is-temp)'), function (pth) {
        pth.addEventListener('click', function () {
          pushHistory();
          links.splice(+pth.getAttribute('data-i'), 1);
          draw();
        });
      });
    }

    function portEl(u, side) {
      var dot = h('span', { class: 'wfc-port wfc-port-' + side, 'data-u': u, 'data-side': side,
        role: 'button', tabindex: side === 'out' ? '0' : null,
        'aria-label': side === 'out' ? 'Drag from here to connect this to another step' : 'Input' });
      if (side === 'out') {
        dot.addEventListener('pointerdown', function (e) {
          e.stopPropagation();
          startLink(u, e);
        });
      }
      return dot;
    }

    var linking = null;
    function startLink(fromU, e) {
      linking = { from: fromU };
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add('is-linking');
      var mv = function (ev) {
        var p = toCanvas(ev.clientX, ev.clientY);
        drawEdges({ a: portPos(fromU, 'out'), b: p });
      };
      var up = function (ev) {
        canvas.removeEventListener('pointermove', mv);
        canvas.removeEventListener('pointerup', up);
        canvas.classList.remove('is-linking');
        var el2 = doc.elementFromPoint(ev.clientX, ev.clientY);
        var target = el2 && el2.closest && el2.closest('.wfc-node');
        var toU = target && target.getAttribute('data-uid');
        linking = null;
        if (toU && toU !== fromU && !wouldCycle(links, fromU, toU)) {
          pushHistory();
          links = links.filter(function (l) { return l.to !== toU; });   // one input per node
          links.push({ from: fromU, to: toU });
        }
        draw();
      };
      canvas.addEventListener('pointermove', mv);
      canvas.addEventListener('pointerup', up);
    }

    function makeDraggable(el2, n) {
      var sx, sy, ox, oy, moving = false;
      el2.addEventListener('pointerdown', function (e) {
        if (e.button || e.target.classList.contains('wfc-port')) return;
        moving = true; sx = e.clientX; sy = e.clientY; ox = n.x; oy = n.y;
        el2.setPointerCapture(e.pointerId); el2.classList.add('is-drag');
      });
      el2.addEventListener('pointermove', function (e) {
        if (!moving) return;
        var dx = (e.clientX - sx) / view.k, dy = (e.clientY - sy) / view.k;
        if (Math.abs(dx) + Math.abs(dy) > 3) el2.dataset.dragged = '1';
        n.x = ox + dx; n.y = oy + dy;
        el2.style.left = n.x + 'px'; el2.style.top = n.y + 'px';
        drawEdges();
      });
      var stop = function () { moving = false; el2.classList.remove('is-drag'); };
      el2.addEventListener('pointerup', stop);
      el2.addEventListener('pointercancel', stop);
    }

    /* A template lands as a normal, fully editable graph — not a locked
       preset. It is a starting point somebody can immediately disagree with. */
    function applyTemplate(t) {
      pushHistory();
      nodes = []; links = []; uidN = 0;
      var prev = 'in';
      t.steps.forEach(function (id, i) {
        var uid = 'n' + (++uidN);
        nodes.push({ uid: uid, id: id, opts: {}, x: 250 + i * 210, y: IN_Y });
        links.push({ from: prev, to: uid });
        prev = uid;
      });
      sel = null;
      draw(); fit();
    }

    canvas.addEventListener('keydown', function (e) {
      var mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      else if (mod && e.key.toLowerCase() === 'd' && sel && byUid(sel)) {
        e.preventDefault();
        var src = byUid(sel);
        pushHistory();
        var uid = 'n' + (++uidN);
        nodes.push({ uid: uid, id: src.id, opts: Object.assign({}, src.opts), x: src.x + 30, y: src.y + 50 });
        sel = uid; draw();
      }
    });

    function draw() {
      [].slice.call(pan.querySelectorAll('.wfc-node')).forEach(function (n) { n.remove(); });
      hint.hidden = nodes.length > 0;

      var inNode = h('div', { class: 'wfc-node is-start', style: 'left:' + IN_X + 'px;top:' + IN_Y + 'px', 'data-uid': 'in' }, [
        h('div', { class: 'wfc-ic', html: '<span class="ic ic-tool" style="--ic-bg:#1d4ed8;--ic-h:220"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V5m0 0L8 9m4-4 4 4M5 14v5h14v-5"/></svg></span>' }),
        h('div', { class: 'wfc-tx' }, [
          h('strong', { text: files.length ? (files.length === 1 ? files[0].name : files.length + ' files') : 'Your files' }),
          h('span', { text: files.length ? startKind() : 'nothing chosen yet' })
        ])
      ]);
      inNode.appendChild(portEl('in', 'out'));
      pan.appendChild(inNode);

      nodes.forEach(function (n) {
        var nm = (D.names && D.names[n.id]) || n.id;
        var k = kindAt(n.uid);
        var orphan = !k;
        var bad = files.length && k && !kindAccepted((D.flow[n.id] || {}).a, k);
        var el2 = h('div', {
          class: 'wfc-node is-step' + (bad ? ' is-bad' : '') + (orphan ? ' is-orphan' : '') + (sel === n.uid ? ' is-sel' : ''),
          style: 'left:' + n.x + 'px;top:' + n.y + 'px', 'data-uid': n.uid,
          tabindex: '0', role: 'button', 'aria-label': nm + '. Open settings.'
        }, [
          h('div', { class: 'wfc-ic', html: toolIcon(n.id) }),
          h('div', { class: 'wfc-tx' }, [
            h('strong', { text: nm }),
            h('span', { text: bad ? 'cannot take this file' : (orphan ? 'not connected' : summarise(n)) })
          ])
        ]);
        el2.appendChild(portEl(n.uid, 'in'));
        el2.appendChild(portEl(n.uid, 'out'));
        el2.addEventListener('click', function () {
          if (el2.dataset.dragged) { delete el2.dataset.dragged; return; }
          sel = n.uid; draw();
        });
        el2.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel = n.uid; draw(); }
          if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeNode(n.uid); }
        });
        makeDraggable(el2, n);
        pan.appendChild(el2);
      });

      drawEdges();
      drawPanel();
      var paths = pathsFrom(nodes, links, 'in');
      runBtn.disabled = !(files.length && paths.length);
      saveBtn.disabled = !nodes.length;
      runBtn.textContent = files.length > 1 ? 'Run on ' + files.length + ' files' : 'Run workflow';
    }

    function removeNode(uid) {
      pushHistory();
      nodes = nodes.filter(function (n) { return n.uid !== uid; });
      links = links.filter(function (l) { return l.from !== uid && l.to !== uid; });
      if (sel === uid) sel = null;
      draw();
    }

    /* --- settings panel --------------------------------------------------- */
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
          var m = (opt.options || []).filter(function (o) { return String(o.v) === field.value; })[0];
          onChange(m ? m.v : field.value);
        });
      } else if (opt.type === 'range' || (opt.min != null && opt.max != null)) {
        field = h('input', { type: 'range', id: id, min: String(opt.min != null ? opt.min : 0),
          max: String(opt.max != null ? opt.max : 100), step: String(opt.step || 1), value: String(val) });
        var read = h('span', { class: 'wfc-val', text: String(val) + (opt.suffix || '') });
        field.addEventListener('input', function () { read.textContent = field.value + (opt.suffix || ''); onChange(Number(field.value)); });
        return h('label', { class: 'wfc-opt', for: id }, [h('span', { class: 'wfc-opt-l', text: opt.label || opt.k }), field, read]);
      } else if (opt.type === 'checkbox' || typeof opt.def === 'boolean') {
        field = h('input', { type: 'checkbox', id: id });
        field.checked = !!val;
        field.addEventListener('change', function () { onChange(field.checked); });
      } else {
        field = h('input', { type: 'text', class: 'field', id: id, value: String(val == null ? '' : val) });
        field.addEventListener('input', function () { onChange(field.value); });
      }
      return h('label', { class: 'wfc-opt', for: id }, [h('span', { class: 'wfc-opt-l', text: opt.label || opt.k }), field]);
    }

    function drawPanel() {
      panel.innerHTML = '';
      var n = sel && byUid(sel);
      if (!n || sel === 'in') {
        /* Templates first, help second. Somebody who has just landed wants to
           see what this is FOR before they are told how to operate it. */
        var temps = templatesFor(D, startKind());
        if (temps.length) {
          panel.appendChild(h('h3', { class: 'wfc-h', text: nodes.length ? 'Start over from a template' : 'Start from a template' }));
          var tl = h('div', { class: 'wfc-temps' });
          temps.forEach(function (t) {
            var b2 = h('button', { class: 'wfc-temp', type: 'button' }, [
              h('strong', { text: t.name }),
              h('span', { text: t.why }),
              h('em', { text: t.steps.map(function (id) { return (D.names && D.names[id]) || id; }).join('  →  ') })
            ]);
            b2.addEventListener('click', function () { applyTemplate(t); });
            tl.appendChild(b2);
          });
          panel.appendChild(tl);
        }
        panel.appendChild(h('h3', { class: 'wfc-h', text: 'Or build your own' }));
        panel.appendChild(h('ol', { class: 'wfc-steps-help' }, [
          h('li', { text: 'Choose your files.' }),
          h('li', { text: 'Drag a tool from the left onto the canvas.' }),
          h('li', { text: 'Drag from a node’s right-hand dot to another node to connect them.' }),
          h('li', { text: 'Click a node to change its settings, then run.' })
        ]));
        panel.appendChild(h('p', { class: 'note', text: 'Click a connection to delete it. Select a node and press Delete to remove it. Ctrl+Z undoes.' }));
        return;
      }
      var spec = specFor(n.id);
      panel.appendChild(h('h3', { class: 'wfc-h', text: (D.names && D.names[n.id]) || n.id }));
      panel.appendChild(h('div', { class: 'wfc-panacts' }, [
        h('button', { class: 'btn btn-sm', type: 'button', text: 'Disconnect',
          onclick: function () { links = links.filter(function (l) { return l.to !== n.uid; }); draw(); } }),
        h('button', { class: 'btn btn-sm', type: 'button', text: 'Delete node',
          onclick: function () { removeNode(n.uid); } })
      ]));
      var opts = (spec && spec.options) || [];
      if (!opts.length) panel.appendChild(h('p', { class: 'note', text: 'This step has no settings — it does one thing.' }));
      else {
        var wrap = h('div', { class: 'wfc-opts' });
        opts.forEach(function (opt) {
          if (n.opts[opt.k] === undefined) n.opts[opt.k] = opt.def;
          wrap.appendChild(optionField(opt, n.opts[opt.k], function (v) { n.opts[opt.k] = v; draw(); }));
        });
        panel.appendChild(wrap);
      }
    }

    /* --- panning ---------------------------------------------------------- */
    (function () {
      var px, py, ox, oy, panning = false;
      canvas.addEventListener('pointerdown', function (e) {
        if (linking) return;
        if (e.target !== canvas && e.target !== pan && e.target !== edges && e.target !== hint) return;
        panning = true; px = e.clientX; py = e.clientY; ox = view.x; oy = view.y;
        canvas.classList.add('is-pan');
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
      var picked = [].slice.call(input.files), kinds = {};
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
        savedSel.appendChild(h('option', { value: String(i), text: wf.name + ' (' + (wf.nodes || wf.steps || []).length + ')' }));
      });
    }
    savedSel.addEventListener('change', function () {
      if (savedSel.value === '') return;
      var wf = load()[+savedSel.value];
      if (!wf) return;
      /* Saved graphs carry their links. A workflow saved before links existed
         is a straight chain, so it is rebuilt as one rather than discarded. */
      if (wf.nodes && wf.links) {
        nodes = wf.nodes.map(function (n) { return { uid: n.uid, id: n.id, opts: Object.assign({}, n.opts), x: n.x, y: n.y }; });
        links = wf.links.slice();
        uidN = nodes.length;
      } else {
        nodes = (wf.steps || []).map(function (s2, i) {
          return { uid: 'n' + (i + 1), id: s2.id, opts: Object.assign({}, s2.opts), x: 240 + i * 210, y: IN_Y };
        });
        links = nodes.map(function (n, i) { return { from: i === 0 ? 'in' : nodes[i - 1].uid, to: n.uid }; });
        uidN = nodes.length;
      }
      sel = null; draw(); fit();
    });
    saveBtn.addEventListener('click', function () {
      var name = (root.prompt && root.prompt('Name this workflow', describe(D, nodes))) || '';
      name = String(name).trim().slice(0, 60);
      if (!name) return;
      var l = load();
      l.unshift({ name: name, nodes: nodes, links: links });
      if (!save(l)) { log.textContent = 'Could not save — private browsing blocks it. The workflow still runs.'; return; }
      refreshSaved();
    });

    runBtn.addEventListener('click', async function () {
      /* No plan check here. The editor only exists for Pro accounts — mount()
         decides that before any of this is built, so a second check would be
         a second thing to keep in step. */
      var paths = pathsFrom(nodes, links, 'in');
      if (!paths.length) { log.innerHTML = ''; log.appendChild(h('p', { class: 'note err', text: 'Nothing is connected to your files yet — drag from the input node to a step.' })); return; }
      var bad = null;
      paths.forEach(function (p) {
        var v = validate(D, p.map(function (n) { return n.id; }), startKind());
        if (!v.ok && !bad) bad = v.why;
      });
      if (bad) { log.innerHTML = ''; log.appendChild(h('p', { class: 'note err', text: bad })); return; }

      await execute(paths, null);
    });

    /* Pulled out of the click handler so a retry can call it again with a
       checkpoint instead of duplicating the whole run loop. */
    async function execute(paths, resume) {
      runBtn.disabled = true; saveBtn.disabled = true;
      cancelBtn.hidden = false; cancelBtn.disabled = false; cancelBtn.textContent = 'Cancel';
      log.innerHTML = '';
      [].forEach.call(pan.querySelectorAll('.wfc-node.is-step'), function (n) { n.classList.remove('is-run', 'is-done', 'is-fail'); });
      var results = [];
      var ctl = { cancelled: false };
      cancelBtn.onclick = function () {
        ctl.cancelled = true;
        cancelBtn.disabled = true;
        cancelBtn.textContent = 'Cancelling…';
        /* Honest about granularity: the step already running cannot be
           interrupted, so this stops the NEXT one starting. Saying "cancelled"
           the instant it is clicked would be a lie for as long as an encode
           takes. */
        log.appendChild(h('p', { class: 'wfc-line', text: 'Cancelling — the step already running will finish first.' }));
      };

      for (var pi = 0; pi < paths.length; pi++) {
        if (ctl.cancelled) break;
        var path = paths[pi];
        for (var fi = 0; fi < files.length; fi++) {
          if (ctl.cancelled) break;
          var line = h('p', { class: 'wfc-line', text: files[fi].name + (paths.length > 1 ? ' · route ' + (pi + 1) : '') + ' — starting' });
          log.appendChild(line);
          /* eslint-disable no-loop-func */
          var startFile = (resume && resume.pi === pi && resume.fi === fi) ? resume.file : files[fi];
          ctl.from = (resume && resume.pi === pi && resume.fi === fi) ? resume.next : 0;
          var res = await run(startFile, path, (function (ln, pth) {
            return function (i, state, detail) {
              var el3 = pan.querySelector('.wfc-node[data-uid="' + pth[i].uid + '"]');
              var nm = (D.names && D.names[pth[i].id]) || pth[i].id;
              var head = ln.textContent.split(' — ')[0];
              if (state === 'run') { if (el3) { el3.classList.remove('is-done', 'is-fail'); el3.classList.add('is-run'); } ln.textContent = head + ' — ' + nm; }
              else if (state === 'progress' && typeof detail === 'number' && el3) el3.style.setProperty('--wfp', Math.round(detail * 100) + '%');
              else if (state === 'status' && detail) ln.textContent = head + ' — ' + nm + ': ' + detail;
              else if (state === 'done' && el3) { el3.classList.remove('is-run'); el3.classList.add('is-done'); }
              else if (state === 'fail') { if (el3) { el3.classList.remove('is-run'); el3.classList.add('is-fail'); } ln.className = 'wfc-line is-err'; ln.textContent = head + ' — ' + nm + ': ' + detail; }
            };
          })(line, path));
          /* eslint-enable no-loop-func */
          var head2 = line.textContent.split(' — ')[0];
          if (res.cancelled) { line.textContent = head2 + ' — cancelled'; }
          else if (res.file) {
            results.push(res.file);
            line.textContent = head2 + (res.ok ? ' — done' : ' — stopped at step ' + (res.at + 1) + ', partial result kept');
          }
          /* A failure that is worth retrying gets a button that resumes from
             the step that failed, using the last good output — not a rerun. */
          if (!res.ok && !res.cancelled) {
            var stepName = (D.names && D.names[path[res.at].id]) || path[res.at].id;
            var adv = failureAdvice(stepName, res.error);
            var msg = h('p', { class: 'wfc-line is-err', text: adv.text });
            log.appendChild(msg);
            if (adv.retry && res.file) {
              var rb = h('button', { class: 'btn btn-sm', type: 'button', text: 'Retry from ' + stepName });
              (function (pi2, fi2, at, f) {
                rb.addEventListener('click', function () {
                  execute(paths, { pi: pi2, fi: fi2, next: at, file: new File([f.blob], f.name, { type: f.blob.type || '' }) });
                });
              })(pi, fi, res.at, res.file);
              log.appendChild(rb);
            }
          }
        }
      }

      runBtn.disabled = false; saveBtn.disabled = false;
      cancelBtn.hidden = true;
      if (ctl.cancelled) {
        log.appendChild(h('p', { class: 'note', text: 'Cancelled. Anything already finished is below; your originals are untouched.' }));
      }
      if (!results.length) { log.appendChild(h('p', { class: 'note err', text: 'Nothing came out. Your originals are untouched and nothing was uploaded.' })); return; }
      log.appendChild(h('p', { class: 'note', text: results.length + ' file(s) produced from ' + files.length + ' input(s) over ' + paths.length + ' route(s).' }));
      results.forEach(function (r, i) {
        var b = h('button', { class: 'btn btn-sm' + (i === 0 ? ' btn-primary' : ''), type: 'button', text: 'Download ' + r.name });
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
    }

    host.appendChild(bar);
    host.appendChild(stage);
    host.appendChild(log);
    drawPalette();
    refreshSaved();
    setZoom(1);
    draw();
  }

  /* A default name that describes the chain, so a saved workflow is
     recognisable without being named by hand. */
  function describe(D, steps) {
    var names = (D || {}).names || {};
    return (steps || []).map(function (s) { return names[s.id] || s.id; }).join(' \u2192 ');
  }

  root.VKWorkflow = {
    mount: mount,
    lockedView: lockedView,
    classifyError: classifyError,
    failureAdvice: failureAdvice,
    TEMPLATES: TEMPLATES,
    templatesFor: templatesFor,
    isPro: isPro,
    pathsFrom: pathsFrom,
    wouldCycle: wouldCycle,
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
