# Vootkit Technical Audit — Phase 0

**Date:** 30 July 2026
**Repo:** `johnpoxer/VOOTKIT_TOOLBOX` @ `master`
**Scope:** full codebase audit, repair of the two reported broken tools, and a repeatable audit harness.

---

## 1. What was actually wrong

The two tools reported as broken — **Text to PDF** and **Video Converter** — were *not* broken in the way the symptom suggested. Both mount correctly, both load their libraries, and both produce correct output on a happy-path input. I verified this in a live browser against production before changing any code.

Each had a real defect that only appears on realistic input.

### 1.1 Text to PDF — CRITICAL — fixed

pdf-lib's 14 built-in fonts are **WinAnsi-only**. They do not fail gracefully on characters outside Latin-1 — they throw.

Live reproduction on `www.vootkit.com/tools/pdf/text-to-pdf/`:

| Input | Result before fix |
|---|---|
| `"Hello world"` | works |
| `“Smart quotes” — it’s fine…` | works |
| `Café naïve résumé` | works |
| `Total: ₹1000` | **`WinAnsi cannot encode "₹" (0x20b9)`** |
| `Meeting notes 🚀` | **`WinAnsi cannot encode "" (0x1f680)`** |
| `नमस्ते 你好 مرحبا` | **`WinAnsi cannot encode "न" (0x0928)`** |

So the tool failed for every non-Latin script, for emoji, and for the rupee and won signs — while working fine for the English test text anyone would try first. That is exactly the profile of a bug that survives casual testing and quietly destroys trust with real users.

**Fix.** `assets/js/tools-pdfmake.js` now detects the script in use and takes one of three paths:

1. Text is WinAnsi-safe → keep the existing zero-download standard-font path (no regression in speed for the common case).
2. Text needs Unicode → lazy-load `@pdf-lib/fontkit` and embed the matching subsetted Noto font.
3. Text contains colour emoji → strip them, still produce the PDF, and say so in the status line.

The tool now reports what it did rather than silently changing the user's document:

> Done — your PDF has downloaded. Embedded Noto Sans SC so your characters render correctly. 1 emoji was removed — PDFs can't embed colour emoji fonts.

**Fonts verified end-to-end in a real browser** (fetch → fontkit embed with subsetting → draw → save):

| Script | Font | Status |
|---|---|---|
| Latin (incl. ₹, €) | Noto Sans | verified, 16 KB |
| Greek | Noto Sans Greek | verified, 10 KB |
| Cyrillic | Noto Sans Cyrillic | verified, 9 KB |
| Arabic | Noto Sans Arabic | verified, 77 KB |
| Hebrew | Noto Sans Hebrew | verified, 9 KB |
| Thai | Noto Sans Thai | verified, 11 KB |
| Chinese | Noto Sans SC | verified, 1.5 MB |
| Japanese | Noto Sans JP | verified, 1.3 MB |
| Korean | Noto Sans KR | verified, 830 KB |

**Known limitation — Devanagari.** `@pdf-lib/fontkit@1.1.1` throws `regeneratorRuntime is not defined` while subsetting Noto Sans Devanagari, and embedding without subsetting locks the renderer hard enough that the tab must be killed. I reproduced the freeze twice. Rather than ship a tab-killer, Hindi/Marathi/Nepali input is now refused with a clear explanation. This is the top item on the fix roadmap.

Note the font URLs were originally pinned to `@fontsource/…@5.0.19`, which 404s for three packages. The verified working pin is `5.3.0`. This is the kind of error that only surfaces by actually fetching the URL.

### 1.2 Video Converter — CRITICAL — fixed

ffmpeg loads in **508 ms** and the conversion pipeline is sound. The defect is in the encoder arguments.

`buildConvertArgs` specified no output frame rate. Variable-frame-rate sources — screen recordings, phone captures, anything from `MediaRecorder` — carry a 1/1000 s timebase, so ffmpeg matched that timebase and duplicated frames to fill it.

Measured on a **2-second** test clip:

```
frame= 1989  dup=1894  speed=0.338x
```

1,989 encoded frames for two seconds of video, 95% of them duplicates, encoding **slower than realtime at 320×240**. Scaled to a 1080p phone video that is many minutes of pinned CPU followed, usually, by an out-of-memory crash. To a user that reads as "the converter is broken" — and reporting it as broken is correct, even though nothing throws.

