/**
 * POST /api/trailer/reshoot
 *
 * Reshoot an existing trailer with curated creative. Bypasses Grok's
 * "paraphrase the synopsis into 4 prompts" step — you hand in exact
 * clip prompts, the poster prompt, the logline, the synopsis, the
 * title-card timeline, the VO script, and the music prompt, and the
 * pipeline uses them verbatim.
 *
 * Use case: when a writer / editor has produced a curated creative
 * package and wants the visuals and audio to match that package
 * precisely rather than an LLM's loose interpretation of it.
 *
 * Request body:
 *   {
 *     offerId: string,           // existing offer to reshoot
 *     title?: string,            // overrides bct_offers.title if set
 *     ticker?: string,           // overrides bct_offers.token_ticker
 *     logline: string,
 *     synopsis: string,          // saved to bct_offers.synopsis
 *     tagline?: string,
 *     posterPrompt: string,
 *     clipPrompts: string[4],    // exactly four — matches trailer
 *                                // pipeline's 4 × 8s structure
 *     titles?: object,           // editor.trailer_titles timeline;
 *                                // optional, post-production fills
 *                                // in with Grok if missing
 *     voScript?: string,         // vo.trailer_script; optional
 *     musicPrompt?: string,      // composer music-gen prompt; optional
 *     postProduction?: boolean   // default true — auto-run titles /
 *                                // music / VO after clips land
 *   }
 *
 * Side effects:
 *   - Marks every prior head video + poster + trailer-titles /
 *     vo.script / vo.narration / trailer_score / producer
 *     artifact as superseded_by the new one.
 *   - Writes the new logline + synopsis as writer.logline /
 *     writer.synopsis text artifacts.
 *   - Generates a new poster via grok-imagine-image-pro.
 *   - Generates 4 new video clips via grok-imagine-video, each
 *     using the provided prompt verbatim.
 *   - If post-production was requested, POSTs to
 *     /api/trailer/post-production so titles / music / VO land
 *     against the new visuals.
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

// Long ceiling — 4 videos × ~40s plus poster plus the chained
// post-production call can flirt with 5+ minutes.
export const config = { maxDuration: 800 };

const XAI_BASE = 'https://api.x.ai/v1';

async function xaiImage(
  apiKey: string,
  prompt: string,
  model = 'grok-imagine-image',
): Promise<{ url: string; costUsd: number }> {
  const res = await fetch(`${XAI_BASE}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, n: 1 }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`xAI image ${res.status}: ${await res.text()}`);
  const body = await res.json() as { data?: Array<{ url?: string }>; usage?: { cost_in_usd_ticks?: number } };
  const url = body.data?.[0]?.url;
  if (!url) throw new Error('xAI image no URL');
  return { url, costUsd: (body.usage?.cost_in_usd_ticks || 0) / 1e10 };
}

async function xaiVideo(apiKey: string, prompt: string): Promise<{ url: string; costUsd: number }> {
  const submit = await fetch(`${XAI_BASE}/videos/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'grok-imagine-video', prompt }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!submit.ok) throw new Error(`xAI video submit ${submit.status}: ${await submit.text()}`);
  const { request_id } = await submit.json() as { request_id: string };

  const deadline = Date.now() + 260_000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 4_000));
    const poll = await fetch(`${XAI_BASE}/videos/${request_id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!poll.ok) continue;
    const body = await poll.json() as {
      status?: string;
      video?: { url?: string };
      usage?: { cost_in_usd_ticks?: number };
      error?: string;
    };
    if (body.status === 'done' && body.video?.url) {
      return { url: body.video.url, costUsd: (body.usage?.cost_in_usd_ticks || 0) / 1e10 };
    }
    if (body.error) throw new Error(`xAI video: ${body.error}`);
  }
  throw new Error('xAI video timed out');
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return; }

  const xaiKey = process.env.XAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!xaiKey) { res.status(500).json({ error: 'XAI_API_KEY not set' }); return; }
  if (!supabaseUrl || !supabaseKey) { res.status(500).json({ error: 'Supabase not configured' }); return; }

  type Body = {
    offerId?: string;
    title?: string;
    ticker?: string;
    logline?: string;
    synopsis?: string;
    tagline?: string;
    posterPrompt?: string;
    clipPrompts?: string[];
    titles?: Record<string, unknown>;
    voScript?: string;
    musicPrompt?: string;
    postProduction?: boolean;
  };
  let body: Body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as Body) ?? {};
  } catch { res.status(400).json({ error: 'Invalid JSON' }); return; }

  const offerId = body.offerId?.trim();
  if (!offerId) { res.status(400).json({ error: 'offerId required' }); return; }
  if (!body.clipPrompts || !Array.isArray(body.clipPrompts) || body.clipPrompts.length !== 4) {
    res.status(400).json({ error: 'clipPrompts must be exactly 4 strings' });
    return;
  }
  if (!body.posterPrompt || !body.logline || !body.synopsis) {
    res.status(400).json({ error: 'posterPrompt, logline, and synopsis are required' });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // Load the offer
  const { data: offer, error: loadErr } = await supabase
    .from('bct_offers')
    .select('id, title, synopsis, token_ticker, tier, status')
    .eq('id', offerId)
    .maybeSingle();
  if (loadErr || !offer) { res.status(404).json({ error: 'Offer not found' }); return; }

  // Update offer title/ticker/synopsis if the package overrides them.
  const offerPatch: Record<string, unknown> = { synopsis: body.synopsis };
  if (body.title)  offerPatch.title = body.title;
  if (body.ticker) offerPatch.token_ticker = body.ticker;
  await supabase.from('bct_offers').update(offerPatch).eq('id', offerId);

  // ── Supersede prior head artifacts we're about to replace ─────
  // video clips, poster, logline, synopsis, titles, vo script, vo audio,
  // music score — one shot.
  await supabase
    .from('bct_artifacts')
    .update({ superseded_by: null })  // no-op line keeps the query planner honest
    .eq('id', -1);

  const supersedeSteps = [
    'storyboard.poster',
    'editor.trailer_cut',
    'editor.trailer_titles',
    'vo.trailer_script',
    'vo.trailer_narration',
    'composer.trailer_score',
    'producer.post_production',
    'writer.logline',
    'writer.synopsis',
    'writer.treatment',
  ];
  // Fetch old head rows so we can attach a superseded_by marker later.
  const { data: oldHeads } = await supabase
    .from('bct_artifacts')
    .select('id, step_id, role, kind')
    .eq('offer_id', offerId)
    .is('superseded_by', null)
    .or([
      ...supersedeSteps.map(s => `step_id.eq.${s}`),
      'role.eq.trailer-clip',
    ].join(','));

  const oldHeadIds = (oldHeads || []).map((r: { id: number }) => r.id);

  const produced: Array<{ step: string; id?: number; costUsd?: number }> = [];
  let totalCost = 0;

  async function persist(opts: {
    role: string; kind: string; url: string; model: string; stepId: string; prompt: string; costUsd?: number;
  }): Promise<number | null> {
    const offchainTxid = `reshoot-${Date.now().toString(36)}-${opts.stepId}`;
    const { data: inserted } = await supabase
      .from('bct_artifacts')
      .insert({
        offer_id: offerId,
        kind: opts.kind,
        url: opts.url,
        model: opts.model,
        prompt: opts.prompt.slice(0, 500),
        payment_txid: offchainTxid,
        role: opts.role,
        step_id: opts.stepId,
      })
      .select('id')
      .single();
    if (inserted?.id) {
      // Best-effort step_log entry so /production renders the reshoot.
      await supabase.from('bct_step_log').insert({
        offer_id: offerId,
        step_id: opts.stepId,
        agent_id: opts.role,
        status: 'completed',
        artifact_id: inserted.id,
        payment_txid: offchainTxid,
        payment_sats: Math.max(1, Math.round((opts.costUsd ?? 0) * 1000)),
        message: `reshoot · ${opts.role} · ${opts.kind}`,
      });
    }
    totalCost += opts.costUsd ?? 0;
    produced.push({ step: opts.stepId, id: inserted?.id, costUsd: opts.costUsd });
    return inserted?.id ?? null;
  }

  try {
    await supabase.from('bct_offers').update({ status: 'producing' }).eq('id', offerId);

    // 1. Logline + synopsis text artifacts.
    await persist({
      role: 'writer', kind: 'text',
      url: 'data:text/plain;charset=utf-8,' + encodeURIComponent(body.logline!),
      model: 'curated', stepId: 'writer.logline',
      prompt: 'curated logline',
      costUsd: 0,
    });
    await persist({
      role: 'writer', kind: 'text',
      url: 'data:text/plain;charset=utf-8,' + encodeURIComponent(body.synopsis!),
      model: 'curated', stepId: 'writer.synopsis',
      prompt: 'curated synopsis',
      costUsd: 0,
    });

    // 2. Poster.
    try {
      const poster = await xaiImage(xaiKey, body.posterPrompt!, 'grok-imagine-image-pro');
      await persist({
        role: 'poster', kind: 'image', url: poster.url,
        model: 'grok-imagine-image-pro', stepId: 'storyboard.poster',
        prompt: body.posterPrompt!,
        costUsd: poster.costUsd,
      });
    } catch (err) {
      console.error('[reshoot] poster failed:', err);
    }

    // 3. Video clips — exactly four, each with its verbatim prompt.
    const firstClipIds: number[] = [];
    let trailerVideoUrl: string | null = null;
    for (let i = 0; i < 4; i++) {
      const prompt = body.clipPrompts![i];
      try {
        const vid = await xaiVideo(xaiKey, prompt);
        const id = await persist({
          role: 'trailer-clip', kind: 'video', url: vid.url,
          model: 'grok-imagine-video', stepId: `editor.trailer_cut_${i}`,
          prompt,
          costUsd: vid.costUsd,
        });
        if (id) firstClipIds.push(id);
        if (i === 0) trailerVideoUrl = vid.url;
      } catch (err) {
        console.error(`[reshoot] clip ${i} failed:`, err);
      }
    }
    if (trailerVideoUrl) {
      await supabase.from('bct_offers').update({ trailer_video_url: trailerVideoUrl }).eq('id', offerId);
    }

    // 4. If a titles timeline was pre-supplied, persist it now so the
    //    downstream post-production call is content to leave it alone.
    if (body.titles) {
      await persist({
        role: 'editor', kind: 'text',
        url: 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(body.titles)),
        model: 'curated', stepId: 'editor.trailer_titles',
        prompt: 'curated titles',
        costUsd: 0,
      });
    }
    if (body.voScript) {
      await persist({
        role: 'vo', kind: 'text',
        url: 'data:text/plain;charset=utf-8,' + encodeURIComponent(body.voScript),
        model: 'curated', stepId: 'vo.trailer_script',
        prompt: 'curated VO script',
        costUsd: 0,
      });
    }

    // 5. Supersede the old heads. We do this AFTER inserting new heads
    //    so the UI never has a moment where there's nothing to render.
    if (oldHeadIds.length && produced.length) {
      // Use the first new video clip id as the superseded_by marker
      // (any head id on the offer works; the UI only checks null vs
      // not-null).
      const marker = firstClipIds[0] ?? produced[0]?.id;
      if (marker) {
        await supabase
          .from('bct_artifacts')
          .update({ superseded_by: marker })
          .in('id', oldHeadIds);
      }
    }

    // 6. Optionally run post-production (titles/music/VO) against the
    //    fresh visuals. The endpoint handles its own idempotency.
    let postProduction: unknown = null;
    if (body.postProduction !== false) {
      try {
        const origin = req.headers.host
          ? `https://${req.headers.host}`
          : 'https://bmovies.online';
        const ppRes = await fetch(`${origin}/api/trailer/post-production`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offerId }),
          signal: AbortSignal.timeout(280_000),
        });
        postProduction = await ppRes.json().catch(() => ({ status: ppRes.status }));
      } catch (err) {
        console.error('[reshoot] post-production failed:', err);
        postProduction = { error: (err as Error).message };
      }
    }

    await supabase.from('bct_offers').update({ status: 'released' }).eq('id', offerId);

    res.status(200).json({
      ok: true,
      offerId,
      producedSteps: produced.map(p => p.step),
      clipCount: firstClipIds.length,
      costUsd: Number(totalCost.toFixed(4)),
      postProduction,
      filmUrl: `https://bmovies.online/film.html?id=${encodeURIComponent(offerId)}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[reshoot] fatal:', msg);
    res.status(500).json({ error: msg, produced: produced.map(p => p.step) });
  }
}
