/**
 * POST /api/ticket
 *
 * Creates a Stripe Checkout Session for a $2.99 movie ticket.
 * After payment, Stripe redirects to the watch page with the
 * session ID as proof of purchase. The watch page checks
 * localStorage for the unlock (same cache as before) and also
 * verifies the Stripe session if no cache exists.
 *
 * Request body:
 *   { offerId: string, title?: string }
 *
 * Response (200):
 *   { url: string }
 *
 * Env:
 *   STRIPE_SECRET_KEY
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

const TICKET_PRICE_CENTS = 299; // $2.99

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

  let body: { offerId?: string; title?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const offerId = body.offerId?.trim();
  if (!offerId) {
    res.status(400).json({ error: 'offerId is required' });
    return;
  }

  const title = body.title?.trim() || 'bMovies Film';
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
              name: `Ticket: "${title}"`,
              description: 'Watch this AI-produced film. 99% of your ticket goes to the film\'s investors.',
            },
            unit_amount: TICKET_PRICE_CENTS,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/film.html?id=${encodeURIComponent(offerId)}&ticket=paid&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/film.html?id=${encodeURIComponent(offerId)}&ticket=cancelled`,
      metadata: {
        offerId,
        title,
        type: 'ticket',
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Stripe ticket checkout error:', msg);
    res.status(500).json({ error: msg });
  }
}
