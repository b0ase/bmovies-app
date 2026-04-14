/**
 * Motion Graphics Engine — NPGX
 *
 * Visual style: Japanese punk. Zen stillness punctuated by violence.
 * Thin elegant lines next to raw type. Crimson on black.
 * Asymmetry with intent. The "X" is always the wildcard.
 *
 * Design principles:
 * - Breathing room: long holds make short hits land harder
 * - Scale contrast: 20px subtitle against 150px hero = tension
 * - Color restraint: 2-3 colors per preset, no rainbow
 * - Typography pairing: heavy display + thin sans = punk elegance
 * - Detail layers: rules, subtitles, ghost text add depth
 * - Asymmetric layout: off-center is more interesting
 */

import type {
  MaterialPreset,
  LightingPreset,
  CameraMode,
  ParticleType,
  SceneType,
} from '@/components/Title3DScene'

// ── Easings ─────────────────────────────────────────────────────────────────

export const easings = {
  linear: (t: number) => t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeIn: (t: number) => t * t * t,
  easeInOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  // Gentle
  breathe: (t: number) => (Math.sin(t * Math.PI - Math.PI / 2) + 1) / 2,
  drift: (t: number) => 1 - Math.pow(1 - t, 2), // soft decel
  // Rough
  snap: (t: number) => t < 0.5 ? 0 : 1,
  hardSnap: (t: number) => t < 0.08 ? 0 : 1,
  slam: (t: number) => {
    if (t < 0.35) return (t / 0.35) * 1.25
    if (t < 0.55) return 1.25 - (t - 0.35) / 0.2 * 0.25
    return 1
  },
  whip: (t: number) => 1 - Math.pow(1 - t, 6),
  crash: (t: number) => {
    if (t < 0.25) return 1 + (0.25 - t) * 0.35
    if (t < 0.5) return 1 - (t - 0.25) * 0.2
    return 1 - (1 - t) * 0.08
  },
  jolt: (t: number) => {
    if (t < 0.12) return t / 0.12 * 1.15
    return 1 + Math.sin(t * 18) * 0.06 * (1 - t)
  },
  stutter: (t: number) => {
    if (t < 0.15) return 0
    if (t < 0.3) return 0.5
    if (t < 0.4) return 0.3
    if (t < 0.55) return 0.8
    if (t < 0.65) return 0.6
    return 1
  },
  elastic: (t: number) => {
    if (t === 0 || t === 1) return t
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1
  },
} as const

export type EasingName = keyof typeof easings

// ── Types ───────────────────────────────────────────────────────────────────

export interface LineKeyframe {
  time: number
  x: number
  y: number
  fontSize: number
  opacity: number
  rotation: number
  scaleX: number
  scaleY: number
  skewX: number
  color: string
  easing?: EasingName
}

export type LayerMode = '2d' | '3d'
export type FontKey =
  | 'helvetiker' | 'orbitron' | 'marker' | 'cyberpunk' | 'cyberpunk-italic' | 'hardcore'
  | 'bebas' | 'anton' | 'blackops' | 'russo' | 'teko' | 'staatliches'
  | 'bungee' | 'bungee-shade' | 'monoton' | 'pixel' | 'creepster'
  | 'typewriter' | 'rubik-mono' | 'sedan' | 'impact' | 'courier' | 'georgia'

// ── Shape types ─────────────────────────────────────────────────────────────

export type ShapeType = 'rect' | 'circle' | 'line' | 'beam' | 'ring'

export interface ShapeProps {
  shape: ShapeType
  width: number       // canvas units (1280-space)
  height: number      // for circle/ring: ignored (width = diameter)
  fill: string        // color
  emissive?: string   // glow color
  emissiveIntensity?: number
  blur?: number       // soft edge
}

// ── Layer union ─────────────────────────────────────────────────────────────

export interface MotionTextLine {
  layerType?: 'text'  // optional for backward compat
  text: string
  keyframes: LineKeyframe[]
  material?: MaterialPreset
  mode?: LayerMode
  font?: FontKey
}

export interface MotionShapeLine {
  layerType: 'shape'
  label: string
  shape: ShapeProps
  keyframes: LineKeyframe[]   // reuse same keyframe type — x, y, opacity, rotation, scale, color all work
  material?: MaterialPreset
}

export type MotionLine = MotionTextLine | MotionShapeLine

export function isShapeLayer(line: MotionLine): line is MotionShapeLine {
  return (line as any).layerType === 'shape'
}

export interface MotionPreset {
  id: string
  name: string
  category: 'film' | 'music' | 'anime' | 'punk' | 'horror' | 'minimal' | 'cyber' | 'epic'
  description: string
  duration: number
  loop: boolean
  lines: MotionLine[]
  material: MaterialPreset
  lighting: LightingPreset
  camera: CameraMode
  particles: ParticleType
  scene: SceneType
  depth: number
  bevelEnabled: boolean
  bevelSize: number
}

// ── Interpolation ───────────────────────────────────────────────────────────

function lerpNum(a: number, b: number, t: number) { return a + (b - a) * t }

export function interpolateKeyframes(
  keyframes: LineKeyframe[],
  t: number,
): Omit<LineKeyframe, 'time' | 'easing'> {
  if (keyframes.length === 0) return { x: 640, y: 360, fontSize: 72, opacity: 1, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, color: '#ffffff' }
  if (keyframes.length === 1 || t <= keyframes[0].time) return keyframes[0]
  if (t >= keyframes[keyframes.length - 1].time) return keyframes[keyframes.length - 1]

  let i = 0
  while (i < keyframes.length - 1 && keyframes[i + 1].time <= t) i++

  const from = keyframes[i]
  const to = keyframes[i + 1]
  const local = (t - from.time) / (to.time - from.time)
  const e = (easings[to.easing || 'linear'])(local)

  return {
    x: lerpNum(from.x, to.x, e),
    y: lerpNum(from.y, to.y, e),
    fontSize: lerpNum(from.fontSize, to.fontSize, e),
    opacity: lerpNum(from.opacity, to.opacity, e),
    rotation: lerpNum(from.rotation, to.rotation, e),
    scaleX: lerpNum(from.scaleX, to.scaleX, e),
    scaleY: lerpNum(from.scaleY, to.scaleY, e),
    skewX: lerpNum(from.skewX, to.skewX, e),
    color: e < 0.5 ? from.color : to.color,
  }
}

