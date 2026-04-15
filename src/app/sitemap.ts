import type { MetadataRoute } from 'next'

const BASE_URL = 'https://bmovies.online'

/**
 * Sitemap for the merged bMovies site. Static brochure pages in
 * public/*.html live alongside the Next.js routes under /account,
 * /login, /studio. Both sets get listed so crawlers index the
 * full product.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString()

  const routes: [string, MetadataRoute.Sitemap[number]['changeFrequency'], number][] = [
    // Landing + core brochure pages
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
    // Authed Next.js routes
    ['/account', 'daily', 0.8],
    ['/studio', 'weekly', 0.6],
    ['/login', 'monthly', 0.4],
    // Legal
    ['/legal/', 'monthly', 0.3],
    ['/terms.html', 'yearly', 0.3],
    ['/privacy.html', 'yearly', 0.3],
  ]

  return routes.map(([path, changeFrequency, priority]) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))
}
