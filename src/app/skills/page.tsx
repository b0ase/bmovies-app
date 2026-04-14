'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface X402Skill {
  id: string
  name: string
  description: string
  category: string
  endpoint: string
  method: string
  price: { amount: number; currency: string; network: string; usdEquivalent: string; unit: string }
  params: { name: string; type: string; required: boolean; description: string; enum?: string[]; default?: any }[]
  tags: string[]
  rateLimit?: string
  example?: string
}

interface X402Manifest {
  x402Version: number
  provider: {
    name: string
    description: string
    url: string
    network: string
    payTo: string
    agentDiscovery: string
    documentation: string
  }
  skills: X402Skill[]
  characters: { slug: string; name: string; token: string }[]
  revenueSplit: Record<string, number>
  meta: { totalSkills: number; freeSkills: number; paidSkills: number; generatedAt: string }
}

const CATEGORIES = [
  { id: 'all', label: 'All Skills' },
  { id: 'image', label: 'Image' },
  { id: 'video', label: 'Video' },
  { id: 'music', label: 'Music' },
  { id: 'design', label: 'Design' },
  { id: 'production', label: 'Production' },
  { id: 'blockchain', label: 'Blockchain' },
  { id: 'text', label: 'Text' },
  { id: 'data', label: 'Data' },
]

const CATEGORY_COLORS: Record<string, string> = {
  image: 'text-red-400 bg-red-500/10 border-red-500/20',
  video: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  music: 'text-green-400 bg-green-500/10 border-green-500/20',
  text: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  design: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  production: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  blockchain: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  data: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
}

const SKILL_LINKS: Record<string, string> = {
  'generate-image': '/image-gen',
  'generate-video': '/video-gen',
  'generate-song': '/music-gen',
  'generate-script': '/script-gen',
  'full-production': '/one-shot',
  'generate-magazine': '/magazine',
  'generate-cards': '/cards',
  'title-design': '/title-designer',
  'platform-stats': '/exchange',
}

