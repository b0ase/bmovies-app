'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  FaRocket,
  FaPhone,
  FaCheck,
  FaCoins,
  FaCamera,
  FaRobot,
  FaGlobe,
  FaChartLine,
  FaHandshake,
  FaStar,
  FaExclamationTriangle,
  FaCreditCard,
  FaCut,
  FaHeadset,
  FaFire,
  FaShieldAlt
} from 'react-icons/fa'

// The deal: buy the phone, run your business
const WHATS_INCLUDED = [
  { label: 'NPGX Android phone', desc: 'Pre-loaded with OpenClaw, personality installed, ready to earn', icon: FaPhone },
  { label: '$401 identity inscription', desc: 'She exists on Bitcoin — provably yours, immutable', icon: FaStar },
  { label: 'Gmail + social accounts', desc: 'Instagram, TikTok, Twitter, OnlyFans — set up and ready', icon: FaGlobe },
  { label: 'OpenClaw AI agent', desc: 'Auto-reply, autonomous posting, content generation', icon: FaRobot },
  { label: 'Content creation tools', desc: 'Image gen, video creation, CapCut editing, prompt engine', icon: FaCamera },
  { label: 'HandCash wallet', desc: 'Revenue wallet + character token deployed', icon: FaCoins },
  { label: 'ClawWork mining', desc: 'Phone earns stablecoins on the side — helps cover API costs', icon: FaHandshake },
  { label: 'Onboarding + support', desc: 'Telegram group, checklist, founder-managed launch', icon: FaHeadset },
]

// API credit top-ups
const TOPUP = {
  description: 'Your girl runs on API credits — image gen, video, chat, auto-reply. We manage all the keys under the hood. You just top up via credit card when she needs more fuel.',
  tiers: [
    { amount: '$50', credits: '~$40 in credits', note: 'Quick boost' },
    { amount: '$100', credits: '~$85 in credits', note: 'Best value' },
    { amount: '$250', credits: '~$220 in credits', note: 'Power user' },
  ],
}

