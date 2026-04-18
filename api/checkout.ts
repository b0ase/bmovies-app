/**
 * POST /api/checkout
 *
 * Creates a Stripe Checkout Session for a $99 bMovies film
 * commission. The visitor is redirected to Stripe's hosted
 * checkout page; after payment, Stripe redirects them to
 * /commission-success.html?session_id=<id> where the KYC step
 * and production pipeline kick off.
 *
 * Request body:
 *   {
 *     title: string,       // the film title from the pitch widget
 *     ticker: string,      // 5-char BSV-21 ticker
 *     synopsis: string,    // the Grok-refined synopsis
 *     tier: string,        // 'feature' | 'blockbuster' etc (for metadata)
 *     email?: string,      // optional — pre-fills Stripe's email field
 *   }
 *
 * Response (200):
 *   { url: string }        // Stripe Checkout URL to redirect to
 *
 * Env:
 *   STRIPE_SECRET_KEY     — required
 *
 * The Stripe webhook (api/stripe-webhook.ts) receives the
 * payment confirmation and creates the bct_pitches row that
 * triggers the swarm.
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

const TIER_PRICES: Record<string, { cents: number; label: string }> = {
  pitch:   { cents: 99,    label: 'Pitch' },
  trailer: { cents: 999,   label: 'Trailer' },
  short:   { cents: 9900,  label: 'Short film' },
  feature: { cents: 99900, label: 'Feature film' },
};

/**
 * Compute the commissioner's royalty share % for a given tier and parent
 * chain. Mirrors the logic in supabase/migrations/0015_dynamic_royalty_splits.sql:
 * unallocated cascade slots roll back to the film's own holders.
 *
 *   trailer → 99 always
 *   short   → 99 fresh, 89 if parent exists
 *   feature → 99 fresh, 89 if parent only, 84 if parent + grandparent
 */
function computeCommissionerPercent(
  tier: string,
  hasParent: boolean,
  hasGrandparent: boolean,
): number {
  if (tier === 'pitch') return 99;
  if (tier === 'trailer') return 99;
  if (tier === 'short') return hasParent ? 89 : 99;
  if (tier === 'feature') {
    if (!hasParent) return 99;
    if (!hasGrandparent) return 89;
    return 84;
  }
  return 99;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    res.status(500).json({ error: 'STRIPE_SECRET_KEY is not configured' });
    return;
  }

  let body: { title?: string; ticker?: string; synopsis?: string; tier?: string; email?: string; parentOfferId?: string; source?: string; supabaseUserId?: string; successPath?: string; isAlt?: boolean };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const title = body.title?.trim() || 'Untitled Film';
  const ticker = body.ticker?.trim() || 'BMOVX';
  const synopsis = (body.synopsis || '').slice(0, 500);
  const tier = (body.tier || 'feature').toLowerCase();
  const parentOfferId = body.parentOfferId?.trim() || undefined;

  const tierInfo = TIER_PRICES[tier] || TIER_PRICES.feature;
  const origin = 'https://bmovies.online';

  // Sign-in gate (KYC is NOT required at commission time).
  //
  // Commissioning pays for a service — the swarm produces a film and
  // delivers it to the commissioner's account as a draft. The file
  // the user gets is an asset (a movie); the 1B royalty-share token
  // mints along with it but sits private. Becoming publicly tradable
  // — listing shares on the exchange or publishing the film to
  // /watch — is where regulated-issuance rules apply, and both
  // endpoints (api/feature/list-shares, api/feature/publish) enforce
  // bct_user_kyc.status='verified' there.
  //
  // Here we only require a signed-in account so the offer has an
  // owner. Accounts without a KYC cert get the commission; they
  // simply can't publish or list shares until they complete KYC from
  // their /account tab. Judge-coupon flow calls /api/feature/start
  // directly (not this endpoint) with source='judge-coupon'.
  {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      res.status(500).json({ error: 'Supabase env vars missing' });
      return;
    }
    if (!body.supabaseUserId) {
      res.status(401).json({
        error: 'Sign in required before commissioning a film.',
        reason: 'signin_required',
        next: '/login',
      });
      return;
    }
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    const { data: account } = await supabase
      .from('bct_accounts')
      .select('id')
      .eq('auth_user_id', body.supabaseUserId)
      .maybeSingle();
    if (!account) {
      res.status(403).json({
        error: 'No bMovies account linked to this user. Complete sign-in first.',
        reason: 'account_missing',
        next: '/account',
      });
      return;
    }
  }

  // Resolve the parent chain so we can compute the actual royalty %
  // the commissioner walks away with. A fresh feature should never be
  // shown as "you own 84%" on the Stripe page — it's 99%.
  let hasParent = false;
  let hasGrandparent = false;
  if (parentOfferId) {
    hasParent = true;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseKey) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
        const { data: parent } = await supabase
          .from('bct_offers')
          .select('parent_offer_id')
          .eq('id', parentOfferId)
          .maybeSingle();
        if (parent?.parent_offer_id) hasGrandparent = true;
      } catch (err) {
        console.warn('[checkout] parent lookup failed, defaulting hasGrandparent=false:', err);
      }
    }
  }
  const commissionerPercent = computeCommissionerPercent(tier, hasParent, hasGrandparent);

  // Stripe SDK — dynamic import so the function cold-starts fast
  // when Stripe isn't needed (e.g., health checks). We use the
  // stripe npm package which MUST be in the project's dependencies.
  let Stripe: typeof import('stripe').default;
  try {
    const mod = await import('stripe');
    Stripe = mod.default;
  } catch {
    res.status(500).json({ error: 'stripe package not installed — run pnpm add stripe' });
    return;
  }

  const stripe = new Stripe(key, { apiVersion: '2026-03-25.dahlia' });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `bMovies — ${tierInfo.label}: "${title}"`,
              description: `${tierInfo.label} tier — you own ${commissionerPercent}% of royalty shares. $${ticker}. ${synopsis.slice(0, 200)}`,
            },
            unit_amount: tierInfo.cents,
          },
          quantity: 1,
        },
      ],
      customer_email: body.email || undefined,
      // successPath override: callers that already know where they want
      // the user to land (e.g. film.html's "Make TIER" direct-to-Stripe
      // flow wants /account?tab=studio&commissioned=1, not the generic
      // /commission-success.html page) can pass a path. We ALWAYS append
      // session_id so the webhook-vs-landing race has a reconciliation
      // handle, and always thread title/ticker/tier for the UI on both
      // destination pages.
      success_url: `${origin}${
        (() => {
          const raw = (body.successPath || '/commission-success.html').toString();
          const path = raw.startsWith('/') ? raw : `/${raw}`;
          const sep = path.includes('?') ? '&' : '?';
          return `${path}${sep}session_id={CHECKOUT_SESSION_ID}&title=${encodeURIComponent(title)}&ticker=${encodeURIComponent(ticker)}&tier=${tier}`;
        })()
      }`,
      cancel_url: `${origin}/?cancelled=true`,
      metadata: {
        title,
        ticker,
        synopsis,
        tier,
        commissioner_percent: String(commissionerPercent),
        source: body.source || 'bmovies-commission',
        ...(parentOfferId ? { parentOfferId } : {}),
        ...(body.supabaseUserId ? { supabaseUserId: body.supabaseUserId } : {}),
        ...(body.isAlt ? { isAlt: '1' } : {}),
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Stripe checkout error:', msg);
    res.status(500).json({ error: msg });
  }
}
