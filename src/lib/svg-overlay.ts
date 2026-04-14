// NPGX SVG Overlay Generator
// Creates bold typographic SVG overlays to composite over images
// Used for: magazine pages, posters, video thumbnails, social media

export type OverlayStyle =
  | 'masthead'          // Full NINJA PUNK GIRLS XXX masthead
  | 'character-title'   // Big bold character name + katakana
  | 'editorial-minimal' // First name + token, clean editorial
  | 'pull-quote'        // Large typographic pull quote
  | 'page-number'       // Corner page number with rule
  | 'chapter-title'     // Story chapter heading
  | 'watermark-letter'  // Giant faded single letter

export interface OverlayConfig {
  style: OverlayStyle
  width: number
  height: number
  characterName?: string
  katakana?: string
  token?: string
  tagline?: string
  text?: string          // for pull-quote, chapter-title
  pageNumber?: number
  issueNumber?: number
  colors?: {
    primary?: string     // default: white
    accent?: string      // default: crimson #DC143C
    bg?: string          // default: transparent
  }
}

const CRIMSON = '#DC143C'

export function generateSVGOverlay(config: OverlayConfig): string {
  const { width, height, colors } = config
  const primary = colors?.primary || '#FFFFFF'
  const accent = colors?.accent || CRIMSON
  const bg = colors?.bg || 'transparent'

  switch (config.style) {
    case 'masthead':
      return generateMasthead(width, height, primary, accent, bg, config)
    case 'character-title':
      return generateCharacterTitle(width, height, primary, accent, bg, config)
    case 'editorial-minimal':
      return generateEditorialMinimal(width, height, primary, accent, bg, config)
    case 'pull-quote':
      return generatePullQuote(width, height, primary, accent, bg, config)
    case 'page-number':
      return generatePageNumber(width, height, primary, accent, bg, config)
    case 'chapter-title':
      return generateChapterTitle(width, height, primary, accent, bg, config)
    case 'watermark-letter':
      return generateWatermarkLetter(width, height, primary, accent, bg, config)
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`
  }
}

function generateMasthead(w: number, h: number, primary: string, accent: string, bg: string, c: OverlayConfig): string {
  const issue = c.issueNumber ? String(c.issueNumber).padStart(3, '0') : '001'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0.75"/>
      <stop offset="50%" stop-color="#000" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="60%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </linearGradient>
    <filter id="textShadow">
      <feDropShadow dx="3" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.9"/>
    </filter>
  </defs>
  <rect x="0" y="0" width="${w}" height="${h * 0.35}" fill="url(#topFade)"/>
  <text x="${w * 0.04}" y="${h * 0.08}" font-family="Impact, 'Arial Black', sans-serif" font-weight="900" font-size="${w * 0.09}" fill="${primary}" letter-spacing="0.08em" filter="url(#textShadow)">NINJA PUNK GIRLS</text>
  <text x="${w * 0.88}" y="${h * 0.08}" font-family="Impact, 'Arial Black', sans-serif" font-weight="900" font-size="${w * 0.1}" fill="${accent}" text-anchor="end" filter="url(#textShadow)">XXX</text>
  <rect x="${w * 0.04}" y="${h * 0.09}" width="${w * 0.5}" height="2" fill="url(#rule)"/>
  <text x="${w * 0.04}" y="${h * 0.105}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="${w * 0.014}" fill="${primary}" fill-opacity="0.6" letter-spacing="0.15em">ISSUE NO. ${issue} • NPGX.WEBSITE • UNCENSORED</text>
</svg>`
}

function generateCharacterTitle(w: number, h: number, primary: string, accent: string, bg: string, c: OverlayConfig): string {
  const name = (c.characterName || 'UNKNOWN').toUpperCase()
  const katakana = c.katakana || ''
  const token = c.token || ''
  const tagline = c.tagline || ''

  // Split katakana into individual characters for vertical layout
  const katakanaChars = katakana.split('')
  const katakanaElements = katakanaChars.map((ch, i) =>
    `<text x="${w * 0.96}" y="${h * 0.25 + i * (w * 0.04)}" font-size="${w * 0.032}" fill="${accent}" fill-opacity="0.45" font-weight="700" text-anchor="middle">${ch}</text>`
  ).join('\n  ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bottomFade" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#000" stop-opacity="0.85"/>
      <stop offset="40%" stop-color="#000" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
    <filter id="heavyShadow">
      <feDropShadow dx="4" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.95"/>
    </filter>
  </defs>
  <rect x="0" y="${h * 0.6}" width="${w}" height="${h * 0.4}" fill="url(#bottomFade)"/>
  ${katakanaElements}
  ${tagline ? `<text x="${w * 0.04}" y="${h * 0.88}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="${w * 0.014}" fill="${primary}" fill-opacity="0.5" letter-spacing="0.15em">${tagline.toUpperCase()}</text>` : ''}
  <text x="${w * 0.04}" y="${h * 0.95}" font-family="Impact, 'Arial Black', sans-serif" font-weight="900" font-size="${w * 0.085}" fill="${primary}" letter-spacing="0.06em" filter="url(#heavyShadow)">${name}</text>
  <text x="${w * 0.96}" y="${h * 0.94}" font-family="'Courier New', monospace" font-weight="700" font-size="${w * 0.02}" fill="${accent}" text-anchor="end" fill-opacity="0.8">${token}</text>
  <rect x="${w * 0.04}" y="${h * 0.96}" width="${w * 0.92}" height="1" fill="${accent}" fill-opacity="0.6"/>
  <text x="${w * 0.04}" y="${h * 0.98}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="${w * 0.01}" fill="${primary}" fill-opacity="0.25" letter-spacing="0.1em">NPGX.WEBSITE</text>
  <text x="${w * 0.96}" y="${h * 0.98}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="${w * 0.01}" fill="${primary}" fill-opacity="0.25" letter-spacing="0.1em" text-anchor="end">AI GENERATED • ${new Date().getFullYear()}</text>
</svg>`
}

function generateEditorialMinimal(w: number, h: number, primary: string, accent: string, _bg: string, c: OverlayConfig): string {
  const firstName = (c.characterName || '').split(' ')[0].toUpperCase()
  const katakanaChars = (c.katakana || '').split('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="subtleBottom" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#000" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
    <filter id="nameShadow">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.9"/>
    </filter>
  </defs>
  <rect x="0" y="${h * 0.75}" width="${w}" height="${h * 0.25}" fill="url(#subtleBottom)"/>
  <text x="${w * 0.05}" y="${h * 0.06}" font-family="Impact, 'Arial Black', sans-serif" font-weight="900" font-size="${w * 0.3}" fill="${primary}" fill-opacity="0.04">${firstName.charAt(0)}</text>
  ${katakanaChars.map((ch, i) =>
    `<text x="${w * 0.97}" y="${h * 0.08 + i * (w * 0.05)}" font-size="${w * 0.04}" fill="${accent}" fill-opacity="0.35" font-weight="900" text-anchor="middle" letter-spacing="0.3em">${ch}</text>`
  ).join('\n  ')}
  <text x="${w * 0.05}" y="${h * 0.94}" font-family="Impact, 'Arial Black', sans-serif" font-weight="900" font-size="${w * 0.1}" fill="${primary}" letter-spacing="0.1em" filter="url(#nameShadow)">${firstName}</text>
  <rect x="${w * 0.05}" y="${h * 0.955}" width="${w * 0.15}" height="3" fill="${accent}"/>
  <text x="${w * 0.95}" y="${h * 0.95}" font-family="'Courier New', monospace" font-weight="700" font-size="${w * 0.018}" fill="${accent}" fill-opacity="0.6" text-anchor="end">${c.token || ''}</text>
  <text x="${w * 0.95}" y="${h * 0.98}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="${w * 0.009}" fill="${primary}" fill-opacity="0.2" letter-spacing="0.15em" text-anchor="end">NPGX MAGAZINE</text>
</svg>`
}

function generatePullQuote(w: number, h: number, primary: string, accent: string, _bg: string, c: OverlayConfig): string {
  const text = c.text || ''
  // Word-wrap: rough estimate at ~18 chars per line at the font size
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).length > 24) {
      lines.push(current.trim())
      current = word
    } else {
      current += ' ' + word
    }
  }
  if (current.trim()) lines.push(current.trim())

  const lineHeight = w * 0.065
  const startY = h * 0.4 - (lines.length * lineHeight) / 2

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="quoteShadow">
      <feDropShadow dx="2" dy="2" stdDeviation="4" flood-color="#000" flood-opacity="0.8"/>
    </filter>
  </defs>
  <text x="${w * 0.06}" y="${startY - lineHeight}" font-family="Georgia, 'Times New Roman', serif" font-size="${w * 0.2}" fill="${accent}" fill-opacity="0.3" filter="url(#quoteShadow)">"</text>
  ${lines.map((line, i) =>
    `<text x="${w * 0.1}" y="${startY + i * lineHeight}" font-family="Impact, 'Arial Black', sans-serif" font-weight="900" font-size="${w * 0.05}" fill="${primary}" letter-spacing="0.04em" filter="url(#quoteShadow)">${escapeXml(line.toUpperCase())}</text>`
  ).join('\n  ')}
  <rect x="${w * 0.1}" y="${startY + lines.length * lineHeight + 8}" width="${w * 0.12}" height="3" fill="${accent}"/>
  ${c.characterName ? `<text x="${w * 0.1}" y="${startY + lines.length * lineHeight + 28}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="${w * 0.016}" fill="${primary}" fill-opacity="0.5" letter-spacing="0.2em">— ${c.characterName.toUpperCase()}</text>` : ''}
