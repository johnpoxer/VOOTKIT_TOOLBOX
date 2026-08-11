/* workflow.test.js — chaining several tools into one run.
 *
 * The failure that matters is a chain that LOOKS valid and dies halfway. A
 * four-step workflow that stops on step three has already cost real time, so
 * the whole sequence is checked before anything runs, and the checks are what
 * this file exercises.
 */
"use strict";
const assert = require("assert");
global.window = global;
const W = require("../assets/js/workflow.js");
const D = require("../data/tool-flow.js");
const VK = require("../data/catalog.js");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); pass++; };

/* --- what kind of file is this -------------------------------------------- */
eq(W.kindOfFile("a.pdf", "application/pdf"), "pdf", "pdf by mime");
eq(W.kindOfFile("a.pdf", ""), "pdf", "pdf by extension alone");
eq(W.kindOfFile("a.PNG", ""), "image", "extension matching ignores case");
eq(W.kindOfFile("clip.mp4", "video/mp4"), "video", "video");
eq(W.kindOfFile("song.mp3", ""), "audio", "audio");
eq(W.kindOfFile("notes.txt", "text/plain"), "", "an unsupported kind is blank, not guessed");

/* --- a step must accept what reached it ----------------------------------- */
ok(W.kindAccepted("application/pdf,.pdf", "pdf"), "a pdf tool takes a pdf");
ok(!W.kindAccepted("application/pdf,.pdf", "image"), "a pdf tool refuses an image");
ok(W.kindAccepted("image/*", "image"), "an image tool takes an image");
ok(!W.kindAccepted("image/*", "video"), "an image tool refuses a video");
ok(!W.kindAccepted("", "pdf"), "an empty accept takes nothing");
ok(!W.kindAccepted("image/*", ""), "an unknown kind matches nothing");

/* --- the type changes as the chain runs ----------------------------------- */
/* This is the whole reason validation cannot work on tool ids alone: PDF to
   JPG turns a PDF into an image, so what may legally follow it is completely
   different from what may follow an in-place tool. */
eq(W.outputOf(D.flow, "pdf-to-jpg", "pdf"), "image", "pdf-to-jpg emits an image");
eq(W.outputOf(D.flow, "jpg-to-pdf", "image"), "pdf", "jpg-to-pdf emits a pdf");
eq(W.outputOf(D.flow, "rotate-pdf", "pdf"), "pdf", "an in-place tool hands back what it took");
eq(W.outputOf(D.flow, "not-a-tool", "pdf"), "pdf", "an unknown id does not change the kind");

/* --- validating a whole chain --------------------------------------------- */
{
  const good = W.validate(D, ["rotate-pdf", "pdf-watermark"], "pdf");
  ok(good.ok, "a legal pdf chain validates: " + (good.why || ""));
  eq(good.endKind, "pdf", "and reports what comes out");

  /* jpg-to-pdf takes an image and emits a PDF, so a PDF tool may follow it —
     the exact case that tool ids alone cannot decide. */
  const crossed = W.validate(D, ["jpg-to-pdf", "rotate-pdf"], "image");
  ok(crossed.ok, "a chain that changes type mid-way is legal when the next step follows it: " + (crossed.why || ""));
  eq(crossed.endKind, "pdf", "and the end type follows the change");

  /* The same chain in reverse is not: once it is a PDF, an image tool cannot
     open it, even though both tools are individually fine. */
  ok(!W.validate(D, ["jpg-to-pdf", "resize-image"], "image").ok,
     "an image tool cannot follow a step that turned the file into a PDF");

  const broken = W.validate(D, ["resize-image"], "pdf");
  ok(!broken.ok, "an image tool cannot open a pdf");
  ok(/cannot take/.test(broken.why), "and the reason names the mismatch: " + broken.why);

  const late = W.validate(D, ["rotate-pdf", "resize-image"], "pdf");
  ok(!late.ok, "a mismatch on step two is caught before anything runs");
  eq(late.step, 1, "and the failing step is identified");

  ok(!W.validate(D, [], "pdf").ok, "an empty chain is not runnable");
  ok(!W.validate(D, ["ghost-tool"], "pdf").ok, "a retired tool in a saved chain is caught");
}

