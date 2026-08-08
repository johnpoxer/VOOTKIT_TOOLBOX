---
title: "How to Reduce PDF File Size Without Ruining It"
date: "2026-08-05"
description: "Why a text PDF barely shrinks and a scan collapses to a tenth, what every compressor actually does to your pages, and the one trade-off nobody mentions until your text stops being selectable."
thumbnail: "/assets/blog/reduce-pdf-file-size.jpg"
author: "The Vootkit team"
---

A PDF can look perfect on screen and still be unusable: 25 MB against a 5 MB upload limit, or an attachment your recipient's mail server silently bounces.

The useful question isn't "how do I make this smaller". It's "what in here is actually heavy", because the answer determines whether you'll get a 90% reduction or almost nothing — and whether you'll wreck the document doing it.

## Why one PDF is 400 KB and another is 40 MB

A hundred-page text document can be under a megabyte. A ten-page scan can be forty.

The reason is that text in a PDF is stored as instructions — *set this font, draw these characters here* — and then Flate-compressed, the same algorithm as a ZIP. It's already about as small as it gets. There is no fat left to trim.

Images are the opposite. A page created from a phone photograph carries twelve million pixels whether or not anyone will ever look closer than a screen's worth. A scanner producing 300 DPI colour output generates roughly 25 MB per A4 page before compression.

So before you compress anything, work out which document you have:

| What's in it | What compression will do |
|---|---|
| Text, tables, vector charts | Very little — it's already compressed |
| Scanned pages | A great deal — every page is a photograph |
| Embedded photos | A great deal |
| Text with a few images | Depends entirely on those images |

If a text-only PDF is enormous, compression is the wrong tool. Look for embedded fonts that weren't subsetted, or attachments hidden inside the file.

## What compressing actually does to the page

This is the part that gets left out, and it matters more than any setting.

Most browser-based PDF compressors — [ours included](/tools/pdf/compress-pdf/) — work by re-rendering each page and re-encoding it as a JPEG, then rebuilding the PDF from those images. That is what produces the large reductions on scans.

**It also means the text on those pages stops being text.**

After compression you cannot select it, search it, or copy it. A screen reader can't read it. If you compress a contract and then need to find a clause, you'll be reading with your eyes and scrolling.

For a scan this changes nothing — it was already an image and never had selectable text. For a document you produced from Word, it changes a great deal.

So the rule is simple: **compress scans freely, compress text documents only when you have no choice**, and keep the original either way.

## Choose by what the file is for

| Use | Sensible target | Notes |
|---|---|---|
| Email attachment | Under 10 MB | Most providers cap at 25 MB, but corporate filters are often stricter |
| Upload portal | Whatever they state | Read the limit before compressing; don't guess |
| Reading on a phone | Aggressive is fine | Nobody is pinch-zooming a receipt |
| Archiving | Light or none | You can always shrink a copy later; you can't unshrink |
| Professional printing | Don't | Send the original and let the printer handle it |

That archiving row is the one people regret. Compression is destructive and the discarded detail does not come back.

## Scale before quality

Both of the settings on our compressor make the file smaller, and they don't do it equally well.

**Page scale** reduces how many pixels each page has. **Quality** keeps the pixels and encodes them harder.

Reach for scale first. Fewer pixels rendered cleanly almost always looks better than the same number of pixels squeezed until they turn blocky. Dropping from 100% to 75% removes about 44% of the pixels and usually looks fine on screen; pushing quality from Balanced to Strong at full scale tends to show up as smearing around text edges and mottling in flat areas.

Start on **Balanced at 100%**. Still too big? Try **Balanced at 75%** before touching quality at all.

## Delete pages before you compress them

Obvious once said, routinely skipped: there is no point compressing pages you don't need.

If your 30-page submission contains 12 pages of appendices nobody asked for, removing them beats any compression setting. [Delete PDF Pages](/tools/pdf/delete-pdf-pages/) removes them and [Extract PDF Pages](/tools/pdf/extract-pdf-pages/) pulls out only the ones you want.

There's a smarter version of this for mixed documents. If the file is mostly text with three heavy image pages, extract those three, compress them alone, and merge them back — you shrink what's actually heavy and keep selectable text on every other page. It takes two minutes and it's strictly better than compressing the whole thing.

## Hitting a specific limit

Portals state a maximum and reject anything above it. The reduction you need is arithmetic:

```
(current − limit) ÷ current × 100 = % you must remove
```

An 11.8 MB file against a 5 MB cap: `(11.8 − 5) ÷ 11.8 × 100 ≈ 58%`. The [Percentage Calculator](/tools/finance/percentage-calculator/) does it if you'd rather not.

Knowing that number tells you which lever to pull. Under 30% is usually one quality step. Around 60% typically wants the 75% scale. If you need 90%, you're looking at 50% scale — or the document has pages in it that shouldn't be there.

## Scans, and when OCR is the answer

A scanned PDF is a stack of photographs. That's why it's huge, and why it compresses so well.

But if what you actually need is the *content* — to search it, quote it, paste it into something else — compression doesn't help at all. It makes a smaller picture of the same unsearchable page.

Run it through [PDF & Image OCR](/tools/pdf/pdf-ocr/) instead. That reads the characters out of the image and gives you text you can work with. If you only need the words and not the layout, [PDF Text Extractor](/tools/pdf/pdf-to-text/) pulls them straight out.

Different problem, different tool. "My PDF is too big" and "I can't get anything out of my PDF" feel similar and have nothing to do with each other.

## Check the output before you send it

The file got smaller. That's not the same as the file still being good.

Open it and look at the things that carry meaning: small print, signatures, stamps, figures in tables, thin lines on charts, logos. Those are where compression damage shows first, because they depend on fine detail that the encoder is designed to discard.

Be especially careful with contracts, medical records, technical drawings, certificates, ID documents and anything with a reference number in small type. If a digit becomes ambiguous, you haven't saved 500 KB — you've created a problem.

And compress a copy. Always.

## On uploading sensitive documents

Most online PDF tools work by sending your file to a server. For a holiday itinerary that's fine. For a payslip, a passport scan, a medical letter or a signed contract, it means handing a stranger's infrastructure a document you'd think twice about emailing.

Vootkit's PDF tools don't work that way. [Compress PDF](/tools/pdf/compress-pdf/) runs inside your browser tab using your own machine — the file never leaves your device, there's nothing on a server to be breached or retained, and you can disconnect from the internet after the page loads and it will still work.

Whatever tool you use, check that before uploading anything you wouldn't want copied.

## The short version

Work out whether the weight is images or not. If it isn't, compression won't help and you should look elsewhere. If it is, delete the pages you don't need, drop the scale before you drop the quality, and check the small print before you send it.

And keep the original. That's the one step nobody regrets.
