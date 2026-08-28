---
title: "How to Reframe a Landscape Video for TikTok, Reels and Shorts"
date: "2026-08-28"
description: "Practical guidance for using Vootkit's Vertical Reframe 9:16, understanding its settings, avoiding common mistakes and producing a result suited to your platform."
thumbnail: "/assets/blog/vertical-reframe-guide.jpg"
coverAlt: "Editorial illustration representing the Vertical Reframe 9:16 workflow."
author: "The Vootkit team"
type: "Guide"
category: "Video"
tags: "Video, Streaming, Creator Tools"
---

Shorts, TikTok and Reels want a tall frame, and almost everything is filmed wide. Simply squeezing a 16:9 video into 9:16 makes everyone look stretched; the honest fix is to take a tall slice out of the wide frame and accept that you lose the sides.

## What the Vertical Reframe 9:16 does

Centre-crops the source to the target shape, then scales the result — the filter is <code>crop</code> followed by <code>scale</code> with lanczos. Nothing is stretched: the aspect ratio of everything inside the frame is preserved exactly.

<strong>The crop is from the centre, and it is not smart.</strong> There is no subject tracking here. If your subject sits to one side of the frame, they will be cut off, and no setting will change that.

The [Vertical Reframe 9:16](/tools/video/vertical-reframe/) runs as a focused Vootkit workspace. Start with a source you are allowed to use, keep an untouched original, and check the exported result on the platform where it will be published. A successful export can still be unsuitable when a platform imposes its own duration, size, codec or layout rules.

## Target shapes

| Setting | What it means |
|---|---|
| 9:16 (default) | Shorts, TikTok, Reels, Stories |
| 1:1 | Square — feed posts |
| 4:5 | Portrait feed — the tallest most feeds allow |
| Method | Centre crop, then lanczos scale |
| Distortion | None — proportions preserved |
| Audio | Copied unchanged |
| Output | MP4 (H.264) |
| Maximum input | 2 GB |

## How to use it

1. Add a landscape clip.
2. Choose the <strong>Target shape</strong> for wherever it is going.
3. Reframe, then watch the result before posting — the centre crop is decided for you.

## A practical quality check

Going from 16:9 to 9:16 keeps only about a third of the width. That is a severe cut, so it works on a talking head near the middle of frame and fails on a wide shot or a two-person interview. If the subject is off-centre, crop manually in an editor instead — this tool cannot follow them.

Do not judge only from the download completing. Inspect the beginning, middle and end; check sound where relevant; confirm that text and faces are not cropped; and make sure the filename and format are clear before deleting the original.

## Common mistakes to avoid

- Using a low-quality source and expecting conversion to recreate missing detail.
- Selecting settings for one platform without checking the destination's current requirements.
- Reprocessing the same compressed file repeatedly, which can compound quality loss.
- Publishing without checking the final duration, dimensions, sound and file size.
- Assuming an estimate or preview is identical to the destination platform's final processing.

## Common questions

### Will people look stretched?

No. The frame is cropped rather than squashed, so proportions are exactly as filmed. Stretching is what happens when software forces a wide frame into a tall one without cropping, and this deliberately does not do that.

### Can it follow my subject?

No, and it is better to say so plainly than to imply otherwise. The crop is fixed at the centre for the whole clip. Subject-tracking reframes need a full editor.

### How much of the picture do I lose?

Going 16:9 to 9:16 keeps roughly 32% of the width — the outer two-thirds are gone. 4:5 keeps about 56%, and 1:1 about 56% as well, so both are much gentler crops if the platform allows them.

### Does the resolution drop?

The frame is cropped and then scaled to the target, so vertical detail is preserved and the pixel count falls with the narrower frame. Reframing from a 1080p source gives plenty of resolution for any vertical feed.

## Useful next tools

- [Resize Video](/tools/video/resize-video/)
- [Trim Video](/tools/video/trim-video/)
- [Compress Video](/tools/video/compress-video/)
- [Social Media Image](/tools/images/social-media-image/)

Vootkit provides a browser tool and educational guidance, not a guarantee that every browser, device or third-party platform will accept every file. Platform specifications can change, so verify important publishing requirements with the destination service.
