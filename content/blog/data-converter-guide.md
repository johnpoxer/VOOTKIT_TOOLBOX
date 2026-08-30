---
title: "How to Convert KB, MB, GB and Data Units"
date: "2026-08-30"
description: "Converts storage and bandwidth units using binary multiples of 1024 — the convention operating systems use, where a kilobyte is 1024 bytes and a gigabyte…"
thumbnail: "/assets/blog/data-converter-guide.jpg"
coverAlt: "Editorial illustration representing the Data Size Converter workflow."
author: "The Vootkit team"
type: "Guide"
category: "Everyday"
tags: "Everyday Tools, Productivity, Calculators"
---

A 1 TB drive shows up as about 931 GB in your operating system, and nothing is wrong or missing. Two different definitions of "gigabyte" are in circulation, and the gap between them widens at every step up the scale.

## What the Data Size Converter does

Converts storage and bandwidth units using **binary** multiples of 1024 — the convention operating systems use, where a kilobyte is 1024 bytes and a gigabyte is 1,073,741,824.

Also converts **bits**. This is the other classic confusion: internet speeds are quoted in megabits per second, file sizes in megabytes, and there are 8 bits in a byte — so a 100 Mbps line downloads at about 12.5 MB/s at best.

Open the [Data Size Converter](/tools/everyday/data-converter/) and follow the settings and checks below.

## Exact factors, in bytes

| Setting | What it means |
|---|---|
| Kilobyte | 1024 |
| Megabyte | 1,048,576 — that is 1024² |
| Gigabyte | 1,073,741,824 — 1024³ |
| Terabyte | 1,099,511,627,776 — 1024⁴ |
| Bit | 0.125 — eight bits to a byte |
| Megabit | 131,072 |
| Drive manufacturers use | 1000, not 1024 — hence "missing" space |
| 1 TB advertised shows as | About 931 GB in your OS |

## How to use it

1. Enter the amount.
2. Choose the units, watching bits against bytes.
3. Read the result.

## Practical advice

Divide a megabit figure by 8 to get megabytes. A 100 Mbps connection tops out around 12.5 MB/s, so a 1 GB download takes at least 80 seconds even on a perfect line. Internet providers quote bits because the number is eight times bigger, and it is the single most misread figure in consumer technology.

## Common questions

### Why does my 1 TB drive show as 931 GB?

Manufacturers count a terabyte as 1,000,000,000,000 bytes; your operating system counts it as 1024⁴, which is about 1.0995 trillion. Dividing one by the other gives roughly 931. Nothing is lost — the two are just using different definitions of the same word.

### Which does this tool use, 1000 or 1024?

1024, matching what your operating system reports. If you are checking against a manufacturer’s figure, expect a difference of about 7% at gigabyte scale and 10% at terabyte scale.

### What is the difference between Mb and MB?

Capitalisation, and a factor of eight. Mb is megabits, used for connection speeds; MB is megabytes, used for file sizes. A 100 Mb/s line delivers at most about 12.5 MB/s.

### What are KiB and MiB?

The unambiguous binary units — kibibyte and mebibyte — defined precisely to end this confusion. They mean 1024 and 1024², exactly what this tool uses for KB and MB. Adoption outside technical documentation has been slow.

## Useful next tools

- [Unit Converter](/tools/everyday/unit-converter/) — Length, mass, temperature, area, volume, speed and data.
- [Upload Time Estimator](/tools/video/upload-time/) — How long a file will take on your connection.
- [Streaming Bitrate Calculator](/tools/video/bitrate-calculator/) — Best bitrate for your upload speed, resolution and platform.
- [Video Compressor](/tools/video/compress-video/) — Shrink any video in your browser — pick a quality level or a size to fit.
- [File Checksum](/tools/privacy/file-checksum/) — Verify a download with its SHA-256 hash.
- [Image Compressor](/tools/images/compress-image/) — Shrink JPG, PNG or WebP with a quality slider.

Vootkit provides a browser calculator and educational guidance. Results depend on the values and units you enter, so verify important financial, academic, safety or professional decisions with an appropriate authoritative source.
