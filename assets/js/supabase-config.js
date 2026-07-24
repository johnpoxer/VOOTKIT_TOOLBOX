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
    // Public anon key — safe in the browser; Row-Level Security protects the data.
    // (An env override is still honoured so the key can be rotated without a rebuild.)
    anonKey: root.__VK_SUPABASE_ANON__ || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmcWRtendtanhkaXF6ZXliYW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NjY1MDgsImV4cCI6MjA5NzA0MjUwOH0.AtbTdxEhW7EcxcF2aQ0-ODeAhUfEiA5LWk7MNQoYNqg'
  };
})(typeof window !== 'undefined' ? window : globalThis);
