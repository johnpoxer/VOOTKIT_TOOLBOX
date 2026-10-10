---
title: "How to Make a Starting Soon Screen for Your Stream"
date: "2026-08-28"
description: "Make a starting scene that can be tested before a broadcast begins."
thumbnail: "/assets/blog/starting-soon-screen-guide.jpg"
coverAlt: "Editorial illustration representing the Starting Soon Screen workflow."
author: "The Vootkit team"
type: "Guide"
category: "Video"
tags: "Video, Streaming, Creator Tools"
updated: "2026-10-10"
---

Make a starting scene that can be tested before a broadcast begins.

Use the [Starting Soon Screen](/tools/video/starting-soon-screen/) alongside this illustrative example.

## A practical example

For a scheduled demonstration, include the topic and a realistic starting indication. Load the exported screen in a private OBS recording, check that its text fits, and switch from it to the presentation scene. A screen with a timer needs a browser source; a plain image uses an image source.

## Check the result

If the HTML countdown restarts when reloaded, test the source’s refresh behaviour before relying on the displayed time. Confirm microphone and background-audio levels independently of the visual screen.

## Try a comparison

Try the exported HTML with countdown set to zero, then with a short countdown. Check whether OBS reloads the file on a scene change. The chosen source behaviour can restart a timer, so test the transition you intend to use during the broadcast.

## What this does not establish

A holding screen does not start the stream or connect an account. OBS and the streaming service remain responsible for broadcasting.

[Report unclear guidance or a result that needs checking](/contact.html).