/* --- the step picker ------------------------------------------------------ */
{
  const pdf = W.stepChoices(D, "pdf");
  ok(pdf.length >= 5, "there are pdf steps to choose from, got " + pdf.length);
  ok(pdf.every((c) => D.flow[c.id].w), "every offered step has a process() to call");
  ok(pdf.every((c) => W.kindAccepted(D.flow[c.id].a, "pdf")), "every offered step takes a pdf");
  ok(pdf.every((c) => (VK.find(c.id) || {}).status === "live"), "nothing coming-soon is offered");

  const img = W.stepChoices(D, "image");
  ok(img.length >= 5, "there are image steps too");
  ok(!img.some((c) => c.id === "rotate-pdf"), "pdf tools are not offered for an image");

  eq(W.stepChoices(D, "").length, 0, "an unknown kind offers nothing rather than everything");
  ok(!W.stepChoices(D, "pdf", "rotate-pdf").some((c) => c.id === "rotate-pdf"),
     "the step just added is not offered again immediately");
}

/* --- only genuinely runnable tools are workflow steps ---------------------- */
{
  const wf = Object.keys(D.flow).filter((id) => D.flow[id].w);
  ok(wf.length >= 40, "a useful number of tools can be steps, got " + wf.length);
  /* The widget-shaped tools were scraped for their accept string and cannot be
     called headlessly. Offering one would fail at run time, after the user had
     already waited through the earlier steps. */
  const scrapedButOffered = Object.keys(D.flow).filter((id) => D.flow[id].s && D.flow[id].w);
  eq(scrapedButOffered.length, 0,
     "no scraped widget tool is offered as a step: " + scrapedButOffered.join(", "));
}

console.log(`workflow: ${pass} assertions passed`);

/* ---------------------------------------------------------------------------
 * SETTINGS TRAVEL WITH THE STEP.
 *
 * A workflow that ran everything on defaults was a shortcut, not a workflow —
 * "rotate this PDF" is useless if you cannot say by how much. Steps are
 * {id, opts} now, and the two things worth pinning down are that a step's
 * chosen options actually reach process(), and that a workflow saved before
 * settings existed still runs.
 * ------------------------------------------------------------------------- */
{
  /* Old shape: a bare id. New shape: an object. run() has to take both, or
     every workflow anyone saved yesterday breaks silently today. */
  const src = require("fs").readFileSync(
    require("path").join(__dirname, "..", "assets/js/workflow.js"), "utf8");
  ok(/typeof st === 'string' \? st : st\.id/.test(src),
     "run() still accepts a plain id, so saved workflows from before settings keep working");
  ok(/Object\.assign\(defaults\(spec\), chosen \|\| \{\}\)/.test(src),
     "chosen settings are layered OVER the tool's defaults, never instead of them");

  /* Layering matters: a step that sets one option must not blank the others. */
  const spec = { options: [{ k: "deg", def: 90 }, { k: "which", def: "all" }] };
  const merged = Object.assign(W.defaults(spec), { deg: 180 });
  eq(merged.deg, 180, "the chosen value wins");
  eq(merged.which, "all", "and every option the user did not touch keeps its default");

  eq(W.defaults({ options: [] }), {}, "a tool with no options contributes none");
  eq(W.defaults({}), {}, "a spec with no options array does not throw");
}

/* A saved workflow is only useful if it is recognisable. */
{
  const D2 = { names: { "rotate-pdf": "Rotate PDF", "pdf-watermark": "PDF Watermark" } };
  eq(W.describe(D2, [{ id: "rotate-pdf" }, { id: "pdf-watermark" }]),
     "Rotate PDF → PDF Watermark", "the default name describes the chain");
  eq(W.describe(D2, []), "", "an empty chain describes as nothing");
}
console.log(`workflow + settings: ${pass} total assertions passed`);

