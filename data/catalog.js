/* Vootkit catalog — single source of truth for tools + categories.
 * Drives search, category pages, tool pages, sitemap and internal links.
 * Works in the browser (window.VK) and in Node (module.exports) so the
 * static-page generator and the runtime share exactly one dataset.
 *
 * processing: "local"   — runs entirely on device (the default and the moat)
 *             "network" — calls an external API; MUST be labelled honestly
 * status:     "live"    — implemented
 *             "planned" — roadmap only; never rendered as usable
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.VK = api;
})(typeof window !== "undefined" ? window : globalThis, function () {

  var CATEGORIES = [
    { slug: "pdf",           name: "PDF",              icon: "file",     blurb: "Merge, split, convert and clean up PDFs — locally, so contracts and statements never leave your device." },
    { slug: "images",        name: "Images",           icon: "image",    blurb: "Resize, compress and convert images in the browser. Your photos are never uploaded." },
    { slug: "video",         name: "Video & Streaming",icon: "video",    blurb: "Clip, shrink and reframe video on your own machine — no upload, no queue. Built for streamers and clippers." },
    { slug: "finance",       name: "Finance & Loans",  icon: "coins",    blurb: "Loan, savings, debt and investment calculators. Nothing you type is stored or sent anywhere." },
    { slug: "insurance",     name: "Insurance",        icon: "shield",   blurb: "Estimate the cover you need before you talk to anyone. Private by default." },
    { slug: "realestate",    name: "Real Estate",      icon: "home",     blurb: "Rent vs buy, yields, closing costs and property returns — run the numbers before you commit." },
    { slug: "tax",           name: "Tax, Payroll & HR",icon: "receipt",  blurb: "Estimate take-home pay, tax, overtime and the true cost of hiring." },
    { slug: "business",      name: "Freelance & Business", icon: "briefcase", blurb: "Invoices, quotes, rates and margins for people who bill for their time." },
    { slug: "seo",           name: "SEO & Marketing",  icon: "search",   blurb: "Meta tags, snippets, schema and robots files — generated and previewed instantly." },
    { slug: "accessibility", name: "Accessibility",    icon: "eye",      blurb: "Contrast, colour-blindness, headings and captions. Ship interfaces everyone can use." },
    { slug: "privacy",       name: "Privacy",          icon: "lock",     blurb: "Strip metadata, redact documents and clean tracking parameters — on your device." },
    { slug: "text",          name: "Text & Writing",   icon: "type",     blurb: "Count, convert, compare and clean up text. Instant and offline." },
    { slug: "design",        name: "Design",           icon: "palette",  blurb: "Colour, contrast, gradients and CSS helpers with live preview." },
    { slug: "developer",     name: "Developer",        icon: "code",     blurb: "Format, validate, encode and generate. Your code and tokens never hit a server." },
    { slug: "everyday",      name: "Everyday",         icon: "clock",    blurb: "Timers, converters, dates and the small things you need most days." },
    { slug: "data",          name: "Data",             icon: "table",    blurb: "Open, sort and chart CSV files without a spreadsheet app." },
    { slug: "ai",            name: "AI (on-device)",   icon: "sparkles", blurb: "Background removal, OCR and transcription. The model downloads once, then runs on your machine." }
  ];

  /* t(id, cat, name, desc, opts) */
  function t(id, cat, name, desc, o) {
    o = o || {};
    return {
      id: id, cat: cat, name: name, desc: desc,
      kw: o.kw || "",
      processing: o.processing || "local",
      status: o.status || "planned",
      tier: o.tier || null            // money | traffic | retention | gap | edge
    };
  }

  var TOOLS = [
    /* ---------- MONEY: finance (CPC $22.10) ---------- */
    t("mortgage-calculator","finance","Mortgage Calculator","Monthly payment, total interest and full amortisation schedule.",{tier:"money",status:"live",kw:"home loan repayment amortization"}),
    t("loan-calculator","finance","Loan Calculator","Payment, interest and payoff for any personal or business loan.",{tier:"money",status:"live",kw:"personal loan repayment"}),
    t("auto-loan-calculator","finance","Auto Loan Calculator","Car payment, total cost and interest by term and rate.",{tier:"money",status:"live",kw:"car finance payment vehicle"}),
    t("refinance-calculator","finance","Refinance Break-Even","See how many months until refinancing pays for itself.",{tier:"money",status:"live",kw:"remortgage break even"}),
    t("credit-card-payoff","finance","Credit Card Payoff","How long to clear a balance, and what extra payments save.",{tier:"money",status:"live",kw:"debt snowball avalanche interest"}),
    t("compound-interest","finance","Compound Interest","Grow savings with regular contributions over time.",{tier:"money",status:"live",kw:"savings growth investment"}),
    t("savings-goal","finance","Savings Goal Planner","How much to set aside each month to hit a target.",{tier:"money",status:"live",kw:"save monthly target"}),
    t("retirement-calculator","finance","Retirement Projection","Project a pension or 401k pot at your chosen retirement age.",{tier:"money",status:"live",kw:"401k pension nest egg"}),
    t("crypto-profit","finance","Crypto Profit & DCA","Profit, loss and dollar-cost-average entry across buys.",{tier:"money",status:"live",kw:"bitcoin average cost gain"}),
    t("currency-converter","finance","Currency Converter","Live exchange rates from European Central Bank data.",{tier:"money",processing:"network",kw:"fx exchange rate"}),
    t("percentage-calculator","finance","Percentage Calculator","Percent of, is-what-percent, and percentage change.",{tier:"retention",status:"live",kw:"percent increase decrease"}),
    t("tip-split","finance","Tip & Bill Split","Split a bill with tip across any number of people.",{tier:"retention",status:"live",kw:"restaurant gratuity"}),

    /* ---------- MONEY: insurance (CPC $31.40 — highest on the internet) ---------- */
    t("life-insurance-needs","insurance","Life Cover Estimator","Estimate the life cover a household would actually need.",{tier:"money",status:"live",kw:"life insurance how much coverage"}),
    t("auto-insurance-estimator","insurance","Auto Cover Estimator","Work out sensible liability and deductible levels.",{tier:"money",status:"live",kw:"car insurance coverage deductible"}),
    t("deductible-calculator","insurance","Deductible Trade-off","Compare premium savings against out-of-pocket risk.",{tier:"money",status:"live",kw:"excess premium"}),
    t("income-protection","insurance","Income Protection Estimator","How much monthly benefit would cover your commitments.",{tier:"money",status:"live",kw:"disability cover"}),

    /* ---------- MONEY: real estate (CPC $14.20, pure arithmetic) ---------- */
    t("rent-vs-buy","realestate","Rent vs Buy","Compare renting against buying over your real time horizon.",{tier:"money",status:"live",kw:"should i buy a house"}),
    t("cap-rate","realestate","Cap Rate Calculator","Capitalisation rate from income and property value.",{tier:"money",status:"live",kw:"rental yield investment property"}),
    t("cash-on-cash","realestate","Cash-on-Cash Return","Annual return on the actual cash you put in.",{tier:"money",status:"live",kw:"coc property return"}),
    t("closing-costs","realestate","Closing Costs Estimator","Estimate the fees on top of the purchase price.",{tier:"money",status:"live",kw:"stamp duty fees completion"}),
    t("home-affordability","realestate","Home Affordability","What price you can support on your income and deposit.",{tier:"money",status:"live",kw:"how much house can i afford"}),
    t("rental-yield","realestate","Rental Yield","Gross and net yield on a rental property.",{tier:"money",status:"live",kw:"buy to let return"}),
    t("mortgage-payoff","realestate","Mortgage Payoff","How much time and interest extra payments save.",{tier:"money",status:"live",kw:"overpayment early repayment"}),

    /* ---------- MONEY: tax / payroll / HR ---------- */
    t("paycheck-calculator","tax","Take-Home Pay","Estimate net pay from gross salary.",{tier:"money",status:"live",kw:"net salary after tax paycheck"}),
    t("income-tax-estimator","tax","Income Tax Estimator","Rough tax due or refund on a year's income.",{tier:"money",status:"live",kw:"tax refund return"}),
    t("self-employment-tax","tax","Self-Employment Tax","Estimate tax and national insurance for the self-employed.",{tier:"money",status:"live",kw:"freelance tax sole trader"}),
    t("overtime-calculator","tax","Overtime Pay","Overtime and premium hours at any multiplier.",{tier:"money",status:"live",kw:"time and a half"}),
    t("pto-accrual","tax","PTO Accrual","Holiday accrued to date from your entitlement.",{tier:"money",status:"live",kw:"annual leave vacation days"}),
    t("employee-cost","tax","True Employee Cost","Salary plus benefits, taxes, equipment and overhead.",{tier:"money",status:"live",kw:"cost of hiring burden rate"}),
    t("salary-converter","tax","Salary Converter","Hourly, weekly, monthly and annual, both ways.",{tier:"retention",kw:"wage per hour annual"}),

    /* ---------- MONEY: freelance & business ---------- */
    t("invoice-generator","business","Invoice Generator","Build a clean invoice with line items and export a PDF.",{tier:"money",kw:"bill client pdf"}),
    t("quote-generator","business","Quote & Estimate","Send a professional estimate before the work starts.",{tier:"money",kw:"proposal estimate client"}),
    t("hourly-rate","business","Hourly Rate Calculator","The rate you must charge to hit your income target.",{tier:"money",status:"live",kw:"freelance day rate pricing"}),
    t("profit-margin","business","Profit Margin","Margin, markup and selling price from cost.",{tier:"money",status:"live",kw:"markup gross margin"}),
    t("break-even","business","Break-Even Point","Units and revenue needed to cover fixed costs.",{tier:"money",status:"live",kw:"fixed variable cost"}),
    t("late-fee","business","Late Fee Calculator","Interest and fees on an overdue invoice.",{tier:"money",status:"live",kw:"overdue payment interest"}),
    t("vat-gst","business","VAT / GST Calculator","Add or remove sales tax from any price.",{tier:"traffic",status:"live",kw:"sales tax inclusive"}),

    /* ---------- TRAFFIC: PDF ---------- */
    t("merge-pdf","pdf","Merge PDFs","Combine several PDFs into one, in the order you choose.",{tier:"traffic",status:"live",kw:"join combine documents"}),
    t("split-pdf","pdf","Split PDF","Pull a page range out into a new document.",{tier:"traffic",status:"live",kw:"extract pages separate"}),
    t("compress-pdf","pdf","Compress PDF","Shrink a PDF below an upload or email limit.",{tier:"traffic",kw:"reduce file size smaller"}),
    t("rotate-pdf","pdf","Rotate PDF","Rotate every page 90, 180 or 270 degrees.",{tier:"traffic",status:"live",kw:"sideways scan orientation"}),
    t("delete-pdf-pages","pdf","Delete PDF Pages","Remove pages you don't need and re-save.",{tier:"traffic",status:"live",kw:"remove page"}),
    t("reorder-pdf","pdf","Organise PDF Pages","Drag pages into a new order.",{tier:"traffic",status:"live",kw:"rearrange sort pages"}),
    t("pdf-to-jpg","pdf","PDF to JPG","Render every page to a downloadable image.",{tier:"traffic",status:"planned",kw:"pdf to image png export"}),
    t("jpg-to-pdf","pdf","Images to PDF","Turn photos or scans into a single PDF.",{tier:"traffic",status:"live",kw:"picture to pdf scan"}),
    t("pdf-to-text","pdf","PDF Text Extractor","Pull selectable text out of a PDF.",{tier:"traffic",status:"planned",kw:"copy text from pdf"}),
    t("pdf-page-numbers","pdf","Add Page Numbers","Stamp page numbers in any corner.",{tier:"traffic",status:"live",kw:"numbering footer"}),
    t("pdf-watermark","pdf","PDF Watermark","Stamp text across pages to mark a draft or copy.",{tier:"traffic",status:"live",kw:"draft confidential stamp"}),
    t("protect-pdf","pdf","Protect PDF","Add a password to a document before sharing it.",{tier:"traffic",status:"live",kw:"encrypt password lock"}),
    t("pdf-redact","pdf","Redact PDF","Black out sensitive text before you send a file.",{tier:"edge",kw:"black out censor private"}),
    t("compare-pdf","pdf","Compare PDFs","Spot what changed between two versions.",{tier:"traffic",kw:"diff versions changes"}),

    /* ---------- TRAFFIC: images ---------- */
    t("compress-image","images","Image Compressor","Shrink JPG, PNG or WebP with a quality slider.",{tier:"traffic",status:"live",kw:"reduce photo size smaller"}),
    t("resize-image","images","Image Resizer","Resize to exact pixels or a percentage.",{tier:"traffic",status:"live",kw:"scale dimensions"}),
    t("convert-image","images","Image Converter","Convert between PNG, JPG and WebP.",{tier:"traffic",status:"live",kw:"format change"}),
    t("heic-converter","images","HEIC Converter","Turn iPhone HEIC photos into JPG or PNG.",{tier:"traffic",status:"live",kw:"iphone photo heif"}),
    t("crop-image","images","Crop Image","Crop to a ratio or exact selection.",{tier:"traffic",status:"live",kw:"cut trim"}),
    t("bulk-resize","images","Bulk Image Resizer","Resize a batch of images in one pass.",{tier:"traffic",status:"live",kw:"multiple batch"}),
    t("favicon-generator","images","Favicon Generator","Every favicon size and the HTML to go with it.",{tier:"gap",status:"live",kw:"ico site icon"}),
    t("image-watermark","images","Image Watermark","Stamp text across a photo to protect it.",{tier:"traffic",status:"live",kw:"copyright protect"}),
    t("exif-viewer","images","EXIF Viewer & Stripper","See photo metadata and download a clean copy.",{tier:"edge",status:"live",kw:"metadata location remove"}),
    t("color-from-image","images","Image Palette Extractor","Pull the dominant colours out of any image.",{tier:"traffic",status:"live",kw:"dominant swatch"}),
    t("meme-generator","images","Meme Generator","Classic top and bottom captions on any image.",{tier:"retention",status:"live",kw:"caption impact text"}),

    /* ---------- RETENTION: video & streaming ---------- */
    t("compress-for-discord","video","Compress for Discord","One-click 10 MB, 50 MB and 500 MB presets that actually fit.",{tier:"retention",kw:"discord upload limit too big clip"}),
    t("trim-video","video","Video Trimmer","Cut the segment you want and save it.",{tier:"retention",status:"live",kw:"clip cut shorten"}),
    t("bitrate-calculator","video","Streaming Bitrate Calculator","Best bitrate for your upload speed, resolution and platform.",{tier:"retention",kw:"obs twitch youtube kick stream settings"}),
    t("vertical-reframe","video","Vertical Reframe 9:16","Reframe a clip for Shorts, TikTok and Reels.",{tier:"retention",kw:"portrait tiktok shorts crop"}),
    t("video-to-gif","video","Video to GIF","Turn a short clip into a shareable GIF.",{tier:"retention",kw:"animated gif convert"}),
    t("frame-grabber","video","Frame Grabber","Pull a still frame out for a thumbnail.",{tier:"retention",kw:"screenshot thumbnail still"}),
    t("mute-video","video","Mute / Strip Audio","Remove the audio track to avoid copyright strikes.",{tier:"retention",kw:"remove sound silent"}),
    t("extract-audio","video","Extract Audio","Save the audio from a video as MP3 or WAV.",{tier:"retention",kw:"rip sound mp3"}),
    t("stream-asset-sizer","video","Stream Asset Sizer","Correct sizes for Twitch and YouTube banners, avatars and panels.",{tier:"retention",kw:"twitch banner youtube thumbnail dimensions"}),
    t("emote-resizer","video","Emote & Sticker Resizer","Resize to Discord and Twitch emote limits.",{tier:"retention",kw:"discord 128 twitch emote"}),
    t("brb-overlay","video","BRB & Countdown Overlay","A styled page to drop into OBS as a browser source.",{tier:"retention",kw:"obs browser source stream starting soon"}),
    t("upload-time","video","Upload Time Estimator","How long a file will take on your connection.",{tier:"retention",kw:"how long to upload"}),

    /* ---------- GAP: SEO & marketing ---------- */
    t("meta-tag-generator","seo","Meta Tag Generator","Title, description and Open Graph tags, ready to paste.",{tier:"gap",kw:"og tags head html"}),
    t("serp-preview","seo","SERP Snippet Preview","See how your page looks in Google before publishing.",{tier:"gap",kw:"google result title truncate"}),
    t("og-preview","seo","Social Share Preview","Preview how a link unfurls on social platforms.",{tier:"gap",kw:"open graph twitter card"}),
    t("robots-generator","seo","robots.txt Generator","Build a valid robots.txt with the rules you need.",{tier:"gap",kw:"crawl disallow"}),
    t("sitemap-generator","seo","Sitemap Generator","Turn a URL list into a valid XML sitemap.",{tier:"gap",kw:"xml urls index"}),
    t("schema-generator","seo","Schema Markup Generator","JSON-LD for FAQ, article, product and breadcrumbs.",{tier:"gap",kw:"structured data json-ld rich result"}),
    t("keyword-density","seo","Keyword Density","Term frequency and stuffing check for a page.",{tier:"gap",kw:"frequency count on page"}),
    t("slug-generator","seo","URL Slug Generator","Clean, readable slugs from any title.",{tier:"gap",kw:"permalink url safe"}),
    t("utm-builder","seo","UTM Link Builder","Build tagged campaign URLs consistently.",{tier:"gap",kw:"campaign tracking analytics"}),

    /* ---------- EDGE: accessibility ---------- */
    t("contrast-checker","accessibility","Contrast Checker","Check text against WCAG AA and AAA.",{tier:"edge",status:"live",kw:"wcag ratio legible"}),
    t("accessible-palette","accessibility","Accessible Palette","Build a palette that passes contrast at every pairing.",{tier:"edge",kw:"wcag colors combination"}),
    t("color-blind-simulator","accessibility","Colour-Blindness Simulator","See a design as different types of colour vision do.",{tier:"edge",kw:"deuteranopia protanopia simulate"}),
    t("heading-checker","accessibility","Heading Structure Checker","Find skipped levels and broken document outlines.",{tier:"edge",kw:"h1 h2 outline semantic"}),
    t("alt-text-auditor","accessibility","Alt Text Auditor","Find missing or unhelpful image alt text.",{tier:"edge",kw:"image description screen reader"}),
    t("tap-target-checker","accessibility","Tap Target Checker","Flag controls smaller than the 44px minimum.",{tier:"edge",kw:"touch size mobile wcag"}),
    t("caption-validator","accessibility","Caption / SRT Validator","Check subtitle timing and formatting.",{tier:"edge",kw:"srt vtt subtitles timing"}),

    /* ---------- EDGE: privacy ---------- */
    t("metadata-remover","privacy","Metadata Remover","Strip hidden data from images and documents.",{tier:"edge",kw:"exif scrub clean anonymise"}),
    t("url-cleaner","privacy","URL Tracker Cleaner","Remove utm_, fbclid and other tracking parameters.",{tier:"edge",kw:"clean link share utm fbclid"}),
    t("screenshot-redactor","privacy","Screenshot Redactor","Black out private details before sharing a screenshot.",{tier:"edge",kw:"blur censor hide"}),
    t("password-generator","privacy","Password Generator","Strong random passwords, generated on your device.",{tier:"retention",status:"live",kw:"passphrase secure random"}),
    t("password-strength","privacy","Password Strength Checker","How strong a password is — checked locally.",{tier:"retention",status:"live",kw:"secure weak entropy"}),
    t("text-encrypt","privacy","Text Encrypt / Decrypt","AES-encrypt a message with a password.",{tier:"edge",status:"live",kw:"aes cipher secret"}),
    t("file-checksum","privacy","File Checksum","Verify a download with its SHA-256 hash.",{tier:"edge",status:"live",kw:"sha256 verify integrity"}),

    /* ---------- RETENTION: everyday ---------- */
    t("word-counter","text","Word & Character Counter","Live counts, sentences and reading time.",{tier:"retention",status:"live",kw:"how many words essay limit"}),
    t("case-converter","text","Case Converter","Upper, lower, title, sentence, camel and kebab.",{tier:"retention",status:"live",kw:"capitalize title case"}),
    t("text-diff","text","Text Diff","Compare two texts line by line.",{tier:"retention",status:"live",kw:"compare changes difference"}),
    t("readability","text","Readability Score","Flesch reading ease and grade level.",{tier:"retention",status:"live",kw:"grade level easy to read"}),
    t("line-tools","text","Line Tools","Sort, reverse, dedupe and shuffle lines.",{tier:"retention",status:"live",kw:"remove duplicates sort"}),
    t("lorem-ipsum","text","Lorem Ipsum Generator","Placeholder text by paragraph or word count.",{tier:"retention",status:"live",kw:"dummy filler placeholder"}),
    t("markdown-editor","text","Markdown Editor","Write Markdown with live preview and HTML export.",{tier:"retention",status:"live",kw:"md preview readme"}),
    t("unit-converter","everyday","Unit Converter","Length, mass, temperature, area, volume, speed and data.",{tier:"retention",status:"live",kw:"metric imperial convert"}),
    t("age-calculator","everyday","Age & Date Difference","Exact age, or the gap between two dates.",{tier:"retention",status:"live",kw:"how old days between"}),
    t("countdown","everyday","Event Countdown","Count down to any date and time.",{tier:"retention",status:"live",kw:"days until timer event"}),
    t("pomodoro","everyday","Pomodoro & Countdown","A focus timer that chimes when it's done.",{tier:"retention",status:"live",kw:"focus study timer"}),
    t("stopwatch","everyday","Stopwatch","Precise stopwatch with lap times.",{tier:"retention",status:"live",kw:"lap timer"}),
    t("timezone-converter","everyday","Time Zone Converter","Compare a time across cities worldwide.",{tier:"retention",status:"live",kw:"meeting across countries utc"}),
    t("qr-generator","everyday","QR Code Generator","Turn any link or text into a downloadable QR code.",{tier:"retention",status:"live",kw:"qr link scan"}),
    t("qr-scanner","everyday","QR Code Scanner","Scan a QR code with your camera or from an image.",{tier:"retention",status:"live",kw:"read decode qr"}),
    t("barcode-generator","everyday","Barcode Generator","CODE128 and EAN barcodes, ready to download.",{tier:"retention",status:"live",kw:"ean upc code128"}),
    t("random-picker","everyday","Random Picker","Pick a winner fairly from a list.",{tier:"retention",status:"live",kw:"raffle giveaway choose"}),
    t("typing-test","everyday","Typing Speed Test","Words per minute and accuracy.",{tier:"retention",kw:"wpm keyboard speed"}),

    /* ---------- design / developer / data / ai (kept, frozen) ---------- */
    t("color-converter","design","Colour Converter","HEX, RGB and HSL with a live swatch.",{tier:"retention",status:"live",kw:"hex rgb hsl"}),
    t("gradient-generator","design","CSS Gradient Generator","Blend colours into copy-ready CSS.",{tier:"retention",status:"live",kw:"linear background css"}),
    t("palette-generator","design","Colour Palette Generator","Harmonious five-colour palettes instantly.",{tier:"retention",status:"live",kw:"scheme brand colors"}),
    t("shadow-generator","design","Box-Shadow Generator","Dial in a CSS shadow with live preview.",{tier:"retention",status:"live",kw:"css shadow depth"}),
    t("json-formatter","developer","JSON Formatter","Pretty-print, minify and validate JSON.",{tier:"retention",status:"live",kw:"beautify validate parse"}),
    t("base64","developer","Base64 Encode / Decode","Convert text to and from Base64.",{tier:"retention",status:"live",kw:"encode decode"}),
    t("jwt-decoder","developer","JWT Decoder","Inspect the header and payload of a token.",{tier:"retention",status:"live",kw:"token claims debug"}),
    t("uuid-generator","developer","UUID Generator","Random v4 UUIDs, as many as you need.",{tier:"retention",status:"live",kw:"guid unique id"}),
    t("hash-generator","developer","Hash Generator","SHA-256, SHA-1 and SHA-512 of any text.",{tier:"retention",status:"live",kw:"sha md5 digest"}),
    t("regex-tester","developer","Regex Tester","Test a pattern against text and count matches.",{tier:"retention",status:"live",kw:"regular expression match"}),
    t("url-encoder","developer","URL Encode / Decode","Percent-encode URLs and query values.",{tier:"retention",status:"live",kw:"escape querystring"}),
    t("timestamp-converter","developer","Timestamp Converter","Unix time to human dates and back.",{tier:"retention",status:"live",kw:"epoch unix date"}),
    t("csv-viewer","data","CSV Viewer & Sorter","Open a CSV as a sortable, filterable table.",{tier:"traffic",status:"live",kw:"spreadsheet open sort"}),
    t("csv-to-chart","data","CSV to Chart","Turn two columns into a bar or line chart.",{tier:"traffic",status:"live",kw:"graph visualise plot"}),
    t("json-csv","data","JSON ↔ CSV","Convert a JSON array to CSV and back.",{tier:"traffic",status:"live",kw:"convert tabular"}),
    t("remove-background","ai","Background Remover","Cut out a background — private, in-browser AI.",{tier:"traffic",status:"live",kw:"transparent cutout png subject"}),
    t("image-to-text","ai","Image to Text (OCR)","Extract text from photos, screenshots and scans.",{tier:"traffic",status:"live",kw:"ocr scan read text"}),
    t("transcribe-audio","ai","Audio to Text","Transcribe speech with on-device Whisper.",{tier:"traffic",status:"live",kw:"transcription subtitles speech"})
  ];

  /* ---------- helpers ---------- */
  function byCategory(slug) { return TOOLS.filter(function (x) { return x.cat === slug; }); }
  function category(slug) { return CATEGORIES.filter(function (c) { return c.slug === slug; })[0]; }
  function live() { return TOOLS.filter(function (x) { return x.status === "live"; }); }
  function find(id) { return TOOLS.filter(function (x) { return x.id === id; })[0]; }

  function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim(); }
  function search(q, limit) {
    var n = norm(q);
    if (!n) return [];
    var terms = n.split(" ");
    return TOOLS.map(function (x) {
      var name = norm(x.name), hay = norm(x.name + " " + x.desc + " " + x.kw + " " + (category(x.cat) || {}).name);
      if (!terms.every(function (tm) { return hay.indexOf(tm) > -1; })) return null;
      var score = 0;
      if (name === n) score += 100;
      if (name.indexOf(n) === 0) score += 50;
      if (name.indexOf(n) > -1) score += 25;
      if (x.status === "live") score += 10;   // usable beats planned
      return { tool: x, score: score };
    }).filter(Boolean)
      .sort(function (a, b) { return b.score - a.score || a.tool.name.localeCompare(b.tool.name); })
      .slice(0, limit || 20)
      .map(function (r) { return r.tool; });
  }

  return {
    CATEGORIES: CATEGORIES, TOOLS: TOOLS,
    byCategory: byCategory, category: category, live: live, find: find, search: search,
    counts: { total: TOOLS.length, live: TOOLS.filter(function (x) { return x.status === "live"; }).length }
  };
});
