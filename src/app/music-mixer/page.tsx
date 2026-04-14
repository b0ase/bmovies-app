'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { FiMusic, FiPlay, FiPause, FiSkipForward, FiSkipBack, FiCopy, FiSave, FiShuffle, FiTrash2, FiMenu, FiX } from 'react-icons/fi';
import { NPGX_ROSTER, type NPGXCharacter } from '@/lib/npgx-roster';
import { useMusic } from '@/hooks/useMusic';

// ── Music DNA Data ──────────────────────────────────────────────────────
// Complete music profiles for all 26 NPGX characters

interface MusicDNA {
  genre: string;
  subgenres: string[];
  bpm: number;
  key: string;
  mood: string;
  instruments: string[];
  influences: string[];
  vocalStyle: string;
  productionNotes: string;
}

const MUSIC_DNA: Record<string, MusicDNA> = {
  A: {
    genre: 'Dark Synthwave',
    subgenres: ['Darksynth', 'Retrowave', 'Cyberpunk'],
    bpm: 128,
    key: 'Am',
    mood: 'Seductive & dangerous',
    instruments: ['Analog synths', '808 bass', 'Distorted pads', 'Whispered vocals'],
    influences: ['Perturbator', 'Carpenter Brut', 'Crystal Castles'],
    vocalStyle: 'Breathy whispers over dark beats, ASMR-like vocal hooks',
    productionNotes: 'Heavy reverb, sidechain compression, neon-noir atmosphere. Think late-night Tokyo driving.',
  },
  B: {
    genre: 'Industrial Metal',
    subgenres: ['Industrial', 'Nu-Metal', 'Cyber Metal'],
    bpm: 140,
    key: 'Dm',
    mood: 'Lethal & precise',
    instruments: ['Downtuned guitars', 'Mechanical drums', 'Distorted bass', 'Metallic percussion'],
    influences: ['Nine Inch Nails', 'Rammstein', 'Ministry'],
    vocalStyle: 'Sharp, staccato delivery with guttural undertones',
    productionNotes: 'Surgical precision in mixing, razor-sharp transients, factory ambience.',
  },
  C: {
    genre: 'Kawaii Punk',
    subgenres: ['Pop Punk', 'J-Pop', 'Bubblegum Bass'],
    bpm: 175,
    key: 'C',
    mood: 'Chaotic cute',
    instruments: ['Distorted ukulele', 'Chiptune synths', 'Spray can percussion', 'Pop vocals'],
    influences: ['CHAI', 'Kyary Pamyu Pamyu', 'Paramore'],
    vocalStyle: 'High-energy kawaii vocals, switches between cute and aggressive',
    productionNotes: 'Pink noise, glitch effects, street art energy. Cute on the surface, punk underneath.',
  },
  D: {
    genre: 'Gothic Opera',
    subgenres: ['Darkwave', 'Neoclassical', 'Chamber Pop'],
    bpm: 110,
    key: 'Cm',
    mood: 'Regal & haunting',
    instruments: ['Pipe organ', 'String quartet', 'Harpsichord', 'Choir vocals'],
    influences: ['Dead Can Dance', 'Evanescence', 'Lacrimosa'],
    vocalStyle: 'Operatic soprano with dark undertones, chanting passages',
    productionNotes: 'Cathedral reverb, orchestral layering, medieval meets industrial.',
  },
  E: {
    genre: 'Hyperpop',
    subgenres: ['Deconstructed Club', 'PC Music', 'Glitchcore'],
    bpm: 160,
    key: 'E',
    mood: 'Electric & overwhelming',
    instruments: ['Pitch-shifted vocals', 'Distorted 808s', 'Granular synths', 'Bitcrushed leads'],
    influences: ['100 gecs', 'SOPHIE', 'Charli XCX'],
    vocalStyle: 'Pitch-shifted, autotuned, rapid-fire delivery with emotional breaks',
    productionNotes: 'Maximum compression, frequency extremes, dopamine overload production.',
  },
  F: {
    genre: 'Drum & Bass',
    subgenres: ['Neurofunk', 'Liquid DnB', 'Jump-Up'],
    bpm: 174,
    key: 'Fm',
    mood: 'Airborne & furious',
    instruments: ['Reese bass', 'Amen breaks', 'Atmospheric pads', 'Metallic stabs'],
    influences: ['Noisia', 'Andy C', 'Pendulum'],
    vocalStyle: 'Warrior cry vocal chops, pitched battle shouts',
    productionNotes: 'Relentless energy, complex breakbeat patterns, aerial combat atmosphere.',
  },
  G: {
    genre: 'Witch House',
    subgenres: ['Dark Electronic', 'Drone', 'Slowcore'],
    bpm: 90,
    key: 'Bbm',
    mood: 'Invisible & dread',
    instruments: ['Reversed synths', 'Sub-bass drones', 'Chopped samples', 'Ghost vocals'],
    influences: ['Salem', 'Crystal Castles', 'Burial'],
    vocalStyle: 'Barely audible whispers, reversed vocal textures, distant wailing',
    productionNotes: 'Extreme lo-fi processing, occult atmosphere, sounds from the void.',
  },
  H: {
    genre: 'EBM / Electropunk',
    subgenres: ['Electronic Body Music', 'Synthpunk', 'Aggrotech'],
    bpm: 135,
    key: 'F#m',
    mood: 'Wired & magnetic',
    instruments: ['Sequenced bass', 'Drum machines', 'Circuit-bent toys', 'Vocoder'],
    influences: ['Front 242', 'DAF', 'The Prodigy'],
    vocalStyle: 'Vocoder-processed commands, hypnotic chanting',
    productionNotes: 'Pulsing sequencer patterns, magnetic field recordings, binary rhythms.',
  },
  I: {
    genre: 'Dark Ambient',
    subgenres: ['Drone', 'Industrial Ambient', 'Sound Design'],
    bpm: 95,
    key: 'Em',
    mood: 'Toxic & hypnotic',
    instruments: ['Field recordings', 'Granular synthesis', 'Bioacoustic samples', 'Modular synths'],
    influences: ['Lustmord', 'Atrium Carceri', 'Aphex Twin'],
    vocalStyle: 'Wordless vocal textures, processed breathing, organic murmurs',
    productionNotes: 'Living sound design, evolving textures, bio-digital fusion atmosphere.',
  },
  J: {
    genre: 'Trap Metal',
    subgenres: ['Hardcore Trap', 'Rage Beat', 'SoundCloud Rap'],
    bpm: 155,
    key: 'Gm',
    mood: 'Chaotic & explosive',
    instruments: ['Distorted 808s', 'Metal guitars', 'Hi-hat rolls', 'Scream vocals'],
    influences: ['XXXTENTACION', 'Ghostemane', 'City Morgue'],
    vocalStyle: 'Alternating between screaming and rapid-fire bars',
    productionNotes: 'Demolition-grade bass, punk energy meets trap production.',
  },
  K: {
    genre: 'J-Rock',
    subgenres: ['Visual Kei', 'Anime Rock', 'Post-Hardcore'],
    bpm: 165,
    key: 'Bm',
    mood: 'Blood & honor',
    instruments: ['Katana-sharp guitars', 'Taiko drums', 'Shamisen', 'Power vocals'],
    influences: ['X Japan', 'Dir En Grey', 'ONE OK ROCK'],
    vocalStyle: 'Powerful emotional vocals, samurai battle cries, melodic passages',
    productionNotes: 'Bushido in sonic form, honor-bound compositions, blood-oath intensity.',
  },
  L: {
    genre: 'Future Bass',
    subgenres: ['Kawaii Future Bass', 'Melodic Dubstep', 'Chillstep'],
    bpm: 150,
    key: 'D',
    mood: 'Luminous & cutting',
    instruments: ['Supersaw synths', 'Pitched vocals', 'Pluck leads', 'Sidechain pads'],
    influences: ['Flume', 'Porter Robinson', 'San Holo'],
    vocalStyle: 'Ethereal pitched vocals, digital angel harmonies',
    productionNotes: 'Moonlit production, digital dreamscapes, razor-edge drops with emotional builds.',
  },
  M: {
    genre: 'City Pop Revival',
    subgenres: ['Neo City Pop', 'Vaporwave', 'Japanese Funk'],
    bpm: 118,
    key: 'Eb',
    mood: 'Stormy & nostalgic',
    instruments: ['Electric piano', 'Slap bass', 'Jazz guitar', 'Lush strings'],
    influences: ['Mariya Takeuchi', 'Tatsuro Yamashita', 'Miki Matsubara'],
    vocalStyle: 'Warm, emotive Japanese vocals with jazz phrasing',
    productionNotes: 'Rainy Tokyo nights, neon reflections on wet streets, bittersweet grooves.',
  },
  N: {
    genre: 'Darksynth',
    subgenres: ['Synthwave', 'Horror Synth', 'Outrun'],
    bpm: 130,
    key: 'Abm',
    mood: 'Eclipse & power',
    instruments: ['Massive synth leads', 'Pounding kicks', 'Dark arps', 'Blood-soaked pads'],
    influences: ['GosT', 'Dan Terminus', 'Dance With the Dead'],
    vocalStyle: 'Vampiric whispers, nocturnal harmonies, blood-ritual chants',
    productionNotes: 'Total eclipse atmosphere, blood moon energy, gothic synthwave at maximum darkness.',
  },
  O: {
    genre: 'Hardcore Techno',
    subgenres: ['Gabber', 'Industrial Hardcore', 'Speedcore'],
    bpm: 180,
    key: 'Cm',
    mood: 'Obsidian & relentless',
    instruments: ['Distorted kicks', 'Acid bass', 'Industrial loops', 'Siren leads'],
    influences: ['Angerfist', 'The Speed Freak', 'Ophidian'],
    vocalStyle: 'Distorted commands, militant vocal samples',
    productionNotes: 'Obsidian-hard production, crushing kicks, zero compromise intensity.',
  },
  P: {
    genre: 'Phoenix Metal',
    subgenres: ['Melodic Death Metal', 'Power Metal', 'Symphonic Metal'],
    bpm: 170,
    key: 'Am',
    mood: 'Rebirth & fury',
    instruments: ['Twin lead guitars', 'Blast beats', 'Orchestral synths', 'Phoenix-cry solos'],
    influences: ['Arch Enemy', 'Nightwish', 'In Flames'],
    vocalStyle: 'Fierce feminine growls transitioning to soaring clean vocals',
    productionNotes: 'Rise-from-ashes dynamics, burn-then-rebuild song structures.',
  },
  Q: {
    genre: 'Glitch Hop',
    subgenres: ['IDM', 'Wonky', 'Experimental Bass'],
    bpm: 145,
    key: 'F#',
    mood: 'Void & razor-sharp',
    instruments: ['Glitched breakbeats', 'Void bass', 'Digital artifacts', 'Quantum arps'],
    influences: ['Amon Tobin', 'Tipper', 'Mr. Bill'],
    vocalStyle: 'Fragmented vocal cuts, teleporting between frequencies',
    productionNotes: 'Quantum-level precision, portal-opening bass design, dimensional shifts.',
  },
  R: {
    genre: 'Post-Punk',
    subgenres: ['Darkwave', 'Gothic Rock', 'Coldwave'],
    bpm: 125,
    key: 'Dm',
    mood: 'Shadow & blade',
    instruments: ['Chorus guitars', 'Driving bass', 'Minimal drums', 'Haunting keys'],
    influences: ['Bauhaus', 'Siouxsie and the Banshees', 'Joy Division'],
    vocalStyle: 'Deep, brooding delivery with poetic lyrics',
    productionNotes: 'Shadow-drenched production, blade-sharp guitar tones, void-walking basslines.',
  },
  S: {
    genre: 'Breakcore',
    subgenres: ['Drill n Bass', 'Mashcore', 'Jungle'],
    bpm: 185,
    key: 'Gm',
    mood: 'Lightning & chaos',
    instruments: ['Chopped amen breaks', 'Thunder bass', 'Lightning synths', 'Storm FX'],
    influences: ['Venetian Snares', 'Igorrr', 'Machine Girl'],
    vocalStyle: 'Electrified screams, storm-force vocal bursts',
    productionNotes: 'Maximum BPM chaos, lightning-strike edits, hurricane of breaks.',
  },
  T: {
    genre: 'Neon Punk',
    subgenres: ['Electro Punk', 'Synthpunk', 'New Wave Revival'],
    bpm: 155,
    key: 'A',
    mood: 'Electric & rebellious',
    instruments: ['Neon synth leads', 'Punk guitars', 'Electronic drums', 'Holo-bass'],
    influences: ['The Prodigy', 'Atari Teenage Riot', 'HEALTH'],
    vocalStyle: 'Punk shouts with neon-processed effects',
    productionNotes: 'Street-level energy, holographic sound design, alleyway reverb.',
  },
  U: {
    genre: 'Blacksmith Metal',
    subgenres: ['Doom Metal', 'Sludge', 'Industrial Metal'],
    bpm: 145,
    key: 'Cm',
    mood: 'Forge & creation',
    instruments: ['Anvil percussion', 'Forge bass', 'Hammer drums', 'Dark matter synths'],
    influences: ['Meshuggah', 'Tool', 'Godflesh'],
    vocalStyle: 'Low, resonant chanting, forge-rhythmic vocal patterns',
    productionNotes: 'Heavy as dark matter, forge-temperature intensity, weapon-crafting rhythms.',
  },
  V: {
    genre: 'Shadow Rap',
    subgenres: ['Dark Trap', 'Phonk', 'Memphis Rap'],
    bpm: 130,
    key: 'Ebm',
    mood: 'Stealth & strike',
    instruments: ['Lo-fi samples', 'Deep 808s', 'Cowbells', 'Dark piano loops'],
    influences: ['Three 6 Mafia', 'DJ Smokey', 'Denzel Curry'],
    vocalStyle: 'Low, monotone delivery with sudden aggressive bursts',
    productionNotes: 'Stealth-mode production, strike-from-shadows bass, monochrome atmosphere.',
  },
  W: {
    genre: 'Industrial Noise',
    subgenres: ['Power Electronics', 'Harsh Noise Wall', 'Death Industrial'],
    bpm: 120,
    key: 'Fm',
    mood: 'Iron & pulse',
    instruments: ['Metal sheet percussion', 'Feedback loops', 'Contact mics', 'Iron resonance'],
    influences: ['Throbbing Gristle', 'Whitehouse', 'Pharmakon'],
    vocalStyle: 'Processed screams through iron filters, machine-like repetition',
    productionNotes: 'Raw iron recordings, pulse-based rhythms, industrial facility ambience.',
  },
  X: {
    genre: 'Blood Rave',
    subgenres: ['Dark Techno', 'EBM', 'Witch House'],
    bpm: 150,
    key: 'Bbm',
    mood: 'Crimson & ritual',
    instruments: ['Ritual drums', 'Blood-bass synths', 'Crimson pads', 'Blade FX'],
    influences: ['Perturbator', 'Boy Harsher', 'Gesaffelstein'],
    vocalStyle: 'Ritualistic chanting, crimson-soaked harmonies',
    productionNotes: 'Underground club production, blood-red atmosphere, fight-club energy.',
  },
  Y: {
    genre: 'J-Punk',
    subgenres: ['Japanese Hardcore', 'Oi Punk', 'Street Punk'],
    bpm: 180,
    key: 'G',
    mood: 'Steel flame & rebellion',
    instruments: ['Raw guitars', 'Thrash drums', 'Shouting chorus', 'Steel percussion'],
    influences: ['Guitar Wolf', 'The Stalin', 'GISM'],
    vocalStyle: 'Raw, shouted vocals with steel determination',
    productionNotes: 'Forged in fire, zero polish, pure street rebellion energy.',
  },
  Z: {
    genre: 'Casino Noir',
    subgenres: ['Trip Hop', 'Jazz Noir', 'Lo-Fi Hip Hop'],
    bpm: 100,
    key: 'Bb',
    mood: 'Luck & danger',
    instruments: ['Jazzy piano', 'Upright bass', 'Brushed drums', 'Neon organ'],
    influences: ['Portishead', 'Massive Attack', 'DJ Shadow'],
    vocalStyle: 'Smoky lounge vocals with digital processing',
    productionNotes: 'Casino floor ambience, dice-roll rhythms, neon-noir jazz.',
  },
};

