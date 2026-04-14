'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NPGX_ROSTER } from '@/lib/npgx-roster'

// ── Types ────────────────────────────────────────────────────────────────────

type ContentItem = {
  type: 'image' | 'video' | 'music'
  orientation: string
  path: string
  filename: string
  size: number
}

type CharacterContent = {
  slug: string
  total: number
  images: number
  videos: number
  music: number
  items: ContentItem[]
}

const ISSUE_CATEGORIES = [
  { id: 'wrong-gender', label: 'Wrong Gender', color: 'bg-red-600', icon: '♂' },
  { id: 'wrong-ethnicity', label: 'Wrong Ethnicity', color: 'bg-orange-600', icon: '🎨' },
  { id: 'wrong-hair', label: 'Wrong Hair', color: 'bg-yellow-600', icon: '💇' },
  { id: 'wrong-features', label: 'Wrong Features', color: 'bg-purple-600', icon: '👤' },
  { id: 'wrong-outfit', label: 'Wrong Outfit', color: 'bg-blue-600', icon: '👗' },
  { id: 'off-brand', label: 'Off-Brand', color: 'bg-pink-600', icon: '⚠' },
  { id: 'low-quality', label: 'Low Quality', color: 'bg-gray-600', icon: '📉' },
  { id: 'duplicate', label: 'Duplicate', color: 'bg-teal-600', icon: '📋' },
] as const

type IssueId = typeof ISSUE_CATEGORIES[number]['id']

type FlagData = {
  issues: IssueId[]
  grade: number // 1-5, 5 = worst
  note: string
}

type ReviewEntry = {
  slug: string
  characterName: string
  path: string
  filename: string
  issues: IssueId[]
  grade: number
  note: string
}

// ── Component ────────────────────────────────────────────────────────────────

