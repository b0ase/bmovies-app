'use client';

import { useState, useEffect, useRef, useCallback, useReducer, lazy, Suspense } from 'react';
import { FiMusic, FiPlay, FiPause, FiSkipForward, FiSkipBack, FiMenu, FiZap, FiSliders, FiMonitor, FiType, FiSettings, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import Link from 'next/link';
import { useMusic } from '@/hooks/useMusic';

const PunkTitle3D = lazy(() => import('@/components/PunkTitle3D'));
import { type TrackLyrics } from '@/lib/lyrics';

// ── Title Designer Font Map ────────────────────────────────────────────────
// Maps title-designer preset names → canvas-compatible font strings
const TITLE_FONT_MAP = {
  punk: 'Impact, Arial Black, sans-serif',
  neon: 'Orbitron, monospace',
  elegant: 'Georgia, Times New Roman, serif',
  graffiti: 'Permanent Marker, cursive',
  cyber: 'Courier New, Lucida Console, monospace',
  manga: 'Impact, Arial Black, Helvetica Neue, sans-serif',
} as const;

// ── Kinetic Typography Particle System ────────────────────────────────────
// Motion graphics: multiple fonts, sizes, Z-rotation, rapid cuts

const KINETIC_FONTS = [
  'Orbitron, monospace',                                    // Primary — techy
  'Orbitron, monospace',                                    // Double-weighted
  'Orbitron, monospace',                                    // Triple — user wants MORE Orbitron
  'Courier New, Lucida Console, monospace',                 // Cyber
  'Georgia, Times New Roman, serif',                        // Elegant contrast
  'Permanent Marker, cursive',                              // Graffiti
  'Impact, Arial Black, sans-serif',                        // Punk (less frequent)
] as const;

const KINETIC_JA_FONT = 'Hiragino Kaku Gothic Pro, Meiryo, MS Gothic, sans-serif';

interface TextParticle {
  text: string;
  font: string;
  x: number;       // canvas x
  y: number;       // canvas y
  vx: number;      // velocity
  vy: number;
  size: number;
  rotation: number; // radians — +/-20deg
  vr: number;       // rotation velocity
  scale: number;
  targetScale: number;
  opacity: number;
  color: string;
  glow: boolean;
  glowColor: string;
  strokeWidth: number;
  life: number;     // frames remaining
  maxLife: number;
  style: 'main' | 'flash' | 'shout' | 'japanese' | 'gang' | 'whisper';
}

function spawnParticle(
  text: string,
  style: TextParticle['style'],
  cw: number,
  ch: number,
  sectionColor: string,
  beatPulse: number,
): TextParticle {
  const isJa = style === 'japanese';
  const isShout = style === 'shout' || style === 'gang';
  const isWhisper = style === 'whisper';

  // Random font — Orbitron-heavy, Japanese gets dedicated font
  const font = isJa ? KINETIC_JA_FONT : KINETIC_FONTS[Math.floor(Math.random() * KINETIC_FONTS.length)];

  // Size — BIG and dramatic
  const baseSize = isShout ? 140 + Math.random() * 100
    : isWhisper ? 30 + Math.random() * 20
    : isJa ? 90 + Math.random() * 80
    : 60 + Math.random() * 140;

  // Position — spread WIDE across full canvas, including edges/off-screen
  const x = cw * (-0.15 + Math.random() * 1.3);
  const y = ch * (-0.1 + Math.random() * 1.2);

  // Rotation — +/-30 degrees (0.52 rad)
  const maxRot = 0.52;
  const rotation = (Math.random() - 0.5) * 2 * maxRot;

  // Velocity — fast drift so they fly apart
  const speed = 2 + Math.random() * 4 + beatPulse * 5;
  const angle = Math.random() * Math.PI * 2;
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;

  // Life — SHORT and punchy — flash in, flash out
  const maxLife = isShout ? 18 + Math.floor(Math.random() * 15) : 10 + Math.floor(Math.random() * 12);

  // Color
  // Note: 'gang' is folded into isShout above, so it takes sectionColor.
  const color = isJa ? '#DC143C'
    : isShout ? sectionColor
    : isWhisper ? '#94A3B8'
    : Math.random() < 0.6 ? '#FFFFFF' : sectionColor;

  return {
    text,
    font,
    x, y, vx, vy,
    size: baseSize,
    rotation,
    vr: (Math.random() - 0.5) * 0.05, // noticeable spin
    scale: 0.1,
    targetScale: 1 + beatPulse * 0.5,
    opacity: 1,
    color,
    glow: isShout || isJa || Math.random() < 0.3,
    glowColor: isJa ? '#DC143C' : sectionColor,
    strokeWidth: isShout ? 5 : isJa ? 3 : 2,
    life: maxLife,
    maxLife,
    style,
  };
}

// ── Types ─────────────────────────────────────────────────────────────────

interface VideoClip {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
}

interface TextLayer {
  id: string;
  text: string;
  font: string;
  color: string;
  size: number;
  x: number;
  y: number;
  visible: boolean;
  strobe: boolean;
  strobeSpeed: number;
  shake: boolean;
  shakeRange: number;
}

interface MixerState {
  canvasOrientation: 'portrait' | 'landscape';
  core: {
    glitch: boolean;
    glitchIntensity: number;
    strobe: boolean;
    strobeChance: number;
    rgbShift: boolean;
    rgbShiftAmount: number;
    reverse: boolean;
    npgxFilter: boolean;
    npgxStrength: number;
    speed: number;
  };
  superFx: {
    ultraGlitch: boolean;
    ultraGlitchIntensity: number;
    realityBreak: boolean;
    realityBreakIntensity: number;
    dimensionShift: boolean;
    dimensionShiftMix: number;
    kaleidoscope: boolean;
    kaleidoSegments: number;
  };
  filters: Record<string, boolean>;
  transition: 'none' | 'fade' | 'slide' | 'zoom';
  textLayers: TextLayer[];
  videoFit: 'fill' | 'fit' | 'cinematic';
  chaosMode: boolean;
  beatSync: boolean;
  beatSensitivity: number;
  isRecording: boolean;
  jumpCutSpeed: number;
  fullscreen: boolean;
  lyricsMode: boolean;
  lyricFont: 'punk' | 'neon' | 'cyber' | 'elegant' | 'graffiti' | 'manga';
  lyricSize: number;
}

type Action =
  | { type: 'SET_CORE'; key: string; value: number | boolean }
  | { type: 'SET_SUPER'; key: string; value: number | boolean }
  | { type: 'SET_FILTER'; key: string; value: boolean }
  | { type: 'SET_TRANSITION'; value: MixerState['transition'] }
  | { type: 'SET_TEXT'; id: string; patch: Partial<TextLayer> }
  | { type: 'ADD_TEXT' }
  | { type: 'REMOVE_TEXT'; id: string }
  | { type: 'IMPORT_TITLE_LAYERS'; layers: TextLayer[] }
  | { type: 'SET'; key: keyof MixerState; value: any }
  | { type: 'CHAOS_TICK' };

const INIT: MixerState = {
  canvasOrientation: 'landscape',
  core: {
    glitch: false, glitchIntensity: 15,
    strobe: false, strobeChance: 0.015,
    rgbShift: false, rgbShiftAmount: 5,
    reverse: false,
    npgxFilter: true, npgxStrength: 0.35,
    speed: 0.7,
  },
  superFx: {
    ultraGlitch: false, ultraGlitchIntensity: 10,
    realityBreak: false, realityBreakIntensity: 15,
    dimensionShift: false, dimensionShiftMix: 15,
    kaleidoscope: false, kaleidoSegments: 6,
  },
  filters: { sepia: false, vintage: false, washedOut: false, drama: false, cool: false, warm: false, noir: false, vibrant: false, faded: false },
  transition: 'none',
  textLayers: [
    // Title is now rendered by PunkTitle3D (Three.js overlay) — no flat canvas text
  ],
  videoFit: 'cinematic',
  chaosMode: true,
  beatSync: true,
  beatSensitivity: 0.4,
  isRecording: false,
  jumpCutSpeed: 800,
  fullscreen: false,
  lyricsMode: false,
  lyricFont: 'neon',
  lyricSize: 56,
};

function reducer(state: MixerState, action: Action): MixerState {
  switch (action.type) {
    case 'SET_CORE':
      return { ...state, core: { ...state.core, [action.key]: action.value } };
    case 'SET_SUPER':
      return { ...state, superFx: { ...state.superFx, [action.key]: action.value } };
    case 'SET_FILTER':
      return { ...state, filters: { ...state.filters, [action.key]: action.value } };
    case 'SET_TRANSITION':
      return { ...state, transition: action.value };
    case 'SET_TEXT': {
      const layers = state.textLayers.map(l => l.id === action.id ? { ...l, ...action.patch } : l);
      return { ...state, textLayers: layers };
    }
    case 'ADD_TEXT':
      return { ...state, textLayers: [...state.textLayers, {
        id: `text-${Date.now()}`, text: 'NEW TEXT', font: 'Impact', color: '#FFFFFF',
        size: 32, x: 0.5, y: 0.5, visible: true, strobe: false, strobeSpeed: 200, shake: false, shakeRange: 5,
      }]};
    case 'REMOVE_TEXT':
      return { ...state, textLayers: state.textLayers.filter(l => l.id !== action.id) };
    case 'IMPORT_TITLE_LAYERS':
      return { ...state, textLayers: [...state.textLayers, ...action.layers] };
    case 'SET':
      return { ...state, [action.key]: action.value };
    case 'CHAOS_TICK':
      // Chaos only varies seek timing + playback speed — the seek IS the effect
      return {
        ...state,
        core: {
          ...state.core,
          reverse: false,
          speed: 0.5 + Math.random() * 0.5,
        },
        jumpCutSpeed: 150 + Math.random() * 500,
      };
    default:
      return state;
  }
}

// ── UI Primitives ─────────────────────────────────────────────────────────

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div className={`w-12 h-6 rounded-full relative cursor-pointer border transition-all ${enabled ? 'bg-gradient-to-r from-red-600 to-red-500 border-red-400 shadow-[0_0_15px_rgba(220,20,60,0.3)]' : 'bg-gradient-to-r from-zinc-800 to-zinc-900 border-zinc-600'}`} onClick={onToggle}>
      <div className={`absolute top-0.5 w-5 h-5 rounded-full shadow transition-transform ${enabled ? 'translate-x-6 bg-zinc-900' : 'translate-x-0.5 bg-white'}`} />
    </div>
  );
}

function MiniToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div className={`w-7 h-3.5 rounded-full relative cursor-pointer transition-all ${enabled ? 'bg-red-500' : 'bg-zinc-700'}`} onClick={onToggle}>
      <div className={`absolute top-px w-3 h-3 bg-white rounded-full transition-transform ${enabled ? 'translate-x-3.5' : 'translate-x-px'}`} />
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 border border-red-500/20 rounded-xl p-4 backdrop-blur-sm shadow-lg">
      <div className="text-white font-bold text-sm uppercase tracking-wider text-center mb-4 text-red-400">{title}</div>
      {children}
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, suffix }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-zinc-500">{label}</span>
        <span className="text-zinc-400 font-mono">{typeof value === 'number' ? (step && step < 1 ? value.toFixed(1) : value) : value}{suffix || ''}</span>
      </div>
      <input type="range" min={min} max={max} step={step || 1} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-red-500 h-1" />
    </div>
  );
}

// ── Video Timeline ────────────────────────────────────────────────────────

function VideoTimeline({ videos, currentClip, speed, onSpeedChange, onNext, onPrev, onSelectClip, defaultOpen = false }: {
  videos: VideoClip[]; currentClip: number; speed: number;
  onSpeedChange: (speed: number) => void; onNext: () => void; onPrev: () => void; onSelectClip: (index: number) => void; defaultOpen?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(!defaultOpen);
  return (
    <div className="mx-2 mt-2">
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-red-500/20 rounded-lg p-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setCollapsed(!collapsed)} className="text-zinc-400 hover:text-white transition-colors">
            <span className={`inline-block text-[10px] transition-transform ${collapsed ? '' : 'rotate-90'}`}>&#9654;</span>
          </button>
          <span className="text-white font-bold text-xs">Video Timeline</span>
          <button onClick={onPrev} className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-[11px] font-semibold transition-colors">Prev</button>
          <button onClick={onNext} className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-[11px] font-semibold transition-colors">Next</button>
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-zinc-500 text-[10px]">Speed:</span>
            <input type="range" min="0.25" max="3" value={speed} step="0.25" onChange={(e) => onSpeedChange(parseFloat(e.target.value))} className="w-16 accent-red-500 h-1" />
            <span className="text-white text-[10px] font-bold w-8">{speed.toFixed(1)}x</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-red-500/20 border border-red-500/40 rounded text-red-300">{currentClip + 1}/{videos.length}</span>
        </div>
        {!collapsed && (
          <div className="flex items-center gap-1 mt-2">
            <button onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })} className="w-7 h-12 bg-zinc-700 hover:bg-zinc-600 rounded text-sm transition-colors shrink-0">&#9664;</button>
            <div ref={scrollRef} className="flex-1 h-16 bg-zinc-800 rounded relative overflow-x-auto overflow-y-hidden flex gap-px">
              {videos.map((v, idx) => (
                <div key={v.id} onClick={() => onSelectClip(idx)}
                  className={`h-full min-w-[28px] w-[28px] flex-shrink-0 cursor-pointer relative overflow-hidden transition-all ${idx === currentClip ? 'ring-2 ring-red-400 brightness-110' : 'opacity-70 hover:opacity-100'}`}>
                  <video src={v.url} muted preload="metadata" className="w-full h-full object-cover pointer-events-none" />
                  <div className={`absolute bottom-0 left-0 right-0 text-center text-[7px] font-mono py-px ${idx === currentClip ? 'bg-red-500/80 text-white' : 'bg-black/60 text-zinc-400'}`}>{idx + 1}</div>
                </div>
              ))}
            </div>
            <button onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })} className="w-7 h-12 bg-zinc-700 hover:bg-zinc-600 rounded text-sm transition-colors shrink-0">&#9654;</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Waveform Thumb ────────────────────────────────────────────────────────

// Procedural waveform — deterministic from URL hash, no audio decode needed
function WaveformThumb({ url, isActive, width = 80, height = 48 }: { url: string; isActive: boolean; width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Seed from URL hash for consistent per-track waveforms
    let seed = 0;
    for (let i = 0; i < url.length; i++) seed = ((seed << 5) - seed + url.charCodeAt(i)) | 0;
    const rng = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed & 0x7fffffff) / 0x7fffffff; };
    ctx.clearRect(0, 0, width, height);
    const barColor = isActive ? 'rgba(220, 20, 60, 0.9)' : 'rgba(161, 161, 170, 0.5)';
    ctx.fillStyle = barColor;
    let prev = 0.5;
    for (let i = 0; i < width; i++) {
      // Smooth random walk for natural waveform shape
      prev = prev * 0.7 + rng() * 0.3;
      const barH = (0.2 + prev * 0.65) * height;
      ctx.fillRect(i, (height - barH) / 2, 1, barH);
    }
  }, [url, width, height, isActive]);
  return <canvas ref={canvasRef} width={width} height={height} className="block" style={{ imageRendering: 'pixelated' }} />;
}

// ── Audio Timeline ────────────────────────────────────────────────────────

function AudioTimeline({ tracks, currentTrack, isPlaying, onToggle, onNext, onPrev, onSelectTrack }: {
  tracks: { title: string; url: string; artist?: string }[]; currentTrack: number; isPlaying: boolean;
  onToggle: () => void; onNext: () => void; onPrev: () => void; onSelectTrack: (index: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(true);
  return (
    <div className="mx-2 mb-1">
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-red-500/20 rounded-lg p-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setCollapsed(!collapsed)} className="text-zinc-400 hover:text-white transition-colors">
            <span className={`inline-block text-[10px] transition-transform ${collapsed ? '' : 'rotate-90'}`}>&#9654;</span>
          </button>
          <span className="text-white font-bold text-xs">Audio Timeline</span>
          <button onClick={onPrev} className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-[11px] font-semibold transition-colors">Prev</button>
          <button onClick={onToggle} className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-[11px] font-semibold transition-colors">{isPlaying ? 'Pause' : 'Play'}</button>
          <button onClick={onNext} className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-[11px] font-semibold transition-colors">Next</button>
          <span className="text-[10px] px-2 py-0.5 bg-red-500/20 border border-red-500/40 rounded text-red-300 ml-auto truncate max-w-[200px]">{tracks[currentTrack]?.title || 'No audio'}</span>
        </div>
        {!collapsed && (
          <div className="flex items-center gap-1 mt-2">
            <button onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })} className="w-7 h-16 bg-zinc-700 hover:bg-zinc-600 rounded text-sm transition-colors shrink-0">&#9664;</button>
            <div ref={scrollRef} className="flex-1 h-16 bg-zinc-800 rounded overflow-x-auto overflow-y-hidden flex gap-px">
              {tracks.map((t, idx) => (
                <div key={idx} onClick={() => onSelectTrack(idx)}
                  className={`h-full min-w-[80px] w-[80px] flex-shrink-0 cursor-pointer relative overflow-hidden transition-all ${idx === currentTrack ? 'ring-2 ring-red-400 brightness-110' : 'opacity-70 hover:opacity-100'}`}>
                  <WaveformThumb url={t.url} isActive={idx === currentTrack} width={80} height={64} />
                  <div className={`absolute bottom-0 left-0 right-0 text-center text-[6px] font-mono py-px truncate px-0.5 ${idx === currentTrack ? 'bg-red-500/80 text-white' : 'bg-black/60 text-zinc-400'}`}>{t.title}</div>
                </div>
              ))}
            </div>
            <button onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })} className="w-7 h-16 bg-zinc-700 hover:bg-zinc-600 rounded text-sm transition-colors shrink-0">&#9654;</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mixer Menu ────────────────────────────────────────────────────────────

function MixerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const links = [
    { href: '/', label: 'Home' }, { href: '/xxx', label: 'Gallery' },
    { href: '/image-gen', label: 'Generate' }, { href: '/mixer', label: 'Mixer' },
    { href: '/movie-editor', label: 'Editor' }, { href: '/npgx', label: 'Characters' },
  ];
  return (
    <>
      <button onClick={() => setIsOpen(true)} className="w-10 h-8 bg-black/60 border border-red-500/40 rounded-lg flex flex-col items-center justify-center gap-0.5 hover:bg-red-500/20 transition-colors" aria-label="Menu">
        <FiMenu size={16} className="text-red-400" />
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center" onClick={() => setIsOpen(false)}>
          <div className="bg-gradient-to-b from-zinc-900 to-black border border-red-500/40 rounded-2xl p-6 max-w-xs w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-bold text-red-500" style={{ fontFamily: 'var(--font-brand)' }}>NPGX MIXER</span>
              <button onClick={() => setIsOpen(false)} className="text-red-400/70 hover:text-red-400 text-xl">&times;</button>
            </div>
            <nav className="grid grid-cols-2 gap-2">
              {links.map(l => (
                <Link key={l.href} href={l.href} onClick={() => setIsOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-center bg-white/[0.03] text-red-200/70 hover:bg-red-500/10 hover:text-red-300 border border-transparent transition-all">{l.label}</Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

// ── Panel: Super FX ───────────────────────────────────────────────────────

function SuperFxPanel({ state, dispatch }: { state: MixerState; dispatch: React.Dispatch<Action> }) {
  const fx = state.superFx;
  return (
    <Panel title="Super FX">
      {([
        ['ultraGlitch', 'Ultra Glitch', 'ultraGlitchIntensity', 100],
        ['realityBreak', 'Reality Break', 'realityBreakIntensity', 100],
        ['dimensionShift', 'Dimension Shift', 'dimensionShiftMix', 100],
        ['kaleidoscope', 'Kaleidoscope', 'kaleidoSegments', 16],
      ] as const).map(([key, label, slider, max]) => (
        <div key={key} className="mb-2 border border-red-500/10 rounded-lg bg-white/[0.02]">
          <div className="flex justify-between items-center px-3 py-2.5">
            <span className="text-zinc-400 text-xs font-medium">{label}</span>
            <Toggle enabled={fx[key] as boolean} onToggle={() => dispatch({ type: 'SET_SUPER', key, value: !fx[key] })} />
          </div>
          {fx[key] && (
            <div className="px-3 pb-3 border-t border-red-500/10">
              <Slider label="Intensity" value={fx[slider] as number} min={key === 'kaleidoscope' ? 2 : 0} max={max}
                onChange={v => dispatch({ type: 'SET_SUPER', key: slider, value: v })} />
            </div>
          )}
        </div>
      ))}
    </Panel>
  );
}

// ── Panel: Effects ────────────────────────────────────────────────────────

function EffectsPanel({ state, dispatch }: { state: MixerState; dispatch: React.Dispatch<Action> }) {
  const c = state.core;
  return (
    <Panel title="Effects">
      {([
        ['glitch', 'Glitch', 'glitchIntensity', 100],
        ['strobe', 'Strobe', 'strobeChance', 1],
        ['rgbShift', 'RGB Shift', 'rgbShiftAmount', 30],
        ['npgxFilter', 'Crimson Filter', 'npgxStrength', 1],
      ] as const).map(([key, label, slider, max]) => (
        <div key={key} className="mb-2 border border-red-500/10 rounded-lg bg-white/[0.02]">
          <div className="flex justify-between items-center px-3 py-2.5">
            <span className="text-zinc-400 text-xs font-medium">{label}</span>
            <Toggle enabled={c[key] as boolean} onToggle={() => dispatch({ type: 'SET_CORE', key, value: !c[key] })} />
          </div>
          {c[key] && (
            <div className="px-3 pb-3 border-t border-red-500/10">
              <Slider label="Amount" value={c[slider] as number} min={0} max={max} step={max <= 1 ? 0.05 : 1}
                onChange={v => dispatch({ type: 'SET_CORE', key: slider, value: v })} />
            </div>
          )}
        </div>
      ))}
      <div className="mt-2 border-t border-red-500/10 pt-3">
        <h4 className="text-red-400 text-[11px] uppercase tracking-wider mb-2">Filters</h4>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.keys(state.filters).map(f => (
            <label key={f} className="flex items-center gap-1.5 text-zinc-500 text-[11px] cursor-pointer hover:text-white transition-colors">
              <input type="checkbox" checked={state.filters[f]} onChange={() => dispatch({ type: 'SET_FILTER', key: f, value: !state.filters[f] })} className="w-3.5 h-3.5 accent-red-500" />
              {f.charAt(0).toUpperCase() + f.slice(1).replace(/([A-Z])/g, ' $1')}
            </label>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <h4 className="text-red-400 text-[11px] uppercase tracking-wider mb-2">Transitions</h4>
        <select value={state.transition} onChange={e => dispatch({ type: 'SET_TRANSITION', value: e.target.value as any })}
          className="w-full p-2 bg-zinc-900 border border-red-500/20 rounded text-white text-xs">
          <option value="none">No Wipe</option><option value="fade">Fade</option><option value="slide">Slide</option><option value="zoom">Zoom</option>
        </select>
      </div>
    </Panel>
  );
}

// ── Panel: Text ───────────────────────────────────────────────────────────

function TextPanel({ state, dispatch }: { state: MixerState; dispatch: React.Dispatch<Action> }) {
  const [importing, setImporting] = useState(false);

  // Load saved title designs from localStorage (shared with /title-designer)
  const loadFromTitleDesigner = () => {
    try {
      const raw = localStorage.getItem('npgx-title-designs');
      if (!raw) { alert('No saved title designs found. Create one at /title-designer first.'); return; }
      const designs = JSON.parse(raw);
      if (!designs.length) { alert('No saved title designs found.'); return; }

      // Use the most recent design
      const latest = designs[0];
      const imported: TextLayer[] = latest.layers.map((l: any, i: number) => ({
        id: `imported-${Date.now()}-${i}`,
        text: l.text || 'TEXT',
        font: TITLE_FONT_MAP[l.preset as keyof typeof TITLE_FONT_MAP] || l.preset || 'Impact',
        color: l.color || '#ef4444',
        size: Math.round(l.fontSize * 0.7) || 48, // Scale down slightly for mixer canvas
        x: (l.x || 450) / (latest.canvasWidth || 900), // Convert absolute → relative
        y: (l.y || 320) / (latest.canvasHeight || 640),
        visible: true,
        strobe: false,
        strobeSpeed: 200,
        shake: false,
        shakeRange: 5,
      }));

      dispatch({ type: 'IMPORT_TITLE_LAYERS', layers: imported });
    } catch {
      alert('Failed to load title designs.');
    }
  };

  // Generate title via API
  const generateTitle = async (text: string, font: string) => {
    setImporting(true);
    try {
      const res = await fetch('/api/title-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layers: [{ text, font: font || 'punk', fontSize: 72, color: '#ef4444' }],
          width: 900,
          height: 640,
          background: 'transparent',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Store the SVG for potential overlay use
        console.log('[mixer] Title SVG generated:', data.svg?.length, 'bytes');
      }
    } catch (err) {
      console.warn('[mixer] Title API error:', err);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Panel title="Text">
      <div className="flex gap-1.5 mb-3">
        <button onClick={() => dispatch({ type: 'ADD_TEXT' })}
          className="flex-1 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-xs font-semibold transition-colors">+ Add Text</button>
        <button onClick={loadFromTitleDesigner}
          className="flex-1 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded text-xs font-semibold text-purple-300 transition-colors">
          Import Design
        </button>
      </div>
      {state.textLayers.map(layer => (
        <div key={layer.id} className="bg-white/[0.03] border border-red-500/10 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <MiniToggle enabled={layer.visible} onToggle={() => dispatch({ type: 'SET_TEXT', id: layer.id, patch: { visible: !layer.visible } })} />
            <button onClick={() => dispatch({ type: 'REMOVE_TEXT', id: layer.id })} className="text-zinc-600 hover:text-red-400 text-xs">Remove</button>
          </div>
          <input type="text" value={layer.text}
            onChange={e => dispatch({ type: 'SET_TEXT', id: layer.id, patch: { text: e.target.value } })}
            className="w-full bg-zinc-800 text-white border border-zinc-600 rounded px-2 py-1 text-xs mb-1.5" />
          <div className="flex gap-1.5 items-center mb-1.5">
            <select value={layer.font} onChange={e => dispatch({ type: 'SET_TEXT', id: layer.id, patch: { font: e.target.value } })}
              className="flex-1 bg-zinc-800 text-white border border-zinc-600 rounded px-1 py-0.5 text-[11px]">
              <optgroup label="Standard">
                <option value="Impact">Impact</option>
                <option value="Arial">Arial</option>
                <option value="Courier New">Courier New</option>
              </optgroup>
              <optgroup label="Title Designer">
                <option value="Impact, Arial Black, sans-serif">Punk</option>
                <option value="Orbitron, monospace">Neon</option>
                <option value="Georgia, Times New Roman, serif">Elegant</option>
                <option value="Permanent Marker, cursive">Graffiti</option>
                <option value="Courier New, Lucida Console, monospace">Cyber</option>
                <option value="Impact, Arial Black, Helvetica Neue, sans-serif">Manga</option>
              </optgroup>
            </select>
            <input type="color" value={layer.color}
              onChange={e => dispatch({ type: 'SET_TEXT', id: layer.id, patch: { color: e.target.value } })}
              className="w-8 h-6 border-0 rounded cursor-pointer" />
          </div>
          <Slider label="Size" value={layer.size} min={10} max={120} onChange={v => dispatch({ type: 'SET_TEXT', id: layer.id, patch: { size: v } })} suffix="px" />
          <Slider label="X" value={Math.round(layer.x * 100)} min={0} max={100} onChange={v => dispatch({ type: 'SET_TEXT', id: layer.id, patch: { x: v / 100 } })} suffix="%" />
          <Slider label="Y" value={Math.round(layer.y * 100)} min={0} max={100} onChange={v => dispatch({ type: 'SET_TEXT', id: layer.id, patch: { y: v / 100 } })} suffix="%" />
          <div className="flex items-center gap-3 mt-2 text-[10px]">
            <label className="flex items-center gap-1 text-zinc-500 cursor-pointer">
              <input type="checkbox" checked={layer.strobe} onChange={() => dispatch({ type: 'SET_TEXT', id: layer.id, patch: { strobe: !layer.strobe } })} className="accent-red-500" /> Strobe
            </label>
            <label className="flex items-center gap-1 text-zinc-500 cursor-pointer">
              <input type="checkbox" checked={layer.shake} onChange={() => dispatch({ type: 'SET_TEXT', id: layer.id, patch: { shake: !layer.shake } })} className="accent-red-500" /> Shake
            </label>
          </div>
        </div>
      ))}
      <a href="/title-designer" target="_blank" rel="noopener noreferrer"
        className="block text-center text-[10px] text-zinc-600 hover:text-purple-400 mt-2 transition-colors">
        Open Title Designer for advanced editing
      </a>
    </Panel>
  );
}

// ── Panel: Settings ───────────────────────────────────────────────────────

function SettingsPanel({ state, dispatch, clipCount, currentClip, onRecord, onStopRecord }: {
  state: MixerState; dispatch: React.Dispatch<Action>; clipCount: number; currentClip: number;
  onRecord: () => void; onStopRecord: () => void;
}) {
  return (
    <Panel title="Settings">
      <div className="flex gap-2 mb-4">
        {state.isRecording ? (
          <button onClick={onStopRecord} className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded text-xs font-semibold flex-1 transition-colors animate-pulse">Stop Recording</button>
        ) : (
          <button onClick={onRecord} className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded text-xs font-semibold flex-1 transition-colors">Record</button>
        )}
      </div>

      {/* Video Fit Mode */}
      <div className="mb-4">
        <label className="text-red-400 text-[11px] uppercase tracking-wider block mb-2">Video Mode</label>
        <div className="grid grid-cols-3 gap-1.5">
          {([['fill', 'Fill'], ['cinematic', 'Cinema'], ['fit', 'Fit']] as const).map(([mode, label]) => (
            <button key={mode} onClick={() => dispatch({ type: 'SET', key: 'videoFit', value: mode })}
              className={`py-2 rounded text-[10px] font-bold uppercase transition-colors ${state.videoFit === mode ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-zinc-600 text-[10px] mt-1">
          {state.videoFit === 'fill' ? 'Zoom to fill — crops edges' : state.videoFit === 'cinematic' ? 'Blurred background + sharp center' : 'Fit inside — black bars'}
        </p>
      </div>

      {/* Canvas orientation */}
      <div className="mb-4">
        <label className="text-red-400 text-[11px] uppercase tracking-wider block mb-2">Canvas</label>
        <div className="grid grid-cols-2 gap-2">
          {(['portrait', 'landscape'] as const).map(o => (
            <button key={o} onClick={() => dispatch({ type: 'SET', key: 'canvasOrientation', value: o })}
              className={`py-2 rounded text-xs font-bold uppercase transition-colors ${state.canvasOrientation === o ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}>
              {o === 'portrait' ? '9:16' : '16:9'}
            </button>
          ))}
        </div>
      </div>

      {/* Chaos mode */}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h4 className="text-red-400 text-[11px] uppercase tracking-wider">Chaos Mode</h4>
          <p className="text-zinc-500 text-[10px]">{state.chaosMode ? 'Auto-randomizing effects' : 'Manual control'}</p>
        </div>
        <Toggle enabled={state.chaosMode} onToggle={() => dispatch({ type: 'SET', key: 'chaosMode', value: !state.chaosMode })} />
      </div>

      {/* Beat sync */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h4 className="text-red-400 text-[11px] uppercase tracking-wider">Beat Sync</h4>
            <p className="text-zinc-500 text-[10px]">{state.beatSync ? 'Effects pulse with music' : 'Off'}</p>
          </div>
          <Toggle enabled={state.beatSync} onToggle={() => dispatch({ type: 'SET', key: 'beatSync', value: !state.beatSync })} />
        </div>
        {state.beatSync && (
          <Slider label="Sensitivity" value={state.beatSensitivity} min={0.1} max={1} step={0.05}
            onChange={v => dispatch({ type: 'SET', key: 'beatSensitivity', value: v })} />
        )}
      </div>

      {/* Jump cut speed */}
      <Slider label="Jump Cut Speed" value={state.jumpCutSpeed} min={50} max={2000} step={50}
        onChange={v => dispatch({ type: 'SET', key: 'jumpCutSpeed', value: v })} suffix="ms" />

      {/* Lyrics overlay */}
      <div className="mb-4 mt-4 border-t border-red-500/10 pt-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h4 className="text-red-400 text-[11px] uppercase tracking-wider">Lyrics Overlay</h4>
            <p className="text-zinc-500 text-[10px]">{state.lyricsMode ? 'Synced to playback' : 'Off'}</p>
          </div>
          <Toggle enabled={state.lyricsMode} onToggle={() => dispatch({ type: 'SET', key: 'lyricsMode', value: !state.lyricsMode })} />
        </div>
        {state.lyricsMode && (
          <>
            <div className="mb-2">
              <label className="text-zinc-500 text-[10px] block mb-1">Font Style</label>
              <select value={state.lyricFont} onChange={e => dispatch({ type: 'SET', key: 'lyricFont', value: e.target.value })}
                className="w-full p-1.5 bg-zinc-900 border border-red-500/20 rounded text-white text-xs">
                <option value="neon">Neon (Orbitron)</option>
                <option value="cyber">Cyber (Monospace)</option>
                <option value="punk">Punk (Impact)</option>
                <option value="elegant">Elegant (Serif)</option>
                <option value="graffiti">Graffiti (Marker)</option>
                <option value="manga">Manga (Bold)</option>
              </select>
            </div>
            <Slider label="Lyric Size" value={state.lyricSize} min={24} max={96} step={2}
              onChange={v => dispatch({ type: 'SET', key: 'lyricSize', value: v })} suffix="px" />
          </>
        )}
      </div>

      {/* Info */}
      <div className="bg-white/[0.03] border border-red-500/10 rounded-lg p-3 mt-4">
        {[['Clip', `${currentClip + 1} / ${clipCount}`], ['Mode', (state.videoFit || 'cinematic').toUpperCase()], ['Canvas', state.canvasOrientation === 'portrait' ? '9:16' : '16:9'], ['Chaos', state.chaosMode ? 'ON' : 'OFF'], ['Beat', state.beatSync ? 'ON' : 'OFF']].map(([label, value]) => (
          <div key={label} className="flex justify-between py-1 text-[11px] border-b border-red-500/10 last:border-0">
            <span className="text-zinc-500">{label}:</span>
            <span className="text-white font-bold">{value}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ── Mobile helpers ────────────────────────────────────────────────────────

const PANELS = [
  { key: 'super-fx', label: 'Super FX', icon: FiZap },
  { key: 'effects', label: 'Effects', icon: FiSliders },
  { key: 'preview', label: 'Preview', icon: FiMonitor },
  { key: 'text', label: 'Text', icon: FiType },
  { key: 'settings', label: 'Settings', icon: FiSettings },
] as const;

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => { const c = () => setM(window.innerWidth < 768); c(); window.addEventListener('resize', c); return () => window.removeEventListener('resize', c); }, []);
  return m;
}

function useSwipe(onLeft: () => void, onRight: () => void) {
  const ts = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => { ts.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, []);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!ts.current) return;
    const dx = e.changedTouches[0].clientX - ts.current.x;
    const dy = e.changedTouches[0].clientY - ts.current.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { dx < 0 ? onLeft() : onRight(); }
    ts.current = null;
  }, [onLeft, onRight]);
  return { onTouchStart, onTouchEnd };
}

// ── MAIN MIXER ────────────────────────────────────────────────────────────

function NPGXMixer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animFrameRef = useRef<number>(0);
  const stateRef = useRef<MixerState>(INIT);
  const beatPulseRef = useRef(0);
  const bassAvgRef = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [analyserForTitle, setAnalyserForTitle] = useState<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transitionRef = useRef({ active: false, progress: 0, startTime: 0 });
  const prevFrameRef = useRef<ImageData | null>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [state, dispatch] = useReducer(reducer, INIT);
  const [videos, setVideos] = useState<VideoClip[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  const { isPlaying: isMusicPlaying, toggle: toggleMusic, next: nextTrack, previous: prevTrack,
    currentTrack: currentMusicTrack, playTrackByIndex: setCurrentMusicTrack,
    musicTracks, currentTrackInfo, audioRef, progress: musicProgress, duration: musicDuration,
  } = useMusic();

  // Lyrics ref — updated each frame from the current track
  const lyricsRef = useRef<TrackLyrics | null>(null);
  const musicProgressRef = useRef(0);
  const musicDurationRef = useRef(0);
  const trackInfoRef = useRef(currentTrackInfo);
  const particlesRef = useRef<TextParticle[]>([]);
  const lastCueIndexRef = useRef(-1);
  useEffect(() => { lyricsRef.current = currentTrackInfo?.lyrics || null; trackInfoRef.current = currentTrackInfo; lastCueIndexRef.current = -1; particlesRef.current = []; }, [currentTrackInfo]);
  useEffect(() => { musicProgressRef.current = musicProgress; }, [musicProgress]);
  useEffect(() => { musicDurationRef.current = musicDuration; }, [musicDuration]);


  // Keep stateRef in sync
  useEffect(() => { stateRef.current = state; }, [state]);

  // Music auto-play disabled

  // Load videos from manifest
  useEffect(() => {
    fetch('/NPG-X-10/manifest.json').then(r => r.json()).then((data: { collections: Record<string, { items: { uuid: string; video?: string; width?: number; height?: number; orientation?: string }[] }> }) => {
      const all = Object.values(data.collections).flatMap(c => c.items).filter(i => i.video);
      const vids: VideoClip[] = all.map((v, i) => ({
        id: `npgx-${i + 1}`, name: v.uuid, url: `/NPG-X-10/${v.video}`,
        width: v.width || 464, height: v.height || 688,
        orientation: (v.orientation as 'portrait' | 'landscape') || (v.width && v.height && v.width > v.height ? 'landscape' : 'portrait'),
      }));
      // Fetch adult content videos dynamically
      fetch('/api/adult-content').then(r => r.json()).then((ac: { videos: string[] }) => {
        const adultVids: VideoClip[] = (ac.videos || []).map((url, i) => ({
          id: `adult-${i + 1}`, name: url.split('/').pop()?.replace('.mp4', '') || `adult-${i}`, url,
          width: 1024, height: 576, orientation: 'landscape' as const,
        }));
        const combined = [...vids, ...adultVids];
        for (let i = combined.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [combined[i], combined[j]] = [combined[j], combined[i]];
        }
        if (combined.length > 0) setVideos(combined);
      }).catch(() => {
        if (vids.length > 0) setVideos(vids);
      });
    }).catch(console.error);
  }, []);

  // Video loading
  useEffect(() => {
    if (videos.length > 0 && videoRef.current) {
      const video = videos[currentVideoIndex];
      videoRef.current.src = video.url;
      videoRef.current.onerror = () => { if (videos.length > 1) setCurrentVideoIndex(p => (p + 1) % videos.length); };
      videoRef.current.onloadedmetadata = () => {
        // Canvas stays landscape — portrait clips get cinematic fill treatment
        if (stateRef.current.canvasOrientation !== 'landscape') {
          dispatch({ type: 'SET', key: 'canvasOrientation', value: 'landscape' });
        }
      };
      videoRef.current.onloadeddata = () => { videoRef.current?.play().catch(() => {}); };
      videoRef.current.load();
      // No transition overlay — buffer canvas prevents black frames during load
    }
  }, [currentVideoIndex, videos]);

  // Playback speed
  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = state.core.speed; }, [state.core.speed]);

  // Beat detection setup — retry on user interaction if audio not ready
  const setupBeatDetection = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audioCtxRef.current) return;
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      sourceNodeRef.current = source;
      analyserRef.current = analyser;
      setAnalyserForTitle(analyser);
    } catch (e) {
      console.warn('[mixer] Audio analysis setup failed:', e);
    }
  }, [audioRef]);

  useEffect(() => {
    setupBeatDetection();
    // Retry on first user interaction if audio wasn't ready
    const retry = () => { setupBeatDetection(); document.removeEventListener('click', retry); };
    document.addEventListener('click', retry, { once: true });
    return () => document.removeEventListener('click', retry);
  }, [setupBeatDetection]);

  // Chaos mode
  useEffect(() => {
    if (!state.chaosMode) return;
    const id = setInterval(() => dispatch({ type: 'CHAOS_TICK' }), 3000);
    return () => clearInterval(id);
  }, [state.chaosMode]);

  // Jump cuts — aggressive mixing, fast seeks, frequent clip switches
  useEffect(() => {
    if (videos.length === 0) return;
    let lastSwitch = 0;
    const id = setInterval(() => {
      const now = Date.now();
      // Switch to a new clip ~20% of the time (min 3s between switches)
      if (Math.random() < 0.2 && now - lastSwitch > 3000 && videos.length > 1) {
        lastSwitch = now;
        setCurrentVideoIndex(Math.floor(Math.random() * videos.length));
      } else if (videoRef.current?.duration) {
        // Fast seek within current clip
        videoRef.current.currentTime = Math.random() * videoRef.current.duration;
      }
    }, state.jumpCutSpeed);
    return () => clearInterval(id);
  }, [videos, state.jumpCutSpeed]);

  // ── Canvas render loop ──────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const freqData = new Uint8Array(128);

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) { animFrameRef.current = requestAnimationFrame(render); return; }

      const s = stateRef.current;
      const isPortrait = s.canvasOrientation === 'portrait';
      const cw = isPortrait ? 720 : 1280;
      const ch = isPortrait ? 1280 : 720;
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }

      // Beat detection
      if (analyserRef.current && s.beatSync) {
        analyserRef.current.getByteFrequencyData(freqData);
        let bass = 0;
        for (let i = 0; i < 6; i++) bass += freqData[i];
        bass /= 6;
        const avg = bassAvgRef.current;
        bassAvgRef.current = avg * 0.92 + bass * 0.08;
        const threshold = bassAvgRef.current * (1 + s.beatSensitivity);
        if (bass > threshold && bass > 80) {
          beatPulseRef.current = Math.min(1, beatPulseRef.current + 0.6);
          // Beat-triggered jump cut — cut hard on the beat
          if (beatPulseRef.current > 0.5 && Math.random() < 0.3) {
            if (Math.random() < 0.15 && videos.length > 1) {
              setCurrentVideoIndex(Math.floor(Math.random() * videos.length));
            } else if (video.duration) {
              video.currentTime = Math.random() * video.duration;
            }
          }
        }
        beatPulseRef.current *= 0.92; // decay
      } else {
        beatPulseRef.current *= 0.95;
      }
      const bp = beatPulseRef.current;

      // Draw video — even during seeks! The seek stutter/artifact IS the glitch effect.
      // Only fall back to buffer if video has zero data (initial load).
      const hasAnyData = video.readyState >= 1;
      const videoReady = video.readyState >= 2;

      if (hasAnyData) {
        // Draw whatever frame the video has — during seeks this gives natural glitch
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, cw, ch);
        const vw = video.videoWidth || 1, vh = video.videoHeight || 1;
        const isPortraitClip = vh > vw;

        const fitMode = s.videoFit || 'cinematic';

        if (fitMode === 'fill') {
          const scale = Math.max(cw / vw, ch / vh);
          const dw = vw * scale, dh = vh * scale;
          const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
          ctx.drawImage(video, dx, dy, dw, dh);
        } else if (fitMode === 'cinematic' && isPortraitClip) {
          const bgScale = Math.max(cw / vw, ch / vh) * 1.15;
          const bgW = vw * bgScale, bgH = vh * bgScale;
          ctx.filter = 'blur(20px) brightness(0.3)';
          ctx.drawImage(video, (cw - bgW) / 2, (ch - bgH) / 2, bgW, bgH);
          ctx.filter = 'none';
          const fgScale = Math.min(cw / vw, ch / vh);
          const fgW = vw * fgScale, fgH = vh * fgScale;
          ctx.drawImage(video, (cw - fgW) / 2, (ch - fgH) / 2, fgW, fgH);
        } else {
          const scale = Math.min(cw / vw, ch / vh);
          const dw = vw * scale, dh = vh * scale;
          const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
          ctx.drawImage(video, dx, dy, dw, dh);
        }

        // Save good frames (not seeking) to buffer for initial-load fallback
        if (videoReady && !video.seeking) {
          if (!bufferCanvasRef.current) bufferCanvasRef.current = document.createElement('canvas');
          const buf = bufferCanvasRef.current;
          if (buf.width !== cw || buf.height !== ch) { buf.width = cw; buf.height = ch; }
          buf.getContext('2d')?.drawImage(canvas, 0, 0);
        }
      } else if (bufferCanvasRef.current) {
        // No data at all — draw last good frame from buffer
        ctx.drawImage(bufferCanvasRef.current, 0, 0, cw, ch);
      }

        // ── Super FX ────────────────────────────────────────
        // Ultra Glitch — copy random rects to offset positions
        if (s.superFx.ultraGlitch) {
          const intensity = s.superFx.ultraGlitchIntensity * (1 + bp);
          const count = Math.floor(intensity / 10);
          for (let i = 0; i < count; i++) {
            const sx = Math.random() * cw, sy = Math.random() * ch;
            const sw = 20 + Math.random() * (intensity * 2);
            const sh = 5 + Math.random() * 30;
            const ox = (Math.random() - 0.5) * intensity * 2;
            try { const block = ctx.getImageData(sx, sy, sw, sh); ctx.putImageData(block, sx + ox, sy); } catch {}
          }
        }

        // Reality Break — horizontal line displacement
        if (s.superFx.realityBreak) {
          const intensity = s.superFx.realityBreakIntensity * (1 + bp * 2);
          const lines = Math.floor(intensity / 5);
          for (let i = 0; i < lines; i++) {
            const y = Math.floor(Math.random() * ch);
            const h = 2 + Math.floor(Math.random() * 8);
            const offset = (Math.random() - 0.5) * intensity;
            try { const strip = ctx.getImageData(0, y, cw, h); ctx.putImageData(strip, offset, y); } catch {}
          }
        }

        // Dimension Shift — RGB channel separation
        if (s.superFx.dimensionShift) {
          const mix = s.superFx.dimensionShiftMix * (1 + bp) / 100;
          const shift = Math.floor(mix * 15);
          if (shift > 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.3;
            ctx.drawImage(canvas, shift, 0);
            ctx.drawImage(canvas, -shift, 0);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
          }
        }

        // ── Color filters (GPU-accelerated via ctx.filter) ────────
        const filterParts: string[] = [];
        if (s.filters.sepia) filterParts.push('sepia(1)');
        if (s.filters.noir) filterParts.push('grayscale(1) contrast(1.5)');
        if (s.filters.cool) filterParts.push('hue-rotate(15deg) saturate(1.1)');
        if (s.filters.warm) filterParts.push('sepia(0.25) saturate(1.2)');
        if (s.filters.vibrant) filterParts.push('saturate(1.6)');
        if (s.filters.faded) filterParts.push('brightness(1.2) contrast(0.75)');
        if (s.filters.vintage) filterParts.push('sepia(0.35) contrast(0.9) brightness(1.05)');
        if (s.filters.drama) filterParts.push('contrast(1.5) brightness(0.85)');
        if (s.filters.washedOut) filterParts.push('brightness(1.25) contrast(0.7)');
        if (filterParts.length > 0) {
          ctx.filter = filterParts.join(' ');
          ctx.drawImage(canvas, 0, 0);
          ctx.filter = 'none';
        }

        // Crimson filter — red overlay via compositing (no per-pixel loop)
        if (s.core.npgxFilter) {
          const str = s.core.npgxStrength;
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = `rgb(255, ${Math.round(255 - str * 40)}, ${Math.round(255 - str * 80)})`;
          ctx.fillRect(0, 0, cw, ch);
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = `rgba(60, 0, 0, ${str * 0.15})`;
          ctx.fillRect(0, 0, cw, ch);
          ctx.globalCompositeOperation = 'source-over';
        }

        // ── Pixel effects — only for glitch/RGB that need raw access ────────
        const needsPixelAccess = s.core.glitch || s.core.rgbShift;
        if (needsPixelAccess) {
          const intensity = s.core.glitchIntensity * (1 + bp);
          const imageData = ctx.getImageData(0, 0, cw, ch);
          const d = imageData.data;
          const len = d.length;

          // Glitch noise — sparse sampling (every 64th pixel)
          if (s.core.glitch) {
            const threshold = intensity / 8000;
            for (let i = 0; i < len; i += 64) {
              if (Math.random() < threshold) {
                d[i] = 255; d[i + 1] = Math.random() * 50; d[i + 2] = Math.random() * 50;
              }
            }
          }

          // RGB shift
          if (s.core.rgbShift) {
            const shift = Math.floor((Math.sin(Date.now() / 100) * s.core.rgbShiftAmount * (1 + bp))) * 4;
            if (shift !== 0) {
              for (let i = 0; i < len; i += 4) {
                const si = i + shift;
                if (si >= 0 && si < len) d[i] = d[si + 1];
              }
            }
          }

          ctx.putImageData(imageData, 0, 0);
        }

        // Glitch blocks
        if (s.core.glitch && Math.random() < (s.core.glitchIntensity * (1 + bp)) / 100) {
          const x = Math.random() * cw, y = Math.random() * ch;
          ctx.fillStyle = `rgba(220,${Math.random() * 20 | 0},${Math.random() * 60 | 0},0.4)`;
          ctx.fillRect(x, y, Math.random() * 100, Math.random() * 100);
        }

        // Strobe flash — subtle accent, not seizure-inducing
        if (s.core.strobe) {
          const chance = s.beatSync ? (bp > 0.6 ? 0.04 : 0.005) : s.core.strobeChance;
          if (Math.random() < chance) {
            ctx.fillStyle = `rgba(220, 20, 60, ${0.12 + bp * 0.18})`;
            ctx.fillRect(0, 0, cw, ch);
          }
        }

        // Transition overlay
        if (transitionRef.current.active) {
          const elapsed = performance.now() - transitionRef.current.startTime;
          const duration = 300;
          const progress = Math.min(1, elapsed / duration);
          if (s.transition === 'fade') {
            ctx.fillStyle = `rgba(0,0,0,${1 - progress})`;
            ctx.fillRect(0, 0, cw, ch);
          } else if (s.transition === 'zoom') {
            const zoomScale = 1 + (1 - progress) * 0.3;
            ctx.save();
            ctx.translate(cw / 2, ch / 2);
            ctx.scale(zoomScale, zoomScale);
            ctx.translate(-cw / 2, -ch / 2);
            ctx.globalAlpha = progress;
            ctx.drawImage(canvas, 0, 0);
            ctx.restore();
            ctx.globalAlpha = 1;
          }
          if (progress >= 1) transitionRef.current.active = false;
        }

        // ── Text layers ─────────────────────────────────────
        const now = Date.now();
        for (const layer of s.textLayers) {
          if (!layer.visible) continue;
          if (layer.strobe && (now % (layer.strobeSpeed * 2)) > layer.strobeSpeed) continue;

          let tx = layer.x * cw;
          let ty = layer.y * ch;
          if (layer.shake) {
            const range = layer.shakeRange * (1 + bp * 3);
            tx += (Math.random() - 0.5) * range * 2;
            ty += (Math.random() - 0.5) * range * 2;
          }

          const fontSize = layer.size * (1 + bp * 0.1);
          ctx.font = `900 ${fontSize}px ${layer.font}, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Black outline for readability
          ctx.strokeStyle = 'rgba(0,0,0,0.9)';
          ctx.lineWidth = 3;
          ctx.strokeText(layer.text, tx, ty);

          ctx.fillStyle = layer.color;
          ctx.shadowColor = layer.color;
          ctx.shadowBlur = 8 + bp * 20;
          ctx.fillText(layer.text, tx, ty);
          ctx.shadowBlur = 0;
        }

        // ── Kinetic Typography Particle System ──────────────────
        if (s.lyricsMode && lyricsRef.current) {
          const lyrics = lyricsRef.current;
          const totalCues = lyrics.cues.length;
          const dur = musicDurationRef.current;
          const prog = musicProgressRef.current;

          // Section colors
          const secColors: Record<string, string> = {
            chorus: '#DC143C', verse: '#FFFFFF', bridge: '#A855F7',
            breakdown: '#F97316', intro: '#22D3EE', outro: '#F97316',
          };

          if (totalCues > 0 && dur > 0) {
            const cueTime = dur / totalCues;
            const cueIndex = Math.min(Math.floor(prog / cueTime), totalCues - 1);
            const currentCue = lyrics.cues[Math.max(0, cueIndex)];
            const sColor = secColors[currentCue.section] || '#FFFFFF';

            // ── Spawn particles on cue change
            if (cueIndex !== lastCueIndexRef.current) {
              lastCueIndexRef.current = cueIndex;
              // Main cue text — 3-6 particles, spread wide
              const count = currentCue.style === 'shout' || currentCue.style === 'gang' ? 6 : 3 + Math.floor(Math.random() * 3);
              for (let i = 0; i < count; i++) {
                particlesRef.current.push(spawnParticle(currentCue.text, currentCue.style, cw, ch, sColor, bp));
              }
              // Spawn fragments — split text into words for extra particles
              const words = currentCue.text.split(/\s+/).filter(w => w.length > 1);
              for (const w of words) {
                if (Math.random() < 0.7) particlesRef.current.push(spawnParticle(w, 'flash', cw, ch, sColor, bp));
              }
              // Nearby Japanese cue as bonus particles
              for (let i = Math.max(0, cueIndex - 3); i <= Math.min(totalCues - 1, cueIndex + 3); i++) {
                if (lyrics.cues[i].style === 'japanese' && i !== cueIndex && Math.random() < 0.7) {
                  particlesRef.current.push(spawnParticle(lyrics.cues[i].text, 'japanese', cw, ch, sColor, bp));
                }
              }
            }

            // ── Beat-triggered flash particles — aggressive, multiple per beat
            if (bp > 0.3) {
              const flashCount = bp > 0.7 ? 4 : bp > 0.5 ? 3 : 2;
              for (let f = 0; f < flashCount; f++) {
                if (Math.random() < 0.7) {
                  const source = lyrics.cues[Math.floor(Math.random() * totalCues)];
                  const words = source.text.split(/\s+/).filter(w => w.length > 1);
                  const word = words[Math.floor(Math.random() * words.length)] || source.text;
                  particlesRef.current.push(spawnParticle(word, 'flash', cw, ch, sColor, bp));
                }
              }
            }
          }

          // ── Update & draw particles
          const alive: TextParticle[] = [];
          for (const p of particlesRef.current) {
            p.life--;
            if (p.life <= 0) continue;

            // Physics
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.vr;

            // Scale: SNAP in instantly, hold, then vanish
            const lifeRatio = p.life / p.maxLife;
            if (lifeRatio > 0.8) {
              // Entry — instant pop
              p.scale += (p.targetScale - p.scale) * 0.7;
            } else if (lifeRatio < 0.15) {
              // Exit — fast shrink
              p.scale *= 0.8;
            }

            // Opacity: hard cut in, sharp fade out
            p.opacity = lifeRatio < 0.15 ? lifeRatio / 0.15 : 1;

            // Beat pulse boost
            const bpScale = 1 + bp * 0.15;
            const fontSize = p.size * p.scale * bpScale;
            if (fontSize < 2) continue;

            ctx.save();
            ctx.globalAlpha = p.opacity;

            // Z-rotation transform
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);

            ctx.font = `900 ${fontSize}px ${p.font}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineJoin = 'round';

            // Glow
            if (p.glow) {
              ctx.shadowColor = p.glowColor;
              ctx.shadowBlur = 15 + bp * 40;
            }

            // Black stroke for readability
            ctx.strokeStyle = 'rgba(0,0,0,0.9)';
            ctx.lineWidth = p.strokeWidth;
            ctx.strokeText(p.text, 0, 0);

            // Fill
            ctx.fillStyle = p.color;
            ctx.fillText(p.text, 0, 0);

            ctx.restore();
            alive.push(p);
          }
          // Cap particles — higher limit for dense text storms
          particlesRef.current = alive.length > 120 ? alive.slice(-120) : alive;

          // Section indicator (subtle, bottom-left)
          if (lyricsRef.current.cues.length > 0) {
            const dur2 = musicDurationRef.current;
            const prog2 = musicProgressRef.current;
            if (dur2 > 0) {
              const ci = Math.min(Math.floor(prog2 / (dur2 / lyricsRef.current.cues.length)), lyricsRef.current.cues.length - 1);
              const sec = lyricsRef.current.cues[Math.max(0, ci)].section;
              ctx.save();
              ctx.globalAlpha = 0.25;
              ctx.font = '700 12px Orbitron, monospace';
              ctx.textAlign = 'left';
              ctx.fillStyle = secColors[sec] || '#FFFFFF';
              ctx.fillText(`[${sec.toUpperCase()}]`, 12, ch - 16);
              ctx.restore();
            }
          }
        }

        // ── Track title card (when no lyrics available) ──
        if (s.lyricsMode && !lyricsRef.current && trackInfoRef.current) {
          const tInfo = trackInfoRef.current;
          ctx.save();
          ctx.globalAlpha = 0.5 + bp * 0.3;
          if (tInfo.titleJa) {
            ctx.font = '900 52px Hiragino Kaku Gothic Pro, Meiryo, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeStyle = 'rgba(0,0,0,0.9)';
            ctx.lineWidth = 3;
            ctx.strokeText(tInfo.titleJa, cw / 2, ch * 0.45);
            ctx.fillStyle = '#DC143C';
            ctx.shadowColor = '#DC143C';
            ctx.shadowBlur = 15 + bp * 30;
            ctx.fillText(tInfo.titleJa, cw / 2, ch * 0.45);
            ctx.shadowBlur = 0;
          }
          const title = tInfo.romanji || tInfo.title;
          ctx.font = '900 32px Orbitron, monospace';
          ctx.strokeStyle = 'rgba(0,0,0,0.9)';
          ctx.lineWidth = 2;
          ctx.strokeText(title, cw / 2, ch * 0.55);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(title, cw / 2, ch * 0.55);
          if (tInfo.genre) {
            ctx.font = '700 16px Courier New, monospace';
            ctx.fillStyle = '#ffffff33';
            ctx.fillText(tInfo.genre.toUpperCase(), cw / 2, ch * 0.55 + 30);
          }
          ctx.restore();
        }

        // Beat pulse indicator (bottom bar)
        if (s.beatSync && bp > 0.05) {
          ctx.fillStyle = `rgba(220, 20, 60, ${bp * 0.6})`;
          ctx.fillRect(0, ch - 4, cw * bp, 4);
        }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [videos]); // Only recreate on videos change — reads stateRef for everything else

  // ── Recording ───────────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const stream = canvas.captureStream(30);
      // Try to add audio track
      if (audioCtxRef.current && sourceNodeRef.current) {
        const dest = audioCtxRef.current.createMediaStreamDestination();
        sourceNodeRef.current.connect(dest);
        for (const track of dest.stream.getAudioTracks()) stream.addTrack(track);
      }
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 5_000_000 });
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `npgx-mix-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      dispatch({ type: 'SET', key: 'isRecording', value: true });
    } catch (e) {
      console.error('[mixer] Recording failed:', e);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    dispatch({ type: 'SET', key: 'isRecording', value: false });
  }, []);

  // ── Fullscreen — use native Fullscreen API on canvas parent ─────────────
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const toggleFullscreen = useCallback(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  // ── Layout ──────────────────────────────────────────────────────────────
  const isMobile = useIsMobile();
  const [activePanel, setActivePanel] = useState(2);
  const swipeLeft = useCallback(() => setActivePanel(p => Math.min(p + 1, PANELS.length - 1)), []);
  const swipeRight = useCallback(() => setActivePanel(p => Math.max(p - 1, 0)), []);
  const swipeHandlers = useSwipe(swipeLeft, swipeRight);

  const panelProps = { state, dispatch };
  const settingsExtra = { clipCount: videos.length, currentClip: currentVideoIndex, onRecord: startRecording, onStopRecord: stopRecording };

  const renderPanel = (key: string) => {
    switch (key) {
      case 'super-fx': return <SuperFxPanel {...panelProps} />;
      case 'effects': return <EffectsPanel {...panelProps} />;
      case 'preview': return (
        <Panel title="NPGX MIXER">
          <div className={`bg-black rounded-lg overflow-hidden relative flex items-center justify-center ${state.canvasOrientation === 'portrait' ? 'max-h-[85vh]' : 'aspect-video'}`}>
            <canvas ref={canvasRef} width={state.canvasOrientation === 'portrait' ? 720 : 1280} height={state.canvasOrientation === 'portrait' ? 1280 : 720} className={state.canvasOrientation === 'portrait' ? 'max-h-[85vh] w-auto mx-auto block' : 'w-full h-auto block'} />
            {state.isRecording && <div className="absolute top-2 left-2 flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" /><span className="text-[10px] text-red-400 font-bold">REC</span></div>}
          </div>
        </Panel>
      );
      case 'text': return <TextPanel {...panelProps} />;
      case 'settings': return <SettingsPanel {...panelProps} {...settingsExtra} />;
    }
  };

  // Fullscreen overlay rendered as a portal alongside normal layout (no early return)
  // The canvas stays in its normal DOM position — fullscreen just overlays controls

  // ── Normal layout ───────────────────────────────────────────────────────
  // Scroll past navbar on mount to give immersive fullscreen feel
  const mixerRootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Scroll the mixer into view, hiding site navbar
    mixerRootRef.current?.scrollIntoView({ behavior: 'instant' });
  }, []);

  return (
    <div ref={mixerRootRef} className="flex flex-col h-screen bg-black text-white overflow-hidden">
      <video ref={videoRef} className="hidden" onEnded={() => setCurrentVideoIndex(p => (p + 1) % Math.max(1, videos.length))} muted playsInline autoPlay />

      <VideoTimeline videos={videos} currentClip={currentVideoIndex} speed={state.core.speed}
        onSpeedChange={s => dispatch({ type: 'SET_CORE', key: 'speed', value: s })}
        onNext={() => setCurrentVideoIndex(p => (p + 1) % Math.max(1, videos.length))}
        onPrev={() => setCurrentVideoIndex(p => (p - 1 + videos.length) % Math.max(1, videos.length))}
        onSelectClip={idx => setCurrentVideoIndex(idx)}
        defaultOpen />
      <AudioTimeline tracks={musicTracks} currentTrack={currentMusicTrack} isPlaying={isMusicPlaying}
        onToggle={toggleMusic} onNext={nextTrack} onPrev={prevTrack} onSelectTrack={idx => setCurrentMusicTrack(idx)} />

      {isMobile ? (
        <>
          <div className="flex-1 overflow-y-auto px-3 pb-2 min-h-0" {...swipeHandlers}>
            <div className="flex justify-center gap-1.5 py-2">
              {PANELS.map((p, i) => (
                <button key={p.key} onClick={() => setActivePanel(i)} className={`w-2 h-2 rounded-full transition-all ${i === activePanel ? 'bg-red-400 scale-125' : 'bg-zinc-600'}`} />
              ))}
            </div>
            {renderPanel(PANELS[activePanel].key)}
          </div>
          <div className="bg-zinc-950 border-t border-red-500/20 px-1 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-center gap-3 py-1.5 border-b border-red-500/10">
              <button onClick={prevTrack} className="text-red-400/70 hover:text-red-400"><FiSkipBack size={12} /></button>
              <button onClick={toggleMusic} className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                {isMusicPlaying ? <FiPause size={12} /> : <FiPlay size={12} />}
              </button>
              <button onClick={nextTrack} className="text-red-400/70 hover:text-red-400"><FiSkipForward size={12} /></button>
              <span className="text-red-400/50 text-[10px] truncate max-w-[100px]">{currentTrackInfo?.title || ''}</span>
              <button onClick={toggleFullscreen} className="text-red-400/70 hover:text-red-400"><FiMaximize2 size={14} /></button>
              <MixerMenu />
            </div>
            <div className="flex items-center justify-around py-1.5">
              {PANELS.map((p, i) => {
                const Icon = p.icon;
                return (
                  <button key={p.key} onClick={() => setActivePanel(i)}
                    className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${i === activePanel ? 'text-red-400 bg-red-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    <Icon size={18} /><span className="text-[9px] font-medium">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Desktop: 3-column layout — preview takes center stage */}
          <div className="flex-1 grid grid-cols-[280px_1fr_280px] gap-2 px-2 pb-2 overflow-hidden min-h-0">
            <div className="flex flex-col gap-2 overflow-y-auto min-w-0">
              <SuperFxPanel {...panelProps} />
              <EffectsPanel {...panelProps} />
            </div>
            <div className="flex flex-col gap-2 min-h-0 min-w-0">
              {/* Frame */}
              <div className="bg-zinc-950 border border-red-500/20 rounded-lg overflow-hidden flex-1 min-h-0 flex flex-col">
                <div ref={canvasWrapRef} className="bg-black flex-1 min-h-0 relative flex items-center justify-center fullscreen:bg-black">
                  <canvas ref={canvasRef}
                    width={state.canvasOrientation === 'portrait' ? 720 : 1280}
                    height={state.canvasOrientation === 'portrait' ? 1280 : 720}
                    className={state.canvasOrientation === 'portrait' ? 'max-h-[calc(100vh-280px)] fullscreen:max-h-screen w-auto mx-auto block' : 'w-full max-h-[calc(100vh-280px)] fullscreen:max-h-screen block'} />
                  {state.isRecording && (
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
                      <span className="text-[10px] text-red-400 font-bold">REC</span>
                    </div>
                  )}
                  <button onClick={toggleFullscreen}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/60 border border-red-500/40 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors z-10">
                    <FiMaximize2 size={14} />
                  </button>
                </div>

                {/* Controls under frame */}
                <div className="px-3 py-2.5 border-t border-red-500/20 bg-zinc-950 space-y-2">
                  {/* Transport + mode */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={prevTrack} className="text-red-400/70 hover:text-red-400 transition-colors"><FiSkipBack size={13} /></button>
                      <button onClick={toggleMusic} className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-colors">
                        {isMusicPlaying ? <FiPause size={13} /> : <FiPlay size={13} />}
                      </button>
                      <button onClick={nextTrack} className="text-red-400/70 hover:text-red-400 transition-colors"><FiSkipForward size={13} /></button>
                      <span className="text-red-400/50 text-[10px] truncate max-w-[120px] ml-1">{currentTrackInfo?.title || 'No track'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* Video fit modes */}
                      {(['fill', 'cinematic', 'fit'] as const).map(mode => (
                        <button key={mode} onClick={() => dispatch({ type: 'SET', key: 'videoFit', value: mode })}
                          className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-colors ${
                            (state.videoFit || 'cinematic') === mode
                              ? 'bg-red-600/30 text-red-400 border border-red-500/30'
                              : 'bg-white/5 text-zinc-600 border border-white/5 hover:text-zinc-400'
                          }`}>
                          {mode === 'cinematic' ? 'cine' : mode}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Toggles */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => dispatch({ type: 'SET', key: 'chaosMode', value: !state.chaosMode })}
                        className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded transition-colors ${state.chaosMode ? 'bg-red-600/30 text-red-400 border border-red-500/30' : 'bg-white/5 text-zinc-600 border border-white/5'}`}>
                        Chaos {state.chaosMode ? 'ON' : 'OFF'}
                      </button>
                      <button onClick={() => dispatch({ type: 'SET', key: 'beatSync', value: !state.beatSync })}
                        className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded transition-colors ${state.beatSync ? 'bg-pink-600/30 text-pink-400 border border-pink-500/30' : 'bg-white/5 text-zinc-600 border border-white/5'}`}>
                        Beat {state.beatSync ? 'ON' : 'OFF'}
                      </button>
                      <button onClick={() => dispatch({ type: 'SET', key: 'lyricsMode', value: !state.lyricsMode })}
                        className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded transition-colors ${state.lyricsMode ? 'bg-purple-600/30 text-purple-400 border border-purple-500/30' : 'bg-white/5 text-zinc-600 border border-white/5'}`}>
                        Lyrics {state.lyricsMode ? 'ON' : 'OFF'}
                      </button>
                      <button onClick={() => {
                        const next = state.canvasOrientation === 'landscape' ? 'portrait' : 'landscape';
                        dispatch({ type: 'SET', key: 'canvasOrientation', value: next });
                      }}
                        className="px-2.5 py-1 text-[10px] font-bold uppercase rounded bg-white/5 text-zinc-600 border border-white/5 hover:text-zinc-400 transition-colors">
                        {state.canvasOrientation === 'portrait' ? '9:16' : '16:9'}
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {state.isRecording ? (
                        <button onClick={stopRecording}
                          className="px-2.5 py-1 text-[10px] font-bold uppercase rounded bg-red-600 text-white animate-pulse">
                          Stop Rec
                        </button>
                      ) : (
                        <button onClick={startRecording}
                          className="px-2.5 py-1 text-[10px] font-bold uppercase rounded bg-white/5 text-zinc-600 border border-white/5 hover:text-red-400 hover:border-red-500/30 transition-colors">
                          Record
                        </button>
                      )}
                      <button onClick={toggleFullscreen}
                        className="px-2.5 py-1 text-[10px] font-bold uppercase rounded bg-white/5 text-zinc-600 border border-white/5 hover:text-zinc-400 transition-colors">
                        Fullscreen
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto min-w-0">
              <TextPanel {...panelProps} />
              <SettingsPanel {...panelProps} {...settingsExtra} />
            </div>
          </div>
          {/* Bottom bar */}
          <div className="p-2 bg-zinc-950 border-t border-red-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={prevTrack} className="text-red-400/70 hover:text-red-400 transition-colors"><FiSkipBack size={14} /></button>
                <button onClick={toggleMusic} className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-colors">
                  {isMusicPlaying ? <FiPause size={14} /> : <FiPlay size={14} />}
                </button>
                <button onClick={nextTrack} className="text-red-400/70 hover:text-red-400 transition-colors"><FiSkipForward size={14} /></button>
                <div className="flex items-center gap-2 text-red-400/70 text-xs ml-2">
                  <FiMusic size={12} />
                  <span className="truncate max-w-[150px]">{currentTrackInfo?.title || 'No track'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => dispatch({ type: 'SET', key: 'chaosMode', value: !state.chaosMode })}
                  className={`px-3 py-1 text-xs font-bold uppercase rounded transition-colors ${state.chaosMode ? 'bg-red-600/30 text-red-400 border border-red-500/30' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
                  Chaos {state.chaosMode ? 'ON' : 'OFF'}
                </button>
                <button onClick={() => dispatch({ type: 'SET', key: 'beatSync', value: !state.beatSync })}
                  className={`px-3 py-1 text-xs font-bold uppercase rounded transition-colors ${state.beatSync ? 'bg-pink-600/30 text-pink-400 border border-pink-500/30' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
                  Beat {state.beatSync ? 'ON' : 'OFF'}
                </button>
                <button onClick={() => dispatch({ type: 'SET', key: 'lyricsMode', value: !state.lyricsMode })}
                  className={`px-3 py-1 text-xs font-bold uppercase rounded transition-colors ${state.lyricsMode ? 'bg-purple-600/30 text-purple-400 border border-purple-500/30' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
                  Lyrics {state.lyricsMode ? 'ON' : 'OFF'}
                </button>
                <button onClick={toggleFullscreen}
                  className="px-3 py-1 text-xs font-bold uppercase rounded bg-white/5 text-gray-400 border border-white/10 hover:bg-red-500/20 hover:text-red-400 transition-colors">
                  Fullscreen
                </button>
                <MixerMenu />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Fullscreen now uses native Fullscreen API — no overlay needed */}
    </div>
  );
}

export default function MixerPage() {
  return <NPGXMixer />;
}
