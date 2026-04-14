#!/usr/bin/env npx tsx
/**
 * Premium Music Video Pipeline
 * Runway gen4_turbo (video gen) + Sync Labs lipsync-2-pro (lip sync) + FFmpeg (assembly)
 *
 * Generates a complete lip-synced music video from a track slug and character slug.
 *
 * Flow:
 *   1. Load track metadata (lyrics sync JSON) + character image URL
 *   2. Separate stems via Demucs → isolated vocals URL
 *   3. Plan shots from lyrics segments (vocal vs instrumental)
 *   4. Generate video clips via Runway (image-to-video, parallel)
 *   5. Download clips + FFmpeg concatenate into one video
 *   6. Upload concatenated video to tmp host (public URL for Sync Labs)
 *   7. Sync Labs: full video + vocal stem → lip-synced video
 *   8. FFmpeg: replace audio with original full mix → final MP4
 *
 * Usage:
 *   npx tsx src/lib/ai/premium-video-pipeline.ts --track dead-idols --character luna-cyberblade
 *   npx tsx src/lib/ai/premium-video-pipeline.ts --track dead-idols --character luna-cyberblade --runway-model gen4.5
 *
 * Required env vars:
 *   RUNWAYML_API_SECRET  — Runway API key (dev.runwayml.com)
 *   SYNC_API_KEY         — Sync Labs API key (sync.so)
 *   REPLICATE_API_TOKEN  — Replicate API token (for Demucs stem separation)
 */

import { readFileSync, existsSync, mkdirSync } from 'fs'
import { writeFile } from 'fs/promises'
import { join, resolve } from 'path'
import { execFile as execFileCb } from 'child_process'
import { promisify } from 'util'

import { startRunwayVideo, waitForRunwayVideo, runwayCost, type RunwayModel } from './runway-video'
import { startLipSync, waitForLipSync, lipSyncCost, type SyncLabsModel } from './sync-labs'
import { separateStems } from './music-pipeline'

const execFile = promisify(execFileCb)

// ── Config ───────────────────────────────────────────────────────────────────

const NPGX_SITE = 'https://www.npgx.website'
const PROJECT_ROOT = resolve(__dirname, '../../..')
const LYRICS_SYNC_DIR = join(PROJECT_ROOT, 'public/music/lyrics-sync')
const OUTPUT_DIR = join(PROJECT_ROOT, 'output/music-videos')

// ── Types ────────────────────────────────────────────────────────────────────

interface LyricsSync {
  slug: string
  album: string
  audioUrl: string
  transcription: string
  segments: Array<{
    id: number
    start: number
    end: number
    text: string
  }>
  duration: number
}

interface Shot {
  index: number
  start: number
  end: number
  duration: number
  type: 'vocal' | 'instrumental'
  lyrics?: string
  prompt: string
}

export interface PipelineConfig {
  trackSlug: string
  characterSlug: string
  runwayModel: RunwayModel
  syncModel: SyncLabsModel
  /** Max concurrent Runway generations (default 2, Tier 1 limit) */
  concurrency: number
  /** Output directory */
  outputDir: string
  /** Skip stem separation — pass a vocal stem URL directly */
  vocalStemUrl?: string
  /** Skip lip sync (just generate and assemble clips) */
  skipLipSync?: boolean
}

export interface PipelineResult {
  outputPath: string
  totalCost: number
  runwayCost: number
  syncLabsCost: number
  stemCost: number
  clipCount: number
  duration: number
  shots: Shot[]
}

// ── Load Data ────────────────────────────────────────────────────────────────

function loadLyricsSync(trackSlug: string): LyricsSync {
  const path = join(LYRICS_SYNC_DIR, `${trackSlug}.json`)
  if (!existsSync(path)) {
    throw new Error(`Lyrics sync not found: ${path}\nAvailable: ${readdirSyncSafe(LYRICS_SYNC_DIR)}`)
  }
  return JSON.parse(readFileSync(path, 'utf-8'))
}

function readdirSyncSafe(dir: string): string {
  try {
    const { readdirSync } = require('fs')
    return readdirSync(dir).join(', ')
  } catch {
    return '(unreadable)'
  }
}

function getCharacterImageUrl(characterSlug: string): string {
  return `${NPGX_SITE}/npgx-images/characters/${characterSlug}-1.jpg`
}