</svg>`
}

function generatePageNumber(w: number, h: number, primary: string, accent: string, _bg: string, c: OverlayConfig): string {
  const num = String(c.pageNumber || 1).padStart(2, '0')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect x="${w * 0.92}" y="${h * 0.94}" width="${w * 0.04}" height="1" fill="${accent}" fill-opacity="0.5"/>
  <text x="${w * 0.96}" y="${h * 0.97}" font-family="'Courier New', monospace" font-size="${w * 0.018}" fill="${primary}" fill-opacity="0.4" text-anchor="end" font-weight="700">${num}</text>
</svg>`
}

function generateChapterTitle(w: number, h: number, primary: string, accent: string, _bg: string, c: OverlayConfig): string {
  const title = (c.text || 'UNTITLED').toUpperCase()
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="chapterShadow">
      <feDropShadow dx="3" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.9"/>
    </filter>
  </defs>
  <rect x="${w * 0.06}" y="${h * 0.44}" width="${w * 0.06}" height="4" fill="${accent}"/>
  <text x="${w * 0.06}" y="${h * 0.5}" font-family="Impact, 'Arial Black', sans-serif" font-weight="900" font-size="${w * 0.07}" fill="${primary}" letter-spacing="0.08em" filter="url(#chapterShadow)">${escapeXml(title)}</text>
  <rect x="${w * 0.06}" y="${h * 0.52}" width="${w * 0.3}" height="2" fill="${accent}" fill-opacity="0.6"/>
  ${c.characterName ? `<text x="${w * 0.06}" y="${h * 0.55}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="${w * 0.016}" fill="${primary}" fill-opacity="0.4" letter-spacing="0.2em">${c.characterName.toUpperCase()}</text>` : ''}
</svg>`
}

function generateWatermarkLetter(w: number, h: number, _primary: string, _accent: string, _bg: string, c: OverlayConfig): string {
  const letter = (c.characterName || 'X').charAt(0).toUpperCase()
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <text x="${w * 0.5}" y="${h * 0.55}" font-family="Impact, 'Arial Black', sans-serif" font-weight="900" font-size="${w * 0.8}" fill="#FFFFFF" fill-opacity="0.03" text-anchor="middle" dominant-baseline="middle">${letter}</text>
</svg>`
}

// ─── Helpers ─────────────────────────────────────────────

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

// ─── Convenience: render SVG string to data URL ──────────

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

// ─── Convenience: composite SVG over image on canvas ─────

export async function compositeSVGOverImage(
  canvas: HTMLCanvasElement,
  imageUrl: string,
  svgString: string,
): Promise<void> {
  const ctx = canvas.getContext('2d')!
  const w = canvas.width
  const h = canvas.height

  // Draw base image
  const img = await loadImg(imageUrl)
  const imgRatio = img.width / img.height
  const canvasRatio = w / h
  let sx = 0, sy = 0, sw = img.width, sh = img.height
  if (imgRatio > canvasRatio) {
    sw = img.height * canvasRatio
    sx = (img.width - sw) / 2
  } else {
    sh = img.width / canvasRatio
    sy = (img.height - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)

  // Draw SVG overlay
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)
  try {
    const svgImg = await loadImg(svgUrl)
    ctx.drawImage(svgImg, 0, 0, w, h)
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Only set crossOrigin for actual URLs — data: and blob: URIs break with it
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(new Error(`Image load failed: ${src.slice(0, 80)}`))
    img.src = src
  })
}
