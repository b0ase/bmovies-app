import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import {
  type GenerationDNA,
  type TapeEntry,
  buildTape,
  hashContent,
  buildInscriptionPayload,
  generateId,
  calculateRevenueSplit,
  GENERATION_COSTS,
} from '@/lib/generation-dna'

export const maxDuration = 30

/**
 * POST /api/generation
 *
 * Create a new generation record with DNA lineage.
 * Each generation extends the tape from its parent.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      parentId,
      characterSlug,
      contentType,
      prompt,
      contentUrl,
      creatorAddress,
      model,
      provider,
      width,
      height,
      duration,
    } = body

    if (!characterSlug || !contentType || !prompt || !contentUrl) {
      return NextResponse.json(
        { error: 'characterSlug, contentType, prompt, and contentUrl required' },
        { status: 400 },
      )
    }

    const id = generateId()
    const timestamp = new Date().toISOString()
    const contentHash = hashContent(contentUrl)
    const cost = GENERATION_COSTS[contentType] || 1

    // Build the tape — fetch parent's tape if this is a child generation
    let parentTape: TapeEntry[] = []
    let rootId = id

    if (parentId && supabase) {
      const { data: parent } = await supabase
        .from('npgx_generations')
        .select('root_id, tape')
        .eq('id', parentId)
        .single()

      if (parent) {
        parentTape = (parent.tape as TapeEntry[]) || []
        rootId = parent.root_id || parentId
      }
    }

    const tape = buildTape(parentTape, { id, prompt, contentType, timestamp })

    const generation: GenerationDNA = {
      id,
      parentId: parentId || null,
      rootId,
      characterSlug,
      contentType,
      prompt,
      contentHash,
      contentUrl,
      creatorAddress: creatorAddress || undefined,
      cost,
      timestamp,
      model: model || 'unknown',
      provider: provider || 'unknown',
      width: width || 1024,
      height: height || 1536,
      duration: duration || undefined,
      tape,
    }

    // Build inscription payload
    const inscription = buildInscriptionPayload(generation)
    const revenue = calculateRevenueSplit(generation)

    // Store in Supabase if available
    if (supabase) {
      const { error } = await supabase.from('npgx_generations').insert({
        id,
        parent_id: generation.parentId,
        root_id: generation.rootId,
        character_slug: characterSlug,
        content_type: contentType,
        prompt,
        content_hash: contentHash,
        content_url: contentUrl,
        creator_address: creatorAddress || null,
        cost,
        model: generation.model,
        provider: generation.provider,
        width: generation.width,
        height: generation.height,
        duration: generation.duration || null,
        tape,
        tape_depth: tape.length,
        inscription_payload: inscription,
        platform_share: revenue.platformShare,
        creator_share: revenue.creatorShare,
      })

      if (error) {
        console.warn('[generation] Supabase insert failed:', error.message)
        // Don't fail — the generation record is still valid locally
      }
    }

    return NextResponse.json({
      success: true,
      generation: {
        id: generation.id,
        parentId: generation.parentId,
        rootId: generation.rootId,
        characterSlug: generation.characterSlug,
        contentType: generation.contentType,
        contentHash: generation.contentHash,
        cost: generation.cost,
        tapeDepth: tape.length,
        inscription,
        revenue,
      },
      // Return the tape for the client to use in subsequent generations
      tape,
    })
  } catch (e) {
    console.error('[generation] Error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Generation record failed' },
      { status: 500 },
    )
  }
}

/**
 * GET /api/generation?id=xxx — Get a single generation
 * GET /api/generation?root=xxx — Get full lineage from a root
 * GET /api/generation?slug=xxx — Get all generations for a character
 * GET /api/generation?creator=xxx — Get all generations by a creator
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const rootId = req.nextUrl.searchParams.get('root')
  const slug = req.nextUrl.searchParams.get('slug')
  const creator = req.nextUrl.searchParams.get('creator')

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    // Single generation by ID
    if (id) {
      const { data, error } = await supabase
        .from('npgx_generations')
        .select('*')
        .eq('id', id)
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 404 })
      return NextResponse.json({ generation: data })
    }

    // Full lineage from root
    if (rootId) {
      const { data, error } = await supabase
        .from('npgx_generations')
        .select('*')
        .eq('root_id', rootId)
        .order('created_at', { ascending: true })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const totalCost = (data || []).reduce((sum: number, g: any) => sum + (g.cost || 0), 0)
      return NextResponse.json({
        lineage: data || [],
        depth: data?.length || 0,
        totalCost,
        rootId,
      })
    }

    // By character slug
    if (slug) {
      const { data, error } = await supabase
        .from('npgx_generations')
        .select('*')
        .eq('character_slug', slug)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ generations: data || [], count: data?.length || 0 })
    }

    // By creator address
    if (creator) {
      const { data, error } = await supabase
        .from('npgx_generations')
        .select('*')
        .eq('creator_address', creator)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ generations: data || [], count: data?.length || 0 })
    }

    return NextResponse.json({ error: 'Provide id, root, slug, or creator parameter' }, { status: 400 })
  } catch (e) {
    console.error('[generation] GET error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Query failed' },
      { status: 500 },
    )
  }
}
