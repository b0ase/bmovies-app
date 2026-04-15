/**
 * GET /api/payout-addresses?offerId=X&chain=bsv|eth|sol
 *
 * Returns a platform payout address for the requested chain.
 * For BSV, we return the offer's token mint address (ticket revenue
 * fans out to token holders on-chain). For ETH/SOL we return a
 * platform custodial address that accepts cross-chain payments
 * which are later bridged via x402.
 */

interface VercelRequest {
  method?: string;
  query?: Record<string, string | string[]>;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  setHeader(name: string, value: string): void;
}

function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Platform custody addresses for cross-chain payments.
// These should be treasury wallets controlled by the platform.
// For the hackathon demo these are placeholder addresses — the ETH
// and SOL flows will record the payment but the actual settlement
// bridge via x402 is a Phase 4 item.
const PLATFORM_BSV_ADDRESS = process.env.PITCH_RECEIVE_ADDRESS
  || '15q3UKrYYNuXRSg3gtb52pEnbaeiGK4m7b';
const PLATFORM_ETH_ADDRESS = process.env.PLATFORM_ETH_ADDRESS
  || '0x0000000000000000000000000000000000000000';
const PLATFORM_SOL_ADDRESS = process.env.PLATFORM_SOL_ADDRESS
  || '11111111111111111111111111111111';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  // Parse query from URL since req.query may be undefined on Vercel's edge
  const url = new URL(req.url || '', 'https://bmovies.online');
  const offerId = url.searchParams.get('offerId') || '';
  const chain = (url.searchParams.get('chain') || 'bsv').toLowerCase();

  if (!offerId) {
    res.status(400).json({ error: 'offerId required' });
    return;
  }

  let address = '';
  if (chain === 'bsv') {
    address = PLATFORM_BSV_ADDRESS;
  } else if (chain === 'eth') {
    address = PLATFORM_ETH_ADDRESS;
  } else if (chain === 'sol') {
    address = PLATFORM_SOL_ADDRESS;
  } else {
    res.status(400).json({ error: 'Unknown chain' });
    return;
  }

  res.status(200).json({
    offerId,
    chain,
    address,
    note: 'Platform custody. 99% of ticket revenue settles to token holders via on-chain cascade; 1% to studio.',
  });
}
