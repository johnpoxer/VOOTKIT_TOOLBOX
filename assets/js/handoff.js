/* handoff.js — send a finished result straight into the next tool.
 *
 * WHY THIS IS WORTH BUILDING AT ALL.
 * Every serious competitor uploads your file to a server. That is why none of
 * them can do this: to chain two of their tools they must send the file up,
 * process it, send it back down, and then take it up again for the next one.
 * Vootkit's tools already run on the device, so the finished blob is sitting in
 * memory when the download fires. Passing it to the next tool costs one
 * IndexedDB write and one read. The capability is a side effect of the
 * architecture — it just was not exposed.
 *
 * WHY INDEXEDDB AND NOT MEMORY.
 * The next tool is a different page. A variable does not survive the
 * navigation, sessionStorage cannot hold a Blob, and a query parameter cannot
 * hold a file. IndexedDB is the only store that takes a Blob and survives a
 * page load — and it stays on the device, which is the whole promise. Nothing
 * is uploaded to do this, and there is no server that could see it.
 *
 * WHY IT EXPIRES.
 * A file parked here is work in progress, not a saved document. Ten minutes is
 * long enough for "compress this, now merge it" and short enough that nobody
 * comes back tomorrow to a tool mysteriously pre-loaded with something they
 * had forgotten about. Whatever is taken is deleted on read, so a handoff is
 * consumed exactly once — a back button does not silently re-add the file.
 *
 * FAILURE IS ALWAYS SILENT AND ALWAYS OPEN.
 * If IndexedDB is unavailable — private windows, storage pressure, an old
 * browser — nothing here throws and no error is shown. The user still has
 * their download; they simply do not get offered the shortcut. A broken
 * convenience must never become a broken tool.
 */
