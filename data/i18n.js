/* i18n.js — Vootkit localisation loader.
 *
 * Translations live as per-language JSON files in data/i18n/:
 *   chrome-<code>.json  — shared template strings (nav, headings, FAQ, trust)
 *   tools-<code>.json   — { toolId: { name, desc } } for that language
 *
 * Adding/expanding a language = drop in (or edit) those two JSON files. No code
 * changes. build.js only generates a localised page where BOTH the chrome and the
 * tool's name/desc exist for that locale (never thin English-under-/xx/).
 *
 * Node-only data loading (build.js is the only consumer); the browser export is a
 * harmless empty stub.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.VK_I18N = api;
})(typeof window !== "undefined" ? window : globalThis, function () {

  var LOCALES = [
    { code: "es", label: "Español",           dir: "ltr", name: "Spanish" },
    { code: "pt", label: "Português",         dir: "ltr", name: "Portuguese" },
    { code: "fr", label: "Français",          dir: "ltr", name: "French" },
    { code: "de", label: "Deutsch",           dir: "ltr", name: "German" },
    { code: "hi", label: "हिन्दी",             dir: "ltr", name: "Hindi" },
    { code: "id", label: "Bahasa Indonesia",  dir: "ltr", name: "Indonesian" },
    { code: "it", label: "Italiano",          dir: "ltr", name: "Italian" },
    { code: "ar", label: "العربية",           dir: "rtl", name: "Arabic" },
    { code: "ja", label: "日本語",             dir: "ltr", name: "Japanese" }
  ];

  var chrome = {}, tools = {};

  if (typeof require === "function" && typeof __dirname !== "undefined") {
    var path = require("path");
    var dir = path.join(__dirname, "i18n");
    LOCALES.forEach(function (l) {
      try { chrome[l.code] = require(path.join(dir, "chrome-" + l.code + ".json")); } catch (e) {}
      try { tools[l.code] = require(path.join(dir, "tools-" + l.code + ".json")); } catch (e) {}
    });
  }

  return { LOCALES: LOCALES, chrome: chrome, tools: tools };
});
