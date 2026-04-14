import { NextRequest, NextResponse } from 'next/server'
import { cdnUrl } from '@/lib/cdn'
import { readdirSync, existsSync, statSync, readFileSync } from 'fs'
import { join } from 'path'
import { NPGX_ROSTER } from '@/lib/npgx-roster'

export const dynamic = 'force-dynamic'

interface LibraryClip {
  id: string
  url: string
  character: string
  slug: string
  orientation: 'portrait' | 'landscape'
  source: 'content' | 'npg-x-10'
  filename: string
  size: number
}

interface AlbumTrack {
  num: number
  title: string
  japanese?: string
  genre: string
  aSide?: string
  bSide?: string
}

const CONTENT_DIR = join(process.cwd(), 'public/content')
const MANIFEST_PATH = join(process.cwd(), 'public/NPG-X-10/manifest.json')
const ALBUM_DIR = join(process.cwd(), 'public/music/albums')

// Known album metadata — hardcoded so it works on Vercel where filesystem isn't available
const TGP_TRACKS: Record<number, { title: string; japanese?: string; genre: string }> = {
  1: { title: 'Tokyo Gutter Queen', japanese: '路地裏の叫び', genre: 'Hardcore Punk' },
  2: { title: 'Blade Girl', japanese: 'ネオン地獄', genre: 'Oi! Punk' },
  3: { title: 'Shibuya Mosh Pit', japanese: '暗黒東京', genre: 'Street Punk' },
  4: { title: 'Black Rose', japanese: '錆びた刃', genre: 'Gothic Punk' },
  5: { title: 'Kabukicho Wolf', japanese: '下水道ブルース', genre: 'J-Punk' },
  6: { title: 'Razor Kisses', japanese: '墨田川パンク', genre: 'Pop Punk' },
  8: { title: 'Harajuku Chainsaw', japanese: '歌舞伎町ミッドナイト', genre: 'Grindcore' },
  9: { title: 'Underground Empress', japanese: 'コンクリート・ドリーム', genre: 'Anarcho-Punk' },
  11: { title: 'Fire Girl / Title Track', japanese: '東京ガタパンク', genre: 'Hardcore' },
}