function getTrackAudioUrl(audioPath: string): string {
  return `${NPGX_SITE}${audioPath}`
}

// ── Shot Planning ────────────────────────────────────────────────────────────

/**
 * Break a track into shots based on lyrics segments.
 * Vocal segments get close-up singing prompts.
 * Gaps get cinematic cutaway prompts.
 */
function planShots(lyrics: LyricsSync, characterSlug: string): Shot[] {
  const shots: Shot[] = []
  const name = characterSlug
    .split('-')
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(' ')
  let idx = 0

  const segments = [...lyrics.segments].sort((a, b) => a.start - b.start)
  let cursor = 0

  for (const seg of segments) {
    // Fill instrumental gap before this segment
    if (seg.start > cursor + 2) {
      let pos = cursor
      while (pos < seg.start - 1) {
        const dur = Math.min(10, Math.max(2, Math.round(seg.start - pos)))
        shots.push({
          index: idx++,
          start: pos,
          end: pos + dur,
          duration: dur,
          type: 'instrumental',
          prompt: `${name}, anime style, cinematic wide shot, moody neon-lit cityscape, dramatic atmosphere, looking into the distance, high quality`,
        })
        pos += dur
      }
    }

    // Vocal segment — clamp to 2-10s
    const dur = Math.min(10, Math.max(2, Math.round(seg.end - seg.start)))
    shots.push({
      index: idx++,
      start: seg.start,
      end: seg.start + dur,
      duration: dur,
      type: 'vocal',
      lyrics: seg.text,
      prompt: `${name}, anime style, medium close-up, singing with emotion, facing camera, dynamic lighting, expressive performance, high quality`,
    })

    cursor = seg.end
  }

  // Trailing instrumental
  if (cursor < lyrics.duration - 2) {
    let pos = cursor
    while (pos < lyrics.duration - 1) {
      const dur = Math.min(10, Math.max(2, Math.round(lyrics.duration - pos)))
      shots.push({
        index: idx++,
        start: pos,
        end: pos + dur,
        duration: dur,
        type: 'instrumental',
        prompt: `${name}, anime style, cinematic wide shot, walking away, dramatic sky, neon cityscape, high quality`,
      })
      pos += dur
    }
  }

  return shots
}

// ── Clip Generation (Runway) ─────────────────────────────────────────────────

async function generateClip(
  shot: Shot,
  characterImageUrl: string,
  model: RunwayModel,
): Promise<{ shot: Shot; videoUrl: string; cost: number }> {
  console.log(
    `[pipeline] 🎬 Clip ${shot.index} (${shot.type}, ${shot.duration}s)` +
    (shot.lyrics ? `: "${shot.lyrics.slice(0, 50)}"` : ''),
  )

  const result = await startRunwayVideo({
    model,
    promptImage: characterImageUrl,
    promptText: shot.prompt,
    duration: Math.min(10, Math.max(2, shot.duration)) as any,
    ratio: '1280:720',
    watermark: '',
  })

  const videoUrl = await waitForRunwayVideo(result.taskId, { maxWaitMs: 10 * 60 * 1000 })
  const cost = runwayCost(model, shot.duration)

  console.log(`[pipeline] ✓ Clip ${shot.index} done ($${cost.toFixed(3)})`)
  return { shot, videoUrl, cost }
}

/**
 * Generate clips with concurrency limit.
 * Returns clips sorted by shot index (timeline order).
 */
async function generateClipsParallel(
  shots: Shot[],
  characterImageUrl: string,
  model: RunwayModel,
  concurrency: number,
): Promise<Array<{ shot: Shot; videoUrl: string; cost: number }>> {
  const results: Array<{ shot: Shot; videoUrl: string; cost: number }> = []
  const queue = [...shots]

  async function worker() {
    while (queue.length > 0) {
      const shot = queue.shift()!
      try {
        const result = await generateClip(shot, characterImageUrl, model)
        results.push(result)
      } catch (err) {
        console.error(`[pipeline] ✗ Clip ${shot.index} failed: ${err}`)
        // Don't re-queue — skip failed clips
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, shots.length) },
    () => worker(),
  )
  await Promise.all(workers)

  return results.sort((a, b) => a.shot.index - b.shot.index)
}

