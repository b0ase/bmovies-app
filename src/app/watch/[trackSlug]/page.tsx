import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { findTrackBySlug, getAllTrackSlugs, getGlobalAdjacentTracks } from '@/lib/albums'
import TrackPlayer from './TrackPlayer'

interface Props {
  params: Promise<{ trackSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { trackSlug } = await params
  const result = findTrackBySlug(trackSlug)
  if (!result) return { title: 'Track Not Found | NPGX' }

  const { album, track } = result
  const title = track.japanese
    ? `${track.title} (${track.japanese}) | ${album.title} | NPGX`
    : `${track.title} | ${album.title} | NPGX`

  // Check for track-specific OG image, fall back to album cover
  const trackOgImage = `/og/${trackSlug}.png`
  const ogImage = trackOgImage // Use track-specific image when available
  const fallbackImage = album.coverPath

  return {
    title,
    description: `Watch "${track.title}" from ${album.title} by NPGX. ${track.genre} at ${track.bpm} BPM. Generative music video experience.`,
    openGraph: {
      title,
      description: `"${track.title}" from ${album.title} — ${track.genre} at ${track.bpm} BPM.`,
      url: `https://www.npg-x.com/watch/${trackSlug}`,
      siteName: 'NPGX',
      images: [{ url: ogImage, width: 1920, height: 1080, alt: `${track.title} video thumbnail` }],
      type: 'music.song',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: `"${track.title}" from ${album.title} — ${track.genre}`,
      images: [ogImage],
    },
  }
}

export async function generateStaticParams() {
  return getAllTrackSlugs().map(slug => ({ trackSlug: slug }))
}

export default async function TrackWatchPage({ params }: Props) {
  const { trackSlug } = await params
  const result = findTrackBySlug(trackSlug)

  if (!result) notFound()

  const { album, track } = result

  // Track exists but not yet recorded
  if (!track.aSide) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[200]">
        <div className="text-center">
          <div className="font-[family-name:var(--font-brand)] text-4xl text-white tracking-wider mb-4">NPGX</div>
          <div className="font-[family-name:var(--font-brand)] text-white/60 text-lg mb-2">{track.title}</div>
          <div className="font-[family-name:var(--font-brand)] text-red-500/60 text-xs uppercase tracking-widest mb-6">Not yet recorded</div>
          <a href="/watch" className="font-[family-name:var(--font-brand)] text-white/40 hover:text-white text-xs uppercase tracking-wider transition-colors">
            Back to Watch
          </a>
        </div>
      </div>
    )
  }

  const { prev, next } = getGlobalAdjacentTracks(trackSlug)
  return <TrackPlayer album={album} track={track} trackSlug={trackSlug} prevSlug={prev ?? undefined} nextSlug={next ?? undefined} />
}
