/**
 * POST /api/kyc-webhook
 *
 * Receives Veriff verification decision webhooks. When a user
 * passes KYC (decision.status === 'approved'), we update the
 * corresponding bct_pitches row to record that KYC passed and
 * the tokens can be delivered to their wallet.
 *
 * Verifies the HMAC-SHA256 signature using VERIFF_WEBHOOK_SECRET.
 *
 * Env:
 *   VERIFF_WEBHOOK_SECRET     — for signature verification
 *   SUPABASE_URL              — for updating the pitch row
 *   SUPABASE_SERVICE_ROLE_KEY — bypasses RLS
 */

import { webcrypto, createHmac } from 'node:crypto';
if (!(globalThis as any).crypto) (globalThis as any).crypto = webcrypto;

import { PrivateKey, BSM, Signature } from '@bsv/sdk';

// --- Inlined BRC certificate helpers (canonical source: src/kyc/certificate.ts) ---

interface BrcKycCertificate {
  type: 'BRC-KYC-Certificate';
  version: '1.0';
  issuer: string;
  issuerPublicKey: string;
  issuerAddress: string;
  subject: string;
  kycProvider: 'Veriff OÜ';
  kycLevel: 'document + biometric';
  status: 'verified';
  verifiedAt: string;
  protocolID: [number, string];
  keyID: string;
  issuedAt: string;
}

function getSigningKeyFromSecret(serviceRoleKey: string) {
  const hmac = createHmac('sha256', serviceRoleKey);
  hmac.update('bmovies-kyc-cert-signer');
  const seed = hmac.digest('hex');
  
  const privateKey = PrivateKey.fromString(seed, 'hex');
  const publicKey = privateKey.toPublicKey().toString();
  const address = privateKey.toAddress();
  return { privateKey, publicKey, address };
}

function _createCertificate(
  subjectAddress: string,
  verifiedAt: string,
  signingPublicKey: string,
  signingAddress: string,
): BrcKycCertificate {
  return {
    type: 'BRC-KYC-Certificate',
    version: '1.0',
    issuer: 'bMovies Platform (The Bitcoin Corporation Ltd)',
    issuerPublicKey: signingPublicKey,
    issuerAddress: signingAddress,
    subject: subjectAddress,
    kycProvider: 'Veriff OÜ',
    kycLevel: 'document + biometric',
    status: 'verified',
    verifiedAt,
    protocolID: [1, 'bmovies-kyc'],
    keyID: 'kyc-cert-1',
    issuedAt: new Date().toISOString(),
  };
}

function _signCertificate(cert: BrcKycCertificate, privateKey: PrivateKey): string {
  const message = JSON.stringify(cert);
  const messageBytes = Array.from(Buffer.from(message, 'utf-8'));
  const sig = BSM.sign(messageBytes, privateKey, 'raw') as unknown as Signature;
  return Buffer.from(sig.toDER()).toString('hex');
}

// --- End inlined helpers ---

interface VercelRequest {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  send(body: string): void;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const secret = process.env.VERIFF_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret || !supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Missing env config' });
    return;
  }

  // Parse the body
  let body: Record<string, unknown>;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as Record<string, unknown>) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  // Verify HMAC-SHA256 signature
  const signature = (req.headers['x-hmac-signature'] as string) || '';
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(body);
  const expected = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (signature.toLowerCase() !== expected.toLowerCase()) {
    console.error('[kyc-webhook] Signature mismatch');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  // Veriff sends TWO webhook shapes:
  //
  //   1. Decision webhook — the one we care about.
  //      { verification: { id, status: 'approved'|'declined'|..., vendorData, person, ... } }
  //
  //   2. Event webhook — flow-state pings sent during the session:
  //      'started', 'submitted', 'resubmitted_feedback_sent', etc.
  //      Shape: { status: 'success', verification: { id, attemptId, vendorData, status, code, action, feature } }
  //      or:    { vendorData, attemptId, feature, code, action } (top-level event, no verification object)
  //
  // Earlier versions of this handler rejected event webhooks with 400
  // because they don't always carry a full verification object. Veriff
  // then retried those events on a schedule, which is why Vercel logs
  // show /api/kyc-webhook 400 firing every ~30s during any active
  // session. That also meant a REAL decision webhook arriving after
  // the user's session closed could land after hours of retry
  // failures had already clogged the Veriff outbox.
  //
  // Fix: if there is no verification object OR the verification has no
  // decision status we recognise, 200 the request so Veriff stops
  // retrying. Only ACT (flip DB status) on an approved decision.
  const verification = body.verification as {
    id?: string;
    status?: string;
    vendorData?: string;
    person?: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
    };
    document?: {
      type?: string;
      country?: string;
      number?: string;
    };
  } | undefined;

  if (!verification) {
    console.log('[kyc-webhook] Event webhook (no verification object), acknowledging:', {
      action: body.action,
      code: body.code,
      vendorData: body.vendorData,
    });
    res.status(200).json({ received: true, type: 'event' });
    return;
  }

  const vendorData = verification.vendorData || '';
  const status = verification.status || '';
  const firstName = verification.person?.firstName || '';
  const lastName = verification.person?.lastName || '';

  console.log(
    `[kyc-webhook] Veriff decision: ${status} for ${vendorData} (${firstName} ${lastName})`,
  );

  // Only act on approved decisions
  if (status !== 'approved') {
    res.status(200).json({ received: true, status, action: 'none' });
    return;
  }

  // Flip the user's KYC status to 'verified' by matching the
  // Veriff session ID we stored on kyc-start.
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase
    .from('bct_user_kyc')
    .update({
      status: 'verified',
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('veriff_session', verification.id);

  if (error) {
    console.error('[kyc-webhook] Failed to update KYC row:', error);
    res.status(500).json({ error: 'DB update failed' });
    return;
  }

  // Issue BRC certificate for the verified user
  try {
    // Find the account that owns this Veriff session
    const { data: kycRow } = await supabase
      .from('bct_user_kyc')
      .select('account_id')
      .eq('veriff_session', verification.id)
      .maybeSingle();

    if (kycRow?.account_id) {
      const accountId = kycRow.account_id;

      // Get the user's BSV address from bct_user_wallets
      const { data: wallet } = await supabase
        .from('bct_user_wallets')
        .select('address')
        .eq('account_id', accountId)
        .eq('is_primary', true)
        .maybeSingle();

      const subjectAddress = wallet?.address || accountId;

      const { privateKey, publicKey, address: signerAddress } = getSigningKeyFromSecret(supabaseKey);
      const cert = _createCertificate(subjectAddress, new Date().toISOString(), publicKey, signerAddress);
      const certSignature = _signCertificate(cert, privateKey);

      // Store the certificate on the KYC row
      await supabase
        .from('bct_user_kyc')
        .update({
          certificate_json: JSON.stringify(cert),
          certificate_signature: certSignature,
          certificate_public_key: publicKey,
          subject_address: subjectAddress,
        })
        .eq('account_id', accountId);

      console.log(`[kyc-webhook] BRC certificate issued for ${subjectAddress}`);
    }
  } catch (certErr) {
    // Certificate issuance failure is non-blocking — KYC is still approved
    console.warn('[kyc-webhook] certificate issuance failed:', certErr);
  }

  res.status(200).json({ received: true, status: 'approved', session: verification.id });
}
