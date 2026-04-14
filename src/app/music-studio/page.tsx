'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { NPGX_ROSTER } from '@/lib/npgx-roster'
import { useWallet } from '@/hooks/useWallet'

const StemPlayer = dynamic(() => import('@/components/music/StemPlayer'), { ssr: false })
const SheetMusic = dynamic(() => import('@/components/music/SheetMusic'), { ssr: false })

interface GenerationState {
  status: 'idle' | 'composing' | 'processing' | 'done' | 'error'
  requestId?: string; provider?: string; model?: string; audioUrl?: string; error?: string; cost?: number; progress: number
}

interface ComposedTrack {
  id: string; title: string; prompt: string; audioUrl: string; provider: string; model: string; cost: number; character?: string; createdAt: string
}

interface PipelineState {
  status: 'idle' | 'separating' | 'transcribing' | 'done' | 'error'
  stems?: { vocals?: string; drums?: string; bass?: string; other?: string }
  midi?: Record<string, string>
  error?: string
  cost: number
}


const PRESETS = [
  { label: 'Punk Rock', prompt: 'punk rock, fast drums, distorted power chords, screaming female vocals, raw garage energy, lo-fi production, rebellious, angry, 175 BPM' },
  { label: 'Cyberpunk', prompt: 'industrial rock, distorted synths, 808 sub bass, glitchy electronics, dark female vocalist, cyberpunk, aggressive, futuristic, gritty, 135 BPM' },
  { label: 'J-Pop Punk', prompt: 'j-pop punk, kawaii metal, fast blast beats, cute female vocals alternating with screams, distorted guitar, chaotic, bubblegum meets hardcore, 170 BPM' },
  { label: 'Dark Techno', prompt: 'dark techno, minimal, pulsing kick drum, industrial percussion, cold reverbed synths, underground club, hypnotic, relentless, 128 BPM' },
  { label: 'Power Metal', prompt: 'power metal, soaring guitar solo, double bass drums, epic female power vocals, orchestral backing, triumphant chorus, anthemic, heroic, 155 BPM' },
  { label: 'Bass Music', prompt: 'dubstep, heavy sub bass, massive wobble drops, female MC, dark rave, filthy bass drops, speaker-shaking, aggressive, 140 BPM' },
  { label: 'Trip Hop', prompt: 'trip hop, deep bass, minimal breakbeat, atmospheric pads, whispered female vocals, dark, moody, noir cinematics, 90 BPM' },
  { label: 'Synthwave', prompt: 'synthwave, retro 80s, analog arpeggiated synths, warm pads, driving bassline, outrun, neon city at night, cinematic, 118 BPM' },
  { label: 'Gothic Metal', prompt: 'gothic metal, heavy guitar riffs, pipe organ, operatic female vocals, dark choir, dramatic orchestral, epic, haunting, 120 BPM' },
  { label: 'Hardcore', prompt: 'hardcore punk, blast beats, thrash guitar, screaming vocals, maximum aggression, breakneck speed, chaotic, noise, raw, 190 BPM' },
]

function Waveform({ audioUrl }: { audioUrl: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current || !audioUrl) return
    let ws: any = null
    import('wavesurfer.js').then((WS) => {
      if (!ref.current) return
      ws = WS.default.create({ container: ref.current, waveColor: '#dc2626', progressColor: '#ef4444', cursorColor: '#f87171', barWidth: 2, barGap: 1, barRadius: 2, height: 56, normalize: true })
      ws.load(audioUrl)
    })
    return () => { ws?.destroy() }
  }, [audioUrl])
  return <div ref={ref} className="w-full" />
}

// Token costs — circular economy ($402 tickets)
const TICKET_COST_COMPOSE = 10    // tokens per composition
const TICKET_COST_PIPELINE = 5    // tokens per stem separation + MIDI

