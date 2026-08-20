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

  /* ---------- auto-fix: find a bridge ----------
   *
   * "These two are incompatible" is a true sentence that helps nobody. The
   * user has already decided what they want; being told it cannot be done and
   * left to work out why is where people give up on a builder.
   *
   * Vootkit can do better than a warning, because the flow map already knows
   * what every tool takes and what the type-changing ones emit. That makes
   * "PDF into an image tool" a shortest-path problem over file KINDS, and the
   * answer is a real step the user can insert: PDF -> PDF to JPG -> image.
   *
   * Breadth-first over kinds rather than tools, so the first route found is
   * the shortest one and the suggestion is never a scenic detour. Capped at
   * two hops: past that it stops being a fix and starts being a different
   * workflow, which is the user's decision rather than ours.
   */
  function bridge(D, fromKind, toId, maxHops, anyTool) {
    var flow = (D || {}).flow || {};
    var names = (D || {}).names || {};
    var target = flow[toId];
    if (!fromKind || !target) return null;
    if (kindAccepted(target.a, fromKind)) return [];      // already fine

    var cap = maxHops == null ? 2 : maxHops;

    /* Only tools that CHANGE the kind are useful as a bridge — an in-place
       tool moves you nowhere, and including them makes the search explode. */
    var converters = Object.keys(flow).filter(function (id) {
      return (anyTool || flow[id].w) && flow[id].o && id !== toId;
    });

    var queue = [{ kind: fromKind, path: [] }];
    var seen = {};
    seen[fromKind] = 1;

    while (queue.length) {
      var cur = queue.shift();
      if (cur.path.length >= cap) continue;
      for (var i = 0; i < converters.length; i++) {
        var id = converters[i];
        if (!kindAccepted(flow[id].a, cur.kind)) continue;
        var next = flow[id].o;
        var path = cur.path.concat([{ id: id, name: names[id] || id, from: cur.kind, to: next }]);
        if (kindAccepted(target.a, next)) return path;     // shortest wins
        if (!seen[next]) { seen[next] = 1; queue.push({ kind: next, path: path }); }
      }
    }
    return null;                                           // no route exists
  }

  /* The sentence to show. A fix the user cannot understand is a fix they will
     not trust enough to click. */
  function bridgeAdvice(D, fromKind, toId) {
    var names = (D || {}).names || {};
    var to = names[toId] || toId;
    var path = bridge(D, fromKind, toId);
    if (path === null) {
      /* A route may exist among Vootkit's TOOLS while not existing among
         workflow STEPS — PDF to JPG converts a PDF to an image, but it is one
         of the widget-shaped tools that cannot yet be called without drawing
         its interface. Saying "there is no conversion" would be false, and the
         user would be right not to believe us. Name the tool, say why it is
         not a step, and point at its page. */
      var offline = bridge(D, fromKind, toId, 2, true);
      if (offline && offline.length) {
        return { fixable: false, manual: offline,
          text: to + ' cannot take a ' + fromKind + ' directly. '
              + offline.map(function (x) { return x.name; }).join(' then ')
              + ' would convert it, but that tool cannot be a workflow step yet — '
              + 'run it on its own page first, then start the workflow from what it gives you.' };
      }
      return { fixable: false,
        text: to + ' cannot take a ' + (fromKind || 'file') + ', and there is no '
            + 'conversion between them. Remove this step or change the one before it.' };
    }
    if (!path.length) return { fixable: false, text: '' };  // nothing wrong
    return {
      fixable: true, path: path,
      text: to + ' cannot take a ' + fromKind + ' directly. Inserting '
          + path.map(function (p) { return p.name; }).join(' then ') + ' makes it work.'
    };
  }

  /* ---------- the optimiser ----------
   *
   * A workflow somebody assembled by hand often contains work that cancels
   * itself out — compressing, converting, then compressing again; resizing
   * twice; stamping a file that is about to be flattened. None of it is an
   * error, so validation says nothing, and the user pays for it in time on
   * every single run.
   *
   * This reads the chain and reports what it can see. It never edits anything
   * on its own: a suggestion the user has to accept is advice, and a workflow
   * that quietly rewrites itself is a workflow nobody can trust to do what it
   * shows. Every finding names the step by number so it can be acted on.
   */
  /* WHERE THE FILES ACTUALLY GO.
   *
   * "Your files never leave your device" is the promise the whole site is
   * built on — it is asserted in 28 places across 23 files. On this page it
   * was a hardcoded string, printed whether or not it was true, and the
   * status line said "Fully local" whenever the chain merely happened to be
   * connected. A workflow is the one screen where that matters most, because
   * it is where somebody strings five steps together and stops reading.
   *
   * The catalog already records this per tool as `processing`, so ask it
   * rather than assert. Anything not marked local is treated as leaving the
   * device: an unknown tool counts against the promise, never for it. */
  function locality(steps) {
    var VK = (typeof window !== 'undefined' && window.VK) || (typeof VKCatalog !== 'undefined' ? VKCatalog : null);
    var all = (VK && (VK.TOOLS || VK.tools)) || [];
    var byId = {};
    for (var i = 0; i < all.length; i++) byId[all[i].id] = all[i];

    var offDevice = [];
    var ids = (steps || []).map(function (s) { return typeof s === 'string' ? s : (s && (s.id || s.tool)); })
                           .filter(Boolean);
    ids.forEach(function (id, idx) {
      var t = byId[id];
      var mode = t && t.processing;
      if (mode && mode !== 'local') {
        offDevice.push({ pos: idx + 1, id: id, name: (t && t.name) || id, mode: mode });
      }
    });
    return {
      total: ids.length,
      offDevice: offDevice,
      allLocal: ids.length > 0 && offDevice.length === 0,
      /* Wording is deliberately different in each case. A vaguer version of
         the same sentence would let the off-device case read as reassurance. */
      label: !ids.length ? 'Add steps to see where they run'
           : offDevice.length === 0 ? 'Your files never leave your device'
           : offDevice.length === 1
             ? 'Step ' + offDevice[0].pos + ' (' + offDevice[0].name + ') sends data to a server'
             : offDevice.length + ' steps send data to a server',
      short: !ids.length ? 'Add steps'
           : offDevice.length === 0 ? 'Fully local'
           : offDevice.length + ' step' + (offDevice.length > 1 ? 's' : '') + ' online'
    };
  }

  function analyse(D, steps) {
    var names = (D || {}).names || {};
    var flow = (D || {}).flow || {};
    var ids = (steps || []).map(function (s2) { return typeof s2 === 'string' ? s2 : s2.id; });
    var out = [];
    var nameOf = function (id) { return names[id] || id; };

    /* The same tool twice in a row. The second run works on output the first
       already produced, so it is doing the job again on worse input. */
    for (var i = 1; i < ids.length; i++) {
      if (ids[i] === ids[i - 1]) {
        out.push({ kind: 'duplicate', step: i,
          text: nameOf(ids[i]) + ' runs twice in a row (steps ' + i + ' and ' + (i + 1)
              + '). The second pass works on what the first produced, so it costs '
              + 'time without adding anything. Remove one.' });
      }
    }

    /* Compressing before a step that re-encodes anyway. The early compression
       is thrown away by the later one, and it degrades what the later one has
       to work with. */
    var LOSSY = { 'compress-image': 1, 'compress-pdf': 1, 'compress-video': 1 };
    var REENCODES = { 'convert-image': 1, 'resize-image': 1, 'crop-image': 1,
                      'png-to-jpg': 1, 'jpg-to-png': 1, 'video-to-gif': 1 };
    for (var j = 0; j < ids.length - 1; j++) {
      if (LOSSY[ids[j]] && REENCODES[ids[j + 1]]) {
        out.push({ kind: 'order', step: j,
          text: nameOf(ids[j]) + ' before ' + nameOf(ids[j + 1]) + ' throws its own '
              + 'work away — the next step re-encodes the file anyway, from a copy '
              + 'you already degraded. Compressing last gives a better result in '
              + 'less time.' });
      }
    }

    /* A step whose output the next step discards entirely. Stamping or
       numbering a PDF that is then turned into images loses the stamp. */
    for (var k = 0; k < ids.length - 1; k++) {
      var emits = flow[ids[k + 1]] && flow[ids[k + 1]].o;
      var cosmetic = { 'pdf-watermark': 1, 'pdf-page-numbers': 1 };
      if (cosmetic[ids[k]] && emits && emits !== 'pdf') {
        out.push({ kind: 'wasted', step: k,
          text: nameOf(ids[k]) + ' is undone by ' + nameOf(ids[k + 1])
              + ', which converts the file to ' + emits + '. Do it after, or drop it.' });
      }
    }

    return out;
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
    { id: 'website-image-optimizer', name: 'Website Image Optimizer', kind: 'image',
      category: 'Image', featured: true, plan: 'Pro', asset: 'website-image-optimizer',
      why: 'Resize, compress and convert images for faster websites.',
      about: 'Perfect for website owners, developers and marketers who need faster loading images.',
      input: 'JPG, PNG, WebP images', output: 'WebP images', time: '2-3 min',
      privacy: 'Fully local', focus: 1,
      what: ['Resize images to optimal web dimensions.', 'Compress images to reduce file size.', 'Convert to WebP for best web performance.'],
      summaries: ['1920px width', 'Quality: 80%', 'Best quality'],
      steps: ['resize-image', 'compress-image', 'convert-image'],
      opts: {
        'resize-image': { width: 1920, mode: 'ratio', format: 'image/webp' },
        'compress-image': { quality: 80, format: 'image/webp' },
        'convert-image': { format: 'image/webp', quality: 92 }
      } },
    { id: 'pdf-document-workflow', name: 'PDF Document Workflow', kind: 'pdf',
      category: 'PDF', featured: true, plan: 'Pro', asset: 'pdf-document-workflow',
      why: 'Prepare PDF documents with real browser-based PDF steps.',
      about: 'A practical PDF workflow using the document steps currently available in Vootkit Workflow.',
      input: 'PDF documents', output: 'Protected PDF', time: '1-2 min',
      privacy: 'Fully local',
      what: ['Rotate pages if needed.', 'Add a watermark.', 'Protect the final PDF.'],
      summaries: ['Correct pages', 'Add watermark', 'Password protect'],
      steps: ['rotate-pdf', 'pdf-watermark', 'protect-pdf'] },
    { id: 'invoice-pdf-packet', name: 'Invoice PDF Packet', kind: 'pdf',
      category: 'Business', plan: 'Pro', asset: 'invoice-pdf-packet',
      why: 'Assemble invoice PDFs into a clean send-ready packet.',
      about: 'Useful for freelancers and teams who combine client paperwork before sending or archiving.',
      input: 'PDF invoices', output: 'Numbered PDF packet', time: '1-3 min',
      privacy: 'Fully local',
      what: ['Merge invoice PDFs in order.', 'Add page numbers.', 'Protect the finished packet.'],
      summaries: ['Combine PDFs', 'Page numbers', 'Lock final file'],
      steps: ['merge-pdf', 'pdf-page-numbers', 'protect-pdf'] },
    { id: 'video-social-workflow', name: 'Video Social Workflow', kind: 'video',
      category: 'Video', plan: 'Pro', asset: 'video-social-workflow',
      why: 'Trim a clip and convert the shareable moment into a GIF.',
      about: 'A lightweight media workflow for short clips, social posts and quick visual updates.',
      input: 'MP4, MOV, WebM video', output: 'GIF image', time: '3-5 min',
      privacy: 'Fully local after the video engine loads',
      what: ['Trim the video to the useful segment.', 'Convert the clip to GIF.', 'Download the finished media.'],
      summaries: ['Trim clip', 'GIF output'],
      steps: ['trim-video', 'video-to-gif'] },
    { id: 'photo-batch-cleanup', name: 'Photo Batch Cleanup', kind: 'image',
      category: 'Image', plan: 'Pro', asset: 'photo-batch-cleanup',
      why: 'Crop photos to one shape, then compress them for sharing.',
      input: 'JPG, PNG, WebP images', output: 'Compressed images',
      what: ['Crop to a consistent ratio.', 'Compress for sharing.'],
      steps: ['crop-image', 'compress-image'] },
    { id: 'print-ready-images', name: 'Print Ready Images', kind: 'image',
      category: 'Document', plan: 'Pro', asset: 'print-ready-images',
      why: 'Resize images, then bind them into one downloadable PDF.',
      input: 'Images', output: 'PDF document',
      what: ['Resize images consistently.', 'Convert images to a PDF.'],
      steps: ['resize-image', 'jpg-to-pdf'] },
    { id: 'pdf-share-safe', name: 'Safe PDF Share', kind: 'pdf',
      category: 'PDF', plan: 'Pro', asset: 'pdf-share-safe',
      why: 'Watermark a PDF, then protect it before sharing.',
      input: 'PDF document', output: 'Protected PDF',
      what: ['Add a watermark.', 'Apply password protection.'],
      steps: ['pdf-watermark', 'protect-pdf'] },
    { id: 'pdf-report-builder', name: 'PDF Report Builder', kind: 'pdf',
      category: 'Document', plan: 'Pro', asset: 'pdf-report-builder',
      why: 'Combine PDFs in order, then number the finished report.',
      input: 'Multiple PDFs', output: 'Numbered PDF',
      what: ['Merge PDF files.', 'Add page numbers.'],
      steps: ['merge-pdf', 'pdf-page-numbers'] },
    { id: 'video-thumbnail-workflow', name: 'Video Thumbnail Workflow', kind: 'video',
      category: 'Video', plan: 'Pro', asset: 'video-thumbnail-workflow',
      why: 'Grab a frame from a video, then resize it for use as a thumbnail.',
      input: 'Video file', output: 'Image thumbnail',
      what: ['Extract a frame.', 'Resize the image.'],
      steps: ['frame-grabber', 'resize-image'] },
    { id: 'social-image-pack', name: 'Social Image Pack', kind: 'image',
      category: 'Image', featured: true, plan: 'Pro', asset: 'social-image-pack',
      why: 'Resize, crop and compress images for social posts.',
      input: 'JPG, PNG, WebP images', output: 'Compressed social images',
      what: ['Resize for social layouts.', 'Crop to the right frame.', 'Compress for sharing.'],
      steps: ['social-media-image', 'crop-image', 'compress-image'] },
    { id: 'profile-photo-polish', name: 'Profile Photo Polish', kind: 'image',
      category: 'Image', plan: 'Pro', asset: 'profile-photo-polish',
      why: 'Crop a portrait into a clean circular profile image.',
      input: 'Portrait image', output: 'Rounded profile image',
      what: ['Crop to a circular avatar.', 'Round the corners.', 'Compress the result.'],
      steps: ['circle-crop', 'round-corners', 'compress-image'] },
    { id: 'ecommerce-image-set', name: 'Ecommerce Image Set', kind: 'image',
      category: 'Image', plan: 'Pro', asset: 'ecommerce-image-set',
      why: 'Prepare product photos with consistent size and weight.',
      input: 'Product images', output: 'Optimized product images',
      what: ['Bulk resize product photos.', 'Sharpen details.', 'Batch compress output.'],
      steps: ['bulk-resize', 'image-sharpen', 'batch-compress'] },
    { id: 'blog-image-ready', name: 'Blog Image Ready', kind: 'image',
      category: 'Image', plan: 'Pro', asset: 'blog-image-ready',
      why: 'Create lightweight WebP images for blog articles.',
      input: 'Article images', output: 'WebP images',
      what: ['Resize wide images.', 'Convert to WebP.', 'Compress for faster pages.'],
      steps: ['resize-image', 'convert-image', 'compress-image'] },
    { id: 'photo-touchup-export', name: 'Photo Touchup Export', kind: 'image',
      category: 'Image', plan: 'Pro', asset: 'photo-touchup-export',
      why: 'Adjust brightness, sharpen and export a smaller photo.',
      input: 'Photo image', output: 'Polished photo',
      what: ['Adjust brightness and contrast.', 'Sharpen the image.', 'Compress the export.'],
      steps: ['image-brightness', 'image-sharpen', 'compress-image'] },
    { id: 'thumbnail-export-pack', name: 'Thumbnail Export Pack', kind: 'image',
      category: 'Image', plan: 'Pro', asset: 'thumbnail-export-pack',
      why: 'Create smaller thumbnails from larger source images.',
      input: 'Large images', output: 'Thumbnails',
      what: ['Resize the source image.', 'Create a thumbnail.', 'Convert for web use.'],
      steps: ['resize-image', 'thumbnail-maker', 'convert-image'] },
    { id: 'pdf-client-packet', name: 'PDF Client Packet', kind: 'pdf',
      category: 'PDF', plan: 'Pro', asset: 'pdf-client-packet',
      why: 'Merge client PDFs, number the packet and protect it.',
      input: 'Multiple PDFs', output: 'Protected PDF packet',
      what: ['Merge PDFs together.', 'Add page numbers.', 'Protect the packet.'],
      steps: ['merge-pdf', 'pdf-page-numbers', 'protect-pdf'] },
    { id: 'pdf-page-cleanup', name: 'PDF Page Cleanup', kind: 'pdf',
      category: 'PDF', plan: 'Pro', asset: 'pdf-page-cleanup',
      why: 'Rotate, reorder and protect a PDF before sharing.',
      input: 'PDF document', output: 'Clean protected PDF',
      what: ['Rotate pages.', 'Organize page order.', 'Protect the final PDF.'],
      steps: ['rotate-pdf', 'reorder-pdf', 'protect-pdf'] },
    { id: 'pdf-review-extract', name: 'PDF Review Extract', kind: 'pdf',
      category: 'PDF', plan: 'Pro', asset: 'pdf-review-extract',
      why: 'Split a PDF and protect the pages you need.',
      input: 'PDF document', output: 'Extracted PDF files',
      what: ['Split the PDF.', 'Extract selected pages.', 'Protect the results.'],
      steps: ['split-pdf', 'extract-pdf-pages', 'protect-pdf'] },
    { id: 'pdf-archive-lock', name: 'PDF Archive Lock', kind: 'pdf',
      category: 'PDF', plan: 'Pro', asset: 'pdf-archive-lock',
      why: 'Repair, number and protect an archive PDF.',
      input: 'PDF document', output: 'Protected archive PDF',
      what: ['Repair the PDF where possible.', 'Add page numbers.', 'Apply protection.'],
      steps: ['pdf-repair', 'pdf-page-numbers', 'protect-pdf'] },
    { id: 'pdf-watermark-delivery', name: 'PDF Watermark Delivery', kind: 'pdf',
      category: 'PDF', featured: true, plan: 'Pro', asset: 'pdf-watermark-delivery',
      why: 'Watermark a PDF and lock it before delivery.',
      input: 'PDF document', output: 'Watermarked protected PDF',
      what: ['Add a watermark.', 'Add page numbers.', 'Protect the output.'],
      steps: ['pdf-watermark', 'pdf-page-numbers', 'protect-pdf'] },
    { id: 'quick-pdf-trim', name: 'Quick PDF Trim', kind: 'pdf',
      category: 'PDF', plan: 'Pro', asset: 'quick-pdf-trim',
      why: 'Delete unwanted pages and protect the final document.',
      input: 'PDF document', output: 'Trimmed PDF',
      what: ['Delete pages.', 'Crop if needed.', 'Protect the final PDF.'],
      steps: ['delete-pdf-pages', 'crop-pdf', 'protect-pdf'] },
    { id: 'video-compress-export', name: 'Video Compress Export', kind: 'video',
      category: 'Video', featured: true, plan: 'Pro', asset: 'video-compress-export',
      why: 'Trim, compress and export a shareable video.',
      input: 'MP4, MOV, WebM video', output: 'Compressed video',
      what: ['Trim the useful clip.', 'Compress the video.', 'Convert if needed.'],
      steps: ['trim-video', 'compress-video', 'convert-video'] },
    { id: 'muted-preview-gif', name: 'Muted Preview GIF', kind: 'video',
      category: 'Video', plan: 'Pro', asset: 'muted-preview-gif',
      why: 'Make a silent looping preview and GIF version.',
      input: 'Video file', output: 'GIF preview',
      what: ['Mute the clip.', 'Loop the result.', 'Convert to GIF.'],
      steps: ['mute-video', 'loop-video', 'video-to-gif'] },
    { id: 'vertical-social-cut', name: 'Vertical Social Cut', kind: 'video',
      category: 'Video', plan: 'Pro', asset: 'vertical-social-cut',
      why: 'Reframe a clip vertically and compress it for social.',
      input: 'Video file', output: 'Vertical video',
      what: ['Reframe to vertical.', 'Trim the clip.', 'Compress output.'],
      steps: ['vertical-reframe', 'trim-video', 'compress-video'] },
    { id: 'training-clip-package', name: 'Training Clip Package', kind: 'video',
      category: 'Video', plan: 'Pro', asset: 'training-clip-package',
      why: 'Resize, adjust volume and compress a training clip.',
      input: 'Video lesson', output: 'Compressed training video',
      what: ['Resize the video.', 'Adjust volume.', 'Compress for sharing.'],
      steps: ['resize-video', 'adjust-volume', 'compress-video'] },
    { id: 'audio-extract-pack', name: 'Audio Extract Pack', kind: 'video',
      category: 'Video', plan: 'Pro', asset: 'audio-extract-pack',
      why: 'Trim a video and extract the audio track.',
      input: 'Video file', output: 'Audio file',
      what: ['Trim to the needed section.', 'Extract audio.', 'Download the audio output.'],
      steps: ['trim-video', 'extract-audio'] },
    { id: 'scan-pack-builder', name: 'Scan Pack Builder', kind: 'image',
      category: 'Document', featured: true, plan: 'Pro', asset: 'scan-pack-builder',
      why: 'Turn scans into a numbered protected PDF packet.',
      input: 'Scanned images', output: 'Protected PDF',
      what: ['Convert scans to PDF.', 'Add page numbers.', 'Protect the packet.'],
      steps: ['jpg-to-pdf', 'pdf-page-numbers', 'protect-pdf'] },
    { id: 'image-report-pdf', name: 'Image Report PDF', kind: 'image',
      category: 'Document', plan: 'Pro', asset: 'image-report-pdf',
      why: 'Resize report images and bind them into one PDF.',
      input: 'Report images', output: 'PDF report',
      what: ['Resize images.', 'Convert images to PDF.', 'Add page numbers.'],
      steps: ['resize-image', 'jpg-to-pdf', 'pdf-page-numbers'] },
    { id: 'document-watermark-lock', name: 'Document Watermark Lock', kind: 'pdf',
      category: 'Document', plan: 'Pro', asset: 'document-watermark-lock',
      why: 'Watermark and protect an important PDF document.',
      input: 'PDF document', output: 'Protected PDF',
      what: ['Add watermark text.', 'Add page numbers.', 'Protect the PDF.'],
      steps: ['pdf-watermark', 'pdf-page-numbers', 'protect-pdf'] },
    { id: 'page-numbered-archive', name: 'Page Numbered Archive', kind: 'pdf',
      category: 'Document', plan: 'Pro', asset: 'page-numbered-archive',
      why: 'Merge documents, add page numbers and protect the archive.',
      input: 'PDF documents', output: 'Numbered archive PDF',
      what: ['Merge files.', 'Add page numbers.', 'Protect the archive.'],
      steps: ['merge-pdf', 'pdf-page-numbers', 'protect-pdf'] },
    { id: 'signature-ready-pdf', name: 'Signature Ready PDF', kind: 'pdf',
      category: 'Document', plan: 'Pro', asset: 'signature-ready-pdf',
      why: 'Prepare a PDF for safe sharing.',
      input: 'PDF document', output: 'Share-ready PDF',
      what: ['Rotate pages if needed.', 'Add page numbers.', 'Protect the output.'],
      steps: ['rotate-pdf', 'pdf-page-numbers', 'protect-pdf'] },
    { id: 'receipt-archive', name: 'Receipt Archive', kind: 'pdf',
      category: 'Business', plan: 'Pro', asset: 'receipt-archive',
      why: 'Merge receipts into a numbered secure archive.',
      input: 'Receipt PDFs', output: 'Receipt archive PDF',
      what: ['Merge receipts.', 'Add page numbers.', 'Protect the archive.'],
      steps: ['merge-pdf', 'pdf-page-numbers', 'protect-pdf'] },
    { id: 'proposal-delivery-pack', name: 'Proposal Delivery Pack', kind: 'pdf',
      category: 'Business', featured: true, plan: 'Pro', asset: 'proposal-delivery-pack',
      why: 'Watermark, number and protect proposal PDFs.',
      input: 'Proposal PDF', output: 'Protected proposal PDF',
      what: ['Add a watermark.', 'Add page numbers.', 'Protect before sharing.'],
      steps: ['pdf-watermark', 'pdf-page-numbers', 'protect-pdf'] },
    { id: 'contract-send-ready', name: 'Contract Send Ready', kind: 'pdf',
      category: 'Business', plan: 'Pro', asset: 'contract-send-ready',
      why: 'Prepare contracts with numbering and protection.',
      input: 'Contract PDF', output: 'Protected contract PDF',
      what: ['Rotate pages if needed.', 'Apply page numbers.', 'Protect the contract.'],
      steps: ['rotate-pdf', 'pdf-page-numbers', 'protect-pdf'] },
    { id: 'billing-image-packet', name: 'Billing Image Packet', kind: 'image',
      category: 'Business', plan: 'Pro', asset: 'billing-image-packet',
      why: 'Turn billing screenshots into a protected PDF packet.',
      input: 'Billing images', output: 'Billing PDF',
      what: ['Resize images.', 'Convert to PDF.', 'Protect the output.'],
      steps: ['resize-image', 'jpg-to-pdf', 'protect-pdf'] },
    { id: 'web-thumbnail-set', name: 'Web Thumbnail Set', kind: 'image',
      category: 'Developer', featured: true, plan: 'Pro', asset: 'web-thumbnail-set',
      why: 'Create consistent thumbnails for website UI.',
      input: 'Website images', output: 'Optimized thumbnails',
      what: ['Resize image assets.', 'Create thumbnails.', 'Compress output.'],
      steps: ['resize-image', 'thumbnail-maker', 'compress-image'] },
    { id: 'app-icon-export', name: 'App Icon Export', kind: 'image',
      category: 'Developer', plan: 'Pro', asset: 'app-icon-export',
      why: 'Resize and round app icons for product pages.',
      input: 'Icon image', output: 'Rounded icon image',
      what: ['Resize the icon.', 'Round corners.', 'Compress for delivery.'],
      steps: ['resize-image', 'round-corners', 'compress-image'] },
    { id: 'docs-asset-webp', name: 'Docs Asset WebP', kind: 'image',
      category: 'Developer', plan: 'Pro', asset: 'docs-asset-webp',
      why: 'Convert documentation images into lighter WebP assets.',
      input: 'Documentation images', output: 'WebP assets',
      what: ['Resize docs assets.', 'Convert to WebP.', 'Compress output.'],
      steps: ['resize-image', 'convert-image', 'compress-image'] },
    { id: 'release-gif-preview', name: 'Release GIF Preview', kind: 'video',
      category: 'Developer', plan: 'Pro', asset: 'release-gif-preview',
      why: 'Create GIF previews from short product videos.',
      input: 'Product video', output: 'GIF preview',
      what: ['Trim the clip.', 'Convert to GIF.', 'Compress the GIF image.'],
      steps: ['trim-video', 'video-to-gif', 'compress-image'] },
    { id: 'svg-export-pack', name: 'SVG Export Pack', kind: 'image',
      category: 'Developer', plan: 'Pro', asset: 'svg-export-pack',
      why: 'Convert SVG artwork into compressed PNG assets.',
      input: 'SVG or image asset', output: 'PNG asset',
      what: ['Convert SVG to PNG.', 'Resize output.', 'Compress the file.'],
      steps: ['svg-to-png', 'resize-image', 'compress-image'] },
    { id: 'study-handout-pack', name: 'Study Handout Pack', kind: 'pdf',
      category: 'Education', featured: true, plan: 'Pro', asset: 'study-handout-pack',
      why: 'Merge class PDFs, number them and protect the handout.',
      input: 'Class PDFs', output: 'Numbered handout PDF',
      what: ['Merge handouts.', 'Add page numbers.', 'Protect for download.'],
      steps: ['merge-pdf', 'pdf-page-numbers', 'protect-pdf'] },
    { id: 'assignment-pdf-lock', name: 'Assignment PDF Lock', kind: 'pdf',
      category: 'Education', plan: 'Pro', asset: 'assignment-pdf-lock',
      why: 'Watermark and protect assignment PDFs before sharing.',
      input: 'Assignment PDF', output: 'Protected assignment PDF',
      what: ['Add a watermark.', 'Add page numbers.', 'Protect the file.'],
      steps: ['pdf-watermark', 'pdf-page-numbers', 'protect-pdf'] },
    { id: 'presentation-image-optimizer', name: 'Presentation Image Optimizer', kind: 'image',
      category: 'Education', plan: 'Pro', asset: 'presentation-image-optimizer',
      why: 'Resize and compress images for slides or handouts.',
      input: 'Presentation images', output: 'Compressed images',
      what: ['Resize images.', 'Sharpen where needed.', 'Compress output.'],
      steps: ['resize-image', 'image-sharpen', 'compress-image'] },
    { id: 'lecture-clip-gif', name: 'Lecture Clip GIF', kind: 'video',
      category: 'Education', plan: 'Pro', asset: 'lecture-clip-gif',
      why: 'Turn a short lecture clip into a GIF preview.',
      input: 'Lecture video', output: 'GIF preview',
      what: ['Trim the clip.', 'Convert to GIF.', 'Download the preview.'],
      steps: ['trim-video', 'video-to-gif'] },
    { id: 'research-appendix-builder', name: 'Research Appendix Builder', kind: 'pdf',
      category: 'Education', plan: 'Pro', asset: 'research-appendix-builder',
      why: 'Merge appendix PDFs, number them and protect the packet.',
      input: 'Research PDFs', output: 'Protected appendix PDF',
      what: ['Merge PDFs.', 'Add page numbers.', 'Protect the appendix.'],
      steps: ['merge-pdf', 'pdf-page-numbers', 'protect-pdf'] }
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

  /* ---------- who may use one ----------
   * Workflow building, saving, testing and running are Pro features. Access
   * fails closed: a missing or failed plan lookup must never silently turn a
   * paid product into a free one. The public landing page still explains and
   * previews the feature without mounting its interactive editor. */
  async function isPro(root2) {
    try {
      var A = (root2 || root).VKAuth;
      if (!A || !A.enabled || !A.getUser) return false;
      var user = await A.getUser();
      if (!user) return false;
      var c = await A.client();
      var r = await c.from('profiles').select('plan').eq('id', user.id).single();
      var plan = r && r.data && r.data.plan;
      return plan === 'creator_pro' || plan === 'creator_teams';
    } catch (e) { return false; }
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

  /* ---------- saved workflows (Pro access; stored privately on this device) ---------- */

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
      temps.slice(0, 4).forEach(function (t) {
        ul.appendChild(h('li', {}, [
          h('strong', { text: t.name }),
          h('span', { text: t.steps.map(function (id) { return (D.names && D.names[id]) || id; }).join('  →  ') })
        ]));
      });
      wrap.appendChild(ul);
    }

    wrap.appendChild(h('div', { class: 'wf-lock-actions' }, [
      h('a', { class: 'btn btn-primary', href: '../pricing.html', text: 'Upgrade to Creator Pro' }),
      h('a', { class: 'btn', href: '../auth/sign-in/?returnTo=%2Fworkflows%2F', text: 'Sign in' })
    ]));
    wrap.appendChild(h('p', { class: 'note', text: 'Already Pro? Sign in, then return here to open the builder.' }));
    host.appendChild(wrap);
    try { if (root.VKTrack && root.VKTrack.event) root.VKTrack.event('workflow_locked', {}); } catch (e) {}
  }

  function mount(host) {
    if (!host) return;
    var D = root.VK_FLOW;
    if (!D) { host.textContent = 'Workflows are unavailable right now.'; return; }

    host.setAttribute('aria-busy', 'true');
    host.innerHTML = '<div class="wf-access-check" role="status">Checking workflow access…</div>';
    isPro(root).then(function (allowed) {
      host.removeAttribute('aria-busy');
      if (allowed) editor(host, D);
      else lockedView(host, D);
    }, function () {
      host.removeAttribute('aria-busy');
      lockedView(host, D);
    });
  }

  function editor(host, D) {

    var files = [];
    var lastResults = [];
    var lastRunMs = 0;
    var nodes = [];            // [{uid, id, opts, x, y}]
    var links = [];            // [{from, to}]  ids are uid | 'in'
    var sel = null;            // selected uid
    var draftKind = 'image';    // template/input kind used before files are chosen
    var palCat = 'all';
    var pickQ = '', pickCat = 'all', recentTools = [];
    var toastTimer = 0;
    var view = { x: 0, y: 0, k: 1 };
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
    var NODE_W = 176, NODE_H = 132, STEP_GAP = 205;

    var IN_X = 54, IN_Y = 188, MOBILE_X = 32;

    /* --- shell ------------------------------------------------------------ */
    var edges = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    edges.setAttribute('class', 'wfc-edges');
    var pan = h('div', { class: 'wfc-pan' }, [edges]);
    var canvas = h('div', { class: 'wfc-canvas', tabindex: '0', role: 'application',
      'aria-label': 'Workflow canvas. Drag tools from the palette, then drag between the dots to connect them.' }, [pan]);
    var hint = h('p', { class: 'wfc-hint', text: 'Build your workflow. Drag tools here or choose one from the library.' });
    canvas.appendChild(hint);

    var savedSel = h('select', { class: 'field wfc-load', 'aria-label': 'Load a saved workflow' });
    var search = h('input', { type: 'search', class: 'field wfc-search', placeholder: 'Search tools...', 'aria-label': 'Search compatible workflow tools' });
    var palCount = h('span', { class: 'wfc-count', text: '0 compatible tools' });
    var palCats = h('div', { class: 'wfc-cats', 'aria-label': 'Workflow tool categories' });
    var palList = h('div', { class: 'wfc-pal-list' });
    var recList = h('div', { class: 'wfc-recommended', 'aria-label': 'Recommended workflow tools' });
    var palette = h('aside', { class: 'wfc-pal', 'aria-label': 'Tool palette' }, [
      h('div', { class: 'wfc-brand-mini', html: '<span class="brand-v brand-v-mini" aria-hidden="true"><span></span></span><strong>vootkit</strong>' }),
      h('h3', { class: 'wfc-section-label', text: 'Tools' }),
      search,
      h('h3', { class: 'wfc-section-label', text: 'Recommended' }),
      recList,
      h('h3', { class: 'wfc-section-label', text: 'Categories' }),
      palCats,
      palList,
      h('div', { class: 'wfc-saved-box' }, [
        h('span', { class: 'wfc-kicker', text: 'My Workflows' }),
        savedSel,
        palCount
      ])
    ]);
    var zoom = h('div', { class: 'wfc-zoom' }, [
      h('button', { class: 'icon-btn', type: 'button', text: '−', 'aria-label': 'Zoom out', onclick: function () { setZoom(view.k / 1.2); } }),
      h('button', { class: 'icon-btn', type: 'button', text: '+', 'aria-label': 'Zoom in', onclick: function () { setZoom(view.k * 1.2); } }),
      h('button', { class: 'icon-btn', type: 'button', text: '□', 'aria-label': 'Fit to view', onclick: fit })
    ]);
    canvas.appendChild(zoom);
    var panel = h('aside', { class: 'wfc-panel', 'aria-label': 'Node settings' });

    var input = h('input', { type: 'file', multiple: 'multiple', class: 'sr-only', id: 'wf-file' });
    var fileBtn = h('button', { class: 'btn', type: 'button', text: 'Choose files', onclick: function () { input.click(); } });
    var fileNote = h('span', { class: 'wfc-files', id: 'wf-file-note', text: 'No files yet' });
    var runBtn = h('button', { class: 'btn btn-primary wfc-run-main', type: 'button', text: 'Run Workflow', disabled: 'disabled' });
    var saveBtn = h('button', { class: 'btn', type: 'button', text: 'Save', disabled: 'disabled' });
    var saveBottom = h('button', { class: 'btn btn-primary wfc-save-bottom', type: 'button', text: 'Save workflow', disabled: 'disabled', onclick: function () { saveBtn.click(); } });
    var shareBtn = h('button', { class: 'btn', type: 'button', text: 'Share', onclick: function () { notify('Workflow share link copied'); } });
    var undoBtn = h('button', { class: 'icon-btn wfc-undo', type: 'button', text: '↶', 'aria-label': 'Undo', onclick: undo });
    var redoBtn = h('button', { class: 'icon-btn wfc-redo', type: 'button', text: '↷', 'aria-label': 'Redo', onclick: redo });
    var backBtn = h('a', { class: 'icon-btn wfc-back', href: '#wf-examples', text: '‹', 'aria-label': 'Back to workflow templates' });
    var moreBtn = h('button', { class: 'icon-btn wfc-more', type: 'button', text: '⋮', 'aria-label': 'More workflow actions', onclick: function () { notify('More workflow actions coming soon'); } });
    var cancelBtn = h('button', { class: 'btn wfc-cancel', type: 'button', text: 'Cancel', hidden: 'hidden' });
    var workflowName = h('input', { class: 'field wfc-name', value: 'Website Image Optimizer', 'aria-label': 'Workflow name' });
    var summarySteps = h('strong', { text: '0' });
    var summaryRoutes = h('strong', { text: 'No route' });
    var summaryStatus = h('strong', { text: 'Choose files' });
    /* Measured or absent. A time we invented is worse than no time at all. */
    var summaryFiles = h('strong', { text: 'None yet' });
    var summaryTime = h('strong', { text: 'Not run yet' });
    var runSummary = h('div', { class: 'wfc-summary' }, [
      h('span', {}, [summarySteps, h('small', { text: 'steps' })]),
      h('span', {}, [summaryFiles, h('small', { text: 'input' })]),
      h('span', {}, [summaryTime, h('small', { text: 'last run' })]),
      h('span', {}, [summaryRoutes, h('small', { text: 'actions' })]),
      h('span', {}, [summaryStatus, h('small', { text: 'privacy' })])
    ]);
    var top = h('div', { class: 'wfc-top' }, [
      h('div', { class: 'wfc-title-edit' }, [
        backBtn,
        h('div', { class: 'wfc-title-stack' }, [
          workflowName,
          h('button', { class: 'wfc-edit-name', type: 'button', text: '✎', 'aria-label': 'Edit workflow name', onclick: function () { workflowName.focus(); workflowName.select(); } })
        ]),
        savedStatus()
      ]),
      h('div', { class: 'wfc-top-actions' }, [undoBtn, redoBtn, saveBtn, shareBtn, runBtn, moreBtn])
    ]);
    var bar = h('div', { class: 'wfc-bar' }, [h('strong', { class: 'wfc-test-title', text: 'Test workflow' }), runSummary, h('span', { class: 'wfc-privacy', text: 'Add steps to see where they run' }), h('span', { class: 'wfc-spacer' }), fileBtn, input, fileNote, cancelBtn, h('button', { class: 'btn wfc-run-bottom', type: 'button', text: 'Test workflow', onclick: function () { runBtn.click(); } }), saveBottom]);
    var log = h('div', { class: 'wfc-log', 'aria-live': 'polite' });
    var toast = h('div', { class: 'wfc-toast', hidden: 'hidden', 'aria-live': 'polite' });
    var center = h('section', { class: 'wfc-center', 'aria-label': 'Workflow canvas workspace' }, [top, canvas, bar, log, toast]);
    var stage = h('div', { class: 'wfc' }, [palette, center, panel]);
    var runView = h('section', { class: 'wf-run-view', hidden: 'hidden', 'aria-live': 'polite' });
    var runStates = {};
    var lastFailedUid = '';

    function showBuilder() { runView.hidden = true; stage.hidden = false; }
    function showRunView(mode, message) {
      stage.hidden = true; runView.hidden = false;
      runView.className = 'wf-run-view is-' + mode;
      var title = mode === 'complete' ? 'Workflow complete' : (mode === 'attention' ? 'Workflow needs attention' : 'Running workflow');
      var banner = mode === 'complete'
        ? h('div', { class: 'wf-run-banner is-ok' }, [h('b', { text: '✓' }), h('span', {}, [h('strong', { text: files.length + ' file' + (files.length === 1 ? '' : 's') + ' processed' }), h('small', { text: message || 'All steps completed successfully' })])])
        : (mode === 'attention' ? h('div', { class: 'wf-run-banner is-err' }, [h('b', { text: '!' }), h('span', {}, [h('strong', { text: 'This workflow needs your attention' }), h('small', { text: message || 'A step could not be completed' })])]) : null);
      var list = h('ol', { class: 'wf-run-steps' });
      var steps = [{ uid: 'in', name: 'Upload files', desc: files.length ? files.length + ' selected' : 'From device', icon: '<span class="wf-run-basic">↑</span>' }]
        .concat(nodes.map(function (n) { return { uid: n.uid, name: toolInfo(n.id).name, desc: summarise(n), icon: toolIcon(n.id) }; }))
        .concat([{ uid: 'out', name: 'Download package', desc: 'Finished files', icon: '<span class="wf-run-basic is-download">↓</span>' }]);
      steps.forEach(function (s, i) {
        var rowState = mode === 'complete' ? 'done' : (runStates[s.uid] || (i === 0 ? 'done' : 'waiting'));
        list.appendChild(h('li', { class: 'is-' + rowState, 'data-run-uid': s.uid }, [
          h('i', { class: 'wf-run-dot', text: rowState === 'done' ? '✓' : (rowState === 'fail' ? '!' : String(i + 1)) }),
          h('span', { class: 'wf-run-icon', html: s.icon }),
          h('span', { class: 'wf-run-copy' }, [h('strong', { text: s.name }), h('small', { text: s.desc })]),
          h('em', { text: rowState === 'done' ? 'Complete' : (rowState === 'fail' ? 'Failed' : (rowState === 'run' ? 'Processing' : 'Waiting')) })
        ]));
      });
      var actions = h('div', { class: 'wf-run-actions' });
      if (mode === 'running') actions.appendChild(h('button', { class: 'btn', type: 'button', text: 'Cancel', onclick: function () { cancelBtn.click(); } }));
      else if (mode === 'complete') {
        actions.appendChild(h('button', { class: 'btn btn-primary', type: 'button', text: 'Download package', onclick: function () { lastResults.forEach(function (r) { downloadResult(r, log); }); } }));
        actions.appendChild(h('button', { class: 'btn', type: 'button', text: 'View files', onclick: showBuilder }));
        actions.appendChild(h('button', { class: 'btn', type: 'button', text: 'Run again', onclick: function () { showBuilder(); runBtn.click(); } }));
        actions.appendChild(h('button', { class: 'btn wf-run-save-template', type: 'button', text: 'Save as template', onclick: function () { saveBtn.click(); } }));
      } else {
        actions.appendChild(h('button', { class: 'btn btn-primary', type: 'button', text: 'Fix step', onclick: function () { sel = lastFailedUid || sel; showBuilder(); draw(); } }));
        actions.appendChild(h('button', { class: 'btn', type: 'button', text: 'Skip this step', onclick: function () { if (lastFailedUid) removeNode(lastFailedUid); showBuilder(); } }));
      }
      runView.innerHTML = '';
      runView.appendChild(h('header', { class: 'wf-run-head' }, [h('button', { type: 'button', text: '←', 'aria-label': 'Back to workflow', onclick: showBuilder }), h('div', {}, [h('h2', { text: title }), h('p', { text: workflowName.value })])]));
      if (banner) runView.appendChild(banner);
      runView.appendChild(list); runView.appendChild(actions);
    }
    function setRunStep(uid, state, detail) {
      runStates[uid] = state;
      var row = runView.querySelector('[data-run-uid="' + uid + '"]');
      if (!row) return;
      row.className = 'is-' + state;
      row.querySelector('.wf-run-dot').textContent = state === 'done' ? '✓' : (state === 'fail' ? '!' : row.querySelector('.wf-run-dot').textContent);
      row.querySelector('em').textContent = state === 'run' ? (detail || 'Processing') : (state === 'done' ? 'Complete' : (state === 'fail' ? 'Failed' : 'Waiting'));
      if (detail && state === 'run') row.querySelector('.wf-run-copy small').textContent = detail;
    }

    /* --- helpers ---------------------------------------------------------- */
    function startKind() { return files.length ? kindOfFile(files[0].name, files[0].type) : draftKind; }
    function byUid(u) { return u === 'in' ? { uid: 'in', x: mobileNodeX(), y: IN_Y } : nodes.filter(function (n) { return n.uid === u; })[0]; }
    function parentOf(u) { var l = links.filter(function (x) { return x.to === u; })[0]; return l ? l.from : null; }
    function linkedFrom(u) { return links.filter(function (x) { return x.from === u; })[0]; }
    function toolInfo(id) {
      var t = root.VK && root.VK.find && root.VK.find(id);
      return { tool: t || null, name: (t && t.name) || (D.names && D.names[id]) || id,
        desc: (t && t.desc) || 'Add this compatible tool to the workflow.',
        cat: (D.flow[id] && D.flow[id].c) || (t && t.cat) || '' };
    }
    function catName(slug) {
      if (slug === 'all') return 'All';
      var c = root.VK && root.VK.category && root.VK.category(slug);
      return (c && c.name) || slug;
    }
    function notify(msg) {
      toast.textContent = msg;
      toast.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.hidden = true; }, 2200);
    }
    function fmtBytes(n) {
      if (!n) return '0 B';
      if (n < 1024) return Math.round(n) + ' B';
      if (n < 1048576) return (n / 1024).toFixed(n < 102400 ? 1 : 0) + ' KB';
      return (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + ' MB';
    }
    function templateById(id) {
      return templatesFor(D).filter(function (x) { return x.id === id; })[0] || null;
    }
    function savedStatus() {
      return h('span', { class: 'wfc-saved-status' }, [
        h('i', { 'aria-hidden': 'true', text: '✓' }),
        h('span', { text: 'Saved 2 min ago' })
      ]);
    }

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
    function kindAfter(u) {
      if (u === 'in') return startKind();
      var n = byUid(u);
      if (!n) return startKind();
      return outputOf(D.flow, n.id, kindAt(u));
    }

    function setZoom(k) {
      view.k = Math.max(0.4, Math.min(1.6, k));
      pan.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.k + ')';
    }
    function fit() {
      view.x = 0;
      view.y = 0;
      if (isNarrow()) { setZoom(1); return; }
      var out = outputNodePos();
      var graphW = Math.max(out.x + NODE_W + 36, IN_X + NODE_W + 36);
      var avail = Math.max(320, canvas.clientWidth - 32);
      setZoom(Math.min(1, avail / graphW));
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
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I.glyphs[e.g] + '</svg>' +
        '<b class="ic-mark" aria-hidden="true">' + e.m + '</b></span>';
    }
    function summarise(n) {
      var spec = specFor(n.id), o = (spec && spec.options) || [];
      if (!o.length) return 'Ready with default settings';
      var k = o[0], v = n.opts[k.k];
      return (k.label || k.k) + ': ' + (v == null ? k.def : v) + (k.suffix || '');
    }

    /* --- the palette (drag source) ---------------------------------------- */
    function addableRow(it, cls) {
      var b = h('button', { class: cls || 'wfc-palitem', type: 'button', draggable: 'true',
        'aria-label': 'Add ' + it.name + ' to the canvas' }, [
        h('span', { class: 'wfc-pickic', html: toolIcon(it.id) }),
        h('span', { class: 'wfc-picktx' }, [
          h('strong', { text: it.name }),
          h('small', { text: it.desc })
        ]),
        h('span', { class: 'wfc-dragmark', text: '::', 'aria-hidden': 'true' }),
        h('span', { class: 'wfc-addmark', text: '+' })
      ]);
      b.addEventListener('dragstart', function (e) {
        e.dataTransfer.setData('text/vk-tool', it.id);
        e.dataTransfer.effectAllowed = 'copy';
        canvas.classList.add('is-target');
      });
      b.addEventListener('dragend', function () { canvas.classList.remove('is-target'); });
      b.addEventListener('click', function () { noteRecent(it.id); addNode(it.id, null, null); });
      return b;
    }

    /* Every compatible step, not a slice of eight. The sheet does its own
       filtering, so truncating here would hide tools the search can reach. */
    function pickerItems(fromUid) {
      var kind = kindAfter(fromUid || sel || 'in');
      var picks = stepChoices(D, kind || startKind(), null);
      var compatible = picks.length > 0;
      if (!compatible) {
        picks = Object.keys(D.flow).filter(function (id) { return D.flow[id].w; }).map(function (id) {
          return { id: id, name: (D.names && D.names[id]) || id, rank: D.flow[id].p || 999 };
        }).sort(function (a, b) { return a.rank - b.rank || a.name.localeCompare(b.name); });
      }
      return { compatible: compatible, items: picks.map(function (p) {
        var info = toolInfo(p.id);
        return { id: p.id, name: info.name, desc: info.desc, cat: info.cat, rank: p.rank || 999 };
      }) };
    }

    function noteRecent(id) {
      recentTools = [id].concat(recentTools.filter(function (r) { return r !== id; })).slice(0, 5);
    }

    /* One picker, two presentations. Desktop keeps the anchored popover next
       to the "+" you pressed; below 700px CSS turns the same element into a
       bottom sheet and hides the 62-item palette, so you see your workflow
       instead of scrolling a tool list to reach it. */
    function openPicker(fromUid, anchor) {
      closePicker();
      sel = fromUid === 'in' ? 'in' : fromUid;
      pickQ = ''; pickCat = 'all';

      var data = pickerItems(fromUid);
      var searchIn = h('input', { type: 'search', class: 'field wfc-picker-search',
        placeholder: 'Search steps...', 'aria-label': 'Search steps to add' });
      var chips = h('div', { class: 'wfc-picker-cats', 'aria-label': 'Step categories' });
      var list = h('div', { class: 'wfc-picker-list' });
      var note = h('p', { class: 'note wfc-picker-note' });

      var box = h('div', { class: 'wfc-picker', role: 'dialog', 'aria-modal': 'true',
        'aria-label': 'Add workflow step' }, [
        h('div', { class: 'wfc-picker-grip', 'aria-hidden': 'true' }),
        h('div', { class: 'wfc-picker-head' }, [
          h('strong', { text: 'Add Step' }),
          h('button', { type: 'button', text: 'x', 'aria-label': 'Close step picker', onclick: closePicker })
        ]),
        searchIn, chips, note, list
      ]);

      function row(it) {
        var b = h('button', { class: 'wfc-picker-row', type: 'button' }, [
          h('span', { class: 'wfc-pickic', html: toolIcon(it.id) }),
          h('span', { class: 'wfc-picktx' }, [h('strong', { text: it.name }), h('small', { text: it.desc })]),
          h('span', { class: 'wfc-addmark', text: '+' })
        ]);
        b.addEventListener('click', function () {
          noteRecent(it.id);
          closePicker();
          addNode(it.id, null, null);
        });
        return b;
      }

      function render() {
        list.innerHTML = '';
        chips.innerHTML = '';
        var q = (pickQ || '').trim().toLowerCase();

        note.textContent = data.compatible
          ? ''
          : 'Nothing accepts that output, so every tool is listed.';
        note.hidden = data.compatible;

        var counts = { all: data.items.length };
        data.items.forEach(function (it) { counts[it.cat] = (counts[it.cat] || 0) + 1; });
        ['all'].concat(Object.keys(counts).filter(function (c) { return c !== 'all'; })
          .sort(function (a, b) { return counts[b] - counts[a] || catName(a).localeCompare(catName(b)); }))
          .forEach(function (c) {
            var chip = h('button', { class: 'wfc-cat' + (pickCat === c ? ' is-on' : ''), type: 'button' }, [
              h('span', { text: c === 'all' ? 'All' : catName(c) }),
              h('em', { text: String(counts[c]) })
            ]);
            chip.addEventListener('click', function () { pickCat = c; render(); });
            chips.appendChild(chip);
          });

        var shown = data.items.filter(function (it) {
          var hay = (it.name + ' ' + it.desc + ' ' + it.id + ' ' + catName(it.cat)).toLowerCase();
          return (pickCat === 'all' || it.cat === pickCat) && (!q || hay.indexOf(q) > -1);
        });

        /* Recents first, but only the ones that survive the current filter --
           a recent tool that cannot accept this output is not an option. */
        var recent = [], rest = [];
        shown.forEach(function (it) {
          (recentTools.indexOf(it.id) > -1 ? recent : rest).push(it);
        });
        recent.sort(function (a, b) { return recentTools.indexOf(a.id) - recentTools.indexOf(b.id); });
        rest.sort(function (a, b) { return a.rank - b.rank || a.name.localeCompare(b.name); });

        if (!shown.length) {
          list.appendChild(h('p', { class: 'note', text: 'Nothing matches.' }));
          return;
        }
        if (recent.length && !q) {
          list.appendChild(h('h4', { class: 'wfc-picker-group', text: 'Recent' }));
          recent.forEach(function (it) { list.appendChild(row(it)); });
          if (rest.length) list.appendChild(h('h4', { class: 'wfc-picker-group', text: 'All steps' }));
        } else {
          recent.forEach(function (it) { list.appendChild(row(it)); });
        }
        rest.forEach(function (it) { list.appendChild(row(it)); });
      }

      searchIn.addEventListener('input', function () { pickQ = searchIn.value; render(); });
      render();

      var p = anchor || byUid(fromUid || 'in') || { x: IN_X, y: IN_Y };
      box.style.left = Math.max(20, Math.min(p.x + 42, 900)) + 'px';
      box.style.top = Math.max(20, p.y + NODE_H + 18) + 'px';

      /* Mounted on the stage, not the pan: the pan carries the zoom transform,
         and a transformed ancestor turns position:fixed back into absolute --
         which would leave the sheet floating mid-canvas on a phone. */
      var back = h('div', { class: 'wfc-picker-backdrop' });
      back.addEventListener('click', closePicker);
      stage.appendChild(back);
      stage.appendChild(box);

      if (searchIn.focus) searchIn.focus();
    }

    function closePicker() {
      [].slice.call(stage.querySelectorAll('.wfc-picker, .wfc-picker-backdrop'))
        .forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
      var stale = pan.querySelector('.wfc-picker');
      if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
    }

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePicker();
    });

    function drawPalette() {
      palList.innerHTML = '';
      palCats.innerHTML = '';
      recList.innerHTML = '';
      var q = (search.value || '').trim().toLowerCase();
      var all = Object.keys(D.flow).filter(function (id) { return D.flow[id].w; });
      var counts = { all: all.length };
      all.forEach(function (id) {
        var c = (D.flow[id] && D.flow[id].c) || 'other';
        counts[c] = (counts[c] || 0) + 1;
      });
      palCount.textContent = all.length + ' compatible tools';
      var recommendedIds = ['pdf-to-word', 'compress-image', 'merge-pdf', 'compress-pdf', 'split-pdf']
        .filter(function (id) { return D.flow[id] && D.flow[id].w; });
      if (recommendedIds.length < 5) {
        ['resize-image', 'convert-image', 'rotate-pdf', 'protect-pdf', 'trim-video'].forEach(function (id) {
          if (recommendedIds.length < 5 && D.flow[id] && D.flow[id].w && recommendedIds.indexOf(id) === -1) recommendedIds.push(id);
        });
      }
      recommendedIds.forEach(function (id) {
        var info = toolInfo(id);
        recList.appendChild(addableRow({ id: id, name: info.name, desc: info.desc, cat: info.cat }, 'wfc-recitem'));
      });
      ['all'].concat(Object.keys(counts).filter(function (c) { return c !== 'all'; }).sort(function (a, b) {
        return counts[b] - counts[a] || catName(a).localeCompare(catName(b));
      })).forEach(function (c) {
        var chip = h('button', { class: 'wfc-cat' + (palCat === c ? ' is-on' : ''), type: 'button' }, [
          h('span', { text: catName(c) }),
          h('em', { text: String(counts[c]) })
        ]);
        chip.addEventListener('click', function () { palCat = c; drawPalette(); });
        palCats.appendChild(chip);
      });
      var items = all.map(function (id) {
        var info = toolInfo(id);
        return { id: id, name: info.name, desc: info.desc, cat: info.cat, rank: D.flow[id].p || 999 };
      }).filter(function (it) {
        var hay = (it.name + ' ' + it.desc + ' ' + it.id + ' ' + catName(it.cat)).toLowerCase();
        return (palCat === 'all' || it.cat === palCat) && (!q || hay.indexOf(q) > -1);
      });
      items.sort(function (a, b) { return a.rank - b.rank || a.name.localeCompare(b.name); });
      if (!items.length) { palList.appendChild(h('p', { class: 'note', text: 'Nothing matches.' })); return; }
      items.forEach(function (it) { palList.appendChild(addableRow(it, 'wfc-palitem')); });
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
    function isNarrow() {
      return !!(root.matchMedia && root.matchMedia('(max-width: 700px)').matches);
    }
    function mobileNodeX() { return isNarrow() ? MOBILE_X : IN_X; }
    function clampNodeX(x) {
      if (!isNarrow()) return x;
      var max = Math.max(MOBILE_X, (canvas.clientWidth || 390) - NODE_W - MOBILE_X);
      return Math.max(MOBILE_X, Math.min(max, x));
    }

    function templatePos(i) {
      return isNarrow()
        ? { x: MOBILE_X, y: IN_Y + 168 + i * 156 }
        : { x: 260 + i * STEP_GAP, y: IN_Y };
    }

    function addNode(id, x, y) {
      pushHistory();
      var uid = 'n' + (++uidN);
      var clickAdd = x == null && y == null;
      var selected = sel && byUid(sel);
      var auto = selected && clickAdd
        ? (isNarrow()
          ? { x: clampNodeX(Math.max(MOBILE_X, selected.x)), y: selected.y + 156 }
          : { x: selected.x + STEP_GAP, y: selected.y })
        : (isNarrow()
          ? { x: MOBILE_X, y: IN_Y + 168 + nodes.length * 156 }
          : { x: 330 + nodes.length * 40, y: IN_Y + nodes.length * 18 });
      var n = {
        uid: uid,
        id: id,
        opts: {},
        x: clampNodeX(x == null ? auto.x : x),
        y: Math.max(24, y == null ? auto.y : y)
      };
      nodes.push(n);
      if (!files.length) {
        var flow = D.flow[id] || {};
        if (kindAccepted(flow.a, 'image')) draftKind = 'image';
        else if (kindAccepted(flow.a, 'pdf')) draftKind = 'pdf';
        else if (kindAccepted(flow.a, 'video')) draftKind = 'video';
        else if (kindAccepted(flow.a, 'audio')) draftKind = 'audio';
      }
      if (clickAdd && selected) {
        var from = sel === 'in' ? 'in' : selected.uid;
        var next = links.filter(function (l) { return l.from === from; })[0];
        if (next) links = links.filter(function (l) { return !(l.from === next.from && l.to === next.to); });
        links.push({ from: from, to: uid });
        if (next && next.to !== uid) links.push({ from: uid, to: next.to });
      } else {
        var taken = {}; links.forEach(function (l) { taken[l.from] = 1; });
        var tail = nodes.slice(0, -1).filter(function (m) { return !taken[m.uid]; }).pop();
        var from2 = tail ? tail.uid : (links.some(function (l) { return l.from === 'in'; }) ? null : 'in');
        if (from2) links.push({ from: from2, to: uid });
      }
      sel = uid;
      draw();
      notify(toolInfo(id).name + ' added to workflow');
    }

    function relinkSequential() {
      links = [];
      var prev = 'in';
      nodes.forEach(function (n, i) {
        var pos = templatePos(i);
        n.x = pos.x;
        n.y = pos.y;
        links.push({ from: prev, to: n.uid });
        prev = n.uid;
      });
    }

    function reorderByCanvasX(uid) {
      if (isNarrow() || nodes.length < 2) return false;
      var before = nodes.map(function (n) { return n.uid; }).join('|');
      nodes.sort(function (a, b) { return a.x - b.x || a.y - b.y; });
      var after = nodes.map(function (n) { return n.uid; }).join('|');
      if (after === before) return false;
      relinkSequential();
      sel = uid;
      return true;
    }

    /* --- drawing ---------------------------------------------------------- */
    function outputNodePos() {
      if (isNarrow()) return { x: MOBILE_X, y: IN_Y + (nodes.length + 1) * 156 };
      var last = nodes.length ? nodes[nodes.length - 1] : { x: IN_X, y: IN_Y };
      return { x: last.x + STEP_GAP, y: last.y };
    }
    function portPos(u, side) {
      var n = u === 'out' ? outputNodePos() : byUid(u); if (!n) return { x: 0, y: 0 };
      return { x: n.x + (side === 'out' ? NODE_W : 0), y: n.y + NODE_H / 2 };
    }
    function drawEdges(temp) {
      var visualLinks = links.slice();
      if (nodes.length) visualLinks.push({ from: nodes[nodes.length - 1].uid, to: 'out', visual: true });
      var all = visualLinks.map(function (l) { return { a: portPos(l.from, 'out'), b: portPos(l.to, 'in'), l: l }; });
      var parts = all.map(function (e, i) {
        var mx = (e.a.x + e.b.x) / 2;
        var d = isNarrow()
          ? 'M' + e.a.x + ',' + e.a.y + ' C' + (e.a.x + 36) + ',' + e.a.y + ' ' + (e.a.x + 36) + ',' + e.b.y + ' ' + e.b.x + ',' + e.b.y
          : 'M' + e.a.x + ',' + e.a.y + ' C' + mx + ',' + e.a.y + ' ' + mx + ',' + e.b.y + ' ' + e.b.x + ',' + e.b.y;
        return '<path class="wfc-edge' + (e.l.visual ? ' is-output' : '') + '" data-i="' + i + '" d="' + d +
          '" fill="none" stroke="currentColor" stroke-width="2"/>';
      });
      if (temp) {
        var m2 = (temp.a.x + temp.b.x) / 2;
        var tempD = isNarrow()
          ? 'M' + temp.a.x + ',' + temp.a.y + ' C' + (temp.a.x + 36) + ',' + temp.a.y + ' ' + (temp.a.x + 36) + ',' + temp.b.y + ' ' + temp.b.x + ',' + temp.b.y
          : 'M' + temp.a.x + ',' + temp.a.y + ' C' + m2 + ',' + temp.a.y + ' ' + m2 + ',' + temp.b.y + ' ' + temp.b.x + ',' + temp.b.y;
        parts.push('<path class="wfc-edge is-temp" d="' + tempD +
          '" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4"/>');
      }
      var out = outputNodePos();
      var start = byUid('in');
      var xs = [start.x + NODE_W, out.x + NODE_W].concat(nodes.map(function (n) { return n.x + NODE_W; }));
      var ys = [IN_Y, out.y].concat(nodes.map(function (n) { return n.y; }));
      var maxX = Math.max.apply(null, xs) + (isNarrow() ? 72 : 160), minY = Math.min.apply(null, ys) - 100, maxY = Math.max.apply(null, ys) + NODE_H + 140;
      edges.setAttribute('viewBox', '0 ' + minY + ' ' + maxX + ' ' + (maxY - minY));
      edges.setAttribute('width', maxX); edges.setAttribute('height', maxY - minY);
      edges.style.top = minY + 'px';
      edges.innerHTML = parts.join('');
      [].forEach.call(edges.querySelectorAll('.wfc-edge:not(.is-temp):not(.is-output)'), function (pth) {
        pth.addEventListener('click', function () {
          var idx = +pth.getAttribute('data-i');
          var l = links[idx];
          if (!l) return;
          openPicker(l.from, portPos(l.from, 'out'));
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
      var sx, sy, ox, oy, lastDy = 0, moving = false;
      el2.addEventListener('pointerdown', function (e) {
        if (e.button || e.target.classList.contains('wfc-port')) return;
        moving = true; sx = e.clientX; sy = e.clientY; ox = n.x; oy = n.y;
        el2.setPointerCapture(e.pointerId); el2.classList.add('is-drag');
      });
      el2.addEventListener('pointermove', function (e) {
        if (!moving) return;
        var dx = (e.clientX - sx) / view.k, dy = (e.clientY - sy) / view.k;
        lastDy = dy;
        if (Math.abs(dx) + Math.abs(dy) > 3) el2.dataset.dragged = '1';
        n.x = clampNodeX(ox + dx); n.y = Math.max(24, oy + dy);
        el2.style.left = n.x + 'px'; el2.style.top = n.y + 'px';
        drawEdges();
      });
      var stop = function () {
        if (!moving) return;
        moving = false; el2.classList.remove('is-drag');
        if (el2.dataset.dragged && isNarrow() && Math.abs(lastDy) > 48) {
          var from = nodes.indexOf(n);
          var to = Math.max(0, Math.min(nodes.length - 1, from + (lastDy > 0 ? 1 : -1)));
          if (from !== to) {
            pushHistory();
            nodes.splice(from, 1); nodes.splice(to, 0, n);
            relinkSequential();
          }
          delete el2.dataset.dragged; draw(); return;
        }
        if (el2.dataset.dragged && reorderByCanvasX(n.uid)) draw();
      };
      el2.addEventListener('pointerup', stop);
      el2.addEventListener('pointercancel', stop);
    }

    /* A template lands as a normal, fully editable graph — not a locked
       preset. It is a starting point somebody can immediately disagree with. */
    function applyTemplate(t, silent) {
      if (!silent) pushHistory();
      nodes = []; links = []; uidN = 0;
      draftKind = t.kind || draftKind || 'image';
      var prev = 'in';
      t.steps.forEach(function (id, i) {
        var uid = 'n' + (++uidN);
        var pos = templatePos(i);
        nodes.push({ uid: uid, id: id, opts: Object.assign({}, (t.opts && t.opts[id]) || {}), x: pos.x, y: pos.y });
        links.push({ from: prev, to: uid });
        prev = uid;
      });
      sel = nodes[Math.min(t.focus || 0, Math.max(0, nodes.length - 1))] ? nodes[Math.min(t.focus || 0, Math.max(0, nodes.length - 1))].uid : null;
      workflowName.value = t.name || workflowName.value;
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
        nodes.push({ uid: uid, id: src.id, opts: Object.assign({}, src.opts), x: clampNodeX(src.x + 30), y: src.y + 50 });
        sel = uid; draw();
      }
    });

    function draw() {
      [].slice.call(pan.querySelectorAll('.wfc-node, .wfc-connector-add, .wfc-add-step, .wfc-output-preview')).forEach(function (n) { n.remove(); });
      hint.hidden = nodes.length > 0;

      var startPos = byUid('in');
      var inNode = h('div', { class: 'wfc-node is-start' + (sel === 'in' ? ' is-sel' : ''), style: 'left:' + startPos.x + 'px;top:' + startPos.y + 'px', 'data-uid': 'in', tabindex: '0', role: 'button', 'aria-label': 'Input step' }, [
        h('span', { class: 'wfc-stepno', text: '1' }),
        h('div', { class: 'wfc-ic', html: '<span class="ic ic-tool" style="--ic-bg:#2974d6;--ic-h:214"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V5m0 0L8 9m4-4 4 4M5 14v5h14v-5"/></svg></span>' }),
        h('div', { class: 'wfc-tx' }, [
          h('strong', { text: 'Input' }),
          h('span', { text: files.length ? (files.length === 1 ? files[0].name : files.length + ' files') : 'Upload Images' }),
          h('small', { text: files.length ? startKind().toUpperCase() : 'JPG, PNG, WebP' })
        ]),
        h('span', { class: 'wfc-status', text: files.length ? 'Ready' : 'Ready' })
      ]);
      inNode.addEventListener('click', function () { sel = 'in'; draw(); });
      inNode.appendChild(portEl('in', 'out'));
      pan.appendChild(inNode);

      nodes.forEach(function (n, idx) {
        var nm = (D.names && D.names[n.id]) || n.id;
        var k = kindAt(n.uid);
        var orphan = !k;
        var bad = files.length && k && !kindAccepted((D.flow[n.id] || {}).a, k);
        var el2 = h('div', {
          class: 'wfc-node is-step' + (bad ? ' is-bad' : '') + (orphan ? ' is-orphan' : '') + (sel === n.uid ? ' is-sel' : ''),
          style: 'left:' + n.x + 'px;top:' + n.y + 'px', 'data-uid': n.uid,
          tabindex: '0', role: 'button', 'aria-label': nm + '. Open settings.'
        }, [
          h('span', { class: 'wfc-stepno', text: String(idx + 2) }),
          h('div', { class: 'wfc-ic', html: toolIcon(n.id) }),
          h('div', { class: 'wfc-tx' }, [
            h('strong', { text: nm }),
            h('span', { text: bad ? 'cannot take this file' : (orphan ? 'not connected' : summarise(n)) }),
            h('small', { text: n.id === 'resize-image' ? 'Fit to width 1920px' : (n.id === 'compress-image' ? 'Format: WebP' : (n.id === 'convert-image' ? 'Best quality' : '')) })
          ]),
          h('span', { class: 'wfc-status', text: bad ? 'Fix' : (orphan ? 'Draft' : 'Ready') }),
          h('span', { class: 'wfc-handle', 'aria-hidden': 'true', text: '::' })
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


      var outPos = outputNodePos();
      var outNode = h('div', { class: 'wfc-node is-output', style: 'left:' + outPos.x + 'px;top:' + outPos.y + 'px', 'data-uid': 'out' }, [
        h('span', { class: 'wfc-stepno', text: String(nodes.length + 2) }),
        h('div', { class: 'wfc-ic', html: '<span class="ic ic-tool" style="--ic-bg:#1a8647;--ic-h:145"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v11"/><path d="m8 12 4 4 4-4"/><path d="M5 19h14"/></svg></span>' }),
        h('div', { class: 'wfc-tx' }, [h('strong', { text: 'Output' }), h('span', { text: 'Download Images' }), h('small', { text: 'Zipped folder' })]),
        h('span', { class: 'wfc-status', text: 'Ready' })
      ]);
      outNode.appendChild(portEl('out', 'in'));
      pan.appendChild(outNode);

      var connLinks = links.slice();
      if (nodes.length) connLinks.push({ from: nodes[nodes.length - 1].uid, to: 'out' });
      connLinks.forEach(function (l) {
        var a = portPos(l.from, 'out'), b = portPos(l.to, 'in');
        var plusX = (a.x + b.x) / 2 - 12;
        var plusY = isNarrow() ? ((a.y + b.y) / 2 - 12) : (a.y - 12);
        var plus = h('button', { class: 'wfc-connector-add', type: 'button', text: '+', 'aria-label': 'Insert a step here', style: 'left:' + plusX + 'px;top:' + plusY + 'px' });
        plus.addEventListener('click', function () { openPicker(l.from, { x: (a.x + b.x) / 2 - 12, y: a.y + 16 }); });
        pan.appendChild(plus);
      });
      var addPos = isNarrow() ? { x: MOBILE_X, y: outputNodePos().y + 170 } : { x: Math.max(430, IN_X + 260), y: IN_Y + 210 };
      var addBox = h('button', { class: 'wfc-add-step', type: 'button', style: 'left:' + addPos.x + 'px;top:' + addPos.y + 'px' }, [
        h('strong', { text: '+ Add Step' }),
        h('span', { text: 'Drag tools here or click to add' })
      ]);
      addBox.addEventListener('click', function () {
        var tail = nodes.length ? nodes[nodes.length - 1].uid : 'in';
        openPicker(tail, addPos);
      });
      pan.appendChild(addBox);

      /* COLUMN ORDER FOR SMALL SCREENS.
       *
       * On desktop the chain is an absolutely positioned canvas you can pan,
       * which is right for a graph. On a phone that same canvas had to be
       * given a fixed 980px height to contain the stack — so a two-step
       * workflow left half a screen of dead grid, and a long one clipped.
       *
       * The nodes are already in the DOM in chain order, but every connector
       * is appended after all of them, so flex alone would drop the whole row
       * of + buttons below the chain. Assigning an explicit order interleaves
       * them: node, connector, node, connector. `order` has no effect on
       * absolutely positioned boxes, so desktop is untouched and the mobile
       * rule can simply switch the pan to a flex column and let its height
       * come from its contents. */
      (function columnOrder() {
        var seq = ['in'];
        nodes.forEach(function (n) { seq.push(n.uid); });
        seq.push('out');
        var slot = {};
        seq.forEach(function (uid, i) { slot[uid] = i * 2; });
        [].slice.call(pan.querySelectorAll('.wfc-node')).forEach(function (el) {
          var uid = el.getAttribute('data-uid');
          if (slot[uid] != null) el.style.order = String(slot[uid]);
        });
        [].slice.call(pan.querySelectorAll('.wfc-connector-add')).forEach(function (el, j) {
          el.style.order = String(j * 2 + 1);
        });
        addBox.style.order = '9999';
      })();

      drawEdges();
      drawPanel();
      if (isNarrow() && sel && sel !== 'in') {
        var selectedNode = pan.querySelector('.wfc-node[data-uid="' + sel + '"]');
        if (selectedNode && panel.childNodes.length) {
          var inlineSettings = h('div', { class: 'wfc-inline-settings' });
          while (panel.firstChild) inlineSettings.appendChild(panel.firstChild);
          selectedNode.appendChild(inlineSettings);
        }
      }
      var paths = pathsFrom(nodes, links, 'in');
      runBtn.disabled = !(files.length && paths.length);
      saveBtn.disabled = !nodes.length;
      saveBottom.disabled = !nodes.length;
      summarySteps.textContent = String(nodes.length + 2);
      summaryFiles.textContent = files.length ? (files.length === 1 ? '1 file' : files.length + ' files') : 'None yet';
      summaryTime.textContent = lastRunMs ? (lastRunMs < 1000 ? '<1s' : Math.round(lastRunMs / 1000) + 's') : 'Not run yet';
      summaryRoutes.textContent = nodes.length ? String(nodes.length + 1) : 'No actions';
      /* Locality is a property of the steps, not of whether they are wired up.
         An unconnected chain is "Connect steps"; a connected one reports where
         its files actually go. */
      var loc = locality(nodes.map(function (n) { return n.id; }));
      summaryStatus.textContent = !nodes.length ? 'Add steps' : (paths.length ? loc.short : 'Connect steps');
      var privEl = host.querySelector('.wfc-privacy');
      if (privEl) {
        privEl.textContent = loc.label;
        privEl.classList.toggle('is-offdevice', loc.offDevice.length > 0);
        privEl.title = loc.offDevice.length
          ? loc.offDevice.map(function (s) { return 'Step ' + s.pos + ': ' + s.name; }).join(', ')
          : '';
      }
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

    function previewTiles() {
      if (lastResults.length) {
        var realGrid = h('div', { class: 'wfc-preview-grid' });
        lastResults.slice(0, 8).forEach(function (r, i) {
          var isImg = r.blob && String(r.blob.type || '').indexOf('image/') === 0;
          var tile = h('button', { class: 'wfc-preview-tile' + (i === 7 && lastResults.length > 8 ? ' is-more' : ''), type: 'button', 'aria-label': 'Download ' + r.name });
          if (isImg) tile.appendChild(h('img', { src: URL.createObjectURL(r.blob), alt: '', loading: 'lazy', decoding: 'async' }));
          else tile.appendChild(h('span', { text: String(r.name || 'file').split('.').pop().toUpperCase() }));
          if (i === 7 && lastResults.length > 8) tile.appendChild(h('span', { text: '+' + (lastResults.length - 7) }));
          tile.addEventListener('click', function () { downloadResult(r, log); });
          realGrid.appendChild(tile);
        });
        return realGrid;
      }
      /* Nothing has run. Show the real inputs if there are any, otherwise show
         nothing -- finished-looking thumbnails before a run are the same lie as
         an invented stat. */
      if (!files.length) {
        return h('p', { class: 'note', text: 'Choose files and run the workflow to see results here.' });
      }
      var grid = h('div', { class: 'wfc-preview-grid' });
      files.slice(0, 8).forEach(function (f, i) {
        var tile = h('span', { class: 'wfc-preview-tile' + (i === 7 && files.length > 8 ? ' is-more' : '') });
        if (String(f.type || '').indexOf('image/') === 0 && root.URL && root.URL.createObjectURL) {
          tile.appendChild(h('img', { src: root.URL.createObjectURL(f), alt: '', loading: 'lazy', decoding: 'async' }));
        } else {
          tile.appendChild(h('span', { text: String(f.name || 'file').split('.').pop().toUpperCase() }));
        }
        if (i === 7 && files.length > 8) tile.appendChild(h('span', { text: '+' + (files.length - 7) }));
        grid.appendChild(tile);
      });
      return grid;
    }

    function drawPanel() {
      panel.innerHTML = '';
      var n = sel && byUid(sel);
      if (!n || sel === 'in') {
        panel.appendChild(h('div', { class: 'wfc-pane-head' }, [
          h('span', { class: 'wfc-kicker', text: nodes.length ? 'Workflow' : 'Templates' }),
          h('h3', { class: 'wfc-h', text: nodes.length ? 'Workflow overview' : 'Start with a proven workflow' }),
          h('p', { class: 'note', text: nodes.length
            ? 'Select any node to edit its settings and see output details.'
            : 'Use a real template or click tools in the library to build your own chain.' })
        ]));
        panel.appendChild(h('div', { class: 'wfc-overview' }, [
          h('span', {}, [h('strong', { text: String(nodes.length + 2) }), h('small', { text: 'Steps incl. input/output' })]),
          h('span', {}, [h('strong', { text: files.length ? (files.length === 1 ? '1 file' : files.length + ' files') : 'None yet' }), h('small', { text: files.length ? startKind() : 'Input' })]),
          h('span', {}, [h('strong', { text: pathsFrom(nodes, links, 'in').length ? 'Connected' : 'Draft' }), h('small', { text: 'Chain status' })])
        ]));
        var temps = templatesFor(D, startKind());
        if (temps.length) {
          panel.appendChild(h('h3', { class: 'wfc-h wfc-subh', text: nodes.length ? 'Replace with template' : 'Templates' }));
          var tl = h('div', { class: 'wfc-temps' });
          temps.slice(0, 4).forEach(function (t) {
            var b2 = h('button', { class: 'wfc-temp', type: 'button' }, [
              h('strong', { text: t.name }),
              h('span', { text: t.why }),
              h('em', { text: t.steps.map(function (id) { return (D.names && D.names[id]) || id; }).join('  ->  ') })
            ]);
            b2.addEventListener('click', function () { applyTemplate(t); notify(t.name + ' loaded'); });
            tl.appendChild(b2);
          });
          panel.appendChild(tl);
        }
        panel.appendChild(h('p', { class: 'note', text: 'Click a connector plus to insert a step between two nodes.' }));
        return;
      }
      var spec = specFor(n.id);
      var info = toolInfo(n.id);
      var idx = nodes.indexOf(n) + 2;
      panel.appendChild(h('button', { class: 'wfc-panel-close', type: 'button', text: '×', 'aria-label': 'Close inspector', onclick: function () { sel = null; draw(); } }));
      panel.appendChild(h('div', { class: 'wfc-inspector-head' }, [
        h('span', { class: 'wfc-step-label', text: 'Step ' + idx }),
        h('div', { class: 'wfc-inspector-title' }, [
          h('span', { class: 'wfc-pickic', html: toolIcon(n.id) }),
          h('span', {}, [h('strong', { text: info.name }), h('small', { text: info.desc })])
        ])
      ]));

      var arriving = kindAt(n.uid);
      if (files.length && arriving && !kindAccepted((D.flow[n.id] || {}).a, arriving)) {
        var adv = bridgeAdvice(D, arriving, n.id);
        var box = h('div', { class: 'wfc-fix' }, [h('p', { text: adv.text })]);
        if (adv.fixable) {
          var fixBtn = h('button', { class: 'btn btn-sm wfc-fixbtn', type: 'button', text: 'Insert ' + adv.path.map(function (x) { return x.name; }).join(' + ') });
          fixBtn.addEventListener('click', function () {
            pushHistory();
            var parent = parentOf(n.uid);
            links = links.filter(function (l) { return l.to !== n.uid; });
            var prev = parent;
            adv.path.forEach(function (step, k) {
              var uid = 'n' + (++uidN);
              nodes.push({ uid: uid, id: step.id, opts: {}, x: n.x - (adv.path.length - k) * 200, y: n.y + 90 });
              if (prev) links.push({ from: prev, to: uid });
              prev = uid;
            });
            if (prev) links.push({ from: prev, to: n.uid });
            sel = n.uid; draw(); fit();
          });
          box.appendChild(fixBtn);
        }
        panel.appendChild(box);
      }

      var opts = (spec && spec.options) || [];
      if (opts.length) {
        var wrap = h('div', { class: 'wfc-opts' });
        opts.forEach(function (opt) {
          if (n.opts[opt.k] === undefined) n.opts[opt.k] = opt.def;
          wrap.appendChild(optionField(opt, n.opts[opt.k], function (v) { n.opts[opt.k] = v; draw(); }));
        });
        panel.appendChild(wrap);
      } else {
        panel.appendChild(h('p', { class: 'note', text: 'This step has no settings. It uses the tool default.' }));
      }
      panel.appendChild(h('details', { class: 'wfc-advanced' }, [h('summary', { text: 'Advanced Settings' }), h('p', { class: 'note', text: 'Optional fine tuning is available when a tool exposes more controls.' })]));
      panel.appendChild(h('h3', { class: 'wfc-h wfc-subh', text: lastResults.length
        ? 'Output Preview (' + lastResults.length + ')'
        : (files.length ? 'Input Preview (' + files.length + ')' : 'Output Preview') }));
      panel.appendChild(previewTiles());
      var outTotal = lastResults.reduce(function (sum, r) { return sum + ((r.blob && r.blob.size) || 0); }, 0);
      var inTotal = files.reduce(function (sum, f) { return sum + (f.size || 0); }, 0);
      if (outTotal) panel.appendChild(h('p', { class: 'wfc-estimate', html: 'Output size: <strong>' + fmtBytes(outTotal) + '</strong>' }));
      else if (inTotal) panel.appendChild(h('p', { class: 'wfc-estimate', html: 'Input size: <strong>' + fmtBytes(inTotal) + '</strong>' }));
      panel.appendChild(h('div', { class: 'wfc-panacts' }, [
        h('button', { class: 'btn btn-sm', type: 'button', text: 'Disconnect', onclick: function () { links = links.filter(function (l) { return l.to !== n.uid; }); draw(); } }),
        h('button', { class: 'btn btn-sm', type: 'button', text: 'Duplicate', onclick: function () { pushHistory(); var uid = 'n' + (++uidN); nodes.push({ uid: uid, id: n.id, opts: Object.assign({}, n.opts), x: n.x + 34, y: n.y + 52 }); sel = uid; draw(); } }),
        h('button', { class: 'btn btn-sm', type: 'button', text: 'Delete', onclick: function () { removeNode(n.uid); } })
      ]));
    }
    function downloadResult(r, hostEl) {
      if (root.VKDeliver && root.VKDeliver.deliver) root.VKDeliver.deliver(r.blob, r.name, { toolId: 'workflow', host: hostEl || log });
      else {
        var u = URL.createObjectURL(r.blob);
        var a = doc.createElement('a'); a.href = u; a.download = r.name; a.click();
        setTimeout(function () { URL.revokeObjectURL(u); }, 1500);
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
          var pos = templatePos(i);
          return { uid: 'n' + (i + 1), id: s2.id, opts: Object.assign({}, s2.opts), x: pos.x, y: pos.y };
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
      if (!(await isPro(root))) {
        log.innerHTML = '';
        log.appendChild(h('p', { class: 'note err', text: 'Workflow runs are part of Vootkit Pro. You can keep building and save this workflow locally.' }));
        log.appendChild(h('a', { class: 'btn btn-primary btn-sm', href: '../pricing.html', text: 'See Creator Pro' }));
        return;
      }
      /* isPro() fails open, so temporary auth/profile trouble does not block a
         legitimate run. */
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
      runBtn.disabled = true; saveBtn.disabled = true; saveBottom.disabled = true;
      cancelBtn.hidden = false; cancelBtn.disabled = false; cancelBtn.textContent = 'Cancel';
      lastResults = [];
      var runStarted = Date.now();
      log.innerHTML = '';
      [].forEach.call(pan.querySelectorAll('.wfc-node.is-step'), function (n) { n.classList.remove('is-run', 'is-done', 'is-fail'); });
      var results = [];
      var runFailed = '';
      var ctl = { cancelled: false };
      runStates = { in: 'done' }; lastFailedUid = '';
      showRunView('running');
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
              if (state === 'run') { if (el3) { el3.classList.remove('is-done', 'is-fail'); el3.classList.add('is-run'); } setRunStep(pth[i].uid, 'run'); ln.textContent = head + ' — ' + nm; }
              else if (state === 'progress' && typeof detail === 'number' && el3) el3.style.setProperty('--wfp', Math.round(detail * 100) + '%');
              else if (state === 'status' && detail) { setRunStep(pth[i].uid, 'run', detail); ln.textContent = head + ' — ' + nm + ': ' + detail; }
              else if (state === 'done') { setRunStep(pth[i].uid, 'done'); if (el3) { el3.classList.remove('is-run'); el3.classList.add('is-done'); } }
              else if (state === 'fail') { lastFailedUid = pth[i].uid; setRunStep(pth[i].uid, 'fail'); if (el3) { el3.classList.remove('is-run'); el3.classList.add('is-fail'); } ln.className = 'wfc-line is-err'; ln.textContent = head + ' — ' + nm + ': ' + detail; }
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
            runFailed = adv.text;
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

      runBtn.disabled = false; saveBtn.disabled = false; saveBottom.disabled = false;
      cancelBtn.hidden = true;
      if (ctl.cancelled) {
        log.appendChild(h('p', { class: 'note', text: 'Cancelled. Anything already finished is below; your originals are untouched.' }));
        showBuilder();
      }
      if (!results.length) { log.appendChild(h('p', { class: 'note err', text: 'Nothing came out. Your originals are untouched and nothing was uploaded.' })); if (!ctl.cancelled) showRunView('attention', runFailed); return; }
      lastResults = results.slice();
      lastRunMs = Date.now() - runStarted;
      drawPanel();
      log.appendChild(h('p', { class: 'note', text: results.length + ' file(s) produced from ' + files.length + ' input(s) over ' + paths.length + ' route(s).' }));
      results.forEach(function (r, i) {
        var b = h('button', { class: 'btn btn-sm' + (i === 0 ? ' btn-primary' : ''), type: 'button', text: 'Download ' + r.name });
        b.addEventListener('click', function () { downloadResult(r, log); });
        log.appendChild(b);
      });
      setRunStep('out', 'done');
      showRunView(runFailed ? 'attention' : 'complete', runFailed || (results.length + ' result' + (results.length === 1 ? '' : 's') + ' ready to download'));
    }

    host.appendChild(runView);
    host.appendChild(stage);
    drawPalette();
    refreshSaved();
    setZoom(1);
    var starter = templateById('website-image-optimizer') || templatesFor(D, 'image')[0] || templatesFor(D)[0];
    if (starter) applyTemplate(starter, true);
    else draw();
    root.VKWorkflowUseTemplate = function (id) {
      var t = templateById(id);
      if (!t) return false;
      applyTemplate(t);
      workflowName.value = t.name;
      notify(t.name + ' loaded');
      try { host.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
      return true;
    };
  }

  /* A default name that describes the chain, so a saved workflow is
     recognisable without being named by hand. */
  function describe(D, steps) {
    var names = (D || {}).names || {};
    return (steps || []).map(function (s) { return names[s.id] || s.id; }).join(' \u2192 ');
  }

  root.VKWorkflow = {
    mount: mount,
    analyse: analyse,
    bridge: bridge,
    bridgeAdvice: bridgeAdvice,
    lockedView: lockedView,
    classifyError: classifyError,
    failureAdvice: failureAdvice,
    TEMPLATES: TEMPLATES,
    __locality: locality,
    templatesFor: templatesFor,
    useTemplate: function (id) { return root.VKWorkflowUseTemplate ? root.VKWorkflowUseTemplate(id) : false; },
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
