'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FaCube, FaMicrochip, FaNetworkWired, FaWallet, FaPlay, FaPause,
  FaServer, FaBolt, FaShieldAlt, FaExchangeAlt, FaClock, FaChartLine,
  FaPaperPlane, FaRobot, FaUser, FaCircle, FaSignInAlt, FaSignOutAlt,
  FaLink, FaFingerprint,
} from 'react-icons/fa'
import {
  connectWallet, disconnectWallet,
  type WalletStatus,
} from '@/lib/brc100-wallet'
import {
  resolveIdentityByAddress,
  type X401Identity as Identity401,
} from '@/lib/x401-client'

// ── Types ────────────────────────────────────────────────────────────────────

interface MiningStatus {
  mining: boolean
  blocksMined: number
  hashRate: number
  difficulty: number
  lastBlockTime?: string
}

interface NodeStatus {
  version: string
  uptime: number
  peerCount: number
  mining?: MiningStatus
  wallet?: { balance: number; address: string }
  headers?: { height: number; synced: boolean }
  tokens?: { count: number }
}

interface Block {
  hash: string
  height: number
  timestamp: string
  miner: string
  contentCount: number
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  toolsUsed?: boolean
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`
}

// ── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_DAEMON_URL = 'http://127.0.0.1:8402'

function getDaemonUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_DAEMON_URL
  return localStorage.getItem('npgx_daemon_url') || DEFAULT_DAEMON_URL
}

// ── API helpers ──────────────────────────────────────────────────────────────

async function daemonGet(path: string, baseUrl?: string): Promise<any> {
  const url = baseUrl || getDaemonUrl()
  const res = await fetch(`${url}${path}`, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

async function daemonPost(path: string): Promise<any> {
  const url = getDaemonUrl()
  const res = await fetch(`${url}${path}`, { method: 'POST', signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

// ── Formatters ───────────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatHash(hash: string): string {
  if (!hash) return '—'
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`
}

function timeAgo(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, color = 'text-red-500', pulse = false,
}: {
  icon: any; label: string; value: string | number; sub?: string
  color?: string; pulse?: boolean
}) {
  return (
    <div className="bg-black/40 border border-white/10 rounded-xl p-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3 h-3 ${color} ${pulse ? 'animate-pulse' : ''}`} />
        <span className="text-gray-500 text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-lg font-black text-white" style={{ fontFamily: 'var(--font-brand)' }}>
        {value}
      </div>
      {sub && <div className="text-gray-600 text-[10px] mt-0.5">{sub}</div>}
    </div>
  )
}

// ── Chat Panel ───────────────────────────────────────────────────────────────

