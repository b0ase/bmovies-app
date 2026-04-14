'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaUserNinja, FaMagic, FaCheckCircle, FaDice, FaCog, FaFire, FaBolt, FaSnowflake, FaLeaf, FaSkull, FaHeart, FaStar, FaImage, FaDownload } from 'react-icons/fa'
import Image from 'next/image'

interface Character {
  id: string
  name: string
  codename: string
  image: string
  attributes: {
    height: string
    build: string
    hair: string
    eyes: string
    skinTone: string
    style: string
    element: string
  }
  personality: string[]
  specialAbility: string
  backstory: string
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary'
  stats: {
    strength: number
    agility: number
    intelligence: number
    stealth: number
    charisma: number
  }
}

const characterPool: Character[] = [
  {
    id: 'luna-cyber',
    name: 'Luna Tsukino',
    codename: 'Digital Phantom',
    image: '/npgx-images/characters/luna-cyberblade-1.jpg',
    attributes: {
      height: 'Athletic (5\'6")',
      build: 'Lean & Muscular',
      hair: 'Platinum Blonde with Neon Blue Streaks',
      eyes: 'Electric Blue Cybernetic',
      skinTone: 'Pale with Cyber Tattoos',
      style: 'Cyberpunk Ninja',
      element: 'Lightning'
    },
    personality: ['Tech-Savvy', 'Strategic', 'Cold & Calculating', 'Loyal'],
    specialAbility: 'Neural Hacking & Digital Manipulation',
    backstory: 'Former corporate hacker turned rogue ninja. Specializes in infiltrating digital networks and manipulating technology.',
    rarity: 'Legendary',
    stats: { strength: 7, agility: 9, intelligence: 10, stealth: 8, charisma: 6 }
  },
  {
    id: 'nova-blood',
    name: 'Nova Akatsuki',
    codename: 'Crimson Shadow',
    image: '/npgx-images/characters/nova-bloodmoon-1.jpg',
    attributes: {
      height: 'Tall (5\'8")',
      build: 'Elegant & Deadly',
      hair: 'Raven Black with Crimson Highlights',
      eyes: 'Blood Red',
      skinTone: 'Porcelain White',
      style: 'Gothic Vampire Ninja',
      element: 'Shadow'
    },
    personality: ['Mysterious', 'Seductive', 'Ruthless', 'Aristocratic'],
    specialAbility: 'Blood Magic & Shadow Manipulation',
    backstory: 'Descendant of ancient vampire nobility. Masters the art of shadow magic and blood manipulation in combat.',
    rarity: 'Epic',
    stats: { strength: 8, agility: 8, intelligence: 9, stealth: 10, charisma: 9 }
  },
  {
    id: 'raven-void',
    name: 'Raven Karasu',
    codename: 'Void Walker',
    image: '/npgx-images/characters/raven-shadowblade-1.jpg',
    attributes: {
      height: 'Medium (5\'5")',
      build: 'Compact & Agile',
      hair: 'Jet Black with Purple Undertones',
      eyes: 'Violet with Dark Rings',
      skinTone: 'Olive with Void Markings',
      style: 'Shadow Assassin',
      element: 'Void'
    },
    personality: ['Silent', 'Deadly', 'Focused', 'Mysterious'],
    specialAbility: 'Void Stepping & Reality Distortion',
    backstory: 'Trained in the forbidden arts of void magic. Can step between dimensions and manipulate reality itself.',
    rarity: 'Legendary',
    stats: { strength: 6, agility: 10, intelligence: 8, stealth: 10, charisma: 7 }
  },
  {
    id: 'phoenix-fire',
    name: 'Phoenix Himura',
    codename: 'Flame Reborn',
    image: '/npgx-images/characters/phoenix-darkfire-1.jpg',
    attributes: {
      height: 'Athletic (5\'7")',
      build: 'Strong & Fierce',
      hair: 'Fiery Red with Golden Streaks',
      eyes: 'Amber with Fire Flecks',
      skinTone: 'Tanned with Flame Tattoos',
      style: 'Fire Warrior',
      element: 'Fire'
    },
    personality: ['Passionate', 'Fierce', 'Protective', 'Hot-Tempered'],
    specialAbility: 'Pyrokinesis & Phoenix Resurrection',
    backstory: 'Born from the ashes of a destroyed clan. Wields the power of eternal flames and can resurrect from death.',
    rarity: 'Epic',
    stats: { strength: 9, agility: 7, intelligence: 7, stealth: 6, charisma: 8 }
  },
  {
    id: 'storm-razor',
    name: 'Storm Arashida',
    codename: 'Lightning Strike',
    image: '/npgx-images/characters/storm-razorclaw-1.jpg',
    attributes: {
      height: 'Tall (5\'9")',
      build: 'Powerful & Athletic',
      hair: 'Silver-White with Electric Blue',
      eyes: 'Storm Grey',
      skinTone: 'Fair with Lightning Scars',
      style: 'Storm Warrior',
      element: 'Lightning'
    },
    personality: ['Energetic', 'Unpredictable', 'Brave', 'Impulsive'],
    specialAbility: 'Electrokinesis & Storm Summoning',
    backstory: 'Struck by lightning as a child, gained the power to control storms and electricity. Fights with lightning speed.',
    rarity: 'Rare',
    stats: { strength: 8, agility: 9, intelligence: 6, stealth: 7, charisma: 7 }
  },
  {
    id: 'jade-ghost',
    name: 'Jade Ghosthunter',
    codename: 'Spirit Walker',
    image: '/npgx-images/heroes/hero-2.jpg',
    attributes: {
      height: 'Petite (5\'3")',
      build: 'Lithe & Graceful',
      hair: 'Jade Green with Spectral Glow',
      eyes: 'Ethereal Green',
      skinTone: 'Pale with Spirit Marks',
      style: 'Spiritual Ninja',
      element: 'Spirit'
    },
    personality: ['Wise', 'Calm', 'Spiritual', 'Empathetic'],
    specialAbility: 'Spirit Communication & Exorcism',
    backstory: 'Trained by ancient spirits to hunt malevolent ghosts. Can see and communicate with the dead.',
    rarity: 'Epic',
    stats: { strength: 5, agility: 8, intelligence: 9, stealth: 8, charisma: 8 }
  },
  {
    id: 'echo-night',
    name: 'Echo Fujimori',
    codename: 'Sound Phantom',
    image: '/npgx-images/heroes/hero-3.jpg',
    attributes: {
      height: 'Medium (5\'4")',
      build: 'Slender & Flexible',
      hair: 'Deep Purple with Sound Waves',
      eyes: 'Violet with Echo Patterns',
      skinTone: 'Dusky with Sonic Tattoos',
      style: 'Sonic Assassin',
      element: 'Sound'
    },
    personality: ['Quiet', 'Observant', 'Precise', 'Artistic'],
    specialAbility: 'Sonic Manipulation & Echo Location',
    backstory: 'Master of sound-based combat. Can create sonic blasts, become invisible through sound dampening.',
    rarity: 'Rare',
    stats: { strength: 6, agility: 9, intelligence: 8, stealth: 9, charisma: 6 }
  },
  {
    id: 'vega-neon',
    name: 'Vega Neonwolf',
    codename: 'Cyber Beast',
    image: '/npgx-images/gallery/gallery-1.jpg',
    attributes: {
      height: 'Athletic (5\'6")',
      build: 'Feral & Powerful',
      hair: 'Neon Pink with Cyber Streaks',
      eyes: 'Glowing Cyan',
      skinTone: 'Tanned with Neon Tattoos',
      style: 'Cyber Punk Beast',
      element: 'Technology'
    },
    personality: ['Wild', 'Loyal', 'Fierce', 'Protective'],
    specialAbility: 'Cyber Enhancement & Beast Transformation',
    backstory: 'Genetically enhanced with wolf DNA and cybernetic implants. Can transform into a cyber-wolf hybrid.',
    rarity: 'Legendary',
    stats: { strength: 9, agility: 8, intelligence: 7, stealth: 7, charisma: 7 }
  }
]

