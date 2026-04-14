import Link from 'next/link'

const PAGES = [
  // Core
  { href: '/', label: 'Home', category: 'Core' },
  { href: '/exchange', label: 'Exchange', category: 'Core' },
  { href: '/store', label: 'Store', category: 'Core' },
  { href: '/store/buy', label: 'Store / Buy', category: 'Core' },
  { href: '/join/invest', label: 'Join / Invest', category: 'Core' },
  { href: '/join/star', label: 'Join / Star', category: 'Core' },
  { href: '/join/direct', label: 'Join / Direct', category: 'Core' },
  { href: '/investors', label: 'Investors', category: 'Core' },
  { href: '/buy', label: 'Buy', category: 'Core' },

  // Watch / Music
  { href: '/watch', label: 'Watch (redirects to first track)', category: 'Watch' },
  { href: '/watch/tokyo-gutter-queen', label: 'Watch: Tokyo Gutter Queen', category: 'Watch' },
  { href: '/watch/razor-kisses', label: 'Watch: Razor Kisses', category: 'Watch' },
  { href: '/watch/underground-empress', label: 'Watch: Underground Empress', category: 'Watch' },
  { href: '/watch/harajuku-chainsaw', label: 'Watch: Harajuku Chainsaw', category: 'Watch' },
  { href: '/watch/shibuya-mosh-pit', label: 'Watch: Shibuya Mosh Pit', category: 'Watch' },
  { href: '/watch/blade-girl', label: 'Watch: Blade Girl', category: 'Watch' },
  { href: '/watch/black-rose', label: 'Watch: Black Rose', category: 'Watch' },
  { href: '/music-videos', label: 'Music Videos Grid', category: 'Watch' },
  { href: '/music', label: 'Music Player', category: 'Watch' },
  { href: '/album', label: 'Albums', category: 'Watch' },
  { href: '/albums', label: 'Albums (alt)', category: 'Watch' },

  // Characters
  { href: '/npgx', label: 'NPGX Roster', category: 'Characters' },
  { href: '/npgx/aria-voidstrike', label: 'Aria Voidstrike', category: 'Characters' },
  { href: '/npgx/trix-neonblade', label: 'Trix Neonblade', category: 'Characters' },
  { href: '/npgx/kira-bloodsteel', label: 'Kira Bloodsteel', category: 'Characters' },
  { href: '/npgx/nova-bloodmoon', label: 'Nova Bloodmoon', category: 'Characters' },
  { href: '/npgx/dahlia-ironveil', label: 'Dahlia Ironveil', category: 'Characters' },
  { href: '/npgx/vivienne-void', label: 'Vivienne Void', category: 'Characters' },
  { href: '/rankings', label: 'Rankings', category: 'Characters' },
  { href: '/cards', label: 'Trading Cards', category: 'Characters' },
  { href: '/xxx', label: 'XXX Gallery', category: 'Characters' },

  // Creation Tools
  { href: '/director', label: 'Director', category: 'Tools' },
  { href: '/one-shot', label: 'One-Shot Creator', category: 'Tools' },
  { href: '/image-gen', label: 'Image Generator', category: 'Tools' },
  { href: '/video-gen', label: 'Video Generator', category: 'Tools' },
  { href: '/music-gen', label: 'Music Generator', category: 'Tools' },
  { href: '/cover-gen', label: 'Cover Generator', category: 'Tools' },
  { href: '/title-gen', label: 'Title Generator', category: 'Tools' },
  { href: '/script-gen', label: 'Script Generator', category: 'Tools' },
  { href: '/prompt-gen', label: 'Prompt Generator', category: 'Tools' },
  { href: '/storyboard', label: 'Storyboard', category: 'Tools' },
  { href: '/storyboard-gen', label: 'Storyboard Generator', category: 'Tools' },
  { href: '/storyline-gen', label: 'Storyline Generator', category: 'Tools' },
  { href: '/character-gen', label: 'Character Generator', category: 'Tools' },
  { href: '/character-refinery', label: 'Character Refinery', category: 'Tools' },
  { href: '/photoshoot', label: 'Photoshoot', category: 'Tools' },
  { href: '/video-prompts', label: 'Video Prompts', category: 'Tools' },

  // Editors
  { href: '/movie-editor', label: 'Movie Editor Index', category: 'Editors' },
  { href: '/movie-editor/shibuya-mosh-pit', label: 'Movie Editor: Shibuya Mosh Pit', category: 'Editors' },
  { href: '/movie-editor/tokyo-gutter-queen', label: 'Movie Editor: Tokyo Gutter Queen', category: 'Editors' },
  { href: '/music-video-editor', label: 'Music Video Editor', category: 'Editors' },
  { href: '/music-studio', label: 'Music Studio', category: 'Editors' },
  { href: '/music-mixer', label: 'Music Mixer', category: 'Editors' },
  { href: '/mixer', label: 'Mixer', category: 'Editors' },
  { href: '/title-designer', label: 'Title Designer', category: 'Editors' },
  { href: '/motion-graphics', label: 'Motion Graphics', category: 'Editors' },
  { href: '/motion-graphics/designer', label: 'Motion Graphics Designer', category: 'Editors' },
  { href: '/graphic-design', label: 'Graphic Design', category: 'Editors' },
  { href: '/graphic-design/magazine', label: 'Magazine Designer', category: 'Editors' },
  { href: '/graphic-design/video', label: 'Video Designer', category: 'Editors' },
  { href: '/nft-segmenter', label: 'NFT Segmenter', category: 'Editors' },
  { href: '/quality-checker', label: 'Quality Checker', category: 'Editors' },

  // Magazine
  { href: '/magazine', label: 'Magazine', category: 'Magazine' },
  { href: '/magazine/designer', label: 'Magazine Designer', category: 'Magazine' },
  { href: '/magazine/generated', label: 'Generated Magazines', category: 'Magazine' },

  // Marketplace
  { href: '/marketplace', label: 'Marketplace', category: 'Market' },
  { href: '/nft-marketplace', label: 'NFT Marketplace', category: 'Market' },
  { href: '/mint', label: 'Mint', category: 'Market' },
  { href: '/token', label: 'Token', category: 'Market' },
  { href: '/tokens', label: 'Tokens', category: 'Market' },
  { href: '/staking', label: 'Staking', category: 'Market' },

  // Business
  { href: '/business-plan', label: 'Business Plan', category: 'Business' },
  { href: '/business-model', label: 'Business Model', category: 'Business' },
  { href: '/pitch-deck', label: 'Pitch Deck', category: 'Business' },
  { href: '/mvp-projections', label: 'MVP Projections', category: 'Business' },
  { href: '/expenses', label: 'Expenses', category: 'Business' },
  { href: '/invoices', label: 'Invoices', category: 'Business' },
  { href: '/metrics', label: 'Metrics', category: 'Business' },
  { href: '/sales-funnel', label: 'Sales Funnel', category: 'Business' },
  { href: '/affiliate', label: 'Affiliate', category: 'Business' },
  { href: '/publicity', label: 'Publicity', category: 'Business' },
  { href: '/clawminer-publicity', label: 'ClawMiner Publicity', category: 'Business' },

  // Content
  { href: '/feed', label: 'Feed', category: 'Content' },
  { href: '/video-gallery', label: 'Video Gallery', category: 'Content' },
  { href: '/movies', label: 'Movies', category: 'Content' },
  { href: '/merch', label: 'Merch', category: 'Content' },

  // User
  { href: '/profile', label: 'Profile', category: 'User' },
  { href: '/user/account', label: 'Account', category: 'User' },
  { href: '/dashboard', label: 'Dashboard', category: 'User' },
  { href: '/subscribe', label: 'Subscribe', category: 'User' },
  { href: '/login', label: 'Login', category: 'User' },
  { href: '/auth/signin', label: 'Sign In', category: 'User' },

  // Platform
  { href: '/agent', label: 'Agent', category: 'Platform' },
  { href: '/create', label: 'Create', category: 'Platform' },
  { href: '/studio', label: 'Studio', category: 'Platform' },
  { href: '/launchpad', label: 'Launchpad', category: 'Platform' },
  { href: '/tools', label: 'Tools', category: 'Platform' },
  { href: '/skills', label: 'Skills', category: 'Platform' },
  { href: '/map', label: 'Map', category: 'Platform' },
  { href: '/database', label: 'Database', category: 'Platform' },
  { href: '/notion', label: 'Notion', category: 'Platform' },

  // Legal
  { href: '/terms', label: 'Terms', category: 'Legal' },
  { href: '/privacy', label: 'Privacy', category: 'Legal' },
  { href: '/dmca', label: 'DMCA', category: 'Legal' },
  { href: '/cookies', label: 'Cookies', category: 'Legal' },
  { href: '/concerns', label: 'Concerns', category: 'Legal' },

  // Other
  { href: '/alt', label: 'Alt Landing', category: 'Other' },
  { href: '/demo', label: 'Demo', category: 'Other' },
  { href: '/demo-video', label: 'Demo Video', category: 'Other' },
  { href: '/example', label: 'Example', category: 'Other' },
  { href: '/competition', label: 'Competition', category: 'Other' },
  { href: '/ninja-punk-girls', label: 'Ninja Punk Girls', category: 'Other' },
  { href: '/character-viewer', label: 'Character Viewer', category: 'Other' },
  { href: '/admin/dividends', label: 'Admin: Dividends', category: 'Other' },
  { href: '/stripe', label: 'Stripe', category: 'Other' },
]

