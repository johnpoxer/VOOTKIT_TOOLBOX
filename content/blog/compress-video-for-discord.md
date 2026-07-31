---
title: "How to Compress a Video for Discord (Without It Looking Terrible)"
date: "2026-07-31"
description: "Discord's upload limits, the maths behind hitting them, and which settings to cut first so your clip still looks sharp. Runs in your browser — nothing uploaded."
thumbnail: "/assets/blog/welcome.svg"
author: "The Vootkit team"
---

You've got the clip. It's 94 MB. Discord wants 10.

The instinct is to hammer the quality slider until the number goes down, which is exactly how you end up with a smeary mess. There's a better order of operations, and it starts with knowing what you're actually working with.

## Discord's actual limits

| Plan | Upload limit |
|---|---|
| Free | **10 MB** |
| Nitro Basic | **50 MB** |
| Nitro | **500 MB** |

Two things worth knowing. Discord raised the free limit from 8 MB to 25 MB in 2022, then settled it at 10 MB — a lot of guides still quote 8, so if you've been working to that number you had less headroom than you needed.

Second: **boosted servers used to raise the limit for everyone in them.** That changed. The limit now follows the *uploader's* plan, not the server's. If your clip used to fit in a friend's boosted server and suddenly doesn't, that's why.

## The only equation that matters

File size is bitrate × duration. That's it.

```
size (MB) ≈ bitrate (Mbps) × duration (seconds) ÷ 8
```

A 60-second clip at 8 Mbps is about 60 MB. To fit that same minute into 10 MB you need roughly 1.3 Mbps — a six-fold cut.

This is why the answer is never one setting. You're looking for the combination of changes that gets you to a target bitrate while giving up the least you'll actually notice.

Our [Compress for Discord](/tools/video/compress-for-discord/) tool works backwards from this: you pick the target size, it computes the bitrate that fits and encodes to it. No guessing at a quality number and re-trying.

## What to cut, in order

Cut in this order. Each step costs less than the one after it.

### 1. Trim the dead air — costs nothing

Size scales linearly with duration. Cut a 40-second clip to 25 seconds and you've removed 37% of the file **at full quality**.

Most gameplay clips have three or four seconds of nothing at each end — you reacting before the moment, you sitting there after it. That's often the whole gap between 12 MB and 9 MB.

This is the only step on this list that is genuinely free. Do it first, every time. ([Video Trimmer](/tools/video/trim-video/))

### 2. Drop the frame rate — costs little

60 fps to 30 fps roughly **halves the frames** the encoder has to store. In practice you save 30–40%, not a clean 50%, because consecutive frames share a lot of data.

Whether you notice depends entirely on content. Slow camera pans, talking, most desktop capture: you won't. Fast flick shots in a shooter, high-speed racing: you might.

Worth remembering that most people watching a Discord clip are looking at a small embed, often on a phone. 30 fps is what the majority of video on the internet runs at.

### 3. Drop the resolution — costs some

Resolution is the big multiplier, because pixel count scales with the *square* of the dimension:

| Change | Pixels removed |
|---|---|
| 1440p → 1080p | 44% fewer |
| 1080p → 720p | 56% fewer |
| 1440p → 720p | 75% fewer |

A Discord embed is typically displayed a few hundred pixels wide until someone clicks to expand. 1080p is almost always enough; 720p is fine for anything that isn't detail-critical.

You don't usually need to do this manually — the compressor handles resolution as part of hitting your target. But if you want explicit control, [Video Resizer](/tools/video/resize-video/) does it directly.

### 4. Cut the audio bitrate — costs a little, saves a little

Audio is a small slice of the file, but on a short clip it's not nothing. 192 kbps down to 96 kbps saves ~700 KB per minute — which can be the last megabyte you need.

Game audio and voice survive 96 kbps fine. Music does not.

If the clip doesn't need sound at all, [Mute / Strip Audio](/tools/video/mute-video/) removes the track entirely and takes a stream copy, so the video is untouched and it finishes instantly.

## Doing it

1. Open [Compress for Discord](/tools/video/compress-for-discord/)
2. Drop your video in
3. **Fit into** — choose 10 MB, 50 MB or 500 MB to match your plan
4. **Audio quality** — 128 kbps is a good default; drop to 96 if you're close to the line
5. Compress, then download

Both settings are dropdowns, not sliders. The tool computes the video bitrate needed to land inside your target, leaving room for the audio you picked plus about 4% of container overhead.

If the result comes back slightly over — it'll tell you — the usual fix is one step down on audio, or trimming a couple more seconds.

## Two limits worth knowing before you start

**200 MB input cap.** The compressor runs inside your browser using ffmpeg compiled to WebAssembly, which holds the whole file in memory. Above ~200 MB it runs out and fails partway through. If your capture is bigger, trim it first — that's usually what you wanted anyway.

**Long clips are slow.** Encoding happens on your own CPU. A 30-second clip is quick; a 10-minute one will take a while and pin a core. There's a 30-minute ceiling for the same reason.

Neither of these applies to server-side compressors — that's the genuine trade-off for the privacy. Which brings us to:

## Why this runs in your browser

Most online video compressors upload your file to their server, process it there, and hand it back. That means your raw footage — which may include your desktop, your notifications, your voice, whatever was on screen — sits on someone else's machine under whatever retention policy they have.

Vootkit's video tools use ffmpeg.wasm, running in your browser. The file is never uploaded. That's also why there's no queue and no daily quota on processing: the work happens on your hardware, not ours.

The honest trade: server-side tools handle bigger files faster because they have better hardware. We're limited by your laptop. For a clip you're about to post in a Discord channel, that's a trade worth making.

## Questions

**Why is my compressed file still over the limit?**
Usually the clip is long enough that even the minimum sensible bitrate overshoots. Trim it. If a 10-minute video must fit in 10 MB, no encoder will make that look acceptable.

**Can I just compress it twice?**
You can, and it'll look noticeably worse. Every lossy encode discards more, and re-encoding an already-compressed file means the artefacts get compressed too. Always go back to the original.

**Does it work on my phone?**
It runs, but a phone browser has far less memory to work with, so stick to short clips. A desktop browser is much more reliable for anything substantial.

**What about MOV, MKV or AVI files?**
All fine. The output is always MP4 (H.264), which plays everywhere, including inside Discord's embedded player.

## Related tools

- [Compress for Discord](/tools/video/compress-for-discord/) — target a specific file size
- [Video Trimmer](/tools/video/trim-video/) — the free win, do this first
- [Video Resizer](/tools/video/resize-video/) — explicit resolution control
- [Mute / Strip Audio](/tools/video/mute-video/) — instant, lossless for video
- [Video Converter](/tools/video/convert-video/) — anything into MP4
- [Video to GIF](/tools/video/video-to-gif/) — for very short clips, sometimes smaller
