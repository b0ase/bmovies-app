/**
 * POST /api/handcash/authorize
 *
 * Starts a HandCash Connect OAuth flow. Used for two intents:
 *
 *   1. { intent: 'link_only' } — user explicitly links HandCash to
 *      their bMovies account from /account. No purchase follow-up.
 *   2. { intent: 'buy_shares', offerId, priceUsd } — user clicked
 *      "Buy 1% with HandCash" on /offer.html. The callback will both
 *      store the authToken AND execute the pay() immediately.
 *   3. { intent: 'buy_platform', priceUsd } — user investing in the
 *      $bMovies platform token.
 *
 * Requires a valid Supabase JWT — this does NOT replace our auth; it
 * sits on top of it. Google/Twitter/Email sign-in all produce the
 * same Supabase session that's checked here. KYC is not checked by
 * this endpoint (the downstream purchase endpoints enforce KYC).
 *
 * Response:
 *   { authorizeUrl: string, state: string }
 *
 * Env:
 *   HANDCASH_APP_ID, HANDCASH_APP_SECRET     required
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  required
 *   NEXT_PUBLIC_APP_ORIGIN                   optional, defaults to bmovies.online
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

type Intent = 'link_only' | 'buy_shares' | 'buy_platform';

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

  // ── Auth: require a Supabase JWT. Do NOT accept anonymous requests.
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';
  if (!token) {
    res.status(401).json({ error: 'Sign in first (Google/Twitter/Email).', reason: 'signin_required' });
    return;
  }

  let body: {
    intent?: Intent;
    offerId?: string;
    priceUsd?: number;
    returnUrl?: string;
  };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const intent: Intent = body.intent || 'link_only';
  if (!['link_only', 'buy_shares', 'buy_platform'].includes(intent)) {
    res.status(400).json({ error: 'invalid intent' });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // Verify the JWT and get the bMovies account
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }
  const { data: account } = await supabase
    .from('bct_accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (!account) {
    res.status(403).json({ error: 'No bMovies account linked' });
    return;
  }

  // Validate purchase intents carry the required fields
  if (intent === 'buy_shares' && (!body.offerId || !body.priceUsd || body.priceUsd < 1)) {
    res.status(400).json({ error: 'buy_shares requires offerId + priceUsd >= 1' });
    return;
  }
  if (intent === 'buy_platform' && (!body.priceUsd || body.priceUsd < 1)) {
    res.status(400).json({ error: 'buy_platform requires priceUsd >= 1' });
    return;
  }

  // Generate a random state token. The callback will look this up in
  // bct_handcash_pending to recover the intent + offer details.
  const { randomBytes } = await import('node:crypto');
  const state = randomBytes(24).toString('base64url');

  const { error: pendErr } = await supabase.from('bct_handcash_pending').insert({
    state,
    account_id: account.id,
    intent,
    offer_id: body.offerId || null,
    price_usd: body.priceUsd || null,
    return_url: body.returnUrl || null,
  });
  if (pendErr) {
    console.error('[handcash/authorize] pending insert:', pendErr);
    res.status(500).json({ error: 'Failed to persist auth state' });
    return;
  }

  // Build the redirect URL via the SDK
  let redirectionUrl: string;
  try {
    const { HandCashConnect } = await import('@handcash/handcash-connect');
    const hc = new HandCashConnect({ appId, appSecret });
    redirectionUrl = hc.getRedirectionUrl({
      permissions: 'PAY',
      redirectUrl: `${APP_ORIGIN}/api/handcash/callback`,
      state,
    } as unknown as Parameters<typeof hc.getRedirectionUrl>[0]);
  } catch (err) {
    console.error('[handcash/authorize] SDK error:', err);
    res.status(500).json({ error: 'HandCash SDK failed', detail: err instanceof Error ? err.message : String(err) });
    return;
  }

  res.status(200).json({ authorizeUrl: redirectionUrl, state, intent });
}
