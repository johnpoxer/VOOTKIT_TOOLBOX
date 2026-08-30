---
title: "How to Extract Audio From a Video in Your Browser"
date: "2026-08-28"
description: "Discards the video stream and writes the audio to its own file. MP3 uses LAME at quality level 2, a variable bitrate that averages roughly 190 kbps —…"
thumbnail: "/assets/blog/extract-audio-guide.jpg"
coverAlt: "Editorial illustration representing the Extract Audio workflow."
author: "The Vootkit team"
type: "Guide"
category: "Video"
tags: "Video, Streaming, Creator Tools"
---

The audio inside a video file is already a complete, finished recording — an interview, a lecture, a song, a podcast take. Pulling it out is not a conversion so much as a separation, and it does not require the video to be decoded at all.

## What the Extract Audio does

Discards the video stream and writes the audio to its own file. <strong>MP3</strong> uses LAME at quality level 2, a variable bitrate that averages roughly 190 kbps — transparent for speech and close to it for music, at about a tenth of the size of the lossless option.

<strong>WAV</strong> writes uncompressed 16-bit PCM. Nothing is thrown away, which matters if the audio is going into an editor for further work, but the file is large: roughly 10 MB per minute of stereo.

Open the [Extract Audio](/tools/video/extract-audio/) and follow the settings and checks below.

## Formats and settings

| Setting | What it means |
|---|---|
| MP3 | LAME VBR, quality 2 (~190 kbps average) |
| WAV | 16-bit PCM, uncompressed |
| Rough size, MP3 | About 1.4 MB per minute |
| Rough size, WAV | About 10 MB per minute, stereo |
| Video handling | Discarded (<code>-vn</code>) — never decoded |
| Maximum input | 2 GB |
| Maximum length | 30 minutes |

## How to use it

1. Drop the video in.
2. Choose <strong>MP3</strong> for listening, sharing or transcription; <strong>WAV</strong> if the audio is going into an editor.
3. Extract, then download.

## A practical quality check

Choose WAV whenever the audio has more work ahead of it — noise reduction, levelling, mixing. Every MP3 encode is lossy, so editing an MP3 and re-saving it applies that loss twice. If the file is only ever going to be listened to, MP3 is the sensible default and a tenth of the size.

## Common questions

### Which should I pick, MP3 or WAV?

MP3 for anything you will listen to, upload or send — at quality 2 most people cannot distinguish it from the source. WAV if it is going into audio software, because further editing compounds the loss from a lossy format.

### Is the MP3 a fixed bitrate?

No. It uses variable bitrate at quality level 2, which spends more data on complex passages and less on quiet ones. That gives better quality per megabyte than a fixed rate, so the average lands near 190 kbps rather than being pinned there.

### Can this be better than the original audio?

No, and nothing can. If the video already contained a heavily compressed 64 kbps track, extracting it to WAV produces a large file that sounds exactly like a 64 kbps track. Extraction preserves; it cannot restore.

### Why is this fast when compressing a video is slow?

The video is never decoded — it is discarded with a single flag. Only the audio is processed, and audio is a fraction of the data in a video file.

## Useful next tools

- [Mute Video](/tools/video/mute-video/) — Remove the audio track to avoid copyright strikes.
- [Adjust Volume](/tools/video/adjust-volume/) — Make a video louder or quieter without touching the picture.
- [Trim Video](/tools/video/trim-video/) — Cut the segment you want and save it.
- [Convert Video](/tools/video/convert-video/) — Convert MOV, MKV, AVI, WebM and more to universal MP4.

Vootkit provides a browser tool and educational guidance, not a guarantee that every browser, device or third-party platform will accept every file. Platform specifications can change, so verify important publishing requirements with the destination service.
