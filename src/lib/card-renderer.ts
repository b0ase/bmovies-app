// NPGX Trading Card Canvas Renderer
// Browser-side — renders card overlays on top of character images

import type { TradingCard, RarityTier } from './trading-cards'
import { RARITY_TIERS } from './trading-cards'

// ─── Card Dimensions ────────────────────────────────────

const CARD_W = 750
const CARD_H = 1050
const BORDER = 20
const INNER_PAD = 12
const IMAGE_TOP = 80
const IMAGE_BOTTOM = 340 // space for stats area
const STATS_Y = CARD_H - IMAGE_BOTTOM + 40

// ─── Main Render ─────────────────────────────────────────

export async function renderTradingCard(
  canvas: HTMLCanvasElement,
  card: TradingCard,
): Promise<void> {
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')!

  // 1. Background
  drawBackground(ctx, card.rarity)

  // 2. Character image
  await drawCharacterImage(ctx, card.imageUrl)

  // 3. Border
  drawBorder(ctx, card.rarity)

  // 4. Rarity glow
  drawRarityGlow(ctx, card.rarity)

  // 5. Logo (top-left)
  drawLogo(ctx)

  // 6. Rarity badge (top-right)
  drawRarityBadge(ctx, card.rarity)

  // 7. Character name
  drawCharacterName(ctx, card)

  // 8. Token + category
  drawTokenCategory(ctx, card)

  // 9. Stats bar
  drawStatsBar(ctx, card)

  // 10. Serial number
  drawSerial(ctx, card)

  // 11. Hologram strip (LEGENDARY/EPIC only)
  if (card.rarity.name === 'LEGENDARY' || card.rarity.name === 'EPIC') {
    drawHologramStrip(ctx, card.rarity)
  }
}

// ─── Layer Functions ─────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, rarity: RarityTier) {
  // Dark base
  ctx.fillStyle = '#0a0a0f'
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // Subtle radial gradient with rarity color
  const grad = ctx.createRadialGradient(CARD_W / 2, CARD_H * 0.35, 50, CARD_W / 2, CARD_H * 0.35, CARD_W)
  grad.addColorStop(0, rarity.glow)
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, CARD_W, CARD_H)
}

async function drawCharacterImage(ctx: CanvasRenderingContext2D, imageUrl: string) {
  try {
    const img = await loadImage(imageUrl)
    const imgArea = {
      x: BORDER + INNER_PAD,
      y: IMAGE_TOP,
      w: CARD_W - (BORDER + INNER_PAD) * 2,
      h: CARD_H - IMAGE_TOP - IMAGE_BOTTOM,
    }

    // Cover-fit the image
    const imgRatio = img.width / img.height
    const areaRatio = imgArea.w / imgArea.h
    let sx = 0, sy = 0, sw = img.width, sh = img.height

    if (imgRatio > areaRatio) {
      // Image wider than area — crop sides
      sw = img.height * areaRatio
      sx = (img.width - sw) / 2
    } else {
      // Image taller — crop top/bottom
      sh = img.width / areaRatio
      sy = (img.height - sh) / 2
    }

    ctx.drawImage(img, sx, sy, sw, sh, imgArea.x, imgArea.y, imgArea.w, imgArea.h)

    // Vignette over image bottom (for name readability)
    const vignette = ctx.createLinearGradient(0, imgArea.y + imgArea.h - 120, 0, imgArea.y + imgArea.h)
    vignette.addColorStop(0, 'transparent')
    vignette.addColorStop(1, 'rgba(10,10,15,0.85)')
    ctx.fillStyle = vignette
    ctx.fillRect(imgArea.x, imgArea.y + imgArea.h - 120, imgArea.w, 120)
  } catch {
    // Fallback: gradient placeholder
    const imgArea = {
      x: BORDER + INNER_PAD,
      y: IMAGE_TOP,
      w: CARD_W - (BORDER + INNER_PAD) * 2,
      h: CARD_H - IMAGE_TOP - IMAGE_BOTTOM,
    }
    const grad = ctx.createLinearGradient(0, imgArea.y, 0, imgArea.y + imgArea.h)
    grad.addColorStop(0, '#1a1a2e')
    grad.addColorStop(1, '#0a0a0f')
    ctx.fillStyle = grad
    ctx.fillRect(imgArea.x, imgArea.y, imgArea.w, imgArea.h)

    ctx.fillStyle = '#333'
    ctx.font = '600 24px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('Image Not Available', CARD_W / 2, imgArea.y + imgArea.h / 2)
    ctx.textAlign = 'start'
  }
}

