'use client'

import { useRef, useMemo, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text3D, Text, Center, Environment, OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration, Vignette, Noise, Scanline } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'

// ── Types ───────────────────────────────────────────────────────────────────

export type MaterialPreset = 'chrome' | 'gold' | 'neon' | 'matte' | 'crimson' | 'hologram' | 'ice'
export type LightingPreset = 'studio' | 'neon-alley' | 'sunset' | 'void' | 'stage'
export type CameraMode = 'free' | 'static' | 'orbit' | 'dolly' | 'crane'
export type ParticleType = 'none' | 'dust' | 'sparks' | 'embers'
export type AnimationType = 'none' | 'float' | 'breathe' | 'glitch' | 'pulse'
export type SceneType = 'transparent' | 'void' | 'grid' | 'fog'

export type LayerMode = '2d' | '3d'

export type FontKey =
  | 'helvetiker'
  // Local files
  | 'orbitron' | 'marker' | 'cyberpunk' | 'cyberpunk-italic' | 'hardcore'
  // Google Fonts (loaded via next/font, referenced by CSS var)
  | 'bebas' | 'anton' | 'blackops' | 'russo' | 'teko' | 'staatliches'
  | 'bungee' | 'bungee-shade' | 'monoton' | 'pixel' | 'creepster'
  | 'typewriter' | 'rubik-mono' | 'sedan'
  // System fallbacks
  | 'impact' | 'courier' | 'georgia'

export const FONT_REGISTRY: Record<FontKey, { label: string; path: string; css?: string; supports3d: boolean; category: string }> = {
  // ── 3D capable ──
  helvetiker:         { label: 'Helvetiker',       path: '/fonts/helvetiker-bold.typeface.json',  supports3d: true,  category: 'display' },

  // ── Local TTF/OTF ──
  orbitron:           { label: 'Orbitron',          path: '/fonts/Orbitron-Black.ttf',             supports3d: false, category: 'sci-fi' },
  marker:             { label: 'Marker',            path: '/fonts/PermanentMarker-Regular.ttf',    supports3d: false, category: 'graffiti' },
  cyberpunk:          { label: 'Cyberpunk',         path: '/fonts/Cyberpunks.ttf',                 supports3d: false, category: 'punk' },
  'cyberpunk-italic': { label: 'Cyberpunk Italic',  path: '/fonts/CyberpunksItalic.ttf',           supports3d: false, category: 'punk' },
  hardcore:           { label: 'Hardcore',          path: '/fonts/HARDCORE POSTER.otf',            supports3d: false, category: 'punk' },

  // ── Google Fonts (via CSS variable, TTF path not needed for drei Text) ──
  bebas:              { label: 'Bebas Neue',        path: '', css: 'var(--font-bebas)',            supports3d: false, category: 'film' },
  anton:              { label: 'Anton',             path: '', css: 'var(--font-anton)',            supports3d: false, category: 'film' },
  blackops:           { label: 'Black Ops One',     path: '', css: 'var(--font-blackops)',         supports3d: false, category: 'action' },
  russo:              { label: 'Russo One',         path: '', css: 'var(--font-russo)',            supports3d: false, category: 'action' },
  teko:               { label: 'Teko',              path: '', css: 'var(--font-teko)',             supports3d: false, category: 'film' },
  staatliches:        { label: 'Staatliches',       path: '', css: 'var(--font-staatliches)',      supports3d: false, category: 'film' },
  bungee:             { label: 'Bungee',            path: '', css: 'var(--font-bungee)',           supports3d: false, category: 'display' },
  'bungee-shade':     { label: 'Bungee Shade',     path: '', css: 'var(--font-bungee-shade)',     supports3d: false, category: 'display' },
  monoton:            { label: 'Monoton',           path: '', css: 'var(--font-monoton)',          supports3d: false, category: 'retro' },
  pixel:              { label: 'Press Start 2P',    path: '', css: 'var(--font-pixel)',            supports3d: false, category: 'retro' },
  creepster:          { label: 'Creepster',         path: '', css: 'var(--font-creepster)',        supports3d: false, category: 'horror' },
  typewriter:         { label: 'Special Elite',     path: '', css: 'var(--font-typewriter)',       supports3d: false, category: 'vintage' },
  'rubik-mono':       { label: 'Rubik Mono One',   path: '', css: 'var(--font-rubik-mono)',       supports3d: false, category: 'display' },
  sedan:              { label: 'Sedan SC',          path: '', css: 'var(--font-sedan)',            supports3d: false, category: 'vintage' },

  // ── System fallbacks ──
  impact:             { label: 'Impact',            path: '', css: 'Impact, "Arial Black"',        supports3d: false, category: 'display' },
  courier:            { label: 'Courier',           path: '', css: '"Courier New", monospace',     supports3d: false, category: 'mono' },
  georgia:            { label: 'Georgia',           path: '', css: 'Georgia, serif',               supports3d: false, category: 'serif' },
}

