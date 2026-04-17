/**
 * GET /api/handcash/callback
 *
 * The HandCash OAuth return URL. Receives:
 *   ?authToken=<opaque>&state=<our-state>
 *
 * Steps:
 *   1. Look up bct_handcash_pending by state; verify not expired +
 *      not already consumed.
 *   2. Store authToken + handle on bct_accounts (for one-click
 *      subsequent purchases).
 *   3. If intent was a purchase, call account.wallet.pay() via the
 *      SDK NOW — same request, no extra round-trip. Record the result
 *      in bct_share_sales or bct_platform_investments.
 *   4. Redirect the user's browser to a success/failure URL.
 *
 * This is the ONLY place a HandCash authToken flows into our DB.
 * Never exposed to the client.
 */

interface VercelRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
  json(body: unknown): VercelResponse;
}

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN || 'https://bmovies.online';
const PAYOUT_HANDLE = process.env.HANDCASH_PAYOUT_HANDLE || '$bmovies';

function redirect(res: VercelResponse, url: string): void {
  res.setHeader('Location', url);
  res.status(302).end('');
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const appId = process.env.HANDCASH_APP_ID;
  const appSecret = process.env.HANDCASH_APP_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!appId || !appSecret || !supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'HandCash or Supabase env missing' });
    return;
  }

  // Parse query — Vercel's req.query is usually populated, but fall back to req.url.
  const url = new URL(req.url || '/', APP_ORIGIN);
  const authToken = url.searchParams.get('authToken') || (req.query?.authToken as string | undefined) || '';
  const state = url.searchParams.get('state') || (req.query?.state as string | undefined) || '';

  if (!authToken || !state) {
    redirect(res, `${APP_ORIGIN}/account?tab=wallet&handcash=error&reason=missing_params`);
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // Resolve the pending row
  const { data: pending } = await supabase
    .from('bct_handcash_pending')
    .select('state, account_id, intent, offer_id, price_usd, return_url, expires_at, consumed_at')
    .eq('state', state)
    .maybeSingle();

  if (!pending) {
    redirect(res, `${APP_ORIGIN}/account?tab=wallet&handcash=error&reason=unknown_state`);
    return;
  }
  if (pending.consumed_at) {
    redirect(res, `${APP_ORIGIN}/account?tab=wallet&handcash=error&reason=state_replayed`);
    return;
  }
  if (new Date(pending.expires_at) < new Date()) {
    redirect(res, `${APP_ORIGIN}/account?tab=wallet&handcash=error&reason=state_expired`);
    return;
  }

  // Mark consumed early to prevent replay
  await supabase.from('bct_handcash_pending').update({ consumed_at: new Date().toISOString() }).eq('state', state);

  // Load the HandCash SDK and exchange the authToken for an account
  let hc: InstanceType<typeof import('@handcash/handcash-connect').HandCashConnect>;
  try {
    const { HandCashConnect } = await import('@handcash/handcash-connect');
    hc = new HandCashConnect({ appId, appSecret });
  } catch (err) {
    console.error('[handcash/callback] SDK import:', err);
    redirect(res, `${APP_ORIGIN}/account?tab=wallet&handcash=error&reason=sdk_failed`);
    return;
  }

  let account: Awaited<ReturnType<typeof hc.getAccountFromAuthToken>>;
  try {
    account = hc.getAccountFromAuthToken(authToken);
  } catch (err) {
    console.error('[handcash/callback] authToken exchange:', err);
    redirect(res, `${APP_ORIGIN}/account?tab=wallet&handcash=error&reason=invalid_token`);
    return;
  }

  // Fetch the user's public profile (gives us their $handle)
  let handle: string | null = null;
  try {
    const profile = await account.profile.getCurrentProfile();
    handle = profile?.publicProfile?.handle ? `$${profile.publicProfile.handle}` : null;
  } catch (err) {
    console.warn('[handcash/callback] profile fetch failed (non-fatal):', err);
  }

  // Persist the link on the account
  await supabase
    .from('bct_accounts')
    .update({
      handcash_auth_token: authToken,
      handcash_authed_at: new Date().toISOString(),
      handcash_handle: handle,
    })
    .eq('id', pending.account_id);

  // Determine the user's final redirect target
  const baseReturn = pending.return_url && /^https?:\/\//.test(pending.return_url)
    ? pending.return_url
    : `${APP_ORIGIN}/account?tab=wallet&handcash=linked`;

  // If this was a pure link flow, we're done.
  if (pending.intent === 'link_only') {
    redirect(res, baseReturn);
    return;
  }

  // ── Purchase flow — execute wallet.pay() NOW ──────────────────
  const priceUsd = Number(pending.price_usd);
  const offerId = pending.offer_id;

  // KYC gate (same rule as everywhere else: bct_user_kyc.status='verified')
  const { data: kyc } = await supabase
    .from('bct_user_kyc')
    .select('status')
    .eq('account_id', pending.account_id)
    .maybeSingle();
  if (!kyc || kyc.status !== 'verified') {
    redirect(res, `${APP_ORIGIN}/kyc.html?next=${encodeURIComponent(baseReturn)}`);
    return;
  }

  try {
    const payResult = await account.wallet.pay({
      description: pending.intent === 'buy_shares'
        ? `bMovies royalty share · ${offerId}`
        : 'bMovies platform token',
      payments: [
        {
          destination: PAYOUT_HANDLE,
          currencyCode: 'USD',
          sendAmount: priceUsd,
        },
      ],
    });

    // Record the purchase. Schemas:
    //   bct_share_sales: offer_id, account_id, price_usd, tx_id, ...
    //   bct_platform_investments: account_id, usd, tx_id, ...
    // Either table already has RLS for service_role writes.
    if (pending.intent === 'buy_shares' && offerId) {
      // Real schema columns: offer_id, buyer_account, tranche,
      // percent_bought, price_usd, payment_txid, settlement_provider,
      // settlement_tx_id. Default the tranche to 1 when the client
      // didn't supply one (we can enrich later by reading current
      // tranche off bct_film_stats at purchase time).
      await supabase.from('bct_share_sales').insert({
        offer_id: offerId,
        buyer_account: pending.account_id,
        tranche: 1,
        percent_bought: 1.00,
        price_usd: priceUsd,
        payment_txid: payResult.transactionId,
        settlement_provider: 'handcash',
        settlement_tx_id: payResult.transactionId,
      } as Record<string, unknown>);
    } else if (pending.intent === 'buy_platform') {
      // Platform-token purchases need tokens_purchased +
      // price_per_token_cents. For MVP we derive from priceUsd at the
      // caller's posted tranche price, but since that info isn't in
      // pending, mark the investment pending with status='pending'
      // and rely on a follow-up reconciliation step (not shipping
      // platform-token HandCash purchase in this commit — the
      // endpoint accepts the intent but this branch is stubbed).
      console.warn('[handcash/callback] buy_platform not fully implemented — recording placeholder');
      await supabase.from('bct_platform_investments').insert({
        account_id: pending.account_id,
        tokens_purchased: 1,
        price_per_token_cents: priceUsd * 100,
        total_paid_cents: Math.round(priceUsd * 100),
        status: 'pending',
        settled_txid: payResult.transactionId,
        settlement_provider: 'handcash',
      } as Record<string, unknown>);
    }

    // Bounce to a success view. If the caller gave us a return URL, use it; otherwise fall back.
    const successUrl = pending.return_url
      ? `${baseReturn}${baseReturn.includes('?') ? '&' : '?'}purchase=success&tx=${encodeURIComponent(payResult.transactionId)}`
      : offerId
        ? `${APP_ORIGIN}/offer.html?id=${encodeURIComponent(offerId)}&purchase=success&tx=${encodeURIComponent(payResult.transactionId)}`
        : `${APP_ORIGIN}/account?tab=wallet&handcash=linked&purchase=success`;
    redirect(res, successUrl);
  } catch (err) {
    console.error('[handcash/callback] pay failed:', err);
    const msg = err instanceof Error ? err.message : String(err);
    const failUrl = offerId
      ? `${APP_ORIGIN}/offer.html?id=${encodeURIComponent(offerId)}&purchase=failed&reason=${encodeURIComponent(msg)}`
      : `${APP_ORIGIN}/account?tab=wallet&handcash=linked&purchase=failed&reason=${encodeURIComponent(msg)}`;
    redirect(res, failUrl);
  }
}
