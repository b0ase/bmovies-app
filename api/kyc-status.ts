/**
 * GET  /api/kyc-status?accountId=<uuid>
 * POST /api/kyc-status   { accountId }
 *
 * Lightweight read-only status check, used by the account UI to gate
 * actions like "list royalty shares on the exchange" and "publish
 * film to /watch" before the user spends time filling out a form.
 *
 * Returns:
 *   { status: 'verified' | 'pending' | 'submitted' | 'rejected' | 'not_started',
 *     verifiedAt: string | null }
 *
 * Env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Auth note: this returns a per-account status, so the caller must
 * know the account id. Account ids are UUIDs that are hard to guess,
 * but we only ever expose the boolean-ish status — never PII, never
 * the Veriff session id, never the attestation certificate. Leak
 * surface is minimal.
 */

interface VercelRequest {
  method?: string;
  body?: unknown;
  query: Record<string, string | string[] | undefined>;
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

function readAccountId(req: VercelRequest): string | null {
  const q = req.query?.accountId;
  if (typeof q === 'string' && q) return q;
  if (Array.isArray(q) && q[0]) return q[0];
  if (req.body && typeof req.body === 'object') {
    const b = req.body as Record<string, unknown>;
    if (typeof b.accountId === 'string' && b.accountId) return b.accountId;
  }
  return null;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase env vars missing' });
    return;
  }

  const accountId = readAccountId(req);
  if (!accountId) {
    res.status(400).json({ error: 'accountId required' });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { data } = await supabase
    .from('bct_user_kyc')
    .select('status, verified_at')
    .eq('account_id', accountId)
    .maybeSingle();

  if (!data) {
    res.status(200).json({ status: 'not_started', verifiedAt: null });
    return;
  }

  res.status(200).json({
    status: data.status || 'not_started',
    verifiedAt: data.verified_at || null,
  });
}
