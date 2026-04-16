/**
 * /api/certificates/agent
 *
 * POST — Issue a BRC-43 Agent Certificate (requires auth, must own the studio)
 *   Body: { agentId: string }
 *   Returns: { certificate, signature, publicKey }
 *
 * GET  — Public verification (returns cached cert if stored)
 *   Query: ?agentId=<id>
 *   Returns: { certificate, signature, publicKey } or { error }
 *
 * Env:
 *   SUPABASE_URL              — API base
 *   SUPABASE_SERVICE_ROLE_KEY — for signing + writing (bypasses RLS)
 */

import { webcrypto, createHmac } from 'node:crypto';
if (!(globalThis as any).crypto) (globalThis as any).crypto = webcrypto;

import { PrivateKey, BSM, Signature } from '@bsv/sdk';

// ---------------------------------------------------------------------------
// Vercel types
// ---------------------------------------------------------------------------

interface VercelRequest {
  method?: string;
  body?: unknown;
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ---------------------------------------------------------------------------
// Inlined certificate helpers (Vercel can't import from src/)
// ---------------------------------------------------------------------------

function getPlatformSigningKey(serviceRoleKey: string) {
  const hmac = createHmac('sha256', serviceRoleKey);
  hmac.update('bmovies-platform-cert-signer');
  const seed = hmac.digest('hex');
  
  const privateKey = PrivateKey.fromString(seed, 'hex');
  const publicKey = privateKey.toPublicKey().toString();
  const address = privateKey.toAddress();
  return { privateKey, publicKey, address };
}

interface AgentCertificate {
  type: 'BRC-Agent-Certificate';
  version: '1.0';
  issuer: string;
  issuerPublicKey: string;
  agentId: string;
  agentName: string;
  role: string;
  studioId: string;
  studioName: string;
  walletAddress: string;
  capabilities: string[];
  reputation: number;
  protocolID: [number, string];
  keyID: string;
  issuedAt: string;
}

const ROLE_CAPABILITIES: Record<string, string[]> = {
  writer: ['screenplay', 'treatment', 'logline', 'dialogue', 'story-structure'],
  director: ['shot-planning', 'visual-direction', 'scene-composition', 'actor-direction', 'narrative-pacing'],
  cinematographer: ['camera-angles', 'lighting-design', 'lens-selection', 'color-grading', 'visual-mood'],
  storyboard: ['frame-composition', 'visual-storytelling', 'scene-layout', 'continuity', 'shot-sequence'],
  editor: ['non-linear-editing', 'pacing', 'montage', 'sound-sync', 'color-correction'],
  composer: ['score-composition', 'theme-development', 'orchestration', 'mood-scoring', 'audio-mixing'],
  sound_designer: ['foley', 'ambience', 'sound-effects', 'audio-post', 'spatial-audio'],
  producer: ['budget-management', 'scheduling', 'crew-coordination', 'distribution', 'finance'],
};

function createAgentCertificate(
  agent: { id: string; name: string; role: string; wallet_address: string; reputation: number },
  studio: { id: string; name: string },
  signingPublicKey: string,
): AgentCertificate {
  return {
    type: 'BRC-Agent-Certificate',
    version: '1.0',
    issuer: 'bMovies Platform (The Bitcoin Corporation Ltd)',
    issuerPublicKey: signingPublicKey,
    agentId: agent.id,
    agentName: agent.name,
    role: agent.role,
    studioId: studio.id,
    studioName: studio.name,
    walletAddress: agent.wallet_address,
    capabilities: ROLE_CAPABILITIES[agent.role] || ['general'],
    reputation: agent.reputation,
    protocolID: [1, 'bmovies-agent'],
    keyID: `agent-${agent.id}`,
    issuedAt: new Date().toISOString(),
  };
}

function signCert(cert: AgentCertificate, privateKey: PrivateKey): string {
  const message = JSON.stringify(cert);
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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase not configured' });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // ── GET: public certificate lookup ──
  if (req.method === 'GET') {
    const agentId = (req.query?.agentId as string) || '';
    if (!agentId) {
      res.status(400).json({ error: 'agentId query parameter required' });
      return;
    }

    const { data: agent } = await supabase
      .from('bct_agents')
      .select('id, name, role, wallet_address, reputation, studio, certificate_json, certificate_signature')
      .eq('id', agentId)
      .maybeSingle();

    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    // Return cached certificate if available
    if (agent.certificate_json && agent.certificate_signature) {
      const { publicKey } = getPlatformSigningKey(supabaseKey);
      res.status(200).json({
        certificate: JSON.parse(agent.certificate_json),
        signature: agent.certificate_signature,
        publicKey,
        cached: true,
      });
      return;
    }

    // Generate fresh certificate on demand (GET = public, no auth needed
    // because the certificate is just attestation of public data)
    const { data: studio } = await supabase
      .from('bct_studios')
      .select('id, name')
      .eq('id', agent.studio)
      .maybeSingle();

    if (!studio) {
      res.status(404).json({ error: 'Studio not found for agent' });
      return;
    }

    const { privateKey, publicKey } = getPlatformSigningKey(supabaseKey);
    const cert = createAgentCertificate(agent, studio, publicKey);
    const signature = signCert(cert, privateKey);
    const certJson = JSON.stringify(cert);

    // Cache the certificate on the agent row
    await supabase
      .from('bct_agents')
      .update({
        certificate_json: certJson,
        certificate_signature: signature,
      })
      .eq('id', agent.id);

    res.status(200).json({
      certificate: cert,
      signature,
      publicKey,
      cached: false,
    });
    return;
  }

  // ── POST: authenticated certificate issuance ──
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // Extract Bearer token
  const authHeader = (req.headers['authorization'] || req.headers['Authorization'] || '') as string;
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Authorization header with Bearer token required' });
    return;
  }

