/* tools-image2.js — more image tools. All canvas-based, all on-device.
 * Same shape as tools-image.js: { accept, action, options, process(files,o,api) }.
 * Nothing is uploaded — every pixel is processed in the browser. */
(function (root) {
  'use strict';

  function canvasFrom(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    var ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    return { c: c, ctx: ctx };
  }
  function toBlob(canvas, type, quality) {
    return new Promise(function (res, rej) {
      canvas.toBlob(function (b) { b ? res(b) : rej(new Error('The browser could not encode that image.')); }, type, quality);
    });
  }
  function baseName(name) { return String(name || 'image').replace(/\.[^.]+$/, ''); }

  var T = {

    /* ---------- PNG → JPG (flatten transparency onto a matte) ---------- */
    'png-to-jpg': {
      accept: 'image/*', action: 'Convert to JPG', dropLabel: 'Choose a PNG (or any image)',
      options: [
        { k: 'quality', label: 'Quality', type: 'range', min: 40, max: 100, def: 90, suffix: '%' },
        { k: 'bg', label: 'Background (fills transparency)', type: 'select', def: '#ffffff',
          options: [{ v: '#ffffff', label: 'White' }, { v: '#000000', label: 'Black' }, { v: '#0d1420', label: 'Dark' }] }
      ],
      process: async function (files, o, api) {
        var f = files[0], img = await api.loadImage(f);
        var k = canvasFrom(img.naturalWidth, img.naturalHeight);
        k.ctx.fillStyle = o.bg; k.ctx.fillRect(0, 0, k.c.width, k.c.height);
        k.ctx.drawImage(img, 0, 0);
        api.progress(0.6);
        var blob = await toBlob(k.c, 'image/jpeg', o.quality / 100);
        return {
          previewUrl: api.urls.make(blob),
          stats: [{ label: 'Format', value: 'JPEG' }, { label: 'Size', value: k.c.width + '×' + k.c.height }, { label: 'File', value: api.bytes(blob.size) }],
          downloads: [{ label: 'Download JPG', blob: blob, name: baseName(f.name) + '.jpg' }],
          status: 'Converted to JPG'
        };
      }
    },

    /* ---------- JPG → PNG (lossless) ---------- */
    'jpg-to-png': {
      accept: 'image/*', action: 'Convert to PNG', dropLabel: 'Choose a JPG (or any image)',
      options: [],
      process: async function (files, o, api) {
        var f = files[0], img = await api.loadImage(f);
        var k = canvasFrom(img.naturalWidth, img.naturalHeight);
        k.ctx.drawImage(img, 0, 0);
        api.progress(0.6);
        var blob = await toBlob(k.c, 'image/png');
        return {
          previewUrl: api.urls.make(blob),
          stats: [{ label: 'Format', value: 'PNG (lossless)' }, { label: 'Size', value: k.c.width + '×' + k.c.height }, { label: 'File', value: api.bytes(blob.size) }],
          downloads: [{ label: 'Download PNG', blob: blob, name: baseName(f.name) + '.png' }],
          status: 'Converted to PNG'
        };
      }
    },

    /* ---------- blur ---------- */
    'image-blur': {
      accept: 'image/*', action: 'Blur', dropLabel: 'Choose an image to blur',
      options: [
        { k: 'radius', label: 'Blur amount', type: 'range', min: 1, max: 40, def: 6, suffix: 'px' }
      ],
      process: async function (files, o, api) {
        var f = files[0], img = await api.loadImage(f);
        var k = canvasFrom(img.naturalWidth, img.naturalHeight);
        k.ctx.filter = 'blur(' + o.radius + 'px)';
        k.ctx.drawImage(img, 0, 0);
        api.progress(0.6);
        var blob = await toBlob(k.c, 'image/png');
        return {
          previewUrl: api.urls.make(blob),
          stats: [{ label: 'Blur', value: o.radius + ' px' }, { label: 'Size', value: k.c.width + '×' + k.c.height }, { label: 'File', value: api.bytes(blob.size) }],
          downloads: [{ label: 'Download', blob: blob, name: baseName(f.name) + '-blurred.png' }],
          status: 'Blurred'
        };
      }
    },

    /* ---------- brightness / contrast / saturation ---------- */
    'image-brightness': {
      accept: 'image/*', action: 'Adjust', dropLabel: 'Choose a photo to adjust',
      options: [
        { k: 'brightness', label: 'Brightness', type: 'range', min: 0, max: 200, def: 100, suffix: '%' },
        { k: 'contrast', label: 'Contrast', type: 'range', min: 0, max: 200, def: 100, suffix: '%' },
        { k: 'saturation', label: 'Saturation', type: 'range', min: 0, max: 200, def: 100, suffix: '%' }
      ],
      process: async function (files, o, api) {
        var f = files[0], img = await api.loadImage(f);
        var k = canvasFrom(img.naturalWidth, img.naturalHeight);
        k.ctx.filter = 'brightness(' + o.brightness + '%) contrast(' + o.contrast + '%) saturate(' + o.saturation + '%)';
        k.ctx.drawImage(img, 0, 0);
        api.progress(0.6);
        var blob = await toBlob(k.c, 'image/png');
        return {
          previewUrl: api.urls.make(blob),
          stats: [{ label: 'Brightness', value: o.brightness + '%' }, { label: 'Contrast', value: o.contrast + '%' }, { label: 'Saturation', value: o.saturation + '%' }, { label: 'File', value: api.bytes(blob.size) }],
          downloads: [{ label: 'Download', blob: blob, name: baseName(f.name) + '-adjusted.png' }],
          status: 'Adjusted'
        };
      }
    },

    /* ---------- rounded corners ---------- */
    'round-corners': {
      accept: 'image/*', action: 'Round corners', dropLabel: 'Choose an image',
      options: [
        { k: 'radius', label: 'Corner radius', type: 'range', min: 2, max: 50, def: 12, suffix: '%' }
      ],
      process: async function (files, o, api) {
        var f = files[0], img = await api.loadImage(f);
        var w = img.naturalWidth, h = img.naturalHeight;
        var r = Math.min(w, h) * (o.radius / 100);
        var k = canvasFrom(w, h);
        var ctx = k.ctx;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.arcTo(w, 0, w, h, r);
        ctx.arcTo(w, h, 0, h, r);
        ctx.arcTo(0, h, 0, 0, r);
        ctx.arcTo(0, 0, w, 0, r);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 0, 0);
        api.progress(0.6);
        var blob = await toBlob(k.c, 'image/png');
        return {
          previewUrl: api.urls.make(blob),
          stats: [{ label: 'Radius', value: Math.round(r) + ' px' }, { label: 'Size', value: w + '×' + h }, { label: 'File', value: api.bytes(blob.size) }],
          downloads: [{ label: 'Download PNG', blob: blob, name: baseName(f.name) + '-rounded.png' }],
          status: 'Rounded',
          note: 'Saved as PNG so the rounded corners stay transparent.'
        };
      }
    }

  };

  root.VKImageTools2 = T;
  if (typeof module === 'object' && module.exports) module.exports = T;

  function boot() {
    var host = document.getElementById('workspace');
    if (!host || !root.VKFile) return;
    if (host.querySelector('.calc-form') || host.querySelector('.ftool .drop')) return;
    var spec = T[host.getAttribute('data-tool')];
    if (spec) root.VKFile.mount(host, spec);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
