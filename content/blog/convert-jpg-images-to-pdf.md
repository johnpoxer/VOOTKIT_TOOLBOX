---
title: "How to Convert JPG Images to One PDF in the Right Order"
date: "2026-08-27"
description: "Turn photos or scanned JPG and PNG images into one organized PDF, choose the correct page size and margins, and prevent rotated or blurry results."
thumbnail: "/assets/blog/convert-jpg-images-to-pdf.jpg"
author: "The Vootkit team"
type: "Tutorial"
category: "PDF"
tags: [Images, Tools, Productivity]
coverAlt: "Several photographs being arranged into one clean multipage PDF in a browser workspace."
relatedTools: [jpg-to-pdf, resize-image, rotate-image, pdf-page-numbers]
relatedWorkflow: "scan-to-pdf"
---

Photos are convenient to capture and awkward to submit. A school portal, client or government form may expect one PDF, while your phone gives you twelve separate images with names such as `IMG_4831.JPG`.

The conversion itself is easy. The quality of the result depends on the work you do first: crop the background, fix rotation, put the images in order and choose a page size that matches how the document will be read.

## Prepare the images first

Open every photograph and check four things:

1. The entire page is visible.
2. Text is sharp enough to read at normal zoom.
3. The image is upright.
4. No fingers, shadows or unrelated objects cover information.

If a page is sideways, use [Rotate Image](/tools/images/rotate-image/) before conversion. Crop excessive desk or floor area, but do not crop signatures, stamps, page numbers or document edges that prove the page is complete.

Rename copies in sequence: `01-cover.jpg`, `02-page.jpg`, `03-page.jpg`. A clear sequence prevents a file picker from arranging page 10 between pages 1 and 2.

## Build one PDF from JPG or PNG files

Open [Images to PDF](/tools/pdf/jpg-to-pdf/) and select your images. The tool accepts JPG and PNG files, supports up to 30 images in one job and creates one PDF page per image. Arrange the visible list in the correct order before processing.

Choose one of three page modes:

- **Fit to each image** makes every PDF page match its image dimensions.
- **A4 portrait** places each image on a standard A4 page.
- **US Letter** places each image on a Letter page.

You can also add a margin from 0 to 100 points. The work runs locally in the browser, so the photos are not uploaded to Vootkit.

## Which page size should you choose?

Use **Fit to each image** for a digital photo collection, screenshots or pages with different shapes. It avoids adding white space and keeps each image at its native size.

Use **A4** when the recipient prints on A4 paper or the source is an A4 document. Use **US Letter** when that is the expected office format. Standard pages look more consistent, but very tall or wide images will be scaled down to fit.

If you choose a standard page, a small margin prevents content touching the edge. For photographed documents, 20–30 points is a practical starting point. A zero margin is appropriate when the source already has generous white borders.

## Avoid blurry text and enormous files

Do not enlarge a small photograph before conversion and expect new detail. Resizing changes pixel dimensions; it cannot reconstruct text that the camera never captured. Retake an unreadable page in good light.

Very large phone photos can produce a large PDF because their full image data is embedded. If an upload portal has a strict limit, make copies and use [Image Resizer](/tools/images/resize-image/) before conversion. Keep the aspect ratio and choose a width that still leaves small text readable. After building the PDF, [Compress PDF](/tools/pdf/compress-pdf/) is another option, but check the output carefully because compression may soften fine details.

## Check the completed PDF

Open the result and move through every page. Confirm:

- Pages are in the intended order.
- Nothing is upside down or sideways.
- Small text is readable at 100% zoom.
- Every page has a consistent border and scale.
- The first and last pages are correct.
- The file name explains what the document contains.

For a long packet, [Add PDF Page Numbers](/tools/pdf/pdf-page-numbers/) can make review easier. Keep the original images until the submission has been accepted.

## Privacy and metadata

Phone images can contain EXIF metadata such as the capture date, device model and sometimes GPS coordinates. Converting images into a new PDF changes the container, but you should not assume that every workflow removes every piece of private information.

For photographs that will be shared publicly, make clean copies with [Metadata Remover](/tools/privacy/metadata-remover/) before building the PDF. Also inspect the picture itself: a reflection, address label or background object can reveal more than metadata.

## Common questions

### Can I mix JPG and PNG images?

Yes. Vootkit embeds both formats and creates one page per image.

### Why are some PDF pages different sizes?

You selected Fit to each image, so each page follows its source dimensions. Choose A4 or US Letter for consistent pages.

### Can I add more than 30 images?

Build two smaller PDFs and combine them with [Merge PDFs](/tools/pdf/merge-pdf/), or divide the submission into logical sections.

### Does this perform OCR?

No. The PDF contains images of text, not searchable characters. Use [PDF & Image OCR](/tools/pdf/pdf-ocr/) when you need searchable or copyable text.

## A reliable document-scanning workflow

Capture in even light, crop carefully, correct rotation, rename in sequence, choose a consistent page size, convert locally and inspect every page. Those steps matter more than the conversion button—and they produce a PDF another person can actually use.
