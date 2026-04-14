import { NextResponse } from 'next/server'
import { readdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'

const CONTENT_DIR = join(process.cwd(), 'public/content')
const SOULS_DIR = join(process.cwd(), 'public/souls')

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')

  // If no slug, return all characters with image counts
  if (!slug) {
    const souls = readdirSync(SOULS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort()

    const characters = souls.map(s => {
      const imagesDir = join(CONTENT_DIR, s, 'images')
      const categories: Record<string, number> = {}
      let total = 0
      let name = s

      // Read full name from soul file
      try {
        const soulData = JSON.parse(readFileSync(join(SOULS_DIR, `${s}.json`), 'utf8'))
        if (soulData.identity?.name) name = soulData.identity.name
      } catch { /* fallback to slug */ }

      if (existsSync(imagesDir)) {
        for (const cat of readdirSync(imagesDir)) {
          const catDir = join(imagesDir, cat)
          try {
            const pngs = readdirSync(catDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
            if (pngs.length > 0) {
              categories[cat] = pngs.length
              total += pngs.length
            }
          } catch { /* not a directory */ }
        }
      }

      return { slug: s, name, categories, total }
    })

    return NextResponse.json({ characters })
  }

  // Return all images for a specific character
  const imagesDir = join(CONTENT_DIR, slug, 'images')
  if (!existsSync(imagesDir)) {
    return NextResponse.json({ slug, categories: {}, images: [] })
  }

  const categories: Record<string, { file: string; url: string; prompt?: string }[]> = {}

  for (const cat of readdirSync(imagesDir)) {
    const catDir = join(imagesDir, cat)
    try {
      const files = readdirSync(catDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg')).sort()
      if (files.length === 0) continue

      categories[cat] = files.map(f => {
        const promptFile = f.replace(/\.(png|jpg)$/, '-prompt.txt')
        const promptPath = join(catDir, promptFile)
        let prompt: string | undefined
        try {
          if (existsSync(promptPath)) {
            prompt = readFileSync(promptPath, 'utf8').trim()
          }
        } catch { /* no prompt */ }

        return {
          file: f,
          url: `/content/${slug}/images/${cat}/${f}`,
          prompt,
        }
      })
    } catch { /* not a directory */ }
  }

  return NextResponse.json({ slug, categories })
}
