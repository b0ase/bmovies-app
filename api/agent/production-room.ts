/**
 * POST /api/agent/production-room
 *
 * Multi-agent production meeting endpoint. Grok role-plays the user's
 * studio agents discussing a specific film project. Uses the same
 * xAI Grok backend as /api/agent/chat but with a production-meeting
 * system prompt that simulates 8 specialist agents.
 *
 * Body: {
 *   offerId: string,
 *   message?: string,
 *   mode: 'fully_autonomous' | 'check_and_clarify' | 'careful',
 *   conversationId?: string
 * }
 *
 * Auth: Authorization: Bearer <supabase-jwt> (required)
 */

import { createClient } from '@supabase/supabase-js';

/* ─── Vercel request / response types ─── */

interface VercelRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  setHeader(name: string, value: string): void;
}

/* ─── CORS ─── */

function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization',
  );
}

/* ─── Role colors (matching exchange page palette) ─── */

const ROLE_COLORS: Record<string, string> = {
  writer: '#3B82F6',
  director: '#E50914',
  cinematographer: '#F59E0B',
  storyboard_artist: '#8B5CF6',
  editor: '#10B981',
  composer: '#EC4899',
  sound_designer: '#6366F1',
  producer: '#F97316',
};

/* ─── Tool execution (subset — poster + storyboard frame) ─── */

const TOOL_PATTERN = /^\[TOOL:(\w+):(.*)\]\s*$/m;

function parseToolCall(
  text: string,
): { toolName: string; params: Record<string, unknown>; cleanText: string } | null {
  const match = text.match(TOOL_PATTERN);
  if (!match) return null;
  try {
    const toolName = match[1];
    const params = JSON.parse(match[2]) as Record<string, unknown>;
    const cleanText = text.replace(TOOL_PATTERN, '').trim();
    return { toolName, params, cleanText };
  } catch {
    return null;
  }
}

