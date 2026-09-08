---
title: "Build a Consistent Colour Palette, Gradient and Shadow in CSS"
date: "2026-09-08"
description: "Choose colours by interface role, convert values, create gradients and shadows, and check the finished design in context."
thumbnail: "/assets/blog/color-from-image-guide.jpg"
coverAlt: "Editorial artwork about selecting colours from an image."
author: "The Vootkit team"
type: "Guide"
category: "Design"
tags: [Accessibility, Developer, Tools]
relatedTools: [color-converter, palette-generator, gradient-generator, shadow-generator, contrast-checker]
---

A usable palette is more than a row of attractive swatches. A page needs colours with clear jobs: body text, page background, links, controls, borders and status messages. Start with those roles, then use design tools to explore values and produce CSS.

For a small website, work on a real section containing a heading, paragraph, link and button. That sample gives you a better test than a collection of disconnected decorative shapes.

## Choose roles before generating variations

Write down the elements that need distinct treatment. A booking form, for example, needs readable labels, a primary action, a visible field boundary and a clear error message. It may not need five accent colours.

Use [Palette Generator](/tools/design/palette-generator/) to explore combinations around the intended visual direction. Treat its output as candidates rather than a complete design system. Assign each selected value a purpose before using it across the page.

If a pale accent is attractive but hard to read, reserve it for a background or decorative area and choose a darker related value for text. Check the pair rather than assuming colours from the same palette work in every arrangement.

## Convert colours without changing their meaning

[Colour Converter](/tools/design/color-converter/) helps move between supported colour representations. Hex and RGB are different ways to describe channel values; changing the notation should not be used as a way to “improve” the colour.

For example, `#336699` corresponds to RGB channel values 51, 102 and 153. Keeping both in a handoff note can help teammates who use different design applications. Copy the complete output, including punctuation where required by the destination.

When transparency is involved, evaluate the colour over its actual background. A translucent overlay can look different on every image beneath it. Matching the opaque swatch does not establish that the composed result matches.

## Keep reusable values together

Store approved values in your project's existing theme or CSS variables. Give them names based on their role rather than scattering unrelated hex values across individual components.

For a simple mockup, roles might include `--page-background`, `--body-text` and `--action-colour`. The exact naming convention matters less than consistent use. Follow the convention already used by the website instead of introducing a second competing one.

Change the shared value and inspect all affected components. A colour adjustment that improves a button can also change a link or badge elsewhere if those elements share the same token.

## Build gradients around the content

Open [Gradient Generator](/tools/design/gradient-generator/) and choose the colours and direction needed for the actual placement. Copy the generated CSS into the component being designed and view it at the intended size.

For a wide banner, a gradient may spread gently across the background. On a narrow card, the same stops can place a very light area directly underneath the text. Check both dimensions.

Avoid using a gradient to rescue unclear hierarchy. If the title, description and action are competing, adjust their layout and spacing before adding more visual effects. Where text crosses a gradient, inspect contrast over the least favourable part.

## Use shadows to explain grouping

[Shadow Generator](/tools/design/shadow-generator/) helps tune the offset, blur, spread and colour of a CSS shadow. Make a decision about what the shadow communicates: a raised panel, an open popover or a subtle boundary between surfaces.

A shadow applied equally to every paragraph and card loses that distinction. Start with one important surface and inspect it against the page background. A dark, wide shadow that looks dramatic in isolation may make a dense mobile layout difficult to scan.

Use the actual component size when judging the result. A small button and a full-width panel will not necessarily look balanced with identical settings.

## Test colours in the finished states

Run text/background pairs through [Contrast Checker](/tools/accessibility/contrast-checker/), then review hover, focus, selected and error states. Read the [accessibility checking guide](/blog/accessibility-checks-before-publishing/) for the numerical contrast criteria and the checks a palette tool cannot perform.

Consider a form where the normal submit button is clear but the disabled version is almost indistinguishable from the page. The user still needs to understand that a control exists and what must happen before it becomes available. Add useful instructions rather than relying on colour alone.

Also check icons beside labels and text placed over images. A passing body-text pair does not validate every other element in the interface.

## Hand off the decision, not just the swatch

Record the role, approved value and an example of its use. Include the chosen gradient or shadow CSS and a small note about where it belongs. This prevents teammates from applying decorative values to essential instructions.

Revisit the sample with realistic content before signing off. Longer labels, an error message and a second language can reveal problems hidden by a short placeholder.

### Does palette generation guarantee accessibility?

No. Accessibility depends on combinations, content and behaviour. Check each meaningful pairing and interaction in context.

### Why does a translucent colour look wrong?

Its appearance includes the background beneath it. Verify both layers and the opacity value.

### Should every component use a shadow?

Only if it serves the intended hierarchy. Spacing, borders and background changes may provide a clearer distinction with less visual noise.
