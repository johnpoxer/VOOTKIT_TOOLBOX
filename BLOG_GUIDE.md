# Vootkit Blog — authoring & publishing guide

This is how the blog works, the structure every post should follow, and copy‑paste prompts for ChatGPT (writing) and Gemini (cover images).

---

## How publishing works

1. Go to **https://www.vootkit.com/admin/** and log in (only invited admins can).
2. Click **Blog posts → New Blog post**.
3. Fill in **Title, Publish date, Short description, Cover image, Author**, then paste the article into **Body**.
4. Click **Publish**. Decap commits it to the repo, Netlify rebuilds, and the post goes live at `vootkit.com/blog/<slug>/` within a minute or two.
5. Leave **Draft** on if you want to save without publishing.

The **Short description** is what Google shows in search results and what appears on the blog card — keep it under ~155 characters and make it compelling.

---

## The structure every post should follow

Each post targets ONE keyword/task and maps to a real Vootkit tool.

1. **Title (H1)** — clear, keyword-first, benefit-driven. e.g. "How to compress a PDF without losing quality".
2. **Intro (2–3 sentences)** — the problem + that Vootkit solves it in the browser (private, free, no upload).
3. **Quick answer** — a short "here's how" so readers (and Google) get the answer fast.
4. **Step-by-step (H2 + numbered list)** — the actual steps, linking to the relevant tool at `/tools/<category>/<tool>/`.
5. **Why do it this way (H2)** — privacy/speed/no-watermark benefits.
6. **Tips or common mistakes (H2)** — 2–4 practical tips.
7. **FAQ (H2)** — 3–5 short Q&As (great for SEO featured snippets).
8. **Close + CTA** — one line linking to the tool: "Try the [Tool name](/tools/…/…/) — it's free and runs in your browser."

Aim for **700–1,200 words**, short paragraphs, at least one internal link to the tool, and one to a related tool.

---

## ChatGPT prompt (paste this, then fill the brackets)

```
You are writing an SEO blog post for Vootkit (vootkit.com), a site of free, private,
browser-based tools (files are processed on the user's device, never uploaded).

Write a 700–1,100 word blog post about: [TOPIC / TARGET KEYWORD]
It maps to this Vootkit tool: [TOOL NAME] at [/tools/category/tool/]

Requirements:
- Tone: clear, helpful, friendly, no fluff, no hype. British-neutral English.
- Structure exactly: H1 title; 2–3 sentence intro naming the problem and that Vootkit
  solves it in the browser (private, free, no upload); a short "Quick answer"; an H2
  step-by-step with a numbered list that links to the tool; an H2 on why the
  browser-based way is better (privacy, speed, no watermark, 5 free uses a day on the
  free plan); an H2 with 2–4 practical tips or common mistakes; an H2 FAQ with 3–5
  short Q&As; a closing CTA linking to the tool.
- Include the target keyword in the H1, the first paragraph, and one H2.
- Add one internal link to the tool and one to a related Vootkit tool.
- Output as clean Markdown only (## for H2), no images, no frontmatter.
Also give me, separately:
- A <155-character meta description.
- A URL slug (lowercase-hyphenated).
```

---

## Gemini image prompt (for the 1200×630 cover)

```
Create a 1200x630 blog cover image, flat modern SaaS style, clean white background with
soft rose-pink (#d61f69) accents and subtle gradient shapes. Minimal, premium, lots of
whitespace. Theme: [TOPIC, e.g. "compressing a PDF"]. Include a simple flat icon
representing the topic. No text, no logos, no photos of real people. High contrast,
uncluttered, works as a social share thumbnail.
```

Save/export the image, then upload it as the **Cover image** in the admin when you publish.
(You can add the post title as text later in the editor if you want, but keeping it text-free
lets the cover work across the site and social.)

---

## A first batch of high-value topics (each maps to a real tool)

- How to compress a PDF without losing quality → /tools/pdf/compress-pdf/
- How to merge PDF files for free → /tools/pdf/merge-pdf/
- Convert HEIC to JPG on any device → /tools/images/heic-converter/
- Shrink a video to fit Discord's 10 MB limit → /tools/video/compress-for-discord/
- Turn a video clip into a GIF → /tools/video/video-to-gif/
- How much house can I afford? (mortgage math) → /tools/finance/mortgage-calculator/
- Format and validate JSON fast → /tools/developer/json-formatter/
- Create a strong password you can actually remember → /tools/privacy/password-generator/
