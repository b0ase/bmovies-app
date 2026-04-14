'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  ViewfinderCircleIcon,
  FilmIcon,
  PlayIcon,
  PlusIcon,
  PhotoIcon,
  DocumentTextIcon,
  ClockIcon,
  CameraIcon,
  SpeakerWaveIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'

export default function StoryboardGenerator() {
  const storyboardTools = [
    {
      title: "Scene Composer",
      description: "AI-powered scene layout and composition",
      icon: CameraIcon,
      color: "from-red-600 to-red-700",
      features: ["Auto-framing", "Rule of thirds", "Dynamic angles"]
    },
    {
      title: "Character Positioning",
      description: "Position characters within scenes perfectly",
      icon: UserGroupIcon,
      color: "from-red-600 to-red-700",
      features: ["Character placement", "Interaction mapping", "Movement flow"]
    },
    {
      title: "Audio Planning",
      description: "Plan dialogue, music, and sound effects",
      icon: SpeakerWaveIcon,
      color: "from-white/10 to-white/5",
      features: ["Dialogue timing", "Music cues", "Sound effects"]
    },
    {
      title: "Timeline Builder",
      description: "Create detailed shot-by-shot timelines",
      icon: ClockIcon,
      color: "from-white/10 to-white/5",
      features: ["Shot duration", "Transition planning", "Pacing control"]
    }
  ]

  const sampleScenes = [
    {
      title: "Opening Scene",
      duration: "30 seconds",
      shots: 5,
      description: "Character introduction in cyberpunk city"
    },
    {
      title: "Action Sequence",
      duration: "45 seconds", 
      shots: 8,
      description: "High-energy ninja combat scene"
    },
    {
      title: "Dialogue Scene",
      duration: "25 seconds",
      shots: 4,
      description: "Character interaction and plot development"
    },
    {
      title: "Climax Scene",
      duration: "60 seconds",
      shots: 12,
      description: "Final confrontation and resolution"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-black py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center space-x-3 mb-6">
            <ViewfinderCircleIcon className="w-12 h-12 text-gray-400" />
            <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-wide font-[family-name:var(--font-brand)] bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent">
              STORYBOARD GENERATOR
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto mb-8">
            Transform your script into visual storyboards with AI assistance. Plan every shot, angle, and transition before production.
          </p>
          
          <div className="bg-red-600/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10 inline-block">
            <p className="text-gray-400 font-medium">
              🎬 Essential for professional movie production
            </p>
          </div>
        </motion.div>

        {/* Tools Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {storyboardTools.map((tool, index) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-blue-400/50 transition-all duration-300 hover:scale-105"
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${tool.color} flex items-center justify-center mb-6`}>
                <tool.icon className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-4">{tool.title}</h3>
              <p className="text-gray-300 mb-6">{tool.description}</p>
              
              <ul className="space-y-2">
                {tool.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center text-sm text-gray-400">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* Script Import */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <DocumentTextIcon className="w-6 h-6 mr-3 text-gray-400" />
              Import Script
            </h2>
            
            <div className="space-y-6">
              <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-blue-400/50 transition-colors">
                <FilmIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Upload Script</h3>
                <p className="text-gray-400 mb-4">Import from Script Generator or upload file</p>
                <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-colors">
                  Import Script
                </button>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <h4 className="text-sm font-bold text-white mb-3">Recent Scripts</h4>
                <div className="space-y-2">
                  {['Luna Cyberblade Origin', 'Neon Ninja Chronicles', 'Shadow Realm Battle'].map((script, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                      <span className="text-gray-300 text-sm">{script}</span>
                      <PlayIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Storyboard Canvas */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <PhotoIcon className="w-6 h-6 mr-3 text-red-400" />
              Storyboard Canvas
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {[1, 2, 3, 4].map((panel) => (
                <div key={panel} className="aspect-video bg-gradient-to-br from-red-600/10 to-red-800/10 rounded-xl border-2 border-dashed border-white/20/30 flex items-center justify-center hover:border-white/20/50 transition-colors cursor-pointer">
                  <div className="text-center">
                    <PlusIcon className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <span className="text-red-300 text-sm">Panel {panel}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-3">
              <button className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-medium transition-colors">
                Add Panel
              </button>
              <button className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-medium transition-colors border border-white/20">
                Auto-Generate
              </button>
            </div>
          </motion.div>

          {/* Scene Breakdown */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <ClockIcon className="w-6 h-6 mr-3 text-red-400" />
              Scene Breakdown
            </h2>

            <div className="space-y-4">
              {sampleScenes.map((scene, index) => (
                <div key={index} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-green-400/50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-white">{scene.title}</h4>
                    <span className="text-xs text-red-400 bg-red-600/20 px-2 py-1 rounded-full">
                      {scene.shots} shots
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-2">{scene.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{scene.duration}</span>
                    <PlayIcon className="w-4 h-4 text-red-400" />
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-medium mt-6 transition-colors">
              Generate Timeline
            </button>
          </motion.div>
        </div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="bg-gradient-to-r from-white/50/10 to-red-500/10 backdrop-blur-xl rounded-3xl p-8 border border-white/10 mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Professional Storyboarding Features</h2>
            <p className="text-gray-300">Everything you need for cinematic planning</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "AI Shot Planning", desc: "Intelligent camera angle suggestions" },
              { title: "Character Tracking", desc: "Follow character movement across scenes" },
              { title: "Transition Effects", desc: "Plan cuts, fades, and special transitions" },
              { title: "Export Options", desc: "PDF, video animatic, or production notes" }
            ].map((feature, index) => (
              <div key={index} className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-lg font-bold text-white mb-2">{feature.title}</div>
                <div className="text-sm text-gray-400">{feature.desc}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-white/50 to-red-600 rounded-3xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-4">Ready for Production?</h2>
            <p className="text-blue-100 mb-6">
              With your storyboard complete, move to video production
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/script-gen"
                className="inline-flex items-center px-6 py-3 bg-red-600/20 text-white font-bold rounded-xl border border-blue-400/50 hover:bg-white/50/30 transition-all duration-300"
              >
                ← Back to Script Generator
              </Link>
              <Link 
                href="/video-gen"
                className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-white/5 transition-all duration-300"
              >
                Start Video Production →
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 