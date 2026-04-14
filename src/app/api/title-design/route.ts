import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/title-design
 *
 * Programmatic title design API — generates SVG title overlays.
 * Used by MCP servers, CLI tools, and AI agents.
 *
 * Accepts: { layers: TextLayerInput[], width?, height?, background? }
 * Returns: { svg: string, width: number, height: number }
 */

interface TextLayerInput {
  text: string
  font?: 'punk' | 'neon' | 'elegant' | 'graffiti' | 'cyber' | 'manga'
  fontSize?: number
  letterSpacing?: number
  color?: string
  x?: number
  y?: number
  rotation?: number
  opacity?: number
  stroke?: boolean
  strokeColor?: string
  strokeWidth?: number
  glow?: boolean
  glowColor?: string
  glowBlur?: number
  textTransform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none'
}

const FONT_MAP: Record<string, { family: string; weight: string; style: string }> = {
  punk: { family: 'Impact, "Arial Black", sans-serif', weight: '900', style: 'italic' },
  neon: { family: '"Orbitron", monospace', weight: '700', style: 'normal' },
  elegant: { family: '"Georgia", "Times New Roman", serif', weight: '300', style: 'normal' },
  graffiti: { family: '"Permanent Marker", cursive', weight: '400', style: 'normal' },
  cyber: { family: '"Courier New", "Lucida Console", monospace', weight: '700', style: 'normal' },
  manga: { family: 'Impact, "Arial Black", "Helvetica Neue", sans-serif', weight: '900', style: 'normal' },
}

export async function POST(req: NextRequest) {
  // $402 paywall
  const { checkPaywall } = await import('@/lib/paywall')
  const { response: paywallResponse } = await checkPaywall(req, 'title-design')
  if (paywallResponse) return paywallResponse

  try {
    const body = await req.json()
    const {
      layers = [],
      width = 900,
      height = 640,
      background = 'transparent',
    } = body as {
      layers: TextLayerInput[]
      width?: number
      height?: number
      background?: 'transparent' | 'black' | string
    }

    if (!layers.length) {
      return NextResponse.json({ error: 'At least one text layer required' }, { status: 400 })
    }

    if (layers.length > 20) {
      return NextResponse.json({ error: 'Maximum 20 text layers' }, { status: 400 })
    }

    const defs: string[] = []
    const elements: string[] = []

    // Background
    if (background === 'black') {
      elements.push(`  <rect width="${width}" height="${height}" fill="#000"/>`)
    } else if (background !== 'transparent' && background.startsWith('#')) {
      elements.push(`  <rect width="${width}" height="${height}" fill="${escapeAttr(background)}"/>`)
    }

    // Process each layer
    layers.forEach((layer, i) => {
      const id = `layer-${i}`
      const font = FONT_MAP[layer.font || 'punk'] || FONT_MAP.punk
      const fontSize = clamp(layer.fontSize || 72, 8, 500)
      const letterSpacing = clamp(layer.letterSpacing ?? 4, -20, 50)
      const color = layer.color || '#ef4444'
      const x = layer.x ?? width / 2
      const y = layer.y ?? (height / 2 + i * 80)
      const rotation = clamp(layer.rotation ?? 0, -360, 360)
      const opacity = clamp(layer.opacity ?? 1, 0, 1)
      const transform = layer.textTransform || 'uppercase'

      let displayText = layer.text || ''
      switch (transform) {
        case 'uppercase': displayText = displayText.toUpperCase(); break
        case 'lowercase': displayText = displayText.toLowerCase(); break
        case 'capitalize': displayText = displayText.replace(/\b\w/g, c => c.toUpperCase()); break
      }

      // Glow / shadow filter
      if (layer.glow) {
        const blur = clamp(layer.glowBlur ?? 20, 1, 60)
        const glowColor = layer.glowColor || color
        if (layer.font === 'neon') {
          defs.push(`<filter id="glow-${id}" x="-50%" y="-50%" width="200%" height="200%">`)
          defs.push(`  <feGaussianBlur in="SourceGraphic" stdDeviation="${blur * 0.3}" result="b1"/>`)
          defs.push(`  <feGaussianBlur in="SourceGraphic" stdDeviation="${blur * 0.8}" result="b2"/>`)
          defs.push(`  <feGaussianBlur in="SourceGraphic" stdDeviation="${blur * 1.5}" result="b3"/>`)
          defs.push(`  <feMerge><feMergeNode in="b3"/><feMergeNode in="b2"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge>`)
          defs.push(`</filter>`)
        } else {
          defs.push(`<filter id="glow-${id}" x="-30%" y="-30%" width="160%" height="160%">`)
          defs.push(`  <feDropShadow dx="0" dy="0" stdDeviation="${blur}" flood-color="${escapeAttr(glowColor)}" flood-opacity="0.8"/>`)
          defs.push(`</filter>`)
        }
      }

      // Punk distressed filter
      if (layer.font === 'punk') {
        defs.push(`<filter id="rough-${id}" x="-10%" y="-10%" width="120%" height="120%">`)
        defs.push(`  <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="4" seed="${i + 2}" result="noise"/>`)
        defs.push(`  <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G"/>`)
        defs.push(`</filter>`)
      }

      // Build text attributes
      const attrs: string[] = [
        `x="${x}"`,
        `y="${y}"`,
        `font-family="${font.family.replace(/"/g, "'")}"`,
        `font-weight="${font.weight}"`,
        `font-style="${font.style}"`,
        `font-size="${fontSize}"`,
        `letter-spacing="${letterSpacing}"`,
        `fill="${escapeAttr(color)}"`,
        `opacity="${opacity}"`,
        `text-anchor="middle"`,
        `dominant-baseline="central"`,
      ]

      if (layer.stroke !== false) {
        attrs.push(`stroke="${escapeAttr(layer.strokeColor || '#000')}"`)
        attrs.push(`stroke-width="${clamp(layer.strokeWidth ?? 2, 0, 20)}"`)
        attrs.push(`paint-order="stroke fill"`)
      }

      const filterParts: string[] = []
      if (layer.glow) filterParts.push(`glow-${id}`)
      if (layer.font === 'punk') filterParts.push(`rough-${id}`)
      if (filterParts.length) {
        // SVG can only reference one filter per element, so use the first
        attrs.push(`filter="url(#${filterParts[0]})"`)
      }

      if (rotation !== 0) {
        attrs.push(`transform="rotate(${rotation}, ${x}, ${y})"`)
      }

      elements.push(`  <text ${attrs.join(' ')}>${escapeXml(displayText)}</text>`)
    })

    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      defs.length ? `  <defs>\n${defs.map(d => '    ' + d).join('\n')}\n  </defs>` : '',
      ...elements,
      `</svg>`,
    ].filter(Boolean).join('\n')

    return NextResponse.json({
      success: true,
      svg,
      width,
      height,
      layerCount: layers.length,
    })
  } catch (e) {
    console.error('[title-design] Error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Title design failed' },
      { status: 500 },
    )
  }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}