// ── Style Colors per Character ──────────────────────────────────────────
const STYLE_COLORS: Record<string, string> = {
  A: '#8B00FF',  // deep purple
  B: '#4A0000',  // dark crimson
  C: '#FF69B4',  // hot pink
  D: '#2F1B41',  // gothic purple
  E: '#00FF88',  // electric green
  F: '#FF4500',  // orange-red
  G: '#1A1A2E',  // void blue
  H: '#FF0055',  // crimson wire
  I: '#006400',  // toxic green
  J: '#FF2200',  // explosion orange
  K: '#8B0000',  // blood red
  L: '#00BFFF',  // moonlit blue
  M: '#FF8C00',  // sunset orange
  N: '#330033',  // eclipse purple
  O: '#0A0A0A',  // obsidian
  P: '#FF4400',  // phoenix flame
  Q: '#6600CC',  // void purple
  R: '#333333',  // shadow grey
  S: '#FFFF00',  // lightning yellow
  T: '#39FF14',  // neon green
  U: '#8B4513',  // forge brown
  V: '#1C1C1C',  // stealth black
  W: '#708090',  // iron grey
  X: '#DC143C',  // crimson
  Y: '#FFD700',  // steel flame gold
  Z: '#DAA520',  // casino gold
};

// ── Key Compatibility Map ───────────────────────────────────────────────
const KEY_ORDER = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const KEY_COMPAT: Record<string, string[]> = {
  'C': ['Am', 'G', 'F', 'Dm', 'Em'],
  'Cm': ['Eb', 'Bbm', 'Fm', 'Ab', 'Gm'],
  'C#': ['A#m', 'G#', 'F#'],
  'D': ['Bm', 'A', 'G', 'Em', 'F#m'],
  'Dm': ['F', 'Am', 'Gm', 'C', 'Bb'],
  'Eb': ['Cm', 'Bb', 'Ab', 'Fm', 'Gm'],
  'Ebm': ['Gb', 'Bbm', 'Abm'],
  'E': ['C#m', 'B', 'A', 'F#m', 'G#m'],
  'Em': ['G', 'C', 'Am', 'D', 'Bm'],
  'F': ['Dm', 'C', 'Bb', 'Am', 'Gm'],
  'Fm': ['Ab', 'Cm', 'Bbm', 'Eb', 'Db'],
  'F#': ['D#m', 'B', 'C#'],
  'F#m': ['A', 'D', 'E', 'Bm', 'C#m'],
  'G': ['Em', 'D', 'C', 'Am', 'Bm'],
  'Gm': ['Bb', 'Dm', 'Cm', 'F', 'Eb'],
  'Ab': ['Fm', 'Eb', 'Db', 'Cm', 'Bbm'],
  'Abm': ['Cb', 'Ebm', 'Dbm'],
  'A': ['F#m', 'E', 'D', 'Bm', 'C#m'],
  'Am': ['C', 'G', 'F', 'Dm', 'Em'],
  'Bb': ['Gm', 'F', 'Eb', 'Dm', 'Cm'],
  'Bbm': ['Db', 'Ab', 'Fm', 'Ebm', 'Gb'],
  'B': ['G#m', 'F#', 'E', 'C#m', 'D#m'],
  'Bm': ['D', 'A', 'G', 'Em', 'F#m'],
};

