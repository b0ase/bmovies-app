'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  PlayIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  BoltIcon,
  CameraIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'
import { Ticker } from '@/components/Ticker'

// Dynamic imports — heavy components that don't need to block initial render
const HeroSection = dynamic(() => import('@/components/HeroSection').then(m => m.HeroSection), {
  ssr: false,
  loading: () => <div className="h-screen bg-black" />,
})
const NinjaPunkGirlsGallery = dynamic(() => import('@/components/NinjaPunkGirlsGallery').then(m => m.NinjaPunkGirlsGallery), { ssr: false })

export default function HomeClient() {
  const features = [
    {
      icon: <CameraIcon className="h-6 w-6 sm:h-8 sm:w-8" />,
      title: "Radical Character Creation",
      description: "Craft ultra-realistic Ninja Punk Girls with tattoos, piercings, and insane personalities"
    },
    {
      icon: <PlayIcon className="h-6 w-6 sm:h-8 sm:w-8" />,
      title: "Badass Video Content",
      description: "Create stunning 4K videos of rebellious content that breaks the algorithm"
    },
    {
      icon: <CurrencyDollarIcon className="h-6 w-6 sm:h-8 sm:w-8" />,
      title: "Underground Revenue",
      description: "Monetize through alternative channels, subscriptions, and rebellious affiliate marketing"
    },
    {
      icon: <GlobeAltIcon className="h-6 w-6 sm:h-8 sm:w-8" />,
      title: "Platform Infiltration",
      description: "Deploy across OnlyFans, Instagram, TikTok, and X.com with edgy content strategy"
    },
    {
      icon: <ChartBarIcon className="h-6 w-6 sm:h-8 sm:w-8" />,
      title: "Rebellion Analytics",
      description: "Track your underground empire's performance across all platforms"
    },
    {
      icon: <BoltIcon className="h-6 w-6 sm:h-8 sm:w-8" />,
      title: "NPG Token Economy",
      description: "Participate in our revolutionary underground token-based ecosystem"
    }
  ]

  const socialPlatforms = [
    { name: "OnlyFans", color: "bg-red-600", users: "200M+" },
    { name: "Instagram", color: "bg-red-600", users: "2B+" },
    { name: "TikTok", color: "bg-black", users: "1B+" },
    { name: "X.com", color: "bg-gray-900", users: "450M+" },
    { name: "Facebook", color: "bg-blue-800", users: "3B+" }
  ]

  const revenueStreams = [
    { name: "Underground Advertising", potential: "$75K+/month" },
    { name: "Rebel Subscriptions", potential: "$150K+/month" },
    { name: "Punk Affiliate Marketing", potential: "$40K+/month" },
    { name: "Edgy Merchandise", potential: "$50K+/month" },
    { name: "NPG Token Appreciation", potential: "Unlimited" }
  ]

  return (
    <div className="min-h-screen">
      {/* Live ticker — $NPGX index + 26 girl tokens */}
      <Ticker />

      {/* Hero — headline, content filmstrips, videos all in one */}
      <HeroSection />

      {/* Featured Music Video */}
      <section className="py-12 sm:py-20 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl sm:text-4xl font-black text-white mb-2 tracking-tight" style={{ fontFamily: 'var(--font-brand)' }}>
              MUSIC VIDEOS
            </h2>
            <p className="text-gray-500">Beat-synced generative videos — every play is unique</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/watch/razor-kisses">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="group border border-white/10 bg-white/5 hover:border-red-500/50 transition-all overflow-hidden"
              >
                <div className="aspect-video relative overflow-hidden">
                  <img src="/og/razor-kisses.png" alt="Razor Kisses" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <svg viewBox="0 0 40 46" className="w-12 h-14 drop-shadow-[0_0_20px_rgba(220,20,60,0.6)]">
                      <polygon points="4,0 40,23 4,46" fill="#dc2626" />
                    </svg>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 text-[10px] font-[family-name:var(--font-brand)] text-white/60">67 clips</div>
                </div>
                <div className="p-3">
                  <div className="font-[family-name:var(--font-brand)] text-white text-sm tracking-wider group-hover:text-red-400 transition-colors">Razor Kisses</div>
                  <div className="text-white/30 text-[10px] mt-1">Pop Punk • 160 BPM • Tokyo Gutter Punk</div>
                </div>
              </motion.div>
            </Link>

            <Link href="/watch/tokyo-gutter-queen">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="group border border-white/10 bg-white/5 hover:border-red-500/50 transition-all overflow-hidden"
              >
                <div className="aspect-video relative overflow-hidden">
                  <img src="/og/tokyo-gutter-queen.png" alt="Tokyo Gutter Queen" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <svg viewBox="0 0 40 46" className="w-12 h-14 drop-shadow-[0_0_20px_rgba(220,20,60,0.6)]">
                      <polygon points="4,0 40,23 4,46" fill="#dc2626" />
                    </svg>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 text-[10px] font-[family-name:var(--font-brand)] text-white/60">53 clips</div>
                </div>
                <div className="p-3">
                  <div className="font-[family-name:var(--font-brand)] text-white text-sm tracking-wider group-hover:text-red-400 transition-colors">Tokyo Gutter Queen</div>
                  <div className="text-white/30 text-[10px] mt-1">Hardcore Punk • 180 BPM • Tokyo Gutter Punk</div>
                </div>
              </motion.div>
            </Link>
          </div>

          <div className="text-center mt-6">
            <Link href="/watch" className="text-white/30 hover:text-red-400 text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider transition-colors">
              View all music videos →
            </Link>
          </div>
        </div>
      </section>

      {/* Unified Generator CTA Section */}
      <section className="py-16 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-6 tracking-tight" style={{ fontFamily: 'var(--font-brand)' }}>
              CREATION WORKFLOW
            </h2>
            <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto">
              End-to-end pipeline: Character &rarr; Prompts &rarr; Images &rarr; Videos &rarr; Storylines &rarr; Scripts &rarr; Music &rarr; NFTs
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-10">
              {[
                { num: "01", title: "Character" },
                { num: "02", title: "Prompts" },
                { num: "03", title: "Images" },
                { num: "04", title: "Videos" },
                { num: "05", title: "Stories" },
                { num: "06", title: "Scripts" },
                { num: "07", title: "Music" },
                { num: "08", title: "NFTs" }
              ].map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white/5 border border-white/10 p-4 rounded-lg text-center hover:border-red-500/50 transition"
                >
                  <div className="text-red-500 font-mono text-sm mb-1">{step.num}</div>
                  <div className="text-white font-bold text-sm">{step.title}</div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="space-y-4"
            >
              <Link
                href="/gen"
                className="inline-flex items-center space-x-3 bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-all transform hover:scale-105"
              >
                <span>Start Unified Workflow</span>
              </Link>
              <p className="text-gray-500 text-sm">
                Complete 8-step workflow — All tools in sequence — Professional results
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-4xl font-black text-white mb-4 tracking-tight" style={{ fontFamily: 'var(--font-brand)' }}>
              FEATURES
            </h2>
            <p className="text-lg sm:text-xl text-gray-500 px-4">
              AI-powered content creation meets blockchain ownership
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white/5 p-6 sm:p-8 rounded-lg transition-all border border-white/10 hover:border-red-500/50"
              >
                <div className="text-red-400 mb-4">{feature.icon}</div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ninja Punk Girls Gallery */}
      <NinjaPunkGirlsGallery />

      {/* Social Platforms Section */}
      <section className="py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-4xl font-black text-white mb-4 tracking-tight" style={{ fontFamily: 'var(--font-brand)' }}>
              MULTI-PLATFORM
            </h2>
            <p className="text-lg sm:text-xl text-gray-500 px-4">
              Deploy across billions of users
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {socialPlatforms.map((platform, index) => (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white/5 p-4 sm:p-6 rounded-lg text-center hover:scale-105 transition-transform border border-white/10 hover:border-red-500/50"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/10 rounded-full mx-auto mb-3 sm:mb-4"></div>
                <h3 className="font-semibold text-white mb-2 text-sm sm:text-base">{platform.name}</h3>
                <p className="text-xs sm:text-sm text-gray-500">{platform.users}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Revenue Streams Section */}
      <section className="py-12 sm:py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-4xl font-black text-white mb-4 tracking-tight" style={{ fontFamily: 'var(--font-brand)' }}>
              REVENUE
            </h2>
            <p className="text-lg sm:text-xl text-gray-500 px-4">
              Diversified income streams
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {revenueStreams.map((stream, index) => (
              <motion.div
                key={stream.name}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white/5 p-4 sm:p-6 rounded-lg border border-white/10 hover:border-red-500/50 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <CurrencyDollarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
                  <span className="text-lg sm:text-2xl font-bold text-white">{stream.potential}</span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-400">{stream.name}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white mb-4 sm:mb-6 px-2 tracking-tight" style={{ fontFamily: 'var(--font-brand)' }}>
              GET STARTED
            </h2>
            <p className="text-base sm:text-xl text-gray-500 mb-8 sm:mb-12 px-4">
              Create, own, and trade AI-generated content backed by $NPGX tokens.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Link
                href="/create"
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-lg sm:text-xl font-bold hover:scale-105 transition-all text-center"
              >
                Create Your Character
              </Link>
              <Link
                href="/investors"
                className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-lg sm:text-xl font-bold hover:scale-105 transition-all text-center border border-white/20"
              >
                Invest in $NPGX
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
