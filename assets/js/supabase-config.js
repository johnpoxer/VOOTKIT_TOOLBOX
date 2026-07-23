/* supabase-config.js — public Supabase client config for the auth phase.
 * The URL and project ref are public; the ANON key is NOT hard-coded here.
 * At deploy time, inject it (e.g. a build step that reads VK_SUPABASE_ANON, or
 * a small Netlify function that returns it) and set window.VK_SUPABASE.anonKey.
 *
 * The anon key is safe to expose to the browser (it only permits what your
 * Row-Level-Security policies allow) — but we still keep it out of source so it
 * can be rotated without a code change. Auth is Phase 6/8; this is the wiring. */
(function (root) {
  'use strict';
  root.VK_SUPABASE = {
    url: 'https://qfqdmzwmjxdiqzeybaoo.supabase.co',
    ref: 'qfqdmzwmjxdiqzeybaoo',
    region: 'eu-west-1',
    anonKey: root.__VK_SUPABASE_ANON__ || '' // set by deploy/env; empty = auth disabled
  };
})(typeof window !== 'undefined' ? window : globalThis);
