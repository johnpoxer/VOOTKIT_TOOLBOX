---
title: "How to Generate Random Numbers for Draws and Tests"
date: "2026-08-30"
description: "Generates numbers in a range you set, one or many, with an option to make every result unique."
thumbnail: "/assets/blog/random-number-generator-guide.jpg"
coverAlt: "Editorial illustration representing the Random Number Generator workflow."
author: "The Vootkit team"
type: "Guide"
category: "Everyday"
tags: "Everyday Tools, Productivity, Calculators"
---

There are two kinds of random number, and using the wrong one is the difference between a fair raffle and a security incident.

## What the Random Number Generator does

Generates numbers in a range you set, one or many, with an option to make every result unique.

It uses the browser’s general-purpose generator — the right tool for draws, sampling, testing and games, and the wrong one for anything an attacker would want to guess.

Open the [Random Number Generator](/tools/everyday/random-number-generator/) and follow the settings and checks below.

## Choosing the right generator

| Setting | What it means |
|---|---|
| This tool | Pseudorandom — deterministic algorithm, well distributed |
| Good for | Draws, teams, dice, test data, sampling, tie-breaks |
| Not for | Passwords, tokens, keys, session ids, anything secret |
| Range | Inclusive at both ends |
| Unique option | Requires the range to be at least as large as the count |
| Negative numbers | Allowed — the minimum can be below zero |

## How to use it

1. Set the minimum and maximum. **Both ends are included.**
2. Choose how many numbers you want. Asking for several at once gives you a single draw rather than several separate ones.
3. Turn on unique if you are drawing positions or lottery numbers rather than rolling a die repeatedly, since a die can and should repeat.
4. For anything security-related, use the **password generator** instead — it draws from a cryptographic source.

## Practical advice

Pseudorandom means the sequence is produced by an algorithm from a starting value, and anyone who learns that value can reproduce every number that follows. For a raffle nobody cares. For a password reset token, a promo code or a session identifier, it is the whole attack — and the mistake is common enough that it has caused real breaches. If a number needs to be unguessable rather than merely unpredictable to you, it needs a cryptographic generator.

## Common questions

### What does pseudorandom actually mean?

The numbers come from a deterministic algorithm seeded with a starting value, rather than from physical noise. The output passes statistical tests for randomness, which is what matters for draws and simulations, but it is reproducible in principle — so it should never protect anything.

### Can I use this to generate a password?

No. Use the password generator, which draws from the browser’s cryptographic source. The distinction sounds academic and is not: predictable generators used for tokens and reset codes have caused real, documented breaches, and the failure is invisible until somebody exploits it.

### Are the minimum and maximum included?

Yes, both ends are in range, so 1 to 6 can produce a 1 and a 6 as you would expect from a die. Off-by-one at the boundary is a classic source of quiet bias in home-made randomisers, which is why it is worth stating rather than leaving you to test it.

### Why can I not get unique numbers?

The range has to be at least as large as the count — you cannot draw ten unique numbers between 1 and 5, because there are only five to draw. Widen the range or reduce the count, or allow repeats if the picks are genuinely independent.

## Useful next tools

- [Password Generator](/tools/privacy/password-generator/) — Strong random passwords, generated on your device.
- [Random Picker](/tools/everyday/random-picker/) — Pick a winner fairly from a list.
- [UUID Generator](/tools/developer/uuid-generator/) — Random v4 UUIDs, as many as you need.
- [Hash Generator](/tools/developer/hash-generator/) — SHA-256, SHA-1 and SHA-512 of any text.
- [Password Strength Checker](/tools/privacy/password-strength/) — How strong a password is — checked locally.
- [Line Tools](/tools/text/line-tools/) — Sort, reverse, dedupe and shuffle lines.

Vootkit provides a browser calculator and educational guidance. Results depend on the values and units you enter, so verify important financial, academic, safety or professional decisions with an appropriate authoritative source.
