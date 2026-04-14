// NPGX Poster Canvas Renderer
// Browser-side — bakes MagazineCoverOverlay elements into a downloadable PNG
// Mirrors card-renderer.ts pattern — pure Canvas 2D, no libs

import { getCoverLines, getIssueNumber, BARCODE_HEIGHTS } from './poster-shared'

// ─── Poster Dimensions ────────────────────────────────────

const POSTER_W = 1024
const POSTER_H = 1536
const CRIMSON = '#DC143C'

// ─── Types ────────────────────────────────────────────────

export interface PosterData {
  imageUrl: string
  characterName: string
  katakana?: string
  token: string
  tagline?: string
  issueNumber?: number
  coverLines?: string[]
  variant?: 'standard' | 'cover' | 'photoshoot' | 'editorial-spread'
  shotLabel?: string        // e.g. "HERO PORTRAIT • 01/05"
}

// ─── Main Render ─────────────────────────────────────────

export async function renderPoster(
  canvas: HTMLCanvasElement,
  data: PosterData,
): Promise<void> {
  canvas.width = POSTER_W
  canvas.height = POSTER_H
  const ctx = canvas.getContext('2d')!

  const variant = data.variant || 'standard'
  const isCover = variant === 'cover'
  const isEditorial = variant === 'editorial-spread'
  const coverLines = data.coverLines || getCoverLines(data.characterName)
  const issue = data.issueNumber
    ? String(data.issueNumber).padStart(3, '0')
    : getIssueNumber(data.characterName)

  // 1. Base image
  await drawBaseImage(ctx, data.imageUrl)

  if (isEditorial) {
    // Editorial spread — minimal, typographic
    drawEditorialSpread(ctx, data)
    return
  }

  // 2. Vignette
  drawVignette(ctx)

  // 3. Top gradient
  drawTopGradient(ctx)

  // 4. Bottom gradient
  drawBottomGradient(ctx)

  // 5. Frame border
  drawFrameBorder(ctx)

  // 6. Masthead
  drawMasthead(ctx, isCover)

  // 7. XXX badge
  drawXXXBadge(ctx, isCover)

  // 8. Masthead rule
  drawMastheadRule(ctx)

  // 9. Issue info / shot label
  drawIssueInfo(ctx, issue, variant, data.shotLabel)

  // 10. Left cover line (vertical)
  drawLeftCoverLine(ctx, coverLines[0])

  // 11. Katakana (vertical right)
  if (data.katakana) {
    drawKatakana(ctx, data.katakana)
  }

  // 12. Right cover line
  drawRightCoverLine(ctx, coverLines[1])

  // 13. Character block (name, token badge, barcode, tagline)
  drawCharacterBlock(ctx, data, isCover)

  // 14. Footer
  drawFooter(ctx)

  // Cover-only: price badge
  if (isCover) {
    drawPriceBadge(ctx)
  }
}

// ─── Editorial Spread Variant ────────────────────────────

function drawEditorialSpread(ctx: CanvasRenderingContext2D, data: PosterData) {
  // Subtle bottom gradient only
  const gradH = POSTER_H * 0.25
  const grad = ctx.createLinearGradient(0, POSTER_H, 0, POSTER_H - gradH)
  grad.addColorStop(0, 'rgba(0,0,0,0.7)')
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.fillRect(0, POSTER_H - gradH, POSTER_W, gradH)

  // Large watermark letter — top left
  ctx.font = '900 320px Impact, "Arial Black", sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  ctx.fillText(data.characterName.charAt(0), POSTER_W * 0.05, POSTER_H * 0.04)

  // Katakana — vertical right, bold
  if (data.katakana) {
    const x = POSTER_W - POSTER_W * 0.03 - 16
    let cy = POSTER_H * 0.08
    ctx.font = '900 42px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (const ch of data.katakana.split('')) {
      drawTextWithOutline(ctx, ch, x, cy, 'rgba(220,20,60,0.35)', 'rgba(0,0,0,0.5)', 1)
      cy += 50
    }
  }

  // Bottom: first name only — large and bold
  const firstName = data.characterName.split(' ')[0].toUpperCase()
  const padX = POSTER_W * 0.05
  const bottomY = POSTER_H * 0.96

  ctx.font = '900 110px Impact, "Arial Black", sans-serif'
  ctx.letterSpacing = '0.1em'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  drawTextWithOutline(ctx, firstName, padX, bottomY - 20, '#FFFFFF', '#000000', 4)
  ctx.letterSpacing = '0px'

  // Crimson rule under name
  ctx.fillStyle = CRIMSON
  ctx.fillRect(padX, bottomY - 16, POSTER_W * 0.2, 3)

  // Token — right aligned
  ctx.font = '700 22px "Courier New", monospace'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = 'rgba(220,20,60,0.6)'
  ctx.fillText(data.token, POSTER_W - padX, bottomY - 24)

  // Page number feel — bottom right
  ctx.font = '400 11px "Helvetica Neue", Arial, sans-serif'
  ctx.letterSpacing = '0.15em'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.fillText('NPGX MAGAZINE', POSTER_W - padX, bottomY)
  ctx.letterSpacing = '0px'
}

