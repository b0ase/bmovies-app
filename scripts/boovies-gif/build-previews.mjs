// Generates trailer-preview HTML pages for all 5 bOOvies films.
// Each page shares the CRT frame + scanline look of the Star bOOrs preview,
// but gets its own color palette, metadata, and chiptune melody.

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

// ═══ Chiptune score helpers ═══
// Notes are [name, beats]. Rest = 'R'. Triplets = 1/3 beat each.
// Two voices: lead (square) + bass (triangle, -1 octave via detune).

const FILMS = [
  // ───────────────────────── The bOObfather ─────────────────────────
  {
    slug: 'boobfather',
    filmPage: 'boovies-boobfather.html',
    title: 'The b<span class="oo">OO</span>bfather',
    plainTitle: 'The bOObfather',
    tagline: `"I'm gonna make you an offer you can't jiggle out of."`,
    eyebrow: '★ DON NEVER REFUSES ★',
    colorHero: '#c76800',       // amber orange
    colorOO: '#FF69B4',
    colorAccent: '#8B0000',     // mafia red
    pills: ['R-OO', '175 min', 'Five Families', 'Cannoli'],
    synopsis: `A sprawling Sicilian-American crime saga about a family,
               a horse, and an offer so persuasive it <em>jiggles</em>.
               Don Vito runs New York like a father runs a dinner table —
               with love, threats, and disappointingly small portions.`,
    score: 'Nino Rota-<span style="color:#FF69B4">oo</span>',
    runtime: '6 seconds',
    format: 'GIF · 720×405',
    bpm: 92,
    // Nino Rota Godfather waltz — G minor, 3/4, descending line
    // (Simplified iconic opening: G-Bb-D | D-C-Bb | A-G-F | G---)
    lead: [
      ['G4', 1], ['Bb4', 1], ['D5', 1],
      ['D5', 1], ['C5', 1], ['Bb4', 1],
      ['A4', 1], ['G4', 1], ['F4', 1],
      ['G4', 3],
      ['G4', 1], ['Bb4', 1], ['D5', 1],
      ['Eb5', 1.5], ['D5', 0.5], ['C5', 1],
      ['Bb4', 1], ['A4', 1], ['G4', 1],
      ['G4', 3],
    ],
    bass: [
      ['G3', 3], ['F3', 3], ['Eb3', 3], ['D3', 3],
      ['G3', 3], ['C4', 3], ['D3', 3], ['G3', 3],
    ],
    leadType: 'square',
    bassType: 'triangle',
    waltzSnare: true,
  },

  // ───────────────────────── Jurassic Pork ─────────────────────────
  {
    slug: 'jurassic',
    filmPage: 'boovies-jurassic.html',
    title: 'Jurass<span class="oo">OO</span>ic Pork',
    plainTitle: 'Jurassic Pork',
    tagline: `"65 million years in the making. Still bouncy."`,
    eyebrow: '★ WELCOME TO THE PARK ★',
    colorHero: '#e8a21a',   // amber
    colorOO: '#FF69B4',
    colorAccent: '#0a3d1a', // jungle
    pills: ['PG-OO', '127 min', 'Isla Nublar', 'Amber-Grade'],
    synopsis: `An eccentric billionaire clones <em>very large</em> pigs from
               DNA trapped in prehistoric amber, then invites four scientists
               and two children to ride around them in jeeps. Nothing could
               possibly go wrong.`,
    score: 'John Williams-<span style="color:#FF69B4">oo</span>',
    runtime: '6 seconds',
    format: 'GIF · 720×405',
    bpm: 88,
    // Jurassic Park main theme (abridged, in D major)
    lead: [
      ['D5', 1.5], ['E5', 0.5], ['F#5', 2],
      ['A5', 1], ['G5', 1], ['F#5', 1], ['E5', 1],
      ['D5', 1.5], ['E5', 0.5], ['F#5', 2],
      ['E5', 1], ['D5', 1], ['E5', 2],
      ['D5', 1.5], ['E5', 0.5], ['F#5', 1], ['A5', 1],
      ['G5', 2], ['F#5', 1], ['E5', 1],
      ['D5', 4],
    ],
    bass: [
      ['D3', 2], ['A3', 2],
      ['D3', 2], ['A3', 2],
      ['D3', 2], ['G3', 2],
      ['D3', 2], ['A3', 2],
      ['D3', 4],
    ],
    leadType: 'square',
    bassType: 'triangle',
  },

  // ───────────────────────── Raid-OO-rs ─────────────────────────
  {
    slug: 'raiders',
    filmPage: 'boovies-raiders.html',
    title: 'Raid<span class="oo">OO</span>rs of the Lost Ark',
    plainTitle: 'Raiders of the Lost Ark',
    tagline: `"It belongs in a museum. Behind plexiglass. Preferably not jiggling."`,
    eyebrow: '★ ADVENTURE MATINEE ★',
    colorHero: '#e8b464',   // gold
    colorOO: '#FF69B4',
    colorAccent: '#8a5a10',
    pills: ['PG-OO', '115 min', 'Well of Souls', 'Top · Men'],
    synopsis: `An archeologist with a whip, a fear of snakes, and a complicated
               relationship with museums races Nazi agents to recover the Ark
               of the Covenant. One boulder, one basket chase, and one very
               bad face-melting later, the Ark goes in a crate. Forever.`,
    score: 'John Williams-<span style="color:#FF69B4">oo</span>',
    runtime: '6 seconds',
    format: 'GIF · 720×405',
    bpm: 126,
    // Raiders March — heroic, dotted, B flat major
    lead: [
      ['Bb4', 0.75], ['C5', 0.25], ['D5', 1.5], ['Bb4', 0.5],
      ['C5', 0.75], ['D5', 0.25], ['Eb5', 1.5], ['C5', 0.5],
      ['D5', 0.75], ['Eb5', 0.25], ['F5', 1], ['G5', 1],
      ['D5', 2], ['R', 1],
      ['Bb4', 0.75], ['C5', 0.25], ['D5', 1.5], ['Bb4', 0.5],
      ['C5', 0.75], ['D5', 0.25], ['Eb5', 1], ['D5', 1],
      ['C5', 1], ['Bb4', 3],
    ],
    bass: [
      ['Bb3', 1], ['F3', 1], ['Bb3', 1], ['F3', 1],
      ['Bb3', 1], ['F3', 1], ['Bb3', 1], ['F3', 1],
      ['Eb3', 1], ['Bb3', 1], ['Eb3', 1], ['Bb3', 1],
      ['F3', 2], ['Bb3', 2],
    ],
    leadType: 'square',
    bassType: 'triangle',
  },

  // ───────────────────────── Pulp Fict-OO-n ─────────────────────────
  {
    slug: 'pulp',
    filmPage: 'boovies-pulp.html',
    title: 'Pulp Fict<span class="oo">OO</span>n',
    plainTitle: 'Pulp Fiction',
    tagline: `"You know what they call a Quarter Pounder with Cheese in Paris? They don't. Their mouths are full."`,
    eyebrow: '★ CULT CLASSIC ★',
    colorHero: '#f6d64e',   // yellow
    colorOO: '#FF69B4',
    colorAccent: '#e62b4a',
    pills: ['R-OO', '154 min', 'Non-Linear', 'Royale With Cheese'],
    synopsis: `Two hitmen, a boxer, a gangster's wife, and a briefcase that
               <em>hums</em>. Stories interleave, a dance contest is won,
               adrenaline is deployed, and at no point does anyone explain
               what is actually inside the briefcase.`,
    score: 'Dick Dale-<span style="color:#FF69B4">oo</span>',
    runtime: '6 seconds',
    format: 'GIF · 720×405',
    bpm: 116,
    // Misirlou — chromatic surf rock in E Phrygian dominant
    lead: [
      ['E5', 0.25], ['F5', 0.25], ['G#5', 0.5], ['F5', 0.25], ['E5', 0.25],
      ['D#5', 0.5], ['E5', 1.5],
      ['E5', 0.25], ['F5', 0.25], ['G#5', 0.5], ['F5', 0.25], ['E5', 0.25],
      ['D#5', 0.5], ['E5', 1.5],
      ['A5', 0.5], ['G#5', 0.5], ['F#5', 0.5], ['G#5', 0.5],
      ['A5', 1], ['B5', 1],
      ['A5', 0.25], ['G#5', 0.25], ['F#5', 0.5], ['E5', 1],
      ['E5', 2],
    ],
    bass: [
      ['E3', 1], ['E3', 1], ['E3', 1], ['E3', 1],
      ['E3', 1], ['E3', 1], ['E3', 1], ['E3', 1],
      ['A3', 1], ['A3', 1], ['B3', 1], ['B3', 1],
      ['E3', 2], ['E3', 2],
    ],
    leadType: 'sawtooth',
    bassType: 'triangle',
  },

  // ───────────────────────── The bOOning ─────────────────────────
  {
    slug: 'booning',
    filmPage: 'boovies-booning.html',
    title: 'The b<span class="oo">OO</span>ning',
    plainTitle: 'The bOOning',
    tagline: `"All jiggle and no wobble makes Jack a dull boy."`,
    eyebrow: '★ MIDNIGHT SCREEN ★',
    colorHero: '#9a0c1a',   // blood red
    colorOO: '#FF69B4',
    colorAccent: '#c9d0d8',
    pills: ['R-OO', '146 min', 'Overlook Hotel', 'Room 237'],
    synopsis: `A writer takes a winter caretaker gig at a remote mountain
               hotel. His son speaks to an invisible friend named Tony. The
               elevators open onto a lobby's worth of unresolved issues.
               All jiggle and no wobble has consequences.`,
    score: 'Wendy Carlos-<span style="color:#FF69B4">oo</span>',
    runtime: '6 seconds',
    format: 'GIF · 720×405',
    bpm: 72,
    // Dies Irae — the ominous descending plainchant, in D minor
    lead: [
      ['D5', 1], ['C5', 0.5], ['D5', 0.5], ['Bb4', 1], ['C5', 1],
      ['A4', 2],
      ['A4', 0.5], ['Bb4', 0.5], ['G4', 0.5], ['A4', 0.5], ['F4', 1], ['G4', 1],
      ['A4', 2],
      ['F4', 1], ['G4', 0.5], ['F4', 0.5], ['E4', 1], ['D4', 1],
      ['D4', 2], ['R', 1],
    ],
    bass: [
      ['D3', 4],
      ['A2', 4],
      ['Bb2', 4],
      ['A2', 4],
      ['D3', 3],
    ],
    leadType: 'square',
    bassType: 'sawtooth',
    creepy: true,
  },
];

