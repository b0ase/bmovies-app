'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { NPGX_ROSTER, ROSTER_BY_SLUG } from '@/lib/npgx-roster'
import MagazineCoverOverlay from '@/components/MagazineCoverOverlay'
import { useWallet } from '@/hooks/useWallet'

// ============================================================
// NPGX HOUSE STYLE — the DNA that makes every image ours
// ============================================================

const HOUSE_STYLE = 'beautiful young woman, female, feminine face and body, photorealistic photograph, saturated colors against dark shadows, red and pink neon lighting wash, vignette, smoke, sweat on face, confrontational eye contact, mouth open tongue out or dirty knowing smile, heavy dark makeup black lipstick dramatic false lashes, face piercings dermal studs, visible tattoos everywhere, punk attitude rude energy, natural skin texture with subtle pores and light freckles, healthy glowing skin, oily skin catching light, film grain ISO 800, chromatic aberration, shallow depth of field bokeh, shot on Canon EOS R5 85mm f1.4 wide open, raw unprocessed photograph straight from camera, editorial fashion photography, not anime not cartoon not illustration not 3d render not airbrushed not glossy not HDR, not male not masculine, 8k quality'

// Aria-specific prompt — Grok responds well to this magazine cover / art fusion style
// Aria uses the same house style as everyone else, just with her specific identity baked in
const ARIA_IDENTITY = 'Aria Kurosawa Voidstrike, beautiful adult Japanese woman, Asian features, slim, tattooed, edgy punk attitude, seductive, fierce ninja punk energy'

const WARDROBE = [
  'huge thigh-length high heeled black PVC platform hooker boots, tiny black latex micro g-string, black latex fingerless gloves, heavy gold chain necklace, gold hoop earrings, spiked collar choker',
  'thigh-high black patent stiletto boots with buckles, black PVC harness bikini barely covering anything, latex fingerless gloves, layered gold chains, gold belly chain, diamond studs',
  'massive black platform PVC boots to the thigh, pink lace lingerie micro-set, black latex corset over top, gold necklace with cross pendant, fingerless latex gloves, spiked wristbands',
  'knee-high black PVC boots with chrome heels, tiny black latex bodysuit cut high on hips, fishnet overlay, chunky gold choker, gold arm cuffs, latex opera gloves',
  'thigh-length black vinyl platform boots, black bondage tape criss-crossing chest and hips barely covering, gold body chains draped everywhere, diamond collar, latex fingerless gloves',
  'huge black PVC platform boots, sheer black mesh micro-dress over black latex g-string, spiked leather collar, gold chain harness over chest, gold rings on every finger',
  'thigh-high black latex stilettos, red lace lingerie set visible under open black PVC jacket, gold navel chain, chunky gold necklace, fingerless PVC gloves, spiked ear cuffs',
  'massive black patent platform boots, black rubber micro-shorts and latex bra with O-ring details, gold waist chain hanging low, diamond choker, latex arm-length gloves',
]

const HAIR = [
  'pigtails with pink ribbons, punk undercut on sides',
  'wild mohawk spiked up, shaved sides',
  'long black hair with neon pink streaks, messy and wild',
  'short choppy punk cut, bleached tips',
  'twin buns with loose strands, undercut visible',
  'slicked back with shaved sides, wet look',
  'big messy ponytail pulled tight, face fully exposed',
  'half-shaved head, remaining hair long and wild over one eye',
]

const ACCESSORIES = [
  'heavy latex fetish mask covering lower face, ninja mask',
  'ball gag around neck as necklace, spiked headband',
  'leather blindfold pushed up on forehead, chain leash',
  'gas mask hanging around neck, studded crown',
  'black surgical mask pulled down under chin, hair clips',
  'leather muzzle mask covering mouth, head harness',
]

const SCENES = [
  'graffiti-covered concrete wall, neon signs glowing, urban grit, spray cans on ground',
  'dark industrial warehouse, red neon strip lights, smoke machine haze, concrete floor',
  'neon-lit Tokyo alleyway at night, rain-wet ground reflecting pink and red light, Japanese signs',
  'underground punk club stage, spotlights cutting through heavy smoke, amp stacks',
  'dirty bathroom mirror, harsh fluorescent mixed with red neon, stickers on mirror',
  'rooftop at night, city neon behind, dark sky, ventilation units',
  'graffiti tunnel, punk gig posters on walls, red and pink lighting, raw concrete',
  'black studio background, single harsh red spotlight from above, total darkness around edges',
]

