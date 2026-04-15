/**
 * POST /api/feature/start
 *
 * Kicks off a feature production pipeline. Inserts a `bct_offers` row in
 * `funded` status with `current_step='producer.token_mint'` and
 * `next_step_at=now()`, then the Hetzner-resident feature-worker.ts
 * cron loop picks it up on its next tick (within ~30 seconds) and starts
 * marching through the 28 pipeline steps.
 *
 * Called by:
 *   - api/stripe-webhook.ts when a Stripe checkout for tier='feature' completes
 *   - api/feature/judge-coupon.ts (TODO) for the BSVA judge demo coupon
 *
 * Request body:
 *   {
 *     title: string,
 *     ticker: string,
 *     synopsis: string,
 *     accountId?: string,            // bct_accounts.id (optional for judge flow)
 *     parentOfferId?: string,        // if deriving from an existing trailer/short
 *     commissionerPercent?: number,  // computed by the caller (Stripe webhook)
 *     producerAddress?: string,      // BSV address that will receive the royalty shares
 *     source?: string,               // 'stripe' | 'judge-coupon' | etc
 *   }
 *
 * Response (200):
 *   { ok: true, offerId: string }
 *
 * Env:
 *   SUPABASE_URL              required
 *   SUPABASE_SERVICE_ROLE_KEY required
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

const PITCH_RECEIVE_FALLBACK = '15q3UKrYYNuXRSg3gtb52pEnbaeiGK4m7b';

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

  let body: {
    title?: string;
    ticker?: string;
    synopsis?: string;
    accountId?: string;
    parentOfferId?: string;
    commissionerPercent?: number;
    producerAddress?: string;
    source?: string;
  };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const title = body.title?.trim();
  const ticker = body.ticker?.trim();
  const synopsis = (body.synopsis || '').trim();
  if (!title || !ticker) {
    res.status(400).json({ error: 'title and ticker are required' });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // Compute the commissioner's percentage from the parent chain, mirroring
  // computeCommissionerPercent() in api/checkout.ts. If the caller already
  // computed it, trust them.
  let commissionerPercent = body.commissionerPercent ?? 99;
  if (commissionerPercent === undefined || commissionerPercent === null) {
    commissionerPercent = 99;
    if (body.parentOfferId) {
      const { data: parent } = await supabase
        .from('bct_offers')
        .select('parent_offer_id')
        .eq('id', body.parentOfferId)
        .maybeSingle();
      if (parent) {
        commissionerPercent = parent.parent_offer_id ? 84 : 89;
      }
    }
  }

  const offerId = `feature-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const producerAddress = body.producerAddress || process.env.PITCH_RECEIVE_ADDRESS || PITCH_RECEIVE_FALLBACK;

  // Pick a producer agent (round-robin by hashing the offer ID later;
  // for now just take the first studio's producer)
  const { data: producers } = await supabase
    .from('bct_agents')
    .select('id')
    .eq('role', 'producer')
    .limit(10);
  const producerId = producers && producers.length > 0
    ? producers[Math.floor(Math.random() * producers.length)].id
    : 'spielbergx';

  const { error: insertError } = await supabase.from('bct_offers').insert({
    id: offerId,
    producer_id: producerId,
    producer_address: producerAddress,
    title,
    synopsis: synopsis || `An AI-produced feature film titled "${title}".`,
    required_sats: 25000,
    raised_sats: 25000,
    status: 'funded',
    token_ticker: ticker,
    tier: 'feature',
    commissioner_percent: commissionerPercent,
    account_id: body.accountId || null,
    parent_offer_id: body.parentOfferId || null,
    production_phase: 'preproduction',
    current_step: 'producer.token_mint',
    next_step_at: new Date().toISOString(), // worker picks it up on next tick
    pipeline_state: { source: body.source || 'api/feature/start' },
  });

  if (insertError) {
    console.error('[feature/start] insert failed:', insertError);
    res.status(500).json({ error: 'failed to create offer', detail: insertError.message });
    return;
  }

  console.log(`[feature/start] queued offer=${offerId} title="${title}" producer=${producerId} commissioner_percent=${commissionerPercent}%`);

  res.status(200).json({
    ok: true,
    offerId,
    producerId,
    commissionerPercent,
    productionUrl: `https://bmovies.online/production.html?id=${encodeURIComponent(offerId)}`,
  });
}
