/**
 * GET /api/payout-addresses?offerId=X&chain=bsv|eth|base|base-usdc|sol|solana-usdc
 *
 * Returns a platform payout address for the requested chain.
 *
 * - bsv: platform's receive address (revenue fans out to token holders on-chain)
 * - eth / base / base-usdc: platform EOA on Ethereum/Base — same address is
 *   used for native ETH or for USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 *   on Base) since ERC-20 transfers land at the owner EOA, not a sub-account.
 * - sol / solana-usdc: platform owner pubkey on Solana. For USDC transfers
 *   the client derives the recipient's associated token account (ATA) from
 *   this owner + the USDC mint and creates it if it doesn't exist.
 *
 * Cross-chain payments (base-usdc / solana-usdc) are recorded with
 * settlement_status='pending' by /api/record-wallet-payment; a later
 * settlement worker transfers the 1sat BSV-21 royalty share to the
 * buyer's bsvDeliveryAddress on BSV mainnet.
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
  let token: string | null = null;
  if (chain === 'bsv') {
    address = PLATFORM_BSV_ADDRESS;
  } else if (chain === 'eth' || chain === 'base' || chain === 'base-usdc') {
    // Same EOA works for native ETH and for ERC-20 USDC on Base. For
    // base-usdc we also return the USDC contract address so the client
    // knows which token to transfer.
    address = PLATFORM_ETH_ADDRESS;
    if (chain === 'base-usdc') token = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  } else if (chain === 'sol' || chain === 'solana-usdc') {
    address = PLATFORM_SOL_ADDRESS;
    if (chain === 'solana-usdc') token = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  } else {
    res.status(400).json({ error: 'Unknown chain' });
    return;
  }

  res.status(200).json({
    offerId,
    chain,
    address,
    ...(token ? { tokenMint: token } : {}),
    note: 'Platform custody. 99% of ticket revenue settles to token holders via on-chain cascade; 1% to studio.',
  });
}
