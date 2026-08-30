---
title: "How to Extract a High-Quality Still Frame From a Video"
date: "2026-08-28"
description: "Seeks to the second you specify, draws that frame to a canvas and saves it as a PNG. This is the only video tool here that does not use ffmpeg — it uses…"
thumbnail: "/assets/blog/frame-grabber-guide.jpg"
coverAlt: "Editorial illustration representing the Frame Grabber workflow."
author: "The Vootkit team"
type: "Guide"
category: "Video"
tags: "Video, Streaming, Creator Tools"
---

A thumbnail is usually already somewhere inside your video — the frame where the subject looks right, the moment before the cut. Taking a still out of it needs no encoder at all: the browser can already decode video, so it decodes one frame and paints it to a canvas.

## What the Frame Grabber does

Seeks to the second you specify, draws that frame to a canvas and saves it as a <strong>PNG</strong>. This is the only video tool here that does not use ffmpeg — it uses the browser’s own decoder, so it runs instantly and downloads nothing.

PNG rather than JPEG on purpose: the frame is going to be a thumbnail, and a thumbnail is usually edited afterwards. Starting from a lossless still means text and edges stay sharp through whatever you do next.

Open the [Frame Grabber](/tools/video/frame-grabber/) and follow the settings and checks below.

## What it produces

| Setting | What it means |
|---|---|
| Output format | PNG, lossless |
| Resolution | The video’s native frame size |
| Time control | Seconds, in 0.1 s steps |
| Engine | Browser decoder + canvas — no ffmpeg download |
| Speed | Instant |
| Codec support | Whatever your browser can play — MP4/H.264 is safest |
| Privacy | The file never leaves your device |

## How to use it

1. Add the video.
2. Set <strong>Time</strong> to the moment you want, in seconds. Decimals work, so 12.4 is a valid answer.
3. Grab the frame, check the preview, and adjust the time if you were slightly early or late.
4. Download the PNG.

## A practical quality check

Motion blur is what usually ruins a grabbed thumbnail. Try a few tenths either side of your first guess — during fast movement, 0.2 s can be the difference between a sharp face and a smear. The preview shows you the result before you commit.

## Common questions

### Why does my video not load here when the other tools accept it?

This tool uses your browser’s decoder rather than ffmpeg, so it is limited to formats the browser can play. MKV and some MOV files are decoded by ffmpeg but not by browsers. Run it through the Video Converter to MP4 first and it will work.

### Can I get JPEG instead?

The output is PNG so nothing is lost at this stage. If you need JPEG, convert afterwards with the Image Converter — that way any compression happens once, after your edits, rather than before them.

### How exact is the time?

It seeks to the nearest available frame, so at 30 fps you land within about a thirtieth of a second. Precise seeking also depends on keyframes, so on a heavily compressed clip the actual frame can be marginally off your requested time.

### Why is this instant when other video tools take minutes?

It decodes one frame. The others decode, process and re-encode every frame in the clip — thousands of them.

## Useful next tools

- [Thumbnail Maker](/tools/images/thumbnail-maker/) — Resize and crop to YouTube, blog and square thumbnail sizes.
- [Video To Gif](/tools/video/video-to-gif/) — Turn a short clip into a shareable GIF.
- [Trim Video](/tools/video/trim-video/) — Cut the segment you want and save it.
- [Compress Image](/tools/images/compress-image/) — Shrink JPG, PNG or WebP with a quality slider.

Vootkit provides a browser tool and educational guidance, not a guarantee that every browser, device or third-party platform will accept every file. Platform specifications can change, so verify important publishing requirements with the destination service.
