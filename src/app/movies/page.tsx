import Link from 'next/link'

export default function MoviesPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="font-[family-name:var(--font-brand)] text-6xl tracking-wider mb-4">MOVIES</div>
        <div className="font-[family-name:var(--font-brand)] text-red-500/60 text-xl uppercase tracking-widest mb-8">Coming Soon</div>
        <p className="text-gray-500 text-sm max-w-md mx-auto mb-8">Full-length AI-generated movies featuring the 26 Ninja Punk Girls. Directed by you, produced by AI.</p>
        <Link href="/music-videos" className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-[family-name:var(--font-brand)] text-sm uppercase tracking-wider transition-all rounded-lg">
          Watch Music Videos →
        </Link>
      </div>
    </div>
  )
}