const ANGLES = [
  'fisheye lens extreme close-up, face and chest filling frame, lens distortion',
  'low angle looking up at her, she towers over camera, dominant and powerful',
  'dutch angle tilted frame, dynamic aggressive off-kilter composition',
  'straight-on eye-level close-up, unflinching direct stare into lens, intimate',
  'slightly below, looking down at camera with contempt, powerful',
  'wide angle close-up distorting proportions, right in your face',
]

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

function buildPrompt(soulPrompt: string, slug?: string): string {
  if (slug === 'aria-voidstrike') return `${ARIA_IDENTITY}, ${pick(HAIR)}, ${pick(WARDROBE)}, ${pick(ACCESSORIES)}, ${pick(ANGLES)}, ${pick(SCENES)}, ${HOUSE_STYLE}`
  return `${soulPrompt}, ${pick(HAIR)}, ${pick(WARDROBE)}, ${pick(ACCESSORIES)}, ${pick(ANGLES)}, ${pick(SCENES)}, ${HOUSE_STYLE}`
}

const VIDEO_ACTIONS = [
  'slow seductive walk toward camera, hips swaying, predatory eyes',
  'hair whipping wildly in wind, biting lip, intense stare',
  'grinding dance in slow motion, smoke and neon, sweating',
  'wild headbanging, hair flying everywhere, mosh pit energy',
  'spinning roundhouse kick, leather boots, sparks flying',
  'katana slash at camera, blade reflecting neon, combat stance',
  'crawling toward camera on all fours, predatory stare, dangerous',
  'straddling motorcycle, revving engine, staring down camera',
  'slow motion tongue across lips, middle finger up, punk attitude',
  'backflip off wall landing in combat stance, sparks and rain',
  'standing in rain soaking wet, clothes clinging, looking up at sky',
  'smoking on rooftop edge, city lights behind, wind in hair',
  'throwing punches at camera, aggressive, sweat flying, fierce',
  'leaning against wall, one boot up, beckoning with finger',
]

