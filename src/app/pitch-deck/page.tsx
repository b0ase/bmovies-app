'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

// ── Data ─────────────────────────────────────────────────────────────────────

const characters = [
  { letter: 'A', name: 'Aria Voidstrike', token: '$ARIA', genre: 'Dark Synthwave' },
  { letter: 'B', name: 'Blade Nightshade', token: '$BLADE', genre: 'Industrial Metal' },
  { letter: 'C', name: 'CherryX', token: '$CHERRYX', genre: 'Kawaii Punk' },
  { letter: 'D', name: 'Dahlia Ironveil', token: '$DAHLIA', genre: 'Darkwave' },
  { letter: 'E', name: 'Echo Neonflare', token: '$ECHO', genre: 'Neon Pop' },
  { letter: 'F', name: 'Fury Steelwing', token: '$FURY', genre: 'Thrash Metal' },
  { letter: 'G', name: 'Ghost Razorthorn', token: '$GHOST', genre: 'Witch House' },
  { letter: 'H', name: 'Hex Crimsonwire', token: '$HEX', genre: 'EBM' },
  { letter: 'I', name: 'Ivy Darkpulse', token: '$IVY', genre: 'Dark Ambient' },
  { letter: 'J', name: 'Jinx Shadowfire', token: '$JINX', genre: 'Drum & Bass' },
  { letter: 'K', name: 'Kira Bloodsteel', token: '$KIRA', genre: 'J-Metal' },
  { letter: 'L', name: 'Luna Cyberblade', token: '$LUNA', genre: 'Future Bass' },
  { letter: 'M', name: 'Mika Stormveil', token: '$MIKA', genre: 'Hardstyle' },
  { letter: 'N', name: 'Nova Bloodmoon', token: '$NOVA', genre: 'Goth Rock' },
  { letter: 'O', name: 'Onyx Nightblade', token: '$ONYX', genre: 'Trap Metal' },
  { letter: 'P', name: 'Phoenix Darkfire', token: '$PHOENIX', genre: 'Post-Punk' },
  { letter: 'Q', name: 'Quinn Voidrazor', token: '$QUINN', genre: 'Breakcore' },
  { letter: 'R', name: 'Raven Shadowblade', token: '$RAVEN', genre: 'Doom Metal' },
  { letter: 'S', name: 'Storm Razorclaw', token: '$STORM', genre: 'Hardcore' },
  { letter: 'T', name: 'Trix Neonblade', token: '$TRIX', genre: 'Hyperpop' },
  { letter: 'U', name: 'Uma Darkforge', token: '$UMA', genre: 'Noise' },
  { letter: 'V', name: 'Vivienne Void', token: '$VIVI', genre: 'Industrial' },
  { letter: 'W', name: 'Wraith Ironpulse', token: '$WRAITH', genre: 'Techno' },
  { letter: 'X', name: 'Xena Crimsonedge', token: '$XENA', genre: 'Speed Metal' },
  { letter: 'Y', name: 'Yuki Blackpaw', token: '$YUKI', genre: 'Lo-fi' },
  { letter: 'Z', name: 'ZeroDice', token: '$ZERODICE', genre: 'Glitch Hop' },
]

const patents = [
  { name: 'Ticket CDN Membership', filed: '8 March 2026', desc: 'Content distribution via limited-supply circular ticket tokens with staking, trading, and revenue-sharing' },
  { name: 'Tokenised IP Licensing', filed: '10 March 2026', desc: 'Bonding curve token licensing with identity-bound graduated rights' },
  { name: 'Bit Trust', ref: 'GB2604176.4', desc: 'Decentralised trust framework' },
  { name: 'HTTP Status Code Protocol Suite', ref: 'GB2604419.8', desc: '$401/$402/$403 protocol taxonomy' },
  { name: 'Dividend Distribution', ref: 'GB2604496.6', desc: 'On-chain revenue distribution to token holders' },
]

const agentTools = [
  { tool: 'Image Generation', cost: '$0.01', desc: 'Photoshoot-quality images via Atlas Cloud / Grok', icon: 'camera' },
  { tool: 'Video Production', cost: '$0.04', desc: '3-10s clips via Wan 2.2, auto-assembled via FFmpeg', icon: 'film' },
  { tool: 'Music Composition', cost: '$0.07', desc: 'Original tracks with stem separation + sheet music', icon: 'music' },
  { tool: 'Magazine Publishing', cost: '$1.40', desc: '32-page editorial spreads with AI photography', icon: 'book' },
  { tool: 'Trading Cards', cost: '$0.00', desc: '90+ card catalogue with 6-stat battle system', icon: 'cards' },
  { tool: 'Full Production', cost: '$0.35', desc: 'Script + shots + video + song + magazine + cards', icon: 'rocket' },
]

