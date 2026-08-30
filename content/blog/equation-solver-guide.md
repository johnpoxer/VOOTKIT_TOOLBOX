---
title: "How to Solve Linear and Quadratic Equations"
date: "2026-08-30"
description: "Solves ax² + bx + c = 0 for x, giving both roots along with the discriminant that determines what kind of roots they are."
thumbnail: "/assets/blog/equation-solver-guide.jpg"
coverAlt: "Editorial illustration representing the Equation Solver workflow."
author: "The Vootkit team"
type: "Guide"
category: "Everyday"
tags: "Everyday Tools, Productivity, Calculators"
---

The quadratic formula is the piece of school mathematics most adults half-remember: something with a minus b, something with a square root, something divided by 2a. The half that gets forgotten is the part under the root, which decides whether there is an answer at all.

## What the Equation Solver does

Solves ax² + bx + c = 0 for x, giving both roots along with the discriminant that determines what kind of roots they are.

The discriminant, b² − 4ac, is the number worth reading first. Positive means two real roots, zero means one repeated root, negative means the parabola never touches the axis and the roots are complex.

Open the [Equation Solver](/tools/everyday/equation-solver/) and follow the settings and checks below.

## What the numbers mean

| Setting | What it means |
|---|---|
| Formula | x = (−b ± √(b² − 4ac)) ÷ 2a |
| Discriminant > 0 | Two distinct real roots — the curve crosses the x-axis twice |
| Discriminant = 0 | One repeated root — the curve touches the axis and turns |
| Discriminant < 0 | No real roots — the curve misses the axis entirely |
| a = 0 | Not a quadratic; it collapses to the straight line bx + c = 0 |
| Sum and product | Roots always sum to −b/a and multiply to c/a — a quick sanity check |

## How to use it

1. Rearrange your equation into the form ax² + bx + c = 0 first. Everything must be on one side.
2. Enter a, b and c **with their signs** — a missing minus is the usual cause of a wrong answer.
3. Read the discriminant before the roots.
4. Check your answer: the two roots should add to −b/a.

## Practical advice

Always rearrange before entering anything. x² + 2x = 8 is not a = 1, b = 2, c = 8 — the eight has to move across, giving c = −8, and the sign flip changes the roots completely. This single step accounts for most wrong answers people get from a quadratic solver, because the equation as written looks close enough to the standard form to type straight in.

## Common questions

### What does a negative discriminant mean?

That the parabola never crosses the x-axis, so there is no real value of x that satisfies the equation. The roots still exist as complex numbers involving the square root of a negative, which matters in electrical engineering and signal processing but usually means "no solution" in a practical context.

### What if a is zero?

Then it is not a quadratic at all — the x² term vanishes and you are left with the straight line bx + c = 0, which has the single solution x = −c/b. Dividing by 2a in the formula would also mean dividing by zero, which is why the equation type has to change rather than the arithmetic being pushed through.

### How do I get my equation into the right form?

Move everything to one side so the other side is zero, then collect like terms. x² + 2x = 8 becomes x² + 2x − 8 = 0, giving a = 1, b = 2, c = −8. Skipping this and typing the numbers as they appear is the most common way to get a confidently wrong pair of roots.

### Is there a quick way to check the answer?

Yes, and it is worth doing. The two roots always sum to −b/a and multiply to c/a. For x² + 2x − 8 = 0 the roots are 2 and −4: they sum to −2, which is −b/a, and multiply to −8, which is c/a. Both checks passing means the arithmetic is almost certainly right.

## Useful next tools

- [Math Solver](/tools/everyday/math-solver/) — Evaluate an arithmetic expression with brackets and powers.
- [Fraction Calculator](/tools/everyday/fraction-calculator/) — Add, subtract, multiply and divide fractions, simplified.
- [Percentage Calculator](/tools/everyday/percentage-calculator/) — Percent of, is-what-percent, and percentage change.
- [Unit Converter](/tools/everyday/unit-converter/) — Length, mass, temperature, area, volume, speed and data.
- [CSV to Chart](/tools/data/csv-to-chart/) — Turn two columns into a bar or line chart.
- [Word & Character Counter](/tools/text/word-counter/) — Live counts, sentences and reading time.

Vootkit provides a browser calculator and educational guidance. Results depend on the values and units you enter, so verify important financial, academic, safety or professional decisions with an appropriate authoritative source.
