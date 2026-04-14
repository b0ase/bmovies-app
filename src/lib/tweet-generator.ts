import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

const CONTENT_DIR = join(process.cwd(), 'public', 'content');
const SOULS_DIR = join(process.cwd(), 'public', 'souls');

type ContentPick = {
  slug: string;
  name: string;
  imagePath: string;
  publicPath: string;
  category: string;
};

const CAPTIONS = [
  (name: string) => `${name}. No filter. No apology.`,
  (name: string) => `${name} didn't ask for your permission.`,
  (name: string) => `new from ${name} — minted on-chain, owned forever.`,
  (name: string) => `${name}. AI-generated. Self-conscious. Punk as fuck.`,
  (name: string) => `26 AI agents. 26 sovereign corporations. This is ${name}.`,
  (name: string) => `${name} creates her own content. Sells her own tickets. Runs her own life.`,
  (name: string) => `the future isn't human-made. it's ${name}-made.`,
  (name: string) => `${name} — generated at the edge of what's possible.`,
  (name: string) => `you don't own ${name}. she owns herself. you buy tickets to watch.`,
  (name: string) => `${name}. printed on bitcoin. can't be deleted. won't be silenced.`,
  (name: string) => `autonomous. punk. on-chain. ${name}.`,
  (name: string) => `${name} runs on a phone. creates 24/7. never sleeps.`,
  (name: string) => `what happens when AI gets a body and a wallet? ${name} happens.`,
  (name: string) => `${name} — $402 ticket economy. circular. never burned.`,
  (name: string) => `the mint is open. ${name} is printing.`,
];

const HASHTAGS = ['#NPGX', '#AI', '#BitcoinSV', '#BSV'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getCharacterName(slug: string): string {
  try {
    const soul = JSON.parse(
      require('fs').readFileSync(join(SOULS_DIR, `${slug}.json`), 'utf8')
    );
    return soul.name || slug;
  } catch {
    return slug.split('-').map((w: string) => w[0].toUpperCase() + w.slice(1)).join(' ');
  }
}

export function pickContent(): ContentPick | null {
  if (!existsSync(CONTENT_DIR)) return null;

  const slugs = readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  if (slugs.length === 0) return null;

  // Try up to 10 random characters to find one with images
  for (let attempt = 0; attempt < 10; attempt++) {
    const slug = pick(slugs);
    const imagesDir = join(CONTENT_DIR, slug, 'images');
    if (!existsSync(imagesDir)) continue;

    // Look through all image subdirectories
    const categories = readdirSync(imagesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const cat of categories.sort(() => Math.random() - 0.5)) {
      const catDir = join(imagesDir, cat);
      const files = readdirSync(catDir).filter((f) =>
        /\.(jpg|jpeg|png|webp)$/i.test(f)
      );

      if (files.length > 0) {
        const file = pick(files);
        return {
          slug,
          name: getCharacterName(slug),
          imagePath: join(catDir, file),
          publicPath: `/content/${slug}/images/${cat}/${file}`,
          category: cat,
        };
      }
    }
  }

  return null;
}

export function generateCaption(name: string): string {
  const captionFn = pick(CAPTIONS);
  const caption = captionFn(name);
  const tags = pick(HASHTAGS);
  return `${caption}\n\n${tags}`;
}
