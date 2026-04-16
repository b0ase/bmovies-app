/**
 * POST /api/invest/checkout
 *
 * Creates a Stripe Checkout Session for a $bMovies platform token
 * purchase. Caller has already completed KYC (checked client-side
 * against /api/kyc-verify). After payment, Stripe fires the webhook
 * which inserts the investment row and bumps bct_platform_config.sold_supply.
 *
 * Body:
 *   { tokens: number, accountId: string, email?: string }
 *
 * Response:
 *   { url: string, totalCents: number, pricePerTokenCents: number }
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

const MIN_TOKENS = 1000;       // 0.000001% — smallest tranche
const MAX_TOKENS = 10_000_000; // 1% — hard cap per checkout

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const key = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'env missing' });
    return;
  }

  let body: { tokens?: number; accountId?: string; email?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const tokens = Math.floor(Number(body.tokens || 0));
  if (!Number.isFinite(tokens) || tokens < MIN_TOKENS || tokens > MAX_TOKENS) {
    res.status(400).json({
      error: `tokens must be between ${MIN_TOKENS} and ${MAX_TOKENS}`,
    });
    return;
  }

  if (!body.accountId) {
    res.status(400).json({ error: 'accountId required' });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supa = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // Fetch current price from bct_platform_config
  const { data: cfg, error: cfgErr } = await supa
    .from('bct_platform_config')
    .select('current_tranche_price_cents, sold_supply, total_supply')
    .eq('id', 'platform')
    .maybeSingle();
  if (cfgErr || !cfg) {
    res.status(500).json({ error: 'platform config unavailable' });
    return;
  }

  const remaining = Number(cfg.total_supply) - Number(cfg.sold_supply);
  if (tokens > remaining) {
    res.status(400).json({
      error: `only ${remaining.toLocaleString()} $bMovies left in this tranche`,
    });
    return;
  }

  const pricePerTokenCents = Number(cfg.current_tranche_price_cents);
  const totalCents = Math.round(tokens * pricePerTokenCents);
  if (totalCents < 50) {
    res.status(400).json({ error: 'Stripe minimum is $0.50' });
    return;
  }

  // Verify account exists + is KYC-cleared (redundant with client-side
  // gate, but never trust the client)
  const { data: account } = await supa
    .from('bct_accounts')
    .select('id, email')
    .eq('id', body.accountId)
    .maybeSingle();
  if (!account) { res.status(404).json({ error: 'account not found' }); return; }

  const { data: kyc } = await supa
    .from('bct_user_kyc')
    .select('status')
    .eq('account_id', body.accountId)
    .maybeSingle();
  if (!kyc || kyc.status !== 'verified') {
    res.status(403).json({ error: 'KYC verification required to purchase $bMovies' });
    return;
  }

  // Create Stripe session
  let Stripe: typeof import('stripe').default;
  try {
    const mod = await import('stripe');
    Stripe = mod.default;
  } catch {
    res.status(500).json({ error: 'stripe package not installed' });
    return;
  }
  const stripe = new Stripe(key, { apiVersion: '2026-03-25.dahlia' });

  const origin = 'https://bmovies.online';
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `$bMovies — ${tokens.toLocaleString()} platform shares`,
              description:
                `${tokens.toLocaleString()} $bMovies at $${(pricePerTokenCents / 100).toFixed(4)} per token. ` +
                `Entitles you to a pro-rata share of the 1% platform fee on every film ` +
                `commissioned through bMovies.`,
            },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      customer_email: body.email || account.email || undefined,
      success_url: `${origin}/account.html?tab=platform&investment=success`,
      cancel_url: `${origin}/invest.html?cancelled=true`,
      metadata: {
        product: 'bmovies-platform-token',
        tokens: String(tokens),
        pricePerTokenCents: String(pricePerTokenCents),
        accountId: body.accountId,
      },
    });

    // Pre-insert a pending investment row so we have a paper trail even
    // if Stripe never fires the webhook
    await supa.from('bct_platform_investments').insert({
      account_id: body.accountId,
      tokens_purchased: tokens,
      price_per_token_cents: pricePerTokenCents,
      total_paid_cents: totalCents,
      status: 'pending',
      stripe_session_id: session.id,
    });

    res.status(200).json({
      url: session.url,
      totalCents,
      pricePerTokenCents,
      sessionId: session.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[invest] stripe session error:', msg);
    res.status(500).json({ error: msg });
  }
}
