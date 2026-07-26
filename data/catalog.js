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
    { slug: "health",        name: "Health & Fitness", icon: "heart",    blurb: "Calorie, macro, body and hydration calculators — run the numbers privately, nothing is stored." },
    { slug: "travel",        name: "Travel",           icon: "plane",    blurb: "Fuel, tipping, trip-splitting and distance tools for planning a trip — all offline." },
    { slug: "audio",         name: "Audio & Voice",    icon: "mic",      blurb: "Convert, trim, record and transcribe audio — processed in your browser." },
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
    t("currency-converter","finance","Currency Converter","Live exchange rates from European Central Bank data.",{tier:"money",status:"live",processing:"network",kw:"fx exchange rate"}),
    t("percentage-calculator","finance","Percentage Calculator","Percent of, is-what-percent, and percentage change.",{tier:"retention",status:"live",kw:"percent increase decrease"}),
    t("tip-split","finance","Tip & Bill Split","Split a bill with tip across any number of people.",{tier:"retention",status:"live",kw:"restaurant gratuity"}),
    t("discount-calculator","finance","Discount Calculator","Final sale price and total savings, with stacked coupons and tax.",{tier:"retention",status:"live",kw:"percent off sale price coupon savings deal"}),
    t("simple-interest","finance","Simple Interest Calculator","Interest and total value from principal, rate and time.",{tier:"money",status:"live",kw:"simple interest principal rate time"}),
    t("investment-calculator","finance","Investment Growth Calculator","Project an investment with monthly contributions and returns.",{tier:"money",status:"live",kw:"investment return future value contributions portfolio"}),
    t("budget-calculator","finance","50/30/20 Budget Calculator","Split take-home pay into needs, wants and savings.",{tier:"money",status:"live",kw:"budget 50 30 20 needs wants savings monthly"}),

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
    t("salary-converter","tax","Salary Converter","Hourly, weekly, monthly and annual, both ways.",{tier:"retention",status:"live",kw:"wage per hour annual"}),

    /* ---------- MONEY: freelance & business ---------- */
    t("invoice-generator","business","Invoice Generator","Build a clean invoice with line items and export a PDF.",{tier:"money",status:"live",kw:"bill client pdf"}),
    t("quote-generator","business","Quote & Estimate","Send a professional estimate before the work starts.",{tier:"money",status:"live",kw:"proposal estimate client"}),
    t("receipt-generator","business","Receipt Generator","Create a paid receipt with line items and totals.",{tier:"money",status:"live",kw:"receipt paid payment proof invoice"}),
    t("proposal-generator","business","Proposal Generator","Write a clean project proposal from a template.",{tier:"money",status:"live",kw:"proposal project client template scope pricing"}),
    t("contract-generator","business","Contract Generator","Draft a simple services agreement from a template.",{tier:"money",status:"live",kw:"contract agreement services template freelance"}),
    t("resume-builder","business","Resume / CV Builder","Build a clean, printable resume in your browser.",{tier:"money",status:"live",kw:"resume cv builder printable job application"}),
    t("swot-generator","business","SWOT Analysis Maker","Fill in a strengths, weaknesses, opportunities and threats grid.",{tier:"money",status:"live",kw:"swot analysis strengths weaknesses strategy template"}),
    t("landing-page-generator","business","Landing Page Generator","Generate a simple hero + features landing page you can host.",{tier:"money",status:"live",kw:"landing page html generator hero features cta template"}),
    t("business-name-generator","business","Business Name Generator","Brainstorm brand names from a keyword — no AI, no tracking.",{tier:"money",status:"live",kw:"business name brand startup generator ideas naming"}),
    t("inventory-tracker","business","Inventory Tracker","Track stock, cost and retail value — saved in your browser.",{tier:"money",status:"live",kw:"inventory stock tracker small business value profit"}),
    t("business-card-maker","business","Business Card Maker","Design a printable business card and download it.",{tier:"money",status:"live",kw:"business card maker design print 3.5x2 png"}),
    t("qr-business-card","business","QR Business Card (vCard)","Make a scannable QR that adds your contact to a phone.",{tier:"money",status:"live",kw:"vcard qr contact card digital business card scan"}),
    t("payroll-calculator","tax","Payroll Calculator","Net pay, deductions and the employer's total cost.",{tier:"money",status:"live",kw:"payroll net pay deductions employer cost gross"}),
    t("hourly-wage","tax","Hourly Wage Calculator","Turn an hourly rate into weekly, monthly and annual pay.",{tier:"money",status:"live",kw:"hourly wage to salary annual weekly pay rate"}),
    t("hourly-rate","business","Hourly Rate Calculator","The rate you must charge to hit your income target.",{tier:"money",status:"live",kw:"freelance day rate pricing"}),
    t("amazon-fba-calculator","business","Amazon FBA Profit Calculator","Net profit, margin and ROI per unit after Amazon and FBA fees.",{tier:"money",status:"live",kw:"amazon seller fba fees profit roi margin"}),
    t("etsy-fee-calculator","business","Etsy Fee & Profit Calculator","See your payout after Etsy listing, transaction and payment fees.",{tier:"money",status:"live",kw:"etsy seller fees payout profit"}),
    t("stripe-fee-calculator","business","Stripe Fee Calculator","Fee and net received, or what to charge to net an exact amount.",{tier:"money",status:"live",kw:"stripe payment processing fee net gross"}),
    t("paypal-fee-calculator","business","PayPal Fee Calculator","Work out PayPal fees and your net, or gross-up a charge.",{tier:"money",status:"live",kw:"paypal fee net received goods services"}),
    t("roas-calculator","business","ROAS Calculator","Return on ad spend, ROI and the break-even ROAS for your margin.",{tier:"money",status:"live",kw:"return on ad spend roi break even ppc facebook"}),
    t("cac-ltv-calculator","business","CAC & LTV Calculator","Customer acquisition cost, lifetime value and the LTV:CAC ratio.",{tier:"money",status:"live",kw:"customer acquisition cost lifetime value ltv cac payback"}),
    t("profit-margin","business","Profit Margin","Margin, markup and selling price from cost.",{tier:"money",status:"live",kw:"markup gross margin"}),
    t("break-even","business","Break-Even Point","Units and revenue needed to cover fixed costs.",{tier:"money",status:"live",kw:"fixed variable cost"}),
    t("late-fee","business","Late Fee Calculator","Interest and fees on an overdue invoice.",{tier:"money",status:"live",kw:"overdue payment interest"}),
    t("vat-gst","business","VAT / GST Calculator","Add or remove sales tax from any price.",{tier:"traffic",status:"live",kw:"sales tax inclusive"}),

    /* ---------- TRAFFIC: PDF ---------- */
    t("merge-pdf","pdf","Merge PDFs","Combine several PDFs into one, in the order you choose.",{tier:"traffic",status:"live",kw:"join combine documents"}),
    t("split-pdf","pdf","Split PDF","Pull a page range out into a new document.",{tier:"traffic",status:"live",kw:"extract pages separate"}),
    t("compress-pdf","pdf","Compress PDF","Shrink a PDF below an upload or email limit.",{tier:"traffic",status:"live",kw:"reduce file size smaller"}),
    t("rotate-pdf","pdf","Rotate PDF","Rotate every page 90, 180 or 270 degrees.",{tier:"traffic",status:"live",kw:"sideways scan orientation"}),
    t("delete-pdf-pages","pdf","Delete PDF Pages","Remove pages you don't need and re-save.",{tier:"traffic",status:"live",kw:"remove page"}),
    t("reorder-pdf","pdf","Organise PDF Pages","Drag pages into a new order.",{tier:"traffic",status:"live",kw:"rearrange sort pages"}),
    t("pdf-to-jpg","pdf","PDF to JPG","Render every page to a downloadable image.",{tier:"traffic",status:"live",kw:"pdf to image png export"}),
    t("jpg-to-pdf","pdf","Images to PDF","Turn photos or scans into a single PDF.",{tier:"traffic",status:"live",kw:"picture to pdf scan"}),
    t("pdf-to-text","pdf","PDF Text Extractor","Pull selectable text out of a PDF.",{tier:"traffic",status:"live",kw:"copy text from pdf"}),
    t("pdf-page-numbers","pdf","Add Page Numbers","Stamp page numbers in any corner.",{tier:"traffic",status:"live",kw:"numbering footer"}),
    t("pdf-watermark","pdf","PDF Watermark","Stamp text across pages to mark a draft or copy.",{tier:"traffic",status:"live",kw:"draft confidential stamp"}),
    t("protect-pdf","pdf","Protect PDF","Add a password to a document before sharing it.",{tier:"traffic",status:"live",kw:"encrypt password lock"}),
    t("pdf-redact","pdf","Redact PDF","Black out sensitive text before you send a file.",{tier:"edge",status:"live",kw:"black out censor private"}),
    t("compare-pdf","pdf","Compare PDFs","Spot what changed between two versions.",{tier:"traffic",status:"live",kw:"diff versions changes"}),
    t("text-to-pdf","pdf","Text to PDF","Turn plain text into a clean, paginated PDF.",{tier:"traffic",status:"live",kw:"txt text to pdf create document convert"}),
    t("markdown-to-pdf","pdf","Markdown to PDF","Convert Markdown headings, lists and text into a PDF.",{tier:"traffic",status:"live",kw:"md markdown to pdf export convert readme"}),
    t("crop-pdf","pdf","Crop PDF","Trim page margins across a whole PDF.",{tier:"traffic",status:"live",kw:"crop trim margins pdf pages whitespace"}),
    t("duplicate-pdf-pages","pdf","Duplicate PDF Pages","Repeat selected pages any number of times.",{tier:"traffic",status:"live",kw:"duplicate copy repeat pdf pages"}),
    t("png-to-pdf","pdf","PNG to PDF","Combine PNG images into a single PDF.",{tier:"traffic",status:"live",kw:"png images to pdf combine convert"}),
    t("webp-to-pdf","pdf","WebP to PDF","Combine WebP images into a single PDF.",{tier:"traffic",status:"live",kw:"webp images to pdf combine convert"}),
    t("pdf-to-png","pdf","PDF to PNG","Render each PDF page to a downloadable PNG image.",{tier:"traffic",status:"live",kw:"pdf to png image export rasterize pages"}),
    t("pdf-to-webp","pdf","PDF to WebP","Render each PDF page to a compact WebP image.",{tier:"traffic",status:"live",kw:"pdf to webp image export rasterize pages"}),
    t("pdf-creator","pdf","PDF Creator","Create a fresh blank PDF with a chosen size and page count.",{tier:"traffic",status:"live",kw:"create blank new pdf maker generator"}),
    t("extract-pdf-pages","pdf","Extract PDF Pages","Save selected pages as separate single-page PDFs.",{tier:"traffic",status:"live",kw:"extract pages separate individual split single"}),
    t("remove-pdf-password","pdf","Remove PDF Password","Strip owner/permission restrictions from a PDF.",{tier:"traffic",status:"live",kw:"unlock remove password restrictions permissions decrypt"}),
    t("pdf-repair","pdf","Repair PDF","Rebuild a PDF's structure to fix open and reference errors.",{tier:"traffic",status:"live",kw:"repair fix corrupt broken pdf wont open recover"}),
    t("scan-to-pdf","pdf","Scan to PDF","Snap pages with your camera and build a PDF.",{tier:"traffic",status:"live",kw:"scan camera photo document to pdf mobile"}),
    t("pdf-signature","pdf","Sign PDF","Draw a signature and stamp it onto a PDF page.",{tier:"traffic",status:"live",kw:"sign signature esign draw pdf stamp"}),
    t("pdf-form-filler","pdf","PDF Form Filler","Fill in AcroForm fields and download the completed PDF.",{tier:"traffic",status:"live",kw:"fill form fields acroform pdf complete"}),
    t("html-to-pdf","pdf","HTML to PDF","Render HTML with inline CSS into a PDF.",{tier:"traffic",status:"live",kw:"html css to pdf convert webpage render"}),
    t("word-to-pdf","pdf","Word to PDF","Convert a .docx document into a PDF in your browser.",{tier:"traffic",status:"live",kw:"word docx to pdf convert document"}),
    t("excel-to-pdf","pdf","Excel to PDF","Turn spreadsheet sheets into a paginated PDF.",{tier:"traffic",status:"live",kw:"excel xlsx csv to pdf convert spreadsheet table"}),
    t("pdf-ocr","pdf","PDF & Image OCR","Extract text from scanned PDFs and images with OCR.",{tier:"traffic",status:"live",kw:"ocr scan image pdf to text recognize tesseract"}),

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
    t("flip-image","images","Flip Image","Mirror an image horizontally or vertically.",{tier:"traffic",status:"live",kw:"mirror reflect horizontal vertical"}),
    t("rotate-image","images","Rotate Image","Rotate a photo 90°, 180° or 270° with no quality loss.",{tier:"traffic",status:"live",kw:"turn sideways orientation straighten"}),
    t("circle-crop","images","Round Profile Picture","Crop any photo into a round avatar with a transparent background.",{tier:"traffic",status:"live",kw:"circle avatar profile picture round dp"}),
    t("grayscale-image","images","Black & White / Sepia","Convert a photo to grayscale or a warm sepia tone.",{tier:"traffic",status:"live",kw:"grayscale monochrome bw sepia filter"}),
    t("png-to-jpg","images","PNG to JPG","Convert PNG to JPG, flattening transparency onto a matte.",{tier:"traffic",status:"live",kw:"png jpg jpeg convert transparent white background"}),
    t("jpg-to-png","images","JPG to PNG","Convert JPG to lossless PNG in the browser.",{tier:"traffic",status:"live",kw:"jpg jpeg png convert lossless"}),
    t("image-blur","images","Image Blur Tool","Blur a whole image by an adjustable amount.",{tier:"traffic",status:"live",kw:"blur photo soften gaussian"}),
    t("image-brightness","images","Brightness & Contrast","Adjust brightness, contrast and saturation of a photo.",{tier:"traffic",status:"live",kw:"brightness contrast saturation adjust photo exposure"}),
    t("round-corners","images","Rounded Corners","Round the corners of an image and keep them transparent.",{tier:"traffic",status:"live",kw:"round corners radius png transparent rounded rectangle"}),
    t("jpg-to-webp","images","JPG to WebP","Convert JPG to smaller, modern WebP.",{tier:"traffic",status:"live",kw:"jpg jpeg to webp convert smaller"}),
    t("png-to-webp","images","PNG to WebP","Convert PNG to WebP with transparency support.",{tier:"traffic",status:"live",kw:"png to webp convert smaller transparent"}),
    t("webp-to-png","images","WebP to PNG","Convert WebP to widely-supported PNG.",{tier:"traffic",status:"live",kw:"webp to png convert lossless"}),
    t("webp-to-jpg","images","WebP to JPG","Convert WebP to JPG, flattening transparency.",{tier:"traffic",status:"live",kw:"webp to jpg jpeg convert"}),
    t("svg-to-png","images","SVG to PNG","Rasterise an SVG vector into a PNG image.",{tier:"traffic",status:"live",kw:"svg to png rasterize vector convert"}),
    t("filter-studio","images","Photo Filter Studio","Apply one-click filters — B&W, sepia, vintage and more.",{tier:"traffic",status:"live",kw:"filters instagram vintage sepia bw effects photo"}),
    t("image-sharpen","images","Image Sharpener","Sharpen a soft or slightly blurry photo.",{tier:"traffic",status:"live",kw:"sharpen unsharp crisp detail enhance clarity"}),
    t("thumbnail-maker","images","Thumbnail Maker","Resize and crop to YouTube, blog and square thumbnail sizes.",{tier:"traffic",status:"live",kw:"thumbnail youtube blog og preview resize crop"}),
    t("social-media-image","images","Social Media Image Sizer","Crop images to Instagram, Facebook, X and LinkedIn sizes.",{tier:"traffic",status:"live",kw:"social media instagram facebook twitter linkedin size crop story post"}),
    t("passport-photo-maker","images","Passport Photo Maker","Crop a photo to US, UK/EU, Canada or Australia passport sizes.",{tier:"traffic",status:"live",kw:"passport photo id visa 2x2 35x45 size crop"}),
    t("collage-maker","images","Collage Maker","Combine several images into a clean grid collage.",{tier:"traffic",status:"live",kw:"collage grid combine photos montage"}),
    t("batch-compress","images","Batch Image Compressor","Compress many images at once to JPG or WebP.",{tier:"traffic",status:"live",kw:"batch bulk compress multiple images jpg webp reduce"}),
    t("image-to-text","images","Image to Text (OCR)","Extract text from a photo or screenshot with OCR.",{tier:"traffic",status:"live",kw:"image to text ocr photo screenshot extract recognize"}),

    /* ---------- RETENTION: video & streaming ---------- */
    t("compress-for-discord","video","Compress for Discord","One-click 10 MB, 50 MB and 500 MB presets that actually fit.",{tier:"retention",status:"live",kw:"discord upload limit too big clip"}),
    t("trim-video","video","Video Trimmer","Cut the segment you want and save it.",{tier:"retention",status:"live",kw:"clip cut shorten"}),
    t("bitrate-calculator","video","Streaming Bitrate Calculator","Best bitrate for your upload speed, resolution and platform.",{tier:"retention",status:"live",kw:"obs twitch youtube kick stream settings"}),
    t("vertical-reframe","video","Vertical Reframe 9:16","Reframe a clip for Shorts, TikTok and Reels.",{tier:"retention",status:"live",kw:"portrait tiktok shorts crop"}),
    t("video-to-gif","video","Video to GIF","Turn a short clip into a shareable GIF.",{tier:"retention",status:"live",kw:"animated gif convert"}),
    t("frame-grabber","video","Frame Grabber","Pull a still frame out for a thumbnail.",{tier:"retention",status:"live",kw:"screenshot thumbnail still"}),
    t("mute-video","video","Mute / Strip Audio","Remove the audio track to avoid copyright strikes.",{tier:"retention",status:"live",kw:"remove sound silent"}),
    t("extract-audio","video","Extract Audio","Save the audio from a video as MP3 or WAV.",{tier:"retention",status:"live",kw:"rip sound mp3"}),
    t("convert-video","video","Video Converter","Convert MOV, MKV, AVI, WebM and more to universal MP4.",{tier:"traffic",status:"live",kw:"mov mkv avi webm to mp4 convert format"}),
    t("resize-video","video","Video Resizer","Resize a video to 1080p, 720p, 480p or 360p, keeping aspect.",{tier:"traffic",status:"live",kw:"scale resolution downscale 720 1080"}),
    t("loop-video","video","Loop Video","Repeat a clip a set number of times into one file.",{tier:"retention",status:"live",kw:"repeat loop boomerang"}),
    t("adjust-volume","video","Video Volume Booster","Make a video louder or quieter without touching the picture.",{tier:"retention",status:"live",kw:"volume boost louder quieter audio gain"}),
    t("stream-asset-sizer","video","Stream Asset Sizer","Correct sizes for Twitch and YouTube banners, avatars and panels.",{tier:"retention",status:"live",kw:"twitch banner youtube thumbnail dimensions"}),
    t("emote-resizer","video","Emote & Sticker Resizer","Resize to Discord and Twitch emote limits.",{tier:"retention",status:"live",kw:"discord 128 twitch emote"}),
    t("brb-overlay","video","BRB & Countdown Overlay","A styled page to drop into OBS as a browser source.",{tier:"retention",status:"live",kw:"obs browser source stream starting soon"}),
    t("upload-time","video","Upload Time Estimator","How long a file will take on your connection.",{tier:"retention",status:"live",kw:"how long to upload"}),
    t("stream-overlay-creator","video","Stream Overlay Creator","Design a transparent webcam overlay for OBS.",{tier:"retention",status:"live",kw:"stream overlay webcam frame obs twitch design"}),
    t("starting-soon-screen","video","Starting Soon Screen","Make a starting-soon screen with countdown for OBS.",{tier:"retention",status:"live",kw:"starting soon screen obs browser source countdown stream"}),
    t("stream-alert-creator","video","Stream Alert Creator","Design follower, sub and donation alert graphics.",{tier:"retention",status:"live",kw:"stream alert follower subscriber donation graphic design"}),
    t("chat-overlay-tool","video","Chat Overlay CSS","Generate custom CSS to style your chat overlay.",{tier:"retention",status:"live",kw:"chat overlay css streamelements streamlabs style twitch"}),
    t("stream-revenue-calculator","video","Stream Revenue Calculator","Estimate monthly income from subs, bits, tips and ads.",{tier:"money",status:"live",kw:"twitch revenue income subs bits donations ads earnings"}),
    t("obs-settings-assistant","video","OBS Settings Assistant","Recommended bitrate and encoder settings for your setup.",{tier:"retention",status:"live",kw:"obs settings bitrate encoder resolution fps stream quality"}),
    t("stream-schedule-planner","video","Stream Schedule Planner","Make a shareable weekly stream schedule graphic.",{tier:"retention",status:"live",kw:"stream schedule weekly planner graphic twitch panel"}),
    t("giveaway-picker","video","Giveaway Picker","Draw fair random winners for a stream giveaway.",{tier:"retention",status:"live",kw:"giveaway winner picker random raffle stream draw"}),

    /* ---------- GAP: SEO & marketing ---------- */
    t("meta-tag-generator","seo","Meta Tag Generator","Title, description and Open Graph tags, ready to paste.",{tier:"gap",status:"live",kw:"og tags head html"}),
    t("serp-preview","seo","SERP Snippet Preview","See how your page looks in Google before publishing.",{tier:"gap",status:"live",kw:"google result title truncate"}),
    t("og-preview","seo","Social Share Preview","Preview how a link unfurls on social platforms.",{tier:"gap",status:"live",kw:"open graph twitter card"}),
    t("robots-generator","seo","robots.txt Generator","Build a valid robots.txt with the rules you need.",{tier:"gap",status:"live",kw:"crawl disallow"}),
    t("sitemap-generator","seo","Sitemap Generator","Turn a URL list into a valid XML sitemap.",{tier:"gap",status:"live",kw:"xml urls index"}),
    t("schema-generator","seo","Schema Markup Generator","JSON-LD for FAQ, article, product and breadcrumbs.",{tier:"gap",status:"live",kw:"structured data json-ld rich result"}),
    t("keyword-density","seo","Keyword Density","Term frequency and stuffing check for a page.",{tier:"gap",status:"live",kw:"frequency count on page"}),
    t("slug-generator","seo","URL Slug Generator","Clean, readable slugs from any title.",{tier:"gap",status:"live",kw:"permalink url safe"}),
    t("utm-builder","seo","UTM Link Builder","Build tagged campaign URLs consistently.",{tier:"gap",status:"live",kw:"campaign tracking analytics"}),
    t("url-shortener","seo","URL Shortener","Turn a long link into a short, shareable vootkit.com/s/ link — with an optional custom name.",{tier:"traffic",status:"live",processing:"network",kw:"link shortener short url tinyurl bitly custom alias"}),

    /* ---------- EDGE: accessibility ---------- */
    t("contrast-checker","accessibility","Contrast Checker","Check text against WCAG AA and AAA.",{tier:"edge",status:"live",kw:"wcag ratio legible"}),
    t("accessible-palette","accessibility","Accessible Palette","Build a palette that passes contrast at every pairing.",{tier:"edge",status:"live",kw:"wcag colors combination"}),
    t("color-blind-simulator","accessibility","Colour-Blindness Simulator","See a design as different types of colour vision do.",{tier:"edge",status:"live",kw:"deuteranopia protanopia simulate"}),
    t("heading-checker","accessibility","Heading Structure Checker","Find skipped levels and broken document outlines.",{tier:"edge",status:"live",kw:"h1 h2 outline semantic"}),
    t("alt-text-auditor","accessibility","Alt Text Auditor","Find missing or unhelpful image alt text.",{tier:"edge",status:"live",kw:"image description screen reader"}),
    t("tap-target-checker","accessibility","Tap Target Checker","Flag controls smaller than the 44px minimum.",{tier:"edge",kw:"touch size mobile wcag"}),
    t("caption-validator","accessibility","Caption / SRT Validator","Check subtitle timing and formatting.",{tier:"edge",status:"live",kw:"srt vtt subtitles timing"}),

    /* ---------- EDGE: privacy ---------- */
    t("metadata-remover","privacy","Metadata Remover","Strip hidden data from images and documents.",{tier:"edge",status:"live",kw:"exif scrub clean anonymise"}),
    t("url-cleaner","privacy","URL Tracker Cleaner","Remove utm_, fbclid and other tracking parameters.",{tier:"edge",status:"live",kw:"clean link share utm fbclid"}),
    t("screenshot-redactor","privacy","Screenshot Redactor","Black out private details before sharing a screenshot.",{tier:"edge",status:"live",kw:"blur censor hide"}),
    t("password-generator","privacy","Password Generator","Strong random passwords, generated on your device.",{tier:"retention",status:"live",kw:"passphrase secure random"}),
    t("password-strength","privacy","Password Strength Checker","How strong a password is — checked locally.",{tier:"retention",status:"live",kw:"secure weak entropy"}),
    t("text-encrypt","privacy","Text Encrypt / Decrypt","AES-encrypt a message with a password.",{tier:"edge",status:"live",kw:"aes cipher secret"}),
    t("file-checksum","privacy","File Checksum","Verify a download with its SHA-256 hash.",{tier:"edge",status:"live",kw:"sha256 verify integrity"}),
    t("passphrase-generator","privacy","Passphrase Generator","Memorable word-based passwords from a secure RNG.",{tier:"retention",status:"live",kw:"diceware memorable passphrase words secure password"}),
    t("totp-generator","privacy","2FA / TOTP Code Generator","Generate the current 6-digit authenticator code from a secret.",{tier:"retention",status:"live",kw:"totp 2fa authenticator otp code rfc6238"}),

    /* ---------- RETENTION: everyday ---------- */
    t("word-counter","text","Word & Character Counter","Live counts, sentences and reading time.",{tier:"retention",status:"live",kw:"how many words essay limit"}),
    t("case-converter","text","Case Converter","Upper, lower, title, sentence, camel and kebab.",{tier:"retention",status:"live",kw:"capitalize title case"}),
    t("text-diff","text","Text Diff","Compare two texts line by line.",{tier:"retention",status:"live",kw:"compare changes difference"}),
    t("readability","text","Readability Score","Flesch reading ease and grade level.",{tier:"retention",status:"live",kw:"grade level easy to read"}),
    t("line-tools","text","Line Tools","Sort, reverse, dedupe and shuffle lines.",{tier:"retention",status:"live",kw:"remove duplicates sort"}),
    t("lorem-ipsum","text","Lorem Ipsum Generator","Placeholder text by paragraph or word count.",{tier:"retention",status:"live",kw:"dummy filler placeholder"}),
    t("markdown-editor","text","Markdown Editor","Write Markdown with live preview and HTML export.",{tier:"retention",status:"live",kw:"md preview readme"}),
    t("unit-converter","everyday","Unit Converter","Length, mass, temperature, area, volume, speed and data.",{tier:"retention",status:"live",kw:"metric imperial convert"}),
    t("length-converter","everyday","Length Converter","Convert miles, km, feet, inches, metres and more.",{tier:"retention",status:"live",kw:"length distance miles km feet inches convert metric imperial"}),
    t("weight-converter","everyday","Weight Converter","Convert kg, pounds, ounces, stone and grams.",{tier:"retention",status:"live",kw:"weight mass kg lb pounds ounces stone convert"}),
    t("temperature-converter","everyday","Temperature Converter","Convert Celsius, Fahrenheit and Kelvin.",{tier:"retention",status:"live",kw:"celsius fahrenheit kelvin temperature convert c f"}),
    t("speed-converter","everyday","Speed Converter","Convert mph, km/h, m/s, knots and ft/s.",{tier:"retention",status:"live",kw:"speed mph kmh m/s knots convert velocity"}),
    t("area-converter","everyday","Area Converter","Convert acres, hectares, square feet and metres.",{tier:"retention",status:"live",kw:"area acres hectares square feet metres convert"}),
    t("volume-converter","everyday","Volume Converter","Convert litres, gallons, cups, pints and millilitres.",{tier:"retention",status:"live",kw:"volume litres gallons cups pints ml convert cooking"}),
    t("data-converter","everyday","Data Size Converter","Convert bytes, KB, MB, GB, TB and bits.",{tier:"retention",status:"live",kw:"data size bytes kb mb gb tb bits convert storage"}),
    t("electricity-cost","everyday","Electricity Cost Calculator","Cost of running an appliance from watts and price per kWh.",{tier:"retention",status:"live",kw:"electricity cost kwh appliance power watts energy bill"}),
    t("date-calculator","everyday","Date Calculator","Days between dates, or add and subtract from a date.",{tier:"retention",status:"live",kw:"date calculator days between add subtract weeks months"}),
    t("time-calculator","everyday","Time Calculator","Add or subtract hours, minutes and seconds.",{tier:"retention",status:"live",kw:"time calculator add subtract hours minutes seconds duration"}),
    t("math-solver","everyday","Math Solver","Evaluate an arithmetic expression with brackets and powers.",{tier:"retention",status:"live",kw:"math solver expression calculator evaluate arithmetic brackets"}),
    t("equation-solver","everyday","Equation Solver","Solve linear and quadratic equations, with complex roots.",{tier:"retention",status:"live",kw:"equation solver quadratic linear roots formula solve x"}),
    t("age-calculator","everyday","Age & Date Difference","Exact age, or the gap between two dates.",{tier:"retention",status:"live",kw:"how old days between"}),
    t("bmi-calculator","everyday","BMI Calculator","Body mass index and healthy weight range, metric or imperial.",{tier:"retention",status:"live",kw:"body mass index weight height healthy range"}),
    t("fraction-calculator","everyday","Fraction Calculator","Add, subtract, multiply and divide fractions, simplified.",{tier:"retention",status:"live",kw:"fractions add subtract multiply divide simplify"}),

    /* ---------- HEALTH & FITNESS ---------- */
    t("bmr-calculator","health","Calorie & TDEE Calculator","Daily calorie needs from BMR and activity (Mifflin-St Jeor).",{tier:"retention",status:"live",kw:"bmr tdee maintenance calories daily needs mifflin"}),
    t("macro-calculator","health","Macro Calculator","Split daily calories into protein, carbs and fat grams.",{tier:"retention",status:"live",kw:"macros protein carbs fat grams iifym split"}),
    t("body-fat-calculator","health","Body Fat Calculator","Estimate body-fat percentage with the US Navy method.",{tier:"retention",status:"live",kw:"body fat percentage navy waist neck hip"}),
    t("ideal-weight-calculator","health","Ideal Weight Calculator","Target weight range by height with Devine and Robinson formulas.",{tier:"retention",status:"live",kw:"ideal body weight devine robinson healthy range"}),
    t("water-intake-calculator","health","Water Intake Calculator","How much water to drink a day by weight, activity and climate.",{tier:"retention",status:"live",kw:"daily water hydration ml glasses per day"}),

    /* ---------- AUDIO & VOICE ---------- */
    t("audio-converter","audio","Audio Converter","Convert audio to WAV or MP3 in your browser.",{tier:"traffic",status:"live",kw:"audio convert mp3 wav ogg m4a format"}),
    t("audio-compressor","audio","Audio Compressor","Shrink audio files by re-encoding to a lower bitrate.",{tier:"traffic",status:"live",kw:"compress audio mp3 bitrate smaller reduce size"}),
    t("audio-trimmer","audio","Audio Trimmer","Cut a section from an audio file and save it.",{tier:"traffic",status:"live",kw:"trim cut audio clip section wav"}),
    t("voice-recorder","audio","Voice Recorder","Record from your microphone and download the audio.",{tier:"retention",status:"live",kw:"record voice microphone audio memo"}),
    t("text-to-speech","audio","Text to Speech","Read any text aloud with your device's voices.",{tier:"retention",status:"live",kw:"tts read aloud speech synthesis voice"}),
    t("speech-to-text","audio","Speech to Text","Dictate and transcribe speech live in the browser.",{tier:"retention",status:"live",kw:"stt dictation transcribe voice typing speech recognition"}),

    /* ---------- TRAVEL ---------- */
    t("fuel-cost-calculator","travel","Fuel Cost Calculator","Trip fuel cost from distance, economy and fuel price.",{tier:"retention",status:"live",kw:"gas petrol trip cost mileage fuel price journey"}),
    t("fuel-economy-converter","travel","Fuel Economy Converter","Convert between MPG, L/100km and km/L.",{tier:"retention",status:"live",kw:"mpg l100km km per litre fuel consumption convert"}),
    t("trip-cost-splitter","travel","Trip Cost Splitter","Split shared travel costs evenly between people.",{tier:"retention",status:"live",kw:"split trip expenses group holiday per person"}),
    t("tip-by-country","travel","Tipping Calculator by Country","Suggested tip and total by country custom.",{tier:"retention",status:"live",kw:"tipping guide country restaurant gratuity abroad"}),
    t("mileage-reimbursement","travel","Mileage Reimbursement","Work out mileage reimbursement from distance and rate.",{tier:"retention",status:"live",kw:"business miles reimbursement rate expense claim"}),
    t("countdown","everyday","Event Countdown","Count down to any date and time.",{tier:"retention",status:"live",kw:"days until timer event"}),
    t("pomodoro","everyday","Pomodoro & Countdown","A focus timer that chimes when it's done.",{tier:"retention",status:"live",kw:"focus study timer"}),
    t("stopwatch","everyday","Stopwatch","Precise stopwatch with lap times.",{tier:"retention",status:"live",kw:"lap timer"}),
    t("timezone-converter","everyday","Time Zone Converter","Compare a time across cities worldwide.",{tier:"retention",status:"live",kw:"meeting across countries utc"}),
    t("qr-generator","everyday","QR Code Generator","Turn any link or text into a downloadable QR code.",{tier:"retention",status:"live",kw:"qr link scan"}),
    t("qr-scanner","everyday","QR Code Scanner","Scan a QR code with your camera or from an image.",{tier:"retention",status:"live",kw:"read decode qr"}),
    t("barcode-generator","everyday","Barcode Generator","CODE128 and EAN barcodes, ready to download.",{tier:"retention",status:"live",kw:"ean upc code128"}),
    t("random-picker","everyday","Random Picker","Pick a winner fairly from a list.",{tier:"retention",status:"live",kw:"raffle giveaway choose"}),
    t("random-number-generator","everyday","Random Number Generator","Cryptographically random numbers in any range.",{tier:"retention",status:"live",kw:"rng random integer range dice draw unique"}),
    t("typing-test","everyday","Typing Speed Test","Words per minute and accuracy.",{tier:"retention",status:"live",kw:"wpm keyboard speed"}),

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
    t("xml-formatter","developer","XML Formatter","Pretty-print or minify XML in the browser.",{tier:"retention",status:"live",kw:"beautify indent xml minify"}),
    t("html-formatter","developer","HTML Formatter","Indent and tidy HTML, or minify it.",{tier:"retention",status:"live",kw:"beautify indent html minify tidy"}),
    t("css-formatter","developer","CSS Formatter","Beautify or minify CSS with clean indentation.",{tier:"retention",status:"live",kw:"beautify minify css stylesheet"}),
    t("sql-formatter","developer","SQL Formatter","Lay out SQL with uppercased keywords and line breaks.",{tier:"retention",status:"live",kw:"beautify sql query pretty print"}),
    t("cron-generator","developer","Cron Expression Generator","Build a cron schedule and read it in plain English.",{tier:"retention",status:"live",kw:"crontab schedule expression explain"}),
    t("credit-card-validator","developer","Credit Card Validator","Check a card number with Luhn and detect its brand.",{tier:"retention",status:"live",kw:"luhn check card number brand visa mastercard validate"}),
    t("iban-validator","developer","IBAN Validator","Validate an IBAN's structure and mod-97 check digits.",{tier:"retention",status:"live",kw:"iban bank account validate mod97 check"}),
    t("csv-viewer","data","CSV Viewer & Sorter","Open a CSV as a sortable, filterable table.",{tier:"traffic",status:"live",kw:"spreadsheet open sort"}),
    t("csv-to-chart","data","CSV to Chart","Turn two columns into a bar or line chart.",{tier:"traffic",status:"live",kw:"graph visualise plot"}),
    t("json-csv","data","JSON ↔ CSV","Convert a JSON array to CSV and back.",{tier:"traffic",status:"live",kw:"convert tabular"}),
    t("remove-background","ai","Background Remover","Cut out a background — private, in-browser AI.",{tier:"traffic",status:"planned",kw:"transparent cutout png subject"}),
    t("image-to-text","ai","Image to Text (OCR)","Extract text from photos, screenshots and scans.",{tier:"traffic",status:"planned",kw:"ocr scan read text"}),
    t("transcribe-audio","ai","Audio to Text","Transcribe speech with on-device Whisper.",{tier:"traffic",status:"planned",kw:"transcription subtitles speech"})
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
