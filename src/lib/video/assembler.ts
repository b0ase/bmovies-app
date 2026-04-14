/**
 * Video Assembler — FFmpeg-based video assembly for NPGX productions
 *
 * Takes generated video clips + audio track and assembles them into
 * a final video with transitions, text overlays, and music.
 *
 * Runs server-side only (uses child_process).
 */

import { execSync, exec } from 'child_process'
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export interface AssemblyClip {
  url: string           // Video URL or local path
  duration?: number     // Override duration (seconds)
  label?: string        // Text overlay
}

export interface AssemblyConfig {
  clips: AssemblyClip[]
  audio?: string                // Background music URL or path
  audioVolume?: number          // 0-1 (default 0.3)
  transition?: 'fade' | 'cut'  // Transition between clips (default: fade)
  transitionDuration?: number   // Seconds (default: 0.5)
  resolution?: '720p' | '1080p' // Output resolution
  orientation?: 'portrait' | 'landscape'
  watermark?: string            // Text watermark (e.g. "NPGX")
  outputFormat?: 'mp4' | 'webm'
}

export interface AssemblyResult {
  outputPath: string
  duration: number
  size: number
  clips: number
  hasAudio: boolean
}

function checkFfmpeg(): boolean {
  try {
    execSync('which ffmpeg', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${url} (${res.status})`)
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
}

function getResolution(config: AssemblyConfig): string {
  const is1080 = config.resolution === '1080p'
  if (config.orientation === 'portrait') {
    return is1080 ? '1080:1920' : '720:1280'
  }
  return is1080 ? '1920:1080' : '1280:720'
}

/**
 * Assemble clips into a final video using FFmpeg.
 */
export async function assembleVideo(config: AssemblyConfig): Promise<AssemblyResult> {
  if (!checkFfmpeg()) {
    throw new Error('FFmpeg not found. Install via: brew install ffmpeg')
  }

  if (config.clips.length === 0) {
    throw new Error('No clips provided')
  }

  const workDir = join(tmpdir(), `npgx-assembly-${Date.now()}`)
  mkdirSync(workDir, { recursive: true })

  const resolution = getResolution(config)
  const transition = config.transition || 'fade'
  const transDur = config.transitionDuration ?? 0.5
  const audioVol = config.audioVolume ?? 0.3

  try {
    // Download clips
    const localClips: string[] = []
    for (let i = 0; i < config.clips.length; i++) {
      const clip = config.clips[i]
      const ext = clip.url.includes('.webm') ? '.webm' : '.mp4'
      const localPath = join(workDir, `clip_${i}${ext}`)

      if (clip.url.startsWith('http')) {
        await downloadFile(clip.url, localPath)
      } else if (existsSync(clip.url)) {
        // Symlink local files
        execSync(`ln -s "${clip.url}" "${localPath}"`)
      } else {
        throw new Error(`Clip not found: ${clip.url}`)
      }
      localClips.push(localPath)
    }

    // Download audio if provided
    let localAudio: string | null = null
    if (config.audio) {
      localAudio = join(workDir, 'audio.mp3')
      if (config.audio.startsWith('http')) {
        await downloadFile(config.audio, localAudio)
      } else if (existsSync(config.audio)) {
        execSync(`ln -s "${config.audio}" "${localAudio}"`)
      }
    }

    const outputPath = join(workDir, `output.${config.outputFormat || 'mp4'}`)

    if (localClips.length === 1 && !localAudio && !config.watermark) {
      // Simple case: single clip, just scale
      execSync(
        `ffmpeg -y -i "${localClips[0]}" -vf "scale=${resolution}:force_original_aspect_ratio=decrease,pad=${resolution}:(ow-iw)/2:(oh-ih)/2:black" -c:v libx264 -preset fast -crf 23 "${outputPath}"`,
        { stdio: 'pipe', timeout: 120000 }
      )
    } else if (transition === 'cut') {
      // Concat without transitions
      const listFile = join(workDir, 'concat.txt')
      // First normalize all clips to same resolution
      const normalizedClips: string[] = []
      for (let i = 0; i < localClips.length; i++) {
        const norm = join(workDir, `norm_${i}.mp4`)
        execSync(
          `ffmpeg -y -i "${localClips[i]}" -vf "scale=${resolution}:force_original_aspect_ratio=decrease,pad=${resolution}:(ow-iw)/2:(oh-ih)/2:black" -c:v libx264 -preset fast -crf 23 -an "${norm}"`,
          { stdio: 'pipe', timeout: 120000 }
        )
        normalizedClips.push(norm)
      }
      writeFileSync(listFile, normalizedClips.map(f => `file '${f}'`).join('\n'))

      let cmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}"`
      if (localAudio) {
        cmd += ` -i "${localAudio}" -c:v copy -c:a aac -map 0:v -map 1:a -shortest`
        if (audioVol < 1) cmd = cmd.replace('-c:a aac', `-af "volume=${audioVol}" -c:a aac`)
      } else {
        cmd += ` -c copy`
      }
      cmd += ` "${outputPath}"`
      execSync(cmd, { stdio: 'pipe', timeout: 300000 })
    } else {
      // Fade transitions using xfade filter
      // Normalize clips first
      const normalizedClips: string[] = []
      for (let i = 0; i < localClips.length; i++) {
        const norm = join(workDir, `norm_${i}.mp4`)
        execSync(
          `ffmpeg -y -i "${localClips[i]}" -vf "scale=${resolution}:force_original_aspect_ratio=decrease,pad=${resolution}:(ow-iw)/2:(oh-ih)/2:black" -c:v libx264 -preset fast -crf 23 -an "${norm}"`,
          { stdio: 'pipe', timeout: 120000 }
        )
        normalizedClips.push(norm)
      }

      if (normalizedClips.length === 2) {
        // Simple 2-clip xfade
        let cmd = `ffmpeg -y -i "${normalizedClips[0]}" -i "${normalizedClips[1]}"`
        if (localAudio) cmd += ` -i "${localAudio}"`
        cmd += ` -filter_complex "[0:v][1:v]xfade=transition=fade:duration=${transDur}:offset=auto[v]`
        if (config.watermark) {
          cmd += `;[v]drawtext=text='${config.watermark}':fontcolor=white@0.3:fontsize=24:x=w-tw-20:y=h-th-20[vout]" -map "[vout]"`
        } else {
          cmd += `" -map "[v]"`
        }
        if (localAudio) {
          cmd += ` -map 2:a -af "volume=${audioVol}" -c:a aac -shortest`
        }
        cmd += ` -c:v libx264 -preset fast -crf 23 "${outputPath}"`
        execSync(cmd, { stdio: 'pipe', timeout: 300000 })
      } else {
        // 3+ clips: chain xfade filters
        let inputs = normalizedClips.map((c, i) => `-i "${c}"`).join(' ')
        if (localAudio) inputs += ` -i "${localAudio}"`

        let filterChain = ''
        let lastOutput = '[0:v]'
        for (let i = 1; i < normalizedClips.length; i++) {
          const output = i < normalizedClips.length - 1 ? `[v${i}]` : '[vfinal]'
          filterChain += `${lastOutput}[${i}:v]xfade=transition=fade:duration=${transDur}:offset=auto${output};`
          lastOutput = output
        }

        if (config.watermark) {
          filterChain += `[vfinal]drawtext=text='${config.watermark}':fontcolor=white@0.3:fontsize=24:x=w-tw-20:y=h-th-20[vout]`
        } else {
          filterChain = filterChain.replace('[vfinal]', '[vout]').replace(/;$/, '')
        }

        let cmd = `ffmpeg -y ${inputs} -filter_complex "${filterChain}" -map "[vout]"`
        if (localAudio) {
          cmd += ` -map ${normalizedClips.length}:a -af "volume=${audioVol}" -c:a aac -shortest`
        }
        cmd += ` -c:v libx264 -preset fast -crf 23 "${outputPath}"`
        execSync(cmd, { stdio: 'pipe', timeout: 300000 })
      }
    }

    // Get output info
    const probeRaw = execSync(
      `ffprobe -v quiet -print_format json -show_format "${outputPath}"`,
      { encoding: 'utf-8' }
    )
    const probe = JSON.parse(probeRaw)

    return {
      outputPath,
      duration: parseFloat(probe.format?.duration || '0'),
      size: parseInt(probe.format?.size || '0'),
      clips: config.clips.length,
      hasAudio: !!localAudio,
    }
  } catch (err: any) {
    // Clean up on error
    try { execSync(`rm -rf "${workDir}"`) } catch {}
    throw new Error(`Assembly failed: ${err.stderr?.toString() || err.message}`)
  }
}

/**
 * Get video file info using ffprobe.
 */
export function probeVideo(path: string): {
  duration: number
  width: number
  height: number
  format: string
  size: number
} {
  const raw = execSync(
    `ffprobe -v quiet -print_format json -show_format -show_streams "${path}"`,
    { encoding: 'utf-8' }
  )
  const info = JSON.parse(raw)
  const videoStream = info.streams?.find((s: any) => s.codec_type === 'video')
  return {
    duration: parseFloat(info.format?.duration || '0'),
    width: parseInt(videoStream?.width || '0'),
    height: parseInt(videoStream?.height || '0'),
    format: info.format?.format_name || 'unknown',
    size: parseInt(info.format?.size || '0'),
  }
}