export default function MusicStudioPage() {
  const [gen, setGen] = useState<GenerationState>({ status: 'idle', progress: 0 })
  const [tracks, setTracks] = useState<ComposedTrack[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(120)
  const [instrumental, setInstrumental] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null)
  const [pipeline, setPipeline] = useState<PipelineState>({ status: 'idle', cost: 0 })
  const [sheetMusicXml, setSheetMusicXml] = useState<string | null>(null)
  const [sheetLoading, setSheetLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'compose' | 'stems' | 'sheet'>('compose')
  const [tokenBalance, setTokenBalance] = useState<number | null>(null)
  const [attestingTrack, setAttestingTrack] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { wallet, identity, connecting, connect, disconnect, attestContent } = useWallet()
  const character = NPGX_ROSTER.find(c => c.slug === selectedCharacter)

  // Fetch token balance when wallet connects or character changes
  useEffect(() => {
    if (!wallet.connected || !wallet.address || !character) {
      setTokenBalance(null)
      return
    }
    // Query balance for this character's token
    fetch(`/api/tokens/balance?address=${wallet.address}&token=${encodeURIComponent(character.token)}`)
      .then(r => r.json())
      .then(d => setTokenBalance(d.balance ?? 0))
      .catch(() => setTokenBalance(null))
  }, [wallet.connected, wallet.address, character])

  // Run the full pipeline: separate → transcribe
  const runPipeline = useCallback(async (audioUrl: string) => {
    setPipeline({ status: 'separating', cost: 0 })
    setActiveTab('stems')
    try {
      // Step 1: Separate stems
      const sepRes = await fetch('/api/music/separate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl }),
      })
      const sepData = await sepRes.json()
      if (!sepData.success) throw new Error(sepData.error || 'Separation failed')

      setPipeline({ status: 'transcribing', stems: sepData.stems, cost: sepData.cost || 0.022 })

      // Step 2: Transcribe each melodic stem to MIDI
      const midi: Record<string, string> = {}
      for (const stem of ['vocals', 'bass', 'other'] as const) {
        const stemUrl = sepData.stems[stem]
        if (!stemUrl) continue
        try {
          const trRes = await fetch('/api/music/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioUrl: stemUrl, stem }),
          })
          const trData = await trRes.json()
          if (trData.success && trData.midiUrl) {
            midi[stem] = trData.midiUrl
          }
        } catch (err) {
          console.warn(`[Pipeline] Failed to transcribe ${stem}:`, err)
        }
      }

      const totalCost = (sepData.cost || 0.022) + Object.keys(midi).length * 0.0024
      setPipeline({ status: 'done', stems: sepData.stems, midi, cost: totalCost })
    } catch (err) {
      setPipeline({ status: 'error', error: err instanceof Error ? err.message : 'Pipeline failed', cost: 0 })
    }
  }, [])

  const compose = useCallback(async () => {
    if (!prompt.trim() && !selectedCharacter) return
    setGen({ status: 'composing', progress: 5 })
    try {
      const body: Record<string, any> = { duration, instrumental }
      if (selectedCharacter && character) {
        body.character = character
      }
      if (prompt.trim()) {
        body.prompt = prompt
      }
      const res = await fetch('/api/generate-song', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!data.success) { setGen({ status: 'error', progress: 0, error: data.error || data.message }); return }
      const song = data.song
      if (song.status === 'lyrics-only') { setGen({ status: 'error', progress: 0, error: data.message || 'No music API configured' }); return }
      setGen({ status: 'processing', requestId: song.requestId, provider: song.provider, model: song.model, cost: song.cost, progress: 15 })
      let prog = 15
      pollRef.current = setInterval(async () => {
        prog = Math.min(prog + 3, 90)
        try {
          const r = await fetch(`/api/generate-song?id=${song.requestId}&provider=${song.provider}`)
          const p = await r.json()
          if (p.status === 'done' && p.audioUrl) {
            if (pollRef.current) clearInterval(pollRef.current)
            setGen({ status: 'done', audioUrl: p.audioUrl, provider: song.provider, model: song.model, cost: song.cost, progress: 100 })
            setTracks(prev => [{ id: `${Date.now()}`, title: prompt.trim() || `${character?.name || 'NPGX'} Theme`, prompt: prompt || song.title, audioUrl: p.audioUrl, provider: song.provider, model: song.model, cost: song.cost || 0, character: character?.name, createdAt: new Date().toISOString() }, ...prev])
          } else if (p.status === 'error') {
            if (pollRef.current) clearInterval(pollRef.current)
            setGen({ status: 'error', progress: 0, error: p.error })
          } else {
            setGen(prev => ({ ...prev, progress: prog }))
          }
        } catch {}
      }, 3000)
    } catch (err) { setGen({ status: 'error', progress: 0, error: err instanceof Error ? err.message : 'Failed' }) }
  }, [prompt, duration, instrumental, selectedCharacter, character])

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const togglePlay = (t: ComposedTrack) => {
    if (playingId === t.id) { audioRef.current?.pause(); setPlayingId(null) }
    else { audioRef.current?.pause(); const a = new Audio(t.audioUrl); a.play(); a.onended = () => setPlayingId(null); audioRef.current = a; setPlayingId(t.id) }
  }

  return (
    <div className="min-h-screen bg-black pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter" style={{ fontFamily: 'var(--font-brand)' }}>
            MUSIC <span className="text-red-500">STUDIO</span>
          </h1>
          <p className="text-gray-600 text-sm mt-1 font-mono">AI music generation for NPGX characters / WaveSpeed ACE-Step</p>
        </div>

        {/* Wallet Bar */}
        <div className="mb-6 flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
          {wallet.connected ? (
            <>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white font-mono truncate">{wallet.address}</p>
                <div className="flex items-center gap-2">
                  {identity && (
                    <span className="text-[10px] text-purple-400 font-mono">$401 ID: {identity.handle || `strength ${identity.strength}`}</span>
                  )}
                  {character && tokenBalance !== null && (
                    <span className="text-[10px] font-mono text-red-400">
                      {tokenBalance.toLocaleString()} {character.token}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={disconnect} className="text-[10px] text-gray-600 hover:text-white font-mono">
                Disconnect
              </button>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-gray-600" />
              <p className="flex-1 text-xs text-gray-600 font-mono">Connect wallet for on-chain attestation + token gating</p>
              <button
                onClick={connect}
                disabled={connecting}
                className="text-xs font-mono font-bold text-red-400 hover:text-red-300 disabled:text-gray-700"
              >
                {connecting ? 'Connecting...' : 'Connect'}
              </button>
            </>
          )}
        </div>

        {/* Character Selector */}
        <div className="mb-6">
          <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-2">Character Theme (optional)</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCharacter(null)}
              className={`shrink-0 px-3 py-1.5 text-xs rounded-lg border transition-all ${
                !selectedCharacter ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'border-white/10 text-gray-600 hover:text-white'
              }`}
            >
              Custom
            </button>
            {NPGX_ROSTER.map(c => (
              <button
                key={c.slug}
                onClick={() => setSelectedCharacter(c.slug)}
                className={`shrink-0 relative w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                  selectedCharacter === c.slug
                    ? 'border-red-500 ring-2 ring-red-500/30'
                    : 'border-white/10 hover:border-white/30'
                }`}
                title={c.name}
              >
                <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[6px] font-mono text-center text-white leading-tight">
                  {c.letter}
                </span>
              </button>
            ))}
          </div>
          {character && (
            <p className="text-xs text-red-400/70 mt-1.5 font-mono">
              Generating themed music for {character.name} ({character.category || 'Unknown'})
            </p>
          )}
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2 mb-6">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => setPrompt(p.prompt)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                prompt === p.prompt ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'border-white/10 text-gray-600 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Compose Form */}
        <div className="bg-white/[0.03] rounded-xl border border-white/10 p-5 space-y-4 mb-8">
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={selectedCharacter ? `Describe the sound for ${character?.name}... (or leave blank for auto-themed)` : 'Describe the punk sound...'}
            rows={3}
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-red-500/50 resize-none font-mono"
          />
          <div className="flex items-center gap-6">
            <select
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value={30}>30s</option>
              <option value={60}>1 min</option>
              <option value={120}>2 min</option>
              <option value={180}>3 min</option>
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={instrumental} onChange={e => setInstrumental(e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-700 rounded-full peer-checked:bg-red-600 relative">
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${instrumental ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-gray-500">Instrumental</span>
            </label>
          </div>
          <button
            onClick={compose}
            disabled={(!prompt.trim() && !selectedCharacter) || gen.status === 'composing' || gen.status === 'processing'}
            className={`w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
              gen.status === 'composing' || gen.status === 'processing'
                ? 'bg-white/5 text-gray-600'
                : 'bg-red-600 hover:bg-red-500 text-white cursor-pointer disabled:bg-white/5 disabled:text-gray-700'
            }`}
          >
            {gen.status === 'composing' ? 'Starting...' :
             gen.status === 'processing' ? `Composing... ${gen.progress}%` :
             gen.status === 'done' ? 'Compose Again' : 'Compose'}
          </button>
          {wallet.connected && character && (
            <p className="text-[10px] text-gray-600 font-mono text-center">
              Costs {TICKET_COST_COMPOSE} {character.token} tickets — tokens return to issuer after redemption
            </p>
          )}
          {(gen.status === 'composing' || gen.status === 'processing') && (
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-500" style={{ width: `${gen.progress}%` }} />
            </div>
          )}
          {gen.status === 'error' && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{gen.error}</p>
          )}
        </div>

        {/* New Track Result */}
        {gen.status === 'done' && gen.audioUrl && (
          <div className="bg-white/[0.03] rounded-xl border border-red-500/20 p-5 space-y-4 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">New Track</p>
                {gen.provider && <p className="text-[10px] text-gray-600 font-mono">{gen.provider} / {gen.model} / ${gen.cost?.toFixed(3)}</p>}
              </div>
              <button
                onClick={() => { audioRef.current?.pause(); const a = new Audio(gen.audioUrl!); a.play(); audioRef.current = a }}
                className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </button>
            </div>
            <Waveform audioUrl={gen.audioUrl} />
            <div className="flex items-center gap-3 flex-wrap">
              <a href={gen.audioUrl} download="npgx-track.mp3" className="text-xs text-red-500/70 hover:text-red-400 font-mono">
                Download MP3
              </a>
              <button
                onClick={() => runPipeline(gen.audioUrl!)}
                disabled={pipeline.status === 'separating' || pipeline.status === 'transcribing'}
                className="text-xs font-mono font-bold text-white bg-red-600 hover:bg-red-500 disabled:bg-white/10 disabled:text-gray-600 px-3 py-1.5 rounded-lg transition-all"
              >
                {pipeline.status === 'separating' ? 'Separating stems...' :
                 pipeline.status === 'transcribing' ? 'Transcribing MIDI...' :
                 pipeline.status === 'done' ? 'Re-process' :
                 'Separate + Transcribe'}
              </button>
              {wallet.connected && (
                <button
                  onClick={async () => {
                    if (!gen.audioUrl) return
                    setAttestingTrack(true)
                    try {
                      // Hash the audio URL as content identifier
                      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(gen.audioUrl))
                      const contentHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
                      await attestContent({
                        contentHash,
                        contentType: 'audio/mpeg',
                        description: `Music: ${prompt.trim() || character?.name || 'NPGX'} composition`,
                        slug: selectedCharacter || undefined,
                      })
                    } finally {
                      setAttestingTrack(false)
                    }
                  }}
                  disabled={attestingTrack}
                  className="text-xs font-mono font-bold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 disabled:text-gray-600 px-3 py-1.5 rounded-lg transition-all border border-purple-500/20"
                >
                  {attestingTrack ? 'Attesting...' : '$401 Attest'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pipeline Results — Tabs */}
        {pipeline.status !== 'idle' && (
          <div className="mb-8">
            <div className="flex gap-1 mb-4">
              {(['compose', 'stems', 'sheet'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-lg transition-all ${
                    activeTab === tab ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-500 hover:text-white'
                  }`}
                >
                  {tab === 'compose' ? 'Compose' : tab === 'stems' ? 'Stems' : 'Sheet Music'}
                </button>
              ))}
              {pipeline.cost > 0 && (
                <span className="ml-auto text-[10px] text-gray-600 font-mono self-center">
                  Pipeline: ${pipeline.cost.toFixed(3)}
                </span>
              )}
            </div>

            {pipeline.status === 'error' && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-xs font-mono">{pipeline.error}</p>
              </div>
            )}

            {activeTab === 'stems' && pipeline.stems && (
              <div className="bg-white/[0.03] rounded-xl border border-white/10 p-5">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
                  Separated Stems
                  {pipeline.status === 'transcribing' && <span className="text-red-400 ml-2 font-normal">(transcribing MIDI...)</span>}
                </h3>
                <StemPlayer
                  stems={pipeline.stems}
                  midi={pipeline.midi}
                  onRequestSheetMusic={async (stemName, midiUrl) => {
                    setActiveTab('sheet')
                    setSheetLoading(true)
                    setSheetMusicXml(null)
                    try {
                      const res = await fetch('/api/music/to-musicxml', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ midiUrl, title: `${stemName} — Sheet Music` }),
                      })
                      const data = await res.json()
                      if (data.success && data.musicXml) {
                        setSheetMusicXml(data.musicXml)
                      }
                    } catch (err) {
                      console.error('Sheet music conversion failed:', err)
                    } finally {
                      setSheetLoading(false)
                    }
                  }}
                />
              </div>
            )}

            {activeTab === 'sheet' && (
              <div className="bg-white/[0.03] rounded-xl border border-white/10 p-5">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Sheet Music</h3>
                {sheetLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" />
                    <span className="ml-3 text-gray-500 text-sm font-mono">Converting MIDI to sheet music...</span>
                  </div>
                )}
                {!sheetLoading && sheetMusicXml ? (
                  <SheetMusic musicXml={sheetMusicXml} className="rounded-lg overflow-hidden" />
                ) : !sheetLoading && pipeline.midi && Object.keys(pipeline.midi).length > 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm mb-3">MIDI files ready — click a stem's SHEET button to render</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {Object.entries(pipeline.midi).map(([stem, url]) => (
                        <a
                          key={stem}
                          href={url}
                          download={`${stem}.mid`}
                          className="text-xs font-mono text-red-400 hover:text-red-300 bg-red-500/10 px-3 py-1.5 rounded-lg"
                        >
                          Download {stem}.mid
                        </a>
                      ))}
                    </div>
                  </div>
                ) : !sheetLoading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 text-sm">Process a track first to generate stems and MIDI</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Session Tracks */}
        {tracks.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest mb-3">Session ({tracks.length} tracks)</p>
            <div className="space-y-2">
              {tracks.map(t => (
                <div
                  key={t.id}
                  onClick={() => togglePlay(t)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    playingId === t.id ? 'bg-red-500/10 border-red-500/30' : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${playingId === t.id ? 'bg-red-500' : 'bg-white/10'}`}>
                      <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        {playingId === t.id ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M8 5v14l11-7z" />}
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">{t.title}</p>
                      <p className="text-[10px] text-gray-600 font-mono">
                        {t.character && <span className="text-red-500/70">{t.character} / </span>}
                        {t.provider} / ${t.cost.toFixed(3)}
                      </p>
                    </div>
                    <a
                      href={t.audioUrl}
                      download
                      onClick={e => e.stopPropagation()}
                      className="text-[9px] text-gray-600 hover:text-red-400 font-mono"
                    >
                      DL
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