function ChatPanel({ daemonUrl, userHandle }: { daemonUrl: string; userHandle: string | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      // Build message history for context (last 20 messages)
      const history = [...messages, userMsg]
        .slice(-20)
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, daemonUrl, userHandle }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${data.error || 'Request failed'}`,
          timestamp: Date.now(),
        }])
        return
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || 'No response',
        timestamp: Date.now(),
        toolsUsed: data.toolsUsed,
      }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Connection error: ${e instanceof Error ? e.message : 'Unknown error'}`,
        timestamp: Date.now(),
      }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-black/40 border border-white/10 rounded-2xl backdrop-blur-sm flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
          <FaRobot className="w-4 h-4 text-red-500" />
        </div>
        <div>
          <div className="text-white text-sm font-bold" style={{ fontFamily: 'var(--font-brand)' }}>
            OPENCLAW
          </div>
          <div className="text-gray-600 text-[10px]">mine &middot; trade &middot; create</div>
        </div>
        {sending && (
          <div className="ml-auto flex items-center gap-1.5">
            <FaCircle className="w-1.5 h-1.5 text-red-500 animate-pulse" />
            <span className="text-gray-600 text-[10px]">thinking</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <FaRobot className="w-10 h-10 text-gray-800 mx-auto mb-3" />
            <p className="text-gray-600 text-sm mb-2">OpenClaw Agent</p>
            <p className="text-gray-700 text-xs max-w-xs mx-auto">
              I can mine $402, trade tokens, and generate NPGX content.
              Try &ldquo;what&apos;s my status?&rdquo; or &ldquo;generate an image of CherryX&rdquo;
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FaRobot className="w-3 h-3 text-red-500" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-red-600/20 border border-red-500/20 text-white'
                  : 'bg-white/5 border border-white/5 text-gray-300'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              {msg.toolsUsed && (
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-600">
                  <FaBolt className="w-2 h-2" /> used tools
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FaUser className="w-3 h-3 text-gray-500" />
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FaRobot className="w-3 h-3 text-red-500 animate-pulse" />
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl px-3.5 py-2.5">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/5">
        <form
          onSubmit={(e) => { e.preventDefault(); send() }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask OpenClaw anything..."
            disabled={sending}
            className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:border-red-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors"
          >
            <FaPaperPlane className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AgentDashboard() {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(true)
  const [status, setStatus] = useState<NodeStatus | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [daemonUrl, setDaemonUrl] = useState(DEFAULT_DAEMON_URL)
  const [editingUrl, setEditingUrl] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [view, setView] = useState<'dashboard' | 'chat'>('chat')
  const [userHandle, setUserHandle] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)
  const [brc100, setBrc100] = useState<WalletStatus>({ connected: false, provider: null, address: null, publicKey: null })
  const [identity, setIdentity] = useState<Identity401 | null>(null)
  const [connectingWallet, setConnectingWallet] = useState(false)

  const poll = useCallback(async () => {
    try {
      const [s, b] = await Promise.all([
        daemonGet('/status'),
        daemonGet('/api/blocks?limit=10').catch(() => ({ blocks: [] })),
      ])
      setStatus(s)
      setBlocks(b.blocks || b || [])
      setConnected(true)
    } catch {
      setConnected(false)
      setStatus(null)
    } finally {
      setConnecting(false)
    }
  }, [])

  useEffect(() => {
    setDaemonUrl(getDaemonUrl())
    setUserHandle(getCookie('npgx_user_handle'))
    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [poll])

  const handleSignIn = async () => {
    setSigningIn(true)
    try {
      const res = await fetch('/api/auth/handcash/login?returnTo=/agent')
      const data = await res.json()
      if (data.redirectUrl) window.location.href = data.redirectUrl
    } catch {
      window.location.href = '/api/auth/handcash?returnTo=/agent'
    }
  }

  const handleSignOut = () => {
    clearCookie('npgx_user_handle')
    clearCookie('npgx_handcash_token')
    clearCookie('npgx_paid')
    setUserHandle(null)
  }

  const handleBrc100Connect = async () => {
    setConnectingWallet(true)
    try {
      const status = await connectWallet()
      setBrc100(status)
      if (status.connected && status.address) {
        // Resolve $401 identity via x401 node (path401.com)
        const id = await resolveIdentityByAddress(status.address)
        setIdentity(id)
      }
    } catch { /* ignore */ }
    setConnectingWallet(false)
  }

  const handleBrc100Disconnect = () => {
    disconnectWallet()
    setBrc100({ connected: false, provider: null, address: null, publicKey: null })
    setIdentity(null)
  }

  // Derive effective user identity for the agent
  const effectiveHandle = userHandle
    || (identity?.strands?.[0]?.handle)
    || (brc100.address ? `${brc100.address.slice(0, 8)}...` : null)
  const authMethod = userHandle ? 'handcash' : brc100.connected ? 'brc100' : null

  const toggleMining = async () => {
    if (!status) return
    try {
      if (status.mining?.mining) {
        await daemonPost('/api/mining/stop')
      } else {
        await daemonPost('/api/mining/start')
      }
      setTimeout(poll, 500)
    } catch { /* ignore */ }
  }

  const saveUrl = () => {
    localStorage.setItem('npgx_daemon_url', urlInput)
    setDaemonUrl(urlInput)
    setEditingUrl(false)
    setConnecting(true)
    poll()
  }

  const mining = status?.mining
  const wallet = status?.wallet
  const isMining = mining?.mining ?? false

  return (
    <div className="min-h-screen pt-20 pb-4 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1
              className="text-4xl sm:text-5xl font-black text-white tracking-tight"
              style={{ fontFamily: 'var(--font-brand)' }}
            >
              OPEN<span className="text-red-500">CLAW</span>
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              mine &middot; trade &middot; create
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex bg-black/40 border border-white/10 rounded-lg overflow-hidden">
              <button
                onClick={() => setView('chat')}
                className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                  view === 'chat' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                AGENT
              </button>
              <button
                onClick={() => setView('dashboard')}
                className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                  view === 'dashboard' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                DASHBOARD
              </button>
            </div>

            {/* Connection */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : connecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
              <button
                onClick={() => { setUrlInput(daemonUrl); setEditingUrl(!editingUrl) }}
                className="text-gray-600 hover:text-gray-400 text-xs font-mono transition-colors"
              >
                {daemonUrl.replace('http://', '')}
              </button>
            </div>
          </div>
        </div>

        {/* URL editor */}
        {editingUrl && (
          <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-6 flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="http://192.168.1.100:8402"
              className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-red-500 focus:outline-none"
            />
            <button onClick={saveUrl} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors">
              Connect
            </button>
          </div>
        )}

        {/* ── Chat View ─────────────────────────────────────────── */}
        {view === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: 'calc(100vh - 160px)' }}>
            {/* Chat — takes 2/3 */}
            <div className="lg:col-span-2 min-h-0">
              <ChatPanel daemonUrl={daemonUrl} userHandle={effectiveHandle} />
            </div>

            {/* Side panel — status summary */}
            <div className="space-y-4 overflow-y-auto">
              {/* User identity */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                {authMethod ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          authMethod === 'brc100' ? 'bg-purple-500/10' : 'bg-green-500/10'
                        }`}>
                          {authMethod === 'brc100'
                            ? <FaFingerprint className="w-3.5 h-3.5 text-purple-400" />
                            : <FaUser className="w-3.5 h-3.5 text-green-400" />
                          }
                        </div>
                        <div>
                          <div className="text-white text-sm font-bold truncate max-w-[140px]" style={{ fontFamily: 'var(--font-brand)' }}>
                            {userHandle ? `$${userHandle}` : effectiveHandle}
                          </div>
                          <div className="text-gray-600 text-[10px]">
                            {authMethod === 'brc100'
                              ? `${brc100.provider === 'metanet' ? 'MetaNet' : 'Yours'} — BRC-100`
                              : 'HandCash'
                            }
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={authMethod === 'brc100' ? handleBrc100Disconnect : handleSignOut}
                        className="text-gray-600 hover:text-red-400 transition-colors"
                        title="Disconnect"
                      >
                        <FaSignOutAlt className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* $401 Identity strands */}
                    {identity && identity.strands.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1.5">
                          $401 Identity (Strength {identity.strength}/4)
                        </div>
                        <div className="space-y-1">
                          {identity.strands.map((s, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs">
                              <FaLink className="w-2.5 h-2.5 text-green-500" />
                              <span className="text-gray-400">{s.provider}</span>
                              <span className="text-white font-mono truncate">{s.handle}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={handleBrc100Connect}
                      disabled={connectingWallet}
                      className="w-full flex items-center justify-center gap-2.5 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-gray-800 text-white font-bold text-sm transition-colors"
                      style={{ fontFamily: 'var(--font-brand)' }}
                    >
                      <FaFingerprint className="w-3.5 h-3.5" />
                      {connectingWallet ? 'CONNECTING...' : 'CONNECT WALLET (BRC-100)'}
                    </button>
                    <button
                      onClick={handleSignIn}
                      disabled={signingIn}
                      className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white font-bold text-xs transition-colors"
                      style={{ fontFamily: 'var(--font-brand)' }}
                    >
                      <FaSignInAlt className="w-3 h-3" />
                      {signingIn ? 'REDIRECTING...' : 'HANDCASH'}
                    </button>
                  </div>
                )}
              </div>

              {/* Connection card */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-brand)' }}>
                    {connected ? 'DAEMON ONLINE' : 'DAEMON OFFLINE'}
                  </span>
                </div>
                {connected && status && (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-gray-500">Mining</span><span className={isMining ? 'text-green-400' : 'text-gray-600'}>{isMining ? 'ACTIVE' : 'IDLE'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Blocks</span><span className="text-white">{mining?.blocksMined ?? 0}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Hash Rate</span><span className="text-cyan-400">{mining?.hashRate?.toFixed(1) ?? 0} H/s</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Peers</span><span className="text-white">{status.peerCount ?? 0}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Balance</span><span className="text-green-400">{wallet?.balance ?? '—'} sat</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Uptime</span><span className="text-white">{formatUptime(status.uptime || 0)}</span></div>
                  </div>
                )}
                {!connected && !connecting && (
                  <p className="text-gray-600 text-xs">Start your ClawMiner daemon or set the URL above.</p>
                )}
              </div>

              {/* Protocol badges */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">Protocols</div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-black" style={{ fontFamily: 'var(--font-brand)' }}>$401</span>
                  <span className="px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-black" style={{ fontFamily: 'var(--font-brand)' }}>$402</span>
                  <span className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black" style={{ fontFamily: 'var(--font-brand)' }}>$403</span>
                </div>
              </div>

              {/* Quick actions */}
              {connected && (
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-3">Quick Actions</div>
                  <button
                    onClick={toggleMining}
                    className={`w-full py-3 rounded-lg font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      isMining
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                    style={{ fontFamily: 'var(--font-brand)' }}
                  >
                    {isMining ? <FaPause className="w-3 h-3" /> : <FaPlay className="w-3 h-3" />}
                    {isMining ? 'STOP MINING' : 'START MINING'}
                  </button>
                </div>
              )}

              {/* Recent blocks mini */}
              {connected && blocks.length > 0 && (
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">Recent Blocks</div>
                  <div className="space-y-1.5">
                    {blocks.slice(0, 5).map((block, i) => (
                      <div key={block.hash || i} className="flex justify-between text-xs">
                        <span className="text-gray-400 font-mono">{formatHash(block.hash)}</span>
                        <span className="text-gray-600">#{block.height}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Dashboard View ────────────────────────────────────── */}
        {view === 'dashboard' && (
          <>
            {/* Not connected state */}
            {!connected && !connecting && (
              <div className="bg-black/40 border border-red-500/20 rounded-2xl p-12 text-center mb-8">
                <FaServer className="w-12 h-12 text-red-500/30 mx-auto mb-4" />
                <h2 className="text-xl font-black text-white mb-2" style={{ fontFamily: 'var(--font-brand)' }}>
                  NO DAEMON DETECTED
                </h2>
                <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
                  Start your ClawMiner daemon or enter its URL. The agent needs a running
                  node to mine $402 tokens and participate in the network.
                </p>
                <code className="block bg-black/60 border border-white/10 rounded-lg p-4 text-green-400 font-mono text-sm max-w-lg mx-auto text-left">
                  <span className="text-gray-600"># Start the daemon</span><br/>
                  ./clawminerd<br/>
                  <br/>
                  <span className="text-gray-600"># Or with custom port</span><br/>
                  ./clawminerd --api-addr 0.0.0.0:8402
                </code>
              </div>
            )}

            {/* Connected dashboard */}
            {connected && status && (
              <>
                {/* Protocol badges */}
                <div className="flex items-center gap-2 mb-6 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-black" style={{ fontFamily: 'var(--font-brand)' }}>$401</span>
                  <span className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-black" style={{ fontFamily: 'var(--font-brand)' }}>$402</span>
                  <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black" style={{ fontFamily: 'var(--font-brand)' }}>$403</span>
                  <span className="text-gray-600 text-xs ml-2">v{status.version}</span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                  <StatCard icon={FaCube} label="Blocks Mined" value={mining?.blocksMined ?? 0} color="text-yellow-500" />
                  <StatCard icon={FaMicrochip} label="Hash Rate" value={mining?.hashRate ? `${mining.hashRate.toFixed(1)}` : '0'} sub="H/s" color="text-cyan-500" pulse={isMining} />
                  <StatCard icon={FaChartLine} label="Difficulty" value={mining?.difficulty ?? 0} color="text-purple-500" />
                  <StatCard icon={FaNetworkWired} label="Peers" value={status.peerCount ?? 0} color="text-blue-500" />
                  <StatCard icon={FaWallet} label="Balance" value={wallet?.balance != null ? `${wallet.balance}` : '—'} sub="satoshis" color="text-green-500" />
                  <StatCard icon={FaClock} label="Uptime" value={formatUptime(status.uptime || 0)} color="text-orange-500" />
                </div>

                {/* Mining control + Node info */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  {/* Mining control */}
                  <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-sm lg:col-span-1">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Mining Control</h3>
                    <button
                      onClick={toggleMining}
                      className={`w-full py-5 rounded-xl font-black text-xl uppercase tracking-wider transition-all flex items-center justify-center gap-3 ${
                        isMining
                          ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20'
                          : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20'
                      }`}
                      style={{ fontFamily: 'var(--font-brand)' }}
                    >
                      {isMining ? <FaPause className="w-5 h-5" /> : <FaPlay className="w-5 h-5" />}
                      {isMining ? 'STOP MINING' : 'START MINING'}
                    </button>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Status</span>
                        <span className={isMining ? 'text-green-400 font-bold' : 'text-gray-600'}>{isMining ? 'ACTIVE' : 'IDLE'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Protocol</span>
                        <span className="text-yellow-400 font-mono">$402 PoI</span>
                      </div>
                      {mining?.lastBlockTime && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Last Block</span>
                          <span className="text-gray-400">{timeAgo(mining.lastBlockTime)}</span>
                        </div>
                      )}
                    </div>
                    {isMining && (
                      <div className="mt-4 h-1 bg-black/40 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full animate-[mining-pulse_2s_ease-in-out_infinite]" />
                      </div>
                    )}
                    <style>{`
                      @keyframes mining-pulse {
                        0%, 100% { width: 20%; opacity: 0.5; }
                        50% { width: 100%; opacity: 1; }
                      }
                    `}</style>
                  </div>

                  {/* Node info */}
                  <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-sm lg:col-span-2">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Node Info</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <FaShieldAlt className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-gray-500 text-sm">Identity</span>
                        </div>
                        <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                          <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">$401 Passport</div>
                          <div className="text-white text-sm font-mono truncate">{wallet?.address ? formatHash(wallet.address) : 'Not connected'}</div>
                        </div>
                        <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                          <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Tokens Indexed</div>
                          <div className="text-white text-sm font-bold">{status.tokens?.count ?? 0}</div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <FaBolt className="w-3.5 h-3.5 text-yellow-500" />
                          <span className="text-gray-500 text-sm">Network</span>
                        </div>
                        <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                          <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Block Height</div>
                          <div className="text-white text-sm font-bold">{status.headers?.height?.toLocaleString() ?? '—'}</div>
                        </div>
                        <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                          <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Sync Status</div>
                          <div className={`text-sm font-bold ${status.headers?.synced ? 'text-green-400' : 'text-yellow-400'}`}>
                            {status.headers?.synced ? 'Synced' : 'Syncing...'}
                          </div>
                        </div>
                      </div>
                    </div>
                    {wallet?.address && (
                      <div className="mt-4 bg-black/40 rounded-lg p-3 border border-white/5">
                        <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Wallet Address</div>
                        <div className="text-white text-xs font-mono break-all">{wallet.address}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent blocks */}
                <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Recent Blocks</h3>
                    <FaExchangeAlt className="w-3.5 h-3.5 text-gray-600" />
                  </div>
                  {blocks.length === 0 ? (
                    <div className="text-center py-12">
                      <FaCube className="w-8 h-8 text-gray-800 mx-auto mb-3" />
                      <p className="text-gray-600 text-sm">No blocks yet — start mining to create PoI blocks</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {blocks.map((block, i) => (
                        <div
                          key={block.hash || i}
                          className="flex items-center justify-between bg-black/30 border border-white/5 rounded-lg px-4 py-3 hover:border-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                              <FaCube className="w-3.5 h-3.5 text-yellow-500" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-white text-sm font-mono truncate">{formatHash(block.hash)}</div>
                              <div className="text-gray-600 text-xs">{block.contentCount ?? 0} items indexed</div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <div className="text-gray-400 text-sm font-mono">#{block.height}</div>
                            {block.timestamp && <div className="text-gray-600 text-xs">{timeAgo(block.timestamp)}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}
