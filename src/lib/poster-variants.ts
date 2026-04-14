// NPGX Poster Variant System
// Different overlay styles for different output types: poster, magazine cover, editorial spread, clean

export type OutputType = 'poster' | 'magazine-cover' | 'editorial-spread' | 'clean'

export interface OutputTypeMeta {
  id: OutputType
  label: string
  description: string
  aspect: string // display hint
  showOverlay: boolean
}

export const OUTPUT_TYPES: OutputTypeMeta[] = [
  {
    id: 'poster',
    label: 'Poster',
    description: 'Bold typography, character name, katakana, token badge',
    aspect: '2:3',
    showOverlay: true,
  },
  {
    id: 'magazine-cover',
    label: 'Magazine Cover',
    description: 'Full masthead, cover lines, price, issue number, barcode',
    aspect: '2:3',
    showOverlay: true,
  },
  {
    id: 'editorial-spread',
    label: 'Editorial',
    description: 'Minimal — name, katakana sidebar, page number feel',
    aspect: '2:3',
    showOverlay: true,
  },
  {
    id: 'clean',
    label: 'Clean',
    description: 'No overlay — raw generated image',
    aspect: '2:3',
    showOverlay: false,
  },
]

export function getOutputType(id: OutputType): OutputTypeMeta {
  return OUTPUT_TYPES.find(t => t.id === id) || OUTPUT_TYPES[0]
}
