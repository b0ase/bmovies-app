/**
 * GET /api/agent/install?slug=luna-cyberblade
 *
 * Download a character's agent manifest for installation on a ClawMiner phone.
 * This is the product endpoint — phones call this to install an agent.
 *
 * Query params:
 *   slug     — Character slug (required)
 *
 * GET /api/agent/install (no slug)
 *   Returns the full catalogue of available agents.
 *
 * Response: AgentManifest JSON (self-contained, installable)
 */

import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { SOUL_SLUGS, type SoulSlug } from '@/lib/souls'
import { buildManifest } from '@/lib/agents/manifest'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')

  // No slug = return catalogue
  if (!slug) {
    const catalogue = SOUL_SLUGS.map(s => {
      try {
        const soulPath = join(process.cwd(), 'public', 'souls', `${s}.json`)
        const soul = JSON.parse(readFileSync(soulPath, 'utf-8'))
        return {
          slug: s,
          name: soul.identity.name,
          token: soul.identity.token,
          letter: soul.identity.letter,
          tagline: soul.identity.tagline,
          genre: soul.music?.genre,
          aesthetic: soul.style?.aesthetic,
          avatar: `/content/${s}/images/avatar/avatar.png`,
          installUrl: `/api/agent/install?slug=${s}`,
        }
      } catch {
        return null
      }
    }).filter(Boolean)

    return NextResponse.json({
      $schema: 'openclaw-catalogue/1.0',
      agents: catalogue,
      count: catalogue.length,
      installInstructions: 'GET /api/agent/install?slug=<slug> to download the full agent manifest.',
    })
  }

  // Validate slug
  if (!SOUL_SLUGS.includes(slug as SoulSlug)) {
    return NextResponse.json({ error: `Unknown agent: ${slug}` }, { status: 404 })
  }

  // Try pre-built manifest first (faster)
  const prebuiltPath = join(process.cwd(), 'public', 'agents', `${slug}.agent.json`)
  if (existsSync(prebuiltPath)) {
    const manifest = JSON.parse(readFileSync(prebuiltPath, 'utf-8'))
    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Slug': slug,
        'X-Agent-Version': manifest.version,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }

  // Build on the fly if no pre-built manifest
  try {
    const soulPath = join(process.cwd(), 'public', 'souls', `${slug}.json`)
    const soul = JSON.parse(readFileSync(soulPath, 'utf-8'))
    const manifest = buildManifest(slug, soul)

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Slug': slug,
        'X-Agent-Version': manifest.version,
        'X-Agent-Built': 'on-demand',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to build agent manifest: ${err instanceof Error ? err.message : err}` },
      { status: 500 },
    )
  }
}