  // Verify JWT
  const userSupabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authError } = await userSupabase.auth.getUser(token);
  if (authError || !user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Parse body
  let body: { agentId?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const agentId = body.agentId;
  if (!agentId) {
    res.status(400).json({ error: 'agentId is required' });
    return;
  }

  // Load agent
  const { data: agent } = await supabase
    .from('bct_agents')
    .select('id, name, role, wallet_address, reputation, studio, owner_account_id, certificate_json, certificate_signature')
    .eq('id', agentId)
    .maybeSingle();

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }

  // Load studio
  const { data: studio } = await supabase
    .from('bct_studios')
    .select('id, name, owner_account_id')
    .eq('id', agent.studio)
    .maybeSingle();

  if (!studio) {
    res.status(404).json({ error: 'Studio not found' });
    return;
  }

  // Verify ownership: caller must own the studio
  const { data: account } = await supabase
    .from('bct_accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!account || studio.owner_account_id !== account.id) {
    res.status(403).json({ error: 'You do not own this studio' });
    return;
  }

  // Return cached certificate if it exists
  if (agent.certificate_json && agent.certificate_signature) {
    const { publicKey } = getPlatformSigningKey(supabaseKey);
    res.status(200).json({
      certificate: JSON.parse(agent.certificate_json),
      signature: agent.certificate_signature,
      publicKey,
      cached: true,
    });
    return;
  }

  // Generate and store a new certificate
  try {
    const { privateKey, publicKey } = getPlatformSigningKey(supabaseKey);
    const cert = createAgentCertificate(agent, studio, publicKey);
    const signature = signCert(cert, privateKey);
    const certJson = JSON.stringify(cert);

    const { error: updateErr } = await supabase
      .from('bct_agents')
      .update({
        certificate_json: certJson,
        certificate_signature: signature,
      })
      .eq('id', agent.id);

    if (updateErr) {
      console.error('[agent-cert] Failed to store certificate:', updateErr);
      res.status(500).json({ error: 'Failed to store certificate' });
      return;
    }

    console.log(`[agent-cert] BRC-43 certificate issued for ${agent.name} (${agent.id})`);

    res.status(200).json({
      certificate: cert,
      signature,
      publicKey,
      cached: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[agent-cert] Certificate generation failed:', msg);
    res.status(500).json({ error: 'Certificate generation failed' });
  }
}
