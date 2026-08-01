/* tool-content.js — deep, tool-specific page copy.
 *
 * WHY THIS FILE EXISTS
 *
 * Measured 1 Aug 2026 across all 261 generated tool pages: a median of 95 words
 * per page did not appear on the other 260. Two unrelated tools — the image
 * compressor and the PDF merger — shared 65% of their vocabulary. Google crawled
 * 54 of those pages and marked every one "Crawled — currently not indexed",
 * which is what it does when pages are substantially the same as each other.
 *
 * The template was the problem: everything except one description sentence and
 * one example line was generated identically for every tool.
 *
 * A tool listed here gets its real copy rendered instead. A tool not listed
 * still gets the old generic template, so this can be filled in over time
 * rather than all at once.
 *
 * RULES FOR ADDING A TOOL
 *
 * 1. EVERY FACT MUST BE TRUE OF THE ACTUAL TOOL. The option names, ranges and
 *    defaults below were read out of the tool source, not invented. If you
 *    change a tool's options, change its entry here. Wrong numbers are worse
 *    than no numbers — they get cited.
 * 2. `specs` is the highest-value section. Concrete limits and thresholds are
 *    what people search for, screenshot and link to. Never pad it.
 * 3. Do not repeat the boilerplate. "Runs in your browser", "no watermark",
 *    "5 free a day" are already on every page — saying them again in the unique
 *    section defeats the point of the file.
 * 4. FAQs should answer real failure modes, not marketing questions. The four
 *    generic ones are appended automatically.
 */

/* Shared, verified constants — referenced in prose so a change lands everywhere. */
const LIMITS = {
  videoInputMB: 200,        // tools-videofx.js LIMIT
  videoMaxMinutes: 30,      // guardMeta()
  pdfMergeFiles: 20,        // tools-pdf.js merge-pdf maxFiles
  pdfMergeMB: 100           // tools-pdf.js merge-pdf maxBytes
};

