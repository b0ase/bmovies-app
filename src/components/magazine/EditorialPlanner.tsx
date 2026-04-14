'use client'

import React, { useState } from 'react'
import { NPGX_ROSTER } from '@/lib/npgx-roster'
import {
  EDITORIAL_STAFF,
  STORY_TYPE_META,
  createEmptyStory,
  createDefaultIssuePlan,
  type IssuePlan,
  type Story,
  type StoryType,
} from '@/lib/magazine/stories'
import { ISSUE_TEMPLATES } from '@/lib/magazine/issue-templates'

interface EditorialPlannerProps {
  plan: IssuePlan
  onPlanChange: (plan: IssuePlan) => void
  onGenerateStory: (storyId: string) => void
  onGenerateIssue?: (templateId: string, characters?: string[]) => void
  isGeneratingIssue?: boolean
  issueProgress?: { current: number; total: number; currentStory?: string }
}

const STORY_COLORS: Record<string, string> = {
  red: 'border-red-500/40 bg-red-500/5',
  pink: 'border-pink-500/40 bg-pink-500/5',
  blue: 'border-blue-500/40 bg-blue-500/5',
  purple: 'border-purple-500/40 bg-purple-500/5',
  white: 'border-white/20 bg-white/5',
  green: 'border-green-500/40 bg-green-500/5',
  yellow: 'border-yellow-500/40 bg-yellow-500/5',
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  planned: { label: 'PLANNED', className: 'bg-white/10 text-gray-400' },
  generating: { label: 'GENERATING', className: 'bg-yellow-500/20 text-yellow-400 animate-pulse' },
  complete: { label: 'COMPLETE', className: 'bg-green-500/20 text-green-400' },
  failed: { label: 'FAILED', className: 'bg-red-500/20 text-red-400' },
}