export default function NPGXImageGenerator() {
  const searchParams = useSearchParams()
  const initialChar = searchParams.get('character') || 'luna-cyberblade'

  const [selectedCharacter, setSelectedCharacter] = useState(initialChar)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<{url: string, publicUrl?: string, sourceUrl?: string, prompt: string, contentHash?: string, generationId?: string} | null>(null)

  // DNA lineage — the tape carries forward through generations
  const [dnaTape, setDnaTape] = useState<Array<{generationId: string, prompt: string, contentType: string, look: string, timestamp: string}>>([])
  const [lineageRootId, setLineageRootId] = useState<string | null>(null)
  const [lineageDepth, setLineageDepth] = useState(0)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [soulData, setSoulData] = useState<Record<string, unknown> | null>(null)
  const hasAutoStarted = useRef(false)

  // Wallet + on-chain attestation via x401 node
  const { wallet, identity, x401Node, connecting, connect, disconnect, attestContent } = useWallet()
  const [attestation, setAttestation] = useState<{ txid: string; status: 'pending' | 'done' | 'error' } | null>(null)
  const [attesting, setAttesting] = useState(false)

  // Auto-attest when wallet connected and image generated
  const attestImage = useCallback(async (contentHash: string) => {
    if (!wallet.connected || !contentHash) return
    setAttesting(true)
    setAttestation({ txid: '', status: 'pending' })
    try {
      const result = await attestContent({
        contentHash,
        contentType: 'image/generated',
        description: `NPGX ${ROSTER_BY_SLUG[selectedCharacter]?.name || selectedCharacter} poster`,
        slug: selectedCharacter,
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
  }, [wallet.connected, attestContent, selectedCharacter])

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationRequestId, setAnimationRequestId] = useState<string | null>(null)
  const [animationStatus, setAnimationStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoAction, setVideoAction] = useState<string>('')

  // Recover in-flight video request on mount
  useEffect(() => {
    const saved = localStorage.getItem('npgx-video-request')
    if (saved) {
      try {
        const { requestId, slug, timestamp } = JSON.parse(saved)
        if (Date.now() - timestamp < 10 * 60 * 1000) {
          setAnimationRequestId(requestId)
          setAnimationStatus('pending')
          setIsAnimating(true)
          if (slug) setSelectedCharacter(slug)
        } else {
          localStorage.removeItem('npgx-video-request')
        }
      } catch { localStorage.removeItem('npgx-video-request') }
    }
  }, [])

  // Load soul data
  useEffect(() => {
    fetch(`/souls/${selectedCharacter}.json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setSoulData(data))
      .catch(() => setSoulData(null))
  }, [selectedCharacter])

  const char = ROSTER_BY_SLUG[selectedCharacter]

  // Auto-generate on mount
  useEffect(() => {
    const autostart = searchParams.get('autostart')
    if (autostart === 'true' && char && !hasAutoStarted.current && !isGenerating && !generatedImage) {
      hasAutoStarted.current = true
      const timer = setTimeout(() => generate(), 500)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char, soulData])

  const generate = async () => {
    if (!char) return
    setIsGenerating(true)
    setError('')
    setGeneratedImage(null)
    setVideoUrl(null)
    setAnimationStatus('idle')

    const soulPrompt = soulData
      ? (soulData as { generation?: { promptPrefix?: string } }).generation?.promptPrefix || ''
      : `${char.name}, young Japanese woman, slim, tattooed, edgy punk attitude, seductive`

    const prompt = buildPrompt(soulPrompt, selectedCharacter)

    try {
      const response = await fetch('/api/generate-image-npgx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: selectedCharacter, prompt, width: 1024, height: 1536 }),
      })
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.imageUrl) {
          // Record generation DNA — creates lineage chain
          let genId: string | undefined
          try {
            const dnaRes = await fetch('/api/generation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                parentId: generatedImage?.generationId || null,
                characterSlug: selectedCharacter,
                contentType: 'image',
                prompt,
                contentUrl: result.imageUrl,
                creatorAddress: wallet.address || undefined,
                model: result.model || 'atlas-turbo',
                provider: result.provider || 'atlas',
                width: 1024,
                height: 1536,
              }),
            })
            if (dnaRes.ok) {
              const dnaResult = await dnaRes.json()
              genId = dnaResult.generation?.id
              setDnaTape(dnaResult.tape || [])
              setLineageRootId(dnaResult.generation?.rootId || genId || null)
              setLineageDepth(dnaResult.tape?.length || 1)
            }
          } catch (e) {
            console.warn('[dna] Generation record failed:', e)
          }

          setGeneratedImage({ url: result.imageUrl, publicUrl: result.publicUrl || null, sourceUrl: result.sourceUrl || null, prompt, contentHash: result.contentHash, generationId: genId })
          setAttestation(null)
          setError('')
          // Auto-attest if wallet connected
          if (wallet.connected && result.contentHash) {
            attestImage(result.contentHash)
          }
          return
        }
      }
      setError('Generation failed — try again')
    } catch (err) {
      console.error('Generation error:', err)
      setError('Connection error — try again')
    } finally {
      setIsGenerating(false)
    }
  }

  // Animate — screenshot the poster (image + titles) and send THAT to Grok
  const animateImage = async () => {
    if (!generatedImage || !char) return
    setIsAnimating(true)
    setAnimationStatus('pending')
    setVideoUrl(null)
    setError('')

    try {
      // Build a clean video prompt — image prompts are too explicit for Atlas Cloud video moderation
      const action = pick(VIDEO_ACTIONS)
      setVideoAction(action)
      const videoPrompt = `${char.name}, photorealistic woman, slim tattooed punk girl, ${action}, cinematic motion, dramatic lighting, neon atmosphere, rock energy, 8k`

      // Use sourceUrl (Atlas Cloud hosted URL) for video gen — Wan 2.2 can fetch it directly
      // publicUrl is a local content path (/content/...) that only exists on localhost, not production
      const animateUrl = generatedImage.sourceUrl || generatedImage.publicUrl || generatedImage.url
      console.log(`[animate] Sending to Wan 2.2 — using ${generatedImage.sourceUrl ? 'Atlas sourceUrl' : generatedImage.publicUrl ? 'public URL' : 'base64 fallback'}`)

      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: selectedCharacter,
          prompt: videoPrompt,
          imageUrl: animateUrl,
          character: { name: char.name, description: char.description, category: char.category },
          duration: 5,
          resolution: '720p',
          width: 1024,
          height: 1536,
        }),
      })

      const result = await response.json()
      if (response.ok && result.success && result.requestId) {
        setAnimationRequestId(result.requestId)
        localStorage.setItem('npgx-video-request', JSON.stringify({
          requestId: result.requestId,
          slug: selectedCharacter,
          parentGenerationId: generatedImage.generationId,
          timestamp: Date.now(),
        }))

        // Record video generation DNA — child of the image that was animated
        try {
          const dnaRes = await fetch('/api/generation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parentId: generatedImage.generationId || null,
              characterSlug: selectedCharacter,
              contentType: 'video',
              prompt: videoPrompt,
              contentUrl: `pending:${result.requestId}`,
              creatorAddress: wallet.address || undefined,
              model: 'wan-2.2-spicy',
              provider: 'atlas',
              width: 1024,
              height: 1536,
              duration: 5,
            }),
          })
          if (dnaRes.ok) {
            const dnaResult = await dnaRes.json()
            setDnaTape(dnaResult.tape || [])
            setLineageDepth(dnaResult.tape?.length || lineageDepth + 1)
          }
        } catch (e) {
          console.warn('[dna] Video generation record failed:', e)
        }
        return
      }
      console.error('[animate] API error:', result)
      setError(result.error || `Animation failed (${response.status})`)
      setAnimationStatus('error')
      setIsAnimating(false)
    } catch (err) {
      console.error('Animation error:', err)
      setError(err instanceof Error ? err.message : 'Animation failed')
      setAnimationStatus('error')
      setIsAnimating(false)
    }
  }

  // Poll for video — with failure counting to avoid infinite spinner
  const pollFailures = useRef(0)
  const pollVideo = useCallback(async () => {
    if (!animationRequestId) return
    try {
      const response = await fetch(`/api/generate-video/status?id=${animationRequestId}`)
      if (response.ok) {
        pollFailures.current = 0
        const result = await response.json()
        if (result.status === 'done' && result.videoUrl) {
          setVideoUrl(result.videoUrl)
          setAnimationStatus('done')
          setIsAnimating(false)
          setAnimationRequestId(null)
          localStorage.removeItem('npgx-video-request')
        } else if (result.status === 'expired' || result.status === 'failed') {
          setError(result.error || 'Video generation failed or expired')
          setAnimationStatus('error')
          setIsAnimating(false)
          setAnimationRequestId(null)
          localStorage.removeItem('npgx-video-request')
        }
      } else {
        pollFailures.current++
      }
    } catch {
      pollFailures.current++
    }
    // Give up after 10 consecutive failures
    if (pollFailures.current >= 10) {
      setError('Lost connection to video service — try again')
      setAnimationStatus('error')
      setIsAnimating(false)
      setAnimationRequestId(null)
      localStorage.removeItem('npgx-video-request')
      pollFailures.current = 0
    }
  }, [animationRequestId])

  useEffect(() => {
    if (!animationRequestId) return
    const interval = setInterval(pollVideo, 3000)
    return () => clearInterval(interval)
  }, [animationRequestId, pollVideo])

  // Download — draws image + titles directly on canvas (no html2canvas = no darkening)
  const downloadPoster = async () => {
    if (!generatedImage || !char) return
    console.log('[download] Canvas-based render — no html2canvas, no darkening')
    try {
      // Load image
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = generatedImage.url
      })

      // Create canvas at 2:3 aspect, high res
      const W = 2048
      const H = 3072
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!

      // Draw image — cover the canvas
      const imgRatio = img.width / img.height
      const canvasRatio = W / H
      let sx = 0, sy = 0, sw = img.width, sh = img.height
      if (imgRatio > canvasRatio) {
        sw = img.height * canvasRatio
        sx = (img.width - sw) / 2
      } else {
        sh = img.width / canvasRatio
        sy = (img.height - sh) / 2
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H)

      // Subtle bottom gradient only (NOT dark — just enough for text readability)
      const grad = ctx.createLinearGradient(0, H * 0.75, 0, H)
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, 'rgba(0,0,0,0.5)')
      ctx.fillStyle = grad
      ctx.fillRect(0, H * 0.75, W, H * 0.25)

      // Top gradient — very subtle
      const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.2)
      topGrad.addColorStop(0, 'rgba(0,0,0,0.3)')
      topGrad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = topGrad
      ctx.fillRect(0, 0, W, H * 0.2)

      // MASTHEAD: NINJA PUNK GIRLS
      ctx.save()
      ctx.font = '900 140px Impact, Arial Black, sans-serif'
      ctx.fillStyle = '#FFFFFF'
      ctx.shadowColor = '#000000'
      ctx.shadowBlur = 20
      ctx.shadowOffsetX = 4
      ctx.shadowOffsetY = 4
      ctx.fillText('NINJA PUNK GIRLS', W * 0.04, H * 0.06)
      ctx.restore()

      // XXX badge — top right
      ctx.save()
      ctx.font = '900 150px Impact, Arial Black, sans-serif'
      ctx.fillStyle = '#DC143C'
      ctx.shadowColor = '#000000'
      ctx.shadowBlur = 30
      ctx.shadowOffsetX = 4
      ctx.shadowOffsetY = 4
      ctx.textAlign = 'right'
      ctx.fillText('XXX', W * 0.96, H * 0.06)
      ctx.restore()

      // Thin crimson rule under masthead
      ctx.fillStyle = '#DC143C'
      ctx.fillRect(W * 0.04, H * 0.068, W * 0.5, 3)

      // Sub-masthead
      ctx.save()
      ctx.font = '400 28px Helvetica Neue, Arial, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.letterSpacing = '3px'
      ctx.shadowColor = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur = 4
      const issue = String(NPGX_ROSTER.findIndex(c => c.slug === char.slug) + 1).padStart(3, '0')
      ctx.fillText(`ISSUE NO. ${issue}  \u2022  NPGX.WEBSITE  \u2022  UNCENSORED`, W * 0.04, H * 0.085)
      ctx.restore()

      // Katakana — vertical right
      if (char.katakana) {
        ctx.save()
        ctx.font = '700 50px sans-serif'
        ctx.fillStyle = 'rgba(220,20,60,0.45)'
        ctx.shadowColor = 'rgba(0,0,0,0.5)'
        ctx.shadowBlur = 4
        const chars = [...char.katakana]
        chars.forEach((c, i) => {
          ctx.fillText(c, W * 0.94, H * 0.25 + i * 60)
        })
        ctx.restore()
      }

      // CHARACTER NAME — bottom left
      ctx.save()
      ctx.font = '900 120px Impact, Arial Black, sans-serif'
      ctx.fillStyle = '#FFFFFF'
      ctx.shadowColor = 'rgba(0,0,0,0.95)'
      ctx.shadowBlur = 16
      ctx.shadowOffsetX = 4
      ctx.shadowOffsetY = 4
      ctx.fillText(char.name.toUpperCase(), W * 0.04, H * 0.94)
      ctx.restore()

      // Tagline
      if (char.tagline) {
        ctx.save()
        ctx.font = '400 26px Helvetica Neue, Arial, sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.shadowColor = 'rgba(0,0,0,0.8)'
        ctx.shadowBlur = 4
        ctx.fillText(char.tagline.toUpperCase(), W * 0.04, H * 0.905)
        ctx.restore()
      }

      // Token — bottom right
      ctx.save()
      ctx.font = '700 36px Courier New, monospace'
      ctx.fillStyle = '#DC143C'
      ctx.textAlign = 'right'
      ctx.shadowColor = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur = 8
      ctx.fillText(char.token, W * 0.96, H * 0.94)
      ctx.restore()

      // Bottom rule
      ctx.fillStyle = 'rgba(220,20,60,0.6)'
      ctx.fillRect(W * 0.04, H * 0.955, W * 0.6, 2)

      // Footer text
      ctx.save()
      ctx.font = '400 20px Helvetica Neue, Arial, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.fillText('NPGX.WEBSITE', W * 0.04, H * 0.975)
      ctx.textAlign = 'right'
      ctx.fillText(`AI GENERATED \u2022 ${new Date().getFullYear()}`, W * 0.96, H * 0.975)
      ctx.restore()

      // Thin frame border
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 2
      ctx.strokeRect(W * 0.02, H * 0.02, W * 0.96, H * 0.96)

      // Download
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `NPGX-${char.name.replace(/\s+/g, '-')}-poster.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Poster download failed:', err)
      // Fallback: download raw image without titles
      const link = document.createElement('a')
      link.href = generatedImage.url
      link.download = `NPGX-${char.name.replace(/\s+/g, '-')}.png`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const copyPrompt = async () => {
    if (!generatedImage) return
    try {
      await navigator.clipboard.writeText(generatedImage.prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-wide font-[family-name:var(--font-brand)] bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent mb-3">
            NPGX POSTER STUDIO
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Generate a poster of your Ninja Punk Girl
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Left Panel — Controls */}
          <div className="lg:col-span-2 space-y-6">

            {/* Character Picker — Card Grid */}
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">Character</h2>
              <div className="grid grid-cols-6 gap-1.5 max-h-[35vh] overflow-y-auto pr-1">
                {NPGX_ROSTER.map(c => (
                  <button
                    key={c.slug}
                    onClick={() => setSelectedCharacter(c.slug)}
                    className={`relative rounded-lg overflow-hidden aspect-[3/4] border-2 transition-all ${
                      selectedCharacter === c.slug
                        ? 'border-red-500 shadow-[0_0_15px_rgba(220,20,60,0.4)] scale-105 z-10'
                        : 'border-white/10 hover:border-red-500/40 opacity-60 hover:opacity-100'
                    }`}
                    title={`${c.letter}. ${c.name}`}
                  >
                    <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-0 inset-x-0 p-1 text-center">
                      <span className="text-[8px] font-black text-white leading-none block">{c.letter}</span>
                    </div>
                    {selectedCharacter === c.slug && (
                      <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(220,20,60,0.8)]" />
                    )}
                  </button>
                ))}
              </div>

              {char && (
                <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-2xl font-black text-white">{char.name}</h3>
                      <span className="text-red-400 font-mono text-sm">{char.token}</span>
                    </div>
                    <span className="text-4xl font-black text-red-500/30">{char.letter}</span>
                  </div>
                  <p className="text-sm text-gray-400 italic">&ldquo;{char.tagline}&rdquo;</p>
                  <p className="text-xs text-gray-500 mt-2">{char.description}</p>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <button
              onClick={generate}
              disabled={isGenerating}
              className={`w-full font-black py-5 px-8 rounded-xl text-xl uppercase tracking-wider transition-all duration-300 shadow-lg ${
                isGenerating
                  ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                  : 'bg-red-600 hover:bg-red-700 hover:scale-[1.02] active:scale-[0.98] text-white'
              }`}
            >
              {isGenerating ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white"></div>
                  Generating...
                </div>
              ) : (
                <span>Generate Poster</span>
              )}
            </button>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-center text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Wallet + Chain Attestation */}
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-bold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                <span className="text-purple-400">&#9662;</span> On-Chain Proof
              </h2>

              {!wallet.connected ? (
                <div>
                  <p className="text-xs text-gray-500 mb-3">
                    Connect a BRC-100 wallet to record every generation on Bitcoin SV via your x401 identity node.
                  </p>
                  <div className="flex items-center gap-1.5 mb-3 text-[10px] text-gray-600 font-mono">
                    <span className="text-purple-400">x401</span>
                    <span className="text-gray-700">→</span>
                    <span>{x401Node.replace('https://', '')}</span>
                  </div>
                  <button
                    onClick={connect}
                    disabled={connecting}
                    className="w-full py-2.5 px-4 rounded-lg font-bold text-sm uppercase tracking-wider transition-all bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                  >
                    {connecting ? 'Connecting...' : 'Connect Wallet (BRC-100)'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Connected status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-xs text-green-400 font-mono">
                        {wallet.address?.slice(0, 8)}...{wallet.address?.slice(-6)}
                      </span>
                    </div>
                    <button onClick={disconnect} className="text-xs text-gray-600 hover:text-gray-400">
                      Disconnect
                    </button>
                  </div>

                  {/* x401 node indicator */}
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <span className="text-purple-400">x401</span>
                    <span className="text-gray-700">→</span>
                    <span className="text-gray-500">{x401Node.replace('https://', '')}</span>
                  </div>

                  {/* Identity strands */}
                  {identity && (
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="text-purple-400 font-bold">$401</span>
                      <span className="text-gray-500">Strength {identity.strength}/4</span>
                      {identity.strands.map((s, i) => (
                        <span key={i} className="bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded text-[10px]">
                          {s.provider}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Attestation status */}
                  <div className="text-xs text-gray-500">
                    <span className="text-purple-400">&#10003;</span> Auto-attesting generated content to BSV
                  </div>

                  {attestation?.status === 'pending' && (
                    <div className="flex items-center gap-2 text-xs text-yellow-400">
                      <div className="animate-spin rounded-full h-3 w-3 border border-yellow-400 border-t-transparent" />
                      Signing to chain...
                    </div>
                  )}
                  {attestation?.status === 'done' && attestation.txid && (
                    <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-2 text-xs">
                      <div className="text-green-400 font-bold mb-1">Recorded on-chain</div>
                      <a
                        href={`https://whatsonchain.com/tx/${attestation.txid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-300/60 hover:text-green-300 font-mono break-all"
                      >
                        {attestation.txid.slice(0, 16)}...{attestation.txid.slice(-8)}
                      </a>
                    </div>
                  )}
                  {attestation?.status === 'error' && (
                    <div className="text-xs text-red-400">Attestation failed — wallet may have rejected</div>
                  )}
                </div>
              )}
            </div>

            {/* Manual attest button when wallet connected but no auto-attest happened */}
            {wallet.connected && generatedImage?.contentHash && !attestation && !attesting && (
              <button
                onClick={() => generatedImage.contentHash && attestImage(generatedImage.contentHash)}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm uppercase tracking-wider bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/40 text-purple-300 transition-all"
              >
                Record This Image On-Chain
              </button>
            )}

            {/* DNA Lineage */}
            {lineageDepth > 0 && (
              <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h2 className="text-lg font-bold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-red-400">&#9783;</span> DNA Lineage
                </h2>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-mono">Tape Depth</span>
                    <span className="text-white font-mono">{lineageDepth} generation{lineageDepth !== 1 ? 's' : ''}</span>
                  </div>
                  {lineageRootId && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-mono">Root ID</span>
                      <span className="text-red-400 font-mono text-[10px]">{lineageRootId.slice(0, 12)}...</span>
                    </div>
                  )}
                  {/* Show tape entries */}
                  {dnaTape.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {dnaTape.slice(-5).map((entry, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px]">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            entry.contentType === 'image' ? 'bg-blue-400' :
                            entry.contentType === 'video' ? 'bg-pink-400' :
                            'bg-green-400'
                          }`} />
                          <span className="text-gray-600 font-mono">{entry.contentType}</span>
                          <span className="text-gray-500 truncate flex-1">{entry.look}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-700 mt-2">
                    Each generation extends the DNA tape. Animate or generate again to grow the lineage.
                    All content is inscribed on-chain — you own 50% of IP revenue.
                  </p>
                </div>
              </div>
            )}

            {/* Quick info */}
            <div className="bg-black/40 rounded-xl p-4 border border-white/5 text-xs text-gray-600 space-y-1">
              <p>Every image is unique — random wardrobe, hair, scene, angle.</p>
              <p>Poster titles are baked into downloads.</p>
              <p>Animate sends your actual poster to Wan 2.2 video AI.</p>
              {wallet.connected && <p className="text-purple-400">$401 attestation: SHA-256 hash → OP_RETURN → BSV chain.</p>}
              {lineageDepth > 0 && <p className="text-red-400">DNA tape active — {lineageDepth} generation{lineageDepth !== 1 ? 's' : ''} deep.</p>}
            </div>
          </div>

          {/* Right Panel — Image Display */}
          <div className="lg:col-span-3">
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">

              {/* Video result */}
              {videoUrl && (
                <div className="relative">
                  <video
                    src={videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full aspect-[2/3] object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-pink-600 text-white text-xs font-bold px-2 py-1 rounded">
                    ANIMATED
                  </div>
                  <div className="p-4 flex gap-3">
                    <button
                      onClick={async () => {
                        try {
                          const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(videoUrl!)}`
                          const res = await fetch(proxyUrl)
                          const blob = await res.blob()
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `NPGX-${char?.name.replace(/\s+/g, '-')}-animated.mp4`
                          document.body.appendChild(a)
                          a.click()
                          document.body.removeChild(a)
                          URL.revokeObjectURL(url)
                        } catch {
                          window.open(videoUrl!, '_blank')
                        }
                      }}
                      className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-4 rounded-lg transition-all text-sm uppercase tracking-wider text-center"
                    >
                      Download Video
                    </button>
                    <button
                      onClick={() => { setVideoUrl(null); setAnimationStatus('idle') }}
                      className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-lg transition-all text-sm"
                    >
                      Back to Image
                    </button>
                  </div>
                </div>
              )}

              {/* Generated poster */}
              {generatedImage && !videoUrl ? (
                <div className="relative">
                  <div className="relative aspect-[2/3] bg-black">
                    {/* On-chain attestation badge */}
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
                    <MagazineCoverOverlay
                      characterName={char?.name || ''}
                      katakana={char?.katakana}
                      token={char?.token || ''}
                      tagline={char?.tagline}
                      imageUrl={generatedImage.url}
                      showOverlay={true}
                      variant="standard"
                      className="w-full h-full"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="p-4 flex gap-3 flex-wrap">
                    <button
                      onClick={downloadPoster}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-all text-sm uppercase tracking-wider"
                    >
                      Download Poster
                    </button>
                    <button
                      onClick={animateImage}
                      disabled={isAnimating}
                      className={`flex-1 font-bold py-3 px-4 rounded-lg transition-all text-sm uppercase tracking-wider ${
                        isAnimating
                          ? 'bg-pink-800 cursor-not-allowed text-pink-300'
                          : 'bg-pink-600 hover:bg-pink-700 text-white'
                      }`}
                    >
                      {isAnimating ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></span>
                          {animationStatus === 'pending' ? 'Animating...' : 'Starting...'}
                        </span>
                      ) : (
                        'Animate'
                      )}
                    </button>
                    <button
                      onClick={copyPrompt}
                      className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-lg transition-all text-sm"
                    >
                      {copied ? 'Copied!' : 'Prompt'}
                    </button>
                    <button
                      onClick={generate}
                      disabled={isGenerating}
                      className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-lg transition-all text-sm"
                    >
                      Again
                    </button>
                  </div>

                  {/* Show prompt used */}
                  {generatedImage.prompt && (
                    <div className="px-4 pb-2">
                      <details className="text-xs text-gray-600">
                        <summary className="cursor-pointer hover:text-gray-400 uppercase tracking-wider font-bold">Prompt used</summary>
                        <pre className="mt-2 p-3 bg-black/60 rounded-lg text-gray-500 whitespace-pre-wrap break-words max-h-32 overflow-y-auto font-mono text-[10px]">{generatedImage.prompt}</pre>
                      </details>
                    </div>
                  )}

                  {animationStatus === 'pending' && (
                    <div className="px-4 pb-4">
                      <div className="p-3 bg-pink-900/30 border border-pink-500/30 rounded-lg text-center text-sm text-pink-300">
                        <p>Generating video... this takes 30-60 seconds. Stay on this page.</p>
                        {videoAction && <p className="text-xs text-pink-400/60 mt-1 italic">Action: {videoAction}</p>}
                      </div>
                    </div>
                  )}
                  {animationStatus === 'error' && (
                    <>
                      {/* RESTRICTED stamp overlay on the poster */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                        <svg viewBox="0 0 400 160" className="w-[80%] max-w-[500px] opacity-80 -rotate-12">
                          <rect x="4" y="4" width="392" height="152" rx="12" fill="none" stroke="#DC143C" strokeWidth="8" strokeDasharray="0" />
                          <rect x="12" y="12" width="376" height="136" rx="8" fill="rgba(0,0,0,0.6)" stroke="#DC143C" strokeWidth="3" />
                          <text x="200" y="95" textAnchor="middle" fontFamily="Impact, Arial Black, sans-serif" fontSize="72" fontWeight="900" fill="#DC143C" letterSpacing="8">RESTRICTED</text>
                          <text x="200" y="130" textAnchor="middle" fontFamily="Courier New, monospace" fontSize="16" fill="rgba(220,20,60,0.6)" letterSpacing="2">CONTENT MODERATION</text>
                        </svg>
                      </div>
                      <div className="px-4 pb-4">
                        <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-sm text-red-300">
                          <p className="font-bold text-center mb-1">Animation blocked</p>
                          {error && <p className="text-xs text-red-400/80 text-center">{error}</p>}
                          <p className="text-xs text-red-400/50 text-center mt-1">Try generating a new image and animating again</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : !videoUrl ? (
                <div className="aspect-[2/3] relative overflow-hidden bg-black">
                  {/* Hero poster image for selected character */}
                  {char && !isGenerating && (
                    <>
                      <img
                        key={char.slug}
                        src={`/content/${char.slug}/images/portrait/${char.slug}-hero.jpg`}
                        alt={char.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to roster avatar if hero not found
                          (e.target as HTMLImageElement).src = char.image
                        }}
                      />
                      {/* Magazine-style overlay on hero */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
                      <div className="absolute top-4 left-4 right-4">
                        <h3 className="text-sm font-black text-white/60 uppercase tracking-[0.3em]" style={{ fontFamily: 'var(--font-brand)' }}>NINJA PUNK GIRLS</h3>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 p-6">
                        <h3 className="text-4xl font-black text-white uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-brand)' }}>{char.name}</h3>
                        <p className="text-red-400 font-mono text-sm mb-2">{char.token}</p>
                        <p className="text-gray-400 italic text-sm mb-4">&ldquo;{char.tagline}&rdquo;</p>
                        <p className="text-xs text-gray-600">Hit Generate Poster for a unique AI image</p>
                      </div>
                    </>
                  )}

                  {isGenerating && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                      {/* Faded hero as background during generation */}
                      {char && (
                        <img
                          src={`/content/${char.slug}/images/portrait/${char.slug}-hero.jpg`}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm"
                          onError={(e) => { (e.target as HTMLImageElement).src = char.image }}
                        />
                      )}
                      <div className="absolute inset-0 bg-black/60" />
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="relative mb-8">
                          <div className="w-32 h-32 rounded-full border-4 border-red-600/30 animate-ping absolute inset-0"></div>
                          <div className="w-32 h-32 rounded-full border-4 border-red-500 animate-spin" style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }}></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-4xl font-black font-[family-name:var(--font-brand)] text-red-500">{char?.letter}</span>
                          </div>
                        </div>
                        <h3 className="text-3xl font-black text-white uppercase tracking-wider mb-2 animate-pulse">GENERATING</h3>
                        <p className="text-lg text-red-400 font-bold mb-1">{char?.name}</p>
                        <p className="text-sm text-gray-500 italic mb-6">&ldquo;{char?.tagline}&rdquo;</p>
                        <div className="w-64 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="text-red-500">&#9632;</span> Building prompt...
                          </div>
                          <div className="h-1 bg-white/5 rounded overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-red-600 to-pink-500 rounded animate-pulse" style={{ width: '100%', animationDuration: '2s' }}></div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="animate-pulse text-red-500">&#9632;</span> Rendering NPGX house style...
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {copied && (
          <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-bold z-50">
            Prompt copied!
          </div>
        )}
      </div>
    </div>
  )
}
