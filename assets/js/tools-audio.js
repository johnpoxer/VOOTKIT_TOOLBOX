/* tools-audio.js — audio & voice tools. All on-device.
 * Decoding uses the Web Audio API; WAV encoding is a pure PCM writer (no lib).
 * MP3 output uses lamejs (LGPL) lazy-loaded from a CDN. Recording uses
 * MediaRecorder; TTS/STT use the browser's Speech APIs. Nothing is uploaded. */
(function (root) {
  'use strict';

  var LAME_URL = 'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js';
  function lazyLame() {
    if (root.lamejs) return Promise.resolve(root.lamejs);
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = LAME_URL; s.async = true;
      s.onload = function () { root.lamejs ? res(root.lamejs) : rej(new Error('MP3 encoder unavailable.')); };
      s.onerror = function () { rej(new Error('Could not load the MP3 encoder — check your connection.')); };
      document.head.appendChild(s);
    });
  }

  /* ---------- pure encoders ---------- */
  function floatTo16(input) {
    var out = new Int16Array(input.length);
    for (var i = 0; i < input.length; i++) { var s = input[i] < -1 ? -1 : input[i] > 1 ? 1 : input[i]; out[i] = s < 0 ? s * 0x8000 : s * 0x7fff; }
    return out;
  }
  function writeStr(view, off, str) { for (var i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); }
  // channels: array of Float32Array (one per channel), all same length
  function encodeWav(channels, sampleRate) {
    var numCh = channels.length, len = channels[0].length;
    var inter = new Float32Array(len * numCh);
    for (var i = 0; i < len; i++) for (var c = 0; c < numCh; c++) inter[i * numCh + c] = channels[c][i];
    var pcm = floatTo16(inter);
    var buffer = new ArrayBuffer(44 + pcm.length * 2), view = new DataView(buffer);
    writeStr(view, 0, 'RIFF'); view.setUint32(4, 36 + pcm.length * 2, true); writeStr(view, 8, 'WAVE');
    writeStr(view, 12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numCh, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * numCh * 2, true); view.setUint16(32, numCh * 2, true); view.setUint16(34, 16, true);
    writeStr(view, 36, 'data'); view.setUint32(40, pcm.length * 2, true);
    for (var j = 0; j < pcm.length; j++) view.setInt16(44 + j * 2, pcm[j], true);
    return new Uint8Array(buffer);
  }
  async function encodeMp3(channels, sampleRate, kbps) {
    var lame = await lazyLame();
    var numCh = channels.length, enc = new lame.Mp3Encoder(numCh, sampleRate, kbps || 128);
    var left = floatTo16(channels[0]), right = numCh > 1 ? floatTo16(channels[1]) : null;
    var block = 1152, data = [];
    for (var i = 0; i < left.length; i += block) {
      var l = left.subarray(i, i + block), r = right ? right.subarray(i, i + block) : null;
      var buf = numCh > 1 ? enc.encodeBuffer(l, r) : enc.encodeBuffer(l);
      if (buf.length) data.push(new Uint8Array(buf));
    }
    var end = enc.flush(); if (end.length) data.push(new Uint8Array(end));
    return data;
  }

  /* ---------- Web Audio helpers ---------- */
  function AC() { return new (root.AudioContext || root.webkitAudioContext)(); }
  async function decode(file) {
    var ctx = AC();
    var buf = await ctx.decodeAudioData(await file.arrayBuffer());
    ctx.close && ctx.close();
    return buf;
  }
  function channelsOf(audioBuffer, mono) {
    var n = audioBuffer.numberOfChannels;
    if (mono || n === 1) {
      var len = audioBuffer.length, mix = new Float32Array(len), i;
      for (var c = 0; c < n; c++) { var d = audioBuffer.getChannelData(c); for (i = 0; i < len; i++) mix[i] += d[i] / n; }
      return [mix];
    }
    return [audioBuffer.getChannelData(0), audioBuffer.getChannelData(1)];
  }
  function fld(W, l, n) { return W.el('label', { class: 'wfield' }, [W.el('span', { class: 'wlab', text: l }), n]); }
  function fmtTime(s) { s = Math.max(0, s | 0); var m = (s / 60) | 0; return m + ':' + ('0' + (s % 60)).slice(-2); }
  function bytes(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : (n / 1024).toFixed(0) + ' KB'; }

  var T = {

    'audio-converter': function (host, W) {
      var input = W.el('input', { type: 'file', class: 'field', accept: 'audio/*', 'aria-label': 'Choose an audio file' });
      var fmt = W.el('select', { class: 'field', 'aria-label': 'Output format' }, [['wav', 'WAV (lossless)'], ['mp3', 'MP3']].map(function (o) { return W.el('option', { value: o[0], text: o[1] }); }));
      var kbps = W.el('select', { class: 'field', 'aria-label': 'MP3 bitrate' }, [['320', '320 kbps'], ['192', '192 kbps'], ['128', '128 kbps']].map(function (o) { return W.el('option', { value: o[0], text: o[1] }); })); kbps.value = '192';
      var status = W.el('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
      var btn = W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Convert', disabled: 'disabled', onClick: async function () {
        var f = input.files[0]; if (!f) return;
        status.className = 'note'; status.textContent = 'Decoding…'; btn.disabled = true;
        try {
          var ab = await decode(f), ch = channelsOf(ab, false), base = (f.name || 'audio').replace(/\.[^.]+$/, '');
          if (fmt.value === 'mp3') { status.textContent = 'Encoding MP3…'; var parts = await encodeMp3(ch, ab.sampleRate, +kbps.value); W.download(new Blob(parts, { type: 'audio/mpeg' }), base + '.mp3'); }
          else { W.download(new Blob([encodeWav(ch, ab.sampleRate)], { type: 'audio/wav' }), base + '.wav'); }
          status.textContent = 'Done — your file has downloaded.';
        } catch (e) { status.className = 'note err'; status.textContent = e.message || 'Could not convert that audio.'; }
        btn.disabled = false;
      } });
      input.addEventListener('change', function () { btn.disabled = !input.files[0]; });
      fmt.addEventListener('change', function () { kbps.style.display = fmt.value === 'mp3' ? '' : 'none'; }); kbps.style.display = 'none';
      host.appendChild(fld(W, 'Audio file', input));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Output', fmt), fld(W, 'MP3 bitrate', kbps)]));
      host.appendChild(W.el('div', { class: 'wbtns' }, [btn])); host.appendChild(status);
      host.appendChild(W.el('p', { class: 'note', text: 'Decodes with the Web Audio API (handles MP3, WAV, OGG, M4A and more) and re-encodes in your browser. WAV is lossless; MP3 is smaller.' }));
    },

    'audio-compressor': function (host, W) {
      var input = W.el('input', { type: 'file', class: 'field', accept: 'audio/*', 'aria-label': 'Choose an audio file' });
      var kbps = W.el('select', { class: 'field', 'aria-label': 'Bitrate' }, [['192', '192 kbps (high)'], ['128', '128 kbps'], ['96', '96 kbps'], ['64', '64 kbps (voice)']].map(function (o) { return W.el('option', { value: o[0], text: o[1] }); })); kbps.value = '128';
      var mono = W.el('input', { type: 'checkbox', 'aria-label': 'Mono' });
      var status = W.el('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
      var btn = W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Compress', disabled: 'disabled', onClick: async function () {
        var f = input.files[0]; if (!f) return;
        status.className = 'note'; status.textContent = 'Compressing…'; btn.disabled = true;
        try {
          var ab = await decode(f), ch = channelsOf(ab, mono.checked);
          var parts = await encodeMp3(ch, ab.sampleRate, +kbps.value);
          var blob = new Blob(parts, { type: 'audio/mpeg' });
          W.download(blob, (f.name || 'audio').replace(/\.[^.]+$/, '') + '-compressed.mp3');
          var saved = f.size ? Math.round((1 - blob.size / f.size) * 100) : 0;
          status.textContent = 'Done — ' + bytes(f.size) + ' → ' + bytes(blob.size) + (saved > 0 ? ' (' + saved + '% smaller)' : '') + '.';
        } catch (e) { status.className = 'note err'; status.textContent = e.message || 'Could not compress that audio.'; }
        btn.disabled = false;
      } });
      input.addEventListener('change', function () { btn.disabled = !input.files[0]; });
      host.appendChild(fld(W, 'Audio file', input));
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.el('label', { class: 'winline' }, [W.el('span', { class: 'wlab', text: 'Bitrate' }), kbps]), W.el('label', { class: 'winline' }, [mono, W.el('span', { text: ' Mono' })]), btn]));
      host.appendChild(status);
      host.appendChild(W.el('p', { class: 'note', text: 'Re-encodes to MP3 at a lower bitrate to shrink the file. Lower bitrate and mono give smaller files; 64 kbps mono is great for spoken voice.' }));
    },

    'audio-trimmer': function (host, W) {
      var input = W.el('input', { type: 'file', class: 'field', accept: 'audio/*', 'aria-label': 'Choose an audio file' });
      var player = W.el('audio', { controls: '', style: 'width:100%;margin:8px 0' });
      var start = W.el('input', { class: 'field', type: 'number', value: '0', min: '0', step: '0.1', 'aria-label': 'Start (seconds)' });
      var end = W.el('input', { class: 'field', type: 'number', value: '10', min: '0', step: '0.1', 'aria-label': 'End (seconds)' });
      var status = W.el('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
      var decoded = null;
      input.addEventListener('change', async function () {
        var f = input.files[0]; if (!f) return;
        player.src = URL.createObjectURL(f); status.className = 'note'; status.textContent = 'Reading…';
        try { decoded = await decode(f); end.value = decoded.duration.toFixed(1); status.textContent = 'Length ' + fmtTime(decoded.duration) + '. Set start and end, then trim.'; }
        catch (e) { status.className = 'note err'; status.textContent = 'Could not read that audio.'; }
      });
      var btn = W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Trim & download WAV', onClick: function () {
        if (!decoded) { status.className = 'note err'; status.textContent = 'Choose a file first.'; return; }
        var s = Math.max(0, +start.value || 0), e = Math.min(decoded.duration, +end.value || 0);
        if (e <= s) { status.className = 'note err'; status.textContent = 'End must be after start.'; return; }
        var sr = decoded.sampleRate, i0 = (s * sr) | 0, i1 = (e * sr) | 0, n = decoded.numberOfChannels;
        var ch = [];
        for (var c = 0; c < Math.min(n, 2); c++) ch.push(decoded.getChannelData(c).slice(i0, i1));
        W.download(new Blob([encodeWav(ch, sr)], { type: 'audio/wav' }), 'trimmed.wav');
        status.className = 'note'; status.textContent = 'Trimmed ' + (e - s).toFixed(1) + 's — downloaded.';
      } });
      host.appendChild(fld(W, 'Audio file', input)); host.appendChild(player);
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Start (s)', start), fld(W, 'End (s)', end)]));
      host.appendChild(W.el('div', { class: 'wbtns' }, [btn])); host.appendChild(status);
      host.appendChild(W.el('p', { class: 'note', text: 'Cuts a section from an audio file and saves it as WAV, all in your browser.' }));
    },

    'voice-recorder': function (host, W) {
      var rec = null, chunks = [], stream = null, t0 = 0, iv = null;
      var status = W.el('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
      var timer = W.el('b', { class: 'wmono', text: '0:00', style: 'font-size:1.4rem' });
      var player = W.el('audio', { controls: '', style: 'width:100%;margin:8px 0;display:none' });
      var lastBlob = null;
      var startBtn = W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Record', onClick: async function () {
        if (!navigator.mediaDevices || !root.MediaRecorder) { status.className = 'note err'; status.textContent = 'Recording is not supported in this browser.'; return; }
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          rec = new MediaRecorder(stream); chunks = [];
          rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
          rec.onstop = function () {
            lastBlob = new Blob(chunks, { type: chunks[0] ? chunks[0].type : 'audio/webm' });
            player.src = URL.createObjectURL(lastBlob); player.style.display = ''; dlBtn.disabled = false;
            stream.getTracks().forEach(function (t) { t.stop(); });
          };
          rec.start(); t0 = Date.now(); timer.textContent = '0:00';
          iv = setInterval(function () { timer.textContent = fmtTime((Date.now() - t0) / 1000); }, 500);
          startBtn.disabled = true; stopBtn.disabled = false; status.className = 'note'; status.textContent = 'Recording…';
        } catch (e) { status.className = 'note err'; status.textContent = 'Could not access the microphone.'; }
      } });
      var stopBtn = W.el('button', { class: 'btn', type: 'button', text: 'Stop', disabled: 'disabled', onClick: function () {
        if (rec && rec.state !== 'inactive') rec.stop(); clearInterval(iv);
        startBtn.disabled = false; stopBtn.disabled = true; status.textContent = 'Recorded ' + timer.textContent + '.';
      } });
      var dlBtn = W.el('button', { class: 'btn', type: 'button', text: 'Download', disabled: 'disabled', onClick: function () { if (lastBlob) W.download(lastBlob, 'recording.webm'); } });
      window.addEventListener('pagehide', function () { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); });
      host.appendChild(W.el('div', { class: 'calc-headline' }, [W.el('span', { class: 'ch-label', text: 'Recording time' }), timer]));
      host.appendChild(W.el('div', { class: 'wbtns' }, [startBtn, stopBtn, dlBtn]));
      host.appendChild(player); host.appendChild(status);
      host.appendChild(W.el('p', { class: 'note', text: 'Records from your microphone and saves a WebM/Opus file — entirely in your browser, never uploaded. Convert it to MP3 with the Audio Converter if you need.' }));
    },

    'text-to-speech': function (host, W) {
      var synth = root.speechSynthesis;
      var ta = W.el('textarea', { class: 'field wtext', rows: '5', placeholder: 'Type something to hear it spoken…' }); ta.value = 'Hello — this text is being read aloud by your browser.';
      var voice = W.el('select', { class: 'field', 'aria-label': 'Voice' });
      var rate = W.el('input', { type: 'range', min: '0.5', max: '2', step: '0.1', value: '1', class: 'field', 'aria-label': 'Rate' });
      var pitch = W.el('input', { type: 'range', min: '0', max: '2', step: '0.1', value: '1', class: 'field', 'aria-label': 'Pitch' });
      var status = W.el('p', { class: 'note' });
      function fill() { if (!synth) return; voice.innerHTML = ''; synth.getVoices().forEach(function (v, i) { voice.appendChild(W.el('option', { value: String(i), text: v.name + ' (' + v.lang + ')' })); }); }
      if (synth) { fill(); synth.onvoiceschanged = fill; }
      var speakBtn = W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Speak', onClick: function () {
        if (!synth) { status.className = 'note err'; status.textContent = 'Speech is not supported in this browser.'; return; }
        synth.cancel();
        var u = new SpeechSynthesisUtterance(ta.value);
        var vs = synth.getVoices(); if (vs[+voice.value]) u.voice = vs[+voice.value];
        u.rate = +rate.value; u.pitch = +pitch.value; synth.speak(u);
        status.className = 'note'; status.textContent = 'Speaking…';
      } });
      var stopBtn = W.el('button', { class: 'btn', type: 'button', text: 'Stop', onClick: function () { if (synth) synth.cancel(); status.textContent = ''; } });
      host.appendChild(fld(W, 'Text', ta));
      host.appendChild(W.el('div', { class: 'wgrid2' }, [fld(W, 'Voice', voice), fld(W, 'Rate', rate), fld(W, 'Pitch', pitch)]));
      host.appendChild(W.el('div', { class: 'wbtns' }, [speakBtn, stopBtn])); host.appendChild(status);
      host.appendChild(W.el('p', { class: 'note', text: 'Uses your device’s built-in voices (SpeechSynthesis). Available voices depend on your operating system. Browsers don’t allow saving this speech to a file.' }));
    },

    'speech-to-text': function (host, W) {
      var SR = root.SpeechRecognition || root.webkitSpeechRecognition;
      var out = W.el('textarea', { class: 'field wtext', rows: '8', 'aria-label': 'Transcript', placeholder: 'Your speech will appear here…' });
      var status = W.el('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
      var recog = null, running = false, finalText = '';
      var startBtn = W.el('button', { class: 'btn btn-primary', type: 'button', text: 'Start dictation', onClick: function () {
        if (!SR) { status.className = 'note err'; status.textContent = 'Live dictation needs Chrome or Edge — this browser doesn’t support it.'; return; }
        recog = new SR(); recog.continuous = true; recog.interimResults = true; recog.lang = 'en-US';
        finalText = out.value ? out.value + ' ' : '';
        recog.onresult = function (e) {
          var interim = '';
          for (var i = e.resultIndex; i < e.results.length; i++) { var r = e.results[i]; if (r.isFinal) finalText += r[0].transcript + ' '; else interim += r[0].transcript; }
          out.value = finalText + interim;
        };
        recog.onerror = function (e) { status.className = 'note err'; status.textContent = 'Dictation error: ' + (e.error || 'unknown') + '.'; };
        recog.onend = function () { if (running) recog.start(); };
        recog.start(); running = true; startBtn.disabled = true; stopBtn.disabled = false;
        status.className = 'note'; status.textContent = 'Listening… speak now.';
      } });
      var stopBtn = W.el('button', { class: 'btn', type: 'button', text: 'Stop', disabled: 'disabled', onClick: function () { running = false; if (recog) recog.stop(); startBtn.disabled = false; stopBtn.disabled = true; status.textContent = 'Stopped.'; } });
      host.appendChild(W.el('div', { class: 'wbtns' }, [startBtn, stopBtn]));
      host.appendChild(out);
      host.appendChild(W.el('div', { class: 'wbtns' }, [W.copyBtn('Copy', function () { return out.value; }), W.el('button', { class: 'btn', type: 'button', text: 'Download .txt', onClick: function () { W.download(out.value, 'transcript.txt', 'text/plain'); } }), W.el('button', { class: 'btn', type: 'button', text: 'Clear', onClick: function () { out.value = ''; } })]));
      host.appendChild(status);
      host.appendChild(W.el('p', { class: 'note', text: 'Live speech recognition runs through the browser (SpeechRecognition). Best support is in Chrome and Edge. Your microphone audio is handled by the browser, not uploaded by this tool.' }));
    }

  };

  root.VKAudio = { encodeWav: encodeWav, floatTo16: floatTo16 };
  if (typeof module === 'object' && module.exports) module.exports = root.VKAudio;
  if (typeof root.VKW !== 'undefined') {
    Object.keys(T).forEach(function (k) { root.VKW.tools[k] = T[k]; });
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', root.VKW.boot); else root.VKW.boot(); }
  }
})(typeof window !== 'undefined' ? window : globalThis);
