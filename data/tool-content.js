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
  }
};

module.exports.LIMITS = LIMITS;
