---
title: "How to Resize Emotes and Stickers Without Losing Clarity"
date: "2026-08-28"
description: "Practical guidance for using Vootkit's Emote & Sticker Resizer, understanding its settings, avoiding common mistakes and producing a result suited to your platform."
thumbnail: "/assets/blog/emote-resizer-guide.jpg"
coverAlt: "Editorial illustration representing the Emote & Sticker Resizer workflow."
author: "The Vootkit team"
type: "Guide"
category: "Video"
tags: "Video, Streaming, Creator Tools"
---

Emotes are rejected for one reason more than any other: the wrong pixel dimensions. Platforms require exact sizes and will not scale for you, so an emote that is 100 pixels instead of 112 simply fails to upload.

## What the Emote & Sticker Resizer does

Resizes a single image into the exact set of sizes a platform requires, in one pass — because you need all of them, not one.

<strong>Twitch requires three: 112, 56 and 28 pixels square.</strong> Discord uses 128. Missing any one of the Twitch sizes means the emote cannot be submitted.

The [Emote & Sticker Resizer](/tools/video/emote-resizer/) runs as a focused Vootkit workspace. Start with a source you are allowed to use, keep an untouched original, and check the exported result on the platform where it will be published. A successful export can still be unsuitable when a platform imposes its own duration, size, codec or layout rules.

## Required sizes

| Setting | What it means |
|---|---|
| Twitch | 112 × 112, 56 × 56, 28 × 28 — all three required |
| Discord | 128 × 128 |
| Format | PNG with transparency |
| Source should be | Square, and at least 112 px |
| Why three sizes | Chat renders the smallest one |
| Scaling | Down only — never upscale an emote |
| Privacy | Processed in your browser — never uploaded |

## How to use it

1. Start from a square image at least 112 px, ideally larger.
2. Choose the platform pack.
3. Download every size and upload the full set.

## A practical quality check

Design for the 28-pixel version, because that is the one people actually see in chat. Fine detail, thin outlines and small text all disappear at that size — an emote that reads perfectly at 112 can be an unrecognisable smudge in a fast-moving chat. Check the smallest export before submitting.

Do not judge only from the download completing. Inspect the beginning, middle and end; check sound where relevant; confirm that text and faces are not cropped; and make sure the filename and format are clear before deleting the original.

## Common mistakes to avoid

- Using a low-quality source and expecting conversion to recreate missing detail.
- Selecting settings for one platform without checking the destination's current requirements.
- Reprocessing the same compressed file repeatedly, which can compound quality loss.
- Publishing without checking the final duration, dimensions, sound and file size.
- Assuming an estimate or preview is identical to the destination platform's final processing.

## Common questions

### Why does Twitch need three sizes?

Different contexts render at different scales — chat uses the smallest, the emote picker and hover previews use the larger ones. Twitch does not scale on your behalf, so all three must be uploaded.

### My emote was rejected for the wrong size.

The dimensions must be exact. 112 × 112 means precisely that, not 110 or 115, and the image must be square. This produces exact sizes, which is the point of using it rather than resizing by hand.

### Can I upload a small image and let this enlarge it?

You can, but do not. Upscaling invents pixels and produces a soft, blocky emote. Start at 112 or larger — ideally draw at 512 and let everything scale down.

### Does it keep transparency?

Yes, PNG transparency is preserved. That matters because emotes appear on both light and dark chat backgrounds, and one with a baked-in white square looks broken on half of them.

## Useful next tools

- [Stream Asset Sizer](/tools/video/stream-asset-sizer/)
- [Resize Image](/tools/images/resize-image/)
- [Circle Crop](/tools/images/circle-crop/)
- [Compress Image](/tools/images/compress-image/)

Vootkit provides a browser tool and educational guidance, not a guarantee that every browser, device or third-party platform will accept every file. Platform specifications can change, so verify important publishing requirements with the destination service.
