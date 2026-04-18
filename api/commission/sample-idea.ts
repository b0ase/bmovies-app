/**
 * POST /api/commission/sample-idea
 *
 * Returns a fresh Grok-generated film idea for the "Sample idea" button
 * on /commission.html. Public endpoint — no auth required, rate-limited
 * per-IP through Vercel's built-in fair-use layer (the button is armed
 * with a confirm click in the UI so accidental double-tap is already
 * absorbed client-side).
 *
 * Response: { title, ticker, synopsis, logline }
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const SYSTEM_PROMPT = `You are a staff writer at bMovies, the AI-native film studio. You generate original pitches that a commissioner will pay \\$0.99 to produce.

Output ONE fresh film idea as strict JSON with this exact shape and nothing else — no prose, no markdown, no code fence:

{
  "title": "string — 2 to 5 words, evocative, not generic",
  "ticker": "string — 3 to 5 UPPERCASE letters, derived from the title",
  "logline": "string — one sentence, under 30 words, present tense",
  "synopsis": "string — one paragraph, 90 to 160 words, present tense, cinematic voice"
}

RULES
- Pick a distinct genre each time (neo-noir, kitchen-sink realism, folk horror, sci-fi, dark comedy, quiet drama, espionage, magical realism). Rotate — never default to the same vibe twice in a row.
- Grounded, specific, human. A real place, a real trade, a real stakes-level.
- No franchise names, no existing IP, no celebrity names, no Marvel/DC/Star Wars/Harry Potter echoes.
- Avoid AI/tech/crypto plots unless the user will clearly ask for them later.
- Never explain what you're doing. Never say "Here's your idea:". Just return the JSON object.`;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const xaiKey = process.env.XAI_API_KEY;
  if (!xaiKey) {
    res.status(500).json({ error: 'XAI_API_KEY not set' });
    return;
  }

  const model = process.env.COMMISSION_SAMPLE_MODEL || 'grok-3-mini';

  try {
    const upstream = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${xaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: 'Generate one fresh film idea now. Return JSON only.' },
        ],
        // High temperature + seed nudged by minute — gives real variety
        // on the "tap again" UX without spinning up a full cache layer.
        temperature: 1.0,
        max_tokens: 512,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      res.status(502).json({ error: 'Grok upstream error', detail: text.slice(0, 300) });
      return;
    }

    const payload = await upstream.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload?.choices?.[0]?.message?.content ?? '';
    let parsed: { title?: string; ticker?: string; synopsis?: string; logline?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Occasionally Grok slips outside the JSON envelope — salvage the
      // first {...} block if we can, otherwise surface the raw text.
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); }
        catch { res.status(502).json({ error: 'Upstream returned non-JSON content', raw: raw.slice(0, 500) }); return; }
      } else {
        res.status(502).json({ error: 'Upstream returned non-JSON content', raw: raw.slice(0, 500) });
        return;
      }
    }

    // Sanity coerce + fallbacks — the button is meant to give a visible
    // boost every click, so we don't want a missing field to leave the
    // canvas blank.
    const title = (parsed.title || 'Untitled').toString().trim().slice(0, 80);
    const tickerBase = (parsed.ticker || title)
      .toString()
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 5);
    const ticker = (tickerBase.length >= 3 ? tickerBase : (tickerBase + 'XXX').slice(0, 3)) || 'MOVX';
    const logline = (parsed.logline || '').toString().trim().slice(0, 300);
    const synopsis = (parsed.synopsis || '').toString().trim().slice(0, 1200);

    res.status(200).json({ title, ticker, logline, synopsis });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'sample-idea failed';
    res.status(500).json({ error: msg });
  }
}
