/**
 * POST /api/trailer/post-production
 *
 * The producer/coordinator step. Runs AFTER /api/trailer/generate has
 * produced the raw pieces (treatment, characters, storyboard, clips)
 * and adds the post-production layer that turns a clip reel into a
 * watchable trailer:
 *
 *   editor.trailer_titles       JSON title-card timeline
 *   vo.trailer_script            VO narration script (text)
 *   vo.trailer_narration         VO audio (ElevenLabs) — skipped if no key
 *   composer.trailer_score       Music bed (Replicate MusicGen) — skipped if no key
 *   producer.post_production     Human-readable plan describing what was orchestrated
 *
 * The endpoint is idempotent: re-running against the same offerId
 * supersedes the prior versions of each artifact rather than duplicating.
 *
 * Body: { offerId: string }
 * Response: { ok, produced: string[], skipped: string[], costUsd }
 *
 * Env:
 *   XAI_API_KEY            required (titles + VO script)
 *   SUPABASE_URL           required
 *   SUPABASE_SERVICE_ROLE_KEY  required
 *   ELEVENLABS_API_KEY     optional — gates VO audio generation
 *   ELEVENLABS_VOICE_ID    optional (default: Rachel — bright, warm trailer voice)
 *   REPLICATE_API_TOKEN    optional — gates music-bed generation
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

// Long max duration — MusicGen + ElevenLabs + xAI chat can push this to
// several minutes end-to-end, especially on the first cold start.
export const config = {
  maxDuration: 300,
};

// ── xAI helper ────────────────────────────────────────────────────

async function xaiChat(apiKey: string, system: string, user: string, maxTokens = 1200): Promise<string> {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`xAI chat ${res.status}: ${await res.text()}`);
  const body = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return body.choices?.[0]?.message?.content?.trim() ?? '';
}

function stripFences(s: string): string {
  return s.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

// ── ElevenLabs helper ────────────────────────────────────────────

// Returns an audio URL (MP3) or null if the API key is missing / call
// fails. We upload to Supabase storage so the URL is long-lived.
async function elevenLabsVO(
  apiKey: string | undefined,
  voiceId: string,
  script: string,
): Promise<{ audioBuf: Buffer; mime: string } | null> {
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: script,
          // v2 is the most expressive; "eleven_multilingual_v2" handles
          // trailer narration well. Swap to "eleven_turbo_v2_5" if latency
          // matters more than intensity.
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.45,      // slight variation, cinematic
            similarity_boost: 0.85,
            style: 0.35,          // pushes into "trailer voice" territory
            use_speaker_boost: true,
          },
        }),
        signal: AbortSignal.timeout(120_000),
      },
    );
    if (!res.ok) {
      console.error('[post-production] ElevenLabs', res.status, await res.text().catch(() => ''));
      return null;
    }
    const audioBuf = Buffer.from(await res.arrayBuffer());
    return { audioBuf, mime: 'audio/mpeg' };
  } catch (err) {
    console.error('[post-production] ElevenLabs fatal:', err);
    return null;
  }
}

// ── Replicate MusicGen helper ────────────────────────────────────

async function replicateMusic(
  apiToken: string | undefined,
  prompt: string,
  seconds = 32,
): Promise<{ audioUrl: string } | null> {
  if (!apiToken) return null;
  try {
    // meta/musicgen v1-large — good quality cinematic beds. Replicate's
    // run() is synchronous from the client's perspective (we poll).
    const submit = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // musicgen-large pinned version — swap as models evolve.
        version: '671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb',
        input: {
          prompt: prompt.slice(0, 400),
          duration: Math.min(60, Math.max(10, Math.round(seconds))),
          model_version: 'stereo-large',
          output_format: 'mp3',
          normalization_strategy: 'peak',
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!submit.ok) {
      console.error('[post-production] Replicate submit', submit.status, await submit.text().catch(() => ''));
      return null;
    }
    const submitted = await submit.json() as { id: string; urls?: { get: string } };
    const getUrl = submitted.urls?.get;
    if (!getUrl) return null;

    // Poll. MusicGen on CPU can take ~2-3 minutes; usually under 60s.
    const deadline = Date.now() + 240_000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 4_000));
      const poll = await fetch(getUrl, {
        headers: { Authorization: `Bearer ${apiToken}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (!poll.ok) continue;
      const body = await poll.json() as { status?: string; output?: string | string[]; error?: string };
      if (body.status === 'succeeded') {
        const out = Array.isArray(body.output) ? body.output[0] : body.output;
        if (typeof out === 'string' && out.startsWith('http')) return { audioUrl: out };
        return null;
      }
      if (body.status === 'failed' || body.error) {
        console.error('[post-production] MusicGen failed', body.error);
        return null;
      }
    }
    return null;
  } catch (err) {
    console.error('[post-production] MusicGen fatal:', err);
    return null;
  }
}

// ── Prompts ──────────────────────────────────────────────────────

const TITLES_PROMPT = `You are the title-card editor on a 32-second movie trailer. Given a film title, synopsis, and cast list, output a JSON title-card timeline that sits on top of the trailer's 4 video clips (each ~8 seconds).

Output exactly 4 cards, timed across the 32-second trailer:

  Card 1 — studio card ("A bMovies production") — 0.5s to 3s
  Card 2 — tagline or hook line, 4-8 words max — 4s to 8s
  Card 3 — "Starring" + 2-3 character names — 13s to 17s
  Card 4 — final title reveal, uppercase, punchy — 26s to 32s

Return ONLY a JSON object with this exact shape:

{
  "duration": 32,
  "cards": [
    { "text": "A bMovies production", "startAt": 0.5, "duration": 2.5, "style": "studio" },
    { "text": "<tagline>",            "startAt": 4,   "duration": 4.0, "style": "tagline" },
    { "text": "<character list>",    "startAt": 13,  "duration": 4.0, "style": "cast", "subtitle": "Starring" },
    { "text": "<UPPERCASE TITLE>",    "startAt": 26,  "duration": 6.0, "style": "title" }
  ]
}

Rules:
- Tagline is a tease, not a plot summary. Present tense, evocative, 4-8 words. No ellipsis at the end.
- Cast list is 2-3 names separated by " · ".
- Title is the film's title in ALL CAPS.
- Output ONLY the JSON object. No markdown, no preamble.`;

const VO_SCRIPT_PROMPT = `You are writing the voiceover narration for a 32-second movie trailer. Given the title and synopsis, write a cinematic trailer VO — the kind a deep-voiced narrator delivers over the action. 5-8 short sentences. Build tension, leave a question open.

Timing guidance (write the script so the narrator's natural pace fits):
- Total spoken time ~22-26 seconds across 32s of video
- Pauses between sentences for breath + impact
- Last line lands 2-3s before the final title card
- Never say "coming soon" — cinemas don't exist for this
- Never say the title — the title card does that
- No fluff; every word earns its place

Output only the script text. No stage directions, no quote marks, no "VO:" labels. Start with the first line of narration.`;

const MUSIC_PROMPT_PROMPT = `You are picking a music bed for a 32-second movie trailer. Given the film's title, synopsis, and tone, write a ONE-LINE MusicGen prompt (~40-60 words) describing the style, instrumentation, tempo, and mood of the score bed. No structural cues ("build to", "cut to") — just the sonic identity. No lyrics. Output ONLY the prompt line, no preamble.`;

// ── Handler ──────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return; }

  const xaiKey = process.env.XAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  const elevenVoice = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel
  const replicateToken = process.env.REPLICATE_API_TOKEN;

  if (!xaiKey) { res.status(500).json({ error: 'XAI_API_KEY not set' }); return; }
  if (!supabaseUrl || !supabaseKey) { res.status(500).json({ error: 'Supabase not configured' }); return; }

  let body: { offerId?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }
  const offerId = body.offerId?.trim();
  if (!offerId) { res.status(400).json({ error: 'offerId required' }); return; }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // Load the offer + any existing cast artifact so title + cast cards
  // actually reflect the film.
  const { data: offer, error: loadErr } = await supabase
    .from('bct_offers')
    .select('id, title, synopsis, token_ticker, tier')
    .eq('id', offerId)
    .maybeSingle();
  if (loadErr || !offer) { res.status(404).json({ error: 'Offer not found' }); return; }

  // Load cast list if it exists so the Starring card uses real names.
  const { data: castArts } = await supabase
    .from('bct_artifacts')
    .select('url')
    .eq('offer_id', offerId)
    .in('step_id', ['pitch.cast_list', 'casting.cast_list'])
    .is('superseded_by', null)
    .limit(1);
  let castText = '';
  if (castArts && castArts[0]?.url?.startsWith('data:')) {
    try {
      const decoded = decodeURIComponent(castArts[0].url.split(',')[1] || '');
      castText = decoded.slice(0, 600);
    } catch { /* skip */ }
  }

  const context = `Title: ${offer.title}\nTicker: $${offer.token_ticker || ''}\n\nSynopsis: ${offer.synopsis}\n\n${castText ? 'Cast:\n' + castText : ''}`;
  const produced: string[] = [];
  const skipped: string[] = [];
  let totalCost = 0;

  async function persist(role: string, kind: string, url: string, model: string, stepId: string, costUsd = 0) {
    // Mark any prior head version of this step as superseded so
    // re-runs don't stack duplicates.
    const offchainTxid = `post-prod-${Date.now().toString(36)}-${stepId}`;
    const { data: existing } = await supabase
      .from('bct_artifacts')
      .select('id')
      .eq('offer_id', offerId)
      .eq('step_id', stepId)
      .is('superseded_by', null);
    const { data: inserted } = await supabase
      .from('bct_artifacts')
      .insert({
        offer_id: offerId, kind, url, model,
        prompt: `Post-production — ${stepId}`,
        payment_txid: offchainTxid, role, step_id: stepId,
      })
      .select('id')
      .single();
    if (existing && existing.length && inserted?.id) {
      await supabase
        .from('bct_artifacts')
        .update({ superseded_by: inserted.id })
        .in('id', existing.map((r: { id: number }) => r.id));
    }
    if (stepId && inserted?.id) {
      const costSats = Math.max(1, Math.round(costUsd * 1000));
      await supabase.from('bct_step_log').insert({
        offer_id: offerId, step_id: stepId, agent_id: role,
        status: 'completed', artifact_id: inserted.id,
        payment_txid: offchainTxid, payment_sats: costSats,
        message: `${role} · ${kind} · post-production`,
      });
    }
    totalCost += costUsd;
    produced.push(stepId);
  }

  try {
    // 1. Title cards
    let titlesJson: unknown = null;
    try {
      const raw = await xaiChat(xaiKey, TITLES_PROMPT, context, 900);
      titlesJson = JSON.parse(stripFences(raw));
      const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(titlesJson));
      await persist('editor', 'text', dataUrl, 'grok-3-mini', 'editor.trailer_titles', 0.01);
    } catch (err) {
      console.error('[post-production] titles failed:', err);
      skipped.push('editor.trailer_titles');
    }

    // 2. VO script
    let voScript = '';
    try {
      voScript = await xaiChat(xaiKey, VO_SCRIPT_PROMPT, context, 600);
      if (voScript) {
        const dataUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(voScript);
        await persist('vo', 'text', dataUrl, 'grok-3-mini', 'vo.trailer_script', 0.005);
      } else {
        skipped.push('vo.trailer_script');
      }
    } catch (err) {
      console.error('[post-production] VO script failed:', err);
      skipped.push('vo.trailer_script');
    }

    // 3. VO audio via ElevenLabs (gated on API key)
    if (voScript && elevenKey) {
      const vo = await elevenLabsVO(elevenKey, elevenVoice, voScript);
      if (vo) {
        // Store in Supabase storage and reference by public URL.
        const filename = `vo/${offerId}-${Date.now()}.mp3`;
        const { data: uploaded } = await supabase.storage
          .from('bmovies-audio')
          .upload(filename, vo.audioBuf, { contentType: vo.mime, upsert: true });
        if (uploaded?.path) {
          const { data: pub } = supabase.storage.from('bmovies-audio').getPublicUrl(uploaded.path);
          if (pub?.publicUrl) {
            await persist('vo', 'audio', pub.publicUrl, 'elevenlabs-v2', 'vo.trailer_narration', 0.15);
          } else {
            skipped.push('vo.trailer_narration');
          }
        } else {
          // Fallback: inline the audio as a base64 data: URL if storage isn't ready.
          // Keeps the path unblocked even if bmovies-audio bucket doesn't exist yet.
          const b64 = vo.audioBuf.toString('base64');
          const dataUrl = `data:${vo.mime};base64,${b64}`;
          await persist('vo', 'audio', dataUrl, 'elevenlabs-v2', 'vo.trailer_narration', 0.15);
        }
      } else {
        skipped.push('vo.trailer_narration');
      }
    } else if (!elevenKey) {
      skipped.push('vo.trailer_narration (no ELEVENLABS_API_KEY)');
    }

    // 4. Music bed via Replicate MusicGen (gated on API token)
    if (replicateToken) {
      let musicPrompt = '';
      try {
        musicPrompt = await xaiChat(xaiKey, MUSIC_PROMPT_PROMPT, context, 200);
      } catch (err) {
        console.error('[post-production] music prompt failed:', err);
      }
      if (musicPrompt) {
        const music = await replicateMusic(replicateToken, musicPrompt, 32);
        if (music) {
          await persist('composer', 'audio', music.audioUrl, 'musicgen-stereo-large', 'composer.trailer_score', 0.20);
        } else {
          skipped.push('composer.trailer_score (MusicGen failed)');
        }
      } else {
        skipped.push('composer.trailer_score (no music prompt)');
      }
    } else {
      skipped.push('composer.trailer_score (no REPLICATE_API_TOKEN)');
    }

    // 5. Producer coordinator artifact — human-readable plan
    const planLines: string[] = [
      `# Post-production · ${offer.title}`,
      ``,
      `The producer coordinator ran the following steps for this trailer.`,
      ``,
      `## Produced`,
      ...(produced.length ? produced.map(s => `- ${s}`) : ['- (none)']),
      ``,
      `## Skipped`,
      ...(skipped.length ? skipped.map(s => `- ${s}`) : ['- (none)']),
      ``,
      `## Timeline`,
      titlesJson
        ? '```json\n' + JSON.stringify(titlesJson, null, 2) + '\n```'
        : '(titles timeline not generated)',
      ``,
      `## Estimated cost`,
      `$${totalCost.toFixed(3)}`,
    ];
    const planDataUrl = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(planLines.join('\n'));
    await persist('producer', 'text', planDataUrl, 'grok-3-mini', 'producer.post_production', 0);

    res.status(200).json({
      ok: true,
      offerId,
      produced,
      skipped,
      costUsd: Number(totalCost.toFixed(4)),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[post-production] fatal:', msg);
    res.status(500).json({ error: msg, produced, skipped });
  }
}
