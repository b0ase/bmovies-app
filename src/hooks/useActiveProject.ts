'use client'

import { useCallback, useSyncExternalStore } from 'react'

export interface ActiveProject {
  id: string
  title: string
  ticker: string
}

const STORAGE_KEY = 'bmovies-active-project'
const EVENT_NAME = 'bmovies:project-changed'

// Keep a module-scoped snapshot so getSnapshot returns referentially
// stable values — useSyncExternalStore bails out of a render if the
// snapshot reference changes but the value didn't.
let cachedRaw: string | null = null
let cachedProject: ActiveProject | null = null

function readProject(): ActiveProject | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === cachedRaw) return cachedProject
    cachedRaw = raw
    cachedProject = raw ? (JSON.parse(raw) as ActiveProject) : null
    return cachedProject
  } catch {
    cachedRaw = null
    cachedProject = null
    return null
  }
}

function subscribe(notify: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cachedRaw = null // force re-read on next snapshot
      notify()
    }
  }
  const onCustom = () => {
    cachedRaw = null
    notify()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(EVENT_NAME, onCustom)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(EVENT_NAME, onCustom)
  }
}

export function useActiveProject(): [ActiveProject | null, (p: ActiveProject | null) => void] {
  const project = useSyncExternalStore<ActiveProject | null>(subscribe, readProject, () => null)

  const setActive = useCallback((p: ActiveProject | null) => {
    if (p) localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
    else localStorage.removeItem(STORAGE_KEY)
    // Invalidate the snapshot cache so the next getSnapshot rereads
    // the fresh value instead of returning the stale cached one.
    cachedRaw = null
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: p }))
  }, [])

  return [project, setActive]
}