/* ---------------------------------------------------------------------------
 * TEMPLATES AND THE PRO GATE.
 *
 * A template that names a retired tool is worse than no template: it fails the
 * moment somebody trusts it. And a gate that fails CLOSED would refuse a
 * paying customer whenever a network call hiccups, which is the one failure
 * mode a paid feature cannot have.
 * ------------------------------------------------------------------------- */
{
  ok(W.TEMPLATES.length >= 4, "there are templates to start from, got " + W.TEMPLATES.length);

  /* Every step of every template must still exist AND still be runnable. */
  W.TEMPLATES.forEach(function (t) {
    t.steps.forEach(function (id) {
      ok(D.flow[id], t.id + " names a tool that is in the flow map: " + id);
      ok(D.flow[id] && D.flow[id].w, t.id + " names a tool that can actually run: " + id);
      ok((VK.find(id) || {}).status === "live", t.id + " names a live tool: " + id);
    });
    /* And the chain has to typecheck against its own declared starting kind,
       or the template hands the user a workflow that will not validate. */
    const v = W.validate(D, t.steps, t.kind);
    ok(v.ok, t.id + " is a chain that validates end to end: " + (v.why || ""));
    ok(t.why && t.why.length > 20, t.id + " explains itself in a sentence");
  });

  /* Offered templates are filtered by what the user actually has. */
  const forPdf = W.templatesFor(D, "pdf");
  ok(forPdf.length >= 1, "a PDF gets PDF templates");
  ok(forPdf.every((t) => t.kind === "pdf"), "and nothing else is offered for it");
  ok(W.templatesFor(D, "video").every((t) => t.kind === "video"), "same for video");
  eq(W.templatesFor(D, "nonsense").length, 0, "an unknown kind is offered nothing");
  ok(W.templatesFor(D).length >= 4, "with no kind, everything runnable is offered");

  /* A template naming a broken tool must disappear rather than be shown. */
  const brokenD = { flow: Object.assign({}, D.flow), names: D.names };
  delete brokenD.flow[W.TEMPLATES[0].steps[0]];
  ok(W.templatesFor(brokenD).length < W.templatesFor(D).length,
     "a template whose tool has gone is withheld, not shown and then failed");
}

/* The gate's failure direction, which is the whole design of it. */
{
  const mkAuth = (plan) => ({
    enabled: true,
    getUser: async () => ({ id: "u1" }),
    client: async () => ({ from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { plan } }) }) }) }) })
  });
  const run = async () => {
    ok(await W.isPro({}), "no auth module at all — fails OPEN");
    ok(await W.isPro({ VKAuth: { enabled: false } }), "auth disabled — fails OPEN");
    ok(!(await W.isPro({ VKAuth: mkAuth("free") })), "a free account is gated");
    ok(await W.isPro({ VKAuth: mkAuth("creator_pro") }), "creator_pro may run");
    ok(await W.isPro({ VKAuth: mkAuth("creator_teams") }), "creator_teams may run");
    ok(await W.isPro({ VKAuth: { enabled: true, getUser: async () => { throw new Error("net"); } } }),
       "a lookup that throws lets the run through — never refuse a payer over a network blip");
    ok(!(await W.isPro({ VKAuth: { enabled: true, getUser: async () => null } })),
       "signed out is gated, since there is no plan to check");
    console.log(`workflow + templates + gate: ${pass} total assertions passed`);
  };
  run();
}

/* ---------------------------------------------------------------------------
 * CANCELLATION AND RETRY.
 *
 * Two ways to get this wrong, both of which cost trust rather than data:
 *   1. Offering "retry" for a failure that cannot succeed on a second attempt.
 *      The button teaches the user it is decorative.
 *   2. Retrying from the top. A four-minute encode repeated because step four
 *      had a bad setting is the reason people stop using a tool.
 * ------------------------------------------------------------------------- */
{
  /* Classification defaults to PERMANENT. An unrecognised failure is far more
     likely to be a bad file than a blip, and a wrong "retry" costs more than a
     missing one. */
  eq(W.classifyError("Failed to fetch"), "retryable", "a network failure may clear");
  eq(W.classifyError("request timed out"), "retryable", "a timeout may clear");
  eq(W.classifyError("could not load the engine"), "retryable", "an engine download may clear");
  eq(W.classifyError("Out of memory"), "resource", "memory is its own case — advice differs");
  eq(W.classifyError("Choose at least two PDFs to merge"), "permanent", "a usage error will not clear");
  eq(W.classifyError("The PDF is password protected"), "permanent", "a locked file will not clear");
  eq(W.classifyError("something nobody has seen before"), "permanent", "unknown defaults to permanent");
  eq(W.classifyError(""), "permanent", "so does an empty message");
  eq(W.classifyError(null), "permanent", "and a missing one");

  /* The advice names the step and says what to do next. "Error 500" is the
     thing this exists to prevent. */
  const net = W.failureAdvice("Rotate PDF", "Failed to fetch");
  ok(net.retry, "a retryable failure offers the button");
  ok(/Rotate PDF/.test(net.text), "and names the step");

  const perm = W.failureAdvice("Merge PDFs", "Choose at least two PDFs to merge");
  ok(!perm.retry, "a permanent failure does NOT offer the button");
  ok(/Merge PDFs/.test(perm.text), "but still names the step");
  ok(/Retrying will not help/.test(perm.text), "and says plainly why there is no button");
  ok(/Choose at least two PDFs/.test(perm.text),
     "the tool's own words survive — they are more useful than any paraphrase");

  const mem = W.failureAdvice("Compress Video", "Out of memory");
  ok(mem.retry, "running out of memory is worth another go");
  ok(/fewer files|Close some tabs/.test(mem.text), "with advice that could actually change the outcome");

  /* run() must honour a cancel flag and a resume point. Checked against the
     source, since exercising it needs real tool modules and a DOM. */
  const src = require("fs").readFileSync(
    require("path").join(__dirname, "..", "assets/js/workflow.js"), "utf8");
  ok(/if \(c\.cancelled\) return \{ ok: false, at: i, file: produced, cancelled: true \};/.test(src),
     "a cancelled run stops before starting the next step and says so");
  ok(/var from = c\.from \|\| 0;/.test(src), "run() accepts a resume point");
  ok(/for \(var i = from; i < steps\.length; i\+\+\)/.test(src),
     "and starts there rather than at zero");
  ok(/c\.checkpoint = \{ file: current, next: i \+ 1 \};/.test(src),
     "every successful step records a checkpoint to resume from");
  ok(/cancelBtn\.textContent = 'Cancelling…'/.test(src),
     "cancelling says Cancelling, not Cancelled — the running step cannot be interrupted");
}
console.log(`workflow + cancel + retry: ${pass} total assertions passed`);

