'use client'

import { useState, useEffect, useRef } from 'react'
import { NPGX_ROSTER, ROSTER_BY_SLUG } from '@/lib/npgx-roster'
import MagazineCoverOverlay from '@/components/MagazineCoverOverlay'
import { renderPoster, exportPosterAsPNG } from '@/lib/poster-renderer'
import type { Soul } from '@/lib/souls'

const HOUSE_STYLE = 'photorealistic photograph, saturated colors against dark shadows, red and pink neon lighting wash, vignette, smoke, confrontational eye contact, heavy dark makeup black lipstick dramatic false lashes, face piercings, visible tattoos everywhere, extremely detailed skin texture with visible pores, film grain ISO 800, chromatic aberration, shallow depth of field bokeh, shot on Canon EOS R5 85mm f1.4, raw unprocessed photograph, editorial fashion photography, 8k quality'

export default function CoverGenerator() {
  const [selectedCharacter, setSelectedCharacter] = useState('aria-voidstrike')
  const [issueNumber, setIssueNumber] = useState(1)
  const [coverLine1, setCoverLine1] = useState('EXCLUSIVE SHOOT')
  const [coverLine2, setCoverLine2] = useState('UNCENSORED')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [soulData, setSoulData] = useState<Soul | null>(null)
  const posterCanvasRef = useRef<HTMLCanvasElement>(null)

  const char = ROSTER_BY_SLUG[selectedCharacter]

  // Load soul data when character changes
  useEffect(() => {
    fetch(`/souls/${selectedCharacter}.json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setSoulData(data))
      .catch(() => setSoulData(null))
  }, [selectedCharacter])

  const generate = async () => {
    if (!char) return
    setIsGenerating(true)
    setError('')
    setGeneratedImage(null)

    const soulPrompt = soulData?.generation?.promptPrefix
      || `${char.name}, young Japanese woman, slim, tattooed, edgy punk attitude, seductive`

    const prompt = `${soulPrompt}, dramatic editorial magazine cover portrait, hero lighting, 3:4 aspect ratio, direct eye contact, confident powerful pose, fashion editorial quality, full face visible, upper body, ${HOUSE_STYLE}`

    try {
      const response = await fetch('/api/generate-image-npgx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: selectedCharacter,
          additionalPrompt: prompt,
          width: 1024,
          height: 1536,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.imageUrl) {
          setGeneratedImage(result.imageUrl)
          return
        }
      }
      setError('Generation failed — try again')
    } catch {
      setError('Connection error — try again')
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadPoster = async () => {
    if (!generatedImage || !char || !posterCanvasRef.current) return
    try {
      await renderPoster(posterCanvasRef.current, {
        imageUrl: generatedImage,
        characterName: char.name,
        katakana: char.katakana,
        token: char.token,
        tagline: char.tagline,
        issueNumber,
        coverLines: [coverLine1, coverLine2],
        variant: 'cover',
      })
      exportPosterAsPNG(
        posterCanvasRef.current,
        `NPGX-${char.name.replace(/\s+/g, '-')}-cover-${String(issueNumber).padStart(3, '0')}.png`,
      )
    } catch (err) {
      console.error('Poster export failed:', err)
    }
  }

  return (
    <div className="min-h-screen text-white">
      <canvas ref={posterCanvasRef} width={1024} height={1536} className="hidden" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-wide font-[family-name:var(--font-brand)] bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent mb-3">
            COVER GENERATOR
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Create magazine covers with custom issue numbers and cover lines
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Panel — Controls (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Character Picker */}
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">Character</h2>
              <select
                value={selectedCharacter}
                onChange={(e) => setSelectedCharacter(e.target.value)}
                className="w-full p-3 bg-black border border-white/20 rounded-lg text-white focus:border-red-500 focus:outline-none text-lg"
              >
                {NPGX_ROSTER.map(c => (
                  <option key={c.slug} value={c.slug}>
                    {c.letter}. {c.name}
                  </option>
                ))}
              </select>

              {char && (
                <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-2xl font-black text-white">{char.name}</h3>
                      <span className="text-red-400 font-mono text-sm">{char.token}</span>
                    </div>
                    <span className="text-4xl font-black text-red-500/30">{char.letter}</span>
                  </div>
                  <p className="text-sm text-gray-400 italic">&ldquo;{char.tagline}&rdquo;</p>
                </div>
              )}
            </div>

            {/* Issue Controls */}
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">Issue Details</h2>

              <label className="block text-sm text-gray-400 mb-1 uppercase tracking-wider">Issue Number</label>
              <input
                type="number"
                min={1}
                max={999}
                value={issueNumber}
                onChange={(e) => setIssueNumber(Math.max(1, Math.min(999, parseInt(e.target.value) || 1)))}
                className="w-full p-3 bg-black border border-white/20 rounded-lg text-white focus:border-red-500 focus:outline-none mb-4"
              />

              <label className="block text-sm text-gray-400 mb-1 uppercase tracking-wider">Cover Line 1 (left sidebar)</label>
              <input
                type="text"
                value={coverLine1}
                onChange={(e) => setCoverLine1(e.target.value.toUpperCase())}
                maxLength={30}
                className="w-full p-3 bg-black border border-white/20 rounded-lg text-white focus:border-red-500 focus:outline-none mb-4"
              />

              <label className="block text-sm text-gray-400 mb-1 uppercase tracking-wider">Cover Line 2 (right sidebar)</label>
              <input
                type="text"
                value={coverLine2}
                onChange={(e) => setCoverLine2(e.target.value.toUpperCase())}
                maxLength={30}
                className="w-full p-3 bg-black border border-white/20 rounded-lg text-white focus:border-red-500 focus:outline-none"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={generate}
              disabled={isGenerating}
              className={`w-full font-black py-5 px-8 rounded-xl text-xl uppercase tracking-wider transition-all duration-300 shadow-lg ${
                isGenerating
                  ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                  : 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 hover:scale-[1.02] active:scale-[0.98] text-white'
              }`}
            >
              {isGenerating ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white"></div>
                  Generating Cover...
                </div>
              ) : (
                <span>Generate Cover</span>
              )}
            </button>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-center text-sm text-red-300">
                {error}
              </div>
            )}
          </div>

          {/* Right Panel — Preview (3 cols) */}
          <div className="lg:col-span-3">
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
              {generatedImage ? (
                <div className="relative">
                  <div className="relative aspect-[2/3] bg-black">
                    <MagazineCoverOverlay
                      characterName={char?.name || ''}
                      katakana={char?.katakana}
                      token={char?.token || ''}
                      tagline={char?.tagline}
                      imageUrl={generatedImage}
                      variant="cover"
                      issueNumber={issueNumber}
                      className="w-full h-full"
                    />
                  </div>

                  <div className="p-4 flex gap-3">
                    <button
                      onClick={downloadPoster}
                      className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-lg transition-all text-sm uppercase tracking-wider"
                    >
                      Download Poster
                    </button>
                    <button
                      onClick={generate}
                      disabled={isGenerating}
                      className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-lg transition-all text-sm"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              ) : (
                <div className="aspect-[2/3] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 41px)'
                    }}></div>
                  </div>

                  {isGenerating ? (
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="relative mb-8">
                        <div className="w-32 h-32 rounded-full border-4 border-red-600/30 animate-ping absolute inset-0"></div>
                        <div className="w-32 h-32 rounded-full border-4 border-red-500 animate-spin" style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }}></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-4xl font-black font-[family-name:var(--font-brand)] text-red-500">{char?.letter}</span>
                        </div>
                      </div>
                      <h3 className="text-3xl font-black text-white uppercase tracking-wider mb-2 animate-pulse">
                        GENERATING COVER
                      </h3>
                      <p className="text-lg text-red-400 font-bold">{char?.name}</p>
                      <p className="text-sm text-gray-500 mt-1">Issue #{String(issueNumber).padStart(3, '0')}</p>
                    </div>
                  ) : (
                    <div className="relative z-10">
                      <div className="text-6xl font-black text-red-500/20 mb-4">COVER</div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
                        {char?.name || 'Select Character'}
                      </h3>
                      <p className="text-sm text-gray-600 max-w-xs mx-auto">
                        Set your issue number and cover lines, then generate.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
