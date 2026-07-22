# Vootkit Tool Ecosystem — Master Map

The consolidated roadmap. Every field scored on four axes, then sequenced so each wave feeds the next.

---

## 1. The scoring model

A tool field is only worth building if it wins on at least one axis — and the *portfolio* must cover all four.

| Axis | Question | Why it matters |
|---|---|---|
| **Traffic** | How many people search this? | Acquisition |
| **Money** | What do advertisers pay per click? | Revenue |
| **Retention** | How often does one person return? | Compounding |
| **Feasibility** | Can it genuinely run in-browser? | Our moat + cost |

**The flywheel:** Traffic fields bring people in → Retention fields make them return → Money fields pay the bills → Emerging fields keep us ahead.

No single field does all four. That's why this is an ecosystem, not a tool site.

---

## 2. Hard numbers (verified)

**Cost-per-click by industry (Google Search):**

| Industry | CPC |
|---|---|
| Insurance | **$31.40** (auto-insurance keywords $40–100+) |
| Finance | **$22.10** |
| Legal | **$18.40** |
| Real estate | **$14.20** |

**Display RPM by niche:** Finance **$28–40** · Tech $18–25 · Crypto $20–45 · Health $8–15 · **Gaming $2–6**

A finance visitor is worth roughly **10× a gaming visitor**. Both belong in the portfolio — for different jobs.

---

## 3. Field map

| Field | Traffic | Money | Retention | Feasible | Verdict |
|---|---|---|---|---|---|
| **PDF** | ★★★★★ | ★☆ | ★★ | ★★★★ | **Volume engine.** Badly under-built (6 tools). |
| **Images** | ★★★★★ | ★☆ | ★★★ | ★★★★★ | **Volume engine.** Under-built (6). |
| **Finance / loans** | ★★★ | ★★★★★ | ★ | ★★★★★ | **Revenue engine.** Expand hard. |
| **Insurance** | ★★ | ★★★★★ | ★ | ★★★★★ | **Highest CPC on the internet.** Missing entirely. |
| **Real estate** | ★★★ | ★★★★ | ★★ | ★★★★★ | **Underrated.** Pure math, $14.20 CPC. Missing. |
| **Legal** | ★★ | ★★★★ | ★ | ★★★ | **Underrated** — but liability care needed (§5). |
| **Tax / payroll / HR** | ★★★ | ★★★★ | ★★ | ★★★★★ | Underrated, seasonal spikes. Missing. |
| **Video / streaming** | ★★★ | ★ | ★★★★★ | ★★★ | **Retention engine + affiliate.** See VIDEO_CREATOR_TOOLS.md |
| **Daily utilities** | ★★★★ | ★ | ★★★★★ | ★★★★★ | **Habit engine.** Word counter, timers, converters. |
| **SEO / marketing** | ★★★ | ★★★ | ★★★ | ★★★★★ | Missing entirely. Good all-round score. |
| **Accessibility** | ★★ | ★★★ | ★★ | ★★★★★ | **Most underrated.** Regulatory tailwind (§4). |
| **Privacy / PETs** | ★★★ | ★★ | ★★★ | ★★★★★ | On-brand. 2026 is "a defining year for data protection." |
| **AI provenance** | ★★ | ★★★ | ★★ | ★★★ | **Emerging.** C2PA standard forming now. |
| **Freelancer / SMB** | ★★★ | ★★★★ | ★★★ | ★★★★★ | Invoices, quotes, contracts. Recurring need. |
| Developer | ★★ | ★☆ | ★★★ | ★★★★★ | **Over-served (12 tools). Freeze.** Devs block ads. |
| Science / Fun | ★★ | ★ | ★★ | ★★★★★ | Adequate. Freeze. |

---

## 4. The underrated fields (where the alpha is)

**1. Real estate calculators — $14.20 CPC, pure arithmetic, nobody bundles them well.**
Rent vs. buy · cap rate · cash-on-cash return · closing costs · mortgage payoff · property ROI · rental yield · BRRRR · 1031 exchange · PMI removal · home affordability.

**2. Accessibility tools — regulatory tailwind, B2B audience, almost no competition.**
Accessibility is "shifting from novelty to baseline expectation," and AI tooling now auto-detects only 55–65% of WCAG errors — meaning humans still need checkers. We already own a contrast checker; the field is wide open.
WCAG contrast (have) · accessible palette generator · alt-text auditor · heading-structure checker · readable-font-size tester · colour-blindness simulator · caption/SRT validator · tap-target checker · focus-order visualiser.

**3. Privacy / PETs — perfectly on-brand for "your files never leave your device."**
EXIF stripper (have) · PDF redaction · filename anonymiser · **URL tracker-parameter stripper** (removes `utm_`, `fbclid` — tiny tool, constant use) · metadata viewer for Office docs · passphrase generator · screenshot redactor · data-URL scrubber.

