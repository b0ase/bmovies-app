// Tracks with music videos — used by /watch index when filesystem isn't available (Vercel)
// Update this when adding new music videos
export const MUSIC_VIDEO_TRACKS: Record<string, { clipCount: number; hasXX?: boolean; hasXXX?: boolean }> = {
  'razor-kisses': { clipCount: 67, hasXXX: true },
  'tokyo-gutter-queen': { clipCount: 53 },
  'underground-empress': { clipCount: 32 },
  'harajuku-chainsaw': { clipCount: 23 },
  'shibuya-mosh-pit': { clipCount: 25 },
}
