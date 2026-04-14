/**
 * NPGX Lyrics Engine
 *
 * Real lyrics from the original generation prompts (music/prompts/).
 * Parsed into rapid-fire display cues — Japanese + English fragments,
 * flash words, shouts, and section markers for the VJ mixer overlay.
 */

// ── Types ────────────────────────────────────────────────────────────────

export interface LyricCue {
  text: string;
  style: 'main' | 'flash' | 'shout' | 'japanese' | 'gang' | 'whisper';
  section: 'verse' | 'chorus' | 'bridge' | 'breakdown' | 'intro' | 'outro';
}

export interface TrackLyrics {
  cues: LyricCue[];
  title: string;
  titleJa?: string;
}

// ── Japanese detection ───────────────────────────────────────────────────

function containsJapanese(text: string): boolean {
  return /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF]/.test(text);
}

function isAllCaps(text: string): boolean {
  const letters = text.replace(/[^a-zA-Z]/g, '');
  return letters.length > 2 && letters === letters.toUpperCase();
}

// ── Smart cue parser ─────────────────────────────────────────────────────
// Breaks raw lyrics into rapid-fire display cues

function parseIntoCues(raw: string, defaultSection: LyricCue['section'] = 'verse'): LyricCue[] {
  const cues: LyricCue[] = [];
  let currentSection = defaultSection;

  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    // Section markers
    const sectionMatch = line.match(/^\[(.*?)\]$/);
    if (sectionMatch) {
      const s = sectionMatch[1].toLowerCase();
      if (s.includes('chorus')) currentSection = 'chorus';
      else if (s.includes('bridge')) currentSection = 'bridge';
      else if (s.includes('breakdown')) currentSection = 'breakdown';
      else if (s.includes('intro')) currentSection = 'intro';
      else if (s.includes('outro')) currentSection = 'outro';
      else currentSection = 'verse';
      continue;
    }

    // Inline section markers like [gang chant] or [sweet voice]
    const inlineMarker = line.match(/^\[(.*?)\]\s*(.*)/);
    if (inlineMarker) {
      const marker = inlineMarker[1].toLowerCase();
      const text = inlineMarker[2];
      if (marker.includes('gang') || marker.includes('chant')) {
        cues.push({ text, style: 'gang', section: currentSection });
      } else if (marker.includes('sweet')) {
        cues.push({ text, style: 'whisper', section: currentSection });
      } else if (marker.includes('scream')) {
        cues.push({ text, style: 'shout', section: currentSection });
      } else {
        cues.push({ text, style: 'main', section: currentSection });
      }
      continue;
    }

    // Split on " — " delimiter (bilingual separator)
    const dashParts = line.split(/\s*—\s*/);

    for (const part of dashParts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // Pure Japanese fragment
      if (containsJapanese(trimmed) && trimmed.length < 20) {
        cues.push({ text: trimmed, style: 'japanese', section: currentSection });
        continue;
      }

      // Mixed Japanese/English — split them
      if (containsJapanese(trimmed)) {
        // Extract Japanese portions
        const jaMatch = trimmed.match(/[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF]+[^\u0000-\u007F]*/g);
        if (jaMatch) {
          for (const ja of jaMatch) {
            cues.push({ text: ja, style: 'japanese', section: currentSection });
          }
        }
        // Extract English portions
        const enParts = trimmed.replace(/[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF]+/g, '|').split('|').filter(s => s.trim().length > 1);
        for (const en of enParts) {
          const t = en.trim().replace(/^\(|\)$/g, '').trim();
          if (!t) continue;
          cues.push({ text: t, style: isAllCaps(t) ? 'shout' : 'main', section: currentSection });
        }
        continue;
      }

      // ALL CAPS = shout
      if (isAllCaps(trimmed)) {
        cues.push({ text: trimmed, style: 'shout', section: currentSection });
        continue;
      }

      // Long English lines — break into fragments for faster cycling
      if (trimmed.length > 30) {
        const words = trimmed.split(/,\s*/);
        if (words.length >= 2) {
          for (const w of words) {
            cues.push({ text: w.trim(), style: 'main', section: currentSection });
          }
          continue;
        }
        // Split at midpoint on a word boundary
        const mid = Math.floor(trimmed.length / 2);
        const spaceIdx = trimmed.indexOf(' ', mid);
        if (spaceIdx > 0) {
          cues.push({ text: trimmed.slice(0, spaceIdx), style: 'main', section: currentSection });
          cues.push({ text: trimmed.slice(spaceIdx + 1), style: 'main', section: currentSection });
          continue;
        }
      }

      // Regular line
      cues.push({ text: trimmed, style: 'main', section: currentSection });
    }
  }

  return cues;
}

