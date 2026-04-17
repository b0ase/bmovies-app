import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = 'https://bmovies.online'

/**
 * Sitemap for the merged bMovies site. Three sources of URLs:
 *
 *   1. Static brochure pages in public/*.html (hand-enumerated below).
 *   2. Next.js routes under /account, /login, /studio.
 *   3. Every published film, one URL per offer_id — pulled from Supabase
 *      at build time so AI crawlers discover the long tail of films.
 *
 * The film-URL fetch is wrapped in try/catch; if Supabase is unreachable
 * during build we still emit the static routes rather than failing the
 * deploy.
 *
 * Revalidates hourly — fresh enough for AI Overviews / PerplexityBot.
 */
export const revalidate = 3600

// How many films to include. Sitemaps have a 50k-URL / 50MB cap; we're
// nowhere near that, but cap anyway so a runaway swarm doesn't balloon
// the XML.
const MAX_FILMS = 5000

type FilmRow = {
  id: string
  updated_at: string | null
  status: string
}

async function fetchPublishedFilms(): Promise<FilmRow[]> {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api.b0ase.com'
  // Prefer the service role key — sitemap.ts runs server-side at build
  // + revalidation time only, never shipped to the client, so using
  // the service role here is safe and bypasses the anon RLS policies
  // that were previously rejecting the build with "Invalid
  // authentication credentials". Fall back to the anon key for local
  // dev when the service role isn't wired up.
  const KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!KEY) return []

  try {
    const client = createClient(SUPABASE_URL, KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await client
      .from('bct_offers')
      .select('id, updated_at, status')
      .in('status', ['published', 'auto_published', 'released'])
      .not('is_swarm', 'is', true)
      .order('updated_at', { ascending: false })
      .limit(MAX_FILMS)
    if (error) {
      console.warn('[sitemap] film fetch error:', error.message)
      return []
    }
    return (data ?? []) as FilmRow[]
  } catch (err) {
    console.warn('[sitemap] film fetch threw:', err)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString()

  const staticRoutes: [string, MetadataRoute.Sitemap[number]['changeFrequency'], number][] = [
    ['', 'daily', 1.0],
    ['/about.html', 'weekly', 0.7],
    ['/commission.html', 'daily', 0.9],
    ['/productions.html', 'hourly', 0.9],
    ['/watch.html', 'hourly', 0.9],
    ['/exchange.html', 'daily', 0.8],
    ['/offer.html', 'daily', 0.7],
    ['/captable.html', 'daily', 0.6],
    ['/studios.html', 'weekly', 0.6],
    ['/film.html', 'daily', 0.7],
    ['/production.html', 'hourly', 0.7],
    ['/marketplace.html', 'daily', 0.8],
    ['/boovies.html', 'weekly', 0.6],
    ['/pitch.html', 'weekly', 0.5],
    ['/deck.html', 'weekly', 0.5],
    ['/invest.html', 'weekly', 0.6],
    ['/judges.html', 'weekly', 0.5],
    ['/research.html', 'weekly', 0.6],
    // Authed Next.js routes
    ['/account', 'daily', 0.8],
    ['/studio', 'weekly', 0.6],
    ['/login', 'monthly', 0.4],
    // Legal
    ['/terms.html', 'yearly', 0.3],
    ['/privacy.html', 'yearly', 0.3],
    ['/compliance-strategy.html', 'monthly', 0.3],
    ['/regulatory-memo.html', 'monthly', 0.3],
    ['/legal/platform-token-prospectus.html', 'monthly', 0.3],
    ['/legal/non-custodial-disclosure.html', 'monthly', 0.3],
  ]

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map(
    ([path, changeFrequency, priority]) => ({
      url: `${BASE_URL}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    }),
  )

  const films = await fetchPublishedFilms()
  const filmEntries: MetadataRoute.Sitemap = films.map((f) => ({
    url: `${BASE_URL}/film.html?id=${encodeURIComponent(f.id)}`,
    lastModified: f.updated_at || now,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }))

  return [...staticEntries, ...filmEntries]
}
