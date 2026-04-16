/**
 * POST /api/kyc/issue-cert
 *
 * Issues a BRC KYC certificate for an already-verified user who
 * doesn't have one yet (bootstrap case). Requires auth (Bearer JWT).
 *
 * Flow:
 *   1. Verify the caller's JWT via Supabase auth
 *   2. Look up their bct_accounts row
 *   3. Check bct_user_kyc.status === 'verified'
 *   4. If certificate_json is null, generate and store a certificate
 *   5. Return the certificate + signature
 *
 * Response (200):
 *   { certificate: object, signature: string, publicKey: string }
 *
 * Env:
 *   SUPABASE_URL              — API base
 *   SUPABASE_SERVICE_ROLE_KEY — for signing + writing (bypasses RLS)
 */

import { webcrypto, createHmac } from 'node:crypto';
if (!(globalThis as any).crypto) (globalThis as any).crypto = webcrypto;

import { PrivateKey, BSM, Signature } from '@bsv/sdk';

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// --- Inlined certificate helpers (same as src/kyc/certificate.ts) ---

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

function createCertificate(
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

function signCertificate(cert: BrcKycCertificate, privateKey: PrivateKey): string {
  const message = JSON.stringify(cert);
  const messageBytes = Array.from(Buffer.from(message, 'utf-8'));
  const sig = BSM.sign(messageBytes, privateKey, 'raw') as unknown as Signature;
  return Buffer.from(sig.toDER()).toString('hex');
}

// --- End inlined helpers ---

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase not configured' });
    return;
  }

  // Extract Bearer token
  const authHeader = (req.headers['authorization'] || req.headers['Authorization'] || '') as string;
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Authorization header with Bearer token required' });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');

  // Verify the JWT to get the user
  const userSupabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authError } = await userSupabase.auth.getUser(token);
  if (authError || !user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Service client for writes
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // Find the account
  const { data: account } = await supabase
    .from('bct_accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!account) {
    res.status(404).json({ error: 'No account found' });
    return;
  }

  // Check KYC status
  const { data: kyc } = await supabase
    .from('bct_user_kyc')
    .select('status, verified_at, certificate_json, certificate_signature, certificate_public_key')
    .eq('account_id', account.id)
    .maybeSingle();

  if (!kyc || kyc.status !== 'verified') {
    res.status(403).json({ error: 'KYC not verified — complete Veriff check first' });
    return;
  }

  // If certificate already exists, return it
  if (kyc.certificate_json && kyc.certificate_signature) {
    res.status(200).json({
      certificate: JSON.parse(kyc.certificate_json),
      signature: kyc.certificate_signature,
      publicKey: kyc.certificate_public_key,
      cached: true,
    });
    return;
  }

  // Generate a new certificate
  try {
    // Get the user's BSV address
    const { data: wallet } = await supabase
      .from('bct_user_wallets')
      .select('address')
      .eq('account_id', account.id)
      .eq('is_primary', true)
      .maybeSingle();

    const md = user.user_metadata || {};
    const subjectAddress = wallet?.address || md.brc100_address || account.id;

    const { privateKey, publicKey, address: signerAddress } = getSigningKeyFromSecret(supabaseKey);
    const cert = createCertificate(
      subjectAddress,
      kyc.verified_at || new Date().toISOString(),
      publicKey,
      signerAddress,
    );
    const signature = signCertificate(cert, privateKey);
    const certJson = JSON.stringify(cert);

    // Store the certificate
    const { error: updateErr } = await supabase
      .from('bct_user_kyc')
      .update({
        certificate_json: certJson,
        certificate_signature: signature,
        certificate_public_key: publicKey,
        subject_address: subjectAddress,
      })
      .eq('account_id', account.id);

    if (updateErr) {
      console.error('[issue-cert] Failed to store certificate:', updateErr);
      res.status(500).json({ error: 'Failed to store certificate' });
      return;
    }

    console.log(`[issue-cert] BRC certificate issued for ${subjectAddress}`);

    res.status(200).json({
      certificate: cert,
      signature,
      publicKey,
      cached: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[issue-cert] Certificate generation failed:', msg);
    res.status(500).json({ error: 'Certificate generation failed' });
  }
}
