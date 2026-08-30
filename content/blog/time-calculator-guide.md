---
title: "How to Add and Subtract Hours and Minutes"
date: "2026-08-30"
description: "Adds and subtracts durations in hours, minutes and seconds, carrying correctly at sixty rather than a hundred."
thumbnail: "/assets/blog/time-calculator-guide.jpg"
coverAlt: "Editorial illustration representing the Time Calculator workflow."
author: "The Vootkit team"
type: "Guide"
category: "Everyday"
tags: "Everyday Tools, Productivity, Calculators"
---

Time is the one everyday quantity that is not base ten, and it catches people out constantly — because 1.5 hours and 1 hour 50 minutes look similar written down and are twenty minutes apart.

## What the Time Calculator does

Adds and subtracts durations in hours, minutes and seconds, carrying correctly at sixty rather than a hundred.

That carry is the whole reason to use it. Adding 45 minutes to 2:30 in your head is easy; adding six such entries from a timesheet without a slip is not.

Open the [Time Calculator](/tools/everyday/time-calculator/) and follow the settings and checks below.

## Where the confusion comes from

| Setting | What it means |
|---|---|
| Base | Sixty seconds to a minute, sixty minutes to an hour — not a hundred |
| 1.5 hours | 1 hour 30 minutes |
| 1.50 on a timesheet | Usually also 1 hour 30, but check the system |
| 1 hour 50 minutes | 1.83 hours in decimal, not 1.50 |
| Payroll | Most systems want decimal hours, so 7 h 45 m is entered as 7.75 |
| Negative results | Shown as negative rather than wrapping around midnight |

## How to use it

1. Enter each duration as hours, minutes and seconds.
2. Choose whether to add or subtract.
3. For payroll, convert to decimal: **minutes divided by 60**, so 45 minutes is 0.75.
4. Check the total against a rough mental estimate — a misplaced field is easier to catch that way than by re-reading.

## Practical advice

The decimal conversion is where timesheet money actually goes missing. 7 hours 30 minutes is 7.5, but 7 hours 15 minutes is 7.25, not 7.15 — and entering 7.15 costs you six minutes every time you do it. Over a year of daily entries that is several hours of unpaid work, lost to a conversion nobody checks. Divide the minutes by sixty; never write them after the decimal point.

## Common questions

### How do I convert minutes to decimal hours?

Divide by sixty. 15 minutes is 0.25, 20 is 0.33, 45 is 0.75. The error to avoid is writing the minutes straight after the decimal point — 7 hours 15 minutes entered as 7.15 rather than 7.25 quietly loses six minutes, and on a timesheet it does so every single day.

### Why not just use a normal calculator?

Because a normal calculator works in base ten and time does not. Adding 2:45 and 1:30 as 2.45 + 1.30 gives 3.75, which is neither 4 hours 15 minutes nor anything else meaningful. You would have to convert to decimal, add, then convert back — which is exactly the step this removes.

### Can it handle a result that goes past 24 hours?

Yes. It reports total elapsed duration rather than a clock time, so 20 hours plus 10 hours gives 30 hours rather than wrapping around to 6. That is the right behaviour for timesheets, project totals and anything cumulative, though it is not what you want if you are calculating an arrival time.

### What if subtracting gives a negative result?

It shows as negative rather than wrapping, which is deliberate — a negative duration usually means the inputs are the wrong way round, and silently converting it to a positive number would hide that. If you are calculating a shift that crosses midnight, add 24 hours to the finish time before subtracting.

## Useful next tools

- [Date Calculator](/tools/everyday/date-calculator/) — Days between dates, or add and subtract from a date.
- [Age & Date Difference](/tools/everyday/age-calculator/) — Exact age, or the gap between two dates.
- [Stopwatch](/tools/everyday/stopwatch/) — Precise stopwatch with lap times.
- [Time Zone Converter](/tools/everyday/timezone-converter/) — Compare a time across cities worldwide.
- [Unit Converter](/tools/everyday/unit-converter/) — Length, mass, temperature, area, volume, speed and data.
- [Salary Converter](/tools/tax/salary-converter/) — Hourly, weekly, monthly and annual, both ways.

Vootkit provides a browser calculator and educational guidance. Results depend on the values and units you enter, so verify important financial, academic, safety or professional decisions with an appropriate authoritative source.
