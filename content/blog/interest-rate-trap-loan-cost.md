---
title: "The Interest Rate Trap: Why 3.3% Costs €1,845 on One Loan and €152,086 on Another"
date: "2026-07-31"
description: "The same rate difference produces wildly different totals depending on size and term. Here's the arithmetic, worked through on a car loan, a personal loan and a mortgage."
thumbnail: "/assets/blog/interest-rate-trap.jpg"
author: "Mr John Prosper"
---

*General information, not financial advice. Rates, fees and lending rules vary by country and lender — check the actual offer documents and speak to a licensed adviser before borrowing.*

---

You'll see the claim everywhere: *a small percentage difference costs you thousands.* It's true. It's also close to useless, because "thousands" depends entirely on how much you borrow and for how long.

Take the same rate gap — 4.5% versus 7.8%, a difference of 3.3 percentage points — and apply it three ways:

| Loan | Extra per month | Extra interest, total |
|---|---|---|
| €10,000 personal loan over 3 years | **€15** | **€539** |
| €20,000 car loan over 5 years | **€31** | **€1,845** |
| €250,000 mortgage over 25 years | **€507** | **€152,086** |

Same 3.3%. The total ranges from a decent night out to more than half the original loan.

That's the actual lesson. Not "shop around" — everyone says that — but *knowing how hard to shop*. Spending a weekend chasing a better mortgage rate is obviously worth it. Spending a weekend chasing a better rate on a €10,000 loan is worth €539, which may or may not be your best use of a weekend.

## The formula everything comes from

Monthly payment on an amortising loan:

```
M = P × r ÷ (1 − (1 + r)⁻ⁿ)

P = amount borrowed
r = monthly rate (annual rate ÷ 100 ÷ 12)
n = number of months
```

Total interest is then `M × n − P`.

You don't need to compute it by hand — the [Loan Calculator](/tools/finance/loan-calculator/) does it, and the [Auto Loan Calculator](/tools/finance/auto-loan-calculator/) is set up for vehicle terms. But it's worth seeing the shape, because two things in it explain almost everything people get wrong.

**Interest compounds on the balance you still owe.** Early payments are mostly interest, late payments mostly principal. That's why a longer loan costs so much more than it looks like it should.

**The exponent is `n`.** Time is in the exponent, amount is a plain multiplier. Doubling the amount doubles the interest. Doubling the *term* more than doubles it.

## Where the money actually goes

Take the €250,000 mortgage at 7.8%:

- Monthly payment: **€1,897**
- Paid over 25 years: **€568,961**
- Of which interest: **€318,961**

You borrow a quarter of a million and repay well over half a million. At 4.5% the interest is €166,874 instead — still substantial, but €152,086 less.

For most people this is the single largest financial decision of their life, and the rate is fixed at a moment when they're stressed, tired and being told to sign. Working it out beforehand costs an hour.

## The trap inside the trap: term length

Rate gets the attention. Term quietly does comparable damage, and it's the one people volunteer for.

Same €20,000 car loan at the same 7.8%:

| Term | Monthly | Total interest |
|---|---|---|
| 5 years | €404 | €4,217 |
| 7 years | €310 | €6,018 |

Stretching to 7 years saves **€94 a month** and costs **€1,801 extra**.

Dealers and lenders lead with the monthly number for exactly this reason. €310 sounds more affordable than €404, and it is — per month. Over the loan it's 43% more interest.

There's a second problem specific to cars: a 7-year loan on a vehicle that depreciates fast means years of owing more than the car is worth. If it's written off or you need to sell, you cover the gap yourself.

**Rule of thumb worth holding onto:** if you can only afford the thing on the longest available term, you probably can't afford the thing.

## What the advertised rate leaves out

The headline rate isn't the cost of the loan.

**APR vs nominal rate.** APR is meant to include compulsory fees; the nominal rate doesn't. A 6.9% loan with €600 of arrangement fees can cost more than a 7.4% loan with none. Compare APR to APR, and if a lender only quotes the nominal rate, ask why.

**Arrangement and origination fees.** Sometimes added to the balance, so you pay interest on the fee for the life of the loan.

**Payment protection insurance.** Often presented as part of the package rather than an option. Price it separately and decide separately.

**Early repayment charges.** Some loans penalise paying off early — which matters if your circumstances might improve. Worth checking before, not after.

**Variable rates.** A low starting rate that can move. Ask what the payment looks like if the rate rises 2 points, and whether you'd still be comfortable.

## Before you borrow: can you carry it?

The rate decides what the loan costs. Your income decides whether you can live with it.

