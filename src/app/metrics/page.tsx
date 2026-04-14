'use client'

import { motion } from 'framer-motion'
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  EyeIcon,
  HeartIcon
} from '@heroicons/react/24/outline'
import ExpenseDashboard from '@/components/ExpenseDashboard'

export default function MetricsPage() {
  const kpis = [
    { label: "Monthly Active Users", value: "50K+", change: "+125%", trend: "up" },
    { label: "Monthly Recurring Revenue", value: "$2.1M", change: "+89%", trend: "up" },
    { label: "Avg Revenue Per User", value: "$42", change: "+34%", trend: "up" },
    { label: "Customer Lifetime Value", value: "$680", change: "+67%", trend: "up" },
    { label: "Churn Rate", value: "2.8%", change: "-45%", trend: "down" },
    { label: "Content Generation", value: "1M+/day", change: "+200%", trend: "up" }
  ]

  const platformMetrics = [
    { platform: "OnlyFans", users: "12K", revenue: "$680K", growth: "+156%" },
    { platform: "Instagram", users: "25K", revenue: "$420K", growth: "+89%" },
    { platform: "TikTok", users: "30K", revenue: "$380K", growth: "+234%" },
    { platform: "X.com", users: "8K", revenue: "$290K", growth: "+78%" },
    { platform: "Facebook", users: "15K", revenue: "$340K", growth: "+112%" }
  ]

  const affiliateMetrics = [
    { category: "ED Solutions", conversions: "8.2K", revenue: "$890K", commission: "$356K" },
    { category: "Hair Loss", conversions: "5.6K", revenue: "$620K", commission: "$279K" },
    { category: "Sleep Aid", conversions: "12.1K", revenue: "$540K", commission: "$189K" },
    { category: "Supplements", conversions: "9.8K", revenue: "$720K", commission: "$288K" }
  ]

  const userDemographics = [
    { segment: "Males 18-25", percentage: "35%", spending: "$38/mo" },
    { segment: "Males 26-35", percentage: "42%", spending: "$52/mo" },
    { segment: "Males 36-45", percentage: "18%", spending: "$67/mo" },
    { segment: "Males 46+", percentage: "5%", spending: "$89/mo" }
  ]

  const contentMetrics = [
    { type: "Photos Generated", daily: "2.5M", quality: "98.7%" },
    { type: "Videos Created", daily: "180K", quality: "97.2%" },
    { type: "Conversations", daily: "45K hours", satisfaction: "94.1%" },
    { type: "Social Posts", daily: "12K", engagement: "15.8%" }
  ]

  return (
    <div className="min-h-screen bg-transparent">
      {/* Hero Section */}
      <section className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-7xl font-bold uppercase tracking-wide font-[family-name:var(--font-brand)] bg-gradient-to-r from-white via-gray-300 to-red-400 bg-clip-text text-transparent mb-6">
              METRICS DASHBOARD
            </h1>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Real-Time Performance Analytics
            </h2>
            <p className="text-xl text-gray-300 mb-12 max-w-4xl mx-auto">
              Track our explosive growth across all key performance indicators. 
              Real-time data for investors and stakeholders.
            </p>
            
            <div className="bg-white/5 p-6 rounded-2xl shadow-lg inline-block mb-8">
              <div className="text-3xl font-bold text-gray-300">$12.5M ARR</div>
              <div className="text-gray-400">Current Annual Run Rate</div>
              <div className="text-gray-300 font-medium">+147% YoY Growth</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Key Performance Indicators */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">Key Performance Indicators</h2>
            <p className="text-xl text-gray-400">Critical metrics driving our success</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {kpis.map((kpi, index) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gradient-to-br from-white/5 to-transparent p-8 rounded-2xl shadow-lg border border-white/10"
              >
                <div className="flex items-center justify-between mb-4">
                  <ChartBarIcon className="h-8 w-8 text-red-400" />
                  <div className={`flex items-center ${
                    kpi.trend === 'up' ? 'text-gray-300' : 'text-red-600'
                  }`}>
                    <ArrowTrendingUpIcon className={`h-5 w-5 mr-1 ${
                      kpi.trend === 'down' ? 'transform rotate-180' : ''
                    }`} />
                    <span className="font-semibold">{kpi.change}</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">{kpi.value}</div>
                <div className="text-gray-400">{kpi.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Performance */}
      <section className="py-16 bg-gradient-to-r from-white/10 to-red-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">Platform Performance</h2>
            <p className="text-xl text-gray-400">Revenue and user metrics across all social platforms</p>
          </motion.div>

          <div className="overflow-x-auto bg-white/5 rounded-2xl shadow-lg">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-red-600 to-red-700 text-white">
                <tr>
                  <th className="px-6 py-4 text-left">Platform</th>
                  <th className="px-6 py-4 text-left">Active Users</th>
                  <th className="px-6 py-4 text-left">Monthly Revenue</th>
                  <th className="px-6 py-4 text-left">Growth Rate</th>
                </tr>
              </thead>
              <tbody>
                {platformMetrics.map((platform, index) => (
                  <tr key={platform.platform} className={index % 2 === 0 ? 'bg-transparent' : 'bg-white/5'}>
                    <td className="px-6 py-4 font-semibold text-white">{platform.platform}</td>
                    <td className="px-6 py-4 text-red-400 font-medium">{platform.users}</td>
                    <td className="px-6 py-4 text-gray-300 font-bold">{platform.revenue}</td>
                    <td className="px-6 py-4 text-red-500 font-medium">{platform.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Affiliate Revenue */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">Affiliate Marketing Performance</h2>
            <p className="text-xl text-gray-400">Health supplement affiliate revenue breakdown</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {affiliateMetrics.map((category, index) => (
              <motion.div
                key={category.category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gradient-to-br from-white/5 to-transparent p-8 rounded-2xl shadow-lg border border-white/10"
              >
                <h3 className="text-2xl font-bold text-white mb-6">{category.category}</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Conversions:</span>
                    <span className="font-bold text-red-400">{category.conversions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Revenue:</span>
                    <span className="font-bold text-gray-300">{category.revenue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Commission Earned:</span>
                    <span className="font-bold text-red-500">{category.commission}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="bg-gradient-to-r from-white/10 to-white/5 inline-block px-8 py-4 rounded-2xl">
              <div className="text-2xl font-bold text-white">$1.1M Total Commission</div>
              <div className="text-green-100">Monthly Affiliate Revenue</div>
            </div>
          </div>
        </div>
      </section>

      {/* User Demographics */}
      <section className="py-16 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">User Demographics</h2>
            <p className="text-xl text-gray-400">Detailed breakdown of our user base and spending patterns</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {userDemographics.map((demo, index) => (
              <motion.div
                key={demo.segment}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white/5 p-8 rounded-2xl shadow-lg text-center"
              >
                <UserGroupIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">{demo.segment}</h3>
                <div className="text-3xl font-bold text-red-500 mb-2">{demo.percentage}</div>
                <div className="text-gray-400">of user base</div>
                <div className="mt-4 text-2xl font-semibold text-gray-300">{demo.spending}</div>
                <div className="text-sm text-gray-500">Avg monthly spend</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Content Generation Metrics */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">Content Generation</h2>
            <p className="text-xl text-gray-400">AI-powered content creation at scale</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {contentMetrics.map((metric, index) => (
              <motion.div
                key={metric.type}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gradient-to-br from-white/5 to-transparent p-8 rounded-2xl shadow-lg border border-white/10"
              >
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-400 mb-2">{metric.daily}</div>
                  <div className="text-lg font-semibold text-white mb-4">{metric.type}</div>
                  <div className="text-2xl font-bold text-gray-300">
                    {metric.quality || metric.satisfaction || metric.engagement}
                  </div>
                  <div className="text-sm text-gray-500">
                    {metric.quality ? 'Quality Score' : 
                     metric.satisfaction ? 'Satisfaction' : 'Avg Engagement'}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Real-time Stats */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">Real-Time Statistics</h2>
            <p className="text-xl text-gray-300">Live metrics updating every second</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <EyeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="text-4xl font-bold text-gray-400 mb-2">2.8M</div>
              <div className="text-gray-300">Daily Views</div>
            </div>
            <div className="text-center">
              <HeartIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <div className="text-4xl font-bold text-red-400 mb-2">156K</div>
              <div className="text-gray-300">Daily Interactions</div>
            </div>
            <div className="text-center">
              <CurrencyDollarIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <div className="text-4xl font-bold text-red-400 mb-2">$42K</div>
              <div className="text-gray-300">Daily Revenue</div>
            </div>
            <div className="text-center">
              <UserGroupIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <div className="text-4xl font-bold text-red-400 mb-2">1.2K</div>
              <div className="text-gray-300">New Users Today</div>
            </div>
          </div>

          <div className="mt-16 text-center">
            <div className="bg-gradient-to-r from-white/50 to-transparent0 inline-block px-8 py-4 rounded-2xl">
              <div className="text-2xl font-bold text-white">Refreshed Every 30 Seconds</div>
              <div className="text-green-100">Live Data Feed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Financial Projections */}
      <section className="py-16 bg-gradient-to-r from-white via-gray-300 to-red-400">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-wide font-[family-name:var(--font-brand)] text-white mb-6">
              Exponential Growth Trajectory
            </h2>
            <p className="text-xl text-white mb-12 opacity-90">
              Based on current metrics, we&apos;re projecting massive scale within 18 months
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="bg-white/10 p-6 rounded-2xl">
                <div className="text-4xl font-bold text-white mb-2">$50M</div>
                <div className="text-white">12-Month ARR Target</div>
              </div>
              <div className="bg-white/10 p-6 rounded-2xl">
                <div className="text-4xl font-bold text-white mb-2">500K</div>
                <div className="text-white">User Base Target</div>
              </div>
              <div className="bg-white/10 p-6 rounded-2xl">
                <div className="text-4xl font-bold text-white mb-2">$1B</div>
                <div className="text-white">18-Month Valuation</div>
              </div>
            </div>
            
            <button className="bg-red-600 text-white px-8 py-4 rounded-full text-xl font-semibold hover:scale-105 transition-transform shadow-lg">
              Download Full Metrics Report 📊
            </button>
          </motion.div>
        </div>
      </section>

      {/* Financial Dashboard */}
      <section className="py-16 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ExpenseDashboard />
        </div>
      </section>
    </div>
  )
} 