'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'
import { 
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  StarIcon,
  ChartBarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

export default function DemoVideoPage() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState(0)

  const demoVideos = [
    {
      id: 1,
      title: "NPGX Character Creation Process",
      duration: "2:34",
      thumbnail: "/ai-girlfriends-publicity/download.jpg",
      description: "Watch how our AI generates ultra-realistic girlfriends in seconds",
      views: "1.2M views"
    },
    {
      id: 2,
      title: "Revenue Dashboard Walkthrough",
      duration: "1:47",
      thumbnail: "/ai-girlfriends-publicity/download-1.jpg",
      description: "See real-time earnings from NPGX characters across platforms",
      views: "847K views"
    },
    {
      id: 3,
      title: "Multi-Platform Publishing",
      duration: "3:12",
      thumbnail: "/ai-girlfriends-publicity/download-2.jpg",
      description: "Automatic posting to OnlyFans, Instagram, TikTok, and more",
      views: "2.1M views"
    },
    {
      id: 4,
      title: "Personality Customization",
      duration: "2:56",
      thumbnail: "/ai-girlfriends-publicity/download-3.jpg",
      description: "Create unique personalities and conversation styles",
      views: "934K views"
    }
  ]

  const testimonials = [
    {
      name: "Alex M.",
      role: "Content Creator",
      earnings: "$47K/mo",
      avatar: "/ai-girlfriends-publicity/download-4.jpg",
      quote: "Made $47K in my first month using NPGX characters. This platform is revolutionary!",
      rating: 5
    },
    {
      name: "Sarah K.",
      role: "Digital Entrepreneur",
      earnings: "$38K/mo",
      avatar: "/ai-girlfriends-publicity/download-5.jpg",
      quote: "The AI generation quality is incredible. My followers can't tell the difference!",
      rating: 5
    },
    {
      name: "Mike R.",
      role: "Affiliate Marketer",
      earnings: "$62K/mo",
      avatar: "/ai-girlfriends-publicity/download-6.jpg",
      quote: "Finally found a scalable way to create content. ROI is through the roof!",
      rating: 5
    }
  ]

  const stats = [
    { label: "Demo Views", value: "4.2M+", icon: <PlayIcon className="h-6 w-6" /> },
    { label: "Revenue Shown", value: "$3.7M+", icon: <CurrencyDollarIcon className="h-6 w-6" /> },
    { label: "Viewer Satisfaction", value: "98.7%", icon: <StarIcon className="h-6 w-6" /> },
    { label: "Total Runtime", value: "15min", icon: <ChartBarIcon className="h-6 w-6" /> }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-black relative overflow-hidden">
      {/* Background Images */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-40 bg-cover bg-center rounded-lg transform rotate-12" 
             style={{ backgroundImage: `url('/ai-girlfriends-publicity/download-7.jpg')` }} />
        <div className="absolute top-40 right-20 w-32 h-40 bg-cover bg-center rounded-lg transform -rotate-6" 
             style={{ backgroundImage: `url('/ai-girlfriends-publicity/download-8.jpg')` }} />
        <div className="absolute bottom-40 left-1/4 w-32 h-40 bg-cover bg-center rounded-lg transform rotate-6" 
             style={{ backgroundImage: `url('/ai-girlfriends-publicity/download-9.jpg')` }} />
        <div className="absolute bottom-20 right-10 w-32 h-40 bg-cover bg-center rounded-lg transform -rotate-12" 
             style={{ backgroundImage: `url('/ai-girlfriends-publicity/download-10.jpg')` }} />
      </div>

      {/* Hero Section */}
      <section className="pt-20 pb-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6">
              Watch the <span className="text-yellow-300">Demo</span> 🎬
            </h1>
            <p className="text-xl text-white mb-12 opacity-90 max-w-3xl mx-auto">
              See how NPGX is revolutionizing content creation and generating millions in revenue
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20"
                >
                  <div className="flex items-center justify-center mb-2 text-white">
                    {stat.icon}
                  </div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-white/80 text-sm">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Video Player */}
      <section className="py-16 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="bg-black rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="aspect-video relative">
              <div 
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url('${demoVideos[selectedVideo].thumbnail}')` }}
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="bg-white/20 backdrop-blur-md p-6 rounded-full hover:bg-white/30 transition-colors"
                >
                  {isPlaying ? (
                    <PauseIcon className="h-12 w-12 text-white" />
                  ) : (
                    <PlayIcon className="h-12 w-12 text-white ml-1" />
                  )}
                </button>
              </div>
              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
                <span className="text-white text-sm font-medium">{demoVideos[selectedVideo].duration}</span>
              </div>
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
                <span className="text-white text-sm">{demoVideos[selectedVideo].views}</span>
              </div>
            </div>
          </motion.div>

          {/* Video Info */}
          <div className="mt-6 text-center">
            <h3 className="text-2xl font-bold text-white mb-2">{demoVideos[selectedVideo].title}</h3>
            <p className="text-white/80">{demoVideos[selectedVideo].description}</p>
          </div>
        </div>
      </section>

      {/* Video Playlist */}
      <section className="py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Demo Playlist</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {demoVideos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => setSelectedVideo(index)}
                className={`cursor-pointer rounded-lg overflow-hidden transition-all duration-300 ${
                  selectedVideo === index 
                    ? 'ring-4 ring-yellow-400 scale-105' 
                    : 'hover:scale-105 hover:shadow-xl'
                }`}
              >
                <div className="aspect-video relative">
                  <div 
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url('${video.thumbnail}')` }}
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <PlayIcon className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-white text-xs">
                    {video.duration}
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4">
                  <h4 className="font-semibold text-white mb-1 line-clamp-2">{video.title}</h4>
                  <p className="text-white/70 text-sm line-clamp-2">{video.description}</p>
                  <p className="text-white/60 text-xs mt-2">{video.views}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-16 bg-white/10 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">What You'll See in the Demo</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: "📸",
                title: "Ultra-Realistic Generation",
                description: "See how our AI creates photorealistic girlfriends indistinguishable from real photos"
              },
              {
                icon: "📊",
                title: "Revenue Analytics",
                description: "Track earnings, engagement, and performance across all social platforms"
              },
              {
                icon: "🎥",
                title: "Video Content Creation",
                description: "Generate 4K video content for maximum engagement and monetization"
              },
              {
                icon: "✨",
                title: "AI Optimization",
                description: "Automatic content optimization for maximum revenue generation"
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-white/80">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">What Creators Are Saying</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20"
              >
                <div className="flex items-center mb-4">
                  <div 
                    className="w-12 h-12 rounded-full bg-cover bg-center mr-4"
                    style={{ backgroundImage: `url('${testimonial.avatar}')` }}
                  />
                  <div>
                    <h4 className="font-bold text-white">{testimonial.name}</h4>
                    <p className="text-white/70 text-sm">{testimonial.role}</p>
                  </div>
                  <div className="ml-auto text-red-400 font-bold">
                    {testimonial.earnings}
                  </div>
                </div>
                
                <div className="flex mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="h-5 w-5 text-gray-400 fill-current" />
                  ))}
                </div>
                
                <p className="text-white/90 italic">"{testimonial.quote}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
          >
            <div className="text-4xl mb-4">🎬</div>
            <h2 className="text-3xl font-bold text-white mb-6">Ready to Start Creating?</h2>
            <p className="text-white/90 mb-8">
              Join thousands of creators already earning millions with NPGX characters
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/create"
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-4 rounded-full text-lg font-semibold hover:scale-105 transition-transform shadow-lg"
              >
                Start Creating Now 🚀
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