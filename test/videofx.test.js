/* videofx.test.js — the ffmpeg ARGUMENT BUILDERS (pure) + spec/catalog integrity.
 * The WASM plumbing needs a real browser; these builders are what must be
 * provably correct, so they're unit-tested here against hand-derived values. */
"use strict";
const assert = require("assert");
global.window = global;
const V = require("../assets/js/videoengine.js");
const FX = require("../assets/js/tools-videofx.js");
const VK = require("../data/catalog.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); pass++; };
const has = (arr, seq, m) => { // arr contains seq as consecutive items
  const s = arr.join(" "), n = seq.join(" ");
  ok(s.indexOf(n) !== -1, m + "  [" + arr.join(" ") + "]");
};

/* --- targetVideoKbps: 10 min (600s) into 10 MB, 128 audio ---
   total = 10*1048576*8/600/1000 = 139.81 kbps ; -128 = 11.81 ; *0.96 = 11.3 -> floor 11 */
ok(V.targetVideoKbps(10, 600, 128) === 11, "bitrate 10MB/600s/128 -> 11 kbps, got " + V.targetVideoKbps(10, 600, 128));
/* 50 MB, 60s, 128 -> total=6990.5, -128=6862.5, *0.96=6588.0 -> 6588 */
ok(V.targetVideoKbps(50, 60, 128) === 6588, "bitrate 50MB/60s -> 6588, got " + V.targetVideoKbps(50, 60, 128));

/* --- compress args --- */
let b = V.buildCompressArgs("in.mp4", "out.mp4", { targetMB: 50, durationSec: 60, audioKbps: 128 });
ok(!b.error, "compress builds ok");
ok(b.videoKbps === 6588, "compress exposes videoKbps");
has(b.args, ["-b:v", "6588k"], "compress sets computed video bitrate");
has(b.args, ["-c:v", "libx264"], "compress uses h264");
has(b.args, ["-c:a", "aac", "-b:a", "128k"], "compress sets audio");
has(b.args, ["-movflags", "+faststart"], "compress web-optimises");
/* impossible target flagged, not silently wrong */
b = V.buildCompressArgs("in.mp4", "out.mp4", { targetMB: 1, durationSec: 600, audioKbps: 128 });
ok(b.error && /too small/i.test(b.error), "impossible compress flagged");

/* --- trim: stream copy, correct order (-ss/-to before -i for the seek) --- */
b = V.buildTrimArgs("in.mp4", "out.mp4", { start: 5, end: 12 });
has(b.args, ["-ss", "5", "-to", "12"], "trim sets range");
has(b.args, ["-c", "copy"], "trim stream-copies (lossless)");
ok(V.buildTrimArgs("in.mp4", "o.mp4", { start: 10, end: 3 }).error, "trim rejects end<=start");

/* --- gif: palette pipeline + fps/scale --- */
b = V.buildGifArgs("in.mp4", "out.gif", { fps: 12, width: 480, start: 2, duration: 4 });
has(b.args, ["-ss", "2"], "gif seeks to start");
has(b.args, ["-t", "4"], "gif limits duration");
ok(b.args.join(" ").includes("fps=12,scale=480:-1:flags=lanczos"), "gif fps+scale");
ok(b.args.join(" ").includes("palettegen") && b.args.join(" ").includes("paletteuse"), "gif uses palette for quality");
/* start 0 -> no -ss */
b = V.buildGifArgs("in.mp4", "out.gif", { fps: 10, width: 320, start: 0, duration: 3 });
ok(b.args.indexOf("-ss") === -1, "gif omits -ss when start is 0");

/* --- reframe: crop to ratio then scale --- */
b = V.buildReframeArgs("in.mp4", "out.mp4", { w: "9", h: "16" });
ok(b.args.join(" ").includes("crop=ih*9/16:ih"), "reframe crops to 9:16");
has(b.args, ["-c:a", "copy"], "reframe keeps audio");

/* --- mute --- */
b = V.buildMuteArgs("in.mp4", "out.mp4");
has(b.args, ["-an"], "mute drops audio");
has(b.args, ["-c", "copy"], "mute copies video (instant)");

/* --- extract audio --- */
ok(V.buildExtractAudioArgs("in.mp4", "o.mp3", { format: "mp3" }).args.join(" ").includes("libmp3lame"), "mp3 uses lame");
ok(V.buildExtractAudioArgs("in.mp4", "o.wav", { format: "wav" }).args.join(" ").includes("pcm_s16le"), "wav uses pcm");

/* --- convert: any input -> universal MP4 (H.264/AAC) --- */
has(V.buildConvertArgs("in.mp4", "out.mp4").args, ["-c:v", "libx264"], "convert uses h264");
has(V.buildConvertArgs("in.mp4", "out.mp4").args, ["-movflags", "+faststart"], "convert web-optimises MP4");

/* --- constant frame rate: the fix for VFR sources (screen/phone captures).
   Without this ffmpeg inherits the source's 1/1000s timebase and duplicates
   frames to fill it — a 2s clip encoded 1,989 frames at 0.34x realtime, which
   on a real video means an OOM crash. --- */
b = V.buildConvertArgs("in.mp4", "out.mp4", {});
has(b.args, ["-fps_mode", "cfr"], "convert forces constant frame rate");
has(b.args, ["-r", "30"], "convert defaults to 30 fps");
ok(b.args.indexOf("-max_muxing_queue_size") !== -1, "convert raises the muxing queue for offset streams");
has(V.buildConvertArgs("in.mp4", "out.mp4", { fps: 60 }).args, ["-r", "60"], "convert honours a 60 fps request");
has(V.buildCompressArgs("in.mp4", "out.mp4", { targetMB: 10, durationSec: 60, audioKbps: 128 }).args, ["-fps_mode", "cfr"], "compress forces constant frame rate too");

/* --- fps clamping: never 0, never absurd (wasm cannot finish 240 fps) --- */
ok(V.clampFps(0) === 30, "fps 0 falls back to 30");
ok(V.clampFps(-5) === 30, "negative fps falls back to 30");
ok(V.clampFps(NaN) === 30, "NaN fps falls back to 30");
ok(V.clampFps(240) === 60, "fps clamps to 60 ceiling");
ok(V.clampFps(23.976) === 24, "fractional fps rounds");

/* --- resize: scale to height, width auto-even (keep aspect) --- */
ok(V.buildResizeArgs("in.mp4", "out.mp4", { height: 720 }).args.join(" ").includes("scale=-2:720"), "resize scales to 720 keeping aspect");
/* Copying audio from WebM/Opus or MKV/Vorbis into MP4 is an illegal mux and
   fails — resize must re-encode audio to AAC. */
has(V.buildResizeArgs("in.mp4", "out.mp4", { height: 720 }).args, ["-c:a", "aac"], "resize re-encodes audio to AAC for a legal MP4");
ok(!V.buildResizeArgs("in.mp4", "out.mp4", { height: 720 }).args.join(" ").includes("-c:a copy"), "resize never stream-copies audio into MP4");

/* --- loop: stream_loop = count-1, and must precede -i --- */
b = V.buildLoopArgs("in.mp4", "out.mp4", { count: 3 });
has(b.args, ["-stream_loop", "2"], "loop 3 plays -> stream_loop 2");
ok(b.args.indexOf("-stream_loop") < b.args.indexOf("-i"), "stream_loop precedes -i");
has(b.args, ["-c", "copy"], "loop stream-copies (fast, lossless)");

/* --- volume: percent -> multiplier, video untouched --- */
b = V.buildVolumeArgs("in.mp4", "out.mp4", { percent: 200 });
ok(b.args.join(" ").includes("volume=2.000"), "200% -> volume 2.0");
has(b.args, ["-c:v", "copy"], "volume keeps the video track untouched");

/* --- capability report is honest --- */
const cap = V.capability();
ok(typeof cap.ok === "boolean", "capability returns ok flag");

/* --- catalog: 7 tools live, in video category, all local processing --- */
const ids = Object.keys(FX);
ok(ids.length === 11, "11 videofx tools");
ids.forEach(id => {
  const t = VK.find(id);
  ok(t && t.status === "live", id + " live");
  ok(t.cat === "video", id + " in video");
  ok(t.processing === "local", id + " local");
  ok(typeof FX[id].process === "function", id + " has process()");
});

console.log(`videofx: ${pass} assertions passed`);

/* ---------------------------------------------------------------------------
 * METADATA MUST COME FROM FFMPEG, NOT FROM A <video> ELEMENT — REGRESSION GUARD
 *
 * History, so this is never reintroduced:
 *
 *  1. No probe at all. Fine, but the size-targeted compressor had no duration.
 *  2. A <video>-element probe. It HUNG: containers the browser cannot demux
 *     (AVI, MKV, many MOVs, a truncated file) fire NEITHER loadedmetadata NOR
 *     error. Verified in Chrome. That deadlocked convert-video.
 *  3. The same probe with a 5s timeout. No longer hung, but a timeout cannot
 *     invent a duration — and a *valid* 6s 640x360 H.264/AAC MP4 also stalls at
 *     readyState 0 / networkState 2 whenever the tab is not in the foreground,
 *     because Chrome defers media loading there. Verified. So the compressor
 *     rejected perfectly good files with "Could not read this video's length".
 *  4. Current: ffmpeg reports it. `ffmpeg -i file` with no output exits 1
 *     without throwing, prints Duration and Stream lines, and leaves the wasm
 *     instance healthy for the real job. Verified end to end in Chrome.
 *
 * The invariant: NO TOOL MAY CREATE A <video> ELEMENT TO READ METADATA.
 * (grabFrame in videoengine.js legitimately uses one — it needs to *decode* a
 * frame, and it fails loudly rather than gating anything else on the result.)
 * ------------------------------------------------------------------------- */
const vfxSrc = require("fs").readFileSync(require("path").join(__dirname, "../assets/js/tools-videofx.js"), "utf8");
const engSrc = require("fs").readFileSync(require("path").join(__dirname, "../assets/js/videoengine.js"), "utf8");

ok(!/createElement\(['"]video['"]\)/.test(vfxSrc),
   "no tool builds a <video> element to read metadata");
ok(!/onloadedmetadata/.test(vfxSrc), "no tool waits on loadedmetadata");
ok(!/PROBE_TIMEOUT_MS/.test(vfxSrc), "the timed browser probe is gone, not merely unused");

/* --- parseProbe: the one piece of the new path that is pure and testable --- */
const REAL = [
  "  Duration: 00:00:06.00, start: 0.000000, bitrate: 248 kb/s",
  "  Stream #0:0[0x1](und): Video: h264 (Constrained Baseline) (avc1 / 0x31637661), yuv420p(progressive), 640x360 [SAR 1:1 DAR 16:9], 170 kb/s, 30 fps, 30 tbr, 15360 tbn (default)",
  "  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, mono, fltp, 69 kb/s (default)"
];
let m = V.parseProbe(REAL);
eq(m.duration, 6, "duration parsed from ffmpeg's banner");
eq(m.w, 640, "width parsed");
eq(m.h, 360, "height parsed");

/* The fourcc in that same line is `0x31637661` — a naive NxN regex matches
   inside it and reports a 31637-pixel-wide video, which trips the 4K guard and
   refuses a perfectly ordinary file. */
ok(m.w < 4000 && m.h < 4000, "the fourcc hex is not mistaken for a frame size");

eq(V.parseProbe(["  Duration: 01:02:03.50, start: 0, bitrate: 1 kb/s"]).duration,
   3723.5, "hours, minutes and fractional seconds all count");
eq(V.parseProbe(["  Duration: N/A, bitrate: N/A"]).duration, 0, "N/A duration reads as unknown, not as zero-length");
eq(V.parseProbe([]).duration, 0, "empty log is unknown");
eq(V.parseProbe(null).w, 0, "null log does not throw");
eq(V.parseProbe(["  Stream #0:1: Audio: aac (LC), 44100 Hz, stereo"]).w, 0,
   "an audio-only stream line contributes no frame size");

/* --- the compressor must fail loudly rather than silently mis-size --- */
ok(V.buildCompressArgs("in.mp4", "out.mp4", { targetMB: 10, durationSec: 0, audioKbps: 128 }).error,
   "unknown duration is an explicit error, not a bitrate of zero");
ok(V.buildCompressArgs("in.mp4", "out.mp4", { targetMB: 10, durationSec: Infinity, audioKbps: 128 }).error,
   "an Infinite duration (MediaRecorder WebM) is rejected, not encoded");
eq(V.targetVideoKbps(10, Infinity, 128), 0, "targetVideoKbps treats Infinity as unknown");

/* --- guards: size from the File up front, the rest from real metadata --- */
ok(/function guardFile\(file\)[\s\S]{0,300}file\.size > LIMIT/.test(vfxSrc),
   "the file-size guard needs only the File, so it runs before the 32 MB download");
ok(/function guardMeta\(meta\)[\s\S]{0,200}if \(!meta\) return;/.test(vfxSrc),
   "missing metadata never blocks a job");
ok(/isFinite\(d\) && d > 1800/.test(vfxSrc),
   "a non-finite duration does not trigger the 30-minute refusal");

/* --- every tool hands ffmpeg the real extension, not a hardcoded in.mp4 --- */
ok(!/'in\.mp4'/.test(vfxSrc), "no tool hardcodes in.mp4 for a file that may be MKV/AVI/WebM");
const runCalls = vfxSrc.match(/root\.VKVideo\.run\(/g) || [];
eq(runCalls.length, 10, "all ten ffmpeg-backed tools go through VKVideo.run");
eq((vfxSrc.match(/guardFile\(f\)/g) || []).length, 10, "all ten guard the file size first");

/* --- engine: the late-build path, and the probe that must not be fatal --- */
ok(/typeof built === 'function'/.test(engSrc), "run() accepts a builder function for late argument building");
ok(/'-hide_banner', '-i', inName/.test(engSrc), "probe asks ffmpeg for metadata with no output file");
ok(/catch \(e\) \{[\s\S]{0,220}\} finally \{\s*ff\.off\('log', cap\);/.test(engSrc),
   "a failed probe is swallowed and the log listener always detached");

console.log(`videofx probe: ${pass} total assertions passed`);

/* ---------------------------------------------------------------------------
 * The ~32 MB engine download must be visible and must not hang — mobile bug.
 * Reported from iOS Safari on 4G: the tool sat on "Working…" forever. The
 * engine fetch had no progress reporting and no timeout, so a slow or stalled
 * mobile connection was indistinguishable from a crash.
 * ------------------------------------------------------------------------- */
ok(/STALL_MS/.test(engSrc), "engine download has a stall timeout");
ok(/function arm\(\)/.test(engSrc) && /arm\(\);\s*\/\/ progress => not stalled/.test(engSrc),
   "the stall timer resets on every chunk, so a slow connection is not killed");
ok(/getReader\(\)/.test(engSrc), "engine download streams so it can report progress");
ok(/r\.arrayBuffer\(\)/.test(engSrc), "falls back to a plain fetch where streaming is unavailable");
ok(/Downloading the video engine/.test(engSrc), "the download reports progress to the user");
ok(/_loading\.catch\(function \(\) \{ _loading = null; \}\)/.test(engSrc),
   "a failed load clears the cached promise so retry can work without a reload");
ok(/function run\(file, inName, outName, built, onProgress, onStatus, isCancelled\)/.test(engSrc),
   "run() accepts status and cancellation channels");
ok(/ff\.terminate/.test(engSrc) && /USER_CANCELLED/.test(engSrc),
   "cancel stops an active encoder and returns a recognisable cancellation state");
ok(/'Converting…'/.test(engSrc), "the convert phase is announced separately from the download");
ok(/await ff\.writeFile\(inName, await util\.fetchFile\(file\)\)/.test(engSrc),
   "run() still writes the input file before exec");

const ftSrc = require("fs").readFileSync(require("path").join(__dirname, "../assets/js/filetool.js"), "utf8");
ok(/status: function \(msg\)/.test(ftSrc), "filetool exposes a status channel to tools");

const withStatus = (vfxSrc.match(/api\.progress, api\.status, api\.isCancelled\)/g) || []).length;
ok(runCalls.length === withStatus, `all ${runCalls.length} VKVideo.run call sites pass status and cancellation channels (got ${withStatus})`);

console.log(`videofx engine-load: ${pass} total assertions passed`);

/* ---------------------------------------------------------------------------
 * NO REMOTE LOAD MAY HANG, AND ONE CDN MAY NOT TAKE THE TOOLS DOWN
 *
 * fetchBlobURL got a stall timeout after the iOS report. loadScript did not,
 * and that gap was the remaining way to get a permanent spinner: a <script>
 * whose host accepts the connection and then never responds fires neither load
 * nor error, so the promise never settles and the tool shows "Working…"
 * forever with nothing to report. Reproduced live against unpkg.
 *
 * All eleven video tools share this one loader, so a single CDN being
 * unreachable takes the whole category down. jsDelivr serves the same npm
 * packages and is tried second.
 * ------------------------------------------------------------------------- */
ok(/SCRIPT_TIMEOUT_MS/.test(engSrc), "script loading has a deadline, not just fetching");
ok(/s\.onload = s\.onerror = null;/.test(engSrc),
   "a timed-out script cannot resolve later and race the fallback");
ok(/if \(s\.parentNode\) s\.parentNode\.removeChild\(s\)/.test(engSrc),
   "a timed-out script tag is removed rather than left to execute late");
ok(/clearTimeout\(timer\); res\(\);/.test(engSrc), "a successful load cancels its own timer");

ok(/var HOSTS = \['https:\/\/unpkg\.com\/', 'https:\/\/cdn\.jsdelivr\.net\/npm\/'\]/.test(engSrc),
   "two independent CDNs, unpkg first");
ok(/function firstThat\(attempt, list, label\)/.test(engSrc), "candidates are tried in order");
ok(/return attempt\(list\[i\+\+\]\)\.catch\(next\)/.test(engSrc),
   "a failing host falls through to the next instead of failing the load");
ok(/function loadScript\(key\) \{ return firstThat\(loadScriptFrom, sources\(key\), key\); \}/.test(engSrc),
   "script loading uses the fallback chain");
ok(/function fetchBlobURL\(key, mime, onBytes\) \{\s*return firstThat\(/.test(engSrc),
   "blob fetching uses the fallback chain too");

/* Every remote asset must be declared once, so the two hosts cannot drift and
   a version bump cannot leave one URL pointing at the old release. */
['ffmpeg', 'util', 'worker', 'core', 'wasm'].forEach(k => {
  ok(new RegExp("\\b" + k + ": '@ffmpeg/").test(engSrc), "PKG declares the " + k + " asset");
});
ok(!/https:\/\/unpkg\.com\/@ffmpeg/.test(engSrc),
   "no hardcoded unpkg URL survives outside the HOSTS list");
ok(/wasm: '@ffmpeg\/core@' \+ CORE \+ '\/dist\/esm\/ffmpeg-core\.wasm'/.test(engSrc),
   "the .wasm URL is declared, not derived by string-replacing the .js one");

console.log(`videofx cdn: ${pass} total assertions passed`);

/* ---------------------------------------------------------------------------
 * A COMPRESSOR MUST NOT MAKE FILES BIGGER
 *
 * Working backwards from the target alone treats it as a quota rather than a
 * ceiling, so a clip that already fits gets re-encoded UP to fill it. Observed
 * live: a 0.46 MB input came back at 1.31 MB, "Compressed to fit 10 MB".
 * The source's own average bitrate is the cap.
 * ------------------------------------------------------------------------- */
const small = V.buildCompressArgs("in.mp4", "out.mp4",
  { targetMB: 10, durationSec: 10, audioKbps: 128, sourceKbps: 400 });
ok(small.videoKbps <= 400 - 128, "never exceeds the source bitrate, so a small file stays small");
ok(small.videoKbps >= 50, "still encodes rather than refusing");

const big = V.buildCompressArgs("in.mp4", "out.mp4",
  { targetMB: 10, durationSec: 600, audioKbps: 128, sourceKbps: 8000 });
eq(big.videoKbps, V.buildCompressArgs("in.mp4", "out.mp4",
  { targetMB: 10, durationSec: 600, audioKbps: 128 }).videoKbps,
  "a genuinely oversized clip is unaffected by the cap");

/* The cap must never push the bitrate to something unusable or negative. */
const tiny = V.buildCompressArgs("in.mp4", "out.mp4",
  { targetMB: 10, durationSec: 10, audioKbps: 128, sourceKbps: 130 });
ok(tiny.videoKbps >= 50, "a source barely above the audio bitrate still yields a sane video bitrate");
[0, -5, NaN, Infinity, undefined, null].forEach(v => {
  const r = V.buildCompressArgs("in.mp4", "out.mp4",
    { targetMB: 10, durationSec: 60, audioKbps: 128, sourceKbps: v });
  ok(r.videoKbps > 0 && isFinite(r.videoKbps), "a nonsense sourceKbps (" + v + ") is ignored, not applied");
});

ok(/sourceKbps: m\.duration > 0 \? \(f\.size \* 8\) \/ m\.duration \/ 1000 : 0/.test(vfxSrc),
   "the compressor measures the source bitrate from the real file size and duration");

console.log(`videofx no-inflate: ${pass} total assertions passed`);

/* ---------------------------------------------------------------------------
 * USER-REPORTED, 2 Aug 2026: 2.89 MB IN, 2.96 MB OUT
 *
 * The first no-inflate fix capped the VIDEO bitrate at (source total − audio)
 * and then added the audio back on top. That targets the source's own size, so
 * MP4 container overhead and rate-control overshoot pushed the result over it.
 * Screenshot from the user: original 2.89 MB, compressed 2.96 MB, at a 10 MB
 * target — the tool had no business re-encoding that file at all.
 *
 * Three separate defects, three separate guards. All of them are asserted here
 * because fixing one and believing the job done is what produced the second
 * report.
 * ------------------------------------------------------------------------- */

/* (1) The cap now applies to the COMBINED output, with a real margin. */
{
  const bytes = 2.89 * 1048576, dur = 20;
  const srcKbps = bytes * 8 / dur / 1000;
  const b = V.buildCompressArgs("in.mp4", "out.mp4", {
    targetMB: 10, durationSec: dur, audioKbps: 128,
    sourceKbps: srcKbps, sourceAudioKbps: 69, height: 1080, width: 1920
  });
  const outKbps = b.videoKbps + b.audioKbps;
  ok(outKbps < srcKbps,
     `combined output (${outKbps}) must be under the source (${Math.round(srcKbps)})`);
  ok(outKbps < srcKbps * 0.95,
     "and by a real margin, not a rounding error — container overhead eats a thin one");
}

/* The margin must hold across a spread of shapes, not just the reported one. */
[[1, 10], [2.89, 20], [8, 60], [9.5, 15], [40, 120]].forEach(([mb, dur]) => {
  const srcKbps = mb * 1048576 * 8 / dur / 1000;
  const b = V.buildCompressArgs("in.mp4", "out.mp4", {
    targetMB: 500, durationSec: dur, audioKbps: 192,   // huge target => source is the binding constraint
    sourceKbps: srcKbps, sourceAudioKbps: 96, height: 720, width: 1280
  });
  if (b.error) return;
  ok(b.videoKbps + b.audioKbps < srcKbps,
     `${mb} MB / ${dur}s never exceeds its source bitrate`);
});

/* (2) Audio is never encoded ABOVE the source. Spending 128 on a 69 kb/s track
       adds bytes and cannot restore quality that was never captured. */
{
  const b = V.buildCompressArgs("in.mp4", "out.mp4", {
    targetMB: 10, durationSec: 30, audioKbps: 192, sourceAudioKbps: 64,
    height: 720, width: 1280
  });
  eq(b.audioKbps, 64, "audio is capped at the source's own bitrate");
  has(b.args, ["-b:a", "64k"], "and the cap reaches ffmpeg, not just the stats");
}
{
  const b = V.buildCompressArgs("in.mp4", "out.mp4", {
    targetMB: 10, durationSec: 30, audioKbps: 96, sourceAudioKbps: 320,
    height: 720, width: 1280
  });
  eq(b.audioKbps, 96, "a high-bitrate source does not raise the user's chosen audio setting");
}
{
  const b = V.buildCompressArgs("in.mp4", "out.mp4", {
    targetMB: 10, durationSec: 30, audioKbps: 128, height: 720, width: 1280
  });
  eq(b.audioKbps, 128, "unknown source audio leaves the user's choice alone");
}

/* (3) parseProbe reads the audio bitrate out of ffmpeg's real output. */
{
  const real = [
    "  Duration: 00:00:20.00, start: 0.000000, bitrate: 1212 kb/s",
    "  Stream #0:0[0x1](und): Video: h264 (High), yuv420p, 1920x1080 [SAR 1:1 DAR 16:9], 1140 kb/s, 30 fps",
    "  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, stereo, fltp, 69 kb/s (default)"
  ];
  const m = V.parseProbe(real);
  eq(m.audioKbps, 69, "audio bitrate parsed from the Audio stream line");
  eq(m.w, 1920, "the video line is still read correctly alongside it");
  eq(V.parseProbe(["  Stream #0:0: Video: h264, 1920x1080, 1140 kb/s"]).audioKbps, 0,
     "a video-only file reports no audio bitrate rather than borrowing the video's");
  eq(V.parseProbe([]).audioKbps, 0, "empty log reports no audio bitrate");
}

/* (4) THE REAL FIX: a file that already fits is never re-encoded at all.
       This is a guard in the tool, before the engine is even downloaded. */
{
  ok(/ALREADY SMALL ENOUGH\? DO NOTHING/.test(vfxSrc),
     "the compressor short-circuits when the file already fits");
  ok(/if \(f\.size <= targetBytes\)/.test(vfxSrc),
     "the check is on the raw file size, so it costs nothing");
  ok(/blob: f, name: f\.name/.test(vfxSrc),
     "and hands back the ORIGINAL file untouched rather than a re-encode");
  const guardAt = vfxSrc.indexOf("targetBytes");
  const runAt = vfxSrc.indexOf("root.VKVideo.run");
  ok(guardAt > 0 && guardAt < runAt,
     "the guard runs BEFORE the 32 MB engine download, not after");
  ok(/Already under/.test(vfxSrc), "and says plainly that nothing was done");
}

ok(/SHRINK_MARGIN = 0\.92/.test(engSrc), "the shrink margin is a named, documented constant");
ok(/2\.89 MB/.test(engSrc), "the reported case is recorded in the source so it is not undone");

console.log(`videofx no-inflate v2: ${pass} total assertions passed`);


/* ---------------------------------------------------------------------------
 * SPEED: SCALE THE FRAME TO THE BITRATE
 *
 * The dominant cost of a wasm encode is output pixels. Measured here, Chrome,
 * single-threaded core, 8s 1080p source re-encoded at 800 kbps:
 *
 *     1080p 30.6s | 720p 19.9s | 540p 13.4s | 480p 11.4s | 360p 7.9s
 *
 * Squeezing a clip into 10 MB usually leaves a bitrate full resolution cannot
 * carry, so scaling down is faster AND better looking. A 60s 1080p clip into
 * 10 MB goes from ~406s to ~101s of encoding: 4x, with the picture improved
 * rather than sacrificed.
 * ------------------------------------------------------------------------- */
eq(V.heightForBitrate(5000), 0, "plenty of bitrate -> leave the frame alone");
eq(V.heightForBitrate(3000), 0, "1080p threshold is inclusive");
eq(V.heightForBitrate(2999), 720, "just under 1080p territory -> 720p");
eq(V.heightForBitrate(1400), 720, "720p threshold");
eq(V.heightForBitrate(1399), 540, "below 720p -> 540p");
eq(V.heightForBitrate(800), 540, "540p threshold");
eq(V.heightForBitrate(499), 360, "starved bitrate -> 360p");
eq(V.heightForBitrate(0), 0, "unknown bitrate caps nothing");
eq(V.heightForBitrate(-1), 0, "nonsense bitrate caps nothing");

/* The ladder must be monotonic — a higher bitrate can never yield a smaller
   frame, or the tool would look erratic across neighbouring inputs. */
let prevH = 0;
[100, 400, 600, 900, 1500, 2500, 4000].forEach(k => {
  const h = V.heightForBitrate(k) || 100000;   // 0 means "uncapped" = largest
  ok(h >= prevH, "ladder is monotonic at " + k + " kbps");
  prevH = h;
});

/* NEVER UPSCALE. A 480p source targeted generously must stay 480p. */
let r = V.buildCompressArgs("in.mp4", "out.mp4",
  { targetMB: 50, durationSec: 30, audioKbps: 128, height: 480, width: 854 });
eq(r.height, 0, "a small source is never scaled up to meet the ladder");
ok(!r.args.join(" ").includes("scale="), "no scale filter when none is needed");

/* A 1080p clip squeezed into 10 MB must come down. */
r = V.buildCompressArgs("in.mp4", "out.mp4",
  { targetMB: 10, durationSec: 60, audioKbps: 128, height: 1080, width: 1920 });
eq(r.height, 540, "60s of 1080p into 10 MB is encoded at 540p");
has(r.args, ["-vf", "scale=-2:540:flags=bilinear"], "scale filter uses even width and bilinear");
ok(r.args.indexOf("-vf") < r.args.indexOf("-c:v"), "the filter is an output option, before the codec");

/* bilinear, not lanczos: measured 11.4s vs 14.2s for the same 480p output,
   and at these sizes the difference is not visible. */
ok(!/lanczos/.test(r.args.join(" ")), "the compressor does not pay for lanczos");

/* Unknown source dimensions must not invent a scale filter. */
r = V.buildCompressArgs("in.mp4", "out.mp4",
  { targetMB: 10, durationSec: 60, audioKbps: 128 });
eq(r.height, 0, "no source height -> no scaling");
ok(!r.args.join(" ").includes("scale="), "no scale filter without dimensions");

/* --- workload estimate and the preset it chooses --- */
ok(V.estimateEncodeSeconds(1920, 1080, 30, 60) > V.estimateEncodeSeconds(960, 540, 30, 60),
   "a bigger frame is estimated to take longer");
eq(V.estimateEncodeSeconds(0, 0, 30, 60), 0, "unknown dimensions give no estimate");
eq(V.estimateEncodeSeconds(1920, 1080, 30, 0), 0, "unknown duration gives no estimate");
/* Calibrated against measured runs (66s for 20s of 1080p, 135s for 45s of
   1080p). The constant is deliberately pessimistic, so the estimate must sit
   above the measurement but not absurdly so. */
let e20 = V.estimateEncodeSeconds(1920, 1080, 30, 20);
ok(e20 > 66 && e20 < 66 * 2.5, "the 20s 1080p estimate brackets the 66s measured, on the safe side");
let e45 = V.estimateEncodeSeconds(1920, 1080, 30, 45);
ok(e45 > 135 && e45 < 135 * 2.5, "the 45s 1080p estimate brackets the 135s measured");

/* --- the speed/quality trade is the user's, not a heuristic's --- */
eq(V.encodePreset("balanced"), "veryfast", "balanced keeps the better preset");
eq(V.encodePreset("fast"), "superfast", "fast trades quality for ~1.4x");
eq(V.encodePreset(undefined), "veryfast", "no choice defaults to quality, never to the faster preset");
eq(V.encodePreset("nonsense"), "veryfast", "an unrecognised value defaults to quality");
eq(V.encodePreset(null), "veryfast", "null defaults to quality");

has(V.buildCompressArgs("in.mp4", "out.mp4",
  { targetMB: 10, durationSec: 60, audioKbps: 128, height: 1080, width: 1920, speed: "fast" }).args,
  ["-preset", "superfast"], "the fast choice reaches ffmpeg");
has(V.buildCompressArgs("in.mp4", "out.mp4",
  { targetMB: 10, durationSec: 60, audioKbps: 128, height: 1080, width: 1920 }).args,
  ["-preset", "veryfast"], "the default reaches ffmpeg");

/* The option must exist in the UI, or the engine parameter is unreachable. */
const speedOpt = (FX["compress-video"].options || []).find(o => o.k === "speed");
ok(speedOpt, "the compressor exposes an encoding-speed option");
eq(speedOpt.def, "balanced", "quality is the default, not speed");
eq(speedOpt.options.map(o => o.v).sort().join(","), "balanced,fast", "exactly the two documented choices");
ok(/speed: o\.speed/.test(vfxSrc), "the chosen speed is passed through to the builder");

/* --- the up-front time estimate is vague on purpose --- */
eq(V.roughTime(0), "", "no estimate when there is nothing to estimate");
eq(V.roughTime(Infinity), "", "no estimate from a non-finite workload");
eq(V.roughTime(30), "half a minute", "short jobs");
eq(V.roughTime(60), "a minute", "medium jobs");
eq(V.roughTime(120), "a couple of minutes", "longer jobs");
ok(/minutes$/.test(V.roughTime(400)), "long jobs are quoted in minutes");
[1, 10, 100, 1000, 10000].forEach(s => ok(typeof V.roughTime(s) === "string", "roughTime always returns a string for " + s));

console.log(`videofx speed: ${pass} total assertions passed`);

/* ---------------------------------------------------------------------------
 * PROGRESS MUST BE REAL
 *
 * The bar used to sit at 10% for the whole job and then jump to 100%, which on
 * a multi-minute encode is indistinguishable from a hang — the same complaint
 * that produced the "it keeps showing working" reports. The bar is now divided
 * between the phases, and the encode segment is driven by the timestamp ffmpeg
 * reports divided by the duration we probed for.
 * ------------------------------------------------------------------------- */
ok(/var P_DOWNLOAD_END = 0\.25/.test(engSrc), "the engine download owns a defined slice of the bar");
ok(/P_PROBE_END \+ f \* \(1 - P_PROBE_END\)/.test(engSrc), "the encode is mapped onto the remainder of the bar");
ok(/if \(f < seen\) return;\s*seen = f;/.test(engSrc),
   "progress never goes backwards, however ffmpeg reports its timestamps");
ok(/durSec > 0 && typeof e\.time === 'number'/.test(engSrc),
   "progress prefers the duration we probed over the core's own unreliable figure");
ok(/else if \(typeof e\.progress === 'number' && isFinite\(e\.progress\)\)/.test(engSrc),
   "and still falls back to the core's figure when we have no duration");
ok(/var frac = total \? got \/ total : Math\.min\(1, got \/ \(32 \* 1048576\)\)/.test(engSrc),
   "a missing content-length does not freeze the bar during the download");
ok(/estimateSec > 8/.test(engSrc), "long jobs announce roughly how long they will take");

const ftSrc2 = require("fs").readFileSync(require("path").join(__dirname, "../assets/js/filetool.js"), "utf8");
ok(/class: 'bar-pct'/.test(ftSrc2), "there is a percentage readout, not just a bar");
ok(/role: 'progressbar'/.test(ftSrc2) && /aria-valuenow/.test(ftSrc2),
   "the bar is announced to screen readers with its current value");
ok(/if \(pct !== lastPct\)/.test(ftSrc2),
   "the DOM is only touched when the number changes — this runs during an encode");
ok(/frac > 0\.08 && elapsed > 3/.test(ftSrc2),
   "no countdown until there is enough history for it to be honest");
ok(/progStart = 0; lastPct = -1;/.test(ftSrc2),
   "the ETA baseline resets between runs, so a second job is not timed from the first");

const cssSrc = require("fs").readFileSync(require("path").join(__dirname, "../assets/css/base.css"), "utf8");
ok(/\.bar-pct/.test(cssSrc) && /\.bar-eta/.test(cssSrc), "the readout is styled");
ok(/font-variant-numeric: tabular-nums/.test(cssSrc), "digits do not jitter as the number counts up");
ok(/prefers-reduced-motion/.test(cssSrc), "the filling animation respects reduced-motion");

console.log(`videofx progress: ${pass} total assertions passed`);




/* ---------------------------------------------------------------------------
 * A VIDEO COMPRESSOR, NOT A DISCORD COMPRESSOR
 *
 * The tool was built around Discord's upload tiers, which fixed it to one
 * mental model: "what number must this fit inside". Most people arriving at a
 * video compressor have no number in mind — they want the file smaller. That
 * needs CRF encoding, where quality is fixed and size falls out of the footage,
 * rather than a bitrate computed from a target.
 *
 * CRF alone can INFLATE an already-efficient file, which is exactly the bug a
 * user reported against the size-target path. So every level also carries a
 * hard ceiling derived from the source's own bitrate. These tests are mostly
 * about that guarantee holding in both modes.
 * ------------------------------------------------------------------------- */

/* --- the levels exist and are ordered --- */
["light", "balanced", "strong"].forEach(k => ok(V.LEVELS[k], "level '" + k + "' is defined"));
ok(V.LEVELS.light.crf < V.LEVELS.balanced.crf && V.LEVELS.balanced.crf < V.LEVELS.strong.crf,
   "CRF rises (quality falls) from Light through Strong");
ok(V.LEVELS.light.ratio > V.LEVELS.balanced.ratio && V.LEVELS.balanced.ratio > V.LEVELS.strong.ratio,
   "the bitrate ceiling tightens from Light through Strong");
V_ratioSane();
function V_ratioSane() {
  ["light", "balanced", "strong"].forEach(k => {
    const r = V.LEVELS[k].ratio;
    ok(r > 0 && r < 1, "level '" + k + "' ceiling is a real reduction, not >= source (" + r + ")");
  });
}

/* --- quality mode produces a CRF encode, not a bitrate one --- */
let q = V.buildQualityArgs("in.mp4", "out.mp4",
  { level: "balanced", durationSec: 60, audioKbps: 128, sourceKbps: 8000,
    sourceAudioKbps: 192, height: 1080, width: 1920 });
ok(!q.error, "quality mode builds without a size target");
eq(q.mode, "quality", "it reports which mode it used");
has(q.args, ["-crf", "27"], "balanced encodes at CRF 27");
ok(!q.args.join(" ").includes("-b:v"), "quality mode sets no target video bitrate");
has(q.args, ["-c:v", "libx264"], "quality mode still outputs H.264");
has(q.args, ["-movflags", "+faststart"], "output stays streamable");

/* The ceiling: 8000 * 0.55 = 4400, minus 128 audio = 4272. */
has(q.args, ["-maxrate", "4272k"], "the ceiling is a fraction of the SOURCE bitrate, got " + q.maxKbps);
eq(q.maxKbps, 4272, "the ceiling is reported for the UI");

/* --- the no-inflate guarantee, which is the whole point --- */
["light", "balanced", "strong"].forEach(level => {
  const r = V.buildQualityArgs("in.mp4", "out.mp4",
    { level: level, durationSec: 60, audioKbps: 128, sourceKbps: 1000,
      sourceAudioKbps: 128, height: 720, width: 1280 });
  const total = r.maxKbps + r.audioKbps;
  ok(total < 1000, "level '" + level + "': video+audio ceiling " + total +
     " kbps stays under the 1000 kbps source");
});

/* An already-efficient source is the case that used to inflate: a low source
   bitrate must drive the ceiling down with it, not sit at some fixed floor. */
let tight = V.buildQualityArgs("in.mp4", "out.mp4",
  { level: "light", durationSec: 30, audioKbps: 192, sourceKbps: 400,
    sourceAudioKbps: 64, height: 480, width: 854 });
eq(tight.audioKbps, 64, "audio is never re-encoded above the source's own 64 kbps");
ok(tight.maxKbps + tight.audioKbps < 400,
   "even at Light, the ceiling stays under a 400 kbps source (got " +
   (tight.maxKbps + tight.audioKbps) + ")");

/* --- an unreadable source bitrate must not block the job --- */
let nocap = V.buildQualityArgs("in.mp4", "out.mp4",
  { level: "balanced", durationSec: 60, audioKbps: 128, height: 720, width: 1280 });
ok(!nocap.error, "no source bitrate is not an error");
eq(nocap.maxKbps, 0, "no ceiling when there is nothing to take a fraction of");
ok(!nocap.args.join(" ").includes("-maxrate"), "and no -maxrate flag is emitted");
has(nocap.args, ["-crf", "27"], "the CRF encode still runs");

/* --- Strong caps the frame; Light and Balanced leave it alone --- */
let strong = V.buildQualityArgs("in.mp4", "out.mp4",
  { level: "strong", durationSec: 60, audioKbps: 128, sourceKbps: 20000,
    sourceAudioKbps: 256, height: 1080, width: 1920 });
eq(strong.height, 720, "Strong caps a 1080p source at 720p");
ok(strong.args.join(" ").includes("scale=-2:720"), "and emits the scale filter");
let light = V.buildQualityArgs("in.mp4", "out.mp4",
  { level: "light", durationSec: 60, audioKbps: 128, sourceKbps: 20000,
    sourceAudioKbps: 256, height: 1080, width: 1920 });
eq(light.height, 0, "Light keeps the original frame size");
ok(!light.args.join(" ").includes("scale="), "and emits no scale filter");
/* Never upscale: a 480p source must not be stretched to the 720p cap. */
let noUpscale = V.buildQualityArgs("in.mp4", "out.mp4",
  { level: "strong", durationSec: 60, audioKbps: 128, sourceKbps: 20000,
    sourceAudioKbps: 256, height: 480, width: 854 });
eq(noUpscale.height, 0, "Strong never upscales a source already below the cap");

/* An unknown level must not crash or silently pick the harshest setting. */
["", null, undefined, "nonsense", "fit10"].forEach(bad => {
  const r = V.buildQualityArgs("in.mp4", "out.mp4",
    { level: bad, durationSec: 60, audioKbps: 128, sourceKbps: 5000, height: 720, width: 1280 });
  eq(r.crf, V.LEVELS.balanced.crf, "unknown level '" + bad + "' falls back to Balanced");
  eq(r.level, "balanced", "and reports that it did");
});

console.log(`videofx quality-levels: ${pass} total assertions passed`);

/* ---------------------------------------------------------------------------
 * THE UI OFFERS BOTH MODELS
 * ------------------------------------------------------------------------- */
const lvl = (FX["compress-video"].options || []).find(o => o.k === "level");
ok(lvl, "the compressor exposes a compression-level option");
eq(lvl.def, "balanced", "Balanced is the default, not a size target");
const vals = lvl.options.map(o => o.v);
["light", "balanced", "strong"].forEach(v => ok(vals.includes(v), "quality level '" + v + "' is offered"));
["fit10", "fit25", "fit50", "fit100", "fit500"].forEach(v => ok(vals.includes(v), "size target '" + v + "' is offered"));
ok(vals.indexOf("light") < vals.indexOf("fit10"),
   "quality levels come before size targets — the common case is listed first");
/* Every fit* value must parse with the same regex the tool uses, or the target
   silently becomes 0 and the encode runs in the wrong mode. */
vals.filter(v => /^fit/.test(v)).forEach(v => {
  const m = /^fit(\d+)$/.exec(v);
  ok(m && parseInt(m[1], 10) > 0, "'" + v + "' parses to a real target size");
});
ok(!vals.some(v => v === 10 || v === 50 || v === 500),
   "the bare numeric Discord tiers are gone");

/* No Discord framing left in the tool's own copy. One mention as a label for
   the 10 MB target is fine and useful; the tool must not be ABOUT Discord. */
const compressSrc = vfxSrc.slice(vfxSrc.indexOf("'compress-video'"), vfxSrc.indexOf("'trim-video'"));
const discordHits = (compressSrc.match(/Discord/g) || []).length;
ok(discordHits <= 1, "at most one Discord mention survives in the compressor, found " + discordHits);
ok(!/Ready to drop into Discord|Ready for Discord/.test(compressSrc),
   "the result copy no longer assumes Discord");

/* The catalog must match. */
const cv = VK.TOOLS.find(t => t.id === "compress-video");
ok(cv, "the catalog has compress-video");
ok(!VK.TOOLS.some(t => t.id === "compress-for-discord"), "and no longer has compress-for-discord");
ok(!/discord/i.test(cv.name), "the tool name does not mention Discord");
ok(/compress|shrink/i.test(cv.desc), "the description says what it does");

console.log(`videofx compressor UI: ${pass} total assertions passed`);

/* ---------------------------------------------------------------------------
 * BIG FILES: MOUNTED, NOT COPIED
 *
 * The 200 MB ceiling existed because writeFile copied the whole input into the
 * same wasm heap the encoder works in — a 500 MB cap was tried before that and
 * reliably died of out-of-memory mid-encode. WORKERFS mounts the File and reads
 * it on demand instead, so the input stops competing for heap.
 * ------------------------------------------------------------------------- */
const engSrc2 = require("fs").readFileSync(require("path").join(__dirname, "../assets/js/videoengine.js"), "utf8");
ok(/ff\.mount\('WORKERFS'/.test(engSrc2), "the engine mounts the input rather than copying it");
ok(/catch \(e\) \{ mountedPath = ''; mountDir = ''; \}/.test(engSrc2),
   "a mount failure falls back to the copy path instead of throwing");
ok(/okMount === false/.test(engSrc2),
   "mount() returning false is handled — it does not throw when the FS is missing");
ok(/file && file\.name/.test(engSrc2), "a nameless Blob cannot be mounted and takes the copy path");
ok(/file\.size > MEMFS_SAFE_BYTES/.test(engSrc2),
   "the copy fallback still refuses files too big for it, rather than OOM-ing");
ok(V.MEMFS_SAFE_BYTES === 200 * 1024 * 1024,
   "the copy-path ceiling stays at the 200 MB that was measured to work");
ok(FX["compress-video"].maxBytes > V.MEMFS_SAFE_BYTES,
   "the tool accepts more than the copy path alone could handle");
ok(FX["compress-video"].maxBytes === 2 * 1024 * 1024 * 1024, "the ceiling is 2 GB");

/* Cleanup must survive an error, or a failed run leaves the input in the VFS
   and the NEXT run starts with the heap already occupied. */
ok(/\} finally \{[\s\S]*ff\.unmount\(mountDir\)/.test(engSrc2),
   "the mount is released in a finally block, not on the success path");
ok(/\} finally \{[\s\S]*deleteFile\(outName\)/.test(engSrc2),
   "the output is deleted in finally too");

/* --- remapInput: the builders are handed a name before the path is known --- */
eq(V.remapInput(["-i", "in.mp4", "-y", "out.mp4"], "in.mp4", "/vkin/My Clip.mp4"),
   ["-i", "/vkin/My Clip.mp4", "-y", "out.mp4"], "the input path is swapped");
eq(V.remapInput(["-i", "in.mp4", "-vf", "scale=-2:720"], "in.mp4", "/vkin/a.mp4"),
   ["-i", "/vkin/a.mp4", "-vf", "scale=-2:720"], "filter strings are untouched");
/* Exact match only — a substring replace would corrupt a filter that happened
   to contain the name, and would rewrite the OUTPUT name too. */
eq(V.remapInput(["-i", "in.mp4", "-y", "in.mp4.out.mp4"], "in.mp4", "/vkin/a.mp4"),
   ["-i", "/vkin/a.mp4", "-y", "in.mp4.out.mp4"], "only whole-element matches are replaced");
eq(V.remapInput(["-i", "in.mp4"], "in.mp4", ""), ["-i", "in.mp4"], "no target path is a no-op");
eq(V.remapInput(null, "in.mp4", "/x"), null, "missing args is a no-op");

/* Every builder must keep emitting the input name as its own argv element, or
   remapInput cannot find it and a mounted run would reference a missing file. */
[["buildCompressArgs", { targetMB: 10, durationSec: 60, audioKbps: 128 }],
 ["buildQualityArgs", { level: "balanced", durationSec: 60, audioKbps: 128 }],
 ["buildTrimArgs", { start: 0, duration: 5 }],
 ["buildReframeArgs", {}],
 ["buildMuteArgs", undefined],
 ["buildExtractAudioArgs", { format: "mp3" }],
 ["buildConvertArgs", {}],
 ["buildResizeArgs", { height: 720 }],
 ["buildLoopArgs", { count: 2 }],
 ["buildVolumeArgs", { percent: 50 }]].forEach(([fn, opt]) => {
  const built = V[fn]("in.mp4", "out.mp4", opt);
  if (!built || !built.args) return;
  ok(built.args.indexOf("in.mp4") !== -1,
     fn + " emits the input name as a standalone argv element");
});

console.log(`videofx large files: ${pass} total assertions passed`);

/* ---------------------------------------------------------------------------
 * THE NO-INFLATE GUARANTEE HOLDS ALL THE WAY DOWN
 *
 * Capping audio at the source's own rate is not enough, because that rate is
 * frequently unreadable and the requested 128 kbps then stands regardless of
 * how small the source is. Measured before the fix: a 100 kbps source produced
 * a 178 kbps ceiling. Audio now takes at most half the budget.
 * ------------------------------------------------------------------------- */
[5000, 2000, 1000, 400, 200, 100, 60, 50].forEach(src => {
  ["light", "balanced", "strong"].forEach(level => {
    /* sourceAudioKbps deliberately omitted — the unreadable case is the one
       that broke, and it is the common one for odd containers. */
    const r = V.buildQualityArgs("in.mp4", "out.mp4",
      { level: level, durationSec: 60, audioKbps: 128, height: 480, width: 854, sourceKbps: src });
    const total = r.maxKbps + r.audioKbps;
    ok(total < src, level + " on a " + src + " kbps source stays under it (got " + total + ")");
  });
});

/* Audio must still be usable, not squeezed to nothing on a normal file. */
let normal = V.buildQualityArgs("in.mp4", "out.mp4",
  { level: "balanced", durationSec: 60, audioKbps: 128, height: 1080, width: 1920,
    sourceKbps: 8000, sourceAudioKbps: 192 });
eq(normal.audioKbps, 128, "a healthy source still gets the audio rate the user asked for");
eq(normal.maxKbps, 4272, "and the video ceiling is unchanged by the audio guard");

/* The half-the-budget rule must not override the source-rate cap, which is the
   tighter of the two on a normal file with a quiet audio track. */
let quiet = V.buildQualityArgs("in.mp4", "out.mp4",
  { level: "light", durationSec: 60, audioKbps: 192, height: 720, width: 1280,
    sourceKbps: 4000, sourceAudioKbps: 64 });
eq(quiet.audioKbps, 64, "the source's own 64 kbps audio still wins over the requested 192");

console.log(`videofx no-inflate v3: ${pass} total assertions passed`);