export default function EditorialPlanner({ plan, onPlanChange, onGenerateStory, onGenerateIssue, isGeneratingIssue, issueProgress }: EditorialPlannerProps) {
  const [showAddStory, setShowAddStory] = useState(false)
  const [showStaff, setShowStaff] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('classic')
  const [showOneShot, setShowOneShot] = useState(true)

  const updateStory = (storyId: string, patch: Partial<Story>) => {
    onPlanChange({
      ...plan,
      stories: plan.stories.map(s => s.id === storyId ? { ...s, ...patch } : s),
    })
  }

  const removeStory = (storyId: string) => {
    onPlanChange({
      ...plan,
      stories: plan.stories.filter(s => s.id !== storyId),
    })
  }

  const addStory = (type: StoryType) => {
    const story = createEmptyStory(type, plan.stories.length)
    onPlanChange({
      ...plan,
      stories: [...plan.stories, story],
    })
    setShowAddStory(false)
  }

  const totalPages = plan.stories.reduce((sum, s) => sum + s.pages.length, 0)
    + 2 // cover + contents
    + 2 // ad + back cover

  return (
    <div className="h-full flex flex-col">
      {/* Issue Header */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Issue Plan</h2>
          <span className="text-[10px] text-gray-600">{totalPages} pages</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-gray-600 uppercase tracking-widest">Issue #</label>
            <input
              type="number"
              value={plan.issueNumber}
              onChange={e => onPlanChange({ ...plan, issueNumber: Number(e.target.value) })}
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs mt-0.5"
            />
          </div>
          <div>
            <label className="text-[9px] text-gray-600 uppercase tracking-widest">Title</label>
            <input
              type="text"
              value={plan.title}
              onChange={e => onPlanChange({ ...plan, title: e.target.value })}
              placeholder="GENESIS"
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs mt-0.5 uppercase"
            />
          </div>
        </div>

        <div>
          <label className="text-[9px] text-gray-600 uppercase tracking-widest">Theme</label>
          <input
            type="text"
            value={plan.theme}
            onChange={e => onPlanChange({ ...plan, theme: e.target.value })}
            placeholder="e.g. Tokyo Underground, Neon Nights..."
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs mt-0.5"
          />
        </div>

        {/* AI Staff button */}
        <button
          onClick={() => setShowStaff(!showStaff)}
          className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Editorial Staff</span>
            <span className="text-gray-600 text-xs">{showStaff ? '−' : '+'}</span>
          </div>
          {!showStaff && (
            <p className="text-[9px] text-gray-600 mt-0.5">
              {EDITORIAL_STAFF.map(s => s.name).join(' / ')} — AI team
            </p>
          )}
        </button>

        {showStaff && (
          <div className="space-y-2 pl-1">
            {EDITORIAL_STAFF.map(staff => (
              <div key={staff.id} className="bg-white/5 rounded-lg p-2.5 border border-white/5">
                <div className="flex items-baseline gap-2">
                  <span className="text-white text-xs font-bold">{staff.name}</span>
                  <span className="text-gray-600 text-[9px]">{staff.nameJa}</span>
                  <span className="text-red-400 text-[9px] ml-auto">{staff.role}</span>
                </div>
                <p className="text-gray-500 text-[10px] mt-1 leading-relaxed">{staff.bio}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* One-Shot Generator */}
      <div className="p-4 border-b border-white/10">
        <button
          onClick={() => setShowOneShot(!showOneShot)}
          className="w-full text-left flex items-center justify-between"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">One-Shot Generator</span>
          <span className="text-gray-600 text-xs">{showOneShot ? '−' : '+'}</span>
        </button>

        {showOneShot && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-[9px] text-gray-600 uppercase tracking-widest">Template</label>
              <select
                value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs mt-0.5"
              >
                {ISSUE_TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Template description */}
            {(() => {
              const t = ISSUE_TEMPLATES.find(t => t.id === selectedTemplate)
              return t ? (
                <div className="bg-white/5 rounded-lg p-2.5 border border-white/5">
                  <p className="text-gray-400 text-[10px] leading-relaxed">{t.description}</p>
                  <div className="flex gap-3 mt-2 text-[9px] text-gray-600">
                    <span>{t.characterCount} character{t.characterCount > 1 ? 's' : ''}</span>
                    <span>{t.stories.length} stories</span>
                    <span>~{t.stories.reduce((sum, s) => sum + (STORY_TYPE_META[s.type]?.defaultPages || 3), 0) + 4} pages</span>
                  </div>
                </div>
              ) : null
            })()}

            <button
              onClick={() => onGenerateIssue?.(selectedTemplate)}
              disabled={isGeneratingIssue}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider py-3 rounded-lg transition"
            >
              {isGeneratingIssue ? 'Generating Issue...' : 'Generate Full Issue'}
            </button>

            {isGeneratingIssue && issueProgress && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-400">
                    Story {issueProgress.current}/{issueProgress.total}
                  </span>
                  <span className="text-gray-600">{issueProgress.currentStory}</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all duration-500"
                    style={{ width: `${(issueProgress.current / issueProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <p className="text-[9px] text-gray-700 text-center">
              Click once. Wait ~5 min. Get a complete magazine.
            </p>
          </div>
        )}
      </div>

      {/* Stories List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Stories</h3>
          <button
            onClick={() => setShowAddStory(!showAddStory)}
            className="text-red-400 hover:text-red-300 text-xs font-bold transition"
          >
            + Add
          </button>
        </div>

        {/* Add story type picker */}
        {showAddStory && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1.5">
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-2">Choose story type</p>
            {(Object.entries(STORY_TYPE_META) as [StoryType, typeof STORY_TYPE_META[StoryType]][]).map(([type, meta]) => (
              <button
                key={type}
                onClick={() => addStory(type)}
                className="w-full text-left bg-white/5 hover:bg-white/10 rounded px-2.5 py-1.5 transition flex items-center gap-2"
              >
                <span className="text-sm">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-white text-[11px] font-medium">{meta.label}</span>
                  <span className="text-gray-600 text-[9px] ml-2">{meta.defaultPages}pp</span>
                </div>
                <span className="text-gray-700 text-[9px]">
                  {meta.hasPhotography && meta.hasText ? 'img+txt' : meta.hasPhotography ? 'img' : 'txt'}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Story cards */}
        {plan.stories.map((story, idx) => {
          const meta = STORY_TYPE_META[story.type]
          const colorClass = STORY_COLORS[meta.color] || STORY_COLORS.white
          const statusBadge = STATUS_BADGE[story.status]
          const staffMember = EDITORIAL_STAFF.find(s => s.id === meta.staff)

          return (
            <StoryCard
              key={story.id}
              story={story}
              index={idx}
              meta={meta}
              colorClass={colorClass}
              statusBadge={statusBadge}
              staffMember={staffMember}
              onUpdate={patch => updateStory(story.id, patch)}
              onRemove={() => removeStory(story.id)}
              onGenerate={() => onGenerateStory(story.id)}
            />
          )
        })}

        {plan.stories.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600 text-xs">No stories yet</p>
            <p className="text-gray-700 text-[10px] mt-1">Click + Add to build your issue</p>
          </div>
        )}
      </div>

      {/* Issue Summary */}
      <div className="p-3 border-t border-white/10 bg-gray-950">
        <div className="flex items-center justify-between text-[10px]">
          <div className="text-gray-500">
            {plan.stories.length} stories / {totalPages} pages
          </div>
          <div className="text-gray-600">
            ~${(plan.stories.reduce((sum, s) => sum + s.pages.filter(p => p.type === 'image' || p.type === 'image-with-text' || p.type === 'graphic-panel').length, 0) * 0.07 + plan.stories.filter(s => STORY_TYPE_META[s.type].hasText).length * 0.01).toFixed(2)} est.
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Story Card Component ──────────────────────────────────────

interface StoryCardProps {
  story: Story
  index: number
  meta: typeof STORY_TYPE_META[StoryType]
  colorClass: string
  statusBadge: { label: string; className: string }
  staffMember?: typeof EDITORIAL_STAFF[number]
  onUpdate: (patch: Partial<Story>) => void
  onRemove: () => void
  onGenerate: () => void
}

function StoryCard({ story, index, meta, colorClass, statusBadge, staffMember, onUpdate, onRemove, onGenerate }: StoryCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`border rounded-lg ${colorClass} transition`}>
      {/* Header — always visible */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-sm">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-white text-[11px] font-bold">
              {story.title || meta.label}
            </span>
            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-gray-600 text-[9px]">{story.pages.length}pp</span>
            {story.characters.length > 0 && (
              <span className="text-gray-600 text-[9px]">
                {story.characters.map(slug => {
                  const char = NPGX_ROSTER.find(c => c.slug === slug)
                  return char?.name.split(' ')[0] || slug
                }).join(', ')}
              </span>
            )}
            {staffMember && (
              <span className="text-gray-700 text-[9px] ml-auto">{staffMember.name}</span>
            )}
          </div>
        </div>
        <span className="text-gray-600 text-xs">{expanded ? '−' : '+'}</span>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-white/5 pt-2.5">
          {/* Title */}
          <div>
            <label className="text-[9px] text-gray-600 uppercase tracking-widest">Title</label>
            <input
              type="text"
              value={story.title}
              onChange={e => onUpdate({ title: e.target.value })}
              placeholder={`${meta.label} title...`}
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs mt-0.5"
            />
          </div>

          {/* Characters */}
          <div>
            <label className="text-[9px] text-gray-600 uppercase tracking-widest">Characters</label>
            <select
              multiple
              value={story.characters}
              onChange={e => {
                const selected = Array.from(e.target.selectedOptions, o => o.value)
                onUpdate({ characters: selected })
              }}
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs mt-0.5 h-20"
            >
              {NPGX_ROSTER.map(char => (
                <option key={char.slug} value={char.slug}>{char.name}</option>
              ))}
            </select>
            <p className="text-[8px] text-gray-700 mt-0.5">Cmd+click to select multiple</p>
          </div>

          {/* Synopsis / Brief */}
          <div>
            <label className="text-[9px] text-gray-600 uppercase tracking-widest">
              {story.type === 'reportage' ? 'Story Brief' : story.type === 'graphic-fiction' ? 'Plot Synopsis' : 'Editorial Brief'}
            </label>
            <textarea
              value={story.synopsis}
              onChange={e => onUpdate({ synopsis: e.target.value })}
              placeholder={
                story.type === 'reportage'
                  ? 'e.g. Kira and Aisha at BED, an underground club in Tokyo. Documentary style — what happens when two warriors go dancing...'
                  : story.type === 'graphic-fiction'
                  ? 'e.g. Ghost discovers a room in the Neon Motel that shouldn\'t exist. 6 panels. Noir. No dialogue until the last panel.'
                  : 'e.g. Aria in a Tokyo penthouse. Lingerie, neon light, city skyline. Vulnerability meets power.'
              }
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs mt-0.5 resize-none"
            />
          </div>

          {/* Setting */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-gray-600 uppercase tracking-widest">Setting</label>
              <input
                type="text"
                value={story.setting}
                onChange={e => onUpdate({ setting: e.target.value })}
                placeholder="Tokyo, BED club..."
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs mt-0.5"
              />
            </div>
            <div>
              <label className="text-[9px] text-gray-600 uppercase tracking-widest">Mood</label>
              <input
                type="text"
                value={story.mood}
                onChange={e => onUpdate({ mood: e.target.value })}
                placeholder="raw, electric..."
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs mt-0.5"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onGenerate}
              disabled={story.status === 'generating' || story.characters.length === 0}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-30 text-white text-[10px] font-bold uppercase tracking-wider py-1.5 rounded transition"
            >
              {story.status === 'generating' ? 'Generating...' : 'Generate Story'}
            </button>
            <button
              onClick={onRemove}
              className="text-gray-600 hover:text-red-400 text-xs transition px-2 py-1.5"
            >
              Remove
            </button>
          </div>

          {/* Page status indicators */}
          <div className="flex gap-1 pt-1">
            {story.pages.map((page, i) => (
              <div
                key={page.id}
                className={`flex-1 h-1.5 rounded-full ${
                  page.status === 'complete' ? 'bg-green-500'
                    : page.status === 'generating' ? 'bg-yellow-500 animate-pulse'
                    : page.status === 'failed' ? 'bg-red-500'
                    : 'bg-white/10'
                }`}
                title={`Page ${i + 1}: ${page.status}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
