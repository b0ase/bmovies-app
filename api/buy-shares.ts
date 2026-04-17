/**
 * POST /api/buy-shares — DEPRECATED (410 Gone)
 *
 * This endpoint previously created a Stripe checkout session to buy
 * 1% of a film's royalty token at the current tranche price.
 *
 * Reason for removal:
 *   Fractional royalty-token purchases are investment contracts under
 *   Howey (investment of money + common enterprise + expectation of
 *   profit from others' efforts). Routing them through Stripe violates
 *   Stripe's ToS §8.3 (securities / investment products prohibited)
 *   AND requires a broker-dealer or Reg D / Reg CF exemption to be
 *   lawful under US securities law. Neither is in place. Fiat-rail
 *   settlement for securities-class purchases is permanently disabled.
 *
 * Replacement path:
 *   Royalty shares settle on-chain. Callers should use the BSV wallet
 *   flow (/api/handcash/buy-shares) or cross-chain x402 settlement via
 *   a BRC-100 / MetaMask / Phantom wallet as surfaced by the
 *   pay-picker UI. KYC gate remains enforced upstream.
 *
 * This stub remains so existing clients get a clean 410 + message
 * rather than a silent Stripe charge.
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
  res.status(410).json({
    error: 'Royalty shares cannot be purchased with a credit card.',
    reason: 'securities_on_fiat_rail_prohibited',
    detail:
      'Fractional royalty-token purchases are investment contracts. To stay ' +
      'compliant with Stripe ToS §8.3 and US securities law, fiat-rail settlement ' +
      'is disabled for this endpoint.',
    alternatives: [
      { label: 'HandCash wallet',     endpoint: '/api/handcash/buy-shares' },
      { label: 'BRC-100 / BSV Desktop', endpoint: '/api/invest/bsv-settle' },
    ],
  });
}
