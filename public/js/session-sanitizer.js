/**
 * bMovies session sanitizer
 *
 * Loaded SYNCHRONOUSLY in <head> on every page, before any module
 * script that creates a Supabase client. Two jobs:
 *
 *   1. Wipe orphan supabase-js storage keys.
 *      Earlier builds of these brochure pages used createClient(URL, KEY)
 *      without a `storageKey` override, so supabase-js wrote sessions to
 *      its default key (e.g. `sb-api-b0ase-com-auth-token`). Meanwhile
 *      js/auth.js writes to `bmovies-auth`. Two stores → drift → users
 *      end up signed-in-on-some-pages-but-not-others until they manually
 *      nuke localStorage. This sweep deletes any leftover defaults.
 *
 *   2. Validate the canonical `bmovies-auth` blob.
 *      If it's not parseable JSON, OR the access token is expired AND
 *      there's no usable refresh token, drop it. Otherwise the SDK
 *      keeps re-using a dead session forever.
 *
 * Anything written here must be plain ES5-safe browser JS — no imports,
 * no top-level await — because this loads as a regular <script>.
 */
(function sanitizeSupabaseStorage() {
  try {
    if (typeof localStorage === 'undefined') return;

    // 1. Wipe orphan default-key auth tokens
    var orphans = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k) continue;
      if (k === 'bmovies-auth') continue;
      // supabase-js v2 default keys: sb-<project>-auth-token[-code-verifier]
      if (/^sb-.*-auth-token(-code-verifier)?$/.test(k)) orphans.push(k);
      // supabase-js v1 default key
      if (k === 'supabase.auth.token') orphans.push(k);
    }
    for (var j = 0; j < orphans.length; j++) {
      try { localStorage.removeItem(orphans[j]); } catch (e) {}
    }
    if (orphans.length) {
      console.info('[bmovies-session] cleared orphan auth keys:', orphans);
    }

    // 2. Validate canonical session blob
    var raw = localStorage.getItem('bmovies-auth');
    if (raw) {
      var valid = false;
      try {
        var parsed = JSON.parse(raw);
        var session = (parsed && parsed.currentSession) ? parsed.currentSession : parsed;
        var expiresAt = Number((session && session.expires_at) || (parsed && parsed.expiresAt) || 0);
        var hasAccess = !!(session && typeof session.access_token === 'string' && session.access_token.length > 20);
        var hasRefresh = !!(session && typeof session.refresh_token === 'string' && session.refresh_token.length > 10);
        var nowSec = Date.now() / 1000;
        // Keep if access token is still valid OR we have a refresh token
        // (supabase-js will swap a dead access token for a fresh one).
        if (hasAccess && (expiresAt > nowSec || hasRefresh)) {
          valid = true;
        }
      } catch (e) {
        valid = false;
      }
      if (!valid) {
        try { localStorage.removeItem('bmovies-auth'); } catch (e) {}
        console.info('[bmovies-session] dropped stale/invalid bmovies-auth blob');
      }
    }
  } catch (err) {
    console.warn('[bmovies-session] sanitizer error:', err);
  }
})();
