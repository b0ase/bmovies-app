/**
 * Next.js middleware — routes /boovies/* to the underlying bMovies
 * routes with the bOOvies skin engaged.
 *
 * Flow:
 *   User visits /boovies/commission
 *   → middleware rewrites the URL to /commission (internal, the browser
 *     URL stays /boovies/commission)
 *   → sets skin=boovies cookie so subsequent navigation stays pink
 *   → forwards x-skin: boovies header so server components don't have
 *     to re-parse the request URL
 *
 * Paths:
 *   /boovies           → /            (Drive-In home with pink skin)
 *   /boovies/foo       → /foo
 *   everything else    → unchanged; reads cookie for sticky skin
 *
 * Non-goals:
 *   • Does not intercept /api/* — those take an explicit `skin` param
 *     when they need to branch, to stay stateless.
 *   • Does not intercept static assets in /public — the matcher below
 *     excludes them for performance.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { SKIN_COOKIE, SKIN_HEADER, stripBooviesPrefix, isSkin } from '@/lib/skin';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // If the user explicitly set ?skin=bmovies|boovies on any URL, persist it.
  const querySkin = searchParams.get('skin');
  const explicit = isSkin(querySkin) ? querySkin : null;

  const { path: rewrittenPath, boovies } = stripBooviesPrefix(pathname);

  // Decide the skin for this response: explicit query wins over path prefix
  // wins over the existing cookie (left as-is if neither signal is present).
  let skin: 'bmovies' | 'boovies' | null = null;
  if (explicit) skin = explicit;
  else if (boovies) skin = 'boovies';

  // Build the forward URL. When a path rewrite is needed, clone and
  // replace; otherwise leave req.nextUrl untouched so Next.js can
  // continue normally.
  let res: NextResponse;
  if (rewrittenPath !== pathname) {
    const url = req.nextUrl.clone();
    url.pathname = rewrittenPath;
    res = NextResponse.rewrite(url, {
      request: {
        headers: new Headers(req.headers),
      },
    });
  } else {
    res = NextResponse.next({
      request: {
        headers: new Headers(req.headers),
      },
    });
  }

  if (skin) {
    // Pass the skin to the downstream render via header (consumed by
    // server components through detectSkin({ headers })).
    res.headers.set(SKIN_HEADER, skin);

    // And persist it in a cookie so clicks from a pink page into a
    // plain-path route (/commission.html) stay pink.
    res.cookies.set(SKIN_COOKIE, skin, {
      path: '/',
      httpOnly: false, // client JS needs to read it for nav-script swap
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
    });
  }

  return res;
}

// Match HTML pages and extensionless routes. Deliberately INCLUDE
// `.html` (the brochure is mostly static HTML in /public/*.html) and
// exclude only the noisy asset types middleware can't usefully touch.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:css|js|mjs|map|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf|mp4|webm|m4v|mp3|wav|pdf)).*)',
  ],
};
