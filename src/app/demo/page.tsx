'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  PlayIcon, 
  PauseIcon,
  SpeakerWaveIcon,
  FilmIcon,
  SparklesIcon,
  CameraIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'

export default function DemoPage() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentVideo, setCurrentVideo] = useState(0)

  const demoVideos = [
    {
      title: "NPGX Character Creation Process",
      description: "Watch how our AI generates ultra-realistic girlfriends in seconds",
      thumbnail: "/ai-girlfriends-publicity/download-1.jpg",
      duration: "2:34",
      views: "1.2M"
    },
    {
      title: "Revenue Generation Dashboard",
      description: "See real-time earnings from NPGX characters across platforms",
      thumbnail: "/ai-girlfriends-publicity/download-2.jpg",
      duration: "1:47",
      views: "847K"
    },
    {
      title: "Multi-Platform Distribution",
      description: "Automatic posting to OnlyFans, Instagram, TikTok, and more",
      thumbnail: "/ai-girlfriends-publicity/download-3.jpg",
      duration: "3:12",
      views: "2.1M"
    },
    {
      title: "AI Personality Customization",
      description: "Create unique personalities and conversation styles",
      thumbnail: "/ai-girlfriends-publicity/download-4.jpg",
      duration: "2:56",
      views: "934K"
    }
  ]

  const features = [
    {
      icon: <CameraIcon className="h-8 w-8" />,
      title: "Ultra-Realistic Generation",
      description: "See how our AI creates photorealistic girlfriends indistinguishable from real photos"
    },
    {
      icon: <ChartBarIcon className="h-8 w-8" />,
      title: "Revenue Analytics",
      description: "Track earnings, engagement, and performance across all social platforms"
    },
    {
      icon: <FilmIcon className="h-8 w-8" />,
      title: "Video Content Creation",
      description: "Generate 4K video content for maximum engagement and monetization"
    },
    {
      icon: <SparklesIcon className="h-8 w-8" />,
      title: "AI Optimization",
      description: "Automatic content optimization for maximum revenue generation"
    }
  ]

  const testimonials = [
    {
      name: "Alex M.",
      role: "Content Creator",
      image: "/npgx-images/characters/luna-cyberblade-1.jpg",
      quote: "Made $47K in my first month using NPGX characters. This platform is revolutionary!",
      earnings: "$47K/mo"
    },
    {
      name: "Sarah K.",
      role: "Digital Entrepreneur",
      image: "/npgx-images/characters/nova-bloodmoon-1.jpg",
      quote: "The AI generation quality is incredible. My followers can't tell the difference!",
      earnings: "$38K/mo"
    },
    {
      name: "Mike R.",
      role: "Affiliate Marketer",
      image: "/npgx-images/characters/raven-shadowblade-1.jpg",
      quote: "Finally found a scalable way to create content. ROI is through the roof!",
      earnings: "$62K/mo"
    }
  ]

  return (
    <div className="min-h-screen bg-transparent">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-black to-black pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-6xl font-black font-[family-name:var(--font-brand)] uppercase tracking-wide bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent mb-6"
          >
            Platform Demo
          </motion.h1>
          <p className="text-xl text-white mb-8 opacity-90 max-w-3xl mx-auto">
            See how NPGX is revolutionizing content creation and generating millions in revenue
          </p>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-8 max-w-4xl mx-auto border border-white/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">4.2M+</div>
                <div className="text-white/80 text-sm">Demo Views</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">$3.7M+</div>
                <div className="text-white/80 text-sm">Revenue Shown</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">98.7%</div>
                <div className="text-white/80 text-sm">Viewer Satisfaction</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">15min</div>
                <div className="text-white/80 text-sm">Total Runtime</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Video Player */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-black rounded-2xl overflow-hidden shadow-2xl mb-8">
            <div className="relative aspect-video bg-gradient-to-br from-red-950 to-red-950/80 flex items-center justify-center">
              {/* Video Thumbnail */}
              <img 
                src={demoVideos[currentVideo].thumbnail}
                alt={demoVideos[currentVideo].title}
                className="absolute inset-0 w-full h-full object-cover opacity-60"
              />
              
              {/* Play Button Overlay */}
              <div className="relative z-10 text-center">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full p-6 hover:bg-white/30 transition-all duration-300 group"
                >
                  {isPlaying ? (
                    <PauseIcon className="h-12 w-12 text-white group-hover:scale-110 transition-transform" />
                  ) : (
                    <PlayIcon className="h-12 w-12 text-white ml-1 group-hover:scale-110 transition-transform" />
                  )}
                </button>
                <div className="mt-4 text-white">
                  <h3 className="text-xl font-semibold mb-2">{demoVideos[currentVideo].title}</h3>
                  <p className="text-white/80">{demoVideos[currentVideo].description}</p>
                </div>
              </div>
              
              {/* Video Info Overlay */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-white text-sm">
                <div className="flex items-center space-x-4">
                  <span>{demoVideos[currentVideo].duration}</span>
                  <span>👁️ {demoVideos[currentVideo].views} views</span>
                </div>
                <div className="flex items-center space-x-2">
                  <SpeakerWaveIcon className="h-4 w-4" />
                  <span>HD Quality</span>
                </div>
              </div>
            </div>
          </div>

          {/* Video Playlist */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {demoVideos.map((video, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`cursor-pointer rounded-xl overflow-hidden transition-all duration-300 ${
                  currentVideo === index 
                    ? 'ring-4 ring-red-500 shadow-lg' 
                    : 'hover:shadow-lg'
                }`}
                onClick={() => setCurrentVideo(index)}
              >
                <div className="relative">
                  <img 
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <PlayIcon className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                    {video.duration}
                  </div>
                </div>
                <div className="p-4 bg-white/5">
                  <h4 className="font-semibold text-sm mb-1 line-clamp-2">{video.title}</h4>
                  <p className="text-xs text-gray-400 line-clamp-2">{video.description}</p>
                  <div className="text-xs text-gray-500 mt-2">{video.views} views</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black font-[family-name:var(--font-brand)] uppercase tracking-wide text-white mb-4">
              What You'll See in the Demo
            </h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto">
              Get an inside look at the revolutionary technology powering the next unicorn startup
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="bg-gradient-to-br from-white/10 to-red-900/20 rounded-2xl p-6 mb-4">
                  <div className="text-red-500 mb-4 flex justify-center">{feature.icon}</div>
                  <h3 className="text-lg font-semibold text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black font-[family-name:var(--font-brand)] uppercase tracking-wide text-white mb-4">
              What Creators Are Saying
            </h2>
            <p className="text-lg text-gray-400">
              Real results from real creators using our platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                className="bg-white/5 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center mb-4">
                  <img 
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                  <div>
                    <div className="font-semibold text-white">{testimonial.name}</div>
                    <div className="text-sm text-gray-400">{testimonial.role}</div>
                  </div>
                  <div className="ml-auto bg-red-500/20 text-red-300 px-2 py-1 rounded-full text-xs font-semibold">
                    {testimonial.earnings}
                  </div>
                </div>
                <p className="text-gray-300 italic">"{testimonial.quote}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-red-600/20 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
          >
            <FilmIcon className="h-16 w-16 text-white mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-black font-[family-name:var(--font-brand)] uppercase tracking-wide text-white mb-6">
              Ready to Start Creating?
            </h2>
            <p className="text-xl text-white mb-8 opacity-90">
              Join thousands of creators already earning millions with NPGX characters
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/create"
                className="bg-red-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:scale-105 transition-transform shadow-lg"
              >
                Start Creating Now 🎨
              </Link>
              <Link
                href="/investors"
                className="bg-red-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:scale-105 transition-transform shadow-lg"
              >
                Investor Information 💰
              </Link>
              <Link
                href="/business-plan"
                className="border-2 border-white text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white hover:text-red-500 transition-colors"
              >
                Business Plan 📊
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
} 