// ── Keyframe helpers ────────────────────────────────────────────────────────

const CX = 640, CY = 360

function kf(time: number, o: Partial<LineKeyframe> = {}): LineKeyframe {
  return { time, x: CX, y: CY, fontSize: 72, opacity: 1, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, color: '#ffffff', ...o }
}

function strobe(start: number, end: number, count: number, base: Partial<LineKeyframe> = {}): LineKeyframe[] {
  const frames: LineKeyframe[] = []
  const step = (end - start) / (count * 2)
  for (let i = 0; i < count * 2; i++) {
    frames.push(kf(start + step * i, { ...base, opacity: i % 2 === 0 ? 1 : 0, easing: 'hardSnap' }))
  }
  return frames
}

function shake(start: number, end: number, count: number, intensity: number, base: Partial<LineKeyframe> = {}): LineKeyframe[] {
  const frames: LineKeyframe[] = []
  const step = (end - start) / count
  const bx = base.x ?? CX, by = base.y ?? CY
  for (let i = 0; i < count; i++) {
    const s1 = Math.sin(i * 7.3 + 0.5)
    const s2 = Math.cos(i * 11.1 + 0.3)
    frames.push(kf(start + step * i, {
      ...base,
      x: bx + s1 * intensity,
      y: by + s2 * intensity * 0.5,
      rotation: (base.rotation ?? 0) + s1 * intensity * 0.12,
      easing: 'linear',
    }))
  }
  frames.push(kf(end, { ...base, x: bx, y: by, rotation: base.rotation ?? 0, easing: 'linear' }))
  return frames
}

function slamIn(time: number, from: 'top' | 'bottom' | 'left' | 'right', base: Partial<LineKeyframe> = {}): LineKeyframe[] {
  const tx = base.x ?? CX, ty = base.y ?? CY
  const off = from === 'top' ? { y: -150 } : from === 'bottom' ? { y: 870 } : from === 'left' ? { x: -400 } : { x: 1680 }
  return [
    kf(time, { ...base, ...off, opacity: 0, easing: 'linear' }),
    kf(time + 0.008, { ...base, ...off, opacity: 1, easing: 'linear' }),
    kf(time + 0.035, { ...base, x: tx, y: ty, opacity: 1, easing: 'whip' }),
    kf(time + 0.055, { ...base, x: tx, y: ty, opacity: 1, easing: 'crash' }),
  ]
}

function cutOut(time: number, base: Partial<LineKeyframe> = {}): LineKeyframe[] {
  return [
    kf(time - 0.003, { ...base, opacity: 1 }),
    kf(time, { ...base, opacity: 0, easing: 'hardSnap' }),
  ]
}

/** Slow drift — subtle position float */
function drift(start: number, end: number, base: Partial<LineKeyframe>, dx: number, dy: number): LineKeyframe[] {
  const bx = base.x ?? CX, by = base.y ?? CY
  return [
    kf(start, { ...base, x: bx, y: by }),
    kf(end, { ...base, x: bx + dx, y: by + dy, easing: 'linear' }),
  ]
}

/** Shape layer shorthand */
function shapeLayer(
  shapeType: ShapeType,
  keyframes: LineKeyframe[],
  opts: { label?: string; width?: number; height?: number; fill?: string; emissive?: string; emissiveIntensity?: number; blur?: number; material?: MaterialPreset } = {},
): MotionShapeLine {
  return {
    layerType: 'shape',
    label: opts.label || shapeType,
    shape: {
      shape: shapeType,
      width: opts.width ?? 400,
      height: opts.height ?? 4,
      fill: opts.fill ?? '#ffffff',
      emissive: opts.emissive,
      emissiveIntensity: opts.emissiveIntensity,
      blur: opts.blur,
    },
    keyframes,
    material: opts.material,
  }
}

// ── PRESETS ──────────────────────────────────────────────────────────────────
//
// Each preset is designed with intentional visual hierarchy:
// - Ghost layer: large, faint, atmospheric
// - Hero layer: the main title
// - Detail layers: thin rules, subtitles, credits
// - Accent: the "X" — always treated differently
//

