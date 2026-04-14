// POST /api/produce — "Spa Treatment" One Shot production endpoint
// Orchestrates ALL generation APIs into a single package:
// Photoshoot → Screenplay → Video Production → Theme Song → Magazine → Trading Cards
//
// Body: { slug, format?, brief? }
// Returns: streaming NDJSON progress + final production summary
//
// CRITICAL FIX (2026-03-13): Every stage now saves to database incrementally.
// If the stream cuts (Vercel timeout), content is NOT lost.
// Productions are recoverable via GET /api/produce?id=xxx

import { NextRequest, NextResponse } from 'next/server'
import { ROSTER_BY_SLUG } from '@/lib/npgx-roster'
import { loadSoul } from '@/lib/souls'
import { saveContent, saveProduction, updateProduction, type ContentItem as StoreContentItem } from '@/lib/content-store'

export const maxDuration = 300 // 5 min Vercel limit

// ── House style + shot configs ──────────────────────────────────────

const HOUSE_STYLE = 'photorealistic photograph, saturated colors against dark shadows, red and pink neon lighting wash, vignette, smoke, sweat on face, confrontational eye contact, mouth open tongue out or dirty knowing smile, heavy dark makeup black lipstick dramatic false lashes, face piercings dermal studs, visible tattoos everywhere, punk attitude rude energy, natural skin texture with subtle pores and light freckles, healthy glowing skin, oily skin catching light, film grain ISO 800, chromatic aberration, shallow depth of field bokeh, shot on Canon EOS R5 85mm f1.4 wide open, editorial fashion photography, not anime not cartoon not illustration not 3d render not airbrushed not glossy not HDR, 8k quality'

const SHOT_CONFIGS = [
  {
    type: 'Portrait',
    build: (soulPrompt: string) =>
      `${soulPrompt}, straight-on eye-level close-up, unflinching direct stare into lens, intimate, dark industrial warehouse, red neon strip lights, smoke machine haze, pigtails with pink ribbons punk undercut, huge thigh-length high heeled black PVC platform boots, tiny black latex micro g-string, heavy gold chain necklace, spiked collar choker, ${HOUSE_STYLE}`,
  },
  {
    type: 'Action Shot',
    build: (soulPrompt: string) =>
      `${soulPrompt}, low angle looking up at her, she towers over camera, dominant and powerful, neon-lit Tokyo alleyway at night rain-wet ground reflecting pink and red light, wild mohawk spiked up shaved sides, thigh-high black patent stiletto boots with buckles, black PVC harness bikini, latex fingerless gloves, layered gold chains, gas mask hanging around neck, ${HOUSE_STYLE}`,
  },
  {
    type: 'Poster',
    build: (soulPrompt: string) =>
      `${soulPrompt}, fisheye lens extreme close-up face filling frame lens distortion, black studio background single harsh red spotlight from above total darkness around edges, long black hair with neon pink streaks messy and wild, massive black platform PVC boots, black bondage tape criss-crossing barely covering, gold body chains draped everywhere, diamond collar, heavy latex fetish mask covering lower face ninja mask, ${HOUSE_STYLE}`,
  },
]

// ── Types ───────────────────────────────────────────────────────────

interface ContentItem {
  step: string
  type: string
  url?: string
  data?: unknown
  error?: string
}

interface SpaProduction {
  id: string
  slug: string
  character: string
  format: string
  brief?: string
  userHandle?: string
  content: ContentItem[]
  errors: string[]
  createdAt: string
}

// ── Helpers ─────────────────────────────────────────────────────────

type Send = (stage: string, detail: string) => void