A blunt but useful check: total debt payments against take-home pay. Many lenders get uncomfortable above roughly 36%, and that's their tolerance, not necessarily yours.

Work from your actual take-home, not gross — [Take-Home Pay](/tools/tax/paycheck-calculator/) if you're employed, [Self-Employment Tax](/tools/tax/self-employment-tax/) if you're not, since the gap between the two is where a lot of over-borrowing starts. Then see whether the payment fits: [50/30/20 Budget Calculator](/tools/finance/budget-calculator/).

For a mortgage specifically, [Home Affordability](/tools/realestate/home-affordability/) works backwards from income to a sensible price, and [Closing Costs Estimator](/tools/realestate/closing-costs/) covers the money you need on top of the deposit — the part that catches first-time buyers.

If you're weighing buying against continuing to rent, [Rent vs Buy](/tools/realestate/rent-vs-buy/) puts both on the same footing rather than comparing a mortgage payment to rent, which flatters buying.

## If you already have the loan

Two levers, both real.

**Overpay.** Every extra payment goes straight at the principal, so it removes all the future interest that principal would have generated. On a long mortgage the effect is disproportionate — [Mortgage Payoff](/tools/realestate/mortgage-payoff/) shows what a modest regular overpayment does to the end date.

**Refinance.** Worth it when the interest saved exceeds the cost of switching. That's a break-even, not a feeling: [Refinance Break-Even](/tools/finance/refinance-calculator/) tells you how many months until you're ahead. If you'd move again before then, it isn't worth it.

For credit card debt the maths is harsher and the rates are far higher — [Credit Card Payoff](/tools/finance/credit-card-payoff/) shows how long minimum payments actually take, which is usually the number that changes behaviour.

## Comparing offers properly

Line the candidates up on four numbers, not one:

1. **APR**, not the nominal rate
2. **Monthly payment** — can you pay it every month, including bad months?
3. **Total repaid** — payment × months, plus any fees
4. **Total interest** — total repaid minus what you borrowed

Number 3 is the one lenders don't advertise and the one that decides which offer is actually cheaper. Two loans with near-identical monthly payments can differ by thousands once the term differs.

[Loan Calculator](/tools/finance/loan-calculator/) will give you all four for each offer. Run every one you're considering and put them side by side before you talk to anybody.

## Questions

**Is a lower monthly payment ever the right choice?**
Yes — if the alternative genuinely strains your budget. Paying more interest for a payment you can reliably meet beats defaulting on a cheaper loan. Just make the trade knowingly rather than because it was the number on the form.

**How much difference does 1% make?**
Depends on size and term, which is the whole point. On the €250,000 25-year mortgage above, roughly €46,000. On a €10,000 3-year loan, about €160.

**Should I always pick the shortest term I can afford?**
Usually cheaper, yes. But leave margin — a term so short that any bad month causes a missed payment is a false economy. Aim for comfortably affordable, then overpay when you can.

**Does my credit score really change the rate?**
Materially, yes. The gap between the best and worst rates offered for the same loan is often several percentage points — which, as the table at the top shows, is the difference between €539 and €152,086 depending on what you're borrowing for.

**Is a 0% offer really free?**
Sometimes. Check what happens when it ends, whether there's a fee to take it, and whether the cash price would have been lower without the finance. "0% finance" and "discount for paying outright" are frequently the same money.

---

*Written by Mr John Prosper. Figures in euro, calculated with the standard amortisation formula above; the method applies in any currency. This explains a calculation, not a recommendation.*

## Related tools

- [Loan Calculator](/tools/finance/loan-calculator/) — payment, total repaid, total interest
- [Auto Loan Calculator](/tools/finance/auto-loan-calculator/) — vehicle terms and deposits
- [Refinance Break-Even](/tools/finance/refinance-calculator/) — when switching pays for itself
- [Credit Card Payoff](/tools/finance/credit-card-payoff/) — the cost of minimum payments
- [Mortgage Calculator](/tools/finance/mortgage-calculator/) · [Mortgage Payoff](/tools/realestate/mortgage-payoff/)
- [Home Affordability](/tools/realestate/home-affordability/) · [Closing Costs](/tools/realestate/closing-costs/) · [Rent vs Buy](/tools/realestate/rent-vs-buy/)
- [Take-Home Pay](/tools/tax/paycheck-calculator/) · [50/30/20 Budget](/tools/finance/budget-calculator/)

**Related reading:** [Should You Raise Your Deductible?](/blog/insurance-deductible-break-even/) — the same break-even thinking, applied to insurance.
