/**
 * POST /api/record-wallet-payment
 *
 * Records a wallet-based payment (BRC-100, HandCash, MetaMask, Phantom)
 * directly into the DB. Unlike Stripe which flows through a webhook,
 * wallet payments are verified client-side and written here.
 *
 * Request body:
 *   {
 *     type: 'ticket' | 'shares',
 *     offerId: string,
 *     title: string,
 *     ticker?: string,
 *     priceUsd: number,
 *     sats?: number,       // BSV wallets
 *     provider: 'brc100' | 'handcash' | 'metamask' | 'phantom',
 *     subProvider?: string,
 *     txid: string,
 *     chain?: 'bsv' | 'eth' | 'sol',
 *     fromAddress?: string,
 *     email?: string,
 *   }
 *
 * For production this endpoint should verify the txid against the
 * chain before inserting. For the hackathon we trust the client
 * because the worst case is a duplicate sale record with a fake txid.
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
    res.status(500).json({ error: 'Supabase not configured' });
    return;
  }

  let body: {
    type?: string;
    offerId?: string;
    title?: string;
    ticker?: string;
    priceUsd?: number;
    sats?: number;
    provider?: string;
    subProvider?: string;
    txid?: string;
    chain?: string;
    fromAddress?: string;
    // Cross-chain purchases (MetaMask / Phantom) pay on ETH/SOL but
    // the 1sat BSV-21 royalty share needs to land somewhere on BSV.
    // Required when type='shares' and chain in ('eth','sol').
    bsvDeliveryAddress?: string;
    email?: string;
  };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  if (!body.offerId || !body.txid || !body.type || !body.priceUsd) {
    res.status(400).json({ error: 'offerId, txid, type, priceUsd required' });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // Resolve account by email if provided
  let accountId: string | null = null;
  if (body.email) {
    const { data: existing } = await supabase
      .from('bct_accounts')
      .select('id')
      .eq('email', body.email)
      .maybeSingle();
    if (existing) accountId = existing.id;
    else {
      const { data: created } = await supabase
        .from('bct_accounts')
        .insert({ email: body.email, display_name: body.email.split('@')[0] })
        .select('id')
        .single();
      accountId = created?.id ?? null;
    }
  }

  if (body.type === 'ticket') {
    const { error } = await supabase.from('bct_ticket_sales').insert({
      offer_id: body.offerId,
      buyer_account: accountId,
      buyer_email: body.email || null,
      price_usd: body.priceUsd,
      payment_txid: body.txid,
    });
    if (error) {
      console.error('[record-wallet-payment] ticket insert failed:', error);
      res.status(500).json({ error: 'Insert failed' });
      return;
    }
    console.log(`[record-wallet-payment] ticket ${body.offerId} via ${body.provider} tx:${body.txid.slice(0, 12)}...`);
    res.status(200).json({ success: true, type: 'ticket' });
    return;
  }

  if (body.type === 'shares') {
    // Cross-chain purchases (ETH/Base/Solana, native or USDC) require
    // a BSV delivery address so the settlement worker knows where to
    // send the 1sat BSV-21 share. BSV-native payments (BRC-100 /
    // HandCash) settle to the paying address automatically, so the
    // field stays optional there.
    const crossChainNames = new Set(['eth', 'base', 'base-usdc', 'sol', 'solana-usdc']);
    const isCrossChain = crossChainNames.has(body.chain || '');
    if (isCrossChain && !body.bsvDeliveryAddress) {
      res.status(400).json({ error: 'bsvDeliveryAddress required for cross-chain share purchases' });
      return;
    }
    if (body.bsvDeliveryAddress && !/^[13][1-9A-HJ-NP-Za-km-z]{25,39}$/.test(body.bsvDeliveryAddress)) {
      res.status(400).json({ error: 'bsvDeliveryAddress does not match BSV P2PKH format' });
      return;
    }

    // Cross-chain rows start as settlement_status='pending'; a
    // worker picks them up and transfers the 1sat BSV-21 share to
    // bsv_delivery_address, then updates settlement_status='settled'.
    // BSV-native rows are settled immediately (the payment tx itself
    // is the settlement).
    const { error } = await supabase.from('bct_share_sales').insert({
      offer_id: body.offerId,
      buyer_account: accountId,
      buyer_email: body.email || null,
      tranche: 1,
      percent_bought: 1,
      price_usd: body.priceUsd,
      payment_txid: body.txid,
      payment_chain: body.chain || 'bsv',
      bsv_delivery_address: body.bsvDeliveryAddress || null,
      settlement_status: isCrossChain ? 'pending' : 'settled',
    });
    if (error) {
      console.error('[record-wallet-payment] share insert failed:', error);
      res.status(500).json({ error: 'Insert failed: ' + error.message });
      return;
    }
    console.log(
      `[record-wallet-payment] share ${body.offerId} via ${body.provider} (${body.chain}) tx:${body.txid.slice(0, 12)}... ` +
      (isCrossChain ? `pending settle to ${body.bsvDeliveryAddress?.slice(0, 8)}…` : 'settled'),
    );
    res.status(200).json({
      success: true,
      type: 'shares',
      settlementStatus: isCrossChain ? 'pending' : 'settled',
    });
    return;
  }

  res.status(400).json({ error: 'Unknown type' });
}
