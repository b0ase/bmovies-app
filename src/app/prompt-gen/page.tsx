'use client'

import { useState, useEffect, useCallback } from 'react'
import { NPGX_ROSTER, ROSTER_BY_SLUG } from '@/lib/npgx-roster'
import { useWallet } from '@/hooks/useWallet'
import Image from 'next/image'

interface SoulData {
  identity: { name: string; token: string; tagline: string }
  appearance: Record<string, unknown>
  style: { aesthetic: string; clothing: string[]; colors: string[] }
  generation: { promptPrefix: string; promptSuffix: string; negativePrompt: string }
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

// Style templates — {character} gets replaced with soul promptPrefix
const STYLE_TEMPLATES = [
  {
    id: 'red-hot',
    title: 'RED HOT',
    desc: 'Maximum intensity, editorial heat, provocative',
    build: (prefix: string) =>
      `Ultra high-end editorial photograph of a real ${prefix} Intense eye contact with camera, smouldering expression, dramatic chiaroscuro lighting, deep shadows and warm highlights, sweat-glistened skin, tousled hair, shot in a moody nightclub or dimly lit hotel room, provocative confident pose, sultry atmosphere, Vogue Italia editorial style, raw sensuality, powerful feminine energy, shot on Hasselblad H6D 100c medium format, 80mm f2.0, cinematic color grading, rich warm tones, extremely detailed skin texture with visible pores and imperfections`,
  },
  {
    id: 'editorial-heat',
    title: 'Editorial Heat',
    desc: 'High fashion, intense gaze, dramatic lighting',
    build: (prefix: string) =>
      `High fashion editorial photograph of a real ${prefix} Piercing gaze directly at camera, dramatic Rembrandt lighting, bold makeup, high contrast, fashion-forward styling, powerful pose, W Magazine or Dazed editorial quality, shot in luxury penthouse at golden hour, warm cinematic tones, confidence radiating, editorial crop, extremely detailed, Hasselblad quality`,
  },
  {
    id: 'neon-noir',
    title: 'Neon Noir',
    desc: 'Cyberpunk nightlife, neon-soaked, dangerous',
    build: (prefix: string) =>
      `Cinematic neon noir photograph of a real ${prefix} Bathed in red and magenta neon light, rain-slicked streets reflecting neon, dangerous alluring expression, cyberpunk nightlife atmosphere, leather and chrome, shot through wet glass, Blade Runner aesthetic, shallow depth of field, anamorphic lens flare, moody seductive atmosphere, confident powerful stance, Canon EOS R5 85mm f1.2`,
  },
  {
    id: 'poolside',
    title: 'Poolside',
    desc: 'Sun-drenched, golden hour, wet skin',
    build: (prefix: string) =>
      `Sun-drenched poolside photograph of a real ${prefix} Golden hour sunlight, warm sun-kissed skin with water droplets, relaxed confident expression, luxury pool or beach setting, bright vivid colors, summer heat haze, natural bronzed glow, fashion swimwear editorial style, shot on Sony A7IV 135mm f1.8, bokeh background of sparkling water, lifestyle luxury feel`,
  },
  {
    id: 'casual-photo',
    title: 'Casual Photo',
    desc: 'Natural smartphone quality, everyday setting',
    build: (prefix: string) =>
      `Casual photograph of a real ${prefix} Natural lighting, smartphone photo quality, everyday setting, candid moment, realistic imperfections, natural skin texture, unposed, authentic feel`,
  },
  {
    id: 'candid-shot',
    title: 'Candid Shot',
    desc: 'Documentary style, unposed, authentic',
    build: (prefix: string) =>
      `Candid shot of a real ${prefix} Documentary photography, natural moment, unaware of camera, realistic lighting, street photography style, unposed action, natural environment`,
  },
  {
    id: 'street-photography',
    title: 'Street Photo',
    desc: 'Urban, gritty realism, natural lighting',
    build: (prefix: string) =>
      `Street photography of a real ${prefix} Urban environment, natural lighting, gritty realism, authentic moment, documentary style, unfiltered, raw photography`,
  },
  {
    id: 'professional',
    title: 'Professional',
    desc: 'Studio quality, high production',
    build: (prefix: string) =>
      `Professional studio photograph of a real ${prefix} High-resolution photography, cinematic lighting, fashion photography style, photorealistic, natural human features`,
  },
  {
    id: 'anime',
    title: 'Anime Style',
    desc: 'Manga/anime aesthetic, vibrant colors',
    build: (prefix: string) =>
      `Anime style illustration of ${prefix} High quality anime art, detailed character design, vibrant colors, manga style, cel shading`,
  },
  {
    id: 'concept-art',
    title: 'Concept Art',
    desc: 'Digital painting, fantasy illustration',
    build: (prefix: string) =>
      `Digital concept art of ${prefix} Detailed digital painting, dramatic lighting, artstation quality, fantasy art, character design sheet`,
  },
]

export default function PromptGenerator() {
  const [selectedSlug, setSelectedSlug] = useState(NPGX_ROSTER[0].slug)
  const [selectedStyle, setSelectedStyle] = useState('red-hot')
  const [soul, setSoul] = useState<SoulData | null>(null)
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<{ url: string; publicUrl?: string | null; contentHash?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Wallet + on-chain attestation
  const { wallet, identity, connecting, connect, disconnect, attestContent } = useWallet()
  const [attestation, setAttestation] = useState<{ txid: string; status: 'pending' | 'done' | 'error' } | null>(null)
  const [attesting, setAttesting] = useState(false)
  const [inscribing, setInscribing] = useState(false)
  const [inscriptionError, setInscriptionError] = useState<string | null>(null)

  // HandCash state
  const [handcashHandle, setHandcashHandle] = useState<string | null>(null)
  useEffect(() => {
    setHandcashHandle(getCookie('npgx_user_handle'))
  }, [])

  // Attest image on-chain
  const attestImage = useCallback(async (contentHash: string) => {
    if (!contentHash) return
    setAttesting(true)
    setAttestation({ txid: '', status: 'pending' })
    try {
      const result = await attestContent({
        contentHash,
        contentType: 'image/generated',
        description: `NPGX ${ROSTER_BY_SLUG[selectedSlug]?.name || selectedSlug} prompt-gen`,
        slug: selectedSlug,
      })
      if (result?.txid) {
        setAttestation({ txid: result.txid, status: 'done' })
      } else {
        setAttestation(null)
      }
    } catch {
      setAttestation({ txid: '', status: 'error' })
    } finally {
      setAttesting(false)
    }
  }, [attestContent, selectedSlug])

  // Pay & inscribe hash on-chain ($0.05)
  const inscribeOnChain = async () => {
    if (!generatedImage?.contentHash) return
    const handle = getCookie('npgx_user_handle')
    const token = getCookie('npgx_handcash_token')
    if (!handle || !token) {
      setInscriptionError('Sign in with HandCash first')
      return
    }

    setInscribing(true)
    setInscriptionError(null)
    try {
      const payRes = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `NPGX inscription — ${ROSTER_BY_SLUG[selectedSlug]?.name || selectedSlug}`,
          amount: 0.05,
          currency: 'USD',
        }),
      })
      if (!payRes.ok) {
        const payData = await payRes.json()
        throw new Error(payData.error || 'Payment failed')
      }

