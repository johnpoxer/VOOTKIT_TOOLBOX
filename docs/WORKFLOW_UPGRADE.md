# Workflow builder — upgrade spec

Mobile is the primary target. Desktop follows from it, not the other way round.

Start here. Do not re-audit — this was measured on 13 Aug 2026 against the
real mounted builder, not read off the source.

---

## What already works (verified, don't rebuild)

Mount the real editor and check before assuming anything is broken:

```
node test/workflow-ui.probe.js
```

- Palette 62 draggable items · categories · search
- Canvas, numbered nodes, `+` inserters, Add Step dropzone
- Inspector panel, undo/redo, saved status
- **Drag and drop works.** `dragstart` sets `text/vk-tool`; `dragover` calls
  `preventDefault()` (the usual silent-failure point); `drop` adds a node.
- Click-to-add works — this is the real path on touch, since HTML5 drag
  events largely don't fire there.
- Template gallery, detail panel, 99 licensed images + attribution manifest
  at `public/images/workflows/workflow-template-assets.json`
- Below 700px the chain is a true flex column. `draw()` assigns flex `order`
  so `+` inserters interleave between steps. `order` is inert on absolutely
  positioned boxes, so desktop is untouched.
- Privacy badge derives from the catalog's `processing` field via
  `locality()` — never hardcode that string again.

---

## 1. The palette is the weakest thing on a phone

62 items in a permanent panel above the canvas. You scroll a tool list before
you can see your own workflow.

Make it a sheet, summoned from **Add Step** and from each `+`. The picker
already exists (`openPicker`) and already opens from `+` — this is mostly
promoting it to the primary way in on small screens, and hiding `.wfc-pal`
below 700px rather than stacking it.

Sheet wants: search focused on open, recent tools first, category chips, and
compatibility filtering — only offer steps that accept the previous step's
output kind. `stepChoices(D, currentKind, exclude)` already computes this.

## 2. Status strip figures are decorative

`12 files · ~15 seconds · 4 actions` in the mockup. Today the file count is
real; the time estimate is not. Either derive it from a measured per-tool
rate (and round up — a missed promise is worse than none) or drop the number
and say "about a minute". Do not ship a fake figure; the site already got
burned by invented stats on the homepage.

## 3. Output Preview shows finished thumbnails before a run

`.wfc-preview-grid` renders processed-looking images when nothing has
executed. Show input thumbnails, or leave it empty until a run completes.
Same category of problem as the "1M+ users" stat.

## 4. Block order on mobile

Current: app bar → canvas → status bar → inspector.
Better: app bar → **sticky Run bar at the bottom of the viewport** → canvas
→ inspector as a bottom sheet over the canvas, not appended below it.

The Run control is the point of the page and should never require scrolling.

## 5. Features worth adding, in value order

1. **Duplicate step** — one tap. Most-wanted action in every builder.
2. **Reorder on touch** — drag handle with long-press, or up/down buttons.
   `reorderByCanvasX()` handles desktop; touch has no equivalent.
3. **Run history** — last N runs with inputs, outputs, timing. Needs the
   storage decision in `docs/WORKFLOW_ARCHITECTURE.md` (Options A/B/C) first.
4. **Per-step disable** — skip a step without deleting it.
5. **Branching** — the 17-item list asked for it; today the chain is strictly
   linear. This changes the data model, so decide before shipping more UI on
   top of the linear assumption.

---

## Rules that are not negotiable

- Files are never uploaded. Asserted in 28 places across 23 files. The error
  reporter must never receive file contents, names, or paths.
- Workflow is Pro-only. Three templates currently badge **Free** — reconcile
  that, because a free badge that hits a paywall on click is the worst case.
- `/blog/` and other route dirs are generated; edit `build.js`, not output.
- Verify in something that runs the real code. Every mistake on this project
  came from a preview that flattered the code — a hand-assembled page, or a
  test reading `build.js` source instead of built HTML.
- Batch pushes. Netlify build minutes are limited.

## State at handoff

Commits `8f459b0`, `51e0e2d`, `e2bf0d5`, `0e6ee53`, `aa4379d` — unpushed.
Suite green, 10,290 assertions (`node test/seo.test.js`).