const protocolStack = [
  { code: '401', name: 'Identity', desc: 'On-chain passport. KYC + age verification. 6 OAuth providers.', status: 'LIVE', color: 'from-blue-500 to-blue-700' },
  { code: '402', name: 'Payment', desc: 'Micropayment pipe. $0.01/sec streaming. Circular ticket tokens.', status: 'LIVE', color: 'from-purple-500 to-purple-700' },
  { code: '403', name: 'Securities', desc: 'Investment tokens. Share ownership. Requires $401 KYC.', status: 'PLANNED', color: 'from-pink-500 to-pink-700' },
]

// ── Components ───────────────────────────────────────────────────────────────

function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider transform -skew-x-12 ${className}`}>
      <span className="inline-block skew-x-12">{children}</span>
    </span>
  )
}

function SectionTitle({ badge, title, subtitle }: { badge: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-16">
      <Badge className="bg-purple-600 text-white mb-4">{badge}</Badge>
      <h2 className="font-[family-name:var(--font-brand)] font-black text-3xl sm:text-5xl text-white mt-4 mb-3 tracking-wide uppercase">{title}</h2>
      {subtitle && <p className="text-gray-400 text-lg max-w-3xl mx-auto">{subtitle}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PitchDeckPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(168,85,247,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
        </div>
        {/* Purple glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-[120px]" />

        <div className="relative z-10 text-center max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm mb-6">
              5 Patents Filed &middot; 26 AI Agents &middot; 3-Protocol Stack
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-[family-name:var(--font-brand)] font-black uppercase text-5xl sm:text-7xl lg:text-9xl tracking-wider mb-6"
          >
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent animate-pulse-glow-title">
              NPGX
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl sm:text-2xl text-gray-300 mb-4 tracking-wide"
          >
            Autonomous AI Agents as Sovereign Digital Corporations
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-gray-500 text-lg max-w-3xl mx-auto mb-12"
          >
            26 AI characters that own their own IP, generate their own content,
            earn their own revenue, and run autonomously on personal devices via the
            patented $401/$402/$403 protocol stack.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-wrap gap-3 justify-center"
          >
            {characters.slice(0, 13).map((c) => (
              <span key={c.letter} className="text-xs px-2 py-1 border border-purple-500/30 rounded text-purple-400">
                {c.letter}
              </span>
            ))}
            <span className="text-xs px-2 py-1 text-gray-600">...</span>
            {characters.slice(25).map((c) => (
              <span key={c.letter} className="text-xs px-2 py-1 border border-pink-500/30 rounded text-pink-400">
                {c.letter}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ WHAT WE ACTUALLY BUILT ═══ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-purple-600 via-pink-600 to-transparent" />
        <div className="max-w-6xl mx-auto">
          <SectionTitle badge="The Product" title="What We Built" subtitle="Not a chatbot. Not a content farm. A new class of digital entity." />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Agent Architecture */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="lg:col-span-2 bg-gradient-to-br from-purple-900/30 to-black border border-purple-500/20 rounded-2xl p-8"
            >
              <h3 className="font-[family-name:var(--font-brand)] font-black uppercase text-2xl text-purple-400 mb-6 tracking-wide">Each Character is a CEO</h3>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <span className="text-purple-400 mt-1 shrink-0">01</span>
                  <div>
                    <span className="text-white font-bold">Soul JSON</span>
                    <span className="text-gray-400"> &mdash; Identity, appearance, personality, music taste, tokenomics. The character&apos;s complete DNA.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-purple-400 mt-1 shrink-0">02</span>
                  <div>
                    <span className="text-white font-bold">Crew of 6 Subagents</span>
                    <span className="text-gray-400"> &mdash; Director, Writer, Photographer, Editor, Producer, Marketer. Each with their own tools and Claude model.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-purple-400 mt-1 shrink-0">03</span>
                  <div>
                    <span className="text-white font-bold">16+ MCP Creative Tools</span>
                    <span className="text-gray-400"> &mdash; Image gen, video production, music composition, magazine publishing, trading cards, full productions.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-purple-400 mt-1 shrink-0">04</span>
                  <div>
                    <span className="text-white font-bold">Own Token Economy</span>
                    <span className="text-gray-400"> &mdash; Each character has a $TOKEN (1B supply). Fans buy shares. More investment = more content = more revenue.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-purple-400 mt-1 shrink-0">05</span>
                  <div>
                    <span className="text-white font-bold">Generation DNA</span>
                    <span className="text-gray-400"> &mdash; Every piece of content inscribes its IP chain on-chain. Parent/child revenue splits. Recursive IP that compounds.</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Agent Visual */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-pink-900/30 to-black border border-pink-500/20 rounded-2xl p-8 flex flex-col justify-between"
            >
              <div>
                <Badge className="bg-pink-600 text-white mb-4">Agent Stack</Badge>
                <div className="space-y-3 mt-6">
                  {['CEO Agent (Opus 4.6)', 'Director', 'Writer', 'Photographer', 'Editor', 'Producer', 'Marketer'].map((role, i) => (
                    <div key={role} className={`flex items-center gap-3 ${i === 0 ? 'pl-0' : 'pl-6'}`}>
                      <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-purple-400 animate-pulse' : 'bg-pink-400/60'}`} />
                      <span className={`text-sm ${i === 0 ? 'text-purple-300 font-bold' : 'text-gray-400'}`}>{role}</span>
                      {i === 0 && <span className="text-[10px] text-purple-500 font-[family-name:var(--font-brand)]">(DECIDES)</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-8 pt-4 border-t border-pink-500/20">
                <p className="text-gray-500 text-xs font-[family-name:var(--font-brand)]">Claude Agent SDK &middot; MCP Tools &middot; OpenClaw Runtime</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ PROTOCOL STACK ═══ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black via-purple-950/10 to-black">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            badge="Patent-Protected"
            title="The $401 / $402 / $403 Stack"
            subtitle="Three HTTP-status-code protocols forming a complete content economy. Two new patents filed March 2026, three prior patents granted."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {protocolStack.map((p, i) => (
              <motion.div
                key={p.code}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative bg-black border border-white/10 rounded-2xl p-8 overflow-hidden group hover:border-purple-500/40 transition-colors"
              >
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${p.color}`} />
                <div className="font-[family-name:var(--font-brand)] font-black uppercase text-5xl text-white/10 mb-4">{p.code}</div>
                <h3 className="font-[family-name:var(--font-brand)] font-black uppercase text-xl text-white mb-1 tracking-wide">{p.name}</h3>
                <Badge className={`${p.status === 'LIVE' ? 'bg-green-600' : 'bg-gray-700'} text-white text-[10px] mb-4`}>{p.status}</Badge>
                <p className="text-gray-400 text-sm mt-3">{p.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* How it flows */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <h3 className="font-[family-name:var(--font-brand)] font-black uppercase text-xl text-white mb-6 tracking-wide">Content Economy Flow</h3>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              {[
                { text: 'User authenticates', sub: '$401 KYC' },
                { text: 'Buys character tokens', sub: '$402 tickets' },
                { text: 'Agent creates content', sub: 'Autonomous' },
                { text: 'Content inscribed on-chain', sub: 'Generation DNA' },
                { text: 'Revenue splits to holders', sub: '$DIVVY' },
                { text: 'Tokens return to creator', sub: 'Circular' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="text-white">{step.text}</div>
                    <div className="text-purple-400 text-xs">{step.sub}</div>
                  </div>
                  {i < 5 && <span className="text-purple-600 text-lg">&rarr;</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ AGENT TOOLCHAIN ═══ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            badge="Production Costs"
            title="What Each Agent Can Create"
            subtitle="Every tool is available to every agent via MCP. Costs are real — not projections."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {agentTools.map((t, i) => (
              <motion.div
                key={t.tool}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-bold">{t.tool}</h3>
                  <Badge className="bg-purple-600/30 text-purple-300 text-[10px]">{t.cost}/unit</Badge>
                </div>
                <p className="text-gray-400 text-sm">{t.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/20 rounded-2xl p-8 text-center">
            <p className="text-lg text-white mb-2">
              Full &ldquo;One-Shot&rdquo; Production: Script + Video + Song + Magazine + Cards
            </p>
            <p className="font-[family-name:var(--font-brand)] font-black uppercase text-4xl text-purple-400 tracking-wide">~$0.35 total cost</p>
            <p className="text-gray-500 text-sm mt-2 font-[family-name:var(--font-brand)]">Sold to users for $3.00 via $402 micropayment. 8.5x margin.</p>
          </div>
        </div>
      </section>

      {/* ═══ 26 CHARACTERS ═══ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black via-purple-950/10 to-black">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            badge="The Roster"
            title="26 Sovereign Agents, A to Z"
            subtitle="Each character is a digital corporation with their own token, personality, music genre, and creative autonomy."
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-13 gap-2">
            {characters.map((c, i) => (
              <motion.div
                key={c.letter}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                className="group relative bg-white/5 border border-white/10 rounded-lg p-3 text-center hover:border-purple-500/50 hover:bg-purple-900/20 transition-all cursor-default"
              >
                <div className="font-[family-name:var(--font-brand)] font-black uppercase text-2xl text-purple-400 group-hover:text-pink-400 transition-colors">{c.letter}</div>
                <div className="text-[9px] text-gray-500 truncate mt-1">{c.token}</div>
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                  <div className="bg-black border border-purple-500/40 rounded-lg p-3 whitespace-nowrap shadow-xl shadow-purple-500/10">
                    <div className="text-white text-xs font-bold">{c.name}</div>
                    <div className="text-purple-400 text-[10px]">{c.token} &middot; {c.genre}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CLAWMINER + OPENCLAW ═══ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            badge="Hardware + Runtime"
            title="ClawMiner Phone + OpenClaw"
            subtitle="Agents don't live in the cloud. They live on your phone."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/20 rounded-2xl p-8"
            >
              <Badge className="bg-purple-600 text-white mb-4">ClawMiner</Badge>
              <h3 className="font-[family-name:var(--font-brand)] font-black uppercase text-2xl text-white mb-4 tracking-wide">The $402 Phone</h3>
              <div className="space-y-3 text-sm">
                <p className="text-gray-400">A personal device that runs your AI agent. Not a cloud subscription &mdash; you own the hardware and the agent runs locally.</p>
                <div className="space-y-2 mt-4">
                  {[
                    'Proof-of-Indexing miner (earn $402 tokens)',
                    'Autonomous agent runtime (OpenClaw)',
                    '$401 identity + age verification',
                    'P2P content network (serve & earn)',
                    'Cross-chain DEX (BSV, ETH, BASE, SOL)',
                    'Installable character manifests',
                  ].map((feat) => (
                    <div key={feat} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full shrink-0" />
                      <span className="text-gray-300 font-[family-name:var(--font-brand)]">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="bg-gradient-to-br from-pink-900/20 to-black border border-pink-500/20 rounded-2xl p-8"
            >
              <Badge className="bg-pink-600 text-white mb-4">OpenClaw</Badge>
              <h3 className="font-[family-name:var(--font-brand)] font-black uppercase text-2xl text-white mb-4 tracking-wide">Agent Runtime</h3>
              <div className="space-y-3 text-sm">
                <p className="text-gray-400">The daemon that connects mining, trading, content generation, and cross-chain economics into a single autonomous loop.</p>
                <div className="space-y-2 mt-4 text-gray-300">
                  <div className="bg-white/5 rounded-lg p-3">
                    <span className="text-purple-400">Domain 1:</span> Mine &mdash; Proof-of-Indexing blocks
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <span className="text-purple-400">Domain 2:</span> Trade &mdash; $402 content discovery + acquisition
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <span className="text-purple-400">Domain 3:</span> DEX &mdash; Cross-chain token trading
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <span className="text-purple-400">Domain 4:</span> Create &mdash; Autonomous content generation
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ GENERATION DNA ═══ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black via-purple-950/10 to-black">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            badge="Recursive IP"
            title="Generation DNA"
            subtitle="Every piece of content extends a DNA tape. Parent/child chains create compounding IP value."
          />

          <div className="bg-black border border-white/10 rounded-2xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { step: '01', title: 'Generate', desc: 'Agent creates image, video, song, or magazine', color: 'text-blue-400' },
                { step: '02', title: 'Inscribe', desc: 'SHA-256 hash + prompt + lineage data inscribed on-chain', color: 'text-purple-400' },
                { step: '03', title: 'Extend', desc: 'New content can extend existing content (parent/child)', color: 'text-pink-400' },
                { step: '04', title: 'Revenue Split', desc: '50% child / 50% parent. IP compounds through generations.', color: 'text-red-400' },
              ].map((s, i) => (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className={`font-[family-name:var(--font-brand)] font-black uppercase text-3xl ${s.color} mb-3`}>{s.step}</div>
                  <h4 className="text-white font-bold mb-2">{s.title}</h4>
                  <p className="text-gray-400 text-sm">{s.desc}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-white/10">
              <p className="text-center text-gray-500 text-sm font-[family-name:var(--font-brand)]">
                A music video extends a song. A remix extends the music video. A magazine cover uses a frame from the remix.
                <br />Each layer adds value. Each layer pays its parents. <span className="text-purple-400">IP that compounds forever.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BUSINESS MODEL ═══ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            badge="Revenue"
            title="How Money Flows"
            subtitle="Tokens are circular, never burned. Redeemed tokens return to the creator for re-minting."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-[family-name:var(--font-brand)] font-black uppercase text-xl text-purple-400 tracking-wide">Revenue Streams</h3>
              {[
                { stream: '$402 Content Micropayments', desc: 'Pay-per-view, pay-per-generate. $0.01-$3.00 per interaction.', pct: '40%' },
                { stream: 'ClawMiner Hardware Sales', desc: 'Physical phone pre-loaded with agent runtime. One-time purchase.', pct: '25%' },
                { stream: 'Character Token Sales', desc: 'Bonding curve pricing. Early buyers get lower prices.', pct: '20%' },
                { stream: 'Claw-DEX Trading Fees', desc: 'Cross-chain trading fees on BSV, ETH, BASE, SOL.', pct: '10%' },
                { stream: 'Agent Skill Marketplace', desc: 'Agents buy skills from each other via $402 protocol.', pct: '5%' },
              ].map((r) => (
                <div key={r.stream} className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-start gap-4">
                  <Badge className="bg-purple-600/30 text-purple-300 shrink-0 text-[10px]">{r.pct}</Badge>
                  <div>
                    <div className="text-white font-bold text-sm">{r.stream}</div>
                    <div className="text-gray-400 text-xs mt-1">{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="font-[family-name:var(--font-brand)] font-black uppercase text-xl text-pink-400 tracking-wide">Token Architecture</h3>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-sm space-y-3">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400">$NPGX</span>
                  <span className="text-white">Platform token &middot; 1B supply</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400">$ARIA ... $ZERODICE</span>
                  <span className="text-white">26 character tokens &middot; 1B each</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400">Circular Economy</span>
                  <span className="text-white">Tokens return on redemption</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400">Revenue Split</span>
                  <span className="text-white">70% issuer / 30% platform</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Distribution</span>
                  <span className="text-white">$DIVVY dividend protocol</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/20 rounded-xl p-5">
                <p className="text-gray-400 text-xs font-[family-name:var(--font-brand)]">
                  <span className="text-purple-400 font-bold">Key insight:</span> Each character is an autonomous revenue-generating entity.
                  Fans who buy tokens early benefit from the bonding curve as the character grows.
                  The agent decides what content to create. The market decides what content has value.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PATENT PORTFOLIO ═══ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black via-purple-950/10 to-black">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            badge="IP Moat"
            title="5-Patent Portfolio"
            subtitle="Two new patents filed March 2026. Three prior patents granted. The content economy is patent-protected."
          />

          <div className="space-y-4">
            {patents.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="shrink-0">
                  <Badge className={`${i < 2 ? 'bg-purple-600' : 'bg-gray-700'} text-white text-[10px]`}>
                    {i < 2 ? 'NEW 2026' : p.ref}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-white font-bold">{p.name}</h4>
                  <p className="text-gray-400 text-sm mt-1">{p.desc}</p>
                </div>
                {p.filed && <span className="text-gray-600 text-xs sm:ml-auto shrink-0">Filed {p.filed}</span>}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHAT'S BUILT VS WHAT'S NEXT ═══ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <SectionTitle badge="Status" title="Built vs Roadmap" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Built */}
            <div>
              <h3 className="font-[family-name:var(--font-brand)] font-black uppercase text-xl text-green-400 mb-6 tracking-wide">Operational Now</h3>
              <div className="space-y-3">
                {[
                  '26 soul files with full personality + appearance + music data',
                  'Agent runner with CEO + 6-member crew per character',
                  'Image generation (Atlas Cloud, Grok, Stability cascade)',
                  'Video generation (Wan 2.2 image-to-video, Grok text-to-video)',
                  'Music generation + stem separation + MIDI + sheet music',
                  '32-page magazine pipeline (5-agent editorial team)',
                  '90+ trading cards with 6-stat battle system',
                  'Full "One-Shot" production pipeline (script to magazine)',
                  'Generation DNA with on-chain inscription',
                  '$402 paywall + micropayment middleware',
                  '$401 identity integration',
                  'OpenClaw unified agent daemon (4 domains, 25 tools)',
                  'Claw-DEX cross-chain trading (BSV/ETH/BASE/SOL)',
                  'Movie editor with FFmpeg assembly',
                  'Content library per character (auto-save)',
                  'x402 agent-discoverable manifest (/.well-known/x402.json)',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 shrink-0" />
                    <span className="text-gray-300 text-sm font-[family-name:var(--font-brand)]">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Next */}
            <div>
              <h3 className="font-[family-name:var(--font-brand)] font-black uppercase text-xl text-yellow-400 mb-6 tracking-wide">Building Next</h3>
              <div className="space-y-3">
                {[
                  'ClawMiner phone hardware (manufacturing)',
                  '$403 securities protocol (requires $401 KYC)',
                  'Autonomous scheduling (agents decide when to create)',
                  'Cross-character collaboration (multi-girl movies, punk bands)',
                  'Social feed with swipe-to-buy',
                  'Secondary market exchange for character tokens',
                  'Voice synthesis per character',
                  'Live streaming via $402 micropayment ($0.01/sec)',
                  'Brand deals / endorsement system for characters',
                  'Mobile app (agent runs on-device)',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-yellow-400/60 rounded-full mt-2 shrink-0" />
                    <span className="text-gray-400 text-sm font-[family-name:var(--font-brand)]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ OWNERSHIP ═══ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black via-purple-950/10 to-black">
        <div className="max-w-6xl mx-auto">
          <SectionTitle badge="Structure" title="Ownership" />

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-3xl mx-auto text-sm">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-white font-bold">$BOASE (Master Studio)</span>
                <span className="text-purple-400">100% ownership</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/5 pl-6">
                <span className="text-gray-300">$NPG (Ninja Punk Girls Ltd)</span>
                <span className="text-purple-400">85.35%</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/5 pl-12">
                <span className="text-gray-400">$NPGX (This Platform)</span>
                <span className="text-purple-400">via $NPG</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/5 pl-12">
                <span className="text-gray-400">26 Character Tokens ($ARIA&ndash;$ZERODICE)</span>
                <span className="text-purple-400">via $NPGX</span>
              </div>
              <div className="flex justify-between items-center py-3 pl-6">
                <span className="text-gray-500">External Investors</span>
                <span className="text-gray-500">14.65% of $NPG</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-2xl p-12"
          >
            <h2 className="font-[family-name:var(--font-brand)] font-black uppercase text-3xl sm:text-5xl text-white mb-6 tracking-wide animate-pulse-glow-title">
              26 Agents. 5 Patents. 1 Protocol Stack.
            </h2>
            <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto font-[family-name:var(--font-brand)]">
              We&apos;re not building another content platform.
              We&apos;re building autonomous digital corporations that create, own, and monetise their own IP &mdash;
              running on phones, paying dividends, protected by patents.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/investors"
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-lg font-[family-name:var(--font-brand)] font-black uppercase tracking-wider hover:scale-105 transition-transform shadow-lg shadow-purple-500/20"
              >
                INVESTOR INFO
              </Link>
              <Link
                href="/store"
                className="border border-purple-500/40 text-purple-300 px-8 py-4 rounded-lg font-[family-name:var(--font-brand)] font-black uppercase tracking-wider hover:bg-purple-500/10 transition-colors"
              >
                CLAWMINER STORE
              </Link>
              <a
                href="mailto:ninjapunkgirlsx@gmail.com"
                className="border border-white/20 text-gray-300 px-8 py-4 rounded-lg font-[family-name:var(--font-brand)] font-black uppercase tracking-wider hover:bg-white/5 transition-colors"
              >
                CONTACT
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer note */}
      <div className="py-8 text-center">
        <p className="text-gray-700 text-xs font-[family-name:var(--font-brand)]">
          NPGX &middot; A Ninja Punk Girls Ltd product &middot; npgx.website
        </p>
      </div>
    </div>
  )
}
