'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface Clip { slug: string; url: string; prompt: string; track: string }

export default function MotionGraphicsPage() {
  const [clips, setClips] = useState<Clip[]>([])
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null)
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [tab, setTab] = useState<'library' | 'generate'>('library')
  const [showMintModal, setShowMintModal] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    fetch('/api/motion-graphics')
      .then(r => r.json())
      .then(data => setClips(data.clips || []))
      .catch(() => {})
  }, [])

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setPreviewUrl('')

    try {
      const res = await fetch('/api/storyboard/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, index: 0, orientation: 'landscape' }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.imageUrl) setPreviewUrl(data.imageUrl)
      }
    } catch {} finally {
      setGenerating(false)
    }
  }

  const handleMint = () => {
    const minted = JSON.parse(localStorage.getItem('npgx-minted-graphics') || '[]')
    minted.push({
      id: `mg-${Date.now()}`,
      prompt,
      previewUrl,
      mintedAt: new Date().toISOString(),
    })
    localStorage.setItem('npgx-minted-graphics', JSON.stringify(minted))
    setShowMintModal(true)
    setTimeout(() => setShowMintModal(false), 3000)
  }

  // Group clips by track
  const grouped = clips.reduce<Record<string, Clip[]>>((acc, clip) => {
    if (!acc[clip.track]) acc[clip.track] = []
    acc[clip.track].push(clip)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-[family-name:var(--font-brand)] text-4xl tracking-wider mb-1">MOTION GRAPHICS</h1>
            <p className="text-gray-500 text-sm">Title cards, motion titles, and text animations</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setTab('library')}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-[family-name:var(--font-brand)] border transition-all ${
                tab === 'library' ? 'bg-red-600/20 border-red-500 text-red-300' : 'bg-white/5 border-white/10 text-white/40'
              }`}>Library</button>
            <button onClick={() => setTab('generate')}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-[family-name:var(--font-brand)] border transition-all ${
                tab === 'generate' ? 'bg-red-600/20 border-red-500 text-red-300' : 'bg-white/5 border-white/10 text-white/40'
              }`}>Generate</button>
          </div>
        </div>

        {/* LIBRARY TAB */}
        {tab === 'library' && (
          <div>
            {Object.entries(grouped).map(([track, trackClips]) => (
              <div key={track} className="mb-8">
                <h2 className="font-[family-name:var(--font-brand)] text-sm text-red-400 uppercase tracking-wider mb-3">{track}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {trackClips.map(clip => (
                    <div key={clip.slug} className={`border overflow-hidden cursor-pointer transition-all ${
                      selectedClip?.slug === clip.slug ? 'border-red-500 ring-1 ring-red-500/50' : 'border-white/10 hover:border-red-500/30'
                    }`} onClick={() => { setSelectedClip(clip); setPrompt(clip.prompt) }}>
                      <div className="aspect-video bg-black relative">
                        <video
                          className="w-full h-full object-cover"
                          autoPlay muted loop playsInline
                          src={clip.url}
                        />
                      </div>
                      <div className="p-1.5 bg-white/5">
                        <div className="text-[9px] text-white/40 truncate font-[family-name:var(--font-brand)]">{clip.slug}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Selected clip detail */}
            {selectedClip && (
              <div className="fixed bottom-0 left-0 right-0 z-[250] bg-black/95 border-t border-white/10 p-4">
                <div className="max-w-6xl mx-auto flex gap-4 items-start">
                  <video className="w-48 aspect-video object-cover rounded border border-white/10 shrink-0"
                    autoPlay muted loop playsInline src={selectedClip.url} />
                  <div className="flex-1 min-w-0">
                    <div className="font-[family-name:var(--font-brand)] text-white text-sm mb-1">{selectedClip.track}</div>
                    <div className="text-white/40 text-[11px] leading-relaxed mb-2 line-clamp-3">{selectedClip.prompt}</div>
                    <div className="flex gap-2">
                      <button onClick={() => { navigator.clipboard.writeText(selectedClip.prompt) }}
                        className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-[family-name:var(--font-brand)] uppercase tracking-wider border border-white/10 transition-all">
                        Copy Prompt
                      </button>
                      <button onClick={() => { setPrompt(selectedClip.prompt); setTab('generate') }}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-[family-name:var(--font-brand)] uppercase tracking-wider transition-all">
                        Use as Template
                      </button>
                      <button onClick={() => setSelectedClip(null)}
                        className="px-3 py-1 text-white/30 hover:text-white/60 text-[10px] transition-colors">
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GENERATE TAB */}
        {tab === 'generate' && (
          <div className="max-w-3xl mx-auto">
            <h2 className="font-[family-name:var(--font-brand)] text-sm text-red-400 uppercase tracking-wider mb-3">Create Motion Graphic</h2>

            {/* Prompt field */}
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe your motion graphic title card... e.g. Pure black background, neon pink text &quot;YOUR TITLE&quot; flickering on..."
              rows={6}
              className="w-full bg-white/5 border border-white/10 text-white text-sm p-4 rounded-lg focus:border-red-500 focus:outline-none resize-none mb-4 placeholder-white/20"
            />

            {/* Quick templates */}
            <div className="flex gap-3 flex-wrap mb-6 items-center">
              <span className="text-white/40 text-sm font-[family-name:var(--font-brand)] uppercase tracking-wider">Templates:</span>
              {['Neon Punk', 'Gothic', 'Glitch', 'Fire', 'Chrome'].map(style => (
                <button key={style} onClick={() => {
                  const templates: Record<string, string> = {
                    'Neon Punk': 'Pure black background. Hot pink neon text "YOUR TITLE" flickers on in scratched aggressive punk font, cracks radiating, neon green and hot pink light, smoke drifting. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
                    'Gothic': 'Pure black background. Deep crimson text "YOUR TITLE" materializes from thorny vine tendrils, petals falling catching red and purple light. Gothic mist, candlelight. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
                    'Glitch': 'Pure black background. Glitch neon text "YOUR TITLE" crashes on with digital explosion, pixelating, screen tearing, RGB splitting. CRT scanlines, arcade neon, pixel explosions. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
                    'Fire': 'Pure black background. Fire orange text "YOUR TITLE" ignites with flame effect, letters burning and flickering, glass shattering behind. Fire dynamics, orange flame light, smoke. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
                    'Chrome': 'Pure black background. Chrome silver text "YOUR TITLE" slams on like metal impact, industrial with rivets and dents, sparks on impact. Chrome reflections, factory steam. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
                  }
                  setPrompt(templates[style] || '')
                }}
                  className="px-4 py-2 text-sm bg-white/5 border border-white/10 text-white/50 hover:text-red-300 hover:border-red-500/30 hover:bg-red-600/10 transition-all rounded font-[family-name:var(--font-brand)] uppercase tracking-wider">
                  {style}
                </button>
              ))}
            </div>

            {/* Generate button */}
            <button onClick={handleGenerate} disabled={generating || !prompt.trim()}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 text-white font-[family-name:var(--font-brand)] text-sm uppercase tracking-wider transition-all rounded-lg mb-6">
              {generating ? 'Generating preview...' : 'Generate Preview (~$0.02)'}
            </button>

            {/* Preview */}
            {(previewUrl || generating) && (
              <div className="border border-white/10 bg-white/5 rounded-lg overflow-hidden mb-4">
                <div className="aspect-video bg-black relative">
                  {generating ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400" />
                    </div>
                  ) : previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                {previewUrl && (
                  <div className="p-3 flex gap-2">
                    <button onClick={handleMint}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider transition-all">
                      Mint to Library
                    </button>
                    <button onClick={handleGenerate}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider border border-white/10 transition-all">
                      Regenerate
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mint success modal */}
      {showMintModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowMintModal(false)}>
          <div className="bg-black border border-green-500/50 rounded-lg p-8 max-w-sm text-center shadow-2xl shadow-green-500/20">
            <div className="text-4xl mb-3">✓</div>
            <div className="font-[family-name:var(--font-brand)] text-white text-lg tracking-wider mb-2">MINTED</div>
            <div className="text-white/50 text-sm">Available in your editor library</div>
          </div>
        </div>
      )}
    </div>
  )
}
