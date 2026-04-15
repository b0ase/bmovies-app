/**
 * POST /api/feature/revise
 *
 * Queue a revision for a feature in draft state. The Hetzner-resident
 * feature-worker.ts drains bct_revisions on every tick: it picks up the
 * row, re-runs the relevant pipeline step with the user's note injected
 * via pipeline_state.revisionNote, creates a new versioned artifact
 * (the old one's superseded_by gets pointed at the new id), decrements
 * bct_offers.revisions_remaining, and marks the revision row completed.
 *
 * The whole point is that this endpoint and the chat layer (when we
 * wire it up later) both insert into bct_revisions — same code path,
 * same on-chain trail, same versioning. The chat layer is just a UI
 * over this endpoint.
 *
 * Request body:
 *   {
 *     offerId: string,            // bct_offers.id, must be in 'draft' status
 *     stepId:  string,            // which pipeline step to re-run, e.g. 'editor.fine_cut'
 *     scope:   'scene' | 'cut' | 'score' | 'mix' | 'wholesale',
 *     sceneIndex?: number,        // for scope='scene'
 *     note:    string,            // natural-language revision note
 *     accountId?: string,         // bct_accounts.id (gating: must be commissioner)
 *   }
 *
 * Response (200):
 *   { ok: true, revisionId: number, remainingBudget: number }
 *
 * Response (402):
 *   { ok: false, reason: 'budget_exhausted', extraRevisionCents: number }
 *   — caller should redirect through Stripe for the extra-revision SKU
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

const ALLOWED_SCOPES = new Set(['scene', 'cut', 'score', 'mix', 'wholesale']);

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

  let body: {
    offerId?: string;
    stepId?: string;
    scope?: string;
    sceneIndex?: number;
    note?: string;
    accountId?: string;
  };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const offerId = body.offerId?.trim();
  const stepId = body.stepId?.trim();
  const scope = body.scope?.trim() || 'scene';
  const note = (body.note || '').trim();

  if (!offerId || !stepId) {
    res.status(400).json({ error: 'offerId and stepId are required' });
    return;
  }
  if (!note || note.length < 4) {
    res.status(400).json({ error: 'note must be at least 4 characters' });
    return;
  }
  if (!ALLOWED_SCOPES.has(scope)) {
    res.status(400).json({ error: `scope must be one of: ${[...ALLOWED_SCOPES].join(', ')}` });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // Load the offer + tier config so we can decide if there's free budget left
  const { data: offer, error: loadErr } = await supabase
    .from('bct_offers')
    .select('id, tier, status, account_id, revisions_remaining, revisions_total')
    .eq('id', offerId)
    .maybeSingle();

  if (loadErr || !offer) {
    res.status(404).json({ error: 'offer not found' });
    return;
  }

  if (offer.status !== 'draft') {
    res.status(409).json({ error: `offer is in status "${offer.status}", revisions are only allowed in "draft"` });
    return;
  }

  // Soft auth check — if accountId is provided, must match
  if (body.accountId && offer.account_id && body.accountId !== offer.account_id) {
    res.status(403).json({ error: 'only the commissioner can request revisions' });
    return;
  }

  // Budget check
  if ((offer.revisions_remaining ?? 0) <= 0) {
    const { data: tierCfg } = await supabase
      .from('bct_tier_config')
      .select('extra_revision_cents')
      .eq('tier', offer.tier)
      .maybeSingle();
    res.status(402).json({
      ok: false,
      reason: 'budget_exhausted',
      extraRevisionCents: tierCfg?.extra_revision_cents ?? 4999,
      message: 'Free revision budget exhausted. Pay for an extra revision via Stripe.',
    });
    return;
  }

  // Queue the revision. The worker will pick it up on the next tick
  // (within ~30 seconds), re-run the step with the note injected, and
  // mark this row completed.
  const { data: inserted, error: insertErr } = await supabase
    .from('bct_revisions')
    .insert({
      offer_id: offerId,
      account_id: body.accountId || offer.account_id || null,
      step_id: stepId,
      scope,
      scene_index: body.sceneIndex ?? null,
      note: note.slice(0, 2000),
      status: 'queued',
      paid_via: 'free',
      cost_usd: 0,
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    console.error('[feature/revise] insert failed:', insertErr);
    res.status(500).json({ error: 'failed to queue revision', detail: insertErr?.message });
    return;
  }

  console.log(
    `[feature/revise] queued revision=${inserted.id} offer=${offerId} step=${stepId} scope=${scope} ` +
    `(${(offer.revisions_remaining ?? 0) - 1} remaining)`
  );

  res.status(200).json({
    ok: true,
    revisionId: inserted.id,
    remainingBudget: (offer.revisions_remaining ?? 0) - 1,
    message: `Revision queued. Worker will run "${stepId}" within ~30 seconds.`,
  });
}
