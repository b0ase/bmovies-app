// POST /api/magazine/generate-issue
// One-shot full issue generation — pick a template, get a complete magazine
// Takes 2-10 minutes depending on story count and image generation

import { NextRequest, NextResponse } from 'next/server'
import { generateIssuePlanFromTemplate, ISSUE_TEMPLATES } from '@/lib/magazine/issue-templates'
import { STORY_TYPE_META, type StoryPage } from '@/lib/magazine/stories'
import { ROSTER_BY_SLUG } from '@/lib/npgx-roster'
import type { MagazineIssue } from '@/lib/npgx-magazines'

export const maxDuration = 300 // 5 min max for Vercel

interface IssueRequest {
  template?: string        // template ID — defaults to 'classic'
  characters?: string[]    // specific character slugs — random if omitted
}

export async function POST(req: NextRequest) {
  try {
    const body: IssueRequest = await req.json()
    const templateId = body.template || 'classic'
    const origin = new URL(req.url).origin

    // Validate template
    const template = ISSUE_TEMPLATES.find(t => t.id === templateId)
    if (!template) {
      return NextResponse.json({
        error: `Unknown template: ${templateId}. Available: ${ISSUE_TEMPLATES.map(t => t.id).join(', ')}`,
      }, { status: 400 })
    }

    // Generate the issue plan
    const plan = generateIssuePlanFromTemplate(templateId, body.characters)

    // Generate each story sequentially
    let totalTextCalls = 0
    let totalImageCalls = 0
    let totalCost = 0
    const errors: string[] = []

    for (let i = 0; i < plan.stories.length; i++) {
      const story = plan.stories[i]
      const meta = STORY_TYPE_META[story.type]

      try {
        const res = await fetch(`${origin}/api/magazine/generate-story`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: story.type,
            title: story.title,
            synopsis: story.synopsis,
            characters: story.characters,
            setting: story.setting,
            mood: story.mood,
            issueTitle: plan.title,
            issueTheme: plan.theme,
          }),
        })

        const data = await res.json()

        if (data.success) {
          story.pages = data.pages
          story.status = 'complete'
          totalTextCalls += data.stats.textCalls
          totalImageCalls += data.stats.imageCalls
          totalCost += data.stats.totalCost
        } else {
          story.status = 'failed'
          errors.push(`${story.title}: ${data.error}`)
        }
      } catch (err: any) {
        story.status = 'failed'
        errors.push(`${story.title}: ${err.message}`)
      }
    }

    // Assemble into MagazineIssue
    const completedStories = plan.stories.filter(s => s.status === 'complete')
    const allCharacters = new Set<string>()
    const issuePages: MagazineIssue['pages'] = []

    // Find cover image
    const firstPhotoStory = completedStories.find(s =>
      s.type === 'photoshoot' || s.type === 'erotic-editorial'
    )
    const coverImage = firstPhotoStory?.pages.find(p => p.image)?.image || ''

    // Cover
    issuePages.push({
      type: 'cover',
      image: coverImage,
      title: 'NINJA PUNK GIRLS XXX',
      subtitle: `ISSUE ${plan.issueNumber} — ${plan.title}`,
    })

    // Contents
    const contentsBody = [
      `Welcome to NPGX Magazine Issue ${plan.issueNumber} — ${plan.title}.`,
      `Theme: ${plan.theme}.`,
      '',
      ...completedStories.map((s, i) => {
        const meta = STORY_TYPE_META[s.type]
        return `${issuePages.length + i} — ${s.title || meta.label}`
      }),
    ].join('\n')

    issuePages.push({
      type: 'contents',
      title: 'CONTENTS',
      body: contentsBody,
    })

    // Story pages
    for (const story of completedStories) {
      story.characters.forEach(slug => {
        const char = ROSTER_BY_SLUG[slug]
        if (char) allCharacters.add(char.name)
      })

      for (const page of story.pages) {
        if (page.status !== 'complete') continue

        if (page.image && !page.body) {
          issuePages.push({
            type: 'photoshoot',
            image: page.image,
            character: page.character,
            shotType: (page.shotType as any) || 'hero',
            title: story.pages.indexOf(page) === 0 ? (story.title || undefined) : undefined,
          })
        } else if (page.body && !page.image) {
          issuePages.push({
            type: 'article',
            title: page.title,
            subtitle: page.subtitle,
            body: page.body,
            character: page.character,
          })
        } else if (page.body && page.image) {
          issuePages.push({
            type: 'photoshoot',
            image: page.image,
            title: page.title,
            character: page.character,
          })
        }
      }
    }

    // Ad page
    const featuredChar = ROSTER_BY_SLUG[plan.stories[0]?.characters[0]]
    issuePages.push({
      type: 'ad',
      title: featuredChar?.token || '$NPGX',
      body: `Mint at npgx.website. ${featuredChar?.name || 'Ninja Punk Girls'} — ${featuredChar?.tagline || 'The future is punk.'}`,
    })

    // Back cover
    issuePages.push({
      type: 'back-cover',
      title: 'NEXT ISSUE',
      subtitle: 'Coming Soon',
      body: `NPGX Magazine — AI Generated. ${allCharacters.size} characters. ${issuePages.length} pages. Made by machines. Read by humans.`,
    })

    const issue: MagazineIssue = {
      id: `oneshot-${Date.now()}`,
      issue: plan.issueNumber,
      title: plan.title,
      subtitle: plan.theme,
      date: plan.date,
      price: 10,
      coverImage,
      coverLines: completedStories
        .filter(s => s.title && s.type !== 'editors-letter')
        .slice(0, 4)
        .map(s => s.title),
      characters: [...allCharacters],
      pageCount: issuePages.length,
      pages: issuePages,
      locked: false,
      previewPages: issuePages.length,
    }

    return NextResponse.json({
      success: true,
      issue,
      plan: {
        template: templateId,
        title: plan.title,
        theme: plan.theme,
        characters: [...allCharacters],
      },
      stats: {
        stories: plan.stories.length,
        completed: completedStories.length,
        failed: plan.stories.filter(s => s.status === 'failed').length,
        pages: issuePages.length,
        textCalls: totalTextCalls,
        imageCalls: totalImageCalls,
        totalCost: Math.round(totalCost * 100) / 100,
        errors,
      },
    })
  } catch (err: any) {
    console.error('Issue generation failed:', err)
    return NextResponse.json({ error: err.message || 'Issue generation failed' }, { status: 500 })
  }
}
