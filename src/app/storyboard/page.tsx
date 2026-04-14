'use client'

import { useState, useCallback, useEffect } from 'react'
import { NPGX_ROSTER, type NPGXCharacter } from '@/lib/npgx-roster'
import { ALBUMS, type Track, type Album } from '@/lib/albums'
import Image from 'next/image'

// ── Pricing tiers ──
const TIERS = [
  { id: 'add-clips', name: 'Add Clips', price: 49, desc: 'Add your clips to an existing video', icon: '➕' },
  { id: 'new-sfw', name: 'New Video', price: 99, desc: 'Create a whole new SFW music video', icon: '🎬' },
  { id: 'new-xx', name: 'New XX', price: 149, desc: 'Create a new XX rated version', icon: '🔥' },
  { id: 'new-xxx', name: 'New XXX', price: 199, desc: 'Create a new XXX uncensored version', icon: '💎' },
]

// ── Scenario templates ──
const SCENARIOS = [
  { id: 'performance', name: 'Live Performance', icon: '🎸', desc: 'On stage — singing, playing instruments, crowd energy', clipTypes: ['screaming into mic', 'playing guitar solo', 'drumming aggressive', 'playing bass groove', 'headbanging', 'crowd surfing', 'jumping off stage', 'power stance'] },
  { id: 'dance', name: 'Dance', icon: '💃', desc: 'Club, street, rooftop — movement and rhythm', clipTypes: ['dancing aggressively in club', 'street dancing under neon signs', 'rooftop dancing at night city skyline', 'dancing in rain'] },
  { id: 'romance', name: 'Romance', icon: '💋', desc: 'Intimacy, tension, longing between characters', clipTypes: ['two girls face to face intense eye contact', 'holding hands walking neon alley', 'sharing cigarette backstage', 'nose to nose about to kiss', 'embracing in rain'] },
  { id: 'heartbreak', name: 'Heartbreak', icon: '💔', desc: 'Loss, anger, tears, destruction', clipTypes: ['smashing guitar against wall', 'screaming at sky in rain', 'crying in dressing room mirror', 'burning photographs', 'walking away down empty street'] },
  { id: 'scifi', name: 'Sci-Fi', icon: '🚀', desc: 'Cyberpunk Tokyo, holograms, neon dystopia', clipTypes: ['walking through holographic billboard street', 'interfacing with floating screens', 'riding motorcycle through neon tunnel', 'standing on skyscraper edge cyberpunk city', 'hacking terminal in dark room'] },
  { id: 'chase', name: 'Chase / Fight', icon: '⚔️', desc: 'Running, fighting, escaping through Tokyo', clipTypes: ['sprinting through neon alley', 'parkour across rooftops', 'fight scene underground club', 'motorcycle chase Tokyo highway', 'escaping through crowded Shibuya'] },
  { id: 'lost-item', name: 'The Lost Item', icon: '🔑', desc: 'Searching for something precious through the city', clipTypes: ['searching frantically through drawers', 'running through rain looking', 'asking strangers in neon-lit street', 'finding object in unexpected place', 'holding precious item close'] },
  { id: 'backstage', name: 'Backstage', icon: '🚬', desc: 'Pre/post show — raw, real, intimate', clipTypes: ['tuning guitar on amp', 'smoking in corridor', 'applying makeup in mirror', 'collapsed on couch post-show', 'drinking beer in dressing room'] },
  { id: 'nightlife', name: 'Tokyo Nightlife', icon: '🌃', desc: 'Clubs, bars, streets, convenience stores at 3AM', clipTypes: ['drinking at tiny bar counter', 'walking through Kabukicho neon', 'convenience store at 3AM fluorescent light', 'karaoke booth singing', 'taxi ride through city lights'] },
  { id: 'rebellion', name: 'Rebellion', icon: '🔥', desc: 'Protest, graffiti, breaking rules', clipTypes: ['spray painting wall', 'smashing TV with bat', 'standing on burning car', 'tearing down posters', 'middle finger at security camera'] },
]

