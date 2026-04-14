'use client'

import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

// ── Types ──
export interface TextLine3D {
  text: string
  font?: 'brand' | 'graffiti'
  fontSize?: number
  color?: string
  glowColor?: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  independentAnimation?: boolean
}

interface PunkTitle3DProps {
  analyserNode?: AnalyserNode | null
  preset?: 'default' | 'crimson' | 'glitch' | 'noir' | 'dream'
  lines?: TextLine3D[]
  className?: string
  style?: React.CSSProperties
}

// ── Preset configs ──
const PRESETS = {
  default: {
    mainColor: '#ffffff',
    glowColor: '#DC143C',
    xColor: '#DC143C',
    xGlow: '#ff0040',
    glowOpacity: 0.15,
    glowBeatBoost: 0.3,
    wobbleSpeed: 0.3,
    wobbleAmount: 0.015,
    glitchChance: 0,
    pulseScale: 0.06,
  },
  crimson: {
    mainColor: '#ffffff',
    glowColor: '#DC143C',
    xColor: '#ff1744',
    xGlow: '#ff0040',
    glowOpacity: 0.2,
    glowBeatBoost: 0.4,
    wobbleSpeed: 0.35,
    wobbleAmount: 0.02,
    glitchChance: 0.015,
    pulseScale: 0.08,
  },
  glitch: {
    mainColor: '#ffffff',
    glowColor: '#ff0040',
    xColor: '#ff0040',
    xGlow: '#ff0000',
    glowOpacity: 0.25,
    glowBeatBoost: 0.5,
    wobbleSpeed: 0.6,
    wobbleAmount: 0.04,
    glitchChance: 0.06,
    pulseScale: 0.12,
  },
  noir: {
    mainColor: '#cccccc',
    glowColor: '#888888',
    xColor: '#aaaaaa',
    xGlow: '#666666',
    glowOpacity: 0.08,
    glowBeatBoost: 0.15,
    wobbleSpeed: 0.12,
    wobbleAmount: 0.008,
    glitchChance: 0,
    pulseScale: 0.03,
  },
  dream: {
    mainColor: '#ffe0f0',
    glowColor: '#ff69b4',
    xColor: '#ff1493',
    xGlow: '#ff69b4',
    glowOpacity: 0.2,
    glowBeatBoost: 0.25,
    wobbleSpeed: 0.18,
    wobbleAmount: 0.01,
    glitchChance: 0,
    pulseScale: 0.05,
  },
}

// Default NPGX branding — clean horizontal title bar at top of frame
const DEFAULT_LINES: TextLine3D[] = [
  { text: 'NINJA PUNK GIRLS', font: 'brand', fontSize: 0.36, position: [0, 1.55, 0] },
  { text: 'X', font: 'graffiti', fontSize: 0.85, position: [1.95, 1.45, 0.05], rotation: [0, 0, -0.1], independentAnimation: true },
]

const BRAND_FONT = '/fonts/Orbitron-Black.ttf'
const GRAFFITI_FONT = '/fonts/PermanentMarker-Regular.ttf'

function resolveFont(font?: 'brand' | 'graffiti') {
  return font === 'graffiti' ? GRAFFITI_FONT : BRAND_FONT
}

// ── Beat analyser ──
function useBeatData(analyserNode: AnalyserNode | null | undefined, beatRef: React.MutableRefObject<number>) {
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
}