// ── Saved Mix Type ──────────────────────────────────────────────────────
interface SavedMix {
  id: string;
  name: string;
  characters: string[]; // letters
  weights: number[];
  bpmOverride: number | null;
  intensity: number;
  timestamp: number;
}

// ── Hybrid Genre Name Generator ─────────────────────────────────────────
const HYBRID_PREFIXES = [
  'Neo', 'Hyper', 'Ultra', 'Dark', 'Neon', 'Cyber', 'Ghost',
  'Void', 'Blood', 'Iron', 'Chrome', 'Atomic', 'Shadow', 'Crimson',
];

const HYBRID_SUFFIXES = [
  'Core', 'Wave', 'Punk', 'Step', 'Bass', 'Noise', 'Drift',
  'Storm', 'Flux', 'Rage', 'Blitz', 'Rave', 'Crush', 'Pulse',
];

function generateHybridName(genres: string[], intensity: number): string {
  if (genres.length === 0) return '';
  if (genres.length === 1) return genres[0];

  // Extract key words from genres
  const words = genres.flatMap(g => g.split(/[\s/]+/));

  // At low intensity, combine cleanly
  if (intensity < 30) {
    return genres.join(' + ');
  }

  // At medium intensity, create mashups
  if (intensity < 70) {
    const first = words[0];
    const last = words[words.length - 1];
    return `${first} ${last}`;
  }

  // At high intensity, go wild
  const prefix = HYBRID_PREFIXES[Math.floor(intensity * HYBRID_PREFIXES.length / 100) % HYBRID_PREFIXES.length];
  const suffix = HYBRID_SUFFIXES[Math.floor((intensity * 7 + genres.length * 13) % HYBRID_SUFFIXES.length)];
  const core = words[Math.floor(words.length / 2)];
  return `${prefix} ${core}${suffix}`;
}

