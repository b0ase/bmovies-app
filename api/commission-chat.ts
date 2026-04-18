/**
 * POST /api/commission-chat
 *
 * Writer's-room chat for the Commission page. Signed-in visitors send
 * a conversation history; we prepend a system prompt that frames the
 * assistant as a bMovies creative partner and proxy the request to
 * xAI Grok. No conversation is persisted server-side — the client
 * owns the transcript and stores it in localStorage.
 *
 * Gated. Anonymous visitors get 401 so xAI tokens are only spent on
 * authenticated accounts.
 *
 * Request body:
 *   {
 *     messages: Array<{ role: 'user' | 'assistant', content: string }>
 *   }
 *
 * Headers:
 *   Authorization: Bearer <supabase-access-token>
 *
 * Response body (200):
 *   {
 *     reply: string,             // the assistant's next message
 *     usage: { prompt: number, completion: number, total: number },
 *     model: string,
 *   }
 *
 * Response body (400 | 401 | 429 | 500):
 *   { error: string }
 *
 * Env:
 *   XAI_API_KEY                    — required
 *   COMMISSION_CHAT_MODEL          — optional, defaults to grok-3-mini
 *   SUPABASE_URL                   — required for auth check
 *   SUPABASE_ANON_KEY              — required for auth check
 *
 * Future: this endpoint is the seam where the NPGX skill/CLI/MCP
 * toolchain will land. The system prompt already tells the assistant
 * about capabilities that are coming so it doesn't hallucinate tools
 * that aren't wired up yet.
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Generous timeout — Grok can take 30-40s for longer replies.
export const config = {
  maxDuration: 60,
};

const XAI_URL = 'https://api.x.ai/v1/chat/completions';

/**
 * System prompt. Defines identity, creative remit, and — critically —
 * what the assistant CAN'T do yet so it doesn't roleplay powers that
 * aren't wired up. The tool/skill surface is mostly ported from NPGX
 * and not live on the commission page today.
 */
const SYSTEM_PROMPT = `You are the bMovies writer's room — a creative development partner for people commissioning AI-produced films on the bMovies platform.

WHAT BMOVIES IS
bMovies turns film ideas into real productions via a swarm of AI agents (writer, director, cinematographer, storyboard artist, composer, editor, sound designer, producer). Commissioners pay $0.99 for a pitch, $9.99 for a trailer, $99 for a short, or $999 for a feature. Every film ships as a BSV-21 royalty token; the commissioner keeps 99% of the shares. Royalties pay out when viewers buy tickets.

YOUR JOB IN A CONVERSATION
Help the person at the keyboard develop a film idea worth commissioning. Ask smart, open-ended questions. Push on protagonist motivation, central conflict, visual identity, cinematic potential, genre. Offer twists, pitches, reframings. Be generous with creative input but stay in service of their vision — you're a writers-room collaborator, not an auteur.

When the user signals they're ready (they say "ship it", "commission this", "that's it", or anything similar), output a clean summary they can drop into the commission form:

**Logline**
<one-sentence logline, ~25 words>

**Synopsis**
<120-word synopsis, third-person, present tense, hook / protagonist / conflict / stakes>

**Suggested tier**
<pitch / trailer / short / feature with one-sentence reasoning>

Do NOT output that summary format in every message — only when the concept feels ready or the user explicitly asks for it.

WHAT YOU CAN DO TODAY
- Hold a multi-turn creative conversation.
- Remember context within this conversation.
- Help shape logline, synopsis, tone, character, setting.
- Recommend a commissioning tier.
- Summarize the idea when they're ready to ship it.

WHAT'S COMING (don't fake these yet)
The bMovies team is porting in a larger toolkit — CLI, MCP, API, and a skill library — from NPGX, another project. These will give you the ability to directly generate posters, fire the agent swarm, pull BSV transaction data, and more. Today those tools aren't wired into this chat. If the user asks you to "generate a poster now" or "run the agent swarm" or "check the BSV wallet", tell them that toolkit is on the roadmap; for now you're a writing partner and the commission button downstream is what kicks off the agent swarm.

STYLE
- Conversational, warm, smart. Not corporate.
- Use short paragraphs. Markdown when it helps (lists, bold for emphasis), plain prose otherwise.
- Don't flatter. Push back when a premise is thin.
- Don't refuse creative content unless it's unambiguously illegal.
- Never roleplay capabilities you don't have; see the section above.`;

