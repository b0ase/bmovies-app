// Soul type definitions + loader for NPGX character system
// Source of truth: public/souls/*.json

export interface Soul {
  $schema: string;
  version: string;
  lastUpdated: string;

  identity: {
    name: string;
    token: string;
    letter: string;
    tagline: string;
    bio: string;
    origin: string;
  };

  appearance: {
    age: number;
    ethnicity: string;
    skinTone: string;
    height: string;
    bodyType: string;
    face: string;
    hair: { color: string; style: string; texture: string };
    eyes: { color: string; shape: string };
    tattoos: string;
    piercings: string;
    distinguishing: string;
  };

  style: {
    aesthetic: string;
    clothing: string[];
    colors: string[];
    makeup: string;
  };

  personality: {
    archetype: string;
    traits: string[];
    voice: string;
    catchphrases: string[];
  };

  generation: {
    promptPrefix: string;
    promptSuffix: string;
    negativePrompt: string;
    styleUniverse: string;
    defaultWidth: number;
    defaultHeight: number;
    guidanceScale: number;
    steps: number;
  };

  music?: {
    genre: string;
    subgenres: string[];
    bpm: number;
    key: string;
    mood: string;
    instruments: string[];
    influences: string[];
    vocalStyle: string;
    productionNotes: string;
  };

  tokenomics: {
    token: string;
    parent: string;
    parentShareBps: number;
    pricingModel: string;
    pressPrice: number;
    baseReward: number;
    maxSupply: number;
    issuerShareBps: number;
    platformShareBps: number;
  };
}

export interface SoulSummary {
  slug: string;
  name: string;
  token: string;
  tagline: string;
  aesthetic: string;
  letter: string;
}

// All 26 A-Z characters — matches npgx-roster.ts
export const SOUL_SLUGS = [
  'aria-voidstrike',
  'blade-nightshade',
  'cherryx',
  'dahlia-ironveil',
  'echo-neonflare',
  'fury-steelwing',
  'ghost-razorthorn',
  'hex-crimsonwire',
  'ivy-darkpulse',
  'jinx-shadowfire',
  'kira-bloodsteel',
  'luna-cyberblade',
  'mika-stormveil',
  'nova-bloodmoon',
  'onyx-nightblade',
  'phoenix-darkfire',
  'quinn-voidrazor',
  'raven-shadowblade',
  'storm-razorclaw',
  'trix-neonblade',
  'uma-darkforge',
  'vivienne-void',
  'wraith-ironpulse',
  'xena-crimsonedge',
  'yuki-blackpaw',
  'zerodice',
] as const;

export type SoulSlug = (typeof SOUL_SLUGS)[number];

// Server-side only: load soul from filesystem
export async function loadSoul(slug: string): Promise<Soul> {
  const { readFileSync } = await import('fs');
  const { join } = await import('path');
  const filePath = join(process.cwd(), 'public', 'souls', `${slug}.json`);
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as Soul;
}

export async function loadAllSouls(): Promise<Map<string, Soul>> {
  const souls = new Map<string, Soul>();
  for (const slug of SOUL_SLUGS) {
    try {
      souls.set(slug, await loadSoul(slug));
    } catch {
      console.warn(`Failed to load soul: ${slug}`);
    }
  }
  return souls;
}

export async function getAllSoulSummaries(): Promise<SoulSummary[]> {
  const souls = await loadAllSouls();
  return Array.from(souls.entries()).map(([slug, soul]) => ({
    slug,
    name: soul.identity.name,
    token: soul.identity.token,
    tagline: soul.identity.tagline,
    aesthetic: soul.style.aesthetic,
    letter: soul.identity.letter,
  }));
}

export function buildGenerationPrompt(soul: Soul, extraPrompt?: string): {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  guidanceScale: number;
  steps: number;
} {
  const parts = [soul.generation.promptPrefix];
  if (extraPrompt) parts.push(extraPrompt);
  parts.push(soul.generation.promptSuffix);

  return {
    prompt: parts.join(' '),
    negativePrompt: soul.generation.negativePrompt,
    width: soul.generation.defaultWidth,
    height: soul.generation.defaultHeight,
    guidanceScale: soul.generation.guidanceScale,
    steps: soul.generation.steps,
  };
}
