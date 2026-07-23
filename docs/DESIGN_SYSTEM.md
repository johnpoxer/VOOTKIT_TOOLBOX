# Vootkit Design System
_The single design language. Every page, tool, and future feature consumes this._
_Source of truth: `assets/css/tokens.css` (values) + `assets/css/base.css` (components)._

## Principles
1. **One accent, applied with discipline.** Blue (`--accent`) carries all interactivity.
   Colour that isn't semantic (ok/warn/err) or the accent is a bug. Max one gradient
   element per page (`.grad-text`).
2. **Neutrals do 95% of the work.** A 0–900 ramp with a *soft* canvas (`--n-25`, not pure
   white) — calm, premium, not clinical.
3. **Designed dark mode, not an inversion.** Separate palette + shadows tuned for dark.
4. **8px rhythm.** All spacing from `--s-1..--s-9`. No magic numbers.
5. **Honesty is visual.** `processing: local|network` → a badge. Never blur the difference.
6. **Motion is a cubic-bezier, not linear; it respects `prefers-reduced-motion`.**
7. **AA or better, always.** Token pairs are contrast-checked in both themes.

## Tokens (never hard-code these values)
- **Colour**: `--accent[-hover/-active/-weak/-border/-on]`, `--ok/--warn/--err[-weak/-border]`,
  surfaces `--canvas/--surface/--surface-sunk`, lines `--line/--line-strong`,
  ink `--ink/--ink-soft/--ink-mute`.
- **Type**: `--font-sans` (Inter), `--font-display` (Manrope), `--font-mono`. Scale
  `--t-xs..--t-4xl` (fluid via clamp above `-xl`). Leading `--leading-tight/-body`.
- **Space**: `--s-1..--s-9`. **Radius**: `--r-sm..--r-xl`, `--r-pill`.
- **Elevation**: `--shadow-sm/-md/-lg`, focus `--ring`.
- **Motion**: `--ease`, `--dur-fast/-/-slow`.
- **Layout**: `--page` (1160), `--gutter`, `--tap` (44px min touch target).

## Components (contracts)
Named, reusable. When a new surface needs one, extend the component — don't re-invent.

| Component | Class | Contract |
|---|---|---|
| Button | `.btn`, `.btn-primary` | ≥44px tap height; focus-visible ring; hover lift |
| Icon button | `.icon-btn` | 44px square; aria-label required |
| Card | `.card` | surface + `--line` + `--shadow-sm`; hover → `-md` + accent border |
| Tool card | `.tool-card` / `.catcard` / `.poptool` | icon tile (accent-weak) + title + meta |
| Badge | `.badge`, `.badge-local`, `.badge-net` | processing/status signalling |
| Field | `.field` (+ `.wtext`, `.range`) | 1px `--line-strong`; focus → accent + ring |
| Dropzone | `.drop` (filetool) | live `is-over` state; keyboard + click fallback |
| Result stat | `.calc-stat` / `.calc-stats` | label + bold value grid |
| Progress | `.bar` | determinate; aria-updated |
| Note / alert | `.note`, `.note.err` | `role=status` / `role=alert` |
| Search result | `.res` (+ `.res-ic`) | icon + name + desc + badge + category |
| Section head | `.sec-head` | eyebrow + h2 + lede, centred |

## Iconography
Single 24×24 stroke set (1.8 width, round caps), defined once in `home.js#icon()` and keyed
by `category.icon`. **To scale**: promote this to `assets/js/icons.js` so category hubs,
search, popular strip and (future) dashboard all draw from one map. Never mix icon styles.

## Page anatomy (every tool page — enforced by `build.js`)
Hero → workspace → what-it-does → why → how → example → FAQ → related tools →
recently-viewed → trust note. No dead ends: always ≥1 onward link.

## Rules that are enforced by code (not discipline)
- `ads:false` on tool pages → the build fails its test if `adsbygoogle` appears in a workspace.
- COOP/COEP only on the 7 video-processing paths (ffmpeg) — never on ad pages.
- Every `status:"live"` tool must have real code (no empty workspaces) — verified in CI.

## Next (Phase 4)
Extract the above into a documented component gallery page (`/components/`, noindex) so
engineers see every state (default/hover/focus/disabled/loading/empty/error) in one place,
and add the missing primitives: **Toast, Modal/Dialog, Tabs, Skeleton, Empty-state, Upload,
site-wide Command Palette.**
