/**
 * POST /api/trailer/vo/preview
 *
 * Non-destructive VO sampler. Commissioner dials in voice / model /
 * settings / script snippet → this endpoint hits ElevenLabs with the
 * chosen config → returns the MP3 as a data: URL so the client can
 * play it back without hitting Supabase storage or writing any
 * artifact row. No revision is burned.
 *
 * Intended for tight iteration before committing to a regenerate.
 * The script sent here can be a short excerpt (first line only) to
 * keep ElevenLabs spend low during dialling-in.
 *
 * Body:
 *   {
 *     text: string,                     // the snippet to speak (max 500 chars)
 *     voiceId: string,                  // 'adam' / 'brian' / raw 22-char ElevenLabs id
 *     modelId?: string,                 // eleven_multilingual_v2 | eleven_turbo_v2_5 | eleven_v3
 *     voiceSettings?: {
 *       stability, similarity_boost, style, use_speaker_boost
 *     }
 *   }
 *
 * Response:
 *   { audioDataUrl: string, mime: 'audio/mpeg', byteLength: number }
 */

interface VercelRequest { method?: string; body?: unknown }
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

// Same 9-voice shortlist as post-production.ts.
function resolveVoiceId(raw: string | undefined): string {
  if (!raw) return 'pNInz6obpgDQGcFmaJgB';
  const NARRATOR_VOICES: Record<string, string> = {
    adam:   'pNInz6obpgDQGcFmaJgB',
    daniel: 'onwK4e9ZLuTAKqWW03F9',
    brian:  'nPczCjzI2devNBz1zQrb',
    arnold: 'VR6AewLTigWG4xSOukaG',
    clyde:  '2EiwWnXFnvU5JabPnv8n',
    callum: 'N2lVS1w4EtoT3dr4eOWO',
    rachel: '21m00Tcm4TlvDq8ikWAM',
    bella:  'EXAVITQu4vr4xnSDxMaL',
    domi:   'AZnzlk1XvdvUeBnXmlld',
  };
  const key = raw.toLowerCase().trim();
  if (NARRATOR_VOICES[key]) return NARRATOR_VOICES[key];
  if (/^[A-Za-z0-9]{20,}$/.test(raw)) return raw; // raw ElevenLabs id
  return 'pNInz6obpgDQGcFmaJgB'; // fall back to Adam
}

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return; }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'ELEVENLABS_API_KEY not set' }); return; }

  type Body = {
    text?: string;
    voiceId?: string;
    modelId?: string;
    voiceSettings?: {
      stability?: number;
      similarity_boost?: number;
      style?: number;
      use_speaker_boost?: boolean;
    };
  };
  let body: Body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as Body) ?? {};
  } catch { res.status(400).json({ error: 'Invalid JSON' }); return; }

  const text = (body.text || '').trim();
  if (!text || text.length < 2) {
    res.status(400).json({ error: 'text required (2+ chars)' });
    return;
  }
  // Keep preview snippets short — dialling-in shouldn't burn credits on
  // the full script. Commissioner only needs to hear a line or two to
  // judge voice fit.
  if (text.length > 500) {
    res.status(400).json({ error: `text must be 500 chars or fewer (got ${text.length})` });
    return;
  }

  const voiceId = resolveVoiceId(body.voiceId);
  const allowedModels = new Set(['eleven_multilingual_v2', 'eleven_turbo_v2_5', 'eleven_v3']);
  const modelId = body.modelId && allowedModels.has(body.modelId) ? body.modelId : 'eleven_multilingual_v2';

  const voiceSettings = {
    stability:         clamp01(body.voiceSettings?.stability        ?? 0.45),
    similarity_boost:  clamp01(body.voiceSettings?.similarity_boost ?? 0.85),
    style:             clamp01(body.voiceSettings?.style            ?? 0.35),
    use_speaker_boost: !!(body.voiceSettings?.use_speaker_boost ?? true),
  };

  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({ text, model_id: modelId, voice_settings: voiceSettings }),
        signal: AbortSignal.timeout(45_000),
      },
    );
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      res.status(502).json({ error: `ElevenLabs ${r.status}`, detail: detail.slice(0, 500) });
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    const dataUrl = `data:audio/mpeg;base64,${buf.toString('base64')}`;
    res.status(200).json({
      audioDataUrl: dataUrl,
      mime: 'audio/mpeg',
      byteLength: buf.length,
      voiceId,
      modelId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: `preview failed: ${msg}` });
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
