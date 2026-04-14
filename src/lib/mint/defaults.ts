import type { ImageItem, ImageSettings, TextOverlay } from './types';

export const createDefaultTextOverlay = (partial?: Partial<TextOverlay>): TextOverlay => ({
  id: crypto.randomUUID(),
  text: 'Text',
  fontFamily: 'Space Grotesk',
  fontSize: 48,
  fontWeight: 700,
  color: '#ffffff',
  backgroundColor: '#000000',
  backgroundOpacity: 0,
  letterSpacing: 2,
  lineHeight: 1.2,
  align: 'center',
  x: 0.5,
  y: 0.5,
  width: 0.6,
  rotation: 0,
  opacity: 1,
  visible: true,
  ...partial
});

export const createDefaultSettings = (logoId: string): ImageSettings => ({
  logoId,
  logoScale: 0.18,
  logoPos: { x: 0.82, y: 0.86 },
  vignetteEnabled: true,
  vignetteStrength: 0.35,
  frameEnabled: true,
  frameThickness: 0.035,
  frameColor: '#f5f5f5',
  stampVisual: {
    watermarkEnabled: false,
    watermarkText: '',
    watermarkOpacity: 0.15,
    watermarkPosition: 'diagonal',
    borderStampEnabled: false,
    borderStampText: ''
  },
  textOverlays: []
});

/** Create an ImageItem from a URL (e.g. from magazine page images or Grok generation). */
export const createImageItemFromUrl = (
  url: string,
  name?: string,
  width = 1024,
  height = 1536,
  logoId = 'npgx-outline'
): ImageItem => ({
  id: crypto.randomUUID(),
  name: name || `image-${Date.now()}`,
  path: '',
  url,
  width,
  height,
  sortOrder: 0,
  mediaType: 'image',
  settings: createDefaultSettings(logoId)
});
