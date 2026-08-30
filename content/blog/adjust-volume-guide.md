---
title: "How to Increase or Reduce Video Volume Safely"
date: "2026-08-28"
description: "Multiplies the audio by the percentage you choose and copies the video through untouched (-c:v copy). Only the sound is re-encoded, so the picture is…"
thumbnail: "/assets/blog/adjust-volume-guide.jpg"
coverAlt: "Editorial illustration representing the Video Volume Booster workflow."
author: "The Vootkit team"
type: "Guide"
category: "Video"
tags: "Video, Streaming, Creator Tools"
---

Quiet audio is the most common fixable problem in amateur video — a clip recorded across a room, or a phone that decided the scene was louder than it was. Scaling the volume is a small change to the audio track and needs no change to the picture at all.

## What the Video Volume Booster does

Multiplies the audio by the percentage you choose and copies the video through untouched (<code>-c:v copy</code>). Only the sound is re-encoded, so the picture is bit-for-bit identical and the job runs far faster than a full re-encode.

Boosting cannot add information that was never recorded. It raises the whole signal, so the hiss and room noise come up with the voice.

Open the [Video Volume Booster](/tools/video/adjust-volume/) and follow the settings and checks below.

## Levels and behaviour

| Setting | What it means |
|---|---|
| 50% | About 6 dB quieter |
| 100% | Unchanged |
| 150% (default) | About 3.5 dB louder |
| 200% | About 6 dB louder |
| 300% | About 9.5 dB louder — clipping likely |
| Video track | Copied, never re-encoded |
| Audio codec | AAC |
| Maximum input | 2 GB |

## How to use it

1. Add the video.
2. Choose a <strong>Volume</strong> percentage. Start at 150% and listen before reaching for more.
3. Apply, download, and check the loudest moment rather than an average one.

## A practical quality check

Judge a boost on the loudest part of the clip, never the quietest. Anything that exceeds the maximum level is clipped flat and turns to distortion, and clipping cannot be undone afterwards. If the quiet parts still need lifting at 200%, the recording needs compression in an audio editor rather than a bigger multiplier.

## Common questions

### Why does 300% sound distorted?

Digital audio has a hard ceiling. Multiplying by three pushes anything above a third of maximum past it, and everything past it is flattened — that flattening is the crackle you hear. Lower percentages that stay under the ceiling sound clean.

### Does this re-encode my video?

No. The video is stream-copied and only the audio track is re-encoded, so the picture is unchanged and the job is quick.

### Can I make one part louder and leave the rest?

Not here — the multiplier applies to the whole clip. Trim the section you want, adjust it, and rejoin in an editor, or use audio software for a level ride.

### Will lowering the volume hurt quality?

Almost never audibly. Reducing scales the signal down and re-encodes the result; the AAC encode is the only loss, and it is far smaller than the problem you were fixing.

## Useful next tools

- [Mute Video](/tools/video/mute-video/) — Remove the audio track to avoid copyright strikes.
- [Extract Audio](/tools/video/extract-audio/) — Save the audio from a video as MP3 or WAV.
- [Compress Video](/tools/video/compress-video/) — Shrink any video in your browser — pick a quality level or a size to fit.
- [Trim Video](/tools/video/trim-video/) — Cut the segment you want and save it.

Vootkit provides a browser tool and educational guidance, not a guarantee that every browser, device or third-party platform will accept every file. Platform specifications can change, so verify important publishing requirements with the destination service.