export type ShapeType = 'rect' | 'circle' | 'line' | 'beam' | 'ring'

export interface Title3DLine {
  text: string
  color: string
  fontSize: number
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
  skewX: number
  opacity: number
  mode?: LayerMode    // '3d' default
  font?: FontKey      // 'helvetiker' default
  // Shape layer data (when layerType === 'shape')
  isShape?: boolean
  shapeType?: ShapeType
  shapeWidth?: number
  shapeHeight?: number
  shapeFill?: string
  shapeEmissive?: string
  shapeEmissiveIntensity?: number
  shapeBlur?: number
}

export interface Title3DSettings {
  material: MaterialPreset
  depth: number
  bevelEnabled: boolean
  bevelSize: number
  lighting: LightingPreset
  camera: CameraMode
  bloomIntensity: number
  particles: ParticleType
  animation: AnimationType
  scene: SceneType
}

interface Title3DSceneProps {
  lines: Title3DLine[]
  settings: Title3DSettings
  analyserNode?: AnalyserNode | null
}

// ── Material Configs ────────────────────────────────────────────────────────

const MATERIAL_CONFIGS: Record<MaterialPreset, {
  color: string
  metalness: number
  roughness: number
  emissive?: string
  emissiveIntensity?: number
  envMapIntensity?: number
  wireframe?: boolean
  clearcoat?: number
}> = {
  chrome:   { color: '#e8e8e8', metalness: 1,   roughness: 0.05, envMapIntensity: 2.5 },
  gold:     { color: '#ffd700', metalness: 1,   roughness: 0.15, envMapIntensity: 2 },
  neon:     { color: '#ff0040', metalness: 0.1, roughness: 0.4,  emissive: '#ff0040', emissiveIntensity: 3 },
  matte:    { color: '#222222', metalness: 0,   roughness: 0.95 },
  crimson:  { color: '#8b0000', metalness: 0.9, roughness: 0.2,  envMapIntensity: 1.5 },
  hologram: { color: '#00ffff', metalness: 0.3, roughness: 0.1,  emissive: '#00ffff', emissiveIntensity: 0.8, wireframe: true },
  ice:      { color: '#b8e8f0', metalness: 0.15, roughness: 0.08, envMapIntensity: 1.8, clearcoat: 1 },
}

// ── Lighting Configs ────────────────────────────────────────────────────────

const LIGHTING_CONFIGS: Record<LightingPreset, {
  ambient: string; ambientIntensity: number
  key: { color: string; intensity: number; pos: [number, number, number] }
  fill: { color: string; intensity: number; pos: [number, number, number] }
  rim: { color: string; intensity: number; pos: [number, number, number] }
  env: 'studio' | 'sunset' | 'city' | 'warehouse' | 'night' | 'dawn'
  bg: string
}> = {
  studio: {
    ambient: '#404040', ambientIntensity: 0.5,
    key:  { color: '#ffffff', intensity: 2.5, pos: [5, 5, 5] },
    fill: { color: '#6666cc', intensity: 0.8, pos: [-5, 2, 3] },
    rim:  { color: '#ffffff', intensity: 2,   pos: [0, 0, -5] },
    env: 'studio', bg: '#0a0a0a',
  },
  'neon-alley': {
    ambient: '#110022', ambientIntensity: 0.2,
    key:  { color: '#ff00ff', intensity: 4,   pos: [3, 2, 4] },
    fill: { color: '#00ffff', intensity: 3,   pos: [-4, 1, 2] },
    rim:  { color: '#ff0080', intensity: 2.5, pos: [0, 3, -3] },
    env: 'night', bg: '#050010',
  },
  sunset: {
    ambient: '#2a1500', ambientIntensity: 0.3,
    key:  { color: '#ff6600', intensity: 4,   pos: [5, 2, 3] },
    fill: { color: '#4400ff', intensity: 1,   pos: [-4, 3, 2] },
    rim:  { color: '#ff3300', intensity: 2,   pos: [0, -1, -5] },
    env: 'sunset', bg: '#0d0500',
  },
  void: {
    ambient: '#000000', ambientIntensity: 0.05,
    key:  { color: '#ffffff', intensity: 0.8, pos: [0, 5, 5] },
    fill: { color: '#111111', intensity: 0.2, pos: [-3, 0, 3] },
    rim:  { color: '#dc143c', intensity: 4,   pos: [0, 0, -4] },
    env: 'warehouse', bg: '#000000',
  },
  stage: {
    ambient: '#333333', ambientIntensity: 0.6,
    key:  { color: '#ffffff', intensity: 8,   pos: [0, 8, 5] },
    fill: { color: '#ff0040', intensity: 2.5, pos: [-6, 0, 4] },
    rim:  { color: '#4080ff', intensity: 3,   pos: [6, 2, -3] },
    env: 'studio', bg: '#000000',
  },
}

