/* ── Shared Album + Track Data ─────────────────────── */

export interface Track {
  num: number
  title: string
  japanese?: string
  genre: string
  bpm: number
  aSide?: string
  bSide?: string
  status: 'recorded' | 'prompt-only'
  slug: string
}

export interface Album {
  slug: string
  title: string
  artist: string
  year: number
  genre: string
  albumNumber: string          // e.g. "001"
  accentColor: string          // tailwind class prefix, e.g. "red" or "orange"
  tokenSymbol: string          // e.g. "$TGPUNK"
  coverPath: string
  tracks: Track[]
}

/* ── Helpers ──────────────────────────────────────────── */

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/* ── Tokyo Gutter Punk ────────────────────────────────── */

import { cdnUrl } from './cdn'

const TGP_BASE = cdnUrl('music/albums/tokyo-gutter-punk')

const tokyoGutterPunkTracks: Track[] = ([
  { num: 1,  title: 'Tokyo Gutter Queen',  genre: 'Hardcore Punk',    bpm: 180, aSide: `${TGP_BASE}/01-a.mp3`, bSide: `${TGP_BASE}/01-b.mp3`, status: 'recorded' as const },
  { num: 2,  title: 'Blade Girl',          japanese: '刃物少女',       genre: 'Oi! Punk',          bpm: 170, aSide: `${TGP_BASE}/02-a.mp3`, bSide: `${TGP_BASE}/02-b.mp3`, status: 'recorded' as const },
  { num: 3,  title: 'Shibuya Mosh Pit',    genre: 'Street Punk',      bpm: 190, aSide: `${TGP_BASE}/03-a.mp3`, bSide: `${TGP_BASE}/03-b.mp3`, status: 'recorded' as const },
  { num: 4,  title: 'Black Rose',          japanese: '黒い薔薇',       genre: 'Gothic Punk',       bpm: 140, aSide: `${TGP_BASE}/04-a.mp3`, bSide: `${TGP_BASE}/04-b.mp3`, status: 'recorded' as const },
  { num: 5,  title: 'Kabukicho Wolf',      genre: 'J-Punk',           bpm: 175, aSide: `${TGP_BASE}/05-a.mp3`, bSide: `${TGP_BASE}/05-b.mp3`, status: 'recorded' as const },
  { num: 6,  title: 'Razor Kisses',        genre: 'Pop Punk',         bpm: 160, aSide: `${TGP_BASE}/06-a.mp3`, bSide: `${TGP_BASE}/06-b.mp3`, status: 'recorded' as const },
  { num: 7,  title: "We Don't Die",        japanese: '死なない',        genre: 'Metalcore Punk',    bpm: 185, status: 'prompt-only' as const },
  { num: 8,  title: 'Harajuku Chainsaw',   japanese: '原宿チェーンソー', genre: 'Grindcore J-Punk',  bpm: 200, aSide: `${TGP_BASE}/08-a.mp3`, bSide: `${TGP_BASE}/08-b.mp3`, status: 'recorded' as const },
  { num: 9,  title: 'Underground Empress', japanese: '地下の女帝',      genre: 'Anarcho-Punk',      bpm: 165, aSide: `${TGP_BASE}/09-a.mp3`, bSide: `${TGP_BASE}/09-b.mp3`, status: 'recorded' as const },
  { num: 10, title: 'Fire Girl',           japanese: '炎の少女',        genre: 'Ramones-Punk',      bpm: 180, status: 'prompt-only' as const },
  { num: 11, title: 'Tokaido Reload',      genre: 'Hardcore',         bpm: 175, aSide: `${TGP_BASE}/11-a.mp3`, bSide: `${TGP_BASE}/11-b.mp3`, status: 'recorded' as const },
]).map(t => ({ ...t, slug: toSlug(t.title) }))

export const tokyoGutterPunk: Album = {
  slug: 'tokyo-gutter-punk',
  title: 'TOKYO GUTTER PUNK',
  artist: 'NPGX',
  year: 2026,
  genre: 'Japanese Hardcore Punk',
  albumNumber: '001',
  accentColor: 'red',
  tokenSymbol: '$TGPUNK',
  coverPath: cdnUrl('music/albums/tokyo-gutter-punk/cover.png'),
  tracks: tokyoGutterPunkTracks,
}

/* ── Neon Blood Riot ──────────────────────────────────── */

const NBR_BASE = cdnUrl('music/albums/neon-blood-riot')