// ── REAL LYRICS (from music/prompts/) ────────────────────────────────────

const TRACK_LYRICS: Record<string, { raw: string; titleJa?: string }> = {
  // Track 01 — 路地裏の叫び / Tokyo Gutter Queen
  '路地裏の叫び': {
    titleJa: '路地裏の叫び',
    raw: `[Verse]
Tokyo gutter queen with blood on her boots
Neon rain falling on electric roots
中指立てろ — fuck you, stand up
We don't kneel, we don't bow, we don't break
This city's ours — every inch we take

[Chorus]
東京ガタークイーン
GUTTER QUEEN — GUTTER QUEEN
中指立てろ
THIS CITY'S OURS`,
  },

  // Track 02 — ネオン地獄 / Blade Girl
  'ネオン地獄': {
    titleJa: 'ネオン地獄',
    raw: `[Verse]
Blade girl blade girl cut the wire
Set the whole damn system on fire
鎖を壊せ — break the chain
Running barefoot through the acid rain
They built the cage but we ate the key

[Chorus]
刃物少女 — we are free
BLADE GIRL — BLADE GIRL
鎖を壊せ
CUT THE WIRE`,
  },

  // Track 03 — 暗黒東京 / Shibuya Mosh Pit
  '暗黒東京': {
    titleJa: '暗黒東京',
    raw: `[Verse]
Shibuya crossing at 3AM
Every punk girl is a loaded weapon
渋谷のモッシュピット — push me down
I get back up wearing the crown
Broken glass beneath platform boots

[Chorus]
渋谷のモッシュピット
ELECTRIC VEINS — BURNING ROOTS
PUSH ME DOWN
I GET BACK UP`,
  },

  // Track 04 — 錆びた刃 / Black Rose
  '錆びた刃': {
    titleJa: '錆びた刃',
    raw: `[Verse]
黒い薔薇 — black rose growing through concrete
Thorns like razors, smell like defeat
They said be pretty, we said be dangerous
Paint the walls red, make it scandalous

[Chorus]
One thousand girls with one thousand blades
We are the storm that never fades
黒い薔薇
BE DANGEROUS`,
  },

  // Track 05 — 下水道ブルース / Kabukicho Wolf
  '下水道ブルース': {
    titleJa: '下水道ブルース',
    raw: `[Verse]
OI OI OI — Kabukicho wolf pack
Leather and chains and there's no going back
歌舞伎町の狼 — howl at the neon moon
Smash the pretty things — coming for you soon

[Chorus]
[gang chant] WE DON'T DIE — WE MULTIPLY
[gang chant] WE DON'T CRY — WE ELECTRIFY
歌舞伎町の狼
OI OI OI`,
  },

  // Track 06 — 墨田川パンク / Razor Kisses
  '墨田川パンク': {
    titleJa: '墨田川パンク',
    raw: `[Verse]
Razor kisses on a dirty mirror
Every scar just makes me clearer
カミソリのキス — taste the static
Smash the signal — go erratic

[Chorus]
Pretty poison in a PVC dress
Love me harder, love me less
カミソリのキス
GO ERRATIC`,
  },

  // Track 08 — 歌舞伎町ミッドナイト / Harajuku Chainsaw
  '歌舞伎町ミッドナイト': {
    titleJa: '歌舞伎町ミッドナイト',
    raw: `[Verse]
[sweet voice] Harajuku Sunday, pink and cute~
[SCREAM] CHAINSAW THROUGH THE WHOLE DAMN SUIT
原宿チェーンソー — kawaii till it kills
Sugar-coated violence, cherry blossom thrills

[Chorus]
Lolita on the outside, demon underneath
Smile real pretty while we bare our teeth
原宿チェーンソー
KAWAII TILL IT KILLS`,
  },

  // Track 09 — コンクリート・ドリーム / Underground Empress
  'コンクリート・ドリーム': {
    titleJa: 'コンクリート・ドリーム',
    raw: `[Verse]
Underground empress — no throne required
Self-appointed, self-admired
地下の女帝 — ruling from the pit
Every show's a revolution, every song's a hit

[Chorus]
They own the buildings but we own the streets
Platform boots making concrete beats
地下の女帝
NO THRONE REQUIRED`,
  },

  // Track 11 — 東京ガタパンク / Fire Girl + Title Track
  '東京ガタパンク': {
    titleJa: '東京ガタパンク',
    raw: `[Verse]
炎の少女 — fire girl, burning bright
Neon halo in the Tokyo night
One two three four — kick down the door
We came to play and we came for war

[Chorus]
FIRE GIRL — 燃えてる
FIRE GIRL — 走ってる
FIRE GIRL — 叫んでる
FIRE GIRL — 生きてる

[Outro]
東京ガタパンク
TOKYO GUTTER PUNK FOREVER`,
  },

  // ── Singles ──

  '暴走ハートビート': {
    titleJa: '暴走ハートビート',
    raw: `[Verse]
暴走ハートビート — heart out of control
Runaway pulse — rock and roll
ビートが止まらない
Can't slow down, can't hold back

[Chorus]
暴走 HEARTBEAT
暴走 HEARTBEAT
OUT OF CONTROL
止まらない`,
  },

  '赤信号ぶっちぎれ': {
    titleJa: '赤信号ぶっちぎれ',
    raw: `[Verse]
Red light — we don't stop
赤信号ぶっちぎれ
Every rule was made to break
Burning rubber, burning bright

[Chorus]
RUN THE RED LIGHT
赤信号ぶっちぎれ
NO LOOKING BACK
SPEED THROUGH EVERY SIGN`,
  },

  '反逆エンジン': {
    titleJa: '反逆エンジン',
    raw: `[Verse]
Rebellion engine — start it up
反逆エンジン — full throttle
Chrome and chaos, sparks and steel
This rebellion is for real

[Chorus]
反逆エンジン REVVING HIGH
DO OR DIE
This machine runs on pure rage
BREAK THE LOCK — ESCAPE THE CAGE`,
  },

  '地下ガールズ革命': {
    titleJa: '地下ガールズ革命',
    raw: `[Verse]
Underground — where the real ones meet
Girls with guitars sharp as knives
地下ガールズ革命
Cutting through the lies of our lives

[Chorus]
UNDERGROUND GIRLS REVOLUTION
地下ガールズ革命
We don't need your stage or your mic
WE BUILT OUR OWN AND IT SOUNDS TIGHT`,
  },

  '焦げたスニーカー': {
    titleJa: '焦げたスニーカー',
    raw: `[Verse]
Burnt sneakers on the power line
焦げたスニーカー
Kicked through puddles, ran through fire
These shoes carried every desire

[Chorus]
BURNT SNEAKERS — STILL RUNNING
焦げたスニーカー
You can torch the sole but not the soul
STILL COMING`,
  },

  '燃えるまで噛みつけ': {
    titleJa: '燃えるまで噛みつけ',
    raw: `[Verse]
BITE DOWN HARD — don't let go
燃えるまで噛みつけ
Teeth marks on the hand that feeds
We don't beg — we don't plead

[Chorus]
BITE UNTIL IT BURNS
燃えるまで噛みつけ
Set the whole thing on fire
BREAK THEIR CHAINS AND ALL THEIR LAWS`,
  },

  '爆速ギャルズ・ゼロ距離': {
    titleJa: '爆速ギャルズ・ゼロ距離',
    raw: `[Verse]
LIGHTSPEED GALS at zero range
爆速ギャルズ — nothing is strange
Point blank — in your face
Fastest girls in any place

[Chorus]
爆速ギャルズ — ZERO DISTANCE
ZERO RESISTANCE
Blink and you missed it — that was us
ZERO ZERO ZERO`,
  },
};