async function verifyUser(
  authHeader: string | undefined,
  supabaseUrl: string,
  serviceKey: string,
): Promise<{ ok: true; userId: string; email: string | null } | { ok: false; status: number; error: string }> {
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return { ok: false, status: 401, error: 'Sign in to chat with the writers room.' };
  }
  const token = authHeader.slice(7).trim();
  if (!token) return { ok: false, status: 401, error: 'Missing access token.' };

  // Use the service-role client's auth.getUser(token) to validate the
  // JWT. Earlier revisions used Supabase REST /auth/v1/user + the anon
  // key, which required a SUPABASE_ANON_KEY env var that isn't set on
  // the current Vercel project — the endpoint returned
  // 'Supabase auth not configured' for authenticated users. Switching
  // to service-role + getUser(jwt) reuses the same env vars every
  // other /api/* endpoint in this project uses, so commission-chat
  // no longer needs a dedicated anon key.
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id) {
      return { ok: false, status: 401, error: 'Session expired — please sign in again.' };
    }
    return { ok: true, userId: data.user.id, email: data.user.email ?? null };
  } catch {
    return { ok: false, status: 503, error: 'Auth service unreachable — try again in a moment.' };
  }
}

// Simple sanity limits so a client can't ask us to forward a
// 500-message transcript. 32 turns is plenty for a writers-room
// chat; beyond that the conversation should be summarized.
const MAX_MESSAGES = 32;
const MAX_MESSAGE_CHARS = 6_000;
const MAX_TOTAL_CHARS = 40_000;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return; }

  const xaiKey = process.env.XAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const model = process.env.COMMISSION_CHAT_MODEL || 'grok-3-mini';

  if (!xaiKey) { res.status(500).json({ error: 'XAI_API_KEY not set' }); return; }
  if (!supabaseUrl || !serviceKey) {
    res.status(500).json({ error: 'Supabase auth not configured' });
    return;
  }

  // Parse body
  let body: { messages?: Array<{ role?: string; content?: string }> };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const raw = Array.isArray(body.messages) ? body.messages : [];
  if (raw.length === 0) {
    res.status(400).json({ error: 'No messages provided.' });
    return;
  }
  if (raw.length > MAX_MESSAGES) {
    res.status(400).json({ error: `Conversation too long (max ${MAX_MESSAGES} messages). Start a new chat or summarize.` });
    return;
  }

  let totalChars = 0;
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const m of raw) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content = typeof m.content === 'string' ? m.content.trim() : '';
    if (!content) continue;
    if (content.length > MAX_MESSAGE_CHARS) {
      res.status(400).json({ error: `One message exceeds ${MAX_MESSAGE_CHARS} characters.` });
      return;
    }
    totalChars += content.length;
    if (totalChars > MAX_TOTAL_CHARS) {
      res.status(400).json({ error: 'Conversation too long overall. Trim earlier turns or start a new chat.' });
      return;
    }
    messages.push({ role, content });
  }
  if (messages.length === 0) {
    res.status(400).json({ error: 'All messages were empty.' });
    return;
  }

  // Gate: only authenticated users reach Grok.
  const auth = await verifyUser(
    req.headers.authorization as string | undefined ?? req.headers.Authorization as string | undefined,
    supabaseUrl,
    serviceKey,
  );
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  // Call xAI
  try {
    const xaiRes = await fetch(XAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${xaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0.85,
        max_tokens: 1400,
      }),
      signal: AbortSignal.timeout(50_000),
    });

    if (!xaiRes.ok) {
      const errText = await xaiRes.text().catch(() => '');
      console.error('[commission-chat] xAI', xaiRes.status, errText.slice(0, 500));
      res.status(502).json({ error: 'The writers room is momentarily offline. Try again in a few seconds.' });
      return;
    }

    const xaiBody = await xaiRes.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      model?: string;
    };

    const reply = xaiBody.choices?.[0]?.message?.content?.trim() ?? '';
    if (!reply) {
      res.status(502).json({ error: 'Empty response from the writers room. Try rephrasing.' });
      return;
    }

    res.status(200).json({
      reply,
      usage: {
        prompt: xaiBody.usage?.prompt_tokens ?? 0,
        completion: xaiBody.usage?.completion_tokens ?? 0,
        total: xaiBody.usage?.total_tokens ?? 0,
      },
      model: xaiBody.model ?? model,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[commission-chat] fatal', msg);
    res.status(500).json({ error: 'Chat failed unexpectedly. Please retry.' });
  }
}
