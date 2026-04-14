// Music Pipeline — Stem Separation, MIDI Transcription, Sheet Music
// Demucs (stem separation) → Basic Pitch (audio→MIDI) → music21 (MIDI→MusicXML)

import Replicate from 'replicate'

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

// ─── Types ───

export interface StemSeparationResult {
  vocals: string
  drums: string
  bass: string
  other: string
}

export interface TranscriptionResult {
  midiUrl: string
  stem: string
}

export interface PipelineResult {
  stems: StemSeparationResult
  midi: Record<string, string>     // stem name → MIDI URL
  musicXml?: Record<string, string> // stem name → MusicXML string
}

// ─── 1. Stem Separation (Demucs via Replicate) ───

export async function separateStems(audioUrl: string): Promise<StemSeparationResult> {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN not configured')
  }

  console.log('[MusicPipeline] Starting stem separation via Demucs...')

  const output = await replicate.run('cjwbw/demucs:25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953', {
    input: {
      audio: audioUrl,
      output_format: 'mp3',
    },
  }) as any

  // Demucs returns URLs for each stem
  const result: StemSeparationResult = {
    vocals: output?.vocals || '',
    drums: output?.drums || '',
    bass: output?.bass || '',
    other: output?.other || '',
  }

  console.log('[MusicPipeline] Stem separation complete:', Object.keys(result).filter(k => result[k as keyof StemSeparationResult]))

  return result
}

// ─── 2. Audio → MIDI (Basic Pitch via Replicate) ───

export async function transcribeToMidi(audioUrl: string, stem?: string): Promise<TranscriptionResult> {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN not configured')
  }

  console.log(`[MusicPipeline] Transcribing ${stem || 'audio'} to MIDI via Basic Pitch...`)

  const output = await replicate.run('rhelsing/basic-pitch:a7cf33cf63fca9c71f2235332af5a9fdfb7d23c459a0dc429daa203ff8e80c78', {
    input: {
      audio: audioUrl,
    },
  }) as any

  // Basic Pitch returns a MIDI file URL
  const midiUrl = typeof output === 'string' ? output : output?.midi || output?.[0] || ''

  console.log(`[MusicPipeline] MIDI transcription complete for ${stem || 'audio'}`)

  return { midiUrl, stem: stem || 'full' }
}

// ─── 3. MIDI → MusicXML (music21 on Hetzner) ───

const MUSIC21_API = process.env.MUSIC21_API_URL || 'https://api.b0ase.com/music21'

export async function convertToMusicXml(midiUrl: string, title?: string): Promise<string> {
  console.log(`[MusicPipeline] Converting MIDI to MusicXML via music21...`)

  const res = await fetch(`${MUSIC21_API}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ midi_url: midiUrl, title: title || 'Untitled' }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`music21 conversion failed (${res.status}): ${err}`)
  }

  const xml = await res.text()
  console.log(`[MusicPipeline] MusicXML conversion complete (${xml.length} chars)`)
  return xml
}

// ─── 4. Full Pipeline ───

export async function runFullPipeline(audioUrl: string, options?: {
  stemsToTranscribe?: ('vocals' | 'drums' | 'bass' | 'other')[]
  includeSheetMusic?: boolean
}): Promise<PipelineResult> {
  const stemsToTranscribe = options?.stemsToTranscribe || ['vocals', 'bass', 'other']

  // Step 1: Separate stems
  console.log('[MusicPipeline] === Starting Full Pipeline ===')
  const stems = await separateStems(audioUrl)

  // Step 2: Transcribe selected stems to MIDI
  const midi: Record<string, string> = {}
  for (const stemName of stemsToTranscribe) {
    const stemUrl = stems[stemName]
    if (!stemUrl) continue
    try {
      const result = await transcribeToMidi(stemUrl, stemName)
      midi[stemName] = result.midiUrl
    } catch (err) {
      console.warn(`[MusicPipeline] Failed to transcribe ${stemName}:`, err)
    }
  }

  // Step 3: Convert MIDI to MusicXML (if requested)
  let musicXml: Record<string, string> | undefined
  if (options?.includeSheetMusic) {
    musicXml = {}
    for (const [stemName, midiUrl] of Object.entries(midi)) {
      try {
        musicXml[stemName] = await convertToMusicXml(midiUrl, `${stemName} - Sheet Music`)
      } catch (err) {
        console.warn(`[MusicPipeline] Failed to convert ${stemName} to MusicXML:`, err)
      }
    }
  }

  console.log('[MusicPipeline] === Pipeline Complete ===', {
    stems: Object.keys(stems).length,
    midi: Object.keys(midi).length,
    musicXml: musicXml ? Object.keys(musicXml).length : 0,
  })

  return { stems, midi, musicXml }
}
