/* tool-facts.js — derives real per-tool facts from the tool implementations.
 *
 * WHY THIS EXISTS
 *
 * 261 tool pages shared a median of only 95 words that did not appear on the
 * other 260, and Google declined to index 54 of them. Ten pages were then
 * rewritten by hand, which works but does not scale to 261.
 *
 * The obvious shortcut — generating prose for the remaining 251 — would
 * RECREATE THE ORIGINAL PROBLEM. Templated sentences with the tool name swapped
 * in is exactly what the old page already was; doing it at greater length just
 * makes a longer duplicate.
 *
 * So this generates FACTS, not prose. Every tool already declares its own
 * settings, ranges, defaults, formats and failure messages in its source. Those
 * genuinely differ between tools, they are the things people actually search
 * for ("what quality does it use", "what's the size limit"), and — because they
 * are read out of the live modules at build time — THEY CANNOT DRIFT. Change a
 * tool's options and its page updates on the next build.
 *
 * What this cannot do is explain *why* a setting matters, or what to do when a
 * result disappoints. That is the hand-written layer in tool-content.js, which
 * takes priority wherever it exists.
 */

'use strict';

/* ---------- helpers ---------- */

const TYPE_LABEL = {
  range: 'slider',
  select: 'choice',
  number: 'number',
  text: 'text',
  checkbox: 'on/off'
};

function fmtNum(n) {
  if (typeof n !== 'number' || !isFinite(n)) return String(n);
  return n.toLocaleString('en-GB');
}

/* One option/field rendered as a human-readable value string.
   Returns null when there is nothing worth saying. */
function describeOption(o) {
  if (!o || !o.label) return null;
  const bits = [];

  if (Array.isArray(o.options) && o.options.length) {
    const choices = o.options.map((c) => String(c.label != null ? c.label : c.v)).filter(Boolean);
    if (!choices.length) return null;
    bits.push(choices.join(' · '));
  } else {
    const hasMin = typeof o.min === 'number', hasMax = typeof o.max === 'number';
    if (hasMin && hasMax) bits.push(fmtNum(o.min) + '–' + fmtNum(o.max) + (o.suffix || ''));
    else if (hasMax) bits.push('up to ' + fmtNum(o.max) + (o.suffix || ''));
    else if (hasMin) bits.push('from ' + fmtNum(o.min) + (o.suffix || ''));
  }

  if (o.def != null && o.def !== '') {
    let def = o.def;
    if (Array.isArray(o.options)) {
      const match = o.options.find((c) => String(c.v) === String(o.def));
      if (match && match.label) def = match.label;
    }
    def = String(def) + (o.suffix && !Array.isArray(o.options) ? o.suffix : '');
    bits.push('default ' + def);
  }

  if (!bits.length && TYPE_LABEL[o.type]) bits.push(TYPE_LABEL[o.type]);
  return bits.length ? { label: String(o.label), value: bits.join(', ') } : null;
}

/* Accepted input types, phrased for a reader rather than a MIME parser. */
const ACCEPT_WORDS = {
  'image/*': 'Any image the browser can open — JPG, PNG, WebP, GIF',
  'application/pdf': 'PDF',
  'video/*': 'MP4, MOV, MKV, AVI, WebM and other common video containers',
  'audio/*': 'Common audio files'
};

function describeAccept(accept) {
  if (!accept) return null;
  if (ACCEPT_WORDS[accept]) return ACCEPT_WORDS[accept];
  const exts = String(accept).split(',').map((s) => s.trim())
    .filter((s) => s.startsWith('.') || s.indexOf('/') > -1)
    .map((s) => s.startsWith('.') ? s.slice(1).toUpperCase() : s.split('/')[1])
    .filter((s) => s && s !== '*');
  const uniq = [...new Set(exts)];
  return uniq.length ? uniq.join(', ').toUpperCase() : null;
}

function bytesLabel(n) {
  if (typeof n !== 'number' || !isFinite(n) || n <= 0) return null;
  return Math.round(n / 1048576) + ' MB';
}

/* ---------- the extractor ---------- */

/* spec: a file-tool spec ({accept, options, maxBytes, maxFiles, action}) or a
   calculator spec ({fields}). Either shape yields rows; anything else yields
   none, and the page falls back to the generic template. */
function factsFor(spec) {
  if (!spec || typeof spec !== 'object') return null;

  const rows = [];
  const inputs = Array.isArray(spec.options) ? spec.options
    : Array.isArray(spec.fields) ? spec.fields
      : [];

  const accept = describeAccept(spec.accept);
  if (accept) rows.push({ label: 'Accepts', value: accept });

  if (spec.multiple) {
    rows.push({
      label: 'Files at once',
      value: spec.maxFiles ? 'Up to ' + spec.maxFiles : 'Several'
    });
  }
  const cap = bytesLabel(spec.maxBytes);
  if (cap) rows.push({ label: 'Maximum size', value: cap });

  inputs.forEach((o) => {
    const d = describeOption(o);
    if (d) rows.push(d);
  });

  /* Fewer than three rows is not a table, it is a rounding error — better to
     leave the page on the generic template than to show a stub. */
  if (rows.length < 3) return null;

  return {
    rows: rows.slice(0, 10),
    inputCount: inputs.length
  };
}

/* ---------- what was tried and rejected ----------
 *
 * A regex scraper over the widget tools' source was written and thrown away.
 * Two thirds of the catalogue build their DOM directly rather than declaring an
 * options array, so there is no structure to read, and scraping recovered only
 * two tools' worth of usable rows out of 183. The rest came out as things like
 * "Adjustable range | 1-200" with no label, because the source knows the bounds
 * but not what the control is for — the variable is called `len`.
 *
 * That is filler, and filler on 180 pages is the ORIGINAL PROBLEM in a new
 * costume. Those tools keep the generic template until someone writes real copy
 * for them in tool-content.js. An honest thin page beats a padded one: Google
 * is already declining the thin version, and a padded version is what earns a
 * "low value content" flag from AdSense on top.
 */

module.exports = { factsFor, describeOption, describeAccept, bytesLabel };
