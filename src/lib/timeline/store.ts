// IndexedDB-backed store for timeline projects
// v2: Handles channel-based projects + auto-migrates v1 projects

import type { TimelineProject } from './types'
import { emptyChannel } from './types'
import { isV1Project, isV2Project, migrateV1Project, migrateV2Project } from './utils'

const DB_NAME = 'npgx-timeline-projects'
const STORE_NAME = 'projects'
const DB_VERSION = 3

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Auto-migrate a project from v1/v2 to v3 */
function ensureV3(raw: any): TimelineProject {
  if (isV1Project(raw)) return migrateV1Project(raw)
  if (isV2Project(raw)) return migrateV2Project(raw)
  // Ensure defaults for v3 fields
  if (!raw.schemaVersion || raw.schemaVersion < 3) raw.schemaVersion = 3
  if (!raw.mintHistory) raw.mintHistory = []
  if (!raw.conditions) raw.conditions = []
  // Ensure all 10 channels exist
  const needed = ['x', 'narrative', 'lipsync', 'scenes-v2', 'scenes-v1', 'titles-v2', 'titles-v1', 'fx', 'spare', 'music']
  if (!raw.channels) raw.channels = {}
  for (const ch of needed) {
    if (!raw.channels[ch]) raw.channels[ch] = emptyChannel()
  }
  return raw as TimelineProject
}

export async function saveProject(project: TimelineProject): Promise<void> {
  project.updatedAt = new Date().toISOString()

  // Save to IndexedDB (local — primary)
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(project)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })

  // Fire-and-forget to server
  try {
    fetch('/api/movie-editor/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    }).catch(() => {})
  } catch {}
}

export async function getProject(id: string): Promise<TimelineProject | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(id)
    request.onsuccess = () => {
      const raw = request.result
      resolve(raw ? ensureV3(raw) : null)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function listProjects(): Promise<TimelineProject[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => {
      const results = (request.result || []).map(ensureV3)
      resolve(results)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
