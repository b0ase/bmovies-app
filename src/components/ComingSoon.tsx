/**
 * Shared placeholder for tool routes that are scaffolded but not
 * yet wired to the bMovies data layer. Keeps the navigation honest
 * — users land on a real page, they see what the tool WILL do, and
 * they get a link to the tools that work today.
 */

import Link from 'next/link'

interface ComingSoonProps {
  title: string
  kicker?: string
  description: string
  willDo: string[]
  alternative?: { href: string; label: string; desc: string }
}

export function ComingSoon({ title, kicker = 'Phase 2', description, willDo, alternative }: ComingSoonProps) {
  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12">
      <header className="mb-8 pb-6 border-b border-[#1a1a1a]">
        <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#E50914] font-bold mb-2">
          {kicker}
        </div>
        <h1
          className="text-5xl font-black leading-none mb-2"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          {title}
        </h1>
        <p className="text-[#888] text-sm max-w-xl">{description}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-6">
          <div className="text-[0.55rem] uppercase tracking-wider font-bold text-[#666] mb-3">
            Shipping soon
          </div>
          <ul className="space-y-2">
            {willDo.map((item, i) => (
              <li
                key={i}
                className="text-[#bbb] text-sm leading-relaxed flex gap-2"
              >
                <span className="text-[#E50914] font-bold">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {alternative && (
          <div className="border border-[#E50914] bg-gradient-to-br from-[#1a0003] to-[#0a0000] p-6">
            <div className="text-[0.55rem] uppercase tracking-wider font-bold text-[#E50914] mb-3">
              Available now
            </div>
            <h3
              className="text-2xl font-black text-white mb-2"
              style={{ fontFamily: 'var(--font-bebas)' }}
            >
              {alternative.label}
            </h3>
            <p className="text-[#bbb] text-sm mb-4 leading-relaxed">
              {alternative.desc}
            </p>
            <Link
              href={alternative.href}
              className="inline-block px-5 py-2.5 bg-[#E50914] hover:bg-[#b00610] text-white text-xs font-black uppercase tracking-wider"
            >
              Open {alternative.label} →
            </Link>
          </div>
        )}
      </div>

      <div className="mt-8 text-xs text-[#666]">
        <Link href="/account" className="hover:text-white">
          ← Back to my studio
        </Link>
      </div>
    </div>
  )
}
