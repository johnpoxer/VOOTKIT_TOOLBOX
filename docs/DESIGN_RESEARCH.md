# Vootkit — Design Research & Direction (July 2026)

Reference study before building. Sources at the end.

---

## 1. What the best sites actually do

**The canonical craft benchmarks are Stripe, Linear and Vercel** — clear messaging, fast loading, strong typography, real product visualisation.

Concrete patterns worth taking:

| Pattern | Who | Why it works |
|---|---|---|
| **Dark-as-default + exactly ONE neon accent** | Linear (purple), Raycast (red), Cursor (cyan), Mercury (lime) | The discipline *is* the design. One accent, used sparingly, reads premium. |
| **Real product UI in the hero — no stock mockups** | Linear (actual app screens, real issue titles) | Authenticity converts. No abstract illustrations. |
| **Restraint over decoration** | Stripe (headline + one animated globe; a real API snippet) | The most authentic possible visual for the audience. |
| **Primary CTA repeated every scroll-height** | audited across SaaS | Sites converting >4% visitor-to-trial share this + visible pricing + real product visuals. |

**Award-winning work** (Awwwards Site of the Year 2025: Lando Norris by OFF+BRAND; By-Kin sweeping SotD/Developer/FWA/CSSDA) is heavily WebGL/experimental — **impressive but wrong for us**. Those sites optimise for awe on one visit. A utility site optimises for *finishing a task in 20 seconds and coming back next month*. We take their craft standard, not their format.

---

## 2. Where we should deliberately differ

**Dark-as-default is right for developer tools — wrong for us.** Linear/Vercel/Raycast sell to engineers. Vootkit is used by students, office workers and parents compressing a PDF at work, often on a bright screen, and it needs to feel safe and neutral for AdSense content pages.

**Decision: light-default, with a genuinely excellent dark mode.** We keep the *discipline* (one accent, restraint) and drop the *costume* (dark hacker aesthetic).

We also apply "real product in hero" literally: the hero **is a working search box**, not a picture of one.

---

## 3. Typography (2026 consensus)

- **Variable fonts are now standard** for performance — one file replaces many weights.
- The reliable formula: **one sans "workhorse" + one headline "speaker."**
- Fonts now do brand, accessibility and usability work simultaneously — not decoration.

**Decision:**
- **Workhorse (UI + body):** `Inter` variable — the most legible UI sans at small sizes, excellent numerals for calculators.
- **Speaker (headlines):** `Manrope` variable — geometric, friendly, slightly distinctive; already proven in the brand.
- Both are on Google Fonts as variable files → two requests, small payload, fast LCP.

---

## 4. Colour

2026 guidance: colour is a **system**, not a palette — tokens that adapt across light/dark, stay accessible, render well on OLED. Neon returns only as **micro-glow accents, focus states, small badges and CTA outlines**, not as floods.

**Decision — one accent, not three.** The current blue→violet→cyan gradient is applied to buttons, cards, chips and headings; that's three accents everywhere and it dilutes the brand.

- **Primary accent:** a single confident blue (`#2563eb` family) — trustworthy, safe on light, legible on dark.
- **Signal colours:** green (success), amber (warning), red (error) — semantic only, never decorative.
- **Gradient budget:** at most **one** gradient element per page (the hero headline *or* the primary CTA — not both).
- **Neutrals:** a full 10-step scale doing the heavy lifting; the accent should be maybe 5% of the pixels.
- Light mode leans on a soft near-white canvas (in keeping with Pantone's 2026 "Cloud Dancer" mood — calm, reset) rather than pure `#fff` everywhere.

---

## 5. Component patterns

**Cards** (our most-repeated element): build on an **8px grid**; design explicitly for variable content length so titles of different lengths don't break the grid.

**Drag & drop** (every file tool has one) — the researched rules:
1. Clearly identify what is draggable — don't make users guess.
2. Define **visible drop targets**; the zone must be obvious during interaction.
3. Give **real-time visual feedback** while dragging (highlight, shadow, animation).
4. Always provide a click/keyboard alternative — drag is never the only path.

**Command palette** — 2026 pattern for removing navigation friction. `Cmd/Ctrl+K` opens search from anywhere.

---

## 6. Templates — recommendation: don't use one

I looked. Tool-site templates exist, but:
- **Licensing** — most require attribution or paid licences, and some restrict commercial/ad-supported use.
- **They look like templates.** Every audited award-winner and every benchmark (Stripe/Linear/Vercel) is bespoke. A template would put Vootkit in the same visual bucket as the competitors we're trying to beat.
- We already have a working component vocabulary and 89 functioning tools — a template would mean *removing* working code to fit someone else's markup.

**We build the design system from scratch** — but small: ~10 components, tokenised, documented.

---

## 7. Locked design direction

| Decision | Choice |
|---|---|
| Mode | **Light default**, first-class dark mode |
| Accent | **One** blue; semantic colours for state only |
| Gradient | Max one element per page |
| Type | Inter (workhorse) + Manrope (headlines), both variable |
| Grid | 8px rhythm |
| Hero | Working search box = the "real product in hero" pattern |
| Motion | Micro-interactions + focus glow; nothing decorative that costs LCP |
| Targets | LCP < 2.5s, 44px touch targets, WCAG 2.2 AA |
| CTA | Repeated roughly every scroll-height |

---

## Sources

- [Best SaaS website designs 2026 (Stripe/Linear/Vercel craft benchmarks)](https://www.gridrebels.studio/post/20-best-saas-website-designs-in-2026-examples-that-actually-convert)
- [What makes a great SaaS landing page in 2026 — dark + single accent, real product in hero](https://framiq.app/blog/best-saas-landing-pages-2026)
- [Awwwards — Sites of the Year](https://www.awwwards.com/websites/sites_of_the_year/)
- [Best award-winning websites 2026 (WebGL & Awwwards)](https://www.hontran.dev/blog/best-award-winning-websites-2026)
- [Typography trends 2026 — variable fonts standard](https://www.designmonks.co/blog/typography-trends-2026)
- [Font pairing guide 2026 — workhorse + speaker](https://www.getly.store/blog/font-pairing-guide-2026-best-font-combinations-that-look-pro)
- [UI colour trends 2026 — colour as system, micro-glow neon](https://www.recursion.agency/blog/ui-color-trends-2026)
- [Dark mode 2026 best practices](https://kyady.com/en/blog/dark-mode-2026-best-practices-elegant-interfaces)
- [8 best practices for UI card design (8px grid, variable content)](https://uxdesign.cc/8-best-practices-for-ui-card-design-898f45bb60cc)
- [Drag-and-drop UX guidelines](https://smart-interface-design-patterns.com/articles/drag-and-drop-ux/)
- [Designing drag and drop UIs — patterns](https://blog.logrocket.com/ux-design/drag-and-drop-ui-examples/)
- [SaaS UI design trends 2026](https://www.saasui.design/blog/7-saas-ui-design-trends-2026)
