import { redirect } from 'next/navigation'
import { ALBUMS } from '@/lib/albums'
import { MUSIC_VIDEO_TRACKS } from '@/lib/music-video-manifest'

export default function WatchPage() {
  // Find the first track that has video content
  const firstWithVideo = ALBUMS.flatMap(a => a.tracks)
    .filter(t => t.status === 'recorded')
    .find(t => MUSIC_VIDEO_TRACKS[t.slug] && MUSIC_VIDEO_TRACKS[t.slug].clipCount > 5)

  const target = firstWithVideo?.slug ?? ALBUMS[0].tracks[0].slug
  redirect(`/watch/${target}`)
}
