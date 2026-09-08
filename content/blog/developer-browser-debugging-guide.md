---
title: "A Browser Debugging Workflow for JSON, Tokens, Encodings and Code"
date: "2026-09-08"
description: "Choose the right developer utility, protect sample data and distinguish formatting, decoding and syntax checks from real validation."
thumbnail: "/assets/blog/format-json-privately.jpg"
coverAlt: "Illustrated developer workspace with formatted structured data."
author: "The Vootkit team"
type: "Guide"
category: "Developer"
tags: [Data, Security, Tools]
relatedTools: [json-formatter, base64, jwt-decoder, regex-tester, url-encoder, text-diff]
---

When an integration fails, identify which layer is broken before changing the payload. A malformed JSON document, incorrectly encoded URL and rejected authentication token can produce similar symptoms while requiring completely different repairs.

Use synthetic or sanitised examples. Keep production credentials out of screenshots, shared notes and debugging samples. Vootkit's developer utilities work on specific representations; they do not know the complete contract of the API you are calling.

## Begin with a reproducible input

Save the smallest input that still demonstrates the failure. Record the expected result, actual result and any relevant content type. Replace secrets with obvious placeholders while preserving the structure.

For example, keep a string value as `"REDACTED_TOKEN"` rather than removing its quotation marks. A sanitised example that introduces a new syntax error no longer isolates the original problem.

Change one thing at a time. If you simultaneously reorder fields, convert types and change encoding, a successful retry will not tell you which correction mattered.

## Separate JSON syntax from API requirements

Open [JSON Formatter](/tools/developer/json-formatter/) to validate and format the document. JSON syntax requires quoted property names, double-quoted strings and no trailing commas. See the [dedicated JSON guide](/blog/format-json-privately/) for examples.

After syntax passes, check the receiving schema. `{"quantity":"3"}` and `{"quantity":3}` can both parse, but the API may accept only one. A missing required field will not necessarily be detected by a general JSON parser.

Keep large integer identifiers as strings when the system specifies that representation. Parsing and serialising through JavaScript numbers can lose precision outside the safe integer range.

## Decode only the layer you intend to inspect

[Base64 Encoder / Decoder](/tools/developer/base64/) changes representation; Base64 is not encryption. Anyone with the encoded text can generally decode it without a secret.

[URL Encoder / Decoder](/tools/developer/url-encoder/) serves another purpose. Encoding an individual query value is different from encoding a complete URL. If an already encoded value is encoded again, percent signs can become `%25`, changing what the destination receives.

Use an example containing a space, an ampersand and a non-ASCII character. Inspect how the destination expects that value to be represented before replacing the original. Avoid repeatedly decoding unfamiliar input until it “looks right”.

## Inspect tokens without treating them as trusted

[JWT Decoder](/tools/developer/jwt-decoder/) lets you inspect a token's encoded header and payload. Decoding is not signature verification. A displayed claim does not establish who issued the token or whether the server should accept it.

Use a made-up token when learning the interface. A real bearer token can grant access while valid, so do not paste it into a shared bug report.

If the payload contains timestamps, use [Timestamp Converter](/tools/developer/timestamp-converter/) to inspect the relevant values and units. Confirm seconds versus milliseconds and the timezone used by the receiving system. Expiry, issuer, audience and signature checks belong in the actual authentication implementation.

## Test patterns with positive and negative cases

Use [Regex Tester](/tools/developer/regex-tester/) on short representative inputs. Include a match you expect, a near miss and an empty value. A pattern that matches one example may still accept many unintended strings.

JavaScript regular-expression behaviour is not identical to every server language. Re-run the chosen pattern in the target runtime. Avoid huge inputs or pathological patterns that can monopolise a browser tab.

Write down what the pattern is intended to recognise. That description helps future reviewers distinguish a deliberate boundary from a missing case.

## Format source on a copy

Vootkit provides [XML Formatter](/tools/developer/xml-formatter/), [HTML Formatter](/tools/developer/html-formatter/), [CSS Formatter](/tools/developer/css-formatter/) and [SQL Formatter](/tools/developer/sql-formatter/). These are lightweight text-layout utilities, not complete language parsers or production compilers.

Whitespace can be meaningful in markup, strings and embedded content. Compare the result with [Text Diff](/tools/text/text-diff/) and test it in the real application before replacing a source file. Do not treat a formatted SQL statement as proof that it is safe or valid for your database.

## Use generators and checks for their actual scope

[UUID Generator](/tools/developer/uuid-generator/) supplies identifiers; it does not register records in your database. [Hash Generator](/tools/developer/hash-generator/) creates digests, which are different from encryption.

[Cron Generator](/tools/developer/cron-generator/) prepares an expression. It does not schedule or execute a job. Confirm the scheduler's field convention, timezone and daylight-saving behaviour separately.

[Card Number Validator](/tools/developer/credit-card-validator/) and [IBAN Validator](/tools/developer/iban-validator/) check supported structural rules. They cannot prove account ownership, available funds or that a payment will succeed. Use synthetic samples when testing them.

### What should go in the bug report?

Include the sanitised input, expected output, actual output and the smallest reproduction. Exclude credentials and unrelated customer data.

### Can I trust a decoded token?

Only after the receiving system performs the required verification. Decoding alone is inspection.

### When is the repair finished?

When the original failing case and relevant edge cases pass in the actual consuming system, not merely when a utility displays a neat result.
