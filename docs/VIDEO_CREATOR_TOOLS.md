# Video, Streamer, Clipper & Gamer Tools — Research & Plan (July 2026)

---

## 1. The honest monetisation reality (read this first)

**Gaming and streaming are among the *lowest*-paying ad niches.**

| Niche | Display RPM |
|---|---|
| Finance | **$28–40** |
| Tech | $18–25 |
| Health | $8–15 |
| **Gaming / streaming** | **$2–6** (YouTube gaming RPM $2–5; gameplay CPM ~$1.40) |

A mobile-game advertiser pays ~$2 CPM; a finance advertiser pays $50+. So **do not build gamer tools expecting AdSense income** — per visitor they earn roughly a tenth of a mortgage calculator.

**But build them anyway, for three better reasons:**

1. **Frequency and habit.** A streamer clips *daily*. A person uses a mortgage calculator once every five years. Gamers are the returning-user engine — exactly what §5 of the platform strategy said we lack.
2. **This is where "no upload" is a genuine speed win, not just a privacy one.** Uploading a 500 MB clip to a competitor means a long upload on a home connection, a server queue, then a download. Doing it locally skips all three. For big video files, **client-side is simply faster** — that's a demo-able advantage, not a marketing claim.
3. **Better-fitting monetisation than display:** hardware affiliate (capture cards, mics, webcams, SSDs) converts well with this audience, and it sidesteps the low display RPM.

**Conclusion:** gamer/streamer tools = **audience + retention + affiliate**. Finance tools = **display revenue**. Keep the barbell.

---

## 2. Validated demand

Every tool below already has dedicated single-purpose sites ranking for it — proof of demand, and proof nobody has bundled it well:

- **"Compress video for Discord"** — Discord cut the free upload limit to **10 MB** (down from 25 MB in 2024); Nitro Basic 50 MB, Nitro 500 MB. Whole sites exist purely for this (vid-crush, 1mbcompress, compresto). Recommended target: 720p, 2–3 Mbps, 30 fps, H.264/AAC in MP4.
- **Bitrate calculators** — bitratecalculator.org, Hexeum, obsmaskgenerator all rank for OBS/Twitch/YouTube/Kick settings.
- **Overlay / panel / banner makers** — Canva, OWN3D, StreamMaker, Hexeum.
- **Clipping** — Eklipse, Medal, Outplayed, Streamlabs Highlighter dominate AI clipping; CapCut is used for vertical reframing and captions.

**Our angle:** they're all separate sites, most require sign-up, and the video ones upload your footage. We bundle them, free, no account, processed locally.

---

## 3. Technical approach — and its honest limits

Today's `video-trim` uses `MediaRecorder` real-time re-encoding: a 5-minute clip takes 5 minutes. **That is not good enough for streamers** and must be replaced.

**Engine plan:**
- **Primary: WebCodecs API** — hardware-accelerated encode/decode in the browser. Fast (near-native), supported in Chromium browsers. This is the right 2026 engine.
- **Fallback: ffmpeg.wasm** (LGPL — cleared in `OPEN_SOURCE_COMPONENTS.md`) for browsers without WebCodecs and for formats WebCodecs won't touch. Heavier (~30 MB, lazy-loaded only when needed).
- **Honest ceiling:** browser memory caps realistically limit us to clips up to a few hundred MB. Multi-GB VOD editing belongs in DaVinci/OBS, and we should say so rather than fail silently.

---

## 4. Tool plan

### 4a. Zero-processing tools (cheap to build, fast, rank easily)
These need no video engine at all — pure math, canvas, or a styled HTML page:

1. **Streaming bitrate calculator** — upload speed + resolution + fps → recommended bitrate, per platform (Twitch/YouTube/Kick), x264 vs NVENC notes
2. **Discord/upload size estimator** — target size + duration → required bitrate
3. **Aspect-ratio & resolution calculator**
4. **Stream asset sizer** — Twitch banner/avatar/panel, YouTube thumbnail/banner, correct dimensions with export
5. **Discord emote / sticker resizer** (128×128 and sticker limits)
6. **Thumbnail text/title A-B previewer** — see how a title truncates on YouTube/Twitch cards
7. **BRB / countdown overlay page** — a styled URL you drop straight into OBS as a Browser Source (genuinely clever, zero processing)
8. **Stream schedule image maker**
9. **Colour palette from a game screenshot** (we already have the extractor engine)
10. **Upload-time estimator** (file size ÷ upload speed)

### 4b. Video-processing tools (WebCodecs)
11. **Compress for Discord** — one-click 10 MB / 50 MB / 500 MB presets ← *the flagship*
12. **Clip trimmer** (rebuild on WebCodecs — replaces today's slow version)
13. **Vertical reframe 9:16** for Shorts / TikTok / Reels, with subject-centred crop
14. **Video → GIF**
15. **Frame grabber / thumbnail extractor** (pull a still for a thumbnail)
16. **Mute or strip audio** (avoids copyright strikes on clips)
17. **Extract audio** (MP3/WAV)
18. **Speed / slow-mo adjuster**
19. **Merge clips**
20. **Watermark / logo overlay**
21. **Auto-captions** — reuse the existing on-device Whisper tool, output burned-in or SRT

---

## 5. Build order

| Wave | Tools | Why |
|---|---|---|
| **1** | Bitrate calculator, Discord size estimator, asset sizer, emote resizer, aspect-ratio calc, BRB overlay | No engine needed — ship fast, start ranking, prove the niche |
| **2** | Compress-for-Discord, WebCodecs clip trimmer, frame grabber, mute/extract audio | The flagship value; replaces the slow trimmer |
| **3** | Vertical reframe, GIF, merge, speed, watermark, captions | Rounds out the suite |

Wave 1 is deliberately first: it's cheap, it validates the niche with real traffic, and none of it depends on the video engine landing.

---

## 6. Positioning for this audience

> **"Clip it, shrink it, post it — without uploading a thing."**
> Your 500 MB clip never leaves your PC. No queue, no account, no watermark.

Add an honest capability note on every video tool: what size it handles well, and when to use a desktop editor instead. Streamers are technical — over-claiming loses them instantly.

---

## Sources

- [Discord file size limits 2026 (10 MB free / 50 / 500)](https://filesize.org/limits/discord/)
- [Compress video for Discord — settings guide](https://filesize.org/guides/compress-video-for-discord/)
- [Discord video compressor tools](https://vid-crush.com/pages/discord/)
- [YouTube RPM by niche USA 2026 — finance $40, gaming $5](https://fluxnote.io/guides/youtube-rpm-by-niche-usa-2026)
- [Display ad RPM by niche 2026](https://toolsignal.site/articles/blog-display-ad-rpm-by-niche-2026)
- [Most profitable YouTube niches by CPM](https://www.tastyedits.com/most-profitable-youtube-niches/)
- [Best free game clipping software 2026](https://blerp.com/blog/post/best-free-game-clipping-software-2026)
- [Best free AI clip makers for streamers 2026](https://blog.eklipse.gg/tools/free-ai-clip-maker-streamers.html)
- [Bitrate calculator for streaming](https://bitratecalculator.org/)
- [Hexeum streamer tools (bitrate, panel maker)](https://app.hexeum.net/tools/bitrate-calculator)
- [AntiScuff tools for streamers](https://antiscuff.com/tools/)