export const MOTION_PRESETS: MotionPreset[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ZEN STRIKE — silence then sudden impact
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'zen-strike',
    name: 'ZEN STRIKE',
    category: 'punk',
    description: 'Long silence. Then everything at once. Japanese punk.',
    duration: 6,
    loop: true,
    material: 'matte',
    lighting: 'void',
    camera: 'static',
    particles: 'none',
    scene: 'transparent',
    depth: 0.08,
    bevelEnabled: false,
    bevelSize: 0,
    lines: [
      // Ghost: huge faint "X" that drifts slowly the whole time
      {
        text: 'X',
        mode: '2d',
        font: 'bebas',
        keyframes: [
          kf(0, { opacity: 0, fontSize: 400, color: '#1a0000', x: CX + 200, y: CY }),
          kf(0.15, { opacity: 0.04, fontSize: 400, color: '#1a0000', x: CX + 200, y: CY, easing: 'drift' }),
          ...drift(0.15, 0.85, { opacity: 0.04, fontSize: 400, color: '#1a0000', x: CX + 200, y: CY }, -40, 10),
          kf(0.9, { opacity: 0, fontSize: 400, color: '#1a0000', easing: 'easeIn' }),
        ],
      },
      // Thin rule — shape layer, catches light
      shapeLayer('line', [
        kf(0.2, { opacity: 0, y: CY - 2, scaleX: 0.01, color: '#333333' }),
        kf(0.25, { opacity: 0.5, y: CY - 2, scaleX: 1, color: '#333333', easing: 'whip' }),
        kf(0.8, { opacity: 0.5, y: CY - 2, scaleX: 1, color: '#333333' }),
        kf(0.88, { opacity: 0, scaleX: 0.01, easing: 'easeIn' }),
      ], { width: 600, height: 2, fill: '#333333', label: 'Rule Line' }),
      // Subtitle — small, elegant, appears before the hit
      {
        text: 'N I N J A   P U N K   G I R L S',
        mode: '2d',
        font: 'teko',
        keyframes: [
          kf(0.28, { opacity: 0, fontSize: 16, color: '#666666', y: CY - 22 }),
          kf(0.35, { opacity: 0.7, fontSize: 16, color: '#666666', y: CY - 22, easing: 'drift' }),
          kf(0.42, { opacity: 0.7, fontSize: 16, color: '#666666', y: CY - 22 }),
          // the hit
          kf(0.43, { opacity: 0, easing: 'hardSnap' }),
        ],
      },
      // Rule and subtitle vanish — then HERO slams in
      {
        text: 'NINJA PUNK GIRLS',
        mode: '2d',
        font: 'anton',
        keyframes: [
          kf(0.42, { opacity: 0, fontSize: 95, color: '#ffffff', y: CY - 30, scaleX: 1.3 }),
          kf(0.44, { opacity: 1, fontSize: 95, color: '#ffffff', y: CY - 30, scaleX: 1, easing: 'whip' }),
          ...shake(0.45, 0.5, 5, 12, { fontSize: 95, color: '#ffffff', y: CY - 30 }),
          kf(0.5, { fontSize: 95, color: '#ffffff', y: CY - 30 }),
          kf(0.82, { fontSize: 95, color: '#ffffff', y: CY - 30 }),
          ...cutOut(0.85, { fontSize: 95, color: '#ffffff', y: CY - 30 }),
        ],
      },
      // X — arrives a beat after hero, slightly offset, different energy
      {
        text: 'X',
        mode: '3d',
        material: 'crimson',
        keyframes: [
          kf(0.46, { opacity: 0, fontSize: 140, color: '#cc0000', x: CX + 310, y: CY + 10, rotation: -12 }),
          kf(0.48, { opacity: 1, fontSize: 140, color: '#cc0000', x: CX + 310, y: CY + 10, rotation: -8, easing: 'slam' }),
          kf(0.82, { opacity: 1, fontSize: 140, color: '#cc0000', x: CX + 310, y: CY + 10, rotation: -8 }),
          kf(0.84, { opacity: 0, easing: 'hardSnap' }),
        ],
      },
      // Red light beam — appears behind title slam, wide atmospheric glow
      shapeLayer('beam', [
        kf(0.42, { opacity: 0, y: CY, scaleX: 0.01, color: '#cc0000' }),
        kf(0.45, { opacity: 0.15, y: CY, scaleX: 1, color: '#cc0000', easing: 'whip' }),
        kf(0.82, { opacity: 0.15, y: CY, color: '#cc0000' }),
        kf(0.85, { opacity: 0, scaleX: 0.01, easing: 'hardSnap' }),
      ], { width: 1200, height: 300, fill: '#cc0000', emissive: '#cc0000', emissiveIntensity: 4, label: 'Red Beam' }),
      // Bottom detail — appears with hero, tiny, grounding
      {
        text: 'TWENTY SIX GIRLS. YOUR FANTASY. YOUR FILM.',
        mode: '2d',
        font: 'teko',
        keyframes: [
          kf(0.5, { opacity: 0, fontSize: 11, color: '#444444', y: CY + 60 }),
          kf(0.55, { opacity: 0.5, fontSize: 11, color: '#444444', y: CY + 60, easing: 'drift' }),
          kf(0.82, { opacity: 0.5, fontSize: 11, color: '#444444', y: CY + 60 }),
          kf(0.85, { opacity: 0, easing: 'hardSnap' }),
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. NEON ELEGY — melancholic beauty with sharp edges
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'neon-elegy',
    name: 'NEON ELEGY',
    category: 'music',
    description: 'Melancholic neon. Beauty and violence. Music video soul.',
    duration: 7,
    loop: true,
    material: 'neon',
    lighting: 'neon-alley',
    camera: 'dolly',
    particles: 'dust',
    scene: 'transparent',
    depth: 0.12,
    bevelEnabled: true,
    bevelSize: 0.01,
    lines: [
      // Ghost: soft GIRLS floats in bg
      {
        text: 'GIRLS',
        mode: '2d',
        font: 'sedan',
        keyframes: [
          kf(0, { opacity: 0, fontSize: 200, color: '#0a0012', x: CX - 100, y: CY + 20 }),
          kf(0.1, { opacity: 0.03, fontSize: 200, color: '#0a0012', easing: 'drift' }),
          ...drift(0.1, 0.85, { opacity: 0.03, fontSize: 200, color: '#0a0012', x: CX - 100, y: CY + 20 }, 20, -5),
          kf(0.9, { opacity: 0, easing: 'easeIn' }),
        ],
      },
      // Thin top rule — breathes in early
      {
        text: '─',
        mode: '2d',
        font: 'courier',
        keyframes: [
          kf(0.05, { opacity: 0, fontSize: 8, color: '#ff00ff', y: CY - 55, scaleX: 0.1 }),
          kf(0.15, { opacity: 0.6, fontSize: 8, color: '#ff00ff', y: CY - 55, scaleX: 40, easing: 'easeOut' }),
          kf(0.7, { opacity: 0.6, fontSize: 8, color: '#ff00ff', y: CY - 55, scaleX: 40 }),
          kf(0.8, { opacity: 0, scaleX: 0.1, easing: 'easeIn' }),
        ],
      },
      // NINJA — thin, wide-spaced, above center
      {
        text: 'N I N J A',
        mode: '2d',
        font: 'teko',
        keyframes: [
          kf(0.1, { opacity: 0, fontSize: 22, color: '#cc44cc', y: CY - 42 }),
          kf(0.18, { opacity: 0.8, fontSize: 22, color: '#cc44cc', y: CY - 42, easing: 'drift' }),
          kf(0.7, { opacity: 0.8, color: '#cc44cc', y: CY - 42 }),
          kf(0.78, { opacity: 0, easing: 'easeIn' }),
        ],
      },
      // PUNK — hero, centered, arrives with weight
      {
        text: 'PUNK',
        mode: '2d',
        font: 'bebas',
        keyframes: [
          kf(0.15, { opacity: 0, fontSize: 130, color: '#ffffff', y: CY - 5 }),
          kf(0.22, { opacity: 1, fontSize: 130, color: '#ffffff', y: CY - 5, easing: 'easeOut' }),
          kf(0.68, { opacity: 1, color: '#ffffff', y: CY - 5 }),
          kf(0.72, { opacity: 0, color: '#ffffff', easing: 'easeIn' }),
        ],
      },
      // GIRLS — smaller, below, offset right, different font
      {
        text: 'GIRLS',
        mode: '2d',
        font: 'staatliches',
        keyframes: [
          kf(0.2, { opacity: 0, fontSize: 50, color: '#ff00ff', y: CY + 55, x: CX + 30 }),
          kf(0.28, { opacity: 1, fontSize: 50, color: '#ff00ff', y: CY + 55, x: CX + 30, easing: 'drift' }),
          kf(0.65, { opacity: 1 }),
          kf(0.7, { opacity: 0, easing: 'easeIn' }),
        ],
      },
      // X — late arrival, neon flicker
      {
        text: 'X',
        mode: '3d',
        material: 'neon',
        keyframes: [
          kf(0.35, { opacity: 0, fontSize: 90, color: '#ff00ff', x: CX + 195, y: CY + 30 }),
          kf(0.37, { opacity: 0.5, color: '#ff00ff', easing: 'hardSnap' }),
          kf(0.38, { opacity: 0, easing: 'hardSnap' }),
          kf(0.4, { opacity: 1, fontSize: 90, color: '#ff00ff', x: CX + 195, y: CY + 30, easing: 'hardSnap' }),
          kf(0.65, { opacity: 1 }),
          kf(0.67, { opacity: 0.3, easing: 'hardSnap' }),
          kf(0.68, { opacity: 0, easing: 'hardSnap' }),
        ],
      },
      // Bottom detail
      {
        text: 'YOUR FANTASY. YOUR FILM.',
        mode: '2d',
        font: 'teko',
        keyframes: [
          kf(0.3, { opacity: 0, fontSize: 10, color: '#664466', y: CY + 85 }),
          kf(0.38, { opacity: 0.4, fontSize: 10, color: '#664466', y: CY + 85, easing: 'drift' }),
          kf(0.65, { opacity: 0.4 }),
          kf(0.7, { opacity: 0, easing: 'easeIn' }),
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. CHROME CATHEDRAL — industrial reverence
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'chrome-cathedral',
    name: 'CHROME CATHEDRAL',
    category: 'film',
    description: 'Slow industrial reveal. Chrome and shadow. Cathedral scale.',
    duration: 8,
    loop: true,
    material: 'chrome',
    lighting: 'studio',
    camera: 'orbit',
    particles: 'dust',
    scene: 'transparent',
    depth: 0.3,
    bevelEnabled: true,
    bevelSize: 0.03,
    lines: [
      // Ghost: massive faint NPGX
      {
        text: 'NPGX',
        mode: '2d',
        font: 'bebas',
        keyframes: [
          kf(0, { opacity: 0, fontSize: 500, color: '#080808', x: CX, y: CY + 30 }),
          kf(0.08, { opacity: 0.025, fontSize: 500, color: '#080808', easing: 'drift' }),
          ...drift(0.08, 0.85, { opacity: 0.025, fontSize: 500, color: '#080808', x: CX, y: CY + 30 }, -15, 0),
          kf(0.9, { opacity: 0, easing: 'easeIn' }),
        ],
      },
      // Top rule — shape, catches studio light
      shapeLayer('line', [
        kf(0.03, { opacity: 0, y: CY - 80, scaleX: 0.01, color: '#2a2a2a' }),
        kf(0.08, { opacity: 0.4, y: CY - 80, scaleX: 1, color: '#2a2a2a', easing: 'easeOut' }),
        kf(0.82, { opacity: 0.4, y: CY - 80 }),
        kf(0.88, { opacity: 0, scaleX: 0.01, easing: 'easeIn' }),
      ], { width: 700, height: 1.5, fill: '#555555', label: 'Top Rule' }),
      // NINJA — 3D chrome, staggered reveal word 1
      {
        text: 'NINJA',
        mode: '3d',
        keyframes: [
          kf(0.06, { opacity: 0, fontSize: 85, y: CY - 50, color: '#e0e0e0' }),
          kf(0.12, { opacity: 1, fontSize: 85, y: CY - 50, color: '#e0e0e0', easing: 'easeOut' }),
          kf(0.8, { opacity: 1, y: CY - 50 }),
          kf(0.88, { opacity: 0, easing: 'easeIn' }),
        ],
      },
      // PUNK — 3D chrome, word 2
      {
        text: 'PUNK',
        mode: '3d',
        keyframes: [
          kf(0.12, { opacity: 0, fontSize: 85, y: CY + 15, color: '#e0e0e0' }),
          kf(0.2, { opacity: 1, fontSize: 85, y: CY + 15, color: '#e0e0e0', easing: 'easeOut' }),
          kf(0.8, { opacity: 1, y: CY + 15 }),
          kf(0.88, { opacity: 0, easing: 'easeIn' }),
        ],
      },
      // GIRLS — 3D chrome, word 3
      {
        text: 'GIRLS',
        mode: '3d',
        keyframes: [
          kf(0.2, { opacity: 0, fontSize: 85, y: CY + 80, color: '#e0e0e0' }),
          kf(0.28, { opacity: 1, fontSize: 85, y: CY + 80, color: '#e0e0e0', easing: 'easeOut' }),
          kf(0.8, { opacity: 1, y: CY + 80 }),
          kf(0.88, { opacity: 0, easing: 'easeIn' }),
        ],
      },
      // X — gold, late, different scale, slight rotation
      {
        text: 'X',
        mode: '3d',
        material: 'gold',
        keyframes: [
          kf(0.35, { opacity: 0, fontSize: 160, x: CX + 220, y: CY + 15, rotation: -10, color: '#ffd700' }),
          kf(0.45, { opacity: 1, fontSize: 160, x: CX + 220, y: CY + 15, rotation: -8, color: '#ffd700', easing: 'easeOut' }),
          kf(0.8, { opacity: 1, rotation: -8 }),
          kf(0.88, { opacity: 0, easing: 'easeIn' }),
        ],
      },
      // Bottom rule — shape
      shapeLayer('line', [
        kf(0.25, { opacity: 0, y: CY + 115, scaleX: 0.01, color: '#2a2a2a' }),
        kf(0.32, { opacity: 0.4, y: CY + 115, scaleX: 1, color: '#2a2a2a', easing: 'easeOut' }),
        kf(0.82, { opacity: 0.4, y: CY + 115 }),
        kf(0.88, { opacity: 0, scaleX: 0.01, easing: 'easeIn' }),
      ], { width: 700, height: 1.5, fill: '#555555', label: 'Bottom Rule' }),
      // Tagline — centered below bottom rule
      {
        text: 'TWENTY SIX CHARACTERS  ·  YOUR CINEMA',
        mode: '2d',
        font: 'teko',
        keyframes: [
          kf(0.35, { opacity: 0, fontSize: 10, color: '#555555', y: CY + 128 }),
          kf(0.42, { opacity: 0.45, fontSize: 10, color: '#555555', y: CY + 128, easing: 'drift' }),
          kf(0.8, { opacity: 0.45 }),
          kf(0.88, { opacity: 0, easing: 'easeIn' }),
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. GLITCH TRANSMISSION — corrupted broadcast
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'glitch-transmission',
    name: 'GLITCH TRANSMISSION',
    category: 'cyber',
    description: 'Corrupted signal. Brief clarity. Then static.',
    duration: 5,
    loop: true,
    material: 'hologram',
    lighting: 'neon-alley',
    camera: 'static',
    particles: 'sparks',
    scene: 'transparent',
    depth: 0.08,
    bevelEnabled: false,
    bevelSize: 0,
    lines: [
      // Scan line — shape sweeps down screen
      shapeLayer('line', [
        kf(0, { opacity: 0.12, y: 0, color: '#00ffff' }),
        kf(0.3, { opacity: 0.12, y: 720, color: '#00ffff', easing: 'linear' }),
        kf(0.31, { opacity: 0, y: 0, easing: 'hardSnap' }),
        kf(0.5, { opacity: 0.08, y: 0, color: '#ff0040' }),
        kf(0.8, { opacity: 0.08, y: 720, color: '#ff0040', easing: 'linear' }),
        kf(0.81, { opacity: 0, easing: 'hardSnap' }),
      ], { width: 1400, height: 2, fill: '#00ffff', emissive: '#00ffff', emissiveIntensity: 3, label: 'Scan Line' }),
      // Main text — corrupted entrance, brief clarity window
      {
        text: 'NINJA PUNK GIRLS',
        mode: '2d',
        font: 'staatliches',
        keyframes: [
          // Corruption phase
          kf(0, { opacity: 0, fontSize: 75, color: '#00ffff', skewX: 20, x: CX + 80 }),
          kf(0.03, { opacity: 0.6, color: '#ff0040', skewX: -15, x: CX - 50, easing: 'hardSnap' }),
          kf(0.06, { opacity: 0.3, color: '#00ffff', skewX: 10, x: CX + 30, easing: 'hardSnap' }),
          kf(0.09, { opacity: 0, skewX: -25, x: CX - 80, easing: 'hardSnap' }),
          kf(0.15, { opacity: 0.5, color: '#ff0040', skewX: 8, x: CX + 20, easing: 'hardSnap' }),
          kf(0.18, { opacity: 0, easing: 'hardSnap' }),
          // Clarity window
          kf(0.25, { opacity: 1, fontSize: 75, color: '#ffffff', skewX: 0, x: CX, easing: 'hardSnap' }),
          kf(0.6, { opacity: 1, color: '#ffffff', skewX: 0, x: CX }),
          // Corruption exit
          kf(0.62, { opacity: 0.7, color: '#00ffff', skewX: -12, x: CX - 40, easing: 'hardSnap' }),
          kf(0.65, { opacity: 0.3, color: '#ff0040', skewX: 15, x: CX + 60, easing: 'hardSnap' }),
          kf(0.68, { opacity: 0, skewX: 30, x: CX + 150, easing: 'hardSnap' }),
        ],
      },
      // X — flickers independently
      {
        text: 'X',
        mode: '2d',
        font: 'bungee',
        material: 'neon',
        keyframes: [
          kf(0.2, { opacity: 0, fontSize: 130, color: '#ff0040' }),
          kf(0.22, { opacity: 0.6, color: '#00ffff', easing: 'hardSnap' }),
          kf(0.24, { opacity: 0, easing: 'hardSnap' }),
          kf(0.27, { opacity: 1, fontSize: 130, color: '#ff0040', easing: 'hardSnap' }),
          kf(0.58, { opacity: 1, color: '#ff0040' }),
          kf(0.6, { opacity: 0.4, color: '#00ffff', x: CX + 10, easing: 'hardSnap' }),
          kf(0.62, { opacity: 0, x: CX - 20, easing: 'hardSnap' }),
        ],
      },
      // Error code — tiny, bottom-right, technical feel
      {
        text: 'ERR:0x402 // SIGNAL LOST',
        mode: '2d',
        font: 'courier',
        keyframes: [
          kf(0.1, { opacity: 0, fontSize: 8, color: '#004444', x: CX + 280, y: CY + 140 }),
          kf(0.15, { opacity: 0.35, fontSize: 8, color: '#004444', x: CX + 280, y: CY + 140, easing: 'hardSnap' }),
          kf(0.6, { opacity: 0.35 }),
          kf(0.65, { opacity: 0, easing: 'hardSnap' }),
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. HORROR SILENCE — dread through restraint
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'horror-silence',
    name: 'HORROR SILENCE',
    category: 'horror',
    description: 'What you can barely see is worse. Dread through restraint.',
    duration: 8,
    loop: true,
    material: 'matte',
    lighting: 'void',
    camera: 'static',
    particles: 'none',
    scene: 'transparent',
    depth: 0.05,
    bevelEnabled: false,
    bevelSize: 0,
    lines: [
      // Ghost: massive barely-visible text
      {
        text: 'NINJA PUNK GIRLS',
        mode: '2d',
        font: 'creepster',
        keyframes: [
          kf(0, { opacity: 0, fontSize: 180, color: '#0a0000' }),
          kf(0.15, { opacity: 0.02, fontSize: 180, color: '#0a0000', easing: 'drift' }),
          kf(0.7, { opacity: 0.02, color: '#0a0000' }),
          kf(0.85, { opacity: 0, easing: 'easeIn' }),
        ],
      },
      // Main text — slow flicker, never fully visible
      {
        text: 'NINJA PUNK GIRLS',
        mode: '2d',
        font: 'typewriter',
        keyframes: [
          kf(0.1, { opacity: 0, fontSize: 35, color: '#440000' }),
          kf(0.18, { opacity: 0.15, color: '#550000', easing: 'drift' }),
          kf(0.22, { opacity: 0.05, color: '#330000', easing: 'hardSnap' }),
          kf(0.28, { opacity: 0.3, color: '#660000', easing: 'hardSnap' }),
          kf(0.32, { opacity: 0.08, color: '#440000', easing: 'hardSnap' }),
          kf(0.38, { opacity: 0.5, color: '#770000', easing: 'hardSnap' }),
          kf(0.42, { opacity: 0.15, color: '#550000', easing: 'hardSnap' }),
          kf(0.5, { opacity: 0.6, color: '#880000', easing: 'drift' }),
          kf(0.6, { opacity: 0.6, color: '#880000' }),
          kf(0.63, { opacity: 0.1, color: '#440000', easing: 'hardSnap' }),
          kf(0.65, { opacity: 0.4, color: '#660000', easing: 'hardSnap' }),
          kf(0.72, { opacity: 0.2, color: '#550000', easing: 'drift' }),
          kf(0.82, { opacity: 0, color: '#330000', easing: 'easeIn' }),
        ],
      },
      // X — one brief flash near the end
      {
        text: 'X',
        mode: '2d',
        font: 'marker',
        keyframes: [
          kf(0.55, { opacity: 0, fontSize: 80, color: '#cc0000' }),
          kf(0.56, { opacity: 0.7, fontSize: 80, color: '#cc0000', easing: 'hardSnap' }),
          kf(0.58, { opacity: 0, easing: 'hardSnap' }),
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. GOLD REQUIEM — epic weight, earned grandeur
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'gold-requiem',
    name: 'GOLD REQUIEM',
    category: 'epic',
    description: 'The weight of gold. Each word earns its place.',
    duration: 8,
    loop: true,
    material: 'gold',
    lighting: 'sunset',
    camera: 'dolly',
    particles: 'embers',
    scene: 'transparent',
    depth: 0.35,
    bevelEnabled: true,
    bevelSize: 0.04,
    lines: [
      // Top rule — gold shape
      shapeLayer('line', [
        kf(0.02, { opacity: 0, y: CY - 90, scaleX: 0.01, color: '#4a3500' }),
        kf(0.08, { opacity: 0.5, y: CY - 90, scaleX: 1, color: '#4a3500', easing: 'easeOut' }),
        kf(0.82, { opacity: 0.5, y: CY - 90 }),
        kf(0.9, { opacity: 0, scaleX: 0.01, easing: 'easeIn' }),
      ], { width: 800, height: 2, fill: '#997700', emissive: '#997700', emissiveIntensity: 1, label: 'Gold Top Rule' }),
      // NINJA — gold 3D, word 1
      {
        text: 'NINJA',
        mode: '3d',
        keyframes: [
          kf(0.04, { opacity: 0, fontSize: 90, y: CY - 55, color: '#ffd700', scaleX: 0.8 }),
          kf(0.12, { opacity: 1, fontSize: 90, y: CY - 55, color: '#ffd700', scaleX: 1, easing: 'easeOut' }),
          kf(0.82, { opacity: 1, y: CY - 55 }),
          kf(0.9, { opacity: 0, easing: 'easeIn' }),
        ],
      },
      // PUNK — word 2, slight delay
      {
        text: 'PUNK',
        mode: '3d',
        keyframes: [
          kf(0.1, { opacity: 0, fontSize: 90, y: CY + 10, color: '#ffd700', scaleX: 0.8 }),
          kf(0.2, { opacity: 1, fontSize: 90, y: CY + 10, color: '#ffd700', scaleX: 1, easing: 'easeOut' }),
          kf(0.82, { opacity: 1 }),
          kf(0.9, { opacity: 0, easing: 'easeIn' }),
        ],
      },
      // GIRLS — word 3
      {
        text: 'GIRLS',
        mode: '3d',
        keyframes: [
          kf(0.18, { opacity: 0, fontSize: 90, y: CY + 75, color: '#ffd700', scaleX: 0.8 }),
          kf(0.28, { opacity: 1, fontSize: 90, y: CY + 75, color: '#ffd700', scaleX: 1, easing: 'easeOut' }),
          kf(0.82, { opacity: 1 }),
          kf(0.9, { opacity: 0, easing: 'easeIn' }),
        ],
      },
      // X — chrome, arrives last, slam with earned weight
      {
        text: 'X',
        mode: '3d',
        material: 'chrome',
        keyframes: [
          kf(0.4, { opacity: 0, fontSize: 180, x: CX + 220, y: CY + 10, scaleX: 3, color: '#ffffff' }),
          kf(0.48, { opacity: 1, fontSize: 180, x: CX + 220, y: CY + 10, scaleX: 1, color: '#ffffff', easing: 'slam' }),
          ...shake(0.49, 0.55, 4, 6, { fontSize: 180, x: CX + 220, y: CY + 10, color: '#ffffff' }),
          kf(0.55, { fontSize: 180, x: CX + 220, y: CY + 10, color: '#ffffff' }),
          kf(0.82, { opacity: 1 }),
          kf(0.9, { opacity: 0, easing: 'easeIn' }),
        ],
      },
      // Bottom rule — gold shape
      shapeLayer('line', [
        kf(0.25, { opacity: 0, y: CY + 115, scaleX: 0.01, color: '#4a3500' }),
        kf(0.32, { opacity: 0.5, y: CY + 115, scaleX: 1, color: '#4a3500', easing: 'easeOut' }),
        kf(0.82, { opacity: 0.5, y: CY + 115 }),
        kf(0.9, { opacity: 0, scaleX: 0.01, easing: 'easeIn' }),
      ], { width: 800, height: 2, fill: '#997700', emissive: '#997700', emissiveIntensity: 1, label: 'Gold Bottom Rule' }),
      // Credit line
      {
        text: 'A N  N P G X  P R O D U C T I O N',
        mode: '2d',
        font: 'teko',
        keyframes: [
          kf(0.35, { opacity: 0, fontSize: 9, color: '#8a6e00', y: CY + 130 }),
          kf(0.42, { opacity: 0.4, fontSize: 9, color: '#8a6e00', y: CY + 130, easing: 'drift' }),
          kf(0.82, { opacity: 0.4 }),
          kf(0.9, { opacity: 0, easing: 'easeIn' }),
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. STROBE RIOT — raw energy, no pretension
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'strobe-riot',
    name: 'STROBE RIOT',
    category: 'punk',
    description: 'Pure punk. Strobe. Slam. No subtlety needed.',
    duration: 3.5,
    loop: true,
    material: 'crimson',
    lighting: 'void',
    camera: 'static',
    particles: 'embers',
    scene: 'transparent',
    depth: 0.25,
    bevelEnabled: true,
    bevelSize: 0.02,
    lines: [
      // NINJA — slams from top
      {
        text: 'NINJA',
        mode: '2d',
        font: 'hardcore',
        keyframes: [
          ...slamIn(0, 'top', { fontSize: 120, color: '#ff0040', y: CY - 60 }),
          ...shake(0.06, 0.14, 6, 25, { fontSize: 120, color: '#ff0040', y: CY - 60 }),
          kf(0.14, { fontSize: 120, color: '#ff0040', y: CY - 60 }),
          kf(0.7, { fontSize: 120, color: '#ff0040', y: CY - 60 }),
          ...cutOut(0.73, { fontSize: 120, color: '#ff0040', y: CY - 60 }),
        ],
      },
      // PUNK GIRLS — slams from right
      {
        text: 'PUNK GIRLS',
        mode: '2d',
        font: 'cyberpunk',
        keyframes: [
          kf(0.05, { opacity: 0, fontSize: 90, y: CY + 40, color: '#ffffff' }),
          ...slamIn(0.07, 'right', { fontSize: 90, y: CY + 40, color: '#ffffff' }),
          ...shake(0.12, 0.18, 5, 18, { fontSize: 90, y: CY + 40, color: '#ffffff' }),
          kf(0.18, { fontSize: 90, y: CY + 40, color: '#ffffff' }),
          kf(0.7, { fontSize: 90, y: CY + 40, color: '#ffffff' }),
          ...cutOut(0.75, { fontSize: 90, y: CY + 40, color: '#ffffff' }),
        ],
      },
      // X — strobe entrance then hold
      {
        text: 'X',
        mode: '3d',
        material: 'neon',
        keyframes: [
          kf(0.15, { opacity: 0, fontSize: 180, x: CX + 280, y: CY - 10, color: '#ff0040' }),
          ...strobe(0.17, 0.25, 4, { fontSize: 180, x: CX + 280, y: CY - 10, rotation: -8, color: '#ff0040' }),
          kf(0.25, { opacity: 1, fontSize: 180, x: CX + 280, y: CY - 10, rotation: -8, color: '#ff0040' }),
          kf(0.7, { opacity: 1, fontSize: 180, x: CX + 280, y: CY - 10, rotation: -8, color: '#ff0040' }),
          kf(0.76, { opacity: 0, easing: 'hardSnap' }),
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. ANIME IMPACT — dramatic zoom-slam
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'anime-impact',
    name: 'ANIME IMPACT',
    category: 'anime',
    description: 'Speed lines energy. One-two-three impact.',
    duration: 5,
    loop: true,
    material: 'matte',
    lighting: 'stage',
    camera: 'static',
    particles: 'none',
    scene: 'transparent',
    depth: 0.15,
    bevelEnabled: true,
    bevelSize: 0.02,
    lines: [
      // Thin pre-line
      {
        text: 'P R E S E N T S',
        mode: '2d',
        font: 'teko',
        keyframes: [
          kf(0, { opacity: 0, fontSize: 12, color: '#555555', y: CY - 65 }),
          kf(0.03, { opacity: 0.5, fontSize: 12, color: '#555555', y: CY - 65, easing: 'drift' }),
          kf(0.06, { opacity: 0, easing: 'hardSnap' }),
        ],
      },
      // NINJA — zoom slam
      {
        text: 'NINJA',
        mode: '2d',
        font: 'anton',
        keyframes: [
          kf(0.03, { opacity: 0, fontSize: 300, scaleX: 5, color: '#ffffff' }),
          kf(0.07, { opacity: 1, fontSize: 300, scaleX: 1, color: '#ffffff', easing: 'whip' }),
          kf(0.09, { fontSize: 85, y: CY - 55, easing: 'hardSnap' }),
          kf(0.72, { fontSize: 85, y: CY - 55 }),
          kf(0.75, { opacity: 0, easing: 'hardSnap' }),
        ],
      },
      // PUNK GIRLS — zoom slam, beat after
      {
        text: 'PUNK GIRLS',
        mode: '2d',
        font: 'bebas',
        keyframes: [
          kf(0.09, { opacity: 0, fontSize: 300, scaleX: 5, color: '#ff0040' }),
          kf(0.13, { opacity: 1, fontSize: 300, scaleX: 1, color: '#ff0040', easing: 'whip' }),
          kf(0.15, { fontSize: 75, y: CY + 25, color: '#ff0040', easing: 'hardSnap' }),
          kf(0.72, { fontSize: 75, y: CY + 25, color: '#ff0040' }),
          kf(0.77, { opacity: 0, easing: 'hardSnap' }),
        ],
      },
      // X — last, biggest impact
      {
        text: 'X',
        mode: '3d',
        material: 'crimson',
        keyframes: [
          kf(0.18, { opacity: 0, fontSize: 600, scaleX: 8, color: '#ff0040' }),
          kf(0.22, { opacity: 1, fontSize: 140, scaleX: 1, x: CX + 250, y: CY - 10, color: '#ff0040', easing: 'whip' }),
          ...shake(0.23, 0.28, 5, 10, { fontSize: 140, x: CX + 250, y: CY - 10, color: '#ff0040' }),
          kf(0.28, { fontSize: 140, x: CX + 250, y: CY - 10, color: '#ff0040' }),
          kf(0.72, { fontSize: 140, x: CX + 250, y: CY - 10, color: '#ff0040' }),
          kf(0.78, { opacity: 0, scaleX: 4, easing: 'whip' }),
        ],
      },
      // Bottom tagline
      {
        text: 'TWENTY SIX',
        mode: '2d',
        font: 'teko',
        keyframes: [
          kf(0.3, { opacity: 0, fontSize: 11, color: '#666666', y: CY + 75 }),
          kf(0.35, { opacity: 0.4, fontSize: 11, color: '#666666', y: CY + 75, easing: 'drift' }),
          kf(0.72, { opacity: 0.4 }),
          kf(0.75, { opacity: 0, easing: 'hardSnap' }),
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. MINIMAL BLADE — almost nothing. Sharp.
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'minimal-blade',
    name: 'MINIMAL BLADE',
    category: 'minimal',
    description: 'Almost nothing. What remains cuts deep.',
    duration: 6,
    loop: true,
    material: 'matte',
    lighting: 'studio',
    camera: 'static',
    particles: 'none',
    scene: 'transparent',
    depth: 0.04,
    bevelEnabled: false,
    bevelSize: 0,
    lines: [
      // Just the title — thin, centered, snaps in/out
      {
        text: 'NINJA PUNK GIRLS',
        mode: '2d',
        font: 'teko',
        keyframes: [
          kf(0.15, { opacity: 0, fontSize: 28, color: '#ffffff' }),
          kf(0.18, { opacity: 0.9, fontSize: 28, color: '#ffffff', easing: 'hardSnap' }),
          kf(0.75, { opacity: 0.9, color: '#ffffff' }),
          kf(0.78, { opacity: 0, easing: 'hardSnap' }),
        ],
      },
      // X — same line, different weight
      {
        text: 'X',
        mode: '2d',
        font: 'bebas',
        keyframes: [
          kf(0.2, { opacity: 0, fontSize: 28, color: '#cc0000', x: CX + 160, y: CY + 1 }),
          kf(0.22, { opacity: 0.9, fontSize: 28, color: '#cc0000', x: CX + 160, y: CY + 1, easing: 'hardSnap' }),
          kf(0.75, { opacity: 0.9 }),
          kf(0.78, { opacity: 0, easing: 'hardSnap' }),
        ],
      },
      // Thin rule below
      {
        text: '─',
        mode: '2d',
        font: 'courier',
        keyframes: [
          kf(0.22, { opacity: 0, fontSize: 4, color: '#333333', y: CY + 18, scaleX: 0.1 }),
          kf(0.28, { opacity: 0.3, fontSize: 4, color: '#333333', y: CY + 18, scaleX: 20, easing: 'easeOut' }),
          kf(0.72, { opacity: 0.3, scaleX: 20 }),
          kf(0.78, { opacity: 0, scaleX: 0.1, easing: 'easeIn' }),
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. ICE FRACTURE — crystalline precision
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ice-fracture',
    name: 'ICE FRACTURE',
    category: 'epic',
    description: 'Crystalline precision. Frozen then shattered.',
    duration: 6,
    loop: true,
    material: 'ice',
    lighting: 'stage',
    camera: 'crane',
    particles: 'sparks',
    scene: 'transparent',
    depth: 0.25,
    bevelEnabled: true,
    bevelSize: 0.03,
    lines: [
      // NINJA — forms from thin line
      {
        text: 'NINJA',
        mode: '3d',
        keyframes: [
          kf(0, { y: CY - 55, opacity: 0, fontSize: 90, scaleY: 0.02, color: '#a0d8ef' }),
          kf(0.02, { opacity: 1, scaleY: 0.02, color: '#a0d8ef', easing: 'hardSnap' }),
          kf(0.1, { y: CY - 55, scaleY: 1.1, color: '#a0d8ef', easing: 'whip' }),
          kf(0.13, { scaleY: 1, easing: 'crash' }),
          kf(0.68, { y: CY - 55, opacity: 1 }),
          kf(0.72, { y: CY - 200, opacity: 0, rotation: -15, scaleX: 0.4, easing: 'whip' }),
        ],
      },
      // PUNK GIRLS — forms after
      {
        text: 'PUNK GIRLS',
        mode: '3d',
        keyframes: [
          kf(0.06, { y: CY + 35, opacity: 0, fontSize: 90, scaleY: 0.02, color: '#a0d8ef' }),
          kf(0.08, { opacity: 1, scaleY: 0.02, easing: 'hardSnap' }),
          kf(0.16, { y: CY + 35, scaleY: 1.1, easing: 'whip' }),
          kf(0.19, { scaleY: 1, easing: 'crash' }),
          kf(0.68, { y: CY + 35, opacity: 1 }),
          kf(0.74, { y: CY + 250, opacity: 0, rotation: 12, scaleX: 0.4, easing: 'whip' }),
        ],
      },
      // X — last piece, then shatters biggest
      {
        text: 'X',
        mode: '3d',
        keyframes: [
          kf(0.2, { opacity: 0, fontSize: 150, scaleY: 0.02, color: '#ffffff' }),
          kf(0.22, { opacity: 1, scaleY: 0.02, easing: 'hardSnap' }),
          kf(0.28, { scaleY: 1.15, easing: 'whip' }),
          kf(0.32, { scaleY: 1, easing: 'crash' }),
          kf(0.68, { opacity: 1 }),
          kf(0.73, { opacity: 0, scaleX: 4, scaleY: 4, easing: 'whip' }),
        ],
      },
      // Frost glow — soft circle behind text
      shapeLayer('circle', [
        kf(0.1, { opacity: 0, y: CY, color: '#2244667' }),
        kf(0.2, { opacity: 0.06, y: CY, color: '#224466', easing: 'drift' }),
        kf(0.65, { opacity: 0.06, y: CY }),
        kf(0.72, { opacity: 0, easing: 'easeIn' }),
      ], { width: 500, height: 500, fill: '#224466', emissive: '#336688', emissiveIntensity: 2, label: 'Frost Glow' }),
    ],
  },
]

// ── Lookup ───────────────────────────────────────────────────────────────────

export function getPreset(id: string): MotionPreset | undefined {
  return MOTION_PRESETS.find(p => p.id === id)
}

export function getPresetsByCategory(category: string): MotionPreset[] {
  return MOTION_PRESETS.filter(p => p.category === category)
}
