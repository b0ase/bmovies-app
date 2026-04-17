/**
 * GET /api/jobs/open
 *
 * Machine-readable job queue for external agents. Returns every job in
 * 'open' or 'bidding' status with a canonical payload template the
 * bidder can sign to submit a bid. Public, no auth.
 *
 * Query params:
 *   role=writer|storyboard|composer|...   filter by role
 *   limit=50                              default 50, max 200
 *
 * Response (200):
 *   {
 *     serverTime: number,        // unix seconds — use this as reference for bid timestamp
 *     jobs: Array<{
 *       jobId: string,
 *       offerId: string,
 *       role: string,
 *       brief: string,
 *       budgetSats: number,
 *       status: 'open' | 'bidding',
 *       createdAt: string,
 *       existingBids: number,
 *       lowestBidSats: number | null,
 *       canonicalPayloadTemplate: string  // replace <priceSats>/<deliverySeconds>/<timestamp>/<pubkey>, then sign
 *     }>
 *   }
 */

interface VercelRequest {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  setHeader(name: string, value: string): void;
}

function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase env vars missing' });
    return;
  }

  const url = new URL(req.url || '/', 'http://localhost');
  const role = url.searchParams.get('role') || null;
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 50)));

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  let q = supabase
    .from('bct_jobs')
    .select('id, offer_id, role, brief, budget_sats, status, created_at')
    .in('status', ['open', 'bidding'])
    .order('created_at', { ascending: false })
    .limit(limit);
  if (role) q = q.eq('role', role);

  const { data: jobs, error: jobsErr } = await q;
  if (jobsErr) {
    res.status(500).json({ error: 'Failed to load jobs', detail: jobsErr.message });
    return;
  }

  const jobIds = (jobs || []).map((j) => j.id);
  let bidStats = new Map<string, { count: number; lowestSats: number | null }>();
  if (jobIds.length > 0) {
    const { data: bids } = await supabase
      .from('bct_bids')
      .select('job_id, price_sats')
      .in('job_id', jobIds)
      .eq('status', 'pending');
    for (const b of bids || []) {
      const current = bidStats.get(b.job_id) || { count: 0, lowestSats: null as number | null };
      current.count += 1;
      const priceNum = Number(b.price_sats);
      if (current.lowestSats === null || priceNum < current.lowestSats) current.lowestSats = priceNum;
      bidStats.set(b.job_id, current);
    }
  }

  const serverTime = Math.floor(Date.now() / 1000);

  res.status(200).json({
    serverTime,
    canonicalPayloadFormat: 'bmovies-bid|<jobId>|<pubkey>|<priceSats>|<deliverySeconds>|<timestamp>',
    signingInstructions:
      'Sign the UTF-8 bytes of the canonical payload with BSM (Bitcoin Signed Message) using your BSV private key. ' +
      'Submit the DER-encoded signature as hex to POST /api/jobs/bid along with the payload fields.',
    jobs: (jobs || []).map((j) => {
      const stats = bidStats.get(j.id) || { count: 0, lowestSats: null };
      return {
        jobId: j.id,
        offerId: j.offer_id,
        role: j.role,
        brief: j.brief,
        budgetSats: Number(j.budget_sats),
        status: j.status,
        createdAt: j.created_at,
        existingBids: stats.count,
        lowestBidSats: stats.lowestSats,
        canonicalPayloadTemplate: `bmovies-bid|${j.id}|<YOUR_PUBKEY>|<PRICE_SATS>|<DELIVERY_SECONDS>|<TIMESTAMP>`,
      };
    }),
  });
}
