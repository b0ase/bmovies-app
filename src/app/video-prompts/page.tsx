'use client'

import { useState } from 'react'
import { NPGX_ROSTER } from '@/lib/npgx-roster'
import Image from 'next/image'
import Link from 'next/link'

interface VideoPrompt {
  id: string
  title: string
  prompt: string
  style: string
  duration: string
  mood: string
  camera: string
  lighting: string
  effects: string
}

interface SoulData {
  identity: { name: string; token: string; tagline: string }
  generation: { promptPrefix: string; promptSuffix: string }
  style: { aesthetic: string }
}

const videoStyles = [
  { name: 'Cinematic Action', elements: 'slow motion, dramatic lighting, epic angles, intense choreography, action sequence' },
  { name: 'Cyberpunk Noir', elements: 'neon lighting, rain, reflections, dark shadows, futuristic cityscape, moody atmosphere' },
  { name: 'Anime Epic', elements: 'anime style, energy blasts, dramatic poses, vibrant colors, cel shading, dynamic motion' },
  { name: 'Film Noir', elements: 'black and white, harsh shadows, venetian blinds, smoke, dramatic contrast, moody' },
  { name: 'Music Video', elements: 'concert lighting, stage performance, crowd energy, pulsing neon, dynamic camera work' },
  { name: 'Urban Gritty', elements: 'gritty realism, urban decay, intense close-ups, documentary style, raw photography' },
]

const cameraMovements = [
  'dramatic tracking shot', 'slow motion close-up', 'epic wide angle', 'intimate handheld',
  'sweeping crane shot', 'dynamic dolly', 'cinematic drone shot', 'smooth pan',
]

const lightingStyles = [
  'dramatic backlighting', 'neon glow', 'firelight flicker', 'moonlight silver',
  'warm golden hour', 'cool blue night', 'pulsing strobe', 'shadow play',
]

const specialEffects = [
  'particle effects', 'energy trails', 'smoke and mist', 'lightning bolts',
  'fire explosions', 'shadow manipulation', 'holographic displays', 'sparks flying',
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export default function VideoPromptsPage() {
  const [selectedCharacter, setSelectedCharacter] = useState(NPGX_ROSTER[0])
  const [soul, setSoul] = useState<SoulData | null>(null)
  const [videoPrompts, setVideoPrompts] = useState<VideoPrompt[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [showRoster, setShowRoster] = useState(false)

  // Load soul data when character changes
  const selectCharacter = async (char: typeof NPGX_ROSTER[0]) => {
    setSelectedCharacter(char)
    setShowRoster(false)
    try {
      const res = await fetch(`/souls/${char.slug}.json`)
      if (res.ok) setSoul(await res.json())
      else setSoul(null)
    } catch {
      setSoul(null)
    }
  }

  const generatePrompts = () => {
    setIsGenerating(true)
    const charDesc = soul
      ? soul.generation.promptPrefix
      : `${selectedCharacter.name}, ${selectedCharacter.description}, ${selectedCharacter.category} aesthetic, ninja punk girl`

    const prompts: VideoPrompt[] = videoStyles.map((style) => {
      const camera = pickRandom(cameraMovements)
      const lighting = pickRandom(lightingStyles)
      const effects = pickRandom(specialEffects)
      const moods = ['intense', 'mysterious', 'epic', 'dark', 'energetic', 'atmospheric']
      const mood = pickRandom(moods)
      const durations = ['5 seconds', '10 seconds', '15 seconds']
      const duration = pickRandom(durations)

      const prompt = `${charDesc} ${style.elements}, ${camera}, ${lighting}, ${effects}, ${mood} atmosphere, cinematic video, high quality, professional cinematography`

      return {
        id: Math.random().toString(36).slice(2, 11),
        title: `${selectedCharacter.name} — ${style.name}`,
        prompt,
        style: style.name,
        duration,
        mood,
        camera,
        lighting,
        effects,
      }
    })

    setVideoPrompts(prompts)
    setIsGenerating(false)
  }

  const copyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-10 h-10 text-red-400 mx-auto mb-3">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M7 8h4M7 12h6M7 16h3" />
            <circle cx="17" cy="12" r="2" />
          </svg>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-wide font-[family-name:var(--font-brand)] bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent mb-4">
            VIDEO PROMPTS
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Generate cinematic video prompts from character soul data. Copy for external tools or send to the Video Generator.
          </p>
        </div>

        {/* Character Selector Bar */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                  <Image
                    src={selectedCharacter.image}
                    alt={selectedCharacter.name}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-bold text-white">{selectedCharacter.name}</p>
                  <p className="text-xs text-gray-500">{selectedCharacter.token} — {selectedCharacter.tagline}</p>
                </div>
              </div>
              <button
                onClick={() => setShowRoster(!showRoster)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold text-white transition-all"
              >
                {showRoster ? 'Close' : 'Change Character'}
              </button>
            </div>

            {/* Full roster modal/dropdown */}
            {showRoster && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-[400px] overflow-y-auto">
                  {NPGX_ROSTER.map((char) => (
                    <button
                      key={char.slug}
                      onClick={() => selectCharacter(char)}
                      className={`rounded-lg p-2 text-left transition-all ${
                        selectedCharacter.slug === char.slug
                          ? 'bg-red-600/20 border border-red-500/30'
                          : 'bg-white/5 border border-white/10 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="w-full aspect-square rounded overflow-hidden mb-1 bg-white/5">
                        {char.hasImages && (
                          <Image
                            src={char.image}
                            alt={char.name}
                            width={120}
                            height={120}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <p className="text-xs font-bold text-white truncate">{char.letter}. {char.name}</p>
                      <p className="text-[10px] text-gray-600 truncate">{char.token}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Generate Button */}
        <div className="text-center mb-8">
          <button
            onClick={generatePrompts}
            disabled={isGenerating}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white font-black py-3 px-8 rounded-xl text-lg transition-all uppercase tracking-wider"
          >
            {isGenerating ? 'Generating...' : 'Generate All Video Styles'}
          </button>
        </div>

        {/* Generated Prompts */}
        {videoPrompts.length > 0 && (
          <div className="max-w-4xl mx-auto space-y-4">
            {videoPrompts.map((vp) => (
              <div key={vp.id} className="bg-white/5 rounded-xl p-5 border border-white/10">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-white">{vp.title}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] px-2 py-0.5 bg-red-600/20 text-red-400 rounded font-bold">{vp.style}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-white/10 text-gray-400 rounded">{vp.duration}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-white/10 text-gray-400 rounded">{vp.mood}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-white/10 text-gray-400 rounded">{vp.camera}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-white/10 text-gray-400 rounded">{vp.lighting}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-white/10 text-gray-400 rounded">{vp.effects}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => copyPrompt(vp.id, vp.prompt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        copied === vp.id
                          ? 'bg-red-600 text-white'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      {copied === vp.id ? 'Copied' : 'Copy'}
                    </button>
                    <Link
                      href={`/video-gen`}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-all"
                    >
                      Generate
                    </Link>
                  </div>
                </div>
                <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                  <p className="text-xs text-gray-400 font-mono leading-relaxed">{vp.prompt}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {videoPrompts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-600">Select a character and click Generate to create video prompts.</p>
          </div>
        )}
      </div>
    </div>
  )
}
