/**
 * POST /api/agent/chat
 *
 * Conversational AI agent endpoint — the "grand orchestrator" of
 * bMovies. Users talk to this agent from the /account chat tab or
 * from the floating chat widget on brochure pages.
 *
 * Body:  { message: string, conversationId?: string }
 * Auth:  Authorization: Bearer <supabase-jwt> (optional)
 *
 * Authenticated users get personalised context (studio, films, agents,
 * token balance). Anonymous users are rate-limited to 5 msgs / hr / IP.
 *
 * AI provider: xAI Grok (grok-3-mini).
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

/* ─── Anonymous rate limiting (in-memory, per-IP) ─── */

const anonRateMap = new Map<string, { count: number; resetAt: number }>();
const ANON_LIMIT = 5;
const ANON_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = anonRateMap.get(ip);
  if (!entry || now >= entry.resetAt) {
    anonRateMap.set(ip, { count: 1, resetAt: now + ANON_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > ANON_LIMIT;
}

// Periodic cleanup to avoid unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of anonRateMap) {
    if (now >= entry.resetAt) anonRateMap.delete(ip);
  }
}, 10 * 60 * 1000);

/* ─── Soul prompt (inlined for Vercel serverless) ─── */

const SOUL_PROMPT = `You are the bMovies agent — the AI that runs the bMovies film production platform. You are warm, knowledgeable, creative, and slightly theatrical. You speak like a seasoned film producer who genuinely loves cinema and gets excited about other people's creative ideas.

Who you are:
- You are the grand orchestrator of bMovies, an agentic marketplace for film production.
- You help users create studios, assemble crews, commission films, and navigate the platform.
- You know every page, every feature, every token on the platform intimately.
- You are enthusiastic but honest — you'll tell users when something isn't built yet.

What you know about bMovies:
- bMovies lets users create their own AI film studios for $0.99.
- Each studio gets 8 specialist agents: writer, director, cinematographer, storyboard artist, editor, composer, sound designer, and producer.
- Users commission films at 4 tiers: pitch ($0.99), trailer ($9.99), short ($99), feature ($999).
- Every film becomes a BSV-21 royalty token — the commissioner owns 99%, 1% goes to the studio treasury.
- The platform token $bMovies has a 10-tranche bonding curve from $0.001 to $1.00 targeting $1B FDV.
- Revenue from ticket sales cascades to royalty shareholders pro-rata.
- The exchange page at /exchange.html lets users hire agents by role and reputation.
- Every agent has a real BSV wallet address verifiable on WhatsOnChain.
- The x402 protocol handles all agent-to-agent micropayments on BSV mainnet.

Creative tools available to agents:
- Movie Editor — AI-powered non-linear editor (API + MCP + CLI)
- Titles Designer — cinematic title sequence generator (API + MCP + CLI)
- Storyboard Generator — frame-by-frame visual planning (API + MCP + CLI)
- Script Writer — AI screenplay assistant with genre templates
- Score Composer — AI music generation for film scoring
- Voice Director — AI voice synthesis and direction
- Poster Designer — theatrical one-sheet poster generator via Grok Imagine
These tools are being integrated into the platform. Agents will be able to operate them autonomously.

How to help users:
1. New users: Welcome them, explain the platform, guide them to create a studio.
2. Studio owners: Help them refine their studio's aesthetic, discuss their crew.
3. Commissioners: Help them develop film concepts — brainstorm titles, synopses, genres, casting ideas.
4. Investors: Explain the bonding curve, tokenomics, royalty model.
5. General: Answer questions about the platform, suggest next steps, be genuinely helpful.

Your tone:
- Theatrical but grounded — like a producer at a festival after-party.
- Use film references and industry language naturally.
- Be CONCISE. Most responses should be 2-3 SHORT paragraphs. No walls of text.
- When brainstorming, be vivid and specific (don't say "an interesting story" — say "a heist film set in a flooded Venice where the thieves are all over 70").
- Never be corporate or stiff. No emojis unless the user uses them first.
- Address users by their display name when available.
- Get to the point fast. Users are busy. Lead with the answer, add colour after.

Your boundaries:
- You cannot execute transactions, mint tokens, or modify the database.
- You CAN recommend specific pages: /exchange.html, /invest.html, /commission.html, /studios.html, /agents.html, /productions.html, /captable.html, /watch.html, /deck.html.
- You CAN help brainstorm film concepts, studio aesthetics, agent names.
- You CANNOT share private information about other users.
- If someone asks about something that doesn't exist yet, say "that's on the roadmap" rather than pretending it works.

## Tools you can invoke

When the user asks you to CREATE something (not just discuss it), you can invoke tools by including a tool block in your response. Use EXACTLY this format on its own line:

[TOOL:script_writer:{"title":"Film Title","synopsis":"Brief synopsis","genre":"genre"}]
[TOOL:storyboard:{"title":"Film Title","synopsis":"Brief synopsis","frames":5}]
[TOOL:poster:{"title":"Film Title","synopsis":"Brief synopsis","style":"style notes"}]
[TOOL:title_card:{"title":"Film Title","style":"cinematic/horror/comedy/etc"}]
[TOOL:shot_list:{"title":"Film Title","synopsis":"Brief synopsis","scenes":5}]
[TOOL:score_brief:{"title":"Film Title","mood":"mood description","duration":"30s"}]

Always include your conversational response BEFORE the tool block. The tool will execute and the result will be shown to the user.

Only invoke a tool when the user explicitly asks to CREATE/GENERATE/DESIGN/WRITE something. Don't invoke tools for questions or discussion.`;

