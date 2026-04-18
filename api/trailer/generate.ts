/**
 * POST /api/trailer/generate
 *
 * Run the full trailer-tier pipeline for a commissioned film.
 * Generates every deliverable in the $9.99 trailer package:
 *
 *   1. Movie poster (Grok Imagine Image Pro)
 *   2. Full 800-word treatment (Grok chat)
 *   3. Character breakdown (4 characters)
 *   4. 6 storyboard frames (Grok Imagine Image)
 *   5. 4 video clips × 8s = 32s of real AI video (Grok Imagine Video)
 *   6. 60-second film score (Replicate MusicGen, optional)
 *   7. Cinematic voiceover (ElevenLabs, optional)
 *
 * Total upstream cost: ~$2. Charge $9.99. Margin ~80%.
 *
 * Request body: { offerId: string }
 * Response: { success: true, artifacts: number, costUsd: number }
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

// Allow longer execution for the full pipeline. The Style Bible step
// added ~20s; 4 × Grok Imagine Video clips are the real bottleneck
// at ~40s each. 300s was tight; 800s gives ~2× headroom and matches
// api/trailer/reshoot.ts so both paths time out in the same places.
export const config = {
  maxDuration: 800,
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
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.85,
    }),
    signal: AbortSignal.timeout(60_000),
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
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
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

/**
 * Submit an xAI grok-imagine-video job and poll for the result.
 *
 * @param referenceImages — up to 7 public HTTPS URLs (or data URIs).
 *   When provided, the API runs in reference-to-video mode: the text
 *   prompt should reference each image as <IMAGE_1>, <IMAGE_2>, etc.
 *   This is the single biggest lever we have for character and scene
 *   continuity — without it, each clip is a cold text-to-video call
 *   with no visual anchor and drifts immediately. See
 *   docs/research/ai-film-pipeline.md §11.
 */
