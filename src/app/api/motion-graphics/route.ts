import { NextResponse } from 'next/server'
import { cdnUrl } from '@/lib/cdn'
import { readdir } from 'fs/promises'
import { join } from 'path'

const PROMPTS: Record<string, string> = {
  'blade-girl': 'Pure black background. Hot pink neon text "BLADE GIRL" with razor-sharp edges, metal shards falling catching pink and silver light. Below "刃物少女" in neon green. Katana blade reflection sweeps across. Motion graphic title card, cinematic, dark, neon on black, 16:9 landscape, 8k quality',
  'shibuya-mosh-pit': 'Pure black background. Hot pink neon text "SHIBUYA MOSH PIT" in aggressive punk font, letters vibrating, cracks radiating. Below "渋谷のモッシュピット" in neon green. Crowd hands as silhouettes. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
  'black-rose': 'Pure black background. Deep crimson text "BLACK ROSE" from thorny rose vine tendrils, petals falling catching red and purple light. Below "黒い薔薇" in ghostly white. Gothic atmosphere, mist. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
  'kabukicho-wolf': 'Pure black background. Neon yellow-orange text "KABUKICHO WOLF" burns on like neon tubes igniting, jagged predatory font. Wolf eyes glow then fade. Rain, smoke. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
  'razor-kisses': 'Pure black background. Hot pink neon text "RAZOR KISSES" scratched into mirror, broken mirror shards falling. Below "カミソリキス" in neon green. Floating mirror glass, hot pink and neon green light. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
  'harajuku-chainsaw': 'Pure black background. Hot pink and acid green text "HARAJUKU CHAINSAW" carved into metal with sparks. Below "原宿チェーンソー" with grinding effect. Metal sparks, industrial orange. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
  'underground-empress': 'Pure black background. Royal gold and hot pink text "UNDERGROUND EMPRESS" rises from below, ornate punk crown motifs. Below "地下の女帝" in gold. Gold dust falling upward. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
  'tokaido-reload': 'Pure black background. Chrome silver and red text "TOKAIDO RELOAD" like bullet casings ejecting. Shell casings falling. Gunsmoke, chrome reflections, red laser dots. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
  'tokyo-gutter-queen': 'Pure black background. Hot pink neon text "TOKYO GUTTER QUEEN" in aggressive punk font, debris falling. Below Japanese text in neon green. Dust, hot pink and neon green light, smoke. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
  'neon-blood-riot': 'Pure black background. Blood red and neon cyan text "NEON BLOOD RIOT" explodes, letters dripping liquid neon. Below "ネオン血の暴動" in cyan. Neon paint bombs. Riot smoke. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
  'chrome-fist': 'Pure black background. Chrome and orange text "CHROME FIST" punches on with shockwave, hammered chrome. Below "クロム拳" stamps like factory press. Industrial sparks, furnace glow. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
  'roppongi-warzone': 'Pure black background. Military green and hot pink text "ROPPONGI WARZONE" like war broadcast, glitching. Below "六本木戦場" as military teletype. Radar sweep. Explosion flashes. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
  'electric-geisha': 'Pure black background. Electric blue and pink text "ELECTRIC GEISHA" with electricity arcing between letters. Below "電気芸者" with voltage surge. Geisha fan of electrical arcs. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
  'concrete-sakura': 'Pure black background. Concrete grey and pink text "CONCRETE SAKURA" cracks on, sakura growing through cracks. Below "コンクリート桜" with vine effect. Concrete dust and cherry blossom petals. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
  'molotov-kiss': 'Pure black background. Fire orange and hot pink text "MOLOTOV KISS" ignites with flame, lipstick kiss marks in flame, glass shattering. Below "火炎キス" through flame burst. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
  'shinobi-girls': 'Pure black background. Ninja black and neon purple text "SHINOBI GIRLS" from shadows with purple edge glow, shuriken embedded. Below "忍びガールズ" with smoke bomb. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
  'akihabara-fury': 'Pure black background. Glitch neon and red text "AKIHABARA FURY" with digital glitch, pixelating, RGB splitting. Below "秋葉原の怒り". CRT scanlines. Pixel explosions, arcade neon. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
  'dead-idols': 'Pure black background. Pale white and blood red text "DEAD IDOLS" rises like from grave, cracked tombstone letters. Below "死んだアイドル" fades like spirit. Graveyard mist, dried petals. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
  'gasoline-heart': 'Pure black background. Fuel orange and hot pink text "GASOLINE HEART" drips on like gasoline with rainbow sheen, then ignites. Below "ガソリンハート". Rainbow puddle reflections. Fire ignition. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
  'last-train-to-nowhere': 'Pure black background. Cool blue and white text "LAST TRAIN TO NOWHERE" scrolls like departure board, tiles flipping. Below "最終列車". Train tracks to vanishing point. Station fluorescent, rain on glass. Motion graphic title card, cinematic, dark, 16:9 landscape, 8k quality',
}

export async function GET() {
  const clips: Array<{ slug: string; url: string; prompt: string; track: string }> = []

  // Title clips
  try {
    const files = await readdir(join(process.cwd(), 'public', 'title-clips'))
    for (const f of files.filter(f => f.endsWith('.mp4'))) {
      const slug = f.replace('.mp4', '')
      clips.push({ slug, url: cdnUrl(`title-clips/${f}`), prompt: PROMPTS[slug] || '', track: slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ') })
    }
  } catch {}

  // Extra title clips in music-videos dirs
  try {
    const dirs = await readdir(join(process.cwd(), 'public', 'music-videos'))
    for (const dir of dirs) {
      if (!dir.endsWith('-1') || dir.endsWith('-low')) continue
      const slug = dir.replace('-1', '')
      try {
        const files = await readdir(join(process.cwd(), 'public', 'music-videos', dir))
        for (const f of files.filter(f => f.includes('-titles-') && f.endsWith('.mp4'))) {
          clips.push({ slug: f.replace('.mp4', ''), url: `/music-videos/${dir}/${f}`, prompt: PROMPTS[slug] || '', track: slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ') })
        }
      } catch {}
    }
  } catch {}

  return NextResponse.json({ clips })
}