**4. AI provenance / C2PA — emerging standard, first-mover window.**
The C2PA standard (backed by Microsoft, Adobe, Google) embeds cryptographic provenance in content, and EU/US legislation is moving toward mandatory AI watermarking. Tools: C2PA metadata viewer · AI-image likelihood checker · watermark detector · provenance stripper/preserver. Low volume today, but this becomes table stakes.

**5. Tax / payroll / HR — high CPC, strong seasonality.**
Income tax estimator · self-employment tax · paycheck/net-pay · overtime · PTO accrual · **true employee cost** (salary + benefits + taxes + overhead) · contractor vs employee · payroll tax.

**6. Freelancer / SMB — recurring need, $18+ CPC adjacency.**
Invoice (have) · quote/estimate · **hourly rate calculator** · project cost estimator · late-fee calculator · VAT/GST · profit margin · break-even · LTV:CAC · runway.

---

## 5. Two fields that need care (not avoidance)

- **Legal:** high CPC but real liability. Build *calculators and checklists* (notice-period, small-claims limits, deadline calculators), **not** document generators that constitute legal advice. Every page carries "not legal advice — consult a lawyer."
- **Health:** we already carry BMI/calories. Keep them as *estimators* with a clear "not medical advice" line. Never diagnostic.

---

## 6. Target ecosystem

~200 tools across 16 fields. Current: 89.

| Field | Now | Target |
|---|---|---|
| PDF | 6 | 24 |
| Images | 6 | 20 |
| Video / streaming | 1 | 21 |
| Finance / loans | 10 | 22 |
| Insurance | 0 | 6 |
| Real estate | 0 | 11 |
| Tax / payroll / HR | 0 | 9 |
| Freelancer / SMB | 1 | 10 |
| SEO / marketing | 0 | 10 |
| Accessibility | 1 | 9 |
| Privacy | 2 | 8 |
| AI provenance | 0 | 4 |
| Daily utilities | ~20 | 26 |
| Developer | 12 | 12 (frozen) |
| Science / Health / Fun | 16 | 16 (frozen) |
| AI on-device | 6 | 8 |

---

## 7. Build sequence

| Wave | Focus | Rationale |
|---|---|---|
| **1. Money** | Insurance (6), real estate (11), remaining finance (12) | Same build cost, 10–40× revenue per visitor. Ship first. |
| **2. Traffic** | PDF → 24, Images → 20 | Volume + strongest "no upload" story (contracts, passports). |
| **3. Retention** | Streamer Wave 1 (10 zero-processing tools), daily utilities | Frequency engine; cheap to build. |
| **4. Gaps** | SEO (10), freelancer/SMB (10), tax/HR (9) | Whole categories missing, good all-round scores. |
| **5. Differentiators** | Accessibility (9), privacy (8), AI provenance (4) | Low competition, on-brand, future-proof. |
| **6. Heavy** | Video processing (WebCodecs), remaining AI | Highest build cost — after the cheap wins are banked. |

---

## 8. Rules

1. **Ads on money pages, never inside a working tool.** TinyWow's top complaint is ads interrupting the task.
2. **Affiliate beats display in high-CPC fields** — a single insurance affiliate placement can outperform hundreds of AdSense impressions. Finance/insurance/real-estate pages get affiliate slots; PDF pages get display.
3. **US-first English content** — highest CPC — before translating.
4. **Interactive tools over articles.** AI Overviews summarise articles; they can't replace a calculator. Tools are AI-resistant.
5. **Every tool declares its processing honestly** — "runs on your device" or "uses an API," never blurred.
6. **Freeze the over-served.** No more developer, science or fun tools.

---

## Sources

- [CPC benchmarks by industry (insurance $31.40, finance $22.10, legal $18.40, real estate $14.20)](https://cpctools.com/)
- [Highest paying AdSense niches 2026 — RPM data](https://adstimate.com/blog/highest-paying-adsense-niches.html)
- [YouTube RPM by niche 2026 — finance $40, gaming $5](https://fluxnote.io/guides/youtube-rpm-by-niche-usa-2026)
- [Display ad RPM by niche 2026](https://toolsignal.site/articles/blog-display-ad-rpm-by-niche-2026)
- [Real estate investment calculators](https://www.obieinsurance.com/blog/best-real-estate-calculator)
- [Accessibility trends 2026 — baseline expectation, 55–65% auto-detection](https://www.accessibility.com/blog/accessibility-trends-to-watch-in-2026)
- [Emerging privacy trends 2026 — PETs](https://securiti.ai/infographics/data-privacy-trends/)
- [AI detection & C2PA provenance standards 2026](https://www.aicheckr.io/blog/best-ai-detection)
- [Free freelancer tools — invoice, tax, contracts](https://www.plutio.com/tools)
- [Best free invoice generators 2026](https://www.paymoapp.com/blog/invoice-generator/)
- [Daily-use everyday tools](https://toolsrift.com/everyday)
