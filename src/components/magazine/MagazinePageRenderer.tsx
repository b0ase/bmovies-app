'use client'

import type { MagazinePage } from '@/lib/npgx-magazines'
import { BARCODE_HEIGHTS } from '@/lib/poster-shared'
import Link from 'next/link'

interface PageRendererProps {
  page: MagazinePage
  issueTitle: string
  issueNumber: number
  coverLines?: string[]
  characters?: string[]
  price?: number
}

export default function MagazinePageRenderer({ page, issueTitle, issueNumber, coverLines, characters, price }: PageRendererProps) {
  switch (page.type) {
    case 'cover':
      return <CoverPage page={page} issueTitle={issueTitle} issueNumber={issueNumber} coverLines={coverLines} price={price} />
    case 'contents':
      return <ContentsPage page={page} issueNumber={issueNumber} />
    case 'photoshoot':
      return <PhotoshootPage page={page} />
    case 'article':
      return <ArticlePage page={page} />
    case 'ad':
      return <AdPage page={page} />
    case 'back-cover':
      return <BackCoverPage page={page} issueNumber={issueNumber} />
    default:
      return <ArticlePage page={page} />
  }
}

/* ═══════════════════════════════════════════════════════════════
   COVER — full magazine cover with masthead, cover lines, price, barcode
   ═══════════════════════════════════════════════════════════════ */
