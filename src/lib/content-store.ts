// NPGX Unified Content Store
// All generated content for all characters lives here.
// Keyed by character slug, typed by content type.

import { supabase } from './supabase'

export type ContentType = 'image' | 'video' | 'script' | 'song' | 'magazine' | 'card' | 'production'

export interface ContentItem {
  id: string                    // uuid
  slug: string                  // character slug
  type: ContentType
  title: string                 // human label
  provider: string              // grok, wan2.1, stability, minimax, etc
  status: 'pending' | 'generating' | 'done' | 'error'
  url?: string                  // CDN/storage URL for the asset
  data?: Record<string, any>    // type-specific payload (script text, song lyrics, magazine pages, etc)
  prompt?: string               // generation prompt used
  cost: number                  // USD
  productionId?: string         // links to a One Shot production run
  userHandle?: string           // HandCash handle of the creator
  error?: string
  createdAt: string             // ISO timestamp
}

export interface Production {
  id: string                    // prod-{slug}-{timestamp}
  slug: string
  status: 'running' | 'done' | 'error'
  format: string
  brief?: string
  items: string[]               // content item IDs created by this production
  totalCost: number
  errors: string[]
  userHandle?: string           // HandCash handle of the creator
  createdAt: string
  completedAt?: string
}

// In-memory fallback stores for dev without a database
const memoryContent = new Map<string, ContentItem>()
const memoryProductions = new Map<string, Production>()
let fallbackWarned = false

const warnFallback = () => {
  if (!fallbackWarned) {
    console.warn('[content-store] Supabase not configured — using in-memory fallback')
    fallbackWarned = true
  }
}

const generateId = () => crypto.randomUUID()

// Map DB row (snake_case) to ContentItem (camelCase)
const rowToContent = (row: any): ContentItem => ({
  id: row.id,
  slug: row.slug,
  type: row.type,
  title: row.title,
  provider: row.provider,
  status: row.status,
  url: row.url ?? undefined,
  data: row.data ?? undefined,
  prompt: row.prompt ?? undefined,
  cost: Number(row.cost),
  productionId: row.production_id ?? undefined,
  userHandle: row.user_handle ?? undefined,
  error: row.error ?? undefined,
  createdAt: row.created_at,
})

// Map DB row to Production
const rowToProduction = (row: any): Production => ({
  id: row.id,
  slug: row.slug,
  status: row.status,
  format: row.format,
  brief: row.brief ?? undefined,
  items: row.items ?? [],
  totalCost: Number(row.total_cost),
  errors: row.errors ?? [],
  userHandle: row.user_handle ?? undefined,
  createdAt: row.created_at,
  completedAt: row.completed_at ?? undefined,
})

// --- Content functions ---

export const saveContent = async (
  item: Omit<ContentItem, 'id' | 'createdAt'>
): Promise<ContentItem> => {
  const id = generateId()
  const createdAt = new Date().toISOString()
  const full: ContentItem = { ...item, id, createdAt }

  if (!supabase) {
    warnFallback()
    memoryContent.set(id, full)
    return full
  }

  const { data, error } = await supabase
    .from('npgx_content')
    .insert({
      id,
      slug: item.slug,
      type: item.type,
      title: item.title,
      provider: item.provider,
      status: item.status,
      url: item.url ?? null,
      data: item.data ?? null,
      prompt: item.prompt ?? null,
      cost: item.cost,
      production_id: item.productionId ?? null,
      user_handle: item.userHandle ?? null,
      error: item.error ?? null,
      created_at: createdAt,
    })
    .select()
    .single()

  if (error) throw error
  return rowToContent(data)
}

export const updateContent = async (
  id: string,
  updates: Partial<ContentItem>
): Promise<void> => {
  if (!supabase) {
    warnFallback()
    const existing = memoryContent.get(id)
    if (existing) memoryContent.set(id, { ...existing, ...updates })
    return
  }

  const dbUpdates: Record<string, any> = {}
  if (updates.status !== undefined) dbUpdates.status = updates.status
  if (updates.url !== undefined) dbUpdates.url = updates.url
  if (updates.data !== undefined) dbUpdates.data = updates.data
  if (updates.prompt !== undefined) dbUpdates.prompt = updates.prompt
  if (updates.cost !== undefined) dbUpdates.cost = updates.cost
  if (updates.error !== undefined) dbUpdates.error = updates.error
  if (updates.title !== undefined) dbUpdates.title = updates.title
  if (updates.provider !== undefined) dbUpdates.provider = updates.provider
  if (updates.productionId !== undefined) dbUpdates.production_id = updates.productionId
  if (updates.userHandle !== undefined) dbUpdates.user_handle = updates.userHandle

  const { error } = await supabase
    .from('npgx_content')
    .update(dbUpdates)
    .eq('id', id)

  if (error) throw error
}

