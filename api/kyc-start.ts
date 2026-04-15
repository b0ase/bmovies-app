/**
 * POST /api/kyc-start
 *
 * Creates a Veriff verification session for the visitor. Returns
 * the redirect URL to Veriff's hosted KYC UI. After the visitor
 * completes verification, Veriff calls our webhook at
 * /api/kyc-webhook with the decision.
 *
 * Request body:
 *   { sessionId: string }    // the Stripe checkout session ID
 *                            // (or any unique user identifier)
 *
 * Response (200):
 *   { url: string, veriffSessionId: string }
 *
 * Env:
 *   VERIFF_API_KEY       — X-AUTH-CLIENT header for Veriff API
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

const VERIFF_API = 'https://stationapi.veriff.com/v1/sessions';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const apiKey = process.env.VERIFF_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let body: { sessionId?: string; email?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const email = body.email;
  const vendorData = body.sessionId || email || `anon-${Date.now()}`;
  const origin = 'https://bmovies.online';

  // If no Veriff API key — return fallback mode (demo auto-verify)
  if (!apiKey) {
    if (!supabaseUrl || !supabaseKey || !email) {
      res.status(500).json({ error: 'VERIFF_API_KEY not set and no fallback possible' });
      return;
    }
    // Auto-verify for demo mode
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    let accountId: string | null = null;
    const { data: existing } = await supabase
      .from('bct_accounts')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existing) accountId = existing.id;
    else {
      const { data: created } = await supabase
        .from('bct_accounts')
        .insert({ email, display_name: email.split('@')[0] })
        .select('id')
        .single();
      accountId = created?.id ?? null;
    }

    if (accountId) {
      await supabase.from('bct_user_kyc').upsert({
        account_id: accountId,
        status: 'verified',
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'account_id' });
    }

    res.status(200).json({
      mode: 'demo',
      status: 'verified',
      message: 'Demo mode — auto-verified. Production uses Veriff.',
    });
    return;
  }

  try {
    const veriffRes = await fetch(VERIFF_API, {
      method: 'POST',
      headers: {
        'X-AUTH-CLIENT': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        verification: {
          callback: `${origin}/api/kyc-webhook`,
          person: {
            firstName: '',
            lastName: '',
          },
          vendorData,
          timestamp: new Date().toISOString(),
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!veriffRes.ok) {
      const errText = await veriffRes.text();
      res.status(502).json({
        error: `Veriff returned ${veriffRes.status}`,
        detail: errText.slice(0, 500),
      });
      return;
    }

    const data = (await veriffRes.json()) as {
      verification?: {
        id?: string;
        url?: string;
        status?: string;
      };
    };

    const sessionUrl = data.verification?.url;
    const veriffSessionId = data.verification?.id;

    if (!sessionUrl || !veriffSessionId) {
      res.status(502).json({ error: 'Veriff response missing session URL' });
      return;
    }

    // Persist the session so the webhook can flip the user to verified
    if (supabaseUrl && supabaseKey && email) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      const { data: account } = await supabase
        .from('bct_accounts')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (account) {
        await supabase.from('bct_user_kyc').upsert({
          account_id: account.id,
          status: 'submitted',
          veriff_session: veriffSessionId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'account_id' });
      }
    }

    res.status(200).json({
      mode: 'veriff',
      url: sessionUrl,
      veriffSessionId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Veriff session creation failed:', msg);
    res.status(502).json({ error: msg });
  }
}
