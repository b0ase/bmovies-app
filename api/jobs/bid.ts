/**
 * POST /api/jobs/bid
 *
 * External agent bidding endpoint. Accepts BRC-77 (BSM) signed bids from
 * ANY BSV wallet — no platform account required. The pubkey IS the
 * identity; the signature IS the auth; the reputation counter on this
 * pubkey IS the track record.
 *
 * ── Canonical payload ───────────────────────────────────────────────
 * The bidder signs the UTF-8 bytes of this exact string (no JSON, no
 * whitespace — easy to reproduce deterministically in any language):
 *
 *   bmovies-bid|<jobId>|<pubkey>|<priceSats>|<deliverySeconds>|<timestamp>
 *
 * Where timestamp is a unix-seconds integer within ±300s of the server
 * clock. The platform verifies BSM.verify over these bytes using the
 * bidder's pubkey. Replay is prevented by the UNIQUE (job_id, agent_id)
 * constraint and the timestamp window.
 *
 * ── Request body ────────────────────────────────────────────────────
 *   {
 *     jobId: string,                // bct_jobs.id
 *     pubkey: string,               // 33-byte compressed secp256k1, hex
 *     agentName?: string,           // optional display name (first bid only)
 *     priceSats: number,            // bid amount in sats
 *     deliverySeconds: number,      // committed delivery time
 *     timestamp: number,            // unix seconds, ±300s of server now
 *     signature: string,            // BSM DER hex over canonical payload
 *     role?: string,                // requested role (optional; defaults to job.role)
 *     styleNote?: string,           // optional free-text portfolio hint
 *     portfolioRef?: string,        // optional URL to prior work
 *   }
 *
 * ── Response ────────────────────────────────────────────────────────
 *   200 { ok: true, bidId: string, agentId: string }
 *   4xx { error: string, reason: 'signature_invalid' | 'timestamp_skew' | 'job_not_open' | ... }
 *
 * ── Env ─────────────────────────────────────────────────────────────
 *   SUPABASE_URL                required
 *   SUPABASE_SERVICE_ROLE_KEY   required
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

const TIMESTAMP_WINDOW_SECONDS = 300;

function buildCanonicalPayload(b: {
  jobId: string;
  pubkey: string;
  priceSats: number;
  deliverySeconds: number;
  timestamp: number;
}): string {
  return `bmovies-bid|${b.jobId}|${b.pubkey}|${b.priceSats}|${b.deliverySeconds}|${b.timestamp}`;
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

  let body: {
    jobId?: string;
    pubkey?: string;
    agentName?: string;
    priceSats?: number;
    deliverySeconds?: number;
    timestamp?: number;
    signature?: string;
    role?: string;
    styleNote?: string;
    portfolioRef?: string;
  };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  // ── Validate shape ────────────────────────────────────────────────
  const jobId = (body.jobId || '').trim();
  const pubkey = (body.pubkey || '').trim();
  const signature = (body.signature || '').trim();
  const priceSats = Number(body.priceSats);
  const deliverySeconds = Number(body.deliverySeconds);
  const timestamp = Number(body.timestamp);

  if (!jobId || !pubkey || !signature) {
    res.status(400).json({ error: 'jobId, pubkey, and signature are required', reason: 'missing_field' });
    return;
  }
  if (!Number.isFinite(priceSats) || priceSats <= 0) {
    res.status(400).json({ error: 'priceSats must be a positive number', reason: 'invalid_price' });
    return;
  }
  if (!Number.isFinite(deliverySeconds) || deliverySeconds <= 0) {
    res.status(400).json({ error: 'deliverySeconds must be a positive number', reason: 'invalid_delivery' });
    return;
  }
  if (!Number.isFinite(timestamp)) {
    res.status(400).json({ error: 'timestamp must be unix seconds', reason: 'invalid_timestamp' });
    return;
  }
  if (!/^[0-9a-fA-F]{66}$/.test(pubkey)) {
    res.status(400).json({ error: 'pubkey must be 33-byte compressed hex (66 chars)', reason: 'invalid_pubkey' });
    return;
  }

  // ── Timestamp window ─────────────────────────────────────────────
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestamp) > TIMESTAMP_WINDOW_SECONDS) {
    res.status(400).json({
      error: `Timestamp outside ±${TIMESTAMP_WINDOW_SECONDS}s window (server: ${nowSec}, yours: ${timestamp})`,
      reason: 'timestamp_skew',
      serverTime: nowSec,
    });
    return;
  }

  // ── Verify BSM signature ─────────────────────────────────────────
  let BSM: typeof import('@bsv/sdk').BSM;
  let PublicKey: typeof import('@bsv/sdk').PublicKey;
  let Signature: typeof import('@bsv/sdk').Signature;
  try {
    const sdk = await import('@bsv/sdk');
    BSM = sdk.BSM;
    PublicKey = sdk.PublicKey;
    Signature = sdk.Signature;
  } catch {
    res.status(500).json({ error: '@bsv/sdk not installed on server' });
    return;
  }

  const canonical = buildCanonicalPayload({ jobId, pubkey, priceSats, deliverySeconds, timestamp });
  const messageBytes = Array.from(Buffer.from(canonical, 'utf-8'));
  let signatureValid = false;
  try {
    const derBytes = Array.from(Buffer.from(signature, 'hex'));
    const sig = Signature.fromDER(derBytes);
    const pk = PublicKey.fromString(pubkey);
    signatureValid = BSM.verify(messageBytes, sig, pk);
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) {
    res.status(401).json({
      error: 'Signature verification failed. Sign the canonical payload with your BSV private key.',
      reason: 'signature_invalid',
      canonicalPayload: canonical,
    });
    return;
  }

  // ── Payload hash for audit trail ─────────────────────────────────
  const { createHash } = await import('node:crypto');
  const payloadHash = createHash('sha256').update(canonical, 'utf-8').digest('hex');

  // ── DB side ──────────────────────────────────────────────────────
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // Job must exist and be open for bidding
  const { data: job, error: jobErr } = await supabase
    .from('bct_jobs')
    .select('id, role, status, budget_sats, offer_id')
    .eq('id', jobId)
    .maybeSingle();
  if (jobErr || !job) {
    res.status(404).json({ error: 'Job not found', reason: 'job_not_found' });
    return;
  }
  if (job.status !== 'open' && job.status !== 'bidding') {
    res.status(409).json({ error: `Job is not open (status=${job.status})`, reason: 'job_not_open' });
    return;
  }
  if (priceSats > Number(job.budget_sats)) {
    res.status(400).json({ error: `Bid exceeds job budget (${job.budget_sats} sats)`, reason: 'over_budget', budgetSats: Number(job.budget_sats) });
    return;
  }

  // Upsert external agent — identity is the pubkey. Derive a stable
  // agent id from the pubkey so the same external bidder always maps
  // to the same row across jobs.
  const agentId = `ext-${pubkey.slice(0, 16)}`;

  // Derive a BSV address from the pubkey for wallet_address (satisfies NOT NULL)
  let walletAddress: string;
  try {
    walletAddress = PublicKey.fromString(pubkey).toAddress();
  } catch {
    res.status(400).json({ error: 'Failed to derive address from pubkey', reason: 'pubkey_invalid' });
    return;
  }

  const agentRow = {
    id: agentId,
    name: body.agentName?.slice(0, 100) || `external-${pubkey.slice(0, 8)}`,
    studio: 'external',
    role: body.role || job.role,
    wallet_address: walletAddress,
    pubkey,
    is_external: true,
  };

  // Upsert: if this pubkey has bid before, its agent row already exists;
  // only update the name if the caller provided one (don't clobber).
  const { error: agentErr } = await supabase
    .from('bct_agents')
    .upsert(agentRow, { onConflict: 'id', ignoreDuplicates: false });
  if (agentErr) {
    console.error('[jobs/bid] agent upsert failed:', agentErr);
    res.status(500).json({ error: 'Failed to register bidder', detail: agentErr.message });
    return;
  }

  // Insert the bid. UNIQUE (job_id, agent_id) prevents same-bidder replay
  // per job; they must withdraw the first bid to resubmit.
  const bidId = `bid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { error: bidErr } = await supabase.from('bct_bids').insert({
    id: bidId,
    job_id: jobId,
    agent_id: agentId,
    price_sats: priceSats,
    eta_minutes: Math.ceil(deliverySeconds / 60),
    delivery_seconds: deliverySeconds,
    style_note: body.styleNote?.slice(0, 500) || null,
    portfolio_ref: body.portfolioRef?.slice(0, 500) || null,
    signature,
    signed_payload_hash: payloadHash,
    bid_timestamp: timestamp,
    is_external: true,
    status: 'pending',
  });

  if (bidErr) {
    if (bidErr.code === '23505') {
      res.status(409).json({ error: 'You have already bid on this job. Withdraw first to resubmit.', reason: 'duplicate_bid' });
      return;
    }
    console.error('[jobs/bid] bid insert failed:', bidErr);
    res.status(500).json({ error: 'Failed to record bid', detail: bidErr.message });
    return;
  }

  // Flip job to 'bidding' on first bid (idempotent)
  if (job.status === 'open') {
    await supabase.from('bct_jobs').update({ status: 'bidding' }).eq('id', jobId);
  }

  console.log(`[jobs/bid] external bid bid=${bidId} job=${jobId} agent=${agentId} price=${priceSats}sats`);

  res.status(200).json({
    ok: true,
    bidId,
    agentId,
    jobId,
    priceSats,
    deliverySeconds,
    message: 'Bid recorded. Awaiting producer award.',
  });
}
