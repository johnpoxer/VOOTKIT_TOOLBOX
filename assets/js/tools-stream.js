/* tools-stream.js — streamer tools. All on-device.
 * Overlays/screens are generated as self-contained HTML (for an OBS browser
 * source) or PNG (canvas). The giveaway picker uses the crypto RNG. Nothing is
 * uploaded. Real-time chat/alerts need your platform — noted in each tool. */
(function (root) {
  'use strict';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fld(W, l, n) { return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: l }), n]); }
  function inp(W, v) { var e = W.el('input', { class: 'field', type: 'text' }); if (v != null) e.value = v; return e; }
  function color(W, v) { return W.el('input', { type: 'color', value: v, class: 'field' }); }
  function randInt(max) { if (root.crypto && crypto.getRandomValues) { var u = new Uint32Array(1); crypto.getRandomValues(u); return u[0] % max; } return Math.floor(Math.random() * max); }

  var T = {

    /* ---------- giveaway picker ---------- */
    'giveaway-picker': function (host, W) {
      var ta = W.el('textarea', { class: 'field wtext', rows: '8', placeholder: 'One entrant per line…' });
      ta.value = 'viewer_one\nviewer_two\nviewer_three\nviewer_four\nviewer_five';
      var winners = W.el('input', { class: 'field', type: 'number', value: '1', min: '1', max: '50', 'aria-label': 'Number of winners' });
      var result = W.el('div', { class: 'calc-headline' }, [W.el('span', { class: 'ch-label', text: 'Winner' }), W.el('b', { text: '—', style: 'font-size:1.5rem' })]);
      var list = W.el('div', { class: 'calc-stats' });
      function pick() {
        var pool = ta.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        var n = Math.min(Math.max(1, +winners.value | 0), pool.length);
        if (!pool.length) { result.querySelector('b').textContent = 'Add some entrants'; return; }
        var chosen = [], copy = pool.slice();
        for (var i = 0; i < n; i++) { var idx = randInt(copy.length); chosen.push(copy.splice(idx, 1)[0]); }
        result.querySelector('b').textContent = chosen[0];
        list.innerHTML = '';
        chosen.forEach(function (w, i) { list.appendChild(W.el('div', { class: 'calc-stat' }, [W.el('span', { text: 'Winner ' + (i + 1) }), W.el('b', { text: w })])); });
      }
      host.appendChild(fld(W, 'Entrants', ta));
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('label', { class: 'winline' }, [W.el('span', { class: 'wlab', text: 'Winners' }), winners]), W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Draw winner', onClick: pick })]));
      host.appendChild(result); host.appendChild(list);
      host.appendChild(W.el('p', { class: 'note', text: 'Picks winners fairly using your browser’s cryptographic random source. No duplicates. Paste entrants from your chat exporter.' }));
    },

    /* ---------- starting soon screen (OBS browser source) ---------- */
    'starting-soon-screen': overlayTool({
      title: 'Starting soon screen', file: 'starting-soon.html',
      fields: [
        { k: 'heading', label: 'Heading', def: 'Starting Soon' },
        { k: 'sub', label: 'Subtext', def: 'Grab a drink — we go live shortly!' },
        { k: 'mins', label: 'Countdown (minutes, 0 for none)', type: 'number', def: '10' },
        { k: 'bg', label: 'Background', type: 'color', def: '#0f1020' },
        { k: 'fg', label: 'Text colour', type: 'color', def: '#ffffff' },
        { k: 'accent', label: 'Accent', type: 'color', def: '#8b5cf6' }
      ],
      html: function (d) {
        var mins = Math.max(0, parseInt(d.mins, 10) || 0);
        return screenHtml(d, esc(d.heading), esc(d.sub), mins);
      }
    }),

    /* ---------- stream overlay creator (PNG webcam frame) ---------- */
    'stream-overlay-creator': function (host, W) {
      var name = inp(W, 'YourName'), handle = inp(W, '@yoursocial'), tag = inp(W, 'Now playing: Game');
      var acc = color(W, '#8b5cf6');
      var canvas = W.el('canvas', { width: '1280', height: '720', style: 'width:100%;max-width:520px;border:1px solid var(--border,#d5dae2);border-radius:10px;background:conic-gradient(#0000 0,#0000)' });
      function draw() {
        var ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 1280, 720);
        // webcam frame (bottom-left box) with accent border
        ctx.strokeStyle = acc.value; ctx.lineWidth = 8;
        ctx.strokeRect(40, 400, 360, 280);
        // lower-third name bar
        ctx.fillStyle = acc.value; ctx.fillRect(40, 690, 420, 6);
        ctx.fillStyle = '#ffffff'; ctx.font = '700 40px system-ui,Arial'; ctx.fillText(name.value || 'YourName', 44, 350);
        ctx.fillStyle = acc.value; ctx.font = '600 26px system-ui,Arial'; ctx.fillText(handle.value || '@social', 44, 384);
        // top-right tag pill
        var tg = tag.value || 'Now live'; ctx.font = '600 26px system-ui,Arial';
        var tw = ctx.measureText(tg).width + 40; ctx.fillStyle = acc.value; roundRect(ctx, 1240 - tw, 36, tw, 44, 22); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillText(tg, 1240 - tw + 20, 66);
      }
      function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
      [name, handle, tag, acc].forEach(function (x) { x.addEventListener('input', draw); });
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Name', name), fld(W, 'Social', handle), fld(W, 'Tag', tag), fld(W, 'Accent', acc)]));
      host.appendChild(canvas);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Download transparent PNG', onClick: function () { canvas.toBlob(function (b) { if (b) W.download(b, 'overlay.png'); }, 'image/png'); } })]));
      host.appendChild(W.el('p', { class: 'note', text: 'A 1280×720 transparent overlay for OBS. Add it as an Image source above your game; the empty box is where your webcam goes.' }));
      draw();
    },

    /* ---------- stream alert creator (PNG) ---------- */
    'stream-alert-creator': function (host, W) {
      var kind = W.el('select', { class: 'field' }, [['New Follower', 'New Follower'], ['New Subscriber', 'New Subscriber'], ['Donation', 'Donation'], ['Raid', 'Raid']].map(function (o) { return W.el('option', { value: o[0], text: o[1] }); }));
      var user = inp(W, 'username'), acc = color(W, '#8b5cf6'), bg = color(W, '#151329');
      var canvas = W.el('canvas', { width: '800', height: '260', style: 'width:100%;max-width:480px;border-radius:12px' });
      function draw() {
        var ctx = canvas.getContext('2d'); ctx.fillStyle = bg.value; roundRect(ctx, 0, 0, 800, 260, 20); ctx.fill();
        ctx.fillStyle = acc.value; ctx.fillRect(0, 0, 12, 260);
        ctx.fillStyle = acc.value; ctx.font = '700 40px system-ui,Arial'; ctx.fillText(kind.value + '!', 48, 100);
        ctx.fillStyle = '#fff'; ctx.font = '700 56px system-ui,Arial'; ctx.fillText(user.value || 'username', 48, 175);
        ctx.fillStyle = '#c9c7e0'; ctx.font = '400 26px system-ui,Arial'; ctx.fillText('Thanks for the support!', 48, 220);
      }
      function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
      [kind, user, acc, bg].forEach(function (x) { x.addEventListener('input', draw); });
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Alert type', kind), fld(W, 'Username', user), fld(W, 'Accent', acc), fld(W, 'Background', bg)]));
      host.appendChild(canvas);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Download PNG', onClick: function () { canvas.toBlob(function (b) { if (b) W.download(b, 'alert.png'); }, 'image/png'); } })]));
      host.appendChild(W.el('p', { class: 'note', text: 'Designs an alert graphic. To make it pop up automatically on new followers/subs, add it as a custom image in Streamlabs or StreamElements — those services fire the live events.' }));
      draw();
    },

    /* ---------- stream schedule planner (PNG) ---------- */
    'stream-schedule-planner': function (host, W) {
      var title = inp(W, 'Weekly Schedule'), acc = color(W, '#8b5cf6'), bg = color(W, '#12101f');
      var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      var rows = days.map(function (d) { return { day: d, time: inp(W, ''), what: inp(W, '') }; });
      rows[0].time.value = '7 PM'; rows[0].what.value = 'Ranked grind';
      rows[2].time.value = '7 PM'; rows[2].what.value = 'Community games';
      rows[5].time.value = '3 PM'; rows[5].what.value = 'Chill & chat';
      var canvas = W.el('canvas', { width: '800', height: '900', style: 'width:100%;max-width:400px;border-radius:12px' });
      function draw() {
        var ctx = canvas.getContext('2d'); ctx.fillStyle = bg.value; ctx.fillRect(0, 0, 800, 900);
        ctx.fillStyle = acc.value; ctx.fillRect(0, 0, 800, 110);
        ctx.fillStyle = '#fff'; ctx.font = '700 46px system-ui,Arial'; ctx.textAlign = 'center'; ctx.fillText(title.value || 'Weekly Schedule', 400, 72); ctx.textAlign = 'left';
        rows.forEach(function (r, i) {
          var y = 150 + i * 104;
          ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.08)'; ctx.fillRect(30, y, 740, 88);
          ctx.fillStyle = acc.value; ctx.font = '700 30px system-ui,Arial'; ctx.fillText(r.day, 52, y + 40);
          ctx.fillStyle = '#fff'; ctx.font = '700 30px system-ui,Arial'; ctx.fillText(r.time.value || '—', 200, y + 40);
          ctx.fillStyle = '#c9c7e0'; ctx.font = '400 26px system-ui,Arial'; ctx.fillText(r.what.value || 'Off', 200, y + 74);
        });
      }
      [title, acc, bg].forEach(function (x) { x.addEventListener('input', draw); });
      rows.forEach(function (r) { r.time.addEventListener('input', draw); r.what.addEventListener('input', draw); });
      host.appendChild(fld(W, 'Title', title));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Accent', acc), fld(W, 'Background', bg)]));
      rows.forEach(function (r) { host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, r.day + ' time', r.time), fld(W, r.day + ' activity', r.what)])); });
      host.appendChild(canvas);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Download PNG', onClick: function () { canvas.toBlob(function (b) { if (b) W.download(b, 'schedule.png'); }, 'image/png'); } })]));
      host.appendChild(W.el('p', { class: 'note', text: 'Makes a shareable weekly schedule graphic for your socials and panels. Leave a day blank for a day off.' }));
      draw();
    },

    /* ---------- chat overlay CSS generator ---------- */
    'chat-overlay-tool': function (host, W) {
      var msgColor = color(W, '#ffffff'), userColor = color(W, '#8b5cf6'), size = W.el('input', { class: 'field', type: 'number', value: '20', min: '10', max: '60', 'aria-label': 'Font size' });
      var shadow = W.el('input', { type: 'checkbox', 'aria-label': 'Text shadow' }); shadow.checked = true;
      var out = W.el('textarea', { class: 'field wtext', rows: '10', readonly: 'readonly', spellcheck: 'false', 'aria-label': 'CSS' });
      var preview = W.el('div', { style: 'border-radius:10px;padding:14px;background:#101018;margin:8px 0' });
      function build() {
        var sh = shadow.checked ? '0 2px 4px rgba(0,0,0,.8)' : 'none';
        var css = '/* Paste into your chat widget’s Custom CSS (StreamElements / Streamlabs) */\n' +
          '.message, .text { color: ' + msgColor.value + ' !important; font-size: ' + size.value + 'px !important; text-shadow: ' + sh + '; }\n' +
          '.user, .username, .name { color: ' + userColor.value + ' !important; font-weight: 700 !important; text-shadow: ' + sh + '; }\n' +
          '.chat_line { animation: vk-in .25s ease; margin: 4px 0; }\n' +
          '@keyframes vk-in { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: none; } }';
        out.value = css;
        preview.innerHTML = '<div style="font-size:' + size.value + 'px;text-shadow:' + sh + '"><span style="color:' + userColor.value + ';font-weight:700">Nova:</span> <span style="color:' + msgColor.value + '"> nice play!</span></div>' +
          '<div style="font-size:' + size.value + 'px;text-shadow:' + sh + '"><span style="color:' + userColor.value + ';font-weight:700">Pixel:</span> <span style="color:' + msgColor.value + '"> GGs 🎉</span></div>';
      }
      [msgColor, userColor, size, shadow].forEach(function (x) { x.addEventListener('input', build); });
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Message colour', msgColor), fld(W, 'Username colour', userColor), fld(W, 'Font size', size), W.el('label', { class: 'winline' }, [shadow, W.el('span', { text: ' Text shadow' })])]));
      host.appendChild(W.el('p', { class: 'wlab', text: 'Preview' })); host.appendChild(preview);
      host.appendChild(out);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.copyBtn('Copy CSS', function () { return out.value; })]));
      host.appendChild(W.el('p', { class: 'note', text: 'Generates custom CSS for a chat overlay. Paste it into the Custom CSS box of your StreamElements or Streamlabs chat widget — those services supply the live messages.' }));
      build();
    }

  };

  /* shared: OBS "screen" HTML generator (transparent-friendly, self-contained) */
  function screenHtml(d, heading, sub, mins) {
    var countdown = mins > 0 ? ('<div id="cd" style="font-size:5vw;font-weight:800;color:' + d.accent + ';margin-top:18px"></div>' +
      '<script>var end=Date.now()+' + (mins * 60000) + ';function t(){var s=Math.max(0,Math.round((end-Date.now())/1000));var m=(s/60)|0;document.getElementById("cd").textContent=m+":"+("0"+(s%60)).slice(-2);}setInterval(t,500);t();<\/script>') : '';
    return '<!doctype html><html><head><meta charset="utf-8"><style>html,body{height:100%;margin:0}' +
      'body{display:flex;flex-direction:column;align-items:center;justify-content:center;background:' + d.bg + ';color:' + d.fg + ';font-family:system-ui,Segoe UI,Arial,sans-serif;text-align:center}' +
      'h1{font-size:7vw;margin:0}p{font-size:2.4vw;opacity:.85;margin:12px 0 0}.bar{width:120px;height:6px;background:' + d.accent + ';border-radius:3px;margin:24px 0}</style></head>' +
      '<body><h1>' + heading + '</h1><div class="bar"></div><p>' + sub + '</p>' + countdown + '</body></html>';
  }

  /* factory for HTML-overlay tools (form -> preview iframe -> download HTML) */
  function overlayTool(spec) {
    return function (host, W) {
      var inputs = {};
      spec.fields.forEach(function (f) {
        var node = f.type === 'color' ? W.el('input', { type: 'color', value: f.def, class: 'field' })
          : f.type === 'number' ? W.el('input', { class: 'field', type: 'number', value: f.def })
          : W.el('input', { class: 'field', type: 'text', value: f.def });
        inputs[f.k] = node;
      });
      var frame = W.el('iframe', { class: 'wdocframe', title: 'Preview' });
      function gather() { var d = {}; spec.fields.forEach(function (f) { d[f.k] = inputs[f.k].value; }); return d; }
      function render() { frame.srcdoc = spec.html(gather()); }
      spec.fields.forEach(function (f) { inputs[f.k].addEventListener('input', render); host.appendChild(fld(W, f.label, inputs[f.k])); });
      host.appendChild(W.el('p', { class: 'wlab', text: 'Preview' })); host.appendChild(frame);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Download HTML for OBS', onClick: function () { W.download(spec.html(gather()), spec.file, 'text/html'); } })]));
      host.appendChild(W.el('p', { class: 'note', text: 'Download the HTML and add it in OBS as a Browser source (Local file). It fills the canvas and updates live.' }));
      render();
    };
  }

  root.VKStream = { screenHtml: screenHtml };
  if (typeof module === 'object' && module.exports) module.exports = root.VKStream;
  if (typeof root.VKW !== 'undefined') {
    Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); }
  }
})(typeof window !== 'undefined' ? window : globalThis);