export default function LaunchpadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950/20 to-black py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <FaRocket className="w-8 h-8 text-red-500" />
            <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-wide font-[family-name:var(--font-brand)] bg-gradient-to-r from-red-500 via-red-400 to-yellow-500 bg-clip-text text-transparent">
              NPGX LAUNCHPAD
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-4">
            Buy the phone. Run your AI girlfriend. Keep the profit.
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-6">
            $402 gets you a fully loaded NPGX phone with an AI girl ready to earn.
            You pay for your API credits. You keep everything you make.
          </p>
          <div className="inline-flex items-center gap-2 bg-red-950/50 border border-red-500/20 rounded-lg px-4 py-2 text-sm text-red-400">
            <FaExclamationTriangle className="w-4 h-4" />
            <span>26 characters. Limited units. Every launch is personally supported by the founder.</span>
          </div>
        </motion.div>

        {/* The Deal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-3xl mx-auto mb-16"
        >
          <div className="relative rounded-2xl p-10 border border-red-500/30 bg-red-500/5 shadow-2xl shadow-red-950/30">
            {/* Price header */}
            <div className="text-center mb-10">
              <div className="text-7xl sm:text-8xl font-black text-white mb-2 font-[family-name:var(--font-brand)]">
                $402
              </div>
              <div className="text-xl text-gray-400 font-bold">one-time purchase</div>
              <p className="text-gray-500 mt-3 text-sm">Buy the phone. She&apos;s yours. Start earning.</p>
            </div>

            {/* What you get */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              {WHATS_INCLUDED.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.05 }}
                  className="flex items-start gap-3 bg-black/30 rounded-lg p-3"
                >
                  <item.icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                  <div>
                    <div className="text-sm font-bold text-white">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <button className="w-full py-4 bg-red-600 hover:bg-red-700 text-white text-xl font-black rounded-xl transition-all uppercase tracking-wider">
              Get Your Phone
            </button>
            <p className="text-center text-xs text-gray-600 mt-3">One-time purchase. You own the phone. You keep the profit.</p>
          </div>
        </motion.div>

        {/* The Deal Explained */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="max-w-3xl mx-auto mb-16"
        >
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
            <div className="flex items-center gap-3 mb-6">
              <FaShieldAlt className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-black font-[family-name:var(--font-brand)] uppercase text-white">
                The Deal
              </h2>
            </div>
            <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
              <p>
                <span className="text-white font-bold">You buy the phone for $402.</span> It comes pre-loaded with your AI girlfriend &mdash;
                identity inscribed on Bitcoin, socials created, OpenClaw installed, personality configured. She&apos;s ready to post, chat, and earn.
              </p>
              <p>
                <span className="text-white font-bold">You pay for API credits.</span> Image generation, video creation, chat responses &mdash;
                all of it runs on API credits. We manage the keys under the hood. You just top up via credit card whenever she needs more fuel.
                No messing around with API dashboards or provider accounts.
              </p>
              <p>
                <span className="text-white font-bold">You keep the profit.</span> OnlyFans subs, fan tips, Patreon, token sales, brand deals &mdash;
                everything she earns is yours. We don&apos;t take a cut of your revenue. Your girl, your hustle, your money.
              </p>
              <p>
                <span className="text-white font-bold">We provide support + brand deals.</span> Telegram group, onboarding checklist,
                and when you build real reach we connect you with brand partners paying for AI influencer campaigns.
                Health supplements, dating apps, men&apos;s lifestyle &mdash; real deals, real money.
              </p>
              <p className="text-yellow-400/80">
                <span className="font-bold">Rolling monthly contract.</span> Stay active. Post content. Grow your audience.
                If you stop performing, you lose access to the network, brand deals, and support.
                The phone is still yours &mdash; but the NPGX network isn&apos;t.
              </p>
            </div>
          </div>
        </motion.div>

        {/* API Credit Top-ups */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-3xl mx-auto mb-16"
        >
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <FaCreditCard className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-black font-[family-name:var(--font-brand)] uppercase text-white">
                API Credits
              </h2>
            </div>
            <p className="text-sm text-gray-400 mb-6">{TOPUP.description}</p>
            <div className="grid grid-cols-3 gap-4">
              {TOPUP.tiers.map((tier) => (
                <div key={tier.amount} className="bg-black/30 rounded-lg p-4 text-center border border-white/5 hover:border-red-500/20 transition-colors">
                  <div className="text-2xl font-black text-white mb-1">{tier.amount}</div>
                  <div className="text-xs text-red-400 font-bold mb-1">{tier.credits}</div>
                  <div className="text-[10px] text-gray-600">{tier.note}</div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 mt-4 text-center">
              We manage all API keys. You never touch them. Just pay and your girl gets more fuel.
            </p>
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/5 rounded-2xl p-8 border border-white/10 mb-16"
        >
          <h2 className="text-2xl font-black font-[family-name:var(--font-brand)] uppercase text-white mb-6 text-center">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-5xl font-black text-red-500/20 mb-3 font-[family-name:var(--font-brand)]">01</div>
              <h3 className="text-lg font-bold text-white mb-3">Buy the phone</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                $402. We source the Android, inscribe her $401 identity on Bitcoin,
                install OpenClaw, create her Gmail, load her personality. She arrives ready to go.
              </p>
            </div>
            <div>
              <div className="text-5xl font-black text-yellow-500/20 mb-3 font-[family-name:var(--font-brand)]">02</div>
              <h3 className="text-lg font-bold text-white mb-3">Hustle the audience</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Set up Instagram, TikTok, Twitter, OnlyFans &mdash; whatever platforms you want.
                She creates the content autonomously. You do the marketing. Top up API credits as needed.
              </p>
            </div>
            <div>
              <div className="text-5xl font-black text-amber-400/20 mb-3 font-[family-name:var(--font-brand)]">03</div>
              <h3 className="text-lg font-bold text-white mb-3">Keep the profit</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Subscriptions, tips, token sales, brand deals &mdash; it&apos;s all yours.
                When you build reach, we match you with brand partners.
                Your girl earns. You keep everything.
              </p>
            </div>
          </div>

          {/* Revenue streams */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black/30 rounded-lg p-5 space-y-3">
              <div className="text-xs text-gray-500 uppercase mb-3 tracking-widest">Your costs</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-500">NPGX Phone (one-time)</span>
                  <span className="text-white font-bold">$402</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-500">API credits (ongoing)</span>
                  <span className="text-white font-bold">Pay as you go</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-gray-500">Monthly subscription</span>
                  <span className="text-green-400 font-bold">$0</span>
                </div>
              </div>
            </div>
            <div className="bg-black/30 rounded-lg p-5 space-y-3">
              <div className="text-xs text-gray-500 uppercase mb-3 tracking-widest">Your revenue streams</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-500">Content subscriptions</span>
                  <span className="text-green-400 font-bold">OnlyFans, Fansly, Patreon</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-500">Fan tips + DMs</span>
                  <span className="text-green-400 font-bold">Telegram, socials</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-500">Character token sales</span>
                  <span className="text-green-400 font-bold">Your $TOKEN</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-500">Brand deals</span>
                  <span className="text-green-400 font-bold">We match you</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-gray-500">ClawWork mining</span>
                  <span className="text-green-400 font-bold">Passive stablecoin</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* The Stack */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-black font-[family-name:var(--font-brand)] uppercase text-white mb-8 text-center">
            What&apos;s On The Phone
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: FaPhone, title: 'Sovereign Device', description: 'Android phone with OpenClaw installed. Logged into Gmail, socials, wallet. Runs 24/7, generates content, earns revenue autonomously.' },
              { icon: FaStar, title: '$401 Identity', description: 'Root inscription proves she exists on Bitcoin. Each social account inscribed as a strand. Immutable proof of ownership.' },
              { icon: FaGlobe, title: 'Social Properties', description: 'Gmail + socials created under her identity. Each one a $401 digital property. More platforms = more reach = more revenue.' },
              { icon: FaRobot, title: 'OpenClaw AI', description: 'She talks to fans, generates content, posts autonomously. Telegram, WhatsApp, auto-reply — all from the phone.' },
              { icon: FaCamera, title: 'Content Engine', description: 'Image gen, video creation, CapCut editing — all configured. API credits fuel the machine. She creates while you sleep.' },
              { icon: FaCoins, title: 'Token + Wallet', description: 'HandCash wallet for revenue. Character token deployed. Holders earn proportional revenue from content sales.' },
              { icon: FaFire, title: 'ClawWork', description: 'The phone earns stablecoins by doing AI work on the network. She literally helps pay for her own API credits.' },
              { icon: FaChartLine, title: 'Dashboard', description: 'Track earnings, content performance, API burn rate, and token holders. Know exactly what she\'s generating.' },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-red-500/20 transition-colors"
              >
                <feature.icon className="w-8 h-8 text-red-400 mb-3" />
                <h3 className="text-sm font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="text-center bg-gradient-to-r from-red-600/10 to-yellow-600/10 rounded-2xl p-12 border border-red-500/20"
        >
          <h2 className="text-3xl font-black font-[family-name:var(--font-brand)] uppercase text-white mb-4">
            Ready to Launch?
          </h2>
          <p className="text-gray-400 mb-3 max-w-xl mx-auto">
            $402. One phone. One AI girl. Unlimited hustle.
          </p>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto text-sm">
            26 characters. Limited units. Rolling monthly contract &mdash; stay active or lose your spot.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg text-lg font-bold transition-colors">
              Get Your Phone
            </button>
            <Link
              href="/token"
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg text-lg font-bold transition-colors border border-white/10"
            >
              Learn About $NPGX
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
