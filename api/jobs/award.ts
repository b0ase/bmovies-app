/**
 * POST /api/jobs/award
 *
 * Producer-side endpoint: awards a bid and transitions the job. Authenticated
 * via a service secret header (the internal swarm holds it) OR by the JWT of
 * the offer's commissioner (the human who commissioned the film — they can
 * pick the winning bid for their own production).
 *
 * Effects:
 *   - bct_jobs.status -> 'awarded', winning_bid_id set, awarded_at stamped
 *   - bct_bids (winner) status -> 'accepted'
 *   - other bids on same job stay 'pending' (withdraw explicitly if wanted)
 *
 * Reputation attestation is written in a separate endpoint
 * (/api/jobs/complete) when the delivery is accepted by the producer.
 *
 * ── Request body ────────────────────────────────────────────────────
 *   {
 *     jobId: string,
 *     bidId: string,
 *   }
 *
 * Headers (one of):
 *   X-Award-Secret: <JOBS_AWARD_SECRET env>     — internal swarm / CI
 *   Authorization: Bearer <supabase JWT>        — commissioner flow
 *
 * ── Response ────────────────────────────────────────────────────────
 *   200 { ok: true, jobId, bidId, winnerAgentId }
 *
 * ── Env ─────────────────────────────────────────────────────────────
 *   SUPABASE_URL                required
 *   SUPABASE_SERVICE_ROLE_KEY   required
 *   JOBS_AWARD_SECRET           optional — enables X-Award-Secret path
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Award-Secret');
}

function headerString(v: string | string[] | undefined): string {
  if (!v) return '';
  return Array.isArray(v) ? v[0] : v;
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

  let body: { jobId?: string; bidId?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }
  const jobId = (body.jobId || '').trim();
  const bidId = (body.bidId || '').trim();
  if (!jobId || !bidId) {
    res.status(400).json({ error: 'jobId and bidId are required' });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // ── Auth: service secret OR commissioner JWT ─────────────────────
  const awardSecret = process.env.JOBS_AWARD_SECRET;
  const providedSecret = headerString(req.headers['x-award-secret'] || req.headers['X-Award-Secret']);
  const jwtHeader = headerString(req.headers['authorization'] || req.headers['Authorization']);
  const jwt = jwtHeader.replace(/^Bearer\s+/i, '');

  let authorized = false;
  let authContext: { kind: 'secret' } | { kind: 'commissioner'; accountId: string } | null = null;

  if (awardSecret && providedSecret && providedSecret === awardSecret) {
    authorized = true;
    authContext = { kind: 'secret' };
  } else if (jwt) {
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (user) {
      const { data: account } = await supabase
        .from('bct_accounts')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (account) {
        // Verify this user is the commissioner of the offer that owns this job
        const { data: job } = await supabase
          .from('bct_jobs')
          .select('offer_id')
          .eq('id', jobId)
          .maybeSingle();
        if (job) {
          const { data: offer } = await supabase
            .from('bct_offers')
            .select('account_id')
            .eq('id', job.offer_id)
            .maybeSingle();
          if (offer && offer.account_id === account.id) {
            authorized = true;
            authContext = { kind: 'commissioner', accountId: account.id };
          }
        }
      }
    }
  }

  if (!authorized || !authContext) {
    res.status(403).json({
      error: 'Not authorized to award this job. Supply X-Award-Secret (internal) or a commissioner JWT.',
      reason: 'unauthorized',
    });
    return;
  }

  // ── Load job + bid + validate ────────────────────────────────────
  const { data: job, error: jobErr } = await supabase
    .from('bct_jobs')
    .select('id, status, offer_id, role')
    .eq('id', jobId)
    .maybeSingle();
  if (jobErr || !job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  if (job.status === 'awarded' || job.status === 'completed') {
    res.status(409).json({ error: `Job already ${job.status}`, reason: 'job_already_awarded' });
    return;
  }

  const { data: bid, error: bidErr } = await supabase
    .from('bct_bids')
    .select('id, agent_id, job_id, status, price_sats, is_external')
    .eq('id', bidId)
    .maybeSingle();
  if (bidErr || !bid) {
    res.status(404).json({ error: 'Bid not found' });
    return;
  }
  if (bid.job_id !== jobId) {
    res.status(400).json({ error: 'Bid does not belong to this job', reason: 'bid_job_mismatch' });
    return;
  }
  if (bid.status !== 'pending') {
    res.status(409).json({ error: `Bid status=${bid.status}, cannot award`, reason: 'bid_not_pending' });
    return;
  }

  // ── Atomic award ─────────────────────────────────────────────────
  const awardedAt = new Date().toISOString();
  const { error: jobUpdErr } = await supabase
    .from('bct_jobs')
    .update({
      status: 'awarded',
      winning_bid_id: bidId,
      awarded_at: awardedAt,
    })
    .eq('id', jobId);
  if (jobUpdErr) {
    res.status(500).json({ error: 'Failed to transition job', detail: jobUpdErr.message });
    return;
  }

  await supabase.from('bct_bids').update({ status: 'accepted' }).eq('id', bidId);

  console.log(
    `[jobs/award] job=${jobId} awarded to bid=${bidId} agent=${bid.agent_id} ` +
    `external=${bid.is_external} auth=${authContext.kind}`,
  );

  res.status(200).json({
    ok: true,
    jobId,
    bidId,
    winnerAgentId: bid.agent_id,
    isExternal: bid.is_external,
    priceSats: Number(bid.price_sats),
    awardedAt,
  });
}
