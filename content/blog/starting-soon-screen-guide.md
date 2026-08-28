---
title: "How to Make a Starting Soon Screen for Your Stream"
date: "2026-08-28"
description: "Practical guidance for using Vootkit's Starting Soon Screen, understanding its settings, avoiding common mistakes and producing a result suited to your platform."
thumbnail: "/assets/blog/starting-soon-screen-guide.jpg"
coverAlt: "Editorial illustration representing the Starting Soon Screen workflow."
author: "The Vootkit team"
type: "Guide"
category: "Video"
tags: "Video, Streaming, Creator Tools"
---

The first two minutes of a stream are the ones with the most people watching and the least happening. A holding screen turns dead air into something intentional — and gives you time to check your levels before anyone judges them.

## What the Starting Soon Screen does

Generates a full-screen holding card with your text, sized for a stream canvas, ready to add as a browser or image source in OBS.

It is a static screen by design, so it costs no CPU while it is up — which matters, because the moments before going live are when you are still loading everything else.

The [Starting Soon Screen](/tools/video/starting-soon-screen/) runs as a focused Vootkit workspace. Start with a source you are allowed to use, keep an untouched original, and check the exported result on the platform where it will be published. A successful export can still be unsuitable when a platform imposes its own duration, size, codec or layout rules.

## Use and setup

| Setting | What it means |
|---|---|
| Purpose | A holding card before the stream starts |
| Output | An image for an OBS source |
| CPU cost while shown | None — it is static |
| Typical duration | Two to five minutes |
| Add to OBS as | An image source in its own scene |
| Pair with | Music, so viewers know audio works |
| Privacy | Generated in your browser |

## How to use it

1. Write the text — "Starting soon" plus what the stream is about.
2. Download and add it as an image source in a dedicated OBS scene.
3. Go live on that scene a few minutes early, then switch.

## A practical quality check

Play music over it. A silent starting screen is indistinguishable from a broken stream, and viewers who cannot tell the difference leave rather than wait. Audible music is the clearest possible signal that everything is working and something is about to happen.

Do not judge only from the download completing. Inspect the beginning, middle and end; check sound where relevant; confirm that text and faces are not cropped; and make sure the filename and format are clear before deleting the original.

## Common mistakes to avoid

- Using a low-quality source and expecting conversion to recreate missing detail.
- Selecting settings for one platform without checking the destination's current requirements.
- Reprocessing the same compressed file repeatedly, which can compound quality loss.
- Publishing without checking the final duration, dimensions, sound and file size.
- Assuming an estimate or preview is identical to the destination platform's final processing.

## Common questions

### How long should I leave it up?

Two to five minutes. Long enough for the platform to notify followers and for people to arrive, short enough that early viewers do not give up. Longer than five and you are training people to show up late.

### Should I add a countdown?

Only if you will honour it. A timer that hits zero while the screen is still up is worse than no timer, because it tells viewers the stream is unreliable before it has begun.

### Does it slow my stream down?

No. A static image costs essentially nothing to encode, unlike an animated scene. That is useful precisely when you are still loading a game and the rest of your setup.

### What should it say?

What the stream is, not just that it is starting. Someone arriving from a browse page decides in seconds whether to stay, and "Starting soon" alone tells them nothing to stay for.

## Useful next tools

- [Brb Overlay](/tools/video/brb-overlay/)
- [Stream Overlay Creator](/tools/video/stream-overlay-creator/)
- [Stream Alert Creator](/tools/video/stream-alert-creator/)
- [Stream Asset Sizer](/tools/video/stream-asset-sizer/)

Vootkit provides a browser tool and educational guidance, not a guarantee that every browser, device or third-party platform will accept every file. Platform specifications can change, so verify important publishing requirements with the destination service.

