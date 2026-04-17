/**
 * GET /api/og/film-meta?id=<offerId>
 *
 * Returns a tiny HTML document with dynamic Open Graph + Twitter card
 * meta tags for a single film. Used as a middleware-rewrite target
 * when social crawlers hit /film.html?id=<offerId> — humans still get
 * the full static film page; crawlers get correct og:image + og:title
 * + og:description so Twitter/FB/LinkedIn/Slack cards render with the
 * actual movie poster instead of the generic bmovies_og.jpg.
 *
 * Resolution:
 *   1. POSTER_MAP hit by title.toLowerCase()   — static /img/films/*.jpg
 *   2. bct_artifacts role='poster', kind='image' (non-ephemeral)
 *   3. bct_artifacts role='storyboard' first frame (non-ephemeral)
 *   4. The site-wide /bmovies_og.jpg as final fallback
 *
 * Response body is minimal — no CSS, no scripts, no real content. The
 * crawler only reads the <head>. A <meta http-equiv="refresh"> sends
 * any human that lands here to the canonical /film.html?id=<id>.
 *
 * Env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

interface VercelRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): VercelResponse;
  send(body: string): void;
  end(): void;
}

// Posters that ship with the site as static JPEGs. Keep aligned with
// the POSTER_MAP in public/film.html + src/app/account/page.tsx. If
// you add a new film poster to /public/img/films/, add the row here.
const POSTER_MAP: Record<string, string> = {
  'echoes of the last signal':           '/img/films/echoes-of-the-last-signal.jpg',
  'the fold':                            '/img/films/the-fold.jpg',
  'the weight of water':                 '/img/films/the-weight-of-water.jpg',
  'the lantern that forgot its flame':   '/img/films/the-lantern-that-forgot-its-flame.jpg',
  'the mirror protocol':                 '/img/films/the-mirror-protocol.jpg',
  'off-key heroes':                      '/img/films/off-key-heroes.jpg',
  'midnight swarm':                      '/img/films/midnight-swarm.jpg',
  'the last piece':                      '/img/films/the-last-piece.jpg',
  'star wars episode 1000':              '/img/films/episode-1000.jpg',
  "that weirdo isn't satoshi":           '/img/films/that-weirdo-isnt-satoshi.jpg',
  'spoon from space':                    '/img/films/spoon-from-space.jpg',
  'silverfish in the cathedral':         '/img/films/silverfish-in-the-cathedral.jpg',
  'the clockmakers daughter':            '/img/films/the-clockmakers-daughter.jpg',
  'the cartographer who mapped dreams':  '/img/films/the-cartographer-who-mapped-dreams.jpg',
  'the coffee machine':                  '/img/films/the-coffee-machine.jpg',
  'the last lighthouse':                 '/img/films/the-last-lighthouse.jpg',
  'cipher of the drowned city':          '/img/films/cipher-of-the-drowned-city.jpg',
  'echoes beneath glacier 9':            '/img/films/echoes-beneath-glacier-9.jpg',
  'the cartographer of empty rooms':     '/img/films/the-cartographer-of-empty-rooms.jpg',
  'pale horse, iron sky':                '/img/films/pale-horse-iron-sky.jpg',
  'sub-orbital lullaby':                 '/img/films/sub-orbital-lullaby.jpg',
  'glasshouse':                          '/img/films/glasshouse.jpg',
  'the last transmission':               '/img/films/the-last-transmission.jpg',
  'crypto whistleblow':                  '/img/films/crypto-whistleblow.jpg',
};

const SITE_ORIGIN = 'https://bmovies.online';
const FALLBACK_OG_IMAGE = `${SITE_ORIGIN}/bmovies_og.jpg`;

// xAI CDN URLs (ephemeral 24h). Never use these as og:image — by the
// time a crawler re-fetches, the URL 404s and the card breaks.
function isEphemeralUrl(u: string | null | undefined): boolean {
  if (!u) return false;
  return /imgen\.x\.ai\/xai-imgen\/xai-tmp/.test(u);
}

function absUrl(url: string): string {
  if (!url) return FALLBACK_OG_IMAGE;
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith('/')) return `${SITE_ORIGIN}${url}`;
  return `${SITE_ORIGIN}/${url}`;
}

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function firstParagraph(text: string, cap = 200): string {
  if (!text) return '';
  // Strip markdown-y prefixes and collapse whitespace, then cap length
  // with an ellipsis so long treatments don't blow out the card.
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= cap) return cleaned;
  return cleaned.slice(0, cap - 1).replace(/\s\S*$/, '') + '…';
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // Tolerate HEAD/GET; anything else is 405.
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).end();
    return;
  }

  const idRaw = req.query?.id;
  const id = (typeof idRaw === 'string' ? idRaw : Array.isArray(idRaw) ? idRaw[0] : '') || '';
  if (!id) {
    // No id — render a generic fallback card that still works.
    return respond(res, {
      title: 'bMovies — AI films on Bitcoin SV',
      description: 'Commission AI-produced films. Own the royalty token. Every ticket fans out to holders on-chain.',
      image: FALLBACK_OG_IMAGE,
      canonical: `${SITE_ORIGIN}/`,
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    // No DB — fall back to the generic card rather than failing the
    // crawler request outright (a 500 would drop the preview entirely).
    return respond(res, {
      title: 'bMovies — AI films on Bitcoin SV',
      description: 'Commission AI-produced films. Own the royalty token.',
      image: FALLBACK_OG_IMAGE,
      canonical: `${SITE_ORIGIN}/film.html?id=${encodeURIComponent(id)}`,
    });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    const { data: offer } = await supabase
      .from('bct_offers')
      .select(`
        id, title, synopsis, token_ticker, tier, status,
        bct_artifacts ( kind, role, url, step_id, superseded_by )
      `)
      .eq('id', id)
      .maybeSingle();

    if (!offer) {
      return respond(res, {
        title: 'bMovies — Film not found',
        description: 'This film is not in our catalogue.',
        image: FALLBACK_OG_IMAGE,
        canonical: `${SITE_ORIGIN}/film.html?id=${encodeURIComponent(id)}`,
      });
    }

    const title = (offer as any).title as string || 'Untitled film';
    const ticker = (offer as any).token_ticker as string || '';
    const synopsis = (offer as any).synopsis as string || '';
    const tier = ((offer as any).tier as string || 'film').toLowerCase();

    // Resolve poster URL via the same priority chain film.html uses.
    // Normalize title for the POSTER_MAP lookup the same way
    // public/film.html does (strip trailing !?. + trim) so a cosmetic
    // edit like adding '!' to a title doesn't silently drop the
    // commissioner-curated static JPG override. This MUST match the
    // logic in public/film.html (posterKey construction) or the
    // social card will show a different poster than the page itself.
    const posterKey = title.toLowerCase().replace(/[!?.]+$/, '').trim();
    let posterUrl = POSTER_MAP[posterKey] || POSTER_MAP[title.toLowerCase()] || '';
    if (!posterUrl) {
      const arts = ((offer as any).bct_artifacts || []) as Array<{
        kind: string; role: string | null; url: string; step_id: string | null; superseded_by: number | null;
      }>;
      const poster = arts.find((a) =>
        !a.superseded_by && a.role === 'poster' && a.kind === 'image' && !isEphemeralUrl(a.url),
      );
      if (poster?.url) posterUrl = poster.url;
      if (!posterUrl) {
        const storyboard = arts.find((a) =>
          !a.superseded_by && a.kind === 'image' && (a.role === 'storyboard' || a.step_id === 'storyboard.poster') && !isEphemeralUrl(a.url),
        );
        if (storyboard?.url) posterUrl = storyboard.url;
      }
    }
    const image = absUrl(posterUrl || FALLBACK_OG_IMAGE);

    // Card copy. Title prefix reads as a bMovies production so the
    // social preview identifies the site even when only the image
    // renders (older Twitter clients sometimes skip the title).
    const cardTitle = `${title} — a bMovies ${tier}${ticker ? ` · $${ticker}` : ''}`;
    const cardDescription = firstParagraph(synopsis) || 'Commission, watch, and earn. AI films on Bitcoin SV.';

    return respond(res, {
      title: cardTitle,
      description: cardDescription,
      image,
      canonical: `${SITE_ORIGIN}/film.html?id=${encodeURIComponent(id)}`,
    });
  } catch (err) {
    console.error('[og/film-meta] failed:', err);
    // Don't surface the error to the crawler — a broken card is worse
    // than a generic one. Fall back to the sitewide OG image.
    return respond(res, {
      title: 'bMovies — AI films on Bitcoin SV',
      description: 'Commission AI-produced films on Bitcoin SV.',
      image: FALLBACK_OG_IMAGE,
      canonical: `${SITE_ORIGIN}/film.html?id=${encodeURIComponent(id)}`,
    });
  }
}

function respond(
  res: VercelResponse,
  opts: { title: string; description: string; image: string; canonical: string },
): void {
  const { title, description, image, canonical } = opts;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(canonical)}">

  <meta property="og:type" content="video.movie">
  <meta property="og:site_name" content="bMovies">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${esc(image)}">
  <meta property="og:image:alt" content="${esc(title)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${esc(canonical)}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@bMovies_Online">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(image)}">
  <meta name="twitter:image:alt" content="${esc(title)}">

  <!-- Any human who follows a shared link lands here briefly; the
       refresh below forwards them to the canonical /film.html page. -->
  <meta http-equiv="refresh" content="0; url=${esc(canonical)}">
</head>
<body style="background:#000;color:#fff;font-family:sans-serif;padding:2rem;text-align:center;">
  <p>Loading film preview — <a href="${esc(canonical)}" style="color:#E50914;">continue ↗</a></p>
</body>
</html>`;

  res
    .status(200)
    .setHeader('content-type', 'text/html; charset=utf-8')
    // Brief cache — social cards shouldn't go stale for too long, but
    // re-fetching every time costs us a Supabase round-trip per tweet.
    .setHeader('cache-control', 'public, s-maxage=300, stale-while-revalidate=60')
    .send(html);
}
