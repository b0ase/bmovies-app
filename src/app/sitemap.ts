import type { MetadataRoute } from 'next'

const BASE_URL = 'https://app.bmovies.online'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString()

  const routes: [string, MetadataRoute.Sitemap[number]['changeFrequency'], number][] = [
    ['', 'daily', 1.0],
    ['/account', 'daily', 0.9],
    ['/movie-editor', 'daily', 0.8],
    ['/storyboard', 'daily', 0.8],
    ['/script-gen', 'daily', 0.8],
    ['/pitch-deck', 'daily', 0.7],
    ['/exchange', 'daily', 0.8],
    ['/marketplace', 'daily', 0.7],
    ['/studio', 'weekly', 0.7],
    ['/title-designer', 'weekly', 0.5],
    ['/music-studio', 'weekly', 0.5],
    ['/login', 'monthly', 0.4],
    ['/terms', 'yearly', 0.3],
    ['/privacy', 'yearly', 0.3],
  ]

  return routes.map(([path, changeFrequency, priority]) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))
}
