// VIDEO PRODUCER AGENT — sends shot briefs to video generation APIs and polls for completion
// Input: ctx.shotList (from Shot Director)
// Output: populates ctx.generatedVideos with completed video URLs

import { startGrokVideo, pollGrokVideo } from '@/lib/ai/grok-video'
import { startWanVideo, pollWanVideo, downloadWanVideo, getDefaultReferenceImage } from '@/lib/ai/wan-video'
import type { ProductionContext, GeneratedVideo, ProgressCallback } from '../types'

type VideoProvider = 'grok' | 'wan' | 'auto'

const POLL_INTERVAL_MS = 5_000
const MAX_POLL_ATTEMPTS = 60 // 5 minutes max per video

function getVideoProvider(): VideoProvider {
  const env = process.env.VIDEO_PROVIDER?.toLowerCase()
  if (env === 'wan' || env === 'grok' || env === 'auto') return env
  return 'wan'
}

async function submitShot(
  prompt: string,
  duration: number,
  provider: 'grok' | 'wan',
  onProgress?: ProgressCallback,
): Promise<{ requestId: string; provider: 'grok' | 'wan2.1' }> {
  if (provider === 'wan') {
    // Wan 2.2 is image-to-video — use character reference image
    const imageUrl = getDefaultReferenceImage()
    onProgress?.('video-producer', 'Submitting to Wan 2.2...')

    const result = await startWanVideo({
      prompt,
      image: imageUrl,
      duration,
      resolution: '720p',
    })
    return result
  }

  const result = await startGrokVideo({
    prompt,
    duration,
    aspectRatio: '9:16',
    resolution: '720p',
  })
  return result
}

async function pollShot(
  requestId: string,
  provider: 'grok' | 'wan2.1',
): Promise<{ status: 'generating' | 'done' | 'error' | 'expired'; videoUrl?: string | null; error?: string }> {
  if (provider === 'wan2.1') {
    const s = await pollWanVideo(requestId)
    if (s.status === 'done' && !s.videoUrl) {
      // Use download endpoint if no direct URL
      s.videoUrl = downloadWanVideo(requestId)
    }
    return s
  }

  const s = await pollGrokVideo(requestId)
  return { status: s.status === 'pending' ? 'generating' : s.status, videoUrl: s.videoUrl, error: s.error }
}

function isContentModerationError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return msg.includes('content moderation') || msg.includes('moderat')
  }
  return false
}

