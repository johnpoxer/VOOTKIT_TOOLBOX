---
title: "How to Generate a Barcode That Works"
date: "2026-08-30"
description: "Generates a scannable barcode in CODE128, EAN-13, UPC-A or CODE39 from whatever value you enter."
thumbnail: "/assets/blog/barcode-generator-guide.jpg"
coverAlt: "Editorial illustration representing the Barcode Generator workflow."
author: "The Vootkit team"
type: "Guide"
category: "Everyday"
tags: "Everyday Tools, Productivity, Calculators"
---

Barcode formats are not interchangeable, and picking the wrong one produces something that scans perfectly on your screen and is rejected the moment it reaches a real till.

## What the Barcode Generator does

Generates a scannable barcode in CODE128, EAN-13, UPC-A or CODE39 from whatever value you enter.

The format choice is the decision that matters. Retail formats validate their contents and calculate a check digit; general-purpose ones accept anything you give them.

Open the [Barcode Generator](/tools/everyday/barcode-generator/) and follow the settings and checks below.

## Which format to use

| Setting | What it means |
|---|---|
| CODE128 | Any text or numbers — the default for internal use, shipping and asset tags |
| EAN-13 | Retail outside North America; 12 digits plus a calculated check digit |
| UPC-A | Retail in North America; 12 digits including its check digit |
| CODE39 | Older, bulkier, uppercase and digits — still common in defence and automotive |
| Check digit | Calculated for you on EAN and UPC — it is not part of what you type |
| Quiet zone | The white margin either side is required, not decoration |

## How to use it

1. Pick the format for where the code will actually be scanned.
2. Enter the value. For EAN-13 and UPC-A that is **digits only**, and the length must match.
3. Print at a sensible size — too small and the bars merge under a scanner, and a laser printer beats an inkjet for edge sharpness.
4. Keep the white margin either side. Cropping to the bars breaks it.

## Practical advice

Generating your own EAN-13 does not give you a retail barcode. Codes that appear on products sold through shops are issued by GS1, and the leading digits identify the company that registered them — inventing a number that passes the check-digit test will scan, but it may already belong to somebody else and no retailer will accept it. For internal stock, asset tags and shipping labels, none of that applies and CODE128 is the sensible choice.

## Common questions

### Which format should I choose?

CODE128 for anything internal — stock, assets, shipping, warehouse locations — because it encodes any text and is compact. EAN-13 or UPC-A only if the item is genuinely going to be sold through retail, in which case the number needs to be issued to you rather than invented.

### Can I make my own retail barcode?

Not legitimately. Retail numbers are allocated by GS1 and the leading digits identify the registering company, so a self-generated number may collide with a real product. It will scan, and it will fail the moment a retailer checks it against the global registry. For internal use there is no such constraint.

### What is the check digit?

A final digit calculated from the others, so a scanner can detect a misread rather than silently returning the wrong product. On EAN-13 you provide twelve digits and the thirteenth is computed; UPC-A works the same way. You do not type it, and typing it produces a length error.

### Why will my printed barcode not scan?

Most often it is size or margin. Printed too small, the bars blur together at scanner resolution; cropped tight to the bars, the quiet zone either side is gone and the scanner cannot find the edges. Low-contrast printing and glossy laminate reflections account for most of the rest.

## Useful next tools

- [QR Code Generator](/tools/everyday/qr-generator/) — Turn any link or text into a downloadable QR code.
- [QR Code Scanner](/tools/everyday/qr-scanner/) — Scan a QR code with your camera or from an image.
- [Image to Text (OCR)](/tools/images/image-to-text/) — Extract text from a photo or screenshot with OCR.
- [Invoice Generator](/tools/business/invoice-generator/) — Build a clean invoice with line items and export a PDF.
- [UUID Generator](/tools/developer/uuid-generator/) — Random v4 UUIDs, as many as you need.
- [Hash Generator](/tools/developer/hash-generator/) — SHA-256, SHA-1 and SHA-512 of any text.

Vootkit provides a browser calculator and educational guidance. Results depend on the values and units you enter, so verify important financial, academic, safety or professional decisions with an appropriate authoritative source.
