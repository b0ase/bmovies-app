/**
 * GET /api/certificates/production-step?offerId=<id>
 *
 * Returns all signed production step certificates for a film.
 * Signatures are generated ON DEMAND from artifact data + agent info
 * (not stored at production time), avoiding any changes to the
 * feature-worker.
 *
 * Public endpoint -- no auth required (audit trail is public data).
 *
 * Response (200):
 *   {
 *     offerId: string,
 *     filmTitle: string,
 *     publicKey: string,
 *     steps: [
 *       {
 *         stepId: string,
 *         agentName: string,
 *         agentRole: string,
 *         artifactKind: string,
 *         artifactHash: string,
 *         certificate: ProductionStepSignature,
 *         signature: string
 *       },
 *       ...
 *     ]
 *   }
 *
 * Env:
 *   SUPABASE_URL              -- API base
 *   SUPABASE_SERVICE_ROLE_KEY -- for signing key derivation
 */

import { webcrypto, createHmac, createHash } from 'node:crypto';
if (!(globalThis as any).crypto) (globalThis as any).crypto = webcrypto;

import { PrivateKey, BSM, Signature } from '@bsv/sdk';

// ---------------------------------------------------------------------------
// Vercel types
// ---------------------------------------------------------------------------

interface VercelRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ---------------------------------------------------------------------------
// Inlined helpers (Vercel can't import from src/)
// ---------------------------------------------------------------------------

function getPlatformSigningKey(serviceRoleKey: string) {
  const hmac = createHmac('sha256', serviceRoleKey);
  hmac.update('bmovies-platform-cert-signer');
  const seed = hmac.digest('hex');
  
  const privateKey = PrivateKey.fromString(seed, 'hex');
  const publicKey = privateKey.toPublicKey().toString();
  return { privateKey, publicKey };
}

interface ProductionStepSignature {
  type: 'BRC-Production-Step';
  version: '1.0';
  offerId: string;
  filmTitle: string;
  stepId: string;
  agentId: string;
  agentName: string;
  agentRole: string;
  artifactKind: string;
  artifactHash: string;
  protocolID: [number, string];
  keyID: string;
  signedAt: string;
}

function hashArtifact(url: string): string {
  let content = url;
  if (url && url.startsWith('data:text/plain')) {
    const commaIdx = url.indexOf(',');
    if (commaIdx >= 0) {
      try {
        content = decodeURIComponent(url.slice(commaIdx + 1));
      } catch {
        content = url;
      }
    }
  }
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

function createStepSignature(
  offer: { id: string; title: string },
  step: { step_id: string; agent_id: string },
  agent: { name: string; role: string },
  artifact: { kind: string; url: string },
  signingPublicKey: string,
): ProductionStepSignature {
  return {
    type: 'BRC-Production-Step',
    version: '1.0',
    offerId: offer.id,
    filmTitle: offer.title,
    stepId: step.step_id,
    agentId: step.agent_id,
    agentName: agent.name,
    agentRole: agent.role,
    artifactKind: artifact.kind,
    artifactHash: hashArtifact(artifact.url),
    protocolID: [1, 'bmovies-production'],
    keyID: `step-${offer.id}-${step.step_id}`,
    signedAt: new Date().toISOString(),
  };
}

function signStep(stepSig: ProductionStepSignature, privateKey: PrivateKey): string {
  const message = JSON.stringify(stepSig);
  const messageBytes = Array.from(Buffer.from(message, 'utf-8'));
  const sig = BSM.sign(messageBytes, privateKey, 'raw') as unknown as Signature;
  return Buffer.from(sig.toDER()).toString('hex');
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase not configured' });
    return;
  }

  const offerId = (req.query?.offerId as string) || '';
  if (!offerId) {
    res.status(400).json({ error: 'offerId query parameter required' });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // Load the offer
  const { data: offer } = await supabase
    .from('bct_offers')
    .select('id, title')
    .eq('id', offerId)
    .maybeSingle();

  if (!offer) {
    res.status(404).json({ error: 'Offer not found' });
    return;
  }

  // Load all artifacts for this offer (current versions only)
  const { data: artifacts } = await supabase
    .from('bct_artifacts')
    .select('id, kind, role, step_id, url, agent_id, created_at')
    .eq('offer_id', offerId)
    .is('superseded_by', null)
    .order('created_at', { ascending: true });

  if (!artifacts || artifacts.length === 0) {
    res.status(200).json({
      offerId: offer.id,
      filmTitle: offer.title,
      publicKey: getPlatformSigningKey(supabaseKey).publicKey,
      steps: [],
    });
    return;
  }

  // Collect unique agent IDs and load their info
  const agentIds = [...new Set(artifacts.map(a => a.agent_id).filter(Boolean))];
  const agentMap = new Map<string, { name: string; role: string }>();

  if (agentIds.length > 0) {
    const { data: agents } = await supabase
      .from('bct_agents')
      .select('id, name, role')
      .in('id', agentIds);

    for (const a of agents || []) {
      agentMap.set(a.id, { name: a.name, role: a.role });
    }
  }

  // Generate signatures for each artifact
  const { privateKey, publicKey } = getPlatformSigningKey(supabaseKey);
  const steps = [];

  for (const art of artifacts) {
    const agentId = art.agent_id || 'unknown';
    const agent = agentMap.get(agentId) || { name: 'Unknown Agent', role: art.role || 'unknown' };

    const cert = createStepSignature(
      offer,
      { step_id: art.step_id || art.role || 'unknown', agent_id: agentId },
      agent,
      { kind: art.kind, url: art.url },
      publicKey,
    );
    const signature = signStep(cert, privateKey);

    steps.push({
      stepId: art.step_id || art.role || 'unknown',
      agentName: agent.name,
      agentRole: agent.role,
      artifactKind: art.kind,
      artifactHash: cert.artifactHash,
      certificate: cert,
      signature,
    });
  }

  res.status(200).json({
    offerId: offer.id,
    filmTitle: offer.title,
    publicKey,
    steps,
  });
}