// ── File Upload (for Sync Labs URL requirement) ──────────────────────────────

/**
 * Upload a local file to tmpfiles.org to get a public URL.
 * Files expire after 1 hour — enough for the pipeline to complete.
 */
async function uploadToTmpHost(filePath: string): Promise<string> {
  console.log(`[pipeline] Uploading ${filePath} to tmp host...`)

  const { stdout } = await execFile('curl', [
    '-s',
    '-F', `file=@${filePath}`,
    'https://tmpfiles.org/api/v1/upload',
  ])

  const result = JSON.parse(stdout)
  // tmpfiles.org returns { data: { url: "https://tmpfiles.org/123/video.mp4" } }
  // Direct download URL: replace tmpfiles.org/ with tmpfiles.org/dl/
  const pageUrl = result.data?.url
  if (!pageUrl) {
    throw new Error(`Upload failed: ${stdout}`)
  }

  const downloadUrl = pageUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
  console.log(`[pipeline] Uploaded: ${downloadUrl}`)
  return downloadUrl
}

// ── Download ─────────────────────────────────────────────────────────────────

async function downloadFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(destPath, buf)
}

// ── FFmpeg Helpers ────────────────────────────────────────────────────────────

async function ffmpeg(...args: string[]): Promise<string> {
  try {
    const { stdout, stderr } = await execFile('ffmpeg', args)
    return stdout || stderr
  } catch (err: any) {
    throw new Error(`FFmpeg failed: ${err.stderr || err.message}`)
  }
}

async function concatClips(clipPaths: string[], outputPath: string): Promise<void> {
  const listFile = outputPath.replace('.mp4', '-list.txt')
  const content = clipPaths.map(p => `file '${p}'`).join('\n')
  await writeFile(listFile, content)

  await ffmpeg(
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listFile,
    '-c', 'copy',
    '-an',
    outputPath,
  )
}

async function mixAudio(
  videoPath: string,
  audioPath: string,
  outputPath: string,
  maxDuration: number,
): Promise<void> {
  await ffmpeg(
    '-y',
    '-i', videoPath,
    '-i', audioPath,
    '-map', '0:v',
    '-map', '1:a',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    '-t', String(Math.ceil(maxDuration)),
    outputPath,
  )
}

// ── Main Pipeline ────────────────────────────────────────────────────────────

