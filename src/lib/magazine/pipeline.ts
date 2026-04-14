// Pipeline orchestrator — runs agents sequentially to produce a canonical magazine issue
// slug → loadSoul → Editor → Creative Director → Photographer → Writer → Marketer → MagazineIssue

import { loadSoul } from '@/lib/souls'
import { ROSTER_BY_SLUG } from '@/lib/npgx-roster'
import type { MagazineIssue, MagazinePage } from '@/lib/npgx-magazines'
import type { MagazineGenerationContext, ProgressCallback } from './agents/types'
import { runEditor } from './agents/editor'
import { runCreativeDirector } from './agents/creative-director'
import { runPhotographer } from './agents/photographer'
import { runWriter } from './agents/writer'
import { runMarketer } from './agents/marketer'

export async function generateCanonicalIssue(
  slug: string,
  issueNumber: number,
  origin: string,
  onProgress?: ProgressCallback,
): Promise<MagazineIssue> {
  // Load soul + character data
  onProgress?.('pipeline', 'Loading character data...')
  const soul = await loadSoul(slug)
  const character = ROSTER_BY_SLUG[slug]
  if (!character) throw new Error(`Unknown character: ${slug}`)

  // Initialize context
  const ctx: MagazineGenerationContext = {
    primarySlug: slug,
    issueNumber,
    primarySoul: soul,
    primaryCharacter: character,
    crossRefSouls: [],
    editorPlan: null,
    creativeBriefs: [],
    pages: [],
    textCalls: 0,
    imageCalls: 0,
    totalCost: 0,
    errors: [],
    origin,
  }

  // 1. Editor — plans the issue, writes editor's letter
  onProgress?.('pipeline', 'Editor planning issue...')
  await runEditor(ctx, onProgress)

  // 2. Creative Director — generates detailed photoshoot briefs
  onProgress?.('pipeline', 'Creative Director developing briefs...')
  await runCreativeDirector(ctx, onProgress)

  // 3. Photographer — generates all 12 images (using creative briefs)
  // Store photo pages separately so we can interleave them
  const photoPages: MagazinePage[] = []
  const prePhotoPageCount = ctx.pages.length
  onProgress?.('pipeline', 'Photographer generating images...')
  await runPhotographer(ctx, onProgress)
  // Extract photo pages that were added
  const allPhotoPages = ctx.pages.splice(prePhotoPageCount)

  // 4. Writer — generates all articles
  const preWriterPageCount = ctx.pages.length
  onProgress?.('pipeline', 'Writer creating articles...')
  await runWriter(ctx, onProgress)
  const allArticlePages = ctx.pages.splice(preWriterPageCount)

  // 5. Marketer — cover lines, ad, back cover
  const preMarketerPageCount = ctx.pages.length
  onProgress?.('pipeline', 'Marketer finishing issue...')
  await runMarketer(ctx, onProgress)
  const marketerPages = ctx.pages.splice(preMarketerPageCount)

  // 6. Assemble final 32-page layout (FOB → Feature Well → BOB)
  onProgress?.('pipeline', 'Assembling final issue...')
  const editorLetter = ctx.pages[0] // editor's letter from step 1
  const coverLines = (ctx.editorPlan as any)?.coverLines || [
    `${character.name.split(' ')[0].toUpperCase()} — Exclusive`,
    'Interview Inside',
    'Origin Story',
    `City Guide: ${soul.identity.origin}`,
  ]

  // Find cover image (first hero shot)
  const coverImage = allPhotoPages.find(p => p.shotType === 'hero')?.image
    || character.image
    || '/NPG-X-10/a4e7133a-ba6d-451f-8093-42d7b7264073.jpg'

  // Helper to find articles by keyword
  const findArticle = (keyword: string, fallbackIndex: number) =>
    allArticlePages.find(p =>
      p.title?.toUpperCase().includes(keyword) || p.subtitle?.toUpperCase().includes(keyword)
    ) || allArticlePages[fallbackIndex]

  // Helper to find ad pages
  const adPages = marketerPages.filter(p => p.type === 'ad')
  const ad1 = adPages[0] || { type: 'ad', title: `${soul.identity.token}`, body: 'Mint at npgx.website' }
  const ad2 = adPages[1] || { type: 'ad', title: 'NPGX — THE MOVEMENT', body: 'npgx.website — 26 characters. One world.' }

  // Find photo pages by shot type
  const findPhoto = (shotType: string) => allPhotoPages.find(p => p.shotType === shotType)
  const findPhotoByTitle = (title: string) => allPhotoPages.find(p => p.title?.includes(title))

  // Build the canonical 32-page layout
  const finalPages: MagazinePage[] = [
    // === FRONT OF BOOK (FOB) ===
    // Page 1: Cover
    {
      type: 'cover',
      image: coverImage,
      title: 'NINJA PUNK GIRLS X',
      subtitle: `ISSUE ${issueNumber} — ${ctx.editorPlan?.issueTitle || character.name.split(' ')[0].toUpperCase()}`,
    },
    // Page 2: Inside front cover — full-page teaser image
    allPhotoPages.find(p => p.shotType === 'full-body') || allPhotoPages[1],
    // Page 3: INDEX (contents)
    {
      type: 'contents',
      title: 'INDEX',
      body: buildContents(ctx, allArticlePages, marketerPages),
    },
    // Page 4: TRANSMISSION (Editor's Letter)
    editorLetter,
    // Pages 5-6: THE WIRE (news/dispatch)
    findArticle('WIRE', 6),
    { type: 'article', title: 'THE WIRE', subtitle: 'Continued', body: '' }, // continuation page
    // Page 7: Full-page ad
    ad1,
    // Pages 8-9: INTERROGATION (Interview — 2-page spread)
    findArticle('SPEAKS', 0) || findArticle('INTERROGATION', 0),
    { type: 'article', title: 'INTERROGATION', subtitle: 'Continued', body: '' },
    // Pages 10-11: FREQUENCIES (Culture section)
    findArticle('FREQUEN', 7),
    { type: 'article', title: 'FREQUENCIES', subtitle: 'Continued', body: '' },
    // Page 12: Full-page ad
    ad2,

    // === FEATURE WELL (EXPOSURE — main photo editorial) ===
    // Pages 13-20: 8 photo pages
    allPhotoPages.find(p => p.shotType === 'hero') || allPhotoPages[0],
    allPhotoPages.find(p => p.shotType === 'full-body') || allPhotoPages[1],
    allPhotoPages.find(p => p.shotType === 'environmental') || allPhotoPages[2],
    allPhotoPages.find(p => p.shotType === 'night-city') || allPhotoPages[3],
    findPhotoByTitle('FASHION SPREAD') || allPhotoPages[4],
    allPhotoPages.find(p => p.title === undefined && p.shotType === 'full-body') || findPhotoByTitle('FASHION') || allPhotoPages[5],
    findPhotoByTitle('UNDRESSED') || allPhotoPages[6],
    findPhotoByTitle('CENTREFOLD') || allPhotoPages[7],

    // === BACK OF BOOK (BOB) ===
    // Pages 21-22: Feature (Origin Story — 2 pages)
    findArticle('ORIGIN', 1),
    { type: 'article', title: 'ORIGIN STORY', subtitle: 'Continued', body: '' },
    // Pages 23-24: THE ARMOURY (gear reviews)
    findArticle('ARMOURY', 8),
    { type: 'article', title: 'THE ARMOURY', subtitle: 'Continued', body: '' },
    // Pages 25-26: Secondary photo spread (intimate + action)
    allPhotoPages.find(p => p.shotType === 'intimate') || allPhotoPages[4],
    allPhotoPages.find(p => p.shotType === 'action') || allPhotoPages[5],
    // Pages 27-28: Fiction (2 pages)
    findArticle('FICTION', 3) || findArticle('STORY', 3),
    { type: 'article', title: 'FICTION', subtitle: 'Continued', body: '' },
    // Page 29: STATIC (reader letters/community)
    marketerPages.find(p => p.title === 'STATIC') || { type: 'article', title: 'STATIC', subtitle: 'Transmissions from the community', body: '' },
    // Page 30: Style File
    findArticle('STYLE', 2),
    // Page 31: LAST RITES (opinion column / rivalry)
    findArticle('LAST RITES', 9) || findArticle('RIVAL', 4),
    // Page 32: Back Cover
    marketerPages.find(p => p.type === 'back-cover') || { type: 'back-cover', title: 'NEXT ISSUE', body: 'Coming soon.' },
  ].filter(Boolean) as MagazinePage[]

  const issue: MagazineIssue = {
    id: `canonical-${character.letter.toLowerCase()}-${slug}`,
    issue: issueNumber,
    title: ctx.editorPlan?.issueTitle || ['VOLTAGE', 'UPRISING', 'NEON', 'INFERNO', 'PHANTOM', 'CHROME'][Math.floor(Math.random() * 6)],
    subtitle: `${character.name} — Canonical Edition`,
    date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    price: 10,
    coverImage,
    coverLines: coverLines.slice(0, 5),
    characters: [
      character.name,
      ...ctx.crossRefSouls.map(c => c.character.name),
    ],
    pageCount: finalPages.length,
    pages: finalPages,
    locked: false,
    previewPages: finalPages.length,
  }

  onProgress?.('pipeline', `Done! ${finalPages.length} pages, $${ctx.totalCost.toFixed(2)} cost`)

  return issue
}

