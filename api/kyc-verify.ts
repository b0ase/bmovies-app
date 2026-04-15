/**
 * POST /api/kyc-verify
 *
 * MVP KYC verification. For the hackathon demo this just flips the
 * user's KYC status to 'verified' immediately. Production would
 * redirect to Veriff and wait for the webhook decision.
 *
 * Request body: { email: string }
 * Response: { status: 'verified' }
 */

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

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

  let body: { email?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const email = body.email?.trim();
  if (!email) {
    res.status(400).json({ error: 'email required' });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // Resolve or create account
  let accountId: string | null = null;
  const { data: existing } = await supabase
    .from('bct_accounts')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    accountId = existing.id;
  } else {
    const { data: created } = await supabase
      .from('bct_accounts')
      .insert({ email, display_name: email.split('@')[0] })
      .select('id')
      .single();
    accountId = created?.id ?? null;
  }

  if (!accountId) {
    res.status(500).json({ error: 'failed to resolve account' });
    return;
  }

  // MVP: auto-verify. Production would start a Veriff session instead.
  const { error } = await supabase
    .from('bct_user_kyc')
    .upsert({
      account_id: accountId,
      status: 'verified',
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'account_id' });

  if (error) {
    console.error('[kyc-verify] upsert failed:', error);
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ status: 'verified' });
}
