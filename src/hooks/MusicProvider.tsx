'use client';

import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { getLyrics, type TrackLyrics } from '@/lib/lyrics';
export type { TrackLyrics } from '@/lib/lyrics';

export interface MusicTrack {
  title: string;
  titleJa?: string;
  romanji?: string;
  url: string;
  artist?: string;
  album?: string;
  bpm?: number;
  genre?: string;
  side?: 'A' | 'B';
  lyrics?: TrackLyrics | null;
}

export interface MusicAlbum {
  id: string;
  title: string;
  titleJa?: string;
  cover: string;
  year: number;
  tracks: MusicTrack[];
}

import { cdnUrl } from '@/lib/cdn'

const cdn = (p: string) => cdnUrl(p.startsWith('/') ? p.slice(1) : p)

// ── Original singles ──
const SINGLES: MusicTrack[] = [
  { title: '暴走ハートビート', romanji: 'Bousou Heartbeat', url: cdn('/music/%E6%9A%B4%E8%B5%B0%E3%83%8F%E3%83%BC%E3%83%88%E3%83%93%E3%83%BC%E3%83%88.mp3'), artist: 'NPGX', album: 'singles', bpm: 175, genre: 'J-Punk' },
  { title: '暴走ハートビート (Alt)', romanji: 'Bousou Heartbeat (Alt)', url: cdn('/music/%E6%9A%B4%E8%B5%B0%E3%83%8F%E3%83%BC%E3%83%88%E3%83%93%E3%83%BC%E3%83%88%20(1).mp3'), artist: 'NPGX', album: 'singles', bpm: 175, genre: 'J-Punk' },
  { title: '赤信号ぶっちぎれ', romanji: 'Akashingou Bucchigire', url: cdn('/music/%E8%B5%A4%E4%BF%A1%E5%8F%B7%E3%81%B6%E3%81%A3%E3%81%A1%E3%81%8E%E3%82%8C.mp3'), artist: 'NPGX', album: 'singles', bpm: 180, genre: 'Street Punk' },
  { title: '反逆エンジン', romanji: 'Hangyaku Engine', url: cdn('/music/%E5%8F%8D%E9%80%86%E3%82%A8%E3%83%B3%E3%82%B8%E3%83%B3.mp3'), artist: 'NPGX', album: 'singles', bpm: 160, genre: 'Cyberpunk Rock' },
  { title: '反逆エンジン (Alt)', romanji: 'Hangyaku Engine (Alt)', url: cdn('/music/%E5%8F%8D%E9%80%86%E3%82%A8%E3%83%B3%E3%82%B8%E3%83%B3%20(1).mp3'), artist: 'NPGX', album: 'singles', bpm: 160, genre: 'Cyberpunk Rock' },
  { title: '地下ガールズ革命', romanji: 'Chika Girls Kakumei', url: cdn('/music/%E5%9C%B0%E4%B8%8B%E3%82%AC%E3%83%BC%E3%83%AB%E3%82%BA%E9%9D%A9%E5%91%BD.mp3'), artist: 'NPGX', album: 'singles', bpm: 165, genre: 'Underground' },
  { title: '焦げたスニーカー', romanji: 'Kogeta Sneaker', url: cdn('/music/%E7%84%A6%E3%81%92%E3%81%9F%E3%82%B9%E3%83%8B%E3%83%BC%E3%82%AB%E3%83%BC.mp3'), artist: 'NPGX', album: 'singles', bpm: 150, genre: 'Lo-Fi Punk' },
  { title: '燃えるまで噛みつけ', romanji: 'Moeru Made Kamitsuke', url: cdn('/music/%E7%87%83%E3%81%88%E3%82%8B%E3%81%BE%E3%81%A7%E5%99%9B%E3%81%BF%E3%81%A4%E3%81%91.mp3'), artist: 'NPGX', album: 'singles', bpm: 185, genre: 'Hardcore Punk' },
  { title: '燃えるまで噛みつけ (Alt)', romanji: 'Moeru Made Kamitsuke (Alt)', url: cdn('/music/%E7%87%83%E3%81%88%E3%82%8B%E3%81%BE%E3%81%A7%E5%99%9B%E3%81%BF%E3%81%A4%E3%81%91%20(1).mp3'), artist: 'NPGX', album: 'singles', bpm: 185, genre: 'Hardcore Punk' },
  { title: '爆速ギャルズ・ゼロ距離', romanji: 'Bakusoku Gals Zero Kyori', url: cdn('/music/%E7%88%86%E9%80%9F%E3%82%AE%E3%83%A3%E3%83%AB%E3%82%BA%E3%83%BB%E3%82%BC%E3%83%AD%E8%B7%9D%E9%9B%A2.mp3'), artist: 'NPGX', album: 'singles', bpm: 170, genre: 'Hyper Punk' },
  { title: '爆速ギャルズ・ゼロ距離 (Alt)', romanji: 'Bakusoku Gals Zero Kyori (Alt)', url: cdn('/music/%E7%88%86%E9%80%9F%E3%82%AE%E3%83%A3%E3%83%AB%E3%82%BA%E3%83%BB%E3%82%BC%E3%83%AD%E8%B7%9D%E9%9B%A2%20(1).mp3'), artist: 'NPGX', album: 'singles', bpm: 170, genre: 'Hyper Punk' },
];