const categories = [...new Set(PAGES.map(p => p.category))]

const COLORS: Record<string, string> = {
  Core: 'border-red-500/40 text-red-400',
  Watch: 'border-pink-500/40 text-pink-400',
  Characters: 'border-orange-500/40 text-orange-400',
  Tools: 'border-cyan-500/40 text-cyan-400',
  Editors: 'border-violet-500/40 text-violet-400',
  Magazine: 'border-amber-500/40 text-amber-400',
  Market: 'border-green-500/40 text-green-400',
  Business: 'border-blue-500/40 text-blue-400',
  Content: 'border-rose-500/40 text-rose-400',
  User: 'border-gray-500/40 text-gray-400',
  Platform: 'border-teal-500/40 text-teal-400',
  Legal: 'border-gray-600/40 text-gray-500',
  Other: 'border-white/20 text-white/40',
}

export default function SiteIndex() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-black mb-2" style={{ fontFamily: 'var(--font-brand)' }}>NPGX Site Index</h1>
      <p className="text-gray-500 mb-8">{PAGES.length} pages</p>

      {categories.map(cat => (
        <div key={cat} className="mb-8">
          <h2 className="text-lg font-bold text-white/60 uppercase tracking-widest mb-3" style={{ fontFamily: 'var(--font-brand)' }}>{cat}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {PAGES.filter(p => p.category === cat).map(p => (
              <a key={p.href} href={p.href}
                className={`block border ${COLORS[cat] || 'border-white/10 text-white/50'} bg-white/5 hover:bg-white/10 px-3 py-2 rounded text-xs transition-all hover:scale-105 cursor-pointer underline-offset-2 hover:underline`}>
                <div className="font-semibold truncate">{p.label}</div>
                <div className="text-white/20 text-[9px] mt-0.5 truncate">{p.href}</div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
