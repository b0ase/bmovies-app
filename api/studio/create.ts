/**
 * POST /api/studio/create
 *
 * Creates a Stripe Checkout Session for a $0.99 user-owned studio.
 * After payment, the client redirects to /account?tab=studio&session_id=SESSION_ID
 * where the UI calls /api/studio/complete to provision the studio + 8 agents.
 *
 * Body:
 *   { name: string, aesthetic?: string }
 *
 * Headers:
 *   Authorization: Bearer <supabase-jwt>
 *
 * Response:
 *   { checkoutUrl: string }
 *
 * Env:
 *   STRIPE_SECRET_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!stripeKey || !supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'env missing' });
    return;
  }

  // Parse body
  let body: { name?: string; aesthetic?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const name = (body.name || '').trim();
  const aesthetic = (body.aesthetic || '').trim() || undefined;

  // Validate name
  if (name.length < 2 || name.length > 50) {
    res.status(400).json({ error: 'Studio name must be 2-50 characters' });
    return;
  }

  // Auth: verify JWT from Authorization header
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';
  if (!token) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // Verify the JWT and get the user
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  // Resolve the user's bct_accounts row
  const { data: account, error: accErr } = await supabase
    .from('bct_accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (accErr) {
    console.error('[studio/create] account lookup error:', accErr);
    res.status(500).json({ error: 'Account lookup failed' });
    return;
  }
  if (!account) {
    res.status(403).json({ error: 'No bMovies account found. Commission a film or link a wallet first.' });
    return;
  }

  const accountId = account.id as string;

  // NO KYC gate at studio-CREATE time.
  //
  // /api/studio/complete (the post-Stripe provisioner) only writes
  // bct_studios + bct_agents rows — it does NOT mint an on-chain
  // BSV-21 token. Grep-verified 2026-04-18: no mint, no bsv21, no
  // op_return in the complete.ts handler. The studio exists purely
  // off-chain until the owner decides to take its token live, and
  // that later step (studio token mint / publish) is the legally-
  // relevant moment that should carry the KYC gate.
  //
  // An earlier version of this handler gated studio CREATION on
  // bct_user_kyc.status='verified'. That contradicted the stated
  // architecture (create = no KYC, publish/mint = KYC) and blocked
  // users at the same wrong layer the commission.html KYC gate did
  // before it was removed (see commit c3c8556). Removed for the
  // same reason.

  // Check if user already owns a studio
  const { data: existing } = await supabase
    .from('bct_studios')
    .select('id, name')
    .eq('owner_account_id', accountId)
    .maybeSingle();

  if (existing) {
    res.status(409).json({ error: `You already own a studio: "${existing.name}"` });
    return;
  }

  // Check name availability (case-insensitive)
  const { data: nameTaken } = await supabase
    .from('bct_studios')
    .select('id')
    .ilike('name', name)
    .maybeSingle();

  if (nameTaken) {
    res.status(409).json({ error: `Studio name "${name}" is already taken` });
    return;
  }

  // Create Stripe checkout session
  let Stripe: typeof import('stripe').default;
  try {
    const mod = await import('stripe');
    Stripe = mod.default;
  } catch {
    res.status(500).json({ error: 'stripe package not installed' });
    return;
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-03-25.dahlia' });
  // Brochure and app merged onto the single apex origin (bmovies.online).
  // Earlier versions of this handler used 'https://app.bmovies.online' as
  // the success_url, which still resolves but lands the user on the old
  // app subdomain — a separate Vercel deployment that may have drifted
  // from main. Pin to the apex so post-payment redirects always come
  // back to the canonical site.
  const appOrigin = 'https://bmovies.online';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `bMovies Studio: "${name}"`,
              description:
                'Create your own AI film studio with 8 specialist agents, a generated logo, ' +
                'bio, and treasury address. Your studio brand goes on every film you commission.',
            },
            unit_amount: 99, // $0.99
          },
          quantity: 1,
        },
      ],
      success_url: `${appOrigin}/account?tab=studio&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appOrigin}/account?tab=studio&cancelled=true`,
      metadata: {
        product: 'studio-creation',
        studioName: name,
        accountId,
        aesthetic: aesthetic || '',
      },
    });

    res.status(200).json({ checkoutUrl: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[studio/create] stripe error:', msg);
    res.status(500).json({ error: msg });
  }
}
