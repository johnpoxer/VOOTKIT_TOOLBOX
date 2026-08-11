# Vootkit Workflow Platform — audit, architecture, and the decision that blocks it

Written against the master prompt. Sections 3 (audit first) and 53 (do not make
unauthorised large changes) are why this document exists instead of more code.

---

## 1. The finding that changes everything

**The specification assumes server-side execution. Vootkit's entire value
proposition is that files never reach a server.**

Sections 13–21 of the brief describe a job queue, workers, checkpointing,
"leave the page while a long-running workflow continues", and a backend that is
"authoritative". Every one of those requires the user's file to be uploaded and
stored.

That directly contradicts what the site says about itself in **28 places across
23 files**, including:

- the homepage hero and the Product safety section built two days ago
- every tool page's dropzone: *"Processed on your device — never uploaded"*
- the privacy policy
- the AdSense positioning and the entire competitive argument against iLovePDF

It is not a copy problem. It is the product. A queue-based workflow engine
would make Vootkit a slower iLovePDF with fewer tools.

**This is the decision only you can make, and everything below branches on it.**

---

## 2. Audit of what exists

### Deployment
| | |
|---|---|
| Host | Netlify, static publish from repo root |
| Build | `npm run build` → `build.js` generates 1,478 pages |
| Server code | 4 Netlify functions: `admin-stats`, `create-checkout`, `create-link`, `redirect` |
| Function limit | 10s synchronous. No background-function config present. |
| Constraint today | Build credits exhausted; 37 commits unpushed since 5 Aug |

### Data
| Table | In schema | Used by |
|---|---|---|
| `profiles` | yes | auth, plan lookup, usage |
| `history` | yes | recent tools |
| `favorites` | yes | starred tools |
| `links` | yes | URL shortener |
| `error_logs` | yes | scrubbed crash reports |
| `tool_runs` | **no** | `deliver.js` writes to it |
| `subscribers` | **no** | `newsletter.js` writes to it |

**Two tables are written by shipped code and do not exist in `supabase/`.**
Either they were created by hand in the dashboard and never captured as
migrations, or those writes have been failing silently. Both cases are a
problem before anything is built on top.

### Auth, billing, limits
- Supabase auth; plan on `profiles.plan` (`creator_pro` / `creator_teams`)
- Stripe checkout via `create-checkout` function
- `gate.enabled: false`, `freeLimit: {enabled: true, count: 5, hard: false}`
- One usage chokepoint already exists: `deliver.js`

### Tool architecture — the part that is genuinely strong
57 tools already expose the contract section 6 asks for:

```
spec = { accept, multiple, maxFiles, maxBytes, options[], process(files, opts, api) }
```

`process()` is a pure function of files and options. `filetool.js` is only a UI
around it. **The tool contract system the brief asks for largely exists** — it
needs formalising and extending, not inventing.

33 further tools are widget-shaped: logic and interface in one function. These
cannot be workflow steps without refactoring, which is the single biggest
piece of tool-side work.

---

## 3. The architectural decision

### Option A — Client-side execution engine (recommended)

Keep the promise. Execution stays in the browser; the backend stores
**definitions and metadata only**, never file bytes.

| Brief requirement | How it is met without uploading |
|---|---|
| Backend authoritative | For *definitions, versions, history, limits* — yes. For file bytes — not applicable. |
| Async / leave the page | Web Worker + `IndexedDB` checkpoints. Survives tab close on the same device. |
| Job queue | In-browser scheduler with concurrency limits. |
| Checkpointing | Intermediate blobs in IndexedDB, keyed by execution id. |
| Retry | Same classification the brief specifies; re-runs from the last good checkpoint. |
| History | Rows in Supabase: what ran, when, how long, which step failed. No file content. |
| Idempotency | Execution id generated client-side, unique-constrained server-side. |
| Cost control | Compute is the user's. Storage cost ≈ 0. **This is the cheapest architecture available.** |
| Tenant isolation | Files never leave the device, so cross-tenant file access is impossible by construction. |

**Limits, honestly stated:** work does not continue on another device; a
100-file batch is bounded by the user's RAM; no scheduled or webhook-triggered
runs; no public API that processes files.

### Option B — Server-side execution engine

What the brief literally describes. Requires:

- File upload and storage (Supabase Storage or S3), with lifecycle rules
- A queue — Netlify functions cap at 10s, so this means background functions,
  or QStash/Inngest, or a container host
- Re-implementing 57 tools server-side. **The current ones are browser code:
  Canvas, WebCodecs, `pdf.js`, `ffmpeg.wasm`.** They do not run in Node
  unmodified. This is not a port, it is a rewrite.
- Per-GB storage and egress costs that scale with usage, on a site funded by
  display ads
- Rewriting the homepage, every tool page, the privacy policy and the safety
  section
- A new answer to "why not iLovePDF"

**Estimate: months, not days, and it removes the reason to choose Vootkit.**

### Option C — Hybrid, later

Client-side by default. A future **Pro** tier adds opt-in server execution for
scheduled and API-triggered runs, clearly labelled, priced to cover storage.
Option A is a prerequisite for this, not an alternative to it.

