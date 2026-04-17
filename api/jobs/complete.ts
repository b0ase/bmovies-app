/**
 * POST /api/jobs/complete
 *
 * Closes out a job with a delivery verdict. On outcome='completed',
 * increments bct_agents.jobs_completed. On outcome='failed', increments
 * jobs_failed. Writes a platform-signed reputation attestation to
 * bct_reputation_attestations — the row is the authoritative record
 * that this pubkey/agent delivered (or failed) job X.
 *
 * A follow-up sweeper mirrors each attestation to BSV mainnet via an
 * OP_RETURN transaction and writes the txid back to the row; this
 * endpoint does NOT broadcast (kept synchronous + fast).
 *
 * Auth: X-Award-Secret (internal) OR commissioner JWT — same model as
 * /api/jobs/award.
 *
 * ── Request body ────────────────────────────────────────────────────
 *   {
 *     jobId: string,
 *     outcome: 'completed' | 'failed',
 *     deliveryUrl?: string,   // optional artifact ref
 *     note?: string,          // optional producer note
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

  let body: { jobId?: string; outcome?: string; deliveryUrl?: string; note?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const jobId = (body.jobId || '').trim();
  const outcome = (body.outcome || '').trim();
  if (!jobId || !['completed', 'failed'].includes(outcome)) {
    res.status(400).json({ error: 'jobId required; outcome must be "completed" or "failed"' });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // ── Auth: same pattern as award.ts ───────────────────────────────
  const awardSecret = process.env.JOBS_AWARD_SECRET;
  const providedSecret = headerString(req.headers['x-award-secret'] || req.headers['X-Award-Secret']);
  const jwtHeader = headerString(req.headers['authorization'] || req.headers['Authorization']);
  const jwt = jwtHeader.replace(/^Bearer\s+/i, '');

  let authorized = false;
  if (awardSecret && providedSecret && providedSecret === awardSecret) {
    authorized = true;
  } else if (jwt) {
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (user) {
      const { data: account } = await supabase.from('bct_accounts').select('id').eq('auth_user_id', user.id).maybeSingle();
      if (account) {
        const { data: job } = await supabase.from('bct_jobs').select('offer_id').eq('id', jobId).maybeSingle();
        if (job) {
          const { data: offer } = await supabase.from('bct_offers').select('account_id').eq('id', job.offer_id).maybeSingle();
          if (offer && offer.account_id === account.id) authorized = true;
        }
      }
    }
  }

  if (!authorized) {
    res.status(403).json({ error: 'Not authorized', reason: 'unauthorized' });
    return;
  }

  // ── Load job + winning bid ───────────────────────────────────────
  const { data: job, error: jobErr } = await supabase
    .from('bct_jobs')
    .select('id, status, winning_bid_id, offer_id, role')
    .eq('id', jobId)
    .maybeSingle();
  if (jobErr || !job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  if (!job.winning_bid_id) {
    res.status(409).json({ error: 'Job has no winning bid — award a bid first', reason: 'no_winner' });
    return;
  }
  if (job.status === 'completed') {
    res.status(409).json({ error: 'Job already completed', reason: 'already_completed' });
    return;
  }

  const { data: bid } = await supabase
    .from('bct_bids')
    .select('agent_id, price_sats, signature')
    .eq('id', job.winning_bid_id)
    .maybeSingle();
  if (!bid) {
    res.status(500).json({ error: 'Winning bid not found', reason: 'missing_winner' });
    return;
  }

  const { data: agent } = await supabase
    .from('bct_agents')
    .select('id, name, pubkey, is_external, jobs_completed, jobs_failed')
    .eq('id', bid.agent_id)
    .maybeSingle();
  if (!agent) {
    res.status(500).json({ error: 'Winning agent not found' });
    return;
  }

  // ── Build + sign the attestation ─────────────────────────────────
  const attestation = {
    version: 1,
    type: 'bmovies-reputation-attestation',
    agentId: agent.id,
    pubkey: agent.pubkey,
    jobId,
    offerId: job.offer_id,
    role: job.role,
    bidId: job.winning_bid_id,
    priceSats: Number(bid.price_sats),
    outcome,
    deliveryUrl: body.deliveryUrl?.slice(0, 500) || null,
    deliveredAt: new Date().toISOString(),
  };
  const attestationJson = JSON.stringify(attestation);

  // Inline the deterministic platform key derivation so this file has
  // no rootDir-crossing imports. Same HMAC derivation as src/kyc/certificate.ts.
  let platformSignature: string;
  let platformPubkey: string;
  try {
    const { createHmac } = await import('node:crypto');
    const { PrivateKey, BSM } = await import('@bsv/sdk');
    const hmac = createHmac('sha256', supabaseKey);
    hmac.update('bmovies-kyc-cert-signer');
    const seedHex = hmac.digest('hex');
    const privateKey = PrivateKey.fromString(seedHex, 'hex');
    platformPubkey = privateKey.toPublicKey().toString();
    const msgBytes = Array.from(Buffer.from(attestationJson, 'utf-8'));
    const sig = BSM.sign(msgBytes, privateKey, 'raw') as unknown as import('@bsv/sdk').Signature;
    platformSignature = Buffer.from(sig.toDER()).toString('hex');
  } catch (err) {
    console.error('[jobs/complete] signing failed:', err);
    res.status(500).json({ error: 'Attestation signing failed', detail: err instanceof Error ? err.message : String(err) });
    return;
  }

  // ── Persist attestation ──────────────────────────────────────────
  const attId = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { error: attErr } = await supabase.from('bct_reputation_attestations').insert({
    id: attId,
    pubkey: agent.pubkey || 'unknown',
    agent_id: agent.id,
    job_id: jobId,
    outcome,
    attestation_json: attestationJson,
    platform_signature: platformSignature,
    platform_pubkey: platformPubkey,
  });
  if (attErr) {
    console.error('[jobs/complete] attestation insert failed:', attErr);
    res.status(500).json({ error: 'Failed to persist attestation', detail: attErr.message });
    return;
  }

  // ── Update job + agent counters ──────────────────────────────────
  await supabase
    .from('bct_jobs')
    .update({ status: outcome === 'completed' ? 'completed' : 'cancelled', completed_at: new Date().toISOString() })
    .eq('id', jobId);

  const updates: Record<string, number> = {};
  if (outcome === 'completed') updates.jobs_completed = Number(agent.jobs_completed) + 1;
  else updates.jobs_failed = Number(agent.jobs_failed) + 1;
  await supabase.from('bct_agents').update(updates).eq('id', agent.id);

  console.log(`[jobs/complete] job=${jobId} outcome=${outcome} agent=${agent.id} attestation=${attId}`);

  res.status(200).json({
    ok: true,
    jobId,
    outcome,
    attestationId: attId,
    attestation,
    platformSignature,
    platformPubkey,
    onChainTxid: null,  // filled by the OP_RETURN sweeper (TODO)
  });
}
