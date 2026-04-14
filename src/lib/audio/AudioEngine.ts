'use client'

import { getTone, initializeTone } from './ToneWrapper'

export interface Track {
  id: string
  name: string
  volume: number
  muted: boolean
  solo: boolean
  instrument: any | null
  effects: any[]
  channel: any
}

export interface AudioEngineState {
  isPlaying: boolean
  isRecording: boolean
  bpm: number
  position: string
  tracks: Track[]
}

class AudioEngine {
  private static instance: AudioEngine
  private initialized = false
  private tracks: Map<string, Track> = new Map()
  private mainOut: any = null
  private masterCompressor: any = null
  private masterLimiter: any = null
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine()
    }
    return AudioEngine.instance
  }

  async initialize() {
    if (this.initialized) return
    try {
      const initialized = await initializeTone()
      if (!initialized) { this.initialized = true; return }
      const Tone = await getTone()
      if (!Tone) { this.initialized = true; return }

      this.masterCompressor = new Tone.Compressor(-20, 10)
      this.masterLimiter = new Tone.Limiter(-3)
      this.mainOut = Tone.Destination
      this.masterCompressor.connect(this.masterLimiter)
      this.masterLimiter.connect(this.mainOut)
      Tone.Transport.bpm.value = 120
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize audio:', error)
      this.initialized = true
    }
  }

  async play() {
    await this.initialize()
    const Tone = await getTone()
    if (Tone?.Transport) await Tone.Transport.start()
    return true
  }

  async pause() {
    const Tone = await getTone()
    if (Tone?.Transport) Tone.Transport.pause()
  }

  async stop() {
    const Tone = await getTone()
    if (Tone?.Transport) { Tone.Transport.stop(); Tone.Transport.position = 0 }
  }

  async startRecording() {
    await this.initialize()
    try {
      const Tone = await getTone()
      if (Tone?.context) {
        const dest = Tone.context.createMediaStreamDestination()
        this.mainOut.connect(dest)
        this.recordedChunks = []
        this.mediaRecorder = new MediaRecorder(dest.stream)
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) this.recordedChunks.push(event.data)
        }
        this.mediaRecorder.start()
      }
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
    this.play()
  }

  async stopRecording(): Promise<Blob | null> {
    this.stop()
    return new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.recordedChunks, { type: 'audio/wav' })
          this.recordedChunks = []
          resolve(blob)
        }
        this.mediaRecorder.stop()
      } else {
        resolve(null)
      }
    })
  }

  async createTrack(name: string, type: 'audio' | 'midi' | 'drum' = 'audio'): Promise<string> {
    const id = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    let channel = null
    let instrument = null
    const Tone = await getTone()

    if (Tone) {
      const gainNode = new Tone.Gain(1)
      const panNode = new Tone.Panner(0)
      gainNode.connect(panNode)
      channel = {
        gain: gainNode,
        panner: panNode,
        connect: (dest: any) => panNode.connect(dest),
        disconnect: () => { gainNode.disconnect(); panNode.disconnect() },
        dispose: () => { gainNode.dispose(); panNode.dispose() },
        set volume(v: number) { gainNode.gain.value = Tone.dbToGain(v) },
        get volume() { return Tone.gainToDb(gainNode.gain.value) },
        set pan(v: number) { panNode.pan.value = v },
        get pan() { return panNode.pan.value },
        set mute(v: boolean) { gainNode.mute = v },
        get mute() { return gainNode.mute },
      }

      if (type === 'midi') {
        instrument = new Tone.PolySynth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
        })
        instrument.connect(channel.gain)
      }

      if (this.masterCompressor) channel.connect(this.masterCompressor)
    }

    const track: Track = { id, name, volume: 0, muted: false, solo: false, instrument, effects: [], channel }
    this.tracks.set(id, track)
    return id
  }

  getTrack(id: string) { return this.tracks.get(id) }
  getAllTracks() { return Array.from(this.tracks.values()) }

  deleteTrack(id: string) {
    const track = this.tracks.get(id)
    if (track) {
      track.instrument?.dispose?.()
      track.channel?.dispose?.()
      track.effects.forEach(e => e?.dispose?.())
      this.tracks.delete(id)
    }
  }

  setTrackVolume(id: string, volume: number) {
    const t = this.tracks.get(id)
    if (t) { t.volume = volume; if (t.channel) t.channel.volume = volume }
  }

  setTrackMute(id: string, muted: boolean) {
    const t = this.tracks.get(id)
    if (t) { t.muted = muted; if (t.channel) t.channel.mute = muted }
  }

  setTrackSolo(id: string, solo: boolean) {
    const t = this.tracks.get(id)
    if (t) {
      t.solo = solo
      const hasSoloed = Array.from(this.tracks.values()).some(tr => tr.solo)
      this.tracks.forEach(tr => {
        if (tr.channel) tr.channel.mute = hasSoloed ? !tr.solo : tr.muted
      })
    }
  }

  async loadAudioToTrack(trackId: string, audioUrl: string) {
    const track = this.tracks.get(trackId)
    const Tone = await getTone()
    if (track && Tone) {
      const player = new Tone.Player(audioUrl)
      await player.load()
      if (track.channel) player.connect(track.channel.gain)
      track.instrument = player
    }
  }

  async playNote(trackId: string, note: string, duration: string = '8n', time?: number) {
    const track = this.tracks.get(trackId)
    const Tone = await getTone()
    if (track?.instrument && Tone) {
      const t = time ?? Tone.now()
      if (track.instrument.triggerAttackRelease) track.instrument.triggerAttackRelease(note, duration, t)
      else if (track.instrument.start) track.instrument.start(t)
    }
  }

  async addEffect(trackId: string, type: 'reverb' | 'delay' | 'distortion' | 'filter') {
    const track = this.tracks.get(trackId)
    const Tone = await getTone()
    if (!track || !Tone) return
    const effects: Record<string, () => any> = {
      reverb: () => new Tone.Reverb(2),
      delay: () => new Tone.Delay(0.25),
      distortion: () => new Tone.Distortion(0.4),
      filter: () => new Tone.Filter(350, 'lowpass'),
    }
    const effect = effects[type]?.()
    if (effect && track.channel && this.masterCompressor) {
      track.channel.panner.disconnect()
      track.channel.panner.connect(effect)
      effect.connect(this.masterCompressor)
      track.effects.push(effect)
    }
  }

  async setBPM(bpm: number) {
    const Tone = await getTone()
    if (Tone?.Transport) Tone.Transport.bpm.value = bpm
  }

  async getBPM() {
    const Tone = await getTone()
    return Tone?.Transport ? Tone.Transport.bpm.value : 120
  }

  async getPosition() {
    const Tone = await getTone()
    return Tone?.Transport ? Tone.Transport.position.toString() : '0:0:0'
  }

  async getState(): Promise<AudioEngineState> {
    const Tone = await getTone()
    return {
      isPlaying: Tone?.Transport ? Tone.Transport.state === 'started' : false,
      isRecording: this.mediaRecorder ? this.mediaRecorder.state === 'recording' : false,
      bpm: await this.getBPM(),
      position: await this.getPosition(),
      tracks: this.getAllTracks(),
    }
  }

  async dispose() {
    const Tone = await getTone()
    if (Tone) {
      Tone.Transport?.stop()
      Tone.Transport?.cancel()
      this.tracks.forEach(t => {
        t.instrument?.dispose?.()
        t.channel?.dispose?.()
        t.effects.forEach(e => e?.dispose?.())
      })
      this.masterCompressor?.dispose?.()
      this.masterLimiter?.dispose?.()
    }
    this.tracks.clear()
    this.initialized = false
  }
}

export default AudioEngine
