import Link from 'next/link'

export default function StarPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="font-[family-name:var(--font-brand)] text-purple-500 text-xs uppercase tracking-[0.3em] mb-2">SUPPLY SIDE</div>
        <h1 className="font-[family-name:var(--font-brand)] text-5xl md:text-7xl tracking-wider mb-4">BE THE STAR.</h1>
        <p className="text-gray-400 text-lg mb-8 max-w-xl">
          Pay <span className="text-purple-400 font-bold">$402</span> for a creator licence. Build your character. Produce content. <span className="text-white font-bold">Get paid.</span>
        </p>

        <div className="border border-white/10 bg-white/5 p-6 mb-8">
          <div className="font-[family-name:var(--font-brand)] text-xs text-white/40 uppercase tracking-wider mb-4">THE CREATOR ECONOMY</div>
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            Real women become <span className="text-white font-bold">licensed NPGX creators</span>. They buy a $402 licence, create their own character, and produce content using their phone. Every piece of content is <span className="text-white font-bold">minted on-chain</span> as proof of work.
          </p>
          <p className="text-white/60 text-sm leading-relaxed mb-6">
            NPGX buys their minted entries at <span className="text-purple-400 font-bold">10x the minting cost</span> — a guaranteed income for every creator.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-white/10 bg-black/40 p-4 text-center">
              <div className="font-[family-name:var(--font-brand)] text-purple-400 text-3xl mb-1">1</div>
              <div className="font-[family-name:var(--font-brand)] text-white text-xs uppercase tracking-wider mb-2">Buy the Licence</div>
              <div className="text-white/40 text-[11px]">$402 = NPGX brand licence. Create your own character within the NPGX aesthetic. Join the roster.</div>
            </div>
            <div className="border border-white/10 bg-black/40 p-4 text-center">
              <div className="font-[family-name:var(--font-brand)] text-pink-400 text-3xl mb-1">2</div>
              <div className="font-[family-name:var(--font-brand)] text-white text-xs uppercase tracking-wider mb-2">Produce Content</div>
              <div className="text-white/40 text-[11px]">Use your phone. The mining agent records proof of work for everything you create.</div>
            </div>
            <div className="border border-white/10 bg-black/40 p-4 text-center">
              <div className="font-[family-name:var(--font-brand)] text-green-400 text-3xl mb-1">3</div>
              <div className="font-[family-name:var(--font-brand)] text-white text-xs uppercase tracking-wider mb-2">Get Paid 10X</div>
              <div className="text-white/40 text-[11px]">Mint your index entries. NPGX buys them at 10x your minting cost. Guaranteed buyback.</div>
            </div>
          </div>
        </div>

        <a href="mailto:star@ninjapunkgirls.com"
          className="inline-block px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-[family-name:var(--font-brand)] text-sm uppercase tracking-wider transition-all hover:scale-105 shadow-lg shadow-purple-600/20 rounded-lg">
          Apply: star@ninjapunkgirls.com
        </a>

        <div className="mt-6">
          <Link href="/watch" className="text-white/30 hover:text-white/60 text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider transition-colors">← Back</Link>
        </div>
      </div>
    </div>
  )
}