// ── Visual styles ──
const STYLES = [
  { id: 'music-video', name: 'Music Video', icon: '🎬', desc: 'Concert footage, neon lighting, smoke, Canon EOS R5, film grain ISO 800',
    suffix: 'photorealistic photograph, film grain ISO 800, chromatic aberration, shot on Canon EOS R5, raw unedited photograph, concert photography, neon lighting, smoke, 8k quality',
    neg: 'not anime not cartoon not illustration not 3d render not airbrushed not glossy not HDR, not male not masculine' },
  { id: 'anime', name: 'Anime', icon: '🎌', desc: 'Japanese animation style, cel-shaded, vibrant colors, dynamic poses',
    suffix: 'anime style, cel-shaded, vibrant saturated colors, dynamic action pose, detailed anime face, Japanese animation, studio quality, clean linework, dramatic lighting, 4K',
    neg: 'photorealistic, photograph, film grain, blurry, low quality, deformed, western cartoon, 3d render, male, masculine' },
  { id: 'game', name: 'Video Game', icon: '🎮', desc: 'Unreal Engine look, volumetric lighting, character select screen energy',
    suffix: 'Unreal Engine 5 render, volumetric lighting, ray tracing, subsurface scattering, character portrait, video game cinematic, AAA quality, dramatic rim light, depth of field, 4K',
    neg: 'blurry, low quality, deformed, anime, cartoon, photograph, film grain, male, masculine' },
  { id: 'cinema', name: 'Cinema', icon: '🎥', desc: 'Cinematic film look, anamorphic lens flares, 2.39:1 energy, Blade Runner vibes',
    suffix: 'cinematic film still, anamorphic lens flare, Arri Alexa, 35mm film, shallow depth of field, dramatic chiaroscuro lighting, color graded teal and orange, atmospheric haze, movie production quality, 8k',
    neg: 'anime, cartoon, illustration, 3d render, airbrushed, glossy, HDR, male, masculine, bright, overexposed' },
  { id: 'comic', name: 'Comic / Manga', icon: '📖', desc: 'Bold outlines, halftone dots, panel-like framing, pop art energy',
    suffix: 'comic book art style, bold black outlines, halftone dot shading, pop art colors, dynamic composition, manga-influenced, action lines, screen tone, high contrast, ink and color',
    neg: 'photorealistic, photograph, film grain, 3d render, blurry, male, masculine' },
  { id: 'noir', name: 'Noir', icon: '🌑', desc: 'Black and white, high contrast, shadows, femme fatale, detective film',
    suffix: 'film noir style, black and white, high contrast, dramatic shadows, venetian blind light, cigarette smoke, vintage 1940s aesthetic, femme fatale, moody atmospheric, silver gelatin print, grain',
    neg: 'color, bright, anime, cartoon, 3d render, male, masculine' },
  { id: 'vaporwave', name: 'Vaporwave', icon: '🌸', desc: 'Retro aesthetic, glitch art, pastel neon, 80s/90s nostalgia',
    suffix: 'vaporwave aesthetic, retro 80s neon, pastel pink and cyan, VHS glitch effects, grid floor, palm trees, sunset gradient, retro-futuristic, lo-fi, scanlines, nostalgic, dreamy',
    neg: 'photorealistic, dark, gritty, male, masculine, anime' },
]

// ── Character looks (from content library categories) ──
const LOOKS = [
  { id: 'punk', name: 'Punk', icon: '🎸', desc: 'Mohawks, leather, spikes, mosh pit energy', suffix: 'punk aesthetic, leather and spikes, aggressive pose, underground venue, neon lighting, dirty sweaty raw' },
  { id: 'rock', name: 'Rock', icon: '🤘', desc: 'Stage performance, guitars, amps, concert energy', suffix: 'rock performance aesthetic, electric guitar, amp stacks, stage lighting, concert energy, sweat and smoke' },
  { id: 'fetish', name: 'Fetish', icon: '⛓️', desc: 'PVC, latex, bondage, dark glamour', suffix: 'fetish fashion aesthetic, PVC latex leather, bondage accessories, dark glamour, dramatic shadows, provocative pose' },
  { id: 'street', name: 'Street', icon: '🏙️', desc: 'Tokyo streets, graffiti, urban grit', suffix: 'Tokyo street fashion, urban grit, graffiti walls, neon signs, wet pavement, convenience store glow, streetwear' },
  { id: 'glam', name: 'Glam', icon: '✨', desc: 'High fashion, editorial, beauty close-ups', suffix: 'high fashion editorial, beauty photography, perfect lighting, glamorous, magazine quality, striking pose' },
  { id: 'bw', name: 'B&W', icon: '🖤', desc: 'Black and white, high contrast, moody', suffix: 'black and white photography, high contrast, dramatic shadows, moody atmospheric, silver gelatin, grain' },
  { id: 'color', name: 'Color', icon: '🌈', desc: 'Vivid saturated color, neon, bold palette', suffix: 'vivid saturated colors, neon color palette, bold bright, color photography, striking color contrast' },
  { id: 'npgxmag', name: 'Magazine', icon: '📰', desc: 'NPGX magazine editorial, cover shoot energy', suffix: 'magazine editorial photography, cover shoot quality, styled and lit, fashion editorial, studio and location mixed' },
  { id: 'missvoid', name: 'Miss Void', icon: '🖤', desc: 'Dark gothic editorial, MISS VOID magazine style', suffix: 'dark gothic editorial, MISS VOID magazine aesthetic, black latex, dramatic cathedral lighting, candles, iron textures' },
]