const neonBloodRiotTracks: Track[] = ([
  { num: 1,  title: 'Neon Blood Riot',       japanese: 'ネオン血の暴動',   genre: 'Riot Grrrl Punk',    bpm: 175, aSide: `${NBR_BASE}/01-a.mp3`, bSide: `${NBR_BASE}/01-b.mp3`, status: 'recorded' as const },
  { num: 2,  title: 'Chrome Fist',           japanese: 'クロム拳',        genre: 'Industrial Punk',    bpm: 140, aSide: `${NBR_BASE}/02-a.mp3`, bSide: `${NBR_BASE}/02-b.mp3`, status: 'recorded' as const },
  { num: 3,  title: 'Roppongi Warzone',      japanese: '六本木戦場',       genre: 'Street Punk',        bpm: 170, aSide: `${NBR_BASE}/03-a.mp3`, bSide: `${NBR_BASE}/03-b.mp3`, status: 'recorded' as const },
  { num: 4,  title: 'Electric Geisha',       japanese: '電気芸者',        genre: 'Post-Punk New Wave', bpm: 130, aSide: `${NBR_BASE}/04-a.mp3`, bSide: `${NBR_BASE}/04-b.mp3`, status: 'recorded' as const },
  { num: 5,  title: 'Concrete Sakura',       japanese: 'コンクリート桜',   genre: 'Melodic Hardcore',   bpm: 165, aSide: `${NBR_BASE}/05-a.mp3`, bSide: `${NBR_BASE}/05-b.mp3`, status: 'recorded' as const },
  { num: 6,  title: 'Molotov Kiss',          japanese: '火炎キス',        genre: 'Hardcore Punk',      bpm: 190, aSide: `${NBR_BASE}/06-a.mp3`, bSide: `${NBR_BASE}/06-b.mp3`, status: 'recorded' as const },
  { num: 7,  title: 'Shinobi Girls',         japanese: '忍びガールズ',     genre: 'Speed Punk',         bpm: 200, aSide: `${NBR_BASE}/07-a.mp3`, bSide: `${NBR_BASE}/07-b.mp3`, status: 'recorded' as const },
  { num: 8,  title: 'Akihabara Fury',        japanese: '秋葉原の怒り',    genre: 'Noise Punk',         bpm: 180, aSide: `${NBR_BASE}/08-a.mp3`, bSide: `${NBR_BASE}/08-b.mp3`, status: 'recorded' as const },
  { num: 9,  title: 'Dead Idols',            japanese: '死んだアイドル',   genre: 'Gothic Punk',        bpm: 110, aSide: `${NBR_BASE}/09-a.mp3`, bSide: `${NBR_BASE}/09-b.mp3`, status: 'recorded' as const },
  { num: 10, title: 'Gasoline Heart',        japanese: 'ガソリンハート',   genre: 'Garage Punk',        bpm: 170, aSide: `${NBR_BASE}/10-a.mp3`, bSide: `${NBR_BASE}/10-b.mp3`, status: 'recorded' as const },
  { num: 11, title: 'Last Train to Nowhere', japanese: '最終列車',        genre: 'Punk Ballad',        bpm: 90,  aSide: `${NBR_BASE}/11-a.mp3`, bSide: `${NBR_BASE}/11-b.mp3`, status: 'recorded' as const },
]).map(t => ({ ...t, slug: toSlug(t.title) }))

export const neonBloodRiot: Album = {
  slug: 'neon-blood-riot',
  title: 'NEON BLOOD RIOT',
  artist: 'NPGX',
  year: 2026,
  genre: 'Japanese Punk / Post-Punk / Riot Grrrl',
  albumNumber: '002',
  accentColor: 'orange',
  tokenSymbol: '$NPGX',
  coverPath: cdnUrl('music/albums/neon-blood-riot/cover.png'),
  tracks: neonBloodRiotTracks,
}

/* ── All albums ───────────────────────────────────────── */

export const ALBUMS: Album[] = [tokyoGutterPunk, neonBloodRiot]

/* ── Lookup helpers ───────────────────────────────────── */

export function getAlbumBySlug(slug: string): Album | undefined {
  return ALBUMS.find(a => a.slug === slug)
}

export function getTrackBySlug(albumSlug: string, trackSlug: string): { album: Album; track: Track } | undefined {
  const album = getAlbumBySlug(albumSlug)
  if (!album) return undefined
  const track = album.tracks.find(t => t.slug === trackSlug)
  if (!track) return undefined
  return { album, track }
}

export function getPlayableTracks(album: Album): Track[] {
  return album.tracks.filter(t => t.status === 'recorded')
}

export function getAdjacentTracks(album: Album, trackSlug: string): { prev: Track | null; next: Track | null } {
  const idx = album.tracks.findIndex(t => t.slug === trackSlug)
  if (idx === -1) return { prev: null, next: null }
  return {
    prev: idx > 0 ? album.tracks[idx - 1] : null,
    next: idx < album.tracks.length - 1 ? album.tracks[idx + 1] : null,
  }
}

/** Find a track by slug across ALL albums. Returns album + track or undefined. */
export function findTrackBySlug(trackSlug: string): { album: Album; track: Track } | undefined {
  for (const album of ALBUMS) {
    const track = album.tracks.find(t => t.slug === trackSlug)
    if (track) return { album, track }
  }
  return undefined
}

/** Get every playable track across all albums (for generateStaticParams). */
export function getAllTrackSlugs(): string[] {
  return ALBUMS.flatMap(a => a.tracks.filter(t => t.status === 'recorded').map(t => t.slug))
}

/** Global prev/next across all albums (wraps around). */
export function getGlobalAdjacentTracks(trackSlug: string): { prev: string | null; next: string | null } {
  const allSlugs = getAllTrackSlugs()
  const idx = allSlugs.indexOf(trackSlug)
  if (idx === -1) return { prev: null, next: null }
  return {
    prev: allSlugs[(idx - 1 + allSlugs.length) % allSlugs.length],
    next: allSlugs[(idx + 1) % allSlugs.length],
  }
}

/** Alias for getAlbumBySlug (for consistency). */
export function findAlbumBySlug(slug: string): Album | undefined {
  return getAlbumBySlug(slug)
}

/** Get all albums (for generateStaticParams). */
export function getAllAlbums(): Album[] {
  return ALBUMS
}
