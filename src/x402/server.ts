/**
 * x402 server helper — the "demand payment" side of the protocol.
 *
 * Mirrors the header convention already used by BSVAPI
 * (src/agents/bsvapi-client.ts) so the existing client works unchanged:
 *
 *   x-bsv-payment-version            "1"
 *   x-bsv-payment-satoshis-required  "10"
 *   x-bsv-payment-address            "1A1zP1..."
 *   x-bsv-payment-resource           "/api/play/{id}"
 *
 * Two entry points:
 *
 *   require402(req, res, opts) — called at the top of an x402-gated
 *     handler. If the request lacks a valid x-bsv-payment header, it
 *     writes a 402 response and returns null. The caller should
 *     `return` immediately when the result is null. On success it
 *     returns a verified receipt object that has already been inserted
 *     into bct_x402_receipts.
 *
 *   verifyPayment(txid, opts) — lower-level verification used by
 *     require402. Looks up the tx on WhatsOnChain, confirms the
 *     expected output to the expected address with at least the
 *     expected satoshi amount, and records a receipt row.
 *
 * Verification strategy (cheap and honest):
 *
 *   1. GET https://api.whatsonchain.com/v1/bsv/main/tx/hash/{txid}
 *   2. Parse the vout list and find the output that pays `to_addr`
 *      with satoshis >= min_sats
 *   3. If found → insert bct_x402_receipts row, return success
 *   4. If not yet indexed → return 'pending' so the caller can tell
 *      the client to retry in a few seconds
 *
 * No JungleBus required. WoC is good enough for BSV mainnet and is
 * already what src/payment/wallet.ts uses.
 *
 * REPLAY PROTECTION: bct_x402_receipts has a UNIQUE index on
 * (txid, resource_path). Attempting to insert a duplicate triggers
 * a constraint error which we translate to a 402 "replay detected"
 * response. This means a txid is worth exactly one access of one
 * resource, no more.
 */

import type { IncomingHttpHeaders } from 'node:http';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ───────── Types ─────────

export type X402ResourceType = 'agent' | 'play' | 'commission' | 'royalty';

export interface X402GateOptions {
  /** The BSV address that must receive the payment */
  recipientAddress: string;
  /** Minimum satoshis required to access the resource */
  satsRequired: number;
  /** The canonical resource path, e.g. '/api/play/abc123' */
  resourcePath: string;
  /** Human-readable tag for stats + the receipt row */
  resourceType: X402ResourceType;
  /** Optional linkage to a bct_offers row */
  offerId?: string;
  /** Optional agent id when this is an agent-to-agent payment */
  agentId?: string;
  /** Optional step id (e.g. 'writer.logline') */
  stepId?: string;
  /** Optional BSV network; defaults to mainnet */
  scheme?: 'bsv-mainnet' | 'bsv-testnet';
}

export interface X402VerifiedReceipt {
  ok: true;
  txid: string;
  fromAddr: string;
  toAddr: string;
  amountSats: number;
  receiptId: number;
}

export interface X402FailedReceipt {
  ok: false;
  status: number;
  error: string;
}

export type X402Result = X402VerifiedReceipt | X402FailedReceipt;

// ───────── WhatsOnChain helpers ─────────

interface WocOutput {
  value: number;      // BSV, not sats
  n: number;
  scriptPubKey: {
    addresses?: string[];
    hex: string;
  };
}

interface WocInput {
  txid: string;
  vout: number;
  scriptSig?: { hex: string };
  addresses?: string[];
}

interface WocTxResponse {
  txid: string;
  confirmations?: number;
  vin: WocInput[];
  vout: WocOutput[];
  error?: string;
}

function wocUrl(scheme: 'bsv-mainnet' | 'bsv-testnet', txid: string): string {
  const net = scheme === 'bsv-testnet' ? 'test' : 'main';
  return `https://api.whatsonchain.com/v1/bsv/${net}/tx/hash/${txid}`;
}

async function fetchWocTx(
  txid: string,
  scheme: 'bsv-mainnet' | 'bsv-testnet',
): Promise<WocTxResponse | null> {
  try {
    const r = await fetch(wocUrl(scheme, txid), {
      signal: AbortSignal.timeout(6000),
    });
    if (r.status === 404) return null;
    if (!r.ok) return null;
    return (await r.json()) as WocTxResponse;
  } catch {
    return null;
  }
}

// ───────── Supabase client ─────────

let _supa: SupabaseClient | null = null;
function supa(): SupabaseClient {
  if (_supa) return _supa;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('x402 server: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
  }
  _supa = createClient(url, key, { auth: { persistSession: false } });
  return _supa;
}

// ───────── Core verification ─────────