// ─── Layer Functions ─────────────────────────────────────

async function drawBaseImage(ctx: CanvasRenderingContext2D, imageUrl: string) {
  try {
    const img = await loadImage(imageUrl)
    // Cover-fit
    const imgRatio = img.width / img.height
    const canvasRatio = POSTER_W / POSTER_H
    let sx = 0, sy = 0, sw = img.width, sh = img.height

    if (imgRatio > canvasRatio) {
      sw = img.height * canvasRatio
      sx = (img.width - sw) / 2
    } else {
      sh = img.width / canvasRatio
      sy = (img.height - sh) / 2
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, POSTER_W, POSTER_H)
  } catch {
    // Fallback: dark gradient
    const grad = ctx.createLinearGradient(0, 0, 0, POSTER_H)
    grad.addColorStop(0, '#1a1a2e')
    grad.addColorStop(1, '#0a0a0f')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, POSTER_W, POSTER_H)
  }
}

function drawVignette(ctx: CanvasRenderingContext2D) {
  const grad = ctx.createRadialGradient(
    POSTER_W / 2, POSTER_H / 2, POSTER_W * 0.25,
    POSTER_W / 2, POSTER_H / 2, POSTER_W * 0.85,
  )
  grad.addColorStop(0, 'transparent')
  grad.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, POSTER_W, POSTER_H)
}

function drawTopGradient(ctx: CanvasRenderingContext2D) {
  const h = POSTER_H * 0.35
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, 'rgba(0,0,0,0.75)')
  grad.addColorStop(0.5, 'rgba(0,0,0,0.3)')
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, POSTER_W, h)
}

function drawBottomGradient(ctx: CanvasRenderingContext2D) {
  const h = POSTER_H * 0.4
  const y = POSTER_H - h
  const grad = ctx.createLinearGradient(0, POSTER_H, 0, y)
  grad.addColorStop(0, 'rgba(0,0,0,0.85)')
  grad.addColorStop(0.4, 'rgba(0,0,0,0.4)')
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.fillRect(0, y, POSTER_W, h)
}

function drawFrameBorder(ctx: CanvasRenderingContext2D) {
  const inset = POSTER_W * 0.02
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.strokeRect(inset, inset, POSTER_W - inset * 2, POSTER_H - inset * 2)
}

function drawMasthead(ctx: CanvasRenderingContext2D, isCover: boolean) {
  const x = POSTER_W * 0.04
  const y = POSTER_H * 0.03 + (isCover ? 106 : 92)

  ctx.font = `900 ${isCover ? 106 : 92}px Impact, "Arial Black", sans-serif`
  ctx.letterSpacing = '0.08em'
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'

  drawTextWithOutline(ctx, 'NINJA PUNK GIRLS', x, POSTER_H * 0.03, '#FFFFFF', '#000000', 4)

  // Reset letter spacing
  ctx.letterSpacing = '0px'
}

