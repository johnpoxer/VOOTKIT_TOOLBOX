/* video.test.js — streamer calculators verified against hand-computed values. */
"use strict";
const assert = require("assert");
global.window = global;
require("../assets/js/calc.js");
const T = require("../assets/js/tools-video.js");
const VK = require("../data/catalog.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };

/* bitrate: 10 min into 25 MB, 128 kbps audio.
   total_bits = 25*1048576*8 = 209,715,200 ; /600s/1000 = 349.526 kbps total
   video = 349.526 - 128 = 221.5 ; *0.97 headroom = 214.9 -> "215 kbps" */
let r = T["bitrate-calculator"].compute({ mins: 10, size: 25, audio: 128 });
ok(/215 kbps/.test(r.headline.value), "bitrate 10min/25MB/128 -> ~215 kbps, got " + r.headline.value);
ok(/350/.test(r.stats[1].value), "total incl audio ~350 kbps, got " + r.stats[1].value);

/* impossible budget: audio alone exceeds it (1 min, 1 MB, 320 kbps)
   total = 1*1048576*8/60/1000 = 139.8 kbps < 320 -> "Too small" */
r = T["bitrate-calculator"].compute({ mins: 1, size: 1, audio: 320 });
ok(/Too small/.test(r.headline.value), "tiny budget flagged, got " + r.headline.value);

/* upload: 500 MB at 10 Mbps.
   bits = 500*1048576*8 = 4,194,304,000 ; /10e6 = 419.4s = 6m59s best
   realistic /0.8 = 524.3s = 8m44s */
r = T["upload-time"].compute({ size: 500, speed: 10 });
ok(/6m 59s|7m 0s/.test(r.stats[0].value), "best-case ~6m59s, got " + r.stats[0].value);
ok(/8m 4\ds/.test(r.stats[1].value), "realistic ~8m44s, got " + r.stats[1].value);
ok(/1\.25 MB\/s/.test(r.stats[2].value), "10 Mbps = 1.25 MB/s, got " + r.stats[2].value);

/* asset sizer: known specs */
r = T["stream-asset-sizer"].compute({ asset: "yt-thumb" });
ok(/1,?280 × 720 px/.test(r.headline.value), "YT thumb 1280x720, got " + r.headline.value);
ok(/16:9/.test(r.headline.sub), "YT thumb 16:9");
r = T["stream-asset-sizer"].compute({ asset: "tw-emote" });
ok(/112 × 112 px/.test(r.headline.value), "Twitch emote 112, got " + r.headline.value);
r = T["stream-asset-sizer"].compute({ asset: "x-header" });
ok(/1,?500 × 500 px/.test(r.headline.value) && /3:1/.test(r.headline.sub), "X header 1500x500 3:1");

/* every asset option produces clean output */
T["stream-asset-sizer"].fields[0].options.forEach(o => {
  const out = T["stream-asset-sizer"].compute({ asset: o.v });
  ok(out.headline && /[\d,]+ × [\d,]+ px/.test(out.headline.value) && !/NaN|undefined/.test(JSON.stringify(out)), o.v + " clean");
});

/* catalog integrity: the 3 calc tools live + wired */
["bitrate-calculator", "upload-time", "stream-asset-sizer"].forEach(id => {
  const t = VK.find(id);
  ok(t && t.status === "live" && t.cat === "video", id + " live in video category");
  ok(Array.isArray(T[id].fields) && T[id].fields.length, id + " has fields");
});
/* emote-resizer lives in the image module but the video category */
const em = VK.find("emote-resizer");
ok(em && em.status === "live", "emote-resizer live");

console.log(`video: ${pass} assertions passed`);
