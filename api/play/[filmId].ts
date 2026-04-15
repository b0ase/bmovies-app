/**
 * GET /api/play/:filmId
 *
 * x402-gated playback endpoint. The canonical consumer-facing use of
 * the protocol on bMovies:
 *
 *   1. Client GETs without a payment header
 *   2. Server responds 402 with:
 *        x-bsv-payment-satoshis-required: 10
 *        x-bsv-payment-address:           <film's producer_address>
 *        x-bsv-payment-resource:          /api/play/<filmId>
 *   3. Client's wallet signs + broadcasts a P2PKH tx
 *   4. Client retries the GET with x-bsv-payment: <txid>
 *   5. Server verifies the tx on WhatsOnChain (via src/x402/server.ts),
 *      records a row in bct_x402_receipts, and returns 200 with JSON:
 *        { playUrl, expiresAt, receiptId, paidSats }
 *
 * The returned playUrl is the canonical `editor.rough_cut` or
 * `editor.trailer_cut` artifact URL from bct_artifacts for the film.
 *
 * 10 sats per watch (~$0.001). Real, auditable, on-chain.
 *
 * One payment = one watch. Replays are rejected by the unique index
 * on (txid, resource_path) in bct_x402_receipts.
 */

import { createClient } from '@supabase/supabase-js';
import { require402 } from '../../src/x402/server.js';

interface VercelRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
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
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, x-bsv-payment',
  );
  res.setHeader(
    'Access-Control-Expose-Headers',
    'x-bsv-payment-version, x-bsv-payment-satoshis-required, x-bsv-payment-address, x-bsv-payment-resource, x-bsv-payment-scheme',
  );
}

// Pricing by tier. Mirrors the Stripe ticket prices so crypto-native
// and credit-card viewers see the same effective price.
//
//   pitch    → FREE  (it's marketing, no film to watch)
//   trailer  → FREE  (trailers drive commissions; free distribution)
//   short    → 1500 sats  (≈ $0.99 at ~$65/BSV)
//   feature  → 4500 sats  (≈ $2.99 at ~$65/BSV)
//
// Sats conversion is intentionally hardcoded at roughly mid-price BSV
// for demo stability. When we wire a live price oracle later, this
// table becomes a function of (tier, live_bsv_usd).
const PLAY_PRICE_BY_TIER: Record<string, number> = {
  pitch:   0,
  trailer: 0,
  short:   1500,
  feature: 4500,
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const filmId = Array.isArray(req.query.filmId) ? req.query.filmId[0] : req.query.filmId;
  if (!filmId) { res.status(400).json({ error: 'filmId required' }); return; }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase env missing' });
    return;
  }
  const supa = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // Load the film — need producer_address (the pay-to) + status
  const { data: offer, error: offerErr } = await supa
    .from('bct_offers')
    .select('id, title, producer_address, status, token_ticker, tier')
    .eq('id', filmId)
    .maybeSingle();

  if (offerErr) { res.status(500).json({ error: offerErr.message }); return; }
  if (!offer) { res.status(404).json({ error: 'film not found' }); return; }
  if (!offer.producer_address) {
    res.status(500).json({ error: 'film has no pay-to address configured' });
    return;
  }

  // Look up the price for this tier. Free tiers (pitch, trailer) skip
  // the 402 gate entirely — they're marketing and should play for
  // anyone who asks. Paid tiers go through the full x402 flow.
  const priceSats = PLAY_PRICE_BY_TIER[offer.tier] ?? 0;
  let receipt: { amountSats: number; txid: string; receiptId: number } | null = null;

  if (priceSats > 0) {
    const verified = await require402(req, res, {
      recipientAddress: offer.producer_address,
      satsRequired: priceSats,
      resourcePath: `/api/play/${filmId}`,
      resourceType: 'play',
      offerId: filmId,
    });
    if (!verified) return;  // 402 response already written
    receipt = verified;
  }

  // Payment verified. Find the canonical playable artifact:
  //   1. editor.rough_cut (feature/short) — the full film JSON playlist
  //   2. editor.trailer_cut (trailer)
  //   3. any scene.*.video as a last-resort preview
  const { data: arts } = await supa
    .from('bct_artifacts')
    .select('id, step_id, role, kind, url')
    .eq('offer_id', filmId)
    .is('superseded_by', null)
    .in('kind', ['video', 'text'])
    .order('id', { ascending: true });

  const pickPlayUrl = (rows: Array<{ step_id: string | null; kind: string; url: string }>): string | null => {
    const rough = rows.find((a) => a.step_id === 'editor.rough_cut');
    if (rough) return rough.url;
    const trailer = rows.find((a) => a.step_id === 'editor.trailer_cut');
    if (trailer) return trailer.url;
    const firstVideo = rows.find((a) => a.kind === 'video');
    if (firstVideo) return firstVideo.url;
    return null;
  };

  const playUrl = pickPlayUrl((arts as any) || []);
  if (!playUrl) {
    res.status(404).json({ error: 'film has no playable artifact yet' });
    return;
  }

  res.status(200).json({
    ok: true,
    filmId,
    title: offer.title,
    ticker: offer.token_ticker,
    tier: offer.tier,
    playUrl,
    priceSats,
    free: priceSats === 0,
    paidSats: receipt?.amountSats ?? 0,
    paymentTxid: receipt?.txid ?? null,
    receiptId: receipt?.receiptId ?? null,
    validForSeconds: 3600,
  });
}
