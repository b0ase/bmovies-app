import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const ATLAS_API = 'https://api.atlascloud.ai'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ATLASCLOUD_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No ATLASCLOUD_API_KEY' }, { status: 500 })

  const { trackSlug, jobs } = await req.json() as {
    trackSlug: string
    jobs: Array<{ index: number; jobId: string; status: string; filename: string }>
  }

  const outputDir = join(process.cwd(), 'public', 'music-videos', `${trackSlug}-1`)
  mkdirSync(outputDir, { recursive: true })

  const updated = [...jobs]

  for (const job of updated) {
    if (job.status !== 'pending' || !job.jobId) continue

    try {
      const res = await fetch(`${ATLAS_API}/api/v1/model/result/${job.jobId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      })
      const data = await res.json()
      const d = data?.data || data
      const status = (d.status || '').toLowerCase()

      if ((status === 'completed' || status === 'succeeded') && d.outputs?.[0]) {
        // Download video
        try {
          const videoRes = await fetch(d.outputs[0])
          const buffer = Buffer.from(await videoRes.arrayBuffer())
          writeFileSync(join(outputDir, job.filename), buffer)
          job.status = 'done'
        } catch {
          job.status = 'download-failed'
        }
      } else if (status === 'failed') {
        job.status = 'failed'
      }
    } catch {
      // Keep as pending, will retry next poll
    }
  }

  return NextResponse.json({
    done: updated.filter(j => j.status === 'done').length,
    pending: updated.filter(j => j.status === 'pending').length,
    failed: updated.filter(j => j.status === 'failed' || j.status === 'download-failed').length,
    jobs: updated,
  })
}
