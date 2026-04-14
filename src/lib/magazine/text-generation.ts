// Thin wrapper around Grok chat completions API (grok-3-mini)
// Same XAI_API_KEY as image gen, different endpoint
// Fallback: DeepSeek if configured

export interface TextGenerationResult {
  text: string
  cost: number
  provider: 'grok' | 'deepseek'
}

export async function generateText({
  systemPrompt,
  userPrompt,
  temperature = 0.8,
  maxTokens = 1500,
}: {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
}): Promise<TextGenerationResult> {
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userPrompt },
  ]

  // 1. Try Grok (grok-3-mini)
  const xaiKey = process.env.XAI_API_KEY
  if (xaiKey) {
    try {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${xaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'grok-3-mini',
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content || ''
        if (text) {
          // grok-3-mini: ~$0.01 per ~1500 tokens out
          const outputTokens = data.usage?.completion_tokens || maxTokens
          return { text, cost: (outputTokens / 1_000_000) * 5, provider: 'grok' }
        }
      } else {
        console.warn(`Grok text API ${res.status}:`, await res.text().catch(() => ''))
      }
    } catch (err) {
      console.warn('Grok text failed:', err)
    }
  }

  // 2. Fallback: DeepSeek
  const deepseekKey = process.env.DEEPSEEK_API_KEY
  if (deepseekKey) {
    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${deepseekKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content || ''
        if (text) {
          const outputTokens = data.usage?.completion_tokens || maxTokens
          return { text, cost: (outputTokens / 1_000_000) * 0.28, provider: 'deepseek' }
        }
      }
    } catch (err) {
      console.warn('DeepSeek text failed:', err)
    }
  }

  throw new Error('No text generation provider available (need XAI_API_KEY or DEEPSEEK_API_KEY)')
}
