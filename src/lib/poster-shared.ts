// Shared constants for MagazineCoverOverlay + poster-renderer
// Single source of truth — extracted from MagazineCoverOverlay.tsx

export const COVER_LINES = [
  ['EXCLUSIVE SHOOT', 'UNCENSORED'],
  ['TOKYO AFTER DARK', 'RAW EDITION'],
  ['THE FULL STORY', 'NO LIMITS'],
  ['BEHIND THE MASK', 'UNFILTERED'],
  ['STREET SPECIAL', "COLLECTOR'S ED."],
  ['LATEX & INK', 'LIMITED RUN'],
  ['FIRST LOOK', 'PREMIUM ISSUE'],
  ['NIGHT SESSION', 'EXPLICIT CONTENT'],
]

/** Deterministic cover line pair based on character name hash */
export function getCoverLines(name: string): string[] {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return COVER_LINES[hash % COVER_LINES.length]
}

/** Deterministic issue number 001-099 based on character name hash */
export function getIssueNumber(name: string): string {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return String((hash % 99) + 1).padStart(3, '0')
}

/** Barcode heights used by both CSS overlay and canvas renderer */
export const BARCODE_HEIGHTS = [3, 5, 2, 6, 4, 2, 5, 3, 6, 2, 4, 5, 3, 2, 6, 4, 5, 3, 2, 4]
