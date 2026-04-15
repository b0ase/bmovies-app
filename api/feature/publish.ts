/**
 * POST /api/feature/publish
 *
 * Flip a feature offer from `draft` to `published`. Called when the
 * commissioner is happy with the current version and wants to ship.
 *
 * Effect:
 *   - status = 'published'
 *   - presale_open = false
 *   - published_at = now()
 *   - Logs a producer.premiere row to bct_step_log
 *   - The film starts appearing on /watch.html
 *
 * Auto-publish (when revision_deadline elapses) is handled separately by
 * the cron worker's `autoPublishExpiredDrafts()` loop.
 *
 * Request body:
 *   { offerId: string, accountId?: string }
 *
 * Response (200):
 *   { ok: true, offerId, publishedAt }
 */

interface VercelRequest {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  setHeader(name: string, value: string): void;
}

function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase env vars missing' });
    return;
  }

  let body: { offerId?: string; accountId?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const offerId = body.offerId?.trim();
  if (!offerId) {
    res.status(400).json({ error: 'offerId required' });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { data: offer } = await supabase
    .from('bct_offers')
    .select('id, title, status, account_id')
    .eq('id', offerId)
    .maybeSingle();

  if (!offer) {
    res.status(404).json({ error: 'offer not found' });
    return;
  }

  if (offer.status !== 'draft') {
    res.status(409).json({ error: `offer is in status "${offer.status}", only "draft" can be published` });
    return;
  }

  // Soft auth — if a commissioner exists on the offer, accountId must match
  if (body.accountId && offer.account_id && body.accountId !== offer.account_id) {
    res.status(403).json({ error: 'only the commissioner can publish' });
    return;
  }

  const publishedAt = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from('bct_offers')
    .update({
      status: 'published',
      published_at: publishedAt,
      presale_open: false,
    })
    .eq('id', offerId);

  if (updateErr) {
    console.error('[feature/publish] update failed:', updateErr);
    res.status(500).json({ error: 'failed to publish', detail: updateErr.message });
    return;
  }

  await supabase.from('bct_step_log').insert({
    offer_id: offerId,
    step_id: 'producer.premiere',
    agent_id: 'producer',
    status: 'completed',
    message: 'commissioner published — film is live on /watch.html',
  });

  console.log(`[feature/publish] offer=${offerId} title="${offer.title}" → published`);

  res.status(200).json({
    ok: true,
    offerId,
    publishedAt,
    watchUrl: `https://bmovies.online/film.html?id=${encodeURIComponent(offerId)}`,
  });
}
