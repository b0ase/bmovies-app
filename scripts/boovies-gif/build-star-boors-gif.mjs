// Generates animated GIF: "Star bOOrs" trailer loop.
// Pipeline: SVG frames -> rsvg-convert PNGs -> ffmpeg palette + GIF.

import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const OUT_GIF = resolve(ROOT, 'public/boovies-star-trailer.gif');
const FRAME_DIR = '/tmp/star-boors-frames';
const FPS = 18;
const DURATION_S = 6;
const TOTAL = FPS * DURATION_S;
const W = 720;
const H = 405;

if (existsSync(FRAME_DIR)) rmSync(FRAME_DIR, { recursive: true });
mkdirSync(FRAME_DIR, { recursive: true });

// deterministic starfield
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}
const r = rng(42);
const STARS = Array.from({ length: 180 }, () => ({
  x: r() * W,
  y: r() * H,
  z: 0.2 + r() * 0.8,
  size: r() < 0.1 ? 2 : 1,
}));

function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

function frameSVG(i) {
  const t = i / TOTAL;          // 0..1 loop position
  const starOffset = (t * W * 1.6) % W;

  // phases:
  // 0.0 - 0.22 : "A long time ago..." crawl text
  // 0.22 - 0.55: big STAR BOORS title zoom from far -> close -> off
  // 0.55 - 0.80: lightsaber cross w/ OO
  // 0.80 - 1.00: Death Star with pink beam

  const starsSVG = STARS.map(s => {
    const x = (s.x - starOffset * s.z + W) % W;
    const opacity = 0.3 + s.z * 0.7;
    return `<rect x="${x.toFixed(1)}" y="${s.y.toFixed(1)}" width="${s.size}" height="${s.size}" fill="#fff" opacity="${opacity.toFixed(2)}"/>`;
  }).join('');

  let scene = '';

  if (t < 0.22) {
    // Opening crawl line
    const p = t / 0.22;
    const op = p < 0.15 ? p / 0.15 : p > 0.85 ? (1 - p) / 0.15 : 1;
    scene = `
      <text x="${W/2}" y="${H/2 - 10}" text-anchor="middle"
            font-family="Bebas Neue, Impact, sans-serif" font-size="22"
            letter-spacing="4" fill="#FFE81F" opacity="${op.toFixed(2)}">
        A LONG TIME AGO IN A
      </text>
      <text x="${W/2}" y="${H/2 + 22}" text-anchor="middle"
            font-family="Bebas Neue, Impact, sans-serif" font-size="22"
            letter-spacing="4" fill="#FF69B4" opacity="${op.toFixed(2)}">
        CHEEKIER GALAXY....
      </text>`;
  } else if (t < 0.55) {
    // STAR BOORS zoom title
    const p = (t - 0.22) / 0.33;
    const e = ease(p);
    // scale: small -> huge -> off
    const scale = 0.15 + e * 3.2;
    const op = p < 0.08 ? p / 0.08 : p > 0.92 ? (1 - p) / 0.08 : 1;
    scene = `
      <g transform="translate(${W/2} ${H/2}) scale(${scale.toFixed(3)})" opacity="${op.toFixed(2)}">
        <text x="0" y="0" text-anchor="middle"
              font-family="Bebas Neue, Impact, sans-serif" font-size="52"
              letter-spacing="6" fill="#FFE81F"
              stroke="#8a5a00" stroke-width="1">STAR <tspan fill="#FF69B4">B</tspan><tspan fill="#FF69B4">OO</tspan><tspan fill="#FF69B4">RS</tspan></text>
      </g>`;
  } else if (t < 0.80) {
    // Crossed pink lightsabers over twin OO
    const p = (t - 0.55) / 0.25;
    // sabers extend from 0 -> full
    const ext = Math.min(1, p * 2);
    const sabLen = 160 * ext;
    const pulse = 0.85 + Math.sin(p * Math.PI * 6) * 0.15;
    scene = `
      <g transform="translate(${W/2} ${H/2 + 20})">
        <!-- hilts -->
        <rect x="-70" y="60" width="8" height="24" fill="#bbb"/>
        <rect x="62"  y="60" width="8" height="24" fill="#bbb"/>
        <!-- sabers (glow + core) -->
        <g transform="rotate(-35)">
          <rect x="-3" y="${-sabLen}" width="6" height="${sabLen}" fill="#FF69B4" opacity="0.35" transform="translate(-66 60)" />
          <rect x="-1.5" y="${-sabLen}" width="3" height="${sabLen}" fill="#ffd6ec" transform="translate(-66 60)" />
        </g>
        <g transform="rotate(35)">
          <rect x="-3" y="${-sabLen}" width="6" height="${sabLen}" fill="#FF69B4" opacity="0.35" transform="translate(66 60)" />
          <rect x="-1.5" y="${-sabLen}" width="3" height="${sabLen}" fill="#ffd6ec" transform="translate(66 60)" />
        </g>
        <!-- twin OO (pink plus pixel style) -->
        <g fill="#FF69B4" opacity="${pulse.toFixed(2)}">
          <rect x="-70" y="-40" width="44" height="44"/>
          <rect x="-78" y="-32" width="60" height="28"/>
          <rect x="-62" y="-50" width="28" height="62"/>
          <rect x="26"  y="-40" width="44" height="44"/>
          <rect x="18"  y="-32" width="60" height="28"/>
          <rect x="34"  y="-50" width="28" height="62"/>
        </g>
        <rect x="-58" y="-28" width="18" height="22" fill="#02030a"/>
        <rect x="40"  y="-28" width="18" height="22" fill="#02030a"/>
      </g>`;
  } else {
    // Death Star with pink beam
    const p = (t - 0.80) / 0.20;
    const beamOp = Math.min(1, p * 3);
    const beamW = 8 + Math.sin(p * Math.PI * 8) * 3;
    const cx = W - 140, cy = H / 2;
    scene = `
      <circle cx="${cx}" cy="${cy}" r="90" fill="#444"/>
      <circle cx="${cx}" cy="${cy}" r="90" fill="url(#dsShade)"/>
      <!-- superlaser dish -->
      <circle cx="${cx - 22}" cy="${cy - 22}" r="20" fill="#222"/>
      <circle cx="${cx - 22}" cy="${cy - 22}" r="14" fill="#FF69B4" opacity="${(beamOp * 0.8).toFixed(2)}"/>
      <!-- equatorial trench -->
      <rect x="${cx - 90}" y="${cy - 2}" width="180" height="3" fill="#111"/>
      <!-- surface pixels -->
      <g fill="#222">
        <rect x="${cx - 60}" y="${cy + 20}" width="6" height="3"/>
        <rect x="${cx + 10}" y="${cy - 40}" width="4" height="4"/>
        <rect x="${cx - 20}" y="${cy + 40}" width="5" height="3"/>
        <rect x="${cx + 30}" y="${cy + 10}" width="3" height="3"/>
      </g>
      <!-- pink converging beam -->
      <line x1="${cx - 22}" y1="${cy - 22}" x2="0" y2="${cy - 22}"
            stroke="#FF69B4" stroke-width="${beamW.toFixed(1)}" opacity="${beamOp.toFixed(2)}"/>
      <line x1="${cx - 22}" y1="${cy - 22}" x2="0" y2="${cy - 22}"
            stroke="#ffd6ec" stroke-width="${(beamW/3).toFixed(1)}" opacity="${beamOp.toFixed(2)}"/>
      <text x="20" y="${H - 24}" font-family="Bebas Neue, Impact, sans-serif" font-size="18"
            letter-spacing="3" fill="#FFE81F" opacity="${beamOp.toFixed(2)}">MAY THE JIGGLE BE WITH YOU</text>`;
  }

  // bottom credit
  const creditOp = t > 0.05 ? 0.6 : 0;
  const credit = `<text x="${W/2}" y="${H - 8}" text-anchor="middle"
                        font-family="Inter, sans-serif" font-size="10"
                        letter-spacing="3" fill="#FF69B4" opacity="${creditOp}">bOOvies drive-in  ·  now playing</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="dsShade" cx="0.35" cy="0.35" r="0.75">
      <stop offset="0%"  stop-color="#888"/>
      <stop offset="60%" stop-color="#333"/>
      <stop offset="100%" stop-color="#0a0a0a"/>
    </radialGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
      <stop offset="60%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.85"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#02030a"/>
  ${starsSVG}
  ${scene}
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
  ${credit}
</svg>`;
}

console.log(`rendering ${TOTAL} frames at ${W}x${H}...`);
for (let i = 0; i < TOTAL; i++) {
  const svg = frameSVG(i);
  const svgPath = `${FRAME_DIR}/f${String(i).padStart(4, '0')}.svg`;
  const pngPath = `${FRAME_DIR}/f${String(i).padStart(4, '0')}.png`;
  writeFileSync(svgPath, svg);
  execSync(`rsvg-convert -w ${W} -h ${H} "${svgPath}" -o "${pngPath}"`);
  if (i % 20 === 0) process.stdout.write(`${i} `);
}
console.log('\ngenerating palette...');
execSync(`ffmpeg -y -framerate ${FPS} -i ${FRAME_DIR}/f%04d.png -vf "palettegen=max_colors=96" ${FRAME_DIR}/palette.png`, { stdio: 'inherit' });
console.log('encoding gif...');
execSync(`ffmpeg -y -framerate ${FPS} -i ${FRAME_DIR}/f%04d.png -i ${FRAME_DIR}/palette.png -lavfi "paletteuse=dither=bayer:bayer_scale=4" -loop 0 "${OUT_GIF}"`, { stdio: 'inherit' });
console.log(`\ndone: ${OUT_GIF}`);
