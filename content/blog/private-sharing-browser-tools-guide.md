---
title: "Prepare Files, Screenshots and Links for Safer Sharing"
date: "2026-09-08"
description: "Remove unnecessary personal details, clean tracking links and check encrypted text without confusing privacy tools with guarantees."
thumbnail: "/assets/blog/remove-photo-metadata.jpg"
coverAlt: "Editorial illustration about removing metadata from a photograph."
author: "The Vootkit team"
type: "Guide"
category: "Privacy"
tags: [Security, Tools, Productivity]
relatedTools: [screenshot-redactor, metadata-remover, url-cleaner, file-checksum, text-encrypt, password-generator]
---

A screenshot can expose an email address in the corner. A photograph can contain location metadata. A copied link can include tracking parameters. These are different problems, so one “clean” operation rarely solves all of them.

Before sharing, decide what the recipient actually needs. Make a separate sharing copy, remove unnecessary information, export it, and inspect the exported file. Most Vootkit file tools process locally, but the destination where you eventually send the result has its own handling rules.

## Check visible information first

Open the image at a readable size. Look beyond the main subject: browser tabs, notifications, addresses, account balances, QR codes, reflections and filenames can reveal information too.

Use [Screenshot Redactor](/tools/privacy/screenshot-redactor/) for image redaction. Cover the complete sensitive region, including faint characters at its edges. Download the result and open that new file independently before attaching it to a message.

Suppose you are sharing an invoice screenshot to explain a layout problem. Keep the column headings and example amounts, but remove customer details, payment identifiers and notification previews. If the real values are unnecessary, a recreated example may be clearer than a heavily redacted image.

Do not assume blur is equivalent to removal. Check what the export actually contains, and avoid sending the editable source alongside the cleaned copy.

## Remove metadata separately

[Metadata Remover](/tools/privacy/metadata-remover/) re-encodes supported images. That is a different operation from covering visible text: hidden metadata and visible content require separate checks.

After processing, confirm orientation, colour appearance, dimensions and transparency. Keep the original privately if you need its capture date or other information later. Read the [photo metadata guide](/blog/remove-photo-metadata/) for a dedicated walkthrough.

Metadata removal does not remove an address photographed on a door, nor does it make a recognisable location anonymous. Inspect the pixels as well as the file properties.

## Clean links without breaking their purpose

Paste a URL into [URL Cleaner](/tools/privacy/url-cleaner/). It removes recognised tracking parameters, including common campaign tags. Review the output before opening or sharing it.

For example, a link containing `?id=42&utm_source=newsletter` should preserve the content identifier while removing the recognised campaign parameter. The cleaner does not know the business meaning of every site's query string, however. Compare the destination after cleaning and check that the intended page still opens.

Avoid using a private invitation or password-reset link as a test. Some links contain access credentials that are essential to their operation. Removing tracking parameters does not establish that a site is trustworthy or that a link contains no sensitive token.

## Compare checksums when file identity matters

[File Checksum](/tools/privacy/file-checksum/) computes a digest of a file. Compare it with a reference digest obtained through a trusted route, using the same algorithm.

A mismatch tells you that the bytes differ; it does not explain why. Re-exporting an image, changing metadata or receiving an incomplete download can all change the digest. A match does not prove that the content is safe if the reference came from the same untrusted source.

Keep filenames and digests together when passing a file between teammates. That prevents confusion between an original, a cleaned copy and a later revision.

## Use encryption with a recovery plan

[Text Encryptor](/tools/privacy/text-encrypt/) produces text in Vootkit's `VK1:` format. Keep that complete output, including the prefix, and test decryption on a harmless example before depending on it for an important message.

The current implementation uses AES-GCM with a passphrase-derived key. That describes the mechanism, not an independent security audit. Losing the passphrase can make the text unrecoverable, and copying ciphertext without all its characters can also prevent decryption.

Send the passphrase through a separate agreed channel. Do not place it in the same screenshot as the encrypted message.

## Understand password tools' limits

[Password Generator](/tools/privacy/password-generator/) uses browser cryptographic randomness. Choose a unique result for each account and store it securely. Its character-set options define the pool of possible characters; check the generated result against a site's specific requirements.

[Password Strength](/tools/privacy/password-strength/) uses a simplified estimate based on length and character classes. Its displayed cracking time is not a promise and does not reliably account for familiar phrases or previously exposed passwords. Use made-up samples when exploring the meter.

[Passphrase Generator](/tools/privacy/passphrase-generator/) and [TOTP Generator](/tools/privacy/totp-generator/) serve different purposes. A TOTP secret is a reusable authentication secret, not just a disposable six-digit code. Keep it out of shared demonstrations, chat logs and screenshots.

### Does local processing mean there are no risks?

No. The device, browser extensions, clipboard, downloads and eventual recipient still matter. Local processing limits one part of the data journey.

### Should I delete the original immediately?

First confirm that the cleaned export is complete and usable. Keep or remove the original according to your actual recordkeeping needs.

### What is the final check?

Open the exact attachment you intend to send, inspect its content, and confirm the recipient. A correct edit does not help if you attach the original by mistake.
