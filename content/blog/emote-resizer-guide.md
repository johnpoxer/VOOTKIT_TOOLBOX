---
title: "How to Resize Emotes and Stickers Without Losing Clarity"
date: "2026-08-28"
description: "Resizes a single image into the exact set of sizes a platform requires, in one pass — because you need all of them, not one."
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

Open the [Emote & Sticker Resizer](/tools/video/emote-resizer/) and follow the settings and checks below.

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

- [Stream Asset Sizer](/tools/video/stream-asset-sizer/) — Correct sizes for Twitch and YouTube banners, avatars and panels.
- [Resize Image](/tools/images/resize-image/) — Resize to exact pixels or a percentage.
- [Circle Crop](/tools/images/circle-crop/) — Crop any photo into a round avatar with a transparent background.
- [Compress Image](/tools/images/compress-image/) — Shrink JPG, PNG or WebP with a quality slider.

Vootkit provides a browser tool and educational guidance, not a guarantee that every browser, device or third-party platform will accept every file. Platform specifications can change, so verify important publishing requirements with the destination service.