Compounding it, `LIMIT` was **500 MB**. ffmpeg.wasm holds the entire input in a single wasm heap that tops out near 2 GB and needs encoder headroom on top; a 500 MB input was guaranteed to OOM mid-encode.

**Fix** — `assets/js/videoengine.js` and `assets/js/tools-videofx.js`:

- Force constant frame rate: `-fps_mode cfr -r <fps>`, default 30, user-selectable 24/30/60, clamped to 1–60. Output frame count is now a function of duration, not of the source timebase.
- `-max_muxing_queue_size 1024` for sources whose audio and video start far apart.
- Applied the same CFR flags to **Compress** and **Resize**, which had the identical latent bug.
- **Resize no longer stream-copies audio** (`-c:a copy` → `-c:a aac`). Copying Opus from WebM or Vorbis from MKV into an MP4 container is an illegal mux and fails outright.
- `LIMIT` 500 MB → **200 MB**, with pre-flight guards that reject >30-minute and >4K inputs *before* burning the user's CPU, explaining why.
- Input is written with its real extension instead of always `in.mp4`, so ffmpeg picks the right demuxer immediately and its errors stay intelligible.
- Empty output is now caught and explained instead of downloading a 0-byte file.

---

## 2. Platform-wide audit

`test/audit-tools.js` is a new static auditor covering all 257 tool pages. It checks the contract that nothing else enforces: every `<div id="workspace" data-tool="…">` must have a module that implements that id **and** that module must actually be loaded on the page. A mismatch renders an empty box to every visitor, and nothing in the build catches it.

```
VOOTKIT PLATFORM AUDIT — 257 tool pages, 257 implemented tool ids

CRITICAL: 0
HIGH:     0
MEDIUM:   0
LOW:      87   (all: <title> longer than 65 characters)

Average tool score: 99.3/100
Quality bands: Platinum 257 · Gold 0 · Silver 0 · Needs fix 0
```

**The structural health of the platform is genuinely good.** Every tool page resolves to a loaded implementation, every local asset reference exists, and every page has a title, meta description, canonical URL and `<h1>`.

### A caution about this number

The auditor took four iterations to become trustworthy, and the intermediate results were badly wrong:

| Iteration | Reported CRITICAL | Reality |
|---|---|---|
| match `var T = {` | 47 | false — calculators use `var TOOLS` |
| add `TOOLS`, `SPECS` | 6 | false — `tools-docs.js` uses `var DOCS` |
| slug heuristic | 5 | false — single-word ids (`stopwatch`, `base64`) excluded |
| **ids from pages → search modules** | **0** | correct |

Registration is not uniform across the codebase — `T`, `TOOLS`, `DOCS`, and a direct `data-tool` comparison in `tools-linktools.js` are all in use. The final approach takes the ids the pages declare and asks which modules contain them, which is agnostic to registration shape.

**This means "0 critical" is a statement about structure, not behaviour.** Both real bugs found in this audit were runtime defects on realistic input, and a static auditor cannot see those. Section 4 covers closing that gap.

### Inventory

257 tool pages across 20 categories. Full machine-readable registry with per-tool scores: **`docs/tool-registry.json`**.

| Category | Tools | | Category | Tools |
|---|---|---|---|---|
| images | 33 | | privacy | 9 |
| pdf | 33 | | tax | 9 |
| everyday | 26 | | education | 8 |
| video | 24 | | health | 7 |
| business | 23 | | realestate | 7 |
| finance | 16 | | text | 7 |
| developer | 15 | | travel | 7 |
| seo | 10 | | accessibility | 6 |
| audio | 6 | | design | 4 |
| insurance | 4 | | data | 3 |

---

## 3. Architecture

**Frontend.** Static HTML per tool, no framework, no bundler. Three mount engines share one `#workspace` convention:

| Engine | File | Used by |
|---|---|---|
| `VKW` | `assets/js/widget.js` | text-in/text-out widgets |
| `VKFile` | `assets/js/filetool.js` | file upload → process → download |
| `VKCalc` | `assets/js/calc.js` | calculators |

