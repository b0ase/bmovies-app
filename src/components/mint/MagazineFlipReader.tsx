'use client'

import React, { useState, useMemo, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { MagazineIssue, MagazinePage } from '@/lib/npgx-magazines'
import { BARCODE_HEIGHTS } from '@/lib/poster-shared'

const HTMLFlipBook = dynamic(() => import('react-pageflip').then(m => m.default || m), { ssr: false })

type MagazineFlipReaderProps = {
  issue: MagazineIssue
  maxPages?: number
}

/* ── Forwardref page wrapper (required by react-pageflip) ── */
const FlipPage = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, ref) => (
    <div ref={ref} className="flipbook-page" style={{ background: '#0a0a0a', overflow: 'hidden' }}>
      {children}
    </div>
  )
)
FlipPage.displayName = 'FlipPage'

export default function MagazineFlipReader({ issue, maxPages }: MagazineFlipReaderProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const flipBookRef = useRef<any>(null)

  const pages = useMemo(() => {
    const all = issue.pages || []
    const limit = maxPages ?? all.length
    return all.slice(0, limit)
  }, [issue, maxPages])

  const handleFlip = useCallback((e: any) => {
    setActiveIndex(e.data)
  }, [])

  const goToPage = useCallback((index: number) => {
    if (flipBookRef.current?.pageFlip) {
      flipBookRef.current.pageFlip().flip(index)
    }
  }, [])

  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-600 text-sm">
        No pages to display
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-[400px] flex items-center justify-center" style={{ padding: '20px' }}>
        {/* @ts-ignore - react-pageflip typing */}
        <HTMLFlipBook
          ref={flipBookRef}
          width={340}
          height={476}
          size="stretch"
          minWidth={260}
          maxWidth={440}
          minHeight={364}
          maxHeight={616}
          showCover={true}
          mobileScrollSupport={true}
          onFlip={handleFlip}
          flippingTime={600}
          useMouseEvents={true}
          startPage={0}
          drawShadow={true}
          maxShadowOpacity={0.4}
          className="flipbook-inner"
        >
          {pages.map((page, i) => (
            <FlipPage key={i}>
              <PageContent page={page} issue={issue} pageNumber={i + 1} totalPages={pages.length} />
            </FlipPage>
          ))}
        </HTMLFlipBook>
      </div>

      {/* Thumbnail strip — clicks actually flip the book */}
      <div className="bg-black/80 border-t border-white/10 px-4 py-2 overflow-x-auto">
        <div className="flex gap-1.5 justify-center">
          {pages.map((p, i) => (
            <button
              key={i}
              onClick={() => goToPage(i)}
              className={`flex-shrink-0 w-8 h-11 rounded overflow-hidden border transition-all ${
                activeIndex === i ? 'border-red-500 shadow-lg' : 'border-white/10 hover:border-white/30'
              }`}
            >
              {p.image ? (
                <img src={p.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                  <span className="text-[5px] text-gray-600 font-bold uppercase">{p.type}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Page content renderer — renders each page type for the flipbook ── */
function PageContent({ page, issue, pageNumber, totalPages }: {
  page: MagazinePage; issue: MagazineIssue; pageNumber: number; totalPages: number
}) {
  switch (page.type) {
    case 'cover': return <CoverFlip page={page} issue={issue} />
    case 'contents': return <ContentsFlip page={page} issue={issue} />
    case 'photoshoot': return <PhotoFlip page={page} pageNumber={pageNumber} />
    case 'article': return <ArticleFlip page={page} pageNumber={pageNumber} totalPages={totalPages} />
    case 'ad': return <AdFlip page={page} />
    case 'back-cover': return <BackCoverFlip page={page} issue={issue} />
    default: return <ArticleFlip page={page} pageNumber={pageNumber} totalPages={totalPages} />
  }
}

/* ── COVER ── */
function CoverFlip({ page, issue }: { page: MagazinePage; issue: MagazineIssue }) {
  return (
    <div className="relative w-full h-full" style={{ border: '3px solid #DC143C' }}>
      {page.image && <img src={page.image} alt="" className="w-full h-full object-cover" />}
      {/* Strong gradients top and bottom for text readability */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 25%, transparent 45%, rgba(0,0,0,0.2) 65%, rgba(0,0,0,0.85) 100%)' }} />
      {/* Red accent line at very top */}
      <div className="absolute top-0 left-0 right-0" style={{ height: '4px', background: '#DC143C' }} />
      {/* Masthead */}
      <div className="absolute top-[3%] left-[5%] right-[5%]">
        <div className="flex items-start justify-between">
          <span style={{ fontSize: '1.6rem', color: '#fff', fontFamily: "Impact, sans-serif", fontWeight: 900, letterSpacing: '0.08em', textShadow: '3px 3px 0 #000, 0 0 12px rgba(0,0,0,0.9)' }}>
            NINJA PUNK GIRLS
          </span>
          <span style={{ fontSize: '1.8rem', color: '#DC143C', fontFamily: "Impact, sans-serif", fontWeight: 900, textShadow: '3px 3px 0 #000, 0 0 12px rgba(0,0,0,0.9)' }}>
            X
          </span>
        </div>
        <div style={{ height: '3px', background: 'linear-gradient(to right, #DC143C 60%, transparent)', width: '75%', marginTop: '4px' }} />
        <p style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.15em', marginTop: '4px', textShadow: '1px 1px 3px rgba(0,0,0,0.9)' }}>
          ISSUE {String(issue.issue).padStart(3, '0')} &bull; {issue.title}
        </p>
      </div>
      {/* Price badge */}
      <div className="absolute top-[3%] right-[5%]" style={{ marginTop: '2.8rem' }}>
        <div style={{ background: '#DC143C', color: '#fff', fontFamily: "Impact, sans-serif", fontSize: '0.55rem', padding: '3px 8px', fontWeight: 900, letterSpacing: '0.05em' }}>
          ${issue.price || 10}
        </div>
      </div>
      {/* Cover lines */}
      {issue.coverLines?.length > 0 && (
        <div className="absolute left-[5%]" style={{ top: '36%' }}>
          {issue.coverLines.slice(0, 4).map((line, i) => (
            <p key={i} style={{
              fontSize: i === 0 ? '0.8rem' : '0.55rem',
              color: i === 0 ? '#fff' : 'rgba(255,255,255,0.85)',
              fontFamily: i === 0 ? "Impact, sans-serif" : "Helvetica, sans-serif",
              fontWeight: i === 0 ? 900 : 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              textShadow: '2px 2px 4px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.8)',
              marginBottom: '5px',
            }}>
              {line}
            </p>
          ))}
        </div>
      )}
      {/* Bottom title */}
      <div className="absolute bottom-[3%] left-[5%] right-[5%]">
        <p style={{ fontSize: '1.5rem', color: '#fff', fontFamily: "Impact, sans-serif", fontWeight: 900, textTransform: 'uppercase', textShadow: '3px 3px 6px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.8)', lineHeight: 1 }}>
          {issue.title}
        </p>
        <div className="flex justify-between items-end mt-1">
          <span style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.5)', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>NPGX.WEBSITE</span>
          <div className="flex gap-[0.5px] items-end" style={{ height: '12px' }}>
            {BARCODE_HEIGHTS.slice(0, 14).map((h, i) => (
              <div key={i} style={{ width: '1.5px', height: `${h * 1.6}px`, background: 'rgba(255,255,255,0.4)' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── CONTENTS ── */
function ContentsFlip({ page, issue }: { page: MagazinePage; issue: MagazineIssue }) {
  const lines = (page.body || '').split('\n').filter(Boolean)

  // Build contents from issue pages if no body text
  const autoContents = lines.length === 0 ? issue.pages
    .map((p, i) => ({ title: p.title, type: p.type, page: i + 1 }))
    .filter(p => p.title && p.type !== 'contents') : null

  return (
    <div className="w-full h-full p-[8%] flex flex-col" style={{ background: '#0a0a0a' }}>
      <h2 style={{ fontSize: '0.9rem', color: '#DC143C', fontFamily: "Impact, sans-serif", fontWeight: 900, letterSpacing: '0.1em', marginBottom: '4px' }}>
        CONTENTS
      </h2>
      <div style={{ height: '1px', background: '#DC143C', width: '30%', marginBottom: '8px' }} />
      <div className="flex-1 overflow-hidden" style={{ fontSize: '0.32rem', color: '#999', lineHeight: 1.8 }}>
        {autoContents ? (
          autoContents.map((item, i) => (
            <div key={i} className="flex justify-between items-baseline" style={{ borderBottom: '1px dotted #222', paddingBottom: '2px', marginBottom: '2px' }}>
              <span style={{ color: item.type === 'article' ? '#DC143C' : item.type === 'photoshoot' ? '#fff' : '#999', fontWeight: item.type === 'photoshoot' ? 700 : 400, fontSize: item.type === 'article' ? '0.3rem' : '0.28rem' }}>
                {item.title}
              </span>
              <span style={{ fontSize: '0.25rem', color: '#555', minWidth: '16px', textAlign: 'right' }}>{item.page}</span>
            </div>
          ))
        ) : (
          lines.map((line, i) => {
            if (line.startsWith('—')) {
              return <p key={i} style={{ color: '#DC143C', fontSize: '0.28rem', letterSpacing: '0.2em', marginTop: '6px', marginBottom: '2px' }}>{line.replace(/—/g, '').trim()}</p>
            }
            return <p key={i} style={{ color: line.match(/^\d/) ? '#ccc' : '#666' }}>{line}</p>
          })
        )}
      </div>
      <p style={{ fontSize: '0.2rem', color: '#333', letterSpacing: '0.15em', textAlign: 'center', marginTop: '4px' }}>
        NPGX MAGAZINE &bull; 18+
      </p>
    </div>
  )
}

/* ── PHOTOSHOOT ── */
function PhotoFlip({ page, pageNumber }: { page: MagazinePage; pageNumber: number }) {
  return (
    <div className="relative w-full h-full">
      {page.image && <img src={page.image} alt="" className="w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.25) 100%)' }} />
      {/* Title banner — always visible with solid background bar */}
      {page.title && (
        <div className="absolute bottom-[8%] left-0 right-0">
          <div style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 70%, transparent 100%)', padding: '8px 5%' }}>
            <p style={{ fontSize: '0.75rem', color: '#fff', fontFamily: "Impact, sans-serif", fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
              {page.title}
            </p>
            <div style={{ height: '2px', background: '#DC143C', width: '40%', marginTop: '3px' }} />
          </div>
        </div>
      )}
      {page.shotType && (
        <div className="absolute top-[3%] right-[4%]">
          <span style={{ fontSize: '0.25rem', color: '#DC143C', letterSpacing: '0.15em', textTransform: 'uppercase', textShadow: '1px 1px 2px rgba(0,0,0,0.8)', background: 'rgba(0,0,0,0.6)', padding: '2px 4px', borderRadius: '2px' }}>
            {page.shotType.replace(/-/g, ' ')}
          </span>
        </div>
      )}
      <div className="absolute bottom-[2%] left-[4%] right-[4%] flex justify-between">
        {page.character && <span style={{ fontSize: '0.22rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>{page.character}</span>}
        <span style={{ fontSize: '0.22rem', color: 'rgba(255,255,255,0.2)' }}>{pageNumber}</span>
      </div>
    </div>
  )
}

/* ── ARTICLE ── */
function ArticleFlip({ page, pageNumber, totalPages }: { page: MagazinePage; pageNumber: number; totalPages: number }) {
  const body = page.body || ''
  const isContinuation = page.subtitle === 'Continued' && !body
  if (isContinuation) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <p style={{ fontSize: '0.3rem', color: '#333', letterSpacing: '0.2em' }}>CONTINUED</p>
      </div>
    )
  }

  const paragraphs = body.split('\n').filter(p => p.trim())
  const isInterview = page.title?.includes('SPEAKS') || page.title?.includes('INTERROGATION')

  return (
    <div className="w-full h-full p-[5%] flex flex-col" style={{ background: '#0a0a0a' }}>
      {/* Section header */}
      <div style={{ marginBottom: '8px' }}>
        <div className="flex items-center gap-1" style={{ marginBottom: '3px' }}>
          <div style={{ width: '12px', height: '1px', background: '#DC143C' }} />
          <span style={{ fontSize: '0.22rem', color: '#DC143C', letterSpacing: '0.2em' }}>
            {page.title?.includes('WIRE') ? 'THE WIRE' : page.title?.includes('ARMOURY') ? 'THE ARMOURY' : page.title?.includes('FREQUEN') ? 'FREQUENCIES' : page.title?.includes('LAST RITES') ? 'LAST RITES' : 'FEATURE'}
          </span>
        </div>
        <h2 style={{ fontSize: '0.7rem', color: '#fff', fontFamily: "Impact, sans-serif", fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.1, letterSpacing: '0.03em' }}>
          {page.title}
        </h2>
        {page.subtitle && page.subtitle !== 'Continued' && (
          <p style={{ fontSize: '0.28rem', color: '#DC143C', marginTop: '2px', letterSpacing: '0.1em' }}>{page.subtitle}</p>
        )}
        <div style={{ height: '1px', background: 'linear-gradient(to right, #DC143C 40%, transparent)', marginTop: '4px' }} />
      </div>

      {/* Body text — larger font, fills the page */}
      <div className="flex-1 overflow-hidden" style={{ fontSize: '0.34rem', color: '#ccc', lineHeight: 1.8, columnCount: paragraphs.length > 3 ? 2 : 1, columnGap: '10px' }}>
        {paragraphs.map((para, i) => {
          const trimmed = para.trim()
          if (isInterview && trimmed.match(/^[A-Z]+:/)) {
            const colonIdx = trimmed.indexOf(':')
            const speaker = trimmed.slice(0, colonIdx)
            const speech = trimmed.slice(colonIdx + 1).trim()
            return (
              <p key={i} style={{ marginBottom: '5px' }}>
                <span style={{ color: speaker === 'NPGX' ? '#888' : '#DC143C', fontWeight: 700, fontSize: '0.28rem', letterSpacing: '0.05em' }}>{speaker}: </span>
                <span style={{ color: speaker === 'NPGX' ? '#aaa' : '#ddd', fontStyle: speaker === 'NPGX' ? 'italic' : 'normal' }}>{speech}</span>
              </p>
            )
          }
          // First paragraph drop cap
          if (i === 0 && !isInterview && paragraphs.length > 1) {
            return (
              <p key={i} style={{ marginBottom: '5px' }}>
                <span style={{ float: 'left', fontSize: '1.4rem', color: '#DC143C', fontFamily: "Impact, sans-serif", lineHeight: 0.8, marginRight: '3px', marginTop: '2px' }}>
                  {trimmed.charAt(0)}
                </span>
                {trimmed.slice(1)}
              </p>
            )
          }
          // Section headers within text
          if (trimmed === trimmed.toUpperCase() && trimmed.length < 40 && trimmed.length > 2) {
            return (
              <p key={i} style={{ color: '#DC143C', fontSize: '0.3rem', fontWeight: 700, letterSpacing: '0.1em', marginTop: '6px', marginBottom: '3px' }}>
                {trimmed}
              </p>
            )
          }
          return <p key={i} style={{ marginBottom: '4px' }}>{trimmed}</p>
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-between" style={{ borderTop: '1px solid #222', paddingTop: '3px', marginTop: '4px' }}>
        <span style={{ fontSize: '0.18rem', color: '#444' }}>NPGX MAGAZINE</span>
        <span style={{ fontSize: '0.18rem', color: '#444' }}>{pageNumber}</span>
      </div>
    </div>
  )
}

/* ── AD ── */
function AdFlip({ page }: { page: MagazinePage }) {
  return (
    <div className="w-full h-full flex items-center justify-center p-[10%]" style={{ background: '#0a0a0a' }}>
      <div className="text-center w-full" style={{ border: '1px solid rgba(220,20,60,0.2)', borderRadius: '6px', padding: '12%', background: 'linear-gradient(135deg, #111 0%, #0a0a0a 50%, #110808 100%)' }}>
        <p style={{ fontSize: '0.2rem', color: 'rgba(220,20,60,0.4)', letterSpacing: '0.3em', marginBottom: '8px' }}>ADVERTISEMENT</p>
        <h3 style={{ fontSize: '0.6rem', color: '#fff', fontFamily: "Impact, sans-serif", fontWeight: 900, letterSpacing: '0.05em', marginBottom: '4px' }}>
          {page.title}
        </h3>
        {page.body && <p style={{ fontSize: '0.25rem', color: '#666', lineHeight: 1.5 }}>{page.body}</p>}
      </div>
    </div>
  )
}

/* ── BACK COVER ── */
function BackCoverFlip({ page, issue }: { page: MagazinePage; issue: MagazineIssue }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-[10%]" style={{ background: 'linear-gradient(135deg, #1a0505 0%, #0a0a0a 50%, #1a0505 100%)' }}>
      <p style={{ fontSize: '0.2rem', color: 'rgba(220,20,60,0.4)', letterSpacing: '0.3em', marginBottom: '8px' }}>
        ISSUE {String(issue.issue).padStart(3, '0')}
      </p>
      <h3 style={{ fontSize: '0.7rem', color: '#DC143C', fontFamily: "Impact, sans-serif", fontWeight: 900, marginBottom: '4px' }}>
        {page.title}
      </h3>
      {page.subtitle && <p style={{ fontSize: '0.35rem', color: '#fff', fontWeight: 700, marginBottom: '6px' }}>{page.subtitle}</p>}
      {page.body && <p style={{ fontSize: '0.25rem', color: '#666', lineHeight: 1.5, textAlign: 'center', maxWidth: '90%' }}>{page.body}</p>}
      <div className="flex gap-[0.5px] items-end" style={{ height: '10px', marginTop: '12px' }}>
        {BARCODE_HEIGHTS.map((h, i) => (
          <div key={i} style={{ width: '1px', height: `${h * 1.5}px`, background: 'rgba(255,255,255,0.2)' }} />
        ))}
      </div>
      <p style={{ fontSize: '0.18rem', color: '#333', letterSpacing: '0.15em', marginTop: '6px' }}>
        NPGX.WEBSITE &bull; {new Date().getFullYear()}
      </p>
    </div>
  )
}
