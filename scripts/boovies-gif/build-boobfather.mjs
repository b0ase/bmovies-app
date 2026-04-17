// The bOObfather — mafia orange/red, venetian blinds, rose, "offer" text
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGif, ease, credit } from './lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const W = 720, H = 405;

function frame(i, total) {
  const t = i / total;
  // Phases
  //  0.00-0.25 venetian blinds with silhouette + "A FAMILY MATTER"
  //  0.25-0.50 rose pulsing + "I MADE HIM AN OFFER..."
  //  0.50-0.75 big title BOOBFATHER zoom
  //  0.75-1.00 gramophone/horsehead suggestion + "HE COULDN'T JIGGLE OUT OF."

  let scene = '';
  const warm = '#c76800';
  const red  = '#8B0000';
  const pink = '#FF69B4';
  const cream = '#f6e1b8';

  if (t < 0.25) {
    const p = t / 0.25;
    const op = p < 0.15 ? p/0.15 : p > 0.85 ? (1-p)/0.15 : 1;
    // venetian blind horizontal slats with amber glow through
    const slats = [];
    for (let y = 20; y < H; y += 26) {
      slats.push(`<rect x="0" y="${y}" width="${W}" height="14" fill="#1a0a00"/>`);
      slats.push(`<rect x="0" y="${y+14}" width="${W}" height="1" fill="${warm}" opacity="0.6"/>`);
    }
    // silhouette of Don
    scene = `
      <rect width="${W}" height="${H}" fill="#2a1405"/>
      <rect x="0" y="0" width="${W}" height="${H}" fill="${warm}" opacity="0.12"/>
      ${slats.join('')}
      <g transform="translate(${W/2} ${H - 30})">
        <ellipse cx="0" cy="-180" rx="60" ry="68" fill="#000"/>
        <rect x="-90" y="-120" width="180" height="160" fill="#000"/>
        <polygon points="-110,-120 110,-120 125,40 -125,40" fill="#000"/>
        <!-- fedora -->
        <ellipse cx="0" cy="-235" rx="92" ry="10" fill="#000"/>
        <rect x="-55" y="-270" width="110" height="42" fill="#000"/>
        <ellipse cx="0" cy="-270" rx="55" ry="12" fill="#000"/>
        <!-- red lapel flower -->
        <circle cx="-36" cy="-90" r="8" fill="${red}"/>
      </g>
      <text x="${W/2}" y="${H/2 - 60}" text-anchor="middle"
            font-family="Bebas Neue, Impact, serif" font-size="26"
            letter-spacing="6" fill="${cream}" opacity="${op}">A FAMILY MATTER</text>`;
  } else if (t < 0.50) {
    const p = (t - 0.25) / 0.25;
    const op = p < 0.1 ? p/0.1 : p > 0.9 ? (1-p)/0.1 : 1;
    const pulse = 1 + Math.sin(p * Math.PI * 4) * 0.1;
    // Big rose center
    scene = `
      <rect width="${W}" height="${H}" fill="#14060a"/>
      <g transform="translate(${W/2} ${H/2}) scale(${pulse.toFixed(3)})">
        <!-- rose pixelated -->
        <g fill="${red}">
          <rect x="-44" y="-40" width="88" height="70"/>
          <rect x="-56" y="-28" width="112" height="46"/>
          <rect x="-32" y="-56" width="64" height="96"/>
        </g>
        <g fill="#5a0010">
          <rect x="-10" y="-14" width="20" height="20"/>
          <rect x="-22" y="-4"  width="10" height="16"/>
          <rect x="12"  y="-4"  width="10" height="16"/>
        </g>
        <!-- stem -->
        <rect x="-3" y="30" width="6" height="70" fill="#2a5010"/>
        <!-- leaf -->
        <polygon points="3,60 24,52 10,70" fill="#3a6018"/>
      </g>
      <text x="${W/2}" y="40" text-anchor="middle"
            font-family="Bebas Neue, Impact, serif" font-size="20"
            letter-spacing="4" fill="${cream}" opacity="${op}">I MADE HIM AN OFFER…</text>`;
  } else if (t < 0.75) {
    const p = (t - 0.50) / 0.25;
    const e = ease(p);
    const scale = 0.2 + e * 2.8;
    const op = p < 0.08 ? p/0.08 : p > 0.92 ? (1-p)/0.08 : 1;
    scene = `
      <rect width="${W}" height="${H}" fill="#0a0000"/>
      <g transform="translate(${W/2} ${H/2}) scale(${scale.toFixed(3)})" opacity="${op}">
        <text x="0" y="0" text-anchor="middle"
              font-family="Bebas Neue, Impact, serif" font-size="34"
              letter-spacing="6" fill="${cream}"
              stroke="${red}" stroke-width="1.2">The b<tspan fill="${pink}">OO</tspan>bfather</text>
      </g>`;
  } else {
    const p = (t - 0.75) / 0.25;
    const op = p < 0.1 ? p/0.1 : 1;
    // Puppet strings hanging from top — the "godfather" M
    const strings = [];
    for (let x = 80; x < W; x += 80) {
      strings.push(`<line x1="${x}" y1="0" x2="${x + Math.sin(p*Math.PI*2 + x) * 4}" y2="${H*0.45}" stroke="${cream}" stroke-width="0.5" opacity="0.3"/>`);
    }
    scene = `
      <rect width="${W}" height="${H}" fill="#08020a"/>
      ${strings.join('')}
      <!-- the iconic "M" puppet string logo -->
      <g transform="translate(${W/2} ${H*0.4})" opacity="${op}">
        <line x1="-60" y1="-60" x2="-60" y2="0" stroke="${cream}" stroke-width="1"/>
        <line x1="0" y1="-60" x2="0" y2="-20" stroke="${cream}" stroke-width="1"/>
        <line x1="60" y1="-60" x2="60" y2="0" stroke="${cream}" stroke-width="1"/>
        <!-- hanging hand -->
        <rect x="-8" y="0" width="16" height="14" fill="${red}"/>
        <rect x="-10" y="10" width="20" height="8" fill="#8a4018"/>
      </g>
      <text x="${W/2}" y="${H - 40}" text-anchor="middle"
            font-family="Bebas Neue, Impact, serif" font-size="20"
            letter-spacing="4" fill="${pink}" opacity="${op}">HE COULDN'T JIGGLE OUT OF.</text>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
      <stop offset="60%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.85"/>
    </radialGradient>
  </defs>
  ${scene}
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
  ${credit(W, H, '#c76800')}
</svg>`;
}

buildGif({
  outPath: resolve(ROOT, 'public/boovies-boobfather-trailer.gif'),
  frameDir: '/tmp/boobfather-frames',
  W, H, fps: 18, durationS: 6,
  renderFrame: frame,
});
console.log('done: boobfather');
