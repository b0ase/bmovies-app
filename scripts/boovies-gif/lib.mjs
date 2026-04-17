// Shared helpers for all bOOvies trailer GIF builders.

import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';

export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

export function ease(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function starfield(W, H, count = 160, seed = 1) {
  const r = rng(seed);
  return Array.from({ length: count }, () => ({
    x: r() * W,
    y: r() * H,
    z: 0.2 + r() * 0.8,
    size: r() < 0.1 ? 2 : 1,
  }));
}

export function buildGif({
  outPath,
  frameDir,
  W = 720, H = 405,
  fps = 18, durationS = 6,
  renderFrame,             // (i, total) => svg string
  maxColors = 96,
  bayerScale = 4,
}) {
  const total = fps * durationS;
  if (existsSync(frameDir)) rmSync(frameDir, { recursive: true });
  mkdirSync(frameDir, { recursive: true });

  for (let i = 0; i < total; i++) {
    const svg = renderFrame(i, total);
    const name = String(i).padStart(4, '0');
    const svgPath = `${frameDir}/f${name}.svg`;
    const pngPath = `${frameDir}/f${name}.png`;
    writeFileSync(svgPath, svg);
    execSync(`rsvg-convert -w ${W} -h ${H} "${svgPath}" -o "${pngPath}"`);
  }

  execSync(
    `ffmpeg -y -framerate ${fps} -i ${frameDir}/f%04d.png ` +
    `-vf "palettegen=max_colors=${maxColors}" ${frameDir}/palette.png`,
    { stdio: 'pipe' }
  );
  execSync(
    `ffmpeg -y -framerate ${fps} -i ${frameDir}/f%04d.png -i ${frameDir}/palette.png ` +
    `-lavfi "paletteuse=dither=bayer:bayer_scale=${bayerScale}" -loop 0 "${outPath}"`,
    { stdio: 'pipe' }
  );
  return outPath;
}

// Vignette + credit reused by all films
export function vignette() {
  return `<defs>
    <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
      <stop offset="60%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.85"/>
    </radialGradient>
  </defs>`;
}

export function credit(W, H, color = '#FF69B4', text = 'bOOvies drive-in  ·  now playing') {
  return `<text x="${W/2}" y="${H - 8}" text-anchor="middle"
    font-family="Inter, sans-serif" font-size="10"
    letter-spacing="3" fill="${color}" opacity="0.6">${text}</text>`;
}