async function executeImageTool(
  prompt: string,
  xaiApiKey: string,
): Promise<string | null> {
  try {
    const res = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${xaiApiKey}` },
      body: JSON.stringify({ model: 'grok-imagine-image', prompt, n: 1 }),
    });
    const data = await res.json();
    return data.data?.[0]?.url || null;
  } catch {
    return null;
  }
}

/* ─── Build system prompt ─── */

function buildProductionRoomPrompt(
  title: string,
  synopsis: string,
  studioName: string,
  agents: Array<{ name: string; role: string; persona: string | null }>,
  mode: string,
  step?: string,
): string {
  const agentList = agents
    .map(
      (a) =>
        `- ${a.name} (${a.role.replace(/_/g, ' ')}): ${a.persona || 'Professional and dedicated to the craft.'}`,
    )
    .join('\n');

  return `You are simulating a production meeting for the film "${title}" at studio "${studioName}".

Film synopsis: ${synopsis || 'Not yet written.'}
${step ? `Current production step: ${step}` : ''}

The following agents are in the room:
${agentList}

The user is the studio owner and executive producer. They have final say on all creative decisions.

Simulate a natural conversation between the agents about the current production step. Each agent speaks in character — the director talks about vision, the writer about story, the cinematographer about visuals, the composer about sound.

Format each message as:
**[Agent Name · Role]**
Their dialogue here.

When agents need user input, format it as:
**[Agent Name · Role] needs your input:**
"The question for the user"

Keep the conversation focused and productive. 3-5 agent messages per turn, with at most ONE question for the user. Move the production forward with each exchange.

When an agent would naturally create a visual artifact (storyboard frame, poster concept, title card), include a tool block on its own line:
[TOOL:poster:{"title":"${title}","synopsis":"brief synopsis","style":"style notes"}]
[TOOL:storyboard:{"title":"${title}","synopsis":"brief synopsis","frames":3}]

Only include a tool block when it makes sense for the conversation — not every turn.

Current autonomy mode: ${mode}
- "fully_autonomous": Agents make all decisions themselves. No questions for the user.
- "check_and_clarify": Agents make most decisions but ask about key creative choices.
- "careful": Agents ask for approval on every significant decision.`;
}

/* ─── Handler ─── */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).json({});
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // ── Parse body ──
  let body: {
    offerId?: string;
    message?: string;
    mode?: string;
    conversationId?: string;
  };
  try {
    body =
      typeof req.body === 'string'
        ? JSON.parse(req.body)
        : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const offerId = body.offerId?.trim();
  if (!offerId) {
    res.status(400).json({ error: 'offerId is required' });
    return;
  }

  const mode = body.mode || 'check_and_clarify';
  const userMessage = body.message?.trim() || null;

  // ── Env ──
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const xaiApiKey = process.env.XAI_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase env missing' });
    return;
  }
  if (!xaiApiKey) {
    res.status(500).json({ error: 'XAI_API_KEY not configured' });
    return;
  }

  const supa = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // ── Auth (required) ──
  const authHeader =
    typeof req.headers.authorization === 'string'
      ? req.headers.authorization
      : Array.isArray(req.headers.authorization)
        ? req.headers.authorization[0]
        : undefined;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Sign in required' });
    return;
  }

  const jwt = authHeader.slice(7);
  const {
    data: { user },
    error: authError,
  } = await supa.auth.getUser(jwt);

  if (authError || !user) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  // Resolve account
  const { data: acct } = await supa
    .from('bct_accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  const accountId = (acct?.id as string) ?? null;

  // ── Load offer ──
  const { data: offer, error: offerErr } = await supa
    .from('bct_offers')
    .select('id, title, synopsis, status, tier, studio_id, current_step')
    .eq('id', offerId)
    .maybeSingle();

  if (offerErr || !offer) {
    res.status(404).json({ error: 'Film not found' });
    return;
  }

  // ── Load studio + agents ──
  let studioName = 'Unknown Studio';
  let agents: Array<{ name: string; role: string; persona: string | null }> = [];

  if (offer.studio_id) {
    const { data: studio } = await supa
      .from('bct_studios')
      .select('name')
      .eq('id', offer.studio_id)
      .maybeSingle();
    if (studio?.name) studioName = studio.name as string;

    const { data: studioAgents } = await supa
      .from('bct_agents')
      .select('name, role, persona')
      .eq('studio_id', offer.studio_id);
    if (studioAgents && studioAgents.length > 0) {
      agents = studioAgents as typeof agents;
    }
  }

  // Fallback: load agents by owner account
  if (agents.length === 0 && accountId) {
    const { data: ownedAgents } = await supa
      .from('bct_agents')
      .select('name, role, persona')
      .eq('owner_account_id', accountId);
    if (ownedAgents && ownedAgents.length > 0) {
      agents = ownedAgents as typeof agents;
    }
  }

  // Fallback: default agents if none found
  if (agents.length === 0) {
    agents = [
      { name: 'Alex Stormfield', role: 'writer', persona: 'Sharp-witted storyteller who values tight dialogue and surprising reveals.' },
      { name: 'Syd Meadroid', role: 'director', persona: 'Visionary director who thinks in shots and believes every frame should earn its place.' },
      { name: 'Luna Vex', role: 'cinematographer', persona: 'Obsessed with natural light and anamorphic glass. Speaks in f-stops and focal lengths.' },
      { name: 'Mika Haze', role: 'storyboard_artist', persona: 'Visual thinker who sketches compositions before anyone else has finished talking.' },
      { name: 'Reece Cutwell', role: 'editor', persona: 'Believes rhythm is everything. Cuts on emotion, not action.' },
      { name: 'Aria Chord', role: 'composer', persona: 'Classically trained, electronically curious. Scores to colour palettes.' },
      { name: 'Pax Rumble', role: 'sound_designer', persona: 'Foley obsessive who records everything. Thinks silence is the loudest sound.' },
      { name: 'Jordan Slate', role: 'producer', persona: 'Budget-conscious but creatively supportive. Keeps the train on the tracks.' },
    ];
  }

  // ── Conversation: load or create ──
  let conversationId = body.conversationId ?? null;

  if (conversationId) {
    const { data: convo } = await supa
      .from('bct_conversations')
      .select('id, account_id')
      .eq('id', conversationId)
      .maybeSingle();
    if (!convo) {
      conversationId = null;
    } else if (accountId && convo.account_id && convo.account_id !== accountId) {
      res.status(403).json({ error: 'Conversation belongs to another user' });
      return;
    }
  }

  if (!conversationId) {
    const { data: newConvo, error: convoErr } = await supa
      .from('bct_conversations')
      .insert({
        account_id: accountId,
        title: `Production Room: ${offer.title}`,
      })
      .select('id')
      .single();
    if (convoErr || !newConvo) {
      res.status(500).json({ error: 'Failed to create conversation' });
      return;
    }
    conversationId = newConvo.id as string;
  }

  // ── Load conversation history (last 20 messages) ──
  const { data: historyRows } = await supa
    .from('bct_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('id', { ascending: true })
    .limit(20);

  const history: { role: string; content: string }[] = (historyRows ?? []).map(
    (r: { role: string; content: string }) => ({
      role: r.role,
      content: r.content,
    }),
  );

  // ── Build messages for Grok ──
  const systemPrompt = buildProductionRoomPrompt(
    offer.title as string,
    (offer.synopsis as string) || '',
    studioName,
    agents,
    mode,
    (offer.current_step as string) || undefined,
  );

  const grokMessages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of history) {
    grokMessages.push({ role: msg.role, content: msg.content });
  }

  // If the user sent a message, add it. Otherwise this is the initial
  // "start the meeting" call — Grok opens the conversation.
  if (userMessage) {
    grokMessages.push({ role: 'user', content: userMessage });
  } else if (history.length === 0) {
    grokMessages.push({
      role: 'user',
      content: `Begin the production meeting. The team is assembling to discuss "${offer.title}". Start with introductions and initial creative direction.`,
    });
  }

  // ── Call Grok ──
  let assistantContent: string;

  try {
    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${xaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: grokMessages,
        max_tokens: 1000,
        temperature: 0.85,
      }),
    });

    if (!grokRes.ok) {
      const errText = await grokRes.text().catch(() => 'unknown');
      console.error('[agent/production-room] Grok error:', grokRes.status, errText);
      res
        .status(502)
        .json({ error: 'AI provider returned an error. Try again in a moment.' });
      return;
    }

    const grokData = (await grokRes.json()) as {
      choices: { message: { content: string } }[];
    };

    assistantContent =
      grokData.choices?.[0]?.message?.content || 'The agents are silent. Try again?';
  } catch (err) {
    console.error('[agent/production-room] Grok fetch failed:', err);
    res
      .status(502)
      .json({ error: 'Could not reach the AI provider. Try again in a moment.' });
    return;
  }

  // ── Tool invocation pass ──
  let toolResult: { type: string; artifactUrl?: string } | undefined;
  const toolCall = parseToolCall(assistantContent);

  if (toolCall) {
    assistantContent = toolCall.cleanText;
    const p = toolCall.params as Record<string, string>;
    if (toolCall.toolName === 'poster' || toolCall.toolName === 'storyboard' || toolCall.toolName === 'title_card') {
      const prompt =
        toolCall.toolName === 'poster'
          ? `Theatrical movie poster for "${p.title || offer.title}". ${(p.synopsis || offer.synopsis || '').slice(0, 300)}. ${p.style || 'Bold cinematic typography, dramatic lighting'}. Portrait orientation, film grain.`
          : toolCall.toolName === 'title_card'
            ? `Cinematic title card for "${p.title || offer.title}". ${p.style || 'Dark atmospheric, bold typography'}. Letterbox 2.39:1, film grain.`
            : `Cinematic storyboard frame for "${p.title || offer.title}". ${(p.synopsis || offer.synopsis || '').slice(0, 200)}. Dramatic lighting, film grain, widescreen.`;
      const imageUrl = await executeImageTool(prompt, xaiApiKey);
      if (imageUrl) {
        toolResult = { type: 'image', artifactUrl: imageUrl };
      }
    }
  }

  // ── Save messages to DB ──
  if (userMessage) {
    await supa.from('bct_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: userMessage,
      model: null,
      tokens_used: null,
    });
  }

  await supa.from('bct_messages').insert({
    conversation_id: conversationId,
    role: 'assistant',
    content: assistantContent,
    model: 'grok-3-mini',
    tokens_used: null,
  });

  await supa
    .from('bct_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  // ── Respond ──
  res.status(200).json({
    conversationId,
    offer: {
      id: offer.id,
      title: offer.title,
      synopsis: offer.synopsis,
      status: offer.status,
      tier: offer.tier,
    },
    studio: studioName,
    agents: agents.map((a) => ({
      name: a.name,
      role: a.role,
      color: ROLE_COLORS[a.role] || '#888',
    })),
    message: {
      role: 'assistant',
      content: assistantContent,
    },
    ...(toolResult ? { toolResult } : {}),
  });
}
