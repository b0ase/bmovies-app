'use client'

import { getCoverLines, getIssueNumber, BARCODE_HEIGHTS } from '@/lib/poster-shared'

export type CoverVariant = 'standard' | 'cover' | 'photoshoot' | 'editorial-spread'

interface MagazineCoverOverlayProps {
  characterName: string
  katakana?: string
  token: string
  tagline?: string
  imageUrl?: string
  className?: string
  showOverlay?: boolean
  issueNumber?: number
  variant?: CoverVariant
  shotLabel?: string        // e.g. "HERO PORTRAIT"
  shotNumber?: string       // e.g. "01/05"
  children?: React.ReactNode
}

export default function MagazineCoverOverlay({
  characterName,
  katakana,
  token,
  tagline,
  imageUrl,
  className = '',
  showOverlay = true,
  issueNumber,
  variant = 'standard',
  shotLabel,
  shotNumber,
  children,
}: MagazineCoverOverlayProps) {
  const coverLines = getCoverLines(characterName)
  const issue = issueNumber ? String(issueNumber).padStart(3, '0') : getIssueNumber(characterName)

  const isCover = variant === 'cover'
  const isPhotoshoot = variant === 'photoshoot'
  const isEditorial = variant === 'editorial-spread'

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* The photo or child content (for video) */}
      {children || (
        imageUrl && (
          <img
            src={imageUrl}
            alt={characterName}
            className="w-full h-full object-cover"
            draggable={false}
          />
        )
      )}

      {/* EDITORIAL SPREAD — minimal, typographic, magazine-interior feel */}
      {showOverlay && isEditorial && (
        <div className="absolute inset-0 pointer-events-none select-none">
          {/* Subtle bottom gradient only */}
          <div
            className="absolute bottom-0 left-0 right-0 z-[5]"
            style={{
              height: '25%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
            }}
          />

          {/* Large letter watermark — top left */}
          <div className="absolute top-[4%] left-[5%] z-[20]">
            <span
              style={{
                fontSize: 'clamp(4rem, 18vw, 12rem)',
                color: 'rgba(255,255,255,0.04)',
                fontFamily: "'Impact', 'Arial Black', sans-serif",
                fontWeight: 900,
                lineHeight: 0.8,
              }}
            >
              {characterName.charAt(0)}
            </span>
          </div>

          {/* Katakana — vertical right, larger and bolder */}
          {katakana && (
            <div className="absolute right-[3%] z-[20]" style={{ top: '8%' }}>
              <div
                style={{
                  writingMode: 'vertical-rl',
                  fontSize: 'clamp(1.2rem, 3.5vw, 2rem)',
                  color: 'rgba(220,20,60,0.35)',
                  letterSpacing: '0.3em',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                {katakana}
              </div>
            </div>
          )}

          {/* Bottom: name + token — clean editorial style */}
          <div className="absolute bottom-[4%] left-[5%] right-[5%] z-[20]">
            <div className="flex items-end justify-between">
              <div>
                <h2
                  style={{
                    fontSize: 'clamp(1.8rem, 8vw, 4rem)',
                    color: '#FFFFFF',
                    textShadow: '3px 3px 6px rgba(0,0,0,0.9)',
                    fontFamily: "'Impact', 'Arial Black', sans-serif",
                    letterSpacing: '0.1em',
                    lineHeight: 0.9,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                  }}
                >
                  {characterName.split(' ')[0]}
                </h2>
                {/* Thin crimson rule */}
                <div
                  className="mt-1"
                  style={{
                    height: '2px',
                    background: '#DC143C',
                    width: '40%',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 'clamp(0.6rem, 1.5vw, 0.85rem)',
                  color: 'rgba(220,20,60,0.6)',
                  fontFamily: "'Courier New', monospace",
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}
              >
                {token}
              </span>
            </div>
          </div>

          {/* Page number feel — bottom right */}
          <div className="absolute bottom-[2%] right-[5%] z-[20]">
            <span
              style={{
                fontSize: 'clamp(0.35rem, 0.8vw, 0.45rem)',
                color: 'rgba(255,255,255,0.2)',
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                letterSpacing: '0.15em',
              }}
            >
              NPGX MAGAZINE
            </span>
          </div>
        </div>
      )}

      {/* STANDARD / COVER / PHOTOSHOOT overlays */}
      {showOverlay && !isEditorial && (
        <div className="absolute inset-0 pointer-events-none select-none">

          {/* TOP GRADIENT — very subtle, just enough for text readability */}
          <div
            data-poster-gradient
            className="absolute top-0 left-0 right-0 z-[5]"
            style={{
              height: '25%',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 100%)',
            }}
          />

          {/* BOTTOM GRADIENT */}
          <div
            data-poster-gradient
            className="absolute bottom-0 left-0 right-0 z-[5]"
            style={{
              height: '30%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 100%)',
            }}
          />

          {/* VIGNETTE — barely there */}
          <div
            data-poster-gradient
            className="absolute inset-0 z-[4]"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.15) 100%)',
            }}
          />

          {/* MASTHEAD: NINJA PUNK GIRLS */}
          <div className="absolute top-[3%] left-[4%] right-[4%] z-[20]">
            <div className="flex items-start justify-between">
              <div>
                <h1
                  style={{
                    fontSize: isCover ? 'clamp(1.8rem, 8vw, 4.2rem)' : 'clamp(1.6rem, 7vw, 3.6rem)',
                    color: '#FFFFFF',
                    textShadow: '4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 0 30px rgba(0,0,0,0.9)',
                    fontFamily: "'Impact', 'Arial Black', sans-serif",
                    letterSpacing: '0.08em',
                    lineHeight: 0.88,
                    fontWeight: 900,
                  }}
                >
                  NINJA PUNK GIRLS
                </h1>
                {/* Thin rule under masthead */}
                <div
                  className="mt-1"
                  style={{
                    height: '2px',
                    background: 'linear-gradient(to right, #DC143C 60%, transparent)',
                    width: '80%',
                  }}
                />
              </div>

              {/* XXX badge */}
              <div className="relative">
                <span
                  style={{
                    fontSize: isCover ? 'clamp(2rem, 8vw, 4.4rem)' : 'clamp(1.8rem, 7vw, 3.8rem)',
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
            </div>

            {/* Sub-masthead: issue info or shot label */}
            <div className="flex items-center gap-3 mt-1">
              <span
                style={{
                  fontSize: isPhotoshoot ? 'clamp(0.5rem, 1.4vw, 0.75rem)' : 'clamp(0.45rem, 1.2vw, 0.65rem)',
                  color: isPhotoshoot ? 'rgba(220,20,60,0.7)' : 'rgba(255,255,255,0.6)',
                  letterSpacing: '0.15em',
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  textTransform: 'uppercase',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                  fontWeight: isPhotoshoot ? 700 : 400,
                }}
              >
                {isPhotoshoot && shotLabel
                  ? `${shotLabel}${shotNumber ? ` \u2022 ${shotNumber}` : ''}`
                  : isCover
                    ? `ISSUE ${issue} \u2014 GENESIS \u2022 NPGX.WEBSITE`
                    : `ISSUE NO. ${issue} \u2022 NPGX.WEBSITE \u2022 UNCENSORED`}
              </span>
            </div>

            {/* Cover variant: price badge */}
            {isCover && (
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
                  $9.99
                </span>
              </div>
            )}
          </div>

          {/* LEFT SIDEBAR: COVER LINES */}
          <div className="absolute left-[4%] z-[20]" style={{ top: '42%' }}>
            <div
              style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                transform: 'rotate(180deg)',
              }}
            >
              <span
                style={{
                  fontSize: 'clamp(0.5rem, 1.5vw, 0.75rem)',
                  color: 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.3em',
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  textTransform: 'uppercase',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                }}
              >
                {coverLines[0]}
              </span>
            </div>
          </div>

          {/* RIGHT SIDEBAR: KATAKANA VERTICAL */}
          {katakana && (
            <div className="absolute right-[4%] z-[20]" style={{ top: '25%' }}>
              <div
                style={{
                  writingMode: 'vertical-rl',
                  fontSize: 'clamp(0.9rem, 2.5vw, 1.4rem)',
                  color: 'rgba(220,20,60,0.45)',
                  letterSpacing: '0.2em',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {katakana}
              </div>
            </div>
          )}

          {/* RIGHT COVER LINE */}
          <div className="absolute right-[4%] z-[20]" style={{ bottom: '35%' }}>
            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  fontSize: 'clamp(0.6rem, 1.8vw, 0.9rem)',
                  color: '#DC143C',
                  letterSpacing: '0.2em',
                  fontFamily: "'Impact', 'Arial Black', sans-serif",
                  textTransform: 'uppercase',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
                  display: 'block',
                }}
              >
                {coverLines[1]}
              </span>
            </div>
          </div>

          {/* BOTTOM: CHARACTER NAME + TOKEN */}
          <div className="absolute bottom-[3%] left-[4%] right-[4%] z-[20]">
            {/* Tagline */}
            {tagline && (
              <p
                style={{
                  fontSize: 'clamp(0.5rem, 1.4vw, 0.7rem)',
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '0.15em',
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  textTransform: 'uppercase',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                  marginBottom: '2px',
                }}
              >
                {tagline}
              </p>
            )}

            {/* Name row */}
            <div className="flex items-end justify-between">
              <div>
                <h2
                  style={{
                    fontSize: isCover ? 'clamp(1.8rem, 7vw, 3.6rem)' : 'clamp(1.5rem, 6vw, 3.2rem)',
                    color: '#FFFFFF',
                    textShadow: '4px 4px 8px rgba(0,0,0,0.95), 0 0 40px rgba(0,0,0,0.6)',
                    fontFamily: "'Impact', 'Arial Black', sans-serif",
                    letterSpacing: '0.06em',
                    lineHeight: 0.95,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                  }}
                >
                  {characterName}
                </h2>
              </div>

              {/* Token + barcode element */}
              <div className="flex flex-col items-end gap-1">
                <span
                  style={{
                    fontSize: 'clamp(0.7rem, 1.8vw, 1rem)',
                    color: '#DC143C',
                    fontFamily: "'Courier New', monospace",
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    background: 'rgba(0,0,0,0.6)',
                    padding: '2px 6px',
                    border: '1px solid rgba(220,20,60,0.4)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {token}
                </span>
                {/* Mini barcode */}
                <div className="flex gap-[1px] items-end" style={{ height: '12px' }}>
                  {BARCODE_HEIGHTS.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        width: '1px',
                        height: `${h * 1.5}px`,
                        background: 'rgba(255,255,255,0.3)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom rule */}
            <div
              className="mt-1"
              style={{
                height: '1px',
                background: 'linear-gradient(to right, rgba(220,20,60,0.6), transparent 70%)',
              }}
            />
            <div className="flex justify-between mt-[2px]">
              <span
                style={{
                  fontSize: 'clamp(0.35rem, 0.9vw, 0.5rem)',
                  color: 'rgba(255,255,255,0.25)',
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  letterSpacing: '0.1em',
                }}
              >
                NPGX.WEBSITE
              </span>
              <span
                style={{
                  fontSize: 'clamp(0.35rem, 0.9vw, 0.5rem)',
                  color: 'rgba(255,255,255,0.25)',
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  letterSpacing: '0.1em',
                }}
              >
                AI GENERATED &bull; {new Date().getFullYear()}
              </span>
            </div>
          </div>

          {/* THIN FRAME BORDER */}
          <div
            className="absolute z-[15]"
            style={{
              inset: '2%',
              border: '1px solid rgba(255,255,255,0.08)',
              pointerEvents: 'none',
            }}
          />
        </div>
      )}
    </div>
  )
}
