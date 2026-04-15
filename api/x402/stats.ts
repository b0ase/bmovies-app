/**
 * GET /api/x402/stats
 *
 * Aggregated x402 settlement stats for /x402.html and the production
 * page sidebars. Reads from the bct_x402_stats view (defined in
 * migration 0020) plus a recent-activity feed from bct_x402_receipts.
 *
 * Response:
 *   {
 *     totals: {
 *       settlements: number,
 *       settlements_24h: number,
 *       totalSats: number,
 *       sats_24h: number,
 *       distinctOffers: number,
 *     },
 *     recent: Array<{
 *       txid, amountSats, toAddr, resourceType, resourcePath,
 *       offerId, agentId, stepId, createdAt
 *     }>,
 *     topFilms: Array<{ offerId, title, totalSats }>,
 *     topAgents: Array<{ agentId, name, totalEarnedSats, jobsCompleted }>,
 *   }
 *
 * No auth. This page is public — the whole point of x402 is that
 * settlements are verifiable by anyone.
 */

import { createClient } from '@supabase/supabase-js';

interface VercelRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
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
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=10');
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
    res.status(500).json({ error: 'Supabase env missing' });
    return;
  }
  const supa = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // ─── Totals via the view ───
  const { data: totalsRow, error: totalsErr } = await supa
    .from('bct_x402_stats')
    .select('*')
    .maybeSingle();
  if (totalsErr) { res.status(500).json({ error: totalsErr.message }); return; }

  const totals = {
    settlements: Number(totalsRow?.total_settlements ?? 0),
    settlements_24h: Number(totalsRow?.settlements_24h ?? 0),
    totalSats: Number(totalsRow?.total_sats ?? 0),
    sats_24h: Number(totalsRow?.sats_24h ?? 0),
    distinctOffers: Number(totalsRow?.distinct_offers ?? 0),
  };

  // ─── Recent activity (last 50) ───
  const { data: recentRows } = await supa
    .from('bct_x402_receipts')
    .select('txid, amount_sats, to_addr, resource_type, resource_path, offer_id, agent_id, step_id, created_at')
    .eq('verification_status', 'verified')
    .order('created_at', { ascending: false })
    .limit(50);

  const recent = (recentRows ?? []).map((r) => ({
    txid: r.txid,
    amountSats: Number(r.amount_sats),
    toAddr: r.to_addr,
    resourceType: r.resource_type,
    resourcePath: r.resource_path,
    offerId: r.offer_id,
    agentId: r.agent_id,
    stepId: r.step_id,
    createdAt: r.created_at,
  }));

  // ─── Top-earning films (by receipts) ───
  const { data: topFilmRows } = await supa
    .from('bct_x402_receipts')
    .select('offer_id, amount_sats')
    .eq('verification_status', 'verified')
    .not('offer_id', 'is', null)
    .limit(10000);

  const filmSats = new Map<string, number>();
  for (const r of topFilmRows ?? []) {
    if (!r.offer_id) continue;
    filmSats.set(r.offer_id, (filmSats.get(r.offer_id) ?? 0) + Number(r.amount_sats));
  }
  const topFilmIds = Array.from(filmSats.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  let topFilms: Array<{ offerId: string; title: string; totalSats: number }> = [];
  if (topFilmIds.length > 0) {
    const { data: offerRows } = await supa
      .from('bct_offers')
      .select('id, title')
      .in('id', topFilmIds.map(([id]) => id));
    const titleById = new Map((offerRows ?? []).map((o) => [o.id, o.title as string]));
    topFilms = topFilmIds.map(([id, sats]) => ({
      offerId: id,
      title: titleById.get(id) ?? id,
      totalSats: sats,
    }));
  }

  // ─── Top-earning agents (from bct_agents.total_earned_sats) ───
  const { data: agentRows } = await supa
    .from('bct_agents')
    .select('id, name, studio, total_earned_sats, jobs_completed')
    .order('total_earned_sats', { ascending: false })
    .limit(10);

  const topAgents = (agentRows ?? []).map((a) => ({
    agentId: a.id,
    name: a.name,
    studio: a.studio,
    totalEarnedSats: Number(a.total_earned_sats ?? 0),
    jobsCompleted: Number(a.jobs_completed ?? 0),
  }));

  res.status(200).json({ totals, recent, topFilms, topAgents });
}
