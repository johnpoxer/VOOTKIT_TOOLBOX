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
,

  /* ================= session 1 ================= */

  'jpg-to-pdf': {
    intro: 'Photographing a document and emailing the JPGs is the version everybody hates receiving — the pages arrive in whatever order the mail client feels like, and nobody can print them as a set. One PDF solves both.',
    what: [
      'Combines up to 30 images into a single PDF, one image per page, in the order you add them.',
      'Page size is your choice. "Fit to each image" makes every page exactly the shape of the photo on it, which is right for screenshots and receipts. A4 or US Letter centres each image on a standard page instead, which is what you want if anyone will print it.'
    ],
    specs: {
      caption: 'Limits and page options',
      rows: [
        ['Images per PDF', 'Up to 30'],
        ['Total size', 'Up to 40 MB'],
        ['Page size', 'Fit to each image (default), A4 portrait, or US Letter'],
        ['Margin', '0–100 pt, default 0'],
        ['Page order', 'The order you add the images'],
        ['Accepts', 'JPG, PNG, WebP and other images the browser can open'],
        ['Output', 'One PDF, one image per page']
      ]
    },
    steps: [
      'Add your images <strong>in the order you want the pages</strong>.',
      'Choose <strong>Page size</strong> — “Fit to each image” for screenshots, A4 or US Letter if it will be printed.',
      'Set a <strong>Margin</strong> if you picked A4 or Letter. Around 20–40 pt keeps content clear of the edge for printing.',
      'Convert and download.'
    ],
    tip: 'Resize photos before adding them. Thirty phone photos at full resolution will blow past the 40 MB cap and produce a PDF nobody can email, and the extra pixels are invisible once the page is printed. Around 1500 px on the long edge is plenty.',
    faqs: [
      { q: 'The pages came out in the wrong order.', a: 'Pages follow the order you added the images, not their filenames. If your files are numbered, add them one at a time in sequence rather than selecting them all at once, since the browser does not guarantee it hands them over in filename order.' },
      { q: 'Why is my PDF so large?', a: 'Because it contains full-resolution photographs. The PDF wrapper adds very little — the images are the weight. Resize or compress them first, or run the finished PDF through the PDF compressor.' },
      { q: 'Can I mix portrait and landscape photos?', a: 'Yes. With “Fit to each image” every page takes the shape of its own image, so a mix is fine. With A4 or Letter every page is the same size and images are centred within it.' },
      { q: 'Can I add a page of text as well?', a: 'Not in this tool — it takes images only. Make the text page separately with Text to PDF, then join the two with Merge PDF.' }
    ],
    related: ['merge-pdf', 'compress-pdf', 'png-to-pdf', 'pdf-to-jpg', 'text-to-pdf', 'resize-image']
  },

  'rotate-pdf': {
    intro: 'Scanners and phone cameras record an orientation flag that plenty of PDF readers ignore, which is how you end up with a document that is upright on your screen and sideways on someone else’s. Rotating the pages fixes it permanently rather than per-viewer.',
    what: [
      'Turns pages by 90°, 180° or 270° and writes the new orientation into the file, so it opens correctly everywhere.',
      'You can rotate the whole document or just some of it. That matters for scans, where a single landscape page — a table or a signature sheet — often sits in an otherwise portrait file.'
    ],
    specs: {
      caption: 'Rotation options',
      rows: [
        ['Rotate by', '90° clockwise (default), 180°, or 270° (90° anti-clockwise)'],
        ['Which pages', 'all (default), or a range like 2-5 or 1,3,7'],
        ['Page numbering', 'Starts at 1, matching your PDF reader'],
        ['Content', 'Text stays selectable — pages are rotated, not re-rendered'],
        ['File size', 'Essentially unchanged'],
        ['Accepts', 'PDF']
      ]
    },
    steps: [
      'Drop the PDF in.',
      'Pick <strong>Rotate by</strong>. If the page is lying on its right side, 90° clockwise is usually wrong and 270° is right — check one page before doing all of them.',
      'Leave <strong>Which pages</strong> as <code>all</code>, or list the ones that need it.',
      'Rotate and download.'
    ],
    tip: 'Rotation is stored as metadata rather than by redrawing the page, so it is lossless and instant, and doing it twice gets you back where you started. That also means a page that looks rotated because the scan itself is crooked cannot be fixed here — that needs a re-scan.',
    faqs: [
      { q: 'Only some pages are sideways. Do I have to do them separately?', a: 'No. Put those page numbers in the “Which pages” box — for example 4,7,12 or 5-9 — and the rest are left alone.' },
      { q: 'How do I know whether to use 90° or 270°?', a: 'If you have to tilt your head to the left to read it, use 90° clockwise. If you tilt right, use 270°. Rotating one page first and checking is faster than guessing on a hundred.' },
      { q: 'Will this reduce quality?', a: 'No. The orientation is a property of the page, so nothing is re-encoded and the file size barely changes.' },
      { q: 'My PDF still opens sideways after rotating.', a: 'Some older readers ignore page rotation entirely. If a specific application is the problem rather than the file, converting the pages to images and rebuilding is the reliable fallback.' }
    ],
    related: ['merge-pdf', 'split-pdf', 'crop-pdf', 'delete-pdf-pages', 'reorder-pdf', 'pdf-to-jpg']
  },

  'extract-pdf-pages': {
    intro: 'Pulling a few pages out of a long PDF is one of those jobs that sounds trivial and turns into a fight with software that wants to re-print, re-render or watermark the result. This copies the pages you name into a new file and leaves everything else alone.',
    what: [
      'Takes a page range and produces a new PDF containing exactly those pages, in the order you list them.',
      'Because pages are copied rather than re-rendered, text stays selectable, links keep working and vector graphics stay sharp. The original file is never modified.'
    ],
    specs: {
      caption: 'Range syntax',
      rows: [
        ['Default', 'all'],
        ['A range', '2-5'],
        ['Individual pages', '1,4,9'],
        ['Mixed', '1-3,7,10-12'],
        ['Numbering', 'Starts at 1, matching your PDF reader'],
        ['Order', 'Pages appear in the order you list them'],
        ['Original file', 'Never modified']
      ]
    },
    steps: [
      'Drop the PDF in.',
      'Type the pages you want in <strong>Pages to extract</strong>.',
      'Extract and download the new PDF.'
    ],
    tip: 'The order you type is the order you get, so this doubles as a quick reordering tool — entering 3,1,2 gives you those three pages in that sequence. Handy for putting a signature page first without opening an editor.',
    faqs: [
      { q: 'What is the difference between this and Split PDF?', a: 'Very little — both keep the pages you name. Extract is worded around pulling pages out of a long document, Split around cutting one down. Use whichever matches how you are thinking about it.' },
      { q: 'Can I extract pages into separate files?', a: 'One run produces one PDF containing everything you listed. If you need each page as its own file, run the tool once per page — entering 3, then 4, then 5 — which is quicker than it sounds because the original stays loaded between runs.' },
      { q: 'Do bookmarks and links survive?', a: 'Links within the pages you kept survive. Bookmarks pointing at pages you did not keep have nothing to point to and are dropped.' },
      { q: 'Which page numbers do I use?', a: 'The ones your PDF reader shows, starting at 1 — not the numbers printed on the page. A report whose first page is numbered “i” is still page 1 here.' }
    ],
    related: ['split-pdf', 'merge-pdf', 'delete-pdf-pages', 'reorder-pdf', 'rotate-pdf', 'compress-pdf']
  },

  'remove-pdf-password': {
    intro: 'There are two kinds of PDF password. One stops the file opening at all; the other lets anyone read it but blocks printing, copying and editing. This removes the second kind — the permissions lock — from a document you can already open.',
    what: [
      'Rewrites a PDF you can open into an unrestricted copy, so printing, copying text and further editing work normally.',
      'To be explicit about what this is not: it does not break encryption and it cannot open a document you do not have the password for. If the file demands a password before it will display, this tool cannot help, and neither should anything else you find online.'
    ],
    specs: {
      caption: 'What it can and cannot do',
      rows: [
        ['Removes', 'Permissions restrictions — printing, copying, editing'],
        ['Cannot remove', 'An open password you do not know'],
        ['Requires', 'A PDF that already opens without prompting'],
        ['Text', 'Stays selectable — pages are copied, not re-rendered'],
        ['Original file', 'Never modified'],
        ['Accepts', 'PDF']
      ]
    },
    steps: [
      'Check the PDF opens without asking for a password.',
      'Drop it in.',
      'Run it, then download the unrestricted copy.'
    ],
    tip: 'Permissions locks are an honour system — the restrictions are flags in the file that readers choose to respect, which is why they come off so easily. Do not rely on one to protect anything that actually matters. Only encryption with an open password does that, and it is not removable without the password.',
    faqs: [
      { q: 'It will not open my file at all.', a: 'Then it has an open password, not a permissions lock, and the contents are genuinely encrypted. You need the password from whoever sent it — there is no way around that, here or anywhere.' },
      { q: 'Is this legal?', a: 'Removing restrictions from a document you are entitled to use is normally fine — a bank statement you cannot print is the usual case. Redistributing material you have no rights to is not, and that does not change because the file was easy to unlock.' },
      { q: 'Why could I read it but not print it?', a: 'That is exactly the permissions lock. The document was never encrypted against reading, only flagged to discourage printing and copying.' },
      { q: 'Can I add a password instead?', a: 'Yes, that is what Protect PDF does. Worth knowing which kind you are setting: an open password genuinely encrypts the file and cannot be removed without it, while a permissions lock only discourages printing and copying and comes off as easily as this tool removes it.' }
    ],
    related: ['protect-pdf', 'merge-pdf', 'split-pdf', 'compress-pdf', 'pdf-to-text', 'pdf-repair']
  },

  'crop-image': {
    intro: 'Most cropping is not artistic — it is a platform demanding a shape. A square for a profile, 9:16 for a story, 16:9 for a thumbnail. This crops to those ratios directly instead of making you drag handles and hope.',
    what: [
      'Crops to a fixed aspect ratio, taking the largest area of that shape that fits inside your image.',
      'You choose where it takes that area from. Centre suits most photographs; Top is the one to use for portraits, because a centre crop to a square on a standing figure reliably cuts the head off.'
    ],
    specs: {
      caption: 'Ratios and what they are for',
      rows: [
        ['Square 1:1', 'Profile pictures, Instagram feed posts'],
        ['Portrait 4:5', 'The tallest shape Instagram allows in the feed'],
        ['Story 9:16', 'Stories, Reels, TikTok, Shorts'],
        ['Wide 16:9', 'YouTube thumbnails, slides, video covers'],
        ['Photo 3:2', 'Standard camera ratio, most print sizes'],
        ['Crop from', 'Centre (default), Top, or Bottom'],
        ['Resolution', 'Unchanged — this removes area, it does not resample']
      ]
    },
    steps: [
      'Drop the image in.',
      'Pick an <strong>Aspect ratio</strong>.',
      'Set <strong>Crop from</strong>. Use <strong>Top</strong> for anything with a person in it, unless they are centred in the frame.',
      'Crop and download.'
    ],
    tip: 'Crop before you resize. Cropping removes area and resizing removes detail, so doing it the other way round means you spent quality on pixels you then threw away.',
    faqs: [
      { q: 'It cut off the top of someone’s head.', a: 'Centre cropping a tall photo to a square removes equal amounts from the top and bottom, and heads live at the top. Switch Crop from to Top.' },
      { q: 'Can I choose the exact area myself?', a: 'Not here — this is deliberately three clicks rather than a drag interface. For a specific region, crop in an editor and use this for the ratios.' },
      { q: 'Does cropping reduce quality?', a: 'No. It discards area, and what remains is untouched. Only resizing or re-compressing loses detail.' },
      { q: 'Which ratio does a profile picture need?', a: 'Square, on essentially every platform. Most then mask it to a circle when displaying, so keep the subject away from the corners — or use the Round Profile Picture tool, which crops to a circle directly.' }
    ],
    related: ['circle-crop', 'resize-image', 'social-media-image', 'thumbnail-maker', 'compress-image', 'passport-photo-maker']
  },

  'convert-image': {
    intro: 'One tool for the format conversions that otherwise need three. Pick the output, pick the quality, done — without having to find the specific PNG-to-something page first.',
    what: [
      'Converts between PNG, JPEG and WebP. Pixel dimensions are unchanged; only the encoding changes.',
      'The quality setting applies to JPEG and WebP, which are lossy. PNG ignores it, because PNG is lossless — a PNG at "quality 40" and "quality 100" are the same file.'
    ],
    specs: {
      caption: 'Formats and settings',
      rows: [
        ['Convert to', 'PNG (default), JPEG, or WebP'],
        ['Quality', '40–100%, default 92% — applies to JPEG and WebP only'],
        ['Transparency', 'Kept by PNG and WebP; lost by JPEG'],
        ['Smallest output', 'WebP, typically 25–35% under JPEG at equal quality'],
        ['Widest compatibility', 'JPEG'],
        ['Accepts', 'Any image the browser can open'],
        ['Resolution', 'Unchanged']
      ]
    },
    steps: [
      'Drop the image in.',
      'Choose <strong>Convert to</strong>.',
      'Set <strong>Quality</strong> if the output is JPEG or WebP. 92% is the default and is visually lossless on most images.',
      'Convert and download.'
    ],
    tip: 'Converting to PNG never shrinks a photograph — it usually grows it several times over. PNG only wins on flat colour: logos, screenshots, diagrams. If the goal is a smaller file from a photo, the answer is JPEG or WebP.',
    faqs: [
      { q: 'Which format should I pick?', a: 'WebP for anything going on a website. JPEG for photos you will email or upload somewhere that might be fussy. PNG for logos, screenshots and anything needing transparency.' },
      { q: 'My transparent background went white.', a: 'The output is JPEG, which has no alpha channel. Choose PNG or WebP to keep transparency.' },
      { q: 'Why is the quality slider greyed out or ignored?', a: 'You have selected PNG, which is lossless — there is no quality to trade, so the setting has nothing to act on. It applies only to JPEG and WebP. If you want a smaller file and the slider is doing nothing, that is the format telling you to pick a different one.' },
      { q: 'Does converting back and forth lose quality?', a: 'Between lossy formats, yes, every time. JPEG to WebP to JPEG is two lossy encodes and the damage accumulates. Convert from the original.' }
    ],
    related: ['png-to-jpg', 'jpg-to-webp', 'webp-to-jpg', 'compress-image', 'heic-converter', 'resize-image']
  },

  'jpg-to-png': {
    intro: 'This is the conversion that is usually a mistake, and occasionally exactly right. Worth knowing which one you are doing before you click.',
    what: [
      'Converts a JPG to PNG. PNG is lossless, so nothing further is discarded — but nothing already lost comes back either.',
      'The honest warning: on a photograph the PNG will be several times larger than the JPG for no visible gain, because lossless compression has nothing to exploit in continuous gradients. The valid reasons are needing a lossless working copy before editing, or software that will not accept JPEG.'
    ],
    specs: {
      caption: 'What actually changes',
      rows: [
        ['Compression', 'Lossless from this point on'],
        ['File size on a photo', 'Typically 3–10× larger than the JPG'],
        ['File size on a screenshot', 'Often smaller, and sharper'],
        ['Existing JPEG artefacts', 'Preserved exactly — they are part of the image now'],
        ['Transparency', 'Supported by the format, but a JPG has none to carry'],
        ['Resolution', 'Unchanged']
      ]
    },
    steps: [
      'Check you actually want this — on a photograph the PNG will be several times larger for no visible gain.',
      'Drop the JPG in.',
      'Convert and download the PNG.'
    ],
    tip: 'Converting to PNG does not undo JPEG compression. The blocking and ringing around edges are baked into the pixels; PNG simply stores them faithfully and at greater size. If a JPG looks bad, the fix is a better source, not a better container.',
    faqs: [
      { q: 'Will this make my JPG look better?', a: 'No. It preserves exactly what is there, including the compression artefacts. Nothing is recovered.' },
      { q: 'Why did the file get so much bigger?', a: 'That is PNG working as designed. It never discards data, so a photograph — millions of subtly different pixels — has almost nothing repetitive to compress.' },
      { q: 'When is this genuinely the right move?', a: 'Before editing, so repeated saves do not compound JPEG loss; and when software or a print workflow demands PNG.' },
      { q: 'I wanted transparency.', a: 'Converting cannot create it. A JPG has no transparent pixels, so the PNG will be fully opaque. Transparency has to be cut in an editor.' }
    ],
    related: ['png-to-jpg', 'convert-image', 'jpg-to-webp', 'png-to-webp', 'compress-image', 'svg-to-png']
  },

  'png-to-webp': {
    intro: 'PNG is the right format for logos and screenshots and the wrong format for shipping them to a browser. WebP keeps everything PNG is good at — including transparency — at a fraction of the weight.',
    what: [
      'Converts a PNG to WebP at a quality you choose, keeping any transparency.',
      'This is the conversion that makes WebP worth bothering with. Going JPG to WebP saves perhaps a quarter; going PNG to WebP on a graphic frequently saves two thirds, because you are moving from lossless to lossy on an image where the loss is invisible.'
    ],
    specs: {
      caption: 'Conversion details',
      rows: [
        ['Quality', '40–100%, default 90%'],
        ['Transparency', 'Kept'],
        ['Typical saving on a graphic', 'Around 50–70%'],
        ['Typical saving on a screenshot', 'Substantial, but check text edges at low quality'],
        ['Browser support', 'Universal in current browsers'],
        ['Weak spots', 'Older desktop software, some upload portals'],
        ['Resolution', 'Unchanged']
      ]
    },
    steps: [
      'Drop the PNG in.',
      'Set <strong>Quality</strong>. 90% is the default; for logos and flat colour you can usually go to 80% with no visible change.',
      'Convert and download.'
    ],
    tip: 'Check text and hard edges before shipping. WebP is lossy at these settings, and while photographs hide that easily, a screenshot of small type is the one case where you may need to stay above 90% — or keep the PNG.',
    faqs: [
      { q: 'Did my transparency survive?', a: 'Yes. WebP has a full alpha channel, which is the main reason it can replace PNG rather than sitting alongside it.' },
      { q: 'Can I get a lossless WebP?', a: 'This tool encodes lossily at the quality you pick. At 100% the difference from the PNG is not visible in practice, though it is not bit-for-bit identical.' },
      { q: 'Should I delete the original PNGs?', a: 'No. Keep them as masters. If you ever need another format, converting from the PNG beats converting from an already-lossy WebP.' },
      { q: 'A tool rejected my WebP.', a: 'Older desktop software and some upload portals still do not accept it. Convert back with WebP to PNG.' }
    ],
    related: ['jpg-to-webp', 'webp-to-png', 'webp-to-jpg', 'png-to-jpg', 'compress-image', 'convert-image']
  },

  'webp-to-jpg': {
    intro: 'WebP is excellent on the web and inconvenient everywhere else. Sooner or later something — a print shop, an older application, a government upload form — refuses it, and you need the universal format back.',
    what: [
      'Converts a WebP to JPEG at a quality you choose, flattening any transparency onto a background colour you pick.',
      'This is a second lossy encode, so it is not free. At 90% the additional loss is not visible in normal viewing, but it is real, which is why you should convert from an original rather than from a WebP that was itself made from a JPG.'
    ],
    specs: {
      caption: 'Conversion details',
      rows: [
        ['Quality', '40–100%, default 90%'],
        ['Background fill', 'White (default), Black, or Dark'],
        ['Transparency', 'Replaced by the background colour — JPEG has no alpha'],
        ['Compatibility', 'Universal; JPEG opens everywhere'],
        ['File size', 'Usually larger than the WebP'],
        ['Resolution', 'Unchanged']
      ]
    },
    steps: [
      'Drop the WebP in.',
      'If the image has transparent areas, choose the <strong>Background</strong> they should become.',
      'Set <strong>Quality</strong> — 90% is a safe default.',
      'Convert and download.'
    ],
    tip: 'Pick the background to match where the image is going. White is right for documents and most web pages; Dark suits a dark-themed slide. Getting it wrong leaves a bright rectangle around your logo that is far more obvious than any compression artefact.',
    faqs: [
      { q: 'My logo now has a white box around it.', a: 'JPEG cannot store transparency, so the transparent area had to become something. Either pick a background matching where it will sit, or convert to PNG instead and keep the transparency.' },
      { q: 'Why is the JPG bigger than the WebP?', a: 'Expected. WebP is the more efficient format, so going back to JPEG costs size. You are trading bytes for compatibility.' },
      { q: 'Have I lost quality?', a: 'A little. This is a second lossy encode. At 90% it is not visible in normal viewing, but work from an original where you have one.' },
      { q: 'Is there a lossless way back?', a: 'WebP to PNG avoids adding further loss, at the cost of a much larger file. Use it when the image is a graphic rather than a photograph.' }
    ],
    related: ['webp-to-png', 'jpg-to-webp', 'png-to-webp', 'convert-image', 'compress-image', 'png-to-jpg']
  },

  'bulk-resize': {
    intro: 'Resizing twenty photos one at a time is the kind of task that makes people give up and upload the originals instead — which is how a page ends up carrying 40 MB of images nobody can see the detail in anyway.',
    what: [
      'Resizes up to 20 images at once to a maximum width, keeping each image’s aspect ratio, and converts them all to one format.',
      'The width is a ceiling rather than a target: anything already narrower is left alone rather than enlarged, since upscaling only adds softness and file size.'
    ],
    specs: {
      caption: 'Settings and limits',
      rows: [
        ['Images at once', 'Up to 20'],
        ['Max width', '1–12,000 px, default 1600'],
        ['Format', 'JPEG (default), PNG, or WebP'],
        ['Quality', '40–100%, default 85%'],
        ['Aspect ratio', 'Preserved for every image'],
        ['Smaller images', 'Left at their original size, never enlarged'],
        ['Progress', 'Reported per file as it works']
      ]
    },
    steps: [
      'Add up to 20 images.',
      'Set <strong>Max width</strong>. 1600 px suits most websites; 1200 is plenty for email.',
      'Pick a <strong>Format</strong> — WebP for a website, JPEG for anything else.',
      'Set <strong>Quality</strong> and run it.'
    ],
    tip: 'Choose the width from where the images will be displayed, then double it. Something shown in an 800 px column wants 1600 px so it stays sharp on high-density screens — and no more, because every pixel beyond that is download weight nobody sees.',
    faqs: [
      { q: 'Are my images stretched to the same shape?', a: 'No. Only the width is capped and each image keeps its own proportions, so a mix of portrait and landscape comes out correctly.' },
      { q: 'What happens to images already under the max width?', a: 'They are converted and compressed but not resized. Enlarging would add size without adding detail.' },
      { q: 'Why only 20 at a time?', a: 'Every image is decoded and re-encoded in your browser using your machine’s memory. Twenty is what completes reliably on ordinary hardware, including phones.' },
      { q: 'Can I keep the original filenames?', a: 'Yes — each output keeps its source name with the new extension, so the set stays recognisable.' }
    ],
    related: ['batch-compress', 'resize-image', 'compress-image', 'convert-image', 'thumbnail-maker', 'social-media-image']
  },

  'batch-compress': {
    intro: 'The usual situation: a folder of photos, a size budget, and no interest in opening each one. This applies the same quality setting across the set and reports what each file saved.',
    what: [
      'Compresses up to 20 images at once to JPEG or WebP at a quality you choose. Dimensions are untouched.',
      'Each result is reported separately, so you can see which files actually shrank. That matters more than the average — already-compressed images will barely move, and a set that saves nothing is telling you the originals were not the problem.'
    ],
    specs: {
      caption: 'Settings and limits',
      rows: [
        ['Images at once', 'Up to 20'],
        ['Quality', '40–100%, default 90%'],
        ['Output', 'JPEG (default) or WebP'],
        ['Resolution', 'Unchanged — use Bulk Resize first if needed'],
        ['Transparency', 'Lost with JPEG output; kept with WebP'],
        ['EXIF metadata', 'Not carried over, so GPS data is dropped'],
        ['Progress', 'Reported per file']
      ]
    },
    steps: [
      'Add up to 20 images.',
      'Set <strong>Quality</strong>. 90% is the default; 80% is still invisible on most photographs and saves considerably more.',
      'Choose <strong>Output</strong> — WebP if these are going on a website.',
      'Compress and download.'
    ],
    tip: 'If the savings come back small, resize first. Compression re-encodes the pixels you have; resizing removes pixels you never needed. On a folder of full-resolution phone photos, Bulk Resize followed by this will beat either one alone by a wide margin.',
    faqs: [
      { q: 'Some files barely shrank.', a: 'Those were already compressed. Re-encoding an existing JPEG at a similar quality removes very little, because the data an encoder would drop has already gone.' },
      { q: 'Can I use different settings per image?', a: 'No — one quality across the batch is the point. For individual control, use the single Image Compressor.' },
      { q: 'Does this strip location data?', a: 'Yes, as a side effect. Outputs are re-encoded from the decoded image, so EXIF including GPS does not carry over. For photos you are publishing, that is a benefit.' },
      { q: 'Why only 20?', a: 'Each image is decoded and re-encoded in your browser. Twenty completes reliably on ordinary hardware, including phones with much less memory to work with.' }
    ],
    related: ['bulk-resize', 'compress-image', 'convert-image', 'jpg-to-webp', 'resize-image', 'exif-viewer']
  },

  'circle-crop': {
    intro: 'Nearly every platform displays profile pictures as circles, but almost none let you see the circle while you are choosing the photo. The result is a perfectly good picture with an ear clipped off.',
    what: [
      'Crops a square from the centre of your image and masks it to a circle, so you can see exactly what survives before uploading.',
      'The background behind the circle is your choice. Transparent needs PNG and looks right anywhere; a solid colour is safer where transparency might render as black.'
    ],
    specs: {
      caption: 'Options',
      rows: [
        ['Background', 'Transparent (default), White, or Dark'],
        ['Crop area', 'The largest centred square that fits'],
        ['Output', 'PNG, so the transparent option works'],
        ['Where circles are used', 'Profile pictures on most social and messaging platforms'],
        ['Resolution', 'The square is kept at full resolution — no resampling'],
        ['Accepts', 'Any image the browser can open']
      ]
    },
    steps: [
      'Drop the photo in.',
      'Choose a <strong>Background</strong>. Transparent unless you know the destination fills it with something odd.',
      'Crop and download the PNG.'
    ],
    tip: 'A circle cuts the corners off a square, so anything near an edge disappears — roughly 21% of the square’s area goes. Give the subject room before uploading, and expect a tightly framed photo to lose more than you think.',
    faqs: [
      { q: 'The circle cropped my face oddly.', a: 'The square is taken from the centre of the image. If your subject is off-centre, crop to a square in the right place first with Crop Image, then run it through here.' },
      { q: 'My transparent background shows as black.', a: 'Something in the chain does not support transparency. Re-run with White or Dark to match where it is going.' },
      { q: 'Do I need a circular image at all?', a: 'Usually not — platforms mask a square automatically. This is for seeing the result in advance, and for places that display the file as-is.' },
      { q: 'What size should a profile picture be?', a: 'Square and at least 400×400. Larger is fine; platforms downscale. Resize first if the file is very large.' }
    ],
    related: ['crop-image', 'resize-image', 'passport-photo-maker', 'social-media-image', 'compress-image', 'round-corners']
  },

  /* ================= session 2 ================= */

  'webp-to-png': {
    intro: 'The conversion to reach for when something rejects WebP and the image is a logo, an icon or anything with a transparent background. PNG is the format that opens everywhere and keeps the alpha channel intact.',
    what: [
      'Converts a WebP to PNG, preserving transparency exactly.',
      'PNG is lossless, so this adds no further loss on top of whatever the WebP already discarded. That makes it the safe direction when the image is a graphic — unlike WebP to JPG, which is a second lossy encode and flattens transparency onto a solid colour.'
    ],
    specs: {
      caption: 'What you gain and give up',
      rows: [
        ['Transparency', 'Preserved'],
        ['Further quality loss', 'None — PNG is lossless'],
        ['File size', 'Usually much larger, especially on photographs'],
        ['Best for', 'Logos, icons, screenshots, anything with an alpha channel'],
        ['Worse for', 'Photographs — use WebP to JPG instead'],
        ['Compatibility', 'Universal'],
        ['Resolution', 'Unchanged']
      ]
    },
    steps: [
      'Check what the image is — a logo or screenshot suits PNG, a photograph is better served by WebP to JPG.',
      'Drop the WebP in.',
      'Convert and download the PNG.'
    ],
    tip: 'Check what the image actually is before choosing this route. On a photograph PNG can be five to ten times the size for no visible benefit, and WebP to JPG is the better answer. PNG earns its size on flat colour and transparency, not on gradients.',
    faqs: [
      { q: 'Will this restore quality the WebP lost?', a: 'No. WebP at anything under 100% has already discarded information, and PNG stores what remains faithfully rather than recovering anything. What you get is a lossless copy of a lossy image — useful for editing, not for repair.' },
      { q: 'Why is the PNG so much bigger?', a: 'PNG never discards data. On a photograph there is almost nothing repetitive for it to compress, so the file balloons. That is the format working correctly, not a fault.' },
      { q: 'Should I use this or WebP to JPG?', a: 'PNG if the image has transparency or hard edges — logos, icons, screenshots. JPG if it is a photograph and you care about size. The two tools exist because the right answer depends entirely on the picture.' },
      { q: 'Does my transparency survive?', a: 'Yes, exactly. Both formats carry a full alpha channel, so semi-transparent edges and soft shadows come through unchanged.' }
    ],
    related: ['webp-to-jpg', 'png-to-webp', 'jpg-to-webp', 'convert-image', 'png-to-jpg', 'compress-image']
  },

  'svg-to-png': {
    intro: 'SVG is infinitely scalable right up until something refuses to accept it — which is most social platforms, most document editors and nearly every print service. Exporting to PNG is how a vector logo becomes usable outside a browser.',
    what: [
      'Renders an SVG to a PNG at the size the file declares, with transparency preserved.',
      'The important shift is conceptual: SVG has no resolution, it has instructions. The moment you export, those instructions are frozen into a fixed grid of pixels. That is why the size you export at matters more here than in any other conversion — it is the one decision you cannot undo later.'
    ],
    specs: {
      caption: 'What to know before exporting',
      rows: [
        ['Source', 'SVG — vector, resolution-independent'],
        ['Output', 'PNG — fixed pixel grid, transparency preserved'],
        ['Export size', 'Taken from the SVG’s own declared dimensions'],
        ['Reversible', 'No — a PNG cannot become vector again'],
        ['Social avatar', 'At least 400×400'],
        ['Favicon source', '512×512 — feed it to the Favicon Generator'],
        ['Print', 'Keep the SVG and give that to the printer if they will take it']
      ]
    },
    steps: [
      'Check the SVG declares a sensible width and height — that is what the export uses.',
      'Drop it in.',
      'Convert and download the PNG.'
    ],
    tip: 'Keep the SVG. It is the master and the PNG is a snapshot: you can always export another size from the vector, but you can never recover the vector from the pixels. Anyone who has tried to enlarge a logo from a 200px PNG for a banner knows how that goes.',
    faqs: [
      { q: 'My export came out tiny or blurry.', a: 'The PNG uses the SVG’s declared width and height. If those are small — many icon SVGs say 24×24 — the export is small too. Edit the SVG’s width, height or viewBox to the size you need, then convert.' },
      { q: 'Nothing happened, or the image is blank.', a: 'SVGs that reference external fonts or images do not always render in a browser sandbox, and some SVGs have no intrinsic size at all. Opening it in a browser first tells you quickly whether the file itself is the problem.' },
      { q: 'Can I convert a PNG back to SVG?', a: 'Not meaningfully. Vector is a set of shapes and a PNG is a grid of pixels — going back requires tracing, which guesses at shapes and rarely matches the original.' },
      { q: 'Does transparency survive?', a: 'Yes. Anything transparent in the SVG stays transparent in the PNG, which is what makes this workable for logos over coloured backgrounds.' }
    ],
    related: ['png-to-jpg', 'favicon-generator', 'resize-image', 'convert-image', 'png-to-webp', 'circle-crop']
  },

  'pdf-to-text': {
    intro: 'Copying text out of a PDF by hand is miserable, and copying it out of a scanned PDF is impossible — because there is no text in it, only a picture of text. Knowing which kind you have saves a lot of wasted effort.',
    what: [
      'Extracts the text layer from a PDF, giving you plain text you can paste anywhere.',
      'It reads text that is genuinely stored in the file. A scan has none: it is images of pages, and no extractor can find words that were never encoded. If nothing comes out, that is what has happened — and the answer is OCR, not a different extractor.'
    ],
    specs: {
      caption: 'What comes out, and what does not',
      rows: [
        ['Works on', 'PDFs created from a document — exported, printed to PDF, generated'],
        ['Returns nothing on', 'Scans and photographed pages, which contain images only'],
        ['Preserved', 'The words, in reading order'],
        ['Not preserved', 'Fonts, layout, columns, tables and images'],
        ['Quick test', 'Try selecting text in your PDF reader — if you cannot, there is none to extract'],
        ['Scanned documents', 'Need OCR — see the PDF OCR tool']
      ]
    },
    steps: [
      'Open the PDF in any reader and try to select a sentence. If the cursor selects text, this will work; if it draws a box, it will not.',
      'Drop the PDF in.',
      'Copy the extracted text, or download it.'
    ],
    tip: 'Multi-column layouts are where extraction gets untidy. The text is stored in the order it was drawn, which for two columns is often left-then-right per band rather than the full left column then the full right one. Expect to fix the flow on academic papers and newsletters.',
    faqs: [
      { q: 'I got nothing back.', a: 'The PDF almost certainly contains images rather than text — a scan, or pages photographed on a phone. There is no text layer to extract. Run it through PDF OCR, which recognises the characters in the image and creates one.' },
      { q: 'The text came out jumbled.', a: 'Usually a multi-column layout. Extraction follows the order content was written into the file, which does not always match the order you read it. Reflowing by hand afterwards is normally quicker than fighting it.' },
      { q: 'Why are the line breaks in odd places?', a: 'A PDF stores where each line was placed, not where a paragraph ends — the concept barely exists in the format. Breaks land where lines wrapped visually, so joining paragraphs afterwards is expected.' },
      { q: 'Can I keep the formatting?', a: 'Not with this tool — it produces plain text deliberately. If layout matters more than the words, PDF to JPG or PDF to PNG keeps the pages looking exactly as they are.' }
    ],
    related: ['pdf-ocr', 'pdf-to-jpg', 'pdf-to-png', 'text-to-pdf', 'merge-pdf', 'compress-pdf']
  },

  'pdf-to-png': {
    intro: 'The lossless counterpart to PDF to JPG. When the pages are text, diagrams or line art, PNG keeps every edge crisp where JPEG would soften them and leave a faint halo around each letter.',
    what: [
      'Renders each page of a PDF as a PNG image at a resolution you choose.',
      'PNG is lossless, so what you get is exactly what the renderer drew. On pages of text and vector graphics that is a visible improvement over JPEG; on photographic pages it mostly means a much larger file for no benefit.'
    ],
    specs: {
      caption: 'Resolution and when to choose PNG',
      rows: [
        ['Standard', '1.5× — screen viewing, smallest files'],
        ['High', '2× (default) — good for most uses'],
        ['Very high', '3× — print, or when text must survive zooming'],
        ['Output', 'One PNG per page'],
        ['Choose PNG for', 'Text, diagrams, line art, screenshots of pages'],
        ['Choose JPG for', 'Photographic pages — much smaller, no visible loss'],
        ['Transparency', 'Not produced — PDF pages have a white background']
      ]
    },
    steps: [
      'Drop the PDF in.',
      'Pick a resolution. <strong>High</strong> suits most uses; <strong>Very high</strong> only if it will be printed or zoomed into.',
      'Convert, then download the pages you need.'
    ],
    tip: 'Higher is not automatically better. At 3× a long document produces very large files and takes noticeably longer, and on screen it is indistinguishable from 2×. Match the setting to where the image is actually going.',
    faqs: [
      { q: 'PNG or JPG — which should I use?', a: 'PNG when the page is mostly text, tables or diagrams, because lossy compression puts a faint halo around hard edges and small type suffers most. JPG when the page is mostly photographic, where the files are far smaller and the loss is invisible.' },
      { q: 'Can I get a transparent background?', a: 'No. PDF pages are opaque, so the render includes the white page. Removing it would need editing after export.' },
      { q: 'The output is blurry even at Very high.', a: 'Then the source page is a low-resolution scan. Rendering cannot add detail that was never captured — the ceiling is whatever the original scan contains.' },
      { q: 'I only want a few pages.', a: 'Run Extract PDF Pages first to make a shorter PDF, then convert that. It is faster and avoids rendering pages you will throw away.' }
    ],
    related: ['pdf-to-jpg', 'pdf-to-text', 'png-to-pdf', 'extract-pdf-pages', 'compress-pdf', 'split-pdf']
  },

  'png-to-pdf': {
    intro: 'Screenshots are almost always PNGs, and a set of screenshots is almost always meant to be read in order. A PDF is how you send them as one document rather than a folder someone has to open file by file.',
    what: [
      'Combines up to 30 PNGs into a single PDF, one image per page, in the order you add them.',
      'Page size is your call. "Fit to each image" gives every page the exact shape of its screenshot, which keeps things tight and avoids white bands. A4 or US Letter centres each image on a standard page, which is what you want if anyone will print it.'
    ],
    specs: {
      caption: 'Limits and page options',
      rows: [
        ['Images per PDF', 'Up to 30'],
        ['Total size', 'Up to 40 MB'],
        ['Page size', 'Fit to each image (default), A4 portrait, or US Letter'],
        ['Margin', '0–100 pt, default 0'],
        ['Page order', 'The order you add the images'],
        ['Transparency', 'Flattened — PDF pages are opaque'],
        ['Output', 'One PDF, one image per page']
      ]
    },
    steps: [
      'Add your PNGs <strong>in the order you want the pages</strong>.',
      'Choose <strong>Page size</strong> — “Fit to each image” for screenshots, A4 or Letter if it will be printed.',
      'Add a <strong>Margin</strong> of 20–40 pt if printing, so nothing sits against the edge.',
      'Convert and download.'
    ],
    tip: 'PNG screenshots at retina resolution are large, and thirty of them will hit the 40 MB cap quickly. Running them through Bulk Image Resizer first — 1600 px wide is plenty for a document — keeps the PDF emailable and costs nothing visible on the page.',
    faqs: [
      { q: 'My transparent areas turned white.', a: 'Expected. PDF pages are opaque, so transparency has to be flattened onto the page. If the transparency matters, keep the PNGs alongside the PDF.' },
      { q: 'The pages are in the wrong order.', a: 'Pages follow the order you added the files, not their filenames. Add them one at a time in sequence — the browser does not guarantee it hands over a multi-select in filename order.' },
      { q: 'The PDF is too big to email.', a: 'It contains full-resolution images and the PDF wrapper adds very little. Resize the PNGs first, or run the finished file through Compress PDF.' },
      { q: 'Should I use this or JPG to PDF?', a: 'Whichever matches your source files — they behave identically. PNGs are typical for screenshots, JPGs for photographs.' }
    ],
    related: ['jpg-to-pdf', 'merge-pdf', 'compress-pdf', 'pdf-to-png', 'bulk-resize', 'webp-to-pdf']
  },

  'delete-pdf-pages': {
    intro: 'The blank sheet the scanner picked up, the internal cover page, the terms you do not need to send on. Sometimes it is far easier to say what should go than to list everything that should stay.',
    what: [
      'Removes the pages you name and returns a PDF containing everything else, in its original order.',
      'This is the mirror image of Extract PDF Pages — same operation, opposite input. Use whichever describes your situation in fewer numbers, because that is the one you are less likely to get wrong.'
    ],
    specs: {
      caption: 'Range syntax',
      rows: [
        ['Default', '2'],
        ['A range', '4-6'],
        ['Individual pages', '1,5,9'],
        ['Mixed', '1,4-6,10'],
        ['Numbering', 'Starts at 1, matching your PDF reader'],
        ['Remaining pages', 'Keep their original order'],
        ['Original file', 'Never modified']
      ]
    },
    steps: [
      'Drop the PDF in.',
      'List the pages to <strong>remove</strong> in <strong>Pages to remove</strong> — not the ones to keep.',
      'Run it and download the result.'
    ],
    tip: 'Page numbers refer to the original document throughout, so you do not have to account for pages shifting as earlier ones are removed. Entering 2,3,4 removes the second, third and fourth pages of the file you uploaded — not a moving target.',
    faqs: [
      { q: 'Do the numbers shift as pages are deleted?', a: 'No. Everything is evaluated against the original document, so 2,4,6 removes the second, fourth and sixth pages of the file you uploaded. You do not need to compensate for earlier deletions.' },
      { q: 'What if I list a page that does not exist?', a: 'It is ignored rather than causing a failure. The remaining valid pages are still removed, so check the output page count if you suspect a typo.' },
      { q: 'Should I use this or Extract PDF Pages?', a: 'Whichever needs fewer numbers. Dropping two pages from a hundred-page report is a deletion; keeping three pages out of a hundred is an extraction. Same result either way.' },
      { q: 'Does the text stay selectable?', a: 'Yes. The surviving pages are copied rather than re-rendered, so text, links and vector graphics are untouched.' }
    ],
    related: ['extract-pdf-pages', 'split-pdf', 'merge-pdf', 'reorder-pdf', 'rotate-pdf', 'compress-pdf']
  },

  'reorder-pdf': {
    intro: 'The classic case: a double-sided document scanned as two passes, so you have all the odd pages followed by all the even ones. Merging gets them into one file; only reordering makes it readable.',
    what: [
      'Rewrites a PDF with its pages in an order you specify, listing every page number in the sequence you want.',
      'The order you type is exactly the order you get. You can also drop pages by leaving them out, and repeat a page by listing it twice — so this quietly covers deleting and duplicating as well.'
    ],
    specs: {
      caption: 'How to write the order',
      rows: [
        ['Format', 'A comma-separated list of page numbers'],
        ['Move a page to the front', '5,1,2,3,4'],
        ['Reverse a 4-page file', '4,3,2,1'],
        ['Interleave two scans', '1,5,2,6,3,7,4,8'],
        ['Omit a page', 'Leave its number out'],
        ['Repeat a page', 'List it twice'],
        ['Numbering', 'Starts at 1, matching your PDF reader']
      ]
    },
    steps: [
      'Drop the PDF in.',
      'Type the <strong>New page order</strong> as a comma-separated list.',
      'Check the count before running — the output has exactly as many pages as numbers you typed.',
      'Run it and download.'
    ],
    tip: 'For the odd-then-even scan, merge the two passes first so the odd pages are 1 to N and the evens follow, then interleave with 1, N+1, 2, N+2 and so on. Working it out on paper for the first four pages usually makes the pattern obvious for the rest.',
    faqs: [
      { q: 'My output has fewer pages than the original.', a: 'You left some numbers out. The output contains exactly the pages you listed, in that order — anything unlisted is dropped. Include every page you want to keep.' },
      { q: 'Can I repeat a page?', a: 'Yes. List it as many times as you want it to appear. That is also what the Duplicate PDF Pages tool does if you would rather not retype the whole sequence.' },
      { q: 'Is there a drag-and-drop version?', a: 'Not here — this is deliberately a typed list, which is faster and less error-prone for long documents than dragging thumbnails around.' },
      { q: 'Does reordering re-render the pages?', a: 'No. Pages are copied across intact rather than redrawn, so text stays selectable, links keep working, vector graphics stay sharp and the file size barely changes. Reordering is one of the few PDF operations that costs you nothing at all in quality.' }
    ],
    related: ['merge-pdf', 'delete-pdf-pages', 'extract-pdf-pages', 'duplicate-pdf-pages', 'rotate-pdf', 'split-pdf']
  },

  'protect-pdf': {
    intro: 'Before setting a password it is worth knowing which of the two kinds you are setting, because only one of them actually protects anything.',
    what: [
      'Sets a password on a PDF so it cannot be opened without it.',
      'One caveat stated plainly: encryption depends on the PDF engine build, and if this browser build does not include it you will get an explicit error rather than a file that looks protected but is not. Silently producing an unprotected document would be far worse.'
    ],
    specs: {
      caption: 'Passwords and what they do',
      rows: [
        ['Minimum password length', '4 characters'],
        ['Open password', 'Genuinely encrypts — the file cannot be read without it'],
        ['Permissions lock', 'Only discourages printing and copying; trivially removed'],
        ['If encryption is unavailable', 'You get a clear error, never a false sense of security'],
        ['Recovery', 'None — lose the password and the file is unreadable'],
        ['Accepts', 'PDF']
      ]
    },
    steps: [
      'Drop the PDF in.',
      'Enter a password of at least four characters — and make it a real one, since anything worth encrypting is worth more than four characters.',
      'Save the password somewhere you will still have it later.',
      'Protect and download.'
    ],
    tip: 'Never send the password down the same channel as the file. A protected PDF and its password in the same email thread is exactly as secure as an unprotected PDF, and it is the most common way this goes wrong.',
    faqs: [
      { q: 'I lost the password. Can it be recovered?', a: 'No, and that is the point of encryption. There is no reset and no back door. Anything claiming otherwise is either guessing common passwords or lying about what it does.' },
      { q: 'It says encryption is not supported. What now?', a: 'The PDF engine build in your browser does not include it. Use your operating system’s “export as protected PDF”, or a desktop tool. The error appears deliberately rather than handing you a file you would wrongly trust.' },
      { q: 'What is the difference between this and a permissions lock?', a: 'An open password encrypts the contents and is genuinely secure. A permissions lock leaves the file readable and only flags that printing and copying are discouraged — which readers may ignore, and which Remove PDF Password strips in seconds.' },
      { q: 'Is a four-character password enough?', a: 'It is the minimum this tool accepts, not a recommendation. Four characters is guessable almost instantly. If the document is worth encrypting, use a long passphrase.' }
    ],
    related: ['remove-pdf-password', 'merge-pdf', 'compress-pdf', 'pdf-redact', 'split-pdf', 'pdf-signature']
  },

  'text-to-pdf': {
    intro: 'Plain text into a paginated PDF, without opening a word processor. Useful for a quick note, a printable list, or turning something you have written into a file that looks the same on every machine.',
    what: [
      'Lays out text as a paginated PDF at A4 or US Letter, with an optional title on the first page.',
      'It handles more than English. The font is chosen from the text you paste — Latin, Greek, Cyrillic, Arabic, Hebrew, Chinese, Japanese, Korean and Thai all render, with the right font downloaded only when it is actually needed so ordinary English text stays instant.'
    ],
    specs: {
      caption: 'Options and script support',
      rows: [
        ['Page size', 'A4 or US Letter'],
        ['Pages', '1–200'],
        ['Title', 'Optional, appears on page 1'],
        ['Scripts supported', 'Latin, Greek, Cyrillic, Arabic, Hebrew, CJK, Thai'],
        ['Not supported', 'Devanagari — see the FAQ below'],
        ['Font download', 'Only when the text needs a non-Latin font'],
        ['Output', 'Selectable, searchable text — not an image']
      ]
    },
    steps: [
      'Paste or type your text.',
      'Choose <strong>Page size</strong> — A4 outside the US, Letter inside it.',
      'Add a <strong>title</strong> if you want one on the first page.',
      'Create the PDF and download.'
    ],
    tip: 'The output contains real text rather than a picture of it, so the result stays searchable, selectable and accessible to a screen reader. That is the difference between this and printing a screenshot to PDF, and it matters more than it sounds if anyone needs to find something in the document later.',
    faqs: [
      { q: 'My Hindi or Nepali text is refused.', a: 'Devanagari is deliberately blocked. The shaping it requires makes the in-browser renderer hang rather than fail, which would cost you the tab and your text. Refusing with a message is the better outcome, and it is being worked on.' },
      { q: 'Can I control fonts, sizes and margins?', a: 'Not here — this is deliberately a fast path from text to a clean document. For layout control, write in a word processor and export from there.' },
      { q: 'Why did it pause before generating?', a: 'Your text needed a non-Latin font, which is fetched on demand. Latin-only text skips the download entirely and generates immediately.' },
      { q: 'Is the text selectable in the PDF?', a: 'Yes. It is embedded as real text, so it can be searched, copied and read aloud by a screen reader.' }
    ],
    related: ['markdown-to-pdf', 'pdf-to-text', 'merge-pdf', 'jpg-to-pdf', 'pdf-page-numbers', 'compress-pdf']
  },

  'image-watermark': {
    intro: 'A watermark is a deterrent, not a lock. Done well it makes casual reuse obvious and annoying to remove; done badly it either ruins your own image or wipes off with a two-second crop.',
    what: [
      'Overlays text across an image at a size, opacity and position you control.',
      'Position is the setting that decides whether the watermark actually works. A single mark in a corner is removed by cropping. Tiled across the whole image cannot be cropped out without destroying the picture, which is the entire point.'
    ],
    specs: {
      caption: 'Settings',
      rows: [
        ['Text size', '2–20% of image width, default 6%'],
        ['Opacity', '5–100%, default 35%'],
        ['Position', 'Tiled across (default), Centre, or Bottom right'],
        ['Hardest to remove', 'Tiled — it cannot be cropped away'],
        ['Easiest to remove', 'Bottom right — one crop and it is gone'],
        ['Accepts', 'Any image the browser can open'],
        ['Resolution', 'Unchanged']
      ]
    },
    steps: [
      'Drop the image in and enter your watermark text.',
      'Set <strong>Position</strong>. Choose <strong>Tiled across</strong> if the point is deterrence rather than attribution.',
      'Set <strong>Opacity</strong> — 35% is the default and is the usual sweet spot; below about 20% it stops being a deterrent.',
      'Adjust <strong>Text size</strong> and download.'
    ],
    tip: 'Watermark a copy, never your original. The mark is drawn into the pixels and cannot be removed afterwards, so keep the clean file somewhere safe — the number of people who discover this after overwriting the only version is not small.',
    faqs: [
      { q: 'What opacity should I use?', a: 'Around 35% for most images. High enough to be unmistakable, low enough to leave the picture usable. Below 20% it becomes easy to paint out; above 60% you have largely ruined your own image.' },
      { q: 'Can the watermark be removed?', a: 'A corner mark can be cropped off in seconds. A tiled one cannot be removed without visibly damaging the image, which is as far as any watermark goes — it raises the cost of theft rather than preventing it.' },
      { q: 'Can I use a logo instead of text?', a: 'Not in this tool, which is text-only. For a logo you would need to composite the images in an editor.' },
      { q: 'Does it work on transparent images?', a: 'Yes, though the text is drawn over transparent areas as well, which may look odd. Watermarking usually makes more sense on a finished image with a background.' }
    ],
    related: ['pdf-watermark', 'compress-image', 'resize-image', 'exif-viewer', 'crop-image', 'batch-compress']
  },

  'favicon-generator': {
    intro: 'The little icon in a browser tab is not one file any more. Between tabs, bookmarks, phone home screens and web app manifests, a site needs the same square at half a dozen sizes.',
    what: [
      'Generates the full set of favicon sizes from one square image, and gives you the HTML to reference them.',
      'The sizes are the ones that are actually used: 16 and 32 for browser tabs, 48 for Windows shortcuts, 180 for the Apple touch icon, and 192 and 512 for Android and web app manifests.'
    ],
    specs: {
      caption: 'Sizes produced and what uses them',
      rows: [
        ['16×16', 'Browser tab, at the smallest size'],
        ['32×32', 'Browser tab on high-density screens; the one most often seen'],
        ['48×48', 'Windows site shortcuts'],
        ['180×180', 'Apple touch icon — iOS home screen'],
        ['192×192', 'Android home screen and web app manifest'],
        ['512×512', 'Manifest, splash screens, app listings'],
        ['Best source', 'A square image, 512×512 or larger'],
        ['Output', 'PNG files plus the HTML to paste']
      ]
    },
    steps: [
      'Prepare a <strong>square</strong> source image, ideally 512×512 or larger. A non-square image will be distorted.',
      'Drop it in and generate.',
      'Download all six PNGs into the root of your site.',
      'Paste the generated HTML into the <code>&lt;head&gt;</code> of every page.'
    ],
    tip: 'Design for 16 pixels, not for 512. A detailed logo becomes an unreadable smudge in a browser tab — most good favicons are a single letter, a simple mark, or a heavily simplified version of the full logo. Check the 16×16 output before shipping, because that is the one people actually see.',
    faqs: [
      { q: 'My icon looks like a blur in the tab.', a: 'Too much detail for 16 pixels. Simplify: one letter or one shape, strong contrast, no fine lines or small text. Judge the result at actual size rather than zoomed in.' },
      { q: 'Do I still need an .ico file?', a: 'Not for current browsers, which all accept PNG favicons. Only very old Internet Explorer required .ico, and it is no longer worth carrying.' },
      { q: 'My source image is not square.', a: 'It will be squashed to fit. Crop it to a square first — Crop Image with the 1:1 ratio does this in two clicks.' },
      { q: 'Where do the files go?', a: 'The root of your site, so they sit at /favicon-32x32.png and so on, matching the generated HTML. If you put them in a subfolder, update the paths to match.' }
    ],
    related: ['crop-image', 'resize-image', 'svg-to-png', 'circle-crop', 'convert-image', 'compress-image']
  },

  'exif-viewer': {
    intro: 'A photo straight off a phone usually records where it was taken, to within a few metres, along with the camera, the settings and the exact time. Most people posting photos publicly have no idea that data is travelling with them.',
    what: [
      'Reads the EXIF metadata embedded in a JPEG and shows you exactly what is in there — camera, lens settings, timestamps, orientation and, where present, location.',
      'This is the check to run before publishing. It is read-only: it tells you what is in the file rather than changing it, so you can decide what to do with that knowledge.'
    ],
    specs: {
      caption: 'What EXIF can contain',
      rows: [
        ['Camera', 'Make and model'],
        ['Settings', 'Aperture, shutter speed, ISO, focal length'],
        ['Timestamps', 'When the photo was taken and last modified'],
        ['Software', 'What edited it, and sometimes the author name'],
        ['Orientation', 'The rotation flag readers use to display it upright'],
        ['Location', 'GPS coordinates, where the camera recorded them'],
        ['Format', 'JPEG — PNG and WebP rarely carry EXIF']
      ]
    },
    steps: [
      'Choose a JPEG.',
      'Read what is listed. Pay particular attention to any location and timestamp data.',
      'If you are publishing the photo, strip it — running the file through the Image Compressor or Image Converter re-encodes it and does not carry EXIF across.'
    ],
    tip: 'Most social platforms strip EXIF when you upload, but forums, direct file shares, cloud links and email attachments generally do not. The risk is not the photo you post to a big network — it is the one you attach to a message or upload to a small site.',
    faqs: [
      { q: 'Nothing was found in my image.', a: 'Either the file is not a JPEG — PNG and WebP rarely carry EXIF — or the metadata has already been stripped, which many apps and platforms do automatically. No EXIF is a good outcome if you were about to publish it.' },
      { q: 'How do I remove the data?', a: 'Re-encode the image. Running it through the Image Compressor or Image Converter produces a file built from the decoded pixels, and the metadata does not come with it.' },
      { q: 'Does removing EXIF change how the photo looks?', a: 'Only in one respect worth knowing: the orientation flag goes too. A photo taken sideways may then display sideways in some readers, so check the result and rotate it if needed.' },
      { q: 'Is my photo uploaded to read the metadata?', a: 'No. The file is parsed in your browser — which matters more here than on most tools, since the whole point is inspecting data you may not want anyone else to have.' }
    ],
    related: ['compress-image', 'convert-image', 'image-watermark', 'batch-compress', 'resize-image', 'png-to-jpg']
  },

  /* ================= session 3 — text and developer tools ================= */

  'word-counter': {
    intro: 'Almost every word count that matters is somebody else’s limit — a 500-word essay, a 160-character meta description, a personal statement capped at 4,000. The number updates as you type so you can see how far over you are while you cut.',
    what: [
      'Counts words, characters, sentences, paragraphs and lines as you type, and estimates how long the text takes to read aloud or silently.',
      'Characters are counted twice: with spaces and without. That distinction matters more than it sounds, because form limits and social platforms disagree about which one they mean, and being 40 characters over is usually the difference.'
    ],
    specs: {
      caption: 'What is counted, and how',
      rows: [
        ['Words', 'Runs of non-space characters — hyphenated words count as one'],
        ['Characters', 'Counted both with and without spaces'],
        ['Sentences', 'Detected by full stop, question mark or exclamation mark'],
        ['Paragraphs', 'Separated by a blank line'],
        ['Reading time', 'Based on 200 words a minute — silent reading'],
        ['Speaking time', 'Based on 130 words a minute — reading aloud'],
        ['Updates', 'Live, on every keystroke']
      ]
    },
    steps: [
      'Type or paste your text into the box.',
      'Read the counts, which update as you type.',
      'Watch the character count with and without spaces if you are working to a form limit — they can differ substantially.'
    ],
    tip: 'The two timing figures exist because they answer different questions. 200 words a minute is silent reading; 130 is speaking pace, which is what you want for a presentation, a video script or a wedding speech. Using the reading figure to plan a talk is how five minutes becomes eight.',
    faqs: [
      { q: 'Why does my count differ from Word or Google Docs?', a: 'Different tools disagree at the edges — hyphenated compounds, numbers, text in headings and footnotes. Here a word is any run of non-space characters, which is the most common definition. Expect small differences on the same text, and check against whatever tool the person setting the limit is using.' },
      { q: 'Which character count do social platforms use?', a: 'Almost always characters including spaces, and many count emoji as more than one. If you are close to a limit, use the with-spaces figure and leave a little headroom.' },
      { q: 'How accurate is the reading time?', a: 'It is an average, not a measurement. 200 words a minute is typical for adults reading straightforward prose; dense technical writing is slower and light fiction faster. Treat it as a planning figure.' },
      { q: 'Is my text sent anywhere?', a: 'No. The counting happens as you type, in this page, which is why it responds instantly — there is no round trip to a server, and nothing to store.' }
    ],
    related: ['case-converter', 'lorem-ipsum', 'text-to-pdf', 'meta-tag-generator', 'slug-generator', 'keyword-density']
  },

  'case-converter': {
    intro: 'Someone sends a heading in ALL CAPS. A CSV arrives with column names that need to become variable names. Retyping is the slow way to do something a computer should do in one click.',
    what: [
      'Converts text between seven cases, including the four programmers actually need for identifiers.',
      'The two most useful in practice are Title Case for headings and Sentence case for rescuing text that arrived shouting. The camel, kebab and snake options exist because turning a human label into an identifier is a job people do constantly and by hand.'
    ],
    specs: {
      caption: 'The seven cases',
      rows: [
        ['UPPER CASE', 'Everything capitalised'],
        ['lower case', 'Everything lowercase'],
        ['Title Case', 'First Letter Of Each Word — headings'],
        ['Sentence case', 'First letter only — fixing text that arrived in caps'],
        ['camelCase', 'JavaScript and Java identifiers'],
        ['kebab-case', 'URLs, CSS class names, file names'],
        ['snake_case', 'Python identifiers, database columns']
      ]
    },
    steps: [
      'Paste your text.',
      'Pick the case you want.',
      'Copy the result.'
    ],
    tip: 'Title Case capitalises every word, which is not what most style guides actually want — they leave short words like "and", "of" and "the" lowercase unless they start the phrase. For a headline going somewhere that matters, expect to fix a few small words by hand afterwards.',
    faqs: [
      { q: 'Title Case capitalised words that should stay lowercase.', a: 'It capitalises every word by design, which is simple and predictable. Most style guides keep articles, short conjunctions and short prepositions lowercase in the middle of a title. Convert first, then lowercase the handful of small words — quicker than doing the whole line by hand.' },
      { q: 'Which case do I need for a URL?', a: 'kebab-case: lowercase words joined by hyphens. It is what search engines and humans both read most easily, and it avoids the encoding problems spaces and underscores cause. The Slug Generator does this specifically for URLs.' },
      { q: 'What is the difference between camelCase and snake_case?', a: 'Convention rather than capability. JavaScript, Java and C# use camelCase for variables; Python and SQL generally use snake_case. Pick whichever your codebase already uses — consistency beats preference.' },
      { q: 'Does it handle accented characters?', a: 'Yes. Accents are preserved and case-converted correctly, so é becomes É and back again rather than being stripped or mangled.' }
    ],
    related: ['word-counter', 'slug-generator', 'lorem-ipsum', 'text-to-pdf', 'json-formatter', 'url-encoder']
  },

  'lorem-ipsum': {
    intro: 'Placeholder text exists so you judge the layout instead of reading the copy. Real sentences pull the eye; nonsense Latin lets you see whether the line length, spacing and hierarchy actually work.',
    what: [
      'Generates lorem ipsum by paragraph, sentence or word count, up to 100 units.',
      'Choosing the right unit matters more than the amount. Paragraphs for body layout, sentences for cards and captions, words when you are filling a heading or a button and need to know how the design copes with a long label.'
    ],
    specs: {
      caption: 'Options',
      rows: [
        ['Generate by', 'Paragraphs, Sentences, or Words'],
        ['Amount', '1–100'],
        ['Typical blog paragraph', '3–5 sentences'],
        ['Typical card', '1–2 sentences'],
        ['Long heading test', '8–12 words'],
        ['Output', 'Plain text, ready to copy']
      ]
    },
    steps: [
      'Choose <strong>Paragraphs</strong>, <strong>Sentences</strong> or <strong>Words</strong>.',
      'Set the amount.',
      'Generate and copy.'
    ],
    tip: 'Test with more text than you expect, not less. Layouts break at the extremes — a heading that wraps to three lines, a card whose text overflows, a button whose label pushes the icon off. Filling everything with one tidy sentence tells you nothing about what real content will do.',
    faqs: [
      { q: 'Why use Latin rather than real text?', a: 'Because you stop reading it. Placeholder text made of real sentences draws attention to the words when you are meant to be judging spacing, line length and hierarchy — and worse, real-looking copy has a habit of shipping to production.' },
      { q: 'Will lorem ipsum hurt my SEO?', a: 'Only if you publish it. Google will happily index a live page full of placeholder text, and it is a recognisable signal of an unfinished site. Search your own site for "lorem" before launch — this catches more people than it should.' },
      { q: 'How much should I generate?', a: 'More than you think. Design against the longest realistic content, not the neatest, because that is where layouts break.' },
      { q: 'Is it always the same text?', a: 'It draws from the standard lorem ipsum vocabulary, so it looks like Latin without being meaningful. That consistency is the point — you are testing shapes, not reading.' }
    ],
    related: ['word-counter', 'case-converter', 'text-to-pdf', 'meme-generator', 'thumbnail-maker', 'slug-generator']
  },

  'json-formatter': {
    intro: 'Minified JSON from an API response is one long line that no human can read, and the error message when it is malformed is rarely where the problem is. Pretty-printing solves the first; validating tells you exactly where the second went wrong.',
    what: [
      'Three operations on the same text: pretty-print with two-space indentation, minify to a single line, and validate.',
      'Validate is the one worth knowing about. It reports the parser’s own error message and position, which is far more useful than a generic "invalid" — it usually points within a character or two of the real mistake.'
    ],
    specs: {
      caption: 'The three operations',
      rows: [
        ['Pretty-print', 'Two-space indentation, one key per line'],
        ['Minify', 'All whitespace removed — smallest payload'],
        ['Validate', 'Reports the exact parser error and position'],
        ['Common failure', 'A trailing comma after the last item — valid in JavaScript, not in JSON'],
        ['Also common', 'Single quotes; JSON requires double'],
        ['Also common', 'Unquoted keys — every key must be in double quotes'],
        ['Processing', 'In this page — nothing is sent anywhere']
      ]
    },
    steps: [
      'Paste your JSON.',
      '<strong>Pretty-print</strong> to read it, <strong>Minify</strong> to ship it, <strong>Validate</strong> to find out why it will not parse.',
      'If validation fails, read the position in the error — the real mistake is usually just before it.'
    ],
    tip: 'When the error points at a character that looks perfectly fine, look at the line above. A missing comma, or a trailing one, is reported where the parser gives up rather than where the problem is — which is why "unexpected token }" almost always means something is wrong on the previous line.',
    faqs: [
      { q: 'It says my JSON is invalid but it looks correct.', a: 'The usual culprits are a trailing comma after the final item, single quotes instead of double, or unquoted keys. All three are legal JavaScript and none are legal JSON, which is exactly why they slip through when you write JSON by hand.' },
      { q: 'Is it safe to paste API responses here?', a: 'The parsing happens in this page and nothing is transmitted. That said, treat any credentials or personal data in a response the way you would anywhere else, and prefer redacting them.' },
      { q: 'Why would I minify JSON?', a: 'Whitespace is bytes. For a config file it is irrelevant; for an API payload sent thousands of times a minute, or data embedded in a page, removing it measurably reduces transfer size.' },
      { q: 'Does formatting change my data?', a: 'No. Only whitespace changes. Key order is preserved, and values are untouched — pretty-printing and minifying are exactly reversible.' }
    ],
    related: ['base64', 'jwt-decoder', 'url-encoder', 'regex-tester', 'json-csv', 'uuid-generator']
  },

  'base64': {
    intro: 'Base64 turns binary into text so it can travel through channels that only handle text — email attachments, data URIs, JSON payloads, HTTP headers. It is an encoding, not encryption, and confusing the two is a genuinely dangerous mistake.',
    what: [
      'Encodes text to Base64 and decodes it back, in this page.',
      'Stated plainly because people get this wrong: Base64 provides no security whatsoever. It is trivially reversible by anyone — that is its entire purpose. Anything sensitive needs actual encryption.'
    ],
    specs: {
      caption: 'What Base64 is for',
      rows: [
        ['Purpose', 'Making binary data safe to carry through text-only channels'],
        ['Security', 'None — it is reversible by design'],
        ['Size cost', 'About 33% larger than the original'],
        ['Alphabet', 'A–Z, a–z, 0–9, plus + and /'],
        ['Padding', 'Trailing = signs make the length a multiple of four'],
        ['Common uses', 'Data URIs, email attachments, JSON payloads, JWT segments'],
        ['Decode failure', 'Usually a truncated string or one that was URL-encoded first']
      ]
    },
    steps: [
      'Paste your text or Base64.',
      'Press <strong>Encode →</strong> or <strong>← Decode</strong>.',
      'Copy the result.'
    ],
    tip: 'Base64 grows the data by roughly a third, which is why embedding a large image as a data URI is usually a false economy — you save one request and pay for it on every page load, uncached. It makes sense for tiny icons and little else.',
    faqs: [
      { q: 'Is Base64 encryption?', a: 'No, and treating it as such is a real security mistake. Anyone can decode it in seconds — this page does it with one click. It exists to make binary survivable in text channels, not to hide anything. Use real encryption for secrets.' },
      { q: 'Decoding failed. Why?', a: 'Usually the string is truncated, or it was URL-encoded somewhere along the way so + became a space and / became %2F. Decode the URL encoding first, then the Base64.' },
      { q: 'What are the = signs at the end?', a: 'Padding. Base64 works in blocks of four characters, so one or two = signs are appended when the input does not divide evenly. They carry no data and are normal.' },
      { q: 'Why is my encoded string bigger?', a: 'Base64 represents three bytes using four characters, so the output is about 33% larger. That overhead is the price of making binary text-safe.' }
    ],
    related: ['url-encoder', 'jwt-decoder', 'json-formatter', 'hash-generator', 'uuid-generator', 'text-encrypt']
  },

  'uuid-generator': {
    intro: 'When two systems need to create identifiers without asking each other first, random UUIDs are the standard answer — the odds of a collision are small enough to design around.',
    what: [
      'Generates version 4 UUIDs — 128-bit identifiers built from random data — up to 500 at a time.',
      'Version 4 is the random one, which is what nearly everybody means by UUID. It contains no timestamp and no machine identifier, so it leaks nothing about where or when it was created.'
    ],
    specs: {
      caption: 'Format and properties',
      rows: [
        ['Version', '4 — random'],
        ['How many at once', '1–500, default 5'],
        ['Format', '8-4-4-4-12 hexadecimal characters, hyphen-separated'],
        ['Example shape', 'f47ac10b-58cc-4372-a567-0e02b2c3d479'],
        ['Random bits', '122 of the 128 — the rest encode version and variant'],
        ['Contains', 'Nothing about time, machine or sequence'],
        ['Randomness source', 'The browser’s cryptographic random generator']
      ]
    },
    steps: [
      'Set how many you need.',
      'Generate.',
      'Copy them all at once.'
    ],
    tip: 'UUIDs make poor primary keys in a large database, and this catches teams out. Being random, consecutive inserts land all over the index rather than at the end, which fragments it and slows writes. Plenty of systems use a UUID as the public identifier and a plain sequential integer as the internal key.',
    faqs: [
      { q: 'Can two UUIDs ever be the same?', a: 'In theory yes, in practice no. With 122 random bits you would need to generate billions per second for a century before a collision became likely. Every serious system treats v4 UUIDs as unique.' },
      { q: 'Which version is this, and does it matter?', a: 'Version 4, the random one — the 4 in the third group tells you. Version 1 embeds a timestamp and MAC address, which leaks information; v4 leaks nothing, which is why it is the usual choice.' },
      { q: 'Are these safe to use as security tokens?', a: 'They are generated from the browser’s cryptographic random source, so they are unpredictable. Even so, a session token should be purpose-built rather than a repurposed identifier — a UUID is designed to be unique, not secret.' },
      { q: 'Why the hyphens?', a: 'Convention, from the 8-4-4-4-12 grouping in the specification. They carry no information and many systems store the 32 hex characters without them.' }
    ],
    related: ['hash-generator', 'password-generator', 'json-formatter', 'base64', 'timestamp-converter', 'jwt-decoder']
  },

  'hash-generator': {
    intro: 'A hash is a fixed-length fingerprint of any input. The same text always produces the same hash, and changing a single character produces an entirely different one — which is what makes it useful for checking that a file or message arrived unaltered.',
    what: [
      'Produces SHA-256, SHA-1 and SHA-512 hashes of your text at once, using the browser’s built-in Web Crypto.',
      'MD5 is deliberately not offered. It is broken — collisions can be produced on demand — and providing it invites people to use it for exactly the security purposes it can no longer serve.'
    ],
    specs: {
      caption: 'The algorithms offered',
      rows: [
        ['SHA-256', '64 hex characters — the current default choice'],
        ['SHA-1', '40 hex characters — legacy compatibility only, broken since 2017'],
        ['SHA-512', '128 hex characters — larger digest, same family'],
        ['MD5', 'Deliberately omitted — broken and unsafe'],
        ['Determinism', 'The same input always gives the same hash'],
        ['Reversibility', 'None — a hash cannot be turned back into the input'],
        ['Implementation', 'Web Crypto, built into the browser']
      ]
    },
    steps: [
      'Type or paste your text.',
      'All three hashes appear as you type.',
      'Copy whichever you need — SHA-256 unless something specifically requires otherwise.'
    ],
    tip: 'Hashing a password directly is not how password storage works. Passwords need a slow algorithm with a per-user salt — bcrypt, scrypt or Argon2 — precisely because SHA-256 is fast, and fast is exactly wrong when someone is guessing billions of candidates a second.',
    faqs: [
      { q: 'Why is MD5 missing?', a: 'Because it is broken. Two different inputs can be made to produce the same MD5 hash cheaply, which destroys the property everything relies on. It survives in old file checksums, but offering it here would mostly help people use it where it is unsafe.' },
      { q: 'Should I use SHA-1?', a: 'Only if something you cannot change requires it. Practical collisions were demonstrated in 2017 and browsers dropped it from certificates. SHA-256 is the default for anything new.' },
      { q: 'Can I reverse a hash to get the text back?', a: 'No. Hashing is one-way by construction. Short or common inputs can be found by guessing against precomputed tables, which is a different thing — and the reason salting exists.' },
      { q: 'Is my text sent to a server?', a: 'No. Hashing uses the browser’s Web Crypto implementation, so the text never leaves the page — which matters, since people paste things here precisely because they are sensitive.' }
    ],
    related: ['password-generator', 'uuid-generator', 'file-checksum', 'base64', 'text-encrypt', 'jwt-decoder']
  },

  'url-encoder': {
    intro: 'A URL can only contain a limited set of characters. Spaces, ampersands, question marks and anything non-English have to be escaped, and getting it wrong silently truncates the link at the first offending character.',
    what: [
      'Percent-encodes text for safe use in a URL, and decodes it back.',
      'There is a checkbox that matters more than it looks: whether to encode each component. On, ampersands and equals signs are escaped, which is right for a value inside a query string. Off, they are preserved, which is right when you are encoding a whole URL.'
    ],
    specs: {
      caption: 'Encoding rules',
      rows: [
        ['Space', 'Becomes %20 (or + in older form encoding)'],
        ['Ampersand', '%26 — otherwise it starts a new parameter'],
        ['Question mark', '%3F — otherwise it starts the query string'],
        ['Hash', '%23 — otherwise the rest is treated as a fragment'],
        ['Encode each component ON', 'For a value inside a query string — escapes & = ? /'],
        ['Encode each component OFF', 'For a whole URL — leaves the structure intact'],
        ['Non-English characters', 'Encoded as UTF-8 byte sequences']
      ]
    },
    steps: [
      'Paste the text or URL.',
      'Set <strong>Encode each component</strong> — on for a query value, off for a full URL.',
      'Press <strong>Encode</strong> or <strong>Decode</strong>.'
    ],
    tip: 'The classic bug is a URL that works until someone puts an ampersand in a search box, at which point everything after it vanishes. That is the component checkbox being off when it should be on — the ampersand is read as the start of a new parameter rather than part of the value.',
    faqs: [
      { q: 'Should the component checkbox be on or off?', a: 'On when you are encoding a value that goes inside a URL — a search term, a name, a redirect target. Off when you are encoding an entire URL and need its slashes, question mark and ampersands to keep working. On is the safer default.' },
      { q: 'My decoded text has stray % signs.', a: 'The string is not valid percent-encoding — usually because it was encoded twice, or a literal % was never escaped as %25. Try decoding a second time; if that fails, the source is malformed.' },
      { q: 'Why did a space become + instead of %20?', a: 'Older HTML form encoding uses + for a space, while URL percent-encoding uses %20. Both appear in the wild. Decoders generally accept either, but if a value looks wrong this is often why.' },
      { q: 'Do I need to encode non-English characters?', a: 'Browsers display them, but the underlying request encodes them as UTF-8 byte sequences. Encoding explicitly avoids surprises when the URL is passed between systems that handle it differently.' }
    ],
    related: ['base64', 'json-formatter', 'slug-generator', 'utm-builder', 'jwt-decoder', 'regex-tester']
  },

  'jwt-decoder': {
    intro: 'A JSON Web Token looks like random text but is mostly not encrypted — the header and payload are Base64, readable by anyone holding the token. Which is exactly why you should know what your tokens are carrying.',
    what: [
      'Decodes a JWT’s header and payload into readable JSON.',
      'Stated clearly: this decodes, it does not verify. Checking a signature needs the secret or public key, and without that you can read a token but cannot know whether it is genuine. Anyone can craft a token that decodes perfectly and is entirely fabricated.'
    ],
    specs: {
      caption: 'Structure and limits',
      rows: [
        ['Three parts', 'header.payload.signature, separated by dots'],
        ['Header', 'The algorithm and token type'],
        ['Payload', 'The claims — who, what, and until when'],
        ['Signature', 'Not verified here — that needs the key'],
        ['Encoding', 'Base64url, not encryption — readable by anyone'],
        ['exp claim', 'Expiry, as a Unix timestamp'],
        ['Common claims', 'sub (subject), iat (issued at), exp (expires), iss (issuer)']
      ]
    },
    steps: [
      'Paste the token.',
      'Read the decoded header and payload.',
      'Check <code>exp</code> against the current time if you are debugging an authentication failure — an expired token is the most common cause.'
    ],
    tip: 'Never put anything secret in a JWT payload. It is Base64, not encrypted, and every client holding the token can read it — this page proves that in one paste. Email addresses and internal identifiers routinely end up in tokens that are then stored in browser local storage.',
    faqs: [
      { q: 'Does this check whether the token is valid?', a: 'No. It decodes only. Verifying a signature requires the secret or public key the token was signed with, and without it a forged token decodes exactly as cleanly as a real one. Verification belongs on your server.' },
      { q: 'Is it safe to paste a token here?', a: 'The decoding happens in this page and nothing is transmitted. Even so, treat a live token like a password — it grants whatever access it was issued for. Use expired or test tokens where you can.' },
      { q: 'My token is rejected but decodes fine.', a: 'Decoding proves the structure is intact, not that the token is accepted. Check exp for expiry, iss and aud against what your service expects, and whether the signing key has rotated.' },
      { q: 'Why can anyone read the payload?', a: 'Because JWTs are signed, not encrypted. The signature proves the contents were not altered; it does not hide them. That trade-off is deliberate, and it is why payloads should carry claims rather than secrets.' }
    ],
    related: ['base64', 'json-formatter', 'timestamp-converter', 'hash-generator', 'url-encoder', 'uuid-generator']
  },

  'regex-tester': {
    intro: 'Regular expressions are quicker to write than to verify. Testing a pattern against real text — including the awkward cases you would rather not think about — takes seconds and saves the bug that only appears on one row in ten thousand.',
    what: [
      'Runs a regular expression against your text and shows what it matched.',
      'Flags go in their own box. The default is <code>g</code>, which finds every match rather than stopping at the first — without it you will see one result and wrongly conclude the pattern is too narrow.'
    ],
    specs: {
      caption: 'Flags and behaviour',
      rows: [
        ['g', 'Global — find every match, not just the first (default)'],
        ['i', 'Case-insensitive'],
        ['m', 'Multiline — ^ and $ match at each line'],
        ['s', 'Dot matches newlines too'],
        ['u', 'Unicode mode'],
        ['Matches shown', 'Up to the first 100'],
        ['Flavour', 'JavaScript regular expressions']
      ]
    },
    steps: [
      'Enter your pattern — without the surrounding slashes.',
      'Set the flags. Leave <code>g</code> unless you specifically want only the first match.',
      'Paste text to test against, including the edge cases you expect to fail.'
    ],
    tip: 'Test the strings you expect NOT to match, not just the ones you do. Most regex bugs are over-matching rather than under-matching — a pattern that correctly finds every email address and also cheerfully accepts three lines of unrelated text.',
    faqs: [
      { q: 'Only one match is showing.', a: 'The g flag is missing. Without it a regular expression stops at the first match. Put g in the flags box — it is there by default for exactly this reason.' },
      { q: 'My pattern works elsewhere but not here.', a: 'Regex flavours differ. This uses JavaScript’s engine, which lacks some constructs that PCRE, Python and .NET support — lookbehind support varies, and named group syntax is not identical. A pattern from a Perl or PHP example may need adjusting.' },
      { q: 'Do I include the slashes?', a: 'No. Enter the pattern alone and put the flags in their own box. Pasting /pattern/g whole makes the slashes part of the pattern, which then matches nothing.' },
      { q: 'Why are only 100 matches listed?', a: 'A display limit, so a pattern matching every character in a long document does not lock up the page. The pattern itself is unaffected — you are seeing a sample.' }
    ],
    related: ['json-formatter', 'url-encoder', 'case-converter', 'word-counter', 'base64', 'slug-generator']
  },

  'password-generator': {
    intro: 'The strength of a password is not about exotic characters — it is about how many guesses an attacker needs. Length buys that far more cheaply than substituting a 3 for an E, and this shows you the arithmetic as you change the settings.',
    what: [
      'Generates a random password from the character sets you enable, using the browser’s cryptographic random source rather than ordinary randomness.',
      'It also reports entropy in bits and an estimated offline cracking time, which is the number that actually matters. Watching that figure move as you add characters is more persuasive than any rule about symbols.'
    ],
    specs: {
      caption: 'Settings and what they buy',
      rows: [
        ['Length', '6–48 characters, default 18'],
        ['Character sets', 'a–z, A–Z, 0–9, Symbols — each toggled independently'],
        ['Strength shown as', 'Entropy in bits, plus estimated offline crack time'],
        ['Randomness', 'The browser’s cryptographic generator, not Math.random'],
        ['Rough guide', 'Under 50 bits is weak; 80+ is strong; 100+ is future-proof'],
        ['Biggest lever', 'Length — each extra character multiplies the search space'],
        ['Generated', 'In this page — never transmitted']
      ]
    },
    steps: [
      'Set the <strong>Length</strong>. 18 is the default and a good floor for anything that matters.',
      'Leave all four character sets on unless a site refuses symbols.',
      'Check the entropy figure, then copy the password straight into your password manager.'
    ],
    tip: 'Length beats complexity, and it is not close. Adding one character multiplies the number of possible passwords by the size of the character set; swapping a letter for a symbol adds almost nothing by comparison. If a site caps length at 12, that is the site’s weakness rather than yours — use all 12.',
    faqs: [
      { q: 'How long should a password be?', a: 'At least 16 characters for anything that matters, and the 18-character default is a sensible floor. Since you should be storing it in a password manager rather than remembering it, there is no reason to be economical.' },
      { q: 'A site rejected my password.', a: 'Some still cap length or ban symbols — both are signs of an ageing system. Turn off Symbols or reduce the length to fit, and use the maximum the site allows.' },
      { q: 'Is this random enough to trust?', a: 'It uses the browser’s cryptographic random source, which is designed for exactly this and is not the ordinary Math.random. The password is generated in the page and never transmitted.' },
      { q: 'What does the bits figure mean?', a: 'Entropy — how many guesses an attacker needs on average. Each extra bit doubles that. Under 50 bits is weak against a determined attacker with modern hardware; above 80 is strong; above 100 is comfortable for the foreseeable future.' }
    ],
    related: ['hash-generator', 'uuid-generator', 'text-encrypt', 'protect-pdf', 'file-checksum', 'base64']
  },

  'qr-generator': {
    intro: 'A QR code is a picture of a short piece of text. The two things that decide whether it actually scans are how big it is printed and how much damage it can survive — and both are settings people leave at the default without knowing what they do.',
    what: [
      'Turns any text or URL into a QR code PNG at one of three sizes and four error-correction levels.',
      'Error correction is the interesting setting. Higher levels add redundant data so the code still reads when part of it is obscured, scratched or covered by a logo — at the cost of a denser pattern that needs to be printed larger.'
    ],
    specs: {
      caption: 'Sizes and error correction',
      rows: [
        ['Small', '256 px — screens and small embeds'],
        ['Medium', '512 px (default) — general use'],
        ['Large (print)', '1024 px — posters, packaging, signage'],
        ['L', '7% recoverable — clean digital use only'],
        ['M', '15% recoverable (default) — the usual choice'],
        ['Q', '25% recoverable — print that may get scuffed'],
        ['H', '30% recoverable — required if you overlay a logo'],
        ['Generated', 'In this page, not by a QR service']
      ]
    },
    steps: [
      'Paste the URL or text. Shorter content makes a simpler, more reliable code.',
      'Pick a <strong>Size</strong> — Large for anything printed.',
      'Pick <strong>error correction</strong>. Use H if a logo will sit on top, Q for print that will be handled.',
      'Download the PNG and <strong>scan it with an actual phone</strong> before committing it to anything.'
    ],
    tip: 'Print size is what fails in the wild, not resolution. A rough rule is that a code should be at least a tenth of the distance it will be scanned from — a poster read from two metres needs roughly 20 cm. A beautifully generated code the size of a stamp on a shop window scans for nobody.',
    faqs: [
      { q: 'My code will not scan.', a: 'Usually printed too small, too low contrast, or with no quiet zone — the blank margin around the code is part of the code and cropping it tight breaks scanning. Dark code on a light background, and leave the border.' },
      { q: 'Can I put a logo in the middle?', a: 'Yes, if you use error correction H, which tolerates about 30% obstruction. Keep the logo small and central, and test with several phones — this is the change most likely to quietly break scanning.' },
      { q: 'Does the code expire or track scans?', a: 'No. It is a static picture of your text, generated here and yours to keep. It works forever and reports nothing. Services offering editable or tracked codes point at their own server, which then becomes a dependency and a redirect you do not control.' },
      { q: 'Why does more text make a denser code?', a: 'Because every character has to be encoded in the pattern. Long URLs produce fine-grained codes that need to be printed larger to scan reliably — shortening the link first is often the real fix.' }
    ],
    related: ['barcode-generator', 'qr-scanner', 'favicon-generator', 'url-encoder', 'utm-builder', 'png-to-jpg']
  },

  /* ================= session 4 — finance and calculators =================
   *
   * YMYL. These explain a calculation; they never recommend a course of action.
   * Rules of thumb are labelled as lenders' tolerances or common conventions,
   * not as what the reader should do, and every figure a user might act on is
   * framed as an estimate. Keep it that way. */

  'loan-calculator': {
    intro: 'The monthly payment is the number lenders lead with, and it is the least useful one for comparing offers. Two loans with almost identical payments can differ by thousands once the term differs — total repaid is where that shows up.',
    what: [
      'Works out the monthly payment, total repaid and total interest for an amortising loan, including any arrangement fee.',
      'The arrangement fee field matters more than it looks. A 6.9% loan with a fee can cost more than a 7.4% loan without one, which is exactly the comparison headline rates are bad at.'
    ],
    specs: {
      caption: 'Figures worth knowing',
      rows: [
        ['Formula', 'M = P × r ÷ (1 − (1 + r)⁻ⁿ), the standard amortisation formula'],
        ['Total interest', 'Monthly payment × months − amount borrowed'],
        ['Rate range accepted', '0–100% a year'],
        ['Term range', '0.5–40 years'],
        ['APR vs nominal', 'APR includes compulsory fees; a nominal rate does not — compare like with like'],
        ['Common lender comfort limit', 'Total debt payments around 36% of take-home pay'],
        ['Currencies', 'USD, EUR, GBP, CAD, AUD, INR']
      ]
    },
    steps: [
      'Enter the amount, rate and term.',
      'Add any <strong>arrangement fee</strong> — it is often quoted separately from the rate and changes which offer is cheaper.',
      'Compare offers on <strong>total repaid</strong>, not the monthly payment.',
      'Run every offer you are considering before speaking to anyone.'
    ],
    tip: 'Time sits in the exponent and the amount is a plain multiplier, which is why stretching a term costs so much more than it appears to. Doubling what you borrow roughly doubles the interest; doubling the term more than doubles it.',
    faqs: [
      { q: 'Why is my lender’s figure slightly different?', a: 'Lenders vary in how they handle the first period, rounding and day-count conventions, and some fold fees into the balance so you pay interest on them. Expect small differences on the same inputs; a large one usually means a fee or insurance is included somewhere you have not spotted.' },
      { q: 'Should I use APR or the nominal rate?', a: 'APR, because it is meant to include compulsory fees and is therefore comparable between offers. If a lender quotes only a nominal rate, ask for the APR — the gap between them is the cost they would rather not lead with.' },
      { q: 'Is a longer term ever the right choice?', a: 'It can be, if the shorter term would genuinely strain your budget — paying more interest for a payment you can reliably meet beats defaulting on a cheaper loan. The point is to make that trade knowingly rather than because it was the number on the form.' },
      { q: 'Does this account for overpayments?', a: 'No, it assumes the scheduled payment throughout. Overpaying reduces the balance early and removes all the future interest that balance would have generated, so the real saving is larger than a simple comparison suggests.' }
    ],
    related: ['auto-loan-calculator', 'mortgage-calculator', 'refinance-calculator', 'credit-card-payoff', 'budget-calculator', 'simple-interest']
  },

  'mortgage-calculator': {
    intro: 'A mortgage payment is rarely just the mortgage. Property tax and insurance often add a fifth on top, and a budget built on the loan payment alone is a budget that breaks in the first year.',
    what: [
      'Calculates the monthly payment on a mortgage, and adds property tax and home insurance so the figure resembles what actually leaves your account.',
      'Deposit is deducted from the price to give the amount borrowed, so you can see immediately how much a larger deposit changes both the payment and the total interest.'
    ],
    specs: {
      caption: 'What goes into the monthly figure',
      rows: [
        ['Principal and interest', 'From the amount borrowed, rate and term'],
        ['Property tax', 'Entered annually, divided across the year'],
        ['Home insurance', 'Entered annually, divided across the year'],
        ['Not included', 'Service charges, ground rent, mortgage insurance, maintenance'],
        ['Term range', '1–50 years'],
        ['Rate range', '0–30% a year'],
        ['Common lender comfort limit', 'Total debt payments around 36% of income']
      ]
    },
    steps: [
      'Enter the price and your deposit.',
      'Enter the rate and term.',
      'Put in <strong>real</strong> property tax and insurance figures for the specific area — national averages are close to useless here, since tax varies enormously between districts.',
      'Compare the total against what you actually have spare each month.'
    ],
    tip: 'Whatever this produces, add a maintenance allowance before deciding what you can afford. A common planning figure is around 1% of the property value a year, and it is the cost that catches first-time buyers — a boiler does not care what your amortisation schedule says.',
    faqs: [
      { q: 'What is not included in this figure?', a: 'Service charges, ground rent, mortgage insurance where a small deposit requires it, utilities and maintenance. On some properties those add more than the tax and insurance combined, so treat the result as the floor rather than the total.' },
      { q: 'How much difference does the deposit make?', a: 'Two ways. It reduces the amount borrowed, which lowers the payment proportionally, and above certain thresholds it can unlock a better rate or remove mortgage insurance. Try a few deposit figures and watch both the payment and the total interest.' },
      { q: 'Should I take the longest term I can?', a: 'It lowers the monthly payment and raises the total substantially, because interest compounds on the balance you still owe. Whether that trade is right depends on your income stability, not on the arithmetic — the calculator shows the cost, it cannot weigh the risk.' },
      { q: 'Is this accurate enough to budget on?', a: 'It is an estimate for comparing scenarios, not an offer. Your lender’s figure will differ slightly, and local tax and insurance vary. Use it to narrow the range, then work from the actual illustration a lender gives you.' }
    ],
    related: ['home-affordability', 'mortgage-payoff', 'closing-costs', 'rent-vs-buy', 'refinance-calculator', 'loan-calculator']
  },

  'compound-interest': {
    intro: 'Compounding is famously powerful and famously hard to feel. The gap between what people expect and what the arithmetic produces is largest at exactly the horizons that matter — twenty years and beyond.',
    what: [
      'Projects what a starting balance plus regular monthly contributions becomes over time at a given annual return.',
      'It separates what you put in from what the growth added, which is the comparison worth seeing. Over long periods the growth typically overtakes the contributions, and the year it does is the point of the whole exercise.'
    ],
    specs: {
      caption: 'Inputs and useful reference points',
      rows: [
        ['Compounding', 'Monthly, matching the monthly contribution'],
        ['Return range accepted', '−50% to 100% a year — negative returns are allowed deliberately'],
        ['Time horizon', '1–70 years'],
        ['Rule of 72', 'Years to double ≈ 72 ÷ return, so 7% doubles in about 10 years'],
        ['Long-run stock market average', 'Often cited around 7% after inflation — an average, not a promise'],
        ['What is not modelled', 'Fees, tax, and inflation'],
        ['Currencies', 'USD, EUR, GBP, CAD, AUD, INR']
      ]
    },
    steps: [
      'Enter your starting amount and monthly contribution.',
      'Choose a return. Try a pessimistic figure as well as an optimistic one — the spread between them is the honest answer.',
      'Set the number of years.',
      'Compare <strong>total contributed</strong> against <strong>growth</strong> to see when compounding starts doing the work.'
    ],
    tip: 'Run it once with your expected return and once with two percentage points less. Fees, tax and a bad decade all come out of the same figure, and a plan that only survives the optimistic number is not a plan. The gap between the two runs is the risk you are carrying.',
    faqs: [
      { q: 'What return should I use?', a: 'That is the one input nobody can give you honestly. Long-run stock market averages are often quoted around 7% after inflation, but any individual decade can be far above or far below that. Model a range rather than a single figure.' },
      { q: 'Does this account for inflation?', a: 'No. The result is in today’s currency units, not today’s purchasing power. To think in real terms, subtract expected inflation from your return — a 7% return with 3% inflation is roughly 4% real.' },
      { q: 'Are fees and tax included?', a: 'Neither. A 1% annual fee is a straight deduction from your return and compounds against you exactly as growth compounds for you, which is why it costs far more over thirty years than it looks like it should.' },
      { q: 'Why does the growth accelerate so sharply?', a: 'Because returns are earned on previous returns, not just on what you put in. Early years look disappointing and late years look implausible — that shape is the whole point, and it is why time in the market is the variable people underestimate.' }
    ],
    related: ['investment-calculator', 'savings-goal', 'retirement-calculator', 'budget-calculator', 'simple-interest', 'credit-card-payoff']
  },

  'currency-converter': {
    intro: 'The rate you see quoted and the rate you get are different numbers, and the gap is where the money goes. Knowing the mid-market rate is how you find out what your bank actually charged you.',
    what: [
      'Converts between currencies using live mid-market rates fetched from a free public rate service.',
      'This is the one Vootkit tool that needs the network. Every other tool runs entirely in your browser; this one cannot, because exchange rates live somewhere else and change constantly.'
    ],
    specs: {
      caption: 'What the rate is, and is not',
      rows: [
        ['Rate type', 'Mid-market — the midpoint between buy and sell'],
        ['What you will actually get', 'Less, once a bank or card margin is applied'],
        ['Typical bank margin', 'Commonly 2–4% on top of the mid-market rate'],
        ['Typical card margin', 'Usually smaller, but varies by card and network'],
        ['Freshness', 'The rate’s update time is shown beneath the result'],
        ['Network', 'Required — the only Vootkit tool that needs it'],
        ['Account or key', 'Neither']
      ]
    },
    steps: [
      'Enter an amount and pick the two currencies.',
      'Use <strong>⇅ Swap</strong> to reverse the direction.',
      'Compare the result against what your bank or card actually quoted — the difference is their margin.'
    ],
    tip: 'The mid-market rate is a benchmark, not a price you can transact at. Its real use is as a yardstick: convert the amount here, compare it with the figure your provider offered, and the gap tells you what the transfer cost you. That number is often larger than any advertised fee.',
    faqs: [
      { q: 'Why is my bank’s rate worse than this?', a: 'Because the mid-market rate is the midpoint between what buyers and sellers want, and nobody transacts there. Banks and cards apply a margin on top, commonly 2–4%, which is frequently larger than any fee they name separately.' },
      { q: 'How current are the rates?', a: 'They come from a free public service and the update time is shown under the result. For a coffee it is fine; for a large transfer, check the rate at the moment you send, since markets move.' },
      { q: 'Why does this tool need the internet when the others do not?', a: 'Because an exchange rate is external data that changes by the second — it cannot be computed on your device the way a compression or a loan payment can. It is the single exception on the site.' },
      { q: 'Can I use this for accounting or tax?', a: 'No. Tax authorities usually require a specific published rate for a specific date, often their own. Use this for estimates and comparisons, and the official source for anything that has to be filed.' }
    ],
    related: ['salary-converter', 'loan-calculator', 'budget-calculator', 'compound-interest', 'savings-goal', 'investment-calculator']
  },

  'budget-calculator': {
    intro: 'The 50/30/20 rule is popular because it is simple enough to actually use. Half your take-home to needs, a third to wants, a fifth to savings and debt — and the value is usually in seeing which one is out of shape.',
    what: [
      'Splits your monthly take-home pay into the three 50/30/20 buckets and shows what a full year of the savings portion comes to.',
      'It works from take-home pay, not gross. Budgeting from a gross salary is the most common way people end up planning around money that was never going to arrive.'
    ],
    specs: {
      caption: 'The three buckets',
      rows: [
        ['Needs — 50%', 'Rent or mortgage, bills, food, transport, minimum debt payments'],
        ['Wants — 30%', 'Eating out, subscriptions, hobbies, travel'],
        ['Savings and debt — 20%', 'Emergency fund, investing, overpaying debt'],
        ['Based on', 'Take-home pay, after tax and deductions'],
        ['Status', 'A guideline, not a rule — high-rent cities routinely break the 50%'],
        ['Common first target', 'An emergency fund of three to six months of essential spending']
      ]
    },
    steps: [
      'Enter your <strong>monthly take-home pay</strong> — the amount that actually lands, not your salary.',
      'Compare the three figures against what you currently spend.',
      'Look at which bucket is furthest out rather than trying to fix all three.'
    ],
    tip: 'If needs exceed 50%, that is information rather than failure — in an expensive city it is close to unavoidable, and the realistic response is to protect the savings share and squeeze wants, not to pretend the rent is negotiable. The rule is a diagnostic, not a verdict.',
    faqs: [
      { q: 'My needs are way over 50%. Is that bad?', a: 'It is common, particularly where housing is expensive, and it does not mean you are doing something wrong. What it does mean is that the wants bucket is carrying the flexibility for the whole budget, so protecting the savings share matters more than usual.' },
      { q: 'Gross or take-home?', a: 'Take-home, always. Budgeting from gross salary counts money that goes to tax and pension before you ever see it, and produces a plan that is short every single month.' },
      { q: 'Where do debt payments go?', a: 'Minimums belong in needs, because missing them has consequences. Anything you pay above the minimum belongs in the 20%, since overpaying debt and saving are the same activity — buying your future self more room.' },
      { q: 'What should the 20% go to first?', a: 'Most guidance puts a small emergency buffer first, then high-interest debt, then longer-term saving. Paying 22% credit card interest while earning 4% in a savings account is a guaranteed loss, which is why the order matters more than the split.' }
    ],
    related: ['paycheck-calculator', 'savings-goal', 'credit-card-payoff', 'compound-interest', 'salary-converter', 'investment-calculator']
  },

  'paycheck-calculator': {
    intro: 'The gap between a salary and what arrives in your account is the number that actually governs your life, and it is rarely the one quoted in an offer.',
    what: [
      'Estimates take-home pay from a gross salary after tax, social contributions, pension and any other deductions, broken down per pay period.',
      'One thing to be clear about: <strong>you supply the tax rate</strong>. This does not know your country, region or personal allowances — it applies the percentages you enter. That makes it useful everywhere and authoritative nowhere.'
    ],
    specs: {
      caption: 'Inputs and what they mean',
      rows: [
        ['Effective tax rate', 'Your overall rate across all bands — not your top marginal rate'],
        ['Social security / NI', 'Entered separately because it is usually a flat-ish percentage'],
        ['Pension', 'Deducted from gross, so it also reduces taxable pay in many systems'],
        ['Pay periods', 'Monthly (12), Semi-monthly (24), Fortnightly (26), Weekly (52)'],
        ['Fortnightly quirk', '26 payments means two months a year contain three'],
        ['Not included', 'Tax bands, allowances, credits, local taxes, benefits in kind'],
        ['Status', 'An estimate for planning, not a payroll calculation']
      ]
    },
    steps: [
      'Enter your gross annual salary.',
      'Enter your <strong>effective</strong> tax rate — total tax divided by total income, not the top band you fall into.',
      'Add social contributions and pension as percentages.',
      'Pick your pay frequency to see the per-payslip figure.'
    ],
    tip: 'The most common mistake here is entering a marginal rate instead of an effective one. If your top band is 40%, your effective rate is usually far lower, because the lower bands are taxed less. Take last year’s total tax divided by last year’s total income and use that — it is the only figure that reflects your actual situation.',
    faqs: [
      { q: 'Why does this not know my country’s tax rules?', a: 'Deliberately. Tax bands, allowances and credits differ by country, region and personal circumstance, and change every year — a tool claiming to model all of that would be wrong somewhere and confidently so. Supplying the rate keeps the arithmetic honest and the responsibility clear.' },
      { q: 'What is an effective tax rate?', a: 'Your total tax divided by your total income. Progressive systems tax bands at rising rates, so someone in a 40% band pays 40% only on the portion above that threshold. The effective rate is usually much lower, and it is the figure this needs.' },
      { q: 'Why does fortnightly pay look different?', a: 'Twenty-six payments across twelve months means two months contain three paydays. Budgeting monthly on a fortnightly salary quietly overstates most months and understates two.' },
      { q: 'Should I use this to check my payslip?', a: 'As a rough sanity check only. A real payslip reflects tax codes, allowances, student loan thresholds and benefits in kind that this cannot see. If the gap is large, that is a question for your payroll department rather than evidence of an error.' }
    ],
    related: ['salary-converter', 'budget-calculator', 'self-employment-tax', 'home-affordability', 'savings-goal', 'loan-calculator']
  },

  'credit-card-payoff': {
    intro: 'Minimum payments are designed to be affordable and to keep the balance alive. Seeing how many years they actually take is the number that changes behaviour more reliably than any advice about spending less.',
    what: [
      'Works out how long a card balance takes to clear at a given monthly payment, and what adding an extra amount each month saves.',
      'The extra-payment field is the point of the tool. On a balance at typical card rates, a modest addition often removes years and a substantial share of the interest, because every extra pound goes straight at the principal.'
    ],
    specs: {
      caption: 'Why card debt behaves differently',
      rows: [
        ['Typical card APR', 'Often 20–25%, far above most other borrowing'],
        ['Minimum payment', 'Usually a small percentage of the balance, so it falls as you pay'],
        ['Effect of that', 'The term stretches enormously — decades is not unusual'],
        ['Extra payments', 'Go entirely against principal, removing all its future interest'],
        ['APR range accepted', '0–100%'],
        ['Compounding', 'Monthly'],
        ['Best return available', 'Clearing 22% debt beats any safe 4% savings rate']
      ]
    },
    steps: [
      'Enter the balance and the card’s APR — it is on your statement.',
      'Enter what you currently pay each month.',
      'Add an <strong>extra</strong> amount and compare. Try a figure you could genuinely sustain.',
      'Note the difference in both months and total interest.'
    ],
    tip: 'Paying off a card at 22% is mathematically identical to earning a guaranteed 22% return, tax-free, with no risk. There is no investment that offers that. Which is why, apart from keeping a small emergency buffer, high-interest debt generally comes before saving.',
    faqs: [
      { q: 'Why do minimum payments take so long?', a: 'Because the minimum is typically a percentage of the balance, so it shrinks as the balance does. Most of each payment covers interest, very little reaches the principal, and the term stretches into decades. The structure is doing exactly what it was designed to do.' },
      { q: 'Should I clear debt or build savings first?', a: 'Most guidance is: a small emergency buffer first so a surprise does not put you back on the card, then the high-interest debt, then longer-term saving. Carrying 22% debt while earning 4% on savings is a guaranteed net loss.' },
      { q: 'What about a 0% balance transfer?', a: 'It can help substantially, but check the transfer fee and what the rate becomes when the promotional period ends. It only works if you clear the balance within the window — otherwise you have moved the problem and paid a fee for the privilege.' },
      { q: 'Does this assume I stop spending on the card?', a: 'Yes. It models a fixed balance being paid down. Continuing to spend on the card while paying it off changes the picture completely, and is the usual reason real payoff takes longer than any calculator predicts.' }
    ],
    related: ['loan-calculator', 'budget-calculator', 'savings-goal', 'compound-interest', 'refinance-calculator', 'deductible-calculator']
  },

  'savings-goal': {
    intro: 'Working backwards from a target is more useful than watching a balance grow. A deposit, a wedding, a replacement car — the question is always the same: what does this cost me per month?',
    what: [
      'Calculates the monthly contribution needed to reach a target by a date, allowing for what you have already saved and the interest earned along the way.',
      'The interest field is worth entering honestly. Over a few years at ordinary savings rates it reduces the monthly figure noticeably, but it will not rescue a target that is simply too large for the time available.'
    ],
    specs: {
      caption: 'Inputs and reference points',
      rows: [
        ['Target', 'What you need, in total'],
        ['Saved so far', 'Counted, and it earns interest for the whole period'],
        ['Time', '0.5–50 years'],
        ['Interest rate', '0–30% a year'],
        ['Compounding', 'Monthly, matching the contributions'],
        ['Emergency fund guideline', 'Three to six months of essential spending'],
        ['Not modelled', 'Inflation and tax on interest']
      ]
    },
    steps: [
      'Enter the target and what you have already put aside.',
      'Set how long you have.',
      'Enter a realistic interest rate — the one your account actually pays, not a headline offer.',
      'If the monthly figure is unaffordable, extend the timeline and run it again.'
    ],
    tip: 'When the required monthly amount is out of reach, the honest levers are time and target, not return. Chasing a higher rate to close the gap means taking risk with money you need on a fixed date — which is precisely the situation where a bad year is unrecoverable.',
    faqs: [
      { q: 'The monthly figure is more than I can afford.', a: 'Extend the deadline or reduce the target. Those are the two variables genuinely under your control. Raising the assumed return to make the number work is how short-horizon savings end up in investments that can fall exactly when you need the money.' },
      { q: 'What rate should I enter?', a: 'What your account actually pays, not a promotional headline that reverts after twelve months. For horizons under five years, a savings account or fixed-term deposit is the usual home for money you cannot afford to see fall.' },
      { q: 'Does this account for inflation?', a: 'No. If you are saving for something whose price rises — a house deposit, a car — the real target moves. For longer goals, consider raising the target rather than relying on the interest to cover it.' },
      { q: 'How big should an emergency fund be?', a: 'Common guidance is three to six months of essential spending, with the higher end for variable or self-employed income. Essential spending, not total spending — the figure is meant to cover a gap, not maintain your usual lifestyle.' }
    ],
    related: ['compound-interest', 'budget-calculator', 'investment-calculator', 'credit-card-payoff', 'retirement-calculator', 'home-affordability']
  },

  'investment-calculator': {
    intro: 'The useful output is not the final number, which depends entirely on an assumption you cannot verify. It is the split between what you contributed and what growth added — and how that split changes with time.',
    what: [
      'Projects the future value of an initial investment plus monthly contributions, and separates total contributed from investment growth.',
      'It also shows the return as a percentage of what you put in, which is a more grounded way to read the result than a single large future figure.'
    ],
    specs: {
      caption: 'Inputs and honest reference points',
      rows: [
        ['Time horizon', '1–80 years'],
        ['Expected return', '0–100% a year — you supply it'],
        ['Compounding', 'Monthly'],
        ['Often-quoted long-run average', 'Around 7% after inflation for broad stock markets'],
        ['Reality of that average', 'Individual decades have been far above and far below it'],
        ['Not modelled', 'Fees, tax, inflation, and sequence of returns'],
        ['Rule of 72', 'Years to double ≈ 72 ÷ return']
      ]
    },
    steps: [
      'Enter your initial amount and monthly contribution.',
      'Choose an expected return — and then run it again two points lower.',
      'Set the horizon.',
      'Read <strong>total contributed</strong> against <strong>growth</strong> rather than fixating on the final figure.'
    ],
    tip: 'A 1% annual fee does not cost you 1%. It compounds against you for the whole period, and over thirty years commonly consumes a fifth or more of the final balance. Modelling your return net of fees is the single change that makes a projection resemble reality.',
    faqs: [
      { q: 'What return should I assume?', a: 'Nobody can answer that honestly for you. Broad stock market averages are often quoted around 7% after inflation over long periods, but that is an average across decades that individually ranged from excellent to negative. Model a range and plan against the pessimistic end.' },
      { q: 'Why does the order of returns matter?', a: 'For a lump sum it does not, but for regular contributions it does — a poor first decade means later contributions buy in cheaper, and a poor final decade hits the largest balance. This projects a smooth average, which no real market delivers.' },
      { q: 'Are fees and tax included?', a: 'Neither. Subtract your platform and fund fees from the expected return before entering it. Tax depends on your jurisdiction and account type, and the difference between a tax-sheltered account and a taxable one is often larger than the difference between two funds.' },
      { q: 'Is this financial advice?', a: 'No. It performs an arithmetic projection from figures you supply. What to invest in, and whether investing suits your circumstances at all, are questions for a licensed adviser who knows your situation.' }
    ],
    related: ['compound-interest', 'retirement-calculator', 'savings-goal', 'budget-calculator', 'paycheck-calculator', 'credit-card-payoff']
  },

  'auto-loan-calculator': {
    intro: 'Car finance is sold on the monthly payment, and it is the one figure that hides everything. Two deals with the same monthly cost can differ by thousands once the term, deposit and trade-in are accounted for.',
    what: [
      'Calculates the monthly payment and total cost of a vehicle loan, including deposit, trade-in value and sales tax.',
      'Term is entered in months rather than years because that is how car finance is quoted — and because the difference between 60 and 84 months is where most of the cost hides.'
    ],
    specs: {
      caption: 'Terms and what they cost',
      rows: [
        ['Term range', '6–120 months'],
        ['Common terms', '48, 60, 72 and increasingly 84 months'],
        ['Effect of stretching', 'A lower payment and materially more total interest'],
        ['Deposit and trade-in', 'Both reduce the amount financed'],
        ['Sales tax', '0–30%, applied to the purchase'],
        ['Depreciation risk', 'Long terms can leave you owing more than the car is worth'],
        ['Rate range', '0–40% a year']
      ]
    },
    steps: [
      'Enter the price, deposit and any trade-in value.',
      'Enter the rate and term in months.',
      'Add sales tax if it applies where you are.',
      'Run the same car at 60 and 84 months and compare <strong>total</strong> cost, not the payment.'
    ],
    tip: 'A long term on a fast-depreciating asset means years of owing more than the car is worth. If it is written off or you need to sell, you cover the gap yourself — which is a specific risk of car finance that does not apply to a mortgage in the same way.',
    faqs: [
      { q: 'Is a 72 or 84-month term a bad idea?', a: 'It lowers the payment and raises the total, and on a depreciating asset it extends the period where you owe more than the car is worth. Whether that is acceptable depends on how long you keep cars and how stable your income is — the calculator shows the cost, not the risk.' },
      { q: 'Is 0% finance really free?', a: 'Sometimes. Check whether the cash price would have been lower without the finance, and whether there is an arrangement fee. "0% finance" and "discount for paying outright" are frequently the same money presented differently.' },
      { q: 'Should I put the trade-in toward the deposit?', a: 'It reduces the amount financed either way. The question worth asking is whether the dealer’s trade-in offer is competitive — bundling it into a finance deal makes it harder to see what you were actually given for the old car.' },
      { q: 'What is not included?', a: 'Insurance, tax, servicing, tyres and fuel. On a cheaper car those running costs can exceed the finance payment, so the monthly figure here is not the monthly cost of owning the vehicle.' }
    ],
    related: ['loan-calculator', 'auto-insurance-estimator', 'budget-calculator', 'credit-card-payoff', 'refinance-calculator', 'deductible-calculator']
  },

  'refinance-calculator': {
    intro: 'Refinancing is worth it when the interest saved exceeds the cost of switching. That is a break-even date, not a feeling — and the honest question is whether you will still be there when it arrives.',
    what: [
      'Compares your current loan against a new one and works out how many months it takes for the savings to cover the refinancing costs.',
      'The trap it is designed to expose: a lower rate on a longer term can reduce the monthly payment while increasing the total you pay. The break-even tells you about the costs; the total tells you about the term.'
    ],
    specs: {
      caption: 'What decides whether it is worth it',
      rows: [
        ['Break-even', 'Refinancing costs ÷ monthly saving = months to recover'],
        ['The key question', 'Will you still hold the loan past that date?'],
        ['Resetting the term', 'A new 30-year term restarts the interest-heavy early years'],
        ['Lower payment, higher total', 'Common when the term is extended — check both'],
        ['Rate range', '0–30% a year'],
        ['Term range', '1–50 years'],
        ['Not modelled', 'Early repayment charges on the existing loan']
      ]
    },
    steps: [
      'Enter your current balance, rate and years remaining.',
      'Enter the new rate, new term and all refinancing costs.',
      'Read the <strong>break-even</strong> — if you would move or repay before then, it does not pay.',
      'Compare total repaid on both, not just the monthly payment.'
    ],
    tip: 'Check for an early repayment charge on your existing loan before doing anything else. It is a cost of switching like any other and belongs in the refinancing costs field — leaving it out is the most common way a break-even calculation comes out wrong.',
    faqs: [
      { q: 'How do I know if refinancing is worth it?', a: 'Compare the break-even month against how long you realistically expect to keep the loan. If the costs take four years to recover and you might move in two, it does not pay however attractive the new rate looks.' },
      { q: 'My payment drops but the total goes up. Why?', a: 'Because the new term is longer. Refinancing a loan with 26 years left into a fresh 30-year term lowers the payment and adds four years of interest. Matching the remaining term rather than restarting avoids that.' },
      { q: 'What counts as refinancing costs?', a: 'Arrangement and valuation fees, legal costs, and any early repayment charge on the loan you are leaving. That last one is the one people forget, and it is often the largest.' },
      { q: 'Does a lower rate always save money?', a: 'Only if the term and costs cooperate. Rate, term and fees together decide the total — which is why comparing offers on total repaid rather than headline rate is the only reliable method.' }
    ],
    related: ['mortgage-calculator', 'mortgage-payoff', 'loan-calculator', 'home-affordability', 'closing-costs', 'credit-card-payoff']
  },

  'home-affordability': {
    intro: 'Working forward from a house you like tells you what you want. Working backwards from your income tells you what a lender will agree to — and those are usually different numbers.',
    what: [
      'Estimates the property price your income supports, from your deposit, existing debt payments and a debt-to-income limit.',
      'Debt-to-income is the lever lenders actually use. The default of 36% is a common comfort threshold; raising it shows what a more permissive lender might allow, which is not the same as what you can comfortably carry.'
    ],
    specs: {
      caption: 'How lenders think about this',
      rows: [
        ['Debt-to-income', 'Total monthly debt payments ÷ gross monthly income'],
        ['Common comfort limit', 'Around 36%, which is the default here'],
        ['Range accepted', '10–60% — the top end is well past comfortable'],
        ['Existing debt', 'Car finance, cards, student loans all count against you'],
        ['Deposit', 'Raises the price you can reach, and may improve the rate'],
        ['Not included', 'Property tax, insurance, service charges, maintenance'],
        ['Term range', '5–40 years']
      ]
    },
    steps: [
      'Enter household income and your existing monthly debt payments.',
      'Enter the deposit you actually have available — after moving and closing costs, not before.',
      'Set the rate and term.',
      'Leave <strong>max debt-to-income</strong> at 36% unless you are testing what a lender might stretch to.'
    ],
    tip: 'Clearing a car loan before applying can raise your affordable price more than saving the same amount toward the deposit, because the monthly payment is removed from the debt-to-income calculation entirely. Worth testing both ways before deciding where spare money goes.',
    faqs: [
      { q: 'A lender offered me more than this suggests.', a: 'Lenders differ, and some will stretch well past 36%. What a lender will approve and what leaves you comfortable are different questions — the maximum is their risk tolerance, not a recommendation, and their downside is not the same as yours.' },
      { q: 'Does the result include tax and insurance?', a: 'No. Property tax, insurance, service charges and maintenance sit on top and can add a fifth or more to the monthly cost. Take the price this gives you into the Mortgage Calculator with real local figures for the fuller picture.' },
      { q: 'How much deposit do I actually need?', a: 'It varies by market and product, but a larger deposit lowers the amount borrowed and can unlock better rates or remove mortgage insurance. Remember closing costs come out of your savings too — the deposit is not the only cash you need on the day.' },
      { q: 'Should I use gross or take-home income?', a: 'Debt-to-income is conventionally calculated on gross income, which is what this expects. That is also why the result can look generous against what your bank account experiences — check the resulting payment against your take-home pay before believing it.' }
    ],
    related: ['mortgage-calculator', 'closing-costs', 'rent-vs-buy', 'mortgage-payoff', 'paycheck-calculator', 'budget-calculator']
  },

  /* ================= session 5 — everyday, video and utilities ================= */

  'unit-converter': {
    intro: 'Seven categories in one place, because the alternative is a different tab for every conversion and a nagging doubt about whether the site used US or imperial gallons.',
    what: [
      'Converts within Length, Mass, Area, Volume, Speed, Data and Time, plus Temperature, which is handled separately because it does not scale from zero.',
      'Everything except temperature is a simple ratio against a base unit, which is why the conversions are exact rather than rounded lookups.'
    ],
    specs: {
      caption: 'What is covered',
      rows: [
        ['Length', 'mm, cm, m, km, in, ft, yd, mi, nautical miles'],
        ['Mass', 'mg, g, kg, tonne, oz, lb, stone'],
        ['Volume', 'mL, L, m³, tsp, tbsp, cup, pint, quart, gallon'],
        ['Speed', 'm/s, km/h, mph, knots, ft/s'],
        ['Data', 'B, KB, MB, GB, TB — binary, so 1 KB = 1024 B'],
        ['Time', 'ms, s, min, h, day, week'],
        ['Temperature', 'C, F, K — converted by formula, not ratio']
      ]
    },
    steps: [
      'Pick a category.',
      'Choose the units to convert from and to.',
      'Type the value — the result updates as you type.'
    ],
    tip: 'The volume units are US customary. A US gallon is about 3.785 litres and an imperial gallon is about 4.546, a difference of 20% — which is enough to ruin a recipe or badly mislead a fuel-economy comparison. Check which one your source meant before trusting the number.',
    faqs: [
      { q: 'Is 1 KB 1000 or 1024 bytes?', a: 'Here it is 1024, the binary convention operating systems use. Storage manufacturers use 1000, which is why a "500 GB" drive shows as roughly 465 GB in your file manager. Neither is wrong; they are different definitions, and the gap grows with size.' },
      { q: 'Why is temperature separate?', a: 'Because it has no true zero to scale from. Every other conversion is multiplication by a ratio, but Celsius to Fahrenheit needs an offset as well as a factor — 0°C is 32°F, not 0°F, so a simple ratio gives nonsense.' },
      { q: 'Are these US or imperial gallons?', a: 'US. The two differ by about 20%, along with pints and quarts. If your source is British, the numbers will not match, and on fuel economy the error is large enough to matter.' },
      { q: 'How precise are the results?', a: 'The factors are the standard exact definitions — an inch is exactly 0.0254 m, a mile exactly 1609.344 m. Precision is limited by ordinary floating-point arithmetic, which is far beyond anything you would notice.' }
    ],
    related: ['length-converter', 'weight-converter', 'temperature-converter', 'data-converter', 'speed-converter', 'volume-converter']
  },

  'age-calculator': {
    intro: 'Working out an exact age is fiddly precisely because months are not the same length. "Two years, three months and eleven days" cannot be derived from a day count, and a day count cannot be derived from it either.',
    what: [
      'Gives the gap between two dates as years, months and days, and also as a total in days, weeks and hours.',
      'Both readings are useful for different things. Years-months-days is how people describe an age; totals are what you need for deadlines, notice periods and anything counted rather than named.'
    ],
    specs: {
      caption: 'What it reports',
      rows: [
        ['Calendar gap', 'Years, months and days'],
        ['Total days', 'The exact count between the dates'],
        ['Total weeks', 'Days ÷ 7'],
        ['Total hours', 'Days × 24'],
        ['Leap years', 'Handled — they are real days in the total'],
        ['Direction', 'Works forwards or backwards, so it covers future dates too'],
        ['Inputs', 'Two dates']
      ]
    },
    steps: [
      'Enter the start date.',
      'Enter the end date — today for an age, a future date for a countdown.',
      'Read whichever figure suits: the calendar gap for describing it, the totals for counting it.'
    ],
    tip: 'The two answers genuinely disagree and both are right. Someone born on 29 February has a birthday every four years but ages one year every year, and "18 months" is a different number of days depending on which months they were. If a contract or a deadline is involved, use the total-days figure — it is the one that is unambiguous.',
    faqs: [
      { q: 'Why does the month count seem off by a day?', a: 'Because months vary between 28 and 31 days, so "one month later" from the 31st is ambiguous. The calendar gap counts whole months first and the remainder in days, which is how people describe an age but is not a fixed number of days.' },
      { q: 'Are leap years included?', a: 'Yes. They are real days and appear in the total-days figure. That is why a span covering a leap year has one more day than an otherwise identical one that does not.' },
      { q: 'Can I calculate a future date gap?', a: 'Yes — put today first and the future date second. It works in both directions, so it covers deadlines and countdowns as well as ages.' },
      { q: 'Which figure should I use for a legal deadline?', a: 'Total days, unless the rule specifically says months. Day counts are unambiguous; month counts depend on which months and on how the drafter intended partial months to be treated.' }
    ],
    related: ['date-calculator', 'time-calculator', 'countdown', 'timezone-converter', 'timestamp-converter', 'pto-accrual']
  },

  'bmi-calculator': {
    intro: 'BMI is a population statistic being used as a personal one, which is where nearly all the confusion comes from. It is a quick screening number, and it is genuinely poor at distinguishing muscle from fat.',
    what: [
      'Calculates body mass index from weight and height, in metric or imperial units.',
      'What it does not do is measure body composition. BMI is weight divided by height squared — it has no way of knowing whether the weight is muscle, fat, bone or fluid, which is why it misclassifies athletic and older bodies routinely.'
    ],
    specs: {
      caption: 'The standard categories',
      rows: [
        ['Under 18.5', 'Underweight'],
        ['18.5 – 24.9', 'Healthy range'],
        ['25 – 29.9', 'Overweight'],
        ['30 and above', 'Obese'],
        ['Formula', 'Weight in kg ÷ (height in metres)²'],
        ['Units accepted', 'Metric (kg, cm) or Imperial (lb, in)'],
        ['Known to misclassify', 'Muscular builds, older adults, and it varies by ancestry']
      ]
    },
    steps: [
      'Choose metric or imperial.',
      'Enter weight and height.',
      'Read the result as a rough screening figure, not a diagnosis.'
    ],
    tip: 'A muscular person can register as overweight on BMI while carrying very little fat, and an older person who has lost muscle can sit in the healthy range while carrying too much. Waist measurement tracks health risk better than BMI for most individuals, which is why clinicians increasingly ask for both.',
    faqs: [
      { q: 'Is BMI accurate for athletes?', a: 'Often not. Muscle is denser than fat, so a well-trained person can land in the overweight or obese band with low body fat. BMI was designed to describe populations, and it does that reasonably well; it was never designed to assess an individual.' },
      { q: 'Do the thresholds apply to everyone?', a: 'No. Some health bodies use lower thresholds for people of South Asian ancestry, because health risks appear at a lower BMI. The categories here are the standard international ones, which is not the same as the right ones for every individual.' },
      { q: 'Does BMI work for children?', a: 'Not with these categories. Children are assessed against age and sex percentile charts, because their bodies change proportion as they grow. A child’s BMI number means nothing without the chart.' },
      { q: 'What is a better measure?', a: 'For individuals, waist circumference or waist-to-height ratio tracks risk more closely, because it reflects where fat is carried rather than only how much you weigh. Discuss anything that concerns you with a clinician rather than a calculator.' }
    ],
    related: ['body-fat-calculator', 'ideal-weight-calculator', 'bmr-calculator', 'macro-calculator', 'water-intake-calculator', 'heart-rate-calculator']
  },

  'percentage-calculator': {
    intro: 'Three different questions get called "percentage", and mixing them up is how a 20% discount followed by a 20% rise fails to return you to where you started.',
    what: [
      'Handles the three percentage questions people actually ask: what is A% of B, A is what percent of B, and what is the percentage change from A to B.',
      'The third is the one that catches people. Percentage change is always measured against the starting value, so the same absolute movement gives different percentages depending on which direction you travel.'
    ],
    specs: {
      caption: 'The three modes',
      rows: [
        ['A% of B', 'A tip, a tax, a discount amount'],
        ['A is what % of B', 'A share of a total — 30 out of 200 is 15%'],
        ['% change from A to B', 'Growth or decline, measured against the start'],
        ['Change formula', '(B − A) ÷ A × 100'],
        ['Asymmetry', 'A 50% fall needs a 100% rise to undo it'],
        ['Percentage vs percentage point', '5% to 6% is a 1 point rise, and a 20% increase']
      ]
    },
    steps: [
      'Pick which of the three questions you are asking — this is the step that matters.',
      'Enter the two values.',
      'Read the result.'
    ],
    tip: 'Percentage changes do not cancel out. A price cut by 20% then raised by 20% ends up 4% below where it started, because the rise is calculated on the smaller number. The same arithmetic explains why an investment that falls 50% needs to double to break even.',
    faqs: [
      { q: 'Why does a 20% cut then a 20% rise not return to the original?', a: 'Because each percentage is applied to a different base. Twenty percent off 100 is 80; twenty percent of 80 is only 16, so you come back to 96. The second percentage is measured against the reduced figure.' },
      { q: 'What is the difference between percent and percentage point?', a: 'A rate moving from 5% to 6% has risen by one percentage point, and by 20 percent. Both are correct and they describe the same move — which is exactly why the distinction gets exploited in headlines.' },
      { q: 'How do I calculate a discount plus tax?', a: 'Apply them in the order they actually happen: discount first, then tax on the reduced price. The Discount Calculator does both in one step, including a second coupon.' },
      { q: 'Can percentage change be over 100%?', a: 'Yes, whenever something more than doubles — a rise from 10 to 25 is a 150% increase. A decrease cannot exceed 100%, because that would mean ending below zero.' }
    ],
    related: ['discount-calculator', 'tip-split', 'profit-margin', 'vat-gst', 'simple-interest', 'compound-interest']
  },

  'discount-calculator': {
    intro: 'A stacked discount is rarely the sum of its parts. "30% off plus an extra 20% with this code" is not 50% off, and the gap is usually where the offer earns its margin.',
    what: [
      'Works out what you actually pay after a discount, an optional stacked coupon and sales tax.',
      'The order matters and is fixed for a reason: the coupon applies to the already-reduced price, and tax applies last, to what you actually pay. That is how nearly every till in the world does it.'
    ],
    specs: {
      caption: 'How stacking really works',
      rows: [
        ['Order applied', 'Discount → coupon on the reduced price → tax on the total'],
        ['30% then 20%', '44% off, not 50%'],
        ['50% then 50%', '75% off, not free'],
        ['Discount range', '0–100%'],
        ['Coupon range', '0–100%, optional'],
        ['Sales tax', 'Optional, applied at the end'],
        ['Currencies', 'USD, EUR, GBP, CAD, AUD, INR']
      ]
    },
    steps: [
      'Enter the original price and the main discount.',
      'Add a coupon percentage if one stacks on top.',
      'Add sales tax if your region adds it at the till.',
      'Compare the final figure against the headline claim.'
    ],
    tip: 'Two stacked percentages multiply rather than add. Thirty percent then twenty percent leaves you paying 0.7 × 0.8 = 56% of the original, so 44% off rather than the 50% it sounds like. The difference is small on a jumper and substantial on a sofa.',
    faqs: [
      { q: 'Why is 30% plus 20% not 50%?', a: 'Because the second discount applies to the already-reduced price, not the original. You pay 70% of the price, then 80% of that — 56% overall, so 44% off. Stacked percentages multiply; they never add.' },
      { q: 'Should tax go before or after the discount?', a: 'After, in almost every system. You are taxed on what you actually pay, so the discount comes off first. This tool follows that order.' },
      { q: 'Does the order of two discounts matter?', a: 'Not to the final price — multiplication is commutative, so 30% then 20% costs the same as 20% then 30%. It can matter to whether a retailer allows the combination at all.' },
      { q: 'How do I work out the original price from a sale price?', a: 'Divide rather than adding the percentage back. Something 25% off at 60 was 60 ÷ 0.75 = 80. Adding 25% to 60 gives 75, which is the classic error.' }
    ],
    related: ['percentage-calculator', 'vat-gst', 'tip-split', 'profit-margin', 'break-even', 'currency-converter']
  },

  'timezone-converter': {
    intro: 'Scheduling across timezones goes wrong twice a year, when one country changes clocks and the other has not yet — or never does. A fixed offset you memorised in January is wrong in April.',
    what: [
      'Converts a specific date and time between timezones using the IANA timezone database built into your browser.',
      'Because it uses real timezone rules rather than fixed offsets, daylight saving is handled for the actual date you enter — including the weeks when two regions have switched and the other has not.'
    ],
    specs: {
      caption: 'Why offsets are not enough',
      rows: [
        ['Source of rules', 'The IANA timezone database, built into your browser'],
        ['Daylight saving', 'Applied automatically for the date you enter'],
        ['Why the date matters', 'The offset between two zones changes across the year'],
        ['Northern switch', 'Usually March and October/November'],
        ['Southern switch', 'The opposite months — offsets can move by two hours'],
        ['No daylight saving', 'Much of Asia and Africa, and Arizona in the US'],
        ['Clock source', 'Your device']
      ]
    },
    steps: [
      'Enter the <strong>date and time</strong>, not just the time — the date decides the offset.',
      'Pick the source and target timezones.',
      'Read the converted time.'
    ],
    tip: 'The dangerous window is the few weeks each spring and autumn when one region has changed clocks and the other has not. The usual gap between London and New York is five hours, but for about two weeks a year it is four. Meetings booked on a remembered offset land an hour out, and only in that window.',
    faqs: [
      { q: 'Why does the offset change depending on the date?', a: 'Daylight saving. Regions switch on different dates, and some never switch at all, so the gap between any two zones is not constant. That is exactly why entering the date matters as much as the time.' },
      { q: 'Which timezone should I use for a country with several?', a: 'Pick the city rather than the country. The US spans six zones and Australia three, so "US time" is meaningless — IANA names are city-based for this reason.' },
      { q: 'Is my device’s clock used?', a: 'For the current time, yes. The conversion rules come from the timezone database rather than your clock, so an incorrect device time shifts the starting point but not the arithmetic.' },
      { q: 'How should I write a time for an international invite?', a: 'Include the timezone abbreviation and the UTC offset, and let calendar software do the conversion. Sending a bare "3pm" to a global team is how meetings get missed.' }
    ],
    related: ['timestamp-converter', 'time-calculator', 'date-calculator', 'age-calculator', 'countdown', 'unit-converter']
  },

  'timestamp-converter': {
    intro: 'Unix time is a single number counting seconds since the start of 1970, which is exactly why it appears in logs, APIs and databases — and why it is unreadable to humans without converting it.',
    what: [
      'Converts a Unix timestamp into ISO 8601, UTC and your local time, and converts a date back into a timestamp.',
      'Seeing all three at once is the point. Most timestamp bugs are timezone bugs, and they become obvious the moment you can compare the UTC and local readings side by side.'
    ],
    specs: {
      caption: 'Formats and gotchas',
      rows: [
        ['Epoch', 'Seconds since 1 January 1970, 00:00:00 UTC'],
        ['ISO 8601', 'The interchange format — 2026-07-23T14:30:00Z'],
        ['Seconds vs milliseconds', 'JavaScript uses milliseconds; most APIs use seconds'],
        ['Spotting the difference', 'A 13-digit number is milliseconds, 10 digits is seconds'],
        ['Timezone', 'A Unix timestamp is always UTC — it carries no zone'],
        ['Year 2038', '32-bit signed timestamps overflow in January 2038'],
        ['Negative values', 'Valid — they represent dates before 1970']
      ]
    },
    steps: [
      'Paste a Unix timestamp to see it as ISO, UTC and local time.',
      'Or enter a date to get the timestamp back.',
      'If a converted date lands in 1970 or the far future, check whether you have seconds and milliseconds mixed up.'
    ],
    tip: 'A date around 1970 almost always means milliseconds were read as seconds, and a date tens of thousands of years away means the reverse. Count the digits: ten is seconds, thirteen is milliseconds. That single check resolves most timestamp bugs before you start reading code.',
    faqs: [
      { q: 'My timestamp converts to 1970. What went wrong?', a: 'You almost certainly have a millisecond value being read as seconds, or a value that was truncated. Ten digits is seconds and thirteen is milliseconds — dividing a millisecond value by 1000 usually fixes it immediately.' },
      { q: 'Does a Unix timestamp have a timezone?', a: 'No, and that is its main advantage. It is always seconds since the epoch in UTC. Timezone only enters when you format it for display, which is where the vast majority of date bugs live.' },
      { q: 'What is the 2038 problem?', a: 'A signed 32-bit integer runs out in January 2038 and wraps to a negative number, putting the date in 1901. Modern systems use 64-bit values and are fine, but embedded devices and old databases are still a live concern.' },
      { q: 'Why use ISO 8601 rather than a normal date?', a: 'Because it is unambiguous. 03/04/2026 is March in the US and April nearly everywhere else; 2026-04-03 can only mean one thing, and it sorts correctly as plain text.' }
    ],
    related: ['timezone-converter', 'date-calculator', 'age-calculator', 'json-formatter', 'jwt-decoder', 'uuid-generator']
  },

  'text-diff': {
    intro: 'Two versions of a document and a vague memory of what changed is a bad combination, especially when the change that matters is a single word in a contract.',
    what: [
      'Compares two blocks of text line by line and marks what was added, removed or left alone.',
      'It compares by line rather than by word, which suits documents, configuration files and code. A single-word change shows the whole line as changed on both sides, which is usually what you want to look at anyway.'
    ],
    specs: {
      caption: 'How the comparison works',
      rows: [
        ['Granularity', 'Line by line'],
        ['Marked', 'Added, removed, unchanged'],
        ['Best for', 'Contracts, configuration files, code, drafts'],
        ['Less useful for', 'Prose reflowed to different line lengths'],
        ['Whitespace', 'Counts — a changed indent is a changed line'],
        ['Order', 'Left is the original, right is the new version'],
        ['Processing', 'In this page — nothing is uploaded']
      ]
    },
    steps: [
      'Paste the original on the left and the new version on the right.',
      'Read the marked lines.',
      'If everything appears changed, check for different line endings or reflowed paragraphs rather than assuming the worst.'
    ],
    tip: 'If a comparison shows every line as different, the text is almost certainly wrapped differently rather than actually rewritten — one version came from a PDF or an editor with a different line width. Normalising the wrapping first turns an unreadable diff into a useful one.',
    faqs: [
      { q: 'Every line shows as changed. Why?', a: 'Usually different line wrapping or line endings — text copied from a PDF wraps at the page width, and Windows and Unix use different newline characters. The content may be identical while every line differs.' },
      { q: 'Can it show which word changed?', a: 'Not within a line; comparison is by line, so a one-word edit marks the whole line. For documents and code that is normally the useful granularity, since you want to read the line in context anyway.' },
      { q: 'Is it safe to paste a contract here?', a: 'The comparison runs in this page and nothing is transmitted, which is the reason to prefer it over a server-side diff for anything confidential.' },
      { q: 'Does whitespace count?', a: 'Yes. A changed indent or a trailing space makes the line different. That is deliberate — in code and configuration, whitespace changes are real changes.' }
    ],
    related: ['compare-pdf', 'word-counter', 'readability', 'line-tools', 'json-formatter', 'markdown-editor']
  },

  'slug-generator': {
    intro: 'A URL slug is the part of the address a human might read, and the constraints are unforgiving: no spaces, no accents, no ambiguity about case. Getting it right at publication time avoids a redirect later.',
    what: [
      'Turns a title into a clean URL slug — lowercase, hyphen-separated, stripped of accents and punctuation.',
      'The output is deliberately conservative. It uses only characters that survive every browser, mail client and analytics tool without encoding, because a slug that needs escaping shows up as gibberish when someone pastes the link.'
    ],
    specs: {
      caption: 'Slug conventions',
      rows: [
        ['Case', 'Lowercase — some servers treat case as significant'],
        ['Word separator', 'Hyphens, which search engines read as spaces'],
        ['Underscores', 'Avoid — historically not treated as word breaks'],
        ['Accents', 'Reduced to their base letters'],
        ['Punctuation', 'Removed'],
        ['Sensible length', 'Three to five meaningful words'],
        ['Stop words', 'Usually dropped — "the", "a", "of" add nothing']
      ]
    },
    steps: [
      'Paste your title.',
      'Copy the slug.',
      'Trim it to the three to five words that carry the meaning.'
    ],
    tip: 'Decide the slug before you publish, not after. Changing it later breaks every existing link and needs a redirect to preserve the ranking the old URL earned — which is recoverable but never free. Leaving dates or category names out also keeps the URL valid when either changes.',
    faqs: [
      { q: 'Hyphens or underscores?', a: 'Hyphens. Search engines have long treated hyphens as word separators and underscores as joiners, so my_blog_post can be read as one token while my-blog-post is three words. The convention is settled.' },
      { q: 'How long should a slug be?', a: 'Long enough to be meaningful, short enough to read — three to five substantial words is typical. Dropping stop words keeps it tight without losing sense.' },
      { q: 'Can I change a slug after publishing?', a: 'You can, but every existing link breaks and any ranking the old URL held needs a 301 redirect to carry across. Cheaper to get it right first, and to leave dates and categories out so it stays valid.' },
      { q: 'What happens to non-English characters?', a: 'Accents are reduced to base letters, so "café" becomes "cafe". Scripts without a Latin equivalent cannot be transliterated reliably and are dropped rather than guessed at — check the output when working in a non-Latin language.' }
    ],
    related: ['meta-tag-generator', 'serp-preview', 'case-converter', 'url-encoder', 'utm-builder', 'keyword-density']
  },

  'trim-video': {
    intro: 'Trimming is the one video edit that costs nothing. Because the streams are copied rather than re-encoded, it is fast, lossless, and it is almost always the first thing worth doing to a clip.',
    what: [
      'Cuts a clip to a start and end time by copying the streams, without re-encoding.',
      'That copy is why it finishes almost instantly on a file that would take minutes to compress — and why the picture is bit-for-bit identical to the original within the section you kept.'
    ],
    specs: {
      caption: 'Behaviour and limits',
      rows: [
        ['Method', 'Stream copy — no re-encoding'],
        ['Quality', 'Identical to the source'],
        ['Speed', 'Near-instant, even on large files'],
        ['Cut accuracy', 'Snaps to the nearest keyframe'],
        ['Typical keyframe spacing', 'Every one to ten seconds'],
        ['Maximum input', '200 MB'],
        ['Output', 'MP4']
      ]
    },
    steps: [
      'Drop the video in.',
      'Set the <strong>start</strong> and <strong>end</strong> in seconds.',
      'Trim and download.'
    ],
    tip: 'Trim before compressing, always. File size is bitrate multiplied by duration, so removing four seconds of dead air at each end takes that share off the file at full quality — no encoder can match a saving that costs nothing. On a Discord clip it is often the whole gap between 12 MB and 9 MB.',
    faqs: [
      { q: 'My cut is a second off from where I set it.', a: 'Cuts snap to the nearest keyframe, because cutting between them would require re-encoding and lose the speed and quality advantage. Keyframes are typically one to ten seconds apart, so set your start slightly early if the exact frame matters.' },
      { q: 'Does trimming reduce quality?', a: 'No. The streams are copied rather than re-encoded, so what you keep is bit-for-bit identical to the original. It is the only video operation here that is genuinely lossless.' },
      { q: 'Why is it so much faster than compressing?', a: 'Because nothing is decoded or re-encoded — it copies the bytes you asked for and writes a new container. Compression has to process every frame; trimming does not.' },
      { q: 'Can I cut a section out of the middle?', a: 'Not in one pass. Trim the part before and the part after separately, then join them with a video joiner. This tool keeps one continuous section.' }
    ],
    related: ['compress-for-discord', 'convert-video', 'video-to-gif', 'resize-video', 'mute-video', 'extract-audio']
  },

  'video-to-gif': {
    intro: 'GIF is a thirty-year-old format with a 256-colour palette and no real compression, which is why a five-second clip can outweigh the video it came from. Knowing that shapes every setting here.',
    what: [
      'Converts a section of video to an animated GIF at a frame rate and width you choose, generating a colour palette from the clip itself for better results.',
      'Length is capped at 15 seconds deliberately. Beyond that, GIF file sizes stop being reasonable and an MP4 is both smaller and better looking — which is what most platforms silently convert your GIF into anyway.'
    ],
    specs: {
      caption: 'Settings and what they cost',
      rows: [
        ['Length', '0.5–15 seconds'],
        ['Frame rate', '10 (smaller), 12 (default), or 15 (smoother)'],
        ['Width', '320, 480 (default) or 640 px'],
        ['Colours', '256 maximum — a hard limit of the format'],
        ['Compression', 'Lossless per frame, which is why files are large'],
        ['Biggest size lever', 'Length, then width, then frame rate'],
        ['Maximum input', '200 MB']
      ]
    },
    steps: [
      'Drop the video in and set the <strong>start</strong>.',
      'Keep <strong>length</strong> short — two to four seconds is the sweet spot.',
      'Choose <strong>width</strong> 480 unless it needs to be sharper.',
      'Set <strong>frames per second</strong>. 12 looks fine for most motion; 10 is noticeably smaller.'
    ],
    tip: 'If the result is too large, cut the length before touching anything else. Size scales directly with duration, and one second removed saves more than dropping from 15 fps to 10. Reducing width helps second, because pixel count scales with the square.',
    faqs: [
      { q: 'Why is my GIF bigger than the video?', a: 'Because GIF stores each frame with lossless compression and no motion prediction, while MP4 stores only what changed between frames. For anything longer than a few seconds a video will be dramatically smaller — the format is simply not built for this.' },
      { q: 'The colours look banded or dirty.', a: 'GIF allows only 256 colours per image. Gradients, skies and skin tones suffer most. A palette is generated from your clip to make the best of it, but the limit is in the format and cannot be worked around.' },
      { q: 'Why is the length capped at 15 seconds?', a: 'Past that the files become unreasonable for what they are. Most platforms convert uploaded GIFs to video anyway, so a long GIF costs you size and quality for no benefit.' },
      { q: 'Should I use a GIF at all?', a: 'For a two-second reaction, yes — it autoplays and loops everywhere. For anything longer, an MP4 is smaller and looks better, and every major platform will accept one.' }
    ],
    related: ['trim-video', 'compress-for-discord', 'convert-video', 'resize-video', 'frame-grabber', 'mute-video']
  },

  'convert-video': {
    intro: 'MOV from a phone, MKV from a download, AVI from something older than the phone — and a target that only accepts MP4. Conversion is usually about compatibility rather than quality.',
    what: [
      'Converts almost any video container to MP4 with H.264 video and AAC audio, at a frame rate you choose.',
      'The output is constant frame rate, which matters more than it sounds. Screen recordings and phone captures are often variable frame rate, and that is the single most common reason audio drifts out of sync after importing into an editor.'
    ],
    specs: {
      caption: 'Input, output and settings',
      rows: [
        ['Accepts', 'MP4, MOV, MKV, AVI, WebM and other common containers'],
        ['Output', 'MP4 — H.264 video, AAC audio'],
        ['Frame rate', '24 fps (film), 30 fps (default), 60 fps (smooth)'],
        ['Frame timing', 'Constant, so it stays in sync in every editor'],
        ['Compatibility', 'H.264 MP4 plays on virtually every device and platform'],
        ['Maximum input', '200 MB'],
        ['Maximum length', '30 minutes']
      ]
    },
    steps: [
      'Drop the video in — the format does not need to be MP4.',
      'Pick a <strong>frame rate</strong>. Match the source where you can: 30 for most phone footage, 60 for gameplay, 24 if it came from film.',
      'Convert and download.'
    ],
    tip: 'If footage has ever drifted out of sync in an editor, variable frame rate was almost certainly the cause. Screen recorders and phones produce it routinely, editors assume constant, and the gap accumulates over minutes. Converting first fixes it before it becomes a problem you have to diagnose.',
    faqs: [
      { q: 'Why convert to MP4 specifically?', a: 'Because H.264 in an MP4 container is the closest thing to universal — phones, browsers, editors, TVs and social platforms all accept it. MKV and AVI are perfectly good containers that a great deal of software still refuses.' },
      { q: 'Will converting reduce quality?', a: 'Slightly — it is a re-encode, so it is not lossless. At the default settings the loss is not visible in normal viewing, but convert from your original rather than from an already-converted copy.' },
      { q: 'Which frame rate should I choose?', a: 'Match the source. Converting 30 fps footage to 60 does not add smoothness, it duplicates frames and grows the file. Going from 60 to 30 halves the frames and is a reasonable size saving if you do not need the motion.' },
      { q: 'My file is over 200 MB.', a: 'Trim it first — that is lossless and usually what you wanted anyway. The limit exists because the whole file is held in memory in your browser, and above it the conversion fails partway through rather than completing badly.' }
    ],
    related: ['compress-for-discord', 'trim-video', 'resize-video', 'video-to-gif', 'extract-audio', 'mute-video']
  }
};

module.exports.LIMITS = LIMITS;
