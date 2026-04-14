'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { 
  PencilIcon,
  SparklesIcon,
  UserIcon,
  PaintBrushIcon,
  EyeIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function CharacterRefinery() {
  const searchParams = useSearchParams()
  const [characterData, setCharacterData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const characterParam = searchParams.get('character')
    if (characterParam) {
      try {
        const decodedCharacter = JSON.parse(decodeURIComponent(characterParam))
        setCharacterData(decodedCharacter)
      } catch (error) {
        console.error('Error parsing character data:', error)
      }
    }
    setIsLoading(false)
  }, [searchParams])

  const refinementSteps = [
    {
      title: "Character Analysis",
      description: "AI analyzes your character for consistency and depth",
      icon: EyeIcon,
      color: "from-red-600 to-red-700",
      features: ["Personality consistency check", "Visual coherence analysis", "Story potential assessment"]
    },
    {
      title: "Detail Enhancement",
      description: "Add depth to personality, backstory, and visual elements",
      icon: AdjustmentsHorizontalIcon,
      color: "from-red-600 to-red-700",
      features: ["Backstory expansion", "Personality nuancing", "Visual detail refinement"]
    },
    {
      title: "Variation Generation",
      description: "Create multiple versions and expressions of your character",
      icon: ArrowPathIcon,
      color: "from-white/10 to-white/5",
      features: ["Outfit variations", "Expression sets", "Pose collections"]
    },
    {
      title: "Final Polish",
      description: "Perfect your character for professional production",
      icon: CheckCircleIcon,
      color: "from-white/10 to-white/5",
      features: ["Quality assurance", "Production readiness", "Export optimization"]
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
            <PencilIcon className="w-12 h-12 text-red-400" />
            <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-wide font-[family-name:var(--font-brand)] bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent">
              CHARACTER REFINERY
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto mb-8">
            Polish and perfect your NPGX character with AI-powered refinement tools. Transform good characters into production-ready masterpieces.
          </p>
          
          <div className="bg-red-500/10 backdrop-blur-xl rounded-2xl p-6 border border-red-500/30 inline-block">
            <p className="text-red-300 font-medium">
              ⚡ Essential Step #3 in your creative journey
            </p>
          </div>
        </motion.div>

        {/* Character Display */}
        {characterData && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-red-950/50 to-red-950/30 rounded-3xl p-8 border border-red-500/30 mb-16"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Refining Your Character</h2>
              <p className="text-gray-300">Continue perfecting your NPGX creation</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Character Image */}
              <div className="text-center">
                <div className="relative w-full max-w-md mx-auto h-80 rounded-2xl overflow-hidden mb-4 border-4 border-red-500/50">
                  <Image
                    src={characterData.selectedImage || characterData.image}
                    alt={characterData.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-red-600/80 text-white px-3 py-1 rounded-full text-sm font-bold">
                    ✓ Selected
                  </div>
                </div>
                <p className="text-red-300 text-sm">
                  {characterData.selectedImageIndex !== undefined 
                    ? `Selected Image ${characterData.selectedImageIndex + 1} - ${
                        characterData.selectedImageIndex === 0 ? 'Portrait' : 
                        characterData.selectedImageIndex === 1 ? 'Action Shot' : 'Concept Art'
                      }`
                    : 'Original Character Image'
                  }
                </p>
              </div>

              {/* Character Info */}
              <div>
                <div className="bg-black/30 rounded-2xl p-6 mb-4">
                  <h3 className="text-2xl font-bold text-white mb-2">{characterData.name}</h3>
                  <p className="text-xl text-red-400 mb-4">{characterData.codename}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div><span className="text-red-400">Element:</span> {characterData.attributes?.element}</div>
                    <div><span className="text-red-400">Style:</span> {characterData.attributes?.style}</div>
                    <div><span className="text-red-400">Rarity:</span> {characterData.rarity}</div>
                    <div><span className="text-red-400">Ability:</span> {characterData.specialAbility}</div>
                  </div>
                </div>
                
                {/* Generated Images Grid */}
                {characterData.generatedImages && characterData.generatedImages.length > 0 && (
                  <div className="bg-black/30 rounded-2xl p-6">
                    <h4 className="text-lg font-bold text-white mb-3">All Generated Images</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {characterData.generatedImages.map((imageUrl: string, index: number) => (
                        <div 
                          key={index}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                            characterData.selectedImage === imageUrl 
                              ? 'border-green-500' 
                              : 'border-gray-600'
                          }`}
                        >
                          <Image
                            src={imageUrl}
                            alt={`Generated image ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                          {characterData.selectedImage === imageUrl && (
                            <div className="absolute inset-0 bg-red-600/20 flex items-center justify-center">
                              <CheckCircleIcon className="w-6 h-6 text-red-400" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Refinement Process */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {refinementSteps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-white/20/50 transition-all duration-300 hover:scale-105"
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${step.color} flex items-center justify-center mb-6`}>
                <step.icon className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-4">{step.title}</h3>
              <p className="text-gray-300 mb-6">{step.description}</p>
              
              <ul className="space-y-2">
                {step.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center text-sm text-gray-400">
                    <SparklesIcon className="w-4 h-4 text-red-400 mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Main Interface */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Refine Your Character</h2>
            <p className="text-gray-300">Upload your character or select from your collection to begin refinement</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Character Upload/Selection */}
            <div className="space-y-6">
              <div className="border-2 border-dashed border-red-500/30 rounded-2xl p-8 text-center hover:border-white/20/50 transition-colors">
                <UserIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Upload Character</h3>
                <p className="text-gray-400 mb-4">Drag and drop your character files or click to browse</p>
                <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-colors">
                  Select Files
                </button>
              </div>

              <div className="text-center text-gray-400">or</div>

              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Select from Your Collection</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="aspect-square bg-gradient-to-br from-red-600/20 to-red-800/20 rounded-xl border border-white/10 hover:border-white/20/50 transition-colors cursor-pointer">
                      <div className="w-full h-full flex items-center justify-center">
                        <UserIcon className="w-8 h-8 text-red-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Refinement Controls */}
            <div className="space-y-6">
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Refinement Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Refinement Level</label>
                    <select className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                      <option>Light Polish</option>
                      <option>Standard Refinement</option>
                      <option>Deep Enhancement</option>
                      <option>Complete Overhaul</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Focus Areas</label>
                    <div className="space-y-2">
                      {['Visual Consistency', 'Personality Depth', 'Backstory Development', 'Production Readiness'].map((area) => (
                        <label key={area} className="flex items-center">
                          <input type="checkbox" className="mr-2 rounded" />
                          <span className="text-sm text-gray-300">{area}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Style Preference</label>
                    <select className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                      <option>Maintain Original Style</option>
                      <option>Enhanced Realism</option>
                      <option>Anime/Manga Style</option>
                      <option>Cinematic Quality</option>
                    </select>
                  </div>
                </div>

                <button className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 rounded-xl font-bold mt-6 transition-all duration-300 hover:scale-105">
                  <PaintBrushIcon className="w-5 h-5 inline mr-2" />
                  Start Refinement Process
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-white/50 to-red-600 rounded-3xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-4">Next Steps in Your Journey</h2>
            <p className="text-blue-100 mb-6">
              After refining your character, continue with story development
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/character-gen"
                className="inline-flex items-center px-6 py-3 bg-red-600/20 text-white font-bold rounded-xl border border-blue-400/50 hover:bg-white/50/30 transition-all duration-300"
              >
                ← Back to Character Generator
              </Link>
              <Link 
                href="/storyline-gen"
                className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-white/5 transition-all duration-300"
              >
                Continue to Story Development →
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 