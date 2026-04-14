import Link from 'next/link'
import { ALBUMS } from '@/lib/albums'
import { readdir } from 'fs/promises'
import { join } from 'path'
import { MUSIC_VIDEO_TRACKS } from '@/lib/music-video-manifest'

interface XXXTrack {
  slug: string
  title: string
  japanese?: string
  genre: string
  bpm: number
  albumTitle: string
  clipCount: number
  hasOg: boolean
}

async function getXXXTracks(): Promise<XXXTrack[]> {
  const tracks: XXXTrack[] = []

  for (const album of ALBUMS) {
    for (const track of album.tracks) {
      if (track.status !== 'recorded') continue

      // Check for XXX subfolder — filesystem first, manifest fallback
      const xxxDir = join(process.cwd(), 'public', 'music-videos', `${track.slug}-1`, `${track.slug}-xxx`)
      let clipCount = 0
      try {
        const files = await readdir(xxxDir)
        clipCount = files.filter(f => f.endsWith('.mp4')).length
      } catch {
        // Fallback to manifest
        if (!MUSIC_VIDEO_TRACKS[track.slug]?.hasXXX) continue
        clipCount = 15 // approximate
      }

      if (clipCount === 0) continue

      let hasOg = false
      try {
        const { access } = await import('fs/promises')
        await access(join(process.cwd(), 'public', 'og', `${track.slug}.png`))
        hasOg = true
      } catch {}

      tracks.push({
        slug: track.slug,
        title: track.title,
        japanese: track.japanese,
        genre: track.genre,
        bpm: track.bpm,
        albumTitle: album.title,
        clipCount,
        hasOg,
      })
    }
  }

  return tracks
}

export default async function XXXIndexPage() {
  const tracks = await getXXXTracks()

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="font-[family-name:var(--font-brand)] text-5xl text-red-600 tracking-wider">XXX</h1>
          <div className="h-px flex-1 bg-red-600/20" />
        </div>
        <p className="text-white/30 text-sm mb-8">Uncensored music videos — $99 per video • Age verification required</p>

        {tracks.length === 0 ? (
          <div className="border border-white/5 bg-white/[0.02] p-12 text-center">
            <div className="text-white/20 font-[family-name:var(--font-brand)] text-sm">No XXX content available yet</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tracks.map(track => (
              <Link key={track.slug} href={`/watch/${track.slug}/xxx`}
                className="group border border-red-500/10 bg-red-600/[0.03] hover:border-red-500/40 transition-all overflow-hidden">
                {/* Thumbnail */}
                <div className="aspect-video bg-black relative overflow-hidden">
                  {track.hasOg ? (
                    <img src={`/og/${track.slug}.png`} alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-50 group-hover:brightness-75" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 to-black" />
                  )}
                  {/* XXX badge */}
                  <div className="absolute top-2 left-2 bg-red-600 px-2 py-0.5 font-[family-name:var(--font-brand)] text-[10px] text-white tracking-wider">
                    XXX
                  </div>
                  {/* Price */}
                  <div className="absolute top-2 right-2 bg-black/70 px-2 py-0.5 font-[family-name:var(--font-brand)] text-[10px] text-white/60">
                    $99
                  </div>
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <svg viewBox="0 0 40 46" className="w-10 h-12 drop-shadow-[0_0_20px_rgba(220,20,60,0.6)]">
                      <polygon points="4,0 40,23 4,46" fill="#dc2626" />
                    </svg>
                  </div>
                  {/* Clip count */}
                  <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 text-[10px] font-[family-name:var(--font-brand)] text-white/40">
                    {track.clipCount} clips
                  </div>
                </div>
                {/* Info */}
                <div className="p-3">
                  <div className="font-[family-name:var(--font-brand)] text-white text-sm tracking-wider group-hover:text-red-400 transition-colors">
                    {track.title}
                  </div>
                  {track.japanese && (
                    <div className="text-white/20 text-xs mt-0.5">{track.japanese}</div>
                  )}
                  <div className="flex gap-2 mt-1.5 text-[10px] text-white/15">
                    <span>{track.genre}</span>
                    <span>{track.bpm} BPM</span>
                    <span className="text-red-500/30">{track.albumTitle}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Back link */}
        <div className="mt-8 pt-6 border-t border-white/5">
          <Link href="/watch"
            className="text-white/20 hover:text-white/50 text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider transition-colors">
            ← Back to Music Videos
          </Link>
        </div>
      </div>
    </div>
  )
}
