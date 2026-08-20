/* tools-video.js — streamer/creator calculators on the VKCalc engine.
 * Pure maths + lookups, no media processing, no heavy library. The clips-and-
 * encoding tools (compress-video, trim, gif) come later on WebCodecs.
 * Every formula here is unit-tested in test/video.test.js. */
(function (root) {
  'use strict';

  function kbps(n) { return Math.round(n).toLocaleString() + ' kbps'; }
  function mbps(n) { return (n / 1000).toFixed(2).replace(/\.00$/, '') + ' Mbps'; }
  function clock(sec) {
    if (!isFinite(sec) || sec < 0) return '—';
    sec = Math.round(sec);
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h) return h + 'h ' + m + 'm ' + s + 's';
    if (m) return m + 'm ' + s + 's';
    return s + 's';
  }

  /* Platform asset specs — current, well-established sizes.
     [width, height, note, maxFile] */
  var ASSETS = {
    'yt-thumb':     [1280, 720, 'YouTube requires 16:9, min 640px wide.', '2 MB (JPG/PNG)'],
    'yt-banner':    [2560, 1440, 'Safe area (always visible): 1546 × 423 centred.', '6 MB'],
    'yt-avatar':    [800, 800, 'Square; shown as a circle.', '4 MB'],
    'tw-banner':    [1200, 480, 'Twitch profile banner, 5:2.', '10 MB'],
    'tw-avatar':    [256, 256, 'Square; shown as a circle. Min 200 × 200.', '10 MB'],
    'tw-panel':     [320, 100, 'Info panels under your stream.', '2.9 MB'],
    'tw-offline':   [1920, 1080, 'Offline/“video player” banner, 16:9.', '10 MB'],
    'tw-emote':     [112, 112, 'Upload at 112px; Twitch generates 56 & 28.', '1 MB (PNG)'],
    'dc-icon':      [512, 512, 'Discord server icon, square.', '10 MB'],
    'dc-banner':    [960, 540, 'Discord server banner, 16:9.', '10 MB'],
    'dc-emote':     [128, 128, 'Discord custom emoji, square.', '256 KB'],
    'x-header':     [1500, 500, 'X/Twitter profile header, 3:1.', '2 MB'],
    'ig-post':      [1080, 1080, 'Instagram square feed post.', '30 MB'],
    'ig-story':     [1080, 1920, 'Stories / Reels, 9:16.', '30 MB'],
    'tiktok':       [1080, 1920, 'TikTok full-screen, 9:16.', '—']
  };
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function ratio(w, h) { var g = gcd(w, h); return (w / g) + ':' + (h / g); }

  var TOOLS = {

    'bitrate-calculator': {
      fields: [
        { k: 'mins', label: 'Video length (minutes)', def: 10, min: 0.1, step: 0.1, hint: 'Use decimals — 1.5 = 1 min 30 s.' },
        { k: 'size', label: 'Target file size (MB)', def: 25, min: 1, step: 1, hint: 'Discord: 10, 50 (Nitro Basic), 500 (Nitro).' },
        { k: 'audio', label: 'Audio bitrate', type: 'select', def: 128,
          options: [{ v: 96, label: '96 kbps (voice)' }, { v: 128, label: '128 kbps (standard)' }, { v: 192, label: '192 kbps' }, { v: 256, label: '256 kbps' }, { v: 320, label: '320 kbps (music)' }] }
      ],
      compute: function (v) {
        var sec = v.mins * 60;
        if (!(sec > 0) || !(v.size > 0)) return {
          headline: { label: 'Target video bitrate', value: '—', sub: 'Enter a duration and file size above zero.' },
          note: 'A bitrate needs both a real running time and a target file size.'
        };
        var totalBits = v.size * 1048576 * 8;          // MB (MiB) → bits
        var totalKbps = totalBits / sec / 1000;        // → kbps (decimal)
        var videoKbps = totalKbps - v.audio;
        var safeKbps = videoKbps * 0.97;               // ~3% container headroom
        if (videoKbps <= 0) {
          return {
            headline: { label: 'Target video bitrate', value: 'Too small', sub: 'Audio alone (' + v.audio + ' kbps) exceeds this budget.' },
            note: 'Raise the size, shorten the clip, or drop the audio bitrate.'
          };
        }
        return {
          headline: { label: 'Target video bitrate', value: kbps(safeKbps), sub: 'to fit ' + v.size + ' MB in ' + clock(sec) },
          stats: [
            { label: 'Video (with headroom)', value: mbps(safeKbps) },
            { label: 'Total incl. audio', value: kbps(totalKbps) },
            { label: 'Audio', value: v.audio + ' kbps' }
          ],
          note: 'Set your encoder to this video bitrate (CBR or 2-pass VBR). The 3% headroom covers container overhead so you don’t overshoot the limit. For live streaming, cap by your upload speed instead.'
        };
      }
    },

    'upload-time': {
      fields: [
        { k: 'size', label: 'File size (MB)', def: 500, min: 1, step: 1 },
        { k: 'speed', label: 'Upload speed (Mbps)', def: 10, min: 0.1, step: 0.1, hint: 'Your UPLOAD speed, not download — usually much lower.' }
      ],
      compute: function (v) {
        var bits = v.size * 1048576 * 8;
        var theo = bits / (v.speed * 1e6);             // seconds, ideal
        var real = theo / 0.8;                         // ~80% usable in practice
        return {
          headline: { label: 'Realistic upload time', value: clock(real), sub: v.size + ' MB at ' + v.speed + ' Mbps' },
          stats: [
            { label: 'Best case (100%)', value: clock(theo) },
            { label: 'Typical (~80%)', value: clock(real) },
            { label: 'Throughput', value: (v.speed / 8).toFixed(2) + ' MB/s' }
          ],
          note: 'Real transfers rarely hit rated speed — TCP overhead, Wi-Fi and the server all take a cut, so the ~80% figure is the one to plan around. Wired beats Wi-Fi for big uploads.'
        };
      }
    },

    'stream-asset-sizer': {
      fields: [
        { k: 'asset', label: 'What are you making?', type: 'select', def: 'yt-thumb', wide: true,
          options: [
            { v: 'yt-thumb', label: 'YouTube — thumbnail' },
            { v: 'yt-banner', label: 'YouTube — channel banner' },
            { v: 'yt-avatar', label: 'YouTube — profile picture' },
            { v: 'tw-banner', label: 'Twitch — profile banner' },
            { v: 'tw-avatar', label: 'Twitch — profile picture' },
            { v: 'tw-panel', label: 'Twitch — info panel' },
            { v: 'tw-offline', label: 'Twitch — offline banner' },
            { v: 'tw-emote', label: 'Twitch — emote' },
            { v: 'dc-icon', label: 'Discord — server icon' },
            { v: 'dc-banner', label: 'Discord — server banner' },
            { v: 'dc-emote', label: 'Discord — custom emoji' },
            { v: 'x-header', label: 'X / Twitter — header' },
            { v: 'ig-post', label: 'Instagram — feed post' },
            { v: 'ig-story', label: 'Instagram — story / reel' },
            { v: 'tiktok', label: 'TikTok — full screen' }
          ] }
      ],
      compute: function (v) {
        var a = ASSETS[v.asset] || ASSETS['yt-thumb'];
        var w = a[0], h = a[1];
        return {
          headline: { label: 'Exact size', value: w.toLocaleString() + ' × ' + h.toLocaleString() + ' px', sub: 'aspect ratio ' + ratio(w, h) },
          stats: [
            { label: 'Width', value: w + ' px' },
            { label: 'Height', value: h + ' px' },
            { label: 'Max file', value: a[3] }
          ],
          note: a[2] + ' Export at exactly these pixels so the platform doesn’t re-compress and blur it.'
        };
      }
    }

  };

  root.VKVideoTools = TOOLS;
  if (typeof module === 'object' && module.exports) module.exports = TOOLS;

  function boot() {
    var host = document.getElementById('workspace');
    if (!host || !root.VKCalc) return;
    if (host.querySelector('.calc-form')) return;
    var spec = TOOLS[host.getAttribute('data-tool')];
    if (spec) root.VKCalc.mount(host, spec);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