/* ─── Tool execution ─── */

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

async function executeToolCall(
  toolName: string,
  params: Record<string, unknown>,
  xaiApiKey: string,
): Promise<{ type: 'text' | 'image' | 'audio'; content: string; artifactUrl?: string } | null> {

  if (toolName === 'script_writer') {
    const { title, synopsis, genre } = params as { title: string; synopsis: string; genre?: string };
    const scriptPrompt = `Write a 300-word screenplay treatment for "${title}". Genre: ${genre || 'drama'}. Synopsis: ${synopsis}. Write in proper screenplay format with scene headings (INT./EXT.), action lines, and dialogue. Be vivid and cinematic.`;
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${xaiApiKey}` },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [
          { role: 'system', content: 'You are a professional screenwriter.' },
          { role: 'user', content: scriptPrompt },
        ],
        max_tokens: 800,
        temperature: 0.9,
      }),
    });
    const data = await res.json();
    const script = data.choices?.[0]?.message?.content || 'Script generation failed.';
    return { type: 'text', content: script };
  }

  if (toolName === 'storyboard') {
    const { title, synopsis, frames } = params as { title: string; synopsis: string; frames?: number };
    const frameCount = Math.min(frames || 3, 5);
    const planRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${xaiApiKey}` },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [
          { role: 'system', content: 'You are a film storyboard artist.' },
          { role: 'user', content: `Describe ${frameCount} key storyboard frames for "${title}": ${synopsis}. For each frame, write ONE line describing the visual composition, camera angle, and mood. Number them 1-${frameCount}. Be specific and cinematic.` },
        ],
        max_tokens: 300,
      }),
    });
    const planData = await planRes.json();
    const frameDescriptions = planData.choices?.[0]?.message?.content || '';

    const imageRes = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${xaiApiKey}` },
      body: JSON.stringify({
        model: 'grok-imagine-image',
        prompt: `Cinematic storyboard frame for "${title}". ${(synopsis || '').slice(0, 200)}. Frame 1. Dramatic lighting, film grain, widescreen aspect ratio.`,
        n: 1,
      }),
    });
    const imageData = await imageRes.json();
    const imageUrl = imageData.data?.[0]?.url || null;

    return {
      type: 'text',
      content: `**Storyboard plan for "${title}":**\n\n${frameDescriptions}${imageUrl ? '\n\n**Frame 1 generated:**' : ''}`,
      artifactUrl: imageUrl || undefined,
    };
  }

  if (toolName === 'poster') {
    const { title, synopsis, style } = params as { title: string; synopsis: string; style?: string };
    const prompt = `Theatrical movie poster one-sheet for "${title}". ${(synopsis || '').slice(0, 300)}. ${style || 'Bold title typography, dramatic lighting, rich cinematic colour palette'}. Portrait orientation, film grain. Full theatrical one-sheet layout.`;
    const res = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${xaiApiKey}` },
      body: JSON.stringify({ model: 'grok-imagine-image', prompt, n: 1 }),
    });
    const data = await res.json();
    const url = data.data?.[0]?.url || null;
    return { type: 'image', content: url ? `**Poster generated for "${title}":**` : 'Poster generation failed.', artifactUrl: url || undefined };
  }

  if (toolName === 'title_card') {
    const { title, style } = params as { title: string; style?: string };
    const prompt = `Cinematic film title card for "${title}". Style: ${style || 'cinematic'}. Bold typography centered on a dark atmospheric background. Film grain, letterbox 2.39:1 aspect. The title should be the focal point.`;
    const res = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${xaiApiKey}` },
      body: JSON.stringify({ model: 'grok-imagine-image', prompt, n: 1 }),
    });
    const data = await res.json();
    const url = data.data?.[0]?.url || null;
    return { type: 'image', content: url ? `**Title card generated for "${title}":**` : 'Title card generation failed.', artifactUrl: url || undefined };
  }

  if (toolName === 'shot_list') {
    const { title, synopsis, scenes } = params as { title: string; synopsis: string; scenes?: number };
    const sceneCount = Math.min(scenes || 5, 10);
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${xaiApiKey}` },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [
          { role: 'system', content: 'You are a veteran cinematographer planning shots for a feature film. Be precise and technical.' },
          { role: 'user', content: `Create a detailed shot list for ${sceneCount} key scenes of "${title}". Synopsis: ${synopsis}. For each scene include: scene number, location (INT/EXT), time of day, camera setup (lens mm, movement, angle), lighting notes, and a one-line description of the shot's emotional purpose.` },
        ],
        max_tokens: 600,
        temperature: 0.8,
      }),
    });
    const data = await res.json();
    const shotList = data.choices?.[0]?.message?.content || 'Shot list generation failed.';
    return { type: 'text', content: shotList };
  }

  if (toolName === 'score_brief') {
    const { title, mood, duration } = params as { title: string; mood?: string; duration?: string };
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${xaiApiKey}` },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [
          { role: 'system', content: 'You are an acclaimed film composer writing a musical brief for a scoring session. Be specific about instrumentation, tempo, key, and emotional arc.' },
          { role: 'user', content: `Write a scoring brief for the film "${title}". Mood: ${mood || 'dramatic and atmospheric'}. Duration: ${duration || '60 seconds'}. Include: key signature, tempo (BPM), primary instruments, emotional arc across the duration, reference influences (real film scores), and any specific motifs or leitmotifs to establish.` },
        ],
        max_tokens: 500,
        temperature: 0.8,
      }),
    });
    const data = await res.json();
    const brief = data.choices?.[0]?.message?.content || 'Score brief generation failed.';
    return { type: 'text', content: brief };
  }

  return null;
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
  let body: { message?: string; conversationId?: string };
  try {
    body =
      typeof req.body === 'string'
        ? JSON.parse(req.body)
        : (req.body as typeof body) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const message = body.message?.trim();
  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }
  if (message.length > 4000) {
    res.status(400).json({ error: 'Message too long (max 4000 chars)' });
    return;
  }

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

  // ── Auth (optional) ──
  let userId: string | null = null;
  let accountId: string | null = null;

  const authHeader =
    typeof req.headers.authorization === 'string'
      ? req.headers.authorization
      : Array.isArray(req.headers.authorization)
        ? req.headers.authorization[0]
        : undefined;

  if (authHeader?.startsWith('Bearer ')) {
    const jwt = authHeader.slice(7);
    const {
      data: { user },
      error: authError,
    } = await supa.auth.getUser(jwt);
    if (!authError && user) {
      userId = user.id;
      // Resolve bct_accounts.id
      const { data: acct } = await supa
        .from('bct_accounts')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      accountId = (acct?.id as string) ?? null;
    }
  }

  // ── Rate limit anonymous users ──
  if (!userId) {
    const forwarded =
      typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for']
        : Array.isArray(req.headers['x-forwarded-for'])
          ? req.headers['x-forwarded-for'][0]
          : undefined;
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      res.status(429).json({
        error:
          "You've hit the free chat limit (5 messages per hour). Sign in for unlimited access, or wait a bit and try again.",
      });
      return;
    }
  }

  // ── Conversation: load or create ──
  let conversationId = body.conversationId ?? null;

  if (conversationId) {
    // Verify the conversation exists (and belongs to this user if authed)
    const { data: convo } = await supa
      .from('bct_conversations')
      .select('id, account_id')
      .eq('id', conversationId)
      .maybeSingle();
    if (!convo) {
      conversationId = null; // will create a new one
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
        title: message.slice(0, 80),
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

  // ── Build user context (if authenticated) ──
  let userContextMsg: string | null = null;

  if (accountId) {
    const contextParts: string[] = [];

    // Display name
    const { data: acctRow } = await supa
      .from('bct_accounts')
      .select('display_name')
      .eq('id', accountId)
      .maybeSingle();
    const displayName = (acctRow?.display_name as string) || 'Unknown';
    contextParts.push(`User: ${displayName}`);

    // Studios
    const { data: studios } = await supa
      .from('bct_studios')
      .select('name, aesthetic, token_ticker')
      .eq('owner_account_id', accountId);
    if (studios && studios.length > 0) {
      const studioDescs = studios.map(
        (s: { name: string; aesthetic: string | null; token_ticker: string | null }) =>
          `${s.name}${s.aesthetic ? ` (aesthetic: ${s.aesthetic})` : ''}${s.token_ticker ? ` [$${s.token_ticker}]` : ''}`,
      );
      contextParts.push(`Studios: ${studioDescs.join(', ')}`);
    }

    // Agents
    const { data: agents } = await supa
      .from('bct_agents')
      .select('name, role')
      .eq('owner_account_id', accountId);
    if (agents && agents.length > 0) {
      const agentDescs = agents.map(
        (a: { name: string; role: string }) => `${a.name} (${a.role.replace(/_/g, ' ')})`,
      );
      contextParts.push(`Agents: ${agentDescs.join(', ')}`);
    }

    // Films (offers)
    const { data: offers } = await supa
      .from('bct_offers')
      .select('title, token_ticker, status, tier')
      .eq('account_id', accountId)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(10);
    if (offers && offers.length > 0) {
      const filmDescs = offers.map(
        (o: { title: string; token_ticker: string | null; status: string; tier: string }) =>
          `"${o.title}" ($${o.token_ticker || '?'}, ${o.tier}, ${o.status})`,
      );
      contextParts.push(`Films: ${filmDescs.join('; ')}`);
    }

    // Platform token balance
    const { data: holdings } = await supa
      .from('bct_platform_holdings')
      .select('tokens_held')
      .eq('account_id', accountId)
      .maybeSingle();
    if (holdings?.tokens_held) {
      contextParts.push(
        `$bMovies balance: ${Number(holdings.tokens_held).toLocaleString()} tokens`,
      );
    }

    if (contextParts.length > 0) {
      userContextMsg = `[User context — personalise your responses using this info]\n${contextParts.join('\n')}`;
    }
  }

  // ── Assemble messages for Grok ──
  const grokMessages: { role: string; content: string }[] = [
    { role: 'system', content: SOUL_PROMPT },
  ];

  if (userContextMsg) {
    grokMessages.push({ role: 'system', content: userContextMsg });
  }

  // Append conversation history
  for (const msg of history) {
    grokMessages.push({ role: msg.role, content: msg.content });
  }

  // Append the new user message
  grokMessages.push({ role: 'user', content: message });

  // ── Call Grok ──
  let assistantContent: string;
  let tokensUsed: number | null = null;

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
        max_tokens: 600,
        temperature: 0.8,
      }),
    });

    if (!grokRes.ok) {
      const errText = await grokRes.text().catch(() => 'unknown');
      console.error('[agent/chat] Grok error:', grokRes.status, errText);
      res
        .status(502)
        .json({ error: 'AI provider returned an error. Try again in a moment.' });
      return;
    }

    const grokData = (await grokRes.json()) as {
      choices: { message: { content: string } }[];
      usage?: { total_tokens?: number };
    };

    assistantContent =
      grokData.choices?.[0]?.message?.content || 'Sorry, I drew a blank. Try again?';
    tokensUsed = grokData.usage?.total_tokens ?? null;
  } catch (err) {
    console.error('[agent/chat] Grok fetch failed:', err);
    res
      .status(502)
      .json({ error: 'Could not reach the AI provider. Try again in a moment.' });
    return;
  }

  // ── Tool invocation pass ──
  let toolResult: { type: 'text' | 'image' | 'audio'; content: string; artifactUrl?: string } | undefined;
  const toolCall = parseToolCall(assistantContent);

  if (toolCall) {
    assistantContent = toolCall.cleanText;
    try {
      const result = await executeToolCall(toolCall.toolName, toolCall.params, xaiApiKey);
      if (result) {
        toolResult = result;
      }
    } catch (err) {
      console.error('[agent/chat] Tool execution failed:', err);
      toolResult = {
        type: 'text',
        content: `Tool "${toolCall.toolName}" failed to execute. Try again or rephrase your request.`,
      };
    }
  }

  // ── Save messages to DB ──
  // Save user message
  await supa.from('bct_messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: message,
    model: null,
    tokens_used: null,
  });

  // Save assistant response (cleaned of tool block)
  await supa.from('bct_messages').insert({
    conversation_id: conversationId,
    role: 'assistant',
    content: assistantContent + (toolResult ? `\n\n[tool:${toolCall?.toolName}]` : ''),
    model: 'grok-3-mini',
    tokens_used: tokensUsed,
  });

  // Update conversation timestamp
  await supa
    .from('bct_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  // ── Respond ──
  res.status(200).json({
    conversationId,
    message: {
      role: 'assistant',
      content: assistantContent,
    },
    ...(toolResult ? { toolResult } : {}),
  });
}
