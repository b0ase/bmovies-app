'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  CircleStackIcon,
  TableCellsIcon,
  UserIcon,
  PhotoIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  LinkIcon,
  ServerIcon,
  DocumentTextIcon,
  BeakerIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

export default function DatabasePage() {
  const coreAITables = [
    {
      name: 'ai_girlfriends',
      description: 'Main NPGX character profiles with personality, appearance, and stats',
      columns: ['id', 'name', 'slug', 'age', 'personality', 'bio', 'hair_color', 'eye_color', 'ethnicity', 'body_type', 'height', 'location', 'interests', 'relationship_status', 'occupation', 'is_active', 'is_premium', 'popularity_score', 'total_revenue'],
      rowCount: '25-50',
      relationships: ['content_assets', 'social_profiles', 'name_variants'],
      primaryKey: 'id (UUID)',
      indexes: ['slug', 'is_active', 'popularity_score']
    },
    {
      name: 'name_variants',
      description: 'Different name variations for each girlfriend (nicknames, formal names)',
      columns: ['id', 'girlfriend_id', 'variant_name', 'nickname', 'use_frequency', 'context'],
      rowCount: '100-200',
      relationships: ['ai_girlfriends'],
      primaryKey: 'id (UUID)',
      indexes: ['girlfriend_id']
    },
    {
      name: 'outfits',
      description: 'Clothing and outfit options for NPGX characters',
      columns: ['id', 'name', 'category', 'description', 'style_tags', 'season', 'occasion', 'color_scheme', 'is_premium', 'cost_to_generate', 'popularity_score'],
      rowCount: '500-1000',
      relationships: ['outfit_variants', 'content_assets'],
      primaryKey: 'id (UUID)',
      indexes: ['category', 'is_premium', 'popularity_score']
    },
    {
      name: 'outfit_variants',
      description: 'Color and style variations of base outfits',
      columns: ['id', 'outfit_id', 'variant_name', 'color', 'material', 'fit', 'style_modifier', 'additional_cost'],
      rowCount: '2000-5000',
      relationships: ['outfits'],
      primaryKey: 'id (UUID)',
      indexes: ['outfit_id']
    },
    {
      name: 'locations',
      description: 'Background settings and environments for content generation',
      columns: ['id', 'name', 'category', 'description', 'mood', 'lighting', 'style', 'is_premium', 'cost_to_generate', 'popularity_score'],
      rowCount: '200-500',
      relationships: ['location_variants', 'content_assets'],
      primaryKey: 'id (UUID)',
      indexes: ['category', 'is_premium', 'popularity_score']
    },
    {
      name: 'location_variants',
      description: 'Time, weather, and seasonal variations of locations',
      columns: ['id', 'location_id', 'variant_name', 'time_of_day', 'weather', 'season', 'crowd_level', 'additional_details', 'additional_cost'],
      rowCount: '1000-2000',
      relationships: ['locations'],
      primaryKey: 'id (UUID)',
      indexes: ['location_id']
    },
    {
      name: 'accessories',
      description: 'Props, jewelry, and accessories for NPGX characters',
      columns: ['id', 'name', 'category', 'description', 'style', 'color', 'brand', 'is_premium', 'cost_to_generate'],
      rowCount: '300-800',
      relationships: ['content_assets (array reference)'],
      primaryKey: 'id (UUID)',
      indexes: ['category', 'is_premium']
    }
  ]

  const contentTables = [
    {
      name: 'content_assets',
      description: 'All generated content (images, videos, voices) with metadata',
      columns: ['id', 'girlfriend_id', 'asset_type', 'file_url', 'file_size', 'duration', 'resolution', 'format', 'quality', 'prompt_used', 'generation_settings', 'provider', 'generation_cost', 'storage_cost', 'outfit_id', 'location_id', 'accessories_used', 'mood_tags', 'nsfw_rating', 'is_public', 'is_premium', 'view_count', 'like_count', 'download_count', 'revenue_generated'],
      rowCount: '10,000-50,000',
      relationships: ['ai_girlfriends', 'outfits', 'locations', 'accessories'],
      primaryKey: 'id (UUID)',
      indexes: ['girlfriend_id', 'asset_type', 'is_public', 'provider']
    },
    {
      name: 'generated_images',
      description: 'Specific data for AI-generated images with prompts and settings',
      columns: ['id', 'content_asset_id', 'url', 'prompt', 'negative_prompt', 'options', 'provider', 'model_version', 'seed', 'steps', 'guidance_scale', 'cost', 'generation_time', 'user_id'],
      rowCount: '8,000-40,000',
      relationships: ['content_assets', 'auth.users'],
      primaryKey: 'id (UUID)',
      indexes: ['content_asset_id', 'provider', 'user_id']
    }
  ]

  const socialTables = [
    {
      name: 'social_profiles',
      description: 'Social media accounts for each NPGX character across platforms',
      columns: ['id', 'girlfriend_id', 'platform', 'username', 'profile_url', 'bio', 'follower_count', 'following_count', 'post_count', 'engagement_rate', 'is_verified', 'is_active', 'auto_post_enabled', 'posting_schedule', 'content_style', 'revenue_generated', 'last_post_at'],
      rowCount: '125-300',
      relationships: ['ai_girlfriends'],
      primaryKey: 'id (UUID)',
      indexes: ['girlfriend_id', 'platform', 'is_active']
    },
    {
      name: 'links',
      description: 'External links and URLs for each girlfriend (OnlyFans, personal sites)',
      columns: ['id', 'girlfriend_id', 'link_type', 'url', 'title', 'description', 'is_active', 'click_count', 'revenue_generated'],
      rowCount: '200-500',
      relationships: ['ai_girlfriends'],
      primaryKey: 'id (UUID)',
      indexes: ['girlfriend_id', 'link_type', 'is_active']
    },
    {
      name: 'wallet_addresses',
      description: 'Cryptocurrency wallet addresses for each girlfriend',
      columns: ['id', 'girlfriend_id', 'blockchain', 'address', 'wallet_type', 'is_primary', 'balance', 'is_active'],
      rowCount: '50-150',
      relationships: ['ai_girlfriends'],
      primaryKey: 'id (UUID)',
      indexes: ['girlfriend_id', 'blockchain', 'is_active']
    }
  ]

  const businessTables = [
    {
      name: 'concerns',
      description: 'Joe\'s business concerns and strategic issues tracking',
      columns: ['id', 'title', 'content', 'priority', 'status', 'category', 'tags', 'created_by', 'resolved_at', 'resolution_notes', 'created_at', 'updated_at'],
      rowCount: '10-100',
      relationships: ['auth.users'],
      primaryKey: 'id (UUID)',
      indexes: ['status', 'priority', 'category', 'created_by', 'created_at']
    },
    {
      name: 'joe_research',
      description: 'Research notes, ChatGPT outputs, and market analysis for Joe',
      columns: ['id', 'title', 'research_type', 'source', 'content', 'key_insights', 'action_items', 'tags', 'priority', 'status', 'research_date', 'follow_up_date', 'attachments', 'created_by'],
      rowCount: '50-500',
      relationships: ['auth.users'],
      primaryKey: 'id (UUID)',
      indexes: ['research_type', 'status', 'priority', 'research_date', 'created_by']
    },
    {
      name: 'joe_contacts',
      description: 'Investor, partner, affiliate, and sponsor contact management',
      columns: ['id', 'name', 'contact_type', 'company', 'position', 'email', 'phone', 'linkedin_url', 'investment_range', 'relationship_status', 'deal_size', 'probability', 'notes', 'tags'],
      rowCount: '100-1000',
      relationships: ['auth.users'],
      primaryKey: 'id (UUID)',
      indexes: ['contact_type', 'relationship_status', 'next_follow_up', 'probability', 'created_by']
    },
    {
      name: 'joe_swot',
      description: 'SWOT analysis items with research attachments and action plans',
      columns: ['id', 'swot_type', 'title', 'description', 'impact_level', 'timeframe', 'category', 'supporting_research', 'action_plan', 'metrics', 'status', 'priority_score', 'assigned_to', 'attachments'],
      rowCount: '20-200',
      relationships: ['auth.users'],
      primaryKey: 'id (UUID)',
      indexes: ['swot_type', 'impact_level', 'status', 'priority_score', 'last_reviewed', 'created_by']
    },
    {
      name: 'joe_tasks',
      description: 'Daily action items, recurring tasks, and milestone tracking',
      columns: ['id', 'title', 'description', 'task_type', 'category', 'priority', 'status', 'due_date', 'estimated_hours', 'completion_percentage', 'recurring_pattern', 'dependencies', 'tags'],
      rowCount: '50-500',
      relationships: ['auth.users'],
      primaryKey: 'id (UUID)',
      indexes: ['task_type', 'category', 'status', 'priority', 'due_date', 'created_by']
    },
    {
      name: 'affiliates',
      description: 'Affiliate marketing partners and commission tracking',
      columns: ['id', 'name', 'category', 'commission_rate', 'payment_terms', 'contact_email', 'website', 'is_active', 'total_revenue', 'last_payment'],
      rowCount: '20-50',
      relationships: ['target_audiences'],
      primaryKey: 'id (UUID)',
      indexes: ['category', 'is_active']
    },
    {
      name: 'brands',
      description: 'Partner brands for product placement and sponsorships',
      columns: ['id', 'name', 'category', 'description', 'website', 'contact_info', 'partnership_type', 'is_active', 'total_spent'],
      rowCount: '15-40',
      relationships: ['target_audiences'],
      primaryKey: 'id (UUID)',
      indexes: ['category', 'is_active']
    },
    {
      name: 'target_audiences',
      description: 'Demographic segments and their monetization strategies',
      columns: ['id', 'name', 'age_range', 'interests', 'pain_points', 'spending_power', 'preferred_platforms', 'monetization_strategy', 'market_size', 'conversion_rate'],
      rowCount: '10-20',
      relationships: ['affiliates', 'brands'],
      primaryKey: 'id (UUID)',
      indexes: ['age_range', 'spending_power']
    },
    {
      name: 'services',
      description: 'External services and tools used in the platform',
      columns: ['id', 'name', 'category', 'description', 'provider', 'pricing_model', 'monthly_cost', 'usage_limits', 'is_active', 'last_used'],
      rowCount: '25-50',
      relationships: ['expenses'],
      primaryKey: 'id (UUID)',
      indexes: ['category', 'is_active']
    }
  ]

  const financialTables = [
    {
      name: 'expenses',
      description: 'All platform expenses and cost tracking',
      columns: ['id', 'service_id', 'expense_date', 'amount', 'currency', 'category', 'description', 'is_recurring', 'next_due_date', 'payment_method', 'receipt_url'],
      rowCount: '100-500',
      relationships: ['services'],
      primaryKey: 'id (UUID)',
      indexes: ['expense_date', 'service_id', 'category']
    },
    {
      name: 'burn_rate_tracking',
      description: 'Monthly burn rate and runway calculations',
      columns: ['id', 'month', 'year', 'total_expenses', 'total_revenue', 'burn_rate', 'runway_months', 'cash_balance'],
      rowCount: '12-24',
      relationships: ['expenses', 'revenue'],
      primaryKey: 'id (UUID)',
      indexes: ['month', 'year']
    },
    {
      name: 'revenue',
      description: 'Revenue tracking by girlfriend and source',
      columns: ['id', 'girlfriend_id', 'revenue_date', 'amount', 'currency', 'source', 'platform', 'description', 'commission_rate', 'net_amount'],
      rowCount: '500-2000',
      relationships: ['ai_girlfriends'],
      primaryKey: 'id (UUID)',
      indexes: ['revenue_date', 'girlfriend_id', 'source']
    }
  ]

  const dataMatrix = {
    'Physical Appearance': {
      tables: ['ai_girlfriends', 'outfits', 'outfit_variants', 'accessories'],
      attributes: ['hair_color', 'eye_color', 'ethnicity', 'body_type', 'height', 'age'],
      variations: '1,000+ unique combinations',
      cost: '$0.05-0.15 per generation'
    },
    'Personality & Behavior': {
      tables: ['ai_girlfriends', 'name_variants'],
      attributes: ['personality', 'bio', 'interests', 'occupation', 'relationship_status'],
      variations: '500+ personality archetypes',
      cost: 'Free (text-based)'
    },
    'Content Generation': {
      tables: ['content_assets', 'generated_images', 'locations', 'location_variants'],
      attributes: ['prompts', 'settings', 'quality', 'resolution', 'mood_tags', 'nsfw_rating'],
      variations: '10,000+ unique scenes',
      cost: '$0.03-0.25 per image/video'
    },
    'Social Presence': {
      tables: ['social_profiles', 'links'],
      attributes: ['platform', 'username', 'bio', 'posting_schedule', 'content_style'],
      variations: '6+ platforms per girlfriend',
      cost: '$0-50/month per profile'
    },
    'Monetization': {
      tables: ['revenue', 'affiliates', 'target_audiences', 'wallet_addresses'],
      attributes: ['revenue_sources', 'commission_rates', 'payment_methods', 'crypto_wallets'],
      variations: '10+ revenue streams',
      cost: '5-30% commission rates'
    }
  }

  const databaseStats = {
    totalTables: 19,
    totalColumns: 200,
    estimatedRows: '50,000-100,000',
    storageSize: '5-20 GB',
    monthlyQueries: '1M-5M',
    backupFrequency: 'Daily',
    replicationEnabled: true,
    encryptionEnabled: true
  }

  const getTableIcon = (tableName: string) => {
    if (tableName.includes('ai_girlfriends') || tableName.includes('name_variants')) return UserIcon
    if (tableName.includes('content') || tableName.includes('images')) return PhotoIcon
    if (tableName.includes('social') || tableName.includes('links')) return GlobeAltIcon
    if (tableName.includes('revenue') || tableName.includes('expenses') || tableName.includes('burn')) return CurrencyDollarIcon
    if (tableName.includes('outfits') || tableName.includes('locations') || tableName.includes('accessories')) return BeakerIcon
    return TableCellsIcon
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-black py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center space-x-3 mb-6">
            <CircleStackIcon className="w-10 h-10 text-red-400" />
            <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-wide font-[family-name:var(--font-brand)] bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent">
              DATABASE
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto mb-8">
            Complete overview of our Supabase database structure, tables, and NPGX character data matrix
          </p>
          
          {/* Database Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
              <div className="text-2xl font-bold text-red-400">{databaseStats.totalTables}</div>
              <div className="text-gray-300 text-sm">Tables</div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
              <div className="text-2xl font-bold text-gray-400">{databaseStats.totalColumns}+</div>
              <div className="text-gray-300 text-sm">Columns</div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
              <div className="text-2xl font-bold text-red-400">{databaseStats.estimatedRows}</div>
              <div className="text-gray-300 text-sm">Rows</div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
              <div className="text-2xl font-bold text-red-400">{databaseStats.storageSize}</div>
              <div className="text-gray-300 text-sm">Storage</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <a 
              href="https://supabase.com/dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-white/10 to-white/5 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
            >
              Open Supabase Dashboard
            </a>
            <Link 
              href="/notion"
              className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
            >
              Research Hub
            </Link>
            <Link 
              href="/joe"
              className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
            >
              Joe's Command Center
            </Link>
          </div>
        </motion.div>

        {/* NPGX Character Data Matrix */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
            <BeakerIcon className="w-8 h-8 mr-3 text-red-400" />
            NPGX Character Construction Matrix
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(dataMatrix).map(([category, data], index) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + 0.1 * index }}
                className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20/30 transition-all duration-300"
              >
                <h3 className="text-xl font-bold text-red-400 mb-4">{category}</h3>
                
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-bold text-gray-400 mb-1">TABLES</div>
                    <div className="flex flex-wrap gap-2">
                      {data.tables.map((table, tableIndex) => (
                        <span 
                          key={tableIndex}
                          className="bg-red-500/20 text-red-300 px-2 py-1 rounded-lg text-xs font-medium"
                        >
                          {table}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-bold text-gray-400 mb-1">KEY ATTRIBUTES</div>
                    <div className="text-gray-300 text-sm">
                      {data.attributes.join(', ')}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <div>
                      <div className="text-sm font-bold text-gray-400">VARIATIONS</div>
                      <div className="text-red-400 font-medium">{data.variations}</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-400">COST</div>
                      <div className="text-red-400 font-medium">{data.cost}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Core AI Tables */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
            <UserIcon className="w-8 h-8 mr-3 text-gray-400" />
            Core NPGX Character Tables
          </h2>
          
          <div className="space-y-6">
            {coreAITables.map((table, index) => {
              const TableIcon = getTableIcon(table.name)
              return (
                <motion.div
                  key={table.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + 0.1 * index }}
                  className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-blue-400/30 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <TableIcon className="w-6 h-6 text-gray-400" />
                      <h3 className="text-xl font-bold text-gray-400">{table.name}</h3>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="bg-white/10 text-gray-300 px-3 py-1 rounded-full text-sm font-medium">
                        {table.rowCount} rows
                      </span>
                      <span className="bg-red-600/20 text-red-300 px-3 py-1 rounded-full text-sm font-medium">
                        {table.columns.length} columns
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-4">{table.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-bold text-gray-400 mb-2">KEY COLUMNS</div>
                      <div className="text-gray-300 text-sm">
                        {table.columns.slice(0, 8).join(', ')}
                        {table.columns.length > 8 && ` ... +${table.columns.length - 8} more`}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-bold text-gray-400 mb-2">RELATIONSHIPS</div>
                      <div className="flex flex-wrap gap-2">
                        {table.relationships.map((rel, relIndex) => (
                          <span 
                            key={relIndex}
                            className="bg-transparent0/20 text-gray-300 px-2 py-1 rounded-lg text-xs"
                          >
                            {rel}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                    <div className="text-sm text-gray-400">
                      Primary Key: <span className="text-gray-400 font-medium">{table.primaryKey}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      Indexes: <span className="text-red-400 font-medium">{table.indexes.join(', ')}</span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Content Assets Tables */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
            <PhotoIcon className="w-8 h-8 mr-3 text-red-400" />
            Content & Media Tables
          </h2>
          
          <div className="space-y-6">
            {contentTables.map((table, index) => {
              const TableIcon = getTableIcon(table.name)
              return (
                <motion.div
                  key={table.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + 0.1 * index }}
                  className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-red-400/30 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <TableIcon className="w-6 h-6 text-red-400" />
                      <h3 className="text-xl font-bold text-red-400">{table.name}</h3>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-sm font-medium">
                        {table.rowCount} rows
                      </span>
                      <span className="bg-red-600/20 text-red-300 px-3 py-1 rounded-full text-sm font-medium">
                        {table.columns.length} columns
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-4">{table.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-bold text-gray-400 mb-2">KEY COLUMNS</div>
                      <div className="text-gray-300 text-sm">
                        {table.columns.slice(0, 10).join(', ')}
                        {table.columns.length > 10 && ` ... +${table.columns.length - 10} more`}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-bold text-gray-400 mb-2">RELATIONSHIPS</div>
                      <div className="flex flex-wrap gap-2">
                        {table.relationships.map((rel, relIndex) => (
                          <span 
                            key={relIndex}
                            className="bg-transparent0/20 text-gray-300 px-2 py-1 rounded-lg text-xs"
                          >
                            {rel}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                    <div className="text-sm text-gray-400">
                      Primary Key: <span className="text-red-400 font-medium">{table.primaryKey}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      Indexes: <span className="text-red-400 font-medium">{table.indexes.join(', ')}</span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Social & Business Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Social Tables */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <GlobeAltIcon className="w-6 h-6 mr-3 text-white 400" />
              Social Media Tables
            </h2>
            
            <div className="space-y-4">
              {socialTables.map((table, index) => (
                <div
                  key={table.name}
                  className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 hover:border-gray-300/30 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-white 400">{table.name}</h3>
                    <span className="bg-white/20 text-white 300 px-2 py-1 rounded-lg text-xs font-medium">
                      {table.rowCount} rows
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">{table.description}</p>
                  <div className="text-xs text-gray-400">
                    Columns: {table.columns.slice(0, 5).join(', ')}...
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Business Tables */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <CurrencyDollarIcon className="w-6 h-6 mr-3 text-gray-400" />
              Business & Finance Tables
            </h2>
            
            <div className="space-y-4">
              {businessTables.map((table, index) => (
                <div
                  key={table.name}
                  className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 hover:border-yellow-400/30 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-400">{table.name}</h3>
                    <span className="bg-red-600/20 text-yellow-300 px-2 py-1 rounded-lg text-xs font-medium">
                      {table.rowCount} rows
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">{table.description}</p>
                  <div className="text-xs text-gray-400">
                    Columns: {table.columns.slice(0, 5).join(', ')}...
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Financial Tables */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="lg:col-span-2"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <ChartBarIcon className="w-6 h-6 mr-3 text-red-400" />
              Financial Tracking Tables
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {financialTables.map((table, index) => (
                <div
                  key={table.name}
                  className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 hover:border-green-400/30 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-red-400">{table.name}</h3>
                    <span className="bg-red-600/20 text-red-300 px-2 py-1 rounded-lg text-xs font-medium">
                      {table.rowCount} rows
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">{table.description}</p>
                  <div className="text-xs text-gray-400">
                    Columns: {table.columns.slice(0, 4).join(', ')}...
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Database Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10"
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <ServerIcon className="w-6 h-6 mr-3 text-red-400" />
            Database Configuration & Performance
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h3 className="text-lg font-bold text-red-400 mb-3">Performance</h3>
              <div className="space-y-2">
                <div className="text-gray-300">Monthly Queries: <span className="text-white font-medium">{databaseStats.monthlyQueries}</span></div>
                <div className="text-gray-300">Storage Size: <span className="text-white font-medium">{databaseStats.storageSize}</span></div>
                <div className="text-gray-300">Estimated Rows: <span className="text-white font-medium">{databaseStats.estimatedRows}</span></div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-red-400 mb-3">Backup & Recovery</h3>
              <div className="space-y-2">
                <div className="text-gray-300">Backup Frequency: <span className="text-white font-medium">{databaseStats.backupFrequency}</span></div>
                <div className="text-gray-300">Point-in-time Recovery: <span className="text-red-400 font-medium">Enabled</span></div>
                <div className="text-gray-300">Retention Period: <span className="text-white font-medium">30 days</span></div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-gray-400 mb-3">Security</h3>
              <div className="space-y-2">
                <div className="text-gray-300">Encryption: <span className="text-gray-400 font-medium">AES-256</span></div>
                <div className="text-gray-300">Row Level Security: <span className="text-gray-400 font-medium">Enabled</span></div>
                <div className="text-gray-300">SSL/TLS: <span className="text-gray-400 font-medium">Required</span></div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-red-400 mb-3">Scaling</h3>
              <div className="space-y-2">
                <div className="text-gray-300">Replication: <span className="text-red-400 font-medium">Multi-region</span></div>
                <div className="text-gray-300">Auto-scaling: <span className="text-red-400 font-medium">Enabled</span></div>
                <div className="text-gray-300">Connection Pooling: <span className="text-red-400 font-medium">PgBouncer</span></div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