export default function SkillsMarketplace() {
  const [manifest, setManifest] = useState<X402Manifest | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/.well-known/x402.json')
      .then(r => r.json())
      .then(data => {
        setManifest(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const skills = manifest?.skills || []
  const filtered = selectedCategory === 'all'
    ? skills
    : skills.filter(s => s.category === selectedCategory)

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedText(id)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const manifestUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/.well-known/x402.json`
    : 'https://www.npgx.website/.well-known/x402.json'

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-wide font-[family-name:var(--font-brand)] bg-gradient-to-r from-white via-red-400 to-purple-400 bg-clip-text text-transparent mb-4">
            NPGX SKILLS
          </h1>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-2">
            AI-powered creative tools as x402-compatible APIs. Pay per use with BSV micropayments.
          </p>
          <p className="text-sm text-gray-600 max-w-2xl mx-auto">
            Agents and humans discover, pay for, and use these skills via the x402 protocol.
            Every endpoint returns HTTP 402 with pricing when called without payment.
          </p>
        </div>

        {/* x402 Protocol Integration */}
        <div className="bg-gradient-to-r from-emerald-900/20 via-black/40 to-emerald-900/20 border border-emerald-500/20 rounded-2xl p-6 mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
            <h2 className="text-lg font-black text-white uppercase tracking-wider font-[family-name:var(--font-brand)]">
              x402 Protocol — Agent Discovery
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
              <div className="text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">1. Discover</div>
              <p className="text-[11px] text-gray-400 mb-2">Agents fetch the skills manifest to discover all available capabilities and pricing.</p>
              <button
                onClick={() => copy(manifestUrl, 'manifest-url')}
                className="w-full text-left bg-black/60 border border-white/10 rounded px-3 py-2 text-[10px] font-mono text-emerald-400 hover:border-emerald-500/30 transition-colors cursor-pointer"
              >
                {copiedText === 'manifest-url' ? 'Copied!' : 'GET /.well-known/x402.json'}
              </button>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
              <div className="text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">2. Call → Get 402</div>
              <p className="text-[11px] text-gray-400 mb-2">Call any skill without payment → get HTTP 402 with pricing in X-PAYMENT-REQUIRED header.</p>
              <div className="bg-black/60 border border-white/10 rounded px-3 py-2 text-[10px] font-mono text-red-400">
                402 Payment Required → base64(PaymentRequired)
              </div>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
              <div className="text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">3. Pay → Access</div>
              <p className="text-[11px] text-gray-400 mb-2">Sign a BSV micropayment, retry with X-PAYMENT header → get the resource.</p>
              <div className="bg-black/60 border border-white/10 rounded px-3 py-2 text-[10px] font-mono text-emerald-400">
                X-PAYMENT: base64(signed_tx) → 200 OK
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://x402agency.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm font-bold hover:bg-emerald-600/30 transition-colors"
            >
              <span className="w-2 h-2 bg-emerald-400 rounded-full" />
              x402agency.com
            </a>
            <button
              onClick={() => copy(manifestUrl, 'full-url')}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-sm font-mono hover:bg-white/10 transition-colors"
            >
              {copiedText === 'full-url' ? 'Copied!' : manifestUrl}
            </button>
            <a
              href="https://www.x402.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-sm font-bold hover:bg-white/10 transition-colors"
            >
              x402 Protocol Spec
            </a>
          </div>
        </div>

        {/* Integration methods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-black/40 border border-white/10 rounded-xl p-5">
            <div className="text-red-400 font-bold text-sm uppercase tracking-wider mb-2">REST API + x402</div>
            <p className="text-xs text-gray-400 mb-2">Call any endpoint. No payment → 402 with pricing. With X-PAYMENT header → resource.</p>
            <code className="block text-[10px] text-gray-500 font-mono">X-PAYMENT: base64(signed_bsv_tx)</code>
          </div>
          <div className="bg-black/40 border border-white/10 rounded-xl p-5">
            <div className="text-purple-400 font-bold text-sm uppercase tracking-wider mb-2">MCP Server</div>
            <p className="text-xs text-gray-400 mb-2">Connect via Model Context Protocol. AI agents discover and invoke skills autonomously.</p>
            <code className="block text-[10px] text-gray-500 font-mono">npx @npgx/mcp-server</code>
          </div>
          <div className="bg-black/40 border border-white/10 rounded-xl p-5">
            <div className="text-green-400 font-bold text-sm uppercase tracking-wider mb-2">Agent Wallet</div>
            <p className="text-xs text-gray-400 mb-2">BSV wallet auto-signs micropayments per call. No subscriptions, no API keys needed.</p>
            <code className="block text-[10px] text-gray-500 font-mono">Network: BSV | Asset: satoshis</code>
          </div>
        </div>

        {/* Stats bar */}
        {manifest && (
          <div className="flex items-center gap-6 mb-8 text-sm">
            <span className="text-gray-500">
              <span className="text-white font-bold">{manifest.meta.totalSkills}</span> skills
            </span>
            <span className="text-gray-500">
              <span className="text-emerald-400 font-bold">{manifest.meta.freeSkills}</span> free
            </span>
            <span className="text-gray-500">
              <span className="text-red-400 font-bold">{manifest.meta.paidSkills}</span> paid
            </span>
            <span className="text-gray-500">
              <span className="text-white font-bold">{manifest.characters.length}</span> characters
            </span>
            <span className="text-gray-600 text-xs ml-auto">
              x402 v{manifest.x402Version} | {manifest.provider.network.toUpperCase()}
            </span>
          </div>
        )}

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                selectedCategory === cat.id
                  ? 'bg-red-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
          <div className="ml-auto text-sm text-gray-600 self-center">
            {filtered.length} skill{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-20 text-gray-500">
            <div className="w-6 h-6 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
            Loading skills manifest...
          </div>
        )}

        {/* Skills grid */}
        <div className="space-y-4">
          {filtered.map(skill => {
            const isExpanded = expandedSkill === skill.id
            const catColor = CATEGORY_COLORS[skill.category] || 'text-gray-400 bg-gray-500/10 border-gray-500/20'
            const isFree = skill.price.amount === 0
            const linkHref = SKILL_LINKS[skill.id]

            return (
              <div
                key={skill.id}
                className="bg-black/40 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors"
              >
                {/* Skill header */}
                <button
                  onClick={() => setExpandedSkill(isExpanded ? null : skill.id)}
                  className="w-full flex items-center gap-4 p-5 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="text-lg font-bold text-white">{skill.name}</h3>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${catColor}`}>
                        {skill.category}
                      </span>
                      {isFree && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400">
                          FREE
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-gray-600">{skill.method}</span>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-1">{skill.description}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      {isFree ? (
                        <div className="text-lg font-black text-green-400">Free</div>
                      ) : (
                        <>
                          <div className="text-lg font-black text-white">
                            {skill.price.amount} <span className="text-xs text-gray-500">sats</span>
                          </div>
                          <div className="text-[10px] text-gray-600">{skill.price.usdEquivalent}</div>
                        </>
                      )}
                    </div>
                    <div className={`w-6 h-6 flex items-center justify-center text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-white/5 p-5 space-y-4">
                    <p className="text-sm text-gray-300">{skill.description}</p>

                    {/* Endpoint */}
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Endpoint</div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-black/60 border border-white/10 rounded px-3 py-2 text-sm font-mono text-red-400">
                          {skill.method} {manifest?.provider.url}{skill.endpoint}
                        </code>
                        <button
                          onClick={() => copy(`${manifest?.provider.url}${skill.endpoint}`, `ep-${skill.id}`)}
                          className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded text-xs font-bold text-gray-400 transition-colors"
                        >
                          {copiedText === `ep-${skill.id}` ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    {/* x402 pricing */}
                    {!isFree && (
                      <div className="bg-emerald-900/10 border border-emerald-500/10 rounded-lg p-3">
                        <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">x402 Payment</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-gray-500">Amount:</span>{' '}
                            <span className="text-white font-mono font-bold">{skill.price.amount} sats</span>
                          </div>
                          <div>
                            <span className="text-gray-500">USD:</span>{' '}
                            <span className="text-emerald-400 font-mono">{skill.price.usdEquivalent}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Network:</span>{' '}
                            <span className="text-white font-mono">{skill.price.network.toUpperCase()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Scheme:</span>{' '}
                            <span className="text-white font-mono">exact</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Parameters */}
                    {skill.params.length > 0 && (
                      <div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Parameters</div>
                        <div className="bg-black/60 border border-white/10 rounded overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-white/5">
                                <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-600 uppercase">Name</th>
                                <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-600 uppercase">Type</th>
                                <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-600 uppercase hidden sm:table-cell">Required</th>
                                <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-600 uppercase">Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {skill.params.map(p => (
                                <tr key={p.name} className="border-b border-white/5 last:border-0">
                                  <td className="px-3 py-2 font-mono text-red-400 text-xs">{p.name}</td>
                                  <td className="px-3 py-2 text-gray-500 text-xs">{p.type}</td>
                                  <td className="px-3 py-2 text-xs hidden sm:table-cell">{p.required ? <span className="text-yellow-400">yes</span> : <span className="text-gray-600">no</span>}</td>
                                  <td className="px-3 py-2 text-gray-400 text-xs">
                                    {p.description}
                                    {p.default !== undefined && <span className="text-gray-600 ml-1">(default: {String(p.default)})</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Example */}
                    {skill.example && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Example</div>
                          <button
                            onClick={() => copy(skill.example!, `ex-${skill.id}`)}
                            className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
                          >
                            {copiedText === `ex-${skill.id}` ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <pre className="bg-black/60 border border-white/10 rounded px-3 py-2 text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">
                          {skill.example}
                        </pre>
                      </div>
                    )}

                    {/* Rate limit + tags */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {skill.rateLimit && (
                        <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded font-mono border border-white/5">
                          Rate: {skill.rateLimit}
                        </span>
                      )}
                      {skill.tags.map(tag => (
                        <span key={tag} className="text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded font-mono">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Try it */}
                    <div className="flex gap-2 pt-2 border-t border-white/5">
                      {linkHref ? (
                        <Link
                          href={linkHref}
                          className="flex-1 py-2 px-4 rounded-lg font-bold text-sm text-center bg-red-600 hover:bg-red-700 text-white transition-all"
                        >
                          Open {skill.name}
                        </Link>
                      ) : (
                        <button className="flex-1 py-2 px-4 rounded-lg font-bold text-sm bg-white/10 text-white transition-all cursor-default">
                          API Only
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Revenue Split */}
        {manifest && (
          <div className="mt-12 bg-black/40 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-black text-white uppercase tracking-wider mb-4 font-[family-name:var(--font-brand)]">
              Revenue Split — Every Micropayment
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Every satoshi paid to an NPGX skill is split automatically across the token hierarchy.
              Content creators, character investors, and platform holders all earn from every API call.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Object.entries(manifest.revenueSplit).map(([key, pct]) => {
                const labels: Record<string, { label: string; color: string }> = {
                  contentToken: { label: 'Content', color: 'text-pink-400' },
                  characterToken: { label: 'Character', color: 'text-purple-400' },
                  npgxToken: { label: '$NPGX', color: 'text-red-400' },
                  npgToken: { label: '$NPG', color: 'text-amber-400' },
                  boaseToken: { label: '$BOASE', color: 'text-blue-400' },
                }
                const l = labels[key] || { label: key, color: 'text-gray-400' }
                return (
                  <div key={key} className="bg-black/40 border border-white/5 rounded-lg p-3 text-center">
                    <div className={`text-xl font-black ${l.color}`}>{((pct as number) * 100).toFixed(1)}%</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">{l.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-12 text-center bg-gradient-to-r from-red-900/20 via-purple-900/20 to-red-900/20 border border-red-500/10 rounded-2xl p-10">
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider mb-3 font-[family-name:var(--font-brand)]">
            Build With NPGX
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-6">
            These tools are designed for both humans and AI agents.
            The x402 protocol means any agent with a BSV wallet can discover and pay for NPGX skills autonomously.
            No API keys. No subscriptions. Just micropayments.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://x402agency.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm uppercase tracking-wider rounded-lg transition-all"
            >
              x402 Agent Directory
            </a>
            <a
              href="https://path402.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase tracking-wider rounded-lg transition-all"
            >
              Get $402 Tokens
            </a>
            <Link
              href="/agent"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-sm uppercase tracking-wider rounded-lg transition-all"
            >
              Agent Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
