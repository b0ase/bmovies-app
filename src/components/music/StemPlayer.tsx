'use client'

import { useState, useRef, useEffect } from 'react'

interface Stem {
  name: string
  url: string
  color: string
  midiUrl?: string
}

interface StemPlayerProps {
  stems: {
    vocals?: string
    drums?: string
    bass?: string
    other?: string
  }
  midi?: Record<string, string>
  onRequestSheetMusic?: (stemName: string, midiUrl: string) => void
}

const STEM_CONFIG: Record<string, { label: string; color: string }> = {
  vocals: { label: 'Vocals', color: 'bg-pink-500' },
  drums: { label: 'Drums', color: 'bg-orange-500' },
  bass: { label: 'Bass', color: 'bg-blue-500' },
  other: { label: 'Other', color: 'bg-purple-500' },
}

function WaveformMini({ audioUrl, color }: { audioUrl: string; color: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current || !audioUrl) return
    let ws: any = null
    import('wavesurfer.js').then((WS) => {
      if (!ref.current) return
      ws = WS.default.create({
        container: ref.current,
        waveColor: '#555',
        progressColor: color === 'bg-pink-500' ? '#ec4899' : color === 'bg-orange-500' ? '#f97316' : color === 'bg-blue-500' ? '#3b82f6' : '#a855f7',
        cursorColor: 'transparent',
        barWidth: 2,
        barGap: 1,
        barRadius: 1,
        height: 32,
        normalize: true,
        interact: false,
      })
      ws.load(audioUrl)
    })
    return () => { ws?.destroy() }
  }, [audioUrl, color])
  return <div ref={ref} className="w-full" />
}

export default function StemPlayer({ stems, midi, onRequestSheetMusic }: StemPlayerProps) {
  const [playing, setPlaying] = useState<Record<string, boolean>>({})
  const [muted, setMuted] = useState<Record<string, boolean>>({})
  const [volumes, setVolumes] = useState<Record<string, number>>({ vocals: 1, drums: 1, bass: 1, other: 1 })
  const audios = useRef<Record<string, HTMLAudioElement>>({})

  const stemList = Object.entries(stems).filter(([, url]) => url) as [string, string][]

  const togglePlay = (name: string, url: string) => {
    const audio = audios.current[name]
    if (audio) {
      if (playing[name]) { audio.pause() } else { audio.play() }
      setPlaying(p => ({ ...p, [name]: !p[name] }))
    } else {
      const a = new Audio(url)
      a.volume = volumes[name] ?? 1
      a.muted = muted[name] ?? false
      a.onended = () => setPlaying(p => ({ ...p, [name]: false }))
      audios.current[name] = a
      a.play()
      setPlaying(p => ({ ...p, [name]: true }))
    }
  }

  const toggleMute = (name: string) => {
    const audio = audios.current[name]
    if (audio) audio.muted = !audio.muted
    setMuted(m => ({ ...m, [name]: !m[name] }))
  }

  const setVolume = (name: string, vol: number) => {
    const audio = audios.current[name]
    if (audio) audio.volume = vol
    setVolumes(v => ({ ...v, [name]: vol }))
  }

  // Play all stems simultaneously
  const playAll = () => {
    stemList.forEach(([name, url]) => {
      if (!playing[name]) togglePlay(name, url)
    })
  }

  const stopAll = () => {
    Object.entries(audios.current).forEach(([name, audio]) => {
      audio.pause()
      audio.currentTime = 0
    })
    setPlaying({})
  }

  return (
    <div className="space-y-3">
      {/* Master controls */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={Object.values(playing).some(Boolean) ? stopAll : playAll}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider"
        >
          {Object.values(playing).some(Boolean) ? 'Stop All' : 'Play All'}
        </button>
        <span className="text-[10px] text-gray-600 font-mono">
          {stemList.length} stems separated
        </span>
      </div>

      {/* Individual stems */}
      {stemList.map(([name, url]) => {
        const config = STEM_CONFIG[name] || { label: name, color: 'bg-gray-500' }
        const hasMidi = midi?.[name]
        return (
          <div key={name} className="bg-white/[0.03] rounded-lg border border-white/10 p-3">
            <div className="flex items-center gap-3 mb-2">
              {/* Play/pause */}
              <button
                onClick={() => togglePlay(name, url)}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${playing[name] ? config.color : 'bg-white/10'}`}
              >
                <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  {playing[name] ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M8 5v14l11-7z" />}
                </svg>
              </button>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium">{config.label}</p>
                <div className="flex items-center gap-2">
                  {/* Volume */}
                  <input
                    type="range"
                    min="0" max="1" step="0.05"
                    value={muted[name] ? 0 : (volumes[name] ?? 1)}
                    onChange={e => setVolume(name, parseFloat(e.target.value))}
                    className="w-20 h-0.5 accent-red-500"
                  />
                  {/* Mute */}
                  <button
                    onClick={() => toggleMute(name)}
                    className={`text-[10px] font-mono ${muted[name] ? 'text-red-400' : 'text-gray-600'}`}
                  >
                    {muted[name] ? 'MUTED' : 'M'}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {hasMidi && onRequestSheetMusic && (
                  <button
                    onClick={() => onRequestSheetMusic(name, midi[name])}
                    className="text-[9px] font-mono text-red-400 hover:text-red-300 bg-red-500/10 px-2 py-1 rounded"
                  >
                    SHEET
                  </button>
                )}
                <a
                  href={url}
                  download={`${name}.mp3`}
                  className="text-[9px] font-mono text-gray-600 hover:text-white"
                >
                  DL
                </a>
                {hasMidi && (
                  <a
                    href={midi[name]}
                    download={`${name}.mid`}
                    className="text-[9px] font-mono text-gray-600 hover:text-white"
                  >
                    MIDI
                  </a>
                )}
              </div>
            </div>

            {/* Mini waveform */}
            <WaveformMini audioUrl={url} color={config.color} />
          </div>
        )
      })}
    </div>
  )
}