async function callApi(origin: string, path: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${origin}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Save a content item to the database (fire-and-forget, never blocks pipeline) */
async function persistContent(
  slug: string,
  productionId: string,
  type: StoreContentItem['type'],
  title: string,
  item: ContentItem,
  cost: number,
  userHandle?: string | null,
): Promise<string | null> {
  try {
    const saved = await saveContent({
      slug,
      type,
      title,
      provider: 'produce-pipeline',
      status: item.error ? 'error' : 'done',
      url: item.url,
      data: item.data as Record<string, unknown> | undefined,
      cost,
      productionId,
      userHandle: userHandle || undefined,
      error: item.error,
    })
    return saved.id
  } catch (err) {
    console.warn(`[produce] Failed to persist ${type}:`, err)
    return null
  }
}

// ── Step runners ────────────────────────────────────────────────────

async function runPhotoshoot(
  origin: string,
  slug: string,
  soulPrompt: string,
  send: Send,
): Promise<ContentItem[]> {
  const items: ContentItem[] = []

  for (let i = 0; i < SHOT_CONFIGS.length; i++) {
    const shot = SHOT_CONFIGS[i]
    send('photoshoot', `Shooting ${shot.type} (${i + 1}/3)...`)

    try {
      const res = await callApi(origin, '/api/generate-image-npgx', {
        slug,
        prompt: shot.build(soulPrompt),
        width: 1024,
        height: 1536,
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => `HTTP ${res.status}`)
        items.push({ step: 'photoshoot', type: shot.type, error: `API ${res.status}: ${errText.slice(0, 200)}` })
        send('photoshoot', `${shot.type} failed: API ${res.status}`)
        continue
      }
      const data = await res.json()
      if (data.imageUrl) {
        items.push({ step: 'photoshoot', type: shot.type, url: data.imageUrl })
        send('photoshoot', `${shot.type} complete`)
      } else {
        items.push({ step: 'photoshoot', type: shot.type, error: data.error || 'No image returned' })
        send('photoshoot', `${shot.type} failed: ${data.error || 'no image'}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'fetch failed'
      items.push({ step: 'photoshoot', type: shot.type, error: msg })
      send('photoshoot', `${shot.type} error: ${msg}`)
    }
  }

  return items
}

async function runScreenplay(
  origin: string,
  character: { name: string; persona?: string; backstory?: string },
  brief: string | undefined,
  send: Send,
): Promise<ContentItem> {
  send('screenplay', 'Writing screenplay...')
  try {
    const res = await callApi(origin, '/api/generate-script', { character, brief })
    if (!res.ok) {
      return { step: 'screenplay', type: 'script', error: `API ${res.status}` }
    }
    const data = await res.json()
    send('screenplay', 'Screenplay complete')
    return { step: 'screenplay', type: 'script', data }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'fetch failed'
    send('screenplay', `Screenplay error: ${msg}`)
    return { step: 'screenplay', type: 'script', error: msg }
  }
}

async function runVideoProduction(
  origin: string,
  slug: string,
  character: { name: string },
  images: ContentItem[],
  send: Send,
): Promise<ContentItem[]> {
  const items: ContentItem[] = []
  const successImages = images.filter(i => i.url && !i.error)

  if (successImages.length === 0) {
    send('video', 'No photoshoot images — generating from prompt only')
    try {
      const res = await callApi(origin, '/api/generate-video', {
        slug,
        character: { name: character.name },
        prompt: `${character.name}, cinematic action sequence, neon-lit Tokyo, dramatic lighting`,
      })
      if (!res.ok) {
        items.push({ step: 'video', type: 'clip', error: `API ${res.status}` })
      } else {
        const data = await res.json()
        items.push({ step: 'video', type: 'clip', data, url: data.videoUrl })
      }
      send('video', 'Video clip generated')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'fetch failed'
      items.push({ step: 'video', type: 'clip', error: msg })
      send('video', `Video error: ${msg}`)
    }
    return items
  }

  for (let i = 0; i < successImages.length; i++) {
    const img = successImages[i]
    send('video', `Generating video ${i + 1}/${successImages.length} from ${img.type}...`)
    try {
      const res = await callApi(origin, '/api/generate-video', {
        slug,
        character: { name: character.name },
        imageUrl: img.url,
        prompt: `${character.name}, cinematic movement, slow dramatic motion`,
      })
      if (!res.ok) {
        items.push({ step: 'video', type: `clip-${img.type}`, error: `API ${res.status}` })
        send('video', `Video ${i + 1} failed: API ${res.status}`)
      } else {
        const data = await res.json()
        items.push({ step: 'video', type: `clip-${img.type}`, data, url: data.videoUrl })
        send('video', `Video ${i + 1} complete`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'fetch failed'
      items.push({ step: 'video', type: `clip-${img.type}`, error: msg })
      send('video', `Video ${i + 1} error: ${msg}`)
    }
  }

  return items
}

async function runThemeSong(
  origin: string,
  character: { name: string; persona?: string },
  send: Send,
): Promise<ContentItem> {
  send('theme-song', 'Composing theme song...')
  try {
    const res = await callApi(origin, '/api/generate-song', { character })
    if (!res.ok) {
      send('theme-song', `Theme song failed: API ${res.status}`)
      return { step: 'theme-song', type: 'song', error: `API ${res.status}` }
    }
    const data = await res.json()
    send('theme-song', 'Theme song complete')
    return { step: 'theme-song', type: 'song', data, url: data.audioUrl || data.url }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'fetch failed'
    send('theme-song', `Theme song error: ${msg}`)
    return { step: 'theme-song', type: 'song', error: msg }
  }
}

async function runMagazine(
  origin: string,
  slug: string,
  send: Send,
): Promise<ContentItem> {
  send('magazine', 'Generating magazine issue...')
  try {
    const res = await callApi(origin, '/api/magazine/generate-canonical', { slug })
    if (!res.ok) {
      send('magazine', `Magazine failed: API ${res.status}`)
      return { step: 'magazine', type: 'issue', error: `API ${res.status}` }
    }
    const data = await res.json()
    send('magazine', 'Magazine issue complete')
    return { step: 'magazine', type: 'issue', data }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'fetch failed'
    send('magazine', `Magazine error: ${msg}`)
    return { step: 'magazine', type: 'issue', error: msg }
  }
}

async function runTradingCards(
  origin: string,
  slug: string,
  send: Send,
): Promise<ContentItem> {
  send('trading-cards', 'Generating trading cards...')
  try {
    const res = await callApi(origin, '/api/cards/generate', { slug })
    if (!res.ok) {
      send('trading-cards', `Cards failed: API ${res.status}`)
      return { step: 'trading-cards', type: 'cards', error: `API ${res.status}` }
    }
    const data = await res.json()
    send('trading-cards', 'Trading cards complete')
    return { step: 'trading-cards', type: 'cards', data }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'fetch failed'
    send('trading-cards', `Trading cards error: ${msg}`)
    return { step: 'trading-cards', type: 'cards', error: msg }
  }
}

// ── Main route ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // $402 paywall — full production costs 2000 sats (~$1)
  const { checkPaywall } = await import('@/lib/paywall')
  const { response: paywallResponse } = await checkPaywall(req, 'full-produce')
  if (paywallResponse) return paywallResponse

  try {
    const body = await req.json()
    const { slug, format = 'short-film', brief } = body

    if (!slug) {
      return NextResponse.json({ error: 'slug required' }, { status: 400 })
    }

    const character = ROSTER_BY_SLUG[slug]
    if (!character) {
      return NextResponse.json({ error: `Unknown character: ${slug}` }, { status: 400 })
    }

    // Get user handle from cookie (for tying production to user account)
    const userHandle = req.cookies.get('npgx_user_handle')?.value || null

    const origin = new URL(req.url).origin

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send: Send = (stage, detail) => {
          try {
            const line = JSON.stringify({ type: 'progress', stage, detail }) + '\n'
            controller.enqueue(encoder.encode(line))
          } catch {
            // Stream may have closed — ignore
          }
        }

        // ── Create production record FIRST (survives timeouts) ──
        let production: Awaited<ReturnType<typeof saveProduction>>
        try {
          production = await saveProduction({
            slug,
            status: 'running',
            format,
            brief,
            items: [],
            totalCost: 0,
            errors: [],
            userHandle: userHandle || undefined,
          })
        } catch (err) {
          // Even if DB save fails, continue with in-memory ID
          production = {
            id: `prod-${slug}-${Date.now()}`,
            slug,
            status: 'running',
            format,
            brief,
            items: [],
            totalCost: 0,
            errors: [],
            createdAt: new Date().toISOString(),
          }
        }

        const productionId = production.id
        const allContent: ContentItem[] = []
        const contentIds: string[] = []
        const errors: string[] = []
        let totalCost = 0

        send('director', `Starting production for ${character.name}...`)
        send('director', `Production ID: ${productionId}`)
        if (userHandle) send('director', `User: ${userHandle}`)

        // Load soul prompt
        let soulPrompt = `${character.name}, young Japanese woman, slim, tattooed, edgy punk attitude, seductive`
        try {
          const soul = await loadSoul(slug)
          if (soul?.generation?.promptPrefix) {
            soulPrompt = soul.generation.promptPrefix
          }
        } catch {
          send('director', 'Soul data not found, using default prompt')
        }

        // ── Step 1: PHOTOSHOOT (3 images) ───────────────────────
        send('director', '1/6 PHOTOSHOOT — 3 editorial shots')
        const photos = await runPhotoshoot(origin, slug, soulPrompt, send)
        allContent.push(...photos)
        for (const photo of photos) {
          if (photo.error) errors.push(`photoshoot/${photo.type}: ${photo.error}`)
          const id = await persistContent(slug, productionId, 'image', `${character.name} — ${photo.type}`, photo, photo.error ? 0 : 0.01, userHandle)
          if (id) contentIds.push(id)
          totalCost += photo.error ? 0 : 0.01
        }
        // Incremental save
        try { await updateProduction(productionId, { items: contentIds, totalCost, errors }) } catch {}

        // ── Step 2: SCREENPLAY ──────────────────────────────────
        send('director', '2/6 SCREENPLAY — writing script')
        const screenplay = await runScreenplay(origin, character, brief, send)
        allContent.push(screenplay)
        if (screenplay.error) errors.push(`screenplay: ${screenplay.error}`)
        const scriptId = await persistContent(slug, productionId, 'script', `${character.name} — Screenplay`, screenplay, 0, userHandle)
        if (scriptId) contentIds.push(scriptId)
        try { await updateProduction(productionId, { items: contentIds, errors }) } catch {}

        // ── Step 3: VIDEO PRODUCTION ────────────────────────────
        send('director', '3/6 VIDEO PRODUCTION — generating clips')
        const videos = await runVideoProduction(origin, slug, character, photos, send)
        allContent.push(...videos)
        for (const video of videos) {
          if (video.error) errors.push(`video/${video.type}: ${video.error}`)
          const id = await persistContent(slug, productionId, 'video', `${character.name} — ${video.type}`, video, video.error ? 0 : 0.04, userHandle)
          if (id) contentIds.push(id)
          totalCost += video.error ? 0 : 0.04
        }
        try { await updateProduction(productionId, { items: contentIds, totalCost, errors }) } catch {}

        // ── Step 4: THEME SONG ──────────────────────────────────
        send('director', '4/6 THEME SONG — composing music')
        const song = await runThemeSong(origin, character, send)
        allContent.push(song)
        if (song.error) errors.push(`theme-song: ${song.error}`)
        const songId = await persistContent(slug, productionId, 'song', `${character.name} — Theme Song`, song, song.error ? 0 : 0.07, userHandle)
        if (songId) contentIds.push(songId)
        totalCost += song.error ? 0 : 0.07
        try { await updateProduction(productionId, { items: contentIds, totalCost, errors }) } catch {}

        // ── Step 5: MAGAZINE ────────────────────────────────────
        send('director', '5/6 MAGAZINE — generating issue')
        const magazine = await runMagazine(origin, slug, send)
        allContent.push(magazine)
        if (magazine.error) errors.push(`magazine: ${magazine.error}`)
        const magId = await persistContent(slug, productionId, 'magazine', `${character.name} — Magazine Issue`, magazine, magazine.error ? 0 : 0.08, userHandle)
        if (magId) contentIds.push(magId)
        totalCost += magazine.error ? 0 : 0.08
        try { await updateProduction(productionId, { items: contentIds, totalCost, errors }) } catch {}

        // ── Step 6: TRADING CARDS ───────────────────────────────
        send('director', '6/6 TRADING CARDS — minting cards')
        const cards = await runTradingCards(origin, slug, send)
        allContent.push(cards)
        if (cards.error) errors.push(`trading-cards: ${cards.error}`)
        const cardId = await persistContent(slug, productionId, 'card', `${character.name} — Trading Cards`, cards, cards.error ? 0 : 0.01, userHandle)
        if (cardId) contentIds.push(cardId)
        totalCost += cards.error ? 0 : 0.01

        // ── Mark production complete ────────────────────────────
        try {
          await updateProduction(productionId, {
            status: errors.length > 0 ? 'error' : 'done',
            items: contentIds,
            totalCost,
            errors,
            completedAt: new Date().toISOString(),
          })
        } catch {}

        // ── Assemble final response ─────────────────────────────
        const finalProduction: SpaProduction = {
          id: productionId,
          slug,
          character: character.name,
          format,
          brief,
          userHandle: userHandle || undefined,
          content: allContent,
          errors,
          createdAt: production.createdAt,
        }

        const successCount = allContent.filter(c => !c.error).length
        const totalCount = allContent.length
        send('director', `Production complete: ${successCount}/${totalCount} items, ${errors.length} errors, $${totalCost.toFixed(2)} cost`)

        try {
          const finalLine = JSON.stringify({ type: 'complete', production: finalProduction }) + '\n'
          controller.enqueue(encoder.encode(finalLine))
          controller.close()
        } catch {
          // Stream already closed (timeout) — production is saved in DB regardless
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

// ── GET: Recover a production by ID ──────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id parameter required' }, { status: 400 })
  }

  try {
    const { getProduction, getContentByProduction } = await import('@/lib/content-store')
    const production = await getProduction(id)
    if (!production) {
      return NextResponse.json({ error: 'Production not found' }, { status: 404 })
    }

    const content = await getContentByProduction(id)
    return NextResponse.json({
      success: true,
      production,
      content,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch production' },
      { status: 500 },
    )
  }
}
