'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NPGX_ROSTER, ROSTER_BY_SLUG } from '@/lib/npgx-roster'
import { useWallet } from '@/hooks/useWallet'
import Image from 'next/image'
import type { Production } from '@/lib/production/types'

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

// ── Constants ────────────────────────────────────────────

const HOUSE_STYLE = 'photorealistic photograph, saturated colors against dark shadows, red and pink neon lighting wash, vignette, smoke, sweat on face, confrontational eye contact, mouth open tongue out or dirty knowing smile, heavy dark makeup black lipstick dramatic false lashes, face piercings dermal studs, visible tattoos everywhere, punk attitude rude energy, natural skin texture with subtle pores and light freckles, healthy glowing skin, oily skin catching light, film grain ISO 800, chromatic aberration, shallow depth of field bokeh, shot on Canon EOS R5 85mm f1.4 wide open, editorial fashion photography, not anime not cartoon not illustration not 3d render not airbrushed not glossy not HDR, 8k quality'

const SHOT_CONFIGS = [
  {
    type: 'Portrait',
    build: (name: string, soulPrompt: string) =>
      `${soulPrompt}, straight-on eye-level close-up, unflinching direct stare into lens, intimate, dark industrial warehouse, red neon strip lights, smoke machine haze, pigtails with pink ribbons punk undercut, huge thigh-length high heeled black PVC platform boots, tiny black latex micro g-string, heavy gold chain necklace, spiked collar choker, ${HOUSE_STYLE}`,
  },
  {
    type: 'Action Shot',
    build: (name: string, soulPrompt: string) =>
      `${soulPrompt}, low angle looking up at her, she towers over camera, dominant and powerful, neon-lit Tokyo alleyway at night rain-wet ground reflecting pink and red light, wild mohawk spiked up shaved sides, thigh-high black patent stiletto boots with buckles, black PVC harness bikini, latex fingerless gloves, layered gold chains, gas mask hanging around neck, ${HOUSE_STYLE}`,
  },
  {
    type: 'Poster',
    build: (name: string, soulPrompt: string) =>
      `${soulPrompt}, fisheye lens extreme close-up face filling frame lens distortion, black studio background single harsh red spotlight from above total darkness around edges, long black hair with neon pink streaks messy and wild, massive black platform PVC boots, black bondage tape criss-crossing barely covering, gold body chains draped everywhere, diamond collar, heavy latex fetish mask covering lower face ninja mask, ${HOUSE_STYLE}`,
  },
]

const FORMAT_OPTIONS = [
  { value: 'quick' as const, label: 'QUICK PACKAGE', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', desc: '3 images + trading cards', time: '~2 min', price: 49 },
  { value: 'standard' as const, label: 'STANDARD', icon: 'M9 18V5l12-2v13M6 18a3 3 0 100-6 3 3 0 000 6zM18 16a3 3 0 100-6 3 3 0 000 6z', desc: 'Images + song + karaoke + magazine + title card', time: '~5 min', price: 99 },
  { value: 'full' as const, label: 'FULL PRODUCTION', icon: 'M2 4a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4z', desc: 'Complete music video + all content + NFT mint', time: '~15 min', price: 199 },
]

// Stage mapping for the production timeline
// Three tiers: Quick ($49), Standard ($99), Full ($199)
const PRODUCTION_STAGES = [
  // === QUICK PACKAGE ($49) ===
  { key: 'photoshoot', label: 'PHOTOSHOOT', detail: '3 character images (portrait, action, poster)', tier: 'quick', link: '/gen' },
  { key: 'cards', label: 'TRADING CARDS', detail: '6-stat collectible card set', tier: 'quick', link: '/ninja-punk-girls' },

  // === STANDARD PACKAGE ($99) — includes Quick ===
  { key: 'writer', label: 'SCREENPLAY', detail: 'AI-written script and scene breakdown', tier: 'standard', link: '/prompt-gen' },
  { key: 'song', label: 'THEME SONG', detail: 'Original punk track composed by AI', tier: 'standard', link: '/album' },
  { key: 'karaoke', label: 'KARAOKE PASS', detail: 'Motion graphics lyrics clips for every line', tier: 'standard', link: '/music-video-editor' },
  { key: 'title-card', label: 'TITLE CARD', detail: 'Animated motion graphic title', tier: 'standard', link: '/motion-graphics' },
  { key: 'magazine', label: 'MAGAZINE', detail: 'Editorial feature in NPGX Magazine', tier: 'standard', link: '/magazine' },

  // === FULL PRODUCTION ($199) — includes Standard ===
  { key: 'director', label: 'AI DIRECTOR', detail: 'Story motif → shot list synced to lyrics', tier: 'full', link: '/director' },
  { key: 'storyboard', label: 'STORYBOARD', detail: 'Visual storyboard with AI-generated frames', tier: 'full', link: '/storyboard' },
  { key: 'singing', label: 'SINGING PASS', detail: 'Lip-sync performance clips per lyric line', tier: 'full', link: '/music-video-editor' },
  { key: 'cinematic', label: 'CINEMATIC PASS', detail: 'Narrative story clips from director', tier: 'full', link: '/music-video-editor' },
  { key: 'video-producer', label: 'VIDEO ASSEMBLY', detail: 'Three-layer timeline edit + export', tier: 'full', link: '/movie-editor' },
  { key: 'vfx', label: 'VFX PASS', detail: 'Beat-synced VHS glitch effects layer', tier: 'full', link: '/watch' },
  { key: 'exchange', label: 'MINT & LIST', detail: 'NFT minted on Bitcoin, listed on Exchange', tier: 'full', link: '/exchange' },
]

// Map pipeline stage names to our timeline keys
function mapStageKey(stage: string): string {
  if (stage === 'director') return 'photoshoot' // director stage runs first during setup
  if (stage === 'shot-director') return 'writer' // shot director is part of screenplay phase
  return stage
}

type StageStatus = 'pending' | 'active' | 'done' | 'error'

interface StageState {
  status: StageStatus
  detail: string
}

interface GeneratedPackage {
  character: typeof NPGX_ROSTER[0]
  images: { url: string; type: string }[]
  script: string | null
  song: { title: string; lyrics: string } | null
}

type Mode = 'quick' | 'full'

// ── SVG Icons ────────────────────────────────────────────

const BoltIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-6 h-6 inline mr-2">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
)
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5 inline mr-2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
)
const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5 inline mr-2">
    <path d="M23 4v6h-6M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
)
const CheckIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
)
const XIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={className}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)
const SpinnerIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={`${className} animate-spin`}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
    <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
)
const DiamondIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 2l4 8-4 12-4-12z" />
  </svg>
)

