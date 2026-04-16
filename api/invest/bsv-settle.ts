/**
 * POST /api/invest/bsv-settle
 *
 * Settles a $bMovies platform token purchase paid via BSV on-chain.
 * The client (invest.html) uses a BRC-100 wallet to send BSV to the
 * treasury address, then POSTs the txid here for verification.
 *
 * Body:
 *   { txid: string, accountId: string, tokens: number }
 *
 * Flow:
 *   1. Validate inputs (account exists, KYC verified, token bounds)
 *   2. Look up bonding curve price via current sold_supply
 *   3. Verify txid on WhatsOnChain (tx exists, output pays treasury,
 *      output value >= expected cost in sats)
 *   4. Insert bct_platform_investments row, bump sold_supply,
 *      recalculate current_tranche_price_cents
 *
 * BSV/USD conversion uses a fixed rate (default $40/BSV) via
 * env var BSV_USD_RATE. 1 BSV = 100,000,000 sats.
 * At $40/BSV: 1 cent = 2,500 sats.
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

const MIN_TOKENS = 1_000;
const MAX_TOKENS = 10_000_000;
const SATS_PER_BSV = 100_000_000;

// ── Bonding curve (inlined to avoid import resolution issues in
//    Vercel serverless — same logic as src/token/bonding-curve.ts) ──

const TRANCHES = [
  { tranche: 1,  pricePerTokenCents: 0.1,   floor: 0,           ceiling: 100_000_000 },
  { tranche: 2,  pricePerTokenCents: 0.5,   floor: 100_000_000, ceiling: 200_000_000 },
  { tranche: 3,  pricePerTokenCents: 1.0,   floor: 200_000_000, ceiling: 300_000_000 },
  { tranche: 4,  pricePerTokenCents: 2.5,   floor: 300_000_000, ceiling: 400_000_000 },
  { tranche: 5,  pricePerTokenCents: 5.0,   floor: 400_000_000, ceiling: 500_000_000 },
  { tranche: 6,  pricePerTokenCents: 10.0,  floor: 500_000_000, ceiling: 600_000_000 },
  { tranche: 7,  pricePerTokenCents: 20.0,  floor: 600_000_000, ceiling: 700_000_000 },
  { tranche: 8,  pricePerTokenCents: 40.0,  floor: 700_000_000, ceiling: 800_000_000 },
  { tranche: 9,  pricePerTokenCents: 70.0,  floor: 800_000_000, ceiling: 900_000_000 },
  { tranche: 10, pricePerTokenCents: 100.0, floor: 900_000_000, ceiling: 1_000_000_000 },
] as const;

function trancheForSupply(soldSupply: number) {
  for (const t of TRANCHES) {
    if (soldSupply < t.ceiling) return t;
  }
  return TRANCHES[TRANCHES.length - 1];
}

function computeCost(soldSupply: number, tokensToBuy: number) {
  let remaining = tokensToBuy;
  let cursor = soldSupply;
  let totalCents = 0;
  const breakdown: Array<{ tranche: number; tokens: number; pricePerTokenCents: number }> = [];

  while (remaining > 0) {
    const t = trancheForSupply(cursor);
    const availableInTranche = t.ceiling - cursor;
    const take = Math.min(remaining, availableInTranche);
    totalCents += take * t.pricePerTokenCents;
    breakdown.push({ tranche: t.tranche, tokens: take, pricePerTokenCents: t.pricePerTokenCents });
    cursor += take;
    remaining -= take;
  }

  totalCents = Math.round(totalCents * 100) / 100;
  return { totalCents, breakdown };
}

// ── WhatsOnChain TX verification ──

interface WocVout {
  value: number; // BSV (not sats)
  n: number;
  scriptPubKey: {
    addresses?: string[];
    hex?: string;
    type?: string;
  };
}

interface WocTx {
  txid: string;
  vout: WocVout[];
  confirmations?: number;
}

async function verifyTxOnChain(
  txid: string,
  treasuryAddress: string,
  expectedSats: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = `https://api.whatsonchain.com/v1/bsv/main/tx/hash/${txid}`;
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  } catch (err) {
    return { ok: false, error: `WhatsOnChain request failed: ${err instanceof Error ? err.message : err}` };
  }

  if (res.status === 404) {
    return { ok: false, error: `Transaction ${txid} not found on WhatsOnChain. It may not be broadcast yet — wait a moment and retry.` };
  }
  if (!res.ok) {
    return { ok: false, error: `WhatsOnChain returned ${res.status}: ${await res.text().catch(() => '')}` };
  }

  let tx: WocTx;
  try {
    tx = (await res.json()) as WocTx;
  } catch {
    return { ok: false, error: 'Failed to parse WhatsOnChain response' };
  }

  // Find an output that pays to the treasury address with sufficient value
  const treasuryOutputs = (tx.vout || []).filter(
    (o) => o.scriptPubKey?.addresses?.includes(treasuryAddress),
  );

  if (treasuryOutputs.length === 0) {
    return {
      ok: false,
      error: `Transaction ${txid} does not pay to the treasury address (${treasuryAddress}). Check that your wallet sent to the correct address.`,
    };
  }

  // WoC returns value in BSV (float), convert to sats
  const totalSatsToTreasury = treasuryOutputs.reduce(
    (sum, o) => sum + Math.round(o.value * SATS_PER_BSV),
    0,
  );

  if (totalSatsToTreasury < expectedSats) {
    return {
      ok: false,
      error: `Transaction pays ${totalSatsToTreasury.toLocaleString()} sats to treasury but ${expectedSats.toLocaleString()} sats required (shortfall: ${(expectedSats - totalSatsToTreasury).toLocaleString()} sats).`,
    };
  }

  return { ok: true };
}

// ── Handler ──

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
    res.status(500).json({ error: 'env missing' });
    return;
  }

  // BSV/USD rate: default $40. 1 cent = (SATS_PER_BSV / (rate * 100)) sats
  const bsvUsdRate = Number(process.env.BSV_USD_RATE) || 40;
  const satsPerCent = SATS_PER_BSV / (bsvUsdRate * 100); // 2500 at $40

  // Parse body
  let body: { txid?: string; accountId?: string; tokens?: number };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const txid = (body.txid || '').trim();
  if (!txid || !/^[a-fA-F0-9]{64}$/.test(txid)) {
    res.status(400).json({ error: 'txid must be a 64-character hex string' });
    return;
  }

  if (!body.accountId) {
    res.status(400).json({ error: 'accountId required' });
    return;
  }

  const tokens = Math.floor(Number(body.tokens || 0));
  if (!Number.isFinite(tokens) || tokens < MIN_TOKENS || tokens > MAX_TOKENS) {
    res.status(400).json({ error: `tokens must be between ${MIN_TOKENS.toLocaleString()} and ${MAX_TOKENS.toLocaleString()}` });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supa = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // 1. Verify account exists
  const { data: account } = await supa
    .from('bct_accounts')
    .select('id, email')
    .eq('id', body.accountId)
    .maybeSingle();
  if (!account) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }

  // 2. Verify KYC status = 'verified'
  const { data: kyc } = await supa
    .from('bct_user_kyc')
    .select('status')
    .eq('account_id', body.accountId)
    .maybeSingle();
  if (!kyc || kyc.status !== 'verified') {
    res.status(403).json({ error: 'KYC verification required to purchase $bMovies' });
    return;
  }

  // 3. Fetch platform config (sold_supply, treasury_address)
  const { data: cfg, error: cfgErr } = await supa
    .from('bct_platform_config')
    .select('sold_supply, total_supply, treasury_address')
    .eq('id', 'platform')
    .maybeSingle();
  if (cfgErr || !cfg) {
    res.status(500).json({ error: 'Platform config unavailable' });
    return;
  }

  const soldSupply = Number(cfg.sold_supply);
  const totalSupply = Number(cfg.total_supply);
  const treasuryAddress = cfg.treasury_address as string;

  if (!treasuryAddress) {
    res.status(500).json({ error: 'Treasury address not configured' });
    return;
  }

  const remaining = totalSupply - soldSupply;
  if (tokens > remaining) {
    res.status(400).json({ error: `Only ${remaining.toLocaleString()} $bMovies remain` });
    return;
  }

  // 4. Check for duplicate txid
  const { data: existing } = await supa
    .from('bct_platform_investments')
    .select('id')
    .eq('settled_txid', txid)
    .maybeSingle();
  if (existing) {
    res.status(409).json({ error: 'This transaction has already been used for a purchase' });
    return;
  }

  // 5. Compute cost via bonding curve
  const { totalCents, breakdown } = computeCost(soldSupply, tokens);
  const expectedSats = Math.ceil(totalCents * satsPerCent);

  // 6. Verify transaction on WhatsOnChain
  const verification = await verifyTxOnChain(txid, treasuryAddress, expectedSats);
  if (!verification.ok) {
    res.status(400).json({ error: verification.error });
    return;
  }

  // 7. Insert investment row
  const { error: insertErr } = await supa.from('bct_platform_investments').insert({
    account_id: body.accountId,
    tokens_purchased: tokens,
    price_per_token_cents: breakdown[0].pricePerTokenCents,
    total_paid_cents: totalCents,
    status: 'completed',
    settled_txid: txid,
    payment_method: 'bsv',
  });
  if (insertErr) {
    console.error('[bsv-settle] insert error:', insertErr);
    res.status(500).json({ error: 'Failed to record investment' });
    return;
  }

  // 8. Bump sold_supply and recalculate tranche price
  const newSoldSupply = soldSupply + tokens;
  const newTranche = trancheForSupply(newSoldSupply);

  const { error: updateErr } = await supa
    .from('bct_platform_config')
    .update({
      sold_supply: newSoldSupply,
      current_tranche_price_cents: newTranche.pricePerTokenCents,
    })
    .eq('id', 'platform');
  if (updateErr) {
    console.error('[bsv-settle] config update error:', updateErr);
    // Investment was recorded — don't fail the request, just log
  }

  res.status(200).json({
    success: true,
    tokens,
    totalCents,
    totalSats: expectedSats,
    txid,
    newSoldSupply,
    currentTranche: newTranche.tranche,
    currentPricePerTokenCents: newTranche.pricePerTokenCents,
    breakdown,
  });
}
