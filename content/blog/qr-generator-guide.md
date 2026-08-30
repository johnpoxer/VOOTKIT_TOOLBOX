---
title: "How to Create a QR Code That Scans Reliably"
date: "2026-08-30"
description: "Turns any text or URL into a QR code PNG at one of three sizes and four error-correction levels."
thumbnail: "/assets/blog/qr-generator-guide.jpg"
coverAlt: "Editorial illustration representing the QR Code Generator workflow."
author: "The Vootkit team"
type: "Guide"
category: "Everyday"
tags: "Everyday Tools, Productivity, Calculators"
---

A QR code is a picture of a short piece of text. The two things that decide whether it actually scans are how big it is printed and how much damage it can survive — and both are settings people leave at the default without knowing what they do.

## What the QR Code Generator does

Turns any text or URL into a QR code PNG at one of three sizes and four error-correction levels.

Error correction is the interesting setting. Higher levels add redundant data so the code still reads when part of it is obscured, scratched or covered by a logo — at the cost of a denser pattern that needs to be printed larger.

Open the [QR Code Generator](/tools/everyday/qr-generator/) and follow the settings and checks below.

## Sizes and error correction

| Setting | What it means |
|---|---|
| Small | 256 px — screens and small embeds |
| Medium | 512 px (default) — general use |
| Large (print) | 1024 px — posters, packaging, signage |
| L | 7% recoverable — clean digital use only |
| M | 15% recoverable (default) — the usual choice |
| Q | 25% recoverable — print that may get scuffed |
| H | 30% recoverable — required if you overlay a logo |
| Generated | In this page, not by a QR service |

## How to use it

1. Paste the URL or text. Shorter content makes a simpler, more reliable code.
2. Pick a **Size** — Large for anything printed.
3. Pick **error correction**. Use H if a logo will sit on top, Q for print that will be handled.
4. Download the PNG and **scan it with an actual phone** before committing it to anything.

## Practical advice

Print size is what fails in the wild, not resolution. A rough rule is that a code should be at least a tenth of the distance it will be scanned from — a poster read from two metres needs roughly 20 cm. A beautifully generated code the size of a stamp on a shop window scans for nobody.

## Common questions

### My code will not scan.

Usually printed too small, too low contrast, or with no quiet zone — the blank margin around the code is part of the code and cropping it tight breaks scanning. Dark code on a light background, and leave the border.

### Can I put a logo in the middle?

Yes, if you use error correction H, which tolerates about 30% obstruction. Keep the logo small and central, and test with several phones — this is the change most likely to quietly break scanning.

### Does the code expire or track scans?

No. It is a static picture of your text, generated here and yours to keep. It works forever and reports nothing. Services offering editable or tracked codes point at their own server, which then becomes a dependency and a redirect you do not control.

### Why does more text make a denser code?

Because every character has to be encoded in the pattern. Long URLs produce fine-grained codes that need to be printed larger to scan reliably — shortening the link first is often the real fix.

## Useful next tools

- [Barcode Generator](/tools/everyday/barcode-generator/) — CODE128 and EAN barcodes, ready to download.
- [QR Code Scanner](/tools/everyday/qr-scanner/) — Scan a QR code with your camera or from an image.
- [Favicon Generator](/tools/images/favicon-generator/) — Every favicon size and the HTML to go with it.
- [URL Encode / Decode](/tools/developer/url-encoder/) — Percent-encode URLs and query values.
- [UTM Link Builder](/tools/seo/utm-builder/) — Build tagged campaign URLs consistently.
- [PNG to JPG](/tools/images/png-to-jpg/) — Convert PNG to JPG, flattening transparency onto a matte.

Vootkit provides a browser calculator and educational guidance. Results depend on the values and units you enter, so verify important financial, academic, safety or professional decisions with an appropriate authoritative source.