// ── Pre-parsed cues cache ────────────────────────────────────────────────

const PARSED_CACHE = new Map<string, TrackLyrics>();

function getOrParse(key: string): TrackLyrics | null {
  if (PARSED_CACHE.has(key)) return PARSED_CACHE.get(key)!;
  const entry = TRACK_LYRICS[key];
  if (!entry) return null;
  const result: TrackLyrics = {
    cues: parseIntoCues(entry.raw),
    title: key,
    titleJa: entry.titleJa,
  };
  PARSED_CACHE.set(key, result);
  return result;
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Get lyrics for a track by its Japanese title.
 */
export function getLyrics(title: string): TrackLyrics | null {
  // Direct match
  const direct = getOrParse(title);
  if (direct) return direct;

  // Fuzzy match — check if title contains any key
  for (const key of Object.keys(TRACK_LYRICS)) {
    if (title.includes(key) || key.includes(title)) {
      return getOrParse(key);
    }
  }

  return null;
}

/**
 * Get current display frame — returns multiple cues for layered rendering.
 * The mixer calls this every frame to get what to display.
 */
export function getLyricFrame(
  lyrics: TrackLyrics,
  progress: number,
  duration: number,
  beatPulse: number,
): LyricFrame {
  if (!lyrics.cues.length || duration <= 0) {
    return { main: null, japanese: null, flash: null, echo: null, section: 'verse' };
  }

  const totalCues = lyrics.cues.length;
  const cueTime = duration / totalCues;
  const cueIndex = Math.min(Math.floor(progress / cueTime), totalCues - 1);
  const cueProgress = (progress % cueTime) / cueTime; // 0-1 within current cue

  const current = lyrics.cues[Math.max(0, cueIndex)];
  const prev = cueIndex > 0 ? lyrics.cues[cueIndex - 1] : null;
  const next = cueIndex < totalCues - 1 ? lyrics.cues[cueIndex + 1] : null;

  // Find nearby Japanese cue for overlay
  let japaneseCue: LyricCue | null = null;
  for (let i = Math.max(0, cueIndex - 2); i <= Math.min(totalCues - 1, cueIndex + 2); i++) {
    if (lyrics.cues[i].style === 'japanese' && i !== cueIndex) {
      japaneseCue = lyrics.cues[i];
      break;
    }
  }

  // Entry animation (first 15% of cue)
  const entryPhase = cueProgress < 0.15;
  // Exit animation (last 10% of cue)
  const exitPhase = cueProgress > 0.9;

  // Scale: zoom in on entry, slight pulse on beat
  let scale = 1;
  if (entryPhase) scale = 0.3 + (cueProgress / 0.15) * 0.7; // zoom from 30% to 100%
  if (current.style === 'shout' || current.style === 'gang') scale *= 1.2 + beatPulse * 0.3;
  else scale *= 1 + beatPulse * 0.1;

  // Opacity: hard cut in, slight fade on exit
  let opacity = 1;
  if (entryPhase && current.style !== 'flash') opacity = Math.min(1, cueProgress / 0.05); // very fast fade in
  if (exitPhase) opacity = 1 - ((cueProgress - 0.9) / 0.1) * 0.3;

  // Position jitter on beat
  const jitterX = beatPulse > 0.3 ? (Math.random() - 0.5) * beatPulse * 15 : 0;
  const jitterY = beatPulse > 0.3 ? (Math.random() - 0.5) * beatPulse * 8 : 0;

  // Main text
  const main: LyricFrame['main'] = {
    text: current.text,
    style: current.style,
    scale,
    opacity,
    offsetX: jitterX,
    offsetY: jitterY,
    rotation: current.style === 'shout' ? (Math.random() - 0.5) * beatPulse * 0.05 : 0,
  };

  // Japanese overlay — offset position, different timing
  const japanese: LyricFrame['japanese'] = japaneseCue ? {
    text: japaneseCue.text,
    opacity: 0.4 + beatPulse * 0.3,
    offsetX: (Math.sin(progress * 0.5) * 0.15), // gentle drift
    offsetY: -0.12, // above center
  } : null;

  // Flash word — extract a key word from current or next cue
  let flash: LyricFrame['flash'] = null;
  if (beatPulse > 0.5 && Math.random() < 0.4) {
    const source = next || current;
    const words = source.text.split(/\s+/).filter(w => w.length > 2);
    if (words.length > 0) {
      const word = words[Math.floor(Math.random() * words.length)];
      flash = {
        text: word,
        x: 0.15 + Math.random() * 0.7,
        y: 0.2 + Math.random() * 0.6,
        scale: 1.5 + Math.random() * 2,
        opacity: 0.3 + beatPulse * 0.4,
      };
    }
  }

  // Echo — previous line fading out
  const echo: LyricFrame['echo'] = prev && cueProgress < 0.4 ? {
    text: prev.text,
    opacity: 0.15 * (1 - cueProgress / 0.4),
    offsetY: 0.08 + cueProgress * 0.05, // drift down
  } : null;

  return {
    main,
    japanese,
    flash,
    echo,
    section: current.section,
  };
}

export interface LyricFrame {
  main: {
    text: string;
    style: LyricCue['style'];
    scale: number;
    opacity: number;
    offsetX: number;
    offsetY: number;
    rotation: number;
  } | null;
  japanese: {
    text: string;
    opacity: number;
    offsetX: number; // relative to canvas width (0-1)
    offsetY: number; // relative offset from center
  } | null;
  flash: {
    text: string;
    x: number; // 0-1
    y: number; // 0-1
    scale: number;
    opacity: number;
  } | null;
  echo: {
    text: string;
    opacity: number;
    offsetY: number;
  } | null;
  section: LyricCue['section'];
}