// ── Beat pulse hook ─────────────────────────────────────────────────────────

function useBeatPulse(analyserNode: AnalyserNode | null | undefined) {
  const beatRef = useRef(0)
  const freqData = useMemo(() => new Uint8Array(128), [])
  const avgRef = useRef(0)

  useFrame(() => {
    if (!analyserNode) { beatRef.current *= 0.95; return }
    analyserNode.getByteFrequencyData(freqData)
    let bass = 0
    for (let i = 0; i < 6; i++) bass += freqData[i]
    bass /= 6
    avgRef.current = avgRef.current * 0.92 + bass * 0.08
    if (bass > avgRef.current * 1.4 && bass > 80) {
      beatRef.current = Math.min(1, beatRef.current + 0.6)
    }
    beatRef.current *= 0.92
  })

  return beatRef
}

// ── Particles ───────────────────────────────────────────────────────────────

function Particles({ type, count = 300 }: { type: ParticleType; count?: number }) {
  const ref = useRef<THREE.Points>(null)

  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const spd = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 20
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20
      spd[i * 3]     = (Math.random() - 0.5) * 0.01
      spd[i * 3 + 1] = type === 'embers' ? Math.random() * 0.02 + 0.005
                      : type === 'sparks' ? Math.random() * 0.015 + 0.003
                      : (Math.random() - 0.5) * 0.003
      spd[i * 3 + 2] = (Math.random() - 0.5) * 0.01
    }
    return [pos, spd]
  }, [count, type])

  useFrame(() => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < count; i++) {
      arr[i * 3]     += speeds[i * 3]
      arr[i * 3 + 1] += speeds[i * 3 + 1]
      arr[i * 3 + 2] += speeds[i * 3 + 2]
      if (Math.abs(arr[i * 3 + 1]) > 7) {
        arr[i * 3]     = (Math.random() - 0.5) * 20
        arr[i * 3 + 1] = -7
        arr[i * 3 + 2] = (Math.random() - 0.5) * 20
      }
    }
    pos.needsUpdate = true
  })

  if (type === 'none') return null

  const color = type === 'sparks' ? '#ff8800' : type === 'embers' ? '#ff2200' : '#888888'
  const size = type === 'sparks' ? 0.05 : type === 'embers' ? 0.06 : 0.025

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial color={color} size={size} transparent opacity={0.5} sizeAttenuation depthWrite={false} />
    </points>
  )
}

// ── Camera rig ──────────────────────────────────────────────────────────────

function CameraRig({ mode, beatPulse }: { mode: CameraMode; beatPulse: number }) {
  const { camera } = useThree()
  const tRef = useRef(0)

  useFrame((_, delta) => {
    // 'free' mode — OrbitControls handles the camera, we do nothing
    if (mode === 'free') return

    tRef.current += delta
    const t = tRef.current

    switch (mode) {
      case 'orbit': {
        const r = 7
        camera.position.x = Math.sin(t * 0.12) * r
        camera.position.z = Math.cos(t * 0.12) * r
        camera.position.y = 0.8 + Math.sin(t * 0.08) * 0.6
        camera.lookAt(0, 0, 0)
        break
      }
      case 'dolly': {
        const z = 7 + Math.sin(t * 0.15) * 2.5
        camera.position.set(Math.sin(t * 0.05) * 0.3, 0.2, z)
        camera.lookAt(0, 0, 0)
        break
      }
      case 'crane': {
        const y = Math.sin(t * 0.1) * 3
        camera.position.set(Math.sin(t * 0.06) * 2, y, 7)
        camera.lookAt(0, 0, 0)
        break
      }
      default: { // static
        camera.position.set(0, 0.3, 7)
        camera.lookAt(0, 0, 0)
        if (beatPulse > 0.3) {
          camera.position.x += (Math.random() - 0.5) * beatPulse * 0.04
          camera.position.y += 0.3 + (Math.random() - 0.5) * beatPulse * 0.03
        }
        break
      }
    }
  })

  return null
}