/* ---------------------------------------------------------------------------
 * THE PAGE MUST STAND UP WITHOUT JAVASCRIPT.
 *
 * The editor is a Pro feature that mounts client-side, so for a crawler — and
 * for a signed-out visitor — the page was one empty div. On a site already
 * rejected once for thin content, a route whose whole body is painted by a
 * script is the same mistake with a new name.
 * ------------------------------------------------------------------------- */
{
  const fsW = require("fs"), pathW = require("path");
  const html = (() => { try {
    return fsW.readFileSync(pathW.join(__dirname, "..", "workflows/index.html"), "utf8");
  } catch (e) { return ""; } })();

  if (!html) {
    console.log("workflows page: SKIPPED (run npm run build first)");
  } else {
    /* Strip every script, then measure what a crawler is left with. */
    const noJs = html.replace(/<script[\s\S]*?<\/script>/g, "")
                     .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    ok(noJs.split(" ").length > 700,
       "the page carries real content with JS stripped, got " + noJs.split(" ").length + " words");

    /* It has to pass traffic on, not just exist. */
    const toolLinks = (html.match(/href="\.\.\/tools\/[a-z-]+\/[a-z0-9-]+\//g) || []).length;
    ok(toolLinks >= 12, "it links out to individual tools, got " + toolLinks);

    eq((html.match(/<h1/g) || []).length, 1, "exactly one h1");
    ok((html.match(/<h2/g) || []).length >= 4, "and a real heading structure under it");

    /* Structured data, and it must parse — a malformed block is worse than
       none, because Google reports it as an error against the domain. */
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((m) => { try { return JSON.parse(m[1]); } catch (e) { return null; } });
    ok(ld.length >= 2, "structured data is present, got " + ld.length + " blocks");
    ok(ld.every(Boolean), "every JSON-LD block parses");
    ok(ld.some((x) => x && x["@type"] === "FAQPage"), "a FAQPage block");
    ok(ld.some((x) => x && x["@type"] === "SoftwareApplication"), "a SoftwareApplication block");

    /* The FAQ answers in the markup must match the ones in the structured
       data. Marking up an answer the page does not show is cloaking. */
    const faq = ld.filter((x) => x && x["@type"] === "FAQPage")[0];
    faq.mainEntity.forEach((q) => {
      ok(html.includes(q.name.replace(/&/g, "&amp;")),
         "the FAQ question is on the page, not only in the markup: " + q.name.slice(0, 40));
    });

    /* And it must not promise the thing the whole site denies. */
    ok(!/upload your files|files are uploaded|we store your/i.test(noJs),
       "nothing on the page contradicts the no-upload promise");
    ok(/never uploaded|not uploaded|on your device/i.test(noJs),
       "and it states the promise plainly");
  }
}
console.log(`workflow + page SEO: ${pass} total assertions passed`);
