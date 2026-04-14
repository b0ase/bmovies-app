import Link from 'next/link'

export default function InvestPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="font-[family-name:var(--font-brand)] text-red-500 text-xs uppercase tracking-[0.3em] mb-2">SEED ROUND — 10% AVAILABLE</div>
        <h1 className="font-[family-name:var(--font-brand)] text-5xl md:text-7xl tracking-wider mb-4">INVEST</h1>
        <p className="text-gray-400 text-lg mb-8 max-w-xl">
          $4,000 gets you 1% of NPGX. 10 tranches at linearly increasing prices ($4K → $13K). $85K total round.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <div className="border border-white/10 bg-white/5 p-4 text-center">
            <div className="font-[family-name:var(--font-brand)] text-red-400 text-2xl">$85K</div>
            <div className="text-white/30 text-[10px] uppercase tracking-wider mt-1">Total Round</div>
          </div>
          <div className="border border-white/10 bg-white/5 p-4 text-center">
            <div className="font-[family-name:var(--font-brand)] text-cyan-400 text-2xl">90%+</div>
            <div className="text-white/30 text-[10px] uppercase tracking-wider mt-1">Gross Margin</div>
          </div>
          <div className="border border-white/10 bg-white/5 p-4 text-center">
            <div className="font-[family-name:var(--font-brand)] text-green-400 text-2xl">$10</div>
            <div className="text-white/30 text-[10px] uppercase tracking-wider mt-1">Per Video (Cost)</div>
          </div>
          <div className="border border-white/10 bg-white/5 p-4 text-center">
            <div className="font-[family-name:var(--font-brand)] text-pink-400 text-2xl">$99</div>
            <div className="text-white/30 text-[10px] uppercase tracking-wider mt-1">Per Video (Revenue)</div>
          </div>
        </div>

        <div className="border border-white/10 bg-white/5 p-6 mb-8">
          <h2 className="font-[family-name:var(--font-brand)] text-lg text-white tracking-wider mb-4">THE OPPORTUNITY</h2>
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            Content production is about to collapse in cost. A professional music video costs $5,000–$500,000. NPGX produces them for <span className="text-white font-bold">$10 each</span> using an automated AI pipeline — and sells them for $20–$99. This is a 90%+ margin content factory.
          </p>
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            Two-sided marketplace: Directors pay $99 to create videos. Creators pay $402 for a licence to build characters and earn 10x their minting costs. NPGX monetises both sides — $402 upfront from creators, $99 per video from directors, resale cuts on every exchange transaction.
          </p>
          <p className="text-white/60 text-sm leading-relaxed">
            26 AI artists. 22 music tracks. 2 albums. Magazines, music videos, trading cards, and a token economy — all producing revenue from day one.
          </p>
        </div>

        <div className="border border-red-500/30 bg-red-600/5 p-6 mb-8">
          <h2 className="font-[family-name:var(--font-brand)] text-lg text-red-400 tracking-wider mb-3">TRANCHES</h2>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {[4,5,6,7,8,9,10,11,12,13].map((k, i) => (
              <div key={i} className="border border-white/10 bg-black/40 p-2 text-center">
                <div className="font-[family-name:var(--font-brand)] text-white text-xs">1%</div>
                <div className="text-red-400 text-[10px]">${k}K</div>
              </div>
            ))}
          </div>
          <div className="text-white/30 text-xs">Founder holds 83%. After round: 73% founder.</div>
        </div>

        <a href="mailto:invest@ninjapunkgirls.com"
          className="inline-block px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-[family-name:var(--font-brand)] text-sm uppercase tracking-wider transition-all hover:scale-105 shadow-lg shadow-red-600/20 rounded-lg">
          Contact: invest@ninjapunkgirls.com
        </a>

        <div className="mt-6">
          <Link href="/watch" className="text-white/30 hover:text-white/60 text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider transition-colors">← Back</Link>
        </div>
      </div>
    </div>
  )
}
