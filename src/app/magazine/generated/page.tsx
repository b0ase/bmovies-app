'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import type { MagazineIssue, MagazinePage } from '@/lib/npgx-magazines'
import MagazinePageRenderer from '@/components/magazine/MagazinePageRenderer'
import { getGeneratedIssue, listGeneratedIssues, deleteGeneratedIssue } from '@/lib/magazine-store'
import dynamic from 'next/dynamic'
import {
  FaArrowLeft,
  FaArrowRight,
  FaExpand,
  FaCompress,
  FaBookOpen,
  FaDownload,
  FaFilePdf,
  FaMagic,
  FaTrash,
  FaEye,
} from 'react-icons/fa'

const MagazineFlipReader = dynamic(() => import('@/components/mint/MagazineFlipReader'), { ssr: false })

export default function GeneratedMagazinePage() {
  const searchParams = useSearchParams()
  const issueId = searchParams.get('id')

  const [issue, setIssue] = useState<MagazineIssue | null>(null)
  const [allIssues, setAllIssues] = useState<MagazineIssue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        if (issueId) {
          const found = await getGeneratedIssue(issueId)
          if (found) setIssue(found)
        }
        const all = await listGeneratedIssues()
        setAllIssues(all)
      } catch (err) {
        console.error('Failed to load from IndexedDB:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [issueId])

  // If we have a specific issue to read, show the reader
  if (issue) {
    return <MagazineReader issue={issue} onBack={() => setIssue(null)} />
  }

  // Otherwise show the library
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/magazine" className="text-gray-500 hover:text-white transition p-1">
            <FaArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'var(--font-brand)' }}>
              Generated Library
            </h1>
            <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">
              {allIssues.length} magazine{allIssues.length !== 1 ? 's' : ''} saved locally
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : allIssues.length === 0 ? (
          <div className="text-center py-20">
            <FaMagic className="w-12 h-12 text-purple-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Generated Magazines</h2>
            <p className="text-gray-500 mb-6">Generate a magazine from the shop page — they'll appear here.</p>
            <Link href="/magazine" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-bold transition-all">
              Go to Magazine Shop
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {allIssues.map((iss) => (
              <div key={iss.id} className="group bg-gray-950 border border-white/10 rounded-xl overflow-hidden hover:border-purple-500/40 transition-all">
                <div className="relative aspect-[3/4] max-h-[300px]">
                  {iss.coverImage ? (
                    <img src={iss.coverImage} alt={iss.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-purple-950/30 flex items-center justify-center">
                      <FaMagic className="w-8 h-8 text-purple-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  <div className="absolute top-2 right-2">
                    <span className="bg-purple-600 text-white text-[8px] font-bold uppercase px-1.5 py-0.5 rounded">
                      Generated
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-black text-lg uppercase" style={{ fontFamily: 'var(--font-brand)' }}>
                      Issue #{iss.issue} — {iss.title}
                    </h3>
                    <p className="text-gray-400 text-[10px] uppercase tracking-widest mt-1">
                      {iss.date} &middot; {iss.pageCount} pages
                    </p>
                    <p className="text-gray-600 text-[10px] mt-0.5">
                      {iss.characters.map(c => c.split(' ')[0]).join(', ')}
                    </p>
                  </div>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <button
                    onClick={() => setIssue(iss)}
                    className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
                  >
                    <FaEye className="w-3 h-3" />
                    Read
                  </button>
                  <button
                    onClick={async () => {
                      await deleteGeneratedIssue(iss.id)
                      setAllIssues(prev => prev.filter(i => i.id !== iss.id))
                    }}
                    className="text-gray-600 hover:text-red-500 p-2 transition"
                    title="Delete"
                  >
                    <FaTrash className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MagazineReader({ issue, onBack }: { issue: MagazineIssue; onBack: () => void }) {
  const [currentPage, setCurrentPage] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showThumbnails, setShowThumbnails] = useState(false)
  const [viewMode, setViewMode] = useState<'flip' | 'slide'>('flip')

  const pages = issue.pages || []
  const page = pages[currentPage] as MagazinePage | undefined
  const totalPages = pages.length

  const goNext = useCallback(() => {
    if (currentPage < totalPages - 1) setCurrentPage(p => p + 1)
  }, [currentPage, totalPages])

  const goPrev = useCallback(() => {
    if (currentPage > 0) setCurrentPage(p => p - 1)
  }, [currentPage])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false)
        else if (showThumbnails) setShowThumbnails(false)
        else onBack()
      }
      if (e.key === 'f') setIsFullscreen(f => !f)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev, isFullscreen, showThumbnails, onBack])

  return (
    <div className={`bg-black min-h-screen ${isFullscreen ? 'fixed inset-0 z-[100]' : ''}`}>
      {/* Top bar */}
      <div className="bg-black/90 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-gray-500 hover:text-white transition p-1">
              <FaArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-white font-bold text-sm uppercase tracking-wider" style={{ fontFamily: 'var(--font-brand)' }}>
                  Issue #{issue.issue} — {issue.title}
                </h1>
                <span className="bg-purple-600 text-white text-[8px] font-bold uppercase px-1.5 py-0.5 rounded">
                  Generated
                </span>
              </div>
              <p className="text-gray-600 text-[10px] uppercase tracking-widest">
                {issue.date} &middot; Page {currentPage + 1} of {totalPages} &middot; {issue.characters.map(c => c.split(' ')[0]).join(', ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-white/5 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('flip')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition ${
                  viewMode === 'flip' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-white'
                }`}
              >
                Flip
              </button>
              <button
                onClick={() => setViewMode('slide')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition ${
                  viewMode === 'slide' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-white'
                }`}
              >
                Slide
              </button>
            </div>
            <button
              onClick={async () => {
                const { jsPDF } = await import('jspdf')
                const imagePages = issue.pages.filter(p => p.image && !p.image.startsWith('['))
                if (imagePages.length === 0) return alert('No images to download')

                // Magazine pages are portrait 3:4 ratio
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 280] })
                const pageW = 210
                const pageH = 280

                for (let i = 0; i < imagePages.length; i++) {
                  if (i > 0) pdf.addPage([210, 280])
                  const img = imagePages[i].image!
                  try {
                    pdf.addImage(img, 'JPEG', 0, 0, pageW, pageH)
                  } catch {
                    // If base64 fails, draw placeholder
                    pdf.setFillColor(10, 10, 10)
                    pdf.rect(0, 0, pageW, pageH, 'F')
                    pdf.setTextColor(100)
                    pdf.setFontSize(12)
                    pdf.text(`Page ${i + 1}`, pageW / 2, pageH / 2, { align: 'center' })
                  }
                }

                pdf.save(`NPGX-Issue-${issue.issue}-${issue.title.replace(/\s+/g, '-')}.pdf`)
              }}
              className="text-gray-500 hover:text-white p-2 transition"
              title="Download as PDF"
            >
              <FaFilePdf className="w-4 h-4 text-red-400" />
            </button>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(issue, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `npgx-${issue.id}.json`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="text-gray-500 hover:text-white p-2 transition"
              title="Download issue JSON"
            >
              <FaDownload className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className="text-gray-500 hover:text-white p-2 transition"
              title="Page thumbnails"
            >
              <FaBookOpen className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-gray-500 hover:text-white p-2 transition"
            >
              {isFullscreen ? <FaCompress className="w-4 h-4" /> : <FaExpand className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Thumbnail strip */}
      <AnimatePresence>
        {showThumbnails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gray-950 border-b border-white/5 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {pages.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`flex-shrink-0 relative rounded overflow-hidden border-2 transition-all ${
                      currentPage === i
                        ? 'border-purple-500 shadow-lg shadow-purple-950/50'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={`Page ${i + 1}`}
                        className="object-cover w-[60px] h-[80px]"
                      />
                    ) : (
                      <div className="w-[60px] h-[80px] bg-gray-900 flex items-center justify-center">
                        <span className="text-gray-600 text-[8px] font-bold uppercase">{p.type}</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-[7px] text-gray-500 text-center py-0.5">
                      {i + 1}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main reader */}
      {viewMode === 'flip' ? (
        <div style={{ height: isFullscreen ? 'calc(100vh - 52px)' : 'calc(100vh - 120px)' }}>
          <MagazineFlipReader issue={issue} />
        </div>
      ) : (
        <>
          <div className="relative flex items-center justify-center" style={{ minHeight: isFullscreen ? 'calc(100vh - 52px)' : 'calc(100vh - 120px)' }}>
            <button
              onClick={goPrev}
              disabled={currentPage === 0}
              className="absolute left-2 lg:left-6 z-20 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <FaArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goNext}
              disabled={currentPage >= totalPages - 1}
              className="absolute right-2 lg:right-6 z-20 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <FaArrowRight className="w-4 h-4" />
            </button>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-4xl mx-auto px-12 lg:px-20 py-6"
              >
                {page && <MagazinePageRenderer page={page} issueTitle={issue.title} issueNumber={issue.issue} coverLines={issue.coverLines} price={issue.price} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress */}
          <div className="fixed bottom-0 left-0 right-0 h-1 bg-gray-900 z-50">
            <motion.div
              className="h-full bg-purple-600"
              animate={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </>
      )}
    </div>
  )
}