// ── Tokyo Gutter Punk album ──
// Ordered like a tape: all A-sides first, then all B-sides
const TGP_TRACKS: MusicTrack[] = [
  // ── SIDE A ──
  { title: '路地裏の叫び', titleJa: '路地裏の叫び', romanji: 'Rojiura no Sakebi', url: cdn('/music/albums/tokyo-gutter-punk/01-a.mp3'), artist: 'NPGX', album: 'tokyo-gutter-punk', bpm: 175, genre: 'Gutter Punk', side: 'A' },
  { title: 'ネオン地獄', titleJa: 'ネオン地獄', romanji: 'Neon Jigoku', url: cdn('/music/albums/tokyo-gutter-punk/02-a.mp3'), artist: 'NPGX', album: 'tokyo-gutter-punk', bpm: 168, genre: 'Neon Punk', side: 'A' },
  { title: '暗黒東京', titleJa: '暗黒東京', romanji: 'Ankoku Tokyo', url: cdn('/music/albums/tokyo-gutter-punk/03-a.mp3'), artist: 'NPGX', album: 'tokyo-gutter-punk', bpm: 155, genre: 'Dark Punk', side: 'A' },
  { title: '錆びた刃', titleJa: '錆びた刃', romanji: 'Sabita Yaiba', url: cdn('/music/albums/tokyo-gutter-punk/04-a.mp3'), artist: 'NPGX', album: 'tokyo-gutter-punk', bpm: 180, genre: 'Thrash Punk', side: 'A' },
  { title: '下水道ブルース', titleJa: '下水道ブルース', romanji: 'Gesuidou Blues', url: cdn('/music/albums/tokyo-gutter-punk/05-a.mp3'), artist: 'NPGX', album: 'tokyo-gutter-punk', bpm: 140, genre: 'Punk Blues', side: 'A' },
  { title: '墨田川パンク', titleJa: '墨田川パンク', romanji: 'Sumidagawa Punk', url: cdn('/music/albums/tokyo-gutter-punk/06-a.mp3'), artist: 'NPGX', album: 'tokyo-gutter-punk', bpm: 165, genre: 'River Punk', side: 'A' },
  { title: '歌舞伎町ミッドナイト', titleJa: '歌舞伎町ミッドナイト', romanji: 'Kabukicho Midnight', url: cdn('/music/albums/tokyo-gutter-punk/08-a.mp3'), artist: 'NPGX', album: 'tokyo-gutter-punk', bpm: 172, genre: 'Midnight Punk', side: 'A' },
  { title: 'コンクリート・ドリーム', titleJa: 'コンクリート・ドリーム', romanji: 'Concrete Dream', url: cdn('/music/albums/tokyo-gutter-punk/09-a.mp3'), artist: 'NPGX', album: 'tokyo-gutter-punk', bpm: 148, genre: 'Dream Punk', side: 'A' },
  { title: '東京ガタパンク', titleJa: '東京ガタパンク', romanji: 'Tokyo Gutter Punk', url: cdn('/music/albums/tokyo-gutter-punk/11-a.mp3'), artist: 'NPGX', album: 'tokyo-gutter-punk', bpm: 190, genre: 'Gutter Punk', side: 'A' },
  // ── SIDE B ──
  { title: '路地裏の叫び (B)', titleJa: '路地裏の叫び', romanji: 'Rojiura no Sakebi (B)', url: cdn('/music/albums/tokyo-gutter-punk/01-b.mp3'), artist: 'NPGX', album: 'tokyo-gutter-punk', bpm: 175, genre: 'Gutter Punk', side: 'B' },
  { title: 'ネオン地獄 (B)', titleJa: 'ネオン地獄', romanji: 'Neon Jigoku (B)', url: cdn('/music/albums/tokyo-gutter-punk/02-b.mp3'), artist: 'NPGX', album: 'tokyo-gutter-punk', bpm: 168, genre: 'Neon Punk', side: 'B' },
  { title: '暗黒東京 (B)', titleJa: '暗黒東京', romanji: 'Ankoku Tokyo (B)', url: cdn('/music/albums/tokyo-gutter-punk/03-b.mp3'), artist: 'NPGX', album: 'tokyo-gutter-punk', bpm: 155, genre: 'Dark Punk', side: 'B' },
  { title: '錆びた刃 (B)', titleJa: '錆びた刃', romanji: 'Sabita Yaiba (B)', url: cdn('/music/albums/tokyo-gutter-punk/04-b.mp3'), artist: 'NPGX', album: 'tokyo-gutter-punk', bpm: 180, genre: 'Thrash Punk', side: 'B' },
  { title: '下水道ブルース (B)', titleJa: '下水道ブルース', romanji: 'Gesuidou Blues (B)', url: cdn('/music/albums/tokyo-gutter-punk/05-b.mp3'), artist: 'NPGX', album: 'tokyo-gutter-punk', bpm: 140, genre: 'Punk Blues', side: 'B' },
  { title: '墨田川パンク (B)', titleJa: '墨田川パンク', romanji: 'Sumidagawa Punk (B)', url: cdn('/music/albums/tokyo-gutter-punk/06-b.mp3'), artist: 'NPGX', album: 'tokyo-gutter-punk', bpm: 165, genre: 'River Punk', side: 'B' },
  { title: '歌舞伎町ミッドナイト (B)', titleJa: '歌舞伎町ミッドナイト', romanji: 'Kabukicho Midnight (B)', url: cdn('/music/albums/tokyo-gutter-punk/08-b.mp3'), artist: 'NPGX', album: 'tokyo-gutter-punk', bpm: 172, genre: 'Midnight Punk', side: 'B' },
  { title: 'コンクリート・ドリーム (B)', titleJa: 'コンクリート・ドリーム', romanji: 'Concrete Dream (B)', url: cdn('/music/albums/tokyo-gutter-punk/09-b.mp3'), artist: 'NPGX', album: 'tokyo-gutter-punk', bpm: 148, genre: 'Dream Punk', side: 'B' },
  { title: '東京ガタパンク (B)', titleJa: '東京ガタパンク', romanji: 'Tokyo Gutter Punk (B)', url: cdn('/music/albums/tokyo-gutter-punk/11-b.mp3'), artist: 'NPGX', album: 'tokyo-gutter-punk', bpm: 190, genre: 'Gutter Punk', side: 'B' },
];

