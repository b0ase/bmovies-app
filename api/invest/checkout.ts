/**
 * POST /api/invest/checkout — DEPRECATED (410 Gone)
 *
 * Previously opened a Stripe Checkout Session for $bMovies platform
 * token purchases. Disabled for the same reason as /api/buy-shares:
 * the platform token is a securities-class instrument (token holders
 * share in platform revenue + governance + royalty streams), so fiat-
 * rail settlement is not compliant with Stripe ToS §8.3 or US
 * securities law without a registered broker-dealer or Reg D/CF
 * exemption in place.
 *
 * Replacement path:
 *   Use /api/invest/bsv-settle with a BRC-100 wallet signature, or the
 *   pay-picker BSV options (HandCash / BSV Desktop). Cross-chain
 *   investors can settle via x402 (MetaMask/Phantom -> BSV). KYC is
 *   still enforced upstream by /api/kyc-verify.
 *
 * Stub left in place so stale clients receive a clean 410 + guidance
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
    error: '$bMovies platform tokens cannot be purchased with a credit card.',
    reason: 'securities_on_fiat_rail_prohibited',
    detail:
      'The platform token entitles holders to a share of platform revenue and ' +
      'royalty flows. That makes it an investment contract under Howey. Stripe ' +
      'ToS §8.3 and US securities law require fiat-rail investment settlement ' +
      'to go through a registered broker-dealer. Neither is in place.',
    alternatives: [
      { label: 'BRC-100 / BSV Desktop', endpoint: '/api/invest/bsv-settle' },
      { label: 'HandCash',              endpoint: '/api/handcash/buy-shares' },
    ],
  });
}