function CoverPage({ page, issueTitle, issueNumber, coverLines, price }: {
  page: MagazinePage; issueTitle: string; issueNumber: number; coverLines?: string[]; price?: number
}) {
  const lines = coverLines || []
  const displayPrice = price || 10

  return (
    <div className="relative aspect-[3/4] max-h-[80vh] mx-auto rounded-lg overflow-hidden shadow-2xl">
      {/* Cover image */}
      {page.image && (
        <img src={page.image} alt={page.title || 'Cover'} className="w-full h-full object-cover" draggable={false} />
      )}

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)' }} />

      {/* Thin frame border */}
      <div className="absolute z-[15]" style={{ inset: '2%', border: '1px solid rgba(255,255,255,0.08)' }} />

      {/* ── MASTHEAD ── */}
      <div className="absolute top-[3%] left-[4%] right-[4%] z-20">
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="leading-none"
              style={{
                fontSize: 'clamp(1.6rem, 7vw, 3.8rem)',
                color: '#FFFFFF',
                textShadow: '4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 0 30px rgba(0,0,0,0.9)',
                fontFamily: "'Impact', 'Arial Black', sans-serif",
                letterSpacing: '0.08em',
                fontWeight: 900,
              }}
            >
              NINJA PUNK GIRLS
            </h1>
            <div className="mt-1" style={{ height: '2px', background: 'linear-gradient(to right, #DC143C 60%, transparent)', width: '80%' }} />
          </div>
          {/* X badge */}
          <span
            style={{
              fontSize: 'clamp(2rem, 8vw, 4.4rem)',
              color: '#DC143C',
              textShadow: '4px 4px 0 #000, -2px -2px 0 #000, 0 0 40px rgba(220,20,60,0.6)',
              fontFamily: "'Impact', 'Arial Black', sans-serif",
              fontWeight: 900,
              lineHeight: 0.88,
            }}
          >
            X
          </span>
        </div>

        {/* Issue info line */}
        <div className="flex items-center gap-3 mt-1">
          <span
            style={{
              fontSize: 'clamp(0.45rem, 1.2vw, 0.65rem)',
              color: 'rgba(255,255,255,0.6)',
              letterSpacing: '0.15em',
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              textTransform: 'uppercase',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            }}
          >
            ISSUE {String(issueNumber).padStart(3, '0')} &bull; {issueTitle.toUpperCase()} &bull; NPGX.WEBSITE
          </span>
        </div>

        {/* Price badge */}
        <div className="absolute top-0 right-0 mt-16">
          <span
            style={{
              fontSize: 'clamp(0.9rem, 2.5vw, 1.4rem)',
              color: '#FFFFFF',
              background: '#DC143C',
              padding: '4px 12px',
              fontFamily: "'Impact', 'Arial Black', sans-serif",
              fontWeight: 900,
              letterSpacing: '0.05em',
            }}
          >
            ${displayPrice.toFixed(2)}
          </span>
        </div>
      </div>

      {/* ── COVER LINES (left side, stacked) ── */}
      {lines.length > 0 && (
        <div className="absolute left-[4%] z-20" style={{ top: '38%' }}>
          <div className="flex flex-col gap-2">
            {lines.slice(0, 5).map((line, i) => (
              <div key={i}>
                <span
                  style={{
                    fontSize: i === 0
                      ? 'clamp(0.8rem, 2.5vw, 1.3rem)'
                      : 'clamp(0.55rem, 1.5vw, 0.85rem)',
                    color: i === 0 ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                    fontFamily: i === 0 ? "'Impact', 'Arial Black', sans-serif" : "'Helvetica Neue', Arial, sans-serif",
                    fontWeight: i === 0 ? 900 : 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
                    lineHeight: 1.2,
                    display: 'block',
                  }}
                >
                  {line}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BOTTOM: Issue title + barcode ── */}
      <div className="absolute bottom-[3%] left-[4%] right-[4%] z-20">
        <div className="flex items-end justify-between">
          <div>
            <h2
              style={{
                fontSize: 'clamp(1.8rem, 7vw, 3.6rem)',
                color: '#FFFFFF',
                textShadow: '4px 4px 8px rgba(0,0,0,0.95), 0 0 40px rgba(0,0,0,0.6)',
                fontFamily: "'Impact', 'Arial Black', sans-serif",
                letterSpacing: '0.06em',
                lineHeight: 0.95,
                fontWeight: 900,
                textTransform: 'uppercase',
              }}
            >
              {issueTitle}
            </h2>
            {page.subtitle && (
              <p
                style={{
                  fontSize: 'clamp(0.5rem, 1.2vw, 0.7rem)',
                  color: '#DC143C',
                  letterSpacing: '0.2em',
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  textTransform: 'uppercase',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                  marginTop: '2px',
                }}
              >
                {page.subtitle}
              </p>
            )}
          </div>

          {/* Barcode */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-[1px] items-end" style={{ height: '24px' }}>
              {BARCODE_HEIGHTS.map((h, i) => (
                <div key={i} style={{ width: '1.5px', height: `${h * 3}px`, background: 'rgba(255,255,255,0.4)' }} />
              ))}
            </div>
            <span
              style={{
                fontSize: 'clamp(0.3rem, 0.7vw, 0.4rem)',
                color: 'rgba(255,255,255,0.3)',
                fontFamily: "'Courier New', monospace",
                letterSpacing: '0.1em',
              }}
            >
              NPGX-{String(issueNumber).padStart(3, '0')}-{new Date().getFullYear()}
            </span>
          </div>
        </div>

        {/* Bottom rule */}
        <div className="mt-1" style={{ height: '1px', background: 'linear-gradient(to right, rgba(220,20,60,0.6), transparent 70%)' }} />
        <div className="flex justify-between mt-[2px]">
          <span style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.25)', fontFamily: "'Helvetica Neue', sans-serif", letterSpacing: '0.1em' }}>
            NPGX.WEBSITE
          </span>
          <span style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.25)', fontFamily: "'Helvetica Neue', sans-serif", letterSpacing: '0.1em' }}>
            AI GENERATED &bull; 18+ &bull; {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   CONTENTS — styled index page with section listing
   ═══════════════════════════════════════════════════════════════ */
function ContentsPage({ page, issueNumber }: { page: MagazinePage; issueNumber: number }) {
  const lines = (page.body || '').split('\n').filter(Boolean)

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Header */}
      <div className="flex items-baseline gap-4 mb-8">
        <h2 className="text-red-500 font-black text-4xl uppercase tracking-tight" style={{ fontFamily: 'var(--font-brand)' }}>
          {page.title || 'INDEX'}
        </h2>
        <span className="text-gray-600 text-xs uppercase tracking-widest">Issue {String(issueNumber).padStart(3, '0')}</span>
      </div>

      <div className="border-t border-red-500/30" />

      {/* Content lines with proper formatting */}
      <div className="mt-6 space-y-1">
        {lines.map((line, i) => {
          // Section headers
          if (line.startsWith('—')) {
            return (
              <div key={i} className="pt-4 pb-2">
                <span className="text-red-500 text-[10px] font-bold uppercase tracking-[0.3em]">{line.replace(/—/g, '').trim()}</span>
                <div className="w-8 h-[1px] bg-red-500/40 mt-1" />
              </div>
            )
          }
          // Page entries
          const match = line.match(/^(\d[\d-]*)\s*[—–-]\s*(.+)/)
          if (match) {
            return (
              <div key={i} className="flex items-baseline gap-3 group">
                <span className="text-red-500/60 text-xs font-mono w-10 text-right flex-shrink-0">{match[1]}</span>
                <div className="flex-1 border-b border-dotted border-white/10 group-hover:border-white/20 transition" />
                <span className="text-gray-300 text-sm font-medium uppercase tracking-wide">{match[2]}</span>
              </div>
            )
          }
          // Intro text
          return (
            <p key={i} className="text-gray-400 text-sm leading-relaxed italic mb-4">{line}</p>
          )
        })}
      </div>

      <div className="mt-12 border-t border-white/10 pt-4">
        <p className="text-gray-700 text-[9px] uppercase tracking-[0.3em] text-center">
          NPGX Magazine &bull; All characters are AI-generated fiction &bull; 18+ only
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PHOTOSHOOT — full-bleed image with editorial overlay
   ═══════════════════════════════════════════════════════════════ */
function PhotoshootPage({ page }: { page: MagazinePage }) {
  return (
    <div className="relative">
      {page.image && (
        <div className="relative aspect-[3/4] max-h-[80vh] mx-auto rounded-lg overflow-hidden shadow-2xl">
          <img src={page.image} alt={page.character || page.title || 'Photoshoot'} className="w-full h-full object-cover" draggable={false} />

          {/* Subtle vignette */}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)' }} />

          {/* Title card overlay (hero shots only) */}
          {page.title && (
            <div className="absolute top-[4%] left-[5%] z-10">
              <h2
                style={{
                  fontSize: 'clamp(1.2rem, 5vw, 2.5rem)',
                  color: '#FFFFFF',
                  textShadow: '3px 3px 6px rgba(0,0,0,0.9)',
                  fontFamily: "'Impact', 'Arial Black', sans-serif",
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  lineHeight: 0.95,
                }}
              >
                {page.title}
              </h2>
              <div className="mt-1" style={{ height: '2px', background: '#DC143C', width: '40%' }} />
            </div>
          )}

          {/* Shot type label */}
          {page.shotType && (
            <div className="absolute top-[4%] right-[5%] z-10">
              <span
                style={{
                  fontSize: 'clamp(0.5rem, 1.2vw, 0.7rem)',
                  color: '#DC143C',
                  letterSpacing: '0.2em',
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  textTransform: 'uppercase',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                  fontWeight: 700,
                }}
              >
                {page.shotType.replace(/-/g, ' ')}
              </span>
            </div>
          )}

          {/* Bottom credit bar */}
          <div className="absolute bottom-0 left-0 right-0 z-10">
            <div className="bg-gradient-to-t from-black/80 to-transparent pt-12 pb-4 px-5">
              {page.character && (
                <p
                  style={{
                    fontSize: 'clamp(0.5rem, 1.2vw, 0.7rem)',
                    color: 'rgba(255,255,255,0.5)',
                    letterSpacing: '0.2em',
                    fontFamily: "'Helvetica Neue', Arial, sans-serif",
                    textTransform: 'uppercase',
                  }}
                >
                  {page.character}
                </p>
              )}
              <div className="flex justify-between items-end mt-1">
                <span style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>
                  NPGX EXPOSURE
                </span>
                <span style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>
                  NPGX.WEBSITE
                </span>
              </div>
            </div>
          </div>

          {/* Thin frame */}
          <div className="absolute z-[5]" style={{ inset: '2%', border: '1px solid rgba(255,255,255,0.06)' }} />
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ARTICLE — editorial layout with drop cap, pull quotes, sections
   ═══════════════════════════════════════════════════════════════ */
function ArticlePage({ page }: { page: MagazinePage }) {
  const body = page.body || ''
  const paragraphs = body.split('\n').filter(p => p.trim())

  // Detect section type from title for styling
  const isInterview = page.title?.includes('SPEAKS') || page.title?.includes('INTERROGATION')
  const isWire = page.title?.includes('WIRE')
  const isArmoury = page.title?.includes('ARMOURY')
  const isFrequencies = page.title?.includes('FREQUEN')
  const isLastRites = page.title?.includes('LAST RITES')
  const isContinuation = page.subtitle === 'Continued' && !body

  // Don't render empty continuation pages
  if (isContinuation) return null

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Section header */}
      <div className="mb-8">
        {/* Section marker */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-[2px] bg-red-600" />
          <span className="text-red-500 text-[10px] font-bold uppercase tracking-[0.3em]">
            {isInterview ? 'INTERROGATION' : isWire ? 'THE WIRE' : isArmoury ? 'THE ARMOURY' : isFrequencies ? 'FREQUENCIES' : isLastRites ? 'LAST RITES' : page.subtitle ? page.subtitle.split('—')[0].trim().toUpperCase() : 'FEATURE'}
          </span>
        </div>

        <h2
          className="text-white font-black uppercase tracking-tight mb-2"
          style={{
            fontFamily: 'var(--font-brand)',
            fontSize: 'clamp(1.8rem, 5vw, 2.8rem)',
            lineHeight: 1,
          }}
        >
          {page.title}
        </h2>
        {page.subtitle && page.subtitle !== 'Continued' && (
          <p className="text-red-400/80 text-sm font-medium uppercase tracking-wider">{page.subtitle}</p>
        )}
        {page.character && (
          <p className="text-gray-600 text-xs uppercase tracking-widest mt-2">Featuring {page.character}</p>
        )}
      </div>

      {/* Article body with editorial formatting */}
      <div className="space-y-4">
        {paragraphs.map((para, i) => {
          const trimmed = para.trim()

          // Interview Q&A format
          if (isInterview && (trimmed.startsWith('NPGX:') || trimmed.match(/^[A-Z]+:/))) {
            const colonIdx = trimmed.indexOf(':')
            const speaker = trimmed.slice(0, colonIdx)
            const speech = trimmed.slice(colonIdx + 1).trim()
            const isInterviewer = speaker === 'NPGX'

            return (
              <div key={i} className={`${isInterviewer ? 'pl-0' : 'pl-4 border-l-2 border-red-500/30'} py-1`}>
                <span className={`text-xs font-bold uppercase tracking-wider ${isInterviewer ? 'text-gray-500' : 'text-red-400'}`}>
                  {speaker}
                </span>
                <p className={`text-sm leading-relaxed mt-0.5 ${isInterviewer ? 'text-gray-400 italic' : 'text-gray-200'}`}>
                  {speech}
                </p>
              </div>
            )
          }

          // Wire news items — headlines
          if (isWire && trimmed === trimmed.toUpperCase() && trimmed.length < 60 && trimmed.length > 3) {
            return (
              <div key={i} className="pt-3 border-t border-white/10">
                <h3 className="text-white font-black text-sm uppercase tracking-wide" style={{ fontFamily: 'var(--font-brand)' }}>
                  {trimmed}
                </h3>
              </div>
            )
          }

          // Armoury ratings — skull ratings
          if (isArmoury && trimmed.includes('/5')) {
            return (
              <p key={i} className="text-red-400 text-xs font-bold uppercase tracking-wider">
                {trimmed.replace(/(\d)\/5/g, (_, n) => '💀'.repeat(parseInt(n)) + '○'.repeat(5 - parseInt(n)))}
              </p>
            )
          }

          // Armoury item names (all caps, short)
          if (isArmoury && trimmed === trimmed.toUpperCase() && trimmed.length < 50 && trimmed.length > 3) {
            return (
              <h3 key={i} className="text-white font-black text-sm uppercase tracking-wide mt-4 pt-3 border-t border-white/10" style={{ fontFamily: 'var(--font-brand)' }}>
                {trimmed}
              </h3>
            )
          }

          // Frequencies section headers
          if (isFrequencies && (trimmed.startsWith('LISTENING') || trimmed.startsWith('WATCHING') || trimmed.startsWith('ATTENDING') || trimmed.startsWith('READING'))) {
            return (
              <div key={i} className="pt-3">
                <span className="text-red-500 text-[10px] font-bold uppercase tracking-[0.3em]">
                  {trimmed}
                </span>
              </div>
            )
          }

          // Italic intro paragraphs (usually first paragraph of interviews)
          if (i === 0 && trimmed.startsWith('*') && trimmed.endsWith('*')) {
            return (
              <p key={i} className="text-gray-400 text-sm italic leading-relaxed border-l-2 border-red-500/20 pl-4">
                {trimmed.replace(/^\*|\*$/g, '')}
              </p>
            )
          }

          // First paragraph with drop cap
          if (i === 0 && !isInterview && !isWire && paragraphs.length > 2) {
            const firstChar = trimmed.charAt(0)
            const rest = trimmed.slice(1)
            return (
              <div key={i} className="relative">
                <span
                  className="float-left mr-2 text-red-500 font-black leading-none"
                  style={{
                    fontSize: 'clamp(3rem, 6vw, 4rem)',
                    fontFamily: "'Impact', 'Arial Black', sans-serif",
                    marginTop: '-0.1em',
                  }}
                >
                  {firstChar}
                </span>
                <p className="text-gray-300 text-[15px] leading-relaxed">{rest}</p>
              </div>
            )
          }

          // Regular paragraph
          return (
            <p key={i} className={`text-[15px] leading-relaxed ${isLastRites ? 'text-gray-200' : 'text-gray-300'}`}>
              {trimmed}
            </p>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-white/10 flex justify-between">
        <span className="text-gray-700 text-[9px] uppercase tracking-[0.2em]">NPGX Magazine</span>
        <span className="text-gray-700 text-[9px] uppercase tracking-[0.2em]">{page.title}</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   AD — full-page advertisement
   ═══════════════════════════════════════════════════════════════ */
function AdPage({ page }: { page: MagazinePage }) {
  return (
    <div className="max-w-lg mx-auto py-12 flex items-center justify-center min-h-[60vh]">
      <div className="text-center w-full">
        <div className="border border-red-500/20 rounded-xl p-10 bg-gradient-to-br from-gray-950 via-black to-red-950/20 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />

          <p className="text-red-500/40 text-[10px] font-bold uppercase tracking-[0.5em] mb-6">Advertisement</p>

          <h2
            className="text-white font-black text-3xl uppercase tracking-tight mb-3"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            {page.title}
          </h2>
          {page.body && (
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">{page.body}</p>
          )}

          <div className="mt-6 flex justify-center">
            <div className="flex gap-[1px] items-end" style={{ height: '16px' }}>
              {BARCODE_HEIGHTS.map((h, i) => (
                <div key={i} style={{ width: '1.5px', height: `${h * 2}px`, background: 'rgba(220,20,60,0.3)' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   BACK COVER
   ═══════════════════════════════════════════════════════════════ */
function BackCoverPage({ page, issueNumber }: { page: MagazinePage; issueNumber: number }) {
  return (
    <div className="max-w-lg mx-auto py-12 text-center">
      <div className="bg-gradient-to-br from-red-950/50 via-black to-red-950/30 border border-red-500/20 rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent" />

        <p className="text-red-500/40 text-[10px] font-bold uppercase tracking-[0.5em] mb-6">
          Issue {String(issueNumber).padStart(3, '0')}
        </p>

        <h2 className="text-red-500 font-black text-3xl uppercase tracking-tight mb-3" style={{ fontFamily: 'var(--font-brand)' }}>
          {page.title}
        </h2>
        {page.subtitle && (
          <p className="text-white font-bold text-lg uppercase mb-4">{page.subtitle}</p>
        )}
        <p className="text-gray-400 text-sm leading-relaxed mb-6">{page.body}</p>

        <Link
          href="/magazine"
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all"
        >
          Back to Shop
        </Link>

        {/* Barcode */}
        <div className="mt-6 flex justify-center">
          <div className="flex gap-[1px] items-end" style={{ height: '20px' }}>
            {BARCODE_HEIGHTS.map((h, i) => (
              <div key={i} style={{ width: '1.5px', height: `${h * 2.5}px`, background: 'rgba(255,255,255,0.2)' }} />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-8">
        <p className="text-gray-700 text-[10px] uppercase tracking-widest">
          NPGX Magazine &copy; {new Date().getFullYear()} &bull; npgx.website
        </p>
      </div>
    </div>
  )
}
