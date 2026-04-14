'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  CameraIcon, 
  SparklesIcon, 
  PlayIcon,
  CogIcon,
  PaintBrushIcon,
  FilmIcon
} from '@heroicons/react/24/outline'

export default function CreatePage() {
  const creationSteps = [
    {
      icon: <CameraIcon className="h-8 w-8" />,
      title: "Generate Ninja Punk Girl",
      description: "Create ultra-badass Ninja Punk Girl images with punk features",
      status: "active"
    },
    {
      icon: <FilmIcon className="h-8 w-8" />,
      title: "Create Video Content",
      description: "Generate 4K videos for social media platforms",
      status: "coming-soon"
    },
    {
      icon: <SparklesIcon className="h-8 w-8" />,
      title: "Punk Voice Generation",
      description: "Add rebellious voice and attitude to your Ninja Punk Girl",
      status: "coming-soon"
    },
    {
      icon: <PaintBrushIcon className="h-8 w-8" />,
      title: "Custom Outfits & Poses",
      description: "Design custom clothing and poses for maximum engagement",
      status: "coming-soon"
    }
  ]

  const templates = [
    {
      name: "Fitness Influencer",
      image: "/npgx-images/heroes/hero-1.jpg",
      description: "Athletic, toned, gym content",
      earnings: "$45K/mo",
      tags: ["Fitness", "Athletic", "Healthy"]
    },
    {
      name: "Gaming Girlfriend",
      image: "/npgx-images/characters/luna-cyberblade-1.jpg",
      description: "Gamer girl, tech-savvy, interactive",
      earnings: "$38K/mo",
      tags: ["Gaming", "Tech", "Interactive"]
    },
    {
      name: "Fashion Model",
      image: "/npgx-images/characters/nova-bloodmoon-1.jpg",
      description: "High fashion, luxury lifestyle",
      earnings: "$62K/mo",
      tags: ["Fashion", "Luxury", "Style"]
    },
    {
      name: "Art & Music",
      image: "/npgx-images/characters/raven-shadowblade-1.jpg",
      description: "Creative, artistic, bohemian",
      earnings: "$29K/mo",
      tags: ["Art", "Music", "Creative"]
    }
  ]

  return (
    <div className="min-h-screen bg-transparent">
      {/* Hero Section */}
      <section className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-6"
          >
            Create Your <span className="text-red-600">Ninja Punk Girl</span> 🔥
          </motion.h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            Generate ultra-badass Ninja Punk Girls that earn millions across rebel platforms. 
            Start with our templates or create completely custom personalities.
          </p>
          

        </div>
      </section>

      {/* Creation Steps */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-12">Creation Workflow</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {creationSteps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white/5 rounded-xl p-6 shadow-lg border-2 ${
                  step.status === 'active' 
                    ? 'border-red-500 bg-gradient-to-br from-white/5 to-transparent' 
                    : 'border-white/10'
                }`}
              >
                <div className={`${step.status === 'active' ? 'text-red-400' : 'text-gray-400'} mb-4`}>
                  {step.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-white text-sm mb-4">{step.description}</p>
                {step.status === 'active' ? (
                  <span className="bg-red-600/20 text-red-300 px-3 py-1 rounded-full text-xs font-semibold">
                    LIVE NOW
                  </span>
                ) : (
                  <span className="bg-white/5 text-gray-400 px-3 py-1 rounded-full text-xs">
                    Coming Soon
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Image Generator */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/5 rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-white text-center mb-6">AI Image Generator</h2>
            <div className="text-center">
              <div className="bg-gradient-to-br from-white/10 to-red-900/20 rounded-xl p-12 mb-6">
                <CameraIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Generate Your Ninja Punk Girl</h3>
                <p className="text-white mb-6 font-medium">Create ultra-badass Ninja Punk Girls with our advanced punk generation tools</p>
                <Link
                  href="/ninja-punk-girls#generator"
                  className="inline-block bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-3 rounded-full font-semibold hover:from-red-700 hover:to-red-700 transition-all duration-200"
                >
                  Open Generator 🎨
                </Link>
              </div>
              <p className="text-sm text-gray-500">
                💡 Connect your Stability API key in settings to start generating
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Templates Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Popular Templates
            </h2>
            <p className="text-lg text-gray-400">
              Start with proven templates that generate maximum revenue
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {templates.map((template, index) => (
              <motion.div
                key={template.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer group"
              >
                <div className="relative">
                  <img 
                    src={template.image}
                    alt={template.name}
                    className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3">
                    <div className="bg-red-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
                      {template.earnings}
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-2">{template.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{template.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-white/10 text-red-900 text-xs px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <button className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-2 rounded-lg font-semibold hover:from-red-700 hover:to-red-700 transition-all duration-200">
                    Use Template
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-white/5 to-transparent">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8">
            Advanced Creation Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/5 p-6 rounded-xl shadow-lg">
              <CogIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">Custom Personalities</h3>
              <p className="text-white">Create unique personality traits, interests, and conversation styles</p>
            </div>
            
            <div className="bg-white/5 p-6 rounded-xl shadow-lg">
              <SparklesIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">AI Enhancement</h3>
              <p className="text-white">Automatic content optimization for maximum engagement and revenue</p>
            </div>
            
            <div className="bg-white/5 p-6 rounded-xl shadow-lg">
              <PlayIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">Multi-Platform Export</h3>
              <p className="text-white">Export directly to OnlyFans, Instagram, TikTok, and more</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-red-600 via-red-700 to-red-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-bold text-white mb-6">
            Ready to Start Earning?
          </h2>
          <p className="text-lg text-white mb-8 opacity-90">
            Join thousands of creators already earning millions with NPGX characters
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/business-plan"
              className="bg-red-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:scale-105 transition-transform shadow-lg"
            >
              View Business Plan 📊
            </Link>
            <Link
              href="/investors"
              className="bg-red-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:scale-105 transition-transform shadow-lg"
            >
              Investor Information 💰
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
} 