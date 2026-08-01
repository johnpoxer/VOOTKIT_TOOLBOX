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
ok(/function run\(file, inName, outName, built, onProgress, onStatus\)/.test(engSrc),
   "run() accepts a status channel");
ok(/say\('Converting…'\)/.test(engSrc), "the convert phase is announced separately from the download");
ok(/await ff\.writeFile\(inName, await util\.fetchFile\(file\)\)/.test(engSrc),
   "run() still writes the input file before exec");

const ftSrc = require("fs").readFileSync(require("path").join(__dirname, "../assets/js/filetool.js"), "utf8");
ok(/status: function \(msg\)/.test(ftSrc), "filetool exposes a status channel to tools");

const withStatus = (vfxSrc.match(/api\.progress, api\.status\)/g) || []).length;
ok(runCalls.length === withStatus, `all ${runCalls.length} VKVideo.run call sites pass the status channel (got ${withStatus})`);

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