module.exports = {

  /* ------------------------------------------------------------------ */
  'compress-image': {
    intro: 'A 4 MB phone photo is usually 4 MB because of resolution and sensor noise you cannot see, not because of detail you care about. This tool re-encodes the image at a quality level you choose and shows you what it saved, so you can stop at the point where the file is small enough and the picture still looks right.',
    what: [
      'Re-encodes a JPG, PNG, WebP or HEIC image as JPEG or WebP at a quality setting between 30% and 95%. The pixel dimensions are left alone — this changes how the image is stored, not how big it is on screen.',
      'The result shows the original size, the new size and the percentage saved. If the saving is disappointing, that is usually a sign the image was already compressed, or that it is a screenshot rather than a photograph.'
    ],
    specs: {
      caption: 'What the settings actually do',
      rows: [
        ['Quality range', '30–95%, default 75%'],
        ['Output formats', 'JPEG (smallest) or WebP (typically 25–35% smaller again)'],
        ['Input accepted', 'Any image the browser can decode — JPG, PNG, WebP, GIF, and HEIC in Safari'],
        ['Resolution', 'Unchanged — use the Image Resizer first if the file is larger than it needs to be'],
        ['Transparency', 'Lost when the output is JPEG; WebP keeps it'],
        ['EXIF metadata', 'Not carried into the output, so GPS coordinates are dropped']
      ]
    },
    steps: [
      'Drop the image in, or click to browse.',
      'Set <strong>Quality</strong>. 75% is the default and is invisible on most photographs; below about 50% you will start seeing blocking in skies and skin tones.',
      'Choose <strong>Output format</strong> — JPEG for maximum compatibility, WebP if the file is for a website.',
      'Compress, check the saved percentage, and download.'
    ],
    tip: 'Resize before you compress. An image displayed 800px wide but stored at 4000px is wasting 96% of its data, and no quality setting recovers that. Resizing first usually beats any amount of quality reduction, and costs nothing visible at the size the image is actually shown.',
    faqs: [
      { q: 'Why did my file barely get smaller?', a: 'Most likely it was already compressed. Re-encoding an existing JPEG at a similar quality removes very little, because the information the encoder would discard is already gone. It can even grow slightly. Compress from the original whenever you have it.' },
      { q: 'Why did my PNG get bigger?', a: 'If the output is set to JPEG and the source was a screenshot or a graphic with flat colour, JPEG is the wrong format for it — lossy compression is inefficient on hard edges. For screenshots and logos, keep PNG.' },
      { q: 'Does compressing twice make it worse?', a: 'Yes, and it is cumulative. Every lossy save discards more, and the artefacts from the first pass get compressed along with the image on the second. Always work from the original.' },
      { q: 'Which quality should I actually use?', a: 'For photographs, 75–85%. Going from 100% to 90% costs almost nothing visually and saves around 40%, because at 100% the encoder is faithfully preserving sensor noise. Below 50% the losses become obvious in gradients.' }
    ],
    related: ['resize-image', 'batch-compress', 'convert-image', 'png-to-jpg', 'jpg-to-webp', 'exif-viewer']
  },

  /* ------------------------------------------------------------------ */
  'resize-image': {
    intro: 'Resizing is the step most people skip, and it usually shrinks a file more than any quality slider will. If an image is displayed 800 pixels wide, a 4000-pixel-wide file is carrying 25 times the pixels the screen can show.',
    what: [
      'Scales an image to a width you specify, either keeping the original aspect ratio or forcing an exact width and height. Output can be PNG, JPEG or WebP.',
      'In ratio mode you set the width and the height follows. In exact mode you set both, which will stretch the image if the numbers do not match its shape — useful when a form demands precise dimensions.'
    ],
    specs: {
      caption: 'Settings and sensible values',
      rows: [
        ['Width / height range', '1–12,000 px'],
        ['Fit modes', 'Keep aspect ratio (default), or exact width × height'],
        ['Output formats', 'PNG (default), JPEG, WebP'],
        ['Blog body image', '1200–1600 px wide'],
        ['Full-width hero', '~2000 px'],
        ['Email attachment', '1200 px is plenty'],
        ['Thumbnail', '400–600 px']
      ]
    },
    steps: [
      'Drop the image in.',
      'Set <strong>Width (px)</strong> to roughly twice the size it will be displayed, so it stays sharp on high-density screens.',
      'Leave <strong>Fit</strong> on “Keep aspect ratio” unless something demands exact dimensions.',
      'Pick a <strong>Format</strong> — PNG for graphics and screenshots, JPEG or WebP for photographs.'
    ],
    tip: 'Order matters: resize first, then compress. Compressing and then resizing means you are shrinking an image that already has artefacts baked in, and those artefacts get resampled along with everything else.',
    faqs: [
      { q: 'Will resizing up make my image sharper?', a: 'No. Enlarging invents pixels by interpolating between the ones you have — it makes the image bigger and softer, never more detailed. The detail was never captured.' },
      { q: 'Why does my image look stretched?', a: 'Fit is set to “Exact height too” and the width and height you entered do not match the original proportions. Switch back to “Keep aspect ratio”, or crop to the target shape first.' },
      { q: 'What width should I use for a website?', a: 'About twice the display width. An image shown in an 800px column should be around 1600px so it stays crisp on retina screens, and no larger — beyond that you are paying download cost for pixels nobody sees.' },
      { q: 'Does this change the file size as well?', a: 'Substantially. Pixel count scales with the square of the dimension, so halving the width removes roughly 75% of the pixels. That is usually a bigger saving than any quality setting.' }
    ],
    related: ['compress-image', 'bulk-resize', 'crop-image', 'thumbnail-maker', 'social-media-image', 'convert-image']
  },

  /* ------------------------------------------------------------------ */
  'png-to-jpg': {
    intro: 'A photograph saved as PNG is often five to ten times larger than it needs to be. PNG is lossless, which sounds better and is exactly wrong for photographs — there is nothing repetitive in a photo’s gradients for lossless compression to exploit.',
    what: [
      'Converts a PNG (or any image the browser can open) to JPEG at a quality you choose, flattening any transparency onto a solid background colour first.',
      'This is the single biggest easy win on most image libraries. Screenshot tools, some export dialogs and most AI image generators all default to PNG, so people end up with photo-like images in a format built for logos.'
    ],
    specs: {
      caption: 'Conversion details',
      rows: [
        ['Quality range', '40–100%, default 90%'],
        ['Background fill', 'White, black or dark — JPEG has no alpha channel'],
        ['Typical saving on a photo', '80% or more'],
        ['Typical saving on a screenshot', 'Small, and quality drops — keep those as PNG'],
        ['Transparency', 'Replaced by the background colour you pick'],
        ['Input', 'PNG, or any format the browser can decode']
      ]
    },
    steps: [
      'Drop the PNG in.',
      'Set <strong>Quality</strong>. 90% is the default and is visually indistinguishable from the original on most photographs.',
      'If the image has transparent areas, choose the <strong>Background</strong> colour they should become.',
      'Convert and download.'
    ],
    tip: 'Check what is actually in the file before converting. If it is a screenshot containing text, JPEG will put a faint halo of noise around every letter and small type becomes harder to read. That is a case for staying with PNG.',
    faqs: [
      { q: 'My transparent background turned white. Can I get it back?', a: 'Not from the JPEG — the format has no alpha channel, so the transparency is gone once converted. Keep the PNG as your original. If you need a small file that keeps transparency, convert to WebP instead.' },
      { q: 'When should I NOT convert a PNG to JPG?', a: 'Logos, icons, diagrams, screenshots with text, and anything needing transparency. Those are what PNG is for, and JPEG handles their hard edges badly.' },
      { q: 'Why is my converted file barely smaller?', a: 'The source was probably a graphic rather than a photograph — flat colour compresses extremely well in PNG already, so there is little for JPEG to win back.' },
      { q: 'Does converting lose quality?', a: 'Yes, once, at the quality you select. At 90% that loss is invisible in normal viewing. The point is that the saving is large and the loss is not.' }
    ],
    related: ['jpg-to-png', 'png-to-webp', 'compress-image', 'convert-image', 'jpg-to-webp', 'webp-to-png']
  },

  /* ------------------------------------------------------------------ */
  'jpg-to-webp': {
    intro: 'WebP is roughly 25–35% smaller than JPEG at the same visual quality, and every current browser supports it. For images on a website it is now the sensible default, and converting an existing library is usually the fastest page-speed win available.',
    what: [
      'Re-encodes a JPG as WebP at a quality you choose. Pixel dimensions are unchanged.',
      'Unlike JPEG, WebP also supports transparency and animation, so it replaces both JPEG and PNG for web use rather than sitting alongside them.'
    ],
    specs: {
      caption: 'WebP versus JPEG',
      rows: [
        ['Size at equivalent quality', '25–35% smaller than JPEG'],
        ['Transparency', 'Supported (JPEG has none)'],
        ['Browser support', 'Universal in current browsers'],
        ['Weak spots', 'Older desktop software, some upload portals, a few print workflows'],
        ['Effect on SEO', 'Indirect — smaller images improve Largest Contentful Paint, which is a ranking signal'],
        ['LCP target', 'Under 2.5 seconds']
      ]
    },
    steps: [
      'Drop the JPG in.',
      'Set <strong>Quality</strong>. Around 80% is a good default for web images.',
      'Convert and download the WebP.'
    ],
    tip: 'Convert from your original, not from a JPEG that has already been through several saves. JPG to WebP is a second lossy encode, and the artefacts of the first one get encoded along with the picture.',
    faqs: [
      { q: 'A form rejected my WebP file. What now?', a: 'Some government and university portals, older desktop software and some print workflows still do not accept WebP. Convert it back with WebP to JPG — you will not recover what was already discarded, but you lose nothing further.' },
      { q: 'Does WebP help my Google ranking?', a: 'Not by itself. What helps is a faster page, and smaller images make pages faster. WebP is a means to that, not a ranking factor.' },
      { q: 'Should I convert my whole image library?', a: 'Convert what is served on your site. Keep the originals in whatever format they came in — you may need them later, and converting from an already-compressed WebP will be worse than converting from the source.' },
      { q: 'What about AVIF?', a: 'Smaller again, and browser support is now good, but it is slower to encode and support outside browsers still lags. Reasonable for a site you control, poor for files you hand to other people.' }
    ],
    related: ['png-to-webp', 'webp-to-jpg', 'webp-to-png', 'compress-image', 'convert-image', 'resize-image']
  },

  /* ------------------------------------------------------------------ */
  'heic-converter': {
    intro: 'HEIC is what an iPhone saves by default. The compression is genuinely excellent and the compatibility outside Apple is genuinely poor — which is why a photo that looks fine on the phone will not open on a Windows machine or upload to half the web forms in existence.',
    what: [
      'Converts an iPhone HEIC photo to JPEG or PNG at a quality you choose.',
      'One important caveat, stated plainly: this decodes the file using your browser. Safari on Apple devices can read HEIC natively. Chrome and Firefox generally cannot, so on those browsers the conversion will fail with a clear message rather than a broken file.'
    ],
    specs: {
      caption: 'What works where',
      rows: [
        ['Safari on macOS / iOS / iPadOS', 'Works — the system decodes HEIC'],
        ['Chrome, Firefox, Edge', 'Usually cannot decode HEIC; you will get an explicit error'],
        ['Output formats', 'JPEG or PNG'],
        ['Quality range', '60–100%, default 90%'],
        ['Best output for photos', 'JPEG — PNG will be many times larger for no visible gain'],
        ['Avoiding the problem entirely', 'iPhone → Settings → Camera → Formats → Most Compatible saves JPEG instead']
      ]
    },
    steps: [
      'Open this page in <strong>Safari</strong> if you are on a Mac, iPhone or iPad. On Windows or Android the browser most likely cannot read HEIC at all.',
      'Drop the .heic photo in.',
      'Choose <strong>Convert to</strong> — JPEG for photographs, PNG only if you specifically need lossless.',
      'Set <strong>Quality</strong> and convert.'
    ],
    tip: 'If you keep hitting this, change the setting at source: on the iPhone, Settings → Camera → Formats → Most Compatible. The camera then saves JPEG directly and the whole problem disappears for future photos.',
    faqs: [
      { q: 'It says my browser cannot decode the file. Why?', a: 'HEIC decoding depends on the operating system, and only Apple platforms ship it to the browser. Open the page in Safari on a Mac, iPhone or iPad. This is a browser limitation rather than a fault in the file.' },
      { q: 'Why does the converted file look the same size or bigger?', a: 'HEIC is a much more efficient format than JPEG, so the same photo will usually be larger once converted. That is the price of compatibility. Lower the quality setting if the size matters more than the last few percent of fidelity.' },
      { q: 'Will I lose the photo’s date or location?', a: 'The output is re-encoded from the decoded image, so EXIF metadata including GPS is not carried across. For sharing photos publicly that is usually an advantage.' },
      { q: 'Can I convert several at once?', a: 'This tool handles one photo at a time. For a batch, the same caveat about Safari applies to every file.' }
    ],
    related: ['convert-image', 'compress-image', 'png-to-jpg', 'resize-image', 'exif-viewer', 'jpg-to-webp']
  },

  /* ------------------------------------------------------------------ */
  'merge-pdf': {
    intro: 'Combining PDFs is the one office task that reliably sends people to a website, and most of those websites upload your documents to a server to do it. Contracts, invoices and scans are exactly the files you would least like sitting on someone else’s machine.',
    what: [
      'Combines up to ' + LIMITS.pdfMergeFiles + ' PDFs into a single document, in the order you add them, keeping every page of every file.',
      'Pages are copied across rather than re-rendered, so text stays selectable, vector graphics stay sharp and the output is not a stack of images.'
    ],
    specs: {
      caption: 'Limits and behaviour',
      rows: [
        ['Files per merge', 'Up to ' + LIMITS.pdfMergeFiles],
        ['Total size', 'Up to ' + LIMITS.pdfMergeMB + ' MB'],
        ['Page order', 'The order you add the files; pages within each file keep their order'],
        ['Text and vectors', 'Preserved — pages are copied, not rasterised'],
        ['Encrypted PDFs', 'Remove the password first'],
        ['Minimum', 'Two files']
      ]
    },
    steps: [
      'Add your PDFs <strong>in the order you want them</strong> — this is the order the merged document will follow.',
      'Check the list before you run it; reordering afterwards means merging again.',
      'Merge, then download the combined PDF.'
    ],
    tip: 'If you need pages interleaved rather than appended — say, a double-sided scan that produced odds and evens as two files — merge first, then use Reorder PDF Pages to sort them.',
    faqs: [
      { q: 'The merged file is huge. Why?', a: 'Merging does not re-compress anything; the output is roughly the sum of the inputs. If the result is too large for email, run it through Compress PDF afterwards.' },
      { q: 'Can I merge a password-protected PDF?', a: 'Not directly — the file has to be readable first. Use Remove PDF Password on it, then merge.' },
      { q: 'Did my documents get uploaded?', a: 'No. The merge happens inside this browser tab using your own machine, which is why there is no queue and no upload wait even for large files.' },
      { q: 'Can I choose which pages from each file?', a: 'Merge takes whole documents. To take a subset, use Extract PDF Pages on each file first, then merge the results.' }
    ],
    related: ['split-pdf', 'compress-pdf', 'reorder-pdf', 'extract-pdf-pages', 'delete-pdf-pages', 'rotate-pdf']
  },

  /* ------------------------------------------------------------------ */
  'split-pdf': {
    intro: 'Most of the time "splitting" a PDF really means keeping a handful of pages out of a long document — the signed page from a contract, chapter three, the invoice at the back. This takes a page range and gives you exactly those pages.',
    what: [
      'Extracts the pages you specify from a PDF into a new document, leaving the original untouched.',
      'Ranges are written the way you would say them: <code>1-3</code> for the first three pages, <code>2,5,9</code> for individual pages, <code>1-3,7,10-12</code> for a mixture.'
    ],
    specs: {
      caption: 'Page range syntax',
      rows: [
        ['A range', '1-3 — pages one to three'],
        ['Single pages', '2,5,9'],
        ['Mixed', '1-3,7,10-12'],
        ['Numbering', 'Starts at 1, matching what your PDF reader shows'],
        ['Out-of-range pages', 'Ignored; the tool tells you how many pages the file actually has'],
        ['Original file', 'Never modified']
      ]
    },
    steps: [
      'Drop the PDF in.',
      'Type the pages you want to <strong>keep</strong> in the <strong>Pages to keep</strong> box — not the ones you want to remove.',
      'Extract, then download the new PDF.'
    ],
    tip: 'If it is easier to describe what you want gone than what you want kept, use Delete PDF Pages instead — same job, opposite input.',
    faqs: [
      { q: 'It says no valid pages in my range. What went wrong?', a: 'The numbers fall outside the document. The error message tells you the real page count — check for a typo, and remember the first page is 1, not 0.' },
      { q: 'Can I split one PDF into many separate files?', a: 'This tool produces one document per run. For several outputs, run it once per range.' },
      { q: 'Does the text stay selectable?', a: 'Yes. Pages are copied rather than re-rendered, so text, links and vector graphics all survive intact.' },
      { q: 'Which page numbers do I use — the printed ones or the PDF ones?', a: 'The PDF ones, as shown by your reader. A document whose first page is numbered "iii" still counts as page 1 here.' }
    ],
    related: ['merge-pdf', 'extract-pdf-pages', 'delete-pdf-pages', 'reorder-pdf', 'crop-pdf', 'compress-pdf']
  },

  /* ------------------------------------------------------------------ */
  'compress-pdf': {
    intro: 'PDFs are usually large because of the images inside them, not the text. A scanned document is a stack of photographs in a wrapper — which is why a ten-page scan can be 40 MB while a hundred-page text document is under one.',
    what: [
      'Re-renders each page and re-encodes it at a lower image quality and, optionally, a smaller scale. That is what actually shrinks a PDF, because it targets the part carrying the weight.',
      'The trade-off is worth stating plainly: because pages are re-rendered, text in the output becomes part of the image rather than selectable text. For a scan that changes nothing — it was already an image. For a text document it does, so compress those only when you have to.'
    ],
    specs: {
      caption: 'Settings',
      rows: [
        ['Quality', 'Strong (smallest), Balanced (default), Light (best quality)'],
        ['Page scale', '100%, 75% or 50%'],
        ['Best results on', 'Scans and image-heavy documents'],
        ['Little effect on', 'Text-only PDFs — there is nothing heavy to shrink'],
        ['Selectable text', 'Not preserved — pages are re-rendered'],
        ['Common email limit', '25 MB (Gmail and most providers)']
      ]
    },
    steps: [
      'Drop the PDF in.',
      'Start on <strong>Balanced</strong> at <strong>100% size</strong> and see what that gives you.',
      'Still too big? Drop the scale to 75% before reaching for Strong quality — fewer pixels usually looks better than the same pixels encoded harder.',
      'Compress and download.'
    ],
    tip: 'If the document is mostly text and only a few pages carry images, it is often better to extract those pages, compress the images separately and rebuild — you keep selectable text everywhere else.',
    faqs: [
      { q: 'Why can I no longer select the text?', a: 'Compression re-renders each page as an image, which is what makes the file smaller. If you need the text to stay selectable, this is the wrong tool for that document.' },
      { q: 'My PDF barely got smaller. Why?', a: 'It was probably already text-only or already compressed. There is no image weight to remove, so there is little to win.' },
      { q: 'How small do I need it for email?', a: 'Most providers cap attachments around 25 MB, and some corporate systems are stricter at 10 MB. Aim under 10 MB if you do not know the recipient’s setup.' },
      { q: 'Is the quality loss permanent?', a: 'Yes. The pages are re-rendered at a lower quality and the original detail is not recoverable from the output, so always compress a copy and keep the source file. If the result is too soft, go back to the original and try a lighter setting rather than compressing the compressed version — that compounds the loss.' }
    ],
    related: ['merge-pdf', 'split-pdf', 'pdf-to-jpg', 'compress-image', 'extract-pdf-pages', 'pdf-to-text']
  },

  /* ------------------------------------------------------------------ */
  'pdf-to-jpg': {
    intro: 'Turning PDF pages into images is what you need when something will not accept a PDF — a social post, a slide, a form that only takes photographs, or a document you want to show without letting it be edited.',
    what: [
      'Renders each page of a PDF as a JPG image at a resolution you choose.',
      'Every page becomes its own image. Because it is a render rather than an extraction, what you get is exactly what the page looks like, including fonts, vector drawings and layout.'
    ],
    specs: {
      caption: 'Resolution settings',
      rows: [
        ['Standard', '1.5× — screen viewing, smallest files'],
        ['High', '2× (default) — good for most uses'],
        ['Very high', '3× — print, or when text must stay crisp when zoomed'],
        ['Output', 'One JPG per page'],
        ['Text', 'Becomes part of the image and is no longer selectable'],
        ['Rendering', 'Page-accurate, including fonts and vector graphics']
      ]
    },
    steps: [
      'Drop the PDF in.',
      'Pick a resolution. <strong>High</strong> suits most uses; choose <strong>Very high</strong> only if the result will be printed or zoomed.',
      'Convert, then download the pages you need.'
    ],
    tip: 'Higher is not automatically better. At 3× a long document produces very large images and takes noticeably longer to render, and on screen it looks identical to 2×. Match the setting to where the image is going.',
    faqs: [
      { q: 'I need the text, not a picture of it.', a: 'Use PDF to Text, which pulls the text layer out directly. This tool deliberately produces images.' },
      { q: 'Why is my output blurry?', a: 'The resolution is too low for how you are viewing it, or the source page was a low-resolution scan to begin with — rendering cannot add detail that was never there. Try Very high, and check the original.' },
      { q: 'Can I get PNG instead?', a: 'Yes — PDF to PNG does the same job with lossless output. PNG suits pages of text and line art; JPG suits pages that are mostly photographic.' },
      { q: 'Does it do every page?', a: 'Yes, every page becomes an image. If you only want some of them, run Extract PDF Pages first.' }
    ],
    related: ['pdf-to-png', 'pdf-to-text', 'jpg-to-pdf', 'compress-pdf', 'extract-pdf-pages', 'split-pdf']
  },

  /* ------------------------------------------------------------------ */
  'compress-for-discord': {
    intro: 'Discord’s free upload limit is 10 MB, and the instinct is to hammer the quality slider until the number goes down — which is exactly how a clip ends up a smeary mess. Working backwards from the target size gets you a better result, and this tool does that arithmetic for you.',
    what: [
      'Takes a target file size and works out the video bitrate that fits it, leaving room for the audio you chose plus container overhead, then encodes to that.',
      'Where the target bitrate is too low to carry the original frame size, the video is scaled down to a resolution that bitrate can actually support. At low bitrates a smaller frame genuinely looks better than a large one starved of data — and it encodes faster.'
    ],
    specs: {
      caption: 'Limits and targets',
      rows: [
        ['Discord free', '10 MB'],
        ['Nitro Basic', '50 MB'],
        ['Nitro', '500 MB'],
        ['Audio options', '96, 128 (default) or 192 kbps'],
        ['Encoding', 'Balanced, or Faster (about 1.4× quicker, slightly softer)'],
        ['Maximum input', LIMITS.videoInputMB + ' MB'],
        ['Maximum length', LIMITS.videoMaxMinutes + ' minutes'],
        ['Output', 'MP4 (H.264 + AAC), constant frame rate']
      ]
    },
    steps: [
      'Drop the video in — MP4, MOV, MKV, AVI and WebM all work.',
      'Choose <strong>Fit into</strong> to match your Discord plan.',
      'Set <strong>Audio quality</strong>. 128 kbps is a good default; drop to 96 if you are close to the line.',
      'Pick <strong>Encoding</strong> — Balanced, or Faster if the wait matters more than the last few percent of sharpness.'
    ],
    tip: 'Trim before you compress. File size is bitrate times duration, so cutting four seconds of dead air off each end removes that share of the file at full quality. It is the only free step available, and it is often the whole gap between 12 MB and 9 MB.',
    faqs: [
      { q: 'The result is still over the limit.', a: 'Usually the clip is long enough that even a low bitrate overshoots. Trim it, or step the audio down to 96 kbps. If a ten-minute video must fit in 10 MB, no encoder will make that look acceptable.' },
      { q: 'Why did the resolution change?', a: 'The bitrate needed to hit your target could not carry the original frame size. Scaling down means the available bits are spread over fewer pixels, which looks better than the alternative and finishes sooner. The output stats show the resolution used.' },
      { q: 'Why is it slow?', a: 'Encoding runs on your own processor rather than a server, so a long or high-resolution clip takes real time. The progress bar shows a live percentage and estimated time remaining. Choosing Faster trades a little sharpness for about 1.4× the speed.' },
      { q: 'Can I compress a clip that is already small?', a: 'Yes, and it will not be made larger — the bitrate is capped at the source’s own, so a file that already fits comes back roughly as it was rather than being inflated to fill the target.' }
    ],
    related: ['trim-video', 'resize-video', 'convert-video', 'mute-video', 'video-to-gif', 'extract-audio']
  }
};

module.exports.LIMITS = LIMITS;
