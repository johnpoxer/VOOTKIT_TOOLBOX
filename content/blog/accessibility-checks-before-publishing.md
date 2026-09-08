---
title: "Six Accessibility Checks to Run Before Publishing a Web Page"
date: "2026-09-08"
description: "Check contrast, colour, headings, alt text and captions, then test the interactions that automated accessibility tools cannot judge."
thumbnail: "/assets/blog/format-json-privately.jpg"
coverAlt: "Illustrated browser workspace with structured content."
author: "The Vootkit team"
type: "Guide"
category: "Accessibility"
tags: [Design, Developer, Tools]
relatedTools: [contrast-checker, accessible-palette, color-blind-simulator, heading-checker, alt-text-auditor, caption-validator]
---

An accessibility check is useful when it leads to a specific repair: darker text, a descriptive heading, an image description that explains the image's purpose, or captions that match the speaker. A green result from one checker does not establish that the whole page is accessible.

Start with one representative page and its real content. Check the default view, an error state and the mobile layout. Vootkit's browser tools can help inspect individual ingredients; you still need to test the assembled page.

## 1. Measure the actual text colours

Open [Contrast Checker](/tools/accessibility/contrast-checker/) and enter the foreground and background colours used by the text. Do not measure the brand palette in isolation: a blue that works on white may fail on another blue.

WCAG's minimum text contrast criterion generally requires 4.5:1 for ordinary text and 3:1 for large text, with defined exceptions. Large text means at least 18 point, or 14 point bold; it does not simply mean a heading. Consult the [W3C contrast explanation](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) for the definitions and exceptions.

Test field hints and validation messages as well as paragraphs. If text sits over a photograph or gradient, inspect the least favourable area underneath it. A single background hex value cannot represent a changing image.

## 2. Repair a failing palette deliberately

Use [Accessible Palette](/tools/accessibility/accessible-palette/) to explore a lighter or darker version of a base colour against the selected background. Treat the suggested shade as a candidate, then measure the actual pair again.

For example, an interface might use pale blue for links because it matches the logo. Darkening the link colour preserves the overall palette while improving the reading experience. Underlining the link also distinguishes it from surrounding text without depending only on hue.

Keep the original colour for decoration if appropriate. There is no need to recolour the entire interface to fix one low-contrast label.

## 3. Check meaning without colour alone

[Colour Blindness Simulator](/tools/accessibility/color-blind-simulator/) helps inspect an image under simulated colour-vision differences. It is a design aid, not a reproduction of every person's vision.

Consider a chart showing approved and rejected applications. If red and green are the only distinction, add visible labels or different markers. Repeat the check on the exported chart rather than assuming an accessible palette makes every combination understandable.

The same principle applies to forms: write a useful error message beside the affected field. A red border by itself does not explain which value needs correcting.

## 4. Read the heading outline

Paste the relevant HTML into [Heading Checker](/tools/accessibility/heading-checker/). Review whether the headings describe a logical document structure. A list of headings should give a reader a reasonable overview without requiring every paragraph.

For an article, a page title might introduce sections such as “Required documents”, “Submission steps” and “Troubleshooting”. Smaller headings belong inside those sections. Do not choose a heading level merely to get a smaller font; change the styling instead.

Inspect the rendered page too. Pasted HTML does not include every change that scripts, menus or content-management templates may introduce at runtime.

## 5. Audit image descriptions in context

Use [Alt Text Auditor](/tools/accessibility/alt-text-auditor/) to find image markup that needs attention. Finding an alt attribute is only a structural check. A description such as “image” can pass a presence check while providing almost no useful information.

Ask what the reader loses if the image is unavailable. A product photo may need a description of a visible feature; an informative chart needs its message and underlying values nearby. A purely decorative flourish may appropriately have empty alternative text.

For an image used as a link or button, explain the action or destination. Avoid repeating an adjacent caption word for word unless that repetition serves a clear purpose.

## 6. Validate captions, then watch them

Run subtitle text through [Caption Validator](/tools/accessibility/caption-validator/) to catch supported timing and formatting problems. Afterwards, play the video with sound off. Check speaker changes, missing words and whether each caption stays visible long enough to read.

A valid subtitle file can still misquote someone. Automatic checks cannot confirm the intended name, technical term or emotional meaning of a recording.

## Finish with the real interaction

Navigate with a keyboard, check visible focus, enlarge the text and try the page on a narrow screen. Open menus and trigger validation errors. These steps examine behaviour that colour and markup utilities do not cover.

Keep a short repair list with the affected element, the problem and how you checked the correction. Recheck after the final content update: a new background image or a longer button label can change the result.

### Does passing all six tools prove WCAG conformance?

No. These checks cover selected issues. A complete evaluation must consider the applicable criteria, content, interactions and user experience.

### Should every image have a long description?

No. Match the description to the image's purpose. Put complex explanations in nearby page content where everyone can use them.

### What should I fix first?

Start with barriers that prevent the core task, such as an unusable form or unreadable instructions, then work through the remaining findings. Record the actual failure rather than relying on a single overall score.
