/**
 * BRC KYC Certificate — real cryptographic certificate issuance.
 *
 * The platform derives a dedicated signing key from the service role
 * secret (deterministic, no extra env var needed). Certificates are
 * signed with ECDSA via @bsv/sdk and verifiable by anyone who knows
 * the platform's public key.
 *
 * Signing uses BSM (Bitcoin Signed Message) in the same pattern as
 * src/seeder/proof-of-serve.ts — DER-encoded signatures that can be
 * verified with the signer's public key.
 */

import { createHmac } from 'node:crypto';
import { PrivateKey, PublicKey, BSM, Signature } from '@bsv/sdk';

// ---------------------------------------------------------------------------
// Key derivation
// ---------------------------------------------------------------------------

/**
 * Derive a deterministic signing key from the Supabase service role secret.
 *
 * HMAC-SHA256("bmovies-kyc-cert-signer", serviceRoleKey) -> 32 bytes -> PrivateKey.
 *
 * This is deterministic: the same service role key always produces the same
 * signing key, so certificates signed across deployments are consistent.
 */
export function getSigningKeyFromSecret(serviceRoleKey: string): {
  privateKey: PrivateKey;
  publicKey: string;
  address: string;
} {
  const hmac = createHmac('sha256', serviceRoleKey);
  hmac.update('bmovies-kyc-cert-signer');
  const seed = hmac.digest('hex');

  // PrivateKey constructor accepts a bigint
  
  const privateKey = PrivateKey.fromString(seed, 'hex');
  const publicKey = privateKey.toPublicKey().toString();
  const address = privateKey.toAddress();

  return { privateKey, publicKey, address };
}

// ---------------------------------------------------------------------------
// Certificate schema
// ---------------------------------------------------------------------------

export interface BrcKycCertificate {
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

// ---------------------------------------------------------------------------
// Certificate creation
// ---------------------------------------------------------------------------

export function createCertificate(
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

// ---------------------------------------------------------------------------
// Signing (BSM — same pattern as proof-of-serve.ts)
// ---------------------------------------------------------------------------

/**
 * Sign the certificate using Bitcoin Signed Message (BSM) format.
 * Returns the signature as a DER-encoded hex string.
 */
export function signCertificate(
  cert: BrcKycCertificate,
  privateKey: PrivateKey,
): string {
  const message = JSON.stringify(cert);
  const messageBytes = Array.from(Buffer.from(message, 'utf-8'));
  const sig = BSM.sign(messageBytes, privateKey, 'raw') as unknown as Signature;
  return Buffer.from(sig.toDER()).toString('hex');
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/**
 * Verify a certificate signature. Anyone can call this with the
 * certificate JSON string + DER hex signature + public key hex.
 */
export function verifyCertificate(
  certJson: string,
  signatureHex: string,
  publicKeyHex: string,
): boolean {
  try {
    const messageBytes = Array.from(Buffer.from(certJson, 'utf-8'));
    const derBytes = Array.from(Buffer.from(signatureHex, 'hex'));
    const sig = Signature.fromDER(derBytes);
    const pubKey = PublicKey.fromString(publicKeyHex);
    return BSM.verify(messageBytes, sig, pubKey);
  } catch {
    return false;
  }
}
