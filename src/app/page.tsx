import HomeClient from './HomeClient'

export default function Home() {
  return (
    <>
      {/* Server-rendered HTML for crawlers — hidden once client JS hydrates */}
      <noscript>
        <div className="min-h-screen text-white">
          <div className="max-w-7xl mx-auto px-4 py-24 text-center">
            <h1 className="text-5xl font-black mb-6">bMovies — Your studio. Your films. Your royalties.</h1>
            <p className="text-xl text-gray-400 mb-12">
              The authenticated creative suite for bMovies. Manage your studio, commission films,
              edit scenes, design titles, write scripts, and ship films with a swarm of AI agents.
              Own 99% of every royalty share.
            </p>
            <a
              href="https://bmovies.online/commission.html"
              className="inline-block bg-[#E50914] text-white px-8 py-4 text-lg font-bold uppercase tracking-wider"
            >
              Commission a film →
            </a>
          </div>
        </div>
      </noscript>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'bMovies App',
            url: 'https://app.bmovies.online',
            description:
              'The authenticated creative suite for bMovies. Studio management, movie editor, storyboard generator, title designer, script editor, pitch deck builder, cap tables, investor packs.',
            publisher: {
              '@type': 'Organization',
              name: 'The Bitcoin Corporation Ltd',
              url: 'https://bmovies.online',
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'Flat 6, 315 Barking Road',
                addressLocality: 'London',
                postalCode: 'E13 8EE',
                addressCountry: 'GB',
              },
              identifier: '16735102',
            },
            applicationCategory: 'CreativeWork',
            operatingSystem: 'Web',
          }),
        }}
      />

      <HomeClient />
    </>
  )
}
