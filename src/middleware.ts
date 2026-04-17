/**
 * Next.js middleware — two responsibilities:
 *
 * 1. /boovies/* skin routing
 *    User visits /boovies/commission → rewrite to /commission, set
 *    skin=boovies cookie + x-skin header so downstream renders pink.
 *
 * 2. Social crawler rewrite for /film.html
 *    When a social-card bot (Twitterbot, facebookexternalhit, etc.)
 *    hits /film.html?id=<offerId>, rewrite the request to
 *    /api/og/film-meta?id=<offerId>. That endpoint returns a tiny
 *    HTML document with dynamic og:image/title/description so the
 *    preview card shows the actual film poster. Human requests pass
 *    through to the static /film.html as before.
 *
 * Non-goals:
 *   • Does not intercept /api/* paths at all — those take explicit
 *     params when they need to branch.
 *   • Does not intercept static assets in /public — the matcher below
 *     excludes them for performance.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { SKIN_COOKIE, SKIN_HEADER, stripBooviesPrefix, isSkin } from '@/lib/skin';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Social preview crawlers. Every renderer that fetches og:* meta needs
// to be in this list; any false-negative means that renderer shows the
// generic bmovies_og.jpg instead of the film's poster. Ordered
// loosely by share volume. Case-insensitive match against UA.
const SOCIAL_CRAWLER_RE = /(Twitterbot|facebookexternalhit|Facebot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Discordbot|SkypeUriPreview|Pinterest|redditbot|Applebot|Googlebot|bingbot|DuckDuckBot|YandexBot|Embedly|quora link preview|vkShare|W3C_Validator|Mastodon)/i;

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // ─── Social crawler rewrite ─────────────────────────────────
  // Must run before anything else so we don't accidentally add the
  // skin cookie to a crawler's response and skew future humans.
  if (pathname === '/film.html') {
    const ua = req.headers.get('user-agent') || '';
    const isCrawler = SOCIAL_CRAWLER_RE.test(ua);
    if (isCrawler) {
      const id = searchParams.get('id');
      if (id) {
        const url = req.nextUrl.clone();
        url.pathname = '/api/og/film-meta';
        // Keep only ?id=; drop any tracking params so the endpoint
        // response cache key stays tight.
        url.search = `?id=${encodeURIComponent(id)}`;
        return NextResponse.rewrite(url);
      }
    }
  }

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
