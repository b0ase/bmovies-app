'use client'

import { useEffect, useRef, useState } from 'react'

interface SheetMusicProps {
  musicXml: string
  className?: string
}

export default function SheetMusic({ musicXml, className }: SheetMusicProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || !musicXml) return

    let osmd: any = null
    setLoading(true)
    setError(null)

    import('opensheetmusicdisplay').then(({ OpenSheetMusicDisplay }) => {
      if (!containerRef.current) return

      osmd = new OpenSheetMusicDisplay(containerRef.current, {
        autoResize: true,
        drawTitle: true,
        drawComposer: true,
        drawCredits: true,
        drawPartNames: true,
        backend: 'svg',
      })

      return osmd.load(musicXml)
    }).then(() => {
      if (osmd) {
        osmd.render()
        setLoading(false)
      }
    }).catch((err: Error) => {
      console.error('[SheetMusic] Render error:', err)
      setError(err.message)
      setLoading(false)
    })

    return () => {
      if (osmd) {
        try { osmd.clear() } catch {}
      }
    }
  }, [musicXml])

  return (
    <div className={className}>
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" />
          <span className="ml-3 text-gray-500 text-sm font-mono">Rendering sheet music...</span>
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-red-400 text-xs font-mono">Sheet music error: {error}</p>
        </div>
      )}
      <div
        ref={containerRef}
        className="bg-white rounded-lg overflow-auto"
        style={{ minHeight: loading ? 0 : 200 }}
      />
    </div>
  )
}
