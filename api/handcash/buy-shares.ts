/**
 * POST /api/handcash/buy-shares
 *
 * HandCash settlement for a royalty-share purchase. Two-path:
 *
 *   A) Account has a stored HandCash authToken → call account.wallet
 *      .pay() server-side right now and return the receipt.
 *   B) Account not yet linked → return an authorize URL that the
 *      client should redirect to. After OAuth completes, the callback
 *      at /api/handcash/callback executes the pay() and redirects
 *      the user to the offer page with purchase=success.
 *
 * Either way, the actual settlement is a real BSV transaction through
 * HandCash's non-custodial wallet infrastructure — no fiat rail, no
 * Stripe, compliant with the commitment made in the 410 stub on
 * /api/buy-shares. KYC required (bct_user_kyc.status='verified').
 *
 * Body:
 *   { offerId, title, ticker, priceUsd, returnUrl? }
 *
 * Headers:
 *   Authorization: Bearer <supabase JWT>
 *
 * Response:
 *   200 { receipt: { transactionId, ... } }                    — path A
 *   202 { authorizeUrl: string, needsAuth: true }              — path B
 *   403 { reason: 'kyc_required' | 'signin_required' | ... }
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN || 'https://bmovies.online';
const PAYOUT_HANDLE = process.env.HANDCASH_PAYOUT_HANDLE || '$bmovies';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const appId = process.env.HANDCASH_APP_ID;
  const appSecret = process.env.HANDCASH_APP_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!appId || !appSecret || !supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'HandCash or Supabase env missing' });
    return;
  }

  // Require Supabase JWT (sits on top of Google/Twitter/Email sign-in)
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const jwt = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';
  if (!jwt) {
    res.status(401).json({ error: 'Sign in required', reason: 'signin_required' });
    return;
  }

  let body: { offerId?: string; title?: string; ticker?: string; priceUsd?: number; returnUrl?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const offerId = body.offerId?.trim();
  const priceUsd = Number(body.priceUsd);
  if (!offerId || !priceUsd || priceUsd < 1) {
    res.status(400).json({ error: 'offerId and priceUsd (>=1) required' });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // Resolve the account + stored HandCash credentials
  const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
  if (authErr || !user) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }
  const { data: account } = await supabase
    .from('bct_accounts')
    .select('id, handcash_auth_token')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (!account) {
    res.status(403).json({ error: 'No bMovies account' });
    return;
  }

  // KYC gate — same rule as the rest of the securities paths
  const { data: kyc } = await supabase
    .from('bct_user_kyc')
    .select('status')
    .eq('account_id', account.id)
    .maybeSingle();
  if (!kyc || kyc.status !== 'verified') {
    res.status(403).json({ error: 'KYC verification required', reason: 'kyc_required', next: '/kyc.html' });
    return;
  }

  // ── Path B: No stored token → start OAuth, callback will pay() ──
  if (!account.handcash_auth_token) {
    const { randomBytes } = await import('node:crypto');
    const state = randomBytes(24).toString('base64url');
    await supabase.from('bct_handcash_pending').insert({
      state,
      account_id: account.id,
      intent: 'buy_shares',
      offer_id: offerId,
      price_usd: priceUsd,
      return_url: body.returnUrl || null,
    });
    try {
      const { HandCashConnect } = await import('@handcash/handcash-connect');
      const hc = new HandCashConnect({ appId, appSecret });
      const authorizeUrl = hc.getRedirectionUrl({
        permissions: ['PAY', 'USER_PUBLIC_PROFILE'],
        redirectUrl: `${APP_ORIGIN}/api/handcash/callback`,
        state,
      });
      res.status(202).json({ needsAuth: true, authorizeUrl });
    } catch (err) {
      console.error('[handcash/buy-shares] SDK error:', err);
      res.status(500).json({ error: 'HandCash SDK failed' });
    }
    return;
  }

  // ── Path A: Stored token → execute pay() directly ─────────────
  try {
    const { HandCashConnect } = await import('@handcash/handcash-connect');
    const hc = new HandCashConnect({ appId, appSecret });
    const hcAccount = hc.getAccountFromAuthToken(account.handcash_auth_token);
    const result = await hcAccount.wallet.pay({
      description: `bMovies royalty share · ${body.title || offerId}`,
      payments: [{ destination: PAYOUT_HANDLE, currencyCode: 'USD', sendAmount: priceUsd }],
    });

    await supabase.from('bct_share_sales').insert({
      offer_id: offerId,
      buyer_account: account.id,
      tranche: 1,
      percent_bought: 1.00,
      price_usd: priceUsd,
      payment_txid: result.transactionId,
      settlement_provider: 'handcash',
      settlement_tx_id: result.transactionId,
    } as Record<string, unknown>);

    res.status(200).json({
      ok: true,
      receipt: {
        transactionId: result.transactionId,
        satoshiAmount: result.satoshiAmount,
        fiatAmount: priceUsd,
        fiatCurrency: 'USD',
      },
    });
  } catch (err) {
    // Likely the stored token is no longer valid. Surface a needsAuth
    // response so the client re-triggers the OAuth flow, and clear the
    // dead token.
    console.error('[handcash/buy-shares] pay failed:', err);
    await supabase.from('bct_accounts').update({ handcash_auth_token: null, handcash_authed_at: null }).eq('id', account.id);

    const { randomBytes } = await import('node:crypto');
    const state = randomBytes(24).toString('base64url');
    await supabase.from('bct_handcash_pending').insert({
      state,
      account_id: account.id,
      intent: 'buy_shares',
      offer_id: offerId,
      price_usd: priceUsd,
      return_url: body.returnUrl || null,
    });
    const { HandCashConnect } = await import('@handcash/handcash-connect');
    const hc = new HandCashConnect({ appId, appSecret });
    const authorizeUrl = hc.getRedirectionUrl({
      permissions: ['PAY', 'USER_PUBLIC_PROFILE'],
      redirectUrl: `${APP_ORIGIN}/api/handcash/callback`,
      state,
    });
    res.status(202).json({ needsAuth: true, authorizeUrl, hint: 'stored token rejected, re-link required' });
  }
}