(function (root) {
  'use strict';

  var doc = typeof document !== 'undefined' ? document : null;

  var DB_NAME = 'vk-handoff';
  var STORE = 'files';
  var KEY = 'pending';
  var TTL_MS = 10 * 60 * 1000;

  /* ---------- pure logic (unit-tested in test/handoff.test.js) ---------- */

  /* Does `accept` — the real string a tool hands its file input — take a file
     with this name and MIME type?
   *
   * Deliberately mirrors the reasoning in filetool.js's validate(): accept
   * lists carry extensions AS WELL AS MIME types, because a Windows file
   * dialog builds its filter from the extensions and a bare 'application/pdf'
   * can leave PDFs greyed out. So this has to understand both, plus the
   * 'image/*' wildcard form.
   *
   * When in doubt it answers NO. Offering a tool that then rejects the file is
   * worse than not offering it — the user has already navigated by then. */
  function accepts(acceptStr, name, mime) {
    if (!acceptStr) return false;
    var parts = String(acceptStr).toLowerCase().split(',')
      .map(function (s) { return s.trim(); }).filter(Boolean);
    if (!parts.length) return false;

    var n = String(name || '').toLowerCase();
    var ext = n.indexOf('.') > -1 ? n.slice(n.lastIndexOf('.')) : '';
    var m = String(mime || '').toLowerCase();

    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.charAt(0) === '.') { if (ext && ext === p) return true; continue; }
      if (p.slice(-2) === '/*') { if (m && m.indexOf(p.slice(0, -1)) === 0) return true; continue; }
      if (m && m === p) return true;
    }
    return false;
  }

  /* Which tools could take this file next?
   *
   * The tool that just produced it is excluded — "compress this PNG, now
   * compress it again" is not a workflow, it is a loop, and offering it first
   * makes the whole row look automated rather than considered.
   *
   * Ordering is by usefulness, not by catalogue order: tools in the same
   * category as the source come first, because that is where the next step
   * usually is, and the list is capped so the row stays a suggestion instead
   * of becoming a second navigation. */
  function nextTools(flowData, fromId, name, mime, limit) {
    var d = flowData || {};
    var flow = d.flow || {};
    var names = d.names || {};
    var fromCat = (flow[fromId] || {}).c;
    var out = [];

    Object.keys(flow).forEach(function (id) {
      if (id === fromId) return;
      if (!accepts(flow[id].a, name, mime)) return;
      out.push({
        id: id, name: names[id] || id, cat: flow[id].c,
        same: flow[id].c === fromCat,
        rank: flow[id].p || 999          // curated next steps first, see build.js
      });
    });

    out.sort(function (a, b) {
      if (a.same !== b.same) return a.same ? -1 : 1;
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.name.localeCompare(b.name);
    });
    return out.slice(0, limit == null ? 6 : limit);
  }

  /* A parked file is work in progress. Anything older than the TTL belongs to
     a session the user has stopped thinking about. */
  function isFresh(rec, now, ttl) {
    if (!rec || !rec.at) return false;
    var age = (now == null ? Date.now() : now) - rec.at;
    return age >= 0 && age < (ttl == null ? TTL_MS : ttl);
  }

  /* ---------- the store (this device only, never uploaded) ---------- */

  function openDb() {
    return new Promise(function (res, rej) {
      if (!root.indexedDB) return rej(new Error('no idb'));
      var rq = root.indexedDB.open(DB_NAME, 1);
      rq.onupgradeneeded = function () {
        var db = rq.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error); };
    });
  }

  function park(blob, name, fromId, fromName) {
    return openDb().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put({
          id: KEY, at: Date.now(), blob: blob, name: name,
          fromId: fromId, fromName: fromName
        });
        tx.oncomplete = function () { db.close(); res(true); };
        tx.onerror = function () { db.close(); rej(tx.error); };
      });
    }).catch(function () { return false; });
  }

  /* Read once, then gone — so a back button cannot silently re-add the file to
     a tool the user has already used it on. */
  function take() {
    return openDb().then(function (db) {
      return new Promise(function (res) {
        var tx = db.transaction(STORE, 'readwrite');
        var st = tx.objectStore(STORE);
        var g = st.get(KEY);
        g.onsuccess = function () {
          var rec = g.result;
          st.delete(KEY);
          tx.oncomplete = function () { db.close(); res(isFresh(rec) ? rec : null); };
        };
        g.onerror = function () { db.close(); res(null); };
      });
    }).catch(function () { return null; });
  }

  /* ---------- the offer ---------- */

  function el(tag, attrs, kids) {
    var n = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return n;
  }

  function iconFor(id) {
    var I = root.VK_ICONS;
    var e = I && I.icons && I.icons[id];
    if (!e || !I.glyphs[e.g]) return null;
    return el('span', { class: 'ic ic-tool', style: '--ic-h:' + e.h + ';--ic-bg:' + e.bg },
      [el('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I.glyphs[e.g] + '</svg>' }).firstChild]);
  }

  function toolHref(id) {
    try {
      var t = root.VK && root.VK.find && root.VK.find(id);
      if (!t) return null;
      /* Tool pages are two levels below the site root: /tools/<cat>/<id>/ —
         and this only ever renders on a tool page, so the walk-up is fixed. */
      return '../../' + t.cat + '/' + t.id + '/';
    } catch (e) { return null; }
  }

  /* Render the row into a tool's result area.
   *
   * Returns false and draws nothing when there is nowhere sensible to go —
   * a row reading "send this to" with one irrelevant option is worse than the
   * download standing on its own. */
  function offer(host, blob, name, fromId) {
    if (!doc || !host || !blob) return false;
    var D = root.VK_FLOW;
    if (!D) return false;
    var picks = nextTools(D, fromId, name, blob.type, 5);
    if (!picks.length) return false;

    var old = host.querySelector('.vk-next');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var fromName = (D.names && D.names[fromId]) || fromId;
    var wrap = el('div', { class: 'vk-next' }, [
      el('p', { class: 'vk-next-t', text: 'Keep going with this file' })
    ]);
    var row = el('div', { class: 'vk-next-row' });

    picks.forEach(function (p) {
      var href = toolHref(p.id);
      if (!href) return;
      var a = el('a', { class: 'vk-next-btn', href: href });
      var ic = iconFor(p.id);
      if (ic) a.appendChild(ic);
      a.appendChild(el('span', { text: p.name }));
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        /* Park FIRST, navigate second. Navigating on a failed write would land
           the user on an empty tool with no explanation of what went wrong. */
        park(blob, name, fromId, fromName).then(function (ok) {
          try {
            if (root.VKTrack && root.VKTrack.event) {
              root.VKTrack.event('tool_chain', { from_tool: fromId, to_tool: p.id, parked: ok ? 1 : 0 });
            }
          } catch (e) {}
          root.location.href = href;
        });
      });
      row.appendChild(a);
    });

    if (!row.childNodes.length) return false;
    wrap.appendChild(row);
    wrap.appendChild(el('p', { class: 'vk-next-note',
      text: 'The file goes straight through on your device — it is not uploaded, and it is discarded after ten minutes.' }));
    host.appendChild(wrap);
    return true;
  }

  /* ---------- the receiving end ---------- */

  /* Called on load by a tool page. If something was parked, hand it to the
     mounted file tool and say where it came from. */
  function receive() {
    if (!doc) return Promise.resolve(false);
    return take().then(function (rec) {
      if (!rec || !rec.blob) return false;
      var ingest = root.VKFile && root.VKFile.ingest;
      if (typeof ingest !== 'function') return false;
      var f;
      try {
        f = new File([rec.blob], rec.name || 'file', { type: rec.blob.type || '' });
      } catch (e) { return false; }        // very old browsers have no File ctor
      var ok = ingest([f]);
      if (ok) announce(rec);
      return !!ok;
    }).catch(function () { return false; });
  }

  function announce(rec) {
    var host = doc.querySelector('[data-tool]');
    if (!host) return;
    var note = el('p', { class: 'vk-from', role: 'status' });
    note.textContent = 'Carried over from ' + (rec.fromName || 'the last tool') + ': ' + (rec.name || 'your file');
    host.insertBefore(note, host.firstChild);
  }

  root.VKHandoff = {
    accepts: accepts,
    nextTools: nextTools,
    isFresh: isFresh,
    park: park,
    take: take,
    offer: offer,
    receive: receive,
    TTL_MS: TTL_MS
  };
  if (typeof module === 'object' && module.exports) module.exports = root.VKHandoff;

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { receive(); });
    else receive();
  }
})(typeof window !== 'undefined' ? window : globalThis);
