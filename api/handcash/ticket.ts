/**
 * POST /api/handcash/ticket
 *
 * Creates a HandCash payment request URL for a $2.99 ticket. The user
 * is redirected to HandCash's hosted checkout, which handles the
 * wallet connect + payment + return flow.
 *
 * HandCash Connect SDK flow:
 *   1. Create an auth session with the app ID
 *   2. Generate a payment request with amount + memo
 *   3. Redirect user to the payment request URL
 *   4. On success, HandCash redirects back with a transaction ID
 *
 * For MVP this endpoint wraps the HandCash API. If HANDCASH_APP_ID
 * isn't configured, it returns a fallback that points back to the
 * Stripe ticket flow.
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

  const appId = process.env.HANDCASH_APP_ID;
  const appSecret = process.env.HANDCASH_APP_SECRET;

  let body: { offerId?: string; title?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const offerId = body.offerId?.trim();
  const title = body.title?.trim() || 'bMovies Film';
  if (!offerId) {
    res.status(400).json({ error: 'offerId required' });
    return;
  }

  if (!appId || !appSecret) {
    res.status(500).json({ error: 'HandCash not configured' });
    return;
  }

  const origin = 'https://bmovies.online';

  // HandCash Payment Request API
  // Docs: https://docs.handcash.io/docs/payment-requests
  try {
    const payRes = await fetch('https://cloud.handcash.io/v2/paymentRequests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'app-id': appId,
        'app-secret': appSecret,
      },
      body: JSON.stringify({
        product: {
          name: `bMovies: Watch ${title}`,
          description: 'Single ticket for a bMovies film · 99% to shareholders',
        },
        receivers: [
          {
            sendAmount: 2.99,
            currencyCode: 'USD',
            destination: process.env.HANDCASH_PAYOUT_HANDLE || '$bmovies',
          },
        ],
        notifications: {
          webhook: {
            url: `${origin}/api/handcash/webhook?offerId=${encodeURIComponent(offerId)}&type=ticket`,
            customParameters: { offerId, type: 'ticket', title },
          },
        },
        redirectUrl: `${origin}/film.html?id=${encodeURIComponent(offerId)}&ticket=paid`,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!payRes.ok) {
      const errText = await payRes.text();
      console.error('[handcash/ticket] HandCash returned', payRes.status, errText);
      res.status(502).json({ error: `HandCash ${payRes.status}: ${errText.slice(0, 200)}` });
      return;
    }

    const data = await payRes.json() as { paymentRequestUrl?: string; id?: string };
    if (!data.paymentRequestUrl) {
      res.status(502).json({ error: 'HandCash did not return a payment request URL' });
      return;
    }

    res.status(200).json({
      paymentRequestUrl: data.paymentRequestUrl,
      paymentRequestId: data.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[handcash/ticket] failed:', msg);
    res.status(500).json({ error: msg });
  }
}
