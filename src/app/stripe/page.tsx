'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  CreditCardIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  ChartBarIcon,
  CogIcon,
  UserGroupIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

export default function StripePage() {
  const stripeFeatures = [
    {
      icon: CreditCardIcon,
      title: 'Payment Processing',
      description: 'Accept credit cards, debit cards, and digital wallets worldwide',
      cost: '2.9% + 30¢ per transaction',
      priority: 'critical'
    },
    {
      icon: UserGroupIcon,
      title: 'Subscription Management',
      description: 'Recurring billing for NPGX character subscriptions and premium features',
      cost: '0.5% additional fee',
      priority: 'high'
    },
    {
      icon: GlobeAltIcon,
      title: 'Global Payments',
      description: 'Accept payments in 135+ currencies from customers worldwide',
      cost: '1% additional for international cards',
      priority: 'high'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Fraud Protection',
      description: 'Advanced fraud detection and chargeback protection',
      cost: '$15/month + 0.4% per protected payment',
      priority: 'critical'
    },
    {
      icon: BanknotesIcon,
      title: 'Instant Payouts',
      description: 'Get paid instantly instead of waiting 2-7 business days',
      cost: '1.5% fee for instant transfers',
      priority: 'medium'
    },
    {
      icon: ChartBarIcon,
      title: 'Analytics & Reporting',
      description: 'Detailed revenue analytics and financial reporting',
      cost: 'Free with Stripe Dashboard',
      priority: 'medium'
    }
  ]

  const implementationSteps = [
    {
      phase: 'Phase 1: Basic Setup',
      duration: '1-2 weeks',
      cost: '$0 (development time)',
      tasks: [
        'Create Stripe account and get API keys',
        'Install Stripe SDK in Next.js application',
        'Set up basic payment processing for one-time purchases',
        'Implement webhook handling for payment confirmations',
        'Test with Stripe test cards and sandbox environment'
      ]
    },
    {
      phase: 'Phase 2: Subscription System',
      duration: '2-3 weeks',
      cost: '$0 (development time)',
      tasks: [
        'Set up Stripe Products and Pricing plans',
        'Implement subscription creation and management',
        'Build customer portal for subscription management',
        'Handle subscription lifecycle (upgrades, downgrades, cancellations)',
        'Integrate with user authentication system'
      ]
    },
    {
      phase: 'Phase 3: Advanced Features',
      duration: '1-2 weeks',
      cost: '$0 (development time)',
      tasks: [
        'Implement usage-based billing for AI generation credits',
        'Set up marketplace payments for creator revenue sharing',
        'Add multi-party payments for affiliate commissions',
        'Implement tax calculation and compliance',
        'Set up automated invoicing and receipts'
      ]
    }
  ]

  const pricingTiers = [
    {
      name: 'Free Tier',
      price: '$0/month',
      features: [
        'Browse NPGX characters',
        'Basic chat functionality',
        '5 AI generations per month',
        'Standard support'
      ],
      stripeProduct: 'free_tier'
    },
    {
      name: 'Premium',
      price: '$29/month',
      features: [
        'Unlimited AI generations',
        'Premium NPGX characters',
        'Video content access',
        'Priority support',
        'Custom personalities'
      ],
      stripeProduct: 'premium_monthly'
    },
    {
      name: 'Creator Pro',
      price: '$99/month',
      features: [
        'Everything in Premium',
        'Create and monetize NPGX characters',
        'Revenue sharing (70/30 split)',
        'Advanced analytics',
        'API access',
        'White-label options'
      ],
      stripeProduct: 'creator_pro_monthly'
    },
    {
      name: 'Enterprise',
      price: '$499/month',
      features: [
        'Everything in Creator Pro',
        'Unlimited NPGX characters',
        'Custom branding',
        'Dedicated support',
        'Custom integrations',
        'Revenue sharing (80/20 split)'
      ],
      stripeProduct: 'enterprise_monthly'
    }
  ]

  const monthlyProjections = {
    transactions: 10000,
    averageTransaction: 35,
    monthlyRevenue: 350000,
    stripeProcessingFees: 10500, // 2.9% + 30¢ per transaction
    subscriptionFees: 1750, // 0.5% of subscription revenue
    fraudProtectionFees: 1415, // $15 + 0.4% of protected payments
    totalStripeFees: 13665,
    netRevenue: 336335
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'from-red-500 to-red-600'
      case 'high': return 'from-red-600 to-yellow-500'
      case 'medium': return 'from-red-600 to-red-700'
      default: return 'from-gray-500 to-slate-500'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return ExclamationTriangleIcon
      case 'high': return InformationCircleIcon
      default: return CheckCircleIcon
    }
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
            <CreditCardIcon className="w-10 h-10 text-gray-400" />
            <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-wide font-[family-name:var(--font-brand)] bg-gradient-to-r from-blue-400 via-gray-300 to-green-400 bg-clip-text text-transparent">
              STRIPE INTEGRATION
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto mb-8">
            Complete payment processing solution for the NPGX platform - subscriptions, one-time payments, and creator revenue sharing
          </p>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <a 
              href="https://stripe.com/docs" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
            >
              Stripe Documentation
            </a>
            <Link 
              href="/joe"
              className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
            >
              Joe's Command Center
            </Link>
            <Link 
              href="/expenses"
              className="bg-gradient-to-r from-white/10 to-white/5 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
            >
              Budget Tracking
            </Link>
          </div>
        </motion.div>

        {/* Monthly Cost Projection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 mb-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <ArrowTrendingUpIcon className="w-6 h-6 mr-3 text-red-400" />
            Monthly Cost Projections
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-red-600/10 rounded-xl p-6 border border-white/10">
              <div className="text-2xl font-bold text-gray-400">{monthlyProjections.transactions.toLocaleString()}</div>
              <div className="text-gray-300">Monthly Transactions</div>
            </div>
            <div className="bg-red-600/10 rounded-xl p-6 border border-red-500/20">
              <div className="text-2xl font-bold text-red-400">${monthlyProjections.monthlyRevenue.toLocaleString()}</div>
              <div className="text-gray-300">Monthly Revenue</div>
            </div>
            <div className="bg-red-600/10 rounded-xl p-6 border border-red-500/20">
              <div className="text-2xl font-bold text-red-400">${monthlyProjections.totalStripeFees.toLocaleString()}</div>
              <div className="text-gray-300">Total Stripe Fees</div>
            </div>
            <div className="bg-red-500/10 rounded-xl p-6 border border-red-500/20">
              <div className="text-2xl font-bold text-red-400">${monthlyProjections.netRevenue.toLocaleString()}</div>
              <div className="text-gray-300">Net Revenue</div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-red-600/10 rounded-xl border border-yellow-500/20">
            <div className="text-gray-400 font-bold mb-2">Cost Breakdown:</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-gray-300">Processing Fees: <span className="text-white font-medium">${monthlyProjections.stripeProcessingFees.toLocaleString()}</span></div>
              <div className="text-gray-300">Subscription Fees: <span className="text-white font-medium">${monthlyProjections.subscriptionFees.toLocaleString()}</span></div>
              <div className="text-gray-300">Fraud Protection: <span className="text-white font-medium">${monthlyProjections.fraudProtectionFees.toLocaleString()}</span></div>
            </div>
          </div>
        </motion.div>

        {/* Stripe Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
            <CogIcon className="w-8 h-8 mr-3 text-white 400" />
            Required Stripe Features
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {stripeFeatures.map((feature, index) => {
              const PriorityIcon = getPriorityIcon(feature.priority)
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + 0.1 * index }}
                  className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-gray-300/30 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <feature.icon className="w-6 h-6 text-white 400" />
                      <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getPriorityColor(feature.priority)}`}>
                      <PriorityIcon className="w-3 h-3 inline mr-1" />
                      {feature.priority.toUpperCase()}
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-4">{feature.description}</p>
                  
                  <div className="bg-red-600/10 rounded-lg p-3 border border-red-500/20">
                    <div className="text-red-400 font-bold text-sm">COST: {feature.cost}</div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Implementation Roadmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
            <ChartBarIcon className="w-8 h-8 mr-3 text-red-400" />
            Implementation Roadmap
          </h2>
          
          <div className="space-y-6">
            {implementationSteps.map((phase, index) => (
              <motion.div
                key={phase.phase}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + 0.1 * index }}
                className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-red-400">{phase.phase}</h3>
                  <div className="flex items-center space-x-4">
                    <span className="bg-red-600/20 text-gray-400 px-3 py-1 rounded-full text-sm font-medium">
                      {phase.duration}
                    </span>
                    <span className="bg-red-600/20 text-red-300 px-3 py-1 rounded-full text-sm font-medium">
                      {phase.cost}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {phase.tasks.map((task, taskIndex) => (
                    <div key={taskIndex} className="flex items-start space-x-3">
                      <CheckCircleIcon className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{task}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Pricing Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
            <CurrencyDollarIcon className="w-8 h-8 mr-3 text-gray-400" />
            Subscription Pricing Tiers
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingTiers.map((tier, index) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + 0.1 * index }}
                className={`bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-yellow-400/30 transition-all duration-300 ${
                  tier.name === 'Premium' ? 'ring-2 ring-yellow-400/50' : ''
                }`}
              >
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-400 mb-2">{tier.name}</h3>
                  <div className="text-3xl font-bold text-white mb-2">{tier.price}</div>
                  <div className="text-gray-400 text-sm">Stripe Product: {tier.stripeProduct}</div>
                </div>
                
                <div className="space-y-3">
                  {tier.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start space-x-2">
                      <CheckCircleIcon className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Technical Requirements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10"
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <CogIcon className="w-6 h-6 mr-3 text-red-400" />
            Technical Implementation Notes
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-red-400 mb-4">Development Requirements</h3>
              <div className="space-y-2">
                <div className="text-gray-300">• Next.js 14+ with App Router</div>
                <div className="text-gray-300">• Stripe SDK (@stripe/stripe-js)</div>
                <div className="text-gray-300">• Webhook endpoint for events</div>
                <div className="text-gray-300">• Database integration (Supabase)</div>
                <div className="text-gray-300">• User authentication system</div>
                <div className="text-gray-300">• Error handling and logging</div>
                <div className="text-gray-300">• PCI compliance considerations</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-gray-400 mb-4">Key Integrations</h3>
              <div className="space-y-2">
                <div className="text-gray-300">• Customer Portal for self-service</div>
                <div className="text-gray-300">• Subscription lifecycle management</div>
                <div className="text-gray-300">• Usage-based billing for AI credits</div>
                <div className="text-gray-300">• Multi-party payments for creators</div>
                <div className="text-gray-300">• Tax calculation (Stripe Tax)</div>
                <div className="text-gray-300">• Invoice generation and receipts</div>
                <div className="text-gray-300">• Analytics and reporting dashboard</div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
            <div className="text-red-400 font-bold mb-2">⚠️ Important Considerations:</div>
            <div className="text-gray-300 text-sm">
              • Adult content may require additional compliance measures<br/>
              • Some payment processors have restrictions on adult content<br/>
              • Consider alternative payment methods for international users<br/>
              • Implement strong fraud detection for high-risk transactions<br/>
              • Ensure GDPR compliance for European customers
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
