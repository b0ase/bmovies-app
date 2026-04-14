import { NextRequest, NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import { join } from 'path'
import { MUSIC_VIDEO_TRACKS } from '@/lib/music-video-manifest'

const HETZNER = 'https://api.b0ase.com/npg-assets/music-videos'

export async function GET(req: NextRequest) {
  const trackSlug = req.nextUrl.searchParams.get('track')
  if (!trackSlug) return NextResponse.json({ clips: [] })

  // ?quality=low serves compressed versions, ?subfolder=xxx serves from subfolder
  const quality = req.nextUrl.searchParams.get('quality')
  const subfolder = req.nextUrl.searchParams.get('subfolder')
  const suffix = quality === 'low' ? '-low' : ''
  const basePath = `${trackSlug}-1${suffix}`
  const dir = subfolder
    ? join(process.cwd(), 'public', 'music-videos', basePath, `${trackSlug}-${subfolder}`)
    : join(process.cwd(), 'public', 'music-videos', basePath)
  try {
    const files = await readdir(dir)
    const clips = files
      .filter(f => f.endsWith('.mp4'))
      .sort()
      .map(f => subfolder
        ? `/music-videos/${basePath}/${trackSlug}-${subfolder}/${f}`
        : `/music-videos/${basePath}/${f}`)
    if (clips.length > 0) return NextResponse.json({ clips })
  } catch {
    // No local dir — fall through to Hetzner
  }

  // Fallback 1: read from Hetzner manifest (with cache bust to avoid Cloudflare stale 404s)
  const base = `${HETZNER}/${trackSlug}-1`
  try {
    const res = await fetch(`${base}/manifest.json?t=${Date.now()}`, { cache: 'no-store' })
    if (res.ok) {
      const manifest = await res.json()
      const collections = manifest.collections || {}
      const items = Object.values(collections)
        .flatMap((c: any) => c.items || [])
        .filter((i: any) => i.video)
      const clips = items.map((i: any) => `${base}/${i.video}`)

      // Also fetch title videos
      try {
        const titleRes = await fetch(`${base}/title-videos.json?t=${Date.now()}`, { cache: 'no-store' })
        if (titleRes.ok) {
          const titleManifest = await titleRes.json()
          const titleClips = (titleManifest.titleVideos || []).map((v: any) => `${base}/${v.video}`)
          clips.unshift(...titleClips)
        }
      } catch {}

      if (clips.length > 0) return NextResponse.json({ clips })
    }
  } catch {}

  // Fallback 2: construct clip URLs from known manifest data (no CDN fetch needed)
  // This works even if Cloudflare is caching a stale 404 on the manifest
  const trackInfo = MUSIC_VIDEO_TRACKS[trackSlug]
  if (trackInfo && trackInfo.clipCount > 0) {
    const clips: string[] = []
    // Try common naming patterns — scenes, lyrics, titles
    for (let i = 1; i <= trackInfo.clipCount; i++) {
      const num = String(i).padStart(2, '0')
      // Probe the first clip to check which naming pattern exists
      if (i === 1) {
        // Try scene pattern
        const probe = await fetch(`${base}/${trackSlug}-scene-01.mp4`, { method: 'HEAD', cache: 'no-store' }).catch(() => null)
        if (probe?.ok) {
          for (let j = 1; j <= trackInfo.clipCount; j++) {
            clips.push(`${base}/${trackSlug}-scene-${String(j).padStart(2, '0')}.mp4`)
          }
          break
        }
        // Try lyrics pattern
        const probeLyrics = await fetch(`${base}/${trackSlug}-lyrics-01.mp4`, { method: 'HEAD', cache: 'no-store' }).catch(() => null)
        if (probeLyrics?.ok) {
          for (let j = 1; j <= trackInfo.clipCount; j++) {
            clips.push(`${base}/${trackSlug}-lyrics-${String(j).padStart(2, '0')}.mp4`)
          }
          break
        }
      }
    }
    // Add title clips
    const titleProbe = await fetch(`${base}/${trackSlug}-titles-01.mp4`, { method: 'HEAD', cache: 'no-store' }).catch(() => null)
    if (titleProbe?.ok) {
      clips.unshift(`${base}/${trackSlug}-titles-01.mp4`)
      const t2 = await fetch(`${base}/${trackSlug}-titles-02.mp4`, { method: 'HEAD', cache: 'no-store' }).catch(() => null)
      if (t2?.ok) clips.unshift(`${base}/${trackSlug}-titles-02.mp4`)
    }
    if (clips.length > 0) return NextResponse.json({ clips })
  }

  return NextResponse.json({ clips: [] })
}