function drawXXXBadge(ctx: CanvasRenderingContext2D, isCover: boolean) {
  const fontSize = isCover ? 110 : 98
  ctx.font = `900 ${fontSize}px Impact, "Arial Black", sans-serif`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'

  const x = POSTER_W - POSTER_W * 0.04
  const y = POSTER_H * 0.03

  // Outline
  ctx.fillStyle = '#000000'
  for (let dx = -4; dx <= 4; dx += 2) {
    for (let dy = -4; dy <= 4; dy += 2) {
      ctx.fillText('XXX', x + dx, y + dy)
    }
  }
  // Glow
  ctx.shadowColor = 'rgba(220,20,60,0.6)'
  ctx.shadowBlur = 40
  ctx.fillStyle = CRIMSON
  ctx.fillText('XXX', x, y)
  ctx.shadowBlur = 0

  ctx.textAlign = 'left'
}

function drawMastheadRule(ctx: CanvasRenderingContext2D) {
  const x = POSTER_W * 0.04
  const y = POSTER_H * 0.03 + 96
  const w = POSTER_W * 0.5

  const grad = ctx.createLinearGradient(x, 0, x + w, 0)
  grad.addColorStop(0, CRIMSON)
  grad.addColorStop(0.6, CRIMSON)
  grad.addColorStop(1, 'transparent')

  ctx.fillStyle = grad
  ctx.fillRect(x, y, w, 2)
}

