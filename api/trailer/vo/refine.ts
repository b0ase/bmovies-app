/**
 * POST /api/trailer/vo/refine
 *
 * Takes a commissioner's current VO script + a free-form "what's wrong"
 * hint, calls Grok with a trailer-announcer system prompt, returns a
 * rewritten script. Does NOT persist — the client decides whether the
 * refined version is better before writing it back via the regenerate
 * flow.
 *
 * Request body:
 *   {
 *     offerId: string,
 *     currentScript: string,   // what they have now
 *     hint: string,            // what's wrong with it
 *     title?: string,
 *     synopsis?: string,
 *   }
 *
 * Response:
 *   { refined: string, cost_usd_estimate: number }
 */

interface VercelRequest { method?: string; body?: unknown }
interface VercelResponse {
  status(code: number): VercelResponse
  json(body: unknown): VercelResponse
  setHeader(name: string, value: string): void
}
function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

const XAI_URL = 'https://api.x.ai/v1/chat/completions'

const SYSTEM_PROMPT = `You are a trailer-VO writer at a film studio. Your job is to take a draft VO narration script and rewrite it to be sharper, more cinematic, more dramatic — while respecting the commissioner's specific complaint.

Rules for the rewrite:
- Preserve the film's title as the final line. Never skip or change it.
- Keep the cast/credits list if the original had one. Don't fabricate cast names.
- 5-8 short sentences, maximum ~300 characters total.
- Leave a question open. Build tension.
- Use ellipses SPARINGLY and NEVER inside the title — ElevenLabs reads them as hard pauses, so "The Cicada... Room" gets spoken as two words with a beat. The TITLE must read as one continuous phrase.
- No "coming soon". No "in cinemas". No "coming this summer".
- Never include stage directions, voice cues, or "(pause)" markers.
- Never use markdown, quote marks, or labels. Start with the first line of narration.

Return ONLY the rewritten script text. No preamble, no explanation.`

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCors(res)
  if (req.method === 'OPTIONS') { res.status(204).json({}); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const xaiKey = process.env.XAI_API_KEY
  if (!xaiKey) { res.status(500).json({ error: 'XAI_API_KEY not set' }); return }

  let body: { offerId?: string; currentScript?: string; hint?: string; title?: string; synopsis?: string }
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {}
  } catch { res.status(400).json({ error: 'Invalid JSON' }); return }

  const currentScript = (body.currentScript || '').trim()
  const hint = (body.hint || '').trim() || 'Make it sharper, more cinematic, more dramatic.'
  const title = (body.title || '').trim()
  const synopsis = (body.synopsis || '').trim()

  if (!currentScript || currentScript.length < 10) {
    res.status(400).json({ error: 'currentScript required (10+ chars)' })
    return
  }
  if (currentScript.length > 2000) {
    res.status(400).json({ error: 'currentScript must be 2000 chars or fewer' })
    return
  }

  const userMsg = [
    title ? `FILM TITLE: ${title}` : '',
    synopsis ? `SYNOPSIS: ${synopsis.slice(0, 500)}` : '',
    `COMMISSIONER'S COMPLAINT: ${hint}`,
    '',
    'CURRENT DRAFT:',
    currentScript,
    '',
    'Rewrite the draft to address the complaint. Return only the new script.',
  ].filter(Boolean).join('\n')

  let upstream: Response
  try {
    upstream = await fetch(XAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${xaiKey}` },
      body: JSON.stringify({
        model: process.env.REFINE_MODEL ?? 'grok-3-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMsg },
        ],
        max_tokens: 500,
        temperature: 0.85,
      }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(502).json({ error: `xAI request failed: ${msg}` })
    return
  }

  if (!upstream.ok) {
    const text = await upstream.text()
    res.status(502).json({ error: `xAI returned ${upstream.status}`, detail: text.slice(0, 500) })
    return
  }

  const payload = await upstream.json() as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { total_tokens?: number }
  }
  const refined = payload?.choices?.[0]?.message?.content?.trim()
  if (!refined) {
    res.status(502).json({ error: 'xAI returned no content' })
    return
  }

  res.status(200).json({
    refined,
    tokensUsed: payload?.usage?.total_tokens ?? 0,
    costUsdEstimate: 0.002,
  })
}
