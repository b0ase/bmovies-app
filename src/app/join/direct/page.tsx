import Link from 'next/link'

export default function DirectPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="font-[family-name:var(--font-brand)] text-red-500 text-xs uppercase tracking-[0.3em] mb-2">DEMAND SIDE</div>
        <h1 className="font-[family-name:var(--font-brand)] text-5xl md:text-7xl tracking-wider mb-4">BE THE DIRECTOR.</h1>
        <p className="text-gray-400 text-lg mb-8 max-w-xl">
          Direct your own NPGX adult movie. Pick from 26 beautiful models. Just <span className="text-red-400 font-bold">$99</span>.
        </p>

        <div className="border border-white/10 bg-white/5 p-6 mb-8">
          <div className="font-[family-name:var(--font-brand)] text-xs text-white/40 uppercase tracking-wider mb-4">YOU DIRECT. AI PRODUCES. YOU OWN IT.</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-white/10 bg-black/40 p-4 text-center">
              <div className="font-[family-name:var(--font-brand)] text-red-400 text-3xl mb-1">1</div>
              <div className="font-[family-name:var(--font-brand)] text-white text-xs uppercase tracking-wider mb-2">Pick Your Girl</div>
              <div className="text-white/40 text-[11px]">AI models or real licensed creators — each with her own look and personality</div>
            </div>
            <div className="border border-white/10 bg-black/40 p-4 text-center">
              <div className="font-[family-name:var(--font-brand)] text-pink-400 text-3xl mb-1">2</div>
              <div className="font-[family-name:var(--font-brand)] text-white text-xs uppercase tracking-wider mb-2">Direct the Scene</div>
              <div className="text-white/40 text-[11px]">10 scenarios, 7 styles, 9 looks. Choose music. Cast the roles. You call the shots.</div>
            </div>
            <div className="border border-white/10 bg-black/40 p-4 text-center">
              <div className="font-[family-name:var(--font-brand)] text-cyan-400 text-3xl mb-1">3</div>
              <div className="font-[family-name:var(--font-brand)] text-white text-xs uppercase tracking-wider mb-2">Own It. Sell It.</div>
              <div className="text-white/40 text-[11px]">One-of-one video. Keep, collect, or resell on the Exchange for profit.</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Link href="/director"
            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-[family-name:var(--font-brand)] text-sm uppercase tracking-wider transition-all hover:scale-105 shadow-lg shadow-red-600/20 rounded-lg">
            Start Directing — $99
          </Link>
          <Link href="/storyboard"
            className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-[family-name:var(--font-brand)] text-sm uppercase tracking-wider border border-white/10 transition-all rounded-lg">
            Storyboard Tool
          </Link>
        </div>

        <div className="mt-6">
          <Link href="/watch" className="text-white/30 hover:text-white/60 text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider transition-colors">← Back</Link>
        </div>
      </div>
    </div>
  )
}
