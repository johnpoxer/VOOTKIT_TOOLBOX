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
    if (!(durationSec > 0)) return 0;
    var totalKbps = (targetMB * 1048576 * 8) / durationSec / 1000;
    return Math.floor((totalKbps - audioKbps) * 0.96);
  }

  function buildCompressArgs(inName, outName, opt) {
    // opt: { targetMB, durationSec, audioKbps }
    var vk = clampInt(targetVideoKbps(opt.targetMB, opt.durationSec, opt.audioKbps), 0);
    if (vk < 50) return { error: 'That size is too small for this clip — even at minimum quality it won’t fit. Pick a larger size or a shorter clip.' };
    var buf = vk * 2;
    return {
      args: ['-i', inName,
        '-c:v', 'libx264', '-preset', 'veryfast',
        '-b:v', vk + 'k', '-maxrate', ceil(vk * 1.1) + 'k', '-bufsize', buf + 'k',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', opt.audioKbps + 'k',
        '-movflags', '+faststart', '-y', outName],
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

  function buildConvertArgs(inName, outName) {
    // Convert any input (MOV/MKV/AVI/WebM/…) to universal MP4 (H.264/AAC).
    // (VP9/WebM output is intentionally not offered — it overflows the wasm core's memory.)
    return { args: ['-i', inName, '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-y', outName] };
  }

  function buildResizeArgs(inName, outName, opt) {
    // opt: { height } — scale to target height, width auto-even, keep aspect
    var h = clampInt(opt.height, 16);
    return { args: ['-i', inName, '-vf', 'scale=-2:' + h + ':flags=lanczos', '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-y', outName] };
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

  function load(onLog) {
    if (_ff) return Promise.resolve({ ff: _ff, util: _util });
    if (_loading) return _loading;
    _loading = (async function () {
      var cap = capability();
      if (!cap.ok) throw new Error(cap.reason);
      if (!root.FFmpegWASM) await loadScript(BASE);
      if (!root.FFmpegUtil) await loadScript(UTILURL);
      var FFmpeg = root.FFmpegWASM.FFmpeg;
      _util = root.FFmpegUtil;
      var ff = new FFmpeg();
      if (onLog) ff.on('log', function (e) { onLog(e.message); });
      // Everything is fetched to a same-origin blob URL first, so cross-origin
      // isolation / CORP never blocks the worker or the core. The .wasm sits next
      // to the core .js on the CDN.
      var cfg = {
        classWorkerURL: await _util.toBlobURL(CLASSWORKER, 'text/javascript'),
        coreURL: await _util.toBlobURL(COREURL, 'text/javascript'),
        wasmURL: await _util.toBlobURL(COREURL.replace(/\.js$/, '.wasm'), 'application/wasm')
      };
      await ff.load(cfg);
      _ff = ff;
      return { ff: _ff, util: _util };
    })();
    return _loading;
  }

  /* Run one ffmpeg job. `built` is a builder result {args} or {error}. */
  async function run(file, inName, outName, built, onProgress) {
    if (built.error) throw new Error(built.error);
    var env = await load();
    var ff = env.ff, util = env.util;
    var prog = function (e) { if (onProgress && e && typeof e.progress === 'number') onProgress(Math.max(0, Math.min(1, e.progress))); };
    ff.on('progress', prog);
    try {
      await ff.writeFile(inName, await util.fetchFile(file));
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
    targetVideoKbps: targetVideoKbps
  };
  if (typeof module === 'object' && module.exports) module.exports = root.VKVideo;
})(typeof window !== 'undefined' ? window : globalThis);
