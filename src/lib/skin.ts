/**
 * Skin detection for the bMovies / bOOvies dual-brand surface.
 *
 * bMovies is the straight platform (red, photographic, serious).
 * bOOvies is the pink/pixelated/GIF-chiptune parody skin sitting on
 * the same codebase and the same database — filtered by the `parody`
 * column on bct_offers / bct_studios.
 *
 * Precedence (highest → lowest):
 *   1. ?skin=bmovies|boovies in the URL
 *   2. x-skin header (set by middleware when path starts /boovies)
 *   3. skin cookie (sticky choice from a previous session)
 *   4. fallback: 'bmovies'
 *
 * Keep this file framework-minimal — it has to run in both server
 * components and middleware (Edge runtime).
 */

export type Skin = 'bmovies' | 'boovies';

export const SKIN_COOKIE = 'skin';
export const SKIN_HEADER = 'x-skin';

export function isSkin(v: unknown): v is Skin {
  return v === 'bmovies' || v === 'boovies';
}

export function normalizeSkin(v: unknown, fallback: Skin = 'bmovies'): Skin {
  return isSkin(v) ? v : fallback;
}

/**
 * Strip the `/boovies` prefix off a pathname so a rewrite can render
 * the same underlying route. Returns the rewritten path and whether
 * the prefix was present.
 *
 *   /boovies              → { path: '/',             boovies: true }
 *   /boovies/             → { path: '/',             boovies: true }
 *   /boovies/commission   → { path: '/commission',   boovies: true }
 *   /boovies/films/42     → { path: '/films/42',     boovies: true }
 *   /commission           → { path: '/commission',   boovies: false }
 */
export function stripBooviesPrefix(pathname: string): {
  path: string;
  boovies: boolean;
} {
  if (pathname === '/boovies' || pathname === '/boovies/') {
    return { path: '/', boovies: true };
  }
  if (pathname.startsWith('/boovies/')) {
    return { path: pathname.slice('/boovies'.length), boovies: true };
  }
  return { path: pathname, boovies: false };
}

/**
 * Read skin from a plain request-like object. Works for middleware
 * (NextRequest) or a server component (cookies()/headers()).
 *
 * Accepts anything that exposes .get(name) for headers + cookies
 * along with an optional URL object for searchParams.
 */
export function detectSkin(opts: {
  searchParams?: URLSearchParams | null;
  headers?: { get(name: string): string | null } | null;
  cookies?: { get(name: string): { value: string } | undefined } | null;
}): Skin {
  const q = opts.searchParams?.get('skin');
  if (isSkin(q)) return q;

  const h = opts.headers?.get(SKIN_HEADER);
  if (isSkin(h)) return h;

  const c = opts.cookies?.get(SKIN_COOKIE);
  if (c && isSkin(c.value)) return c.value;

  return 'bmovies';
}

/**
 * Map a skin to the parody flag expected by Supabase queries.
 *   bmovies → false (only mainline films)
 *   boovies → true  (only parody films)
 */
export function parodyForSkin(skin: Skin): boolean {
  return skin === 'boovies';
}

/**
 * Asset URLs that differ between skins. Keep this table tight — most
 * of the site should be skin-agnostic with CSS handling the visual
 * swap. Only use this when the asset itself is genuinely different.
 */
export function skinAsset(skin: Skin, key: 'logo' | 'og' | 'nav-script'): string {
  if (skin === 'boovies') {
    switch (key) {
      case 'logo':       return '/boovies-logo.svg';
      case 'og':         return '/bmovies_OG.png'; // TODO: boovies_OG.png
      case 'nav-script': return '/js/boovies-nav.js';
    }
  }
  switch (key) {
    case 'logo':       return '/bmovies-logo.svg';
    case 'og':         return '/bmovies_OG.png';
    case 'nav-script': return '/js/nav-session.js';
  }
}
