import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getAllAlbums, findAlbumBySlug } from '@/lib/albums'
import AlbumPlayer from './AlbumPlayer'

interface Props {
  params: Promise<{ albumSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { albumSlug } = await params
  const album = findAlbumBySlug(albumSlug)
  if (!album) return { title: 'Album Not Found | NPGX' }

  return {
    title: `${album.title} | NPGX`,
    description: `Listen and watch ${album.title} by NPGX. Generative music video experience.`,
    openGraph: {
      title: `${album.title} | NPGX`,
      description: `Listen and watch ${album.title} — full album experience`,
      url: `https://www.npg-x.com/listen/${albumSlug}`,
      images: [{ url: album.coverPath, width: 1200, height: 1200 }],
      type: 'music.album',
    },
  }
}

export async function generateStaticParams() {
  return getAllAlbums().map(album => ({ albumSlug: album.slug }))
}

export default async function AlbumListenPage({ params }: Props) {
  const { albumSlug } = await params
  const album = findAlbumBySlug(albumSlug)

  if (!album) notFound()

  return <AlbumPlayer album={album} />
}
