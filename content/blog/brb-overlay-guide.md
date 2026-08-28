---
title: "How to Create a BRB Screen and Countdown Overlay"
date: "2026-08-28"
description: "Practical guidance for using Vootkit's BRB & Countdown Overlay, understanding its settings, avoiding common mistakes and producing a result suited to your platform."
thumbnail: "/assets/blog/brb-overlay-guide.jpg"
coverAlt: "Editorial illustration representing the BRB & Countdown Overlay workflow."
author: "The Vootkit team"
type: "Guide"
category: "Video"
tags: "Video, Streaming, Creator Tools"
---

Every stream needs a break, and how you take it decides whether the audience is still there afterwards. Cutting the feed loses people instantly; a BRB screen holds them because it promises you are coming back.

## What the BRB & Countdown Overlay does

Creates a "be right back" card to switch to during a break — sized for a stream canvas and ready as an OBS source.

Keeping the stream running matters more than the design: the platform keeps you in the live directory, chat keeps talking, and returning viewers find you where they left you.

The [BRB & Countdown Overlay](/tools/video/brb-overlay/) runs as a focused Vootkit workspace. Start with a source you are allowed to use, keep an untouched original, and check the exported result on the platform where it will be published. A successful export can still be unsuitable when a platform imposes its own duration, size, codec or layout rules.

## Use and setup

| Setting | What it means |
|---|---|
| Purpose | A holding card during a break |
| Output | An image for an OBS source |
| Keeps you live? | Yes — the stream never stops |
| Add to OBS as | An image source in its own scene |
| Mute your mic | Do this before switching, not after |
| Typical duration | Under ten minutes |
| Privacy | Generated in your browser |

## How to use it

1. Make the card and add it as a separate OBS scene.
2. Bind a hotkey to that scene so switching is one keypress.
3. <strong>Mute your microphone before you switch</strong>, not after.

## A practical quality check

Mute the mic first, every time. The scene changes instantly and the microphone does not — the gap between switching and remembering is exactly long enough to broadcast something you did not intend to. Make muting the first half of the hotkey, not an afterthought.

Do not judge only from the download completing. Inspect the beginning, middle and end; check sound where relevant; confirm that text and faces are not cropped; and make sure the filename and format are clear before deleting the original.

## Common mistakes to avoid

- Using a low-quality source and expecting conversion to recreate missing detail.
- Selecting settings for one platform without checking the destination's current requirements.
- Reprocessing the same compressed file repeatedly, which can compound quality loss.
- Publishing without checking the final duration, dimensions, sound and file size.
- Assuming an estimate or preview is identical to the destination platform's final processing.

## Common questions

### Why not just end the stream?

Ending drops you out of the live directory, disconnects chat and loses everyone watching. A BRB screen keeps the stream up, keeps the conversation going and lets people drift back — which they will not do if there is nothing to drift back to.

### How long can I leave it?

Under ten minutes as a rule. Beyond that viewers assume you are not returning, and platforms may reduce your visibility while nothing is happening on the feed.

### Should I keep music playing?

Yes, for the same reason as the starting screen — audio proves the stream is alive. Use something licensed for streaming; a copyright claim on a break screen is a particularly annoying way to earn one.

### Will my microphone stay live?

Only if you leave it live. Switching scenes does not mute anything, and this is the single most common streaming accident. Bind mute and scene change to the same hotkey if your setup allows.

## Useful next tools

- [Starting Soon Screen](/tools/video/starting-soon-screen/)
- [Stream Overlay Creator](/tools/video/stream-overlay-creator/)
- [Stream Alert Creator](/tools/video/stream-alert-creator/)
- [Mute Video](/tools/video/mute-video/)

Vootkit provides a browser tool and educational guidance, not a guarantee that every browser, device or third-party platform will accept every file. Platform specifications can change, so verify important publishing requirements with the destination service.