/**
 * GET /api/movie-editor/library
 *
 * Returns all available clips + music tracks for the movie editor.
 * Handles both local dev (filesystem) and Vercel (fetch from CDN).
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  const source = req.nextUrl.searchParams.get('source')
  const clips: LibraryClip[] = []

  // 1. Scan real content folders (works locally, may find some on Vercel)
  if (!source || source === 'content') {
    const chars = slug ? [slug] : NPGX_ROSTER.map(c => c.slug)
    for (const charSlug of chars) {
      for (const orient of ['portrait', 'landscape'] as const) {
        const dir = join(CONTENT_DIR, charSlug, 'videos', orient)
        if (!existsSync(dir)) continue
        try {
          const files = readdirSync(dir).filter(f => /\.(mp4|webm|mov)$/i.test(f))
          for (const f of files) {
            const fullPath = join(dir, f)
            const st = statSync(fullPath)
            clips.push({
              id: `content-${charSlug}-${orient}-${f}`,
              url: `/content/${charSlug}/videos/${orient}/${f}`,
              character: NPGX_ROSTER.find(c => c.slug === charSlug)?.name || charSlug,
              slug: charSlug,
              orientation: orient,
              source: 'content',
              filename: f,
              size: st.size,
            })
          }
        } catch {}
      }
    }
  }

  // 2. Load NPG-X-10 manifest clips — try filesystem first, then fetch from CDN
  if (!source || source === 'npg-x-10') {
    let manifest: any = null

    // Try filesystem (local dev)
    if (existsSync(MANIFEST_PATH)) {
      try {
        manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'))
      } catch {}
    }

    // Fallback: fetch from own CDN (Vercel — public/ files served but not on serverless fs)
    if (!manifest) {
      try {
        const origin = req.nextUrl.origin
        const res = await fetch(`${origin}/NPG-X-10/manifest.json`, { cache: 'force-cache' })
        if (res.ok) manifest = await res.json()
      } catch {}
    }

    if (manifest) {
      const collections = manifest.collections || {}
      for (const [charKey, collection] of Object.entries(collections) as [string, any][]) {
        const items = collection.items || []
        const charName = collection.name || charKey
        const charSlug = charKey // manifest keys are already slugs
        if (slug && charSlug !== slug) continue
        for (const item of items) {
          if (!item.video) continue
          clips.push({
            id: `npgx10-${item.uuid || item.video}`,
            url: `/NPG-X-10/${item.video}`,
            character: charName,
            slug: charSlug,
            orientation: item.orientation || 'portrait',
            source: 'npg-x-10',
            filename: item.video,
            size: 0,
          })
        }
      }
    }
  }

  // 3. Scan album music tracks — try filesystem, fallback to hardcoded
  const albums: { slug: string; title: string; tracks: AlbumTrack[] }[] = []

  if (existsSync(ALBUM_DIR)) {
    // Filesystem available (local dev)
    for (const albumDir of readdirSync(ALBUM_DIR)) {
      const albumPath = join(ALBUM_DIR, albumDir)
      if (!statSync(albumPath).isDirectory()) continue
      const files = readdirSync(albumPath).filter(f => f.endsWith('.mp3'))
      const trackMap = new Map<number, AlbumTrack>()
      for (const f of files) {
        const match = f.match(/^(\d+)-(a|b)\.mp3$/)
        if (!match) continue
        const num = parseInt(match[1])
        if (!trackMap.has(num)) trackMap.set(num, { num, title: `Track ${num}`, genre: 'Punk' })
        const t = trackMap.get(num)!
        if (match[2] === 'a') t.aSide = cdnUrl(`music/albums/${albumDir}/${f}`)
        else t.bSide = cdnUrl(`music/albums/${albumDir}/${f}`)
      }
      albums.push({ slug: albumDir, title: albumDir.replace(/-/g, ' ').toUpperCase(), tracks: Array.from(trackMap.values()).sort((a, b) => a.num - b.num) })
    }
  }

  // Fallback: hardcode Tokyo Gutter Punk album if not found via filesystem
  if (albums.length === 0) {
    const tgpTracks: AlbumTrack[] = Object.entries(TGP_TRACKS).map(([num, meta]) => ({
      num: parseInt(num),
      ...meta,
      aSide: cdnUrl(`music/albums/tokyo-gutter-punk/${String(num).padStart(2, '0')}-a.mp3`),
      bSide: cdnUrl(`music/albums/tokyo-gutter-punk/${String(num).padStart(2, '0')}-b.mp3`),
    })).sort((a, b) => a.num - b.num)
    albums.push({ slug: 'tokyo-gutter-punk', title: 'TOKYO GUTTER PUNK', tracks: tgpTracks })
  }

  // Enrich filesystem-discovered album tracks with metadata
  for (const album of albums) {
    if (album.slug === 'tokyo-gutter-punk') {
      album.title = 'TOKYO GUTTER PUNK'
      for (const t of album.tracks) {
        const meta = TGP_TRACKS[t.num]
        if (meta) Object.assign(t, meta)
      }
    }
  }

  // Standalone music in /public/music/
  const standaloneMusic: { title: string; url: string }[] = []
  const musicDir = join(process.cwd(), 'public/music')
  if (existsSync(musicDir)) {
    try {
      const files = readdirSync(musicDir).filter(f => f.endsWith('.mp3'))
      for (const f of files) {
        standaloneMusic.push({ title: f.replace('.mp3', ''), url: `/music/${encodeURIComponent(f)}` })
      }
    } catch {}
  }

  return NextResponse.json({
    clips,
    albums,
    standaloneMusic,
    characters: NPGX_ROSTER.map(c => ({ slug: c.slug, name: c.name, letter: c.letter })),
    counts: {
      clips: clips.length,
      content: clips.filter(c => c.source === 'content').length,
      npgx10: clips.filter(c => c.source === 'npg-x-10').length,
      albums: albums.length,
      musicTracks: albums.reduce((n, a) => n + a.tracks.length, 0) + standaloneMusic.length,
    },
  })
}
