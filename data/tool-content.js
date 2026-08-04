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
  videoInputGB: 2,          // tools-videofx.js LIMIT (WORKERFS-mounted input)
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
  'compress-video': {
    intro: 'Phones record at bitrates built for editing, not for sending — which is why a two-minute clip off a modern handset can land somewhere north of 300 MB and bounce off every upload box you try it in. Compressing it is mostly a matter of re-encoding at a sane bitrate, and the video looks near enough identical afterwards. This does that in the browser, on your own machine.',
    what: [
      'Two ways to ask for it. A <strong>quality level</strong> — Light, Balanced or Strong — just makes the file smaller with no target in mind, which is what most people want. Or a <strong>size target</strong>, when something has to clear a hard limit like a 25 MB email attachment.',
      'Quality levels encode at a constant rate factor, so the bitrate rises and falls with how demanding the footage is: a static screen recording is not charged for motion it does not have, and a hand-held shot is not starved. Size targets work backwards from the number instead, computing the one bitrate that lands inside it.',
      'Either way the output is capped below the source’s own bitrate, so compressing never returns a bigger file than it was given. If you pick a size target the file is already under, it is handed straight back untouched rather than being re-encoded for nothing.'
    ],
    specs: {
      caption: 'Levels, targets and limits',
      rows: [
        ['Light', 'CRF 23, capped at 80% of the source bitrate'],
        ['Balanced (default)', 'CRF 27, capped at 55%'],
        ['Strong', 'CRF 31, capped at 35%, frame capped at 720p'],
        ['Size targets', '10, 25, 50, 100 or 500 MB'],
        ['Audio options', '96, 128 (default) or 192 kbps, never above the source'],
        ['Encoding', 'Balanced, or Faster (about 1.4× quicker, slightly softer)'],
        ['Maximum input', LIMITS.videoInputGB + ' GB'],
        ['Maximum length', LIMITS.videoMaxMinutes + ' minutes'],
        ['Input formats', 'MP4, MOV, MKV, AVI, WebM and most others'],
        ['Output', 'MP4 (H.264 + AAC), constant frame rate']
      ]
    },
    steps: [
      'Drop the video in. Nothing is uploaded — the file is read straight off your disk by the encoder running in the page.',
      'Pick a <strong>Compression</strong> level. Balanced is the sensible default; choose a Fit option instead if you have a specific limit to clear.',
      'Set <strong>Audio quality</strong> if you care. 128 kbps is fine for speech and most music; 96 buys back a little room on a tight target.',
      'Choose <strong>Encoding</strong> — Balanced, or Faster if the wait matters more than the last few percent of sharpness.'
    ],
    tip: 'Trim before you compress. File size is bitrate times duration, so cutting ten seconds of dead air off the front removes that share of the file at full quality rather than smearing the rest to pay for it. On a clip that is close to a limit it is often the whole gap.',
    faqs: [
      { q: 'How much smaller will my file get?', a: 'It depends far more on the source than on the setting. Footage straight off a phone or a camera is usually encoded very generously and routinely drops by 70–90% at Balanced with no visible difference. Something already compressed once — a download, a clip that has been through a messaging app — has much less slack, and may only give up a third. The result screen shows the actual percentage rather than a promise.' },
      { q: 'Which level should I pick?', a: 'Balanced unless you have a reason. Light is for footage you intend to edit or archive, where you want the file smaller but nothing thrown away. Strong is for when small matters more than sharp — it also caps the frame at 720p, because at that bitrate a smaller frame genuinely looks better than a large one starved of data, and it encodes considerably faster.' },
      { q: 'Can it make my file bigger?', a: 'No. Every level carries a hard ceiling set as a fraction of the source’s own bitrate, and the audio track is never re-encoded above the rate it already had. Both exist because an earlier version could inflate an efficiently-encoded clip by a few percent while claiming to compress it.' },
      { q: 'Why did the resolution change?', a: 'Either you chose Strong, which caps the frame at 720p, or the bitrate needed to hit a size target could not carry the original frame size. Spreading the available bits over fewer pixels looks better than the alternative and finishes sooner. The result stats always show the resolution actually used.' },
      { q: 'Why is it slow?', a: 'The encode runs on your own processor rather than a server, so a long or high-resolution clip takes real time — this is the trade for the file never leaving your machine. The progress bar shows a live percentage and a time estimate that adapts to your hardware. Choosing Faster trades a little sharpness for about 1.4× the speed.' },
      { q: 'Is there a size limit?', a: 'Files up to ' + LIMITS.videoInputGB + ' GB are accepted, because the encoder reads the video off disk rather than copying it into memory first. The binding limits in practice are length and frame size: clips over ' + LIMITS.videoMaxMinutes + ' minutes or above 4K are refused, because in-browser encoding at that scale takes longer than anyone will wait. Split a long recording with the trimmer and compress the pieces.' }
    ],
    related: ['trim-video', 'resize-video', 'convert-video', 'mute-video', 'video-to-gif', 'compress-image']
  }
,

  /* ================= batch 7 — VIDEO cluster (complete) =================
   * Written to destroy a duplicate cluster, not merely to lengthen pages.
   * Measured 3 Aug 2026: these seven shared 90%+ of their vocabulary with one
   * another — 21 near-identical pairs. Half a cluster is not worth writing,
   * because the pages left behind still twin with each other.
   *
   * The differentiator here is real and technical: mute and loop are STREAM
   * COPIES (-c copy) so they finish in seconds and lose nothing; volume copies
   * the video and touches only audio; resize and reframe re-encode. Every page
   * below leads with its own mechanism, read out of videoengine.js. */

  'mute-video': {
    intro: 'Silencing a clip usually means opening an editor, waiting for it to import, muting a track and exporting — several minutes of work and a full re-encode that costs quality. Removing an audio track needs neither. The video data is already correct; the audio simply stops being copied across.',
    what: [
      'Strips the audio track and copies the video through untouched. The exact command is <code>-c copy -an</code>: no decoding, no re-encoding, no quality loss whatsoever. The picture in the output is bit-for-bit the picture you put in.',
      'Because nothing is re-encoded it finishes in seconds even on a long clip, and the file gets slightly <em>smaller</em> — you removed a track and added nothing.',
      'Three situations account for most muting. A background soundtrack that would earn an automated copyright claim on YouTube or Instagram. A recording that accidentally captured a conversation, a doorbell, a name — removing the track is the only way to be certain that audio is gone, since lowering the volume leaves it recoverable. And footage destined for an edit where a voiceover or licensed track will be laid over the top anyway, in which case the original sound is dead weight.'
    ],
    specs: {
      caption: 'How it works',
      rows: [
        ['Method', 'Stream copy (<code>-c copy -an</code>) — no re-encode'],
        ['Video quality', 'Identical to source, bit for bit'],
        ['Speed', 'Seconds, regardless of clip length'],
        ['Output', 'MP4, same resolution and frame rate as the source'],
        ['Maximum input', LIMITS.videoInputGB + ' GB'],
        ['Maximum length', LIMITS.videoMaxMinutes + ' minutes'],
        ['Privacy', 'Runs in your browser — the file is never uploaded']
      ]
    },
    steps: [
      'Drop in the video. MP4, MOV, MKV, AVI and WebM all work.',
      'Press Mute. There are no settings — there is only one way to remove a track.',
      'Download. The result plays exactly as before, without sound.'
    ],
    tip: 'This is the right tool before posting gameplay or a screen recording where background music would trigger a copyright claim. Because it is a stream copy, muting first and compressing afterwards costs you nothing — the quality loss only happens at the compression step, and it happens once.',
    faqs: [
      { q: 'Does muting reduce the quality?', a: 'No, and that is the point. The video track is copied rather than re-encoded, so the output is mathematically identical to the input. Anything that re-encodes to mute — most desktop editors, by default — throws away quality for no reason.' },
      { q: 'Why is it so much faster than the other video tools?', a: 'Nothing is decoded. Compressing or resizing has to decode every frame, process it and encode it again, which is why those take minutes. Removing a track only requires rewriting the container, so the work is proportional to file size rather than to frame count.' },
      { q: 'Can I lower the volume instead of removing it?', a: 'Use the Volume Adjuster, which keeps the track and scales it. Note that it must re-encode the audio to do so, though it still copies the video through untouched.' },
      { q: 'Can I get the audio back afterwards?', a: 'Not from the muted file — the track is genuinely removed rather than silenced, so there is nothing left to recover. That is deliberate, and it is why this is the right tool when the point is that nobody should be able to hear what was recorded. Keep your original, or run Extract Audio first to save the soundtrack separately before muting.' },
      { q: 'Which formats can I mute?', a: 'MP4, MOV, MKV, AVI and WebM all work. Because the streams are copied rather than converted, the video comes out in the same codec it went in as — muting an H.265 recording gives you an H.265 file, not a re-encoded H.264 one.' }
    ],
    related: ['extract-audio', 'adjust-volume', 'compress-video', 'trim-video', 'convert-video', 'resize-video']
  },

  'extract-audio': {
    intro: 'The audio inside a video file is already a complete, finished recording — an interview, a lecture, a song, a podcast take. Pulling it out is not a conversion so much as a separation, and it does not require the video to be decoded at all.',
    what: [
      'Discards the video stream and writes the audio to its own file. <strong>MP3</strong> uses LAME at quality level 2, a variable bitrate that averages roughly 190 kbps — transparent for speech and close to it for music, at about a tenth of the size of the lossless option.',
      '<strong>WAV</strong> writes uncompressed 16-bit PCM. Nothing is thrown away, which matters if the audio is going into an editor for further work, but the file is large: roughly 10 MB per minute of stereo.'
    ],
    specs: {
      caption: 'Formats and settings',
      rows: [
        ['MP3', 'LAME VBR, quality 2 (~190 kbps average)'],
        ['WAV', '16-bit PCM, uncompressed'],
        ['Rough size, MP3', 'About 1.4 MB per minute'],
        ['Rough size, WAV', 'About 10 MB per minute, stereo'],
        ['Video handling', 'Discarded (<code>-vn</code>) — never decoded'],
        ['Maximum input', LIMITS.videoInputGB + ' GB'],
        ['Maximum length', LIMITS.videoMaxMinutes + ' minutes']
      ]
    },
    steps: [
      'Drop the video in.',
      'Choose <strong>MP3</strong> for listening, sharing or transcription; <strong>WAV</strong> if the audio is going into an editor.',
      'Extract, then download.'
    ],
    tip: 'Choose WAV whenever the audio has more work ahead of it — noise reduction, levelling, mixing. Every MP3 encode is lossy, so editing an MP3 and re-saving it applies that loss twice. If the file is only ever going to be listened to, MP3 is the sensible default and a tenth of the size.',
    faqs: [
      { q: 'Which should I pick, MP3 or WAV?', a: 'MP3 for anything you will listen to, upload or send — at quality 2 most people cannot distinguish it from the source. WAV if it is going into audio software, because further editing compounds the loss from a lossy format.' },
      { q: 'Is the MP3 a fixed bitrate?', a: 'No. It uses variable bitrate at quality level 2, which spends more data on complex passages and less on quiet ones. That gives better quality per megabyte than a fixed rate, so the average lands near 190 kbps rather than being pinned there.' },
      { q: 'Can this be better than the original audio?', a: 'No, and nothing can. If the video already contained a heavily compressed 64 kbps track, extracting it to WAV produces a large file that sounds exactly like a 64 kbps track. Extraction preserves; it cannot restore.' },
      { q: 'Why is this fast when compressing a video is slow?', a: 'The video is never decoded — it is discarded with a single flag. Only the audio is processed, and audio is a fraction of the data in a video file.' }
    ],
    related: ['mute-video', 'adjust-volume', 'trim-video', 'convert-video', 'compress-video', 'video-to-gif']
  },

  'frame-grabber': {
    intro: 'A thumbnail is usually already somewhere inside your video — the frame where the subject looks right, the moment before the cut. Taking a still out of it needs no encoder at all: the browser can already decode video, so it decodes one frame and paints it to a canvas.',
    what: [
      'Seeks to the second you specify, draws that frame to a canvas and saves it as a <strong>PNG</strong>. This is the only video tool here that does not use ffmpeg — it uses the browser’s own decoder, so it runs instantly and downloads nothing.',
      'PNG rather than JPEG on purpose: the frame is going to be a thumbnail, and a thumbnail is usually edited afterwards. Starting from a lossless still means text and edges stay sharp through whatever you do next.'
    ],
    specs: {
      caption: 'What it produces',
      rows: [
        ['Output format', 'PNG, lossless'],
        ['Resolution', 'The video’s native frame size'],
        ['Time control', 'Seconds, in 0.1 s steps'],
        ['Engine', 'Browser decoder + canvas — no ffmpeg download'],
        ['Speed', 'Instant'],
        ['Codec support', 'Whatever your browser can play — MP4/H.264 is safest'],
        ['Privacy', 'The file never leaves your device']
      ]
    },
    steps: [
      'Add the video.',
      'Set <strong>Time</strong> to the moment you want, in seconds. Decimals work, so 12.4 is a valid answer.',
      'Grab the frame, check the preview, and adjust the time if you were slightly early or late.',
      'Download the PNG.'
    ],
    tip: 'Motion blur is what usually ruins a grabbed thumbnail. Try a few tenths either side of your first guess — during fast movement, 0.2 s can be the difference between a sharp face and a smear. The preview shows you the result before you commit.',
    faqs: [
      { q: 'Why does my video not load here when the other tools accept it?', a: 'This tool uses your browser’s decoder rather than ffmpeg, so it is limited to formats the browser can play. MKV and some MOV files are decoded by ffmpeg but not by browsers. Run it through the Video Converter to MP4 first and it will work.' },
      { q: 'Can I get JPEG instead?', a: 'The output is PNG so nothing is lost at this stage. If you need JPEG, convert afterwards with the Image Converter — that way any compression happens once, after your edits, rather than before them.' },
      { q: 'How exact is the time?', a: 'It seeks to the nearest available frame, so at 30 fps you land within about a thirtieth of a second. Precise seeking also depends on keyframes, so on a heavily compressed clip the actual frame can be marginally off your requested time.' },
      { q: 'Why is this instant when other video tools take minutes?', a: 'It decodes one frame. The others decode, process and re-encode every frame in the clip — thousands of them.' }
    ],
    related: ['thumbnail-maker', 'video-to-gif', 'trim-video', 'compress-image', 'resize-image', 'compress-video']
  },

  'loop-video': {
    intro: 'Looping a short clip — a logo sting, a background plate, a two-second reaction — normally means pasting it end to end in an editor and exporting the whole thing. There is a much cheaper way: write the same encoded stream out several times in a row. No re-encoding, no generation loss.',
    what: [
      'Repeats the clip end to end for the number of plays you choose, using <code>-stream_loop</code> with <code>-c copy</code>. The video is never decoded, so a three-times loop of a 10-second clip takes about as long as copying the file.',
      'Output length and size scale linearly and predictably: three plays is three times the duration and very close to three times the bytes.'
    ],
    specs: {
      caption: 'Limits and behaviour',
      rows: [
        ['Total plays', '2 to 20'],
        ['Method', 'Stream copy (<code>-stream_loop</code>) — no re-encode'],
        ['Quality', 'Identical to source on every repetition'],
        ['Output duration', 'Source length × plays'],
        ['Output size', 'Roughly source size × plays'],
        ['Maximum input', LIMITS.videoInputGB + ' GB'],
        ['Maximum length', LIMITS.videoMaxMinutes + ' minutes for the SOURCE clip']
      ]
    },
    steps: [
      'Add the clip you want repeated.',
      'Set <strong>Total plays</strong> — this is the finished count, so 3 means the clip appears three times, not that it repeats three extra times.',
      'Loop, then download.'
    ],
    tip: 'Loops read as seamless only when the last frame flows into the first. Trim the clip so it starts and ends at the same point in the motion before looping — a quarter of a second of dead air at the end becomes a visible stutter every time round.',
    faqs: [
      { q: 'Does looping degrade the quality each time?', a: 'No. The same encoded data is written repeatedly rather than being decoded and re-encoded, so the twentieth repetition is identical to the first. Doing this in an editor typically re-encodes everything and loses a little quality across the whole file.' },
      { q: 'Does "Total plays: 3" give me three or four copies?', a: 'Three. The number is the finished count rather than the number of extra repeats, which is the opposite of how ffmpeg counts internally — <code>-stream_loop</code> takes the number of ADDITIONAL loops, so three plays is passed as two. The tool does that subtraction for you, because "how many times will this appear" is the question people actually have.' },
      { q: 'Why cap it at 20?', a: 'Because size scales with it. A 40 MB clip looped twenty times is 800 MB, which is awkward to handle in a browser tab and awkward to upload anywhere. If you need more, loop the looped file.' },
      { q: 'Will the audio loop too?', a: 'Yes — the whole stream repeats, video and audio together, and they stay in sync because neither is re-timed.' }
    ],
    related: ['trim-video', 'video-to-gif', 'compress-video', 'mute-video', 'convert-video', 'resize-video']
  },

  'resize-video': {
    intro: 'A 4K recording of a screen share is mostly wasted data — the detail is not there to preserve, but the pixel count still has to be stored, uploaded and decoded by whoever watches it. Dropping the frame size is often a bigger, safer saving than squeezing the bitrate.',
    what: [
      'Scales the video to a target height and works the width out from the source aspect ratio, so nothing is stretched or cropped. Scaling uses <strong>lanczos</strong>, which is slower per frame than the alternatives and noticeably sharper on text and fine detail — the right trade when someone chose to downscale deliberately.',
      'The width is always forced even, because H.264 requires it. A 1440×1080 source scaled to 720p becomes 960×720, not 959×720.'
    ],
    specs: {
      caption: 'Resolutions and method',
      rows: [
        ['1080p', 'Full HD, 1920 wide at 16:9'],
        ['720p (default)', 'HD, 1280 wide at 16:9'],
        ['480p', 'SD, 854 wide at 16:9'],
        ['360p', 'Small, 640 wide at 16:9'],
        ['Scaler', 'Lanczos — sharper than bilinear on text'],
        ['Aspect ratio', 'Preserved; width derived and forced even'],
        ['Output', 'MP4 (H.264 + AAC)'],
        ['Maximum input', LIMITS.videoInputGB + ' GB']
      ]
    },
    steps: [
      'Drop the video in.',
      'Pick a <strong>Resolution</strong>. 720p is the sensible default for anything being watched rather than archived.',
      'Resize, then download.'
    ],
    tip: 'Resize before compressing, not after. File size scales with pixel count, so halving the height quarters the pixels — a 1080p to 540p change removes about 75% of the data before the encoder makes a single quality decision. Then compress the smaller file if it still needs to be smaller.',
    faqs: [
      { q: 'Should I resize or compress?', a: 'Resize when the frame is bigger than anyone needs — a 4K screen recording watched on a phone. Compress when the resolution is right but the bitrate is generous. Doing both, in that order, gives the smallest file for a given visual quality.' },
      { q: 'Can I make a video larger?', a: 'You can select a height above the source, but do not — upscaling invents pixels from nothing, producing a bigger file that looks softer than the original. The tool will not stop you; physics will.' },
      { q: 'What happens to a vertical or square video?', a: 'The height you choose is applied and the width follows from the source ratio, so a 1080×1920 vertical clip set to 720 becomes 405×720. To change the shape rather than the size, use the Vertical Reframe tool.' },
      { q: 'Why lanczos rather than something faster?', a: 'Because downscaling is where sharpness is won or lost. Lanczos preserves edge detail that bilinear softens, and it matters most on exactly the content people downscale — screen recordings, slides, anything with text.' }
    ],
    related: ['compress-video', 'vertical-reframe', 'convert-video', 'trim-video', 'video-to-gif', 'resize-image']
  },

  'adjust-volume': {
    intro: 'Quiet audio is the most common fixable problem in amateur video — a clip recorded across a room, or a phone that decided the scene was louder than it was. Scaling the volume is a small change to the audio track and needs no change to the picture at all.',
    what: [
      'Multiplies the audio by the percentage you choose and copies the video through untouched (<code>-c:v copy</code>). Only the sound is re-encoded, so the picture is bit-for-bit identical and the job runs far faster than a full re-encode.',
      'Boosting cannot add information that was never recorded. It raises the whole signal, so the hiss and room noise come up with the voice.'
    ],
    specs: {
      caption: 'Levels and behaviour',
      rows: [
        ['50%', 'About 6 dB quieter'],
        ['100%', 'Unchanged'],
        ['150% (default)', 'About 3.5 dB louder'],
        ['200%', 'About 6 dB louder'],
        ['300%', 'About 9.5 dB louder — clipping likely'],
        ['Video track', 'Copied, never re-encoded'],
        ['Audio codec', 'AAC'],
        ['Maximum input', LIMITS.videoInputGB + ' GB']
      ]
    },
    steps: [
      'Add the video.',
      'Choose a <strong>Volume</strong> percentage. Start at 150% and listen before reaching for more.',
      'Apply, download, and check the loudest moment rather than an average one.'
    ],
    tip: 'Judge a boost on the loudest part of the clip, never the quietest. Anything that exceeds the maximum level is clipped flat and turns to distortion, and clipping cannot be undone afterwards. If the quiet parts still need lifting at 200%, the recording needs compression in an audio editor rather than a bigger multiplier.',
    faqs: [
      { q: 'Why does 300% sound distorted?', a: 'Digital audio has a hard ceiling. Multiplying by three pushes anything above a third of maximum past it, and everything past it is flattened — that flattening is the crackle you hear. Lower percentages that stay under the ceiling sound clean.' },
      { q: 'Does this re-encode my video?', a: 'No. The video is stream-copied and only the audio track is re-encoded, so the picture is unchanged and the job is quick.' },
      { q: 'Can I make one part louder and leave the rest?', a: 'Not here — the multiplier applies to the whole clip. Trim the section you want, adjust it, and rejoin in an editor, or use audio software for a level ride.' },
      { q: 'Will lowering the volume hurt quality?', a: 'Almost never audibly. Reducing scales the signal down and re-encodes the result; the AAC encode is the only loss, and it is far smaller than the problem you were fixing.' }
    ],
    related: ['mute-video', 'extract-audio', 'compress-video', 'trim-video', 'convert-video', 'audio-converter']
  },

  'vertical-reframe': {
    intro: 'Shorts, TikTok and Reels want a tall frame, and almost everything is filmed wide. Simply squeezing a 16:9 video into 9:16 makes everyone look stretched; the honest fix is to take a tall slice out of the wide frame and accept that you lose the sides.',
    what: [
      'Centre-crops the source to the target shape, then scales the result — the filter is <code>crop</code> followed by <code>scale</code> with lanczos. Nothing is stretched: the aspect ratio of everything inside the frame is preserved exactly.',
      '<strong>The crop is from the centre, and it is not smart.</strong> There is no subject tracking here. If your subject sits to one side of the frame, they will be cut off, and no setting will change that.'
    ],
    specs: {
      caption: 'Target shapes',
      rows: [
        ['9:16 (default)', 'Shorts, TikTok, Reels, Stories'],
        ['1:1', 'Square — feed posts'],
        ['4:5', 'Portrait feed — the tallest most feeds allow'],
        ['Method', 'Centre crop, then lanczos scale'],
        ['Distortion', 'None — proportions preserved'],
        ['Audio', 'Copied unchanged'],
        ['Output', 'MP4 (H.264)'],
        ['Maximum input', LIMITS.videoInputGB + ' GB']
      ]
    },
    steps: [
      'Add a landscape clip.',
      'Choose the <strong>Target shape</strong> for wherever it is going.',
      'Reframe, then watch the result before posting — the centre crop is decided for you.'
    ],
    tip: 'Going from 16:9 to 9:16 keeps only about a third of the width. That is a severe cut, so it works on a talking head near the middle of frame and fails on a wide shot or a two-person interview. If the subject is off-centre, crop manually in an editor instead — this tool cannot follow them.',
    faqs: [
      { q: 'Will people look stretched?', a: 'No. The frame is cropped rather than squashed, so proportions are exactly as filmed. Stretching is what happens when software forces a wide frame into a tall one without cropping, and this deliberately does not do that.' },
      { q: 'Can it follow my subject?', a: 'No, and it is better to say so plainly than to imply otherwise. The crop is fixed at the centre for the whole clip. Subject-tracking reframes need a full editor.' },
      { q: 'How much of the picture do I lose?', a: 'Going 16:9 to 9:16 keeps roughly 32% of the width — the outer two-thirds are gone. 4:5 keeps about 56%, and 1:1 about 56% as well, so both are much gentler crops if the platform allows them.' },
      { q: 'Does the resolution drop?', a: 'The frame is cropped and then scaled to the target, so vertical detail is preserved and the pixel count falls with the narrower frame. Reframing from a 1080p source gives plenty of resolution for any vertical feed.' }
    ],
    related: ['resize-video', 'trim-video', 'compress-video', 'social-media-image', 'video-to-gif', 'thumbnail-maker']
  },

  /* ================= batch 7 — HEALTH cluster (complete) =================
   * The second duplicate cluster: seven pages sharing 90%+ of their vocabulary.
   *
   * YMYL, and written to the same standard as bmi-calculator. Every page states
   * the NAMED formula it uses and what that formula cannot see. These tools
   * compute; they do not advise. Where a number is commonly misread — body fat
   * from a tape measure, 220 minus age — the page says so plainly rather than
   * presenting an estimate as a measurement. Keep this framing on anything
   * added to this category later. */

  'bmr-calculator': {
    intro: 'Every calorie target starts from one number: what your body spends doing nothing at all. That figure is not measurable at home, but it is estimable — and the estimate is good enough to plan from, provided you know how wide the error bars are.',
    what: [
      'Calculates basal metabolic rate with the <strong>Mifflin-St Jeor</strong> equation: <code>10 × kg + 6.25 × cm − 5 × age</code>, then <code>+5</code> for men and <code>−161</code> for women. It replaced the older Harris-Benedict formula because it is more accurate for modern body compositions.',
      'Multiplies that by an activity factor to give total daily energy expenditure — the number you would actually eat to maintain weight.'
    ],
    specs: {
      caption: 'Formula and activity factors',
      rows: [
        ['Equation', 'Mifflin-St Jeor (1990)'],
        ['Sedentary', '× 1.2 — desk job, little exercise'],
        ['Light', '× 1.375 — 1–3 days a week'],
        ['Moderate (default)', '× 1.55 — 3–5 days a week'],
        ['Active', '× 1.725 — 6–7 days a week'],
        ['Very active', '× 1.9 — physical job or twice-daily training'],
        ['Units', 'Metric (kg, cm) or imperial (lb, in)'],
        ['Age range', '10 to 100']
      ]
    },
    steps: [
      'Choose units and enter age, sex, weight and height.',
      'Pick the <strong>activity level</strong> that matches a normal week, not a good one.',
      'Read BMR (at rest) and TDEE (with activity).'
    ],
    tip: 'Almost everyone overestimates their activity level, and it is the single biggest source of error here — the gap between "moderate" and "active" is around 270 calories a day for a 75 kg adult. Choose one level lower than feels right, then adjust after two weeks against what actually happens on the scale.',
    faqs: [
      { q: 'How accurate is this?', a: 'Mifflin-St Jeor lands within about 10% of measured BMR for most people, which is roughly 150–200 calories a day. It is derived from population averages, so it cannot see your particular muscle mass, thyroid function or genetics. Treat it as a starting point to be corrected by observation.' },
      { q: 'Why does it ask my sex?', a: 'The equation carries a constant that differs by sex — +5 for men, −161 for women — reflecting average differences in lean mass. It is a population average and will fit some individuals poorly.' },
      { q: 'What is the difference between BMR and TDEE?', a: 'BMR is what you would burn lying still all day — breathing, circulation, keeping warm. TDEE is BMR multiplied by your activity factor, and it is the number that matters for eating to maintain, gain or lose.' },
      { q: 'Should I eat my BMR to lose weight?', a: 'This tool cannot answer that and neither should any calculator. Eating at or below BMR is aggressive and, sustained, is the kind of thing that needs professional supervision. Take an energy target to a dietitian or doctor, particularly if you have any medical condition.' }
    ],
    related: ['macro-calculator', 'bmi-calculator', 'ideal-weight-calculator', 'body-fat-calculator', 'water-intake-calculator', 'percentage-calculator']
  },

  'macro-calculator': {
    intro: 'A calorie target says how much to eat; it says nothing about what. Splitting those calories into carbohydrate, protein and fat is arithmetic — the useful part is that the three do not convert at the same rate, which is why the gram figures look so lopsided.',
    what: [
      'Divides a daily calorie figure into grams using the standard energy densities: <strong>4 calories per gram</strong> for carbohydrate and protein, <strong>9 per gram</strong> for fat. That difference is why a keto split with 65% of calories from fat still gives fewer fat grams than you might expect.',
      'Four presets, each stated as carbohydrate / protein / fat by percentage of calories.'
    ],
    specs: {
      caption: 'Splits, as % of calories',
      rows: [
        ['Balanced (default)', '50% carbs · 25% protein · 25% fat'],
        ['High protein', '40% · 40% · 20%'],
        ['Low carb', '25% · 40% · 35%'],
        ['Keto', '5% · 30% · 65%'],
        ['Carbohydrate', '4 cal per gram'],
        ['Protein', '4 cal per gram'],
        ['Fat', '9 cal per gram'],
        ['Calorie range', '800 to 6,000']
      ]
    },
    steps: [
      'Enter your daily calorie target — the BMR Calculator produces one if you do not have it.',
      'Choose a <strong>split</strong>.',
      'Read the grams. Those are the numbers to track, since food labels are in grams.'
    ],
    tip: 'Protein is the number worth hitting precisely; carbohydrate and fat can move around it considerably without much consequence. If you only track one figure, track that one — and note that the percentage splits here are of calories, not of grams, which is the most common way these numbers get misread.',
    faqs: [
      { q: 'Why does keto give so few fat grams for 65% of calories?', a: 'Because fat carries 9 calories per gram against 4 for the others. At 2,000 calories, 65% is 1,300 calories, which is about 144 g — while 5% carbohydrate is 100 calories but only 25 g. The percentages are of energy, not of weight.' },
      { q: 'Which split should I choose?', a: 'That depends on goals, medical history and what you can actually sustain, none of which a calculator can see. The presets are common conventions, not recommendations. A dietitian can tell you which suits you; this tool only does the arithmetic once you have decided.' },
      { q: 'Where does the calorie number come from?', a: 'You supply it. The BMR Calculator estimates a maintenance figure from your height, weight, age, sex and activity, which is the usual starting point.' },
      { q: 'Is keto safe?', a: 'That is a medical question, not a mathematical one. Very low carbohydrate diets interact with medication — diabetes drugs especially — and are not appropriate for everyone. Ask a clinician before starting one.' }
    ],
    related: ['bmr-calculator', 'bmi-calculator', 'water-intake-calculator', 'body-fat-calculator', 'percentage-calculator', 'unit-converter']
  },

  'body-fat-calculator': {
    intro: 'Weight alone cannot tell muscle from fat, which is why two people of identical height and weight can be in visibly different condition. A tape measure gets closer than a scale does — though it is still an estimate, and a fairly rough one.',
    what: [
      'Uses the <strong>US Navy circumference method</strong>, which estimates body fat from neck, waist and height (plus hip for women) via a logarithmic formula. For men: <code>495 / (1.0324 − 0.19077·log₁₀(waist − neck) + 0.15456·log₁₀(height)) − 450</code>.',
      'Requires only a tape measure, which is why it is used where calipers or scanners are impractical. It infers fat distribution from a few circumferences rather than measuring anything directly.'
    ],
    specs: {
      caption: 'Method and measurements',
      rows: [
        ['Method', 'US Navy circumference (Hodgdon-Beckett)'],
        ['Men need', 'Height, neck, waist'],
        ['Women need', 'Height, neck, waist, hip'],
        ['Units', 'Centimetres'],
        ['Typical accuracy', '±3–4 percentage points vs DEXA'],
        ['Neck measured at', 'Just below the larynx'],
        ['Waist measured at', 'Navel, relaxed — not held in'],
        ['Hip measured at', 'The widest point']
      ]
    },
    steps: [
      'Measure with a soft tape, snug but not compressing the skin.',
      'Take the waist at the navel while breathing out normally — do not hold it in.',
      'Enter the measurements and read the estimate.'
    ],
    tip: 'Measurement error dominates this result. A centimetre of difference at the waist can move the answer by more than a percentage point, so measure three times and use the middle value — and always at the same time of day, since waist circumference varies noticeably between morning and evening.',
    faqs: [
      { q: 'How accurate is this really?', a: 'Within about 3–4 percentage points of a DEXA scan for most people, which is useful for tracking a trend and poor for a single verdict. It is least accurate at the extremes — very lean and very heavy bodies both tend to be misestimated.' },
      { q: 'Why does it need my neck?', a: 'The neck acts as a proxy for frame size, letting the formula separate build from fat. Without it, a naturally broad person and a heavier person of the same waist would score the same.' },
      { q: 'Why do women need a hip measurement?', a: 'Because typical fat distribution differs, and the female version of the formula uses waist plus hip minus neck to account for it. Using the male formula on a female body gives a meaningfully wrong answer.' },
      { q: 'It disagrees with my smart scale.', a: 'Both are estimates using entirely different assumptions — this one from circumferences, the scale from electrical impedance, which is sensitive to hydration and even to how recently you ate. Neither is ground truth. Pick one method and follow its trend rather than comparing across them.' }
    ],
    related: ['bmi-calculator', 'ideal-weight-calculator', 'bmr-calculator', 'macro-calculator', 'water-intake-calculator', 'percentage-calculator']
  },

  'ideal-weight-calculator': {
    intro: 'There is no single agreed formula for what a person should weigh — which tells you most of what you need to know about the concept. This shows three of the standard formulas side by side, precisely so the disagreement between them is visible.',
    what: [
      'Runs <strong>Devine</strong>, <strong>Robinson</strong> and <strong>Miller</strong>, all of which work from height above five feet. Devine, for example, is 50 kg plus 2.3 kg per inch over 60 for men, and 45.5 kg plus 2.3 for women.',
      'They routinely differ by several kilograms for the same person. That spread is the honest answer: these are clinical rules of thumb, originally built for drug dosing rather than for telling anybody what to weigh.'
    ],
    specs: {
      caption: 'The three formulas',
      rows: [
        ['Devine (1974)', 'Men 50 kg + 2.3/in over 60″; women 45.5 + 2.3'],
        ['Robinson (1983)', 'Men 52 kg + 1.9/in; women 49 + 1.7'],
        ['Miller (1983)', 'Men 56.2 kg + 1.41/in; women 53.1 + 1.36'],
        ['Baseline height', '60 inches (5 feet)'],
        ['Units', 'Metric (cm) or imperial (inches)'],
        ['Also shown', 'A healthy BMI range for your height'],
        ['Accounts for build?', 'No — height and sex only'],
        ['Accounts for muscle?', 'No']
      ]
    },
    steps: [
      'Choose units and enter height and sex.',
      'Compare all three results rather than picking the flattering one.',
      'Read the BMI range alongside them — a range is a more honest target than any single figure.'
    ],
    tip: 'Treat the spread between the three formulas as the real answer. If they give 70, 73 and 77 kg, the useful conclusion is "somewhere around the low seventies", not any one of those numbers. A healthy weight is a range, and these formulas were never designed to identify a personal target.',
    faqs: [
      { q: 'Why do the three disagree?', a: 'They were derived from different populations at different times and were built for clinical purposes such as drug dosing. None was validated as a personal weight target, so their disagreement is a fair reflection of how imprecise the underlying idea is.' },
      { q: 'Which one should I use?', a: 'None, on its own. Look at the range they span, and at the healthy BMI range shown alongside. If you want a target that accounts for your build, training and health history, that is a conversation with a clinician rather than a formula.' },
      { q: 'Why is there no input for frame size or muscle?', a: 'Because none of these formulas use one — they take height and sex and nothing else. That is their main limitation, and it is why a muscular athlete will be told to weigh substantially less than is appropriate.' },
      { q: 'Does this work for children?', a: 'No. All three assume an adult body. Children and teenagers are assessed against growth percentile charts by a paediatrician, and adult formulas do not apply.' }
    ],
    related: ['bmi-calculator', 'body-fat-calculator', 'bmr-calculator', 'macro-calculator', 'unit-converter', 'percentage-calculator']
  },

  'water-intake-calculator': {
    intro: 'The "eight glasses a day" rule is not from any study — it is a number that escaped into folklore. A slightly better estimate scales with body mass and adds for the two things that actually change requirement: sweating from exercise, and heat.',
    what: [
      'Starts from <strong>35 ml per kilogram</strong> of body weight, adds <strong>350 ml per 30 minutes</strong> of exercise, and adds a further <strong>500 ml</strong> in a hot climate. Results are shown in litres, millilitres, and as 250 ml glasses.',
      'Every one of those coefficients is a convention rather than a measured personal requirement — which is why the result is a starting estimate and not a prescription.'
    ],
    specs: {
      caption: 'How the estimate is built',
      rows: [
        ['Base', '35 ml per kg of body weight'],
        ['Exercise', '+350 ml per 30 minutes'],
        ['Hot climate', '+500 ml'],
        ['Glass size used', '250 ml'],
        ['Units', 'Metric (kg) or imperial (lb)'],
        ['Exercise range', '0 to 600 minutes a day'],
        ['Includes food?', 'No — food typically supplies 20–30% more'],
        ['Includes tea/coffee?', 'They count toward total fluid']
      ]
    },
    steps: [
      'Choose units and enter your weight.',
      'Add typical daily <strong>exercise minutes</strong> and pick your climate.',
      'Read the total, and treat it as a rough target rather than a quota.'
    ],
    tip: 'Thirst and urine colour are better guides than any formula — pale straw is about right. The calculation ignores water in food, which typically supplies another 20–30%, so someone eating a lot of fruit and vegetables genuinely needs less from the glass than this suggests.',
    faqs: [
      { q: 'Where does 35 ml per kg come from?', a: 'It is a widely used clinical rule of thumb for adult maintenance fluid, not a finding from a specific trial. Individual requirement varies with kidney function, medication, diet and activity, none of which this can see.' },
      { q: 'Do tea and coffee count?', a: 'Yes. The idea that caffeine dehydrates you at normal intakes has not held up — the fluid in a cup of coffee counts toward your total. Alcohol is genuinely different and increases fluid loss.' },
      { q: 'Can I drink too much water?', a: 'Yes, and it is dangerous. Drinking far beyond thirst over a short period can dilute blood sodium, a condition called hyponatremia, which is a medical emergency. This tool estimates a daily total to spread across the day, not a volume to consume quickly.' },
      { q: 'Should I follow this if I have a health condition?', a: 'No. Kidney disease, heart failure and several medications come with specific fluid instructions that override any general formula. Follow your clinician’s advice, not this.' }
    ],
    related: ['bmr-calculator', 'bmi-calculator', 'macro-calculator', 'unit-converter', 'body-fat-calculator', 'percentage-calculator']
  },

  'pace-calculator': {
    intro: 'Runners think in minutes per kilometre; race results are published in total time; treadmills are labelled in kilometres per hour. They are the same fact expressed three ways, and converting between them in your head mid-run is how people mis-pace a race.',
    what: [
      'Takes a distance and a finishing time and returns pace per unit, speed, and the equivalent pace in the other unit — so a 5:00/km runner immediately sees 8:03/mile.',
      'Also projects the same effort onto half marathon (21.0975 km) and marathon (42.195 km) distances, using the exact official figures rather than rounded ones.'
    ],
    specs: {
      caption: 'Inputs and outputs',
      rows: [
        ['Distance units', 'Kilometres or miles'],
        ['Time input', 'Hours, minutes, seconds'],
        ['Pace output', 'Minutes per km and per mile'],
        ['Speed output', 'km/h or mph'],
        ['Half marathon', '21.0975 km / 13.1094 mi'],
        ['Marathon', '42.195 km / 26.2188 mi'],
        ['Conversion factor', '1 mile = 1.609344 km, exact'],
        ['Minimum distance', '0.01']
      ]
    },
    steps: [
      'Enter the <strong>distance</strong> and choose km or miles.',
      'Enter the time as hours, minutes and seconds.',
      'Read pace, speed, and the equivalent in the other unit.'
    ],
    tip: 'The race projections assume you hold the same pace over a much longer distance, which almost nobody does. As a rough correction, expect roughly 5% slower per doubling of distance — a 25-minute 5K projects to about 52 minutes for 10K in the arithmetic, but 53–55 is the realistic range.',
    faqs: [
      { q: 'Why is my projected marathon time so optimistic?', a: 'Because it is pure arithmetic — your current pace multiplied by 42.195 km. It cannot model fatigue, fuelling or the wall. Established predictors like Riegel apply a fatigue exponent; treat the projection here as a ceiling on your best case.' },
      { q: 'How do I convert pace between km and miles?', a: 'Multiply a per-kilometre pace by 1.609344 to get per-mile. The tool shows both, which avoids the common error of converting the distance and forgetting to convert the pace.' },
      { q: 'What pace is a treadmill speed?', a: 'Divide 60 by the km/h figure to get minutes per km — 12 km/h is 5:00/km. The tool reports speed alongside pace so you can set a treadmill directly.' },
      { q: 'Are the race distances exact?', a: 'Yes. A marathon is 42.195 km and a half is 21.0975 km by definition. Rounding to 42 km would understate a finishing time by about half a minute at typical paces.' }
    ],
    related: ['heart-rate-calculator', 'unit-converter', 'bmr-calculator', 'distance-calculator', 'percentage-calculator', 'timezone-converter']
  },

  'heart-rate-calculator': {
    intro: 'Training zones are the difference between an easy run that builds fitness and one that quietly costs you recovery. Calculating them from resting heart rate is more informative than using percentages of maximum, because it accounts for the fitness you already have.',
    what: [
      'Estimates maximum heart rate as <code>220 − age</code>, then builds zones with the <strong>Karvonen method</strong>: zones are percentages of your heart rate <em>reserve</em> (maximum minus resting), added back to resting.',
      'That distinction matters. Two people with the same maximum but resting rates of 50 and 75 get genuinely different zone boundaries — which is correct, and which the simpler percentage-of-max approach misses entirely.'
    ],
    specs: {
      caption: 'Method and inputs',
      rows: [
        ['Maximum HR', '220 − age (estimate)'],
        ['Zone method', 'Karvonen — % of heart rate reserve'],
        ['Reserve', 'Maximum − resting'],
        ['Zone formula', '(reserve × %) + resting'],
        ['Age range', '5 to 120'],
        ['Resting HR range', '30 to 120 bpm'],
        ['Measure resting', 'On waking, before getting up'],
        ['Accuracy of 220 − age', '±10–12 bpm standard deviation']
      ]
    },
    steps: [
      'Enter your age.',
      'Enter <strong>resting heart rate</strong>, measured on waking before you get out of bed.',
      'Read the zones and note which one your easy sessions actually fall into.'
    ],
    tip: 'Measure resting heart rate across several mornings and average them — a single reading after a bad night or a late coffee can be 10 bpm off, and that error propagates into every zone. If your resting rate is unusually high or has changed a lot recently, that is worth mentioning to a doctor rather than working around.',
    faqs: [
      { q: 'How accurate is 220 minus age?', a: 'It is a rough population fit with a standard deviation around 10–12 bpm, meaning a 40-year-old whose true maximum is 165 or 195 is entirely normal. It is convenient rather than precise — a supervised test is the only way to know your own.' },
      { q: 'Why use resting heart rate at all?', a: 'Because the Karvonen method sets zones on the range you actually have available. A fit person with a resting rate of 45 has a much larger reserve than someone at 75, and their zones should differ even at the same age.' },
      { q: 'What if my resting rate is close to my estimated maximum?', a: 'Then the estimate does not fit you and the zones will be meaningless — the tool says so rather than printing numbers. Get measured zones from a clinician or coach.' },
      { q: 'Should I train by heart rate or by feel?', a: 'Both, and treat disagreement as information. Heart rate lags effort by a minute or two and drifts upward in heat, dehydration and fatigue, so a rate that seems high for an easy effort often means you need rest rather than a faster run.' }
    ],
    related: ['pace-calculator', 'bmr-calculator', 'bmi-calculator', 'water-intake-calculator', 'macro-calculator', 'unit-converter']
  },

  /* ============ batch 8 — PDF cluster, part 1 of 2 ============
   * 18 near-identical PDF pages, 153 duplicate pairs. Taken whole, per the
   * method note in CONTENT_QUEUE.md. Every figure below was read from
   * tools-pdfedit.js / tools-pdftools.js / tools-pdfconv.js. */

  'pdf-page-numbers': {
    intro: 'Page numbers are the difference between a document someone can discuss and a stack nobody can navigate. "See the third paragraph on page 14" only works if page 14 says so — and most exported PDFs, especially merged ones, carry no numbering at all.',
    what: [
      'Stamps a number onto every page in the corner you choose, drawn as real text into the PDF rather than as an image, so it stays crisp at any zoom and survives printing.',
      'The <strong>Start at</strong> control exists for documents with front matter. Set it to 0 and the first page is numbered 0, so a cover page can carry no visible number while page 1 falls on the first page of actual content.'
    ],
    specs: {
      caption: 'Controls',
      rows: [
        ['Positions', 'Bottom centre (default), bottom right, bottom left, top centre'],
        ['Start at', 'Any integer from 0 upward'],
        ['Font size', '6 to 40 pt, default 11'],
        ['Rendering', 'Real text, not a rasterised stamp'],
        ['Pages affected', 'All pages in the document'],
        ['Input', 'PDF'],
        ['Output', 'PDF with numbering applied'],
        ['Privacy', 'Processed in your browser — never uploaded']
      ]
    },
    steps: [
      'Add the PDF.',
      'Choose a <strong>position</strong>. Bottom centre is the safest for double-sided printing, since it does not swap sides between odd and even pages.',
      'Set <strong>Start at</strong> if the document opens with a cover or title page.',
      'Set the <strong>font size</strong> — 11 pt suits A4 and Letter; go smaller for a dense document.'
    ],
    tip: 'Number after merging, never before. Merge two documents that each carry their own numbering and you get a file that runs 1–8 then 1–12, which is worse than no numbers at all. Merge first, then stamp once across the finished document.',
    faqs: [
      { q: 'Can I skip the cover page?', a: 'Not by excluding it, but you can work around it: set Start at to 0, and the cover carries a 0 while the first content page reads 1. If the cover must show nothing at all, split it off, number the rest, then merge the cover back on.' },
      { q: 'Will the number cover my content?', a: 'It sits in the page margin, so on a normal document it will not. If your content runs into the margin — a full-bleed design or a scanned page with no white space — the number may overlap. Crop or add margin first.' },
      { q: 'Can I use "Page 3 of 20" instead of just a number?', a: 'Not here; the stamp is the number alone. That format needs a word processor or a full PDF editor, since it requires knowing the total on every page.' },
      { q: 'Do numbers restart if I merge afterwards?', a: 'No — they are burned into the pages as text, so merging afterwards leaves them exactly where they are and gives you two independently numbered sequences. Merge first.' }
    ],
    related: ['merge-pdf', 'split-pdf', 'pdf-watermark', 'crop-pdf', 'reorder-pdf', 'compress-pdf']
  },

  'pdf-watermark': {
    intro: 'A document marked DRAFT that circulates without the mark is how an unapproved figure ends up quoted back at you in a meeting. A watermark is not security — it is a label, applied across every page so that no single printed sheet can be mistaken for final.',
    what: [
      'Draws your text diagonally across every page at an opacity you control, beneath nothing and above everything, so it reads on screen and on paper without making the underlying text unreadable.',
      'Opacity is the whole craft here. Too faint and a photocopy loses it; too strong and the document becomes hard to actually read.'
    ],
    specs: {
      caption: 'Controls',
      rows: [
        ['Opacity', '5% to 60%, default 20%'],
        ['Font size', '12 to 120 pt, default 48'],
        ['Placement', 'Diagonal, centred, every page'],
        ['Text', 'Any short phrase you type'],
        ['Rendering', 'Real text drawn into the page'],
        ['Input', 'PDF'],
        ['Output', 'PDF with the mark applied to all pages'],
        ['Privacy', 'Processed in your browser — never uploaded']
      ]
    },
    steps: [
      'Add the PDF and type the text — DRAFT, CONFIDENTIAL, a client name, a date.',
      'Set <strong>opacity</strong>. 20% is legible on screen and survives photocopying.',
      'Set the <strong>font size</strong> so the phrase spans the page without running off it. Longer words need smaller type.'
    ],
    tip: 'Keep the phrase short. At 48 pt a diagonal watermark comfortably fits about eight to ten characters across an A4 page; "CONFIDENTIAL — DO NOT DISTRIBUTE" at that size runs off both edges. Either shorten the words or drop the size to around 24 pt.',
    faqs: [
      { q: 'Can the watermark be removed?', a: 'Yes, by anyone with a proper PDF editor — it is drawn as an object in the page, not fused into it. Treat it as a label that prevents honest mistakes, never as protection against someone who wants it gone.' },
      { q: 'What opacity should I use?', a: '20% is the sensible default and survives a photocopy. Drop to 10% if the document is text-dense and the mark is getting in the way; raise toward 40% if the file is going to be screenshotted, where faint marks disappear.' },
      { q: 'Can I watermark only some pages?', a: 'No — it applies to every page, which is usually what you want, since a partly-marked document is exactly the one that gets misread. To mark a subset, split the file, watermark that part, and merge back.' },
      { q: 'Will it cover my text?', a: 'It sits over the page at low opacity, so text stays readable underneath. If it feels heavy, reduce opacity before reducing size — a large faint mark reads better than a small dark one.' }
    ],
    related: ['pdf-page-numbers', 'protect-pdf', 'merge-pdf', 'pdf-redact', 'compress-pdf', 'split-pdf']
  },

  'pdf-redact': {
    intro: 'Drawing a black rectangle over a name in most PDF editors hides nothing — the text is still in the file, still selectable, still recoverable by anyone who copies and pastes. Redaction has to destroy the data, not cover it. This does, and the way it does that has consequences worth understanding before you use it.',
    what: [
      '<strong>The page is rendered to an image first, then your black boxes are painted onto that image.</strong> The original text objects are gone from the output entirely — there is nothing underneath to select, search or recover, because the output is pixels rather than text.',
      '<strong>It exports a PNG of the page, not a PDF.</strong> You work one page at a time and download that page as an image. That is a real limitation and worth knowing before you start: to redact a ten-page document you export ten PNGs, then rebuild them into a PDF.'
    ],
    specs: {
      caption: 'What it does and does not do',
      rows: [
        ['Method', 'Page rasterised, boxes painted onto the raster'],
        ['Is the text recoverable?', 'No — it is not present in the output'],
        ['Output format', '<strong>PNG, one page at a time</strong>'],
        ['To get a PDF back', 'Export pages, then use JPG to PDF'],
        ['Render scale', '1.3× the PDF page size'],
        ['Side effect', 'Remaining text stops being selectable or searchable'],
        ['Input', 'PDF'],
        ['Privacy', 'Processed in your browser — never uploaded']
      ]
    },
    steps: [
      'Add the PDF and move to the page you need.',
      'Drag rectangles over anything to be removed. Cover generously — near-misses at the edge of a character are still legible.',
      'Export the page as PNG.',
      'Repeat for each page, then rebuild a PDF with the JPG to PDF tool if you need one document.'
    ],
    tip: 'Check the exported PNG before you send it, and check it by trying to select text — there should be none, anywhere on the page. That is the test that distinguishes real redaction from a black rectangle, and it is the test that court filings and FOI releases have repeatedly failed in public.',
    faqs: [
      { q: 'Can someone recover what I covered?', a: 'No. The output is an image of the page with the boxes already painted into the pixels. There are no text objects behind them because there are no text objects at all — that is the point of rasterising first.' },
      { q: 'Why do I get a PNG instead of a redacted PDF?', a: 'Because the safe method produces an image, and the tool hands you that image directly rather than pretending otherwise. Run the exported pages through JPG to PDF to reassemble a document.' },
      { q: 'What is the downside of this approach?', a: 'The whole page becomes an image. The rest of the text is no longer selectable, searchable or reflowable, screen readers cannot read it, and the file is usually larger. That is the price of certainty, and for genuinely sensitive material it is worth paying.' },
      { q: 'Can I redact several pages at once?', a: 'Not currently — it is one page at a time. For a long document that is laborious, but redaction is one of the few operations where working page by page and checking each result is the responsible way to do it.' }
    ],
    related: ['metadata-remover', 'protect-pdf', 'jpg-to-pdf', 'pdf-watermark', 'split-pdf', 'screenshot-redactor']
  },

  'compare-pdf': {
    intro: 'Someone returns "the updated contract" and says a few things changed. Finding out which few, across forty pages, by reading both versions side by side, is an afternoon you do not have — and the paragraph you skim is the one that mattered.',
    what: [
      'Extracts the text from two PDFs and shows what differs between them, so you can see the changes rather than hunt for them.',
      'This is a <strong>text</strong> comparison. It finds wording changes reliably. It does not compare layout, images, fonts or formatting, so a document that has been restyled but not reworded will look unchanged here — which is correct, and occasionally not what you wanted.'
    ],
    specs: {
      caption: 'Scope',
      rows: [
        ['Compares', 'Extracted text of two PDFs'],
        ['Detects', 'Added, removed and altered wording'],
        ['Does not detect', 'Layout, image, font or colour changes'],
        ['Scanned PDFs', 'Not supported — run OCR first'],
        ['Files needed', 'Exactly two'],
        ['Privacy', 'Both files stay in your browser'],
        ['Output', 'A readable list of differences']
      ]
    },
    steps: [
      'Add the original as the first file and the revision as the second — the order decides what reads as an addition.',
      'Compare.',
      'Work through the differences, then confirm the important ones in the actual document.'
    ],
    tip: 'If the comparison shows every line as changed, the two files almost certainly extract text in a different order — common when one was exported from Word and the other printed from a browser. That is a formatting difference dressed up as a content one, and it means you need to read those sections manually.',
    faqs: [
      { q: 'Why does it say nothing changed when I can see it did?', a: 'Because the change was visual rather than textual — a new logo, different spacing, a colour. Text comparison sees the words only, and the words are the same.' },
      { q: 'Can I compare scanned documents?', a: 'Not directly. A scan is an image and contains no extractable text. Run both through PDF OCR first, then compare the results — accepting that OCR errors will show up as false differences.' },
      { q: 'Does it show me where on the page a change is?', a: 'It reports the differing text rather than a position. Search for the phrase in the original to find it, which is usually faster than a page reference anyway.' },
      { q: 'Are my documents uploaded?', a: 'No. Both files are read in your browser and neither leaves your device — which matters here, since the documents people most want to compare are contracts.' }
    ],
    related: ['pdf-to-text', 'pdf-ocr', 'text-diff', 'merge-pdf', 'split-pdf', 'extract-pdf-pages']
  },

  'crop-pdf': {
    intro: 'Scanners add margin, academic PDFs carry enormous white borders, and slides exported to PDF often sit in a sea of nothing. On a tablet or e-reader that wasted space is the difference between readable text and squinting, because the reader scales to the page rather than to the content.',
    what: [
      'Trims a fixed amount from each edge of every page, measured in <strong>points</strong> — the PDF unit, where 72 points is one inch. The default of 36 removes exactly half an inch.',
      'This changes the page boundary rather than deleting content: anything inside the trimmed area is cut off, so measure before committing.'
    ],
    specs: {
      caption: 'Trim controls',
      rows: [
        ['Unit', 'Points — 72 pt = 1 inch = 25.4 mm'],
        ['Default trim', '36 pt each side (½ inch)'],
        ['Range', '0 to 400 pt per edge'],
        ['Edges', 'Top, bottom, left and right, set independently'],
        ['Applies to', 'Every page'],
        ['A4 page is', '595 × 842 pt'],
        ['Letter page is', '612 × 792 pt'],
        ['Privacy', 'Processed in your browser — never uploaded']
      ]
    },
    steps: [
      'Add the PDF.',
      'Set each edge in points. Start at 36 and increase carefully.',
      'Crop, then check the first and last pages — headers and footers are what usually get lost.'
    ],
    tip: 'Trim the sides more than the top and bottom. Most documents have far more horizontal margin than vertical, and it is the top and bottom that carry page numbers, headers and footnotes — the things you most regret cutting. Try 60 pt left and right against 20 pt top and bottom before going further.',
    faqs: [
      { q: 'How do I convert points to millimetres?', a: '72 points is one inch, so one point is about 0.353 mm. A 36 pt trim removes 12.7 mm — half an inch — from that edge. The Unit Converter handles anything more awkward.' },
      { q: 'Does cropping make the file smaller?', a: 'Barely. Cropping changes the visible page boundary; the content is still in the file. If size is the goal, use Compress PDF, which actually reduces the data.' },
      { q: 'Can I crop different amounts on different pages?', a: 'No — the same trim applies throughout. For a document where the first page differs, split it off, crop the two parts separately, and merge them back.' },
      { q: 'Can I undo a crop?', a: 'Not from the cropped file, so keep your original. Cropping past your content is the common mistake; check a page with a header and a page with a footnote before you rely on the result.' }
    ],
    related: ['compress-pdf', 'split-pdf', 'merge-pdf', 'pdf-page-numbers', 'rotate-pdf', 'unit-converter']
  },

  'duplicate-pdf-pages': {
    intro: 'Printing a form that needs completing twenty times, padding a booklet so the signatures fall right, building a stack of identical tickets — all of them mean the same page appearing over and over, and all of them are miserable to do by hand.',
    what: [
      'Repeats the pages you name, the number of extra times you choose, keeping them in place rather than appending them to the end. Duplicating page 3 twice gives you pages 1, 2, 3, 3, 3, 4 — not 1, 2, 3, 4, 3, 3.',
      'Accepts <code>all</code>, single numbers, comma lists and ranges, so <code>2, 5-7</code> is a valid answer.'
    ],
    specs: {
      caption: 'Controls',
      rows: [
        ['Pages to duplicate', '<code>all</code>, or numbers and ranges like <code>2, 5-7</code>'],
        ['Extra copies of each', '1 to 20'],
        ['Placement', 'In sequence, immediately after the original'],
        ['Copies are', 'Identical — same text, images and form fields'],
        ['Total pages after', 'original + (selected × extra copies)'],
        ['Input', 'PDF'],
        ['Output', 'PDF'],
        ['Privacy', 'Processed in your browser — never uploaded']
      ]
    },
    steps: [
      'Add the PDF.',
      'Enter which pages to repeat, or leave <code>all</code>.',
      'Set <strong>extra copies</strong>. This is copies in addition to the original, so 1 gives you two of each page.'
    ],
    tip: 'Note that the count is <em>extra</em> copies, not total. Setting 20 on a single page gives 21 pages, not 20 — which is the difference between a tidy print run and one sheet of waste every time. If you need exactly twenty, ask for nineteen.',
    faqs: [
      { q: 'Does "extra copies: 1" give me one page or two?', a: 'Two — the original plus one copy. The wording is deliberate, because "copies" is ambiguous everywhere else and people get caught by it.' },
      { q: 'Where do the copies go?', a: 'Directly after the page they came from, so the document stays in a sensible order. If you want all the copies grouped at the end instead, extract the page, duplicate it, and merge it on.' },
      { q: 'Can I duplicate a form and fill each copy differently?', a: 'The copies are identical when created, including form fields. Whether the fields can then hold different values depends on how the original was built — many PDFs share a single value across fields with the same name.' },
      { q: 'What does the page range accept?', a: 'Single pages, comma-separated lists, and hyphenated ranges — <code>2, 5-7</code> means pages 2, 5, 6 and 7. <code>all</code> duplicates the whole document.' }
    ],
    related: ['extract-pdf-pages', 'delete-pdf-pages', 'reorder-pdf', 'merge-pdf', 'split-pdf', 'pdf-page-numbers']
  },

  /* ============ batch 8 — PDF cluster, part 2 of 2 ============ */

  'pdf-ocr': {
    intro: 'A scanned page looks like text and behaves like a photograph. You cannot search it, select from it, or paste a line into an email — because as far as the file is concerned there are no words on it, only pixels arranged suggestively.',
    what: [
      'Runs <strong>Tesseract</strong> optical character recognition in your browser, rendering each PDF page at <strong>2× scale</strong> first because recognition accuracy depends heavily on the resolution it is given.',
      'Six languages are available, and choosing the right one matters more than people expect — an English model reading French will mangle every accent.'
    ],
    specs: {
      caption: 'Engine and languages',
      rows: [
        ['Engine', 'Tesseract, running locally in your browser'],
        ['Languages', 'English, Spanish, French, German, Italian, Portuguese'],
        ['Render scale', '2× the PDF page size, for accuracy'],
        ['Accepts', 'PDF or image files'],
        ['Output', 'Plain text you can copy'],
        ['First run', 'Downloads the OCR engine, then works from cache'],
        ['Privacy', 'The file never leaves your device'],
        ['Handwriting', 'Not supported — printed text only']
      ]
    },
    steps: [
      'Add the scanned PDF or photograph.',
      'Choose the <strong>language</strong> of the document, not your own.',
      'Run it — the first run downloads the engine, which takes a moment.',
      'Copy the text out and proofread it. OCR is never perfect.'
    ],
    tip: 'Scan quality decides everything and no setting compensates for a bad source. A straight, well-lit 300 DPI scan reads almost perfectly; a phone photo taken at an angle in poor light will produce nonsense whatever you do. If the result is bad, rescan rather than retry — and straighten the page first.',
    faqs: [
      { q: 'Why is the text full of mistakes?', a: 'Almost always the source. OCR needs sharp, straight, well-lit text; skew, shadow, low resolution and JPEG artefacts each cost accuracy, and they compound. Unusual fonts and tables also read poorly because the layout confuses line detection.' },
      { q: 'Can it read handwriting?', a: 'No. Tesseract recognises printed characters, and handwriting recognition is a genuinely different problem. Even neat printing by hand will produce poor results.' },
      { q: 'Is my document uploaded to an OCR service?', a: 'No — this is unusual and worth stating. The engine is downloaded to your browser and runs there, so the scan never leaves your device. That matters for the things people most often scan: contracts, medical letters, ID documents.' },
      { q: 'Why is the first run slow?', a: 'It downloads the recognition engine and language data once. After that it is cached, and later runs start immediately.' }
    ],
    related: ['pdf-to-text', 'image-to-text', 'scan-to-pdf', 'compare-pdf', 'pdf-to-jpg', 'compress-pdf']
  },

  'scan-to-pdf': {
    intro: 'The scanner is broken, the office is closed, and someone needs a signed form in ten minutes. A phone camera is a perfectly good scanner for that job — the missing piece is turning a handful of photographs into one document that looks deliberate rather than improvised.',
    what: [
      'Captures pages with your device camera or accepts photos you already have, then assembles them into a single PDF in the order you added them.',
      'Everything happens on the device. Photographs of documents are exactly the kind of thing that should not be uploaded to a stranger’s server, and here they are not.'
    ],
    specs: {
      caption: 'Capture and output',
      rows: [
        ['Sources', 'Device camera, or existing photos'],
        ['Multiple pages', 'Yes — added in sequence'],
        ['Page order', 'The order you add them'],
        ['Output', 'A single PDF'],
        ['Auto edge detection', 'No — frame the page yourself'],
        ['Auto deskew', 'No'],
        ['Privacy', 'Photos never leave your device'],
        ['Best input', 'Flat page, even light, shot square on'],
      ]
    },
    steps: [
      'Lay the page flat in even light — daylight near a window is ideal, overhead light casts your own shadow.',
      'Shoot square on rather than at an angle, filling the frame with the page.',
      'Add each page in reading order.',
      'Build the PDF and check the page order before sending.'
    ],
    tip: 'Shadow is what makes a phone scan look like a phone scan. Do not lean over the page with a light behind you — your head becomes a grey band across the text. Sit to the side of the light, or lay the page near a window and shoot with the light coming across it.',
    faqs: [
      { q: 'Does it straighten crooked photos?', a: 'No — there is no automatic edge detection or deskew here, so framing is up to you. Take a moment to line the page up square in the viewfinder; it is faster than fixing it afterwards.' },
      { q: 'Can I add pages from my gallery instead of the camera?', a: 'Yes. Photos you already took work exactly the same way, and you can mix them with fresh captures in one document.' },
      { q: 'Will the text be searchable?', a: 'No. The pages are photographs, so the PDF contains images rather than text. Run the result through PDF OCR if you need to search or copy from it.' },
      { q: 'The file is very large. Why?', a: 'Modern phone cameras produce big images, and several of them in one PDF adds up quickly. Run it through Compress PDF before emailing — documents shot for legibility compress well.' }
    ],
    related: ['pdf-ocr', 'compress-pdf', 'jpg-to-pdf', 'merge-pdf', 'pdf-signature', 'rotate-pdf']
  },

  'pdf-signature': {
    intro: 'Printing a document to sign it, then scanning it back, degrades the file and wastes twenty minutes. Drawing the signature directly onto the page keeps the PDF crisp and takes about thirty seconds.',
    what: [
      'Lets you draw a signature with a mouse, trackpad or finger, then places it on the page you choose. Touch input gives a far better line than a mouse — a phone or tablet produces something that actually looks like your handwriting.',
      'The signature is drawn into the page. This is a <strong>visual</strong> signature, not a cryptographic one.'
    ],
    specs: {
      caption: 'What this is',
      rows: [
        ['Signature type', '<strong>Visual only</strong> — not a digital certificate'],
        ['Input', 'Mouse, trackpad or touch'],
        ['Placement', 'Choose the page number'],
        ['Best drawn on', 'A touchscreen'],
        ['Legally binding?', 'Depends entirely on jurisdiction and context'],
        ['Input file', 'PDF'],
        ['Output', 'PDF with the signature applied'],
        ['Privacy', 'Document and signature never leave your device']
      ]
    },
    steps: [
      'Add the PDF and pick the page to sign.',
      'Draw your signature. On a phone or tablet, use a finger — it is much better than a mouse.',
      'Place it, then check the position before downloading.'
    ],
    tip: 'Draw larger than you need. A signature drawn small and scaled up looks shaky and pixelated, while one drawn large and placed small looks smooth. If you sign documents regularly, draw it once on a touchscreen and keep the result — it will be better than anything you produce with a trackpad.',
    faqs: [
      { q: 'Is this legally binding?', a: 'It may be, and this tool cannot tell you. Many jurisdictions accept a drawn electronic signature for ordinary agreements, while property, wills and some financial documents demand more. A drawn image carries no cryptographic proof of who signed or when. If it matters, ask a lawyer or use a certificate-based service.' },
      { q: 'How is this different from DocuSign?', a: 'Those services attach a verifiable digital certificate and an audit trail proving who signed and when. This draws a picture of a signature onto a page. For an internal form the difference rarely matters; for a contract it can matter a great deal.' },
      { q: 'My signature looks terrible with a mouse.', a: 'It will — a mouse is a poor pen. Open the tool on a phone or tablet and use your finger, or sign a blank sheet, photograph it, and add it as an image instead.' },
      { q: 'Can I sign more than one page?', a: 'Place it on a page, then repeat for each page that needs it. Documents requiring initials on every page are quicker to handle in dedicated signing software.' }
    ],
    related: ['pdf-form-filler', 'scan-to-pdf', 'protect-pdf', 'merge-pdf', 'pdf-watermark', 'compress-pdf']
  },

  'pdf-form-filler': {
    intro: 'A PDF form that will not let you type is one of the more infuriating small obstacles in office life. Sometimes the fields are genuinely there and your reader will not show them; sometimes there are no fields at all and the form only looks fillable.',
    what: [
      'Reads the <strong>AcroForm</strong> fields inside a PDF, lists them, and writes your answers back into the file. If the document has no such fields it says so immediately rather than pretending — which tells you something useful about the file.',
      'The result is a normal PDF with the values filled in, openable anywhere.'
    ],
    specs: {
      caption: 'What it works with',
      rows: [
        ['Field standard', 'AcroForm — the common PDF form format'],
        ['Detection', 'Fields are listed automatically'],
        ['No fields found', 'Says so — the form is not interactive'],
        ['XFA forms', 'Not supported (rare, mostly older government forms)'],
        ['Flattening', 'No — values remain editable afterwards'],
        ['Input', 'PDF'],
        ['Output', 'PDF with values written in'],
        ['Privacy', 'Processed in your browser — never uploaded']
      ]
    },
    steps: [
      'Add the PDF. Fields appear if the document has them.',
      'Fill them in.',
      'Download the completed file.'
    ],
    tip: 'If it reports no fillable fields, the form was almost certainly produced by printing or scanning a design rather than by exporting a real form. You are not doing anything wrong — there is nothing there to fill. Add your text as a signature-style overlay, or print and complete it by hand.',
    faqs: [
      { q: 'It says my PDF has no fillable fields.', a: 'Then it genuinely has none. Many forms that look interactive are flat documents with boxes drawn on them — common when a form was scanned, or exported from a design tool. Nothing here can create fields that were never made.' },
      { q: 'Can the values be changed after I download?', a: 'Yes. The fields stay editable, so anyone with a PDF reader can alter them. If the completed form must be fixed, flatten it in a full PDF editor or print it to PDF.' },
      { q: 'Is my data sent anywhere?', a: 'No. The PDF is read and written entirely in your browser, which matters given what forms usually contain — addresses, dates of birth, bank details.' },
      { q: 'What about older government forms that ask me to open them in Adobe Reader?', a: 'Those are usually XFA forms, a different and largely abandoned standard that this does not support. They generally need the desktop Adobe Reader they ask for.' }
    ],
    related: ['pdf-signature', 'protect-pdf', 'pdf-ocr', 'merge-pdf', 'compress-pdf', 'scan-to-pdf']
  },

  'word-to-pdf': {
    intro: 'Sending a .docx means trusting that the recipient has compatible software, similar fonts and the same idea of where a page break belongs. PDF removes all three variables — which is why almost every application form asks for one.',
    what: [
      'Converts a Word .docx document to PDF in your browser using <strong>mammoth</strong>, which reads the document’s structure — headings, paragraphs, lists, bold and italic — and renders it cleanly.',
      'It converts <em>structure</em> rather than reproducing Word’s exact layout engine. Text documents come through faithfully; complex layouts do not.'
    ],
    specs: {
      caption: 'Support',
      rows: [
        ['Input', '.docx (not the older .doc)'],
        ['Converts well', 'Headings, paragraphs, lists, bold, italic, links'],
        ['Converts poorly', 'Text boxes, columns, floating images, headers/footers'],
        ['Not supported', 'Macros, tracked changes, comments'],
        ['Fonts', 'Substituted — not embedded from your system'],
        ['Output', 'PDF'],
        ['Privacy', 'Processed in your browser — never uploaded'],
        ['Best for', 'CVs, letters, reports, essays']
      ]
    },
    steps: [
      'Add the .docx file.',
      'Convert.',
      'Open the PDF and check it before sending — particularly page breaks and anything in a table.'
    ],
    tip: 'For a CV or anything where layout is the point, this is the wrong tool and Word’s own "Save as PDF" is the right one — it knows exactly where every element sits. Use this when you need a quick, faithful text conversion without opening Word, or when you do not have Word at all.',
    faqs: [
      { q: 'Why does my document look different?', a: 'Because the structure is converted rather than the layout replicated. Word positions elements with a proprietary engine; text boxes, multi-column layouts, floating images and headers depend on it and will shift or vanish.' },
      { q: 'Can I convert an old .doc file?', a: 'No — only .docx. The older binary .doc format is a different thing entirely. Open it in Word or LibreOffice and save as .docx first.' },
      { q: 'Are my fonts preserved?', a: 'Standard fonts are substituted with close equivalents; unusual ones will not survive, because the converter has no access to fonts installed on your machine. Anything typographically precise should be exported from Word.' },
      { q: 'Is my document uploaded?', a: 'No. The conversion runs in your browser, which matters for exactly the documents people convert most — contracts, applications, CVs, medical letters.' }
    ],
    related: ['pdf-to-text', 'merge-pdf', 'compress-pdf', 'excel-to-pdf', 'markdown-to-pdf', 'text-to-pdf']
  },

  'excel-to-pdf': {
    intro: 'Spreadsheets are built for editing, not for reading. Send one and the recipient sees your column widths, your frozen panes and whichever cell you happened to leave selected — and they can change the numbers. A PDF fixes the view and freezes the figures.',
    what: [
      'Reads .xlsx and .csv files with <strong>SheetJS</strong> and lays the sheet data out as a paginated PDF, breaking across pages where the content requires it.',
      'It converts the <em>data</em>, not the workbook. Formulas arrive as their computed values, which is what a reader needs, and charts and conditional formatting do not come across at all.'
    ],
    specs: {
      caption: 'Support',
      rows: [
        ['Input', '.xlsx, .csv'],
        ['Converts', 'Cell values across sheets, paginated'],
        ['Formulas', 'Rendered as their calculated result'],
        ['Not converted', 'Charts, images, conditional formatting, colours'],
        ['Wide sheets', 'Split across pages — narrow them first'],
        ['Output', 'PDF'],
        ['Privacy', 'Processed in your browser — never uploaded'],
        ['Best for', 'Tables, invoices, reports, data extracts']
      ]
    },
    steps: [
      'Add the spreadsheet.',
      'Convert.',
      'Check the pagination — wide sheets are where this needs attention.'
    ],
    tip: 'Narrow the sheet before converting. A spreadsheet twenty columns wide has to break across pages, and a table split down the middle is nearly unreadable. Hide the columns your reader does not need, or split the sheet into two logical tables, and the PDF becomes something people can actually use.',
    faqs: [
      { q: 'My charts are missing.', a: 'Charts are workbook objects rather than cell data, and are not converted. Export the chart as an image from your spreadsheet application and place it separately, or screenshot it and use JPG to PDF.' },
      { q: 'Do formulas come across?', a: 'Their results do, which is normally what you want in a document meant for reading. The formulas themselves are not shown.' },
      { q: 'What happens to a very wide sheet?', a: 'It is split across pages. That is often hard to read, so narrowing the sheet before converting produces a much better document.' },
      { q: 'Does it handle multiple sheets?', a: 'Sheet data is laid out into the document. For a workbook with many unrelated sheets, converting them separately usually gives a more readable result than one long file.' }
    ],
    related: ['csv-viewer', 'json-csv', 'word-to-pdf', 'merge-pdf', 'compress-pdf', 'csv-to-chart']
  },

  /* ============ batch 8 — PDF cluster, part 3 (completes the cluster) ============ */

  'html-to-pdf': {
    intro: 'Printing a web page to PDF from the browser drags in navigation bars, cookie banners and whatever the site decided a print stylesheet should look like. Rendering your own HTML gives you a document that contains only what you wrote.',
    what: [
      'Renders HTML with inline CSS into a PDF. Useful for turning a generated invoice, a report template or an email layout into a fixed document without a headless browser or a build step.',
      '<strong>Inline CSS only.</strong> There is no network fetch for external stylesheets, and JavaScript does not run — what you paste is what gets rendered.'
    ],
    specs: {
      caption: 'What renders',
      rows: [
        ['Input', 'HTML with inline or embedded CSS'],
        ['External stylesheets', 'Not fetched — inline your CSS'],
        ['JavaScript', 'Not executed'],
        ['Images', 'Data URIs work; remote images may not load'],
        ['Web fonts', 'Not fetched — use system font stacks'],
        ['Page breaks', 'Automatic; <code>page-break-before</code> is respected'],
        ['Output', 'PDF'],
        ['Privacy', 'Rendered in your browser — never uploaded']
      ]
    },
    steps: [
      'Paste your HTML, with the CSS inside a <code>&lt;style&gt;</code> block or on the elements.',
      'Convert.',
      'Check pagination and adjust with <code>page-break-before</code> where a section should start fresh.'
    ],
    tip: 'Design in millimetres or points rather than pixels. A PDF has a physical page size, and CSS pixel widths that look right on screen produce unpredictable margins on paper. Setting a width in mm on your container gives you a document that prints the way it looked.',
    faqs: [
      { q: 'My stylesheet is not applying.', a: 'External stylesheets are not fetched — nothing is loaded from the network. Move the CSS into a <code>&lt;style&gt;</code> block in the HTML you paste, or onto the elements themselves.' },
      { q: 'Can I render a live web page by URL?', a: 'No. This renders HTML you supply, not a page it goes and fetches. To capture a live page, use your browser’s own Print to PDF.' },
      { q: 'Why are my images missing?', a: 'Remote images may not load. Embed them as data URIs and they will always render — the Image to Base64 converter produces those.' },
      { q: 'How do I control where pages break?', a: 'Use <code>page-break-before: always</code> on the element that should start a new page. Without it, breaks fall wherever the content runs out of room.' }
    ],
    related: ['markdown-to-pdf', 'text-to-pdf', 'pdf-creator', 'merge-pdf', 'compress-pdf', 'base64']
  },

  'markdown-to-pdf': {
    intro: 'Markdown is how a lot of writing actually gets done — notes, documentation, drafts — and it is exactly the wrong thing to hand to someone who just wants to read it. A PDF is the version they can open, print and annotate.',
    what: [
      'Converts Markdown into a formatted PDF, turning headings, lists, emphasis, links and code blocks into their typographic equivalents rather than leaving the symbols on the page.',
      'Choose <strong>A4</strong> or <strong>Letter</strong> — worth thinking about, since a document sized for the wrong region gets rescaled or clipped when printed.'
    ],
    specs: {
      caption: 'Support',
      rows: [
        ['Page sizes', 'A4 (210 × 297 mm) or Letter (8.5 × 11 in)'],
        ['Headings', '# through ###### render as a heading hierarchy'],
        ['Lists', 'Bulleted, numbered and nested'],
        ['Emphasis', 'Bold, italic, inline code'],
        ['Code blocks', 'Fenced blocks in a monospace face'],
        ['Links', 'Rendered and clickable'],
        ['Images', 'Remote images may not load — embed as data URIs'],
        ['Privacy', 'Processed in your browser — never uploaded']
      ]
    },
    steps: [
      'Paste or type your Markdown.',
      'Choose <strong>A4</strong> for most of the world, <strong>Letter</strong> for the US and Canada.',
      'Convert and download.'
    ],
    tip: 'Get the page size right first, not last. A4 is 8 mm narrower and 18 mm taller than Letter, so a document laid out for one and printed on the other is either rescaled slightly — enough to look off — or has its edges clipped. Match the size to wherever it will actually be printed.',
    faqs: [
      { q: 'Which Markdown flavour does it accept?', a: 'The standard set: headings, lists, bold, italic, inline code, fenced code blocks and links. Extensions such as tables, footnotes and task lists vary by flavour and may not render as expected.' },
      { q: 'A4 or Letter?', a: 'A4 for Europe, Asia, Africa, Australia and most of the rest of the world; Letter for the US and Canada. If the document is only ever read on screen it makes little difference — the moment it might be printed, it matters.' },
      { q: 'Are my images included?', a: 'Local file paths will not resolve and remote images may not load. Embed images as data URIs for a reliable result.' },
      { q: 'Can I control the fonts?', a: 'Not directly — the output uses a clean default set with monospace for code. For full typographic control, convert to HTML first and use the HTML to PDF tool with your own CSS.' }
    ],
    related: ['markdown-editor', 'html-to-pdf', 'text-to-pdf', 'pdf-creator', 'merge-pdf', 'compress-pdf']
  },

  'pdf-creator': {
    intro: 'Sometimes what you need is not a converted document but an empty one — a blank PDF of a known size to print, to draw on, to use as a separator between merged sections, or to test that a workflow handles a file correctly.',
    what: [
      'Generates a fresh PDF with the page size and page count you choose. Nothing on the pages, exactly the right dimensions.',
      'Its most common real use is as a spacer: merging two documents that must start on a right-hand page needs a blank inserted at the join, and that blank has to exist as a file first.'
    ],
    specs: {
      caption: 'Options',
      rows: [
        ['Page sizes', 'A4 (210 × 297 mm) or Letter (8.5 × 11 in)'],
        ['A4 in points', '595 × 842 pt'],
        ['Letter in points', '612 × 792 pt'],
        ['Page count', 'Your choice'],
        ['Content', 'None — genuinely blank'],
        ['File size', 'Tiny; a blank page carries almost no data'],
        ['Output', 'PDF'],
        ['Privacy', 'Generated in your browser — nothing is sent']
      ]
    },
    steps: [
      'Choose <strong>A4</strong> or <strong>Letter</strong>.',
      'Set how many pages you need.',
      'Create and download.'
    ],
    tip: 'For double-sided printing, blank pages are how you control which side a section starts on. A chapter that must open on the right needs the preceding section to end on an even page — insert a blank where it does not, and the whole booklet falls into place.',
    faqs: [
      { q: 'What would I use a blank PDF for?', a: 'Separators between merged documents, spacers that force a section to start on the correct side when printing double-sided, ruled or plain sheets to print and write on, and test files for checking that a system accepts and handles PDFs.' },
      { q: 'Which size should I pick?', a: 'Match whatever it is going to be merged with or printed alongside. Mixing A4 and Letter in one document produces pages that do not line up, which is visible immediately when printed.' },
      { q: 'Can I add content afterwards?', a: 'Yes — stamp page numbers or a watermark onto it, or merge it with other files. It is an ordinary PDF in every respect.' },
      { q: 'Why is the file so small?', a: 'Because a blank page contains almost nothing: the page dimensions and structure, and no content stream to speak of. Even a hundred blank pages is a very small file.' }
    ],
    related: ['merge-pdf', 'pdf-page-numbers', 'split-pdf', 'pdf-watermark', 'markdown-to-pdf', 'text-to-pdf']
  },

  'pdf-repair': {
    intro: 'A PDF that will not open is usually not destroyed — it is a structurally valid document with a broken index. Interrupted downloads, half-finished exports and email systems that mangle attachments all produce files where the content survives and the map to it does not.',
    what: [
      'Rebuilds the PDF’s internal structure — the cross-reference table that tells a reader where each object lives — and writes a clean file. Where the page content is intact, this is often all that is needed.',
      'It cannot invent data that is not there. A truncated download missing its second half stays missing; what repair fixes is a file whose parts are present but unreachable.'
    ],
    specs: {
      caption: 'What it can and cannot fix',
      rows: [
        ['Fixes', 'Broken cross-reference tables and object indexes'],
        ['Fixes', 'Files that open with "damaged" or "cannot be repaired" errors'],
        ['Cannot fix', 'Truncated files — missing data stays missing'],
        ['Cannot fix', 'Encrypted files without the password'],
        ['Cannot fix', 'Files that are not actually PDFs'],
        ['Content', 'Preserved where it is present'],
        ['Output', 'A rebuilt PDF'],
        ['Privacy', 'Processed in your browser — never uploaded']
      ]
    },
    steps: [
      'Add the broken file.',
      'Run the repair.',
      'Open the result and check every page — a rebuilt file can open cleanly and still be missing content that was never there.'
    ],
    tip: 'Before repairing, try downloading the file again from its source. Interrupted transfers are the single most common cause of a corrupt PDF, and a fresh copy is a complete fix rather than a partial one. Repair is for when the original is genuinely gone.',
    faqs: [
      { q: 'Will this recover a file that was cut off mid-download?', a: 'Only the part that arrived. Repair rebuilds the index to whatever data is present; it cannot reconstruct bytes that were never transferred. If the file is half the size it should be, download it again.' },
      { q: 'My PDF opens but shows blank pages.', a: 'Repair may help if the page objects exist but are not correctly referenced. If the content streams themselves are damaged, the pages will still be blank afterwards — the structure was not the problem.' },
      { q: 'Can it remove a password?', a: 'No. That is a different operation and needs the password — see Remove PDF Password. Repair works on structure, not encryption.' },
      { q: 'It says the file is not a PDF.', a: 'Then it probably is not. Files renamed to .pdf, or downloaded as an error page, will not open regardless. Check the real file type before assuming corruption.' }
    ],
    related: ['compress-pdf', 'remove-pdf-password', 'merge-pdf', 'split-pdf', 'pdf-to-text', 'protect-pdf']
  },

  'webp-to-pdf': {
    intro: 'WebP is now the default export from a lot of design tools and the format most sites serve — and it is still the format that half the world’s software refuses to open. Wrapping the images in a PDF sidesteps the compatibility problem entirely.',
    what: [
      'Combines WebP images into a single PDF, one image per page, in the order you add them.',
      'PDF is the useful destination precisely because it is universally readable: a WebP that a client cannot open becomes a PDF that opens on anything.'
    ],
    specs: {
      caption: 'Limits',
      rows: [
        ['Input', 'WebP images'],
        ['Maximum total', '40 MB'],
        ['Layout', 'One image per page'],
        ['Page order', 'The order you add the files'],
        ['Animated WebP', 'First frame only'],
        ['Transparency', 'Flattened — PDF pages have no alpha channel'],
        ['Output', 'A single PDF'],
        ['Privacy', 'Processed in your browser — never uploaded']
      ]
    },
    steps: [
      'Add your WebP images in the order you want them.',
      'Convert.',
      'Check the result — transparency in particular, since it is flattened.'
    ],
    tip: 'If your WebP files have transparent backgrounds, decide what colour you want behind them before converting rather than after. PDF pages have no alpha channel, so transparency is flattened during conversion — and a logo that looked fine on a dark website can end up as dark-on-dark in the document.',
    faqs: [
      { q: 'Why convert WebP to PDF at all?', a: 'Compatibility. WebP is efficient but not universally supported — older software, some email clients and plenty of corporate systems will not display it. A PDF opens everywhere, which is the whole point.' },
      { q: 'What happens to transparent areas?', a: 'They are flattened, because PDF pages do not have an alpha channel. Check the result if transparency mattered; you may want to composite the images onto a background first.' },
      { q: 'Can I mix WebP with JPG and PNG?', a: 'This tool takes WebP. For a mixed set, use JPG to PDF, which accepts several image formats in one document.' },
      { q: 'What about animated WebP files?', a: 'Only the first frame is used — a PDF page is static. To keep an animation, convert it to GIF or video instead.' }
    ],
    related: ['jpg-to-pdf', 'png-to-pdf', 'pdf-to-webp', 'webp-to-png', 'merge-pdf', 'compress-pdf']
  },

  'pdf-to-webp': {
    intro: 'Putting a PDF page on a web page means turning it into an image, and the format you choose decides how long the page takes to load. WebP is the reason to bother: meaningfully smaller than PNG or JPEG at the same visual quality.',
    what: [
      'Renders each PDF page and saves it as a WebP image — typically 25–35% smaller than an equivalent JPEG and far smaller than PNG, at quality most people cannot distinguish.',
      'Useful for previews, thumbnails, embedding a page in a site, or posting a document somewhere that accepts images but not PDFs.'
    ],
    specs: {
      caption: 'Output',
      rows: [
        ['Input', 'PDF'],
        ['Output', 'One WebP image per page'],
        ['Typical saving vs JPEG', '25–35% at similar quality'],
        ['Typical saving vs PNG', 'Substantially more on photographic pages'],
        ['Text', 'Becomes pixels — no longer selectable or searchable'],
        ['Browser support', 'Every current browser'],
        ['Older software', 'May not open WebP — use PDF to JPG instead'],
        ['Privacy', 'Processed in your browser — never uploaded']
      ]
    },
    steps: [
      'Add the PDF.',
      'Convert — each page becomes its own WebP.',
      'Download the images.'
    ],
    tip: 'Use WebP when the destination is a web page, and JPEG when the destination is a person. Browsers all handle WebP now, but if you are emailing the image to someone who will open it in whatever their computer defaults to, PDF to JPG saves you a support conversation.',
    faqs: [
      { q: 'Why WebP rather than JPEG?', a: 'Size. At comparable visual quality WebP files are roughly a quarter to a third smaller, which is a real difference on a page carrying several document previews. On a website that is faster loading and better Core Web Vitals.' },
      { q: 'Will the text still be selectable?', a: 'No. The page becomes an image, so the text is pixels. Keep the PDF as the readable version and use the images for display, or run PDF to Text if you need the words separately.' },
      { q: 'Who cannot open WebP?', a: 'All current browsers support it, but some older desktop applications and image viewers still do not. If the recipient will open it outside a browser, PDF to JPG is the safer choice.' },
      { q: 'Can I get one image for the whole document?', a: 'Each page is rendered separately, which is usually what you want. To combine them, stitch the images afterwards — though a long document as one tall image is rarely readable.' }
    ],
    related: ['pdf-to-jpg', 'pdf-to-png', 'webp-to-pdf', 'webp-to-jpg', 'compress-image', 'pdf-to-text']
  },

  /* ============ batch 9 — BUSINESS cluster, part 1 ============
   * invoice / quote / receipt were 100% identical because the CODE is
   * identical: tools-business.js exposes build('invoice'), build('quote'),
   * build('receipt') from one function. The pages differ on what each document
   * legally IS and when you send it, which is the real difference anyway.
   * Shared mechanics read from computeTotals(): discount comes off the
   * subtotal, then tax applies to the DISCOUNTED figure. */

  'invoice-generator': {
    intro: 'An invoice is a demand for payment, and the reason it gets paid on time is rarely the design — it is whether the client can match it to a purchase order, find your bank details, and see a due date without reading twice.',
    what: [
      'Builds a printable invoice from line items, then produces it two ways: <strong>Print → Save as PDF</strong>, or a downloadable HTML file. There is no PDF library involved, which is why it stays fast and why the output uses your system’s own fonts.',
      'Totals follow the standard order: <strong>subtotal, then discount, then tax on the discounted figure</strong>. That sequence matters — taxing before discounting overcharges the client, and is the single most common arithmetic error on hand-made invoices.'
    ],
    specs: {
      caption: 'How it calculates and exports',
      rows: [
        ['Line items', 'Description, quantity, unit price'],
        ['Order of operations', 'Subtotal → minus discount → tax on the remainder'],
        ['Tax', 'A percentage you set'],
        ['Currency', 'Formatted with your locale’s conventions'],
        ['Export', 'Print → Save as PDF, or download as HTML'],
        ['Numbering', 'Yours to set — sequential is what accountants expect'],
        ['Storage', 'Nothing is saved or uploaded'],
        ['Privacy', 'Entirely on-device']
      ]
    },
    steps: [
      'Enter your details and the client’s.',
      'Add line items — one line per thing you did, not one line saying "consulting".',
      'Set tax and any discount.',
      'Print to PDF, or download the HTML.'
    ],
    tip: 'Put the payment terms and the due date on the invoice as an actual date, not "net 30". Everyone reads a date; almost nobody converts "net 30" in their head, and an invoice whose deadline requires arithmetic is the one that sits in a pile.',
    faqs: [
      { q: 'Is tax calculated before or after the discount?', a: 'After. The discount comes off the subtotal, then tax is applied to what remains — which is the standard treatment in most jurisdictions and the one your client’s bookkeeper will expect. Taxing first would overcharge them.' },
      { q: 'What should I number invoices?', a: 'Anything sequential and unique, and never reuse one. Most tax authorities require it, and gaps or duplicates are the thing an audit notices first. A simple 2026-001 pattern is enough.' },
      { q: 'Is this a legally valid invoice?', a: 'Requirements vary by country — many require your tax registration number, a specific date format, or particular wording for reverse-charge and cross-border work. This produces a clean, standard document; whether it satisfies your local rules is a question for your accountant.' },
      { q: 'Where is my data stored?', a: 'Nowhere. Nothing is saved between sessions and nothing is uploaded, so close the tab and it is gone. Download the HTML if you want a copy you can reopen and edit.' }
    ],
    related: ['quote-generator', 'receipt-generator', 'late-fee', 'vat-gst', 'hourly-rate', 'paypal-fee-calculator']
  },

  'quote-generator': {
    intro: 'A quote is a promise about price made before the work exists — which makes it the riskiest document a small business sends. Get it wrong and you either lose the job or do it at a loss, and the difference usually comes down to what the quote said was <em>not</em> included.',
    what: [
      'Produces a professional estimate with line items and totals, headed <strong>QUOTE</strong> and addressed "Prepared for" rather than "Bill to" — because a quote invites a decision, it does not demand money.',
      'Same arithmetic as the invoice tool: discount comes off the subtotal, tax applies to what remains. Export by printing to PDF or downloading HTML.'
    ],
    specs: {
      caption: 'What a quote is, and is not',
      rows: [
        ['Document heading', 'QUOTE'],
        ['Addressed', '"Prepared for" — not "Bill to"'],
        ['Asks for payment?', 'No — that is the invoice’s job'],
        ['Line items', 'Description, quantity, unit price'],
        ['Order of operations', 'Subtotal → minus discount → tax on the remainder'],
        ['Export', 'Print → Save as PDF, or download HTML'],
        ['Validity period', 'Add it yourself in the notes — always add it'],
        ['Privacy', 'Entirely on-device']
      ]
    },
    steps: [
      'Enter your details and the prospective client’s.',
      'Break the work into line items — a quote with one line saying "website" is one nobody can question or approve.',
      'Add a validity period and anything explicitly excluded.',
      'Print to PDF or download.'
    ],
    tip: 'Write what is <em>excluded</em>, not only what is included. Scope disputes almost never start with someone denying a listed item — they start with an assumption about something the quote never mentioned. One line reading "Excludes hosting, stock photography and content writing" prevents more arguments than any amount of detail elsewhere.',
    faqs: [
      { q: 'What is the difference between a quote and an estimate?', a: 'Convention rather than law in most places: a quote implies a fixed price you are prepared to stand behind, an estimate implies an approximation that may move. If your price could change, say so on the document — the word alone will not protect you.' },
      { q: 'How long should a quote stay valid?', a: 'Long enough to decide, short enough that your costs have not moved — 14 or 30 days is typical. Put the expiry date on the document, because a quote with no expiry is one someone may try to accept next year at last year’s prices.' },
      { q: 'Is a quote legally binding?', a: 'Often it can become binding once accepted, which is exactly why the exclusions and the validity period matter. If the amounts are significant, have a professional look at your standard wording once — it will serve every quote you send afterwards.' },
      { q: 'Can I turn an accepted quote into an invoice?', a: 'Re-enter the same line items in the Invoice Generator. Keeping the numbers identical between the two documents is what makes the invoice easy to approve.' }
    ],
    related: ['invoice-generator', 'receipt-generator', 'contract-generator', 'proposal-generator', 'hourly-rate', 'break-even']
  },

  'receipt-generator': {
    intro: 'A receipt is proof that money moved. It is the document your client needs for their bookkeeping and their tax return, and the one you will want if a payment is ever disputed — which is why it says PAID and an invoice does not.',
    what: [
      'Produces a document headed <strong>RECEIPT</strong> with a green <strong>PAID</strong> badge, addressed "Received from". The badge is the functional part: it is what distinguishes this at a glance from an unpaid invoice sitting in the same folder.',
      'Line items and totals work exactly as on the invoice, with the discount applied before tax.'
    ],
    specs: {
      caption: 'What makes it a receipt',
      rows: [
        ['Document heading', 'RECEIPT'],
        ['Status badge', 'PAID, shown in green'],
        ['Addressed', '"Received from"'],
        ['Records', 'Money already paid — not money owed'],
        ['Line items', 'Description, quantity, unit price'],
        ['Order of operations', 'Subtotal → minus discount → tax on the remainder'],
        ['Export', 'Print → Save as PDF, or download HTML'],
        ['Privacy', 'Entirely on-device']
      ]
    },
    steps: [
      'Enter your details and the payer’s.',
      'List what was paid for, matching the original invoice if there was one.',
      'Add the payment date and method in the notes.',
      'Print to PDF or download, and send it promptly.'
    ],
    tip: 'Reference the invoice number on the receipt. Your client’s bookkeeper is trying to match two documents to one bank transaction, and a receipt with no reference makes that a manual job — which is how a paid invoice ends up chased anyway.',
    faqs: [
      { q: 'What is the difference between this and an invoice?', a: 'Timing and intent. An invoice requests payment; a receipt confirms it arrived. The heading, the PAID badge and the "Received from" wording all exist so nobody has to work out which they are holding.' },
      { q: 'Do I have to issue receipts?', a: 'It depends where you are and what you sell — many jurisdictions require them for consumer sales, and some require specific details. Issuing one is good practice regardless, since it closes the transaction cleanly for both sides.' },
      { q: 'Should the receipt show the payment method?', a: 'Yes, in the notes. "Paid by bank transfer, 12 March" makes reconciliation trivial for whoever is matching your document against a bank statement.' },
      { q: 'Can I use this for cash payments?', a: 'That is exactly where a receipt matters most — a bank transfer leaves its own record, cash does not. Note the amount, the date and that it was cash, and keep your copy.' }
    ],
    related: ['invoice-generator', 'quote-generator', 'vat-gst', 'late-fee', 'paypal-fee-calculator', 'inventory-tracker']
  },

  'proposal-generator': {
    intro: 'A proposal is not a longer quote. A quote answers "how much"; a proposal answers "why you, and what happens next" — and it is read by people who were not in the meeting where the work was discussed.',
    what: [
      'Fills a structured template — overview, scope, deliverables, timeline, pricing — into a clean formatted document, previewed live as you type and exported by printing to PDF or downloading HTML.',
      'Bullet lists come from plain lines of text: type one item per line and they become a proper list, so you can write in a text box and get typography.'
    ],
    specs: {
      caption: 'Structure and export',
      rows: [
        ['Sections', 'Overview, scope, deliverables, timeline, pricing'],
        ['Lists', 'One item per line becomes a bullet'],
        ['Preview', 'Live, as you type'],
        ['Export', 'Print → Save as PDF, or download HTML'],
        ['Fonts', 'Your system’s — no web fonts to load'],
        ['Storage', 'Nothing saved or uploaded'],
        ['Editable later?', 'Keep the HTML download and reopen it'],
        ['Privacy', 'Entirely on-device']
      ]
    },
    steps: [
      'Write the overview last, even though it appears first — it is a summary and you cannot summarise what you have not written.',
      'List deliverables as things the client will receive, not activities you will perform.',
      'Add the timeline and pricing.',
      'Print to PDF and read it once as if you were the client.'
    ],
    tip: 'Deliverables should be nouns, not verbs. "Five product photographs, retouched, supplied as high-resolution JPEG" can be delivered and checked off. "Photography services" cannot, and a proposal full of verbs is a proposal that ends in an argument about whether the work is finished.',
    faqs: [
      { q: 'How long should a proposal be?', a: 'As long as the decision requires and no longer. For a small engagement, one page that a decision-maker actually reads beats six that get skimmed. The overview should stand alone — assume some readers will read only that.' },
      { q: 'Should pricing go in the proposal?', a: 'Usually yes, since a proposal without a price generates one extra round of email before any decision. If the price depends on choices, present two or three defined options rather than a range.' },
      { q: 'Is this a contract?', a: 'No. A proposal describes intended work; a contract sets the terms that govern it — payment schedule, ownership, termination, liability. Use the Contract Generator for that, and have anything significant reviewed.' },
      { q: 'Can I edit it after downloading?', a: 'Yes — the HTML download opens in any browser and can be edited in a text editor. Keep it if you expect to produce similar proposals; it is faster to adapt than to start again.' }
    ],
    related: ['quote-generator', 'contract-generator', 'invoice-generator', 'swot-generator', 'hourly-rate', 'landing-page-generator']
  },

  'contract-generator': {
    intro: 'Most freelance disputes are not about the work. They are about what happens when the client goes quiet, or asks for a fourth revision, or wants to use the design for something nobody discussed. A short written agreement settles those before they happen.',
    what: [
      'Fills a simple services-agreement template — parties, scope, payment terms, timeline, termination — into a clean printable document.',
      '<strong>This is a starting template, not legal advice.</strong> Contract law differs by country and by what you do, and no template can account for that. Treat this as a structured way to write down what you have already agreed.'
    ],
    specs: {
      caption: 'Scope and limits',
      rows: [
        ['Covers', 'Parties, scope, payment, timeline, termination'],
        ['Is it legal advice?', '<strong>No</strong>'],
        ['Jurisdiction-specific?', 'No — you must adapt it'],
        ['Signature', 'Add one with the PDF Signature tool after exporting'],
        ['Export', 'Print → Save as PDF, or download HTML'],
        ['Storage', 'Nothing saved or uploaded'],
        ['Suitable for', 'Small, straightforward engagements'],
        ['Not suitable for', 'Employment, IP assignment, anything high-value']
      ]
    },
    steps: [
      'Name both parties in full — legal entity names, not trading names.',
      'Write the scope from the accepted quote or proposal so the documents agree.',
      'Set payment terms as dates or milestones, and say what happens if either side stops.',
      'Export, then have it reviewed if the amounts are meaningful.'
    ],
    tip: 'The clause worth arguing over is what happens when the project stalls on the client’s side. Work that is 80% done and waiting indefinitely for feedback is unpaid work with no end date. A line saying the balance becomes payable if the project is inactive for 30 days solves the most common cashflow problem in freelancing.',
    faqs: [
      { q: 'Can I use this without a lawyer?', a: 'For small, low-risk engagements many people do, and a plain written agreement is far better than nothing. But this is a template with no knowledge of your jurisdiction or your trade — if the value is significant, or it involves employment or intellectual property, have it reviewed. That review is reusable across every future client.' },
      { q: 'What must a contract include to be valid?', a: 'That varies by country, and this cannot tell you. Broadly, an offer, acceptance and something of value exchanged — but formalities differ, and some agreements must be written or witnessed. Local advice is the only reliable answer.' },
      { q: 'How do I get it signed?', a: 'Export to PDF, then use the PDF Signature tool for a drawn signature — noting that a drawn signature is visual rather than cryptographic. For anything valuable, use a certificate-based e-signature service.' },
      { q: 'Should the scope repeat what is in my proposal?', a: 'Yes, or reference it explicitly as an attachment. The two documents disagreeing is precisely the ambiguity that gets exploited later.' }
    ],
    related: ['proposal-generator', 'quote-generator', 'invoice-generator', 'pdf-signature', 'late-fee', 'hourly-rate']
  },

  'resume-builder': {
    intro: 'Most CVs are rejected in about seven seconds, and rarely for the reason the applicant imagines. Formatting that breaks in an applicant tracking system, or a first section that buries the relevant experience, loses more interviews than the experience itself.',
    what: [
      'Fills a clean, single-column resume template that prints properly and parses reliably — no tables, no text boxes, no multi-column layouts, which are exactly the things that scramble in automated screening.',
      'Live preview as you type, exported by printing to PDF or downloading HTML.'
    ],
    specs: {
      caption: 'Format and export',
      rows: [
        ['Layout', 'Single column — parses reliably in ATS'],
        ['Avoids', 'Tables, text boxes, columns, graphics'],
        ['Lists', 'One item per line becomes a bullet'],
        ['Preview', 'Live, as you type'],
        ['Export', 'Print → Save as PDF, or download HTML'],
        ['Fonts', 'System fonts — no loading, no substitution surprises'],
        ['Storage', 'Nothing saved or uploaded'],
        ['Privacy', 'Your employment history stays on your device']
      ]
    },
    steps: [
      'Lead with the experience relevant to the specific job, not with the most recent if they differ.',
      'Write achievements with numbers — what changed, by how much.',
      'Keep it to one page for under ten years’ experience, two beyond that.',
      'Print to PDF and send that, not the HTML.'
    ],
    tip: 'Send a PDF unless the posting asks for something else, and name the file <code>Firstname-Lastname-CV.pdf</code>. A file called <code>cv-final-v3.docx</code> arrives in a folder of two hundred others with the same name, and a .docx reflows differently on the reader’s machine than it did on yours.',
    faqs: [
      { q: 'Why single column? The two-column designs look better.', a: 'They look better to you and often parse badly in the software that reads them first. Applicant tracking systems read top to bottom, left to right; a sidebar can interleave with the main column and produce nonsense. A single column is boring and it survives.' },
      { q: 'One page or two?', a: 'One for under about ten years of experience, two beyond that, and rarely more. The constraint is useful — it forces you to cut the roles that are no longer relevant, which is what a reader wants anyway.' },
      { q: 'Should I include a photo?', a: 'It depends entirely on the country. Expected in parts of Europe and Asia, and actively discouraged in the US, UK and Canada where it raises discrimination concerns and some systems strip it. Check the local norm.' },
      { q: 'Is my employment history uploaded anywhere?', a: 'No. Everything stays in your browser, and nothing is saved when you close the tab — which is the right default for a document containing your address, phone number and work history.' }
    ],
    related: ['proposal-generator', 'text-to-pdf', 'word-to-pdf', 'compress-pdf', 'readability', 'business-card-maker']
  },

  /* ============ batch 9 — BUSINESS cluster, part 2 (completes it) ============ */

  'swot-generator': {
    intro: 'A SWOT grid is easy to fill in and easy to waste. Most end up as four lists of adjectives that nobody reads again — because the value is not in naming a strength, it is in what the grid tells you to do next.',
    what: [
      'Lays out the four quadrants — strengths, weaknesses, opportunities, threats — into a clean printable grid, previewed live and exported by printing to PDF or downloading HTML.',
      'The distinction the framework rests on: <strong>strengths and weaknesses are internal</strong> and you control them; <strong>opportunities and threats are external</strong> and you do not. Putting an external factor in the wrong box is what turns the exercise into a list.'
    ],
    specs: {
      caption: 'The four quadrants',
      rows: [
        ['Strengths', 'Internal, positive — things you control'],
        ['Weaknesses', 'Internal, negative — things you control'],
        ['Opportunities', 'External, positive — things you can only respond to'],
        ['Threats', 'External, negative — things you can only respond to'],
        ['Entry format', 'One item per line'],
        ['Export', 'Print → Save as PDF, or download HTML'],
        ['Storage', 'Nothing saved or uploaded'],
        ['Privacy', 'Entirely on-device']
      ]
    },
    steps: [
      'Fill the internal boxes first — they are the ones you have evidence for.',
      'Keep each entry specific enough to act on. "Good customer service" is not a finding; "we answer support email within two hours, competitors take two days" is.',
      'Pair items across boxes: which strength addresses which threat?',
      'Export and revisit it in three months.'
    ],
    tip: 'The useful output is the pairings, not the lists. A strength that neutralises a threat is a strategy; a weakness that an opportunity would expose is a risk to fix first. If you finish the grid and no pairs jump out, the entries are too vague — go back and make them specific.',
    faqs: [
      { q: 'What is the difference between a weakness and a threat?', a: 'Control. A weakness is inside your organisation and you can change it — a slow website, no second developer. A threat is outside it and you can only prepare — a new competitor, a rule change. Misfiling them produces a plan aimed at the wrong things.' },
      { q: 'How many items per box?', a: 'Three to five that matter beats fifteen that are true. Long lists feel thorough and dilute attention; the exercise is about prioritising, and a box with fifteen entries has prioritised nothing.' },
      { q: 'Is SWOT still useful?', a: 'It is criticised for producing lists rather than decisions, and that criticism is fair when it is used as a checklist. Used to force pairings between internal capability and external circumstance, it is a fast and genuinely useful structuring tool.' },
      { q: 'Can I use this for a personal decision?', a: 'Yes — it works for a career move or a big purchase as readily as for a company. The internal/external split still does the work.' }
    ],
    related: ['proposal-generator', 'break-even', 'cac-ltv-calculator', 'business-name-generator', 'roas-calculator', 'hourly-rate']
  },

  'landing-page-generator': {
    intro: 'Testing whether anyone wants a thing should not require a hosting account, a framework and a weekend. A single HTML file with a headline, a few features and a call to action answers the question, and it will load faster than most funded startups’ homepages.',
    what: [
      'Generates a complete, self-contained landing page — hero, features, call to action — as one HTML file with the CSS inside it. No build step, no dependencies, nothing to install.',
      'Because it is a single file with no external requests, it can be hosted anywhere that serves static files, and it will load almost instantly.'
    ],
    specs: {
      caption: 'What you get',
      rows: [
        ['Output', 'One self-contained .html file'],
        ['CSS', 'Inline — no external stylesheet'],
        ['JavaScript', 'None required'],
        ['Dependencies', 'None — no build, no framework'],
        ['Sections', 'Hero, features, call to action'],
        ['Hosting', 'Any static host — Netlify, GitHub Pages, S3'],
        ['Editable', 'Yes — plain HTML in any text editor'],
        ['Privacy', 'Generated on-device; nothing is uploaded']
      ]
    },
    steps: [
      'Write the headline as the outcome for the visitor, not a description of the product.',
      'Add three or four features — benefits, not specifications.',
      'Set one call to action. One.',
      'Download the HTML and drop it on any static host.'
    ],
    tip: 'One call to action, repeated, beats three competing ones. A page offering "sign up", "read the docs" and "join our Discord" splits the visitor’s attention three ways and converts on none of them. Decide the single thing you want them to do and ask for it twice — once in the hero, once at the bottom.',
    faqs: [
      { q: 'Where can I host this?', a: 'Anywhere that serves a static file: Netlify, Vercel, GitHub Pages, Cloudflare Pages, or plain S3. With no build step and no dependencies, deploying is copying one file.' },
      { q: 'Can I edit it afterwards?', a: 'Yes — it is ordinary HTML with the CSS in a style block. Open it in any text editor. If you want to restyle it heavily, the HTML to PDF tool follows the same inline-CSS approach if you later need a print version.' },
      { q: 'Does it include analytics or a form?', a: 'No. It is a static page by design, which is what makes it instant to load and trivial to host. Paste your own analytics snippet or a form embed into the HTML if you need them.' },
      { q: 'Is this enough to validate an idea?', a: 'For testing whether a message resonates, often yes — a page plus a way to capture interest answers more than months of planning. It will not tell you whether people will pay; only asking for money does that.' }
    ],
    related: ['html-to-pdf', 'business-name-generator', 'meta-tag-generator', 'serp-preview', 'og-preview', 'proposal-generator']
  },

  'business-name-generator': {
    intro: 'Naming paralysis is real, and it is usually a shortage of options rather than a shortage of judgement. Seeing sixty combinations makes it obvious which two are worth checking — and which fifty-eight your instinct was right to reject.',
    what: [
      'Combines your keyword with prefixes and suffixes from a wordlist to produce candidate names. <strong>No AI and no tracking</strong> — it is deterministic combination, which means your idea is not sent anywhere to be processed.',
      'It generates candidates. It cannot tell you whether a name is available, and that is the part that actually decides.'
    ],
    specs: {
      caption: 'Method and limits',
      rows: [
        ['Method', 'Prefix/suffix combination against a wordlist'],
        ['Uses AI?', 'No'],
        ['Sends your keyword anywhere?', 'No'],
        ['Checks domain availability?', '<strong>No</strong>'],
        ['Checks trademarks?', '<strong>No</strong>'],
        ['Deterministic', 'The same keyword gives the same candidates'],
        ['Output', 'A list of names to shortlist from'],
        ['Privacy', 'Entirely on-device']
      ]
    },
    steps: [
      'Enter a keyword that describes what you do.',
      'Generate, and shortlist without overthinking — five candidates is enough.',
      'Check domain availability and your national trademark register for each.',
      'Say the survivors out loud before deciding.'
    ],
    tip: 'Say each shortlisted name down a phone line in your head. Names that read well and spell badly — anything with a silent letter, a doubled consonant or a creative misspelling — cost you every word-of-mouth referral, because the person retelling it gets the spelling wrong and the listener never finds you.',
    faqs: [
      { q: 'Does it check whether the domain is free?', a: 'No — it generates candidates only. Check availability separately at a registrar, and check the .com even if you plan to use something else, because someone else owning it affects how findable you are.' },
      { q: 'Does it check trademarks?', a: 'No, and this genuinely matters. A name can be available as a domain and still infringe an existing mark in your industry. Search your national trademark register before you print anything, and take advice if you are investing in the brand.' },
      { q: 'Why no AI?', a: 'Because it is not needed for combination, and using it would mean sending your business idea to a third-party service. Deterministic generation keeps the idea on your machine, which for an unlaunched business is worth more than novelty.' },
      { q: 'The names feel generic.', a: 'Combination generators produce combinations — the good ones come from your keyword, not from the tool. Try several different keywords, including ones describing the outcome for your customer rather than what you do.' }
    ],
    related: ['landing-page-generator', 'slug-generator', 'business-card-maker', 'swot-generator', 'meta-tag-generator', 'qr-business-card']
  },

  'inventory-tracker': {
    intro: 'Every small seller starts with a spreadsheet and discovers the same two problems: it is never open when a sale happens, and it tells you what you have without telling you what it is worth. This does both, and it opens in one tab.',
    what: [
      'Tracks items with quantity, cost and retail price, and computes stock value at both — so you can see your capital tied up in inventory and your potential revenue side by side.',
      '<strong>Saved in your browser’s local storage</strong>, so it persists between visits. It also means it lives on that one device and in that one browser, which is the trade-off worth understanding before you rely on it.'
    ],
    specs: {
      caption: 'What it tracks and where it lives',
      rows: [
        ['Per item', 'Quantity, unit cost, retail price'],
        ['Computes', 'Total units, cost value, retail value'],
        ['Storage', 'Browser local storage — persists between visits'],
        ['Syncs across devices?', '<strong>No</strong>'],
        ['Survives clearing browser data?', '<strong>No</strong>'],
        ['Uploaded anywhere?', 'No'],
        ['Multi-user', 'No — single device, single browser'],
        ['Best for', 'A few dozen lines, one person']
      ]
    },
    steps: [
      'Add each item with its quantity, what it cost you, and what you sell it for.',
      'Read the two totals — cost value is your capital tied up, retail is the ceiling on revenue.',
      'Export or copy the data periodically. See the tip.'
    ],
    tip: 'Copy the data out somewhere else every so often. It is stored in this browser only — clearing site data, using a different device, or a browser deciding to reclaim storage will lose it, with no way back. Treat this as a fast working view, not as the only record of your stock.',
    faqs: [
      { q: 'Where is my inventory stored?', a: 'In your browser’s local storage on this device. Nothing is uploaded, which means nobody else can see it and also that nobody else can recover it. It will not appear on your phone or another computer.' },
      { q: 'Will I lose it?', a: 'You can — clearing browsing data removes it, as can a browser reclaiming storage space under pressure. Keep a copy elsewhere. That warning is not boilerplate; it is the actual failure mode of local storage.' },
      { q: 'Can two people use it together?', a: 'No. It is single-device by design. Shared stock across people needs a hosted system with accounts, and that is a different kind of product.' },
      { q: 'Why show cost value and retail value separately?', a: 'They answer different questions. Cost value is the money currently sitting on your shelves — what you would lose if it were stolen. Retail value is what it could become. Confusing the two is how sellers overestimate how well they are doing.' }
    ],
    related: ['amazon-fba-calculator', 'etsy-fee-calculator', 'break-even', 'profit-margin', 'invoice-generator', 'csv-viewer']
  },

  'business-card-maker': {
    intro: 'Business cards get rejected by printers for one reason more than any other: they were designed on screen at screen resolution, and screen resolution is roughly a quarter of what print needs. The result looks fine in the browser and fuzzy on card.',
    what: [
      'Produces a card at the standard <strong>3.5 × 2 inches</strong>, rendered at <strong>1050 × 600 pixels</strong> — which is exactly 300 DPI, the resolution commercial printers expect.',
      'That arithmetic is the whole point: 3.5 × 300 = 1050, and 2 × 300 = 600. A card designed at 350 × 200 would look identical on screen and print badly.'
    ],
    specs: {
      caption: 'Dimensions',
      rows: [
        ['Physical size', '3.5 × 2 inches (US standard)'],
        ['Pixel size', '1050 × 600'],
        ['Effective resolution', '300 DPI'],
        ['Bleed included?', 'No — keep content away from the edge'],
        ['Safe margin', 'Keep text ~3 mm inside the edge'],
        ['Output', 'Downloadable image'],
        ['Colour', 'RGB — printers may shift it slightly to CMYK'],
        ['Privacy', 'Generated on-device']
      ]
    },
    steps: [
      'Enter your details — name, role, and the one or two ways you actually want to be contacted.',
      'Keep text clear of the outer few millimetres.',
      'Download and send to your printer.',
      'Ask the printer whether they need bleed before ordering a large run.'
    ],
    tip: 'Leave about 3 mm of clear space inside every edge. Printers cut through stacks of cards and the blade drifts by a fraction of a millimetre — text set close to the edge on the design ends up touching the edge, or cut off, on some cards in the stack. That margin is why professional cards look centred and home-made ones do not.',
    faqs: [
      { q: 'Why 1050 × 600 pixels?', a: 'Because that is 3.5 × 2 inches at 300 DPI, the standard print resolution. Designing at screen resolution — say 350 × 200 — gives a file that looks correct in a browser and prints visibly soft, which is the most common reason a card comes back disappointing.' },
      { q: 'Is this the right size everywhere?', a: '3.5 × 2 in is the US standard. Much of Europe uses 85 × 55 mm and Japan 91 × 55 mm — close but not identical. Check with your printer if you are outside the US.' },
      { q: 'What is bleed, and do I need it?', a: 'Bleed is extra artwork past the trim line so that a colour running to the edge still does after cutting. This does not add bleed, so keep backgrounds and text away from the edge, or ask your printer whether they need a bleed version.' },
      { q: 'Why might the colours look different when printed?', a: 'Screens are RGB and presses are CMYK, and some bright RGB colours simply cannot be reproduced in ink. Vivid blues and greens shift most. Ask for a proof before a large run.' }
    ],
    related: ['qr-business-card', 'business-name-generator', 'resume-builder', 'favicon-generator', 'social-media-image', 'compress-image']
  },

  'qr-business-card': {
    intro: 'Handing someone a card means hoping they type your details in later. Most do not. A QR code that adds you to their phone directly removes the step where your contact information gets lost.',
    what: [
      'Encodes your details as a <strong>vCard</strong> — the standard contact format every phone understands — inside a QR code. Scanning it opens a prefilled "add contact" screen rather than a web page.',
      'The data is <em>inside</em> the code, not fetched from a server. Nothing is stored anywhere, nothing expires, and the code keeps working forever with no service behind it.'
    ],
    specs: {
      caption: 'Format and behaviour',
      rows: [
        ['Encoding', 'vCard, embedded directly in the QR'],
        ['On scan', 'Opens the phone’s "add contact" screen'],
        ['Requires a server?', 'No — the data is in the code itself'],
        ['Can it expire?', 'No'],
        ['Typical fields', 'Name, phone, email, organisation, website'],
        ['Trade-off', 'More fields means a denser, harder-to-scan code'],
        ['Scanner', 'Built into every modern phone camera'],
        ['Privacy', 'Generated on-device; nothing is uploaded']
      ]
    },
    steps: [
      'Enter the details you actually want on a stranger’s phone.',
      'Generate and download the code.',
      'Print it at a decent size — around 2 cm square is the practical minimum.',
      'Scan it yourself with a real phone before ordering anything.'
    ],
    tip: 'Include fewer fields than you think. Every extra character makes the QR pattern denser, and a dense code printed small on card stock fails to scan in ordinary indoor light — which is exactly where people will try it. Name, phone, email and company is plenty; the full postal address is what usually pushes it over.',
    faqs: [
      { q: 'What happens when someone scans it?', a: 'Their phone recognises the vCard and offers to add a new contact with the fields already filled. No app, no website, no typing — which is the entire advantage over printing your email address.' },
      { q: 'Will it stop working?', a: 'No. The details are encoded in the pattern itself rather than pointing at a URL, so there is no service to shut down and no link to rot. Dynamic QR codes sold by marketing services do depend on their provider staying alive; this does not.' },
      { q: 'How small can I print it?', a: 'About 2 cm square is the practical floor, and larger is safer for a denser code. Test the actual print rather than the screen — paper, ink and lighting all cost you scan reliability.' },
      { q: 'Can I update my details later?', a: 'Not on cards already printed — the data is fixed in the pattern. That is the trade-off for it never expiring. If your details change often, encode a link to a page you control instead.' }
    ],
    related: ['business-card-maker', 'qr-generator', 'business-name-generator', 'barcode-generator', 'favicon-generator', 'resume-builder']
  },

  /* ============ batch 10 — the unit converters ============
   * Seven pages that were 100% identical, from converterTool(UNITS, from, to)
   * in tools-calc2.js — one factory, seven unit tables.
   *
   * The differentiator is that each dimension has its OWN trap, and they are
   * genuinely different traps: temperature has an offset rather than a factor,
   * US and UK gallons differ by 20%, storage vendors use 1000 where this uses
   * 1024, and area factors are the SQUARE of the length factors. Every number
   * below is the exact `f` value from the source. */

  'length-converter': {
    intro: 'Length is the conversion people get almost right and then get wrong by a fraction — because the factors everyone remembers are rounded, and rounding compounds. An inch is not about 2.5 cm; it is exactly 25.4 mm, by international agreement since 1959.',
    what: [
      'Converts between metric, imperial and nautical units using the exact defined factors rather than the approximations. A mile is exactly 1609.344 m, a yard exactly 0.9144 m, a foot exactly 0.3048 m.',
      'Includes <strong>nautical miles</strong> at exactly 1852 m — a different unit from the statute mile, defined as one minute of latitude, and the reason aviation and shipping speeds are quoted in knots rather than mph.'
    ],
    specs: {
      caption: 'Exact factors, in metres',
      rows: [
        ['Kilometre', '1000'],
        ['Mile', '1609.344 — exact by definition'],
        ['Nautical mile', '1852 — exact, one minute of latitude'],
        ['Yard', '0.9144 — exact'],
        ['Foot', '0.3048 — exact'],
        ['Inch', '0.0254 — exactly 25.4 mm'],
        ['Centimetre / millimetre', '0.01 / 0.001'],
        ['Default conversion', 'Miles → kilometres']
      ]
    },
    steps: [
      'Enter the value.',
      'Pick the unit you have and the unit you want.',
      'Read the result — all other units are shown alongside.'
    ],
    tip: 'A nautical mile is not a mile. At 1852 m it is about 15% longer than the statute mile, which is why a boat doing 20 knots is moving at roughly 23 mph. Converting the two as though they were the same is a common and occasionally expensive error in navigation and shipping paperwork.',
    faqs: [
      { q: 'Is an inch exactly 2.54 cm?', a: 'Yes, exactly — since the 1959 international yard and pound agreement, which defined the inch as precisely 25.4 mm. Before that the US and UK inches differed very slightly, which caused real problems in engineering.' },
      { q: 'What is a nautical mile for?', a: 'It equals one minute of latitude, so it maps directly onto a chart — 60 nautical miles is one degree of latitude. That makes navigation arithmetic trivial, which is why marine and aviation distances use it and speeds are given in knots.' },
      { q: 'Why not just multiply by 1.6 for miles?', a: 'For rough mental arithmetic it is fine. Over a marathon it is out by about 150 m, and in anything engineering or legal the rounding is not acceptable — the exact factor is 1.609344.' },
      { q: 'Which units are metric here?', a: 'Metre, kilometre, centimetre and millimetre. Mile, yard, foot and inch are imperial/US customary, and the nautical mile belongs to neither system.' }
    ],
    related: ['unit-converter', 'area-converter', 'speed-converter', 'weight-converter', 'distance-calculator', 'volume-converter']
  },

  'weight-converter': {
    intro: 'Recipes, freight documents and bathroom scales all use different units for the same quantity, and the one that trips people up is the stone — a unit of 14 pounds that is still in everyday use in Britain and Ireland and almost nowhere else.',
    what: [
      'Converts between metric and imperial mass units using exact factors. A pound is exactly 0.45359237 kg, defined by the same 1959 agreement that fixed the inch.',
      'Includes <strong>stone</strong> at 6.35029318 kg — exactly 14 pounds. Software written outside the UK routinely omits it, which is why British body-weight figures so often need converting by hand.'
    ],
    specs: {
      caption: 'Exact factors, in kilograms',
      rows: [
        ['Tonne', '1000 — metric tonne, not a US ton'],
        ['Pound', '0.45359237 — exact by definition'],
        ['Ounce', '0.0283495231'],
        ['Stone', '6.35029318 — exactly 14 pounds'],
        ['Gram', '0.001'],
        ['Milligram', '0.000001'],
        ['Default conversion', 'Pounds → kilograms'],
        ['Strictly', 'These are units of MASS, not weight']
      ]
    },
    steps: [
      'Enter the value.',
      'Choose the unit you have and the one you want.',
      'Read the result alongside every other unit.'
    ],
    tip: 'Watch which ton you mean. A metric tonne is 1000 kg, a US short ton is about 907 kg, and a UK long ton about 1016 kg — a spread of over 10%. Freight paperwork that says "ton" without qualifying it is ambiguous, and the difference is real money on a shipping invoice.',
    faqs: [
      { q: 'How many pounds in a stone?', a: 'Exactly 14, which is 6.35029318 kg. It survives in everyday use in Britain and Ireland for body weight and almost nowhere else, so most software omits it entirely.' },
      { q: 'Is a tonne the same as a ton?', a: 'No, and this catches people out. A tonne is metric, 1000 kg. A US short ton is 2000 lb, about 907 kg; a UK long ton is 2240 lb, about 1016 kg. Only the metric tonne is listed here, to avoid the ambiguity.' },
      { q: 'Mass or weight — does the distinction matter?', a: 'Technically these are mass units; weight is a force and varies with gravity. In everyday use the two are treated as interchangeable on Earth, and only physics and some engineering contexts need to care.' },
      { q: 'Why is a pound such an odd number of kilograms?', a: 'Because 0.45359237 was chosen in 1959 to reconcile slightly different existing US and UK pounds. It is exact by definition rather than derived — the awkwardness is the price of making both countries agree.' }
    ],
    related: ['unit-converter', 'length-converter', 'volume-converter', 'bmi-calculator', 'ideal-weight-calculator', 'macro-calculator']
  },

  'temperature-converter': {
    intro: 'Temperature is the one conversion you cannot do by multiplying, and that is why the mental shortcuts everyone uses for other units fail here. The scales have different zero points as well as different step sizes.',
    what: [
      'Converts between Celsius, Fahrenheit and Kelvin. Because the scales are <strong>offset</strong>, each conversion needs both a factor and an addition: °F = °C × 9/5 + 32, and K = °C + 273.15.',
      'That offset is why doubling a temperature is meaningless. 20 °C is not twice as hot as 10 °C in any physical sense — only Kelvin, which starts at absolute zero, supports that kind of arithmetic.'
    ],
    specs: {
      caption: 'Scales and reference points',
      rows: [
        ['Celsius → Fahrenheit', '× 9/5, then + 32'],
        ['Celsius → Kelvin', '+ 273.15'],
        ['Water freezes', '0 °C · 32 °F · 273.15 K'],
        ['Water boils', '100 °C · 212 °F · 373.15 K'],
        ['Absolute zero', '−273.15 °C · −459.67 °F · 0 K'],
        ['The scales cross at', '−40 — the same number in °C and °F'],
        ['Kelvin has no degree sign', 'Written "300 K", not "300 °K"'],
        ['Why offsets matter', 'Ratios are only meaningful in Kelvin']
      ]
    },
    steps: [
      'Enter the temperature.',
      'Choose the scale it is in.',
      'Read all three scales at once.'
    ],
    tip: '−40 is the same in Celsius and Fahrenheit — the point where the two scales cross. It is a useful sanity check: if you have written a conversion and it does not agree at −40, the formula is wrong. It is also why the aviation industry can quote −40 without specifying which scale.',
    faqs: [
      { q: 'Why can I not just multiply to convert temperature?', a: 'Because the scales have different zero points. Length units all start at zero length, so a single factor works. Celsius starts at water freezing and Fahrenheit 32 degrees below it, so the conversion needs an addition as well as a multiplication.' },
      { q: 'Is 20 °C twice as warm as 10 °C?', a: 'No. Ratios only mean anything on a scale that starts at absolute zero, which is Kelvin. In Kelvin those two are 293.15 and 283.15 — barely 3% apart, which is much closer to how they actually feel.' },
      { q: 'Why 273.15 and not 273?', a: 'Because the Kelvin scale is defined so that water’s triple point falls at exactly 273.16 K, putting 0 °C at 273.15 K. The .15 is not a rounding artefact; dropping it introduces a real error in scientific work.' },
      { q: 'Should I write °K?', a: 'No. Kelvin is an absolute unit and takes no degree symbol — 300 K, not 300 °K. Celsius and Fahrenheit do take it.' }
    ],
    related: ['unit-converter', 'length-converter', 'weight-converter', 'speed-converter', 'water-intake-calculator', 'electricity-cost']
  },

  'speed-converter': {
    intro: 'Car dashboards, weather forecasts, marine charts and physics homework all measure the same thing in four different units — and knots, the one used at sea and in the air, is the one most converters leave out.',
    what: [
      'Converts between m/s, km/h, mph, knots and ft/s using exact factors relative to metres per second.',
      'A <strong>knot</strong> is one nautical mile per hour — exactly 0.5144444… m/s. Because a nautical mile is a minute of latitude, a vessel at 30 knots covers half a degree of latitude an hour, which is why the unit survives.'
    ],
    specs: {
      caption: 'Exact factors, in metres per second',
      rows: [
        ['m/s', '1 — the SI unit'],
        ['km/h', '0.2777… — that is 1/3.6'],
        ['mph', '0.44704 — exact'],
        ['Knot', '0.5144444… — one nautical mile per hour'],
        ['ft/s', '0.3048 — exact'],
        ['Quick check', 'km/h ÷ 3.6 = m/s'],
        ['Rough check', 'Knots × 1.15 ≈ mph'],
        ['Default conversion', 'mph → km/h']
      ]
    },
    steps: [
      'Enter the speed.',
      'Choose the unit you have and the unit you want.',
      'Read every unit at once.'
    ],
    tip: 'Divide km/h by 3.6 to get m/s. It is exact rather than approximate, and it is the conversion that comes up constantly in physics problems where speeds are quoted in km/h and every formula expects m/s. 90 km/h is exactly 25 m/s.',
    faqs: [
      { q: 'What exactly is a knot?', a: 'One nautical mile per hour, so about 1.15 mph or 1.85 km/h. It persists because a nautical mile is one minute of latitude, making speed and position arithmetic straightforward on a chart.' },
      { q: 'How do I convert km/h to m/s in my head?', a: 'Divide by 3.6. That is exact — there are 3600 seconds in an hour and 1000 metres in a kilometre, so the factor is 1000/3600.' },
      { q: 'Is mph exactly defined?', a: 'Yes. A mile is exactly 1609.344 m and an hour is 3600 seconds, so one mph is exactly 0.44704 m/s. All the factors here are exact rather than rounded.' },
      { q: 'Where is ft/s used?', a: 'Mostly US engineering and ballistics, where muzzle velocities are conventionally quoted in feet per second. It is otherwise rare in everyday use.' }
    ],
    related: ['unit-converter', 'length-converter', 'pace-calculator', 'distance-calculator', 'fuel-economy-converter', 'temperature-converter']
  },

  'area-converter': {
    intro: 'Area is where unit conversion quietly goes wrong, because the factors are not the ones you already know. If a metre is 3.28 feet, a square metre is not 3.28 square feet — it is 10.76, because the factor gets squared along with the unit.',
    what: [
      'Converts between metric and imperial area units using exact squared factors. A square foot is 0.09290304 m² — which is 0.3048 squared, not 0.3048.',
      'Includes the two units land is actually traded in: the <strong>hectare</strong> at exactly 10,000 m², and the <strong>acre</strong> at 4046.8564224 m². An acre is roughly 0.405 hectares, which is not a round number in either direction.'
    ],
    specs: {
      caption: 'Exact factors, in square metres',
      rows: [
        ['km²', '1,000,000'],
        ['Hectare', '10,000 — a square 100 m on each side'],
        ['Acre', '4046.8564224'],
        ['ft²', '0.09290304 — that is 0.3048²'],
        ['yd²', '0.83612736 — that is 0.9144²'],
        ['mi²', '2,589,988.11'],
        ['cm²', '0.0001'],
        ['Acres per hectare', 'About 2.471']
      ]
    },
    steps: [
      'Enter the area.',
      'Pick the units.',
      'Read the result — every unit is shown together.'
    ],
    tip: 'Never convert an area by applying a length factor. Doubling the sides of a room quadruples its floor area, and the same relationship applies to units: the length factor must be squared. This is the single commonest error in flooring, paint and land-area estimates, and it is always wrong by a factor of the conversion itself.',
    faqs: [
      { q: 'Why is a square foot 0.0929 m² and not 0.3048?', a: 'Because area is two-dimensional. A foot is 0.3048 m, and 0.3048 × 0.3048 = 0.09290304. Using the length factor for an area gives an answer wrong by a factor of about 3.28.' },
      { q: 'How many acres in a hectare?', a: 'About 2.471. A hectare is exactly 10,000 m² — a neat square 100 m a side — while an acre is a historical unit at 4046.8564224 m², so the ratio is deliberately not round.' },
      { q: 'Where did the acre come from?', a: 'Traditionally the area one man with one ox could plough in a day, which is why it is 4840 square yards rather than anything tidy. It survives in land dealings in the US, UK and Ireland.' },
      { q: 'Which unit should I use for land?', a: 'Follow local convention: hectares in most of the world, acres in the US, and both in the UK and Ireland where deeds may use either. Converting between them is exactly what this is for.' }
    ],
    related: ['unit-converter', 'length-converter', 'volume-converter', 'cap-rate', 'rental-yield', 'percentage-calculator']
  },

  'volume-converter': {
    intro: 'A recipe calling for a gallon means two different amounts depending on which side of the Atlantic wrote it — and the gap is 20%, which is more than enough to ruin the recipe or the fuel-economy figure.',
    what: [
      'Converts between metric and US customary volumes, and includes the <strong>UK gallon</strong> separately at 4.54609 L against the US gallon’s 3.785411784 L.',
      'Every cooking unit here is <strong>US</strong> — cups, pints, quarts and fluid ounces all differ between the US and UK, and quietly mixing the two is how a recipe fails.'
    ],
    specs: {
      caption: 'Exact factors, in litres',
      rows: [
        ['US gallon', '3.785411784'],
        ['<strong>UK gallon</strong>', '<strong>4.54609 — 20% larger</strong>'],
        ['US quart', '0.946352946'],
        ['US pint', '0.473176473'],
        ['US cup', '0.2365882365 — about 237 ml'],
        ['US fluid ounce', '0.0295735296'],
        ['Tablespoon / teaspoon', '0.0147867648 / 0.00492892159'],
        ['m³', '1000']
      ]
    },
    steps: [
      'Enter the volume.',
      'Choose the units — and check whether a recipe is US or UK before assuming.',
      'Read the result.'
    ],
    tip: 'A UK pint is 568 ml and a US pint is 473 ml — a difference of nearly 20%. In a recipe that is the gap between working and not; in a fuel-economy figure it makes a car look dramatically more or less efficient than it is. If a source does not say which system it uses, the spelling usually tells you: "litre" and "colour" mean UK.',
    faqs: [
      { q: 'Why are US and UK gallons different?', a: 'They descend from different historical standards and were never reconciled. The US kept an older wine gallon; the UK redefined its gallon in 1824 as the volume of ten pounds of water. The 20% gap has persisted ever since.' },
      { q: 'Is a cup here US or UK?', a: 'US, at about 237 ml. A metric cup is 250 ml and the UK does not really use cups at all, preferring weight. For baking especially, weigh ingredients if you can — it removes the ambiguity entirely.' },
      { q: 'How much is a UK pint?', a: 'About 568 ml, against 473 ml for a US pint. It is why a pint of beer is noticeably larger in Britain, and why converting drinks measures across the Atlantic needs care.' },
      { q: 'Which units here are metric?', a: 'Litres, millilitres and cubic metres. Everything else is US customary apart from the UK gallon, which is listed separately precisely because the ambiguity causes errors.' }
    ],
    related: ['unit-converter', 'weight-converter', 'length-converter', 'area-converter', 'fuel-economy-converter', 'water-intake-calculator']
  },

  'data-converter': {
    intro: 'A 1 TB drive shows up as about 931 GB in your operating system, and nothing is wrong or missing. Two different definitions of "gigabyte" are in circulation, and the gap between them widens at every step up the scale.',
    what: [
      'Converts storage and bandwidth units using <strong>binary</strong> multiples of 1024 — the convention operating systems use, where a kilobyte is 1024 bytes and a gigabyte is 1,073,741,824.',
      'Also converts <strong>bits</strong>. This is the other classic confusion: internet speeds are quoted in megabits per second, file sizes in megabytes, and there are 8 bits in a byte — so a 100 Mbps line downloads at about 12.5 MB/s at best.'
    ],
    specs: {
      caption: 'Exact factors, in bytes',
      rows: [
        ['Kilobyte', '1024'],
        ['Megabyte', '1,048,576 — that is 1024²'],
        ['Gigabyte', '1,073,741,824 — 1024³'],
        ['Terabyte', '1,099,511,627,776 — 1024⁴'],
        ['Bit', '0.125 — eight bits to a byte'],
        ['Megabit', '131,072'],
        ['Drive manufacturers use', '1000, not 1024 — hence "missing" space'],
        ['1 TB advertised shows as', 'About 931 GB in your OS']
      ]
    },
    steps: [
      'Enter the amount.',
      'Choose the units, watching bits against bytes.',
      'Read the result.'
    ],
    tip: 'Divide a megabit figure by 8 to get megabytes. A 100 Mbps connection tops out around 12.5 MB/s, so a 1 GB download takes at least 80 seconds even on a perfect line. Internet providers quote bits because the number is eight times bigger, and it is the single most misread figure in consumer technology.',
    faqs: [
      { q: 'Why does my 1 TB drive show as 931 GB?', a: 'Manufacturers count a terabyte as 1,000,000,000,000 bytes; your operating system counts it as 1024⁴, which is about 1.0995 trillion. Dividing one by the other gives roughly 931. Nothing is lost — the two are just using different definitions of the same word.' },
      { q: 'Which does this tool use, 1000 or 1024?', a: '1024, matching what your operating system reports. If you are checking against a manufacturer’s figure, expect a difference of about 7% at gigabyte scale and 10% at terabyte scale.' },
      { q: 'What is the difference between Mb and MB?', a: 'Capitalisation, and a factor of eight. Mb is megabits, used for connection speeds; MB is megabytes, used for file sizes. A 100 Mb/s line delivers at most about 12.5 MB/s.' },
      { q: 'What are KiB and MiB?', a: 'The unambiguous binary units — kibibyte and mebibyte — defined precisely to end this confusion. They mean 1024 and 1024², exactly what this tool uses for KB and MB. Adoption outside technical documentation has been slow.' }
    ],
    related: ['unit-converter', 'upload-time', 'bitrate-calculator', 'compress-video', 'file-checksum', 'compress-image']
  },

  /* ============ batch 11 — streaming cluster, part 1 ============
   * 13 pages, 78 duplicate pairs. Figures read from tools-calc2.js and
   * tools-video.js: the 60% upload-headroom rule, the resolution/fps bitrate
   * ladder, per-platform caps, and the Twitch emote sizes. */

  'obs-settings-assistant': {
    intro: 'Dropped frames are almost never a hardware problem. They are a bitrate problem — the stream is trying to push more data than the connection can carry, and the encoder gives up frames rather than fall behind.',
    what: [
      'Works out a safe bitrate from three things: what your resolution and frame rate ideally want, what your platform will accept, and — the one that usually decides — what your upload can actually sustain.',
      'The upload figure is deliberately conservative: it uses <strong>60% of your measured speed</strong>. Streaming at 100% of a line that occasionally dips is how you drop frames during exactly the moments that matter.'
    ],
    specs: {
      caption: 'The ladder and the caps',
      rows: [
        ['1080p60', '6000 kbps ideal'],
        ['1080p30', '4500 kbps'],
        ['720p60', '4500 kbps'],
        ['720p30', '3000 kbps'],
        ['480p60 / 480p30', '2000 / 1500 kbps'],
        ['Platform caps', 'Twitch 8500 · YouTube 12000 · Kick 8000 · Facebook 6000'],
        ['<strong>Upload headroom</strong>', '<strong>60% of your measured speed</strong>'],
        ['Floor', 'Never below 500 kbps']
      ]
    },
    steps: [
      'Test your upload speed and enter the real figure, not the one on your bill.',
      'Choose your platform, resolution and frame rate.',
      'If it warns that your upload limits you below the ideal, drop to 30 fps before dropping resolution.'
    ],
    tip: 'Prefer 720p60 over 1080p30 for anything with fast movement. Games especially look better at a higher frame rate and a smaller frame than the reverse, and 720p60 needs 4500 kbps against 1080p60’s 6000 — so it also fits on a connection that cannot sustain full HD.',
    faqs: [
      { q: 'Why only 60% of my upload speed?', a: 'Because the number you measure is a peak, not a floor. Real connections dip, other devices share the line, and a stream that needs 95% of your capacity drops frames the moment anything else uses the network. The 40% margin is what makes a stream stable rather than nominally possible.' },
      { q: 'Should I stream 1080p or 720p?', a: 'If your upload cannot comfortably carry 6000 kbps, 720p60 at 4500 will look better than a starved 1080p. Viewers notice stutter far more than resolution, and most watch in a window smaller than full screen anyway.' },
      { q: 'Why do the platform caps differ?', a: 'Each service sets its own ingest ceiling — YouTube accepts the most at 12000 kbps, Facebook the least at 6000. Sending above the cap does not improve quality; it is either rejected or re-encoded down.' },
      { q: 'I still drop frames at the recommended bitrate.', a: 'Then the bottleneck is elsewhere: an overloaded CPU with x264, wifi rather than ethernet, or another device saturating the line. Try a hardware encoder such as NVENC, and use a cable — wifi is the commonest cause of intermittent drops.' }
    ],
    related: ['bitrate-calculator', 'upload-time', 'compress-video', 'resize-video', 'stream-asset-sizer', 'convert-video']
  },

  'bitrate-calculator': {
    intro: 'Every upload limit is really a bitrate limit wearing a disguise. Fitting a video into a size cap means working backwards: the size and the duration are fixed, so the bitrate is whatever is left over.',
    what: [
      'Takes a target file size and a duration and returns the video bitrate that lands inside it, after subtracting the audio track and container overhead.',
      'The relationship is simply <strong>size = bitrate × duration</strong>, which is why the same 25 MB limit is generous for a 30-second clip and impossible for an hour.'
    ],
    specs: {
      caption: 'Inputs',
      rows: [
        ['Video length', 'In minutes, from 0.1'],
        ['Target file size', 'In MB, from 1'],
        ['Audio bitrate', 'Subtracted from the budget — default 128 kbps'],
        ['Returns', 'The video bitrate that fits'],
        ['Core relationship', 'Size = bitrate × duration'],
        ['Halve the duration', 'Doubles the bitrate you can afford'],
        ['Halve the bitrate', 'Halves the file size'],
        ['Use with', 'OBS, ffmpeg, or any encoder that takes a target rate']
      ]
    },
    steps: [
      'Enter the duration and the size you must fit inside.',
      'Set the audio bitrate you intend to use — it comes out of the same budget.',
      'Take the video bitrate to your encoder.'
    ],
    tip: 'If the answer comes back under about 1000 kbps for 1080p, do not use it — drop the resolution instead. A frame that large starved of data looks blocky in exactly the places viewers look. The same bitrate at 720p, or 480p for a very tight budget, produces a visibly better result.',
    faqs: [
      { q: 'The bitrate it gives me looks impossibly low.', a: 'Then the target is too small for the duration, and no encoder setting fixes that. Your options are a shorter clip, a lower resolution, or a bigger limit. Trimming is usually the least painful, because it removes data at full quality rather than degrading all of it.' },
      { q: 'Why does audio come out of the budget?', a: 'Because the limit applies to the finished file, and the audio track is inside it. At 128 kbps audio takes about 1 MB per minute — on a 25 MB cap for a ten-minute video that is 40% of the space.' },
      { q: 'Should I use this or the Video Compressor?', a: 'The compressor does this arithmetic and the encoding in one step. This tool is for when you are configuring something else — OBS, a hardware encoder, an ffmpeg command — and just need the number.' },
      { q: 'Is a higher bitrate always better?', a: 'Only up to the point where the frame can use it. Beyond that you are storing detail no one can see, and running into upload limits for nothing. The resolution ladder in the OBS assistant shows roughly where that point is.' }
    ],
    related: ['compress-video', 'obs-settings-assistant', 'upload-time', 'resize-video', 'convert-video', 'data-converter']
  },

  'upload-time': {
    intro: 'The number your provider advertises is a download speed, and uploads are usually a fraction of it. That is why a file that took two minutes to download takes twenty to send back, and why "it is nearly done" is such an unreliable estimate.',
    what: [
      'Converts a file size and an upload speed into a realistic transfer time, handling the unit conversion that trips everyone up: <strong>file sizes are in megabytes, connection speeds are in megabits, and there are eight bits in a byte</strong>.',
      'So a 10 Mbps upload moves at most about 1.25 MB per second — before any protocol overhead.'
    ],
    specs: {
      caption: 'The arithmetic',
      rows: [
        ['File size', 'In megabytes (MB)'],
        ['Upload speed', 'In megabits per second (Mbps)'],
        ['<strong>Conversion</strong>', '<strong>Mbps ÷ 8 = MB/s</strong>'],
        ['10 Mbps', 'About 1.25 MB/s at best'],
        ['100 Mbps', 'About 12.5 MB/s at best'],
        ['Real-world', 'Expect 10–20% below theoretical'],
        ['Asymmetric lines', 'Upload is often a tenth of download'],
        ['Wifi', 'Adds variability — use a cable for big transfers']
      ]
    },
    steps: [
      'Enter the file size in MB.',
      'Enter your <strong>upload</strong> speed — test it rather than reading the package name.',
      'Add 10–20% to the answer for overhead.'
    ],
    tip: 'Test your upload speed rather than assuming it. Consumer broadband is usually asymmetric — a 500 Mbps download often comes with a 50 Mbps upload or less — and the advertised headline figure is almost always the download. This is the single reason upload estimates come out so wrong.',
    faqs: [
      { q: 'Why is my upload so much slower than my download?', a: 'Most consumer connections are deliberately asymmetric, on the assumption that people consume more than they send. Cable and DSL are the worst offenders; fibre is often symmetric. Check your actual figure — it is frequently a tenth of the download speed.' },
      { q: 'Why does the real time exceed the estimate?', a: 'Protocol overhead, encryption and the service’s own processing all take a share, and wifi adds variability. Ten to twenty percent above the theoretical figure is normal. Anything far worse suggests wifi or a congested line.' },
      { q: 'How do I convert Mbps to MB/s?', a: 'Divide by eight. A 100 Mbps line moves at most 12.5 MB/s, so a 1 GB file takes at least 80 seconds. Providers quote bits because the number looks eight times larger.' },
      { q: 'Can I make the upload faster?', a: 'Make the file smaller — it is the only lever you control. Compressing a video before uploading often cuts the transfer by more than any network change would.' }
    ],
    related: ['compress-video', 'data-converter', 'bitrate-calculator', 'obs-settings-assistant', 'compress-image', 'compress-pdf']
  },

  'stream-revenue-calculator': {
    intro: 'Streaming income arrives from four places at four different rates, and the one people misjudge is bits — because the number of bits looks impressive and the cash value does not.',
    what: [
      'Adds up subscriptions, bits, donations and ad revenue into a monthly total, so you can see which source is actually carrying you.',
      'The conversions that matter: <strong>bits are worth $0.01 each to you</strong>, and a subscription typically nets the streamer around <strong>half</strong> the sticker price — which is why the tool asks for your net per sub rather than assuming.'
    ],
    specs: {
      caption: 'Conversions',
      rows: [
        ['Bits', '$0.01 each to the streamer'],
        ['5000 bits', '$50'],
        ['Subscription', 'You typically net ~50% of the price'],
        ['Default net per sub', '$2.50 — half of a $4.99 tier'],
        ['Donations', 'Entered directly, minus processor fees'],
        ['Ads', 'Entered directly'],
        ['Total', 'Sum of all four, monthly'],
        ['Before', 'Tax, and any platform payout threshold']
      ]
    },
    steps: [
      'Enter subscriber count and what you actually net per sub — check your dashboard rather than guessing.',
      'Add monthly bits, donations and ad revenue.',
      'Read the total, and note which line dominates.'
    ],
    tip: 'This is gross income, not take-home. You are self-employed in most jurisdictions, so income tax and social contributions come out of it, payment processors take a cut of donations, and platforms hold payouts until you cross a threshold. Budget on something closer to two-thirds of the figure shown.',
    faqs: [
      { q: 'How much is a bit worth?', a: 'One cent to you. Viewers pay more than that — around 1.4 cents depending on the bundle they buy — and the platform keeps the difference. So 5000 bits cheered in a month is $50 of income.' },
      { q: 'What do I actually get per subscriber?', a: 'Usually about half the sticker price, so roughly $2.50 on a $4.99 tier, though larger channels negotiate better splits and Prime subs differ. Use your real figure from the dashboard — the default here is only a common starting point.' },
      { q: 'Is this what I will be paid?', a: 'No. It is gross. Tax, self-employment contributions, processor fees on donations and platform payout thresholds all sit between this number and your bank account.' },
      { q: 'Which income source should I focus on?', a: 'The calculator shows which one dominates for you, which is usually more informative than any general advice. Subs are the most predictable, donations the most volatile, ads the least under your control.' }
    ],
    related: ['hourly-rate', 'paypal-fee-calculator', 'break-even', 'profit-margin', 'stream-schedule-planner', 'cac-ltv-calculator']
  },

  'emote-resizer': {
    intro: 'Emotes are rejected for one reason more than any other: the wrong pixel dimensions. Platforms require exact sizes and will not scale for you, so an emote that is 100 pixels instead of 112 simply fails to upload.',
    what: [
      'Resizes a single image into the exact set of sizes a platform requires, in one pass — because you need all of them, not one.',
      '<strong>Twitch requires three: 112, 56 and 28 pixels square.</strong> Discord uses 128. Missing any one of the Twitch sizes means the emote cannot be submitted.'
    ],
    specs: {
      caption: 'Required sizes',
      rows: [
        ['Twitch', '112 × 112, 56 × 56, 28 × 28 — all three required'],
        ['Discord', '128 × 128'],
        ['Format', 'PNG with transparency'],
        ['Source should be', 'Square, and at least 112 px'],
        ['Why three sizes', 'Chat renders the smallest one'],
        ['Scaling', 'Down only — never upscale an emote'],
        ['Privacy', 'Processed in your browser — never uploaded']
      ]
    },
    steps: [
      'Start from a square image at least 112 px, ideally larger.',
      'Choose the platform pack.',
      'Download every size and upload the full set.'
    ],
    tip: 'Design for the 28-pixel version, because that is the one people actually see in chat. Fine detail, thin outlines and small text all disappear at that size — an emote that reads perfectly at 112 can be an unrecognisable smudge in a fast-moving chat. Check the smallest export before submitting.',
    faqs: [
      { q: 'Why does Twitch need three sizes?', a: 'Different contexts render at different scales — chat uses the smallest, the emote picker and hover previews use the larger ones. Twitch does not scale on your behalf, so all three must be uploaded.' },
      { q: 'My emote was rejected for the wrong size.', a: 'The dimensions must be exact. 112 × 112 means precisely that, not 110 or 115, and the image must be square. This produces exact sizes, which is the point of using it rather than resizing by hand.' },
      { q: 'Can I upload a small image and let this enlarge it?', a: 'You can, but do not. Upscaling invents pixels and produces a soft, blocky emote. Start at 112 or larger — ideally draw at 512 and let everything scale down.' },
      { q: 'Does it keep transparency?', a: 'Yes, PNG transparency is preserved. That matters because emotes appear on both light and dark chat backgrounds, and one with a baked-in white square looks broken on half of them.' }
    ],
    related: ['stream-asset-sizer', 'resize-image', 'circle-crop', 'compress-image', 'round-corners', 'convert-image']
  },

  'stream-asset-sizer': {
    intro: 'Every platform wants different dimensions for the same six pieces of channel art, and each publishes them in a different corner of a help centre. Getting one wrong means a banner cropped through your own face.',
    what: [
      'Resizes an image to the exact dimensions a specific platform slot requires — YouTube thumbnails, channel banners and avatars, Twitch banners, avatars, info panels, offline screens and emotes.',
      'Pick the destination rather than typing numbers, so there is nothing to look up and nothing to mistype.'
    ],
    specs: {
      caption: 'Supported slots',
      rows: [
        ['YouTube', 'Thumbnail, channel banner, profile picture'],
        ['Twitch', 'Profile banner, profile picture, info panel'],
        ['Twitch', 'Offline banner, emote'],
        ['Method', 'Resize to the platform’s exact specification'],
        ['Banners', 'Have a safe area — see the tip'],
        ['Privacy', 'Processed in your browser — never uploaded'],
        ['Next step', 'Compress before uploading if the file is large']
      ]
    },
    steps: [
      'Choose what you are making.',
      'Add your image.',
      'Resize, download, and preview on both mobile and desktop before committing.'
    ],
    tip: 'Channel banners are the one to be careful with. The full image only ever appears on a desktop TV layout; phones crop hard to the centre, and that is where most people will see it. Keep your name and anything essential in the middle third, and treat the outer edges as decoration that may never be seen.',
    faqs: [
      { q: 'Why does my banner look cropped on mobile?', a: 'Because it is. Channel banners are displayed at very different aspect ratios across TV, desktop and mobile, and the platform crops to the centre on small screens. Design for the centre and let the edges be scenery.' },
      { q: 'Does resizing hurt quality?', a: 'Scaling down is safe and often sharpens the result. Scaling up is not — always start from an image at least as large as the target.' },
      { q: 'Should I compress after resizing?', a: 'If the file is large, yes. Platforms enforce file size limits as well as dimensions, and a correctly sized banner can still be rejected for weight. Run it through Compress Image afterwards.' },
      { q: 'Are these dimensions current?', a: 'They match the platforms’ published specifications, but platforms do change them occasionally. If an upload is rejected on size, check the current help page — and the tool will be updated.' }
    ],
    related: ['emote-resizer', 'thumbnail-maker', 'social-media-image', 'resize-image', 'compress-image', 'crop-image']
  },

  /* ============ batch 11 — streaming cluster, part 2 (completes it) ============ */

  'starting-soon-screen': {
    intro: 'The first two minutes of a stream are the ones with the most people watching and the least happening. A holding screen turns dead air into something intentional — and gives you time to check your levels before anyone judges them.',
    what: [
      'Generates a full-screen holding card with your text, sized for a stream canvas, ready to add as a browser or image source in OBS.',
      'It is a static screen by design, so it costs no CPU while it is up — which matters, because the moments before going live are when you are still loading everything else.'
    ],
    specs: {
      caption: 'Use and setup',
      rows: [
        ['Purpose', 'A holding card before the stream starts'],
        ['Output', 'An image for an OBS source'],
        ['CPU cost while shown', 'None — it is static'],
        ['Typical duration', 'Two to five minutes'],
        ['Add to OBS as', 'An image source in its own scene'],
        ['Pair with', 'Music, so viewers know audio works'],
        ['Privacy', 'Generated in your browser']
      ]
    },
    steps: [
      'Write the text — "Starting soon" plus what the stream is about.',
      'Download and add it as an image source in a dedicated OBS scene.',
      'Go live on that scene a few minutes early, then switch.'
    ],
    tip: 'Play music over it. A silent starting screen is indistinguishable from a broken stream, and viewers who cannot tell the difference leave rather than wait. Audible music is the clearest possible signal that everything is working and something is about to happen.',
    faqs: [
      { q: 'How long should I leave it up?', a: 'Two to five minutes. Long enough for the platform to notify followers and for people to arrive, short enough that early viewers do not give up. Longer than five and you are training people to show up late.' },
      { q: 'Should I add a countdown?', a: 'Only if you will honour it. A timer that hits zero while the screen is still up is worse than no timer, because it tells viewers the stream is unreliable before it has begun.' },
      { q: 'Does it slow my stream down?', a: 'No. A static image costs essentially nothing to encode, unlike an animated scene. That is useful precisely when you are still loading a game and the rest of your setup.' },
      { q: 'What should it say?', a: 'What the stream is, not just that it is starting. Someone arriving from a browse page decides in seconds whether to stay, and "Starting soon" alone tells them nothing to stay for.' }
    ],
    related: ['brb-overlay', 'stream-overlay-creator', 'stream-alert-creator', 'stream-asset-sizer', 'stream-schedule-planner', 'obs-settings-assistant']
  },

  'brb-overlay': {
    intro: 'Every stream needs a break, and how you take it decides whether the audience is still there afterwards. Cutting the feed loses people instantly; a BRB screen holds them because it promises you are coming back.',
    what: [
      'Creates a "be right back" card to switch to during a break — sized for a stream canvas and ready as an OBS source.',
      'Keeping the stream running matters more than the design: the platform keeps you in the live directory, chat keeps talking, and returning viewers find you where they left you.'
    ],
    specs: {
      caption: 'Use and setup',
      rows: [
        ['Purpose', 'A holding card during a break'],
        ['Output', 'An image for an OBS source'],
        ['Keeps you live?', 'Yes — the stream never stops'],
        ['Add to OBS as', 'An image source in its own scene'],
        ['Mute your mic', 'Do this before switching, not after'],
        ['Typical duration', 'Under ten minutes'],
        ['Privacy', 'Generated in your browser']
      ]
    },
    steps: [
      'Make the card and add it as a separate OBS scene.',
      'Bind a hotkey to that scene so switching is one keypress.',
      '<strong>Mute your microphone before you switch</strong>, not after.'
    ],
    tip: 'Mute the mic first, every time. The scene changes instantly and the microphone does not — the gap between switching and remembering is exactly long enough to broadcast something you did not intend to. Make muting the first half of the hotkey, not an afterthought.',
    faqs: [
      { q: 'Why not just end the stream?', a: 'Ending drops you out of the live directory, disconnects chat and loses everyone watching. A BRB screen keeps the stream up, keeps the conversation going and lets people drift back — which they will not do if there is nothing to drift back to.' },
      { q: 'How long can I leave it?', a: 'Under ten minutes as a rule. Beyond that viewers assume you are not returning, and platforms may reduce your visibility while nothing is happening on the feed.' },
      { q: 'Should I keep music playing?', a: 'Yes, for the same reason as the starting screen — audio proves the stream is alive. Use something licensed for streaming; a copyright claim on a break screen is a particularly annoying way to earn one.' },
      { q: 'Will my microphone stay live?', a: 'Only if you leave it live. Switching scenes does not mute anything, and this is the single most common streaming accident. Bind mute and scene change to the same hotkey if your setup allows.' }
    ],
    related: ['starting-soon-screen', 'stream-overlay-creator', 'stream-alert-creator', 'mute-video', 'stream-asset-sizer', 'obs-settings-assistant']
  },

  'stream-overlay-creator': {
    intro: 'Overlays exist to frame the content, and the commonest mistake is letting them compete with it. A viewer who is reading your webcam border instead of watching the game has been distracted by decoration.',
    what: [
      'Builds a stream overlay you can add as an OBS source — the frame around your content, including webcam borders and information panels.',
      'Deliberately static rather than animated: an animated overlay re-encodes every frame it touches, which costs CPU your encoder needs.'
    ],
    specs: {
      caption: 'Design and setup',
      rows: [
        ['Output', 'An overlay image for OBS'],
        ['Animated?', 'No — static, to protect encoder CPU'],
        ['Add to OBS as', 'An image source above your game/camera'],
        ['Safe area', 'Keep the centre clear'],
        ['Chat and alerts', 'Add separately as their own sources'],
        ['Transparency', 'Preserved, so content shows through'],
        ['Privacy', 'Generated in your browser']
      ]
    },
    steps: [
      'Design the frame, keeping the middle of the canvas empty.',
      'Add it as an image source above your game and camera.',
      'Check it against actual gameplay, not a still — moving content is where clutter shows.'
    ],
    tip: 'Leave the bottom third emptier than feels right. Platforms overlay their own controls, captions and chat prompts there, and on mobile the player UI covers more of it again. An overlay that looks balanced in OBS can have its lower elements completely hidden for a large share of your audience.',
    faqs: [
      { q: 'Will an overlay slow my stream?', a: 'A static one costs almost nothing. Animated overlays and browser sources running effects do consume CPU, and that is CPU your encoder is competing for — which shows up as dropped frames rather than as a slow overlay.' },
      { q: 'How much of the screen should it cover?', a: 'Less than you think. The content is what people came for; the overlay is a frame. If a viewer has to look past your design to see the game, the design is too big.' },
      { q: 'Where do alerts and chat go?', a: 'As separate sources, added on top. Keeping them independent means you can move or disable them per scene without rebuilding the overlay.' },
      { q: 'Should it match my channel art?', a: 'Yes — consistent colour between overlay, banner and emotes is what makes a channel feel deliberate. The Stream Asset Sizer handles the other pieces at the correct dimensions.' }
    ],
    related: ['stream-alert-creator', 'brb-overlay', 'starting-soon-screen', 'stream-asset-sizer', 'chat-overlay-tool', 'emote-resizer']
  },

  'stream-alert-creator': {
    intro: 'Alerts are the moment a viewer becomes visible to everyone watching, and they are the reason people subscribe on stream rather than quietly in a menu. Getting them wrong is mostly a matter of length.',
    what: [
      'Creates alert graphics for follows, subscriptions, donations and raids, ready to add to your alert system as an image.',
      'The design constraint is that an alert interrupts. It has to be noticed and then get out of the way, which is a much shorter window than most people design for.'
    ],
    specs: {
      caption: 'Design guidance',
      rows: [
        ['Covers', 'Follows, subs, donations, raids'],
        ['Output', 'Alert graphics for your alert service'],
        ['Recommended duration', '3 to 5 seconds'],
        ['Position', 'Away from the centre of the action'],
        ['Sound', 'Short, and quieter than you think'],
        ['Transparency', 'Preserved'],
        ['Privacy', 'Generated in your browser']
      ]
    },
    steps: [
      'Design one alert per event type so they are distinguishable at a glance.',
      'Add them to your alert service.',
      'Test every type before going live — a broken alert is only discovered in public.'
    ],
    tip: 'Three to five seconds, and quieter than feels right. An alert that lingers stops the stream dead every time it fires, and on a good night that is constant. The sound especially: what feels punchy in a quiet room at design time is startling over gameplay audio at viewer volume.',
    faqs: [
      { q: 'How long should an alert stay up?', a: 'Three to five seconds. Long enough to read the name, short enough that ten in a row do not derail the stream. If you are ever grateful an alert has finished, it was too long.' },
      { q: 'Should each event type look different?', a: 'Yes. Viewers learn to recognise a sub versus a raid instantly if they look distinct, and that recognition is part of what makes alerts feel meaningful rather than noisy.' },
      { q: 'Where should alerts appear?', a: 'Away from the centre, and away from anything you need to see to play. Upper corners are conventional because they interrupt least while still being noticed.' },
      { q: 'Why do my alerts feel too loud?', a: 'Because you set the level in a quiet room with no game audio. Test them over actual gameplay at the volume viewers use — alert sounds are almost universally mixed too hot.' }
    ],
    related: ['stream-overlay-creator', 'emote-resizer', 'brb-overlay', 'starting-soon-screen', 'stream-asset-sizer', 'chat-overlay-tool']
  },

  'chat-overlay-tool': {
    intro: 'Putting chat on screen is what makes a VOD watchable afterwards — someone catching the recording sees the reactions, not just your half of the conversation. It also lets you read chat without looking away.',
    what: [
      'Creates a styled chat overlay to add as a browser source in OBS, so messages appear on the stream itself.',
      'It changes what a VOD is worth. Without it, a recording of a stream is one side of a conversation; with it, the jokes land.'
    ],
    specs: {
      caption: 'Setup and considerations',
      rows: [
        ['Add to OBS as', 'A browser source'],
        ['Purpose', 'Show chat on stream and in the VOD'],
        ['Readability', 'Needs an outline or shadow over video'],
        ['Message count', 'Fewer is better — 5 to 8 lines'],
        ['Moderation', 'Whatever appears on screen is in the recording'],
        ['CPU', 'A browser source costs more than a static image'],
        ['Privacy', 'Generated in your browser']
      ]
    },
    steps: [
      'Style it for contrast — text over video needs an outline or shadow.',
      'Add it as a browser source and position it clear of the action.',
      'Test with real chat moving, not a static preview.'
    ],
    tip: 'Whatever appears in the overlay is baked into the VOD permanently. A message your moderators delete two seconds later is still in the recording, and you cannot edit it out without re-encoding the whole thing. If your chat is fast or your moderation is thin, showing fewer lines is safer than showing more.',
    faqs: [
      { q: 'Why is my chat overlay hard to read?', a: 'Plain text over video is unreadable whenever the background is busy or bright. Add a strong outline or drop shadow, or a semi-transparent panel behind the text — contrast matters far more than font choice.' },
      { q: 'How many messages should I show?', a: 'Five to eight lines. More becomes a wall that nobody reads and that covers your content; fewer scrolls too fast to follow during a busy moment.' },
      { q: 'Do deleted messages disappear from the VOD?', a: 'No. The overlay is recorded as part of the video, so anything that appeared is permanent. That is worth weighing before showing chat on a channel with heavy traffic.' },
      { q: 'Does a browser source hurt performance?', a: 'It costs more than a static image, since it is effectively a small web page rendering continuously. On a CPU-constrained machine that competes with your encoder — one more reason to keep the overlay simple.' }
    ],
    related: ['stream-overlay-creator', 'stream-alert-creator', 'brb-overlay', 'obs-settings-assistant', 'starting-soon-screen', 'giveaway-picker']
  },

  'giveaway-picker': {
    intro: 'Picking a winner in front of an audience has one requirement above all others: it must be visibly fair. A name that appears without anyone seeing how invites exactly the accusation you were trying to avoid.',
    what: [
      'Draws a random winner from a list of entrants, on screen, so the selection happens where everyone can see it.',
      'Runs entirely in your browser — the entrant list is never uploaded, which matters when it is full of real names.'
    ],
    specs: {
      caption: 'How it works',
      rows: [
        ['Input', 'A list of entrants, one per line'],
        ['Selection', 'Random draw'],
        ['Runs', 'In your browser — nothing uploaded'],
        ['Duplicates', 'Remove them first, or they get extra chances'],
        ['Redraws', 'Say the rule beforehand, not afterwards'],
        ['Record', 'Screen-record the draw if the prize is valuable'],
        ['Privacy', 'The entrant list never leaves your device']
      ]
    },
    steps: [
      'Paste the entrant list, one name per line.',
      'Remove duplicates unless multiple entries are intentional.',
      'State the rules on stream before drawing — including what happens if the winner does not respond.',
      'Draw on camera.'
    ],
    tip: 'Announce the redraw rule <em>before</em> you draw, not after. "If the winner does not reply within five minutes we draw again" is a fair rule stated in advance and an obvious excuse stated afterwards. This is the thing that turns a giveaway into an argument, and it costs one sentence to avoid.',
    faqs: [
      { q: 'Is the draw genuinely random?', a: 'It uses the browser’s random number generator, which is more than sufficient for a giveaway. Doing it live on stream is what makes it credible to viewers — the mechanism matters less than the visibility.' },
      { q: 'What if the same name appears twice?', a: 'It gets two chances. Sometimes that is deliberate — extra entries for subscribers, say — but if it is accidental, remove duplicates first or someone will notice and object.' },
      { q: 'Is my entrant list uploaded?', a: 'No. Everything happens in your browser, which is the right default for a list of real usernames and sometimes email addresses.' },
      { q: 'Should I record the draw?', a: 'If the prize has real value, yes. A recording settles any later dispute instantly, and knowing it exists tends to prevent the dispute happening at all.' }
    ],
    related: ['random-picker', 'random-number-generator', 'stream-alert-creator', 'chat-overlay-tool', 'stream-revenue-calculator', 'stream-schedule-planner']
  },

  'stream-schedule-planner': {
    intro: 'Consistency beats frequency in streaming, and it is not close. A channel that goes live at the same times every week builds an audience that plans around it; one that streams more hours at random times does not.',
    what: [
      'Lays out a weekly streaming schedule you can publish on your channel and social accounts, so viewers know when to show up.',
      'The point is the commitment, not the graphic. A published schedule you keep is worth more than a longer one you miss.'
    ],
    specs: {
      caption: 'Planning guidance',
      rows: [
        ['Output', 'A weekly schedule graphic'],
        ['Publish on', 'Channel panels, social bios, offline banner'],
        ['Time zones', 'State one explicitly — see the tip'],
        ['Realistic frequency', 'Three kept slots beat five missed ones'],
        ['Session length', 'Two to four hours is typical'],
        ['Consistency', 'Matters more than total hours'],
        ['Privacy', 'Generated in your browser']
      ]
    },
    steps: [
      'Choose slots you can keep on a bad week, not a good one.',
      'Name the time zone explicitly.',
      'Publish it on your channel panels and social profiles.',
      'Change it deliberately rather than drifting.'
    ],
    tip: 'Always write the time zone, and prefer UTC alongside your local time. "8pm" is meaningless to an international audience, and daylight saving shifts on different dates in different countries — so a schedule that was correct in June is wrong in November for half your viewers. The Timezone Converter is the fastest way to check what your slot looks like elsewhere.',
    faqs: [
      { q: 'How many days a week should I stream?', a: 'As many as you can sustain indefinitely, which is usually fewer than you would like. Three reliable slots build a bigger habit than five that come and go, because viewers learn a schedule they can trust.' },
      { q: 'How long should each stream be?', a: 'Two to four hours suits most channels — long enough for people to find you mid-stream, short enough to stay energetic. Discovery favours longer sessions somewhat, but not at the cost of quality.' },
      { q: 'What about time zones?', a: 'State yours explicitly and give a UTC equivalent. Daylight saving changes on different dates in different regions, which silently breaks a schedule that was correct a month ago.' },
      { q: 'What if I need to miss a stream?', a: 'Say so in advance on the same channels where the schedule lives. Missing quietly costs you more trust than missing with notice — viewers forgive changes, not disappearances.' }
    ],
    related: ['timezone-converter', 'stream-asset-sizer', 'starting-soon-screen', 'stream-revenue-calculator', 'countdown', 'giveaway-picker']
  },

  /* ============ batch 12 — tax & payroll cluster (complete) ============
   * 8 pages. YMYL — same standard as the finance batch. Every one of these
   * takes rates the USER supplies rather than knowing any country's tax law,
   * and each page says so plainly. Defaults read from source. */

  'income-tax-estimator': {
    intro: 'Progressive tax is almost universally misunderstood in the same way: people believe crossing into a higher band taxes all their income at the higher rate. It does not, and the difference between those two beliefs has talked people out of pay rises.',
    what: [
      'Applies a tax-free allowance and then bands you define, so <strong>only the income inside each band is taxed at that band’s rate</strong>. Earning one pound into a 40% band costs 40p on that pound, not 40% of everything.',
      '<strong>It does not know any country’s tax rules.</strong> You supply the allowance, the band thresholds and the rates. That is deliberate — a calculator claiming to know your jurisdiction’s current rates would be wrong somewhere, and wrong quietly.'
    ],
    specs: {
      caption: 'Inputs and defaults',
      rows: [
        ['Taxable income', 'You enter it — default 60,000'],
        ['Tax-free allowance', 'You set it — default 14,600'],
        ['Band rates', 'You set them — default 12% for band 1'],
        ['Band thresholds', 'You set them — band 1 ends at 48,475 by default'],
        ['Method', 'Marginal — each band taxed at its own rate'],
        ['Knows your country’s rates?', '<strong>No — you supply them</strong>'],
        ['Covers', 'Income tax only'],
        ['Excludes', 'Social contributions, local taxes, credits, deductions']
      ]
    },
    steps: [
      'Look up your jurisdiction’s current allowance, bands and rates.',
      'Enter them along with your taxable income.',
      'Read the total and the effective rate — the second is the useful number.'
    ],
    tip: 'The effective rate is what you actually pay; the marginal rate is what the next pound costs. Somebody "in the 40% bracket" is usually paying an effective rate in the twenties, because the allowance and the lower bands come first. Quoting the marginal rate as though it were the effective one is the source of most bad tax intuition.',
    faqs: [
      { q: 'Does crossing into a higher band tax all my income at that rate?', a: 'No. Only the portion above the threshold is taxed at the higher rate — everything below keeps its own rate. A pay rise that pushes you into a higher band always leaves you with more money, never less.' },
      { q: 'Why do I have to enter the rates myself?', a: 'Because rates and thresholds differ by country, change most years, and often vary by region within a country. A tool that hard-coded them would give confidently wrong answers to most of the world. Supplying them makes the assumption visible.' },
      { q: 'What is not included?', a: 'Social security or national insurance contributions, local and state taxes, tax credits, deductions and reliefs. This is income tax on the bands you supply, which is a component of a bill rather than the bill.' },
      { q: 'Can I use this for a tax return?', a: 'No. It is an estimate for planning, and it cannot see the reliefs, allowances and reporting rules that a return requires. Use your tax authority’s own tool or an accountant for anything you file.' }
    ],
    related: ['payroll-calculator', 'self-employment-tax', 'paycheck-calculator', 'salary-converter', 'percentage-calculator', 'budget-calculator']
  },

  'self-employment-tax': {
    intro: 'The bill that catches new freelancers is not income tax — it is the self-employment tax on top of it. Employees never see it because their employer pays half; when you work for yourself, you pay both halves.',
    what: [
      'Calculates self-employment tax at <strong>15.3%</strong> — which is 12.4% social security plus 2.9% Medicare, both halves — and applies the standard <strong>92.35% adjustment</strong> to net profit before the rate.',
      'That 92.35% exists because you are allowed to exclude the employer-equivalent portion from the base. It is not a rounding; it is written into the calculation.'
    ],
    specs: {
      caption: 'Rates and method',
      rows: [
        ['SE tax rate', '15.3% — default'],
        ['Made up of', '12.4% social security + 2.9% Medicare'],
        ['Applied to', '92.35% of net profit, not 100%'],
        ['Why 92.35%', 'Excludes the employer-equivalent half from the base'],
        ['Net profit', 'Revenue minus allowable expenses'],
        ['Default revenue / expenses', '80,000 / 15,000'],
        ['Income tax', 'Separate — enter your rate, default 22%'],
        ['Knows your country’s rules?', '<strong>No</strong>']
      ]
    },
    steps: [
      'Enter revenue and allowable expenses — the tax is on profit, not turnover.',
      'Check the SE rate against current rules.',
      'Add your income tax rate to see the combined burden.'
    ],
    tip: 'Set aside a percentage of every payment as it arrives, not at year end. Between self-employment tax and income tax, 25–30% of profit is a common holding figure — and the freelancers who get into trouble are almost never the ones who earned too little, but the ones who spent money that was never theirs.',
    faqs: [
      { q: 'Why 92.35% and not the full profit?', a: 'Because you may exclude the employer-equivalent portion of the tax from the base it is calculated on — employees are not taxed on their employer’s half either. The 7.65% reduction is what makes the treatment comparable.' },
      { q: 'Why is the rate 15.3% when employees pay 7.65%?', a: 'Employees pay half and their employer pays the other half. Self-employed people are both, so they pay both halves. This is the single biggest surprise in a first year of freelancing.' },
      { q: 'Is this the same as income tax?', a: 'No, and it is in addition to it. Self-employment tax funds social security and Medicare; income tax is separate and applies to the same profit. The tool shows both so the combined figure is visible.' },
      { q: 'Does this apply outside the US?', a: 'The 15.3% structure is US-specific. Most countries have an equivalent self-employed social contribution with different rates and thresholds. Change the rate to your own, and check with a local accountant — this knows no jurisdiction.' }
    ],
    related: ['income-tax-estimator', 'hourly-rate', 'paycheck-calculator', 'invoice-generator', 'profit-margin', 'budget-calculator']
  },

  'overtime-calculator': {
    intro: 'Overtime disputes are almost always arithmetic disputes. Both sides agree on the hours; they disagree on which hours counted as overtime and what multiplier applied to them.',
    what: [
      'Splits total hours into normal and overtime at the threshold you set, then pays the overtime portion at your multiplier — <strong>1.5× ("time and a half") is the common statutory rate</strong>.',
      'Defaults to a 40-hour normal week, which is the usual threshold, and a base rate of 22 per hour.'
    ],
    specs: {
      caption: 'Inputs and defaults',
      rows: [
        ['Base hourly rate', 'Default 22'],
        ['Normal hours', 'Default 40 a week'],
        ['Overtime multiplier', '1.5 = time and a half; 2 = double time'],
        ['Overtime hours', 'Anything above the normal threshold'],
        ['Returns', 'Normal pay, overtime pay, total'],
        ['Knows your labour law?', '<strong>No</strong>'],
        ['Excludes', 'Tax, deductions, unsocial-hours premiums'],
        ['Salaried staff', 'May be exempt — depends on jurisdiction']
      ]
    },
    steps: [
      'Enter your base hourly rate.',
      'Set the normal-hours threshold — 40 in many places, but check yours.',
      'Enter total hours worked and the multiplier.'
    ],
    tip: 'Check whether your overtime threshold is weekly or daily, because it changes the answer completely. Some jurisdictions pay overtime after 8 hours in a single day regardless of the weekly total — so four 10-hour days is 8 hours of overtime there and none at all under a 40-hour weekly rule.',
    faqs: [
      { q: 'What multiplier should I use?', a: '1.5 — time and a half — is the most common statutory minimum, with 2× for some holidays or extended hours. Your contract or local law decides, and both can be more generous than the minimum.' },
      { q: 'Is the threshold daily or weekly?', a: 'It depends where you are, and it materially changes the result. Weekly thresholds are commonest, but several jurisdictions use a daily one, and some use both with whichever gives more overtime.' },
      { q: 'Am I entitled to overtime at all?', a: 'That depends on your jurisdiction and classification — many places exempt certain salaried and managerial roles. This calculates the pay for hours you are entitled to; it cannot tell you whether you are entitled.' },
      { q: 'Is this before or after tax?', a: 'Before. It is gross pay. Overtime is usually taxed the same as normal pay, though a large one-off can push a period into a higher withholding bracket even when the annual position is unchanged.' }
    ],
    related: ['hourly-wage', 'payroll-calculator', 'salary-converter', 'pto-accrual', 'paycheck-calculator', 'employee-cost']
  },

  'pto-accrual': {
    intro: 'Leave balances are a common source of quiet friction, because employees and payroll often calculate them differently — one counts what has been earned so far, the other counts the full annual entitlement.',
    what: [
      'Works out how much paid leave you have accrued so far this year, pro-rated by months worked, and subtracts what you have already taken.',
      'The distinction that matters: <strong>accrued</strong> is what you have earned to date; <strong>entitlement</strong> is the full year. Booking against entitlement rather than accrual is how people end up owing days back on leaving.'
    ],
    specs: {
      caption: 'Inputs and defaults',
      rows: [
        ['Yearly entitlement', 'In days — default 25'],
        ['Months worked', 'Default 7'],
        ['Days already taken', 'Default 8'],
        ['Accrual method', 'Pro-rated by months elapsed'],
        ['Returns', 'Accrued, taken, and remaining balance'],
        ['Knows your local minimum?', '<strong>No</strong>'],
        ['Excludes', 'Public holidays unless in your entitlement'],
        ['Carry-over rules', 'Vary by employer and country']
      ]
    },
    steps: [
      'Enter your annual entitlement in days.',
      'Enter months worked so far this leave year — which may not start in January.',
      'Enter days taken to read the true remaining balance.'
    ],
    tip: 'Check when your leave year actually starts. Many employers run it from your start date or from April rather than January, and calculating from the wrong month is the commonest reason an employee’s figure disagrees with payroll’s. Get that right before querying a balance.',
    faqs: [
      { q: 'What is the difference between accrued and entitled?', a: 'Entitlement is the full year’s allowance; accrual is the portion earned so far. Taking more than you have accrued is usually allowed but creates a debt — leave partway through the year having overtaken and it is typically deducted from your final pay.' },
      { q: 'Do public holidays count?', a: 'It varies. Some contracts include them in the total entitlement, others grant them on top. Check which yours does, because the difference is often eight days or more.' },
      { q: 'What happens to unused days?', a: 'Depends entirely on your employer and jurisdiction — some allow carry-over, some cap it, some forfeit it, and some require payment for untaken statutory leave on termination. This calculates the balance; your contract decides its fate.' },
      { q: 'Does this know my country’s minimum leave?', a: 'No. Statutory minimums vary widely — from a few days to well over four weeks — and this uses whatever entitlement you enter. Check your local minimum separately; your contract cannot go below it.' }
    ],
    related: ['payroll-calculator', 'overtime-calculator', 'salary-converter', 'employee-cost', 'date-calculator', 'age-calculator']
  },

  'employee-cost': {
    intro: 'The salary is the number in the offer letter and roughly two-thirds of what the hire actually costs. Employers who budget on salary alone discover the rest one payroll run at a time.',
    what: [
      'Adds employer-side costs on top of gross salary — payroll taxes, pension contributions and benefits — to give the real annual cost of employing someone.',
      'Defaults to a 60,000 salary with 12% employer taxes and 5% pension, which lands the true cost near 70,000 before benefits are added at all.'
    ],
    specs: {
      caption: 'Cost components',
      rows: [
        ['Gross salary', 'Default 60,000'],
        ['Employer taxes', 'Default 12% — varies hugely by country'],
        ['Employer pension', 'Default 5%'],
        ['Benefits', 'Entered as an annual figure'],
        ['Returns', 'Total annual cost and the uplift over salary'],
        ['Typical uplift', '20–40% above salary in most jurisdictions'],
        ['Excludes', 'Equipment, software, office space, recruitment'],
        ['Knows your country’s rates?', '<strong>No</strong>']
      ]
    },
    steps: [
      'Enter the gross salary.',
      'Enter employer tax and pension percentages for your jurisdiction.',
      'Add benefits as an annual figure, then compare against the salary.'
    ],
    tip: 'Add the costs this does not model before you commit to a hire: a laptop, software licences, a desk, recruitment fees, and the time existing staff spend onboarding. A useful rule is that the first year costs meaningfully more than steady state — which is exactly the year in which a marginal hire fails.',
    faqs: [
      { q: 'How much more than salary does an employee cost?', a: 'Commonly 20–40% more once employer taxes, pension and benefits are counted, and the range is wide because employer contribution rates differ enormously between countries. The calculation makes your own assumptions explicit rather than assuming a figure.' },
      { q: 'What is missing from this?', a: 'Equipment, software licences, office space, recruitment fees, training and management time. Those are real and they land disproportionately in year one.' },
      { q: 'Does it apply to contractors?', a: 'Not directly. A contractor’s day rate typically includes their own taxes, equipment and unpaid time, so the comparison is between a total cost here and a rate there — and misclassifying an employee as a contractor carries real legal risk.' },
      { q: 'Are the default percentages right for me?', a: 'Almost certainly not — 12% and 5% are placeholders. Employer social contributions range from close to nothing to over 30% depending on the country. Look yours up.' }
    ],
    related: ['payroll-calculator', 'salary-converter', 'hourly-rate', 'break-even', 'profit-margin', 'income-tax-estimator']
  },

  'salary-converter': {
    intro: 'Job adverts quote pay in whatever unit suits the employer — hourly here, monthly there, annual somewhere else — which makes comparing two offers surprisingly hard until everything is on the same footing.',
    what: [
      'Converts a wage between hourly, daily, weekly, monthly and annual, so two offers quoted differently can be compared directly.',
      'The conversion depends entirely on assumed hours and weeks. Change those and every derived figure moves — which is why comparing a contract rate to a salary is not the arithmetic it appears to be.'
    ],
    specs: {
      caption: 'How the conversion works',
      rows: [
        ['Converts between', 'Hourly, daily, weekly, monthly, annual'],
        ['Depends on', 'Assumed hours per week and weeks per year'],
        ['Common assumption', '40 hours × 52 weeks = 2,080 hours a year'],
        ['Monthly', 'Annual ÷ 12, not weekly × 4'],
        ['4 weeks ≠ 1 month', 'A year has 52 weeks, not 48'],
        ['Figures are', 'Gross — before tax and deductions'],
        ['Excludes', 'Bonuses, overtime, benefits, employer pension'],
        ['Contract vs salary', 'Not directly comparable — see the tip']
      ]
    },
    steps: [
      'Enter the figure you have and the unit it is in.',
      'Set hours per week and weeks per year to match the role.',
      'Read every other unit.'
    ],
    tip: 'A contract hourly rate is not comparable to a salary at the same rate. The contractor has no paid leave, no sick pay, no employer pension and pays their own taxes and equipment — which is why contract rates are conventionally set well above the salaried equivalent. Compare total annual value, not rate to rate.',
    faqs: [
      { q: 'How many working hours in a year?', a: '2,080 is the standard assumption — 40 hours across 52 weeks. It ignores holidays and public holidays, so actual worked hours are lower, but it is the figure most salary conversions use.' },
      { q: 'Why is monthly not weekly times four?', a: 'Because a year has 52 weeks, not 48. Multiplying a weekly figure by four understates monthly pay by about 8%. Always divide the annual by twelve.' },
      { q: 'Is this gross or net?', a: 'Gross — before any tax or deductions. Use the Payroll Calculator to estimate take-home, noting that it needs rates you supply.' },
      { q: 'Can I compare a contract rate to a salary?', a: 'Not by rate alone. Convert the contract rate to an annual figure using the weeks you will actually bill, then subtract unpaid leave, your own pension and equipment costs. The gap is usually large enough to change which offer is better.' }
    ],
    related: ['hourly-wage', 'payroll-calculator', 'hourly-rate', 'employee-cost', 'overtime-calculator', 'unit-converter']
  },

  'payroll-calculator': {
    intro: 'The gap between the salary you agreed and the amount that lands in your account is usually 25–35%, and it is composed of several deductions that arrive together and are rarely itemised in a way anyone reads.',
    what: [
      'Subtracts income tax and pension contributions from gross salary to estimate take-home, with the rates you supply.',
      '<strong>It knows no country’s tax system.</strong> Defaults of 20% tax and 5% pension are placeholders, not a jurisdiction — and the page says so rather than letting you assume otherwise.'
    ],
    specs: {
      caption: 'Inputs and defaults',
      rows: [
        ['Annual gross salary', 'Default 60,000'],
        ['Income tax', 'Default 20% — you supply the real rate'],
        ['Pension / retirement', 'Default 5%'],
        ['Returns', 'Annual and monthly net'],
        ['Knows your tax system?', '<strong>No</strong>'],
        ['Uses flat rates', 'Not progressive bands — see the tip'],
        ['Excludes', 'Social contributions, local taxes, student loans, credits'],
        ['Typical real deduction', '25–35% of gross in many countries']
      ]
    },
    steps: [
      'Enter gross annual salary.',
      'Enter your effective tax rate — not your marginal one. See the tip.',
      'Add pension percentage and read the monthly net.'
    ],
    tip: 'Enter your <em>effective</em> rate, not your bracket. This applies a flat percentage, so entering 40% because you are "in the 40% bracket" will understate your take-home substantially — most of your income is taxed at lower rates. Run the Income Tax Estimator first to find the effective rate, then use that figure here.',
    faqs: [
      { q: 'What rate should I enter?', a: 'Your effective rate — total tax divided by gross income — rather than your top bracket. The Income Tax Estimator calculates it properly across bands; entering a marginal rate here produces a net figure that is far too low.' },
      { q: 'Why does it not know my country’s rates?', a: 'Because they differ by country, region and year, and often by personal circumstance. A calculator with hard-coded rates would be confidently wrong for most users. Supplying them keeps the assumption visible.' },
      { q: 'What is not deducted here?', a: 'Social security or national insurance, local and state taxes, student loan repayments, health insurance, union dues and tax credits. Real payslips carry several of these, which is why actual net is usually lower than a two-input estimate.' },
      { q: 'Why is my real payslip different?', a: 'Almost always one of the deductions above, or a progressive band structure that a flat rate cannot represent. Use this for planning and your payslip for facts.' }
    ],
    related: ['income-tax-estimator', 'salary-converter', 'paycheck-calculator', 'employee-cost', 'budget-calculator', 'pto-accrual']
  },

  'hourly-wage': {
    intro: 'Annualising an hourly wage is the arithmetic that turns an abstract rate into something you can compare against rent — and the assumption that decides the answer is how many weeks you actually get paid for.',
    what: [
      'Multiplies an hourly rate by hours per week and weeks per year to give weekly, monthly and annual gross pay.',
      'Defaults to 15 per hour, 40 hours and <strong>52 weeks</strong> — a full year with no unpaid time. If your work is seasonal or you take unpaid leave, that figure is the one to change.'
    ],
    specs: {
      caption: 'Inputs and defaults',
      rows: [
        ['Hourly rate', 'Default 15'],
        ['Hours per week', 'Default 40'],
        ['Weeks per year', 'Default 52 — assumes paid year-round'],
        ['40 × 52', '2,080 hours a year'],
        ['Returns', 'Weekly, monthly and annual gross'],
        ['Figures are', 'Gross — before tax'],
        ['Excludes', 'Overtime, bonuses, unpaid leave'],
        ['Seasonal work', 'Reduce the weeks figure']
      ]
    },
    steps: [
      'Enter your hourly rate and normal hours.',
      'Set weeks per year honestly — 52 only if you are paid through every week.',
      'Read the annual figure, remembering it is gross.'
    ],
    tip: 'If any of your time off is unpaid, reduce the weeks rather than the hours. Four weeks of unpaid leave turns 52 into 48 and cuts the annual figure by nearly 8% — which is a far bigger correction than most people make when comparing an hourly job against a salaried one that includes paid holiday.',
    faqs: [
      { q: 'Should I use 52 weeks?', a: 'Only if you are paid for all of them, including holidays. Salaried roles usually are; hourly roles frequently are not. Unpaid leave, seasonal shutdowns and gaps between contracts all come off that number.' },
      { q: 'What is 2,080 hours?', a: '40 hours × 52 weeks — the standard full-time year used in most salary conversions. It ignores holidays, so actual hours worked are lower even when pay is not.' },
      { q: 'Is overtime included?', a: 'No. This annualises your normal hours at your normal rate. Use the Overtime Calculator for hours above the threshold, since they are paid at a multiplier.' },
      { q: 'Is this take-home?', a: 'No, it is gross. Expect roughly 25–35% in deductions in many countries — the Payroll Calculator estimates it with rates you supply.' }
    ],
    related: ['salary-converter', 'overtime-calculator', 'payroll-calculator', 'hourly-rate', 'budget-calculator', 'employee-cost']
  },

  /* ============ batch 13 — image-editing cluster (complete) ============
   * 8 pages. Ranges read from tools-image*.js. image-sharpen and
   * grayscale-image run through VKPixels (the worker), which is why they
   * behave differently on large images from the canvas-filter tools. */

  'grayscale-image': {
    intro: 'Removing colour is not the same as averaging the channels, and the difference is why some black-and-white conversions look muddy while others look photographic. Human eyes are far more sensitive to green than to blue, and a conversion that ignores that flattens skin tones.',
    what: [
      'Converts to greyscale using <strong>Rec. 601 luminance</strong> — 29.9% red, 58.7% green, 11.4% blue — rather than a flat average of the three channels. A flat average would make a pure green and a pure blue the same shade of grey, which is not how they look.',
      'Also offers <strong>sepia</strong>, which warms the image rather than merely tinting it: red is lifted above green above blue, and values are clamped so highlights do not wrap around to dark.'
    ],
    specs: {
      caption: 'How the conversion works',
      rows: [
        ['Method', 'Rec. 601 luminance weighting'],
        ['Weights', 'R 0.299 · G 0.587 · B 0.114'],
        ['Flat average would give', 'A muddier, less photographic result'],
        ['Sepia', 'Warms red over green over blue, clamped at both ends'],
        ['Transparency', 'Preserved — alpha is never altered'],
        ['Processing', 'Runs off the main thread on large images'],
        ['Output', 'PNG or JPEG'],
        ['Privacy', 'Runs in your browser — never uploaded']
      ]
    },
    steps: [
      'Add the image.',
      'Choose greyscale or sepia.',
      'Download.'
    ],
    tip: 'If a black-and-white conversion elsewhere has ever looked flat and lifeless, a flat channel average is usually why. Luminance weighting keeps the tonal separation your eye expects — greens stay lighter than blues, which is what makes foliage and skin read correctly rather than turning to mush.',
    faqs: [
      { q: 'Why not just average the three channels?', a: 'Because your eye does not. Green contributes nearly six times more to perceived brightness than blue, so an average makes greens too dark and blues too light. The result looks flat, and it is the commonest reason amateur black-and-white conversions disappoint.' },
      { q: 'What happens to transparent areas?', a: 'They stay transparent. The alpha channel is passed through untouched — a greyscale that flattened alpha would silently ruin every logo run through it.' },
      { q: 'Is this reversible?', a: 'No. Three colour channels are collapsed into one brightness value and the colour information is gone. Keep your original.' },
      { q: 'Why is it fast on a large photo?', a: 'The per-pixel work runs off the main thread, so the page stays responsive and the progress bar actually moves. Tools that do this on the main thread appear frozen on a 12-megapixel image.' }
    ],
    related: ['filter-studio', 'image-brightness', 'image-sharpen', 'compress-image', 'convert-image', 'color-from-image']
  },

  'image-sharpen': {
    intro: 'Sharpening does not add detail — nothing can. It increases local contrast at edges so that detail already present reads more clearly, and pushed too far it produces halos that look worse than the softness you were fixing.',
    what: [
      'Applies a convolution kernel that brightens each pixel relative to its neighbours, at an <strong>amount from 1 to 10</strong> with 4 as the default. Amount 0 is a true identity — nothing changes at all.',
      'Runs on a background worker for large images, so the page stays usable and progress is real. Results are clamped rather than wrapped, so an over-bright result stops at white instead of turning black.'
    ],
    specs: {
      caption: 'Controls and behaviour',
      rows: [
        ['Amount', '1 to 10, default 4'],
        ['Method', 'Convolution — raises local edge contrast'],
        ['Adds detail?', 'No — nothing can'],
        ['Clamping', 'Results stop at 0 and 255, never wrap'],
        ['Alpha', 'Never sharpened — avoids edge fringing'],
        ['Large images', 'Processed off the main thread'],
        ['Best for', 'Slightly soft scans and web resizes'],
        ['Cannot fix', 'Motion blur or a missed focus']
      ]
    },
    steps: [
      'Add the image.',
      'Start at 4 and increase only if it still looks soft.',
      'Check the edges of high-contrast objects before downloading.'
    ],
    tip: 'Sharpen last, after resizing, never before. Resizing an already-sharpened image amplifies the halos into visible outlines, while sharpening a correctly sized image fixes exactly the softness that resizing introduced. If you can see a pale line around dark objects, the amount is too high.',
    faqs: [
      { q: 'Can this fix a blurry photo?', a: 'No. Motion blur and missed focus destroy information, and sharpening only increases contrast around what survived. It rescues slightly soft images; it cannot rescue genuinely blurred ones, and pushing the amount up will make them look worse rather than better.' },
      { q: 'What are the halos around objects?', a: 'Over-sharpening. The kernel brightens one side of an edge and darkens the other, and at high amounts that becomes a visible outline. Reduce the amount until they disappear.' },
      { q: 'Should I sharpen before or after resizing?', a: 'After. Downscaling softens an image, so sharpening afterwards corrects exactly that. Doing it first means the resize amplifies artefacts you already created.' },
      { q: 'Does it affect transparency?', a: 'No. Alpha is deliberately left alone — sharpening the alpha channel produces visible fringing on anything with a transparent background.' }
    ],
    related: ['image-blur', 'resize-image', 'grayscale-image', 'compress-image', 'image-brightness', 'filter-studio']
  },

  'image-blur': {
    intro: 'Blur is used for two opposite reasons: to make something look intentional, and to make something unreadable. Only one of those is safe, and the difference matters more than any setting.',
    what: [
      'Applies a blur at a <strong>radius from 1 to 40 pixels</strong>, default 6. Larger radii cost more processing and remove more detail.',
      '<strong>Do not use blur to hide sensitive text.</strong> A blurred image still contains the underlying structure, and text blurred at a modest radius has been recovered in practice. For anything that must stay private, cover it with a solid block instead.'
    ],
    specs: {
      caption: 'Controls and warnings',
      rows: [
        ['Radius', '1 to 40 px, default 6'],
        ['Good for', 'Backgrounds, depth effects, softening'],
        ['<strong>Not safe for</strong>', '<strong>Hiding text, faces or numbers</strong>'],
        ['Why not', 'Blur is reversible enough to be unreliable'],
        ['Use instead', 'Screenshot Redactor or PDF Redact — solid blocks'],
        ['Larger radius', 'Slower, and softens more than intended'],
        ['Output', 'PNG or JPEG'],
        ['Privacy', 'Runs in your browser — never uploaded']
      ]
    },
    steps: [
      'Add the image.',
      'Set the radius — 6 is a gentle softening, 30 or more obliterates detail.',
      'Download.'
    ],
    tip: 'Never blur to redact. Blurring is a mathematical transformation, not a deletion, and researchers have repeatedly recovered text and faces from blurred and pixelated images. If information must not be readable, paint a solid black rectangle over it — the Screenshot Redactor and PDF Redact tools do exactly that, and destroy the pixels underneath.',
    faqs: [
      { q: 'Is blurring safe for hiding personal information?', a: 'No, and this is worth being blunt about. Blur is reversible enough that blurred and pixelated text has been recovered in published research and in real leaks. Use a solid block, and use a tool that rasterises the result so nothing survives underneath.' },
      { q: 'What radius should I use?', a: 'Around 6 for gentle softening, 15–25 for a clearly blurred background, and 30 or more when you want detail gone entirely — for aesthetic reasons, not privacy ones.' },
      { q: 'Why is a large radius slow?', a: 'Because each output pixel is computed from a larger neighbourhood, so the work rises sharply with radius. On a large photo a radius of 40 is a lot of arithmetic.' },
      { q: 'Can I blur only part of the image?', a: 'Not here — the blur applies to the whole image. For a selective effect, crop the region, blur it, and composite it back in an editor.' }
    ],
    related: ['screenshot-redactor', 'pdf-redact', 'image-sharpen', 'filter-studio', 'metadata-remover', 'image-brightness']
  },

  'image-brightness': {
    intro: 'Brightness and contrast are the two adjustments that fix most badly-lit photographs, and they pull against each other — lifting brightness flattens contrast, and raising contrast darkens the shadows you just recovered.',
    what: [
      'Adjusts brightness and contrast independently, each on a <strong>0–200 scale where 100 is unchanged</strong>. Below 100 reduces, above 100 increases.',
      'Brightness shifts every value up or down; contrast pushes values away from or toward the middle. Understanding that difference is what stops the two undoing each other.'
    ],
    specs: {
      caption: 'Controls',
      rows: [
        ['Brightness', '0–200, default 100 (unchanged)'],
        ['Contrast', '0–200, default 100 (unchanged)'],
        ['Brightness does', 'Shifts all values up or down equally'],
        ['Contrast does', 'Pushes values away from the midpoint'],
        ['Above 100', 'Increases · below 100 reduces'],
        ['Clipping', 'Values pinned at 0 or 255 lose detail permanently'],
        ['Output', 'PNG or JPEG'],
        ['Privacy', 'Runs in your browser — never uploaded']
      ]
    },
    steps: [
      'Add the image.',
      'Correct brightness first, then contrast — in that order.',
      'Check the darkest and brightest areas for lost detail before downloading.'
    ],
    tip: 'Watch the extremes, not the middle. Once a highlight is pushed to pure white or a shadow to pure black, the detail there is gone and no amount of pulling back recovers it. Adjust until the image looks right, then back off slightly — a photo that clips is harder to fix later than one that is merely a little flat.',
    faqs: [
      { q: 'What is the difference between brightness and contrast?', a: 'Brightness moves every value in the same direction, lightening or darkening the whole image uniformly. Contrast pushes values away from the middle, making darks darker and lights lighter. Raising brightness alone makes an image look washed out, which is why the two are usually adjusted together.' },
      { q: 'Which should I adjust first?', a: 'Brightness, to get the overall level right, then contrast to restore the punch that lifting brightness removed. Doing it the other way round means re-doing the contrast.' },
      { q: 'Why has detail disappeared in the bright areas?', a: 'It has clipped — those pixels hit maximum and everything above it flattened to the same white. That is permanent in the output, so reduce brightness or contrast and re-export from the original.' },
      { q: 'Can this fix a very dark photo?', a: 'Partly. Raising brightness reveals what was recorded, but shadows also contain most of the noise, so a very underexposed photo gets brighter and grainier together. There is a limit to what was captured.' }
    ],
    related: ['filter-studio', 'grayscale-image', 'image-sharpen', 'compress-image', 'crop-image', 'image-blur']
  },

  'filter-studio': {
    intro: 'Filters are presets — combinations of adjustments someone already tuned so you do not have to. The useful ones are not the dramatic ones; they are the ones that make a mediocre photo look deliberate.',
    what: [
      'Applies one of eight presets: <strong>black &amp; white, sepia, invert, vintage, cool, warm, high contrast and B&amp;W film</strong>.',
      'Cool and warm shift colour temperature, which is the adjustment that most often rescues a photo — indoor lighting casts orange, overcast daylight casts blue, and correcting for that does more than any amount of brightness.'
    ],
    specs: {
      caption: 'The eight filters',
      rows: [
        ['Black &amp; white', 'Luminance-weighted greyscale'],
        ['Sepia', 'Warm monochrome tint'],
        ['Invert', 'Negative — reverses every channel'],
        ['Vintage', 'Faded, warm, lower contrast'],
        ['Cool / Warm', 'Colour temperature shift'],
        ['High contrast', 'Pushes darks and lights apart'],
        ['B&amp;W film', 'Greyscale with a film-like tone curve'],
        ['Privacy', 'Runs in your browser — never uploaded']
      ]
    },
    steps: [
      'Add the image.',
      'Try warm or cool first if the colours look off — temperature is usually the real problem.',
      'Download.'
    ],
    tip: 'Reach for warm or cool before anything more dramatic. Most disappointing photos are not badly exposed, they are badly white-balanced — indoor bulbs push everything orange and shade pushes it blue. Correcting the temperature makes a photo look professionally handled in a way that a heavy filter never does.',
    faqs: [
      { q: 'Which filter should I use?', a: 'For correcting a photo, warm or cool to fix temperature. For a deliberate look, vintage and B&W film are the subtler options; invert and high contrast are effects rather than corrections.' },
      { q: 'Can I stack filters?', a: 'One at a time here. To combine, apply one, download, and run the result through again — noting that each JPEG save adds a little compression loss, so use PNG between steps.' },
      { q: 'What is the difference between black & white and B&W film?', a: 'The first is a straight luminance conversion. The film preset applies a tone curve as well, lifting the shadows and rolling off the highlights the way film stock does, which reads as less clinical.' },
      { q: 'Is the effect reversible?', a: 'Only invert, which is its own opposite. The others discard information — keep your original.' }
    ],
    related: ['image-brightness', 'grayscale-image', 'image-sharpen', 'compress-image', 'meme-generator', 'collage-maker']
  },

  'round-corners': {
    intro: 'Rounded corners are what make an avatar or a card thumbnail look designed rather than pasted in. The detail that decides whether it works is the file format, not the radius.',
    what: [
      'Rounds the corners at a <strong>radius from 2% to 50%</strong> of the image’s shorter side, default 12%. Because it is a percentage, the same setting looks consistent across images of different sizes — and <strong>50% produces a circle</strong> on a square image.',
      'The corners it removes become transparent, which is why the output format matters.'
    ],
    specs: {
      caption: 'Controls',
      rows: [
        ['Radius', '2% to 50% of the shorter side, default 12%'],
        ['Why a percentage', 'Consistent across different image sizes'],
        ['50% on a square', 'A perfect circle'],
        ['Corners become', 'Transparent'],
        ['<strong>Save as</strong>', '<strong>PNG or WebP — JPEG has no transparency</strong>'],
        ['Non-square images', 'Radius is based on the shorter side'],
        ['Output', 'PNG recommended'],
        ['Privacy', 'Runs in your browser — never uploaded']
      ]
    },
    steps: [
      'Add the image.',
      'Set the radius — 12% is a subtle card corner, 50% is a circle.',
      '<strong>Save as PNG</strong>, not JPEG.'
    ],
    tip: 'Save as PNG or the rounding is wasted. JPEG has no transparency, so the corners you removed come back as solid black or white — and the result looks like a mistake rather than a design choice. This is the single commonest way rounded-corner exports go wrong.',
    faqs: [
      { q: 'My corners came out black.', a: 'The file was saved as JPEG, which cannot store transparency, so the transparent corners were filled. Re-export as PNG or WebP.' },
      { q: 'How do I make a perfect circle?', a: 'Set the radius to 50% on a square image. On a non-square image that gives a stadium shape instead — crop to square first, or use the Circle Crop tool.' },
      { q: 'Why is the radius a percentage rather than pixels?', a: 'So the same setting looks right on a 200 px avatar and a 2000 px banner. A fixed pixel radius that suits one is invisible or overwhelming on the other.' },
      { q: 'Will it work on a photo with a busy background?', a: 'Yes, but the effect is clearest against a plain background. The rounding removes the corners regardless of what is in them.' }
    ],
    related: ['circle-crop', 'crop-image', 'resize-image', 'favicon-generator', 'convert-image', 'emote-resizer']
  },

  'color-from-image': {
    intro: 'Building a palette from a photograph is how brand colours, slide decks and site themes usually start — and picking them by eye from a screenshot gets you approximations of the colours actually there.',
    what: [
      'Extracts a palette by <strong>quantising</strong> the image — grouping millions of similar pixels into a small set of representative colours — and returns them as hex codes you can paste anywhere.',
      'Quantisation is why the result is a handful of usable colours rather than a list of every shade present, which would be useless.'
    ],
    specs: {
      caption: 'How it works',
      rows: [
        ['Method', 'Colour quantisation — grouping similar pixels'],
        ['Output', 'Hex codes'],
        ['Why quantise', 'A photo holds thousands of distinct colours'],
        ['Dominant colour', 'The largest group, not the most striking'],
        ['Works best on', 'Images with clear colour regions'],
        ['Works poorly on', 'Very dark or very washed-out photos'],
        ['Next step', 'Check contrast before using as text colours'],
        ['Privacy', 'Runs in your browser — never uploaded']
      ]
    },
    steps: [
      'Add the image.',
      'Read the palette and copy the hex codes.',
      '<strong>Check contrast</strong> before using any of them for text.'
    ],
    tip: 'Run any pair you plan to use as text and background through the Contrast Checker before committing. Palettes pulled from photographs are frequently beautiful and completely unreadable — two mid-tone colours can look lovely side by side and fail accessibility contrast badly, which is a problem you inherit on every page.',
    faqs: [
      { q: 'Why are the colours not exactly what I see?', a: 'Because quantisation returns a representative colour for a group of similar pixels rather than any single one. A sky containing a thousand blues yields one blue that stands for them — which is what makes the palette usable.' },
      { q: 'What is the dominant colour?', a: 'The largest group by pixel count, which is not always the most noticeable. A photo with a big grey wall and a small red door will report grey as dominant even though the door is what you noticed.' },
      { q: 'Can I use these as a brand palette?', a: 'As a starting point. Check contrast for text use, and be aware that colours pulled from a photograph often need adjusting for saturation before they work in an interface.' },
      { q: 'Is my photo uploaded?', a: 'No. The image is read in your browser and never leaves your device, which matters more here than it might seem — people extract palettes from unreleased product shots, client work under embargo and design comps that are not public yet. Nothing is transmitted, so none of that is exposed.' }
    ],
    related: ['contrast-checker', 'palette-generator', 'color-converter', 'accessible-palette', 'gradient-generator', 'filter-studio']
  },

  'collage-maker': {
    intro: 'A grid of photographs is the fastest way to show a set of things at once — a product range, a before-and-after series, a week of progress — and the arrangement decides whether it reads as a set or as clutter.',
    what: [
      'Arranges images into a grid with a column count, cell size and gap you control. <strong>Cell size runs from 120 to 1000 px, default 400.</strong>',
      'Every cell is the same size, so images of different aspect ratios are fitted into a uniform square — which is what makes a grid look ordered rather than ragged.'
    ],
    specs: {
      caption: 'Controls',
      rows: [
        ['Columns', 'You choose — rows follow from the image count'],
        ['Cell size', '120 to 1000 px, default 400'],
        ['Gap', 'Spacing between cells, in pixels'],
        ['Cells', 'All the same size'],
        ['Output size', 'Roughly columns × cell size'],
        ['Order', 'The order you add the images'],
        ['Output', 'A single image'],
        ['Privacy', 'Runs in your browser — never uploaded']
      ]
    },
    steps: [
      'Add your images in the order you want them.',
      'Set columns — 2 or 3 for social, more for a contact sheet.',
      'Set cell size and gap, then download.'
    ],
    tip: 'Crop to a consistent shape before building the collage. Mixing portrait and landscape photos into uniform cells means some get cropped in ways you did not choose, and it is the difference between a grid that looks composed and one that looks automatic. Square-crop everything first if the images matter.',
    faqs: [
      { q: 'How many columns should I use?', a: 'Two or three for anything going on social media, where it will be viewed small. More columns suit a contact sheet or a product grid meant to be viewed large — beyond about five, individual images become too small to read on a phone.' },
      { q: 'Why are some of my photos cropped oddly?', a: 'Because cells are uniform and your images are not. A landscape photo in a square cell has to lose its sides. Crop deliberately beforehand if the composition matters.' },
      { q: 'How large will the output be?', a: 'Roughly columns multiplied by cell size, plus gaps. Three columns at 400 px gives about 1200 px wide — plenty for social, and worth raising for print.' },
      { q: 'Can I reorder images after adding them?', a: 'The grid follows the order you added them, so add them in the order you want. For a specific arrangement, add them one at a time rather than selecting a whole folder.' }
    ],
    related: ['crop-image', 'resize-image', 'bulk-resize', 'social-media-image', 'compress-image', 'circle-crop']
  },

  /* ============ batch 14 — privacy & security cluster (complete) ============
   * 8 pages. Real cryptography read from source: AES-GCM 256 with PBKDF2 at
   * 150,000 iterations / SHA-256; TOTP via HMAC-SHA1 on a 30s step; a 564-word
   * passphrase list (9.14 bits per word); SHA-1/256/512 checksums. Security
   * pages that overstate what a tool does are worse than none, so each states
   * its limits as prominently as its strengths. */

  'text-encrypt': {
    intro: 'Sending a password or a recovery phrase through chat leaves it sitting in someone else’s message history indefinitely. Encrypting it first means the copy in that history is useless without a key you shared another way.',
    what: [
      'Encrypts text with <strong>AES-GCM at 256 bits</strong>, deriving the key from your passphrase with <strong>PBKDF2 at 150,000 iterations of SHA-256</strong>. That iteration count is what makes a weak passphrase expensive to attack rather than instant.',
      'AES-GCM is <em>authenticated</em> encryption: it detects tampering as well as preventing reading, so altered ciphertext fails to decrypt rather than producing plausible nonsense.'
    ],
    specs: {
      caption: 'The cryptography',
      rows: [
        ['Cipher', 'AES-GCM, 256-bit'],
        ['Key derivation', 'PBKDF2, <strong>150,000 iterations</strong>, SHA-256'],
        ['Authenticated?', 'Yes — tampering is detected, not silently accepted'],
        ['Implementation', 'The browser’s own Web Crypto — no library'],
        ['Runs', 'Entirely on your device'],
        ['Passphrase recovery', '<strong>Impossible — there is no reset</strong>'],
        ['Weak point', 'Your passphrase, always'],
        ['Share the key', 'Through a different channel from the ciphertext']
      ]
    },
    steps: [
      'Paste the text and choose a strong passphrase.',
      'Encrypt, and send the ciphertext.',
      '<strong>Send the passphrase by a different route</strong> — if both travel through the same chat, you have gained nothing.'
    ],
    tip: 'Send the ciphertext and the passphrase through different channels. Encrypted text in an email with the password in the next paragraph is exactly as exposed as sending it in plain text — anyone who reads one reads both. Message the passphrase, or say it aloud.',
    faqs: [
      { q: 'What if I forget the passphrase?', a: 'The text is unrecoverable. There is no reset, no backdoor and no support route, because the key exists only in your head — that is the property that makes the encryption meaningful. Write it somewhere safe before you rely on it.' },
      { q: 'How strong is this?', a: 'AES-256 in GCM mode is the standard used for classified government material, and 150,000 PBKDF2 iterations makes brute-forcing a passphrase slow. The cryptography is not the weak point; your passphrase is.' },
      { q: 'Is my text sent anywhere?', a: 'No. It uses the browser’s built-in Web Crypto and runs entirely on your device. Nothing is transmitted, which is the only arrangement under which encrypting on a website makes sense.' },
      { q: 'Can I use this for files?', a: 'It handles text. For a file, the practical route is a password-protected archive, or Protect PDF if the file is a PDF.' }
    ],
    related: ['password-generator', 'passphrase-generator', 'password-strength', 'protect-pdf', 'file-checksum', 'metadata-remover']
  },

  'passphrase-generator': {
    intro: 'A random passphrase of ordinary words beats a short mangled password on both counts that matter: it is stronger, and you can actually remember it. The strength comes from the number of possible combinations, not from looking complicated.',
    what: [
      'Draws words at random from a <strong>564-word list</strong>, which gives <strong>9.14 bits of entropy per word</strong>. Four words is about 37 bits, five is 46, six is 55 — each extra word multiplies the search space by 564.',
      'Selection uses the browser’s cryptographic random source with rejection sampling, so the draw is genuinely uniform rather than subtly biased toward the start of the list.'
    ],
    specs: {
      caption: 'Entropy by length',
      rows: [
        ['Wordlist', '564 words'],
        ['Per word', '9.14 bits'],
        ['4 words', '≈ 37 bits'],
        ['5 words', '≈ 46 bits'],
        ['6 words', '≈ 55 bits'],
        ['7 words', '≈ 64 bits'],
        ['Randomness', 'crypto.getRandomValues, unbiased'],
        ['Runs', 'On your device — nothing generated server-side']
      ]
    },
    steps: [
      'Choose the number of words — five or six for anything important.',
      'Add a separator, capitalisation or a number if a site demands them.',
      'Store it in a password manager rather than trusting memory alone.'
    ],
    tip: 'Use the passphrase as generated. Substituting characters — a for @, o for 0 — adds almost no real strength because every cracking tool tries those substitutions first, and it destroys the memorability that was the whole point. If you need more strength, add a word: that multiplies the difficulty by 564.',
    faqs: [
      { q: 'How many words do I need?', a: 'Five gives about 46 bits and is fine for most accounts; six gives 55 and suits anything valuable. Four at 37 bits is acceptable only where the account matters little. Each extra word multiplies the possibilities by 564.' },
      { q: 'Is a passphrase really stronger than a complex password?', a: 'For the same memorability, comfortably. "Tr0ub4dor&3" is short enough to be searched despite looking complicated; five random words is a far larger space and you can recall it. Length beats character variety once the choice is genuinely random.' },
      { q: 'Should I substitute characters?', a: 'No. Cracking software tries those substitutions as standard, so the added strength is negligible while the memorability loss is total. Add a word instead.' },
      { q: 'Is the randomness trustworthy?', a: 'It uses the browser’s cryptographic random generator with rejection sampling to avoid modulo bias — so every word is equally likely. A naive implementation would favour the earlier words slightly, which reduces real entropy.' }
    ],
    related: ['password-generator', 'password-strength', 'text-encrypt', 'totp-generator', 'uuid-generator', 'hash-generator']
  },

  'password-strength': {
    intro: 'Strength meters that praise "P@ssw0rd1!" have taught a generation of people to build weak passwords that look strong. What actually matters is how many possibilities an attacker must search, and that depends on length far more than on symbols.',
    what: [
      'Estimates strength from the <strong>character pool</strong> your password draws on and its length, giving the size of the search space rather than a vague verdict.',
      'The pools are 26 lowercase, 26 uppercase, 10 digits and 25 symbols. Adding a character type widens the pool once; adding a character multiplies the space by the whole pool.'
    ],
    specs: {
      caption: 'Character pools',
      rows: [
        ['Lowercase', '26 characters'],
        ['Uppercase', '26'],
        ['Digits', '10'],
        ['Symbols', '25'],
        ['All four', '87 possible characters per position'],
        ['Each extra character', 'Multiplies the search space by the pool size'],
        ['<strong>Cannot detect</strong>', '<strong>Reused or already-breached passwords</strong>'],
        ['Runs', 'On your device — nothing is transmitted']
      ]
    },
    steps: [
      'Type or paste the password.',
      'Read the estimate as a rough order of magnitude, not a verdict.',
      'If it is short, add length before adding symbols.'
    ],
    tip: 'A strength meter cannot see the thing that actually compromises most accounts: reuse. A password that scores perfectly here and is also on a site breached three years ago offers no protection at all, because attackers try known pairs first. Uniqueness matters more than complexity, which is why a password manager beats any amount of cleverness.',
    faqs: [
      { q: 'Does a high score mean my password is safe?', a: 'No. It means the password is hard to guess by brute force. It says nothing about reuse, whether it has appeared in a breach, or whether you typed it into a phishing page — and those account for far more compromises than brute force does.' },
      { q: 'Length or symbols?', a: 'Length, decisively. Adding a symbol widens the pool from 62 to 87; adding a character multiplies the entire search space by 87. Two more characters beats any amount of punctuation.' },
      { q: 'Is my password sent anywhere?', a: 'No. It is evaluated in your browser and never transmitted — which is the only acceptable design for a tool that asks you to type a password into it.' },
      { q: 'Why do sites demand symbols if length matters more?', a: 'Mostly inherited policy from older guidance. Current advice from bodies such as NIST favours length and uniqueness and discourages forced complexity rules, precisely because they push people toward predictable patterns.' }
    ],
    related: ['password-generator', 'passphrase-generator', 'text-encrypt', 'totp-generator', 'hash-generator', 'file-checksum']
  },

  'totp-generator': {
    intro: 'Two-factor codes are the same six digits your authenticator app shows, generated from a shared secret and the current time. Understanding that is what tells you why the codes fail when a clock drifts.',
    what: [
      'Computes TOTP codes using <strong>HMAC-SHA1 on a 30-second step</strong>, producing <strong>6 digits</strong> — the standard every mainstream authenticator implements.',
      '<strong>The code depends on the current time</strong>, which is why a device with a clock more than a minute out generates codes that are silently rejected.'
    ],
    specs: {
      caption: 'The algorithm',
      rows: [
        ['Standard', 'TOTP (RFC 6238)'],
        ['Hash', 'HMAC-SHA1'],
        ['Time step', '30 seconds'],
        ['Digits', '6'],
        ['Secret format', 'Base32 — as printed under a QR code'],
        ['Implementation', 'Browser Web Crypto — no library, no network'],
        ['Depends on', 'Your device clock being accurate'],
        ['<strong>Storage</strong>', '<strong>None — this is not a replacement for an authenticator app</strong>']
      ]
    },
    steps: [
      'Paste the base32 secret — the string shown under the QR code during setup.',
      'Read the current code.',
      'Use it before the 30-second window closes.'
    ],
    tip: 'This is useful for testing a TOTP setup or recovering access when your authenticator is unavailable — it is not a place to keep your secrets. It stores nothing, so you would be pasting a secret each time, and a secret that lives in your clipboard and browser history is a secret with a much larger attack surface than one inside an app.',
    faqs: [
      { q: 'My code is rejected as invalid.', a: 'Almost always clock drift. TOTP is computed from the current time, so a device more than about a minute off generates codes the server will not accept. Enable automatic time sync and try again.' },
      { q: 'Why SHA-1 — is that not broken?', a: 'SHA-1 is broken for collision resistance, which HMAC does not depend on. HMAC-SHA1 remains secure for this purpose and is what RFC 6238 specifies, so every mainstream authenticator uses it. Changing it would break compatibility for no security gain.' },
      { q: 'Should I use this instead of an authenticator app?', a: 'No. It keeps nothing, so you would paste your secret in every time — putting it in your clipboard and possibly your history. Use a real authenticator for daily use and this for testing or emergency access.' },
      { q: 'Is my secret transmitted?', a: 'No. Codes are computed with the browser’s Web Crypto on your device, and nothing is sent anywhere.' }
    ],
    related: ['password-generator', 'passphrase-generator', 'hash-generator', 'password-strength', 'text-encrypt', 'qr-generator']
  },

  'file-checksum': {
    intro: 'A checksum answers one question precisely: is this file byte-for-byte the file it should be? It is how you confirm a download was not corrupted, and how you notice if it was replaced.',
    what: [
      'Computes <strong>SHA-1, SHA-256 and SHA-512</strong> hashes of a file, so you can compare against the value a publisher provides.',
      'The comparison is all-or-nothing: change one byte anywhere in the file and the entire hash changes. There is no such thing as a nearly-matching checksum.'
    ],
    specs: {
      caption: 'Algorithms and use',
      rows: [
        ['SHA-256', 'The current default for verification'],
        ['SHA-512', 'Longer digest, same guarantees'],
        ['SHA-1', 'Legacy — still published, no longer collision-resistant'],
        ['MD5', 'Deliberately not offered — broken'],
        ['Sensitivity', 'One changed byte changes the whole hash'],
        ['Matching', 'Exact or not at all'],
        ['File handling', 'Read in your browser — never uploaded'],
        ['Large files', 'Hashing is fast; reading from disk is the limit']
      ]
    },
    steps: [
      'Add the file.',
      'Copy the hash for the algorithm the publisher used — usually SHA-256.',
      'Compare against theirs. It matches exactly or it does not match.'
    ],
    tip: 'Get the expected checksum from a different place than the file. If both come from the same page, an attacker who replaced the download replaced the checksum beside it, and the verification proves nothing. Publishers often post hashes on a separate release page, a signed announcement or a mailing list for exactly this reason.',
    faqs: [
      { q: 'Which algorithm should I use?', a: 'SHA-256 unless the publisher specifies otherwise — it is the current default and what most projects publish. SHA-512 is equally fine. Use SHA-1 only when that is the only value provided, and treat it as a corruption check rather than a security guarantee.' },
      { q: 'Why is MD5 not offered?', a: 'Because it is broken. Collisions can be produced deliberately, so a matching MD5 does not establish that a file is the intended one. Offering it would invite exactly the false confidence a checksum is meant to prevent.' },
      { q: 'The checksum does not match — what now?', a: 'Do not open the file. It is either corrupted in transfer or it is not the file the publisher released. Download again from the official source; if it still differs, stop and report it.' },
      { q: 'Is my file uploaded?', a: 'No. It is read and hashed in your browser, which matters because verifying a file usually means it is one you have not yet decided to trust.' }
    ],
    related: ['hash-generator', 'metadata-remover', 'text-encrypt', 'compress-pdf', 'password-strength', 'pdf-repair']
  },

  'metadata-remover': {
    intro: 'Photographs carry more than the picture. A phone typically records the exact GPS coordinates, the date and time, the device model and its serial-adjacent identifiers — and all of it travels with the file when you post it.',
    what: [
      'Strips <strong>EXIF</strong> and related metadata from images, leaving the visible picture untouched.',
      'The location data is the part that matters most: a photograph taken at home and posted publicly can carry your address to anyone who opens the file properties.'
    ],
    specs: {
      caption: 'What is removed',
      rows: [
        ['GPS coordinates', 'Removed — the most sensitive field'],
        ['Date and time taken', 'Removed'],
        ['Camera make and model', 'Removed'],
        ['Exposure settings', 'Removed'],
        ['Editing software', 'Removed'],
        ['The image itself', 'Unchanged'],
        ['Social platforms', 'Often strip it too — but not all, and not always'],
        ['Runs', 'On your device — never uploaded']
      ]
    },
    steps: [
      'Add the image.',
      'Strip the metadata.',
      'Download and use the cleaned copy — keep your original if the data is useful to you.'
    ],
    tip: 'Strip metadata before uploading anywhere, not after. Major social platforms usually remove EXIF on upload, but forums, marketplaces, messaging apps and file-sharing services frequently do not — and a photograph of something for sale, taken at home, carries your address in a field that any buyer can read.',
    faqs: [
      { q: 'What is actually in EXIF data?', a: 'GPS coordinates, the date and time, camera make and model, lens, exposure settings, and often the software used to edit it. On a phone the location is precise enough to identify a specific building.' },
      { q: 'Do social networks strip this already?', a: 'The large ones usually do on upload, but you cannot rely on it — forums, marketplaces, messaging apps and cloud links frequently preserve the original file intact. Stripping first means it does not depend on their behaviour.' },
      { q: 'Does removing it change the image?', a: 'No. The pixels are untouched; only the descriptive fields are removed. The file gets marginally smaller.' },
      { q: 'Can I get the data back afterwards?', a: 'Not from the stripped copy. Keep the original if the date or location has value to you — that information is genuinely useful in a personal archive and genuinely dangerous in a public post.' }
    ],
    related: ['exif-viewer', 'screenshot-redactor', 'url-cleaner', 'compress-image', 'pdf-redact', 'file-checksum']
  },

  'url-cleaner': {
    intro: 'The link you copied probably has a tail of tracking parameters that identify where you got it and, often, who you are. Sharing it forwards passes that identifier to everyone who clicks.',
    what: [
      'Removes tracking parameters — <strong>utm_*</strong>, <strong>fbclid</strong>, <strong>gclid</strong>, <strong>msclkid</strong>, <strong>igshid</strong>, <strong>mc_eid</strong> and <strong>ref</strong> — leaving the link that actually points at the content.',
      'These serve the sender’s analytics, not the destination. Removing them almost never changes where the link goes, and it makes the URL shorter and more readable.'
    ],
    specs: {
      caption: 'What gets removed',
      rows: [
        ['<code>utm_*</code>', 'Campaign tracking — source, medium, campaign'],
        ['<code>fbclid</code>', 'Facebook click identifier'],
        ['<code>gclid</code>', 'Google Ads click identifier'],
        ['<code>msclkid</code>', 'Microsoft Ads click identifier'],
        ['<code>igshid</code>', 'Instagram share identifier'],
        ['<code>mc_eid</code>', '<strong>Mailchimp — identifies YOU personally</strong>'],
        ['<code>ref</code>', 'Generic referrer'],
        ['Runs', 'On your device — nothing is transmitted']
      ]
    },
    steps: [
      'Paste the URL.',
      'Clean it.',
      'Check the shortened link still works before sharing widely.'
    ],
    tip: '<code>mc_eid</code> is the one to care about. It is a Mailchimp subscriber identifier tied to <em>your</em> email address — so forwarding a newsletter link with it attached tells the sender that whoever clicked did so via you, and can associate those clicks with your identity. The others identify a campaign; that one identifies a person.',
    faqs: [
      { q: 'Will the link still work?', a: 'Almost always. These parameters are read by analytics rather than by the page itself. A rare site does use one for routing — check before sharing something critical, but the failure rate is very low.' },
      { q: 'Why bother?', a: 'Three reasons: shorter and more readable links, no passing of a click identifier to everyone you share with, and less data handed to the tracking network. The Mailchimp identifier in particular is tied to your own subscription.' },
      { q: 'Does this hide me from the destination site?', a: 'No, and it is important not to overclaim. The site still sees your IP address, your browser and any cookies it has already set. This removes parameters from the URL — one layer, not anonymity.' },
      { q: 'Is the URL sent anywhere?', a: 'No. The cleaning happens in your browser, so the link you paste is never transmitted.' }
    ],
    related: ['metadata-remover', 'url-encoder', 'utm-builder', 'screenshot-redactor', 'slug-generator', 'qr-generator']
  },

  'screenshot-redactor': {
    intro: 'Screenshots of dashboards, invoices and inboxes get shared constantly, and each one usually contains an email address, an account number or a name that did not need to be there. The safe way to remove it is to destroy the pixels, not cover them.',
    what: [
      'Lets you paint solid blocks over anything sensitive, then exports the flattened result — <strong>the covered pixels are gone from the output</strong>, not hidden beneath a shape.',
      'That distinction is the whole point. A rectangle drawn in a document editor sits above content that still exists; this removes it.'
    ],
    specs: {
      caption: 'Why it is safe',
      rows: [
        ['Method', 'Blocks painted into the image, then flattened'],
        ['Recoverable?', 'No — the pixels are replaced'],
        ['<strong>Do not use blur instead</strong>', '<strong>Blur is reversible enough to fail</strong>'],
        ['Cover generously', 'Partial characters remain legible'],
        ['Check before sending', 'Zoom in on every block'],
        ['Also check', 'Tabs, notifications, taskbars, autofill dropdowns'],
        ['Runs', 'On your device — never uploaded']
      ]
    },
    steps: [
      'Add the screenshot.',
      'Paint over everything sensitive, covering generously past the edges.',
      '<strong>Look at the whole image again</strong> — browser tabs and notifications leak more than the content does.',
      'Export and check the result before sending.'
    ],
    tip: 'The leak is usually not in the part you were focused on. Browser tab titles, a notification banner, a taskbar, an autofill dropdown, a bookmark bar and the reflection of another window have all exposed information in screenshots that were carefully redacted in the middle. Scan the edges before you export.',
    faqs: [
      { q: 'Can the covered content be recovered?', a: 'No. The blocks are painted into the image and the result is flattened, so the original pixels are not present in the file. That is the difference between this and drawing a rectangle in a document, where the content underneath still exists.' },
      { q: 'Why not just blur it?', a: 'Because blur is a reversible transformation, and blurred or pixelated text has been recovered in published research and in real leaks. A solid block removes the information; a blur obscures it, and those are not the same guarantee.' },
      { q: 'How much should I cover?', a: 'More than the text itself. Partial characters at the edge of a block are often enough to reconstruct a word, especially for predictable formats like email addresses and account numbers.' },
      { q: 'Is my screenshot uploaded?', a: 'No — everything happens in your browser. That matters here more than almost anywhere else on the site, since the images people redact are by definition the ones containing something they do not want seen.' }
    ],
    related: ['metadata-remover', 'pdf-redact', 'image-blur', 'crop-image', 'url-cleaner', 'exif-viewer']
  },

  /* ============ batch 15 — education cluster (complete) ============
   * 8 pages from tools-edu.js. Four use localStorage, which is stated plainly
   * on each because losing a term's study data to a cleared browser is a real
   * and unrecoverable failure. citation-generator does APA/MLA/Chicago;
   * diagram-maker emits Mermaid. */

  'flashcard-maker': {
    intro: 'Flashcards work because of a specific mechanism: forcing yourself to retrieve an answer strengthens memory far more than reading it again. The card is just a device for making retrieval unavoidable.',
    what: [
      'Builds a deck you can flip through, storing it in your browser so it survives closing the tab.',
      '<strong>Saved in local storage on this device only.</strong> That means no account and nothing uploaded — and also that clearing browser data destroys the deck, with no way back.'
    ],
    specs: {
      caption: 'How it works',
      rows: [
        ['Card format', 'Front and back — question and answer'],
        ['Study mode', 'Flip to reveal'],
        ['Storage', '<strong>Browser local storage, this device only</strong>'],
        ['Syncs across devices?', '<strong>No</strong>'],
        ['Survives clearing browser data?', '<strong>No — export or copy out</strong>'],
        ['Account needed', 'None'],
        ['Uploaded anywhere', 'No'],
        ['Best deck size', '20–50 cards per session']
      ]
    },
    steps: [
      'Write one fact per card — a card with three facts tests none of them properly.',
      'Phrase the front as a question, not a topic.',
      'Study by answering before you flip, out loud if you can.',
      'Copy the deck somewhere else periodically. See the tip.'
    ],
    tip: 'Answer before flipping, every time, even when you are sure. The moment of effortful retrieval is what builds the memory — flipping first and thinking "yes, I knew that" produces the feeling of learning without the substance. It is the single most common way flashcards get used badly.',
    faqs: [
      { q: 'Will I lose my deck?', a: 'You can. It lives in this browser’s local storage, so clearing site data removes it, it does not appear on another device, and a browser reclaiming storage can drop it. Copy your cards into a document periodically if the deck represents real work.' },
      { q: 'How many cards should a deck have?', a: 'Twenty to fifty for a single session. Longer decks mean the cards you struggle with come round too rarely to help, and the session becomes a slog rather than practice.' },
      { q: 'Should the front be a question or a topic?', a: 'A question. "Photosynthesis" prompts vague recognition; "What does photosynthesis convert light energy into?" forces an actual answer, and only the second builds retrievable memory.' },
      { q: 'Does it do spaced repetition?', a: 'No — it is a straightforward deck you flip through. For scheduled review intervals you would want dedicated software; this is for building and drilling a set quickly.' }
    ],
    related: ['vocabulary-builder', 'quiz-maker', 'study-planner', 'learning-tracker', 'mind-map-generator', 'text-to-pdf']
  },

  'vocabulary-builder': {
    intro: 'Learning a word means learning it in context. A list of translations produces recognition — you know the word when you see it — without production, which is the ability to reach for it when speaking.',
    what: [
      'Keeps a word list with meanings you can reveal one at a time, so you test yourself rather than read a table.',
      'Stored in your browser, so the list persists between sessions without an account and without anything leaving your device.'
    ],
    specs: {
      caption: 'How it works',
      rows: [
        ['Entry', 'Word and meaning'],
        ['Study mode', 'Reveal the meaning after attempting it'],
        ['Storage', '<strong>Browser local storage, this device only</strong>'],
        ['Syncs?', 'No'],
        ['Survives clearing browser data?', 'No'],
        ['Language-specific features', 'None — works for any language'],
        ['Account needed', 'None'],
        ['Uploaded anywhere', 'No']
      ]
    },
    steps: [
      'Add words as you meet them, in context, rather than from a list.',
      'Include a short example sentence in the meaning field.',
      'Test in both directions — word to meaning, and meaning to word.'
    ],
    tip: 'Add an example sentence, not just a translation. A word learned alone gives you recognition; a word learned in a phrase gives you the grammar and collocation that let you actually use it. "Rendre" means little on its own — "rendre un livre" tells you what preposition to expect and what it goes with.',
    faqs: [
      { q: 'How many new words a day?', a: 'Ten to fifteen is sustainable for most people. More than that and the review burden compounds until you stop. Consistency matters more than volume — a hundred words a week retained beats three hundred forgotten.' },
      { q: 'Why test in both directions?', a: 'Because recognising a word and producing it are different skills. Meaning-to-word is harder and is what you need to speak; word-to-meaning alone leaves you understanding a language you cannot use.' },
      { q: 'Will my list sync to my phone?', a: 'No. It is stored in this browser on this device. Keep a copy elsewhere if the list matters — clearing site data removes it permanently.' },
      { q: 'Does it work for any language?', a: 'Yes — the fields are just text, so scripts, tones and non-Latin alphabets all work. There is nothing language-specific in it.' }
    ],
    related: ['flashcard-maker', 'quiz-maker', 'study-planner', 'learning-tracker', 'word-counter', 'text-to-speech']
  },

  'citation-generator': {
    intro: 'Citation styles differ in ways that look arbitrary and are enforced strictly. APA leads with the year, MLA with the page, Chicago with a note — and getting them mixed up is one of the easiest marks to lose.',
    what: [
      'Formats references in <strong>APA</strong>, <strong>MLA</strong> and <strong>Chicago</strong> from the details you enter.',
      'The differences are not decorative: they reflect what each discipline considers most important. APA puts the year forward because currency matters in science; MLA emphasises the page because close reading matters in humanities.'
    ],
    specs: {
      caption: 'The three styles',
      rows: [
        ['APA', 'Author (Year). Title. — sciences, social sciences'],
        ['MLA', 'Author. "Title." — humanities, literature'],
        ['Chicago', 'Notes or author-date — history, arts'],
        ['APA emphasises', 'Year of publication'],
        ['MLA emphasises', 'Page location'],
        ['Chicago offers', 'Two systems — check which yours wants'],
        ['Not included', 'Automatic metadata lookup — you enter the details'],
        ['Runs', 'On your device']
      ]
    },
    steps: [
      'Check which style and which edition your institution requires.',
      'Enter the source details.',
      'Copy the formatted reference, then check it against your style guide.'
    ],
    tip: 'Ask which <em>edition</em> of the style you need. APA 7 changed several rules from APA 6 — including dropping the publisher location and how multiple authors are listed — so a correctly formatted APA 6 reference is now a wrong APA 7 one. Departments often specify an edition and rarely mention it twice.',
    faqs: [
      { q: 'Which style should I use?', a: 'Whichever your department requires — it is not a preference. APA is common in sciences and social sciences, MLA in humanities, Chicago in history and the arts. If the brief does not say, ask rather than guess.' },
      { q: 'Why do the styles differ so much?', a: 'They encode disciplinary priorities. APA front-loads the year because research currency matters; MLA front-loads the page because humanities argue from specific passages; Chicago supports notes because historians cite discursively.' },
      { q: 'Does it look up sources automatically?', a: 'No — you enter the details. That is slower and more reliable: automatic lookups routinely get author order, subtitles and edition numbers wrong, and those errors are invisible until someone checks.' },
      { q: 'Should I check the output?', a: 'Yes, against your style guide. Edge cases — multiple authors, no author, translated works, chapters within edited volumes — have specific rules that a general formatter will not always match.' }
    ],
    related: ['word-counter', 'readability', 'text-to-pdf', 'markdown-to-pdf', 'study-planner', 'flashcard-maker']
  },

  'mind-map-generator': {
    intro: 'A mind map turns a flat list into a shape, and the shape is the point — seeing which branch has ten items and which has one tells you where your thinking is thin.',
    what: [
      'Builds a map from plain text, <strong>one branch per line</strong>, so you type rather than drag boxes around.',
      'Typing is faster than any drag-and-drop editor for the stage where you are still generating ideas, which is the stage mind maps are actually for.'
    ],
    specs: {
      caption: 'How it works',
      rows: [
        ['Input', 'Plain text — one branch per line'],
        ['Structure', 'Central topic with radiating branches'],
        ['Editing', 'Type, do not drag'],
        ['Best for', 'Generating and grouping ideas'],
        ['Less good for', 'Precise diagrams — use Diagram Maker'],
        ['Reveals', 'Uneven branches, where thinking is thin'],
        ['Runs', 'On your device'],
        ['Export', 'Save or print the result']
      ]
    },
    steps: [
      'Write the central topic.',
      'Add one branch per line, without editing as you go.',
      'Look at the balance — an overloaded branch usually wants splitting, an empty one usually needs work.'
    ],
    tip: 'Generate first, organise second. The value of a mind map comes from getting everything out before judging any of it, and stopping to reorganise mid-flow kills exactly the associative thinking you are trying to capture. Dump every branch, then look at the shape.',
    faqs: [
      { q: 'Mind map or diagram?', a: 'A mind map is for exploring — radiating associations from one idea, with no fixed relationships. A diagram is for describing something you already understand, with specific connections. Use Diagram Maker when the structure matters.' },
      { q: 'Why type instead of dragging?', a: 'Speed at the stage that matters. During idea generation, the bottleneck should be your thinking, not your mouse — dragging boxes slows you to the pace of the interface and interrupts the flow.' },
      { q: 'What does an unbalanced map tell me?', a: 'Usually that one branch is really several topics, or that a sparse branch is one you have not thought about. Both are useful findings, and both are invisible in a linear list.' },
      { q: 'Can I keep it?', a: 'Save or print the result. Nothing is stored automatically, so export anything you want to keep before closing the tab.' }
    ],
    related: ['diagram-maker', 'study-planner', 'flashcard-maker', 'markdown-editor', 'text-to-pdf', 'quiz-maker']
  },

  'diagram-maker': {
    intro: 'Diagrams drawn by hand in a graphics editor are painful to change, and they always need changing. Describing the diagram in text and letting software lay it out means editing is a one-line change rather than a redraw.',
    what: [
      'Renders <strong>Mermaid</strong> syntax — flowcharts and sequence diagrams — from a text description. You write the relationships; the layout is computed.',
      'Because the source is text, it can live in a document, a README or version control, and a diff shows exactly what changed.'
    ],
    specs: {
      caption: 'Syntax and use',
      rows: [
        ['Language', 'Mermaid'],
        ['Diagram types', 'Flowchart, sequence diagram'],
        ['Layout', 'Computed automatically — you do not position anything'],
        ['Source is', 'Plain text — versionable and diffable'],
        ['Editing', 'Change a line, the layout re-flows'],
        ['Also supported by', 'GitHub, GitLab, Notion and many docs tools'],
        ['Runs', 'In your browser'],
        ['Best for', 'Process flows, decision trees, API interactions']
      ]
    },
    steps: [
      'Start with <code>flowchart TD</code> for top-down, or <code>sequenceDiagram</code> for interactions.',
      'Describe nodes and arrows one relationship per line.',
      'Let the layout resolve itself rather than fighting it.'
    ],
    tip: 'Because Mermaid renders natively on GitHub, GitLab and several documentation platforms, a diagram written here can be pasted straight into a README and stay editable there. That is the real advantage over an exported image — the diagram in your docs never drifts out of date because updating it is a text edit rather than a redraw.',
    faqs: [
      { q: 'Why Mermaid rather than drawing?', a: 'Because diagrams change. A drawn diagram is re-drawn every time the process shifts; a text description is a one-line edit and the layout recomputes. It also lives in version control, so changes are visible in a diff.' },
      { q: 'Which diagram types work?', a: 'Flowcharts and sequence diagrams — the two that cover most process and interaction documentation. Flowcharts for decisions and steps, sequence diagrams for who calls whom in what order.' },
      { q: 'Can I control the layout?', a: 'Only loosely — direction and grouping, not exact positions. That is deliberate: automatic layout is what makes editing cheap. If you need pixel control, you want a drawing tool and the maintenance burden that comes with it.' },
      { q: 'Where else can I use the same code?', a: 'GitHub and GitLab render Mermaid in Markdown, as do Notion and many static site generators. The same block works in all of them.' }
    ],
    related: ['mind-map-generator', 'markdown-editor', 'markdown-to-pdf', 'html-to-pdf', 'json-formatter', 'study-planner']
  },

  'learning-tracker': {
    intro: 'Study time is systematically misremembered — an evening that felt like three hours of work was often ninety minutes of work and ninety of drifting. Logging it turns an impression into a number.',
    what: [
      'Logs study sessions so you can see actual time spent rather than estimated time spent, kept in your browser between visits.',
      'The honest total is usually lower than the felt one, and that gap is the useful finding.'
    ],
    specs: {
      caption: 'How it works',
      rows: [
        ['Logs', 'Study sessions with duration'],
        ['Storage', '<strong>Browser local storage, this device only</strong>'],
        ['Syncs?', 'No'],
        ['Survives clearing browser data?', 'No'],
        ['Account needed', 'None'],
        ['Best used', 'Logged at the end of each session, not weekly'],
        ['Reveals', 'The gap between felt and actual study time'],
        ['Uploaded anywhere', 'No']
      ]
    },
    steps: [
      'Log each session as it ends, while the time is accurate.',
      'Record what you actually did, not what you intended.',
      'Review weekly and compare against what you assumed.'
    ],
    tip: 'Log the session immediately, not at the end of the week. Reconstructed times are consistently inflated — people remember the duration of the sitting rather than the duration of the work — and a log built from memory measures your optimism rather than your effort.',
    faqs: [
      { q: 'Why track study time at all?', a: 'Because the estimate and the reality diverge sharply, and always in the same direction. Seeing that four claimed hours were two real ones is uncomfortable and far more actionable than any resolution to "study harder".' },
      { q: 'Will I lose my log?', a: 'It is stored in this browser only, so clearing site data removes it and it will not appear on another device. Copy the totals out periodically if a term’s data matters to you.' },
      { q: 'Should I count breaks?', a: 'No — count the work. A three-hour session with an hour of breaks is two hours of study, and recording it as three is exactly the self-deception this is meant to remove.' },
      { q: 'How often should I review it?', a: 'Weekly. Daily is too noisy to show a pattern and monthly is too late to change anything before an exam.' }
    ],
    related: ['study-planner', 'pomodoro', 'flashcard-maker', 'vocabulary-builder', 'quiz-maker', 'countdown']
  },

  'quiz-maker': {
    intro: 'Writing a quiz is a better way to learn a subject than answering one. Producing plausible wrong answers forces you to understand where the real confusions lie, which is exactly what an exam tests.',
    what: [
      'Builds a multiple-choice quiz you can take and score, marking correct answers as you go.',
      'The effort is in the distractors. Obviously wrong options make a quiz that tests nothing; plausible ones make it test whether you actually know the distinction.'
    ],
    specs: {
      caption: 'How it works',
      rows: [
        ['Question type', 'Multiple choice'],
        ['Answers', 'Mark the correct option per question'],
        ['Scoring', 'Check score after answering'],
        ['Best distractor count', 'Three wrong options per question'],
        ['Runs', 'On your device'],
        ['Uploaded anywhere', 'No'],
        ['Best for', 'Self-testing and revision groups'],
        ['Not', 'A proctored assessment tool']
      ]
    },
    steps: [
      'Write questions covering things you find hard, not things you find easy.',
      'Make every wrong answer plausible — ideally a real misconception.',
      'Take the quiz cold, a day later.'
    ],
    tip: 'Write the wrong answers from your own mistakes. A distractor that reflects a confusion you actually had tests something real; one invented to fill a slot is dismissed at a glance and teaches nothing. Reviewing your errors and turning each into an option is the highest-value part of making the quiz.',
    faqs: [
      { q: 'Why make a quiz instead of just answering one?', a: 'Because writing questions requires deciding what matters and what could plausibly be confused with it — a much deeper engagement than answering. The making is the studying; taking it afterwards is a bonus.' },
      { q: 'How many options per question?', a: 'Four total — one correct, three plausible wrong. Two is close to a coin flip; five or more usually means padding with options nobody would pick.' },
      { q: 'Should I test what I know or what I do not?', a: 'What you do not. Testing comfortable material feels productive and changes nothing. The uncomfortable questions are where the marks are.' },
      { q: 'Can I share the quiz with a study group?', a: 'It runs on your device and stores nothing, so you would rebuild it elsewhere. That is a limitation — it is designed for self-testing rather than distribution.' }
    ],
    related: ['flashcard-maker', 'vocabulary-builder', 'study-planner', 'learning-tracker', 'random-picker', 'citation-generator']
  },

  'study-planner': {
    intro: 'Most study plans fail on the same day: the one where something overruns and the whole schedule collapses because it had no slack in it. A plan that survives contact with a real week is one that expected to be disrupted.',
    what: [
      'Organises subjects and sessions into a study schedule you can follow and adjust.',
      'The design constraint is realism. A plan that assumes every day goes well is abandoned the first time one does not, and abandoned plans are worse than no plan because they cost you the confidence to make another.'
    ],
    specs: {
      caption: 'How it works',
      rows: [
        ['Organises', 'Subjects and study sessions'],
        ['Session length', '45–90 minutes suits most people'],
        ['Slack', 'Leave one empty slot a week — see the tip'],
        ['Spacing', 'Beats cramming for retention'],
        ['Runs', 'On your device'],
        ['Uploaded anywhere', 'No'],
        ['Pair with', 'Learning Tracker, to compare plan against reality'],
        ['Review', 'Weekly, not daily']
      ]
    },
    steps: [
      'List subjects with the time each genuinely needs, not equal time each.',
      'Block sessions of 45–90 minutes.',
      '<strong>Leave at least one slot empty every week.</strong>',
      'Review weekly and move things rather than abandoning the plan.'
    ],
    tip: 'Build in a catch-up slot every week and do not fill it. Something always overruns, and a plan with no slack turns one bad evening into a week of being behind — which is the point at which most people stop following the plan at all. The empty slot is what makes it survivable.',
    faqs: [
      { q: 'How long should a study session be?', a: '45 to 90 minutes. Shorter rarely gets past setting up; much longer and attention degrades to the point where you are re-reading rather than learning. Break between sessions rather than pushing through.' },
      { q: 'Should each subject get equal time?', a: 'No — weight by difficulty and by weight in the assessment. Equal time feels fair and is a poor use of a limited week; the subject you find hardest usually needs the most, and it is the one people avoid.' },
      { q: 'Cramming or spacing?', a: 'Spacing, decisively, for anything you need to retain past the exam. Cramming can pass a test tomorrow and is close to useless a month later — which matters when next year’s material builds on it.' },
      { q: 'What if I fall behind?', a: 'Use the catch-up slot, and if you are further behind than that, re-plan rather than abandon. A revised plan you follow beats an ideal one you have quietly stopped looking at.' }
    ],
    related: ['learning-tracker', 'pomodoro', 'flashcard-maker', 'quiz-maker', 'countdown', 'date-calculator']
  },

  /* ============ batch 16a — travel cluster (complete) ============ */

  'fuel-cost-calculator': {
    intro: 'Fuel is the cost people misjudge most when deciding whether to drive, because it feels like it belongs to the car rather than to the journey. Working it out changes a surprising number of drive-or-train decisions.',
    what: [
      'Multiplies distance by consumption by price. Handles both conventions — <strong>L/100km</strong> (lower is better) and <strong>MPG</strong> (higher is better) — which is the detail that trips people up when reading figures from another country.',
      'Defaults to a 300-unit trip so the arithmetic is easy to sanity-check against your own experience.'
    ],
    specs: {
      caption: 'Inputs',
      rows: [
        ['Distance', 'Default 300'],
        ['Economy', 'L/100km or MPG'],
        ['<strong>L/100km</strong>', '<strong>Lower is better</strong>'],
        ['<strong>MPG</strong>', '<strong>Higher is better</strong>'],
        ['Fuel price', 'Per litre or per gallon, to match'],
        ['Returns', 'Total fuel cost for the trip'],
        ['Excludes', 'Tolls, parking, wear, depreciation'],
        ['Mind the gallon', 'US and UK gallons differ by 20%']
      ]
    },
    steps: [
      'Enter the distance and pick your units.',
      'Enter your car’s real economy, not the manufacturer’s figure.',
      'Add the current fuel price and read the trip cost.'
    ],
    tip: 'Use your own measured economy, not the number on the brochure. Official figures come from standardised test cycles and real driving is routinely 10–20% worse, more in cold weather or heavy traffic. Fill up, note the odometer, fill up again — that number is the one worth entering.',
    faqs: [
      { q: 'Is a higher number better or worse?', a: 'Depends on the unit, which is exactly why this catches people. MPG measures distance per fuel, so higher is better. L/100km measures fuel per distance, so lower is better. Reading a European figure as though it were MPG makes an efficient car look terrible.' },
      { q: 'Why is my real economy worse than the official figure?', a: 'Test cycles are standardised and gentle. Real driving involves cold starts, traffic, hills, air conditioning and speed — all of which cost fuel. A 10–20% shortfall is normal rather than a fault.' },
      { q: 'What is not included?', a: 'Tolls, parking, tyre and brake wear, servicing and depreciation. Fuel is usually the largest variable cost of a trip but it is not the whole cost of driving.' },
      { q: 'Does it handle US and UK gallons?', a: 'Enter the price in the same gallon your economy figure uses. The two differ by about 20%, which is more than enough to make a comparison meaningless if they are mixed.' }
    ],
    related: ['fuel-economy-converter', 'mileage-reimbursement', 'distance-calculator', 'trip-cost-splitter', 'volume-converter', 'unit-converter']
  },

  'fuel-economy-converter': {
    intro: 'Fuel economy is quoted four different ways depending on where the car was sold, and two of them run in opposite directions. Comparing a US review against a European one without converting produces confident nonsense.',
    what: [
      'Converts between <strong>MPG (US)</strong>, <strong>MPG (UK)</strong>, <strong>L/100km</strong> and <strong>km/L</strong>.',
      '<strong>US and UK MPG are not the same figure</strong>, because the gallons differ: 30 MPG US is about 36 MPG UK for exactly the same car. That gap alone explains many baffling car-forum arguments.'
    ],
    specs: {
      caption: 'The four units',
      rows: [
        ['MPG (US)', 'Miles per US gallon — 3.785 L'],
        ['MPG (UK)', 'Miles per UK gallon — 4.546 L'],
        ['<strong>Same car</strong>', '<strong>30 MPG US ≈ 36 MPG UK</strong>'],
        ['L/100km', 'Litres per 100 km — <strong>lower is better</strong>'],
        ['km/L', 'Kilometres per litre — higher is better'],
        ['MPG and km/L', 'Distance per fuel — higher is better'],
        ['L/100km', 'Fuel per distance — inverted'],
        ['Conversion', 'Not linear between the two conventions']
      ]
    },
    steps: [
      'Enter the figure and say which unit it is in.',
      'Read every other unit.',
      'Check which MPG a source means before comparing — it often does not say.'
    ],
    tip: 'When a car review quotes MPG, find out whose gallon it means. A US publication quoting 30 MPG and a UK one quoting 36 MPG may be describing the identical car, and someone comparing the two numbers concludes the second is 20% more efficient. This is the commonest error in cross-border car comparisons.',
    faqs: [
      { q: 'Why are US and UK MPG different?', a: 'Because the gallon is. A US gallon is 3.785 litres, a UK gallon 4.546 — about 20% larger — so the same car travels further on one UK gallon. Same efficiency, different number.' },
      { q: 'Why is L/100km inverted?', a: 'It measures fuel consumed per fixed distance rather than distance per fixed fuel, so a smaller figure means less fuel. It is arguably the more useful convention for budgeting, since fuel is what you buy.' },
      { q: 'Is the conversion a simple multiplication?', a: 'Between MPG and km/L, yes. Between either of those and L/100km, no — it is a reciprocal relationship, which is why you cannot convert by scaling and why halving one does not halve the other.' },
      { q: 'Which unit should I use?', a: 'Whichever your region uses, so your figures match the prices and reviews around you. When comparing across regions, convert first — every time.' }
    ],
    related: ['fuel-cost-calculator', 'unit-converter', 'volume-converter', 'mileage-reimbursement', 'distance-calculator', 'length-converter']
  },

  'trip-cost-splitter': {
    intro: 'Group trips generate two problems: who paid for what, and who owes whom. The second is arithmetic and the first is memory — which is why splitting up at the end is where friendships get tested.',
    what: [
      'Divides a total across a group and shows the per-person share, defaulting to 1,200 split four ways.',
      'It handles the even split. Uneven contributions — one person paid for the accommodation, another for fuel — need each person’s total recorded before the settling-up makes sense.'
    ],
    specs: {
      caption: 'Inputs',
      rows: [
        ['Total trip cost', 'Default 1,200'],
        ['Number of people', 'Default 4'],
        ['Returns', 'Per-person share'],
        ['Handles', 'An even split of a known total'],
        ['Does not track', 'Who paid what — record that separately'],
        ['Rounding', 'Someone absorbs the odd cent'],
        ['Runs', 'On your device'],
        ['Best used', 'During the trip, not at the end']
      ]
    },
    steps: [
      'Record what each person pays as it happens — a shared note is enough.',
      'Enter the total and the group size for the per-person share.',
      'Compare each person’s spend against that share; the difference is what they owe or are owed.'
    ],
    tip: 'Track expenses as they happen, not at the end. Reconstructing a week of shared spending from bank statements and memory is where disagreements start, and the person who paid most is usually the one who remembers least clearly. A shared note updated at each purchase removes the entire problem.',
    faqs: [
      { q: 'How do I handle uneven payments?', a: 'Work out the per-person share, then compare it against what each person actually paid. Someone who paid more than the share is owed the difference; someone who paid less owes it. That reduces a tangle of payments to one number each.' },
      { q: 'What about costs only some people shared?', a: 'Split those separately among the people involved and add each person’s portion to their total before comparing against the group share. Lumping them in is what makes an "even split" feel unfair.' },
      { q: 'Who takes the rounding?', a: 'Someone has to. Rotating it, or letting whoever paid the most absorb it, avoids a discussion about a few cents that costs more goodwill than the amount involved.' },
      { q: 'Should I settle during or after?', a: 'Settling as you go avoids one large uncomfortable conversation at the end, and it means nobody is quietly carrying the group’s costs on their card for a fortnight.' }
    ],
    related: ['tip-split', 'tip-by-country', 'fuel-cost-calculator', 'percentage-calculator', 'currency-converter', 'budget-calculator']
  },

  'tip-by-country': {
    intro: 'Tipping is a local custom that travellers routinely get wrong in both directions — under-tipping in the US where staff depend on it, and over-tipping in Japan where it can cause genuine awkwardness.',
    what: [
      'Suggests a tip for a given bill in <strong>nine countries</strong>: the US, Canada, UK, Germany, France, Italy, Spain, Australia and Japan.',
      'The range between them is enormous, and it reflects how staff are paid rather than how generous the customers are.'
    ],
    specs: {
      caption: 'Coverage',
      rows: [
        ['Countries', 'US · Canada · UK · Germany · France · Italy · Spain · Australia · Japan'],
        ['United States', 'Highest — tipped wages are below minimum'],
        ['<strong>Japan</strong>', '<strong>Not customary — can cause awkwardness</strong>'],
        ['Australia', 'Low — staff are paid a full wage'],
        ['Europe', 'Modest rounding is common'],
        ['Bill amount', 'Default 50'],
        ['Watch for', 'Service already included on the bill'],
        ['Guidance is', 'Customary, not a rule']
      ]
    },
    steps: [
      'Enter the bill and choose the country.',
      '<strong>Check the bill for service already added</strong> before tipping on top.',
      'Adjust for the service you actually received.'
    ],
    tip: 'Read the bill before you tip. Many European restaurants add a service charge or a per-person cover, and tipping the customary percentage on top means paying twice — which visitors do constantly. If the bill lists "servizio", "service compris" or a cover charge, a small rounding-up is plenty.',
    faqs: [
      { q: 'Why is US tipping so much higher?', a: 'Because tipped staff in many US states may legally be paid below the standard minimum wage, with tips expected to make up the difference. The tip is part of the wage rather than a bonus, which is why not tipping there has a different meaning than elsewhere.' },
      { q: 'Should I tip in Japan?', a: 'Generally no. It is not customary and can be genuinely awkward — service is included in the price and excellent service is the expectation rather than something purchased. Leaving money can be politely refused or cause confusion.' },
      { q: 'What if service is already on the bill?', a: 'Then you have already tipped. Rounding up slightly is fine; adding the full customary percentage on top is paying twice, and it is the commonest visitor mistake in Europe.' },
      { q: 'Are these rules?', a: 'Customs, and they shift. Treat them as a starting point, watch what locals do, and adjust for the service you received.' }
    ],
    related: ['tip-split', 'trip-cost-splitter', 'currency-converter', 'percentage-calculator', 'vat-gst', 'budget-calculator']
  },

  'mileage-reimbursement': {
    intro: 'Claiming for business driving is straightforward arithmetic against a rate that changes annually — and using last year’s rate is how a claim gets queried or quietly underpaid.',
    what: [
      'Multiplies distance by a per-unit rate. Defaults to <strong>0.67</strong>, which reflects a recent published business rate.',
      '<strong>Check the current rate before claiming.</strong> These are revised at least yearly, sometimes mid-year when fuel prices move sharply, and the published figure is what your employer or tax authority will apply.'
    ],
    specs: {
      caption: 'Inputs',
      rows: [
        ['Distance driven', 'Default 250'],
        ['Rate per mile/km', 'Default 0.67'],
        ['<strong>Rate changes</strong>', '<strong>At least annually — check before claiming</strong>'],
        ['Rate is meant to cover', 'Fuel, wear, insurance, depreciation'],
        ['Commuting', 'Usually not claimable'],
        ['Records needed', 'Date, purpose, distance'],
        ['Returns', 'Total reimbursement'],
        ['Knows your jurisdiction?', 'No — you supply the rate']
      ]
    },
    steps: [
      'Look up the current published rate for your country and year.',
      'Enter the business distance — not commuting.',
      'Keep a log of date, purpose and distance for each journey.'
    ],
    tip: 'Log each journey as you make it, with the purpose written down. Mileage claims are among the most commonly queried expenses precisely because they are easy to estimate and hard to evidence after the fact — a contemporaneous log with dates and reasons settles a query in seconds, and a reconstructed one invites more questions.',
    faqs: [
      { q: 'Can I claim my commute?', a: 'Usually not. Travel between home and your normal workplace is typically ordinary commuting rather than business travel in most tax systems. Journeys to a client, a temporary site or between offices generally do qualify — check your local rules.' },
      { q: 'What does the rate cover?', a: 'It is meant to cover the full running cost — fuel, servicing, tyres, insurance and depreciation — not fuel alone. That is why it is several times the fuel-only cost per mile.' },
      { q: 'Why does the rate change?', a: 'Because the costs it approximates change, particularly fuel. Authorities revise it at least annually and occasionally mid-year, so a claim submitted at last year’s rate will be adjusted or challenged.' },
      { q: 'What records do I need?', a: 'Date, purpose and distance for each journey, at minimum. Some employers want start and end points too. Keep it as you go — that is the whole difference between a claim that is paid and one that is queried.' }
    ],
    related: ['fuel-cost-calculator', 'distance-calculator', 'income-tax-estimator', 'self-employment-tax', 'invoice-generator', 'unit-converter']
  },

  'distance-calculator': {
    intro: 'Journey time is distance divided by average speed, and the word doing the work is <em>average</em> — the figure that includes the roadworks, the town you pass through and the stop for fuel.',
    what: [
      'Calculates travel time from a distance and an average speed, in kilometres or miles.',
      'The common error is entering a cruising speed. Sustained motorway travel averages well below the limit once junctions, traffic and stops are counted, and a plan built on the limit is always optimistic.'
    ],
    specs: {
      caption: 'Inputs',
      rows: [
        ['Distance', 'Default 100'],
        ['Unit', 'Kilometres or miles'],
        ['Average speed', 'Not cruising speed — see the tip'],
        ['Returns', 'Journey time'],
        ['Realistic motorway average', 'Around 80–90 km/h (50–55 mph)'],
        ['Realistic mixed-road average', 'Around 60 km/h (40 mph)'],
        ['Excludes', 'Breaks, unless you build them in'],
        ['Runs', 'On your device']
      ]
    },
    steps: [
      'Enter the distance and unit.',
      'Enter a realistic <em>average</em> speed, well below the limit.',
      'Add breaks separately — roughly 15 minutes every two hours.'
    ],
    tip: 'Use about 80 km/h (50 mph) as a motorway average and 60 km/h (40 mph) for mixed roads, then add breaks. Entering the speed limit produces a time nobody achieves, and the gap compounds: on a six-hour drive the difference between limit and realistic average is well over an hour, which is the difference between arriving for dinner and arriving after it.',
    faqs: [
      { q: 'What average speed should I use?', a: 'Around 80 km/h or 50 mph for motorway journeys and 60 km/h or 40 mph for mixed roads. Both are well below the limits, and both are closer to what long journeys actually achieve once junctions, traffic and towns are included.' },
      { q: 'Why is my real journey always longer?', a: 'Because the plan used a cruising speed and the reality includes stopping. Every set of lights, every slow section and every fuel stop pulls the average down, and they add up over distance.' },
      { q: 'Should I add breaks?', a: 'Yes, separately — roughly 15 minutes every two hours, more with children. Driver fatigue is a real safety issue and breaks are not optional on a long drive.' },
      { q: 'Does it know my route?', a: 'No — it works from a distance you supply. Get the distance from a mapping service, then use a realistic average here rather than the optimistic time the map offers.' }
    ],
    related: ['fuel-cost-calculator', 'pace-calculator', 'speed-converter', 'length-converter', 'timezone-converter', 'mileage-reimbursement']
  },

  'packing-list': {
    intro: 'Packing badly is not usually about forgetting something exotic. It is forgetting the charger, the adapter or the medication — the small items that are annoying at best and trip-ruining at worst.',
    what: [
      'Builds a checklist you can work through and tick off, so the same forgotten item does not repeat trip after trip.',
      'The value is in reusing and improving it: a list that gets one item added every time you forget something becomes genuinely reliable after three or four trips.'
    ],
    specs: {
      caption: 'How to use it',
      rows: [
        ['Format', 'A checklist you tick off'],
        ['Best built', 'Once, then reused and refined'],
        ['Group by', 'Category — documents, electronics, clothing, health'],
        ['Highest-value items', 'Chargers, adapters, medication, documents'],
        ['Add to it', 'Every time you forget something'],
        ['Runs', 'On your device'],
        ['Uploaded anywhere', 'No'],
        ['Pair with', 'A calendar reminder the day before']
      ]
    },
    steps: [
      'Group by category rather than listing randomly.',
      'Put documents, medication and chargers at the top — those are the ones that matter.',
      'Add anything you forgot last time before you start packing.'
    ],
    tip: 'Pack the irreplaceable things first, not the obvious ones. Passport, medication, chargers and adapters are the items that either cannot be bought at the destination or cost far more there — while socks and a toothbrush are available everywhere. Most packing anxiety is spent on the replaceable half of the list.',
    faqs: [
      { q: 'What gets forgotten most?', a: 'Chargers and adapters, consistently — because they are in use right up until you leave. Medication, travel documents and anything charging in another room are the next most common.' },
      { q: 'Should I make a new list each trip?', a: 'No — reuse one and refine it. A list that gains an item every time you forget something becomes reliable quickly, whereas starting fresh repeats the same omissions.' },
      { q: 'How should I organise it?', a: 'By category: documents, electronics, clothing, toiletries, health. It matches how you actually pack and makes a gap obvious in a way an alphabetical list does not.' },
      { q: 'Is my list saved?', a: 'It lives in your browser session. Copy it out or print it if you want it for the next trip — that copy is what turns it into a reusable list rather than a one-off.' }
    ],
    related: ['trip-cost-splitter', 'timezone-converter', 'countdown', 'currency-converter', 'distance-calculator', 'tip-by-country']
  },

  /* ============ batch 16b — realestate cluster (complete) ============
   * YMYL. These compute property investment metrics and never advise. Every
   * threshold is labelled as a convention investors use, not a target. */

  'rental-yield': {
    intro: 'Yield is the first number property investors quote and the one most often quoted misleadingly, because gross yield ignores every cost of actually owning the thing.',
    what: [
      'Calculates both <strong>gross yield</strong> — annual rent divided by price — and <strong>net yield</strong>, which subtracts running costs and allows for vacancy.',
      'The gap between them is the whole point. A property advertised at 8.8% gross can land nearer 5% net once management, maintenance, insurance and empty months are counted.'
    ],
    specs: {
      caption: 'The two figures',
      rows: [
        ['Gross yield', '(Monthly rent × 12) ÷ price'],
        ['Net yield', 'Gross minus costs, adjusted for vacancy'],
        ['Default price / rent', '300,000 / 2,200 a month'],
        ['Costs to include', 'Management, maintenance, insurance, tax, fees'],
        ['Vacancy', 'Weeks empty per year — never assume zero'],
        ['<strong>Listings usually quote</strong>', '<strong>Gross — the flattering one</strong>'],
        ['Excludes', 'Mortgage interest — see Cash-on-Cash'],
        ['Is this advice?', '<strong>No</strong>']
      ]
    },
    steps: [
      'Enter price and monthly rent for the gross figure.',
      'Add real annual costs — management is typically 8–12% of rent.',
      'Set a realistic vacancy allowance, then compare net against gross.'
    ],
    tip: 'Never assume zero vacancy. Even a well-run property loses time between tenants, and two or three empty weeks a year is a normal planning assumption. An investor modelling twelve months of rent is overstating income by 4–6% before any other cost, which is often the entire difference between the yield they expected and the one they get.',
    faqs: [
      { q: 'Gross or net — which matters?', a: 'Net, always, for a decision. Gross is useful only for quickly comparing listings, and it is what agents quote because it is the larger number. Two properties with identical gross yields can differ substantially once service charges and management are counted.' },
      { q: 'What counts as a running cost?', a: 'Management fees, maintenance and repairs, insurance, service charges or ground rent, property taxes, letting fees and accountancy. Mortgage interest is treated separately — see Cash-on-Cash, which measures the return on your actual cash.' },
      { q: 'What vacancy rate should I assume?', a: 'Two to four weeks a year is a common planning figure in a stable market, more where tenancies turn over quickly. Assuming none is the single most common error in a first rental model.' },
      { q: 'Is a high yield always better?', a: 'Not necessarily, and this tool cannot judge it. High-yield areas often carry lower capital growth, higher management burden or more tenant turnover. Yield is one input to a decision that also involves risk, time and local knowledge — talk to a professional.' }
    ],
    related: ['cap-rate', 'cash-on-cash', 'rent-vs-buy', 'closing-costs', 'mortgage-payoff', 'profit-margin']
  },

  'cap-rate': {
    intro: 'Capitalisation rate is how commercial property is compared, because it strips out how the buyer financed the deal. Two investors paying the same price for the same building get the same cap rate even if one paid cash and the other borrowed everything.',
    what: [
      'Divides <strong>net operating income</strong> by property value. NOI is rental income minus operating expenses, and <strong>explicitly excludes mortgage payments</strong> — that exclusion is what makes cap rates comparable across deals.',
      'Defaults to a 300,000 property at 2,200 a month.'
    ],
    specs: {
      caption: 'What goes in',
      rows: [
        ['Formula', 'Net operating income ÷ property value'],
        ['NOI includes', 'Rent minus operating expenses'],
        ['<strong>NOI excludes</strong>', '<strong>Mortgage payments — deliberately</strong>'],
        ['Why exclude financing', 'So deals are comparable regardless of leverage'],
        ['Higher cap rate', 'Higher return, usually higher risk'],
        ['Lower cap rate', 'Lower return, usually prime location'],
        ['Compare against', 'Other properties in the same market'],
        ['Is this advice?', '<strong>No</strong>']
      ]
    },
    steps: [
      'Enter the property value and rent.',
      'Subtract operating expenses — but not the mortgage.',
      'Compare the result against similar properties in the same market, not a national average.'
    ],
    tip: 'A high cap rate is not a bargain, it is a price. Markets price risk into cap rates, so a building yielding 9% where comparable stock yields 5% is usually signalling something — a weak location, a short lease, a difficult tenant or deferred maintenance. The question to ask is what the market knows that makes it cheap.',
    faqs: [
      { q: 'Why does cap rate ignore the mortgage?', a: 'Because it describes the property, not the buyer. Two people can finance the same building completely differently; excluding debt lets them compare the asset on equal terms. Cash-on-Cash is the metric that does account for leverage.' },
      { q: 'Is a higher cap rate better?', a: 'It is a higher return and usually a higher risk. Prime, low-risk property in strong locations trades at low cap rates precisely because buyers accept less return for more security. Comparing a high cap rate against a low one without asking why is how people buy problems.' },
      { q: 'What is a normal cap rate?', a: 'It varies enormously by market, property type and interest rates, so a national figure is not much use. Compare against genuinely similar properties in the same area at the same time.' },
      { q: 'Should I buy based on cap rate?', a: 'This calculates a metric; it cannot assess a deal. Cap rate ignores growth prospects, condition, lease terms and your own tax position. Property decisions of this size warrant professional advice.' }
    ],
    related: ['rental-yield', 'cash-on-cash', 'rent-vs-buy', 'closing-costs', 'mortgage-payoff', 'investment-calculator']
  },

  'cash-on-cash': {
    intro: 'Cash-on-cash answers the question an investor actually cares about: what is my own money earning? Unlike cap rate, it includes the mortgage — because leverage is exactly what changes the answer.',
    what: [
      'Divides annual pre-tax cash flow by the cash you actually put in — deposit, closing costs and any initial works — rather than by the property price.',
      'Defaults to a 300,000 purchase with 60,000 down. Because the denominator is your cash rather than the price, borrowing more can raise this figure while raising risk just as fast.'
    ],
    specs: {
      caption: 'What goes in',
      rows: [
        ['Formula', 'Annual pre-tax cash flow ÷ total cash invested'],
        ['Cash invested', 'Deposit + closing costs + initial works'],
        ['<strong>Includes</strong>', '<strong>Mortgage payments — unlike cap rate</strong>'],
        ['Default purchase / down', '300,000 / 60,000'],
        ['Leverage', 'Raises the figure and the risk together'],
        ['Pre-tax', 'Your tax position is not modelled'],
        ['Excludes', 'Capital growth and principal paydown'],
        ['Is this advice?', '<strong>No</strong>']
      ]
    },
    steps: [
      'Enter the purchase price and your actual cash in — including closing costs.',
      'Enter rent and all costs including the mortgage payment.',
      'Read the return on your own money, and note it is before tax.'
    ],
    tip: 'Include closing costs in the cash invested, not just the deposit. Legal fees, taxes, surveys and initial repairs routinely add several percent of the purchase price, and leaving them out inflates the return on a figure that was never the real outlay. It is the commonest way a first model comes out too optimistic.',
    faqs: [
      { q: 'How is this different from cap rate?', a: 'Cap rate measures the property and ignores financing. Cash-on-cash measures your money and includes the mortgage. The same building gives different cash-on-cash figures to a cash buyer and a leveraged one, which is the point.' },
      { q: 'Does more leverage mean better returns?', a: 'It can raise the percentage, because the denominator shrinks. It also raises risk in the same motion — a vacancy or a rate rise is far more dangerous when the mortgage is large. A high figure achieved through heavy borrowing is not the same as a high figure achieved through a good purchase.' },
      { q: 'What is missing?', a: 'Capital growth, mortgage principal paydown and your tax position. It measures cash in the year, which is why an investor might accept a low figure on a property expected to appreciate.' },
      { q: 'What is a good number?', a: 'That depends on your market, your alternatives and your risk tolerance, none of which a calculator can see. Compare against what your money could do elsewhere, and take advice before committing.' }
    ],
    related: ['cap-rate', 'rental-yield', 'closing-costs', 'rent-vs-buy', 'mortgage-payoff', 'investment-calculator']
  },

  'closing-costs': {
    intro: 'The deposit is the number buyers save for, and closing costs are the number that catches them out — several percent of the purchase price, due at exactly the moment their savings are lowest.',
    what: [
      'Estimates the one-off costs of completing a purchase from percentages you set, defaulting to <strong>1.5%</strong> and <strong>0.75%</strong> components against a 350,000 price.',
      'The rates are yours to set because they vary enormously by country and even by region — transfer taxes alone range from near zero to well over 10%.'
    ],
    specs: {
      caption: 'What is usually included',
      rows: [
        ['Purchase price', 'Default 350,000'],
        ['Component rates', 'Default 1.5% and 0.75% — you set them'],
        ['Typically covers', 'Transfer tax, legal fees, survey, registration'],
        ['May also include', 'Lender fees, broker fees, insurance, valuation'],
        ['Typical total', '2–5% of price in many markets'],
        ['Transfer tax alone', 'Near zero to over 10%, depending on jurisdiction'],
        ['<strong>Due</strong>', '<strong>At completion, on top of the deposit</strong>'],
        ['Knows your jurisdiction?', '<strong>No</strong>']
      ]
    },
    steps: [
      'Look up the transfer tax and typical fees where you are buying.',
      'Enter the price and those percentages.',
      'Budget the total <em>separately</em> from your deposit.'
    ],
    tip: 'Budget closing costs as money you will never see again, separate from the deposit. The deposit becomes equity in the property; closing costs are simply spent. Buyers who count them as part of their savings target arrive at completion several thousand short — which is the point in the process where being short is most expensive.',
    faqs: [
      { q: 'How much should I budget?', a: 'Commonly 2–5% of the purchase price, but the range across countries is wide because transfer taxes differ so much. Look up your specific jurisdiction rather than relying on any general figure, including this one.' },
      { q: 'What is usually included?', a: 'Transfer or stamp tax, legal or conveyancing fees, survey or inspection, land registry fees, and often lender arrangement fees, valuation and insurance. Some are negotiable, most are not.' },
      { q: 'Can I add them to the mortgage?', a: 'Sometimes, depending on the lender and your loan-to-value. It is worth asking, but it means borrowing more against the same property and paying interest on the fees for the life of the loan.' },
      { q: 'Are these figures accurate for me?', a: 'The percentages are placeholders, not your jurisdiction. Property transaction costs are highly local and often depend on price bands, first-time-buyer status and property type. Get figures from a local conveyancer.' }
    ],
    related: ['rent-vs-buy', 'mortgage-calculator', 'home-affordability', 'cash-on-cash', 'rental-yield', 'budget-calculator']
  },

  'rent-vs-buy': {
    intro: 'The instinct that renting is "throwing money away" ignores the money buying throws away too — interest, transaction costs, maintenance and the return your deposit could have earned elsewhere.',
    what: [
      'Compares the cost of renting against buying over time, using a 350,000 property with a 70,000 deposit by default.',
      'The comparison turns on how long you stay. Buying carries large one-off costs at both ends, and those only amortise over years — which is why the same purchase can be sensible at ten years and expensive at three.'
    ],
    specs: {
      caption: 'What the comparison involves',
      rows: [
        ['Default price / deposit', '350,000 / 70,000'],
        ['Buying costs include', 'Interest, closing costs, maintenance, insurance, tax'],
        ['Renting costs include', 'Rent, and rent increases over time'],
        ['<strong>Decisive variable</strong>', '<strong>How long you stay</strong>'],
        ['Break-even', 'Commonly several years'],
        ['Opportunity cost', 'What the deposit could earn invested'],
        ['Not modelled', 'Job mobility, flexibility, security of tenure'],
        ['Is this advice?', '<strong>No</strong>']
      ]
    },
    steps: [
      'Enter price, deposit and expected rent for the same standard of home.',
      'Include maintenance — commonly around 1% of value a year.',
      'Test it at three years and at ten. The answer often flips.'
    ],
    tip: 'Run the comparison at several time horizons before deciding. Buying carries heavy costs at purchase and at sale, and those need years of ownership to amortise — so a purchase that looks poor over three years can look strong over ten. If your job or circumstances might move you within a few years, that fact matters more than any of the percentages.',
    faqs: [
      { q: 'Is renting really throwing money away?', a: 'Not straightforwardly. Mortgage interest, closing costs, maintenance and the foregone return on your deposit are all money that does not build equity either. Early in a mortgage, most of the payment is interest rather than principal.' },
      { q: 'What is the break-even point?', a: 'It depends on prices, rates, rent and local transaction costs, and is commonly several years. That is why the horizon is the most important input here — and why the tool cannot give one universal answer.' },
      { q: 'What does it not account for?', a: 'Flexibility, job mobility, security of tenure, the stress of maintenance and the freedom to change a home you own. Those are real and they are not financial, but they decide plenty of cases.' },
      { q: 'Should I buy?', a: 'This compares costs; it cannot answer that. The decision involves job security, family plans, local market conditions and your own tolerance for risk. Speak to an independent financial adviser rather than a calculator.' }
    ],
    related: ['mortgage-calculator', 'home-affordability', 'closing-costs', 'rental-yield', 'mortgage-payoff', 'budget-calculator']
  },

  'mortgage-payoff': {
    intro: 'Overpaying a mortgage is unusually powerful because every extra pound goes straight against the principal — and the interest that principal would have generated for the rest of the term disappears with it.',
    what: [
      'Shows how extra payments shorten the term and reduce total interest, from a <strong>240,000</strong> balance at <strong>6.5%</strong> by default.',
      'The effect is front-loaded and large: overpayments made early remove interest across the whole remaining term, while the same amount paid in the final years saves very little.'
    ],
    specs: {
      caption: 'Inputs',
      rows: [
        ['Balance remaining', 'Default 240,000'],
        ['Interest rate', 'Default 6.5%'],
        ['Extra payment', 'Monthly or one-off'],
        ['Returns', 'New term and interest saved'],
        ['<strong>Early overpayments</strong>', '<strong>Save far more than late ones</strong>'],
        ['Check first', 'Early repayment charges on your deal'],
        ['Also check', 'That overpayments reduce TERM, not just payment'],
        ['Is this advice?', '<strong>No</strong>']
      ]
    },
    steps: [
      'Enter your balance, rate and remaining term.',
      'Add the overpayment you could realistically sustain.',
      '<strong>Check your lender’s rules</strong> before starting — see the tip.'
    ],
    tip: 'Tell your lender to reduce the <em>term</em>, not the monthly payment. Many apply overpayments by lowering your future payments instead, which feels generous and captures almost none of the interest saving. Also check for early repayment charges — many fixed deals cap overpayments at around 10% of the balance a year, and exceeding it can cost more than the interest saved.',
    faqs: [
      { q: 'Why do early overpayments matter so much more?', a: 'Because interest accrues on the outstanding balance for the remaining term. A payment made in year two removes interest from twenty-plus years of compounding; the same payment in year twenty-four removes a few months of it.' },
      { q: 'Term reduction or payment reduction?', a: 'Term reduction saves far more interest, but many lenders default to reducing the monthly payment. Ask explicitly, and confirm in writing — the difference over a mortgage is often tens of thousands.' },
      { q: 'Are there penalties?', a: 'Frequently, on fixed-rate deals. Many allow overpayments up to about 10% of the balance a year and charge beyond that. Check your specific terms before making a large payment; the charge can exceed the saving.' },
      { q: 'Should I overpay or invest instead?', a: 'That depends on your mortgage rate, your alternatives, your tax position and your appetite for risk — none of which this can see. Overpaying is a guaranteed return equal to your rate; investing is neither guaranteed nor necessarily higher. Take advice.' }
    ],
    related: ['mortgage-calculator', 'refinance-calculator', 'rent-vs-buy', 'credit-card-payoff', 'compound-interest', 'home-affordability']
  },

  /* ============ batch 17a — developer cluster (complete) ============ */

  'xml-formatter': {
    intro: 'XML arrives from APIs and config exports as one unbroken line, which is efficient to transmit and impossible to read. Indenting it is the difference between finding a mis-nested tag in seconds and squinting at a wall of angle brackets.',
    what: [
      'Reformats XML with consistent indentation, and minifies it back when you need the compact form for transmission.',
      'Because it parses the document to reformat it, <strong>malformed XML fails rather than producing garbage</strong> — which makes it a quick validity check as well as a formatter.'
    ],
    specs: {
      caption: 'What it does',
      rows: [
        ['Format', 'Indents nested elements consistently'],
        ['Minify', 'Strips whitespace back out'],
        ['Malformed input', 'Fails — so it doubles as a validity check'],
        ['Attribute order', 'Preserved'],
        ['CDATA', 'Preserved'],
        ['Namespaces', 'Preserved'],
        ['Runs', 'In your browser — nothing uploaded'],
        ['Not', 'A schema validator — structure only']
      ]
    },
    steps: [
      'Paste the XML.',
      'Format to read it, or minify to ship it.',
      'If it refuses, the document is not well-formed — that is the useful answer.'
    ],
    tip: 'Use it as a first-line validity check. Well-formed XML always formats; malformed XML always fails, so a refusal locates the problem faster than reading. The commonest causes are an unclosed tag, a stray ampersand that should be <code>&amp;amp;</code>, and mismatched case in tag names.',
    faqs: [
      { q: 'It will not format my XML.', a: 'Then it is not well-formed. Look for an unclosed or mismatched tag, a bare <code>&amp;</code> that needs escaping as <code>&amp;amp;</code>, or a case mismatch between an opening and closing tag — XML is case-sensitive where HTML is forgiving.' },
      { q: 'Does it validate against a schema?', a: 'No. It checks the document is structurally well-formed, which is a different and weaker thing than conforming to an XSD or DTD. Schema validation needs a validator with your schema.' },
      { q: 'Will it change my data?', a: 'No — only whitespace between elements. Attribute order, CDATA sections and namespaces are preserved. Note that whitespace inside a text node can be significant in some formats.' },
      { q: 'Is my XML uploaded?', a: 'No, it is processed in your browser — which matters, since XML pasted into a formatter is frequently an API response containing credentials or customer data.' }
    ],
    related: ['html-formatter', 'json-formatter', 'css-formatter', 'sql-formatter', 'json-csv', 'text-diff']
  },

  'html-formatter': {
    intro: 'Generated HTML — from a CMS, an email builder, a framework — arrives without meaningful indentation, and finding the div that is one level too deep in a wall of markup is genuinely hard.',
    what: [
      'Indents HTML so nesting is visible, and minifies it when you want to ship it smaller.',
      'HTML is far more forgiving than XML: browsers repair unclosed tags silently, which is convenient and means a formatter cannot reliably tell you the markup is broken.'
    ],
    specs: {
      caption: 'What it does',
      rows: [
        ['Format', 'Indents to show nesting'],
        ['Minify', 'Strips whitespace for transmission'],
        ['Malformed HTML', 'Usually still formats — browsers are forgiving'],
        ['Void elements', 'Handled (<code>br</code>, <code>img</code>, <code>input</code>)'],
        ['Inline vs block', 'Whitespace between inline elements is significant'],
        ['Runs', 'In your browser — nothing uploaded'],
        ['Not', 'A validator — use the W3C validator for that'],
        ['Minified saving', 'Small once gzip is applied — see the tip']
      ]
    },
    steps: [
      'Paste the HTML.',
      'Format to read it, minify to ship it.',
      'Check inline elements after formatting — see the tip.'
    ],
    tip: 'Watch whitespace between inline elements. A space between two <code>&lt;span&gt;</code> or <code>&lt;a&gt;</code> tags renders as a visible gap, so reformatting can shift a layout subtly — words running together or drifting apart. Block elements are safe; inline ones are not, which is why formatting a template is not always a no-op.',
    faqs: [
      { q: 'Will formatting break my layout?', a: 'It can, in one specific way: whitespace between inline elements renders as a space. Adding newlines between spans, links or inline-blocks can introduce visible gaps. Block-level markup is unaffected.' },
      { q: 'Is minifying worth it?', a: 'Less than it used to be. Gzip and Brotli already compress repeated whitespace very efficiently, so minified HTML often saves only a few percent over the wire. Worth doing for large documents, rarely worth a build step on its own.' },
      { q: 'Does it validate my HTML?', a: 'No. HTML is deliberately forgiving and browsers repair errors silently, so a formatter cannot reliably flag problems. Use the W3C validator for correctness.' },
      { q: 'Is my HTML uploaded?', a: 'No — everything runs in your browser. That matters more than it might sound: HTML pasted into a formatter is frequently an email template containing client names, a CMS export with draft copy, or a page fragment carrying API keys in an inline script. None of it is transmitted.' }
    ],
    related: ['css-formatter', 'xml-formatter', 'json-formatter', 'html-to-pdf', 'markdown-editor', 'meta-tag-generator']
  },

  'css-formatter': {
    intro: 'Minified CSS is one line of a few hundred kilobytes, and understanding what a rule does — or finding the one overriding your change — starts with getting it back into a readable shape.',
    what: [
      'Expands minified CSS into indented rules, and minifies it back for production.',
      'Formatting also makes specificity visible. Most "my CSS is not applying" problems are a more specific selector elsewhere, and that is far easier to spot in formatted source.'
    ],
    specs: {
      caption: 'What it does',
      rows: [
        ['Format', 'One declaration per line, indented rules'],
        ['Minify', 'Strips whitespace and the last semicolon'],
        ['Preserves', 'Declaration order — which decides overrides'],
        ['Media queries', 'Indented as blocks'],
        ['Comments', 'Preserved when formatting'],
        ['Runs', 'In your browser — nothing uploaded'],
        ['Not', 'An optimiser — no unused-rule removal'],
        ['Not', 'An autoprefixer']
      ]
    },
    steps: [
      'Paste the CSS.',
      'Format to read and debug it.',
      'Minify for production, or let your build tool do it.'
    ],
    tip: 'When a rule is not applying, look for specificity before assuming a syntax error. An ID selector beats any number of classes, and an inline style beats both — so your carefully written class rule loses to something you have not looked at. Formatting the stylesheet is what lets you find the competing selector.',
    faqs: [
      { q: 'Why is my CSS rule not applying?', a: 'Usually specificity. IDs beat classes, classes beat elements, and inline styles beat all of them; where specificity ties, the later rule wins. Formatting the file makes both the competing selector and the ordering visible.' },
      { q: 'Does it remove unused CSS?', a: 'No — it formats and minifies only. Removing unused rules needs a tool that can see your markup, since a class may be added by JavaScript at runtime.' },
      { q: 'Does it add vendor prefixes?', a: 'No. Use Autoprefixer in a build step for that; hand-written prefixes go stale as browser support changes.' },
      { q: 'Is minifying worth it?', a: 'For large stylesheets yes, though gzip already handles repeated whitespace well. The bigger win is usually removing rules you no longer use.' }
    ],
    related: ['html-formatter', 'xml-formatter', 'json-formatter', 'color-converter', 'gradient-generator', 'shadow-generator']
  },

  'sql-formatter': {
    intro: 'A query written by an ORM, or grown one clause at a time over six months, is often a single line that nobody can safely change. Formatting it is the first step in understanding what it actually does.',
    what: [
      'Reformats SQL with keywords and clauses on their own lines, so joins, conditions and subqueries become visible as structure rather than prose.',
      'This is a formatter, not a parser — it does not execute anything, connect anywhere, or tell you whether the query is correct.'
    ],
    specs: {
      caption: 'What it does',
      rows: [
        ['Format', 'Clauses and keywords on their own lines'],
        ['Makes visible', 'Joins, nesting, condition grouping'],
        ['Executes anything?', '<strong>No — it never connects to a database</strong>'],
        ['Validates syntax?', 'No'],
        ['Dialect-specific?', 'Largely generic'],
        ['Runs', 'In your browser — nothing uploaded'],
        ['Safe with', 'Production queries — nothing leaves the page'],
        ['Not', 'A query optimiser']
      ]
    },
    steps: [
      'Paste the query.',
      'Format it.',
      'Read the joins first — that is where most errors live.'
    ],
    tip: 'Read the joins before the conditions. The commonest serious SQL bug is a join condition that has quietly moved into the <code>WHERE</code> clause on an outer join, which converts it into an inner join and silently drops rows. Formatting is what makes that visible; in one long line it is invisible.',
    faqs: [
      { q: 'Does it run my query?', a: 'No. It never connects to anything and executes nothing — it reformats text. That is why it is safe to paste a production query into it, and worth saying plainly.' },
      { q: 'Does it check my syntax?', a: 'No, and dialects differ enough that a generic formatter should not pretend to. Use your database client for validation.' },
      { q: 'Will it optimise my query?', a: 'No. Formatting changes readability, not the execution plan. For performance, read the plan your database produces — that is the only authority on it.' },
      { q: 'Is my query sent anywhere?', a: 'No. It runs entirely in your browser, which matters because queries frequently contain table names, business logic and sometimes literal values from production.' }
    ],
    related: ['json-formatter', 'csv-viewer', 'json-csv', 'xml-formatter', 'text-diff', 'html-formatter']
  },

  'cron-generator': {
    intro: 'Cron syntax is five fields of numbers and asterisks that everybody writes by copying an example and editing it hopefully. Getting it wrong usually means a job that never runs, or one that runs far more often than intended.',
    what: [
      'Builds a cron expression from a schedule you describe, so you are not counting field positions by hand.',
      'The five fields are <strong>minute, hour, day-of-month, month, day-of-week</strong> — and the ordering is the thing people get wrong, because two of them are days.'
    ],
    specs: {
      caption: 'The five fields',
      rows: [
        ['Position 1', 'Minute (0–59)'],
        ['Position 2', 'Hour (0–23)'],
        ['Position 3', 'Day of month (1–31)'],
        ['Position 4', 'Month (1–12)'],
        ['Position 5', 'Day of week (0–6, Sunday 0)'],
        ['<code>*</code>', 'Every value'],
        ['<code>*/5</code>', 'Every 5 units'],
        ['<strong>Timezone</strong>', '<strong>The server’s, not yours</strong>']
      ]
    },
    steps: [
      'Describe the schedule you want.',
      'Copy the expression.',
      '<strong>Check what timezone your server runs in</strong> before relying on the hour.'
    ],
    tip: 'Cron runs in the server’s timezone, which is frequently UTC even when you are not. A job set for 09:00 runs at 09:00 UTC — which is 10:00 or 11:00 for much of Europe depending on the season, and the previous evening in parts of the Americas. Check the server clock before scheduling anything that matters.',
    faqs: [
      { q: 'What happens if I set both day-of-month and day-of-week?', a: 'In most cron implementations the job runs when <em>either</em> matches, not both — which surprises people who expect an AND. "1st of the month AND a Monday" is not expressible in standard cron.' },
      { q: 'Which timezone does it use?', a: 'The server’s. That is commonly UTC on cloud hosts, so a job scheduled for a local morning may run at a quite different local time. Some schedulers let you set a timezone explicitly; plain cron does not.' },
      { q: 'What does <code>*/5</code> mean?', a: 'Every five units of that field. In the minute position it means every five minutes; in the hour position, every five hours. It is a step, not a specific value.' },
      { q: 'Why did my job not run?', a: 'Common causes: the schedule never matches (29 February, or a day-of-month above the month length), the environment lacks a PATH your script assumes, or the machine was asleep. Cron does not retry missed runs.' }
    ],
    related: ['timestamp-converter', 'timezone-converter', 'uuid-generator', 'regex-tester', 'json-formatter', 'hash-generator']
  },

  'credit-card-validator': {
    intro: 'Card numbers carry a built-in checksum, so a typo can be caught before a payment is attempted. What that check cannot tell you is whether the card exists, has money on it, or belongs to the person typing.',
    what: [
      'Applies the <strong>Luhn algorithm</strong> — the checksum built into every card number since the 1960s — to catch typos and transposed digits.',
      '<strong>This only validates the format.</strong> A number can pass Luhn perfectly and be entirely fictional; <code>4111 1111 1111 1111</code> is the standard test number and it passes.'
    ],
    specs: {
      caption: 'What Luhn does and does not do',
      rows: [
        ['Algorithm', 'Luhn checksum (mod 10)'],
        ['Catches', 'Single-digit typos and most transpositions'],
        ['<strong>Does NOT check</strong>', '<strong>That the card exists</strong>'],
        ['Does NOT check', 'Balance, expiry, or the CVV'],
        ['Does NOT check', 'Who owns it'],
        ['Passes Luhn', '4111 1111 1111 1111 — a test number'],
        ['Runs', 'In your browser — nothing transmitted'],
        ['Real validation', 'Only your payment processor can do it']
      ]
    },
    steps: [
      'Enter the number.',
      'Read whether the checksum passes.',
      'Understand that a pass means "not obviously mistyped", nothing more.'
    ],
    tip: 'Use this to catch typos in a form, never as an authorisation check. Luhn is a 1960s error-detection scheme designed for manual entry; it says nothing about whether a card is real, funded or stolen. Only the payment processor can answer those, and building any trust decision on a Luhn pass is a serious mistake.',
    faqs: [
      { q: 'Does passing mean the card is real?', a: 'No. Luhn is a checksum, so any number constructed to satisfy it passes — which is exactly how test numbers like 4111 1111 1111 1111 work. It detects mistyping, nothing else.' },
      { q: 'What is it useful for then?', a: 'Catching errors before a form is submitted, which saves a failed transaction and a confusing error message. It is a user-experience improvement, not a security control.' },
      { q: 'Is my card number sent anywhere?', a: 'No. The check runs entirely in your browser and nothing is transmitted or stored — which is the only acceptable design for a tool that asks for a card number.' },
      { q: 'Should I store card numbers if they pass?', a: 'No. Storing card data brings you into PCI DSS scope with substantial obligations. Use a payment processor’s tokenisation so the number never touches your systems.' }
    ],
    related: ['iban-validator', 'hash-generator', 'paypal-fee-calculator', 'stripe-fee-calculator', 'invoice-generator', 'password-strength']
  },

  'iban-validator': {
    intro: 'A mistyped IBAN usually bounces, but not always — and a payment that reaches the wrong valid account is far harder to recover than one that fails. The checksum exists to catch the typo before the money moves.',
    what: [
      'Validates an IBAN using the <strong>mod-97 checksum</strong> defined in the standard, plus the expected length for the country.',
      'Mod-97 is stronger than the simpler schemes used elsewhere: it catches essentially all single-digit errors and transpositions, which is why international banking adopted it.'
    ],
    specs: {
      caption: 'What is checked',
      rows: [
        ['Checksum', 'mod-97 (ISO 13616)'],
        ['Length', 'Checked against the country code'],
        ['Length varies', 'By country — 15 to 34 characters'],
        ['Catches', 'Nearly all typos and transpositions'],
        ['<strong>Does NOT check</strong>', '<strong>That the account exists</strong>'],
        ['Does NOT check', 'The account holder’s name'],
        ['Spaces', 'Ignored — grouping is presentational'],
        ['Runs', 'In your browser — nothing transmitted']
      ]
    },
    steps: [
      'Paste the IBAN — spaces do not matter.',
      'Check the result.',
      'Verify the recipient separately. See the tip.'
    ],
    tip: 'A valid IBAN is not a verified recipient. The checksum confirms the number is well-formed, not that it belongs to the person you think — and payment redirection fraud works precisely by sending a valid IBAN for an account the fraudster controls. Confirm bank details by phone, on a number you already had, before paying an invoice with changed details.',
    faqs: [
      { q: 'Does a valid IBAN mean the account exists?', a: 'No. It means the number is well-formed and passes its checksum. Whether it exists, and whose it is, can only be confirmed by the bank — and increasingly by confirmation-of-payee services where they are available.' },
      { q: 'Why are IBANs different lengths?', a: 'Each country defines its own format within the standard, so length varies from 15 to 34 characters. The country code at the start tells the validator which length to expect.' },
      { q: 'Do the spaces matter?', a: 'No. Grouping into blocks of four is purely for readability; the underlying value is the unspaced string, and both forms validate identically.' },
      { q: 'How do I avoid paying the wrong account?', a: 'Verify changed bank details out of band — phone the supplier on a number you already had, never one from the email requesting the change. Invoice redirection fraud is common and a valid IBAN offers no protection against it.' }
    ],
    related: ['credit-card-validator', 'invoice-generator', 'currency-converter', 'paypal-fee-calculator', 'hash-generator', 'late-fee']
  },

  /* ============ batch 17b — audio cluster (complete) ============
   * Two of these use browser speech APIs whose support is genuinely uneven,
   * and the pages say so rather than letting someone discover it mid-task. */

  'audio-converter': {
    intro: 'Audio formats split into two camps that behave completely differently: lossy ones that discard sound to save space, and lossless ones that keep everything. Converting between them only goes one way without cost.',
    what: [
      'Converts between <strong>MP3</strong> and <strong>WAV</strong> in your browser.',
      '<strong>Converting MP3 to WAV does not restore quality.</strong> It produces a large file containing exactly the audio the MP3 had — the discarded detail is gone permanently, and no format can bring it back.'
    ],
    specs: {
      caption: 'The two formats',
      rows: [
        ['MP3', 'Lossy — small, universally supported'],
        ['WAV', 'Lossless PCM — large, uncompressed'],
        ['WAV size', 'About 10 MB per minute, stereo'],
        ['MP3 size', 'About 1 MB per minute at typical rates'],
        ['<strong>MP3 → WAV</strong>', '<strong>Bigger file, identical sound quality</strong>'],
        ['WAV → MP3', 'Smaller file, some quality discarded'],
        ['Re-encoding MP3 → MP3', 'Loses quality each time — avoid'],
        ['Runs', 'In your browser — never uploaded']
      ]
    },
    steps: [
      'Add the audio file.',
      'Choose the target format.',
      'Convert and download.'
    ],
    tip: 'Convert to WAV when the audio has more editing ahead of it, and to MP3 only at the very end. Every MP3 encode discards detail, so editing an MP3 and re-saving applies that loss twice — audible as a hollow, swirly quality on cymbals and sibilance. Work lossless, export lossy once.',
    faqs: [
      { q: 'Will converting MP3 to WAV improve quality?', a: 'No. It produces a much larger file containing exactly what the MP3 contained. The information a lossy encoder discarded is not recoverable by any means — the WAV is simply an uncompressed copy of the degraded audio.' },
      { q: 'Which should I use?', a: 'MP3 for anything to be listened to, shared or uploaded — it is a tenth of the size and universally playable. WAV for anything going into audio software, because further editing compounds lossy artefacts.' },
      { q: 'Why is my WAV so large?', a: 'Because it is uncompressed — roughly 10 MB per minute in stereo. That is the trade for keeping every sample exactly as recorded.' },
      { q: 'Is my audio uploaded?', a: 'No. Conversion happens in your browser, which matters for voice notes, interviews and anything recorded privately.' }
    ],
    related: ['audio-compressor', 'audio-trimmer', 'extract-audio', 'voice-recorder', 'compress-video', 'speech-to-text']
  },

  'audio-compressor': {
    intro: 'A one-hour recording at full quality is far too large to email and far larger than speech needs. Speech in particular compresses extremely well, because most of what a high bitrate preserves is detail the human voice never produced.',
    what: [
      'Re-encodes audio at a lower bitrate to reduce file size, producing MP3 output.',
      'How much you can cut depends entirely on the content. Speech survives aggressive compression; music does not.'
    ],
    specs: {
      caption: 'Rough guidance',
      rows: [
        ['Speech, mono', '64 kbps is usually plenty'],
        ['Speech, stereo', '96 kbps'],
        ['Music, acceptable', '128 kbps'],
        ['Music, good', '192 kbps and above'],
        ['Rough size', '1 MB per minute at 128 kbps'],
        ['<strong>Already compressed?</strong>', '<strong>Re-encoding loses quality again</strong>'],
        ['Output', 'MP3'],
        ['Runs', 'In your browser — never uploaded']
      ]
    },
    steps: [
      'Add the file.',
      'Choose a bitrate appropriate to the content, not to the file size you want.',
      'Listen to the result before deleting the original.'
    ],
    tip: 'Speech and music need completely different bitrates, and treating them the same wastes space or ruins the audio. A podcast at 64 kbps mono sounds fine and is a quarter the size of the same recording at 256; music at 64 kbps sounds obviously damaged. Identify what you have before choosing a number.',
    faqs: [
      { q: 'What bitrate should I use?', a: '64 kbps mono for speech, 128 for acceptable music, 192 or above for music you care about. The gap is large because speech occupies a narrow frequency range and music does not.' },
      { q: 'Can I compress an already-compressed file?', a: 'You can, and it loses quality again — lossy encoding is not idempotent. If you have the original, compress that instead of the compressed copy.' },
      { q: 'Why does my music sound hollow?', a: 'The bitrate is too low, or it has been through more than one lossy encode. The characteristic swirly, underwater quality on cymbals is the signature of an over-compressed or re-encoded file.' },
      { q: 'Is my audio uploaded?', a: 'No — it is processed in your browser. That matters for the recordings people most often need to shrink: interviews, lecture captures, therapy or medical notes, and voice memos that were never meant to leave the device they were recorded on.' }
    ],
    related: ['audio-converter', 'audio-trimmer', 'extract-audio', 'compress-video', 'voice-recorder', 'upload-time']
  },

  'audio-trimmer': {
    intro: 'Most recordings have dead space at both ends — the fumble before you started and the reach for the stop button afterwards. Cutting it is the single fastest improvement to any voice recording.',
    what: [
      'Cuts a section from an audio file by start and end time.',
      'Trimming removes data at full quality, which makes it the best first step before compressing: the seconds you cut cost nothing in fidelity, while the ones you compress do.'
    ],
    specs: {
      caption: 'How it works',
      rows: [
        ['Selection', 'By start and end time'],
        ['Quality cost', 'None for the audio you keep'],
        ['Do this', 'Before compressing, not after'],
        ['Removes', 'Dead air, fumbles, false starts'],
        ['Output', 'The trimmed section'],
        ['Runs', 'In your browser — never uploaded'],
        ['Best for', 'Voice notes, interviews, podcast tops and tails'],
        ['Not', 'A multi-region editor']
      ]
    },
    steps: [
      'Add the file.',
      'Set start and end times, leaving a beat of silence at each end.',
      'Trim and download.'
    ],
    tip: 'Trim before you compress. File size is bitrate times duration, so removing thirty seconds of dead air takes that share out at full quality — whereas achieving the same saving by lowering the bitrate degrades the whole recording. Cut first, compress second, and only if it is still too big.',
    faqs: [
      { q: 'Does trimming reduce quality?', a: 'Not for the audio you keep — it removes a section rather than re-encoding what remains. That is why it is the right first step whenever a file is too large.' },
      { q: 'Can I cut a section from the middle?', a: 'This selects a range to keep. To remove a middle section you would trim twice and rejoin in an audio editor.' },
      { q: 'How much silence should I leave?', a: 'A beat at each end — around half a second. Cutting hard against the first word sounds clipped and abrupt, and a little air makes a recording sound deliberate.' },
      { q: 'Is my recording uploaded?', a: 'No. Everything happens in your browser, which matters for interviews and voice notes.' }
    ],
    related: ['audio-compressor', 'audio-converter', 'trim-video', 'extract-audio', 'voice-recorder', 'mute-video']
  },

  'voice-recorder': {
    intro: 'Recording a quick voice note usually means opening an app, granting permissions and finding the file afterwards. A browser recorder skips all of it — and, unusually for a web recorder, keeps the audio on your machine.',
    what: [
      'Records from your microphone using the browser’s <strong>MediaRecorder</strong> API, producing <strong>WebM</strong> audio.',
      'Nothing is uploaded. The recording exists in the page until you download it, which is the right arrangement for a voice note and unusual among web recorders.'
    ],
    specs: {
      caption: 'How it works',
      rows: [
        ['API', 'MediaRecorder — built into the browser'],
        ['Output format', 'WebM'],
        ['Permission', 'Your browser will ask for microphone access'],
        ['Uploaded?', '<strong>No — the recording stays on your device</strong>'],
        ['Stored?', 'Only until you leave the page — download it'],
        ['Need MP3?', 'Convert afterwards with the Audio Converter'],
        ['Quality', 'Depends on your microphone, not the tool'],
        ['Background noise', 'Not removed — see the tip']
      ]
    },
    steps: [
      'Allow microphone access when asked.',
      'Record, then stop.',
      '<strong>Download before closing the tab</strong> — nothing is saved automatically.'
    ],
    tip: 'Get closer to the microphone than feels natural. Distance is what makes recordings sound thin and echoey, because a distant mic picks up more room than voice — and no processing fixes that afterwards. Six inches away in a soft-furnished room beats any amount of editing on audio recorded across a desk.',
    faqs: [
      { q: 'Is my recording uploaded?', a: 'No. It is captured by the browser and held in the page until you download it. Nothing is transmitted, which is the point — voice notes are frequently personal.' },
      { q: 'Will I lose it if I close the tab?', a: 'Yes. Nothing is saved automatically, so download it before navigating away. That is the trade-off for not storing anything on a server.' },
      { q: 'Why is the file WebM rather than MP3?', a: 'WebM is what the browser’s recorder produces natively. Run it through the Audio Converter if you need MP3 for compatibility.' },
      { q: 'How do I improve the quality?', a: 'Get closer to the microphone and record somewhere with soft furnishings. Distance and hard surfaces cause the echoey, distant sound that no post-processing removes convincingly.' }
    ],
    related: ['audio-trimmer', 'audio-converter', 'audio-compressor', 'speech-to-text', 'text-to-speech', 'extract-audio']
  },

  'text-to-speech': {
    intro: 'Hearing your own writing read aloud catches things reading never does — a sentence that runs too long, a repeated word, a rhythm that stumbles. Editors have used the technique for a century; the browser can now do the reading.',
    what: [
      'Uses the browser’s built-in <strong>speechSynthesis</strong> to read text aloud, with the voices installed on your device.',
      '<strong>Available voices depend entirely on your operating system and browser</strong> — the same text sounds different on a Mac, a Windows machine and an Android phone, and some devices offer very few.'
    ],
    specs: {
      caption: 'What to expect',
      rows: [
        ['API', 'speechSynthesis — built into the browser'],
        ['Voices', '<strong>Whatever your OS provides — varies widely</strong>'],
        ['Quality', 'System-dependent, not tool-dependent'],
        ['Languages', 'Those your system has installed'],
        ['Downloadable audio?', 'No — it speaks, it does not export a file'],
        ['Sent anywhere?', 'No — synthesis is local'],
        ['Best use', 'Proofreading your own writing'],
        ['Also useful for', 'Accessibility and language learning']
      ]
    },
    steps: [
      'Paste the text.',
      'Pick a voice if your system offers several.',
      'Listen for the sentences that stumble — those are the ones to rewrite.'
    ],
    tip: 'Use it as a proofreading tool rather than a production one. A synthetic voice reads exactly what you wrote rather than what you meant, so it stumbles precisely where a reader will — over-long sentences, missing words, accidental repetition. It is the fastest way to find prose problems your eye has learned to skip.',
    faqs: [
      { q: 'Why do the voices differ on my phone and laptop?', a: 'Because they come from the operating system, not from this page. Windows, macOS, Android and iOS each ship different voices, and some browsers expose more of them than others.' },
      { q: 'Can I download the audio?', a: 'No. The API speaks through your device but does not expose a recordable stream, so there is no file to save. Producing an audio file needs a dedicated TTS service.' },
      { q: 'Is my text sent anywhere?', a: 'No — synthesis happens locally, using voices already installed on your device rather than a cloud service. Worth noting because the sibling tool, Speech to Text, genuinely may send audio to your browser vendor: recognition and synthesis are asymmetric, and only one of them is guaranteed local.' },
      { q: 'Why does it mispronounce names?', a: 'Synthetic voices work from general pronunciation rules and struggle with proper nouns and loan words. For proofreading it does not matter; the rhythm is what you are listening for.' }
    ],
    related: ['speech-to-text', 'readability', 'word-counter', 'voice-recorder', 'audio-converter', 'vocabulary-builder']
  },

  'speech-to-text': {
    intro: 'Dictation is several times faster than typing for a first draft, and browsers have built-in recognition — with one significant caveat about which browsers, and where the audio goes.',
    what: [
      'Uses the browser’s <strong>SpeechRecognition</strong> API to transcribe speech as you talk.',
      '<strong>Support is uneven and this one is not necessarily local.</strong> Chrome and Edge implement it; Firefox largely does not. And unlike the other tools here, the browser may send audio to the vendor’s servers for recognition — that is the browser’s behaviour, not this page’s, and it is worth knowing before dictating anything sensitive.'
    ],
    specs: {
      caption: 'Support and privacy',
      rows: [
        ['API', 'SpeechRecognition — browser-provided'],
        ['Works in', 'Chrome, Edge and Chromium browsers'],
        ['Limited or absent in', 'Firefox'],
        ['<strong>Audio handling</strong>', '<strong>The browser may send it to its vendor</strong>'],
        ['This page', 'Sends nothing itself — the API is the browser’s'],
        ['Accuracy', 'Good for clear speech, poor with noise or accents it does not expect'],
        ['Punctuation', 'Usually spoken — "comma", "full stop"'],
        ['Best for', 'First drafts, not final text']
      ]
    },
    steps: [
      'Use Chrome or Edge — Firefox will likely not work.',
      'Allow microphone access and speak clearly, at a normal pace.',
      '<strong>Always proofread.</strong> Dictation errors are real words, so a spellchecker will not catch them.'
    ],
    tip: 'Do not dictate anything confidential. Unlike every other tool here, recognition may be performed on the browser vendor’s servers rather than on your device — so the audio can leave your machine. That is the browser’s design and no web page can change it. For sensitive material, type it.',
    faqs: [
      { q: 'Why does nothing happen in Firefox?', a: 'Because Firefox does not implement the SpeechRecognition API in the way Chrome and Edge do. This is a browser capability rather than something a page can provide — use a Chromium-based browser.' },
      { q: 'Is my speech processed on my device?', a: 'Not necessarily, and this is the one tool on the site where the honest answer is "it depends on your browser". Chromium may send audio to Google for recognition. This page transmits nothing itself, but it cannot control what the browser API does.' },
      { q: 'Why is the accuracy poor?', a: 'Background noise, distance from the microphone, fast speech and accents outside the model’s training all reduce it. Getting closer to the microphone helps more than speaking slowly.' },
      { q: 'Does it add punctuation?', a: 'Usually only when you say it — "comma", "full stop", "new paragraph". Expect to add most of it yourself, and proofread carefully: dictation errors are valid words, so spellcheck will not flag them.' }
    ],
    related: ['voice-recorder', 'text-to-speech', 'word-counter', 'readability', 'audio-trimmer', 'pdf-ocr']
  },

  /* ============ batch 17c — accessibility cluster (complete) ============
   * WCAG figures read from source: 4.5:1 for AA normal text. Each page states
   * what an automated check CANNOT see, because "passes the checker" is
   * routinely mistaken for "accessible" and that mistake excludes people. */

  'accessible-palette': {
    intro: 'A palette can be beautiful and unusable. Contrast is the difference, and it is measurable — which means it is one of the few design questions with an actual right answer.',
    what: [
      'Builds colour combinations that meet <strong>WCAG AA</strong>, which requires a contrast ratio of at least <strong>4.5:1</strong> for normal text.',
      'The ratio is computed from relative luminance, not from how different two colours look. Two colours can feel strongly contrasting and fail — which is why designing by eye produces text that some people cannot read.'
    ],
    specs: {
      caption: 'WCAG thresholds',
      rows: [
        ['AA, normal text', '<strong>4.5:1</strong>'],
        ['AA, large text', '3:1 (18pt, or 14pt bold)'],
        ['AAA, normal text', '7:1'],
        ['UI components and graphics', '3:1'],
        ['Based on', 'Relative luminance, not perceived difference'],
        ['<strong>Does not cover</strong>', '<strong>Colour blindness — separate problem</strong>'],
        ['Also not covered', 'Font weight and size, which affect legibility'],
        ['Runs', 'On your device']
      ]
    },
    steps: [
      'Build the combination you want to use.',
      'Check it clears 4.5:1 for body text.',
      '<strong>Then test it for colour blindness separately.</strong>'
    ],
    tip: 'Passing 4.5:1 does not mean the palette works for colour-blind users — those are different problems with different tests. Contrast measures lightness difference; colour blindness is about hue confusion, and a red and a green of identical luminance pass contrast while being indistinguishable to roughly 8% of men. Run both checks.',
    faqs: [
      { q: 'Why 4.5:1?', a: 'It is the WCAG AA threshold for normal text, chosen to remain readable for users with moderately low vision — roughly 20/40 acuity — without requiring assistive technology. Large text gets 3:1 because size compensates.' },
      { q: 'My colours look high contrast but fail. Why?', a: 'Because the ratio uses relative luminance rather than perceived difference. Two saturated colours of similar lightness — a strong red and a strong blue — look dramatic and have almost no luminance difference between them.' },
      { q: 'Is AA enough?', a: 'AA is the level most legislation and procurement references. AAA at 7:1 is stricter and worth targeting for body text where you can, particularly for content read at length.' },
      { q: 'Does this cover colour blindness?', a: 'No — that is a separate check with a separate tool. Contrast and colour blindness are genuinely different failure modes and passing one says nothing about the other.' }
    ],
    related: ['contrast-checker', 'color-blind-simulator', 'palette-generator', 'color-converter', 'color-from-image', 'gradient-generator']
  },

  'color-blind-simulator': {
    intro: 'Around one in twelve men has some form of colour vision deficiency, and the commonest design failure is not a bad colour — it is using colour alone to carry meaning that some users cannot see.',
    what: [
      'Simulates the three main types: <strong>protanopia</strong> (red-weak), <strong>deuteranopia</strong> (green-weak, the most common) and <strong>tritanopia</strong> (blue-weak, rare).',
      'The point is not to design for the simulation but to find places where colour is the <em>only</em> signal — a red error state, a green success tick, a chart distinguished purely by hue.'
    ],
    specs: {
      caption: 'The three types',
      rows: [
        ['Deuteranopia', 'Green-weak — the most common form'],
        ['Protanopia', 'Red-weak'],
        ['Tritanopia', 'Blue-weak — rare'],
        ['Affects roughly', '1 in 12 men, 1 in 200 women'],
        ['Classic failure', 'Red/green as the only distinction'],
        ['<strong>The fix</strong>', '<strong>Never use colour alone — add text, icon or pattern</strong>'],
        ['Complements', 'Contrast checking — different problem'],
        ['Runs', 'On your device']
      ]
    },
    steps: [
      'Load the design or chart.',
      'Compare the simulations, especially deuteranopia.',
      'Anywhere meaning collapses, <strong>add a second signal</strong> — a label, an icon, a pattern.'
    ],
    tip: 'The fix is almost never a different colour — it is a second signal. Add an icon to the error state, a label to the chart line, a pattern to the bar. That works for every type of colour vision deficiency at once, survives greyscale printing, and helps in bright sunlight too. Choosing a "colour-blind-safe" palette solves one case; a second signal solves all of them.',
    faqs: [
      { q: 'Which type should I design for?', a: 'Check all three, but deuteranopia is the most common by a wide margin. If a design survives that and carries a non-colour signal everywhere meaning depends on it, the others are largely covered.' },
      { q: 'Is red-green really the main problem?', a: 'Yes — it accounts for the overwhelming majority of cases, which is unfortunate given how universally red means bad and green means good in interfaces. That convention is exactly the one that fails.' },
      { q: 'Does high contrast solve it?', a: 'No. They are separate problems. A red and a green of identical luminance pass contrast checks and are indistinguishable to a deuteranope. Both checks are needed.' },
      { q: 'How do I fix a chart?', a: 'Label the lines directly rather than relying on a colour key, or vary line style and marker shape as well as colour. Direct labelling is better for everyone, not only colour-blind readers.' }
    ],
    related: ['accessible-palette', 'contrast-checker', 'palette-generator', 'color-converter', 'csv-to-chart', 'alt-text-auditor']
  },

  'heading-checker': {
    intro: 'Screen reader users navigate by heading far more than by scrolling — jumping between sections the way a sighted reader skims. A page whose headings are chosen for size rather than structure is a page they cannot navigate.',
    what: [
      'Checks heading structure for the two problems that actually break navigation: a <strong>missing or duplicated <code>h1</code></strong>, and <strong>skipped levels</strong> such as an <code>h2</code> followed by an <code>h4</code>.',
      'Headings are an outline, not a type scale. Choosing <code>h4</code> because it looks the right size is the root cause of most broken structures — that is what CSS is for.'
    ],
    specs: {
      caption: 'What it checks',
      rows: [
        ['One <code>h1</code>', 'Exactly one per page'],
        ['No skipped levels', '<code>h2</code> → <code>h4</code> is a break'],
        ['Order', 'Document order, not visual position'],
        ['Why it matters', 'Screen readers navigate by heading'],
        ['Common cause', 'Picking a level for its font size'],
        ['Correct fix', 'Use the right level, style it with CSS'],
        ['<strong>Cannot check</strong>', '<strong>Whether the headings are meaningful</strong>'],
        ['Runs', 'On your device']
      ]
    },
    steps: [
      'Paste the markup or content.',
      'Fix the <code>h1</code> first — one per page.',
      'Close any skipped levels, then read the headings alone and check they describe the page.'
    ],
    tip: 'Read your headings on their own, in order, with nothing else. They should work as a table of contents — if they do not tell you what the page covers, the structure is wrong even when every automated check passes. That is the test no tool can run and the one that decides whether the page is actually navigable.',
    faqs: [
      { q: 'Why does skipping a level matter?', a: 'Because heading levels express nesting. Jumping from <code>h2</code> to <code>h4</code> implies a missing section, and a screen reader user navigating by heading experiences a gap in the outline with nothing to explain it.' },
      { q: 'Can I have more than one <code>h1</code>?', a: 'The HTML5 outline algorithm was never implemented by browsers or assistive technology, so in practice one <code>h1</code> per page remains the reliable convention. Multiple <code>h1</code>s make the page structure ambiguous.' },
      { q: 'What if the right level looks wrong?', a: 'Style it. Choosing a heading level for its default size is precisely the mistake — the level is semantic structure and the appearance is CSS. An <code>h3</code> can look like anything you want.' },
      { q: 'Does passing mean my headings are good?', a: 'No. It means the levels are structurally valid. Whether they actually describe the content is a judgement no automated check can make, and it is the part that matters most.' }
    ],
    related: ['alt-text-auditor', 'contrast-checker', 'readability', 'meta-tag-generator', 'accessible-palette', 'html-formatter']
  },

  'alt-text-auditor': {
    intro: 'Missing alt text is the most common accessibility failure on the web, and bad alt text is nearly as unhelpful — "image", "photo", "IMG_4021" all pass an automated check and tell a screen reader user nothing.',
    what: [
      'Finds images without alt attributes, and flags values that are technically present but useless.',
      'The distinction that matters most: <strong>a decorative image should have <code>alt=""</code></strong> — empty, not missing. Empty means "skip this"; absent means the screen reader may read the filename aloud.'
    ],
    specs: {
      caption: 'What it checks',
      rows: [
        ['Missing <code>alt</code>', 'Flagged'],
        ['<code>alt=""</code>', 'Correct for decorative images'],
        ['<strong>Empty vs missing</strong>', '<strong>Not the same thing at all</strong>'],
        ['Useless values', '"image", "photo", filenames'],
        ['Good alt text', 'Describes function or content in context'],
        ['Length', 'Usually under ~125 characters'],
        ['<strong>Cannot check</strong>', '<strong>Whether the description is accurate</strong>'],
        ['Runs', 'On your device']
      ]
    },
    steps: [
      'Paste the markup.',
      'Give every meaningful image a description of its purpose in context.',
      'Give every decorative image <code>alt=""</code> — empty, not absent.'
    ],
    tip: 'Write what the image <em>does</em>, not what it depicts. A photo of a person on an "About" page might be "Sarah Chen, founder"; the same photo as a link to a profile is "View Sarah Chen’s profile". Describing pixels is the common instinct and it is usually the less useful answer — context decides what a screen reader user actually needs.',
    faqs: [
      { q: 'What about decorative images?', a: 'Give them <code>alt=""</code>. That explicitly tells assistive technology to skip them. Omitting the attribute entirely is different and worse — some screen readers then announce the filename, which is noise.' },
      { q: 'How long should alt text be?', a: 'Usually under about 125 characters. If an image genuinely needs more — a complex chart or diagram — describe it in the surrounding text and keep the alt short, since a long alt string is read as one unbroken utterance.' },
      { q: 'Does an image need alt text if there is a caption?', a: 'Usually yes, and they should not simply repeat each other. The caption is read by everyone; the alt describes the image itself. Where a caption fully describes it, an empty alt avoids hearing the same sentence twice.' },
      { q: 'Does passing mean my alt text is good?', a: 'No. A checker can see that text exists; it cannot tell whether it describes the image usefully. "image123" passes automated validation and helps nobody.' }
    ],
    related: ['heading-checker', 'contrast-checker', 'caption-validator', 'image-to-text', 'readability', 'accessible-palette']
  },

  'caption-validator': {
    intro: 'A caption file that is a fraction of a second out is worse than no captions, because the words on screen belong to a sentence that has already finished — and a malformed timestamp can stop the whole file loading.',
    what: [
      'Checks <strong>SRT</strong> and <strong>VTT</strong> caption files for structural problems: malformed timestamps, out-of-order entries and overlaps.',
      'The two formats look similar and differ in ways that break silently — <strong>SRT uses a comma before milliseconds, VTT uses a full stop</strong>, and VTT requires a <code>WEBVTT</code> header line.'
    ],
    specs: {
      caption: 'The two formats',
      rows: [
        ['SRT timestamp', '<code>00:00:01,500</code> — <strong>comma</strong>'],
        ['VTT timestamp', '<code>00:00:01.500</code> — <strong>full stop</strong>'],
        ['VTT requires', 'A <code>WEBVTT</code> first line'],
        ['Checks', 'Malformed timestamps, ordering, overlaps'],
        ['Reading speed', 'Around 160–180 words per minute is comfortable'],
        ['Line length', 'Two lines of ~32 characters is the usual limit'],
        ['<strong>Cannot check</strong>', '<strong>Whether the text matches the audio</strong>'],
        ['Runs', 'On your device']
      ]
    },
    steps: [
      'Paste the caption file.',
      'Fix timestamp and ordering errors.',
      '<strong>Watch the video with the captions on</strong> — that is the only real test.'
    ],
    tip: 'The comma-versus-full-stop difference between SRT and VTT is the single commonest cause of a caption file that will not load. Renaming a .srt to .vtt does not convert it: the timestamps still use commas, and the player rejects the file with an error that rarely says why. Convert properly, and add the WEBVTT header.',
    faqs: [
      { q: 'What is the difference between SRT and VTT?', a: 'VTT is the web standard and supports styling and positioning; SRT is older and plainer. Structurally the differences that break things are the millisecond separator — comma in SRT, full stop in VTT — and VTT’s required WEBVTT header.' },
      { q: 'My captions will not load.', a: 'Check the separator first. A file renamed from .srt to .vtt keeps comma timestamps and will be rejected. Then check for a WEBVTT header, and for a stray blank line inside a cue.' },
      { q: 'How fast should captions go?', a: 'Around 160–180 words per minute is comfortable to read. Faster than that and viewers miss text; the usual convention is two lines of roughly 32 characters per cue.' },
      { q: 'Does valid mean accurate?', a: 'No. It means the file is well-formed. Whether the words match what is said, and whether the timing feels right, can only be judged by watching the video with them on.' }
    ],
    related: ['alt-text-auditor', 'speech-to-text', 'heading-checker', 'trim-video', 'readability', 'text-diff']
  },

  /* ============ batch 18a — fees & margins cluster (complete) ============
   * Six pages that all compute money out of money, and were consequently
   * identical. Differentiated on WHOSE money and WHICH direction. */

  'vat-gst': {
    intro: 'Adding tax to a price and removing it are not the same sum reversed, and getting them the wrong way round is the commonest arithmetic error in small-business bookkeeping.',
    what: [
      'Adds tax to a net price, or extracts it from a gross one — you say which the amount already is. Defaults to <strong>20%</strong> on 100.',
      '<strong>Removing tax is not "subtract the percentage".</strong> To strip 20% from a gross 120 you divide by 1.20 to get 100, not subtract 20% to get 96. That mistake is off by 4% and it compounds across every line of a return.'
    ],
    specs: {
      caption: 'The two directions',
      rows: [
        ['Add tax', 'net × (1 + rate)'],
        ['<strong>Remove tax</strong>', '<strong>gross ÷ (1 + rate)</strong>'],
        ['At 20%: 100 net', '120 gross'],
        ['At 20%: 120 gross', '<strong>100 net — not 96</strong>'],
        ['Default rate', '20%'],
        ['Knows your rate?', 'No — you supply it'],
        ['Rates vary by', 'Country, and by product category within it'],
        ['Not', 'Tax advice']
      ]
    },
    steps: [
      'Enter the amount and say whether it already includes tax.',
      'Enter your rate.',
      'Read the net, the tax and the gross.'
    ],
    tip: 'To remove tax, divide — never subtract. Stripping 20% from a gross 120 by subtracting 20% gives 96, which is wrong; dividing by 1.20 gives the correct 100. The gap widens with the rate, and on a VAT return applied across hundreds of lines it becomes a material error rather than a rounding one.',
    faqs: [
      { q: 'Why can I not just subtract the percentage?', a: 'Because the tax was calculated on the net amount, not the gross. 20% of 100 is 20, giving 120 — but 20% of 120 is 24. Subtracting works from the wrong base, which is why the answer comes out low.' },
      { q: 'What rate should I use?', a: 'Whatever applies where you are selling, which often depends on the product too — many countries apply reduced rates to food, books or children’s clothing. Cross-border digital sales frequently use the customer’s rate rather than yours.' },
      { q: 'Should my prices include tax?', a: 'Consumer prices are usually quoted gross and business-to-business prices net, but conventions differ by country and are sometimes legally required. Say clearly on your invoice which you have quoted.' },
      { q: 'Is this tax advice?', a: 'No. It applies a rate you supply. Registration thresholds, reverse-charge rules and cross-border obligations are genuinely complicated and need an accountant.' }
    ],
    related: ['invoice-generator', 'percentage-calculator', 'profit-margin', 'income-tax-estimator', 'late-fee', 'discount-calculator']
  },

  'paypal-fee-calculator': {
    intro: 'Payment processors take a percentage plus a fixed fee, and the fixed part is what makes small transactions disproportionately expensive. On a five-dollar payment it can be most of the cost.',
    what: [
      'Calculates the fee and your net from an amount, defaulting to <strong>2.99% plus a fixed fee</strong> on 100.',
      'It also handles the reverse problem — <strong>grossing up</strong>, or working out what to charge so that the amount you receive is the amount you wanted.'
    ],
    specs: {
      caption: 'Fee structure',
      rows: [
        ['Percentage', 'Default 2.99% — you set it'],
        ['Fixed fee', 'Per transaction, on top'],
        ['<strong>Small payments</strong>', '<strong>The fixed fee dominates</strong>'],
        ['On $5', 'The fixed fee can exceed the percentage'],
        ['Cross-border', 'Usually adds a further percentage'],
        ['Currency conversion', 'Charged on top of that again'],
        ['Grossing up', 'Not simply adding the fee back — see the tip'],
        ['Rates change', 'Check your account’s current schedule']
      ]
    },
    steps: [
      'Enter the amount and your actual rate — check your account, not a general figure.',
      'Read the fee and your net.',
      'Use the gross-up direction if you need a specific amount to land.'
    ],
    tip: 'Grossing up is not adding the fee back. If you want 100 net at 2.99% plus 0.30, charging 103.29 does not work — the fee applies to the larger amount too. The correct figure is (100 + 0.30) ÷ (1 − 0.0299) ≈ 103.40, and the gap grows with the amount.',
    faqs: [
      { q: 'Why are small payments so expensive proportionally?', a: 'The fixed fee. At a typical 0.30 fixed charge, a 5.00 payment loses 0.30 before the percentage is applied at all — around 9% total. On 500 the same fixed fee is negligible. It is why micro-payments through general processors rarely work.' },
      { q: 'How do I charge so I receive a specific amount?', a: 'Divide rather than add: (target + fixed) ÷ (1 − percentage). Adding the fee back undercharges, because the fee is then levied on the higher amount as well.' },
      { q: 'What about international payments?', a: 'Most processors add a cross-border percentage, and a further margin on currency conversion. Both are on top of the base rate, and the conversion margin is frequently the larger of the two.' },
      { q: 'Are these the current rates?', a: 'The default is a common figure, not your account’s. Rates vary by country, volume and account type, and they change. Check your own fee schedule and enter it.' }
    ],
    related: ['stripe-fee-calculator', 'etsy-fee-calculator', 'invoice-generator', 'profit-margin', 'currency-converter', 'vat-gst']
  },

  'etsy-fee-calculator': {
    intro: 'Marketplace fees stack in a way that surprises sellers: a listing fee, a transaction fee on the item, another on the shipping you charged, and a payment processing fee on the total. Four deductions, one sale.',
    what: [
      'Works out your actual payout and profit after Etsy’s layered fees, defaulting to a 25 item with 5 shipping.',
      '<strong>The transaction fee applies to shipping too</strong>, which sellers routinely forget — charging more for postage does not pass the full amount through.'
    ],
    specs: {
      caption: 'The fee layers',
      rows: [
        ['Listing fee', 'Per listing, and again on renewal'],
        ['Transaction fee', 'On the item price'],
        ['<strong>Transaction fee</strong>', '<strong>On the shipping you charge, too</strong>'],
        ['Payment processing', 'Percentage plus fixed, on the total'],
        ['Offsite ads fee', 'May apply, and can be mandatory above a threshold'],
        ['Default item / shipping', '25 / 5'],
        ['Your cost to make', 'Entered separately, for true profit'],
        ['Rates change', 'Check Etsy’s current schedule']
      ]
    },
    steps: [
      'Enter the item price, shipping charged and your cost to make it.',
      'Enter the current fee rates from your Etsy account.',
      'Read the payout and the actual profit per sale.'
    ],
    tip: 'Include your own time in "cost to make". Sellers routinely price against materials alone, discover a healthy-looking margin, and find themselves working for very little once the hours are counted. If an item takes ninety minutes and nets eight after fees, that is the number to look at before scaling production.',
    faqs: [
      { q: 'Do fees apply to shipping?', a: 'The transaction fee does, and payment processing applies to the whole amount collected. So raising your shipping charge does not pass the full increase to you — a portion is taken on the way through.' },
      { q: 'What is the offsite ads fee?', a: 'A share of the sale price when a buyer arrives via an ad Etsy placed. Above a revenue threshold participation is mandatory, so it is not always something you can opt out of. Check your current status.' },
      { q: 'Why is my profit lower than I expected?', a: 'Usually the layering — four separate deductions on one sale — plus unaccounted materials, packaging and time. Packaging in particular is invisible until you total a month of it.' },
      { q: 'Are these the current rates?', a: 'They are defaults, and marketplace fees change. Take the figures from your own Etsy fee schedule; a stale rate here produces a confidently wrong margin.' }
    ],
    related: ['paypal-fee-calculator', 'stripe-fee-calculator', 'profit-margin', 'break-even', 'inventory-tracker', 'amazon-fba-calculator']
  },

  'break-even': {
    intro: 'Break-even is the number that tells you whether a business idea is arithmetic or wishful thinking: how many units you must sell before you have covered the costs you pay whether you sell anything or not.',
    what: [
      'Divides fixed costs by <strong>contribution margin</strong> — price minus variable cost per unit — to give the units needed. Defaults to 4,000 monthly fixed costs, 49 price, 18 variable cost.',
      'The contribution margin is what matters, not the price. At 49 against an 18 cost, each sale contributes 31 toward the fixed costs, so you need 130 sales a month before anything is profit.'
    ],
    specs: {
      caption: 'The calculation',
      rows: [
        ['Formula', 'Fixed costs ÷ (price − variable cost)'],
        ['Contribution margin', 'Price minus variable cost per unit'],
        ['Default fixed / price / cost', '4,000 / 49 / 18'],
        ['Fixed costs', 'Rent, salaries, software — paid regardless'],
        ['Variable costs', 'Materials, shipping, fees — per unit'],
        ['Raising price', 'Lowers break-even fastest'],
        ['Cutting fixed costs', 'Lowers it directly'],
        ['Not', 'A forecast — it says nothing about demand']
      ]
    },
    steps: [
      'List fixed costs honestly — including your own salary if you take one.',
      'Work out true variable cost per unit, including payment fees.',
      'Read the units needed, then ask whether that many sales is realistic.'
    ],
    tip: 'Raising the price lowers break-even faster than cutting variable costs, because it widens the contribution margin from the top. Going from 49 to 55 on an 18 cost takes break-even from 130 units to 108 — a 17% drop from a 12% price rise. Discounting does the same thing in reverse, which is why sales targets set alongside a discount so often fail.',
    faqs: [
      { q: 'What counts as a fixed cost?', a: 'Anything you pay regardless of sales — rent, salaries, software subscriptions, insurance. If it appears on the bank statement in a month you sell nothing, it is fixed.' },
      { q: 'Should I include my own salary?', a: 'If you need to be paid, yes. A business that breaks even only because the founder works unpaid is not breaking even, and the number is misleading precisely to the person relying on it.' },
      { q: 'Does break-even mean the idea works?', a: 'No. It tells you how many units are required; it says nothing about whether that many people want the thing. A break-even of 130 a month is trivial for some products and impossible for others.' },
      { q: 'Why does price affect it more than cost?', a: 'Because contribution margin is price minus cost, and a price rise increases the margin without increasing anything else. A 12% price rise can cut break-even by 17%, which is why discounting is so expensive.' }
    ],
    related: ['profit-margin', 'roas-calculator', 'hourly-rate', 'cac-ltv-calculator', 'etsy-fee-calculator', 'inventory-tracker']
  },

  'roas-calculator': {
    intro: 'Return on ad spend is the number every ad platform reports, and taken alone it is misleading — because a 4× return on a product with a 20% margin is losing money.',
    what: [
      'Calculates ROAS from revenue and spend, and the figure that actually decides things: <strong>break-even ROAS</strong>, which is 1 divided by your profit margin. Defaults to 5,000 revenue on 1,250 spend.',
      'At a 25% margin you need a ROAS of 4 just to stand still. Any campaign below that is buying revenue at a loss, however impressive the multiple looks.'
    ],
    specs: {
      caption: 'What decides profitability',
      rows: [
        ['ROAS', 'Revenue ÷ ad spend'],
        ['<strong>Break-even ROAS</strong>', '<strong>1 ÷ profit margin</strong>'],
        ['At 50% margin', 'Break-even ROAS = 2'],
        ['At 25% margin', 'Break-even ROAS = 4'],
        ['At 10% margin', 'Break-even ROAS = 10'],
        ['Default revenue / spend', '5,000 / 1,250 = 4×'],
        ['Ignores', 'Repeat purchases — see LTV:CAC'],
        ['Platform-reported ROAS', 'Often over-attributed']
      ]
    },
    steps: [
      'Enter revenue and ad spend for the period.',
      'Enter your <strong>real</strong> profit margin, after cost of goods and fees.',
      'Compare ROAS against break-even ROAS. Below it, the campaign loses money.'
    ],
    tip: 'Work out your break-even ROAS before you launch, not after. A 4× return sounds like a strong campaign and is exactly break-even on a 25% margin — so a business celebrating "4× ROAS" while running a thin margin is spending to stand still. The margin decides the target; the platform never tells you it.',
    faqs: [
      { q: 'What ROAS should I aim for?', a: 'Above 1 ÷ your profit margin, which is your break-even point. At a 25% margin that is 4×; at 50% it is 2×. There is no universal good number, which is why the platform cannot tell you one.' },
      { q: 'Why is my profitable-looking ROAS losing money?', a: 'Because ROAS uses revenue, not profit. If cost of goods, shipping and payment fees consume 75% of revenue, a 3× return is below the 4× you needed. The multiple looks healthy and the bank balance disagrees.' },
      { q: 'Should I account for repeat purchases?', a: 'For a business with genuine repeat custom, yes — a first order below break-even can be sound if customers come back. That is a lifetime-value calculation rather than a ROAS one; use LTV:CAC.' },
      { q: 'Why does the ad platform report a higher ROAS than I see?', a: 'Attribution. Platforms tend to claim credit for conversions that would have happened anyway, and use generous attribution windows. Compare against total revenue rather than trusting the dashboard alone.' }
    ],
    related: ['cac-ltv-calculator', 'profit-margin', 'break-even', 'percentage-calculator', 'stream-revenue-calculator', 'budget-calculator']
  },

  'late-fee': {
    intro: 'Charging interest on an overdue invoice is usually less about the money than about the signal — an invoice that costs nothing to ignore is the one that gets paid last.',
    what: [
      'Calculates interest on an overdue amount from an annual rate and the days outstanding, defaulting to 2,500 at 45 days.',
      'The daily rate is the annual rate divided by 365, so the charge accrues gradually rather than arriving as a lump on day one.'
    ],
    specs: {
      caption: 'How it accrues',
      rows: [
        ['Invoice amount', 'Default 2,500'],
        ['Days overdue', 'Default 45'],
        ['Rate', 'Annual percentage'],
        ['Daily rate', 'Annual ÷ 365'],
        ['Returns', 'Interest accrued and the new total'],
        ['<strong>Must be agreed</strong>', '<strong>In your terms, before the work</strong>'],
        ['Statutory rights', 'Some jurisdictions allow interest by law'],
        ['Not', 'Legal advice']
      ]
    },
    steps: [
      'Check your contract states a late-payment charge — see the tip.',
      'Enter the amount, days overdue and rate.',
      'Reference the clause when you send the updated invoice.'
    ],
    tip: 'The clause has to exist before the invoice does. Adding interest that was never in your terms is generally unenforceable and reads as opportunistic, which damages the relationship you are trying to preserve. Put a late-payment term in your standard contract once and it covers every client afterwards — several jurisdictions also grant statutory interest on commercial debts even without a clause, which is worth checking locally.',
    faqs: [
      { q: 'Can I charge interest without it being in the contract?', a: 'Often not by contract, but some jurisdictions grant a statutory right to interest on late commercial payments regardless. Check your local position — in several countries that statutory rate is higher than most people would have written into their terms.' },
      { q: 'What rate is reasonable?', a: 'Commonly a base rate plus a margin, and some jurisdictions specify the formula. An unreasonably high rate risks being treated as a penalty and struck out entirely, which leaves you with nothing.' },
      { q: 'Should I actually charge it?', a: 'Judgement. Its main value is deterrent — clients who know interest accrues pay sooner. Many businesses state the term, invoke it rarely, and find the stating alone does the work.' },
      { q: 'What if they still do not pay?', a: 'Escalate in writing with a clear deadline, then consider formal recovery. Interest keeps accruing but does not compel anyone; the letter that says what happens next is what usually moves things.' }
    ],
    related: ['invoice-generator', 'contract-generator', 'receipt-generator', 'compound-interest', 'percentage-calculator', 'iban-validator']
  },

  /* ============ batch 18b — SEO cluster (complete) ============ */

  'og-preview': {
    intro: 'A link shared without an Open Graph image renders as a bare line of text, and a link with the wrong dimensions renders cropped through the middle of your headline. Both cost clicks that the page never learns about.',
    what: [
      'Previews how a URL will appear when shared, so you see the card before a platform builds it rather than after.',
      'The dimensions that matter are <strong>1200 × 630</strong> — the ratio every major platform crops toward. An image at a different ratio gets cut, usually from the top and bottom.'
    ],
    specs: {
      caption: 'What platforms expect',
      rows: [
        ['Image size', '<strong>1200 × 630</strong> (1.91:1)'],
        ['<code>og:image</code>', 'Must be an ABSOLUTE url'],
        ['Relative paths', 'Silently produce no card at all'],
        ['<code>og:title</code>', 'Around 60 characters before truncation'],
        ['<code>og:description</code>', 'Around 155 characters'],
        ['Twitter', 'Needs <code>summary_large_image</code> for the big card'],
        ['Caching', 'Platforms cache aggressively — see the tip'],
        ['Runs', 'On your device']
      ]
    },
    steps: [
      'Enter the URL or the tags.',
      'Check the image is 1200 × 630 and the URL is absolute.',
      'After changing tags, <strong>force a re-scrape</strong> — see the tip.'
    ],
    tip: 'Platforms cache the card, sometimes for days. Fixing your tags and re-sharing shows the old broken preview, which convinces people the fix did not work. Use the platform’s own debugger — Facebook’s Sharing Debugger, LinkedIn’s Post Inspector — to force a re-scrape after any change.',
    faqs: [
      { q: 'My image is not showing.', a: 'Nearly always a relative URL. <code>og:image</code> must be absolute, including the protocol — a relative path yields no card and looks identical to having no tag at all. After fixing it, force a re-scrape.' },
      { q: 'Why does my old preview still appear?', a: 'Platform caching. They store the scraped card and do not re-fetch on every share. Each major platform has a debugger tool that forces a refresh; that is the only reliable way.' },
      { q: 'What size should the image be?', a: '1200 × 630. That is the ratio platforms crop toward, so a square or portrait image loses its top and bottom — frequently the part with your text on it.' },
      { q: 'Do I need separate Twitter tags?', a: 'Twitter falls back to Open Graph for most fields, but <code>twitter:card</code> set to <code>summary_large_image</code> is needed for the large card. Without it you get the small thumbnail version.' }
    ],
    related: ['meta-tag-generator', 'serp-preview', 'social-media-image', 'schema-generator', 'thumbnail-maker', 'url-cleaner']
  },

  'robots-generator': {
    intro: 'robots.txt is four lines of plain text with the power to remove an entire site from search. Most of the damage done with it comes from one misunderstanding: it controls crawling, not indexing.',
    what: [
      'Generates a robots.txt with the rules and sitemap reference you specify.',
      '<strong>Disallow does not remove a page from search results.</strong> It stops crawling — and a page that is linked from elsewhere can still be indexed, showing in results with no description because Google was forbidden from reading it. To keep a page out, use a <code>noindex</code> tag and <em>allow</em> the crawl so it can be seen.'
    ],
    specs: {
      caption: 'What it does and does not do',
      rows: [
        ['<code>Disallow</code>', 'Requests that crawlers do not fetch'],
        ['<strong>Does NOT</strong>', '<strong>Remove a page from the index</strong>'],
        ['To deindex', 'Use <code>noindex</code>, and ALLOW crawling'],
        ['<code>Disallow: /</code>', 'Blocks the entire site — one character'],
        ['Sitemap line', 'Should be an absolute URL'],
        ['Not a security control', 'The file is public and lists what you hid'],
        ['Case sensitive', 'Paths are'],
        ['Location', 'Must be at the domain root']
      ]
    },
    steps: [
      'Add the paths you genuinely want left uncrawled.',
      'Add the absolute URL of your sitemap.',
      '<strong>Check for a stray <code>Disallow: /</code></strong> before deploying.'
    ],
    tip: 'Never use robots.txt to hide sensitive paths. The file is public at yourdomain.com/robots.txt, so a list of admin URLs you did not want found is a directory of exactly where to look — it is the first file an attacker reads. Protect those paths with authentication and leave them out of robots.txt entirely.',
    faqs: [
      { q: 'Will Disallow remove my page from Google?', a: 'No, and this is the single most common misunderstanding. It asks crawlers not to fetch the page; if other sites link to it, it can still appear in results — with no description, because Google was not allowed to read it. Use a <code>noindex</code> meta tag and permit crawling so the tag can be seen.' },
      { q: 'Is it a security measure?', a: 'The opposite. The file is publicly readable and effectively publishes the list of paths you would rather nobody visited. Use authentication for anything that matters.' },
      { q: 'Do all crawlers obey it?', a: 'Well-behaved ones do. It is a convention, not an enforcement mechanism, and scrapers ignore it freely. Anything you need to actually block requires server-side controls.' },
      { q: 'What is the most dangerous mistake?', a: 'A stray <code>Disallow: /</code>, which blocks the whole site. It happens most often when a staging file is copied to production, and the traffic loss is total and takes weeks to recover from.' }
    ],
    related: ['sitemap-generator', 'meta-tag-generator', 'schema-generator', 'serp-preview', 'keyword-density', 'og-preview']
  },

  'sitemap-generator': {
    intro: 'A sitemap is a request for crawl attention, not a command. Google decides what to index; the sitemap only tells it what exists and when it last changed.',
    what: [
      'Builds an XML sitemap from your URLs, with optional change frequency and last-modified dates.',
      '<strong><code>lastmod</code> is the field that does real work.</strong> A changed date is the signal that a page is worth recrawling — which matters far more than <code>priority</code>, a field Google has said it ignores.'
    ],
    specs: {
      caption: 'What matters in a sitemap',
      rows: [
        ['<code>lastmod</code>', '<strong>The useful field — signals a recrawl</strong>'],
        ['<code>priority</code>', 'Ignored by Google'],
        ['<code>changefreq</code>', 'A hint at best'],
        ['Maximum URLs', '50,000 per file'],
        ['Maximum size', '50 MB uncompressed'],
        ['More than that', 'Use a sitemap index'],
        ['Include', 'Only canonical, indexable URLs'],
        ['Submit at', 'Search Console → Sitemaps']
      ]
    },
    steps: [
      'List only canonical URLs you actually want indexed.',
      'Set <code>lastmod</code> honestly — see the tip.',
      'Submit the absolute URL in Search Console.'
    ],
    tip: 'Only update <code>lastmod</code> when the page genuinely changed. Setting every page to today on every build teaches Google the field is meaningless on your site, and it stops acting on it — which costs you the one lever a sitemap actually gives you. An honest date on a genuinely changed page is worth more than a fresh date on everything.',
    faqs: [
      { q: 'Does a sitemap guarantee indexing?', a: 'No. It tells Google what exists and when it changed; indexing remains a judgement about whether the page is worth including. Thin or duplicate pages listed in a sitemap stay unindexed.' },
      { q: 'Should I set priority?', a: 'It does not matter — Google has stated it ignores the field. Spend the effort on <code>lastmod</code>, which does influence recrawl scheduling.' },
      { q: 'What should I leave out?', a: 'Non-canonical duplicates, redirects, error pages, and anything marked <code>noindex</code>. A sitemap full of pages you do not want indexed dilutes the signal and wastes crawl budget.' },
      { q: 'How many URLs can one file hold?', a: '50,000, or 50 MB uncompressed, whichever comes first. Beyond that, split into several sitemaps and reference them from a sitemap index file.' }
    ],
    related: ['robots-generator', 'meta-tag-generator', 'schema-generator', 'serp-preview', 'og-preview', 'slug-generator']
  },

  'schema-generator': {
    intro: 'Structured data is how a page tells search engines what it <em>is</em> rather than what it says — and it is what turns a plain result into one with stars, prices or an FAQ dropdown.',
    what: [
      'Generates <strong>JSON-LD</strong> markup, the format Google recommends, for common schema types.',
      'JSON-LD sits in a script tag rather than being woven through your HTML, which is why it is preferred: the markup and the content stay independent, so a redesign cannot silently break your structured data.'
    ],
    specs: {
      caption: 'Format and rules',
      rows: [
        ['Format', 'JSON-LD — Google’s recommendation'],
        ['Placement', 'A <code>&lt;script type="application/ld+json"&gt;</code> block'],
        ['<strong>Must match</strong>', '<strong>Visible page content</strong>'],
        ['Marking up invisible content', 'A guidelines violation'],
        ['Rich results', 'Eligible, never guaranteed'],
        ['Validate with', 'Google’s Rich Results Test'],
        ['Common types', 'FAQPage, Product, Article, BreadcrumbList'],
        ['Runs', 'On your device']
      ]
    },
    steps: [
      'Pick the type that genuinely describes the page.',
      'Fill in details that <strong>appear on the page itself</strong>.',
      'Validate with Google’s Rich Results Test before shipping.'
    ],
    tip: 'Never mark up content that is not visible on the page. Adding FAQ schema for questions a visitor cannot see, or review stars for reviews you do not display, is a guidelines violation — and the penalty is losing rich results across the whole site, not just that page. The markup describes the page; it must not exceed it.',
    faqs: [
      { q: 'Will this get me rich results?', a: 'It makes you eligible, not guaranteed. Google decides per query whether to show enhanced results, and eligibility is necessary but not sufficient. Correct markup gets you into the running.' },
      { q: 'Why JSON-LD rather than microdata?', a: 'Google recommends it, and it separates the markup from the HTML. Microdata is woven through your elements, so a template change can silently break it; a JSON-LD block survives redesigns.' },
      { q: 'Can I mark up content that is not shown?', a: 'No. Structured data must reflect what a visitor sees. Marking up hidden FAQs or non-existent reviews violates the guidelines and risks a manual action that removes rich results sitewide.' },
      { q: 'How do I check it works?', a: 'Google’s Rich Results Test for eligibility, and Search Console’s enhancement reports once the page is live. Validation is fast and catches most mistakes before they matter.' }
    ],
    related: ['meta-tag-generator', 'serp-preview', 'og-preview', 'sitemap-generator', 'robots-generator', 'json-formatter']
  },

  'keyword-density': {
    intro: 'Keyword density was a ranking factor two decades ago and is now mainly a diagnostic — useful for noticing that you never actually said the thing your page is about, and useless as a target to hit.',
    what: [
      'Counts word frequency with stop-words excluded, so "the" and "and" do not crowd out anything meaningful.',
      '<strong>There is no correct density.</strong> Modern search engines work on meaning rather than repetition, and writing to hit a percentage produces the stilted prose that keyword stuffing penalties exist for.'
    ],
    specs: {
      caption: 'What it is good for',
      rows: [
        ['Counts', 'Word frequency, stop-words excluded'],
        ['<strong>Target density</strong>', '<strong>There is not one</strong>'],
        ['Genuinely useful for', 'Noticing your topic is never stated plainly'],
        ['Also useful for', 'Spotting accidental repetition'],
        ['Not useful for', 'Hitting a percentage'],
        ['Search engines now use', 'Semantic relevance, not repetition'],
        ['Stuffing', 'Actively penalised'],
        ['Runs', 'On your device']
      ]
    },
    steps: [
      'Paste the page copy.',
      'Check the topic actually appears — a surprising number of pages never say it.',
      'Look for words you have repeated without noticing, and vary them.'
    ],
    tip: 'The useful finding is absence, not frequency. Pages written by someone deep in a subject often never state it plainly — an article about compressing video that says "the tool" and "this" throughout and never the phrase itself. Density analysis catches that. Chasing a target percentage does the opposite of helping.',
    faqs: [
      { q: 'What density should I aim for?', a: 'None. There is no threshold that helps, and writing toward one produces exactly the unnatural repetition that search engines penalise. Write for the reader and use this to check nothing important went unsaid.' },
      { q: 'Is keyword density still a ranking factor?', a: 'Not meaningfully. Search engines model meaning, synonyms and context rather than counting occurrences. Extreme repetition is still detected — as spam.' },
      { q: 'What is it actually useful for?', a: 'Two things: confirming your page states its topic explicitly somewhere, and catching accidental repetition of a word you leaned on without noticing. Both are editorial, not algorithmic.' },
      { q: 'Should I use synonyms?', a: 'Yes, because people search in different words and because it reads better. That is writing well rather than an SEO technique, which is rather the point.' }
    ],
    related: ['readability', 'word-counter', 'meta-tag-generator', 'serp-preview', 'text-diff', 'slug-generator']
  },

  'utm-builder': {
    intro: 'UTM parameters are how a campaign becomes visible in analytics, and the thing that ruins them is not complexity — it is inconsistency. <code>Facebook</code> and <code>facebook</code> are two different sources forever.',
    what: [
      'Builds tagged URLs with source, medium, campaign and optional term and content.',
      '<strong>The values are case-sensitive</strong> and analytics will never merge them. One person tagging <code>Email</code> and another <code>email</code> splits a campaign into two reports permanently.'
    ],
    specs: {
      caption: 'The parameters',
      rows: [
        ['<code>utm_source</code>', 'Where it came from — newsletter, facebook'],
        ['<code>utm_medium</code>', 'The channel type — email, cpc, social'],
        ['<code>utm_campaign</code>', 'The specific campaign'],
        ['<code>utm_term</code>', 'Paid keyword — optional'],
        ['<code>utm_content</code>', 'Which variant — for A/B tests'],
        ['<strong>Case sensitive</strong>', '<strong>Always use lowercase</strong>'],
        ['<strong>Never use on</strong>', '<strong>Internal links — see the tip</strong>'],
        ['Visible to users', 'Yes, in the address bar']
      ]
    },
    steps: [
      'Use lowercase for every value, without exception.',
      'Keep <code>medium</code> to a short fixed vocabulary — email, cpc, social, referral.',
      'Write the convention down somewhere the whole team can see it.'
    ],
    tip: 'Never put UTM parameters on internal links. A tagged link from one page of your site to another <strong>starts a new session</strong> and reattributes it to that campaign — so your own navigation gets credited for conversions the original source earned. It is one of the fastest ways to make analytics data untrustworthy, and it is usually done with good intentions.',
    faqs: [
      { q: 'Does capitalisation matter?', a: 'Yes, and it is unforgiving. <code>Facebook</code> and <code>facebook</code> appear as separate sources and analytics will not merge them retroactively. Use lowercase everywhere and write it down as a rule.' },
      { q: 'What is the difference between source and medium?', a: 'Source is the specific origin — <code>newsletter</code>, <code>partner-site</code>. Medium is the channel type — <code>email</code>, <code>cpc</code>, <code>social</code>. Keeping medium to a small fixed vocabulary is what makes reports comparable.' },
      { q: 'Can I use them on internal links?', a: 'No. Doing so starts a new session and reattributes it to that campaign, so your internal navigation steals credit from the real source. Use event tracking for internal clicks.' },
      { q: 'Users can see these — does that matter?', a: 'Sometimes. They make URLs long and reveal your campaign naming, and anyone sharing a tagged link passes your parameters on. Consider a short link for anything shared publicly.' }
    ],
    related: ['url-cleaner', 'slug-generator', 'url-encoder', 'meta-tag-generator', 'roas-calculator', 'og-preview']
  },

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
    related: ['compress-video', 'convert-video', 'video-to-gif', 'resize-video', 'mute-video', 'extract-audio']
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
    related: ['trim-video', 'compress-video', 'convert-video', 'resize-video', 'frame-grabber', 'mute-video']
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
    related: ['compress-video', 'trim-video', 'resize-video', 'video-to-gif', 'extract-audio', 'mute-video']
  },

  /* ================= session 6 — images, SEO, accessibility, business ================= */

  'thumbnail-maker': {
    intro: 'A thumbnail is judged at about 200 pixels wide in a crowded feed, which is roughly a sixth of the size you are designing it at. Most thumbnails fail because they were only ever checked full size.',
    what: [
      'Resizes an image to one of six standard thumbnail sizes, either filling the frame and cropping, or fitting the whole image inside it on a background colour.',
      'The fit mode decides what you lose. Fill and crop keeps the frame full and trims the edges; Fit keeps everything and pads the sides. Neither is right in general — it depends on whether the edges of your image matter.'
    ],
    specs: {
      caption: 'Sizes and what they are for',
      rows: [
        ['YouTube 1280×720', 'Video thumbnails, 16:9'],
        ['Blog / OG 1200×630', 'Link previews on social and messaging apps'],
        ['Square 1080×1080', 'Instagram feed, profile grids'],
        ['Wide 1600×900', 'Hero images, presentation slides'],
        ['Small 640×360', 'Lightweight embeds and list views'],
        ['Fill & crop', 'Frame stays full, edges are trimmed'],
        ['Fit (no crop)', 'Whole image kept, sides padded with your background colour']
      ]
    },
    steps: [
      'Drop the image in.',
      'Pick a <strong>size</strong> that matches where it will appear.',
      'Choose <strong>Fill & crop</strong> unless the edges of the image carry meaning.',
      'Before publishing, view the result at about 200 px wide.'
    ],
    tip: 'Check it small before you commit. Fine detail, thin text and low-contrast subjects all disappear at feed size, and the thumbnail that looked considered at full resolution reads as a grey smudge in a list. If the subject is not identifiable at 200 px, the design is wrong regardless of how it looks large.',
    faqs: [
      { q: 'Fill and crop, or fit?', a: 'Fill and crop for photographs, where trimming the edges costs nothing and a full frame looks stronger. Fit when the edges matter — a product shot, a screenshot, anything where cropping removes information. Fit adds bars, which is the trade.' },
      { q: 'Why is my image cropped oddly?', a: 'Fill and crop takes the centre of the frame. If your subject sits off to one side, crop it deliberately first with Crop Image and then run it through here.' },
      { q: 'Which size for a link preview?', a: '1200×630. That is the Open Graph standard and it is what Facebook, LinkedIn, Slack and most messaging apps expect. Anything else gets cropped unpredictably by each platform.' },
      { q: 'Will this make a small image bigger?', a: 'It scales to the target size, so a small source will be enlarged and will look soft. Start from the largest version you have — enlarging cannot recover detail that was never captured.' }
    ],
    related: ['social-media-image', 'crop-image', 'resize-image', 'compress-image', 'meme-generator', 'passport-photo-maker']
  },

  'social-media-image': {
    intro: 'Every platform has its own dimensions, they change without notice, and getting one wrong means your image is cropped somewhere you did not choose — usually across a face or a logo.',
    what: [
      'Resizes an image to the current standard size for nine specific placements, filling and cropping or fitting on a background.',
      'These are placement-specific rather than platform-specific, because a single platform uses several. An Instagram feed post, a portrait post and a story are three different shapes, and using the wrong one is the most common reason a post looks wrong.'
    ],
    specs: {
      caption: 'Placements covered',
      rows: [
        ['Instagram post', '1080×1080 — square feed'],
        ['Instagram portrait', '1080×1350 — the tallest the feed allows'],
        ['Instagram / TikTok story', '1080×1920 — full-screen vertical'],
        ['Facebook post', '1200×630'],
        ['X / Twitter post', '1600×900 · header 1500×500'],
        ['LinkedIn post', '1200×627'],
        ['YouTube thumbnail', '1280×720'],
        ['Pinterest pin', '1000×1500 — tall performs better here']
      ]
    },
    steps: [
      'Drop the image in.',
      'Choose the <strong>exact placement</strong>, not just the platform.',
      'Use <strong>Fill & crop</strong> for photos, <strong>Fit</strong> where the whole image must survive.',
      'Keep important content away from the edges — interfaces overlay them.'
    ],
    tip: 'Stories and vertical video are the ones to be careful with. The top and bottom roughly 250 pixels sit under the platform’s own interface — profile name at the top, reply box and buttons at the bottom. Design as though the middle two-thirds is the only safe area.',
    faqs: [
      { q: 'Why did my image get cropped after uploading?', a: 'The platform cropped it to its own aspect ratio, which is what happens whenever the uploaded shape does not match the placement. Sizing correctly first means you choose the crop rather than an algorithm choosing it for you.' },
      { q: 'Which Instagram size should I use?', a: 'Portrait 1080×1350 takes the most vertical space in the feed, which is why it tends to perform better than square. Square is safer if the composition needs it. Stories are a different shape entirely at 1080×1920.' },
      { q: 'Do these sizes go out of date?', a: 'They shift occasionally. These are the current widely-used dimensions, and the safest habit is to keep important content away from the edges so a change in crop costs you nothing.' },
      { q: 'Is one image enough for every platform?', a: 'No, and trying is why images get badly cropped. A square post and a full-screen story cannot be the same file. Export the sizes you actually need — it takes seconds each.' }
    ],
    related: ['thumbnail-maker', 'crop-image', 'resize-image', 'circle-crop', 'compress-image', 'meme-generator']
  },

  'passport-photo-maker': {
    intro: 'Passport photo requirements are unforgiving and vary by country. The dimensions are the easy part — the reason photos get rejected is usually everything around them.',
    what: [
      'Crops and resizes a photo to the official print dimensions for five countries, at print resolution.',
      'To be clear about scope: this handles the size. It cannot check head position, background colour, expression, glasses, shadows or lighting, and those are what officials actually reject photos for.'
    ],
    specs: {
      caption: 'Sizes by country',
      rows: [
        ['US / India', '2×2 inches — 600×600 px'],
        ['UK / EU / Schengen', '35×45 mm — 413×531 px'],
        ['Canada', '50×70 mm — 590×826 px'],
        ['Australia', '35×45 mm — 413×531 px'],
        ['Fit', 'Fill & crop, or Fit with a background colour'],
        ['Not checked', 'Head size and position, background, expression, glasses, shadows'],
        ['Authoritative source', 'Your country’s official guidance — always check it']
      ]
    },
    steps: [
      'Read your country’s official photo rules first — they specify head height and position, not just the print size.',
      'Take or choose a photo against a plain, evenly lit background.',
      'Drop it in and select your country’s size.',
      'Compare the result against the official template before submitting.'
    ],
    tip: 'Head size is what catches people out, and it is a proportion rather than a dimension. Most countries specify that the head must occupy a set fraction of the frame — commonly around 70–80% of the height from chin to crown. A correctly sized photo with the head too small or too low is still rejected, and this tool cannot see that.',
    faqs: [
      { q: 'Will a photo from this be accepted?', a: 'Only if it was already compliant in every other respect. This gets the dimensions right; officials also check head size and position, background, lighting, shadows, expression, eye visibility and whether glasses cause glare. Check your country’s published template.' },
      { q: 'Can I take the photo on a phone?', a: 'Many countries accept it if the result meets the rules. Use a plain light background, even lighting with no shadow behind you, hold the camera at eye level, and avoid a wide-angle selfie — phone front cameras distort facial proportions noticeably up close.' },
      { q: 'Why are US and Indian sizes the same?', a: 'Both use a 2×2 inch square, which is unusual — most countries use the rectangular 35×45 mm format. The shared size does not mean shared rules on head position, so check each separately.' },
      { q: 'What resolution is needed for printing?', a: 'The pixel dimensions here correspond to roughly 300 DPI at the stated print size, which is the normal requirement. Printing at a smaller size than intended is fine; enlarging is not.' }
    ],
    related: ['crop-image', 'circle-crop', 'resize-image', 'social-media-image', 'compress-image', 'convert-image']
  },

  'flip-image': {
    intro: 'Mirroring is the one image operation that changes meaning as often as it changes appearance — invaluable for a selfie, catastrophic for anything containing text.',
    what: [
      'Flips an image horizontally, which mirrors it, or vertically, which turns it upside down.',
      'Horizontal is the common one. Phone front cameras usually save what you saw in the preview rather than what the lens captured, or the reverse depending on the phone, which is why selfies sometimes look subtly wrong to the person in them.'
    ],
    specs: {
      caption: 'The two directions',
      rows: [
        ['Horizontal', 'Mirrors left to right — the selfie fix'],
        ['Vertical', 'Turns the image upside down — rarely what you want'],
        ['Quality', 'Lossless — pixels are rearranged, not resampled'],
        ['File size', 'Essentially unchanged'],
        ['Text', 'Becomes mirrored and unreadable'],
        ['Rotation', 'Different operation — use Rotate Image'],
        ['Reversible', 'Flipping twice returns the original exactly']
      ]
    },
    steps: [
      'Drop the image in.',
      'Choose <strong>Horizontal</strong> to mirror, <strong>Vertical</strong> to invert.',
      'Check any text in the image before saving.'
    ],
    tip: 'If the image contains text, a logo, a sign or a number plate, horizontal flip will render it backwards and the mistake is easy to miss on a quick look. Faces are far more forgiving — most people cannot tell a mirrored portrait from an unmirrored one, which is exactly why the operation is so useful on selfies.',
    faqs: [
      { q: 'Flip or rotate — which do I need?', a: 'Flipping mirrors the image, producing a reflection. Rotating turns it while keeping the same handedness, so text stays readable. If your photo is sideways, you want Rotate Image; if it is a mirrored selfie, you want a horizontal flip.' },
      { q: 'Does flipping lose quality?', a: 'No. Pixels are rearranged, not resampled or re-encoded, so the result is identical in quality to the source and flipping twice returns you exactly where you started.' },
      { q: 'Why do my selfies look wrong to other people?', a: 'You are used to your mirrored reflection, and faces are not symmetrical. A photo saved unmirrored looks subtly unfamiliar to you and completely normal to everyone else. A horizontal flip gives you the version you recognise.' },
      { q: 'When would I flip vertically?', a: 'Rarely — mainly for reflection effects, or correcting a scan fed in upside down. For a sideways photo, rotation is the right operation.' }
    ],
    related: ['rotate-image', 'crop-image', 'resize-image', 'circle-crop', 'compress-image', 'image-watermark']
  },

  'rotate-image': {
    intro: 'A photo that displays upright on your phone and sideways on a laptop has not changed — only the software reading its orientation flag has. Rotating fixes it in the pixels, where nothing can ignore it.',
    what: [
      'Rotates an image by 90° right, 180°, or 90° left, writing the new orientation into the pixels themselves.',
      'That distinction matters. Many photos carry an EXIF orientation flag telling software how to display them, and plenty of applications ignore it. Rotating here makes the change unconditional.'
    ],
    specs: {
      caption: 'Options and behaviour',
      rows: [
        ['90° right', 'Clockwise, a quarter turn'],
        ['180°', 'Upside down'],
        ['90° left', 'Anti-clockwise, a quarter turn'],
        ['Dimensions', 'Width and height swap on a quarter turn'],
        ['Quality', 'Lossless — pixels are rearranged, not resampled'],
        ['EXIF orientation', 'Not relied on; the rotation is applied to the image itself'],
        ['Arbitrary angles', 'Not supported — 90° steps only']
      ]
    },
    steps: [
      'Drop the image in.',
      'Choose the direction. If you have to tilt your head left to read it, use 90° right.',
      'Rotate and download.'
    ],
    tip: 'Rotating in 90° steps is lossless because it is a pure rearrangement of pixels. Rotating by an arbitrary angle is not — it requires resampling every pixel and softens the image, which is why straightening a crooked scan costs quality in a way that turning it sideways does not.',
    faqs: [
      { q: 'Which direction do I need?', a: 'If you tilt your head to the left to read the image, rotate 90° right. If you tilt right, rotate 90° left. Guessing has a 50% success rate and it takes one attempt to find out.' },
      { q: 'Why did my photo look fine on my phone but not my laptop?', a: 'The phone honoured the EXIF orientation flag and the laptop software did not. Rotating here changes the actual pixels, so the result is correct everywhere regardless of what reads it.' },
      { q: 'Does rotating reduce quality?', a: 'Not at 90° steps — it is a lossless rearrangement. Only arbitrary angles require resampling, and this tool deliberately offers quarter turns only.' },
      { q: 'Can I straighten a slightly crooked photo?', a: 'Not here. That needs an arbitrary angle plus a crop to remove the corners it introduces, which is an editor’s job. This handles the quarter turns that fix orientation.' }
    ],
    related: ['flip-image', 'crop-image', 'rotate-pdf', 'resize-image', 'exif-viewer', 'compress-image']
  },

  'meme-generator': {
    intro: 'The classic format is one image, white Impact-style text top and bottom, heavy black outline. The outline is not decoration — it is what keeps the text readable over any background.',
    what: [
      'Adds top and bottom caption text to an image and exports a PNG.',
      'Everything happens on a canvas in this page, so the image is never uploaded — which matters more for memes than people assume, given how often the source is a personal photo or a screenshot of a private conversation.'
    ],
    specs: {
      caption: 'The format and why it works',
      rows: [
        ['Text placement', 'Top and bottom, either can be left empty'],
        ['Styling', 'Bold white with a heavy dark outline'],
        ['Why the outline', 'Keeps text legible over both light and dark areas'],
        ['Traditional convention', 'UPPERCASE — it reads faster at small sizes'],
        ['Output', 'PNG'],
        ['Best source', 'A wide image; tall ones leave little room for captions'],
        ['Processing', 'On a canvas in this page — nothing uploaded']
      ]
    },
    steps: [
      'Drop in your image.',
      'Type the top and bottom text — either can be left blank.',
      'Keep each line short; long captions wrap and shrink.',
      'Download the PNG.'
    ],
    tip: 'Short beats clever. A meme is read in about a second while someone is scrolling, and every extra word shrinks the text and costs you attention. If a caption needs a comma, it is probably two memes.',
    faqs: [
      { q: 'Why is the text white with a black outline?', a: 'Because it has to be readable over whatever is behind it. Plain white vanishes on a bright sky and plain black vanishes in shadow; the outline guarantees contrast on both without knowing anything about the image.' },
      { q: 'Can I move the text or change the font?', a: 'Not here — this produces the standard top-and-bottom format deliberately, because that is the convention people recognise. For custom placement you would need an image editor.' },
      { q: 'Is my image uploaded?', a: 'No. Everything is drawn on a canvas in this page. Given that meme sources are frequently personal photos or screenshots of private chats, that is worth knowing.' },
      { q: 'Why should the text be uppercase?', a: 'Convention, and legibility. Uppercase reads faster at thumbnail size and matches the format people expect. Lowercase works, it just reads as a different kind of joke.' }
    ],
    related: ['thumbnail-maker', 'crop-image', 'social-media-image', 'image-watermark', 'resize-image', 'compress-image']
  },

  'meta-tag-generator': {
    intro: 'The title and description are not for search engines. They are advertising copy shown to a human deciding whether to click, and they are the highest-leverage 200 characters on any page.',
    what: [
      'Generates the meta tags a page needs — title, description, canonical and Open Graph — and counts the characters against the limits that matter.',
      'The counters are the useful part. Titles are truncated around 60 characters and descriptions around 155, and a sentence cut off mid-word costs clicks from a page that already ranked.'
    ],
    specs: {
      caption: 'The limits that matter',
      rows: [
        ['Title', 'Around 60 characters before truncation'],
        ['Description', 'Around 155 characters'],
        ['Truncation basis', 'Pixel width, so wide letters truncate sooner'],
        ['Canonical', 'The single preferred URL for the page'],
        ['Open Graph image', '1200×630 is the standard'],
        ['Description and ranking', 'Not a ranking factor — it affects click-through'],
        ['Rewriting', 'Google may substitute its own if yours does not fit the query']
      ]
    },
    steps: [
      'Enter the title, keeping the distinctive words first — the end is what gets cut.',
      'Write a description that gives someone a reason to click, not a keyword list.',
      'Add the canonical URL and an Open Graph image.',
      'Copy the generated tags into your page’s <code>&lt;head&gt;</code>.'
    ],
    tip: 'Front-load both fields. Truncation is measured in pixels rather than characters, so a title full of wide letters gets cut earlier than the count suggests. Putting the specific, distinctive words first means the part that survives is the part that earns the click.',
    faqs: [
      { q: 'Does the meta description affect ranking?', a: 'No, and it has not for many years. It affects click-through rate, which is a different and still valuable thing — a page that ranks fifth with a compelling description can beat one ranking third without.' },
      { q: 'Why does Google show different text from mine?', a: 'It rewrites descriptions when it thinks a passage from the page answers the query better. A well-written description is used most of the time; it is a strong suggestion rather than a guarantee.' },
      { q: 'What happens if my title is too long?', a: 'It is truncated with an ellipsis, usually mid-phrase. The limit is pixel width rather than a character count, so the practical cutoff varies with the letters used — treat 60 as guidance and check with a preview.' },
      { q: 'Do I need Open Graph tags separately?', a: 'Yes, if you want control over how links look when shared. Without them platforms guess at the title, description and image, and the guess is often the first image on the page.' }
    ],
    related: ['serp-preview', 'og-preview', 'slug-generator', 'schema-generator', 'keyword-density', 'robots-generator']
  },

  'serp-preview': {
    intro: 'Writing a title in a text field tells you nothing about how it will look in a results page. Seeing it truncated, next to competitors, is what changes what you write.',
    what: [
      'Renders your title, URL and description the way a search result displays them, so you can see the truncation before publishing.',
      'The value is entirely in the preview. A description reads fine in a form field and lands badly when cut off mid-sentence between the ninth and tenth word.'
    ],
    specs: {
      caption: 'What to check in the preview',
      rows: [
        ['Title truncation', 'Around 60 characters, by pixel width'],
        ['Description truncation', 'Around 155 characters'],
        ['Mobile', 'Shows less than desktop — check the tighter case'],
        ['URL display', 'Shown as a breadcrumb path rather than the raw URL'],
        ['Front-loading', 'The distinctive words should survive the cut'],
        ['Brand name', 'Usually last in the title, first to be truncated'],
        ['Actual result', 'Google may rewrite either field']
      ]
    },
    steps: [
      'Paste your title, URL and description.',
      'Look at where each one is cut.',
      'Rewrite so the important words appear before the cut.',
      'Read the description as a sentence — does it give a reason to click?'
    ],
    tip: 'Write the description as a promise rather than a summary. "Merge PDFs in your browser — nothing uploaded, no sign-up" gives someone a reason to click; "This page contains a tool for merging PDF files" describes the page to someone who is not reading it yet. The distinction is worth more than any keyword.',
    faqs: [
      { q: 'Will my result look exactly like this?', a: 'Close, but not guaranteed. Google adjusts titles and rewrites descriptions depending on the query, and result layouts change over time. Use the preview to catch truncation and awkward phrasing, not as a pixel-perfect promise.' },
      { q: 'Should the brand name go in the title?', a: 'Usually at the end, separated by a pipe or dash, so it is the first thing truncated. The exception is a well-known brand, where leading with it can improve trust enough to be worth the space.' },
      { q: 'How long should the description be?', a: 'Long enough to give a reason to click, short enough to survive. Around 150 characters is safe. Very short descriptions leave the page looking thin; very long ones lose their ending.' },
      { q: 'Does every page need a unique description?', a: 'Every page you care about ranking, yes. Duplicated descriptions across a site are a signal of templated content, and they waste the one piece of copy you fully control in the results page.' }
    ],
    related: ['meta-tag-generator', 'og-preview', 'slug-generator', 'keyword-density', 'schema-generator', 'readability']
  },

  'contrast-checker': {
    intro: 'Low-contrast text is the single most common accessibility failure on the web, and it is also the easiest to fix — it is a number you can check in seconds before the design ships.',
    what: [
      'Calculates the contrast ratio between a foreground and background colour and reports whether it meets each WCAG threshold.',
      'It shows all four results rather than a single pass or fail, because the requirement depends on text size. A colour pair that fails for body text can be perfectly acceptable for a heading.'
    ],
    specs: {
      caption: 'WCAG thresholds',
      rows: [
        ['Normal text, AA', '4.5:1 — the usual legal and practical minimum'],
        ['Normal text, AAA', '7:1 — enhanced'],
        ['Large text, AA', '3:1'],
        ['Large text, AAA', '4.5:1'],
        ['"Large" means', 'About 18pt, or 14pt bold'],
        ['Maximum possible', '21:1 — pure black on pure white'],
        ['Not covered', 'Colour blindness — high contrast can still be indistinguishable']
      ]
    },
    steps: [
      'Enter your foreground and background hex colours.',
      'Read the ratio and check it against the size of text you are using.',
      'Aim for <strong>4.5:1</strong> for body text as the working minimum.'
    ],
    tip: 'Grey placeholder text is where this fails most often. Light grey on white looks refined in a mockup and becomes unreadable in sunlight, on a cheap screen, or to anyone over about fifty. If placeholder text carries meaning, it needs to clear 4.5:1 like any other text.',
    faqs: [
      { q: 'What counts as large text?', a: 'Roughly 18pt regular or 14pt bold — about 24px and 18.66px. Below that the stricter 4.5:1 threshold applies. The exemption exists because larger letterforms are inherently easier to read at lower contrast.' },
      { q: 'Is passing AA enough?', a: 'It is the level most accessibility regulations reference, so it is the practical minimum. AAA is better for body text where you can achieve it, and is genuinely difficult with brand colours that were never chosen with contrast in mind.' },
      { q: 'Does this cover colour blindness?', a: 'No, and that is an important gap. Contrast ratio is about luminance, so red and green of similar brightness can pass comfortably and still be indistinguishable to someone with red-green colour blindness. Use the Colour Blind Simulator as well.' },
      { q: 'Do icons and buttons need to pass?', a: 'Meaningful non-text elements — icons that carry information, input borders, focus indicators — need 3:1 under WCAG 2.1. Purely decorative graphics do not.' }
    ],
    related: ['accessible-palette', 'color-blind-simulator', 'color-converter', 'palette-generator', 'heading-checker', 'alt-text-auditor']
  },

  'readability': {
    intro: 'Readability scores measure sentence length and syllable count, not clarity. A short sentence full of jargon scores well and communicates nothing — which is worth knowing before optimising for the number.',
    what: [
      'Calculates Flesch Reading Ease and Flesch-Kincaid Grade Level, along with the word, sentence and syllable counts they are derived from.',
      'Both formulas use only two inputs: words per sentence and syllables per word. That simplicity is why they are quick and useful, and also why they can be gamed by chopping sentences in half.'
    ],
    specs: {
      caption: 'Reading ease scores',
      rows: [
        ['90–100', 'Very easy — around age 11'],
        ['60–70', 'Plain English — the usual target for general audiences'],
        ['30–50', 'Difficult — academic or technical writing'],
        ['0–30', 'Very difficult — legal and specialist text'],
        ['Grade level', 'US school grade needed to read it comfortably'],
        ['Common guidance', 'Aim for grade 8–10 for a general audience'],
        ['What it measures', 'Sentence and word length only — not clarity or accuracy']
      ]
    },
    steps: [
      'Paste your text.',
      'Read the ease score and grade level together.',
      'If the score is low, look for long sentences first — they move the number most.',
      'Then read it aloud, which catches what the formula cannot.'
    ],
    tip: 'Improve the score by splitting long sentences, not by replacing precise words with vague ones. The formula rewards short words, so "use" scores better than "utilise" — which is a genuine improvement — but it also rewards "thing" over "deductible", which is not. The score is a prompt to re-read, not a target to hit.',
    faqs: [
      { q: 'What score should I aim for?', a: 'Around 60–70 reading ease, or grade 8–10, for a general audience. Technical documentation for specialists can reasonably sit lower. Government and health guidance often targets grade 8 or below, because the cost of being misunderstood is high.' },
      { q: 'Does a high score mean the writing is good?', a: 'No. The formula counts syllables and sentence length; it cannot detect whether the text is accurate, well organised or interesting. Text can score beautifully and still be meaningless.' },
      { q: 'Why did my score change after I added a heading?', a: 'Headings without full stops can be read as part of the following sentence, inflating the words-per-sentence figure. Paste the body text alone for a cleaner reading.' },
      { q: 'Does readability affect SEO?', a: 'Not directly — there is no readability ranking factor. It affects whether people stay and finish, which does matter. Write for the reader and the score generally follows.' }
    ],
    related: ['word-counter', 'text-diff', 'case-converter', 'serp-preview', 'keyword-density', 'meta-tag-generator']
  },

  'profit-margin': {
    intro: 'Margin and markup are different numbers that people use interchangeably, and the confusion reliably costs money. A 50% markup is a 33% margin — not the same thing at all.',
    what: [
      'Calculates gross profit, margin and markup from a cost and a selling price, across any number of units.',
      'Showing both margin and markup side by side is deliberate. Suppliers usually quote markup and accountants think in margin, so the same deal gets described two ways and the gap is where pricing mistakes happen.'
    ],
    specs: {
      caption: 'Margin versus markup',
      rows: [
        ['Margin', 'Profit ÷ selling price — the share of revenue you keep'],
        ['Markup', 'Profit ÷ cost — how much you added to what you paid'],
        ['50% markup', 'equals a 33% margin'],
        ['100% markup', 'equals a 50% margin'],
        ['Margin ceiling', 'Can never reach 100%'],
        ['Markup ceiling', 'None — it can exceed 100% freely'],
        ['This is gross', 'Before overheads, payment fees, returns and tax']
      ]
    },
    steps: [
      'Enter your unit cost and selling price.',
      'Set the number of units for totals.',
      'Read margin and markup separately, and note which one a supplier or platform means.'
    ],
    tip: 'This is gross margin — it counts the cost of the item and nothing else. Payment processing, platform fees, shipping, returns, storage and your own time all come out of what is left. A healthy-looking 40% gross margin can be a loss once a 3% payment fee, a 15% platform fee and a 10% return rate are taken off.',
    faqs: [
      { q: 'What is the difference between margin and markup?', a: 'The denominator. Margin divides profit by the selling price; markup divides it by the cost. Buy at 100 and sell at 150 and you have a 50% markup and a 33% margin. Both describe the same deal.' },
      { q: 'Why can margin never reach 100%?', a: 'Because it is a share of the selling price, and the cost is always part of that price. Only a zero-cost product would give a 100% margin. Markup has no such ceiling — a 10 to 100 sale is a 900% markup.' },
      { q: 'Which should I use for pricing?', a: 'Margin, generally, because it tells you what share of each sale you keep and it compares cleanly across products. Use markup when translating a supplier’s quote, since that is usually the language they are speaking.' },
      { q: 'Does this include fees and overheads?', a: 'No — it is gross margin on the item only. Payment fees, platform commission, shipping, returns and overheads all reduce what you actually keep. Use the platform fee calculators to work those out separately.' }
    ],
    related: ['break-even', 'stripe-fee-calculator', 'paypal-fee-calculator', 'etsy-fee-calculator', 'discount-calculator', 'percentage-calculator']
  },

  'stripe-fee-calculator': {
    intro: 'Payment fees have a percentage and a fixed component, and the fixed part is what makes small transactions disproportionately expensive. On a £3 sale, 30p is a tenth of the money.',
    what: [
      'Works out the fee and what you receive on a payment — or reverses it, telling you what to charge in order to receive a specific amount.',
      'The reverse mode is not a simple addition. Adding the fee to the price increases the fee, so the correct figure requires solving for it — which is why manually adding 2.9% always leaves you slightly short.'
    ],
    specs: {
      caption: 'How the fee behaves',
      rows: [
        ['Structure', 'A percentage plus a fixed amount per transaction'],
        ['Common default', '2.9% + 0.30 — adjust to your actual rate'],
        ['Effect on small payments', 'A 5.00 charge loses roughly 9% to fees'],
        ['Effect on large payments', 'The fixed part becomes negligible'],
        ['Reverse calculation', 'Charge = (target + fixed) ÷ (1 − rate)'],
        ['Why adding the % fails', 'Raising the price raises the fee too'],
        ['Not included', 'Currency conversion, chargebacks, payout fees']
      ]
    },
    steps: [
      'Enter the amount.',
      'Check the <strong>fee percentage and fixed fee</strong> against your actual account — rates differ by country, card type and plan.',
      'Choose whether you want the fee on a given charge, or the charge needed to net a given amount.'
    ],
    tip: 'The fixed fee is what makes micro-transactions uneconomic. At 2.9% + 0.30, a £2 sale loses 18% and a £200 sale loses 3.1%. If you sell low-value items, bundling them or setting a minimum order is usually more effective than negotiating the percentage.',
    faqs: [
      { q: 'Why can I not just add 2.9% to cover the fee?', a: 'Because the fee is charged on the higher amount you now have. Adding 2.9% to 100 gives 102.90, and the fee on that is more than the 2.90 you added — so you still come up short. The reverse mode solves it properly.' },
      { q: 'Are the default rates correct for me?', a: 'They are a common published starting point, not your rate. Actual pricing varies by country, card type, international cards and negotiated volume terms. Take the numbers from your own dashboard.' },
      { q: 'Should I pass fees on to customers?', a: 'It is legal in many places and restricted in some, particularly for card surcharges. Beyond legality it is a pricing decision — most businesses build fees into the headline price rather than adding them visibly at checkout.' },
      { q: 'What is not included here?', a: 'Currency conversion margins, chargeback fees, payout or instant-transfer fees, and any subscription cost of the plan. On international sales the conversion margin often exceeds the transaction fee itself.' }
    ],
    related: ['paypal-fee-calculator', 'profit-margin', 'break-even', 'etsy-fee-calculator', 'discount-calculator', 'currency-converter']
  }
};

module.exports.LIMITS = LIMITS;
