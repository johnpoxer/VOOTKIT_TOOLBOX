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
      var id = steps[i];
      var spec = specFor(id);
      if (!spec) {
        onStep(i, 'fail', 'That tool is not loaded on this page.');
        return { ok: false, at: i, file: produced };
      }
      onStep(i, 'run', '');
      try {
        var out = await spec.process([current], defaults(spec), {
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

    var file = null;
    var steps = [];

    var input = h('input', { type: 'file', class: 'sr-only', id: 'wf-file' });
    var drop = h('button', { class: 'drop', type: 'button', onclick: function () { input.click(); } }, [
      h('strong', { text: 'Choose the file to start with' }),
      h('small', { text: 'Everything runs on your device — nothing is uploaded' })
    ]);
    var fileNote = h('p', { class: 'note', id: 'wf-file-note' });
    var list = h('ol', { class: 'wf-steps' });
    var addWrap = h('div', { class: 'wf-add' });
    var runBtn = h('button', { class: 'btn btn-primary', type: 'button', text: 'Run workflow', disabled: 'disabled' });
    var out = h('div', { class: 'wf-out', 'aria-live': 'polite' });

    function currentKind() {
      var k = file ? kindOfFile(file.name, file.type) : '';
      for (var i = 0; i < steps.length; i++) k = outputOf(D.flow, steps[i], k);
      return k;
    }

    function redraw() {
      list.innerHTML = '';
      var k = file ? kindOfFile(file.name, file.type) : '';
      steps.forEach(function (id, i) {
        var nm = (D.names && D.names[id]) || id;
        var bad = !kindAccepted((D.flow[id] || {}).a, k);
        list.appendChild(h('li', { class: 'wf-step' + (bad ? ' is-bad' : ''), 'data-i': i }, [
          h('span', { class: 'wf-n', text: String(i + 1) }),
          h('span', { class: 'wf-name', text: nm }),
          bad ? h('span', { class: 'wf-warn', text: 'cannot take the file at this point' }) : null,
          h('button', {
            class: 'btn btn-sm', type: 'button', text: 'Remove',
            'aria-label': 'Remove step ' + (i + 1) + ', ' + nm,
            onclick: function () { steps.splice(i, 1); redraw(); }
          })
        ]));
        k = outputOf(D.flow, id, k);
      });

      addWrap.innerHTML = '';
      var choices = stepChoices(D, k || 'pdf', steps[steps.length - 1]);
      if (!file) {
        addWrap.appendChild(h('p', { class: 'note', text: 'Choose a file first — the steps on offer depend on what it is.' }));
      } else if (!choices.length) {
        addWrap.appendChild(h('p', { class: 'note', text: 'Nothing else can be done to the file at this point. Run the workflow to get it.' }));
      } else {
        var sel = h('select', { class: 'field', 'aria-label': 'Add a step' });
        choices.forEach(function (c) { sel.appendChild(h('option', { value: c.id, text: c.name })); });
        addWrap.appendChild(sel);
        addWrap.appendChild(h('button', {
          class: 'btn', type: 'button', text: 'Add step',
          onclick: function () { steps.push(sel.value); redraw(); }
        }));
      }
      runBtn.disabled = !(file && steps.length);
      out.innerHTML = '';
    }

    input.addEventListener('change', function () {
      if (!input.files || !input.files[0]) return;
      file = input.files[0];
      var kind = kindOfFile(file.name, file.type);
      fileNote.textContent = kind
        ? file.name + ' — ' + kind
        : file.name + ' — this kind of file has no workflow steps yet.';
      steps = [];
      redraw();
    });

    runBtn.addEventListener('click', async function () {
      var v = validate(D, steps, kindOfFile(file.name, file.type));
      if (!v.ok) { out.innerHTML = ''; out.appendChild(h('p', { class: 'note err', text: v.why })); return; }
      runBtn.disabled = true;
      out.innerHTML = '';
      var rows = steps.map(function (id, i) {
        var r = h('li', { class: 'wf-run' }, [
          h('span', { class: 'wf-n', text: String(i + 1) }),
          h('span', { class: 'wf-name', text: (D.names && D.names[id]) || id }),
          h('span', { class: 'wf-state', text: 'waiting' })
        ]);
        return r;
      });
      var ol = h('ol', { class: 'wf-runs' }, rows);
      out.appendChild(ol);

      var res = await run(file, steps, function (i, state, detail) {
        var cell = rows[i].querySelector('.wf-state');
        if (state === 'run') { rows[i].className = 'wf-run is-run'; cell.textContent = 'working…'; }
        else if (state === 'status' && detail) cell.textContent = String(detail);
        else if (state === 'progress' && typeof detail === 'number') cell.textContent = Math.round(detail * 100) + '%';
        else if (state === 'done') { rows[i].className = 'wf-run is-done'; cell.textContent = 'done'; }
        else if (state === 'fail') { rows[i].className = 'wf-run is-fail'; cell.textContent = String(detail || 'failed'); }
      });

      runBtn.disabled = false;
      if (!res.file) {
        out.appendChild(h('p', { class: 'note err', text: 'Nothing came out of the run. Nothing was uploaded and your original file is untouched.' }));
        return;
      }
      /* Even a failed chain hands back the last good output — losing three
         minutes of work because the final step had a bad setting would be
         unforgivable. */
      var msg = res.ok
        ? 'Finished. ' + steps.length + ' steps, one file.'
        : 'Stopped at step ' + (res.at + 1) + '. Here is the result of everything before it.';
      out.appendChild(h('p', { class: 'note', text: msg }));
      var dlBtn = h('button', { class: 'btn btn-primary', type: 'button', text: 'Download ' + res.file.name });
      dlBtn.addEventListener('click', function () {
        /* Through deliver.js, so the daily limit, the analytics and the run log
           all behave exactly as they do on a tool page. A workflow is not a
           side door around the funnel. */
        if (root.VKDeliver && root.VKDeliver.deliver) {
          root.VKDeliver.deliver(res.file.blob, res.file.name, { toolId: 'workflow', host: out });
        } else {
          var u = URL.createObjectURL(res.file.blob);
          var a = doc.createElement('a'); a.href = u; a.download = res.file.name; a.click();
          setTimeout(function () { URL.revokeObjectURL(u); }, 1500);
        }
      });
      out.appendChild(dlBtn);
    });

    host.appendChild(drop);
    host.appendChild(input);
    host.appendChild(fileNote);
    host.appendChild(h('h2', { class: 'wf-h', text: 'Steps' }));
    host.appendChild(list);
    host.appendChild(addWrap);
    host.appendChild(h('div', { class: 'wf-go' }, [runBtn]));
    host.appendChild(out);
    redraw();
  }

  root.VKWorkflow = {
    mount: mount,
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
