/**
 * NPGX Agent Tools — OpenAI Function Calling Format
 *
 * These tools wrap the NPGX API endpoints so any OpenAI-compatible model
 * (Kimi K2, DeepSeek, Mistral, etc.) can call them as functions.
 *
 * Each tool is a thin HTTP wrapper — the real work happens on the NPGX API server.
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions'

// ── Tool Definitions (OpenAI function format) ──────────────────────────────

export const AGENT_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'npgx_list_content',
      description: 'List all generated content (images, videos, music) for a character from the content library.',
      parameters: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Character slug (e.g. "luna-cyberblade")' },
        },
        required: ['slug'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'npgx_generate_image',
      description: 'Generate an AI image of an NPGX character. Returns image URL. Cost: 20 sats ($0.01).',
      parameters: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Character slug (e.g. "luna-cyberblade")' },
          prompt: { type: 'string', description: 'Custom prompt additions (scenario, pose, lighting)' },
          scenario: { type: 'string', description: 'Environment/setting (e.g. "rooftop at night", "neon-lit alley")' },
        },
        required: ['slug'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'npgx_generate_video',
      description: 'Generate a video clip of an NPGX character via Wan 2.2. Cost: 800 sats ($0.40). Returns job ID.',
      parameters: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Character slug' },
          prompt: { type: 'string', description: 'Video scene description' },
          imageUrl: { type: 'string', description: 'Reference image URL for image-to-video' },
          duration: { type: 'number', description: 'Duration in seconds (default 5)' },
          resolution: { type: 'string', description: 'Resolution (e.g. "720p", "480p")' },
        },
        required: ['slug'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'npgx_generate_music',
      description: 'Generate a song for an NPGX character via MiniMax. Cost: 40 sats ($0.02). Returns audio URL.',
      parameters: {
        type: 'object',
        properties: {
          characterName: { type: 'string', description: 'Character full name' },
          lyrics: { type: 'string', description: 'Custom lyrics (auto-generated if omitted)' },
          genre: { type: 'string', description: 'Music genre (e.g. "future bass", "punk rock")' },
        },
        required: ['characterName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'npgx_generate_magazine',
      description: 'Generate a full 32-page AI magazine. Cost: 200 sats ($0.10). Returns magazine data.',
      parameters: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Character slug' },
          theme: { type: 'string', description: 'Magazine theme (e.g. "Tokyo Nights")' },
          issueNumber: { type: 'number', description: 'Issue number' },
        },
        required: ['slug'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'npgx_generate_script',
      description: 'Generate a screenplay/script. Cost: 10 sats ($0.005). Returns script text.',
      parameters: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Character slug' },
          genre: { type: 'string', description: 'Script genre (e.g. "action", "thriller")' },
          premise: { type: 'string', description: 'Story premise or brief' },
        },
        required: ['slug'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'npgx_generate_cards',
      description: 'Open a trading card pack. Cost: 60 sats ($0.03). Returns card images.',
      parameters: {
        type: 'object',
        properties: {
          packType: { type: 'string', enum: ['booster', 'starter', 'premium'], description: 'Pack type' },
          character: { type: 'string', description: 'Force a specific character slug' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'npgx_produce',
      description: 'Full one-shot production pipeline: script → shots → video → magazine. Cost: 2820 sats ($1.41). Returns production data.',
      parameters: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Character slug' },
          scenario: { type: 'string', description: 'Production scenario/brief' },
          budget: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Budget tier' },
        },
        required: ['slug', 'scenario'],
      },
    },
  },
]

// ── Tool Executor ──────────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  baseUrl: string = 'http://localhost:3000',
): Promise<string> {
  try {
    switch (name) {
      case 'npgx_list_content': {
        const res = await fetch(`${baseUrl}/api/content/list?slug=${args.slug}`)
        if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
        return JSON.stringify(await res.json(), null, 2)
      }

      case 'npgx_generate_image': {
        const res = await fetch(`${baseUrl}/api/generate-image-npgx`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        })
        if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
        return JSON.stringify(await res.json(), null, 2)
      }

      case 'npgx_generate_video': {
        const body: Record<string, unknown> = { ...args }
        if (args.slug && !args.character) body.character = args.slug
        const res = await fetch(`${baseUrl}/api/generate-video`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
        return JSON.stringify(await res.json(), null, 2)
      }

      case 'npgx_generate_music': {
        const res = await fetch(`${baseUrl}/api/generate-song`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            character: { name: args.characterName, genre: args.genre },
            lyrics: args.lyrics,
          }),
        })
        if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
        return JSON.stringify(await res.json(), null, 2)
      }

      case 'npgx_generate_magazine': {
        const res = await fetch(`${baseUrl}/api/magazine/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        })
        if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
        return JSON.stringify(await res.json(), null, 2)
      }

      case 'npgx_generate_script': {
        const res = await fetch(`${baseUrl}/api/generate-script`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        })
        if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
        return JSON.stringify(await res.json(), null, 2)
      }

      case 'npgx_generate_cards': {
        const res = await fetch(`${baseUrl}/api/cards/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        })
        if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
        return JSON.stringify(await res.json(), null, 2)
      }

      case 'npgx_produce': {
        const res = await fetch(`${baseUrl}/api/produce`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        })
        if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
        return JSON.stringify(await res.json(), null, 2)
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` })
    }
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
      tool: name,
      args,
    })
  }
}

/**
 * Strip base64 image data from tool results to avoid blowing context windows.
 * Replaces data:image/... URIs with a placeholder noting the image was generated.
 */
export function truncateToolResult(result: string, maxLen: number = 4000): string {
  // Replace base64 image data URIs with a short summary
  let cleaned = result.replace(
    /("(?:imageUrl|image|url|data|src)"\s*:\s*)"data:image\/[^"]*"/g,
    '$1"[IMAGE_GENERATED — base64 data stripped to save context]"',
  )
  // Also catch raw base64 blobs that aren't in a JSON key
  cleaned = cleaned.replace(
    /data:image\/[a-z]+;base64,[A-Za-z0-9+/=]{100,}/g,
    '[IMAGE_DATA_STRIPPED]',
  )
  // Truncate if still too long
  if (cleaned.length > maxLen) {
    cleaned = cleaned.substring(0, maxLen) + '\n... [truncated, total ' + result.length + ' chars]'
  }
  return cleaned
}
