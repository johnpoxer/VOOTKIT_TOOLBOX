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

/* --- capability report is honest --- */
const cap = V.capability();
ok(typeof cap.ok === "boolean", "capability returns ok flag");

/* --- catalog: 7 tools live, in video category, all local processing --- */
const ids = Object.keys(FX);
ok(ids.length === 7, "7 videofx tools");
ids.forEach(id => {
  const t = VK.find(id);
  ok(t && t.status === "live", id + " live");
  ok(t.cat === "video", id + " in video");
  ok(t.processing === "local", id + " local");
  ok(typeof FX[id].process === "function", id + " has process()");
});

console.log(`videofx: ${pass} assertions passed`);
