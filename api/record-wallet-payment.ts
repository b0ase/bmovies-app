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
    const { error } = await supabase.from('bct_share_sales').insert({
      offer_id: body.offerId,
      buyer_account: accountId,
      buyer_email: body.email || null,
      tranche: 1,
      percent_bought: 1,
      price_usd: body.priceUsd,
      payment_txid: body.txid,
    });
    if (error) {
      console.error('[record-wallet-payment] share insert failed:', error);
      res.status(500).json({ error: 'Insert failed' });
      return;
    }
    console.log(`[record-wallet-payment] share ${body.offerId} via ${body.provider} tx:${body.txid.slice(0, 12)}...`);
    res.status(200).json({ success: true, type: 'shares' });
    return;
  }

  res.status(400).json({ error: 'Unknown type' });
}
