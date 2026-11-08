---
title: "How to Extract Text From a Scanned PDF With OCR"
date: "2026-09-04"
description: "Extract and check text from scanned PDFs or images, choose a supported language and understand the 20-page limit and plain-text output."
thumbnail: "/assets/blog/pdf-ocr-guide.jpg"
coverAlt: "Original editorial cover for the PDF & Image OCR guide."
author: "The Vootkit team"
type: "Guide"
category: "PDF"
tags: "PDF, Browser Tools, Productivity"
relatedTools: "pdf-ocr, scan-to-pdf, pdf-to-text, text-diff"
---

A scanned PDF can look like ordinary text while containing only pictures of pages. Copying a sentence from it requires optical character recognition, or OCR, which predicts characters from those images.

Vootkit's [PDF & Image OCR](/tools/pdf/pdf-ocr/) produces recognised text that you can copy or download as a `.txt` file. It does **not** add a searchable text layer to the original PDF or export a newly searchable PDF. If that is the required deliverable, you need a tool that explicitly supports that output.

## Check whether you need OCR

Try selecting and copying a short sentence from the PDF first. If the document already contains usable text, [PDF Text Extractor](/tools/pdf/pdf-to-text/) is the more direct route. OCR introduces recognition uncertainty that is unnecessary when the text is already available.

For an image-only scan, inspect its quality. Characters should be in focus, correctly oriented and large enough to read. A blurred photograph cannot become perfectly accurate text just by choosing a different language model.

Keep the original beside the recognised result. It remains the reference when a date, name or amount looks suspicious.

## Know the supported input and output

| Item | Current behaviour |
|---|---|
| Source | A PDF or a browser-readable image |
| Languages | English, Spanish, French, German, Italian and Portuguese |
| PDF page limit | The first 20 pages of the selected PDF |
| PDF preparation | Pages rendered at a scale of two before recognition |
| Result | Text displayed in the tool, with page markers for multipage results |
| Export | Copy text or download `ocr.txt` |

The page limit matters even when the tool reports that processing completed. A 25-page PDF does not produce all 25 pages of text in one run. Check the original page count before starting.

## Prepare longer documents deliberately

For a document longer than 20 pages, use [Split PDF](/tools/pdf/split-pdf/) to create appropriately sized parts. Name each part with its original page range, such as `report-pages-21-25.pdf`.

The OCR output numbers pages within the processed part. Preserve the original range in your filename or notes so a marker such as “Page 1” is not confused with page one of the full report.

If several pages have a different orientation, correct the relevant source copy before OCR. Use [Rotate PDF](/tools/pdf/rotate-pdf/) where its operation matches the change you need, and inspect the result before extracting text.

## Extract text step by step

1. Open PDF & Image OCR and choose the intended PDF or image.
2. Select the language actually used by the text.
3. Choose **Extract text** and allow the required engine and language data to load.
4. Watch the page progress and wait for completion or an error.
5. Compare the recognised text with representative source passages.
6. Use **Copy text** or **Download .txt**, then give the result a descriptive filename.

The first run can take longer because recognition dependencies must load. Source processing happens in the browser, but a first visit is not guaranteed to work without a connection. Large pages also consume memory, so test a smaller part if the browser struggles.

## A worked receipt example

Suppose you need the supplier, date and total from five scanned receipts. Choose the language matching the receipts and process the file. Keep each recognised page associated with its original image.

Check the supplier name letter by letter, then verify the date format and every digit in the total. Pay special attention to decimal commas and decimal points. An output of `18.00` instead of `180.00` can look plausible while changing the meaning substantially.

Copy the checked values into your working record only after review. OCR is an input aid; it does not reconcile an account, certify a receipt or verify that a transaction occurred.

## Review layout and recognition errors separately

Columns and tables can emerge in an unexpected reading order. Read across the original row when checking whether a number belongs to the correct label. A block of recognised text does not preserve spreadsheet structure automatically.

Handwriting, stamps, small print and low contrast can produce errors. Check characters that look similar, such as O and 0, or I and 1. An apparently fluent sentence may still contain a changed name or omitted word.

Use [Text Diff](/tools/text/text-diff/) to compare your corrected transcription with the raw output when you need a record of edits. The comparison identifies changes; the scan establishes which version is accurate.

## Save text and source together

Keep the scan and reviewed text under related filenames. Avoid overwriting the raw recognition result until you have a checked copy. If you share the extracted text, remember that it can contain the same private details as the image.

### Can I search the original PDF after this?

Not because of this operation. You can search the exported text in a text editor, but the tool does not embed it into the original PDF.

### Why are pages missing from the text?

Check whether the PDF exceeded the first-20-page limit. Split longer documents into labelled parts and process each part.

### Can I trust the extracted numbers automatically?

No. Verify important amounts, dates and identifiers against the source. The engine recognises patterns; it does not understand the consequences of a wrong digit.