      await attestImage(generatedImage.contentHash)
    } catch (err) {
      setInscriptionError(err instanceof Error ? err.message : 'Inscription failed')
    } finally {
      setInscribing(false)
    }
  }

  // Pay & save full image to chain ($0.50 — public, visible to chain watchers)
  const [fullInscribing, setFullInscribing] = useState(false)
  const [fullInscription, setFullInscription] = useState<{ txid: string; status: string } | null>(null)

  const inscribeFullImage = async () => {
    if (!generatedImage?.url || !generatedImage?.contentHash) return
    const handle = getCookie('npgx_user_handle')
    const token = getCookie('npgx_handcash_token')
    if (!handle || !token) {
      setInscriptionError('Sign in with HandCash first')
      return
    }

    setFullInscribing(true)
    setInscriptionError(null)
    try {
      // Charge $0.50 for full image inscription
      const payRes = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `NPGX full image inscription — ${ROSTER_BY_SLUG[selectedSlug]?.name || selectedSlug}`,
          amount: 0.50,
          currency: 'USD',
        }),
      })
      if (!payRes.ok) {
        const payData = await payRes.json()
        throw new Error(payData.error || 'Payment failed')
      }

      // Payment succeeded — inscribe full image via B:// protocol
      const inscribeRes = await fetch('/api/content/inscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: generatedImage.publicUrl || generatedImage.url,
          contentHash: generatedImage.contentHash,
          slug: selectedSlug,
        }),
      })
      const result = await inscribeRes.json()
      if (!inscribeRes.ok) throw new Error(result.error || 'Inscription failed')

      setFullInscription({ txid: result.txid || 'pending', status: result.status })

      // Also attest the hash if not already done
      if (!attestation && generatedImage.contentHash) {
        await attestImage(generatedImage.contentHash)
      }
    } catch (err) {
      setInscriptionError(err instanceof Error ? err.message : 'Full inscription failed')
    } finally {
      setFullInscribing(false)
    }
  }

  // Load soul data when character changes
  useEffect(() => {
    fetch(`/souls/${selectedSlug}.json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setSoul(data)
        if (data) {
          const style = STYLE_TEMPLATES.find(s => s.id === selectedStyle)
          if (style) {
            setGeneratedPrompt(style.build(data.generation.promptPrefix))
          }
        }
      })
      .catch(() => setSoul(null))
  }, [selectedSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild prompt when style changes
  useEffect(() => {
    if (!soul) return
    const style = STYLE_TEMPLATES.find(s => s.id === selectedStyle)
    if (style) {
      setGeneratedPrompt(style.build(soul.generation.promptPrefix))
    }
  }, [selectedStyle, soul])

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const generateImage = async () => {
    if (!generatedPrompt) return
    setGenerating(true)
    setError(null)
    setGeneratedImage(null)
    setAttestation(null)
    setInscriptionError(null)

    try {
      const res = await fetch('/api/generate-image-npgx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: selectedSlug,
          prompt: generatedPrompt,
          width: 1024,
          height: 1536,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      if (data.imageUrl) {
        setGeneratedImage({
          url: data.imageUrl,
          publicUrl: data.publicUrl || null,
          contentHash: data.contentHash,
        })
      } else {
        throw new Error('No image URL returned')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const downloadImage = async () => {
    if (!generatedImage?.url) return
    try {
      const link = document.createElement('a')
      link.href = generatedImage.url
      link.download = `npgx-${selectedSlug}-${selectedStyle}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  const selectedChar = NPGX_ROSTER.find(c => c.slug === selectedSlug)

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-wide font-[family-name:var(--font-brand)] bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent mb-4">
            NPGX PROMPT GENERATOR
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Build image prompts from character soul data. Edit, copy, or generate directly with Grok.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Controls */}
          <div className="space-y-6">
            {/* Character Selection */}
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                Character
              </label>
              <select
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="w-full p-3 bg-black/60 border border-white/10 rounded-lg text-white focus:border-red-500 focus:outline-none"
              >
                {NPGX_ROSTER.map((char) => (
                  <option key={char.slug} value={char.slug}>
                    {char.letter}. {char.name} — {char.token}
                  </option>
                ))}
              </select>

              {selectedChar && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                    <Image
                      src={selectedChar.image}
                      alt={selectedChar.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{selectedChar.name}</div>
                    <div className="text-xs text-gray-500">{selectedChar.tagline}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Style Selection */}
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                Style Template
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_TEMPLATES.map((style) => {
                  const isHot = ['red-hot', 'editorial-heat', 'neon-noir', 'poolside'].includes(style.id)
                  return (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`p-3 rounded-lg text-left border transition-all ${
                        selectedStyle === style.id
                          ? 'border-red-500 bg-red-500/10'
                          : isHot
                            ? 'border-red-500/20 bg-red-500/5 hover:border-red-500/40'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className={`text-sm font-bold ${isHot ? 'text-red-400' : 'text-white'}`}>{style.title}</div>
                      <div className="text-xs text-gray-500">{style.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Prompt Editor */}
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                Prompt (editable)
              </label>
              <textarea
                value={generatedPrompt}
                onChange={(e) => setGeneratedPrompt(e.target.value)}
                className="w-full h-40 p-4 bg-black/60 border border-white/10 rounded-lg text-white font-mono text-sm resize-none focus:border-red-500 focus:outline-none"
                placeholder="Select a character and style to generate a prompt..."
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={copyPrompt}
                  className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all ${
                    copied
                      ? 'bg-red-600 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={generateImage}
                  disabled={generating || !generatedPrompt}
                  className="flex-[2] py-2 px-4 rounded-lg font-bold text-sm bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {generating ? 'Generating...' : 'Generate Image'}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Output */}
          <div className="space-y-6">
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/10 flex flex-col">
              <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                Output
              </label>

              {generating && (
                <div className="flex items-center justify-center py-40">
                  <div className="text-center">
                    <div className="w-12 h-12 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Generating with Grok...</p>
                    <p className="text-gray-600 text-sm mt-1">This takes 10-30 seconds</p>
                  </div>
                </div>
              )}

              {error && !generating && (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center p-6 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 font-bold mb-2">Generation Failed</p>
                    <p className="text-gray-400 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {generatedImage && !generating && (
                <div className="flex flex-col">
                  <div className="relative rounded-lg overflow-hidden border border-white/10">
                    {/* ON-CHAIN badge */}
                    {attestation?.status === 'done' && attestation.txid && (
                      <a
                        href={`https://whatsonchain.com/tx/${attestation.txid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-3 right-3 z-20 bg-purple-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 hover:bg-purple-500 transition-colors"
                      >
                        <span>&#9670;</span> ON-CHAIN
                      </a>
                    )}
                    {attesting && (
                      <div className="absolute top-3 right-3 z-20 bg-yellow-600/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                        <div className="animate-spin rounded-full h-2.5 w-2.5 border border-white border-t-transparent" />
                        SIGNING...
                      </div>
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={generatedImage.url}
                      alt={`Generated ${selectedChar?.name}`}
                      className="w-full h-auto"
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={downloadImage}
                      className="flex-1 py-2 px-4 rounded-lg font-bold text-sm bg-white/10 hover:bg-white/20 text-white transition-all"
                    >
                      Download
                    </button>
                    <button
                      onClick={generateImage}
                      className="flex-1 py-2 px-4 rounded-lg font-bold text-sm bg-red-600 hover:bg-red-700 text-white transition-all"
                    >
                      Regenerate
                    </button>
                  </div>

                  {/* Inscription section */}
                  {generatedImage.contentHash && (
                    <div className="mt-4 bg-purple-900/10 border border-purple-500/20 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider">
                          On-Chain Inscription
                        </h3>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {generatedImage.contentHash.slice(0, 12)}...
                        </span>
                      </div>

                      {attestation?.status === 'done' && attestation.txid ? (
                        <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-3 text-xs">
                          <div className="text-green-400 font-bold mb-1">Inscribed on BSV</div>
                          <a
                            href={`https://whatsonchain.com/tx/${attestation.txid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-300/60 hover:text-green-300 font-mono break-all"
                          >
                            {attestation.txid.slice(0, 20)}...{attestation.txid.slice(-8)}
                          </a>
                          <p className="text-gray-500 mt-2">SHA-256 hash recorded via $401 attestation. You own this content.</p>
                        </div>
                      ) : attestation?.status === 'error' ? (
                        <div className="text-xs text-red-400">Inscription failed — try again</div>
                      ) : !handcashHandle ? (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-400">
                            Inscribe this image on the BSV blockchain. SHA-256 hash + $401 attestation = permanent proof of ownership.
                          </p>
                          <a
                            href="/api/auth/handcash"
                            className="block w-full py-2.5 px-4 rounded-lg font-bold text-sm text-center bg-green-600 hover:bg-green-700 text-white transition-all"
                          >
                            Sign In With HandCash to Inscribe
                          </a>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Hash-only inscription — $0.05 */}
                          <button
                            onClick={inscribeOnChain}
                            disabled={inscribing || attesting}
                            className="w-full py-2.5 px-4 rounded-lg font-bold text-sm uppercase tracking-wider bg-purple-600 hover:bg-purple-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {inscribing ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                Inscribing...
                              </>
                            ) : (
                              <>Record Hash On-Chain — $0.05</>
                            )}
                          </button>

                          {/* Full image inscription — $0.50 */}
                          {!fullInscription ? (
                            <button
                              onClick={inscribeFullImage}
                              disabled={fullInscribing || inscribing}
                              className="w-full py-2.5 px-4 rounded-lg font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-500 hover:to-red-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              {fullInscribing ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                  Saving to Chain...
                                </>
                              ) : (
                                <>Save Full Image to Chain — $0.50</>
                              )}
                            </button>
                          ) : (
                            <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-3 text-xs">
                              <div className="text-green-400 font-bold mb-1">
                                Full Image {fullInscription.status === 'inscribed' ? 'On Chain' : 'Queued'}
                              </div>
                              {fullInscription.txid && fullInscription.txid !== 'pending' && (
                                <a
                                  href={`https://whatsonchain.com/tx/${fullInscription.txid}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-300/60 hover:text-green-300 font-mono break-all"
                                >
                                  {fullInscription.txid.slice(0, 20)}...{fullInscription.txid.slice(-8)}
                                </a>
                              )}
                              <p className="text-gray-500 mt-1">Anyone watching the BSV chain can see this image.</p>
                            </div>
                          )}

                          <p className="text-[10px] text-gray-600 text-center">
                            Hash = proof of ownership. Full image = public on-chain visibility.
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-gray-600">
                            <span>Signed in as @{handcashHandle}</span>
                            <span>via HandCash BSV</span>
                          </div>
                          {inscriptionError && (
                            <div className="text-xs text-red-400">{inscriptionError}</div>
                          )}
                        </div>
                      )}

                      {/* BRC-100 wallet connection as alternative */}
                      {!wallet.connected && !handcashHandle && (
                        <div className="border-t border-white/5 pt-3">
                          <button
                            onClick={connect}
                            disabled={connecting}
                            className="w-full py-2 px-4 rounded-lg font-bold text-xs bg-white/5 hover:bg-white/10 text-gray-400 transition-all"
                          >
                            {connecting ? 'Connecting...' : 'Or Connect BRC-100 Wallet (Free Attestation)'}
                          </button>
                        </div>
                      )}

                      {/* Auto-attest if BRC-100 wallet is connected (free) */}
                      {wallet.connected && !attestation && !attesting && (
                        <button
                          onClick={() => generatedImage.contentHash && attestImage(generatedImage.contentHash)}
                          className="w-full py-2.5 px-4 rounded-lg font-bold text-sm uppercase tracking-wider bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/40 text-purple-300 transition-all"
                        >
                          Attest On-Chain (BRC-100 Wallet)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!generatedImage && !generating && !error && (
                <div className="flex items-center justify-center py-40">
                  <div className="text-center text-gray-600">
                    <p className="text-lg mb-2">No image yet</p>
                    <p className="text-sm">Select a character and style, then click Generate Image</p>
                  </div>
                </div>
              )}
            </div>

            {/* Soul info */}
            {soul && (
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Soul Data
                </label>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-500">Aesthetic:</span> <span className="text-white">{soul.style.aesthetic}</span></div>
                  <div><span className="text-gray-500">Clothing:</span> <span className="text-gray-300">{soul.style.clothing.join(', ')}</span></div>
                  <div><span className="text-gray-500">Colors:</span> <span className="text-gray-300">{soul.style.colors.join(', ')}</span></div>
                  <div><span className="text-gray-500">Negative:</span> <span className="text-gray-500 italic">{soul.generation.negativePrompt}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
