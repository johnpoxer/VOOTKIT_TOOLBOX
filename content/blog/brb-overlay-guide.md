---
title: "How to Create a BRB Screen and Countdown Overlay"
date: "2026-08-28"
description: "Creates a \"be right back\" card to switch to during a break — sized for a stream canvas and ready as an OBS source."
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

Open the [BRB & Countdown Overlay](/tools/video/brb-overlay/) and follow the settings and checks below.

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

- [Starting Soon Screen](/tools/video/starting-soon-screen/) — Make a starting-soon screen with countdown for OBS.
- [Stream Overlay Creator](/tools/video/stream-overlay-creator/) — Design a transparent webcam overlay for OBS.
- [Stream Alert Creator](/tools/video/stream-alert-creator/) — Design follower, sub and donation alert graphics.
- [Mute Video](/tools/video/mute-video/) — Remove the audio track to avoid copyright strikes.

Vootkit provides a browser tool and educational guidance, not a guarantee that every browser, device or third-party platform will accept every file. Platform specifications can change, so verify important publishing requirements with the destination service.
