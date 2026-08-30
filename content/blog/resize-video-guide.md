---
title: "How to Resize a Video for Social Media and the Web"
date: "2026-08-28"
description: "Scales the video to a target height and works the width out from the source aspect ratio, so nothing is stretched or cropped. Scaling uses lanczos, which…"
thumbnail: "/assets/blog/resize-video-guide.jpg"
coverAlt: "Editorial illustration representing the Video Resizer workflow."
author: "The Vootkit team"
type: "Guide"
category: "Video"
tags: "Video, Streaming, Creator Tools"
---

A 4K recording of a screen share is mostly wasted data — the detail is not there to preserve, but the pixel count still has to be stored, uploaded and decoded by whoever watches it. Dropping the frame size is often a bigger, safer saving than squeezing the bitrate.

## What the Video Resizer does

Scales the video to a target height and works the width out from the source aspect ratio, so nothing is stretched or cropped. Scaling uses <strong>lanczos</strong>, which is slower per frame than the alternatives and noticeably sharper on text and fine detail — the right trade when someone chose to downscale deliberately.

The width is always forced even, because H.264 requires it. A 1440×1080 source scaled to 720p becomes 960×720, not 959×720.

Open the [Video Resizer](/tools/video/resize-video/) and follow the settings and checks below.

## Resolutions and method

| Setting | What it means |
|---|---|
| 1080p | Full HD, 1920 wide at 16:9 |
| 720p (default) | HD, 1280 wide at 16:9 |
| 480p | SD, 854 wide at 16:9 |
| 360p | Small, 640 wide at 16:9 |
| Scaler | Lanczos — sharper than bilinear on text |
| Aspect ratio | Preserved; width derived and forced even |
| Output | MP4 (H.264 + AAC) |
| Maximum input | 2 GB |

## How to use it

1. Drop the video in.
2. Pick a <strong>Resolution</strong>. 720p is the sensible default for anything being watched rather than archived.
3. Resize, then download.

## A practical quality check

Resize before compressing, not after. File size scales with pixel count, so halving the height quarters the pixels — a 1080p to 540p change removes about 75% of the data before the encoder makes a single quality decision. Then compress the smaller file if it still needs to be smaller.

## Common questions

### Should I resize or compress?

Resize when the frame is bigger than anyone needs — a 4K screen recording watched on a phone. Compress when the resolution is right but the bitrate is generous. Doing both, in that order, gives the smallest file for a given visual quality.

### Can I make a video larger?

You can select a height above the source, but do not — upscaling invents pixels from nothing, producing a bigger file that looks softer than the original. The tool will not stop you; physics will.

### What happens to a vertical or square video?

The height you choose is applied and the width follows from the source ratio, so a 1080×1920 vertical clip set to 720 becomes 405×720. To change the shape rather than the size, use the Vertical Reframe tool.

### Why lanczos rather than something faster?

Because downscaling is where sharpness is won or lost. Lanczos preserves edge detail that bilinear softens, and it matters most on exactly the content people downscale — screen recordings, slides, anything with text.

## Useful next tools

- [Compress Video](/tools/video/compress-video/) — Shrink any video in your browser — pick a quality level or a size to fit.
- [Vertical Reframe](/tools/video/vertical-reframe/) — Reframe a clip for Shorts, TikTok and Reels.
- [Convert Video](/tools/video/convert-video/) — Convert MOV, MKV, AVI, WebM and more to universal MP4.
- [Trim Video](/tools/video/trim-video/) — Cut the segment you want and save it.

Vootkit provides a browser tool and educational guidance, not a guarantee that every browser, device or third-party platform will accept every file. Platform specifications can change, so verify important publishing requirements with the destination service.
