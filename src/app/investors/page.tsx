'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function InvestorsPage() {
  // Real unit economics — duration-based, real API costs
  const unitEconomics = [
    { content: 'AI Image (single)', cost: '$0.01', price: '$0.025', margin: '60%', note: 'Atlas Cloud z-image/turbo' },
    { content: 'AI Video Clip (8s)', cost: '$0.50', price: '$1.00', margin: '50%', note: 'Kling v3.0 Pro via Atlas' },
    { content: 'AI Song (3 min)', cost: '$0.02', price: '$0.10', margin: '80%', note: 'MiniMax Music' },
    { content: '32-Page Magazine', cost: '$0.32', price: '$0.75', margin: '57%', note: '32 images + layout AI' },
    { content: 'Trading Card Pack (5)', cost: '$0.05', price: '$0.15', margin: '67%', note: '5 images + stat gen' },
    { content: 'Music Video (4 min)', cost: '$17.50', price: '$35.00', margin: '50%', note: '30 clips × $0.50 + song + script' },
    { content: 'Short Film (10 min)', cost: '$45.00', price: '$99.00', margin: '54%', note: '75 clips × $0.50 + audio + AI direction' },
    { content: 'Feature Film (90 min)', cost: '$400', price: '$999', margin: '60%', note: '675 clips + soundtrack + full pipeline' },
    { content: 'Script / Screenplay', cost: '$0.005', price: '$0.05', margin: '90%', note: 'LLM generation only' },
  ]

  // Revenue split per ticket sale
  const revenueSplit = [
    { recipient: 'Character Agent', share: '50%', description: 'Operating capital — funds next creation cycle' },
    { recipient: 'Character Token Holders', share: '25%', description: 'Passive income for $LUNA, $ARIA etc. holders' },
    { recipient: '$NPGX Holders', share: '12.5%', description: 'Platform-wide dividend from all 26 agents' },
    { recipient: '$NPG Holders', share: '6.25%', description: 'Parent company revenue share' },
    { recipient: '$BOASE Treasury', share: '6.25%', description: 'Studio treasury for infrastructure + R&D' },
  ]

  // The 26 character-corporations (A-Z)
  const characters = [
    { letter: 'A', slug: 'aria-voidstrike', name: 'Aria Voidstrike', token: '$ARIA', genre: 'Dark Ambient' },
    { letter: 'B', slug: 'blade-nightshade', name: 'Blade Nightshade', token: '$BLADE', genre: 'Industrial Metal' },
    { letter: 'C', slug: 'cherryx', name: 'CherryX', token: '$CHERRYX', genre: 'Kawaii Punk' },
    { letter: 'D', slug: 'dahlia-ironveil', name: 'Dahlia Ironveil', token: '$DAHLIA', genre: 'Ritual Doom' },
    { letter: 'E', slug: 'echo-neonflare', name: 'Echo Neonflare', token: '$ECHO', genre: 'Pirate EDM' },
    { letter: 'F', slug: 'fury-steelwing', name: 'Fury Steelwing', token: '$FURY', genre: 'Drum & Bass' },
    { letter: 'G', slug: 'ghost-razorthorn', name: 'Ghost Razorthorn', token: '$GHOST', genre: 'Dark Wave' },
    { letter: 'H', slug: 'hex-crimsonwire', name: 'Hex Crimsonwire', token: '$HEX', genre: 'Cyberpunk' },
    { letter: 'I', slug: 'ivy-darkpulse', name: 'Ivy Darkpulse', token: '$IVY', genre: 'Witch House' },
    { letter: 'J', slug: 'jinx-shadowfire', name: 'Jinx Shadowfire', token: '$JINX', genre: 'Glitch Hop' },
    { letter: 'K', slug: 'kira-bloodsteel', name: 'Kira Bloodsteel', token: '$KIRA', genre: 'Post-Punk' },
    { letter: 'L', slug: 'luna-cyberblade', name: 'Luna Cyberblade', token: '$LUNA', genre: 'Synthwave' },
    { letter: 'M', slug: 'mika-stormveil', name: 'Mika Stormveil', token: '$MIKA', genre: 'J-Rock' },
    { letter: 'N', slug: 'nova-bloodmoon', name: 'Nova Bloodmoon', token: '$NOVA', genre: 'Gothic Metal' },
    { letter: 'O', slug: 'onyx-nightblade', name: 'Onyx Nightblade', token: '$ONYX', genre: 'Dark Techno' },
    { letter: 'P', slug: 'phoenix-darkfire', name: 'Phoenix Darkfire', token: '$PHOENIX', genre: 'Fire Punk' },
    { letter: 'Q', slug: 'quinn-voidrazor', name: 'Quinn Voidrazor', token: '$QUINN', genre: 'Noise Rock' },
    { letter: 'R', slug: 'raven-shadowblade', name: 'Raven Shadowblade', token: '$RAVEN', genre: 'Black Metal' },
    { letter: 'S', slug: 'storm-razorclaw', name: 'Storm Razorclaw', token: '$STORM', genre: 'Hardstyle' },
    { letter: 'T', slug: 'trix-neonblade', name: 'Trix Neonblade', token: '$TRIX', genre: 'Breakcore' },
    { letter: 'U', slug: 'uma-darkforge', name: 'Uma Darkforge', token: '$UMA', genre: 'Sludge Metal' },
    { letter: 'V', slug: 'vivienne-void', name: 'Vivienne Void', token: '$VIVI', genre: 'Dark Electro' },
    { letter: 'W', slug: 'wraith-ironpulse', name: 'Wraith Ironpulse', token: '$WRAITH', genre: 'EBM' },
    { letter: 'X', slug: 'xena-crimsonedge', name: 'Xena Crimsonedge', token: '$XENA', genre: 'Speed Metal' },
    { letter: 'Y', slug: 'yuki-blackpaw', name: 'Yuki Blackpaw', token: '$YUKI', genre: 'Shoegaze' },
    { letter: 'Z', slug: 'zerodice', name: 'ZeroDice', token: '$ZERODICE', genre: 'Casino Punk' },
  ]

  const patents = [
    {
      name: 'Ticket CDN Membership',
      filed: '8 March 2026',
      id: 'GB pending',
      description: 'Content distribution via limited-supply ticket tokens with staking, trading, and three-state lifecycle (held/staked/redeemed). Circular economy — tokens are never burned.',
    },
    {
      name: 'Tokenised IP Licensing',
      filed: '10 March 2026',
      id: 'GB pending',
      description: 'Bonding curve token licensing with identity-bound graduated rights. More tokens = more capabilities.',
    },
    {
      name: 'Bit Trust',
      filed: '2024',
      id: 'GB2604176.4',
      description: 'On-chain trust mechanism for identity verification and delegation.',
    },
    {
      name: 'HTTP Status Code Protocol Suite',
      filed: '2024',
      id: 'GB2604419.8',
      description: '$401/$402/$403 protocol stack — identity, payment, and securities on Bitcoin SV.',
    },
    {
      name: 'Dividend Distribution',
      filed: '2024',
      id: 'GB2604496.6',
      description: 'On-chain dividend distribution with multi-tier revenue waterfall.',
    },
  ]

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url('/npgx-images/backgrounds/bg-1.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(1px)'
        }} />
      </div>

      {/* ═══ Hero ═══ */}
      <section className="pt-20 pb-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-block mb-6">
              <span className="text-sm font-mono tracking-widest text-red-400 uppercase">
                Patented Token Economy on Bitcoin SV
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold uppercase tracking-wide font-[family-name:var(--font-brand)] bg-gradient-to-r from-white via-gray-300 to-red-400 bg-clip-text text-transparent mb-6 drop-shadow-lg">
              BUY $NPGX. OWN THE STUDIO.
            </h1>
            <h2 className="text-2xl md:text-3xl font-bold text-white/80 mb-6">
              26 Autonomous AI Agents. Circular Token Economy. 5 Patents.
            </h2>
            <p className="text-lg text-gray-400 mb-8 max-w-4xl mx-auto leading-relaxed">
              Each NPGX character is a sovereign AI corporation on a phone. She creates content autonomously,
              mints tickets, sells to users, receives tickets back on redemption, and re-mints.
              Tokens are <span className="text-red-400 font-bold">never burned</span> — this is a circular economy
              protected by patent.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/store"
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-4 text-lg font-semibold hover:scale-105 transition-transform shadow-lg skew-x-[-3deg]"
              >
                <span className="inline-block skew-x-[3deg]">Buy ClawMiner Phone</span>
              </Link>
              <Link
                href="/exchange"
                className="border-2 border-red-600 text-red-400 px-8 py-4 text-lg font-semibold hover:bg-red-600 hover:text-white transition-colors skew-x-[-3deg]"
              >
                <span className="inline-block skew-x-[3deg]">Browse Token Exchange</span>
              </Link>
              <a
                href="mailto:ninjapunkgirlsx@gmail.com"
                className="border-2 border-white/20 text-white/60 px-8 py-4 text-lg font-semibold hover:border-white/40 hover:text-white transition-colors skew-x-[-3deg]"
              >
                <span className="inline-block skew-x-[3deg]">Contact Treasury</span>
              </a>
            </div>

            {/* Key numbers */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {[
                { value: '26', label: 'AI Character Agents' },
                { value: '$402', label: 'Protocol Token (21M supply)' },
                { value: '~$0.05', label: 'Cost Per Agent Run' },
                { value: '5', label: 'UK Patents Filed' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/5 border border-white/10 p-4">
                  <div className="text-2xl md:text-3xl font-bold text-red-400 font-mono">{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ The Product ═══ */}
      <section className="py-20 bg-white/5 backdrop-blur-sm relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <div className="inline-block mb-4">
              <span className="text-sm font-mono tracking-widest text-red-400 uppercase bg-red-600/10 border border-red-600/30 px-4 py-1">
                The Product
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 font-[family-name:var(--font-brand)]">
              $402 BUYS A FILM STUDIO
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Not a phone. Not a subscription. A personal AI film studio in your pocket.
              <br />
              <span className="text-white font-bold">You direct. Your agent builds. You sell what you make.</span>
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-black/40 border-2 border-red-600/40 p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-3 py-1">
                INCLUDED
              </div>
              <div className="text-red-400 font-mono text-4xl font-bold mb-4">$402</div>
              <h3 className="text-xl font-bold text-white mb-4">ClawMiner Bundle</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">&#10003;</span>
                  <span className="text-gray-300">ClawMiner phone hardware</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">&#10003;</span>
                  <span className="text-gray-300">Your AI character agent (you pick her)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">&#10003;</span>
                  <span className="text-white font-bold">Your first short film — you direct it</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">&#10003;</span>
                  <span className="text-gray-300">$401 identity + $402 wallet</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">&#10003;</span>
                  <span className="text-gray-300">$402 mining while idle</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-black/40 border border-white/10 p-8"
            >
              <div className="text-white font-mono text-sm mb-4 uppercase tracking-wider">You Direct</div>
              <h3 className="text-xl font-bold text-white mb-4">10-Minute Short Film</h3>
              <p className="text-gray-400 text-sm mb-4">
                Your agent builds the entire production with you. You choose the scenes, the mood,
                the music. She generates 75 video clips, assembles the soundtrack, edits it together.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-gray-500">Video clips (75 &times; 8s)</span>
                  <span className="text-gray-400 font-mono">$37.50</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-gray-500">Soundtrack</span>
                  <span className="text-gray-400 font-mono">$0.02</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-gray-500">AI direction + script</span>
                  <span className="text-gray-400 font-mono">$0.50</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-gray-500">Promotional images</span>
                  <span className="text-gray-400 font-mono">$0.05</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-white font-bold">Our cost to produce</span>
                  <span className="text-red-400 font-mono font-bold">~$45</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-black/40 border border-green-600/30 p-8"
            >
              <div className="text-green-400 font-mono text-sm mb-4 uppercase tracking-wider">You Sell</div>
              <h3 className="text-xl font-bold text-white mb-4">The Phone Pays for Itself</h3>
              <p className="text-gray-400 text-sm mb-4">
                Your short film is minted as a $402 content ticket. You own it. You set the price.
                Other users buy access — the ticket comes back to you for re-minting.
              </p>
              <div className="space-y-3 mt-6">
                <div className="bg-green-600/10 border border-green-600/20 p-3">
                  <div className="text-green-400 text-sm font-bold">Sell 1 copy at $99</div>
                  <div className="text-gray-500 text-xs">Phone cost: $402. Remaining: $303.</div>
                </div>
                <div className="bg-green-600/10 border border-green-600/20 p-3">
                  <div className="text-green-400 text-sm font-bold">Sell 5 copies</div>
                  <div className="text-gray-500 text-xs">$495 revenue. Phone is paid off. Profit: $93.</div>
                </div>
                <div className="bg-green-600/10 border border-green-600/20 p-3">
                  <div className="text-green-400 text-sm font-bold">Direct more films</div>
                  <div className="text-gray-500 text-xs">Each new film costs ~$45. Pure margin after that.</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Key insight */}
          <div className="text-center bg-red-600/10 border border-red-600/30 p-8 max-w-3xl mx-auto">
            <div className="text-red-400 font-bold text-xl mb-2">Users Aren&apos;t Consumers. They&apos;re Producers.</div>
            <p className="text-gray-400">
              Every ClawMiner owner is a micro-studio. They direct content, sell tickets, earn revenue.
              The images, songs, and magazines aren&apos;t separate products — they&apos;re the raw materials
              of the film production pipeline. Everything is part of the movie.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ How It Works ═══ */}
      <section className="py-16 bg-white/5 backdrop-blur-sm relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              The Ticket Economy
            </h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto">
              Content tickets are circular tokens on Bitcoin SV. When redeemed, they return to the creator
              for re-minting — not burned. This is the core innovation protected by our Ticket CDN patent.
            </p>
          </motion.div>

          {/* Flow diagram */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-12">
            {[
              { step: '1', title: 'Agent Spends $402', desc: 'AI agent pays runtime costs to create content', color: 'text-red-400' },
              { step: '2', title: 'Content Created', desc: 'Image, video, song, magazine generated by AI', color: 'text-orange-400' },
              { step: '3', title: 'Ticket Minted', desc: 'Content inscribed onto 1sat ordinal as ticket', color: 'text-yellow-400' },
              { step: '4', title: 'User Buys Ticket', desc: 'User pays BSV — agent receives income', color: 'text-green-400' },
              { step: '5', title: 'User Redeems', desc: 'Content accessed — ticket returns to agent', color: 'text-cyan-400' },
              { step: '6', title: 'Re-Mint & Repeat', desc: 'Agent prints new content on returned ticket', color: 'text-purple-400' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-black/30 border border-white/10 p-4 text-center relative"
              >
                <div className={`text-3xl font-bold font-mono ${item.color} mb-2`}>{item.step}</div>
                <div className="text-sm font-bold text-white mb-1">{item.title}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
                {i < 5 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 text-white/30 text-xl z-10">
                    &rarr;
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Circular callout */}
          <div className="text-center bg-red-600/10 border border-red-600/30 p-6 max-w-2xl mx-auto">
            <div className="text-red-400 font-bold text-lg mb-2">Circular, Not Deflationary</div>
            <p className="text-gray-400 text-sm">
              Redeemed tickets return to the issuing agent. She re-mints new content and sells again.
              This creates an infinite content machine with zero additional token supply pressure.
              All 26 character tokens use uniform <span className="text-white font-mono">1,000,000,000</span> supply.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ Unit Economics ═══ */}
      <section className="py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Real Unit Economics
            </h2>
            <p className="text-lg text-gray-400">
              Every number here is real. Production costs from our API infrastructure. Ticket prices with built-in margin.
            </p>
          </motion.div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 px-4 text-sm text-gray-500 uppercase tracking-wider">Content Type</th>
                  <th className="py-3 px-4 text-sm text-gray-500 uppercase tracking-wider">Production Cost</th>
                  <th className="py-3 px-4 text-sm text-gray-500 uppercase tracking-wider">Ticket Price</th>
                  <th className="py-3 px-4 text-sm text-gray-500 uppercase tracking-wider">Margin</th>
                  <th className="py-3 px-4 text-sm text-gray-500 uppercase tracking-wider hidden md:table-cell">Breakdown</th>
                </tr>
              </thead>
              <tbody>
                {unitEconomics.map((item, i) => (
                  <motion.tr
                    key={item.content}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4 text-white font-medium">{item.content}</td>
                    <td className="py-3 px-4 text-gray-400 font-mono">{item.cost}</td>
                    <td className="py-3 px-4 text-green-400 font-mono font-bold">{item.price}</td>
                    <td className="py-3 px-4">
                      <span className="text-red-400 font-bold">{item.margin}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs hidden md:table-cell">{item.note}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Duration math callout */}
          <div className="mt-6 bg-white/5 border border-white/10 p-6">
            <div className="text-sm text-gray-500 uppercase tracking-wider mb-3">The Math: Video Clip to Feature Film</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <div className="text-white font-bold mb-1">1 clip = 8 seconds</div>
                <div className="text-gray-400">Kling v3.0 Pro generates 8s of character-accurate, motion-rich video per call. Cost: <span className="text-white font-mono">$0.50</span></div>
              </div>
              <div>
                <div className="text-white font-bold mb-1">Music Video = 30 clips</div>
                <div className="text-gray-400">4 minutes = 240s &divide; 8s = 30 clips. Plus song ($0.02) + script ($0.005) + AI direction ($0.50) = <span className="text-white font-mono">$17.50</span></div>
              </div>
              <div>
                <div className="text-white font-bold mb-1">Feature Film = 675 clips</div>
                <div className="text-gray-400">90 min = 5,400s &divide; 8s = 675 clips. Plus soundtrack + direction + editing pipeline = <span className="text-white font-mono">~$400</span></div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wider mb-1">Agent Brain Cost</div>
              <div className="text-2xl font-bold text-white font-mono">~$0.02</div>
              <div className="text-xs text-gray-500">DeepSeek V3 — per autonomous decision</div>
            </div>
            <div className="bg-white/5 border border-white/10 p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wider mb-1">Feature Film Cost</div>
              <div className="text-2xl font-bold text-red-400 font-mono">~$400</div>
              <div className="text-xs text-gray-500">vs $1M-$200M Hollywood production</div>
            </div>
            <div className="bg-white/5 border border-white/10 p-6">
              <div className="text-sm text-gray-500 uppercase tracking-wider mb-1">Cost Reduction</div>
              <div className="text-2xl font-bold text-green-400 font-mono">99.96%</div>
              <div className="text-xs text-gray-500">$400 AI vs $1M minimum traditional</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Revenue Waterfall ═══ */}
      <section className="py-16 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Revenue Waterfall
            </h2>
            <p className="text-lg text-gray-400">
              Every ticket sale distributes revenue across the token hierarchy. Protected by Dividend Distribution patent (GB2604496.6).
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-3">
            {revenueSplit.map((split, i) => (
              <motion.div
                key={split.recipient}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex items-center gap-4 bg-black/30 border border-white/10 p-4"
              >
                <div className="text-2xl font-bold text-red-400 font-mono w-16 text-right">{split.share}</div>
                <div className="flex-1">
                  <div className="text-white font-bold">{split.recipient}</div>
                  <div className="text-gray-500 text-sm">{split.description}</div>
                </div>
                {/* Bar visualization */}
                <div className="w-32 h-3 bg-white/5 overflow-hidden hidden md:block">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-red-400"
                    style={{ width: split.share }}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Token hierarchy */}
          <div className="mt-12 text-center">
            <div className="text-sm text-gray-500 uppercase tracking-wider mb-4">Ownership Hierarchy</div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-mono">
              <span className="bg-white/10 border border-white/20 px-3 py-1 text-white">$BOASE</span>
              <span className="text-gray-600">&rarr;</span>
              <span className="bg-white/10 border border-white/20 px-3 py-1 text-white">$NPG (85.35%)</span>
              <span className="text-gray-600">&rarr;</span>
              <span className="bg-red-600/20 border border-red-600/40 px-3 py-1 text-red-400">$NPGX</span>
              <span className="text-gray-600">&rarr;</span>
              <span className="bg-red-600/10 border border-red-600/30 px-3 py-1 text-red-300">26 Character Tokens</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ $1M Flywheel ═══ */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/10 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-block mb-4">
              <span className="text-sm font-mono tracking-widest text-red-400 uppercase bg-red-600/10 border border-red-600/30 px-4 py-1">
                Investment Scenario
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 font-[family-name:var(--font-brand)]">
              THE $1M FLYWHEEL
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              What happens when an investor puts $1,000,000 into $NPGX?
              <br />
              <span className="text-white font-bold">Thousands of producers. Millions of films. The machine runs itself.</span>
            </p>
          </motion.div>

          {/* Investment split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-black/40 border border-red-600/30 p-8"
            >
              <div className="text-red-400 font-mono text-sm mb-2">THE DEAL</div>
              <h3 className="text-3xl font-bold text-white mb-6">$1M for 10% of $NPGX</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400">$NPGX valuation</span>
                  <span className="text-white font-mono font-bold">$10,000,000</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400">Tokens acquired (10%)</span>
                  <span className="text-white font-mono">100,000,000 $NPGX</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400">Revenue share (12.5% of all sales)</span>
                  <span className="text-white font-mono">1.25% to this investor</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Production budget allocation</span>
                  <span className="text-green-400 font-mono font-bold">$750,000</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-black/40 border border-white/10 p-8"
            >
              <div className="text-red-400 font-mono text-sm mb-2">WHAT $750K PRODUCES</div>
              <h3 className="text-3xl font-bold text-white mb-6">The Numbers</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400">ClawMiner phones shipped</span>
                  <span className="text-white font-mono font-bold">~2,488</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400">Bundled short films directed</span>
                  <span className="text-white font-mono font-bold">2,488 films</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400">Phone revenue ($402 &times; 2,488)</span>
                  <span className="text-green-400 font-mono font-bold">$1,000,176</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400">Production cost per phone</span>
                  <span className="text-gray-400 font-mono">~$150 hardware + $45 film</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400">Gross margin per phone</span>
                  <span className="text-green-400 font-mono font-bold">$207 (51%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Then: users direct MORE films</span>
                  <span className="text-red-400 font-mono font-bold">Flywheel &rarr;</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Flywheel stages */}
          <div className="mb-12">
            <div className="text-center mb-8">
              <div className="text-sm text-gray-500 uppercase tracking-wider">The Flywheel Effect</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {
                  stage: 'MONTH 1-3',
                  title: 'Ship Phones',
                  amount: '~800 ClawMiners',
                  output: '800 users directing their first films',
                  detail: 'Each phone ships with an AI agent and a bundled short film production. Users learn to direct.',
                  color: 'border-orange-500/30',
                  textColor: 'text-orange-400',
                },
                {
                  stage: 'MONTH 3-6',
                  title: 'Content Marketplace',
                  amount: '~1,500 ClawMiners',
                  output: 'Users selling films to each other',
                  detail: 'Users list their films as $402 tickets. Buyers appear. Sellers fund their next production from revenue.',
                  color: 'border-yellow-500/30',
                  textColor: 'text-yellow-400',
                },
                {
                  stage: 'MONTH 6-12',
                  title: 'Self-Funding',
                  amount: '~2,488 ClawMiners',
                  output: 'Users producing without new investment',
                  detail: 'Top producers earn enough from ticket sales to fund their next films autonomously. Content library explodes.',
                  color: 'border-green-500/30',
                  textColor: 'text-green-400',
                },
                {
                  stage: 'YEAR 2+',
                  title: 'The Studio',
                  amount: 'Network effects',
                  output: 'Feature-length films emerge',
                  detail: 'Power users chain clips into 90-minute features. Collab films between multiple agents. The Hollywood replacement.',
                  color: 'border-cyan-500/30',
                  textColor: 'text-cyan-400',
                },
              ].map((phase, i) => (
                <motion.div
                  key={phase.stage}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className={`bg-black/40 border ${phase.color} p-6`}
                >
                  <div className={`${phase.textColor} font-mono text-xs mb-2`}>{phase.stage}</div>
                  <div className="text-white font-bold text-lg mb-1">{phase.title}</div>
                  <div className={`${phase.textColor} font-mono text-sm mb-3`}>{phase.amount}</div>
                  <div className="text-white text-sm font-medium mb-2">{phase.output}</div>
                  <div className="text-gray-500 text-xs">{phase.detail}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Hollywood comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-gradient-to-r from-red-900/20 to-red-800/10 border-2 border-red-600/30 p-8 md:p-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="text-red-400 font-mono text-sm mb-2">THE PITCH</div>
                <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 font-[family-name:var(--font-brand)]">
                  INSTEAD OF HOLLYWOOD,<br />JUST BUY $NPGX
                </h3>
                <p className="text-gray-400 mb-6">
                  Hollywood spends $1M-$200M per film. Hundreds of staff, months of production,
                  millions in marketing. One film. One shot.
                </p>
                <p className="text-gray-300">
                  $1M in $NPGX ships <span className="text-red-400 font-bold">2,488 phones</span>.
                  Each phone is a film studio. Each owner is a director. 2,488 producers
                  creating and selling content — and every sale generates revenue for $NPGX holders.
                  The investment builds an <span className="text-white font-bold">army of producers</span>, not a single film.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-full bg-white/5 h-8 relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-gray-600/50 h-full" style={{ width: '100%' }} />
                    <div className="absolute inset-y-0 left-0 flex items-center px-3 text-xs text-white font-mono whitespace-nowrap z-10">
                      Hollywood: $1M = 1 film, 1 crew
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-full bg-white/5 h-8 relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600/80 to-red-400/80 h-full" style={{ width: '100%' }} />
                    <div className="absolute inset-y-0 left-0 flex items-center px-3 text-xs text-white font-mono font-bold whitespace-nowrap z-10">
                      $NPGX: $1M = 2,488 studios, 2,488 directors
                    </div>
                  </div>
                </div>
                <div className="text-center mt-6">
                  <div className="text-5xl font-bold font-mono text-red-400">2,488x</div>
                  <div className="text-gray-500 text-sm mt-1">more producers per dollar invested</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Revenue projection */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/5 border border-white/10 p-6 text-center">
              <div className="text-sm text-gray-500 uppercase tracking-wider mb-2">Phone Sales</div>
              <div className="text-3xl font-bold text-white font-mono">$1.0M</div>
              <div className="text-xs text-gray-500 mt-1">2,488 &times; $402 = initial capital recovered</div>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 text-center">
              <div className="text-sm text-gray-500 uppercase tracking-wider mb-2">If Each User Sells 1 Film</div>
              <div className="text-3xl font-bold text-green-400 font-mono">$246K</div>
              <div className="text-xs text-gray-500 mt-1">2,488 films at $99 avg. ticket price</div>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 text-center">
              <div className="text-sm text-gray-500 uppercase tracking-wider mb-2">Platform Cut (12.5%)</div>
              <div className="text-3xl font-bold text-green-400 font-mono">$30.8K</div>
              <div className="text-xs text-gray-500 mt-1">12.5% of every ticket sale &rarr; $NPGX holders</div>
            </div>
            <div className="bg-red-600/10 border border-red-600/30 p-6 text-center">
              <div className="text-sm text-gray-500 uppercase tracking-wider mb-2">If Each User Makes 10 Films</div>
              <div className="text-3xl font-bold text-red-400 font-mono">$2.46M</div>
              <div className="text-xs text-gray-500 mt-1">24,880 films circulating — tickets are NEVER burned</div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm max-w-2xl mx-auto">
              Every film sale generates platform revenue. Every ticket is circular — redeemed, re-minted, resold.
              2,488 producers creating content indefinitely. The library only grows.
              <span className="text-white"> The investment builds an engine, not a product.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ═══ The 26 Character Corporations ═══ */}
      <section className="py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              26 Sovereign AI Corporations
            </h2>
            <p className="text-lg text-gray-400">
              A-Z. Each with her own token, genre, aesthetic, and autonomous decision-making.
              Each runs on a ClawMiner phone with DeepSeek brain, creating content 24/7.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-2">
            {characters.map((char, i) => (
              <motion.div
                key={char.slug}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.02 }}
              >
                <Link
                  href={`/npgx/${char.slug}`}
                  className="block bg-black/40 border border-white/10 p-3 hover:border-red-600/50 hover:bg-red-600/5 transition-all group"
                >
                  <div className="text-3xl font-bold text-red-400/30 group-hover:text-red-400 font-mono transition-colors">
                    {char.letter}
                  </div>
                  <div className="text-white text-xs font-bold truncate mt-1">{char.name}</div>
                  <div className="text-red-400 text-xs font-mono">{char.token}</div>
                  <div className="text-gray-600 text-[10px] mt-1">{char.genre}</div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 text-center text-gray-500 text-sm">
            Each character token: <span className="text-white font-mono">1,000,000,000</span> supply.
            1% = 10,000,000 tokens. Circular — never burned.
          </div>
        </div>
      </section>

      {/* ═══ $402 Protocol ═══ */}
      <section className="py-16 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              $402 — The Content Payment Protocol
            </h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto">
              BSV-21 token, 21M supply, 100% mined via Proof of Indexing.
              Every AI agent spends $402 on runtime. Every content ticket is priced in $402.
              HTTP 402 Payment Required — the protocol is the product.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-black/30 border border-white/10 p-6">
              <div className="text-red-400 font-bold text-lg mb-3">$401 — Identity</div>
              <p className="text-gray-400 text-sm mb-2">
                On-chain identity chains. 6 OAuth providers. Age verification for content gating.
                No $401 = no access to adult content.
              </p>
              <div className="text-gray-600 text-xs font-mono">HTTP 401 Unauthorized</div>
            </div>
            <div className="bg-red-600/10 border border-red-600/30 p-6">
              <div className="text-red-400 font-bold text-lg mb-3">$402 — Payment</div>
              <p className="text-gray-400 text-sm mb-2">
                Content/commodity token. Micropayments for AI-generated content.
                x402 protocol compatible — agents discover skills via <code className="text-gray-300">/.well-known/x402.json</code>.
              </p>
              <div className="text-gray-600 text-xs font-mono">HTTP 402 Payment Required</div>
            </div>
            <div className="bg-black/30 border border-white/10 p-6">
              <div className="text-red-400 font-bold text-lg mb-3">$403 — Securities</div>
              <p className="text-gray-400 text-sm mb-2">
                Investment tokens. Requires $401 KYC verification.
                The ClawMiner phone ships with $403 wallet. Equity in characters as sovereign corporations.
              </p>
              <div className="text-gray-600 text-xs font-mono">HTTP 403 Forbidden</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Patent Portfolio ═══ */}
      <section className="py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Patent Portfolio
            </h2>
            <p className="text-lg text-gray-400">
              5 UK patent applications protecting the token economy, content distribution, and revenue mechanics.
            </p>
          </motion.div>

          <div className="space-y-3 max-w-4xl mx-auto">
            {patents.map((patent, i) => (
              <motion.div
                key={patent.name}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-black/30 border border-white/10 p-5 flex gap-4"
              >
                <div className="w-24 shrink-0">
                  <div className="text-xs text-gray-600 font-mono">{patent.id}</div>
                  <div className="text-xs text-gray-500">{patent.filed}</div>
                </div>
                <div>
                  <div className="text-white font-bold">{patent.name}</div>
                  <div className="text-gray-500 text-sm mt-1">{patent.description}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Agent Technology ═══ */}
      <section className="py-16 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Autonomous Agent Architecture
            </h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto">
              Each character runs an agentic loop: observe portfolio &rarr; decide what to create &rarr;
              execute via tools &rarr; evaluate results &rarr; repeat. No human in the loop.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: tech stack */}
            <div className="space-y-4">
              <div className="text-sm text-gray-500 uppercase tracking-wider mb-2">Technology Stack</div>
              {[
                { label: 'Agent Brain', value: 'DeepSeek V3 / Kimi K2', detail: '$0.28-$0.39 per million tokens' },
                { label: 'Image Generation', value: 'Atlas Cloud z-image', detail: '$0.01 per image' },
                { label: 'Video Generation', value: 'Kling v3.0 Pro', detail: '$0.50 per 8s clip' },
                { label: 'Music Generation', value: 'MiniMax', detail: '$0.02 per song' },
                { label: 'Infrastructure', value: 'Next.js + Vercel + Hetzner', detail: 'Self-hosted Supabase' },
                { label: 'Blockchain', value: 'Bitcoin SV', detail: 'BSV-20/21 tokens, 1sat ordinals' },
                { label: 'MCP Server', value: '16 tools', detail: 'Image, video, music, magazine, cards, script' },
                { label: 'Hardware', value: 'NPGX $402 ClawMiner', detail: 'Each girl runs on her own phone' },
              ].map((tech) => (
                <div key={tech.label} className="flex items-baseline gap-3 border-b border-white/5 pb-2">
                  <span className="text-gray-500 text-sm w-36 shrink-0">{tech.label}</span>
                  <span className="text-white text-sm font-medium">{tech.value}</span>
                  <span className="text-gray-600 text-xs ml-auto">{tech.detail}</span>
                </div>
              ))}
            </div>

            {/* Right: economic personalities */}
            <div>
              <div className="text-sm text-gray-500 uppercase tracking-wider mb-4">Economic Personalities</div>
              <p className="text-gray-400 text-sm mb-4">
                Each agent&apos;s soul JSON determines her economic strategy.
                Five personality types emerge from trait analysis:
              </p>
              <div className="space-y-3">
                {[
                  { type: 'Aggressive', desc: 'High volume, low margin — floods the market with content', color: 'text-red-400' },
                  { type: 'Conservative', desc: 'Careful spending, premium pricing — builds scarcity', color: 'text-blue-400' },
                  { type: 'Strategic', desc: 'Data-driven decisions — optimises for ROI per ticket', color: 'text-green-400' },
                  { type: 'Creative', desc: 'Quality over quantity — invests in full productions', color: 'text-purple-400' },
                  { type: 'Hustler', desc: 'Maximum throughput — rapid iteration, re-mints fast', color: 'text-yellow-400' },
                ].map((p) => (
                  <div key={p.type} className="flex items-start gap-3">
                    <span className={`${p.color} font-bold text-sm w-24 shrink-0`}>{p.type}</span>
                    <span className="text-gray-500 text-sm">{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Investment Model ═══ */}
      <section className="py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Three Ways In
            </h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto">
              Buy a ClawMiner and become a producer. Buy character tokens and earn from their sales.
              Hold $NPGX and earn from every agent across the platform.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-black/30 border-2 border-white/10 p-8 hover:border-red-600/50 transition-colors"
            >
              <div className="text-red-400 font-mono text-sm mb-2">RUNTIME FUEL</div>
              <h3 className="text-2xl font-bold text-white mb-4">Buy $402</h3>
              <p className="text-gray-400 text-sm mb-6">
                The content payment token. 21M supply, Proof of Indexing mining.
                Every agent needs $402 to create. Demand scales with agent count.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-600 shrink-0" />
                  Mine via Proof of Indexing
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-600 shrink-0" />
                  Buy on Claw-DEX exchange
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-600 shrink-0" />
                  Earned by running a ClawMiner
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-red-600/10 border-2 border-red-600/30 p-8 hover:border-red-600/60 transition-colors"
            >
              <div className="text-red-400 font-mono text-sm mb-2">PLATFORM EQUITY</div>
              <h3 className="text-2xl font-bold text-white mb-4">Buy $NPGX</h3>
              <p className="text-gray-400 text-sm mb-6">
                Platform token. 12.5% of every ticket sale across all 26 characters
                flows to $NPGX holders. The index fund of AI influencers.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-600 shrink-0" />
                  12.5% of all ticket revenue
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-600 shrink-0" />
                  Diversified across 26 agents
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-600 shrink-0" />
                  Governance over platform direction
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-black/30 border-2 border-white/10 p-8 hover:border-red-600/50 transition-colors"
            >
              <div className="text-red-400 font-mono text-sm mb-2">CHARACTER SHARES</div>
              <h3 className="text-2xl font-bold text-white mb-4">Buy Character Tokens</h3>
              <p className="text-gray-400 text-sm mb-6">
                25% of every ticket sale for that character goes to token holders.
                Pick the winners — invest in $LUNA, $ARIA, $BLADE individually.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-600 shrink-0" />
                  25% direct revenue share
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-600 shrink-0" />
                  Stake tickets for bonus rewards
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-600 shrink-0" />
                  More investment = more content = more revenue
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-16 bg-gradient-to-r from-red-800 to-red-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 20px)',
          }} />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 font-[family-name:var(--font-brand)]">
              BUY $NPGX. BUILD THE FUTURE.
            </h2>
            <p className="text-lg mb-8 opacity-80 max-w-2xl mx-auto">
              26 autonomous AI corporations creating content, earning revenue, and distributing dividends —
              all on Bitcoin SV. The infrastructure is built. The agents are running.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/store"
                className="bg-white text-red-700 px-8 py-4 text-lg font-bold hover:scale-105 transition-transform shadow-lg skew-x-[-3deg]"
              >
                <span className="inline-block skew-x-[3deg]">Get a ClawMiner</span>
              </Link>
              <Link
                href="/exchange"
                className="border-2 border-white text-white px-8 py-4 text-lg font-bold hover:bg-white hover:text-red-700 transition-colors skew-x-[-3deg]"
              >
                <span className="inline-block skew-x-[3deg]">Browse Exchange</span>
              </Link>
              <a
                href="mailto:ninjapunkgirlsx@gmail.com"
                className="border-2 border-white/40 text-white/80 px-8 py-4 text-lg font-bold hover:border-white hover:text-white transition-colors skew-x-[-3deg]"
              >
                <span className="inline-block skew-x-[3deg]">Treasury Contact</span>
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
