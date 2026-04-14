import type { Metadata } from 'next'
import { NPGX_ROSTER } from '@/lib/npgx-roster'
import NPGXGalleryClient from './NPGXGalleryClient'

export const metadata: Metadata = {
  title: 'NPGX Roster — 26 Ninja Punk Girls A-Z',
  description: 'Meet the full NPGX roster: 26 collectible AI characters from A to Z. Each has her own token, personality, content library, and revenue stream. Cyberpunk, stealth, gothic, elemental, mecha, arcane, and street categories.',
  openGraph: {
    title: 'NPGX Roster — 26 Ninja Punk Girls A-Z',
    description: 'Meet the full NPGX roster: 26 collectible AI characters from A to Z. Each has her own token, personality, content library, and revenue stream.',
    url: 'https://www.npg-x.com/npgx',
    images: [{ url: '/NPGX-OG.jpg', width: 1200, height: 630, alt: 'NPGX Roster' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NPGX Roster — 26 Ninja Punk Girls A-Z',
    description: '26 collectible AI characters. Cyberpunk, stealth, gothic, elemental, mecha, arcane, street.',
    images: ['/NPGX-OG.jpg'],
  },
}

export default function NPGXCharactersPage() {
  return (
    <>
      {/* Server-rendered character list for crawlers */}
      <noscript>
        <div className="min-h-screen text-white max-w-7xl mx-auto px-4 py-16">
          <h1 className="text-5xl font-black mb-4 text-center">NPGX — 26 Ninja Punk Girls</h1>
          <p className="text-xl text-gray-400 text-center mb-12">Each character has her own token, personality, content library, and revenue stream.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {NPGX_ROSTER.map((c) => (
              <a key={c.slug} href={`/npgx/${c.slug}`} className="block p-4 bg-white/5 rounded-lg border border-white/10">
                <span className="text-red-500 font-bold text-lg">{c.letter}</span>
                <span className="text-white font-semibold ml-2">{c.name}</span>
                <p className="text-gray-400 text-sm mt-1">{c.tagline}</p>
                <p className="text-gray-500 text-xs mt-1 capitalize">{c.category} · {c.token}</p>
              </a>
            ))}
          </div>
        </div>
      </noscript>

      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'NPGX Roster — 26 Ninja Punk Girls',
            url: 'https://www.npg-x.com/npgx',
            description: 'The full A-Z roster of 26 NPGX characters.',
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: NPGX_ROSTER.length,
              itemListElement: NPGX_ROSTER.map((c, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: c.name,
                url: `https://www.npg-x.com/npgx/${c.slug}`,
              })),
            },
          }),
        }}
      />

      <NPGXGalleryClient />
    </>
  )
}