// ═══ Template ═══
function html(f) {
  const leadJSON = JSON.stringify(f.lead);
  const bassJSON = JSON.stringify(f.bass);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${f.plainTitle} — Trailer Preview</title>
  <meta name="description" content="8-bit trailer for ${f.plainTitle}. Chiptune engaged.">
  <link rel="icon" type="image/svg+xml" href="favicon.svg" />
  <link rel="stylesheet" href="css/mobile.css">
  <link rel="stylesheet" href="css/theme.css">
  <link rel="stylesheet" href="css/boovies-film.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Bebas+Neue&display=swap" rel="stylesheet">
  <style>
    :root {
      --hero: ${f.colorHero};
      --oo: ${f.colorOO};
      --accent: ${f.colorAccent};
    }
    .preview-wrap {
      max-width: 960px;
      margin: 0 auto;
      padding: 2rem 1.5rem 4rem;
      position: relative;
      z-index: 2;
    }
    .preview-eyebrow {
      font-family: 'Bebas Neue', sans-serif;
      letter-spacing: 0.3em;
      color: var(--oo);
      font-size: 0.8rem;
      text-align: center;
      margin-bottom: 0.4rem;
    }
    .preview-title {
      font-family: 'Bebas Neue', Impact, sans-serif;
      font-size: clamp(2.2rem, 6vw, 4.2rem);
      color: var(--hero);
      letter-spacing: 0.08em;
      text-align: center;
      line-height: 1;
      margin-bottom: 0.3rem;
      text-shadow: 0 0 24px rgba(255, 232, 31, 0.3);
    }
    .preview-title .oo { color: var(--oo); }
    .preview-tagline {
      text-align: center;
      color: #ccc;
      font-style: italic;
      letter-spacing: 0.05em;
      margin-bottom: 2rem;
      max-width: 680px;
      margin-left: auto;
      margin-right: auto;
    }
    .screen {
      position: relative;
      border: 3px solid var(--oo);
      box-shadow:
        0 0 0 2px #000,
        0 0 40px rgba(255, 105, 180, 0.4),
        inset 0 0 80px rgba(0, 0, 0, 0.6);
      background: #02030a;
      border-radius: 6px;
      overflow: hidden;
      aspect-ratio: 16 / 9;
    }
    .screen img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      image-rendering: pixelated;
    }
    .scanlines {
      position: absolute; inset: 0; pointer-events: none;
      background: repeating-linear-gradient(
        to bottom,
        rgba(0,0,0,0) 0,
        rgba(0,0,0,0) 2px,
        rgba(0,0,0,0.25) 3px,
        rgba(0,0,0,0) 4px
      );
      mix-blend-mode: multiply;
    }
    .screen-glow {
      position: absolute; inset: -1px; pointer-events: none;
      background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%);
    }

    .controls { display: flex; gap: 0.8rem; justify-content: center; margin-top: 1.2rem; flex-wrap: wrap; }
    .pbtn {
      font-family: 'Bebas Neue', sans-serif;
      letter-spacing: 0.2em; font-size: 0.95rem;
      padding: 0.75rem 1.4rem;
      background: var(--oo); color: #000;
      border: 2px solid var(--oo); cursor: pointer;
      transition: all 0.15s; border-radius: 2px;
    }
    .pbtn:hover { background: var(--hero); border-color: var(--hero); color: #000; }
    .pbtn.ghost { background: transparent; color: var(--hero); border-color: var(--hero); }
    .pbtn.ghost:hover { background: var(--hero); color: #000; }
    .pbtn[aria-pressed="true"] { background: var(--hero); border-color: var(--hero); }

    .eq { display: inline-flex; gap: 3px; margin-left: 0.5rem; vertical-align: middle; height: 14px; align-items: flex-end; }
    .eq span { display: inline-block; width: 3px; background: #000; height: 4px; }
    .playing .eq span { animation: eq 0.6s ease-in-out infinite alternate; }
    .playing .eq span:nth-child(2) { animation-delay: 0.1s; }
    .playing .eq span:nth-child(3) { animation-delay: 0.2s; }
    .playing .eq span:nth-child(4) { animation-delay: 0.15s; }
    @keyframes eq { from { height: 3px; } to { height: 14px; } }

    .specs { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin: 2.5rem 0; }
    .spec { border: 1px solid rgba(255, 105, 180, 0.3); padding: 0.9rem 1rem; background: rgba(255, 105, 180, 0.04); }
    .spec-k { font-size: 0.65rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--oo); margin-bottom: 0.3rem; }
    .spec-v { font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; color: #fff; letter-spacing: 0.06em; }

    .synopsis-mini { max-width: 720px; margin: 0 auto 2.5rem; text-align: center; line-height: 1.7; color: #bbb; font-size: 0.95rem; }
    .synopsis-mini em { color: var(--oo); font-style: italic; }

    .pill-row { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; margin-bottom: 2rem; }
    .pill { border: 1px solid #333; padding: 0.3rem 0.75rem; font-size: 0.65rem; letter-spacing: 0.2em; text-transform: uppercase; color: #888; border-radius: 999px; }

    .cta-strip { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.2rem; border: 1px solid rgba(255, 232, 31, 0.3); background: rgba(255, 232, 31, 0.04); margin-top: 2rem; flex-wrap: wrap; gap: 0.8rem; }
    .cta-strip .cta-text { color: var(--hero); letter-spacing: 0.08em; font-weight: 700; }

    .audio-hint { font-size: 0.7rem; color: #666; text-align: center; margin-top: 0.6rem; letter-spacing: 0.1em; }

    .other-trailers {
      margin-top: 3rem;
      border-top: 1px solid rgba(255, 105, 180, 0.2);
      padding-top: 2rem;
    }
    .other-trailers h3 {
      font-family: 'Bebas Neue', sans-serif;
      letter-spacing: 0.2em;
      color: var(--oo);
      text-align: center;
      margin-bottom: 1.2rem;
      font-size: 1rem;
    }
    .other-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.8rem;
    }
    .other-card {
      border: 1px solid #333;
      padding: 0.5rem;
      text-align: center;
      transition: border-color 0.15s;
      display: block;
    }
    .other-card:hover { border-color: var(--oo); }
    .other-card img { width: 100%; aspect-ratio: 16/9; object-fit: cover; image-rendering: pixelated; display: block; }
    .other-card-title { font-size: 0.7rem; letter-spacing: 0.1em; color: #ccc; margin-top: 0.4rem; text-transform: uppercase; }
    .other-card-title .oo { color: var(--oo); }
  </style>
</head>
<body>

  <div class="bg-circle c1"></div>
  <div class="bg-circle c2"></div>

  <div class="preview-wrap">

    <nav class="breadcrumb">
      <a href="boovies.html">&larr; bOOvies Drive-In</a> &middot;
      <a href="${f.filmPage}">${f.plainTitle}</a> &middot; Trailer Preview
    </nav>

    <div class="preview-eyebrow">${f.eyebrow}</div>
    <h1 class="preview-title">${f.title}</h1>
    <div class="preview-tagline">${f.tagline}</div>

    <div class="pill-row">
      ${f.pills.map(p => `<span class="pill">${p}</span>`).join('\n      ')}
    </div>

    <div class="screen" id="screen">
      <img src="boovies-${f.slug}-trailer.gif" alt="${f.plainTitle} animated trailer" />
      <div class="scanlines"></div>
      <div class="screen-glow"></div>
    </div>

    <div class="controls" id="controls">
      <button class="pbtn" id="playBtn" aria-pressed="false">
        <span id="playLabel">▶ Play Chiptune</span>
        <span class="eq" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
      </button>
      <a class="pbtn ghost" href="${f.filmPage}">View Full Listing</a>
    </div>
    <div class="audio-hint">8-bit theme cover · square waves, one chip, no regrets</div>

    <div class="specs">
      <div class="spec"><div class="spec-k">Format</div><div class="spec-v">${f.format}</div></div>
      <div class="spec"><div class="spec-k">Runtime</div><div class="spec-v">${f.runtime}</div></div>
      <div class="spec"><div class="spec-k">Tempo</div><div class="spec-v">${f.bpm} BPM</div></div>
      <div class="spec"><div class="spec-k">Score</div><div class="spec-v">${f.score}</div></div>
    </div>

    <p class="synopsis-mini">${f.synopsis}</p>

    <div class="cta-strip">
      <div class="cta-text">Want the full feature?</div>
      <a class="pbtn" href="${f.filmPage}">Book Tickets →</a>
    </div>

    <div class="other-trailers">
      <h3>Other Trailers Now Looping</h3>
      <div class="other-grid" id="otherGrid"></div>
    </div>

  </div>

  <footer class="site-footer" style="border-top-color: ${f.colorOO} !important; position: relative; z-index: 2;">
    <div class="footer-inner">
      <div class="footer-links">
        <a href="boovies.html">bOOvies Home</a>
        <a href="${f.filmPage}">${f.plainTitle}</a>
        <a href="about.html">About</a>
        <a href="watch.html">Watch</a>
      </div>
      <div class="footer-copy">&copy; 2026 bOOvies. Chiptune by silicon.</div>
    </div>
  </footer>

  <script src="js/boovies-nav.js"></script>

  <script>
    // ═════════════ Chiptune — ${f.plainTitle} ═════════════
    (function () {
      const btn      = document.getElementById('playBtn');
      const label    = document.getElementById('playLabel');
      const screen   = document.getElementById('screen');
      const controls = document.getElementById('controls');

      let ctx = null, playing = false, scheduled = [];

      const N = {
        C2: 65.41, D2: 73.42, Eb2: 77.78, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, Bb2: 116.54, B2: 123.47,
        C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
        C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, F5: 698.46, 'F#4': 369.99, G4: 392.00, Ab4: 415.30,
        'G#4': 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
        C5: 523.25, 'C#5': 554.37, D5: 587.33, 'D#5': 622.25, Eb5: 622.25, E5: 659.25,
        'F#5': 739.99, G5: 783.99, 'G#5': 830.61, A5: 880.00, Bb5: 932.33, B5: 987.77,
        C6: 1046.50, D6: 1174.66,
        R: 0
      };

      const LEAD = ${leadJSON};
      const BASS = ${bassJSON};
      const BPM = ${f.bpm};
      const leadType = ${JSON.stringify(f.leadType)};
      const bassType = ${JSON.stringify(f.bassType)};
      ${f.creepy ? 'const CREEPY = true;' : 'const CREEPY = false;'}
      ${f.waltzSnare ? 'const WALTZ = true;' : 'const WALTZ = false;'}

      function playVoice(sequence, opts) {
        const { type, gain, detune = 0, delayPerNote = 0 } = opts;
        const secPerBeat = 60 / BPM;
        let t = ctx.currentTime + 0.05;
        for (const [name, beats] of sequence) {
          const dur = beats * secPerBeat;
          const freq = N[name] ?? 0;
          if (freq > 0) {
            const osc = ctx.createOscillator();
            const g   = ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            osc.detune.value = detune;
            const a = 0.008, r = 0.04;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(gain, t + a);
            g.gain.setValueAtTime(gain, t + Math.max(a, dur - r));
            g.gain.linearRampToValueAtTime(0, t + dur);
            osc.connect(g).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + dur + 0.02);
            scheduled.push(osc);
            if (CREEPY) {
              // add a detuned shadow oscillator an octave up for dissonance
              const shadow = ctx.createOscillator();
              const sg = ctx.createGain();
              shadow.type = 'sawtooth';
              shadow.frequency.value = freq * 1.01;
              sg.gain.setValueAtTime(0, t);
              sg.gain.linearRampToValueAtTime(gain * 0.3, t + a);
              sg.gain.setValueAtTime(gain * 0.3, t + Math.max(a, dur - r));
              sg.gain.linearRampToValueAtTime(0, t + dur);
              shadow.connect(sg).connect(ctx.destination);
              shadow.start(t);
              shadow.stop(t + dur + 0.02);
              scheduled.push(shadow);
            }
          }
          t += dur;
        }
        return t;
      }

      function percClick(when, gain = 0.06) {
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        const src = ctx.createBufferSource();
        const g = ctx.createGain();
        g.gain.value = gain;
        src.buffer = buffer;
        src.connect(g).connect(ctx.destination);
        src.start(when);
        scheduled.push(src);
      }

      function stop() {
        playing = false;
        scheduled.forEach(n => { try { n.stop(); } catch {} });
        scheduled = [];
        btn.setAttribute('aria-pressed', 'false');
        controls.classList.remove('playing');
        label.textContent = '▶ Play Chiptune';
      }

      function play() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        playing = true;
        btn.setAttribute('aria-pressed', 'true');
        controls.classList.add('playing');
        label.textContent = '■ Stop Chiptune';

        const endLead = playVoice(LEAD, { type: leadType, gain: 0.13 });
        const endBass = playVoice(BASS, { type: bassType, gain: 0.20, detune: -1200 });

        const secPerBeat = 60 / BPM;
        const totalBeats = LEAD.reduce((a, [,b]) => a + b, 0);
        if (WALTZ) {
          // waltz 1 (kick) - 2 (snare) - 3 (snare)
          for (let b = 0; b < totalBeats; b += 3) {
            percClick(ctx.currentTime + 0.05 + (b + 1) * secPerBeat, 0.04);
            percClick(ctx.currentTime + 0.05 + (b + 2) * secPerBeat, 0.04);
          }
        } else if (!CREEPY) {
          for (let b = 1; b < totalBeats; b += 2) percClick(ctx.currentTime + 0.05 + b * secPerBeat);
        }

        const stopAt = Math.max(endLead, endBass);
        const dur = (stopAt - ctx.currentTime) * 1000;
        setTimeout(() => { if (playing) stop(); }, dur);
      }

      btn.addEventListener('click', () => { if (playing) stop(); else play(); });
      screen.addEventListener('click', () => { if (playing) stop(); else play(); });
    })();

    // ═════════════ Other trailers strip ═════════════
    (function () {
      const OTHERS = ${JSON.stringify(FILMS.map(x => ({ slug: x.slug, title: x.title, page: x.filmPage })))};
      const here = ${JSON.stringify(f.slug)};
      const star = { slug: 'star', title: 'Star b<span class="oo">OO</span>rs', page: 'boovies-star.html' };
      const grid = document.getElementById('otherGrid');
      [star, ...OTHERS].filter(o => o.slug !== here).forEach(o => {
        const a = document.createElement('a');
        a.className = 'other-card';
        a.href = \`boovies-\${o.slug}-preview.html\`;
        a.innerHTML = \`<img src="boovies-\${o.slug}-trailer.gif" alt=""><div class="other-card-title">\${o.title}</div>\`;
        grid.appendChild(a);
      });
    })();
  </script>
</body>
</html>`;
}

for (const f of FILMS) {
  const out = resolve(ROOT, `public/boovies-${f.slug}-preview.html`);
  writeFileSync(out, html(f));
  console.log(`wrote ${out}`);
}