function drawBorder(ctx: CanvasRenderingContext2D, rarity: RarityTier) {
  const { color } = rarity

  // Outer border
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  roundRect(ctx, BORDER / 2, BORDER / 2, CARD_W - BORDER, CARD_H - BORDER, 12)
  ctx.stroke()

  // Inner border (thinner)
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.5
  roundRect(ctx, BORDER + INNER_PAD / 2, BORDER + INNER_PAD / 2, CARD_W - (BORDER + INNER_PAD), CARD_H - (BORDER + INNER_PAD), 8)
  ctx.stroke()
  ctx.globalAlpha = 1

  // Corner accents
  const corners = [
    [BORDER + 4, BORDER + 4],
    [CARD_W - BORDER - 4, BORDER + 4],
    [BORDER + 4, CARD_H - BORDER - 4],
    [CARD_W - BORDER - 4, CARD_H - BORDER - 4],
  ]
  ctx.fillStyle = color
  for (const [x, y] of corners) {
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawRarityGlow(ctx: CanvasRenderingContext2D, rarity: RarityTier) {
  ctx.shadowColor = rarity.color
  ctx.shadowBlur = 20
  ctx.strokeStyle = 'transparent'
  roundRect(ctx, BORDER, BORDER, CARD_W - BORDER * 2, CARD_H - BORDER * 2, 10)
  ctx.stroke()
  ctx.shadowBlur = 0
}

function drawLogo(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.font = '800 22px system-ui'
  ctx.fillStyle = '#e91e8c'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('NPGX', BORDER + INNER_PAD + 8, BORDER + INNER_PAD + 8)

  // Subtle underline
  const w = ctx.measureText('NPGX').width
  ctx.strokeStyle = '#e91e8c'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(BORDER + INNER_PAD + 8, BORDER + INNER_PAD + 32)
  ctx.lineTo(BORDER + INNER_PAD + 8 + w, BORDER + INNER_PAD + 32)
  ctx.stroke()
  ctx.restore()
}

function drawRarityBadge(ctx: CanvasRenderingContext2D, rarity: RarityTier) {
  ctx.save()
  const text = rarity.name
  ctx.font = '700 13px system-ui'
  const tw = ctx.measureText(text).width
  const badgeW = tw + 20
  const badgeH = 26
  const bx = CARD_W - BORDER - INNER_PAD - badgeW - 8
  const by = BORDER + INNER_PAD + 8

  // Badge background
  ctx.fillStyle = rarity.color
  ctx.globalAlpha = 0.2
  roundRect(ctx, bx, by, badgeW, badgeH, 6)
  ctx.fill()
  ctx.globalAlpha = 1

  // Badge border
  ctx.strokeStyle = rarity.color
  ctx.lineWidth = 1.5
  roundRect(ctx, bx, by, badgeW, badgeH, 6)
  ctx.stroke()

  // Badge text
  ctx.fillStyle = rarity.textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, bx + badgeW / 2, by + badgeH / 2)
  ctx.restore()
}

function drawCharacterName(ctx: CanvasRenderingContext2D, card: TradingCard) {
  const nameY = CARD_H - IMAGE_BOTTOM - 10
  ctx.save()
  ctx.font = '800 32px system-ui'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'

  // Text shadow for readability
  ctx.shadowColor = 'rgba(0,0,0,0.8)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetY = 2
  ctx.fillText(card.character.name.toUpperCase(), CARD_W / 2, nameY)
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  ctx.restore()
}

function drawTokenCategory(ctx: CanvasRenderingContext2D, card: TradingCard) {
  const y = CARD_H - IMAGE_BOTTOM + 8
  ctx.save()
  ctx.font = '500 16px system-ui'
  ctx.fillStyle = card.rarity.textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(
    `${card.character.token}  ·  ${card.character.category.toUpperCase()}`,
    CARD_W / 2, y
  )
  ctx.restore()
}

function drawStatsBar(ctx: CanvasRenderingContext2D, card: TradingCard) {
  const stats = card.stats
  const labels = [
    ['STR', stats.strength],
    ['SPD', stats.speed],
    ['SKL', stats.skill],
    ['STA', stats.stamina],
    ['STL', stats.stealth],
    ['STY', stats.style],
  ] as const

  const startX = BORDER + INNER_PAD + 20
  const colW = (CARD_W - (BORDER + INNER_PAD) * 2 - 40) / 3
  const rowH = 65
  const baseY = STATS_Y + 40

  // Stats section background
  ctx.fillStyle = 'rgba(255,255,255,0.03)'
  roundRect(ctx, startX - 10, baseY - 20, CARD_W - (BORDER + INNER_PAD) * 2 - 20, rowH * 2 + 20, 8)
  ctx.fill()

  // Divider line
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(startX, baseY - 24)
  ctx.lineTo(CARD_W - startX, baseY - 24)
  ctx.stroke()

  // Tier badge
  ctx.save()
  ctx.font = '800 28px system-ui'
  ctx.fillStyle = card.rarity.textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(`TIER ${stats.tier}`, CARD_W / 2, STATS_Y + 2)

  // Total score (smaller, next to tier)
  ctx.font = '400 14px system-ui'
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.fillText(`(${stats.total}/594)`, CARD_W / 2, STATS_Y + 32)
  ctx.restore()

  for (let i = 0; i < 6; i++) {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = startX + col * colW
    const y = baseY + row * rowH

    const [label, value] = labels[i]

    // Stat label
    ctx.font = '600 12px system-ui'
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(label, x, y)

    // Stat value
    ctx.font = '800 28px system-ui'
    ctx.fillStyle = getStatColor(value)
    ctx.fillText(String(value), x, y + 14)

    // Stat bar
    const barW = colW - 20
    const barH = 4
    const barY = y + 48
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    roundRect(ctx, x, barY, barW, barH, 2)
    ctx.fill()

    ctx.fillStyle = getStatColor(value)
    ctx.globalAlpha = 0.7
    roundRect(ctx, x, barY, barW * (value / 99), barH, 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

function drawSerial(ctx: CanvasRenderingContext2D, card: TradingCard) {
  ctx.save()
  ctx.font = '500 12px monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.fillText(card.serial, CARD_W - BORDER - INNER_PAD - 12, CARD_H - BORDER - INNER_PAD - 8)

  // Series name on the left
  ctx.textAlign = 'left'
  ctx.fillText(card.series, BORDER + INNER_PAD + 12, CARD_H - BORDER - INNER_PAD - 8)
  ctx.restore()
}

function drawHologramStrip(ctx: CanvasRenderingContext2D, rarity: RarityTier) {
  const stripH = 6
  const y = IMAGE_TOP - 2

  // Animated-look hologram strip across top of image area
  const colors = rarity.name === 'LEGENDARY'
    ? ['#ffd700', '#ff6b6b', '#ffd700', '#00ff88', '#ffd700', '#ff6bff', '#ffd700']
    : ['#a855f7', '#6366f1', '#a855f7', '#ec4899', '#a855f7']

  const grad = ctx.createLinearGradient(BORDER, y, CARD_W - BORDER, y)
  for (let i = 0; i < colors.length; i++) {
    grad.addColorStop(i / (colors.length - 1), colors[i])
  }

  ctx.fillStyle = grad
  ctx.globalAlpha = 0.6
  ctx.fillRect(BORDER + INNER_PAD, y, CARD_W - (BORDER + INNER_PAD) * 2, stripH)
  ctx.globalAlpha = 1
}

// ─── Card Back Renderer ─────────────────────────────────

export async function renderCardBack(
  canvas: HTMLCanvasElement,
  card: TradingCard,
): Promise<void> {
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')!

  // Dark background
  ctx.fillStyle = '#0a0a0f'
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // Pattern grid
  ctx.strokeStyle = 'rgba(233,30,140,0.06)'
  ctx.lineWidth = 1
  for (let x = 0; x < CARD_W; x += 30) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, CARD_H)
    ctx.stroke()
  }
  for (let y = 0; y < CARD_H; y += 30) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(CARD_W, y)
    ctx.stroke()
  }

  // Border
  drawBorder(ctx, card.rarity)

  // Large NPGX logo center
  ctx.save()
  ctx.font = '800 72px system-ui'
  ctx.fillStyle = '#e91e8c'
  ctx.globalAlpha = 0.15
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('NPGX', CARD_W / 2, CARD_H / 2 - 80)
  ctx.globalAlpha = 1
  ctx.restore()

  // Character specialties
  ctx.font = '600 18px system-ui'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(card.character.name.toUpperCase(), CARD_W / 2, CARD_H / 2 - 10)

  ctx.font = '400 14px system-ui'
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillText(card.character.tagline, CARD_W / 2, CARD_H / 2 + 20)

  // Specialties list
  ctx.font = '500 14px system-ui'
  ctx.fillStyle = card.rarity.textColor
  card.character.specialties.forEach((spec, i) => {
    ctx.fillText(`▸ ${spec}`, CARD_W / 2, CARD_H / 2 + 60 + i * 24)
  })

  // Description
  ctx.font = '400 13px system-ui'
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  wrapText(ctx, card.character.description, CARD_W / 2, CARD_H / 2 + 140, CARD_W - 120, 18)

  // Serial at bottom
  drawSerial(ctx, card)
}

// ─── Export as PNG ────────────────────────────────────────

export function exportCardAsPNG(canvas: HTMLCanvasElement, filename: string) {
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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function getStatColor(value: number): string {
  if (value >= 85) return '#ffd700'  // gold
  if (value >= 70) return '#a855f7'  // purple
  if (value >= 50) return '#22d3ee'  // cyan
  if (value >= 30) return '#4ade80'  // green
  return '#9ca3af'                    // gray
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(' ')
  let line = ''
  let currentY = y

  for (const word of words) {
    const test = line + word + ' '
    if (ctx.measureText(test).width > maxWidth && line !== '') {
      ctx.fillText(line.trim(), x, currentY)
      line = word + ' '
      currentY += lineHeight
    } else {
      line = test
    }
  }
  if (line.trim()) ctx.fillText(line.trim(), x, currentY)
}
