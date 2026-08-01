/* videoengine.js — in-browser video processing.
 *
 * Real transcoding needs ffmpeg compiled to WebAssembly. It is ~30 MB, so it is
 * LAZY-loaded from a CDN only when a video-processing tool actually runs, and
 * cached for the rest of the session. Multi-threaded ffmpeg needs SharedArrayBuffer,
 * which needs cross-origin isolation — we set COOP/COEP on ONLY these tool paths
 * (they carry no ads) so the rest of the site, and AdSense, are unaffected.
 *
 * Nothing is uploaded: the file is written into ffmpeg's in-memory filesystem,
 * processed, and read back — all inside the browser tab.
 *
 * The ffmpeg ARGUMENT BUILDERS below are pure functions, exported and unit-tested
 * in test/videofx.test.js. That is the part that must be provably correct; the
 * WASM plumbing around them is standard @ffmpeg/ffmpeg 0.12 usage.
 */
(function (root) {
  'use strict';

  var VER = '0.12.10', UTIL = '0.12.1', CORE = '0.12.6';
  var BASE = 'https://unpkg.com/@ffmpeg/ffmpeg@' + VER + '/dist/umd/ffmpeg.js';
  var UTILURL = 'https://unpkg.com/@ffmpeg/util@' + UTIL + '/dist/umd/index.js';
  // @ffmpeg/ffmpeg lazily spawns its engine as a MODULE worker from a webpack chunk
  // whose URL is relative to ffmpeg.js. Loaded from a CDN that is a cross-origin
  // Worker (forbidden by the browser), so we pass a same-origin blob of the chunk as
  // classWorkerURL. NOTE: the chunk name is tied to VER — re-check if VER changes.
  var CLASSWORKER = 'https://unpkg.com/@ffmpeg/ffmpeg@' + VER + '/dist/umd/814.ffmpeg.js';
  // The module worker loads the core via dynamic import(), so the core must be the
  // ESM build (the UMD build never exposes createFFmpegCore to a module worker).
  // Single-threaded: works on every browser, needs no cross-origin isolation or
  // SharedArrayBuffer, and sidesteps the core-mt pthread cross-origin worker problem.
  var COREURL = 'https://unpkg.com/@ffmpeg/core@' + CORE + '/dist/esm/ffmpeg-core.js';
  var isolated = typeof root !== 'undefined' && root.crossOriginIsolated === true;

  /* ---------- pure helpers (unit-tested) ---------- */

  function ceil(n) { return Math.ceil(n); }
  function clampInt(n, lo) { n = Math.floor(n); return n < lo ? lo : n; }

  /* Video bitrate (kbps, integer) to land a clip of `durationSec` in `targetMB`,
     leaving room for `audioKbps` audio and 4% container/rate-control overhead. */
  function targetVideoKbps(targetMB, durationSec, audioKbps) {
    if (!(durationSec > 0) || !isFinite(durationSec)) return 0;
    var totalKbps = (targetMB * 1048576 * 8) / durationSec / 1000;
    return Math.floor((totalKbps - audioKbps) * 0.96);
  }

  function buildCompressArgs(inName, outName, opt) {
    // opt: { targetMB, durationSec, audioKbps }
    if (!(opt.durationSec > 0) || !isFinite(opt.durationSec)) {
      return { error: 'Could not read this video’s length, so there’s no way to work out the bitrate that fits. Converting it to MP4 first usually fixes it.' };
    }
    var vk = clampInt(targetVideoKbps(opt.targetMB, opt.durationSec, opt.audioKbps), 0);
    if (vk < 50) return { error: 'That size is too small for this clip — even at minimum quality it won’t fit. Pick a larger size or a shorter clip.' };
    var buf = vk * 2;
    return {
      args: ['-i', inName]
        .concat(cfrFlags(opt.fps))
        .concat(['-c:v', 'libx264', '-preset', 'veryfast',
          '-b:v', vk + 'k', '-maxrate', ceil(vk * 1.1) + 'k', '-bufsize', buf + 'k',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac', '-b:a', opt.audioKbps + 'k',
          '-movflags', '+faststart', '-y', outName]),
      videoKbps: vk
    };
  }

  function buildTrimArgs(inName, outName, opt) {
    // opt: { start, end }  — stream-copy, no re-encode (fast, lossless)
    if (!(opt.end > opt.start)) return { error: 'The end time must be after the start time.' };
    return { args: ['-ss', String(opt.start), '-to', String(opt.end), '-i', inName, '-c', 'copy', '-y', outName] };
  }

  function buildGifArgs(inName, outName, opt) {
    // opt: { fps, width, start, duration }  — palette-accurate one-liner
    var vf = 'fps=' + opt.fps + ',scale=' + opt.width + ':-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse';
    var a = [];
    if (opt.start > 0) a.push('-ss', String(opt.start));
    a.push('-t', String(opt.duration), '-i', inName, '-vf', vf, '-loop', '0', '-y', outName);
    return { args: a };
  }

  function buildReframeArgs(inName, outName, opt) {
    // opt: { w, h }  — centre-crop to target aspect, then scale
    var vf = 'crop=ih*' + opt.w + '/' + opt.h + ':ih,scale=' + opt.w + ':' + opt.h + ':flags=lanczos';
    return { args: ['-i', inName, '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-y', outName] };
  }

  function buildMuteArgs(inName, outName) {
    return { args: ['-i', inName, '-c', 'copy', '-an', '-y', outName] };
  }

  function buildExtractAudioArgs(inName, outName, opt) {
    // opt: { format: 'mp3'|'wav' }
    if (opt.format === 'wav') return { args: ['-i', inName, '-vn', '-c:a', 'pcm_s16le', '-y', outName] };
    return { args: ['-i', inName, '-vn', '-c:a', 'libmp3lame', '-q:a', '2', '-y', outName] };
  }

  /* Output frame rate, clamped to something the wasm encoder can actually finish.
     WHY THIS EXISTS: variable-frame-rate sources — screen recordings, phone
     captures, anything from MediaRecorder — carry a 1/1000s timebase. Without an
     explicit rate ffmpeg matches that timebase and duplicates frames to fill it:
     a 2-second clip encoded 1,989 frames (dup=1,894) at 0.34x realtime. On a real
     phone video that is minutes of 100% CPU and usually an out-of-memory crash,
     which is exactly how this tool "stopped working". Forcing constant frame rate
     makes output frames a function of duration, not of the source timebase. */
  function clampFps(fps) {
    var n = Number(fps);
    if (!isFinite(n) || n <= 0) return 30;
    return Math.max(1, Math.min(60, Math.round(n)));
  }

  // Shared CFR flags: constant frame rate at a sane ceiling, and a muxing queue
  // big enough for sources whose audio and video streams start far apart.
  function cfrFlags(fps) {
    return ['-fps_mode', 'cfr', '-r', String(clampFps(fps)), '-max_muxing_queue_size', '1024'];
  }

  function buildConvertArgs(inName, outName, opt) {
    // Convert any input (MOV/MKV/AVI/WebM/…) to universal MP4 (H.264/AAC).
    // (VP9/WebM output is intentionally not offered — it overflows the wasm core's memory.)
    opt = opt || {};
    return {
      args: ['-i', inName]
        .concat(cfrFlags(opt.fps))
        .concat(['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
                 '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-y', outName])
    };
  }

  function buildResizeArgs(inName, outName, opt) {
    // opt: { height, fps } — scale to target height, width auto-even, keep aspect
    var h = clampInt(opt.height, 16);
    return {
      args: ['-i', inName, '-vf', 'scale=-2:' + h + ':flags=lanczos']
        .concat(cfrFlags(opt.fps))
        // Re-encode audio rather than copy: a copied stream from WebM/Opus or
        // MKV/Vorbis is not a legal MP4 audio track and the mux fails.
        .concat(['-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
                 '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-y', outName])
    };
  }

  function buildLoopArgs(inName, outName, opt) {
    // opt: { count } total plays (>=2). stream_loop must precede -i. Stream-copy = fast.
    var n = clampInt(opt.count, 2);
    return { args: ['-stream_loop', String(n - 1), '-i', inName, '-c', 'copy', '-y', outName] };
  }

  function buildVolumeArgs(inName, outName, opt) {
    // opt: { percent } 100 = unchanged, 200 = 2x, 50 = half. Video copied untouched.
    var p = opt.percent > 0 ? opt.percent : 100;
    return { args: ['-i', inName, '-af', 'volume=' + (p / 100).toFixed(3), '-c:v', 'copy', '-y', outName] };
  }

  /* ---------- metadata, read from ffmpeg's own banner ----------
   *
   * WHY NOT A <video> ELEMENT: feeding a file to a <video> and waiting for
   * loadedmetadata is unreliable in both directions. Containers the browser
   * cannot demux (AVI, MKV, many MOVs) fire neither loadedmetadata nor error —
   * they just sit at readyState 0 forever. And a *valid* H.264 MP4 does the same
   * thing in a background tab, where Chrome defers media loading entirely.
   * Verified: a known-good 6-second 640x360 H.264/AAC MP4 stayed at
   * readyState 0 / networkState 2 (LOADING) indefinitely.
   *
   * That mattered because the Discord compressor cannot pick a bitrate without
   * knowing the duration, so a probe that returns nothing took the whole tool
   * down with "Could not read this video's length" on files that were fine.
   *
   * ffmpeg already demuxes everything we support, and it is already loaded by
   * the time we need this. `ffmpeg -i file` with no output file exits 1 without
   * throwing, prints the Duration and Stream lines, and — verified — leaves the
   * wasm instance healthy enough to run the real job immediately afterwards. */

  var RE_DURATION = /Duration:\s*(\d+):(\d\d):(\d\d(?:\.\d+)?)/;
  var RE_SIZE = /[,\s](\d{2,5})x(\d{2,5})(?=[\s,\[])/;

  /* Pure: ffmpeg log lines -> { duration, w, h }. Zero means "not reported",
     never "empty" — callers must treat it as unknown. */
  function parseProbe(lines) {
    var out = { duration: 0, w: 0, h: 0 };
    lines = lines || [];
    for (var i = 0; i < lines.length; i++) {
      var line = String(lines[i]);
      if (!out.duration) {
        var d = RE_DURATION.exec(line);
        if (d) {
          var secs = (+d[1]) * 3600 + (+d[2]) * 60 + parseFloat(d[3]);
          if (isFinite(secs) && secs > 0) out.duration = secs;
        }
      }
      // Only the video stream line carries the frame size.
      if (!out.w && /Stream #.*Video:/.test(line)) {
        var s = RE_SIZE.exec(line);
        if (s) { out.w = +s[1]; out.h = +s[2]; }
      }
    }
    return out;
  }

  async function probeInVfs(ff, inName) {
    var lines = [];
    var cap = function (e) { lines.push(e.message); };
    ff.on('log', cap);
    try {
      await ff.exec(['-hide_banner', '-i', inName]);   // exits 1; does not throw
    } catch (e) {
      /* A probe failure must never be fatal — the encode itself is the real
         test of whether ffmpeg can read the file. */
    } finally {
      ff.off('log', cap);
    }
    return parseProbe(lines);
  }

  /* ---------- capability report ---------- */
  function capability() {
    if (typeof WebAssembly !== 'object') {
      return { ok: false, reason: 'This browser has no WebAssembly support, which video processing needs. Try an up-to-date Chrome, Edge or Firefox.' };
    }
    // Single-threaded core — no SharedArrayBuffer needed, works everywhere.
    return { ok: true, isolated: isolated, threads: 'single-threaded' };
  }

  /* ---------- lazy loader ---------- */
  var _ff = null, _util = null, _loading = null;
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = res; s.onerror = function () { rej(new Error('Could not load the video engine from the CDN — check your connection.')); };
      document.head.appendChild(s);
    });
  }

  /* Fetch to a same-origin blob URL, with PROGRESS and a STALL TIMEOUT.
   *
   * @ffmpeg/util's toBlobURL does a bare fetch(): no progress and no timeout.
   * The core is ~32 MB. On a phone over 4G that is a long download reported to
   * the user as nothing at all — the tool just says "Working…" — and if the
   * connection stalls, fetch never settles, so it says "Working…" forever.
   * That is the single most likely reason a mobile user sees a permanent spinner.
   *
   * The timeout is a STALL timer, reset on every chunk: a slow connection is
   * fine and must not be killed, but silence for 30s means it is never coming. */
  var STALL_MS = 30000;

  function fetchBlobURL(url, mime, onBytes) {
    return new Promise(function (res, rej) {
      var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = null;
      function arm() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () {
          if (ctrl) ctrl.abort();
          rej(new Error('The video engine download stalled. Check your connection and try again — on mobile data this needs a steady signal for about 32 MB.'));
        }, STALL_MS);
      }
      arm();
      fetch(url, ctrl ? { signal: ctrl.signal } : undefined).then(function (r) {
        if (!r.ok) throw new Error('The video engine could not be downloaded (HTTP ' + r.status + ').');
        var total = +(r.headers.get('content-length') || 0);
        if (!r.body || !r.body.getReader) {   // older Safari: no streaming, no progress
          return r.arrayBuffer().then(function (b) { return new Blob([b], { type: mime }); });
        }
        var reader = r.body.getReader(), chunks = [], got = 0;
        return (function pump() {
          return reader.read().then(function (step) {
            if (step.done) return new Blob(chunks, { type: mime });
            chunks.push(step.value); got += step.value.length;
            arm();                                  // progress => not stalled
            if (onBytes) onBytes(got, total);
            return pump();
          });
        })();
      }).then(function (blob) {
        clearTimeout(timer);
        res(URL.createObjectURL(blob));
      }).catch(function (e) {
        clearTimeout(timer);
        rej(e && e.name === 'AbortError'
          ? new Error('The video engine download stalled. Check your connection and try again.')
          : e);
      });
    });
  }

  /* opts: { onStatus } — onStatus(message) drives the visible status line so the
     32 MB download is not a silent void. */
  function load(opts) {
    opts = opts || {};
    var say = opts.onStatus || function () {};
    if (_ff) return Promise.resolve({ ff: _ff, util: _util });
    if (_loading) return _loading;
    _loading = (async function () {
      var cap = capability();
      if (!cap.ok) throw new Error(cap.reason);
      say('Starting the video engine…');
      if (!root.FFmpegWASM) await loadScript(BASE);
      if (!root.FFmpegUtil) await loadScript(UTILURL);
      var FFmpeg = root.FFmpegWASM.FFmpeg;
      _util = root.FFmpegUtil;
      var ff = new FFmpeg();
      if (opts.onLog) ff.on('log', function (e) { opts.onLog(e.message); });
      // Everything is fetched to a same-origin blob URL first, so cross-origin
      // isolation / CORP never blocks the worker or the core. The .wasm sits next
      // to the core .js on the CDN.
      function pct(got, total) {
        return total ? ' ' + Math.round((got / total) * 100) + '%'
                     : ' ' + Math.round(got / 1048576) + ' MB';
      }
      var worker = await fetchBlobURL(CLASSWORKER, 'text/javascript');
      var core = await fetchBlobURL(COREURL, 'text/javascript');
      var wasm = await fetchBlobURL(COREURL.replace(/\.js$/, '.wasm'), 'application/wasm',
        function (got, total) { say('Downloading the video engine — one time, about 32 MB' + pct(got, total)); });
      say('Starting the video engine…');
      await ff.load({ classWorkerURL: worker, coreURL: core, wasmURL: wasm });
      _ff = ff;
      return { ff: _ff, util: _util };
    })();
    /* Clear the cached promise on failure. Without this a single network blip
       poisons the module for the life of the page: every retry, and the tool's
       own "Start over", re-await the same rejected promise and fail identically
       with no way back except a full reload. */
    _loading.catch(function () { _loading = null; });
    return _loading;
  }

  /* Run one ffmpeg job.
   *
   * `built` is either:
   *   - a builder result {args} or {error}, or
   *   - a FUNCTION (meta) => {args}|{error}, where meta is {duration, w, h} read
   *     from ffmpeg itself after the file is in the virtual filesystem.
   *
   * The function form exists for tools that cannot choose their arguments until
   * they know the duration — the size-targeted compressor above all. Probing
   * here rather than in the tool means the file is written to the VFS exactly
   * once, and the numbers come from the same demuxer that will do the work.
   * The builder may throw; that surfaces to the user as a normal tool error. */
  async function run(file, inName, outName, built, onProgress, onStatus) {
    var isLate = typeof built === 'function';
    if (!isLate && built.error) throw new Error(built.error);
    var say = onStatus || function () {};
    var env = await load({ onStatus: say });
    var ff = env.ff, util = env.util;
    var prog = function (e) { if (onProgress && e && typeof e.progress === 'number') onProgress(Math.max(0, Math.min(1, e.progress))); };
    ff.on('progress', prog);
    try {
      say('Reading your video…');
      await ff.writeFile(inName, await util.fetchFile(file));
      if (isLate) {
        say('Checking the video…');
        built = built(await probeInVfs(ff, inName));
        if (!built || built.error) {
          try { await ff.deleteFile(inName); } catch (e) {}
          throw new Error((built && built.error) || 'Could not work out how to process that video.');
        }
      }
      say('Converting…');
      await ff.exec(built.args);
      var data = await ff.readFile(outName);
      try { await ff.deleteFile(inName); await ff.deleteFile(outName); } catch (e) {}
      return data; // Uint8Array
    } finally {
      ff.off('progress', prog);
    }
  }

  /* ---------- frame grab: pure <video>+canvas, no ffmpeg ---------- */
  function grabFrame(file, atSec) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file);
      var v = document.createElement('video');
      v.muted = true; v.preload = 'auto'; v.src = url;
      var done = false;
      function fail(m) { if (!done) { done = true; URL.revokeObjectURL(url); rej(new Error(m)); } }
      v.onloadedmetadata = function () {
        var t = Math.max(0, Math.min(atSec || 0, (v.duration || 0)));
        v.currentTime = isFinite(t) ? t : 0;
      };
      v.onseeked = function () {
        if (done) return;
        try {
          var c = document.createElement('canvas');
          c.width = v.videoWidth; c.height = v.videoHeight;
          c.getContext('2d').drawImage(v, 0, 0);
          c.toBlob(function (b) {
            done = true; URL.revokeObjectURL(url);
            b ? res({ blob: b, width: c.width, height: c.height, time: v.currentTime, duration: v.duration })
              : rej(new Error('Could not read that frame.'));
          }, 'image/png');
        } catch (e) { fail('This video format can’t be decoded by your browser for frame capture. Try MP4 (H.264).'); }
      };
      v.onerror = function () { fail('Your browser can’t play this video file, so it can’t grab a frame from it. MP4 (H.264) is the safest format.'); };
    });
  }

  root.VKVideo = {
    load: load, run: run, grabFrame: grabFrame, capability: capability,
    buildCompressArgs: buildCompressArgs, buildTrimArgs: buildTrimArgs,
    buildGifArgs: buildGifArgs, buildReframeArgs: buildReframeArgs,
    buildMuteArgs: buildMuteArgs, buildExtractAudioArgs: buildExtractAudioArgs,
    buildConvertArgs: buildConvertArgs, buildResizeArgs: buildResizeArgs,
    buildLoopArgs: buildLoopArgs, buildVolumeArgs: buildVolumeArgs,
    clampFps: clampFps,
    targetVideoKbps: targetVideoKbps,
    parseProbe: parseProbe
  };
  if (typeof module === 'object' && module.exports) module.exports = root.VKVideo;
})(typeof window !== 'undefined' ? window : globalThis);
