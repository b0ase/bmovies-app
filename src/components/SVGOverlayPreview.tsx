'use client'

import { useState, useRef, useCallback } from 'react'
import { generateSVGOverlay, svgToDataUrl, compositeSVGOverImage, type OverlayStyle, type OverlayConfig } from '@/lib/svg-overlay'

interface SVGOverlayPreviewProps {
  imageUrl: string
  characterName: string
  katakana?: string
  token: string
  tagline?: string
  width?: number
  height?: number
  onExport?: (dataUrl: string) => void
}

const STYLES: { id: OverlayStyle; label: string }[] = [
  { id: 'masthead', label: 'Masthead' },
  { id: 'character-title', label: 'Character Title' },
  { id: 'editorial-minimal', label: 'Editorial' },
  { id: 'pull-quote', label: 'Pull Quote' },
  { id: 'chapter-title', label: 'Chapter' },
  { id: 'watermark-letter', label: 'Watermark' },
  { id: 'page-number', label: 'Page #' },
]

export default function SVGOverlayPreview({
  imageUrl,
  characterName,
  katakana,
  token,
  tagline,
  width = 1024,
  height = 1536,
  onExport,
}: SVGOverlayPreviewProps) {
  const [activeStyle, setActiveStyle] = useState<OverlayStyle>('character-title')
  const [pullQuoteText, setPullQuoteText] = useState('')
  const [chapterText, setChapterText] = useState('')
  const [pageNum, setPageNum] = useState(1)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [exporting, setExporting] = useState(false)

  const config: OverlayConfig = {
    style: activeStyle,
    width,
    height,
    characterName,
    katakana,
    token,
    tagline,
    text: activeStyle === 'pull-quote' ? pullQuoteText : activeStyle === 'chapter-title' ? chapterText : undefined,
    pageNumber: pageNum,
  }

  const svgString = generateSVGOverlay(config)
  const svgDataUrl = svgToDataUrl(svgString)

  const handleExport = useCallback(async () => {
    if (!canvasRef.current) return
    setExporting(true)
    try {
      canvasRef.current.width = width
      canvasRef.current.height = height
      await compositeSVGOverImage(canvasRef.current, imageUrl, svgString)
      const dataUrl = canvasRef.current.toDataURL('image/png')

      if (onExport) {
        onExport(dataUrl)
      } else {
        const link = document.createElement('a')
        link.download = `NPGX-${characterName.replace(/\s+/g, '-')}-${activeStyle}.png`
        link.href = dataUrl
        link.click()
      }
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }, [imageUrl, svgString, width, height, characterName, activeStyle, onExport])

  return (
    <div className="space-y-3">
      {/* Style selector */}
      <div className="flex flex-wrap gap-1.5">
        {STYLES.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveStyle(s.id)}
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded transition ${
              activeStyle === s.id
                ? 'bg-red-600 text-white'
                : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Extra inputs for text-based styles */}
      {activeStyle === 'pull-quote' && (
        <textarea
          value={pullQuoteText}
          onChange={e => setPullQuoteText(e.target.value)}
          placeholder="The system is a game and I always win"
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs resize-none"
        />
      )}
      {activeStyle === 'chapter-title' && (
        <input
          type="text"
          value={chapterText}
          onChange={e => setChapterText(e.target.value)}
          placeholder="THE NEON MOTEL"
          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs uppercase"
        />
      )}
      {activeStyle === 'page-number' && (
        <input
          type="number"
          value={pageNum}
          onChange={e => setPageNum(Number(e.target.value))}
          min={1} max={99}
          className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs"
        />
      )}

      {/* Preview */}
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-black">
        <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <img src={svgDataUrl} alt="" className="absolute inset-0 w-full h-full" />
      </div>

      {/* Export */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider py-2 rounded-lg transition"
      >
        {exporting ? 'Exporting...' : 'Export with Overlay'}
      </button>

      {/* Hidden canvas for export */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
