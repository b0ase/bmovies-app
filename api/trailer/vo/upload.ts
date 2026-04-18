/**
 * POST /api/trailer/vo/upload
 *
 * Commissioner uploads their own VO MP3 (recorded themselves, or from a
 * human voice actor). Lands in Supabase storage bucket `bmovies-audio`
 * and becomes the new head `vo.trailer_narration` artifact; the old one
 * gets marked superseded.
 *
 * Accepts multipart/form-data with fields:
 *   offerId: string       — which offer to attach the VO to
 *   file:    File (MP3)   — the audio, under 5MB
 *
 * Uploaded VOs do NOT count against the 3-revision Grok/ElevenLabs limit
 * — a commissioner who's willing to record their own take shouldn't be
 * rate-limited on it.
 */

interface VercelRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
  formData?: () => Promise<FormData>
  arrayBuffer?: () => Promise<ArrayBuffer>
  body?: unknown
}
interface VercelResponse {
  status(code: number): VercelResponse
  json(body: unknown): VercelResponse
  setHeader(name: string, value: string): void
}
function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export const config = { api: { bodyParser: false } }

const MAX_BYTES = 5 * 1024 * 1024 // 5MB cap

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCors(res)
  if (req.method === 'OPTIONS') { res.status(204).json({}); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase not configured' })
    return
  }

  // Vercel node runtime gives us req.formData() on Edge/App-router style,
  // but classic /api functions pass body as a stream. Try formData first;
  // fall back to a raw multipart parse if needed.
  let offerId: string | undefined
  let fileBuf: Buffer | undefined
  let fileName = 'vo.mp3'
  let mime = 'audio/mpeg'

  if (typeof (req as unknown as { formData?: () => Promise<FormData> }).formData === 'function') {
    try {
      const form = await (req as unknown as { formData: () => Promise<FormData> }).formData()
      offerId = form.get('offerId')?.toString()
      const f = form.get('file') as File | null
      if (f) {
        fileBuf = Buffer.from(await f.arrayBuffer())
        fileName = f.name || fileName
        mime = f.type || mime
      }
    } catch (err) {
      console.warn('[vo/upload] formData parse failed:', err)
    }
  }

  if (!offerId) { res.status(400).json({ error: 'offerId required' }); return }
  if (!fileBuf) { res.status(400).json({ error: 'file required' }); return }
  if (fileBuf.length > MAX_BYTES) {
    res.status(413).json({ error: `file too large (max ${MAX_BYTES} bytes, got ${fileBuf.length})` })
    return
  }
  if (!/^audio\/(mpeg|mp3)$/.test(mime) && !/\.mp3$/i.test(fileName)) {
    res.status(400).json({ error: 'MP3 files only' })
    return
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

  // Verify the offer exists
  const { data: offer, error: offerErr } = await supabase
    .from('bct_offers')
    .select('id, title')
    .eq('id', offerId)
    .maybeSingle()
  if (offerErr || !offer) {
    res.status(404).json({ error: 'offer not found' })
    return
  }

  // Upload to Supabase storage
  const storagePath = `vo/${offerId}-user-${Date.now()}.mp3`
  const { data: uploaded, error: upErr } = await supabase.storage
    .from('bmovies-audio')
    .upload(storagePath, fileBuf, { contentType: 'audio/mpeg', upsert: false })
  if (upErr || !uploaded?.path) {
    console.error('[vo/upload] storage upload failed:', upErr)
    res.status(500).json({ error: `upload failed: ${upErr?.message || 'unknown'}` })
    return
  }
  const { data: pub } = supabase.storage.from('bmovies-audio').getPublicUrl(uploaded.path)
  const publicUrl = pub?.publicUrl
  if (!publicUrl) {
    res.status(500).json({ error: 'failed to get public URL for uploaded file' })
    return
  }

  // Insert new head artifact, mark old head(s) superseded.
  const { data: inserted, error: insertErr } = await supabase
    .from('bct_artifacts')
    .insert({
      offer_id: offerId,
      kind: 'audio',
      url: publicUrl,
      model: 'user-upload',
      prompt: `user-uploaded MP3 · ${fileName}`,
      payment_txid: `user-upload-${Date.now().toString(36)}`,
      role: 'vo',
      step_id: 'vo.trailer_narration',
    })
    .select('id')
    .single()
  if (insertErr || !inserted?.id) {
    console.error('[vo/upload] artifact insert failed:', insertErr)
    res.status(500).json({ error: 'artifact insert failed' })
    return
  }

  // Supersede old head narrations (any row that isn't the one we just inserted).
  await supabase
    .from('bct_artifacts')
    .update({ superseded_by: inserted.id })
    .eq('offer_id', offerId)
    .eq('step_id', 'vo.trailer_narration')
    .is('superseded_by', null)
    .neq('id', inserted.id)

  res.status(200).json({
    ok: true,
    artifactId: inserted.id,
    url: publicUrl,
  })
}