function buildContents(ctx: MagazineGenerationContext, articles: MagazinePage[], marketerPages?: MagazinePage[]): string {
  const lines = [
    `Welcome to the ${ctx.editorPlan?.issueTitle || ''} issue of Ninja Punk Girls X Magazine.`,
    `This is the definitive edition for ${ctx.primaryCharacter.name}.`,
    '',
    '— FRONT OF BOOK —',
    '',
    '4 — TRANSMISSION (Editor\'s Letter)',
    '5-6 — THE WIRE (News & Dispatch)',
    '7 — Advertisement',
  ]

  const interview = articles.find(p => p.title?.includes('SPEAKS') || p.title?.includes('INTERROGATION'))
  lines.push(`8-9 — INTERROGATION${interview ? ': ' + interview.title : ''}`)

  const frequencies = articles.find(p => p.title?.toUpperCase().includes('FREQUEN'))
  lines.push(`10-11 — FREQUENCIES${frequencies ? ': ' + frequencies.title : ''}`)

  lines.push('12 — Advertisement')
  lines.push('')
  lines.push('— FEATURE WELL —')
  lines.push('')
  lines.push('13-20 — EXPOSURE (Photo Editorial)')

  lines.push('')
  lines.push('— BACK OF BOOK —')
  lines.push('')

  const origin = articles.find(p => p.title?.includes('ORIGIN'))
  lines.push(`21-22 — ${origin?.title || 'ORIGIN STORY'}`)

  const armoury = articles.find(p => p.title?.toUpperCase().includes('ARMOURY'))
  lines.push(`23-24 — THE ARMOURY${armoury ? ': ' + armoury.title : ''}`)

  lines.push('25-26 — Photo Spread')

  const fiction = articles.find(p => p.subtitle?.includes('Fiction') || p.title?.toUpperCase().includes('FICTION'))
  lines.push(`27-28 — ${fiction?.title || 'FICTION'}`)

  lines.push('29 — STATIC (Reader Transmissions)')

  const style = articles.find(p => p.title?.includes('STYLE'))
  lines.push(`30 — ${style?.title || 'STYLE FILE'}`)

  const lastRites = articles.find(p => p.title?.toUpperCase().includes('LAST RITES') || p.subtitle?.includes('Rivalry'))
  lines.push(`31 — LAST RITES${lastRites ? ': ' + lastRites.title : ''}`)

  lines.push('32 — Back Cover')

  return lines.join('\n')
}

export type { MagazineGenerationContext, ProgressCallback }
