'use client'

import { useState, useEffect, useCallback } from 'react'

export interface ActiveProject {
  id: string
  title: string
  ticker: string
}

const STORAGE_KEY = 'bmovies-active-project'
const EVENT_NAME = 'bmovies:project-changed'

export function useActiveProject(): [ActiveProject | null, (p: ActiveProject | null) => void] {
  const [project, setProject] = useState<ActiveProject | null>(null)

  useEffect(() => {
    // Read from localStorage on mount
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setProject(JSON.parse(raw))
    } catch {
      // Corrupted data — ignore
    }

    // Listen for changes from other components
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setProject(detail || null)
    }
    window.addEventListener(EVENT_NAME, handler)
    return () => window.removeEventListener(EVENT_NAME, handler)
  }, [])

  const setActive = useCallback((p: ActiveProject | null) => {
    setProject(p)
    if (p) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: p }))
  }, [])

  return [project, setActive]
}
