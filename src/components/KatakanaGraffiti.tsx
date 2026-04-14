'use client'

// Floating katakana graffiti — layered, offset, bleeding off page edges
// Hand-painted SVG paths with duo/tri-tone layering
// ニンジャパンクガールズ (Ninja Punk Girls)

const P = {
  hotPink: '#FF1493',
  softPink: '#FF69B4',
  white: '#FFFFFF',
  red: '#DC143C',
  yellow: '#FFD700',
  black: '#111111',
}

// Each mark has 2-3 color layers, each offset slightly for a screen-print look
interface GraffitiMark {
  path: string
  viewBox: string
  position: Record<string, string>
  rotation: number
  scale: number
  layers: { color: string; offset: [number, number]; strokeWidth: number; opacity: number }[]
}

const MARKS: GraffitiMark[] = [
  {
    // ニ (ni) — two bold horizontal strokes
    path: 'M8 25 Q12 22 45 24 Q50 26 55 23 M5 48 Q18 44 58 47 Q64 49 70 45',
    viewBox: '0 0 75 70',
    position: { top: '6%', left: '-40px' },
    rotation: -12,
    scale: 2.2,
    layers: [
      { color: P.black, offset: [3, 3], strokeWidth: 7, opacity: 0.15 },
      { color: P.hotPink, offset: [0, 0], strokeWidth: 5.5, opacity: 0.18 },
      { color: P.white, offset: [-1, -1], strokeWidth: 2, opacity: 0.08 },
    ],
  },
  {
    // ン (n) — diagonal sweep + dot
    path: 'M18 14 Q22 10 26 16 M12 55 Q24 38 50 16 Q56 12 62 8',
    viewBox: '0 0 70 65',
    position: { top: '22%', right: '-55px' },
    rotation: 10,
    scale: 2.8,
    layers: [
      { color: P.black, offset: [4, 4], strokeWidth: 8, opacity: 0.12 },
      { color: P.softPink, offset: [0, 0], strokeWidth: 6, opacity: 0.14 },
      { color: P.yellow, offset: [-2, -1], strokeWidth: 2.5, opacity: 0.06 },
    ],
  },
  {
    // ジ (ji) — vertical + diagonal + dakuten dots
    path: 'M32 6 Q34 22 29 52 Q27 58 25 64 M48 16 Q45 12 42 19 M54 11 Q51 7 48 14 M14 44 Q28 32 38 12',
    viewBox: '0 0 62 70',
    position: { top: '45%', left: '-28px' },
    rotation: -6,
    scale: 2.0,
    layers: [
      { color: P.red, offset: [2, 3], strokeWidth: 6, opacity: 0.14 },
      { color: P.hotPink, offset: [0, 0], strokeWidth: 4.5, opacity: 0.12 },
    ],
  },
  {
    // パ (pa) — curved strokes + handakuten circle
    path: 'M12 18 Q18 10 28 14 Q38 18 33 34 Q30 44 16 50 M33 34 Q44 28 54 38 Q56 48 48 54 M46 6 A6 6 0 1 1 46 18 A6 6 0 1 1 46 6',
    viewBox: '0 0 65 62',
    position: { top: '58%', right: '-45px' },
    rotation: 14,
    scale: 2.4,
    layers: [
      { color: P.black, offset: [3, 3], strokeWidth: 7, opacity: 0.1 },
      { color: P.yellow, offset: [0, 0], strokeWidth: 5, opacity: 0.1 },
      { color: P.hotPink, offset: [-2, -2], strokeWidth: 2.5, opacity: 0.06 },
    ],
  },
  {
    // ク (ku) — angle stroke
    path: 'M22 6 Q28 3 38 10 Q42 16 33 28 M38 10 Q44 22 46 38 Q47 50 44 60 M22 22 Q16 34 12 46',
    viewBox: '0 0 55 65',
    position: { bottom: '35%', left: '-22px' },
    rotation: -16,
    scale: 1.8,
    layers: [
      { color: P.white, offset: [2, 2], strokeWidth: 6, opacity: 0.07 },
      { color: P.softPink, offset: [0, 0], strokeWidth: 4, opacity: 0.09 },
    ],
  },
  {
    // ガ (ga) — ka with dakuten
    path: 'M12 10 Q32 6 44 16 M28 16 Q24 32 20 54 Q18 60 15 64 M38 22 Q42 38 44 54 M50 4 Q47 1 44 7 M55 1 Q52 -1 49 5',
    viewBox: '0 0 60 70',
    position: { top: '78%', right: '-50px' },
    rotation: 7,
    scale: 2.1,
    layers: [
      { color: P.red, offset: [3, 2], strokeWidth: 6, opacity: 0.12 },
      { color: P.hotPink, offset: [0, 0], strokeWidth: 4.5, opacity: 0.14 },
      { color: P.white, offset: [-1, -2], strokeWidth: 1.5, opacity: 0.05 },
    ],
  },
  {
    // ル (ru) — diverging strokes
    path: 'M16 8 Q18 26 20 44 Q21 52 22 60 M38 8 Q40 20 42 32 Q48 44 56 54 Q60 58 66 62',
    viewBox: '0 0 72 68',
    position: { top: '38%', left: '-18px' },
    rotation: -10,
    scale: 1.6,
    layers: [
      { color: P.black, offset: [2, 3], strokeWidth: 5, opacity: 0.1 },
      { color: P.softPink, offset: [0, 0], strokeWidth: 4, opacity: 0.1 },
    ],
  },
  {
    // ズ (zu) — su with dakuten
    path: 'M10 16 Q22 12 38 20 Q44 22 50 17 M28 28 Q22 38 32 48 Q38 54 28 60 Q22 63 16 60 M52 8 Q49 5 46 11 M57 4 Q54 1 51 8',
    viewBox: '0 0 65 68',
    position: { bottom: '12%', right: '-38px' },
    rotation: 11,
    scale: 1.9,
    layers: [
      { color: P.yellow, offset: [3, 2], strokeWidth: 6, opacity: 0.08 },
      { color: P.red, offset: [0, 0], strokeWidth: 4, opacity: 0.1 },
    ],
  },
  {
    // Big ン top-right — hero character, very large
    path: 'M14 16 Q18 10 24 18 M10 60 Q22 42 48 20 Q56 14 64 10',
    viewBox: '0 0 70 68',
    position: { top: '2%', right: '-65px' },
    rotation: -22,
    scale: 4.0,
    layers: [
      { color: P.black, offset: [5, 5], strokeWidth: 9, opacity: 0.06 },
      { color: P.hotPink, offset: [2, 2], strokeWidth: 7, opacity: 0.05 },
      { color: P.yellow, offset: [0, 0], strokeWidth: 3, opacity: 0.03 },
    ],
  },
  {
    // Big ジ bottom-left — dripping off the edge
    path: 'M30 4 Q33 20 28 52 Q26 60 25 68 Q25 74 26 80 M44 14 Q41 10 38 17 M50 9 Q47 5 44 13 M12 42 Q24 30 35 10',
    viewBox: '0 0 58 85',
    position: { bottom: '-10px', left: '-45px' },
    rotation: 4,
    scale: 3.2,
    layers: [
      { color: P.red, offset: [4, 3], strokeWidth: 8, opacity: 0.06 },
      { color: P.white, offset: [0, 0], strokeWidth: 5, opacity: 0.04 },
    ],
  },
]

export default function KatakanaGraffiti() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    >
      {MARKS.map((mark, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            ...mark.position,
            transform: `rotate(${mark.rotation}deg) scale(${mark.scale})`,
          }}
        >
          <svg
            viewBox={mark.viewBox}
            className="w-16 h-16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Render layers back-to-front — each offset for screen-print effect */}
            {mark.layers.map((layer, li) => (
              <path
                key={li}
                d={mark.path}
                stroke={layer.color}
                strokeWidth={layer.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={layer.opacity}
                transform={`translate(${layer.offset[0]}, ${layer.offset[1]})`}
              />
            ))}
          </svg>
        </div>
      ))}

      {/* Spray paint texture filter */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id="spraypaint">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.2" />
          </filter>
        </defs>
      </svg>
    </div>
  )
}