// ── Find Compatible Key ─────────────────────────────────────────────────
function findCompatibleKey(keys: string[]): string {
  if (keys.length === 0) return 'C';
  if (keys.length === 1) return keys[0];

  // Score each key by how many of the input keys it's compatible with
  let bestKey = keys[0];
  let bestScore = 0;

  for (const candidateKey of Object.keys(KEY_COMPAT)) {
    const compat = KEY_COMPAT[candidateKey] || [];
    let score = 0;
    for (const k of keys) {
      if (k === candidateKey) score += 2;
      else if (compat.includes(k)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestKey = candidateKey;
    }
  }

  return bestKey;
}

// ── Panel Component ─────────────────────────────────────────────────────
function Panel({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 border border-red-500/20 rounded-xl p-4 backdrop-blur-sm shadow-lg ${className}`}>
      <div className="text-white font-bold text-sm uppercase tracking-wider text-center mb-4 text-red-400"
        style={{ fontFamily: 'var(--font-brand)' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ── DNA Helix Visualization ─────────────────────────────────────────────
function DNAHelix({ colors, isActive }: { colors: string[]; isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (!isActive || colors.length < 2) {
        animRef.current = requestAnimationFrame(render);
        frameRef.current++;
        return;
      }

      const t = frameRef.current * 0.02;
      const amplitude = h * 0.3;
      const centerY = h / 2;
      const segments = 80;

      for (let strand = 0; strand < colors.length && strand < 3; strand++) {
        const phase = (strand * Math.PI * 2) / Math.max(colors.length, 2);
        ctx.beginPath();
        ctx.strokeStyle = colors[strand];
        ctx.lineWidth = 2;
        ctx.shadowColor = colors[strand];
        ctx.shadowBlur = 8;

        for (let i = 0; i <= segments; i++) {
          const x = (i / segments) * w;
          const wave = Math.sin((i / segments) * Math.PI * 4 + t + phase) * amplitude;
          const y = centerY + wave;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Connection bars between strands
      if (colors.length >= 2) {
        for (let i = 0; i < segments; i += 4) {
          const x = (i / segments) * w;
          const y1 = centerY + Math.sin((i / segments) * Math.PI * 4 + t) * amplitude;
          const y2 = centerY + Math.sin((i / segments) * Math.PI * 4 + t + Math.PI) * amplitude;

          const grad = ctx.createLinearGradient(x, y1, x, y2);
          grad.addColorStop(0, colors[0] + '60');
          grad.addColorStop(1, (colors[1] || colors[0]) + '60');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y1);
          ctx.lineTo(x, y2);
          ctx.stroke();
        }
      }

      frameRef.current++;
      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animRef.current);
  }, [colors, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={100}
      className="w-full h-[60px] opacity-80"
    />
  );
}

// ── Waveform Bars Visualization ─────────────────────────────────────────
function WaveformBars({ bpm, color, isActive }: { bpm: number; color: string; isActive: boolean }) {
  const bars = 32;
  const [heights, setHeights] = useState<number[]>(Array(bars).fill(20));

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setHeights(Array(bars).fill(0).map(() => 10 + Math.random() * 90));
    }, 60000 / bpm / 2);
    return () => clearInterval(interval);
  }, [bpm, isActive]);

  return (
    <div className="flex items-end gap-px h-8">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-t-sm"
          style={{ backgroundColor: color }}
          animate={{ height: isActive ? `${h}%` : '20%' }}
          transition={{ duration: 0.1, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// ── Character Card ──────────────────────────────────────────────────────
function CharacterCard({
  character,
  dna,
  isSelected,
  selectionIndex,
  onClick,
}: {
  character: NPGXCharacter;
  dna: MusicDNA;
  isSelected: boolean;
  selectionIndex: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={`relative group rounded-lg overflow-hidden transition-all duration-200 ${
        isSelected
          ? 'ring-2 ring-red-500 shadow-[0_0_20px_rgba(220,20,60,0.4)]'
          : 'ring-1 ring-zinc-800 hover:ring-zinc-600'
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      layout
    >
      <div className="relative aspect-square w-full bg-zinc-900">
        <Image
          src={character.image}
          alt={character.name}
          fill
          className="object-cover"
          sizes="80px"
        />
        {/* Selection overlay */}
        {isSelected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-red-500/20 flex items-center justify-center"
          >
            <span className="text-xl font-black text-white drop-shadow-lg">{selectionIndex + 1}</span>
          </motion.div>
        )}
        {/* Letter badge */}
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded text-[10px] font-black flex items-center justify-center ${
          isSelected ? 'bg-red-500 text-white' : 'bg-black/70 text-zinc-400'
        }`}>
          {character.letter}
        </div>
      </div>
      {/* Genre badge */}
      <div className={`px-1.5 py-1 text-[8px] font-bold uppercase tracking-wider truncate text-center ${
        isSelected
          ? 'bg-red-500/30 text-red-300'
          : 'bg-zinc-900 text-zinc-500 group-hover:text-zinc-300'
      }`}>
        {dna.genre}
      </div>
    </motion.button>
  );
}

// ── Slider Component ────────────────────────────────────────────────────
function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  displayValue,
  color = 'red',
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
  displayValue?: string;
  color?: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-zinc-400 text-[11px] font-medium">{label}</span>
        <span className="text-white text-[11px] font-mono">{displayValue ?? value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full h-1.5 appearance-none bg-zinc-800 rounded-full outline-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(220,20,60,0.5)]
          ${color === 'pink'
            ? '[&::-webkit-slider-thumb]:bg-pink-500 accent-pink-500'
            : '[&::-webkit-slider-thumb]:bg-red-500 accent-red-500'
          }`}
      />
    </div>
  );
}

