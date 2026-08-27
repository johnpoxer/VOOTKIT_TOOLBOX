---
title: "How to Split a PDF and Extract Only the Pages You Need"
date: "2026-08-27"
description: "Learn how PDF page ranges work, extract selected pages into a clean new document, avoid numbering mistakes and check the result before sharing it."
thumbnail: "/assets/blog/split-pdf-pages.jpg"
author: "The Vootkit team"
type: "Tutorial"
category: "PDF"
tags: [Tools, Security, Productivity]
coverAlt: "A PDF document separating into several ordered page files in a browser workspace."
relatedTools: [split-pdf, extract-pdf-pages, delete-pdf-pages, protect-pdf]
relatedWorkflow: "pdf-page-cleanup"
---

You rarely need to send an entire PDF when the recipient asked for one chapter, one signed page or three pages from a statement. Extracting only what is required makes the file smaller, easier to review and less likely to reveal unrelated information.

The difficult part is not pressing Split. It is choosing the correct pages and confirming that the new document still makes sense on its own.

## Split, extract and delete are different jobs

People use “split PDF” for several actions:

- **Extract pages** copies selected pages into a new PDF and leaves the original unchanged.
- **Delete pages** creates a new PDF containing everything except the pages you remove.
- **Split every page** makes many one-page documents.
- **Split by sections** makes several documents from ranges such as pages 1–4 and 5–9.

Vootkit's [Split PDF](/tools/pdf/split-pdf/) is an extractor: you enter the pages to keep and receive one new PDF containing those pages in the order specified.

## Understand page-range notation

Use a hyphen for a continuous range and commas for separate pages:

| Input | Result |
|---|---|
| `1-3` | Pages 1, 2 and 3 |
| `2,5,7` | Pages 2, 5 and 7 |
| `1-3,8,10-12` | Pages 1–3, page 8 and pages 10–12 |

The numbers refer to physical positions in the PDF, starting with the first page as page 1. A printed document may label its cover with no number and begin visible numbering later. That means printed “page 5” might be physical page 7. Use the thumbnail or page counter in your PDF reader rather than trusting the number printed on the paper.

## Extract pages step by step

1. Open the original and write down the physical pages you need.
2. Open [Split PDF](/tools/pdf/split-pdf/).
3. Choose the source document.
4. Enter a range such as `4-9` or a mixed selection such as `2,4,7-10`.
5. Select **Extract pages**.
6. Download the new file and open it before sharing.

The tool reports the original page count, number extracted and output size. It also rejects a range that does not match the document, instead of silently returning an empty file. Processing happens in your browser and the document is not uploaded to Vootkit.

## Preserve context

An extracted page can become misleading when separated from its heading, date or footnotes. If page 8 contains a table whose title is on page 7, extract both. If a signature page refers to terms on the previous page, include the terms unless the recipient already has them.

For formal submissions, consider adding a cover page stating what the extract contains and where it came from. Do not present a partial document as complete.

## Remove private information before sharing

Extracting fewer pages reduces exposure, but the selected pages may still contain addresses, account numbers, reference codes or hidden annotations. Review the visible content at high zoom. Use a genuine redaction tool when information must be destroyed; drawing a black rectangle in a basic editor may only cover text that remains selectable underneath.

If the extract needs access control, run the finished copy through [Protect PDF](/tools/pdf/protect-pdf/) and communicate the password separately.

## When Delete PDF Pages is easier

If you need 47 pages from a 50-page document, entering a long keep-list is inefficient. Use [Delete PDF Pages](/tools/pdf/delete-pdf-pages/) to remove the three unwanted pages. If you need a few scattered pages, Split PDF is clearer.

Use [Extract PDF Pages](/tools/pdf/extract-pdf-pages/) when its page-selection interface better fits the job. The correct tool is the one that makes the intended result obvious before processing.

## Common questions

### Does splitting damage the original?

No. The browser creates a new file. Your original remains where it was unless you delete it yourself.

### Why does my range return the wrong content?

You probably used printed page numbers rather than physical PDF positions. Count covers, contents pages and unnumbered inserts.

### Will links and forms still work?

Ordinary page content usually transfers, but links to removed pages and complex document-level features may no longer behave as intended. Test anything interactive.

### Can I split a password-protected PDF?

The document must be readable by the PDF engine. If you are authorized to use it, open it with the password and export an unlocked working copy first. Never bypass protection on a file you do not have permission to modify.

## The safe habit

Keep the original, extract the smallest complete section, verify page numbers and context, inspect for private data, then name the result clearly. `Statement-pages-4-to-6.pdf` is much safer than `document-final-new.pdf`.
