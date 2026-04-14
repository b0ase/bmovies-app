/* ── CDN URL Helper ──────────────────────────────── */

const CDN_BASE = process.env.NEXT_PUBLIC_CDN_URL || 'https://api.b0ase.com/npg-assets'

/** Convert a local public/ path to a CDN URL.
 *  e.g. cdnUrl('/title-clips/tokyo-gutter-queen.mp4')
 *    → 'https://api.b0ase.com/npg-assets/title-clips/tokyo-gutter-queen.mp4'
 */
export function cdnUrl(path: string): string {
  const clean = path.startsWith('/') ? path.slice(1) : path
  return `${CDN_BASE}/${clean}`
}
