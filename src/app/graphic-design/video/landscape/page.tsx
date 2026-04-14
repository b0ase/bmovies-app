'use client'

import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react'
import { MOTION_PRESETS, interpolateKeyframes, isShapeLayer, type MotionPreset, type MotionLine, type MotionShapeLine, type FontKey } from '@/lib/motion-graphics'
import type { Title3DSettings, Title3DLine, LayerMode } from '@/components/Title3DScene'
import { FONT_REGISTRY } from '@/components/Title3DScene'

const Title3DScene = lazy(() => import('@/components/Title3DScene'))

// ─── Component ───────────────────────────────────────────────────────────────

export default function MotionGraphicsPage() {
  // Preset & playback
  const [activePreset, setActivePreset] = useState<MotionPreset>(MOTION_PRESETS[0])
  const [playing, setPlaying] = useState(true)
  const [time, setTime] = useState(0) // 0–1 normalised
  const [speed, setSpeed] = useState(1)
  const [loop, setLoop] = useState(true)
  const rafRef = useRef<number>(0)
  const lastFrameRef = useRef(performance.now())

  // Video background (disabled)
  const [videoSrc, setVideoSrc] = useState('')
  const [videoList] = useState<string[]>([])

  // Music / beat sync
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)
  const musicStartedRef = useRef(false)

  // Editable layers (copied from preset, user can modify)
  const [layers, setLayers] = useState<MotionLine[]>(MOTION_PRESETS[0].lines)
  const [selectedLayer, setSelectedLayer] = useState(0)

  // UI
  const [showControls, setShowControls] = useState(true)
  const [showLayers, setShowLayers] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  // ─── Animation loop ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!playing) return
    const tick = (now: number) => {
      const delta = (now - lastFrameRef.current) / 1000
      lastFrameRef.current = now
      setTime(prev => {
        const next = prev + (delta * speed) / activePreset.duration
        if (next >= 1) {
          if (loop || activePreset.loop) return 0
          setPlaying(false)
          return 1
        }
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    lastFrameRef.current = performance.now()
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, speed, activePreset.duration, activePreset.loop, loop])

  // ─── Compute current frame ─────────────────────────────────────────────────

  // Split layers: shapes + local-font text → Three.js, Google Font text → CSS overlay
  const allInterpolated = layers.map(line => {
    const s = interpolateKeyframes(line.keyframes, time)
    const isShape = isShapeLayer(line)
    const textLine = isShape ? null : line
    const fontKey = textLine?.font || (textLine?.mode === '2d' ? 'orbitron' : 'helvetiker')
    const fontInfo = fontKey ? FONT_REGISTRY[fontKey] : null
    const isGoogleFont = !isShape && fontInfo && !fontInfo.path && fontInfo.css
    return { line, s, fontKey, isGoogleFont, isShape }
  })

  const lines3D: Title3DLine[] = allInterpolated
    .filter(({ isGoogleFont }) => !isGoogleFont)
    .map(({ line, s, isShape }) => {
      if (isShape) {
        const shapeLine = line as MotionShapeLine
        return {
          text: '',
          color: s.color,
          fontSize: s.fontSize,
          x: s.x,
          y: s.y,
          rotation: s.rotation,
          scaleX: s.scaleX,
          scaleY: s.scaleY,
          skewX: s.skewX,
          opacity: s.opacity,
          isShape: true,
          shapeType: shapeLine.shape.shape,
          shapeWidth: shapeLine.shape.width,
          shapeHeight: shapeLine.shape.height,
          shapeFill: shapeLine.shape.fill,
          shapeEmissive: shapeLine.shape.emissive,
          shapeEmissiveIntensity: shapeLine.shape.emissiveIntensity,
          shapeBlur: shapeLine.shape.blur,
        }
      }
      return {
        text: (line as any).text || '',
        color: s.color,
        fontSize: s.fontSize,
        x: s.x,
        y: s.y,
        rotation: s.rotation,
        scaleX: s.scaleX,
        scaleY: s.scaleY,
        skewX: s.skewX,
        opacity: s.opacity,
        mode: (line as any).mode,
        font: (line as any).font,
      }
    })

  // CSS overlay lines (Google Fonts — rendered as HTML divs)
  const overlayLines = allInterpolated
    .filter(({ isGoogleFont }) => isGoogleFont)
    .map(({ line, s, fontKey }) => ({
      text: (line as any).text || '',
      ...s,
      fontKey,
      css: FONT_REGISTRY[fontKey as keyof typeof FONT_REGISTRY]?.css || '',
    }))

  const settings3D: Title3DSettings = {
    material: activePreset.material,
    depth: activePreset.depth,
    bevelEnabled: activePreset.bevelEnabled,
    bevelSize: activePreset.bevelSize,
    lighting: activePreset.lighting,
    camera: activePreset.camera,
    bloomIntensity: 1,
    particles: activePreset.particles,
    animation: 'none', // we drive animation via keyframes, not Title3DScene's built-in
    scene: activePreset.scene,
  }

  // ─── Video background (removed) ────────────────────────────────────────────

  const skipVideo = useCallback(() => {
    if (videoList.length === 0) return
    const idx = (videoList.indexOf(videoSrc) + 1) % videoList.length
    setVideoSrc(videoList[idx])
  }, [videoList, videoSrc])

  // ─── Music ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const TRACKS = ['/music/暴走ハートビート.mp3', '/music/反逆エンジン.mp3', '/music/赤信号ぶっちぎれ.mp3',
      '/music/爆速ギャルズ・ゼロ距離.mp3', '/music/焦げたスニーカー.mp3', '/music/燃えるまで噛みつけ.mp3']
    let idx = Math.floor(Math.random() * TRACKS.length)
    const playTrack = () => {
      const audio = new Audio(TRACKS[idx])
      audio.volume = 0.3
      audio.crossOrigin = 'anonymous'
      audio.oncanplaythrough = () => {
        audio.play().then(() => {
          if (!audioCtxRef.current) {
            try {
              const ctx = new AudioContext()
              const source = ctx.createMediaElementSource(audio)
              const analyser = ctx.createAnalyser()
              analyser.fftSize = 256
              analyser.smoothingTimeConstant = 0.4
              source.connect(analyser)
              analyser.connect(ctx.destination)
              audioCtxRef.current = ctx
              setAnalyserNode(analyser)
            } catch { /* ignore */ }
          }
        }).catch(() => { musicStartedRef.current = false })
      }
      audio.onended = () => { idx = (idx + 1) % TRACKS.length; playTrack() }
      audio.onerror = () => { idx = (idx + 1) % TRACKS.length; setTimeout(playTrack, 300) }
      audioRef.current = audio
      audio.load()
    }
    const start = () => {
      if (musicStartedRef.current) return
      musicStartedRef.current = true
      playTrack()
    }
    // Music auto-play disabled — click/touchstart listeners removed
    return () => {
      window.removeEventListener('click', start)
      window.removeEventListener('touchstart', start)
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    }
  }, [])

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p) }
      if (e.key === 'Escape') setFullscreen(false)
      if (e.key === 'f') setFullscreen(f => !f)
      if (e.key === 'h') setShowControls(s => !s)
      if (e.key === 'ArrowRight') setTime(t => Math.min(1, t + 0.05))
      if (e.key === 'ArrowLeft') setTime(t => Math.max(0, t - 0.05))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ─── Preset selection ──────────────────────────────────────────────────────

  const selectPreset = useCallback((preset: MotionPreset) => {
    setActivePreset(preset)
    setLayers(JSON.parse(JSON.stringify(preset.lines)))
    setSelectedLayer(0)
    setTime(0)
    setPlaying(true)
    setLoop(preset.loop)
  }, [])

  // Auto-cycle presets and randomize fonts
  const [autoCycle, setAutoCycle] = useState(true)
  useEffect(() => {
    if (!autoCycle) return
    const fonts = Object.keys(FONT_REGISTRY) as FontKey[]
    const id = setInterval(() => {
      // Pick random preset
      const nextPreset = MOTION_PRESETS[Math.floor(Math.random() * MOTION_PRESETS.length)]
      setActivePreset(nextPreset)
      // Randomize fonts on each line
      const newLines = JSON.parse(JSON.stringify(nextPreset.lines)) as MotionLine[]
      newLines.forEach((line: any) => {
        if (!isShapeLayer(line)) {
          line.font = fonts[Math.floor(Math.random() * fonts.length)]
        }
      })
      setLayers(newLines)
      setTime(0)
      setPlaying(true)
      setLoop(nextPreset.loop)
    }, 3000 + Math.random() * 2000) // 3-5 seconds between changes
    return () => clearInterval(id)
  }, [autoCycle])

  const updateLayer = useCallback((index: number, patch: Partial<MotionLine>) => {
    setLayers(prev => prev.map((l, i) => i === index ? ({ ...l, ...patch } as MotionLine) : l))
  }, [])

  const addTextLayer = useCallback(() => {
    const newLine: MotionLine = {
      text: 'NEW TEXT',
      mode: '2d',
      font: 'orbitron',
      keyframes: [
        { time: 0, x: 640, y: 360, fontSize: 60, opacity: 0, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, color: '#ffffff' },
        { time: 0.15, x: 640, y: 360, fontSize: 60, opacity: 1, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, color: '#ffffff', easing: 'hardSnap' },
        { time: 0.8, x: 640, y: 360, fontSize: 60, opacity: 1, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, color: '#ffffff' },
        { time: 0.85, x: 640, y: 360, fontSize: 60, opacity: 0, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, color: '#ffffff', easing: 'hardSnap' },
      ],
    }
    setLayers(prev => [...prev, newLine])
    setSelectedLayer(layers.length)
  }, [layers.length])

  const addShapeLayer = useCallback((shapeType: 'rect' | 'circle' | 'line' | 'beam' | 'ring' = 'rect') => {
    const newShape: MotionShapeLine = {
      layerType: 'shape',
      label: shapeType === 'rect' ? 'Bar' : shapeType === 'beam' ? 'Light Beam' : shapeType === 'line' ? 'Rule' : shapeType === 'circle' ? 'Circle' : 'Ring',
      shape: {
        shape: shapeType,
        width: shapeType === 'line' ? 800 : shapeType === 'beam' ? 600 : 400,
        height: shapeType === 'line' ? 2 : shapeType === 'beam' ? 200 : shapeType === 'rect' ? 4 : 100,
        fill: shapeType === 'beam' ? '#ff0040' : '#ffffff',
        emissive: shapeType === 'beam' ? '#ff0040' : undefined,
        emissiveIntensity: shapeType === 'beam' ? 3 : undefined,
      },
      keyframes: [
        { time: 0, x: 640, y: 360, fontSize: 0, opacity: 0, rotation: 0, scaleX: 0.01, scaleY: 1, skewX: 0, color: '#ffffff' },
        { time: 0.1, x: 640, y: 360, fontSize: 0, opacity: 0.6, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, color: '#ffffff', easing: 'whip' },
        { time: 0.8, x: 640, y: 360, fontSize: 0, opacity: 0.6, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, color: '#ffffff' },
        { time: 0.9, x: 640, y: 360, fontSize: 0, opacity: 0, rotation: 0, scaleX: 0.01, scaleY: 1, skewX: 0, color: '#ffffff', easing: 'easeIn' },
      ],
    }
    setLayers(prev => [...prev, newShape])
    setSelectedLayer(layers.length)
  }, [layers.length])

  const removeLayer = useCallback((index: number) => {
    setLayers(prev => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length === 0) return prev
      return next
    })
    setSelectedLayer(s => Math.min(s, layers.length - 2))
  }, [layers.length])

  const moveLayer = useCallback((index: number, dir: -1 | 1) => {
    setLayers(prev => {
      const target = index + dir
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setSelectedLayer(s => s + dir)
  }, [])

  const categories = [...new Set(MOTION_PRESETS.map(p => p.category))]
  const filteredPresets = filterCategory
    ? MOTION_PRESETS.filter(p => p.category === filterCategory)
    : MOTION_PRESETS

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`bg-black text-white ${fullscreen ? 'fixed inset-0 z-50' : 'h-screen flex flex-col overflow-hidden'}`}>

      {/* ── Top row: Layers | Viewport | Presets ── */}
      <div className={`flex flex-1 min-h-0 ${fullscreen ? '' : ''}`}>

        {/* ── LEFT: Layer Palette ── */}
        {showControls && showLayers && !fullscreen && (
          <div className="w-[260px] border-r border-zinc-800 flex flex-col bg-zinc-950 shrink-0">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest" style={{ fontFamily: 'var(--font-brand)' }}>
                Layers ({layers.length})
              </h3>
              <div className="flex gap-1">
                <button onClick={addTextLayer}
                  className="text-[9px] text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-1.5 py-0.5">
                  +T
                </button>
                <button onClick={() => addShapeLayer('rect')}
                  className="text-[9px] text-amber-500/70 hover:text-amber-400 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-1.5 py-0.5">
                  ■
                </button>
                <button onClick={() => addShapeLayer('beam')}
                  className="text-[9px] text-amber-500/70 hover:text-amber-400 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-1.5 py-0.5">
                  ▮
                </button>
                <button onClick={() => addShapeLayer('circle')}
                  className="text-[9px] text-amber-500/70 hover:text-amber-400 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-1.5 py-0.5">
                  ●
                </button>
                <button onClick={() => addShapeLayer('line')}
                  className="text-[9px] text-amber-500/70 hover:text-amber-400 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-1.5 py-0.5">
                  ─
                </button>
              </div>
            </div>

            {/* Layer list — each layer has inline font/mode/material controls */}
            <div className="flex-1 overflow-y-auto">
              {[...layers].reverse().map((layer, ri) => {
                const i = layers.length - 1 - ri
                const isSelected = i === selectedLayer
                const s = interpolateKeyframes(layer.keyframes, time)
                const isShape = isShapeLayer(layer)
                const textLayer = isShape ? null : layer
                const shapeLayer = isShape ? layer as MotionShapeLine : null
                const is2d = !isShape && ((layer as any).mode || '3d') === '2d'
                const fontEntries = !isShape ? (Object.entries(FONT_REGISTRY) as [FontKey, { label: string; supports3d: boolean; category: string }][])
                  .filter(([, info]) => is2d || info.supports3d) : []
                const fontCats = [...new Set(fontEntries.map(([, info]) => info.category))]

                return (
                  <div key={i}
                    onClick={() => setSelectedLayer(i)}
                    className={`border-b transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-red-500/10 border-red-500/20'
                        : 'bg-zinc-950 border-zinc-800/50 hover:bg-zinc-900/50'
                    } ${s.opacity < 0.05 ? 'opacity-40' : ''}`}
                  >
                    {/* Row 1: badge + name + controls */}
                    <div className="flex items-center">
                      <div className={`w-7 h-8 flex items-center justify-center text-[8px] font-black shrink-0 border-r border-zinc-800/50 ${
                        isShape ? 'text-amber-500' : is2d ? 'text-cyan-500' : 'text-red-500'
                      }`}>
                        {isShape ? (shapeLayer!.shape.shape === 'rect' ? '■' : shapeLayer!.shape.shape === 'circle' ? '●' : shapeLayer!.shape.shape === 'beam' ? '▮' : shapeLayer!.shape.shape === 'ring' ? '◎' : '─') : is2d ? '2D' : '3D'}
                      </div>
                      <div className="w-5 h-8 flex items-center justify-center shrink-0 border-r border-zinc-800/50">
                        <span className="w-3 h-3 border border-zinc-600" style={{ backgroundColor: isShape ? shapeLayer!.shape.fill : s.color }} />
                      </div>
                      {isShape ? (
                        <span className="flex-1 min-w-0 px-2 py-1 text-[10px] text-amber-400/70 font-medium truncate">
                          {shapeLayer!.label}
                        </span>
                      ) : (
                        <input
                          type="text"
                          value={textLayer!.text}
                          onChange={e => { e.stopPropagation(); updateLayer(i, { text: e.target.value } as any) }}
                          onClick={e => e.stopPropagation()}
                          className="flex-1 min-w-0 bg-transparent px-2 py-1 text-[10px] text-zinc-300 font-medium focus:outline-none focus:bg-zinc-900/50 truncate"
                        />
                      )}
                      <div className="flex shrink-0">
                        <button onClick={e => { e.stopPropagation(); moveLayer(i, -1) }}
                          className="text-[9px] text-zinc-600 hover:text-white w-4 h-8 flex items-center justify-center">&#9660;</button>
                        <button onClick={e => { e.stopPropagation(); moveLayer(i, 1) }}
                          className="text-[9px] text-zinc-600 hover:text-white w-4 h-8 flex items-center justify-center">&#9650;</button>
                        <button onClick={e => { e.stopPropagation(); removeLayer(i) }}
                          className="text-[9px] text-zinc-600 hover:text-red-400 w-4 h-8 flex items-center justify-center">x</button>
                      </div>
                    </div>

                    {/* Row 2: font picker (text) or shape type (shape) */}
                    {!isShape && (
                      <div className="flex items-center gap-1 px-1 pb-1">
                        {(['2d', '3d'] as LayerMode[]).map(m => (
                          <button key={m}
                            onClick={e => { e.stopPropagation(); updateLayer(i, { mode: m } as any) }}
                            className={`px-1.5 py-0 text-[8px] font-bold transition-all ${
                              ((layer as any).mode || '3d') === m
                                ? m === '2d' ? 'text-cyan-400' : 'text-red-400'
                                : 'text-zinc-600 hover:text-zinc-400'
                            }`}>
                            {m.toUpperCase()}
                          </button>
                        ))}
                        <select
                          value={(layer as any).font || (is2d ? 'orbitron' : 'helvetiker')}
                          onChange={e => { e.stopPropagation(); updateLayer(i, { font: e.target.value as FontKey } as any) }}
                          onClick={e => e.stopPropagation()}
                          className="flex-1 bg-transparent border-0 px-0 py-0 text-[9px] text-zinc-400 focus:text-zinc-200 focus:outline-none cursor-pointer"
                        >
                          {fontCats.map(cat => (
                            <optgroup key={cat} label={cat.toUpperCase()}>
                              {fontEntries.filter(([, info]) => info.category === cat).map(([key, info]) => (
                                <option key={key} value={key} className="bg-zinc-900 text-zinc-300">{info.label}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Material chips (selected only) */}
                    {isSelected && (
                      <div className="flex gap-0.5 flex-wrap px-1 pb-1.5">
                        {['', 'chrome', 'gold', 'neon', 'matte', 'crimson', 'hologram', 'ice'].map(mat => (
                          <button key={mat}
                            onClick={e => { e.stopPropagation(); updateLayer(i, { material: (mat || undefined) as any }) }}
                            className={`px-1 py-0 text-[7px] font-bold border transition-all ${
                              (layer.material || '') === mat
                                ? 'bg-red-500/20 border-red-500/60 text-red-400'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-600'
                            }`}>
                            {mat || 'def'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── CENTER: Viewport ── */}
        <div className={`relative bg-black flex-1 flex items-center justify-center ${fullscreen ? 'w-full h-full' : ''}`}>
        <div className="relative bg-black" style={{ aspectRatio: '16/9', height: '100%', maxHeight: '100%', maxWidth: '100%' }}>
        {/* Video background */}
        {videoSrc && activePreset.scene === 'transparent' && (
          <video
            src={videoSrc}
            autoPlay muted loop playsInline
            className="absolute inset-0 w-full h-full object-cover"
            onError={skipVideo}
          />
        )}

        {/* 3D scene */}
        <Suspense fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-red-500 text-sm font-mono animate-pulse">Loading 3D Engine...</div>
          </div>
        }>
          <Title3DScene
            key={activePreset.name}
            analyserNode={analyserNode}
            settings={settings3D}
            lines={lines3D}
          />
        </Suspense>

        {/* CSS overlay — Google Font 2D layers rendered as HTML */}
        {overlayLines.length > 0 && (
          <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
            {overlayLines.map((ol, i) => (
              <div
                key={i}
                className="absolute whitespace-nowrap"
                style={{
                  left: `${(ol.x / 1280) * 100}%`,
                  top: `${(ol.y / 720) * 100}%`,
                  transform: `translate(-50%, -50%) rotate(${ol.rotation}deg) scale(${ol.scaleX}, ${ol.scaleY}) skewX(${ol.skewX}deg)`,
                  fontSize: `${ol.fontSize * 0.08}vw`,
                  fontFamily: ol.css,
                  color: ol.color,
                  opacity: ol.opacity,
                  textShadow: `0 0 20px ${ol.color}40, 0 0 40px ${ol.color}20, 0 2px 4px rgba(0,0,0,0.8)`,
                  WebkitTextStroke: '1px rgba(0,0,0,0.3)',
                  letterSpacing: '0.05em',
                }}
              >
                {ol.text}
              </div>
            ))}
          </div>
        )}

        {/* Top-left badge */}
        <div className="absolute top-3 left-3 z-20 pointer-events-none flex items-center gap-2">
          <span className="text-[10px] font-black text-red-500 bg-black/70 px-2 py-0.5 backdrop-blur-sm"
            style={{ fontFamily: 'var(--font-brand)' }}>
            MOTION GRAPHICS
          </span>
          <span className="text-[10px] text-white/40 font-mono bg-black/50 px-1.5 py-0.5 backdrop-blur-sm">
            {activePreset.name}
          </span>
          <span className="text-[10px] text-white/30 font-mono bg-black/40 px-1.5 py-0.5">
            {(time * activePreset.duration).toFixed(1)}s / {activePreset.duration}s
          </span>
        </div>

        {/* Top-right controls */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          {videoSrc && activePreset.scene === 'transparent' && (
            <button onClick={skipVideo}
              className="text-[10px] text-white/40 hover:text-white/80 bg-black/50 hover:bg-black/70 px-2 py-1 backdrop-blur-sm transition-all">
              next video
            </button>
          )}
          <button onClick={() => setShowControls(s => !s)}
            className="text-[10px] text-white/40 hover:text-white/80 bg-black/50 hover:bg-black/70 px-2 py-1 backdrop-blur-sm transition-all">
            {showControls ? 'hide' : 'show'} [H]
          </button>
          <button onClick={() => setFullscreen(f => !f)}
            className="text-[10px] text-white/40 hover:text-white/80 bg-black/50 hover:bg-black/70 px-2 py-1 backdrop-blur-sm transition-all">
            {fullscreen ? 'exit' : 'full'} [F]
          </button>
        </div>

        {/* Music hint */}
        {!musicStartedRef.current && (
          <div className="absolute bottom-14 inset-x-0 text-center z-20 pointer-events-none">
            <span className="text-[10px] text-red-500/50 font-mono uppercase tracking-widest bg-black/30 px-3 py-1 backdrop-blur-sm">
              click for music + beat sync
            </span>
          </div>
        )}

        {/* ── Timeline bar ── */}
        <div className="absolute bottom-0 inset-x-0 z-20 bg-black/60 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-3 py-2">
            {/* Play/Pause */}
            <button onClick={() => setPlaying(p => !p)}
              className="text-white/80 hover:text-white w-6 h-6 flex items-center justify-center">
              {playing ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <polygon points="6,4 20,12 6,20" />
                </svg>
              )}
            </button>

            {/* Restart */}
            <button onClick={() => { setTime(0); setPlaying(true) }}
              className="text-white/50 hover:text-white text-[10px] font-mono">
              ↻
            </button>

            {/* Timeline scrubber */}
            <div className="flex-1 relative h-6 flex items-center group cursor-pointer"
              onPointerDown={e => {
                const rect = e.currentTarget.getBoundingClientRect()
                const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                setTime(t)
                setPlaying(false)
                const move = (ev: PointerEvent) => {
                  const t2 = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))
                  setTime(t2)
                }
                const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
                window.addEventListener('pointermove', move)
                window.addEventListener('pointerup', up)
              }}
            >
              {/* Track */}
              <div className="absolute inset-x-0 h-1 bg-zinc-700 rounded-full top-1/2 -translate-y-1/2">
                <div className="h-full bg-red-500 rounded-full transition-none" style={{ width: `${time * 100}%` }} />
              </div>
              {/* Keyframe markers */}
              {activePreset.lines.flatMap((line, li) =>
                line.keyframes.map((kf, ki) => (
                  <div key={`${li}-${ki}`}
                    className="absolute w-0.5 h-2.5 bg-white/20 top-1/2 -translate-y-1/2"
                    style={{ left: `${kf.time * 100}%` }}
                  />
                ))
              )}
              {/* Playhead */}
              <div className="absolute w-3 h-3 bg-red-500 rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2 shadow-[0_0_6px_rgba(255,0,64,0.5)] group-hover:scale-125 transition-transform"
                style={{ left: `${time * 100}%` }}
              />
            </div>

            {/* Speed */}
            <div className="flex items-center gap-1">
              {[0.25, 0.5, 1, 2].map(s => (
                <button key={s} onClick={() => setSpeed(s)}
                  className={`text-[9px] font-mono px-1.5 py-0.5 transition-all ${
                    speed === s ? 'text-red-400 bg-red-500/20' : 'text-white/30 hover:text-white/60'
                  }`}>
                  {s}x
                </button>
              ))}
            </div>

            {/* Loop */}
            <button onClick={() => setLoop(l => !l)}
              className={`text-[10px] font-mono px-1.5 py-0.5 transition-all ${
                loop ? 'text-red-400 bg-red-500/20' : 'text-white/30 hover:text-white/60'
              }`}>
              loop
            </button>

            {/* Time display */}
            <span className="text-[10px] text-white/40 font-mono w-10 text-right">
              {Math.round(time * 100)}%
            </span>
          </div>
        </div>
      </div>
      </div>

        {/* ── RIGHT: Presets ── */}
        {showControls && !fullscreen && (
          <div className="w-[220px] border-l border-zinc-800 flex flex-col bg-zinc-950 shrink-0 overflow-hidden">
            {/* Category filter */}
            <div className="flex flex-wrap gap-1 px-2 py-1.5 border-b border-zinc-800 shrink-0">
              <button
                onClick={() => setFilterCategory(null)}
                className={`px-1.5 py-0.5 text-[9px] font-bold uppercase border transition-all ${
                  !filterCategory ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                }`}>
                All
              </button>
              {categories.map(cat => (
                <button key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-1.5 py-0.5 text-[9px] font-bold uppercase border transition-all ${
                    filterCategory === cat ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Preset list */}
            <div className="flex-1 overflow-y-auto">
              {filteredPresets.map(preset => (
                <button key={preset.id}
                  onClick={() => selectPreset(preset)}
                  className={`w-full text-left px-2.5 py-2 border-b transition-all ${
                    activePreset.id === preset.id
                      ? 'bg-red-500/15 border-red-500/20'
                      : 'bg-zinc-950 border-zinc-800/50 hover:bg-zinc-900/50'
                  }`}>
                  <div className="text-[10px] font-bold text-zinc-200 truncate" style={{ fontFamily: 'var(--font-brand)' }}>
                    {preset.name}
                  </div>
                  <div className="text-[8px] text-zinc-600 mt-0.5">
                    {preset.duration}s &middot; {preset.lines.length}L &middot; {preset.material} &middot; {preset.category}
                  </div>
                </button>
              ))}
            </div>

            {/* Shortcuts */}
            <div className="px-2 py-1.5 border-t border-zinc-800 shrink-0">
              <div className="text-[8px] text-zinc-600 font-mono leading-relaxed">
                SPACE play &middot; F full<br/>H hide &middot; ←→ scrub
              </div>
            </div>
          </div>
        )}

      </div>{/* end top row */}
    </div>
  )
}
