// DIRECTOR — Production pipeline orchestrator
// Runs: Writer → Shot Director → Video Producer → Assembly → Magazine Liaison
// Same pattern as magazine/pipeline.ts

import { loadSoul } from '@/lib/souls'
import { ROSTER_BY_SLUG } from '@/lib/npgx-roster'
import { runWriter } from './agents/writer'
import { runShotDirector } from './agents/shot-director'
import { runVideoProducer } from './agents/video-producer'
import { runMagazineLiaison } from './agents/magazine-liaison'
import type { Production, ProductionContext, ProgressCallback } from './types'

export async function produceVideo(
  slug: string,
  format: 'short-film' | 'music-video' | 'trailer' | 'episode',
  origin: string,
  userBrief?: string,
  onProgress?: ProgressCallback,
): Promise<Production> {
  // Load character
  onProgress?.('director', 'Loading character data...')
  const soul = await loadSoul(slug)
  const character = ROSTER_BY_SLUG[slug]
  if (!character) throw new Error(`Unknown character: ${slug}`)

  // Initialize shared context
  const ctx: ProductionContext = {
    primarySlug: slug,
    primarySoul: soul,
    primaryCharacter: character,
    format,
    userBrief,
    script: null,
    shotList: [],
    generatedVideos: [],
    magazineCoverage: null,
    textCalls: 0,
    videoCalls: 0,
    totalCost: 0,
    errors: [],
    origin,
  }

  // 1. WRITER — generate script
  onProgress?.('director', '1/4 Writer generating script...')
  await runWriter(ctx, onProgress)

  // 2. SHOT DIRECTOR — break script into shots with video prompts
  onProgress?.('director', '2/4 Shot Director creating shot list...')
  await runShotDirector(ctx, onProgress)

  // 3. VIDEO PRODUCER — generate all videos (parallel submit, poll for completion)
  onProgress?.('director', '3/4 Video Producer generating clips...')
  await runVideoProducer(ctx, onProgress)

  // 4. ASSEMBLY — stitch clips into final video via FFmpeg
  let assembledVideoUrl: string | null = null
  const doneClips = ctx.generatedVideos.filter(v => v.status === 'done' && v.videoUrl)
  if (doneClips.length >= 2) {
    onProgress?.('director', `4/5 Assembling ${doneClips.length} clips into final video...`)
    try {
      const res = await fetch(`${origin}/api/video/assemble`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clips: doneClips.map(v => ({ url: v.videoUrl, label: v.shotId })),
          transition: 'fade',
          transitionDuration: 0.5,
          resolution: '720p',
          orientation: 'portrait',
          watermark: `NPGX × ${character.name}`,
        }),
      })
      if (res.ok) {
        // Save assembled video to content folder
        const blob = await res.blob()
        const saveRes = await fetch(`${origin}/api/content/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug,
            type: 'video',
            format: 'mp4',
            data: Buffer.from(await blob.arrayBuffer()).toString('base64'),
            filename: `assembled-${Date.now()}.mp4`,
          }),
        })
        const saveData = await saveRes.json().catch(() => ({}))
        assembledVideoUrl = saveData.url || null
        onProgress?.('director', `Assembly complete: ${(blob.size / 1024 / 1024).toFixed(1)}MB`)
      }
    } catch (err) {
      ctx.errors.push(`Assembly failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      onProgress?.('director', 'Assembly failed — individual clips still available')
    }
  }

  // 5. MAGAZINE LIAISON — write editorial coverage
  onProgress?.('director', `${doneClips.length >= 2 ? '5/5' : '4/4'} Magazine Liaison writing coverage...`)
  await runMagazineLiaison(ctx, onProgress)

  // Assemble final production
  const production: Production = {
    id: `prod-${slug}-${Date.now()}`,
    title: ctx.script?.title || `${character.name}: Untitled`,
    character: character.name,
    slug,
    format,
    script: ctx.script!,
    shotList: ctx.shotList,
    videos: ctx.generatedVideos,
    assembledVideoUrl,
    magazineCoverage: ctx.magazineCoverage,
    totalDuration: doneClips.reduce((sum, v) => sum + v.duration, 0),
    totalCost: ctx.totalCost,
    errors: ctx.errors,
    createdAt: new Date().toISOString(),
  }

  const successCount = doneClips.length
  onProgress?.('director', `Production complete: "${production.title}" — ${successCount}/${ctx.generatedVideos.length} clips${assembledVideoUrl ? ' + assembled video' : ''}, $${ctx.totalCost.toFixed(2)}`)

  return production
}

export type { Production, ProductionContext, ProgressCallback }
