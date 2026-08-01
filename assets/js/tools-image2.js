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

  var QUALITY = { k: 'quality', label: 'Quality', type: 'range', min: 40, max: 100, def: 90, suffix: '%' };
  var MATTE = { k: 'bg', label: 'Background (fills transparency)', type: 'select', def: '#ffffff',
    options: [{ v: '#ffffff', label: 'White' }, { v: '#000000', label: 'Black' }, { v: '#0d1420', label: 'Dark' }] };

  /* factory: decode any image the browser can read, redraw, re-encode to `mime` */
  function convertTool(spec) {
    var options = [];
    if (spec.quality) options.push(QUALITY);
    if (spec.matte) options.push(MATTE);
    return {
      accept: spec.accept || 'image/*', action: 'Convert', dropLabel: spec.drop || 'Choose an image', options: options,
      process: async function (files, o, api) {
        var f = files[0], img = await api.loadImage(f);
        var w = img.naturalWidth || 512, h = img.naturalHeight || 512;
        var k = canvasFrom(w, h);
        if (spec.matte) { k.ctx.fillStyle = o.bg || '#ffffff'; k.ctx.fillRect(0, 0, w, h); }
        k.ctx.drawImage(img, 0, 0, w, h);
        api.progress(0.6);
        var blob = await toBlob(k.c, spec.mime, spec.quality ? o.quality / 100 : undefined);
        return {
          previewUrl: api.urls.make(blob),
          stats: [{ label: 'Format', value: spec.ext.toUpperCase() }, { label: 'Size', value: w + '×' + h }, { label: 'File', value: api.bytes(blob.size) }],
          downloads: [{ label: 'Download ' + spec.ext.toUpperCase(), blob: blob, name: baseName(f.name) + '.' + spec.ext }],
          status: 'Converted to ' + spec.ext.toUpperCase()
        };
      }
    };
  }

  function coverInto(ctx, img, x, y, tw, th) {
    var s = Math.max(tw / img.naturalWidth, th / img.naturalHeight);
    var w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, x + (tw - w) / 2, y + (th - h) / 2, w, h);
  }
  /* factory: resize/crop to one of a set of named target dimensions */
  function presetResizeTool(spec) {
    return {
      accept: 'image/*', action: 'Resize', dropLabel: spec.drop || 'Choose an image',
      options: [
        { k: 'preset', label: spec.presetLabel || 'Size', type: 'select', def: spec.def, options: spec.presets.map(function (p) { return { v: p.v, label: p.label }; }) },
        { k: 'mode', label: 'Fit', type: 'select', def: 'cover', options: [{ v: 'cover', label: 'Fill & crop' }, { v: 'contain', label: 'Fit (no crop)' }] },
        { k: 'bg', label: 'Background (fit mode)', type: 'select', def: '#ffffff', options: [{ v: '#ffffff', label: 'White' }, { v: '#000000', label: 'Black' }, { v: '#0d1420', label: 'Dark' }] }
      ],
      process: async function (files, o, api) {
        var p = null; spec.presets.forEach(function (x) { if (x.v === o.preset) p = x; }); if (!p) p = spec.presets[0];
        var f = files[0], img = await api.loadImage(f), k = canvasFrom(p.w, p.h);
        if (o.mode === 'contain') {
          k.ctx.fillStyle = o.bg; k.ctx.fillRect(0, 0, p.w, p.h);
          var s = Math.min(p.w / img.naturalWidth, p.h / img.naturalHeight), w = img.naturalWidth * s, h = img.naturalHeight * s;
          k.ctx.drawImage(img, (p.w - w) / 2, (p.h - h) / 2, w, h);
        } else coverInto(k.ctx, img, 0, 0, p.w, p.h);
        api.progress(0.6);
        var blob = await toBlob(k.c, 'image/png');
        return {
          previewUrl: api.urls.make(blob),
          stats: [{ label: 'Preset', value: p.label }, { label: 'Size', value: p.w + '×' + p.h }, { label: 'File', value: api.bytes(blob.size) }],
          downloads: [{ label: 'Download', blob: blob, name: baseName(f.name) + '-' + p.v + '.png' }],
          status: 'Resized to ' + p.w + '×' + p.h,
          note: spec.note || ''
        };
      }
    };
  }

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
    },

    /* ---------- dedicated converters ---------- */
    'jpg-to-webp': convertTool({ accept: 'image/jpeg,image/*', drop: 'Choose a JPG', mime: 'image/webp', ext: 'webp', quality: true }),
    'png-to-webp': convertTool({ accept: 'image/png,image/*', drop: 'Choose a PNG', mime: 'image/webp', ext: 'webp', quality: true }),
    'webp-to-png': convertTool({ accept: 'image/webp,image/*', drop: 'Choose a WebP', mime: 'image/png', ext: 'png' }),
    'webp-to-jpg': convertTool({ accept: 'image/webp,image/*', drop: 'Choose a WebP', mime: 'image/jpeg', ext: 'jpg', quality: true, matte: true }),
    'svg-to-png': convertTool({ accept: '.svg,image/svg+xml', drop: 'Choose an SVG', mime: 'image/png', ext: 'png' }),

    /* ---------- filter studio ---------- */
    'filter-studio': {
      accept: 'image/*', action: 'Apply filter', dropLabel: 'Choose a photo',
      options: [
        { k: 'filter', label: 'Filter', type: 'select', def: 'grayscale',
          options: [
            { v: 'grayscale', label: 'Black & white' }, { v: 'sepia', label: 'Sepia' }, { v: 'invert', label: 'Invert' },
            { v: 'vintage', label: 'Vintage' }, { v: 'cool', label: 'Cool' }, { v: 'warm', label: 'Warm' },
            { v: 'contrast', label: 'High contrast' }, { v: 'film', label: 'B&W film' }, { v: 'bright', label: 'Bright & punchy' }
          ] }
      ],
      process: async function (files, o, api) {
        var F = { grayscale: 'grayscale(1)', sepia: 'sepia(0.75)', invert: 'invert(1)',
          vintage: 'sepia(0.4) contrast(1.1) saturate(1.25) brightness(1.05)',
          cool: 'saturate(1.1) hue-rotate(-15deg) brightness(1.02)',
          warm: 'saturate(1.2) hue-rotate(12deg) brightness(1.03)',
          contrast: 'contrast(1.4)', film: 'grayscale(1) contrast(1.2)', bright: 'brightness(1.1) contrast(1.1) saturate(1.2)' };
        var f = files[0], img = await api.loadImage(f);
        var k = canvasFrom(img.naturalWidth, img.naturalHeight);
        k.ctx.filter = F[o.filter] || 'none';
        k.ctx.drawImage(img, 0, 0);
        api.progress(0.6);
        var blob = await toBlob(k.c, 'image/png');
        return {
          previewUrl: api.urls.make(blob),
          stats: [{ label: 'Filter', value: o.filter }, { label: 'Size', value: img.naturalWidth + '×' + img.naturalHeight }, { label: 'File', value: api.bytes(blob.size) }],
          downloads: [{ label: 'Download', blob: blob, name: baseName(f.name) + '-' + o.filter + '.png' }],
          status: 'Filter applied'
        };
      }
    },

    /* ---------- sharpen (convolution) ---------- */
    'image-sharpen': {
      accept: 'image/*', action: 'Sharpen', dropLabel: 'Choose an image to sharpen',
      options: [{ k: 'amount', label: 'Sharpen amount', type: 'range', min: 1, max: 10, def: 4 }],
      process: async function (files, o, api) {
        var f = files[0], img = await api.loadImage(f);
        var w = img.naturalWidth, h = img.naturalHeight, k = canvasFrom(w, h);
        k.ctx.drawImage(img, 0, 0);
        var src = k.ctx.getImageData(0, 0, w, h);
        /* Off the main thread. This convolution is ~15 operations per pixel —
           on a 12 MP photo that is 180 million of them, which froze the tab for
           seconds and meant the progress calls in the old inline loop never
           reached the screen at all. See pixelworker.js. */
        var dst = await root.VKPixels.run('sharpen', src, { amount: o.amount },
          function (frac) { api.progress(0.2 + 0.7 * frac); });
        k.ctx.putImageData(dst, 0, 0);
        var blob = await toBlob(k.c, 'image/png');
        return {
          previewUrl: api.urls.make(blob),
          stats: [{ label: 'Amount', value: o.amount }, { label: 'Size', value: w + '×' + h }, { label: 'File', value: api.bytes(blob.size) }],
          downloads: [{ label: 'Download', blob: blob, name: baseName(f.name) + '-sharp.png' }],
          status: 'Sharpened'
        };
      }
    },

    /* ---------- thumbnail maker ---------- */
    'thumbnail-maker': presetResizeTool({ drop: 'Choose an image for a thumbnail', def: 'yt', presets: [
      { v: 'yt', label: 'YouTube 1280×720', w: 1280, h: 720 },
      { v: 'blog', label: 'Blog / OG 1200×630', w: 1200, h: 630 },
      { v: 'square', label: 'Square 1080×1080', w: 1080, h: 1080 },
      { v: 'wide', label: 'Wide 1600×900', w: 1600, h: 900 },
      { v: 'small', label: 'Small 640×360', w: 640, h: 360 }
    ] }),

    /* ---------- social media sizer ---------- */
    'social-media-image': presetResizeTool({ drop: 'Choose an image', presetLabel: 'Platform / format', def: 'ig-post', presets: [
      { v: 'ig-post', label: 'Instagram post 1080×1080', w: 1080, h: 1080 },
      { v: 'ig-portrait', label: 'Instagram portrait 1080×1350', w: 1080, h: 1350 },
      { v: 'ig-story', label: 'Instagram / TikTok story 1080×1920', w: 1080, h: 1920 },
      { v: 'fb-post', label: 'Facebook post 1200×630', w: 1200, h: 630 },
      { v: 'x-post', label: 'X / Twitter post 1600×900', w: 1600, h: 900 },
      { v: 'x-header', label: 'X / Twitter header 1500×500', w: 1500, h: 500 },
      { v: 'li-post', label: 'LinkedIn post 1200×627', w: 1200, h: 627 },
      { v: 'yt-thumb', label: 'YouTube thumbnail 1280×720', w: 1280, h: 720 },
      { v: 'pin', label: 'Pinterest pin 1000×1500', w: 1000, h: 1500 }
    ] }),

    /* ---------- passport photo ---------- */
    'passport-photo-maker': presetResizeTool({ drop: 'Choose a head-and-shoulders photo', presetLabel: 'Passport size', def: 'us', note: 'Crops to the correct size and shape at 300 DPI. It does not check official head-position or background rules — review your government’s photo guidance.', presets: [
      { v: 'us', label: 'US / India 2×2 in (600×600)', w: 600, h: 600 },
      { v: 'uk-eu', label: 'UK / EU / Schengen 35×45 mm (413×531)', w: 413, h: 531 },
      { v: 'ca', label: 'Canada 50×70 mm (590×826)', w: 590, h: 826 },
      { v: 'au', label: 'Australia 35×45 mm (413×531)', w: 413, h: 531 }
    ] }),

    /* ---------- collage maker ---------- */
    'collage-maker': {
      accept: 'image/*', multiple: true, maxFiles: 12, action: 'Make collage', dropLabel: 'Choose 2–12 images',
      options: [
        { k: 'cols', label: 'Columns', type: 'select', def: '2', options: [{ v: '1', label: '1' }, { v: '2', label: '2' }, { v: '3', label: '3' }, { v: '4', label: '4' }] },
        { k: 'cell', label: 'Cell size (px)', def: 400, min: 120, max: 1000, step: 20 },
        { k: 'gap', label: 'Gap (px)', def: 8, min: 0, max: 60, step: 2 },
        { k: 'bg', label: 'Background', type: 'select', def: '#ffffff', options: [{ v: '#ffffff', label: 'White' }, { v: '#000000', label: 'Black' }, { v: '#0d1420', label: 'Dark' }] }
      ],
      process: async function (files, o, api) {
        var imgs = [];
        for (var i = 0; i < files.length; i++) { imgs.push(await api.loadImage(files[i])); api.progress(i / files.length * 0.5); }
        var cols = +o.cols, rows = Math.ceil(imgs.length / cols), cell = o.cell, gap = o.gap;
        var W = cols * cell + (cols + 1) * gap, H = rows * cell + (rows + 1) * gap;
        var k = canvasFrom(W, H); k.ctx.fillStyle = o.bg; k.ctx.fillRect(0, 0, W, H);
        imgs.forEach(function (img, idx) {
          var c = idx % cols, r = Math.floor(idx / cols), x = gap + c * (cell + gap), y = gap + r * (cell + gap);
          k.ctx.save(); k.ctx.beginPath(); k.ctx.rect(x, y, cell, cell); k.ctx.clip();
          coverInto(k.ctx, img, x, y, cell, cell); k.ctx.restore();
        });
        api.progress(0.9);
        var blob = await toBlob(k.c, 'image/png');
        return {
          previewUrl: api.urls.make(blob),
          stats: [{ label: 'Images', value: imgs.length }, { label: 'Grid', value: cols + '×' + rows }, { label: 'Size', value: W + '×' + H }, { label: 'File', value: api.bytes(blob.size) }],
          downloads: [{ label: 'Download collage', blob: blob, name: 'collage.png' }],
          status: 'Collage ready'
        };
      }
    },

    /* ---------- batch compressor ---------- */
    'batch-compress': {
      accept: 'image/*', multiple: true, maxFiles: 20, action: 'Compress all', dropLabel: 'Choose images to compress',
      options: [QUALITY, { k: 'format', label: 'Output', type: 'select', def: 'image/jpeg', options: [{ v: 'image/jpeg', label: 'JPEG' }, { v: 'image/webp', label: 'WebP' }] }],
      process: async function (files, o, api) {
        var downloads = [], totalIn = 0, totalOut = 0, ext = o.format === 'image/webp' ? 'webp' : 'jpg';
        for (var i = 0; i < files.length; i++) {
          var f = files[i]; totalIn += f.size;
          var img = await api.loadImage(f), k = canvasFrom(img.naturalWidth, img.naturalHeight);
          if (o.format === 'image/jpeg') { k.ctx.fillStyle = '#fff'; k.ctx.fillRect(0, 0, k.c.width, k.c.height); }
          k.ctx.drawImage(img, 0, 0);
          var blob = await toBlob(k.c, o.format, o.quality / 100); totalOut += blob.size;
          downloads.push({ label: baseName(f.name) + '.' + ext + ' — ' + api.bytes(blob.size), blob: blob, name: baseName(f.name) + '-min.' + ext });
          api.progress((i + 1) / files.length * 0.9);
        }
        var saved = totalIn ? Math.round((1 - totalOut / totalIn) * 100) : 0;
        return {
          stats: [{ label: 'Images', value: files.length }, { label: 'Before', value: api.bytes(totalIn) }, { label: 'After', value: api.bytes(totalOut) }, { label: 'Saved', value: saved + '%' }],
          downloads: downloads,
          status: 'Compressed ' + files.length + ' images',
          note: 'Click each button to download a compressed image.'
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
