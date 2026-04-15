/**
 * POST /api/buy-shares
 *
 * Creates a Stripe Checkout Session for buying 1% of a film's
 * royalty tokens at the current bonding curve tranche price.
 *
 * Request body:
 *   {
 *     offerId: string,   // bct_offers.id
 *     title: string,     // film title (for display)
 *     ticker: string,    // token ticker
 *     priceUsd: number,  // current tranche price for 1%
 *   }
 *
 * After successful payment, the Stripe webhook inserts a row
 * into bct_share_sales and recalculates the film's percent_sold.
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

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    res.status(500).json({ error: 'STRIPE_SECRET_KEY is not configured' });
    return;
  }

  let body: { offerId?: string; title?: string; ticker?: string; priceUsd?: number; email?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const offerId = body.offerId?.trim();
  const title = body.title?.trim() || 'Untitled Film';
  const ticker = body.ticker?.trim() || 'BMOVX';
  const priceUsd = Number(body.priceUsd);

  if (!offerId || !priceUsd || priceUsd < 10) {
    res.status(400).json({ error: 'offerId and priceUsd (>= 10) are required' });
    return;
  }

  const priceCents = Math.round(priceUsd * 100);
  const origin = 'https://bmovies.online';

  let Stripe: typeof import('stripe').default;
  try {
    const mod = await import('stripe');
    Stripe = mod.default;
  } catch {
    res.status(500).json({ error: 'stripe package not installed' });
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
              name: `1% royalty share — "${title}"`,
              description: `$${ticker} · 10,000,000 tokens (1% of 1B total supply). Ticket revenue flows to token holders proportionally.`,
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      customer_email: body.email || undefined,
      success_url: `${origin}/trade.html?purchase=success&offer=${encodeURIComponent(offerId)}`,
      cancel_url: `${origin}/trade.html?purchase=cancelled`,
      metadata: {
        offerId,
        title,
        ticker,
        percentBought: '1',
        priceUsd: String(priceUsd),
        type: 'share-purchase',
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Stripe share purchase error:', msg);
    res.status(500).json({ error: msg });
  }
}
