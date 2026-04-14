import { notFound } from 'next/navigation'
import { NPGX_ROSTER, ROSTER_BY_SLUG } from '@/lib/npgx-roster'
import { loadSoul } from '@/lib/souls'
import type { Soul } from '@/lib/souls'
import { CharacterHubClient } from './CharacterHubClient'

export function generateStaticParams() {
  return NPGX_ROSTER.map(c => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const character = ROSTER_BY_SLUG[slug]
  if (!character) return { title: 'Character Not Found' }

  const title = `${character.name} (${character.token}) | NPGX`
  const description = `${character.tagline}. ${character.description}`
  const url = `https://www.npg-x.com/npgx/${character.slug}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'NPGX',
      images: [
        {
          url: character.image,
          width: 800,
          height: 800,
          alt: `${character.name} — ${character.tagline}`,
        },
        {
          url: '/NPGX-OG.jpg',
          width: 1200,
          height: 630,
          alt: 'NPGX — Ninja Punk Girls X',
        },
      ],
      type: 'profile',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${character.name} (${character.token})`,
      description: character.tagline,
      images: [character.image],
      creator: '@ninjapunkgirls',
    },
  }
}

export default async function NPGXCharacterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const character = ROSTER_BY_SLUG[slug]
  if (!character) notFound()

  let soul: Soul | null = null
  try {
    soul = await loadSoul(slug)
  } catch {
    // Soul file missing — client component will use roster data as fallback
  }

  return (
    <CharacterHubClient
      character={character}
      soul={soul}
      roster={NPGX_ROSTER}
    />
  )
}
