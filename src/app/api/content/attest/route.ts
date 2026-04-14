import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/content/attest
 *
 * Stores an on-chain content attestation record.
 * Called after client-side BRC-100 wallet signs content hash to chain.
 */
export async function POST(req: NextRequest) {
  try {
    const { txid, contentHash, contentType, description, slug, address } = await req.json()

    if (!txid || !contentHash) {
      return NextResponse.json({ error: 'txid and contentHash required' }, { status: 400 })
    }

    // Store in Supabase if available
    if (supabase) {
      const { error } = await supabase.from('npgx_attestations').insert({
        txid,
        content_hash: contentHash,
        content_type: contentType || 'image',
        description: description || '',
        character_slug: slug || null,
        address: address || null,
        chain: 'bsv',
        protocol: '$401',
      })

      if (error) {
        console.warn('[attest] Supabase insert failed:', error.message)
        // Don't fail the request — the on-chain record is what matters
      }
    }

    return NextResponse.json({
      success: true,
      txid,
      contentHash,
      explorer: `https://whatsonchain.com/tx/${txid}`,
    })
  } catch (e) {
    console.error('[attest] Error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Attestation storage failed' },
      { status: 500 },
    )
  }
}

/**
 * GET /api/content/attest?hash=abc123
 *
 * Look up attestation by content hash.
 */
export async function GET(req: NextRequest) {
  const hash = req.nextUrl.searchParams.get('hash')
  const slug = req.nextUrl.searchParams.get('slug')

  if (!hash && !slug) {
    return NextResponse.json({ error: 'hash or slug required' }, { status: 400 })
  }

  if (!supabase) {
    return NextResponse.json({ attestations: [], message: 'Database not configured' })
  }

  let query = supabase.from('npgx_attestations').select('*').order('created_at', { ascending: false })

  if (hash) query = query.eq('content_hash', hash)
  if (slug) query = query.eq('character_slug', slug)

  const { data, error } = await query.limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ attestations: data || [] })
}
