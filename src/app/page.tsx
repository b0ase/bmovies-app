import { NPGX_ROSTER } from '@/lib/npgx-roster'
import HomeClient from './HomeClient'

export default function Home() {
  return (
    <>
      {/* Server-rendered HTML for crawlers — hidden once client JS hydrates */}
      <noscript>
        <div className="min-h-screen text-white">
          <div className="max-w-7xl mx-auto px-4 py-24 text-center">
            <h1 className="text-5xl font-black mb-6">NPGX — 26 Girls. Your Fantasy. Your Film.</h1>
            <p className="text-xl text-gray-400 mb-12">
              Generative adult cinema on Bitcoin. 26 collectible characters. Direct movies, create music, trade on the exchange.
            </p>
          </div>
          <div className="max-w-7xl mx-auto px-4 pb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">The NPGX Roster</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {NPGX_ROSTER.map((c) => (
                <a key={c.slug} href={`/npgx/${c.slug}`} className="block p-4 bg-white/5 rounded-lg border border-white/10">
                  <span className="text-red-500 font-bold">{c.letter}</span>
                  <span className="text-white font-semibold ml-2">{c.name}</span>
                  <p className="text-gray-400 text-sm mt-1">{c.tagline}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </noscript>

      {/* Structured data for search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'NPGX',
            url: 'https://www.npg-x.com',
            description: 'Generative adult cinema on Bitcoin. 26 collectible characters. Direct movies, create music, trade on the exchange.',
            publisher: {
              '@type': 'Organization',
              name: 'Ninja Punk Girls X',
              url: 'https://www.npg-x.com',
            },
          }),
        }}
      />

      <HomeClient />
    </>
  )
}