// ── Balance Triangle (for 3-way mixing) ─────────────────────────────────
function BalanceTriangle({
  weights,
  onChange,
  names,
  colors,
}: {
  weights: number[];
  onChange: (weights: number[]) => void;
  names: string[];
  colors: string[];
}) {
  return (
    <div className="space-y-2">
      {weights.map((w, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[10px] font-bold w-6 shrink-0" style={{ color: colors[i] }}>
            {names[i]}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={w}
            onChange={(e) => {
              const newVal = parseInt(e.target.value);
              const diff = newVal - w;
              const others = weights.map((ow, oi) => (oi === i ? newVal : ow));
              // Redistribute proportionally
              const otherTotal = others.reduce((s, v, oi) => s + (oi === i ? 0 : v), 0);
              if (otherTotal > 0) {
                const scale = (100 - newVal) / otherTotal;
                const final = others.map((v, oi) =>
                  oi === i ? newVal : Math.max(0, Math.round(v * scale))
                );
                // Fix rounding
                const sum = final.reduce((s, v) => s + v, 0);
                if (sum !== 100 && final.length > 1) {
                  const fixIdx = final.findIndex((_, oi) => oi !== i);
                  if (fixIdx >= 0) final[fixIdx] += 100 - sum;
                }
                onChange(final);
              } else {
                const final = weights.map((_, oi) =>
                  oi === i ? 100 : 0
                );
                onChange(final);
              }
            }}
            className="flex-1 h-1 accent-red-500 appearance-none bg-zinc-800 rounded-full
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
            style={{
              // @ts-ignore
              '--tw-ring-color': colors[i],
              accentColor: colors[i],
            }}
          />
          <span className="text-[10px] text-zinc-500 font-mono w-8 text-right">{w}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Tag Pill ────────────────────────────────────────────────────────────
function Tag({ label, color = 'zinc' }: { label: string; color?: string }) {
  const colorClasses: Record<string, string> = {
    zinc: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    red: 'bg-red-500/10 text-red-400 border-red-500/30',
    pink: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${colorClasses[color] || colorClasses.zinc}`}>
      {label}
    </span>
  );
}

// ── Main Page Component ─────────────────────────────────────────────────
export default function MusicMixerPage() {
  // Selection state
  const [selected, setSelected] = useState<string[]>([]); // letters
  const [weights, setWeights] = useState<number[]>([]);
  const [bpmOverride, setBpmOverride] = useState<number | null>(null);
  const [intensity, setIntensity] = useState(50);
  const [copied, setCopied] = useState(false);
  const [savedMixes, setSavedMixes] = useState<SavedMix[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Music player
  const {
    isPlaying, toggle: toggleMusic, next: nextTrack, previous: prevTrack,
    currentTrack: currentMusicTrack, playTrackByIndex: setCurrentMusicTrack,
    musicTracks, currentTrackInfo,
  } = useMusic();

  // Load saved mixes from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('npgx-music-mixes');
      if (stored) setSavedMixes(JSON.parse(stored));
    } catch {}
  }, []);

  // Toggle character selection
  const toggleCharacter = useCallback((letter: string) => {
    setSelected(prev => {
      if (prev.includes(letter)) {
        const next = prev.filter(l => l !== letter);
        setWeights(next.length > 0 ? next.map(() => Math.round(100 / next.length)) : []);
        return next;
      }
      if (prev.length >= 3) return prev; // max 3
      const next = [...prev, letter];
      setWeights(next.map(() => Math.round(100 / next.length)));
      return next;
    });
  }, []);

  // Randomize selection
  const randomize = useCallback(() => {
    const count = 2 + Math.floor(Math.random() * 2); // 2 or 3
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const shuffled = letters.sort(() => Math.random() - 0.5).slice(0, count);
    setSelected(shuffled);
    setWeights(shuffled.map(() => Math.round(100 / count)));
    setIntensity(20 + Math.floor(Math.random() * 60));
    setBpmOverride(null);
  }, []);

  // Compute the blended result
  const blendResult = useMemo(() => {
    if (selected.length === 0) return null;

    const dnas = selected.map(l => MUSIC_DNA[l]);
    const w = weights.length === selected.length ? weights.map(v => v / 100) : selected.map(() => 1 / selected.length);

    // Genre
    const genres = dnas.map(d => d.genre);
    const hybridGenre = generateHybridName(genres, intensity);

    // BPM — weighted average
    const rawBpm = Math.round(dnas.reduce((sum, d, i) => sum + d.bpm * w[i], 0));
    const bpm = bpmOverride ?? rawBpm;

    // Key
    const keys = dnas.map(d => d.key);
    const key = findCompatibleKey(keys);

    // Instruments — weighted union (more weight = listed first)
    const instrumentSet = new Map<string, number>();
    dnas.forEach((d, i) => {
      d.instruments.forEach(inst => {
        instrumentSet.set(inst, (instrumentSet.get(inst) || 0) + w[i]);
      });
    });
    const instruments = [...instrumentSet.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([inst]) => inst);

    // Influences — union
    const influenceSet = new Set<string>();
    dnas.forEach(d => d.influences.forEach(inf => influenceSet.add(inf)));
    const influences = [...influenceSet];

    // Subgenres — union
    const subgenreSet = new Set<string>();
    dnas.forEach(d => d.subgenres.forEach(sg => subgenreSet.add(sg)));
    const subgenres = [...subgenreSet];

    // Mood — blend
    const moods = dnas.map(d => d.mood);
    const blendedMood = moods.join(' // ');

    // Vocal style — combine
    const vocalParts = dnas.map((d, i) => {
      const name = NPGX_ROSTER.find(c => c.letter === selected[i])?.name.split(' ')[0] || selected[i];
      return `${name}: ${d.vocalStyle}`;
    });
    const vocalStyle = vocalParts.join(' | ');

    // Production notes — merge
    const productionNotes = dnas.map(d => d.productionNotes).join(' ');

    // Intensity modifier
    const intensityLabel = intensity < 20 ? 'Ambient'
      : intensity < 40 ? 'Chill'
      : intensity < 60 ? 'Balanced'
      : intensity < 80 ? 'Aggressive'
      : 'Maximum';

    // Genre equation
    const equation = genres.join(' \u00D7 ') + ' = ' + hybridGenre;

    return {
      hybridGenre,
      equation,
      bpm,
      rawBpm,
      key,
      instruments,
      influences,
      subgenres,
      blendedMood,
      vocalStyle,
      productionNotes,
      intensityLabel,
      genres,
    };
  }, [selected, weights, bpmOverride, intensity]);

  // Generate prompt text
  const generatePrompt = useCallback(() => {
    if (!blendResult) return '';
    const chars = selected.map(l => NPGX_ROSTER.find(c => c.letter === l)?.name || l).join(', ');
    return [
      `HYBRID GENRE: ${blendResult.hybridGenre}`,
      `FORMULA: ${blendResult.equation}`,
      `CHARACTERS: ${chars}`,
      `BPM: ${blendResult.bpm}`,
      `KEY: ${blendResult.key}`,
      `MOOD: ${blendResult.blendedMood}`,
      `INTENSITY: ${blendResult.intensityLabel}`,
      `SUBGENRES: ${blendResult.subgenres.join(', ')}`,
      `INSTRUMENTS: ${blendResult.instruments.join(', ')}`,
      `INFLUENCES: ${blendResult.influences.join(', ')}`,
      `VOCAL STYLE: ${blendResult.vocalStyle}`,
      `PRODUCTION: ${blendResult.productionNotes}`,
      '',
      `Generate a ${blendResult.bpm} BPM track in ${blendResult.key} that blends ${blendResult.genres.join(' and ')} into a ${blendResult.hybridGenre} hybrid. ${blendResult.intensityLabel} intensity. Use ${blendResult.instruments.slice(0, 5).join(', ')}. The mood should be ${blendResult.blendedMood}.`,
    ].join('\n');
  }, [blendResult, selected]);

  // Copy prompt
  const copyPrompt = useCallback(() => {
    const text = generatePrompt();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [generatePrompt]);

  // Save mix
  const saveMix = useCallback(() => {
    if (selected.length === 0) return;
    const mix: SavedMix = {
      id: Date.now().toString(36),
      name: blendResult?.hybridGenre || 'Unnamed Mix',
      characters: [...selected],
      weights: [...weights],
      bpmOverride,
      intensity,
      timestamp: Date.now(),
    };
    const updated = [mix, ...savedMixes].slice(0, 20);
    setSavedMixes(updated);
    localStorage.setItem('npgx-music-mixes', JSON.stringify(updated));
  }, [selected, weights, bpmOverride, intensity, blendResult, savedMixes]);

  // Load a saved mix
  const loadMix = useCallback((mix: SavedMix) => {
    setSelected(mix.characters);
    setWeights(mix.weights);
    setBpmOverride(mix.bpmOverride);
    setIntensity(mix.intensity);
    setShowSaved(false);
  }, []);

  // Delete a saved mix
  const deleteMix = useCallback((id: string) => {
    const updated = savedMixes.filter(m => m.id !== id);
    setSavedMixes(updated);
    localStorage.setItem('npgx-music-mixes', JSON.stringify(updated));
  }, [savedMixes]);

  // Gradient background colors
  const bgColors = selected.map(l => STYLE_COLORS[l] || '#DC143C');
  const bgGradient = bgColors.length >= 2
    ? `linear-gradient(135deg, ${bgColors.map((c, i) => `${c}15 ${(i / (bgColors.length - 1)) * 100}%`).join(', ')})`
    : bgColors.length === 1
      ? `linear-gradient(135deg, ${bgColors[0]}10 0%, transparent 100%)`
      : 'none';

  // Dominant character in current music context
  const dominantIdx = weights.length > 0 ? weights.indexOf(Math.max(...weights)) : -1;
  const dominantLetter = dominantIdx >= 0 ? selected[dominantIdx] : null;
  const dominantChar = dominantLetter ? NPGX_ROSTER.find(c => c.letter === dominantLetter) : null;

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden" style={{ background: bgGradient }}>
      {/* Animated background overlay */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-0"
            style={{
              background: `radial-gradient(ellipse at 50% 0%, ${bgColors[0] || '#DC143C'}10 0%, transparent 60%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="relative z-10 border-b border-red-500/20 bg-black/80 backdrop-blur-sm sticky top-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-red-500 hover:text-red-400 transition-colors">
              <FiMusic size={20} />
            </Link>
            <h1 className="text-lg font-black tracking-wider text-red-500" style={{ fontFamily: 'var(--font-brand)' }}>
              MUSIC DNA MIXER
            </h1>
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest hidden sm:block">NPGX</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Music controls */}
            <div className="flex items-center gap-1.5 mr-2">
              <button onClick={prevTrack} className="text-zinc-500 hover:text-red-400 transition-colors p-1"><FiSkipBack size={14} /></button>
              <button
                onClick={toggleMusic}
                className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-colors"
              >
                {isPlaying ? <FiPause size={14} /> : <FiPlay size={14} />}
              </button>
              <button onClick={nextTrack} className="text-zinc-500 hover:text-red-400 transition-colors p-1"><FiSkipForward size={14} /></button>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-zinc-500 text-[11px] mr-3 max-w-[180px]">
              <FiMusic size={10} className="shrink-0 text-red-400/50" />
              <span className="truncate">{currentTrackInfo?.title || 'No track'}</span>
              {dominantChar && (
                <span className="text-red-400 text-[9px] font-bold shrink-0">
                  [{dominantChar.letter}]
                </span>
              )}
            </div>
            {/* Nav menu */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 bg-black/60 border border-red-500/40 rounded-lg flex items-center justify-center hover:bg-red-500/20 transition-colors"
            >
              <FiMenu size={14} className="text-red-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center"
            onClick={() => setMenuOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-b from-zinc-900 to-black border border-red-500/40 rounded-2xl p-6 max-w-xs w-full mx-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-bold text-red-500" style={{ fontFamily: 'var(--font-brand)' }}>NPGX</span>
                <button onClick={() => setMenuOpen(false)} className="text-red-400/70 hover:text-red-400 text-xl">&times;</button>
              </div>
              <nav className="grid grid-cols-2 gap-2">
                {[
                  { href: '/', label: 'Home' },
                  { href: '/xxx', label: 'Gallery' },
                  { href: '/mixer', label: 'Video Mixer' },
                  { href: '/music-mixer', label: 'Music Mixer' },
                  { href: '/npgx', label: 'Characters' },
                  { href: '/image-gen', label: 'Generate' },
                ].map(l => (
                  <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-center bg-white/[0.03] text-red-200/70 hover:bg-red-500/10 hover:text-red-300 border border-transparent transition-all"
                  >{l.label}</Link>
                ))}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* ── LEFT COLUMN: Character Selector ────────────────────── */}
          <div className="lg:col-span-3">
            <Panel title="Select Characters (Max 3)">
              <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-4 gap-1.5">
                {NPGX_ROSTER.map((char) => (
                  <CharacterCard
                    key={char.letter}
                    character={char}
                    dna={MUSIC_DNA[char.letter]}
                    isSelected={selected.includes(char.letter)}
                    selectionIndex={selected.indexOf(char.letter)}
                    onClick={() => toggleCharacter(char.letter)}
                  />
                ))}
              </div>
              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={randomize}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  <FiShuffle size={12} />
                  Randomize
                </button>
                <button
                  onClick={() => { setSelected([]); setWeights([]); setBpmOverride(null); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  <FiX size={12} />
                  Clear
                </button>
              </div>
            </Panel>
          </div>

          {/* ── CENTER COLUMN: Mix Preview ─────────────────────────── */}
          <div className="lg:col-span-6 space-y-4">

            {/* Selected Characters Display */}
            <AnimatePresence mode="wait">
              {selected.length > 0 ? (
                <motion.div
                  key="selected"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Panel title="DNA Blend">
                    {/* Character images with X between them */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                      {selected.map((letter, i) => {
                        const char = NPGX_ROSTER.find(c => c.letter === letter);
                        if (!char) return null;
                        return (
                          <div key={letter} className="flex items-center gap-2">
                            {i > 0 && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1, rotate: [0, 180, 360] }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="text-red-500 font-black text-xl"
                                style={{ textShadow: '0 0 20px rgba(220,20,60,0.6)' }}
                              >
                                &times;
                              </motion.span>
                            )}
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: i * 0.1 }}
                              className="relative"
                            >
                              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden ring-2 ring-red-500/50 shadow-[0_0_25px_rgba(220,20,60,0.3)]">
                                <Image
                                  src={char.image}
                                  alt={char.name}
                                  width={96}
                                  height={96}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/90 border border-red-500/40 rounded text-[9px] font-bold text-red-400 whitespace-nowrap">
                                {char.name.split(' ')[0]}
                              </div>
                              {/* Weight indicator */}
                              <div
                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white"
                                style={{ backgroundColor: STYLE_COLORS[letter] || '#DC143C' }}
                              >
                                {weights[i] || 0}%
                              </div>
                            </motion.div>
                          </div>
                        );
                      })}
                    </div>

                    {/* DNA Helix */}
                    <DNAHelix
                      colors={selected.map(l => STYLE_COLORS[l] || '#DC143C')}
                      isActive={selected.length >= 2}
                    />

                    {/* Hybrid Genre Name */}
                    {blendResult && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center mt-3"
                      >
                        <div className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Hybrid Genre</div>
                        <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-pink-500 to-red-500"
                          style={{ fontFamily: 'var(--font-brand)' }}>
                          {blendResult.hybridGenre}
                        </div>
                        <div className="text-zinc-400 text-xs mt-1 font-mono">{blendResult.equation}</div>
                      </motion.div>
                    )}
                  </Panel>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Panel title="DNA Blend">
                    <div className="text-center py-12">
                      <div className="text-zinc-600 text-sm mb-2">Select 2-3 characters to begin mixing</div>
                      <div className="text-zinc-700 text-xs">Each character has unique music DNA that can be blended</div>
                      <button
                        onClick={randomize}
                        className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-400 text-sm font-semibold transition-colors"
                      >
                        <FiShuffle className="inline mr-2" size={14} />
                        Random Mix
                      </button>
                    </div>
                  </Panel>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mix Details */}
            <AnimatePresence>
              {blendResult && selected.length >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    <Panel title="BPM" className="text-center">
                      <div className="text-3xl font-black text-white font-mono">{blendResult.bpm}</div>
                      {bpmOverride !== null && (
                        <div className="text-[10px] text-zinc-500 mt-1">Original: {blendResult.rawBpm}</div>
                      )}
                      <WaveformBars bpm={blendResult.bpm} color={bgColors[0] || '#DC143C'} isActive={true} />
                    </Panel>
                    <Panel title="Key" className="text-center">
                      <div className="text-3xl font-black text-white font-mono">{blendResult.key}</div>
                      <div className="text-[10px] text-zinc-500 mt-1">
                        from {selected.map(l => MUSIC_DNA[l].key).join(', ')}
                      </div>
                    </Panel>
                    <Panel title="Intensity" className="text-center">
                      <div className="text-lg font-black text-red-400">{blendResult.intensityLabel}</div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background: `linear-gradient(90deg, #10B981, #EAB308, #EF4444, #DC143C)`,
                          }}
                          animate={{ width: `${intensity}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </Panel>
                  </div>

                  {/* Mood */}
                  <Panel title="Blended Mood">
                    <div className="text-pink-400 text-sm font-medium text-center italic">
                      &ldquo;{blendResult.blendedMood}&rdquo;
                    </div>
                  </Panel>

                  {/* Instruments + Influences */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Panel title="Instruments">
                      <div className="flex flex-wrap gap-1.5">
                        {blendResult.instruments.map((inst, i) => (
                          <Tag key={inst} label={inst} color={i < 4 ? 'red' : 'zinc'} />
                        ))}
                      </div>
                    </Panel>
                    <Panel title="Influences">
                      <div className="flex flex-wrap gap-1.5">
                        {blendResult.influences.map((inf) => (
                          <Tag key={inf} label={inf} color="purple" />
                        ))}
                      </div>
                    </Panel>
                  </div>

                  {/* Subgenres */}
                  <Panel title="Subgenre Spectrum">
                    <div className="flex flex-wrap gap-1.5">
                      {blendResult.subgenres.map(sg => (
                        <Tag key={sg} label={sg} color="pink" />
                      ))}
                    </div>
                  </Panel>

                  {/* Vocal Style */}
                  <Panel title="Vocal Style">
                    <div className="text-zinc-300 text-xs leading-relaxed">
                      {blendResult.vocalStyle}
                    </div>
                  </Panel>

                  {/* Production Notes */}
                  <Panel title="Production Notes">
                    <div className="text-zinc-400 text-xs leading-relaxed italic">
                      {blendResult.productionNotes}
                    </div>
                  </Panel>

                  {/* Output Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={copyPrompt}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
                        copied
                          ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                          : 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400'
                      }`}
                    >
                      <FiCopy size={14} />
                      {copied ? 'Copied!' : 'Copy Prompt'}
                    </button>
                    <button
                      onClick={saveMix}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 rounded-lg text-pink-400 font-semibold text-sm transition-colors"
                    >
                      <FiSave size={14} />
                      Save Mix
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── RIGHT COLUMN: Controls + Saved ──────────────────────── */}
          <div className="lg:col-span-3 space-y-4">
            {/* Mix Controls */}
            <Panel title="Mix Controls">
              {/* Balance */}
              {selected.length >= 2 && (
                <div className="mb-4">
                  <div className="text-red-400 text-[11px] uppercase tracking-wider mb-2 font-bold">Balance</div>
                  <BalanceTriangle
                    weights={weights}
                    onChange={setWeights}
                    names={selected.map(l => {
                      const char = NPGX_ROSTER.find(c => c.letter === l);
                      return char?.name.split(' ')[0] || l;
                    })}
                    colors={selected.map(l => STYLE_COLORS[l] || '#DC143C')}
                  />
                </div>
              )}

              {/* BPM Override */}
              <div className="mb-4 border-t border-red-500/10 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-red-400 text-[11px] uppercase tracking-wider font-bold">BPM Override</span>
                  {bpmOverride !== null && (
                    <button
                      onClick={() => setBpmOverride(null)}
                      className="text-[9px] text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <Slider
                  value={bpmOverride ?? blendResult?.rawBpm ?? 130}
                  min={60}
                  max={200}
                  onChange={(v) => setBpmOverride(v)}
                  label=""
                  displayValue={`${bpmOverride ?? blendResult?.rawBpm ?? 130} BPM`}
                />
              </div>

              {/* Intensity */}
              <div className="border-t border-red-500/10 pt-3">
                <Slider
                  value={intensity}
                  min={0}
                  max={100}
                  onChange={setIntensity}
                  label="Intensity"
                  displayValue={
                    intensity < 20 ? 'Ambient'
                      : intensity < 40 ? 'Chill'
                      : intensity < 60 ? 'Balanced'
                      : intensity < 80 ? 'Aggressive'
                      : 'Maximum'
                  }
                  color="pink"
                />
                <div className="flex justify-between text-[9px] text-zinc-600">
                  <span>Chill</span>
                  <span>Aggressive</span>
                </div>
              </div>
            </Panel>

            {/* Now Playing Context */}
            {selected.length > 0 && (
              <Panel title="Now Playing DNA">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg overflow-hidden ring-1 ring-red-500/30 shrink-0">
                    {dominantChar && (
                      <Image
                        src={dominantChar.image}
                        alt={dominantChar.name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-white text-xs font-bold truncate">
                      {currentTrackInfo?.title || 'No track'}
                    </div>
                    <div className="text-zinc-500 text-[10px]">
                      Dominant DNA: <span className="text-red-400 font-bold">{dominantChar?.name.split(' ')[0] || 'None'}</span>
                    </div>
                  </div>
                </div>
                {/* Weight bars */}
                <div className="space-y-1">
                  {selected.map((letter, i) => {
                    const char = NPGX_ROSTER.find(c => c.letter === letter);
                    return (
                      <div key={letter} className="flex items-center gap-2">
                        <span className="text-[9px] text-zinc-500 w-10 truncate">{char?.name.split(' ')[0]}</span>
                        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: STYLE_COLORS[letter] }}
                            animate={{ width: `${weights[i] || 0}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            )}

            {/* Saved Mixes */}
            <Panel title="Saved Mixes">
              {savedMixes.length === 0 ? (
                <div className="text-zinc-600 text-xs text-center py-4">
                  No saved mixes yet
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {savedMixes.map(mix => (
                    <div
                      key={mix.id}
                      className="flex items-center gap-2 p-2 bg-white/[0.02] border border-red-500/10 rounded-lg hover:border-red-500/30 transition-colors group"
                    >
                      <button
                        onClick={() => loadMix(mix)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="text-white text-xs font-bold truncate">{mix.name}</div>
                        <div className="text-zinc-500 text-[9px]">
                          {mix.characters.map(l => {
                            const c = NPGX_ROSTER.find(ch => ch.letter === l);
                            return c?.name.split(' ')[0] || l;
                          }).join(' + ')}
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="flex -space-x-1">
                          {mix.characters.map(l => (
                            <div
                              key={l}
                              className="w-4 h-4 rounded-full border border-black"
                              style={{ backgroundColor: STYLE_COLORS[l] }}
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => deleteMix(mix.id)}
                          className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                        >
                          <FiTrash2 size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* Individual DNA Readout */}
            {selected.length === 1 && (
              <Panel title={`${NPGX_ROSTER.find(c => c.letter === selected[0])?.name.split(' ')[0]} DNA`}>
                {(() => {
                  const dna = MUSIC_DNA[selected[0]];
                  return (
                    <div className="space-y-3">
                      <div>
                        <div className="text-red-400 text-[10px] uppercase tracking-wider mb-1">Genre</div>
                        <div className="text-white text-sm font-bold">{dna.genre}</div>
                      </div>
                      <div>
                        <div className="text-red-400 text-[10px] uppercase tracking-wider mb-1">Subgenres</div>
                        <div className="flex flex-wrap gap-1">
                          {dna.subgenres.map(sg => <Tag key={sg} label={sg} color="pink" />)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-red-400 text-[10px] uppercase tracking-wider">BPM</div>
                          <div className="text-white text-lg font-mono font-bold">{dna.bpm}</div>
                        </div>
                        <div>
                          <div className="text-red-400 text-[10px] uppercase tracking-wider">Key</div>
                          <div className="text-white text-lg font-mono font-bold">{dna.key}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-red-400 text-[10px] uppercase tracking-wider mb-1">Mood</div>
                        <div className="text-pink-400 text-xs italic">&ldquo;{dna.mood}&rdquo;</div>
                      </div>
                      <div>
                        <div className="text-red-400 text-[10px] uppercase tracking-wider mb-1">Instruments</div>
                        <div className="flex flex-wrap gap-1">
                          {dna.instruments.map(inst => <Tag key={inst} label={inst} color="red" />)}
                        </div>
                      </div>
                      <div>
                        <div className="text-red-400 text-[10px] uppercase tracking-wider mb-1">Influences</div>
                        <div className="flex flex-wrap gap-1">
                          {dna.influences.map(inf => <Tag key={inf} label={inf} color="purple" />)}
                        </div>
                      </div>
                      <div>
                        <div className="text-red-400 text-[10px] uppercase tracking-wider mb-1">Vocal Style</div>
                        <div className="text-zinc-300 text-[11px]">{dna.vocalStyle}</div>
                      </div>
                      <div>
                        <div className="text-red-400 text-[10px] uppercase tracking-wider mb-1">Production</div>
                        <div className="text-zinc-400 text-[11px] italic">{dna.productionNotes}</div>
                      </div>
                    </div>
                  );
                })()}
              </Panel>
            )}
          </div>
        </div>
      </main>

      {/* Footer spacer for mobile */}
      <div className="h-16 lg:h-8" />
    </div>
  );
}
