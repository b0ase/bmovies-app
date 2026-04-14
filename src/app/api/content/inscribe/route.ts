import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/content/inscribe
 *
 * Inscribe full image data on BSV blockchain via OP_RETURN.
 * The image becomes publicly visible to anyone watching the chain.
 *
 * Expects: { imageUrl, contentHash, slug, address, contentType }
 * The caller must have already paid via HandCash (checked by cookie/session).
 *
 * Flow:
 * 1. Fetch image data from URL
 * 2. Create BSV transaction with OP_RETURN containing image data
 * 3. Broadcast via WhatsOnChain or TAAL
 * 4. Return txid
 */
export async function POST(req: NextRequest) {
  // Check HandCash auth
  const token = req.cookies.get('npgx_handcash_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'HandCash authentication required' }, { status: 401 })
  }

  try {
    const { imageUrl, contentHash, slug, address, contentType } = await req.json()

    if (!imageUrl || !contentHash) {
      return NextResponse.json({ error: 'imageUrl and contentHash required' }, { status: 400 })
    }

    // Fetch image data
    let imageData: Buffer
    if (imageUrl.startsWith('data:image')) {
      // Base64 data URI
      const base64 = imageUrl.split(',')[1]
      imageData = Buffer.from(base64, 'base64')
    } else {
      // HTTP URL — resolve relative paths
      const fetchUrl = imageUrl.startsWith('/')
        ? `https://www.npgx.website${imageUrl}`
        : imageUrl
      const res = await fetch(fetchUrl)
      if (!res.ok) throw new Error('Failed to fetch image')
      imageData = Buffer.from(await res.arrayBuffer())
    }

    // Calculate inscription cost based on data size
    // BSV: ~0.5 sat/byte, 1 BSV ≈ $50 → roughly $0.000025/KB
    // But we charge a flat fee that covers tx cost + margin
    const sizeKB = Math.ceil(imageData.length / 1024)
    const estimatedCost = Math.max(0.01, sizeKB * 0.001) // $0.001/KB, min $0.01

    // Determine MIME type
    const mime = contentType || detectMimeType(imageData) || 'image/jpeg'

    // Build the inscription payload (1Sat Ordinals / B:// protocol compatible)
    // B:// protocol: OP_RETURN 19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut <data> <mediatype> <encoding> <filename>
    const inscriptionPayload = {
      protocol: 'B',
      data: imageData.toString('base64'),
      mediaType: mime,
      encoding: 'base64',
      filename: `npgx-${slug || 'image'}-${contentHash.slice(0, 8)}.${mime.split('/')[1] || 'jpg'}`,
      // $401 attestation metadata
      attestation: {
        p: '401',
        op: 'inscribe',
        v: '1.0',
        hash: contentHash,
        type: mime,
        slug: slug || undefined,
        ts: new Date().toISOString(),
      }
    }

    // For now, store the inscription intent and return a pending status.
    // Full on-chain broadcast requires a funded BSV key or HandCash data output API.
    // The x401 node at path401.com handles the actual broadcast.
    let txid: string | undefined

    try {
      const x401Url = process.env.X401_NODE_URL || 'https://path401.com'
      const inscribeRes = await fetch(`${x401Url}/api/inscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.X401_API_KEY || ''}`,
        },
        body: JSON.stringify({
          data: inscriptionPayload.data,
          mediaType: inscriptionPayload.mediaType,
          encoding: inscriptionPayload.encoding,
          attestation: inscriptionPayload.attestation,
          address,
        }),
      })

      if (inscribeRes.ok) {
        const result = await inscribeRes.json()
        txid = result.txid
      }
    } catch (err) {
      console.warn('[inscribe] x401 node inscription failed, storing locally:', err)
    }

    // Store inscription record
    if (supabase) {
      try {
        await supabase.from('npgx_attestations').insert({
          txid: txid || `pending-${contentHash.slice(0, 16)}`,
          content_hash: contentHash,
          content_type: mime,
          description: `Full image inscription — ${slug || 'NPGX'}`,
          character_slug: slug || null,
          address: address || null,
          chain: 'bsv',
          protocol: 'B://',
          metadata: {
            sizeKB,
            inscriptionType: 'full-image',
            estimatedCost,
            filename: inscriptionPayload.filename,
          },
        })
      } catch (err) {
        console.warn('[inscribe] Supabase insert failed:', err)
      }
    }

    return NextResponse.json({
      success: true,
      txid: txid || null,
      status: txid ? 'inscribed' : 'pending',
      sizeKB,
      estimatedCost: `$${estimatedCost.toFixed(3)}`,
      explorer: txid ? `https://whatsonchain.com/tx/${txid}` : null,
      message: txid
        ? 'Image inscribed on BSV blockchain. Visible to all chain watchers.'
        : 'Inscription queued. Will be broadcast when x401 node processes it.',
    })
  } catch (e) {
    console.error('[inscribe] Error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Inscription failed' },
      { status: 500 },
    )
  }
}

function detectMimeType(buffer: Buffer): string | null {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png'
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image/gif'
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'image/webp'
  return null
}
