/**
 * POST /api/studio/ensure-default
 *
 * Idempotent: guarantees the authenticated user has a studio row in
 * bct_studios. If they already have one, returns it unchanged. If
 * not, creates a minimal default studio for free (no Stripe, no
 * Grok calls, no specialist agents).
 *
 * The rationale: every user on bmovies.online owns their films under
 * SOME studio brand — commissions, cap tables, treasury addresses
 * all hang off a studio. Making studio-creation a paid $0.99 gate
 * before first pitch would be strictly worse than giving everyone a
 * default one on sign-up and charging $0.99 only for the AI-generated
 * custom upgrade (logo, bio, 8 specialist agents, unique name).
 *
 * Default studio shape:
 *   name             : "{email-prefix}'s studio" or "Anonymous studio"
 *   token_ticker     : deterministic 5-char derived from name, unique
 *   treasury_address : fresh BSV key (same as the paid flow)
 *   logo_url         : null (UI renders a first-initial placeholder)
 *   bio              : null
 *   aesthetic        : null
 *   created_by       : 'auto' (distinguishable from 'user' and 'platform'; the
 *                      account page checks this flag to render an "Upgrade to
 *                      custom — $0.99" banner instead of the full studio detail)
 *
 * The paid $0.99 upgrade flow (POST /api/studio/create → Stripe →
 * POST /api/studio/complete) still lives. When a user hits that flow
 * with an existing auto-default studio, /api/studio/complete should
 * UPDATE the existing row rather than insert a duplicate — see the
 * upsert-path TODO in that file.
 *
 * Body: {}  (authenticated via Bearer token in Authorization header)
 *
 * Response 200:
 *   { studio: { id, name, token_ticker, treasury_address, ... },
 *     created: boolean }
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

// Polyfill webcrypto for @bsv/sdk in Node.js runtimes
import { webcrypto } from 'node:crypto';
if (!(globalThis as any).crypto) (globalThis as any).crypto = webcrypto;

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

function generateBaseTicker(name: string): string {
  const alpha = name.toUpperCase().replace(/[^A-Z]/g, '');
  return alpha.slice(0, 5).padEnd(3, 'X');
}

async function pickUniqueTicker(
  supabase: any,
  name: string,
): Promise<string> {
  const base = generateBaseTicker(name);
  {
    const { data } = await supabase
      .from('bct_studios')
      .select('token_ticker')
      .eq('token_ticker', base)
      .maybeSingle();
    if (!data) return base;
  }
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base.slice(0, 5 - String(i).length)}${i}`;
    const { data } = await supabase
      .from('bct_studios')
      .select('token_ticker')
      .eq('token_ticker', candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  throw new Error(`Could not generate a unique ticker for "${name}"`);
}

// Derive a studio name from an authed user. Prefers the Supabase
// display_name or full_name, falls back to the email prefix, falls
// back to "Anonymous studio" if nothing's available. Always suffixed
// with " studio" so the token ticker generation has something to
// work with.
function deriveStudioName(email: string | null | undefined, displayName: string | null | undefined): string {
  const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
  if (displayName) {
    const d = clean(displayName);
    if (d.length >= 2) return `${d}'s studio`;
  }
  if (email) {
    const prefix = email.split('@')[0] || '';
    const c = clean(prefix.replace(/[._+-]/g, ' '));
    if (c.length >= 2) return `${c}'s studio`;
  }
  return 'Anonymous studio';
}

// Short random id for the studio row id field (bct_studios.id is text).
// Collision-resistant enough for a user-initiated row without needing
// a DB round-trip check.
function randomStudioId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `studio-${ts}-${rand}`;
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
    res.status(500).json({ error: 'Supabase env vars missing' });
    return;
  }

  // Bearer token check — we need the authed user to find their account.
  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : '';
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!bearer) {
    res.status(401).json({ error: 'Bearer token required' });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // Resolve auth user from the JWT
  const { data: userData, error: userErr } = await supabase.auth.getUser(bearer);
  if (userErr || !userData?.user) {
    res.status(401).json({ error: 'Invalid session', detail: userErr?.message });
    return;
  }
  const authUser = userData.user;

  // Resolve bct_accounts row
  const { data: accountRow, error: acctErr } = await supabase
    .from('bct_accounts')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();
  if (acctErr) {
    res.status(500).json({ error: 'Account lookup failed', detail: acctErr.message });
    return;
  }
  if (!accountRow) {
    res.status(403).json({ error: 'No bMovies account linked to this user' });
    return;
  }
  const accountId = accountRow.id as string;

  // ─── Idempotency: return existing studio if present ───
  const { data: existing } = await supabase
    .from('bct_studios')
    .select('*')
    .eq('owner_account_id', accountId)
    .maybeSingle();
  if (existing) {
    res.status(200).json({ studio: existing, created: false });
    return;
  }

  // ─── Create a fresh default studio ───
  const displayName = (authUser.user_metadata as Record<string, unknown> | null)?.full_name as string | undefined
    || (authUser.user_metadata as Record<string, unknown> | null)?.display_name as string | undefined
    || null;
  const studioName = deriveStudioName(authUser.email || null, displayName);

  const { PrivateKey } = await import('@bsv/sdk');
  const treasuryKey = PrivateKey.fromRandom();
  const treasuryAddress = treasuryKey.toAddress().toString();
  const treasuryWif = treasuryKey.toWif();

  const ticker = await pickUniqueTicker(supabase, studioName);
  const studioId = randomStudioId();

  const { data: inserted, error: insertErr } = await supabase
    .from('bct_studios')
    .insert({
      id: studioId,
      name: studioName,
      token_ticker: ticker,
      treasury_address: treasuryAddress,
      treasury_wif: treasuryWif,
      owner_account_id: accountId,
      created_by: 'auto',
      founded_year: new Date().getUTCFullYear(),
    })
    .select('*')
    .single();
  if (insertErr) {
    console.error('[studio/ensure-default] insert failed:', insertErr);
    res.status(500).json({ error: 'Studio insert failed', detail: insertErr.message });
    return;
  }

  res.status(200).json({ studio: inserted, created: true });
}
