/**
 * POST /api/agents/:role
 *
 * x402-gated agent service endpoint. Called by feature-worker.ts on
 * every pipeline step to settle a real BSV payment to the agent that
 * will do the work.
 *
 * Body:
 *   {
 *     offerId:  string,   // bct_offers.id
 *     stepId:   string,   // e.g. 'writer.logline'
 *     workerSignature?: string  // future: BRC-77 signed proof the caller is the worker
 *   }
 *
 * Flow:
 *   1. First call (no x-bsv-payment header): look up the locked studio
 *      for this offer, find the agent row for {studio, role}, return
 *      402 with that agent's wallet_address as the payTo.
 *   2. Retry (with x-bsv-payment: <txid>): verify the tx pays the
 *      expected address, record a bct_x402_receipts row, bump the
 *      agent's total_earned_sats, and return a 200 ACK.
 *
 * The ACK response is the worker's signal to proceed with the xAI
 * call. No actual content generation happens here — this endpoint is
 * a protocol gate, not a work endpoint. That design keeps xAI keys
 * on Hetzner where they already are, and makes the on-chain receipt
 * the authoritative record of "this agent got paid for this step."
 *
 * Pricing: PRICE_BY_ROLE below. Flat per-role tiers rather than
 * per-call so the ledger is easy to reason about.
 */

import { createClient } from '@supabase/supabase-js';
import { require402, type X402ResourceType } from '../../src/x402/server.js';

interface VercelRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  setHeader(name: string, value: string): void;
}

function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, x-bsv-payment',
  );
  res.setHeader(
    'Access-Control-Expose-Headers',
    'x-bsv-payment-version, x-bsv-payment-satoshis-required, x-bsv-payment-address, x-bsv-payment-resource, x-bsv-payment-scheme',
  );
}

// ───────── Pricing ─────────
//
// Rough approximation of compute cost per role. Numbers are low enough
// to make full-pipeline demos cheap (~300 sats total per feature) but
// not so low that they're noise on-chain.
const PRICE_BY_ROLE: Record<string, number> = {
  writer: 5,                  // text, small
  director: 8,                // text, medium
  cinematographer: 8,
  casting_director: 5,
  production_designer: 8,
  storyboard: 50,             // image — expensive
  composer: 20,                // audio
  editor: 15,                  // text mostly (video comes from scene.N)
  sound_designer: 10,
  publicist: 10,
  producer: 5,
};

function priceForRole(role: string): number {
  return PRICE_BY_ROLE[role] ?? 10;
}

// ───────── Studio resolution (server-side mirror of worker logic) ─────────
//
// Matches feature-worker.ts's `studioForOffer` so the worker and the
// endpoint always agree on which studio owns a given offer. If the
// offer already has pipeline_state.studio locked, that takes precedence.
const STUDIO_ORDER = [
  '21st-century-bot',
  'clanker-bros',
  'paramountal-ai',
  'dreamforge',
  'neuralscope',
  'bolt-disney',
] as const;

function hashOfferId(offerId: string): number {
  return offerId.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0);
}

function studioForOffer(offerId: string): string {
  return STUDIO_ORDER[hashOfferId(offerId) % STUDIO_ORDER.length];
}

// ───────── Handler ─────────

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const role = Array.isArray(req.query.role) ? req.query.role[0] : req.query.role;
  if (!role) { res.status(400).json({ error: 'role required' }); return; }

  let body: { offerId?: string; stepId?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const offerId = body.offerId?.trim();
  const stepId = body.stepId?.trim();
  if (!offerId || !stepId) {
    res.status(400).json({ error: 'offerId + stepId required' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase env missing' });
    return;
  }
  const supa = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // Resolve the locked studio for this offer
  const { data: offer } = await supa
    .from('bct_offers')
    .select('id, pipeline_state')
    .eq('id', offerId)
    .maybeSingle();
  if (!offer) { res.status(404).json({ error: `offer ${offerId} not found` }); return; }

  const lockedStudio = (offer.pipeline_state as { studio?: string } | null)?.studio;
  const studio = lockedStudio || studioForOffer(offerId);

  // Per-studio agent lookup for the requested role. We pull the
  // ledger columns (total_earned_sats, jobs_completed) too so we
  // can bump them after the x402 receipt is verified below.
  let agentId = `${studio}--${role}`;
  let { data: agent } = await supa
    .from('bct_agents')
    .select('id, name, studio, wallet_address, total_earned_sats, jobs_completed')
    .eq('id', agentId)
    .maybeSingle();

  // Fallback: shared role (no per-studio variant exists)
  if (!agent) {
    const { data: shared } = await supa
      .from('bct_agents')
      .select('id, name, studio, wallet_address, total_earned_sats, jobs_completed')
      .eq('role', role)
      .order('id', { ascending: true });
    if (!shared || shared.length === 0) {
      res.status(404).json({ error: `no agent for role '${role}'` });
      return;
    }
    agent = shared[hashOfferId(offerId) % shared.length];
    agentId = agent!.id;
  }

  if (!agent.wallet_address) {
    res.status(500).json({ error: `agent ${agentId} has no wallet_address` });
    return;
  }

  // Gate: require payment to this agent's address. The resource path
  // includes the stepId so the same txid can't unlock two different
  // steps (replay protection via the UNIQUE index).
  const resourcePath = `/api/agents/${role}?offer=${offerId}&step=${stepId}`;
  const receipt = await require402(req, res, {
    recipientAddress: agent.wallet_address,
    satsRequired: priceForRole(role),
    resourcePath,
    resourceType: 'agent' as X402ResourceType,
    offerId,
    agentId,
    stepId,
  });
  if (!receipt) return;

  // Payment verified. Bump the agent's earnings ledger. Best-effort —
  // the receipt row is the authoritative record; this is just a
  // convenience for the /agents.html leaderboard.
  await supa
    .from('bct_agents')
    .update({
      total_earned_sats: (agent.total_earned_sats ?? 0) + receipt.amountSats,
      jobs_completed: (agent.jobs_completed ?? 0) + 1,
    })
    .eq('id', agentId);

  res.status(200).json({
    ok: true,
    agentId,
    agentName: agent.name,
    studio: agent.studio,
    payTo: agent.wallet_address,
    paidSats: receipt.amountSats,
    paymentTxid: receipt.txid,
    receiptId: receipt.receiptId,
    message: `Payment accepted. Agent ${agent.name} (${studio}) is cleared for ${stepId} on ${offerId}.`,
  });
}
