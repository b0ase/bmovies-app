/**
 * POST /api/short/generate
 *
 * Run the full short-tier pipeline for a commissioned film ($99).
 * Scaled-up version of /api/trailer/generate — delivers more
 * content and more production notes than a trailer.
 *
 * Deliverables:
 *   1. Full treatment (1500-2000 words, Grok chat)
 *   2. Movie poster (Grok Imagine Image Pro)
 *   3. 12 storyboard frames (2x trailer)
 *   4. 8 video clips × 8s = 64 seconds (2x trailer)
 *   5. Director's shot list
 *   6. Editor's pacing notes
 *   7. Sound designer's plan
 *
 * Upstream cost: ~$3.70. Charge $99. Margin: ~$95.
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

// Short tier needs longer execution — 8 videos × ~30s + 12 images + text
export const config = {
  maxDuration: 800, // ~13 min max
};

const XAI_BASE = 'https://api.x.ai/v1';

async function xaiChat(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2000,
): Promise<string> {
  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.85,
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`xAI chat failed (${res.status}): ${await res.text()}`);
  const body = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return body.choices?.[0]?.message?.content?.trim() ?? '';
}

async function xaiImage(
  apiKey: string,
  prompt: string,
  model = 'grok-imagine-image',
): Promise<{ url: string; costUsd: number }> {
  const res = await fetch(`${XAI_BASE}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, n: 1 }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`xAI image failed (${res.status}): ${await res.text()}`);
  const body = await res.json() as {
    data?: Array<{ url?: string }>;
    usage?: { cost_in_usd_ticks?: number };
  };
  const url = body.data?.[0]?.url;
  if (!url) throw new Error('xAI image no URL');
  return { url, costUsd: (body.usage?.cost_in_usd_ticks || 0) / 1e10 };
}

async function xaiVideo(
  apiKey: string,
  prompt: string,
): Promise<{ url: string; duration: number; costUsd: number }> {
  const submit = await fetch(`${XAI_BASE}/videos/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'grok-imagine-video', prompt }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!submit.ok) throw new Error(`xAI video submit failed (${submit.status})`);
  const { request_id } = await submit.json() as { request_id: string };

  const timeout = Date.now() + 240_000;
  while (Date.now() < timeout) {
    await new Promise(r => setTimeout(r, 4_000));
    const poll = await fetch(`${XAI_BASE}/videos/${request_id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!poll.ok) throw new Error(`xAI video poll failed (${poll.status})`);
    const body = await poll.json() as {
      status?: string;
      video?: { url?: string; duration?: number };
      usage?: { cost_in_usd_ticks?: number };
      error?: string;
    };
    if (body.status === 'done' && body.video?.url) {
      return {
        url: body.video.url,
        duration: body.video.duration || 8,
        costUsd: (body.usage?.cost_in_usd_ticks || 0) / 1e10,
      };
    }
    if (body.error) throw new Error(`xAI video failed: ${body.error}`);
  }
  throw new Error('xAI video timed out');
}

const TREATMENT_PROMPT = `You are a professional film treatment writer for bMovies. Write a FULL FEATURE-LENGTH short-film treatment based on the title and synopsis.

CRITICAL RULES:
- Do NOT begin with meta-commentary. Start DIRECTLY with the opening image.
- Do NOT include headers, act labels, or scene numbers.
- Output ONLY the treatment itself.

Structure (invisible): Opening image → character introduction → inciting incident → complications → midpoint twist → dark moment → climax → resolution → final image.

1500-2000 words. Present tense. Vivid cinematic prose. Each paragraph is a distinct scene a director could storyboard. Include visual details, character actions, emotional beats.`;

const STORYBOARD_PROMPT_PROMPT = `Given a film title and synopsis, write 12 distinct storyboard frame descriptions as a JSON array of strings.

Each description is a 40-80 word cinematic visual prompt suitable for an AI image generator. Cover the full arc of the film: opening image, character intro, inciting incident, rising action, midpoint, dark moment, climax, final image, plus key supporting scenes.

CRITICAL: Output ONLY the JSON array of 12 strings. No preamble, no markdown fences.`;

const VIDEO_CLIP_PROMPT = `Given a film title and synopsis, write 8 distinct video clip prompts as a JSON array of strings.

Each prompt describes an 8-second cinematic moment that can be generated by an AI video model. Cover different beats of the film: opening shot, character moments, action/tension, quiet moments, climax, final image. 40-80 words each.

CRITICAL: Output ONLY the JSON array of 8 strings. No preamble.`;

const DIRECTOR_PROMPT = `Given a title and synopsis, write a director's shot list: 15-20 shots with framing (wide/medium/close/POV), lens, mood, and what happens in each. CRITICAL: Start DIRECTLY with "SHOT 1" — no preamble.`;

const EDITOR_PROMPT = `Given a title and synopsis, write an editing plan: scene transitions, pacing strategy, cut points, rhythm. CRITICAL: Start DIRECTLY with the notes, no preamble.`;

const SOUND_PROMPT = `Given a title and synopsis, write a sound design plan: ambient layers, key sound effects, foley notes, audio atmosphere for each act. CRITICAL: Start DIRECTLY with the notes, no preamble.`;

function stripFences(s: string): string {
  return s.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const xaiKey = process.env.XAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!xaiKey) { res.status(500).json({ error: 'XAI_API_KEY not set' }); return; }
  if (!supabaseUrl || !supabaseKey) { res.status(500).json({ error: 'Supabase not configured' }); return; }

  let body: { offerId?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch { res.status(400).json({ error: 'Invalid JSON' }); return; }

  const offerId = body.offerId?.trim();
  if (!offerId) { res.status(400).json({ error: 'offerId required' }); return; }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const { data: offer, error: loadErr } = await supabase
    .from('bct_offers')
    .select('id, title, synopsis, tier, status')
    .eq('id', offerId)
    .maybeSingle();
  if (loadErr || !offer) {
    res.status(404).json({ error: 'Offer not found' });
    return;
  }

  const context = `Title: ${offer.title}\n\nSynopsis: ${offer.synopsis}`;
  let totalCost = 0;
  const artifacts: Array<{ role: string; kind: string; costUsd: number }> = [];

  async function attach(role: string, kind: string, url: string, model: string, prompt: string, costUsd: number) {
    totalCost += costUsd;
    artifacts.push({ role, kind, costUsd });
    await supabase.from('bct_artifacts').insert({
      offer_id: offerId,
      kind,
      url,
      model,
      prompt: prompt.slice(0, 500),
      payment_txid: `short-${Date.now()}-${role}`,
      role,
    });
  }

  try {
    await supabase.from('bct_offers').update({ status: 'producing' }).eq('id', offerId);

    // 1. Full treatment
    const treatment = await xaiChat(xaiKey, TREATMENT_PROMPT, context, 3000);
    await attach('writer', 'text',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(treatment),
      'grok-3-mini', offer.title, 0.02);

    // 2. Poster
    try {
      const posterPrompt = `Cinematic movie poster for the short film "${offer.title}". ${offer.synopsis} Portrait orientation, bold title typography, dramatic lighting, atmospheric color palette. Award-caliber movie poster.`;
      const poster = await xaiImage(xaiKey, posterPrompt, 'grok-imagine-image-pro');
      await attach('poster', 'image', poster.url, 'grok-imagine-image-pro', posterPrompt, poster.costUsd);
    } catch (err) {
      console.error('[short] poster failed:', err);
    }

    // 3. Storyboard — 12 frames
    let storyboardPrompts: string[] = [];
    try {
      const raw = await xaiChat(xaiKey, STORYBOARD_PROMPT_PROMPT, context, 1500);
      storyboardPrompts = JSON.parse(stripFences(raw)) as string[];
    } catch (err) { console.error('[short] storyboard prompts failed:', err); }

    for (let i = 0; i < Math.min(12, storyboardPrompts.length); i++) {
      try {
        const img = await xaiImage(xaiKey, storyboardPrompts[i], 'grok-imagine-image');
        await attach('storyboard', 'image', img.url, 'grok-imagine-image', storyboardPrompts[i], img.costUsd);
      } catch (err) { console.error(`[short] storyboard ${i} failed:`, err); }
    }

    // 4. Video clips — 8 × 8s
    let videoPrompts: string[] = [];
    try {
      const raw = await xaiChat(xaiKey, VIDEO_CLIP_PROMPT, context, 1500);
      videoPrompts = JSON.parse(stripFences(raw)) as string[];
    } catch (err) { console.error('[short] video prompts failed:', err); }

    for (let i = 0; i < Math.min(8, videoPrompts.length); i++) {
      try {
        const vid = await xaiVideo(xaiKey, videoPrompts[i]);
        await attach('short-clip', 'video', vid.url, 'grok-imagine-video', videoPrompts[i], vid.costUsd);
        if (i === 0) {
          await supabase.from('bct_offers').update({ trailer_video_url: vid.url }).eq('id', offerId);
        }
      } catch (err) { console.error(`[short] video ${i} failed:`, err); }
    }

    // 5. Director's shot list
    try {
      const dir = await xaiChat(xaiKey, DIRECTOR_PROMPT, context, 1500);
      await attach('director', 'text',
        'data:text/plain;charset=utf-8,' + encodeURIComponent(dir),
        'grok-3-mini', offer.title, 0.015);
    } catch (err) { console.error('[short] director failed:', err); }

    // 6. Editor plan
    try {
      const ed = await xaiChat(xaiKey, EDITOR_PROMPT, context, 1200);
      await attach('editor', 'text',
        'data:text/plain;charset=utf-8,' + encodeURIComponent(ed),
        'grok-3-mini', offer.title, 0.012);
    } catch (err) { console.error('[short] editor failed:', err); }

    // 7. Sound designer plan
    try {
      const sd = await xaiChat(xaiKey, SOUND_PROMPT, context, 1200);
      await attach('sound_designer', 'text',
        'data:text/plain;charset=utf-8,' + encodeURIComponent(sd),
        'grok-3-mini', offer.title, 0.012);
    } catch (err) { console.error('[short] sound failed:', err); }

    await supabase.from('bct_offers').update({ status: 'released' }).eq('id', offerId);

    res.status(200).json({
      success: true,
      offerId,
      tier: 'short',
      artifacts: artifacts.length,
      costUsd: Number(totalCost.toFixed(4)),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[short] pipeline failed:', msg);
    res.status(500).json({
      error: msg,
      artifactsProduced: artifacts.length,
      partialCostUsd: Number(totalCost.toFixed(4)),
    });
  }
}
