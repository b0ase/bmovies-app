import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const ASSETS_BASE = 'https://api.b0ase.com/npg-assets/adult-content'

export async function GET() {
  // In development, read from local filesystem
  if (process.env.NODE_ENV === 'development') {
    const dir = path.join(process.cwd(), 'public', 'adult-content')
    try {
      const files = fs.readdirSync(dir)
      const videos = files.filter(f => f.endsWith('.mp4')).map(f => `/adult-content/${f}`)
      const images = files.filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f)).map(f => `/adult-content/${f}`)
      return NextResponse.json({ videos, images })
    } catch {
      return NextResponse.json({ videos: [], images: [] })
    }
  }

  // In production, fetch directory listing from Hetzner (nginx autoindex returns HTML)
  try {
    const res = await fetch(ASSETS_BASE + '/', { next: { revalidate: 3600 } })
    if (!res.ok) return NextResponse.json({ videos: [], images: [] })
    const html = await res.text()
    // Parse nginx autoindex HTML — links are in <a href="filename">
    const fileMatches = [...html.matchAll(/href="([^"]+\.(mp4|png|jpg|jpeg|webp))"/gi)]
    const files = fileMatches.map(m => decodeURIComponent(m[1]))
    const videos = files.filter(f => f.endsWith('.mp4')).map(f => `${ASSETS_BASE}/${f}`)
    const images = files.filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f)).map(f => `${ASSETS_BASE}/${f}`)
    return NextResponse.json({ videos, images })
  } catch {
    return NextResponse.json({ videos: [], images: [] })
  }
}
