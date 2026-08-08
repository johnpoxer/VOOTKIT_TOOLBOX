---
title: "APR vs Interest Rate: What Each One Actually Tells You"
date: "2026-08-05"
description: "APR folds fees into a single comparable number — but it assumes you keep the loan for the full term, and almost nobody does. Where APR helps, where it misleads, and the break-even month that decides it."
thumbnail: "/assets/blog/apr-vs-interest-rate.jpg"
author: "Mr John Prosper"
---

*General information, not financial advice. Which fees count toward APR, and how it must be disclosed, vary by country and loan type — check the actual offer documents and speak to a licensed adviser before borrowing.*

---

Two lenders quote you a mortgage. One says 7.00%, the other 6.625%. The second is obviously cheaper.

Except the second one charges a point — $3,000 on a $300,000 loan — to get you that rate. Now it isn't obvious at all, and the two numbers you were given can't answer the question.

That gap is what APR exists to close. It's a genuinely useful number, and it's also routinely misunderstood in a way that costs people money.

## What APR is doing

The **interest rate** — the note rate — is the number your payment is calculated from. Nothing else.

The **APR** is a different thing entirely: it's the rate that *would* produce your actual payments if the fees had been part of the loan instead of paid separately. It's a reverse-engineered figure. Take the payment your note rate produces, subtract the lender's fees from what you actually received, and solve for the rate that reconciles the two.

That's why APR is higher than the note rate whenever fees exist, and exactly equal to it when they don't.

## The one thing people do with APR that is simply wrong

**Never put the APR into a payment calculator.**

Your payment comes from the note rate. On the $300,000 example:

| | Note rate | APR | Monthly payment |
|---|---|---|---|
| Offer A — no points, $1,500 fees | 7.000% | 7.050% | **$1,995.91** |
| Offer B — 1 point, $4,500 fees | 6.625% | 6.772% | **$1,920.93** |

Run Offer B's APR of 6.772% through the [Loan Calculator](/tools/finance/loan-calculator/) and you get $1,948 — twenty-seven dollars a month away from the real figure, and $9,700 out over thirty years. The APR was never meant to produce that number.

Use the note rate to work out what you'll pay each month. Use the APR to work out which offer is cheaper. They are different jobs.

## Which fees are actually in there

This is where most APR explanations go vague, and the vagueness is the problem — "certain fees where applicable" tells you nothing you can act on.

For a US mortgage, the APR generally **includes**:

- Loan origination fees
- Discount points
- Mortgage broker fees
- Mortgage insurance premiums
- Prepaid interest

And generally **excludes**:

- Appraisal fees
- Credit report fees
- Title insurance and title search
- Home inspection
- Recording fees and transfer taxes

Notice the pattern: costs the *lender* charges for making the loan go in; costs paid to *third parties* mostly stay out. Which means two lenders can post identical APRs and still cost you different amounts at closing, because the excluded pile isn't identical.

Outside the US the boundary moves. The UK and EU use APR and APRC under their own rules about what must be included, and the standardised figures — a "representative APR" in UK advertising, for instance — only have to be available to a proportion of accepted applicants, not to you. Read the offer, not the poster.

## The assumption that breaks APR

Here is the part almost no article mentions, and it matters more than everything above.

**APR assumes you keep the loan for its entire term.** It spreads the upfront fees across all 360 payments. Very few people make 360 payments — they sell, or they refinance, and the median mortgage is gone long before it matures.

When you leave early, those fees haven't been spread over thirty years. They've been spread over however long you actually stayed. So the low-rate, high-fee loan — the one with the flattering APR — performs *worse* than its APR implied.

Offer B saves **$74.97 a month** and costs **$3,000 more upfront**. Divide one by the other:

```
$3,000 ÷ $74.97 = 40 months
```

**Month 40 is the break-even.** Sell or refinance before then and the 6.625% loan with the better APR was the more expensive choice, despite winning on every number the lender printed. Stay past it and B pulls ahead — by roughly $6,000 at ten years and $24,000 if you genuinely go the distance.

(That's counting payments and upfront cost. The lower rate also erodes the balance slightly faster, which tilts it a little further toward B — so month 40 is the conservative reading.)

So the question isn't "which APR is lower". It's **"which APR is lower over the period I will actually hold this loan"** — and only you know that number.

## Credit cards work differently again

On an instalment loan the APR is a comparison device. On a credit card it's closer to the operating rate — and it's quoted in a way that understates what you pay.

Card issuers divide the APR by 365 to get a daily periodic rate, then apply it daily to your balance. Daily compounding means the effective annual cost is higher than the number on the agreement:

| Quoted APR | Daily rate | What it actually costs annually |
|---|---|---|
| 19.99% | 0.0548% | **22.12%** |
| 24.99% | 0.0685% | **28.38%** |
| 29.99% | 0.0822% | **34.96%** |

That's a five-point gap at the top end, before anyone mentions that purchases, balance transfers and cash advances usually carry different APRs on the same card — and that cash advances typically start accruing immediately, with no grace period.

If you clear the statement balance every month, none of this touches you. If you carry a balance, the number that matters is in the right-hand column.

## How to actually compare two offers

Comparing a rate from one lender against an APR from another is meaningless — you'd be comparing two different measurements. Line them up properly:

| | Lender A | Lender B |
|---|---|---|
| Amount | $300,000 | $300,000 |
| **Note rate** | 7.000% | 6.625% |
| **APR** | 7.050% | 6.772% |
| Points and lender fees | $1,500 | $4,500 |
| Third-party closing costs | — | — |
| Monthly payment | $1,995.91 | $1,920.93 |
| Break-even vs the cheaper-upfront option | — | month 40 |
| Fixed or variable | | |

Then ask the question the table can't answer: how long am I keeping this?

The [Loan Calculator](/tools/finance/loan-calculator/) and [Mortgage Calculator](/tools/finance/mortgage-calculator/) will give you the payment and total for each scenario, and the [Percentage Calculator](/tools/finance/percentage-calculator/) handles the rate comparisons. If the real question underneath is whether you can carry the payment at all, the [Debt-to-Income Calculator](/tools/finance/debt-to-income/) works out the ratio your lender is about to calculate about you anyway.

## What to ask before signing

- What is the note rate, and what is the APR?
- Which fees are inside that APR, and which are not?
- What do the excluded third-party costs come to?
- Am I paying points, and what is the break-even month?
- Is the rate fixed, and if not, when can it change and by how much?
- Is there a prepayment penalty? *(This one interacts with everything above — a break-even calculation is worthless if leaving early carries a charge.)*
- Is the advertised rate one I actually qualify for?

## The short version

The interest rate tells you what you'll pay each month. The APR tells you which offer is cheaper *if you keep it forever*. Neither tells you which is cheaper over the four or seven years you'll realistically hold it — that takes one division, and it's the one nobody does.

$3,000 in extra fees, $74.97 a month saved, month 40. Everything else is commentary.