export default function UnifiedGeneratorWorkflow() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [characterOptions, setCharacterOptions] = useState<Character[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [isGeneratingImages, setIsGeneratingImages] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [imageGenerationStatus, setImageGenerationStatus] = useState<string>('')
  const [generationMode, setGenerationMode] = useState<'random' | 'custom'>('random')
  const [customFilters, setCustomFilters] = useState({
    rarity: 'Any',
    element: 'Any',
    style: 'Any'
  })
  const [showStats, setShowStats] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showImageSelection, setShowImageSelection] = useState(false)

  const generateCharacterOptions = async () => {
    setIsGenerating(true)
    setCharacterOptions([])
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2500))
    
    let availableCharacters = [...characterPool]
    
    // Apply filters for custom mode
    if (generationMode === 'custom') {
      if (customFilters.rarity !== 'Any') {
        availableCharacters = availableCharacters.filter(char => char.rarity === customFilters.rarity)
      }
      if (customFilters.element !== 'Any') {
        availableCharacters = availableCharacters.filter(char => char.attributes.element === customFilters.element)
      }
      if (customFilters.style !== 'Any') {
        availableCharacters = availableCharacters.filter(char => char.attributes.style.includes(customFilters.style))
      }
    }
    
    // Randomly select 3-5 characters
    const numCharacters = Math.floor(Math.random() * 3) + 3
    const shuffled = availableCharacters.sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, Math.min(numCharacters, availableCharacters.length))
    
    setCharacterOptions(selected)
    setIsGenerating(false)
  }

  const selectCharacter = (character: Character) => {
    setSelectedCharacter(character)
    setGeneratedImages([]) // Clear previous images when selecting new character
  }

  const generateImages = async () => {
    if (!selectedCharacter) return
    
    setIsGeneratingImages(true)
    setGeneratedImages([]) // Clear previous images
    setImageGenerationStatus(`Generating images for ${selectedCharacter.name}...`)
    
    try {
      // Create detailed prompts for different image styles
      const imagePrompts = [
        `Portrait of ${selectedCharacter.name}, ${selectedCharacter.attributes.hair} hair, ${selectedCharacter.attributes.eyes} eyes, ${selectedCharacter.attributes.skinTone} skin, ${selectedCharacter.attributes.style} style, ninja punk girl, high quality digital art, detailed face`,
        `Full body shot of ${selectedCharacter.name} in action pose, ${selectedCharacter.attributes.build} build, ${selectedCharacter.attributes.style} outfit, ${selectedCharacter.attributes.element} powers, dynamic fighting pose, ninja punk girl, high quality digital art`,
        `Concept art of ${selectedCharacter.name}, ${selectedCharacter.attributes.style} aesthetic, ${selectedCharacter.attributes.element} elemental effects, ninja punk girl character design, professional illustration, detailed artwork`
      ]

      const imageUrls: string[] = []
      
      for (let i = 0; i < imagePrompts.length; i++) {
        setImageGenerationStatus(`Generating image ${i + 1} of ${imagePrompts.length}...`)
        
        try {
          const response = await fetch('/api/generate-image-npgx', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              slug: selectedCharacter.id.replace(/-[a-z]+$/, '') === 'luna' ? 'luna-cyberblade' :
                    selectedCharacter.id.replace(/-[a-z]+$/, '') === 'nova' ? 'nova-bloodmoon' :
                    selectedCharacter.id.replace(/-[a-z]+$/, '') === 'raven' ? 'raven-shadowblade' :
                    selectedCharacter.id.replace(/-[a-z]+$/, '') === 'phoenix' ? 'phoenix-darkfire' :
                    selectedCharacter.id.replace(/-[a-z]+$/, '') === 'storm' ? 'storm-razorclaw' :
                    'luna-cyberblade',
              additionalPrompt: imagePrompts[i],
            }),
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.imageUrl) {
              imageUrls.push(data.imageUrl)
              setGeneratedImages([...imageUrls])
              setImageGenerationStatus(`Generated ${imageUrls.length} of ${imagePrompts.length} images`)
            }
          }
        } catch (error) {
          console.error(`Error generating image ${i + 1}:`, error)
        }
        
        // Add delay between requests
        if (i < imagePrompts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      // Final status update
      if (imageUrls.length === 0) {
        setImageGenerationStatus('Failed to generate images. Please try again.')
        console.log('Failed to generate images. Please try again.')
      } else {
        setImageGenerationStatus(`Successfully generated ${imageUrls.length} images!`)
        console.log(`Successfully generated ${imageUrls.length} images for ${selectedCharacter.name}!`)
        // Clear status after 3 seconds
        setTimeout(() => setImageGenerationStatus(''), 3000)
      }
      
    } catch (error) {
      console.error('Error generating images:', error)
      setImageGenerationStatus('Failed to generate images. Please try again.')
      console.log('Failed to generate images. Please try again.')
    } finally {
      setIsGeneratingImages(false)
    }
  }

  const exportCharacter = async () => {
    if (!selectedCharacter) return
    
    setIsExporting(true)
    
    try {
      // Create comprehensive character data
      const characterData = {
        ...selectedCharacter,
        generatedImages: generatedImages,
        exportDate: new Date().toISOString(),
        version: '1.0'
      }

      // Convert to JSON
      const jsonData = JSON.stringify(characterData, null, 2)
      
      // Create downloadable file
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      // Create download link
      const link = document.createElement('a')
      link.href = url
      link.download = `${selectedCharacter.name.replace(/\s+/g, '_').toLowerCase()}_character_data.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up
      URL.revokeObjectURL(url)
      
      // Also save to database if API exists
      try {
        const response = await fetch('/api/save-character', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(characterData),
        })
        
        if (response.ok) {
          console.log('Character saved to database successfully')
        }
      } catch (dbError) {
        console.log('Database save failed, but file download succeeded')
      }
      
      console.log('Character exported successfully!')
      
    } catch (error) {
      console.error('Error exporting character:', error)
      console.log('Failed to export character. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Common': return 'text-gray-400 border-gray-400'
      case 'Rare': return 'text-gray-400 border-blue-400'
      case 'Epic': return 'text-red-400 border-white/20'
      case 'Legendary': return 'text-gray-400 border-yellow-400'
      default: return 'text-gray-400 border-gray-400'
    }
  }

  const getElementIcon = (element: string) => {
    switch (element) {
      case 'Fire': return <FaFire className="text-red-400" />
      case 'Lightning': return <FaBolt className="text-gray-400" />
      case 'Shadow': return <FaSkull className="text-red-400" />
      case 'Void': return <FaHeart className="text-white" />
      case 'Spirit': return <FaLeaf className="text-red-400" />
      case 'Sound': return <FaStar className="text-red-400" />
      case 'Technology': return <FaBolt className="text-white 400" />
      default: return <FaStar className="text-gray-400" />
    }
  }

  const StatBar = ({ label, value, max = 10 }: { label: string, value: number, max?: number }) => (
    <div className="mb-2">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300">{label}</span>
        <span className="text-red-400">{value}/{max}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-red-600 to-red-700 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  )

  const selectGeneratedImage = (imageUrl: string, imageIndex: number) => {
    setSelectedImage(imageUrl)
    setShowImageSelection(true)
    
    // Update the character with the selected image
    if (selectedCharacter) {
      const updatedCharacter = {
        ...selectedCharacter,
        selectedGeneratedImage: imageUrl,
        selectedImageIndex: imageIndex
      }
      setSelectedCharacter(updatedCharacter)
    }
    
    console.log(`Selected image ${imageIndex + 1} for ${selectedCharacter?.name}`)
  }

  const proceedToNextStep = () => {
    if (!selectedCharacter || !selectedImage) return
    
    // Navigate to character customization/finalization page
    window.location.href = `/character-refinery?character=${encodeURIComponent(JSON.stringify({
      ...selectedCharacter,
      selectedImage: selectedImage,
      generatedImages: generatedImages
    }))}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-wide font-[family-name:var(--font-brand)] bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent mb-4">
            NPGX Character Generator
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Generate unique Ninja Punk Girls with distinct personalities, abilities, and backstories
          </p>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Generation Mode Selection */}
          <div className="mb-8 flex justify-center">
            <div className="bg-gray-800/50 rounded-xl p-2 flex">
              <button
                onClick={() => setGenerationMode('random')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  generationMode === 'random' 
                    ? 'bg-red-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FaDice className="inline mr-2" />
                Random Generation
              </button>
              <button
                onClick={() => setGenerationMode('custom')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  generationMode === 'custom' 
                    ? 'bg-red-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FaCog className="inline mr-2" />
                Custom Filters
              </button>
            </div>
          </div>

          {/* Custom Filters */}
          {generationMode === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-8"
            >
              <div className="bg-gray-800/30 rounded-xl p-6 border border-red-500/20">
                <h3 className="text-xl font-bold text-white mb-4">Customize Your Generation</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-gray-300 mb-2">Rarity</label>
                    <select
                      value={customFilters.rarity}
                      onChange={(e) => setCustomFilters({...customFilters, rarity: e.target.value})}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-red-500 focus:outline-none"
                    >
                      <option value="Any">Any Rarity</option>
                      <option value="Common">Common</option>
                      <option value="Rare">Rare</option>
                      <option value="Epic">Epic</option>
                      <option value="Legendary">Legendary</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Element</label>
                    <select
                      value={customFilters.element}
                      onChange={(e) => setCustomFilters({...customFilters, element: e.target.value})}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-red-500 focus:outline-none"
                    >
                      <option value="Any">Any Element</option>
                      <option value="Fire">Fire</option>
                      <option value="Lightning">Lightning</option>
                      <option value="Shadow">Shadow</option>
                      <option value="Void">Void</option>
                      <option value="Spirit">Spirit</option>
                      <option value="Sound">Sound</option>
                      <option value="Technology">Technology</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Style</label>
                    <select
                      value={customFilters.style}
                      onChange={(e) => setCustomFilters({...customFilters, style: e.target.value})}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-red-500 focus:outline-none"
                    >
                      <option value="Any">Any Style</option>
                      <option value="Cyberpunk">Cyberpunk</option>
                      <option value="Gothic">Gothic</option>
                      <option value="Assassin">Assassin</option>
                      <option value="Warrior">Warrior</option>
                      <option value="Spiritual">Spiritual</option>
                      <option value="Punk">Punk</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-red-500/20">
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-4">Generate Your NPGX Characters</h2>
                <p className="text-gray-300 mb-8">Discover unique ninja punk girls with extraordinary abilities</p>
              </div>

              {!characterOptions.length ? (
                <div className="text-center">
                  <button
                    onClick={generateCharacterOptions}
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-8 rounded-xl text-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  >
                    {isGenerating ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                        Generating Characters...
                      </div>
                    ) : (
                      <>
                        <FaMagic className="inline mr-2" />
                        Generate Character Options
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  {/* Character Options Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <AnimatePresence>
                      {characterOptions.map((character, index) => (
                        <motion.div
                          key={character.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`bg-gray-800/50 rounded-xl p-6 border-2 cursor-pointer transition-all ${
                            selectedCharacter?.id === character.id 
                              ? 'border-red-500 bg-red-950/20 transform scale-105' 
                              : 'border-gray-600 hover:border-white/20'
                          }`}
                          onClick={() => selectCharacter(character)}
                        >
                          {/* Character Image */}
                          <div className="relative w-full h-48 rounded-lg mb-4 overflow-hidden">
                            <Image
                              src={character.image}
                              alt={character.name}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                // Fallback to placeholder if image fails to load
                                e.currentTarget.src = '/npgx-images/heroes/hero-1.jpg'
                              }}
                            />
                            <div className="absolute top-2 right-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getRarityColor(character.rarity)}`}>
                                {character.rarity}
                              </span>
                            </div>
                            <div className="absolute top-2 left-2">
                              {getElementIcon(character.attributes.element)}
                            </div>
                          </div>

                          {/* Character Info */}
                          <h3 className="text-xl font-bold text-white mb-1">{character.name}</h3>
                          <p className="text-red-400 mb-3 font-semibold">{character.codename}</p>
                          
                          <div className="space-y-1 text-sm text-gray-300 mb-4">
                            <p><span className="text-red-400">Element:</span> {character.attributes.element}</p>
                            <p><span className="text-red-400">Style:</span> {character.attributes.style}</p>
                            <p><span className="text-red-400">Ability:</span> {character.specialAbility}</p>
                          </div>

                          {/* Personality Tags */}
                          <div className="flex flex-wrap gap-1 mb-4">
                            {character.personality.slice(0, 3).map((trait, i) => (
                              <span key={i} className="px-2 py-1 bg-red-600/20 text-red-300 rounded-full text-xs">
                                {trait}
                              </span>
                            ))}
                          </div>

                          {selectedCharacter?.id === character.id && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-center"
                            >
                              <FaCheckCircle className="text-red-400 text-2xl mx-auto mb-2" />
                              <p className="text-red-400 font-bold">Selected!</p>
                            </motion.div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Selected Character Details */}
                  {selectedCharacter && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-red-950/50 to-red-950/30 rounded-xl p-8 border border-red-500/30"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Character Image & Basic Info */}
                        <div>
                          <div className="relative w-full h-64 rounded-lg mb-6 overflow-hidden">
                            <Image
                              src={selectedCharacter.image}
                              alt={selectedCharacter.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <h2 className="text-3xl font-bold text-white mb-2">{selectedCharacter.name}</h2>
                          <p className="text-2xl text-red-400 mb-4">{selectedCharacter.codename}</p>
                          <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold border ${getRarityColor(selectedCharacter.rarity)} mb-4`}>
                            {selectedCharacter.rarity}
                          </div>
                        </div>

                        {/* Detailed Stats & Info */}
                        <div>
                          <div className="mb-6">
                            <h3 className="text-xl font-bold text-white mb-3">Backstory</h3>
                            <p className="text-gray-300 leading-relaxed">{selectedCharacter.backstory}</p>
                          </div>

                          <div className="mb-6">
                            <h3 className="text-xl font-bold text-white mb-3">Attributes</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div><span className="text-red-400">Height:</span> {selectedCharacter.attributes.height}</div>
                              <div><span className="text-red-400">Build:</span> {selectedCharacter.attributes.build}</div>
                              <div><span className="text-red-400">Hair:</span> {selectedCharacter.attributes.hair}</div>
                              <div><span className="text-red-400">Eyes:</span> {selectedCharacter.attributes.eyes}</div>
                              <div><span className="text-red-400">Skin:</span> {selectedCharacter.attributes.skinTone}</div>
                              <div><span className="text-red-400">Element:</span> {selectedCharacter.attributes.element}</div>
                            </div>
                          </div>

                          <div className="mb-6">
                            <h3 className="text-xl font-bold text-white mb-3">Combat Stats</h3>
                            <div className="space-y-2">
                              <StatBar label="Strength" value={selectedCharacter.stats.strength} />
                              <StatBar label="Agility" value={selectedCharacter.stats.agility} />
                              <StatBar label="Intelligence" value={selectedCharacter.stats.intelligence} />
                              <StatBar label="Stealth" value={selectedCharacter.stats.stealth} />
                              <StatBar label="Charisma" value={selectedCharacter.stats.charisma} />
                            </div>
                          </div>

                          {/* Image Generation Status */}
                          {(isGeneratingImages || imageGenerationStatus) && (
                            <div className="mb-6">
                              <div className="bg-gray-800/50 rounded-lg p-4 border border-red-500/20">
                                {isGeneratingImages && (
                                  <div className="flex items-center text-red-400 mb-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/20 mr-2"></div>
                                    <span className="text-sm font-medium">{imageGenerationStatus || 'Generating images...'}</span>
                                  </div>
                                )}
                                {!isGeneratingImages && imageGenerationStatus && (
                                  <div className="text-sm font-medium text-red-400">
                                    {imageGenerationStatus}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Generated Images Section */}
                          {generatedImages.length > 0 && (
                            <div className="mb-6">
                              <h3 className="text-xl font-bold text-white mb-3">Generated Images</h3>
                              <p className="text-gray-300 text-sm mb-4">Click on an image to select it for your character</p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                {generatedImages.map((imageUrl, index) => (
                                  <div 
                                    key={index} 
                                    className={`relative cursor-pointer transform transition-all duration-200 hover:scale-105 ${
                                      selectedImage === imageUrl 
                                        ? 'ring-4 ring-red-500 ring-opacity-75 scale-105' 
                                        : 'hover:ring-2 hover:ring-red-400 hover:ring-opacity-50'
                                    }`}
                                    onClick={() => selectGeneratedImage(imageUrl, index)}
                                  >
                                    <Image
                                      src={imageUrl}
                                      alt={`Generated image ${index + 1} of ${selectedCharacter.name}`}
                                      width={200}
                                      height={200}
                                      className="rounded-lg object-cover w-full h-32"
                                    />
                                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                      {index + 1}
                                    </div>
                                    {selectedImage === imageUrl && (
                                      <div className="absolute inset-0 bg-red-500/20 rounded-lg flex items-center justify-center">
                                        <FaCheckCircle className="text-red-400 text-2xl" />
                                      </div>
                                    )}
                                    <div className="absolute bottom-2 left-2 right-2">
                                      <div className="bg-black/70 text-white text-xs px-2 py-1 rounded text-center">
                                        {index === 0 ? 'Portrait' : index === 1 ? 'Action Shot' : 'Concept Art'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Proceed Button */}
                              {selectedImage && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="text-center"
                                >
                                  <button
                                    onClick={proceedToNextStep}
                                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-8 rounded-lg transition-all transform hover:scale-105 shadow-lg"
                                  >
                                    <FaCheckCircle className="inline mr-2" />
                                    Proceed to Character Refinery
                                  </button>
                                  <p className="text-gray-400 text-sm mt-2">
                                    Continue customizing your character with the selected image
                                  </p>
                                </motion.div>
                              )}
                            </div>
                          )}

                          <div className="flex gap-4">
                            <button 
                              onClick={generateImages}
                              disabled={isGeneratingImages}
                              className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isGeneratingImages ? (
                                <div className="flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Generating...
                                </div>
                              ) : (
                                <>
                                  <FaImage className="inline mr-2" />
                                  Generate Images
                                </>
                              )}
                            </button>
                            <button 
                              onClick={exportCharacter}
                              disabled={isExporting}
                              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isExporting ? (
                                <div className="flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Exporting...
                                </div>
                              ) : (
                                <>
                                  <FaDownload className="inline mr-2" />
                                  Export Character
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Generate New Characters Button */}
                  <div className="text-center">
                    <button
                      onClick={() => {
                        setCharacterOptions([])
                        setSelectedCharacter(null)
                      }}
                      className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-3 px-6 rounded-lg transition-all"
                    >
                      <FaDice className="inline mr-2" />
                      Generate New Characters
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 