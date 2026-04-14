import { supabase } from './supabase'

export interface NinjaRanking {
  id: string
  name: string
  ticker: string
  slug: string
  image_url: string | null
  category: string
  verified: boolean
  current_rank: number
  previous_rank: number | null
  rank_change: number
  market_cap: number
  volume_24h: number
  price: number
  price_change_24h: number
  liquidity: number
  cost: number
  holders: number
  total_views: number
  total_revenue: number
  unique_fans: number
  content_count: number
  created_at: string
  updated_at: string
}

export interface TickerMessage {
  id: string
  message_text: string
  message_type: 'alert' | 'price' | 'news' | 'update'
  color_class: string | null
  priority: number
  is_active: boolean
  is_auto_generated: boolean
  source_type: string | null
  source_id: string | null
  created_at: string
  expires_at: string
}

export interface MarketData {
  id: string
  symbol: string
  price: number
  price_change_24h: number
  volume_24h: number
  market_cap: number
  circulating_supply: number
  total_supply: number
  total_users: number
  active_users_24h: number
  total_characters_created: number
  characters_created_24h: number
  total_revenue_24h: number
  created_at: string
}

// Fetch live ninja rankings
export async function getLiveRankings(limit = 100): Promise<NinjaRanking[]> {
  try {
    if (!supabase) return []

    const { data, error } = await supabase
      .from('ninja_rankings')
      .select('*')
      .order('current_rank', { ascending: true })
      .limit(limit)

    if (error) return []
    return data || []
  } catch {
    return []
  }
}

// Fetch active ticker messages
export async function getLiveTickerMessages(): Promise<TickerMessage[]> {
  try {
    if (!supabase) return []

    const { data, error } = await supabase
      .from('ticker_messages')
      .select('*')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) return []
    return data || []
  } catch {
    return []
  }
}

// Fetch latest market data
export async function getLatestMarketData(): Promise<MarketData | null> {
  try {
    if (!supabase) return null

    const { data, error } = await supabase
      .from('market_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) return null
    return data
  } catch {
    return null
  }
}

// Update ninja ranking data (admin function)
export async function updateNinjaRanking(
  id: string, 
  updates: Partial<NinjaRanking>
): Promise<boolean> {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized')
      return false
    }

    const { error } = await supabase
      .from('ninja_rankings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating ninja ranking:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateNinjaRanking:', error)
    return false
  }
}

// Add manual ticker message (admin function)
export async function addTickerMessage(
  message: Omit<TickerMessage, 'id' | 'created_at' | 'expires_at' | 'is_auto_generated' | 'current_displays'>
): Promise<boolean> {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized')
      return false
    }

    const { error } = await supabase
      .from('ticker_messages')
      .insert({
        ...message,
        is_auto_generated: false,
        current_displays: 0,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      })

    if (error) {
      console.error('Error adding ticker message:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in addTickerMessage:', error)
    return false
  }
}

// Add market data entry
export async function addMarketData(data: Omit<MarketData, 'id' | 'created_at'>): Promise<boolean> {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized')
      return false
    }

    const { error } = await supabase
      .from('market_data')
      .insert(data)

    if (error) {
      console.error('Error adding market data:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in addMarketData:', error)
    return false
  }
}

// Subscribe to real-time ticker updates
// Disabled: Supabase Cloud URL is dead — realtime causes infinite websocket reconnection spam
export function subscribeToTickerUpdates(_callback: (messages: TickerMessage[]) => void) {
  return null
}

// Subscribe to real-time ranking updates
// Disabled: Supabase Cloud URL is dead — realtime causes infinite websocket reconnection spam
export function subscribeToRankingUpdates(_callback: (rankings: NinjaRanking[]) => void) {
  return null
}

// Helper function to format numbers for display
export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

// Helper function to format currency
export function formatCurrency(num: number): string {
  return `$${formatNumber(num)}`
}

// Helper function to get rank change display
export function getRankChangeDisplay(change: number): { icon: string; color: string } {
  if (change > 0) return { icon: '📈', color: 'text-punk-electric' }
  if (change < 0) return { icon: '📉', color: 'text-punk-blood' }
  return { icon: '➡️', color: 'text-gray-400' }
} 