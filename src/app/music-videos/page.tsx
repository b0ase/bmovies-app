import { cdnUrl } from '@/lib/cdn'
import Link from 'next/link'
import { ALBUMS } from '@/lib/albums'
import { readdir } from 'fs/promises'
import { join } from 'path'
import { MUSIC_VIDEO_TRACKS } from '@/lib/music-video-manifest'
import { ComingSoonGrid } from '@/components/ComingSoonGrid'

interface TrackWithClips {
  slug: string
  title: string
  japanese?: string
  genre: string
  bpm: number
  albumTitle: string
  clipCount: number
  hasOg: boolean
  aSide?: string
}

async function getTracksWithClips(): Promise<TrackWithClips[]> {
  const tracks: TrackWithClips[] = []

  for (const album of ALBUMS) {
    for (const track of album.tracks) {
      if (track.status !== 'recorded') continue

      // Check for video clips — filesystem first, manifest fallback
      let clipCount = 0
      const dir = join(process.cwd(), 'public', 'music-videos', `${track.slug}-1`)
      try {
        const files = await readdir(dir)
        clipCount = files.filter(f => f.endsWith('.mp4')).length
      } catch {}
      // Fallback to manifest if no local clips found
      if (clipCount === 0) {
        clipCount = MUSIC_VIDEO_TRACKS[track.slug]?.clipCount || 0
      }

      // Check for OG image — filesystem first, manifest fallback
      let hasOg = false
      try {
        const { access } = await import('fs/promises')
        await access(join(process.cwd(), 'public', 'og', `${track.slug}.png`))
        hasOg = true
      } catch {
        hasOg = !!MUSIC_VIDEO_TRACKS[track.slug]
      }

      tracks.push({
        slug: track.slug,
        title: track.title,
        japanese: track.japanese,
        genre: track.genre,
        bpm: track.bpm,
        albumTitle: album.title,
        clipCount,
        hasOg,
        aSide: track.aSide,
      })
    }
  }

  return tracks
}

export default async function WatchIndexPage() {
  const tracks = await getTracksWithClips()
  // Only tracks with real music videos (>5 clips, not just title cards)
  const withClips = tracks.filter(t => t.clipCount > 5)
  const withoutClips = tracks.filter(t => t.clipCount <= 5)

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-[family-name:var(--font-brand)] text-5xl tracking-wider mb-2">MUSIC VIDEOS</h1>
            <p className="text-gray-500">Beat-synced generative music videos — every play is unique</p>
          </div>
          <Link href="/director"
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-[family-name:var(--font-brand)] text-sm uppercase tracking-wider transition-all hover:scale-105 shadow-lg shadow-red-600/20 rounded-lg shrink-0">
            Create a Music Video
          </Link>
        </div>

        {/* Videos with clips */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {withClips.map(track => (
            <Link key={track.slug} href={`/watch/${track.slug}`}
              className="group border border-white/10 bg-white/5 hover:border-red-500/50 transition-all overflow-hidden">
              {/* Thumbnail — title clip video */}
              <div className="aspect-video bg-black relative overflow-hidden">
                <video
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  autoPlay muted loop playsInline
                  poster={`/og/${track.slug}.png`}
                  src={cdnUrl(`title-clips/${track.slug}.mp4`)}
                />
                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <svg viewBox="0 0 40 46" className="w-12 h-14 drop-shadow-[0_0_20px_rgba(220,20,60,0.6)]">
                    <polygon points="4,0 40,23 4,46" fill="#dc2626" />
                  </svg>
                </div>
                {/* Clip count badge */}
                <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 text-[10px] font-[family-name:var(--font-brand)] text-white/60">
                  {track.clipCount} clips
                </div>
              </div>
              {/* Info */}
              <div className="p-3">
                <div className="font-[family-name:var(--font-brand)] text-white text-sm tracking-wider group-hover:text-red-400 transition-colors">
                  {track.title}
                </div>
                {track.japanese && (
                  <div className="text-white/30 text-xs mt-0.5">{track.japanese}</div>
                )}
                <div className="flex gap-2 mt-1.5 text-[10px] text-white/20">
                  <span>{track.genre}</span>
                  <span>{track.bpm} BPM</span>
                  <span className="text-red-500/40">{track.albumTitle}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Tracks without clips — commission modal */}
        {withoutClips.length > 0 && (
          <>
            <h2 className="font-[family-name:var(--font-brand)] text-lg text-white/30 tracking-wider mb-4">COMMISSION A VIDEO</h2>
            <ComingSoonGrid tracks={withoutClips.map(t => ({
              slug: t.slug, title: t.title, japanese: t.japanese,
              genre: t.genre, bpm: t.bpm, albumTitle: t.albumTitle, aSide: t.aSide,
            }))} />
          </>
        )}

        {/* Link to storyboard */}
        <div className="mt-12 pt-8 border-t border-white/5">
          <Link href="/storyboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 hover:border-red-500/50 text-red-400 font-[family-name:var(--font-brand)] text-sm uppercase tracking-wider transition-all">
            Create a Music Video →
          </Link>
        </div>
      </div>
    </div>
  )
}
