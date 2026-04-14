import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const revalidate = 30 // cache for 30 seconds

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ live: false, stats: null })
  }

  try {
    // Run all queries in parallel
    const [
      contentCountsRes,
      perGirlRes,
      recentActivityRes,
      totalCostRes,
      productionCountRes,
    ] = await Promise.all([
      // Total content by type
      supabase
        .from('npgx_content')
        .select('type', { count: 'exact', head: false })
        .eq('status', 'done'),

      // Per-girl content counts + cost — thenable, use .then(ok, err) not .catch()
      supabase.rpc('npgx_girl_stats').then(
        (r: unknown) => r,
        () => null,
      ),

      // Last 10 content items created (for activity feed)
      supabase
        .from('npgx_content')
        .select('id, slug, type, title, cost, created_at')
        .eq('status', 'done')
        .order('created_at', { ascending: false })
        .limit(10),

      // Total cost across all content
      supabase
        .from('npgx_content')
        .select('cost')
        .eq('status', 'done'),

      // Production count
      supabase
        .from('npgx_productions')
        .select('id', { count: 'exact', head: true }),
    ])

    // Count by type
    const typeCounts: Record<string, number> = {}
    if (contentCountsRes.data) {
      for (const row of contentCountsRes.data) {
        typeCounts[row.type] = (typeCounts[row.type] || 0) + 1
      }
    }

    // Total revenue
    let totalRevenue = 0
    if (totalCostRes.data) {
      for (const row of totalCostRes.data) {
        totalRevenue += Number(row.cost) || 0
      }
    }

    // Per-girl stats (from RPC or fallback)
    let girlStats: Record<string, { count: number; cost: number }> = {}
    const perGirlAny = perGirlRes as { data?: unknown } | null
    if (perGirlAny && perGirlAny.data) {
      for (const row of perGirlAny.data as any[]) {
        girlStats[row.slug] = { count: row.count, cost: Number(row.total_cost) }
      }
    } else if (contentCountsRes.data) {
      // Fallback: aggregate from content rows
      for (const row of contentCountsRes.data as any[]) {
        const slug = row.slug || 'unknown'
        if (!girlStats[slug]) girlStats[slug] = { count: 0, cost: 0 }
        girlStats[slug].count++
        girlStats[slug].cost += Number(row.cost) || 0
      }
    }

    // Recent activity for ticker messages
    const recentActivity = (recentActivityRes.data || []).map((r: any) => ({
      slug: r.slug,
      type: r.type,
      title: r.title,
      cost: Number(r.cost),
      createdAt: r.created_at,
    }))

    const totalItems = Object.values(typeCounts).reduce((a, b) => a + b, 0)

    return NextResponse.json({
      live: true,
      stats: {
        totalItems,
        totalRevenue,
        totalProductions: productionCountRes.count || 0,
        byType: typeCounts,
        byGirl: girlStats,
        recentActivity,
      },
    })
  } catch (err) {
    console.error('[stats] Error:', err)
    return NextResponse.json({ live: false, stats: null })
  }
}