export async function runVideoProducer(ctx: ProductionContext, onProgress?: ProgressCallback) {
  if (ctx.shotList.length === 0) {
    ctx.errors.push('Video Producer: no shots to generate')
    return
  }

  const selectedProvider = getVideoProvider()
  const providerLabel = selectedProvider === 'auto' ? 'Grok (auto-fallback to Wan2.1)' : selectedProvider === 'wan' ? 'Wan2.1' : 'Grok'
  onProgress?.('video-producer', `Generating ${ctx.shotList.length} videos via ${providerLabel}...`)

  // Submit all shots in parallel
  const pendingJobs: { shot: typeof ctx.shotList[0]; video: GeneratedVideo }[] = []

  for (const shot of ctx.shotList) {
    onProgress?.('video-producer', `Submitting scene ${shot.sceneNumber} shot ${shot.shotNumber}...`)

    const clampedDuration = Math.min(Math.max(shot.duration, 3), 10)
    const primaryProvider: 'grok' | 'wan' = selectedProvider === 'wan' ? 'wan' : 'grok'

    try {
      let result: { requestId: string; provider: 'grok' | 'wan2.1' }

      if (selectedProvider === 'auto') {
        // Try Grok first, fall back to Wan on content moderation errors
        try {
          result = await submitShot(shot.videoPrompt, clampedDuration, 'grok', onProgress)
        } catch (grokErr) {
          if (isContentModerationError(grokErr)) {
            onProgress?.('video-producer', `Grok moderation block — falling back to Wan2.1 for scene ${shot.sceneNumber} shot ${shot.shotNumber}`)
            result = await submitShot(shot.videoPrompt, clampedDuration, 'wan', onProgress)
          } else {
            throw grokErr
          }
        }
      } else {
        result = await submitShot(shot.videoPrompt, clampedDuration, primaryProvider, onProgress)
      }

      const video: GeneratedVideo = {
        shotNumber: shot.shotNumber,
        sceneNumber: shot.sceneNumber,
        provider: result.provider,
        requestId: result.requestId,
        status: 'generating',
        cost: result.provider === 'wan2.1' ? 0.04 : shot.duration * 0.05,
        duration: shot.duration,
      }

      ctx.generatedVideos.push(video)
      ctx.videoCalls++
      ctx.totalCost += video.cost
      pendingJobs.push({ shot, video })

      onProgress?.('video-producer', `Queued: scene ${shot.sceneNumber} shot ${shot.shotNumber} → ${result.requestId} [${result.provider}]`)
    } catch (err) {
      const msg = `Failed to submit scene ${shot.sceneNumber} shot ${shot.shotNumber}: ${err instanceof Error ? err.message : err}`
      ctx.errors.push(msg)
      onProgress?.('video-producer', msg)

      ctx.generatedVideos.push({
        shotNumber: shot.shotNumber,
        sceneNumber: shot.sceneNumber,
        provider: primaryProvider === 'wan' ? 'wan2.1' : 'grok',
        requestId: '',
        status: 'error',
        error: msg,
        cost: 0,
        duration: shot.duration,
      })
    }
  }

  // Poll all pending jobs until complete
  if (pendingJobs.length === 0) {
    onProgress?.('video-producer', 'No videos to poll')
    return
  }

  onProgress?.('video-producer', `Polling ${pendingJobs.length} videos...`)

  let attempts = 0
  while (attempts < MAX_POLL_ATTEMPTS) {
    const stillPending = pendingJobs.filter(j => j.video.status === 'generating')
    if (stillPending.length === 0) break

    await sleep(POLL_INTERVAL_MS)
    attempts++

    for (const job of stillPending) {
      try {
        const status = await pollShot(job.video.requestId, job.video.provider)

        if (status.status === 'done' && status.videoUrl) {
          job.video.status = 'done'
          job.video.videoUrl = status.videoUrl
          onProgress?.('video-producer', `✓ Scene ${job.shot.sceneNumber} shot ${job.shot.shotNumber} complete [${job.video.provider}]`)
        } else if (status.status === 'expired' || status.status === 'error' || status.error) {
          // If auto mode and Grok got moderated, retry with Wan
          if (selectedProvider === 'auto' && job.video.provider === 'grok' && isContentModerationError(new Error(status.error || 'content moderation'))) {
            onProgress?.('video-producer', `Grok moderation on poll — retrying scene ${job.shot.sceneNumber} shot ${job.shot.shotNumber} with Wan2.1...`)
            try {
              const retry = await submitShot(job.shot.videoPrompt, Math.min(Math.max(job.shot.duration, 3), 10), 'wan', onProgress)
              job.video.provider = 'wan2.1'
              job.video.requestId = retry.requestId
              job.video.cost = 0
              continue
            } catch {
              // Wan also failed, mark as error
            }
          }
          job.video.status = 'error'
          job.video.error = status.error || 'Expired or moderated'
          ctx.errors.push(`Scene ${job.shot.sceneNumber} shot ${job.shot.shotNumber}: ${job.video.error}`)
          onProgress?.('video-producer', `✗ Scene ${job.shot.sceneNumber} shot ${job.shot.shotNumber}: ${job.video.error}`)
        }
        // else still pending, keep polling
      } catch (err) {
        // Don't mark as error on poll failure — might be transient
        console.warn(`Poll error for ${job.video.requestId}:`, err)
      }
    }

    const done = pendingJobs.filter(j => j.video.status === 'done').length
    const errored = pendingJobs.filter(j => j.video.status === 'error').length
    const remaining = pendingJobs.length - done - errored
    onProgress?.('video-producer', `Progress: ${done} done, ${errored} failed, ${remaining} pending`)
  }

  // Mark any still-pending as timed out
  for (const job of pendingJobs) {
    if (job.video.status === 'generating') {
      job.video.status = 'error'
      job.video.error = 'Timed out after 5 minutes'
      ctx.errors.push(`Scene ${job.shot.sceneNumber} shot ${job.shot.shotNumber}: timed out`)
    }
  }

  const successCount = ctx.generatedVideos.filter(v => v.status === 'done').length
  onProgress?.('video-producer', `Video production complete: ${successCount}/${ctx.generatedVideos.length} succeeded`)
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
