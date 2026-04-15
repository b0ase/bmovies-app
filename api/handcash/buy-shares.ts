/**
 * POST /api/handcash/buy-shares
 *
 * HandCash payment request for buying 1% of a film's royalty tokens
 * at the current bonding curve tranche price.
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
  if (!appId || !appSecret) {
    res.status(500).json({ error: 'HandCash not configured' });
    return;
  }

  let body: { offerId?: string; title?: string; ticker?: string; priceUsd?: number };
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
    res.status(400).json({ error: 'offerId and priceUsd >= 10 required' });
    return;
  }

  const origin = 'https://bmovies.online';

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
          name: `1% royalty share — "${title}"`,
          description: `$${ticker} · 10M tokens (1% of 1B supply). Ticket revenue flows proportionally.`,
        },
        receivers: [
          {
            sendAmount: priceUsd,
            currencyCode: 'USD',
            destination: process.env.HANDCASH_PAYOUT_HANDLE || '$bmovies',
          },
        ],
        notifications: {
          webhook: {
            url: `${origin}/api/handcash/webhook?offerId=${encodeURIComponent(offerId)}&type=shares`,
            customParameters: { offerId, type: 'shares', title, ticker, priceUsd: String(priceUsd) },
          },
        },
        redirectUrl: `${origin}/trade.html?purchase=success&offer=${encodeURIComponent(offerId)}`,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!payRes.ok) {
      const errText = await payRes.text();
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
    res.status(500).json({ error: msg });
  }
}
