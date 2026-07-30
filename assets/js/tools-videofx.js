/* tools-videofx.js — video processing tools on the VKFile UI + VKVideo engine.
 * Each spec's process() builds ffmpeg args and runs them in-browser. Everything
 * is on-device; the file never leaves the tab.
 *
 * These tools carry a capability check: if the browser can't do WASM video, the
 * user gets a clear message instead of a silent failure. */
(function (root) {
  'use strict';

  /* Read duration + dimensions without decoding the whole file.
   *
   * MUST NOT HANG. A <video> element fed a container the browser cannot demux —
   * AVI, MKV, and many MOV variants — fires NEITHER loadedmetadata NOR error.
   * It just sits there. Verified in Chrome: AVI, MKV, an empty file and a
   * garbage MP4 all left the promise unresolved indefinitely.
   *
   * Those are precisely the formats a *converter* is handed, so an un-timed
   * probe deadlocks the tool before ffmpeg is ever reached — no progress bar,
   * no error, nothing. ffmpeg demuxes far more than the browser does, so
   * unknown metadata is not a failure: we resolve with zeros and let ffmpeg
   * decide. Callers must treat 0 as "unknown", never as "empty". */
  var PROBE_TIMEOUT_MS = 5000;

  function probe(file) {
    return new Promise(function (res) {
      var url = URL.createObjectURL(file);
      var v = document.createElement('video');
      var done = false;
      function finish(out) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        v.removeAttribute('src');
        try { v.load(); } catch (e) {}   // release the decoder
        res(out);
      }
      var timer = setTimeout(function () {
        finish({ duration: 0, w: 0, h: 0, unknown: true });
      }, PROBE_TIMEOUT_MS);
      v.preload = 'metadata'; v.muted = true; v.src = url;
      v.onloadedmetadata = function () {
        finish({ duration: v.duration || 0, w: v.videoWidth || 0, h: v.videoHeight || 0, unknown: false });
      };
      v.onerror = function () { finish({ duration: 0, w: 0, h: 0, unknown: true }); };
    });
  }
  function baseName(n) { return String(n || 'video').replace(/\.[^.]+$/, ''); }
  function clock(s) { s = Math.round(s || 0); var m = Math.floor(s / 60); return m + 'm ' + (s % 60) + 's'; }
  function warnCapability() {
    var cap = root.VKVideo && root.VKVideo.capability();
    if (cap && !cap.ok) throw new Error(cap.reason);
    return cap;
  }
  function outBlob(data, mime) { return new Blob([data.buffer || data], { type: mime }); }

  /* ffmpeg.wasm writes the whole input into a virtual filesystem inside a single
     wasm heap that maxes out near 2 GB, and the encoder needs working room on top
     of that. The old 500 MB cap let files through that always ended in an
     out-of-memory crash mid-encode, which read to users as "the tool is broken".
     200 MB is what actually completes reliably in a single-threaded core. */
  var LIMIT = 200 * 1024 * 1024;

  /* ffmpeg demuxes by content, but giving the real extension lets it pick the
     right demuxer immediately instead of guessing — and makes its error messages
     intelligible when a file is genuinely malformed. */
  function inputName(file) {
    var m = /\.([A-Za-z0-9]{1,5})$/.exec(String(file && file.name || ''));
    var ext = m ? m[1].toLowerCase() : 'mp4';
    return 'in.' + ext;
  }

  /* Guard the cases that cannot finish in a browser tab before burning minutes
     of the user's CPU on them.
     Metadata may be unknown (see probe) — an AVI or MKV tells us nothing until
     ffmpeg opens it. Unknown must never block the conversion: the file-size
     limit is the only check that always applies, because it is the only input
     we can always measure. */
  function guardSize(meta, file) {
    if (file && file.size > LIMIT) {
      throw new Error('That file is bigger than the 200 MB limit for in-browser processing. Trim or compress it first.');
    }
    if (!meta || meta.unknown) return;   // let ffmpeg decide
    var pixels = (meta.w || 0) * (meta.h || 0);
    if (meta.duration > 1800) {
      throw new Error('That clip is ' + clock(meta.duration) + ' long. In-browser conversion tops out around 30 minutes — trim it first, or use a desktop encoder.');
    }
    if (pixels > 3840 * 2160) {
      throw new Error('That video is larger than 4K (' + meta.w + '×' + meta.h + '). Resize it below 4K first — the in-browser encoder runs out of memory above that.');
    }
  }

  var T = {

    'compress-for-discord': {
      accept: 'video/*', action: 'Compress', dropLabel: 'Choose a video to shrink', maxBytes: LIMIT,
      options: [
        { k: 'target', label: 'Fit into', type: 'select', def: 10,
          options: [{ v: 10, label: '10 MB (Discord free)' }, { v: 50, label: '50 MB (Nitro Basic)' }, { v: 500, label: '500 MB (Nitro)' }] },
        { k: 'audio', label: 'Audio quality', type: 'select', def: 128,
          options: [{ v: 96, label: '96 kbps' }, { v: 128, label: '128 kbps' }, { v: 192, label: '192 kbps' }] }
      ],
      process: async function (files, o, api) {
        warnCapability();
        var f = files[0];
        var meta = await probe(f);
        if (!(meta.duration > 0)) throw new Error('Could not read this video’s length — it may be a format the browser can’t open. MP4 (H.264) is safest.');
        guardSize(meta, f);
        var inName = inputName(f);
        var built = root.VKVideo.buildCompressArgs(inName, 'out.mp4', { targetMB: o.target, durationSec: meta.duration, audioKbps: o.audio });
        var data = await root.VKVideo.run(f, inName, 'out.mp4', built, api.progress);
        var blob = outBlob(data, 'video/mp4');
        var fit = blob.size <= o.target * 1048576;
        return {
          stats: [
            { label: 'Original', value: api.bytes(f.size) },
            { label: 'Compressed', value: api.bytes(blob.size) },
            { label: 'Target', value: o.target + ' MB' },
            { label: 'Video bitrate', value: built.videoKbps + ' kbps' }
          ],
          downloads: [{ label: 'Download MP4', blob: blob, name: baseName(f.name) + '-' + o.target + 'mb.mp4' }],
          status: fit ? 'Compressed to fit ' + o.target + ' MB' : 'Compressed (close to target)',
          note: fit ? 'Ready to drop into Discord.' : 'Landed just over target — try the next size down for audio, or trim a few seconds.'
        };
      }
    },

    'trim-video': {
      accept: 'video/*', action: 'Trim', dropLabel: 'Choose a video to trim', maxBytes: LIMIT,
      options: [
        { k: 'start', label: 'Start (seconds)', def: 0, min: 0, step: 0.5, type: 'number' },
        { k: 'end', label: 'End (seconds)', def: 10, min: 0.5, step: 0.5, type: 'number' }
      ],
      process: async function (files, o, api) {
        warnCapability();
        var f = files[0];
        var meta = await probe(f);
        var end = Math.min(o.end, meta.duration || o.end);
        var built = root.VKVideo.buildTrimArgs('in.mp4', 'out.mp4', { start: o.start, end: end });
        var data = await root.VKVideo.run(f, 'in.mp4', 'out.mp4', built, api.progress);
        var blob = outBlob(data, 'video/mp4');
        return {
          stats: [
            { label: 'Kept', value: clock(end - o.start) },
            { label: 'From', value: o.start + 's' },
            { label: 'To', value: Math.round(end) + 's' },
            { label: 'Size', value: api.bytes(blob.size) }
          ],
          downloads: [{ label: 'Download clip', blob: blob, name: baseName(f.name) + '-clip.mp4' }],
          status: 'Trimmed',
          note: 'Trimming copies the streams without re-encoding, so it’s fast and lossless. Cut points snap to the nearest keyframe.'
        };
      }
    },

    'video-to-gif': {
      accept: 'video/*', action: 'Make GIF', dropLabel: 'Choose a short clip', maxBytes: 200 * 1024 * 1024,
      options: [
        { k: 'start', label: 'Start (seconds)', def: 0, min: 0, step: 0.5, type: 'number' },
        { k: 'duration', label: 'Length (seconds)', def: 4, min: 0.5, max: 15, step: 0.5, type: 'number' },
        { k: 'fps', label: 'Frames per second', type: 'select', def: 12, options: [{ v: 10, label: '10 (smaller)' }, { v: 12, label: '12' }, { v: 15, label: '15 (smoother)' }] },
        { k: 'width', label: 'Width (px)', type: 'select', def: 480, options: [{ v: 320, label: '320' }, { v: 480, label: '480' }, { v: 640, label: '640' }] }
      ],
      process: async function (files, o, api) {
        warnCapability();
        var f = files[0];
        var built = root.VKVideo.buildGifArgs('in.mp4', 'out.gif', { fps: o.fps, width: o.width, start: o.start, duration: o.duration });
        var data = await root.VKVideo.run(f, 'in.mp4', 'out.gif', built, api.progress);
        var blob = outBlob(data, 'image/gif');
        return {
          previewUrl: api.urls.make(blob), previewAlt: 'GIF preview',
          stats: [{ label: 'Length', value: o.duration + 's' }, { label: 'FPS', value: o.fps }, { label: 'Width', value: o.width + 'px' }, { label: 'Size', value: api.bytes(blob.size) }],
          downloads: [{ label: 'Download GIF', blob: blob, name: baseName(f.name) + '.gif' }],
          status: 'GIF made',
          note: 'GIFs are large by nature — keep clips short and narrow. For anything over a few seconds, an MP4 is far smaller.'
        };
      }
    },

    'vertical-reframe': {
      accept: 'video/*', action: 'Reframe', dropLabel: 'Choose a landscape video', maxBytes: LIMIT,
      options: [
        { k: 'ratio', label: 'Target shape', type: 'select', def: '9:16',
          options: [{ v: '9:16', label: '9:16 — Shorts / TikTok / Reels' }, { v: '1:1', label: '1:1 — square' }, { v: '4:5', label: '4:5 — feed' }] }
      ],
      process: async function (files, o, api) {
        warnCapability();
        var f = files[0];
        var parts = String(o.ratio).split(':');
        // choose a sensible height, derive width from ratio
        var H = 1920, W = Math.round(H * (+parts[0]) / (+parts[1]));
        if (o.ratio === '1:1') { H = 1080; W = 1080; }
        if (o.ratio === '4:5') { H = 1350; W = 1080; }
        var built = root.VKVideo.buildReframeArgs('in.mp4', 'out.mp4', { w: parts[0], h: parts[1] });
        var data = await root.VKVideo.run(f, 'in.mp4', 'out.mp4', built, api.progress);
        var blob = outBlob(data, 'video/mp4');
        return {
          stats: [{ label: 'Shape', value: o.ratio }, { label: 'Output', value: W + '×' + H }, { label: 'Size', value: api.bytes(blob.size) }],
          downloads: [{ label: 'Download MP4', blob: blob, name: baseName(f.name) + '-' + o.ratio.replace(':', 'x') + '.mp4' }],
          status: 'Reframed to ' + o.ratio,
          note: 'This centre-crops to the new shape — the middle of the frame is kept. Put your subject centre-stage before reframing.'
        };
      }
    },

    'mute-video': {
      accept: 'video/*', action: 'Mute', dropLabel: 'Choose a video to silence', maxBytes: LIMIT,
      options: [],
      process: async function (files, o, api) {
        warnCapability();
        var f = files[0];
        var built = root.VKVideo.buildMuteArgs('in.mp4', 'out.mp4');
        var data = await root.VKVideo.run(f, 'in.mp4', 'out.mp4', built, api.progress);
        var blob = outBlob(data, 'video/mp4');
        return {
          stats: [{ label: 'Original', value: api.bytes(f.size) }, { label: 'Muted', value: api.bytes(blob.size) }, { label: 'Audio', value: 'removed' }],
          downloads: [{ label: 'Download muted video', blob: blob, name: baseName(f.name) + '-muted.mp4' }],
          status: 'Audio removed',
          note: 'Removing the audio track is a stream copy — the video is untouched and it’s instant. Handy for dodging copyright audio claims.'
        };
      }
    },

    'extract-audio': {
      accept: 'video/*', action: 'Extract audio', dropLabel: 'Choose a video', maxBytes: LIMIT,
      options: [
        { k: 'format', label: 'Save as', type: 'select', def: 'mp3', options: [{ v: 'mp3', label: 'MP3 (smaller)' }, { v: 'wav', label: 'WAV (lossless)' }] }
      ],
      process: async function (files, o, api) {
        warnCapability();
        var f = files[0];
        var out = 'out.' + o.format;
        var built = root.VKVideo.buildExtractAudioArgs('in.mp4', out, { format: o.format });
        var data = await root.VKVideo.run(f, 'in.mp4', out, built, api.progress);
        var blob = outBlob(data, o.format === 'wav' ? 'audio/wav' : 'audio/mpeg');
        return {
          stats: [{ label: 'Format', value: o.format.toUpperCase() }, { label: 'Size', value: api.bytes(blob.size) }],
          downloads: [{ label: 'Download ' + o.format.toUpperCase(), blob: blob, name: baseName(f.name) + '.' + o.format }],
          status: 'Audio extracted'
        };
      }
    },

    'convert-video': {
      accept: 'video/*', action: 'Convert to MP4', dropLabel: 'Choose a video to convert', maxBytes: LIMIT,
      options: [
        { k: 'fps', label: 'Frame rate', type: 'select', def: 30,
          options: [{ v: 24, label: '24 fps (film)' }, { v: 30, label: '30 fps (standard)' }, { v: 60, label: '60 fps (smooth)' }] }
      ],
      process: async function (files, o, api) {
        warnCapability();
        var f = files[0];
        var meta = await probe(f);
        guardSize(meta, f);
        var inName = inputName(f);
        var built = root.VKVideo.buildConvertArgs(inName, 'out.mp4', { fps: o.fps });
        var data = await root.VKVideo.run(f, inName, 'out.mp4', built, api.progress);
        var blob = outBlob(data, 'video/mp4');
        if (!blob.size) throw new Error('The converted file came back empty — this clip may use a codec the in-browser encoder can’t read. MP4 (H.264) and WebM inputs are the most reliable.');
        var stats = [
          { label: 'Format', value: 'MP4 (H.264)' },
          { label: 'Frame rate', value: o.fps + ' fps' },
          { label: 'Original', value: api.bytes(f.size) },
          { label: 'Output', value: api.bytes(blob.size) }
        ];
        if (meta.w && meta.h) stats.splice(2, 0, { label: 'Resolution', value: meta.w + '×' + meta.h });
        return {
          stats: stats,
          downloads: [{ label: 'Download MP4', blob: blob, name: baseName(f.name) + '.mp4' }],
          status: 'Converted to MP4',
          note: 'MP4 (H.264) plays on virtually every device, browser and app. Output is constant frame rate, so it stays in sync in every editor.'
        };
      }
    },

    'resize-video': {
      accept: 'video/*', action: 'Resize', dropLabel: 'Choose a video to resize', maxBytes: LIMIT,
      options: [
        { k: 'height', label: 'Resolution', type: 'select', def: 720, options: [{ v: 1080, label: '1080p (Full HD)' }, { v: 720, label: '720p (HD)' }, { v: 480, label: '480p (SD)' }, { v: 360, label: '360p (small)' }] }
      ],
      process: async function (files, o, api) {
        warnCapability();
        var f = files[0];
        var built = root.VKVideo.buildResizeArgs('in.mp4', 'out.mp4', { height: o.height });
        var data = await root.VKVideo.run(f, 'in.mp4', 'out.mp4', built, api.progress);
        var blob = outBlob(data, 'video/mp4');
        return {
          stats: [{ label: 'Height', value: o.height + 'p' }, { label: 'Original', value: api.bytes(f.size) }, { label: 'Output', value: api.bytes(blob.size) }],
          downloads: [{ label: 'Download MP4', blob: blob, name: baseName(f.name) + '-' + o.height + 'p.mp4' }],
          status: 'Resized to ' + o.height + 'p',
          note: 'Width scales automatically to keep the aspect ratio.'
        };
      }
    },

    'loop-video': {
      accept: 'video/*', action: 'Loop', dropLabel: 'Choose a video to loop', maxBytes: LIMIT,
      options: [
        { k: 'count', label: 'Total plays', def: 3, min: 2, max: 20, step: 1, type: 'number' }
      ],
      process: async function (files, o, api) {
        warnCapability();
        var f = files[0];
        var n = Math.max(2, Math.round(o.count || 2));
        var built = root.VKVideo.buildLoopArgs('in.mp4', 'out.mp4', { count: n });
        var data = await root.VKVideo.run(f, 'in.mp4', 'out.mp4', built, api.progress);
        var blob = outBlob(data, 'video/mp4');
        return {
          stats: [{ label: 'Plays', value: n + '×' }, { label: 'Size', value: api.bytes(blob.size) }],
          downloads: [{ label: 'Download MP4', blob: blob, name: baseName(f.name) + '-loop.mp4' }],
          status: 'Looped ' + n + '×',
          note: 'Loops by stream-copy, so it’s fast and keeps the original quality.'
        };
      }
    },

    'adjust-volume': {
      accept: 'video/*', action: 'Adjust volume', dropLabel: 'Choose a video', maxBytes: LIMIT,
      options: [
        { k: 'percent', label: 'Volume', type: 'select', def: 150, options: [{ v: 50, label: '50% (quieter)' }, { v: 100, label: '100% (unchanged)' }, { v: 150, label: '150% (louder)' }, { v: 200, label: '200% (much louder)' }, { v: 300, label: '300% (max boost)' }] }
      ],
      process: async function (files, o, api) {
        warnCapability();
        var f = files[0];
        var built = root.VKVideo.buildVolumeArgs('in.mp4', 'out.mp4', { percent: o.percent });
        var data = await root.VKVideo.run(f, 'in.mp4', 'out.mp4', built, api.progress);
        var blob = outBlob(data, 'video/mp4');
        return {
          stats: [{ label: 'Volume', value: o.percent + '%' }, { label: 'Size', value: api.bytes(blob.size) }],
          downloads: [{ label: 'Download MP4', blob: blob, name: baseName(f.name) + '-volume.mp4' }],
          status: 'Volume set to ' + o.percent + '%',
          note: 'The video track is copied untouched — only the audio level changes.'
        };
      }
    },

    'frame-grabber': {
      accept: 'video/*', action: 'Grab frame', dropLabel: 'Choose a video', maxBytes: LIMIT,
      options: [
        { k: 'time', label: 'Time (seconds)', def: 1, min: 0, step: 0.1, type: 'number' }
      ],
      process: async function (files, o, api) {
        // pure canvas path — no ffmpeg needed
        var f = files[0];
        api.progress(0.4);
        var r = await root.VKVideo.grabFrame(f, o.time);
        api.progress(0.95);
        return {
          previewUrl: api.urls.make(r.blob), previewAlt: 'Captured frame',
          stats: [{ label: 'At', value: r.time.toFixed(1) + 's' }, { label: 'Size', value: r.width + '×' + r.height }, { label: 'File', value: api.bytes(r.blob.size) }],
          downloads: [{ label: 'Download PNG', blob: r.blob, name: baseName(f.name) + '-frame.png' }],
          status: 'Frame captured',
          note: 'Great for thumbnails. This one runs with no download — the browser decodes the frame directly.'
        };
      }
    }

  };

  root.VKVideoFx = T;
  if (typeof module === 'object' && module.exports) module.exports = T;

  function boot() {
    var host = document.getElementById('workspace');
    if (!host || !root.VKFile) return;
    if (host.querySelector('.ftool .drop') || host.querySelector('.drop')) return;
    var spec = T[host.getAttribute('data-tool')];
    if (spec) root.VKFile.mount(host, spec);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