async function xaiVideo(
  apiKey: string,
  prompt: string,
  referenceImages?: string[],
): Promise<{ url: string; duration: number; costUsd: number }> {
  const refs = (referenceImages ?? [])
    .filter((u): u is string => typeof u === 'string' && u.length > 0)
    .slice(0, 7);

  const requestBody: Record<string, unknown> = {
    model: 'grok-imagine-video',
    prompt,
  };
  if (refs.length > 0) {
    requestBody.reference_images = refs.map((url) => ({ url }));
  }

  const submit = await fetch(`${XAI_BASE}/videos/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(20_000),
  });
  if (!submit.ok) throw new Error(`xAI video submit failed (${submit.status}): ${await submit.text()}`);
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

const TREATMENT_PROMPT = `You are a professional film treatment writer for bMovies. Given a title and synopsis, write a FULL FILM TREATMENT as a multi-scene narrative document.

CRITICAL RULES:
- Do NOT begin with meta-commentary like "Below is...", "Here is...", "I've adopted...", "This treatment..." — start DIRECTLY with the first scene.
- Do NOT include headers, scene numbers, or "ACT ONE" labels.
- Do NOT explain your style. Output ONLY the treatment itself.

Structure (invisible to reader): Opening image → setup → inciting incident → rising action → midpoint reversal → dark moment → climax → final image.

800-1200 words. Present tense. Vivid cinematic prose. Start with the opening image.`;

// ─── Style Bible ───
//
// Generated between the treatment and every visual step. Gives Grok
// Imagine a consistent set of character wardrobes, locations, palette,
// and tonal references so its 4 video clips + storyboard + poster all
// share a visual vocabulary instead of drifting per call.
//
// visual_anchor is the critical field: a 15-25 word description of
// each character that MUST be quoted verbatim in every downstream
// clip / frame prompt that features them. Without this, Grok
// re-imagines the protagonist every call and character continuity
// falls apart — the #1 quality problem in AI trailers.
const STYLE_BIBLE_PROMPT = `You are the director on a short film trailer. Before any shot is drawn or any clip is rendered, write a STYLE BIBLE as strict JSON. This document is handed to the storyboard artist, DP, and video-gen camera — so every descriptor must be specific, visual, and usable by an image model.

Output exactly this shape:

{
  "tone_references": ["<Film 1>", "<Film 2>"],
  "palette": "<6-12 word palette description, e.g. 'moss green, brick red, custard yellow, one punch of neon orange'>",
  "camera_philosophy": "<1 sentence — lens, framing bias, motion, light, e.g. 'Handheld at eye-level, warm tungsten interiors, drone for exteriors, shallow focus on faces'>",
  "locations": [
    "<1-sentence hook-description for a key location>",
    "<another>",
    "<another>"
  ],
  "characters": [
    {
      "name": "<character name from the story>",
      "role": "<protagonist | antagonist | supporting>",
      "visual_anchor": "<20-25 words of strictly visual detail — age, build, hair, wardrobe, one distinctive prop, general vibe. No backstory, no personality, no adjectives about feeling. This text will be quoted verbatim in every shot containing this character so Grok Imagine keeps them consistent.>"
    }
  ]
}

Rules:
- 2-4 tone_reference films, named real films.
- 3-5 characters if the story supports it; protagonist first.
- Every visual_anchor must be strictly visual — what a camera sees, not how they feel.
- Output ONLY the JSON object. No markdown fences, no preamble, no prose.`;

const CHARACTER_PROMPT = `Given a film title and synopsis, write a character breakdown as valid JSON.

Return a JSON array of 4 characters: 1 protagonist + 3 supporting. Each object has:
  name, role, age, description (50-80 words), visual_prompt (for image generation)

CRITICAL: Output ONLY the JSON array, no preamble, no markdown fences, no explanation.`;

const STORYBOARD_PROMPT_PROMPT = `Given a film title, synopsis, treatment, and STYLE BIBLE, write 6 distinct storyboard frame descriptions as a JSON array of strings.

Each description is a cinematic visual prompt (40-80 words) suitable for an AI image generator.

MUST DO for every frame:
- If a character from the style bible appears, quote their visual_anchor verbatim. Do not paraphrase. Do not drop details.
- Name the location from the bible's locations list.
- State shot type (wide / medium / close / POV / over-shoulder), camera movement if any, lighting, and palette from the bible.
- Reference the tone by naming one of the tone_reference films for the vibe.

CRITICAL: Output ONLY the JSON array of 6 strings, no preamble, no markdown fences.`;

const VIDEO_CLIP_PROMPT = `Given a film title, synopsis, treatment, and STYLE BIBLE, write 4 distinct 8-second video clip prompts as a JSON array of strings.

These are the four shots a viewer will see in a 32-second trailer. They must tell a story arc: opening image → inciting moment → middle-act chaos → climax/reveal.

MUST DO for every clip:
- 60-100 words. Cinematic, present-tense, motion-aware.
- If a character from the style bible appears, quote their visual_anchor VERBATIM. This is non-negotiable — Grok Imagine drops character continuity the instant descriptions shift between clips.
- Name the location from the bible.
- Start with the shot type + camera movement (e.g. "Cinematic 8-second drone shot pushing forward over…", "Handheld close-up on…").
- Name the lighting + palette from the bible.
- Reference the tone by naming one of the tone_reference films for the vibe.
- End with an evocative beat, not a cut instruction.

MUST NOT:
- Paraphrase the visual_anchor — quote it.
- Invent characters not in the bible.
- Use generic palette words like "vibrant colors" — use the bible's palette.

CRITICAL: Output ONLY the JSON array of 4 strings, no preamble, no markdown fences.`;

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

  // Load the offer
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
  const artifacts: Array<{ role: string; kind: string; url: string; model: string; costUsd: number }> = [];

  async function attach(role: string, kind: string, url: string, model: string, prompt: string, costUsd: number, stepId?: string) {
    totalCost += costUsd;
    artifacts.push({ role, kind, url, model, costUsd });

    // Insert the artifact and capture its id so the corresponding
    // step_log row can reference it via bct_step_log.artifact_id.
    const offchainTxid = `vercel-serverless-${Date.now().toString(36)}-${role}`;
    const { data: artRow } = await supabase
      .from('bct_artifacts')
      .insert({
        offer_id: offerId,
        kind,
        url,
        model,
        prompt: prompt.slice(0, 500),
        payment_txid: offchainTxid,
        role,
        step_id: stepId ?? null,
      })
      .select('id')
      .single();

    // Also record a bct_step_log entry so /production.html and the
    // account dashboard count this as a completed pipeline step — same
    // table the feature-worker writes to for pitch/feature tiers. Keeps
    // the trailer tier's UI story consistent. The payment_txid here is
    // an off-chain marker (clearly not a BSV txid) because the trailer
    // pipeline runs in a Vercel serverless function without wallet
    // access — judges can see it's off-chain rather than a fake txid.
    if (stepId && artRow?.id) {
      const costSats = Math.max(1, Math.round(costUsd * 1000));
      await supabase.from('bct_step_log').insert({
        offer_id: offerId,
        step_id: stepId,
        agent_id: role,
        status: 'completed',
        artifact_id: artRow.id,
        payment_txid: offchainTxid,
        payment_sats: costSats,
        message: `${role} · ${kind} · $${costUsd.toFixed(3)} (off-chain, vercel serverless)`,
      });
    }
  }

  try {
    // Mark the offer as producing
    await supabase.from('bct_offers').update({ status: 'producing' }).eq('id', offerId);

    // 1. Treatment
    const treatment = await xaiChat(xaiKey, TREATMENT_PROMPT, context, 2000);
    const treatmentDataUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(treatment);
    // Tag step_ids so commission-success.html + /production can map
    // artifacts to their expected deliverable slots (writer.synopsis,
    // storyboard.poster, editor.trailer_cut, etc.). Without these the
    // UI falls through to generic 'role + kind' matching and gets the
    // progress count wrong.
    await attach('writer', 'text', treatmentDataUrl, 'grok-3-mini', offer.title, 0.01, 'writer.synopsis');

    // ── 2. Style Bible ───────────────────────────────────────────
    //
    // Handed to every downstream visual step so they all share a
    // single visual vocabulary (character wardrobes, palette,
    // locations, tone references). Without this, each Grok Imagine
    // call generates from its own read of the synopsis and character
    // continuity across clips falls apart.
    //
    // The bible is persisted as a director.style_bible text artifact
    // so reshoot and post-production can load it later.
    let styleBible: {
      tone_references?: string[];
      palette?: string;
      camera_philosophy?: string;
      locations?: string[];
      characters?: Array<{ name: string; role: string; visual_anchor: string }>;
    } | null = null;
    let bibleContext = '';  // appended to every visual-step context
    try {
      const bibleContextInput = `${context}\n\nTreatment:\n${treatment.slice(0, 3500)}`;
      const raw = await xaiChat(xaiKey, STYLE_BIBLE_PROMPT, bibleContextInput, 1400);
      styleBible = JSON.parse(stripFences(raw));
      const bibleJson = JSON.stringify(styleBible, null, 2);
      bibleContext = `\n\nSTYLE BIBLE (quote character visual_anchors VERBATIM in every shot they appear in):\n${bibleJson}`;
      const bibleDataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(styleBible));
      await attach('director', 'text', bibleDataUrl, 'grok-3-mini', 'style bible', 0.008, 'director.style_bible');
    } catch (err) {
      console.error('[trailer] style bible failed — falling back to treatment-only:', err);
      // Best-effort: pipeline still produces a trailer without the
      // bible, it just loses the extra continuity scaffolding.
      bibleContext = '';
    }

    // ── Reference-image library ──────────────────────────────────
    // Track the URLs of the poster and storyboard stills we generate
    // below so we can feed them back into every video-clip call as
    // reference images. This is the single biggest lever we have for
    // cross-shot character + scene continuity — see
    // docs/research/ai-film-pipeline.md §11 "The 80/20 fix."
    let posterUrl: string | null = null;
    const storyboardUrls: string[] = [];

    // 3. Poster (Grok Imagine Image Pro) — now bible-aware
    //
    // Inject the bible's palette, camera philosophy, and at least one
    // tone reference so the poster sits inside the same visual
    // universe as the clips that follow. The protagonist visual_anchor
    // is also quoted verbatim so the poster and the trailer clips
    // show the SAME protagonist.
    const protagonist = styleBible?.characters?.find((c) => c.role === 'protagonist') ?? styleBible?.characters?.[0];
    const posterPalette = styleBible?.palette ? ` Palette: ${styleBible.palette}.` : '';
    const posterTone = styleBible?.tone_references?.[0]
      ? ` Tonal reference: ${styleBible.tone_references[0]}-style poster design.`
      : '';
    const posterAnchor = protagonist?.visual_anchor
      ? ` Featured character, quoted from the style bible: ${protagonist.visual_anchor}.`
      : '';
    const posterPrompt = `Cinematic movie poster for the film "${offer.title}". ${offer.synopsis}${posterAnchor}${posterPalette}${posterTone} Portrait orientation (2:3), bold title typography, dramatic lighting, atmospheric mood, print-ready poster composition.`;
    try {
      const poster = await xaiImage(xaiKey, posterPrompt, 'grok-imagine-image-pro');
      posterUrl = poster.url;
      await attach('poster', 'image', poster.url, 'grok-imagine-image-pro', posterPrompt, poster.costUsd, 'storyboard.poster');
    } catch (err) {
      console.error('[trailer] poster failed:', err);
    }

    // 4. Storyboard frames — 6 images
    //
    // Treatment + style bible both flow into the prompt writer so
    // every frame references the bible's visual_anchors and tone.
    let storyboardPrompts: string[] = [];
    try {
      const storyboardContext =
        `${context}\n\nTreatment:\n${treatment.slice(0, 3500)}${bibleContext}`;
      const raw = await xaiChat(xaiKey, STORYBOARD_PROMPT_PROMPT, storyboardContext, 1400);
      storyboardPrompts = JSON.parse(stripFences(raw)) as string[];
    } catch (err) {
      console.error('[trailer] storyboard prompts parse failed:', err);
    }

    for (let i = 0; i < Math.min(6, storyboardPrompts.length); i++) {
      const prompt = storyboardPrompts[i];
      try {
        const img = await xaiImage(xaiKey, prompt, 'grok-imagine-image');
        storyboardUrls.push(img.url);
        // Unique step_id per frame. Previously every frame was tagged
        // 'storyboard.pack' which made mirrorAsset collide on a single
        // file and film.html rendered N identical tiles. Matches the
        // convention feature-worker.ts uses for the feature tier.
        await attach(
          'storyboard',
          'image',
          img.url,
          'grok-imagine-image',
          prompt,
          img.costUsd,
          `storyboard.frame_${i}`,
        );
      } catch (err) {
        console.error(`[trailer] storyboard frame ${i} failed:`, err);
      }
    }

    // 5. Video clips — 4 × 8s
    //
    // Treatment + style bible both flow into the prompt writer. The
    // bible's instruction is explicit: quote each character's
    // visual_anchor VERBATIM so Grok Imagine holds character
    // continuity across clip 1 → 2 → 3 → 4. This is the single
    // biggest quality lever on top of reference-image conditioning.
    let videoPrompts: string[] = [];
    try {
      const clipContext =
        `${context}\n\nTreatment:\n${treatment.slice(0, 3500)}${bibleContext}`;
      const raw = await xaiChat(xaiKey, VIDEO_CLIP_PROMPT, clipContext, 1800);
      videoPrompts = JSON.parse(stripFences(raw)) as string[];
    } catch (err) {
      console.error('[trailer] video prompts parse failed:', err);
    }

    // Run 4 videos sequentially — they're fast (~25s each) and
    // running in parallel risks rate limits.
    //
    // Each clip gets two reference images: the poster (for overall
    // aesthetic / character look) and a storyboard frame (for this
    // shot's specific composition). We prepend an explicit "use
    // <IMAGE_1> and <IMAGE_2>" clause to the prompt so Grok actually
    // conditions on them — the xAI API ignores references if the
    // prompt doesn't reference them by name. Without this change
    // every clip is a cold text-to-video call and the character
    // drifts between every cut — the #1 issue flagged in our
    // research doc (docs/research/ai-film-pipeline.md §1, §11).
    for (let i = 0; i < Math.min(4, videoPrompts.length); i++) {
      const userPrompt = videoPrompts[i];
      const shotStoryboard = storyboardUrls[i % Math.max(1, storyboardUrls.length)] ?? null;
      const refs = [posterUrl, shotStoryboard].filter((u): u is string => !!u);

      // Prepend reference directives only when we actually have
      // references to point at — otherwise the <IMAGE_N> tokens are
      // dead weight in the prompt.
      const prompt = refs.length === 2
        ? `Character appearance and aesthetic tone match <IMAGE_1>. Composition and scene staging follow <IMAGE_2>. ${userPrompt}`
        : refs.length === 1
          ? `Character appearance, aesthetic tone, and composition match <IMAGE_1>. ${userPrompt}`
          : userPrompt;

      try {
        const vid = await xaiVideo(xaiKey, prompt, refs.length > 0 ? refs : undefined);
        await attach('trailer-clip', 'video', vid.url, 'grok-imagine-video', prompt, vid.costUsd, 'editor.trailer_cut');

        // Save the first clip as the "hero" trailer video on the offer
        if (i === 0) {
          await supabase.from('bct_offers').update({ trailer_video_url: vid.url }).eq('id', offerId);
        }
      } catch (err) {
        console.error(`[trailer] video clip ${i} failed:`, err);
      }
    }

    // Mark as released when done
    await supabase.from('bct_offers').update({ status: 'released' }).eq('id', offerId);

    // ── Chain the post-production layer ───────────────────────────
    // /api/trailer/generate produces clips; /api/trailer/post-production
    // adds title cards, VO narration, and a music bed. We can't
    // fire-and-forget here because Vercel terminates outbound fetch
    // when the function returns (same pitfall as the stripe-webhook).
    // The Hetzner worker kicks a matching sweep if this fails or
    // times out, so the post-production will always run — but when
    // the generator has bandwidth, chaining inline gives the user a
    // complete trailer on first visit instead of a second polling
    // delay.
    let postProduced = false;
    try {
      const postRes = await fetch('https://bmovies.online/api/trailer/post-production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
        signal: AbortSignal.timeout(90_000),
      });
      postProduced = postRes.ok;
      if (!postRes.ok) {
        console.warn(`[trailer] post-production returned ${postRes.status} — Hetzner sweep will retry`);
      }
    } catch (err) {
      console.warn('[trailer] post-production chain failed:', err instanceof Error ? err.message : err);
    }

    res.status(200).json({
      success: true,
      offerId,
      postProduced,
      artifacts: artifacts.length,
      costUsd: Number(totalCost.toFixed(4)),
      breakdown: artifacts.map(a => ({ role: a.role, kind: a.kind, costUsd: a.costUsd })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[trailer] pipeline failed:', msg);
    res.status(500).json({
      error: msg,
      artifactsProduced: artifacts.length,
      partialCostUsd: Number(totalCost.toFixed(4)),
    });
  }
}