export async function runPremiumPipeline(config: PipelineConfig): Promise<PipelineResult> {
  const startTime = Date.now()
  let totalRunwayCost = 0
  let totalSyncCost = 0
  let stemCost = 0

  const workDir = join(config.outputDir, config.trackSlug)
  mkdirSync(join(workDir, 'clips'), { recursive: true })

  console.log(``)
  console.log(`[pipeline] ═══════════════════════════════════════════════════`)
  console.log(`[pipeline]  PREMIUM MUSIC VIDEO PIPELINE`)
  console.log(`[pipeline]  Track: ${config.trackSlug}`)
  console.log(`[pipeline]  Character: ${config.characterSlug}`)
  console.log(`[pipeline]  Video: Runway ${config.runwayModel}`)
  console.log(`[pipeline]  Lip sync: Sync Labs ${config.syncModel}`)
  console.log(`[pipeline]  Concurrency: ${config.concurrency}`)
  console.log(`[pipeline] ═══════════════════════════════════════════════════`)
  console.log(``)

  // ── Step 1: Load track metadata ──────────────────────────────────────────

  console.log(`[pipeline] Step 1/8: Loading track metadata...`)
  const lyrics = loadLyricsSync(config.trackSlug)
  const audioUrl = getTrackAudioUrl(lyrics.audioUrl)
  const characterImageUrl = getCharacterImageUrl(config.characterSlug)

  console.log(`[pipeline]   Track: "${lyrics.slug}" from "${lyrics.album}"`)
  console.log(`[pipeline]   Duration: ${lyrics.duration}s, ${lyrics.segments.length} lyric segments`)
  console.log(`[pipeline]   Audio: ${audioUrl}`)
  console.log(`[pipeline]   Character image: ${characterImageUrl}`)

  // ── Step 2: Separate stems ───────────────────────────────────────────────

  let vocalStemUrl: string

  if (config.vocalStemUrl) {
    console.log(`\n[pipeline] Step 2/8: Using provided vocal stem URL`)
    vocalStemUrl = config.vocalStemUrl
  } else {
    console.log(`\n[pipeline] Step 2/8: Separating stems via Demucs...`)
    const stems = await separateStems(audioUrl)
    vocalStemUrl = stems.vocals
    stemCost = 0.05
    console.log(`[pipeline]   Vocal stem: ${vocalStemUrl}`)

    if (!vocalStemUrl) {
      throw new Error('Demucs returned no vocal stem URL')
    }
  }

  // ── Step 3: Plan shots ───────────────────────────────────────────────────

  console.log(`\n[pipeline] Step 3/8: Planning shots...`)
  const shots = planShots(lyrics, config.characterSlug)
  const vocalShots = shots.filter(s => s.type === 'vocal')
  const instrumentalShots = shots.filter(s => s.type === 'instrumental')
  const totalClipDuration = shots.reduce((sum, s) => sum + s.duration, 0)
  const vocalDuration = vocalShots.reduce((sum, s) => sum + s.duration, 0)

  console.log(`[pipeline]   ${shots.length} shots planned:`)
  console.log(`[pipeline]     ${vocalShots.length} vocal (${vocalDuration}s)`)
  console.log(`[pipeline]     ${instrumentalShots.length} instrumental (${totalClipDuration - vocalDuration}s)`)

  // Cost estimate
  const estRunway = shots.reduce((s, shot) => s + runwayCost(config.runwayModel, shot.duration), 0)
  const estSync = config.skipLipSync ? 0 : lipSyncCost(config.syncModel, totalClipDuration)
  console.log(`[pipeline]   Estimated cost: Runway $${estRunway.toFixed(2)} + Sync $${estSync.toFixed(2)} + Stems $${stemCost.toFixed(2)} = $${(estRunway + estSync + stemCost).toFixed(2)}`)

  // ── Step 4: Generate video clips via Runway ──────────────────────────────

  console.log(`\n[pipeline] Step 4/8: Generating ${shots.length} clips via Runway ${config.runwayModel}...`)
  const clips = await generateClipsParallel(
    shots,
    characterImageUrl,
    config.runwayModel,
    config.concurrency,
  )
  totalRunwayCost = clips.reduce((sum, c) => sum + c.cost, 0)
  console.log(`[pipeline]   ${clips.length}/${shots.length} clips generated. Cost: $${totalRunwayCost.toFixed(3)}`)

  if (clips.length === 0) {
    throw new Error('No clips were generated successfully')
  }

  // ── Step 5: Download clips ───────────────────────────────────────────────

  console.log(`\n[pipeline] Step 5/8: Downloading ${clips.length} clips...`)
  const clipPaths: string[] = []

  for (const clip of clips) {
    const clipPath = join(workDir, 'clips', `clip-${String(clip.shot.index).padStart(3, '0')}.mp4`)
    await downloadFile(clip.videoUrl, clipPath)
    clipPaths.push(clipPath)
  }
  console.log(`[pipeline]   All clips downloaded to ${join(workDir, 'clips')}`)

  // ── Step 6: Concatenate clips ────────────────────────────────────────────

  console.log(`\n[pipeline] Step 6/8: Concatenating clips with FFmpeg...`)
  const rawVideoPath = join(workDir, 'raw-concat.mp4')
  await concatClips(clipPaths, rawVideoPath)
  console.log(`[pipeline]   Concatenated: ${rawVideoPath}`)

  // ── Step 7: Lip sync ─────────────────────────────────────────────────────

  let lipsyncedVideoPath: string

  if (config.skipLipSync) {
    console.log(`\n[pipeline] Step 7/8: Lip sync SKIPPED`)
    lipsyncedVideoPath = rawVideoPath
  } else {
    console.log(`\n[pipeline] Step 7/8: Lip syncing full video via Sync Labs ${config.syncModel}...`)

    // Upload concatenated video to get a public URL for Sync Labs
    const videoPublicUrl = await uploadToTmpHost(rawVideoPath)

    const syncResult = await startLipSync({
      videoUrl: videoPublicUrl,
      audioUrl: vocalStemUrl,
      model: config.syncModel,
      syncMode: 'cut_off',
    })

    const lipsyncedUrl = await waitForLipSync(syncResult.generationId, {
      maxWaitMs: 15 * 60 * 1000, // 15 min for longer videos
      intervalMs: 10000,
    })

    totalSyncCost = lipSyncCost(config.syncModel, totalClipDuration)

    lipsyncedVideoPath = join(workDir, 'lipsynced.mp4')
    await downloadFile(lipsyncedUrl, lipsyncedVideoPath)
    console.log(`[pipeline]   Lip sync complete. Cost: $${totalSyncCost.toFixed(3)}`)
  }

  // ── Step 8: Final assembly ───────────────────────────────────────────────

  console.log(`\n[pipeline] Step 8/8: Final assembly — mixing original audio...`)

  // Download original track audio
  const audioPath = join(workDir, 'original-audio.mp3')
  await downloadFile(audioUrl, audioPath)

  const outputPath = join(workDir, `${config.trackSlug}-${config.characterSlug}-premium.mp4`)
  await mixAudio(lipsyncedVideoPath, audioPath, outputPath, lyrics.duration)

  // ── Summary ──────────────────────────────────────────────────────────────

  const totalCost = totalRunwayCost + totalSyncCost + stemCost
  const elapsed = Math.round((Date.now() - startTime) / 1000)
  const elapsedMin = Math.floor(elapsed / 60)
  const elapsedSec = elapsed % 60

  console.log(``)
  console.log(`[pipeline] ═══════════════════════════════════════════════════`)
  console.log(`[pipeline]  COMPLETE`)
  console.log(`[pipeline]`)
  console.log(`[pipeline]  Output: ${outputPath}`)
  console.log(`[pipeline]  Video:  ${lyrics.duration}s (${clips.length} clips)`)
  console.log(`[pipeline]  Time:   ${elapsedMin}m ${elapsedSec}s`)
  console.log(`[pipeline]`)
  console.log(`[pipeline]  Cost breakdown:`)
  console.log(`[pipeline]    Runway (${config.runwayModel}):      $${totalRunwayCost.toFixed(3)}`)
  console.log(`[pipeline]    Sync Labs (${config.syncModel}): $${totalSyncCost.toFixed(3)}`)
  console.log(`[pipeline]    Demucs stems:               $${stemCost.toFixed(3)}`)
  console.log(`[pipeline]    ─────────────────────────────────`)
  console.log(`[pipeline]    TOTAL:                      $${totalCost.toFixed(3)}`)
  console.log(`[pipeline] ═══════════════════════════════════════════════════`)
  console.log(``)

  return {
    outputPath,
    totalCost,
    runwayCost: totalRunwayCost,
    syncLabsCost: totalSyncCost,
    stemCost,
    clipCount: clips.length,
    duration: lyrics.duration,
    shots,
  }
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const isMain = typeof require !== 'undefined' && require.main === module

if (isMain) {
  const args = process.argv.slice(2)

  function getArg(name: string, fallback?: string): string {
    const idx = args.indexOf(`--${name}`)
    if (idx >= 0 && idx + 1 < args.length) return args[idx + 1]
    if (fallback !== undefined) return fallback
    console.error(`Missing required argument: --${name}`)
    console.error(`\nUsage: npx tsx src/lib/ai/premium-video-pipeline.ts \\`)
    console.error(`  --track <slug> --character <slug> [--runway-model gen4_turbo] [--skip-lip-sync]`)
    process.exit(1)
    return '' // unreachable
  }

  const hasFlag = (name: string) => args.includes(`--${name}`)

  const config: PipelineConfig = {
    trackSlug: getArg('track'),
    characterSlug: getArg('character'),
    runwayModel: getArg('runway-model', 'gen4_turbo') as RunwayModel,
    syncModel: getArg('sync-model', 'lipsync-2-pro') as SyncLabsModel,
    concurrency: parseInt(getArg('concurrency', '2')),
    outputDir: getArg('output', OUTPUT_DIR),
    vocalStemUrl: args.includes('--vocal-stem') ? getArg('vocal-stem') : undefined,
    skipLipSync: hasFlag('skip-lip-sync'),
  }

  runPremiumPipeline(config)
    .then(result => {
      console.log(JSON.stringify(result, null, 2))
      process.exit(0)
    })
    .catch(err => {
      console.error(`[pipeline] FATAL: ${err.message || err}`)
      process.exit(1)
    })
}
