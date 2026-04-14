import { NextRequest, NextResponse } from 'next/server'
import type { TimelineProject } from '@/lib/timeline/types'
import { exportToPremiereXml } from '@/lib/timeline/premiere-xml'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const project = body.project as TimelineProject

    if (!project || !project.channels) {
      return NextResponse.json({ error: 'Invalid project — must be a v2 TimelineProject with channels' }, { status: 400 })
    }

    const xml = exportToPremiereXml(project, {
      fps: body.fps ?? 30,
    })

    const filename = `${project.trackSlug}-npgx-edit.xml`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 })
  }
}
