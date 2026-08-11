# How the Vootkit blog works

Read this before editing anything blog-related. The two mistakes below are
easy to make and both look like the change silently did nothing.

---

## 1. `/blog/` is GENERATED. Do not edit it.

`blog/index.html` and `blog/<slug>/index.html` are build output. They are in
`.gitignore`, they are rebuilt from scratch by `npm run build`, and Netlify
rebuilds them on every deploy.

Editing them appears to work locally and is erased on the next build.

| To change | Edit |
|---|---|
| A post's words | `content/blog/<slug>.md` |
| The blog index layout | `blogIndexPage()` in `build.js` |
| A single post's layout | `blogPostPage()` in `build.js` |
| Blog styling | `.bl-*` rules in `assets/css/pages.css` |

---

## 2. Adding a post

Create `content/blog/my-post.md`:

```markdown
---
title: "How to Reduce PDF File Size Without Ruining It"
date: "2026-08-05"
description: "One or two sentences. Shows on the card and as the meta description."
thumbnail: "/assets/blog/my-post.jpg"
author: "The Vootkit team"
---

Body in markdown. The first paragraph is the standfirst.
```

Then `npm run build`. Everything else is automatic:

- the page, its card, and its position in the list (newest first)
- `sitemap-blog.xml`
- `BlogPosting` structured data
- **reading time**, computed from the real body at 220 wpm — do not put it in
  the frontmatter, it would drift from the text

**The thumbnail is not optional in practice.** A post without one gets a card
with no image and breaks the row visually. 1200×630, in `assets/blog/`.
Add a `.webp` beside the `.jpg` if you can.

`draft: "true"` keeps a post out of the build entirely.

---

## 3. Things that will bite

**Run the tests.** `node test/seo.test.js` — 10,000+ assertions, several of
which cover the blog. It has caught real breakage repeatedly.

**Don't add a post without a date.** Sorting is by date; a missing one puts the
post in an unpredictable place.

**Word count matters more than post count right now.** AdSense rejected this
site on 8 Aug 2026 for "Low value content". The measured cause was 1,192
duplicate localised pages, now noindexed — but the residual risk is that 280
tool pages against 10 blog posts still reads as a tool directory. The blog is
the strongest counter-signal available. Getting to ~20 substantial posts is
worth more than any design change.

**Every claim has to be true.** The site says in 28 places that files are never
uploaded. A post that says otherwise — even loosely, even in an analogy —
contradicts the product and the privacy policy on the page a reviewer is
reading. `test/newsletter.test.js` and `test/seo.test.js` both assert against
storage language elsewhere; the blog is not covered automatically, so this one
is on the author.

**Link to the tools.** Each post should link to the tools it discusses, with
real anchor text. It is the main reason the blog earns its place beyond the
word count.

---

## 4. What the current design does

One lead post at full width, the rest in a card grid. Reading time and date on
every card. Descriptions clamp to three lines so one long standfirst cannot
make a card twice the height of its neighbours.

The layout choice is deliberate: a grid where every post is the same size says
every post matters equally, which is never true, and it gives a first-time
reader no obvious place to start.

If you replace it, keep three things:

1. `<time datetime="...">` on every date — it is in the structured data too
2. `loading="lazy"` on every card image except the lead
3. Real reading time from `p.words`, not a guess
