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

import { createHmac } from 'node:crypto';

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

  // Extract the verification decision
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
    res.status(400).json({ error: 'No verification object' });
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

  res.status(200).json({ received: true, status: 'approved', session: verification.id });
}
