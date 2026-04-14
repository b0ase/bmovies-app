'use client'

import { useState, useRef, useEffect } from 'react'
import { NPGX_ROSTER, ROSTER_BY_SLUG } from '@/lib/npgx-roster'
import { generateSVGOverlay, svgToDataUrl, compositeSVGOverImage, type OverlayStyle, type OverlayConfig } from '@/lib/svg-overlay'

const OVERLAY_STYLES: { id: OverlayStyle; label: string; desc: string }[] = [
  { id: 'masthead', label: 'Masthead', desc: 'NINJA PUNK GIRLS XXX header' },
  { id: 'character-title', label: 'Character Title', desc: 'Name, katakana, token badge' },
  { id: 'editorial-minimal', label: 'Editorial Minimal', desc: 'First name + token, clean' },
  { id: 'pull-quote', label: 'Pull Quote', desc: 'Large typographic quote' },
  { id: 'chapter-title', label: 'Chapter Title', desc: 'Story chapter heading' },
  { id: 'watermark-letter', label: 'Watermark Letter', desc: 'Giant faded letter' },
  { id: 'page-number', label: 'Page Number', desc: 'Corner page number' },
]

export default function TitleGenerator() {
  const [selectedSlug, setSelectedSlug] = useState(NPGX_ROSTER[0].slug)
  const [selectedStyle, setSelectedStyle] = useState<OverlayStyle>('character-title')
  const [testImageUrl, setTestImageUrl] = useState('')
  const [customImage, setCustomImage] = useState<string | null>(null)
  const [pullQuoteText, setPullQuoteText] = useState('The system is a game and I always win')
  const [chapterText, setChapterText] = useState('THE NEON MOTEL')
  const [pageNum, setPageNum] = useState(1)
  const [compositeResult, setCompositeResult] = useState<string | null>(null)
  const [compositeError, setCompositeError] = useState<string | null>(null)
  const [isCompositing, setIsCompositing] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const char = ROSTER_BY_SLUG[selectedSlug]

  // Build overlay config
  const overlayConfig: OverlayConfig = {
    style: selectedStyle,
    width: 1024,
    height: 1536,
    characterName: char?.name || 'Unknown',
    katakana: char?.katakana,
    token: char?.token || '$NPGX',
    tagline: char?.tagline,
    text: selectedStyle === 'pull-quote' ? pullQuoteText : selectedStyle === 'chapter-title' ? chapterText : undefined,
    pageNumber: pageNum,
  }

  const svgString = generateSVGOverlay(overlayConfig)
  const svgDataUrl = svgToDataUrl(svgString)

  // Get the base image URL
  const baseImageUrl = customImage || testImageUrl || char?.image || ''

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCustomImage(ev.target?.result as string)
      setTestImageUrl('')
    }
    reader.readAsDataURL(file)
  }

  // Generate test image from API
  const generateTestImage = async () => {
    if (!char) return
    setIsCompositing(true)
    setCompositeError(null)
    try {
      const res = await fetch('/api/generate-image-npgx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: selectedSlug,
          prompt: `${char.name}, young Japanese woman, tattooed punk, neon lighting, dark background, portrait orientation, photorealistic`,
          width: 1024,
          height: 1536,
        }),
      })
      const data = await res.json()
      if (data.imageUrl) {
        setTestImageUrl(data.imageUrl)
        setCustomImage(null)
      } else {
        setCompositeError('Failed to generate test image')
      }
    } catch (err) {
      setCompositeError('Image generation failed')
    } finally {
      setIsCompositing(false)
    }
  }

  // Composite: bake SVG onto image using canvas
  const bakeComposite = async () => {
    if (!baseImageUrl || !canvasRef.current) {
      setCompositeError('No image to composite')
      return
    }
    setIsCompositing(true)
    setCompositeError(null)
    setCompositeResult(null)

    try {
      canvasRef.current.width = 1024
      canvasRef.current.height = 1536

      await compositeSVGOverImage(canvasRef.current, baseImageUrl, svgString)

      const result = canvasRef.current.toDataURL('image/png')
      setCompositeResult(result)
      console.log(`[title-gen] Composite success — ${Math.round(result.length / 1024)}KB`)
    } catch (err) {
      console.error('[title-gen] Composite failed:', err)
      setCompositeError(`Composite failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsCompositing(false)
    }
  }

  // Download the composited image
  const downloadComposite = () => {
    const url = compositeResult
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `NPGX-${char?.name.replace(/\s+/g, '-')}-${selectedStyle}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Download raw SVG
  const downloadSVG = () => {
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `NPGX-${char?.name.replace(/\s+/g, '-')}-${selectedStyle}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen text-white">
      <canvas ref={canvasRef} width={1024} height={1536} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-wide font-[family-name:var(--font-brand)] bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent mb-3">
            TITLE GENERATOR
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Build, preview, and bake typography overlays onto images. Test every style.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Controls */}
          <div className="space-y-5">
            {/* Character */}
            <div className="bg-black/60 rounded-2xl p-5 border border-white/10">
              <h2 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Character</h2>
              <select
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="w-full p-3 bg-black border border-white/20 rounded-lg text-white focus:border-red-500 focus:outline-none"
              >
                {NPGX_ROSTER.map(c => (
                  <option key={c.slug} value={c.slug}>
                    {c.letter}. {c.name} — {c.token}
                  </option>
                ))}
              </select>
            </div>

            {/* Overlay Style */}
            <div className="bg-black/60 rounded-2xl p-5 border border-white/10">
              <h2 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Overlay Style</h2>
              <div className="grid grid-cols-2 gap-2">
                {OVERLAY_STYLES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStyle(s.id)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      selectedStyle === s.id
                        ? 'bg-red-600/20 border-red-500/40 text-white'
                        : 'bg-white/5 border-white/5 text-gray-500 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider">{s.label}</div>
                    <div className="text-[10px] mt-0.5 opacity-60">{s.desc}</div>
                  </button>
                ))}
              </div>

              {/* Style-specific inputs */}
              {selectedStyle === 'pull-quote' && (
                <textarea
                  value={pullQuoteText}
                  onChange={e => setPullQuoteText(e.target.value)}
                  placeholder="Quote text..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm resize-none mt-3"
                />
              )}
              {selectedStyle === 'chapter-title' && (
                <input
                  type="text"
                  value={chapterText}
                  onChange={e => setChapterText(e.target.value)}
                  placeholder="Chapter title..."
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm uppercase mt-3"
                />
              )}
              {selectedStyle === 'page-number' && (
                <input
                  type="number"
                  value={pageNum}
                  onChange={e => setPageNum(Number(e.target.value))}
                  min={1} max={99}
                  className="w-24 bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm mt-3"
                />
              )}
            </div>

            {/* Image Source */}
            <div className="bg-black/60 rounded-2xl p-5 border border-white/10">
              <h2 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Base Image</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-lg text-sm transition-all"
                >
                  Upload Image
                </button>
                <button
                  onClick={generateTestImage}
                  disabled={isCompositing}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg text-sm transition-all disabled:opacity-50"
                >
                  {isCompositing ? 'Generating...' : 'Generate Image'}
                </button>
              </div>
              {baseImageUrl && (
                <p className="text-[10px] text-gray-600 mt-2 truncate">
                  Source: {baseImageUrl.startsWith('data:') ? `base64 (${Math.round(baseImageUrl.length / 1024)}KB)` : baseImageUrl.slice(0, 60)}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="bg-black/60 rounded-2xl p-5 border border-white/10">
              <h2 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Actions</h2>
              <div className="flex gap-2">
                <button
                  onClick={bakeComposite}
                  disabled={!baseImageUrl || isCompositing}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg text-sm transition-all disabled:opacity-50 uppercase tracking-wider"
                >
                  Bake Composite
                </button>
                <button
                  onClick={downloadSVG}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-lg text-sm transition-all"
                >
                  SVG
                </button>
              </div>
              {compositeResult && (
                <button
                  onClick={downloadComposite}
                  className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg text-sm transition-all uppercase tracking-wider"
                >
                  Download Composited PNG
                </button>
              )}
              {compositeError && (
                <p className="text-red-400 text-sm mt-2">{compositeError}</p>
              )}
            </div>

            {/* Raw SVG source */}
            <div className="bg-black/60 rounded-2xl p-5 border border-white/10">
              <h2 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">SVG Source</h2>
              <pre className="text-[10px] text-gray-500 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto bg-black/40 p-3 rounded-lg">
                {svgString}
              </pre>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="space-y-5">
            {/* SVG overlay preview (no base image) */}
            <div className="bg-black/60 rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-3 border-b border-white/5">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  SVG Overlay Preview — {selectedStyle}
                </h2>
              </div>
              <div className="relative aspect-[2/3] bg-gray-900">
                {baseImageUrl ? (
                  <img src={baseImageUrl} alt="Base" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-700 text-sm">
                    No base image — upload or generate one
                  </div>
                )}
                {/* SVG overlay on top */}
                <img src={svgDataUrl} alt="" className="absolute inset-0 w-full h-full pointer-events-none" />
              </div>
            </div>

            {/* Composited result */}
            {compositeResult && (
              <div className="bg-black/60 rounded-2xl border border-white/10 overflow-hidden">
                <div className="p-3 border-b border-white/5">
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Baked Composite (what gets downloaded/animated)
                  </h2>
                </div>
                <div className="relative aspect-[2/3]">
                  <img src={compositeResult} alt="Composite" className="w-full h-full object-cover" />
                </div>
                <div className="p-3 text-[10px] text-gray-600">
                  {Math.round(compositeResult.length / 1024)}KB PNG — titles are permanently baked into pixels
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
