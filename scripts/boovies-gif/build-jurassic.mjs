// Jurassic Pork — jungle green, amber DNA, T-Rex silhouette, ripple cup
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGif, ease, credit } from './lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const W = 720, H = 405;

function frame(i, total) {
  const t = i / total;
  const pink = '#FF69B4', amber = '#e8a21a', jungle = '#0a3d1a', deep = '#04130a';
  let scene = '';

  if (t < 0.25) {
    // Cup of water with concentric ripples (T-Rex footstep)
    const p = t / 0.25;
    const op = p < 0.1 ? p/0.1 : p > 0.9 ? (1-p)/0.1 : 1;
    const rings = [];
    for (let k = 0; k < 3; k++) {
      const rp = (p + k * 0.33) % 1;
      rings.push(`<ellipse cx="${W/2}" cy="${H/2 + 30}" rx="${60 + rp * 120}" ry="${10 + rp * 20}" fill="none" stroke="${pink}" stroke-width="${(1 - rp) * 2}" opacity="${(1 - rp).toFixed(2)}"/>`);
    }
    scene = `
      <rect width="${W}" height="${H}" fill="${deep}"/>
      <!-- dashboard silhouette -->
      <rect x="0" y="${H*0.75}" width="${W}" height="${H*0.25}" fill="#000"/>
      <!-- cup -->
      <rect x="${W/2 - 60}" y="${H/2 - 10}" width="120" height="110" fill="#222"/>
      <rect x="${W/2 - 54}" y="${H/2 - 4}" width="108" height="14" fill="${pink}" opacity="0.8"/>
      <ellipse cx="${W/2}" cy="${H/2 - 4}" rx="54" ry="8" fill="${pink}"/>
      ${rings.join('')}
      <text x="${W/2}" y="60" text-anchor="middle"
            font-family="Bebas Neue, Impact, sans-serif" font-size="20"
            letter-spacing="5" fill="${amber}" opacity="${op}">SOMETHING'S COMING…</text>`;
  } else if (t < 0.5) {
    // Amber fossil with mosquito DNA
    const p = (t - 0.25) / 0.25;
    const op = p < 0.1 ? p/0.1 : p > 0.9 ? (1-p)/0.1 : 1;
    const sway = Math.sin(p * Math.PI * 2) * 4;
    scene = `
      <rect width="${W}" height="${H}" fill="${deep}"/>
      <!-- amber droplet -->
      <g transform="translate(${W/2} ${H/2 + sway})">
        <ellipse cx="0" cy="20" rx="140" ry="120" fill="${amber}" opacity="0.95"/>
        <ellipse cx="0" cy="20" rx="140" ry="120" fill="url(#amberGlow)"/>
        <!-- mosquito -->
        <g fill="#2a1a05">
          <ellipse cx="0" cy="20" rx="10" ry="20"/>
          <circle cx="0" cy="-2" r="6"/>
          <line x1="0" y1="-2" x2="-18" y2="-14" stroke="#2a1a05" stroke-width="1.5"/>
          <line x1="0" y1="-2" x2="18" y2="-14" stroke="#2a1a05" stroke-width="1.5"/>
          <line x1="-4" y1="8" x2="-16" y2="18" stroke="#2a1a05" stroke-width="1"/>
          <line x1="4" y1="8" x2="16" y2="18" stroke="#2a1a05" stroke-width="1"/>
        </g>
        <!-- DNA strand -->
        <g stroke="${pink}" stroke-width="2" fill="none">
          <path d="M -90 -40 Q -70 -20 -90 0 Q -110 20 -90 40"/>
          <path d="M -50 -40 Q -70 -20 -50 0 Q -30 20 -50 40"/>
        </g>
      </g>
      <defs>
        <radialGradient id="amberGlow" cx="0.3" cy="0.3">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.5"/>
          <stop offset="60%" stop-color="#fff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <text x="${W/2}" y="50" text-anchor="middle"
            font-family="Bebas Neue, Impact, sans-serif" font-size="18"
            letter-spacing="4" fill="${amber}" opacity="${op}">65 MILLION YEARS · STILL BOUNCY</text>`;
  } else if (t < 0.78) {
    // T-Rex roar silhouette with lightning flash
    const p = (t - 0.5) / 0.28;
    const flash = (p % 0.15) < 0.03 ? 0.4 : 0;
    const shake = Math.sin(p * Math.PI * 14) * 2;
    scene = `
      <rect width="${W}" height="${H}" fill="${deep}"/>
      <!-- jungle trees silhouette -->
      <g fill="#02080a">
        <polygon points="0,${H} 30,${H-60} 60,${H-30} 90,${H-80} 120,${H-20} 150,${H-50} 180,${H}"/>
        <polygon points="${W},${H} ${W-30},${H-50} ${W-60},${H-20} ${W-90},${H-70} ${W-120},${H-30} ${W-150},${H-60} ${W-180},${H}"/>
      </g>
      <!-- lightning flash -->
      <rect width="${W}" height="${H}" fill="#8ab0d8" opacity="${flash}"/>
      <!-- T-Rex -->
      <g transform="translate(${W/2 + shake} ${H/2 + 40})" fill="#000">
        <!-- body -->
        <ellipse cx="0" cy="40" rx="110" ry="50"/>
        <!-- tail -->
        <polygon points="80,40 200,10 210,40"/>
        <!-- head -->
        <rect x="-130" y="-40" width="70" height="50"/>
        <polygon points="-130,-40 -180,-20 -130,0"/>
        <!-- teeth -->
        <polygon points="-170,-10 -166,2 -162,-10" fill="#fff"/>
        <polygon points="-160,-10 -156,2 -152,-10" fill="#fff"/>
        <polygon points="-150,-10 -146,2 -142,-10" fill="#fff"/>
        <!-- arms (tiny) -->
        <rect x="-30" y="20" width="30" height="6"/>
        <rect x="-30" y="26" width="6" height="10"/>
        <!-- legs -->
        <rect x="-40" y="70" width="20" height="40"/>
        <rect x="20" y="70" width="20" height="40"/>
        <!-- pink eye -->
        <circle cx="-105" cy="-25" r="4" fill="${pink}"/>
      </g>`;
  } else {
    // JURASSIC PORK logo
    const p = (t - 0.78) / 0.22;
    const op = p < 0.15 ? p/0.15 : 1;
    scene = `
      <rect width="${W}" height="${H}" fill="${deep}"/>
      <!-- gates of park -->
      <rect x="${W/2 - 160}" y="${H/2 - 90}" width="320" height="180" fill="none" stroke="#5a3a18" stroke-width="6"/>
      <rect x="${W/2 - 10}" y="${H/2 - 90}" width="20" height="180" fill="#5a3a18"/>
      <!-- torches -->
      <circle cx="${W/2 - 180}" cy="${H/2 - 80}" r="${10 + Math.sin(p * Math.PI * 6) * 2}" fill="${amber}" opacity="0.85"/>
      <circle cx="${W/2 + 180}" cy="${H/2 - 80}" r="${10 + Math.sin(p * Math.PI * 6 + 1) * 2}" fill="${amber}" opacity="0.85"/>
      <text x="${W/2}" y="${H/2 - 10}" text-anchor="middle"
            font-family="Bebas Neue, Impact, sans-serif" font-size="34"
            letter-spacing="6" fill="${amber}" opacity="${op}">JURASS<tspan fill="${pink}">OO</tspan>IC</text>
      <text x="${W/2}" y="${H/2 + 38}" text-anchor="middle"
            font-family="Bebas Neue, Impact, sans-serif" font-size="34"
            letter-spacing="6" fill="${amber}" opacity="${op}">P<tspan fill="${pink}">O</tspan>RK</text>`;
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
  ${credit(W, H, '#FF69B4')}
</svg>`;
}

buildGif({
  outPath: resolve(ROOT, 'public/boovies-jurassic-trailer.gif'),
  frameDir: '/tmp/jurassic-frames',
  W, H, fps: 18, durationS: 6,
  renderFrame: frame,
});
console.log('done: jurassic');
