'use client'

import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react'
import type { Title3DSettings, MaterialPreset, LightingPreset, CameraMode, ParticleType, AnimationType, SceneType } from '@/components/Title3DScene'

const Title3DScene = lazy(() => import('@/components/Title3DScene'))

// ─── Types ───────────────────────────────────────────────────────────────────

type FontPreset = 'punk' | 'neon' | 'elegant' | 'graffiti' | 'cyber' | 'manga' | 'condensed' | 'stencil' | 'script' | 'pixel' | 'gothic' | 'display' | 'slab' | 'wide' | 'thin' | 'brush'
type LayoutType = 'magazine-cover' | 'movie-title' | 'chapter-heading' | 'logo-brand' | 'credits'
type TextTransform = 'uppercase' | 'lowercase' | 'capitalize' | 'none'
type BgMode = 'transparent' | 'black' | 'character'

interface TextLayer {
  id: string
  text: string
  preset: FontPreset
  fontSize: number
  letterSpacing: number
  color: string
  strokeEnabled: boolean
  strokeColor: string
  strokeWidth: number
  shadowEnabled: boolean
  shadowColor: string
  shadowBlur: number
  shadowDx: number
  shadowDy: number
  textTransform: TextTransform
  rotation: number
  scaleX: number
  scaleY: number
  skewX: number
  opacity: number
  visible: boolean
  locked: boolean
  blendMode: string
  x: number
  y: number
}