**Recommendation: A now, C when there is revenue to justify it. Not B.**

---

## 4. Proposed architecture (Option A)

```
                    ┌──────────────────────────────────────┐
   USER  ─────────► │  Workflow UI (canvas editor)         │
                    └───────────────┬──────────────────────┘
                                    │ workflow definition (JSON)
                    ┌───────────────▼──────────────────────┐
                    │  Validator — type-safe connections   │
                    │  tool contracts + bridge suggestions │
                    └───────────────┬──────────────────────┘
                                    │
                    ┌───────────────▼──────────────────────┐
                    │  Execution engine (Web Worker)       │
                    │  scheduler · checkpoints · retry     │
                    └──────┬────────────────────┬──────────┘
                           │ blobs              │ metadata only
                    ┌──────▼────────┐   ┌───────▼───────────┐
                    │  IndexedDB    │   │  Supabase         │
                    │  on device    │   │  definitions      │
                    │  never sent   │   │  versions         │
                    └───────────────┘   │  executions       │
                                        │  RLS by owner     │
                                        └───────────────────┘
```

### Data model

```sql
workflows        id, owner_id, name, description, visibility,
                 status(draft|published), current_version, created_at, updated_at
workflow_versions workflow_id, version, graph_json, published_at
                 -- executions reference a VERSION, never the mutable head,
                 -- so editing a workflow cannot rewrite what already ran
executions       id (client-generated, unique = idempotency key),
                 workflow_id, version, owner_id, status, started_at,
                 finished_at, input_count, output_count, failed_node, error_code
execution_steps  execution_id, node_id, tool_id, status, ms, retry_count, error_code
```

No column anywhere holds file bytes, file names or file content. `error_code`
is an enum, not a message — the same discipline `errors.js` already applies.

### Tool contract (formalising what exists)

```js
{
  id, name, category, version,
  input:  { kinds:['pdf'], mime:['application/pdf'], maxBytes, multiple:false },
  output: { kind:'pdf', mime:'application/pdf', count:1 },
  params: [ {k, label, type, def, min, max, options} ],
  caps:   { batch:true, async:false, deterministic:true, credits:1 }
}
```

Generated at build time from the specs, as `data/tool-flow.js` already is.
**Adding a tool must never require touching the engine** (section 47).

---

## 5. Delivery plan

| Stage | Contents | State |
|---|---|---|
| **V1** | Canvas editor, drag from palette, draw connections, per-step settings, type validation, batch input, save/load, run with live node states, partial results kept | **built** |
| **V1.5** | Templates (5, filtered by file kind); undo/redo/duplicate via Ctrl+Z/Y/D; Pro gate on run, fails open | **built** |
| **V2a** | Cancellation with honest granularity; per-step checkpoints; retry that resumes from the failed step; error classification (retryable / resource / permanent) | **built** |
| **V2b** | Worker execution so the canvas stays responsive during long runs | **next — no database needed** |
| **V2c** | Execution history, versioning, draft/published | **blocked on the database decision** |
| **V2.5** | Refactor the 33 widget tools onto the spec contract — unlocks Compress PDF, PDF→JPG, OCR as steps | large, independent |
| **V3** | Parallel branches; conditions; bridge suggestions ("insert PDF→JPG here"); AI-proposed workflows requiring confirmation | later |
| **V4** | Server execution for scheduled/API runs, Pro only, opt-in, priced | only with revenue |

---

## 6. What needs your decision before I write more code

1. **Option A, B or C.** Everything else depends on it.
2. **`tool_runs` and `subscribers` migrations are now written** —
   `supabase/tool_runs.sql` and `supabase/subscribers.sql`, not applied.
   Run `subscribers.sql` first: if that table is missing, signups have been
   failing visibly in front of real people.
3. **Execution history means a new table and RLS policies.** Section 53 says
   stop before changing the database. I am stopping.
4. **Netlify credits.** 37 commits, including everything in V1, have never
   deployed. Nothing here reaches users until that is resolved.
5. **Widget-tool refactor (V2.5).** It is the difference between 57 and 90
   available steps and it touches 33 shipped tools. Worth scheduling
   deliberately, not slipping into another change.

---

## 7. Standard applied to V1 as it stands

| Question | Answer |
|---|---|
| Reliability | Failure halts the path, names the step, keeps the last good output |
| Security | Files never leave the device; nothing to isolate cross-tenant |
| Scalability | Definitions are small JSON; execution scales with the user's machine |
| Maintainability | Engine is pure functions; 45 assertions; contracts generated from tools |
| Observability | Per-node state in the UI; execution metrics need the V2 table |
| UX | Drag from palette, draw links, click to configure, watch nodes light up |
| Accessibility | Real focusable buttons, not a `<canvas>`; keyboard path to every action |
| Performance | One SVG edge layer, transform-based pan/zoom, no per-frame layout |
| Cost | Approximately zero — the user's device does the work |
| Extensibility | A new tool with a spec appears in the palette with no engine change |
| Product value | Five tools become one run, with nothing uploaded between them |