// ── Clip roles ──
const ROLES = [
  { id: 'singer', name: 'Singer', icon: '🎤' },
  { id: 'guitarist', name: 'Guitarist', icon: '🎸' },
  { id: 'bassist', name: 'Bassist', icon: '🎸' },
  { id: 'drummer', name: 'Drummer', icon: '🥁' },
  { id: 'dj', name: 'DJ', icon: '🎧' },
  { id: 'dancer', name: 'Dancer', icon: '💃' },
  { id: 'lead', name: 'Lead (narrative)', icon: '⭐' },
  { id: 'support', name: 'Supporting', icon: '👥' },
]

interface CastMember {
  character: NPGXCharacter
  role: string
}

interface StoryboardSegment {
  segNum: number
  timeRange: string
  clipType: string
  characters: string[]
  prompt: string
}

interface SavedStoryboard {
  id: string
  name: string
  savedAt: string
  trackSlug: string
  trackTitle: string
  cast: Array<{ slug: string; name: string; role: string }>
  scenarios: string[]
  style?: string
  looks?: string[]
  segments: StoryboardSegment[]
  images: Record<number, string>
}

const STORAGE_KEY = 'npgx-storyboards'

function getSavedStoryboards(): SavedStoryboard[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

function saveStoryboard(sb: SavedStoryboard) {
  const all = getSavedStoryboards()
  const existing = all.findIndex(s => s.id === sb.id)
  if (existing >= 0) all[existing] = sb
  else all.unshift(sb)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

function deleteStoryboard(id: string) {
  const all = getSavedStoryboards().filter(s => s.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export default function StoryboardPage() {
  const [step, setStep] = useState<'song' | 'cast' | 'scenarios' | 'generate'>('song')
  const [selectedTrack, setSelectedTrack] = useState<{ album: Album; track: Track } | null>(null)
  const [cast, setCast] = useState<CastMember[]>([])
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>(['performance'])
  const [selectedStyle, setSelectedStyle] = useState('music-video')
  const [selectedLooks, setSelectedLooks] = useState<string[]>(['punk'])
  const [selectedTier, setSelectedTier] = useState('new-sfw')
  const [published, setPublished] = useState(false)
  const [storyboard, setStoryboard] = useState<StoryboardSegment[]>([])
  const [generating, setGenerating] = useState(false)
  const [storyboardImages, setStoryboardImages] = useState<Record<number, string>>({})
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape')
  const [generatingImages, setGeneratingImages] = useState(false)
  const [imageProgress, setImageProgress] = useState({ done: 0, total: 0 })
  const [generatingMovie, setGeneratingMovie] = useState(false)
  const [movieModel, setMovieModel] = useState('seedance')
  const [movieJobs, setMovieJobs] = useState<Array<{ index: number; jobId: string; status: string; filename: string }>>([])
  const [movieProgress, setMovieProgress] = useState({ done: 0, pending: 0, failed: 0 })
  const [savedList, setSavedList] = useState<SavedStoryboard[]>([])
  const [currentId, setCurrentId] = useState<string>('')

  // Load saved storyboards on mount
  useEffect(() => { setSavedList(getSavedStoryboards()) }, [])

  const handleSave = useCallback(() => {
    if (!selectedTrack || storyboard.length === 0) return
    const id = currentId || `sb-${Date.now()}`
    const name = `${selectedTrack.track.title} — ${cast.map(c => c.character.name.split(' ')[0]).join(', ')}`
    const sb: SavedStoryboard = {
      id, name,
      savedAt: new Date().toISOString(),
      trackSlug: selectedTrack.track.slug,
      trackTitle: selectedTrack.track.title,
      cast: cast.map(c => ({ slug: c.character.slug, name: c.character.name, role: c.role })),
      scenarios: selectedScenarios,
      style: selectedStyle,
      looks: selectedLooks,
      segments: storyboard,
      images: storyboardImages,
    }
    saveStoryboard(sb)
    setCurrentId(id)
    setSavedList(getSavedStoryboards())
  }, [selectedTrack, cast, selectedScenarios, storyboard, storyboardImages, currentId])

  const handleLoad = useCallback((sb: SavedStoryboard) => {
    // Restore track
    const trackMatch = ALBUMS.flatMap(a => a.tracks.map(t => ({ album: a, track: t }))).find(x => x.track.slug === sb.trackSlug)
    if (trackMatch) setSelectedTrack(trackMatch)
    // Restore cast
    const restoredCast: CastMember[] = sb.cast.map(c => {
      const char = NPGX_ROSTER.find(r => r.slug === c.slug)
      return char ? { character: char, role: c.role } : null
    }).filter(Boolean) as CastMember[]
    setCast(restoredCast)
    setSelectedScenarios(sb.scenarios)
    setSelectedStyle(sb.style || 'music-video')
    setSelectedLooks(sb.looks || ['punk'])
    setStoryboard(sb.segments)
    setStoryboardImages(sb.images || {})
    setCurrentId(sb.id)
    setStep('generate')
  }, [])

  const handleDelete = useCallback((id: string) => {
    deleteStoryboard(id)
    setSavedList(getSavedStoryboards())
    if (currentId === id) setCurrentId('')
  }, [currentId])

  // All playable tracks across albums
  const allTracks = ALBUMS.flatMap(album =>
    album.tracks.filter(t => t.status === 'recorded').map(t => ({ album, track: t }))
  )

  const toggleCast = (char: NPGXCharacter) => {
    setCast(prev => {
      const exists = prev.find(c => c.character.slug === char.slug)
      if (exists) return prev.filter(c => c.character.slug !== char.slug)
      return [...prev, { character: char, role: 'support' }]
    })
  }

  const setRole = (slug: string, role: string) => {
    setCast(prev => prev.map(c => c.character.slug === slug ? { ...c, role } : c))
  }

  const toggleLook = (id: string) => {
    setSelectedLooks(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id])
  }

  const toggleScenario = (id: string) => {
    setSelectedScenarios(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const generateImages = useCallback(async () => {
    if (storyboard.length === 0) return
    setGeneratingImages(true)
    setImageProgress({ done: 0, total: storyboard.length })

    // Generate 3 at a time to avoid overwhelming the API
    const batchSize = 3
    for (let i = 0; i < storyboard.length; i += batchSize) {
      const batch = storyboard.slice(i, i + batchSize)
      const promises = batch.map((seg, batchIdx) => {
        const idx = i + batchIdx
        return fetch('/api/storyboard/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: seg.prompt, index: idx, orientation }),
        })
          .then(r => r.json())
          .then(data => {
            if (data.imageUrl) {
              setStoryboardImages(prev => ({ ...prev, [idx]: data.imageUrl }))
            }
            setImageProgress(prev => ({ ...prev, done: prev.done + 1 }))
          })
          .catch(() => {
            setImageProgress(prev => ({ ...prev, done: prev.done + 1 }))
          })
      })
      await Promise.all(promises)
    }

    setGeneratingImages(false)
  }, [storyboard])

  const generateMovie = useCallback(async () => {
    if (!selectedTrack || storyboard.length === 0) return
    setGeneratingMovie(true)

    try {
      // Submit all segments for video generation
      const res = await fetch('/api/storyboard/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackSlug: selectedTrack.track.slug,
          segments: storyboard.map(s => ({ segNum: s.segNum, prompt: s.prompt, clipType: s.clipType })),
          model: movieModel,
          orientation,
        }),
      })

      if (!res.ok) { setGeneratingMovie(false); return }
      const data = await res.json()
      setMovieJobs(data.jobs)
      setMovieProgress({ done: 0, pending: data.submitted, failed: data.failed })

      // Poll for results
      let jobs = data.jobs
      const pollInterval = setInterval(async () => {
        const pending = jobs.filter((j: any) => j.status === 'pending')
        if (pending.length === 0) {
          clearInterval(pollInterval)
          setGeneratingMovie(false)
          return
        }

        try {
          const pollRes = await fetch('/api/storyboard/poll-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trackSlug: selectedTrack.track.slug, jobs }),
          })
          if (pollRes.ok) {
            const pollData = await pollRes.json()
            jobs = pollData.jobs
            setMovieJobs(pollData.jobs)
            setMovieProgress({ done: pollData.done, pending: pollData.pending, failed: pollData.failed })
          }
        } catch {}
      }, 15000)
    } catch {
      setGeneratingMovie(false)
    }
  }, [selectedTrack, storyboard, movieModel, orientation])

  const generateStoryboard = useCallback(async () => {
    if (!selectedTrack || cast.length === 0) return
    setGenerating(true)

    try {
      const res = await fetch('/api/storyboard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackSlug: selectedTrack.track.slug,
          trackTitle: selectedTrack.track.title,
          trackJapanese: selectedTrack.track.japanese,
          genre: selectedTrack.track.genre,
          bpm: selectedTrack.track.bpm,
          albumTitle: selectedTrack.album.title,
          cast: cast.map(c => ({ slug: c.character.slug, name: c.character.name, role: c.role })),
          scenarios: selectedScenarios,
          style: selectedStyle,
          looks: selectedLooks,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setStoryboard(data.segments)
        setStep('generate')
      }
    } catch (e) {
      console.error('Storyboard generation failed:', e)
    } finally {
      setGenerating(false)
    }
  }, [selectedTrack, cast, selectedScenarios])

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-brand)] text-4xl tracking-wider mb-2">STORYBOARD</h1>
          <p className="text-gray-500">Design your music video — pick a track, cast your girls, choose scenarios</p>
        </div>

        {/* Saved storyboards */}
        {savedList.length > 0 && (
          <div className="mb-6 border border-white/10 bg-white/5 p-3">
            <h3 className="font-[family-name:var(--font-brand)] text-xs text-white/40 uppercase tracking-wider mb-2">Saved Storyboards</h3>
            <div className="flex gap-2 flex-wrap">
              {savedList.map(sb => (
                <div key={sb.id} className={`flex items-center gap-1 border px-2 py-1 text-[10px] transition-all ${
                  currentId === sb.id ? 'border-green-500 bg-green-600/10 text-green-300' : 'border-white/10 bg-black/40 text-white/50 hover:text-white/80'
                }`}>
                  <button onClick={() => handleLoad(sb)} className="hover:text-white transition-colors">
                    {sb.name}
                  </button>
                  <span className="text-white/20 mx-1">|</span>
                  <span className="text-white/20">{new Date(sb.savedAt).toLocaleDateString()}</span>
                  <button onClick={() => handleDelete(sb.id)} className="ml-1 text-red-500/40 hover:text-red-400 transition-colors">×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step indicators + orientation toggle */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          {(['song', 'cast', 'scenarios', 'generate'] as const).map((s, i) => (
            <button key={s} onClick={() => setStep(s)}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-[family-name:var(--font-brand)] border transition-all ${
                step === s ? 'bg-red-600/20 border-red-500 text-red-300' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
              }`}>
              {i + 1}. {s}
            </button>
          ))}
          <div className="ml-auto flex gap-1">
            <button onClick={() => setOrientation('landscape')}
              className={`px-3 py-2 text-[10px] uppercase tracking-wider font-[family-name:var(--font-brand)] border transition-all ${
                orientation === 'landscape' ? 'bg-red-600/20 border-red-500 text-red-300' : 'bg-white/5 border-white/10 text-white/30'
              }`}>
              16:9
            </button>
            <button onClick={() => setOrientation('portrait')}
              className={`px-3 py-2 text-[10px] uppercase tracking-wider font-[family-name:var(--font-brand)] border transition-all ${
                orientation === 'portrait' ? 'bg-red-600/20 border-red-500 text-red-300' : 'bg-white/5 border-white/10 text-white/30'
              }`}>
              9:16
            </button>
          </div>
        </div>

        {/* STEP 1: Pick a song */}
        {step === 'song' && (
          <div>
            {/* Tier selection */}
            <h2 className="font-[family-name:var(--font-brand)] text-xl mb-3 text-red-400">WHAT DO YOU WANT TO CREATE?</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
              {TIERS.map(tier => (
                <button key={tier.id} onClick={() => setSelectedTier(tier.id)}
                  className={`text-left p-3 border transition-all ${
                    selectedTier === tier.id ? 'bg-red-600/20 border-red-500 ring-1 ring-red-500/50' : 'bg-white/5 border-white/10 hover:border-red-500/30'
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{tier.icon}</span>
                    <span className="font-[family-name:var(--font-brand)] text-white text-xs">{tier.name}</span>
                  </div>
                  <div className="font-[family-name:var(--font-brand)] text-red-400 text-lg">${tier.price}</div>
                  <p className="text-[10px] text-white/30 mt-1">{tier.desc}</p>
                </button>
              ))}
            </div>

            <h2 className="font-[family-name:var(--font-brand)] text-xl mb-4 text-red-400">PICK A TRACK</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allTracks.map(({ album, track }) => (
                <button key={track.slug} onClick={() => { setSelectedTrack({ album, track }); setStep('cast') }}
                  className={`text-left p-4 border transition-all hover:border-red-500/50 ${
                    selectedTrack?.track.slug === track.slug ? 'bg-red-600/20 border-red-500' : 'bg-white/5 border-white/10'
                  }`}>
                  <div className="font-[family-name:var(--font-brand)] text-white text-sm">{track.title}</div>
                  {track.japanese && <div className="text-white/40 text-xs mt-0.5">{track.japanese}</div>}
                  <div className="flex gap-2 mt-2 text-[10px] text-white/30">
                    <span>{track.genre}</span>
                    <span>{track.bpm} BPM</span>
                    <span className="text-red-500/50">{album.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Cast characters */}
        {step === 'cast' && (
          <div>
            <h2 className="font-[family-name:var(--font-brand)] text-xl mb-2 text-red-400">CAST YOUR GIRLS</h2>
            <p className="text-gray-500 text-sm mb-4">
              {selectedTrack && <span className="text-red-400">{selectedTrack.track.title}</span>}
              {' — '}Select characters and assign roles
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-6">
              {NPGX_ROSTER.filter(c => c.hasImages).map(char => {
                const inCast = cast.find(c => c.character.slug === char.slug)
                return (
                  <button key={char.slug} onClick={() => toggleCast(char)}
                    className={`relative p-2 border transition-all text-left ${
                      inCast ? 'bg-red-600/20 border-red-500 ring-1 ring-red-500/50' : 'bg-white/5 border-white/10 hover:border-red-500/30'
                    }`}>
                    <div className="aspect-square relative mb-1 overflow-hidden bg-black/50">
                      <Image src={char.image} alt={char.name} fill className="object-cover" sizes="150px" />
                    </div>
                    <div className="font-[family-name:var(--font-brand)] text-[10px] text-white truncate">{char.name.split(' ')[0]}</div>
                    <div className="text-[9px] text-white/30">{char.token}</div>
                    {inCast && <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full" />}
                  </button>
                )
              })}
            </div>

            {/* Role assignment for selected cast */}
            {cast.length > 0 && (
              <div className="border border-white/10 bg-white/5 p-4 mb-4">
                <h3 className="font-[family-name:var(--font-brand)] text-sm text-white/60 mb-3">ASSIGN ROLES</h3>
                {cast.map(member => (
                  <div key={member.character.slug} className="flex items-center gap-3 mb-2">
                    <span className="text-white text-sm w-32 truncate">{member.character.name.split(' ')[0]}</span>
                    <div className="flex gap-1 flex-wrap">
                      {ROLES.map(role => (
                        <button key={role.id} onClick={() => setRole(member.character.slug, role.id)}
                          className={`px-2 py-0.5 text-[10px] border transition-all ${
                            member.role === role.id ? 'bg-red-600/20 border-red-500 text-red-300' : 'bg-black/40 border-white/10 text-white/30 hover:text-white/50'
                          }`}>
                          {role.icon} {role.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={() => setStep('scenarios')}
                  className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-[family-name:var(--font-brand)] text-sm uppercase tracking-wider transition-all">
                  Next: Scenarios →
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Pick scenarios */}
        {step === 'scenarios' && (
          <div>
            {/* Style + Looks — compact row */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div>
                <span className="font-[family-name:var(--font-brand)] text-[10px] text-white/40 uppercase tracking-wider">Style</span>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {STYLES.map(s => (
                    <button key={s.id} onClick={() => setSelectedStyle(s.id)}
                      className={`px-2 py-1 text-[10px] border transition-all ${
                        selectedStyle === s.id ? 'bg-red-600/20 border-red-500 text-red-300' : 'bg-black/40 border-white/10 text-white/30 hover:text-white/50'
                      }`}>
                      {s.icon} {s.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-[family-name:var(--font-brand)] text-[10px] text-white/40 uppercase tracking-wider">Looks</span>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {LOOKS.map(l => (
                    <button key={l.id} onClick={() => toggleLook(l.id)}
                      className={`px-2 py-1 text-[10px] border transition-all ${
                        selectedLooks.includes(l.id) ? 'bg-red-600/20 border-red-500 text-red-300' : 'bg-black/40 border-white/10 text-white/30 hover:text-white/50'
                      }`}>
                      {l.icon} {l.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scenarios */}
            <h2 className="font-[family-name:var(--font-brand)] text-sm mb-2 text-red-400">SCENARIOS</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {SCENARIOS.map(scenario => (
                <button key={scenario.id} onClick={() => toggleScenario(scenario.id)}
                  className={`text-left p-4 border transition-all ${
                    selectedScenarios.includes(scenario.id) ? 'bg-red-600/20 border-red-500' : 'bg-white/5 border-white/10 hover:border-red-500/30'
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{scenario.icon}</span>
                    <span className="font-[family-name:var(--font-brand)] text-sm text-white">{scenario.name}</span>
                  </div>
                  <p className="text-[11px] text-white/40">{scenario.desc}</p>
                </button>
              ))}
            </div>

            <button onClick={generateStoryboard} disabled={generating}
              className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 text-white font-[family-name:var(--font-brand)] text-sm uppercase tracking-wider transition-all">
              {generating ? 'Generating storyboard...' : `Generate Storyboard — $${TIERS.find(t => t.id === selectedTier)?.price || 99} →`}
            </button>
          </div>
        )}

        {/* STEP 4: Generated storyboard */}
        {step === 'generate' && storyboard.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-[family-name:var(--font-brand)] text-xl text-red-400">
                STORYBOARD — {selectedTrack?.track.title}
              </h2>
              <div className="flex gap-2 flex-wrap">
                <button onClick={handleSave}
                  className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider border border-green-500 transition-all">
                  {currentId ? 'Update Save' : 'Save Storyboard'}
                </button>
                <button onClick={generateImages} disabled={generatingImages}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 text-white text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider border border-red-500 transition-all">
                  {generatingImages ? `Generating images ${imageProgress.done}/${imageProgress.total}...` : `Generate Storyboard Images (~$${(storyboard.length * 0.021).toFixed(2)})`}
                </button>
                <button onClick={() => {
                  const text = storyboard.map((s, i) =>
                    `--- ${i + 1}/${storyboard.length} | SAVE AS: ${selectedTrack?.track.slug}-${s.clipType.split(' ')[0].toLowerCase()}-${String(s.segNum).padStart(2, '0')}.mp4 ---\n${s.prompt}\n`
                  ).join('\n')
                  navigator.clipboard.writeText(text)
                }}
                  className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider border border-white/10 transition-all">
                  Copy All Prompts
                </button>
                <button onClick={() => setStep('scenarios')}
                  className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 text-xs border border-white/10 transition-all">
                  ← Back
                </button>
              </div>
              {/* Generate Movie bar */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <select value={movieModel} onChange={e => setMovieModel(e.target.value)}
                  className="bg-black/60 border border-white/10 text-white text-[10px] px-2 py-1.5 font-[family-name:var(--font-brand)]">
                  <option value="seedance-fast">Seedance Fast ($0.018/clip)</option>
                  <option value="seedance">Seedance ($0.044/clip)</option>
                  <option value="wan-t2v">Wan 2.6 ($0.07/clip)</option>
                  <option value="kling-std">Kling 3.0 Std ($0.15/clip)</option>
                  <option value="kling-pro">Kling 3.0 Pro ($0.20/clip)</option>
                </select>
                <button onClick={generateMovie} disabled={generatingMovie}
                  className="px-6 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/30 text-white text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider border border-purple-500 transition-all">
                  {generatingMovie
                    ? `Generating movie ${movieProgress.done}/${movieProgress.done + movieProgress.pending}...`
                    : `Generate Movie (${storyboard.length} clips)`}
                </button>
                {movieProgress.done > 0 && (
                  <span className="text-[10px] text-green-400">{movieProgress.done} done</span>
                )}
                {movieProgress.failed > 0 && (
                  <span className="text-[10px] text-red-400">{movieProgress.failed} failed</span>
                )}
                {movieProgress.done > 0 && !generatingMovie && selectedTrack && (
                  <>
                    <a href={`/watch/${selectedTrack.track.slug}`}
                      className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider border border-white/10 transition-all">
                      Watch →
                    </a>
                    {!published && (
                      <button onClick={() => {
                        // Save listing to localStorage exchange
                        const listings = JSON.parse(localStorage.getItem('npgx-exchange-listings') || '[]')
                        listings.push({
                          id: `vid-${Date.now()}`,
                          type: 'video',
                          title: `${selectedTrack.track.title} — ${cast.map(c => c.character.name.split(' ')[0]).join(', ')}`,
                          creator: 'You',
                          price: TIERS.find(t => t.id === selectedTier)?.price || 99,
                          tier: selectedTier,
                          trackSlug: selectedTrack.track.slug,
                          clipCount: movieProgress.done,
                          thumbnail: `/og/${selectedTrack.track.slug}.png`,
                          createdAt: new Date().toISOString(),
                        })
                        localStorage.setItem('npgx-exchange-listings', JSON.stringify(listings))
                        setPublished(true)
                      }}
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider border border-green-500 transition-all">
                        Publish to Exchange
                      </button>
                    )}
                    {published && (
                      <span className="text-[10px] text-green-400">Published to Exchange ✓</span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="text-xs text-white/30 mb-4">
              {cast.map(c => `${c.character.name.split(' ')[0]} (${c.role})`).join(' • ')}
              {' • '}{selectedScenarios.length} scenarios • {storyboard.length} clips
            </div>

            <div className={`grid gap-3 ${orientation === 'portrait' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {storyboard.map((seg, i) => (
                <div key={i} className="border border-white/10 bg-white/5 hover:border-red-500/30 transition-all overflow-hidden">
                  {/* Image */}
                  <div className={`${orientation === 'portrait' ? 'aspect-[9/16]' : 'aspect-video'} bg-black/80 relative`}>
                    {storyboardImages[i] ? (
                      <img src={storyboardImages[i]} alt={`Segment ${i + 1}`} className="w-full h-full object-cover" />
                    ) : generatingImages ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-400" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white/10 text-[10px] font-[family-name:var(--font-brand)]">
                        NO IMAGE
                      </div>
                    )}
                    <div className="absolute top-1 left-1 bg-black/70 px-1.5 py-0.5 text-[9px] font-[family-name:var(--font-brand)] text-red-400">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    {movieJobs[i] && (
                      <div className={`absolute bottom-1 left-1 px-1.5 py-0.5 text-[8px] font-[family-name:var(--font-brand)] ${
                        movieJobs[i].status === 'done' ? 'bg-green-600/80 text-white' :
                        movieJobs[i].status === 'pending' ? 'bg-yellow-600/80 text-white animate-pulse' :
                        'bg-red-600/80 text-white'
                      }`}>
                        {movieJobs[i].status === 'done' ? 'VIDEO ✓' : movieJobs[i].status === 'pending' ? 'GENERATING...' : 'FAILED'}
                      </div>
                    )}
                    <div className="absolute top-1 right-1 bg-black/70 px-1.5 py-0.5 text-[9px] text-white/40">
                      {seg.timeRange}
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/30 text-[9px]">{seg.clipType}</span>
                      <div className="flex gap-1">
                        {seg.characters.map(c => (
                          <span key={c} className="px-1 py-0.5 bg-red-600/10 border border-red-500/20 text-red-300 text-[8px]">{c}</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-white/40 text-[10px] leading-relaxed line-clamp-2">{seg.prompt.slice(0, 120)}...</p>
                    <button onClick={() => navigator.clipboard.writeText(seg.prompt)}
                      className="mt-1 text-[8px] text-white/20 hover:text-red-400 transition-colors">
                      Copy prompt
                    </button>
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