/**
 * Verify that a given txid pays at least `satsRequired` to `recipientAddress`
 * and insert a row into bct_x402_receipts. Returns {ok:false, status:402|404|500}
 * on failure. The caller should propagate that status to the HTTP client.
 */
export async function verifyPayment(
  txid: string,
  opts: X402GateOptions,
): Promise<X402Result> {
  if (!/^[0-9a-fA-F]{64}$/.test(txid)) {
    return { ok: false, status: 400, error: 'invalid txid format' };
  }

  const scheme = opts.scheme ?? 'bsv-mainnet';
  const woc = await fetchWocTx(txid, scheme);
  if (!woc) {
    return { ok: false, status: 402, error: 'payment tx not found on-chain' };
  }

  // Walk outputs looking for one that pays recipientAddress with
  // sufficient value. BSV amounts come back in BSV (not sats) so
  // multiply by 1e8 and round to tolerate IEEE noise.
  let matchedSats = 0;
  for (const vout of woc.vout || []) {
    const addrs = vout.scriptPubKey?.addresses || [];
    if (!addrs.includes(opts.recipientAddress)) continue;
    const sats = Math.round(Number(vout.value) * 1e8);
    if (sats >= opts.satsRequired) {
      matchedSats = sats;
      break;
    }
  }

  if (matchedSats === 0) {
    return {
      ok: false,
      status: 402,
      error: `tx ${txid} does not pay ${opts.satsRequired} sats to ${opts.recipientAddress}`,
    };
  }

  const fromAddr = (woc.vin[0]?.addresses || [])[0] || 'unknown';

  // Insert receipt. UNIQUE(txid, resource_path) rejects replays.
  const { data: inserted, error: insertErr } = await supa()
    .from('bct_x402_receipts')
    .insert({
      txid,
      scheme,
      from_addr: fromAddr,
      to_addr: opts.recipientAddress,
      amount_sats: matchedSats,
      resource_path: opts.resourcePath,
      resource_type: opts.resourceType,
      offer_id: opts.offerId ?? null,
      agent_id: opts.agentId ?? null,
      step_id: opts.stepId ?? null,
      raw_proof: { woc: woc, captured_at: new Date().toISOString() },
      verification_status: 'verified',
    })
    .select('id')
    .single();

  if (insertErr) {
    // Duplicate key = replay
    if (/duplicate key|unique constraint/i.test(insertErr.message)) {
      return {
        ok: false,
        status: 402,
        error: `replay detected: tx ${txid} already redeemed for ${opts.resourcePath}`,
      };
    }
    console.error('[x402] receipt insert failed:', insertErr);
    return { ok: false, status: 500, error: 'receipt write failed' };
  }

  return {
    ok: true,
    txid,
    fromAddr,
    toAddr: opts.recipientAddress,
    amountSats: matchedSats,
    receiptId: inserted.id,
  };
}

// ───────── Request helpers ─────────

function headerVal(headers: IncomingHttpHeaders, name: string): string | undefined {
  const v = headers[name] ?? headers[name.toLowerCase()];
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export interface MinimalReq {
  headers: IncomingHttpHeaders;
}

export interface MinimalRes {
  status(code: number): MinimalRes;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
}

/**
 * Top-of-handler gate. Returns the verified receipt on success, or
 * null after writing a 402 response. Caller pattern:
 *
 *   const receipt = await require402(req, res, {...});
 *   if (!receipt) return;
 *   // ... proceed with the paid response
 */
export async function require402(
  req: MinimalReq,
  res: MinimalRes,
  opts: X402GateOptions,
): Promise<X402VerifiedReceipt | null> {
  const proof = headerVal(req.headers, 'x-bsv-payment');

  if (!proof) {
    // No payment attempted. Emit the full 402 advertisement.
    res.setHeader('x-bsv-payment-version', '1');
    res.setHeader('x-bsv-payment-satoshis-required', String(opts.satsRequired));
    res.setHeader('x-bsv-payment-address', opts.recipientAddress);
    res.setHeader('x-bsv-payment-resource', opts.resourcePath);
    res.setHeader('x-bsv-payment-scheme', opts.scheme ?? 'bsv-mainnet');
    res.status(402).json({
      error: 'Payment Required',
      scheme: opts.scheme ?? 'bsv-mainnet',
      satsRequired: opts.satsRequired,
      payTo: opts.recipientAddress,
      resource: opts.resourcePath,
      resourceType: opts.resourceType,
      instructions:
        'Send the specified satoshi amount to payTo in a BSV mainnet ' +
        'transaction, then retry this request with header ' +
        'x-bsv-payment: <txid>',
    });
    return null;
  }

  const result = await verifyPayment(proof, opts);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return null;
  }
  return result;
}
