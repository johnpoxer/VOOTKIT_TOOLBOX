---
title: "How to Choose OBS Settings for Your Internet and Computer"
date: "2026-08-28"
description: "Works out a safe bitrate from three things: what your resolution and frame rate ideally want, what your platform will accept, and — the one that usually…"
thumbnail: "/assets/blog/obs-settings-assistant-guide.jpg"
coverAlt: "Editorial illustration representing the OBS Settings Assistant workflow."
author: "The Vootkit team"
type: "Guide"
category: "Video"
tags: "Video, Streaming, Creator Tools"
---

Dropped frames are almost never a hardware problem. They are a bitrate problem — the stream is trying to push more data than the connection can carry, and the encoder gives up frames rather than fall behind.

## What the OBS Settings Assistant does

Works out a safe bitrate from three things: what your resolution and frame rate ideally want, what your platform will accept, and — the one that usually decides — what your upload can actually sustain.

The upload figure is deliberately conservative: it uses <strong>60% of your measured speed</strong>. Streaming at 100% of a line that occasionally dips is how you drop frames during exactly the moments that matter.

Open the [OBS Settings Assistant](/tools/video/obs-settings-assistant/) and follow the settings and checks below.

## The ladder and the caps

| Setting | What it means |
|---|---|
| 1080p60 | 6000 kbps ideal |
| 1080p30 | 4500 kbps |
| 720p60 | 4500 kbps |
| 720p30 | 3000 kbps |
| 480p60 / 480p30 | 2000 / 1500 kbps |
| Platform caps | Twitch 8500 · YouTube 12000 · Kick 8000 · Facebook 6000 |
| <strong>Upload headroom</strong> | <strong>60% of your measured speed</strong> |
| Floor | Never below 500 kbps |

## How to use it

1. Test your upload speed and enter the real figure, not the one on your bill.
2. Choose your platform, resolution and frame rate.
3. If it warns that your upload limits you below the ideal, drop to 30 fps before dropping resolution.

## A practical quality check

Prefer 720p60 over 1080p30 for anything with fast movement. Games especially look better at a higher frame rate and a smaller frame than the reverse, and 720p60 needs 4500 kbps against 1080p60’s 6000 — so it also fits on a connection that cannot sustain full HD.

## Common questions

### Why only 60% of my upload speed?

Because the number you measure is a peak, not a floor. Real connections dip, other devices share the line, and a stream that needs 95% of your capacity drops frames the moment anything else uses the network. The 40% margin is what makes a stream stable rather than nominally possible.

### Should I stream 1080p or 720p?

If your upload cannot comfortably carry 6000 kbps, 720p60 at 4500 will look better than a starved 1080p. Viewers notice stutter far more than resolution, and most watch in a window smaller than full screen anyway.

### Why do the platform caps differ?

Each service sets its own ingest ceiling — YouTube accepts the most at 12000 kbps, Facebook the least at 6000. Sending above the cap does not improve quality; it is either rejected or re-encoded down.

### I still drop frames at the recommended bitrate.

Then the bottleneck is elsewhere: an overloaded CPU with x264, wifi rather than ethernet, or another device saturating the line. Try a hardware encoder such as NVENC, and use a cable — wifi is the commonest cause of intermittent drops.

## Useful next tools

- [Bitrate Calculator](/tools/video/bitrate-calculator/) — Best bitrate for your upload speed, resolution and platform.
- [Upload Time](/tools/video/upload-time/) — How long a file will take on your connection.
- [Compress Video](/tools/video/compress-video/) — Shrink any video in your browser — pick a quality level or a size to fit.
- [Resize Video](/tools/video/resize-video/) — Resize a video to 1080p, 720p, 480p or 360p, keeping aspect.

Vootkit provides a browser tool and educational guidance, not a guarantee that every browser, device or third-party platform will accept every file. Platform specifications can change, so verify important publishing requirements with the destination service.
