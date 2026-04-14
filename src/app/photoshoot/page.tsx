'use client'

import { useState, useEffect, useRef } from 'react'
import { NPGX_ROSTER, ROSTER_BY_SLUG } from '@/lib/npgx-roster'
import { SHOT_TEMPLATES, ENVIRONMENTS, ACTIONS, fillPrompt } from '@/lib/npgx-photoshoot-templates'
import MagazineCoverOverlay from '@/components/MagazineCoverOverlay'
import { renderPoster, exportPosterAsPNG } from '@/lib/poster-renderer'
import { savePhotoshoot } from '@/lib/photoshoot-store'
import type { Soul } from '@/lib/souls'
import type { PhotoshootShot } from '@/lib/photoshoot-store'

const HOUSE_STYLE = 'photorealistic photograph, saturated colors against dark shadows, red and pink neon lighting wash, vignette, smoke, heavy dark makeup black lipstick, face piercings, visible tattoos everywhere, extremely detailed skin texture with visible pores, film grain ISO 800, chromatic aberration, shallow depth of field bokeh, shot on Canon EOS R5 85mm f1.4, raw unprocessed photograph, 8k quality'

interface ShotState {
  status: 'pending' | 'generating' | 'done' | 'error'
  imageUrl?: string
  prompt?: string
}

