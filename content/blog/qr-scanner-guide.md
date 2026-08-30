---
title: "How to Scan a QR Code Safely in Your Browser"
date: "2026-08-30"
description: "Decodes a QR code from an image file or your camera and shows you the raw contents as text."
thumbnail: "/assets/blog/qr-scanner-guide.jpg"
coverAlt: "Editorial illustration representing the QR Code Scanner workflow."
author: "The Vootkit team"
type: "Guide"
category: "Everyday"
tags: "Everyday Tools, Productivity, Calculators"
---

A QR code is a link you cannot read, which is the entire security problem with them. Scanning one on a phone takes you somewhere before you have any chance to see where that is.

## What the QR Code Scanner does

Decodes a QR code from an image file or your camera and shows you the raw contents as text.

Seeing the text before following it is the point. A code on a parking meter, a menu or a letter can encode any URL at all, and the sticker over it can encode a different one.

Open the [QR Code Scanner](/tools/everyday/qr-scanner/) and follow the settings and checks below.

## What a QR code can contain

| Setting | What it means |
|---|---|
| URL | The common case — and the one worth reading before opening |
| Plain text | Any string |
| Wi-Fi credentials | Network name and password, in the clear |
| Contact card | vCard details |
| Payment details | Bank or wallet addresses — verify these especially carefully |
| Error correction | Up to 30% of a code can be damaged and still decode |

## How to use it

1. Upload a photo or screenshot of the code, or use the camera.
2. Read the decoded text **before** doing anything with it.
3. For a URL, check the domain carefully — not just the beginning of it.
4. If it is a payment address, verify it through a second channel before sending anything.

## Practical advice

Quishing — a phishing sticker placed over a legitimate QR code — works precisely because nobody can tell the two apart by looking. Parking meters, restaurant tables, charging points and posters have all been targeted. If a physical code looks like a sticker on top of something else, treat it as hostile: decode it here first and read the domain properly, including the part just before the first single slash, which is where lookalike domains hide.

## Common questions

### Why decode a code instead of just scanning it with my phone?

Because your phone camera opens the destination, often before you have read it. Decoding to text first lets you see the actual URL, spot a lookalike domain, and decide. For anything encountered in public — a parking meter, a table, a leaflet — that ordering is the whole defence.

### What should I look for in a decoded URL?

The domain immediately before the first single slash, since everything after it is controlled by whoever owns that domain. vootkit.com.example.net is not Vootkit. Also watch for URL shorteners, which hide the real destination entirely, and for characters that look like others in your font.

### Can a QR code contain something harmful by itself?

Not directly — it is just encoded text, and reading it here cannot execute anything. The risk is entirely in what you do with the contents: opening a phishing page, joining a hostile Wi-Fi network, or sending a payment to an address you did not verify. The code is the delivery mechanism, not the payload.

### Why will my code not decode?

Usually the image: too blurred, too low-contrast, cropped so the corner squares are missing, or photographed at a steep angle. QR codes tolerate up to about 30% damage thanks to error correction, but they need all three position markers. A straighter, sharper photo almost always fixes it.

## Useful next tools

- [QR Code Generator](/tools/everyday/qr-generator/) — Turn any link or text into a downloadable QR code.
- [Barcode Generator](/tools/everyday/barcode-generator/) — CODE128 and EAN barcodes, ready to download.
- [Image to Text (OCR)](/tools/images/image-to-text/) — Extract text from a photo or screenshot with OCR.
- [URL Shortener](/tools/seo/url-shortener/) — Turn a long link into a short, shareable vootkit.com/s/ link — with an optional custom name.
- [Password Strength Checker](/tools/privacy/password-strength/) — How strong a password is — checked locally.
- [EXIF Viewer & Stripper](/tools/images/exif-viewer/) — See photo metadata and download a clean copy.

Vootkit provides a browser calculator and educational guidance. Results depend on the values and units you enter, so verify important financial, academic, safety or professional decisions with an appropriate authoritative source.