function drawIssueInfo(
  ctx: CanvasRenderingContext2D,
  issue: string,
  variant: string,
  shotLabel?: string,
) {
  const x = POSTER_W * 0.04
  const y = POSTER_H * 0.03 + 106

  const isPhotoshoot = variant === 'photoshoot'
  const isCover = variant === 'cover'

  ctx.font = `${isPhotoshoot ? 700 : 400} 16px "Helvetica Neue", Arial, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.letterSpacing = '0.15em'

  let text: string
  if (isPhotoshoot && shotLabel) {
    text = shotLabel
    ctx.fillStyle = 'rgba(220,20,60,0.7)'
  } else if (isCover) {
    text = `ISSUE ${issue} \u2014 GENESIS \u2022 NPGX.WEBSITE`
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
  } else {
    text = `ISSUE NO. ${issue} \u2022 NPGX.WEBSITE \u2022 UNCENSORED`
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
  }

  drawTextWithOutline(ctx, text, x, y, ctx.fillStyle as string, 'rgba(0,0,0,0.8)', 1)
  ctx.letterSpacing = '0px'
}

function drawLeftCoverLine(ctx: CanvasRenderingContext2D, text: string) {
  const x = POSTER_W * 0.04 + 8
  const y = POSTER_H * 0.42

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-Math.PI / 2)

  ctx.font = '400 14px "Helvetica Neue", Arial, sans-serif'
  ctx.letterSpacing = '0.3em'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.35)'

  drawTextWithOutline(ctx, text, 0, 0, 'rgba(255,255,255,0.35)', 'rgba(0,0,0,0.5)', 1)

  ctx.restore()
  ctx.letterSpacing = '0px'
}

function drawKatakana(ctx: CanvasRenderingContext2D, katakana: string) {
  const x = POSTER_W - POSTER_W * 0.04 - 12
  const startY = POSTER_H * 0.25

  ctx.font = '700 28px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = 'rgba(220,20,60,0.45)'

  // Draw each character vertically
  const chars = katakana.split('')
  let cy = startY
  for (const ch of chars) {
    drawTextWithOutline(ctx, ch, x, cy, 'rgba(220,20,60,0.45)', 'rgba(0,0,0,0.5)', 1)
    cy += 34
  }
}

function drawRightCoverLine(ctx: CanvasRenderingContext2D, text: string) {
  const x = POSTER_W - POSTER_W * 0.04
  const y = POSTER_H * 0.65

  ctx.font = '900 18px Impact, "Arial Black", sans-serif'
  ctx.letterSpacing = '0.2em'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'

  drawTextWithOutline(ctx, text, x, y, CRIMSON, '#000000', 3)
  ctx.letterSpacing = '0px'
}

function drawCharacterBlock(
  ctx: CanvasRenderingContext2D,
  data: PosterData,
  isCover: boolean,
) {
  const padX = POSTER_W * 0.04
  const bottomY = POSTER_H * 0.97

  // Tagline
  if (data.tagline) {
    ctx.font = '400 14px "Helvetica Neue", Arial, sans-serif'
    ctx.letterSpacing = '0.15em'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'

    drawTextWithOutline(
      ctx, data.tagline.toUpperCase(), padX, bottomY - 90,
      'rgba(255,255,255,0.5)', 'rgba(0,0,0,0.8)', 1,
    )
    ctx.letterSpacing = '0px'
  }

  // Character name
  const nameSize = isCover ? 86 : 82
  ctx.font = `900 ${nameSize}px Impact, "Arial Black", sans-serif`
  ctx.letterSpacing = '0.06em'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'

  drawTextWithOutline(
    ctx, data.characterName.toUpperCase(), padX, bottomY - 36,
    '#FFFFFF', '#000000', 5,
  )
  ctx.letterSpacing = '0px'

  // Token badge (right-aligned)
  const tokenX = POSTER_W - padX
  const tokenY = bottomY - 56

  ctx.font = '700 20px "Courier New", monospace'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.letterSpacing = '0.05em'

  // Badge background
  const tokenW = ctx.measureText(data.token).width + 16
  const tokenH = 28
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(tokenX - tokenW, tokenY - tokenH, tokenW, tokenH)

  // Badge border
  ctx.strokeStyle = 'rgba(220,20,60,0.4)'
  ctx.lineWidth = 1
  ctx.strokeRect(tokenX - tokenW, tokenY - tokenH, tokenW, tokenH)

  // Badge text
  ctx.fillStyle = CRIMSON
  ctx.fillText(data.token, tokenX - 8, tokenY - 6)
  ctx.letterSpacing = '0px'

  // Mini barcode
  const barcodeX = tokenX - tokenW
  const barcodeY = tokenY + 2
  BARCODE_HEIGHTS.forEach((h, i) => {
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillRect(barcodeX + i * 3, barcodeY + (9 - h * 1.5), 1.5, h * 1.5)
  })

  // Bottom rule
  const ruleY = bottomY - 28
  const ruleGrad = ctx.createLinearGradient(padX, 0, POSTER_W * 0.7, 0)
  ruleGrad.addColorStop(0, 'rgba(220,20,60,0.6)')
  ruleGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = ruleGrad
  ctx.fillRect(padX, ruleY, POSTER_W - padX * 2, 1)
}

function drawFooter(ctx: CanvasRenderingContext2D) {
  const padX = POSTER_W * 0.04
  const y = POSTER_H * 0.97 - 10

  ctx.font = '400 11px "Helvetica Neue", Arial, sans-serif'
  ctx.letterSpacing = '0.1em'
  ctx.textBaseline = 'top'

  // Left
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.fillText('NPGX.WEBSITE', padX, y)

  // Right
  ctx.textAlign = 'right'
  ctx.fillText(`AI GENERATED \u2022 ${new Date().getFullYear()}`, POSTER_W - padX, y)

  ctx.letterSpacing = '0px'
}

function drawPriceBadge(ctx: CanvasRenderingContext2D) {
  const x = POSTER_W - POSTER_W * 0.04
  const y = POSTER_H * 0.03 + 130

  ctx.font = '900 28px Impact, "Arial Black", sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'

  // Background
  const text = '$9.99'
  const tw = ctx.measureText(text).width + 24
  ctx.fillStyle = CRIMSON
  ctx.fillRect(x - tw, y, tw, 38)

  // Text
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(text, x - 12, y + 6)
}

// ─── Export as PNG ────────────────────────────────────────

export function exportPosterAsPNG(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}

// ─── Helpers ─────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function drawTextWithOutline(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fill: string,
  outline: string = '#000',
  w: number = 4,
) {
  ctx.fillStyle = outline
  for (let dx = -w; dx <= w; dx += 2) {
    for (let dy = -w; dy <= w; dy += 2) {
      ctx.fillText(text, x + dx, y + dy)
    }
  }
  ctx.fillStyle = fill
  ctx.fillText(text, x, y)
}