interface SavedDesign {
  id: string
  name: string
  timestamp: number
  layers: TextLayer[]
  layoutType: LayoutType
  bgMode: BgMode
  bgCharacterSlug: string
  canvasWidth: number
  canvasHeight: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FONT_PRESETS: Record<FontPreset, { label: string; fontFamily: string; fontWeight: string; fontStyle: string; extra: React.CSSProperties }> = {
  punk: {
    label: 'PUNK',
    fontFamily: 'Impact, "Arial Black", sans-serif',
    fontWeight: '900',
    fontStyle: 'italic',
    extra: { paintOrder: 'stroke fill' },
  },
  neon: {
    label: 'NEON',
    fontFamily: 'var(--font-brand), "Orbitron", monospace',
    fontWeight: '700',
    fontStyle: 'normal',
    extra: {},
  },
  elegant: {
    label: 'ELEGANT',
    fontFamily: '"Georgia", "Times New Roman", serif',
    fontWeight: '300',
    fontStyle: 'normal',
    extra: {},
  },
  graffiti: {
    label: 'GRAFFITI',
    fontFamily: 'var(--font-graffiti), "Permanent Marker", cursive',
    fontWeight: '400',
    fontStyle: 'normal',
    extra: {},
  },
  cyber: {
    label: 'CYBER',
    fontFamily: '"Courier New", "Lucida Console", monospace',
    fontWeight: '700',
    fontStyle: 'normal',
    extra: {},
  },
  manga: {
    label: 'MANGA',
    fontFamily: 'Impact, "Arial Black", "Helvetica Neue", sans-serif',
    fontWeight: '900',
    fontStyle: 'normal',
    extra: {},
  },
  condensed: {
    label: 'CONDENSED',
    fontFamily: '"Arial Narrow", "Helvetica Neue", Impact, sans-serif',
    fontWeight: '700',
    fontStyle: 'normal',
    extra: {},
  },
  stencil: {
    label: 'STENCIL',
    fontFamily: '"Stencil Std", "Arial Black", Impact, sans-serif',
    fontWeight: '900',
    fontStyle: 'normal',
    extra: { paintOrder: 'stroke fill' },
  },
  script: {
    label: 'SCRIPT',
    fontFamily: '"Brush Script MT", "Segoe Script", cursive',
    fontWeight: '400',
    fontStyle: 'italic',
    extra: {},
  },
  pixel: {
    label: 'PIXEL',
    fontFamily: '"Courier New", "Lucida Console", monospace',
    fontWeight: '900',
    fontStyle: 'normal',
    extra: {},
  },
  gothic: {
    label: 'GOTHIC',
    fontFamily: '"Copperplate", "Palatino Linotype", serif',
    fontWeight: '700',
    fontStyle: 'normal',
    extra: {},
  },
  display: {
    label: 'DISPLAY',
    fontFamily: '"Trebuchet MS", "Gill Sans", "Century Gothic", sans-serif',
    fontWeight: '700',
    fontStyle: 'normal',
    extra: {},
  },
  slab: {
    label: 'SLAB',
    fontFamily: '"Rockwell", "Courier New", "Courier", serif',
    fontWeight: '800',
    fontStyle: 'normal',
    extra: {},
  },
  wide: {
    label: 'WIDE',
    fontFamily: '"Arial Black", "Helvetica Neue", sans-serif',
    fontWeight: '900',
    fontStyle: 'normal',
    extra: { letterSpacing: '0.15em' } as React.CSSProperties,
  },
  thin: {
    label: 'THIN',
    fontFamily: '"Helvetica Neue", "Segoe UI", Arial, sans-serif',
    fontWeight: '100',
    fontStyle: 'normal',
    extra: {},
  },
  brush: {
    label: 'BRUSH',
    fontFamily: 'var(--font-graffiti), "Permanent Marker", "Marker Felt", cursive',
    fontWeight: '700',
    fontStyle: 'normal',
    extra: { paintOrder: 'stroke fill' },
  },
}

const BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion'] as const

const LAYOUT_TYPES: { id: LayoutType; label: string; icon: string }[] = [
  { id: 'magazine-cover', label: 'Magazine Cover', icon: 'M' },
  { id: 'movie-title', label: 'Movie Title', icon: 'F' },
  { id: 'chapter-heading', label: 'Chapter Heading', icon: 'C' },
  { id: 'logo-brand', label: 'Logo / Brand', icon: 'L' },
  { id: 'credits', label: 'Credits', icon: 'R' },
]

const CHARACTER_BG_OPTIONS = [
  { slug: 'aria-voidstrike', name: 'Aria', image: '/npgx-images/grok/00f227e8-2b57-4b73-835a-85cf066e267d.jpg' },
  { slug: 'blade-nightshade', name: 'Blade', image: '/npgx-images/grok/03a5f41b-464a-4b7a-90b6-a43c75169e90.jpg' },
  { slug: 'cherryx', name: 'CherryX', image: '/npgx-characters/cherry/hero-1.jpg' },
]

const CANVAS_W = 1280
const CANVAS_H = 720

const STORAGE_KEY = 'npgx-title-designs'

// ─── Helpers ─────────────────────────────────────────────────────────────────

let uidCounter = 0
function uid(): string {
  return 'td-' + (++uidCounter)
}

function createDefaultLayer(index: number): TextLayer {
  return {
    id: `default-layer-${index}`,
    text: index === 0 ? 'NINJA PUNK GIRLS' : `TEXT ${index + 1}`,
    preset: 'punk',
    fontSize: 72,
    letterSpacing: 4,
    color: '#ef4444',
    strokeEnabled: true,
    strokeColor: '#000000',
    strokeWidth: 2,
    shadowEnabled: false,
    shadowColor: '#ef4444',
    shadowBlur: 20,
    shadowDx: 0,
    shadowDy: 4,
    textTransform: 'uppercase',
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    opacity: 1,
    visible: true,
    locked: false,
    blendMode: 'normal',
    x: CANVAS_W / 2,
    y: CANVAS_H / 2 + index * 80,
  }
}

function applyTransform(text: string, transform: TextTransform): string {
  switch (transform) {
    case 'uppercase': return text.toUpperCase()
    case 'lowercase': return text.toLowerCase()
    case 'capitalize': return text.replace(/\b\w/g, c => c.toUpperCase())
    default: return text
  }
}

function buildSvgFilter(layer: TextLayer): string {
  const parts: string[] = []
  const filterId = `filter-${layer.id}`

  if (layer.preset === 'neon' && layer.shadowEnabled) {
    // Neon glow: multiple blurred copies
    parts.push(`<filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">`)
    parts.push(`  <feGaussianBlur in="SourceGraphic" stdDeviation="${layer.shadowBlur * 0.3}" result="blur1"/>`)
    parts.push(`  <feGaussianBlur in="SourceGraphic" stdDeviation="${layer.shadowBlur * 0.8}" result="blur2"/>`)
    parts.push(`  <feGaussianBlur in="SourceGraphic" stdDeviation="${layer.shadowBlur * 1.5}" result="blur3"/>`)
    parts.push(`  <feMerge>`)
    parts.push(`    <feMergeNode in="blur3"/>`)
    parts.push(`    <feMergeNode in="blur2"/>`)
    parts.push(`    <feMergeNode in="blur1"/>`)
    parts.push(`    <feMergeNode in="SourceGraphic"/>`)
    parts.push(`  </feMerge>`)
    parts.push(`</filter>`)
  } else if (layer.shadowEnabled) {
    parts.push(`<filter id="${filterId}" x="-30%" y="-30%" width="160%" height="160%">`)
    parts.push(`  <feDropShadow dx="${layer.shadowDx ?? 0}" dy="${layer.shadowDy ?? 4}" stdDeviation="${layer.shadowBlur}" flood-color="${layer.shadowColor}" flood-opacity="0.8"/>`)
    parts.push(`</filter>`)
  }

  if (layer.preset === 'punk') {
    // Rough displacement for distressed look
    const roughId = `rough-${layer.id}`
    parts.push(`<filter id="${roughId}" x="-10%" y="-10%" width="120%" height="120%">`)
    parts.push(`  <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="4" seed="2" result="noise"/>`)
    parts.push(`  <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G"/>`)
    parts.push(`</filter>`)
  }

  return parts.join('\n')
}

function getFilterRef(layer: TextLayer): string | undefined {
  if (layer.preset === 'neon' && layer.shadowEnabled) return `url(#filter-${layer.id})`
  if (layer.shadowEnabled) return `url(#filter-${layer.id})`
  if (layer.preset === 'punk') return `url(#rough-${layer.id})`
  return undefined
}

function buildSvgString(layers: TextLayer[], bgMode: BgMode, bgCharacterSlug: string, w: number, h: number): string {
  const defs: string[] = []
  const elements: string[] = []

  // Collect all filter defs
  layers.forEach(layer => {
    const f = buildSvgFilter(layer)
    if (f) defs.push(f)
  })

  // Background
  if (bgMode === 'black') {
    elements.push(`  <rect width="${w}" height="${h}" fill="#000000"/>`)
  } else if (bgMode === 'character') {
    const char = CHARACTER_BG_OPTIONS.find(c => c.slug === bgCharacterSlug)
    if (char) {
      elements.push(`  <image href="${char.image}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`)
      elements.push(`  <rect width="${w}" height="${h}" fill="rgba(0,0,0,0.5)"/>`)
    }
  }

  // Text layers
  layers.forEach(layer => {
    const preset = FONT_PRESETS[layer.preset]
    const displayText = applyTransform(layer.text, layer.textTransform)
    const filter = getFilterRef(layer)

    const attrs: string[] = [
      `x="${layer.x}"`,
      `y="${layer.y}"`,
      `font-family="${preset.fontFamily.replace(/"/g, "'")}"`,
      `font-weight="${preset.fontWeight}"`,
      `font-style="${preset.fontStyle}"`,
      `font-size="${layer.fontSize}"`,
      `letter-spacing="${layer.letterSpacing}"`,
      `fill="${layer.color}"`,
      `opacity="${layer.opacity}"`,
      `text-anchor="middle"`,
      `dominant-baseline="central"`,
    ]

    if (layer.strokeEnabled) {
      attrs.push(`stroke="${layer.strokeColor}"`)
      attrs.push(`stroke-width="${layer.strokeWidth}"`)
      attrs.push(`paint-order="stroke fill"`)
    }
    if (filter) {
      attrs.push(`filter="${filter}"`)
    }
    if (layer.blendMode && layer.blendMode !== 'normal') {
      attrs.push(`style="mix-blend-mode: ${layer.blendMode}"`)
    }

    // Build transform chain
    const transforms: string[] = []
    if (layer.rotation !== 0) transforms.push(`rotate(${layer.rotation}, ${layer.x}, ${layer.y})`)
    const sx = layer.scaleX ?? 1
    const sy = layer.scaleY ?? 1
    const skx = layer.skewX ?? 0
    if (sx !== 1 || sy !== 1 || skx !== 0) {
      transforms.push(`translate(${layer.x}, ${layer.y})`)
      if (skx !== 0) transforms.push(`skewX(${skx})`)
      if (sx !== 1 || sy !== 1) transforms.push(`scale(${sx}, ${sy})`)
      transforms.push(`translate(${-layer.x}, ${-layer.y})`)
    }
    if (transforms.length > 0) attrs.push(`transform="${transforms.join(' ')}"`)

    if (layer.visible !== false) {
      elements.push(`  <text ${attrs.join(' ')}>${escapeXml(displayText)}</text>`)
    }
  })

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    defs.length > 0 ? `  <defs>\n${defs.map(d => '    ' + d).join('\n')}\n  </defs>` : '',
    ...elements,
    `</svg>`,
  ].filter(Boolean).join('\n')
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TitleDesignerPage() {
  // Layers
  const [layers, setLayers] = useState<TextLayer[]>(() => [createDefaultLayer(0)])
  const [activeLayerId, setActiveLayerId] = useState<string>(() => layers[0]?.id ?? '')

  // Layout & background
  const [layoutType, setLayoutType] = useState<LayoutType>('magazine-cover')
  const [bgMode, setBgMode] = useState<BgMode>('black')
  const [bgCharacterSlug, setBgCharacterSlug] = useState('aria-voidstrike')

  // Saved designs
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([])
  const [saveName, setSaveName] = useState('')
  const [copied, setCopied] = useState(false)

  // 3D preview mode
  const [mode3D, setMode3D] = useState(true)
  const [settings3D, setSettings3D] = useState<Title3DSettings>({
    material: 'chrome',
    depth: 0.2,
    bevelEnabled: true,
    bevelSize: 0.02,
    lighting: 'neon-alley',
    camera: 'free',
    bloomIntensity: 0.8,
    particles: 'dust',
    animation: 'float',
    scene: 'transparent',
  })
  const [fullscreen3D, setFullscreen3D] = useState(false)
  const [videoSrc, setVideoSrc] = useState('')
  const [videoList, setVideoList] = useState<string[]>([])

  // Music for 3D mode
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const [analyserForTitle, setAnalyserForTitle] = useState<AnalyserNode | null>(null)
  const musicStartedRef = useRef(false)

  // Load video sources for 3D background
  useEffect(() => {
    if (!mode3D) return
    // Try content library first, then NPG manifest
    fetch('/api/content/list?type=video').then(r => r.ok ? r.json() : null).then(data => {
      const vids: string[] = data?.videos || data?.items?.filter((i: any) => i.endsWith('.mp4')).slice(0, 20) || []
      if (vids.length > 0) {
        setVideoList(vids)
        if (!videoSrc) setVideoSrc(vids[0])
        return
      }
      // Fallback: NPG manifest
      return fetch('/NPG-X-10/manifest.json').then(r => r.json()).then(manifest => {
        const items = Object.values(manifest.collections as Record<string, { items: { video?: string }[] }>)
          .flatMap(c => c.items).filter((i: any) => i.video).map((i: any) => `/NPG-X-10/${i.video}`)
        if (items.length > 0) {
          setVideoList(items)
          if (!videoSrc) setVideoSrc(items[Math.floor(Math.random() * items.length)])
        }
      })
    }).catch(() => {})
  }, [mode3D]) // eslint-disable-line react-hooks/exhaustive-deps

  const skipVideo = useCallback(() => {
    if (videoList.length === 0) return
    const current = videoList.indexOf(videoSrc)
    const next = (current + 1) % videoList.length
    setVideoSrc(videoList[next])
  }, [videoList, videoSrc])

  // Drag state
  const [dragging, setDragging] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragOffset = useRef({ dx: 0, dy: 0 })

  // Load saved designs from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setSavedDesigns(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  // Music disabled — no auto-play on any page

  // Escape key exits fullscreen 3D
  useEffect(() => {
    if (!fullscreen3D) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen3D(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen3D])

  const activeLayer = layers.find(l => l.id === activeLayerId) ?? layers[0]

  // ─── Layer CRUD ──────────────────────────────────────────────────────────

  const addLayer = useCallback(() => {
    const newLayer = createDefaultLayer(layers.length)
    setLayers(prev => [...prev, newLayer])
    setActiveLayerId(newLayer.id)
  }, [layers.length])

  const removeLayer = useCallback((id: string) => {
    setLayers(prev => {
      const next = prev.filter(l => l.id !== id)
      if (next.length === 0) {
        const fresh = createDefaultLayer(0)
        setActiveLayerId(fresh.id)
        return [fresh]
      }
      if (activeLayerId === id) setActiveLayerId(next[0].id)
      return next
    })
  }, [activeLayerId])

  const duplicateLayer = useCallback((id: string) => {
    const source = layers.find(l => l.id === id)
    if (!source) return
    const dup: TextLayer = { ...source, id: uid(), x: source.x + 20, y: source.y + 20 }
    setLayers(prev => [...prev, dup])
    setActiveLayerId(dup.id)
  }, [layers])

  const updateLayer = useCallback((id: string, patch: Partial<TextLayer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }, [])

  const moveLayerUp = useCallback((id: string) => {
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id)
      if (idx <= 0) return prev
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }, [])

  const moveLayerDown = useCallback((id: string) => {
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id)
      if (idx < 0 || idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }, [])

  // ─── Drag handling ───────────────────────────────────────────────────────

  const getSvgPoint = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const rect = svgRef.current.getBoundingClientRect()
    const scaleX = CANVAS_W / rect.width
    const scaleY = CANVAS_H / rect.height
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }, [])

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    const pt = getSvgPoint(e.clientX, e.clientY)

    // Find topmost layer near click (reverse order = top layer first)
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i]
      const halfW = (l.fontSize * l.text.length * 0.35)
      const halfH = l.fontSize * 0.6
      if (Math.abs(pt.x - l.x) < halfW && Math.abs(pt.y - l.y) < halfH) {
        setActiveLayerId(l.id)
        setDragging(true)
        dragOffset.current = { dx: l.x - pt.x, dy: l.y - pt.y }
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
        return
      }
    }
  }, [layers, getSvgPoint])

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return
    const pt = getSvgPoint(e.clientX, e.clientY)
    const nx = Math.round(pt.x + dragOffset.current.dx)
    const ny = Math.round(pt.y + dragOffset.current.dy)
    updateLayer(activeLayerId, { x: nx, y: ny })
  }, [dragging, activeLayerId, getSvgPoint, updateLayer])

  const handleCanvasPointerUp = useCallback(() => {
    setDragging(false)
  }, [])

  // ─── Export ──────────────────────────────────────────────────────────────

  const getSvgExport = useCallback(() => {
    return buildSvgString(layers, bgMode, bgCharacterSlug, CANVAS_W, CANVAS_H)
  }, [layers, bgMode, bgCharacterSlug])

  const downloadSvg = useCallback(() => {
    const svg = getSvgExport()
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `npgx-title-${Date.now()}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }, [getSvgExport])

  const copySvg = useCallback(() => {
    const svg = getSvgExport()
    navigator.clipboard.writeText(svg).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [getSvgExport])

  // ─── Save / Load ────────────────────────────────────────────────────────

  const saveDesign = useCallback(() => {
    const name = saveName.trim() || `Design ${savedDesigns.length + 1}`
    const design: SavedDesign = {
      id: uid(),
      name,
      timestamp: Date.now(),
      layers: JSON.parse(JSON.stringify(layers)),
      layoutType,
      bgMode,
      bgCharacterSlug,
      canvasWidth: CANVAS_W,
      canvasHeight: CANVAS_H,
    }
    const next = [design, ...savedDesigns]
    setSavedDesigns(next)
    setSaveName('')
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }, [saveName, savedDesigns, layers, layoutType, bgMode, bgCharacterSlug])

  const loadDesign = useCallback((design: SavedDesign) => {
    setLayers(design.layers)
    setLayoutType(design.layoutType)
    setBgMode(design.bgMode)
    setBgCharacterSlug(design.bgCharacterSlug)
    setActiveLayerId(design.layers[0]?.id ?? '')
  }, [])

  const deleteDesign = useCallback((id: string) => {
    const next = savedDesigns.filter(d => d.id !== id)
    setSavedDesigns(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }, [savedDesigns])

  // ─── Render ──────────────────────────────────────────────────────────────

  if (!activeLayer) return null

  return (
    <div className="min-h-screen bg-black pt-4 pb-16">
      {/* Header */}
      <div className="px-4 mb-4">
        <h1
          className="text-2xl font-black tracking-widest text-red-500"
          style={{ fontFamily: 'var(--font-brand)' }}
        >
          TITLE DESIGNER
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          3D motion graphics title designer — chrome, gold, neon materials — bloom, particles, camera animation
        </p>
      </div>

      {/* Layout type selector + 3D toggle */}
      <div className="px-4 mb-4 flex gap-2 flex-wrap items-center">
        {LAYOUT_TYPES.map(lt => (
          <button
            key={lt.id}
            onClick={() => setLayoutType(lt.id)}
            className={`px-3 py-1.5 text-xs font-bold border transition-all ${
              layoutType === lt.id
                ? 'bg-red-500/20 border-red-500 text-red-400'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
            }`}
          >
            <span className="mr-1.5 text-[10px] opacity-60">{lt.icon}</span>
            {lt.label}
          </button>
        ))}
        <div className="w-px h-6 bg-zinc-700 mx-1" />
        <button
          onClick={() => setMode3D(!mode3D)}
          className={`px-4 py-1.5 text-xs font-black border tracking-wider transition-all ${
            mode3D
              ? 'bg-red-600/30 border-red-500 text-red-400 shadow-[0_0_20px_rgba(220,20,60,0.3)]'
              : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-red-500/50 hover:text-red-400'
          }`}
          style={{ fontFamily: 'var(--font-brand)' }}
        >
          3D {mode3D ? 'ON' : 'OFF'}
        </button>
        {mode3D && (
          <button
            onClick={() => setFullscreen3D(!fullscreen3D)}
            className={`px-3 py-1.5 text-xs font-bold border transition-all ${
              fullscreen3D
                ? 'bg-red-500/20 border-red-500 text-red-400'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
            }`}
          >
            {fullscreen3D ? 'EXIT FULL' : 'FULLSCREEN'}
          </button>
        )}
      </div>

      {/* Main 3-column layout */}
      <div className="flex gap-3 px-4" style={{ minHeight: 'calc(100vh - 200px)' }}>

        {/* ── LEFT: Controls Panel ──────────────────────────────────────── */}
        <div className="w-[300px] flex-shrink-0 space-y-3 overflow-y-auto max-h-[calc(100vh-180px)] pr-1 scrollbar-thin">

          {/* ── 3D Controls (shown when 3D mode active) ── */}
          {mode3D && (
            <>
              {/* Material */}
              <Panel title="3D Material">
                <div className="grid grid-cols-4 gap-1">
                  {([
                    ['chrome', 'Chrome', '#e0e0e0'],
                    ['gold', 'Gold', '#ffd700'],
                    ['neon', 'Neon', '#ff0040'],
                    ['matte', 'Matte', '#333333'],
                    ['crimson', 'Crimson', '#8b0000'],
                    ['hologram', 'Holo', '#00ffff'],
                    ['ice', 'Ice', '#b8e8f0'],
                  ] as [string, string, string][]).map(([id, label, color]) => (
                    <button
                      key={id}
                      onClick={() => setSettings3D(s => ({ ...s, material: id as MaterialPreset }))}
                      className={`relative px-1 py-2 text-[9px] font-bold border transition-all ${
                        settings3D.material === id
                          ? 'bg-red-500/20 border-red-500 text-red-400'
                          : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      <span
                        className="block w-3 h-3 rounded-full mx-auto mb-1 border border-zinc-600"
                        style={{ background: color }}
                      />
                      {label}
                    </button>
                  ))}
                </div>
              </Panel>

              {/* Geometry */}
              <Panel title="3D Geometry">
                <SliderRow
                  label="Extrusion Depth"
                  value={settings3D.depth}
                  min={0.02}
                  max={0.8}
                  step={0.02}
                  onChange={v => setSettings3D(s => ({ ...s, depth: v }))}
                />
                <div className="flex items-center gap-2 mt-1">
                  <ToggleSwitch
                    on={settings3D.bevelEnabled}
                    onToggle={() => setSettings3D(s => ({ ...s, bevelEnabled: !s.bevelEnabled }))}
                  />
                  <span className="text-[10px] text-zinc-400">Bevel</span>
                </div>
                {settings3D.bevelEnabled && (
                  <SliderRow
                    label="Bevel Size"
                    value={settings3D.bevelSize}
                    min={0.005}
                    max={0.06}
                    step={0.005}
                    onChange={v => setSettings3D(s => ({ ...s, bevelSize: v }))}
                  />
                )}
              </Panel>

              {/* Lighting */}
              <Panel title="Lighting">
                <div className="grid grid-cols-5 gap-1">
                  {([
                    ['studio', 'Studio'],
                    ['neon-alley', 'Neon'],
                    ['sunset', 'Sunset'],
                    ['void', 'Void'],
                    ['stage', 'Stage'],
                  ] as [string, string][]).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setSettings3D(s => ({ ...s, lighting: id as LightingPreset }))}
                      className={`px-1 py-1.5 text-[9px] font-bold border transition-all ${
                        settings3D.lighting === id
                          ? 'bg-red-500/20 border-red-500 text-red-400'
                          : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Panel>

              {/* Camera + Scene */}
              <Panel title="Camera & Scene">
                <label className="text-[10px] text-zinc-500 mb-1 block">Camera</label>
                <div className="grid grid-cols-5 gap-1 mb-3">
                  {([
                    ['free', 'Free'],
                    ['static', 'Static'],
                    ['orbit', 'Orbit'],
                    ['dolly', 'Dolly'],
                    ['crane', 'Crane'],
                  ] as [string, string][]).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setSettings3D(s => ({ ...s, camera: id as CameraMode }))}
                      className={`px-1 py-1.5 text-[9px] font-bold border transition-all ${
                        settings3D.camera === id
                          ? 'bg-red-500/20 border-red-500 text-red-400'
                          : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className="text-[10px] text-zinc-500 mb-1 block">Scene</label>
                <div className="grid grid-cols-4 gap-1">
                  {([
                    ['transparent', 'Video'],
                    ['void', 'Void'],
                    ['grid', 'Grid'],
                    ['fog', 'Fog'],
                  ] as [string, string][]).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setSettings3D(s => ({ ...s, scene: id as SceneType }))}
                      className={`px-1 py-1.5 text-[9px] font-bold border transition-all ${
                        settings3D.scene === id
                          ? 'bg-red-500/20 border-red-500 text-red-400'
                          : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Panel>

              {/* Effects */}
              <Panel title="Effects">
                <SliderRow
                  label="Bloom"
                  value={settings3D.bloomIntensity}
                  min={0}
                  max={3}
                  step={0.1}
                  onChange={v => setSettings3D(s => ({ ...s, bloomIntensity: v }))}
                />
                <label className="text-[10px] text-zinc-500 mt-2 mb-1 block">Animation</label>
                <div className="grid grid-cols-5 gap-1 mb-2">
                  {([
                    ['none', 'None'],
                    ['float', 'Float'],
                    ['breathe', 'Breathe'],
                    ['glitch', 'Glitch'],
                    ['pulse', 'Pulse'],
                  ] as [string, string][]).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setSettings3D(s => ({ ...s, animation: id as AnimationType }))}
                      className={`px-1 py-1.5 text-[9px] font-bold border transition-all ${
                        settings3D.animation === id
                          ? 'bg-red-500/20 border-red-500 text-red-400'
                          : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className="text-[10px] text-zinc-500 mb-1 block">Particles</label>
                <div className="grid grid-cols-4 gap-1">
                  {([
                    ['none', 'None'],
                    ['dust', 'Dust'],
                    ['sparks', 'Sparks'],
                    ['embers', 'Embers'],
                  ] as [string, string][]).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setSettings3D(s => ({ ...s, particles: id as ParticleType }))}
                      className={`px-1 py-1.5 text-[9px] font-bold border transition-all ${
                        settings3D.particles === id
                          ? 'bg-red-500/20 border-red-500 text-red-400'
                          : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Panel>

              {/* 3D Quick Presets */}
              <Panel title="Quick Presets">
                <div className="grid grid-cols-2 gap-1">
                  {([
                    ['Chrome on Video', { material: 'chrome' as const, lighting: 'studio' as const, camera: 'free' as const, animation: 'breathe' as const, particles: 'none' as const, bloomIntensity: 0.6, scene: 'transparent' as const }],
                    ['Neon on Video', { material: 'neon' as const, lighting: 'neon-alley' as const, camera: 'free' as const, animation: 'pulse' as const, particles: 'sparks' as const, bloomIntensity: 2, scene: 'transparent' as const }],
                    ['Gold Rush', { material: 'gold' as const, lighting: 'sunset' as const, camera: 'crane' as const, animation: 'float' as const, particles: 'embers' as const, bloomIntensity: 0.8, scene: 'transparent' as const }],
                    ['Void Glitch', { material: 'hologram' as const, lighting: 'void' as const, camera: 'static' as const, animation: 'glitch' as const, particles: 'sparks' as const, bloomIntensity: 1.5, scene: 'grid' as const }],
                    ['Ice Stage', { material: 'ice' as const, lighting: 'stage' as const, camera: 'orbit' as const, animation: 'breathe' as const, particles: 'dust' as const, bloomIntensity: 0.4, scene: 'void' as const }],
                    ['Crimson Steel', { material: 'crimson' as const, lighting: 'void' as const, camera: 'dolly' as const, animation: 'pulse' as const, particles: 'embers' as const, bloomIntensity: 1.2, scene: 'transparent' as const }],
                  ] as [string, Partial<Title3DSettings>][]).map(([label, preset]) => (
                    <button
                      key={label}
                      onClick={() => setSettings3D(s => ({ ...s, ...preset, depth: s.depth, bevelEnabled: s.bevelEnabled, bevelSize: s.bevelSize }))}
                      className="px-2 py-2 text-[10px] font-bold border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-all text-left"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Panel>

              <div className="border-t border-zinc-800 my-1" />
            </>
          )}

          {/* Font Style Presets */}
          <Panel title={`Font Style (${Object.keys(FONT_PRESETS).length})`}>
            <div className="grid grid-cols-4 gap-1">
              {(Object.keys(FONT_PRESETS) as FontPreset[]).map(key => {
                const p = FONT_PRESETS[key]
                return (
                  <button
                    key={key}
                    onClick={() => updateLayer(activeLayer.id, { preset: key })}
                    className={`px-1 py-1.5 text-[9px] font-bold border transition-all leading-tight ${
                      activeLayer.preset === key
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                    style={{ fontFamily: p.fontFamily, fontWeight: p.fontWeight, fontStyle: p.fontStyle }}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </Panel>

          {/* Text Input */}
          <Panel title="Text">
            <input
              type="text"
              value={activeLayer.text}
              onChange={e => updateLayer(activeLayer.id, { text: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
              placeholder="Enter title text..."
            />
            <div className="flex gap-1 mt-2">
              {(['uppercase', 'lowercase', 'capitalize', 'none'] as TextTransform[]).map(t => (
                <button
                  key={t}
                  onClick={() => updateLayer(activeLayer.id, { textTransform: t })}
                  className={`flex-1 text-[10px] py-1 border transition-all ${
                    activeLayer.textTransform === t
                      ? 'bg-red-500/20 border-red-500 text-red-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                  }`}
                >
                  {t === 'none' ? 'As-is' : t.slice(0, 3).toUpperCase()}
                </button>
              ))}
            </div>
          </Panel>

          {/* Size & Spacing */}
          <Panel title="Size & Spacing">
            <SliderRow
              label="Font Size"
              value={activeLayer.fontSize}
              min={24}
              max={200}
              onChange={v => updateLayer(activeLayer.id, { fontSize: v })}
            />
            <SliderRow
              label="Letter Spacing"
              value={activeLayer.letterSpacing}
              min={-10}
              max={30}
              onChange={v => updateLayer(activeLayer.id, { letterSpacing: v })}
            />
          </Panel>

          {/* Color */}
          <Panel title="Color">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-zinc-500 w-16">Fill</label>
              <input
                type="color"
                value={activeLayer.color}
                onChange={e => updateLayer(activeLayer.id, { color: e.target.value })}
                className="w-8 h-8 border border-zinc-700 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={activeLayer.color}
                onChange={e => updateLayer(activeLayer.id, { color: e.target.value })}
                className="flex-1 bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs text-zinc-300 font-mono focus:border-red-500 focus:outline-none"
              />
            </div>
            {/* Quick color swatches */}
            <div className="grid grid-cols-8 gap-0.5 mt-2">
              {[
                // Row 1: basics
                '#ffffff', '#e5e5e5', '#a3a3a3', '#737373', '#404040', '#262626', '#171717', '#000000',
                // Row 2: reds/warm
                '#ef4444', '#dc2626', '#b91c1c', '#f97316', '#f59e0b', '#eab308', '#fbbf24', '#fde68a',
                // Row 3: cool
                '#22c55e', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
                // Row 4: metallics/neons
                '#ffd700', '#c0c0c0', '#cd7f32', '#00ffff', '#ff00ff', '#39ff14', '#ff073a', '#ff6ec7',
              ].map(c => (
                <button
                  key={c}
                  onClick={() => updateLayer(activeLayer.id, { color: c })}
                  className={`w-full aspect-square border ${activeLayer.color === c ? 'border-white ring-1 ring-white' : 'border-zinc-700'} hover:border-zinc-400 transition-all`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Panel>

          {/* Stroke */}
          <Panel title="Stroke / Outline">
            <div className="flex items-center gap-2 mb-2">
              <ToggleSwitch
                on={activeLayer.strokeEnabled}
                onToggle={() => updateLayer(activeLayer.id, { strokeEnabled: !activeLayer.strokeEnabled })}
              />
              <span className="text-[10px] text-zinc-400">
                {activeLayer.strokeEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {activeLayer.strokeEnabled && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-zinc-500 w-16">Color</label>
                  <input
                    type="color"
                    value={activeLayer.strokeColor}
                    onChange={e => updateLayer(activeLayer.id, { strokeColor: e.target.value })}
                    className="w-8 h-8 border border-zinc-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={activeLayer.strokeColor}
                    onChange={e => updateLayer(activeLayer.id, { strokeColor: e.target.value })}
                    className="flex-1 bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs text-zinc-300 font-mono focus:border-red-500 focus:outline-none"
                  />
                </div>
                <SliderRow
                  label="Width"
                  value={activeLayer.strokeWidth}
                  min={0}
                  max={10}
                  step={0.5}
                  onChange={v => updateLayer(activeLayer.id, { strokeWidth: v })}
                />
              </>
            )}
          </Panel>

          {/* Shadow / Glow */}
          <Panel title="Shadow / Glow">
            <div className="flex items-center gap-2 mb-2">
              <ToggleSwitch
                on={activeLayer.shadowEnabled}
                onToggle={() => updateLayer(activeLayer.id, { shadowEnabled: !activeLayer.shadowEnabled })}
              />
              <span className="text-[10px] text-zinc-400">
                {activeLayer.shadowEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {activeLayer.shadowEnabled && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-zinc-500 w-16">Color</label>
                  <input
                    type="color"
                    value={activeLayer.shadowColor}
                    onChange={e => updateLayer(activeLayer.id, { shadowColor: e.target.value })}
                    className="w-8 h-8 border border-zinc-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={activeLayer.shadowColor}
                    onChange={e => updateLayer(activeLayer.id, { shadowColor: e.target.value })}
                    className="flex-1 bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs text-zinc-300 font-mono focus:border-red-500 focus:outline-none"
                  />
                </div>
                <SliderRow
                  label="Blur"
                  value={activeLayer.shadowBlur}
                  min={1}
                  max={40}
                  onChange={v => updateLayer(activeLayer.id, { shadowBlur: v })}
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SliderRow
                      label="Offset X"
                      value={activeLayer.shadowDx ?? 0}
                      min={-20}
                      max={20}
                      suffix="px"
                      onChange={v => updateLayer(activeLayer.id, { shadowDx: v })}
                    />
                  </div>
                  <div className="flex-1">
                    <SliderRow
                      label="Offset Y"
                      value={activeLayer.shadowDy ?? 4}
                      min={-20}
                      max={20}
                      suffix="px"
                      onChange={v => updateLayer(activeLayer.id, { shadowDy: v })}
                    />
                  </div>
                </div>
              </>
            )}
          </Panel>

          {/* Transform */}
          <Panel title="Transform">
            <SliderRow
              label="Rotation"
              value={activeLayer.rotation}
              min={-180}
              max={180}
              suffix="°"
              onChange={v => updateLayer(activeLayer.id, { rotation: v })}
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <SliderRow
                  label="Scale X"
                  value={activeLayer.scaleX ?? 1}
                  min={0.2}
                  max={3}
                  step={0.05}
                  suffix="x"
                  onChange={v => updateLayer(activeLayer.id, { scaleX: v })}
                />
              </div>
              <div className="flex-1">
                <SliderRow
                  label="Scale Y"
                  value={activeLayer.scaleY ?? 1}
                  min={0.2}
                  max={3}
                  step={0.05}
                  suffix="x"
                  onChange={v => updateLayer(activeLayer.id, { scaleY: v })}
                />
              </div>
            </div>
            <SliderRow
              label="Skew X"
              value={activeLayer.skewX ?? 0}
              min={-45}
              max={45}
              suffix="°"
              onChange={v => updateLayer(activeLayer.id, { skewX: v })}
            />
            <SliderRow
              label="Opacity"
              value={activeLayer.opacity}
              min={0}
              max={1}
              step={0.05}
              onChange={v => updateLayer(activeLayer.id, { opacity: v })}
            />
            {/* Blend Mode */}
            <div className="mt-1">
              <label className="text-[10px] text-zinc-500 mb-1 block">Blend Mode</label>
              <select
                value={activeLayer.blendMode ?? 'normal'}
                onChange={e => updateLayer(activeLayer.id, { blendMode: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs text-zinc-300 focus:border-red-500 focus:outline-none"
              >
                {BLEND_MODES.map(m => (
                  <option key={m} value={m} className="bg-zinc-900">{m}</option>
                ))}
              </select>
            </div>
            {/* Reset transforms */}
            <button
              onClick={() => updateLayer(activeLayer.id, { rotation: 0, scaleX: 1, scaleY: 1, skewX: 0 })}
              className="mt-2 w-full text-[10px] py-1 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
            >
              Reset Transforms
            </button>
          </Panel>

          {/* Position (manual) */}
          <Panel title="Position">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-zinc-500 mb-1 block">X</label>
                <input
                  type="number"
                  value={activeLayer.x}
                  onChange={e => updateLayer(activeLayer.id, { x: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs text-zinc-300 font-mono focus:border-red-500 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-zinc-500 mb-1 block">Y</label>
                <input
                  type="number"
                  value={activeLayer.y}
                  onChange={e => updateLayer(activeLayer.id, { y: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs text-zinc-300 font-mono focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={() => updateLayer(activeLayer.id, { x: CANVAS_W / 2, y: CANVAS_H / 2 })}
              className="mt-2 w-full text-[10px] py-1 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
            >
              Center on Canvas
            </button>
          </Panel>

          {/* Background */}
          <Panel title="Background">
            <div className="flex gap-1.5 mb-2">
              {([['transparent', 'None'], ['black', 'Black'], ['character', 'Character']] as [BgMode, string][]).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setBgMode(mode)}
                  className={`flex-1 text-[10px] py-1.5 border transition-all ${
                    bgMode === mode
                      ? 'bg-red-500/20 border-red-500 text-red-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {bgMode === 'character' && (
              <div className="grid grid-cols-3 gap-1.5">
                {CHARACTER_BG_OPTIONS.map(ch => (
                  <button
                    key={ch.slug}
                    onClick={() => setBgCharacterSlug(ch.slug)}
                    className={`relative border overflow-hidden h-16 ${
                      bgCharacterSlug === ch.slug
                        ? 'border-red-500'
                        : 'border-zinc-700 hover:border-zinc-500'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ch.image} alt={ch.name} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 text-[8px] text-white bg-black/70 text-center py-0.5">
                      {ch.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Panel>

        </div>

        {/* ── CENTER: Canvas ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center min-w-0">
          {/* 3D Motion Graphics Preview — titles over video */}
          {mode3D && (
            <div
              className={`relative border border-red-500/30 bg-black overflow-hidden ${
                fullscreen3D
                  ? 'fixed inset-0 z-50 border-0'
                  : 'w-full mb-3'
              }`}
              style={fullscreen3D ? {} : { aspectRatio: '16 / 9' }}
            >
              {/* Video background layer */}
              {videoSrc && settings3D.scene === 'transparent' && (
                <video
                  src={videoSrc}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={skipVideo}
                />
              )}

              {/* 3D canvas — transparent when scene=transparent, so video shows through */}
              <Suspense fallback={
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <div className="text-red-500 text-sm font-mono animate-pulse">Loading 3D Engine...</div>
                </div>
              }>
                <Title3DScene
                  analyserNode={analyserForTitle}
                  settings={settings3D}
                  lines={layers.filter(l => l.visible !== false).map(layer => ({
                    text: applyTransform(layer.text, layer.textTransform),
                    color: layer.color,
                    fontSize: layer.fontSize,
                    x: layer.x,
                    y: layer.y,
                    rotation: layer.rotation,
                    scaleX: layer.scaleX ?? 1,
                    scaleY: layer.scaleY ?? 1,
                    skewX: layer.skewX ?? 0,
                    opacity: layer.opacity,
                  }))}
                />
              </Suspense>

              {/* Overlay UI */}
              <div className="absolute top-2 left-2 flex items-center gap-2 z-20 pointer-events-none">
                <span className="text-[10px] font-black text-red-500 bg-black/70 px-2 py-0.5 backdrop-blur-sm"
                  style={{ fontFamily: 'var(--font-brand)' }}>
                  3D MOTION
                </span>
                <span className="text-[9px] text-white/40 font-mono bg-black/50 px-1.5 py-0.5">
                  {settings3D.material.toUpperCase()} / {settings3D.lighting.toUpperCase()}
                </span>
              </div>

              {/* Skip video + music hint */}
              <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-3 z-20">
                {!musicStartedRef.current && (
                  <span className="text-[10px] text-red-500/60 font-mono uppercase tracking-widest bg-black/40 px-3 py-1 backdrop-blur-sm pointer-events-none">
                    click for music + beat sync
                  </span>
                )}
                {videoSrc && settings3D.scene === 'transparent' && (
                  <button
                    onClick={skipVideo}
                    className="text-[10px] text-white/40 hover:text-white/80 bg-black/50 hover:bg-black/70 px-2 py-1 backdrop-blur-sm transition-all"
                  >
                    next video
                  </button>
                )}
              </div>

              {fullscreen3D && (
                <button
                  onClick={() => setFullscreen3D(false)}
                  className="absolute top-3 right-3 z-30 text-xs text-white/50 hover:text-white bg-black/60 hover:bg-black/80 px-3 py-1.5 backdrop-blur-sm transition-all"
                >
                  ESC
                </button>
              )}
            </div>
          )}

          {/* 2D SVG Canvas — hidden when 3D mode is active */}
          {!mode3D && (
            <>
              <div
                className="relative border border-zinc-800 bg-zinc-950 w-full"
                style={{
                  maxWidth: CANVAS_W,
                  aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
                  backgroundImage: bgMode === 'transparent'
                    ? 'repeating-conic-gradient(#1a1a1a 0% 25%, #111 0% 50%)'
                    : undefined,
                  backgroundSize: bgMode === 'transparent' ? '20px 20px' : undefined,
                }}
              >
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                  className="w-full h-full select-none"
                  style={{ cursor: dragging ? 'grabbing' : 'crosshair' }}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerLeave={handleCanvasPointerUp}
                >
                  {/* Background */}
                  {bgMode === 'black' && (
                    <rect width={CANVAS_W} height={CANVAS_H} fill="#000000" />
                  )}
                  {bgMode === 'character' && (() => {
                    const ch = CHARACTER_BG_OPTIONS.find(c => c.slug === bgCharacterSlug)
                    return ch ? (
                      <>
                        <image href={ch.image} x={0} y={0} width={CANVAS_W} height={CANVAS_H} preserveAspectRatio="xMidYMid slice" />
                        <rect width={CANVAS_W} height={CANVAS_H} fill="rgba(0,0,0,0.5)" />
                      </>
                    ) : null
                  })()}

                  {/* SVG Filters (defs) */}
                  <defs>
                    {layers.map(layer => {
                      const filterSvg = buildSvgFilter(layer)
                      if (!filterSvg) return null
                      return (
                        <g key={`def-${layer.id}`} dangerouslySetInnerHTML={{ __html: filterSvg }} />
                      )
                    })}
                  </defs>

                  {/* Text layers */}
                  {layers.map(layer => {
                    if (layer.visible === false) return null
                    const preset = FONT_PRESETS[layer.preset]
                    const displayText = applyTransform(layer.text, layer.textTransform)
                    const filter = getFilterRef(layer)
                    const isActive = layer.id === activeLayerId

                    // Build transform chain
                    const transforms: string[] = []
                    if (layer.rotation !== 0) transforms.push(`rotate(${layer.rotation}, ${layer.x}, ${layer.y})`)
                    const sx = layer.scaleX ?? 1
                    const sy = layer.scaleY ?? 1
                    const skx = layer.skewX ?? 0
                    if (sx !== 1 || sy !== 1 || skx !== 0) {
                      transforms.push(`translate(${layer.x}, ${layer.y})`)
                      if (skx !== 0) transforms.push(`skewX(${skx})`)
                      if (sx !== 1 || sy !== 1) transforms.push(`scale(${sx}, ${sy})`)
                      transforms.push(`translate(${-layer.x}, ${-layer.y})`)
                    }
                    const transformStr = transforms.length > 0 ? transforms.join(' ') : undefined

                    return (
                      <g key={layer.id} style={layer.blendMode && layer.blendMode !== 'normal' ? { mixBlendMode: layer.blendMode as any } : undefined}>
                        <text
                          x={layer.x}
                          y={layer.y}
                          fontFamily={preset.fontFamily}
                          fontWeight={preset.fontWeight}
                          fontStyle={preset.fontStyle}
                          fontSize={layer.fontSize}
                          letterSpacing={layer.letterSpacing}
                          fill={layer.color}
                          opacity={layer.opacity}
                          textAnchor="middle"
                          dominantBaseline="central"
                          stroke={layer.strokeEnabled ? layer.strokeColor : undefined}
                          strokeWidth={layer.strokeEnabled ? layer.strokeWidth : undefined}
                          paintOrder={layer.strokeEnabled ? 'stroke fill' : undefined}
                          filter={filter}
                          transform={transformStr}
                          style={{ ...preset.extra, pointerEvents: 'none' }}
                        >
                          {displayText}
                        </text>
                        {/* Selection indicator */}
                        {isActive && !dragging && (
                          <rect
                            x={layer.x - (layer.fontSize * layer.text.length * 0.32)}
                            y={layer.y - layer.fontSize * 0.5}
                            width={layer.fontSize * layer.text.length * 0.64}
                            height={layer.fontSize}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth={1}
                            strokeDasharray="4 3"
                            opacity={0.6}
                            transform={transformStr}
                            style={{ pointerEvents: 'none' }}
                          />
                        )}
                      </g>
                    )
                  })}
                </svg>
              </div>

              {/* Canvas toolbar */}
              <div className="flex gap-2 mt-3 w-full max-w-[900px] justify-center">
                <button
                  onClick={downloadSvg}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold tracking-wider transition-all"
                >
                  DOWNLOAD SVG
                </button>
                <button
                  onClick={copySvg}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 text-xs font-bold tracking-wider transition-all"
                >
                  {copied ? 'COPIED' : 'COPY SVG'}
                </button>
              </div>

              {/* Layout context hint */}
              <div className="mt-3 text-center">
                <span className="text-[10px] text-zinc-600 tracking-wider uppercase">
                  Designing for: {LAYOUT_TYPES.find(l => l.id === layoutType)?.label} &mdash; {CANVAS_W}x{CANVAS_H}
                </span>
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT: Layers & Saved ─────────────────────────────────────── */}
        <div className="w-[260px] flex-shrink-0 space-y-3 overflow-y-auto max-h-[calc(100vh-180px)] pl-1 scrollbar-thin">

          {/* Photoshop-style Layers Palette */}
          <div className="bg-zinc-950 border border-zinc-800">
            {/* Header bar */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest" style={{ fontFamily: 'var(--font-brand)' }}>
                Layers ({layers.length})
              </h3>
              <div className="flex gap-1">
                <select
                  value={activeLayer.blendMode ?? 'normal'}
                  onChange={e => updateLayer(activeLayer.id, { blendMode: e.target.value })}
                  className="bg-zinc-900 border border-zinc-700 px-1 py-0.5 text-[9px] text-zinc-400 focus:outline-none"
                >
                  {BLEND_MODES.map(m => (
                    <option key={m} value={m} className="bg-zinc-900">{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Opacity bar for active layer */}
            <div className="flex items-center gap-2 px-3 py-1 border-b border-zinc-800/50">
              <label className="text-[9px] text-zinc-600 w-12">Opacity</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={activeLayer.opacity}
                onChange={e => updateLayer(activeLayer.id, { opacity: Number(e.target.value) })}
                className="flex-1 h-1 bg-zinc-800 appearance-none cursor-pointer accent-red-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0"
              />
              <span className="text-[9px] text-zinc-500 font-mono w-8 text-right">{Math.round(activeLayer.opacity * 100)}%</span>
            </div>

            {/* Layer list */}
            <div className="max-h-[350px] overflow-y-auto">
              {/* Render in reverse (top layer first, like Photoshop) */}
              {[...layers].reverse().map((layer) => {
                const isActive = layer.id === activeLayerId
                const preset = FONT_PRESETS[layer.preset]
                return (
                  <div
                    key={layer.id}
                    onClick={() => !layer.locked && setActiveLayerId(layer.id)}
                    className={`flex items-center gap-0 border-b transition-all cursor-pointer ${
                      isActive
                        ? 'bg-red-500/10 border-red-500/20'
                        : 'bg-zinc-950 border-zinc-800/50 hover:bg-zinc-900/50'
                    } ${layer.visible === false ? 'opacity-40' : ''}`}
                  >
                    {/* Visibility eye */}
                    <button
                      onClick={e => { e.stopPropagation(); updateLayer(layer.id, { visible: layer.visible === false ? true : layer.visible ? false : true }) }}
                      className={`w-7 h-10 flex items-center justify-center text-[11px] shrink-0 border-r border-zinc-800/50 transition-colors ${
                        layer.visible !== false ? 'text-zinc-400 hover:text-white' : 'text-zinc-700 hover:text-zinc-500'
                      }`}
                      title={layer.visible !== false ? 'Hide layer' : 'Show layer'}
                    >
                      {layer.visible !== false ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>

                    {/* Lock */}
                    <button
                      onClick={e => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }) }}
                      className={`w-6 h-10 flex items-center justify-center text-[10px] shrink-0 border-r border-zinc-800/50 transition-colors ${
                        layer.locked ? 'text-yellow-500' : 'text-zinc-700 hover:text-zinc-500'
                      }`}
                      title={layer.locked ? 'Unlock' : 'Lock'}
                    >
                      {layer.locked ? (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                        </svg>
                      )}
                    </button>

                    {/* Color swatch / thumbnail */}
                    <div className="w-8 h-10 flex items-center justify-center shrink-0 border-r border-zinc-800/50">
                      <span
                        className="w-5 h-5 border border-zinc-600"
                        style={{
                          backgroundColor: layer.color,
                          ...(layer.strokeEnabled ? { outline: `1px solid ${layer.strokeColor}` } : {}),
                        }}
                      />
                    </div>

                    {/* Layer info */}
                    <div className="flex-1 min-w-0 px-2 py-1">
                      <p className="text-[10px] text-zinc-300 truncate font-medium leading-tight"
                         style={{ fontFamily: preset.fontFamily, fontWeight: preset.fontWeight }}>
                        {applyTransform(layer.text, layer.textTransform) || '(empty)'}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[8px] text-zinc-600 uppercase">{layer.preset}</span>
                        <span className="text-[8px] text-zinc-700">{layer.fontSize}px</span>
                        {layer.rotation !== 0 && <span className="text-[8px] text-zinc-700">{layer.rotation}°</span>}
                        {(layer.scaleX ?? 1) !== 1 && <span className="text-[8px] text-zinc-700">{layer.scaleX}x</span>}
                      </div>
                    </div>

                    {/* Layer controls */}
                    <div className="flex flex-col gap-0.5 pr-1.5 shrink-0">
                      <div className="flex gap-0.5">
                        <button
                          onClick={e => { e.stopPropagation(); moveLayerDown(layer.id) }}
                          className="text-[9px] text-zinc-600 hover:text-white w-4 h-4 flex items-center justify-center"
                          title="Move up (in stack)"
                        >
                          &#9650;
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); moveLayerUp(layer.id) }}
                          className="text-[9px] text-zinc-600 hover:text-white w-4 h-4 flex items-center justify-center"
                          title="Move down (in stack)"
                        >
                          &#9660;
                        </button>
                      </div>
                      <div className="flex gap-0.5">
                        <button
                          onClick={e => { e.stopPropagation(); duplicateLayer(layer.id) }}
                          className="text-[9px] text-zinc-600 hover:text-white w-4 h-4 flex items-center justify-center"
                          title="Duplicate"
                        >
                          +
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); removeLayer(layer.id) }}
                          className="text-[9px] text-zinc-600 hover:text-red-400 w-4 h-4 flex items-center justify-center"
                          title="Delete"
                        >
                          x
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-2 py-1.5 border-t border-zinc-800">
              <button
                onClick={addLayer}
                className="text-[10px] font-bold text-zinc-400 hover:text-white transition-colors px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
              >
                + New Layer
              </button>
              <span className="text-[8px] text-zinc-700 font-mono">
                {layers.filter(l => l.visible !== false).length} visible
              </span>
            </div>
          </div>

          {/* Save */}
          <Panel title="Save Design">
            <div className="flex gap-1">
              <input
                type="text"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder="Design name..."
                className="flex-1 bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
              />
              <button
                onClick={saveDesign}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all"
              >
                Save
              </button>
            </div>
          </Panel>

          {/* Saved designs */}
          <Panel title={`Saved (${savedDesigns.length})`}>
            {savedDesigns.length === 0 ? (
              <p className="text-[10px] text-zinc-600 italic">No saved designs yet</p>
            ) : (
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {savedDesigns.map(design => (
                  <div
                    key={design.id}
                    className="flex items-center gap-1.5 px-2 py-1.5 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-zinc-300 truncate font-medium">{design.name}</p>
                      <p className="text-[9px] text-zinc-600">
                        {design.layers.length} layer{design.layers.length !== 1 ? 's' : ''} &middot; {new Date(design.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => loadDesign(design)}
                      className="text-[10px] text-zinc-500 hover:text-green-400 px-1 transition-colors"
                      title="Load"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deleteDesign(design.id)}
                      className="text-[10px] text-zinc-500 hover:text-red-400 px-1 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete"
                    >
                      Del
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Quick tips */}
          <Panel title="Tips">
            <ul className="space-y-1 text-[10px] text-zinc-600 leading-relaxed">
              <li>Drag text on the 2D canvas to reposition</li>
              <li>Toggle <span className="text-red-500/60">3D</span> for motion graphics preview</li>
              <li>Try Quick Presets for instant looks</li>
              <li>Click the 3D view to activate beat sync</li>
              <li>Chrome + Neon Alley + Bloom = fire</li>
              <li>Stack multiple layers for complex titles</li>
            </ul>
          </Panel>

        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 p-3">
      <h3
        className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2"
        style={{ fontFamily: 'var(--font-brand)' }}
      >
        {title}
      </h3>
      {children}
    </div>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex justify-between mb-0.5">
        <label className="text-[10px] text-zinc-500">{label}</label>
        <span className="text-[10px] text-zinc-400 font-mono">
          {step < 1 ? value.toFixed(2) : value}{suffix ?? ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-zinc-800 appearance-none cursor-pointer accent-red-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0"
      />
    </div>
  )
}

function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-8 h-4 rounded-full transition-all flex-shrink-0 ${
        on ? 'bg-red-500' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
          on ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  )
}
