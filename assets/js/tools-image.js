/* tools-image.js — image tools. All canvas-based, all on-device.
 * The traffic engine: these are the highest-volume searches on the site. */
(function (root) {
  'use strict';

  function canvasFrom(img, w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    var ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    return { c: c, ctx: ctx };
  }
  function toBlob(canvas, type, quality) {
    return new Promise(function (res, rej) {
      canvas.toBlob(function (b) {
        if (!b) rej(new Error('The browser could not encode that image. Try a different format.'));
        else res(b);
      }, type, quality);
    });
  }
  function baseName(name) { return String(name || 'image').replace(/\.[^.]+$/, ''); }
  var TYPE = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  var EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

  /* draw with a white matte when flattening transparency into JPEG */
  function draw(img, w, h, type) {
    var k = canvasFrom(img, w, h);
    if (type === TYPE.jpeg) { k.ctx.fillStyle = '#fff'; k.ctx.fillRect(0, 0, k.c.width, k.c.height); }
    k.ctx.drawImage(img, 0, 0, k.c.width, k.c.height);
    return k.c;
  }

  var T = {

    'compress-image': {
      accept: 'image/*', action: 'Compress',
      dropLabel: 'Choose an image or drag it here',
      options: [
        { k: 'quality', label: 'Quality', type: 'range', min: 30, max: 95, def: 75, suffix: '%' },
        { k: 'format', label: 'Output format', type: 'select', def: 'image/jpeg',
          options: [{ v: 'image/jpeg', label: 'JPEG (smallest)' }, { v: 'image/webp', label: 'WebP (modern)' }] }
      ],
      process: async function (files, o, api) {
        var f = files[0];
        var img = await api.loadImage(f);
        api.progress(0.5);
        var blob = await toBlob(draw(img, img.naturalWidth, img.naturalHeight, o.format), o.format, o.quality / 100);
        var saved = f.size ? Math.round((1 - blob.size / f.size) * 100) : 0;
        return {
          previewUrl: api.urls.make(blob),
          previewAlt: 'Compressed image preview',
          stats: [
            { label: 'Original', value: api.bytes(f.size) },
            { label: 'Compressed', value: api.bytes(blob.size) },
            { label: 'Saved', value: (saved > 0 ? saved + '%' : 'nothing') },
            { label: 'Dimensions', value: img.naturalWidth + '×' + img.naturalHeight }
          ],
          downloads: [{ label: 'Download', blob: blob, name: baseName(f.name) + '-compressed.' + EXT[o.format] }],
          status: 'Compressed',
          note: saved <= 0 ? 'This file was already smaller than the re-encoded version — the original is probably better. Try a lower quality, or keep what you have.' : ''
        };
      }
    },

    'resize-image': {
      accept: 'image/*', action: 'Resize',
      dropLabel: 'Choose an image or drag it here',
      options: [
        { k: 'width', label: 'Width (px)', def: 1200, min: 1, max: 12000, step: 1 },
        { k: 'mode', label: 'Fit', type: 'select', def: 'ratio',
          options: [{ v: 'ratio', label: 'Keep aspect ratio' }, { v: 'exact', label: 'Exact height too' }] },
        { k: 'height', label: 'Height (px, exact mode)', def: 800, min: 1, max: 12000, step: 1 },
        { k: 'format', label: 'Format', type: 'select', def: 'image/png',
          options: [{ v: 'image/png', label: 'PNG' }, { v: 'image/jpeg', label: 'JPEG' }, { v: 'image/webp', label: 'WebP' }] }
      ],
      process: async function (files, o, api) {
        var f = files[0];
        var img = await api.loadImage(f);
        var w = o.width;
        var h = o.mode === 'exact' ? o.height : Math.round(o.width * img.naturalHeight / img.naturalWidth);
        api.progress(0.5);
        var blob = await toBlob(draw(img, w, h, o.format), o.format, 0.92);
        return {
          previewUrl: api.urls.make(blob),
          stats: [
            { label: 'From', value: img.naturalWidth + '×' + img.naturalHeight },
            { label: 'To', value: w + '×' + h },
            { label: 'Size', value: api.bytes(blob.size) },
            { label: 'Change', value: f.size ? (blob.size < f.size ? '−' : '+') + Math.abs(Math.round((1 - blob.size / f.size) * 100)) + '%' : '—' }
          ],
          downloads: [{ label: 'Download', blob: blob, name: baseName(f.name) + '-' + w + 'x' + h + '.' + EXT[o.format] }],
          status: 'Resized'
        };
      }
    },

    'convert-image': {
      accept: 'image/*', action: 'Convert',
      dropLabel: 'Choose an image to convert',
      options: [
        { k: 'format', label: 'Convert to', type: 'select', def: 'image/png',
          options: [{ v: 'image/png', label: 'PNG' }, { v: 'image/jpeg', label: 'JPEG' }, { v: 'image/webp', label: 'WebP' }] },
        { k: 'quality', label: 'Quality (JPEG/WebP)', type: 'range', min: 40, max: 100, def: 92, suffix: '%' }
      ],
      process: async function (files, o, api) {
        var f = files[0];
        var img = await api.loadImage(f);
        api.progress(0.5);
        var blob = await toBlob(draw(img, img.naturalWidth, img.naturalHeight, o.format), o.format, o.quality / 100);
        return {
          previewUrl: api.urls.make(blob),
          stats: [
            { label: 'From', value: (f.type || 'unknown').replace('image/', '').toUpperCase() },
            { label: 'To', value: EXT[o.format].toUpperCase() },
            { label: 'Original', value: api.bytes(f.size) },
            { label: 'New', value: api.bytes(blob.size) }
          ],
          downloads: [{ label: 'Download ' + EXT[o.format].toUpperCase(), blob: blob, name: baseName(f.name) + '.' + EXT[o.format] }],
          status: 'Converted',
          note: o.format === TYPE.jpeg ? 'JPEG has no transparency — any transparent areas were filled with white.' : ''
        };
      }
    },

    'heic-converter': {
      accept: 'image/*', action: 'Convert',
      dropLabel: 'Choose an iPhone photo',
      options: [
        { k: 'format', label: 'Convert to', type: 'select', def: 'image/jpeg',
          options: [{ v: 'image/jpeg', label: 'JPEG' }, { v: 'image/png', label: 'PNG' }] },
        { k: 'quality', label: 'Quality', type: 'range', min: 60, max: 100, def: 90, suffix: '%' }
      ],
      process: async function (files, o, api) {
        var f = files[0];
        var img;
        try { img = await api.loadImage(f); }
        catch (e) {
          throw new Error('This browser can’t decode that HEIC file. Safari on Apple devices can; Chrome and Firefox generally cannot. On iPhone you can also set Camera → Formats → Most Compatible to shoot JPEG directly.');
        }
        api.progress(0.5);
        var blob = await toBlob(draw(img, img.naturalWidth, img.naturalHeight, o.format), o.format, o.quality / 100);
        return {
          previewUrl: api.urls.make(blob),
          stats: [
            { label: 'Original', value: api.bytes(f.size) },
            { label: 'Converted', value: api.bytes(blob.size) },
            { label: 'Dimensions', value: img.naturalWidth + '×' + img.naturalHeight },
            { label: 'Format', value: EXT[o.format].toUpperCase() }
          ],
          downloads: [{ label: 'Download', blob: blob, name: baseName(f.name) + '.' + EXT[o.format] }],
          status: 'Converted'
        };
      }
    },

    'crop-image': {
      accept: 'image/*', action: 'Crop',
      dropLabel: 'Choose an image to crop',
      options: [
        { k: 'ratio', label: 'Aspect ratio', type: 'select', def: '1:1',
          options: [{ v: '1:1', label: 'Square 1:1' }, { v: '4:5', label: 'Portrait 4:5' }, { v: '9:16', label: 'Story 9:16' },
                    { v: '16:9', label: 'Wide 16:9' }, { v: '3:2', label: 'Photo 3:2' }] },
        { k: 'anchor', label: 'Crop from', type: 'select', def: 'center',
          options: [{ v: 'center', label: 'Centre' }, { v: 'top', label: 'Top' }, { v: 'bottom', label: 'Bottom' }] }
      ],
      process: async function (files, o, api) {
        var f = files[0];
        var img = await api.loadImage(f);
        var parts = String(o.ratio).split(':');
        var target = (+parts[0]) / (+parts[1]);
        var iw = img.naturalWidth, ih = img.naturalHeight;
        var sw = iw, sh = Math.round(iw / target);
        if (sh > ih) { sh = ih; sw = Math.round(ih * target); }
        var sx = Math.round((iw - sw) / 2);
        var sy = o.anchor === 'top' ? 0 : o.anchor === 'bottom' ? ih - sh : Math.round((ih - sh) / 2);
        var k = canvasFrom(img, sw, sh);
        k.ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        api.progress(0.6);
        var blob = await toBlob(k.c, 'image/png');
        return {
          previewUrl: api.urls.make(blob),
          stats: [
            { label: 'Original', value: iw + '×' + ih },
            { label: 'Cropped', value: sw + '×' + sh },
            { label: 'Ratio', value: o.ratio },
            { label: 'Size', value: api.bytes(blob.size) }
          ],
          downloads: [{ label: 'Download', blob: blob, name: baseName(f.name) + '-' + String(o.ratio).replace(':', 'x') + '.png' }],
          status: 'Cropped'
        };
      }
    },

    'bulk-resize': {
      accept: 'image/*', multiple: true, maxFiles: 20, action: 'Resize all',
      dropLabel: 'Choose up to 20 images',
      options: [
        { k: 'width', label: 'Max width (px)', def: 1600, min: 1, max: 12000, step: 10 },
        { k: 'format', label: 'Format', type: 'select', def: 'image/jpeg',
          options: [{ v: 'image/jpeg', label: 'JPEG' }, { v: 'image/png', label: 'PNG' }, { v: 'image/webp', label: 'WebP' }] },
        { k: 'quality', label: 'Quality', type: 'range', min: 40, max: 100, def: 85, suffix: '%' }
      ],
      process: async function (files, o, api) {
        var outs = [], before = 0, after = 0;
        for (var i = 0; i < files.length; i++) {
          var f = files[i];
          var img = await api.loadImage(f);
          var w = Math.min(o.width, img.naturalWidth);
          var h = Math.round(w * img.naturalHeight / img.naturalWidth);
          var blob = await toBlob(draw(img, w, h, o.format), o.format, o.quality / 100);
          before += f.size; after += blob.size;
          outs.push({ label: baseName(f.name).slice(0, 18), blob: blob, name: baseName(f.name) + '-' + w + '.' + EXT[o.format] });
          api.progress((i + 1) / files.length);
        }
        return {
          stats: [
            { label: 'Images', value: files.length },
            { label: 'Before', value: api.bytes(before) },
            { label: 'After', value: api.bytes(after) },
            { label: 'Saved', value: before ? Math.round((1 - after / before) * 100) + '%' : '—' }
          ],
          downloads: outs,
          status: files.length + ' images resized',
          note: 'Each file downloads separately — browsers can’t write a zip without an extra library, and we’d rather not load one you don’t need.'
        };
      }
    },

    'favicon-generator': {
      accept: 'image/*', action: 'Generate favicons',
      dropLabel: 'Choose a square logo (512×512 or larger is best)',
      options: [],
      process: async function (files, o, api) {
        var f = files[0];
        var img = await api.loadImage(f);
        var sizes = [16, 32, 48, 180, 192, 512];
        var outs = [];
        for (var i = 0; i < sizes.length; i++) {
          var s = sizes[i];
          var blob = await toBlob(draw(img, s, s, 'image/png'), 'image/png');
          outs.push({ label: s + '×' + s, blob: blob, name: 'favicon-' + s + 'x' + s + '.png' });
          api.progress((i + 1) / sizes.length);
        }
        var html = '&lt;link rel="icon" href="/favicon-32x32.png" sizes="32x32"&gt;\n' +
                   '&lt;link rel="icon" href="/favicon-192x192.png" sizes="192x192"&gt;\n' +
                   '&lt;link rel="apple-touch-icon" href="/favicon-180x180.png"&gt;';
        return {
          previewUrl: api.urls.make(outs[outs.length - 1].blob),
          stats: [
            { label: 'Sizes made', value: sizes.length },
            { label: 'Source', value: img.naturalWidth + '×' + img.naturalHeight },
            { label: 'Apple touch', value: '180×180' },
            { label: 'Android', value: '192×192' }
          ],
          downloads: outs,
          status: 'Favicons ready',
          note: img.naturalWidth < 512
            ? 'Your source is under 512px, so the large sizes are upscaled and will look soft. Start from a bigger logo if you can.<br><br>Paste into your &lt;head&gt;:<pre class="ft-code">' + html + '</pre>'
            : 'Paste into your &lt;head&gt;:<pre class="ft-code">' + html + '</pre>'
        };
      }
    },

    'image-watermark': {
      accept: 'image/*', action: 'Add watermark',
      dropLabel: 'Choose an image to watermark',
      options: [
        { k: 'size', label: 'Text size (% of width)', type: 'range', min: 2, max: 20, def: 6, suffix: '%' },
        { k: 'opacity', label: 'Opacity', type: 'range', min: 5, max: 100, def: 35, suffix: '%' },
        { k: 'position', label: 'Position', type: 'select', def: 'tile',
          options: [{ v: 'tile', label: 'Tiled across' }, { v: 'center', label: 'Centre' }, { v: 'corner', label: 'Bottom right' }] }
      ],
      process: async function (files, o, api) {
        var f = files[0];
        var img = await api.loadImage(f);
        var text = (document.getElementById('ft-wm-text') || {}).value || '© Vootkit';
        var k = canvasFrom(img, img.naturalWidth, img.naturalHeight);
        k.ctx.drawImage(img, 0, 0);
        var size = Math.max(10, img.naturalWidth * o.size / 100);
        k.ctx.font = '700 ' + size + 'px Inter, sans-serif';
        k.ctx.fillStyle = 'rgba(255,255,255,' + (o.opacity / 100) + ')';
        k.ctx.strokeStyle = 'rgba(0,0,0,' + (o.opacity / 250) + ')';
        k.ctx.lineWidth = Math.max(1, size / 20);
        if (o.position === 'tile') {
          var step = k.ctx.measureText(text).width + size * 2;
          for (var y = size; y < k.c.height + size; y += size * 4) {
            for (var x = 0; x < k.c.width; x += step) {
              k.ctx.save(); k.ctx.translate(x, y); k.ctx.rotate(-Math.PI / 9);
              k.ctx.strokeText(text, 0, 0); k.ctx.fillText(text, 0, 0); k.ctx.restore();
            }
          }
        } else if (o.position === 'center') {
          k.ctx.textAlign = 'center';
          k.ctx.save(); k.ctx.translate(k.c.width / 2, k.c.height / 2); k.ctx.rotate(-Math.PI / 9);
          k.ctx.strokeText(text, 0, 0); k.ctx.fillText(text, 0, 0); k.ctx.restore();
        } else {
          k.ctx.textAlign = 'right';
          k.ctx.strokeText(text, k.c.width - size / 2, k.c.height - size / 2);
          k.ctx.fillText(text, k.c.width - size / 2, k.c.height - size / 2);
        }
        api.progress(0.7);
        var blob = await toBlob(k.c, 'image/png');
        return {
          previewUrl: api.urls.make(blob),
          stats: [
            { label: 'Text', value: text },
            { label: 'Position', value: o.position },
            { label: 'Opacity', value: o.opacity + '%' },
            { label: 'Size', value: api.bytes(blob.size) }
          ],
          downloads: [{ label: 'Download', blob: blob, name: baseName(f.name) + '-watermarked.png' }],
          status: 'Watermarked'
        };
      }
    },

    'emote-resizer': {
      accept: 'image/*', action: 'Make emotes',
      dropLabel: 'Choose an emote image (square works best)',
      options: [
        { k: 'pack', label: 'Sizes', type: 'select', def: 'twitch',
          options: [
            { v: 'twitch', label: 'Twitch emote (112, 56, 28)' },
            { v: 'discord', label: 'Discord emoji (128)' },
            { v: 'both', label: 'Both platforms' }
          ] }
      ],
      process: async function (files, o, api) {
        var f = files[0];
        var img = await api.loadImage(f);
        var sizes = o.pack === 'discord' ? [128] : o.pack === 'both' ? [128, 112, 56, 28] : [112, 56, 28];
        // centre-crop to a square so nothing is stretched
        var side = Math.min(img.naturalWidth, img.naturalHeight);
        var sx = (img.naturalWidth - side) / 2, sy = (img.naturalHeight - side) / 2;
        var downloads = [];
        for (var i = 0; i < sizes.length; i++) {
          var s = sizes[i];
          var k = canvasFrom(img, s, s);
          k.ctx.clearRect(0, 0, s, s);
          k.ctx.drawImage(img, sx, sy, side, side, 0, 0, s, s);
          var blob = await toBlob(k.c, 'image/png');
          downloads.push({ label: 'Download ' + s + '×' + s, blob: blob, name: baseName(f.name) + '-' + s + '.png' });
          api.progress((i + 1) / sizes.length * 0.9);
        }
        return {
          previewUrl: downloads.length ? api.urls.make(downloads[0].blob) : null,
          previewAlt: 'Largest emote preview',
          stats: [
            { label: 'Source', value: img.naturalWidth + '×' + img.naturalHeight },
            { label: 'Emotes made', value: sizes.length },
            { label: 'Format', value: 'PNG (transparent)' }
          ],
          downloads: downloads,
          status: 'Made ' + sizes.length + ' emote' + (sizes.length > 1 ? 's' : ''),
          note: img.naturalWidth !== img.naturalHeight
            ? 'Your image wasn’t square, so it was centre-cropped. For full control, crop it square first.'
            : 'PNG keeps transparency — the right choice for emotes.'
        };
      }
    },

    'flip-image': {
      accept: 'image/*', action: 'Flip', dropLabel: 'Choose an image to flip',
      options: [
        { k: 'dir', label: 'Direction', type: 'select', def: 'h',
          options: [{ v: 'h', label: 'Horizontal (mirror)' }, { v: 'v', label: 'Vertical' }] }
      ],
      process: async function (files, o, api) {
        var f = files[0];
        var img = await api.loadImage(f);
        var k = canvasFrom(img, img.naturalWidth, img.naturalHeight);
        if (o.dir === 'h') { k.ctx.translate(k.c.width, 0); k.ctx.scale(-1, 1); }
        else { k.ctx.translate(0, k.c.height); k.ctx.scale(1, -1); }
        k.ctx.drawImage(img, 0, 0);
        api.progress(0.6);
        var blob = await toBlob(k.c, 'image/png');
        return {
          previewUrl: api.urls.make(blob),
          stats: [{ label: 'Direction', value: o.dir === 'h' ? 'Horizontal' : 'Vertical' }, { label: 'Size', value: img.naturalWidth + '×' + img.naturalHeight }, { label: 'File', value: api.bytes(blob.size) }],
          downloads: [{ label: 'Download', blob: blob, name: baseName(f.name) + '-flipped.png' }],
          status: 'Flipped'
        };
      }
    },

    'rotate-image': {
      accept: 'image/*', action: 'Rotate', dropLabel: 'Choose an image to rotate',
      options: [
        { k: 'deg', label: 'Rotate', type: 'select', def: '90',
          options: [{ v: '90', label: '90° right' }, { v: '180', label: '180°' }, { v: '270', label: '90° left' }] }
      ],
      process: async function (files, o, api) {
        var f = files[0];
        var img = await api.loadImage(f);
        var deg = parseInt(o.deg, 10), w = img.naturalWidth, h = img.naturalHeight;
        var swap = (deg === 90 || deg === 270);
        var k = canvasFrom(img, swap ? h : w, swap ? w : h);
        k.ctx.translate(k.c.width / 2, k.c.height / 2);
        k.ctx.rotate(deg * Math.PI / 180);
        k.ctx.drawImage(img, -w / 2, -h / 2);
        api.progress(0.6);
        var blob = await toBlob(k.c, 'image/png');
        return {
          previewUrl: api.urls.make(blob),
          stats: [{ label: 'Rotation', value: deg + '°' }, { label: 'From', value: w + '×' + h }, { label: 'To', value: k.c.width + '×' + k.c.height }, { label: 'File', value: api.bytes(blob.size) }],
          downloads: [{ label: 'Download', blob: blob, name: baseName(f.name) + '-rotated.png' }],
          status: 'Rotated ' + deg + '°'
        };
      }
    },

    'circle-crop': {
      accept: 'image/*', action: 'Make round', dropLabel: 'Choose a photo for a round avatar',
      options: [
        { k: 'bg', label: 'Background', type: 'select', def: 'transparent',
          options: [{ v: 'transparent', label: 'Transparent' }, { v: '#ffffff', label: 'White' }, { v: '#0d1420', label: 'Dark' }] }
      ],
      process: async function (files, o, api) {
        var f = files[0];
        var img = await api.loadImage(f);
        var side = Math.min(img.naturalWidth, img.naturalHeight);
        var sx = (img.naturalWidth - side) / 2, sy = (img.naturalHeight - side) / 2;
        var k = canvasFrom(img, side, side);
        if (o.bg !== 'transparent') { k.ctx.fillStyle = o.bg; k.ctx.fillRect(0, 0, side, side); }
        k.ctx.save();
        k.ctx.beginPath(); k.ctx.arc(side / 2, side / 2, side / 2, 0, Math.PI * 2); k.ctx.closePath(); k.ctx.clip();
        k.ctx.drawImage(img, sx, sy, side, side, 0, 0, side, side);
        k.ctx.restore();
        api.progress(0.6);
        var blob = await toBlob(k.c, 'image/png');
        return {
          previewUrl: api.urls.make(blob),
          stats: [{ label: 'Size', value: side + '×' + side }, { label: 'Shape', value: 'Circle' }, { label: 'File', value: api.bytes(blob.size) }],
          downloads: [{ label: 'Download PNG', blob: blob, name: baseName(f.name) + '-round.png' }],
          status: 'Round avatar ready',
          note: img.naturalWidth !== img.naturalHeight ? 'Centre-cropped to a square first. PNG keeps the transparent corners.' : 'PNG keeps the transparent corners.'
        };
      }
    },

    'grayscale-image': {
      accept: 'image/*', action: 'Convert', dropLabel: 'Choose an image',
      options: [
        { k: 'mode', label: 'Style', type: 'select', def: 'gray',
          options: [{ v: 'gray', label: 'Black & white' }, { v: 'sepia', label: 'Sepia' }] }
      ],
      process: async function (files, o, api) {
        var f = files[0];
        var img = await api.loadImage(f);
        var k = canvasFrom(img, img.naturalWidth, img.naturalHeight);
        k.ctx.drawImage(img, 0, 0);
        var src = k.ctx.getImageData(0, 0, k.c.width, k.c.height);
        var d = await root.VKPixels.run('tone', src, { mode: o.mode },
          function (frac) { api.progress(0.2 + 0.6 * frac); });
        k.ctx.putImageData(d, 0, 0);
        api.progress(0.85);
        var blob = await toBlob(k.c, 'image/png');
        return {
          previewUrl: api.urls.make(blob),
          stats: [{ label: 'Style', value: o.mode === 'sepia' ? 'Sepia' : 'Black & white' }, { label: 'Size', value: img.naturalWidth + '×' + img.naturalHeight }, { label: 'File', value: api.bytes(blob.size) }],
          downloads: [{ label: 'Download', blob: blob, name: baseName(f.name) + '-' + o.mode + '.png' }],
          status: 'Done'
        };
      }
    }
  };

  /* the watermark tool needs a text field the generic engine doesn't provide */
  function injectWatermarkText(host) {
    var controls = host.querySelector('.ft-controls');
    if (!controls || document.getElementById('ft-wm-text')) return;
    var wrap = document.createElement('div');
    wrap.className = 'calc-field';
    wrap.innerHTML = '<label for="ft-wm-text">Watermark text</label>' +
      '<input id="ft-wm-text" class="field" type="text" value="© Vootkit" maxlength="60">';
    controls.insertBefore(wrap, controls.firstChild);
  }

  root.VKImageTools = T;
  if (typeof module === 'object' && module.exports) module.exports = T;

  function boot() {
    var host = document.getElementById('workspace');
    if (!host || !root.VKFile) return;
    if (host.querySelector('.calc-form') || host.querySelector('.ftool .drop')) return;
    var id = host.getAttribute('data-tool');
    var spec = T[id];
    if (!spec) return;
    root.VKFile.mount(host, spec);
    if (id === 'image-watermark') injectWatermarkText(host);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