// ── Single text line with glow ──
function TextLine({ line, config, beatPulse }: {
  line: TextLine3D
  config: typeof PRESETS.default
  beatPulse: number
}) {
  const font = resolveFont(line.font)
  const fontSize = line.fontSize || 0.36
  const pos = line.position || [0, 0, 0] as [number, number, number]
  const rot = line.rotation
  const isIndep = line.independentAnimation
  const mainColor = line.color || (isIndep ? config.xColor : config.mainColor)
  const glowColor = line.glowColor || (isIndep ? config.xGlow : config.glowColor)
  const baseGlow = config.glowOpacity
  const beatGlow = config.glowBeatBoost

  return (
    <group>
      {/* Outer glow — large, soft */}
      <Text font={font} fontSize={fontSize} position={[pos[0], pos[1], pos[2] - 0.03]}
        anchorX="center" anchorY="middle" scale={[1.15, 1.25, 1]} rotation={rot}>
        {line.text}
        <meshBasicMaterial color={glowColor} transparent opacity={baseGlow * 0.4 + beatPulse * beatGlow * 0.3} depthWrite={false} />
      </Text>

      {/* Mid glow */}
      <Text font={font} fontSize={fontSize} position={[pos[0], pos[1], pos[2] - 0.02]}
        anchorX="center" anchorY="middle" scale={[1.06, 1.1, 1]} rotation={rot}>
        {line.text}
        <meshBasicMaterial color={glowColor} transparent opacity={baseGlow + beatPulse * beatGlow} depthWrite={false} />
      </Text>

      {/* Main text — bright, crisp */}
      <Text font={font} fontSize={fontSize} position={pos}
        anchorX="center" anchorY="middle" rotation={rot}>
        {line.text}
        <meshBasicMaterial color={mainColor} />
      </Text>

      {/* Hot core glow — only on beat */}
      {beatPulse > 0.2 && (
        <Text font={font} fontSize={fontSize} position={[pos[0], pos[1], pos[2] + 0.01]}
          anchorX="center" anchorY="middle" scale={[1.02, 1.03, 1]} rotation={rot}>
          {line.text}
          <meshBasicMaterial color="#ffffff" transparent opacity={beatPulse * 0.15} depthWrite={false} />
        </Text>
      )}
    </group>
  )
}

// ── The 3D scene ──
function TitleScene({ analyserNode, preset, beatRef, lines }: {
  analyserNode?: AnalyserNode | null; preset: string
  beatRef: React.MutableRefObject<number>; lines: TextLine3D[]
}) {
  const mainGroupRef = useRef<THREE.Group>(null)
  const indepRefs = useRef<(THREE.Group | null)[]>([])
  const glitchOffset = useRef({ x: 0, y: 0 })
  const config = PRESETS[preset as keyof typeof PRESETS] || PRESETS.default
  const timeRef = useRef(0)

  useBeatData(analyserNode, beatRef)

  const resolvedLines = lines || DEFAULT_LINES
  const mainLines = resolvedLines.filter(l => !l.independentAnimation)
  const indepLines = resolvedLines.filter(l => l.independentAnimation)

  useFrame((_, delta) => {
    timeRef.current += delta
    const t = timeRef.current
    const bp = beatRef.current

    if (mainGroupRef.current) {
      const scale = 1 + bp * config.pulseScale
      mainGroupRef.current.scale.setScalar(scale)
      mainGroupRef.current.rotation.z = Math.sin(t * config.wobbleSpeed) * config.wobbleAmount

      if (config.glitchChance > 0 && Math.random() < config.glitchChance * (1 + bp * 3)) {
        glitchOffset.current.x = (Math.random() - 0.5) * 0.12
        glitchOffset.current.y = (Math.random() - 0.5) * 0.05
      } else {
        glitchOffset.current.x *= 0.88
        glitchOffset.current.y *= 0.88
      }
      mainGroupRef.current.position.x = glitchOffset.current.x
      mainGroupRef.current.position.y = glitchOffset.current.y
    }

    indepRefs.current.forEach((ref) => {
      if (!ref) return
      ref.rotation.z = -0.1 + Math.sin(t * 1.2) * 0.03 + bp * 0.08
      ref.scale.setScalar(1 + bp * config.pulseScale * 1.5)
    })
  })

  return (
    <>
      {/* Main group */}
      <group ref={mainGroupRef}>
        {mainLines.map((line, i) => (
          <TextLine key={i} line={line} config={config} beatPulse={beatRef.current} />
        ))}
      </group>

      {/* Independent lines */}
      {indepLines.map((line, i) => (
        <group key={`indep-${i}`} ref={el => { indepRefs.current[i] = el }}>
          <TextLine line={line} config={config} beatPulse={beatRef.current} />
        </group>
      ))}
    </>
  )
}

// ── Exported component ──
export default function PunkTitle3D({ analyserNode, preset = 'default', lines, className, style }: PunkTitle3DProps) {
  const beatRef = useRef(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  const resolvedLines = lines || DEFAULT_LINES

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 15,
        ...style,
      }}
    >
      <Canvas
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
      >
        <TitleScene analyserNode={analyserNode} preset={preset} beatRef={beatRef} lines={resolvedLines} />
      </Canvas>
    </div>
  )
}
