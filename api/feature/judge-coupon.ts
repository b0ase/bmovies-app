/**
 * POST /api/feature/judge-coupon
 *
 * Bypasses Stripe and kicks off a real feature production for a BSVA judge.
 * Gated by:
 *   - The coupon code must match `process.env.JUDGE_COUPON`
 *   - One commission per IP per 24 hours (tracked in bct_judge_commissions)
 *   - The offer is created with a designated "judges" account_id so the
 *     production page knows who to show the revision UI to
 *
 * Request body:
 *   {
 *     coupon: string,         // must match JUDGE_COUPON env var
 *     title?: string,         // optional, defaults to a placeholder
 *     synopsis?: string,      // optional, defaults to a placeholder
 *     ticker?: string,        // optional, generated if absent
 *     judgeName?: string,     // for tracking
 *   }
 *
 * Response (200):
 *   {
 *     ok: true,
 *     offerId: string,
 *     productionUrl: string,
 *     message: string
 *   }
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

function clientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded)) return forwarded[0];
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string') return real;
  return '0.0.0.0';
}

function generateTicker(title: string): string {
  const letters = title.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
  if (letters.length >= 4) return letters.slice(0, 5);
  return ('JUDG' + letters).slice(0, 5).padEnd(5, 'X');
}

const DEFAULT_TITLES = [
  'The Last Lighthouse',
  'Cipher of the Drowned City',
  'Echoes Beneath Glacier 9',
  'The Cartographer of Empty Rooms',
  'Pale Horse, Iron Sky',
  'Sub-Orbital Lullaby',
];
const DEFAULT_SYNOPSIS_TEMPLATE = (title: string) =>
  `An autonomous AI feature production exploring the world of "${title}". A 12-agent studio writes, directs, designs, shoots, edits, scores, and ships the film over 24 hours, while the audience watches every step on-chain.`;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const expectedCoupon = process.env.JUDGE_COUPON || '';
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!expectedCoupon) {
    res.status(503).json({ error: 'judge coupon not configured (JUDGE_COUPON env missing)' });
    return;
  }
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase env vars missing' });
    return;
  }

  let body: { coupon?: string; title?: string; synopsis?: string; ticker?: string; judgeName?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  if (!body.coupon || body.coupon.trim() !== expectedCoupon) {
    res.status(401).json({ error: 'invalid coupon' });
    return;
  }

  const ip = clientIp(req);

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // Rate limit: one commission per IP per 24h
  const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: recent } = await supabase
    .from('bct_judge_commissions')
    .select('id, offer_id, created_at')
    .eq('ip_address', ip)
    .gte('created_at', oneDayAgo)
    .limit(1);
  if (recent && recent.length > 0) {
    res.status(429).json({
      error: 'rate limited',
      message: 'one judge commission per IP per 24 hours',
      existingOfferId: recent[0].offer_id,
      productionUrl: `https://bmovies.online/production.html?id=${encodeURIComponent(recent[0].offer_id || '')}`,
    });
    return;
  }

  // Create the feature offer
  const title = body.title?.trim() || DEFAULT_TITLES[Math.floor(Math.random() * DEFAULT_TITLES.length)];
  const synopsis = body.synopsis?.trim() || DEFAULT_SYNOPSIS_TEMPLATE(title);
  const ticker = body.ticker?.trim() || generateTicker(title);
  const offerId = `feature-judge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Pick a producer at random from the existing studios
  const { data: producers } = await supabase
    .from('bct_agents')
    .select('id')
    .eq('role', 'producer')
    .limit(10);
  const producerId = producers && producers.length > 0
    ? producers[Math.floor(Math.random() * producers.length)].id
    : 'spielbergx';

  const { error: offerErr } = await supabase.from('bct_offers').insert({
    id: offerId,
    producer_id: producerId,
    producer_address: process.env.PITCH_RECEIVE_ADDRESS || '15q3UKrYYNuXRSg3gtb52pEnbaeiGK4m7b',
    title,
    synopsis,
    required_sats: 25000,
    raised_sats: 25000,
    status: 'funded',
    token_ticker: ticker,
    tier: 'feature',
    commissioner_percent: 99,
    parent_offer_id: null,
    production_phase: 'preproduction',
    current_step: 'producer.token_mint',
    next_step_at: new Date().toISOString(),
    pipeline_state: { source: 'judge-coupon', ip, judgeName: body.judgeName || null },
  });

  if (offerErr) {
    console.error('[feature/judge-coupon] offer insert failed:', offerErr);
    res.status(500).json({ error: 'failed to create offer', detail: offerErr.message });
    return;
  }

  // Record the rate-limit row
  await supabase.from('bct_judge_commissions').insert({
    ip_address: ip,
    offer_id: offerId,
    coupon: expectedCoupon,
  });

  console.log(`[feature/judge-coupon] judge=${body.judgeName || 'anon'} ip=${ip} → offer=${offerId} title="${title}"`);

  res.status(200).json({
    ok: true,
    offerId,
    title,
    ticker,
    producerId,
    productionUrl: `https://bmovies.online/production.html?id=${encodeURIComponent(offerId)}`,
    message: 'Production queued. Worker will pick it up within ~30 seconds.',
  });
}