Tool logic lives in 36 `assets/js/tools-*.js` modules. Heavy libraries (pdf-lib, ffmpeg.wasm, pdf.js, tesseract) are lazy-loaded from CDN only when a tool runs.

**Backend.** Deliberately minimal — Supabase (project `qfqdmzwmjxdiqzeybaoo`, eu-west-1, healthy) for auth, usage limits and short links; Netlify Functions for Stripe checkout and `/s/*` redirects. All tool processing is client-side.

**Infrastructure.** Netlify, `publish = "."`, `npm run build` via `build.js`. `_headers` scopes COOP/COEP `credentialless` to the eleven video tool paths only, keeping cross-origin isolation away from ad-bearing pages — a well-judged decision that is easy to get wrong.

**i18n.** 11 locales (`ar de es fr hi id it pt zh` + source), 1,493 HTML files total.

### Strengths

- **Genuinely private.** The "runs on your device" claim is true, not marketing. Everything verified stayed in the tab.
- **Pure logic is separated and tested.** ffmpeg arg builders, PDF layout, and calculators are pure functions with 907 assertions over 19 files. This is why fixing the video bug was a three-line argument change rather than surgery.
- **Consistent page template.** Every tool has breadcrumbs, FAQ, related tools, structured data. No dead ends.
- **Lazy loading is disciplined.** No tool page pays for a library it doesn't use.
- **Cross-origin isolation correctly scoped.**

### Weaknesses

- **No runtime testing.** 907 assertions cover pure functions; zero cover a tool actually running. Both bugs fixed here lived precisely in that gap.
- **Registration is inconsistent** (`T` / `TOOLS` / `DOCS` / direct binding), which defeats tooling — as the auditor's three false starts demonstrate.
- **CDN dependency with no fallback.** pdf-lib, ffmpeg, fontkit and the Noto fonts all come from third-party CDNs. If jsDelivr or unpkg is unreachable, those tools fail. There is no SRI and no self-hosted fallback.
- **Version pins go stale silently.** `@fontsource@5.0.19` 404s. `videoengine.js` carries a comment warning that the ffmpeg worker chunk name `814.ffmpeg.js` is tied to the version — a fragile coupling with no test.
- **No error telemetry.** Nothing reports client-side failures, which is why two broken tools stayed broken. Both would have been caught in a day by basic error tracking.
- **87 over-length titles** hurting SERP display.

### Risks

| Risk | Severity | Note |
|---|---|---|
| No runtime monitoring | **High** | Broken tools are discovered by users, not by us |
| CDN outage / version drift | **High** | Silent, total failure of PDF, video and OCR tools |
| ffmpeg worker chunk pin | Medium | Documented-fragile, untested |
| No SRI on CDN scripts | Medium | Supply-chain exposure on third-party code |
| Wasm memory limits | Medium | Now guarded, but limits are heuristic not measured |

---

## 4. Recommended next steps

Priority order, matching the protocol's Critical → Low scheme. Full detail in **`VOOTKIT_FIX_ROADMAP.md`**.

**Critical**
1. Devanagari PDF support — try a TTF source instead of fontsource WOFF, or a newer fontkit.
2. Client-side error reporting. This is the single highest-leverage item in the whole audit: it converts "a user tells us months later" into "we know today."

**High**
3. Smoke-test the real tools in a headless browser in CI — mount, run one representative input, assert output. Would have caught both bugs.
4. Pin and monitor CDN assets: add SRI, and a CI check that every CDN URL still returns 200.
5. Self-hosted fallback for pdf-lib and fontkit.

**Medium**
6. Normalise tool registration on one shape and assert it in the auditor.
7. Trim the 87 over-length titles to ≤60 characters.
8. Measure real wasm memory ceilings and replace the heuristic guards.

**Low**
9. Per-tool progress detail ("Processing page 4 of 10") per the protocol's UX section.
10. Wire `docs/tool-registry.json` into an `/admin/tool-health` dashboard.

---

## 5. Verification performed

- Full test suite: **907 assertions across 19 files, all passing** (was 866 — 41 added covering the new behaviour).
- `node test/audit-tools.js` — 257 pages, 0 critical/high/medium.
- `node build.js` — clean.
- Live browser verification on production for both reported tools, before and after diagnosis, including the 10-script font matrix and a real WebM→MP4 conversion.
