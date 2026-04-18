/**
 * POST /api/studio/complete
 *
 * Called by the client after Stripe checkout completes successfully.
 * Verifies the Stripe session is paid, then provisions the studio:
 *   1. Generates studio logo via xAI Grok Imagine
 *   2. Generates studio bio via Grok chat
 *   3. Generates treasury address via @bsv/sdk
 *   4. Inserts bct_studios row
 *   5. Generates 8 agent names + personas via Grok chat (2 calls)
 *   6. Generates 8 agent wallet addresses
 *   7. Inserts 8 bct_agents rows
 *
 * Idempotent on stripe_session_id — calling twice with the same
 * session returns the existing studio instead of creating a duplicate.
 *
 * Body:
 *   { session_id: string }
 *
 * Headers:
 *   Authorization: Bearer <supabase-jwt>
 *
 * Response:
 *   { studio: {...}, agents: [...] }
 *
 * Env:
 *   STRIPE_SECRET_KEY
 *   XAI_API_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
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

/** Generate a base token ticker from a studio name (5 alpha chars, X-padded). */
function generateBaseTicker(name: string): string {
  const alpha = name.toUpperCase().replace(/[^A-Z]/g, '');
  return alpha.slice(0, 5).padEnd(3, 'X');
}

/**
 * Pick a token ticker that's not already in bct_studios. Tries the
 * base (first-5-letters-of-name) first; on collision tries the same
 * letters with a numeric suffix (BITCO → BITCO2 → BITCO3 …). Bails
 * out after 99 attempts — if a studio name collides that hard,
 * something else is wrong and the caller should surface it.
 *
 * Added because 'Bitcoin Corporation Studios' and 'Bitcoin Operating
 * System Studios' both map to BITCO under the simple first-5 rule,
 * and the second user to register hit the UNIQUE constraint 500.
 */
