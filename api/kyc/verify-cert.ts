/**
 * POST /api/kyc/verify-cert
 *
 * Public verification endpoint for BRC KYC certificates.
 * Anyone can call this — no auth required.
 *
 * Body: { certificate: string (JSON), signature: string (DER hex) }
 * Returns: { valid: boolean, certificate?: object, error?: string }
 *
 * The endpoint:
 *   1. Parses the certificate JSON
 *   2. Extracts the issuerPublicKey from the certificate
 *   3. Verifies the BSM signature against the public key
 *   4. Checks the certificate type is 'BRC-KYC-Certificate'
 *   5. Returns { valid: true/false }
 */

import { webcrypto } from 'node:crypto';
if (!(globalThis as any).crypto) (globalThis as any).crypto = webcrypto;

import { PublicKey, BSM, Signature } from '@bsv/sdk';

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

function verifyCertificate(
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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  let body: { certificate?: string; signature?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const certJson = body.certificate;
  const signatureHex = body.signature;

  if (!certJson || !signatureHex) {
    res.status(400).json({ error: 'certificate (JSON string) and signature (hex) are required' });
    return;
  }

  // Parse the certificate to extract the public key
  let cert: Record<string, unknown>;
  try {
    cert = JSON.parse(certJson);
  } catch {
    res.status(400).json({ error: 'certificate is not valid JSON', valid: false });
    return;
  }

  // Validate certificate type
  const SUPPORTED_TYPES = ['BRC-KYC-Certificate', 'BRC-Agent-Certificate', 'BRC-Production-Step'];
  if (!SUPPORTED_TYPES.includes(cert.type as string)) {
    res.status(400).json({
      error: `Unsupported certificate type: ${cert.type}`,
      valid: false,
    });
    return;
  }

  const publicKeyHex = cert.issuerPublicKey as string;
  if (!publicKeyHex || typeof publicKeyHex !== 'string') {
    res.status(400).json({
      error: 'Certificate missing issuerPublicKey',
      valid: false,
    });
    return;
  }

  const valid = verifyCertificate(certJson, signatureHex, publicKeyHex);

  res.status(200).json({
    valid,
    certificate: valid ? cert : undefined,
    ...(valid ? {} : { error: 'Signature verification failed' }),
  });
}