// ── Component ────────────────────────────────────────────

export default function OneShotGenerator() {
  const [selectedSlug, setSelectedSlug] = useState('')
  const [mode, setMode] = useState<Mode | null>(null)

  // Quick Package state
  const [isGenerating, setIsGenerating] = useState(false)
  const [pkg, setPkg] = useState<GeneratedPackage | null>(null)
  const [step, setStep] = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Full Production state
  const [selectedFormat, setSelectedFormat] = useState<'quick' | 'standard' | 'full'>('standard')
  const [brief, setBrief] = useState('')
  const [isProducing, setIsProducing] = useState(false)
  const [stages, setStages] = useState<Record<string, StageState>>({})
  const [production, setProduction] = useState<Production | null>(null)
  const [productionError, setProductionError] = useState<string | null>(null)
  const [productionStartTime, setProductionStartTime] = useState<number | null>(null)
  const [productionElapsed, setProductionElapsed] = useState(0)
  const [scriptExpanded, setScriptExpanded] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // HandCash payment state
  const [handcashHandle, setHandcashHandle] = useState<string | null>(null)
  const [isPaying, setIsPaying] = useState(false)
  const [paymentTxId, setPaymentTxId] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // Wallet + on-chain attestation
  const { wallet, connecting, connect, attestContent } = useWallet()
  const [scriptAttestation, setScriptAttestation] = useState<{ txid: string; status: 'pending' | 'done' | 'error' } | null>(null)
  const [songAttestation, setSongAttestation] = useState<{ txid: string; status: 'pending' | 'done' | 'error' } | null>(null)
  const [scriptInscribing, setScriptInscribing] = useState(false)
  const [songInscribing, setSongInscribing] = useState(false)
  const [copiedScript, setCopiedScript] = useState(false)
  const [copiedSong, setCopiedSong] = useState(false)

  // SHA-256 hash helper
  const hashText = async (text: string): Promise<string> => {
    const buf = new TextEncoder().encode(text)
    const hash = await crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const copyScript = async () => {
    if (!pkg?.script) return
    await navigator.clipboard.writeText(pkg.script)
    setCopiedScript(true)
    setTimeout(() => setCopiedScript(false), 2000)
  }

  const copySong = async () => {
    if (!pkg?.song) return
    const text = `${pkg.song.title}\n\n${pkg.song.lyrics}`
    await navigator.clipboard.writeText(text)
    setCopiedSong(true)
    setTimeout(() => setCopiedSong(false), 2000)
  }

  const inscribeContent = async (
    content: string,
    contentType: string,
    description: string,
    setAttestation: typeof setScriptAttestation,
    setInscribingState: typeof setScriptInscribing,
  ) => {
    const handle = getCookie('npgx_user_handle')
    const token = getCookie('npgx_handcash_token')

    setInscribingState(true)
    setAttestation({ txid: '', status: 'pending' })

    try {
      // Pay $0.05 for inscription
      if (handle && token) {
        const payRes = await fetch('/api/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: `NPGX inscription — ${description}`,
            amount: 0.05,
            currency: 'USD',
          }),
        })
        if (!payRes.ok) {
          const payData = await payRes.json()
          throw new Error(payData.error || 'Payment failed')
        }
      }

      // Attest on chain
      const contentHash = await hashText(content)
      const result = await attestContent({
        contentHash,
        contentType,
        description,
        slug: selectedSlug || pkg?.character?.slug,
      })

      if (result?.txid) {
        setAttestation({ txid: result.txid, status: 'done' })
      } else {
        // Fallback: store via API even without wallet tx
        const attestRes = await fetch('/api/content/attest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txid: `local-${contentHash.slice(0, 16)}`,
            contentHash,
            contentType,
            description,
            slug: selectedSlug || pkg?.character?.slug,
          }),
        })
        if (attestRes.ok) {
          const data = await attestRes.json()
          setAttestation({ txid: data.txid, status: 'done' })
        } else {
          setAttestation({ txid: '', status: 'error' })
        }
      }
    } catch {
      setAttestation({ txid: '', status: 'error' })
    } finally {
      setInscribingState(false)
    }
  }

  // Check HandCash login on mount
  useEffect(() => {
    const handle = getCookie('npgx_user_handle')
    setHandcashHandle(handle)
  }, [])

  const selectedCharacter = selectedSlug ? ROSTER_BY_SLUG[selectedSlug] : null

  // Pick random character if none selected
  const getCharacter = () => {
    if (selectedSlug) return NPGX_ROSTER.find(c => c.slug === selectedSlug)!
    return NPGX_ROSTER[Math.floor(Math.random() * NPGX_ROSTER.length)]
  }

  // ── Quick Package Generate ──────────────────────────────

  const generate = async () => {
    setIsGenerating(true)
    setProgress(0)
    setPkg(null)
    setError(null)

    const character = getCharacter()
    const images: { url: string; type: string }[] = []

    try {
      let soulPrompt = `${character.name}, young Japanese woman, slim, tattooed, edgy punk attitude, seductive`
      try {
        const soulRes = await fetch(`/souls/${character.slug}.json`)
        if (soulRes.ok) {
          const soul = await soulRes.json()
          if (soul?.generation?.promptPrefix) soulPrompt = soul.generation.promptPrefix
        }
      } catch {}

      for (let i = 0; i < SHOT_CONFIGS.length; i++) {
        const shot = SHOT_CONFIGS[i]
        setStep(`Generating ${shot.type.toLowerCase()} (${i + 1}/3)...`)
        setProgress(10 + i * 25)

        try {
          const res = await fetch('/api/generate-image-npgx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slug: character.slug,
              prompt: shot.build(character.name, soulPrompt),
              width: 1024,
              height: 1536,
            }),
          })
          const data = await res.json()
          if (data.imageUrl) {
            images.push({ url: data.imageUrl, type: shot.type })
          } else {
            images.push({ url: character.image, type: `${shot.type} (fallback)` })
          }
        } catch {
          images.push({ url: character.image, type: `${shot.type} (fallback)` })
        }
      }

      setStep('Writing movie script...')
      setProgress(80)
      let script: string | null = null
      try {
        const res = await fetch('/api/generate-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ character: { name: character.name, codename: character.token, attributes: { element: character.category, style: character.category } } }),
        })
        const data = await res.json()
        if (data.success && data.script) script = data.script
      } catch {}

      setStep('Composing theme song...')
      setProgress(90)
      let song: { title: string; lyrics: string } | null = null
      try {
        const res = await fetch('/api/generate-song', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ character: { name: character.name, codename: character.token, attributes: { element: character.category, style: character.category } } }),
        })
        const data = await res.json()
        if (data.success && data.song) song = data.song
      } catch {}

      setProgress(100)
      setStep('Complete!')
      setPkg({ character, images, script, song })

      // Save to user library (localStorage) for /user/account
      saveToLibrary(character, images, script, song)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  /** Persist generated content to localStorage so it shows in /user/account */
  const saveToLibrary = (
    character: typeof NPGX_ROSTER[0],
    images: { url: string; type: string }[],
    script: string | null,
    song: { title: string; lyrics: string } | null,
  ) => {
    try {
      // Save images
      const existingImages = JSON.parse(localStorage.getItem('npgx_library_images') || '[]')
      images.forEach(img => {
        if (img.url && !img.url.includes('fallback')) {
          existingImages.unshift({
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'image',
            title: `${character.name} — ${img.type}`,
            thumbnail: img.url,
            createdAt: new Date().toISOString(),
            character: character.name,
          })
        }
      })
      localStorage.setItem('npgx_library_images', JSON.stringify(existingImages.slice(0, 100)))

      // Save script
      if (script) {
        const existingScripts = JSON.parse(localStorage.getItem('npgx_library_scripts') || '[]')
        existingScripts.unshift({
          id: `script-${Date.now()}`,
          type: 'script',
          title: `${character.name} — Screenplay`,
          createdAt: new Date().toISOString(),
          character: character.name,
        })
        localStorage.setItem('npgx_library_scripts', JSON.stringify(existingScripts.slice(0, 50)))
      }

      // Save song
      if (song) {
        const existingMusic = JSON.parse(localStorage.getItem('npgx_library_music') || '[]')
        existingMusic.unshift({
          id: `song-${Date.now()}`,
          type: 'song',
          title: `${character.name} — ${song.title}`,
          createdAt: new Date().toISOString(),
          character: character.name,
        })
        localStorage.setItem('npgx_library_music', JSON.stringify(existingMusic.slice(0, 50)))
      }

      // Save production record
      const existingProductions = JSON.parse(localStorage.getItem('npgx_library_productions') || '[]')
      existingProductions.unshift({
        id: `prod-${Date.now()}`,
        type: 'production',
        title: `${character.name} — Quick Package`,
        thumbnail: images[0]?.url,
        createdAt: new Date().toISOString(),
        character: character.name,
      })
      localStorage.setItem('npgx_library_productions', JSON.stringify(existingProductions.slice(0, 50)))
    } catch {
      // localStorage full or unavailable — silent fail
    }
  }

  /** Save full production results to localStorage for /user/account */
  const saveFullProductionToLibrary = (prod: { id: string; slug: string; character: string; format: string; content: { step: string; type: string; url?: string; error?: string }[]; createdAt: string }) => {
    try {
      const char = ROSTER_BY_SLUG[prod.slug]
      if (!char) return

      // Extract content from production
      const photoItems = prod.content.filter(c => c.step === 'photoshoot' && c.url)
      const scriptItem = prod.content.find(c => c.step === 'screenplay')
      const songItem = prod.content.find(c => c.step === 'theme-song')
      const magazineItem = prod.content.find(c => c.step === 'magazine')
      const cardsItem = prod.content.find(c => c.step === 'trading-cards')

      // Save images
      if (photoItems.length > 0) {
        const existing = JSON.parse(localStorage.getItem('npgx_library_images') || '[]')
        photoItems.forEach(p => {
          existing.unshift({
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'image',
            title: `${char.name} — ${p.type}`,
            thumbnail: p.url,
            createdAt: new Date().toISOString(),
            character: char.name,
          })
        })
        localStorage.setItem('npgx_library_images', JSON.stringify(existing.slice(0, 100)))
      }

      // Save script
      if (scriptItem && !scriptItem.error) {
        const existing = JSON.parse(localStorage.getItem('npgx_library_scripts') || '[]')
        existing.unshift({
          id: `script-${Date.now()}`,
          type: 'script',
          title: `${char.name} — Full Production Script`,
          createdAt: new Date().toISOString(),
          character: char.name,
        })
        localStorage.setItem('npgx_library_scripts', JSON.stringify(existing.slice(0, 50)))
      }

      // Save song
      if (songItem && !songItem.error) {
        const existing = JSON.parse(localStorage.getItem('npgx_library_music') || '[]')
        existing.unshift({
          id: `song-${Date.now()}`,
          type: 'song',
          title: `${char.name} — Theme Song`,
          createdAt: new Date().toISOString(),
          character: char.name,
        })
        localStorage.setItem('npgx_library_music', JSON.stringify(existing.slice(0, 50)))
      }

      // Save magazine
      if (magazineItem && !magazineItem.error) {
        const existing = JSON.parse(localStorage.getItem('npgx_library_magazines') || '[]')
        existing.unshift({
          id: `mag-${Date.now()}`,
          type: 'magazine',
          title: `${char.name} — Magazine Issue`,
          thumbnail: photoItems[0]?.url,
          createdAt: new Date().toISOString(),
          character: char.name,
        })
        localStorage.setItem('npgx_library_magazines', JSON.stringify(existing.slice(0, 50)))
      }

      // Save cards
      if (cardsItem && !cardsItem.error) {
        const existing = JSON.parse(localStorage.getItem('npgx_library_cards') || '[]')
        existing.unshift({
          id: `card-${Date.now()}`,
          type: 'card',
          title: `${char.name} — Trading Cards`,
          thumbnail: photoItems[0]?.url,
          createdAt: new Date().toISOString(),
          character: char.name,
        })
        localStorage.setItem('npgx_library_cards', JSON.stringify(existing.slice(0, 50)))
      }

      // Save production record
      const existingProductions = JSON.parse(localStorage.getItem('npgx_library_productions') || '[]')
      existingProductions.unshift({
        id: prod.id,
        type: 'production',
        title: `${char.name} — Full Production (${prod.format})`,
        thumbnail: photoItems[0]?.url,
        createdAt: prod.createdAt,
        character: char.name,
      })
      localStorage.setItem('npgx_library_productions', JSON.stringify(existingProductions.slice(0, 50)))
    } catch {
      // silent fail
    }
  }

  const downloadJSON = () => {
    if (!pkg) return
    const blob = new Blob([JSON.stringify({
      character: { name: pkg.character.name, token: pkg.character.token, slug: pkg.character.slug, tagline: pkg.character.tagline, category: pkg.character.category },
      images: pkg.images.map(i => ({ type: i.type })),
      script: pkg.script,
      song: pkg.song,
      generatedAt: new Date().toISOString(),
      type: 'NPGX One-Shot Package',
    }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `npgx-${pkg.character.slug}-oneshot.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Full Production ─────────────────────────────────────

  const startTimer = useCallback(() => {
    const start = Date.now()
    setProductionStartTime(start)
    timerRef.current = setInterval(() => {
      setProductionElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const updateStage = useCallback((key: string, status: StageStatus, detail: string) => {
    setStages(prev => ({ ...prev, [key]: { status, detail } }))
  }, [])

  // HandCash payment + production start
  const startProduction = async () => {
    const character = getCharacter()
    setSelectedSlug(character.slug)
    setPaymentError(null)

    // Step 1: Check HandCash login
    if (!handcashHandle) {
      // Redirect to HandCash login, return to /one-shot after
      window.location.href = `/api/auth/handcash?returnTo=/one-shot`
      return
    }

    // Step 2: Charge $99 via HandCash
    setIsPaying(true)
    try {
      const payRes = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 99,
          description: `NPGX One-Shot Full Production — ${character.name} (${character.token})`,
        }),
      })
      const payData = await payRes.json()

      if (!payRes.ok || !payData.success) {
        setPaymentError(payData.error || 'Payment failed — try again')
        setIsPaying(false)
        return
      }

      setPaymentTxId(payData.txId)
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Payment failed')
      setIsPaying(false)
      return
    }
    setIsPaying(false)

    // Step 3: Payment succeeded — start production
    setIsProducing(true)
    setProduction(null)
    setProductionError(null)
    setScriptExpanded(false)

    // Initialize all stages as pending
    const initial: Record<string, StageState> = {}
    PRODUCTION_STAGES.forEach(s => {
      initial[s.key] = { status: 'pending', detail: s.detail }
    })
    setStages(initial)
    startTimer()

    // Mark photoshoot as active immediately
    updateStage('photoshoot', 'active', 'Setting up the shoot...')

    try {
      const res = await fetch('/api/produce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: character.slug,
          format: selectedFormat,
          brief: brief || undefined,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''
      let lastActiveStage = 'photoshoot'

      // Track which stages have been seen active to mark them done
      const seenActive = new Set<string>(['photoshoot'])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const msg = JSON.parse(line)

            if (msg.type === 'progress') {
              const mappedKey = mapStageKey(msg.stage)

              // Find which timeline stage this maps to
              const stageIndex = PRODUCTION_STAGES.findIndex(s => s.key === mappedKey)
              if (stageIndex >= 0) {
                const stageKey = PRODUCTION_STAGES[stageIndex].key

                // Mark previous active stages as done
                if (stageKey !== lastActiveStage) {
                  // Mark everything before this stage as done
                  for (let i = 0; i < stageIndex; i++) {
                    const prevKey = PRODUCTION_STAGES[i].key
                    if (seenActive.has(prevKey)) {
                      updateStage(prevKey, 'done', 'Complete')
                    }
                  }
                  lastActiveStage = stageKey
                  seenActive.add(stageKey)
                }

                updateStage(stageKey, 'active', msg.detail)
              }
            } else if (msg.type === 'complete') {
              // Mark all stages done
              PRODUCTION_STAGES.forEach(s => {
                updateStage(s.key, 'done', 'Complete')
              })
              setProduction(msg.production)
              stopTimer()
              // Save full production to user library
              saveFullProductionToLibrary(msg.production)
            } else if (msg.type === 'error') {
              // Mark current active stage as error
              updateStage(lastActiveStage, 'error', msg.error)
              setProductionError(msg.error)
              stopTimer()
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    } catch (err) {
      setProductionError(err instanceof Error ? err.message : 'Production failed')
      stopTimer()
    } finally {
      setIsProducing(false)
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const resetAll = () => {
    setPkg(null)
    setProduction(null)
    setProductionError(null)
    setStages({})
    setProgress(0)
    setStep('')
    setError(null)
    setMode(null)
    setBrief('')
    setIsProducing(false)
    setIsGenerating(false)
    setProductionElapsed(0)
    stopTimer()
  }

  // ── Determine view state ────────────────────────────────

  const showSelector = !isGenerating && !pkg && !isProducing && !production
  const showQuickProgress = isGenerating
  const showQuickResult = !!pkg
  const showProductionTimeline = isProducing || (!!production && !pkg)
  const showProductionResult = !!production && !isProducing

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ══ HEADER ══ */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-wide font-[family-name:var(--font-brand)] bg-gradient-to-r from-white via-red-300 to-red-600 bg-clip-text text-transparent mb-2">
              ONE-SHOT STUDIO
            </h1>
            <p className="text-sm uppercase tracking-[0.3em] text-red-500/60 font-bold mb-6">
              NPGX Production Pipeline
            </p>
          </motion.div>

          {showSelector && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              {/* Character Selector */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-bold">Select Character</label>
                <select
                  value={selectedSlug}
                  onChange={(e) => setSelectedSlug(e.target.value)}
                  className="w-full max-w-md mx-auto block p-3 bg-black/60 border border-white/10 rounded-lg text-white focus:border-red-500 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="">Random character</option>
                  {NPGX_ROSTER.map((char) => (
                    <option key={char.slug} value={char.slug}>
                      {char.letter}. {char.name} — {char.token}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected character preview */}
              <AnimatePresence>
                {selectedCharacter && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4 max-w-md mx-auto"
                  >
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <Image src={selectedCharacter.image} alt={selectedCharacter.name} fill className="object-cover" unoptimized />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-white">{selectedCharacter.name}</p>
                      <p className="text-red-400 text-sm font-bold">{selectedCharacter.token}</p>
                      <p className="text-gray-500 text-xs">{selectedCharacter.tagline}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mode Buttons */}
              <div className="max-w-2xl mx-auto">
                <motion.button
                  onClick={() => { setMode('full'); setSelectedFormat('full') }}
                  className="relative w-full bg-gradient-to-br from-red-950/40 to-black border-2 border-red-500/40 rounded-2xl p-10 sm:p-12 text-center transition-all hover:border-red-500/80 hover:from-red-950/60 group overflow-hidden"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/5 to-transparent -skew-x-12 group-hover:animate-pulse" />
                  <div className="relative">
                    <div className="font-[family-name:var(--font-brand)] text-red-500 text-7xl sm:text-8xl mb-3">$99</div>
                    <h3 className="text-3xl sm:text-4xl font-black text-white uppercase mb-4 tracking-wider font-[family-name:var(--font-brand)]">ONE SHOT</h3>
                    <p className="text-base text-white/60 mb-6 max-w-lg mx-auto leading-relaxed">
                      Pick your girl. We produce everything — photoshoot, trading cards, screenplay, theme song, karaoke lyrics video, animated title card, magazine feature, AI-directed music video with singing + cinematic passes, VFX, and an NFT minted on Bitcoin.
                    </p>
                    <div className="grid grid-cols-3 gap-2 mb-6 text-[10px] uppercase tracking-wider">
                      <div className="bg-white/5 border border-white/10 rounded py-1.5 text-white/40">Photoshoot</div>
                      <div className="bg-white/5 border border-white/10 rounded py-1.5 text-white/40">Trading Cards</div>
                      <div className="bg-white/5 border border-white/10 rounded py-1.5 text-white/40">Screenplay</div>
                      <div className="bg-white/5 border border-white/10 rounded py-1.5 text-white/40">Theme Song</div>
                      <div className="bg-white/5 border border-white/10 rounded py-1.5 text-white/40">Karaoke Video</div>
                      <div className="bg-white/5 border border-white/10 rounded py-1.5 text-white/40">Title Card</div>
                      <div className="bg-white/5 border border-white/10 rounded py-1.5 text-white/40">Magazine</div>
                      <div className="bg-white/5 border border-white/10 rounded py-1.5 text-white/40">Music Video</div>
                      <div className="bg-white/5 border border-white/10 rounded py-1.5 text-white/40">VFX + NFT</div>
                    </div>
                    <div className="text-red-400 font-black uppercase tracking-widest text-lg group-hover:text-white transition-colors font-[family-name:var(--font-brand)]">
                      Start Production →
                    </div>
                    <div className="text-white/20 text-[9px] mt-2">One character. One click. Everything produced.</div>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>

        {/* ══ FULL PRODUCTION SETUP ══ */}
        <AnimatePresence>
          {mode === 'full' && !isProducing && !production && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto mb-12"
            >
              {/* Format Selector */}
              <div className="mb-8">
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-4 font-bold text-center">Production Format</label>
                <div className="grid grid-cols-3 gap-3">
                  {FORMAT_OPTIONS.map((fmt) => (
                    <motion.button
                      key={fmt.value}
                      onClick={() => setSelectedFormat(fmt.value)}
                      className={`relative rounded-xl p-4 text-left transition-all border ${
                        selectedFormat === fmt.value
                          ? 'bg-red-500/10 border-red-500/50 shadow-lg shadow-red-500/10'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`w-5 h-5 mb-2 ${selectedFormat === fmt.value ? 'text-red-400' : 'text-gray-500'}`}>
                        <path d={fmt.icon} />
                      </svg>
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-xs font-black uppercase ${selectedFormat === fmt.value ? 'text-red-400' : 'text-gray-400'}`}>{fmt.label}</p>
                        <span className={`text-sm font-black ${selectedFormat === fmt.value ? 'text-red-400' : 'text-white/60'}`}>${fmt.price}</span>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1">{fmt.desc}</p>
                      <p className="text-[10px] text-gray-700 mt-0.5">{fmt.time}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Creative Brief */}
              <div className="mb-8">
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-bold text-center">Creative Brief (Optional)</label>
                <textarea
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="e.g. Set in a neon-drenched Tokyo nightclub. She discovers a hidden message in the music..."
                  className="w-full p-4 bg-black/60 border border-white/10 rounded-xl text-white text-sm focus:border-red-500 focus:outline-none resize-none h-24 placeholder:text-gray-700"
                />
              </div>

              {/* PRODUCE button */}
              <div className="flex flex-col items-center gap-4">
                {paymentError && (
                  <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 mb-2">
                    {paymentError}
                  </div>
                )}

                {!handcashHandle ? (
                  <motion.button
                    onClick={() => { window.location.href = `/api/auth/handcash?returnTo=/one-shot` }}
                    className="relative bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 text-white font-black py-5 px-12 rounded-xl text-xl transition-all uppercase tracking-wider shadow-2xl shadow-green-500/20 overflow-hidden group"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="relative flex items-center gap-3">
                      SIGN IN WITH HANDCASH
                    </span>
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={startProduction}
                    disabled={isPaying}
                    className="relative bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-black py-5 px-12 rounded-xl text-xl transition-all uppercase tracking-wider shadow-2xl shadow-red-500/20 overflow-hidden group disabled:opacity-50"
                    whileHover={{ scale: isPaying ? 1 : 1.03 }}
                    whileTap={{ scale: isPaying ? 1 : 0.97 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                    <span className="relative flex items-center gap-3">
                      {isPaying ? (
                        <><SpinnerIcon className="w-6 h-6" /> PROCESSING PAYMENT...</>
                      ) : (
                        <><DiamondIcon /> PAY $99 & PRODUCE <DiamondIcon /></>
                      )}
                    </span>
                  </motion.button>
                )}

                {handcashHandle && (
                  <p className="text-xs text-gray-600">
                    Signed in as <span className="text-green-500 font-mono">${handcashHandle}</span> — payment via HandCash
                  </p>
                )}

                {paymentTxId && (
                  <p className="text-xs text-green-500 font-mono">
                    Payment TX: {paymentTxId.slice(0, 16)}...
                  </p>
                )}

                <button
                  onClick={resetAll}
                  className="text-gray-600 hover:text-gray-400 text-sm transition-colors"
                >
                  Back to options
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ PRODUCTION TIMELINE ══ */}
        <AnimatePresence>
          {(isProducing || (production && mode === 'full')) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto mb-12"
            >
              {/* Timer */}
              <div className="text-center mb-8">
                <p className="text-3xl font-black font-mono text-white tabular-nums">
                  {formatTime(productionElapsed)}
                </p>
                <p className="text-xs uppercase tracking-widest text-gray-600 mt-1">
                  {isProducing ? 'Producing' : 'Total Time'}
                </p>
              </div>

              {/* Vertical Timeline */}
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-6 top-0 bottom-0 w-px bg-white/10" />

                <div className="space-y-1">
                  {PRODUCTION_STAGES.filter(s => {
                    const tiers = selectedFormat === 'full' ? ['quick','standard','full'] : selectedFormat === 'standard' ? ['quick','standard'] : ['quick']
                    return tiers.includes(s.tier)
                  }).map((stage, i) => {
                    const state = stages[stage.key] || { status: 'pending' as StageStatus, detail: stage.detail }
                    return (
                      <motion.div
                        key={stage.key}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`relative flex items-start gap-4 pl-3 py-3 rounded-lg transition-colors ${
                          state.status === 'active' ? 'bg-red-500/5' : ''
                        }`}
                      >
                        {/* Status dot */}
                        <div className="relative z-10 flex-shrink-0 mt-0.5">
                          {state.status === 'pending' && (
                            <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-gray-700" />
                            </div>
                          )}
                          {state.status === 'active' && (
                            <div className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center">
                              <SpinnerIcon className="w-4 h-4 text-red-400" />
                            </div>
                          )}
                          {state.status === 'done' && (
                            <div className="w-7 h-7 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                              <CheckIcon className="w-3.5 h-3.5 text-green-400" />
                            </div>
                          )}
                          {state.status === 'error' && (
                            <div className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center">
                              <XIcon className="w-3.5 h-3.5 text-red-400" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-black uppercase tracking-wider ${
                            state.status === 'active' ? 'text-red-400' :
                            state.status === 'done' ? 'text-green-400/80' :
                            state.status === 'error' ? 'text-red-400/80' :
                            'text-gray-600'
                          }`}>
                            {stage.label}
                          </p>
                          <p className={`text-xs mt-0.5 truncate ${
                            state.status === 'active' ? 'text-gray-400' :
                            state.status === 'done' ? 'text-gray-600' :
                            'text-gray-700'
                          }`}>
                            {state.detail}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>

              {/* Production Error */}
              {productionError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center"
                >
                  <p className="text-red-400 text-sm">{productionError}</p>
                  <button onClick={resetAll} className="mt-3 text-xs text-gray-500 hover:text-white transition-colors underline">
                    Try Again
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ FULL PRODUCTION RESULT ══ */}
        <AnimatePresence>
          {showProductionResult && mode === 'full' && production && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="max-w-6xl mx-auto"
            >
              {/* Hero */}
              <div className="text-center mb-10">
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.4 }}
                >
                  <p className="text-xs uppercase tracking-[0.4em] text-red-500/60 font-bold mb-2">NPGX Productions Presents</p>
                  <h2 className="text-3xl md:text-5xl font-black text-white uppercase font-[family-name:var(--font-brand)] mb-2">
                    {production.title}
                  </h2>
                  <p className="text-lg text-red-400 font-bold">{production.character}</p>
                  {production.script?.logline && (
                    <p className="text-gray-400 text-sm mt-2 max-w-xl mx-auto italic">{production.script.logline}</p>
                  )}
                  <div className="flex items-center justify-center gap-3 mt-4">
                    <span className="text-[10px] uppercase tracking-wider bg-red-500/10 text-red-400 px-3 py-1 rounded-full font-bold border border-red-500/20">{production.format}</span>
                    <span className="text-[10px] uppercase tracking-wider bg-white/5 text-gray-400 px-3 py-1 rounded-full font-bold border border-white/10">{production.script?.genre}</span>
                  </div>
                </motion.div>
              </div>

              {/* Photoshoot Gallery — use shot list stills or character images */}
              {production.videos.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-4 text-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 inline mr-2 text-red-400">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    Production Stills
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {production.shotList.slice(0, 3).map((shot, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
                      >
                        <div className="relative aspect-video bg-gradient-to-br from-red-950/20 to-black flex items-center justify-center">
                          <p className="text-[10px] text-gray-600 uppercase tracking-wider text-center px-4">{shot.concept}</p>
                        </div>
                        <div className="p-3">
                          <p className="text-[10px] font-bold text-gray-500 uppercase">Scene {shot.sceneNumber} / Shot {shot.shotNumber}</p>
                          <p className="text-xs text-gray-400 mt-1 truncate">{shot.action}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Script Section */}
              {production.script && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mb-10"
                >
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-4 text-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 inline mr-2 text-red-400">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14,2 14,8 20,8" />
                    </svg>
                    Screenplay — {production.script.scenes.length} Scenes
                  </h3>
                  <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setScriptExpanded(!scriptExpanded)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">{production.script.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{production.script.logline}</p>
                      </div>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`w-5 h-5 text-gray-500 transition-transform ${scriptExpanded ? 'rotate-180' : ''}`}
                      >
                        <polyline points="6,9 12,15 18,9" />
                      </svg>
                    </button>
                    <AnimatePresence>
                      {scriptExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 pt-0 space-y-4 max-h-[600px] overflow-y-auto">
                            {production.script.scenes.map((scene) => (
                              <div key={scene.sceneNumber} className="bg-black/30 rounded-lg p-4">
                                <div className="flex items-baseline gap-2 mb-2">
                                  <span className="text-red-400 text-[10px] font-black">SCENE {scene.sceneNumber}</span>
                                  <span className="text-white text-sm font-bold">{scene.title}</span>
                                  <span className="text-gray-600 text-[10px] uppercase">{scene.location} — {scene.timeOfDay}</span>
                                </div>
                                <p className="text-xs text-gray-400 mb-3">{scene.description}</p>
                                {scene.dialogue.map((d, di) => (
                                  <div key={di} className="ml-4 mb-2">
                                    <p className="text-[10px] font-black text-red-400/60 uppercase">{d.character}</p>
                                    <p className="text-xs text-gray-300 italic">{d.line}</p>
                                    {d.direction && <p className="text-[10px] text-gray-600">({d.direction})</p>}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {/* Video Section */}
              {production.videos.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="mb-10"
                >
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-4 text-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 inline mr-2 text-red-400">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <polygon points="10,8 16,12 10,16" fill="currentColor" />
                    </svg>
                    Video Clips — {production.videos.filter(v => v.status === 'done').length}/{production.videos.length}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {production.videos.map((vid, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                        {vid.status === 'done' && vid.videoUrl ? (
                          <video
                            src={vid.videoUrl}
                            controls
                            className="w-full aspect-video bg-black"
                            preload="metadata"
                          />
                        ) : (
                          <div className="aspect-video bg-gradient-to-br from-red-950/10 to-black flex items-center justify-center">
                            {vid.status === 'generating' ? (
                              <SpinnerIcon className="w-8 h-8 text-red-400/40" />
                            ) : vid.status === 'error' ? (
                              <div className="text-center">
                                <XIcon className="w-6 h-6 text-red-500/40 mx-auto" />
                                <p className="text-[10px] text-red-500/40 mt-1">Failed</p>
                              </div>
                            ) : (
                              <div className="text-center">
                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 mx-auto flex items-center justify-center">
                                  <div className="w-2 h-2 rounded-full bg-gray-700" />
                                </div>
                                <p className="text-[10px] text-gray-700 mt-1">Queued</p>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-gray-500 uppercase">Scene {vid.sceneNumber} / Shot {vid.shotNumber}</p>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              vid.status === 'done' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                              vid.status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              vid.status === 'generating' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                              'bg-white/5 text-gray-600 border border-white/10'
                            }`}>
                              {vid.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-600 mt-1">{vid.provider} / {vid.duration}s / ${vid.cost.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Magazine Section */}
              {production.magazineCoverage && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mb-10"
                >
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-4 text-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 inline mr-2 text-red-400">
                      <path d="M4 19V5a2 2 0 012-2h8.5L20 8.5V19a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
                      <polyline points="14,3 14,9 20,9" />
                    </svg>
                    Magazine Coverage
                  </h3>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <h4 className="text-xl font-black text-white uppercase font-[family-name:var(--font-brand)] mb-4">{production.magazineCoverage.headline}</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-red-400/60 uppercase mb-1">Behind the Scenes</p>
                        <p className="text-sm text-gray-300 leading-relaxed">{production.magazineCoverage.behindTheScenes}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-red-400/60 uppercase mb-1">Director Interview</p>
                        <p className="text-sm text-gray-300 leading-relaxed">{production.magazineCoverage.directorInterview}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Song Section — placeholder since full production may not include song yet */}

              {/* Trading Cards Section — placeholder */}

              {/* Stats Bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="mb-10"
              >
                <div className="bg-gradient-to-r from-red-950/20 via-white/5 to-red-950/20 border border-white/10 rounded-xl p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div>
                      <p className="text-2xl font-black text-white font-mono">${production.totalCost.toFixed(2)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mt-1">Total Cost</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-white font-mono">
                        {(production.script?.scenes.length || 0) + production.videos.length + (production.magazineCoverage ? 1 : 0) + production.shotList.length}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mt-1">Items Generated</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-white font-mono">{formatTime(productionElapsed)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mt-1">Time Taken</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-white font-mono">{production.errors.length}</p>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mt-1">Errors</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Actions */}
              <div className="flex justify-center gap-4 mb-8">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="bg-white/10 hover:bg-white/15 text-white py-3 px-6 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border border-white/10"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(production, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `npgx-${production.slug}-production.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  <DownloadIcon />
                  Download Package
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={resetAll}
                  className="bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                >
                  <RefreshIcon />
                  New Production
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ QUICK PACKAGE PROGRESS ══ */}
        {showQuickProgress && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto mb-12"
          >
            <div className="bg-white/5 rounded-xl p-8 border border-white/10">
              <div className="text-center mb-6">
                <p className="text-white font-bold text-lg mb-1">Generating Package</p>
                <p className="text-red-400 text-sm">{step}</p>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 mb-3">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-gray-500 text-sm">{progress}%</p>
            </div>
          </motion.div>
        )}

        {/* ══ QUICK PACKAGE ERROR ══ */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
            <p className="text-red-400">{error}</p>
            <button onClick={resetAll} className="mt-3 text-xs text-gray-500 hover:text-white transition-colors underline">
              Try Again
            </button>
          </div>
        )}

        {/* ══ QUICK PACKAGE RESULT ══ */}
        {showQuickResult && pkg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >
            {/* Character header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-white uppercase font-[family-name:var(--font-brand)]">
                {pkg.character.name}
              </h2>
              <p className="text-red-400 font-bold">{pkg.character.token}</p>
              <p className="text-gray-500 text-sm mt-1">{pkg.character.tagline}</p>
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={downloadJSON}
                  className="bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg text-sm font-bold transition-all"
                >
                  <DownloadIcon />
                  Download JSON
                </button>
                <button
                  onClick={resetAll}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-sm font-bold transition-all"
                >
                  <RefreshIcon />
                  Generate Another
                </button>
              </div>
            </div>

            {/* Images */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {pkg.images.map((img, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
                >
                  <div className="relative aspect-[2/3]">
                    <Image
                      src={img.url}
                      alt={`${pkg.character.name} — ${img.type}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-gray-400 uppercase">{img.type}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Script + Song */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ── Movie Script ── */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-red-400">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <polygon points="10,8 16,12 10,16" fill="currentColor" />
                    </svg>
                    Movie Script
                  </h3>
                  {scriptAttestation?.status === 'done' && scriptAttestation.txid && (
                    <a
                      href={`https://whatsonchain.com/tx/${scriptAttestation.txid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-purple-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 hover:bg-purple-500 transition-colors"
                    >
                      <span>&#9670;</span> ON-CHAIN
                    </a>
                  )}
                </div>
                {pkg.script ? (
                  <>
                    <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto bg-black/30 p-4 rounded-lg">
                      {pkg.script}
                    </pre>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={copyScript}
                        className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
                          copiedScript
                            ? 'bg-green-600 text-white'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        {copiedScript ? 'Copied!' : 'Copy Script'}
                      </button>
                      {scriptAttestation?.status === 'done' ? (
                        <a
                          href={`https://whatsonchain.com/tx/${scriptAttestation.txid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 px-3 rounded-lg font-bold text-xs uppercase tracking-wider text-center bg-green-900/30 border border-green-500/20 text-green-400 hover:bg-green-900/50 transition-all"
                        >
                          View on Chain
                        </a>
                      ) : (
                        <button
                          onClick={() => inscribeContent(
                            pkg.script!,
                            'text/script',
                            `${pkg.character.name} movie script`,
                            setScriptAttestation,
                            setScriptInscribing,
                          )}
                          disabled={scriptInscribing}
                          className="flex-1 py-2 px-3 rounded-lg font-bold text-xs uppercase tracking-wider bg-purple-600 hover:bg-purple-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          {scriptInscribing ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                              Inscribing...
                            </>
                          ) : scriptAttestation?.status === 'error' ? (
                            'Retry Inscription'
                          ) : (
                            <>Inscribe — $0.05</>
                          )}
                        </button>
                      )}
                    </div>
                    {scriptAttestation?.status === 'pending' && (
                      <div className="flex items-center gap-2 text-xs text-yellow-400 mt-2">
                        <div className="animate-spin rounded-full h-3 w-3 border border-yellow-400 border-t-transparent" />
                        Signing to chain...
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-600 text-sm italic">Script generation unavailable — API key may not be configured.</p>
                )}
              </div>

              {/* ── Theme Song ── */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-red-400">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                    Theme Song
                  </h3>
                  {songAttestation?.status === 'done' && songAttestation.txid && (
                    <a
                      href={`https://whatsonchain.com/tx/${songAttestation.txid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-purple-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 hover:bg-purple-500 transition-colors"
                    >
                      <span>&#9670;</span> ON-CHAIN
                    </a>
                  )}
                </div>
                {pkg.song ? (
                  <>
                    <div>
                      <p className="text-red-400 font-bold text-sm mb-2">{pkg.song.title}</p>
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto bg-black/30 p-4 rounded-lg">
                        {pkg.song.lyrics}
                      </pre>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={copySong}
                        className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
                          copiedSong
                            ? 'bg-green-600 text-white'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        {copiedSong ? 'Copied!' : 'Copy Lyrics'}
                      </button>
                      {songAttestation?.status === 'done' ? (
                        <a
                          href={`https://whatsonchain.com/tx/${songAttestation.txid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 px-3 rounded-lg font-bold text-xs uppercase tracking-wider text-center bg-green-900/30 border border-green-500/20 text-green-400 hover:bg-green-900/50 transition-all"
                        >
                          View on Chain
                        </a>
                      ) : (
                        <button
                          onClick={() => inscribeContent(
                            `${pkg.song!.title}\n\n${pkg.song!.lyrics}`,
                            'text/lyrics',
                            `${pkg.character.name} theme song — ${pkg.song!.title}`,
                            setSongAttestation,
                            setSongInscribing,
                          )}
                          disabled={songInscribing}
                          className="flex-1 py-2 px-3 rounded-lg font-bold text-xs uppercase tracking-wider bg-purple-600 hover:bg-purple-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          {songInscribing ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                              Inscribing...
                            </>
                          ) : songAttestation?.status === 'error' ? (
                            'Retry Inscription'
                          ) : (
                            <>Inscribe — $0.05</>
                          )}
                        </button>
                      )}
                    </div>
                    {songAttestation?.status === 'pending' && (
                      <div className="flex items-center gap-2 text-xs text-yellow-400 mt-2">
                        <div className="animate-spin rounded-full h-3 w-3 border border-yellow-400 border-t-transparent" />
                        Signing to chain...
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-600 text-sm italic">Song generation unavailable — API key may not be configured.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
