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

  function mount(host) {
    if (!host) return;
    var D = root.VK_FLOW;
    if (!D) { host.textContent = 'Workflows are unavailable right now.'; return; }

    var files = [];          // a workflow runs over MANY files, not one
    var steps = [];          // [{id, opts:{}}]

    var input = h('input', { type: 'file', multiple: 'multiple', class: 'sr-only', id: 'wf-file' });
    var drop = h('button', { class: 'drop', type: 'button', onclick: function () { input.click(); } }, [
      h('strong', { text: 'Choose the files to run through' }),
      h('small', { text: 'Several at once — every one goes through every step, on your device' })
    ]);
    var fileNote = h('p', { class: 'note', id: 'wf-file-note' });
    var list = h('ol', { class: 'wf-steps' });
    var addWrap = h('div', { class: 'wf-add' });
    var savedWrap = h('div', { class: 'wf-saved' });
    var runBtn = h('button', { class: 'btn btn-primary', type: 'button', text: 'Run workflow', disabled: 'disabled' });
    var saveBtn = h('button', { class: 'btn', type: 'button', text: 'Save this workflow', disabled: 'disabled' });
    var out = h('div', { class: 'wf-out', 'aria-live': 'polite' });

    function startKind() { return files.length ? kindOfFile(files[0].name, files[0].type) : ''; }

    /* ---- per-step settings -------------------------------------------------
     * Every tool already declares its controls as data — {k, label, type, def}
     * — because filetool.js builds a tool page's options from exactly this. So
     * the workflow can render the real controls for each step rather than
     * running everything on defaults, and it stays correct as tools change
     * their options, because there is no second copy of them here. */
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
          var raw = field.value;
          var match = (opt.options || []).filter(function (o) { return String(o.v) === raw; })[0];
          onChange(match ? match.v : raw);
        });
      } else if (opt.type === 'range' || (opt.min != null && opt.max != null)) {
        field = h('input', {
          type: 'range', class: 'wf-range', id: id,
          min: String(opt.min != null ? opt.min : 0),
          max: String(opt.max != null ? opt.max : 100),
          step: String(opt.step || 1), value: String(val)
        });
        var read = h('span', { class: 'wf-val', text: String(val) + (opt.suffix || '') });
        field.addEventListener('input', function () {
          read.textContent = field.value + (opt.suffix || '');
          onChange(Number(field.value));
        });
        return h('label', { class: 'wf-opt', for: id }, [
          h('span', { class: 'wf-opt-l', text: opt.label || opt.k }), field, read
        ]);
      } else if (opt.type === 'checkbox' || typeof opt.def === 'boolean') {
        field = h('input', { type: 'checkbox', id: id });
        field.checked = !!val;
        field.addEventListener('change', function () { onChange(field.checked); });
      } else {
        field = h('input', { type: 'text', class: 'field', id: id, value: String(val == null ? '' : val) });
        field.addEventListener('input', function () { onChange(field.value); });
      }
      return h('label', { class: 'wf-opt', for: id }, [
        h('span', { class: 'wf-opt-l', text: opt.label || opt.k }), field
      ]);
    }

    function move(i, by) {
      var j = i + by;
      if (j < 0 || j >= steps.length) return;
      var t = steps[i]; steps[i] = steps[j]; steps[j] = t;
      redraw();
    }

    function redraw() {
      list.innerHTML = '';
      var k = startKind();
      steps.forEach(function (st, i) {
        var nm = (D.names && D.names[st.id]) || st.id;
        var bad = !kindAccepted((D.flow[st.id] || {}).a, k);
        var spec = specFor(st.id);
        var body = h('div', { class: 'wf-body' }, [
          h('div', { class: 'wf-head' }, [
            h('span', { class: 'wf-n', text: String(i + 1) }),
            h('span', { class: 'wf-name', text: nm }),
            bad ? h('span', { class: 'wf-warn', text: 'cannot take the file at this point' }) : null,
            h('div', { class: 'wf-acts' }, [
              h('button', { class: 'btn btn-sm', type: 'button', text: '\u2191',
                'aria-label': 'Move ' + nm + ' earlier', disabled: i === 0 ? 'disabled' : null,
                onclick: function () { move(i, -1); } }),
              h('button', { class: 'btn btn-sm', type: 'button', text: '\u2193',
                'aria-label': 'Move ' + nm + ' later', disabled: i === steps.length - 1 ? 'disabled' : null,
                onclick: function () { move(i, 1); } }),
              h('button', { class: 'btn btn-sm', type: 'button', text: 'Remove',
                'aria-label': 'Remove ' + nm,
                onclick: function () { steps.splice(i, 1); redraw(); } })
            ])
          ])
        ]);
        var opts = (spec && spec.options) || [];
        if (opts.length) {
          var grid = h('div', { class: 'wf-opts' });
          opts.forEach(function (opt) {
            if (st.opts[opt.k] === undefined) st.opts[opt.k] = opt.def;
            grid.appendChild(optionField(opt, st.opts[opt.k], function (v) { st.opts[opt.k] = v; }));
          });
          body.appendChild(grid);
        } else {
          body.appendChild(h('p', { class: 'wf-noopt', text: 'No settings — this step does one thing.' }));
        }
        list.appendChild(h('li', { class: 'wf-step' + (bad ? ' is-bad' : '') }, [body]));
        k = outputOf(D.flow, st.id, k);
      });

      addWrap.innerHTML = '';
      var choices = stepChoices(D, k || '', steps.length ? steps[steps.length - 1].id : null);
      if (!files.length) {
        addWrap.appendChild(h('p', { class: 'note', text: 'Choose your files first — which steps are possible depends on what they are.' }));
      } else if (!choices.length) {
        addWrap.appendChild(h('p', { class: 'note', text: 'Nothing further can be done to the file at this point.' }));
      } else {
        var sel = h('select', { class: 'field', 'aria-label': 'Add a step' });
        choices.forEach(function (c) { sel.appendChild(h('option', { value: c.id, text: c.name })); });
        addWrap.appendChild(sel);
        addWrap.appendChild(h('button', { class: 'btn', type: 'button', text: 'Add step',
          onclick: function () { steps.push({ id: sel.value, opts: {} }); redraw(); } }));
      }
      runBtn.disabled = !(files.length && steps.length);
      saveBtn.disabled = !steps.length;
      runBtn.textContent = files.length > 1
        ? 'Run on ' + files.length + ' files'
        : 'Run workflow';
      out.innerHTML = '';
      drawSaved();
    }

    /* ---- saved workflows ---------------------------------------------------
     * The settings travel with the steps. A saved workflow that forgot its
     * options would be a list of tool names, which is a note, not a workflow. */
    function drawSaved() {
      savedWrap.innerHTML = '';
      var list2 = load();
      if (!list2.length) return;
      savedWrap.appendChild(h('h2', { class: 'wf-h', text: 'Saved workflows' }));
      var ul = h('ul', { class: 'wf-savedlist' });
      list2.forEach(function (wf, i) {
        ul.appendChild(h('li', {}, [
          h('button', {
            class: 'btn btn-sm', type: 'button',
            text: wf.name + '  (' + wf.steps.length + ' steps)',
            onclick: function () {
              steps = wf.steps.map(function (s2) { return { id: s2.id, opts: Object.assign({}, s2.opts) }; });
              redraw();
            }
          }),
          h('button', {
            class: 'btn btn-sm btn-ghost', type: 'button', text: 'Delete',
            'aria-label': 'Delete ' + wf.name,
            onclick: function () { var l = load(); l.splice(i, 1); save(l); drawSaved(); }
          })
        ]));
      });
      savedWrap.appendChild(ul);
    }

    saveBtn.addEventListener('click', function () {
      var name = (root.prompt && root.prompt('Name this workflow', describe(D, steps))) || '';
      name = String(name).trim().slice(0, 60);
      if (!name) return;
      var l = load();
      l.unshift({ name: name, steps: steps.map(function (s2) { return { id: s2.id, opts: s2.opts }; }) });
      if (!save(l)) {
        out.appendChild(h('p', { class: 'note err', text: 'Could not save — private browsing blocks it. The workflow still runs.' }));
        return;
      }
      drawSaved();
    });

    input.addEventListener('change', function () {
      if (!input.files || !input.files.length) return;
      files = [].slice.call(input.files);
      var kinds = {};
      files.forEach(function (f) { kinds[kindOfFile(f.name, f.type)] = 1; });
      var ks = Object.keys(kinds).filter(Boolean);
      if (ks.length > 1) {
        fileNote.className = 'note err';
        fileNote.textContent = 'Those are ' + ks.join(' and ') + ' files. A workflow runs one kind at a time, so the steps would not apply to all of them — choose one kind.';
        files = [];
        steps = [];
        redraw();
        return;
      }
      fileNote.className = 'note';
      fileNote.textContent = files.length === 1
        ? files[0].name + ' — ' + (ks[0] || 'unsupported here')
        : files.length + ' ' + (ks[0] || 'unsupported') + ' files';
      redraw();
    });

    runBtn.addEventListener('click', async function () {
      var v = validate(D, steps.map(function (s2) { return s2.id; }), startKind());
      if (!v.ok) { out.innerHTML = ''; out.appendChild(h('p', { class: 'note err', text: v.why })); return; }
      runBtn.disabled = true; saveBtn.disabled = true;
      out.innerHTML = '';
      var results = [];
      var table = h('ol', { class: 'wf-runs' });
      out.appendChild(table);

      for (var fi = 0; fi < files.length; fi++) {
        var rowHead = h('li', { class: 'wf-run is-file' }, [
          h('span', { class: 'wf-name', text: files[fi].name }),
          h('span', { class: 'wf-state', text: 'queued' })
        ]);
        table.appendChild(rowHead);
        var stateCell = rowHead.querySelector('.wf-state');
        /* eslint-disable no-loop-func */
        var res = await run(files[fi], steps, (function (cell) {
          return function (i, state, detail) {
            var nm = (D.names && D.names[steps[i].id]) || steps[i].id;
            if (state === 'run') cell.textContent = 'step ' + (i + 1) + ' of ' + steps.length + ' — ' + nm;
            else if (state === 'progress' && typeof detail === 'number') {
              cell.textContent = 'step ' + (i + 1) + ' of ' + steps.length + ' — ' + nm + ' ' + Math.round(detail * 100) + '%';
            } else if (state === 'status' && detail) cell.textContent = nm + ': ' + detail;
            else if (state === 'fail') cell.textContent = nm + ' — ' + detail;
          };
        })(stateCell));
        /* eslint-enable no-loop-func */
        if (res.file) {
          results.push(res.file);
          rowHead.className = 'wf-run is-file ' + (res.ok ? 'is-done' : 'is-part');
          stateCell.textContent = res.ok
            ? 'done'
            : 'stopped at step ' + (res.at + 1) + ' — partial result kept';
        } else {
          rowHead.className = 'wf-run is-file is-fail';
        }
      }

      runBtn.disabled = false; saveBtn.disabled = false;
      if (!results.length) {
        out.appendChild(h('p', { class: 'note err', text: 'Nothing came out. Your original files are untouched and nothing was uploaded.' }));
        return;
      }
      out.appendChild(h('p', { class: 'note',
        text: results.length + ' of ' + files.length + ' file' + (files.length === 1 ? '' : 's') + ' came through ' + steps.length + ' step' + (steps.length === 1 ? '' : 's') + '.' }));

      /* One button per result rather than a zip: writing a zip in the browser
         needs a library nobody has downloaded yet, and on a two-file run that
         is a worse trade than two clicks. */
      results.forEach(function (r, i) {
        var b = h('button', { class: 'btn' + (i === 0 ? ' btn-primary' : ''), type: 'button', text: 'Download ' + r.name });
        b.addEventListener('click', function () {
          if (root.VKDeliver && root.VKDeliver.deliver) {
            root.VKDeliver.deliver(r.blob, r.name, { toolId: 'workflow', host: out });
          } else {
            var u = URL.createObjectURL(r.blob);
            var a = doc.createElement('a'); a.href = u; a.download = r.name; a.click();
            setTimeout(function () { URL.revokeObjectURL(u); }, 1500);
          }
        });
        out.appendChild(b);
      });
    });

    host.appendChild(drop);
    host.appendChild(input);
    host.appendChild(fileNote);
    host.appendChild(h('h2', { class: 'wf-h', text: 'Steps' }));
    host.appendChild(list);
    host.appendChild(addWrap);
    host.appendChild(h('div', { class: 'wf-go' }, [runBtn, saveBtn]));
    host.appendChild(savedWrap);
    host.appendChild(out);
    redraw();
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