export default function PhotoshootGenerator() {
  const [selectedCharacter, setSelectedCharacter] = useState('aria-voidstrike')
  const [soulData, setSoulData] = useState<Soul | null>(null)
  const [shots, setShots] = useState<ShotState[]>(
    SHOT_TEMPLATES.map(() => ({ status: 'pending' }))
  )
  const [isRunning, setIsRunning] = useState(false)
  const [currentShot, setCurrentShot] = useState(-1)
  const [error, setError] = useState('')
  const posterCanvasRef = useRef<HTMLCanvasElement>(null)
  const abortRef = useRef(false)

  const char = ROSTER_BY_SLUG[selectedCharacter]

  // Load soul data when character changes
  useEffect(() => {
    fetch(`/souls/${selectedCharacter}.json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setSoulData(data))
      .catch(() => setSoulData(null))
  }, [selectedCharacter])

  // Reset shots when character changes
  useEffect(() => {
    setShots(SHOT_TEMPLATES.map(() => ({ status: 'pending' })))
    setCurrentShot(-1)
    setIsRunning(false)
    abortRef.current = false
  }, [selectedCharacter])

  const generatePhotoshoot = async () => {
    if (!char) return
    setIsRunning(true)
    setError('')
    abortRef.current = false

    const soulPrompt = soulData?.generation?.promptPrefix
      || `${char.name}, young Japanese woman, slim, tattooed, edgy punk attitude, seductive`

    // Reset all shots
    setShots(SHOT_TEMPLATES.map(() => ({ status: 'pending' })))

    const completedShots: PhotoshootShot[] = []

    for (let i = 0; i < SHOT_TEMPLATES.length; i++) {
      if (abortRef.current) break

      setCurrentShot(i)
      setShots(prev => prev.map((s, idx) =>
        idx === i ? { ...s, status: 'generating' } : s
      ))

      const template = SHOT_TEMPLATES[i]

      // Build prompt using template
      const env = ENVIRONMENTS[Math.floor(Math.random() * ENVIRONMENTS.length)]
      const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)]

      const filled = fillPrompt(template.promptBase, {
        character: char.name,
        character_description: soulPrompt,
        environment: env.prompt,
        action_type: action.prompt,
      })

      const prompt = `${soulPrompt}, ${filled}, ${HOUSE_STYLE}`

      try {
        const response = await fetch('/api/generate-image-npgx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: selectedCharacter,
            additionalPrompt: prompt,
            width: template.settings.aspectRatio === '1:1' ? 1024 : 1024,
            height: template.settings.aspectRatio === '1:1' ? 1024
              : template.settings.aspectRatio === '4:3' ? 768
              : 1536,
          }),
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.imageUrl) {
            const shot: PhotoshootShot = {
              shotType: template.shotType,
              shotName: template.name,
              imageUrl: result.imageUrl,
              prompt,
            }
            completedShots.push(shot)
            setShots(prev => prev.map((s, idx) =>
              idx === i ? { status: 'done', imageUrl: result.imageUrl, prompt } : s
            ))
            continue
          }
        }
        setShots(prev => prev.map((s, idx) =>
          idx === i ? { ...s, status: 'error' } : s
        ))
      } catch {
        setShots(prev => prev.map((s, idx) =>
          idx === i ? { ...s, status: 'error' } : s
        ))
      }
    }

    // Save completed photoshoot to IndexedDB
    if (completedShots.length > 0) {
      try {
        await savePhotoshoot({
          id: `${selectedCharacter}-${Date.now()}`,
          slug: selectedCharacter,
          characterName: char.name,
          shots: completedShots,
          createdAt: Date.now(),
        })
      } catch {
        // Non-critical — don't block on storage
      }
    }

    setIsRunning(false)
    setCurrentShot(-1)
  }

  const downloadShotPoster = async (index: number) => {
    const shot = shots[index]
    if (!shot.imageUrl || !char || !posterCanvasRef.current) return
    const template = SHOT_TEMPLATES[index]

    try {
      await renderPoster(posterCanvasRef.current, {
        imageUrl: shot.imageUrl,
        characterName: char.name,
        katakana: char.katakana,
        token: char.token,
        tagline: char.tagline,
        variant: 'photoshoot',
        shotLabel: `${template.name.toUpperCase()} \u2022 ${String(index + 1).padStart(2, '0')}/${String(SHOT_TEMPLATES.length).padStart(2, '0')}`,
      })
      exportPosterAsPNG(
        posterCanvasRef.current,
        `NPGX-${char.name.replace(/\s+/g, '-')}-${template.id}.png`,
      )
    } catch (err) {
      console.error('Poster export failed:', err)
    }
  }

  const exportAll = async () => {
    const completedShots = shots
      .map((s, i) => ({ ...s, index: i }))
      .filter(s => s.status === 'done')

    for (const shot of completedShots) {
      await downloadShotPoster(shot.index)
      // Small delay between downloads to not overwhelm browser
      await new Promise(r => setTimeout(r, 200))
    }
  }

  const completedCount = shots.filter(s => s.status === 'done').length

  return (
    <div className="min-h-screen text-white">
      <canvas ref={posterCanvasRef} width={1024} height={1536} className="hidden" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-wide font-[family-name:var(--font-brand)] bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent mb-3">
            PHOTOSHOOT
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            5-shot editorial photoshoot — hero, fashion, environmental, intimate, action
          </p>
        </div>

        {/* Top Controls */}
        <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-2 uppercase tracking-wider">Character</label>
              <select
                value={selectedCharacter}
                onChange={(e) => setSelectedCharacter(e.target.value)}
                disabled={isRunning}
                className="w-full p-3 bg-black border border-white/20 rounded-lg text-white focus:border-red-500 focus:outline-none text-lg disabled:opacity-50"
              >
                {NPGX_ROSTER.map(c => (
                  <option key={c.slug} value={c.slug}>
                    {c.letter}. {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={isRunning ? () => { abortRef.current = true } : generatePhotoshoot}
              className={`font-black py-3 px-8 rounded-xl text-lg uppercase tracking-wider transition-all duration-300 whitespace-nowrap ${
                isRunning
                  ? 'bg-gray-700 hover:bg-red-900 text-gray-300 hover:text-red-300'
                  : 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 hover:scale-[1.02] active:scale-[0.98] text-white'
              }`}
            >
              {isRunning ? 'Stop' : 'Generate Photoshoot'}
            </button>
          </div>

          {/* Progress bar */}
          {isRunning && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Shot {currentShot + 1}/5: {SHOT_TEMPLATES[currentShot]?.name || '...'}</span>
                <span>{completedCount}/{SHOT_TEMPLATES.length}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${(completedCount / SHOT_TEMPLATES.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-center text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Shot Gallery */}
        <div className="space-y-6">
          {SHOT_TEMPLATES.map((template, i) => {
            const shot = shots[i]
            return (
              <div
                key={template.id}
                className={`bg-black/60 backdrop-blur-sm rounded-2xl border overflow-hidden transition-all duration-500 ${
                  shot.status === 'generating' ? 'border-red-500/50' : 'border-white/10'
                }`}
              >
                {/* Shot header */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-red-500 font-mono text-sm font-bold">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                      {template.name}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                      shot.status === 'done' ? 'bg-green-900/50 text-green-400'
                      : shot.status === 'generating' ? 'bg-red-900/50 text-red-400 animate-pulse'
                      : shot.status === 'error' ? 'bg-red-900/50 text-red-500'
                      : 'bg-white/5 text-gray-600'
                    }`}>
                      {shot.status === 'generating' ? 'Generating...' : shot.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 hidden sm:block max-w-xs text-right">
                    {template.description}
                  </p>
                </div>

                {/* Shot content */}
                {shot.status === 'done' && shot.imageUrl ? (
                  <div>
                    <div className="relative aspect-[2/3] max-h-[600px]">
                      <MagazineCoverOverlay
                        characterName={char?.name || ''}
                        katakana={char?.katakana}
                        token={char?.token || ''}
                        tagline={char?.tagline}
                        imageUrl={shot.imageUrl}
                        variant="photoshoot"
                        shotLabel={template.name.toUpperCase()}
                        shotNumber={`${String(i + 1).padStart(2, '0')}/${String(SHOT_TEMPLATES.length).padStart(2, '0')}`}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="p-3 flex gap-2">
                      <button
                        onClick={() => downloadShotPoster(i)}
                        className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm uppercase tracking-wider"
                      >
                        Download Poster
                      </button>
                    </div>
                  </div>
                ) : shot.status === 'generating' ? (
                  <div className="aspect-[2/3] max-h-[400px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="relative inline-block mb-4">
                        <div className="w-20 h-20 rounded-full border-4 border-red-500 animate-spin" style={{ borderTopColor: 'transparent' }}></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-black text-red-500">{String(i + 1).padStart(2, '0')}</span>
                        </div>
                      </div>
                      <p className="text-white font-bold text-lg">{template.name}</p>
                      <p className="text-gray-500 text-sm mt-1">{template.description}</p>
                    </div>
                  </div>
                ) : shot.status === 'error' ? (
                  <div className="py-8 text-center">
                    <p className="text-red-400 text-sm">Failed to generate — will retry on next run</p>
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-gray-700 text-sm">{template.description}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Export All */}
        {completedCount > 0 && !isRunning && (
          <div className="mt-8 text-center">
            <button
              onClick={exportAll}
              className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-black py-4 px-12 rounded-xl text-xl uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            >
              Export All ({completedCount} Posters)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
