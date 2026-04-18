/**
 * POST /api/deck/pin
 *
 * Freezes the current state of a project's investor deck into a
 * bct_deck_snapshots row. Every call auto-increments the version for
 * that (offer_id, kind) pair.
 *
 * Why: /deck.html?id=X is always LIVE — it re-reads bct_offers +
 * bct_artifacts on every load, so the deck you downloaded yesterday
 * differs from the one you download today. When the commissioner
 * sends a deck to an exec, they want to know what the exec saw.
 * Pinning a version captures a point-in-time snapshot that's stable
 * forever at /deck.html?v=<share_token>.
 *
 * Body:
 *   offerId : string
 *   kind    : 'deck' | 'pack'   (default 'deck')
 *   note    : string?           (optional commissioner label, e.g.
 *                                "Sent to Aster, 2026-04-18")
 *
 * Response:
 *   { version, share_token, pinned_at }
 *
 * Auth: Bearer Supabase JWT. Must be the commissioner of the offer.
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function randToken(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
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

  let body: { offerId?: string; kind?: 'deck' | 'pack'; note?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const offerId = body.offerId?.trim();
  const kind = body.kind === 'pack' ? 'pack' : 'deck';
  const note = (body.note || '').slice(0, 200) || null;
  if (!offerId) {
    res.status(400).json({ error: 'offerId required' });
    return;
  }

  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!bearer) {
    res.status(401).json({ error: 'Bearer token required' });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const { data: userData, error: userErr } = await supabase.auth.getUser(bearer);
  if (userErr || !userData?.user) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  // Ownership check — only the commissioner can pin a snapshot.
  const { data: acctRow } = await supabase
    .from('bct_accounts')
    .select('id')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle();
  const accountId = acctRow?.id as string | undefined;
  if (!accountId) {
    res.status(403).json({ error: 'No bMovies account' });
    return;
  }

  const { data: offer } = await supabase
    .from('bct_offers')
    .select('id, title, synopsis, tier, status, token_ticker, token_mint_txid, commissioner_percent, account_id, created_at, parent_offer_id, trailer_video_url')
    .eq('id', offerId)
    .maybeSingle();
  if (!offer) { res.status(404).json({ error: 'Offer not found' }); return; }
  if (offer.account_id !== accountId) {
    res.status(403).json({ error: 'Not your project' });
    return;
  }

  // Walk the lineage down so the snapshot has every tier's
  // artifacts — pitch + trailer + short + feature when they exist.
  // Skip alt trailers (pipeline_state.is_alt=true) — they're private.
  const lineageIds: string[] = [offerId];
  let cursor = offerId;
  for (let i = 0; i < 3; i++) {
    const { data: children } = await supabase
      .from('bct_offers')
      .select('id, pipeline_state')
      .eq('parent_offer_id', cursor);
    const canonical = (children as Array<{ id: string; pipeline_state?: { is_alt?: boolean } }> | null)
      ?.find((c) => !c.pipeline_state?.is_alt);
    if (!canonical) break;
    lineageIds.push(canonical.id);
    cursor = canonical.id;
  }

  // Load everything the deck renderer uses. Keep the payload small
  // enough to fit in jsonb without bloat — full artifact urls, no
  // binary data.
  const [artsRes, stepLogRes, salesRes, listingsRes, ticketsRes] = await Promise.all([
    supabase.from('bct_artifacts')
      .select('id, kind, url, role, model, step_id, payment_txid, created_at, offer_id')
      .in('offer_id', lineageIds)
      .is('superseded_by', null)
      .order('created_at', { ascending: true }),
    supabase.from('bct_step_log')
      .select('id, step_id, agent_id, status, payment_txid, payment_sats, artifact_id, message, created_at, offer_id')
      .in('offer_id', lineageIds)
      .order('created_at', { ascending: true }),
    supabase.from('bct_share_sales')
      .select('buyer_account, tranche, percent_bought, price_usd, created_at, txid')
      .in('offer_id', lineageIds)
      .order('created_at', { ascending: true }),
    supabase.from('bct_share_listings')
      .select('id, offer_id, price_per_share_cents, shares_offered, status, created_at')
      .in('offer_id', lineageIds),
    supabase.from('bct_ticket_sales')
      .select('price_usd, offer_id, created_at')
      .in('offer_id', lineageIds),
  ]);

  const payload = {
    offer,
    lineage: lineageIds,
    artifacts: artsRes.data || [],
    stepLog: stepLogRes.data || [],
    shareSales: salesRes.data || [],
    shareListings: listingsRes.data || [],
    ticketSales: ticketsRes.data || [],
    capturedAt: new Date().toISOString(),
  };

  // Compute next version for this (offer, kind). A tiny race is
  // possible under concurrent pins, but the unique constraint on
  // (offer_id, kind, version) catches it — we retry on 23505.
  async function nextVersion(): Promise<number> {
    const { data: top } = await supabase
      .from('bct_deck_snapshots')
      .select('version')
      .eq('offer_id', offerId)
      .eq('kind', kind)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (top?.version ?? 0) + 1;
  }

  type InsertedSnapshot = { version: number; share_token: string; pinned_at: string };
  let inserted: InsertedSnapshot | null = null;
  for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
    const version = await nextVersion();
    const token = randToken();
    const { data, error } = await supabase
      .from('bct_deck_snapshots')
      .insert({
        offer_id: offerId,
        kind,
        version,
        payload,
        note,
        pinned_by_account_id: accountId,
        share_token: token,
      })
      .select('version, share_token, pinned_at')
      .single();
    if (data) { inserted = data as unknown as InsertedSnapshot; break; }
    const pgCode = (error as unknown as { code?: string })?.code;
    if (pgCode !== '23505') {
      console.error('[deck/pin] insert failed:', error);
      res.status(500).json({ error: 'Pin failed' });
      return;
    }
    // else: unique conflict, retry with higher version
  }

  if (!inserted) {
    res.status(500).json({ error: 'Could not pin — too many concurrent pins' });
    return;
  }

  res.status(200).json({
    version: inserted.version,
    share_token: inserted.share_token,
    pinned_at: inserted.pinned_at,
    share_url: `https://bmovies.online/deck.html?v=${inserted.share_token}`,
  });
}