async function pickUniqueTicker(
  supabase: any,
  name: string,
): Promise<string> {
  const base = generateBaseTicker(name);
  // First try the plain base
  {
    const { data } = await supabase
      .from('bct_studios')
      .select('token_ticker')
      .eq('token_ticker', base)
      .maybeSingle();
    if (!data) return base;
  }
  // Then try base + N until we find a free slot
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base.slice(0, 5 - String(i).length)}${i}`;
    const { data } = await supabase
      .from('bct_studios')
      .select('token_ticker')
      .eq('token_ticker', candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  throw new Error(
    `Could not generate a unique ticker for "${name}" (first 99 variants taken)`,
  );
}

/** Role abbreviations for agent token tickers. */
const ROLE_ABBREV: Record<string, string> = {
  writer: 'WR',
  director: 'DR',
  cinematographer: 'CI',
  storyboard: 'ST',
  editor: 'ED',
  composer: 'CO',
  sound_designer: 'SD',
  producer: 'PR',
};

const AGENT_ROLES = [
  'writer',
  'director',
  'cinematographer',
  'storyboard',
  'editor',
  'composer',
  'sound_designer',
  'producer',
] as const;

const ROLE_LABELS: Record<string, string> = {
  writer: 'Writer',
  director: 'Director',
  cinematographer: 'Cinematographer',
  storyboard: 'Storyboard artist',
  editor: 'Editor',
  composer: 'Composer',
  sound_designer: 'Sound designer',
  producer: 'Producer',
};

// ─── xAI helpers ───

async function grokChat(
  apiKey: string,
  system: string,
  user: string,
): Promise<string> {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.9,
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Grok chat failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  return (json.choices?.[0]?.message?.content ?? '').trim();
}

async function grokImagine(
  apiKey: string,
  prompt: string,
): Promise<string | null> {
  try {
    const res = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-imagine-image',
        prompt,
        n: 1,
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      console.error(`[studio/complete] grok-imagine failed (${res.status})`);
      return null;
    }
    const json = await res.json();
    return json.data?.[0]?.url ?? null;
  } catch (err) {
    console.error('[studio/complete] grok-imagine error:', err);
    return null;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const xaiKey = process.env.XAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeKey || !supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'env missing (Stripe/Supabase)' });
    return;
  }
  if (!xaiKey) {
    res.status(500).json({ error: 'XAI_API_KEY not configured' });
    return;
  }

  // Parse body
  let body: { session_id?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const sessionId = (body.session_id || '').trim();
  if (!sessionId) {
    res.status(400).json({ error: 'session_id required' });
    return;
  }

  // Auth: verify JWT from Authorization header
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';
  if (!token) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  // ─── Idempotency check: already provisioned for this Stripe session? ───
  const { data: existingStudio } = await supabase
    .from('bct_studios')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .maybeSingle();

  if (existingStudio) {
    // Already provisioned — return existing data
    const { data: existingAgents } = await supabase
      .from('bct_agents')
      .select('*')
      .eq('studio', existingStudio.id)
      .order('role');
    res.status(200).json({
      studio: existingStudio,
      agents: existingAgents || [],
      cached: true,
    });
    return;
  }

  // ─── Verify Stripe session is paid ───
  let Stripe: typeof import('stripe').default;
  try {
    const mod = await import('stripe');
    Stripe = mod.default;
  } catch {
    res.status(500).json({ error: 'stripe package not installed' });
    return;
  }
  const stripe = new Stripe(stripeKey, { apiVersion: '2026-03-25.dahlia' });

  let stripeSession: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>;
  try {
    stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: `Invalid session: ${msg}` });
    return;
  }

  if (stripeSession.payment_status !== 'paid') {
    res.status(402).json({ error: 'Payment not completed' });
    return;
  }

  const meta = (stripeSession.metadata || {}) as Record<string, string>;
  if (meta.product !== 'studio-creation') {
    res.status(400).json({ error: 'This session is not a studio creation checkout' });
    return;
  }

  const studioName = meta.studioName || 'Untitled Studio';
  const accountId = meta.accountId;
  const aesthetic = meta.aesthetic || '';

  if (!accountId) {
    res.status(400).json({ error: 'Missing accountId in session metadata' });
    return;
  }

  // Verify the authenticated user matches the account
  const { data: account } = await supabase
    .from('bct_accounts')
    .select('id, auth_user_id')
    .eq('id', accountId)
    .maybeSingle();

  if (!account || account.auth_user_id !== user.id) {
    res.status(403).json({ error: 'Session does not belong to the authenticated user' });
    return;
  }

  // ─── Generate studio assets in parallel where possible ───
  console.log(`[studio/complete] provisioning studio "${studioName}" for account ${accountId}`);

  // ─── Detect auto-placeholder ───
  // /api/studio/ensure-default creates a minimal studio row
  // (created_by='auto') for every signed-in user. When the user pays
  // $0.99 to upgrade, we don't want to insert a second studio — the
  // schema has no UNIQUE on owner_account_id but the UI relies on
  // .maybeSingle(), so two rows would break the account page. We
  // reuse the placeholder's id, token_ticker, and treasury_address
  // (the ticker is already inscribed/quoted in any welcome UX), and
  // fill in everything else with the Grok-generated assets below.
  const { data: placeholder } = await supabase
    .from('bct_studios')
    .select('id, token_ticker, treasury_address, created_by')
    .eq('owner_account_id', accountId)
    .maybeSingle();
  const isUpgrade = placeholder?.created_by === 'auto';

  const aestheticLabel = aesthetic || 'eclectic and bold';

  // Generate treasury address (only if this is a brand-new studio —
  // an upgrade reuses the placeholder's existing treasury so BSV
  // received during the placeholder phase lands in the same wallet).
  const { PrivateKey } = await import('@bsv/sdk');
  const treasuryAddress = isUpgrade
    ? (placeholder!.treasury_address as string)
    : PrivateKey.fromRandom().toAddress().toString();

  const ticker = isUpgrade
    ? (placeholder!.token_ticker as string)
    : await pickUniqueTicker(supabase, studioName);
  const studioId = isUpgrade
    ? (placeholder!.id as string)
    : `user-studio-${accountId}-${Date.now()}`;

  // ─── Batch 1 (parallel): logo + bio + agent names ───
  // These three have no interdependencies — fire simultaneously.

  const logoPrompt =
    `Cinematic branded logo for '${studioName}' film studio. ` +
    `Bold, impactful mark on solid black background. ` +
    `Style: ${aestheticLabel}. Professional Hollywood studio quality. ` +
    `Metallic or subtle glow effect. No text — symbol/monogram only. ` +
    `Clean vector aesthetic, cinematic lighting. --ar 1:1 --stylize 100`;

  const [logoUrl, bio, agentNamesRaw] = await Promise.all([
    grokImagine(xaiKey, logoPrompt),
    grokChat(
      xaiKey,
      'You are a creative branding consultant for a film studio.',
      `Write a one-paragraph bio (50-80 words) for a new AI film studio called '${studioName}'. ` +
        `Aesthetic: ${aestheticLabel}. The studio commissions AI-generated feature films. ` +
        `Make it sound professional and cinematic. No meta-commentary. Return ONLY the paragraph.`,
    ),
    grokChat(
      xaiKey,
      'You are a creative naming consultant for an AI film studio.',
      `Generate 8 creative names for the following AI agent roles at film studio '${studioName}' (aesthetic: ${aestheticLabel}):\n` +
        `1. Writer\n2. Director\n3. Cinematographer\n4. Storyboard artist\n5. Editor\n6. Composer\n7. Sound designer\n8. Producer\n\n` +
        `Return ONLY the names, one per line, in the order listed. Make them memorable and theatrical. No numbering, no role labels, just the names.`,
    ),
  ]);

  // Parse agent names (one per line)
  const agentNames = agentNamesRaw
    .split('\n')
    .map((l) => l.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter((l) => l.length > 0)
    .slice(0, 8);

  while (agentNames.length < 8) {
    agentNames.push(`Agent-${agentNames.length + 1}`);
  }

  // ─── Batch 2 (parallel): roster poster + personas ───
  // Both need agent names from batch 1.

  // Build the credit block for the poster prompt
  const creditBlock = AGENT_ROLES
    .map((role, i) => `${ROLE_LABELS[role]} ${agentNames[i]} ★3.0`)
    .join('\n');

  const posterPrompt =
    `Cinematic branded roster poster for ${studioName} — ${aestheticLabel}. ` +
    `Large, bold, impactful studio title "${studioName}" at the very top in a stylish font with subtle glow or metallic effect. ` +
    `Clean 2x4 grid of 8 circular profile portraits in the center. Each portrait is a professional headshot of an AI film agent. ` +
    `Under each circle, clearly display the agent's full name and ★3.0 rating. ` +
    `Below the grid, a clean and well-organized credit block listing all 8 agents with their exact roles:\n` +
    creditBlock + `\n` +
    `At the bottom, an elegant tagline that captures the studio's signature style. ` +
    `Background should match the studio's aesthetic: ${aestheticLabel}, ` +
    `but keep it elegant and not too busy so the profiles and text remain clearly readable. ` +
    `Include a subtle studio logo or watermark in the bottom corner. ` +
    `Overall style: professional theatrical movie studio promotional poster, clean modern layout, ` +
    `high detail, cinematic lighting, balanced composition --ar 16:9 --stylize 100`;

  const personaPrompt =
    `Write one-sentence personas (under 30 words each) for these 8 AI film agents at studio '${studioName}' (aesthetic: ${aestheticLabel}).\n\n` +
    AGENT_ROLES.map((role, i) => `${i + 1}. ${agentNames[i]} — ${ROLE_LABELS[role]}`).join('\n') +
    `\n\nReturn ONLY the personas, one per line, in order. Be vivid and specific. No numbering, no names, no role labels, just the persona sentence.`;

  const [posterUrl, personasRaw] = await Promise.all([
    grokImagine(xaiKey, posterPrompt),
    grokChat(
      xaiKey,
      'You are a creative consultant building AI agent backstories for a film studio.',
      personaPrompt,
    ),
  ]);

  const personas = personasRaw
    .split('\n')
    .map((l) => l.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter((l) => l.length > 0)
    .slice(0, 8);

  while (personas.length < 8) {
    personas.push('A versatile specialist ready for any production challenge.');
  }

  // ─── Upsert studio row ───
  // For upgrades (placeholder → paid) we UPDATE in place to preserve
  // id/ticker/treasury. For fresh studios we INSERT.
  const studioRow = {
    id: studioId,
    name: studioName,
    token_ticker: ticker,
    treasury_address: treasuryAddress,
    bio: bio || null,
    logo_url: logoUrl || null,
    poster_url: posterUrl || null,
    poster_prompt: posterPrompt,
    founded_year: new Date().getFullYear(),
    aesthetic: aesthetic || null,
    owner_account_id: accountId,
    created_by: 'user',
    logo_prompt: logoPrompt,
    stripe_session_id: sessionId,
  };

  const studioErr = isUpgrade
    ? (await supabase
        .from('bct_studios')
        .update({
          name: studioName,
          bio: bio || null,
          logo_url: logoUrl || null,
          poster_url: posterUrl || null,
          poster_prompt: posterPrompt,
          aesthetic: aesthetic || null,
          created_by: 'user',
          logo_prompt: logoPrompt,
          stripe_session_id: sessionId,
        })
        .eq('id', studioId)).error
    : (await supabase.from('bct_studios').insert(studioRow)).error;

  if (studioErr) {
    // Could be a race condition — check for existing row by session_id
    const { data: raceStudio } = await supabase
      .from('bct_studios')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();
    if (raceStudio) {
      const { data: raceAgents } = await supabase
        .from('bct_agents')
        .select('*')
        .eq('studio', raceStudio.id)
        .order('role');
      res.status(200).json({ studio: raceStudio, agents: raceAgents || [], cached: true });
      return;
    }
    console.error('[studio/complete] studio write failed:', studioErr);
    res.status(500).json({ error: 'Studio creation failed' });
    return;
  }

  // ─── Insert 8 agent rows ───
  const agentRows = AGENT_ROLES.map((role, i) => {
    const agentKey = PrivateKey.fromRandom();
    const agentAddress = agentKey.toAddress().toString();
    const nameAlpha = agentNames[i].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'X');
    const agentTicker = `${nameAlpha}${ROLE_ABBREV[role] || 'XX'}`;

    return {
      id: `${studioId}--${role}`,
      name: agentNames[i],
      studio: studioId,
      role,
      persona: personas[i],
      wallet_address: agentAddress,
      reputation: 3.0,
      jobs_completed: 0,
      total_earned_sats: 0,
      token_ticker: agentTicker,
      owner_account_id: accountId,
    };
  });

  const { error: agentsErr } = await supabase
    .from('bct_agents')
    .insert(agentRows);

  if (agentsErr) {
    console.error('[studio/complete] agents insert failed:', agentsErr);
    // Studio was created but agents failed — not ideal but recoverable
    res.status(200).json({
      studio: studioRow,
      agents: [],
      warning: 'Studio created but agent generation failed. Refresh to retry.',
    });
    return;
  }

  console.log(
    `[studio/complete] studio "${studioName}" ($${ticker}) provisioned with 8 agents ` +
      `(session ${sessionId}, account ${accountId})`,
  );

  // ─── Welcome pitch — one free pitch included with the $0.99 studio ───
  //
  // Fire-and-forget. The studio-create purchase covers a complimentary
  // pitch commission so the new studio has a film in its workbench the
  // moment it lands on /account. Title is auto-generated from the
  // studio name; the commissioner can rename / revise from the film
  // page at any point before publishing. Mirrors the judge-coupon
  // path (same bct_offers schema, same trailer pipeline dispatch,
  // minus the IP rate-limit row).
  //
  // If this insert or dispatch fails for any reason we still return
  // 200 from the outer handler — the studio is already provisioned,
  // the welcome pitch is a bonus and the user can always commission
  // one manually. Failure is logged as a warning.
  let welcomePitch: { offerId: string; title: string } | null = null;
  try {
    const pitchTitle = `${studioName} — Opening Pitch`;
    const pitchTicker = `${generateBaseTicker(studioName).slice(0, 4)}P`;
    const pitchId = `pitch-studio-welcome-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { error: pitchErr } = await supabase.from('bct_offers').insert({
      id: pitchId,
      producer_id: 'studio-welcome',
      producer_address:
        process.env.PITCH_RECEIVE_ADDRESS || '15q3UKrYYNuXRSg3gtb52pEnbaeiGK4m7b',
      title: pitchTitle,
      synopsis:
        `The opening pitch for ${studioName}. ` +
        `The swarm produces a logline, synopsis, character portraits, ` +
        `storyboards, and a movie poster. Rename and revise at any time ` +
        `before upgrading to a trailer.`,
      required_sats: 1000,
      raised_sats: 1000,
      status: 'funded',
      token_ticker: pitchTicker,
      tier: 'pitch',
      commissioner_percent: 99,
      parent_offer_id: null,
      account_id: accountId,
      pipeline_state: {
        source: 'studio-welcome',
        studioId,
        stripeSessionId: sessionId,
      },
    });
    if (pitchErr) {
      console.warn('[studio/complete] welcome-pitch insert failed:', pitchErr.message);
    } else {
      welcomePitch = { offerId: pitchId, title: pitchTitle };
      // Kick off the pitch pipeline inline — same dispatch path as the
      // Stripe-webhook $0.99 pitch. Fire-and-forget.
      fetch('https://bmovies.online/api/trailer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId: pitchId }),
      }).catch((err) => {
        console.warn('[studio/complete] welcome-pitch dispatch failed:', err?.message || err);
      });
      console.log(`[studio/complete] welcome pitch queued: ${pitchId}`);
    }
  } catch (err) {
    console.warn('[studio/complete] welcome-pitch block threw:', err);
  }

  res.status(200).json({
    studio: studioRow,
    agents: agentRows,
    welcomePitch,
  });
}