export const getContentForCharacter = async (
  slug: string,
  type?: ContentType
): Promise<ContentItem[]> => {
  if (!supabase) {
    warnFallback()
    let items = Array.from(memoryContent.values()).filter(i => i.slug === slug)
    if (type) items = items.filter(i => i.type === type)
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  let query = supabase
    .from('npgx_content')
    .select('*')
    .eq('slug', slug)
    .order('created_at', { ascending: false })

  if (type) query = query.eq('type', type)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(rowToContent)
}

export const getContentByProduction = async (
  productionId: string
): Promise<ContentItem[]> => {
  if (!supabase) {
    warnFallback()
    return Array.from(memoryContent.values())
      .filter(i => i.productionId === productionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  const { data, error } = await supabase
    .from('npgx_content')
    .select('*')
    .eq('production_id', productionId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(rowToContent)
}

export const getRecentContent = async (
  limit = 50
): Promise<ContentItem[]> => {
  if (!supabase) {
    warnFallback()
    return Array.from(memoryContent.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
  }

  const { data, error } = await supabase
    .from('npgx_content')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []).map(rowToContent)
}

// --- User content functions ---

export const getContentForUser = async (
  userHandle: string,
  type?: ContentType,
  limit = 200
): Promise<ContentItem[]> => {
  if (!supabase) {
    warnFallback()
    let items = Array.from(memoryContent.values()).filter(i => i.userHandle === userHandle)
    if (type) items = items.filter(i => i.type === type)
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)
  }

  let query = supabase
    .from('npgx_content')
    .select('*')
    .eq('user_handle', userHandle)
    .eq('status', 'done')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type) query = query.eq('type', type)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(rowToContent)
}

export const getProductionsForUser = async (
  userHandle: string,
  limit = 50
): Promise<Production[]> => {
  if (!supabase) {
    warnFallback()
    return Array.from(memoryProductions.values())
      .filter(p => p.userHandle === userHandle)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
  }

  const { data, error } = await supabase
    .from('npgx_productions')
    .select('*')
    .eq('user_handle', userHandle)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []).map(rowToProduction)
}

// --- Production functions ---

export const saveProduction = async (
  prod: Omit<Production, 'id' | 'createdAt'>
): Promise<Production> => {
  const id = `prod-${prod.slug}-${Date.now()}`
  const createdAt = new Date().toISOString()
  const full: Production = { ...prod, id, createdAt }

  if (!supabase) {
    warnFallback()
    memoryProductions.set(id, full)
    return full
  }

  const { data, error } = await supabase
    .from('npgx_productions')
    .insert({
      id,
      slug: prod.slug,
      status: prod.status,
      format: prod.format,
      brief: prod.brief ?? null,
      items: prod.items,
      total_cost: prod.totalCost,
      errors: prod.errors,
      user_handle: prod.userHandle ?? null,
      created_at: createdAt,
      completed_at: prod.completedAt ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return rowToProduction(data)
}

export const updateProduction = async (
  id: string,
  updates: Partial<Production>
): Promise<void> => {
  if (!supabase) {
    warnFallback()
    const existing = memoryProductions.get(id)
    if (existing) memoryProductions.set(id, { ...existing, ...updates })
    return
  }

  const dbUpdates: Record<string, any> = {}
  if (updates.status !== undefined) dbUpdates.status = updates.status
  if (updates.items !== undefined) dbUpdates.items = updates.items
  if (updates.totalCost !== undefined) dbUpdates.total_cost = updates.totalCost
  if (updates.errors !== undefined) dbUpdates.errors = updates.errors
  if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt
  if (updates.brief !== undefined) dbUpdates.brief = updates.brief
  if (updates.format !== undefined) dbUpdates.format = updates.format

  const { error } = await supabase
    .from('npgx_productions')
    .update(dbUpdates)
    .eq('id', id)

  if (error) throw error
}

export const getProduction = async (
  id: string
): Promise<Production | null> => {
  if (!supabase) {
    warnFallback()
    return memoryProductions.get(id) ?? null
  }

  const { data, error } = await supabase
    .from('npgx_productions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw error
  }
  return rowToProduction(data)
}