// ── Grid floor ──────────────────────────────────────────────────────────────

function GridFloor({ color }: { color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]} receiveShadow>
      <planeGeometry args={[40, 40, 40, 40]} />
      <meshStandardMaterial color={color} wireframe transparent opacity={0.15} />
    </mesh>
  )
}

// ── Single 3D text block ────────────────────────────────────────────────────

const CANVAS_W = 1280
const CANVAS_H = 720
const FONT_URL = '/fonts/helvetiker-bold.typeface.json'

function TextBlock({
  line, settings, beatPulse, index,
}: {
  line: Title3DLine
  settings: Title3DSettings
  beatPulse: number
  index: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const tRef = useRef(Math.random() * 100)
  const glitchRef = useRef({ x: 0, y: 0 })

  const matCfg = MATERIAL_CONFIGS[settings.material]

  // Use line color for neon, otherwise material color
  const baseColor = settings.material === 'neon' ? (line.color || matCfg.color) : matCfg.color
  const emissiveColor = settings.material === 'neon'
    ? (line.color || matCfg.emissive || '#ff0040')
    : (matCfg.emissive || '#000000')

  // Convert 2D canvas coords → 3D world coords
  const x3d = (line.x - CANVAS_W / 2) / 130
  const y3d = -(line.y - CANVAS_H / 2) / 130
  const size3d = Math.max(0.3, line.fontSize / 110)

  // Layer transforms
  const layerRotZ = -(line.rotation || 0) * Math.PI / 180
  const layerSx = line.scaleX ?? 1
  const layerSy = line.scaleY ?? 1
  const layerSkewX = (line.skewX || 0) * Math.PI / 180

  useFrame((_, delta) => {
    if (!groupRef.current) return
    tRef.current += delta
    const t = tRef.current
    const g = groupRef.current

    // Base rotation from layer transform
    let animRotZ = layerRotZ
    let animSx = layerSx
    let animSy = layerSy
    let posYOffset = 0
    let posXOffset = 0

    switch (settings.animation) {
      case 'float':
        posYOffset = Math.sin(t * 0.7 + index * 1.5) * 0.15
        animRotZ += Math.sin(t * 0.4 + index) * 0.025
        break
      case 'breathe': {
        const s = 1 + Math.sin(t * 0.5) * 0.04 + beatPulse * 0.06
        animSx *= s
        animSy *= s
        break
      }
      case 'glitch':
        if (Math.random() < 0.04 + beatPulse * 0.12) {
          glitchRef.current.x = (Math.random() - 0.5) * 0.2
          glitchRef.current.y = (Math.random() - 0.5) * 0.1
        } else {
          glitchRef.current.x *= 0.82
          glitchRef.current.y *= 0.82
        }
        posXOffset = glitchRef.current.x
        posYOffset = glitchRef.current.y
        break
      case 'pulse': {
        const s = 1 + beatPulse * 0.15
        animSx *= s
        animSy *= s
        break
      }
      default: {
        const s = 1 + beatPulse * 0.05
        animSx *= s
        animSy *= s
        break
      }
    }

    g.position.x = x3d + posXOffset
    g.position.y = y3d + posYOffset
    g.rotation.z = animRotZ
    g.scale.set(animSx, animSy, 1)

    // Apply skew via matrix shear
    if (layerSkewX !== 0) {
      g.matrix.identity()
      g.matrix.makeRotationZ(animRotZ)
      g.matrix.multiply(new THREE.Matrix4().set(
        animSx, Math.tan(layerSkewX) * animSy, 0, 0,
        0, animSy, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
      ))
      g.matrix.setPosition(x3d + posXOffset, y3d + posYOffset, 0)
      g.matrixAutoUpdate = false
      g.matrixWorldNeedsUpdate = true
    } else {
      g.matrixAutoUpdate = true
    }
  })

  const is2D = line.mode === '2d'
  const fontKey = line.font || (is2D ? 'orbitron' : 'helvetiker')
  const fontInfo = FONT_REGISTRY[fontKey] || FONT_REGISTRY.helvetiker
  // For 2D: if font doesn't support 3d, use its TTF path. For 3D: use typeface.json
  const fontPath = is2D ? fontInfo.path : (fontInfo.supports3d ? fontInfo.path : FONT_URL)

  const materialNode = matCfg.wireframe ? (
    <meshStandardMaterial
      color={matCfg.color}
      emissive={matCfg.emissive}
      emissiveIntensity={((matCfg.emissiveIntensity || 0) + beatPulse * 0.8) * settings.depth * 5}
      wireframe
      metalness={matCfg.metalness}
      roughness={matCfg.roughness}
      transparent={line.opacity < 1 || true}
      opacity={line.opacity * 0.85}
      toneMapped={false}
    />
  ) : matCfg.emissiveIntensity && matCfg.emissiveIntensity > 1 ? (
    <meshStandardMaterial
      color={baseColor}
      emissive={emissiveColor}
      emissiveIntensity={(matCfg.emissiveIntensity || 0) * (1 + settings.depth) + beatPulse * 3}
      metalness={matCfg.metalness}
      roughness={matCfg.roughness}
      transparent={line.opacity < 1}
      opacity={line.opacity}
      toneMapped={false}
    />
  ) : (
    <meshPhysicalMaterial
      color={baseColor}
      metalness={matCfg.metalness}
      roughness={matCfg.roughness}
      envMapIntensity={matCfg.envMapIntensity || 1}
      clearcoat={matCfg.clearcoat || 0}
      clearcoatRoughness={0.1}
      emissive={emissiveColor}
      emissiveIntensity={beatPulse * 0.5}
      transparent={line.opacity < 1}
      opacity={line.opacity}
      toneMapped={false}
    />
  )

  return (
    <group ref={groupRef} position={[x3d, y3d, 0]}>
      {is2D ? (
        /* ── 2D flat text (SDF) — supports all TTF/OTF fonts ── */
        <Text
          font={fontPath}
          fontSize={size3d}
          color={baseColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor={emissiveColor}
          outlineOpacity={0.6 + beatPulse * 0.4}
          fillOpacity={line.opacity}
          castShadow
        >
          {line.text}
          {materialNode}
        </Text>
      ) : (
        /* ── 3D extruded text — typeface.json fonts ── */
        <Center>
          <Text3D
            font={fontPath}
            size={size3d}
            height={settings.depth}
            bevelEnabled={settings.bevelEnabled}
            bevelSize={settings.bevelSize}
            bevelThickness={settings.bevelSize * 0.6}
            bevelSegments={4}
            curveSegments={12}
            letterSpacing={0.03}
            castShadow
          >
            {line.text}
            {materialNode}
          </Text3D>
        </Center>
      )}
    </group>
  )
}

// ── Shape block — flat geometry in 3D space ─────────────────────────────────

function ShapeBlock({
  line, settings, beatPulse, index,
}: {
  line: Title3DLine
  settings: Title3DSettings
  beatPulse: number
  index: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const tRef = useRef(Math.random() * 100)

  const x3d = (line.x - CANVAS_W / 2) / 130
  const y3d = -(line.y - CANVAS_H / 2) / 130
  const w = (line.shapeWidth || 400) / 130
  const h = (line.shapeHeight || 4) / 130
  const fill = line.shapeFill || line.color || '#ffffff'
  const emissive = line.shapeEmissive || fill
  const emissiveInt = (line.shapeEmissiveIntensity || 0) + beatPulse * 0.5

  useFrame((_, delta) => {
    if (!groupRef.current) return
    tRef.current += delta
    const g = groupRef.current
    g.position.set(x3d, y3d, -0.1 * index) // slight z-offset per layer
    g.rotation.z = -(line.rotation || 0) * Math.PI / 180
    g.scale.set(line.scaleX || 1, line.scaleY || 1, 1)
  })

  const shapeType = line.shapeType || 'rect'

  return (
    <group ref={groupRef} position={[x3d, y3d, -0.1 * index]}>
      {shapeType === 'rect' && (
        <mesh>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial
            color={fill}
            emissive={emissive}
            emissiveIntensity={emissiveInt}
            transparent
            opacity={line.opacity}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}
      {shapeType === 'line' && (
        <mesh>
          <planeGeometry args={[w, Math.max(0.01, h * 0.1)]} />
          <meshStandardMaterial
            color={fill}
            emissive={emissive}
            emissiveIntensity={emissiveInt}
            transparent
            opacity={line.opacity}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}
      {shapeType === 'beam' && (
        <mesh>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial
            color={fill}
            emissive={emissive}
            emissiveIntensity={emissiveInt * 2}
            transparent
            opacity={line.opacity * 0.6}
            side={THREE.DoubleSide}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      )}
      {shapeType === 'circle' && (
        <mesh>
          <circleGeometry args={[w / 2, 48]} />
          <meshStandardMaterial
            color={fill}
            emissive={emissive}
            emissiveIntensity={emissiveInt}
            transparent
            opacity={line.opacity}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}
      {shapeType === 'ring' && (
        <mesh>
          <ringGeometry args={[w / 2 - 0.05, w / 2, 48]} />
          <meshStandardMaterial
            color={fill}
            emissive={emissive}
            emissiveIntensity={emissiveInt}
            transparent
            opacity={line.opacity}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  )
}

// ── Scene lighting ──────────────────────────────────────────────────────────

function SceneLighting({ preset }: { preset: LightingPreset }) {
  const cfg = LIGHTING_CONFIGS[preset]
  return (
    <>
      <ambientLight color={cfg.ambient} intensity={cfg.ambientIntensity} />
      <directionalLight
        color={cfg.key.color}
        intensity={cfg.key.intensity}
        position={cfg.key.pos}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight color={cfg.fill.color} intensity={cfg.fill.intensity} position={cfg.fill.pos} />
      <pointLight color={cfg.rim.color} intensity={cfg.rim.intensity} position={cfg.rim.pos} />
    </>
  )
}

// ── Inner scene ─────────────────────────────────────────────────────────────

function InnerScene({ lines, settings, analyserNode }: Title3DSceneProps) {
  const beatRef = useBeatPulse(analyserNode)
  const lightCfg = LIGHTING_CONFIGS[settings.lighting]
  const needsEnv = ['chrome', 'gold', 'crimson', 'ice'].includes(settings.material)

  const isTransparent = settings.scene === 'transparent'

  return (
    <>
      {!isTransparent && <color attach="background" args={[lightCfg.bg]} />}

      {settings.scene === 'fog' && <fog attach="fog" args={[lightCfg.bg, 5, 20]} />}

      <SceneLighting preset={settings.lighting} />

      {needsEnv && (
        <Environment preset={lightCfg.env} background={false} />
      )}

      {/* OrbitControls for free mouse rotation — only in 'free' mode */}
      {settings.camera === 'free' && (
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          enablePan
          enableZoom
          minDistance={2}
          maxDistance={20}
          autoRotate={false}
        />
      )}

      <CameraRig mode={settings.camera} beatPulse={beatRef.current} />

      {lines.map((line, i) => (
        line.isShape ? (
          <ShapeBlock
            key={`shape-${i}`}
            line={line}
            settings={settings}
            beatPulse={beatRef.current}
            index={i}
          />
        ) : line.text.trim() ? (
          <TextBlock
            key={`text-${i}`}
            line={line}
            settings={settings}
            beatPulse={beatRef.current}
            index={i}
          />
        ) : null
      ))}

      <Particles type={settings.particles} />

      {settings.scene === 'grid' && <GridFloor color={lightCfg.fill.color} />}

      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom
          intensity={settings.bloomIntensity * 0.3}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.4}
          mipmapBlur
        />
        <ChromaticAberration
          offset={new THREE.Vector2(0.0008, 0.0008)}
          blendFunction={BlendFunction.NORMAL}
        />
        <Vignette darkness={0.5} offset={0.3} />
        <Noise opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
      </EffectComposer>
    </>
  )
}

// ── Loading fallback ────────────────────────────────────────────────────────

function LoadingFallback() {
  const meshRef = useRef<THREE.Mesh>(null)
  useFrame((_, d) => {
    if (meshRef.current) meshRef.current.rotation.z += d * 2
  })
  return (
    <>
      <color attach="background" args={['#000000']} />
      <mesh ref={meshRef}>
        <ringGeometry args={[0.3, 0.4, 32]} />
        <meshBasicMaterial color="#dc143c" />
      </mesh>
    </>
  )
}

// ── Exported component ──────────────────────────────────────────────────────

export default function Title3DScene({ lines, settings, analyserNode }: Title3DSceneProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  const isTransparent = settings.scene === 'transparent'

  return (
    <div className="relative w-full h-full">
      <Canvas
        gl={{ alpha: isTransparent, antialias: true, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
        camera={{ position: [2, 1.5, 6], fov: 42 }}
        dpr={[1, 2]}
        shadows
        style={{ position: 'absolute', inset: 0, background: isTransparent ? 'transparent' : undefined }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <InnerScene lines={lines} settings={settings} analyserNode={analyserNode} />
        </Suspense>
      </Canvas>
    </div>
  )
}
