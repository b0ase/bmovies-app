#!/usr/bin/env npx tsx
/**
 * NPGX MCP Server
 * Makes the NPGX platform agent-native via Model Context Protocol.
 *
 * Tools:
 *   npgx_list_characters  — Browse the 26-character roster
 *   npgx_get_character     — Get details for one character
 *   npgx_generate_image    — Generate a character image via Grok
 *   npgx_generate_video    — Start a video generation job
 *   npgx_generate_music    — Generate a character theme song
 *   npgx_generate_magazine — Generate a full 32-page magazine
 *   npgx_produce           — Full one-shot production pipeline
 *   npgx_generate_cards    — Open a trading card pack
 *
 * Resources:
 *   npgx://roster          — Full character roster JSON
 *
 * Usage:
 *   NPGX_BASE_URL=http://localhost:3000 npx tsx mcp/npgx-server.ts
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { join } from 'node:path'

const BASE_URL = process.env.NPGX_BASE_URL || 'http://localhost:3000'

// ── Helpers ──────────────────────────────────────────────────────────────────

async function api(path: string, options?: RequestInit) {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`NPGX API ${res.status}: ${text}`)
  }
  return res.json()
}

async function apiPost(path: string, body: Record<string, unknown>) {
  return api(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// ── Server Setup ─────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'npgx',
  version: '1.0.0',
})

// ── Resources ────────────────────────────────────────────────────────────────

server.resource('roster', 'npgx://roster', async (uri) => {
  const data = await api('/api/generate-image-npgx')
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      },
    ],
  }
})

// ── Tools ────────────────────────────────────────────────────────────────────

server.tool(
  'npgx_list_characters',
  'List all 26 NPGX characters with names, tokens, categories, and taglines',
  {},
  async () => {
    const data = await api('/api/generate-image-npgx')
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    }
  },
)

server.tool(
  'npgx_get_character',
  'Get full details for a specific NPGX character by slug or letter (A-Z)',
  {
    identifier: z.string().describe('Character slug (e.g. "aria-voidstrike") or letter (e.g. "A")'),
  },
  async ({ identifier }) => {
    const data = await api('/api/generate-image-npgx')
    const roster = data.characters || data.souls || data
    const char = Array.isArray(roster)
      ? roster.find(
          (c: any) =>
            c.slug === identifier ||
            c.letter === identifier.toUpperCase() ||
            c.name?.toLowerCase().includes(identifier.toLowerCase()),
        )
      : null
    if (!char) {
      return {
        content: [{ type: 'text' as const, text: `Character "${identifier}" not found` }],
        isError: true,
      }
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(char, null, 2) }],
    }
  },
)

server.tool(
  'npgx_generate_image',
  'Generate an AI image of an NPGX character using Grok. Returns image URL/data.',
  {
    slug: z.string().describe('Character slug (e.g. "aria-voidstrike", "cherryx")'),
    prompt: z
      .string()
      .optional()
      .describe('Optional custom prompt to add to character generation'),
    scenario: z
      .string()
      .optional()
      .describe('Optional scenario (e.g. "rooftop at night", "underground fight club")'),
  },
  async ({ slug, prompt, scenario }) => {
    const body: Record<string, unknown> = { slug }
    if (prompt) body.prompt = prompt
    if (scenario) body.scenario = scenario
    const result = await apiPost('/api/generate-image-npgx', body)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    }
  },
)

server.tool(
  'npgx_generate_video',
  'Generate a video of an NPGX character. Returns job ID for status polling.',
  {
    slug: z.string().optional().describe('Character slug'),
    character: z.string().optional().describe('Character name'),
    prompt: z.string().optional().describe('Video scene prompt'),
    imageUrl: z.string().optional().describe('Reference image URL for image-to-video'),
    duration: z.number().optional().describe('Duration in seconds (default 5)'),
    resolution: z.string().optional().describe('Resolution (e.g. "720p", "480p")'),
  },
  async ({ slug, character, prompt, imageUrl, duration, resolution }) => {
    const body: Record<string, unknown> = {}
    if (slug) body.slug = slug
    if (character) body.character = character
    if (prompt) body.prompt = prompt
    if (imageUrl) body.imageUrl = imageUrl
    if (duration) body.duration = duration
    if (resolution) body.resolution = resolution
    const result = await apiPost('/api/generate-video', body)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    }
  },
)

server.tool(
  'npgx_generate_music',
  'Generate a theme song for an NPGX character using MiniMax Music AI.',
  {
    characterName: z.string().describe('Character name (e.g. "Aria Kurosawa Voidstrike")'),
    lyrics: z.string().optional().describe('Optional custom lyrics. Auto-generated if omitted.'),
    genre: z.string().optional().describe('Music genre hint (e.g. "punk rock", "cyberpunk EDM")'),
  },
  async ({ characterName, lyrics, genre }) => {
    const body: Record<string, unknown> = {
      character: { name: characterName, genre },
    }
    if (lyrics) body.lyrics = lyrics
    const result = await apiPost('/api/generate-song', body)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    }
  },
)

server.tool(
  'npgx_generate_magazine',
  'Generate a full 32-page AI magazine featuring an NPGX character.',
  {
    slug: z.string().describe('Character slug (e.g. "aria-voidstrike")'),
    theme: z.string().optional().describe('Magazine theme (e.g. "Tokyo Nights", "Underground")'),
    issueNumber: z.number().optional().describe('Issue number'),
  },
  async ({ slug, theme, issueNumber }) => {
    const body: Record<string, unknown> = { slug }
    if (theme) body.theme = theme
    if (issueNumber) body.issueNumber = issueNumber
    const result = await apiPost('/api/magazine/generate', body)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    }
  },
)

server.tool(
  'npgx_produce',
  'Full one-shot production pipeline: script → shots → video → magazine. Streams NDJSON progress.',
  {
    slug: z.string().describe('Character slug'),
    scenario: z.string().describe('Production scenario/brief'),
    budget: z.enum(['low', 'medium', 'high']).optional().describe('Budget tier (default: medium)'),
  },
  async ({ slug, scenario, budget }) => {
    const body: Record<string, unknown> = { slug, scenario }
    if (budget) body.budget = budget
    const result = await apiPost('/api/produce', body)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    }
  },
)

server.tool(
  'npgx_generate_cards',
  'Open a trading card pack and generate holographic NPGX character cards.',
  {
    packType: z.enum(['booster', 'starter', 'premium']).optional().describe('Pack type (default: booster)'),
    character: z.string().optional().describe('Force a specific character slug'),
  },
  async ({ packType, character }) => {
    const body: Record<string, unknown> = {}
    if (packType) body.packType = packType
    if (character) body.character = character
    const result = await apiPost('/api/cards/generate', body)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    }
  },
)

server.tool(
  'npgx_generate_script',
  'Generate a screenplay/script for an NPGX production.',
  {
    slug: z.string().describe('Character slug'),
    genre: z.string().optional().describe('Script genre (e.g. "action", "thriller", "romance")'),
    premise: z.string().optional().describe('Story premise or brief'),
  },
  async ({ slug, genre, premise }) => {
    const body: Record<string, unknown> = { slug }
    if (genre) body.genre = genre
    if (premise) body.premise = premise
    const result = await apiPost('/api/generate-script', body)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    }
  },
)

// ── Generation DNA Tools ─────────────────────────────────────────────────────

server.tool(
  'npgx_create_generation',
  'Create a new generation with DNA lineage. Each generation extends the IP tape from its parent, building a recursive chain of inscribed content.',
  {
    characterSlug: z.string().describe('Character slug (e.g. "aria-voidstrike")'),
    contentType: z.enum(['image', 'video', 'music', 'magazine']).describe('Type of content generated'),
    prompt: z.string().describe('The prompt used for generation'),
    contentUrl: z.string().describe('URL to the generated content'),
    parentId: z.string().optional().describe('Parent generation ID to extend the DNA tape from'),
    creatorAddress: z.string().optional().describe('Creator wallet address for revenue splits'),
    model: z.string().optional().describe('AI model used (e.g. "atlas-turbo", "wan-2.2-spicy")'),
    provider: z.string().optional().describe('Provider (e.g. "atlas", "grok", "replicate")'),
    width: z.number().optional().describe('Content width in pixels'),
    height: z.number().optional().describe('Content height in pixels'),
    duration: z.number().optional().describe('Duration in seconds (video/music)'),
  },
  async (params) => {
    const result = await apiPost('/api/generation', params)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    }
  },
)

server.tool(
  'npgx_get_lineage',
  'Get the full DNA lineage for a generation chain. Returns all generations from root to leaf.',
  {
    rootId: z.string().optional().describe('Root generation ID to get full lineage'),
    generationId: z.string().optional().describe('Specific generation ID'),
    characterSlug: z.string().optional().describe('Get all generations for a character'),
    creatorAddress: z.string().optional().describe('Get all generations by a creator'),
  },
  async ({ rootId, generationId, characterSlug, creatorAddress }) => {
    const params = new URLSearchParams()
    if (rootId) params.set('root', rootId)
    if (generationId) params.set('id', generationId)
    if (characterSlug) params.set('slug', characterSlug)
    if (creatorAddress) params.set('creator', creatorAddress)
    const result = await api(`/api/generation?${params.toString()}`)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    }
  },
)

// ── Video Editor Tools ───────────────────────────────────────────────────────

server.tool(
  'npgx_assemble_video',
  'Assemble video clips into a cohesive production with transitions, audio mixing, and watermarks via FFmpeg.',
  {
    clips: z.array(z.object({
      url: z.string().describe('Video clip URL or path'),
      start: z.number().optional().describe('Start time in seconds'),
      end: z.number().optional().describe('End time in seconds'),
    })).describe('Array of video clips to assemble'),
    audioUrl: z.string().optional().describe('Background audio URL'),
    transition: z.enum(['fade', 'cut']).optional().describe('Transition type between clips (default: fade)'),
    resolution: z.string().optional().describe('Output resolution (e.g. "1080p", "720p")'),
    orientation: z.enum(['portrait', 'landscape']).optional().describe('Output orientation'),
    watermark: z.string().optional().describe('Watermark text to overlay'),
  },
  async (params) => {
    const result = await apiPost('/api/video/assemble', params)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    }
  },
)

server.tool(
  'npgx_list_content',
  'List all generated content (images, videos, music) for a character from the content library.',
  {
    slug: z.string().describe('Character slug'),
  },
  async ({ slug }) => {
    const result = await api(`/api/content/list?slug=${slug}`)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    }
  },
)

server.tool(
  'npgx_extend_video',
  'Extend an existing video by generating a continuation from its last frame. Creates a child generation in the DNA lineage.',
  {
    videoUrl: z.string().describe('URL of the video to extend'),
    slug: z.string().describe('Character slug'),
    prompt: z.string().describe('Prompt for the continuation'),
    parentGenerationId: z.string().optional().describe('Parent generation ID for DNA lineage'),
    duration: z.number().optional().describe('Extension duration in seconds (default: 5)'),
  },
  async ({ videoUrl, slug, prompt, parentGenerationId, duration }) => {
    // Start new video from the reference image (last frame of previous)
    const videoResult = await apiPost('/api/generate-video', {
      slug,
      prompt,
      imageUrl: videoUrl,
      duration: duration || 5,
      resolution: '720p',
    })

    // Record generation DNA
    if (videoResult.success && videoResult.requestId) {
      await apiPost('/api/generation', {
        parentId: parentGenerationId || null,
        characterSlug: slug,
        contentType: 'video',
        prompt,
        contentUrl: `pending:${videoResult.requestId}`,
        model: 'wan-2.2-spicy',
        provider: 'atlas',
        duration: duration || 5,
      })
    }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(videoResult, null, 2) }],
    }
  },
)

// ── Movie Editor Tools ──────────────────────────────────────────────────────

server.tool(
  'npgx_movie_library',
  'Browse the video clip library and music tracks available for movie editing. Filter by character or orientation.',
  {
    slug: z.string().optional().describe('Filter by character slug'),
    source: z.enum(['content', 'npg-x-10']).optional().describe('Filter by content source'),
  },
  async ({ slug, source }) => {
    const params = new URLSearchParams()
    if (slug) params.set('slug', slug)
    if (source) params.set('source', source)
    const result = await api(`/api/movie-editor/library?${params.toString()}`)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    }
  },
)

server.tool(
  'npgx_movie_export',
  'Export a movie edit as an assembled MP4 video via FFmpeg. Provide timeline clips and optional music track.',
  {
    clips: z.array(z.object({
      url: z.string().describe('Video clip URL or local path (e.g. "/content/luna-cyberblade/videos/portrait/clip.mp4")'),
    })).describe('Array of clips in timeline order'),
    music: z.object({
      url: z.string().describe('Music track URL (e.g. "/music/albums/tokyo-gutter-punk/01-a.mp3")'),
      volume: z.number().optional().describe('Music volume 0-1 (default 0.4)'),
    }).optional().describe('Background music track'),
    title: z.string().optional().describe('Project title for watermark'),
    orientation: z.enum(['portrait', 'landscape']).optional().describe('Output orientation (default: portrait)'),
    resolution: z.enum(['720p', '1080p']).optional().describe('Output resolution (default: 720p)'),
    transition: z.enum(['fade', 'cut']).optional().describe('Transition type (default: fade)'),
  },
  async ({ clips, music, title, orientation, resolution, transition }) => {
    const body: Record<string, unknown> = { clips, title }
    if (music) body.music = music
    if (orientation) body.orientation = orientation
    if (resolution) body.resolution = resolution
    if (transition) body.transition = transition
    // Note: this returns binary MP4 — for MCP we just confirm success
    try {
      const url = `${BASE_URL}/api/movie-editor/export`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `Export failed (${res.status})`)
      }
      const duration = res.headers.get('X-NPGX-Duration') || 'unknown'
      const clipCount = res.headers.get('X-NPGX-Clips') || clips.length
      const hasAudio = res.headers.get('X-NPGX-Has-Audio') || 'false'
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            clips: clipCount,
            duration: `${duration}s`,
            hasAudio,
            title: title || 'Untitled',
            note: 'Video exported as MP4. Use the movie editor UI to download, or access via API.',
          }, null, 2),
        }],
      }
    } catch (err: any) {
      return {
        content: [{ type: 'text' as const, text: `Export failed: ${err.message}` }],
        isError: true,
      }
    }
  },
)

// ── Timeline Project Tools ──────────────────────────────────────────────────

const projects = new Map<string, any>()

server.tool(
  'npgx_list_tracks',
  'List all recorded music tracks with slug, title, genre, BPM. Shows which have video clips and karaoke.',
  {},
  async () => {
    const result = await api('/api/music-video-clips?track=_list_all').catch(() => null)
    // Fallback: read manifest directly
    const tracks = await api('/api/karaoke?track=_list').catch(() => ({ error: 'unavailable' }))
    return { content: [{ type: 'text' as const, text: JSON.stringify({ note: 'Use list_clips with a specific track slug to get clips', tracks }, null, 2) }] }
  },
)

server.tool(
  'npgx_list_clips',
  'Get all video clips for a music track. Returns titles/lyrics clips and scene clips separately. Use quality=low for editor previews.',
  {
    track: z.string().describe('Track slug e.g. "razor-kisses", "harajuku-chainsaw"'),
    quality: z.enum(['full', 'low']).optional().describe('Clip quality — low=compressed for editing'),
  },
  async ({ track, quality }) => {
    const q = quality === 'low' ? '&quality=low' : ''
    const data = await api(`/api/music-video-clips?track=${track}${q}`)
    const all: string[] = data.clips || []
    const titles = all.filter(c => c.includes('-titles-') || c.includes('-lyrics-'))
    const scenes = all.filter(c => !c.includes('-titles-') && !c.includes('-lyrics-'))
    return { content: [{ type: 'text' as const, text: JSON.stringify({ track, titles: titles.length, scenes: scenes.length, titleClips: titles, sceneClips: scenes }, null, 2) }] }
  },
)

server.tool(
  'npgx_get_lyrics_sync',
  'Get whisper transcription timestamps for a track. Returns segments with start/end times and lyrics text for karaoke sync.',
  {
    track: z.string().describe('Track slug'),
  },
  async ({ track }) => {
    try {
      const data = await api(`/music/lyrics-sync/${track}.json`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ error: `No lyrics sync data for ${track}` }) }] }
    }
  },
)

server.tool(
  'npgx_get_karaoke_prompts',
  'Get motion graphics generation prompts for karaoke clips. Each prompt describes a 5-second lyric clip with genre-specific styling.',
  {
    track: z.string().describe('Track slug'),
  },
  async ({ track }) => {
    const data = await api(`/api/karaoke?track=${track}`)
    return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
  },
)

server.tool(
  'npgx_create_project',
  'Create a new empty timeline project for editing a music video. Returns project ID.',
  {
    track: z.string().describe('Track slug'),
    title: z.string().optional().describe('Project title'),
  },
  async ({ track, title }) => {
    const id = crypto.randomUUID()
    const project = {
      id, schemaVersion: 2,
      title: title || `${track} Edit`,
      trackSlug: track, musicUrl: '', musicSide: 'a',
      channels: { music: { a: [], b: [] }, scenes: { a: [], b: [] }, x: { a: [], b: [] } },
      fx: { crimson: false, glitch: false, rgb: false },
      resolution: '1080p', orientation: 'landscape',
      mintHistory: [], conditions: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    projects.set(id, project)
    return { content: [{ type: 'text' as const, text: JSON.stringify({ created: id, track, title: project.title }, null, 2) }] }
  },
)

server.tool(
  'npgx_add_clip',
  'Add a clip to a project timeline channel. Channels: music (karaoke/titles base layer), scenes (performance middle layer), x (rated content top layer).',
  {
    projectId: z.string().describe('Project ID from create_project'),
    channel: z.enum(['music', 'scenes', 'x']).describe('Target channel'),
    subTrack: z.enum(['a', 'b']).optional().describe('Sub-track: a=main, b=edit lane (default a)'),
    clipUrl: z.string().describe('URL path to the clip'),
    startTime: z.number().describe('Start time in seconds on timeline'),
    duration: z.number().describe('Duration in seconds'),
    characterSlug: z.string().optional().describe('Character slug for X channel clips'),
  },
  async ({ projectId, channel, subTrack, clipUrl, startTime, duration, characterSlug }) => {
    const project = projects.get(projectId)
    if (!project) return { content: [{ type: 'text' as const, text: '{"error":"Project not found"}' }], isError: true }
    const sub = subTrack || 'a'
    const clip = {
      id: crypto.randomUUID(), clipUrl, startTime, duration,
      sourceStartOffset: 0, sourceEndOffset: duration,
      segment: project.channels[channel][sub].length + 1,
      type: channel === 'x' ? 'x' : channel === 'music' ? 'title' : 'performance',
      characterSlug,
    }
    project.channels[channel][sub].push(clip)
    project.updatedAt = new Date().toISOString()
    return { content: [{ type: 'text' as const, text: JSON.stringify({ added: clip.id, channel, sub, total: project.channels[channel][sub].length }, null, 2) }] }
  },
)

server.tool(
  'npgx_split_clip',
  'Split a clip into two at a given timeline time. Used by the cut/razor tool.',
  {
    projectId: z.string(),
    clipId: z.string().describe('ID of the clip to split'),
    splitTime: z.number().describe('Absolute timeline time to split at (must be within clip bounds)'),
  },
  async ({ projectId, clipId, splitTime }) => {
    const project = projects.get(projectId)
    if (!project) return { content: [{ type: 'text' as const, text: '{"error":"Project not found"}' }], isError: true }
    for (const ch of ['music', 'scenes', 'x']) {
      for (const sub of ['a', 'b']) {
        const idx = project.channels[ch][sub].findIndex((c: any) => c.id === clipId)
        if (idx === -1) continue
        const clip = project.channels[ch][sub][idx]
        if (splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration)
          return { content: [{ type: 'text' as const, text: '{"error":"Split time out of bounds"}' }], isError: true }
        const durA = splitTime - clip.startTime
        const ratio = durA / clip.duration
        const srcSplit = clip.sourceStartOffset + (clip.sourceEndOffset - clip.sourceStartOffset) * ratio
        const a = { ...clip, id: crypto.randomUUID(), duration: durA, sourceEndOffset: srcSplit }
        const b = { ...clip, id: crypto.randomUUID(), startTime: splitTime, duration: clip.duration - durA, sourceStartOffset: srcSplit }
        project.channels[ch][sub].splice(idx, 1, a, b)
        project.updatedAt = new Date().toISOString()
        return { content: [{ type: 'text' as const, text: JSON.stringify({ split: [a.id, b.id], channel: ch, sub }, null, 2) }] }
      }
    }
    return { content: [{ type: 'text' as const, text: '{"error":"Clip not found"}' }], isError: true }
  },
)

server.tool(
  'npgx_hash_project',
  'Compute SHA-256 hash of a project for chain minting. Returns the hash for OP_RETURN inscription.',
  {
    projectId: z.string(),
  },
  async ({ projectId }) => {
    const project = projects.get(projectId)
    if (!project) return { content: [{ type: 'text' as const, text: '{"error":"Project not found"}' }], isError: true }
    const { updatedAt, mintHistory, ...hashable } = project
    const json = JSON.stringify(hashable)
    const buf = new TextEncoder().encode(json)
    const hash = await crypto.subtle.digest('SHA-256', buf)
    const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
    return { content: [{ type: 'text' as const, text: JSON.stringify({ hash: hex, projectId, trackSlug: project.trackSlug, channels: { music: project.channels.music.a.length + project.channels.music.b.length, scenes: project.channels.scenes.a.length + project.channels.scenes.b.length, x: project.channels.x.a.length + project.channels.x.b.length } }, null, 2) }] }
  },
)

server.tool(
  'npgx_get_project',
  'Export full project as JSON. Use for review, backup, minting, or loading into the browser editor.',
  {
    projectId: z.string(),
  },
  async ({ projectId }) => {
    const project = projects.get(projectId)
    if (!project) return { content: [{ type: 'text' as const, text: '{"error":"Project not found"}' }], isError: true }
    return { content: [{ type: 'text' as const, text: JSON.stringify(project, null, 2) }] }
  },
)

server.tool(
  'npgx_get_x_content',
  'Get X-rated content (fetish, x, xx, xxx) for a character. Returns image paths for the X channel.',
  {
    character: z.string().describe('Character slug e.g. "dahlia-ironveil"'),
  },
  async ({ character }) => {
    const data = await api(`/api/content/list?slug=${character}`)
    const items = (data.items || []).filter((i: any) => {
      const p = (i.path || '').toLowerCase()
      return (p.includes('/fetish/') || p.includes('/x/') || p.includes('/xx/') || p.includes('/xxx/')) && i.type === 'image'
    })
    return { content: [{ type: 'text' as const, text: JSON.stringify({ character, xContent: items, total: items.length }, null, 2) }] }
  },
)

// ── Motion Graphics ─────────────────────────────────────────────────────────

server.tool(
  'npgx_motion_graphics',
  'List motion graphics presets, or compute an interpolated animation frame at a given time',
  {
    action: z.enum(['list', 'frame']).describe('list = show all presets, frame = compute frame at time t'),
    presetId: z.string().optional().describe('Preset ID (required for frame action)'),
    time: z.number().min(0).max(1).optional().describe('Normalised time 0–1 (for frame action, default 0.5)'),
    category: z.string().optional().describe('Filter presets by category (for list action)'),
  },
  async ({ action, presetId, time, category }) => {
    if (action === 'list') {
      const url = `${BASE_URL}/api/motion-graphics${category ? `?category=${category}` : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
      const data = await res.json()
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    }

    // frame action
    if (!presetId) throw new Error('presetId is required for frame action')
    const res = await fetch(`${BASE_URL}/api/motion-graphics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presetId, time: time ?? 0.5 }),
    })
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
    const data = await res.json()
    return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
  },
)

// ── Premium Music Video Pipeline ─────────────────────────────────────────────

server.tool(
  'npgx_produce_premium',
  'Generate a full lip-synced music video using Runway (gen4_turbo/gen4.5) + Sync Labs (lipsync-2-pro). Runs locally: stems → shot planning → video gen → lip sync → FFmpeg assembly. Returns output path and cost breakdown.',
  {
    track: z.string().describe('Track slug (e.g. "dead-idols", "harajuku-chainsaw")'),
    character: z.string().describe('Character slug (e.g. "luna-cyberblade", "nova-bloodmoon")'),
    runwayModel: z.enum(['gen4_turbo', 'gen4.5', 'gen3a_turbo']).optional().describe('Runway model (default: gen4_turbo)'),
    syncModel: z.enum(['lipsync-2', 'lipsync-2-pro']).optional().describe('Sync Labs model (default: lipsync-2-pro)'),
    concurrency: z.number().optional().describe('Max parallel Runway jobs (default: 2)'),
    skipLipSync: z.boolean().optional().describe('Skip lip sync step (just generate and assemble clips)'),
    vocalStemUrl: z.string().optional().describe('Pre-separated vocal stem URL (skips Demucs)'),
  },
  async ({ track, character, runwayModel, syncModel, concurrency, skipLipSync, vocalStemUrl }) => {
    try {
      // Dynamic import to avoid loading heavy deps at server start
      const { runPremiumPipeline } = await import('../src/lib/ai/premium-video-pipeline')
      const result = await runPremiumPipeline({
        trackSlug: track,
        characterSlug: character,
        runwayModel: (runwayModel || 'gen4_turbo') as any,
        syncModel: (syncModel || 'lipsync-2-pro') as any,
        concurrency: concurrency || 2,
        outputDir: join(__dirname, '..', 'output', 'music-videos'),
        skipLipSync: skipLipSync || false,
        vocalStemUrl,
      })
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            outputPath: result.outputPath,
            duration: `${result.duration}s`,
            clips: result.clipCount,
            cost: {
              runway: `$${result.runwayCost.toFixed(3)}`,
              syncLabs: `$${result.syncLabsCost.toFixed(3)}`,
              stems: `$${result.stemCost.toFixed(3)}`,
              total: `$${result.totalCost.toFixed(3)}`,
            },
          }, null, 2),
        }],
      }
    } catch (err: any) {
      return {
        content: [{ type: 'text' as const, text: `Pipeline failed: ${err.message}` }],
        isError: true,
      }
    }
  },
)

// ── Start ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('NPGX MCP server running on stdio')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