export default function QualityChecker() {
  const [selectedSlug, setSelectedSlug] = useState<string>(NPGX_ROSTER[0]?.slug || '')
  const [content, setContent] = useState<CharacterContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [flags, setFlags] = useState<Record<string, FlagData>>({})
  const [deleting, setDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [allCounts, setAllCounts] = useState<Record<string, number>>({})
  const [view, setView] = useState<'review' | 'pipeline'>('review')
  const [flagPicker, setFlagPicker] = useState<string | null>(null)

  // Review pipeline state — persists across character switches
  const [reviewLog, setReviewLog] = useState<ReviewEntry[]>([])

  const fetchContent = useCallback(async (slug: string) => {
    setLoading(true)
    setFlags({})
    setDeleteResult(null)
    setFlagPicker(null)
    try {
      const res = await fetch(`/api/content/list?slug=${encodeURIComponent(slug)}`)
      if (res.ok) {
        const data = await res.json()
        setContent(data)
      }
    } catch {
      setContent(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (selectedSlug) fetchContent(selectedSlug)
  }, [selectedSlug, fetchContent])

  useEffect(() => {
    async function fetchAll() {
      const counts: Record<string, number> = {}
      await Promise.all(
        NPGX_ROSTER.map(async (c) => {
          try {
            const res = await fetch(`/api/content/list?slug=${encodeURIComponent(c.slug)}`)
            if (res.ok) {
              const data = await res.json()
              counts[c.slug] = data.images || 0
            }
          } catch {}
        })
      )
      setAllCounts(counts)
    }
    fetchAll()
  }, [])

  // Flag with issues + grade
  const setFlag = (path: string, data: FlagData) => {
    setFlags(prev => ({ ...prev, [path]: data }))
    // Also add to review log
    const character = NPGX_ROSTER.find(c => c.slug === selectedSlug)
    const item = content?.items.find(i => i.path === path)
    if (character && item) {
      setReviewLog(prev => {
        const existing = prev.findIndex(r => r.path === path)
        const entry: ReviewEntry = {
          slug: selectedSlug,
          characterName: character.name,
          path,
          filename: item.filename,
          issues: data.issues,
          grade: data.grade,
          note: data.note,
        }
        if (existing >= 0) {
          const next = [...prev]
          next[existing] = entry
          return next
        }
        return [...prev, entry]
      })
    }
  }

  const unflag = (path: string) => {
    setFlags(prev => {
      const next = { ...prev }
      delete next[path]
      return next
    })
    setReviewLog(prev => prev.filter(r => r.path !== path))
  }

  const flagAll = () => {
    if (!content) return
    const imgs = content.items.filter(i => i.type === 'image')
    const newFlags: Record<string, FlagData> = {}
    imgs.forEach(i => {
      if (!flags[i.path]) {
        newFlags[i.path] = { issues: ['off-brand'], grade: 3, note: '' }
      }
    })
    setFlags(prev => ({ ...prev, ...newFlags }))
  }

  const clearFlags = () => {
    setFlags({})
  }

  const deleteAllFlagged = async () => {
    const paths = Object.keys(flags)
    if (paths.length === 0) return
    if (!confirm(`Delete ${paths.length} flagged images? This cannot be undone.`)) return

    setDeleting(true)
    try {
      const res = await fetch('/api/content/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      })
      const data = await res.json()
      setDeleteResult(`Deleted ${data.deleted}/${data.total} files`)
      // Remove from review log too
      setReviewLog(prev => prev.filter(r => !flags[r.path]))
      setFlags({})
      fetchContent(selectedSlug)
    } catch {
      setDeleteResult('Delete failed')
    }
    setDeleting(false)
  }

  const filtered = content ? content.items.filter(i => i.type === 'image') : []
  const character = NPGX_ROSTER.find(c => c.slug === selectedSlug)
  const flaggedCount = Object.keys(flags).length

  // Review stats
  const issueCounts: Record<IssueId, number> = {} as Record<IssueId, number>
  ISSUE_CATEGORIES.forEach(c => { issueCounts[c.id] = 0 })
  reviewLog.forEach(r => r.issues.forEach(i => { issueCounts[i] = (issueCounts[i] || 0) + 1 }))
  const avgGrade = reviewLog.length > 0 ? reviewLog.reduce((s, r) => s + r.grade, 0) / reviewLog.length : 0

  return (
    <div className="min-h-screen pt-20 text-white">
      <div className="max-w-[1600px] mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-black font-[family-name:var(--font-brand)] uppercase tracking-wide">
              Quality Control
            </h1>
            <p className="text-gray-400 mt-1">Review images, flag inconsistencies, grade accuracy, delete in bulk.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex bg-white/5 rounded-lg border border-white/10 overflow-hidden">
              <button
                onClick={() => setView('review')}
                className={`px-4 py-2 text-xs font-bold transition-colors ${view === 'review' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Review
              </button>
              <button
                onClick={() => setView('pipeline')}
                className={`px-4 py-2 text-xs font-bold transition-colors relative ${view === 'pipeline' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Pipeline
                {reviewLog.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                    {reviewLog.length}
                  </span>
                )}
              </button>
            </div>
            {flaggedCount > 0 && view === 'review' && (
              <>
                <span className="text-red-400 font-bold font-mono">{flaggedCount} flagged</span>
                <button onClick={clearFlags} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-lg transition-colors">
                  Clear
                </button>
                <button
                  onClick={deleteAllFlagged}
                  disabled={deleting}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : `Delete ${flaggedCount}`}
                </button>
              </>
            )}
          </div>
        </div>

        {deleteResult && (
          <div className="mb-4 px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-lg text-green-400 text-sm font-mono">
            {deleteResult}
          </div>
        )}

        {/* ═══ REVIEW VIEW ═══ */}
        {view === 'review' && (
          <>
            {/* Character Selector — A-Z strip */}
            <div className="flex flex-wrap gap-1.5 mb-8">
              {NPGX_ROSTER.map(c => {
                const count = allCounts[c.slug] || 0
                const hasIssues = reviewLog.some(r => r.slug === c.slug)
                return (
                  <button
                    key={c.slug}
                    onClick={() => setSelectedSlug(c.slug)}
                    className={`relative flex flex-col items-center px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                      selectedSlug === c.slug
                        ? 'bg-red-600 text-white border border-red-500'
                        : hasIssues
                          ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 border border-yellow-500/30'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <span className="font-[family-name:var(--font-brand)] text-lg">{c.letter}</span>
                    <span className="text-[9px] truncate max-w-[60px] opacity-70">{c.name.split(' ')[0]}</span>
                    {count > 0 && (
                      <span className={`absolute -top-1.5 -right-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                        selectedSlug === c.slug ? 'bg-white text-red-600' : hasIssues ? 'bg-yellow-500 text-black' : 'bg-red-600/80 text-white'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Character Info Bar */}
            {character && content && (
              <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
                <div className="flex items-center gap-4">
                  {character.hasImages && (
                    <img src={character.image} alt={character.name} className="w-12 h-12 rounded-lg object-cover" />
                  )}
                  <div>
                    <h2 className="text-xl font-bold">{character.name}</h2>
                    <p className="text-gray-500 text-sm">{character.token} &middot; {content.images} images, {content.videos} videos, {content.music} music</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={flagAll} className="px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 text-xs font-bold rounded-lg border border-yellow-500/20 transition-colors">
                    Flag All Visible
                  </button>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500 mx-auto mb-4" />
                <p className="text-gray-500">Loading content...</p>
              </div>
            )}

            {/* Image Grid */}
            {!loading && filtered.length > 0 && (
              <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 space-y-3">
                {filtered.map((item) => {
                  const flag = flags[item.path]
                  const isFlagged = !!flag
                  return (
                    <div
                      key={item.path}
                      className={`relative break-inside-avoid rounded-xl overflow-hidden border-2 transition-all group ${
                        isFlagged
                          ? 'border-red-500 ring-2 ring-red-500/30'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img
                        src={item.path}
                        alt={item.filename}
                        className={`w-full h-auto block cursor-pointer ${isFlagged ? 'opacity-50' : ''}`}
                        loading="lazy"
                        onClick={() => setLightbox(item.path)}
                      />

                      {/* Flag overlay with issue tags */}
                      {isFlagged && (
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-2">
                          <span className="text-red-500 text-3xl font-black">X</span>
                          <div className="flex flex-wrap gap-1 justify-center px-2">
                            {flag.issues.map(issueId => {
                              const cat = ISSUE_CATEGORIES.find(c => c.id === issueId)
                              return cat ? (
                                <span key={issueId} className={`${cat.color} text-white text-[8px] px-1.5 py-0.5 rounded font-bold`}>
                                  {cat.label}
                                </span>
                              ) : null
                            })}
                          </div>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(n => (
                              <span key={n} className={`text-xs ${n <= flag.grade ? 'text-red-400' : 'text-gray-600'}`}>●</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Top-right controls */}
                      <div className="absolute top-2 right-2 flex gap-1.5 z-10">
                        {/* Instant delete */}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (!confirm(`Delete ${item.filename}?`)) return
                            await fetch('/api/content/delete', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ paths: [item.path] }),
                            })
                            unflag(item.path)
                            fetchContent(selectedSlug)
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all bg-black/70 text-gray-300 hover:bg-red-600 hover:text-white opacity-0 group-hover:opacity-100"
                          title="Delete now"
                        >
                          🗑
                        </button>
                        {/* Flag with issue (optional detail) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isFlagged) {
                              unflag(item.path)
                            } else {
                              setFlagPicker(flagPicker === item.path ? null : item.path)
                            }
                          }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                            isFlagged
                              ? 'bg-red-600 text-white'
                              : 'bg-black/70 text-gray-300 hover:bg-yellow-600 hover:text-white opacity-0 group-hover:opacity-100'
                          }`}
                          title={isFlagged ? 'Unflag' : 'Flag with issue category'}
                        >
                          {isFlagged ? '✓' : '⚑'}
                        </button>
                      </div>

                      {/* Issue picker dropdown (optional) */}
                      {flagPicker === item.path && !isFlagged && (
                        <FlagPicker
                          onFlag={(data) => {
                            setFlag(item.path, data)
                            setFlagPicker(null)
                          }}
                          onCancel={() => setFlagPicker(null)}
                        />
                      )}

                      {/* Bottom path badge */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard.writeText(item.path)
                          const btn = e.currentTarget
                          btn.textContent = 'Copied!'
                          setTimeout(() => { btn.textContent = item.filename }, 1000)
                        }}
                        className="absolute bottom-2 left-2 right-2 bg-black/80 text-[9px] text-gray-300 hover:text-white px-2 py-1 rounded font-mono truncate opacity-0 group-hover:opacity-100 transition-opacity text-left z-10"
                        title={item.path}
                      >
                        {item.filename}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Empty state */}
            {!loading && filtered.length === 0 && content && (
              <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10">
                <p className="text-gray-500 text-lg">No images found for {character?.name}</p>
              </div>
            )}
          </>
        )}

        {/* ═══ PIPELINE VIEW ═══ */}
        {view === 'pipeline' && (
          <div className="space-y-6">
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-xl border border-white/10 p-4 text-center">
                <p className="text-3xl font-black text-red-400 font-mono">{reviewLog.length}</p>
                <p className="text-gray-500 text-xs mt-1">Total Flagged</p>
              </div>
              <div className="bg-white/5 rounded-xl border border-white/10 p-4 text-center">
                <p className="text-3xl font-black text-yellow-400 font-mono">{new Set(reviewLog.map(r => r.slug)).size}</p>
                <p className="text-gray-500 text-xs mt-1">Characters Affected</p>
              </div>
              <div className="bg-white/5 rounded-xl border border-white/10 p-4 text-center">
                <p className="text-3xl font-black text-orange-400 font-mono">{avgGrade.toFixed(1)}</p>
                <p className="text-gray-500 text-xs mt-1">Avg Severity (1-5)</p>
              </div>
              <div className="bg-white/5 rounded-xl border border-white/10 p-4 text-center">
                <p className="text-3xl font-black text-purple-400 font-mono">
                  {reviewLog.filter(r => r.grade >= 4).length}
                </p>
                <p className="text-gray-500 text-xs mt-1">Critical (4-5)</p>
              </div>
            </div>

            {/* Issue breakdown */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-bold mb-4">Issue Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ISSUE_CATEGORIES.map(cat => (
                  <div key={cat.id} className="flex items-center gap-3 bg-black/30 rounded-lg p-3">
                    <span className={`${cat.color} w-8 h-8 rounded-lg flex items-center justify-center text-sm`}>{cat.icon}</span>
                    <div>
                      <p className="text-white text-sm font-bold">{issueCounts[cat.id]}</p>
                      <p className="text-gray-500 text-[10px]">{cat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-character breakdown */}
            {(() => {
              const byCharacter: Record<string, ReviewEntry[]> = {}
              reviewLog.forEach(r => {
                if (!byCharacter[r.slug]) byCharacter[r.slug] = []
                byCharacter[r.slug].push(r)
              })
              return Object.entries(byCharacter).map(([slug, entries]) => {
                const char = NPGX_ROSTER.find(c => c.slug === slug)
                const charAvg = entries.reduce((s, e) => s + e.grade, 0) / entries.length
                return (
                  <div key={slug} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    {/* Character header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        {char?.hasImages && (
                          <img src={char.image} alt={char.name} className="w-10 h-10 rounded-lg object-cover" />
                        )}
                        <div>
                          <h3 className="font-bold">{char?.name || slug}</h3>
                          <p className="text-gray-500 text-xs">{entries.length} issues &middot; avg severity {charAvg.toFixed(1)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setSelectedSlug(slug); setView('review') }}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Review
                      </button>
                    </div>

                    {/* Issue thumbnails */}
                    <div className="p-4">
                      <div className="flex flex-wrap gap-3">
                        {entries.map(entry => (
                          <div key={entry.path} className="relative w-20 h-20 rounded-lg overflow-hidden border border-red-500/40 group">
                            <img src={entry.path} alt={entry.filename} className="w-full h-full object-cover opacity-60" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <div className="flex gap-0.5 mb-1">
                                {[1, 2, 3, 4, 5].map(n => (
                                  <span key={n} className={`text-[8px] ${n <= entry.grade ? 'text-red-400' : 'text-gray-700'}`}>●</span>
                                ))}
                              </div>
                              <div className="flex flex-wrap gap-0.5 justify-center px-1">
                                {entry.issues.slice(0, 2).map(issueId => {
                                  const cat = ISSUE_CATEGORIES.find(c => c.id === issueId)
                                  return cat ? (
                                    <span key={issueId} className={`${cat.color} text-white text-[6px] px-1 py-0.5 rounded font-bold`}>
                                      {cat.label}
                                    </span>
                                  ) : null
                                })}
                                {entry.issues.length > 2 && (
                                  <span className="text-gray-400 text-[6px]">+{entry.issues.length - 2}</span>
                                )}
                              </div>
                            </div>
                            {/* Delete single */}
                            <button
                              onClick={async () => {
                                if (!confirm(`Delete ${entry.filename}?`)) return
                                await fetch('/api/content/delete', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ paths: [entry.path] }),
                                })
                                setReviewLog(prev => prev.filter(r => r.path !== entry.path))
                              }}
                              className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-600 rounded-full text-[8px] text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              title="Delete"
                            >
                              X
                            </button>
                          </div>
                        ))}
                      </div>
                      {entries.some(e => e.note) && (
                        <div className="mt-3 space-y-1">
                          {entries.filter(e => e.note).map(e => (
                            <p key={e.path} className="text-gray-500 text-[10px] font-mono">
                              {e.filename}: {e.note}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            })()}

            {/* Empty pipeline */}
            {reviewLog.length === 0 && (
              <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10">
                <p className="text-gray-500 text-lg mb-2">No issues flagged yet</p>
                <p className="text-gray-600 text-sm">Switch to Review mode, click X on any image, select issues and severity</p>
              </div>
            )}

            {/* Bulk actions */}
            {reviewLog.length > 0 && (
              <div className="flex justify-between items-center bg-red-600/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 text-sm font-bold">{reviewLog.length} images in pipeline</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const csv = [
                        'Character,File,Issues,Severity,Note',
                        ...reviewLog.map(r =>
                          `${r.characterName},${r.filename},"${r.issues.join(', ')}",${r.grade},"${r.note}"`
                        )
                      ].join('\n')
                      navigator.clipboard.writeText(csv)
                      alert('CSV copied to clipboard')
                    }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={async () => {
                      const paths = reviewLog.map(r => r.path)
                      if (!confirm(`Delete ALL ${paths.length} flagged images across all characters? This cannot be undone.`)) return
                      setDeleting(true)
                      try {
                        const res = await fetch('/api/content/delete', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ paths }),
                        })
                        const data = await res.json()
                        setDeleteResult(`Deleted ${data.deleted}/${data.total} files`)
                        setReviewLog([])
                        setFlags({})
                        fetchContent(selectedSlug)
                      } catch {
                        setDeleteResult('Delete failed')
                      }
                      setDeleting(false)
                    }}
                    disabled={deleting}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : `Delete All ${reviewLog.length}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              src={lightbox}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-8 flex gap-4">
              {/* Instant delete from lightbox */}
              <button
                onClick={async (e) => {
                  e.stopPropagation()
                  if (!confirm('Delete this image?')) return
                  await fetch('/api/content/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paths: [lightbox] }),
                  })
                  unflag(lightbox)
                  setLightbox(null)
                  fetchContent(selectedSlug)
                }}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-colors"
              >
                Delete
              </button>
              {flags[lightbox] ? (
                <button
                  onClick={(e) => { e.stopPropagation(); unflag(lightbox); setLightbox(null) }}
                  className="px-6 py-3 bg-white/20 text-white rounded-xl font-bold text-sm"
                >
                  Unflag
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setFlagPicker(lightbox)
                  }}
                  className="px-6 py-3 bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-300 rounded-xl font-bold text-sm transition-colors border border-yellow-500/30"
                >
                  Flag Issue
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigator.clipboard.writeText(lightbox)
                }}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition-colors font-mono"
              >
                Copy Path
              </button>
            </div>
            {/* Issue picker in lightbox */}
            {flagPicker === lightbox && !flags[lightbox] && (
              <div className="absolute bottom-24" onClick={(e) => e.stopPropagation()}>
                <FlagPicker
                  onFlag={(data) => {
                    setFlag(lightbox, data)
                    setFlagPicker(null)
                    setLightbox(null)
                  }}
                  onCancel={() => setFlagPicker(null)}
                />
              </div>
            )}
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl transition-colors"
            >
              &times;
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Flag Picker ──────────────────────────────────────────────────────────────

function FlagPicker({ onFlag, onCancel }: { onFlag: (data: FlagData) => void; onCancel: () => void }) {
  const [selectedIssues, setSelectedIssues] = useState<IssueId[]>([])
  const [grade, setGrade] = useState(3)
  const [note, setNote] = useState('')

  const toggleIssue = (id: IssueId) => {
    setSelectedIssues(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  return (
    <div
      className="absolute top-0 left-0 right-0 z-20 bg-black/95 border border-red-500/40 rounded-xl p-3 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-[10px] text-gray-400 mb-2 font-bold uppercase">Select Issues</p>
      <div className="flex flex-wrap gap-1 mb-3">
        {ISSUE_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => toggleIssue(cat.id)}
            className={`text-[9px] px-2 py-1 rounded font-bold transition-colors ${
              selectedIssues.includes(cat.id)
                ? `${cat.color} text-white`
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-gray-400 mb-1 font-bold uppercase">Severity</p>
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => setGrade(n)}
            className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
              n <= grade ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-500 hover:bg-white/20'
            }`}
          >
            {n}
          </button>
        ))}
        <span className="text-[9px] text-gray-500 self-center ml-1">
          {grade <= 2 ? 'Minor' : grade === 3 ? 'Moderate' : 'Critical'}
        </span>
      </div>

      <input
        type="text"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white placeholder-gray-600 mb-2"
      />

      <div className="flex gap-2">
        <button
          onClick={() => {
            if (selectedIssues.length === 0) return
            onFlag({ issues: selectedIssues, grade, note })
          }}
          disabled={selectedIssues.length === 0}
          className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-30"
        >
          Flag ({selectedIssues.length})
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 bg-white/10 text-gray-400 text-[10px] font-bold rounded-lg hover:bg-white/20 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