// ── Neon Blood Riot album ──
const NBR_TRACKS: MusicTrack[] = [
  { title: 'ネオン血の暴動', titleJa: 'ネオン血の暴動', romanji: 'Neon Blood Riot', url: cdn('/music/albums/neon-blood-riot/01-a.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 175, genre: 'Riot Grrrl Punk', side: 'A' },
  { title: 'クロム拳', titleJa: 'クロム拳', romanji: 'Chrome Fist', url: cdn('/music/albums/neon-blood-riot/02-a.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 140, genre: 'Industrial Punk', side: 'A' },
  { title: '六本木戦場', titleJa: '六本木戦場', romanji: 'Roppongi Warzone', url: cdn('/music/albums/neon-blood-riot/03-a.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 170, genre: 'Street Punk', side: 'A' },
  { title: '電気芸者', titleJa: '電気芸者', romanji: 'Electric Geisha', url: cdn('/music/albums/neon-blood-riot/04-a.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 130, genre: 'Post-Punk New Wave', side: 'A' },
  { title: 'コンクリート桜', titleJa: 'コンクリート桜', romanji: 'Concrete Sakura', url: cdn('/music/albums/neon-blood-riot/05-a.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 165, genre: 'Melodic Hardcore', side: 'A' },
  { title: '火炎キス', titleJa: '火炎キス', romanji: 'Molotov Kiss', url: cdn('/music/albums/neon-blood-riot/06-a.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 190, genre: 'Hardcore Punk', side: 'A' },
  { title: '忍びガールズ', titleJa: '忍びガールズ', romanji: 'Shinobi Girls', url: cdn('/music/albums/neon-blood-riot/07-a.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 200, genre: 'Speed Punk', side: 'A' },
  { title: '秋葉原の怒り', titleJa: '秋葉原の怒り', romanji: 'Akihabara Fury', url: cdn('/music/albums/neon-blood-riot/08-a.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 180, genre: 'Noise Punk', side: 'A' },
  { title: '死んだアイドル', titleJa: '死んだアイドル', romanji: 'Dead Idols', url: cdn('/music/albums/neon-blood-riot/09-a.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 110, genre: 'Gothic Punk', side: 'A' },
  { title: 'ガソリンハート', titleJa: 'ガソリンハート', romanji: 'Gasoline Heart', url: cdn('/music/albums/neon-blood-riot/10-a.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 170, genre: 'Garage Punk', side: 'A' },
  { title: '最終列車', titleJa: '最終列車', romanji: 'Last Train to Nowhere', url: cdn('/music/albums/neon-blood-riot/11-a.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 90, genre: 'Punk Ballad', side: 'A' },
  // B-sides
  { title: 'ネオン血の暴動 (B)', titleJa: 'ネオン血の暴動', romanji: 'Neon Blood Riot (B)', url: cdn('/music/albums/neon-blood-riot/01-b.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 175, genre: 'Riot Grrrl Punk', side: 'B' },
  { title: 'クロム拳 (B)', titleJa: 'クロム拳', romanji: 'Chrome Fist (B)', url: cdn('/music/albums/neon-blood-riot/02-b.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 140, genre: 'Industrial Punk', side: 'B' },
  { title: '六本木戦場 (B)', titleJa: '六本木戦場', romanji: 'Roppongi Warzone (B)', url: cdn('/music/albums/neon-blood-riot/03-b.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 170, genre: 'Street Punk', side: 'B' },
  { title: '電気芸者 (B)', titleJa: '電気芸者', romanji: 'Electric Geisha (B)', url: cdn('/music/albums/neon-blood-riot/04-b.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 130, genre: 'Post-Punk New Wave', side: 'B' },
  { title: 'コンクリート桜 (B)', titleJa: 'コンクリート桜', romanji: 'Concrete Sakura (B)', url: cdn('/music/albums/neon-blood-riot/05-b.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 165, genre: 'Melodic Hardcore', side: 'B' },
  { title: '火炎キス (B)', titleJa: '火炎キス', romanji: 'Molotov Kiss (B)', url: cdn('/music/albums/neon-blood-riot/06-b.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 190, genre: 'Hardcore Punk', side: 'B' },
  { title: '忍びガールズ (B)', titleJa: '忍びガールズ', romanji: 'Shinobi Girls (B)', url: cdn('/music/albums/neon-blood-riot/07-b.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 200, genre: 'Speed Punk', side: 'B' },
  { title: '秋葉原の怒り (B)', titleJa: '秋葉原の怒り', romanji: 'Akihabara Fury (B)', url: cdn('/music/albums/neon-blood-riot/08-b.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 180, genre: 'Noise Punk', side: 'B' },
  { title: '死んだアイドル (B)', titleJa: '死んだアイドル', romanji: 'Dead Idols (B)', url: cdn('/music/albums/neon-blood-riot/09-b.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 110, genre: 'Gothic Punk', side: 'B' },
  { title: 'ガソリンハート (B)', titleJa: 'ガソリンハート', romanji: 'Gasoline Heart (B)', url: cdn('/music/albums/neon-blood-riot/10-b.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 170, genre: 'Garage Punk', side: 'B' },
  { title: '最終列車 (B)', titleJa: '最終列車', romanji: 'Last Train to Nowhere (B)', url: cdn('/music/albums/neon-blood-riot/11-b.mp3'), artist: 'NPGX', album: 'neon-blood-riot', bpm: 90, genre: 'Punk Ballad', side: 'B' },
];

export const ALBUMS: MusicAlbum[] = [
  {
    id: 'tokyo-gutter-punk',
    title: 'Tokyo Gutter Punk',
    titleJa: '東京ガタパンク',
    cover: cdnUrl('music/albums/tokyo-gutter-punk/cover.png'),
    year: 2026,
    tracks: TGP_TRACKS,
  },
  {
    id: 'neon-blood-riot',
    title: 'Neon Blood Riot',
    titleJa: 'ネオン血の暴動',
    cover: cdnUrl('music/albums/neon-blood-riot/cover.png'),
    year: 2026,
    tracks: NBR_TRACKS,
  },
  {
    id: 'singles',
    title: 'NPGX Singles',
    titleJa: 'シングルズ',
    cover: '/NPGX-OG.jpg',
    year: 2026,
    tracks: SINGLES,
  },
];

// Attach lyrics to tracks by matching Japanese titles
const ALL_TRACKS: MusicTrack[] = [...TGP_TRACKS, ...SINGLES].map(t => ({
  ...t,
  lyrics: getLyrics(t.title) || (t.titleJa ? getLyrics(t.titleJa) : null),
}));

interface MusicContextType {
  // Playback state
  isPlaying: boolean;
  currentTrack: number;
  currentTrackInfo: MusicTrack;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: boolean;

  // Track data
  musicTracks: MusicTrack[];
  albums: MusicAlbum[];

  // Controls
  play: () => void;
  pause: () => void;
  kill: () => void;  // pause + clear src + prevent retries (for pages with own audio)
  toggle: () => void;
  next: () => void;
  previous: () => void;
  playTrackByIndex: (index: number) => void;
  seekTo: (time: number) => void;
  setVolume: (v: number) => void;
  setMuted: (v: boolean) => void;
  setShuffle: (v: boolean) => void;
  setRepeat: (v: boolean) => void;

  // Ref for advanced usage (mixer etc.)
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
}

const MusicContext = createContext<MusicContextType | null>(null);

export function MusicProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [volume, setVolumeState] = useState(0.3);
  const [isMuted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const killedRef = useRef(false);
  const tracks = ALL_TRACKS;

  // Audio element is created LAZILY — only when play() is first called.
  // This guarantees zero audio activity on any page until the user explicitly clicks play.
  const userStartedRef = useRef(false);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    if (typeof window === 'undefined') return null;
    const audio = new Audio();
    audio.loop = false;
    audio.volume = volume;
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration || 0);
    });

    audio.addEventListener('ended', () => {
      if (killedRef.current) return;
      if (repeat) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else if (shuffle) {
        setCurrentTrack(Math.floor(Math.random() * tracks.length));
      } else {
        setCurrentTrack(prev => (prev + 1) % tracks.length);
      }
    });

    audio.addEventListener('error', () => {});
    return audio;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track change — only load if user has already started playing
  useEffect(() => {
    if (!userStartedRef.current || killedRef.current) return;
    const audio = ensureAudio();
    if (!audio || !tracks[currentTrack]) return;
    const wasPlaying = isPlaying;
    audio.src = tracks[currentTrack].url;
    audio.load();
    setProgress(0);
    setDuration(0);
    if (wasPlaying) {
      audio.play().catch(() => {});
    }
  }, [currentTrack]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, []);

  // Volume sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Progress tracking
  useEffect(() => {
    if (progressRef.current) clearInterval(progressRef.current);
    if (isPlaying) {
      progressRef.current = setInterval(() => {
        if (audioRef.current) {
          setProgress(audioRef.current.currentTime);
          if (audioRef.current.duration) setDuration(audioRef.current.duration);
        }
      }, 200);
    }
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isPlaying]);

  const play = useCallback(() => {
    if (killedRef.current) return;
    const audio = ensureAudio();
    if (!audio) return;
    userStartedRef.current = true;
    if (!audio.src && tracks[currentTrack]) {
      audio.src = tracks[currentTrack].url;
      audio.load();
    }
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [currentTrack, tracks, ensureAudio]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const kill = useCallback(() => {
    killedRef.current = true;
    userStartedRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      setIsPlaying(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) pause(); else play();
  }, [isPlaying, play, pause]);

  const next = useCallback(() => {
    if (shuffle) {
      setCurrentTrack(Math.floor(Math.random() * tracks.length));
    } else {
      setCurrentTrack(prev => (prev + 1) % tracks.length);
    }
  }, [tracks.length, shuffle]);

  const previous = useCallback(() => {
    // If more than 3s in, restart current track
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setProgress(0);
      return;
    }
    setCurrentTrack(prev => (prev - 1 + tracks.length) % tracks.length);
  }, [tracks.length]);

  const playTrackByIndex = useCallback((index: number) => {
    setCurrentTrack(index);
    setIsPlaying(true);
    // Need to play after track change effect fires
    setTimeout(() => {
      audioRef.current?.play().catch(() => {});
    }, 50);
  }, []);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (v === 0) setMuted(true);
    else if (isMuted) setMuted(false);
  }, [isMuted]);

  return (
    <MusicContext.Provider value={{
      isPlaying, currentTrack, currentTrackInfo: tracks[currentTrack] || tracks[0],
      progress, duration, volume, isMuted, shuffle, repeat,
      musicTracks: tracks, albums: ALBUMS,
      play, pause, kill, toggle, next, previous,
      playTrackByIndex, seekTo, setVolume, setMuted, setShuffle, setRepeat,
      audioRef,
    }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be used within MusicProvider');
  return ctx;
}
