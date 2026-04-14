'use client'

import React, { useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { ImageItem, TextOverlay, Spread, LogoAsset } from '@/lib/mint/types'
import type { MagazineIssue } from '@/lib/npgx-magazines'
import { createDefaultTextOverlay, createDefaultSettings, createImageItemFromUrl } from '@/lib/mint/defaults'
import { buildSpreads, spreadImages } from '@/lib/mint/image-utils'
import { initialLogos } from '@/lib/mint/logos'
import { renderComposite } from '@/lib/mint/render'
import { loadImage } from '@/lib/mint/image-utils'
import { NPGX_ROSTER } from '@/lib/npgx-roster'
import { saveGeneratedIssue } from '@/lib/magazine-store'
import { createDefaultIssuePlan, type IssuePlan, type Story, type StoryPage, STORY_TYPE_META, EDITORIAL_STAFF } from '@/lib/magazine/stories'
import TextOverlayPanel from '@/components/mint/TextOverlayPanel'
import PageStrip from '@/components/mint/PageStrip'
import { TITLE_TEMPLATES, generateAutoTitle, type TitleStyle } from '@/lib/magazine/title-templates'

const CanvasPreview = dynamic(() => import('@/components/mint/CanvasPreview'), { ssr: false })
const CoversGallery = dynamic(() => import('@/components/mint/CoversGallery'), { ssr: false })
const EditorialPlanner = dynamic(() => import('@/components/magazine/EditorialPlanner'), { ssr: false })

type DesignerTab = 'editorial' | 'designer'

export default function MagazineDesignerPage() {
  // --- Tab state ---
  const [activeTab, setActiveTab] = useState<DesignerTab>('editorial')

  // --- Editorial state ---
  const [issuePlan, setIssuePlan] = useState<IssuePlan>(() => createDefaultIssuePlan(1))

  // --- Designer state ---
  const [images, setImages] = useState<ImageItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null)
  const [activeSpreadIndex, setActiveSpreadIndex] = useState(0)
  const [logos] = useState<LogoAsset[]>(initialLogos)
  const [showCovers, setShowCovers] = useState(false)

  // Generation state
  const [selectedSlug, setSelectedSlug] = useState(NPGX_ROSTER[0]?.slug || '')
  const [additionalPrompt, setAdditionalPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  // Export state
  const [exporting, setExporting] = useState(false)
  const [saving, setSaving] = useState(false)

  // Title auto-generation
  const [titleTemplateId, setTitleTemplateId] = useState<string>('random')

  // --- Computed ---
  const spreads = useMemo(() => buildSpreads(images), [images])
  const currentSpread = spreads[activeSpreadIndex] ?? null
  const selectedImage = images.find((img) => img.id === selectedId) ?? null

  // Keep activeSpreadIndex in bounds
  const clampedIndex = Math.min(activeSpreadIndex, Math.max(0, spreads.length - 1))
  if (clampedIndex !== activeSpreadIndex && spreads.length > 0) {
    setActiveSpreadIndex(clampedIndex)
  }

  // --- Helpers ---
  const updateImageSettings = useCallback((imageId: string, patch: Partial<ImageItem['settings']>) => {
    setImages(prev => prev.map(img =>
      img.id === imageId ? { ...img, settings: { ...img.settings, ...patch } } : img
    ))
  }, [])

  const updateTextOverlay = useCallback((imageId: string, overlayId: string, patch: Partial<TextOverlay>) => {
    setImages(prev => prev.map(img => {
      if (img.id !== imageId) return img
      return {
        ...img,
        settings: {
          ...img.settings,
          textOverlays: img.settings.textOverlays.map(o =>
            o.id === overlayId ? { ...o, ...patch } : o
          )
        }
      }
    }))
  }, [])

  const addTextOverlay = useCallback(() => {
    if (!selectedId) return
    const overlay = createDefaultTextOverlay()
    setImages(prev => prev.map(img => {
      if (img.id !== selectedId) return img
      return {
        ...img,
        settings: {
          ...img.settings,
          textOverlays: [...img.settings.textOverlays, overlay]
        }
      }
    }))
    setSelectedTextId(overlay.id)
  }, [selectedId])

  const removeTextOverlay = useCallback((overlayId: string) => {
    if (!selectedId) return
    setImages(prev => prev.map(img => {
      if (img.id !== selectedId) return img
      return {
        ...img,
        settings: {
          ...img.settings,
          textOverlays: img.settings.textOverlays.filter(o => o.id !== overlayId)
        }
      }
    }))
    if (selectedTextId === overlayId) setSelectedTextId(null)
  }, [selectedId, selectedTextId])

  const removeImage = useCallback((imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId))
    if (selectedId === imageId) setSelectedId(null)
  }, [selectedId])

  /** Auto-generate title overlays on the selected image */
  const applyAutoTitle = useCallback((templateId?: string) => {
    if (!selectedId) return
    const overlays = generateAutoTitle(
      selectedSlug,
      issuePlan.issueNumber,
      templateId === 'random' ? undefined : templateId,
    )
    setImages(prev => prev.map(img => {
      if (img.id !== selectedId) return img
      return {
        ...img,
        settings: {
          ...img.settings,
          textOverlays: [...img.settings.textOverlays, ...overlays],
        },
      }
    }))
    if (overlays.length > 0) setSelectedTextId(overlays[0].id)
  }, [selectedId, selectedSlug, issuePlan.issueNumber])

  // --- Generate image ---
  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch('/api/generate-image-npgx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: selectedSlug,
          additionalPrompt: additionalPrompt || undefined,
          width: 1024,
          height: 1536,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setGenError(data.error || 'Generation failed')
        return
      }
      const char = NPGX_ROSTER.find(c => c.slug === selectedSlug)
      const newImage = createImageItemFromUrl(
        data.imageUrl,
        char?.name || selectedSlug,
        1024,
        1536
      )
      // Auto-generate title overlays on new photos
      const autoTitles = generateAutoTitle(
        selectedSlug,
        issuePlan.issueNumber,
        titleTemplateId === 'random' ? undefined : titleTemplateId,
      )
      newImage.settings.textOverlays = autoTitles
      newImage.sortOrder = images.length
      setImages(prev => [...prev, newImage])
      setSelectedId(newImage.id)
      // Jump to the spread containing this new image
      const newSpreads = buildSpreads([...images, newImage])
      setActiveSpreadIndex(Math.max(0, newSpreads.length - 1))
    } catch (err: any) {
      setGenError(err.message || 'Network error')
    } finally {
      setGenerating(false)
    }
  }, [selectedSlug, additionalPrompt, images])

  // --- Cover template ---
  const handleApplyTemplate = useCallback((overlays: TextOverlay[]) => {
    if (!selectedId) return
    setImages(prev => prev.map(img => {
      if (img.id !== selectedId) return img
      return {
        ...img,
        settings: { ...img.settings, textOverlays: overlays }
      }
    }))
  }, [selectedId])

  // --- Export ---
  const handleExportAll = useCallback(async () => {
    if (images.length === 0) return
    setExporting(true)
    try {
      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        const imgEl = await loadImage(img.url)
        const logoAsset = logos.find(l => l.id === img.settings.logoId)
        const logoEl = logoAsset ? await loadImage(logoAsset.src) : null
        const canvas = renderComposite(imgEl, logoEl, img.settings)
        const link = document.createElement('a')
        link.download = `npgx-magazine-${i + 1}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }, [images, logos])

  // --- Save to IndexedDB ---
  const handleSave = useCallback(async () => {
    // Assemble from editorial plan if stories are complete, otherwise from raw images
    setSaving(true)
    try {
      const completedStories = issuePlan.stories.filter(s => s.status === 'complete')

      let issuePages: MagazineIssue['pages'] = []
      let coverImage = ''
      const allCharacters = new Set<string>()

      if (completedStories.length > 0) {
        // Find cover image from first photoshoot hero shot
        const firstPhotoStory = completedStories.find(s =>
          s.type === 'photoshoot' || s.type === 'erotic-editorial'
        )
        coverImage = firstPhotoStory?.pages.find(p => p.image)?.image || images[0]?.url || ''

        // Cover page
        issuePages.push({
          type: 'cover',
          image: coverImage,
          title: 'NINJA PUNK GIRLS XXX',
          subtitle: `ISSUE ${issuePlan.issueNumber} — ${issuePlan.title || 'UNTITLED'}`,
        })

        // Contents page
        const contentsLines = completedStories.map((s, i) => {
          const meta = STORY_TYPE_META[s.type]
          return `${issuePages.length + i + 1} — ${s.title || meta.label}`
        })
        issuePages.push({
          type: 'contents',
          title: 'CONTENTS',
          body: contentsLines.join('\n'),
        })

        // Story pages
        for (const story of completedStories) {
          story.characters.forEach(c => {
            const char = NPGX_ROSTER.find(r => r.slug === c)
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
              // Image with text — render as photoshoot (image takes priority in reader)
              issuePages.push({
                type: 'photoshoot',
                image: page.image,
                title: page.title,
                character: page.character,
              })
            }
          }
        }

        // Back cover
        issuePages.push({
          type: 'back-cover',
          title: 'NEXT ISSUE',
          subtitle: 'Coming Soon',
          body: `NPGX Magazine — AI Generated. ${allCharacters.size} characters. Infinite chaos.`,
        })
      } else if (images.length > 0) {
        // Fallback: raw images
        coverImage = images[0]?.url || ''
        issuePages = images.map((img, i) => ({
          type: i === 0 ? 'cover' as const : 'photoshoot' as const,
          image: img.url,
          title: img.name,
          character: img.name,
        }))
        images.forEach(i => allCharacters.add(i.name))
      } else {
        setSaving(false)
        return
      }

      const issue: MagazineIssue = {
        id: `designer-${Date.now()}`,
        issue: issuePlan.issueNumber || 0,
        title: issuePlan.title || 'Custom Design',
        subtitle: issuePlan.theme || 'Magazine Designer',
        date: new Date().toISOString().split('T')[0],
        price: 10,
        coverImage,
        coverLines: completedStories
          .filter(s => s.title)
          .slice(0, 4)
          .map(s => s.title),
        characters: [...allCharacters],
        pageCount: issuePages.length,
        pages: issuePages,
        locked: false,
        previewPages: issuePages.length,
      }
      await saveGeneratedIssue(issue)
      alert(`Issue saved! ${issuePages.length} pages assembled.`)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }, [images, issuePlan])

  // --- Generate story handler ---
  const handleGenerateStory = useCallback(async (storyId: string) => {
    const story = issuePlan.stories.find(s => s.id === storyId)
    if (!story || story.characters.length === 0) return

    // Mark as generating
    setIssuePlan(prev => ({
      ...prev,
      stories: prev.stories.map(s => s.id === storyId ? { ...s, status: 'generating' as const } : s),
    }))

    try {
      const res = await fetch('/api/magazine/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: story.type,
          title: story.title,
          synopsis: story.synopsis,
          characters: story.characters,
          setting: story.setting,
          mood: story.mood,
          issueTitle: issuePlan.title,
          issueTheme: issuePlan.theme,
        }),
      })
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Generation failed')
      }

      // Update story with generated pages
      setIssuePlan(prev => ({
        ...prev,
        stories: prev.stories.map(s => s.id === storyId ? {
          ...s,
          pages: data.pages,
          status: 'complete' as const,
        } : s),
      }))

      // Add images to designer view
      const meta = STORY_TYPE_META[story.type]
      for (const page of data.pages) {
        if (page.image) {
          const char = NPGX_ROSTER.find(c => c.slug === (page.character || story.characters[0]))
          const newImage = createImageItemFromUrl(
            page.image,
            `${char?.name || story.characters[0]} — ${story.title || meta.label}`,
            1024,
            page.type === 'graphic-panel' ? 1024 : 1536
          )
          newImage.sortOrder = images.length
          setImages(prev => [...prev, newImage])
        }
      }
    } catch (err) {
      setIssuePlan(prev => ({
        ...prev,
        stories: prev.stories.map(s => s.id === storyId ? { ...s, status: 'failed' as const } : s),
      }))
    }
  }, [issuePlan, images])

  // --- One-shot issue generation ---
  const [isGeneratingIssue, setIsGeneratingIssue] = useState(false)
  const [issueProgress, setIssueProgress] = useState<{ current: number; total: number; currentStory?: string }>({ current: 0, total: 0 })

  const handleGenerateIssue = useCallback(async (templateId: string, characters?: string[]) => {
    setIsGeneratingIssue(true)
    setIssueProgress({ current: 0, total: 1, currentStory: 'Starting...' })

    try {
      const res = await fetch('/api/magazine/generate-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: templateId, characters }),
      })
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Issue generation failed')
      }

      // Update issue plan from generated data
      setIssuePlan(prev => ({
        ...prev,
        issueNumber: data.issue.issue,
        title: data.issue.title,
        theme: data.issue.subtitle || prev.theme,
      }))

      // Add all images to designer
      for (const page of data.issue.pages) {
        if (page.image) {
          const newImage = createImageItemFromUrl(
            page.image,
            page.character || page.title || 'NPGX',
            1024,
            1536
          )
          newImage.sortOrder = images.length
          setImages(prev => [...prev, newImage])
        }
      }

      // Save the issue
      await saveGeneratedIssue(data.issue)
      setIssueProgress({ current: data.stats.completed, total: data.stats.stories, currentStory: 'Complete!' })
      alert(`Issue generated! ${data.stats.pages} pages, ${data.stats.completed}/${data.stats.stories} stories. Cost: $${data.stats.totalCost}`)
    } catch (err: any) {
      console.error('Issue generation failed:', err)
      alert(`Issue generation failed: ${err.message}`)
    } finally {
      setIsGeneratingIssue(false)
    }
  }, [images])

  const TABS: { id: DesignerTab; label: string }[] = [
    { id: 'editorial', label: 'Editorial' },
    { id: 'designer', label: 'Designer' },
  ]

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="bg-black/90 backdrop-blur-md border-b border-white/10 flex-shrink-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/magazine" className="text-gray-500 hover:text-white transition p-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <div>
              <h1 className="text-white font-bold text-sm uppercase tracking-wider" style={{ fontFamily: 'var(--font-brand)' }}>
                Magazine Designer
              </h1>
              <p className="text-gray-600 text-[10px] uppercase tracking-widest">
                {issuePlan.title ? `Issue ${issuePlan.issueNumber} — ${issuePlan.title}` : `${images.length} image${images.length !== 1 ? 's' : ''} \u00b7 ${spreads.length} spread${spreads.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || (images.length === 0 && !issuePlan.stories.some(s => s.status === 'complete'))}
              className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition disabled:opacity-30"
            >
              {saving ? 'Assembling...' : issuePlan.stories.some(s => s.status === 'complete') ? 'Assemble Issue' : 'Save'}
            </button>
            <button
              onClick={handleExportAll}
              disabled={exporting || images.length === 0}
              className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition disabled:opacity-30"
            >
              {exporting ? 'Exporting...' : 'Export PNGs'}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'editorial' ? (
          /* ─── EDITORIAL TAB ─── */
          <>
            {/* Left: Editorial Planner */}
            <div className="w-80 border-r border-white/10 bg-gray-950 overflow-hidden flex-shrink-0">
              <EditorialPlanner
                plan={issuePlan}
                onPlanChange={setIssuePlan}
                onGenerateStory={handleGenerateStory}
                onGenerateIssue={handleGenerateIssue}
                isGeneratingIssue={isGeneratingIssue}
                issueProgress={issueProgress}
              />
            </div>

            {/* Center: Preview of generated story images or empty state */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 p-6 flex items-center justify-center">
                {images.length > 0 ? (
                  <CanvasPreview
                    spread={currentSpread}
                    selectedId={selectedId}
                    logos={logos}
                    pageNumber={activeSpreadIndex + 1}
                    selectedTextId={selectedTextId}
                    onSelectImage={setSelectedId}
                    onLogoPosChange={selectedId ? (pos) => updateImageSettings(selectedId, { logoPos: pos }) : undefined}
                    onTextOverlayPosChange={(overlayId, pos) => {
                      if (selectedId) updateTextOverlay(selectedId, overlayId, pos)
                    }}
                    onSelectTextOverlay={setSelectedTextId}
                    wrapperClassName="canvas-wrapper w-full h-full"
                  />
                ) : (
                  <div className="text-center max-w-md">
                    <div className="text-gray-700 text-4xl mb-3" style={{ fontFamily: 'var(--font-brand)' }}>NPGX</div>
                    <h3 className="text-white text-sm font-bold mb-2">Plan Your Issue</h3>
                    <p className="text-gray-500 text-xs leading-relaxed mb-4">
                      Use the Editorial panel to plan stories, assign characters, and write briefs.
                      Generate stories one at a time — each story&apos;s images will appear here.
                    </p>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      {EDITORIAL_STAFF.slice(0, 3).map(staff => (
                        <div key={staff.id} className="bg-white/5 rounded-lg p-3">
                          <div className="text-white text-xs font-bold">{staff.name}</div>
                          <div className="text-gray-600 text-[9px]">{staff.nameJa}</div>
                          <div className="text-red-400 text-[9px] mt-1">{staff.role}</div>
                        </div>
                      ))}
                    </div>
                    <p className="text-gray-700 text-[10px] mt-4">
                      Your AI editorial team. Self-consciously artificial. Unapologetically creative.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Story details / generated pages */}
            <div className="w-80 border-l border-white/10 bg-gray-950 overflow-y-auto flex-shrink-0">
              <div className="p-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Generated Content</h3>
              </div>

              {/* Render all story pages — images and text */}
              {issuePlan.stories.some(s => s.status === 'complete') ? (
                <div className="space-y-4 px-4 pb-4">
                  {issuePlan.stories.filter(s => s.status === 'complete').map(story => {
                    const meta = STORY_TYPE_META[story.type]
                    const staff = EDITORIAL_STAFF.find(s => s.id === meta.staff)
                    return (
                      <div key={story.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{meta.icon}</span>
                          <span className="text-white text-[11px] font-bold">{story.title || meta.label}</span>
                          {staff && <span className="text-gray-700 text-[9px] ml-auto">{staff.name}</span>}
                        </div>
                        {story.pages.map((page, pi) => (
                          <div key={page.id}>
                            {/* Image pages */}
                            {page.image && (
                              <div
                                className={`rounded overflow-hidden cursor-pointer border transition ${
                                  images.find(i => i.url === page.image)?.id === selectedId
                                    ? 'border-red-500/50'
                                    : 'border-transparent hover:border-white/20'
                                }`}
                                onClick={() => {
                                  const match = images.find(i => i.url === page.image)
                                  if (match) {
                                    setSelectedId(match.id)
                                    const si = spreads.findIndex(s => spreadImages(s).some(i => i.id === match.id))
                                    if (si >= 0) setActiveSpreadIndex(si)
                                  }
                                }}
                              >
                                <img src={page.image} alt="" className="w-full aspect-[2/3] object-cover" />
                              </div>
                            )}
                            {/* Text pages */}
                            {page.body && !page.image && (
                              <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                {page.title && (
                                  <h4 className="text-white text-[11px] font-bold uppercase tracking-wider mb-1">{page.title}</h4>
                                )}
                                {page.subtitle && (
                                  <p className="text-red-400 text-[9px] uppercase tracking-wider mb-2">{page.subtitle}</p>
                                )}
                                <p className="text-gray-400 text-[10px] leading-relaxed whitespace-pre-wrap line-clamp-[12]">
                                  {page.body}
                                </p>
                              </div>
                            )}
                            {/* Image with text */}
                            {page.body && page.image && (
                              <div className="bg-white/5 rounded-lg overflow-hidden border border-white/5">
                                <img src={page.image} alt="" className="w-full aspect-[3/2] object-cover" />
                                <p className="text-gray-400 text-[10px] leading-relaxed p-2.5 line-clamp-4">
                                  {page.body}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              ) : images.length > 0 ? (
                <div className="space-y-1 px-4 pb-4">
                  {images.map((img, idx) => (
                    <div
                      key={img.id}
                      className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition ${
                        img.id === selectedId
                          ? 'bg-red-600/20 border border-red-500/30'
                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                      }`}
                      onClick={() => {
                        setSelectedId(img.id)
                        const si = spreads.findIndex(s => spreadImages(s).some(i => i.id === img.id))
                        if (si >= 0) setActiveSpreadIndex(si)
                      }}
                    >
                      <img src={img.url} alt={img.name} className="w-8 h-12 object-cover rounded" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[10px] truncate">{img.name}</p>
                        <p className="text-gray-600 text-[9px]">#{idx + 1}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-700 text-[10px] px-4">
                  Generate stories from the editorial panel to see pages here
                </p>
              )}
            </div>
          </>
        ) : (
          /* ─── DESIGNER TAB ─── */
          <>
            {/* LEFT SIDEBAR */}
            <div className="w-64 border-r border-white/10 bg-gray-950 overflow-y-auto p-4 space-y-5 flex-shrink-0">
              {/* Character picker */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Character</h3>
                <select
                  value={selectedSlug}
                  onChange={(e) => setSelectedSlug(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:border-red-500/50 focus:outline-none"
                >
                  {NPGX_ROSTER.map((char) => (
                    <option key={char.slug} value={char.slug}>{char.name}</option>
                  ))}
                </select>
              </div>

              {/* Additional prompt */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Prompt</h3>
                <textarea
                  value={additionalPrompt}
                  onChange={(e) => setAdditionalPrompt(e.target.value)}
                  placeholder="Optional extra prompt..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:border-red-500/50 focus:outline-none resize-none"
                />
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate with Grok'
                )}
              </button>
              {genError && <p className="text-red-400 text-[10px]">{genError}</p>}

              {/* Image list */}
              {images.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    Images ({images.length})
                  </h3>
                  <div className="space-y-1">
                    {images.map((img, idx) => (
                      <div
                        key={img.id}
                        className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition ${
                          img.id === selectedId
                            ? 'bg-red-600/20 border border-red-500/30'
                            : 'bg-white/5 hover:bg-white/10 border border-transparent'
                        }`}
                        onClick={() => {
                          setSelectedId(img.id)
                          // Jump to spread containing this image
                          const si = spreads.findIndex(s => spreadImages(s).some(i => i.id === img.id))
                          if (si >= 0) setActiveSpreadIndex(si)
                        }}
                      >
                        <img src={img.url} alt={img.name} className="w-8 h-12 object-cover rounded" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-[10px] truncate">{img.name}</p>
                          <p className="text-gray-600 text-[9px]">#{idx + 1}</p>
                        </div>
                        <button
                          className="text-gray-600 hover:text-red-400 text-xs transition"
                          onClick={(e) => { e.stopPropagation(); removeImage(img.id) }}
                        >
                          {'\u00D7'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cover template button */}
              {selectedId && (
                <button
                  onClick={() => setShowCovers(true)}
                  className="w-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded-lg transition"
                >
                  Apply Cover Template
                </button>
              )}
            </div>

            {/* CENTER — Canvas */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 p-4">
                {images.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-gray-600 text-6xl mb-4">+</div>
                      <p className="text-gray-500 text-sm">Generate images to start designing</p>
                      <p className="text-gray-700 text-xs mt-1">Pick a character and click &quot;Generate with Grok&quot;</p>
                    </div>
                  </div>
                ) : (
                  <CanvasPreview
                    spread={currentSpread}
                    selectedId={selectedId}
                    logos={logos}
                    pageNumber={activeSpreadIndex + 1}
                    selectedTextId={selectedTextId}
                    onSelectImage={setSelectedId}
                    onLogoPosChange={selectedId ? (pos) => updateImageSettings(selectedId, { logoPos: pos }) : undefined}
                    onTextOverlayPosChange={(overlayId, pos) => {
                      if (selectedId) updateTextOverlay(selectedId, overlayId, pos)
                    }}
                    onSelectTextOverlay={setSelectedTextId}
                    wrapperClassName="canvas-wrapper w-full h-full"
                  />
                )}
              </div>
            </div>

            {/* RIGHT SIDEBAR */}
            <div className="w-64 border-l border-white/10 bg-gray-950 overflow-y-auto p-4 space-y-5 flex-shrink-0">
              {selectedImage ? (
                <>
                  {/* Auto-title generator */}
                  <div className="space-y-2 pb-3 border-b border-white/10">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Auto Title</h3>
                    <select
                      value={titleTemplateId}
                      onChange={(e) => setTitleTemplateId(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:border-red-500/50 focus:outline-none"
                    >
                      <option value="random">Random Style</option>
                      {TITLE_TEMPLATES.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => applyAutoTitle(titleTemplateId)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider py-2 rounded-lg transition"
                    >
                      Generate Title
                    </button>
                    <p className="text-gray-600 text-[9px]">
                      Adds composable title overlays. Edit in the panel below.
                    </p>
                  </div>

                  {/* Text overlays */}
                  <TextOverlayPanel
                    overlays={selectedImage.settings.textOverlays}
                    selectedTextId={selectedTextId}
                    onSelectText={setSelectedTextId}
                    onAdd={addTextOverlay}
                    onUpdate={(overlayId, patch) => updateTextOverlay(selectedImage.id, overlayId, patch)}
                    onRemove={removeTextOverlay}
                  />

                  {/* Image settings */}
                  <div className="space-y-3 pt-3 border-t border-white/10">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Image Settings</h3>

                    <label className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="w-16 shrink-0">Vignette</span>
                      <input
                        type="range" min="0" max="1" step="0.01"
                        value={selectedImage.settings.vignetteStrength}
                        onChange={(e) => updateImageSettings(selectedImage.id, { vignetteStrength: Number(e.target.value) })}
                        className="flex-1 accent-red-500"
                      />
                    </label>

                    <label className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="w-16 shrink-0">Vignette</span>
                      <input
                        type="checkbox"
                        checked={selectedImage.settings.vignetteEnabled}
                        onChange={(e) => updateImageSettings(selectedImage.id, { vignetteEnabled: e.target.checked })}
                        className="accent-red-500"
                      />
                    </label>

                    <label className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="w-16 shrink-0">Frame</span>
                      <input
                        type="checkbox"
                        checked={selectedImage.settings.frameEnabled}
                        onChange={(e) => updateImageSettings(selectedImage.id, { frameEnabled: e.target.checked })}
                        className="accent-red-500"
                      />
                    </label>

                    {selectedImage.settings.frameEnabled && (
                      <>
                        <label className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="w-16 shrink-0">Thickness</span>
                          <input
                            type="range" min="0.005" max="0.1" step="0.005"
                            value={selectedImage.settings.frameThickness}
                            onChange={(e) => updateImageSettings(selectedImage.id, { frameThickness: Number(e.target.value) })}
                            className="flex-1 accent-red-500"
                          />
                        </label>
                        <label className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="w-16 shrink-0">Color</span>
                          <input
                            type="color"
                            value={selectedImage.settings.frameColor}
                            onChange={(e) => updateImageSettings(selectedImage.id, { frameColor: e.target.value })}
                            className="w-8 h-6 rounded border border-white/10 bg-transparent cursor-pointer"
                          />
                        </label>
                      </>
                    )}

                    <label className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="w-16 shrink-0">Logo</span>
                      <select
                        value={selectedImage.settings.logoId}
                        onChange={(e) => updateImageSettings(selectedImage.id, { logoId: e.target.value })}
                        className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs focus:border-red-500/50 focus:outline-none"
                      >
                        <option value="">None</option>
                        {logos.map(l => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="w-16 shrink-0">Logo Size</span>
                      <input
                        type="range" min="0.05" max="0.4" step="0.01"
                        value={selectedImage.settings.logoScale}
                        onChange={(e) => updateImageSettings(selectedImage.id, { logoScale: Number(e.target.value) })}
                        className="flex-1 accent-red-500"
                      />
                    </label>
                  </div>
                </>
              ) : (
                <div className="text-gray-600 text-xs text-center py-8">
                  Select an image to edit
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* BOTTOM — PageStrip */}
      {spreads.length > 0 && (
        <PageStrip
          spreads={spreads}
          activeIndex={activeSpreadIndex}
          onPageClick={setActiveSpreadIndex}
        />
      )}

      {/* CoversGallery modal */}
      {showCovers && (
        <CoversGallery
          onClose={() => setShowCovers(false)}
          onApplyTemplate={handleApplyTemplate}
        />
      )}
    </div>
  )
}
